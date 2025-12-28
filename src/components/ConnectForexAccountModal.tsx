import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  AlertCircle,
  Zap,
  Shield,
  Globe,
  ChevronRight,
} from "lucide-react";
import { apiUrl } from "../config/api";

interface ForexBroker {
  id: string;
  name: string;
  logo: string; // Changed from icon to logo for image URL
  color: string;
  nigeriaFriendly: boolean;
  requiresAccountId: boolean;
  features: string[];
  apiType: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: any) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

export default function ConnectForexAccountModal({
  isOpen,
  onClose,
  onConnect,
  theme,
}: Props) {
  const themePrimary = theme?.primary || "text-emerald-500";
  const themeBorder = theme?.border || "border-emerald-500";
  const themeBg = theme?.bg || "bg-emerald-950/10";
  const themeHex = theme?.hex || "#10b981";

  const [step, setStep] = useState<"broker" | "credentials">("broker");
  const [brokers, setBrokers] = useState<ForexBroker[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<string>("");
  const [alias, setAlias] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [environment, setEnvironment] = useState<"demo" | "live">("demo");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  // Fetch brokers on mount
  useEffect(() => {
    if (isOpen) {
      fetchBrokers();
    }
  }, [isOpen]);

  const fetchBrokers = async () => {
    // Using fallback data with real logos
    setBrokers([
      {
        id: "deriv",
        name: "Deriv",
        logo: "https://static.deriv.com/favicons/favicon-32x32.png",
        color: "from-red-500 to-pink-600",
        nigeriaFriendly: true,
        requiresAccountId: false,
        features: ["Forex", "Synthetics", "Options"],
        apiType: "WebSocket",
      },
      {
        id: "exness",
        name: "Exness",
        logo: "https://www.exness.com/favicon.ico",
        color: "from-yellow-500 to-orange-600",
        nigeriaFriendly: true,
        requiresAccountId: true,
        features: ["Forex", "Metals", "Crypto"],
        apiType: "REST",
      },
      {
        id: "xm",
        name: "XM",
        logo: "https://www.xm.com/favicon.ico",
        color: "from-green-500 to-teal-600",
        nigeriaFriendly: true,
        requiresAccountId: true,
        features: ["Forex", "CFDs", "Stocks"],
        apiType: "REST",
      },
      {
        id: "icmarkets",
        name: "IC Markets",
        logo: "https://www.icmarkets.com/favicon.ico",
        color: "from-gray-500 to-slate-600",
        nigeriaFriendly: true,
        requiresAccountId: true,
        features: ["Forex", "CFDs", "Futures"],
        apiType: "FIX/cTrader",
      },
      {
        id: "oanda",
        name: "OANDA",
        logo: "https://www.oanda.com/favicon.ico",
        color: "from-blue-500 to-cyan-600",
        nigeriaFriendly: false,
        requiresAccountId: true,
        features: ["Forex", "CFDs"],
        apiType: "REST v20",
      },
      {
        id: "fxcm",
        name: "FXCM",
        logo: "https://www.fxcm.com/favicon.ico",
        color: "from-purple-500 to-indigo-600",
        nigeriaFriendly: false,
        requiresAccountId: true,
        features: ["Forex", "CFDs"],
        apiType: "REST",
      },
    ]);
  };

  const handleBrokerSelect = (brokerId: string) => {
    setSelectedBroker(brokerId);
    setStep("credentials");
    setError("");
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError("");

    try {
      const res = await fetch(apiUrl("/api/forex/accounts/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker: selectedBroker,
          alias,
          apiKey,
          accountId,
          environment,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onConnect(data);
        resetForm();
        onClose();
      } else {
        setError(data.error || "Connection failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setStep("broker");
    setSelectedBroker("");
    setAlias("");
    setApiKey("");
    setAccountId("");
    setEnvironment("demo");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedBrokerData = brokers.find((b) => b.id === selectedBroker);
  const allBrokers = brokers; // Show all brokers without filtering

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Container - LUCA THEME */}
      <div
        className="relative w-full md:w-[92%] max-w-4xl mx-2 md:mx-4 max-h-[95vh] md:max-h-[85vh] bg-[#0a0f1a] 
                   border-2 rounded-lg overflow-hidden shadow-2xl"
        style={{
          borderColor: themeHex,
          boxShadow: `0 0 60px ${themeHex}40, 0 0 120px ${themeHex}20`,
        }}
      >
        {/* Animated glow effect */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${themeHex}40 0%, transparent 60%)`,
          }}
        />

        {/* Header */}
        <div
          className="relative border-b"
          style={{ borderColor: `${themeHex}30` }}
        >
          <div className="px-8 py-6 bg-gradient-to-r from-black/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${themeBg} border-2`}
                  style={{ borderColor: themeHex }}
                >
                  <Globe className={themePrimary} size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h2
                    className={`text-3xl font-display font-bold ${themePrimary} tracking-tight`}
                  >
                    FOREX BROKER LINK
                  </h2>
                  <p className="text-sm text-slate-400 font-mono mt-1">
                    {step === "broker"
                      ? ">> SELECT TRADING PLATFORM"
                      : `>> CONNECTING_${selectedBrokerData?.name.toUpperCase()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className={`p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:${themePrimary} 
                         transition-all duration-200`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Progress Dots */}
            <div className="flex items-center gap-3 mt-6">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold
                             ${
                               step === "broker"
                                 ? `${themeBg} ${themePrimary} border-2`
                                 : "bg-black/30 text-slate-600 border border-slate-800"
                             }`}
                style={step === "broker" ? { borderColor: themeHex } : {}}
              >
                <span>01</span>
                <span>/</span>
                <span>BROKER</span>
              </div>
              <ChevronRight
                className={
                  step === "credentials" ? themePrimary : "text-slate-700"
                }
                size={20}
              />
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold
                             ${
                               step === "credentials"
                                 ? `${themeBg} ${themePrimary} border-2`
                                 : "bg-black/30 text-slate-600 border border-slate-800"
                             }`}
                style={step === "credentials" ? { borderColor: themeHex } : {}}
              >
                <span>02</span>
                <span>/</span>
                <span>CREDENTIALS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-y-auto max-h-[calc(90vh-14rem)] p-8 bg-black/40">
          {/* STEP 1: Broker Selection */}
          {step === "broker" && (
            <div className="space-y-8">
              {/* All Brokers - Unified List */}
              {allBrokers.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`h-[2px] flex-1`}
                      style={{
                        background: `linear-gradient(to right, ${themeHex}, transparent)`,
                      }}
                    />
                    <h3
                      className={`text-sm font-mono font-bold ${themePrimary} tracking-widest flex items-center gap-2`}
                    >
                      <Zap size={16} />
                      AVAILABLE BROKERS
                    </h3>
                    <div
                      className={`h-[2px] flex-1`}
                      style={{
                        background: `linear-gradient(to left, ${themeHex}, transparent)`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {allBrokers.map((broker) => (
                      <button
                        key={broker.id}
                        onClick={() => handleBrokerSelect(broker.id)}
                        className="group relative p-6 rounded-lg bg-gradient-to-br from-black/60 to-black/40
                                 border-2 border-slate-800 hover transition-all duration-300 text-left
                                 hover:scale-[1.02] hover:shadow-2xl"
                        style={{
                          borderColor: "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = themeHex)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "transparent")
                        }
                      >
                        {/* Glow effect on hover */}
                        <div
                          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            boxShadow: `0 0 40px ${themeHex}40 inset`,
                          }}
                        />

                        <div className="relative">
                          <div className="flex items-start justify-between mb-4">
                            {/* Real Logo */}
                            <div className="w-16 h-16 rounded-lg bg-white/10 p-3 flex items-center justify-center">
                              <img
                                src={broker.logo}
                                alt={broker.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to first letter if logo fails
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-white">${broker.name[0]}</span>`;
                                }}
                              />
                            </div>
                            <div
                              className={`px-2 py-1 text-[10px] font-mono font-bold ${themeBg} ${themePrimary} 
                                          rounded border`}
                              style={{ borderColor: themeHex }}
                            >
                              AVAILABLE
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xl font-bold text-white mb-2">
                              {broker.name}
                            </h4>
                            <p className="text-xs text-slate-400 mb-3 font-mono">
                              {broker.features.slice(0, 2).join(" • ")}
                            </p>

                            <div
                              className={`flex items-center gap-2 text-xs font-mono font-bold ${themePrimary}`}
                            >
                              <ChevronRight size={14} />
                              CONNECT NOW
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Credentials */}
          {step === "credentials" && selectedBrokerData && (
            <div className="space-y-6">
              {/* Selected Broker Display */}
              <div
                className={`p-6 rounded-lg bg-gradient-to-br from-black/60 to-black/40 border-2`}
                style={{ borderColor: themeHex }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white/10 p-4 flex items-center justify-center">
                    <img
                      src={selectedBrokerData.logo}
                      alt={selectedBrokerData.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-3xl font-bold ${themePrimary}`}>
                      {selectedBrokerData.name}
                    </h3>
                    <p className="text-slate-400 font-mono text-sm mt-1">
                      {selectedBrokerData.features[0]}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("broker")}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-mono
                             border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    &lt; BACK
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Alias */}
                <div>
                  <label
                    className={`block text-sm font-mono font-bold ${themePrimary} mb-2`}
                  >
                    ACCOUNT ALIAS
                  </label>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Main Trading Account"
                    className="w-full px-4 py-3 rounded-lg bg-black/40 border-2 border-slate-800
                             text-white placeholder-slate-600 font-mono
                             focus:outline-none focus:border-emerald-500
                             transition-all duration-200"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label
                    className={`block text-sm font-mono font-bold ${themePrimary} mb-2`}
                  >
                    API TOKEN
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••••••••••••••"
                    className="w-full px-4 py-3 rounded-lg bg-black/40 border-2 border-slate-800
                             text-white placeholder-slate-600 font-mono text-sm
                             focus:outline-none focus:border-emerald-500
                             transition-all duration-200"
                  />
                </div>

                {/* Account ID (conditional) */}
                {selectedBrokerData.requiresAccountId && (
                  <div>
                    <label
                      className={`block text-sm font-mono font-bold ${themePrimary} mb-2`}
                    >
                      ACCOUNT ID
                    </label>
                    <input
                      type="text"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="101-004-12345678-001"
                      className="w-full px-4 py-3 rounded-lg bg-black/40 border-2 border-slate-800
                               text-white placeholder-slate-600 font-mono text-sm
                               focus:outline-none focus:border-emerald-500
                               transition-all duration-200"
                    />
                  </div>
                )}

                {/* Environment Toggle */}
                <div>
                  <label
                    className={`block text-sm font-mono font-bold ${themePrimary} mb-2`}
                  >
                    ENVIRONMENT
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setEnvironment("demo")}
                      className={`py-3 rounded-lg font-mono font-bold transition-all duration-200
                                ${
                                  environment === "demo"
                                    ? `${themeBg} ${themePrimary} border-2 shadow-lg`
                                    : "bg-black/40 text-slate-400 border-2 border-slate-800 hover:border-slate-700"
                                }`}
                      style={
                        environment === "demo"
                          ? {
                              borderColor: themeHex,
                              boxShadow: `0 0 20px ${themeHex}40`,
                            }
                          : {}
                      }
                    >
                      DEMO
                    </button>
                    <button
                      onClick={() => setEnvironment("live")}
                      className={`py-3 rounded-lg font-mono font-bold transition-all duration-200
                                ${
                                  environment === "live"
                                    ? "bg-red-500/20 text-red-400 border-2 border-red-500 shadow-lg shadow-red-500/20"
                                    : "bg-black/40 text-slate-400 border-2 border-slate-800 hover:border-slate-700"
                                }`}
                    >
                      LIVE
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="text-red-400" size={20} />
                    <span className="text-sm text-red-400 font-mono">
                      {error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "credentials" && (
          <div
            className="relative border-t px-8 py-6 bg-black/60"
            style={{ borderColor: `${themeHex}30` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <Shield size={14} className={themePrimary} />
                AES-256 ENCRYPTED
              </div>

              <button
                onClick={handleConnect}
                disabled={
                  !alias ||
                  !apiKey ||
                  isConnecting ||
                  (selectedBrokerData?.requiresAccountId && !accountId)
                }
                className={`px-8 py-3 rounded-lg font-mono font-bold text-black text-sm
                         bg-gradient-to-r transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:scale-105 active:scale-95 flex items-center gap-2`}
                style={{
                  background: `linear-gradient(135deg, ${themeHex} 0%, ${themeHex}dd 100%)`,
                  boxShadow: `0 0 30px ${themeHex}60`,
                }}
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    CONNECTING...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    LINK ACCOUNT
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
