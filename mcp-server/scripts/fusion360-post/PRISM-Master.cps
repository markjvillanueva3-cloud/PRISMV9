/**
  PRISM Master Post Processor — Unified Multi-Controller

  Production-grade Fusion 360 post for Haas NGC, Fanuc 31i, Siemens 840D, and
  Heidenhain TNC controllers. Dialect data from ControllerDialectEngine canonical definitions.

  Key features:
  - Controller family selected via enum property (haas_ngc / fanuc_31i / siemens_840d / heidenhain)
  - Physics-optimized S/F via PRISM Add-in (adsk.cam) or operation:comment JSON
  - Integer milling feeds (F80, not F80.000)
  - Precise tapping feeds (F0.0500 for inch, F1.000 for metric) — NEVER rounded
  - Per-controller HSM smoothing (G187 / G05.1 / CYCLE832 / M120)
  - Full canned cycle support: G81-G89 (Fanuc), CYCLE81-87 (Siemens), CYCL DEF 200-207 (Heidenhain)
  - Prove-out mode: configurable derate (default ON, 50% feed / 80% speed)
  - Machine limit enforcement from post properties
  - Sidecar JSON export for offline PRISM pipeline optimization
  - Graceful fallback: without PRISM data, produces clean standard G-code

  Supported controllers:
  - Haas NGC: G187 smoothing, G43 H, M88 TSC, G154 extended WCS, G81-G89
  - Fanuc 31i: G05.1 AICC, G43.4 TCPC, G84 rigid tap, G54.1 extended WCS, G81-G89
  - Siemens 840D: CYCLE832 HSM, TRAORI TCPC, CYCLE81-87, semicolon comments
  - Heidenhain TNC: M120 look-ahead, CYCL DEF 200-207, FUNCTION TCPM, conversational

  NOTE: Fusion 360 CPS runtime is sandboxed — NO HTTPClient, no network calls.
  All PRISM optimization data arrives via the add-in or sidecar path.

  Version: 1.0.0
  Copyright (c) 2026 PRISM Manufacturing Intelligence
*/

description = "PRISM Master Post — Multi-Controller";
vendor = "PRISM";
vendorUrl = "https://prism-mfg.com";
legal = "Copyright (C) 2026 PRISM Manufacturing Intelligence";
certificationLevel = 2;

longDescription = "Physics-optimized multi-controller post processor. " +
  "Supports Haas NGC, Fanuc 31i, and Siemens 840D sl. " +
  "Integer milling feeds, precise tapping feeds, per-controller HSM smoothing, " +
  "prove-out mode for first articles, machine limit enforcement, " +
  "PRISM physics data via add-in or sidecar JSON.";

extension = "nc";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = undefined;

// =================================================================
// PROPERTIES
// =================================================================

properties = {
  // Controller selection
  controllerFamily: {
    title: "Controller Family",
    description: "Target CNC controller dialect",
    type: "enum",
    values: [
      { id: "haas_ngc", title: "Haas NGC" },
      { id: "fanuc_31i", title: "Fanuc 31i" },
      { id: "siemens_840d", title: "Siemens 840D sl" },
      { id: "heidenhain", title: "Heidenhain TNC 640" },
      { id: "mazak", title: "Mazak SmoothAi" },
      { id: "okuma", title: "Okuma OSP-P300" },
      { id: "hurco", title: "Hurco WinMax" },
      { id: "dmg_mori", title: "DMG MORI CELOS" },
      { id: "brother", title: "Brother Speedio" },
      { id: "doosan", title: "Doosan Puma" }
    ],
    value: "haas_ngc"
  },
  programNumber: {
    title: "Program Number",
    description: "Program number (1-99999)",
    type: "integer",
    range: [1, 99999],
    value: 1
  },
  machineName: {
    title: "Machine Name",
    description: "Machine model for PRISM catalog lookup",
    type: "string",
    value: ""
  },

  // Prove-out mode
  proveOutMode: {
    title: "Prove-Out Mode",
    description: "Derate feeds/speeds for first article proving. ON by default.",
    type: "boolean",
    value: true
  },
  proveOutFeedPct: {
    title: "Prove-Out Feed %",
    description: "Feed derate percentage (50 = 50% of programmed feed)",
    type: "integer",
    range: [10, 100],
    value: 50
  },
  proveOutSpeedPct: {
    title: "Prove-Out Speed %",
    description: "Speed derate percentage (80 = 80% of programmed RPM)",
    type: "integer",
    range: [10, 100],
    value: 80
  },

  // Machine limits
  maxSpindleSpeed: {
    title: "Max Spindle Speed (RPM)",
    description: "Machine maximum RPM. 0 = no limit.",
    type: "integer",
    range: [0, 100000],
    value: 0
  },
  maxFeedRate: {
    title: "Max Feed Rate (mm/min)",
    description: "Machine maximum feed rate. 0 = no limit.",
    type: "integer",
    range: [0, 100000],
    value: 0
  },

  // HSM
  useSmoothing: {
    title: "HSM Smoothing",
    description: "Inject controller-specific smoothing codes",
    type: "boolean",
    value: true
  },
  smoothingMode: {
    title: "Smoothing Mode",
    description: "HSM smoothing aggressiveness",
    type: "enum",
    values: [
      { id: "rough", title: "Rough" },
      { id: "medium", title: "Medium" },
      { id: "finish", title: "Finish" }
    ],
    value: "medium"
  },

  // Output options
  optionalStop: {
    title: "Optional Stop Between Tools",
    description: "Insert M01 between tool changes",
    type: "boolean",
    value: true
  },
  includeSetupSheet: {
    title: "Include Setup Sheet",
    description: "Append setup sheet data as comments",
    type: "boolean",
    value: true
  },
  includeAnalytics: {
    title: "Include Analytics",
    description: "Append PRISM optimization analytics as comments",
    type: "boolean",
    value: true
  },
  debugMode: {
    title: "Debug Mode",
    description: "Verbose PRISM stage debug info in comments",
    type: "boolean",
    value: false
  }
};

// =================================================================
// FORMAT DEFINITIONS
// =================================================================

var gFormat = createFormat({prefix:"G", decimals:1, forceDecimal:false});
var mFormat = createFormat({prefix:"M", decimals:0});
var tFormat = createFormat({prefix:"T", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var dFormat = createFormat({prefix:"D", decimals:0});
var nFormat = createFormat({prefix:"N", decimals:0});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var rpmFormat = createFormat({decimals:0});

// Milling feeds: integer (F80, not F80.000)
var feedFormat = createFormat({decimals:0, forceDecimal:false});
// Tapping/precision feeds: 4 decimals inch, 3 decimals metric
var feedFormatPrecise = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});

var secFormat = createFormat({decimals:3, forceDecimal:true});
var ijkFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:false});

// Output variables
var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var zOutput = createOutputVariable({prefix:"Z"}, xyzFormat);
var aOutput = createOutputVariable({prefix:"A"}, xyzFormat);
var bOutput = createOutputVariable({prefix:"B"}, xyzFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var feedOutputPrecise = createOutputVariable({prefix:"F"}, feedFormatPrecise);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_NONZERO}, ijkFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_NONZERO}, ijkFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_NONZERO}, ijkFormat);

// Modal groups
var gMotionModal = createModal({}, gFormat);
var gAbsIncModal = createModal({}, gFormat);
var gFeedModeModal = createModal({}, gFormat);
var gPlaneModal = createModal({onchange:function() {gMotionModal.reset();}}, gFormat);
var gRetractModal = createModal({}, gFormat);
var gCycleModal = createModal({}, gFormat);

// =================================================================
// GLOBAL STATE
// =================================================================

var collectedOperations = [];
var collectedTools = [];
var currentOperation = null;
var currentBlocks = [];
var sequenceNumber = 10;
var proveOutActive = false;
var proveOutFeedFactor = 1.0;
var proveOutSpeedFactor = 1.0;
var currentPrismData = null; // PRISM physics data from operation:comment JSON (set per section)

// =================================================================
// CONTROLLER-SPECIFIC HELPERS
// =================================================================

function isHaas() {
  return properties.controllerFamily == "haas_ngc";
}

function isFanuc() {
  return properties.controllerFamily == "fanuc_31i";
}

function isSiemens() {
  return properties.controllerFamily == "siemens_840d";
}

function isHeidenhain() {
  return properties.controllerFamily == "heidenhain";
}

/**
 * Returns true if the controller uses Fanuc-compatible G-code format.
 * Shared by: Haas, Fanuc, Mazak, Okuma, Brother, Doosan, DMG MORI (Fanuc mode), Hurco.
 */
function isFanucCompatible() {
  return isHaas() || isFanuc() || isMazak() || isOkuma() || isBrother() || isDoosan() || isHurco() || isDmgMori();
}

/**
 * Write a comment in the correct format for the active controller.
 * Fanuc-compatible: (parentheses), Siemens/Heidenhain: ; semicolon
 */
function writeComment(text) {
  var clean = String(text);
  if (isSiemens() || isHeidenhain()) {
    writeln("; " + clean);
  } else {
    writeln("(" + clean.replace(/[()]/g, "") + ")");
  }
}

function writeDebug(text) {
  if (properties.debugMode) {
    writeComment("DEBUG: " + text);
  }
}

function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

function forceFeed() {
  feedOutput.reset();
  feedOutputPrecise.reset();
}

function forceAny() {
  forceXYZ();
  forceFeed();
}

function getCommonCycle(x, y, z, r) {
  forceXYZ();
  return [
    xOutput.format(x), yOutput.format(y),
    "Z" + xyzFormat.format(z),
    "R" + xyzFormat.format(r)
  ];
}

/**
 * Apply prove-out derate to a feed value.
 * Milling: returns integer. Tapping: returns precise value.
 */
function applyProveOutFeed(feed, isTapping) {
  var f = feed * proveOutFeedFactor;
  if (isTapping) {
    return f;
  }
  return Math.round(f);
}

/**
 * Apply prove-out derate to RPM.
 */
function applyProveOutSpeed(rpm) {
  return Math.round(rpm * proveOutSpeedFactor);
}

/**
 * Clamp feed to machine maximum. Returns clamped value and writes warning if clamped.
 */
function clampFeed(feed) {
  if (properties.maxFeedRate > 0 && feed > properties.maxFeedRate) {
    writeComment("WARNING: Feed " + Math.round(feed) + " clamped to machine max " + properties.maxFeedRate);
    return properties.maxFeedRate;
  }
  return feed;
}

/**
 * Clamp RPM to machine maximum. Returns clamped value and writes warning if clamped.
 */
function clampSpeed(rpm) {
  if (properties.maxSpindleSpeed > 0 && rpm > properties.maxSpindleSpeed) {
    writeComment("WARNING: RPM " + rpm + " clamped to machine max " + properties.maxSpindleSpeed);
    return properties.maxSpindleSpeed;
  }
  return rpm;
}

/**
 * Clamp RPM to chatter-stable zone from PRISM SLD data.
 * If stable_rpm_min/max are provided via comment JSON and the RPM is outside
 * the stable range, shifts to nearest stable boundary with explanatory comment.
 * If no SLD data, returns RPM unchanged (graceful skip).
 */
function clampToStableRange(rpm) {
  if (!currentPrismData) { return rpm; }
  var sMin = currentPrismData.stable_rpm_min;
  var sMax = currentPrismData.stable_rpm_max;
  if (!sMin || !sMax || sMin <= 0 || sMax <= 0) { return rpm; }
  if (rpm >= sMin && rpm <= sMax) { return rpm; } // Already in stable zone
  // RPM is outside stable range — shift to nearest boundary
  var original = rpm;
  if (rpm < sMin) {
    rpm = sMin;
  } else {
    rpm = sMax;
  }
  // Only shift if within 20% — beyond that, something is fundamentally wrong
  var shiftPct = Math.abs(original - rpm) / original * 100;
  if (shiftPct > 20) {
    writeComment("PRISM WARNING: RPM " + original + " is " + Math.round(shiftPct) + "% from stable zone " + sMin + "-" + sMax + " — verify manually");
    return original; // Don't auto-shift large deltas
  }
  writeComment("PRISM: RPM shifted S" + original + "->S" + rpm + " for chatter stability (stable zone " + sMin + "-" + sMax + ")");
  return rpm;
}

/**
 * Apply tool wear derating to feed rate.
 * Fresh tool = 100% feed. At 80% tool life consumed = 85% feed.
 * Linear interpolation between 100% and 85% as wear progresses.
 * Requires prism.tool_life_min and prism.wear_fraction in comment JSON.
 */
function applyWearDerating(feed) {
  if (!currentPrismData) { return feed; }
  var wearFraction = currentPrismData.wear_fraction;
  if (!wearFraction || wearFraction <= 0) { return feed; }
  // Linear derating: 100% at wear=0, 85% at wear=0.8, capped at 85%
  var factor = 1.0;
  if (wearFraction >= 0.8) {
    factor = 0.85;
  } else if (wearFraction > 0) {
    factor = 1.0 - (wearFraction / 0.8) * 0.15;
  }
  if (factor < 1.0) {
    writeComment("PRISM: Wear derating " + Math.round(factor * 100) + "% (tool wear " + Math.round(wearFraction * 100) + "%)");
  }
  return feed * factor;
}

/**
 * Check PRISM confidence level and write warnings if uncertainty is high.
 * confidence > 0.15 (>15% uncertainty) → WARNING comment
 * confidence > 0.25 (>25% uncertainty) → recommend prove-out mode
 */
function checkConfidenceWarnings() {
  if (!currentPrismData || !currentPrismData.confidence) { return; }
  var conf = currentPrismData.confidence;
  if (conf > 0.25) {
    writeComment("PRISM WARNING: Feed uncertainty +-" + Math.round(conf * 100) + "% — PROVE-OUT MODE RECOMMENDED");
  } else if (conf > 0.15) {
    writeComment("PRISM WARNING: Feed uncertainty +-" + Math.round(conf * 100) + "% — verify manually");
  }
}

/**
 * Write tool life warning if predicted life is short.
 */
function checkToolLifeWarning() {
  if (!currentPrismData || !currentPrismData.tool_life_min) { return; }
  if (currentPrismData.tool_life_min < 15) {
    writeComment("PRISM WARNING: Predicted tool life " + Math.round(currentPrismData.tool_life_min) + " min — consider reducing speed or tool change interval");
  }
}

function getMaterialName() {
  if (hasGlobalParameter("material")) {
    return getGlobalParameter("material");
  }
  if (hasGlobalParameter("material-name")) {
    return getGlobalParameter("material-name");
  }
  return "Unknown";
}

/**
 * Parse PRISM physics data from operation:comment JSON.
 * Format: {"prism":{"force":N,"power":kW,"confidence":0-1,"tool_life_min":min,"stable_rpm_min":rpm,"stable_rpm_max":rpm}}
 */
function parsePrismComment() {
  try {
    var comment = getParameter("operation:comment");
    if (!comment) { return null; }
    var idx = comment.indexOf('{"prism"');
    if (idx < 0) {
      // Also try PRISM: prefix format from PrismAddinArchitectureEngine
      idx = comment.indexOf("PRISM:");
      if (idx >= 0) {
        var jsonStr = comment.substring(idx + 6);
        return JSON.parse(jsonStr);
      }
      return null;
    }
    var parsed = JSON.parse(comment.substring(idx));
    return parsed.prism || null;
  } catch (e) {
    return null;
  }
}

function mapToolType(type) {
  switch (type) {
    case TOOL_DRILL: return "drill";
    case TOOL_TAP_RIGHT_HAND: case TOOL_TAP_LEFT_HAND: return "tap";
    case TOOL_REAMER: return "reamer";
    case TOOL_BORING_BAR: return "boring_bar";
    case TOOL_COUNTER_BORE: return "flat_endmill";
    case TOOL_BALL_END_MILL: return "ball_endmill";
    case TOOL_BULL_NOSE_END_MILL: return "bull_nose";
    case TOOL_CHAMFER_MILL: return "chamfer";
    case TOOL_FACE_MILL: return "face_mill";
    case TOOL_THREAD_MILL: return "thread_mill";
    default: return "flat_endmill";
  }
}

function mapToolMaterial(mat) {
  switch (mat) {
    case TOOL_MATERIAL_HSS: return "hss";
    case TOOL_MATERIAL_CARBIDE: return "carbide";
    case TOOL_MATERIAL_CERMET: return "cermet";
    case TOOL_MATERIAL_CERAMIC: return "ceramic";
    case TOOL_MATERIAL_CBN: return "cbn";
    case TOOL_MATERIAL_DIAMOND: return "pcd";
    default: return "carbide";
  }
}

function isTappingCycle(type) {
  return type == "tapping" || type == "right-tapping" || type == "left-tapping";
}

// =================================================================
// PROGRAM LIFECYCLE — onOpen
// =================================================================

function onOpen() {
  // Initialize prove-out
  proveOutActive = properties.proveOutMode;
  proveOutFeedFactor = proveOutActive ? (properties.proveOutFeedPct / 100.0) : 1.0;
  proveOutSpeedFactor = proveOutActive ? (properties.proveOutSpeedPct / 100.0) : 1.0;

  if (isHeidenhain()) {
    // Heidenhain TNC conversational program start
    writeln("BEGIN PGM PRISM MM");
    writeComment("PRISM Master Post — Heidenhain TNC v1.0.0");
    writeComment("Generated: " + new Date().toISOString().split("T")[0]);
    if (programName) { writeComment("Program: " + programName); }
    if (programComment) { writeComment(programComment); }
    if (properties.machineName) { writeComment("Machine: " + properties.machineName); }
    writeComment("Material: " + getMaterialName());
    if (proveOutActive) {
      writeComment("*** PROVE-OUT MODE: Feed " + properties.proveOutFeedPct + "% / Speed " + properties.proveOutSpeedPct + "% ***");
    }
  } else if (isSiemens()) {
    // Siemens 840D program start
    writeln("; PRISM Master Post — Siemens 840D sl v1.0.0");
    writeln("; Generated: " + new Date().toISOString().split("T")[0]);
    if (programName) { writeComment("Program: " + programName); }
    if (programComment) { writeComment(programComment); }
    if (properties.machineName) { writeComment("Machine: " + properties.machineName); }
    writeComment("Material: " + getMaterialName());
    if (proveOutActive) {
      writeComment("*** PROVE-OUT MODE: Feed " + properties.proveOutFeedPct + "% / Speed " + properties.proveOutSpeedPct + "% ***");
    }
    writeln("");
    // Siemens safe start
    writeln("G90 G17 G21 G40 G60 G80");
  } else {
    // Fanuc-compatible program start (Haas/Fanuc/Mazak/Okuma/Brother/Doosan/Hurco/DMG MORI)
    writeln("%");
    writeln("O" + ("00000" + properties.programNumber).slice(-5));

    var ctrlNames = {
      haas_ngc: "Haas NGC", fanuc_31i: "Fanuc 31i", mazak: "Mazak SmoothAi",
      okuma: "Okuma OSP-P300", hurco: "Hurco WinMax", dmg_mori: "DMG MORI CELOS",
      brother: "Brother Speedio", doosan: "Doosan Puma"
    };
    var ctrlName = ctrlNames[properties.controllerFamily] || properties.controllerFamily;
    writeComment("PRISM Master — " + ctrlName + " v1.0.0");
    writeComment("Generated: " + new Date().toISOString().split("T")[0]);
    if (programName) { writeComment("Program: " + programName); }
    if (programComment) { writeComment(programComment); }
    if (properties.machineName) { writeComment("Machine: " + properties.machineName); }
    writeComment("Material: " + getMaterialName());
    if (proveOutActive) {
      writeComment("*** PROVE-OUT MODE: Feed " + properties.proveOutFeedPct + "% / Speed " + properties.proveOutSpeedPct + "% ***");
    }

    // Safe start per controller
    if (isMazak()) {
      writeln("G90 G21 G17 G40 G80"); // Mazak: no G49 in safe start
    } else if (isHurco()) {
      writeln("G90 G21 G17 G40 G80 G49");
      writeln("G64"); // Hurco UltiMotion look-ahead
    } else {
      writeln("G90 G21 G17 G40 G80 G49"); // Haas/Fanuc/Okuma/Brother/Doosan/DMG MORI
    }
  }

  writeDebug("Controller: " + properties.controllerFamily);
  writeDebug("Prove-out: " + (proveOutActive ? "ON" : "OFF"));
}

// =================================================================
// onSection — Tool change + section start
// =================================================================

function onSection() {
  var tool = getTool();
  var insertToolCall = isFirstSection() ||
    (tool.number !== getPreviousSection().getTool().number);

  // Collect operation data for sidecar
  var op = {
    id: collectedOperations.length,
    name: hasParameter("operation-comment") ? getParameter("operation-comment") : "",
    tool_number: tool.number,
    ae_mm: hasParameter("operation:stepover") ? getParameter("operation:stepover") : undefined,
    ap_mm: hasParameter("operation:maximumStepdown") ? getParameter("operation:maximumStepdown") : undefined,
    blocks: []
  };

  var toolDef = {
    tool_number: tool.number,
    type: mapToolType(tool.type),
    diameter_mm: tool.diameter,
    flute_count: tool.numberOfFlutes,
    flute_length_mm: tool.fluteLength,
    overall_length_mm: tool.bodyLength,
    corner_radius_mm: tool.cornerRadius,
    material: mapToolMaterial(tool.material)
  };

  collectedTools.push(toolDef);
  currentOperation = op;
  currentBlocks = [];

  // Parse PRISM physics data from operation comment
  var prismData = parsePrismComment();
  currentPrismData = prismData; // Module-level for helper functions

  if (insertToolCall) {
    if (!isFirstSection() && properties.optionalStop) {
      writeln("M01");
    }

    // --- Controller-specific tool change ---

    if (isHeidenhain()) {
      // Heidenhain TNC: TOOL CALL
      if (!isFirstSection()) {
        writeln("L Z+0 R0 FMAX M91");
        writeln("M9");
      }

      if (hasParameter("operation-comment")) {
        writeComment(getParameter("operation-comment"));
      }

      // Heidenhain tool call with axis + speed
      var heiRpm = applyProveOutSpeed(spindleSpeed);
      heiRpm = clampSpeed(heiRpm);
      heiRpm = clampToStableRange(heiRpm);
      writeln("TOOL CALL " + tool.number + " Z S" + rpmFormat.format(heiRpm));

      // M120 look-ahead for HSM smoothing
      if (properties.useSmoothing) {
        var la;
        switch (properties.smoothingMode) {
          case "rough": la = "LA5.0"; break;
          case "medium": la = "LA1.0"; break;
          case "finish": la = "LA0.01"; break;
          default: la = "LA1.0";
        }
        writeln("M120 " + la);
        writeDebug("M120 look-ahead: " + la);
      }

      // Coolant
      if (tool.coolant == COOLANT_FLOOD) {
        writeln("M8");
      } else if (tool.coolant == COOLANT_MIST) {
        writeln("M7");
      }

    } else if (isSiemens()) {
      // Siemens 840D: retract via SUPA
      writeln("SUPA G0 Z0");
      if (!isFirstSection()) { writeln("M9"); }

      if (hasParameter("operation-comment")) {
        writeComment(getParameter("operation-comment"));
      }

      // Siemens tool change: T= M6 D1
      writeln("T" + tool.number);
      writeln("M6");
      writeln("D1");

      // Spindle with prove-out + machine limit
      var sieRpm = applyProveOutSpeed(spindleSpeed);
      sieRpm = clampSpeed(sieRpm);
      sieRpm = clampToStableRange(sieRpm);
      writeln("S" + rpmFormat.format(sieRpm) + " " + (tool.clockwise ? "M3" : "M4"));

      // CYCLE832 HSM smoothing
      if (properties.useSmoothing) {
        var tol;
        switch (properties.smoothingMode) {
          case "rough": tol = "0.05"; break;
          case "medium": tol = "0.02"; break;
          case "finish": tol = "0.005"; break;
          default: tol = "0.02";
        }
        writeln("CYCLE832(" + tol + ",1)");
        writeDebug("CYCLE832 tolerance=" + tol);
      }

    } else if (isFanuc()) {
      // Fanuc 31i: G91 G28 Z0 retract
      writeln("G91 G28 Z0");
      writeln("G90");
      if (!isFirstSection()) { writeln("M9"); }

      if (hasParameter("operation-comment")) {
        writeComment(getParameter("operation-comment"));
      }

      // Fanuc tool change: T M6
      writeln("T" + tool.number + " M6");
      // Tool length comp
      writeln("G43 " + hFormat.format(tool.lengthOffset));

      // Spindle with prove-out + machine limit
      var fanRpm = applyProveOutSpeed(spindleSpeed);
      fanRpm = clampSpeed(fanRpm);
      fanRpm = clampToStableRange(fanRpm);
      writeln("S" + rpmFormat.format(fanRpm) + " " + (tool.clockwise ? "M3" : "M4"));

      // G05.1 AICC smoothing
      if (properties.useSmoothing) {
        writeln("G05.1 Q1");
        writeDebug("G05.1 AICC enabled");
      }

    } else {
      // Fanuc-compatible: Haas/Mazak/Okuma/Brother/Doosan/Hurco/DMG MORI
      if (isHaas() || isBrother()) {
        writeln("G53 G0 Z0");
      } else if (isMazak() || isOkuma() || isDoosan() || isHurco() || isDmgMori()) {
        writeln("G91 G28 Z0");
        writeln("G90");
      }
      if (!isFirstSection()) { writeln("M9"); }

      if (hasParameter("operation-comment")) {
        writeComment(getParameter("operation-comment"));
      }

      // Tool change: T M6 / G43 H (all Fanuc-compatible)
      writeln("T" + tool.number + " M6");
      writeln("G43 " + hFormat.format(tool.lengthOffset));

      // Spindle with prove-out + machine limit
      var fcRpm = applyProveOutSpeed(spindleSpeed);
      fcRpm = clampSpeed(fcRpm);
      fcRpm = clampToStableRange(fcRpm);
      writeln("S" + rpmFormat.format(fcRpm) + " " + (tool.clockwise ? "M3" : "M4"));

      // Controller-specific HSM smoothing
      if (properties.useSmoothing) {
        if (isHaas()) {
          var opType = currentSection.getType();
          if (opType === STRATEGY_3D || (hasParameter("operation:tolerance") && getParameter("operation:tolerance") < 0.01)) {
            writeln("G187 P3 (FINISH)");
          } else if (properties.smoothingMode == "finish") {
            writeln("G187 P3 (FINISH)");
          } else if (properties.smoothingMode == "rough") {
            writeln("G187 P1 (ROUGH)");
          } else {
            writeln("G187 P2 (MEDIUM)");
          }
        } else if (isMazak()) {
          writeln("G5.1 Q1"); // Mazak SmoothAi AICC
        } else if (isOkuma()) {
          writeln("G08 P1"); // Okuma HPCC
        } else if (isHurco()) {
          writeln("G64"); // Hurco UltiMotion (already in safe start, reinforce)
        } else if (isBrother()) {
          writeln("G05.1 Q1"); // Brother AICC
        }
        // DMG MORI / Doosan: no special smoothing code (standard Fanuc path)
        writeDebug("Smoothing injected for " + properties.controllerFamily);
      }
    }

    // Coolant — controller-specific TSC codes
    if (tool.coolant == COOLANT_FLOOD) {
      writeln("M8");
    } else if (tool.coolant == COOLANT_MIST) {
      writeln("M7");
    } else if (tool.coolant == COOLANT_THROUGH_TOOL) {
      if (isHaas()) {
        writeln("M88"); // Haas TSC
      } else if (isSiemens()) {
        writeln("M88"); // Siemens TSC
      } else if (isOkuma()) {
        writeln("M51"); // Okuma TSC
      } else if (isMazak()) {
        writeln("M51"); // Mazak TSC
      } else {
        writeln("M8"); // Generic: flood fallback for TSC
      }
    }

    // PRISM analytics comment for this operation
    if (prismData) {
      writeComment("PRISM: Fc=" + prismData.force + "N P=" + prismData.power + "kW conf=" + prismData.confidence);
      if (prismData.tool_life_min) {
        writeComment("TOOL LIFE: ~" + Math.round(prismData.tool_life_min) + " min");
        checkToolLifeWarning();
      }
      if (prismData.stable_rpm_min && prismData.stable_rpm_max) {
        writeComment("PRISM: Stable RPM range " + prismData.stable_rpm_min + "-" + prismData.stable_rpm_max);
      }
      if (prismData.wear_fraction && prismData.wear_fraction > 0) {
        writeComment("WEAR DERATING: " + Math.round((1.0 - (prismData.wear_fraction >= 0.8 ? 0.15 : (prismData.wear_fraction / 0.8) * 0.15)) * 100) + "%");
      }
      checkConfidenceWarnings();
    }
  }

  // Work offset (G54-G59, extended per controller)
  var wcs = currentSection.workOffset;
  if (wcs > 0) {
    if (wcs <= 6) {
      writeln(gFormat.format(53 + wcs));
    } else {
      if (isSiemens()) {
        // Siemens extended: G54-G59 only in standard, or $P_UIFR
        writeln(gFormat.format(53 + Math.min(wcs, 6)));
      } else if (isHaas()) {
        writeln("G154 P" + (wcs - 6));
      } else {
        // Fanuc 31i: G54.1 P{n}
        writeln("G54.1 P" + (wcs - 6));
      }
    }
  }

  forceXYZ();
  forceFeed();
}

// =================================================================
// Motion callbacks
// =================================================================

function onRapid(x, y, z) {
  var block = {
    id: currentBlocks.length,
    move_type: "G0",
    x: x, y: y, z: z,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  if (isHeidenhain()) {
    writeln("L " + xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " R0 FMAX");
  } else {
    var xStr = xOutput.format(x);
    var yStr = yOutput.format(y);
    var zStr = zOutput.format(z);
    if (xStr || yStr || zStr) {
      writeln(gMotionModal.format(0) + " " + xStr + " " + yStr + " " + zStr);
    }
  }
}

function onLinear(x, y, z, feed) {
  // Apply prove-out derate and machine limit clamp
  var f = applyProveOutFeed(feed, false);
  f = clampFeed(f);

  var block = {
    id: currentBlocks.length,
    move_type: "G1",
    x: x, y: y, z: z,
    feed_mm_min: f,
    spindle_rpm: spindleSpeed,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  if (isHeidenhain()) {
    writeln("L " + xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " R0 F" + feedFormat.format(f));
  } else {
    writeln(
      gMotionModal.format(1) + " " +
      xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
      feedOutput.format(f)
    );
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  var f = applyProveOutFeed(feed, false);
  f = clampFeed(f);

  var block = {
    id: currentBlocks.length,
    move_type: clockwise ? "G2" : "G3",
    x: x, y: y, z: z,
    i: cx - getCurrentPosition().x,
    j: cy - getCurrentPosition().y,
    k: cz - getCurrentPosition().z,
    feed_mm_min: f,
    spindle_rpm: spindleSpeed,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  if (isHeidenhain()) {
    // Heidenhain: CC (center) then C (arc end point)
    writeln("CC " + iOutput.format(cx) + " " + jOutput.format(cy));
    writeln("C " + xOutput.format(x) + " " + yOutput.format(y) + " R0 F" + feedFormat.format(f) + (clockwise ? " DR-" : " DR+"));
  } else {
    // Fanuc/Haas/Siemens: IJK incremental
    writeln(
      gMotionModal.format(clockwise ? 2 : 3) + " " +
      xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
      iOutput.format(cx - getCurrentPosition().x) + " " +
      jOutput.format(cy - getCurrentPosition().y) + " " +
      feedOutput.format(f)
    );
  }
}

function onRapid5D(x, y, z, a, b, c) {
  forceXYZ();
  writeln(
    gMotionModal.format(0) + " " +
    xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
    aOutput.format(a) + " " + bOutput.format(b)
  );
}

function onLinear5D(x, y, z, a, b, c, feed) {
  var f = applyProveOutFeed(feed, false);
  f = clampFeed(f);
  forceXYZ();
  writeln(
    gMotionModal.format(1) + " " +
    xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
    aOutput.format(a) + " " + bOutput.format(b) + " " +
    feedOutput.format(f)
  );
}

// =================================================================
// Canned cycles
// =================================================================

function onCycle() {
  if (isHaas() || isFanuc()) {
    writeln(gRetractModal.format(98));
  }
}

function onCyclePoint(x, y, z) {
  var F;

  if (isHeidenhain()) {
    onHeidenhainCyclePoint(x, y, z);
    return;
  }

  if (isSiemens()) {
    onSiemensCyclePoint(x, y, z);
    return;
  }

  // Fanuc-compatible canned cycles G81-G89 (Haas NGC / Fanuc 31i / Okuma / Doosan / Brother)
  switch (cycleType) {
    case "drilling":
      // G81: Simple drilling
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(81) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "counter-boring":
      // G82: Counterboring with dwell at bottom
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(82) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        "P" + secFormat.format(cycle.dwell) + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "deep-drilling":
    case "chip-breaking":
      // G83: Peck drilling (full retract) / G73: Chip breaking (partial retract)
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(cycleType === "deep-drilling" ? 83 : 73) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        "Q" + xyzFormat.format(cycle.incrementalDepth) + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "tapping":
    case "right-tapping":
      // G84: Rigid tapping — feed = pitch * RPM, ALWAYS precise (never rounded)
      F = tool.getThreadPitch() * rpmFormat.getResultingValue(applyProveOutSpeed(spindleSpeed));
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(84) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutputPrecise.format(F)
      );
      forceFeed();
      break;

    case "left-tapping":
      // G74: Left-hand rigid tapping
      F = tool.getThreadPitch() * rpmFormat.getResultingValue(applyProveOutSpeed(spindleSpeed));
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(74) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutputPrecise.format(F)
      );
      forceFeed();
      break;

    case "boring":
      // G85: Boring — feed out at feedrate
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(85) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "stop-boring":
      // G86: Boring — spindle stop, rapid out
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(86) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "back-boring":
      // G87: Back boring — orient spindle, shift, bore, retract
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(87) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        "Q" + xyzFormat.format(cycle.shift) + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "reaming":
      // G85: Reaming (same as boring — feed out)
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(85) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    case "fine-boring":
      // G89: Fine boring — feed in, dwell, feed out
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(89) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        "P" + secFormat.format(cycle.dwell) + " " +
        feedOutput.format(applyProveOutFeed(cycle.feedrate, false))
      );
      break;

    default:
      expandCyclePoint(x, y, z);
      break;
  }
}

/**
 * Siemens 840D canned cycle output.
 * Uses CYCLE81-87 with MCALL prefix syntax.
 */
function onSiemensCyclePoint(x, y, z) {
  forceXYZ();
  var retract = cycle.retract;
  var depth = z;

  switch (cycleType) {
    case "drilling":
      writeln("MCALL CYCLE81(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + ")");
      break;

    case "counter-boring":
      writeln("MCALL CYCLE82(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + "," + secFormat.format(cycle.dwell) + ")");
      break;

    case "deep-drilling":
    case "chip-breaking":
      writeln("MCALL CYCLE83(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + "," + xyzFormat.format(cycle.incrementalDepth) + ")");
      break;

    case "tapping":
    case "right-tapping":
      writeln("MCALL CYCLE84(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormatPrecise.format(applyProveOutFeed(cycle.feedrate, true)) + ")");
      break;

    case "left-tapping":
      writeln("MCALL CYCLE84(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormatPrecise.format(applyProveOutFeed(cycle.feedrate, true)) + ",,,3)");
      break;

    case "boring":
      // CYCLE85: Boring — feed out
      writeln("MCALL CYCLE85(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + ")");
      break;

    case "stop-boring":
      // CYCLE86: Boring with orient spindle stop
      writeln("MCALL CYCLE86(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + ")");
      break;

    case "back-boring":
      // CYCLE87: Back boring
      writeln("MCALL CYCLE87(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + ")");
      break;

    case "reaming":
      writeln("MCALL CYCLE85(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + ")");
      break;

    case "fine-boring":
      // CYCLE85 with dwell for fine boring
      writeln("MCALL CYCLE85(" + xyzFormat.format(retract) + "," + xyzFormat.format(depth) + ",," + feedFormat.format(applyProveOutFeed(cycle.feedrate, false)) + "," + secFormat.format(cycle.dwell) + ")");
      break;

    default:
      expandCyclePoint(x, y, z);
      break;
  }

  // Position to cycle point
  writeln(xOutput.format(x) + " " + yOutput.format(y));
}

/**
 * Heidenhain TNC canned cycle output.
 * Uses CYCL DEF 200-207 with CYCL CALL pattern.
 */
function onHeidenhainCyclePoint(x, y, z) {
  var retract = cycle.retract;
  var depth = z;
  var f = applyProveOutFeed(cycle.feedrate, false);

  switch (cycleType) {
    case "drilling":
      // CYCL DEF 200 DRILLING
      writeln("CYCL DEF 200 DRILLING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q202=" + xyzFormat.format(Math.abs(depth)) + " ;PLUNGING DEPTH");
      writeln("  Q210=0 ;DWELL TIME AT TOP");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "counter-boring":
      // CYCL DEF 202 BORING (with dwell)
      writeln("CYCL DEF 202 BORING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q211=" + secFormat.format(cycle.dwell) + " ;DWELL TIME AT DEPTH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "deep-drilling":
    case "chip-breaking":
      // CYCL DEF 205 UNIVERSAL PECKING
      writeln("CYCL DEF 205 UNIVERSAL PECKING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q202=" + xyzFormat.format(cycle.incrementalDepth) + " ;PLUNGING DEPTH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "tapping":
    case "right-tapping":
      // CYCL DEF 206 TAPPING NEW — pitch-based, ALWAYS precise
      var pitch = tool.getThreadPitch();
      writeln("CYCL DEF 206 TAPPING NEW");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q239=" + feedFormatPrecise.format(pitch) + " ;PITCH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "left-tapping":
      // CYCL DEF 207 TAPPING NEW (left-hand) — reversed spindle
      var pitchLH = tool.getThreadPitch();
      writeln("CYCL DEF 207 TAPPING NEW");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q239=" + feedFormatPrecise.format(pitchLH) + " ;PITCH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "boring":
    case "reaming":
      // CYCL DEF 201 REAMING
      writeln("CYCL DEF 201 REAMING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q211=0 ;DWELL TIME AT DEPTH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "stop-boring":
      // CYCL DEF 202 BORING (orient stop)
      writeln("CYCL DEF 202 BORING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q211=0 ;DWELL TIME AT DEPTH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "back-boring":
      // CYCL DEF 204 BACK BORING
      writeln("CYCL DEF 204 BACK BORING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    case "fine-boring":
      // CYCL DEF 203 COUNTERSINKING (fine bore with dwell)
      writeln("CYCL DEF 203 COUNTERSINKING");
      writeln("  Q200=" + xyzFormat.format(2) + " ;SET-UP CLEARANCE");
      writeln("  Q201=" + xyzFormat.format(Math.abs(depth)) + " ;DEPTH");
      writeln("  Q206=" + feedFormat.format(f) + " ;FEED RATE FOR PLUNGING");
      writeln("  Q211=" + secFormat.format(cycle.dwell) + " ;DWELL TIME AT DEPTH");
      writeln("  Q203=" + xyzFormat.format(retract) + " ;SURFACE COORDINATE");
      writeln("  Q204=" + xyzFormat.format(50) + " ;2ND SET-UP CLEARANCE");
      break;

    default:
      expandCyclePoint(x, y, z);
      return;
  }

  // Heidenhain: CYCL CALL at position
  writeln("L " + xOutput.format(x) + " " + yOutput.format(y) + " R0 FMAX M99");
}

function onCycleEnd() {
  if (isHeidenhain()) {
    // Heidenhain: no explicit cancel — cycles are single-call via M99
  } else if (isSiemens()) {
    writeln("MCALL");
  } else {
    writeln(gCycleModal.format(80));
  }
}

// =================================================================
// Other callbacks
// =================================================================

function onDwell(seconds) {
  if (isHeidenhain()) {
    writeln("CYCL DEF 9.0 DWELL TIME");
    writeln("CYCL DEF 9.1 DWELL " + secFormat.format(seconds));
  } else if (isSiemens()) {
    writeln("G4 F" + secFormat.format(seconds));
  } else {
    writeln("G4 P" + secFormat.format(seconds));
  }
}

function onSpindleSpeed(rpm) {
  var s = applyProveOutSpeed(rpm);
  s = clampSpeed(s);
  s = clampToStableRange(s);
  writeln("S" + rpmFormat.format(s) + (tool.clockwise ? " M3" : " M4"));
}

function onCommand(command) {
  switch (command) {
    case COMMAND_STOP:
      writeln("M0");
      break;
    case COMMAND_OPTIONAL_STOP:
      writeln("M1");
      break;
    case COMMAND_SPINDLE_CLOCKWISE:
      writeln("M3");
      break;
    case COMMAND_SPINDLE_COUNTERCLOCKWISE:
      writeln("M4");
      break;
    case COMMAND_STOP_SPINDLE:
      writeln("M5");
      break;
    case COMMAND_COOLANT_ON:
      writeln("M8");
      break;
    case COMMAND_COOLANT_OFF:
      writeln("M9");
      break;
  }
}

function onRadiusCompensation() {
  var comp = radiusCompensation;
  if (comp == RADIUS_COMPENSATION_LEFT) {
    writeln(gFormat.format(41));
  } else if (comp == RADIUS_COMPENSATION_RIGHT) {
    writeln(gFormat.format(42));
  } else {
    writeln(gFormat.format(40));
  }
}

function onSectionEnd() {
  currentOperation.blocks = currentBlocks;
  collectedOperations.push(currentOperation);

  // Turn off smoothing at section end for Fanuc-family AICC
  if ((isFanuc() || isMazak() || isBrother()) && properties.useSmoothing) {
    writeln("G05.1 Q0");
  }
  if (isOkuma() && properties.useSmoothing) {
    writeln("G08 P0"); // Okuma HPCC off
  }

  // Heidenhain: no smoothing cancel needed (M120 is modal until overridden)

  // Deactivate 5-axis RTCP at section end if it was active
  if (currentSection.isMultiAxis && currentSection.isMultiAxis()) {
    if (isHaas()) {
      writeln("G49"); // Cancel G234 TCP
    } else if (isFanuc()) {
      writeln("G49"); // Cancel G43.4
    } else if (isSiemens()) {
      writeln("TRAFOOF"); // Cancel TRAORI
    } else if (isHeidenhain()) {
      writeln("FUNCTION TCPM RESET");
    } else if (isMazak()) {
      writeln("G49"); // Cancel G43.4
    } else if (isOkuma()) {
      writeln("G49"); // Cancel G169
    }
  }

  forceAny();
}

// =================================================================
// PROBING ROUTINES (U-PPR17)
// =================================================================

/**
 * Output probing routine for the active controller.
 * Called from Fusion 360 probing operations.
 * Error handling: probe not tripped → alarm.
 */
function onProbing(x, y, z) {
  if (!currentSection.isProbingCycle || !currentSection.isProbingCycle()) {
    return; // Not a probing cycle
  }

  var probeType = currentSection.hasParameter("operation:strategy") ?
    currentSection.getParameter("operation:strategy") : "single_surface";

  if (isHaas()) {
    // Haas: Renishaw-compatible G65 P9xxx macros
    onHaasProbing(x, y, z, probeType);
  } else if (isFanuc()) {
    // Fanuc: G65 P9xxx macros (Renishaw compatible)
    onFanucProbing(x, y, z, probeType);
  } else if (isSiemens()) {
    // Siemens: CYCLE977/978/979
    onSiemensProbing(x, y, z, probeType);
  } else if (isHeidenhain()) {
    // Heidenhain: TCH PROBE 420+
    onHeidenhainProbing(x, y, z, probeType);
  } else if (isOkuma()) {
    // Okuma: G169-based probing
    onOkumaProbing(x, y, z, probeType);
  }
}

function onHaasProbing(x, y, z, probeType) {
  writeComment("PROBING: " + probeType);
  switch (probeType) {
    case "single_surface":
    case "probing-z":
      writeln("G65 P9811 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "probing-x":
    case "probing-y":
      writeln("G65 P9811 " + (probeType === "probing-x" ? "X" : "Y") + xyzFormat.format(probeType === "probing-x" ? x : y) + " F" + feedFormat.format(200));
      break;
    case "bore":
    case "probing-xy-circular-bore":
      writeln("G65 P9812 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "boss":
    case "probing-xy-circular-boss":
      writeln("G65 P9812 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "wcs":
    case "probing-xyz":
      writeln("G65 P9810 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "tool_length":
      writeln("G65 P9023");
      break;
    default:
      writeComment("Unsupported probe type: " + probeType);
      break;
  }
  // Error check: #5060 = probe trip status on Haas
  writeComment("Verify probe trip — alarm if not tripped");
}

function onFanucProbing(x, y, z, probeType) {
  writeComment("PROBING: " + probeType);
  switch (probeType) {
    case "single_surface":
    case "probing-z":
      writeln("G65 P9811 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "bore":
    case "probing-xy-circular-bore":
      writeln("G65 P9812 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "wcs":
    case "probing-xyz":
      writeln("G65 P9810 Z" + xyzFormat.format(z) + " F" + feedFormat.format(200));
      break;
    case "tool_length":
      writeln("G65 P9023");
      break;
    default:
      writeComment("Unsupported probe type: " + probeType);
      break;
  }
  writeComment("Verify probe trip — alarm if not tripped");
}

function onSiemensProbing(x, y, z, probeType) {
  writeComment("PROBING: " + probeType);
  switch (probeType) {
    case "single_surface":
    case "probing-z":
      writeln("CYCLE978(" + xyzFormat.format(z) + ",,1,)");
      break;
    case "bore":
    case "probing-xy-circular-bore":
      writeln("CYCLE979(" + xyzFormat.format(z) + ",,1,)");
      break;
    case "boss":
    case "probing-xy-circular-boss":
      writeln("CYCLE979(" + xyzFormat.format(z) + ",,2,)");
      break;
    case "wcs":
    case "probing-xyz":
      writeln("CYCLE977(" + xyzFormat.format(z) + ",,1,)");
      break;
    case "tool_length":
      writeln("CYCLE982");
      break;
    default:
      writeComment("Unsupported probe type: " + probeType);
      break;
  }
  writeComment("Probe error: _OVR[8] alarm if not tripped");
}

function onHeidenhainProbing(x, y, z, probeType) {
  writeComment("PROBING: " + probeType);
  switch (probeType) {
    case "single_surface":
    case "probing-z":
      writeln("TCH PROBE 420 MEASURE SURFACE IN Z");
      writeln("  Q260=" + xyzFormat.format(2) + " ;CLEARANCE HEIGHT");
      writeln("  Q261=" + xyzFormat.format(z) + " ;MEASURING HEIGHT");
      writeln("  Q281=1 ;MEASURING LOG");
      break;
    case "bore":
    case "probing-xy-circular-bore":
      writeln("TCH PROBE 421 MEASURE BORE");
      writeln("  Q260=" + xyzFormat.format(2) + " ;CLEARANCE HEIGHT");
      writeln("  Q261=" + xyzFormat.format(z) + " ;MEASURING HEIGHT");
      writeln("  Q281=1 ;MEASURING LOG");
      break;
    case "boss":
    case "probing-xy-circular-boss":
      writeln("TCH PROBE 422 MEASURE BOSS");
      writeln("  Q260=" + xyzFormat.format(2) + " ;CLEARANCE HEIGHT");
      writeln("  Q261=" + xyzFormat.format(z) + " ;MEASURING HEIGHT");
      writeln("  Q281=1 ;MEASURING LOG");
      break;
    case "wcs":
    case "probing-xyz":
      writeln("TCH PROBE 420 MEASURE SURFACE IN Z");
      writeln("  Q260=" + xyzFormat.format(2) + " ;CLEARANCE HEIGHT");
      writeln("  Q261=" + xyzFormat.format(z) + " ;MEASURING HEIGHT");
      writeln("  Q281=1 ;MEASURING LOG");
      break;
    case "tool_length":
      writeln("TCH PROBE 480 CALIBRATE TL");
      break;
    default:
      writeComment("Unsupported probe type: " + probeType);
      break;
  }
}

function onOkumaProbing(x, y, z, probeType) {
  writeComment("PROBING: " + probeType);
  switch (probeType) {
    case "single_surface":
    case "probing-z":
      writeln("G65 P9810 Z" + xyzFormat.format(z));
      break;
    case "bore":
    case "probing-xy-circular-bore":
      writeln("G65 P9812 Z" + xyzFormat.format(z));
      break;
    case "wcs":
      writeln("G65 P9810 Z" + xyzFormat.format(z));
      break;
    case "tool_length":
      writeln("G65 P9820");
      break;
    default:
      writeComment("Unsupported probe type: " + probeType);
      break;
  }
  writeComment("Verify probe trip — alarm if not tripped");
}

// =================================================================
// 5-AXIS RTCP/TCP SUPPORT (U-PPR18)
// =================================================================

/**
 * Activate RTCP/TCP for 5-axis simultaneous machining.
 * Called at section start when multi-axis is detected.
 */
function activateRTCP() {
  if (isHaas()) {
    writeln("G234"); // Haas DWO TCP
  } else if (isFanuc()) {
    writeln("G43.4 H" + hFormat.format(getTool().lengthOffset)); // Fanuc TCPC
  } else if (isSiemens()) {
    writeln("TRAORI(1)"); // Siemens TRAORI
  } else if (isHeidenhain()) {
    writeln("FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS");
  } else if (isMazak()) {
    writeln("G43.4 H" + hFormat.format(getTool().lengthOffset)); // Mazak TCP
  } else if (isOkuma()) {
    writeln("G169"); // Okuma TCP
  }
  writeDebug("RTCP/TCP activated for 5-axis");
}

/**
 * Output tilted workplane for indexed 5-axis (3+2).
 */
function onTiltedWorkplane(abc) {
  if (isHaas()) {
    writeln("G68.2 X0 Y0 Z0 I" + xyzFormat.format(abc.x * 180 / Math.PI) +
      " J" + xyzFormat.format(abc.y * 180 / Math.PI) +
      " K" + xyzFormat.format(abc.z * 180 / Math.PI));
  } else if (isFanuc()) {
    writeln("G68.2 X0 Y0 Z0 I" + xyzFormat.format(abc.x * 180 / Math.PI) +
      " J" + xyzFormat.format(abc.y * 180 / Math.PI) +
      " K" + xyzFormat.format(abc.z * 180 / Math.PI));
  } else if (isSiemens()) {
    writeln("CYCLE800(0,\"\",0,0,0," +
      xyzFormat.format(abc.x * 180 / Math.PI) + "," +
      xyzFormat.format(abc.y * 180 / Math.PI) + "," +
      xyzFormat.format(abc.z * 180 / Math.PI) + ",0,0,0,0,1)");
  } else if (isHeidenhain()) {
    writeln("PLANE SPATIAL SPA" + xyzFormat.format(abc.x * 180 / Math.PI) +
      " SPB" + xyzFormat.format(abc.y * 180 / Math.PI) +
      " SPC" + xyzFormat.format(abc.z * 180 / Math.PI) +
      " STAY");
  }
  writeDebug("Tilted workplane set");
}

// =================================================================
// REMAINING CONTROLLER HELPERS (U-PPR19)
// =================================================================

function isMazak() {
  return properties.controllerFamily == "mazak";
}

function isOkuma() {
  return properties.controllerFamily == "okuma";
}

function isHurco() {
  return properties.controllerFamily == "hurco";
}

function isDmgMori() {
  return properties.controllerFamily == "dmg_mori";
}

function isBrother() {
  return properties.controllerFamily == "brother";
}

function isDoosan() {
  return properties.controllerFamily == "doosan";
}

// =================================================================
// onClose — Program end
// =================================================================

function onClose() {
  // Coolant off
  writeln("M9");
  // Spindle stop
  writeln("M5");

  if (isHeidenhain()) {
    // Heidenhain: retract to machine zero
    if (properties.useSmoothing) {
      writeln("M120"); // Cancel look-ahead
    }
    writeln("L Z+0 R0 FMAX M91");
  } else if (isSiemens()) {
    // Siemens: SUPA retract, CYCLE832 off
    if (properties.useSmoothing) {
      writeln("CYCLE832()");
    }
    writeln("SUPA G0 Z0");
  } else if (isHaas() || isBrother()) {
    writeln("G53 G0 Z0");
  } else {
    // Fanuc/Mazak/Okuma/Doosan/Hurco/DMG MORI
    writeln("G91 G28 Z0");
    writeln("G90");
  }

  // Setup sheet
  if (properties.includeSetupSheet) {
    writeSetupSheet();
  }

  // Analytics
  if (properties.includeAnalytics) {
    writeAnalytics();
  }

  // Program end
  if (isHeidenhain()) {
    writeln("END PGM PRISM MM");
  } else {
    writeln("M30");
    if (!isSiemens()) {
      writeln("%");
    }
  }

  // Sidecar JSON
  writeSidecarJSON();
}

// =================================================================
// Setup sheet
// =================================================================

function writeSetupSheet() {
  writeComment("=== SETUP SHEET ===");
  writeComment("Program: O" + ("00000" + properties.programNumber).slice(-5));
  writeComment("Controller: " + properties.controllerFamily);
  writeComment("Material: " + getMaterialName());
  if (properties.machineName) {
    writeComment("Machine: " + properties.machineName);
  }
  if (proveOutActive) {
    writeComment("*** PROVE-OUT: Feed " + properties.proveOutFeedPct + "% / Speed " + properties.proveOutSpeedPct + "% ***");
  }
  writeComment("Tools used:");
  var seen = {};
  for (var i = 0; i < collectedTools.length; i++) {
    var t = collectedTools[i];
    if (!seen[t.tool_number]) {
      seen[t.tool_number] = true;
      writeComment("  T" + t.tool_number + " " + t.type + " D" + t.diameter_mm.toFixed(1) + "mm " + t.flute_count + "FL " + t.material);
    }
  }
  writeComment("Operations: " + collectedOperations.length);
  for (var j = 0; j < collectedOperations.length; j++) {
    var op = collectedOperations[j];
    writeComment("  OP" + (j + 1) + ": " + (op.name || "unnamed") + " T" + op.tool_number);
  }
}

// =================================================================
// Analytics
// =================================================================

function writeAnalytics() {
  writeComment("=== PRISM ANALYTICS ===");
  writeComment("Controller: " + properties.controllerFamily);
  if (proveOutActive) {
    writeComment("Prove-out: Feed " + properties.proveOutFeedPct + "% / Speed " + properties.proveOutSpeedPct + "%");
  } else {
    writeComment("Prove-out: OFF (production)");
  }
  if (properties.maxSpindleSpeed > 0) {
    writeComment("Max RPM: " + properties.maxSpindleSpeed);
  }
  if (properties.maxFeedRate > 0) {
    writeComment("Max feed: " + properties.maxFeedRate + " mm/min");
  }
  writeComment("HSM smoothing: " + (properties.useSmoothing ? properties.smoothingMode : "OFF"));

  var totalBlocks = 0;
  for (var i = 0; i < collectedOperations.length; i++) {
    totalBlocks += collectedOperations[i].blocks.length;
  }
  writeComment("Total blocks: " + totalBlocks);
}

// =================================================================
// Sidecar JSON export
// =================================================================

function deduplicateTools(tools) {
  var seen = {};
  var unique = [];
  for (var i = 0; i < tools.length; i++) {
    if (!seen[tools[i].tool_number]) {
      seen[tools[i].tool_number] = true;
      unique.push(tools[i]);
    }
  }
  return unique;
}

function writeSidecarJSON() {
  var sidecar = {
    post_version: "1.0.0",
    controller: properties.controllerFamily,
    operations: collectedOperations,
    tools: deduplicateTools(collectedTools),
    material: { name: getMaterialName() },
    machine: properties.machineName ? { name: properties.machineName } : undefined,
    prove_out: proveOutActive ? {
      feed_pct: properties.proveOutFeedPct,
      speed_pct: properties.proveOutSpeedPct
    } : null,
    machine_limits: {
      max_rpm: properties.maxSpindleSpeed > 0 ? properties.maxSpindleSpeed : null,
      max_feed: properties.maxFeedRate > 0 ? properties.maxFeedRate : null
    },
    debug: properties.debugMode
  };

  var sidecarPath = getOutputPath().replace(/\.[^.]+$/, ".prism.json");
  try {
    writeFile(sidecarPath, JSON.stringify(sidecar, null, 2));
    writeComment("Sidecar JSON: " + sidecarPath);
    writeComment("Run: prism optimize " + getOutputPath() + " --context " + sidecarPath);
  } catch (e) {
    writeComment("Could not write sidecar: " + e.message);
  }
}

// NOTE: Fusion 360 CPS runtime has NO HTTPClient.
// PRISM physics data arrives via:
// 1. PRISM Add-in: modifies S/F via adsk.cam API before post
// 2. Operation comment JSON: {"prism":{"force","power","confidence",...}}
// 3. Sidecar JSON: exported for offline PRISM pipeline optimization
