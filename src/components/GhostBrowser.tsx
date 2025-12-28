import React, { useEffect, useRef, useState } from "react";
import {
  X,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Home,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Brain,
  Target,
} from "lucide-react";
import { apiUrl } from "../config/api";

interface Props {
  url: string;
  title?: string;
  onClose: () => void;
  onNavigate?: (url: string) => void;
  sessionId?: string; // Optional: Web Navigator session ID for agent overlay
  mode?: "STANDALONE" | "EMBEDDED"; // NEW: Support embedded mode
}

// Electron webview type declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.WebViewHTMLAttributes<HTMLWebViewElement>,
        HTMLWebViewElement
      >;
    }
  }
}

const GhostBrowser: React.FC<Props> = ({
  url,
  title = "Ghost Browser",
  onClose,
  onNavigate,
  sessionId,
  mode = "STANDALONE",
}) => {
  const webviewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Agent overlay state
  const [agentState, setAgentState] = useState<any>(null);
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);
  const [isAgentPaused, setIsAgentPaused] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<number | null>(
    null
  );

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidStartLoading = () => {
      setIsLoading(true);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
    };

    const handleDidNavigate = (e: any) => {
      setCurrentUrl(e.url);
      setCanGoBack(webview.canGoBack ? webview.canGoBack() : false);
      setCanGoForward(webview.canGoForward ? webview.canGoForward() : false);
      if (onNavigate) {
        onNavigate(e.url);
      }
    };

    const handleDidFailLoad = (e: any) => {
      console.error("Webview load failed:", e);
      setIsLoading(false);
    };

    webview.addEventListener("did-start-loading", handleDidStartLoading);
    webview.addEventListener("did-stop-loading", handleDidStopLoading);
    webview.addEventListener("did-navigate", handleDidNavigate);
    webview.addEventListener("did-fail-load", handleDidFailLoad);

    // Update navigation state periodically
    const navInterval = setInterval(() => {
      if (webview && typeof webview.canGoBack === "function") {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      }
    }, 500);

    return () => {
      webview.removeEventListener("did-start-loading", handleDidStartLoading);
      webview.removeEventListener("did-stop-loading", handleDidStopLoading);
      webview.removeEventListener("did-navigate", handleDidNavigate);
      webview.removeEventListener("did-fail-load", handleDidFailLoad);
      clearInterval(navInterval);
    };
  }, [onNavigate]);

  // Agent state polling (if sessionId provided)
  useEffect(() => {
    if (!sessionId) return;

    const fetchAgentState = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/web/state?sessionId=${sessionId}`)
        );

        if (res.status === 404) {
          // Session expired or invalid on server
          // Stop polling to prevent console spam
          clearInterval(interval);
          return;
        }

        const data = await res.json();
        if (data.state) {
          setAgentState(data.state);
          setShowAgentOverlay(true);

          // Highlight element if agent is about to interact with it
          if (data.state.agentData?.actionInput?.index !== undefined) {
            setHighlightedElement(data.state.agentData.actionInput.index);
            setTimeout(() => setHighlightedElement(null), 2000);
          }
        }
      } catch (error) {
        // console.error("[GhostBrowser] Failed to fetch agent state:", error);
        // Suppress error log for cleaner console
      }
    };

    // Initial fetch
    fetchAgentState();

    // Poll every 2 seconds
    const interval = setInterval(fetchAgentState, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleGoBack = () => {
    webviewRef.current?.goBack();
  };

  const handleGoForward = () => {
    webviewRef.current?.goForward();
  };

  const handleRefresh = () => {
    webviewRef.current?.reload();
  };

  const handleGoHome = () => {
    webviewRef.current?.loadURL(url);
  };

  const handleOpenExternal = () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      (window as any).electron.shell.openExternal(currentUrl);
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 top-14 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 font-mono ${
        isMaximized ? "p-0" : "p-2 sm:p-4"
      }`}
    >
      <div className="relative w-full h-full bg-[#0d0d0d] flex flex-col overflow-hidden border border-cyan-500/30 shadow-2xl rounded-lg">
        {/* Header Bar - Hide in EMBEDDED mode */}
        {mode === "STANDALONE" && (
          <div className="h-14 border-b border-cyan-900/50 bg-cyan-950/10 flex items-center justify-between px-4 z-10 drag-handle">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={handleGoForward}
                  disabled={!canGoForward}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Go Forward"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw
                    size={16}
                    className={isLoading ? "animate-spin" : ""}
                  />
                </button>
                <button
                  onClick={handleGoHome}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title="Home"
                >
                  <Home size={16} />
                </button>
              </div>

              {/* URL Bar */}
              <div className="flex-1 mx-4 min-w-0">
                <div className="bg-black/40 border border-cyan-900/30 rounded px-3 py-1.5 flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isLoading ? "bg-cyan-500 animate-pulse" : "bg-green-500"
                    }`}
                  ></div>
                  <input
                    type="text"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        webviewRef.current?.loadURL(currentUrl);
                      }
                    }}
                    className="flex-1 bg-transparent text-xs text-white outline-none font-mono"
                    placeholder="Enter URL..."
                  />
                </div>
              </div>

              {/* Title */}
              <div className="text-xs text-cyan-400 font-bold tracking-widest truncate max-w-[200px]">
                {title}
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenExternal}
                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Open in External Browser"
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={handleMaximize}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Webview Container */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-cyan-400 text-sm font-mono">
                  LOADING...
                </div>
              </div>
            </div>
          )}

          {/* Agent Overlay for Browser */}
          {showAgentOverlay && agentState && (
            <div className="absolute inset-0 pointer-events-none z-50">
              {/* Box Overlay for Highlighted Element */}
              {highlightedElement !== null && (
                <div className="absolute inset-0 bg-transparent">
                  {/* Note: In a real implementation, we would need coordinates. 
                      For now, we just show a general indicator. */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-cyan-500/90 text-black px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-bounce">
                    Targeting Element #{highlightedElement}
                  </div>
                </div>
              )}

              {/* Agent Thought Bubble */}
              {agentState.reasoning && (
                <div className="absolute bottom-8 left-8 right-8 bg-black/80 border border-purple-500/50 p-4 rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto max-h-[30vh] overflow-y-auto">
                  <div className="flex items-start gap-3">
                    <Brain
                      className="text-purple-400 shrink-0 mt-1"
                      size={20}
                    />
                    <div className="flex-1">
                      <h4 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">
                        Agent Reasoning
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {agentState.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Electron Webview */}
          <webview
            ref={webviewRef}
            src={url}
            style={{ width: "100%", height: "100%" }}
            allowpopups={true}
            webpreferences="nodeIntegration=no,contextIsolation=yes"
          />
        </div>

        {/* Status Bar */}
        <div className="h-6 border-t border-cyan-900/30 bg-[#080808] px-4 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            <span>GHOST_BROWSER</span>
            <span className="text-cyan-400">ACTIVE</span>
            {sessionId && (
              <>
                <span className="text-cyan-500">|</span>
                <span className="text-cyan-400">AGENT_MODE</span>
                {agentState && (
                  <span className="text-slate-400">
                    STEP {agentState.iteration}/{agentState.maxIterations}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>ENGINE: ELECTRON_WEBVIEW</span>
            <span>MODE: {mode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GhostBrowser;
