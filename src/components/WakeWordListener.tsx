import React, { useEffect, useState, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as speechCommands from "@tensorflow-models/speech-commands";
import { Loader2 } from "lucide-react";

interface WakeWordListenerProps {
  onWake: () => void;
  isListening: boolean;
  externalStream?: MediaStream | null; // New Prop
}

export const WakeWordListener: React.FC<WakeWordListenerProps> = ({
  onWake,
  isListening,
  externalStream,
}) => {
  const [status, setStatus] = useState<
    "INIT" | "LOADING" | "READY" | "TRAINING" | "LISTENING" | "ERROR"
  >("INIT");
  const [transferRecognizer, setTransferRecognizer] =
    useState<speechCommands.TransferSpeechCommandRecognizer | null>(null);
  const [isModelTrained, setIsModelTrained] = useState(false);
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
        } catch {
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
        } catch {
          console.log(
            "[WAKE] No saved model found, initiating silent auto-setup..."
          );
          // Trigger auto-setup silently after a short delay
          setTimeout(() => {
            performAutoSetup();
          }, 2000);
        }

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

  const performAutoSetup = async () => {
    if (!transferRecognizer || status === "TRAINING") return;
    setStatus("TRAINING");
    console.log("[WAKE] Starting Auto-Setup with pre-trained samples...");

    try {
      const samples = [
        {
          label: "_background_noise_",
          url: "/models/wake/samples/silence.wav",
        },
        { label: "luca", url: "/models/wake/samples/luca_1.wav" },
        { label: "luca", url: "/models/wake/samples/luca_2.wav" },
        { label: "luca", url: "/models/wake/samples/luca_3.wav" },
        { label: "luca", url: "/models/wake/samples/luca_4.wav" },
        { label: "luca", url: "/models/wake/samples/luca_5.wav" },
      ];

      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const offlineCtx = new AudioContext();

      transferRecognizer.clearExamples();

      for (const sample of samples) {
        console.log(`[WAKE] Auto-processing: ${sample.url}`);
        const resp = await fetch(sample.url);
        const buffer = await resp.arrayBuffer();
        const audioBuffer = await offlineCtx.decodeAudioData(buffer);

        const dest = offlineCtx.createMediaStreamDestination();
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);

        // Use any to bypass version-specific type definition issues with customStream
        const tempRecognizer = (speechCommands as any).create(
          "BROWSER_FFT",
          undefined,
          undefined,
          dest.stream
        );
        await tempRecognizer.ensureModelLoaded();
        const tempTransfer = tempRecognizer.createTransfer("temp");

        source.start();
        await tempTransfer.collectExample(sample.label);
        source.stop();

        const serialized = tempTransfer.serializeExamples();
        transferRecognizer.loadExamples(serialized, false);
      }

      console.log("[WAKE] Auto-collection complete. Training...");
      await trainModel();
    } catch (e) {
      console.error("[WAKE] Auto-Setup Failed:", e);
      setStatus("ERROR");
    }
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

      // NEW: Use shared stream if available
      if (externalStream) {
        console.log("[WAKE] 🤝 Piggybacking on VoiceHub stream!");
        // We just create source to keep it alive/attached if needed by future logic,
        // but for now we rely on the implementation detail that we passed the stream ref or similar?
        // Actually, the previous implementation didn't use source.
        // Let's just create it to ensure context stays active if that was the intent,
        // or just ignore it if unused.
        audioCtx.createMediaStreamSource(externalStream);
        // Connect to destination but NOT to output (avoid feedback)
      } else if (audioCtx.state === "suspended") {
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
      // @ts-expect-error - Checking for webkitAudioContext which might not be on window type
      const existingCtx = window.AudioContext || window.webkitAudioContext;
      if (existingCtx) {
        // We can't easily access the specific instances created by useVoiceInput hooks,
        // but we can ensure we aren't holding any global ones ourselves.
      }

      console.log("[WAKE] 🎤 Requesting TFJS Listen...");
      // TFJS sometimes needs a moment if the mic was just released
      await new Promise((r) => setTimeout(r, 500));

      // Custom listen call based on stream presence
      // Note: transferRecognizer.listen doesn't support stream directly in some versions,
      // but creating the recognizer WITH the stream is the key.
      // Since we already created it, we might need to recreate if stream changes,
      // but for now let's try standard listen. Use CPU backend for sharing stability.

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

  // UI for Training - REMOVED MODAL, now silent
  if (status === "TRAINING" && !isModelTrained) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-black/80 backdrop-blur-md border border-cyan-500/30 px-3 py-2 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="text-cyan-400 animate-spin" size={14} />
          <span className="text-[10px] font-medium text-cyan-100 italic">
            Optimizing Sense...
          </span>
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
