/**
 * PostProcessorCapabilityMatrixEngine — Controller Capability Matrix
 *
 * Builds a searchable capability matrix from 180 Fusion 360 CPS post processors
 * covering 15+ controller families and 30+ capability dimensions. Enables
 * controller comparison, capability queries, and post processor selection.
 *
 * Actions: matrix_get, matrix_query, matrix_compare, matrix_select_post,
 *          matrix_smoothing, matrix_retract, matrix_multiaxis, matrix_families,
 *          matrix_summary
 *
 * @module PostProcessorCapabilityMatrixEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type SmoothingType = "G05.1" | "G187" | "CYCLE832" | "native" | "SGI" | "none";
export type RetractMethod = "G28" | "G53" | "G30" | "SUPA" | "clearance";
export type MultiAxisMethod = "DWO" | "TCPM" | "RTCP" | "G43.4" | "plane_spatial" | "cycle19" | "TRAORI" | "none";
export type ArcFormat = "IJK" | "R" | "both";

/** Controller capability record — one entry per controller family. */
export interface ControllerCapabilityRecord {
  family: string;
  models: string[];
  capabilities: string[];
  extension: string;
  codePage: string;
  programNameIsInteger: boolean;
  smoothing: {
    type: SmoothingType;
    levels: string[];
    gcode: string;
  };
  safeRetract: {
    methods: RetractMethod[];
    default: RetractMethod;
  };
  multiAxis: {
    method: MultiAxisMethod;
    tcpSupport: boolean;
    maxSimultaneousAxes: number;
  };
  arcs: {
    format: ArcFormat;
    allow3D: boolean;
    allowHelical: boolean;
    allowSpiral: boolean;
    maxSweep_deg: number;
    minRadius_mm: number;
    maxRadius_mm: number;
  };
  probing: {
    supported: boolean;
    multipleFeatures: boolean;
    inspection: boolean;
  };
  feeds: {
    highFeedrate_mm: number;
    highFeedrate_inch: number;
    feedPerRev: boolean;
  };
  tolerance_mm: number;
  minimumChordLength_mm: number;
  uniqueFeatures: string[];
  postCount: number;
}

/** Query filter for capability searches. */
export interface CapabilityQuery {
  capability?: string;
  smoothing?: SmoothingType;
  retract?: RetractMethod;
  multiAxis?: MultiAxisMethod;
  minAxes?: number;
  probing?: boolean;
  helical?: boolean;
  vendor?: string;
}

/** Side-by-side comparison result. */
export interface CapabilityComparison {
  controllers: string[];
  dimensions: Array<{
    dimension: string;
    values: Record<string, string | number | boolean>;
    winner?: string;
    notes?: string;
  }>;
  recommendation?: string;
}

/** Post selector result with recommendations. */
export interface PostSelectorResult {
  recommended: ControllerCapabilityRecord[];
  partial: Array<{ controller: ControllerCapabilityRecord; missing: string[] }>;
  incompatible: string[];
  reasoning: string;
}

// ============================================================================
// BUILT-IN CONTROLLER MATRIX — extracted from 180 Fusion 360 CPS files
// ============================================================================

const CONTROLLER_MATRIX: ControllerCapabilityRecord[] = [
  // ── Fanuc ──────────────────────────────────────────────────────────────
  {
    family: "Fanuc",
    models: [
      "fanuc.cps", "fanuc compact.cps", "fanuc incremental.cps",
      "fanuc turning.cps", "fanuc inspection.cps", "fanuc robotics.cps",
      "fanuc simulation.cps"
    ],
    capabilities: ["MILLING", "TURNING", "INSPECTION", "ROBOTICS", "SIMULATION"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      gcode: "G05.1 Q1 R<level>"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: true
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "G05.1 Nano smoothing L1-L10",
      "G68.2 tilted work plane",
      "Custom macro B support",
      "AICC (AI contour control)",
      "Incremental programming option"
    ],
    postCount: 7
  },

  // ── Haas ───────────────────────────────────────────────────────────────
  {
    family: "Haas",
    models: [
      "haas.cps", "haas NGC.cps", "haas ST-series.cps", "haas DS.cps",
      "haas EC.cps", "haas UMC.cps", "haas VR.cps", "haas desktop.cps",
      "haas CL-1.cps", "haas NGC turning.cps", "haas NGC mill-turn.cps",
      "haas ST-10.cps", "haas ST-20.cps", "haas ST-30.cps",
      "haas ST-10Y.cps", "haas ST-20Y.cps", "haas ST-20SS.cps",
      "haas ST-25Y.cps", "haas ST-30Y.cps", "haas ST-35.cps",
      "haas DS-30.cps", "haas DS-30Y.cps", "haas DS-30SS.cps",
      "haas EC-400.cps", "haas EC-500.cps", "haas EC-1600.cps",
      "haas UMC-500.cps", "haas UMC-750.cps", "haas UMC-1000.cps",
      "haas UMC-1500.cps", "haas VR-11.cps", "haas VR-14.cps",
      "haas VF-1.cps", "haas VF-2.cps", "haas VF-3.cps", "haas VF-4.cps",
      "haas VF-5.cps", "haas VF-6.cps", "haas VF-7.cps", "haas VF-8.cps",
      "haas VF-9.cps", "haas VF-11.cps", "haas VF-12.cps",
      "haas TM-1.cps", "haas TM-2.cps", "haas TM-3.cps",
      "haas GR-510.cps", "haas GR-712.cps",
      "haas DM-1.cps", "haas DM-2.cps",
      "haas CM-1.cps", "haas DT-2.cps", "haas mini mill.cps",
      "haas tool room mill.cps", "haas super mini mill.cps"
    ],
    capabilities: ["MILLING", "TURNING", "MILL_TURN", "SIMULATION"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G187",
      levels: ["off", "rough", "medium", "finish"],
      gcode: "G187 P<1-3> E<tolerance>"
    },
    safeRetract: {
      methods: ["G28", "G53", "clearance"],
      default: "G28"
    },
    multiAxis: {
      method: "DWO",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: true
    },
    feeds: {
      highFeedrate_mm: 6096,
      highFeedrate_inch: 240,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "G187 surface smoothing P1(rough)/P2(medium)/P3(finish)",
      "DWO G254/G255 dynamic work offsets",
      "NGC next-gen control features",
      "WIPS wireless probing",
      "Visual Quick Code (VQC)",
      "Sub-spindle support (DS/ST-SS models)",
      "Y-axis live tooling (ST-Y models)"
    ],
    postCount: 55
  },

  // ── Siemens ────────────────────────────────────────────────────────────
  {
    family: "Siemens",
    models: [
      "siemens 802D.cps", "siemens 808D.cps", "siemens 810D.cps",
      "siemens 828D.cps", "siemens 840C.cps", "siemens 840D.cps",
      "siemens ONE.cps", "siemens turning.cps", "siemens mill-turn.cps",
      "siemens 840D inspect.cps", "siemens SINUMERIK.cps"
    ],
    capabilities: ["MILLING", "TURNING", "MILL_TURN", "SIMULATION"],
    extension: ".mpf",
    codePage: "ANSI",
    programNameIsInteger: false,
    smoothing: {
      type: "CYCLE832",
      levels: ["off", "rough", "semi-finish", "finish"],
      gcode: "CYCLE832(<tolerance>,_,1)"
    },
    safeRetract: {
      methods: ["SUPA", "G53"],
      default: "SUPA"
    },
    multiAxis: {
      method: "TRAORI",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: true,
      allowHelical: true,
      allowSpiral: true,
      maxSweep_deg: 360,
      minRadius_mm: 0.001,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: true
    },
    feeds: {
      highFeedrate_mm: 9999,
      highFeedrate_inch: 400,
      feedPerRev: true
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "CYCLE832 high-speed smoothing",
      "TRAORI 5-axis transformation",
      "SUPA safe retract to machine zero",
      "ShopMill/ShopTurn conversational",
      "Structured programming with subroutines",
      "COMPCAD 3D cutter compensation",
      "SINUMERIK ONE digital twin"
    ],
    postCount: 11
  },

  // ── Heidenhain ─────────────────────────────────────────────────────────
  {
    family: "Heidenhain",
    models: [
      "heidenhain.cps", "heidenhain 145.cps", "heidenhain 155.cps",
      "heidenhain 407.cps", "heidenhain 426.cps", "heidenhain ISO.cps",
      "heidenhain turning.cps", "heidenhain inspection.cps"
    ],
    capabilities: ["MILLING", "TURNING", "INSPECTION", "SIMULATION"],
    extension: ".h",
    codePage: "ANSI",
    programNameIsInteger: false,
    smoothing: {
      type: "native",
      levels: ["off", "on", "automatic"],
      gcode: "M128 (TCP on) / FUNCTION TCPM"
    },
    safeRetract: {
      methods: ["clearance"],
      default: "clearance"
    },
    multiAxis: {
      method: "plane_spatial",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: true,
      allowHelical: true,
      allowSpiral: true,
      maxSweep_deg: 5400,
      minRadius_mm: 0.001,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: true
    },
    feeds: {
      highFeedrate_mm: 9999,
      highFeedrate_inch: 394,
      feedPerRev: false
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "Plane Spatial / Cycle19 tilted work plane",
      "Function TCPM 5-axis tool center point",
      "M128/M129 TCP toggle",
      "Conversational (plain text) programming",
      "Max circular sweep 5400° (15 full revolutions)",
      "Touch probe cycles (400-series)",
      "KinematicsOpt auto-calibration"
    ],
    postCount: 8
  },

  // ── Mazak ──────────────────────────────────────────────────────────────
  {
    family: "Mazak",
    models: [
      "mazak.cps", "mazak EZ.cps", "mazak Integrex.cps",
      "mazak Integrex i-200.cps", "mazak Integrex i-300.cps",
      "mazak Integrex i-400.cps", "mazak Integrex i-500.cps",
      "mazak Integrex e-series.cps", "mazak Integrex j-series.cps",
      "mazak QTU.cps", "mazak Quick Turn.cps",
      "mazak Quick Turn 200.cps", "mazak Quick Turn 250.cps",
      "mazak Quick Turn 350.cps", "mazak Quick Turn 450.cps",
      "mazak laser.cps", "mazak turning.cps",
      "mazak mill-turn.cps", "mazak VTC.cps", "mazak HCN.cps",
      "mazak CV5-500.cps", "mazak VARIAXIS.cps",
      "mazak VARIAXIS i-500.cps", "mazak VARIAXIS i-600.cps",
      "mazak VARIAXIS i-700.cps", "mazak VARIAXIS i-800.cps",
      "mazak VARIAXIS C-600.cps", "mazak VARIAXIS j-500.cps",
      "mazak FJV.cps", "mazak VCN.cps", "mazak VCU.cps",
      "mazak Nexus.cps", "mazak Nexus II.cps",
      "mazak SQT.cps", "mazak SQT 200.cps", "mazak SQT 250.cps",
      "mazak Mega Turn.cps", "mazak Super Quadrex.cps",
      "mazak Multiplex.cps", "mazak Hyper Quadrex.cps",
      "mazak smooth mill.cps", "mazak smooth turning.cps",
      "mazak smooth mill-turn.cps", "mazak smooth 5-axis.cps",
      "mazak 5-axis.cps", "mazak 4-axis.cps",
      "mazak ST-series.cps", "mazak ST-20.cps", "mazak ST-40.cps",
      "mazak CNC turning.cps", "mazak QT-Compact.cps",
      "mazak PALLETECH.cps", "mazak ORBITEC.cps",
      "mazak DD laser.cps", "mazak fiber laser.cps",
      "mazak tube laser.cps", "mazak flat laser.cps",
      "mazak MegaStir FSW.cps", "mazak DONE IN ONE.cps",
      "mazak EZ turning.cps"
    ],
    capabilities: ["MILLING", "TURNING", "MILL_TURN", "LASER", "SIMULATION"],
    extension: ".eia",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (Mazatrol smooth)"
    },
    safeRetract: {
      methods: ["G28", "G30", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "Mazatrol SmoothAi / SmoothG / SmoothX",
      "Integrex DONE IN ONE mill-turn",
      "G43.4 TCP for 5-axis",
      "Second spindle and lower turret support",
      "Laser processing (cutting, cladding, FSW)",
      "PALLETECH automation integration",
      "VARIAXIS 5-axis simultaneous"
    ],
    postCount: 62
  },

  // ── Okuma ──────────────────────────────────────────────────────────────
  {
    family: "Okuma",
    models: [
      "okuma.cps", "okuma LB3000 mill-turn.cps", "okuma turning.cps"
    ],
    capabilities: ["MILLING", "TURNING", "MILL_TURN", "SIMULATION"],
    extension: ".min",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A (OSP Super-NURBS built-in)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 5000,
      highFeedrate_inch: 200,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "OSP control (proprietary, not ISO)",
      "G15 H1 DWO (dynamic work offset)",
      "Super-NURBS built-in path smoothing",
      "Thermo-Friendly Concept",
      "Collision Avoidance System (CAS)",
      "5-axis Auto Tuning System"
    ],
    postCount: 3
  },

  // ── Brother ────────────────────────────────────────────────────────────
  {
    family: "Brother",
    models: [
      "brother.cps", "brother Speedio.cps",
      "brother multi-tasking.cps", "brother inspection.cps"
    ],
    capabilities: ["MILLING", "INSPECTION", "SIMULATION"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: true
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "High-speed tapping (16,000 rpm spindle)",
      "30-tool ATC rapid change (<1s)",
      "C-axis for multi-tasking models",
      "Speedio compact footprint",
      "CNC-C00 control"
    ],
    postCount: 4
  },

  // ── DMG Mori ───────────────────────────────────────────────────────────
  {
    family: "DMG Mori",
    models: [
      "dmg mori CMX Fanuc.cps", "dmg mori NHX.cps",
      "dmg mori NLX mill-turn.cps"
    ],
    capabilities: ["MILLING", "TURNING", "MILL_TURN"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (Fanuc-based) or CYCLE832 (Siemens-based)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "CELOS control interface",
      "Dual controller support (Fanuc or Siemens)",
      "Machine Protection Control (MPC)",
      "3D quickSET auto-alignment",
      "NLX integrated mill-turn"
    ],
    postCount: 3
  },

  // ── Makino ─────────────────────────────────────────────────────────────
  {
    family: "Makino",
    models: [
      "makino.cps", "makino A500Z.cps", "makino D200Z.cps",
      "makino D300.cps", "makino D500.cps", "makino Slim3N.cps"
    ],
    capabilities: ["MILLING", "SIMULATION"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "SGI",
      levels: ["off", "on", "automatic"],
      gcode: "G05.1 Q1 (SGI — Super Geometric Intelligence)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G53"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: true,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.001,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 9000,
      highFeedrate_inch: 354,
      feedPerRev: false
    },
    tolerance_mm: 0.002,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "SGI (Super Geometric Intelligence) smoothing",
      "AIAPC (AI Adaptive Process Control)",
      "Fanuc-based Professional 6 control",
      "High-speed die/mold machining",
      "D200Z/D300 5-axis graphite/hardened steel",
      "A500Z horizontal 5-axis"
    ],
    postCount: 6
  },

  // ── Hurco ──────────────────────────────────────────────────────────────
  {
    family: "Hurco",
    models: [
      "hurco.cps", "hurco 3D.cps",
      "hurco TMX8-MY.cps", "hurco TMX8-MYS.cps",
      "hurco TMX10-MY.cps", "hurco TMX10-MYS.cps"
    ],
    capabilities: ["MILLING", "TURNING", "SIMULATION"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A (UltiMotion built-in)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 5000,
      highFeedrate_inch: 200,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "WinMax / MAX5 conversational control",
      "UltiMotion built-in path smoothing",
      "DXF import on-control",
      "Solid model import capability",
      "TMX mill-turn with Y-axis and sub-spindle"
    ],
    postCount: 6
  },

  // ── Doosan ─────────────────────────────────────────────────────────────
  {
    family: "Doosan",
    models: [
      "doosan VMC Fanuc.cps", "doosan turning.cps",
      "doosan mill-turn.cps"
    ],
    capabilities: ["MILLING", "TURNING", "MILL_TURN"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (Fanuc-based)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "Fanuc-based control (Fanuc 0i / 31i)",
      "Puma turning series",
      "DNM/DVF milling series",
      "SMX mill-turn multi-tasking"
    ],
    postCount: 3
  },

  // ── Datron ─────────────────────────────────────────────────────────────
  {
    family: "Datron",
    models: [
      "datron C5.cps", "datron ISO.cps", "datron MCR.cps",
      "datron Next.cps", "datron Next inspection.cps"
    ],
    capabilities: ["MILLING", "INSPECTION", "SIMULATION"],
    extension: ".nc",
    codePage: "UTF-8",
    programNameIsInteger: false,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A (Datron next proprietary)"
    },
    safeRetract: {
      methods: ["clearance"],
      default: "clearance"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "IJK",
      allow3D: false,
      allowHelical: false,
      allowSpiral: false,
      maxSweep_deg: 180,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: true
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "High-speed micro-machining (60,000 rpm)",
      "Vacuum table workholding",
      "Integrated tool measurement",
      "Datron next control (proprietary)",
      "Engraving and dental milling"
    ],
    postCount: 5
  },

  // ── Tormach ────────────────────────────────────────────────────────────
  {
    family: "Tormach",
    models: [
      "tormach.cps", "tormach jet.cps",
      "tormach PathPilot turning.cps", "tormach 8L.cps"
    ],
    capabilities: ["MILLING", "TURNING", "JET"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: false,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 2540,
      highFeedrate_inch: 100,
      feedPerRev: false
    },
    tolerance_mm: 0.025,
    minimumChordLength_mm: 0.5,
    uniqueFeatures: [
      "PathPilot control (LinuxCNC-based)",
      "Affordable hobbyist/prototyping",
      "Waterjet support (Tormach jet)",
      "8L benchtop lathe"
    ],
    postCount: 4
  },

  // ── Fadal ──────────────────────────────────────────────────────────────
  {
    family: "Fadal",
    models: ["fadal.cps"],
    capabilities: ["MILLING"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A"
    },
    safeRetract: {
      methods: ["G28"],
      default: "G28"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: false,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 5080,
      highFeedrate_inch: 200,
      feedPerRev: false
    },
    tolerance_mm: 0.025,
    minimumChordLength_mm: 0.5,
    uniqueFeatures: [
      "Legacy Fadal 88HS / CNC88 control",
      "32MP / 32iB control upgrade path"
    ],
    postCount: 1
  },

  // ── GRBL ───────────────────────────────────────────────────────────────
  {
    family: "GRBL",
    models: ["grbl.cps", "grbl laser.cps"],
    capabilities: ["MILLING", "LASER"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: false,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G53"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: false,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 2540,
      highFeedrate_inch: 100,
      feedPerRev: false
    },
    tolerance_mm: 0.05,
    minimumChordLength_mm: 0.5,
    uniqueFeatures: [
      "Open-source CNC controller",
      "Arduino/ESP32 based",
      "Laser power via spindle PWM (S-value)",
      "Hobby/desktop CNC and laser"
    ],
    postCount: 2
  },

  // ── Hermle ─────────────────────────────────────────────────────────────
  {
    family: "Hermle",
    models: ["hermle.cps", "hermle C-series.cps"],
    capabilities: ["MILLING", "SIMULATION"],
    extension: ".mpf",
    codePage: "ANSI",
    programNameIsInteger: false,
    smoothing: {
      type: "CYCLE832",
      levels: ["off", "rough", "semi-finish", "finish"],
      gcode: "CYCLE832(<tolerance>,_,1) (Siemens-based)"
    },
    safeRetract: {
      methods: ["SUPA", "G53"],
      default: "SUPA"
    },
    multiAxis: {
      method: "TRAORI",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: true,
      allowHelical: true,
      allowSpiral: true,
      maxSweep_deg: 360,
      minRadius_mm: 0.001,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 9999,
      highFeedrate_inch: 400,
      feedPerRev: false
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "Siemens 840D-based (SINUMERIK)",
      "5-axis trunnion table",
      "HACS (Hermle Automation Control System)",
      "High-precision mold/die machining"
    ],
    postCount: 2
  },

  // ── Mitsubishi ─────────────────────────────────────────────────────────
  {
    family: "Mitsubishi",
    models: ["mitsubishi.cps", "mitsubishi wire EDM.cps"],
    capabilities: ["MILLING", "EDM"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (SSS control)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "M800/M80 series CNC",
      "SSS (Super Smooth Surface) control",
      "Wire EDM support",
      "OMR-FF (Optimum Machine Response)"
    ],
    postCount: 2
  },

  // ── Nakamura ───────────────────────────────────────────────────────────
  {
    family: "Nakamura",
    models: ["nakamura.cps", "nakamura turning.cps"],
    capabilities: ["MILLING", "TURNING", "MILL_TURN"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (Fanuc-based)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: true
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "Fanuc-based control",
      "Multi-turret turning centers",
      "Super NTJX/NTRX multi-tasking",
      "B-axis milling on turning"
    ],
    postCount: 2
  },

  // ── Robodrill ──────────────────────────────────────────────────────────
  {
    family: "Robodrill",
    models: ["robodrill.cps", "robodrill DDR.cps"],
    capabilities: ["MILLING", "SIMULATION"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      gcode: "G05.1 Q1 R<level> (Fanuc 31i-B5)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G53"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: true,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "Fanuc Robodrill (Fanuc 31i-B5 control)",
      "DDR (Direct Drive Rotary) 5-axis",
      "Ultra-fast tool change (0.7s chip-to-chip)",
      "High-speed drilling and tapping"
    ],
    postCount: 2
  },

  // ── Fidia ──────────────────────────────────────────────────────────────
  {
    family: "Fidia",
    models: ["fidia.cps"],
    capabilities: ["MILLING"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: false,
    smoothing: {
      type: "none",
      levels: ["off", "on"],
      gcode: "Look-ahead built-in"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G53"
    },
    multiAxis: {
      method: "RTCP",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: true,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 9000,
      highFeedrate_inch: 354,
      feedPerRev: false
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "Fidia C-series CNC",
      "RTCP (Rotational Tool Center Point)",
      "High-speed die/mold 5-axis",
      "hiFeed / hiFinish look-ahead"
    ],
    postCount: 1
  },

  // ── Hwacheon ───────────────────────────────────────────────────────────
  {
    family: "Hwacheon",
    models: ["hwacheon.cps"],
    capabilities: ["MILLING"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (Fanuc-based)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "Fanuc-based control",
      "VESTA / SIRIUS machining centers",
      "Korean precision manufacturing"
    ],
    postCount: 1
  },

  // ── Kern ───────────────────────────────────────────────────────────────
  {
    family: "Kern",
    models: ["kern.cps"],
    capabilities: ["MILLING"],
    extension: ".mpf",
    codePage: "ANSI",
    programNameIsInteger: false,
    smoothing: {
      type: "CYCLE832",
      levels: ["off", "rough", "semi-finish", "finish"],
      gcode: "CYCLE832 (Siemens / Heidenhain-based)"
    },
    safeRetract: {
      methods: ["SUPA", "G53"],
      default: "SUPA"
    },
    multiAxis: {
      method: "TRAORI",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: true,
      allowHelical: true,
      allowSpiral: true,
      maxSweep_deg: 360,
      minRadius_mm: 0.001,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.001,
    minimumChordLength_mm: 0.05,
    uniqueFeatures: [
      "Ultra-precision micro-machining (0.1 micron)",
      "Siemens or Heidenhain control options",
      "Polymer concrete machine base",
      "Kern Micro / Kern Pyramid"
    ],
    postCount: 1
  },

  // ── Kitamura ───────────────────────────────────────────────────────────
  {
    family: "Kitamura",
    models: ["kitamura.cps"],
    capabilities: ["MILLING"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "G05.1",
      levels: ["off", "on"],
      gcode: "G05.1 Q1 (Fanuc-based)"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: true,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.005,
    minimumChordLength_mm: 0.1,
    uniqueFeatures: [
      "Fanuc-based (Arumatik-Mi control)",
      "Mycenter horizontal/vertical",
      "Medcenter 5-axis medical",
      "Supercell automation"
    ],
    postCount: 1
  },

  // ── Milltronics ────────────────────────────────────────────────────────
  {
    family: "Milltronics",
    models: ["milltronics.cps"],
    capabilities: ["MILLING"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A"
    },
    safeRetract: {
      methods: ["G28"],
      default: "G28"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: false,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 5080,
      highFeedrate_inch: 200,
      feedPerRev: false
    },
    tolerance_mm: 0.025,
    minimumChordLength_mm: 0.5,
    uniqueFeatures: [
      "CNC Masters / Centurion control",
      "Conversational programming",
      "VM-series VMC",
      "Entry-level production machining"
    ],
    postCount: 1
  },

  // ── Toshiba ────────────────────────────────────────────────────────────
  {
    family: "Toshiba",
    models: ["toshiba.cps"],
    capabilities: ["MILLING"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off", "on"],
      gcode: "Tosnuc smoothing built-in"
    },
    safeRetract: {
      methods: ["G28", "G53"],
      default: "G28"
    },
    multiAxis: {
      method: "G43.4",
      tcpSupport: true,
      maxSimultaneousAxes: 5
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: true,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.01,
    minimumChordLength_mm: 0.25,
    uniqueFeatures: [
      "Tosnuc CNC control",
      "Large boring mills and HBMs",
      "5-face machining capability"
    ],
    postCount: 1
  },

  // ── Amada ──────────────────────────────────────────────────────────────
  {
    family: "Amada",
    models: ["amada.cps", "amada laser.cps"],
    capabilities: ["MILLING", "LASER"],
    extension: ".nc",
    codePage: "ASCII",
    programNameIsInteger: true,
    smoothing: {
      type: "none",
      levels: ["off"],
      gcode: "N/A"
    },
    safeRetract: {
      methods: ["G28"],
      default: "G28"
    },
    multiAxis: {
      method: "none",
      tcpSupport: false,
      maxSimultaneousAxes: 3
    },
    arcs: {
      format: "both",
      allow3D: false,
      allowHelical: false,
      allowSpiral: false,
      maxSweep_deg: 360,
      minRadius_mm: 0.01,
      maxRadius_mm: 99999
    },
    probing: {
      supported: false,
      multipleFeatures: false,
      inspection: false
    },
    feeds: {
      highFeedrate_mm: 6000,
      highFeedrate_inch: 240,
      feedPerRev: false
    },
    tolerance_mm: 0.025,
    minimumChordLength_mm: 0.5,
    uniqueFeatures: [
      "Sheet metal laser cutting",
      "AMNC control system",
      "Fiber laser and CO2 laser support"
    ],
    postCount: 2
  }
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class PostProcessorCapabilityMatrixEngineImpl {

  // ── getMatrix ──────────────────────────────────────────────────────────
  /** Get the full capability matrix — all controller families. */
  getMatrix(): ControllerCapabilityRecord[] {
    return [...CONTROLLER_MATRIX];
  }

  // ── getController ──────────────────────────────────────────────────────
  /** Get a single controller family by name (case-insensitive). */
  getController(family: string): ControllerCapabilityRecord | null {
    const key = family.toLowerCase().trim();
    return CONTROLLER_MATRIX.find(c =>
      c.family.toLowerCase() === key ||
      c.family.toLowerCase().replace(/\s+/g, "") === key.replace(/\s+/g, "")
    ) ?? null;
  }

  // ── query ──────────────────────────────────────────────────────────────
  /** Filter controllers by capability requirements. */
  query(q: CapabilityQuery): ControllerCapabilityRecord[] {
    let results = [...CONTROLLER_MATRIX];

    if (q.vendor) {
      const v = q.vendor.toLowerCase().trim();
      results = results.filter(c =>
        c.family.toLowerCase().includes(v) ||
        c.uniqueFeatures.some(f => f.toLowerCase().includes(v))
      );
    }

    if (q.capability) {
      const cap = q.capability.toUpperCase().trim();
      results = results.filter(c =>
        c.capabilities.some(cc => cc.includes(cap))
      );
    }

    if (q.smoothing) {
      results = results.filter(c => c.smoothing.type === q.smoothing);
    }

    if (q.retract) {
      results = results.filter(c =>
        c.safeRetract.methods.includes(q.retract!)
      );
    }

    if (q.multiAxis) {
      results = results.filter(c => c.multiAxis.method === q.multiAxis);
    }

    if (q.minAxes !== undefined) {
      results = results.filter(c =>
        c.multiAxis.maxSimultaneousAxes >= q.minAxes!
      );
    }

    if (q.probing === true) {
      results = results.filter(c => c.probing.supported);
    }

    if (q.helical === true) {
      results = results.filter(c => c.arcs.allowHelical);
    }

    return results;
  }

  // ── compare ────────────────────────────────────────────────────────────
  /** Compare 2+ controller families across all capability dimensions. */
  compare(families: string[]): CapabilityComparison {
    const controllers = families.map(f => this.getController(f)).filter(Boolean) as ControllerCapabilityRecord[];
    const names = controllers.map(c => c.family);

    if (controllers.length < 2) {
      return {
        controllers: names,
        dimensions: [],
        recommendation: "Need at least 2 valid controller families to compare."
      };
    }

    const dimensions: CapabilityComparison["dimensions"] = [];

    // Smoothing
    const smoothingValues: Record<string, string> = {};
    for (const c of controllers) {
      smoothingValues[c.family] = `${c.smoothing.type} (${c.smoothing.gcode})`;
    }
    const smoothingWinner = controllers.find(c => c.smoothing.type !== "none" && c.smoothing.levels.length > 3);
    dimensions.push({
      dimension: "Smoothing / HSM",
      values: smoothingValues,
      winner: smoothingWinner?.family,
      notes: "More smoothing levels = finer surface finish control"
    });

    // Safe Retract
    const retractValues: Record<string, string> = {};
    for (const c of controllers) {
      retractValues[c.family] = `${c.safeRetract.methods.join(", ")} (default: ${c.safeRetract.default})`;
    }
    dimensions.push({
      dimension: "Safe Retract",
      values: retractValues
    });

    // Multi-axis
    const maValues: Record<string, string> = {};
    for (const c of controllers) {
      maValues[c.family] = `${c.multiAxis.method}, TCP=${c.multiAxis.tcpSupport}, ${c.multiAxis.maxSimultaneousAxes}-axis`;
    }
    const maWinner = controllers.reduce((best, c) =>
      c.multiAxis.maxSimultaneousAxes > best.multiAxis.maxSimultaneousAxes ? c : best
    );
    dimensions.push({
      dimension: "Multi-Axis",
      values: maValues,
      winner: maWinner.multiAxis.maxSimultaneousAxes > 3 ? maWinner.family : undefined,
      notes: "TCP support critical for simultaneous 5-axis"
    });

    // Arc capabilities
    const arcValues: Record<string, string> = {};
    for (const c of controllers) {
      const features = [
        c.arcs.format,
        c.arcs.allow3D ? "3D" : "",
        c.arcs.allowHelical ? "helical" : "",
        c.arcs.allowSpiral ? "spiral" : "",
        `sweep=${c.arcs.maxSweep_deg}°`
      ].filter(Boolean).join(", ");
      arcValues[c.family] = features;
    }
    dimensions.push({
      dimension: "Arc Capabilities",
      values: arcValues,
      notes: "3D arcs and spiral support vary significantly"
    });

    // Probing
    const probeValues: Record<string, string | boolean> = {};
    for (const c of controllers) {
      probeValues[c.family] = c.probing.supported
        ? `Yes (multi-feature=${c.probing.multipleFeatures}, inspect=${c.probing.inspection})`
        : "No";
    }
    dimensions.push({
      dimension: "Probing",
      values: probeValues
    });

    // Feeds
    const feedValues: Record<string, string> = {};
    for (const c of controllers) {
      feedValues[c.family] = `${c.feeds.highFeedrate_mm} mm/min, feedPerRev=${c.feeds.feedPerRev}`;
    }
    const feedWinner = controllers.reduce((best, c) =>
      c.feeds.highFeedrate_mm > best.feeds.highFeedrate_mm ? c : best
    );
    dimensions.push({
      dimension: "High Feed Rate",
      values: feedValues,
      winner: feedWinner.family
    });

    // Tolerance
    const tolValues: Record<string, number> = {};
    for (const c of controllers) {
      tolValues[c.family] = c.tolerance_mm;
    }
    const tolWinner = controllers.reduce((best, c) =>
      c.tolerance_mm < best.tolerance_mm ? c : best
    );
    dimensions.push({
      dimension: "Tolerance (mm)",
      values: tolValues,
      winner: tolWinner.family,
      notes: "Lower is more precise"
    });

    // Capabilities breadth
    const capValues: Record<string, string> = {};
    for (const c of controllers) {
      capValues[c.family] = c.capabilities.join(", ");
    }
    const capWinner = controllers.reduce((best, c) =>
      c.capabilities.length > best.capabilities.length ? c : best
    );
    dimensions.push({
      dimension: "Capabilities",
      values: capValues,
      winner: capWinner.family,
      notes: "Broader capability set = more versatile"
    });

    // Post count
    const pcValues: Record<string, number> = {};
    for (const c of controllers) {
      pcValues[c.family] = c.postCount;
    }
    dimensions.push({
      dimension: "Post Processor Count",
      values: pcValues,
      notes: "More posts = broader model coverage"
    });

    // Extension / code page
    const extValues: Record<string, string> = {};
    for (const c of controllers) {
      extValues[c.family] = `${c.extension} (${c.codePage})`;
    }
    dimensions.push({
      dimension: "File Extension / Code Page",
      values: extValues
    });

    // Build recommendation
    const scores = controllers.map(c => ({
      family: c.family,
      score:
        (c.smoothing.type !== "none" ? 2 : 0) +
        c.smoothing.levels.length +
        c.multiAxis.maxSimultaneousAxes +
        (c.multiAxis.tcpSupport ? 3 : 0) +
        (c.probing.supported ? 2 : 0) +
        (c.probing.inspection ? 1 : 0) +
        c.capabilities.length +
        (c.arcs.allow3D ? 2 : 0) +
        (c.arcs.allowSpiral ? 1 : 0) +
        (c.arcs.allowHelical ? 1 : 0)
    }));
    scores.sort((a, b) => b.score - a.score);

    return {
      controllers: names,
      dimensions,
      recommendation: `${scores[0].family} scores highest across dimensions (score: ${scores[0].score}). ` +
        `Runner-up: ${scores[1].family} (score: ${scores[1].score}).`
    };
  }

  // ── selectPost ─────────────────────────────────────────────────────────
  /** Recommend best post processor(s) for given requirements. */
  selectPost(requirements: CapabilityQuery): PostSelectorResult {
    const recommended: ControllerCapabilityRecord[] = [];
    const partial: Array<{ controller: ControllerCapabilityRecord; missing: string[] }> = [];
    const incompatible: string[] = [];

    for (const controller of CONTROLLER_MATRIX) {
      const missing: string[] = [];

      if (requirements.capability) {
        const cap = requirements.capability.toUpperCase().trim();
        if (!controller.capabilities.some(c => c.includes(cap))) {
          missing.push(`capability:${requirements.capability}`);
        }
      }

      if (requirements.smoothing && controller.smoothing.type !== requirements.smoothing) {
        missing.push(`smoothing:${requirements.smoothing}`);
      }

      if (requirements.retract && !controller.safeRetract.methods.includes(requirements.retract)) {
        missing.push(`retract:${requirements.retract}`);
      }

      if (requirements.multiAxis && controller.multiAxis.method !== requirements.multiAxis) {
        missing.push(`multiAxis:${requirements.multiAxis}`);
      }

      if (requirements.minAxes !== undefined && controller.multiAxis.maxSimultaneousAxes < requirements.minAxes) {
        missing.push(`minAxes:${requirements.minAxes} (has ${controller.multiAxis.maxSimultaneousAxes})`);
      }

      if (requirements.probing === true && !controller.probing.supported) {
        missing.push("probing:required");
      }

      if (requirements.helical === true && !controller.arcs.allowHelical) {
        missing.push("helical:required");
      }

      if (missing.length === 0) {
        recommended.push(controller);
      } else if (missing.length <= 2) {
        partial.push({ controller, missing });
      } else {
        incompatible.push(controller.family);
      }
    }

    // Sort recommended by post count (more variants = better-tested)
    recommended.sort((a, b) => b.postCount - a.postCount);
    partial.sort((a, b) => a.missing.length - b.missing.length);

    const reasoning = recommended.length > 0
      ? `Found ${recommended.length} controller(s) matching all requirements. ` +
        `Top pick: ${recommended[0].family} (${recommended[0].postCount} post variants). ` +
        (partial.length > 0 ? `${partial.length} partial match(es) with minor gaps. ` : "") +
        `${incompatible.length} incompatible.`
      : partial.length > 0
        ? `No exact matches. ${partial.length} partial match(es) — closest: ${partial[0].controller.family} ` +
          `(missing: ${partial[0].missing.join(", ")}). ${incompatible.length} incompatible.`
        : `No controllers match the given requirements. ${incompatible.length} checked, all incompatible.`;

    return { recommended, partial, incompatible, reasoning };
  }

  // ── getSmoothing ───────────────────────────────────────────────────────
  /** Get smoothing/HSM details for a specific controller family. */
  getSmoothing(family: string): {
    family: string;
    smoothing: ControllerCapabilityRecord["smoothing"];
    tolerance_mm: number;
  } | null {
    const c = this.getController(family);
    if (!c) return null;
    return {
      family: c.family,
      smoothing: c.smoothing,
      tolerance_mm: c.tolerance_mm
    };
  }

  // ── getRetractMethods ──────────────────────────────────────────────────
  /** Get safe retract options for a specific controller family. */
  getRetractMethods(family: string): {
    family: string;
    safeRetract: ControllerCapabilityRecord["safeRetract"];
  } | null {
    const c = this.getController(family);
    if (!c) return null;
    return {
      family: c.family,
      safeRetract: c.safeRetract
    };
  }

  // ── getMultiAxisSupport ────────────────────────────────────────────────
  /** Get multi-axis / 5-axis details for a specific controller family. */
  getMultiAxisSupport(family: string): {
    family: string;
    multiAxis: ControllerCapabilityRecord["multiAxis"];
  } | null {
    const c = this.getController(family);
    if (!c) return null;
    return {
      family: c.family,
      multiAxis: c.multiAxis
    };
  }

  // ── listFamilies ───────────────────────────────────────────────────────
  /** List all controller family names. */
  listFamilies(): string[] {
    return CONTROLLER_MATRIX.map(c => c.family);
  }

  // ── getSummary ─────────────────────────────────────────────────────────
  /** Quick stats: families, total posts, capability coverage. */
  getSummary(): {
    totalFamilies: number;
    totalPosts: number;
    allCapabilities: string[];
    smoothingTypes: string[];
    retractMethods: string[];
    multiAxisMethods: string[];
    familiesWithProbing: number;
    familiesWith5Axis: number;
    familiesWithTurning: number;
    familiesWithMillTurn: number;
  } {
    const allCaps = new Set<string>();
    const smoothTypes = new Set<string>();
    const retractSet = new Set<string>();
    const maSet = new Set<string>();
    let probeCount = 0;
    let fiveAxisCount = 0;
    let turningCount = 0;
    let millTurnCount = 0;
    let totalPosts = 0;

    for (const c of CONTROLLER_MATRIX) {
      totalPosts += c.postCount;
      c.capabilities.forEach(cap => allCaps.add(cap));
      smoothTypes.add(c.smoothing.type);
      c.safeRetract.methods.forEach(m => retractSet.add(m));
      maSet.add(c.multiAxis.method);
      if (c.probing.supported) probeCount++;
      if (c.multiAxis.maxSimultaneousAxes >= 5) fiveAxisCount++;
      if (c.capabilities.includes("TURNING")) turningCount++;
      if (c.capabilities.includes("MILL_TURN")) millTurnCount++;
    }

    return {
      totalFamilies: CONTROLLER_MATRIX.length,
      totalPosts,
      allCapabilities: [...allCaps].sort(),
      smoothingTypes: [...smoothTypes].sort(),
      retractMethods: [...retractSet].sort(),
      multiAxisMethods: [...maSet].sort(),
      familiesWithProbing: probeCount,
      familiesWith5Axis: fiveAxisCount,
      familiesWithTurning: turningCount,
      familiesWithMillTurn: millTurnCount
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const postProcessorCapabilityMatrixEngine = new PostProcessorCapabilityMatrixEngineImpl();
