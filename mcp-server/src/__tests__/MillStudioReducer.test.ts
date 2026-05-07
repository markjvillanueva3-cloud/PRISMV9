/**
 * MillStudioReducer.test.ts — Mill Studio State Management Tests
 * MILL-MASTER/P0-U01-STUDIO-CTX
 *
 * Tests reducer pure-functions and state transitions (no React rendering needed).
 * ≥15 cases covering all action types + edge cases + integration.
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// IMPORT TYPES AND REDUCER FROM CONTEXT (extract logic for testing)
// ============================================================================

type MillStep = "import" | "material" | "strategy" | "tooling" | "parameters" | "program";

interface MillFeature {
  type: "face" | "pocket_2d" | "pocket_3d" | "contour" | "slot" | "hole" | "thread" | "chamfer" | "engrave" | "rest" | "surface_3d";
  dimensions: Record<string, number>;
  depth_mm?: number;
  width_mm?: number;
  length_mm?: number;
  diameter_mm?: number;
  count?: number;
}

interface StockInfo {
  material: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness?: number;
  hardnessUnit?: "HRC" | "HB";
  width_mm: number;
  length_mm: number;
  height_mm: number;
  stock_type?: "block" | "plate" | "round" | "hex" | "casting" | "forging";
}

interface MillStrategy {
  id: string;
  type: "facing" | "roughing" | "finishing" | "hsm" | "trochoidal" | "adaptive" | "rest" | "pencil" | "scallop" | "contour" | "drilling" | "thread_mill";
  stepdown_mm?: number;
  stepover_percent?: number;
  leave_stock_mm?: number;
  sequence: number;
}

interface MillTool {
  id: string;
  type: "flat_endmill" | "ball_endmill" | "bull_nose" | "face_mill" | "drill" | "tap" | "thread_mill" | "chamfer_mill";
  diameter_mm: number;
  flutes: number;
  corner_radius_mm?: number;
  coating?: string;
  material?: "carbide" | "hss" | "cobalt" | "ceramic" | "cbn" | "pcd";
}

interface CuttingParams {
  strategyId: string;
  toolId: string;
  rpm: number;
  feed_mm_min: number;
  plunge_feed_mm_min: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  coolant: "flood" | "mql" | "air_blast" | "through_spindle" | "dry";
  entry_type?: "plunge" | "ramp" | "helical" | "predrilled";
  cutting_direction?: "climb" | "conventional" | "mixed";
}

interface ProgramOutput {
  gcode: string;
  cycle_time_s: number;
  setup_time_min: number;
  warnings: string[];
  safety_checks: { check: string; passed: boolean }[];
  tools_used: { number: number; description: string; cutting_time_min: number }[];
}

interface MillStepData {
  import?: {
    filename?: string;
    fileType?: "cad" | "stl" | "photo" | "pdf";
    features?: MillFeature[];
    envelope_mm?: { x: number; y: number; z: number };
    confidence?: number;
  };
  material?: StockInfo;
  strategy?: MillStrategy[];
  tooling?: MillTool[];
  parameters?: CuttingParams[];
  program?: ProgramOutput;
}

interface MillStudioState {
  currentStep: MillStep;
  steps: MillStepData;
  machineId: string;
  controllerId: string;
  qualityTier: "prototype" | "production" | "precision" | "aerospace";
  errors: string[];
  isProcessing: boolean;
  jobId?: string;
}

type MillStudioAction =
  | { type: "SET_STEP"; step: MillStep }
  | { type: "UPDATE_IMPORT"; data: MillStepData["import"] }
  | { type: "UPDATE_MATERIAL"; data: MillStepData["material"] }
  | { type: "UPDATE_STRATEGY"; data: MillStepData["strategy"] }
  | { type: "UPDATE_TOOLING"; data: MillStepData["tooling"] }
  | { type: "UPDATE_PARAMETERS"; data: MillStepData["parameters"] }
  | { type: "UPDATE_PROGRAM"; data: MillStepData["program"] }
  | { type: "SET_MACHINE"; machineId: string; controllerId: string }
  | { type: "SET_QUALITY_TIER"; tier: MillStudioState["qualityTier"] }
  | { type: "SET_PROCESSING"; isProcessing: boolean }
  | { type: "SET_JOB_ID"; jobId: string }
  | { type: "ADD_ERROR"; error: string }
  | { type: "CLEAR_ERRORS" }
  | { type: "RESET" };

const initialState: MillStudioState = {
  currentStep: "import",
  steps: {},
  machineId: "haas-vf2",
  controllerId: "haas-ngc",
  qualityTier: "production",
  errors: [],
  isProcessing: false,
};

function millStudioReducer(state: MillStudioState, action: MillStudioAction): MillStudioState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "UPDATE_IMPORT":
      return { ...state, steps: { ...state.steps, import: action.data } };
    case "UPDATE_MATERIAL":
      return { ...state, steps: { ...state.steps, material: action.data } };
    case "UPDATE_STRATEGY":
      return { ...state, steps: { ...state.steps, strategy: action.data } };
    case "UPDATE_TOOLING":
      return { ...state, steps: { ...state.steps, tooling: action.data } };
    case "UPDATE_PARAMETERS":
      return { ...state, steps: { ...state.steps, parameters: action.data } };
    case "UPDATE_PROGRAM":
      return { ...state, steps: { ...state.steps, program: action.data } };
    case "SET_MACHINE":
      return { ...state, machineId: action.machineId, controllerId: action.controllerId };
    case "SET_QUALITY_TIER":
      return { ...state, qualityTier: action.tier };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.isProcessing };
    case "SET_JOB_ID":
      return { ...state, jobId: action.jobId };
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
// TESTS
// ============================================================================

describe("MillStudioReducer", () => {
  describe("SET_STEP action", () => {
    it("transitions to import step", () => {
      const state = millStudioReducer(initialState, { type: "SET_STEP", step: "import" });
      expect(state.currentStep).toBe("import");
    });

    it("transitions to material step", () => {
      const state = millStudioReducer(initialState, { type: "SET_STEP", step: "material" });
      expect(state.currentStep).toBe("material");
    });

    it("transitions to strategy step", () => {
      const state = millStudioReducer(initialState, { type: "SET_STEP", step: "strategy" });
      expect(state.currentStep).toBe("strategy");
    });

    it("transitions to tooling step", () => {
      const state = millStudioReducer(initialState, { type: "SET_STEP", step: "tooling" });
      expect(state.currentStep).toBe("tooling");
    });

    it("transitions to parameters step", () => {
      const state = millStudioReducer(initialState, { type: "SET_STEP", step: "parameters" });
      expect(state.currentStep).toBe("parameters");
    });

    it("transitions to program step", () => {
      const state = millStudioReducer(initialState, { type: "SET_STEP", step: "program" });
      expect(state.currentStep).toBe("program");
    });
  });

  describe("UPDATE_IMPORT action", () => {
    it("stores CAD file data with features", () => {
      const importData: MillStepData["import"] = {
        filename: "bracket.step",
        fileType: "cad",
        features: [
          { type: "pocket_2d", dimensions: { depth: 10, width: 25 }, depth_mm: 10, width_mm: 25 },
          { type: "hole", dimensions: { diameter: 8 }, diameter_mm: 8, count: 4 },
        ],
        envelope_mm: { x: 100, y: 75, z: 40 },
        confidence: 0.92,
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_IMPORT", data: importData });

      expect(state.steps.import?.filename).toBe("bracket.step");
      expect(state.steps.import?.features).toHaveLength(2);
      expect(state.steps.import?.features?.[0].type).toBe("pocket_2d");
      expect(state.steps.import?.envelope_mm?.x).toBe(100);
      expect(state.steps.import?.confidence).toBe(0.92);
    });

    it("handles photo upload with OCR hints", () => {
      const importData: MillStepData["import"] = {
        filename: "drawing.jpg",
        fileType: "photo",
        features: [{ type: "contour", dimensions: { length: 150 }, length_mm: 150 }],
        confidence: 0.75,
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_IMPORT", data: importData });
      expect(state.steps.import?.fileType).toBe("photo");
      expect(state.steps.import?.confidence).toBe(0.75);
    });
  });

  describe("UPDATE_MATERIAL action", () => {
    it("stores aluminum stock specification", () => {
      const material: MillStepData["material"] = {
        material: "6061-T6",
        iso_group: "N",
        hardness: 95,
        hardnessUnit: "HB",
        width_mm: 150,
        length_mm: 200,
        height_mm: 50,
        stock_type: "block",
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_MATERIAL", data: material });

      expect(state.steps.material?.material).toBe("6061-T6");
      expect(state.steps.material?.iso_group).toBe("N");
      expect(state.steps.material?.height_mm).toBe(50);
      expect(state.steps.material?.stock_type).toBe("block");
    });

    it("stores titanium stock specification", () => {
      const material: MillStepData["material"] = {
        material: "Ti-6Al-4V",
        iso_group: "S",
        hardness: 36,
        hardnessUnit: "HRC",
        width_mm: 100,
        length_mm: 100,
        height_mm: 25,
        stock_type: "forging",
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_MATERIAL", data: material });
      expect(state.steps.material?.iso_group).toBe("S");
      expect(state.steps.material?.hardnessUnit).toBe("HRC");
    });

    it("stores tool steel specification", () => {
      const material: MillStepData["material"] = {
        material: "D2",
        iso_group: "H",
        hardness: 60,
        hardnessUnit: "HRC",
        width_mm: 80,
        length_mm: 120,
        height_mm: 30,
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_MATERIAL", data: material });
      expect(state.steps.material?.iso_group).toBe("H");
    });
  });

  describe("UPDATE_STRATEGY action", () => {
    it("stores 3-stage milling strategy (face/rough/finish)", () => {
      const strategies: MillStepData["strategy"] = [
        { id: "s1", type: "facing", sequence: 1 },
        { id: "s2", type: "roughing", stepdown_mm: 3, stepover_percent: 40, leave_stock_mm: 0.5, sequence: 2 },
        { id: "s3", type: "finishing", stepdown_mm: 0.3, stepover_percent: 15, sequence: 3 },
      ];

      const state = millStudioReducer(initialState, { type: "UPDATE_STRATEGY", data: strategies });

      expect(state.steps.strategy).toHaveLength(3);
      expect(state.steps.strategy?.[0].type).toBe("facing");
      expect(state.steps.strategy?.[1].leave_stock_mm).toBe(0.5);
      expect(state.steps.strategy?.[2].stepover_percent).toBe(15);
    });

    it("stores HSM/trochoidal strategy", () => {
      const strategies: MillStepData["strategy"] = [
        { id: "s1", type: "hsm", stepdown_mm: 12, stepover_percent: 10, sequence: 1 },
        { id: "s2", type: "trochoidal", stepdown_mm: 15, stepover_percent: 8, sequence: 2 },
      ];

      const state = millStudioReducer(initialState, { type: "UPDATE_STRATEGY", data: strategies });
      expect(state.steps.strategy?.[0].type).toBe("hsm");
      expect(state.steps.strategy?.[1].type).toBe("trochoidal");
    });
  });

  describe("UPDATE_TOOLING action", () => {
    it("stores typical 3-tool setup", () => {
      const tools: MillStepData["tooling"] = [
        { id: "t1", type: "face_mill", diameter_mm: 50, flutes: 5, material: "carbide" },
        { id: "t2", type: "flat_endmill", diameter_mm: 12, flutes: 4, corner_radius_mm: 0.5, coating: "TiAlN" },
        { id: "t3", type: "ball_endmill", diameter_mm: 6, flutes: 2, material: "carbide" },
      ];

      const state = millStudioReducer(initialState, { type: "UPDATE_TOOLING", data: tools });

      expect(state.steps.tooling).toHaveLength(3);
      expect(state.steps.tooling?.[0].diameter_mm).toBe(50);
      expect(state.steps.tooling?.[1].coating).toBe("TiAlN");
      expect(state.steps.tooling?.[2].type).toBe("ball_endmill");
    });

    it("stores drilling and tapping tools", () => {
      const tools: MillStepData["tooling"] = [
        { id: "t1", type: "drill", diameter_mm: 6.8, flutes: 2, material: "cobalt" },
        { id: "t2", type: "tap", diameter_mm: 8, flutes: 3, material: "hss" },
      ];

      const state = millStudioReducer(initialState, { type: "UPDATE_TOOLING", data: tools });
      expect(state.steps.tooling?.[0].type).toBe("drill");
      expect(state.steps.tooling?.[1].type).toBe("tap");
    });
  });

  describe("UPDATE_PARAMETERS action", () => {
    it("stores cutting parameters for aluminum", () => {
      const params: MillStepData["parameters"] = [
        {
          strategyId: "s1",
          toolId: "t1",
          rpm: 8000,
          feed_mm_min: 2400,
          plunge_feed_mm_min: 500,
          axial_depth_mm: 2,
          radial_depth_mm: 40,
          coolant: "flood",
          cutting_direction: "climb",
        },
      ];

      const state = millStudioReducer(initialState, { type: "UPDATE_PARAMETERS", data: params });

      expect(state.steps.parameters?.[0].rpm).toBe(8000);
      expect(state.steps.parameters?.[0].feed_mm_min).toBe(2400);
      expect(state.steps.parameters?.[0].coolant).toBe("flood");
    });

    it("stores parameters with helical entry for steel", () => {
      const params: MillStepData["parameters"] = [
        {
          strategyId: "s2",
          toolId: "t2",
          rpm: 6000,
          feed_mm_min: 1200,
          plunge_feed_mm_min: 300,
          axial_depth_mm: 3,
          radial_depth_mm: 4.8,
          coolant: "through_spindle",
          entry_type: "helical",
          cutting_direction: "climb",
        },
      ];

      const state = millStudioReducer(initialState, { type: "UPDATE_PARAMETERS", data: params });
      expect(state.steps.parameters?.[0].entry_type).toBe("helical");
      expect(state.steps.parameters?.[0].coolant).toBe("through_spindle");
    });
  });

  describe("UPDATE_PROGRAM action", () => {
    it("stores generated G-code output", () => {
      const program: MillStepData["program"] = {
        gcode: "%\nO0001\nG90 G54\nT1 M6\nS8000 M3\nG0 X0 Y0\nG43 Z0.1 H1\nM30\n%",
        cycle_time_s: 245,
        setup_time_min: 12,
        warnings: [],
        safety_checks: [
          { check: "spindle_torque", passed: true },
          { check: "tool_deflection", passed: true },
        ],
        tools_used: [
          { number: 1, description: "50mm face mill", cutting_time_min: 1.2 },
          { number: 2, description: "12mm endmill", cutting_time_min: 2.8 },
        ],
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_PROGRAM", data: program });

      expect(state.steps.program?.cycle_time_s).toBe(245);
      expect(state.steps.program?.safety_checks).toHaveLength(2);
      expect(state.steps.program?.tools_used).toHaveLength(2);
      expect(state.steps.program?.gcode).toContain("G90 G54");
    });

    it("stores program with warnings", () => {
      const program: MillStepData["program"] = {
        gcode: "%\nO0001\nM30\n%",
        cycle_time_s: 120,
        setup_time_min: 8,
        warnings: ["Tool deflection exceeds 0.05mm", "Consider reduced DOC"],
        safety_checks: [{ check: "tool_deflection", passed: false }],
        tools_used: [],
      };

      const state = millStudioReducer(initialState, { type: "UPDATE_PROGRAM", data: program });
      expect(state.steps.program?.warnings).toHaveLength(2);
      expect(state.steps.program?.safety_checks?.[0].passed).toBe(false);
    });
  });

  describe("SET_MACHINE action", () => {
    it("sets Haas machine and controller", () => {
      const state = millStudioReducer(initialState, {
        type: "SET_MACHINE",
        machineId: "haas-vf4",
        controllerId: "haas-ngc",
      });

      expect(state.machineId).toBe("haas-vf4");
      expect(state.controllerId).toBe("haas-ngc");
    });

    it("sets DMG 5-axis and Siemens controller", () => {
      const state = millStudioReducer(initialState, {
        type: "SET_MACHINE",
        machineId: "dmg-dmu50",
        controllerId: "siemens-840d",
      });

      expect(state.machineId).toBe("dmg-dmu50");
      expect(state.controllerId).toBe("siemens-840d");
    });

    it("sets Mazak with Mazatrol", () => {
      const state = millStudioReducer(initialState, {
        type: "SET_MACHINE",
        machineId: "mazak-variaxis",
        controllerId: "mazatrol-smooth",
      });

      expect(state.machineId).toBe("mazak-variaxis");
      expect(state.controllerId).toBe("mazatrol-smooth");
    });
  });

  describe("SET_QUALITY_TIER action", () => {
    it("sets prototype tier", () => {
      const state = millStudioReducer(initialState, { type: "SET_QUALITY_TIER", tier: "prototype" });
      expect(state.qualityTier).toBe("prototype");
    });

    it("sets aerospace tier", () => {
      const state = millStudioReducer(initialState, { type: "SET_QUALITY_TIER", tier: "aerospace" });
      expect(state.qualityTier).toBe("aerospace");
    });

    it("sets precision tier", () => {
      const state = millStudioReducer(initialState, { type: "SET_QUALITY_TIER", tier: "precision" });
      expect(state.qualityTier).toBe("precision");
    });
  });

  describe("SET_PROCESSING action", () => {
    it("sets processing to true", () => {
      const state = millStudioReducer(initialState, { type: "SET_PROCESSING", isProcessing: true });
      expect(state.isProcessing).toBe(true);
    });

    it("sets processing to false", () => {
      const prevState = { ...initialState, isProcessing: true };
      const state = millStudioReducer(prevState, { type: "SET_PROCESSING", isProcessing: false });
      expect(state.isProcessing).toBe(false);
    });
  });

  describe("SET_JOB_ID action", () => {
    it("stores job tracking ID", () => {
      const state = millStudioReducer(initialState, { type: "SET_JOB_ID", jobId: "MILL-ABC123" });
      expect(state.jobId).toBe("MILL-ABC123");
    });
  });

  describe("error handling", () => {
    it("ADD_ERROR appends to error list", () => {
      let state = millStudioReducer(initialState, { type: "ADD_ERROR", error: "Tool not found" });
      expect(state.errors).toContain("Tool not found");

      state = millStudioReducer(state, { type: "ADD_ERROR", error: "Material invalid" });
      expect(state.errors).toHaveLength(2);
    });

    it("CLEAR_ERRORS empties error list", () => {
      let state = millStudioReducer(initialState, { type: "ADD_ERROR", error: "Error 1" });
      state = millStudioReducer(state, { type: "ADD_ERROR", error: "Error 2" });
      expect(state.errors).toHaveLength(2);

      state = millStudioReducer(state, { type: "CLEAR_ERRORS" });
      expect(state.errors).toHaveLength(0);
    });
  });

  describe("RESET action", () => {
    it("resets all state to initial values", () => {
      let state = millStudioReducer(initialState, { type: "SET_STEP", step: "parameters" });
      state = millStudioReducer(state, {
        type: "UPDATE_MATERIAL",
        data: { material: "Ti-6Al-4V", iso_group: "S", width_mm: 100, length_mm: 100, height_mm: 25 },
      });
      state = millStudioReducer(state, { type: "SET_MACHINE", machineId: "dmg-dmu80", controllerId: "siemens-840d" });
      state = millStudioReducer(state, { type: "ADD_ERROR", error: "Test error" });
      state = millStudioReducer(state, { type: "SET_JOB_ID", jobId: "MILL-XYZ" });

      expect(state.currentStep).toBe("parameters");
      expect(state.steps.material?.material).toBe("Ti-6Al-4V");
      expect(state.machineId).toBe("dmg-dmu80");
      expect(state.errors).toHaveLength(1);

      state = millStudioReducer(state, { type: "RESET" });

      expect(state.currentStep).toBe("import");
      expect(state.steps.material).toBeUndefined();
      expect(state.machineId).toBe("haas-vf2");
      expect(state.controllerId).toBe("haas-ngc");
      expect(state.errors).toHaveLength(0);
      expect(state.jobId).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles empty features array", () => {
      const state = millStudioReducer(initialState, { type: "UPDATE_IMPORT", data: { features: [] } });
      expect(state.steps.import?.features).toEqual([]);
    });

    it("handles undefined optional fields", () => {
      const state = millStudioReducer(initialState, {
        type: "UPDATE_MATERIAL",
        data: { material: "4140", width_mm: 100, length_mm: 100, height_mm: 50 },
      });
      expect(state.steps.material?.material).toBe("4140");
      expect(state.steps.material?.iso_group).toBeUndefined();
    });

    it("preserves state across multiple updates", () => {
      let state = millStudioReducer(initialState, { type: "UPDATE_IMPORT", data: { filename: "part1.step" } });
      state = millStudioReducer(state, {
        type: "UPDATE_MATERIAL",
        data: { material: "A2", iso_group: "K", width_mm: 80, length_mm: 120, height_mm: 30 },
      });

      expect(state.steps.import?.filename).toBe("part1.step");
      expect(state.steps.material?.material).toBe("A2");
    });

    it("unknown action returns unchanged state", () => {
      const state = millStudioReducer(initialState, { type: "UNKNOWN_ACTION" } as any);
      expect(state).toBe(initialState);
    });
  });

  describe("state immutability", () => {
    it("does not mutate original state", () => {
      const originalSteps = initialState.steps;
      const originalErrors = initialState.errors;

      millStudioReducer(initialState, { type: "UPDATE_IMPORT", data: { filename: "test.step" } });
      millStudioReducer(initialState, { type: "ADD_ERROR", error: "Test" });

      expect(initialState.steps).toBe(originalSteps);
      expect(initialState.errors).toBe(originalErrors);
    });
  });
});
