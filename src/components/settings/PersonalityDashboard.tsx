import React, { useState, useEffect } from "react";
import {
  Heart,
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  RefreshCw,
  Sparkles,
  Shield,
  Zap,
  Smile,
} from "lucide-react";
import { personalityService } from "../../services/personalityService";
import {
  LucaPersonality,
  RelationshipStage,
} from "../../types/lucaPersonality";

interface PersonalityDashboardProps {
  theme: {
    primary: string;
    hex: string;
  };
}

/**
 * Personality Dashboard
 * Displays Luca's evolving personality and relationship progress
 */
const PersonalityDashboard: React.FC<PersonalityDashboardProps> = ({
  theme,
}) => {
  const [personality, setPersonality] = useState<LucaPersonality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonality();
  }, []);

  const loadPersonality = () => {
    setLoading(true);
    const data = personalityService.getPersonality();
    setPersonality(data);
    setLoading(false);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      loadPersonality();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!personality) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-white/10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-xl">
          <Heart className="w-8 h-8 text-gray-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">
            No Personality Data
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Complete onboarding to initialize Luca's personality system.
          </p>
        </div>
      </div>
    );
  }

  const { relationship, traits, modeHistory, metadata } = personality;
  const effectiveTraits = personalityService.getEffectiveTraits();

  // Calculate relationship progress
  const stageProgress = getStageProgress(
    relationship.relationshipStage,
    relationship.daysKnown
  );
  const nextStage = getNextStage(relationship.relationshipStage);

  // Calculate mode usage
  const modeStats = calculateModeUsage(modeHistory);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Luca's Personality
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-500">
            Growing since {new Date(metadata.created).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Relationship Stage Card */}
      <div
        className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-xl relative overflow-hidden"
        style={{
          boxShadow: `0 0 20px ${theme.hex}15`,
        }}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `linear-gradient(135deg, ${theme.hex} 0%, transparent 100%)`,
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Heart
              className="w-5 h-5 sm:w-6 sm:h-6"
              style={{ color: theme.hex }}
            />
            <div>
              <h4 className="text-sm sm:text-md font-bold text-white capitalize">
                {relationship.relationshipStage.replace("_", " ")} Partnership
              </h4>
              <p className="text-[10px] sm:text-xs text-gray-400">
                Day {relationship.daysKnown} • {relationship.totalInteractions}{" "}
                interactions
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-400">
              <span className="capitalize">
                {relationship.relationshipStage.replace("_", " ")}
              </span>
              <span>{nextStage ? `→ ${nextStage}` : "Max Level"}</span>
            </div>
            <div className="h-3 bg-white/5 border border-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full transition-all duration-1000 rounded-full"
                style={{
                  width: `${stageProgress}%`,
                  background: `linear-gradient(90deg, ${theme.hex} 0%, ${theme.hex}80 100%)`,
                  boxShadow: `0 0 10px ${theme.hex}40`,
                }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 text-right">
              {stageProgress}% to next stage
            </p>
          </div>
        </div>
      </div>

      {/* Personality Traits */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Sparkles
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: theme.hex }}
          />
          <h4 className="text-sm sm:text-md font-bold text-white">
            Personality Traits
          </h4>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {[
            { key: "warmth", label: "Warmth", icon: Heart },
            { key: "playfulness", label: "Playfulness", icon: Smile },
            { key: "empathy", label: "Empathy", icon: Heart },
            { key: "protectiveness", label: "Protectiveness", icon: Shield },
            { key: "sass", label: "Sass", icon: Zap },
            { key: "familiarity", label: "Familiarity", icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => {
            const value = effectiveTraits[
              key as keyof typeof effectiveTraits
            ] as number;
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-300">
                      {label}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {value}/100
                  </span>
                </div>
                <div className="h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${value}%`,
                      background: `linear-gradient(90deg, ${theme.hex} 0%, ${theme.hex}60 100%)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      {relationship.milestones && relationship.milestones.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Award
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: theme.hex }}
            />
            <h4 className="text-sm sm:text-md font-bold text-white">
              Milestones
            </h4>
          </div>

          <div className="space-y-3">
            {relationship.milestones
              .slice(-5)
              .reverse()
              .map((milestone, i) => (
                <div
                  key={milestone.id}
                  className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: theme.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-white">
                      {milestone.description}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      {new Date(milestone.date).toLocaleDateString()} •{" "}
                      {Math.floor(
                        (new Date().getTime() -
                          new Date(milestone.date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days ago
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Mode Usage Stats */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <BarChart3
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: theme.hex }}
          />
          <h4 className="text-sm sm:text-md font-bold text-white">
            Communication Modes
          </h4>
        </div>

        <div className="space-y-3">
          {Object.entries(modeStats).map(([mode, percentage]) => (
            <div key={mode}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs sm:text-sm text-gray-300 uppercase font-mono">
                  {mode}
                </span>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {percentage}%
                </span>
              </div>
              <div className="h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${theme.hex}80 0%, ${theme.hex}40 100%)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <Calendar
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              style={{ color: theme.hex }}
            />
            <span className="text-[10px] sm:text-xs text-gray-400">
              Days Known
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {relationship.daysKnown}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <TrendingUp
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              style={{ color: theme.hex }}
            />
            <span className="text-[10px] sm:text-xs text-gray-400">
              Interactions
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {relationship.totalInteractions}
          </p>
        </div>
      </div>

      {/* Info Note */}
      <p className="text-[10px] sm:text-xs text-gray-500 text-center px-2">
        Luca's personality evolves based on your interactions.
        <br />
        Continue chatting to deepen your relationship!
      </p>
    </div>
  );
};

// Helper functions
function getStageProgress(stage: RelationshipStage, days: number): number {
  const stages = {
    [RelationshipStage.NEW]: { min: 0, max: 7 },
    [RelationshipStage.GETTING_COMFORTABLE]: { min: 7, max: 30 },
    [RelationshipStage.ESTABLISHED]: { min: 30, max: 90 },
    [RelationshipStage.TRUSTED]: { min: 90, max: 180 },
    [RelationshipStage.BONDED]: { min: 180, max: 365 },
  };

  const range = stages[stage];
  if (days >= range.max) return 100;

  const progress = ((days - range.min) / (range.max - range.min)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function getNextStage(stage: RelationshipStage): string | null {
  const progression = {
    [RelationshipStage.NEW]: "Getting Comfortable",
    [RelationshipStage.GETTING_COMFORTABLE]: "Established",
    [RelationshipStage.ESTABLISHED]: "Trusted",
    [RelationshipStage.TRUSTED]: "Bonded",
    [RelationshipStage.BONDED]: null,
  };

  return progression[stage];
}

function calculateModeUsage(
  history: { mode: string; timestamp: Date; duration: number }[]
): Record<string, number> {
  if (!history || history.length === 0) {
    return {
      ASSISTANT: 100,
      ENGINEER: 0,
      RUTHLESS: 0,
      HACKER: 0,
    };
  }

  const counts: Record<string, number> = {};
  history.forEach((entry) => {
    counts[entry.mode] = (counts[entry.mode] || 0) + 1;
  });

  const total = history.length;
  const percentages: Record<string, number> = {};

  ["ASSISTANT", "ENGINEER", "RUTHLESS", "HACKER"].forEach((mode) => {
    percentages[mode] = Math.round(((counts[mode] || 0) / total) * 100);
  });

  return percentages;
}

export default PersonalityDashboard;
