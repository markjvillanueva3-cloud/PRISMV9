/**
 * HyperMill Automation Center Intelligence Data
 * Extracted from: H:/PRISM/Resources/HYPERMILL/hyperMILL/31.0/AddIns/hmAutoColor/
 *
 * This file contains fixture mappings, stock materials, tool report fields,
 * and process templates extracted from the HyperMill Automation Center installation.
 *
 * Source directories:
 * - Wizards/AutomationCenter/CLAMPS/OPEN MIND/ - Fixture configurations
 * - doc/Stocklist.xlsx - Standard stock material sizes
 * - SYSTEM_PROCESS/Reports/ToolReports/ - Tool report templates
 * - Wizards/AutomationCenter/OMPROCESS/ - Process automation templates
 */

// ============================================================================
// FIXTURE MAPPINGS
// ============================================================================

/**
 * Fixture type enumeration for workholding systems.
 * Maps to HyperMill's color-coded clamp layer naming convention.
 */
export type HyperMillFixtureType =
  | "VICE_CLAMP" // Dual-jaw vice (Y+ / Y- dynamic, static base)
  | "3_JAW_CHUCK" // 3-jaw chuck (0/120/240 deg dynamic, static base)
  | "4_JAW_CHUCK" // 4-jaw independent chuck
  | "6_JAW_CHUCK" // 6-jaw chuck
  | "CENTRIC_VISE" // Self-centering vise
  | "SIMPLE_CLAMP" // Simple toe clamps
  | "CLAMP_SYSTEM"; // Full clamp system with multiple elements

/**
 * Dynamic clamp layers for HyperMill's parametric fixture system.
 * Colors are RGB values used for face selection in Automation Center.
 */
export interface HyperMillClampLayer {
  /** Layer name in HyperMill model hierarchy */
  layerName: string;
  /** RGB color for face selection (0-255) */
  color: [number, number, number];
  /** Description of the clamp component */
  description: string;
  /** Whether this component moves during clamping */
  isDynamic: boolean;
}

/**
 * Fixture configuration from HyperMill Automation Center.
 * Extracted from CLAMPS/OPEN MIND/ directory.
 */
export interface HyperMillFixtureConfiguration {
  /** Unique fixture name (matches .hmc file name) */
  name: string;
  /** Fixture type classification */
  type: HyperMillFixtureType;
  /** Workpiece dimension range - minimum Y clamping distance (mm) */
  minY: number;
  /** Workpiece dimension range - maximum Y clamping distance (mm) */
  maxY: number;
  /** Workpiece dimension range - minimum X (mm) */
  minX: number;
  /** Workpiece dimension range - maximum X (mm) */
  maxX: number;
  /** Workpiece dimension range - minimum Z clearance (mm) */
  minZ: number;
  /** Fixture base X dimension (mm) */
  xDimension: number;
  /** Z-height where clamps engage (mm) */
  clampZ: number;
  /** Safe Z clearance above fixture (mm) */
  safeZ: number;
  /** Compatible machine models */
  compatibleMachines: string[];
  /** Clamp layer definitions for color-coded automation */
  clampLayers: HyperMillClampLayer[];
}

/**
 * HyperMill Automation Center fixture mappings.
 * Extracted from fixtureMapping.xlsx and Find_best_fixture_Automation_standard.xlsx
 */
export const HYPERMILL_FIXTURE_MAPPINGS: HyperMillFixtureConfiguration[] = [
  // Centric vises for larger workpieces
  {
    name: "Centric_6-200",
    type: "CENTRIC_VISE",
    minY: 0,
    maxY: 200,
    minX: 0,
    maxX: 120,
    minZ: 0,
    xDimension: 120,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Centric_6-300",
    type: "CENTRIC_VISE",
    minY: 200,
    maxY: 300,
    minX: 0,
    maxX: 120,
    minZ: 0,
    xDimension: 120,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Centric_6-500",
    type: "CENTRIC_VISE",
    minY: 300,
    maxY: 500,
    minX: 0,
    maxX: 120,
    minZ: 0,
    xDimension: 120,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },

  // Simple clamps for 080 series (Hermle_C20)
  {
    name: "Simple_Clamp_080-020_06-48",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 48,
    minX: 1,
    maxX: 39,
    minZ: 4,
    xDimension: 30,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C20"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_080-020_70-112",
    type: "SIMPLE_CLAMP",
    minY: 70,
    maxY: 112,
    minX: 1,
    maxX: 39,
    minZ: 4,
    xDimension: 30,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C20"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_080-040_06-48",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 48,
    minX: 39.01,
    maxX: 79,
    minZ: 4,
    xDimension: 50,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C20"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_080-040_70-112",
    type: "SIMPLE_CLAMP",
    minY: 70,
    maxY: 112,
    minX: 39.01,
    maxX: 79,
    minZ: 4,
    xDimension: 50,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C20"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_080-080_06-48",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 48,
    minX: 79.01,
    maxX: 120,
    minZ: 4,
    xDimension: 90,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C20"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_080-080_70-112",
    type: "SIMPLE_CLAMP",
    minY: 70,
    maxY: 112,
    minX: 79.01,
    maxX: 120,
    minZ: 4,
    xDimension: 90,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C20"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },

  // Simple clamps for 120 series (Hermle_C30 and Hermle_C40)
  {
    name: "Simple_Clamp_120-025_06-147",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 147,
    minX: 20,
    maxX: 49.99,
    minZ: 4,
    xDimension: 35,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-025_120-267",
    type: "SIMPLE_CLAMP",
    minY: 120,
    maxY: 267,
    minX: 20,
    maxX: 49.99,
    minZ: 4,
    xDimension: 35,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-050_06-147",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 147,
    minX: 50,
    maxX: 79.99,
    minZ: 4,
    xDimension: 70,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-050_120-267",
    type: "SIMPLE_CLAMP",
    minY: 120,
    maxY: 267,
    minX: 50,
    maxX: 79.99,
    minZ: 4,
    xDimension: 70,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-080_06-147",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 147,
    minX: 80,
    maxX: 119.99,
    minZ: 4,
    xDimension: 90,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-080_120-267",
    type: "SIMPLE_CLAMP",
    minY: 120,
    maxY: 267,
    minX: 80,
    maxX: 119.99,
    minZ: 4,
    xDimension: 90,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-120_06-147",
    type: "SIMPLE_CLAMP",
    minY: 6,
    maxY: 147,
    minX: 120,
    maxX: 200,
    minZ: 4,
    xDimension: 130,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },
  {
    name: "Simple_Clamp_120-120_120-267",
    type: "SIMPLE_CLAMP",
    minY: 120,
    maxY: 267,
    minX: 120,
    maxX: 200,
    minZ: 4,
    xDimension: 130,
    clampZ: 3,
    safeZ: 0,
    compatibleMachines: ["Hermle_C30", "Hermle_C40"],
    clampLayers: [
      {
        layerName: "CLAMP_Y-",
        color: [251, 251, 0],
        description: "Dynamic Y- jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_Y+",
        color: [254, 1, 200],
        description: "Dynamic Y+ jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static base",
        isDynamic: false,
      },
    ],
  },

  // 3-jaw chuck configurations
  {
    name: "3_Jaw_Chuck_20-150",
    type: "3_JAW_CHUCK",
    minY: 20,
    maxY: 150,
    minX: 20,
    maxX: 150,
    minZ: 0,
    xDimension: 150,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_DYN_0DEG",
        color: [254, 1, 200],
        description: "Dynamic 0 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_120DEG",
        color: [251, 251, 0],
        description: "Dynamic 120 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_240DEG",
        color: [0, 1, 251],
        description: "Dynamic 240 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static chuck body",
        isDynamic: false,
      },
    ],
  },
  {
    name: "3_Jaw_Chuck_20-400",
    type: "3_JAW_CHUCK",
    minY: 20,
    maxY: 400,
    minX: 20,
    maxX: 400,
    minZ: 0,
    xDimension: 400,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_DYN_0DEG",
        color: [254, 1, 200],
        description: "Dynamic 0 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_120DEG",
        color: [251, 251, 0],
        description: "Dynamic 120 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_240DEG",
        color: [0, 1, 251],
        description: "Dynamic 240 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static chuck body",
        isDynamic: false,
      },
    ],
  },
  {
    name: "3_Jaw_Chuck_20-600",
    type: "3_JAW_CHUCK",
    minY: 20,
    maxY: 600,
    minX: 20,
    maxX: 600,
    minZ: 0,
    xDimension: 600,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_DYN_0DEG",
        color: [254, 1, 200],
        description: "Dynamic 0 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_120DEG",
        color: [251, 251, 0],
        description: "Dynamic 120 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_240DEG",
        color: [0, 1, 251],
        description: "Dynamic 240 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static chuck body",
        isDynamic: false,
      },
    ],
  },

  // 4-jaw chuck configuration
  {
    name: "4_Jaw_Chuck_10-130",
    type: "4_JAW_CHUCK",
    minY: 10,
    maxY: 130,
    minX: 10,
    maxX: 130,
    minZ: 0,
    xDimension: 130,
    clampZ: 0,
    safeZ: 0,
    compatibleMachines: [],
    clampLayers: [
      {
        layerName: "CLAMP_DYN_0DEG",
        color: [254, 1, 200],
        description: "Dynamic 0 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_90DEG",
        color: [251, 251, 0],
        description: "Dynamic 90 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_180DEG",
        color: [0, 1, 251],
        description: "Dynamic 180 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_DYN_270DEG",
        color: [0, 251, 0],
        description: "Dynamic 270 degree jaw",
        isDynamic: true,
      },
      {
        layerName: "CLAMP_STATIC",
        color: [0, 220, 251],
        description: "Static chuck body",
        isDynamic: false,
      },
    ],
  },
];

// ============================================================================
// STOCK MATERIALS
// ============================================================================

/**
 * Standard stock material size from HyperMill Automation Center.
 * Extracted from doc/Stocklist.xlsx
 */
export interface HyperMillStockMaterial {
  /** Stock identifier (letter code for special sizes, null for standard) */
  id: string | null;
  /** X dimension in mm */
  x: number;
  /** Y dimension in mm */
  y: number;
  /** Z dimension in mm */
  z: number;
  /** Return index for automation scripts */
  returnIndex: number;
}

/**
 * Standard stock sizes from HyperMill Automation Center Stocklist.xlsx
 * Used for automatic stock selection based on part bounding box.
 */
export const HYPERMILL_STOCK_MATERIALS: HyperMillStockMaterial[] = [
  { id: null, x: 40, y: 55, z: 40, returnIndex: 1 },
  { id: null, x: 40, y: 70, z: 40, returnIndex: 2 },
  { id: null, x: 60, y: 70, z: 60, returnIndex: 3 },
  { id: null, x: 60, y: 90, z: 60, returnIndex: 4 },
  { id: null, x: 60, y: 115, z: 60, returnIndex: 5 },
  { id: null, x: 40, y: 115, z: 40, returnIndex: 6 },
  { id: null, x: 80, y: 65, z: 60, returnIndex: 7 },
  { id: null, x: 80, y: 85, z: 60, returnIndex: 8 },
  { id: null, x: 100, y: 85, z: 60, returnIndex: 9 },
  { id: "a", x: 80, y: 100, z: 60, returnIndex: 10 },
  { id: "b", x: 100, y: 115, z: 60, returnIndex: 11 },
  { id: "c", x: 100, y: 115, z: 40, returnIndex: 12 },
  { id: "d", x: 100, y: 80, z: 80, returnIndex: 13 },
  { id: null, x: 120, y: 120, z: 60, returnIndex: 14 },
  { id: null, x: 120, y: 120, z: 100, returnIndex: 15 },
  { id: null, x: 150, y: 150, z: 100, returnIndex: 16 },
  { id: null, x: 150, y: 150, z: 50, returnIndex: 17 },
  { id: null, x: 150, y: 200, z: 40, returnIndex: 18 },
  { id: null, x: 150, y: 200, z: 60, returnIndex: 19 },
  { id: null, x: 200, y: 150, z: 100, returnIndex: 20 },
  { id: null, x: 250, y: 200, z: 40, returnIndex: 21 },
  { id: null, x: 250, y: 200, z: 60, returnIndex: 22 },
  { id: null, x: 250, y: 200, z: 100, returnIndex: 23 },
  { id: null, x: 400, y: 150, z: 60, returnIndex: 24 },
  { id: null, x: 400, y: 150, z: 100, returnIndex: 25 },
  { id: null, x: 400, y: 150, z: 150, returnIndex: 26 },
  { id: null, x: 400, y: 200, z: 60, returnIndex: 27 },
  { id: null, x: 400, y: 200, z: 100, returnIndex: 28 },
  { id: null, x: 400, y: 500, z: 300, returnIndex: 29 },
  { id: null, x: 295, y: 140, z: 500, returnIndex: 30 },
];

// ============================================================================
// TOOL REPORT FIELDS
// ============================================================================

/**
 * Tool report field type for HyperMill Automation Center reports.
 */
export type HyperMillReportFieldType =
  | "text"
  | "number"
  | "dimension"
  | "time"
  | "path"
  | "image";

/**
 * Tool report field definition from HyperMill SYSTEM_PROCESS/Reports/ToolReports.
 */
export interface HyperMillToolReportField {
  /** Field name / property key */
  name: string;
  /** Display label for the field */
  label: string;
  /** Data type for formatting */
  type: HyperMillReportFieldType;
  /** Whether this field is required */
  required: boolean;
  /** Property path in HyperMill API (from ToolDbProperties.txt) */
  apiProperty?: string;
  /** Category grouping for report layout */
  category: string;
}

/**
 * Tool report field mappings for HyperMill Automation Center reports.
 * Extracted from SYSTEM_PROCESS/Reports/ToolReports/ templates.
 */
export const HYPERMILL_TOOL_REPORT_FIELDS: HyperMillToolReportField[] = [
  // Tool List Report (OM_REPORT_1_TOOL_LIST)
  {
    name: "toolName",
    label: "Tool Name",
    type: "text",
    required: true,
    apiProperty: "NCTool.Name",
    category: "Tool Identifier",
  },
  {
    name: "ncNumber",
    label: "NC Number",
    type: "number",
    required: true,
    apiProperty: "NCTool.NCNumber",
    category: "Tool Identifier",
  },
  {
    name: "toolReach",
    label: "Tool Reach",
    type: "dimension",
    required: false,
    apiProperty: "NCTool.UsableLength",
    category: "Tool Identifier",
  },
  {
    name: "toolLength",
    label: "Tool Length",
    type: "dimension",
    required: true,
    apiProperty: "Tool.Length",
    category: "Tool Identifier",
  },
  {
    name: "toolDiameter",
    label: "Tool Diameter",
    type: "dimension",
    required: true,
    apiProperty: "MillingTool.Diameter",
    category: "Tool Identifier",
  },
  {
    name: "cornerRadius",
    label: "Corner Radius",
    type: "dimension",
    required: false,
    apiProperty: "MillingTool.CornerRadius",
    category: "Tool Identifier",
  },
  {
    name: "holderName",
    label: "Holder Name",
    type: "text",
    required: false,
    apiProperty: "Holder.Name",
    category: "Holder Information",
  },
  {
    name: "holderLength",
    label: "Holder Length",
    type: "dimension",
    required: false,
    apiProperty: "Geometry.Height",
    category: "Holder Information",
  },

  // Extended Tool Report (OM_REPORT_2_TOOL)
  {
    name: "unit",
    label: "Unit",
    type: "text",
    required: true,
    apiProperty: "NCTool.MeasurementSystem",
    category: "Document",
  },
  {
    name: "mode",
    label: "Mode",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "cncControl",
    label: "CNC Control",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "programNumber",
    label: "Program Number",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "partName",
    label: "Part Name",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "toolAdapter",
    label: "Tool Adapter",
    type: "text",
    required: false,
    apiProperty: "NCTool.Adaptor",
    category: "Document",
  },
  {
    name: "partMaterial",
    label: "Part Material",
    type: "text",
    required: false,
    apiProperty: "CuttingProfile.Material",
    category: "Document",
  },
  {
    name: "origin",
    label: "Origin",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "notes",
    label: "Notes",
    type: "text",
    required: false,
    apiProperty: "NCTool.Comment",
    category: "Document",
  },
  {
    name: "createdDate",
    label: "Created",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "stockSize",
    label: "Stock Size",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "modelName",
    label: "Model Name",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "modelPath",
    label: "Model Path",
    type: "path",
    required: false,
    category: "Document",
  },
  {
    name: "partNote",
    label: "Part Note",
    type: "text",
    required: false,
    category: "Document",
  },
  {
    name: "xMin",
    label: "X Min",
    type: "dimension",
    required: false,
    category: "Bounding Box",
  },
  {
    name: "xMax",
    label: "X Max",
    type: "dimension",
    required: false,
    category: "Bounding Box",
  },
  {
    name: "yMin",
    label: "Y Min",
    type: "dimension",
    required: false,
    category: "Bounding Box",
  },
  {
    name: "yMax",
    label: "Y Max",
    type: "dimension",
    required: false,
    category: "Bounding Box",
  },
  {
    name: "zMin",
    label: "Z Min",
    type: "dimension",
    required: false,
    category: "Bounding Box",
  },
  {
    name: "zMax",
    label: "Z Max",
    type: "dimension",
    required: false,
    category: "Bounding Box",
  },
  {
    name: "totalTime",
    label: "Total Time",
    type: "time",
    required: false,
    category: "Document",
  },

  // Job Report (OM_REPORT_3_JOB)
  {
    name: "customer",
    label: "Customer",
    type: "text",
    required: false,
    category: "Setup",
  },
  {
    name: "joblistName",
    label: "Joblist Name",
    type: "text",
    required: false,
    category: "Setup",
  },
  {
    name: "machine",
    label: "Machine",
    type: "text",
    required: false,
    category: "Setup",
  },
  {
    name: "stockDimensionX",
    label: "Stock X",
    type: "dimension",
    required: false,
    category: "Setup",
  },
  {
    name: "stockDimensionY",
    label: "Stock Y",
    type: "dimension",
    required: false,
    category: "Setup",
  },
  {
    name: "stockDimensionZ",
    label: "Stock Z",
    type: "dimension",
    required: false,
    category: "Setup",
  },
  {
    name: "programmer",
    label: "Programmer",
    type: "text",
    required: false,
    category: "Setup",
  },
  {
    name: "date",
    label: "Date",
    type: "text",
    required: false,
    category: "Setup",
  },
  {
    name: "ncProgramPath",
    label: "NC Program Path",
    type: "path",
    required: false,
    category: "Paths",
  },
  {
    name: "compoundName",
    label: "Compound Name",
    type: "text",
    required: false,
    category: "Job",
  },
  {
    name: "jobComment",
    label: "Name (Comment)",
    type: "text",
    required: false,
    category: "Job",
  },
  {
    name: "tool",
    label: "Tool",
    type: "text",
    required: false,
    category: "Job",
  },
  {
    name: "length",
    label: "Length",
    type: "dimension",
    required: false,
    category: "Job",
  },
  {
    name: "holder",
    label: "Holder",
    type: "text",
    required: false,
    category: "Job",
  },
  {
    name: "extension",
    label: "Extension",
    type: "text",
    required: false,
    category: "Job",
  },
  {
    name: "machiningTime",
    label: "Machining Time",
    type: "time",
    required: false,
    category: "Job",
  },

  // Tool Database Properties (from ToolDbProperties.txt)
  {
    name: "cuttingEdges",
    label: "Cutting Edges",
    type: "number",
    required: false,
    apiProperty: "MillingTool.CuttingEdges",
    category: "Tool Geometry",
  },
  {
    name: "cuttingLength",
    label: "Cutting Length",
    type: "dimension",
    required: false,
    apiProperty: "MillingTool.CuttingLength",
    category: "Tool Geometry",
  },
  {
    name: "shaftDiameter",
    label: "Shaft Diameter",
    type: "dimension",
    required: false,
    apiProperty: "MillingTool.ShaftDiameter",
    category: "Tool Geometry",
  },
  {
    name: "tipAngle",
    label: "Tip Angle",
    type: "number",
    required: false,
    apiProperty: "MillingTool.TipAngle",
    category: "Tool Geometry",
  },
  {
    name: "tipLength",
    label: "Tip Length",
    type: "dimension",
    required: false,
    apiProperty: "MillingTool.TipLength",
    category: "Tool Geometry",
  },
  {
    name: "taperAngle",
    label: "Taper Angle",
    type: "number",
    required: false,
    apiProperty: "MillingTool.TaperAngle",
    category: "Tool Geometry",
  },
  {
    name: "pitch",
    label: "Pitch",
    type: "dimension",
    required: false,
    apiProperty: "MillingTool.Pitch",
    category: "Thread",
  },
  {
    name: "cuttingMaterial",
    label: "Cutting Material",
    type: "text",
    required: false,
    apiProperty: "Tool.CuttingMaterial",
    category: "Tool Properties",
  },
  {
    name: "spindleDirection",
    label: "Spindle Direction",
    type: "text",
    required: false,
    apiProperty: "Tool.SpindleDirection",
    category: "Tool Properties",
  },
  {
    name: "feedrate",
    label: "Feedrate",
    type: "number",
    required: false,
    apiProperty: "CuttingProfile.Feedrate",
    category: "Technology",
  },
  {
    name: "spindleSpeed",
    label: "Spindle Speed",
    type: "number",
    required: false,
    apiProperty: "CuttingProfile.SpindleSpeed",
    category: "Technology",
  },
  {
    name: "cuttingSpeed",
    label: "Cutting Speed",
    type: "number",
    required: false,
    apiProperty: "CuttingProfile.CuttingSpeed",
    category: "Technology",
  },
  {
    name: "coolants",
    label: "Coolants",
    type: "text",
    required: false,
    apiProperty: "CuttingProfile.Coolants",
    category: "Technology",
  },
];

// ============================================================================
// PROCESS TEMPLATES
// ============================================================================

/**
 * Process template action type for HyperMill Automation Center.
 */
export type HyperMillProcessActionType =
  | "COMPOUND" // Container for sub-functions
  | "SUB" // Sub-function/operation
  | "ASK" // User input prompt
  | "DEFINE_PARAMETER" // Variable definition
  | "SHOW_FILES" // File/folder browser
  | "SET_MACHINE" // Machine selection
  | "SET_MATERIAL" // Material selection
  | "SET_LAYER" // Layer visibility control
  | "CREATE_STOCK" // Stock body creation
  | "CREATE_MILLINGAREA" // Milling area creation
  | "CREATE_LINE" // Geometry creation
  | "LOAD_CLAMP" // Load fixture model
  | "LOAD_TEMPLATE_FILE" // Load template file
  | "INIT_CURRENT_JOBLIST" // Initialize current joblist
  | "SET_NCNAME_FIX" // Set NC filename
  | "ADJUST_NCS" // Coordinate system adjustment
  | "ADJUST_CLAMP" // Adjust clamp position
  | "WRITE_PROPERTY" // Property modification
  | "HCS_CONNECT" // HyperMill command connection
  | "HCS_LAUNCH_COMMAND" // Launch HyperMill command
  | "HCS_SAVE_VIEWPORT" // Save viewport state
  | "HCS_RESTORE_VIEWPORT" // Restore viewport state
  | "HCS_SET_ENTITIES_LAYER" // Set entities to layer
  | "HSC_SET_WORKPLANE" // Set workplane
  | "HSC_WORKPLANE_TO_WORLD" // Transform workplane to world
  | "GET_NCS_FROM_STL" // Get NCS from STL geometry
  | "READ_EXCEL" // Read Excel data
  | "GENERATE_EXCEL_REPORT" // Generate Excel report
  | "CALL" // Call another sub-function
  | "SAVE_MODEL" // Save model output
  | "DELETE_LAYER" // Delete layer
  | "CREATE_FOLDER" // Create folder
  | "READ_NCS" // Read coordinate system
  | "RESET_COLOR" // Reset face colors
  | "SET_INTERACTIVE_FACE_COLOR"; // Interactive color selection

/**
 * Process template parameter definition.
 */
export interface HyperMillProcessParameter {
  /** Parameter name (starts with $ for variables, # for system values) */
  name: string;
  /** Display label */
  label: string;
  /** Default value */
  defaultValue: string;
  /** Input type */
  inputType:
    | "text"
    | "number"
    | "combo"
    | "checkbox"
    | "button"
    | "color"
    | "layer"
    | "folder"
    | "file";
  /** Combo box options (if inputType is "combo") */
  options?: string[];
  /** Whether the parameter is required */
  required: boolean;
  /** Icon identifier */
  icon?: string;
}

/**
 * Process template from HyperMill Automation Center OMPROCESS directory.
 */
export interface HyperMillProcessTemplate {
  /** Template name */
  name: string;
  /** Template ID */
  id: string;
  /** Description of the template */
  description: string;
  /** Template category */
  category:
    | "startup"
    | "setup"
    | "stock"
    | "fixture"
    | "machining"
    | "report"
    | "utility";
  /** Source file path (relative to OMPROCESS) */
  sourceFile: string;
  /** Actions defined in this template */
  actions: HyperMillProcessActionType[];
  /** Parameters for this template */
  parameters: HyperMillProcessParameter[];
  /** Whether auto-run is allowed */
  allowAutoRun: boolean;
  /** Customer scope flag */
  customerScope: boolean;
}

/**
 * Process templates from HyperMill Automation Center.
 * Extracted from Wizards/AutomationCenter/OMPROCESS/ directory.
 */
export const HYPERMILL_PROCESS_TEMPLATES: HyperMillProcessTemplate[] = [
  // OM Startup Templates
  {
    name: "Start",
    id: "iST_Start_FUNC",
    description: "Initialize joblist, milling area, machine, and material",
    category: "startup",
    sourceFile: "OMSample/includeOM Startup.xml",
    actions: [
      "SUB",
      "ASK",
      "LOAD_TEMPLATE_FILE",
      "INIT_CURRENT_JOBLIST",
      "WRITE_PROPERTY",
      "SET_LAYER",
      "CREATE_MILLINGAREA",
      "SHOW_FILES",
      "SET_MACHINE",
      "SET_MATERIAL",
      "SET_NCNAME_FIX",
      "READ_NCS",
    ],
    parameters: [
      {
        name: "$JLNAME",
        label: "Joblist Name",
        defaultValue: "",
        inputType: "text",
        required: false,
        icon: "JOBLISTE",
      },
      {
        name: "$MANAME_ST",
        label: "Name of Milling Area",
        defaultValue: "",
        inputType: "text",
        required: false,
        icon: "MILLING_AREA",
      },
      {
        name: "SELECT_MACHINE",
        label: "Machine",
        defaultValue: "",
        inputType: "file",
        required: true,
      },
      {
        name: "SELECT_MATERIAL",
        label: "Material",
        defaultValue: "",
        inputType: "file",
        required: true,
      },
      {
        name: "$NCFILE_NAME",
        label: "Name of NC File",
        defaultValue: "",
        inputType: "text",
        required: false,
      },
      {
        name: "$COMPENSATED_CENTERPATH",
        label: "Compensated Centerpath",
        defaultValue: "0",
        inputType: "combo",
        options: ["0", "1"],
        required: false,
      },
      {
        name: "$MULTIPLE_ORIGINS",
        label: "Multiple Origins",
        defaultValue: "0",
        inputType: "combo",
        options: ["0", "1"],
        required: false,
      },
    ],
    allowAutoRun: true,
    customerScope: true,
  },
  {
    name: "NCS Best Fit",
    id: "iST_NCS_best fit",
    description:
      "Automatically position NCS based on STL geometry with optional fine adjustment",
    category: "setup",
    sourceFile: "OMSample/includeOM Startup.xml",
    actions: [
      "SUB",
      "ASK",
      "SHOW_FILES",
      "DEFINE_PARAMETER",
      "HCS_SAVE_VIEWPORT",
      "HCS_LAUNCH_COMMAND",
      "GET_NCS_FROM_STL",
      "HCS_RESTORE_VIEWPORT",
      "READ_NCS",
      "ADJUST_NCS",
      "HSC_SET_WORKPLANE",
    ],
    parameters: [
      {
        name: "$NCSBESTFIT_FINEADJUST",
        label: "Fine Adjust to Planes",
        defaultValue: "YES",
        inputType: "combo",
        options: ["YES", "NO"],
        required: false,
        icon: "FILTER",
      },
      {
        name: "$ORIGCOLOR_NCSBESTFIT",
        label: "Fine Adjust Color (RGB)",
        defaultValue: "",
        inputType: "color",
        required: false,
        icon: "COLOR_IN",
      },
      {
        name: "$ORIGLAYER_NCSBESTFIT",
        label: "Layer",
        defaultValue: "",
        inputType: "layer",
        required: false,
        icon: "LAYER_IN",
      },
    ],
    allowAutoRun: true,
    customerScope: true,
  },
  {
    name: "Box Offset Stock",
    id: "iS_STOF",
    description:
      "Create stock body with configurable offsets from model bounding box",
    category: "stock",
    sourceFile: "OMSample/includeOM Startup.xml",
    actions: [
      "SUB",
      "ASK",
      "READ_NCS",
      "CREATE_STOCK",
      "DEFINE_PARAMETER",
      "DELETE_LAYER",
      "CREATE_LINE",
    ],
    parameters: [
      {
        name: "$STOCK_NAME",
        label: "Stock Name",
        defaultValue: "Start",
        inputType: "text",
        required: true,
        icon: "STOCK",
      },
      {
        name: "$STOCKOFFSET_ALL",
        label: "Stock Offset (Side)",
        defaultValue: "0",
        inputType: "number",
        required: true,
        icon: "DIM",
      },
      {
        name: "$STOCKOFFSET_Z",
        label: "Stock Offset (Plus Z)",
        defaultValue: "0",
        inputType: "number",
        required: true,
        icon: "DIM",
      },
      {
        name: "$STOCKOFFSET_MZ",
        label: "Stock Offset (Minus Z)",
        defaultValue: "0",
        inputType: "number",
        required: true,
        icon: "DIM",
      },
      {
        name: "$STOCK_BBOX_LAYER",
        label: "Bounding Box Layer",
        defaultValue: "StockContour",
        inputType: "text",
        required: true,
        icon: "DIM",
      },
      {
        name: "$STOCK_FMILL_LAYER",
        label: "Face Milling Contour Layer",
        defaultValue: "FaceMilling",
        inputType: "text",
        required: true,
        icon: "DIM",
      },
      {
        name: "$RT_TOL",
        label: "Tolerance",
        defaultValue: "0.5",
        inputType: "number",
        required: true,
        icon: "DIM",
      },
    ],
    allowAutoRun: false,
    customerScope: true,
  },
  {
    name: "Find Best Fixture (from Excel)",
    id: "iST_RTL_BEST_FIXTURE_EXCEL",
    description:
      "Automatically select best fixture based on workpiece dimensions using Excel mapping",
    category: "fixture",
    sourceFile: "OMSample/includeOM Startup.xml",
    actions: ["SUB", "ASK", "READ_EXCEL", "LOAD_CLAMP", "ADJUST_CLAMP"],
    parameters: [
      {
        name: "$SCRIPT_VALUE_FOLDER",
        label: "Folder",
        defaultValue:
          "C:\\Users\\Public\\Documents\\OPEN MIND\\USERS\\API\\ProgrammingWizard\\CLAMPS\\OPEN MIND",
        inputType: "folder",
        required: true,
        icon: "FOLDER",
      },
      {
        name: "$EXCEL_FILE",
        label: "Excel File",
        defaultValue: "fixtureMapping.xlsx",
        inputType: "file",
        required: true,
        icon: "FILE",
      },
      {
        name: "$FIELD_NAME_VALUE",
        label: "Cell Name Value Start",
        defaultValue: "A2",
        inputType: "text",
        required: true,
      },
      {
        name: "$X_CLAMP_VALUE",
        label: "X Clamp Value",
        defaultValue: "§STOCK_DIMENSION_X#",
        inputType: "text",
        required: true,
      },
      {
        name: "$Y_CLAMP_VALUE",
        label: "Y Clamp Value",
        defaultValue: "§STOCK_DIMENSION_Y#",
        inputType: "text",
        required: true,
      },
    ],
    allowAutoRun: false,
    customerScope: true,
  },

  // Clamp Setup Templates
  {
    name: "Vice Clamp Setup",
    id: "iVCS_VICE_CLAMP_SETUP",
    description: "Setup wizard for vice-type clamps with Y+/Y- dynamic jaws",
    category: "fixture",
    sourceFile: "OMSetupClamp/includeOMViceClampSetup.xml",
    actions: [
      "COMPOUND",
      "SUB",
      "ASK",
      "HCS_CONNECT",
      "SET_INTERACTIVE_FACE_COLOR",
      "HCS_SET_ENTITIES_LAYER",
      "RESET_COLOR",
      "HSC_WORKPLANE_TO_WORLD",
      "SAVE_MODEL",
      "CREATE_FOLDER",
    ],
    parameters: [
      {
        name: "$CLAMP_SETUP__SETRGB_ORIGCOLOR1",
        label: "Color (RGB) Y+",
        defaultValue: "254;1;200",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$CLAMP_SETUP__SETRGB_ORIGCOLOR2",
        label: "Color (RGB) Y-",
        defaultValue: "251;251;0",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$CLAMP_SETUP__SETRGB_ORIGCOLOR3",
        label: "Color (RGB) Static",
        defaultValue: "0;220;251",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$CLAMP_SETUP__NEW_CLAMP_NAME",
        label: "New Clamp Name",
        defaultValue: "New Clamp",
        inputType: "text",
        required: true,
      },
    ],
    allowAutoRun: false,
    customerScope: true,
  },
  {
    name: "3 Jaw Chuck Clamp Setup",
    id: "i3JC_3JAW_CHUCK_SETUP",
    description:
      "Setup wizard for 3-jaw chuck with 0/120/240 degree dynamic jaws",
    category: "fixture",
    sourceFile: "OMSetupClamp/includeOM3JawClampSetup.xml",
    actions: [
      "COMPOUND",
      "SUB",
      "ASK",
      "HCS_CONNECT",
      "SET_INTERACTIVE_FACE_COLOR",
      "HCS_SET_ENTITIES_LAYER",
      "RESET_COLOR",
      "HSC_WORKPLANE_TO_WORLD",
      "SAVE_MODEL",
      "CREATE_FOLDER",
    ],
    parameters: [
      {
        name: "$3JCHUCK_SETUP_SETRGB_ORIGCOLOR1",
        label: "Color (RGB) 0 Deg",
        defaultValue: "254;1;200",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$3JCHUCK_SETUP_SETRGB_ORIGCOLOR2",
        label: "Color (RGB) 120 Deg",
        defaultValue: "251;251;0",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$3JCHUCK_SETUP_SETRGB_ORIGCOLOR3",
        label: "Color (RGB) 240 Deg",
        defaultValue: "0;1;251",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$3JCHUCK_SETUP_SETRGB_ORIGCOLOR_STATIC",
        label: "Color (RGB) Static",
        defaultValue: "0;220;251",
        inputType: "color",
        required: true,
        icon: "COLOR_OUT",
      },
      {
        name: "$3JCHUCK_SETUP_NEW_CLAMP_NAME",
        label: "New Clamp Name",
        defaultValue: "New Clamp",
        inputType: "text",
        required: true,
      },
    ],
    allowAutoRun: false,
    customerScope: true,
  },

  // Report Templates
  {
    name: "Tool List Report",
    id: "OM_REPORT_1_TOOL_LIST",
    description: "Simple tool list report with basic tool and holder info",
    category: "report",
    sourceFile: "OMReports/toolReports/ToolReport_OM_REPORT_1_TOOL_LIST.xlsx",
    actions: ["GENERATE_EXCEL_REPORT"],
    parameters: [],
    allowAutoRun: true,
    customerScope: true,
  },
  {
    name: "Detailed Tool Report",
    id: "OM_REPORT_2_TOOL",
    description:
      "Comprehensive tool report with document info, bounding box, and machining times",
    category: "report",
    sourceFile: "OMReports/toolReports/ToolReport_OM_REPORT_2_TOOL.xlsx",
    actions: ["GENERATE_EXCEL_REPORT"],
    parameters: [],
    allowAutoRun: true,
    customerScope: true,
  },
  {
    name: "Job Report",
    id: "OM_REPORT_3_JOB",
    description:
      "Per-job report with setup info, tool assignments, and machining times",
    category: "report",
    sourceFile: "OMReports/toolReports/ToolReport_OM_REPORT_3_JOB.xlsx",
    actions: ["GENERATE_EXCEL_REPORT"],
    parameters: [],
    allowAutoRun: true,
    customerScope: true,
  },
  {
    name: "Compound Job Report",
    id: "OM_REPORT_4_COMPOUND_JOB",
    description: "Report for compound jobs with hierarchical operation listing",
    category: "report",
    sourceFile:
      "OMReports/toolReports/ToolReport_OM_REPORT_4_COMPOUND_JOB.xlsx",
    actions: ["GENERATE_EXCEL_REPORT"],
    parameters: [],
    allowAutoRun: true,
    customerScope: true,
  },
];

// ============================================================================
// COLOR MACHINING DEFINITIONS
// ============================================================================

/**
 * Color-based machining definition for HyperMill feature recognition.
 * Extracted from OM-COLORTABLE.xml
 */
export interface HyperMillColorMachiningDefinition {
  /** RGB color values (0-255) */
  color: [number, number, number];
  /** Thread designation (e.g., "M", "Mx", "G") */
  threadDesignation: string;
  /** ISO fit designation (e.g., "H7", "H8", "H11") */
  fitDesignation: string;
  /** Use thread nominal diameter flag */
  useThreadNominalDiameter: boolean;
  /** Feature name */
  name: string;
  /** Comment/description */
  comment: string;
  /** Feature class identifier */
  featureClass: string;
  /** Is pocket bottom flag */
  isPocketBottom: boolean;
  /** Is pocket wall flag */
  isPocketWall: boolean;
  /** Has tolerance flag */
  hasTolerance: boolean;
  /** Lower tolerance (mm) */
  toleranceLower: number;
  /** Upper tolerance (mm) */
  toleranceUpper: number;
}

/**
 * Color-based machining definitions from HyperMill OM-COLORTABLE.xml.
 * Used for automatic feature recognition based on face colors.
 */
export const HYPERMILL_COLOR_MACHINING_DEFINITIONS: HyperMillColorMachiningDefinition[] =
  [
    // Thread definitions
    {
      color: [255, 255, 0],
      threadDesignation: "M",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "REGELGEWINDE",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [255, 175, 0],
      threadDesignation: "Mx",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "FEINGEWINDE",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [255, 95, 0],
      threadDesignation: "G",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "ZOLL GEWINDE",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },

    // ISO fit definitions
    {
      color: [95, 95, 175],
      threadDesignation: "",
      fitDesignation: "H11",
      useThreadNominalDiameter: false,
      name: "",
      comment: "Dxx H11",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [95, 0, 95],
      threadDesignation: "",
      fitDesignation: "H8",
      useThreadNominalDiameter: false,
      name: "",
      comment: "Dxx H8",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [0, 0, 255],
      threadDesignation: "",
      fitDesignation: "H7",
      useThreadNominalDiameter: false,
      name: "",
      comment: "Dxx H7",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [0, 0, 95],
      threadDesignation: "",
      fitDesignation: "H6",
      useThreadNominalDiameter: false,
      name: "",
      comment: "Dxx H6",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [255, 0, 255],
      threadDesignation: "",
      fitDesignation: "G7",
      useThreadNominalDiameter: false,
      name: "",
      comment: "Dxx G7",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },

    // Tolerance-based surface definitions
    {
      color: [175, 255, 175],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "KONTURFLAECHE BODEN",
      featureClass: "KONTUR",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: true,
      toleranceLower: -0.05,
      toleranceUpper: 0.05,
    },
    {
      color: [175, 255, 175],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "KONTURFLAECHE WAND",
      featureClass: "KONTUR",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: true,
      toleranceLower: -0.05,
      toleranceUpper: 0.05,
    },
    {
      color: [255, 175, 175],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "SCHLICHTFLAECHE BODEN",
      featureClass: "SCHLICHTEN",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: true,
      toleranceLower: -0.02,
      toleranceUpper: 0.02,
    },
    {
      color: [255, 175, 175],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "SCHLICHTFLAECHE WAND",
      featureClass: "SCHLICHTEN",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: true,
      toleranceLower: -0.02,
      toleranceUpper: 0.02,
    },
    {
      color: [95, 0, 0],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "SCHRUPPFLAECHE BODEN",
      featureClass: "SCHRUPPEN",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: true,
      toleranceLower: -0.2,
      toleranceUpper: 0.2,
    },
    {
      color: [95, 0, 0],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "SCHRUPPFLAECHE WAND",
      featureClass: "SCHRUPPEN",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: true,
      toleranceLower: -0.2,
      toleranceUpper: 0.2,
    },

    // Pocket definitions by fit
    {
      color: [0, 0, 95],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H6 TASCHENBODEN",
      featureClass: "H6 TASCHE",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [0, 0, 95],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H6 TASCHENWAND",
      featureClass: "H6 TASCHE",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [0, 0, 255],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H7 TASCHENBODEN",
      featureClass: "H7 TASCHE",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [0, 0, 255],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H7 TASCHENWAND",
      featureClass: "H7 TASCHE",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [95, 0, 95],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H8 TASCHENBODEN",
      featureClass: "H8 TASCHE",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [95, 0, 95],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H8 TASCHENWAND",
      featureClass: "H8 TASCHE",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [95, 95, 175],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H11 TASCHENBODEN",
      featureClass: "H11 TASCHE",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
    {
      color: [95, 95, 175],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "",
      comment: "H11 TASCHENWAND",
      featureClass: "H11 TASCHE",
      isPocketBottom: false,
      isPocketWall: true,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },

    // Special definitions
    {
      color: [0, 85, 0],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "FREILEGUNG TASCHENWAND",
      comment: "",
      featureClass: "",
      isPocketBottom: true,
      isPocketWall: false,
      hasTolerance: true,
      toleranceLower: -0.3,
      toleranceUpper: -0.1,
    },
    {
      color: [255, 255, 255],
      threadDesignation: "",
      fitDesignation: "",
      useThreadNominalDiameter: false,
      name: "ZSB",
      comment: "ZSB BOHRUNG",
      featureClass: "",
      isPocketBottom: false,
      isPocketWall: false,
      hasTolerance: false,
      toleranceLower: 0,
      toleranceUpper: 0,
    },
  ];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find the best fixture for a given workpiece size.
 * @param workpieceX - Workpiece X dimension (mm)
 * @param workpieceY - Workpiece Y dimension (mm)
 * @param workpieceZ - Workpiece Z height (mm)
 * @param machine - Optional machine model filter
 * @returns Best matching fixture configuration or null
 */
export function findBestFixture(
  workpieceX: number,
  workpieceY: number,
  workpieceZ: number,
  machine?: string
): HyperMillFixtureConfiguration | null {
  const candidates = HYPERMILL_FIXTURE_MAPPINGS.filter((fixture) => {
    const xFits =
      workpieceX >= fixture.minX && workpieceX <= fixture.xDimension;
    const yFits = workpieceY >= fixture.minY && workpieceY <= fixture.maxY;
    const zFits = workpieceZ >= fixture.minZ;
    const machineMatches =
      !machine ||
      fixture.compatibleMachines.length === 0 ||
      fixture.compatibleMachines.includes(machine);

    return xFits && yFits && zFits && machineMatches;
  });

  if (candidates.length === 0) return null;

  // Return the fixture with the smallest clamping range that still fits
  return candidates.sort((a, b) => {
    const aRange = (a.maxY - a.minY) * a.xDimension;
    const bRange = (b.maxY - b.minY) * b.xDimension;
    return aRange - bRange;
  })[0];
}

/**
 * Find the best stock size for a given part bounding box.
 * @param partX - Part X dimension (mm)
 * @param partY - Part Y dimension (mm)
 * @param partZ - Part Z dimension (mm)
 * @param margin - Additional margin around part (mm, default 5)
 * @returns Best matching stock material or null
 */
export function findBestStock(
  partX: number,
  partY: number,
  partZ: number,
  margin: number = 5
): HyperMillStockMaterial | null {
  const candidates = HYPERMILL_STOCK_MATERIALS.filter((stock) => {
    return (
      stock.x >= partX + margin &&
      stock.y >= partY + margin &&
      stock.z >= partZ + margin
    );
  });

  if (candidates.length === 0) return null;

  // Return the smallest stock that still fits (minimize waste)
  return candidates.sort((a, b) => {
    const aVolume = a.x * a.y * a.z;
    const bVolume = b.x * b.y * b.z;
    return aVolume - bVolume;
  })[0];
}

/**
 * Get machining definition from face color.
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param tolerance - Color matching tolerance (default 5)
 * @returns Matching color machining definition or null
 */
export function getMachiningDefinitionFromColor(
  r: number,
  g: number,
  b: number,
  tolerance: number = 5
): HyperMillColorMachiningDefinition | null {
  return (
    HYPERMILL_COLOR_MACHINING_DEFINITIONS.find((def) => {
      return (
        Math.abs(def.color[0] - r) <= tolerance &&
        Math.abs(def.color[1] - g) <= tolerance &&
        Math.abs(def.color[2] - b) <= tolerance
      );
    }) || null
  );
}
