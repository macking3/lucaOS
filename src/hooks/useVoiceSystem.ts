import { useState } from "react";

export function useVoiceSystem() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showVoiceHud, setShowVoiceHud] = useState(false);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceTranscriptSource, setVoiceTranscriptSource] = useState<
    "user" | "model"
  >("user");
  const [isVadActive, setIsVadActive] = useState(false);
  const [voiceSearchResults, setVoiceSearchResults] = useState<any | null>(
    null
  );
  const [visualData, setVisualData] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  return {
    isVoiceMode,
    setIsVoiceMode,
    showVoiceHud,
    setShowVoiceHud,
    voiceAmplitude,
    setVoiceAmplitude,
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    isVadActive,
    setIsVadActive,
    voiceSearchResults,
    setVoiceSearchResults,
    visualData,
    setVisualData,
    isSpeaking,
    setIsSpeaking,
  };
}
