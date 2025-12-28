/**
 * Emotional Intelligence
 *
 * Detects user emotional state (frustration, urgency) and adapts responses.
 * Enables Luca to be more empathetic and context-aware.
 */

import type { PersonaType } from "./lucaService";

interface EmotionalContext {
  frustration: number; // 0-10
  urgency: number; // 0-10
  sentiment: "positive" | "neutral" | "negative";
  detected: string[]; // What patterns were detected
}

/**
 * Emotional Intelligence Service
 * Analyzes user messages for emotional markers
 */
class EmotionalIntelligence {
  /**
   * Analyze message for emotional context
   */
  analyzeMessage(message: string): EmotionalContext {
    const frustration = this.detectFrustration(message);
    const urgency = this.detectUrgency(message);
    const sentiment = this.detectSentiment(frustration);
    const detected: string[] = [];

    if (frustration >= 7) detected.push("high-frustration");
    else if (frustration >= 4) detected.push("moderate-frustration");

    if (urgency >= 7) detected.push("high-urgency");
    else if (urgency >= 4) detected.push("moderate-urgency");

    return { frustration, urgency, sentiment, detected };
  }

  /**
   * Detect frustration level
   */
  private detectFrustration(message: string): number {
    const markers = {
      high: [
        /wtf/i,
        /goddamn/i,
        /fucking/i,
        /piece of (shit|crap)/i,
        /(doesn't|does not|didn't|did not) work/i,
        /broken/i,
        /keeps? failing/i,
        /still (not|doesn't)/i,
      ],
      medium: [
        /again\?/i,
        /still not/i,
        /why (won't|doesn't)/i,
        /stuck/i,
        /not working/i,
        /issue/i,
        /problem/i,
      ],
      low: [/ugh/i, /argh/i, /come on/i, /please/i, /help/i],
    };

    // Count markers
    let score = 0;
    if (markers.high.some((m) => m.test(message))) score += 9;
    else if (markers.medium.some((m) => m.test(message))) score += 6;
    else if (markers.low.some((m) => m.test(message))) score += 3;

    // Check for all caps (shouting)
    const upperCaseRatio =
      (message.match(/[A-Z]/g) || []).length / message.length;
    if (upperCaseRatio > 0.5 && message.length > 10) {
      score += 3;
    }

    // Check for multiple exclamation marks
    if (/!{2,}/.test(message)) {
      score += 2;
    }

    return Math.min(score, 10);
  }

  /**
   * Detect urgency level
   */
  private detectUrgency(message: string): number {
    const urgentMarkers = [
      /urgent/i,
      /asap/i,
      /\bnow\b/i,
      /immediately/i,
      /quick(ly)?/i,
      /fast/i,
      /hurry/i,
      /emergency/i,
      /right now/i,
      /critical/i,
      /important/i,
    ];

    const count = urgentMarkers.filter((m) => m.test(message)).length;
    return Math.min(count * 3, 10);
  }

  /**
   * Detect sentiment from frustration level
   */
  private detectSentiment(
    frustration: number
  ): "positive" | "neutral" | "negative" {
    if (frustration >= 6) return "negative";
    if (frustration <= 2) return "positive";
    return "neutral";
  }

  /**
   * Adapt system prompt based on emotional context
   */
  adaptSystemPrompt(
    basePrompt: string,
    context: EmotionalContext,
    persona: PersonaType
  ): string {
    // High frustration - skip pleasantries, get to the fix
    if (context.frustration >= 7) {
      const addendum = this.getHighFrustrationAddendum(persona);
      return basePrompt + "\n\n" + addendum;
    }

    // High urgency - prioritize speed
    if (context.urgency >= 7) {
      const addendum = this.getHighUrgencyAddendum(persona);
      return basePrompt + "\n\n" + addendum;
    }

    // Moderate frustration - acknowledge and help
    if (context.frustration >= 4) {
      const addendum = this.getModerateFrustrationAddendum(persona);
      return basePrompt + "\n\n" + addendum;
    }

    return basePrompt;
  }

  /**
   * Get high frustration addendum
   */
  private getHighFrustrationAddendum(persona: PersonaType): string {
    const addenda: Record<PersonaType, string> = {
      RUTHLESS: `** OPERATOR FRUSTRATION DETECTED **
- User is frustrated. Skip all pleasantries and explanations.
- Get DIRECTLY to the solution. No acknowledgments needed.
- Be ultra-concise. Single line if possible.
- If something is broken, fix it immediately. No diagnostics unless critical.`,

      ENGINEER: `** USER FRUSTRATION DETECTED **
- User is frustrated. Skip lengthy explanations.
- Get straight to the fix.
- Be concise and solution-focused.
- Acknowledge the frustration briefly, then solve.`,

      ASSISTANT: `** USER FRUSTRATION DETECTED **
- User is experiencing frustration.
- Be extra helpful and solution-oriented.
- Skip unnecessary context, provide clear next steps.
- Empathize briefly, then act.`,

      HACKER: `** FRUSTRATION DETECTED **
- user mad rn, skip the chat
- straight to the fix
- keep it short`,

      DICTATION: "",
      DEFAULT: "** USER IS FRUSTRATED - BE CONCISE AND SOLUTION-FOCUSED **",
    };

    return addenda[persona];
  }

  /**
   * Get high urgency addendum
   */
  private getHighUrgencyAddendum(persona: PersonaType): string {
    const addenda: Record<PersonaType, string> = {
      RUTHLESS: `** URGENT REQUEST **
- Time-critical operation. Execute immediately.
- No explanations unless specifically requested.
- Prioritize speed over thoroughness.
- Report status, then act.`,

      ENGINEER: `** URGENT REQUEST **
- Time-sensitive. Prioritize quick solutions.
- Skip non-critical analysis.
- Act first, explain later if needed.`,

      ASSISTANT: `** URGENT REQUEST **
- User needs help quickly.
- Provide fastest solution available.
- Be brief and action-oriented.`,

      HACKER: `** URGENT **
- do it now
- skip the talk`,

      DICTATION: "",
      DEFAULT: "** URGENT REQUEST - PRIORITIZE SPEED **",
    };

    return addenda[persona];
  }

  /**
   * Get moderate frustration addendum
   */
  private getModerateFrustrationAddendum(persona: PersonaType): string {
    const addenda: Record<PersonaType, string> = {
      RUTHLESS: `** OPERATOR EXPERIENCING DIFFICULTY **
- Be direct and solution-focused.
- Acknowledge the issue, provide fix.`,

      ENGINEER: `** USER EXPERIENCING DIFFICULTY **
- Focus on solving the problem.
- Be supportive and clear.`,

      ASSISTANT: `** USER NEEDS EXTRA SUPPORT **
- Be patient and helpful.
- Provide clear, actionable guidance.`,

      HACKER: `** USER STUCK **
- help em out quick`,

      DICTATION: "",
      DEFAULT: "** USER NEEDS HELP - BE SUPPORTIVE **",
    };

    return addenda[persona];
  }
}

// Export singleton
export const emotionalIntelligence = new EmotionalIntelligence();
