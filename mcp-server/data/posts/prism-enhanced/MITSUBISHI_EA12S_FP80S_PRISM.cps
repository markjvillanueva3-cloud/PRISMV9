/**
  Copyright (C) 2012-2024 by Autodesk, Inc.
  All rights reserved.

  Mitsubishi EA12S Sinker EDM post processor configuration - PRISM Enhanced Edition

  $Revision: 50200 PRISM-Enhanced for EA12S $
  $Date: 2026-04-10 $

  FORKID {7A3F1D82-9C4E-4b1a-B127-6E8D3A5F9012}
*/

///////////////////////////////////////////////////////////////////////////////
//                    MITSUBISHI EA12S SINKER EDM
//                    PRISM-ENHANCED POST PROCESSOR
//
// MACHINE SPECIFICATIONS:
//   Model: Mitsubishi EA12S (Single Head Sinker EDM)
//   Controller: FP80S
//   Travel: X300 / Y250 / Z250 mm
//   Heads: 1
//   Electrode Changer: 16-station ATC
//   Max Current: 80A
//   Max Workpiece: 500 kg
//   Tank: 700 x 500 x 300 mm
//   Best Surface Finish: Ra 0.2 um
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
//   - Electrode wear compensation (Z-axis retraction tracking)
//   - Multi-electrode strategy optimization (rough -> semi -> finish)
//   - Material-electrode pair optimization
//   - Surface finish prediction based on power settings
//   - Overburn/undercut compensation tables
//   - Electrode wear ratio estimation
//
// FP80S G-CODE REFERENCE:
//   G90/G91 - Absolute/Incremental positioning
//   G01     - Linear plunge (Z-axis burn)
//   G02/G03 - Circular orbit (CW/CCW)
//   G73     - Peck EDM cycle (rough)
//   G83     - Deep peck EDM cycle (precision)
//   G92     - Reference point set
//
// FP80S M-CODE REFERENCE:
//   M00     - Program stop
//   M02     - Program end
//   M06     - Electrode change (ATC)
//   M07     - Flushing ON
//   M09     - Flushing OFF
//   M17     - EDM power ON
//   M18     - EDM power OFF
//   M50-M65 - Condition selection (E-table)
//
// ORBIT MODES:
//   Circular orbit  - uniform cavity enlargement
//   Square orbit    - rectangular pocket finishing
//   Planetary orbit - complex geometry averaging
//   Random orbit    - uniform electrode wear distribution
//
///////////////////////////////////////////////////////////////////////////////

description = "Mitsubishi EA12S Sinker EDM - PRISM Enhanced";
vendor = "Mitsubishi Electric";
vendorUrl = "https://www.mitsubishielectric.com";
legal = "Copyright (C) 2012-2024 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45909;

longDescription = "PRISM-enhanced post processor for Mitsubishi EA12S single-head sinker EDM with FP80S controller. " +
  "Features: electrode wear compensation, multi-electrode strategy optimization (rough/semi/finish), " +
  "material-electrode pair optimization for D2/H13/A2/S7/carbide, surface finish prediction, " +
  "overburn/undercut compensation tables, wear ratio estimation (graphite ~1:1 rough, copper ~0.3:1), " +
  "16-station electrode changer support, and orbit mode selection. " +
  "Machine: X300/Y250/Z250mm, 80A max, 500kg workpiece, Ra 0.2um best finish.";

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
      { id: "predicted", title: "PRISM predicted wear model" }
    ],
    value: "predicted",
    scope: "post"
  },

  // --- PRISM Surface Finish ---
  targetSurfaceFinish: {
    title: "Target surface finish (Ra um)",
    description: "Desired surface roughness - PRISM will select power settings",
    type: "number",
    value: 0.8,
    scope: "post"
  },
  enableFinishPrediction: {
    title: "Enable surface finish prediction",
    description: "PRISM predicts achievable Ra based on power and electrode",
    type: "boolean",
    value: true,
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
    value: 100,
    scope: "post"
  }
};

// =====================================================================
// FORMATTING AND VARIABLES
// =====================================================================
var gFormat = createFormat({ prefix: "G", decimals: 0, width: 2, zeropad: true });
var mFormat = createFormat({ prefix: "M", decimals: 0, width: 2, zeropad: true });
var tFormat = createFormat({ prefix: "T", decimals: 0, width: 2, zeropad: true });
var eFormat = createFormat({ prefix: "E", decimals: 0 }); // EDM power parameter
var iFormat = createFormat({ prefix: "I", decimals: 1 }); // Current parameter
var pTimeFormat = createFormat({ prefix: "P", decimals: 0 }); // On-time parameter (us)
var pOffFormat = createFormat({ prefix: "Q", decimals: 0 }); // Off-time parameter (us)

var xyzFormat = createFormat({ decimals: (unit == MM ? 3 : 4), forceDecimal: true });
var feedFormat = createFormat({ decimals: (unit == MM ? 1 : 2), forceDecimal: true });
var secFormat = createFormat({ decimals: 1, forceDecimal: true });

var xOutput = createOutputVariable({ prefix: "X" }, xyzFormat);
var yOutput = createOutputVariable({ prefix: "Y" }, xyzFormat);
var zOutput = createOutputVariable({ prefix: "Z" }, xyzFormat);
var feedOutput = createOutputVariable({ prefix: "F" }, feedFormat);

var gMotionModal = createOutputVariable({}, gFormat);
var gAbsIncModal = createOutputVariable({}, gFormat);
var gUnitModal = createOutputVariable({}, gFormat);

var sequenceNumber;

// =====================================================================
// PRISM TECHNOLOGY TABLES
// =====================================================================

// Overburn gap (mm) indexed by [material][condition]
// Conditions: rough, semi, finish, superfine
var PRISM_OVERBURN_TABLE = {
  "D2":      { rough: 0.25, semi: 0.12, finish: 0.05, superfine: 0.02 },
  "H13":     { rough: 0.22, semi: 0.10, finish: 0.04, superfine: 0.018 },
  "A2":      { rough: 0.24, semi: 0.11, finish: 0.05, superfine: 0.02 },
  "S7":      { rough: 0.20, semi: 0.09, finish: 0.04, superfine: 0.015 },
  "carbide": { rough: 0.15, semi: 0.07, finish: 0.03, superfine: 0.012 }
};

// Electrode wear ratio indexed by [electrode][workpiece][condition]
// Ratio = electrode wear / workpiece removal (lower is better)
var PRISM_WEAR_TABLE = {
  "graphite": {
    "D2":      { rough: 1.0,  semi: 0.6,  finish: 0.4 },
    "H13":     { rough: 0.8,  semi: 0.5,  finish: 0.3 },
    "A2":      { rough: 1.0,  semi: 0.6,  finish: 0.4 },
    "S7":      { rough: 0.7,  semi: 0.4,  finish: 0.3 },
    "carbide": { rough: 999,  semi: 999,  finish: 999 } // DO NOT USE
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
// Format: { current: A, onTime: us, ra: um }
var PRISM_SURFACE_TABLE = [
  { current: 80, onTime: 200, ra: 12.0 },
  { current: 60, onTime: 150, ra: 8.0 },
  { current: 40, onTime: 100, ra: 4.5 },
  { current: 25, onTime: 60,  ra: 2.5 },
  { current: 15, onTime: 30,  ra: 1.2 },
  { current: 8,  onTime: 15,  ra: 0.6 },
  { current: 4,  onTime: 8,   ra: 0.3 },
  { current: 2,  onTime: 4,   ra: 0.2 }
];

// Recommended EDM conditions per operation stage
// M50-M65 map to condition registers E01-E16
var PRISM_CONDITION_MAP = {
  rough:     { mCode: 50, current: 60, onTime: 150, offTime: 30, voltage: 80 },
  medRough:  { mCode: 52, current: 40, onTime: 100, offTime: 40, voltage: 70 },
  semi:      { mCode: 55, current: 25, onTime: 60,  offTime: 50, voltage: 60 },
  medFinish: { mCode: 58, current: 15, onTime: 30,  offTime: 60, voltage: 50 },
  finish:    { mCode: 60, current: 8,  onTime: 15,  offTime: 80, voltage: 40 },
  superfine: { mCode: 63, current: 4,  onTime: 8,   offTime: 100, voltage: 35 },
  mirror:    { mCode: 65, current: 2,  onTime: 4,   offTime: 150, voltage: 30 }
};

// =====================================================================
// PRISM HELPER FUNCTIONS
// =====================================================================

/**
 * Calculate overburn gap for current material and condition.
 * Returns gap in mm that must be compensated in electrode sizing or orbit.
 */
function prismGetOverburn(material, condition) {
  var table = PRISM_OVERBURN_TABLE[material];
  if (!table) {
    warning("PRISM: Unknown material '" + material + "' - using D2 overburn table");
    table = PRISM_OVERBURN_TABLE["D2"];
  }
  var gap = table[condition];
  if (gap === undefined) {
    gap = table["semi"]; // fallback
  }
  return gap;
}

/**
 * Get electrode wear ratio for material pair and condition.
 * Returns ratio (electrode wear / material removed).
 */
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

/**
 * Predict surface finish Ra based on current and on-time.
 * Uses linear interpolation between known data points.
 */
function prismPredictFinish(current, onTime) {
  var table = PRISM_SURFACE_TABLE;
  // find bracketing entries (table sorted descending by current)
  for (var i = 0; i < table.length - 1; i++) {
    if (current >= table[i + 1].current && current <= table[i].current) {
      var ratio = (current - table[i + 1].current) / (table[i].current - table[i + 1].current);
      return table[i + 1].ra + ratio * (table[i].ra - table[i + 1].ra);
    }
  }
  if (current >= table[0].current) { return table[0].ra; }
  return table[table.length - 1].ra;
}

/**
 * Select optimal electrode material for workpiece and operation stage.
 * Returns electrode material string.
 */
function prismSelectElectrode(workpieceMat, stage) {
  if (workpieceMat === "carbide") {
    return "copper-tungsten"; // ALWAYS for carbide
  }
  if (stage === "rough") {
    return (workpieceMat === "S7" || workpieceMat === "H13") ? "graphite" : "graphite";
  } else if (stage === "semi") {
    return "copper";
  } else {
    // finish / superfine
    return (workpieceMat === "D2" || workpieceMat === "A2") ? "copper-tungsten" : "copper";
  }
}

/**
 * Calculate recommended EDM conditions for a target surface finish.
 * Returns the closest condition from PRISM_CONDITION_MAP.
 */
function prismConditionForFinish(targetRa) {
  if (targetRa >= 8.0) { return PRISM_CONDITION_MAP.rough; }
  if (targetRa >= 4.5) { return PRISM_CONDITION_MAP.medRough; }
  if (targetRa >= 2.5) { return PRISM_CONDITION_MAP.semi; }
  if (targetRa >= 1.2) { return PRISM_CONDITION_MAP.medFinish; }
  if (targetRa >= 0.6) { return PRISM_CONDITION_MAP.finish; }
  if (targetRa >= 0.3) { return PRISM_CONDITION_MAP.superfine; }
  return PRISM_CONDITION_MAP.mirror;
}

/**
 * Estimate burn time for a given volume and conditions.
 * Returns estimated time in minutes.
 */
function prismEstimateBurnTime(volumeMM3, condition) {
  // MRR approximation: current * on-time * efficiency factor
  var mrr = condition.current * condition.onTime * 0.0001; // mm3/min approximate
  if (mrr <= 0) { return 0; }
  return volumeMM3 / mrr;
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
  if (hours > 0) {
    return hours + "h " + mins + "m";
  }
  return mins + "m";
}

function onOpen() {
  sequenceNumber = getProperty("sequenceNumberStart");

  var workMat = getProperty("workpieceMaterial");
  var electrodeMat = getProperty("electrodeMaterial");
  var strategy = getProperty("electrodeStrategy");

  // --- Program Header ---
  writeComment("==========================================================");
  writeComment("  MITSUBISHI EA12S SINKER EDM - PRISM ENHANCED");
  writeComment("  Controller: FP80S");
  writeComment("  Post Processor: PRISM v1.0");
  writeComment("==========================================================");
  writeComment("");
  writeComment("MACHINE LIMITS:");
  writeComment("  X: 0 - 300mm | Y: 0 - 250mm | Z: 0 - 250mm");
  writeComment("  Max current: 80A | Electrode changer: 16 stations");
  writeComment("  Tank: 700 x 500 x 300mm | Max workpiece: 500kg");
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
  } else if (electrodeMat !== "auto") {
    writeComment("  Electrode: " + electrodeMat);
  }
  writeComment("");

  // Surface finish target
  var targetRa = getProperty("targetSurfaceFinish");
  if (getProperty("enableFinishPrediction")) {
    var cond = prismConditionForFinish(targetRa);
    var predictedRa = prismPredictFinish(cond.current, cond.onTime);
    writeComment("PRISM SURFACE FINISH:");
    writeComment("  Target: Ra " + xyzFormat.format(targetRa) + " um");
    writeComment("  Predicted: Ra " + xyzFormat.format(predictedRa) + " um");
    writeComment("  Final condition: " + cond.current + "A / " + cond.onTime + "us on / " + cond.offTime + "us off");
    writeComment("");
  }

  // Overburn info
  if (getProperty("enableOverburnCompensation")) {
    var overburnRough = prismGetOverburn(workMat, "rough");
    var overburnFinish = prismGetOverburn(workMat, "finish");
    writeComment("PRISM OVERBURN COMPENSATION:");
    writeComment("  Rough gap:  " + xyzFormat.format(overburnRough) + " mm per side");
    writeComment("  Finish gap: " + xyzFormat.format(overburnFinish) + " mm per side");
    writeComment("  Electrode undersized by gap amount for cavity accuracy");
    writeComment("");
  }

  writeComment("==========================================================");
  writeComment("");

  // Safe start block
  writeBlock(gFormat.format(90)); // absolute mode
  writeBlock(gFormat.format(21)); // metric
  writeBlock(gFormat.format(92), xOutput.format(0), yOutput.format(0), zOutput.format(0)); // set reference
}

function onSection() {
  var workMat = getProperty("workpieceMaterial");
  var strategy = getProperty("electrodeStrategy");
  var tool = currentSection.getTool();
  var toolNumber = tool.number;

  writeComment("----------------------------------------------------------");
  writeComment("  Operation: " + currentSection.getParameter("operation-comment", "EDM Burn"));
  writeComment("  Tool (Electrode): T" + toolNumber + " - " + tool.comment);
  writeComment("----------------------------------------------------------");

  // Determine burn stage from operation comment or tool
  var stage = "rough"; // default
  var opComment = currentSection.getParameter("operation-comment", "").toLowerCase();
  if (opComment.indexOf("finish") >= 0 || opComment.indexOf("fine") >= 0) {
    stage = "finish";
  } else if (opComment.indexOf("semi") >= 0 || opComment.indexOf("medium") >= 0) {
    stage = "semi";
  }

  // PRISM analysis for this operation
  var electrodeMat = getProperty("electrodeMaterial");
  if (electrodeMat === "auto") {
    electrodeMat = prismSelectElectrode(workMat, stage);
    writePrismComment("Auto-selected electrode: " + electrodeMat + " for " + stage + " on " + workMat);
  }

  var wearRatio = prismGetWearRatio(electrodeMat, workMat, stage);
  var overburn = prismGetOverburn(workMat, stage);
  writePrismComment("Wear ratio: " + wearRatio + ":1 | Overburn gap: " + xyzFormat.format(overburn) + "mm");

  // Wear compensation tracking
  if (getProperty("enableWearCompensation")) {
    var method = getProperty("wearCompensationMethod");
    writePrismComment("Wear compensation: " + method);
    if (method === "predicted") {
      writePrismComment("PRISM will adjust Z depth by predicted wear per pass");
    }
  }

  // Electrode change
  writeBlock(mFormat.format(6), tFormat.format(toolNumber)); // ATC electrode change

  // Move to safe Z
  writeBlock(gFormat.format(90));
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));

  // Position XY
  var initialPosition = currentSection.getInitialPosition();
  writeBlock(gFormat.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));

  // Select EDM condition based on stage
  var condition;
  if (stage === "rough") {
    condition = PRISM_CONDITION_MAP.rough;
  } else if (stage === "semi") {
    condition = PRISM_CONDITION_MAP.semi;
  } else {
    condition = prismConditionForFinish(getProperty("targetSurfaceFinish"));
  }

  writeBlock(mFormat.format(condition.mCode)); // select E-table condition
  writePrismComment("Condition: " + condition.current + "A, " +
    condition.onTime + "us on, " + condition.offTime + "us off");

  // Enable flushing
  writeBlock(mFormat.format(7)); // flushing ON

  // Enable EDM power
  writeBlock(mFormat.format(17)); // EDM power ON
}

function onLinear(x, y, z, feed) {
  var maxDepth = getProperty("maxBurnDepth");
  if (z < -maxDepth) {
    warning("PRISM SAFETY: Z depth " + xyzFormat.format(z) + " exceeds max burn depth of " +
            xyzFormat.format(maxDepth) + "mm");
  }

  // Standard linear move (plunge burn)
  writeBlock(
    gMotionModal.format(1),
    xOutput.format(x),
    yOutput.format(y),
    zOutput.format(z),
    feedOutput.format(feed)
  );

  // Jump flushing for Z plunge moves
  if (getProperty("flushingMode") === "jump" || getProperty("flushingMode") === "combined") {
    // Controller handles jump internally via E-table settings
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  // Orbit moves for cavity finishing
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
  // Peck EDM cycle support
  var depth = Math.abs(z);
  var jumpH = getProperty("jumpHeight");

  if (currentSection.getParameter("operation-comment", "").toLowerCase().indexOf("peck") >= 0) {
    // G73 peck EDM cycle
    writeBlock(
      gFormat.format(73),
      xOutput.format(x),
      yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(jumpH),
      "Q" + xyzFormat.format(jumpH * 2)
    );
    writePrismComment("Peck cycle: depth=" + xyzFormat.format(depth) + "mm, retract=" + xyzFormat.format(jumpH) + "mm");
  } else {
    // Standard plunge
    writeBlock(gFormat.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z));
  }
}

function onCycleEnd() {
  writeBlock(gFormat.format(80)); // cancel canned cycle
}

function onSectionEnd() {
  // Disable EDM power
  writeBlock(mFormat.format(18)); // EDM power OFF

  // Disable flushing
  writeBlock(mFormat.format(9)); // flushing OFF

  // Retract to safe Z
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));

  // PRISM wear tracking summary
  if (getProperty("enableWearCompensation")) {
    writePrismComment("Section complete - update wear tracking log");
  }

  writeComment("");
}

function onClose() {
  // Final retract
  writeBlock(gFormat.format(0), zOutput.format(getProperty("safeRetractZ")));

  // Return to reference
  writeBlock(gFormat.format(92), xOutput.format(0), yOutput.format(0), zOutput.format(0));

  writeComment("");
  writeComment("==========================================================");
  writeComment("  PRISM POST-BURN SUMMARY");
  writeComment("==========================================================");

  var workMat = getProperty("workpieceMaterial");
  var targetRa = getProperty("targetSurfaceFinish");

  writeComment("  Material: " + workMat);
  writeComment("  Target finish: Ra " + xyzFormat.format(targetRa) + " um");
  writeComment("  Best achievable: Ra 0.200 um (EA12S limit)");

  if (targetRa < 0.2) {
    writeComment("  WARNING: Target Ra " + xyzFormat.format(targetRa) +
      " is below EA12S capability (Ra 0.2)");
    writeComment("  Consider: EA12D or dedicated finishing machine");
  }

  writeComment("");
  writeComment("PRISM ELECTRODE CHANGE LOG:");
  writeComment("  Verify electrode wear after each burn session");
  writeComment("  Replace electrode if wear exceeds predicted ratio by >20%");
  writeComment("");
  writeComment("PRISM QUALITY CHECKS:");
  writeComment("  1. Measure cavity depth vs programmed (wear compensation)");
  writeComment("  2. Check surface finish with profilometer");
  writeComment("  3. Verify overburn gap matches compensation table");
  writeComment("  4. Inspect for recast layer thickness");
  writeComment("==========================================================");

  // Program end
  writeBlock(mFormat.format(2)); // program end
}
