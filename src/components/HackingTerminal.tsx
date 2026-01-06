import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Terminal,
  ShieldAlert,
  Globe,
  Network,
  Lock,
  Eye,
  Zap,
  Server,
  Activity,
  Cpu,
  Users,
  Command,
  RefreshCw,
  Download,
  Send,
} from "lucide-react";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  toolLogs: { tool: string; output: string; timestamp: number }[];
  theme?: { hex: string; primary: string; border: string; bg: string };
}

interface C2Session {
  id: string;
  ip: string;
  lastSeen: number;
  pendingCommands: number;
  outputs: { timestamp: number; output: string }[];
}

const HackingTerminal: React.FC<Props> = ({ onClose, toolLogs, theme }) => {
  const themePrimary = theme?.primary || "text-green-500";
  const themeBorder = theme?.border || "border-green-500";
  const themeBg = theme?.bg || "bg-green-950/10";
  const themeHex = theme?.hex || "#22c55e";
  const [activeTab, setActiveTab] = useState<
    | "NMAP"
    | "METASPLOIT"
    | "PAYLOAD"
    | "BURP"
    | "WIRESHARK"
    | "JOHN"
    | "COBALT"
    | "HTTP_C2"
  >("NMAP");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  // Mobile sidebar states
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // C2 State
  const [sessions, setSessions] = useState<C2Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [c2Command, setC2Command] = useState("");
  const [isRefreshingC2, setIsRefreshingC2] = useState(false);

  // Sync global tool logs to this specific terminal if they match the active tab
  useEffect(() => {
    // Filter logs based on active tool context
    const relevantLogs = toolLogs.filter((l) => {
      if (activeTab === "NMAP" && l.tool === "runNmapScan") return true;
      if (activeTab === "METASPLOIT" && l.tool === "runMetasploitExploit")
        return true;
      if (activeTab === "PAYLOAD" && l.tool === "generatePayload") return true;
      if (activeTab === "BURP" && l.tool === "runBurpSuite") return true;
      if (activeTab === "WIRESHARK" && l.tool === "runWiresharkCapture")
        return true;
      if (activeTab === "JOHN" && l.tool === "runJohnRipper") return true;
      if (activeTab === "COBALT" && l.tool === "runCobaltStrike") return true;
      if (
        activeTab === "HTTP_C2" &&
        (l.tool === "generateHttpPayload" ||
          l.tool === "listC2Sessions" ||
          l.tool === "sendC2Command")
      )
        return true;
      return false;
    });

    if (relevantLogs.length > 0) {
      const lastLog = relevantLogs[relevantLogs.length - 1];
      // If C2 list command, don't just overwrite terminal, let the C2 UI handle it
      if (activeTab !== "HTTP_C2") {
        setTerminalOutput(lastLog.output.split("\n"));
      }
    } else if (activeTab !== "HTTP_C2") {
      setTerminalOutput([
        "> READY FOR INPUT...",
        "> AWAITING TARGET DESIGNATION.",
      ]);
    }
  }, [toolLogs, activeTab]);

  // C2 Polling
  useEffect(() => {
    let interval: any;
    if (activeTab === "HTTP_C2") {
      const fetchSessions = async () => {
        setIsRefreshingC2(true);
        try {
          const res = await fetch(apiUrl("/api/c2/sessions"));
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setSessions(data);
              // Auto-select first if none selected
              if (!selectedSessionId && data.length > 0) {
                setSelectedSessionId(data[0].id);
              }
            } else if (
              data &&
              typeof data.sessions === "object" &&
              data.sessions !== null
            ) {
              const sessionList = Array.isArray(data.sessions)
                ? data.sessions
                : Object.values(data.sessions);
              setSessions(sessionList as any[]);
              if (!selectedSessionId && sessionList.length > 0) {
                setSelectedSessionId((sessionList[0] as any).id);
              }
            } else {
              setSessions([]);
            }
          }
        } catch (e) {
          console.error("C2 Poll Failed");
        } finally {
          setIsRefreshingC2(false);
        }
      };
      fetchSessions();
      interval = setInterval(fetchSessions, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedSessionId]);

  const handleSendC2 = async () => {
    if (!selectedSessionId || !c2Command.trim()) return;
    try {
      await fetch(apiUrl("/api/c2/command"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          command: c2Command,
        }),
      });
      setC2Command("");
    } catch (e) {
      console.error("Send Command Failed", e);
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in zoom-in-95 duration-300 font-mono p-0 sm:p-4">
      <div
        className={`relative w-full h-full sm:w-[95%] sm:h-[90%] border-none sm:border ${themeBorder}/30 rounded-none sm:rounded-sm flex flex-col overflow-hidden bg-[#050505]`}
        style={{
          boxShadow: `0 0 50px ${themeHex}1a`,
        }}
      >
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] z-50 opacity-20"></div>

        {/* Header */}
        <div
          className={`h-14 sm:h-16 border-b ${themeBorder} ${themeBg} flex items-center justify-between px-3 sm:px-6 relative z-30 flex-shrink-0`}
        >
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <Terminal
              className={`${themePrimary} animate-pulse flex-shrink-0`}
              size={18}
            />
            <div className="overflow-hidden">
              <h2
                className={`text-sm sm:text-lg font-bold ${themePrimary} tracking-wider sm:tracking-[0.2em] truncate`}
              >
                RED TEAM
              </h2>
              <div
                className={`text-[9px] sm:text-[10px] ${themePrimary} flex gap-2 sm:gap-4 opacity-70 truncate`}
              >
                <span className="hidden xs:inline">OFFENSIVE</span>
                <span>ROOT</span>
                <span className="hidden sm:inline">SECURE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className={`lg:hidden p-2 ${themePrimary} opacity-70 hover:opacity-100 transition-all rounded hover:bg-white/5 flex-shrink-0`}
              title="Tools"
            >
              <Command size={18} />
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={`lg:hidden p-2 ${themePrimary} opacity-70 hover:opacity-100 transition-all rounded hover:bg-white/5 flex-shrink-0`}
              title="Visual Feed"
            >
              <Activity size={18} />
            </button>
            <button
              onClick={onClose}
              className={`relative z-50 p-2 ${themePrimary} opacity-70 hover:opacity-100 transition-all rounded-lg hover:bg-white/5 cursor-pointer active:scale-95 flex-shrink-0`}
            >
              <X size={20} className="sm:size-6" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar Tabs - Mobile Overlay / Desktop Sidebar */}
          <div
            className={`
                ${showLeftSidebar ? "fixed inset-y-0 left-0 z-40" : "hidden"}
                lg:relative lg:block
                w-64 border-r ${themeBorder} bg-[#020202] flex flex-col overflow-y-auto
                ${
                  showLeftSidebar
                    ? "animate-in slide-in-from-left duration-200"
                    : ""
                }
            `}
          >
            {[
              { id: "NMAP", label: "NMAP SCAN", icon: Network },
              { id: "METASPLOIT", label: "METASPLOIT", icon: ShieldAlert },
              { id: "PAYLOAD", label: "MSFVENOM", icon: Cpu },
              {
                id: "HTTP_C2",
                label: "PUPPET MASTER",
                icon: Users,
                highlight: true,
              },
              { id: "BURP", label: "BURP SUITE", icon: Globe },
              { id: "WIRESHARK", label: "WIRESHARK", icon: Activity },
              { id: "JOHN", label: "JOHN CRACKER", icon: Lock },
              { id: "COBALT", label: "COBALT STRIKE", icon: Zap },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setShowLeftSidebar(false);
                }}
                className={`p-3 sm:p-4 text-xs font-bold tracking-widest flex items-center gap-3 transition-all border-l-2 text-left 
                            ${
                              activeTab === tab.id
                                ? tab.highlight
                                  ? "bg-red-900/20 text-red-500 border-red-500"
                                  : `${themeBg} ${themePrimary} ${themeBorder}`
                                : tab.highlight
                                ? "text-red-800 border-transparent hover:text-red-600 hover:bg-red-900/10"
                                : `${themePrimary} opacity-70 border-transparent hover:opacity-100 hover:${themeBg}`
                            }`}
              >
                <tab.icon size={16} />{" "}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}

            <div
              className={`mt-auto p-3 sm:p-4 border-t ${themeBorder} text-[9px] sm:text-[10px] ${themePrimary} text-center opacity-70`}
            >
              AUTHORIZED USE ONLY
              <br />
              ETHICAL BOUNDARIES
            </div>
          </div>

          {/* Mobile Sidebar Backdrop */}
          {showLeftSidebar && (
            <div
              className="lg:hidden fixed inset-0 bg-black/80 z-30"
              onClick={() => setShowLeftSidebar(false)}
            />
          )}

          {/* Main Terminal View */}
          <div className="flex-1 flex flex-col relative">
            {activeTab === "HTTP_C2" ? (
              <div className="flex-1 flex flex-col bg-[#080808]">
                <div className="h-12 bg-red-950/20 border-b border-red-900/50 flex items-center justify-between px-4 text-red-500">
                  <div className="flex items-center gap-4">
                    <span className="font-bold flex items-center gap-2">
                      <Users size={16} /> C2 SESSIONS (ZOMBIES)
                    </span>
                    <span className="text-xs opacity-60">
                      {sessions.length} ONLINE
                    </span>
                  </div>
                  {isRefreshingC2 && (
                    <RefreshCw size={14} className="animate-spin" />
                  )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Session List */}
                  <div className="w-1/3 border-r border-red-900/30 overflow-y-auto">
                    {sessions.length === 0 && (
                      <div className="p-4 text-xs text-red-900 italic text-center">
                        No active sessions.
                        <br />
                        Deploy payload to connect.
                      </div>
                    )}
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`p-3 border-b border-red-900/20 cursor-pointer hover:bg-red-900/10 transition-colors ${
                          selectedSessionId === s.id
                            ? "bg-red-900/20 border-l-2 border-l-red-500"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div
                            className="text-xs font-bold text-red-400 truncate max-w-[150px]"
                            title={s.id}
                          >
                            {s.id}
                          </div>
                          <div className="text-[9px] text-red-800">
                            {new Date(s.lastSeen).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-red-600/60 font-mono">
                          <span>{s.ip}</span>
                          <span>Q: {s.pendingCommands}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Console */}
                  <div className="flex-1 flex flex-col bg-black relative">
                    {selectedSession ? (
                      <>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-500 space-y-2">
                          <div className="text-slate-600 italic">
                            -- Session {selectedSession.id} Established --
                          </div>
                          {selectedSession.outputs.map((o, i) => (
                            <div key={i}>
                              <div className="text-[10px] text-slate-700 mb-0.5">
                                [{new Date(o.timestamp).toLocaleTimeString()}]
                                OUTPUT:
                              </div>
                              <div className="whitespace-pre-wrap break-all text-slate-300 bg-slate-900/30 p-2 border border-slate-800 rounded">
                                {o.output}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-2 bg-slate-900 border-t border-red-900/30 flex gap-2">
                          <input
                            className="flex-1 bg-black border border-red-900/50 text-red-500 font-mono text-xs px-3 py-2 focus:outline-none focus:border-red-500"
                            placeholder="Enter shell command..."
                            value={c2Command}
                            onChange={(e) => setC2Command(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSendC2()
                            }
                          />
                          <button
                            onClick={handleSendC2}
                            className="bg-red-900/20 text-red-500 border border-red-900/50 px-4 hover:bg-red-500 hover:text-black transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-red-900 text-xs font-mono">
                        SELECT A ZOMBIE SESSION TO INTERACT
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Tab Header Info */}
                <div className="h-10 bg-green-900/10 border-b border-green-900 flex items-center px-4 text-xs text-green-600">
                  <span className="mr-4 font-bold">TOOL: {activeTab}</span>
                  <span className="mr-4">|</span>
                  <span className="mr-4">
                    STATUS: {terminalOutput.length > 2 ? "ACTIVE" : "IDLE"}
                  </span>
                  <span className="ml-auto">CORE LINK: STABLE</span>
                </div>

                {/* Terminal Output */}
                <div className="flex-1 bg-black p-6 overflow-y-auto font-mono text-xs text-green-500 shadow-inner">
                  {terminalOutput.map((line, i) => (
                    <div
                      key={i}
                      className="mb-1 whitespace-pre-wrap break-all hover:bg-white/5"
                    >
                      <span className="opacity-50 mr-2 select-none">$</span>
                      {line}
                    </div>
                  ))}
                  {/* Blinking Cursor */}
                  <div className="mt-2 w-2 h-4 bg-green-500 animate-pulse"></div>
                </div>

                {/* Input Placeholder */}
                <div className="h-12 border-t border-green-900 bg-[#080808] flex items-center px-4">
                  <span className="text-green-700 font-bold mr-2">{">"}</span>
                  <input
                    type="text"
                    readOnly
                    placeholder="AI AGENT CONTROLLED // ENTER COMMAND VIA VOICE OR CHAT..."
                    className="flex-1 bg-transparent border-none outline-none text-green-800 text-xs font-mono"
                  />
                </div>
              </>
            )}
          </div>

          {/* Right Panel: Visualizer - Mobile Overlay / Desktop Panel */}
          <div
            className={`
                ${showRightPanel ? "fixed inset-y-0 right-0 z-40" : "hidden"}
                lg:relative lg:block
                w-80 border-l border-green-900 bg-[#030303] flex flex-col p-3 sm:p-4
                ${
                  showRightPanel
                    ? "animate-in slide-in-from-right duration-200"
                    : ""
                }
            `}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs font-bold text-green-600 border-b border-green-900 pb-2 flex-1">
                VISUAL FEED
              </h3>
              <button
                onClick={() => setShowRightPanel(false)}
                className="lg:hidden text-green-600 hover:text-green-400 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 relative border border-green-900/30 bg-green-900/5 rounded overflow-hidden">
              {/* NMAP GRAPH */}
              {activeTab === "NMAP" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-green-500/20 rounded-full flex items-center justify-center relative animate-spin-slow">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute top-0 w-px h-12 sm:h-16 bg-green-500/50"></div>
                  </div>
                  <div className="absolute top-10 left-10 text-[8px] text-green-700">
                    PORT 80
                  </div>
                  <div className="absolute bottom-10 right-10 text-[8px] text-green-700">
                    PORT 443
                  </div>
                </div>
              )}

              {/* HTTP C2 MAP */}
              {activeTab === "HTTP_C2" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500">
                  <Network size={48} className="sm:size-16 opacity-50" />
                  <div className="text-[9px] mt-4 text-red-700 animate-pulse text-center">
                    C2 ACTIVE
                    <br />
                    PORT 3001
                  </div>
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,rgba(220,38,38,0.1)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                </div>
              )}

              {/* WIRESHARK PACKET STREAM */}
              {activeTab === "WIRESHARK" && (
                <div className="absolute inset-0 p-2 space-y-1 overflow-hidden">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 bg-green-900/40 w-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-green-500 animate-scan"
                        style={{
                          width: Math.random() * 100 + "%",
                          animationDuration: Math.random() + "s",
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              )}

              {/* METASPLOIT TARGET */}
              {activeTab === "METASPLOIT" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldAlert
                    size={48}
                    className="sm:size-16 text-green-900 opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 border border-green-500 rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>
              )}

              {/* PAYLOAD GEN */}
              {activeTab === "PAYLOAD" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Cpu
                    size={40}
                    className="sm:size-12 text-green-500 animate-pulse"
                  />
                  <div className="w-24 h-2 sm:w-32 bg-green-900 rounded overflow-hidden">
                    <div className="h-full bg-green-500 animate-[marquee_1s_linear_infinite]"></div>
                  </div>
                  <div className="text-[9px] text-green-700">COMPILING...</div>
                </div>
              )}

              {/* DEFAULT GENERIC */}
              {(activeTab === "BURP" ||
                activeTab === "JOHN" ||
                activeTab === "COBALT") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-green-900">
                  <Activity size={40} className="sm:size-12 animate-pulse" />
                  <div className="mt-2 text-[9px]">ACTIVE</div>
                </div>
              )}
            </div>

            <div className="h-1/3 mt-3 sm:mt-4 border-t border-green-900 pt-2">
              <div className="text-[9px] text-green-800 font-mono space-y-1">
                <div>CPU: {Math.floor(Math.random() * 30 + 10)}%</div>
                <div>MEM: {Math.floor(Math.random() * 40 + 20)}%</div>
                <div>NET: {Math.floor(Math.random() * 500)} KB/s</div>
                <div className="truncate">PROXY: 127.0.0.1:9050</div>
              </div>
            </div>
          </div>

          {/* Mobile Right Panel Backdrop */}
          {showRightPanel && (
            <div
              className="lg:hidden fixed inset-0 bg-black/80 z-30"
              onClick={() => setShowRightPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HackingTerminal;
