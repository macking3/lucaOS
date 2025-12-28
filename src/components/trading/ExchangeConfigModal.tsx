import React, { useState, useEffect } from "react";
import { X, Save, AlertTriangle, Key, Shield } from "lucide-react";
import { Exchange } from "../../types/trading";

interface ExchangeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Exchange | null;
}

export default function ExchangeConfigModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: ExchangeConfigModalProps) {
  const [exchangeType, setExchangeType] = useState("binance");
  const [accountName, setAccountName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isTestnet, setIsTestnet] = useState(false);

  // New Exchange Fields
  const [asterUser, setAsterUser] = useState("");
  const [hyperliquidWalletAddr, setHyperliquidWalletAddr] = useState("");
  const [lighterApiKeyIndex, setLighterApiKeyIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setExchangeType(initialData.exchange_type || "binance");
        setAccountName(initialData.account_name || "");
        setApiKey(initialData.api_key || "");
        setSecretKey(initialData.secret_key || ""); // Usually hidden, but for mock edit
        setPassphrase(initialData.passphrase || "");
        setIsTestnet(initialData.testnet || false);

        // Load custom fields
        setAsterUser(initialData.asterUser || "");
        setHyperliquidWalletAddr(initialData.hyperliquidWalletAddr || "");
        setLighterApiKeyIndex(initialData.lighterApiKeyIndex || 0);
      } else {
        setExchangeType("binance");
        setAccountName("");
        setApiKey("");
        setSecretKey("");
        setPassphrase("");
        setIsTestnet(false);
        setAsterUser("");
        setHyperliquidWalletAddr("");
        setLighterApiKeyIndex(0);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      id: initialData?.id, // undefined if new
      exchange_type: exchangeType,
      name: exchangeType.toUpperCase(),
      account_name: accountName,
      api_key: apiKey,
      secret_key: secretKey,
      passphrase: passphrase,
      testnet: isTestnet,
      enabled: true,
      // Pass custom fields
      asterUser,
      hyperliquidWalletAddr,
      lighterApiKeyIndex,
    });
    onClose();
  };

  const getExchangeIconSrc = (type: string) => {
    // Helper for icon source with fallback logic handled by onError in IMG tag usually,
    // but here we just return base path, rendering handles fallback
    return `/exchange-icons/${type}.png`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
      <div className="bg-[#161b22] border-none sm:border border-slate-700/50 rounded-none sm:rounded-xl w-full h-full sm:h-auto sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-full sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-[#0d1017] flex items-center justify-between flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden p-1">
              <img
                src={getExchangeIconSrc(exchangeType)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.endsWith(".png")) {
                    if (["aster", "bitget", "okx"].includes(exchangeType))
                      target.src = `/exchange-icons/${exchangeType}.svg`;
                    else if (exchangeType === "binance")
                      target.src = `/exchange-icons/${exchangeType}.jpg`;
                    else target.style.display = "none"; // Hide if completely fails
                  }
                }}
                alt={exchangeType}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialData ? "Edit Connection" : "Connect Exchange"}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest">
                SECURE GATEWAY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2 rounded-lg cursor-pointer active:scale-95 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-[#0b0e14]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Exchange
              </label>
              <div className="relative">
                <select
                  value={exchangeType}
                  onChange={(e) => setExchangeType(e.target.value)}
                  disabled={!!initialData}
                  className="w-full bg-[#161b22] border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 appearance-none"
                >
                  <option value="binance">Binance</option>
                  <option value="okx">OKX</option>
                  <option value="bybit">Bybit</option>
                  <option value="bitget">Bitget</option>
                  <option value="hyperliquid">Hyperliquid (DEX)</option>
                  <option value="aster">Aster (DEX)</option>
                  <option value="lighter">Lighter (DEX)</option>
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                  <img
                    src={getExchangeIconSrc(exchangeType)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.endsWith(".png")) {
                        if (["aster", "bitget", "okx"].includes(exchangeType))
                          target.src = `/exchange-icons/${exchangeType}.svg`;
                        else if (exchangeType === "binance")
                          target.src = `/exchange-icons/${exchangeType}.jpg`;
                      }
                    }}
                    alt={exchangeType}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Account Label
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Main Fund"
                className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Dynamic Fields based on Exchange */}
          <div className="space-y-4 p-4 bg-[#0d1017] border border-slate-800 rounded-xl">
            {/* Standard API Key Fields (Binance, OKX, Bybit, Bitget, Aster Signer, Hyperliquid) */}
            {[
              "binance",
              "okx",
              "bybit",
              "bitget",
              "aster",
              "hyperliquid",
            ].includes(exchangeType) && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  {exchangeType === "aster"
                    ? "Signer Address (API Wallet)"
                    : exchangeType === "hyperliquid"
                    ? "Agent/Wallet Address"
                    : "API Key"}
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            {/* Secret Key / Private Key Fields */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                {["aster", "hyperliquid", "lighter"].includes(exchangeType)
                  ? "Private Key / Secret"
                  : "Secret Key"}
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Aster Specific: User Address */}
            {exchangeType === "aster" && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  User Address (Main Wallet)
                </label>
                <input
                  type="text"
                  value={asterUser}
                  onChange={(e) => setAsterUser(e.target.value)}
                  className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            {/* Hyperliquid Specific: Wallet Header Address (Optional override) */}
            {exchangeType === "hyperliquid" && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Main Wallet Address (If different from Agent)
                </label>
                <input
                  type="text"
                  value={hyperliquidWalletAddr}
                  onChange={(e) => setHyperliquidWalletAddr(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            {/* Lighter Specific: API Key Index */}
            {exchangeType === "lighter" && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  API Key Index
                </label>
                <input
                  type="number"
                  value={lighterApiKeyIndex}
                  onChange={(e) =>
                    setLighterApiKeyIndex(parseInt(e.target.value) || 0)
                  }
                  className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            {/* Passphrase for OKX/Bitget */}
            {["okx", "bitget"].includes(exchangeType) && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full bg-[#161b22] border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="testnet"
              checked={isTestnet}
              onChange={(e) => setIsTestnet(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
            />
            <label
              htmlFor="testnet"
              className="text-xs text-slate-400 cursor-pointer select-none"
            >
              Connect to Testnet / Paper Trading
            </label>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3">
            <Shield className="text-amber-500 shrink-0" size={16} />
            <p className="text-[10px] text-amber-200/80 leading-relaxed">
              Keys are encrypted using AES-256 before storage. Ensure your API
              keys have "Enable Futures" permission but{" "}
              <strong>Disable Withdrawal</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-[#0d1017] flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!apiKey && !secretKey && exchangeType !== "lighter"}
            className="order-1 sm:order-2 px-8 py-3 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Save size={16} /> Connect Exchange
          </button>
        </div>
      </div>
    </div>
  );
}
