import React, { useState, useEffect } from "react";
import {
  User,
  Brain,
  Briefcase,
  Settings,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { settingsService } from "../../services/settingsService";
import { OperatorProfile } from "../../types/operatorProfile";

interface OperatorProfilePanelProps {
  theme: {
    primary: string;
    hex: string;
  };
}

/**
 * Operator Profile Panel for Settings
 * Displays what Luca has learned about the operator
 */
const OperatorProfilePanel: React.FC<OperatorProfilePanelProps> = ({
  theme,
}) => {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const stored = settingsService.getOperatorProfile();
    setProfile(stored);
    setLoading(false);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      loadProfile();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-white/10 border border-white/20 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-gray-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">No Profile Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Complete the conversational onboarding to let Luca learn about you.
            Your profile will be built automatically as you chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Operator Profile</h3>
          <p className="text-xs text-gray-500">
            Last updated:{" "}
            {new Date(profile.metadata.lastUpdated).toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Refresh profile"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Identity */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5" style={{ color: theme.hex }} />
          <h4 className="text-md font-bold text-white">Identity</h4>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Name</span>
            <span className="text-sm text-white font-medium">
              {profile.identity.name}
            </span>
          </div>
          {profile.identity.designation && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Designation</span>
              <span className="text-sm text-white font-medium">
                {profile.identity.designation}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Personality */}
      {profile.personality && Object.keys(profile.personality).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5" style={{ color: theme.hex }} />
            <h4 className="text-md font-bold text-white">
              Personality & Style
            </h4>
          </div>
          <div className="space-y-3">
            {profile.personality.communicationStyle && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Communication</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white capitalize">
                  {profile.personality.communicationStyle}
                </span>
              </div>
            )}
            {profile.personality.workStyle && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Work Style</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white capitalize">
                  {profile.personality.workStyle}
                </span>
              </div>
            )}
            {profile.personality.tone && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Tone</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white capitalize">
                  {profile.personality.tone}
                </span>
              </div>
            )}

            {/* Preferences */}
            {profile.personality.preferences &&
              profile.personality.preferences.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-sm text-gray-400 block mb-2">
                    Preferences
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.personality.preferences.map((pref, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300"
                      >
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Traits */}
            {profile.personality.traits &&
              profile.personality.traits.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-sm text-gray-400 block mb-2">
                    Traits
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.personality.traits.map((trait, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Assistant Preferences */}
      {profile.assistantPreferences &&
        Object.keys(profile.assistantPreferences).length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5" style={{ color: theme.hex }} />
              <h4 className="text-md font-bold text-white">
                Assistant Preferences
              </h4>
            </div>
            <div className="space-y-3">
              {profile.assistantPreferences.preferredPersona && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    Preferred Persona
                  </span>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white uppercase">
                    {profile.assistantPreferences.preferredPersona}
                  </span>
                </div>
              )}
              {profile.assistantPreferences.helpStyle && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Help Style</span>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white capitalize">
                    {profile.assistantPreferences.helpStyle}
                  </span>
                </div>
              )}
              {profile.assistantPreferences.detailLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Detail Level</span>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white capitalize">
                    {profile.assistantPreferences.detailLevel}
                  </span>
                </div>
              )}

              {/* Communication Format */}
              {profile.assistantPreferences.communicationFormat &&
                profile.assistantPreferences.communicationFormat.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-sm text-gray-400 block mb-2">
                      Communication Format
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {profile.assistantPreferences.communicationFormat.map(
                        (format, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300"
                          >
                            {format}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

      {/* Work Context */}
      {profile.workContext && Object.keys(profile.workContext).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-5 h-5" style={{ color: theme.hex }} />
            <h4 className="text-md font-bold text-white">Work Context</h4>
          </div>
          <div className="space-y-3">
            {profile.workContext.profession && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Profession</span>
                <span className="text-sm text-white font-medium">
                  {profile.workContext.profession}
                </span>
              </div>
            )}
            {profile.workContext.skillLevel && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Skill Level</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white capitalize">
                  {profile.workContext.skillLevel}
                </span>
              </div>
            )}

            {/* Interests */}
            {profile.workContext.interests &&
              profile.workContext.interests.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-sm text-gray-400 block mb-2">
                    Interests
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.workContext.interests.map((interest, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div
        className="rounded-lg p-4 backdrop-blur-xl"
        style={{
          backgroundColor: `${theme.hex}0d`,
          border: `1px solid ${theme.hex}33`,
        }}
      >
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span
              className="block mb-1 opacity-60"
              style={{ color: theme.hex }}
            >
              Messages Analyzed
            </span>
            <span className="text-white font-medium">
              {profile.metadata.conversationCount || 0}
            </span>
          </div>
          <div>
            <span
              className="block mb-1 opacity-60"
              style={{ color: theme.hex }}
            >
              Confidence
            </span>
            <span className="text-white font-medium">
              {profile.metadata.confidence || 0}%
            </span>
          </div>
          <div>
            <span
              className="block mb-1 opacity-60"
              style={{ color: theme.hex }}
            >
              Privacy Level
            </span>
            <span className="text-white font-medium capitalize">
              {profile.metadata.privacyLevel}
            </span>
          </div>
          <div>
            <span
              className="block mb-1 opacity-60"
              style={{ color: theme.hex }}
            >
              Profile Created
            </span>
            <span className="text-white font-medium">
              {new Date(profile.metadata.profileCreated).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-500 text-center">
        Profile is built automatically from your conversations with Luca.
        <br />
        Continue chatting to help Luca understand you better.
      </p>
    </div>
  );
};

export default OperatorProfilePanel;
