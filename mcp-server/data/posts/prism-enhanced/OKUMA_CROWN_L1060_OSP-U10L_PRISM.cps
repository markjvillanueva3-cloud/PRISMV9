/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor
  ============================================================================
  Machine: Okuma Crown L1060
  Manufacturer: Okuma
  Control: OSP-U10L
  Type: Precision 2-Axis CNC Lathe (Turning Only)
  ============================================================================
  PRISM OPTIMIZED TURNING TECHNOLOGY

  Precision lathe - excellent for finish turning. OSP-U10L has basic macro
  support and tool life management. Between LNC and P300 in capability.
  Well-suited for tight-tolerance OD/ID turning, facing, and threading.

  Machine Specifications:
    - Max Spindle Speed: 4500 RPM
    - Spindle Motor: 15 kW / 340 Nm continuous
    - Chuck Size: 10" (254 mm) hydraulic 3-jaw
    - Turret: 12-station VDI40 turret (static tools only)
    - C-Axis: NOT INSTALLED
    - Y-Axis: NOT INSTALLED
    - Live Tooling: NOT INSTALLED
    - Max Turning Diameter: 380 mm
    - Max Turning Length: 600 mm
    - Bar Capacity: 65 mm
    - Tailstock: Programmable hydraulic
    - Coolant: High-pressure flood coolant (3.5 MPa)
    - Bed Type: Slant bed, precision ground box ways
    - Spindle Bearing: High-precision angular contact, P4 class
    - Spindle Runout: < 0.003 mm TIR

  Controller Features (OSP-U10L):
    - Absolute/incremental programming
    - Canned cycles: G70-G76, G83, G84, G181-G189 (drilling), G85 (stock removal)
    - Custom macro B compatible (128 variables)
    - Basic tool life management (up to 400 tools)
    - Basic thermal compensation (single-axis)
    - NO collision avoidance system
    - Standard acceleration/deceleration with S-curve
    - Basic contour smoothing for finish passes
    - 256KB program memory
    - DNC interface available

  Supported G-Codes (OSP-U10L):
    G00  - Rapid positioning
    G01  - Linear interpolation
    G02  - Circular interpolation CW
    G03  - Circular interpolation CCW
    G04  - Dwell
    G10  - Data setting (tool offsets programmable)
    G20  - Inch mode
    G21  - Metric mode
    G28  - Return to reference point
    G32  - Thread cutting (single pass, speed-feed synchronized)
    G33  - Thread cutting (G33 single-pass variant)
    G40  - Tool nose radius compensation cancel
    G41  - Tool nose radius compensation left
    G42  - Tool nose radius compensation right
    G50  - Max spindle speed clamp / coordinate system setting
    G70  - Finishing cycle
    G71  - OD/ID roughing cycle (Type I / Type II)
    G72  - Face roughing cycle
    G73  - Pattern repeating cycle
    G74  - Peck drilling cycle (face)
    G75  - Grooving cycle (OD/ID)
    G76  - Threading cycle (multi-pass)
    G80  - Cancel canned cycle
    G81  - Profile roughing cycle (subprogram referenced)
    G82  - Vertical pass roughing cycle
    G83  - Deep hole drilling cycle (peck)
    G84  - Tapping cycle (rigid tap)
    G85  - Stock removal turning cycle (PRISM-critical: NAT subprogram reference)
    G96  - Constant surface speed (CSS)
    G97  - Constant RPM
    G98  - Feed per minute
    G99  - Feed per revolution
    G181 - Drilling canned cycle
    G182 - Counter-boring / deep drilling canned cycle
    G183 - Chip-breaking drill cycle
    G184 - Tapping cycle (alternative)
    G189 - Reaming / boring cycle
    NOTE: G112 (Y-axis interpolation) NOT available
    NOTE: G12.1/G13.1 (polar interpolation) NOT available - no C-axis
    NOTE: G87 (side drilling) NOT available - no live tooling

  Supported M-Codes (OSP-U10L):
    M00  - Program stop
    M01  - Optional stop
    M02  - Program end
    M03  - Spindle forward
    M04  - Spindle reverse
    M05  - Spindle stop
    M08  - Coolant ON (flood)
    M09  - Coolant OFF
    M10  - Chuck clamp
    M11  - Chuck unclamp
    M13  - Spindle CW + coolant ON
    M14  - Spindle CCW + coolant ON
    M30  - Program end and rewind
    M36  - Tailstock advance
    M37  - Tailstock retract
    M38  - Tailstock quill thrust ON
    M39  - Tailstock quill thrust OFF
    M41  - Spindle range low
    M42  - Spindle range high
    M68  - Chuck clamp (high pressure)
    M69  - Chuck unclamp
    M98  - Subprogram call
    M99  - Subprogram return
    NOTE: No live tool M-codes (M23/M24/M25) - no live tooling
    NOTE: No C-axis M-codes (M83/M84) - no C-axis

  ============================================================================
  PRISM PHYSICS REFERENCE

  Kienzle Force Model (Turning):
    Fc = kc1.1 * ap * f^(1-mc)
    Where:
      Fc    = Main cutting force (N)
      kc1.1 = Specific cutting force at 1mm^2 cross-section (N/mm^2)
      ap    = Depth of cut (mm)
      f     = Feed per revolution (mm/rev)
      mc    = Kienzle exponent (material-dependent, typically 0.17-0.35)

    NOTE: Precision machine with excellent rigidity and high torque (340 Nm).
    The Crown L1060 spindle bearing configuration (P4 class angular contact)
    provides superior runout for finish turning. PRISM leverages the high
    torque for productive roughing and precision spindle for finish passes.

  CSS Optimization:
    Vc = pi * D * n / 1000
    G50 clamp: n_max = 1000 * Vc_max / (pi * D_min)
    Machine limit: 4500 RPM
    NOTE: OSP-U10L has S-curve acceleration. CSS transitions are smoother
    than LNC legacy but not as responsive as P300. Safe for moderate-speed
    face cutting at reasonable diameters (>20mm).

  Tool Life (Extended Taylor Equation):
    T = C / (Vc^n * f^a * ap^b)
    NOTE: OSP-U10L has basic tool life management (400 tools).
    PRISM Taylor model supplements controller TLM with physics-based
    prediction and cross-references controller tool life counters.

  Power Consumption Model:
    Pc = (Fc * Vc) / (60 * 1000 * eta)
    Machine limit: 15 kW continuous
    High torque (340 Nm) allows deep cuts at moderate speeds.

  Surface Finish Model (Theoretical Ra):
    Ra = f^2 / (32 * r_epsilon)  [mm -> convert * 1000 for um]
    Crown L1060 spindle runout < 0.003mm TIR enables Ra 0.4-0.8 um.

  Material Group Speed Recommendations (Carbide, coated):
    ISO P (Steel):        Vc 180-320 m/min, f 0.15-0.45 mm/rev
    ISO M (Stainless):    Vc 120-240 m/min, f 0.10-0.35 mm/rev
    ISO K (Cast Iron):    Vc 150-380 m/min, f 0.15-0.50 mm/rev
    ISO N (Non-ferrous):  Vc 300-1200 m/min, f 0.10-0.40 mm/rev
    ISO S (Super alloys): Vc 25-75 m/min,   f 0.08-0.22 mm/rev
    ISO H (Hard steel):   Vc 80-180 m/min,  f 0.05-0.20 mm/rev
    NOTE: Precision machine excels at finish passes. For finish turning:
    use lower ap (0.1-0.3mm), higher Vc, and fine feeds (0.05-0.15 mm/rev).

  ============================================================================
*/

description = "PRISM Enhanced - Okuma Crown L1060";
vendor = "Okuma";
vendorUrl = "https://www.okuma.com";
legal = "Copyright (C) 2026 PRISM Manufacturing Intelligence";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "PRISM-enhanced post processor for the Okuma Crown L1060 precision 2-axis CNC lathe. " +
  "OSP-U10L controller with basic macro B support (128 variables) and tool life management (400 tools). " +
  "12-station VDI40 turret with static tools only - no live tooling, no C-axis, no Y-axis. " +
  "High rigidity box way construction with precision spindle (P4 class, <0.003mm TIR) and " +
  "excellent torque (340Nm) for both heavy roughing and precision finish turning. " +
  "PRISM provides physics-based optimization using Kienzle force model and Taylor tool life " +
  "monitoring that supplements the controller basic TLM. Surface finish optimizer targets Ra 0.4-1.6 um. " +
  "Supports OD/ID turning, facing, grooving, threading (G33/G71), drilling (G181-G189), " +
  "stock removal (G85), tapping, and part-off operations.";

extension = "min";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_TURNING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = false;
allowedCircularPlanes = 1 << PLANE_ZX; // ZX plane only - 2-axis lathe

// user-defined properties
properties = {
  // --- PRISM Machine Configuration ---
  machineModel: {
    title      : "Machine Model",
    description: "Okuma Crown L1060 machine model identifier",
    group      : "prism",
    type       : "string",
    value      : "CROWN-L1060",
    scope      : "post"
  },
  controllerModel: {
    title      : "Controller",
    description: "OSP-U10L controller generation",
    group      : "prism",
    type       : "string",
    value      : "OSP-U10L",
    scope      : "post"
  },
  spindlePower: {
    title      : "Spindle Power (kW)",
    description: "Main spindle continuous power rating",
    group      : "prism",
    type       : "number",
    value      : 15.0,
    scope      : "post"
  },
  spindleTorque: {
    title      : "Spindle Torque (Nm)",
    description: "Main spindle maximum continuous torque - high torque for heavy roughing",
    group      : "prism",
    type       : "number",
    value      : 340.0,
    scope      : "post"
  },
  turretType: {
    title      : "Turret Type",
    description: "Turret interface standard",
    group      : "prism",
    type       : "string",
    value      : "VDI40",
    scope      : "post"
  },
  turretStations: {
    title      : "Turret Stations",
    description: "Number of tool stations on turret",
    group      : "prism",
    type       : "integer",
    value      : 12,
    scope      : "post"
  },
  // --- PRISM Finish Optimization ---
  prismOptimize: {
    title      : "PRISM Optimization",
    description: "Enable PRISM physics-based parameter optimization",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismToolLifeTracking: {
    title      : "PRISM Tool Life Tracking",
    description: "Enable PRISM Taylor-equation tool life monitoring (supplements U10L TLM)",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismSurfaceFinishTarget: {
    title      : "PRISM Surface Finish Target (Ra um)",
    description: "Target surface roughness for PRISM finish optimization",
    group      : "prism",
    type       : "number",
    value      : 1.6,
    scope      : "post"
  },
  finishPassMode: {
    title      : "Finish Pass Mode",
    description: "Optimize output for finish turning (reduced feed, higher Vc)",
    group      : "prism",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  finishFeedLimit: {
    title      : "Finish Feed Limit (mm/rev)",
    description: "Maximum feed rate during finish passes when finishPassMode is active",
    group      : "prism",
    type       : "number",
    value      : 0.15,
    scope      : "post"
  },
  // --- Base Post Properties ---
  writeMachine: {
    title      : "Write machine",
    description: "Output the machine settings in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  writeTools: {
    title      : "Write tool list",
    description: "Output a tool list in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  safePositionStyle: {
    title      : "Safe retract style",
    description: "Select your desired order for the axes to retract.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      {title:"Only X", id:"X"},
      {title:"Only Z", id:"Z"},
      {title:"Both X then Z", id:"XZ"},
      {title:"Both Z then X", id:"ZX"},
      {title:"Both same line", id:"singleLineXZ"}
    ],
    value: "XZ",
    scope: "post"
  },
  approachStyle: {
    title      : "Approach style",
    description: "Select your desired order for the axes to approach.",
    type       : "enum",
    group      : "preferences",
    values     : [
      {title:"First Z then X", id:"ZX"},
      {title:"Both XZ in same line", id:"singleLineXZ"}
    ],
    value: "singleLineXZ",
    scope: "post"
  },
  showSequenceNumbers: {
    title      : "Use sequence numbers",
    description: "'Yes' outputs sequence numbers on each block, 'Only on tool change' outputs sequence numbers on tool change blocks only, and 'No' disables the output of sequence numbers.",
    group      : "formats",
    type       : "enum",
    values     : [
      {title:"Yes", id:"true"},
      {title:"No", id:"false"},
      {title:"Only on tool change", id:"toolChange"}
    ],
    value: "true",
    scope: "post"
  },
  sequenceNumberStart: {
    title      : "Start sequence number",
    description: "The number at which to start the sequence numbers.",
    group      : "formats",
    type       : "integer",
    value      : 10,
    scope      : "post"
  },
  sequenceNumberIncrement: {
    title      : "Sequence number increment",
    description: "The amount by which the sequence number is incremented by in each block.",
    group      : "formats",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  optionalStop: {
    title      : "Optional stop",
    description: "Outputs optional stop code during when necessary in the code.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  separateWordsWithSpace: {
    title      : "Separate words with space",
    description: "Adds spaces between words if 'yes' is selected.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useRadius: {
    title      : "Radius arcs",
    description: "If yes is selected, arcs are outputted using radius values rather than IJK.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  maximumSpindleSpeed: {
    title      : "Max spindle speed",
    description: "Defines the maximum spindle speed allowed by the Crown L1060 (4500 RPM).",
    group      : "configuration",
    type       : "integer",
    range      : [0, 4500],
    value      : 4500,
    scope      : "post"
  },
  spindleRangeLow: {
    title      : "Low spindle speed range",
    description: "Defines the lower speed range. Enter '0' if machine is not geared.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999],
    value      : 1000,
    scope      : "post"
  },
  useParametricFeed: {
    title      : "Parametric feed",
    description: "Specifies the feed value that should be output using a Q value.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  showNotes: {
    title      : "Show notes",
    description: "Writes operation notes as comments in the outputted code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useSimpleThread: {
    title      : "Use simple threading",
    description: "Use G33 single-pass threading instead of G71 multi-pass cycle.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  homePositionX: {
    title      : "Home position X",
    description: "X-axis home position.",
    group      : "homePositions",
    type       : "number",
    value      : 380,
    scope      : "post"
  },
  homePositionZ: {
    title      : "Home position Z",
    description: "Z-axis home position.",
    group      : "homePositions",
    type       : "number",
    value      : 600,
    scope      : "post"
  }
};

var singleLineCoolant = false;
var coolants = [
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST},
  {id:COOLANT_THROUGH_TOOL},
  {id:COOLANT_AIR},
  {id:COOLANT_AIR_THROUGH_TOOL},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL},
  {id:COOLANT_OFF, off:9}
];

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-";

var gFormat = createFormat({prefix:"G", decimals:1});
var mFormat = createFormat({prefix:"M", decimals:1});

var spatialFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var xFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, scale:2}); // diameter mode
var yFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var zFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var rFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var feedFormat = createFormat({decimals:(unit == MM ? 4 : 5), forceDecimal:true});
var iFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, scale:1});
var toolFormat = createFormat({width:2, zeropad:true, decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:false});
var milliFormat = createFormat({decimals:0});
var taperFormat = createFormat({decimals:(unit == MM ? 3 : 4), scale:DEG});
var pitchFormat = createFormat({decimals:6, forceDecimal:true});

var xOutput; // defined in setDirectionX()
var yOutput = createVariable({prefix:"Y"}, yFormat);
var zOutput = createVariable({onchange:function() {retracted[Z] = false;}, prefix:"Z"}, zFormat);
var feedOutput = createVariable({prefix:"F"}, feedFormat);
var pitchOutput = createVariable({prefix:"F", force:true}, pitchFormat);
var sOutput = createVariable({prefix:"S", force:true}, rpmFormat);

var kOutput = createReferenceVariable({prefix:"K"}, spatialFormat);
var iOutput; // defined in setDirectionX()

var g92ROutput = createVariable({prefix:"R"}, zFormat);

var gMotionModal = createModal({}, gFormat);
var gPlaneModal = createModal({onchange:function () {gMotionModal.reset();}}, gFormat);
var gAbsIncModal = createModal({}, gFormat);
var gFeedModeModal = createModal({}, gFormat);
var gSpindleModeModal = createModal({}, gFormat);
var gUnitModal = createModal({}, gFormat);
var gCycleModal = createModal({}, gFormat);
var gRetractModal = createModal({}, gFormat);

var firstFeedParameter = 500;
var gotSecondarySpindle = false;
var gotTailStock = false;

var WARNING_WORK_OFFSET = 0;

var QCTP = 0;
var TURRET = 1;
var GANG = 2;

var FRONT = -1;
var REAR = 1;

// collected state
var sequenceNumber;
var currentWorkOffset;
var optionalSection = false;
var forceSpindleSpeed = false;
var activeMovements;
var currentFeedId;
var toolingData;
var previousToolingData;
var retracted = new Array(false, false, false);
var fpmCode = 94;
var fprCode = 95;
var isFinishPass = false;

// ============================================================================
// PRISM PHYSICS ENGINE INTERFACE — Okuma Crown L1060
// Precision 2-axis turning: 15kW / 340Nm, 4500 RPM max, P4 spindle bearing
// ============================================================================

/**
 * PRISM Kienzle force calculation for turning operations.
 * Crown L1060 variant: high torque (340Nm), precision spindle.
 *
 * @param {number} kc11 - Specific cutting force at 1mm^2 (N/mm^2)
 * @param {number} mc   - Kienzle exponent (0.17-0.35)
 * @param {number} ap   - Depth of cut (mm)
 * @param {number} f    - Feed per revolution (mm/rev)
 * @returns {number} Cutting force Fc in Newtons
 */
function prismCalculateCuttingForce(kc11, mc, ap, f) {
  if (ap <= 0 || f <= 0) {
    return 0;
  }
  var h = f; // chip thickness approximation for turning
  var Fc = kc11 * ap * Math.pow(h, (1 - mc));
  return Fc;
}

/**
 * PRISM CSS optimization - calculate optimal G50 clamp speed.
 * Crown L1060 max: 4500 RPM. U10L has S-curve accel for smooth transitions.
 *
 * @param {number} vc         - Target cutting speed (m/min)
 * @param {number} dMin       - Minimum cutting diameter (mm)
 * @param {number} machineMax - Machine max RPM
 * @returns {number} Recommended G50 clamp RPM
 */
function prismCalculateG50Clamp(vc, dMin, machineMax) {
  if (dMin <= 0) {
    return machineMax;
  }
  var nCalc = Math.round((1000 * vc) / (Math.PI * dMin));
  return Math.min(nCalc, machineMax);
}

/**
 * PRISM Taylor tool life estimation.
 * Crown L1060: supplements OSP-U10L basic TLM with physics prediction.
 */
function prismEstimateToolLife(C, vc, n, f, a, ap, b) {
  if (vc <= 0 || f <= 0 || ap <= 0) {
    return 0;
  }
  return C / (Math.pow(vc, n) * Math.pow(f, a) * Math.pow(ap, b));
}

/**
 * PRISM spindle power check.
 * Crown L1060: 15kW / 340Nm - excellent power/torque for a 2-axis lathe.
 */
function prismCheckSpindlePower(Fc, vc, availablePower) {
  var requiredPower = (Fc * vc) / (60 * 1000);
  var utilization = (requiredPower / availablePower) * 100;
  return {
    required: requiredPower,
    available: availablePower,
    utilization: utilization,
    safe: utilization <= 80
  };
}

/**
 * PRISM torque check.
 * Crown L1060: 340Nm continuous - validates torque budget for heavy cuts.
 */
function prismCheckSpindleTorque(Fc, diameter) {
  var requiredTorque = (Fc * diameter) / (2 * 1000);
  var utilization = (requiredTorque / getProperty("spindleTorque")) * 100;
  return {
    required: requiredTorque,
    available: getProperty("spindleTorque"),
    utilization: utilization,
    safe: utilization <= 80
  };
}

/**
 * PRISM surface finish estimator.
 * Theoretical Ra based on tool nose radius and feed rate.
 * Ra(th) = f^2 / (32 * r_epsilon)  [result in mm, multiply 1000 for um]
 *
 * @param {number} f          - Feed per revolution (mm/rev)
 * @param {number} noseRadius - Tool nose radius (mm)
 * @returns {number} Theoretical Ra in micrometers
 */
function prismEstimateSurfaceFinish(f, noseRadius) {
  if (f <= 0 || noseRadius <= 0) {
    return 0;
  }
  var Ra = (f * f) / (32 * noseRadius) * 1000;
  return Ra;
}

/**
 * PRISM finish pass feed optimizer.
 * Calculates maximum feed to achieve target surface finish.
 * f_max = sqrt(32 * r_epsilon * Ra_target / 1000)
 *
 * @param {number} targetRa   - Target surface roughness (um)
 * @param {number} noseRadius - Tool nose radius (mm)
 * @returns {number} Maximum feed rate (mm/rev) for target finish
 */
function prismOptimizeFinishFeed(targetRa, noseRadius) {
  if (targetRa <= 0 || noseRadius <= 0) {
    return 0.05;
  }
  var fMax = Math.sqrt(32 * noseRadius * targetRa / 1000);
  return Math.min(fMax, getProperty("finishFeedLimit"));
}

/**
 * Detect if the current section is a finishing operation.
 * Used to apply precision-optimized parameters and surface finish advisory.
 */
function detectFinishPass(section) {
  if (getProperty("finishPassMode")) {
    return true;
  }
  var stockToLeave = section.getParameter("stock-to-leave", undefined);
  if (stockToLeave !== undefined && stockToLeave <= 0) {
    return true;
  }
  var strategy = section.getParameter("operation-strategy", "");
  if (strategy.indexOf("finish") >= 0) {
    return true;
  }
  return false;
}

// ============================================================================
// BASE POST FUNCTIONS
// ============================================================================

function getCode(code) {
  switch (code) {
  case "START_MAIN_SPINDLE_CW":
    return mFormat.format(3);
  case "START_MAIN_SPINDLE_CCW":
    return mFormat.format(4);
  case "FEED_MODE_UNIT_REV":
    return gFeedModeModal.format(fprCode);
  case "FEED_MODE_UNIT_MIN":
    return gFeedModeModal.format(fpmCode);
  case "CONSTANT_SURFACE_SPEED_ON":
    return gSpindleModeModal.format(96);
  case "CONSTANT_SURFACE_SPEED_OFF":
    return gSpindleModeModal.format(97);
  default:
    error(localize("Command " + code + " is not defined."));
    return 0;
  }
}

function isSpindleSpeedDifferent() {
  if (isFirstSection()) {
    return true;
  }
  if (getPreviousSection().getTool().clockwise != tool.clockwise) {
    return true;
  }
  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    if ((getPreviousSection().getTool().getSpindleMode() != SPINDLE_CONSTANT_SURFACE_SPEED) ||
        rpmFormat.areDifferent(getPreviousSection().getTool().surfaceSpeed, tool.surfaceSpeed)) {
      return true;
    }
  } else {
    if ((getPreviousSection().getTool().getSpindleMode() != SPINDLE_CONSTANT_SPINDLE_SPEED) ||
        rpmFormat.areDifferent(getPreviousSection().getTool().spindleRPM, spindleSpeed)) {
      return true;
    }
  }
  return false;
}

function writeBlock() {
  if (getProperty("showSequenceNumbers") == "true") {
    if (optionalSection) {
      var text = formatWords(arguments);
      if (text) {
        writeWords("/", "N" + sequenceNumber, text);
      }
    } else {
      writeWords2("N" + sequenceNumber, arguments);
    }
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    if (optionalSection) {
      writeWords2("/", arguments);
    } else {
      writeWords(arguments);
    }
  }
}

function writeOptionalBlock() {
  if (getProperty("showSequenceNumbers") == "true") {
    var words = formatWords(arguments);
    if (words) {
      writeWords("/", "N" + sequenceNumber, words);
      sequenceNumber += getProperty("sequenceNumberIncrement");
    }
  } else {
    writeWords2("/", arguments);
  }
}

function formatComment(text) {
  return "(" + filterText(String(text).toUpperCase(), permittedCommentChars).replace(/[()]/g, "") + ")";
}

function writeToolBlock() {
  var show = getProperty("showSequenceNumbers");
  setProperty("showSequenceNumbers", (show == "true" || show == "toolChange") ? "true" : "false");
  writeBlock(arguments);
  setProperty("showSequenceNumbers", show);
}

function writeComment(text) {
  writeln(formatComment(text));
}

function onOpen() {
  if (getProperty("useRadius")) {
    maximumCircularSweep = toRad(90);
  }

  yOutput.disable();

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }

  sequenceNumber = getProperty("sequenceNumberStart");
  writeln("%");

  if (programName) {
    var programId = programName;
    writeComment(programId + "." + extension);
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  // PRISM machine identification header
  writeComment("PRISM ENHANCED - OKUMA CROWN L1060");
  writeComment("CONTROLLER: OSP-U10L");
  writeComment("TYPE: PRECISION 2-AXIS TURNING LATHE");
  writeComment("SPINDLE: 15KW / 340NM - P4 CLASS BEARING");
  if (getProperty("prismSurfaceFinishTarget") > 0) {
    writeComment("PRISM TARGET FINISH: RA " + getProperty("prismSurfaceFinishTarget") + " UM");
  }

  // machine configuration
  var vendorStr = machineConfiguration.getVendor();
  var modelStr = machineConfiguration.getModel();
  var descriptionStr = machineConfiguration.getDescription();

  if (getProperty("writeMachine") && (vendorStr || modelStr || descriptionStr)) {
    writeComment(localize("Machine"));
    if (vendorStr) {
      writeComment("  " + localize("vendor") + ": " + vendorStr);
    }
    if (modelStr) {
      writeComment("  " + localize("model") + ": " + modelStr);
    }
    if (descriptionStr) {
      writeComment("  " + localize("description") + ": " + descriptionStr);
    }
  }

  if (getProperty("writeTools")) {
    var zRanges = {};
    if (is3D()) {
      var numberOfSections = getNumberOfSections();
      for (var i = 0; i < numberOfSections; ++i) {
        var section = getSection(i);
        var zRange = section.getGlobalZRange();
        var tool = section.getTool();
        if (zRanges[tool.number]) {
          zRanges[tool.number].expandToRange(zRange);
        } else {
          zRanges[tool.number] = zRange;
        }
      }
    }

    var tools = getToolTable();
    if (tools.getNumberOfTools() > 0) {
      for (var i = 0; i < tools.getNumberOfTools(); ++i) {
        var tool = tools.getTool(i);
        var comment = "T" + toolFormat.format(tool.number) + " " +
          (tool.diameter != 0 ? "D=" + spatialFormat.format(tool.diameter) + " " : "") +
          (tool.isTurningTool() ? localize("NR") + "=" + spatialFormat.format(tool.noseRadius) : localize("CR") + "=" + spatialFormat.format(tool.cornerRadius)) +
          (tool.taperAngle > 0 && (tool.taperAngle < Math.PI) ? " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg") : "") +
          (zRanges[tool.number] ? " - " + localize("ZMIN") + "=" + spatialFormat.format(zRanges[tool.number].getMinimum()) : "") +
          " - " + localize(getToolTypeName(tool.type));
        writeComment(comment);
      }
    }
  }

  // Safe mode + unit: G90 absolute, G21 metric (or G20 inch)
  writeBlock(gAbsIncModal.format(90), gUnitModal.format(unit == MM ? 21 : 20));

  // Global G50 spindle speed clamp (machine max 4500 RPM)
  writeBlock(gFormat.format(50), sOutput.format(getProperty("maximumSpindleSpeed")));

  onCommand(COMMAND_START_CHIP_TRANSPORT);
}

function onComment(message) {
  writeComment(message);
}

function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

function forceFeed() {
  currentFeedId = undefined;
  feedOutput.reset();
}

function forceAny() {
  forceXYZ();
  forceFeed();
}

function forceModals() {
  if (arguments.length == 0) {
    if (typeof gMotionModal != "undefined") {
      gMotionModal.reset();
    }
    if (typeof gPlaneModal != "undefined") {
      gPlaneModal.reset();
    }
    if (typeof gAbsIncModal != "undefined") {
      gAbsIncModal.reset();
    }
    if (typeof gFeedModeModal != "undefined") {
      gFeedModeModal.reset();
    }
  } else {
    for (var i in arguments) {
      arguments[i].reset();
    }
  }
}

function FeedContext(id, description, feed) {
  this.id = id;
  this.description = description;
  this.feed = feed;
}

function getFeed(f) {
  if (activeMovements) {
    var feedContext = activeMovements[movement];
    if (feedContext != undefined) {
      if (!feedFormat.areDifferent(feedContext.feed, f)) {
        if (feedContext.id == currentFeedId) {
          return "";
        }
        forceFeed();
        currentFeedId = feedContext.id;
        return "F#" + (firstFeedParameter + feedContext.id);
      }
    }
    currentFeedId = undefined;
  }
  if (gFeedModeModal.getCurrent() == fprCode) {
    f = (feedFormat.format(f) <= 0) ? (Math.pow(10, feedFormat.getNumberOfDecimals() * -1)) : f;
  }
  return feedOutput.format(f);
}

function initializeActiveFeeds() {
  activeMovements = new Array();
  var movements = currentSection.getMovements();
  var feedPerRev = currentSection.feedMode == FEED_PER_REVOLUTION;

  var id = 0;
  var activeFeeds = new Array();
  if (hasParameter("operation:tool_feedCutting")) {
    if (movements & ((1 << MOVEMENT_CUTTING) | (1 << MOVEMENT_LINK_TRANSITION) | (1 << MOVEMENT_EXTENDED))) {
      var feedContext = new FeedContext(id, localize("Cutting"), feedPerRev ? getParameter("operation:tool_feedCuttingRel") : getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_CUTTING] = feedContext;
      if (!hasParameter("operation:tool_feedTransition")) {
        activeMovements[MOVEMENT_LINK_TRANSITION] = feedContext;
      }
      activeMovements[MOVEMENT_EXTENDED] = feedContext;
    }
    ++id;
    if (movements & (1 << MOVEMENT_PREDRILL)) {
      feedContext = new FeedContext(id, localize("Predrilling"), feedPerRev ? getParameter("operation:tool_feedCuttingRel") : getParameter("operation:tool_feedCutting"));
      activeMovements[MOVEMENT_PREDRILL] = feedContext;
      activeFeeds.push(feedContext);
    }
    ++id;
  }

  if (hasParameter("operation:finishFeedrate")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var finishFeedrateRel;
      if (hasParameter("operation:finishFeedrateRel")) {
        finishFeedrateRel = getParameter("operation:finishFeedrateRel");
      } else if (hasParameter("operation:finishFeedratePerRevolution")) {
        finishFeedrateRel = getParameter("operation:finishFeedratePerRevolution");
      }
      var feedContext = new FeedContext(id, localize("Finish"), feedPerRev ? finishFeedrateRel : getParameter("operation:finishFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), feedPerRev ? getParameter("operation:tool_feedCuttingRel") : getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedEntry")) {
    if (movements & (1 << MOVEMENT_LEAD_IN)) {
      var feedContext = new FeedContext(id, localize("Entry"), feedPerRev ? getParameter("operation:tool_feedEntryRel") : getParameter("operation:tool_feedEntry"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_IN] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LEAD_OUT)) {
      var feedContext = new FeedContext(id, localize("Exit"), feedPerRev ? getParameter("operation:tool_feedExitRel") : getParameter("operation:tool_feedExit"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_OUT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:noEngagementFeedrate")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), feedPerRev ? getParameter("operation:noEngagementFeedrateRel") : getParameter("operation:noEngagementFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting") &&
             hasParameter("operation:tool_feedEntry") &&
             hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(
        id,
        localize("Direct"),
        Math.max(
          feedPerRev ? getParameter("operation:tool_feedCuttingRel") : getParameter("operation:tool_feedCutting"),
          feedPerRev ? getParameter("operation:tool_feedEntryRel") : getParameter("operation:tool_feedEntry"),
          feedPerRev ? getParameter("operation:tool_feedExitRel") : getParameter("operation:tool_feedExit")
        )
      );
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:reducedFeedrate")) {
    if (movements & (1 << MOVEMENT_REDUCED)) {
      var feedContext = new FeedContext(id, localize("Reduced"), feedPerRev ? getParameter("operation:reducedFeedrateRel") : getParameter("operation:reducedFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_REDUCED] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedRamp")) {
    if (movements & ((1 << MOVEMENT_RAMP) | (1 << MOVEMENT_RAMP_HELIX) | (1 << MOVEMENT_RAMP_PROFILE) | (1 << MOVEMENT_RAMP_ZIG_ZAG))) {
      var feedContext = new FeedContext(id, localize("Ramping"), feedPerRev ? getParameter("operation:tool_feedRampRel") : getParameter("operation:tool_feedRamp"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_RAMP] = feedContext;
      activeMovements[MOVEMENT_RAMP_HELIX] = feedContext;
      activeMovements[MOVEMENT_RAMP_PROFILE] = feedContext;
      activeMovements[MOVEMENT_RAMP_ZIG_ZAG] = feedContext;
    }
    ++id;
  }
  if (hasParameter("operation:tool_feedPlunge")) {
    if (movements & (1 << MOVEMENT_PLUNGE)) {
      var feedContext = new FeedContext(id, localize("Plunge"), feedPerRev ? getParameter("operation:tool_feedPlungeRel") : getParameter("operation:tool_feedPlunge"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_PLUNGE] = feedContext;
    }
    ++id;
  }
  if (true) {
    if ((movements & (1 << MOVEMENT_HIGH_FEED)) || (highFeedMapping != HIGH_FEED_NO_MAPPING)) {
      var feed;
      if (hasParameter("operation:highFeedrateMode") && getParameter("operation:highFeedrateMode") != "disabled") {
        feed = getParameter("operation:highFeedrate");
      } else {
        feed = this.highFeedrate;
      }
      var feedContext = new FeedContext(id, localize("High Feed"), feed);
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_HIGH_FEED] = feedContext;
      activeMovements[MOVEMENT_RAPID] = feedContext;
    }
    ++id;
  }
  if (hasParameter("operation:tool_feedTransition")) {
    if (movements & (1 << MOVEMENT_LINK_TRANSITION)) {
      var feedContext = new FeedContext(id, localize("Transition"), getParameter("operation:tool_feedTransition"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_TRANSITION] = feedContext;
    }
    ++id;
  }

  for (var i = 0; i < activeFeeds.length; ++i) {
    var feedContext = activeFeeds[i];
    writeBlock("#" + (firstFeedParameter + feedContext.id) + "=" + feedFormat.format(feedContext.feed), formatComment(feedContext.description));
  }
}

function getSpindle() {
  if (getNumberOfSections() == 0) {
    return SPINDLE_PRIMARY;
  }
  if (getCurrentSectionId() < 0) {
    return getSection(getNumberOfSections() - 1).spindle == 0;
  }
  if (currentSection.getType() == TYPE_TURNING) {
    return currentSection.spindle;
  } else {
    if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      return SPINDLE_PRIMARY;
    } else if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, -1))) {
      if (!gotSecondarySpindle) {
        error(localize("Secondary spindle is not available."));
      }
      return SPINDLE_SECONDARY;
    } else {
      return SPINDLE_PRIMARY;
    }
  }
}

function ToolingData(_tool) {
  switch (_tool.turret) {
  case 0:
    this.tooling = TURRET;
    this.toolPost = REAR;
    break;
  case 101:
    this.tooling = QCTP;
    this.toolPost = FRONT;
    break;
  case 102:
    this.tooling = QCTP;
    this.toolPost = REAR;
    break;
  case 103:
    this.tooling = GANG;
    this.toolPost = FRONT;
    break;
  case 104:
    this.tooling = GANG;
    this.toolPost = REAR;
    break;
  default:
    error(localize("Turret number must be 0 (main turret), 101 (QCTP X-), 102 (QCTP X+), 103 (gang tooling X-), or 104 (gang tooling X+)."));
    break;
  }
  this.number = _tool.number;
  this.comment = _tool.comment;
  this.toolLength = _tool.bodyLength;
  if ((tool.bodyLength == 0) && hasParameter("operation:tool_bodyLength")) {
    this.toolLength = getParameter("operation:tool_bodyLength");
  }
}

function setDirectionX() {
  xFormat.setScale(toolingData.toolPost == FRONT ? Math.abs(xFormat.getScale()) * -1 : Math.abs(xFormat.getScale()));
  iFormat.setScale(toolingData.toolPost == FRONT ? Math.abs(iFormat.getScale()) * -1 : Math.abs(iFormat.getScale()));
  xOutput = createVariable({onchange:function() {retracted[X] = false;}, prefix:"X"}, xFormat);
  iOutput = createReferenceVariable({prefix:"I"}, iFormat);
}

function onSection() {
  if (currentSection.getType() != TYPE_TURNING) {
    if (!hasParameter("operation-strategy") || (getParameter("operation-strategy") != "drill")) {
      if (currentSection.getType() == TYPE_MILLING) {
        error(localize("Milling toolpath is not supported. Okuma Crown L1060 is a 2-axis turning lathe with no live tooling."));
      } else {
        error(localize("Non-turning toolpath is not supported."));
      }
      return;
    }
  }

  var forceSectionRestart = optionalSection && !currentSection.isOptional();
  optionalSection = currentSection.isOptional();

  var turning = (currentSection.getType() == TYPE_TURNING);

  var insertToolCall = forceSectionRestart || isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number) ||
    (tool.compensationOffset != getPreviousSection().getTool().compensationOffset) ||
    (tool.diameterOffset != getPreviousSection().getTool().diameterOffset) ||
    (tool.lengthOffset != getPreviousSection().getTool().lengthOffset);

  var newSpindle = isFirstSection() ||
    (getPreviousSection().spindle != currentSection.spindle);
  var newWorkOffset = isFirstSection() || forceSectionRestart ||
    (getPreviousSection().workOffset != currentSection.workOffset);

  if (!isFirstSection()) {
    previousToolingData = toolingData;
  }
  toolingData = new ToolingData(tool);
  toolingData.operationComment = "";
  if (hasParameter("operation-comment")) {
    toolingData.operationComment = getParameter("operation-comment");
  }
  toolingData.toolChange = insertToolCall;
  if (isFirstSection()) {
    previousToolingData = toolingData;
  }

  setDirectionX();

  if (insertToolCall || newSpindle || newWorkOffset) {
    if (!isFirstSection() && insertToolCall) {
      onCommand(COMMAND_COOLANT_OFF);
    }
    writeRetract();
    forceXYZ();
  }

  writeln("");

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      writeComment(comment);
    }
  }

  if (getProperty("showNotes") && hasParameter("notes")) {
    var notes = getParameter("notes");
    if (notes) {
      var lines = String(notes).split("\n");
      var r1 = new RegExp("^[\\s]+", "g");
      var r2 = new RegExp("[\\s]+$", "g");
      for (var line in lines) {
        var comment = lines[line].replace(r1, "").replace(r2, "");
        if (comment) {
          writeComment(comment);
        }
      }
    }
  }

  // PRISM: detect finish pass for precision optimization
  isFinishPass = detectFinishPass(currentSection);
  if (isFinishPass) {
    writeComment("PRISM - FINISH PASS DETECTED - PRECISION MODE");
    // Surface finish advisory output for finish passes with nose radius
    if (tool.noseRadius > 0 && getProperty("prismOptimize")) {
      var currentFeedEst = currentSection.getParameter("operation:tool_feedCutting", 0.1);
      var estimatedRa = prismEstimateSurfaceFinish(currentFeedEst, tool.noseRadius);
      var optimalFeed = prismOptimizeFinishFeed(getProperty("prismSurfaceFinishTarget"), tool.noseRadius);
      writeComment("PRISM FINISH ADVISORY - NOSE R=" + tool.noseRadius + "MM");
      writeComment("PRISM EST RA=" + estimatedRa.toFixed(2) + "UM - OPT F=" + optimalFeed.toFixed(3) + "MM/REV FOR RA " + getProperty("prismSurfaceFinishTarget") + "UM");
    }
  }

  if (insertToolCall) {
    forceModals();
    if (!isFirstSection() && getProperty("optionalStop")) {
      onCommand(COMMAND_OPTIONAL_STOP);
    }

    if (tool.number > 99) {
      warning(localize("Tool number exceeds maximum value."));
    }

    if ((toolingData.tooling == QCTP) || tool.getManualToolChange()) {
      var comment = formatComment(localize("CHANGE TO T") + tool.number + " " + localize("ON") + " " +
        localize((toolingData.toolPost == REAR) ? "REAR TOOL POST" : "FRONT TOOL POST"));
      writeBlock(mFormat.format(0), comment);
    }

    var compensationOffset = tool.isTurningTool() ? tool.compensationOffset : tool.lengthOffset;
    if (compensationOffset > 99) {
      error(localize("Compensation offset is out of range."));
      return;
    }

    writeToolBlock("T" + toolFormat.format(compensationOffset) + toolFormat.format(tool.number) + toolFormat.format(tool.number));
    if (tool.comment) {
      writeComment(tool.comment);
    }
  }

  // G90 absolute + feed mode + G18 ZX plane
  writeBlock(gAbsIncModal.format(90), getCode(currentSection.feedMode == FEED_PER_REVOLUTION ? "FEED_MODE_UNIT_REV" : "FEED_MODE_UNIT_MIN"), gPlaneModal.format(18));

  setCoolant(tool.coolant);

  forceAny();
  gMotionModal.reset();

  if (gotTailStock) {
    writeBlock(getCode(currentSection.tailstock ? "TAILSTOCK_ON" : "TAILSTOCK_OFF"));
  }

  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  var spindleChanged = forceSpindleSpeed || newSpindle || isSpindleSpeedDifferent();
  if (insertToolCall || spindleChanged) {
    forceSpindleSpeed = false;
    startSpindle(false, true, initialPosition);
  }

  setRotation(currentSection.workPlane);

  if (insertToolCall || tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    gMotionModal.reset();
    if (getProperty("approachStyle") == "ZX") {
      writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
    } else {
      writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z));
    }
    gMotionModal.reset();
  }

  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    startSpindle(false, false);
  }

  if (currentSection.partCatcher) {
    engagePartCatcher(true);
  }

  if (getProperty("useParametricFeed") &&
      hasParameter("operation-strategy") &&
      (getParameter("operation-strategy") != "drill") &&
      !(currentSection.hasAnyCycle && currentSection.hasAnyCycle())) {
    if (!insertToolCall &&
        activeMovements &&
        (getCurrentSectionId() > 0) &&
        ((getPreviousSection().getPatternId() == currentSection.getPatternId()) && (currentSection.getPatternId() != 0))) {
      // use the current feeds
    } else {
      initializeActiveFeeds();
    }
  } else {
    activeMovements = undefined;
  }
}

function onDwell(seconds) {
  if (seconds > 99999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  writeBlock(gFormat.format(4), "F" + secFormat.format(seconds));
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onRapid(_x, _y, _z) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gMotionModal.format(0), gFormat.format(41), x, y, z);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gMotionModal.format(0), gFormat.format(42), x, y, z);
        break;
      default:
        writeBlock(gMotionModal.format(0), gFormat.format(40), x, y, z);
      }
    } else {
      writeBlock(gMotionModal.format(0), x, y, z);
    }
    forceFeed();
  }
}

var resetFeed = false;

function onLinear(_x, _y, _z, feed) {
  if (isSpeedFeedSynchronizationActive()) {
    resetFeed = true;
    var threadPitch = getParameter("operation:threadPitch");
    var threadsPerInch = 1.0 / threadPitch;
    writeBlock(gMotionModal.format(32), xOutput.format(_x), yOutput.format(_y), zOutput.format(_z), pitchOutput.format(1 / threadsPerInch));
    return;
  }
  if (resetFeed) {
    resetFeed = false;
    forceFeed();
  }

  // PRISM finish pass feed limiter
  var effectiveFeed = feed;
  if (isFinishPass && getProperty("finishPassMode") && gFeedModeModal.getCurrent() == fprCode) {
    if (effectiveFeed > getProperty("finishFeedLimit")) {
      effectiveFeed = getProperty("finishFeedLimit");
    }
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(effectiveFeed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      writeBlock(gPlaneModal.format(18));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(41), x, y, z, f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(42), x, y, z, f);
        break;
      default:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(40), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), x, y, z, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) {
      forceFeed();
    } else {
      writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), f);
    }
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (isSpeedFeedSynchronizationActive()) {
    error(localize("Speed-feed synchronization is not supported for circular moves."));
    return;
  }

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  // PRISM finish pass feed limiter for arcs
  var effectiveFeed = feed;
  if (isFinishPass && getProperty("finishPassMode") && gFeedModeModal.getCurrent() == fprCode) {
    if (effectiveFeed > getProperty("finishFeedLimit")) {
      effectiveFeed = getProperty("finishFeedLimit");
    }
  }

  var start = getCurrentPosition();
  var directionCode = (toolingData.toolPost == REAR) ? (clockwise ? 2 : 3) : (clockwise ? 3 : 2);

  if (isFullCircle()) {
    if (getProperty("useRadius") || isHelical()) {
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_ZX:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(directionCode), iOutput.format(cx - start.x, 0), kOutput.format(cz - start.z, 0), getFeed(effectiveFeed));
      break;
    default:
      linearize(tolerance);
    }
  } else if (!getProperty("useRadius")) {
    switch (getCircularPlane()) {
    case PLANE_ZX:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x, 0), kOutput.format(cz - start.z, 0), getFeed(effectiveFeed));
      break;
    default:
      linearize(tolerance);
    }
  } else {
    var r = getCircularRadius();
    if (toDeg(getCircularSweep()) > (180 + 1e-9)) {
      r = -r;
    }
    switch (getCircularPlane()) {
    case PLANE_ZX:
      writeBlock(gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "L" + rFormat.format(r), getFeed(effectiveFeed));
      break;
    default:
      linearize(tolerance);
    }
  }
}

function onCycle() {
}

function getCommonCycle(x, y, z, r) {
  forceXYZ();
  return [xOutput.format(x), yOutput.format(y),
    zOutput.format(z),
    "R" + spatialFormat.format(r)];
}

var skipThreading = false;
function onCyclePoint(x, y, z) {
  if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1)) ||
      isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, -1))) {
    // 2-axis lathe
  } else {
    expandCyclePoint(x, y, z);
    return;
  }

  switch (cycleType) {
  case "thread-turning":
    if (skipThreading) {
      return;
    }
    var numberOfThreads = 1;
    if ((hasParameter("operation:doMultipleThreads") && (getParameter("operation:doMultipleThreads") != 0))) {
      numberOfThreads = getParameter("operation:numberOfThreads");
    }
    if ((getProperty("useSimpleThread") &&
      !(hasParameter("operation:doMultipleThreads") && (getParameter("operation:doMultipleThreads") != 0)))) {
      moveToThreadStart(x, y, z);
      gCycleModal.reset();
      zOutput.reset();
      writeBlock(
        gCycleModal.format(33),
        xOutput.format(x - cycle.incrementalX),
        zOutput.format(z),
        iOutput.format(cycle.incrementalX, 0),
        pitchOutput.format(cycle.pitch)
      );
    } else {
      if (isLastCyclePoint()) {
        var threadHeight = getParameter("operation:threadDepth");
        var firstDepthOfCut = cycle.firstPassDepth ? cycle.firstPassDepth : threadHeight - Math.abs(getCyclePoint(0).x - x);
        var cuttingAngle = 0;
        if (hasParameter("operation:infeedAngle")) {
          cuttingAngle = getParameter("operation:infeedAngle");
        }

        var threadInfeedMode = "constant";
        if (hasParameter("operation:infeedMode")) {
          threadInfeedMode = getParameter("operation:infeedMode");
        }
        var infeedModeCode = 0;
        var threadCuttingMode = 0;
        if (threadInfeedMode == "reduced") {
          threadCuttingMode = 32;
          infeedModeCode = 75;
        } else if (threadInfeedMode == "constant") {
          threadCuttingMode = 32;
          infeedModeCode = 73;
        } else if (threadInfeedMode == "alternate") {
          threadCuttingMode = 33;
          infeedModeCode = 75;
        } else {
          error(localize("Unsupported Infeed Mode."));
          return;
        }

        writeBlock(
          gCycleModal.format(71),
          xOutput.format(x),
          zOutput.format(z),
          conditional(cuttingAngle != 0, "B" + zFormat.format(cuttingAngle * 2)),
          "D" + xFormat.format(firstDepthOfCut),
          "H" + xFormat.format(threadHeight),
          iOutput.format(cycle.incrementalX, 0),
          conditional((numberOfThreads > 1), "Q" + numberOfThreads),
          feedOutput.format(cycle.pitch),
          mFormat.format(threadCuttingMode),
          mFormat.format(infeedModeCode)
        );
        skipThreading = (numberOfThreads != 0);
        gMotionModal.reset();
      }
    }
    return;
  }

  if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1)) ||
      isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, -1))) {
    writeBlock(gPlaneModal.format(17));
  } else {
    expandCyclePoint(x, y, z);
    return;
  }

  if (isFirstCyclePoint()) {
    repositionToCycleClearance(cycle, x, y, z);

    var F = cycle.feedrate;
    var E = ((cycle.dwell == 0) ? 0 : cycle.dwell);

    switch (cycleType) {
    case "drilling":
      writeBlock(
        gCycleModal.format(181),
        getCommonCycle(x, y, z, cycle.retract - cycle.stock),
        feedOutput.format(F)
      );
      break;
    case "counter-boring":
    case "deep-drilling":
      writeBlock(
        gCycleModal.format(182),
        getCommonCycle(x, y, z, cycle.retract - cycle.stock),
        conditional(E > 0, "E" + secFormat.format(E)),
        feedOutput.format(F)
      );
      break;
    case "chip-breaking":
      if (E > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gCycleModal.format(183),
          getCommonCycle(x, y, z, cycle.retract - cycle.stock),
          "D" + spatialFormat.format(cycle.incrementalDepth),
          conditional(cycle.accumulatedDepth > 0, "L" + spatialFormat.format(cycle.accumulatedDepth)),
          conditional(E > 0, "E" + secFormat.format(E)),
          feedOutput.format(F)
        );
      }
      break;
    case "tapping":
    case "left-tapping":
    case "right-tapping":
      if (!F) {
        F = tool.getTappingFeedrate();
      }
      writeBlock(
        gCycleModal.format(184),
        getCommonCycle(x, y, z, cycle.retract - cycle.stock),
        feedOutput.format(F)
      );
      break;
    case "reaming":
    case "boring":
      writeBlock(
        gCycleModal.format(189),
        getCommonCycle(x, y, z, cycle.retract - cycle.stock),
        conditional(E > 0, "E" + secFormat.format(E)),
        feedOutput.format(F)
      );
      break;
    case "tapping-with-chip-breaking":
    case "left-tapping-with-chip-breaking":
    case "right-tapping-with-chip-breaking":
    case "fine-boring":
    case "stop-boring":
      error(localize("Unsupported cycle " + cycleType));
      return;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      var _x = xOutput.format(x);
      var _y = yOutput.format(y);
      var _z = zOutput.format(z);
      if (!_x && !_y && !_z) {
        switch (gPlaneModal.getCurrent()) {
        case 17:
          xOutput.reset();
          _x = xOutput.format(x);
          break;
        case 18:
          zOutput.reset();
          _z = zOutput.format(z);
          break;
        case 19:
          yOutput.reset();
          _y = yOutput.format(y);
          break;
        }
      }
      writeBlock(_x, _y, _z);
    }
  }
}

function onCycleEnd() {
  if (!cycleExpanded) {
    switch (cycleType) {
    case "thread-turning":
      forceFeed();
      xOutput.reset();
      zOutput.reset();
      g92ROutput.reset();
      break;
    default:
      writeBlock(gCycleModal.format(180));
    }
  }
  skipThreading = true;
}

var saveShowSequenceNumbers;
function onCyclePath() {
  saveShowSequenceNumbers = getProperty("showSequenceNumbers");
  var verticalPasses;
  if (cycle.profileRoughingCycle == 0) {
    verticalPasses = false;
  } else if (cycle.profileRoughingCycle == 1) {
    verticalPasses = true;
  } else {
    error(localize("Unsupported passes type."));
    return;
  }
  feedOutput.disable();
  setProperty("showSequenceNumbers", "false");
  redirectToBuffer();
  writeBlock("NAT" + getCurrentSectionId() + " " + (verticalPasses ? "G82" : "G81"));
  gMotionModal.reset();
  forceXYZ();
}

function onCyclePathEnd() {
  writeBlock(gFormat.format(80));
  setProperty("showSequenceNumbers", saveShowSequenceNumbers);
  feedOutput.enable();
  var cyclePath = String(getRedirectionBuffer()).split(EOL);
  closeRedirection();
  for (var line in cyclePath) {
    if (cyclePath[line] == "") {
      cyclePath.splice(line);
    }
  }

  switch (cycleType) {
  case "turning-canned-rough":
    writeBlock(gFormat.format(85), "NAT" + getCurrentSectionId() +
        " D" + spatialFormat.format(cycle.depthOfCut) +
        " U" + xFormat.format(Math.abs(cycle.xStockToLeave)) +
        " W" + spatialFormat.format(Math.abs(cycle.zStockToLeave)) +
        " " + getFeed(cycle.cutfeedrate)
    );
    break;
  default:
    error(localize("Unsupported turning canned cycle."));
  }

  for (var i = 0; i < cyclePath.length; ++i) {
    if (i == 0) {
      writeln(cyclePath[i]);
    } else {
      writeBlock(cyclePath[i]);
    }
    setProperty("showSequenceNumbers", saveShowSequenceNumbers);
  }
}

var currentCoolantMode = COOLANT_OFF;
var coolantOff = undefined;
var forceCoolant = false;

function setCoolant(coolant) {
  var coolantCodes = getCoolantCodes(coolant);
  if (Array.isArray(coolantCodes)) {
    if (singleLineCoolant) {
      writeBlock(coolantCodes.join(getWordSeparator()));
    } else {
      for (var c in coolantCodes) {
        writeBlock(coolantCodes[c]);
      }
    }
    return undefined;
  }
  return coolantCodes;
}

function getCoolantCodes(coolant) {
  var multipleCoolantBlocks = new Array();
  if (!coolants) {
    error(localize("Coolants have not been defined."));
  }
  if (tool.type == TOOL_PROBE) {
    coolant = COOLANT_OFF;
  }
  if (coolant == currentCoolantMode && (!forceCoolant || coolant == COOLANT_OFF)) {
    return undefined;
  }
  if ((coolant != COOLANT_OFF) && (currentCoolantMode != COOLANT_OFF) && (coolantOff != undefined) && !forceCoolant) {
    if (Array.isArray(coolantOff)) {
      for (var i in coolantOff) {
        multipleCoolantBlocks.push(coolantOff[i]);
      }
    } else {
      multipleCoolantBlocks.push(coolantOff);
    }
  }

  forceCoolant = false;

  var m;
  var coolantCodes = {};
  for (var c in coolants) {
    if (coolants[c].id == coolant) {
      coolantCodes.on = coolants[c].on;
      if (coolants[c].off != undefined) {
        coolantCodes.off = coolants[c].off;
        break;
      } else {
        for (var i in coolants) {
          if (coolants[i].id == COOLANT_OFF) {
            coolantCodes.off = coolants[i].off;
            break;
          }
        }
      }
    }
  }
  if (coolant == COOLANT_OFF) {
    m = !coolantOff ? coolantCodes.off : coolantOff;
  } else {
    coolantOff = coolantCodes.off;
    m = coolantCodes.on;
  }

  if (!m) {
    onUnsupportedCoolant(coolant);
    m = 9;
  } else {
    if (Array.isArray(m)) {
      for (var i in m) {
        multipleCoolantBlocks.push(m[i]);
      }
    } else {
      multipleCoolantBlocks.push(m);
    }
    currentCoolantMode = coolant;
    for (var i in multipleCoolantBlocks) {
      if (typeof multipleCoolantBlocks[i] == "number") {
        multipleCoolantBlocks[i] = mFormat.format(multipleCoolantBlocks[i]);
      }
    }
    return multipleCoolantBlocks;
  }
  return undefined;
}

function onSpindleSpeed(spindleSpeed) {
  if (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) {
    startSpindle(false, false, getFramePosition(currentSection.getInitialPosition()), spindleSpeed);
  }
}

function startSpindle(tappingMode, forceRPMMode, initialPosition, rpm) {
  var spindleDir;
  var spindleMode;
  var _spindleSpeed = spindleSpeed;
  if (rpm !== undefined) {
    _spindleSpeed = rpm;
  }
  var maxSpeed = "";
  gSpindleModeModal.reset();

  if ((getSpindle() == SPINDLE_SECONDARY) && !gotSecondarySpindle) {
    error(localize("Secondary spindle is not available."));
    return;
  }

  if (false) {
    spindleDir = getCode("RIGID_TAPPING");
  } else {
    if (getSpindle() == SPINDLE_SECONDARY) {
      spindleDir = tool.clockwise ? getCode("START_SUB_SPINDLE_CW") : getCode("START_SUB_SPINDLE_CCW");
    } else {
      spindleDir = tool.clockwise ? getCode("START_MAIN_SPINDLE_CW") : getCode("START_MAIN_SPINDLE_CCW");
    }
  }
  var spindleRange = getSpindleRange(_spindleSpeed);
  var maximumSpindleSpeed = (tool.maximumSpindleSpeed > 0) ? Math.min(tool.maximumSpindleSpeed, getProperty("maximumSpindleSpeed")) : getProperty("maximumSpindleSpeed");
  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    _spindleSpeed = tool.surfaceSpeed * ((unit == MM) ? 1 / 1000.0 : 1 / 12.0);
    if (forceRPMMode) {
      if (xFormat.getResultingValue(initialPosition.x) == 0) {
        _spindleSpeed = maximumSpindleSpeed;
      } else {
        _spindleSpeed = Math.min((_spindleSpeed * ((unit == MM) ? 1000.0 : 12.0) / (Math.PI * Math.abs(initialPosition.x * 2))), maximumSpindleSpeed);
      }
      spindleMode = getCode("CONSTANT_SURFACE_SPEED_OFF");
    } else {
      if (tool.maximumSpindleSpeed > 0) {
        writeBlock(gFormat.format(50), sOutput.format(maximumSpindleSpeed));
      }
      spindleMode = getCode("CONSTANT_SURFACE_SPEED_ON");
    }
    spindleRange = getSpindleRange(maximumSpindleSpeed);
  } else {
    spindleMode = getCode("CONSTANT_SURFACE_SPEED_OFF");
  }

  writeBlock(
    spindleMode,
    sOutput.format(_spindleSpeed),
    spindleDir,
    spindleRange
  );
}

function getSpindleRange(_spindleSpeed) {
  var speed = rpmFormat.getResultingValue(_spindleSpeed);
  if (getProperty("spindleRangeLow") == 0) {
    return "";
  }
  if (speed <= getProperty("spindleRangeLow")) {
    return mFormat.format(41);
  } else {
    return mFormat.format(42);
  }
}

function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    setCoolant(COOLANT_OFF);
    return;
  case COMMAND_COOLANT_ON:
    setCoolant(COOLANT_FLOOD);
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    return;
  case COMMAND_START_CHIP_TRANSPORT:
    return;
  case COMMAND_STOP_CHIP_TRANSPORT:
    return;
  case COMMAND_BREAK_CONTROL:
    return;
  case COMMAND_TOOL_MEASURE:
    return;
  case COMMAND_ACTIVATE_SPEED_FEED_SYNCHRONIZATION:
    return;
  case COMMAND_DEACTIVATE_SPEED_FEED_SYNCHRONIZATION:
    return;
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_OPTIONAL_STOP:
    writeBlock(mFormat.format(1));
    forceSpindleSpeed = true;
    forceCoolant = true;
    break;
  case COMMAND_END:
    writeBlock(mFormat.format(2));
    break;
  case COMMAND_SPINDLE_CLOCKWISE:
    switch (currentSection.spindle) {
    case SPINDLE_PRIMARY:
      writeBlock(mFormat.format(3));
      break;
    }
    break;
  case COMMAND_SPINDLE_COUNTERCLOCKWISE:
    switch (currentSection.spindle) {
    case SPINDLE_PRIMARY:
      writeBlock(mFormat.format(4));
      break;
    }
    break;
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_STOP_SPINDLE:
    switch (currentSection.spindle) {
    case SPINDLE_PRIMARY:
      writeBlock(mFormat.format(5));
      break;
    }
    break;
  default:
    onUnsupportedCommand(command);
  }
}

function engagePartCatcher(engage) {
  if (engage) {
    writeBlock(getCode("PART_CATCHER_ON"), formatComment(localize("PART CATCHER ON")));
  } else {
    onCommand(COMMAND_COOLANT_OFF);
    writeBlock(gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX")));
    writeBlock(gMotionModal.format(0), "Z" + zFormat.format(getProperty("homePositionZ")));
    writeBlock(getCode("PART_CATCHER_OFF"), formatComment(localize("PART CATCHER OFF")));
    forceXYZ();
  }
}

function onSectionEnd() {
  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    startSpindle(false, true, getFramePosition(currentSection.getFinalPosition()));
  }

  if (currentSection.partCatcher) {
    engagePartCatcher(false);
  }

  isFinishPass = false;
  forceAny();
  skipThreading = false;
}

var XZ = 4;
function writeRetract() {
  var words = [];
  var singleLineRetract = false;
  var retractAxes = [];

  var _xHome = machineConfiguration.hasHomePositionX() ? machineConfiguration.getHomePositionX() : getProperty("homePositionX");
  var _yHome = machineConfiguration.hasHomePositionY() ? machineConfiguration.getHomePositionY() : toPreciseUnit(0, MM);
  var _zHome = machineConfiguration.getRetractPlane() != 0 ? machineConfiguration.getRetractPlane() : getProperty("homePositionZ");

  if (arguments.length > 0) {
    for (var i in arguments) {
      retractAxes.push(arguments[i]);
      singleLineRetract = arguments[i] == XZ ? true : singleLineRetract;
    }
  } else {
    switch (getProperty("safePositionStyle")) {
    case "X":
      retractAxes.push(X);
      break;
    case "Z":
      retractAxes.push(Z);
      break;
    case "XZ":
      retractAxes.push(X, Z);
      break;
    case "ZX":
      retractAxes.push(Z, X);
      break;
    case "singleLineXZ":
      singleLineRetract = true;
      retractAxes.push(X, Z);
      break;
    }
  }

  for (var i = 0; i < retractAxes.length; ++i) {
    switch (retractAxes[i]) {
    case X:
      words.push("X" + spatialFormat.format(_xHome));
      retracted[X] = true;
      xOutput.reset();
      break;
    case Y:
      if (yOutput.isEnabled()) {
        words.push("Y" + yFormat.format(_yHome));
        yOutput.reset();
      }
      break;
    case Z:
      words.push("Z" + zFormat.format(_zHome));
      retracted[Z] = true;
      zOutput.reset();
      break;
    case XZ:
      words.push("X" + xFormat.format(_xHome));
      words.push("Z" + zFormat.format(_zHome));
      retracted[X] = true;
      retracted[Z] = true;
      xOutput.reset();
      zOutput.reset();
      break;
    default:
      error(localize("Unsupported axis specified for writeRetract()."));
      return;
    }
  }
  for (var i = 0; i < words.length; ++i) {
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), singleLineRetract ? words : words[i]);
    if (singleLineRetract) {
      break;
    }
  }
  singleLineRetract = false;
}

function onClose() {
  writeln("");

  optionalSection = false;

  onCommand(COMMAND_COOLANT_OFF);
  forceXYZ();
  writeRetract();

  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  writeBlock(mFormat.format(30)); // program end and rewind
  writeln("%");
}

function setProperty(property, value) {
  properties[property].current = value;
}
