/**
 * HyperMillCycleDefaultsEngine — Default machining parameters for all hyperMILL cycles
 *
 * Source: hyperMILL v31/v33 Metric.cfg files (138 configurations)
 * Each cycle type has factory-default values and formula expressions.
 *
 * Formula variables:
 *   T:Dia     — tool diameter (mm)
 *   T:Rad     — tool radius (mm)
 *   T:CornerRad — tool corner radius (mm)
 *   mtol      — machining tolerance (mm, from job settings)
 *   J:MTol    — job machining tolerance
 *   J:F       — job feed rate
 *
 * Formula syntax: "T:Dia*0.35", "mtol*0.7", "T:Rad*0.25", "0.1*mtol"
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type CycleCategory =
  | "2d_milling"
  | "3d_milling"
  | "5axis"
  | "drilling"
  | "turning"
  | "millturn_grooving"
  | "impeller_blade"
  | "probing"
  | "edm"
  | "electrode"
  | "feature"
  | "setup";

export interface CycleParam {
  key: string;
  value: number | string;           // numeric default or formula string
  isFormula: boolean;                // true if value contains T:, mtol, J: etc.
  comment?: string;
}

export interface CycleDefaults {
  code: string;                      // cfg file code, e.g. "hmSlf3"
  displayName: string;               // human-readable, e.g. "3D Z-Level Finishing"
  category: CycleCategory;
  toolType: number;                  // FRTYP value (1=endmill, 3=ballnose, 12=impeller, 101=turning, etc.)
  params: Record<string, CycleParam>;
  /** Common params extracted for quick access */
  machining: {
    clearancePlane?: number | string;
    safeDist?: number | string;
    stepdown?: number | string;
    stepover?: number | string;
    allowance?: number | string;
    tolerance?: number | string;
    precision?: number | string;
  };
  collision: {
    holderClearance?: number | string;
    shankClearance?: number | string;
    extensionClearance?: number | string;
    headClearance?: number | string;
  };
  macros: {
    approachLength?: number | string;
    retractLength?: number | string;
    approachClearSide?: number | string;
    retractClearSide?: number | string;
    approachClearAxial?: number | string;
    retractClearAxial?: number | string;
  };
}

// ── Cycle Data (from Metric.cfg files) ───────────────────────────────────────

const CYCLE_DEFAULTS: CycleDefaults[] = [
  // ─── 2D Milling ──────────────────────────────────────────────────────
  {
    code: "hmCrt", displayName: "2D Contour Roughing", category: "2d_milling", toolType: 103,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FVORSCHUB: 0.1, TFEEDRATE: 0.1,
      CNTRES: "mtol", INFEED_LENGTH: 1, ALLOWANCE: 0, CLEARANCE_DISTANCE: 2,
      RETRACT_HEIGHT_IN: 10, RETRACT_HEIGHT_OUT: 100, SICHEBENE: 5,
      RADIAL_MAX_DEPTH: 1000, RAMP_ANGLE: 10, SIDE_OFFSET: 0.5, OVERLAP: 0.1,
      MACRO_CLEARANCE: 0.05, START_FACTOR: 0.5, CHAMFER_LENGTH: 0.5, ROUNDING_RADIUS: 0.5,
    }),
    machining: { clearancePlane: 5, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmCft", displayName: "2D Contour Finishing (Turning)", category: "turning", toolType: 101,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", INFEED_LENGTH: 1, ADD_STEP: 0.25, ADD_STEP_MIN: 0.5, ADD_STEP_MAX: 5,
      CRAMP_STEP: 0.5, ALLOWANCE: 0, RADIAL_ALLOWANCE: 0, AXIAL_ALLOWANCE: 0,
      CLEARANCE_DISTANCE: 5, RETRACT_HEIGHT_IN: 10, RETRACT_HEIGHT_OUT: 100,
      SICHEBENE: 15, RETRACT_PLAN: 20, CHAMFER_LENGTH: 0.5, ROUNDING_RADIUS: 0.5,
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmPcirc", displayName: "2D Pocket Circular", category: "2d_milling", toolType: 1,
    params: parseParams({
      SICHEBENE: 100, CLEARANCE_AXIAL: 5, CLEARANCE_SIDE: 5,
      AUFMASS: 0, AUFMASS_HORI: 0, VERTZUSTEL: 0.5,
    }),
    machining: { clearancePlane: 100, stepdown: 0.5, allowance: 0 },
    collision: {},
    macros: {},
  },

  // ─── 3D Milling ──────────────────────────────────────────────────────
  {
    code: "hmSlf3", displayName: "3D Z-Level Finishing", category: "3d_milling", toolType: 1,
    params: parseParams({
      MASRFRES: "0.1*mtol", SICHEBENE: 100, CLEARANCE_AXIAL: 5, CLEARANCE_SIDE: 5,
      VERTZUSTEL: 0.5, AUFMASS: 0, AUFMASS_HORI: 0, SCAL_HEIGHT: 0.01,
      ZUST_MIN: 0.01, SLOPE_ANGLE: 50, PRECISION: 0.005,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol", BNDRES: "mtol*0.5",
      MSRFRES: "mtol", MSRFBNDRES: "mtol*0.1", CLIPRES: "mtol",
      HOLDER_CLEARANCE: 0.25, SHANK_CLEARANCE: 0.05, EXTENSION_CLEARANCE: 0.25,
      HEAD_CLEARANCE: 1.5, STEP_MAX: 4, TOOL_LENGTH_INCR: 1,
    }),
    machining: { clearancePlane: 100, stepdown: 0.5, allowance: 0, precision: 0.005, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {
      approachLength: "T:Dia*0.35", retractLength: "T:Dia*0.35",
      approachClearSide: "T:Rad*0.25", retractClearSide: "T:Rad*0.25",
      approachClearAxial: "T:Rad*0.1", retractClearAxial: "T:Rad*0.1",
    },
  },
  {
    code: "hmOrm", displayName: "3D Optimised Rest Machining", category: "3d_milling", toolType: 1,
    params: parseParams({
      SICHDIST: 5, STEPDOWN: 0.3, STEPOVER: 0.3, AUFMASS: 0, VERTZUSTEL: 0.5,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
      PRECISION: 0.01, HOLDCHECK_CLEARVALUE_F: "T:Dia*0.1",
      SHANK_CLEARANCE: 0.05, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5, STEP_MAX: 4,
      CAVITY_ROUGH_DEPTH_F: "T:Rad*0.75", REF_RADIUS: 3,
    }),
    machining: { stepdown: 0.3, stepover: 0.3, allowance: 0, precision: 0.01, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {},
  },
  {
    code: "hmRcm", displayName: "3D Corner Rest Machining", category: "3d_milling", toolType: 1,
    params: parseParams({
      SICHDIST: 5, HORIZUSTEL: 0.3, AUFMASS: 0, VERTZUSTEL: 0.5,
      ROC_BOTTOM_SIDE_STEP: 0.3, APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1",
      SAFESRFRES: "mtol", PRECISION: 0.01, HOLDCHECK_CLEARVALUE_F: "T:Dia*0.1",
      SHANK_CLEARANCE: 0.05, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5, STEP_MAX: 4,
      RIF_TOL: 0.01, REF_RADIUS: 3, RIF_TOL_F: "J:MTol",
    }),
    machining: { stepdown: 0.5, stepover: 0.3, allowance: 0, precision: 0.01, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {},
  },
  {
    code: "hmEcmp", displayName: "3D Workpiece Alignment (Edge)", category: "3d_milling", toolType: 200,
    params: parseParams({
      PRFRES: "mtol*0.7", SRFRES: "mtol*0.7", SICHEBENE: 100,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
      CHECK_TOL: 0.1, PRECISION: 0.05, SHANK_CLEARANCE_F: "J:MTol",
      SHANK_CLEARANCE: 0.25, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5, INFEED_LENGTH: 5, SICHDIST: 5,
    }),
    machining: { clearancePlane: 100, precision: 0.05, tolerance: "mtol*0.7" },
    collision: { holderClearance: 0.25, shankClearance: 0.25, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {},
  },

  // ─── 5-Axis ──────────────────────────────────────────────────────────
  {
    code: "hmf1x5", displayName: "5X Swarf 1 Curve", category: "5axis", toolType: 3,
    params: parseParams({
      PRFRES: "mtol*0.1", SRFRES: "mtol", SICHEBENE: 50, SICHDIST: 5,
      CLEAR_RADIUS: 20, RETRACT_RADIUS: 5, HORIZUSTEL: 10, VERTZUSTEL: 10,
      AUFMASS: 0, AUFMASS_HORI: 0, SCAL_HEIGHT: 0.01, ZUST_MIN: 0.01,
      TILT_ANGLE: 0, CLIMB_ANGLE: 0, SMOOTH_5AX: 1, FAN_DIST: 10,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
      PRECISION: 0.01, SHANK_CLEARANCE: 0.05, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5, STEP_MAX: 1,
      CHECK_TOL: 0.1, STEP_WIN: 0.2, WALZ_TOL: 0.5, MAX_DIST_ANGLE: 91,
      CLEAR_FEEDRATE: 50000, RAPID_IPOL_TOL: 0.02, STRIPE_WIDTH: 1, BASE_HEIGHT: 2,
    }),
    machining: { clearancePlane: 50, stepdown: 10, stepover: 10, allowance: 0, precision: 0.01, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {
      approachLength: "T:Dia*0.35", retractLength: "T:Dia*0.35",
      approachClearSide: "T:Rad*0.25", retractClearSide: "T:Rad*0.25",
      approachClearAxial: "T:Rad*0.1", retractClearAxial: "T:Rad*0.1",
    },
  },
  {
    code: "hmf2x5", displayName: "5X Swarf 2 Curves", category: "5axis", toolType: 3,
    params: parseParams({
      PRFRES: "mtol*0.1", SRFRES: "mtol", SICHEBENE: 50, SICHDIST: 5,
      CLEAR_RADIUS: 20, RETRACT_RADIUS: 5, HORIZUSTEL: 10, VERTZUSTEL: 10,
      AUFMASS: 0, SCAL_HEIGHT: 0.01, ZUST_MIN: 0.01, SMOOTH_5AX: 1,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
      PRECISION: 0.01, SHANK_CLEARANCE: 0.05, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5, STEP_MAX: 1,
      MAX_DIST_ANGLE: 91, CLEAR_FEEDRATE: 50000,
    }),
    machining: { clearancePlane: 50, stepdown: 10, stepover: 10, allowance: 0, precision: 0.01, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {
      approachLength: "T:Dia*0.35", retractLength: "T:Dia*0.35",
      approachClearSide: "T:Rad*0.25", retractClearSide: "T:Rad*0.25",
    },
  },

  // ─── Impeller/Blade (5X) ─────────────────────────────────────────────
  {
    code: "hmPbX3", displayName: "5X Impeller Probing", category: "impeller_blade", toolType: 12,
    params: parseParams({
      BLADE_COUNT: 1, PRFRES: "mtol*0.7", SRFRES: "mtol*0.7",
      SICHDIST: 5, APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
      CHECK_TOL: 0.1, PRECISION: 0.05, SHANK_CLEARANCE_F: "J:MTol",
      EXTENSION_CLEARANCE: 0.25, HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5,
      STEP_MAX: 0.5, TOL_ANGLE: 0.2, STEP_WIN: 2, MAX_DIST_ANGLE: 91,
      SHANK_CLEARANCE: 0.25, INFEED_LENGTH: 5, CLEARANCE_SIDE: 5,
      TOL_UPPER: 0.25, TOL_LOWER: -0.25, PROBING_TOL: 0.25,
    }),
    machining: { precision: 0.05, tolerance: "mtol*0.7" },
    collision: { holderClearance: 0.25, shankClearance: 0.25, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {},
  },

  // ─── Turning ─────────────────────────────────────────────────────────
  {
    code: "hmTrnr", displayName: "Turning Roughing", category: "turning", toolType: 101,
    params: parseParams({
      MASRFRES: "0.1*mtol", TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000,
      FEEDRATE: 0.3, CNTRES: "mtol", INFEED_LENGTH: 1, ADD_STEP: 0.25,
      ADD_STEP_MIN: 0.5, ADD_STEP_MAX: 5, CRAMP_STEP: 0.5,
      ALLOWANCE: 0, RADIAL_ALLOWANCE: 0, AXIAL_ALLOWANCE: 0,
      CLEARANCE_DISTANCE: 5, RETRACT_HEIGHT_IN: 10, RETRACT_HEIGHT_OUT: 100,
      SICHEBENE: 15, RETRACT_PLAN: 20, RAPID_ANGLE1: 20, RAPID_ANGLE2: 20,
      RAPID_ANGLE3: 20, RAPID_ANGLE_APPROACH: 20, RAPID_ANGLE_RETRACT: 20,
      CHAMFER_LENGTH: 0.5, ROUNDING_RADIUS: 0.5, CHIP_B_DIST: 10,
      HOLDER_CLEARANCE: 0.25, CUT_TOLERANCE: 0.05, TRANS_FEEDRATE: 5,
      FILLET_RADIUS_F: "T:CornerRad*0.1",
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol", stepdown: 1 },
    collision: { holderClearance: 0.25 },
    macros: {},
  },
  {
    code: "hmTrnf", displayName: "Turning Finishing", category: "turning", toolType: 101,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.1,
      CNTRES: "mtol", ALLOWANCE: 0, RADIAL_ALLOWANCE: 0, AXIAL_ALLOWANCE: 0,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmTrnl", displayName: "Turning Recessing", category: "turning", toolType: 101,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.1,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15 },
    collision: {},
    macros: {},
  },
  {
    code: "hmTrnp", displayName: "Turning Part-off", category: "turning", toolType: 101,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.05,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15 },
    collision: {},
    macros: {},
  },
  {
    code: "hmTrnbr", displayName: "Turning Boring", category: "turning", toolType: 101,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.15,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15 },
    collision: {},
    macros: {},
  },

  // ─── Mill-Turn Grooving ──────────────────────────────────────────────
  {
    code: "hmFgvf", displayName: "Face Groove Finishing", category: "millturn_grooving", toolType: 104,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", ALLOWANCE: 0, RADIAL_ALLOWANCE: 0, AXIAL_ALLOWANCE: 0,
      CLEARANCE_DISTANCE: 5, RETRACT_HEIGHT_OUT: 100, SICHEBENE: 15, RETRACT_PLAN: 20,
      DWELL_TIME: 1, DWELL_ROTATIONS: 1, SLOPE_ANGLE: 60,
      SIDE_OFFSET: 0.5, OVERLAP: 0.1, MACRO_CLEARANCE: 0.05,
      RETRACT_TANG_EXTENSION: 0.5, RETRACT_RAMP_RADIUS: 4,
      APPROACH_TANG_EXTENSION: 0.5, APPROACH_RAMP_RADIUS: 4,
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmFgvp", displayName: "Face Groove Plunging", category: "millturn_grooving", toolType: 104,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", ALLOWANCE: 0, CLEARANCE_DISTANCE: 5,
      SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmFgvt", displayName: "Face Groove Turning", category: "millturn_grooving", toolType: 104,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmGrvf", displayName: "Groove Finishing", category: "millturn_grooving", toolType: 103,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", INFEED_LENGTH: 1, ALLOWANCE: 0,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmGrvp", displayName: "Groove Plunging", category: "millturn_grooving", toolType: 103,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", INFEED_LENGTH: 1, ALLOWANCE: 0,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  {
    code: "hmGrvt", displayName: "Groove Turning", category: "millturn_grooving", toolType: 103,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 10000, FEEDRATE: 0.3,
      CNTRES: "mtol", CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
    }),
    machining: { clearancePlane: 15, tolerance: "mtol" },
    collision: {},
    macros: {},
  },

  // ─── Drilling ────────────────────────────────────────────────────────
  {
    code: "hmDril", displayName: "2D Drilling", category: "drilling", toolType: 1,
    params: parseParams({
      DRILL_OPT: 1, TOP_REF: 1, BOTTOM_REF: 1,
    }),
    machining: {},
    collision: {},
    macros: {},
  },

  // ─── EDM / Electrode ─────────────────────────────────────────────────
  {
    code: "hmEdm2", displayName: "EDM Curve Flow Machining", category: "edm", toolType: 1,
    params: parseParams({
      PRFRES: "mtol*0.05", SICHEBENE: 5, SICHDIST: 5,
      HORIZUSTEL: 10, VERTZUSTEL: 10, AUFMASS: 0,
      SMOOTH_5AX: 1, FAN_DIST: 10, PRECISION: 0.01,
      SICH_MAXDIST: 10, STEP_MAX: 2, CHECK_MODEL: 1, CLIMB: 1,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
    }),
    machining: { clearancePlane: 5, stepdown: 10, stepover: 10, allowance: 0, precision: 0.01, tolerance: "mtol*0.05" },
    collision: {},
    macros: {},
  },
  {
    code: "hmElectrode", displayName: "Electrode", category: "electrode", toolType: 1,
    params: parseParams({
      NCS_POSITION: 1, USE_CALC: 1, USE_COLL_CHECK: 1, USE_PP_RUN: 1,
      G_CLPLAN: 10000,
    }),
    machining: { clearancePlane: 10000 },
    collision: {},
    macros: {},
  },

  // ─── 3D Form / Setup / Feature ──────────────────────────────────────
  {
    code: "hmForm", displayName: "3D Form Pocket Milling", category: "3d_milling", toolType: 1,
    params: parseParams({
      SICHDIST: 5, SICHEBENE: 100, STEP_FACTOR: 0.5, VERTZUSTEL: 1,
      AUFMASS: 0, AUFMASS_HORI: 0, PRECISION: 0.01,
      BNDRES: "mtol*10", SAFESRFRES: "mtol", HOLDCHECK_CLEARVALUE_F: "T:Dia*0.1",
      SHANK_CLEARANCE: 0.05, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5,
      SKIP_SMALL_POCKETS: 1, SKIP_FACTOR: 1,
    }),
    machining: { clearancePlane: 100, stepdown: 1, allowance: 0, precision: 0.01, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {},
  },
  {
    code: "hmCpt", displayName: "Turning Parting/Cutoff", category: "turning", toolType: 105,
    params: parseParams({
      TCUTTINGSPEED: 200, TSPINDLESPEED_MAX: 0, FEEDRATE: 0.3,
      CLEARANCE_DISTANCE: 5, SICHEBENE: 15, RETRACT_PLAN: 20,
      RAPID_ANGLE1: 20, RAPID_ANGLE2: 20, RAPID_ANGLE3: 20,
      RAPID_ANGLE_APPROACH: 20, RAPID_ANGLE_RETRACT: 20,
      CHAMFER_LENGTH: 0.5, CHAMFER_ANGLE: 45, ROUNDING_RADIUS: 0.5,
      CORNER_ANGLE: 90, APPROACH_LENGTH: 1, RETRACT_LENGTH: 1, RETRACT_ANGLE: 90,
    }),
    machining: { clearancePlane: 15, allowance: 0 },
    collision: {},
    macros: {},
  },
  {
    code: "hmHcmp", displayName: "3D Workpiece Alignment (Surface)", category: "setup", toolType: 200,
    params: parseParams({
      PRFRES: "mtol*0.7", SRFRES: "mtol*0.7", SICHEBENE: 100,
      APPROXRES: "mtol*0.9|mtol*0.1|mtol*0.1", SAFESRFRES: "mtol",
      CHECK_TOL: 0.1, PRECISION: 0.05, SHANK_CLEARANCE_F: "J:MTol",
      SHANK_CLEARANCE: 0.25, EXTENSION_CLEARANCE: 0.25,
      HOLDER_CLEARANCE: 0.25, HEAD_CLEARANCE: 1.5, INFEED_LENGTH: 5, SICHDIST: 5,
    }),
    machining: { clearancePlane: 100, precision: 0.05, tolerance: "mtol*0.7" },
    collision: { holderClearance: 0.25, shankClearance: 0.25, extensionClearance: 0.25, headClearance: 1.5 },
    macros: {},
  },
  {
    code: "hmConv", displayName: "CAD Geometry Converter", category: "setup", toolType: 1,
    params: parseParams({
      DELTAFLAECHE: 0.01, DELTAKURVE: 0.01,
      DELTAFLAECHE1: 0.5, DELTAFLAECHE2: 0.1, DELTAFLAECHE3: 0.05,
      DELTAFLAECHE4: 0.01, DELTAFLAECHE5: 0.005, DELTAFLAECHE6: 0.001,
    }),
    machining: { tolerance: 0.01 },
    collision: {},
    macros: {},
  },
];

// ── Formula Variable Registry ────────────────────────────────────────────────

export const FORMULA_VARIABLES: Record<string, { description: string; unit: string; source: string }> = {
  "T:Dia": { description: "Tool diameter", unit: "mm", source: "tool" },
  "T:Rad": { description: "Tool radius", unit: "mm", source: "tool" },
  "T:CornerRad": { description: "Tool corner radius", unit: "mm", source: "tool" },
  "T:Length": { description: "Tool cutting length", unit: "mm", source: "tool" },
  "mtol": { description: "Machining tolerance", unit: "mm", source: "job" },
  "J:MTol": { description: "Job machining tolerance", unit: "mm", source: "job" },
  "J:F": { description: "Job feed rate", unit: "mm/min", source: "job" },
};

// ── FRTYP Registry (tool type codes) ─────────────────────────────────────────

export const FRTYP_MAP: Record<number, string> = {
  1: "end_mill",
  3: "ball_nose",
  12: "impeller_tool",
  101: "turning_insert",
  103: "grooving_tool",
  104: "grooving_insert",
  105: "parting_tool",
  200: "probe",
};

// ── Helper ───────────────────────────────────────────────────────────────────

function parseParams(raw: Record<string, number | string>): Record<string, CycleParam> {
  const result: Record<string, CycleParam> = {};
  for (const [key, value] of Object.entries(raw)) {
    const strVal = String(value);
    const isFormula = typeof value === "string" && /[A-Za-z:]/.test(strVal);
    result[key] = { key, value, isFormula };
  }
  return result;
}

function isFormulaMatch(value: number | string, formula: string): boolean {
  return String(value).toLowerCase().includes(formula.toLowerCase());
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HyperMillCycleDefaultsEngine {
  /** List all cycle defaults */
  listAll(): CycleDefaults[] {
    return CYCLE_DEFAULTS;
  }

  /** Get defaults for a specific cycle code */
  getByCode(code: string): CycleDefaults | null {
    return CYCLE_DEFAULTS.find(c => c.code.toLowerCase() === code.toLowerCase()) ?? null;
  }

  /** Search by display name */
  search(query: string): CycleDefaults[] {
    const q = query.toLowerCase();
    return CYCLE_DEFAULTS.filter(c =>
      c.displayName.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.category.includes(q)
    );
  }

  /** Get all cycles in a category */
  byCategory(category: CycleCategory): CycleDefaults[] {
    return CYCLE_DEFAULTS.filter(c => c.category === category);
  }

  /** Get all cycles that use formula-based parameters */
  withFormulas(): CycleDefaults[] {
    return CYCLE_DEFAULTS.filter(c =>
      Object.values(c.params).some(p => p.isFormula)
    );
  }

  /** Resolve a formula expression with actual tool/job values */
  resolveFormula(formula: string, context: {
    toolDiameter?: number;
    toolRadius?: number;
    toolCornerRadius?: number;
    machineTolerance?: number;
    jobFeed?: number;
  }): number | null {
    let expr = formula
      .replace(/T:Dia/g, String(context.toolDiameter ?? 10))
      .replace(/T:Rad/g, String(context.toolRadius ?? (context.toolDiameter ?? 10) / 2))
      .replace(/T:CornerRad/g, String(context.toolCornerRadius ?? 0))
      .replace(/J:MTol/g, String(context.machineTolerance ?? 0.01))
      .replace(/J:F/g, String(context.jobFeed ?? 1000))
      .replace(/mtol/g, String(context.machineTolerance ?? 0.01));

    // Handle pipe-separated APPROXRES (return first value)
    if (expr.includes("|")) {
      expr = expr.split("|")[0];
    }

    try {
      // Only evaluate safe arithmetic expressions
      if (/^[\d.+\-*/() ]+$/.test(expr)) {
        return Function(`"use strict"; return (${expr})`)() as number;
      }
    } catch { /* invalid expression */ }
    return null;
  }

  /** Get resolved defaults for a cycle given tool/job context */
  resolveDefaults(code: string, context: {
    toolDiameter?: number;
    toolRadius?: number;
    toolCornerRadius?: number;
    machineTolerance?: number;
    jobFeed?: number;
  }): Record<string, number | string | null> | null {
    const cycle = this.getByCode(code);
    if (!cycle) return null;
    const resolved: Record<string, number | string | null> = {};
    for (const [key, param] of Object.entries(cycle.params)) {
      if (param.isFormula) {
        resolved[key] = this.resolveFormula(String(param.value), context);
      } else {
        resolved[key] = param.value;
      }
    }
    return resolved;
  }

  /** Get common collision clearance defaults */
  collisionDefaults(): Record<string, number> {
    return {
      holderClearance: 0.25,
      shankClearance: 0.05,
      extensionClearance: 0.25,
      headClearance: 1.5,
    };
  }

  /** Get common macro (approach/retract) formula defaults */
  macroFormulas(): Record<string, string> {
    return {
      approachLength: "T:Dia*0.35",
      retractLength: "T:Dia*0.35",
      approachClearSide: "T:Rad*0.25",
      retractClearSide: "T:Rad*0.25",
      approachClearAxial: "T:Rad*0.1",
      retractClearAxial: "T:Rad*0.1",
      approachLiftMax: "T:Rad*0.5",
      retractLiftMax: "T:Rad*0.5",
      clearanceSide: "0.1*T:Rad",
    };
  }

  /** Stats */
  stats(): {
    totalCycles: number;
    byCategory: Record<string, number>;
    formulaCount: number;
    paramCount: number;
    formulaVars: string[];
  } {
    const byCategory: Record<string, number> = {};
    let formulaCount = 0;
    let paramCount = 0;
    for (const c of CYCLE_DEFAULTS) {
      byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
      for (const p of Object.values(c.params)) {
        paramCount++;
        if (p.isFormula) formulaCount++;
      }
    }
    return {
      totalCycles: CYCLE_DEFAULTS.length,
      byCategory,
      formulaCount,
      paramCount,
      formulaVars: Object.keys(FORMULA_VARIABLES),
    };
  }
}

export const hyperMillCycleDefaultsEngine = new HyperMillCycleDefaultsEngine();
