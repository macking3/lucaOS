/**
 * Conversation Types
 * Type definitions for conversational onboarding
 */

export interface Message {
  id: string;
  role: "luca" | "user";
  content: string;
  timestamp: Date;
  extractedData?: Partial<OperatorProfile>;
}

export interface ConversationState {
  messages: Message[];
  isProcessing: boolean;
  mode: "text" | "voice";
  currentTopic: string;
  profile: Partial<OperatorProfile>;
}

// Placeholder for OperatorProfile (will be expanded in Phase 3)
export interface OperatorProfile {
  identity: {
    name: string;
    designation?: string;
  };
  professional?: {
    field?: string;
    role?: string;
    proficiency?: string;
  };
  workStyle?: {
    hours?: string;
    style?: string;
  };
  communication?: {
    preferredPersona?: string;
    detailLevel?: string;
    tone?: string;
  };
  goals?: {
    primary?: string[];
    painPoints?: string[];
  };
}
