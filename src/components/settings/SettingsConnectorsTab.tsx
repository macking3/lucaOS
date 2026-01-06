import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  Linkedin,
  Globe,
  Video,
  Send,
  Hexagon,
  Twitter,
  Instagram,
  Shield,
} from "lucide-react";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl } from "../../config/api";

interface SettingsConnectorsTabProps {
  settings: LucaSettings;
  theme: any;
  onClose: () => void;
  setStatusMsg: (msg: string) => void;
}

const SettingsConnectorsTab: React.FC<SettingsConnectorsTabProps> = ({
  settings,
  theme,
  onClose,
  setStatusMsg,
}) => {
  const [googleStatus, setGoogleStatus] = useState<{
    status: string;
    email?: string;
  }>({ status: "OFFLINE" });

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const res = await fetch(apiUrl("/api/google/status"));
        const data = await res.json();
        setGoogleStatus(data);
      } catch {
        setGoogleStatus({ status: "OFFLINE" });
      }
    };
    checkGoogleStatus();
    const interval = setInterval(checkGoogleStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const SOCIAL_APPS = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: MessageCircle,
      color: "text-green-500",
      desc: "Messaging & Calls",
      event: "WHATSAPP_NEURAL_LINK",
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: Send,
      color: "",
      style: { color: theme.hex },
      desc: "Full Neural Link Integration",
      event: "TELEGRAM_NEURAL_LINK",
    },
    {
      id: "google",
      name: "Google Workspace",
      icon: Globe,
      color: "text-red-500",
      desc: "Gmail, Drive, Calendar",
      event: null, // Uses OAuth flow instead
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      icon: Twitter,
      color: "text-slate-300",
      desc: "Posts, DMs & Trends",
      event: "TWITTER_NEURAL_LINK",
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      color: "text-pink-500",
      desc: "Photos, Stories & Reels",
      event: "INSTAGRAM_NEURAL_LINK",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      color: "",
      style: { color: "#0A66C2" },
      desc: "Professional Network",
      event: "LINKEDIN_NEURAL_LINK",
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: Video,
      color: "text-red-600",
      desc: "Video & Streaming",
      event: "YOUTUBE_NEURAL_LINK",
    },
    {
      id: "discord",
      name: "Discord",
      icon: Hexagon,
      color: "text-indigo-400",
      desc: "Community & Servers",
      event: "DISCORD_NEURAL_LINK",
    },
    {
      id: "signal",
      name: "Signal Private",
      icon: Shield,
      color: "text-blue-400",
      desc: "E2E Encrypted Messaging",
      event: "SIGNAL_NEURAL_LINK",
    },
  ];

  return (
    <div className="space-y-6">
      <div
        className={`text-xs p-3 rounded-lg border text-gray-400 backdrop-blur-sm`}
        style={{
          backgroundColor: `${theme.hex}0d`,
          borderColor: `${theme.hex}33`,
        }}
      >
        <strong style={{ color: theme.hex }}>
          Social Intelligence Matrix:
        </strong>{" "}
        Connect your accounts to give Luca direct access. Note: This uses secure
        browser automation (Ghost Browser), not public APIs.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIAL_APPS.map((app) => {
          let isConnected =
            settings.connectors?.[app.id as keyof typeof settings.connectors];
          if (app.id === "google")
            isConnected = googleStatus.status === "READY";
          const Icon = app.icon;

          return (
            <div
              key={app.id}
              className={`relative group overflow-hidden border border-white/10 bg-white/5 rounded-xl p-4 transition-all hover:bg-white/10 backdrop-blur-sm`}
            >
              <div className="flex justify-between items-start mb-2">
                <div
                  className={`p-2 rounded-lg bg-white/5 ${app.color}`}
                  style={(app as any).style}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? "border-green-500/30 text-green-400 bg-green-500/10"
                      : "border-white/10 text-gray-500"
                  }`}
                >
                  {isConnected
                    ? app.id === "google"
                      ? googleStatus.email || "ACTIVE"
                      : "ACTIVE"
                    : "OFFLINE"}
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-200 mb-0.5">
                {app.name}
              </h3>
              <p className="text-[10px] text-gray-500 mb-4">{app.desc}</p>

              <button
                onClick={() => {
                  // Google uses OAuth flow, not Neural Link
                  if (app.id === "google") {
                    fetch(apiUrl("/api/google/auth/url"))
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.url) {
                          // @ts-expect-error - Electron IPC bridge
                          if (window.luca?.openExternal) {
                            // @ts-expect-error - Electron IPC bridge
                            window.luca.openExternal(data.url);
                          } else {
                            window.open(data.url, "_blank");
                          }
                        }
                      })
                      .catch(() => setStatusMsg("Failed to start Google Auth"));
                    return;
                  }

                  // All other platforms use Neural Link event pattern
                  if (app.event) {
                    const customEvent = new CustomEvent(app.event);
                    window.dispatchEvent(customEvent);
                    onClose();
                  } else {
                    setStatusMsg(`${app.name} connector not yet implemented.`);
                  }
                }}
                className={`w-full py-1.5 rounded textxs font-bold border transition-all flex items-center justify-center gap-2
                  ${
                    isConnected
                      ? "border-red-500/30 text-red-500 hover:bg-red-500/10"
                      : `hover:bg-white/10`
                  }`}
                style={
                  !isConnected
                    ? { borderColor: theme.hex, color: theme.hex }
                    : {}
                }
              >
                {isConnected ? "Disconnect" : "Connect Account"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsConnectorsTab;
