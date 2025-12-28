import { FunctionDeclaration } from "@google/genai";
import {
  PersonaType,
  PERSONA_SPECIALIZED_TOOLS,
} from "../config/personaConfig";

/**
 * Get tools for persona - ALL tools are available, but specialized tools are prioritized
 * Returns all tools, but specialized tools are loaded/prioritized for the persona
 */
export function getToolsForPersona(
  persona: PersonaType,
  allTools: FunctionDeclaration[]
): FunctionDeclaration[] {
  // ALL tools are available for all personas
  // Specialized tools are just prioritized/loaded when switching
  return allTools;
}

/**
 * Get specialized tools for a persona (tools that are prioritized when switching to that mode)
 */
export function getSpecializedToolsForPersona(
  persona: PersonaType,
  allTools: FunctionDeclaration[]
): FunctionDeclaration[] {
  const specializedToolNames = PERSONA_SPECIALIZED_TOOLS[persona];

  if (!specializedToolNames || specializedToolNames.length === 0) {
    return []; // No specialized tools for this persona
  }

  // Return specialized tools for this persona
  const toolNamesSet = new Set(
    specializedToolNames.map((name) => name.toLowerCase())
  );
  return allTools.filter(
    (tool) => tool.name && toolNamesSet.has(tool.name.toLowerCase())
  );
}
