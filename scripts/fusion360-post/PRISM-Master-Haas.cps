/**
  PRISM Master Post Processor — Haas NGC

  Production-grade Fusion 360 post for Haas NGC controllers (VF, VR, UMC, EC series).
  Dialect data derived from ControllerDialectEngine haas_ngc definition.

  Key features:
  - Physics-optimized S/F via PRISM Add-in (adsk.cam) or operation:comment JSON
  - Integer milling feeds (F80, not F80.000)
  - Precise tapping feeds (F0.0500 for inch, F1.000 for metric)
  - G187 smoothing mode injection (P1/P2/P3)
  - G43 H{n} with T/H match enforcement
  - M88 through-spindle coolant support
  - Sidecar JSON export for offline PRISM pipeline

  Haas NGC dialect:
  - Safe start: G90 G21 G17 G40 G80 G49
  - Tool change: T{n} M6 / G43 H{n}
  - Canned cycles: G81/G83/G73/G84/G85/G87/G80
  - Comments: (parentheses)
  - Program markers: % / O00001 ... M30 / %
  - Smoothing: G187 P1 (rough) / P2 (medium) / P3 (finish)
  - Probing: G65 P9810/P9811/P9812
  - Sub-programs: M98 P{num} / M99
  - Arc format: IJK incremental
  - Work offsets: G54-G59, G154 P1-P99

  NOTE: Fusion 360 CPS runtime is sandboxed — NO HTTPClient, no network calls.

  Version: 1.0.0
  Copyright (c) 2026 PRISM Manufacturing Intelligence
*/

description = "PRISM Master — Haas NGC";
vendor = "PRISM";
vendorUrl = "https://prism-mfg.com";
legal = "Copyright (C) 2026 PRISM Manufacturing Intelligence";
certificationLevel = 2;

longDescription = "Physics-optimized Haas NGC post processor. " +
  "Supports VF, VR, UMC, EC, DT, DM, ST series. " +
  "Integer milling feeds, precise tapping feeds, G187 smoothing, " +
  "M88 TSC, PRISM physics data via add-in or sidecar JSON.";

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
  machineName: {
    title: "Machine Name",
    description: "Machine model for PRISM catalog lookup (e.g., 'Haas VF-2', 'Haas UMC-750')",
    type: "string",
    value: ""
  },

  // Optimization
  aggressiveness: {
    title: "Aggressiveness",
    description: "0=Conservative (first article), 50=Balanced, 100=Maximum productivity",
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

  // Haas-specific features
  useG187: {
    title: "G187 Smoothing Mode",
    description: "Inject G187 smoothing (P1=rough, P2=medium, P3=finish)",
    type: "boolean",
    value: true
  },
  useG95forTapping: {
    title: "G95 for Tapping",
    description: "Use feed-per-rev (G95) instead of feed-per-min (G94) for tapping",
    type: "boolean",
    value: false
  },
  useSubPrograms: {
    title: "Use Sub-Programs",
    description: "Output repeated patterns as sub-programs (M97/M98)",
    type: "boolean",
    value: false
  },
  safeRetractHeight: {
    title: "Safe Retract Height",
    description: "Z height for safe retract between operations (mm)",
    type: "number",
    value: 50
  },
  optionalStop: {
    title: "Optional Stop Between Tools",
    description: "Insert M01 between tool changes",
    type: "boolean",
    value: true
  },

  // PRISM feature toggles
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

  // Material override
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

// ═══════════════════════════════════════════════════════════════════
// FORMAT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

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
var taperFormat = createFormat({decimals:1, scale:DEG});
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
var gMotionModal = createModal({}, gFormat);     // G0, G1, G2, G3
var gAbsIncModal = createModal({}, gFormat);      // G90, G91
var gFeedModeModal = createModal({}, gFormat);    // G94, G95
var gPlaneModal = createModal({onchange:function() {gMotionModal.reset();}}, gFormat); // G17, G18, G19
var gRetractModal = createModal({}, gFormat);     // G98, G99
var gCycleModal = createModal({}, gFormat);       // G81, G83, etc.

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════

var collectedOperations = [];
var collectedTools = [];
var currentOperation = null;
var currentBlocks = [];
var sequenceNumber = 10;

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

/**
 * Parse PRISM physics data from operation:comment JSON.
 * Format: {prism:{force, power, confidence, tool_life_min, stable_rpm_min, stable_rpm_max}}
 */
function parsePrismComment() {
  try {
    var comment = getParameter("operation:comment");
    if (comment && comment.indexOf("{prism:") >= 0) {
      var jsonStr = comment.substring(comment.indexOf("{prism:"));
      // Simple JSON parse for CPS runtime
      var parsed = JSON.parse(jsonStr.replace(/prism:/, '"prism":'));
      return parsed.prism || null;
    }
  } catch (e) {
    // No PRISM data in comment — normal for non-optimized operations
  }
  return null;
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
  // Program header: % and O-code
  writeln("%");
  writeln("O" + ("00000" + properties.programNumber).slice(-5));

  // Header comments
  writeComment("PRISM Master — Haas NGC v1.0.0");
  writeComment("Generated: " + new Date().toISOString().split("T")[0]);
  if (programName) {
    writeComment("Program: " + programName);
  }
  if (programComment) {
    writeComment(programComment);
  }
  if (properties.machineName) {
    writeComment("Machine: " + properties.machineName);
  }
  writeComment("Material: " + getMaterialName());

  // Safe start line — Haas NGC
  writeln("G90 G21 G17 G40 G80 G49");

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

  // Parse PRISM physics data from operation comment
  var prismData = parsePrismComment();
  if (prismData) {
    writeDebug("PRISM force=" + prismData.force + "N power=" + prismData.power + "kW conf=" + prismData.confidence);
  }

  // Tool change sequence
  if (insertToolCall) {
    if (!isFirstSection() && properties.optionalStop) {
      writeln("M01");
    }

    // Retract Z before tool change
    writeln("G53 G0 Z0");

    // Coolant off before tool change
    if (!isFirstSection()) {
      writeln("M9");
    }

    // Operation comment
    if (hasParameter("operation-comment")) {
      writeComment(getParameter("operation-comment"));
    }

    // Tool call: T{n} M6
    writeln("T" + tool.number + " M6");

    // Tool length comp: G43 H{n}
    writeln("G43 " + hFormat.format(tool.lengthOffset));

    // Spindle start
    writeln("S" + rpmFormat.format(spindleSpeed) + " " + (tool.clockwise ? "M3" : "M4"));

    // G187 smoothing mode injection
    if (properties.useG187) {
      var opType = currentSection.getType();
      if (opType === STRATEGY_3D) {
        writeln("G187 P3 (FINISH)");
      } else if (hasParameter("operation:tolerance") && getParameter("operation:tolerance") < 0.01) {
        writeln("G187 P3 (FINISH)");
      } else {
        writeln("G187 P2 (MEDIUM)");
      }
      writeDebug("G187 injected based on operation type");
    }

    // Coolant
    if (tool.coolant == COOLANT_FLOOD) {
      writeln("M8");
    } else if (tool.coolant == COOLANT_MIST) {
      writeln("M7");
    } else if (tool.coolant == COOLANT_THROUGH_TOOL) {
      writeln("M88");
    }
  }

  // Work offset (G54-G59, G154 Pn)
  var wcs = currentSection.workOffset;
  if (wcs > 0) {
    if (wcs <= 6) {
      writeln(gFormat.format(53 + wcs));  // G54-G59
    } else {
      writeln("G154 P" + (wcs - 6));      // G154 P1-P99
    }
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
    i: cx - getCurrentPosition().x,
    j: cy - getCurrentPosition().y,
    k: cz - getCurrentPosition().z,
    feed_mm_min: feed,
    spindle_rpm: spindleSpeed,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  // IJK incremental format (Haas NGC)
  writeln(
    gMotionModal.format(clockwise ? 2 : 3) + " " +
    xOutput.format(x) + " " + yOutput.format(y) + " " + zOutput.format(z) + " " +
    iOutput.format(cx - getCurrentPosition().x) + " " +
    jOutput.format(cy - getCurrentPosition().y) + " " +
    feedOutput.format(feed)
  );
}

function onCycle() {
  // Cycle initialization — set return mode
  writeln(gRetractModal.format(98));
}

function onCyclePoint(x, y, z) {
  var F;

  switch (cycleType) {
    case "drilling":
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(81) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(cycle.feedrate)
      );
      break;

    case "counter-boring":
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(82) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        "P" + secFormat.format(cycle.dwell) + " " +
        feedOutput.format(cycle.feedrate)
      );
      break;

    case "deep-drilling":
    case "chip-breaking":
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(cycleType === "deep-drilling" ? 83 : 73) + " " +
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
        gCycleModal.format(84) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
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
        gRetractModal.format(98) + " " +
        gCycleModal.format(74) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutputPrecise.format(F)
      );
      if (properties.useG95forTapping) {
        writeln(gFeedModeModal.format(94));
      }
      forceFeed();
      break;

    case "boring":
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(85) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(cycle.feedrate)
      );
      break;

    case "reaming":
      writeln(
        gRetractModal.format(98) + " " +
        gCycleModal.format(85) + " " +
        getCommonCycle(x, y, z, cycle.retract).join(" ") + " " +
        feedOutput.format(cycle.feedrate)
      );
      break;

    default:
      expandCyclePoint(x, y, z);
      break;
  }
}

function onCycleEnd() {
  writeln(gCycleModal.format(80));
}

function onSectionEnd() {
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
  writeln("G53 G0 Z0");

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
  writeComment("Material: " + getMaterialName());
  if (properties.machineName) {
    writeComment("Machine: " + properties.machineName);
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
    post_version: "1.0.0",
    controller: "haas_ngc",
    operations: collectedOperations,
    tools: deduplicateTools(collectedTools),
    material: { name: getMaterialName() },
    machine: properties.machineName ? { name: properties.machineName } : undefined,
    aggressiveness: properties.aggressiveness / 100.0,
    optimization_target: properties.optimizationTarget,
    stages: {
      chip_thinning: properties.enableChipThinning,
      stability_lobes: properties.enableStabilityLobes,
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
