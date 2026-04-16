/**
 * PPG Test Generator — PPG Test Infrastructure (Part A3)
 *
 * Auto-generates parameterized test matrices via describe.each/it.each.
 * One template generates N controller variants automatically.
 *
 * Usage:
 *   generateControllerOpMatrix(CONTROLLERS, ['face_mill', 'drill'], async (ctrl, op) => {
 *     const result = await pipeline.process(fixture, ctrl, op);
 *     assertNoNaN(result.blocks);
 *   });
 */

import type { ControllerDef, OperationType } from "./ppg-fixture-schema.js";

// ============================================================================
// CONTROLLER DEFINITIONS
// ============================================================================

export const CONTROLLERS: ControllerDef[] = [
  {
    id: "haas_ngc", name: "Haas NGC", base_family: "fanuc",
    safe_start: "G90 G21 G17 G40 G80 G49",
    program_start: ["%", "O00001"], program_end: ["M30", "%"],
    tool_change: "T{t} M06\nG43 H{h}",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "fanuc_31i", name: "Fanuc 31i-B5", base_family: "fanuc",
    safe_start: "G90 G21 G17 G40 G80 G49",
    program_start: ["%", "O0001"], program_end: ["M30", "%"],
    tool_change: "G91 G28 Z0\nT{t} M06\nG90",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "fanuc_0i", name: "Fanuc 0i-TF", base_family: "fanuc",
    safe_start: "G90 G21 G17 G40 G80 G49",
    program_start: ["%", "O0001"], program_end: ["M30", "%"],
    tool_change: "G91 G28 Z0\nT{t} M06\nG90",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "siemens_840d", name: "Siemens 840D sl", base_family: "siemens",
    safe_start: "G90 G71 G17 G40 G80 G49",
    program_start: ["%_N_PRISM_MPF", ";PRISM generated"], program_end: ["M30"],
    tool_change: "T{t}\nM06",
    comment_open: ";", comment_close: "",
    canned_cycles: { drill: "CYCLE81", peck_drill: "CYCLE83", tap: "CYCLE84", bore: "CYCLE85", cancel: "MCALL" },
  },
  {
    id: "heidenhain_tnc", name: "Heidenhain TNC640", base_family: "heidenhain",
    safe_start: "BEGIN PGM PRISM MM",
    program_start: ["BEGIN PGM PRISM MM"], program_end: ["END PGM PRISM MM"],
    tool_change: "TOOL CALL {t} Z S{s}",
    comment_open: ";", comment_close: "",
    canned_cycles: { drill: "CYCL DEF 200", peck_drill: "CYCL DEF 205", tap: "CYCL DEF 206", bore: "CYCL DEF 202", cancel: "CYCL DEF" },
  },
  {
    id: "mazak_smooth", name: "Mazak SmoothAi", base_family: "mazak",
    safe_start: "G90 G21 G17 G40 G80",
    program_start: ["%", "O0001"], program_end: ["M30", "%"],
    tool_change: "T{t} M06\nG43 H{h}",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "okuma_osp", name: "Okuma OSP-P300", base_family: "okuma",
    safe_start: "G90 G21 G17 G40 G80",
    program_start: ["O0001"], program_end: ["M30", "%"],
    tool_change: "T{t}\nM06\nG43 H{h}",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "hurco_max5", name: "Hurco WinMax", base_family: "fanuc",
    safe_start: "G90 G21 G17 G40 G80 G49",
    program_start: ["%", "O0001"], program_end: ["M30", "%"],
    tool_change: "T{t} M06\nG43 H{h}",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "dmg_celos_siemens", name: "DMG MORI CELOS (Siemens)", base_family: "siemens",
    safe_start: "G90 G71 G17 G40 G80 G49",
    program_start: ["%_N_PRISM_MPF"], program_end: ["M30"],
    tool_change: "T{t}\nM06",
    comment_open: ";", comment_close: "",
    canned_cycles: { drill: "CYCLE81", peck_drill: "CYCLE83", tap: "CYCLE84", bore: "CYCLE85", cancel: "MCALL" },
  },
  {
    id: "dmg_celos_fanuc", name: "DMG MORI CELOS (Fanuc)", base_family: "fanuc",
    safe_start: "G90 G21 G17 G40 G80 G49",
    program_start: ["%", "O0001"], program_end: ["M30", "%"],
    tool_change: "G91 G28 Z0\nT{t} M06\nG90",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
  {
    id: "brother_speedio", name: "Brother Speedio", base_family: "fanuc",
    safe_start: "G90 G21 G17 G40 G80 G49",
    program_start: ["%", "O0001"], program_end: ["M30", "%"],
    tool_change: "T{t} M06\nG43 H{h}",
    comment_open: "(", comment_close: ")",
    canned_cycles: { drill: "G81", peck_drill: "G83", tap: "G84", bore: "G85", cancel: "G80" },
  },
];

// ============================================================================
// OPERATION DEFINITIONS
// ============================================================================

export const MILLING_OPERATIONS: OperationType[] = [
  "face_mill", "pocket_2d", "contour_2d", "adaptive_2d", "slot",
  "chamfer", "engrave",
  "3d_parallel", "3d_scallop", "3d_pencil", "3d_steep_shallow", "swarf",
];

export const HOLEMAKING_OPERATIONS: OperationType[] = [
  "drill", "peck_drill", "chip_break", "tap_rigid", "bore", "ream",
];

export const THREAD_OPERATIONS: OperationType[] = ["thread_mill"];

export const MULTIAXIS_OPERATIONS: OperationType[] = [
  "4th_axis_index", "3plus2_positional", "5axis_simultaneous",
];

export const TURNING_OPERATIONS: OperationType[] = [
  "css_turning", "rough_turning_g71", "finish_turning_g70",
  "threading_g76", "grooving", "parting",
];

export const ALL_OPERATIONS: OperationType[] = [
  ...MILLING_OPERATIONS,
  ...HOLEMAKING_OPERATIONS,
  ...THREAD_OPERATIONS,
  ...MULTIAXIS_OPERATIONS,
  ...TURNING_OPERATIONS,
];

// ============================================================================
// MATRIX GENERATORS
// ============================================================================

export interface MatrixCell {
  controller: ControllerDef;
  operation: OperationType;
}

/**
 * Generate controller × operation test matrix.
 * Returns flat array of {controller, operation} pairs for use with it.each().
 */
export function generateControllerOpMatrix(
  controllers: ControllerDef[] = CONTROLLERS,
  operations: OperationType[] = ALL_OPERATIONS,
): MatrixCell[] {
  const matrix: MatrixCell[] = [];
  for (const controller of controllers) {
    for (const operation of operations) {
      // Skip turning operations for milling-only controllers
      if (TURNING_OPERATIONS.includes(operation) && controller.base_family !== "fanuc" && controller.base_family !== "mazak" && controller.base_family !== "okuma") {
        continue;
      }
      matrix.push({ controller, operation });
    }
  }
  return matrix;
}

/**
 * Generate matrix for a single controller across all operations.
 * Useful for per-controller test files: ppg-matrix-haas.test.ts
 */
export function generateSingleControllerMatrix(
  controllerId: string,
  operations: OperationType[] = ALL_OPERATIONS,
): MatrixCell[] {
  const controller = CONTROLLERS.find(c => c.id === controllerId);
  if (!controller) throw new Error(`Unknown controller: ${controllerId}`);
  return operations.map(operation => ({ controller, operation }));
}

/**
 * Generate feed format test cases for a controller.
 * Returns array of {label, input, expected_pattern, unit} tuples.
 */
export interface FeedFormatCase {
  label: string;
  feed_type: "milling_ipm" | "milling_mmpm" | "tapping_inch" | "tapping_metric" | "sub_1_ipm" | "rapid" | "inverse_time" | "feed_per_rev";
  input_value: number;
  expected_pattern: RegExp;
  unit: "inch" | "mm";
}

export function generateFeedFormatCases(): FeedFormatCase[] {
  return [
    { label: "Milling IPM", feed_type: "milling_ipm", input_value: 80, expected_pattern: /F80(?!\.)/, unit: "inch" },
    { label: "Milling mm/min", feed_type: "milling_mmpm", input_value: 2032, expected_pattern: /F2032(?!\.)/, unit: "mm" },
    { label: "Tap 1/4-20 inch", feed_type: "tapping_inch", input_value: 0.05, expected_pattern: /F0\.0500/, unit: "inch" },
    { label: "Tap 3/8-16 inch", feed_type: "tapping_inch", input_value: 0.0625, expected_pattern: /F0\.0625/, unit: "inch" },
    { label: "Tap 7/16-20 inch", feed_type: "tapping_inch", input_value: 0.05, expected_pattern: /F0\.0500/, unit: "inch" },
    { label: "Tap M6x1.0 metric", feed_type: "tapping_metric", input_value: 1.0, expected_pattern: /F1\.000/, unit: "mm" },
    { label: "Tap M8x1.25 metric", feed_type: "tapping_metric", input_value: 1.25, expected_pattern: /F1\.250/, unit: "mm" },
    { label: "Tap M10x1.5 metric", feed_type: "tapping_metric", input_value: 1.5, expected_pattern: /F1\.500/, unit: "mm" },
  ];
}

/**
 * Generate structural block test cases for a set of controllers.
 * Each case: {controller, block_type, expected_pattern}.
 */
export interface StructuralBlockCase {
  controller: ControllerDef;
  block_type: "safe_start" | "tool_change" | "program_end";
  expected_content: string;
}

export function generateStructuralBlockCases(
  controllers: ControllerDef[] = CONTROLLERS,
): StructuralBlockCase[] {
  const cases: StructuralBlockCase[] = [];
  for (const ctrl of controllers) {
    cases.push({ controller: ctrl, block_type: "safe_start", expected_content: ctrl.safe_start });
    cases.push({ controller: ctrl, block_type: "tool_change", expected_content: ctrl.tool_change });
    cases.push({ controller: ctrl, block_type: "program_end", expected_content: ctrl.program_end.join("\n") });
  }
  return cases;
}
