import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { SkillScore, LearningDomain } from "../types/learning";

const STORAGE_KEY = "prism-learning-state";

interface LearningState {
  currentSkills: SkillScore[];
  activePlanId: string | null;
  searchHistory: string[];
  selectedDomains: LearningDomain[];
  lastAssessmentAt: string | null;
}

interface LearningContextValue extends LearningState {
  setSkills: (skills: SkillScore[]) => void;
  setActivePlan: (planId: string | null) => void;
  addSearchQuery: (query: string) => void;
  setSelectedDomains: (domains: LearningDomain[]) => void;
  setLastAssessment: (date: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: LearningState = {
  currentSkills: [],
  activePlanId: null,
  searchHistory: [],
  selectedDomains: [],
  lastAssessmentAt: null,
};

const LearningCtx = createContext<LearningContextValue | null>(null);

function loadState(): LearningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: LearningState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearningState>(loadState);

  // Autosave to localStorage every 30s
  useEffect(() => {
    const interval = setInterval(() => saveState(state), 30_000);
    return () => clearInterval(interval);
  }, [state]);

  // Also save on unmount
  useEffect(() => {
    return () => saveState(state);
  }, [state]);

  const setSkills = useCallback((skills: SkillScore[]) => {
    setState((s) => ({ ...s, currentSkills: skills }));
  }, []);

  const setActivePlan = useCallback((planId: string | null) => {
    setState((s) => ({ ...s, activePlanId: planId }));
  }, []);

  const addSearchQuery = useCallback((query: string) => {
    setState((s) => ({
      ...s,
      searchHistory: [query, ...s.searchHistory.filter((q) => q !== query)].slice(0, 20),
    }));
  }, []);

  const setSelectedDomains = useCallback((domains: LearningDomain[]) => {
    setState((s) => ({ ...s, selectedDomains: domains }));
  }, []);

  const setLastAssessment = useCallback((date: string) => {
    setState((s) => ({ ...s, lastAssessmentAt: date }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <LearningCtx.Provider
      value={{
        ...state,
        setSkills,
        setActivePlan,
        addSearchQuery,
        setSelectedDomains,
        setLastAssessment,
        reset,
      }}
    >
      {children}
    </LearningCtx.Provider>
  );
}

export function useLearningContext(): LearningContextValue {
  const ctx = useContext(LearningCtx);
  if (!ctx) throw new Error("useLearningContext must be used inside LearningProvider");
  return ctx;
}
