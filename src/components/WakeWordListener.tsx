import React, { useEffect, useState, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as speechCommands from "@tensorflow-models/speech-commands";
import {
  Mic,
  Disc,
  Save,
  RotateCcw,
  BrainCircuit,
  Check,
  Loader2,
} from "lucide-react";

interface WakeWordListenerProps {
  onWake: () => void;
  isListening: boolean;
}

export const WakeWordListener: React.FC<WakeWordListenerProps> = ({
  onWake,
  isListening,
}) => {
  const [status, setStatus] = useState<
    "INIT" | "LOADING" | "READY" | "TRAINING" | "LISTENING" | "ERROR"
  >("INIT");
  const [recognizer, setRecognizer] =
    useState<speechCommands.SpeechCommandRecognizer | null>(null);
  const [transferRecognizer, setTransferRecognizer] =
    useState<speechCommands.TransferSpeechCommandRecognizer | null>(null);
  const [trainingStep, setTrainingStep] = useState(0); // 0: Idle, 1: Record Background, 2: Record "Luca"
  const [examplesCount, setExamplesCount] = useState({
    background: 0,
    wake: 0,
  });
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const lastWakeTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 2000; // 2 second cooldown between detections

  const isListeningRef = useRef(isListening);

  useEffect(() => {
    console.log(`[WAKE] Prop update: isListening=${isListening}`);
    isListeningRef.current = isListening;
  }, [isListening]);

  // Load base model and custom model
  useEffect(() => {
    const loadModel = async (retries = 3) => {
      try {
        setStatus("LOADING");

        // Try WebGL first, fallback to CPU
        try {
          await tf.setBackend("webgl");
          await tf.ready();
        } catch (e) {
          console.warn("[WAKE] WebGL not available, falling back to CPU");
          await tf.setBackend("cpu");
          await tf.ready();
        }

        const baseRecognizer = speechCommands.create("BROWSER_FFT");
        await baseRecognizer.ensureModelLoaded();

        // Try to load saved transfer model
        const transfer = baseRecognizer.createTransfer("luca-wake-word");

        try {
          await transfer.load("indexeddb://luca-model");
          console.log("[WAKE] Loaded saved model");
          setIsModelTrained(true);
        } catch (e) {
          console.log("[WAKE] No saved model found, starting fresh");
        }

        setRecognizer(baseRecognizer);
        setTransferRecognizer(transfer);
        setStatus("READY");
      } catch (e) {
        console.error("TFJS Load Error:", e);
        if (retries > 0) {
          console.log(
            `[WAKE] Retrying model load (${retries} attempts left)...`
          );
          setTimeout(() => loadModel(retries - 1), 1000);
        } else {
          setStatus("ERROR");
        }
      }
    };
    loadModel();

    // Cleanup on unmount
    return () => {
      // Cleanup will be handled by the state variables
      // We can't access them here directly, so we rely on the stopListening effect
    };
  }, []);

  // Training Logic
  const collectExample = async (label: string) => {
    if (!transferRecognizer) return;

    setIsRecording(true);
    try {
      await transferRecognizer.collectExample(label);
      setExamplesCount((prev) => ({
        ...prev,
        [label === "_background_noise_" ? "background" : "wake"]:
          prev[label === "_background_noise_" ? "background" : "wake"] + 1,
      }));
    } finally {
      setIsRecording(false);
    }
  };

  const trainModel = async () => {
    if (!transferRecognizer || status === "TRAINING") return;
    setStatus("TRAINING");
    try {
      await transferRecognizer.train({
        epochs: 30, // Increased epochs
        callback: {
          onEpochEnd: async (epoch: any, logs: any) => {
            console.log(`Epoch ${epoch}: loss=${logs?.loss}`);
          },
        },
      });

      // Save the model
      await transferRecognizer.save("indexeddb://luca-model");

      setIsModelTrained(true);
      setStatus("LISTENING");
      startListening();
    } catch (e) {
      console.error("Training Failed:", e);
      setStatus("ERROR");
    }
  };

  const resetModel = async () => {
    if (!transferRecognizer) return;
    setIsModelTrained(false);
    setExamplesCount({ background: 0, wake: 0 });
    transferRecognizer.clearExamples();
    try {
      // Clear from storage
      await tf.io.removeModel("indexeddb://luca-model");
    } catch (e) {
      // Ignore if not found
    }
    setStatus("READY");
  };

  const toggleLock = useRef(false);

  const startListening = async () => {
    if (!transferRecognizer || !isModelTrained || toggleLock.current) return;

    toggleLock.current = true;
    try {
      // Double check state after lock
      if (!isListeningRef.current) {
        toggleLock.current = false;
        return;
      }

      if (transferRecognizer.isListening()) {
        console.log("[WAKE] Already listening, skipping");
        toggleLock.current = false;
        return;
      }

      // Ensure backend is ready
      await tf.ready();

      // Ensure AudioContext is running
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Global handler - Log but DO NOT RESTART automatically to prevent loops
      const unhandledHandler = (event: PromiseRejectionEvent) => {
        if (
          event.reason &&
          String(event.reason).includes("Cannot read properties of null")
        ) {
          event.preventDefault();
          console.error(
            "[WAKE] TFJS Critical Error: Audio subsystem failed. Releasing lock and stopping."
          );
          // Release lock FIRST before stopping
          toggleLock.current = false;
          setStatus("READY"); // Allow restart instead of ERROR
          stopListening(true);
        }
      };
      window.addEventListener("unhandledrejection", unhandledHandler);

      // FORCE CLEANUP: Try to close any hanging AudioContexts from other parts of the app
      // This is a "Hammer" fix to ensure TFJS has exclusive rights
      // @ts-ignore
      const existingCtx = window.AudioContext || window.webkitAudioContext;
      if (existingCtx) {
        // We can't easily access the specific instances created by useVoiceInput hooks,
        // but we can ensure we aren't holding any global ones ourselves.
      }

      console.log("[WAKE] 🎤 Requesting TFJS Listen...");
      // TFJS sometimes needs a moment if the mic was just released
      await new Promise((r) => setTimeout(r, 500));

      await transferRecognizer.listen(
        async (result) => {
          if (!isListeningRef.current) return;

          if (!result || !result.scores) return;

          const scores = result.scores as Float32Array;
          const labels = transferRecognizer.wordLabels();
          const wakeIndex = labels.indexOf("luca");

          if (wakeIndex === -1) return;

          const now = Date.now();
          const confidence = scores[wakeIndex];

          if (confidence > 0.9 && now - lastWakeTimeRef.current > DEBOUNCE_MS) {
            lastWakeTimeRef.current = now;
            console.log(
              `[WAKE] ✅ "Luca" detected! (confidence: ${(
                confidence * 100
              ).toFixed(1)}%)`
            );
            onWake();
          }
        },
        {
          overlapFactor: 0.2,
          probabilityThreshold: 0.9,
          invokeCallbackOnNoiseAndUnknown: false,
          includeSpectrogram: false,
        }
      );
      console.log("[WAKE] 🟢 TFJS Listener Started Successfully!");
    } catch (e) {
      console.error("[WAKE] Start Listening Failed:", e);
      setStatus("READY"); // Allow retry instead of hard ERROR
    } finally {
      // ALWAYS release lock, even on error
      toggleLock.current = false;
    }
  };

  const stopListening = async (force = false) => {
    if (!transferRecognizer) return;

    if (toggleLock.current && !force) {
      console.warn(
        "[WAKE] stopListening blocked by toggleLock. Pass force=true to override."
      );
      return;
    }

    toggleLock.current = true;
    try {
      if (transferRecognizer.isListening()) {
        await transferRecognizer.stopListening();
        console.log("[WAKE] Stopped listening");
      }
    } catch (e) {
      console.warn("[WAKE] Error stopping listener:", e);
    } finally {
      toggleLock.current = false;
    }
  };

  // Auto-start if trained with Delay
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleStateChange = async () => {
      console.log(
        `[WAKE] State Change Check: Trained=${isModelTrained}, Listening=${isListening}, Status=${status}`
      );
      if (isModelTrained && isListening && status === "READY") {
        console.log("[WAKE] Auto-starting listener...");
        // Add 1.5s delay before listening again to clear buffers/noise
        timeout = setTimeout(() => {
          startListening();
        }, 1500);
      } else if (!isListening) {
        console.log("[WAKE] Auto-stopping listener (isListening=false)...");
        // Stop immediately if not listening
        await stopListening();
      }
    };

    handleStateChange();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isListening, isModelTrained, status]);

  // UI for Training
  if ((status === "READY" || status === "TRAINING") && !isModelTrained) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-black/90 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-2xl max-w-sm w-full">
          <div className="flex items-center gap-2 mb-4 text-cyan-400">
            <BrainCircuit size={20} />
            <span className="font-bold">Teach me "Luca"</span>
          </div>
          <p className="text-[10px] text-white/60 mb-4">
            To fix false triggers, we need more examples.
          </p>

          <div className="space-y-4">
            {/* Step 1: Background Noise */}
            <div
              className={`p-3 rounded-lg border ${
                examplesCount.background >= 4
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white">
                  1. Background (Add Noise!)
                </span>
                <span className="text-xs text-white/50">
                  {examplesCount.background}/4
                </span>
              </div>
              <p className="text-[10px] text-white/40 mb-2">
                Tip: Play music, type, or tap the desk while recording.
              </p>
              <button
                onClick={async () => {
                  const { permissionManager } = await import(
                    "../services/mobilePermissionManager"
                  );
                  const result = await permissionManager.requestMicrophone();
                  if (result.granted) {
                    collectExample("_background_noise_");
                  } else {
                    permissionManager.showPermissionDeniedAlert("microphone");
                  }
                }}
                disabled={
                  examplesCount.background >= 4 ||
                  status === "TRAINING" ||
                  isRecording
                }
                className="w-full py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded text-xs text-white transition-colors flex items-center justify-center gap-2"
              >
                {isRecording && <Mic className="animate-pulse" size={14} />}
                {examplesCount.background >= 4 ? "Done" : "Record Noise (1s)"}
              </button>
            </div>

            {/* Step 2: Wake Word */}
            <div
              className={`p-3 rounded-lg border ${
                examplesCount.wake >= 4
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white">
                  2. Say "Luca" (Varied)
                </span>
                <span className="text-xs text-white/50">
                  {examplesCount.wake}/4
                </span>
              </div>
              <button
                onClick={async () => {
                  const { permissionManager } = await import(
                    "../services/mobilePermissionManager"
                  );
                  const result = await permissionManager.requestMicrophone();
                  if (result.granted) {
                    collectExample("luca");
                  } else {
                    permissionManager.showPermissionDeniedAlert("microphone");
                  }
                }}
                disabled={
                  examplesCount.wake >= 4 ||
                  status === "TRAINING" ||
                  isRecording
                }
                className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 rounded text-xs text-cyan-200 transition-colors flex items-center justify-center gap-2"
              >
                {isRecording && <Mic className="animate-pulse" size={14} />}
                {examplesCount.wake >= 4 ? "Done" : 'Record "Luca"'}
              </button>
            </div>

            {/* Train Button */}
            <button
              onClick={trainModel}
              disabled={
                examplesCount.background < 4 ||
                examplesCount.wake < 4 ||
                status === "TRAINING"
              }
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {status === "TRAINING" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              {status === "TRAINING"
                ? "Training (takes 10s)..."
                : "Finish Setup"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reset Button (Hidden unless specific key combo or if we want to expose it in settings,
  // but for now let's show a small trigger if trained)
  // Reset Button

  if (status === "LOADING") {
    return null; // Silent load
  }

  return null;
};
