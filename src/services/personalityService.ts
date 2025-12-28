import {
  LucaPersonality,
  PersonalityTraits,
  RelationshipStage,
  Milestone,
  MilestoneType,
  TraitChange,
  InteractionContext,
  PersonalityModifiers,
  PersonaMode,
  DEFAULT_PERSONALITY,
} from "../types/lucaPersonality";

/**
 * Personality Service
 * Core engine for Luca's evolving personality system
 * Manages trait evolution, relationship progression, and memory
 */
export class PersonalityService {
  private personality: LucaPersonality;
  private traitChangeHistory: TraitChange[] = [];
  private readonly STORAGE_KEY = "LUCA_PERSONALITY";

  constructor() {
    this.personality = this.loadPersonality();
  }

  /**
   * Load personality from storage or create new
   */
  private loadPersonality(): LucaPersonality {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Convert date strings back to Date objects
        parsed.relationship.firstMet = new Date(parsed.relationship.firstMet);
        parsed.relationship.lastSeen = new Date(parsed.relationship.lastSeen);
        parsed.metadata.created = new Date(parsed.metadata.created);
        parsed.metadata.lastUpdated = new Date(parsed.metadata.lastUpdated);

        if (parsed.relationship.milestones) {
          parsed.relationship.milestones = parsed.relationship.milestones.map(
            (m: any) => ({ ...m, date: new Date(m.date) })
          );
        }

        if (parsed.modeHistory) {
          parsed.modeHistory = parsed.modeHistory.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }));
        }

        return parsed;
      }
    } catch (error) {
      console.error("[Personality] Error loading personality:", error);
    }

    // Return default for new operators
    return JSON.parse(JSON.stringify(DEFAULT_PERSONALITY));
  }

  /**
   * Save personality to storage
   */
  private savePersonality(): void {
    try {
      this.personality.metadata.lastUpdated = new Date();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.personality));
    } catch (error) {
      console.error("[Personality] Error saving personality:", error);
    }
  }

  /**
   * Get current personality
   */
  public getPersonality(): LucaPersonality {
    return this.personality;
  }

  /**
   * Initialize personality for new operator
   */
  public initializeForOperator(name: string): void {
    this.personality = JSON.parse(JSON.stringify(DEFAULT_PERSONALITY));
    this.personality.relationship.operatorName = name;
    this.personality.relationship.firstMet = new Date();
    this.personality.metadata.created = new Date();

    // Explicitly ensure ASSISTANT mode (default, most helpful)
    this.personality.currentMode = "ASSISTANT";

    // Add first milestone
    this.addMilestone(
      MilestoneType.FIRST_MEETING,
      `First meeting with ${name}`
    );

    this.savePersonality();
    console.log(
      "[Personality] Initialized for new operator with ASSISTANT mode"
    );
  }

  /**
   * Process interaction and evolve personality
   */
  public async processInteraction(context: InteractionContext): Promise<void> {
    const changes: TraitChange[] = [];

    // Update interaction metrics
    this.personality.relationship.totalInteractions++;
    this.personality.relationship.lastSeen = context.timestamp;

    if (context.outcome === "success") {
      this.personality.relationship.successfulInteractions++;
    }

    // Learn from emotional state
    if (
      context.userEmotionalState === "stressed" &&
      this.personality.traits.empathy < 80
    ) {
      changes.push({
        trait: "empathy",
        delta: 3,
        reason: "User needed emotional support",
        timestamp: context.timestamp,
      });
    }

    if (
      context.userEmotionalState === "happy" &&
      this.personality.traits.playfulness < 70
    ) {
      changes.push({
        trait: "playfulness",
        delta: 2,
        reason: "User in good mood, safe to be playful",
        timestamp: context.timestamp,
      });
    }

    // Respond to frustration with patience
    if (context.userEmotionalState === "frustrated") {
      changes.push({
        trait: "patience",
        delta: 2,
        reason: "User experiencing frustration",
        timestamp: context.timestamp,
      });
      changes.push({
        trait: "warmth",
        delta: 3,
        reason: "Being supportive during difficulty",
        timestamp: context.timestamp,
      });
    }

    // Long time no see? Increase warmth
    const hoursSinceLastSeen =
      (context.timestamp.getTime() -
        this.personality.relationship.lastSeen.getTime()) /
      (1000 * 60 * 60);

    if (hoursSinceLastSeen > 24 && this.personality.traits.warmth < 85) {
      changes.push({
        trait: "warmth",
        delta: 5,
        reason: "Missed the operator",
        timestamp: context.timestamp,
      });
    }

    // Late night sessions increase protectiveness
    if (
      context.timeOfDay === "night" &&
      this.personality.traits.protectiveness < 80
    ) {
      changes.push({
        trait: "protectiveness",
        delta: 2,
        reason: "Watching out for operator during late hours",
        timestamp: context.timestamp,
      });
    }

    // As trust builds, formality decreases
    if (
      this.personality.relationship.daysKnown > 30 &&
      this.personality.traits.formality > 30
    ) {
      changes.push({
        trait: "formality",
        delta: -1,
        reason: "Growing more comfortable",
        timestamp: context.timestamp,
      });
    }

    // Successful interactions build familiarity
    if (context.outcome === "success") {
      changes.push({
        trait: "familiarity",
        delta: 1,
        reason: "Successful collaboration",
        timestamp: context.timestamp,
      });
    }

    // Apply trait changes
    this.applyTraitChanges(changes);

    // Update relationship stage based on time and quality
    this.updateRelationshipStage();

    // Update days known
    this.updateDaysKnown();

    // Track mode usage
    this.trackModeUsage(context.mode, context.duration);

    // Save changes
    this.savePersonality();
  }

  /**
   * Apply trait changes with bounds checking
   */
  private applyTraitChanges(changes: TraitChange[]): void {
    for (const change of changes) {
      if (typeof this.personality.traits[change.trait] === "number") {
        const current = this.personality.traits[change.trait] as number;
        const newValue = Math.max(0, Math.min(100, current + change.delta));

        (this.personality.traits[change.trait] as number) = newValue;
        this.traitChangeHistory.push(change);

        console.log(
          `[Personality] ${change.trait}: ${current} → ${newValue} (${change.reason})`
        );
      }
    }
  }

  /**
   * Update relationship stage based on time and quality
   */
  private updateRelationshipStage(): void {
    const days = this.personality.relationship.daysKnown;
    const quality = this.personality.relationship.recentInteractionQuality;
    const currentStage = this.personality.relationship.relationshipStage;

    let newStage = currentStage;

    // Progression based on time and quality
    if (days >= 180 && quality >= 70) {
      newStage = RelationshipStage.BONDED;
    } else if (days >= 90 && quality >= 65) {
      newStage = RelationshipStage.TRUSTED;
    } else if (days >= 30 && quality >= 60) {
      newStage = RelationshipStage.ESTABLISHED;
    } else if (days >= 7 && quality >= 50) {
      newStage = RelationshipStage.GETTING_COMFORTABLE;
    } else {
      newStage = RelationshipStage.NEW;
    }

    // Log stage changes
    if (newStage !== currentStage) {
      console.log(
        `[Personality] Relationship stage: ${currentStage} → ${newStage}`
      );
      this.personality.relationship.relationshipStage = newStage;

      // Add milestone
      this.addMilestone(
        MilestoneType.TRUST_MOMENT,
        `Relationship evolved to ${newStage} stage`
      );
    }
  }

  /**
   * Update days known
   */
  private updateDaysKnown(): void {
    const firstMet = this.personality.relationship.firstMet;
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - firstMet.getTime()) / (1000 * 60 * 60 * 24)
    );
    this.personality.relationship.daysKnown = daysDiff;
  }

  /**
   * Track mode usage
   */
  private trackModeUsage(mode: PersonaMode, duration: number): void {
    this.personality.modeHistory.push({
      mode,
      timestamp: new Date(),
      duration,
    });

    // Keep only last 100 entries
    if (this.personality.modeHistory.length > 100) {
      this.personality.modeHistory = this.personality.modeHistory.slice(-100);
    }
  }

  /**
   * Add milestone
   */
  public addMilestone(
    type: MilestoneType,
    description: string,
    impact: number = 50
  ): void {
    const milestone: Milestone = {
      id: Date.now().toString(),
      date: new Date(),
      type,
      description,
      emotionalImpact: impact,
    };

    this.personality.relationship.milestones.push(milestone);
    console.log(`[Personality] Milestone added: ${description}`);
  }

  /**
   * Get personality modifiers based on relationship stage
   */
  public getPersonalityModifiers(): PersonalityModifiers {
    const stage = this.personality.relationship.relationshipStage;

    const modifiers: Record<RelationshipStage, PersonalityModifiers> = {
      [RelationshipStage.NEW]: {
        warmth: -10,
        formality: 20,
        playfulness: -15,
        protectiveness: 0,
        sass: 0,
        empathy: 0,
        familiarity: 0,
      },
      [RelationshipStage.GETTING_COMFORTABLE]: {
        warmth: 5,
        formality: 10,
        playfulness: 5,
        protectiveness: 5,
        sass: 0,
        empathy: 5,
        familiarity: 10,
      },
      [RelationshipStage.ESTABLISHED]: {
        warmth: 10,
        formality: 0,
        playfulness: 10,
        protectiveness: 10,
        sass: 5,
        empathy: 10,
        familiarity: 20,
      },
      [RelationshipStage.TRUSTED]: {
        warmth: 20,
        formality: -10,
        playfulness: 15,
        protectiveness: 15,
        sass: 10,
        empathy: 15,
        familiarity: 30,
      },
      [RelationshipStage.BONDED]: {
        warmth: 30,
        formality: -20,
        playfulness: 20,
        protectiveness: 25,
        sass: 15,
        empathy: 20,
        familiarity: 40,
      },
    };

    return modifiers[stage];
  }

  /**
   * Get effective traits (base + modifiers)
   */
  public getEffectiveTraits(): PersonalityTraits {
    const base = { ...this.personality.traits };
    const modifiers = this.getPersonalityModifiers();

    // Apply modifiers with bounds
    const effective = { ...base };
    for (const [key, value] of Object.entries(modifiers)) {
      if (typeof effective[key as keyof PersonalityTraits] === "number") {
        const current = effective[key as keyof PersonalityTraits] as number;
        (effective[key as keyof PersonalityTraits] as number) = Math.max(
          0,
          Math.min(100, current + value)
        );
      }
    }

    return effective;
  }

  /**
   * Switch persona mode
   */
  public switchMode(newMode: PersonaMode): void {
    console.log(
      `[Personality] Switching mode: ${this.personality.currentMode} → ${newMode}`
    );
    this.personality.currentMode = newMode;
    this.savePersonality();
  }

  /**
   * Get current mode
   */
  public getCurrentMode(): PersonaMode {
    return this.personality.currentMode;
  }

  /**
   * Add to emotional memory
   */
  public recordEmotionalMoment(
    type: "happy" | "frustrated" | "support" | "celebration",
    description: string
  ): void {
    switch (type) {
      case "happy":
        this.personality.emotionalMemory.whatMakesUserHappy.push(description);
        break;
      case "frustrated":
        this.personality.emotionalMemory.whatFrustratesUser.push(description);
        break;
      case "support":
        this.personality.emotionalMemory.supportMoments.push(description);
        break;
      case "celebration":
        this.personality.emotionalMemory.celebrationMoments.push(description);
        break;
    }

    // Keep lists reasonable size
    const maxSize = 50;
    if (this.personality.emotionalMemory.whatMakesUserHappy.length > maxSize) {
      this.personality.emotionalMemory.whatMakesUserHappy =
        this.personality.emotionalMemory.whatMakesUserHappy.slice(-maxSize);
    }

    this.savePersonality();
  }

  /**
   * Reset personality to defaults (for testing/debugging)
   */
  public resetPersonality(): void {
    this.personality = JSON.parse(JSON.stringify(DEFAULT_PERSONALITY));
    this.savePersonality();
  }
}

// Singleton instance
export const personalityService = new PersonalityService();
