import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type MillStep = "import" | "material" | "strategy" | "tooling" | "parameters" | "program";

export const MILL_STEPS: Array<{ id: MillStep; label: string; description: string }> = [
  { id: "import", label: "Import", description: "Upload geometry" },
  { id: "material", label: "Material", description: "Pick stock" },
  { id: "strategy", label: "Strategy", description: "Select ops" },
  { id: "tooling", label: "Tooling", description: "Choose tools" },
  { id: "parameters", label: "Parameters", description: "Tune speeds & feeds" },
  { id: "program", label: "Program", description: "Emit G-code" },
];

export interface MillImportFeature {
  type: string;
  dimensions?: Record<string, number>;
  width_mm?: number;
  length_mm?: number;
  depth_mm?: number;
  diameter_mm?: number;
  count?: number;
}

export interface MillImportData {
  filename: string;
  fileType: "cad" | "stl" | "pdf" | "photo";
  features?: MillImportFeature[];
  envelope_mm?: { x: number; y: number; z: number };
  confidence?: number;
}

export interface MillMaterialData {
  material: string;
  iso_group?: string;
  kc_nmm2?: number;
  width_mm?: number;
  length_mm?: number;
  height_mm?: number;
  stock_type?: "block" | "plate" | "bar";
}

export type MillStrategyType = string;

export interface MillStrategyItem {
  id: string;
  type: string;
  sequence: number;
  stepdown_mm?: number;
  stepover_percent?: number;
  leave_stock_mm?: number;
}

export interface MillToolItem {
  id: string;
  type: string;
  diameter_mm: number;
  flutes?: number;
  corner_radius_mm?: number;
  coating?: string;
  material?: string;
}

export interface MillParameterRow {
  strategyId: string;
  toolId: string;
  rpm: number;
  feed_mm_min: number;
  plunge_feed_mm_min?: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  coolant?: string;
  entry_type?: string;
  cutting_direction?: "climb" | "conventional";
}

export type MillParametersData = MillParameterRow[];

export interface MillProgramData {
  gcode?: string;
  controller?: string;
  program_name?: string;
  est_cycle_time_min?: number;
}

export interface MillStudioSteps {
  import?: MillImportData;
  material?: MillMaterialData;
  strategy?: MillStrategyItem[];
  tooling?: MillToolItem[];
  parameters?: MillParameterRow[];
  program?: MillProgramData;
}

interface MillNavigationValue {
  currentStep: MillStep;
  setCurrentStep: (step: MillStep) => void;
  nextStep: () => void;
  prevStep: () => void;
}

interface MillDataValue {
  steps: MillStudioSteps;
  machineId: string | null;
  controllerId: string | null;
  setMachineId: (id: string | null) => void;
  setControllerId: (id: string | null) => void;
  updateImport: (data: MillImportData) => void;
  updateMaterial: (data: MillMaterialData) => void;
  updateStrategy: (data: MillStrategyItem[]) => void;
  updateTooling: (data: MillToolItem[]) => void;
  updateParameters: (data: MillParametersData) => void;
  updateProgram: (data: MillProgramData) => void;
  clearStep: (step: MillStep) => void;
  reset: () => void;
}

const MillNavigationContext = createContext<MillNavigationValue | null>(null);
const MillDataContext = createContext<MillDataValue | null>(null);

function stepIndex(step: MillStep): number {
  return MILL_STEPS.findIndex((s) => s.id === step);
}

export function MillStudioProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<MillStep>("import");
  const [steps, setSteps] = useState<MillStudioSteps>({});
  const [machineId, setMachineId] = useState<string | null>(null);
  const [controllerId, setControllerId] = useState<string | null>(null);

  const nextStep = useCallback(() => {
    setCurrentStep((curr) => {
      const i = stepIndex(curr);
      if (i < 0 || i >= MILL_STEPS.length - 1) return curr;
      return MILL_STEPS[i + 1]!.id;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((curr) => {
      const i = stepIndex(curr);
      if (i <= 0) return curr;
      return MILL_STEPS[i - 1]!.id;
    });
  }, []);

  const updateImport = useCallback((data: MillImportData) => {
    setSteps((prev) => ({ ...prev, import: data }));
  }, []);

  const updateMaterial = useCallback((data: MillMaterialData) => {
    setSteps((prev) => ({ ...prev, material: data }));
  }, []);

  const updateStrategy = useCallback((data: MillStrategyItem[]) => {
    setSteps((prev) => ({ ...prev, strategy: data }));
  }, []);

  const updateTooling = useCallback((data: MillToolItem[]) => {
    setSteps((prev) => ({ ...prev, tooling: data }));
  }, []);

  const updateParameters = useCallback((data: MillParametersData) => {
    setSteps((prev) => ({ ...prev, parameters: data }));
  }, []);

  const updateProgram = useCallback((data: MillProgramData) => {
    setSteps((prev) => ({ ...prev, program: data }));
  }, []);

  const clearStep = useCallback((step: MillStep) => {
    setSteps((prev) => {
      const next = { ...prev };
      delete next[step];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSteps({});
    setCurrentStep("import");
    setMachineId(null);
    setControllerId(null);
  }, []);

  const navValue = useMemo<MillNavigationValue>(
    () => ({ currentStep, setCurrentStep, nextStep, prevStep }),
    [currentStep, nextStep, prevStep],
  );

  const dataValue = useMemo<MillDataValue>(
    () => ({
      steps,
      machineId,
      controllerId,
      setMachineId,
      setControllerId,
      updateImport,
      updateMaterial,
      updateStrategy,
      updateTooling,
      updateParameters,
      updateProgram,
      clearStep,
      reset,
    }),
    [
      steps,
      machineId,
      controllerId,
      updateImport,
      updateMaterial,
      updateStrategy,
      updateTooling,
      updateParameters,
      updateProgram,
      clearStep,
      reset,
    ],
  );

  return (
    <MillNavigationContext.Provider value={navValue}>
      <MillDataContext.Provider value={dataValue}>{children}</MillDataContext.Provider>
    </MillNavigationContext.Provider>
  );
}

export function useMillNavigation(): MillNavigationValue {
  const ctx = useContext(MillNavigationContext);
  if (!ctx) throw new Error("useMillNavigation must be used within MillStudioProvider");
  return ctx;
}

export function useMillData(): MillDataValue {
  const ctx = useContext(MillDataContext);
  if (!ctx) throw new Error("useMillData must be used within MillStudioProvider");
  return ctx;
}
