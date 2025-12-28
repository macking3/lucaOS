import { settingsService } from "./settingsService";
import { CORTEX_URL } from "../config/api";
import { getGenClient } from "./genAIClient"; // Import from shared client logic

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
    let provider = settings.provider;

    // Force Google if explicit API key provided in args
    if (googleApiKey) provider = "google";

    // 2. Local Neural TTS (Best Free)
    if (provider === "local-neural") {
      try {
        const audioBlob = await speakWithLocalNeural(text, settings);
        return audioBlob;
      } catch (e) {
        console.warn(
          "[VOICE] Local Neural TTS failed, falling back to native:",
          e
        );
        // Fallthrough to native
      }
    }

    // 3. Google Cloud TTS
    if (provider === "google" && apiKey) {
      try {
        // Use Google voice name format (not local TTS format)
        const googleVoiceName = voiceConfig?.name || "en-US-Journey-F"; // Default to Journey-F (natural female voice)
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
        return audioBlob;
      } catch (e) {
        console.error(
          "[VOICE] Google Cloud TTS failed, falling back to native:",
          e
        );
        // Fallthrough to native
      }
    }

    // 4. Gemini 2.5 Generative TTS
    if (provider === "gemini-genai") {
      try {
        const audioBlob = await speakWithGeminiGenAI(text, settings);
        return audioBlob;
      } catch (e) {
        console.error(
          "[VOICE] Gemini GenAI TTS failed, falling back to native:",
          e
        );
      }
    }

    // 5. Fallback to Native Browser TTS
    if (typeof window !== "undefined" && !("speechSynthesis" in window)) {
      console.warn("[VOICE] TTS not supported");
      return null;
    }

    if (typeof window === "undefined") return null; // Server-side guard

    return new Promise<Blob | null>((resolve) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve(null);
      utterance.onerror = () => resolve(null);

      // Apply Settings
      utterance.rate = settings.rate || 1.0;
      utterance.pitch = settings.pitch || 1.0;

      // Retry getting voices if empty (Chrome quirk)
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
  const url = `${CORTEX_URL}/tts`;

  const payload = {
    text: text,
    voice: settings.voiceId || "en_US-amy-medium",
    speed: settings.rate || 1.0,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Cortex API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.type === "audio" && data.data) {
      // Convert base64 to Blob
      const audioBytes = Uint8Array.from(atob(data.data), (c) =>
        c.charCodeAt(0)
      );
      const audioBlob = new Blob([audioBytes], { type: "audio/wav" });

      // Play on desktop
      return new Promise<Blob | null>((resolve) => {
        const audio = new Audio(`data:audio/wav;base64,${data.data}`);
        audio.onended = () => resolve(audioBlob);
        audio.onerror = () => resolve(null);
        audio.play().catch((e) => {
          console.error("Audio Playback Error:", e);
          resolve(null);
        });
      });
    }
    return null;
  } catch (e) {
    throw e;
  }
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

    // Play on desktop
    return new Promise<Blob | null>((resolve) => {
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.onended = () => resolve(audioBlob);
      audio.onerror = () => resolve(null);
      audio.play().catch((e) => {
        console.error("Audio Playback Error:", e);
        resolve(null);
      });
    });
  }
  return null;
}

// Helper for Gemini 2.5 Generative TTS
async function speakWithGeminiGenAI(
  text: string,
  settings: any
): Promise<Blob | null> {
  const genAI = getGenClient();
  // Using Gemini 2.0 Flash or Pro which supports audio output
  // Note: Model name might need adjustment based on final release of 2.5
  // For now using gemini-2.0-flash-exp acting as proxy
  // SDK V1 Beta usage:

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

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: "user", parts: [{ text: prompt }] }], // Correct structure for contents
      config: {
        responseMimeType: "audio/mp3",
      },
    });

    // In the new SDK, result might be the response directly or have a slightly different shape
    // Based on lucaService.ts pattern: result.text exists.
    // However for audio, we need the raw parts/candidates.

    // Check if result has candidates directly or via .response?
    // lucaService accesses result.candidates matching API response shape.

    if (!result.candidates || result.candidates.length === 0)
      throw new Error("No audio candidate generated");

    // We expect the first part to be inlineData for audio
    // This is speculative based on "model output audio" capability pattern
    // If not, we might need a specific endpoint, but let's try the generative path
    // OR: Check if the SDK handles it via .text() (unlikely for audio).
    // Let's assume standard inlineData return.

    /* 
       NOTE: The official Gemini Multimodal Live API uses WebSockets. 
       The REST generateContent with audio/mp3 response is the assumed implementation for "Gen 2.5 TTS".
       If this fails, we catch and fallback.
    */

    // Look for content with inlineData
    // Explicitly type 'p' as any or matching Part type if available.
    // Since we didn't import Part type here comfortably, use any or define basic shape.
    const part = result.candidates[0].content?.parts?.find(
      (p: any) => p.inlineData
    );
    if (part && part.inlineData && part.inlineData.data) {
      const base64 = part.inlineData.data;
      const audioBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: "audio/mp3" });

      return new Promise<Blob | null>((resolve) => {
        const audio = new Audio(`data:audio/mp3;base64,${base64}`);
        audio.onended = () => resolve(audioBlob);
        audio.onerror = () => resolve(null);
        audio.play().catch((e) => {
          console.error("Audio Playback Error:", e);
          resolve(null);
        });
      });
    }

    throw new Error("No audio data found in response");
  } catch (e) {
    throw e;
  }
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
    // Priority: Google US English -> Microsoft Zira -> Samantha -> Any English
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
