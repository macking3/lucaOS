import React, { useEffect, useState, useCallback } from "react";
import {
  Plug,
  Plus,
  Trash2,
  RefreshCw,
  Terminal,
  Globe,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
  Settings,
} from "lucide-react";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl } from "../../config/api";

interface MCPServer {
  id: string;
  name: string;
  type: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
  autoConnect: boolean;
  status?: "connected" | "disconnected" | "error";
  toolCount?: number;
}

interface SettingsMCPTabProps {
  settings: LucaSettings;
  theme: {
    primary: string;
    hex: string;
  };
  setStatusMsg: (msg: string) => void;
}

const SettingsMCPTab: React.FC<SettingsMCPTabProps> = ({
  settings: _settings, // Reserved for future use
  theme,
  setStatusMsg,
}) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, any[]>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "stdio" as "stdio" | "sse",
    command: "",
    args: "",
    url: "",
    autoConnect: true,
  });

  // Environment variables state
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch servers on mount
  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/mcp/list"));
      const data = await res.json();
      setServers(data.servers || []);
    } catch (e) {
      console.error("[MCP] Failed to fetch servers:", e);
    }
  }, []);

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchServers]);

  // Connect new server
  const handleAddServer = async () => {
    if (!formData.name) {
      setStatusMsg("Server name is required");
      return;
    }

    if (formData.type === "stdio" && !formData.command) {
      setStatusMsg("Command is required for STDIO servers");
      return;
    }

    if (formData.type === "sse" && !formData.url) {
      setStatusMsg("URL is required for SSE servers");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/mcp/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          command: formData.type === "stdio" ? formData.command : undefined,
          args:
            formData.type === "stdio"
              ? formData.args.split(" ").filter((a) => a.trim())
              : undefined,
          url: formData.type === "sse" ? formData.url : undefined,
          env: envVars.reduce((acc, { key, value }) => {
            if (key.trim()) acc[key.trim()] = value;
            return acc;
          }, {} as Record<string, string>),
          autoConnect: formData.autoConnect,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setStatusMsg(`Error: ${data.error}`);
      } else {
        setStatusMsg(`Connected to ${formData.name}!`);
        setShowAddForm(false);
        setFormData({
          name: "",
          type: "stdio",
          command: "",
          args: "",
          url: "",
          autoConnect: true,
        });
        setEnvVars([]);
        setShowAdvanced(false);
        fetchServers();
      }
    } catch (e: any) {
      setStatusMsg(`Failed to connect: ${e.message}`);
    }
    setLoading(false);
  };

  // Remove server
  const handleRemoveServer = async (id: string) => {
    setLoading(true);
    try {
      await fetch(apiUrl("/api/mcp/remove"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setStatusMsg("Server removed");
      fetchServers();
    } catch (e: any) {
      setStatusMsg(`Failed to remove: ${e.message}`);
    }
    setLoading(false);
  };

  // Sync all
  const handleSync = async () => {
    setLoading(true);
    try {
      await fetch(apiUrl("/api/mcp/sync"), { method: "POST" });
      setStatusMsg("Reconnected all servers");
      fetchServers();
    } catch (e: any) {
      setStatusMsg(`Sync failed: ${e.message}`);
    }
    setLoading(false);
  };

  // Load tools for expanded server
  const loadServerTools = async (serverId: string) => {
    try {
      const res = await fetch(apiUrl("/api/mcp/tools"));
      const data = await res.json();
      const tools = (data.tools || []).filter(
        (t: any) => t.sourceUrl === serverId || t.serverInfo?.url === serverId
      );
      setServerTools((prev) => ({ ...prev, [serverId]: tools }));
    } catch (e) {
      console.error("[MCP] Failed to load tools:", e);
    }
  };

  const toggleExpand = (serverId: string) => {
    if (expandedServer === serverId) {
      setExpandedServer(null);
    } else {
      setExpandedServer(serverId);
      if (!serverTools[serverId]) {
        loadServerTools(serverId);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Box */}
      <div
        className="text-xs p-3 rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: `${theme.hex}0d`,
          borderColor: `${theme.hex}33`,
          color: "#9ca3af",
        }}
      >
        <strong style={{ color: theme.hex }}>MCP Integration:</strong> Connect
        external tools via the Model Context Protocol (Claude Skills, etc.).
        These tools become available to Luca for execution.
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all hover:bg-white/10"
          style={{ borderColor: theme.hex, color: theme.hex }}
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
        <button
          onClick={handleSync}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reconnect All
        </button>
      </div>

      {/* Add Server Form */}
      {showAddForm && (
        <div
          className="p-4 rounded-xl border backdrop-blur-sm space-y-4"
          style={{
            backgroundColor: `${theme.hex}0a`,
            borderColor: `${theme.hex}33`,
          }}
        >
          <h4
            className="text-sm font-bold flex items-center gap-2"
            style={{ color: theme.hex }}
          >
            <Plug className="w-4 h-4" />
            New MCP Server
          </h4>

          {/* Server Name */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
              Server Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. filesystem, github"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1"
              style={{ focusRing: theme.hex } as any}
            />
          </div>

          {/* Transport Type */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
              Transport Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormData((p) => ({ ...p, type: "stdio" }))}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                  formData.type === "stdio"
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-gray-500 hover:text-white"
                }`}
                style={
                  formData.type === "stdio"
                    ? { borderColor: theme.hex, color: theme.hex }
                    : {}
                }
              >
                <Terminal className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">STDIO</span>
              </button>
              <button
                onClick={() => setFormData((p) => ({ ...p, type: "sse" }))}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                  formData.type === "sse"
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-gray-500 hover:text-white"
                }`}
                style={
                  formData.type === "sse"
                    ? { borderColor: theme.hex, color: theme.hex }
                    : {}
                }
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">SSE</span>
              </button>
            </div>
          </div>

          {/* STDIO Fields */}
          {formData.type === "stdio" && (
            <>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                  Command
                </label>
                <input
                  type="text"
                  value={formData.command}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, command: e.target.value }))
                  }
                  placeholder="e.g. npx, python3, node"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                  Arguments (space-separated)
                </label>
                <input
                  type="text"
                  value={formData.args}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, args: e.target.value }))
                  }
                  placeholder="e.g. -y @modelcontextprotocol/server-filesystem /tmp"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* SSE Fields */}
          {formData.type === "sse" && (
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                Server URL
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="e.g. https://mcp-server.example.com"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
          )}

          {/* Auto Connect Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Auto-connect on startup
            </span>
            <button
              onClick={() =>
                setFormData((p) => ({ ...p, autoConnect: !p.autoConnect }))
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${
                formData.autoConnect ? "bg-green-500/30" : "bg-white/10"
              }`}
              style={
                formData.autoConnect
                  ? { backgroundColor: `${theme.hex}40` }
                  : {}
              }
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  formData.autoConnect
                    ? "left-5 bg-green-400"
                    : "left-0.5 bg-gray-500"
                }`}
                style={
                  formData.autoConnect ? { backgroundColor: theme.hex } : {}
                }
              />
            </button>
          </div>

          {/* Advanced Section (Env Variables) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Settings className="w-3 h-3" />
              Advanced
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                    Environment Variables
                  </label>
                  <p className="text-[10px] text-gray-600 mb-2">
                    Pass secrets like API keys to the MCP server (e.g.,
                    GITHUB_TOKEN)
                  </p>

                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={env.key}
                        onChange={(e) => {
                          const updated = [...envVars];
                          updated[idx].key = e.target.value;
                          setEnvVars(updated);
                        }}
                        placeholder="KEY"
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
                      />
                      <input
                        type="password"
                        value={env.value}
                        onChange={(e) => {
                          const updated = [...envVars];
                          updated[idx].value = e.target.value;
                          setEnvVars(updated);
                        }}
                        placeholder="value"
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEnvVars(envVars.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setEnvVars([...envVars, { key: "", value: "" }])
                    }
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <Plus className="w-3 h-3" />
                    Add Variable
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleAddServer}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              borderColor: theme.hex,
              backgroundColor: `${theme.hex}20`,
              color: theme.hex,
            }}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            Connect Server
          </button>
        </div>
      )}

      {/* Server List */}
      <div className="space-y-3">
        {servers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <Plug className="w-8 h-8 mx-auto mb-3 opacity-30" />
            No MCP servers configured.
            <br />
            <span className="text-xs">
              Click &quot;Add Server&quot; to get started.
            </span>
          </div>
        ) : (
          servers.map((server) => {
            const isConnected = server.status === "connected";
            const isExpanded = expandedServer === server.id;

            return (
              <div
                key={server.id}
                className="border rounded-xl overflow-hidden transition-all"
                style={{
                  borderColor: isConnected
                    ? `${theme.hex}40`
                    : "rgba(255,255,255,0.1)",
                  backgroundColor: isConnected
                    ? `${theme.hex}08`
                    : "rgba(255,255,255,0.02)",
                }}
              >
                {/* Server Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpand(server.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        server.type === "stdio"
                          ? "bg-purple-500/20"
                          : "bg-blue-500/20"
                      }`}
                    >
                      {server.type === "stdio" ? (
                        <Terminal className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Globe className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-200 truncate">
                        {server.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate">
                        {server.type === "stdio"
                          ? `${server.command} ${(server.args || []).join(" ")}`
                          : server.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                        isConnected
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {isConnected ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {isConnected ? "ONLINE" : "OFFLINE"}
                    </div>

                    {/* Tool Count */}
                    {isConnected && server.toolCount !== undefined && (
                      <div className="text-[10px] text-gray-500 hidden sm:block">
                        {server.toolCount} tools
                      </div>
                    )}

                    {/* Expand Arrow */}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 pt-0 space-y-3"
                    style={{ borderTop: `1px solid ${theme.hex}1a` }}
                  >
                    {/* Tools List */}
                    <div>
                      <h5 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        Available Tools
                      </h5>
                      {serverTools[server.id] ? (
                        serverTools[server.id].length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {serverTools[server.id].map((tool: any) => (
                              <span
                                key={tool.name}
                                className="px-2 py-1 rounded-md text-[10px] bg-white/5 text-gray-400 border border-white/10"
                              >
                                {tool.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500">
                            No tools found
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          Loading...
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveServer(server.id);
                        }}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SettingsMCPTab;
