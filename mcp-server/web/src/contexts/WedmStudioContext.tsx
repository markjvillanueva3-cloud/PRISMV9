/**
 * WedmStudioContext.tsx — Wire EDM Studio State Management
 * WEDM-MS0 U-WEDM04
 *
 * Split into two contexts to minimize re-renders:
 *   - WedmNavigationContext: wizard step, step statuses, stale marking
 *   - WedmDataContext: per-step result slots, setStepData, clearStep
 *
 * Uses simple useState + useCallback (NOT useReducer) per PpgContext pattern.
 * Persistence: sessionStorage with IndexedDB fallback for large payloads.
 * Debounce-on-mutation autosave (2s after last dispatch).
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type {
  WedmStep,
  StepStatus,
  InputMethod,
  ImportResult,
  ClassifiedFeature,
  FeasibilityResult,
  MaterialMachineWireSelection,
  WCSResult,
  ToolpathResult,
  OptimizeResult,
  ProgramResult,
  WEDM_STEPS,
} from "../types/wedmStudio";

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "prism-wedm-studio";
const IDB_STORE = "wedm-sessions";
const IDB_DB = "prism-wedm";
const IDB_VERSION = 1;
const AUTOSAVE_DEBOUNCE_MS = 2_000;
const MAX_SESSION_STORAGE_BYTES = 3_500_000; // warn at 3.5MB
const MAX_STEP_DATA_BYTES = 262_144; // 256KB per step

// Steps that depend on earlier steps (for stale marking)
const STEP_DEPENDENCIES: Record<WedmStep, WedmStep[]> = {
  import: [],
  review: ["import"],
  wcs: ["import", "review"],
  toolpath: ["import", "review", "wcs"],
  optimize: ["import", "review", "wcs", "toolpath"],
  program: ["import", "review", "wcs", "toolpath", "optimize"],
};

// ============================================================================
// JOB RECORD (persisted shape)
// ============================================================================

export interface QualityEvent {
  type: string;
  timestamp: string;
  details: string;
}

export interface WedmJobRecord {
  sessionId: string;
  jobName: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
  currentStep: WedmStep;
  stepStatus: Record<WedmStep, StepStatus>;
  inputMethod: InputMethod;
  steps: {
    import?: ImportResult;
    classification?: ClassifiedFeature[];
    feasibility?: FeasibilityResult;
    selection?: MaterialMachineWireSelection;
    wcs?: WCSResult;
    toolpath?: ToolpathResult;
    optimize?: OptimizeResult;
    program?: ProgramResult;
  };
  fileName?: string;
  fileSizeBytes?: number;
  materialCert?: string;
  programRevision?: string;
  qualityEvents: QualityEvent[];
}

// ============================================================================
// NAVIGATION CONTEXT
// ============================================================================

interface NavigationContextValue {
  currentStep: WedmStep;
  stepStatus: Record<WedmStep, StepStatus>;
  inputMethod: InputMethod;
  sessionId: string;
  setCurrentStep: (step: WedmStep) => void;
  setInputMethod: (method: InputMethod) => void;
  markStepComplete: (step: WedmStep) => void;
  markStepError: (step: WedmStep) => void;
  markStale: (fromStep: WedmStep) => void;
  resetWizard: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

// ============================================================================
// DATA CONTEXT
// ============================================================================

type StepDataKey = keyof WedmJobRecord["steps"];

interface DataContextValue {
  steps: WedmJobRecord["steps"];
  fileName?: string;
  fileSizeBytes?: number;
  setStepData: <K extends StepDataKey>(key: K, data: WedmJobRecord["steps"][K]) => void;
  clearStep: (key: StepDataKey) => void;
  setFileInfo: (name: string, size: number) => void;
  getJobRecord: () => WedmJobRecord;
}

const DataContext = createContext<DataContextValue | null>(null);

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

function generateSessionId(): string {
  return `wedm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function estimateSize(obj: unknown): number {
  try {
    return JSON.stringify(obj).length * 2; // rough byte estimate (UTF-16)
  } catch {
    return Infinity;
  }
}

function saveToSessionStorage(record: WedmJobRecord): boolean {
  try {
    const json = JSON.stringify(record);
    if (json.length * 2 > MAX_SESSION_STORAGE_BYTES) {
      return false; // too large, fall back to IndexedDB
    }
    sessionStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

function loadFromSessionStorage(): WedmJobRecord | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "sessionId" });
        store.createIndex("savedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(record: WedmJobRecord): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable — data not persisted
  }
}

async function loadFromIDB(sessionId: string): Promise<WedmJobRecord | null> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(sessionId);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

function defaultStepStatus(): Record<WedmStep, StepStatus> {
  return {
    import: "active",
    review: "pending",
    wcs: "pending",
    toolpath: "pending",
    optimize: "pending",
    program: "pending",
  };
}

function createDefaultRecord(): WedmJobRecord {
  return {
    sessionId: generateSessionId(),
    jobName: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
    currentStep: "import",
    stepStatus: defaultStepStatus(),
    inputMethod: "upload",
    steps: {},
    qualityEvents: [],
  };
}

// ============================================================================
// PROVIDER
// ============================================================================

export function WedmStudioProvider({ children }: { children: ReactNode }) {
  // Load initial state from sessionStorage
  const [record, setRecord] = useState<WedmJobRecord>(() => {
    return loadFromSessionStorage() ?? createDefaultRecord();
  });

  // Debounced autosave
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordRef = useRef(record);
  recordRef.current = record;

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const current = recordRef.current;
      current.updatedAt = new Date().toISOString();
      if (!saveToSessionStorage(current)) {
        // Fallback to IndexedDB for large payloads
        saveToIDB(current);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const current = recordRef.current;
      current.updatedAt = new Date().toISOString();
      saveToSessionStorage(current);
    };
  }, []);

  // Navigation callbacks
  const setCurrentStep = useCallback((step: WedmStep) => {
    setRecord(prev => {
      const newStatus = { ...prev.stepStatus };
      // Mark previous active as whatever it was, mark new as active
      for (const s of Object.keys(newStatus) as WedmStep[]) {
        if (newStatus[s] === "active") {
          newStatus[s] = prev.steps[s as StepDataKey] ? "complete" : "pending";
        }
      }
      newStatus[step] = "active";
      return { ...prev, currentStep: step, stepStatus: newStatus };
    });
    scheduleSave();
  }, [scheduleSave]);

  const setInputMethod = useCallback((method: InputMethod) => {
    setRecord(prev => ({ ...prev, inputMethod: method }));
    scheduleSave();
  }, [scheduleSave]);

  const markStepComplete = useCallback((step: WedmStep) => {
    setRecord(prev => ({
      ...prev,
      stepStatus: { ...prev.stepStatus, [step]: "complete" as StepStatus },
    }));
    scheduleSave();
  }, [scheduleSave]);

  const markStepError = useCallback((step: WedmStep) => {
    setRecord(prev => ({
      ...prev,
      stepStatus: { ...prev.stepStatus, [step]: "error" as StepStatus },
    }));
    scheduleSave();
  }, [scheduleSave]);

  const markStale = useCallback((fromStep: WedmStep) => {
    setRecord(prev => {
      const newStatus = { ...prev.stepStatus };
      // Mark all steps that depend on fromStep as stale
      for (const [step, deps] of Object.entries(STEP_DEPENDENCIES)) {
        if (deps.includes(fromStep) && newStatus[step as WedmStep] === "complete") {
          newStatus[step as WedmStep] = "stale";
        }
      }
      return { ...prev, stepStatus: newStatus };
    });
    scheduleSave();
  }, [scheduleSave]);

  const resetWizard = useCallback(() => {
    setRecord(createDefaultRecord());
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Data callbacks
  const setStepData = useCallback(<K extends StepDataKey>(key: K, data: WedmJobRecord["steps"][K]) => {
    if (estimateSize(data) > MAX_STEP_DATA_BYTES) {
      console.warn(`[WEDM] Step data for "${key}" exceeds 256KB limit`);
    }
    setRecord(prev => ({
      ...prev,
      steps: { ...prev.steps, [key]: data },
    }));
    scheduleSave();
  }, [scheduleSave]);

  const clearStep = useCallback((key: StepDataKey) => {
    setRecord(prev => {
      const newSteps = { ...prev.steps };
      delete newSteps[key];
      return { ...prev, steps: newSteps };
    });
    scheduleSave();
  }, [scheduleSave]);

  const setFileInfo = useCallback((name: string, size: number) => {
    setRecord(prev => ({ ...prev, fileName: name, fileSizeBytes: size }));
    scheduleSave();
  }, [scheduleSave]);

  const getJobRecord = useCallback((): WedmJobRecord => {
    return recordRef.current;
  }, []);

  // Navigation context value — memoized to prevent re-renders on data-only changes
  const navValue = useMemo<NavigationContextValue>(() => ({
    currentStep: record.currentStep,
    stepStatus: record.stepStatus,
    inputMethod: record.inputMethod,
    sessionId: record.sessionId,
    setCurrentStep,
    setInputMethod,
    markStepComplete,
    markStepError,
    markStale,
    resetWizard,
  }), [record.currentStep, record.stepStatus, record.inputMethod, record.sessionId,
    setCurrentStep, setInputMethod, markStepComplete, markStepError, markStale, resetWizard]);

  // Data context value — memoized to prevent re-renders on nav-only changes
  const dataValue = useMemo<DataContextValue>(() => ({
    steps: record.steps,
    fileName: record.fileName,
    fileSizeBytes: record.fileSizeBytes,
    setStepData,
    clearStep,
    setFileInfo,
    getJobRecord,
  }), [record.steps, record.fileName, record.fileSizeBytes,
    setStepData, clearStep, setFileInfo, getJobRecord]);

  return (
    <NavigationContext.Provider value={navValue}>
      <DataContext.Provider value={dataValue}>
        {children}
      </DataContext.Provider>
    </NavigationContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useWedmNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useWedmNavigation must be used within WedmStudioProvider");
  return ctx;
}

export function useWedmData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useWedmData must be used within WedmStudioProvider");
  return ctx;
}
