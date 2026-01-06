/**
 * Overlay Integration Controller
 * Connects overlay widgets with LucaService and Voice input
 */

import { overlayService, HologramState } from "./overlayService";
import { lucaService } from "./lucaService";
import { voiceService } from "./voiceService";
import { Capacitor } from "@capacitor/core";

interface OverlayIntegrationConfig {
  enableVoice?: boolean;
  enableAutoShow?: boolean;
}

/**
 * Voice State Machine for Sentry Mode
 * IDLE: Passive listening, filtering for wake word only
 * LISTENING: Active session, processing commands
 * PROCESSING: Thinking/executing
 * SPEAKING: TTS response in progress
 */
enum VoiceState {
  IDLE = "IDLE",
  LISTENING = "LISTENING",
  PROCESSING = "PROCESSING",
  SPEAKING = "SPEAKING",
}

class OverlayIntegrationController {
  private isInitialized = false;
  private isProcessing = false;

  // Sentry Mode state management
  private voiceState: VoiceState = VoiceState.IDLE;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SILENCE_TIMEOUT = 5000; // 5 seconds to return to Sentry Mode
  private readonly WAKE_WORDS = [
    "hey luca",
    "hieluca",
    "hey lucca",
    "luca",
    "hello luca",
  ];

  /**
   * Initialize overlay integration with Luca services
   */
  async initialize(config: OverlayIntegrationConfig = {}): Promise<boolean> {
    // Only available on Android
    if (Capacitor.getPlatform() !== "android") {
      console.log("[OverlayIntegration] Not available on this platform");
      return false;
    }

    // Check permission
    const hasPermission = await overlayService.hasPermission();
    if (!hasPermission) {
      console.log("[OverlayIntegration] Overlay permission not granted");
      return false;
    }

    // Initialize overlay with handlers
    await overlayService.initialize({
      // Chat widget: text message sent
      onChatMessage: (message: string) => this.handleChatMessage(message),
      // Chat widget: 🎤 button (voice-to-text)
      onChatVoice: () => this.handleChatVoiceInput(),
      // Hologram: tapped (voice-to-voice)
      onHologramVoice: () => this.handleVoiceRequest(),
      // Continuous voice results for Sentry Mode
      onVoiceResult: (text: string, isFinal: boolean) =>
        this.handleContinuousVoiceStream(text, isFinal),
    });

    this.isInitialized = true;
    console.log("[OverlayIntegration] Initialized successfully");

    // Auto-show if configured
    if (config.enableAutoShow) {
      await overlayService.show("hologram");
    }

    return true;
  }

  /**
   * Handle continuous voice stream for Sentry Mode
   * Filters for wake word when IDLE, processes commands when LISTENING
   */
  private async handleContinuousVoiceStream(
    text: string,
    isFinal: boolean
  ): Promise<void> {
    const lowerText = text.toLowerCase().trim();

    // State: IDLE (Sentry Mode) - Only listen for wake word
    if (this.voiceState === VoiceState.IDLE) {
      const wakeWord = this.WAKE_WORDS.find((w) => lowerText.includes(w));

      if (wakeWord) {
        console.log(`[Overlay] Wake Word Detected: '${wakeWord}'`);
        this.voiceState = VoiceState.LISTENING;
        await overlayService.setState("LISTENING");
        this.resetSilenceTimer();
      } else {
        // Ignore background noise
        if (isFinal)
          console.debug(`[Overlay] Ignored: ${text.substring(0, 30)}...`);
      }
      return;
    }

    // State: LISTENING (Active Session) - Process commands
    if (this.voiceState === VoiceState.LISTENING) {
      this.resetSilenceTimer();

      if (isFinal && text.length > 0) {
        // Valid command received, process it
        console.log(`[Overlay] Command received: ${text}`);
        await this.handleOverlayMessage(text);
      }
    }
  }

  /**
   * Reset silence timer - returns to Sentry Mode after timeout
   */
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(async () => {
      console.log("[Overlay] Silence timeout. Returning to Sentry Mode.");
      this.voiceState = VoiceState.IDLE;
      await overlayService.setState("IDLE");
    }, this.SILENCE_TIMEOUT);
  }

  /**
   * Handle message sent from overlay chat
   */
  private async handleOverlayMessage(message: string): Promise<void> {
    if (this.isProcessing) {
      console.log("[OverlayIntegration] Already processing, ignoring");
      return;
    }

    this.isProcessing = true;

    try {
      // Show thinking state
      await overlayService.setState("THINKING");

      // Add user message to overlay
      await overlayService.addMessage("user", message);

      // Send to Luca
      console.log("[OverlayIntegration] Sending message to Luca:", message);

      const response = await this.sendToLuca(message);

      // Show speaking state
      await overlayService.setState("SPEAKING");

      // Add assistant response to overlay
      await overlayService.addMessage("assistant", response);

      // Speak the response using TTS (Gemini → Google → Native fallback)
      await this.speakResponse(response);

      // Return to idle
      await overlayService.setState("IDLE");
    } catch (error: any) {
      console.error("[OverlayIntegration] Error:", error);
      await overlayService.addMessage(
        "assistant",
        "Sorry, something went wrong. Please try again."
      );
      await overlayService.setState("IDLE");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle text message from CHAT widget (text response only, no TTS)
   */
  private async handleChatMessage(message: string): Promise<void> {
    if (this.isProcessing) {
      console.log("[OverlayIntegration] Already processing, ignoring");
      return;
    }

    this.isProcessing = true;

    try {
      // Add user message to chat
      await overlayService.addMessage("user", message);

      // Send to Luca
      console.log("[OverlayIntegration] Chat message to Luca:", message);
      const response = await this.sendToLuca(message);

      // Add response to chat (TEXT ONLY - no TTS)
      await overlayService.addMessage("assistant", response);
    } catch (error: any) {
      console.error("[OverlayIntegration] Chat error:", error);
      await overlayService.addMessage(
        "assistant",
        "Sorry, something went wrong. Please try again."
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle voice-to-text from CHAT widget's 🎤 button
   * STT → Text response (no TTS output)
   */
  private async handleChatVoiceInput(): Promise<void> {
    if (this.isProcessing) return;

    try {
      // Start voice recognition
      const transcript = await this.startVoiceRecognition();

      if (transcript) {
        // Process as chat message (text response only)
        await this.handleChatMessage(transcript);
      }
    } catch (error) {
      console.error("[OverlayIntegration] Chat voice error:", error);
    }
  }

  /**
   * Handle voice button tap in overlay
   */
  private async handleVoiceRequest(): Promise<void> {
    if (this.isProcessing) return;

    try {
      // Show listening state
      await overlayService.setState("LISTENING");

      // Start voice recognition
      const transcript = await this.startVoiceRecognition();

      if (transcript) {
        // Process the voice input
        await this.handleOverlayMessage(transcript);
      } else {
        // No speech detected
        await overlayService.setState("IDLE");
      }
    } catch (error) {
      console.error("[OverlayIntegration] Voice error:", error);
      await overlayService.setState("IDLE");
    }
  }

  /**
   * Send message to Luca and get response
   */
  private async sendToLuca(message: string): Promise<string> {
    try {
      // Simple approach - just call sendMessage and get response
      // The lucaService.sendMessage may have different signatures
      // We use a simplified version for overlay that works with any signature

      // Type-safe wrapper to handle various sendMessage signatures
      const result = await (lucaService as any).sendMessage(message);

      if (typeof result === "string") {
        return result;
      }

      // If result is an object with text/content property
      if (result?.text) return result.text;
      if (result?.content) return result.content;
      if (result?.response) return result.response;

      return "I processed your request.";
    } catch {
      console.error("[OverlayIntegration] LucaService error");
      return "Sorry, I encountered an error processing your request.";
    }
  }

  /**
   * Speak response using TTS (Gemini GenAI → Google Cloud → Native fallback)
   */
  private async speakResponse(text: string): Promise<void> {
    try {
      console.log("[OverlayIntegration] Speaking response via TTS");
      await voiceService.speak(text);
    } catch (error) {
      console.error("[OverlayIntegration] TTS error:", error);
      // TTS failure is non-fatal, response was still added to chat
    }
  }

  /**
   * Start voice recognition
   */
  private async startVoiceRecognition(): Promise<string | null> {
    return new Promise((resolve) => {
      // Use Web Speech API if available
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log("[OverlayIntegration] Voice transcript:", transcript);
          resolve(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error("[OverlayIntegration] Voice error:", event.error);
          resolve(null);
        };

        recognition.onend = () => {
          // If no result, resolve with null
        };

        try {
          recognition.start();

          // Timeout after 10 seconds
          setTimeout(() => {
            recognition.stop();
            resolve(null);
          }, 10000);
        } catch {
          resolve(null);
        }
      } else {
        console.log("[OverlayIntegration] Speech recognition not available");
        resolve(null);
      }
    });
  }

  /**
   * Show overlay with optional initial message
   */
  async show(initialMessage?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await overlayService.show();

    if (initialMessage) {
      await overlayService.addMessage("assistant", initialMessage);
    }
  }

  /**
   * Hide overlay
   */
  async hide(): Promise<void> {
    await overlayService.hide();
  }

  /**
   * Set hologram state
   */
  async setState(state: HologramState): Promise<void> {
    await overlayService.setState(state);
  }

  /**
   * Start Passive Sentry Mode
   * Hologram listens continuously but only responds to wake words
   */
  async startPassiveListening(): Promise<void> {
    console.log("[Overlay] Starting Sentry Mode (Passive Listening)...");
    this.voiceState = VoiceState.IDLE;
    await overlayService.setState("IDLE");
    // Note: Native layer must start continuous speech recognition
    // and emit onVoiceResult events via the plugin bridge
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    await overlayService.destroy();
    this.isInitialized = false;
  }
}

// Export singleton
export const overlayIntegration = new OverlayIntegrationController();
