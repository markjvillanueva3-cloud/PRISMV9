/**
 * CPS Mock Fusion API — U-SH02 Helper
 *
 * Provides mock implementations of Fusion 360's post-processor API
 * so we can run PRISM_PHYSICS.calculateAll() in Node.js via vm module.
 *
 * These mocks simulate what Fusion 360 provides at runtime:
 * - getProperty(name) — reads post properties
 * - hasParameter(name) — checks operation parameters
 * - getParameter(name) — reads operation parameters
 * - tool object — tool geometry from Fusion's tool library
 * - currentSection — current toolpath operation
 */

export interface MockToolConfig {
  diameter: number; // mm
  numberOfFlutes: number;
  bodyLength: number; // mm
  fluteLength: number; // mm
  cornerRadius: number; // mm
  type: number; // Fusion tool type enum
  material: number; // Fusion tool material enum
  description?: string;
}

export interface MockOperationConfig {
  strategy: string;
  programmedRPM: number;
  programmedFeed: number; // mm/min
  axialDepth?: number; // mm
  radialDepth?: number; // mm (stepover)
  optimalLoad?: number; // mm (adaptive stepover)
  stockToLeave?: number;
  tolerance?: number;
  isRoughing?: boolean;
  isFinishing?: boolean;
}

export interface MockPropertyOverrides {
  prismMachineModel?: string;
  prismMaterialGroup?: string;
  prismMaterialSpecific?: string;
  prismApplyCalculations?: string;
  prismEnableIntelligence?: boolean;
  prismSpindleMaxRPM?: string;
  prismSpindlePower?: string;
  prismSpindleTorque?: string;
  prismMachineRigidity?: string;
  prismMaxFeedRate?: string;
  prismProveOut?: boolean;
  prismProveOutSpeedPct?: number;
  prismProveOutFeedPct?: number;
  [key: string]: any;
}

/**
 * Create the sandbox context for running CPS JavaScript in vm.
 */
export function createFusionSandbox(
  propertyOverrides: MockPropertyOverrides = {},
  toolConfig?: MockToolConfig,
  operation?: MockOperationConfig
): Record<string, any> {
  // Default post properties
  const defaultProperties: Record<string, any> = {
    prismMachineModel: "hurco_vm30i",
    prismMaterialGroup: "P",
    prismMaterialSpecific: "P_4140_ANN",
    prismApplyCalculations: "smart",
    prismEnableIntelligence: true,
    prismChipThinFormula: "auto",
    prismShowWarnings: true,
    prismSpindleMaxRPM: "10000",
    prismSpindlePower: "25",
    prismSpindleTorque: "105",
    prismMachineRigidity: "medium",
    prismMaxFeedRate: "400",
    prismProveOut: false,
    prismProveOutSpeedPct: 80,
    prismProveOutFeedPct: 50,
    prismExcludeDrillingFromMultipliers: false,
    // Default tool 1 pocket properties
    prismT1ToolType: "flat_endmill",
    prismT1ToolMat: "carbide",
    prismT1Coating: "tialn",
    prismT1Brand: "generic",
    prismT1Flutes: "4",
    prismT1Helix: "38",
    prismT1HolderType: "er_collet",
    prismT1Condition: "new",
    prismT1SpeedMult: "1.0",
    prismT1FeedMult: "1.0",
    prismT1HSMMode: "auto",
    prismT1FinishMode: "auto",
    prismT1OptMode: "global",
    prismT1Aggressiveness: "5",
    prismT1DeflectionLimit: "0.002",
    prismT1TargetRa: "32",
    prismT1HolderExtension: "0",
    prismT1Indexable: false,
    ...propertyOverrides,
  };

  // Mock Fusion tool object
  const mockTool = toolConfig
    ? {
        diameter: toolConfig.diameter,
        numberOfFlutes: toolConfig.numberOfFlutes,
        bodyLength: toolConfig.bodyLength,
        fluteLength: toolConfig.fluteLength,
        cornerRadius: toolConfig.cornerRadius,
        type: toolConfig.type,
        material: toolConfig.material,
        description: toolConfig.description || "",
        getBodyLength: () => toolConfig.bodyLength,
        getFluteLength: () => toolConfig.fluteLength,
        getDiameter: () => toolConfig.diameter,
        getCornerRadius: () => toolConfig.cornerRadius,
        getNumberOfFlutes: () => toolConfig.numberOfFlutes,
      }
    : null;

  // Mock operation parameters
  const operationParams: Record<string, any> = operation
    ? {
        "operation:strategy": operation.strategy,
        "operation:tool_stepdown": operation.axialDepth,
        "operation:tool_stepover": operation.radialDepth,
        "operation:tolerance": operation.tolerance,
        "operation:stock-to-leave": operation.stockToLeave,
        "operation:optimalLoad": operation.optimalLoad,
      }
    : {};

  // Mock currentSection
  const mockSection = operation
    ? {
        strategy: operation.strategy,
        getParameter: (name: string) => operationParams[name],
        hasParameter: (name: string) => name in operationParams,
        getOptimizedLoad: () => operation.optimalLoad || 0,
        getTool: () => mockTool,
        getUnit: () => 1, // MM
        type: 0, // milling
      }
    : null;

  return {
    // JavaScript builtins
    console,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    String,
    Number,
    Array,
    Object,
    JSON,
    Date,
    RegExp,
    Error,

    // Fusion 360 post-processor API
    getProperty: (name: string) => {
      return defaultProperties[name] ?? undefined;
    },
    hasParameter: (name: string) => name in operationParams,
    getParameter: (name: string) => operationParams[name] ?? 0,
    warning: () => {},
    log: () => {},
    error: () => {},

    // Fusion 360 constants
    unit: 1, // MM
    IN: 0,
    MM: 1,

    // Fusion 360 tool types — must match Fusion's internal enum values
    TOOL_MILLING_END_FLAT: 0,
    TOOL_MILLING_END_BALL: 1,
    TOOL_MILLING_END_BULLNOSE: 2,
    TOOL_MILLING_FACE: 3,
    TOOL_MILLING_SLOT: 4,
    TOOL_MILLING_CHAMFER: 5,
    TOOL_DRILL: 10,
    TOOL_DRILL_CENTER: 11,
    TOOL_DRILL_SPOT: 12,
    TOOL_DRILL_BLOCK: 13,
    TOOL_TAP_RIGHT_HAND: 14,
    TOOL_TAP_LEFT_HAND: 15,
    TOOL_REAMER: 16,
    TOOL_BORING_BAR: 17,
    TOOL_COUNTER_BORE: 18,
    TOOL_COUNTER_SINK: 19,
    TOOL_PROBE: 20,
    TOOL_TURNING_GENERAL: 30,

    // Fusion tool material types
    TOOL_MATERIAL_HSS: 0,
    TOOL_MATERIAL_CARBIDE: 1,

    // CPS global variables that may be referenced
    cycleType: undefined,

    // Current tool & section — tool is ALWAYS present with defaults
    // CPS accesses tool.bodyLength, tool.fluteLength, tool.numberOfFlutes,
    // tool.cornerRadius, tool.taperAngle, tool.type, tool.description directly
    tool: mockTool
      ? { ...mockTool, taperAngle: 0, clockwise: true }
      : {
          diameter: 12.7,
          numberOfFlutes: 4,
          bodyLength: 50,
          fluteLength: 38,
          cornerRadius: 0,
          taperAngle: 0,
          type: 0,
          material: 1,
          description: "",
          clockwise: true,
          getBodyLength: () => 50,
          getFluteLength: () => 38,
          getDiameter: () => 12.7,
          getCornerRadius: () => 0,
          getNumberOfFlutes: () => 4,
        },
    currentSection: mockSection,
  };
}

/**
 * Test scenarios: 5 material+tool combinations for CPS simulator.
 */
export const TEST_SCENARIOS = [
  {
    name: "4140 Annealed Steel — 12.7mm 4-flute endmill — Adaptive",
    materialId: "P_4140_ANN",
    tool: {
      diameter: 12.7,
      numberOfFlutes: 4,
      bodyLength: 50,
      fluteLength: 38,
      cornerRadius: 0,
      type: 0, // flat endmill
      material: 1, // carbide
    } as MockToolConfig,
    operation: {
      strategy: "adaptive2d",
      programmedRPM: 6680,
      programmedFeed: 6096,
      axialDepth: 33,
      optimalLoad: 0.762, // 0.03" ae
    } as MockOperationConfig,
    properties: {
      prismMaterialSpecific: "P_4140_ANN",
    } as MockPropertyOverrides,
    expectedRPM: { min: 3000, max: 12000 },
    expectedFeed: { min: 1000, max: 15000 }, // mm/min
  },
  {
    name: "6061-T6 Aluminum — 12.7mm 3-flute — Adaptive HSM",
    materialId: "N_6061_T6",
    tool: {
      diameter: 12.7,
      numberOfFlutes: 3,
      bodyLength: 50,
      fluteLength: 38,
      cornerRadius: 0,
      type: 0,
      material: 1,
    } as MockToolConfig,
    operation: {
      strategy: "adaptive2d",
      programmedRPM: 10000,
      programmedFeed: 5000,
      axialDepth: 25,
      optimalLoad: 2.54, // 10% WOC
    } as MockOperationConfig,
    properties: {
      prismMaterialSpecific: "N_6061_T6",
    } as MockPropertyOverrides,
    expectedRPM: { min: 5000, max: 15000 },
    expectedFeed: { min: 2000, max: 20000 },
  },
  {
    name: "304 Stainless — 10mm 4-flute — Contour finish",
    materialId: "M_304_ANN",
    tool: {
      diameter: 10,
      numberOfFlutes: 4,
      bodyLength: 40,
      fluteLength: 30,
      cornerRadius: 0.5,
      type: 0,
      material: 1,
    } as MockToolConfig,
    operation: {
      strategy: "contour",
      programmedRPM: 3000,
      programmedFeed: 900,
      radialDepth: 0.5,
    } as MockOperationConfig,
    properties: {
      prismMaterialSpecific: "M_304_ANN",
    } as MockPropertyOverrides,
    expectedRPM: { min: 1500, max: 6000 },
    expectedFeed: { min: 50, max: 3000 }, // finish pass at 0.5mm stepover: low feed is correct
  },
  {
    name: "H13 Annealed — 12.7mm 6-flute — HEM adaptive",
    materialId: "P_H13_ANN",
    tool: {
      diameter: 12.7,
      numberOfFlutes: 6,
      bodyLength: 50,
      fluteLength: 38,
      cornerRadius: 0,
      type: 0,
      material: 1,
    } as MockToolConfig,
    operation: {
      strategy: "adaptive2d",
      programmedRPM: 6680,
      programmedFeed: 6096,
      axialDepth: 33,
      optimalLoad: 0.762, // ~6% WOC
    } as MockOperationConfig,
    properties: {
      prismMaterialSpecific: "P_H13_ANN",
      prismT1Brand: "yg1",
      prismT1Flutes: "6",
    } as MockPropertyOverrides,
    expectedRPM: { min: 3000, max: 10000 },
    expectedFeed: { min: 2000, max: 15000 },
  },
  {
    name: "Ti-6Al-4V — 8mm 4-flute — Pocket (slotting)",
    materialId: "S_TI64_ANN",
    tool: {
      diameter: 8,
      numberOfFlutes: 4,
      bodyLength: 35,
      fluteLength: 24,
      cornerRadius: 0,
      type: 0,
      material: 1,
    } as MockToolConfig,
    operation: {
      strategy: "pocket2d",
      programmedRPM: 2000,
      programmedFeed: 400,
      axialDepth: 4,
      radialDepth: 4, // 50% WOC
    } as MockOperationConfig,
    properties: {
      prismMaterialSpecific: "S_TI64_ANN",
    } as MockPropertyOverrides,
    expectedRPM: { min: 800, max: 4000 },
    expectedFeed: { min: 100, max: 2000 },
  },
];
