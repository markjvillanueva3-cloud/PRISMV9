/**
 * LatheStudioContext.tsx — Lathe Studio State Management
 * LATHE-PROD-READY-MS0/U-LPR08
 *
 * Provides wizard state for 6-step lathe programming workflow:
 * 1. Import - Part geometry/print upload
 * 2. Material - Stock selection and dimensions
 * 3. Operations - Turning operations definition
 * 4. Tooling - Tool selection per operation
 * 5. Parameters - Speed/feed/DOC optimization
 * 6. Program - G-code generation and review
 */

import { createContext, useContext, useCallback, useMemo, useReducer, type ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type LatheStep = "import" | "material" | "operations" | "tooling" | "parameters" | "program";

export interface PartGeometry {
  type: "od" | "id" | "face" | "profile" | "thread" | "groove" | "partoff";
  dimensions: Record<string, number>;
  features: string[];
}

export interface StockInfo {
  material: string;
  hardness?: number;
  hardnessUnit?: "HRC" | "HB";
  diameter: number;
  length: number;
  barFeeder?: boolean;
}

export interface Operation {
  id: string;
  type: "rough_od" | "finish_od" | "rough_id" | "finish_id" | "face" | "thread" | "groove" | "partoff" | "drill" | "tap";
  toolId?: string;
  params?: Record<string, number>;
  sequence: number;
}

export interface Tool {
  id: string;
  type: string;
  insertGrade: string;
  holderStyle: string;
  noseRadius: number;
}

export interface CuttingParams {
  operationId: string;
  sfm: number;
  fpr: number;
  doc: number;
  css?: boolean;
  coolant: "flood" | "mql" | "dry" | "through";
}

export interface ProgramOutput {
  gcode: string;
  cycleTime: number;
  warnings: string[];
  safetyChecks: { check: string; passed: boolean }[];
}

export interface StepData {
  import?: {
    filename?: string;
    geometry?: PartGeometry[];
    printOcr?: Record<string, string>;
    dimensions?: Record<string, number>;
  };
  material?: StockInfo;
  operations?: Operation[];
  tooling?: Tool[];
  parameters?: CuttingParams[];
  program?: ProgramOutput;
}

export interface LatheStudioState {
  currentStep: LatheStep;
  steps: StepData;
  machineId: string;
  controllerId: string;
  errors: string[];
  isProcessing: boolean;
}

// ============================================================================
// ACTIONS
// ============================================================================

type LatheStudioAction =
  | { type: "SET_STEP"; step: LatheStep }
  | { type: "UPDATE_IMPORT"; data: StepData["import"] }
  | { type: "UPDATE_MATERIAL"; data: StepData["material"] }
  | { type: "UPDATE_OPERATIONS"; data: StepData["operations"] }
  | { type: "UPDATE_TOOLING"; data: StepData["tooling"] }
  | { type: "UPDATE_PARAMETERS"; data: StepData["parameters"] }
  | { type: "UPDATE_PROGRAM"; data: StepData["program"] }
  | { type: "SET_MACHINE"; machineId: string; controllerId: string }
  | { type: "SET_PROCESSING"; isProcessing: boolean }
  | { type: "ADD_ERROR"; error: string }
  | { type: "CLEAR_ERRORS" }
  | { type: "RESET" };

// ============================================================================
// REDUCER
// ============================================================================

const initialState: LatheStudioState = {
  currentStep: "import",
  steps: {},
  machineId: "th-jmd-okuma-lb3000",
  controllerId: "osp-p300",
  errors: [],
  isProcessing: false,
};

function latheStudioReducer(state: LatheStudioState, action: LatheStudioAction): LatheStudioState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "UPDATE_IMPORT":
      return { ...state, steps: { ...state.steps, import: action.data } };
    case "UPDATE_MATERIAL":
      return { ...state, steps: { ...state.steps, material: action.data } };
    case "UPDATE_OPERATIONS":
      return { ...state, steps: { ...state.steps, operations: action.data } };
    case "UPDATE_TOOLING":
      return { ...state, steps: { ...state.steps, tooling: action.data } };
    case "UPDATE_PARAMETERS":
      return { ...state, steps: { ...state.steps, parameters: action.data } };
    case "UPDATE_PROGRAM":
      return { ...state, steps: { ...state.steps, program: action.data } };
    case "SET_MACHINE":
      return { ...state, machineId: action.machineId, controllerId: action.controllerId };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.isProcessing };
    case "ADD_ERROR":
      return { ...state, errors: [...state.errors, action.error] };
    case "CLEAR_ERRORS":
      return { ...state, errors: [] };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface LatheStudioContextValue {
  state: LatheStudioState;
  dispatch: React.Dispatch<LatheStudioAction>;
}

const LatheStudioContext = createContext<LatheStudioContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function LatheStudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(latheStudioReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <LatheStudioContext.Provider value={value}>
      {children}
    </LatheStudioContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

function useLatheStudioContext() {
  const ctx = useContext(LatheStudioContext);
  if (!ctx) throw new Error("useLatheStudioContext must be used within LatheStudioProvider");
  return ctx;
}

export function useLatheNavigation() {
  const { state, dispatch } = useLatheStudioContext();

  const setCurrentStep = useCallback((step: LatheStep) => {
    dispatch({ type: "SET_STEP", step });
  }, [dispatch]);

  const nextStep = useCallback(() => {
    const steps: LatheStep[] = ["import", "material", "operations", "tooling", "parameters", "program"];
    const idx = steps.indexOf(state.currentStep);
    if (idx < steps.length - 1) {
      dispatch({ type: "SET_STEP", step: steps[idx + 1] });
    }
  }, [dispatch, state.currentStep]);

  const prevStep = useCallback(() => {
    const steps: LatheStep[] = ["import", "material", "operations", "tooling", "parameters", "program"];
    const idx = steps.indexOf(state.currentStep);
    if (idx > 0) {
      dispatch({ type: "SET_STEP", step: steps[idx - 1] });
    }
  }, [dispatch, state.currentStep]);

  return {
    currentStep: state.currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
  };
}

export function useLatheData() {
  const { state, dispatch } = useLatheStudioContext();

  const updateImport = useCallback((data: StepData["import"]) => {
    dispatch({ type: "UPDATE_IMPORT", data });
  }, [dispatch]);

  const updateMaterial = useCallback((data: StepData["material"]) => {
    dispatch({ type: "UPDATE_MATERIAL", data });
  }, [dispatch]);

  const updateOperations = useCallback((data: StepData["operations"]) => {
    dispatch({ type: "UPDATE_OPERATIONS", data });
  }, [dispatch]);

  const updateTooling = useCallback((data: StepData["tooling"]) => {
    dispatch({ type: "UPDATE_TOOLING", data });
  }, [dispatch]);

  const updateParameters = useCallback((data: StepData["parameters"]) => {
    dispatch({ type: "UPDATE_PARAMETERS", data });
  }, [dispatch]);

  const updateProgram = useCallback((data: StepData["program"]) => {
    dispatch({ type: "UPDATE_PROGRAM", data });
  }, [dispatch]);

  return {
    steps: state.steps,
    machineId: state.machineId,
    controllerId: state.controllerId,
    updateImport,
    updateMaterial,
    updateOperations,
    updateTooling,
    updateParameters,
    updateProgram,
  };
}

export function useLatheStatus() {
  const { state, dispatch } = useLatheStudioContext();

  const setProcessing = useCallback((isProcessing: boolean) => {
    dispatch({ type: "SET_PROCESSING", isProcessing });
  }, [dispatch]);

  const addError = useCallback((error: string) => {
    dispatch({ type: "ADD_ERROR", error });
  }, [dispatch]);

  const clearErrors = useCallback(() => {
    dispatch({ type: "CLEAR_ERRORS" });
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  return {
    isProcessing: state.isProcessing,
    errors: state.errors,
    setProcessing,
    addError,
    clearErrors,
    reset,
  };
}
