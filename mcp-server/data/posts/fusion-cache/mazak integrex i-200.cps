var modelType = "Integrex i-200";
description = "Mazak Integrex i-200";
// >>>>> INCLUDED FROM ../common/mazak integrex i.cps
//Save This line for editing purposes, comment out before merge
//var modelType = "Integrex i-200S";

/**
  Copyright (C) 2012-2024 by Autodesk, Inc.
  All rights reserved.

  Mazak Integrex post processor configuration.

  $Revision: 44113 9e69e99eb0ed7579612c8e0c6b12203ef827eb3a $
  $Date: 2024-02-28 23:08:43 $

  FORKID {62F61C65-979D-4f9f-97B0-C5F9634CC6A7}
*/

///////////////////////////////////////////////////////////////////////////////
//                        MANUAL NC COMMANDS
//
// The following ACTION commands are supported by this post.
//
//     usePolarInterpolation      - Force Polar interpolation mode for next operation (usePolarMode is deprecated but still supported)
//     usePolarCoordinates        - Force Polar coordinates for the next operation (useXZCMode is deprecated but still supported)
//     useSmoothing               - Use Smoothing for next operation
//
///////////////////////////////////////////////////////////////////////////////

if (!description) {
  description = "Mazak Integrex I";
}

vendor = "Mazak";
vendorUrl = "https://www.mazak.com";
legal = "Copyright (C) 2012-2024 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45909;

if (!longDescription) {
  longDescription = subst("Preconfigured %1 post (Smooth/Matrix) with support for mill-turn. Enter the Tool ID Code in the Product ID of the Tool. Leave Blank if not used", description);
}

extension = "eia";
programNameIsInteger = false;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
allowSpiralMoves = false;
allowFeedPerRevolutionDrilling = true;
highFeedrate = (unit == IN) ? 400 : 5000;

// user-defined properties
properties = {
  controllerType: {
    title      : "Controller model",
    description: "Select the controller model",
    group      : "configuration",
    type       : "enum",
    values     : [
      "Matrix",
      "Smooth"
    ],
    value: "Smooth",
    scope: "post"
  },
  tiltedPlaneMethod: {
    title      : "Select tilted plane mode",
    description: "Select either G68 or G68.2 for tilted plane mode",
    group      : "multiAxis",
    type       : "enum",
    values     : [
      "G68",
      "G68.2"
    ],
    value: "G68",
    scope: "post"
  },
  useG0Polar: {
    title      : "Use G0 for Polar",
    description: "Disable to use G1 for rapid moves when G12.1 Polar Interpolation is active.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG61: {
    title      : "Use G61.1 Geometry compensation",
    description: "Output G61.1 geometry compensation when milling.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  writeMachine: {
    title      : "Write machine",
    description: "Output the machine settings in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  writeTools: {
    title      : "Write tool list",
    description: "Output a tool list in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  writeDateAndTime: {
    title      : "Write date and time",
    description: "Output date and time in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useTCPC: {
    title      : "Use TCPC programming",
    description: "The control supports Tool Center Point Control programming.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  preloadTool: {
    title      : "Preload tool",
    description: "Preloads the next tool at a tool change (if any).",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
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
    value: "toolChange",
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
    value      : 10,
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
    value      : true,
    scope      : "post"
  },
  maximumSpindleSpeed: {
    title      : "Max spindle speed",
    description: "Defines the maximum spindle speed allowed by your machines.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999],
    value      : 3300,
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
  useCycles: {
    title      : "Use cycles",
    description: "Specifies if canned drilling cycles should be used.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  usePartCatcher: {
    title      : "Use part catcher",
    description: "Specifies whether part catcher code should be output.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useTailStock: {
    title      : "Use tailstock",
    description: "Specifies whether to use the tailstock or not.",
    group      : "configuration",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  transferTool: {
    title      : "Transfer Tool Number",
    description: "Defines the tool called when secondary spindle chuck process happens",
    group      : "preferences",
    type       : "integer",
    range      : [0, 999999999],
    value      : 41,
    scope      : "post"
  },
  transferUseTorque: {
    title      : "Stock-transfer torque control",
    description: "Use torque control for stock transfer.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  homePositionZ: {
    title      : "G53 home position Z",
    description: "G53 Z-axis home position.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  homePositionSubZ: {
    title      : "G53 home position Z (secondary spindle)",
    description: "G53 Z-axis home position for the secondary spindle.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  writeVersion: {
    title      : "Write version",
    description: "Write the version number in the header of the code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useRigidTapping: {
    title      : "Use rigid tapping",
    description: "Select 'Yes' to enable, 'No' to disable.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSimpleThread: {
    title      : "Use simple threading cycle",
    description: "Enable to output G292 simple threading cycle, disable to output G276 standard threading cycle.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useYAxisForDrilling: {
    title      : "Position in Y for axial drilling",
    description: "Positions in Y for axial drilling options when it can instead of using the C-axis.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useFixedOffset: {
    title      : "Use G43 H#3020",
    description: "Select 'Yes' to use G43 H#3020, 'No' to use the tool offset number.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  tableAdjust: {
    title      : "Adjust points for table",
    description: "Set to Yes if table coordinate system is used (F85 Bit 2 is set to 0). Set to No if the workpiece coordinate system is used (F85 Bit 2 is set to 1).",
    type       : "boolean",
    group      : "preferences",
    value      : true,
    scope      : "post"
  },
};

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G", range:[54, 59]},
    {name:"Extended", format:"G54.1 P", range:[1, 48]}
  ]
};

var singleLineCoolant = false; // specifies to output multiple coolant codes in one line rather than in separate lines
// samples:
// {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
// {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
// {id: COOLANT_THROUGH_TOOL, turret1:{on: [8, 88], off:[9, 89]}, turret2:{on:88, off:89}}
// {id: COOLANT_THROUGH_TOOL, spindle1:{on: [8, 88], off:[9, 89]}, spindle2:{on:88, off:89}}
// {id: COOLANT_THROUGH_TOOL, spindle1t1:{on: [8, 88], off:[9, 89]}, spindle1t2:{on:88, off:89}}
// {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
var coolants = [
  {id:COOLANT_FLOOD, on:8, off:9},
  {id:COOLANT_MIST},
  {id:COOLANT_THROUGH_TOOL, on:51, off:163},
  {id:COOLANT_AIR, on:129, off:9},
  {id:COOLANT_AIR_THROUGH_TOOL, turret1:{on:132, off:9}, turret2:{}},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL},
  {id:COOLANT_OFF, off:9}
];

var showDebug = false; // specifies to output debug information

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-";

var gFormat = createFormat({prefix:"G", decimals:1});
var mFormat = createFormat({prefix:"M", decimals:0});

var spatialFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var xFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, scale:2}); // diameter mode & IS SCALING POLAR COORDINATES
var yFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var zFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var subZFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, forceSign:true});
var rFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true}); // radius
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var cFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var fpmFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var fprFormat = createFormat({type:FORMAT_REAL, decimals:(unit == MM ? 3 : 4), minimum:(unit == MM ? 0.001 : 0.0001)});
var feedFormat = fpmFormat;
var pitchFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var rpmFormat = createFormat({decimals:0});
var milliFormat = createFormat({decimals:0}); // milliseconds // range 1-99999999
var taperFormat = createFormat({decimals:1, scale:DEG});
var threadP1Format = createFormat({decimals:0, forceDecimal:false, trim:false, width:6, zeropad:true});
var threadPQFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});

var xOutput = createOutputVariable({onchange:function () {retracted = false;}, prefix:"X"}, xFormat);
var yOutput = createOutputVariable({prefix:"Y", onchange:function() {yAxisIsRetracted = false;}}, yFormat);
var zOutput = createOutputVariable({onchange:function () {retracted = false;}, prefix:"Z"}, zFormat);
var subWOutput = createOutputVariable({prefix:"W[#501", control:CONTROL_FORCE}, subZFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, abcFormat);
var cOutput = createOutputVariable({prefix:"C", cyclicLimit:360, cyclicSign:1}, cFormat);
var uOutput = createOutputVariable({prefix:"U", control:CONTROL_FORCE}, cFormat);
var barOutput = createOutputVariable({prefix:"W", control:CONTROL_FORCE}, spatialFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var pitchOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, pitchFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);
var pOutput = createOutputVariable({prefix:"P", control:CONTROL_FORCE}, rpmFormat);
var threadP1Output = createOutputVariable({prefix:"P", control:CONTROL_FORCE}, threadP1Format);
var threadP2Output = createOutputVariable({prefix:"P", control:CONTROL_FORCE}, threadPQFormat);
var threadQOutput = createOutputVariable({prefix:"Q", control:CONTROL_FORCE}, threadPQFormat);
var threadROutput = createOutputVariable({prefix:"R", control:CONTROL_FORCE}, threadPQFormat);
var g92ROutput = createOutputVariable({prefix:"R"}, zFormat); // no scaling

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_NONZERO}, spatialFormat); // no scaling
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_NONZERO}, spatialFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_NONZERO}, spatialFormat);

var gMotionModal = createOutputVariable({}, gFormat); // modal group 1 // G0-G3, ...
var gRotationModal = createOutputVariable({}, gFormat); // G68-G69
var gPlaneModal = createOutputVariable({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gFeedModeModal = createOutputVariable({}, gFormat);
var gSpindleModeModal = createOutputVariable({}, gFormat); // modal group 5 // G96-97
var gUnitModal = createOutputVariable({}, gFormat); // modal group 6 // G20-21
var gPolarModal = createOutputVariable({}, gFormat); // G12.1, G13.1
var gCycleModal = gMotionModal;
var gAbsIncModal = createOutputVariable({}, gFormat); // modal group 3 // G90-91
var gRetractModal = createOutputVariable({control:CONTROL_FORCE}, gFormat); // modal group 10 // G98-99
var gSpindleModal = createOutputVariable({}, gFormat);
var gSelectSpindleModal = createOutputVariable({}, mFormat);
var cAxisEngageModal = createOutputVariable({}, mFormat);

// fixed settings
var gotPolarInterpolation = true; // specifies if the machine has XY polar interpolation capabilities
var firstFeedParameter = 105;
//var xHomeParameter = 903;
var zHomeParameter = 901;
//var yHomeParameter = 904;
var zSubHomeParameter = 902;

// defined in defineMachine
var turret1GotYAxis;
var gotYAxis;
var yAxisMinimum;
var yAxisMaximum;
var xAxisMinimum;
var gotBAxis;
var bAxisIsManual;
var maximumSpindleSpeedLive;
var gotSecondarySpindle;

var useMultiAxisFeatures;
var gotMultiTurret; // specifies if the machine has several turrets
//Lower Turret is untested at this time
var airCleanChuck = false; // use air to clean off chuck at part transfer

var WARNING_WORK_OFFSET = 0;
var SPINDLE_MAIN = 0;
var SPINDLE_SUB = 1;
var SPINDLE_LIVE = 2;

var TRANSFER_PHASE = 0;
var TRANSFER_STOP = 2;

// getSpindle parameters
var TOOL = false;
var PART = true;

// moveSubSpindle parameters
var HOME = 0;
var RAPID = 1;
var FEED = 2;
var TORQUE = 3;

// clampChuck parameters
var CLAMP = true;
var UNCLAMP = false;

// collected state
var sequenceNumber;
var currentWorkOffset;
var optionalSection = false;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var currentFeedId;
var previousSpindle = SPINDLE_MAIN;
var previousPartSpindle = SPINDLE_MAIN;
var activeSpindle = SPINDLE_MAIN;
var partCutoff = false;
var transferUseTorque;
var showSequenceNumbers;
var forcePolarCoordinates = false; // forces XZC output, activated by Action:usePolarCoordinates
var forcePolarInterpolation = false; // force Polar interpolation output, activated by Action:usePolarInterpolation
var tapping = false;
var useSmoothing = false;
var maximumCircularRadiiDifference = toPreciseUnit(0.005, MM);
var bestABC = undefined;
var turret1GotBAxis;  // for storing the initial state of the gotBAxis variable, when switching turret.
var reverseAxes;
var operationSupportsTCP; // multi-axis operation supports TCP
var lastSpindleMode = undefined;
var lastSpindleSpeed = 0;
var lastSpindleDirection = undefined;
var retracted = false; // specifies that the tool has been retracted to the safe plane
var useTCPC;
var previousBAxisOrientationTurning = new Vector(0, 0, 0);
var tcpIsActive = false;

var machineState = {
  isTurningOperation            : undefined,
  liveToolIsActive              : undefined,
  cAxisIsEngaged                : undefined,
  machiningDirection            : undefined,
  mainSpindleIsActive           : undefined,
  subSpindleIsActive            : undefined,
  mainSpindleBrakeIsActive      : undefined,
  subSpindleBrakeIsActive       : undefined,
  tailstockIsActive             : undefined,
  usePolarInterpolation         : undefined,
  usePolarCoordinates           : undefined,
  axialCenterDrilling           : undefined,
  currentBAxisOrientationTurning: new Vector(0, 0, 0),
  mainChuckIsClamped            : undefined,
  subChuckIsClamped             : undefined,
  spindlesAreAttached           : false,
  stockTransferIsActive         : false,
  currentTurret                 : 1,
  feedPerRevolution             : undefined
};

/** G/M codes setup. */
function getCode(code, spindle) {
  switch (code) {
  case "PART_CATCHER_ON":
    return 248;
  case "PART_CATCHER_OFF":
    return 249;
  case "TAILSTOCK_ON":
    machineState.tailstockIsActive = true;
    return 841;
  case "TAILSTOCK_OFF":
    machineState.tailstockIsActive = false;
    return 843;
  case "ENABLE_C_AXIS":
    machineState.cAxisIsEngaged = true;
    return (spindle == SPINDLE_MAIN) ? 200 : 300;
  case "DISABLE_C_AXIS":
    machineState.cAxisIsEngaged = false;
    return (spindle == SPINDLE_MAIN) ? 202 : 302;
  case "POLAR_INTERPOLATION_ON":
    return (spindle == SPINDLE_MAIN) ? gPolarModal.format(12.1) : gPolarModal.format(12.1) + " P2";
  case "POLAR_INTERPOLATION_OFF":
    return gPolarModal.format(13.1);
  case "STOP_LIVE_TOOL":
    machineState.liveToolIsActive = false;
    return 5;
  case "STOP_MAIN_SPINDLE":
    machineState.mainSpindleIsActive = false;
    return 205;
  case "STOP_SUB_SPINDLE":
    machineState.subSpindleIsActive = false;
    return 305;
  case "START_LIVE_TOOL_CW":
    machineState.liveToolIsActive = true;
    return 3;
  case "START_LIVE_TOOL_CCW":
    machineState.liveToolIsActive = true;
    return 4;
  case "START_MAIN_SPINDLE_CW":
    machineState.mainSpindleIsActive = true;
    return 203;
  case "START_MAIN_SPINDLE_CCW":
    machineState.mainSpindleIsActive = true;
    return 204;
  case "START_SUB_SPINDLE_CW":
    machineState.subSpindleIsActive = true;
    return 303;
  case "START_SUB_SPINDLE_CCW":
    machineState.subSpindleIsActive = true;
    return 304;
  case "MAIN_SPINDLE_BRAKE_ON":
    machineState.mainSpindleBrakeIsActive = true;
    return cAxisBrakeModal.format(14);
  case "MAIN_SPINDLE_BRAKE_OFF":
    machineState.mainSpindleBrakeIsActive = false;
    return cAxisBrakeModal.format(15);
  case "SUB_SPINDLE_BRAKE_ON":
    machineState.subSpindleBrakeIsActive = true;
    return cAxisBrakeModal.format(114);
  case "SUB_SPINDLE_BRAKE_OFF":
    machineState.subSpindleBrakeIsActive = false;
    return cAxisBrakeModal.format(115);
  case "FEED_MODE_UNIT_REV":
    machineState.feedPerRevolution = true;
    return gFeedModeModal.format(95);
  case "FEED_MODE_UNIT_MIN":
    machineState.feedPerRevolution = false;
    return gFeedModeModal.format(94);
  case "CONSTANT_SURFACE_SPEED_ON":
    return gSpindleModeModal.format(96);
  case "CONSTANT_SURFACE_SPEED_OFF":
    return gSpindleModeModal.format(97);
  case "CLAMP_B_AXIS":
    return 107;
  case "UNCLAMP_B_AXIS":
    return 108;
  case "CLAMP_PRIMARY_SPINDLE":
    return 210;
  case "UNCLAMP_PRIMARY_SPINDLE":
    return 212;
  case "CLAMP_SECONDARY_SPINDLE":
    return 310;
  case "UNCLAMP_SECONDARY_SPINDLE":
    return 312;
  case "CLAMP_CHUCK":
    return (spindle == SPINDLE_MAIN) ? 207 : 307;
  case "UNCLAMP_CHUCK":
    return (spindle == SPINDLE_MAIN) ? 206 : 306;
  case "SPINDLE_SYNCHRONIZATION_PHASE":
    return 511;
  case "SPINDLE_SYNCHRONIZATION_PHASE_OFF":
    return 513;
  case "SPINDLE_SYNCHRONIZATION_SPEED":
    return 511;
  case "SPINDLE_SYNCHRONIZATION_SPEED_OFF":
    return 513;
  case "TORQUE_SKIP_ON":
    return 508;
  case "TORQUE_SKIP_OFF":
    return 509;
  // case "START_CHIP_TRANSPORT":
    // return mFormat.format(undefined);
  // case "STOP_CHIP_TRANSPORT":
    // return mFormat.format(undefined);
  // case "OPEN_DOOR":
    // return mFormat.format(undefined);
  // case "CLOSE_DOOR":
    // return mFormat.format(undefined);
  // case "MAINSPINDLE_AIR_BLAST_ON":
    // return mFormat.format(undefined);
  // case "MAINSPINDLE_AIR_BLAST_OFF":
    // return mFormat.format(undefined);
  // case "SUBSPINDLE_AIR_BLAST_ON":
    // return mFormat.format(undefined);
  // case "SUBSPINDLE_AIR_BLAST_OFF":
    // return mFormat.format(undefined);
  case "AIR_BLAST_ON":
    return 129;
  case "AIR_BLAST_OFF":
    return 9;
  default:
    error(localize("Command " + code + " is not defined."));
    return 0;
  }
}

/**
  Returns the desired tolerance for the given section in MM.
*/
function getTolerance() {
  var t1 = toPreciseUnit(tolerance, MM);
  var t2 = getParameter("operation:tolerance", t1);
  t1 = t1 > 0 ? Math.min(t1, t2) : t2;
  return unit == IN ? t1 * 25.4 : t1;
}

function formatSequenceNumber() {
  if (sequenceNumber > 99999) {
    sequenceNumber = getProperty("sequenceNumberStart");
  }
  var seqno = "N" + sequenceNumber;
  sequenceNumber += getProperty("sequenceNumberIncrement");
  return seqno;
}

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  var seqno = "";
  var opskip = "";
  if (showSequenceNumbers == "true") {
    seqno = formatSequenceNumber();
  }
  if (optionalSection) {
    opskip = "/";
  }
  if (text) {
    writeWords(opskip, seqno, text);
    if (getProperty("showSequenceNumbers") == "toolChange") {
      showSequenceNumbers = "false";
    }
  }
}

function writeDebug(_text) {
  writeComment("DEBUG - " + _text);
  log("DEBUG - " + _text);
}

function formatComment(text) {
  return "(" + String(filterText(String(text).toUpperCase(), permittedCommentChars)) + ")";
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

function defineMachine() {
  turret1GotYAxis = true; // specifies if machine has a y axis
  gotBAxis = true;
  useTCPC = getProperty("useTCPC");
  bAxisIsManual = false; // B-axis is manually set and not programmable
  if (modelType == "Integrex i-100") {
    gotSecondarySpindle = false;
    yAxisMinimum = toPreciseUnit(-105, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(105, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-50, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-100S") {
    gotSecondarySpindle = true;
    yAxisMinimum = toPreciseUnit(-105, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(105, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-50, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-200") {
    gotSecondarySpindle = false;
    yAxisMinimum = toPreciseUnit(-130, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(130, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-75, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-200S") {
    gotSecondarySpindle = true;
    yAxisMinimum = toPreciseUnit(-130, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(130, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-75, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-300") {
    gotSecondarySpindle = false;
    yAxisMinimum = toPreciseUnit(-130, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(130, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-75, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-300S") {
    gotSecondarySpindle = true;
    yAxisMinimum = toPreciseUnit(-130, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(130, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-75, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-400") {
    gotSecondarySpindle = false;
    yAxisMinimum = toPreciseUnit(-130, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(130, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-75, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  } else if (modelType == "Integrex i-400S") {
    gotSecondarySpindle = true;
    yAxisMinimum = toPreciseUnit(-130, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(130, MM); // specifies the maximum range for the Y-axis
    xAxisMinimum = toPreciseUnit(-75, MM); // specifies the maximum range for the X-axis (RADIUS MODE VALUE)
    gotMultiTurret = false; // specifies if the machine has several turrets
    maximumSpindleSpeedLive = 12000;
  }
  if (!turret1GotYAxis) {
    yAxisMinimum = 0;
    yAxisMaximum = 0;
  }

  // define B-axis
  if (bAxisIsManual) {
    bFormat = createFormat({prefix:"(B=", suffix:")", decimals:3, forceDecimal:true, scale:DEG});
    bOutput.setPrefix("(B=");
    bOutput.setSuffix(")");
  } else {
    bOutput.setPrefix("B");
    bOutput.setSuffix("");
  }
}

function activateMachine(section) {
  // TCP setting
  operationSupportsTCP = section.isMultiAxis() && useTCPC;

  // handle multiple turrets
  var turret = 1;
  if (gotMultiTurret) {
    turret = section.getTool().turret;
    if (turret == 0) {
      warningOnce(localize("Turret has not been specified. Using Turret 1 as default."), WARNING_TURRET_UNSPECIFIED);
      turret = 1; // upper turret as default
    }
    turret = turret == undefined ? 1 : turret;
    switch (turret) {
    case 1:
      gotYAxis = turret1GotYAxis;
      gotBAxis = turret1GotBAxis;
      break;
    case 2:
      gotYAxis = turret2GotYAxis;
      gotBAxis = false;
      break;
    default:
      error(subst(localize("Turret %1 is not supported"), turret));
      return turret;
    }
  } else {
    gotYAxis = turret1GotYAxis;
  }

  // disable unsupported rotary axes output
  if (!gotYAxis) {
    yOutput.disable();
  }
  aOutput.disable();

  // define machine configuration
  var bAxis;
  var cAxis;
  if (section.getSpindle() == SPINDLE_PRIMARY) {
    bAxis = createAxis({coordinate:1, table:false, axis:[0, -1, 0], range:[-30, 210], preference:0, tcp:true});
    cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], range:[0, 359.9999], cyclic:true, preference:0, tcp:false});
  } else {
    bAxis = createAxis({coordinate:1, table:false, axis:[0, 1, 0], range:[-30, 210], preference:0, tcp:true});
    cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, -1], range:[0, 359.9999], cyclic:true, preference:0, tcp:false});
  }
  if (gotBAxis) {
    machineConfiguration = new MachineConfiguration(bAxis, cAxis);
    bOutput.enable();
  } else {
    machineConfiguration = new MachineConfiguration(cAxis);
    bOutput.disable();
  }

  // define spindle axis
  if (!gotBAxis || bAxisIsManual || (turret == 2)) {
    if ((getMachiningDirection(section) == MACHINING_DIRECTION_AXIAL) && !section.isMultiAxis()) {
      machineConfiguration.setSpindleAxis(new Vector(0, 0, 1));
    } else {
      machineConfiguration.setSpindleAxis(new Vector(1, 0, 0));
    }
  } else {
    // set the spindle axis depending on B0 orientation
    if (section.spindle == SPINDLE_PRIMARY) {
      machineConfiguration.setSpindleAxis(new Vector(0, 0, 1));
    } else {
      machineConfiguration.setSpindleAxis(new Vector(0, 0, -1));
    }
  }

  // define linear axes limits
  var xAxisMaximum = 10000; // don't check X-axis maximum limit
  yAxisMinimum = gotYAxis ? yAxisMinimum : 0;
  yAxisMaximum = gotYAxis ? yAxisMaximum : 0;
  var xAxis = createAxis({actuator:"linear", coordinate:0, table:true, axis:[1, 0, 0], range:[xAxisMinimum, xAxisMaximum]});
  var yAxis = createAxis({actuator:"linear", coordinate:1, table:true, axis:[0, 1, 0], range:[yAxisMinimum, yAxisMaximum]});
  var zAxis = createAxis({actuator:"linear", coordinate:2, table:true, axis:[0, 0, 1], range:[-100000, 100000]});
  machineConfiguration.setAxisX(xAxis);
  machineConfiguration.setAxisY(yAxis);
  machineConfiguration.setAxisZ(zAxis);

  // enable retract/reconfigure
  safeRetractDistance = (unit == IN) ? 1 : 25; // additional distance to retract out of stock, can be overridden with a property
  safeRetractFeed = (unit == IN) ? 20 : 500; // retract feed rate
  safePlungeFeed = (unit == IN) ? 10 : 250; // plunge feed rate
  var stockExpansion = new Vector(toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN)); // expand stock XYZ values
  machineConfiguration.enableMachineRewinds();
  machineConfiguration.setSafeRetractDistance(safeRetractDistance);
  machineConfiguration.setSafeRetractFeedrate(safeRetractFeed);
  machineConfiguration.setSafePlungeFeedrate(safePlungeFeed);
  machineConfiguration.setRewindStockExpansion(stockExpansion);

  // multi-axis feedrates
  machineConfiguration.setMultiAxisFeedrate(
    operationSupportsTCP ? FEED_FPM : FEED_DPM, // FEED_INVERSE_TIME,
    99999, // maximum output value for dpm feed rates
    DPM_COMBINATION, // INVERSE_MINUTES/INVERSE_SECONDS or DPM_COMBINATION/DPM_STANDARD
    0.5, // tolerance to determine when the DPM feed has changed
    unit == MM ? 1.0 : 1.0 // ratio of rotary accuracy to linear accuracy for DPM calculations
  );

  machineConfiguration.setVendor("Mazak");
  machineConfiguration.setModel(modelType);
  setMachineConfiguration(machineConfiguration);
  if (section.isMultiAxis()) {
    section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
  }
  return turret;
}

/**
  Writes the specified optional block.
*/
function writeOptionalBlock() {
  if (showSequenceNumbers == "true") {
    var words = formatWords(arguments);
    if (words) {
      writeWords("/", "N" + sequenceNumber, words);
      sequenceNumber += getProperty("sequenceNumberIncrement");
    }
  } else {
    writeWords2("/", arguments);
  }
}

var machineConfigurationMainSpindle;
var machineConfigurationSubSpindle;

function onOpen() {
  // define machine
  defineMachine();
  turret1GotBAxis = gotBAxis;
  activeTurret = activateMachine(getSection(0));

  if (getProperty("useRadius")) {
    maximumCircularSweep = toRad(90); // avoid potential center calculation errors for CNC
  }
  // Copy certain properties into global variables
  transferUseTorque = getProperty("transferUseTorque");
  reverseAxes = getProperty("reverseAxes", true);

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }
  showSequenceNumbers = getProperty("showSequenceNumbers");
  sequenceNumber = getProperty("sequenceNumberStart");

  if (programName) {
    if (programComment) {
      writeln(formatComment(programComment));
    } else {
      //writeln("O" + programName);
    }
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  if (getProperty("writeVersion")) {
    if ((typeof getHeaderVersion == "function") && getHeaderVersion()) {
      writeComment(localize("post version") + ": " + getHeaderVersion());
    }
    if ((typeof getHeaderDate == "function") && getHeaderDate()) {
      writeComment(localize("post modified") + ": " + getHeaderDate());
    }
  }

  // dump machine configuration
  var vendor = machineConfiguration.getVendor();
  var model = machineConfiguration.getModel();
  var description = machineConfiguration.getDescription();

  if (getProperty("writeMachine") && (vendor || model || description)) {
    writeComment(localize("Machine"));
    if (vendor) {
      writeComment("  " + localize("vendor") + " - " + vendor);
    }
    if (model) {
      writeComment(" " + localize("model") + " - " + model);
    }
    if (description) {
      writeComment("  " + localize("description") + " - "  + description);
    }
    writeComment(" " + localize("Controller Type - " + getProperty("controllerType")));
  }

  // dump tool information
  var toolData = new Array();
  var toolFormat = createFormat({zeropad:false});
  if (getProperty("writeTools")) {
    var zRanges = {};
    var numberOfSections = getNumberOfSections();
    for (var i = 0; i < numberOfSections; ++i) {
      var section = getSection(i);
      var tool = section.getTool();
      if (is3D()) {
        var zRange = section.getGlobalZRange();
        if (zRanges[tool.number]) {
          zRanges[tool.number].expandToRange(zRange);
        } else {
          zRanges[tool.number] = zRange;
        }
      }
      if (tool.isTurningTool()) {
        toolData[tool.number] = {
          dia: section.getParameter("operation:tool_cornerRadius", 0),
          rad: section.getParameter("operation:tool_cornerRadius", 0),
          hgt: section.getParameter("operation:tool_thickness", 0),
        };
      }
    }

    var tools = getToolTable();
    if (tools.getNumberOfTools() > 0) {
      for (var i = 0; i < tools.getNumberOfTools(); ++i) {
        var tool = tools.getTool(i);
        if (tool.isTurningTool()) {
          var compensationOffset = tool.compensationOffset;
          var comment = "T" + toolFormat.format(tool.number) + conditional(tool.productId, ".") + tool.productId + " " +
            "DIA=" + spatialFormat.format(toolData[tool.number].dia) + " " +
            localize("RAD=") + spatialFormat.format(toolData[tool.number].rad) + " " +
            localize("HGT=") + spatialFormat.format(toolData[tool.number].hgt);
        } else {
          var compensationOffset = tool.lengthOffset;
          var comment = "T" + toolFormat.format(tool.number) + conditional(tool.productId, ".") + tool.productId + " " +
            "D=" + spatialFormat.format(tool.diameter) + " " +
            localize("CR") + "=" + spatialFormat.format(tool.cornerRadius);
          if ((tool.taperAngle > 0) && (tool.taperAngle < Math.PI)) {
            comment += " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg");
          }
          if (zRanges[tool.number]) {
            comment += " - " + localize("ZMIN") + "=" + spatialFormat.format(zRanges[tool.number].getMinimum());
          }
        }
        comment += " - " + getToolTypeName(tool.type);
        writeComment(comment);
      }
    }
  }

  if (false) {
    // check for duplicate tool number
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var sectioni = getSection(i);
      var tooli = sectioni.getTool();
      for (var j = i + 1; j < getNumberOfSections(); ++j) {
        var sectionj = getSection(j);
        var toolj = sectionj.getTool();
        if (tooli.number == toolj.number) {
          if (spatialFormat.areDifferent(tooli.diameter, toolj.diameter) ||
              spatialFormat.areDifferent(tooli.cornerRadius, toolj.cornerRadius) ||
              abcFormat.areDifferent(tooli.taperAngle, toolj.taperAngle) ||
              (tooli.numberOfFlutes != toolj.numberOfFlutes)) {
            error(
              subst(
                localize("Using the same tool number for different cutter geometry for operation '%1' and '%2'."),
                sectioni.hasParameter("operation-comment") ? sectioni.getParameter("operation-comment") : ("#" + (i + 1)),
                sectionj.hasParameter("operation-comment") ? sectionj.getParameter("operation-comment") : ("#" + (j + 1))
              )
            );
            return;
          }
        }
      }
    }
  }
  var usesPrimarySpindle = false;
  var usesSecondarySpindle = false;
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (section.getType() != TYPE_TURNING) {
      continue;
    }
    switch (section.spindle) {
    case SPINDLE_PRIMARY:
      usesPrimarySpindle = true;
      break;
    case SPINDLE_SECONDARY:
      usesSecondarySpindle = true;
      break;
    }
  }

  if ((getNumberOfSections() > 0) && (getSection(0).workOffset == 0)) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      if (getSection(i).workOffset > 0) {
        error(localize("Using multiple work offsets is not possible if the initial work offset is 0."));
        return;
      }
    }
  }

  if (getProperty("writeDateAndTime")) {
    var date = new Date(Date.now());
    writeComment(date.toDateString() + " - " + date.getHours().toString() + ":" + date.getMinutes().toString());
  }
  //writeBlock("#" + xHomeParameter + "=" + spatialFormat.format(getProperty("homePositionX")) + "(PARAMETER FOR X HOME POSITION)"); // retract
  writeBlock("#" + zHomeParameter + "=" + spatialFormat.format(getProperty("homePositionZ")) + "(PARAMETER FOR Z HOME POSITION)"); // retract
  if (gotYAxis) {
    //writeBlock("#" + yHomeParameter + "=" + spatialFormat.format(getProperty("homePositionY")) + "(PARAMETER FOR Y HOME POSITION)"); // retract
  }
  if (gotSecondarySpindle) {
    writeBlock("#" + zSubHomeParameter + "=" + spatialFormat.format(getProperty("homePositionSubZ")) + "(PARAMETER FOR SUB Z HOME POSITION)"); // retract
    writeBlock("#501=0.", "(DISTANCE SUB FACE TO Z0 ON MAIN)");
  }
  writeln("");
  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(20));
    break;
  case MM:
    writeBlock(gUnitModal.format(21));
    break;
  }
  writeBlock(gMotionModal.format(0), gAbsIncModal.format(90), getCode("FEED_MODE_UNIT_MIN"), gFormat.format(getSection(0).spindle == SPINDLE_PRIMARY ? 54 : 55), getCode("CONSTANT_SURFACE_SPEED_OFF"));
  writeBlock(gFormat.format(40), gFormat.format(49), gFormat.format(80), gFormat.format(67), gRotationModal.format(69), gPlaneModal.format(18));
  writeln("");

  if (usesPrimarySpindle) {
    writeBlock(gFormat.format(92), sOutput.format(getProperty("maximumSpindleSpeed")), "R1"); // spindle 1 is the default
    sOutput.reset();
  }

  if (gotSecondarySpindle) {
    if (usesSecondarySpindle) {
      writeBlock(gFormat.format(92), sOutput.format(getProperty("maximumSpindleSpeed")), "R2");
      sOutput.reset();
    }
  }

  onCommand(COMMAND_START_CHIP_TRANSPORT);
}

function onComment(message) {
  writeComment(message);
}

/** Force output of X, Y, and Z. */
function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

/** Force output of A, B, and C. */
function forceABC() {
  aOutput.reset();
  bOutput.reset();
  cOutput.reset();
}

function forceFeed() {
  currentFeedId = undefined;
  feedOutput.reset();
}

/** Force output of X, Y, Z, A, B, C, and F on next output. */
function forceAny() {
  forceXYZ();
  forceABC();
  forceFeed();
}

function forceUnlockMultiAxis() {
  cAxisBrakeModal.reset();
}

function forceModals() {
  if (arguments.length == 0) { // reset all modal variables listed below
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
      arguments[i].reset(); // only reset the modal variable passed to this function
    }
  }
}

function FeedContext(id, description, feed) {
  this.id = id;
  this.description = description;
  this.feed = feed;
}

function formatFeedMode(mode) {
  var fMode = (mode == FEED_PER_REVOLUTION) ? getCode("FEED_MODE_UNIT_REV") : getCode("FEED_MODE_UNIT_MIN");
  if (fMode) {
    if (mode == FEED_PER_REVOLUTION) {
      feedFormat = fprFormat;
    } else {
      feedFormat = fpmFormat;
    }
    feedOutput = setFormat(feedFormat);
  }
  return gFeedModeModal.format(fMode);
}

function getFeed(f) {
  if (currentSection.feedMode != FEED_PER_REVOLUTION && machineState.feedPerRevolution) {
    f /= spindleSpeed;
  }
  if (activeMovements) {
    var feedContext = activeMovements[movement];
    if (feedContext != undefined) {
      if (!feedFormat.areDifferent(feedContext.feed, f)) {
        if (feedContext.id == currentFeedId) {
          return ""; // nothing has changed
        }
        forceFeed();
        currentFeedId = feedContext.id;
        return "F#" + (firstFeedParameter + feedContext.id);
      }
    }
    currentFeedId = undefined; // force Q feed next time
  }
  return feedOutput.format(f); // use feed value
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
  if (true) { // high feed
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

  for (var i = 0; i < activeFeeds.length; ++i) {
    var feedContext = activeFeeds[i];
    writeBlock("#" + (firstFeedParameter + feedContext.id) + "=" + feedFormat.format(feedContext.feed), formatComment(feedContext.description));
  }
}

var currentSmoothing = false;

function setSmoothing(mode) {
  if (mode == currentSmoothing) {
    return;
  }
  currentSmoothing = mode;
  writeBlock(gFormat.format(5), mode ? "P2" : "P0");
}

var currentGeoComp = false;

function setGeometryComp(mode) {
  if (mode == currentGeoComp) {
    return;
  }
  currentGeoComp = mode;
  if (mode) {
    writeBlock(gFormat.format(61.1), (conditional(getProperty("controllerType") == "Smooth", "P0")));
  } else {
    writeBlock(gFormat.format(64));
  }
}

var currentWorkPlaneABC = undefined;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function setWorkPlane(abc) {
  // milling only

  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }
  if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
    return; // no change
  }

  if (useMultiAxisFeatures && useTCPC) {
    if (abc.isNonZero()) {
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      writeBlock(gRotationModal.format(69));
      var initialToolAxisBC = machineConfiguration.getABC(currentSection.workPlane);
      writeBlock(gRotationModal.format(68.2), "X" + spatialFormat.format(0), "Y" + spatialFormat.format(0), "Z" + spatialFormat.format(0), "I" + abcFormat.format(abc.x), "J" + abcFormat.format(abc.y), "K" + abcFormat.format(abc.z)); // set frame
      writeBlock(gFormat.format(53.1), formatComment("B" + abcFormat.format(initialToolAxisBC.y)), formatComment("C" + abcFormat.format(initialToolAxisBC.z))); // turn machine
    }
  } else {
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    if (abc.y != 0) {
      writeBlock(gRotationModal.format(69));
      if (!machineState.spindlesAreAttached) {
        forceABC();
        writeBlock(
          gMotionModal.format(0),
          conditional(machineConfiguration.isMachineCoordinate(0), aOutput.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), bOutput.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), cOutput.format(abc.z))
        );
      }
      writeBlock(gRotationModal.format(68), "X" + spatialFormat.format(0), "Y" + spatialFormat.format(0), "Z" + spatialFormat.format(0), "I" + spatialFormat.format(0), "J" + spatialFormat.format(1), "K" + spatialFormat.format(0), "R" + abcFormat.format(abc.y)); // set frame
    } else {
      cOutput.reset();
      writeBlock(
        gMotionModal.format(0),
        conditional(machineConfiguration.isMachineCoordinate(0), aOutput.format(abc.x)),
        conditional(machineConfiguration.isMachineCoordinate(1), bOutput.format(abc.y)),
        conditional(machineConfiguration.isMachineCoordinate(2), cOutput.format(abc.z))
      );
    }
  }

  // Don't clamp the C axis if the machine is using polar, only clamp the B (if it exists)
  if (!machineState.usePolarInterpolation && !machineState.usePolarCoordinates) {
    if (!machineState.spindlesAreAttached) {
      onCommand(COMMAND_LOCK_MULTI_AXIS);
    }
  } else if (gotBAxis) {
    writeBlock(mFormat.format(getCode("CLAMP_B_AXIS"))); // B-axis
  }

  currentWorkPlaneABC = new Vector(abc.x, abc.y, abc.z);
  setCurrentDirection(abc);
}

function getBestABC(section) {
  // try workplane orientation
  var abc = section.getABCByPreference(machineConfiguration, section.workPlane, getCurrentDirection(), C, PREFER_CLOSEST, ENABLE_ALL);
  if (section.spindle == SPINDLE_SECONDARY) {
    abc.setZ(Math.PI - abc.z); // C-axis is rotated 180 degrees on secondary spindle due to 0,0,-1 spindle vector
  }
  if (section.doesToolpathFitWithinLimits(machineConfiguration, abc)) {
    return abc;
  }
  var currentABC = new Vector(abc);

  // quadrant boundaries are the preferred solution
  var quadrants = [0, 90, 180, 270];
  for (var i = 0; i < quadrants.length; ++i) {
    abc.setZ(toRad(quadrants[i]));
    if (section.doesToolpathFitWithinLimits(machineConfiguration, abc)) {
      abc = machineConfiguration.remapToABC(abc, currentABC);
      abc = machineConfiguration.remapABC(abc);
      return abc;
    }
  }

  // attempt to find soultion at fixed angle rotations
  var maxTries = 60; // every 6 degrees
  var delta = (Math.PI * 2) / maxTries;
  var angle = delta;
  for (var i = 0; i < (maxTries - 1); i++) {
    abc.setZ(angle);
    if (section.doesToolpathFitWithinLimits(machineConfiguration, abc)) {
      abc = machineConfiguration.remapToABC(abc, currentABC);
      abc = machineConfiguration.remapABC(abc);
      return abc;
    }
    angle += delta;
  }
  return abc;
}

function getWorkPlaneMachineABC(section, workPlane) {
  var W = workPlane; // map to global frame
  var abc;
  if ((machineState.isTurningOperation || machineState.axialCenterDrilling) && gotBAxis) {
    var both = machineConfiguration.getABCByDirectionBoth(workPlane.forward);
    abc = both[0];
    if (both[0].z != 0) {
      abc = both[1];
    }
  } else {
    abc = bestABC ? bestABC :
      section.getABCByPreference(machineConfiguration, W, getCurrentDirection(), C, PREFER_CLOSEST, ENABLE_RESET);
  }

  var direction = machineConfiguration.getDirection(abc);
  if (!isSameDirection(direction, W.forward)) {
    error(localize("Orientation not supported."));
  }

  if ((machineState.isTurningOperation || machineState.axialCenterDrilling) && gotBAxis && !bAxisIsManual) { // remapABC can change the B-axis orientation
    if (abc.z != 0) {
      error(localize("Could not calculate a B-axis turning angle within the range of the machine."));
      return abc;
    }
  }

  if (!machineState.isTurningOperation) {
    var tcp = false;
    if (tcp) {
      setRotation(W); // TCP mode
    } else {
      var O = machineConfiguration.getOrientation(abc);
      var R = machineConfiguration.getRemainingOrientation(abc, W);
      setRotation(R);
    }
  }
  return abc;
}

function getBAxisOrientationTurning(section) {
  var abc = new Vector(0, 0, 0);
  var toolAngle = hasParameter("operation:tool_angle") ? getParameter("operation:tool_angle") : 0;
  var toolOrientation = section.toolOrientation;
  if (toolAngle && (toolOrientation != 0)) {
    error(localize("You cannot use tool angle and tool orientation together in operation " + "\"" + (getParameter("operation-comment")) + "\""));
    return abc;
  }
  if (!machineState.axialCenterDrilling) {
    var angle = toRad(toolAngle) + toolOrientation;

    var axis = new Vector(0, 1, 0);
    var mappedAngle = (section.spindle == SPINDLE_PRIMARY ? (Math.PI / 2 - angle) : (Math.PI / 2 - angle));
    var mappedWorkplane = new Matrix(axis, mappedAngle);
    abc = getWorkPlaneMachineABC(section, mappedWorkplane);
  } else {
    abc = getWorkPlaneMachineABC(section, section.workPlane);
  }
  return abc;
}

function getSpindle(whichSpindle) {
  // safety conditions
  if (getNumberOfSections() == 0) {
    return SPINDLE_MAIN;
  }
  if (getCurrentSectionId() < 0) {
    if (machineState.liveToolIsActive && (whichSpindle == TOOL)) {
      return SPINDLE_LIVE;
    } else {
      return getSection(getNumberOfSections() - 1).spindle;
    }
  }

  // Turning is active or calling routine requested which spindle part is loaded into
  if (machineState.isTurningOperation || machineState.axialCenterDrilling || (whichSpindle == PART)) {
    return currentSection.spindle;
  //Milling is active
  } else {
    return SPINDLE_LIVE;
  }
}

function getSecondarySpindle() {
  var spindle = getSpindle(PART);
  return (spindle == SPINDLE_MAIN) ? SPINDLE_SUB : SPINDLE_MAIN;
}

function invertAxes(activate, polarMode) {
  var scaleValue = reverseAxes ? -1 : 1;
  var yAxisPrefix = polarMode ? (activate ? "U" : "C") : "Y";
  var yIsEnabled = yOutput.isEnabled();
  xFormat.setScale(Math.abs(xFormat.getScale()));
  yFormat.setScale(activate ? scaleValue : 1);
  zFormat.setScale(activate ? -1 : 1);
  cFormat.setScale(DEG);

  // special considerations
  if (activate && (machineState.usePolarCoordinates || machineState.usePolarInterpolation)) {
    xFormat.setScale(Math.abs(xFormat.getScale()) * -1);
    zFormat.setScale(1);
    cFormat.setScale(DEG * -1);
  }

  xOutput.setFormat(xFormat);
  yOutput.setFormat(yFormat);
  yOutput.setPrefix(yAxisPrefix);
  zOutput.setFormat(zFormat);

  if (polarMode) {
    cOutput.disable();
  } else {
    cOutput.setPrefix(activate ? "U" : "C");
    cOutput.setFormat(cFormat);
    if (!yIsEnabled) {
      yOutput.disable();
    }
  }
  iOutput.setScale(xFormat.getScale());
  jOutput.setFormat(yFormat);
  kOutput.setFormat(zFormat);
}

/** determines if the axes in the given plane are mirrored */
function isMirrored(plane) {
  plane = plane == -1 ? getCompensationPlane(getCurrentDirection(), false, false) : plane;
  switch (plane) {
  case PLANE_XY:
    if ((xFormat.getScale() * yFormat.getScale()) < 0) {
      return true;
    }
    break;
  case PLANE_YZ:
    if ((yFormat.getScale() * zFormat.getScale()) < 0) {
      return true;
    }
    break;
  case PLANE_ZX:
    if ((zFormat.getScale() * xFormat.getScale()) < 0) {
      return true;
    }
    break;
  }
  return false;
}

function onSectionSpecialCycle() {
  if (!isFirstSection()) {
    activateMachine(currentSection);
  }
}

function onSection() {
  if (getProperty("tiltedPlaneMethod") == "G68" || machineState.usePolarInterpolation || (currentSection.spindle == SPINDLE_SECONDARY)) {
    useMultiAxisFeatures = false;
  } else {
    useMultiAxisFeatures = true;
  }

  // Detect machine configuration
  var currentTurret = isFirstSection() ? activeTurret : activateMachine(currentSection);

  // Define Machining modes
  tapping = isTappingCycle();

  var forceSectionRestart = optionalSection && !currentSection.isOptional();
  optionalSection = currentSection.isOptional();
  bestABC = undefined;

  var yAxisWasEnabled = !machineState.usePolarCoordinates && !machineState.usePolarInterpolation && machineState.liveToolIsActive;

  updateMachiningMode(currentSection); // sets the needed machining mode to machineState (usePolarInterpolation, usePolarCoordinates, axialCenterDrilling)

  if (isFirstSection()) {
    previousBAxisOrientationTurning = new Vector(machineState.currentBAxisOrientationTurning);
  }

  var insertToolCall = isToolChangeNeeded("number", "compensationOffset", "diameterOffset", "lengthOffset", "productId") || forceSectionRestart || isFirstSection();

  retracted = false; // specifies that the tool has been retracted to the safe plane
  var newSpindle = isFirstSection() ||
    (getPreviousSection().spindle != currentSection.spindle);

  // Get the active spindle
  var newSpindle = true;
  var tempSpindle = getSpindle(TOOL);
  var tempPartSpindle = getSpindle(PART);
  if (isFirstSection()) {
    previousSpindle = tempSpindle;
    previousPartSpindle = currentSection.spindle;
  }
  newSpindle = tempSpindle != previousSpindle || tempPartSpindle != previousPartSpindle;

  var newWorkOffset = isNewWorkOffset() || forceSectionRestart; // work offset changes
  var newWorkPlane = isNewWorkPlane() || forceSectionRestart ||
    (machineState.isTurningOperation &&
      abcFormat.areDifferent(machineState.currentBAxisOrientationTurning.x, previousBAxisOrientationTurning.x) ||
      abcFormat.areDifferent(machineState.currentBAxisOrientationTurning.y, previousBAxisOrientationTurning.y) ||
      abcFormat.areDifferent(machineState.currentBAxisOrientationTurning.z, previousBAxisOrientationTurning.z)) ||
      (!getPreviousSection().isMultiAxis() && currentSection.isMultiAxis() ||
      getPreviousSection().isMultiAxis() && !currentSection.isMultiAxis()); // force newWorkPlane between indexing and simultaneous

  partCutoff = getParameter("operation-strategy") == "turningPart";

  if (newWorkPlane || insertToolCall || newSpindle) {
    writeBlock(gRotationModal.format(69));
    forceWorkPlane();
  }

  if (insertToolCall || newSpindle || newWorkOffset || newWorkPlane) {
    if (machineState.liveToolIsActive) {
      writeBlock(mFormat.format(getCode("STOP_LIVE_TOOL")));
    }
    if (machineState.mainSpindleIsActive) {
      writeBlock(mFormat.format(getCode("STOP_MAIN_SPINDLE")));
    }
    if (machineState.subSpindleIsActive) {
      writeBlock(mFormat.format(getCode("STOP_SUB_SPINDLE")));
    }
    lastSpindleSpeed = 0;
    lastSpindleDirection = undefined;
    sOutput.reset();

    // retract to safe plane
    setCoolant(COOLANT_OFF, machineState.currentTurret);
    if (!machineState.spindlesAreAttached) {
      writeRetract(X, Y);
      writeRetract(Z);
      if (isFirstSection()) {
        onCommand(COMMAND_UNLOCK_MULTI_AXIS);
        gMotionModal.reset();
        writeBlock(gMotionModal.format(0), gAbsIncModal.format(90), gFormat.format(53), bOutput.format(toRad(0)));
      }
    } else {
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      writeRetract(X, Y);
      writeBlock(gFormat.format(0), gFormat.format(53), bOutput.format(0), ("Z#" + ((currentSection.spindle == SPINDLE_SECONDARY) ? zSubHomeParameter : zHomeParameter)));
    }
    forceAny();
  }

  if (getProperty("optionalStop")) {
    onCommand(COMMAND_OPTIONAL_STOP);
    gMotionModal.reset();
  }
  writeln("");

  // Consider part cutoff as stockTransfer operation
  if (!(machineState.stockTransferIsActive && partCutoff)) {
    machineState.stockTransferIsActive = false;
  }

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
      for (line in lines) {
        var comment = lines[line].replace(r1, "").replace(r2, "");
        if (comment) {
          writeComment(comment);
        }
      }
    }
  }

  if (insertToolCall) {
    forceWorkPlane();
    forceModals();

    setCoolant(COOLANT_OFF, machineState.currentTurret);
    var toolFormat = createFormat({width:2, zeropad:true});
    if (getProperty("showSequenceNumbers") == "toolChange") {
      showSequenceNumbers = "true";
    }
    if (getProperty("preloadTool")) {
      var nextTool = getNextTool(tool.number);
      if (nextTool) {
        nextool = "T" + toolFormat.format(nextTool.number);
      } else {
        // preload first tool
        var section = getSection(0);
        var firstToolNumber = section.getTool().number;
        if (tool.number != firstToolNumber) {
          nextool = "T" + toolFormat.format(firstToolNumber);
        } else {
          nextool = "T" + toolFormat.format(0);
        }
      }
      writeBlock("T" + toolFormat.format(tool.number) + conditional(tool.productId, "." + tool.productId.replace(".", "")), nextool, mFormat.format(6));
    } else {
      writeBlock("T" + toolFormat.format(tool.number) + conditional(tool.productId, "." + tool.productId.replace(".", "")), mFormat.format(6));
    }

    if (tool.comment) {
      writeComment(tool.comment);
    }
    writeBlock(gMotionModal.format(0), gAbsIncModal.format(90), getCode("CONSTANT_SURFACE_SPEED_OFF"));
    writeBlock(gFormat.format(40), gFormat.format(49), gFormat.format(80), gFormat.format(67), gRotationModal.format(69));

    if (!machineState.spindlesAreAttached) {
      writeRetract(X, Y);
      writeRetract(Z);
    } else {
      writeRetract(X, Y);
      forceABC();
      writeBlock(gFormat.format(0), gFormat.format(53), bOutput.format(0), ("Z#" + ((currentSection.spindle == SPINDLE_SECONDARY) ? zSubHomeParameter : zHomeParameter)));
    }
  }

  setRadiusDiameterMode(insertToolCall);

  // invert axes for secondary spindle
  if (getSpindle(PART) == SPINDLE_SUB) {
    invertAxes(true, false); // polar mode has not been enabled yet
  }

  if (true) {
    switch (currentSection.spindle) {
    case SPINDLE_PRIMARY: // main spindle
      if (gotSecondarySpindle) {
        writeBlock(mFormat.format(901));
      }
      break;
    case SPINDLE_SECONDARY: // sub spindle
      writeBlock(mFormat.format(902));
      break;
    }
  }

  cAxisEngageModal.reset();
  if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
    writeBlock(conditional(machineState.cAxisIsEngaged || machineState.cAxisIsEngaged == undefined), mFormat.format(getCode("DISABLE_C_AXIS", getSpindle(PART))));
  } else { // milling
    writeBlock(conditional(!machineState.cAxisIsEngaged || machineState.cAxisIsEngaged == undefined), mFormat.format(getCode("ENABLE_C_AXIS", getSpindle(PART))));
  }

  if ((currentSection.feedMode == FEED_PER_REVOLUTION) || tapping || machineState.axialCenterDrilling) {
    writeBlock(getCode("FEED_MODE_UNIT_REV")); // mm/rev
  } else {
    writeBlock(getCode("FEED_MODE_UNIT_MIN")); // mm/min
  }

  if (getProperty("useTailStock")) {
    if (machineState.axialCenterDrilling || (currentSection.spindle == SPINDLE_SECONDARY) ||
     (machineState.liveToolIsActive && (getMachiningDirection(currentSection) == MACHINING_DIRECTION_AXIAL))) {
      if (currentSection.tailstock) {
        warning(localize("Tail stock is not supported for secondary spindle or Z-axis milling."));
      }
      if (machineState.tailstockIsActive) {
        writeBlock(mFormat.format(getCode("TAILSTOCK_OFF")));
        writeBlock(mFormat.format(232), formatComment("RETURN TAILSTOCK TO HOME POSITION"));
      }
    } else {
      writeBlock(currentSection.tailstock ? mFormat.format(getCode("TAILSTOCK_ON")) : mFormat.format(getCode("TAILSTOCK_OFF")));
      if (!machineState.tailstockIsActive) {
        writeBlock(mFormat.format(232), formatComment("RETURN TAILSTOCK TO HOME POSITION"));
      }
    }
  }

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }

  if (currentSection.workOffset != currentWorkOffset) {
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  // Activate part catcher for part cutoff section
  if (getProperty("usePartCatcher") && partCutoff && currentSection.partCatcher) {
    engagePartCatcher(true);
  }

  if (getProperty("useParametricFeed") && !isDrillingCycle(true)) {
    if (!insertToolCall &&
        activeMovements &&
        (getCurrentSectionId() > 0) &&
        (getPreviousSection().getPatternId() == currentSection.getPatternId()) && (currentSection.getPatternId() != 0)) {
      // use the current feeds
    } else {
      initializeActiveFeeds();
    }
  } else {
    activeMovements = undefined;
  }

  gMotionModal.reset();

  var abc;
  cancelTransformation();
  if (machineConfiguration.isMultiAxisConfiguration()) {
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) { // turning toolpath
      if (gotBAxis) {
        abc = machineState.currentBAxisOrientationTurning;
        if (insertToolCall || abcFormat.areDifferent(abc.y, previousBAxisOrientationTurning.y)) {
          writeBlock(mFormat.format(getCode("UNCLAMP_B_AXIS"))); // B-axis
          writeBlock(gMotionModal.format(0), gFormat.format(53), "B" + abcFormat.format(abc.y));
          writeBlock(mFormat.format(getCode("CLAMP_B_AXIS"))); // B-axis
        }
      } else {
        setRotation(currentSection.workPlane);
      }
    } else { // milling toolpath
      if (currentSection.isMultiAxis() && useTCPC) {
        forceWorkPlane();
        onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      } else {
        if (useMultiAxisFeatures) {
          if (currentSection.spindle == SPINDLE_PRIMARY) {
            abc = currentSection.workPlane.getEuler2(EULER_ZXZ_R);
          } else {
            var orientation = currentSection.workPlane;
            orientation = new Matrix(orientation.getRight(), orientation.getUp().getNegated(), orientation.getForward().getNegated());
            abc = orientation.getEuler2(EULER_ZXZ_R);
            abc = new Vector(-abc.x, abc.y, -abc.z); // needed for secondary spindle
          }
        } else {
          if (!useTCPC && currentSection.isMultiAxis()) {
            //For machines without TCP Option
            abc = currentSection.getInitialToolAxisABC();
            var mappedWorkplane = machineConfiguration.getOrientation(new Vector(0, -abc.y, 0));
            setRotation(mappedWorkplane);
          } else {
            abc = getWorkPlaneMachineABC(currentSection, currentSection.workPlane);
          }
        }
        if (gotBAxis) {
          if (insertToolCall) {
            bOutput.format(0); // B-axis always moves to 0 at tool change
          }
          setWorkPlane(abc);
        }
      }
    }
  } else { // pure 3D
    var remaining = currentSection.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported by the CNC machine."));
      return;
    }
    setRotation(remaining);
  }
  var forceRPMMode = false;
  var spindleChange = tool.type != TOOL_PROBE &&
    (insertToolCall || forceSpindleSpeed || isSpindleSpeedDifferent() || newSpindle);
  if (spindleChange) {
    forceSpindleSpeed = false;
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      if (spindleSpeed > getProperty("maximumSpindleSpeed")) {
        warning(subst(localize("Spindle speed exceeds maximum value for operation \"%1\"."), getOperationComment()));
      }
    } else {
      if (spindleSpeed > maximumSpindleSpeedLive) {
        warning(subst(localize("Spindle speed exceeds maximum value for operation \"%1\"."), getOperationComment()));
      }
    }
    forceRPMMode = (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED);
    startSpindle(true, getFramePosition(currentSection.getInitialPosition()));
  }
  forceXYZ();

  // need to call invertAxes after setWorkPlane to handle G68
  if (getSpindle(PART) == SPINDLE_SUB) {
    invertAxes(true, false); // polar mode has not been enabled yet
  }

  if (abc !== undefined) {
    if (!currentSection.isMultiAxis()) {
      cOutput.format(abc.z); // make C current - we do not want to output here
    }
  }
  gMotionModal.reset();

  if (insertToolCall || retracted) {
    forceModals(gPlaneModal, gFeedModeModal);
  }
  // Check operation type with connected spindles
  if (machineState.spindlesAreAttached) {
    if (machineState.axialCenterDrilling || (getSpindle(PART) == SPINDLE_SUB) ||
        (getParameter("operation-strategy") == "turningFace") ||
        ((getSpindle(TOOL) == SPINDLE_LIVE) && (getMachiningDirection(currentSection) == MACHINING_DIRECTION_AXIAL))) {
      error(localize("Illegal cutting operation programmed when spindles are synchronized."));
      return;
    }
  }
  // assumes a Head configuration uses TCP on a Fanuc controller
  var offsetCode = 43;
  tcpIsActive = false;
  if (currentSection.isMultiAxis() && useTCPC) {
    tcpIsActive = true;
    if (machineConfiguration.isMultiAxisConfiguration() /* && (currentSection.getOptimizedTCPMode() == 0)*/) {
      offsetCode = 43.4;
    } else if (!machineConfiguration.isMultiAxisConfiguration()) {
      offsetCode = 43.5;
    }
  }
  if (getProperty("useFixedOffset")) {
    var offset = "H#3020";
  } else {
    var offset = "H" + (tool.isTurningTool() ? tool.compensationOffset : tool.lengthOffset);
  }

  // enable Polar coordinates mode
  if (machineState.usePolarCoordinates && (tool.type != TOOL_PROBE)) {
    if (polarCoordinatesDirection == undefined) {
      error(localize("Polar coordinates axis direction to maintain must be defined as a vector - x,y,z."));
      return;
    }
    setPolarCoordinates(true);
  }

  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  if (currentSection.isMultiAxis() && useTCPC) {
    // turn
    var abc;
    forceABC();
    if (currentSection.isOptimizedForMachine()) {
      abc = currentSection.getInitialToolAxisABC();
      writeBlock(
        gMotionModal.format(0), gAbsIncModal.format(90),
        aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z)
      );
    }
    writeBlock(gMotionModal.format(0), gFormat.format(offsetCode), offset, xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z), bOutput.format(abc.y));
  } else {
    if (insertToolCall || retracted || newWorkPlane || newWorkOffset || newSpindle) {
      forceModals(gPlaneModal, gMotionModal);
      if (machineState.usePolarCoordinates) {
        var polarPosition = getPolarPosition(initialPosition.x, initialPosition.y, initialPosition.z);
        writeBlock(gPlaneModal.format(getG17Code()));
        cOutput.reset();
        writeBlock(cOutput.format(polarPosition.second.z));
        writeBlock(
          gMotionModal.format(0),
          gFormat.format(offsetCode),
          xOutput.format(polarPosition.first.x),
          conditional(gotYAxis, yOutput.format(0)),
          zOutput.format(polarPosition.first.z),
          offset);
      } else {
        if (machineState.usePolarInterpolation) {
          setPolarCoordinates(true);
          var position = getFramePosition(currentSection.getInitialPosition());
          var polarPosition = getPolarPosition(position.x, position.y, position.z);
          setPolarCoordinates(false);
          writeBlock(gMotionModal.format(0),
            gFormat.format(offsetCode),
            xOutput.format(polarPosition.first.x),
            conditional(gotYAxis, yOutput.format(polarPosition.first.y)),
            zOutput.format(polarPosition.first.z),
            offset);
        } else if (machineState.isTurningOperation || machineState.axialCenterDrilling) { //Turning
          writeBlock(gPlaneModal.format(18));
          writeBlock(gMotionModal.format(0), gFormat.format(offsetCode), "P1", zOutput.format(initialPosition.z), offset);
          writeBlock(xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
        } else {
          writeBlock(gPlaneModal.format(getG17Code()));
          if (!machineState.spindlesAreAttached) {
            writeBlock(gMotionModal.format(0), gFormat.format(offsetCode), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z), offset);
          } else {
            writeBlock(gMotionModal.format(0), (currentSection.spindle == SPINDLE_PRIMARY ? "C" : "U") + abcFormat.format(abc.z));
            writeBlock(
              gMotionModal.format(0), gFormat.format(offsetCode), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
              conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
              conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
              offset
            );
            onCommand(COMMAND_LOCK_MULTI_AXIS);
          }
        }
      }
    } else if ((machineState.usePolarCoordinates || machineState.usePolarInterpolation) && yAxisWasEnabled) {
      writeBlock(currentSection.spindle == SPINDLE_PRIMARY ? mFormat.format(getCode("UNCLAMP_PRIMARY_SPINDLE")) : mFormat.format(getCode("UNCLAMP_SECONDARY_SPINDLE"))); // C-axis
      if (gotYAxis && yOutput.isEnabled()) {
        writeBlock(gMotionModal.format(0), yOutput.format(0));
      }
    } else {
      if (machineState.usePolarInterpolation) {
        setPolarCoordinates(true);
        var position = getFramePosition(currentSection.getInitialPosition());
        var polarPosition = getPolarPosition(position.x, position.y, position.z);
        setPolarCoordinates(false);
        writeBlock(gMotionModal.format(0),
          xOutput.format(polarPosition.first.x),
          conditional(gotYAxis, yOutput.format(polarPosition.first.y)),
          zOutput.format(polarPosition.first.z));
      }
    }
  }

  // enable SFM spindle speed
  if (forceRPMMode) {
    startSpindle(false);
  }

  // set coolant after we have positioned at Z
  setCoolant(tool.coolant, machineState.currentTurret);

  if (showDebug) { // DEBUG
    for (var key in machineState) {
      writeComment(key + " = " + machineState[key]);
    }
    // writeln((getMachineConfigurationAsText(machineConfiguration)));
  }

  //manual NC useSmoothing;
  if ((currentSection.getType() == TYPE_MILLING) && !isDrillingCycle(true)) {
    if (useSmoothing) {
      setSmoothing(true);
    } else {
      setSmoothing(false);
    }

    if (getProperty("useG61")) {
      setGeometryComp(true);
    } else {
      setGeometryComp(false);
    }
  }

  if (machineState.usePolarInterpolation) {
    setPolarInterpolation(true); // enable polar interpolation mode
  }

  previousSpindle = tempSpindle;
  previousPartSpindle = tempPartSpindle;
  previousBAxisOrientationTurning = new Vector(machineState.currentBAxisOrientationTurning);
  activeSpindle = tempSpindle;
  retracted = false;
}

var MACHINING_DIRECTION_AXIAL = 0;
var MACHINING_DIRECTION_RADIAL = 1;
var MACHINING_DIRECTION_INDEXING = 2;

function getMachiningDirection(section) {
  var forward = section.isMultiAxis() ? section.getGlobalInitialToolAxis() : section.workPlane.forward;
  if (isSameDirection(forward, new Vector(0, 0, 1))) {
    machineState.machiningDirection = MACHINING_DIRECTION_AXIAL;
    return MACHINING_DIRECTION_AXIAL;
  } else if (Vector.dot(forward, new Vector(0, 0, 1)) < 1e-7) {
    machineState.machiningDirection = MACHINING_DIRECTION_RADIAL;
    return MACHINING_DIRECTION_RADIAL;
  } else {
    machineState.machiningDirection = MACHINING_DIRECTION_INDEXING;
    return MACHINING_DIRECTION_INDEXING;
  }
}

function updateMachiningMode(section) {
  machineState.axialCenterDrilling = false; // reset
  machineState.usePolarInterpolation = false; // reset
  machineState.usePolarCoordinates = false; // reset
  machineState.currentBAxisOrientationTurning = new Vector(0, 0, 0);
  machineState.isTurningOperation = (section.getType() == TYPE_TURNING);

  if ((section.getType() == TYPE_MILLING) && !section.isMultiAxis()) {
    if (getMachiningDirection(section) == MACHINING_DIRECTION_AXIAL) {
      if (isDrillingCycle(section, false)) {
        // drilling axial
        machineState.axialCenterDrilling = isAxialCenterDrilling(section, true);
        if (!machineState.axialCenterDrilling && !isAxialCenterDrilling(section, false)) { // several holes not on XY center
          // bestABC = section.getABCByPreference(machineConfiguration, section.workPlane, getCurrentDirection(), C, PREFER_CLOSEST, ENABLE_RESET | ENABLE_LIMITS);
          bestABC = getBestABC(section);
          bestABC = section.doesToolpathFitWithinLimits(machineConfiguration, bestABC) ? bestABC : undefined;
          if (!getProperty("useYAxisForDrilling") || bestABC == undefined) {
            machineState.usePolarCoordinates = true;
          }
        } else if (machineState.axialCenterDrilling) {
          if (gotBAxis) {
            machineState.currentBAxisOrientationTurning = getBAxisOrientationTurning(section);
          }
        }
      } else { // milling
        if (gotPolarInterpolation && forcePolarInterpolation) { // polar mode is requested by user
          machineState.usePolarInterpolation = true;
          bestABC = undefined;
        } else if (forcePolarCoordinates) { // XZC mode is requested by user
          machineState.usePolarCoordinates = true;
          bestABC = undefined;
        } else {
          //bestABC = section.getABCByPreference(machineConfiguration, section.workPlane, getCurrentDirection(), C, PREFER_CLOSEST, ENABLE_RESET | ENABLE_LIMITS);
          bestABC = getBestABC(section);
          bestABC = section.doesToolpathFitWithinLimits(machineConfiguration, bestABC) ? bestABC : undefined;
          if (bestABC == undefined) { // toolpath does not match XY ranges, enable interpolation mode
            if (gotPolarInterpolation) {
              machineState.usePolarInterpolation = true;
            } else {
              machineState.usePolarCoordinates = true;
            }
          }
        }
      }
    } else if (getMachiningDirection(section) == MACHINING_DIRECTION_RADIAL) { // G19 plane
      var range = section.getOptimizedBoundingBox(machineConfiguration, machineConfiguration.getABC(section.workPlane));
      var yAxisWithinLimits = machineConfiguration.getAxisY().getRange().isWithin(yFormat.getResultingValue(range.lower.y)) &&
        machineConfiguration.getAxisY().getRange().isWithin(yFormat.getResultingValue(range.upper.y));
      if (!gotYAxis) {
        if (!section.isMultiAxis() && !yAxisWithinLimits) {
          error(subst(localize("Y-axis motion is not possible without a Y-axis for operation \"%1\"."), getOperationComment()));
          return;
        }
      } else {
        if (!yAxisWithinLimits) {
          error(subst(localize("Toolpath exceeds the maximum ranges for operation \"%1\"."), getOperationComment()));
          return;
        }
      }
      // C-coordinates come from setWorkPlane or is within a multi axis operation, we cannot use the C-axis for non wrapped toolpathes (only multiaxis works, all others have to be into XY range)
    } else {
      // usePolarCoordinates & usePolarInterpolation is only supported for axial machining, keep false
    }
  } else { // turning or multi axis, keep false
    if (machineState.isTurningOperation && gotBAxis) {
      machineState.currentBAxisOrientationTurning = getBAxisOrientationTurning(section);
    }
  }

  if (machineState.axialCenterDrilling) {
    cOutput.disable();
  } else {
    cOutput.enable();
  }

  var checksum = 0;
  checksum += machineState.usePolarInterpolation ? 1 : 0;
  checksum += machineState.usePolarCoordinates ? 1 : 0;
  checksum += machineState.axialCenterDrilling ? 1 : 0;
  validate(checksum <= 1, localize("Internal post processor error."));
}

function getOperationComment() {
  var operationComment = hasParameter("operation-comment") && getParameter("operation-comment");
  return operationComment;
}

var radiusMode = undefined;
function setRadiusDiameterMode(force) {
  var mode = !(machineState.isTurningOperation || machineState.axialCenterDrilling);
  if (mode != radiusMode || force) {
    if (!mode) { // diameter mode
      writeBlock(gFormat.format(10.9), "X1"); // diameter input mode
      radiusMode = false;
    } else { // radius mode
      writeBlock(gFormat.format(10.9), "X0"); // radius input mode
      radiusMode = true;
    }
  }
  if (!radiusMode) {
    xFormat.setScale(2); // diameter mode
  } else {
    xFormat.setScale(1);
  }
  xOutput.setFormat(xFormat);
}

function setPolarInterpolation(activate) {
  if (activate) {
    cOutput.reset();
    gPlaneModal.reset();
    writeBlock(gMotionModal.format(0), cOutput.format(0));
    writeBlock(gPlaneModal.format(getG17Code()), "XC");
    writeBlock(getCode("POLAR_INTERPOLATION_ON", getSpindle(PART))); // command for polar interpolation

    if (getSpindle(PART) == SPINDLE_SUB) {
      invertAxes(true, true);
    } else {
      yOutput.setPrefix("C");
      yOutput.enable(); // required for G12.1
      cOutput.disable();
      xFormat.setScale(1); // radius mode
    }
    xOutput.setPrefix("X");
  } else {
    writeBlock(getCode("POLAR_INTERPOLATION_OFF"));
    yOutput.setPrefix("Y");
    if (!gotYAxis) {
      yOutput.disable();
    }
  }
}

function onDwell(seconds) {
  if (seconds > 99999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  milliseconds = clamp(1, seconds * 1000, 99999999);
  writeBlock(gFeedModeModal.format(94), gFormat.format(4), "P" + milliFormat.format(milliseconds));
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function getCompensationPlane(abc, returnCode, outputPlane) {
  var plane;
  if (machineState.isTurningOperation) {
    plane = PLANE_ZX;
  } else if (machineState.usePolarInterpolation) {
    plane = PLANE_XY;
  } else {
    var found = false;
    if (useTCPC) {
      plane = PLANE_XY;
      found = true;
    }
    if (!found) {
      if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
        plane = PLANE_XY;
      } else if (Vector.dot(currentSection.workPlane.forward, new Vector(0, 0, 1)) < 1e-7) {
        plane = PLANE_YZ;
      } else {
        if (returnCode) {
          if (getMachiningDirection(currentSection) == MACHINING_DIRECTION_AXIAL) {
            plane = PLANE_XY;
          } else {
            plane = PLANE_ZX;
          }
        } else {
          plane = -1;
          if (outputPlane) {
            error(localize("Tool orientation is not supported for radius compensation."));
            return -1;
          }
        }
      }
    }
  }
  var code = plane == -1 ? -1 : (plane == PLANE_XY ? getG17Code() : (plane == PLANE_ZX ? 18 : 19));
  if (outputPlane) {
    writeBlock(gPlaneModal.format(code));
  }
  return returnCode ? code : plane;
}

var resetFeed = false;

function getHighfeedrate(radius) {
  if (currentSection.feedMode == FEED_PER_REVOLUTION) {
    if (toDeg(radius) <= 0) {
      radius = toPreciseUnit(0.1, MM);
    }
    var rpm = spindleSpeed; // rev/min
    if (currentSection.getTool().getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
      var O = 2 * Math.PI * radius; // in/rev
      rpm = tool.surfaceSpeed / O; // in/min div in/rev => rev/min
    }
    return highFeedrate / rpm; // in/min div rev/min => in/rev
  }
  return highFeedrate;
}

function onRapid(_x, _y, _z) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      error(localize("Radius compensation mode cannot be changed at rapid traversal."));
      return;
    }
    if (!getProperty("useG0Polar") && machineState.usePolarInterpolation) {
      var highFeed = toPreciseUnit(1500, MM);
      writeBlock(gMotionModal.format(1), x, y, z, getFeed(highFeed));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z);
      forceFeed();
      resetFeed = false;
    }
  }
}

function onLinear(_x, _y, _z, feed) {
  if (isSpeedFeedSynchronizationActive()) {
    resetFeed = true;
    var threadPitch = getParameter("operation:threadPitch");
    var threadsPerInch = 1.0 / threadPitch; // per mm for metric
    writeBlock(gMotionModal.format(32), xOutput.format(_x), yOutput.format(_y), zOutput.format(_z), pitchOutput.format(1 / threadsPerInch));
    return;
  }
  if (resetFeed) {
    resetFeed = false;
    forceFeed();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(feed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      if (machineState.isTurningOperation) {
        writeBlock(gPlaneModal.format(18));
      } else {
        writeBlock(gPlaneModal.format(getG17Code()));
      }

      var plane = getCompensationPlane(getCurrentDirection(), false, true);
      var mirror = (isMirrored(plane) && (machineState.isTurningOperation || machineState.usePolarInterpolation)) ||
        (machineState.usePolarInterpolation && currentSection.spindle == SPINDLE_SECONDARY);
      var ccLeft = mirror ? 42 : 41;
      var ccRight = mirror ? 41 : 42;
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(
          gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1),
          gFormat.format(ccLeft),
          x, y, z, f
        );
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(
          gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1),
          gFormat.format(ccRight),
          x, y, z, f
        );
        break;
      default:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(40), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), x, y, z, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), f);
    }
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (!currentSection.isOptimizedForMachine()) {
    error(localize("Multi-axis motion is not supported for Polar coordinate mode."));
    return;
  }
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode cannot be changed at rapid traversal."));
    return;
  }

  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);

  if (currentSection.isOptimizedForMachine()) {
    var a = aOutput.format(_a);
    var b = bOutput.format(_b);
    var c = cOutput.format(_c);
    writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
  } else {
    var i = spatialFormat.format(_a);
    var j = spatialFormat.format(_b);
    var k = spatialFormat.format(_c);
    writeBlock(gMotionModal.format(0), x, y, z, "I" + i, "J" + j, "K" + k);
  }
  forceFeed();
}

/**
  Determine if only the C-axis moves allowing for a wobble tolerance in XYZ.
  This function is used to remove the optimization in the post engine that
  removes unnecessary rotary axes moves.

  It is required when TCP is enabled since the TCP positions are still rotated for the C-axis
  but the control will move a C-axis-only block in a linear straight line instead of a radial move.
*/
function cAxisNeedsToBeLinearized(_x, _y, _z, _a, _b, _c) {
  var wobbleAllowance = unit == MM ? 0.005 : 0.0002; // rotary axis optimization tolerance from post kernel
  var xMoves = Math.abs(xFormat.getResultingValue(_x) - xFormat.getResultingValue(getCurrentPosition().x)) > wobbleAllowance;
  var yMoves = Math.abs(yFormat.getResultingValue(_y) - xFormat.getResultingValue(getCurrentPosition().y)) > wobbleAllowance;
  var zMoves = Math.abs(yFormat.getResultingValue(_z) - xFormat.getResultingValue(getCurrentPosition().z)) > wobbleAllowance;
  var aMoves = abcFormat.areDifferent(_a, getCurrentDirection().x);
  var bMoves = abcFormat.areDifferent(_b, getCurrentDirection().y);
  var cMoves = abcFormat.areDifferent(_c, getCurrentDirection().z);

  return !(xMoves || yMoves || zMoves || aMoves || bMoves) && cMoves;
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  if (abcFormat.areDifferent(getCurrentDirection().y, _b) && !useTCPC) {
    error(localize("5-axis simultaneous toolpath not supported without TCPC."));
  }

  if (currentSection.isOptimizedForMachine() && getProperty("tableAdjust") && tcpIsActive) {
    if (cAxisNeedsToBeLinearized(_x, _y, _z, _a, _b, _c)) {
      var tol = getParameter("operation:tolerance", toPreciseUnit(0.001, IN));
      var axis = machineConfiguration.getAxisByCoordinate(2);
      var radius = Vector.diff(new Vector(_x, _y, 0), new Vector(0, 0, 0)).length;
      var delta = _c - getCurrentDirection().z;
      if (delta > Math.PI) {
        delta -= Math.PI * 2;
      } else if (delta < -Math.PI) {
        delta += Math.PI * 2;
      }
      var cosAngle = radius < tol ? 0 : ((radius - tol) / radius);
      var maxAngle = Math.acos(cosAngle) * 2;
      var ratio = maxAngle / Math.abs(delta);
      var ntimes = Math.ceil(1 / ratio);
      if (ntimes > 1) {
        // writeComment("INSERTED " + (ntimes - 1) + " BLOCKS");
        delta /= ntimes;
        var xyz = getCurrentPosition();
        var c = getCurrentDirection().z;
        var ratio = 1 / ntimes;
        for (var i = 1; i < ntimes; ++i) {
          c += delta;
          c = axis.remapToRange(c);
          xyz = Vector.lerp(xyz, new Vector(_x, _y, _z), ratio);
          writeLinear5D(xyz.x, xyz.y, xyz.z, _a, _b, c, feed);
        }
      }
    }
  }
  writeLinear5D(_x, _y, _z, _a, _b, _c, feed);
}

function writeLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  if (!currentSection.isOptimizedForMachine()) {
    error(localize("Multi-axis motion is not supported for Polar coordinate mode."));
    return;
  }
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
    return;
  }

  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);

  if (currentSection.isOptimizedForMachine()) {
    var a = aOutput.format(_a);
    var b = bOutput.format(_b);
    var c = cOutput.format(_c);

    if (x || y || z || a || b || c) {
      writeBlock(gMotionModal.format(1), x, y, z, a, b, c, getFeed(feed));
    } else if (f) {
      if (getNextRecord().isMotion()) { // try not to output feed without motion
        forceFeed(); // force feed on next line
      } else {
        writeBlock(gMotionModal.format(1), getFeed(feed));
      }
    }
  } else {
    var i = spatialFormat.format(_a);
    var j = spatialFormat.format(_b);
    var k = spatialFormat.format(_c);
    var f = getFeed(feed);
    if (x || y || z || i || j || k) {
      writeBlock(gMotionModal.format(1), x, y, z, "I" + i, "J" + j, "K" + k, getFeed(feed));
    } else if (getFeed(feed)) {
      if (getNextRecord().isMotion()) { // try not to output feed without motion
        forceFeed(); // force feed on next line
      } else {
        writeBlock(gMotionModal.format(1), getFeed(feed));
      }
    }
  }
}

// Start of Polar coordinates
var polarCoordinatesDirection = new Vector(1, 0, 0); // vector to maintain tool at while in polar interpolation
var polarSpindleAxisSave;
function setPolarCoordinates(mode) {
  if (!mode) { // turn off polar mode if required
    if (isPolarModeActive()) {
      deactivatePolarMode();
      if (gotBAxis) {
        machineConfiguration.setSpindleAxis(polarSpindleAxisSave);
        bOutput.enable();
      }
      // setPolarFeedMode(false);
    }
    return;
  }

  var direction = polarCoordinatesDirection;

  // determine the rotary axis to use for Polar coordinates
  var axis = undefined;
  if (machineConfiguration.getAxisV().isEnabled()) {
    if (Vector.dot(machineConfiguration.getAxisV().getAxis(), currentSection.workPlane.getForward()) != 0) {
      axis = machineConfiguration.getAxisV();
    }
  }
  if (axis == undefined && machineConfiguration.getAxisU().isEnabled()) {
    if (Vector.dot(machineConfiguration.getAxisU().getAxis(), currentSection.workPlane.getForward()) != 0) {
      axis = machineConfiguration.getAxisU();
    }
  }
  if (axis == undefined) {
    error(localize("Polar coordinates require an active rotary axis be defined in direction of workplane normal."));
  }

  // calculate directional vector from initial position
  if (direction == undefined) {
    error(localize("Polar coordinates initiated without a directional vector."));
    return;
  }

  // activate polar coordinates
  // setPolarFeedMode(true); // enable multi-axis feeds for polar mode

  if (gotBAxis) {
    polarSpindleAxisSave = machineConfiguration.getSpindleAxis();
    machineConfiguration.setSpindleAxis(new Vector(0, 0, 1));
    bOutput.disable();
  }
  activatePolarMode(getTolerance() / 2, 0, direction);
  var polarPosition = getPolarPosition(currentSection.getInitialPosition().x, currentSection.getInitialPosition().y, currentSection.getInitialPosition().z);
  setCurrentPositionAndDirection(polarPosition);
  //forceWorkPlane();
}
// End of polar coordinates

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  var directionCode;
  if (isMirrored(getCircularPlane())) {
    directionCode = clockwise ? 3 : 2;
  } else {
    directionCode = clockwise ? 2 : 3;
  }

  if (isSpeedFeedSynchronizationActive()) {
    error(localize("Speed-feed synchronization is not supported for circular moves."));
    return;
  }

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();
  forceXYZ();

  if (isFullCircle()) {
    if (getProperty("useRadius") || isHelical()) { // radius mode does not support full arcs
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gPlaneModal.format(getG17Code()), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), (currentSection.spindle == SPINDLE_PRIMARY ? jOutput.format(cy - start.y) : jOutput.format((cy - start.y) * -1)), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), (currentSection.spindle == SPINDLE_PRIMARY ? iOutput.format(cx - start.x, 0) : iOutput.format((cx - start.x) * -1)), kOutput.format(cz - start.z), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y), (currentSection.spindle == SPINDLE_PRIMARY ? kOutput.format(cz - start.z) : kOutput.format((cz - start.z) * -1)), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else if (!getProperty("useRadius")) {
    if (isHelical() && ((getCircularSweep() < toRad(30)) || (getHelicalPitch() > 10))) { // avoid G112 issue
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (!xFormat.isSignificant(start.x) && machineState.usePolarInterpolation) {
        writeBlock(gMotionModal.format(1), xOutput.format((unit == IN) ? 0.0001 : 0.001), getFeed(feed)); // move X to non zero to avoid G112 issues
      }

      writeBlock(gPlaneModal.format(getG17Code()), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), (currentSection.spindle == SPINDLE_PRIMARY ? jOutput.format(cy - start.y) : jOutput.format((cy - start.y) * -1)), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), (currentSection.spindle == SPINDLE_PRIMARY ? iOutput.format(cx - start.x) : iOutput.format((cx - start.x) * -1)), kOutput.format(cz - start.z), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y), (currentSection.spindle == SPINDLE_PRIMARY ? kOutput.format(cz - start.z) : kOutput.format((cz - start.z) * -1)), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else { // use radius mode
    if (isHelical() && ((getCircularSweep() < toRad(30)) || (getHelicalPitch() > 10))) {
      linearize(tolerance);
      return;
    }
    var r = getCircularRadius();
    if (toDeg(getCircularSweep()) > (180 + 1e-9)) {
      r = -r; // allow up to <360 deg arcs
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if ((spatialFormat.format(start.x) == 0) && machineState.usePolarInterpolation) {
        writeBlock(gMotionModal.format(1), xOutput.format((unit == IN) ? 0.0001 : 0.001), getFeed(feed)); // move X to non zero to avoid G112 issues
      }
      writeBlock(gPlaneModal.format(getG17Code()), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  }
}

var chuckMachineFrame;
var chuckSubPosition;
function getSecondaryPullMethod(type) {
  var pullMethod = {};

  // determine if pull operation, spindle return, or both
  pullMethod.pull = false;
  pullMethod.home = false;

  switch (type) {
  case "secondary-spindle-pull":
    if (true) { // Secondary pull operations are not officially released
      error(localize("Bar pull operations are not supported.  Please use the Subspindle Return operation with an Offset value to do a bar pull operation."));
    }
    pullMethod.pullPosition = chuckSubPosition + cycle.pullingDistance;
    pullMethod.machineFrame = chuckMachineFrame;
    pullMethod.unclampMode = "keep-clamped";
    pullMethod.pull = true;
    break;
  case "secondary-spindle-return":
    pullMethod.pullPosition = cycle.feedPosition;
    pullMethod.machineFrame = cycle.useMachineFrame;
    pullMethod.unclampMode = cycle.unclampMode;

    // pull part only (when offset!=0), Return secondary spindle to home (when offset=0)
    var feedDis = 0;
    if (pullMethod.machineFrame) {
      if (hasParameter("operation:feedPlaneHeight_direct")) { // Inventor
        feedDis = getParameter("operation:feedPlaneHeight_direct");
      } else if (hasParameter("operation:feedPlaneHeightDirect")) { // HSMWorks
        feedDis = getParameter("operation:feedPlaneHeightDirect");
      }
      feedPosition = feedDis;
    } else if (hasParameter("operation:feedPlaneHeight_offset")) { // Inventor
      feedDis = getParameter("operation:feedPlaneHeight_offset");
    } else if (hasParameter("operation:feedPlaneHeightOffset")) { // HSMWorks
      feedDis = getParameter("operation:feedPlaneHeightOffset");
    }

    // Transfer part to secondary spindle
    if (pullMethod.unclampMode != "keep-clamped") {
      pullMethod.pull = feedDis != 0;
      pullMethod.home = true;
    } else {
      // pull part only (when offset!=0), Return secondary spindle to home (when offset=0)
      pullMethod.pull = feedDis != 0;
      pullMethod.home = !pullMethod.pull;
    }
    break;
  }
  return pullMethod;
}

function onCycle() {
  if ((typeof isSubSpindleCycle == "function") && isSubSpindleCycle(cycleType)) {
    if (!gotSecondarySpindle) {
      error(localize("Secondary spindle is not available."));
    }

    writeBlock(gRotationModal.format(69));
    if (cycleType != "secondary-spindle-return") {
      onCommand(COMMAND_STOP_SPINDLE);
    }
    onCommand(COMMAND_COOLANT_OFF);
    if (!retracted && cycleType != "secondary-spindle-return") {
      writeRetract(X, Y);
      if (machineState.spindlesAreAttached) {
        writeBlock(gFormat.format(0), gFormat.format(53), bOutput.format(0), ("Z#" + ((currentSection.spindle == SPINDLE_SECONDARY) ? zSubHomeParameter : zHomeParameter)));
      } else {
        writeBlock(gFormat.format(0), gFormat.format(53), ("Z#" + ((currentSection.spindle == SPINDLE_SECONDARY) ? zSubHomeParameter : zHomeParameter)));
      }
      retracted = true;
      if (getProperty("optionalStop")) {
        onCommand(COMMAND_OPTIONAL_STOP);
        gMotionModal.reset();
      }
    }

    writeln("");
    if (hasParameter("operation-comment")) {
      var comment = getParameter("operation-comment");
      if (comment) {
        writeComment(comment);
      }
    }

    // Start of stock transfer operation(s)

    if (cycleType != "secondary-spindle-return") {
      writeBlock("T" + getProperty("transferTool"), mFormat.format(6));
      writeRetract(Z);
      gMotionModal.reset();
      gAbsIncModal.reset();
      var hasCutoff = false;
      if (!isLastSection()) {//Required if used on the last process
        var numberOfSections = getNumberOfSections();
        for (var i = getNextSection().getId(); i < numberOfSections; ++i) {
          var section = getSection(i);
          //Cutoff process;
          if ((section.hasParameter("operation-strategy") && section.getParameter("operation-strategy") == "turningPart")) {
            hasCutoff = true;
          }
        }
      }
      if (hasCutoff) {
        writeBlock(gMotionModal.format(0), gAbsIncModal.format(90), zOutput.format(0), bOutput.format(toRad(90)), formatComment("CLEAR"));
        retracted = true;
      }
      var feedMode = getCode("FEED_MODE_UNIT_MIN", getSpindle(TOOL));
      writeBlock(feedMode, gPlaneModal.format(18));
    }

    switch (cycleType) {
    case "secondary-spindle-grab":
      // Activate part catcher for part cutoff section
      if (currentSection.partCatcher) {
        engagePartCatcher(true);
      }

      if (cycle.stopSpindle) { // no spindle rotation
        lastSpindleSpeed = 0;
      } else { // spindle rotation
        //writeBlock(mFormat.format(getCode("INTERLOCK_BYPASS", getSecondarySpindle())), formatComment("INTERLOCK BYPASS"));
        clampChuck(getSecondarySpindle(), UNCLAMP);
        onDwell(cycle.dwell);
        gSpindleModeModal.reset();
        var transferCodes = getSpindleTransferCodes(transferType);
        var transferType = TRANSFER_PHASE;
        // Write out maximum spindle speed
        if (transferCodes.spindleMode == SPINDLE_CONSTANT_SURFACE_SPEED) {
          var maximumSpindleSpeed = (transferCodes.maximumSpindleSpeed > 0) ? Math.min(transferCodes.maximumSpindleSpeed, getProperty("maximumSpindleSpeed")) : getProperty("maximumSpindleSpeed");
          writeBlock(gFormat.format(50), sOutput.format(maximumSpindleSpeed));
          sOutput.reset();
        }

        if (currentSection.partCatcher) {
          engagePartCatcher(false);
        }

        // write out spindle speed
        var _spindleSpeed;
        var spindleMode;
        if (transferCodes.spindleMode == SPINDLE_CONSTANT_SURFACE_SPEED) {
          _spindleSpeed = transferCodes.surfaceSpeed * ((unit == MM) ? 1 / 1000.0 : 1 / 12.0);
          spindleMode = getCode("CONSTANT_SURFACE_SPEED_ON", getSpindle(PART));
        } else {
          _spindleSpeed = cycle.spindleSpeed;
          spindleMode = getCode("CONSTANT_SURFACE_SPEED_OFF", getSpindle(PART));
        }
        var comment;
        if (transferType == TRANSFER_PHASE) {
          comment = "PHASE SYNCHRONIZATION";
        } else {
          comment = "SPEED SYNCHRONIZATION";
        }

        writeBlock(mFormat.format(getCode("STOP_MAIN_SPINDLE")), formatComment("MAIN SPINDLE STOP"));
        writeBlock(mFormat.format(getCode("STOP_SUB_SPINDLE")), formatComment("SUB SPINDLE STOP"));
        writeBlock(mFormat.format(901));
        writeBlock(mFormat.format(getCode("DISABLE_C_AXIS", getSpindle(PART))));
        gSpindleModeModal.reset();
        writeBlock(getCode("CONSTANT_SURFACE_SPEED_OFF"), sOutput.format(_spindleSpeed), mFormat.format(getCode("START_MAIN_SPINDLE_CW")));

        lastSpindleMode = transferCodes.spindleMode;
        lastSpindleSpeed = _spindleSpeed;
        lastSpindleDirection = transferCodes.spindleDirection;
      }

      // clean out chips
      if (airCleanChuck) {
        writeBlock(mFormat.format(getCode("AIR_BLAST_ON", SPINDLE_MAIN)), formatComment("CLEAN OUT CHIPS"));
        writeBlock(mFormat.format(getCode("AIR_BLAST_ON", SPINDLE_SUB)));
        onDwell(5.5);
        writeBlock(mFormat.format(getCode("AIR_BLAST_OFF", SPINDLE_MAIN)));
        writeBlock(mFormat.format(getCode("AIR_BLAST_OFF", SPINDLE_SUB)));
      }

      //writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_OFF", getSpindle(PART))));

      // need to orientate spindle after cleaning out chips, since spindles rotate during coolant air
      transferOrientation = 0;
      if (cycle.stopSpindle) {
        transferOrientation = (cycle.spindleOrientation != undefined) ? cycle.spindleOrientation : transferOrientation;
        writeBlock(mFormat.format(901));
        writeBlock(mFormat.format(getCode("ENABLE_C_AXIS", getSpindle(PART))), formatComment("C1 AXIS ON"));
        //writeBlock(getCode("UNLOCK_MULTI_AXIS", getSpindle(PART)));
        writeBlock(gMotionModal.format(0), "C" + abcFormat.format(0), formatComment("MAIN ANGLE"));
        writeBlock(mFormat.format(902));
        writeBlock(mFormat.format(getCode("ENABLE_C_AXIS", getSecondarySpindle())), formatComment("C2 AXIS ON"));
        gMotionModal.reset();
        writeBlock(gMotionModal.format(0), "U" + abcFormat.format(transferOrientation), formatComment("SUB ANGLE"));
        writeBlock(mFormat.format(901));
        forceTurningMode = true;

        clampChuck(getSecondarySpindle(), UNCLAMP);
        onDwell(cycle.dwell);
        gSpindleModeModal.reset();
      }

      writeBlock(mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_PHASE")), formatComment("PHASE SYNCHRONIZATION"));
      writeBlock(mFormat.format(540), formatComment("Transfer Mode on"));

      gMotionModal.reset();
      moveSubSpindle(RAPID, cycle.feedPosition, 0, cycle.useMachineFrame, "MOVE HD2 TO APPROACH", true);

      if (transferUseTorque) {
        writeBlock("#3030=70", formatComment("THRUST FACTOR"));
        writeBlock(mFormat.format(getCode("TORQUE_SKIP_ON", getSpindle(PART))), formatComment("TORQUE SKIP ON"));
        moveSubSpindle(TORQUE, cycle.chuckPosition, cycle.feedrate, cycle.useMachineFrame, "", true);
        writeBlock(mFormat.format(getCode("TORQUE_SKIP_OFF", getSpindle(PART))), formatComment("TORQUE SKIP OFF"));
      } else {
        moveSubSpindle(FEED, cycle.chuckPosition, cycle.feedrate, cycle.useMachineFrame, "", true);
      }
      writeBlock(mFormat.format(541), formatComment("Transfer Mode Cancel"));
      clampChuck(getSecondarySpindle(), CLAMP);
      //writeBlock(mFormat.format(getCode("INTERLOCK_BYPASS", getSpindle(PART))), formatComment("INTERLOCK BYPASS"));

      onDwell(cycle.dwell);
      chuckMachineFrame = cycle.useMachineFrame;
      chuckSubPosition = cycle.chuckPosition;
      machineState.stockTransferIsActive = true;
      machineState.spindlesAreAttached = true;
      break;
    case "secondary-spindle-return":
    case "secondary-spindle-pull":
      var pullMethod = getSecondaryPullMethod(cycleType);
      if (!machineState.stockTransferIsActive) {
        if (pullMethod.pull) {
          error(localize("The part must be chucked prior to a pull operation."));
          return;
        }
      }
      //writeBlock(mFormat.format(getCode("INTERLOCK_BYPASS", getSecondarySpindle())));

      // bar pull
      if (pullMethod.pull) {
        clampChuck(getSpindle(PART), UNCLAMP);
        onDwell(cycle.dwell);
        machineState.spindlesAreAttached = false;
        gMotionModal.reset();
        moveSubSpindle(FEED, chuckSubPosition + pullMethod.pullPosition, cycle.feedrate, pullMethod.machineFrame, "BAR PULL", true);
      }

      // move subspindle to home
      if (pullMethod.home) {
        if (pullMethod.unclampMode == "unclamp-secondary") { // leave part in main spindle
          clampChuck(getSpindle(PART), CLAMP);
          onDwell(cycle.dwell);
          clampChuck(getSecondarySpindle(), UNCLAMP);
          onDwell(cycle.dwell);
        } else if (pullMethod.unclampMode == "unclamp-primary") {
          clampChuck(getSpindle(PART), UNCLAMP);
          onDwell(cycle.dwell);
        }
        machineState.spindlesAreAttached = false;
        gMotionModal.reset();
        moveSubSpindle(HOME, 0, 0, true, "SUB SPINDLE RETURN", true);
        writeBlock(mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_PHASE_OFF")), formatComment("SYNCHRONIZATION OFF"));
        if (!cycle.stopSpindle) {
          writeBlock(mFormat.format(getCode("STOP_SUB_SPINDLE")), formatComment("SUB SPINDLE STOP"));
        }
      } else {
        clampChuck(getSpindle(PART), CLAMP);
        onDwell(cycle.dwell);
        // writeBlock(mFormat.format(getCode("COOLANT_THROUGH_TOOL_OFF", getSecondarySpindle())));
        //mInterferModal.reset();
        //writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_OFF", getSpindle(PART))));
      }
      machineState.stockTransferIsActive = true;
      break;
    }
  }

  if (cycleType == "stock-transfer") {
    warning(localize("Stock transfer is not supported. Required machine specific customization."));
    return;
  } else if (!getProperty("useCycles") && tapping) {
    startSpindle(false, false);
  }
}

var saveShowSequenceNumbers;
var pathBlockNumber = {start:0, end:0};

function onCyclePath() {
  saveShowSequenceNumbers = showSequenceNumbers;

  // buffer all paths and stop feeds being output
  feedOutput.disable();
  showSequenceNumbers = "false";
  redirectToBuffer();
  gMotionModal.reset();
  xOutput.reset();
  zOutput.reset();
}

function onCyclePathEnd() {
  showSequenceNumbers = saveShowSequenceNumbers; // reset property to initial state
  feedOutput.enable();
  var cyclePath = String(getRedirectionBuffer()).split(EOL); // get cycle path from buffer
  closeRedirection();
  for (line in cyclePath) { // remove empty elements
    if (cyclePath[line] == "") {
      cyclePath.splice(line);
    }
  }

  var verticalPasses;
  if (cycle.profileRoughingCycle == 0) {
    verticalPasses = false;
  } else if (cycle.profileRoughingCycle == 1) {
    verticalPasses = true;
  } else {
    error(localize("Unsupported passes type."));
    return;
  }
  // output cycle data
  switch (cycleType) {
  case "turning-canned-rough":
    writeBlock(gFormat.format(verticalPasses ? 272 : 271),
      (verticalPasses ? "W" : "U") + spatialFormat.format(cycle.depthOfCut),
      "R" + spatialFormat.format(cycle.retractLength)
    );
    writeBlock(gFormat.format(verticalPasses ? 272 : 271),
      "P" + (getStartEndSequenceNumber(cyclePath, true)),
      "Q" + (getStartEndSequenceNumber(cyclePath, false)),
      "U" + xFormat.format(cycle.xStockToLeave),
      "W" + spatialFormat.format(cycle.zStockToLeave),
      getFeed(cycle.cutfeedrate)
    );
    break;
  default:
    error(localize("Unsupported turning canned cycle."));
  }

  for (var i = 0; i < cyclePath.length; ++i) {
    if (i == 0 || i == (cyclePath.length - 1)) { // write sequence number on first and last line of the cycle path
      showSequenceNumbers = "true";
      if ((i == 0 && pathBlockNumber.start != sequenceNumber) || (i == (cyclePath.length - 1) && pathBlockNumber.end != sequenceNumber)) {
        error(localize("Mismatch of start/end block number in turning canned cycle."));
        return;
      }
    }
    writeBlock(cyclePath[i]); // output cycle path
    showSequenceNumbers = saveShowSequenceNumbers; // reset property to initial state
  }
}

function getStartEndSequenceNumber(cyclePath, start) {
  if (start) {
    pathBlockNumber.start = sequenceNumber + conditional(saveShowSequenceNumbers == "true", getProperty("sequenceNumberIncrement"));
    return pathBlockNumber.start;
  } else {
    pathBlockNumber.end = sequenceNumber + getProperty("sequenceNumberIncrement") + conditional(saveShowSequenceNumbers == "true", (cyclePath.length - 1) * getProperty("sequenceNumberIncrement"));
    return pathBlockNumber.end;
  }
}

function getCommonCycle(x, y, z, r, includeRcode) {

  // R-value is incremental position from current position
  var raptoS = "";
  if ((r !== undefined) && includeRcode) {
    raptoS = "R" + spatialFormat.format(r);
  }

  if (machineState.usePolarCoordinates) {
    var polarPosition = getPolarPosition(x, y, z);
    setCurrentPositionAndDirection(polarPosition);
    return [xOutput.format(polarPosition.first.x), cOutput.format(polarPosition.second.z),
      zOutput.format(polarPosition.first.z),
      raptoS];
  } else {
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z),
      raptoS];
  }
}

var threadStart;
var threadEnd;
function moveToThreadStart(x, y, z) {
  var cuttingAngle = 0;
  if (hasParameter("operation:infeedAngle")) {
    cuttingAngle = getParameter("operation:infeedAngle");
  }
  if (cuttingAngle != 0) {
    var zz;
    if (isFirstCyclePoint()) {
      threadStart = getCurrentPosition();
      threadEnd = new Vector(x, y, z);
    } else {
      var zz = threadStart.z - (Math.abs(threadEnd.x - x) * Math.tan(toRad(cuttingAngle)));
      writeBlock(gMotionModal.format(0), zOutput.format(zz));
      xOutput.reset();
      zOutput.reset();
      g92ROutput.reset();
      feedOutput.reset();
      threadStart.setZ(zz);
      threadEnd = new Vector(x, y, z);
    }
  }
}

function onCyclePoint(x, y, z) {
  if (!getProperty("useCycles")) {
    expandCyclePoint(x, y, z);
    return;
  }
  writeBlock(gPlaneModal.format(getG17Code()));

  switch (cycleType) {
  case "thread-turning":
    if (getProperty("useSimpleThread") ||
      (hasParameter("operation:doMultipleThreads") && (getParameter("operation:doMultipleThreads") != 0)) ||
      (hasParameter("operation:infeedMode") && (getParameter("operation:infeedMode") != "constant"))) {
      var r = -cycle.incrementalX; // positive if taper goes down - delta radius
      moveToThreadStart(x, y, z);
      var threadsPerInch = 1.0 / cycle.pitch; // per mm for metric
      var f = 1 / threadsPerInch;
      writeBlock(
        gMotionModal.format(292),
        xOutput.format(x - cycle.incrementalX),
        yOutput.format(y),
        zOutput.format(z),
        conditional(zFormat.isSignificant(r), g92ROutput.format(r)),
        feedOutput.format(f)
      );
    } else {
      if (isLastCyclePoint()) {
        // thread height and depth of cut
        var threadHeight = getParameter("operation:threadDepth");
        var stepdowns = [];
        for (var i = 0; i < getNumberOfCyclePoints() - 1; i++) {
          stepdowns.push(Math.abs(getCyclePoint(i).x - getCyclePoint(i + 1).x));
        }
        var minimumDepthOfCut = Math.min.apply(null, stepdowns.filter(Boolean));
        var firstDepthOfCut = cycle.firstPassDepth ? cycle.firstPassDepth : threadHeight - Math.abs(getCyclePoint(0).x - x);

        // first G76 block
        var repeatPass = hasParameter("operation:nullPass") ? getParameter("operation:nullPass") : 0;
        var chamferWidth = 10; // Pullout-width is 1*thread-lead in 1/10's;
        var materialAllowance = 0; // Material allowance for finishing pass
        var cuttingAngle = getParameter("operation:infeedAngle", 30) * 2; // Angle is not stored with tool. toDeg(tool.getTaperAngle());
        var pcode = repeatPass * 10000 + chamferWidth * 100 + cuttingAngle;
        gCycleModal.reset();
        writeBlock(
          gCycleModal.format(276),
          threadP1Output.format(pcode),
          threadQOutput.format(minimumDepthOfCut),
          threadROutput.format(materialAllowance)
        );

        // second G76 block
        var r = -cycle.incrementalX; // positive if taper goes down - delta radius
        gCycleModal.reset();
        writeBlock(
          gCycleModal.format(276),
          xOutput.format(x),
          zOutput.format(z),
          conditional(zFormat.isSignificant(r), threadROutput.format(r)),
          threadP2Output.format(threadHeight),
          threadQOutput.format(firstDepthOfCut),
          pitchOutput.format(cycle.pitch)
        );
        forceFeed();
      }
    }
    return;
  }

  if (isFirstCyclePoint() || (getParameter("operation:cycleType") == "tapping-with-chip-breaking")) {
    repositionToCycleClearance(cycle, x, y, z);

    // return to initial Z which is clearance plane and set absolute mode

    machineState.feedPerRevolution = tapping ? true : machineState.feedPerRevolution;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell * 1000, 99999999); // in milliseconds

    switch (cycleType) {
    case "drilling":
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
        getCommonCycle(x, y, z, cycle.retract, true),
        getFeed(cycle.feedrate)
      );
      break;
    case "counter-boring":
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
        getCommonCycle(x, y, z, cycle.retract, true),
        conditional(P > 0, "P" + milliFormat.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    case "deep-drilling":
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
        getCommonCycle(x, y, z, cycle.retract, true),
        "Q" + spatialFormat.format(cycle.incrementalDepth),
        conditional(P > 0, "P" + milliFormat.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    case "chip-breaking":
      if (cycle.accumulatedDepth < cycle.depth) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
          getCommonCycle(x, y, z, cycle.retract, true),
          "Q" + spatialFormat.format(cycle.incrementalDepth),
          "D" + spatialFormat.format(cycle.chipBreakDistance),
          conditional(P > 0, "P" + milliFormat.format(P)),
          getFeed(cycle.feedrate)
        );
      }
      break;
    case "tapping":
      if (getProperty("useRigidTapping")) {
        writeBlock(
          gRetractModal.format(98),
          gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 84.3 : 84.2),
          getCommonCycle(x, y, z, cycle.retract, true),
          getFeed(cycle.feedrate)
        );
      } else {
        writeBlock(
          gRetractModal.format(98),
          gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 74 : 84),
          getCommonCycle(x, y, z, cycle.retract, true),
          getFeed(cycle.feedrate)
        );
      }
      forceFeed();
      break;
    case "right-tapping":
      if (getProperty("useRigidTapping")) {
        writeBlock(
          gRetractModal.format(98),
          gCycleModal.format(84.2),
          getCommonCycle(x, y, z, cycle.retract, true),
          getFeed(cycle.feedrate)
        );
      } else {
        writeBlock(
          gRetractModal.format(98),
          gCycleModal.format(84),
          getCommonCycle(x, y, z, cycle.retract, true),
          getFeed(cycle.feedrate)
        );
      }
      forceFeed();
      break;
    case "left-tapping":
      if (getProperty("useRigidTapping")) {
        writeBlock(
          gRetractModal.format(98),
          gCycleModal.format(84.3),
          getCommonCycle(x, y, z, cycle.retract, true),
          getFeed(cycle.feedrate)
        );
      } else {
        writeBlock(
          gRetractModal.format(98),
          gCycleModal.format(74),
          getCommonCycle(x, y, z, cycle.retract, true),
          getFeed(cycle.feedrate)
        );
      }
      forceFeed();
      break;
    case "tapping-with-chip-breaking":
      var u = cycle.stock;
      var step = cycle.incrementalDepth;
      var first = true;

      while (u > cycle.bottom) {
        if (step < cycle.minimumIncrementalDepth) {
          step = cycle.minimumIncrementalDepth;
        }
        u -= step;
        step -= cycle.incrementalDepthReduction;
        gCycleModal.reset(); // required
        u = Math.max(u, cycle.bottom);
        //Sub Spindle needs reversed here
        var depth = u * (getSpindle(PART) == SPINDLE_MAIN ? 1 : -1);

        if (first) {
          first = false;
          writeBlock(
            gRetractModal.format(99), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 84.3 : 84.2),
            getCommonCycle(x, y, depth, cycle.retract, true),
            getFeed(cycle.feedrate)
          );
        } else {
          xOutput.reset();
          var polarPosition = getPolarPosition(x, y, z);
          writeBlock(
            conditional(u <= cycle.bottom, gRetractModal.format(98)),
            gAbsIncModal.format(90),
            xOutput.format(machineState.usePolarCoordinates ? polarPosition.first.x : x),
            "Z" + zFormat.format(depth)
          );
        }
      }
      forceFeed();
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
        getCommonCycle(x, y, z, cycle.retract, true),
        conditional(P > 0, "P" + milliFormat.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      //var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell * 1000, 99999999); // in milliseconds
      var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell * 1000, 99999999); // in milliseconds
      var step = 0;
      if (cycleType == "chip-breaking" || cycleType == "deep-drilling") {
        step = cycle.incrementalDepth;
      }
      writeBlock(getCommonCycle(x, y, z, cycle.retract, false), conditional(step > 0, "Q" + spatialFormat.format(step)), conditional(P > 0, "P" + milliFormat.format(P)));
    }
  }
}

function onCycleEnd() {
  if (!cycleExpanded && !machineState.stockTransferIsActive) {
    switch (cycleType) {
    case "thread-turning":
      forceFeed();
      xOutput.reset();
      zOutput.reset();
      g92ROutput.reset();
      break;
    default:
      writeBlock(gCycleModal.format(80));
    }
  }
}

function onPassThrough(text) {
  writeBlock(text);
}

function onParameter(name, value) {
  var invalid = false;
  switch (name) {
  case "action":
    if (String(value).toUpperCase() == "USEPOLARMODE" ||
    String(value).toUpperCase() == "USEPOLARINTERPOLATION") {
      forcePolarInterpolation = true;
      forcePolarCoordinates = false;
    } else if (String(value).toUpperCase() == "USEXZCMODE" ||
    String(value).toUpperCase() == "USEPOLARCOORDINATES") {
      forcePolarCoordinates = true;
      forcePolarInterpolation = false;
    } else if (String(value).toUpperCase() == "USESMOOTHING") {
      useSmoothing = true;
    } else {
      invalid = true;
    }
  }
  if (invalid) {
    error(localize("Invalid action parameter: ") + value);
    return;
  }
}

var currentCoolantMode = COOLANT_OFF;
var currentCoolantTurret = 1;
var coolantOff = undefined;
var isOptionalCoolant = false;
var forceCoolant = false;

function setCoolant(coolant, turret) {
  var coolantCodes = getCoolantCodes(coolant, turret);
  if (Array.isArray(coolantCodes)) {
    if (singleLineCoolant) {
      skipBlock = isOptionalCoolant;
      writeBlock(coolantCodes.join(getWordSeparator()));
    } else {
      for (var c in coolantCodes) {
        skipBlock = isOptionalCoolant;
        writeBlock(coolantCodes[c]);
      }
    }
    return undefined;
  }
  return coolantCodes;
}

function getCoolantCodes(coolant, turret) {
  turret = gotMultiTurret ? (turret == undefined ? 1 : turret) : 1;
  isOptionalCoolant = false;
  var multipleCoolantBlocks = new Array(); // create a formatted array to be passed into the outputted line
  if (!coolants) {
    error(localize("Coolants have not been defined."));
  }
  if (tool.type == TOOL_PROBE) { // avoid coolant output for probing
    coolant = COOLANT_OFF;
  }
  if (coolant == currentCoolantMode && turret == currentCoolantTurret) {
    if ((typeof operationNeedsSafeStart != "undefined" && operationNeedsSafeStart) && coolant != COOLANT_OFF) {
      isOptionalCoolant = true;
    } else if (!forceCoolant || coolant == COOLANT_OFF) {
      return undefined; // coolant is already active
    }
  }
  if ((coolant != COOLANT_OFF) && (currentCoolantMode != COOLANT_OFF) && (coolantOff != undefined) && !forceCoolant && !isOptionalCoolant) {
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
  for (var c in coolants) { // find required coolant codes into the coolants array
    if (coolants[c].id == coolant) {
      var localCoolant = parseCoolant(coolants[c], turret);
      localCoolant = typeof localCoolant == "undefined" ? coolants[c] : localCoolant;
      coolantCodes.on = localCoolant.on;
      if (localCoolant.off != undefined) {
        coolantCodes.off = localCoolant.off;
        break;
      } else {
        for (var i in coolants) {
          if (coolants[i].id == COOLANT_OFF) {
            coolantCodes.off = localCoolant.off;
            break;
          }
        }
      }
    }
  }
  if (coolant == COOLANT_OFF) {
    m = !coolantOff ? coolantCodes.off : coolantOff; // use the default coolant off command when an 'off' value is not specified
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
    currentCoolantTurret = turret;
    for (var i in multipleCoolantBlocks) {
      if (typeof multipleCoolantBlocks[i] == "number") {
        multipleCoolantBlocks[i] = mFormat.format(multipleCoolantBlocks[i]);
      }
    }
    return multipleCoolantBlocks; // return the single formatted coolant value
  }
  return undefined;
}

function parseCoolant(coolant, turret) {
  var localCoolant;
  if (getSpindle(PART) == SPINDLE_MAIN) {
    localCoolant = turret == 1 ? coolant.spindle1t1 : coolant.spindle1t2;
    localCoolant = typeof localCoolant == "undefined" ? coolant.spindle1 : localCoolant;
  } else if (getSpindle(PART) == SPINDLE_LIVE) {
    localCoolant = turret == 1 ? coolant.spindleLivet1 : coolant.spindleLivet2;
    localCoolant = typeof localCoolant == "undefined" ? coolant.spindleLive : localCoolant;
  } else {
    localCoolant = turret == 1 ? coolant.spindle2t1 : coolant.spindle2t2;
    localCoolant = typeof localCoolant == "undefined" ? coolant.spindle2 : localCoolant;
  }
  localCoolant = typeof localCoolant == "undefined" ? (turret == 1 ? coolant.turret1 : coolant.turret2) : localCoolant;
  localCoolant = typeof localCoolant == "undefined" ? coolant : localCoolant;
  return localCoolant;
}

function isSpindleSpeedDifferent() {
  var areDifferent = false;
  if (isFirstSection()) {
    areDifferent = true;
  }
  if (lastSpindleDirection != tool.clockwise) {
    areDifferent = true;
  }
  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    var _spindleSpeed = tool.surfaceSpeed * ((unit == MM) ? 1 / 1000.0 : 1 / 12.0);
    if ((lastSpindleMode != SPINDLE_CONSTANT_SURFACE_SPEED) ||
        rpmFormat.areDifferent(lastSpindleSpeed, _spindleSpeed)) {
      areDifferent = true;
    }
  } else {
    if ((lastSpindleMode != SPINDLE_CONSTANT_SPINDLE_SPEED) ||
        rpmFormat.areDifferent(lastSpindleSpeed, spindleSpeed)) {
      areDifferent = true;
    }
  }
  return areDifferent;
}

function onSpindleSpeed(spindleSpeed) {
  if (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) {
    startSpindle(false, getFramePosition(currentSection.getInitialPosition()), spindleSpeed);
  }
}

function startSpindle(forceRPMMode, initialPosition, rpm) {
  var useConstantSurfaceSpeed = currentSection.getTool().getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED;
  var maximumSpindleSpeed = (tool.maximumSpindleSpeed > 0) ? Math.min(tool.maximumSpindleSpeed, getProperty("maximumSpindleSpeed")) : getProperty("maximumSpindleSpeed");
  var _spindleSpeed = spindleSpeed;
  if (rpm !== undefined) {
    _spindleSpeed = rpm;
  }

  gSpindleModeModal.reset();
  var spindleMode;
  if (useConstantSurfaceSpeed && !forceRPMMode) {
    spindleMode = getCode("CONSTANT_SURFACE_SPEED_ON");
  } else {
    spindleMode = getCode("CONSTANT_SURFACE_SPEED_OFF");
  }

  _spindleSpeed = useConstantSurfaceSpeed ? tool.surfaceSpeed * ((unit == MM) ? 1 / 1000.0 : 1 / 12.0) : _spindleSpeed;
  if (useConstantSurfaceSpeed && forceRPMMode) { // RPM mode is forced until move to initial position
    if (xFormat.getResultingValue(initialPosition.x) == 0) {
      _spindleSpeed = maximumSpindleSpeed;
    } else {
      _spindleSpeed = Math.min((_spindleSpeed * ((unit == MM) ? 1000.0 : 12.0) / (Math.PI * Math.abs(initialPosition.x * 2))), maximumSpindleSpeed);
    }
  }
  switch (currentSection.spindle) {
  case SPINDLE_PRIMARY: // main spindle
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      gSpindleModeModal.reset();
      sOutput.reset();
      if (useConstantSurfaceSpeed && !forceRPMMode) {
        writeBlock(gFormat.format(92), sOutput.format(maximumSpindleSpeed), "R1"); // spindle 1 is the default;
      }
      writeBlock(
        spindleMode,
        sOutput.format(_spindleSpeed),
        tool.clockwise ? mFormat.format(getCode("START_MAIN_SPINDLE_CW")) : mFormat.format(getCode("START_MAIN_SPINDLE_CCW"))
      ); // R1 is the default
      sOutput.reset();
    } else {
      writeBlock(getCode("CONSTANT_SURFACE_SPEED_OFF"), sOutput.format(_spindleSpeed), tool.clockwise ? mFormat.format(getCode("START_LIVE_TOOL_CW")) : mFormat.format(getCode("START_LIVE_TOOL_CCW")));
    }
    break;
  case SPINDLE_SECONDARY: // sub spindle
    if (!gotSecondarySpindle) {
      error(localize("Secondary spindle is not available."));
      return;
    }
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      gSpindleModeModal.reset();
      sOutput.reset();
      if (useConstantSurfaceSpeed && !forceRPMMode) {
        writeBlock(gFormat.format(92), sOutput.format(maximumSpindleSpeed), "R2"); // spindle 1 is the default;
      }
      writeBlock(
        spindleMode,
        sOutput.format(_spindleSpeed),
        (tool.clockwise ? mFormat.format(getCode("START_SUB_SPINDLE_CW")) : mFormat.format(getCode("START_SUB_SPINDLE_CCW"))), "R2"
      ); // R1 is the default
      sOutput.reset();
    } else {
      writeBlock(spindleMode, sOutput.format(_spindleSpeed), tool.clockwise ? mFormat.format(getCode("START_LIVE_TOOL_CW")) : mFormat.format(getCode("START_LIVE_TOOL_CCW")));
    }
    break;
  }
  lastSpindleMode = tool.getSpindleMode();
  lastSpindleSpeed = _spindleSpeed;
  lastSpindleDirection = tool.clockwise;
}

function moveSubSpindle(_method, _position, _feed, _useMachineFrame, _comment, _error) {
  if (!gotSecondarySpindle) {
    return;
  }
  if (machineState.spindlesAreAttached) {
    if (_error) {
      error(localize("An attempt was made to position the sub-spindle with both chucks clamped."));
    }
    return;
  }
  switch (_method) {
  case HOME:
    if ((getProperty("useTailStock") == "false") || !machineState.tailstockIsActive) { // don't retract B-axis if used as a tailstock
      writeBlock(
        gMotionModal.format(0),
        //gFormat.format(28),
        gFormat.format(53),
        barOutput.format(0),
        conditional(_comment, formatComment(_comment))
      );
    }
    break;
  case RAPID:
    writeBlock(
      gMotionModal.format(0),
      conditional(_useMachineFrame, gFormat.format(53)),
      subWOutput.format(_position) + "]",
      conditional(_comment, formatComment(_comment))
    );
    break;
  case FEED:
    var g53Code = "g53";
    if (_useMachineFrame) {
      switch (g53Code) {
      case "g53":
        writeBlock(gMotionModal.format(1), gFormat.format(53), subWOutput.format(_position) + "]", getFeed(_feed), conditional(_comment, formatComment(_comment)));
        break;
      case "g532":
        writeBlock(gMotionModal.format(1), g1Format.format(53.2), barOutput.format(_position), getFeed(_feed), conditional(_comment, formatComment(_comment)));
        break;
      case "linear":
        writeBlock(gMotionModal.format(1), subWOutput.format(_position) + "]", getFeed(_feed), conditional(_comment, formatComment(_comment)));
        break;
      case "error":
        error(localize("The sub-spindle cannot be positioned using a feed rate when Machine Position output is used."));
        return;
      }
      if (properties.useG53ForXfer == "error") {
        error(localize("The sub-spindle cannot be positioned using a feed rate when Machine Position output is used."));
        return;
      }
    } else {
      writeBlock(gMotionModal.format(1),
        subWOutput.format(_position) + "]",
        getFeed(_feed),
        conditional(_comment, formatComment(_comment))
      );
    }
    break;
  case TORQUE:
    forceModals(gMotionModal);
    writeBlock(
      //gFeedModeModal.format(getCode("FEED_MODE_UNIT_MIN", getSpindle(TOOL))),
      getCode("FEED_MODE_UNIT_MIN", getSpindle(TOOL)),
      //gMotionModal.format(1),
      gFormat.format(31),
      //pOutput.format(99),
      conditional(_useMachineFrame == 1, gFormat.format(53)),
      subWOutput.format(_position) + "]",
      getFeed(_feed),
      conditional(_comment, formatComment(_comment))
    );
    break;
  }
}

function clampChuck(_spindle, _clamp) {
  if (_spindle == SPINDLE_MAIN) {
    if (_clamp != machineState.mainChuckIsClamped) {
      writeBlock(mFormat.format(getCode(_clamp ? "CLAMP_CHUCK" : "UNCLAMP_CHUCK", _spindle)),
        formatComment(_clamp ? "CLAMP MAIN CHUCK" : "UNCLAMP MAIN CHUCK"));
      machineState.mainChuckIsClamped = _clamp;
    }
  } else {
    if (_clamp != machineState.subChuckIsClamped) {
      writeBlock(mFormat.format(getCode(_clamp ? "CLAMP_CHUCK" : "UNCLAMP_CHUCK", _spindle)),
        formatComment(_clamp ? "CLAMP SUB CHUCK" : "UNCLAMP SUB CHUCK"));
      machineState.subChuckIsClamped = _clamp;
    }
  }
  machineState.spindlesAreAttached = machineState.mainChuckIsClamped && machineState.subChuckIsClamped;
}

function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    setCoolant(COOLANT_OFF, machineState.currentTurret);
    break;
  case COMMAND_LOCK_MULTI_AXIS:
    writeBlock(currentSection.spindle == SPINDLE_PRIMARY ? mFormat.format(getCode("CLAMP_PRIMARY_SPINDLE")) : mFormat.format(getCode("CLAMP_SECONDARY_SPINDLE"))); // C-axis
    if (gotBAxis) {
      writeBlock(mFormat.format(getCode("CLAMP_B_AXIS"))); // B-axis
    }
    break;
  case COMMAND_UNLOCK_MULTI_AXIS:
    if (gotBAxis) {
      writeBlock(mFormat.format(getCode("UNCLAMP_B_AXIS"))); // B-axis
    }
    writeBlock(currentSection.spindle == SPINDLE_PRIMARY ? mFormat.format(getCode("UNCLAMP_PRIMARY_SPINDLE")) : mFormat.format(getCode("UNCLAMP_SECONDARY_SPINDLE"))); // C-axis
    break;
  case COMMAND_START_CHIP_TRANSPORT:
    // writeBlock(getCode("START_CHIP_TRANSPORT"));
    break;
  case COMMAND_STOP_CHIP_TRANSPORT:
    // writeBlock(getCode("STOP_CHIP_TRANSPORT"));
    break;
  case COMMAND_BREAK_CONTROL:
    break;
  case COMMAND_ACTIVATE_SPEED_FEED_SYNCHRONIZATION:
    break;
  case COMMAND_DEACTIVATE_SPEED_FEED_SYNCHRONIZATION:
    break;
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    forceSpindleSpeed = true;
    forceCoolant = true;
    break;
  case COMMAND_OPTIONAL_STOP:
    writeBlock(mFormat.format(1));
    forceSpindleSpeed = true;
    forceCoolant = true;
    break;
  case COMMAND_END:
    writeBlock(mFormat.format(2));
    break;
  case COMMAND_SPINDLE_CLOCKWISE:
    if (currentSection.spindle == SPINDLE_PRIMARY) {
      if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
        writeBlock(mFormat.format(getCode("START_MAIN_SPINDLE_CW")));
      } else {
        writeBlock(mFormat.format(getCode("START_LIVE_TOOL_CW")));
      }
    } else {
      if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
        writeBlock(mFormat.format(getCode("START_SUB_SPINDLE_CW")));
      } else {
        writeBlock(mFormat.format(getCode("START_LIVE_TOOL_CW")));
      }
    }
    break;
  case COMMAND_SPINDLE_COUNTERCLOCKWISE:
    if (currentSection.spindle == SPINDLE_PRIMARY) {
      if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
        writeBlock(mFormat.format(getCode("START_MAIN_SPINDLE_CCW")));
      } else {
        writeBlock(mFormat.format(getCode("START_LIVE_TOOL_CCW")));
      }
    } else { // secondary
      if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
        writeBlock(mFormat.format(getCode("START_SUB_SPINDLE_CCW")));
      } else {
        writeBlock(mFormat.format(getCode("START_LIVE_TOOL_CCW")));
      }
    }
    break;
  case COMMAND_STOP_SPINDLE:
    if (currentSection.spindle == SPINDLE_PRIMARY) {
      if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
        writeBlock(mFormat.format(getCode("STOP_MAIN_SPINDLE")));
      } else {
        writeBlock(mFormat.format(getCode("STOP_LIVE_TOOL")));
      }
    } else {
      if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
        writeBlock(mFormat.format(getCode("STOP_SUB_SPINDLE")));
      } else {
        writeBlock(mFormat.format(getCode("STOP_LIVE_TOOL")));
      }
    }
    lastSpindleSpeed = 0;
    lastSpindleDirection = undefined;
    sOutput.reset();
    break;
  default:
    onUnsupportedCommand(command);
  }
}

/** Get synchronization/transfer code based on part cutoff spindle direction. */
function getSpindleTransferCodes(_transferType) {
  var transferCodes = {direction:0, spindleMode:0, surfaceSpeed:0, maximumSpindleSpeed:0};
  if (_transferType == TRANSFER_PHASE) {
    transferCodes.direction = mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_PHASE", getSecondarySpindle()));
  } else {
    transferCodes.direction = mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_SPEED", getSecondarySpindle()));
  }
  transferCodes.spindleDirection = true; // clockwise
  if (isLastSection()) {
    return transferCodes;
  }
  var numberOfSections = getNumberOfSections();
  for (var i = getNextSection().getId(); i < numberOfSections; ++i) {
    var section = getSection(i);
    if (section.getParameter("operation-strategy") == "turningSecondarySpindleReturn") {
      continue;
    } else if (section.getType() != TYPE_TURNING || section.spindle != SPINDLE_MAIN) {
      break;
    } else if (section.getType() == TYPE_TURNING) {
      var tool = section.getTool();
      if (!tool.clockwise) {
        transferCodes.direction += 1;
      }
      transferCodes.spindleMode = tool.getSpindleMode();
      transferCodes.surfaceSpeed = tool.surfaceSpeed;
      transferCodes.maximumSpindleSpeed = tool.maximumSpindleSpeed;
      transferCodes.spindleDirection = tool.clockwise;
      break;
    }
  }
  return transferCodes;
}

function getG17Code() {
  return machineState.usePolarInterpolation ? 17 : 17;
}

function engagePartCatcher(engage) {
  if (engage) {
    if (machineState.spindlesAreAttached) {
      error(localize("Cannot eject part when spindles are connected."));
    }
    // catch part here
    writeBlock(mFormat.format(getCode("PART_CATCHER_ON")), formatComment(localize("PART CATCHER ON")));
  } else {
    onCommand(COMMAND_COOLANT_OFF);
    //writeRetract(X, Y);
    //writeRetract(Z);
    //writeRetract(Y);
    writeBlock(mFormat.format(getCode("PART_CATCHER_OFF")), formatComment(localize("PART CATCHER OFF")));
    forceXYZ();
  }
}

function onSectionEnd() {

  if (useSmoothing) {
    setSmoothing(false);
    useSmoothing = false;
  }

  if (machineState.usePolarInterpolation) {
    setPolarInterpolation(false); // disable polar interpolation mode
  }

  if (isPolarModeActive()) {
    setPolarCoordinates(false); // disable Polar coordinates mode
  }

  if (getProperty("useG61")) {
    setGeometryComp(false);
  }
  // cancel SFM mode to preserve spindle speed
  if ((tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) && !machineState.spindlesAreAttached) {
    startSpindle(true, getFramePosition(currentSection.getFinalPosition()));
  }

  if (getProperty("usePartCatcher") && partCutoff && currentSection.partCatcher) {
    engagePartCatcher(false);
  }

  if (partCutoff) {
    machineState.spindlesAreAttached = false;
  }

  if (((getCurrentSectionId() + 1) >= getNumberOfSections()) ||
      (tool.number != getNextSection().getTool().number)) {
    onCommand(COMMAND_BREAK_CONTROL);
  }

  if (hasNextSection()) {
    if (getNextSection().getTool().coolant != currentSection.getTool().coolant) {
      setCoolant(COOLANT_OFF, machineState.currentTurret);
    }
  }

  if (currentSection.isMultiAxis() && useTCPC) {
    writeBlock(gFormat.format(49));
  }

  if (getSpindle(PART) == SPINDLE_SUB) {
    invertAxes(false, false);
  }

  forceXYZ();
  forcePolarCoordinates = false;
  forcePolarInterpolation = false;
  partCutoff = false;
}

/** Output block to do safe retract and/or move to home position. */
function writeRetract() {
  var words = []; // store all retracted axes in an array
  for (var i = 0; i < arguments.length; ++i) {
    let instances = 0; // checks for duplicate retract calls
    for (var j = 0; j < arguments.length; ++j) {
      if (arguments[i] == arguments[j]) {
        ++instances;
      }
    }
    if (instances > 1) { // error if there are multiple retract calls for the same axis
      error(localize("Cannot retract the same axis twice in one line"));
      return;
    }
    switch (arguments[i]) {
    case X:
      xOutput.reset();
      //words.push("X#" + xHomeParameter);
      words.push("X" + xFormat.format(0));
      retracted = true; // specifies that the tool has been retracted to the safe plane
      break;
    case Y:
      if (gotYAxis) {
        yOutput.reset();
        //words.push("Y#" + yHomeParameter);
        words.push("Y" + yFormat.format(0));
      }
      break;
    case Z:
      zOutput.reset();
      words.push("Z#" + ((currentSection.spindle == SPINDLE_SECONDARY) ? zSubHomeParameter : zHomeParameter));
      retracted = true; // specifies that the tool has been retracted to the safe plane
      break;
    default:
      error(localize("Bad axis specified for writeRetract()."));
      return;
    }
  }
  gMotionModal.reset();
  if (words.length > 0) {
    writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), gFormat.format(53), words); // retract
  }
  forceXYZ();
}

function onClose() {
  writeln("");

  optionalSection = false;
  writeBlock(gRotationModal.format(69));
  if (machineState.liveToolIsActive) {
    writeBlock(mFormat.format(getCode("STOP_LIVE_TOOL")));
  } else if (machineState.mainSpindleIsActive) {
    writeBlock(mFormat.format(getCode("STOP_MAIN_SPINDLE")));
  } else if (machineState.subSpindleIsActive) {
    writeBlock(mFormat.format(getCode("STOP_SUB_SPINDLE")));
  }

  onCommand(COMMAND_COOLANT_OFF);

  if (!machineState.spindlesAreAttached) {
    writeRetract(X, Y);
    writeRetract(Z);
  } else {
    writeRetract(X, Y);
    forceABC();
    writeBlock(gFormat.format(0), gFormat.format(53), bOutput.format(0), ("Z#" + ((currentSection.spindle == SPINDLE_SECONDARY) ? zSubHomeParameter : zHomeParameter)));
  }

  if (machineState.tailstockIsActive) {
    writeBlock(mFormat.format(getCode("TAILSTOCK_OFF")));
    writeBlock(mFormat.format(232), formatComment("RETURN TAILSTOCK TO HOME POSITION"));
  }

  if (gotSecondarySpindle) {
    //Not needed when using U for C2
    //writeBlock(gSpindleModal.format(111));
  }
  writeln("");
  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  writeBlock(mFormat.format(30)); // stop program, spindle stop, coolant off

}
// <<<<< INCLUDED FROM ../common/mazak integrex i.cps
properties.maximumSpindleSpeed.value = 5000;
