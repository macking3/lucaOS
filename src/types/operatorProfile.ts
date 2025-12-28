import { Message } from "./conversation";

/**
 * Enhanced Operator Profile
 * Stores learned information about the operator
 */
export interface OperatorProfile {
  // Identity (from onboarding)
  identity: {
    name: string;
    designation?: string;
  };

  // Personality traits (extracted from conversation)
  personality: {
    communicationStyle?: "direct" | "detailed" | "casual" | "mixed";
    workStyle?: "focused" | "multitasking" | "flexible";
    tone?: "formal" | "casual" | "professional";
    preferences?: string[]; // Free-form preferences
    traits?: string[]; // Personality traits mentioned
  };

  // AI assistant preferences
  assistantPreferences: {
    preferredPersona?: "ASSISTANT" | "RUTHLESS" | "ENGINEER" | "HACKER";
    helpStyle?: "proactive" | "reactive" | "balanced";
    detailLevel?: "minimal" | "balanced" | "verbose";
    communicationFormat?: string[]; // e.g., ["bullet points", "concise"]
  };

  // Work context (optional, extracted if shared)
  workContext?: {
    profession?: string;
    interests?: string[];
    currentProjects?: string[];
    skillLevel?: string; // e.g., "beginner", "intermediate", "expert"
  };

  // Learning metadata
  metadata: {
    profileCreated: Date;
    lastUpdated: Date;
    conversationCount: number;
    privacyLevel: "minimal" | "balanced" | "full";
    confidence: number; // 0-100, how confident we are in extracted data
    extractedFrom?: string[]; // Which conversations data came from
  };

  // Raw conversation excerpts (for context)
  conversationExcerpts?: {
    text: string;
    extractedInfo: string;
    timestamp: Date;
  }[];
}

/**
 * Profile extraction result from AI analysis
 */
export interface ProfileExtractionResult {
  personality?: {
    communicationStyle?: string;
    workStyle?: string;
    tone?: string;
    preferences?: string[];
    traits?: string[];
  };
  assistantPreferences?: {
    helpStyle?: string;
    detailLevel?: string;
    communicationFormat?: string[];
  };
  workContext?: {
    profession?: string;
    interests?: string[];
    skillLevel?: string;
  };
  confidence: number;
  extractedInfo: string[];
}
