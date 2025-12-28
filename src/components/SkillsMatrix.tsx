import React, { useState, useEffect } from "react";
import {
  X,
  BrainCircuit,
  Code,
  Play,
  Layers,
  Cpu,
  Sparkles,
  Grid3x3,
  Eye,
  Save,
  Loader,
  Edit,
} from "lucide-react";
import { CustomSkill } from "../types";
import SkillPreview from "./SkillPreview";
import { apiUrl } from "../config/api";

interface Props {
  onClose: () => void;
  onExecute: (name: string, args: any) => void;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

interface ThemeColors {
  accent: string;
  glow: string;
  border: string;
  bgTint: string;
  textColor: string;
}

const SkillsMatrix: React.FC<Props> = ({ onClose, onExecute, theme }) => {
  const themePrimary = theme?.primary || "text-purple-400";
  const themeBorder = theme?.border || "border-purple-500";
  const themeBg = theme?.bg || "bg-purple-950/10";
  const themeHex = theme?.hex || "#a855f7";
  // State
  const [skills, setSkills] = useState<CustomSkill[]>([]);
  const [activeTab, setActiveTab] = useState<"SKILLS" | "AI" | "TEMPLATES">(
    "SKILLS"
  );
  const [loading, setLoading] = useState(false);

  // AI Mode State
  const [creationMode, setCreationMode] = useState<"AI" | "MANUAL">("AI");
  const [skillDescription, setSkillDescription] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual Mode State
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScript, setNewScript] = useState("");
  const [newLang, setNewLang] = useState<"python" | "node">("python");
  const [newInputs, setNewInputs] = useState("");

  // Preview State
  const [previewSkill, setPreviewSkill] = useState<CustomSkill | null>(null);

  // Theme color extraction
  const getThemeColors = (): ThemeColors => {
    const isBlue = themeHex === "#3b82f6";
    const isOrange = themeHex === "#C9763D";
    const isGrey = themeHex === "#E0E0E0";
    const isGreen = themeHex === "#10b981" || themeHex === "#22c55e";

    return {
      accent: isBlue
        ? "#3b82f6"
        : isOrange
        ? "#C9763D"
        : isGrey
        ? "#E0E0E0"
        : isGreen
        ? "#22c55e"
        : themeHex || "#a855f7",
      glow: isBlue
        ? "rgba(59, 130, 246, 0.3)"
        : isOrange
        ? "rgba(201, 118, 61, 0.3)"
        : isGrey
        ? "rgba(224, 224, 224, 0.3)"
        : isGreen
        ? "rgba(34, 197, 94, 0.3)"
        : "rgba(168, 85, 247, 0.3)",
      border: isBlue
        ? "rgba(59, 130, 246, 0.2)"
        : isOrange
        ? "rgba(201, 118, 61, 0.2)"
        : isGrey
        ? "rgba(224, 224, 224, 0.2)"
        : isGreen
        ? "rgba(34, 197, 94, 0.2)"
        : "rgba(168, 85, 247, 0.2)",
      bgTint: isBlue
        ? "rgba(59, 130, 246, 0.05)"
        : isOrange
        ? "rgba(201, 118, 61, 0.05)"
        : isGrey
        ? "rgba(224, 224, 224, 0.05)"
        : isGreen
        ? "rgba(34, 197, 94, 0.05)"
        : "rgba(168, 85, 247, 0.05)",
      textColor: isGrey ? "#000000" : "#ffffff",
    };
  };

  const colors = getThemeColors();

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/skills/list"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSkills(data);
        } else if (
          data &&
          typeof data.skills === "object" &&
          data.skills !== null
        ) {
          setSkills(
            Array.isArray(data.skills)
              ? data.skills
              : Object.values(data.skills)
          );
        } else {
          console.warn("Skills API returned unexpected data format:", data);
          setSkills([]);
        }
      } else {
        setSkills([]);
      }
    } catch (e) {
      console.error("Failed to fetch skills:", e);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSkillFromDescription = async () => {
    if (!skillDescription.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch(apiUrl("/api/skills/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: skillDescription,
          language: newLang,
        }),
      });

      if (response.ok) {
        const {
          code,
          name,
          inputs,
          description: aiDesc,
        } = await response.json();
        setGeneratedCode(code);
        setNewScript(code);
        setNewName(name);
        setNewDesc(aiDesc);
        setNewInputs(Array.isArray(inputs) ? inputs.join(", ") : "");
      } else {
        alert("Failed to generate skill. Please try again.");
      }
    } catch (error) {
      console.error("Skill generation failed:", error);
      alert("Skill generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newScript) {
      alert("Please enter a skill name and script logic.");
      return;
    }
    try {
      const inputsArray = newInputs
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const res = await fetch(apiUrl("/api/skills/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          script: newScript,
          language: newLang,
          inputs: inputsArray,
        }),
      });

      if (res.ok) {
        fetchSkills();
        setActiveTab("SKILLS");
        // Reset form
        setNewName("");
        setNewDesc("");
        setNewScript("");
        setNewInputs("");
        setSkillDescription("");
        setGeneratedCode("");
      } else {
        alert("Failed to create skill");
      }
    } catch (e) {
      alert("Failed to create skill");
    }
  };

  const getTabStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? colors.bgTint : "transparent",
    borderColor: isActive ? colors.border : "rgba(255,255,255,0.05)",
    color: isActive ? colors.accent : "#94a3b8",
    boxShadow: isActive ? `0 0 20px ${colors.glow}` : "none",
  });

  const getModeButtonStyle = (isActive: boolean) => ({
    background: isActive
      ? `linear-gradient(to right, ${colors.accent}, ${colors.accent}dd)`
      : "rgba(255,255,255,0.05)",
    color: isActive ? colors.textColor : "#94a3b8",
    boxShadow: isActive ? `0 0 20px ${colors.glow}` : "none",
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 font-mono p-0 sm:p-4">
      <div
        className="w-full h-full sm:w-[95%] max-w-[1400px] sm:h-[90vh] bg-black/60 backdrop-blur-xl rounded-none sm:rounded-lg flex flex-col overflow-hidden"
        style={{
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 50px ${colors.glow}`,
        }}
      >
        {/* Header */}
        <div
          className="h-16 sm:h-20 border-b backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between flex-shrink-0 relative z-30"
          style={{
            borderColor: colors.border,
            background: `linear-gradient(to right, rgba(0,0,0,0.8), ${colors.bgTint})`,
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div
              className="p-2 sm:p-3 rounded-lg backdrop-blur-sm flex-shrink-0"
              style={{
                backgroundColor: colors.bgTint,
                border: `1px solid ${colors.border}`,
              }}
            >
              <BrainCircuit
                size={22}
                className="sm:w-7 sm:h-7"
                style={{ color: colors.accent }}
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wider truncate">
                NEURAL SKILLS MATRIX
              </h1>
              <div
                className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs font-mono"
                style={{ color: colors.accent }}
              >
                <span>REG: {skills.length}</span>
                <span className="hidden xs:inline">ENGINE: AI-POWERED</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-50 p-2 hover:bg-white/10 rounded-lg transition-all flex-shrink-0 cursor-pointer active:scale-95"
          >
            <X
              size={20}
              className="sm:w-6 sm:h-6 text-slate-400 hover:text-white"
            />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar */}
          <div
            className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r bg-black/40 backdrop-blur-sm flex flex-col flex-shrink-0"
            style={{ borderColor: colors.border }}
          >
            <div className="p-3 sm:p-4 space-y-2 flex flex-row sm:flex-col gap-2 sm:gap-0 w-full overflow-x-auto sm:overflow-visible scrollbar-none">
              {/* Active Skills Tab */}
              <button
                onClick={() => setActiveTab("SKILLS")}
                className="flex-1 sm:flex-none w-auto sm:w-full p-3 sm:p-4 rounded-xl text-left flex items-center gap-2 sm:gap-3 transition-all border whitespace-nowrap"
                style={getTabStyle(activeTab === "SKILLS")}
              >
                <Layers size={18} className="sm:w-5 sm:h-5" />
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  ACTIVE SKILLS
                </span>
              </button>

              {/* AI Assistant Tab */}
              <button
                onClick={() => setActiveTab("AI")}
                className="flex-1 sm:flex-none w-auto sm:w-full p-3 sm:p-4 rounded-xl text-left flex items-center gap-2 sm:gap-3 transition-all border whitespace-nowrap"
                style={getTabStyle(activeTab === "AI")}
              >
                <Sparkles size={18} className="sm:w-5 sm:h-5" />
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  AI ASSISTANT
                </span>
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded-full text-white hidden md:inline"
                  style={{ backgroundColor: colors.accent }}
                >
                  NEW
                </span>
              </button>

              {/* Templates Tab */}
              <button
                onClick={() => setActiveTab("TEMPLATES")}
                className="flex-1 sm:flex-none w-auto sm:w-full p-3 sm:p-4 rounded-xl text-left flex items-center gap-2 sm:gap-3 transition-all border whitespace-nowrap"
                style={getTabStyle(activeTab === "TEMPLATES")}
              >
                <Grid3x3 size={18} className="sm:w-5 sm:h-5" />
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  TEMPLATES
                </span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
            {activeTab === "SKILLS" && (
              <SkillsTab
                skills={skills}
                colors={colors}
                loading={loading}
                onExecute={onExecute}
                onPreview={setPreviewSkill}
              />
            )}

            {activeTab === "AI" && (
              <AIAssistantTab
                colors={colors}
                creationMode={creationMode}
                setCreationMode={setCreationMode}
                skillDescription={skillDescription}
                setSkillDescription={setSkillDescription}
                newLang={newLang}
                setNewLang={setNewLang}
                isGenerating={isGenerating}
                generateSkillFromDescription={generateSkillFromDescription}
                generatedCode={generatedCode}
                newName={newName}
                setNewName={setNewName}
                newInputs={newInputs}
                setNewInputs={setNewInputs}
                newDesc={newDesc}
                setNewDesc={setNewDesc}
                newScript={newScript}
                setNewScript={setNewScript}
                handleCreate={handleCreate}
              />
            )}

            {activeTab === "TEMPLATES" && (
              <TemplatesTab
                colors={colors}
                onUseTemplate={(template) => {
                  // Populate form with template data
                  setNewName(template.name.replace(/\s+/g, ""));
                  setNewDesc(template.description);
                  setNewScript(template.code);
                  setNewLang(template.language);
                  setNewInputs(template.inputs.join(", "));
                  setCreationMode("MANUAL");
                  setActiveTab("AI");
                }}
              />
            )}
          </div>
        </div>

        {/* Skill Preview Modal */}
        {previewSkill && (
          <SkillPreview
            skill={previewSkill}
            onClose={() => setPreviewSkill(null)}
            onExecute={async (args) => {
              return await onExecute(previewSkill.name, args);
            }}
            themeColors={colors}
          />
        )}
      </div>
    </div>
  );
};

// Skills Tab Component
const SkillsTab: React.FC<{
  skills: CustomSkill[];
  colors: ThemeColors;
  loading: boolean;
  onExecute: (name: string, args: any) => void;
  onPreview: (skill: CustomSkill) => void;
}> = ({ skills, colors, loading, onExecute, onPreview }) => {
  if (loading && skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader
          className="animate-spin"
          size={32}
          style={{ color: colors.accent }}
        />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Code size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-400 text-sm">
          No custom skills registered yet.
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Use the AI Assistant or Templates to create your first skill!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      {skills.map((skill, i) => (
        <SkillCard
          key={i}
          skill={skill}
          colors={colors}
          onExecute={onExecute}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
};

// Skill Card Component
const SkillCard: React.FC<{
  skill: CustomSkill;
  colors: ThemeColors;
  onExecute: (name: string, args: any) => void;
  onPreview: (skill: CustomSkill) => void;
}> = ({ skill, colors, onExecute, onPreview }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group bg-black/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 transition-all cursor-pointer border"
      style={{
        borderColor: isHovered ? colors.accent : colors.border,
        boxShadow: isHovered ? `0 0 30px ${colors.glow}` : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Code
            size={16}
            className="flex-shrink-0"
            style={{ color: colors.accent }}
          />
          <h3 className="font-bold text-white text-sm sm:text-base truncate">
            {skill.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Version Badge */}
          {skill.version && (
            <span
              className="text-[10px] px-2 py-0.5 rounded border font-mono"
              style={{
                backgroundColor: colors.bgTint,
                borderColor: colors.border,
                color: colors.accent,
              }}
            >
              v{skill.version}
            </span>
          )}
          {/* Language Badge */}
          <span
            className="text-[10px] px-2 py-0.5 rounded border"
            style={{
              backgroundColor: colors.bgTint,
              borderColor: colors.border,
              color: colors.accent,
            }}
          >
            {skill.language}
          </span>
          {/* Format Badge */}
          <span
            className="text-[10px] px-2 py-0.5 rounded border"
            style={{
              backgroundColor:
                skill.format === "agent-skills"
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(100, 116, 139, 0.1)",
              borderColor:
                skill.format === "agent-skills"
                  ? "rgba(34, 197, 94, 0.3)"
                  : "rgba(100, 116, 139, 0.3)",
              color: skill.format === "agent-skills" ? "#22c55e" : "#64748b",
            }}
          >
            {skill.format === "agent-skills" ? "📦 Agent" : "📄 Legacy"}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">
        {skill.description}
      </p>

      {/* Inputs */}
      <div
        className="rounded-lg p-2 mb-4 border"
        style={{
          backgroundColor: "rgba(0,0,0,0.4)",
          borderColor: colors.border,
        }}
      >
        <div className="text-[9px] sm:text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider">
          INPUTS
        </div>
        <div
          className="text-[10px] sm:text-xs font-mono truncate"
          style={{ color: colors.accent }}
        >
          {skill.inputs.join(", ") || "None"}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onPreview(skill)}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border"
          style={{
            backgroundColor: colors.bgTint,
            borderColor: colors.border,
            color: colors.accent,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.glow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.bgTint;
          }}
        >
          <Eye size={12} />
          PREVIEW
        </button>
        <button
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: colors.accent,
            color: colors.textColor,
          }}
          onClick={async () => {
            try {
              await onExecute(skill.name, {});
            } catch (e) {
              console.error("Execution failed:", e);
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Play size={12} />
          EXECUTE
        </button>
      </div>
    </div>
  );
};

// AI Assistant Tab Component
const AIAssistantTab: React.FC<{
  colors: ThemeColors;
  creationMode: "AI" | "MANUAL";
  setCreationMode: (mode: "AI" | "MANUAL") => void;
  skillDescription: string;
  setSkillDescription: (desc: string) => void;
  newLang: "python" | "node";
  setNewLang: (lang: "python" | "node") => void;
  isGenerating: boolean;
  generateSkillFromDescription: () => void;
  generatedCode: string;
  newName: string;
  setNewName: (name: string) => void;
  newInputs: string;
  setNewInputs: (inputs: string) => void;
  newDesc: string;
  setNewDesc: (desc: string) => void;
  newScript: string;
  setNewScript: (script: string) => void;
  handleCreate: () => void;
}> = ({
  colors,
  creationMode,
  setCreationMode,
  skillDescription,
  setSkillDescription,
  newLang,
  setNewLang,
  isGenerating,
  generateSkillFromDescription,
  generatedCode,
  newName,
  setNewName,
  newInputs,
  setNewInputs,
  newDesc,
  setNewDesc,
  newScript,
  setNewScript,
  handleCreate,
}) => {
  const getModeButtonStyle = (isActive: boolean) => ({
    background: isActive
      ? `linear-gradient(to right, ${colors.accent}, ${colors.accent}dd)`
      : "rgba(255,255,255,0.05)",
    color: isActive ? colors.textColor : "#94a3b8",
    boxShadow: isActive ? `0 0 20px ${colors.glow}` : "none",
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setCreationMode("AI")}
          className="flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all"
          style={getModeButtonStyle(creationMode === "AI")}
        >
          <Sparkles size={16} className="inline mr-2" />
          AI MODE
        </button>
        <button
          onClick={() => setCreationMode("MANUAL")}
          className="flex-1 py-3 px-6 rounded-lg font-bold text-sm transition-all"
          style={getModeButtonStyle(creationMode === "MANUAL")}
        >
          <Code size={16} className="inline mr-2" />
          MANUAL MODE
        </button>
      </div>

      {creationMode === "AI" ? (
        <>
          {/* AI Description Input */}
          <div className="mb-6">
            <label
              className="block text-sm font-bold mb-3"
              style={{ color: colors.accent }}
            >
              🤖 Describe Your Skill
            </label>
            <div className="relative">
              <textarea
                value={skillDescription}
                onChange={(e) => setSkillDescription(e.target.value)}
                placeholder='e.g., "Scrape top 10 Hacker News stories and format as markdown with titles, URLs, and scores..."'
                className="w-full h-40 backdrop-blur-sm rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none transition-all resize-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(15,15,25,0.8) 0%, rgba(30,15,40,0.6) 100%)",
                  border: `1px solid ${colors.border}`,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.glow}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                {skillDescription.length} / 500
              </div>
            </div>
          </div>

          {/* Language Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                LANGUAGE
              </label>
              <select
                value={newLang}
                onChange={(e) =>
                  setNewLang(e.target.value as "python" | "node")
                }
                className="w-full bg-black/60 rounded-lg p-3 text-white focus:outline-none"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <option value="python">Python 3</option>
                <option value="node">Node.js</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                COMPLEXITY
              </label>
              <select
                className="w-full bg-black/60 rounded-lg p-3 text-white focus:outline-none"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <option>Simple</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateSkillFromDescription}
            disabled={!skillDescription || isGenerating}
            className="w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] disabled:hover:scale-100"
            style={{
              background:
                !skillDescription || isGenerating
                  ? "linear-gradient(to right, #475569, #334155)"
                  : `linear-gradient(to right, ${colors.accent}, ${colors.accent}dd)`,
              color:
                !skillDescription || isGenerating
                  ? "#64748b"
                  : colors.textColor,
              boxShadow:
                !skillDescription || isGenerating
                  ? "none"
                  : `0 0 30px ${colors.glow}`,
            }}
          >
            {isGenerating ? (
              <>
                <Loader className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate with AI
              </>
            )}
          </button>

          {/* Generated Code Preview */}
          {generatedCode && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-bold flex items-center gap-2"
                  style={{ color: colors.accent }}
                >
                  <Eye size={20} />
                  Generated Code Preview
                </h3>
                <button
                  onClick={() => setCreationMode("MANUAL")}
                  className="text-sm flex items-center gap-2 hover:opacity-80"
                  style={{ color: colors.accent }}
                >
                  <Edit size={14} />
                  Edit Code
                </button>
              </div>

              <div
                className="bg-[#1e1e1e] rounded-xl p-4 overflow-x-auto"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <pre className="text-sm font-mono">
                  <code className="text-slate-300">{generatedCode}</code>
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className="bg-black/60 rounded-lg p-4"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <div className="text-xs text-slate-400 mb-1">SKILL NAME</div>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-transparent text-white font-mono text-sm focus:outline-none"
                  />
                </div>
                <div
                  className="bg-black/60 rounded-lg p-4"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <div className="text-xs text-slate-400 mb-1">INPUTS</div>
                  <input
                    value={newInputs}
                    onChange={(e) => setNewInputs(e.target.value)}
                    className="w-full bg-transparent text-white font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
                style={{
                  background: "linear-gradient(to right, #10b981, #059669)",
                  color: "#ffffff",
                  boxShadow: "0 0 30px rgba(16,185,129,0.3)",
                }}
              >
                <Save size={20} />
                Save Skill
              </button>
            </div>
          )}
        </>
      ) : (
        <ManualModeForm
          colors={colors}
          newName={newName}
          setNewName={setNewName}
          newDesc={newDesc}
          setNewDesc={setNewDesc}
          newLang={newLang}
          setNewLang={setNewLang}
          newInputs={newInputs}
          setNewInputs={setNewInputs}
          newScript={newScript}
          setNewScript={setNewScript}
          handleCreate={handleCreate}
        />
      )}
    </div>
  );
};

// Manual Mode Form Component
const ManualModeForm: React.FC<{
  colors: ThemeColors;
  newName: string;
  setNewName: (name: string) => void;
  newDesc: string;
  setNewDesc: (desc: string) => void;
  newLang: "python" | "node";
  setNewLang: (lang: "python" | "node") => void;
  newInputs: string;
  setNewInputs: (inputs: string) => void;
  newScript: string;
  setNewScript: (script: string) => void;
  handleCreate: () => void;
}> = ({
  colors,
  newName,
  setNewName,
  newDesc,
  setNewDesc,
  newLang,
  setNewLang,
  newInputs,
  setNewInputs,
  newScript,
  setNewScript,
  handleCreate,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label
          className="text-xs font-bold mb-1 block"
          style={{ color: colors.accent }}
        >
          SKILL NAME (camelCase)
        </label>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full bg-slate-900 p-3 text-white text-sm rounded outline-none"
          style={{ border: `1px solid ${colors.border}` }}
          placeholder="e.g. scrapeReddit"
        />
      </div>
      <div>
        <label
          className="text-xs font-bold mb-1 block"
          style={{ color: colors.accent }}
        >
          DESCRIPTION
        </label>
        <input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="w-full bg-slate-900 p-3 text-white text-sm rounded outline-none"
          style={{ border: `1px solid ${colors.border}` }}
          placeholder="What does this skill do?"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="text-[10px] sm:text-xs font-bold mb-1 block uppercase"
            style={{ color: colors.accent }}
          >
            LANGUAGE
          </label>
          <select
            value={newLang}
            onChange={(e) => setNewLang(e.target.value as any)}
            className="w-full bg-slate-900 px-3 py-2.5 text-white text-sm rounded outline-none border transition-all"
            style={{ borderColor: colors.border }}
          >
            <option value="python">Python 3</option>
            <option value="node">Node.js</option>
          </select>
        </div>
        <div>
          <label
            className="text-[10px] sm:text-xs font-bold mb-1 block uppercase"
            style={{ color: colors.accent }}
          >
            INPUTS (COMMA SEPARATED)
          </label>
          <input
            value={newInputs}
            onChange={(e) => setNewInputs(e.target.value)}
            className="w-full bg-slate-900 px-3 py-2.5 text-white text-sm rounded outline-none border transition-all"
            style={{ borderColor: colors.border }}
            placeholder="url, limit, query"
          />
        </div>
      </div>
      <div>
        <label
          className="text-[10px] sm:text-xs font-bold mb-1 block uppercase"
          style={{ color: colors.accent }}
        >
          SCRIPT LOGIC
        </label>
        <textarea
          value={newScript}
          onChange={(e) => setNewScript(e.target.value)}
          className="w-full h-48 sm:h-64 bg-[#1e1e1e] p-4 text-white font-mono text-sm rounded outline-none resize-none border transition-all"
          style={{ borderColor: colors.border }}
          placeholder={
            newLang === "python"
              ? "import requests\nprint('Hello World')"
              : "console.log('Hello World');"
          }
        />
      </div>
      <button
        onClick={handleCreate}
        className="w-full py-3 sm:py-4 text-white font-bold tracking-widest flex items-center justify-center gap-2 rounded transition-all hover:opacity-90 active:scale-[0.98]"
        style={{
          backgroundColor: colors.accent,
          color: colors.textColor,
          boxShadow: `0 0 20px ${colors.glow}`,
        }}
      >
        <Cpu size={18} />
        COMPILE & REGISTER
      </button>
    </div>
  );
};

// Templates Tab Component
const TemplatesTab: React.FC<{
  colors: ThemeColors;
  onUseTemplate?: (template: any) => void;
}> = ({ colors, onUseTemplate }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(apiUrl("/api/skills/templates"));
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error("Failed to fetch templates:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader
          className="animate-spin"
          size={32}
          style={{ color: colors.accent }}
        />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Grid3x3 size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-400 text-sm">No templates available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          colors={colors}
          onUse={onUseTemplate}
        />
      ))}
    </div>
  );
};

// Template Card Component
const TemplateCard: React.FC<{
  template: any;
  colors: ThemeColors;
  onUse?: (template: any) => void;
}> = ({ template, colors, onUse }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group bg-black/60 backdrop-blur-sm rounded-xl p-6 cursor-pointer transition-all border"
      style={{
        borderColor: isHovered ? colors.accent : colors.border,
        boxShadow: isHovered ? `0 0 30px ${colors.glow}` : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onUse?.(template)}
    >
      {/* Icon */}
      <div className="text-4xl mb-4">{template.icon}</div>

      {/* Template Info */}
      <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
      <p className="text-sm text-slate-400 mb-4">{template.description}</p>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <Code size={12} />
          {template.language}
        </span>
        <span className="flex items-center gap-1">
          <Layers size={12} />
          {template.category}
        </span>
      </div>

      {/* Use Button */}
      <button
        className="w-full py-2 rounded-lg font-bold text-sm transition-opacity flex items-center justify-center gap-2"
        style={{
          backgroundColor: colors.accent,
          color: colors.textColor,
          opacity: isHovered ? 1 : 0.8,
        }}
      >
        <Sparkles size={14} />
        Use Template
      </button>
    </div>
  );
};

export default SkillsMatrix;
