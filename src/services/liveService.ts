import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import {
  allTools,
  PERSONA_CONFIG,
  PersonaType,
  getToolsForPersona,
  getGenClient,
} from "./lucaService";
import { UserProfile } from "../types";
import { memoryService } from "./memoryService";
import { taskService } from "./taskService";
import { settingsService } from "./settingsService";
import { SystemHealth } from "./introspectionService";
import { eventBus } from "./eventBus";

interface LiveConfig {
  onToolCall: (name: string, args: any) => Promise<any>;
  onAudioData: (amplitude: number) => void;
  onTranscript: (text: string, type: "user" | "model") => void;
  onVadChange?: (isActive: boolean) => void;
  onStatusUpdate?: (message: string) => void; // For progress updates
  onConnectionChange?: (isConnected: boolean) => void; // For UI state
  persona?: PersonaType;
  history?: any[];
  profile?: UserProfile | null;
  suppressOutput?: boolean; // NEW: If true, ignore model audio/text (STT only mode)
  systemInstruction?: string; // NEW: Override default persona instruction
}

class LucaLiveService {
  private ai: GoogleGenAI;
  private activeSession: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private isConnected = false;
  private isConnecting = false; // New guard for race conditions
  private currentConfig: LiveConfig | null = null; // Store config for restarts

  // --- ADVANCED VAD SETTINGS (TUNED VIA LIVEKIT PATTERNS) ---
  private noiseFloor = 0.002; // Initial guess (LOWERED from 0.005)
  private readonly NOISE_ALPHA = 0.02; // Slower adaptation to background noise (prevents adapting to speech)
  private readonly SNR_THRESHOLD = 1.3; // Lower threshold (1.3x noise floor) for better sensitivity
  private readonly ABSOLUTE_THRESHOLD = 0.005; // Minimum absolute RMS (LOWERED from 0.01)
  // 2048 samples @ 16kHz = 128ms per frame.
  // 12 frames = ~1.5s hangover (Better for pauses/accents)
  private readonly HANGOVER_FRAMES = 12;
  private vadHangover = 0;
  private isSpeaking = false;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private shouldReconnect = true; // Flag to control auto-reconnection
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // We defer AI initialization to connect() to ensure we have the latest key
    // Initial placeholder, overwritten in connect() with real key
    this.ai = new GoogleGenAI({ apiKey: "placeholder" });
  }

  async connect(config: LiveConfig) {
    console.log("[LIVE] Service connecting...", config);

    // Enable reconnection for this new session
    this.shouldReconnect = true;

    if (this.isConnected) {
      console.log("[LIVE] Already connected, disconnecting first...");
      await this.disconnect();
    }

    // Race condition guard
    if (this.isConnecting) {
      console.warn(
        "[LIVE] Connection already in progress, aborting duplicate call"
      );
      return;
    }

    this.isConnecting = true;
    config.onConnectionChange?.(false); // Initial state

    // 1. Get Fresh API Key
    try {
      this.ai = getGenClient();
    } catch {
      console.error("[LIVE] Failed to get GenAI client");
      config.onStatusUpdate?.("Error: Missing API Key");
      this.isConnecting = false;
      return;
    }

    // Store config for future restarts/switches
    this.currentConfig = config;

    // Clear any pending retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    const memoryContext = memoryService.getMemoryContext();
    const managementContext = taskService.getManagementContext();

    // GET PERSONA CONFIG
    const persona = config.persona || "ASSISTANT";
    const personaConfig = PERSONA_CONFIG[persona] || PERSONA_CONFIG.ASSISTANT;

    // Resolve the instruction function
    let systemInstruction = "";

    // 1. If explicit instruction provided in config, USE IT (Highest Priority)
    // This fixes Onboarding/Dictation requiring strict prompts without persona bloat
    if (config.systemInstruction) {
      // Handle both string and Part[] format if needed, but here we assume string
      if (typeof config.systemInstruction === "string") {
        systemInstruction = config.systemInstruction;
      } else {
        // If it's the Part[] format (unlikely here but possible in types)
        systemInstruction =
          (config.systemInstruction as any).parts?.[0]?.text || "";
      }
    }
    // 2. Otherwise use Persona Config
    else if (persona === "DICTATION") {
      systemInstruction =
        "You are a speech-to-text transcription system. Your ONLY function is to convert spoken audio into written text exactly as spoken. Rules: 1) Output ONLY the words you hear - nothing else. 2) Do NOT interpret, explain, or respond. 3) Do NOT add context or descriptions. 4) Do NOT say things like 'The user said' or 'I heard'. 5) Just output the raw transcription. Example: If you hear 'Hello World', output exactly: Hello World";
    } else {
      systemInstruction = personaConfig.instruction(
        memoryContext,
        managementContext,
        undefined, // platform (optional)
        config.profile // user profile
      );
    }

    // NEW: Inject Connection State Awareness (same as text chat)
    const memories = memoryService.getAllMemories();
    const connectionMethod = memories.find(
      (m) => m.key && m.key.toLowerCase() === "mobile_connection_method"
    );
    const connectionDetails = memories.find(
      (m) => m.key && m.key.toLowerCase() === "mobile_connection_details"
    );

    if (connectionMethod) {
      systemInstruction += `\n\n**CURRENT MOBILE CONNECTION STATE (GLOBAL CONTEXT)**:\n`;
      systemInstruction += `Connection Method: ${connectionMethod.value}\n`;
      if (connectionDetails) {
        try {
          const details = JSON.parse(connectionDetails.value);
          systemInstruction += `Connection Details: IP=${
            details.ip || "N/A"
          }, Port=${details.port || "N/A"}, Connected=${
            details.connected !== false ? "Yes" : "No"
          }\n`;
        } catch {
          systemInstruction += `Connection Details: ${connectionDetails.value}\n`;
        }
      }
      systemInstruction += `\n**IMPORTANT**: This connection state is available to ALL tools and interactions, not just mobile device control:\n`;
      systemInstruction += `- When user asks about their phone/device connection, you can reference this state\n`;
      systemInstruction += `- When using mobile-related tools, use the appropriate tools for ${connectionMethod.value}\n`;
      systemInstruction += `- When answering questions about device status, IP addresses, or connection methods, use this information\n`;
      systemInstruction += `- This state persists across all conversations (text and voice) until the connection changes\n`;
    }

    try {
      // PROMPT BROWSER PERMISSION EXPLICITLY FIRST
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("[LIVE] Microphone access granted");

      this.inputAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 16000 });

      // Resume context if suspended (common browser policy)
      if (this.inputAudioContext.state === "suspended") {
        await this.inputAudioContext.resume();
      }

      this.outputAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      const voiceModel =
        settingsService.get("brain")?.voiceModel || "gemini-2.0-flash";
      const sessionPromise = this.ai.live.connect({
        model: voiceModel,
        callbacks: {
          onopen: () => {
            console.log(`LUCA Voice Uplink Established [Persona: ${persona}]`);
            this.isConnected = true;
            this.isConnecting = false; // Reset guard
            this.retryCount = 0; // Reset retry count on successful connection
            this.setupInputStream(config, sessionPromise);
            config.onStatusUpdate?.("Voice Uplink Active");
            config.onConnectionChange?.(true); // Notify UI connected
          },
          onmessage: async (msg: LiveServerMessage) => {
            this.handleServerMessage(msg, config, sessionPromise);
          },
          onclose: () => {
            console.log("LUCA Voice Uplink Closed");
            // Only auto-reconnect if we didn't explicitly disconnect AND shouldReconnect is true
            if (this.isConnected && this.shouldReconnect) {
              this.handleReconnect(config);
            } else {
              console.log(
                "[LIVE] Not reconnecting (explicit disconnect or shouldReconnect=false)"
              );
              this.disconnect();
            }
          },
          onerror: (err) => {
            console.error("LUCA Voice Error", err);
            // Try to reconnect on error
            if (this.isConnected) {
              this.handleReconnect(config);
            } else {
              this.disconnect();
            }
          },
        },
        config: {
          responseModalities:
            persona === "DICTATION" ? [Modality.TEXT] : [Modality.AUDIO],
          systemInstruction: { parts: [{ text: systemInstruction }] }, // Fix for Content strictness too
          tools:
            persona === "DICTATION" || config.suppressOutput
              ? []
              : [
                  {
                    functionDeclarations: getToolsForPersona(persona, allTools),
                  },
                ],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: personaConfig.voiceName },
            },
          },
        },
      });

      this.activeSession = sessionPromise;
    } catch {
      console.error("Failed to initialize voice session");
      this.isConnecting = false; // Reset guard on error
      config.onStatusUpdate?.("Connection Failed");
      config.onConnectionChange?.(false);
      this.handleReconnect(config);
    }
  }

  private handleReconnect(config: LiveConfig) {
    // Guard: If shouldReconnect is already false, don't even start the timer
    if (!this.shouldReconnect) {
      console.log("[LIVE] handleReconnect aborted: shouldReconnect is false");
      return;
    }

    if (this.retryCount >= this.MAX_RETRIES) {
      console.error(
        `[LIVE] Max retries (${this.MAX_RETRIES}) reached. Giving up.`
      );
      this.disconnect();
      return;
    }

    this.retryCount++;
    const delay = 1000 * this.retryCount; // Exponential backoff: 1s, 2s, 3s
    console.log(
      `[LIVE] Retrying connection (attempt ${this.retryCount}/${this.MAX_RETRIES}) in ${delay}ms...`
    );

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;

      // Double-check: User may have intentionally disconnected while timer was running
      if (!this.shouldReconnect) {
        console.log(
          "[LIVE] Reconnect timer fired but shouldReconnect is false. Aborting."
        );
        return;
      }

      // Disconnect first to clean up, then reconnect
      this.disconnect();
      setTimeout(() => {
        // Triple-check after inner delay
        if (this.shouldReconnect) {
          this.connect(config);
        }
      }, 100);
    }, delay);
  }

  /**
   * Seamlessly switch persona and reconnect voice
   */
  async switchPersona(persona: PersonaType) {
    if (!this.currentConfig) {
      console.warn("[LIVE] Cannot switch persona: No active config found.");
      return;
    }

    console.log(`[LIVE] Switching persona to: ${persona}`);

    // Update Config
    this.currentConfig = {
      ...this.currentConfig,
      persona,
    };

    // Disconnect existing session
    this.disconnect();

    // Short delay to ensure internal cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Reconnect with updated config
    await this.connect(this.currentConfig);
  }

  /**
   * Send a video frame to the live session for multimodal analysis.
   * @param base64Image Raw base64 string (without data:image/jpeg;base64 prefix)
   */
  sendVideoFrame(base64Image: string) {
    if (!this.isConnected || !this.activeSession) return;

    this.activeSession.then((session: any) => {
      session.sendRealtimeInput({
        media: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    });
  }

  /**
   * Send external audio chunk to Gemini Live API (for mobile audio streaming)
   * @param audioBlob - Blob containing audio data (from MediaRecorder)
   * @param mimeType - MIME type of audio (default: 'audio/webm')
   */
  async sendExternalAudio(audioBlob: Blob, mimeType: string = "audio/webm") {
    if (!this.isConnected || !this.activeSession) {
      console.warn("[LIVE] Cannot send external audio: No active session");
      return;
    }

    try {
      // Convert Blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      this.activeSession.then((session: any) => {
        session.sendRealtimeInput({
          media: {
            mimeType: mimeType,
            data: base64Audio,
          },
        });
      });
    } catch (error) {
      console.error("[LIVE] Error sending external audio:", error);
    }
  }

  /**
   * Artificial Awareness: Ingest a System Sensation directly into memory
   */
  async ingestSensation(sensations: string[]) {
    const thought = `[SYSTEM_SENSATION] I have just woken up. My self-diagnostics report: ${sensations.join(
      " "
    )}`;

    console.log(`[AWARENESS] Injecting Sensation: "${thought}"`);

    // 2. Inject into Memory (Short-term context)
    // We use a special "SYSTEM" sender to differentiate from user input
    try {
      // We'll use the memoryService to ingest this as a high-priority "thought"
      // Since we don't have a direct "inject thought" API, we'll format it as a system message
      await memoryService.ingestConversation([
        {
          text: thought,
          sender: "system" as any, // Cast to any if Sender enum is strict
          timestamp: Date.now(),
        },
      ]);
    } catch {
      console.warn("[AWARENESS] Failed to inject sensation");
    }
  }

  /**
   * Send end-of-audio-stream signal (for mobile push-to-talk)
   */
  sendAudioStreamEnd() {
    if (!this.isConnected || !this.activeSession) {
      console.warn("[LIVE] Cannot send audio stream end: No active session");
      return;
    }

    this.activeSession.then((session: any) => {
      session.sendRealtimeInput({
        audioStreamEnd: true,
      });
    });
  }

  /**
   * Send a text message to Gemini Live (as user input)
   */
  sendText(text: string) {
    if (!this.isConnected || !this.activeSession) {
      console.warn("[LIVE] Cannot send text: No active session");
      return;
    }

    console.log("[LIVE] Sending text message:", text.substring(0, 50) + "...");

    this.activeSession.then((session: any) => {
      // Use sendClientContent for text turns (not sendRealtimeInput which is for media)
      session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true, // Signal that user turn is done, model should respond
      });
    });
  }

  private setupInputStream(config: LiveConfig, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);

    // High-Pass Filter (Cut rumble < 80Hz)
    const rumbleFilter = this.inputAudioContext.createBiquadFilter();
    rumbleFilter.type = "highpass";
    rumbleFilter.frequency.value = 80;
    rumbleFilter.Q.value = 0.5;

    // Reduced Buffer Size: 2048 (128ms) for lower latency
    this.inputNode = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    source.connect(rumbleFilter);
    rumbleFilter.connect(this.inputNode);
    this.inputNode.connect(this.inputAudioContext.destination);

    this.inputNode.onaudioprocess = (e) => {
      // Guard: If we've disconnected mid-process, abort immediately
      if (!this.isConnected || !this.stream) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      const rms = this.calculateRMS(inputData);
      config.onAudioData(rms);

      // Global broadcast for audio-reactive components (Hologram)
      eventBus.emit("audio-amplitude", { amplitude: rms, source: "user" });

      // --- ADAPTIVE NOISE FLOOR CALCULATION ---
      // Slowly adapt noise floor towards current RMS if RMS is low (likely background noise)
      if (rms < this.noiseFloor * 1.5) {
        this.noiseFloor =
          this.noiseFloor * (1 - this.NOISE_ALPHA) + rms * this.NOISE_ALPHA;
      } else {
        // If loud, adapt very slowly (don't let voice drag up the noise floor too much)
        this.noiseFloor = this.noiseFloor * 0.999 + rms * 0.001;
      }

      // --- SIMPLIFIED VAD LOGIC ---
      const isSignal =
        rms > this.ABSOLUTE_THRESHOLD &&
        rms > this.noiseFloor * this.SNR_THRESHOLD;

      if (isSignal) {
        this.vadHangover = this.HANGOVER_FRAMES;
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          config.onVadChange?.(true);
          console.log(
            `[VAD] User voice detected (RMS: ${rms.toFixed(4)}, SNR: ${(
              rms / this.noiseFloor
            ).toFixed(2)})`
          );

          // Guard: Don't interrupt if model is still speaking (prevents echo-triggered interrupts)
          if (this.sources.size === 0) {
            this.interrupt();
          } else {
            console.log(`[VAD] Skipping interrupt - model is speaking (${this.sources.size} sources active)`);
          }
        }
      } else {
        if (this.vadHangover > 0) {
          this.vadHangover--;
        } else {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            config.onVadChange?.(false);
          }
        }
      }

      // Only transmit when Gate is Open
      // Only transmit when Gate is Open AND Connected
      if (this.isSpeaking && this.isConnected && this.activeSession) {
        if (Math.random() < 0.05)
          console.log(`[LIVE] Sending audio chunk (RMS: ${rms.toFixed(4)})`);
        const pcmBlob = this.createBlob(inputData);
        sessionPromise.then((session) => {
          // Double check inside promise
          if (!this.isConnected || !this.isSpeaking) return;
          try {
            session.sendRealtimeInput({ media: pcmBlob });
          } catch {
            // Silent catch for "WebSocket closing" race condition
          }
        });
      } else if (rms > 0.01 && Math.random() < 0.01) {
        console.log(
          `[LIVE] Voice detected but below VAD threshold? (RMS: ${rms.toFixed(
            4
          )})`
        );
      }
    };
  }

  private async handleServerMessage(
    msg: LiveServerMessage,
    config: LiveConfig,
    sessionPromise: Promise<any>
  ) {
    const modelTurn = msg.serverContent?.modelTurn;
    if (modelTurn?.parts) {
      console.log(
        "[LIVE] Model Turn Parts:",
        modelTurn.parts.map((p) => ({
          text: p.text
            ? p.text.length > 50
              ? p.text.substring(0, 50) + "..."
              : p.text
            : null,
          hasAudio: !!p.inlineData?.data,
          thought: (p as any).thought,
        }))
      );

      // 1. Process Audio Data
      for (const part of modelTurn.parts) {
        if (part.inlineData?.data) {
          // If Dictation mode OR suppressOutput is true, we MUTE the model output
          if (config.persona !== "DICTATION" && !config.suppressOutput) {
            this.playAudio(part.inlineData.data, (amp) => {
              config.onAudioData(amp);
              // Global broadcast for audio-reactive components (Hologram)
              eventBus.emit("audio-amplitude", {
                amplitude: amp,
                source: "model",
              });
            });
          }
          break; // Usually first audio part is what we want
        }
      }

      // 2. Process Transcripts
      for (const part of modelTurn.parts) {
        if (part.text) {
          // Check if this is explicitly a "thought" part (supported by some reasoning models)
          if ((part as any).thought === true) {
            console.log(
              "[LIVE] Filtered out explicit thought part:",
              part.text
            );
            continue;
          }

          const rawText = part.text;
          // Filter out text between ** ** (common internal monologue format)
          const cleanText = rawText.replace(/\*\*.*?\*\*/g, "").trim();

          // If the text is empty after filtering, it was all monologue
          if (!cleanText) continue;

          if (!config.suppressOutput) {
            // NORMAL VOICE MODE: Show model response
            config.onTranscript(cleanText, "model");
          } else {
            // STT MODE: Reroute as user input
            config.onTranscript(cleanText, "user");
          }

          // Usually we want the first valid text part as the transcript
          // unless there are multiple legit response parts.
          // For Gemini Live, it's typically one text part per response message.
          break;
        }
      }
    }

    // Handle Interruption Signal from Server
    if (msg.serverContent?.interrupted) {
      this.interrupt();
    }

    // Handle Tool Calls
    if (msg.toolCall) {
      const calls = (msg.toolCall as any).functionCalls || [];
      for (const fc of calls) {
        console.log(`[VOICE AGENT] Executing tool: ${fc.name}`);

        // Lock interruptions during critical tool execution
        const isCriticalTool = [
          "wipeMemory",
          "killProcess",
          "initiateLockdown",
          "exfiltrateData",
        ].includes(fc.name);
        if (isCriticalTool) {
          // voiceInterruptionGuard.lock(`Executing critical tool: ${fc.name}`);
        }

        // Immediate acknowledgment
        config.onTranscript(`Starting ${fc.name}...`, "model");
        config.onStatusUpdate?.(`Starting ${fc.name}...`);

        try {
          // Send progress updates during execution
          const startTime = Date.now();
          const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 2) {
              // Only show progress after 2 seconds
              config.onStatusUpdate?.(
                `Still working on ${fc.name}... (${Math.floor(elapsed)}s)`
              );
            }
          }, 3000); // Update every 3 seconds

          const result = await config.onToolCall(fc.name, fc.args);

          clearInterval(progressInterval);

          // Completion message
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          config.onTranscript(`${fc.name} completed in ${elapsed}s`, "model");
          config.onStatusUpdate?.(`${fc.name} completed`);

          sessionPromise.then((session) =>
            session.sendToolResponse({
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result: result },
              },
            })
          );
        } catch (e) {
          console.error("Tool Error", e);
          config.onTranscript(`Error in ${fc.name}: ${e}`, "model");
          config.onStatusUpdate?.(`Error: ${fc.name} failed`);
        } finally {
          // Unlock interruptions after tool completes
          if (isCriticalTool) {
            // voiceInterruptionGuard.unlock();
          }
        }
      }
    }
  }

  disconnect() {
    console.log("[LIVE] Disconnect called. Cleaning up...");

    // Notify UI immediately
    if (this.currentConfig) {
      this.currentConfig.onConnectionChange?.(false);
    }

    // Prevent auto-reconnection
    this.shouldReconnect = false;
    this.isConnecting = false; // Reset guard

    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.isConnected = false;
    this.isSpeaking = false;
    this.retryCount = 0; // Reset retry count on explicit disconnect
    this.activeSession = null;
    this.interrupt(); // Clear audio queue

    // Cleanup input node
    if (this.inputNode) {
      try {
        this.inputNode.disconnect();
        this.inputNode.onaudioprocess = null; // CRITICAL: Stop the loop!
      } catch {
        // Ignore disconnect errors
      }
      this.inputNode = null;
    }

    // Cleanup input audio context
    // Cleanup input audio context
    if (this.inputAudioContext) {
      if (this.inputAudioContext.state !== "closed") {
        this.inputAudioContext.close().catch(() => {
          console.warn("[LIVE] Input audio context close error");
        });
      }
      this.inputAudioContext = null;
    }

    // Cleanup output audio context
    if (this.outputAudioContext) {
      if (this.outputAudioContext.state !== "closed") {
        this.outputAudioContext.close().catch((err) => {
          console.warn("[LIVE] Output audio context close error:", err);
        });
      }
      this.outputAudioContext = null;
    }

    // Cleanup output node
    if (this.outputNode) {
      try {
        this.outputNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.outputNode = null;
    }

    // Cleanup media stream - AGGRESSIVE STOP
    if (this.stream) {
      console.log("[LIVE] Stopping media stream:", this.stream.id);
      this.stream.getTracks().forEach((track) => {
        console.log(`[LIVE] Stopping track: ${track.label} (${track.kind})`);
        try {
          track.stop();
          track.enabled = false;
        } catch {
          console.error("[LIVE] Error stopping track");
        }
      });
      // Explicitly set to null
      this.stream = null;
    } else {
      console.log("[LIVE] No stream to stop");
    }

    // Clear audio sources
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore stop errors
      }
    });
    this.sources.clear();

    // Reset state
    this.nextStartTime = 0;
    this.noiseFloor = 0.005; // Reset noise floor
    this.vadHangover = 0;
  }

  private interrupt() {
    if (this.sources.size > 0) {
      console.log(">> INTERRUPTING AUDIO OUTPUT");
      this.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Ignore stop errors during interrupt
        }
      });
      this.sources.clear();
      // Reset timing cursor to current time to avoid silence gap on next utterance
      if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
      }
    }
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private async playAudio(
    base64Data: string,
    onAmplitude: (amp: number) => void
  ) {
    if (!this.outputAudioContext || !this.outputNode) return;

    // If audio context time has advanced past our next start time (e.g. long pause), reset cursor
    this.nextStartTime = Math.max(
      this.nextStartTime,
      this.outputAudioContext.currentTime
    );

    const audioBuffer = await this.decodeAudioData(
      this.decodeBase64(base64Data),
      this.outputAudioContext
    );

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);

    source.onended = () => {
      this.sources.delete(source);
    };

    // Visualizer simulation for output
    const duration = audioBuffer.duration * 1000;
    const steps = 10;
    const interval = duration / steps;
    let i = 0;
    const anim = setInterval(() => {
      i++;
      if (i > steps) clearInterval(anim);
      // Only animate if this source is still playing (wasn't interrupted)
      if (this.sources.has(source)) {
        onAmplitude(0.2 + Math.random() * 0.3);
      }
    }, interval);
  }

  private createBlob(inputData: Float32Array) {
    // 1. DOWNSAMPLE TO 16kHz (Critical for Speech Recognition)
    // Most systems run at 44.1kHz or 48kHz. Sending that as 16kHz causes slow-motion/pitch-drop.
    const targetSampleRate = 16000;
    const currentSampleRate = this.inputAudioContext?.sampleRate || 16000;

    let processedData = inputData;

    if (currentSampleRate !== targetSampleRate) {
      processedData = this.downsampleBuffer(
        inputData,
        currentSampleRate,
        targetSampleRate
      );
    }

    // 2. CONVERT TO PCM INT16 (LITTLE ENDIAN)
    const l = processedData.length;
    const buffer = new ArrayBuffer(l * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < l; i++) {
      // Clamp to [-1, 1]
      let s = Math.max(-1, Math.min(1, processedData[i]));
      // Scale to Int16 range
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      // Write Int16 Little Endian
      view.setInt16(i * 2, s, true);
    }

    // 3. CONVERT TO BASE64
    // Efficiently convert ArrayBuffer to Base64
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      mimeType: "audio/pcm;rate=16000",
    };
  }

  /**
   * Simple linear interpolation downsampler
   */
  private downsampleBuffer(
    buffer: Float32Array,
    sampleRate: number,
    outSampleRate: number
  ): Float32Array {
    if (outSampleRate === sampleRate) {
      return buffer;
    }
    if (outSampleRate > sampleRate) {
      throw new Error("Upsampling not supported");
    }

    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

      // Simple averaging (boxcar filter) to prevent aliasing
      let accum = 0,
        count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }

  /**
   * Register a system sensation as a thought in memory.
   * This is how Luca "feels" her own system state.
   */
  async registerSensation(status: SystemHealth) {
    const sensation = `
[SYSTEM SENSATION]
Vision: ${status.vision.status.toUpperCase()} (${
      status.vision.details || "N/A"
    })
Audio: ${status.audio.status.toUpperCase()} (${status.audio.details || "N/A"})
Cortex: ${status.cortex.status.toUpperCase()}
Tools: ${status.tools.count} Available
Timestamp: ${new Date(status.timestamp).toISOString()}
    `.trim();

    console.log("[SENSATION] Registering:", sensation);

    // Ingest into memory core as a high-priority system observation
    // [DISABLED] Prevent RAG rate-limiting on every BIOS boot
    /*
    await memoryService.ingestConversation([
      {
        text: sensation,
        sender: "SYSTEM" as any,
        timestamp: Date.now(),
      },
    ]);
    */
    console.log(
      "[SENSATION] RAG Ingestion skipped (Rate-limiting protection active)"
    );
  }
}

export const liveService = new LucaLiveService();
