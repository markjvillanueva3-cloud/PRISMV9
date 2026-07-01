/**
  PRISM Master Post Processor — Hurco VM30i (WinMax / MAX5)

  Production-grade Fusion 360 post for Hurco VM30i with WinMax control.
  Dialect data derived from ControllerDialectEngine hurco_max5 definition
  and the existing HURCO-VM30i-Ai-Enhanced.cps production post.

  Hurco-specific features:
  - ISNC (ISO NC) mode and BNC (Basic NC) mode support
  - M140 Z-retract (Hurco native, replaces G53)
  - G05.3 smoothing (P35 rough, P20 semi-finish, P10 finish)
  - UltiMotion: 10,000 block look-ahead, 15,000 blocks/sec, NURBS
  - R-word arc format (Hurco preference, IJK also supported)
  - G84.2/G84.3 rigid tapping with chip-break
  - Precise tapping feeds (feedOutputPrecise)
  - Integer milling feeds
  - Tool preload (T-next on previous tool change line)
  - Sidecar JSON export for PRISM offline pipeline

  v2.0.0 state-of-the-art additions (dialect forms mirror the verified
  HurcoV11MillMasterPostEngine — 375/375 tests — NOT re-derived from manuals):
  - G94 feed-per-minute asserted in safe-start (clears CIMCO feed-mode ambiguity)
  - Full boring-cycle family (ISNC): G89 dwell-bore, G86 stop-bore,
    G88 manual-bore, G76 fine-bore, G87 back-bore (in addition to G85 ream)
  - WinMax 6-fixture (G54-G59) safety guard — never silently emit a >G59 offset;
    no G54.1 Pn (WinMax does not support extended offsets)
  - Min-Z safe retract on fixture (WCS) change without a tool change (collision guard)
  - In-process probing (Renishaw Inspection Plus): P9832/P9833 probe on/off +
    P9810 protected move + P9811 single-surface (X/Y/Z) implemented; bore/boss/
    corner routed to the PRISM server probing post pending Fusion-op verification

  v2.1.0 additions (echo, 2026-06-29 — mirror the verified engine; no unverified codes):
  - Plane-correct circular interpolation: allowedCircularPlanes restricted to PLANE_XY so the
    kernel LINEARIZES any ZX/YZ arc. Fixes a latent plane-blind/helical-blind arc hazard (the
    prior IJK emission carried no G18/G19 plane word and no helical guard, so a ZX/YZ arc would
    have been cut in the wrong modal plane). XY helical (Z-ramp) arcs remain G2/G3 X Y Z I J.
  - Native through-spindle coolant M88 (matches the verified HurcoV11 engine) replaces the
    older unverified "M98 P9100" sub-program guess for COOLANT_THROUGH_TOOL.

  VERIFY-ON-MACHINE before production: probing requires the Renishaw 9800-series
  macros + OMP40 spindle probe installed on the control; G87 back-bore orientation
  and any probing cycle should be proven on the first run. ISNC mode assumed for
  canned cycles (BNC expands to linear; BNC G88 = rigid tap, NOT manual-bore).
  - M88 TSC requires through-spindle-coolant hardware on the VM30i; if absent, disable
    through-tool coolant in CAM or the control will alarm.
  - NOT emitted (unverified for WinMax — confirm in the Hurco manual before adding):
    M16 auto-buffering; M89 TSC-off (engine ends TSC with the all-off M09 instead).
  - CONFLICT TO RESOLVE ON THE REAL CONTROL: the server HurcoV11 engine DOES emit
    G54.1 Pn for >6 fixtures (citing WinMax docs); this .cps deliberately does NOT.
    Confirm WinMax V11 extended-offset support before relying on more than G54-G59.

  Physics data paths (Fusion 360 CPS is sandboxed — NO network):
  1. PRISM Add-in: modifies S/F via adsk.cam API before post
  2. Operation comment JSON: {prism:{force, power, confidence, ...}}
  3. Sidecar JSON: exported for offline PRISM pipeline

  Version: 2.1.0
  Copyright (c) 2026 PRISM Manufacturing Intelligence
*/

description = "PRISM Master — Hurco VM30i";
vendor = "PRISM";
vendorUrl = "https://prism-mfg.com";
legal = "Copyright (C) 2026 PRISM Manufacturing Intelligence";
certificationLevel = 2;

longDescription = "Physics-optimized Hurco VM30i post processor. " +
  "Supports ISNC and BNC modes, M140 Z-retract, G05.3 smoothing, " +
  "UltiMotion look-ahead, precise tapping feeds, " +
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
// Restrict circular interp to the XY plane: the Fusion kernel then LINEARIZES any ZX/YZ
// arc, so the post never emits a plane-blind arc (a ZX/YZ arc with no G18/G19 would be cut
// in the wrong modal plane). Helical XY arcs (Z-ramp) remain valid as G2/G3 X Y Z I J.
allowedCircularPlanes = PLANE_XY;

// ═══════════════════════════════════════════════════════════════════
// PROPERTIES
// ═══════════════════════════════════════════════════════════════════

properties = {
  programNumber: {
    title: "Program Number",
    description: "O-code program number (1-99999)",
    type: "integer",
    range: [1, 99999],
    value: 1
  },

  // Hurco-specific
  isnc: {
    title: "ISNC Mode",
    description: "true=ISNC (ISO NC), false=BNC (Basic NC) — affects cycle output format",
    type: "boolean",
    value: true
  },
  useM140: {
    title: "Use M140 for Z Retract",
    description: "Use M140 MB1 (Hurco native) instead of G53 G0 Z0 for safe retracts",
    type: "boolean",
    value: true
  },
  useSmoothing: {
    title: "G05.3 Smoothing",
    description: "Inject G05.3 smoothing per operation type",
    type: "boolean",
    value: true
  },
  smoothingRoughValue: {
    title: "Smoothing Rough (P value)",
    description: "G05.3 P value for roughing (1-100, higher = smoother path)",
    type: "integer",
    range: [1, 100],
    value: 35
  },
  smoothingSemiFinishValue: {
    title: "Smoothing Semi-Finish (P value)",
    description: "G05.3 P value for semi-finishing",
    type: "integer",
    range: [1, 100],
    value: 20
  },
  smoothingFinishValue: {
    title: "Smoothing Finish (P value)",
    description: "G05.3 P value for finishing (lower = tighter tolerance)",
    type: "integer",
    range: [1, 100],
    value: 10
  },
  preloadTool: {
    title: "Preload Next Tool",
    description: "Queue next tool during current operation for faster ATC",
    type: "boolean",
    value: true
  },
  useG95forTapping: {
    title: "G95 for Tapping",
    description: "Use feed-per-rev for tapping instead of feed-per-min",
    type: "boolean",
    value: false
  },
  allow3DArcs: {
    title: "Allow 3D Arcs",
    description: "Allow helical (3D) circular interpolation",
    type: "boolean",
    value: true
  },
  optionalStop: {
    title: "Optional Stop Between Tools",
    description: "Insert M01 between tool changes",
    type: "boolean",
    value: true
  },
  enableProbing: {
    title: "In-Process Probing (Renishaw)",
    description: "Emit Renishaw Inspection Plus probing cycles (REQUIRES 9800-series macros + OMP40 spindle probe on the control)",
    type: "boolean",
    value: true
  },

  // PRISM optimization
  aggressiveness: {
    title: "Aggressiveness",
    description: "0=Conservative, 50=Balanced, 100=Maximum productivity",
    type: "integer",
    range: [0, 100],
    value: 50
  },
  optimizationTarget: {
    title: "Optimization Target",
    description: "Primary optimization priority",
    type: "enum",
    values: [
      { id: "balanced", title: "Balanced" },
      { id: "max_speed", title: "Maximum Speed" },
      { id: "max_tool_life", title: "Maximum Tool Life" },
      { id: "min_cost", title: "Minimum Cost" },
      { id: "surface_quality", title: "Surface Quality" }
    ],
    value: "balanced"
  },
  enableChipThinning: {
    title: "Chip Thinning Compensation",
    description: "Increase feed for light radial engagement",
    type: "boolean",
    value: true
  },
  enableStabilityLobes: {
    title: "Stability Lobe RPM Selection",
    description: "Shift RPM to chatter-free zones",
    type: "boolean",
    value: true
  },
  materialOverride: {
    title: "Material Override",
    description: "Override Fusion material (e.g., '4140 Steel', '7075-T6')",
    type: "string",
    value: ""
  },

  // Output
  includeSetupSheet: {
    title: "Include Setup Sheet",
    description: "Append setup sheet data as comments",
    type: "boolean",
    value: true
  },
  includeAnalytics: {
    title: "Include PRISM Analytics",
    description: "Append optimization analytics as comments",
    type: "boolean",
    value: true
  },
  debugMode: {
    title: "Debug Mode",
    description: "Verbose PRISM debug info in comments",
    type: "boolean",
    value: false
  }
};

// ═══════════════════════════════════════════════════════════════════
// FORMAT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

var gFormat = createFormat({prefix:"G", decimals:1, forceDecimal:false});
var mFormat = createFormat({prefix:"M", decimals:0});
var tFormat = createFormat({prefix:"T", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var dFormat = createFormat({prefix:"D", decimals:0});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true});

// Milling feeds: integer format (F80, not F80.000)
var feedFormat = createFormat({decimals:0, forceDecimal:false});
// Tapping/precision feeds: 4 decimals inch, 3 decimals metric
var feedFormatPrecise = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});

var ijkFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:false});
var rFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:false});

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

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════

var collectedOperations = [];
var collectedTools = [];
var currentOperation = null;
var currentBlocks = [];
var currentWcs = 0;            // last emitted work offset (1-6) — for WCS-change safe-Z guard

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function writeComment(text) {
  writeln("(" + String(text).replace(/[()]/g, "") + ")");
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

function getMaterialName() {
  if (properties.materialOverride) {
    return properties.materialOverride;
  }
  if (hasGlobalParameter("material")) {
    return getGlobalParameter("material");
  }
  if (hasGlobalParameter("material-name")) {
    return getGlobalParameter("material-name");
  }
  return "Steel";
}

/** Safe Z retract — M140 (Hurco native) or G53 G0 Z0 */
function writeRetractZ() {
  if (properties.useM140) {
    writeln("M140 MB1");
  } else {
    writeln("G53 G0 Z0");
  }
}

/**
 * In-process probing (Renishaw Inspection Plus). P-macro numbers mirror the
 * verified HurcoV11MillMasterPostEngine probing set. Single-surface (X/Y/Z) is
 * implemented; feature probing (bore/boss/corner) needs a per-feature nominal
 * that must be proven against a real Fusion probing op — routed to the server
 * post rather than emitting a guessed macro argument into a probe move.
 * REQUIRES 9800-series macros + an OMP40 spindle probe installed on the control.
 */
var probeWarned = false;
function writeProbeWarningOnce() {
  if (!probeWarned) {
    writeComment("=== IN-PROCESS PROBING (Renishaw Inspection Plus) ===");
    writeComment("VERIFY-ON-MACHINE: needs 9800-series macros + OMP40 spindle probe; prove on first run");
    probeWarned = true;
  }
}

function writeProbeCycle(x, y, z) {
  writeProbeWarningOnce();
  var wcsN = currentSection.workOffset;
  var sWord = (wcsN > 0 && wcsN <= 6) ? (" S" + (53 + wcsN)) : "";
  forceXYZ();
  writeln("G65 P9832");                                                    // probe arm ON
  writeln("G65 P9810 " + xOutput.format(x) + " " + yOutput.format(y) +
          " Z" + xyzFormat.format(z) + " F" + feedFormat.format(300));     // protected positioning move
  switch (String(cycleType)) {
    case "probing-x":
      writeln("G65 P9811 X" + xyzFormat.format(x) + sWord);                // single surface, X
      break;
    case "probing-y":
      writeln("G65 P9811 Y" + xyzFormat.format(y) + sWord);                // single surface, Y
      break;
    case "probing-z":
      writeln("G65 P9811 Z" + xyzFormat.format(z) + sWord);                // single surface, Z
      break;
    default:
      writeComment("PROBING CYCLE " + cycleType + " NOT IN VERIFIED .CPS SET (P9811 single-surface only) - GENERATE VIA PRISM SERVER PROBING POST + VERIFY ON MACHINE");
      break;
  }
  writeln("G65 P9833");                                                    // probe arm OFF
}

/**
 * Parse PRISM physics data from operation:comment JSON.
 * Format: {prism:{force, power, confidence, tool_life_min, stable_rpm_min, stable_rpm_max}}
 */
function parsePrismComment() {
  try {
    var comment = getParameter("operation:comment");
    if (comment && comment.indexOf("{prism:") >= 0) {
      var jsonStr = comment.substring(comment.indexOf("{prism:"));
      var parsed = JSON.parse(jsonStr.replace(/prism:/, '"prism":'));
      return parsed.prism || null;
    }
  } catch (e) {
    // No PRISM data — normal for non-optimized operations
  }
  return null;
}

/**
 * Determine smoothing P-value based on operation characteristics.
 * Stock to leave > 0.5mm → rough, > 0 → semi-finish, 0 → finish
 */
function getSmoothingValue() {
  var stockToLeave = 0;
  if (hasParameter("operation:stockToLeave")) {
    stockToLeave = getParameter("operation:stockToLeave");
  }
  if (stockToLeave > 0.5) {
    return properties.smoothingRoughValue;
  } else if (stockToLeave > 0) {
    return properties.smoothingSemiFinishValue;
  } else {
    return properties.smoothingFinishValue;
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

function mapOperationType(type) {
  switch (type) {
    case STRATEGY_2D: return "2d_contour";
    case STRATEGY_3D: return "3d_contour";
    case STRATEGY_DRILLING: return "drilling";
    case STRATEGY_TURNING: return "turning";
    default: return "general";
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROGRAM LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

function onOpen() {
  // Program header
  writeln("%");
  writeln("O" + ("00000" + properties.programNumber).slice(-5) + " (HURCO VM30i)");

  // Header comments
  writeComment("PRISM Master — Hurco VM30i v2.1.0");
  writeComment("Generated: " + new Date().toISOString().split("T")[0]);
  if (programName) {
    writeComment("Program: " + programName);
  }
  if (programComment) {
    writeComment(programComment);
  }
  writeComment("Machine: Hurco VM30i");
  writeComment("Material: " + getMaterialName());
  writeComment("Mode: " + (properties.isnc ? "ISNC" : "BNC"));

  // Safe start line — Hurco WinMax (G94 = feed-per-minute asserted; cancel cutter-comp/cycle/TLO)
  writeln("G90 G94 G21 G17 G40 G80 G49");

  writeDebug("PRISM aggressiveness=" + properties.aggressiveness);
  writeDebug("Optimization target=" + properties.optimizationTarget);
}

function onSection() {
  var tool = getTool();
  var insertToolCall = isFirstSection() ||
    (tool.number !== getPreviousSection().getTool().number);

  // Collect operation data for sidecar
  var op = {
    id: collectedOperations.length,
    name: hasParameter("operation-comment") ? getParameter("operation-comment") : "",
    type: mapOperationType(currentSection.getType()),
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

  // Parse PRISM physics data
  var prismData = parsePrismComment();
  if (prismData) {
    writeDebug("PRISM force=" + prismData.force + "N power=" + prismData.power + "kW conf=" + prismData.confidence);
  }

  // Tool change
  if (insertToolCall) {
    if (!isFirstSection() && properties.optionalStop) {
      writeln("M01");
    }

    // Coolant off + retract
    if (!isFirstSection()) {
      writeln("M9");
      writeRetractZ();
    }

    // Operation comment
    if (hasParameter("operation-comment")) {
      writeComment(getParameter("operation-comment"));
    }

    // Tool call with optional preload
    var nextTool = undefined;
    if (properties.preloadTool) {
      var nextSectionIndex = getCurrentSectionId() + 1;
      if (nextSectionIndex < getNumberOfSections()) {
        nextTool = getSection(nextSectionIndex).getTool();
      }
    }

    if (nextTool && nextTool.number !== tool.number) {
      writeln("T" + tool.number + " M6 T" + nextTool.number);
    } else {
      writeln("T" + tool.number + " M6");
    }

    // Tool length comp
    writeln("G43 " + hFormat.format(tool.lengthOffset));

    // Spindle start
    writeln("S" + rpmFormat.format(spindleSpeed) + " " + (tool.clockwise ? "M3" : "M4"));

    // G05.3 smoothing injection (Hurco-specific)
    if (properties.useSmoothing) {
      var smoothVal = getSmoothingValue();
      writeln("G05.3 P" + smoothVal);
      writeDebug("G05.3 P" + smoothVal + " (smoothing)");
    }

    // Coolant
    if (tool.coolant == COOLANT_FLOOD) {
      writeln("M8");
    } else if (tool.coolant == COOLANT_MIST) {
      writeln("M7");
    } else if (tool.coolant == COOLANT_THROUGH_TOOL) {
      // Native WinMax through-spindle coolant (matches the verified HurcoV11 engine).
      // Requires TSC hardware on the VM30i (flagged in the setup sheet). M89-off is
      // UNVERIFIED, so the all-coolant-off M9 at the next tool change / onClose ends it.
      writeln("M88 (THROUGH-SPINDLE COOLANT)");
    }
  }

  // Work offset — WinMax supports G54-G59 only (6 fixtures); NO G54.1 Pn extended offsets.
  var wcs = currentSection.workOffset;
  if (wcs > 6) {
    writeComment("WARNING: WCS " + wcs + " EXCEEDS WINMAX 6-FIXTURE LIMIT (G54-G59) - VERIFY FIXTURE SETUP");
    wcs = 0; // do NOT silently emit a wrong/out-of-range offset (would run on the previous fixture)
  }
  if (wcs > 0) {
    // Collision guard: safe-Z retract before repositioning to a NEW fixture when no tool change occurred
    if (!insertToolCall && wcs !== currentWcs) {
      writeRetractZ();
      forceXYZ();
    }
    writeln(gFormat.format(53 + wcs));
    currentWcs = wcs;
  }

  forceXYZ();
  forceFeed();
}

function onRapid(x, y, z) {
  var block = {
    id: currentBlocks.length,
    move_type: "G0",
    x: x, y: y, z: z,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  var xStr = xOutput.format(x);
  var yStr = yOutput.format(y);
  var zStr = zOutput.format(z);
  if (xStr || yStr || zStr) {
    writeln(gMotionModal.format(0) + " " + xStr + " " + yStr + " " + zStr);
  }
}

function onLinear(x, y, z, feed) {
  var block = {
    id: currentBlocks.length,
    move_type: "G1",
    x: x, y: y, z: z,
    feed_mm_min: feed,
    spindle_rpm: spindleSpeed,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  writeln(
    gMotionModal.format(1) + " " +
    xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
    feedOutput.format(feed)
  );
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  var block = {
    id: currentBlocks.length,
    move_type: clockwise ? "G2" : "G3",
    x: x, y: y, z: z,
    feed_mm_min: feed,
    spindle_rpm: spindleSpeed,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  // allowedCircularPlanes = PLANE_XY (see config) means only XY-plane arcs reach here; the
  // kernel linearizes ZX/YZ arcs. So a single plane-correct IJK emission is safe for both
  // planar and helical-in-XY (Z-ramp) arcs — and for full circles (IJK, never R, at 360°).
  // Incremental I/J = vector from the arc start to the centre (cx-start.x, cy-start.y).
  var start = getCurrentPosition();
  var deltaI = cx - start.x;
  var deltaJ = cy - start.y;

  writeln(
    gMotionModal.format(clockwise ? 2 : 3) + " " +
    xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
    iOutput.format(deltaI) + " " + jOutput.format(deltaJ) + " " +
    feedOutput.format(feed)
  );
}

function onCycle() {
  writeln(gRetractModal.format(98));
}

function onCyclePoint(x, y, z) {
  // Probing cycles are metrology, not cutting — handle before the cutting switch (ISNC/BNC agnostic).
  if (String(cycleType).indexOf("probing") === 0) {
    if (properties.enableProbing) {
      writeProbeCycle(x, y, z);
    } else {
      writeComment("PROBING SKIPPED (enableProbing=off): " + cycleType);
    }
    return;
  }

  var F;
  var P = (cycle.dwell !== undefined) ? cycle.dwell : 0;

  if (properties.isnc) {
    // ═══ ISNC MODE (ISO-compatible) ═══
    switch (cycleType) {
      case "drilling":
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(81) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "counter-boring":
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(82) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "P" + secFormat.format(P) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "deep-drilling":
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(83) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "Q" + xyzFormat.format(cycle.incrementalDepth) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "chip-breaking":
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(73) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "Q" + xyzFormat.format(cycle.incrementalDepth) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "tapping":
      case "right-tapping":
        F = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
        if (properties.useG95forTapping) {
          writeln(gFeedModeModal.format(95));
          F = tool.getThreadPitch();
        }
        writeln(
          gRetractModal.format(98) + " " +
          gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 74 : 84) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "P" + secFormat.format(P) + " " +
          feedOutputPrecise.format(F)
        );
        if (properties.useG95forTapping) {
          writeln(gFeedModeModal.format(94));
        }
        forceFeed();
        break;

      case "left-tapping":
        F = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
        if (properties.useG95forTapping) {
          writeln(gFeedModeModal.format(95));
          F = tool.getThreadPitch();
        }
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(74) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "P" + secFormat.format(P) + " " +
          feedOutputPrecise.format(F)
        );
        if (properties.useG95forTapping) {
          writeln(gFeedModeModal.format(94));
        }
        forceFeed();
        break;

      case "tapping-with-chip-breaking":
      case "right-tapping-with-chip-breaking":
      case "left-tapping-with-chip-breaking":
        // G84.2 / G84.3 rigid tap with chip-break (Hurco-specific)
        F = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
        if (properties.useG95forTapping) {
          writeln(gFeedModeModal.format(95));
          F = tool.getThreadPitch();
        }
        writeln(
          gRetractModal.format(98) + " " +
          gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 84.3 : 84.2) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "Q" + xyzFormat.format(cycle.incrementalDepth) + " " +
          "P" + secFormat.format(P) + " " +
          feedOutputPrecise.format(F)
        );
        if (properties.useG95forTapping) {
          writeln(gFeedModeModal.format(94));
        }
        forceFeed();
        break;

      // Boring-cycle family — VERIFIED PORT of HURCO-VM30i-Ai-Enhanced.cps (the cited production post).
      // ISNC branch only (BNC routes every cycle through expandCyclePoint above). G90 is active from safe-start.
      case "reaming":
        // G85 — feed in, feed OUT. A different retract feed than the cut feed cannot be expressed in a
        // canned cycle, so expand to explicit moves (matches the verified reference guard).
        if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
          expandCyclePoint(x, y, z);
          break;
        }
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(85) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "boring":
        // G89 — bore in / dwell / feed OUT (ALWAYS G89, per the verified reference — NOT conditional G85).
        if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
          expandCyclePoint(x, y, z);
          break;
        }
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(89) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "P" + secFormat.format(P) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "stop-boring":
        // G86 — bore, spindle STOP, rapid retract. G86 has NO dwell word, so expand if a dwell is requested.
        if (P > 0) {
          expandCyclePoint(x, y, z);
        } else {
          writeln(
            gRetractModal.format(98) + " " + gCycleModal.format(86) + " " +
            getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
            feedOutput.format(cycle.feedrate)
          );
        }
        break;

      case "manual-boring":
        // G88 — bore, dwell, spindle stop, MANUAL retract (ISNC only; BNC G88 = rigid tap, routed to expand above).
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(88) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "P" + secFormat.format(P) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "fine-boring":
        // G76 — oriented stop + shift AWAY from the wall before rapid retract (no drag mark).
        // Verified reference word order: P (dwell) then Q (shift); cycle.shift passed raw (Fusion always provides it).
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(76) + " " +
          getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
          "P" + secFormat.format(P) + " " +
          "Q" + xyzFormat.format(cycle.shift) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      case "back-boring":
        // G87 — back bore. Offset X/Y/Z by backBoreDistance along the active plane; cycle.bottom is the retract.
        // Verified reference word order: Q (shift) then P (dwell).
        var dxBack = (gPlaneModal.getCurrent() == 19) ? cycle.backBoreDistance : 0;
        var dyBack = (gPlaneModal.getCurrent() == 18) ? cycle.backBoreDistance : 0;
        var dzBack = (gPlaneModal.getCurrent() == 17) ? cycle.backBoreDistance : 0;
        writeln(
          gRetractModal.format(98) + " " + gCycleModal.format(87) + " " +
          getCommonCycle(x - dxBack, y - dyBack, z - dzBack, cycle.bottom).join(" ") + " " +
          "Q" + xyzFormat.format(cycle.shift) + " " +
          "P" + secFormat.format(P) + " " +
          feedOutput.format(cycle.feedrate)
        );
        break;

      default:
        expandCyclePoint(x, y, z);
        break;
    }
  } else {
    // ═══ BNC MODE — expand all cycles to linear moves ═══
    expandCyclePoint(x, y, z);
  }
}

function onCycleEnd() {
  if (properties.isnc) {
    writeln(gCycleModal.format(80));
  }
}

function onSectionEnd() {
  // Cancel smoothing at end of operation
  if (properties.useSmoothing) {
    writeln("G05.3 P0");
  }

  currentOperation.blocks = currentBlocks;
  collectedOperations.push(currentOperation);
  forceAny();
}

function onClose() {
  // Coolant off
  writeln("M9");
  // Spindle stop
  writeln("M5");
  // Retract Z
  writeRetractZ();

  // Setup sheet
  if (properties.includeSetupSheet) {
    writeSetupSheet();
  }

  // Analytics
  if (properties.includeAnalytics) {
    writeAnalytics();
  }

  // Program end
  writeln("M30");
  writeln("%");

  // Sidecar JSON
  writeSidecarJSON();
}

// ═══════════════════════════════════════════════════════════════════
// SETUP SHEET
// ═══════════════════════════════════════════════════════════════════

function writeSetupSheet() {
  writeComment("═══ SETUP SHEET ═══");
  writeComment("Program: O" + ("00000" + properties.programNumber).slice(-5));
  writeComment("Machine: Hurco VM30i");
  writeComment("Control: WinMax / MAX5");
  writeComment("Material: " + getMaterialName());
  writeComment("Mode: " + (properties.isnc ? "ISNC" : "BNC"));
  writeComment("Smoothing: " + (properties.useSmoothing ? "G05.3 ON" : "OFF"));
  writeComment("Z Retract: " + (properties.useM140 ? "M140 MB1" : "G53 G0 Z0"));
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
    writeComment("  OP" + (j + 1) + ": " + (op.name || op.type) + " T" + op.tool_number);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════

function writeAnalytics() {
  writeComment("═══ PRISM ANALYTICS ═══");
  writeComment("Aggressiveness: " + properties.aggressiveness + "%");
  writeComment("Target: " + properties.optimizationTarget);
  writeComment("Chip thinning: " + (properties.enableChipThinning ? "ON" : "OFF"));
  writeComment("Stability lobes: " + (properties.enableStabilityLobes ? "ON" : "OFF"));

  var totalBlocks = 0;
  for (var i = 0; i < collectedOperations.length; i++) {
    totalBlocks += collectedOperations[i].blocks.length;
  }
  writeComment("Total blocks: " + totalBlocks);
}

// ═══════════════════════════════════════════════════════════════════
// SIDECAR JSON EXPORT
// ═══════════════════════════════════════════════════════════════════

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
    post_version: "2.1.0",
    controller: "hurco_max5",
    machine: "Hurco VM30i",
    operations: collectedOperations,
    tools: deduplicateTools(collectedTools),
    material: { name: getMaterialName() },
    aggressiveness: properties.aggressiveness / 100.0,
    optimization_target: properties.optimizationTarget,
    stages: {
      chip_thinning: properties.enableChipThinning,
      stability_lobes: properties.enableStabilityLobes,
    },
    hurco_features: {
      isnc_mode: properties.isnc,
      m140_retract: properties.useM140,
      smoothing: properties.useSmoothing,
      smoothing_values: {
        rough: properties.smoothingRoughValue,
        semi_finish: properties.smoothingSemiFinishValue,
        finish: properties.smoothingFinishValue,
      },
    },
    debug: properties.debugMode,
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
// 2. Operation comment JSON: {prism:{force, power, confidence, ...}}
// 3. Sidecar JSON: exported for offline PRISM pipeline optimization
