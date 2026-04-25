/**
 * Calculator Store — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Zustand store with structural selectors replacing 153 useState calls.
 * Uses shallow comparison for optimal re-render performance.
 * Persists only non-ephemeral slices (workspace, dimensions).
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR07
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type {
  ExperienceLevel,
  MachineMode,
  MachineCatalogItem,
  MaterialCatalogItem,
  MachineGuidewayType,
} from '../data/calculatorWorkspace';

export type UnitSystem = 'metric' | 'inch';
export type StockShapeId = 'plate' | 'round' | 'hex' | 'tube' | 'profile' | 'custom';
export type ToolBodyFilter = 'all' | 'solid' | 'indexable';
export type FinishControlMode = 'auto' | 'manual';
export type InterfaceLanguage = 'en' | 'es' | 'de' | 'zh' | 'ja' | 'ko';

// ============================================================================
// Workspace Slice — Core selections (persisted)
// ============================================================================

export interface WorkspaceSlice {
  experience: ExperienceLevel;
  machineMode: MachineMode;
  machineTypeId: string;
  manufacturer: string;
  machineId: string;
  controllerOptionId: string;
  spindleOptionId: string;
  toolingStationCountOverride: number | null;
  materialGroup: string;
  materialSubcategoryId: string;
  materialId: string;
  toolId: string;
  toolBodyFilter: ToolBodyFilter;
  insertId: string;
  operation: string;
  programmingId: string;
  toolpathTypeId: string;
  toolpathId: string;
  coolant: string;
  machineCoolantOptionIds: string[];
  selectedControllerCapabilityIds: string[];
  entryStyle: string;
  finishTarget: string;
  finishControlMode: FinishControlMode;
  desiredRaUm: number;
  workholding: string;
  workholdingCategory: string;
  workholdingBrand: string;
  workholdingPresetId: string;
  stabilityId: string;
  setupSource: string;
  toolVendorFilter: string;
  toolGeometryFilter: string;
  toolSizeFilter: string;
  holderBrand: string;
  holderTypeFilter: string;
  holderInterfaceFilter: string;
  holderPackageId: string;
  holderStyle: string;
  unitSystem: UnitSystem;
  interfaceLanguage: InterfaceLanguage;
}

export interface WorkspaceActions {
  setExperience: (v: ExperienceLevel) => void;
  setMachineMode: (v: MachineMode) => void;
  setMachineTypeId: (v: string) => void;
  setManufacturer: (v: string) => void;
  setMachineId: (v: string) => void;
  setControllerOptionId: (v: string) => void;
  setSpindleOptionId: (v: string) => void;
  setToolingStationCountOverride: (v: number | null) => void;
  setMaterialGroup: (v: string) => void;
  setMaterialSubcategoryId: (v: string) => void;
  setMaterialId: (v: string) => void;
  setToolId: (v: string) => void;
  setToolBodyFilter: (v: ToolBodyFilter) => void;
  setInsertId: (v: string) => void;
  setOperation: (v: string) => void;
  setProgrammingId: (v: string) => void;
  setToolpathTypeId: (v: string) => void;
  setToolpathId: (v: string) => void;
  setCoolant: (v: string) => void;
  setMachineCoolantOptionIds: (v: string[]) => void;
  setSelectedControllerCapabilityIds: (v: string[]) => void;
  setEntryStyle: (v: string) => void;
  setFinishTarget: (v: string) => void;
  setFinishControlMode: (v: FinishControlMode) => void;
  setDesiredRaUm: (v: number) => void;
  setWorkholding: (v: string) => void;
  setWorkholdingCategory: (v: string) => void;
  setWorkholdingBrand: (v: string) => void;
  setWorkholdingPresetId: (v: string) => void;
  setStabilityId: (v: string) => void;
  setSetupSource: (v: string) => void;
  setToolVendorFilter: (v: string) => void;
  setToolGeometryFilter: (v: string) => void;
  setToolSizeFilter: (v: string) => void;
  setHolderBrand: (v: string) => void;
  setHolderTypeFilter: (v: string) => void;
  setHolderInterfaceFilter: (v: string) => void;
  setHolderPackageId: (v: string) => void;
  setHolderStyle: (v: string) => void;
  setUnitSystem: (v: UnitSystem) => void;
  setInterfaceLanguage: (v: InterfaceLanguage) => void;
  resetWorkspace: () => void;
}

// ============================================================================
// Dimensions Slice — Numeric parameters (persisted)
// ============================================================================

export interface DimensionsSlice {
  stockShape: StockShapeId;
  stockSource: string;
  stockX: number;
  stockY: number;
  stockZ: number;
  toolDiameter: number;
  flutes: number;
  doc: number;
  woc: number;
  toolStickout: number;
  toolLoc: number;
}

export interface DimensionsActions {
  setStockShape: (v: StockShapeId) => void;
  setStockSource: (v: string) => void;
  setStockX: (v: number) => void;
  setStockY: (v: number) => void;
  setStockZ: (v: number) => void;
  setToolDiameter: (v: number) => void;
  setFlutes: (v: number) => void;
  setDoc: (v: number) => void;
  setWoc: (v: number) => void;
  setToolStickout: (v: number) => void;
  setToolLoc: (v: number) => void;
  resetDimensions: () => void;
}

// ============================================================================
// Machine Measurements Slice — Optional calibration data (persisted)
// ============================================================================

export interface MachineMeasurementsSlice {
  machineGuidewayType: MachineGuidewayType | null;
  machineAgeYears: number | null;
  measuredMachinePowerKw: number | null;
  measuredMachineTorqueNm: number | null;
  measuredMachineNaturalFrequencyHz: number | null;
  measuredMachineSystemStiffnessNPerUm: number | null;
  measuredMachineDampingRatio: number | null;
  measuredMachineAxisAccelerationMps2: number | null;
  measuredMachineAxisJerkMps3: number | null;
}

export interface MachineMeasurementsActions {
  setMachineGuidewayType: (v: MachineGuidewayType | null) => void;
  setMachineAgeYears: (v: number | null) => void;
  setMeasuredMachinePowerKw: (v: number | null) => void;
  setMeasuredMachineTorqueNm: (v: number | null) => void;
  setMeasuredMachineNaturalFrequencyHz: (v: number | null) => void;
  setMeasuredMachineSystemStiffnessNPerUm: (v: number | null) => void;
  setMeasuredMachineDampingRatio: (v: number | null) => void;
  setMeasuredMachineAxisAccelerationMps2: (v: number | null) => void;
  setMeasuredMachineAxisJerkMps3: (v: number | null) => void;
  resetMachineMeasurements: () => void;
}

// ============================================================================
// Results Slice — Calculation results (ephemeral, not persisted)
// ============================================================================

export interface ResultsSlice {
  result: unknown | null;
  wedmResult: unknown | null;
  resultSolveSource: unknown | null;
  solvePreflight: unknown;
}

export interface ResultsActions {
  setResult: (v: unknown | null) => void;
  setWedmResult: (v: unknown | null) => void;
  setResultSolveSource: (v: unknown | null) => void;
  setSolvePreflight: (v: unknown) => void;
  clearResults: () => void;
}

// ============================================================================
// Catalogs Slice — Live catalog data (ephemeral, not persisted)
// ============================================================================

export interface CatalogsSlice {
  liveMachines: MachineCatalogItem[];
  liveMaterials: MaterialCatalogItem[];
}

export interface CatalogsActions {
  setLiveMachines: (v: MachineCatalogItem[]) => void;
  setLiveMaterials: (v: MaterialCatalogItem[]) => void;
}

// ============================================================================
// UI Slice — UI state (mostly ephemeral except preferences)
// ============================================================================

export interface UISlice {
  loading: boolean;
  error: string | null;
  shellRailCollapsed: boolean;
  selectedStation: number;
  selectedFeatureIds: string[];
  selectedUploadFile: File | null;
  loadedFileName: string | null;
}

export interface UIActions {
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setShellRailCollapsed: (v: boolean) => void;
  setSelectedStation: (v: number) => void;
  setSelectedFeatureIds: (v: string[]) => void;
  setSelectedUploadFile: (v: File | null) => void;
  setLoadedFileName: (v: string | null) => void;
  clearError: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type CalculatorStore =
  WorkspaceSlice & WorkspaceActions &
  DimensionsSlice & DimensionsActions &
  MachineMeasurementsSlice & MachineMeasurementsActions &
  ResultsSlice & ResultsActions &
  CatalogsSlice & CatalogsActions &
  UISlice & UIActions;

// ============================================================================
// Default Values
// ============================================================================

const defaultWorkspace: WorkspaceSlice = {
  experience: 'beginner',
  machineMode: 'mill',
  machineTypeId: 'all',
  manufacturer: 'all',
  machineId: 'haas-vf2ss',
  controllerOptionId: '',
  spindleOptionId: '',
  toolingStationCountOverride: null,
  materialGroup: 'steel',
  materialSubcategoryId: 'all',
  materialId: '4140',
  toolId: 'face-mill',
  toolBodyFilter: 'all',
  insertId: '',
  operation: 'face_milling',
  programmingId: 'mastercam-mill',
  toolpathTypeId: 'all',
  toolpathId: 'mc-dynamic-mill',
  coolant: 'flood',
  machineCoolantOptionIds: [],
  selectedControllerCapabilityIds: [],
  entryStyle: 'balanced',
  finishTarget: 'general',
  finishControlMode: 'auto',
  desiredRaUm: 3.2,
  workholding: 'vise-soft-jaw',
  workholdingCategory: 'all',
  workholdingBrand: 'all',
  workholdingPresetId: 'kurt-vise-parallels',
  stabilityId: 'production-stable',
  setupSource: 'recommended',
  toolVendorFilter: 'all',
  toolGeometryFilter: 'all',
  toolSizeFilter: 'all',
  holderBrand: 'all',
  holderTypeFilter: 'all',
  holderInterfaceFilter: 'all',
  holderPackageId: 'sandvik-shell-arbor',
  holderStyle: 'machine-standard',
  unitSystem: 'metric',
  interfaceLanguage: 'en',
};

const defaultDimensions: DimensionsSlice = {
  stockShape: 'plate',
  stockSource: 'shop-rack',
  stockX: 152.4,
  stockY: 101.6,
  stockZ: 50.8,
  toolDiameter: 76.2,
  flutes: 6,
  doc: 2.5,
  woc: 38,
  toolStickout: 42,
  toolLoc: 22,
};

const defaultMachineMeasurements: MachineMeasurementsSlice = {
  machineGuidewayType: null,
  machineAgeYears: null,
  measuredMachinePowerKw: null,
  measuredMachineTorqueNm: null,
  measuredMachineNaturalFrequencyHz: null,
  measuredMachineSystemStiffnessNPerUm: null,
  measuredMachineDampingRatio: null,
  measuredMachineAxisAccelerationMps2: null,
  measuredMachineAxisJerkMps3: null,
};

const defaultResults: ResultsSlice = {
  result: null,
  wedmResult: null,
  resultSolveSource: null,
  solvePreflight: {},
};

const defaultCatalogs: CatalogsSlice = {
  liveMachines: [],
  liveMaterials: [],
};

const defaultUI: UISlice = {
  loading: false,
  error: null,
  shellRailCollapsed: false,
  selectedStation: 1,
  selectedFeatureIds: [],
  selectedUploadFile: null,
  loadedFileName: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set) => ({
      // Workspace
      ...defaultWorkspace,
      setExperience: (v) => set({ experience: v }),
      setMachineMode: (v) => set({ machineMode: v }),
      setMachineTypeId: (v) => set({ machineTypeId: v }),
      setManufacturer: (v) => set({ manufacturer: v }),
      setMachineId: (v) => set({ machineId: v }),
      setControllerOptionId: (v) => set({ controllerOptionId: v }),
      setSpindleOptionId: (v) => set({ spindleOptionId: v }),
      setToolingStationCountOverride: (v) => set({ toolingStationCountOverride: v }),
      setMaterialGroup: (v) => set({ materialGroup: v }),
      setMaterialSubcategoryId: (v) => set({ materialSubcategoryId: v }),
      setMaterialId: (v) => set({ materialId: v }),
      setToolId: (v) => set({ toolId: v }),
      setToolBodyFilter: (v) => set({ toolBodyFilter: v }),
      setInsertId: (v) => set({ insertId: v }),
      setOperation: (v) => set({ operation: v }),
      setProgrammingId: (v) => set({ programmingId: v }),
      setToolpathTypeId: (v) => set({ toolpathTypeId: v }),
      setToolpathId: (v) => set({ toolpathId: v }),
      setCoolant: (v) => set({ coolant: v }),
      setMachineCoolantOptionIds: (v) => set({ machineCoolantOptionIds: v }),
      setSelectedControllerCapabilityIds: (v) => set({ selectedControllerCapabilityIds: v }),
      setEntryStyle: (v) => set({ entryStyle: v }),
      setFinishTarget: (v) => set({ finishTarget: v }),
      setFinishControlMode: (v) => set({ finishControlMode: v }),
      setDesiredRaUm: (v) => set({ desiredRaUm: v }),
      setWorkholding: (v) => set({ workholding: v }),
      setWorkholdingCategory: (v) => set({ workholdingCategory: v }),
      setWorkholdingBrand: (v) => set({ workholdingBrand: v }),
      setWorkholdingPresetId: (v) => set({ workholdingPresetId: v }),
      setStabilityId: (v) => set({ stabilityId: v }),
      setSetupSource: (v) => set({ setupSource: v }),
      setToolVendorFilter: (v) => set({ toolVendorFilter: v }),
      setToolGeometryFilter: (v) => set({ toolGeometryFilter: v }),
      setToolSizeFilter: (v) => set({ toolSizeFilter: v }),
      setHolderBrand: (v) => set({ holderBrand: v }),
      setHolderTypeFilter: (v) => set({ holderTypeFilter: v }),
      setHolderInterfaceFilter: (v) => set({ holderInterfaceFilter: v }),
      setHolderPackageId: (v) => set({ holderPackageId: v }),
      setHolderStyle: (v) => set({ holderStyle: v }),
      setUnitSystem: (v) => set({ unitSystem: v }),
      setInterfaceLanguage: (v) => set({ interfaceLanguage: v }),
      resetWorkspace: () => set(defaultWorkspace),

      // Dimensions
      ...defaultDimensions,
      setStockShape: (v) => set({ stockShape: v }),
      setStockSource: (v) => set({ stockSource: v }),
      setStockX: (v) => set({ stockX: v }),
      setStockY: (v) => set({ stockY: v }),
      setStockZ: (v) => set({ stockZ: v }),
      setToolDiameter: (v) => set({ toolDiameter: v }),
      setFlutes: (v) => set({ flutes: v }),
      setDoc: (v) => set({ doc: v }),
      setWoc: (v) => set({ woc: v }),
      setToolStickout: (v) => set({ toolStickout: v }),
      setToolLoc: (v) => set({ toolLoc: v }),
      resetDimensions: () => set(defaultDimensions),

      // Machine Measurements
      ...defaultMachineMeasurements,
      setMachineGuidewayType: (v) => set({ machineGuidewayType: v }),
      setMachineAgeYears: (v) => set({ machineAgeYears: v }),
      setMeasuredMachinePowerKw: (v) => set({ measuredMachinePowerKw: v }),
      setMeasuredMachineTorqueNm: (v) => set({ measuredMachineTorqueNm: v }),
      setMeasuredMachineNaturalFrequencyHz: (v) => set({ measuredMachineNaturalFrequencyHz: v }),
      setMeasuredMachineSystemStiffnessNPerUm: (v) => set({ measuredMachineSystemStiffnessNPerUm: v }),
      setMeasuredMachineDampingRatio: (v) => set({ measuredMachineDampingRatio: v }),
      setMeasuredMachineAxisAccelerationMps2: (v) => set({ measuredMachineAxisAccelerationMps2: v }),
      setMeasuredMachineAxisJerkMps3: (v) => set({ measuredMachineAxisJerkMps3: v }),
      resetMachineMeasurements: () => set(defaultMachineMeasurements),

      // Results
      ...defaultResults,
      setResult: (v) => set({ result: v }),
      setWedmResult: (v) => set({ wedmResult: v }),
      setResultSolveSource: (v) => set({ resultSolveSource: v }),
      setSolvePreflight: (v) => set({ solvePreflight: v }),
      clearResults: () => set(defaultResults),

      // Catalogs
      ...defaultCatalogs,
      setLiveMachines: (v) => set({ liveMachines: v }),
      setLiveMaterials: (v) => set({ liveMaterials: v }),

      // UI
      ...defaultUI,
      setLoading: (v) => set({ loading: v }),
      setError: (v) => set({ error: v }),
      setShellRailCollapsed: (v) => set({ shellRailCollapsed: v }),
      setSelectedStation: (v) => set({ selectedStation: v }),
      setSelectedFeatureIds: (v) => set({ selectedFeatureIds: v }),
      setSelectedUploadFile: (v) => set({ selectedUploadFile: v }),
      setLoadedFileName: (v) => set({ loadedFileName: v }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'prism-calculator-store',
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        // v0 (legacy useState-only) → v1 (Zustand store): persisted will be undefined,
        // so persist middleware falls back to defaults. Future bumps: handle here.
        if (!persisted || typeof persisted !== 'object') return persisted as Partial<CalculatorStore>;
        if (version < 1) {
          // No legacy fields to remap yet; keep as-is.
          return persisted as Partial<CalculatorStore>;
        }
        return persisted as Partial<CalculatorStore>;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist workspace, dimensions, machine measurements, and UI preferences
        experience: state.experience,
        machineMode: state.machineMode,
        machineTypeId: state.machineTypeId,
        manufacturer: state.manufacturer,
        machineId: state.machineId,
        controllerOptionId: state.controllerOptionId,
        spindleOptionId: state.spindleOptionId,
        materialGroup: state.materialGroup,
        materialSubcategoryId: state.materialSubcategoryId,
        materialId: state.materialId,
        toolId: state.toolId,
        operation: state.operation,
        programmingId: state.programmingId,
        toolpathId: state.toolpathId,
        coolant: state.coolant,
        entryStyle: state.entryStyle,
        finishTarget: state.finishTarget,
        workholding: state.workholding,
        stabilityId: state.stabilityId,
        unitSystem: state.unitSystem,
        interfaceLanguage: state.interfaceLanguage,
        stockShape: state.stockShape,
        stockSource: state.stockSource,
        stockX: state.stockX,
        stockY: state.stockY,
        stockZ: state.stockZ,
        toolDiameter: state.toolDiameter,
        flutes: state.flutes,
        doc: state.doc,
        woc: state.woc,
        toolStickout: state.toolStickout,
        toolLoc: state.toolLoc,
        shellRailCollapsed: state.shellRailCollapsed,
      }),
    }
  )
);

// ============================================================================
// Structural Selectors — use shallow comparison for optimal re-renders
// ============================================================================

export const useWorkspaceState = () =>
  useCalculatorStore(
    useShallow((s) => ({
      experience: s.experience,
      machineMode: s.machineMode,
      machineTypeId: s.machineTypeId,
      manufacturer: s.manufacturer,
      machineId: s.machineId,
      materialGroup: s.materialGroup,
      materialId: s.materialId,
      toolId: s.toolId,
      operation: s.operation,
      programmingId: s.programmingId,
      toolpathId: s.toolpathId,
      coolant: s.coolant,
      unitSystem: s.unitSystem,
    }))
  );

export const useDimensionsState = () =>
  useCalculatorStore(
    useShallow((s) => ({
      stockShape: s.stockShape,
      stockX: s.stockX,
      stockY: s.stockY,
      stockZ: s.stockZ,
      toolDiameter: s.toolDiameter,
      flutes: s.flutes,
      doc: s.doc,
      woc: s.woc,
      toolStickout: s.toolStickout,
      toolLoc: s.toolLoc,
    }))
  );

export const useResultsState = () =>
  useCalculatorStore(
    useShallow((s) => ({
      result: s.result,
      wedmResult: s.wedmResult,
      loading: s.loading,
      error: s.error,
    }))
  );

export const useUIState = () =>
  useCalculatorStore(
    useShallow((s) => ({
      loading: s.loading,
      error: s.error,
      shellRailCollapsed: s.shellRailCollapsed,
      selectedStation: s.selectedStation,
    }))
  );

export const useMachineSelection = () =>
  useCalculatorStore(
    useShallow((s) => ({
      machineMode: s.machineMode,
      machineTypeId: s.machineTypeId,
      manufacturer: s.manufacturer,
      machineId: s.machineId,
      controllerOptionId: s.controllerOptionId,
      spindleOptionId: s.spindleOptionId,
    }))
  );

export const useMaterialSelection = () =>
  useCalculatorStore(
    useShallow((s) => ({
      materialGroup: s.materialGroup,
      materialSubcategoryId: s.materialSubcategoryId,
      materialId: s.materialId,
    }))
  );

export const useToolSelection = () =>
  useCalculatorStore(
    useShallow((s) => ({
      toolId: s.toolId,
      toolBodyFilter: s.toolBodyFilter,
      insertId: s.insertId,
      toolVendorFilter: s.toolVendorFilter,
      toolGeometryFilter: s.toolGeometryFilter,
      toolSizeFilter: s.toolSizeFilter,
    }))
  );

// ============================================================================
// Action Selectors — stable references
// ============================================================================

export const useWorkspaceActions = () =>
  useCalculatorStore(
    useShallow((s) => ({
      setExperience: s.setExperience,
      setMachineMode: s.setMachineMode,
      setMachineId: s.setMachineId,
      setMaterialGroup: s.setMaterialGroup,
      setMaterialId: s.setMaterialId,
      setToolId: s.setToolId,
      setOperation: s.setOperation,
      setUnitSystem: s.setUnitSystem,
      resetWorkspace: s.resetWorkspace,
    }))
  );

export const useDimensionsActions = () =>
  useCalculatorStore(
    useShallow((s) => ({
      setStockX: s.setStockX,
      setStockY: s.setStockY,
      setStockZ: s.setStockZ,
      setToolDiameter: s.setToolDiameter,
      setFlutes: s.setFlutes,
      setDoc: s.setDoc,
      setWoc: s.setWoc,
      resetDimensions: s.resetDimensions,
    }))
  );

export const useResultsActions = () =>
  useCalculatorStore(
    useShallow((s) => ({
      setResult: s.setResult,
      setWedmResult: s.setWedmResult,
      setLoading: s.setLoading,
      setError: s.setError,
      clearResults: s.clearResults,
      clearError: s.clearError,
    }))
  );
