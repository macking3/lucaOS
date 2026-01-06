import React, { useState, useEffect } from "react";
import HologramFace from "./HologramFace";
import ModeSelect, { ConversationMode } from "./ModeSelect";
import ConversationalOnboarding from "./ConversationalOnboarding";
import FaceScan from "./FaceScan";
import {
  ArrowRight,
  Check,
  Sparkles,
  Terminal,
  Key,
  Shield,
} from "lucide-react";
import { soundService } from "../../services/soundService";
import { settingsService } from "../../services/settingsService";
import { requestVoicePermission } from "../../utils/voicePermissions";
import { personalityService } from "../../services/personalityService";
import { OperatorProfile } from "../../types/operatorProfile";
import { useMobile } from "../../hooks/useMobile";

type Step =
  | "BOOT"
  | "IDENTITY"
  | "FACE_SCAN"
  | "BRIDGE"
  | "MODE_SELECT"
  | "CONVERSATION"
  | "CALIBRATION"
  | "COMPLETE";

interface OnboardingFlowProps {
  theme: { primary: string; hex: string };
  onComplete: (profile?: Partial<OperatorProfile>) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  theme,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>("BOOT");
  const isMobile = useMobile();

  // Form State
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [profile, setProfile] = useState<Partial<OperatorProfile> | null>(null);
  const [conversationMode, setConversationMode] =
    useState<ConversationMode | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationError, setKeyValidationError] = useState<string | null>(
    null
  );
  const [showKeyHelp, setShowKeyHelp] = useState(false);

  // Boot Sequence Animation
  const [bootText, setBootText] = useState<string[]>([]);

  useEffect(() => {
    if (step === "BOOT") {
      const messages = [
        "INITIALIZING NEURAL INTERFACE...",
        "ESTABLISHING SECURE CONNECTION...",
        "LOADING COGNITIVE MODULES...",
        "SYSTEM ONLINE.",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < messages.length) {
          setBootText((prev) => [...prev, messages[i]]);
          soundService.play("KEYSTROKE"); // Use existing sound service
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setStep("IDENTITY"), 1000);
        }
      }, 800);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      soundService.play("SUCCESS"); // Or generic success sound
      localStorage.setItem("LUCA_USER_NAME", name); // Persist name if needed, or just use it here

      // Update Real Settings
      const currentGen = settingsService.get("general");
      settingsService.saveSettings({
        general: { ...currentGen, userName: name },
      });

      // Initialize Luca's personality for this operator
      personalityService.initializeForOperator(name);
      console.log("[Onboarding] Personality initialized for", name);

      setStep("FACE_SCAN"); // Go to face scan
    }
  };

  // Validate API key by making a test request
  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "test" }] }],
          }),
        }
      );

      // Success - key is valid
      if (response.ok) {
        return true;
      }

      // Check for specific invalid key error
      if (response.status === 400) {
        const data = await response.json();
        // Specifically check for "API key not valid" message
        if (data.error?.message?.toLowerCase().includes("api key not valid")) {
          console.log("[Validation] Invalid API key:", data.error.message);
          return false;
        }
        // Other 400 errors (e.g., missing parts) with a valid key = key is fine
        console.log("[Validation] API key valid (400 for other reason)");
        return true;
      }

      // 401 or 403 = authentication issue = invalid key
      if (response.status === 401 || response.status === 403) {
        console.log("[Validation] Authentication failed:", response.status);
        return false;
      }

      // Any other status code = can't determine, assume invalid for safety
      console.log("[Validation] Unexpected status:", response.status);
      return false;
    } catch (error) {
      console.error("[Validation] Network error:", error);
      // Network error - can't validate, assume invalid for safety
      return false;
    }
  };

  const handleBridgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setIsValidatingKey(true);
      setKeyValidationError(null);

      // Check if shift key is held (bypass validation for debugging)
      const bypassValidation = (e.nativeEvent as any).shiftKey;

      // Validate the API key (unless bypassed)
      let isValid = bypassValidation;
      if (!bypassValidation) {
        isValid = await validateApiKey(apiKey.trim());
      } else {
        console.log("[Validation] Bypassed (Shift+Click)");
      }

      if (!isValid) {
        setIsValidatingKey(false);
        setKeyValidationError(
          "Invalid API key. Please check and try again, or skip to use demo mode."
        );
        soundService.play("ALERT");
        return;
      }

      setIsValidatingKey(false);
      soundService.play("SUCCESS");

      localStorage.setItem("GEMINI_API_KEY", apiKey);
      localStorage.setItem("LUCA_USES_DEMO_KEY", "false");

      const currentBrain = settingsService.get("brain");
      settingsService.saveSettings({
        brain: {
          ...currentBrain,
          geminiApiKey: apiKey,
          useCustomApiKey: true,
        },
      });

      setStep("MODE_SELECT");
    }
  };

  const handleSkipApiKey = () => {
    soundService.play("SUCCESS");
    // Mark as using demo/fallback key
    localStorage.setItem("LUCA_USES_DEMO_KEY", "true");
    localStorage.removeItem("GEMINI_API_KEY"); // Clear any previous custom key

    const currentBrain = settingsService.get("brain");
    settingsService.saveSettings({
      brain: {
        ...currentBrain,
        useCustomApiKey: false,
      },
    });

    setStep("MODE_SELECT");
  };

  // Handle face scan completion
  const handleFaceScanComplete = (faceData: string | null) => {
    if (faceData) {
      // Save to settings/local storage for UI responsiveness & fallback
      settingsService.saveFaceData(faceData);
      console.log("[Onboarding] Face data cached in settings");
    } else {
      console.log("[Onboarding] Face scan skipped");
    }
    // Continue to API key step
    setStep("BRIDGE");
  };

  // Handle mode selection
  const handleModeSelect = async (mode: ConversationMode) => {
    setConversationMode(mode);
    soundService.play("KEYSTROKE");

    // Request voice permission if voice mode
    if (mode === "voice") {
      const granted = await requestVoicePermission();
      if (!granted) {
        // Fallback to text
        alert(
          "Microphone access required for voice mode. Falling back to text."
        );
        setConversationMode("text");
      }
    }

    // Go to CONVERSATION step
    setStep("CONVERSATION");
  };

  // Complete Transition
  useEffect(() => {
    if (step === "COMPLETE") {
      soundService.play("SUCCESS");
      const timer = setTimeout(() => {
        onComplete(profile || undefined);
      }, 2000); // Show "Complete" state for 2s then finish
      return () => clearTimeout(timer);
    }
  }, [step, onComplete, profile]);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white font-mono flex flex-col items-center justify-center overflow-hidden">
      {/* Holographic Face Background */}
      <HologramFace step={step} />

      {/* UI Overlay */}
      <div
        className={`z-10 w-full relative transition-all duration-700 ease-in-out ${
          step === "CONVERSATION"
            ? "max-w-5xl h-[85vh] flex flex-col px-4"
            : "max-w-md p-8"
        }`}
      >
        {/* BOOT STEP */}
        {step === "BOOT" && (
          <div className="space-y-2">
            {bootText.map((text, i) => (
              <div
                key={i}
                className="text-sm animate-fade-in"
                style={{ color: theme.hex }}
              >
                {">"} {text}
              </div>
            ))}
            <div
              className="w-2 h-4 animate-pulse inline-block ml-2"
              style={{ backgroundColor: theme.hex }}
            />
          </div>
        )}

        {/* IDENTITY STEP */}
        {step === "IDENTITY" && (
          <form
            onSubmit={handleIdentitySubmit}
            className="space-y-6 animate-fade-in-up"
          >
            <div className="text-center space-y-2">
              <Terminal className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h1 className="text-2xl font-bold tracking-widest uppercase">
                Identity Verification
              </h1>
              <p className="text-gray-400 text-xs">
                Please identify yourself, Operator.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60 uppercase tracking-wider">
                Operator Alias
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-white/50 focus:bg-white/10 transition-all text-center text-lg placeholder-gray-600 backdrop-blur-xl"
                placeholder="ENTER DESIGNATION"
              />
            </div>

            <button
              type="submit"
              disabled={!name}
              className="w-full bg-white/10 border border-white/30 hover:bg-white/20 hover:border-white/50 text-white py-3 rounded-lg uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl"
            >
              Confirm Identity{" "}
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </form>
        )}

        {/* BRIDGE STEP */}
        {step === "BRIDGE" && (
          <form
            onSubmit={handleBridgeSubmit}
            className="space-y-6 animate-fade-in-up"
          >
            <div className="text-center space-y-2">
              <Key className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h1 className="text-2xl font-bold tracking-widest uppercase">
                Neural Bridge
              </h1>
              <p className="text-gray-400 text-xs max-w-md mx-auto">
                Luca needs a Gemini API key to think and respond intelligently.
              </p>
            </div>

            {/* Help Section */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setShowKeyHelp(!showKeyHelp)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-xs text-white/80 font-medium">
                  Whats an API key?
                </span>
                <span className="text-white/60 text-xs">
                  {showKeyHelp ? "▲" : "▼"}
                </span>
              </button>

              {showKeyHelp && (
                <div className="mt-3 text-[11px] text-gray-400 space-y-2 animate-fade-in-up">
                  <p>
                    An API key is like a password that lets Luca use Google AI
                    (Gemini) to understand and respond to you.
                  </p>
                  <p className="font-medium text-white/70">
                    You have 2 options:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong className="text-white/80">
                        Use your own key
                      </strong>{" "}
                      (unlimited, free from Google)
                    </li>
                    <li>
                      <strong className="text-white/80">Skip for now</strong>{" "}
                      (demo mode, limited requests/day)
                    </li>
                  </ul>
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline inline-block mt-2"
                  >
                    Get free API key from Google →
                  </a>
                </div>
              )}
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-xs text-white/60 uppercase tracking-wider">
                API Key (Optional)
              </label>
              <div className="relative">
                <input
                  autoFocus
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyValidationError(null);
                  }}
                  disabled={isValidatingKey}
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-white/50 focus:bg-white/10 transition-all pl-10 placeholder-gray-600 font-mono text-sm backdrop-blur-xl disabled:opacity-50"
                  placeholder="AIzaSy..."
                />
                <Shield
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>

              {/* Validation Error */}
              {keyValidationError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 animate-fade-in-up">
                  <p className="text-xs text-red-400">{keyValidationError}</p>
                </div>
              )}

              <p className="text-[10px] text-gray-600">
                🔒 Stored securely on your device. Never uploaded.
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={!apiKey || isValidatingKey}
                className="w-full bg-white/10 border border-white/30 hover:bg-white/20 hover:border-white/50 text-white py-3 rounded-lg uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl"
              >
                {isValidatingKey ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Connect My Key
                    <Sparkles
                      size={16}
                      className="group-hover:rotate-12 transition-transform"
                    />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipApiKey}
                disabled={isValidatingKey}
                className="w-full bg-white/5 border border-white/20 hover:bg-white/10 text-white/80 py-3 rounded-lg text-sm transition-all disabled:opacity-50 backdrop-blur-xl"
              >
                Skip - Use Demo Mode
              </button>
            </div>

            <p className="text-[10px] text-gray-600 text-center">
              Demo mode uses a shared key with limited requests.
              <br />
              You can add your own key later in Settings.
            </p>
          </form>
        )}

        {/* FACE_SCAN STEP */}
        {step === "FACE_SCAN" && (
          <FaceScan
            userName={name}
            compact={isMobile}
            enrollmentEndpoint="/api/admin/enroll"
            onComplete={handleFaceScanComplete}
            onSkip={() => handleFaceScanComplete(null)}
          />
        )}

        {/* MODE_SELECT STEP */}
        {step === "MODE_SELECT" && <ModeSelect onSelect={handleModeSelect} />}

        {/* CONVERSATION STEP */}
        {step === "CONVERSATION" && conversationMode && (
          <ConversationalOnboarding
            mode={conversationMode}
            userName={name}
            onBack={() => setStep("MODE_SELECT")}
            onComplete={(completedProfile) => {
              console.log("[Onboarding] Profile complete:", completedProfile);
              setProfile(completedProfile);
              setStep("CALIBRATION");

              // Simulate calibration/saving phase
              setTimeout(() => {
                setStep("COMPLETE");
              }, 3000);
            }}
          />
        )}

        {/* CALIBRATION STEP */}
        {step === "CALIBRATION" && (
          <div className="text-center space-y-6 animate-pulse">
            <div
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: theme.hex, borderTopColor: "transparent" }}
            />
            <div className="space-y-2">
              <h2
                className="text-xl font-bold tracking-widest"
                style={{ color: theme.hex }}
              >
                CALIBRATING PATHWAYS
              </h2>
              <p className="text-xs text-gray-400">
                Optimizing cognitive tensors...
              </p>
            </div>
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === "COMPLETE" && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
            <div
              className="w-24 h-24 border-4 rounded-full flex items-center justify-center backdrop-blur-xl"
              style={{ borderColor: theme.hex }}
            >
              <Check size={40} style={{ color: theme.hex }} />
            </div>
            <div className="text-center space-y-2">
              <h2
                className="text-2xl font-bold tracking-widest"
                style={{ color: theme.hex }}
              >
                SYSTEM READY
              </h2>
              <p className="text-sm text-gray-400">
                Connection Established
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Version */}
      <div className="absolute bottom-4 text-[10px] text-gray-700 font-mono">
        LUCA OS v1.0.0
      </div>
    </div>
  );
};

export default OnboardingFlow;
