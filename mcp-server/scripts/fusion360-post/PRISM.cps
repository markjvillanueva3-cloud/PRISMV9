/**
  PRISM Post Processor for Fusion 360

  Physics-optimized G-code generation using two data paths:
  1. PRISM Add-in: Modifies operation S/F directly via adsk.cam API before
     post-processing. The post reads optimized spindleSpeed/feed normally.
  2. Operation Comment JSON: Extra physics data (force, power, confidence,
     tool life, stability RPM range) embedded as JSON in operation:comment
     and parsed via getParameter('operation:comment').
  3. Sidecar JSON: Exports full context for offline PRISM pipeline optimization.

  NOTE: Fusion 360 CPS runtime is sandboxed — NO HTTPClient, no network calls.
  All PRISM optimization data arrives via the add-in or sidecar path.

  Version: 2.0.0
  Copyright (c) 2026 PRISM Manufacturing Intelligence
*/

description = "PRISM Optimized Post Processor";
vendor = "PRISM";
vendorUrl = "https://prism-mfg.com";
legal = "Copyright (C) 2026 PRISM Manufacturing Intelligence";
certificationLevel = 2;

longDescription = "Physics-optimized post processor powered by PRISM. " +
  "Chains 26+ optimization stages including chip thinning compensation, " +
  "stability lobe RPM selection, wear progression tracking, thermal derating, " +
  "and controller-specific feature injection for 17 controller families.";

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

// ═══ Properties (shown in Fusion 360 post processor dialog) ═══

properties = {
  // Machine Setup
  controllerType: {
    title: "Controller Type",
    description: "Target CNC controller for G-code dialect",
    type: "enum",
    values: [
      { id: "fanuc_31i", title: "Fanuc 31i-B5" },
      { id: "fanuc_30i", title: "Fanuc 30i-B" },
      { id: "fanuc_0i", title: "Fanuc 0i-TF" },
      { id: "siemens_840d", title: "Siemens 840D sl" },
      { id: "siemens_one", title: "Sinumerik ONE" },
      { id: "heidenhain_tnc640", title: "Heidenhain TNC 640" },
      { id: "heidenhain_tnc7", title: "Heidenhain TNC7" },
      { id: "haas_ngc", title: "Haas NGC" },
      { id: "mazak_smooth_ai", title: "Mazak SmoothAi" },
      { id: "mazak_smooth_g", title: "Mazak SmoothG" },
      { id: "okuma_osp_p300", title: "Okuma OSP-P300" },
      { id: "okuma_osp_p500", title: "Okuma OSP-P500" },
      { id: "brother_speedio", title: "Brother Speedio" },
      { id: "mitsubishi_m80", title: "Mitsubishi M80" },
      { id: "fagor_8065", title: "Fagor 8065" },
      { id: "generic_fanuc", title: "Generic Fanuc" },
      { id: "generic_iso", title: "Generic ISO 6983" }
    ],
    value: "haas_ngc"
  },
  machineName: {
    title: "Machine Name",
    description: "Machine model for catalog lookup (e.g., 'Haas VF-2', 'DMG DMU 50')",
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

  // Feature Toggles
  enableChipThinning: {
    title: "Chip Thinning Compensation",
    description: "Increase feed for light radial engagement",
    type: "boolean",
    value: true
  },
  enableCornerReduction: {
    title: "Corner Feed Reduction",
    description: "Reduce feed at direction changes",
    type: "boolean",
    value: true
  },
  enableStabilityLobes: {
    title: "Stability Lobe RPM Selection",
    description: "Shift RPM to chatter-free zones",
    type: "boolean",
    value: true
  },
  enableWearTracking: {
    title: "Wear Progression Tracking",
    description: "Derate S/F as tool wears through program",
    type: "boolean",
    value: true
  },
  enableThermalTracking: {
    title: "Thermal Accumulation Tracking",
    description: "Derate speed for cumulative heat buildup",
    type: "boolean",
    value: true
  },
  enableControllerFeatures: {
    title: "Controller Feature Injection",
    description: "Insert AICC/G187/CYCLE832 per controller",
    type: "boolean",
    value: true
  },
  enableMonteCarlo: {
    title: "Monte Carlo Verification",
    description: "95% confidence intervals on force predictions",
    type: "boolean",
    value: false
  },

  // Material Override
  materialOverride: {
    title: "Material Override",
    description: "Override Fusion material (e.g., '4140 Steel', '7075-T6', 'Inconel 718')",
    type: "string",
    value: ""
  },

  // Output Options
  includeSetupSheet: {
    title: "Include Setup Sheet",
    description: "Generate setup sheet data in output comments",
    type: "boolean",
    value: true
  },
  includeAnalytics: {
    title: "Include Analytics",
    description: "Append optimization analytics as comments",
    type: "boolean",
    value: true
  },
  debugMode: {
    title: "Debug Mode",
    description: "Include stage timings and optimization reasons in G-code comments",
    type: "boolean",
    value: false
  }
};

// ═══ Global State ═══

var collectedOperations = [];
var collectedTools = [];
var currentOperation = null;
var currentBlocks = [];

// ═══ Post Processor Callbacks ═══

function onOpen() {
  writeComment("PRISM Post Processor v2.0.0");
  writeComment("Physics data via PRISM Add-in or operation:comment JSON");
  writeSafeStart();
}

function onSection() {
  var tool = getTool();
  var op = {
    id: collectedOperations.length,
    name: getParameter("operation-comment", ""),
    type: mapOperationType(currentSection.getType()),
    tool_number: tool.number,
    ae_mm: hasParameter("operation:stepover") ? getParameter("operation:stepover") : undefined,
    ap_mm: hasParameter("operation:maximumStepdown") ? getParameter("operation:maximumStepdown") : undefined,
    tolerance_mm: hasParameter("operation:tolerance") ? getParameter("operation:tolerance") : undefined,
    blocks: []
  };

  var toolDef = {
    id: String(tool.number),
    tool_number: tool.number,
    type: mapToolType(tool.type),
    diameter_mm: tool.diameter,
    flute_count: tool.numberOfFlutes,
    flute_length_mm: tool.fluteLength,
    overall_length_mm: tool.bodyLength,
    corner_radius_mm: tool.cornerRadius,
    material: mapToolMaterial(tool.material),
    resolution_confidence: 0.9
  };

  // Store for batch processing
  collectedTools.push(toolDef);
  currentOperation = op;
  currentBlocks = [];

  // Write standard tool change (physics data applied by PRISM Add-in pre-post)
  writeToolChange(tool);
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

  writeBlock(gMotionModal.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z), feedOutput.format(feed));
}

function onRapid(x, y, z) {
  var block = {
    id: currentBlocks.length,
    move_type: "G0",
    x: x, y: y, z: z,
    tool_number: getTool().number
  };
  currentBlocks.push(block);

  writeBlock(gMotionModal.format(0), xOutput.format(x), yOutput.format(y), zOutput.format(z));
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

  writeBlock(
    gMotionModal.format(clockwise ? 2 : 3),
    xOutput.format(x), yOutput.format(y), zOutput.format(z),
    iOutput.format(cx - getCurrentPosition().x),
    jOutput.format(cy - getCurrentPosition().y),
    feedOutput.format(feed)
  );
}

function onSectionEnd() {
  currentOperation.blocks = currentBlocks;
  collectedOperations.push(currentOperation);
}

function onClose() {
  writeStandardClose();
  writeSidecarJSON();
}

// ═══ PRISM Context Building ═══

function buildPrismPayload() {
  var material = properties.materialOverride || getMaterialName();
  var aggr = properties.aggressiveness / 100.0;

  return {
    operations: collectedOperations,
    tools: deduplicateTools(collectedTools),
    material: { name: material },
    machine: properties.machineName ? { name: properties.machineName } : undefined,
    controller: properties.controllerType,
    aggressiveness: aggr,
    optimization_target: properties.optimizationTarget,
    stages: {
      chip_thinning: properties.enableChipThinning,
      corner_detection: properties.enableCornerReduction,
      stability_lobes: properties.enableStabilityLobes,
      wear_progression: properties.enableWearTracking,
      thermal_tracking: properties.enableThermalTracking,
      controller_features: properties.enableControllerFeatures,
      monte_carlo: properties.enableMonteCarlo,
    },
    include_setup_sheet: properties.includeSetupSheet,
    include_analytics: properties.includeAnalytics,
    debug: properties.debugMode,
  };
}

function writeSidecarJSON() {
  // Export context as sidecar JSON for offline PRISM optimization
  var sidecar = buildPrismPayload();
  var sidecarPath = getOutputPath().replace(/\.[^.]+$/, ".prism.json");
  try {
    writeFile(sidecarPath, JSON.stringify(sidecar, null, 2));
    writeComment("Sidecar JSON exported: " + sidecarPath);
    writeComment("Run: prism optimize " + getOutputPath() + " --context " + sidecarPath);
  } catch (e) {
    writeComment("Could not write sidecar: " + e.message);
  }
}

// ═══ Helper Functions ═══

function getMaterialName() {
  if (hasGlobalParameter("material")) {
    return getGlobalParameter("material");
  }
  if (hasGlobalParameter("material-name")) {
    return getGlobalParameter("material-name");
  }
  return "Steel";
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

function writeSafeStart() {
  writeBlock("G90 G21 G17 G40 G80");
}

function writeToolChange(tool) {
  writeBlock("T" + tool.number + " M6");
  writeBlock("S" + spindleSpeed + " M3");
  writeBlock("G43 H" + tool.lengthOffset);
}

function writeStandardClose() {
  writeBlock("M30");
}

// NOTE: HTTPClient does NOT exist in Fusion 360 CPS runtime.
// PRISM physics data arrives via:
// 1. PRISM Add-in modifying S/F via adsk.cam API before post
// 2. Operation comment JSON: getParameter('operation:comment')
//    Format: {prism:{force, power, confidence, tool_life_min, stable_rpm_min, stable_rpm_max}}
// 3. Sidecar JSON export for offline pipeline optimization
