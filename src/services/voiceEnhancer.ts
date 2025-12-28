/**
 * Voice Enhancer
 *
 * Adds persona-appropriate voice markers to responses:
 * - Military acknowledgments for RUTHLESS
 * - Thoughtful transitions for ENGINEER
 * - Polite confirmations for ASSISTANT
 * - Casual slang for HACKER
 */

import type { PersonaType } from "./lucaService";

interface VoiceProfile {
  acknowledgments: string[];
  signOff: string[];
  transitions: string[];
}

const VOICE_PROFILES: Record<PersonaType, VoiceProfile> = {
  RUTHLESS: {
    acknowledgments: [
      "Roger that",
      "Affirmative",
      "Copy",
      "Understood",
      "Acknowledged",
    ],
    signOff: ["Standing by", "Ready for next directive", "Awaiting orders"],
    transitions: ["Proceeding to", "Executing", "Initiating", "Engaging"],
  },
  ENGINEER: {
    acknowledgments: [
      "Got it",
      "Analyzing",
      "Reviewing",
      "On it",
      "Makes sense",
    ],
    signOff: [
      "Let me know if you need refinements",
      "Happy to iterate on this",
    ],
    transitions: ["Let me", "I'll", "Checking", "Looking at"],
  },
  ASSISTANT: {
    acknowledgments: [
      "Of course",
      "Certainly",
      "Absolutely",
      "I'd be happy to",
    ],
    signOff: [
      "Let me know if you need anything else",
      "Feel free to ask if you have questions",
    ],
    transitions: ["I can help with", "I'll assist with", "I'm here to"],
  },
  HACKER: {
    acknowledgments: ["alr", "bet", "fs", "say less", "gotchu"],
    signOff: ["lmk if u need smth", "hmu if u got questions"],
    transitions: ["gonna", "bouta", "checking", "peeping"],
  },
  DICTATION: {
    acknowledgments: [], // No voice enhancement for dictation
    signOff: [],
    transitions: [],
  },
  DEFAULT: {
    acknowledgments: ["Understood", "Got it", "Okay"],
    signOff: [],
    transitions: [],
  },
};

type TaskType = "command" | "query" | "conversation";

/**
 * Voice Enhancer Service
 * Adds appropriate voice markers based on persona and task type
 */
class VoiceEnhancer {
  /**
   * Enhance response with persona-appropriate voice markers
   */
  enhanceVoice(
    response: string,
    persona: PersonaType,
    taskType: TaskType = "query"
  ): string {
    const profile = VOICE_PROFILES[persona];

    // Skip for DICTATION
    if (persona === "DICTATION") return response;

    let enhanced = response;

    // Add acknowledgment if missing (for commands)
    if (taskType === "command" && !this.hasAcknowledgment(response, profile)) {
      const ack = this.selectRandom(profile.acknowledgments);
      enhanced = `${ack}.\n\n${enhanced}`;
    }

    // For queries, optionally add acknowledgment if response is very long
    if (
      taskType === "query" &&
      response.length > 500 &&
      !this.hasAcknowledgment(response, profile)
    ) {
      const ack = this.selectRandom(profile.acknowledgments);
      enhanced = `${ack}.\n\n${enhanced}`;
    }

    return enhanced;
  }

  /**
   * Check if response already has an acknowledgment
   */
  private hasAcknowledgment(text: string, profile: VoiceProfile): boolean {
    const firstLine = text.split("\n")[0].toLowerCase();
    return profile.acknowledgments.some((ack) =>
      firstLine.includes(ack.toLowerCase())
    );
  }

  /**
   * Select random item from array
   */
  private selectRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Detect task type from user message
   */
  detectTaskType(message: string): TaskType {
    // Command indicators
    const commandPatterns = [
      /^(run|execute|deploy|start|stop|kill|restart|install|update)/i,
      /^(open|close|switch|navigate|go to)/i,
      /^(send|create|delete|remove|add)/i,
      /now$/i, // "do X now" is a command
      /!$/, // "Do this!" is a command
    ];

    if (commandPatterns.some((p) => p.test(message))) {
      return "command";
    }

    // Query indicators
    const queryPatterns = [
      /^(what|where|when|why|how|who)/i,
      /\?$/,
      /^(show|tell|explain|describe)/i,
    ];

    if (queryPatterns.some((p) => p.test(message))) {
      return "query";
    }

    // Default to conversation
    return "conversation";
  }
}

// Export singleton
export const voiceEnhancer = new VoiceEnhancer();
