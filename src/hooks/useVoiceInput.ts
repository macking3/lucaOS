import { useState, useCallback, useRef, useEffect } from "react";
import { CORTEX_URL } from "../config/api";
import { settingsService } from "../services/settingsService";

// Configuration
// In production, this should come from env or config
const WS_URL = `${CORTEX_URL.replace("http", "ws")}/ws/audio`;

// Wake Word Configuration (Sentry Mode)
const WAKE_WORDS = ["hey luca", "hieluca", "hey lucca", "luca", "hello luca"];
const SILENCE_TIMEOUT_MS = 5000; // 5 seconds to return to IDLE

// Voice State for Sentry Mode
type SentryState = "SENTRY" | "ACTIVE";

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  status: "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
  error: string | null;
  volume: number; // Expose volume for UI
  isVadActive: boolean; // Expose VAD state for UI
  sentryState: SentryState; // New: Sentry Mode state
}

export const useVoiceInput = () => {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: "",
    status: "IDLE",
    error: null,
    volume: 0,
    isVadActive: false,
    sentryState: "SENTRY", // Start in Sentry Mode (waiting for wake word)
  });

  // NEW: Ref to expose stream for WakeWordListener
  const sharedStreamRef = useRef<MediaStream | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const intentToListen = useRef(false); // RACE CONDITION GUARD

  // --- SENTRY MODE STATE ---
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentryStateRef = useRef<SentryState>("SENTRY");
  const wakeWordRecognizer = useRef<any>(null); // Web Speech API for local wake word detection

  // --- ADAPTIVE VAD STATE ---
  const vadState = useRef({
    noiseFloor: 0.002,
    vadHangover: 0,
    isSpeaking: false,
    speechDetectedInChunk: false, // Tracks if *any* speech occurred in current chunk
  });

  // VAD Constants (Matched to LiveService)
  const NOISE_ALPHA = 0.05; // Fast adaptation
  const SNR_THRESHOLD = 1.3;
  const ABSOLUTE_THRESHOLD = 0.005;
  const HANGOVER_FRAMES = 10; // ~600ms at 60fps

  // --- WAKE WORD DETECTION (Web Speech API) ---
  const startWakeWordDetection = useCallback(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.warn(
        "[VoiceInput] Web Speech API not available - Sentry Mode disabled"
      );
      // Fallback: Set to ACTIVE immediately (no wake word filtering)
      sentryStateRef.current = "ACTIVE";
      setState((prev) => ({ ...prev, sentryState: "ACTIVE" }));
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    wakeWordRecognizer.current = new SpeechRecognition();
    wakeWordRecognizer.current.continuous = true;
    wakeWordRecognizer.current.interimResults = true;
    wakeWordRecognizer.current.lang = "en-US";

    wakeWordRecognizer.current.onresult = (event: any) => {
      // Check all results for wake word
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        const hasWakeWord = WAKE_WORDS.some((word) =>
          transcript.includes(word)
        );

        if (hasWakeWord && sentryStateRef.current === "SENTRY") {
          console.log(`[VoiceInput] Wake word detected: "${transcript}"`);
          sentryStateRef.current = "ACTIVE";
          setState((prev) => ({ ...prev, sentryState: "ACTIVE" }));

          // Reset silence timer
          if (silenceTimer.current) {
            clearTimeout(silenceTimer.current);
          }
          silenceTimer.current = setTimeout(() => {
            console.log(
              "[VoiceInput] Silence timeout - returning to SENTRY mode"
            );
            sentryStateRef.current = "SENTRY";
            setState((prev) => ({ ...prev, sentryState: "SENTRY" }));
          }, SILENCE_TIMEOUT_MS);
        }
      }
    };

    wakeWordRecognizer.current.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.warn("[VoiceInput] Wake word recognition error:", event.error);
      }
      // Restart on most errors
      if (event.error === "network" || event.error === "aborted") {
        setTimeout(() => {
          if (wakeWordRecognizer.current && state.isListening) {
            wakeWordRecognizer.current.start();
          }
        }, 1000);
      }
    };

    wakeWordRecognizer.current.onend = () => {
      // Restart if still listening (continuous mode)
      if (state.isListening && wakeWordRecognizer.current) {
        try {
          wakeWordRecognizer.current.start();
        } catch (e) {
          // Ignore - already running
        }
      }
    };

    try {
      wakeWordRecognizer.current.start();
      console.log("[VoiceInput] Wake word detection started (SENTRY mode)");
    } catch (e) {
      console.error("[VoiceInput] Failed to start wake word detection:", e);
    }
  }, [state.isListening]);

  const stopWakeWordDetection = useCallback(() => {
    if (wakeWordRecognizer.current) {
      try {
        wakeWordRecognizer.current.stop();
        wakeWordRecognizer.current = null;
      } catch (e) {
        // Ignore
      }
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("[VoiceInput] Connected to Cortex Ear");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "status":
            setState((prev) => ({ ...prev, status: data.message }));
            break;
          case "transcript":
            // Received final text from Gemini
            setState((prev) => ({ ...prev, transcript: data.text }));
            break;
          case "audio":
            // Received audio from YarnGPT (Cloud)
            playAudio(data.data);
            break;
          case "error":
            console.error("[VoiceInput] Server Error:", data.message);
            setState((prev) => ({ ...prev, error: data.message }));
            break;
        }
      } catch (e) {
        console.error("[VoiceInput] Failed to parse message", e);
      }
    };

    ws.current.onerror = (e) => {
      console.error("[VoiceInput] WebSocket Error", e);
      setState((prev) => ({ ...prev, error: "Connection Failed" }));
    };
  }, []);

  // Root Mean Square (RMS) Calculation
  const calculateRMS = (dataArray: Uint8Array) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const float = (dataArray[i] - 128) / 128; // Center around 0
      sum += float * float;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  const startListening = useCallback(async () => {
    intentToListen.current = true; // Mark intent
    try {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        connect();
        // Wait a bit for connection
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check intent again before requesting mic
      if (!intentToListen.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Store in shared ref for App.tsx access
      sharedStreamRef.current = stream;

      // CRITICAL: Check if user stopped while we were waiting based on intent
      if (!intentToListen.current) {
        console.log(
          "[VoiceInput] Aborting start: User stopped listening during initialization"
        );
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // --- AUDIO ANALYSIS SETUP ---
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContext.current = new AudioContextClass();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.current = audioContext.current.createMediaStreamSource(stream);
      source.current.connect(analyser.current);

      const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
      let currentVolume = 0;

      // Real-time volume monitoring loop
      const updateVolume = () => {
        if (analyser.current) {
          analyser.current.getByteTimeDomainData(dataArray); // Use Time Domain for RMS
          const rms = calculateRMS(dataArray);
          currentVolume = rms; // Update for closure access

          // --- ADAPTIVE VAD LOGIC ---
          const s = vadState.current;

          // 1. Adaptive Noise Floor
          if (rms < s.noiseFloor * 1.5) {
            s.noiseFloor = s.noiseFloor * (1 - NOISE_ALPHA) + rms * NOISE_ALPHA;
          } else {
            // Slowly drift up if constantly loud
            s.noiseFloor = s.noiseFloor * 0.999 + rms * 0.001;
          }

          // 2. Signal Detection (SNR Check)
          const isSignal =
            rms > ABSOLUTE_THRESHOLD && rms > s.noiseFloor * SNR_THRESHOLD;

          if (isSignal) {
            s.vadHangover = HANGOVER_FRAMES;
            if (!s.isSpeaking) {
              s.isSpeaking = true;
              console.log(
                `[VAD] Speech Start (SNR: ${(rms / s.noiseFloor).toFixed(1)})`
              );
            }
            s.speechDetectedInChunk = true; // Mark chunk as containing speech
          } else {
            if (s.vadHangover > 0) {
              s.vadHangover--;
            } else {
              if (s.isSpeaking) {
                s.isSpeaking = false;
                // console.log("[VAD] Speech End");
              }
            }
          }

          // Update React state for UI components
          if (rms > 0.005) {
            setState((prev) => ({ ...prev, volume: rms }));
          } else if (currentVolume > 0) {
            setState((prev) => ({ ...prev, volume: 0 }));
          }
        }
        animationFrame.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // --- RECORDING SETUP ---
      // Use standard MIME type that Gemini supports
      const mimeType = "audio/webm;codecs=opus";

      mediaRecorder.current = new MediaRecorder(stream, { mimeType });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
          // GATING CHECK 1: Check if ANY speech occurred in this chunk (VAD)
          const hasSpeech =
            vadState.current.speechDetectedInChunk ||
            vadState.current.isSpeaking;

          // GATING CHECK 2: Check Sentry Mode state (Wake Word)
          const isActive = sentryStateRef.current === "ACTIVE";

          if (hasSpeech && isActive) {
            console.log(
              `[VoiceInput] Sending Audio Chunk (${event.data.size} bytes)`
            );

            // Reset silence timer on voice activity
            if (silenceTimer.current) {
              clearTimeout(silenceTimer.current);
            }
            silenceTimer.current = setTimeout(() => {
              console.log(
                "[VoiceInput] Silence timeout - returning to SENTRY mode"
              );
              sentryStateRef.current = "SENTRY";
              setState((prev) => ({ ...prev, sentryState: "SENTRY" }));
            }, SILENCE_TIMEOUT_MS);

            // Send to Gemini
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              if (result.includes(",")) {
                const base64Audio = result.split(",")[1];
                const settings = settingsService.get("brain");
                ws.current?.send(
                  JSON.stringify({
                    type: "audio_input",
                    data: base64Audio,
                    model: settings?.voiceModel || "gemini-2.0-flash",
                  })
                );
              }
            };
            reader.readAsDataURL(event.data);

            // RESET CHUNK STATE if currently silent
            if (!vadState.current.isSpeaking) {
              vadState.current.speechDetectedInChunk = false;
            }
          } else if (hasSpeech && !isActive) {
            // Speech detected but in SENTRY mode - Log for debugging
            console.debug(
              "[VoiceInput] Speech ignored (SENTRY mode - waiting for wake word)"
            );
          }
        }
      };

      mediaRecorder.current.start(3000); // Chunk every 3 seconds (was 1s) for better context

      // Reset sentry state and start wake word detection
      sentryStateRef.current = "SENTRY";
      startWakeWordDetection();

      setState((prev) => ({
        ...prev,
        isListening: true,
        status: "LISTENING",
        error: null,
        sentryState: "SENTRY",
      }));
    } catch (e) {
      console.error("[VoiceInput] Mic Error", e);
      setState((prev) => ({ ...prev, error: "Microphone Access Denied" }));
    }
  }, [connect, startWakeWordDetection]);

  const stopListening = useCallback(() => {
    intentToListen.current = false; // CANCEL ANY PENDING START
    // 1. Stop Media Recorder
    if (mediaRecorder.current) {
      if (mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
      // Force track stop
      if (mediaRecorder.current.stream) {
        mediaRecorder.current.stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      }
    }

    // 2. Cleanup Audio Context (Critical for "Mic On" indicator)
    if (audioContext.current) {
      try {
        audioContext.current.close();
      } catch (e) {
        console.warn("AudioContext Close Error", e);
      }
      audioContext.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }

    // 3. Stop wake word detection
    stopWakeWordDetection();
    sentryStateRef.current = "SENTRY";

    setState((prev) => ({
      ...prev,
      isListening: false,
      status: "IDLE",
      transcript: "",
      sentryState: "SENTRY",
    }));
  }, [stopWakeWordDetection]);

  const playAudio = (base64Data: string) => {
    try {
      const audioStr = "data:audio/wav;base64," + base64Data;
      const audio = new Audio(audioStr);
      audio.play().catch((e) => console.error("Playback failed", e));
    } catch (e) {
      console.error("Audio decode failed", e);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      ws.current?.close();
    };
  }, []);

  return {
    ...state,
    connect,
    startListening,
    stopListening,
    // Expose stream via a getter function to ensure we get current ref
    getSharedStream: () => sharedStreamRef.current,
  };
};
