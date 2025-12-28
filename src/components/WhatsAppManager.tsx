import React, { useEffect, useState } from "react";
import {
  X,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  User,
  Send,
  LogOut,
  Wifi,
  Phone,
  Video,
  Paperclip,
} from "lucide-react";
import QRCode from "qrcode";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const WhatsAppManager: React.FC<Props> = ({ onClose, theme }) => {
  const themePrimary = theme?.primary || "text-emerald-500";
  const themeBorder = theme?.border || "border-emerald-500";
  const themeBg = theme?.bg || "bg-emerald-950/10";
  const themeHex = theme?.hex || "#10b981";
  const [status, setStatus] = useState("INIT");
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const [uptime, setUptime] = useState("--:--:--");
  const [messageCount, setMessageCount] = useState<number | null>(null);

  // Poll status
  useEffect(() => {
    // Try to start the client if not running (Lazy Load)
    startWhatsApp();

    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    if (!ms || ms <= 0) return "--:--:--";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const startWhatsApp = async () => {
    try {
      await fetch(apiUrl("/api/whatsapp/start"), {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to start WhatsApp service");
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/whatsapp/status"));
      const data = await res.json();
      setStatus(data.status);

      if (data.uptime) setUptime(formatUptime(data.uptime));
      if (data.messageCount !== undefined) setMessageCount(data.messageCount);

      if (data.status === "SCAN_QR" && data.qr) {
        setQrData(data.qr);
        QRCode.toDataURL(data.qr, {
          margin: 2,
          scale: 5,
          color: { dark: themeHex, light: "#000000" },
        }).then((url: string) => setQrImage(url));
      } else {
        setQrData(null);
        setQrImage(null);
      }

      if (
        (data.status === "READY" || data.status === "AUTHENTICATED") &&
        chats.length === 0
      ) {
        fetchChats();
      }
    } catch (e) {
      setStatus("ERROR_OFFLINE");
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/whatsapp/chats"));
      const data = await res.json();
      if (data.chats && Array.isArray(data.chats)) {
        setChats(data.chats);
      } else if (Array.isArray(data)) {
        setChats(data);
      } else {
        setChats([]);
      }
    } catch (e) {
      console.error("Failed to fetch chats");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (
      confirm(
        "Are you sure you want to disconnect the current WhatsApp session?"
      )
    ) {
      try {
        await fetch(apiUrl("/api/whatsapp/logout"), {
          method: "POST",
        });
        setStatus("INIT");
        setQrImage(null);
        setChats([]);
      } catch (e) {
        alert("Logout failed");
      }
    }
  };

  const sendMessage = () => {
    if (input.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: "me",
        text: input,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages([...messages, newMessage]);
      setInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
      <div
        className={`w-full h-auto min-h-[50vh] max-h-[90vh] sm:w-[95%] sm:h-[85vh] max-w-5xl bg-black/60 backdrop-blur-xl border ${themeBorder}/30 rounded-none sm:rounded-lg flex flex-col sm:flex-row overflow-hidden relative my-auto sm:my-0`}
        style={{
          boxShadow: `0 0 50px ${themeHex}1a`,
        }}
      >
        {/* Header */}
        <div
          className={`h-16 border-b ${themeBorder}/50 ${themeBg} flex items-center justify-between px-6 absolute top-0 left-0 right-0 z-50`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="sm:hidden p-2 hover:bg-white/5 rounded text-slate-400"
            >
              <MessageSquare size={20} />
            </button>
            <div
              className={`p-2 hidden sm:block ${themeBg} rounded border ${themeBorder}/50 ${themePrimary}`}
            >
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-widest leading-none sm:leading-normal">
                NEURAL LINK
              </h2>
              <div
                className={`text-[9px] sm:text-[10px] font-mono ${themePrimary} flex gap-2 sm:gap-4`}
              >
                <span className="hidden xs:inline">WHATSAPP GATEWAY</span>
                <span>STATUS: {status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row w-full h-full pt-16 relative">
          {/* Left Panel: Connection & Status */}
          <div
            className={`
              absolute inset-0 z-[60] sm:relative sm:inset-auto sm:z-auto
              w-full sm:w-80 bg-black/95 sm:bg-black/40 border-r ${themeBorder}/30 
              flex flex-col transition-transform duration-300
              ${
                showMobileSidebar
                  ? "translate-x-0"
                  : "-translate-x-full sm:translate-x-0"
              }
            `}
          >
            <div className={`p-6 border-b ${themeBorder}/30`}>
              <div className={`flex items-center gap-3 ${themePrimary} mb-4`}>
                <div
                  className={`p-2 border ${themeBorder}/30 ${themeBg} rounded`}
                >
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-widest">
                    NEURAL LINK
                  </h2>
                  <p
                    className={`text-[10px] font-mono ${themePrimary} opacity-60`}
                  >
                    WHATSAPP GATEWAY
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className={`p-4 bg-black border ${themeBorder}/30 rounded flex flex-col items-center justify-center text-center`}
                >
                  {status === "READY" || status === "AUTHENTICATED" ? (
                    <>
                      <div
                        className={`w-16 h-16 rounded-full ${themeBg} flex items-center justify-center mb-2 animate-pulse`}
                      >
                        <Wifi size={32} className={themePrimary} />
                      </div>
                      <div className={`${themePrimary} font-bold text-sm`}>
                        LINK ESTABLISHED
                      </div>
                      <div className="text-[10px] text-slate-500">
                        End-to-End Encrypted
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-32 bg-white p-2 mb-2">
                        {qrImage ? (
                          <img
                            src={qrImage}
                            alt="QR Code"
                            className="w-full h-full object-contain rendering-pixelated"
                          />
                        ) : (
                          <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Loading...')] bg-cover rendering-pixelated opacity-80"></div>
                        )}
                      </div>
                      <div className="text-slate-400 text-xs animate-pulse">
                        SCAN TO AUTHENTICATE
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>UPTIME</span>
                    <span className={themePrimary}>{uptime}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>MESSAGES</span>
                    <span className={themePrimary}>
                      {messageCount !== null
                        ? messageCount.toLocaleString()
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>LATENCY</span>
                    <span className={themePrimary}>--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="p-2 sm:hidden flex justify-between items-center border-b border-white/10 mb-2">
                <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                  Select Chat
                </span>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              {chats.length > 0 ? (
                chats.map((chat, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (window.innerWidth < 640) setShowMobileSidebar(false);
                      // In a full implementation, you'd select the chat here
                    }}
                    className="p-3 hover:bg-white/5 rounded cursor-pointer flex items-center gap-3 mb-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                      {chat.name ? chat.name[0] : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 font-bold truncate">
                        {chat.name || chat.id.user}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Last seen today...
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-slate-500 text-sm">
                  No chats available.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Interface */}
          <div className="flex-1 bg-[#050505] flex flex-col relative min-h-[400px] sm:min-h-0">
            {/* Chat Header */}
            <div
              className={`h-16 border-b ${themeBorder}/30 flex items-center px-6 justify-between bg-[#080808]`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${themeBg} border ${themeBorder}/30 flex items-center justify-center`}
                >
                  <User size={16} className={themePrimary} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">OPERATOR</div>
                  <div
                    className={`text-[10px] ${themePrimary} flex items-center gap-1`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        status === "READY"
                          ? `${themePrimary.replace(
                              "text-",
                              "bg-"
                            )} animate-pulse`
                          : "bg-slate-500"
                      }`}
                    ></span>{" "}
                    {status === "READY" ? "ONLINE" : "OFFLINE"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-white/5 rounded text-slate-500">
                  <Phone size={16} />
                </button>
                <button className="p-2 hover:bg-white/5 rounded text-slate-500">
                  <Video size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      msg.sender === "me"
                        ? `${themeBg} border ${themeBorder}/30 text-green-100 rounded-tr-none`
                        : "bg-slate-900/50 border border-slate-700 text-slate-300 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        msg.sender === "me"
                          ? `${themePrimary} opacity-50`
                          : "text-slate-500"
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className={`p-4 bg-[#080808] border-t ${themeBorder}/30`}>
              <div className="flex items-center gap-2 bg-black border border-slate-800 rounded-full px-4 py-2">
                <button
                  className={`text-slate-500 hover:${themePrimary.replace(
                    "text-",
                    ""
                  )}`}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-600"
                />
                <button onClick={sendMessage} className={themePrimary}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManager;
