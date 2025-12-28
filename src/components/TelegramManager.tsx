import React, { useEffect, useState } from "react";
import {
  X,
  Send,
  ShieldCheck,
  Smartphone,
  Key,
  Lock,
  Wifi,
  MessageSquare,
} from "lucide-react";
import { settingsService } from "../services/settingsService";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const TelegramManager: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-cyan-400";
  const themeBorder = theme?.border || "border-cyan-500";
  const themeBg = theme?.bg || "bg-cyan-950/20";
  const themeHex = theme?.hex || "#06b6d4";
  const [step, setStep] = useState("INIT"); // INIT, PHONE, CODE, PASSWORD, READY
  const [status, setStatus] = useState("DISCONNECTED");
  const [phoneNumber, setPhoneNumber] = useState(
    settingsService.get("telegram").phoneNumber || ""
  );
  const [apiId, setApiId] = useState(
    settingsService.get("telegram").apiId || ""
  );
  const [apiHash, setApiHash] = useState(
    settingsService.get("telegram").apiHash || ""
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userMe, setUserMe] = useState<any>(null);

  // Chat State
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/telegram/status"));
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "READY" && data.me) {
        setStep("READY");
        setUserMe(data.me);
      }
    } catch (e) {
      console.error("Status check failed", e);
    }
  };

  const RequestCode = async () => {
    if (!phoneNumber || !apiId || !apiHash)
      return alert("Please fill all fields");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/telegram/auth/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, apiId, apiHash }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("CODE");
        // Save settings for JIT use
        settingsService.saveSettings({
          telegram: { apiId, apiHash, phoneNumber },
        });
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Request failed");
    } finally {
      setLoading(false);
    }
  };

  const VerifyCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/telegram/auth/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code, password, apiId, apiHash }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("READY");
        checkStatus();
      } else if (data.status === "WAITING_PASSWORD") {
        setStep("PASSWORD");
      } else {
        alert("Verification failed: " + data.error);
      }
    } catch (e) {
      alert("Verify failed");
    } finally {
      setLoading(false);
    }
  };

  const SendMessage = async () => {
    if (!target || !message) return;
    try {
      await fetch(apiUrl("/api/telegram/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, message }),
      });
      setMessage("");
      alert("Message sent!");
    } catch (e) {
      alert("Failed to send");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-2xl bg-black/80 backdrop-blur-xl border ${themeBorder} rounded-lg overflow-hidden flex flex-col shadow-2xl`}
        style={{
          boxShadow: `0 0 50px ${themeHex}40`,
        }}
      >
        {/* Header */}
        <div
          className={`h-16 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-6`}
        >
          <div className="flex items-center gap-3">
            <Send className={themePrimary} size={24} />
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-widest">
                TELEGRAM LINK
              </h2>
              <div
                className={`text-[10px] font-mono ${themePrimary} flex gap-4`}
              >
                <span>STATUS: {status}</span>
                {userMe && <span>USER: @{userMe.username}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="text-slate-500 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 space-y-6">
          {step === "INIT" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div
                className={`p-4 ${themeBg} border ${themeBorder}/30 rounded ${themePrimary} text-xs`}
                style={{
                  backgroundColor: `${themeHex}1a`,
                }}
              >
                <p className="font-bold mb-1">SETUP REQUIRED</p>
                To link your account, you need your API ID and Hash from{" "}
                <a
                  href="https://my.telegram.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                >
                  my.telegram.org
                </a>
                . This allows Luca to act as a verified client on your behalf.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">
                    API ID
                  </label>
                  <input
                    type="text"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded p-2 text-white text-sm font-mono"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">
                    API HASH
                  </label>
                  <input
                    type="text"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded p-2 text-white text-sm font-mono"
                    placeholder="abcdef123456..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono">
                  PHONE NUMBER (International Format)
                </label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded p-2 pl-10 text-white text-sm font-mono"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <button
                onClick={RequestCode}
                disabled={loading}
                className={`w-full py-3 ${themeBg} hover:opacity-80 border ${themeBorder} ${themePrimary} font-bold tracking-widest rounded transition-all`}
              >
                {loading ? "CONNECTING..." : "SEND CODE"}
              </button>
            </div>
          )}

          {step === "CODE" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className={`${themePrimary} font-mono text-sm text-center`}>
                Code sent to your Telegram app/SMS
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono">
                  AUTH CODE
                </label>
                <div className="relative">
                  <ShieldCheck
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded p-2 pl-10 text-white text-sm font-mono tracking-widest"
                    placeholder="12345"
                  />
                </div>
              </div>
              <button
                onClick={VerifyCode}
                disabled={loading}
                className={`w-full py-3 ${themeBg} hover:bg-cyan-500/20 border ${themeBorder} text-cyan-400 font-bold tracking-widest rounded transition-all`}
              >
                {loading ? "VERIFYING..." : "VERIFY LOGIN"}
              </button>
            </div>
          )}

          {step === "PASSWORD" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="text-center text-red-400 font-mono text-sm">
                2FA Required
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono">
                  CLOUD PASSWORD
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={16}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded p-2 pl-10 text-white text-sm font-mono"
                    placeholder="********"
                  />
                </div>
              </div>
              <button
                onClick={VerifyCode}
                disabled={loading}
                className={`w-full py-3 ${themeBg} hover:bg-cyan-500/20 border ${themeBorder} text-cyan-400 font-bold tracking-widest rounded transition-all`}
              >
                {loading ? "UNLOCKING..." : "UNLOCK"}
              </button>
            </div>
          )}

          {step === "READY" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              <div
                className={`flex flex-col items-center justify-center p-6 border border-dashed ${themeBorder}/30 rounded`}
                style={{
                  backgroundColor: `${themeHex}0d`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse"
                  style={{
                    backgroundColor: `${themeHex}33`,
                  }}
                >
                  <Wifi size={32} className={themePrimary} />
                </div>
                <h3 className="text-lg font-bold text-white tracking-widest">
                  NEURAL LINK ACTIVE
                </h3>
                <p className={`text-sm opacity-60 font-mono ${themePrimary}`}>
                  Connected as {userMe?.firstName} ({userMe?.username})
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-mono">
                  SEND MESSAGE (TEST)
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="@username or phone"
                  className="w-full bg-black/50 border border-slate-700 rounded p-2 text-white text-xs font-mono mb-2"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message..."
                    className="flex-1 bg-black/50 border border-slate-700 rounded p-2 text-white text-xs font-mono"
                  />
                  <button
                    onClick={SendMessage}
                    className={`p-2 ${themeBg} border ${themeBorder}/30 rounded ${themePrimary} hover:opacity-80`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramManager;
