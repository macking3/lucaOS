import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  RefreshCw,
  Settings,
  Cpu,
  Mic,
  Home,
  Link,
  Database,
  Info,
  Shield,
  ArrowLeft,
  Wifi,
} from "lucide-react";
import { settingsService, LucaSettings } from "../services/settingsService";
import { useMobile } from "../hooks/useMobile";
import { CredentialVault } from "../services/credentialVault";
import { memoryService } from "../services/memoryService";
import { PERSONA_UI_CONFIG, PersonaType } from "../services/lucaService";

// Import Refactored Tabs
import SettingsGeneralTab from "./settings/SettingsGeneralTab";
import SettingsBrainTab from "./settings/SettingsBrainTab";
import SettingsVoiceTab from "./settings/SettingsVoiceTab";
import SettingsAdminTab from "./settings/SettingsAdminTab";
import SettingsIoTTab from "./settings/SettingsIoTTab";
import SettingsConnectorsTab from "./settings/SettingsConnectorsTab";
import SettingsNeuralLinkTab from "./settings/SettingsNeuralLinkTab";
import SettingsDataTab from "./settings/SettingsDataTab";
import SettingsAboutTab from "./settings/SettingsAboutTab";
import OperatorProfilePanel from "./settings/OperatorProfilePanel";
import PersonalityDashboard from "./settings/PersonalityDashboard";

// Initialize Vault
const vault = new CredentialVault();

interface SettingsModalProps {
  onClose: () => void;
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
    coreColor: string;
    hex: string;
  };
}

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "brain", label: "Brain", icon: Cpu },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "profile", label: "Profile", icon: Settings },
  { id: "personality", label: "Personality", icon: Settings },
  { id: "neurallink", label: "Neural Link", icon: Wifi },
  { id: "admin", label: "Admin Registry", icon: Shield },
  { id: "iot", label: "Smart Home", icon: Home },
  { id: "connectors", label: "Connectors", icon: Link },
  { id: "data", label: "Data & Memory", icon: Database },
  { id: "about", label: "About", icon: Info },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<LucaSettings>(
    settingsService.getSettings()
  );
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Connectors State
  const [connectors, setConnectors] = useState<
    { site: string; username: string; linked: boolean }[]
  >([]);

  // Memory Stats
  const [memoryStats, setMemoryStats] = useState({ count: 0 });
  const isMobile = useMobile();

  useEffect(() => {
    // Load initial data
    loadConnectors();
    loadMemoryStats();
  }, []);

  const loadConnectors = async () => {
    const sites = ["spotify", "github", "brave", "klavis"]; // Supported Connectors
    const list = await Promise.all(
      sites.map(async (site) => {
        const hasCreds = await vault.hasCredentials(site);
        return { site, username: "API Key", linked: hasCreds };
      })
    );
    setConnectors(list);
  };

  const loadMemoryStats = () => {
    const mems = memoryService.getAllMemories();
    setMemoryStats({ count: mems.length });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.saveSettings(settings);

      // Apply System Settings (IPC)
      // @ts-ignore
      if (window.luca?.applySystemSettings) {
        // @ts-ignore
        window.luca.applySystemSettings(settings.general);
      }

      setStatusMsg("Settings Saved Successfully");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (e) {
      setStatusMsg("Error Saving Settings");
    }
    setLoading(false);
  };

  const updateSetting = (
    section: keyof LucaSettings,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm ${
        isMobile ? "p-2" : "p-4"
      } font-sans select-none`}
    >
      <div
        className={`w-full ${
          isMobile
            ? "w-[80vw] h-[60vh] rounded-2xl"
            : "max-w-3xl h-[500px] rounded-xl"
        } glass-panel tech-border ${
          theme.primary
        } flex flex-col md:flex-row overflow-hidden transition-colors duration-300 shadow-[0_0_50px_-20px_rgba(0,0,0,0.5)]`}
        style={{
          boxShadow: `0 0 50px -20px rgba(0,0,0,0.5)`,
          border: `1px solid ${theme.hex}33`,
        }}
      >
        {/* Desktop Sidebar / Mobile Header */}
        {!isMobile ? (
          <div
            className="w-56 bg-black/20 flex flex-col"
            style={{ borderRight: `1px solid ${theme.hex}33` }}
          >
            <div
              className="p-5"
              style={{ borderBottom: `1px solid ${theme.hex}33` }}
            >
              <h2
                className={`text-md font-bold tracking-wider flex items-center gap-2 ${theme.primary}`}
              >
                <Settings className="w-4 h-4" />
                SETTINGS
              </h2>
            </div>
            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      backgroundColor: isActive
                        ? `${theme.hex}20`
                        : "transparent",
                      color: isActive ? theme.hex : "#9ca3af",
                      borderColor: isActive ? theme.hex : "transparent",
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-xs font-medium border border-transparent transition-all hover:bg-white/5"
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className="bg-black/20 flex flex-col shrink-0"
            style={{ borderBottom: `1px solid ${theme.hex}33` }}
          >
            <div
              className="p-4 flex justify-between items-center"
              style={{ borderBottom: `1px solid ${theme.hex}1a` }}
            >
              <h2
                className={`text-sm font-bold tracking-wider flex items-center gap-2 ${theme.primary}`}
              >
                <Settings className="w-4 h-4" />
                SETTINGS
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Horizontal Tab Bar */}
            <div className="flex overflow-x-auto no-scrollbar p-2 px-3 gap-2">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                      isActive
                        ? `bg-white/10 text-white`
                        : "border-white/5 text-gray-500 hover:text-gray-300"
                    }`}
                    style={{
                      borderColor: isActive
                        ? theme.hex
                        : "rgba(255,255,255,0.05)",
                      color: isActive ? theme.hex : undefined,
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content Header (Desktop Only) */}
          {!isMobile && (
            <div
              className="p-5 flex justify-between items-center bg-white/5"
              style={{ borderBottom: `1px solid ${theme.hex}33` }}
            >
              <h3 className="text-lg font-bold text-gray-200">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Scrollable Body */}
          <div
            className={`flex-1 basis-0 grow ${
              activeTab === "admin" ? "overflow-hidden" : "overflow-y-auto"
            } ${
              isMobile ? (activeTab === "admin" ? "p-0" : "p-4 pb-32") : "p-6"
            }`}
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            {activeTab === "general" && (
              <SettingsGeneralTab
                settings={settings}
                onUpdate={updateSetting}
                theme={theme}
              />
            )}
            {activeTab === "brain" && (
              <SettingsBrainTab
                settings={settings}
                onUpdate={updateSetting}
                theme={theme}
              />
            )}
            {activeTab === "voice" && (
              <SettingsVoiceTab
                settings={settings}
                onUpdate={updateSetting}
                theme={theme}
              />
            )}
            {activeTab === "profile" && <OperatorProfilePanel theme={theme} />}
            {activeTab === "personality" && (
              <PersonalityDashboard theme={theme} />
            )}
            {activeTab === "admin" && (
              <SettingsAdminTab setStatusMsg={setStatusMsg} theme={theme} />
            )}
            {activeTab === "iot" && (
              <SettingsIoTTab
                settings={settings}
                onUpdate={updateSetting}
                theme={theme}
              />
            )}
            {activeTab === "connectors" && (
              <SettingsConnectorsTab
                settings={settings}
                connectors={connectors}
                theme={theme}
                onClose={onClose}
                setStatusMsg={setStatusMsg}
              />
            )}
            {activeTab === "neurallink" && (
              <SettingsNeuralLinkTab
                settings={settings}
                onUpdate={updateSetting}
                theme={theme}
              />
            )}
            {activeTab === "data" && (
              <SettingsDataTab
                memoryStats={memoryStats}
                loadMemoryStats={loadMemoryStats}
                theme={theme}
              />
            )}
            {activeTab === "about" && <SettingsAboutTab theme={theme} />}
          </div>

          {/* Footer Actions */}
          <div
            className={`p-4 bg-black/40 flex justify-between items-center ${
              isMobile ? "pb-8" : ""
            }`}
            style={{ borderTop: `1px solid ${theme.hex}33` }}
          >
            <div
              className={`text-[10px] md:text-xs ${
                statusMsg.includes("Error") ? "text-red-500" : "text-green-500"
              }`}
            >
              {statusMsg}
            </div>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  borderColor: theme.hex,
                  backgroundColor: `${theme.hex}20`,
                  color: theme.hex,
                }}
                className="px-6 py-2 border hover:bg-opacity-40 rounded text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                {isMobile ? "Save" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
