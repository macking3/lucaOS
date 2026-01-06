import { settingsService } from "./settingsService";
import { getGenClient } from "./genAIClient"; // Import from shared client logic
import { eventBus } from "./eventBus";
import { cortexUrl } from "../config/api";

export const voiceService = {
  speak: async (
    text: string,
    googleApiKey?: string,
    voiceConfig?: { languageCode: string; name: string }
  ): Promise<Blob | null> => {
    const settings = settingsService.get("voice");
    console.log("[VOICE] Speaking:", text.substring(0, 50) + "...");

    // 1. Determine Configuration (Arguments override Settings)
    const apiKey = googleApiKey || settings.googleApiKey;
    const provider = settings.provider;

    // 1. Try Local Piper (Cortex) - Primary
    if (provider === "local-neural" || provider === "native") {
      try {
        const audioBlob = await speakWithLocalNeural(text, settings);
        if (audioBlob) return audioBlob;
      } catch (e) {
        console.warn("[VOICE] Piper TTS failed, attempting fallback...", e);
      }
    }

    // 2. Try Gemini GenAI - Secondary Fallback
    if (
      provider === "gemini-genai" ||
      provider === "local-neural" ||
      provider === "native"
    ) {
      try {
        const audioBlob = await speakWithGeminiGenAI(text, settings);
        if (audioBlob) return audioBlob;
      } catch (e) {
        console.warn("[VOICE] Gemini TTS failed, attempting fallback...", e);
      }
    }

    // 3. Try Google Cloud (if explicit key or configured)
    if (apiKey || provider === "google") {
      try {
        const googleVoiceName = voiceConfig?.name || "en-US-Journey-F";
        const targetVoice = voiceConfig || {
          languageCode: "en-US",
          name: googleVoiceName,
        };
        const audioBlob = await speakWithGoogle(
          text,
          apiKey,
          targetVoice,
          settings
        );
        if (audioBlob) return audioBlob;
      } catch (e) {
        console.warn(
          "[VOICE] Google Cloud TTS failed, attempting fallback...",
          e
        );
      }
    }

    // 4. Final Fallback: Native Browser TTS
    console.log("[VOICE] Using Native Browser TTS as last resort.");
    return new Promise<Blob | null>((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return resolve(null);
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      let stopSimulation: (() => void) | null = null;

      utterance.onstart = () => {
        stopSimulation = simulateVoiceActivity();
      };

      utterance.onend = () => {
        if (stopSimulation) stopSimulation();
        resolve(null);
      };

      utterance.onerror = () => {
        if (stopSimulation) stopSimulation();
        resolve(null);
      };

      utterance.rate = settings.rate || 1.0;
      utterance.pitch = settings.pitch || 1.0;

      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          setNativeVoice(utterance, voices, settings.voiceId);
          window.speechSynthesis.speak(utterance);
        };
      } else {
        setNativeVoice(utterance, voices, settings.voiceId);
        window.speechSynthesis.speak(utterance);
      }
    });
  },

  stop: () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },

  // Fetch available voices from Google
  fetchGoogleVoices: async (apiKey: string) => {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
      );
      if (!response.ok) throw new Error("Failed to fetch voices");
      const data = await response.json();
      return data.voices || [];
    } catch (e) {
      console.error("[VOICE] Failed to fetch Google voices:", e);
      return [];
    }
  },
};

// Helper for Local Neural TTS (Python Cortex)
async function speakWithLocalNeural(
  text: string,
  settings: any
): Promise<Blob | null> {
  // Target the Piper TTS endpoint on Cortex
  const url = cortexUrl("/tts");

  const payload = {
    text: text,
    voice: settings.voiceId || "amy",
    speed: settings.rate || 1.0,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Piper API Error: ${response.statusText}`);
  }

  // Cortex returns JSON with base64 audio data
  const data = await response.json();
  if (data.type === "audio" && data.data) {
    // Convert base64 to Blob
    const audioBytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(audioBlob);

    await analyzeAndPlayAudio(audioUrl);
    return audioBlob;
  }

  throw new Error("Invalid TTS response format");
}

// Helper for Google Cloud TTS
async function speakWithGoogle(
  text: string,
  apiKey: string,
  voice: { languageCode: string; name: string },
  settings: any
): Promise<Blob | null> {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const payload = {
    input: { text },
    voice: { languageCode: voice.languageCode, name: voice.name },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: settings.rate || 1.0,
      pitch: settings.pitch ? (settings.pitch - 1) * 20 : 0, // Google pitch is -20.0 to 20.0
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Unknown Google TTS error");
  }

  const data = await response.json();
  if (data.audioContent) {
    // Convert base64 to Blob
    const audioBytes = Uint8Array.from(atob(data.audioContent), (c) =>
      c.charCodeAt(0)
    );
    const audioBlob = new Blob([audioBytes], { type: "audio/mp3" });
    const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;

    await analyzeAndPlayAudio(audioUrl);
    return audioBlob;
  }
  return null;
}

// Helper for Gemini 2.5 Generative TTS
async function speakWithGeminiGenAI(
  text: string,
  settings: any
): Promise<Blob | null> {
  const genAI = getGenClient();
  const prompt = `
# AUDIO PROFILE: Luca ## "The Sentient Core"
# THE SCENE: Inside a quantum digital interface. The environment is cool, sleek, and hyper-modern.
# DIRECTOR'S NOTES
Style: ${
    settings.style ||
    "Feminine, sophisticated, calm, highly intelligent, slightly synthetic but warm."
  }
Pacing: ${settings.pacing || "Normal"} - Precise and articulate.
Dynamics: Smooth, level tone with subtle modulation indicating processing depth.
Accent: Neutral, Global English (Transatlantic).
# SAMPLE CONTEXT: Luca is the operating system for a high-level agent, providing data and insights to the Operator.

#### TRANSCRIPT
"${text}"
  `;

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "audio/mp3",
    },
  });

  if (!result.candidates || result.candidates.length === 0)
    throw new Error("No audio candidate generated");

  const part = result.candidates[0].content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (part && part.inlineData && part.inlineData.data) {
    const base64 = part.inlineData.data;
    const audioBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: "audio/mp3" });
    const audioUrl = `data:audio/mp3;base64,${base64}`;

    await analyzeAndPlayAudio(audioUrl);
    return audioBlob;
  }

  throw new Error("No audio data found in response");
}

function setNativeVoice(
  utterance: SpeechSynthesisUtterance,
  voices: SpeechSynthesisVoice[],
  targetVoiceName?: string
) {
  let preferredVoice;

  if (targetVoiceName) {
    preferredVoice = voices.find((v) => v.name === targetVoiceName);
  }

  if (!preferredVoice) {
    preferredVoice =
      voices.find((v) => v.name.includes("Google US English")) ||
      voices.find((v) => v.name.includes("Zira")) ||
      voices.find((v) => v.name.includes("Samantha")) ||
      voices.find((v) => v.lang === "en-US");
  }

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
}

/**
 * Plays audio from a URL/Blob and emits amplitude events for visualizations.
 */
function analyzeAndPlayAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);

    // Create Audio Context for analysis
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      // Fallback if no Web Audio API
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;
    let isPlaying = true;

    const analyze = () => {
      if (!isPlaying) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate average amplitude
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Emit scaling factor (0-255 range acceptable, or normalized)
      // HologramScene expects 0-255 generally
      // Amplify slightly for better effect
      const amplified = Math.min(255, average * 2.5);

      eventBus.emit("audio-amplitude", {
        amplitude: amplified,
        source: "tts",
      });

      animationId = requestAnimationFrame(analyze);
    };

    audio.onended = () => {
      isPlaying = false;
      cancelAnimationFrame(animationId);
      audioCtx.close();
      // Reset animation
      eventBus.emit("audio-amplitude", { amplitude: 0, source: "tts" });
      resolve();
    };

    audio.onerror = (e) => {
      console.error("Audio Playback Error:", e);
      isPlaying = false;
      cancelAnimationFrame(animationId);
      audioCtx.close();
      resolve();
    };

    audio
      .play()
      .then(() => {
        analyze();
      })
      .catch((e) => {
        console.error("Audio Playback Failed:", e);
        resolve();
      });
  });
}

/**
 * Simulates voice activity for native TTS where we can't analyze the stream.
 * Returns a cleanup function.
 */
function simulateVoiceActivity(): () => void {
  let active = true;
  let animationId: number;

  const loop = () => {
    if (!active) return;

    // Create organic-looking speech pattern
    const time = Date.now() / 100;
    // Varying sine waves to create "syllables"
    const envelope =
      Math.abs(Math.sin(time)) * 0.7 + Math.abs(Math.sin(time * 2.5)) * 0.3;

    // Base amplitude modulated by envelope + random jitter
    // Target range: 50-240
    const amp = envelope * 150 + 50 + Math.random() * 20;

    eventBus.emit("audio-amplitude", {
      amplitude: Math.min(255, amp),
      source: "tts-sim",
    });

    animationId = requestAnimationFrame(loop);
  };

  loop();

  return () => {
    active = false;
    cancelAnimationFrame(animationId);
    eventBus.emit("audio-amplitude", { amplitude: 0, source: "tts-sim" });
  };
}
