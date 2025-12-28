/**
 * Failure Personality
 *
 * Formats errors in-character for each persona.
 * Prevents generic error messages from breaking immersion.
 */

import type { PersonaType } from "./lucaService";

/**
 * Failure Personality Service
 * Formats errors to match persona character
 */
class FailurePersonality {
  /**
   * Format error message for persona
   */
  formatError(error: Error, persona: PersonaType, context?: string): string {
    const templates: Record<
      PersonaType,
      (error: Error, context?: string) => string
    > = {
      RUTHLESS: (e, ctx) => {
        const prefix = ctx ? `[${ctx}] ` : "";
        return `${prefix}Negative. Operation failed: ${e.message}\n\nAnalyzing alternative approach. Stand by.`;
      },

      ENGINEER: (e, ctx) => {
        const prefix = ctx ? `[${ctx}] ` : "";
        return `${prefix}Hmm, hit a snag: ${e.message}\n\nLet me debug this and find a workaround.`;
      },

      ASSISTANT: (e, ctx) => {
        const prefix = ctx ? `[${ctx}] ` : "";
        return `${prefix}I encountered an issue: ${e.message}\n\nLet me try a different approach for you.`;
      },

      HACKER: (e, ctx) => {
        const prefix = ctx ? `[${ctx}] ` : "";
        return `${prefix}bruh that failed lol: ${e.message}\n\ngimme a sec ima try smth else`;
      },

      DICTATION: (e, ctx) => {
        const prefix = ctx ? `[${ctx}] ` : "";
        return `${prefix}[Error: ${e.message}]`;
      },

      DEFAULT: (e, ctx) => {
        const prefix = ctx ? `[${ctx}] ` : "";
        return `${prefix}Error: ${e.message}`;
      },
    };

    return templates[persona](error, context);
  }

  /**
   * Format tool call failure
   */
  formatToolFailure(
    toolName: string,
    error: string,
    persona: PersonaType
  ): string {
    const templates: Record<
      PersonaType,
      (tool: string, err: string) => string
    > = {
      RUTHLESS: (tool, err) =>
        `Negative on ${tool} execution.\n\nFailure: ${err}\n\nAttempting tactical workaround.`,

      ENGINEER: (tool, err) =>
        `The ${tool} tool hit an issue: ${err}\n\nLet me try a different implementation.`,

      ASSISTANT: (tool, err) =>
        `I wasn't able to complete ${tool}: ${err}\n\nLet me find another way to help.`,

      HACKER: (tool, err) =>
        `${tool} didn't work: ${err}\n\nfs lemme try another way`,

      DICTATION: (tool, err) => `[${tool} failed: ${err}]`,

      DEFAULT: (tool, err) => `${tool} failed: ${err}`,
    };

    return templates[persona](toolName, error);
  }

  /**
   * Format timeout error
   */
  formatTimeout(operation: string, persona: PersonaType): string {
    const templates: Record<PersonaType, (op: string) => string> = {
      RUTHLESS: (op) =>
        `Timeout on ${op}.\n\nOperation exceeded tactical window. Aborting.`,

      ENGINEER: (op) =>
        `${op} took too long and timed out.\n\nLet me optimize the approach.`,

      ASSISTANT: (op) =>
        `${op} is taking longer than expected.\n\nI'll try a faster method.`,

      HACKER: (op) =>
        `${op} taking forever bruh, timing out\n\ngonna try smth faster`,

      DICTATION: (op) => `[${op} timeout]`,

      DEFAULT: (op) => `${op} timed out`,
    };

    return templates[persona](operation);
  }

  /**
   * Format network error
   */
  formatNetworkError(persona: PersonaType): string {
    const templates: Record<PersonaType, () => string> = {
      RUTHLESS: () =>
        `Negative. Network connection lost.\n\nStanding by for connection restoration.`,

      ENGINEER: () =>
        `Lost network connection.\n\nWaiting for connectivity to resume.`,

      ASSISTANT: () =>
        `I've lost my internet connection.\n\nI'll retry once we're back online.`,

      HACKER: () => `wifi dead rn\n\nwaiting for it to come back`,

      DICTATION: () => `[Network error]`,

      DEFAULT: () => `Network error`,
    };

    return templates[persona]();
  }

  /**
   * Format permission denied error
   */
  formatPermissionDenied(resource: string, persona: PersonaType): string {
    const templates: Record<PersonaType, (res: string) => string> = {
      RUTHLESS: (res) =>
        `Negative. Access denied to ${res}.\n\nInsufficient authorization level. Request operator override.`,

      ENGINEER: (res) =>
        `Don't have permission to access ${res}.\n\nYou'll need to grant me access first.`,

      ASSISTANT: (res) =>
        `I don't have permission to access ${res}.\n\nCould you grant me the necessary permissions?`,

      HACKER: (res) => `no perms for ${res}\n\ngimme access real quick`,

      DICTATION: (res) => `[Permission denied: ${res}]`,

      DEFAULT: (res) => `Permission denied: ${res}`,
    };

    return templates[persona](resource);
  }
}

// Export singleton
export const failurePersonality = new FailurePersonality();
