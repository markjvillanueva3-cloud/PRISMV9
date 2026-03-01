/**
 * L8-P1-MS2 P0-U14: Learning State Context
 * Shared state: currentSkills, activePath, searchHistory. localStorage persistence.
 */
import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { SkillLevel, LearningPlan } from '../types/learning';

interface LearningState {
  currentSkills: SkillLevel[];
  activePath: LearningPlan | null;
  searchHistory: string[];
  lastAssessmentDate: string | null;
}

type Action =
  | { type: 'SET_SKILLS'; skills: SkillLevel[] }
  | { type: 'SET_PATH'; plan: LearningPlan }
  | { type: 'ADD_SEARCH'; query: string }
  | { type: 'CLEAR_SEARCH_HISTORY' }
  | { type: 'SET_ASSESSMENT_DATE'; date: string };

const STORAGE_KEY = 'prism-learning-state';

const initialState: LearningState = {
  currentSkills: [],
  activePath: null,
  searchHistory: [],
  lastAssessmentDate: null,
};

function loadState(): LearningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
}

function reducer(state: LearningState, action: Action): LearningState {
  switch (action.type) {
    case 'SET_SKILLS':
      return { ...state, currentSkills: action.skills };
    case 'SET_PATH':
      return { ...state, activePath: action.plan };
    case 'ADD_SEARCH': {
      const history = [action.query, ...state.searchHistory.filter(q => q !== action.query)].slice(0, 20);
      return { ...state, searchHistory: history };
    }
    case 'CLEAR_SEARCH_HISTORY':
      return { ...state, searchHistory: [] };
    case 'SET_ASSESSMENT_DATE':
      return { ...state, lastAssessmentDate: action.date };
    default:
      return state;
  }
}

const LearningContext = createContext<{
  state: LearningState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <LearningContext.Provider value={{ state, dispatch }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearningContext() {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearningContext must be used within LearningProvider');
  return ctx;
}
