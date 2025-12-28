import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Save,
  User,
  Shield,
  Check,
  X,
  Lock,
  Mic,
  Play,
  Square,
} from "lucide-react";
import { soundService } from "../services/soundService";
import { apiUrl } from "../config/api";
import FaceScan from "./Onboarding/FaceScan";

interface Props {
  onClose: () => void;
  onEnrollSuccess: () => void;
  onVerify: (image: string) => Promise<boolean>;
  onVerifyVoice: (audio: string) => Promise<boolean>;
  theme: {
    primary: string;
    hex: string;
  };
}

const AdminEnrollmentModal: React.FC<Props> = ({
  onClose,
  onEnrollSuccess,
  onVerify,
  onVerifyVoice,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<"face" | "voice">("face");
  const [step, setStep] = useState<
    | "intro"
    | "camera"
    | "saving"
    | "success"
    | "verifying"
    | "verified"
    | "denied"
  >("intro");
  const [mode, setMode] = useState<"enroll" | "verify">("enroll");
  const [name, setName] = useState("Mac");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // --- VOICE LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop()); // Stop mic
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStep("camera"); // Reusing 'camera' step for 'recording' UI
      setAudioBlob(null); // Clear previous audio
      setAudioUrl(null);
    } catch (err) {
      console.error("Mic Error:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- SHARED ACTIONS ---
  const saveProfile = async () => {
    setStep("saving");
    try {
      let body = {};
      let endpoint = "";

      if (activeTab === "face") {
        if (!capturedImage) return;
        endpoint = "/api/admin/enroll";
        body = { name, faceImageBase64: capturedImage };
      } else {
        if (!audioBlob) return;
        endpoint = "/api/admin/enroll-voice";
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        await new Promise((resolve) => (reader.onloadend = resolve));
        const base64 = (reader.result as string).split(",")[1];
        body = { name, audioBase64: base64 };
      }

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        soundService.play("SUCCESS");
        setStep("success");
        setTimeout(() => {
          onEnrollSuccess();
          if (mode === "enroll") onClose(); // Close only if enrolling
        }, 2000);
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (e) {
      console.error(e);
      alert("Enrollment Failed");
      setStep("intro");
    }
  };

  const verifyProfile = async (imageOverride?: string) => {
    setStep("verifying");
    try {
      let isMatch = false;

      if (activeTab === "face") {
        const img = imageOverride || capturedImage;
        if (!img) return;
        isMatch = await onVerify(img);
      } else {
        if (!audioBlob) return;
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        await new Promise((resolve) => (reader.onloadend = resolve));
        const base64 = (reader.result as string).split(",")[1];
        isMatch = await onVerifyVoice(base64);
      }

      if (isMatch) {
        soundService.play("SUCCESS");
        setStep("verified");
      } else {
        soundService.play("ALERT");
        setStep("denied");
      }
    } catch (e) {
      console.error(e);
      setStep("denied");
    }
  };

  // --- RENDER ---
  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Tabs */}
      {step === "intro" && (
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("face")}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              activeTab === "face"
                ? "bg-white/10"
                : "text-gray-500 hover:text-gray-300"
            }`}
            style={{
              color: activeTab === "face" ? theme.hex : undefined,
              borderBottom:
                activeTab === "face" ? `2px solid ${theme.hex}` : undefined,
            }}
          >
            FACE ID
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              activeTab === "voice"
                ? "bg-white/10"
                : "text-gray-500 hover:text-gray-300"
            }`}
            style={{
              color: activeTab === "voice" ? theme.hex : undefined,
              borderBottom:
                activeTab === "voice" ? `2px solid ${theme.hex}` : undefined,
            }}
          >
            VOICEPRINT
          </button>
        </div>
      )}

      {/* Content */}
      <div
        className={`flex-1 flex flex-col ${
          step !== "camera"
            ? "overflow-y-auto custom-scrollbar"
            : "overflow-hidden"
        } p-1`}
      >
        {step === "intro" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 backdrop-blur-sm">
              {activeTab === "face" ? (
                <User size={32} style={{ color: theme.hex }} />
              ) : (
                <Mic size={32} style={{ color: theme.hex }} />
              )}
            </div>
            <div>
              <h3 className="text-white text-md font-bold mb-1">
                {activeTab === "face"
                  ? "Identify Yourself"
                  : "Voice Authentication"}
              </h3>
              <p className="text-gray-400 text-xs px-4">
                {activeTab === "face"
                  ? "Register your biometric profile to enable high-security commands."
                  : "Record a voice sample to enable speaker recognition."}
              </p>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] text-gray-500 uppercase font-bold">
                Admin Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}
                onFocus={(e) => (e.target.style.borderColor = theme.hex)}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setMode("enroll");
                  if (activeTab === "face") {
                    setStep("camera");
                  } else {
                    startRecording();
                  }
                }}
                className="w-full text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all backdrop-blur-sm text-xs"
                style={{
                  backgroundColor: `${theme.hex}CC`,
                  boxShadow: `0 0 15px -5px ${theme.hex}80`,
                }}
              >
                {activeTab === "face" ? (
                  <Camera size={14} />
                ) : (
                  <Mic size={14} />
                )}
                ENROLL
              </button>

              <button
                onClick={() => {
                  setMode("verify");
                  if (activeTab === "face") {
                    setStep("camera");
                  } else {
                    startRecording();
                  }
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all border border-white/10 backdrop-blur-sm text-xs"
              >
                <Lock size={14} />
                VERIFY
              </button>
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="relative bg-black/40 rounded-xl overflow-hidden flex-1 w-full flex items-center justify-center border border-white/10 backdrop-blur-xl">
            {activeTab === "face" ? (
              <FaceScan
                userName={name}
                compact
                enrollmentEndpoint={
                  mode === "enroll" ? "/api/admin/enroll" : undefined
                }
                onComplete={(data) => {
                  if (data) {
                    if (mode === "enroll") {
                      onEnrollSuccess();
                      onClose();
                    } else {
                      verifyProfile(data);
                    }
                  }
                }}
                onSkip={() => setStep("intro")}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 w-full h-full p-6">
                {isRecording ? (
                  <>
                    <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center animate-pulse">
                      <Mic size={32} className="text-red-500" />
                    </div>
                    <p className="text-red-400 font-bold tracking-widest text-xs">
                      RECORDING AUDIO...
                    </p>
                    <button
                      onClick={stopRecording}
                      className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Stop Recording
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `${theme.hex}1a`,
                        borderColor: `${theme.hex}4d`,
                      }}
                    >
                      <Play size={32} style={{ color: theme.hex }} />
                    </div>
                    {audioUrl && (
                      <audio
                        src={audioUrl}
                        controls
                        className="w-full max-w-xs"
                      />
                    )}
                    <div className="flex gap-3 w-full max-w-xs">
                      <button
                        onClick={startRecording}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        Retake
                      </button>
                      <button
                        onClick={() =>
                          mode === "enroll" ? saveProfile() : verifyProfile()
                        }
                        className="flex-1 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        style={{ backgroundColor: theme.hex }}
                      >
                        {mode === "enroll" ? "Enroll" : "Verify"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Processing Steps (Saving, Verifying, Success, Denied) - Kept mostly same but updated colors */}
        {["saving", "verifying", "verified", "denied", "success"].includes(
          step
        ) && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            {/* Simplified feedback UI for brevity, keeping main logic */}
            {step === "saving" && (
              <div
                className="font-bold animate-pulse"
                style={{ color: theme.hex }}
              >
                ENCRYPTING...
              </div>
            )}
            {step === "verifying" && (
              <div
                className="font-bold animate-pulse"
                style={{ color: theme.hex }}
              >
                ANALYZING...
              </div>
            )}
            {step === "verified" && (
              <div className="text-green-500 font-bold">ACCESS GRANTED</div>
            )}
            {step === "denied" && (
              <div className="text-red-500 font-bold">ACCESS DENIED</div>
            )}
            {step === "success" && (
              <div className="text-green-500 font-bold">ENROLLED</div>
            )}

            {(step === "verified" ||
              step === "denied" ||
              step === "success") && (
              <button
                onClick={() => setStep("intro")}
                className="mt-4 text-gray-500 hover:text-white underline"
              >
                Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEnrollmentModal;
