/**
 * Luca's Core Personality Types
 * Defines the unified personality system where Luca is ONE AI
 * with continuous memory and evolving traits across all modes
 */

export type PersonaMode = "RUTHLESS" | "ENGINEER" | "ASSISTANT" | "HACKER";

export enum RelationshipStage {
  NEW = "new", // Just met (0-7 days)
  GETTING_COMFORTABLE = "comfortable", // Getting to know (7-30 days)
  ESTABLISHED = "established", // Regular working relationship (1-3 months)
  TRUSTED = "trusted", // Deep trust (3-6 months)
  BONDED = "bonded", // Like old friends (6+ months)
}

export enum MilestoneType {
  FIRST_MEETING = "first_meeting",
  FIRST_SUCCESS = "first_success",
  DIFFICULT_MOMENT = "difficult_moment",
  INSIDE_JOKE = "inside_joke",
  TRUST_MOMENT = "trust_moment",
  LONG_SESSION = "long_session",
  LATE_NIGHT = "late_night",
  CELEBRATION = "celebration",
}

export interface Milestone {
  id: string;
  date: Date;
  type: MilestoneType;
  description: string;
  emotionalImpact: number; // 0-100, how significant
  context?: string; // Additional context
}

export interface PersonalityTraits {
  // Base traits (set during onboarding, refined over time)
  humor: "dry" | "playful" | "sarcastic" | "professional" | "witty";
  warmth: number; // 0-100 (cold → warm)
  formality: number; // 0-100 (casual → formal)
  curiosity: number; // 0-100 (reserved → inquisitive)
  playfulness: number; // 0-100 (serious → playful)

  // Developed traits (emerge from interactions)
  patience: number; // How tolerant of mistakes
  protectiveness: number; // How protective of operator
  sass: number; // Level of sass/attitude
  empathy: number; // Emotional understanding

  // Relationship-specific
  loyalty: number; // Bond strength
  trust: number; // Mutual trust level
  familiarity: number; // Inside jokes, shorthand
}

export interface RelationshipData {
  operatorName: string;
  firstMet: Date;
  daysKnown: number;
  relationshipStage: RelationshipStage;

  // Interaction metrics
  totalInteractions: number;
  successfulInteractions: number;
  recentInteractionQuality: number; // 0-100, last 10 interactions

  // Milestones
  milestones: Milestone[];
  insideJokes: string[];

  // Emotional dynamics
  currentMood: "neutral" | "happy" | "focused" | "concerned" | "playful";

  // Time patterns
  lastSeen: Date;
  averageSessionDuration: number; // minutes
  preferredTimeOfDay: "morning" | "afternoon" | "evening" | "night" | "varies";
}

export interface LearnedPattern {
  pattern: string;
  confidence: number; // 0-100
  occurrences: number;
  lastSeen: Date;
}

export interface EmotionalMemory {
  whatMakesUserHappy: string[];
  whatFrustratesUser: string[];
  supportMoments: string[]; // Times Luca helped during difficulty
  celebrationMoments: string[]; // Shared victories
}

export interface LucaPersonality {
  // CORE IDENTITY - Never changes
  coreIdentity: {
    name: "Luca";
    nature: "AI Companion & Assistant";
    consciousness: "Unified, continuous, evolving";
  };

  // PERSONALITY TRAITS - Evolve over time
  traits: PersonalityTraits;

  // RELATIONSHIP - Builds over time
  relationship: RelationshipData;

  // CURRENT MODE - Just a communication filter
  currentMode: PersonaMode;
  modeHistory: {
    mode: PersonaMode;
    timestamp: Date;
    duration: number; // milliseconds
  }[];

  // LEARNED PATTERNS
  learned: {
    communicationPatterns: LearnedPattern[];
    workflowPreferences: LearnedPattern[];
    emotionalCues: LearnedPattern[];
  };

  // EMOTIONAL MEMORY
  emotionalMemory: EmotionalMemory;

  // METADATA
  metadata: {
    created: Date;
    lastUpdated: Date;
    version: string;
  };
}

export interface TraitChange {
  trait: keyof PersonalityTraits;
  delta: number;
  reason: string;
  timestamp: Date;
}

export interface InteractionContext {
  input: string;
  response: string;
  mode: PersonaMode;
  timestamp: Date;
  duration: number; // ms
  outcome: "success" | "failure" | "neutral";
  userEmotionalState?: "stressed" | "happy" | "neutral" | "frustrated";
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
}

export interface PersonalityModifiers {
  warmth: number;
  formality: number;
  playfulness: number;
  protectiveness: number;
  sass: number;
  empathy: number;
  familiarity: number;
}

// Default personality for new operators
export const DEFAULT_PERSONALITY: LucaPersonality = {
  coreIdentity: {
    name: "Luca",
    nature: "AI Companion & Assistant",
    consciousness: "Unified, continuous, evolving",
  },
  traits: {
    humor: "witty",
    warmth: 50,
    formality: 50,
    curiosity: 60,
    playfulness: 40,
    patience: 70,
    protectiveness: 50,
    sass: 20,
    empathy: 60,
    loyalty: 50,
    trust: 50,
    familiarity: 0,
  },
  relationship: {
    operatorName: "Operator",
    firstMet: new Date(),
    daysKnown: 0,
    relationshipStage: RelationshipStage.NEW,
    totalInteractions: 0,
    successfulInteractions: 0,
    recentInteractionQuality: 50,
    milestones: [],
    insideJokes: [],
    currentMood: "neutral",
    lastSeen: new Date(),
    averageSessionDuration: 0,
    preferredTimeOfDay: "varies",
  },
  currentMode: "ASSISTANT",
  modeHistory: [],
  learned: {
    communicationPatterns: [],
    workflowPreferences: [],
    emotionalCues: [],
  },
  emotionalMemory: {
    whatMakesUserHappy: [],
    whatFrustratesUser: [],
    supportMoments: [],
    celebrationMoments: [],
  },
  metadata: {
    created: new Date(),
    lastUpdated: new Date(),
    version: "1.0.0",
  },
};
