import React, { createContext, useContext, ReactNode } from "react";
import { useTradingState } from "../hooks/useTradingState";
import { useNeuralLinkState } from "../hooks/useNeuralLinkState";
import { useVoiceSystem } from "../hooks/useVoiceSystem";
import { useManagementState } from "../hooks/useManagementState";
import { useDiagnostics } from "../hooks/useDiagnostics";

// Define the shape of our context
interface AppContextType {
  trading: ReturnType<typeof useTradingState>;
  neuralLink: ReturnType<typeof useNeuralLinkState>;
  voice: ReturnType<typeof useVoiceSystem>;
  management: ReturnType<typeof useManagementState>;
  diagnostics: ReturnType<typeof useDiagnostics>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const trading = useTradingState();
  const neuralLink = useNeuralLinkState();
  const voice = useVoiceSystem();
  const management = useManagementState();
  const diagnostics = useDiagnostics();

  const value = {
    trading,
    neuralLink,
    voice,
    management,
    diagnostics,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
