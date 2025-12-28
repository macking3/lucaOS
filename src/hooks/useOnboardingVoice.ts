import { useState, useCallback, useRef, useEffect } from "react";

interface OnboardingVoiceState {
  isListening: boolean;
  transcript: string;
  amplitude: number; // 0-1 for visualization
  error: string | null;
}

/**
 * Lightweight voice hook for onboarding
 * Uses Web Speech API (no WebSocket backend required)
 */
export const useOnboardingVoice = () => {
  const [state, setState] = useState<OnboardingVoiceState>({
    isListening: false,
    transcript: "",
    amplitude: 0,
    error: null,
  });

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        error: "Speech recognition not supported in this browser",
      }));
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setState((prev) => ({
        ...prev,
        transcript: finalTranscript || interimTranscript,
      }));
    };

    recognition.onerror = (event: any) => {
      console.error("[OnboardingVoice] Recognition error:", event.error);
      setState((prev) => ({
        ...prev,
        error: `Speech recognition error: ${event.error}`,
        isListening: false,
      }));
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current && state.isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("[OnboardingVoice] Restart failed:", e);
        }
      }
    };

    return recognition;
  }, [state.isListening]);

  // Calculate amplitude from audio data
  const calculateAmplitude = (dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length / 255; // Normalize to 0-1
  };

  // Update amplitude animation
  const updateAmplitude = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const amp = calculateAmplitude(dataArray);

      setState((prev) => ({ ...prev, amplitude: amp }));
    }
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Setup audio analysis for amplitude
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      // Start amplitude animation
      updateAmplitude();

      // Initialize and start speech recognition
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }

      if (recognitionRef.current) {
        recognitionRef.current.start();
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
          transcript: "",
        }));
      }
    } catch (error: any) {
      console.error("[OnboardingVoice] Microphone error:", error);
      setState((prev) => ({
        ...prev,
        error: "Microphone access denied. Please allow microphone access.",
        isListening: false,
      }));
    }
  }, [initRecognition, updateAmplitude]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log("[OnboardingVoice] stopListening() called");

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("[OnboardingVoice] ✓ Speech recognition stopped");
      } catch (e) {
        console.warn("[OnboardingVoice] Stop recognition failed:", e);
      }
      recognitionRef.current = null;
    }

    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      console.log("[OnboardingVoice] ✓ Animation frame canceled");
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      console.log("[OnboardingVoice] ✓ Audio context closed");
    }

    // Stop microphone stream - CRITICAL
    if (streamRef.current) {
      const trackCount = streamRef.current.getTracks().length;
      streamRef.current.getTracks().forEach((track) => {
        console.log(
          "[OnboardingVoice] Stopping track:",
          track.label,
          track.kind
        );
        track.stop();
      });
      streamRef.current = null;
      console.log(
        `[OnboardingVoice] ✓ Mic stream stopped (${trackCount} tracks)`
      );
    } else {
      console.log("[OnboardingVoice] ⚠️ No stream to stop");
    }

    setState((prev) => ({
      ...prev,
      isListening: false,
      amplitude: 0,
    }));

    console.log("[OnboardingVoice] stopListening() completed");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
  };
};
