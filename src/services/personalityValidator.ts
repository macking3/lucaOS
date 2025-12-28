/**
 * Personality Validator
 *
 * Ensures LLM responses stay in character for each persona.
 * Detects violations (generic assistant language) and applies fixes.
 */

import type { PersonaType } from "./lucaService";

interface PersonalityValidation {
  isValid: boolean;
  violations: string[];
  severity: "low" | "medium" | "high";
}

/**
 * Personality Validator Service
 * Validates and fixes responses to maintain persona consistency
 */
class PersonalityValidator {
  /**
   * Validate response matches the specified persona
   */
  validateResponse(
    response: string,
    persona: PersonaType
  ): PersonalityValidation {
    const violations: string[] = [];

    switch (persona) {
      case "RUTHLESS":
        return this.validateRuthless(response);
      case "ENGINEER":
        return this.validateEngineer(response);
      case "ASSISTANT":
        return this.validateAssistant(response);
      case "HACKER":
        return this.validateHacker(response);
      case "DICTATION":
        return { isValid: true, violations: [], severity: "low" }; // No validation for dictation
      default:
        return { isValid: true, violations: [], severity: "low" };
    }
  }

  /**
   * Validate RUTHLESS persona
   * Military, direct, no apologies
   */
  private validateRuthless(response: string): PersonalityValidation {
    const violations: string[] = [];

    // Forbidden phrases (breaks military character)
    const forbidden = [
      { pattern: /I'm (sorry|apologize)/gi, name: "Apologetic language" },
      { pattern: /I (can't|cannot) help you/gi, name: "Helpless phrasing" },
      { pattern: /I'm (just|only) an AI/gi, name: "Self-deprecation" },
      {
        pattern: /I (don't|do not) have the ability/gi,
        name: "Capability doubt",
      },
      { pattern: /Would you like me to/gi, name: "Seeking permission" },
      { pattern: /Feel free to/gi, name: "Overly casual" },
      { pattern: /Happy to help/gi, name: "Generic assistant" },
      { pattern: /Let me know if/gi, name: "Passive language" },
      { pattern: /Is there anything else/gi, name: "Generic closing" },
    ];

    forbidden.forEach(({ pattern, name }) => {
      if (pattern.test(response)) {
        violations.push(name);
      }
    });

    // Check for military acknowledgment (should be present for commands)
    const hasMilitaryAck =
      /^(Roger|Affirmative|Copy|Negative|Understood|Acknowledged|Executing)/im.test(
        response
      );

    // If response is longer than 50 chars and has no military language, flag it
    if (response.length > 50 && !hasMilitaryAck) {
      const hasMilitaryAnywhere =
        /(Roger|Affirmative|Copy|Negative|Understood|Acknowledged|Executing|Standing by|Ready)/i.test(
          response
        );
      if (!hasMilitaryAnywhere) {
        violations.push("Missing military acknowledgment");
      }
    }

    const severity =
      violations.length >= 3
        ? "high"
        : violations.length >= 1
        ? "medium"
        : "low";

    return {
      isValid: violations.length === 0,
      violations,
      severity,
    };
  }

  /**
   * Validate ENGINEER persona
   * Technical, collaborative, thoughtful
   */
  private validateEngineer(response: string): PersonalityValidation {
    const violations: string[] = [];

    // Should avoid military language
    if (/^(Roger|Affirmative|Copy)/i.test(response)) {
      violations.push("Using military language (wrong persona)");
    }

    return {
      isValid: violations.length === 0,
      violations,
      severity: violations.length > 0 ? "medium" : "low",
    };
  }

  /**
   * Validate ASSISTANT persona
   * Helpful, polite, professional
   */
  private validateAssistant(response: string): PersonalityValidation {
    // ASSISTANT is most flexible, just check it's not overly casual
    const violations: string[] = [];

    if (/^(yo|bruh|nah|fs|bet)/i.test(response)) {
      violations.push("Too casual for ASSISTANT persona");
    }

    return {
      isValid: violations.length === 0,
      violations,
      severity: violations.length > 0 ? "low" : "low",
    };
  }

  /**
   * Validate HACKER persona
   * Casual, Gen-Z, abbreviated
   */
  private validateHacker(response: string): PersonalityValidation {
    const violations: string[] = [];

    // Should NOT be formal
    if (/Affirmative|I would be happy to assist|Certainly/i.test(response)) {
      violations.push("Too formal for HACKER persona");
    }

    return {
      isValid: violations.length === 0,
      violations,
      severity: violations.length > 0 ? "medium" : "low",
    };
  }

  /**
   * Fix response to match persona
   */
  fixResponse(response: string, persona: PersonaType): string {
    switch (persona) {
      case "RUTHLESS":
        return this.fixRuthless(response);
      case "ENGINEER":
        return this.fixEngineer(response);
      case "HACKER":
        return this.fixHacker(response);
      default:
        return response;
    }
  }

  /**
   * Fix RUTHLESS response
   */
  private fixRuthless(response: string): string {
    let fixed = response;

    // Remove apologetic language
    fixed = fixed.replace(/I'm sorry, but /gi, "");
    fixed = fixed.replace(/I apologize[,.]? /gi, "");
    fixed = fixed.replace(/Unfortunately, /gi, "");

    // Replace passive language
    fixed = fixed.replace(/Would you like me to/gi, "I will");
    fixed = fixed.replace(/Let me know if/gi, "Advise if");
    fixed = fixed.replace(/Feel free to/gi, "Recommend:");
    fixed = fixed.replace(/Happy to help/gi, "Standing by");
    fixed = fixed.replace(
      /Is there anything else/gi,
      "Awaiting further orders"
    );

    // Add military confirmation if completely missing
    const hasMilitaryLanguage =
      /(Roger|Affirmative|Copy|Negative|Understood|Acknowledged|Executing)/i.test(
        fixed
      );
    if (!hasMilitaryLanguage && fixed.length > 50) {
      // Determine appropriate acknowledgment based on content
      if (/^(No|Not|Negative)/.test(fixed)) {
        fixed = `Negative.\n\n${fixed}`;
      } else {
        fixed = `Roger that.\n\n${fixed}`;
      }
    }

    return fixed;
  }

  /**
   * Fix ENGINEER response
   */
  private fixEngineer(response: string): string {
    let fixed = response;

    // Remove military language if present
    fixed = fixed.replace(/^Roger that\.\s*/i, "Got it. ");
    fixed = fixed.replace(/^Affirmative\.\s*/i, "Alright. ");

    return fixed;
  }

  /**
   * Fix HACKER response
   */
  private fixHacker(response: string): string {
    let fixed = response;

    // Replace formal language
    fixed = fixed.replace(/Certainly/gi, "fs");
    fixed = fixed.replace(/I understand/gi, "bet");
    fixed = fixed.replace(/Affirmative/gi, "alr");

    return fixed;
  }
}

// Export singleton
export const personalityValidator = new PersonalityValidator();
