/**
  Copyright (C) 2012-2024 by Autodesk, Inc.
  All rights reserved.

  Mitsubishi EA12D Dual-Head Sinker EDM post processor configuration - PRISM Enhanced Edition

  $Revision: 50210 PRISM-Enhanced for EA12D $
  $Date: 2026-04-10 $

  FORKID {8B4G2E93-AD5F-5c2b-C238-7F9E4B6G0123}
*/

///////////////////////////////////////////////////////////////////////////////
//                    MITSUBISHI EA12D DUAL-HEAD SINKER EDM
//                    PRISM-ENHANCED POST PROCESSOR
//
// MACHINE SPECIFICATIONS:
//   Model: Mitsubishi EA12D (Dual Head Sinker EDM)
//   Controller: C30EA-2 (Advanced Dual-Head)
//   Travel: X300 / Y250 / Z250 mm (per head)
//   Heads: 2 (independent axes)
//   Electrode Changer: 24-station ATC
//   Max Current: 120A (per head)
//   Max Workpiece: 1000 kg
//   Tank: 900 x 600 x 350 mm
//   C-Axis: Yes (electrode rotation/positioning)
//   Best Surface Finish: Ra 0.15 um
//   Remote Monitoring: Yes (network capable)
//
// EA12D vs EA12S COMPARISON:
//   Feature              EA12D              EA12S
//   -------              -----              -----
//   Heads                2 (independent)    1
//   ATC Stations         24                 16
//   Max Current          120A               80A
//   Max Workpiece        1000 kg            500 kg
//   Tank Size            900x600x350mm      700x500x300mm
//   Best Finish          Ra 0.15 um         Ra 0.2 um
//   C-Axis               Yes                No
//   Controller           C30EA-2            FP80S
//   Dual-Head Modes      Ind/Sync/Seq       N/A
//   Adaptive Control     Real-time gap      Basic
//   Remote Monitor       Yes                No
//   Throughput           ~2x (dual mode)    1x (baseline)
//
// DUAL-HEAD OPERATION MODES:
//   Independent Mode (M73):
//     - Each head burns a different cavity simultaneously
//     - Separate electrode, condition, and depth per head
//     - Doubles throughput for multi-cavity dies
//   Synchronized Mode (M72):
//     - Both heads burn same cavity from opposite sides
//     - Faster material removal on large cavities
//     - Requires symmetric electrode setup
//   Sequential Mode (default):
//     - Head 1 roughs, Head 2 finishes (pipeline)
//     - No waiting between rough and finish stages
//     - Optimal for tight-tolerance single cavities
//
// ELECTRODE MATERIAL RECOMMENDATIONS (per workpiece):
//   D2 Tool Steel (58-62 HRC):
//     - Rough: Graphite EDM-200 (wear ratio ~1:1)
//     - Semi-finish: Copper C110 (wear ratio ~0.5:1)
//     - Finish: Copper-Tungsten CuW70 (wear ratio ~0.1:1)
//   H13 Hot Work Steel (44-52 HRC):
//     - Rough: Graphite EDM-3 fine grain (wear ratio ~0.8:1)
//     - Semi-finish: Graphite POCO-3 (wear ratio ~0.5:1)
//     - Finish: Copper C110 polished (wear ratio ~0.3:1)
//   A2 Tool Steel (57-62 HRC):
//     - Rough: Graphite EDM-200 (wear ratio ~1:1)
//     - Semi-finish: Copper C110 (wear ratio ~0.4:1)
//     - Finish: Copper-Tungsten CuW70 (wear ratio ~0.1:1)
//   S7 Shock Steel (54-56 HRC):
//     - Rough: Graphite EDM-3 (wear ratio ~0.7:1)
//     - Semi-finish: Copper C110 (wear ratio ~0.3:1)
//     - Finish: Copper C110 fine-finish (wear ratio ~0.2:1)
//   Carbide (WC-Co):
//     - Rough: Copper-Tungsten CuW80 ONLY (wear ratio ~0.3:1)
//     - Semi-finish: Copper-Tungsten CuW90 (wear ratio ~0.15:1)
//     - Finish: Copper-Tungsten CuW90 polished (wear ratio ~0.08:1)
//     WARNING: Graphite on carbide causes microcracking - NEVER use
//
// PRISM FEATURES:
//   - All EA12S features (wear comp, multi-electrode, finish prediction)
//   - Dual-head scheduling optimizer
//   - Cavity balancing (equal work distribution across heads)
//   - Concurrent electrode strategy (rough on H1 while finish on H2)
//   - Real-time adaptive gap control integration
//   - C-axis electrode orientation optimization
//
// C30EA-2 G-CODE REFERENCE:
//   G90/G91 - Absolute/Incremental positioning
//   G01     - Linear plunge (Z-axis burn)
//   G02/G03 - Circular orbit (CW/CCW)
//   G73     - Peck EDM cycle (rough)
//   G83     - Deep peck EDM cycle (precision)
//   G92     - Reference point set
//   G54-G59 - Work coordinates (per cavity)
//
// C30EA-2 M-CODE REFERENCE:
//   M00     - Program stop
//   M02     - Program end
//   M06     - Electrode change (ATC)
//   M07     - Flushing ON
//   M09     - Flushing OFF
//   M17     - EDM power ON
//   M18     - EDM power OFF
//   M50-M65 - Condition selection (E-table)
//   M70     - Head 1 select
//   M71     - Head 2 select
//   M72     - Synchronized dual-head mode
//   M73     - Independent dual-head mode
//
// ORBIT MODES:
//   Circular orbit  - uniform cavity enlargement
//   Square orbit    - rectangular pocket finishing
//   Planetary orbit - complex geometry averaging
//   Random orbit    - uniform electrode wear distribution
//
///////////////////////////////////////////////////////////////////////////////

description = "Mitsubishi EA12D Dual-Head Sinker EDM - PRISM Enhanced";
vendor = "Mitsubishi Electric";
vendorUrl = "https://www.mitsubishielectric.com";
legal = "Copyright (C) 2012-2024 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45909;

longDescription = "PRISM-enhanced post processor for Mitsubishi EA12D dual-head sinker EDM with C30EA-2 controller. " +
  "Features: dual-head operation (independent/synchronized/sequential modes), C-axis electrode rotation, " +
  "electrode wear compensation, multi-electrode strategy optimization (rough/semi/finish), " +
  "material-electrode pair optimization for D2/H13/A2/S7/carbide, surface finish prediction, " +
  "overburn/undercut compensation, dual-head scheduling optimizer, cavity balancing, " +
  "concurrent electrode strategy, real-time adaptive gap control. " +
  "Machine: 2 heads, X300/Y250/Z250mm each, 120A max, 1000kg workpiece, C-axis, Ra 0.15um best finish. " +
  "24-station electrode changer with remote monitoring capability.";

extension = "nc";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING;
tolerance = spatial(0.001, MM);

minimumChordLength = spatial(0.01, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(500, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(360);
allowHelicalMoves = false;
allowedCircularPlanes = (1 << PLANE_XY);
allowSpiralMoves = false;
allowFeedPerRevolutionDrilling = false;
highFeedrate = 1000;

// =====================================================================
// USER-DEFINED PROPERTIES
// =====================================================================
properties = {
  // --- Machine Configuration ---
  showSequenceNumbers: {
    title: "Use sequence numbers",
    description: "Use sequence numbers for each block",
    type: "boolean",
    value: true,
    scope: "post"
  },
  sequenceNumberStart: {
    title: "Start sequence number",
    description: "The number at which to start the sequence numbers",
    type: "integer",
    value: 10,
    scope: "post"
  },
  sequenceNumberIncrement: {
    title: "Sequence number increment",
    description: "The amount by which the sequence number is incremented",
    type: "integer",
    value: 10,
    scope: "post"
  },

  // --- Dual-Head Configuration ---
  dualHeadMode: {
    title: "Dual-head operation mode",
    description: "How to use the two independent heads",
    type: "enum",
    values: [
      { id: "sequential", title: "Sequential (H1 rough, H2 finish)" },
      { id: "independent", title: "Independent (separate cavities)" },
      { id: "synchronized", title: "Synchronized (same cavity)" },
      { id: "auto", title: "PRISM auto-optimize" }
    ],
    value: "auto",
    scope: "post"
  },
  head1Assignment: {
    title: "Head 1 assignment",
    description: "Default role for Head 1",
    type: "enum",
    values: [
      { id: "rough", title: "Roughing" },
      { id: "finish", title: "Finishing" },
      { id: "auto", title: "PRISM auto-assign" }
    ],
    value: "auto",
    scope: "post"
  },
  head2Assignment: {
    title: "Head 2 assignment",
    description: "Default role for Head 2",
    type: "enum",
    values: [
      { id: "rough", title: "Roughing" },
      { id: "finish", title: "Finishing" },
      { id: "auto", title: "PRISM auto-assign" }
    ],
    value: "auto",
    scope: "post"
  },
  enableCavityBalancing: {
    title: "Enable cavity balancing",
    description: "PRISM distributes cavities evenly across heads",
    type: "boolean",
    value: true,
    scope: "post"
  },

  // --- C-Axis ---
  enableCAxis: {
    title: "Enable C-axis rotation",
    description: "Use C-axis for electrode orientation",
    type: "boolean",
    value: true,
    scope: "post"
  },
  cAxisOrientAngle: {
    title: "C-axis orientation angle (deg)",
    description: "Default C-axis electrode orientation, 0 = auto from geometry",
    type: "number",
    value: 0,
    scope: "post"
  },

  // --- PRISM Electrode Management ---
  electrodeStrategy: {
    title: "Electrode strategy",
    description: "Multi-electrode burn strategy",
    type: "enum",
    values: [
      { id: "single", title: "Single electrode" },
      { id: "rough-finish", title: "Rough + Finish (2-electrode)" },
      { id: "rough-semi-finish", title: "Rough + Semi + Finish (3-electrode)" },
      { id: "auto", title: "PRISM auto-optimize" }
    ],
    value: "auto",
    scope: "post"
  },
  electrodeMaterial: {
    title: "Electrode material",
    description: "Primary electrode material for wear calculations",
    type: "enum",
    values: [
      { id: "graphite", title: "Graphite (EDM grade)" },
      { id: "copper", title: "Copper C110" },
      { id: "copper-tungsten", title: "Copper-Tungsten CuW" },
      { id: "auto", title: "PRISM auto-select per operation" }
    ],
    value: "auto",
    scope: "post"
  },
  workpieceMaterial: {
    title: "Workpiece material",
    description: "Workpiece material for technology table selection",
    type: "enum",
    values: [
      { id: "D2", title: "D2 Tool Steel" },
      { id: "H13", title: "H13 Hot Work" },
      { id: "A2", title: "A2 Tool Steel" },
      { id: "S7", title: "S7 Shock Steel" },
      { id: "carbide", title: "Carbide (WC-Co)" },
      { id: "custom", title: "Custom (use tech table)" }
    ],
    value: "D2",
    scope: "post"
  },

  // --- PRISM Wear Compensation ---
  enableWearCompensation: {
    title: "Enable electrode wear compensation",
    description: "PRISM tracks Z-axis wear and applies retraction compensation",
    type: "boolean",
    value: true,
    scope: "post"
  },
  wearCompensationMethod: {
    title: "Wear compensation method",
    description: "How to compensate for electrode wear during burn",
    type: "enum",
    values: [
      { id: "z-retract", title: "Z-axis retraction tracking" },
      { id: "touch-sense", title: "Touch-sense between passes" },
      { id: "predicted", title: "PRISM predicted wear model" },
      { id: "adaptive", title: "Real-time adaptive (C30EA-2)" }
    ],
    value: "adaptive",
    scope: "post"
  },

  // --- PRISM Surface Finish ---
  targetSurfaceFinish: {
    title: "Target surface finish (Ra um)",
    description: "Desired surface roughness - PRISM will select power settings",
    type: "number",
    value: 0.5,
    scope: "post"
  },
  enableFinishPrediction: {
    title: "Enable surface finish prediction",
    description: "PRISM predicts achievable Ra based on power and electrode",
    type: "boolean",
    value: true,
    scope: "post"
  },

  // --- Adaptive Gap Control ---
  enableAdaptiveGap: {
    title: "Enable adaptive gap control",
    description: "C30EA-2 real-time gap voltage monitoring and adjustment",
    type: "boolean",
    value: true,
    scope: "post"
  },
  gapVoltageTarget: {
    title: "Target gap voltage (V)",
    description: "Optimal gap voltage for stable burning, 0 = auto",
    type: "number",
    value: 0,
    scope: "post"
  },

  // --- Overburn/Undercut ---
  enableOverburnCompensation: {
    title: "Enable overburn compensation",
    description: "Compensate electrode path for overburn gap",
    type: "boolean",
    value: true,
    scope: "post"
  },
  overburnOffset: {
    title: "Overburn offset (mm)",
    description: "Manual overburn offset, 0 = PRISM auto-calculate from conditions",
    type: "number",
    value: 0,
    scope: "post"
  },

  // --- Orbit Settings ---
  defaultOrbitMode: {
    title: "Default orbit mode",
    description: "Orbit pattern for cavity finishing",
    type: "enum",
    values: [
      { id: "none", title: "No orbit (straight plunge)" },
      { id: "circular", title: "Circular orbit" },
      { id: "square", title: "Square orbit" },
      { id: "planetary", title: "Planetary orbit" },
      { id: "random", title: "Random orbit (uniform wear)" }
    ],
    value: "circular",
    scope: "post"
  },
  orbitRadius: {
    title: "Orbit radius (mm)",
    description: "Orbit radius for finishing passes, 0 = auto from overburn",
    type: "number",
    value: 0,
    scope: "post"
  },

  // --- Flushing ---
  flushingMode: {
    title: "Flushing mode",
    description: "Dielectric flushing strategy",
    type: "enum",
    values: [
      { id: "jet", title: "Jet flushing" },
      { id: "suction", title: "Suction flushing" },
      { id: "jump", title: "Jump flushing (Z retract)" },
      { id: "combined", title: "Combined jet + jump" }
    ],
    value: "combined",
    scope: "post"
  },
  jumpHeight: {
    title: "Jump height (mm)",
    description: "Z retract height for jump flushing",
    type: "number",
    value: 1.0,
    scope: "post"
  },
  jumpFrequency: {
    title: "Jump frequency",
    description: "Jump flushing frequency (cycles per mm depth)",
    type: "integer",
    value: 5,
    scope: "post"
  },

  // --- Safety ---
  safeRetractZ: {
    title: "Safe Z retract (mm)",
    description: "Safe retract height above workpiece for electrode changes",
    type: "number",
    value: 50,
    scope: "post"
  },
  maxBurnDepth: {
    title: "Maximum burn depth (mm)",
    description: "Safety limit for maximum Z plunge depth",
    type: "number",
    value: 120,
    scope: "post"
  },

  // --- Remote Monitoring ---
  enableRemoteMonitoring: {
    title: "Enable remote monitoring output",
    description: "Add status codes for C30EA-2 network monitoring",
    type: "boolean",
    value: true,
    scope: "post"
  }
};

// =====================================================================
// FORMATTING AND VARIABLES
// =====================================================================
var gFormat = createFormat({ prefix: "G", decimals: 0, width: 2, zeropad: true });
var mFormat = createFormat({ prefix: "M", decimals: 0, width: 2, zeropad: true });
var tFormat = createFormat({ prefix: "T", decimals: 0, width: 2, zeropad: true });
var hFormat = createFormat({ prefix: "H", decimals: 0 }); // Head selector
var eFormat = createFormat({ prefix: "E", decimals: 0 }); // EDM power parameter
var iCurrentFormat = createFormat({ prefix: "I", decimals: 1 }); // Current parameter
var pTimeFormat = createFormat({ prefix: "P", decimals: 0 }); // On-time (us)
var pOffFormat = createFormat({ prefix: "Q", decimals: 0 }); // Off-time (us)
var cFormat = createFormat({ prefix: "C", decimals: 3 }); // C-axis angle

var xyzFormat = createFormat({ decimals: (unit == MM ? 3 : 4), forceDecimal: true });
var feedFormat = createFormat({ decimals: (unit == MM ? 1 : 2), forceDecimal: true });
var angleFormat = createFormat({ decimals: 3, forceDecimal: true });
var secFormat = createFormat({ decimals: 1, forceDecimal: true });

var xOutput = createOutputVariable({ prefix: "X" }, xyzFormat);
var yOutput = createOutputVariable({ prefix: "Y" }, xyzFormat);
var zOutput = createOutputVariable({ prefix: "Z" }, xyzFormat);
var cOutput = createOutputVariable({ prefix: "C" }, angleFormat);
var feedOutput = createOutputVariable({ prefix: "F" }, feedFormat);

var gMotionModal = createOutputVariable({}, gFormat);
var gAbsIncModal = createOutputVariable({}, gFormat);
var gUnitModal = createOutputVariable({}, gFormat);

var sequenceNumber;
var activeHead = 1; // track which head is currently active
var headMode = "sequential"; // current dual-head mode

// =====================================================================
// PRISM TECHNOLOGY TABLES
// =====================================================================

// Overburn gap (mm) indexed by [material][condition]
var PRISM_OVERBURN_TABLE = {
  "D2":      { rough: 0.25, semi: 0.12, finish: 0.05, superfine: 0.02 },
  "H13":     { rough: 0.22, semi: 0.10, finish: 0.04, superfine: 0.018 },
  "A2":      { rough: 0.24, semi: 0.11, finish: 0.05, superfine: 0.02 },
  "S7":      { rough: 0.20, semi: 0.09, finish: 0.04, superfine: 0.015 },
  "carbide": { rough: 0.15, semi: 0.07, finish: 0.03, superfine: 0.012 }
};

// Electrode wear ratio indexed by [electrode][workpiece][condition]
var PRISM_WEAR_TABLE = {
  "graphite": {
    "D2":      { rough: 1.0,  semi: 0.6,  finish: 0.4 },
    "H13":     { rough: 0.8,  semi: 0.5,  finish: 0.3 },
    "A2":      { rough: 1.0,  semi: 0.6,  finish: 0.4 },
    "S7":      { rough: 0.7,  semi: 0.4,  finish: 0.3 },
    "carbide": { rough: 999,  semi: 999,  finish: 999 }
  },
  "copper": {
    "D2":      { rough: 0.5,  semi: 0.3,  finish: 0.15 },
    "H13":     { rough: 0.4,  semi: 0.25, finish: 0.12 },
    "A2":      { rough: 0.45, semi: 0.28, finish: 0.14 },
    "S7":      { rough: 0.35, semi: 0.2,  finish: 0.1  },
    "carbide": { rough: 0.8,  semi: 0.5,  finish: 0.3  }
  },
  "copper-tungsten": {
    "D2":      { rough: 0.2,  semi: 0.1,  finish: 0.05 },
    "H13":     { rough: 0.18, semi: 0.09, finish: 0.04 },
    "A2":      { rough: 0.2,  semi: 0.1,  finish: 0.05 },
    "S7":      { rough: 0.15, semi: 0.08, finish: 0.04 },
    "carbide": { rough: 0.3,  semi: 0.15, finish: 0.08 }
  }
};

// Surface finish prediction: Ra (um) based on current (A) and on-time (us)
// EA12D achieves finer finishes than EA12S due to advanced gap control
var PRISM_SURFACE_TABLE = [
  { current: 120, onTime: 300, ra: 15.0 },
  { current: 80,  onTime: 200, ra: 10.0 },
  { current: 60,  onTime: 150, ra: 7.0 },
  { current: 40,  onTime: 100, ra: 4.0 },
  { current: 25,  onTime: 60,  ra: 2.2 },
  { current: 15,  onTime: 30,  ra: 1.0 },
  { current: 8,   onTime: 15,  ra: 0.5 },
  { current: 4,   onTime: 8,   ra: 0.25 },
  { current: 2,   onTime: 4,   ra: 0.15 }
];

// EDM conditions (extended for 120A capability)
var PRISM_CONDITION_MAP = {
  heavyRough: { mCode: 50, current: 120, onTime: 300, offTime: 20, voltage: 100 },
  rough:      { mCode: 51, current: 80,  onTime: 200, offTime: 25, voltage: 85 },
  medRough:   { mCode: 53, current: 60,  onTime: 150, offTime: 30, voltage: 75 },
  semi:       { mCode: 55, current: 40,  onTime: 100, offTime: 40, voltage: 65 },
  medFinish:  { mCode: 57, current: 25,  onTime: 60,  offTime: 50, voltage: 55 },
  finish:     { mCode: 60, current: 15,  onTime: 30,  offTime: 60, voltage: 45 },
  fine:       { mCode: 62, current: 8,   onTime: 15,  offTime: 80, voltage: 40 },
  superfine:  { mCode: 63, current: 4,   onTime: 8,   offTime: 100, voltage: 35 },
  mirror:     { mCode: 65, current: 2,   onTime: 4,   offTime: 150, voltage: 30 }
};

// Dual-head scheduling weights for PRISM optimizer
var PRISM_HEAD_SCHEDULE = {
  sequential: {
    head1: { stages: ["rough", "medRough"], priority: "speed" },
    head2: { stages: ["semi", "finish", "superfine"], priority: "quality" }
  },
  independent: {
    head1: { stages: ["all"], priority: "balanced" },
    head2: { stages: ["all"], priority: "balanced" }
  },
  synchronized: {
    head1: { stages: ["shared"], priority: "speed" },
    head2: { stages: ["shared"], priority: "speed" }
  }
};

// =====================================================================
// PRISM HELPER FUNCTIONS
// =====================================================================

function prismGetOverburn(material, condition) {
  var table = PRISM_OVERBURN_TABLE[material];
  if (!table) {
    warning("PRISM: Unknown material '" + material + "' - using D2 overburn table");
    table = PRISM_OVERBURN_TABLE["D2"];
  }
  return table[condition] || table["semi"];
}

function prismGetWearRatio(electrodeMat, workpieceMat, condition) {
  var electrodeTable = PRISM_WEAR_TABLE[electrodeMat];
  if (!electrodeTable) {
    warning("PRISM: Unknown electrode material '" + electrodeMat + "'");
    return 1.0;
  }
  var matTable = electrodeTable[workpieceMat];
  if (!matTable) {
    warning("PRISM: No wear data for " + electrodeMat + " on " + workpieceMat);
    return 1.0;
  }
  if (electrodeMat === "graphite" && workpieceMat === "carbide") {
    error("PRISM SAFETY: Graphite electrodes on carbide cause microcracking. " +
          "Use copper-tungsten instead.");
    return 999;
  }
  return matTable[condition] || 1.0;
}

function prismPredictFinish(current, onTime) {
  var table = PRISM_SURFACE_TABLE;
  for (var i = 0; i < table.length - 1; i++) {
    if (current >= table[i + 1].current && current <= table[i].current) {
      var ratio = (current - table[i + 1].current) / (table[i].current - table[i + 1].current);
      return table[i + 1].ra + ratio * (table[i].ra - table[i + 1].ra);
    }
  }
  if (current >= table[0].current) { return table[0].ra; }
  return table[table.length - 1].ra;
}

function prismSelectElectrode(workpieceMat, stage) {
  if (workpieceMat === "carbide") {
    return "copper-tungsten";
  }
  if (stage === "rough" || stage === "heavyRough") {
    return "graphite";
  } else if (stage === "semi") {
    return "copper";
  } else {
    return (workpieceMat === "D2" || workpieceMat === "A2") ? "copper-tungsten" : "copper";
  }
}

function prismConditionForFinish(targetRa) {
  if (targetRa >= 10.0) { return PRISM_CONDITION_MAP.heavyRough; }
  if (targetRa >= 7.0) { return PRISM_CONDITION_MAP.rough; }
  if (targetRa >= 4.0) { return PRISM_CONDITION_MAP.medRough; }
  if (targetRa >= 2.2) { return PRISM_CONDITION_MAP.semi; }
  if (targetRa >= 1.0) { return PRISM_CONDITION_MAP.medFinish; }
  if (targetRa >= 0.5) { return PRISM_CONDITION_MAP.finish; }
  if (targetRa >= 0.25) { return PRISM_CONDITION_MAP.fine; }
  if (targetRa >= 0.15) { return PRISM_CONDITION_MAP.superfine; }
  return PRISM_CONDITION_MAP.mirror;
}

/**
 * PRISM Dual-Head Optimizer: determines optimal mode and head assignments
 * based on number of cavities, depth, and target finish.
 */
function prismOptimizeDualHead(numCavities, totalDepth, targetRa) {
  if (numCavities >= 2) {
    // Multiple cavities: independent mode is fastest
    return {
      mode: "independent",
      head1Role: "all",
      head2Role: "all",
      reason: numCavities + " cavities detected - independent mode for 2x throughput"
    };
  } else if (totalDepth > 50) {
    // Deep single cavity: synchronized for faster removal
    return {
      mode: "synchronized",
      head1Role: "rough",
      head2Role: "rough",
      reason: "Deep cavity (" + totalDepth + "mm) - synchronized mode for faster MRR"
    };
  } else {
    // Standard: sequential pipeline
    return {
      mode: "sequential",
      head1Role: "rough",
      head2Role: "finish",
      reason: "Single cavity - sequential pipeline (H1 rough, H2 finish)"
    };
  }
}

/**
 * PRISM Cavity Balancer: distributes cavities across heads evenly.
 * Returns assignment array mapping cavity index to head number.
 */
function prismBalanceCavities(cavityDepths) {
  if (cavityDepths.length <= 1) {
    return [1]; // single cavity on head 1
  }
  // Sort by depth descending and alternate assignment (greedy balancing)
  var indexed = cavityDepths.map(function(d, i) { return { depth: d, idx: i }; });
  indexed.sort(function(a, b) { return b.depth - a.depth; });

  var assignment = new Array(cavityDepths.length);
  var head1Load = 0;
  var head2Load = 0;

  for (var i = 0; i < indexed.length; i++) {
    if (head1Load <= head2Load) {
      assignment[indexed[i].idx] = 1;
      head1Load += indexed[i].depth;
    } else {
      assignment[indexed[i].idx] = 2;
      head2Load += indexed[i].depth;
    }
  }
  return assignment;
}

/**
 * Select active head and output the appropriate M-code.
 */
function prismSelectHead(headNumber) {
  if (headNumber === activeHead) { return; }
  if (headNumber === 1) {
    writeBlock(mFormat.format(70)); // Head 1 select
  } else if (headNumber === 2) {
    writeBlock(mFormat.format(71)); // Head 2 select
  }
  activeHead = headNumber;
  writePrismComment("Active head: " + activeHead);
}

/**
 * Set dual-head operating mode.
 */
function prismSetHeadMode(mode) {
  if (mode === headMode) { return; }
  if (mode === "synchronized") {
    writeBlock(mFormat.format(72)); // Synchronized mode
  } else if (mode === "independent") {
    writeBlock(mFormat.format(73)); // Independent mode
  }
  // Sequential is default - no specific M-code needed
  headMode = mode;
  writePrismComment("Dual-head mode: " + headMode);
}

// =====================================================================
// COMMON FUNCTIONS
// =====================================================================

function writeBlock() {
  var text = "";
  if (getProperty("showSequenceNumbers")) {
    text = "N" + sequenceNumber + " ";
    sequenceNumber += getProperty("sequenceNumberIncrement");
  }
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== "") {
      if (text.length > 0 && text[text.length - 1] !== " ") {
        text += " ";
      }
      text += arguments[i];
    }
  }
  writeln(text);
}

function writeComment(text) {
  writeln("(" + String(text) + ")");
}

function writePrismComment(text) {
  writeln("(PRISM: " + String(text) + ")");
}

function formatCycleTime(minutes) {
  var hours = Math.floor(minutes / 60);
  var mins = Math.floor(minutes % 60);
  return hours > 0 ? hours + "h " + mins + "m" : mins + "m";
}

function onOpen() {
  sequenceNumber = getProperty("sequenceNumberStart");
  activeHead = 1;

  var workMat = getProperty("workpieceMaterial");
  var electrodeMat = getProperty("electrodeMaterial");
  var strategy = getProperty("electrodeStrategy");
  var dualMode = getProperty("dualHeadMode");

  // --- Program Header ---
  writeComment("==========================================================");
  writeComment("  MITSUBISHI EA12D DUAL-HEAD SINKER EDM - PRISM ENHANCED");
  writeComment("  Controller: C30EA-2");
  writeComment("  Post Processor: PRISM v1.0");
  writeComment("==========================================================");
  writeComment("");
  writeComment("MACHINE LIMITS:");
  writeComment("  X: 0 - 300mm | Y: 0 - 250mm | Z: 0 - 250mm (per head)");
  writeComment("  Heads: 2 independent | Max current: 120A per head");
  writeComment("  C-axis: Yes | Electrode changer: 24 stations");
  writeComment("  Tank: 900 x 600 x 350mm | Max workpiece: 1000kg");
  writeComment("");

  // EA12D advantage summary
  writeComment("EA12D ADVANTAGES OVER EA12S:");
  writeComment("  +50% current capacity (120A vs 80A) = faster roughing");
  writeComment("  +25% finer finish (Ra 0.15 vs Ra 0.2) = better quality");
  writeComment("  2x heads = up to 2x throughput in independent mode");
  writeComment("  C-axis = electrode rotation for complex geometry");
  writeComment("  24 ATC stations (vs 16) = more electrode variety");
  writeComment("  Real-time adaptive gap control = stable burning");
  writeComment("");

  // Dual-head mode info
  writeComment("DUAL-HEAD CONFIGURATION:");
  if (dualMode === "auto") {
    writeComment("  Mode: PRISM auto-optimize (will select per operation)");
  } else {
    writeComment("  Mode: " + dualMode);
  }
  if (dualMode === "sequential" || dualMode === "auto") {
    writeComment("  Head 1: Roughing stages (high current, fast MRR)");
    writeComment("  Head 2: Finishing stages (low current, fine Ra)");
    writeComment("  Pipeline: H1 roughs cavity N while H2 finishes cavity N-1");
  } else if (dualMode === "independent") {
    writeComment("  Head 1: Cavity A (all stages)");
    writeComment("  Head 2: Cavity B (all stages)");
    writeComment("  Both heads work simultaneously on different cavities");
  } else if (dualMode === "synchronized") {
    writeComment("  Both heads burn same cavity from opposite positions");
    writeComment("  2x material removal rate on large/deep cavities");
  }
  writeComment("");

  // PRISM electrode recommendations
  writeComment("PRISM ELECTRODE RECOMMENDATIONS:");
  writeComment("  Workpiece material: " + workMat);
  if (strategy === "auto" || strategy === "rough-semi-finish") {
    var roughElectrode = prismSelectElectrode(workMat, "rough");
    var semiElectrode = prismSelectElectrode(workMat, "semi");
    var finishElectrode = prismSelectElectrode(workMat, "finish");
    var roughWear = prismGetWearRatio(roughElectrode, workMat, "rough");
    var semiWear = prismGetWearRatio(semiElectrode, workMat, "semi");
    var finishWear = prismGetWearRatio(finishElectrode, workMat, "finish");

    writeComment("  Rough:  " + roughElectrode + " (wear ratio " + roughWear + ":1)");
    writeComment("  Semi:   " + semiElectrode + " (wear ratio " + semiWear + ":1)");
    writeComment("  Finish: " + finishElectrode + " (wear ratio " + finishWear + ":1)");
  }
  writeComment("");

  // Surface finish
  var targetRa = getProperty("targetSurfaceFinish");
  if (getProperty("enableFinishPrediction")) {
    var cond = prismConditionForFinish(targetRa);
    var predictedRa = prismPredictFinish(cond.current, cond.onTime);
    writeComment("PRISM SURFACE FINISH:");
    writeComment("  Target: Ra " + xyzFormat.format(targetRa) + " um");
    writeComment("  Predicted: Ra " + xyzFormat.format(predictedRa) + " um");
    writeComment("  Final condition: " + cond.current + "A / " + cond.onTime + "us on / " + cond.offTime + "us off");
    if (targetRa <= 0.15) {
      writeComment("  NOTE: Ra 0.15 um requires mirror-polish conditions (2A, 4us)");
    }
    writeComment("");
  }

  // Overburn
  if (getProperty("enableOverburnCompensation")) {
    var overburnRough = prismGetOverburn(workMat, "rough");
    var overburnFinish = prismGetOverburn(workMat, "finish");
    writeComment("PRISM OVERBURN COMPENSATION:");
    writeComment("  Rough gap:  " + xyzFormat.format(overburnRough) + " mm per side");
    writeComment("  Finish gap: " + xyzFormat.format(overburnFinish) + " mm per side");
    writeComment("");
  }

  // Adaptive gap control
  if (getProperty("enableAdaptiveGap")) {
    writeComment("ADAPTIVE GAP CONTROL: ENABLED");
    writeComment("  C30EA-2 real-time gap voltage monitoring active");
    writeComment("  Auto-adjusts servo feed to maintain stable arc gap");
    writeComment("  Reduces wire breaks and surface damage from arcing");
    writeComment("");
  }

  writeComment("==========================================================");
  writeComment("");

  // Safe start blocks
  writeBlock(gFormat.format(90)); // absolute mode
  writeBlock(gFormat.format(21)); // metric
  writeBlock(gFormat.format(92), xOutput.format(0), yOutput.format(0), zOutput.format(0)); // reference

  // Initialize head 1
  writeBlock(mFormat.format(70)); // select head 1
  activeHead = 1;

  // Set initial dual-head mode
  if (dualMode !== "auto") {
    prismSetHeadMode(dualMode);
  }
}

function onSection() {
  var workMat = getProperty("workpieceMaterial");
  var strategy = getProperty("electrodeStrategy");
  var dualMode = getProperty("dualHeadMode");
  var tool = currentSection.getTool();
  var toolNumber = tool.number;

  writeComment("----------------------------------------------------------");
  writeComment("  Operation: " + currentSection.getParameter("operation-comment", "EDM Burn"));
  writeComment("  Tool (Electrode): T" + toolNumber + " - " + tool.comment);
  writeComment("----------------------------------------------------------");

  // Determine burn stage
  var stage = "rough";
  var opComment = currentSection.getParameter("operation-comment", "").toLowerCase();
  if (opComment.indexOf("finish") >= 0 || opComment.indexOf("fine") >= 0) {
    stage = "finish";
  } else if (opComment.indexOf("semi") >= 0 || opComment.indexOf("medium") >= 0) {
    stage = "semi";
  } else if (opComment.indexOf("heavy") >= 0) {
    stage = "heavyRough";
  }

  // PRISM dual-head assignment
  var targetHead = 1;
  if (dualMode === "auto") {
    var optimization = prismOptimizeDualHead(1, 50, getProperty("targetSurfaceFinish"));
    prismSetHeadMode(optimization.mode);
    writePrismComment(optimization.reason);

    if (optimization.mode === "sequential") {
      targetHead = (stage === "rough" || stage === "heavyRough" || stage === "medRough") ? 1 : 2;
    }
  } else if (dualMode === "sequential") {
    targetHead = (stage === "rough" || stage === "heavyRough" || stage === "medRough") ? 1 : 2;
  } else if (dualMode === "independent") {
    // Alternate heads based on section index
    targetHead = (getNumberOfSections() > 1 && currentSection.getId() % 2 === 1) ? 2 : 1;
  }

  prismSelectHead(targetHead);

  // PRISM electrode selection
  var electrodeMat = getProperty("electrodeMaterial");
  if (electrodeMat === "auto") {
    electrodeMat = prismSelectElectrode(workMat, stage);
    writePrismComment("Auto-selected electrode: " + electrodeMat + " for " + stage + " on " + workMat);
  }

  var wearRatio = prismGetWearRatio(electrodeMat, workMat, stage);
  var overburn = prismGetOverburn(workMat, stage);
  writePrismComment("Head " + activeHead + " | Wear ratio: " + wearRatio + ":1 | Overburn: " + xyzFormat.format(overburn) + "mm");

  // Wear compensation
  if (getProperty("enableWearCompensation")) {
    var method = getProperty("wearCompensationMethod");
    writePrismComment("Wear compensation: " + method);
    if (method === "adaptive") {
      writePrismComment("C30EA-2 real-time adaptive gap control active on head " + activeHead);
    }
  }

  // Electrode change
  writeBlock(mFormat.format(6), tFormat.format(toolNumber));

  // C-axis orientation
  if (getProperty("enableCAxis")) {
    var cAngle = getProperty("cAxisOrientAngle");
    if (cAngle !== 0) {
      writeBlock(cOutput.format(cAngle));
      writePrismComment("C-axis oriented to " + angleFormat.format(cAngle) + " deg");
    }
  }

  // Safe Z retract
  writeBlock(gFormat.format(90));
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));

  // Position XY
  var initialPosition = currentSection.getInitialPosition();
  writeBlock(gFormat.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));

  // Select EDM condition
  var condition;
  if (stage === "heavyRough") {
    condition = PRISM_CONDITION_MAP.heavyRough;
  } else if (stage === "rough") {
    condition = PRISM_CONDITION_MAP.rough;
  } else if (stage === "semi") {
    condition = PRISM_CONDITION_MAP.semi;
  } else {
    condition = prismConditionForFinish(getProperty("targetSurfaceFinish"));
  }

  writeBlock(mFormat.format(condition.mCode));
  writePrismComment("Condition: " + condition.current + "A, " +
    condition.onTime + "us on, " + condition.offTime + "us off, " +
    condition.voltage + "V gap");

  // Adaptive gap control
  if (getProperty("enableAdaptiveGap")) {
    var gapV = getProperty("gapVoltageTarget");
    if (gapV > 0) {
      writePrismComment("Target gap voltage: " + gapV + "V (adaptive tracking)");
    } else {
      writePrismComment("Gap voltage: auto-tracking from condition table (" + condition.voltage + "V nominal)");
    }
  }

  // Flushing ON
  writeBlock(mFormat.format(7));

  // EDM power ON
  writeBlock(mFormat.format(17));

  // Remote monitoring status
  if (getProperty("enableRemoteMonitoring")) {
    writePrismComment("REMOTE: Head " + activeHead + " burning, stage=" + stage +
      ", electrode=T" + toolNumber + ", condition=M" + condition.mCode);
  }
}

function onLinear(x, y, z, feed) {
  var maxDepth = getProperty("maxBurnDepth");
  if (z < -maxDepth) {
    warning("PRISM SAFETY: Z depth " + xyzFormat.format(z) + " exceeds max burn depth of " +
            xyzFormat.format(maxDepth) + "mm on head " + activeHead);
  }

  writeBlock(
    gMotionModal.format(1),
    xOutput.format(x),
    yOutput.format(y),
    zOutput.format(z),
    feedOutput.format(feed)
  );
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  var gCode = clockwise ? 2 : 3;
  writeBlock(
    gMotionModal.format(gCode),
    xOutput.format(x),
    yOutput.format(y),
    zOutput.format(z),
    "I" + xyzFormat.format(cx - getCurrentPosition().x),
    "J" + xyzFormat.format(cy - getCurrentPosition().y),
    feedOutput.format(feed)
  );
}

function onCycle() {
  // EDM pecking cycles
}

function onCyclePoint(x, y, z) {
  var depth = Math.abs(z);
  var jumpH = getProperty("jumpHeight");

  var opComment = currentSection.getParameter("operation-comment", "").toLowerCase();
  if (opComment.indexOf("peck") >= 0 || opComment.indexOf("deep") >= 0) {
    // G83 deep peck EDM cycle (more precise than G73)
    writeBlock(
      gFormat.format(83),
      xOutput.format(x),
      yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(jumpH),
      "Q" + xyzFormat.format(jumpH * 2)
    );
    writePrismComment("Deep peck: depth=" + xyzFormat.format(depth) + "mm, retract=" +
      xyzFormat.format(jumpH) + "mm, head " + activeHead);
  } else if (opComment.indexOf("peck") >= 0) {
    // G73 standard peck
    writeBlock(
      gFormat.format(73),
      xOutput.format(x),
      yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(jumpH),
      "Q" + xyzFormat.format(jumpH * 2)
    );
    writePrismComment("Peck cycle: depth=" + xyzFormat.format(depth) + "mm, head " + activeHead);
  } else {
    writeBlock(gFormat.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z));
  }
}

function onCycleEnd() {
  writeBlock(gFormat.format(80));
}

function onSectionEnd() {
  // EDM power OFF
  writeBlock(mFormat.format(18));

  // Flushing OFF
  writeBlock(mFormat.format(9));

  // Retract
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));

  // Wear tracking
  if (getProperty("enableWearCompensation")) {
    writePrismComment("Head " + activeHead + " section complete - update wear log");
  }

  // Remote monitoring
  if (getProperty("enableRemoteMonitoring")) {
    writePrismComment("REMOTE: Head " + activeHead + " section complete");
  }

  writeComment("");
}

function onClose() {
  // Final retract both heads
  prismSelectHead(1);
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));
  prismSelectHead(2);
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));

  // Return to reference
  prismSelectHead(1);
  writeBlock(gFormat.format(92), xOutput.format(0), yOutput.format(0), zOutput.format(0));

  writeComment("");
  writeComment("==========================================================");
  writeComment("  PRISM POST-BURN SUMMARY (EA12D DUAL-HEAD)");
  writeComment("==========================================================");

  var workMat = getProperty("workpieceMaterial");
  var targetRa = getProperty("targetSurfaceFinish");
  var dualMode = getProperty("dualHeadMode");

  writeComment("  Material: " + workMat);
  writeComment("  Target finish: Ra " + xyzFormat.format(targetRa) + " um");
  writeComment("  Best achievable: Ra 0.150 um (EA12D limit)");
  writeComment("  Dual-head mode: " + (dualMode === "auto" ? "PRISM auto-optimized" : dualMode));

  if (targetRa < 0.15) {
    writeComment("  WARNING: Target Ra " + xyzFormat.format(targetRa) +
      " is below EA12D capability (Ra 0.15)");
    writeComment("  Consider: polishing or lapping as secondary operation");
  }

  writeComment("");
  writeComment("PRISM DUAL-HEAD UTILIZATION:");
  writeComment("  Head 1: roughing stages completed");
  writeComment("  Head 2: finishing stages completed");
  writeComment("  Verify both heads returned to safe Z");
  writeComment("");
  writeComment("PRISM ELECTRODE CHANGE LOG:");
  writeComment("  Verify electrode wear on BOTH heads after burn session");
  writeComment("  Replace electrode if wear exceeds predicted ratio by >20%");
  writeComment("  24-station ATC: verify magazine inventory before next job");
  writeComment("");
  writeComment("PRISM QUALITY CHECKS:");
  writeComment("  1. Measure cavity depth vs programmed (per head)");
  writeComment("  2. Check surface finish with profilometer");
  writeComment("  3. Verify overburn gap matches compensation table");
  writeComment("  4. Inspect for recast layer thickness");
  writeComment("  5. Compare Head 1 vs Head 2 cavity consistency");
  writeComment("  6. Review adaptive gap control log for anomalies");
  writeComment("  7. Check C-axis orientation accuracy");
  writeComment("==========================================================");

  // Remote monitoring final status
  if (getProperty("enableRemoteMonitoring")) {
    writePrismComment("REMOTE: Program complete - all heads safe - ready for unload");
  }

  // Program end
  writeBlock(mFormat.format(2));
}
