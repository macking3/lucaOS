import { useState, useCallback, useRef, useEffect } from "react";
import { CORTEX_URL } from "../config/api";
import { settingsService } from "../services/settingsService";

// Configuration
// In production, this should come from env or config
const WS_URL = `${CORTEX_URL.replace("http", "ws")}/ws/audio`;
const SILENCE_THRESHOLD = 0.02; // 2% volume threshold

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  status: "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
  error: string | null;
  volume: number; // Expose volume for UI
}

export const useVoiceInput = () => {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: "",
    status: "IDLE",
    error: null,
    volume: 0,
  });

  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const intentToListen = useRef(false); // RACE CONDITION GUARD

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

  const calculateVolume = (dataArray: Uint8Array) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length / 255; // Normalize 0-1
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
          analyser.current.getByteFrequencyData(dataArray);
          currentVolume = calculateVolume(dataArray);
          // Only update React state if change is significant to avoid re-renders
          if (currentVolume > 0.01) {
            // We can optionally expose this, but let's keep it checking
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
          // GATING CHECK: only send if recent volume was > threshold
          if (currentVolume > SILENCE_THRESHOLD) {
            console.log(
              `[VoiceInput] Sending Audio (Vol: ${currentVolume.toFixed(2)})`
            );
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = (reader.result as string).split(",")[1];
              const settings = settingsService.get("brain");
              ws.current?.send(
                JSON.stringify({
                  type: "audio_input",
                  data: base64Audio,
                  model: settings?.voiceModel || "gemini-2.0-flash",
                })
              );
            };
            reader.readAsDataURL(event.data);
          } else {
            // console.log("Silence ignored.");
          }
        }
      };

      mediaRecorder.current.start(1000); // Chunk every second (streaming-like)
      setState((prev) => ({
        ...prev,
        isListening: true,
        status: "LISTENING",
        error: null,
      }));
    } catch (e) {
      console.error("[VoiceInput] Mic Error", e);
      setState((prev) => ({ ...prev, error: "Microphone Access Denied" }));
    }
  }, [connect]);

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

    setState((prev) => ({
      ...prev,
      isListening: false,
      isVadActive: false,
      status: "IDLE",
      transcript: "",
    }));
  }, []);

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
  };
};
