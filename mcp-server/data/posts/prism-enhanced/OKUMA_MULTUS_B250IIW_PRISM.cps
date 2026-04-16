var modelType = "okuma multus b250IIw";
description = "PRISM Enhanced - Okuma Multus B250IIW";
// Base: JM Die shop post Rev A (2024-03-15), Autodesk Rev 44099
// PRISM: Kienzle force model, CSS G50 optimization, Taylor tool life

/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  Okuma mill-turn post processor configuration.

  $Revision: 44099 10e9a11d853abb3bd24c64bf1a6e9f5452873d8f $
  $Date: 2023-11-14 15:10:04 $

  FORKID {D93DAA65-1C09-402E-9871-3280B561D994}
*/

///////////////////////////////////////////////////////////////////////////////
//                        MANUAL NC COMMANDS
//
// The following ACTION commands are supported by this post.
//
//     partEject                  - Manually eject the part
//     usePolarInterpolation      - Force Polar interpolation mode for next operation (usePolarMode is deprecated but still supported)
//     usePolarCoordinates        - Force Polar coordinates for the next operation (useXZCMode is deprecated but still supported)
//
///////////////////////////////////////////////////////////////////////////////

vendor = "OKUMA";
vendorUrl = "https://www.okuma.com";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45909;

if (!description) {
  description = "Okuma Multus";
}

if (!longDescription) {
  longDescription = subst("Preconfigured %1 post (OSP-P300 control) with support for mill-turn.", description);
}

extension = "min";
programNameIsInteger = false;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.025, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(5000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(90); // reduced sweep to break up circular moves on quadrant boundaries
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
allowSpiralMoves = false;
allowFeedPerRevolutionDrilling = true;
highFeedrate = (unit == IN) ? 700 : 2540;

// user-defined properties
properties = {
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
  maxTool: {
    title      : "Max tool number",
    description: "Defines the maximum tool number.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999],
    value      : 99,
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
    value      : 1,
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
    description: "Defines the maximum spindle speed allowed by your machines.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999],
    value      : 4000,
    scope      : "post"
  },
  spindleRangeLow: {
    title      : "Low spindle speed range",
    description: "Defines the lower speed range. Enter '0' if machine is not geared.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 1100],
    value      : 1100,
    scope      : "post"
  },
  liveSpindleRangeLow: {
    title      : "Low Live spindle speed range",
    description: "Defines the lower speed range for the live tooling. Enter '0' if machine is not geared.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 4100],
    value      : 4100,
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
    value      : false,
    scope      : "post"
  },
  autoEject: {
    title      : "Auto eject",
    description: "Specifies whether the part should automatically eject at the end of a program.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useTailStock: {
    title       : "Use tailstock",
    description : "Specifies whether to use the tailstock or not.",
    group       : "configuration",
    type        : "boolean",
    presentation: "yesno",
    value       : false,
    scope       : "post"
  },
  useYAxisForDrilling: {
    title      : "Position in Y for axial drilling",
    description: "Positions in Y for axial drilling options when it can instead of using the C-axis.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  gotChipConveyor: {
    title       : "Got chip conveyor",
    description : "Specifies whether to use a chip conveyor.",
    group       : "configuration",
    type        : "boolean",
    presentation: "yesno",
    value       : false,
    scope       : "post"
  },
  xAxisMinimum: {
    title      : "X-axis minimum limit",
    description: "Defines the lower limit of X-axis travel as a radius value.",
    group      : "configuration",
    type       : "spatial",
    range      : [-99999, 0],
    value      : 0,
    scope      : "post"
  },
  homeMethodZ: {
    title      : "Move to Z-home position",
    description: "Specifies the method to use when positioning the Z-axis to its home position.  WCS positions in the active work coordinate system.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      {title:"G20", id:"G20"},
      {title:"WCS", id:"WCS"}
    ],
    value: "G20",
    scope: "post"
  },
  homePositionX: {
    title      : "X home position in radius",
    description: "X home position specified in radius.",
    group      : "homePositions",
    type       : "spatial",
    value      : 18.8976,
    scope      : "post"
  },
  homePositionY: {
    title      : "Y home position",
    description: "Y home position.",
    group      : "homePositions",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  homePositionZ: {
    title      : "Z home position",
    description: "Z home position.",
    group      : "homePositions",
    type       : "spatial",
    value      : 20,
    scope      : "post"
  },
  homePositionW: {
    title      : "W home position",
    description: "W home position.",
    group      : "homePositions",
    type       : "spatial",
    value      : 31.8898,
    scope      : "post"
  },
  useSSV: {
    title      : "Use SSV",
    description: "Outputs M695/M694 to enable SSV for turning operations.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  optimizeCAxisSelect: {
    title      : "Optimize C axis selection",
    description: "Optimizes the output of enable/disable C-axis codes.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
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
  useM216: {
    title      : "Rapid feed ignoring function",
    description: "Use rapid feed ignoring function M216/M215.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
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
  useM960: {
    title      : "Use C-axis shortest direction code",
    description: "Specifies that an M960 should be used to control the C-axis direction instead of the M15/M16 directional codes.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  maxToolOffset: {
    title      : "Max tool offset number",
    description: "Defines the maximum tool offset number.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999],
    value      : 99,
    scope      : "post"
  },
  useRigidTapping: {
    title      : "Use rigid tapping",
    description: "Enable to allow rigid tapping.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSimpleThread: {
    title      : "Use simple threading cycle",
    description: "Enable to output G33 simple threading cycle, disable to output G71 standard threading cycle.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  loadMonitoring: {
    title      : "Load monitoring",
    description: "A value that enables which axes should be monitored.  1 = X, 2 = Z, 3 = XZ, etc.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 1013],
    value      : 0,
    scope      : "post"
  },
  useMultiEdgeSpecification: {
    title      : "Use multi-edge tool specification",
    description: "Use the multi-edge tool specification option.",
    group      : "configuration",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  // ── PRISM Manufacturing Intelligence Properties ──
  prismPhysicsEnabled: {
    title      : "PRISM physics optimization",
    description: "Enable Kienzle force model, CSS optimization, and Taylor tool life tracking.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  prismOptimizationMode: {
    title      : "PRISM optimization mode",
    description: "Physics calculation strategy: kienzle (physics-based), empirical, or conservative.",
    group      : "prism",
    type       : "enum",
    values     : [
      {id: "kienzle", title: "Kienzle Force Model"},
      {id: "empirical", title: "Empirical (JM Die calibrated)"},
      {id: "conservative", title: "Conservative (80% derating)"}
    ],
    value      : "kienzle",
    scope      : "post"
  },
  prismSurfaceFinishTarget: {
    title      : "Target surface finish Ra (um)",
    description: "Target Ra for finish passes. Used for feed optimization.",
    group      : "prism",
    type       : "number",
    value      : 1.6,
    scope      : "post"
  },
  prismToolLifeTracking: {
    title      : "Tool life tracking",
    description: "Output Taylor tool life estimates in NC comments.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  maximumSpindleSpeed: {
    title      : "Maximum spindle speed (RPM)",
    description: "Machine max RPM for G50 clamp. Multus B250IIW: 5000 RPM main, 6000 RPM tool.",
    group      : "prism",
    type       : "integer",
    range      : [100, 10000],
    value      : 5000,
    scope      : "post"
  },
  spindlePower_kW: {
    title      : "Spindle power (kW)",
    description: "Main spindle power rating. Multus B250IIW: 22 kW.",
    group      : "prism",
    type       : "number",
    value      : 22.0,
    scope      : "post"
  }
};

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G15 H##", range:[1, 200]},
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
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST, on:263, off:262},
  {id:COOLANT_THROUGH_TOOL, spindle1:{on:[175, 103], off:174}, spindle2:{on:[8, 143], off:9}, spindleLive:{on:[175, 103], off:174}},
  {id:COOLANT_AIR, spindle1:{on:89, off:88}, spindle2:{on:289, off:288}},
  {id:COOLANT_AIR_THROUGH_TOOL, spindle1:{on:[288], off:289}, spindle2:{on:[288], off:289}, spindleLive:{on:[288], off:289}},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL, spindle1:{on:[8, 142,], off:9}, spindle2:{on:[8, 142], off:9}, spindleLive:{on:[175, 103], off:174}},
  {id:COOLANT_OFF, off:9}
];

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-/";

var gFormat = createFormat({prefix:"G", decimals:0});
var mFormat = createFormat({prefix:"M", decimals:0});

var spatialFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var integerFormat = createFormat({decimals:0});
var xFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL, scale:2}); // diameter mode
var yFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var zFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var rFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL}); // radius
var abcFormat = createFormat({decimals:3, type:FORMAT_REAL, scale:DEG});
var bFormat = createFormat({decimals:3, type:FORMAT_REAL, scale:DEG});
var cFormat = createFormat({decimals:3, type:FORMAT_REAL, scale:DEG});
var fpmFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var fprFormat = createFormat({type:FORMAT_REAL, decimals:(unit == MM ? 3 : 4), minimum:(unit == MM ? 0.001 : 0.0001)});
var feedFormat = fpmFormat;
var pitchFormat = createFormat({decimals:6, type:FORMAT_REAL});
var toolFormat = createFormat({decimals:0, width:4, zeropad:true});
var tool1Format = createFormat({decimals:0, width:6, zeropad:true});
var positionNumberFormat = createFormat({width:2, zeropad:true, decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:2, type:FORMAT_REAL}); // seconds - range 0.001-99999.999
var milliFormat = createFormat({decimals:0}); // milliseconds // range 1-9999
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createOutputVariable({prefix:"X"}, xFormat);
var yOutput = createOutputVariable({onchange:function() {yAxisIsRetracted = false;}, prefix:"Y"}, yFormat);
var zOutput = createOutputVariable({prefix:"Z"}, zFormat);
var wOutput = createOutputVariable({prefix:"W"}, zFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, bFormat);
var cOutput = createOutputVariable({prefix:"C", cyclicLimit:360}, cFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var pitchOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, pitchFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);
var sbOutput = createOutputVariable({prefix:"SB=", control:CONTROL_FORCE}, rpmFormat);
var maxSpeedOutput = createOutputVariable({prefix:"S"}, rpmFormat);
var eOutput = createOutputVariable({prefix:"E", control:CONTROL_FORCE}, secFormat);
var dwellOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, secFormat);
var g33IOutput = createOutputVariable({prefix:"I"}, spatialFormat);
var g33KOutput = createOutputVariable({prefix:"K"}, spatialFormat);
var g33COutput = createOutputVariable({prefix:"C"}, spatialFormat);

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_NONZERO}, spatialFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_NONZERO}, spatialFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_NONZERO}, spatialFormat);

var gMotionModal = createOutputVariable({}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createOutputVariable({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gFeedModeModal = createOutputVariable({}, gFormat); // modal group 5 // G94-95
var gSpindleModeModal = createOutputVariable({}, gFormat); // modal group 5 // G96-97
var gAbsIncModal = createOutputVariable({}, gFormat); // modal group 6 // G90-91
var gCycleModal = createOutputVariable({}, gFormat); // modal group 9 // G81, ...
var gPolarModal = createOutputVariable({}, gFormat); // G137, G136
var gSlantModal = createOutputVariable({onchange:function () {gMotionModal.reset();}}, gFormat);
var cAxisEngageModal = createOutputVariable({}, mFormat);
var cAxisBrakeModal = createOutputVariable({}, mFormat);
var mInterferModal = createOutputVariable({}, mFormat);
var cAxisDirectionModal = createOutputVariable({}, mFormat);
var gSelectSpindleModal = createOutputVariable({}, gFormat);
var tailStockModal = createOutputVariable({}, mFormat);
var rapidIgnoreLoadModal = createOutputVariable({}, mFormat);

// fixed settings
var firstFeedParameter = 100;

var gotPolarInterpolation = true; // specifies if the machine has XY polar interpolation capabilities
var gotDoorControl = false;
var airCleanChuck = true; // use air to clean off chuck at part transfer and part eject

// defined in defineMachine
var turret1GotYAxis;
var gotYAxis;
var yAxisMinimum;
var yAxisMaximum;
var gotBAxis;
var bAxisIsManual;
var useTCP;
var gotMultiTurret;
var gotSecondarySpindle;

var SPINDLE_MAIN = 0;
var SPINDLE_SUB = 1;
var SPINDLE_LIVE = 2;

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
var activeSpindle = SPINDLE_MAIN;
var partCutoff = false;
var reverseTap = false;
var showSequenceNumbers;
var forcePolarCoordinates = false; // forces Polar coordinate output, activated by Action:usePolarCoordinates
var forcePolarInterpolation = false; // force Polar interpolation output, activated by Action:usePolarInterpolation
var tapping = false;
var threading = false;
var ejectRoutine = false;
var bestABC = undefined;
var lastSpindleMode = undefined;
var lastSpindleSpeed = 0;
var lastSpindleDirection = undefined;
var xAxisMinimum;
var retracted = false; // specifies that the tool has been retracted to the safe plane
var yAxisIsRetracted = true;
var vlmon; // load monitoring variable
var activeTurret = 1;
var positionNumber;
var operationSupportsTCP; // multi-axis operation supports TCP
var previousMaximumSpeed = 0;
var multiEdge;

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
  tiltedPlaneMode               : undefined,
  feedPerRevolution             : undefined
};

function getCode(code, spindle) {
  switch (code) {
  case "PART_CATCHER_ON":
    return 77;
  case "PART_CATCHER_OFF":
    return 76;
  case "TAILSTOCK_ON":
    machineState.tailstockIsActive = true;
    return 21;
  case "TAILSTOCK_OFF":
    machineState.tailstockIsActive = false;
    return 20;
  case "SET_SPINDLE_FRAME":
    break;
  case "ENABLE_Y_AXIS":
    setRadiusDiameterMode("radius");
    return 138;
  case "DISABLE_Y_AXIS":
  case "POLAR_INTERPOLATION_OFF":
    setRadiusDiameterMode("diameter");
    return 136;
  case "ENABLE_C_AXIS":
    machineState.cAxisIsEngaged = true;
    return 110;
  case "DISABLE_C_AXIS":
    machineState.cAxisIsEngaged = false;
    return 109;
  case "ENABLE_B_AXIS":
    return 149;
  case "DISABLE_B_AXIS":
    return 148;
  case "POLAR_INTERPOLATION_ON":
    setRadiusDiameterMode("radius");
    return 137;
  case "ENABLE_TURNING":
    return 270;
  case "TOOL_CHANGE":
    gPolarModal.reset();
    yAxisIsEnabled = false; // M323 Turns Y axis off
    return 323;
  case "STOP_SPINDLE":
    lastSpindleSpeed = 0;
    lastSpindleDirection = undefined;
    sOutput.reset();
    switch (spindle) {
    case SPINDLE_MAIN:
    case SPINDLE_SUB:
      return 5;
    case SPINDLE_LIVE:
      return 12;
    }
    break;
  case "ORIENT_SPINDLE":
    return (spindle == SPINDLE_MAIN) ? 19 : 239;
  case "START_SPINDLE_CW":
    switch (spindle) {
    case SPINDLE_MAIN:
      machineState.mainSpindleIsActive = true;
      machineState.subSpindleIsActive = false;
      machineState.liveToolIsActive = false;
      return 3;
    case SPINDLE_LIVE:
      machineState.mainSpindleIsActive = false;
      machineState.subSpindleIsActive = false;
      machineState.liveToolIsActive = true;
      return 13;
    case SPINDLE_SUB:
      machineState.mainSpindleIsActive = false;
      machineState.subSpindleIsActive = true;
      machineState.liveToolIsActive = false;
      return 3;
    }
    break;
  case "START_SPINDLE_CCW":
    switch (spindle) {
    case SPINDLE_MAIN:
      machineState.mainSpindleIsActive = true;
      return 4;
    case SPINDLE_SUB:
      machineState.subSpindleIsActive = true;
      return 4;
    case SPINDLE_LIVE:
      machineState.liveToolIsActive = true;
      return 14;
    }
    break;
  case "FEED_MODE_UNIT_REV":
    machineState.feedPerRevolution = true;
    return 95;
  case "FEED_MODE_UNIT_MIN":
    machineState.feedPerRevolution = false;
    return 94;
  case "CONSTANT_SURFACE_SPEED_ON":
    return 96;
  case "CONSTANT_SURFACE_SPEED_OFF":
    return 97;
  case "AUTO_AIR_ON":
    break;
  case "AUTO_AIR_OFF":
    break;
  case "LOCK_MULTI_AXIS":
    return 147;
  case "UNLOCK_MULTI_AXIS":
    return 146;
  case "CLAMP_B_AXIS":
    return 404;
  case "UNCLAMP_B_AXIS":
    return 625;
  case "C_AXIS_CW":
    return 15;
  case "C_AXIS_CCW":
    return 16;
  case "CLAMP_CHUCK":
    return (spindle == SPINDLE_MAIN) ? 83 : 248;
  case "UNCLAMP_CHUCK":
    return (spindle == SPINDLE_MAIN) ? 84 : 249;
  case "SPINDLE_SYNCHRONIZATION_PHASE":
    break;
  case "SPINDLE_SYNCHRONIZATION_SPEED":
    return 151;
  case "SPINDLE_SYNCHRONIZATION_OFF":
    return 150;
  case "START_CHIP_TRANSPORT":
    return 244;
  case "STOP_CHIP_TRANSPORT":
    return 243;
  case "OPEN_DOOR":
    return 91;
  case "CLOSE_DOOR":
    return 90;
  case "IGNORE_SPINDLE_ORIENTATION":
    return 210;
  case "TORQUE_LIMIT_ON":
    return 29;
  case "TORQUE_LIMIT_OFF":
    return 28;
  case "TORQUE_SKIP_ON":
    return 22;
  case "SELECT_SPINDLE":
    switch (spindle) {
    case SPINDLE_MAIN:
      return 140;
    case SPINDLE_SUB:
      return 141;
    }
    break;
  case "RIGID_TAPPING":
    break;
  case "INTERNAL_INTERLOCK_ON":
    return (spindle == SPINDLE_MAIN) ? 185 : 247;
  case "INTERNAL_INTERLOCK_OFF":
    return (spindle == SPINDLE_MAIN) ? 184 : 246;
  case "INTERFERENCE_CHECK_OFF":
    break;
  case "INTERFERENCE_CHECK_ON":
    break;
  case "CYCLE_PART_EJECTOR":
    break;
  case "AIR_BLAST_ON":
    return (spindle == SPINDLE_MAIN) ? 51 : 289;
  case "AIR_BLAST_OFF":
    return (spindle == SPINDLE_MAIN) ? 50 : 288;
  case "COLLISION_AVOIDANCE_ON":
    return 867;
  case "COLLISION_AVOIDANCE_OFF":
    return 866;
  case "TCP_CONTROL_ON":
    return 255;
  case "TCP_CONTROL_OFF":
    return 254;
  default:
    error(localize("Command " + code + " is not defined."));
    return 0;
  }
  return 0;
}

/**
  Returns the desired tolerance for the given section.
*/
function getTolerance() {
  var t1 = toPreciseUnit(tolerance, MM);
  var t2 = getParameter("operation:tolerance", t1);
  t1 = t1 > 0 ? Math.min(t1, t2) : t2;
  return unit == IN ? t1 * 25.4 : t1;
}

/**
  Outputs the C-axis direction code.
*/
function setCAxisDirection(previous, current) {
  if (!getProperty("useM960")) {
    var delta = current - previous;
    if (((delta < 0) && (delta > -Math.PI)) || (delta > Math.PI)) {
      writeBlock(cAxisDirectionModal.format(getCode("C_AXIS_CCW", getSpindle(PART))));
    } else if (abcFormat.getResultingValue(delta) != 0) {
      writeBlock(cAxisDirectionModal.format(getCode("C_AXIS_CW", getSpindle(PART))));
    }
  }
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
}

function formatComment(text) {
  return "(" + String(filterText(String(text).toUpperCase(), permittedCommentChars)).replace(/[()]/g, "") + ")";
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

function getB(abc, section) {
  if (section.spindle == SPINDLE_PRIMARY) {
    return abc.y;
  } else {
    return abc.y; // Math.PI - abc.y;
  }
}

function writeCommentSeqno(text) {
  writeln(formatSequenceNumber() + formatComment(text));
}

function defineMachine() {
  if (modelType == "okuma multus u3000c") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-125, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(125, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus u3000w") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-125, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(125, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus u4000c") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-150, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(150, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus u4000w") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-150, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(150, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus u5000c") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-150, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(150, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus u5000w") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-150, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(150, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b200IIc") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-80, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(80, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b200IIw") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-80, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(80, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b250IIc") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-100, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(100, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b250IIw") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-100, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(100, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b300IIc") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-80, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(80, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b300IIw") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-80, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(80, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b400IIc") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-115, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(115, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b400IIw") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-115, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(115, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b550c") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-260, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(260, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b550w") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-260, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(260, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b750c") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-330, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(330, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = false; // specifies if machine has a sub spindle
  } else if (modelType == "okuma multus b750w") {
    turret1GotYAxis = true; // specifies if machine has a y axis
    yAxisMinimum = toPreciseUnit(-330, MM); // specifies the minimum range for the Y-axis
    yAxisMaximum = toPreciseUnit(330, MM); // specifies the maximum range for the Y-axis
    gotBAxis = true; // B-axis always requires customization to match the machine specific functions for doing rotations
    bAxisIsManual = false; // B-axis is manually set and not programmable
    useTCP = true; // specifies that machine has TCP
    gotMultiTurret = false; // specifies if the machine has several turrets
    gotSecondarySpindle = true; // specifies if machine has a sub spindle
  }
  if (!turret1GotYAxis) {
    yAxisMinimum = 0;
    yAxisMaximum = 0;
  }

  // define B-axis
  if (bAxisIsManual) {
    bOutput.setPrefix("(B=");
    bOutput.setSuffix(")");
  } else {
    bOutput.setPrefix("B");
    bOutput.setSuffix("");
  }
}

function activateMachine(section) {
  // TCP setting
  operationSupportsTCP = section.isMultiAxis() && useTCP;

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
    bAxis = createAxis({coordinate:1, table:false, axis:[0, -1, 0], range:[0, 195], preference:0, tcp:true});
    cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], range:[0, 359.9999], cyclic:true, preference:0, tcp:operationSupportsTCP});
  } else {
    bAxis = createAxis({coordinate:1, table:false, axis:[0, -1, 0], range:[0, 195], preference:0, tcp:true});
    cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], range:[0, 359.9999], cyclic:true, preference:0, tcp:operationSupportsTCP});
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
    machineConfiguration.setSpindleAxis(new Vector(0, 0, 1)); // set the spindle axis depending on B0 orientation
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
    operationSupportsTCP ? FEED_FPM : FEED_FPM, // FEED_DPM, FEED_INVERSE_TIME,
    99999, // maximum output value for dpm feed rates
    DPM_COMBINATION, // INVERSE_MINUTES/INVERSE_SECONDS or DPM_COMBINATION/DPM_STANDARD
    0.5, // tolerance to determine when the DPM feed has changed
    unit == MM ? 1.0 : 1.0 // ratio of rotary accuracy to linear accuracy for DPM calculations
  );

  machineConfiguration.setVendor("OKUMA");
  machineConfiguration.setModel(modelType);
  setMachineConfiguration(machineConfiguration);
  if (section.isMultiAxis()) {
    section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
  }

  return turret;
}

function formatTool(tool, cancelCompensation) {
  var compensationOffset = tool.isTurningTool() ? tool.compensationOffset : tool.lengthOffset;
  var toolNumber;
  var offset1;
  var offset2;
  if (cancelCompensation) {
    offset1 = 0;
    offset2 = 0;
  } else if (tool.isTurningTool()) {
    offset1 = compensationOffset;
    offset2 = compensationOffset;
  } else {
    offset1 = tool.diameterOffset;
    offset2 = tool.lengthOffset;
  }
  if (getProperty("maxToolOffset") > 99) {
    toolNumber = "T" + tool1Format.format(compensationOffset * 1000 + tool.number);
  } else {
    toolNumber = "T" + tool1Format.format(offset1 * 10000 + tool.number * 100 + offset2);
  }
  return toolNumber;
}

// ============================================================================
// PRISM MANUFACTURING INTELLIGENCE — PHYSICS FUNCTIONS
// Okuma Multus B250IIW: 22 kW, 5000 RPM main, 6000 RPM tool spindle
// Dual spindle, Y-axis +/-80mm, C-axis, BMT65 12-station turret
// ============================================================================

/**
 * PRISM Kienzle cutting force model.
 * Fc = kc1.1 * ap * f^(1-mc)
 */
function prismCalculateCuttingForce(kc11, mc, ap, f) {
  if (ap <= 0 || f <= 0) { return 0; }
  return kc11 * ap * Math.pow(f, 1 - mc);
}

/**
 * PRISM CSS optimization - calculate optimal G50 clamp speed.
 * n_max = 1000 * Vc_max / (pi * D_min)
 */
function prismCalculateG50Clamp(vc, dMin, machineMax) {
  if (dMin <= 0) { return machineMax; }
  var nCalc = Math.round((1000 * vc) / (Math.PI * dMin));
  return Math.min(nCalc, machineMax);
}

/**
 * PRISM Taylor tool life estimation.
 * T = C / (Vc^n * f^a * ap^b)
 */
function prismEstimateToolLife(C, vc, n, f, a, ap, b) {
  if (vc <= 0 || f <= 0 || ap <= 0) { return 0; }
  return C / (Math.pow(vc, n) * Math.pow(f, a) * Math.pow(ap, b));
}

/**
 * PRISM spindle power check against Multus B250IIW 22 kW rating.
 */
function prismCheckSpindlePower(Fc, vc, availablePower) {
  var requiredPower = (Fc * vc) / (60 * 1000);
  var utilization = (requiredPower / availablePower) * 100;
  return {
    required_kW    : requiredPower,
    available_kW   : availablePower,
    utilization_pct: utilization,
    safe           : utilization <= 80
  };
}

/**
 * PRISM optimization header output for each section.
 */
function prismWriteOptimizationHeader() {
  if (!getProperty("prismPhysicsEnabled")) { return; }
  var tool = currentSection.getTool();
  writeComment("PRISM OPTIMIZATION - Mode: " + getProperty("prismOptimizationMode").toUpperCase());
  if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
    if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
      var vc = tool.surfaceSpeed * ((unit == MM) ? 1 / 1000.0 : 1 / 12.0);
      writeComment("  CSS Vc=" + vc.toFixed(0) + " m/min  G50-clamp=" +
        prismCalculateG50Clamp(vc, 10, getProperty("maximumSpindleSpeed")) + " RPM");
    }
    if (getProperty("prismToolLifeTracking") && hasParameter("operation:tool_feedCuttingRel")) {
      var f = getParameter("operation:tool_feedCuttingRel", 0.2);
      var ap = hasParameter("operation:tool_backEngagement") ? getParameter("operation:tool_backEngagement") : 1.0;
      var Tlife = prismEstimateToolLife(200, 250, 0.25, f, 0.15, ap, 0.10);
      writeComment("  Tool life est. (ISO P @ Vc=250): " + Tlife.toFixed(0) + " min");
    }
  } else {
    writeComment("  Mill-turn mode  B250IIW: 22kW / 5000 RPM main / 6000 RPM tool");
  }
}

// ============================================================================

function onOpen() {
  if (getProperty("useRadius")) {
    maximumCircularSweep = toRad(90); // avoid potential center calculation errors for CNC
  }
  xAxisMinimum = getProperty("xAxisMinimum");

  // Copy certain properties into global variables
  showSequenceNumbers = getProperty("showSequenceNumbers");

  // Setup default M-codes
  // mInterferModal.format(getCode("INTERFERENCE_CHECK_ON", SPINDLE_MAIN));

  // define machine
  defineMachine();

  activeTurret = activateMachine(getSection(0));

  yOutput.disable();
  gPolarModal.format(getCode("DISABLE_Y_AXIS", true));
  rapidIgnoreLoadModal.format(215);

  if (highFeedrate <= 0) {
    error(localize("You must set 'highFeedrate' because axes are not synchronized for rapid traversal."));
    return;
  }

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }

  sequenceNumber = getProperty("sequenceNumberStart");
  multiEdge = getProperty("useMultiEdgeSpecification");

  // Select the active spindle
  if (gotSecondarySpindle) {
    writeBlock(gSelectSpindleModal.format(getCode("SELECT_SPINDLE", getSection(0).spindle))); // cannot use getSpindle since there is not an active section
  }

  if (programName) {
    var programId;
    programId = programName;
    if (programComment) {
      writeComment(programId + " " + programComment);
    } else {
      writeComment(programId);
    }
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  if (programComment) {
    writeln(formatComment(programComment));
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
  var mDescription = machineConfiguration.getDescription();

  if (getProperty("writeMachine") && (vendor || model || mDescription)) {
    writeComment(localize("Machine"));
    if (vendor) {
      writeComment("  " + localize("vendor") + ": " + vendor);
    }
    if (model) {
      writeComment("  " + localize("model") + ": " + model);
    }
    if (mDescription) {
      writeComment("  " + localize("description") + ": "  + mDescription);
    }
  }

  // dump tool information
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
        var comment = formatTool(tool, false) + " " +
          (tool.diameter != 0 ? "D=" + spatialFormat.format(tool.diameter) + " " : "") +
          (tool.isTurningTool() ? localize("NR") + "=" + spatialFormat.format(tool.noseRadius) : localize("CR") + "=" + spatialFormat.format(tool.cornerRadius)) +
          (tool.taperAngle > 0 && (tool.taperAngle < Math.PI) ? " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg") : "") +
          (zRanges[tool.number] ? " - " + localize("ZMIN") + "=" + spatialFormat.format(zRanges[tool.number].getMinimum()) : "") +
          " - " + localize(getToolTypeName(tool.type));
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

  writeBlock("CLEAR");
  writeBlock("DRAW");

  writeBlock(gAbsIncModal.format(90));
  writeBlock(gCycleModal.format(180));
  if (getProperty("useM960")) {
    writeBlock(mFormat.format(960));
  }

  onCommand(COMMAND_CLOSE_DOOR);

  if (getProperty("gotChipConveyor")) {
    onCommand(COMMAND_START_CHIP_TRANSPORT);
  }

  // automatically eject part at end of program
  if (getProperty("autoEject")) {
    ejectRoutine = true;
  }
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

function forceThread() {
  gCycleModal.reset();
  forceXYZ();
  feedOutput.reset();
}

function forceUnlockMultiAxis() {
  cAxisBrakeModal.reset();
}

function FeedContext(id, description, feed) {
  this.id = id;
  this.description = description;
  this.feed = feed;
}

function formatFeedMode(mode) {
  var fMode = (mode == FEED_PER_REVOLUTION) ? getCode("FEED_MODE_UNIT_REV") : getCode("FEED_MODE_UNIT_MIN");
  if (fMode) {
    feedOutput.setFormat(mode == FEED_PER_REVOLUTION ? fprFormat : fpmFormat);
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
        return "F=V" + (firstFeedParameter + feedContext.id);
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
    writeBlock("V" + (firstFeedParameter + feedContext.id) + "=" + feedFormat.format(feedContext.feed), formatComment(feedContext.description));
  }
}

var currentWorkPlaneABC = undefined;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function cancelWorkPlane() {
  cancelTransformation();
  if (machineState.tiltedPlaneMode) {
    writeBlock(gSlantModal.format(126));
  }
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
    if (machineState.tiltedPlaneMode) {
      bOutput.reset();
      writeBlock(gSlantModal.format(127), bOutput.format(getB(abc, currentSection)));
    }
    return; // no change
  }

  onCommand(COMMAND_UNLOCK_MULTI_AXIS);

  if (machineState.tiltedPlaneMode) {
    bOutput.reset();
    writeBlock(gSlantModal.format(127), bOutput.format(getB(abc, currentSection)));
  }

  setCAxisDirection(cOutput.getCurrent(), abc.z);
  writeBlock(
    gMotionModal.format(0),
    conditional(machineConfiguration.isMachineCoordinate(0), aOutput.format(abc.x)),
    conditional(machineConfiguration.isMachineCoordinate(1), bOutput.format(abc.y)),
    conditional(machineConfiguration.isMachineCoordinate(2), cOutput.format(abc.z))
  );

  onCommand(COMMAND_LOCK_MULTI_AXIS);

  currentWorkPlaneABC = new Vector(abc.x, abc.y, abc.z);
  setCurrentDirection(abc);
}

function getBestABC(section) {
  // try workplane orientation
  var abc = section.getABCByPreference(machineConfiguration, section.workPlane, getCurrentDirection(), C, PREFER_CLOSEST, ENABLE_ALL);
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

var currentMachineABC;

function getWorkPlaneMachineABC(section, workPlane) {
  var W = workPlane; // map to global frame

  var abc;
  if (machineState.isTurningOperation && gotBAxis) {
    var both = machineConfiguration.getABCByDirectionBoth(workPlane.forward);
    abc = both[0];
    if (both[0].z != 0) {
      abc = both[1];
    }
  } else {
    abc = bestABC ? bestABC :
      section.getABCByPreference(machineConfiguration, W, getCurrentDirection(), C, PREFER_CLOSEST, ENABLE_RESET);
  }
  currentMachineABC = abc;

  var direction = machineConfiguration.getDirection(abc);
  if (!isSameDirection(direction, W.forward)) {
    error(localize("Orientation not supported."));
    return abc;
  }

  if (machineState.isTurningOperation && gotBAxis && !bAxisIsManual) { // remapABC can change the B-axis orientation
    if (abc.z != 0) {
      error(localize("Could not calculate a B-axis turning angle within the range of the machine."));
      return abc;
    }
  }

  if (!machineState.isTurningOperation && !machineState.axialCenterDrilling) {
    var tcp = false;
    if (tcp) { // do not go into if turning
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
  // THIS CODE IS NOT TESTED.
  var toolAngle = hasParameter("operation:tool_angle") ? getParameter("operation:tool_angle") : 0;
  var toolOrientation = section.toolOrientation;
  if (toolAngle && toolOrientation != 0) {
    error(localize("You cannot use tool angle and tool orientation together in operation " + "\"" + (getParameter("operation-comment")) + "\""));
  }

  var angle = toRad(toolAngle) + toolOrientation;

  var axis = new Vector(0, 1, 0);
  var mappedAngle = (currentSection.spindle == SPINDLE_PRIMARY ? (Math.PI / 2 - angle) : (Math.PI / 2 - angle));
  var mappedWorkplane = new Matrix(axis, mappedAngle);
  var abc = getWorkPlaneMachineABC(section, mappedWorkplane);

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

var bAxisOrientationTurning = new Vector(0, 0, 0);
function setSpindleOrientation(section, abc) {
  var R; // cutting quadrant
  var spindleMain = getSpindle(PART) == SPINDLE_MAIN;
  if (tool.isTurningTool()) {
    cancelTransformation();
    var leftHandtool;
    if (hasParameter("operation:tool_hand")) {
      if (getParameter("operation:tool_hand") == "L") { // TAG: add neutral tool to Left hand case
        if (getParameter("operation:tool_holderType") == 0) {
          leftHandtool = false;
        } else {
          leftHandtool = true;
        }
      } else {
        leftHandtool = false;
      }
    }

    if ((abcFormat.format(bAxisOrientationTurning.y) % 45) != 0) {
      error(localize("Turning operations must be B0. or B45. or B90. for operation " + "\"" + (getParameter("operation-comment").toUpperCase()) + "\""));
    }

    if (hasParameter("operation:turningMode") && (getParameter("operation:turningMode") == "front")) { // facing logic output - legacy operation
      if (abcFormat.format(bAxisOrientationTurning.y) == 0) {
        if (leftHandtool) {
          R = spindleMain ? 2 : multiEdge ? 8 : 7;
        } else {
          R = spindleMain ? 1 : multiEdge ? 7 : 8;
        }
      } else if (abcFormat.format(bAxisOrientationTurning.y) == 45) {
        R = spindleMain ? 3 : multiEdge ? 9 : 10;
      } else { // B90.
        R = spindleMain ? 5 : multiEdge ? 11 : 12;
      }
    } else if (hasParameter("operation:machineInside")) { // turning profile operation
      if (getParameter("operation:machineInside") == 0) {
        if (abcFormat.format(bAxisOrientationTurning.y) == 0) { // OD tool
          R = spindleMain ? 2 : multiEdge ? 8 : 7;
        } else if (abcFormat.format(bAxisOrientationTurning.y) == 45) {
          if (leftHandtool) {
            R = spindleMain ? 4 : multiEdge ? 10 : 9;
          } else {
            R = spindleMain ? 3 : multiEdge ? 9 : 10;
          }
        } else { // B90.
          if (leftHandtool) {
            R = spindleMain ? 6 : multiEdge ? 12 : 11;
          } else {
            R = spindleMain ? 5 : multiEdge ? 11 : 12;
          }
        }
      } else { // ID Tool
        R = spindleMain ? 1 : multiEdge ? 7 : 8;
      }
    } else if (getParameter("operation-strategy", "") == "turningFace") { // facing operation
      if (abcFormat.format(bAxisOrientationTurning.y) == 0) {
        if (leftHandtool) {
          R = spindleMain ? 2 : multiEdge ? 8 : 7;
        } else {
          R = spindleMain ? 1 : multiEdge ? 7 : 8;
        }
      } else if (abcFormat.format(bAxisOrientationTurning.y) == 45) {
        R = spindleMain ? 3 : multiEdge ? 9 : 10;
      } else { // B90.
        R = spindleMain ? 5 : multiEdge ? 11 : 12;
      }
    } else if (getParameter("operation-strategy", "") == "turningPart") { // parting (cut off) operation
      R = spindleMain ? 5 : multiEdge ? 11 : 12;
    } else {
      error(localize("Failed to identify Tool Position value for TD Line for Operation " + "\"" + (getParameter("operation-comment").toUpperCase()) + "\""));
    }
  } else {
    if (abcFormat.format(abc.y) == 45) {
      R = spindleMain ? 3 : multiEdge ? 9 : 10;
    } else if (abcFormat.format(abc.y) == 90) {
      R = spindleMain ? 5 : multiEdge ? 11 : 12;
    } else {
      R = spindleMain ? 1 : multiEdge ? 7 : 8;
    }
    if (section.isMultiAxis()) { // multi-axis must start at B0
      // G254 can not use other codes
      R = spindleMain ? 1 : multiEdge ? 7 : 8;
    }
  }
  return R;
}

function isPerpto(a, b) {
  return Math.abs(Vector.dot(a, b)) < (1e-7);
}

function onSectionSpecialCycle() {
  if (!isFirstSection()) {
    activateMachine(currentSection);
  }
}

function onSection() {
  // Detect machine configuration
  var currentTurret = isFirstSection() ? activeTurret : activateMachine(currentSection);

  // Define Machining modes

  machineState.tiltedPlaneMode = ((gotBAxis && (activeTurret != 2)) && !bAxisIsManual);

  tapping = isTappingCycle();
  threading = hasParameter("operation:strategy") && (getParameter("operation:strategy") == "turningThread");

  var forceSectionRestart = optionalSection && !currentSection.isOptional();
  optionalSection = currentSection.isOptional();
  bestABC = undefined;

  machineState.isTurningOperation = (currentSection.getType() == TYPE_TURNING);
  if (machineState.isTurningOperation && gotBAxis) {
    bAxisOrientationTurning = getBAxisOrientationTurning(currentSection);
  }

  var insertToolCall = isToolChangeNeeded("number", "compensationOffset", "diameterOffset", "lengthOffset") || forceSectionRestart || (currentSection.spindle != getPreviousSection().spindle);

  var newWorkOffset = isNewWorkOffset() || forceSectionRestart;
  var newWorkPlane = isNewWorkPlane() || forceSectionRestart ||
    (machineState.isTurningOperation &&
      abcFormat.areDifferent(bAxisOrientationTurning.x, machineState.currentBAxisOrientationTurning.x) ||
      abcFormat.areDifferent(bAxisOrientationTurning.y, machineState.currentBAxisOrientationTurning.y) ||
      abcFormat.areDifferent(bAxisOrientationTurning.z, machineState.currentBAxisOrientationTurning.z));

  retracted = false; // specifies that the tool has been retracted to the safe plane

  partCutoff = getParameter("operation-strategy", "") == "turningPart";

  var yAxisWasEnabled = !machineState.usePolarCoordinates && !machineState.usePolarInterpolation && machineState.liveToolIsActive;
  updateMachiningMode(currentSection); // sets the needed machining mode to machineState (usePolarInterpolation, usePolarCoordinates, axialCenterDrilling)

  if (insertToolCall || newWorkPlane) {
    cancelWorkPlane();
  }

  // Get the active spindle
  var newSpindle = true;
  var tempSpindle = getSpindle(TOOL);
  if (isFirstSection()) {
    previousSpindle = tempSpindle;
  }
  newSpindle = tempSpindle != previousSpindle;

  // calculate rotary angles
  var abc = new Vector(0, 0, 0);
  if (machineConfiguration.isMultiAxisConfiguration()) {
    if (machineState.isTurningOperation) {
      if (gotBAxis) {
        cancelTransformation();
        // handle B-axis support for turning operations here
        abc = bAxisOrientationTurning;
      } else {
        abc = getWorkPlaneMachineABC(currentSection, currentSection.workPlane);
      }
    } else {
      if (currentSection.isMultiAxis() || isPolarModeActive()) {
        forceWorkPlane();
        cancelTransformation();
        onCommand(COMMAND_UNLOCK_MULTI_AXIS);
        abc = currentSection.isMultiAxis() ? currentSection.getInitialToolAxisABC() : getCurrentDirection();
      } else {
        abc = getWorkPlaneMachineABC(currentSection, currentSection.workPlane);
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

  var needToolRecall = false;
  var safeRetract = false;
  // End the previous section if a new tool is selected
  if (!isFirstSection() && (insertToolCall || (!currentSection.isMultiAxis() && abcFormat.areDifferent(abc.y, currentMachineABC.y))) &&
      !(machineState.stockTransferIsActive && partCutoff)) {
    if (machineState.stockTransferIsActive) {
      writeBlock(mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_OFF", getSpindle(PART))), formatComment("SYNCHRONIZED ROTATION OFF"));
    } else {
      if (previousSpindle == SPINDLE_LIVE) {
        onCommand(COMMAND_STOP_SPINDLE);
        forceUnlockMultiAxis();
        if (tempSpindle != SPINDLE_LIVE) {
          //writeBlock(gPlaneModal.format(getCode("ENABLE_TURNING", getSpindle(PART))));
          cAxisEngageModal.reset();
          writeBlock(cAxisEngageModal.format(getCode("DISABLE_C_AXIS", getSpindle(PART))));
        } else {
          onCommand(COMMAND_UNLOCK_MULTI_AXIS);
          if (!getProperty("optimizeCAxisSelect")) {
            cAxisEngageModal.reset();
            writeBlock(cAxisEngageModal.format(getCode("DISABLE_C_AXIS", getSpindle(PART))));
          }
        }
      }
      onCommand(COMMAND_COOLANT_OFF);
    }

    gMotionModal.reset();
    goHome(getPreviousSection().isMultiAxis());

    // cancel tool length compensation
    if (!isFirstSection() && insertToolCall && !(currentSection.getType() == TYPE_TURNING)) {
      // writeBlock(formatTool(getPreviousSection().getTool(), true)); // may cause collision
    }

    // cancel load monitoring
    if (!isFirstSection() && insertToolCall && (getProperty("loadMonitoring") != 0)) {
      writeln("VLMON[" + vlmon + "]=0");
      writeln(mFormat.format(215));
    }

    // mInterferModal.reset();
    // writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_OFF", getSpindle(PART))));
    if (insertToolCall) {
      writeBlock(rapidIgnoreLoadModal.format(215));
      gSelectSpindleModal.reset();
    }
    if (getPreviousSection().getTool().breakControl) {
      onCommand(COMMAND_BREAK_CONTROL);
    }
    if (getProperty("optionalStop")) {
      onCommand(COMMAND_OPTIONAL_STOP);
      gMotionModal.reset();
    }
  } else if (currentWorkPlaneABC != undefined) {
    if (!currentSection.isMultiAxis() && abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y)) {
      safeRetract = true;
    }
  } else if (currentSection.isMultiAxis()) {
    safeRetract = true;
  }
  if (safeRetract && !isFirstSection()) {
    writeln("");
    writeComment("SAFE RETRACT");
    onCommand(COMMAND_COOLANT_OFF);
    writeRetract(X);
    if (currentSection.isMultiAxis() && !bAxisIsManual) {
      needToolRecall = true;
    }
  }

  // Consider part cutoff as stockTransfer operation
  if (!(machineState.stockTransferIsActive && partCutoff)) {
    machineState.stockTransferIsActive = false;
  }

  // Process Pass Through commands
  executeManualNC();

  // Output the operation description
  writeln("");
  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      if (insertToolCall && getProperty("showSequenceNumbers") == "toolChange") {
        writeCommentSeqno(comment);
      } else {
        writeComment(comment);
      }
    }
  }

  // PRISM: Output physics optimization header
  prismWriteOptimizationHeader();

  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
    if (getProperty("useM216")) {
      writeBlock(rapidIgnoreLoadModal.format(216));
    }
  }
  if (currentSection.workOffset != currentWorkOffset) {
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  // Select the active spindle
  if (gotSecondarySpindle) {
    writeBlock(gSelectSpindleModal.format(getCode("SELECT_SPINDLE", getSpindle(PART))));
  }

  // Position all axes at home
  if (insertToolCall && !machineState.stockTransferIsActive) {
    goHome(false); // Do not output B at beginning of tool
    // Stop the spindle
    if (newSpindle) {
      onCommand(COMMAND_STOP_SPINDLE);
    }
  }
  var wcsOut = "";

  // Get active feedrate mode
  if (insertToolCall) {
    forceModals();
  }
  forceFeed();
  var feedMode = formatFeedMode(tapping || threading ? FEED_PER_REVOLUTION : currentSection.feedMode);
  var plane = 18;
  // Live Spindle is active
  if (tempSpindle == SPINDLE_LIVE) {
    if (insertToolCall || wcsOut || feedMode) {
      //forceUnlockMultiAxis();
      //onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      switch (getMachiningDirection(currentSection)) {
      case MACHINING_DIRECTION_AXIAL:
        plane = getG17Code();
        break;
      case MACHINING_DIRECTION_RADIAL:
        if (machineState.tiltedPlaneMode) {
          plane = getG17Code();
        } else {
          plane = 19;
        }
        break;
      case MACHINING_DIRECTION_INDEXING:
        plane = getG17Code();
        break;
      default:
        error(subst(localize("Unsupported machining direction for operation " + "\"" + "%1" + "\"" + "."), getOperationComment()));
        return;
      }
      gPlaneModal.reset();
      if (!getProperty("optimizeCAxisSelect")) {
        cAxisEngageModal.reset();
      }
      writeBlock(cAxisEngageModal.format(getCode("ENABLE_C_AXIS", getSpindle(PART))));
      if (!machineState.usePolarInterpolation && !machineState.usePolarCoordinates && !currentSection.isMultiAxis()) {
        //onCommand(COMMAND_LOCK_MULTI_AXIS);
      }
    }

  // Turning is active
  } else {
    if ((insertToolCall || wcsOut || feedMode) && !machineState.stockTransferIsActive) {
      // forceUnlockMultiAxis();
      // writeBlock(cAxisEngageModal.format(getCode("UNLOCK_MULTI_AXIS", getSpindle(PART))));
      gPlaneModal.reset();
      if (!getProperty("optimizeCAxisSelect")) {
        cAxisEngageModal.reset();
      }
      // writeBlock(wcsOut, mFormat.format(getSpindle(PART) == SPINDLE_SUB ? 83 : 80));
      //writeBlock(gPlaneModal.format(getCode("ENABLE_TURNING", getSpindle(PART))));
      writeBlock(feedMode, gPlaneModal.format(plane));
    } else {
      writeBlock(feedMode);
    }
  }

  // Write out maximum spindle speed
  var maximumSpindleSpeed = (tool.maximumSpindleSpeed > 0) ? Math.min(tool.maximumSpindleSpeed, getProperty("maximumSpindleSpeed")) : getProperty("maximumSpindleSpeed");
  if ((maximumSpindleSpeed > 0) && (currentSection.getTool().getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) || isFirstSection()) {
    if ((/*insertToolCall || */rpmFormat.areDifferent(maximumSpindleSpeed, previousMaximumSpeed)) && !machineState.stockTransferIsActive) {
      writeBlock(gFormat.format(50), maxSpeedOutput.format(maximumSpindleSpeed));
      sOutput.reset();
      sbOutput.reset();
      previousMaximumSpeed = maximumSpindleSpeed;
    }
  } else {
    //previousMaximumSpeed = 0; // reset for RPM spindle speeds
  }

  // Write out notes
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

  if (insertToolCall || (!currentSection.isMultiAxis() && abcFormat.areDifferent(abc.y, currentMachineABC.y)) || needToolRecall) {
    forceWorkPlane();
    forceABC();
    cAxisEngageModal.reset();
    onCommand(COMMAND_COOLANT_OFF);

    var compensationOffset = tool.isTurningTool() ? tool.compensationOffset : tool.lengthOffset;
    if (compensationOffset > getProperty("maxToolOffset")) {
      error(localize("Compensation offset is out of range."));
      return;
    }
    if (tool.number > getProperty("maxTool")) {
      warning(localize("Tool number exceeds maximum value."));
    }

    if (tool.number == 0) {
      error(localize("Tool number cannot be 0"));
      return;
    }

    gMotionModal.reset();
    if (gotBAxis) {
      if (!gotMultiTurret || activeTurret == 1) {
        // upper turret
        // there is a parameter setting for 4 digit tool numbers that should be supported at some point.
        positionNumber = setSpindleOrientation(currentSection, abc);
        if (tool.isTurningTool()) {
          // add edge number for miniturrets once that is supported.
          writeBlock("TD=" + positionNumberFormat.format(positionNumber) + toolFormat.format(tool.number), mFormat.format(getCode("TOOL_CHANGE")));
          if ((bFormat.getResultingValue(getB(abc, currentSection)) % 45) != 0) { // if tool angle is 0, 45, or 90 degrees
            writeBlock("BA=" + abcFormat.format(getB(abc, currentSection)));
          }
        } else { // milling
          writeBlock("TD=" + positionNumberFormat.format(positionNumber) + toolFormat.format(tool.number), mFormat.format(getCode("TOOL_CHANGE")));
          if (!(currentSection.isMultiAxis() && machineConfiguration.isMultiAxisConfiguration()) && abcFormat.areDifferent(getB(abc, currentSection), 0)) {
            writeBlock("BA=" + abcFormat.format(getB(abc, currentSection)), gFormat.format(52));
            bOutput.format(getB(abc, currentSection));// For modality
          } else if (!insertToolCall && !currentSection.isMultiAxis && abcFormat.areDifferent(getB(abc, currentSection), 0)) {
            writeBlock(gFormat.format(getCode("ENABLE_B_AXIS")));
            writeBlock(mFormat.format(getCode("UNCLAMP_B_AXIS")));
            writeBlock(gMotionModal.format(0), bOutput.format(getB(abc, currentSection)));
          }
        }
        var nextTool = getNextTool(tool.number);
        if (nextTool) {
          var save = optionalSection;
          optionalSection = true;
          writeBlock("MT=" + toolFormat.format(nextTool.number) + positionNumberFormat.format(1));
          optionalSection = save;
        }
      } else {
      // lower turret
        if (currentSection.spindle == SPINDLE_PRIMARY) {
          writeBlock("TD=0101" + toolFormat.format(tool.number), mFormat.format(getCode("TOOL_CHANGE")));
        } else {
          writeBlock("TD=0207" + toolFormat.format(tool.number), mFormat.format(getCode("TOOL_CHANGE")));
        }
      }
    } else {
      writeBlock(formatTool(tool, false));
    }
    if (tool.comment) {
      writeComment(tool.comment);
    }

    // enable load monitoring
    if (getProperty("loadMonitoring") != 0) {
      vlmon = tool.number;
      writeln("VLMON[" + vlmon + "]=" + getProperty("loadMonitoring"));
      writeln(mFormat.format(216));
    }
  }

  // Turn on coolant
  setCoolant(tool.coolant);

  // Activate part catcher for part cutoff section
  if (getProperty("usePartCatcher") && partCutoff && currentSection.partCatcher) {
    engagePartCatcher(true);
  }

  // command stop for manual tool change, useful for quick change live tools
  if (insertToolCall && tool.manualToolChange) {
    onCommand(COMMAND_STOP);
    writeComment("MANUAL TOOL CHANGE TO " + formatTool(tool, false));
  }

  // Engage tailstock
  if (getProperty("useTailStock")) {
    if (machineState.axialCenterDrilling || (getSpindle(PART) == SPINDLE_SUB) ||
       ((getSpindle(TOOL) == SPINDLE_LIVE) && (getMachiningDirection(currentSection) == MACHINING_DIRECTION_AXIAL))) {
      if (currentSection.tailstock) {
        warning(localize("Tail stock is not supported for secondary spindle or Z-axis milling."));
      }
      if (machineState.tailstockIsActive) {
        writeBlock(tailStockModal.format(getCode("TAILSTOCK_OFF", SPINDLE_MAIN)));
      }
    } else {
      writeBlock(tailStockModal.format(currentSection.tailstock ? getCode("TAILSTOCK_ON", SPINDLE_MAIN) : getCode("TAILSTOCK_OFF", SPINDLE_MAIN)));
    }
  }

  // Output spindle codes
  if (newSpindle) {
    // select spindle if required
  }

  var forceRPMMode = false;
  var spindleChanged = tool.type != TOOL_PROBE &&
  (insertToolCall || forceSpindleSpeed || isSpindleSpeedDifferent() || newSpindle);
  if (spindleChanged) {
    forceSpindleSpeed = false;
    if (machineState.isTurningOperation) {
      if (spindleSpeed > maximumSpindleSpeed) {
        warning(subst(localize("Spindle speed exceeds maximum value for operation \"%1\"."), getOperationComment()));
      }
    } else {
      if (spindleSpeed > 5000) {
        warning(subst(localize("Spindle speed exceeds maximum value for operation \"%1\"."), getOperationComment()));
      }
    }

    // Turn spindle on
    forceRPMMode = (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED);
    startSpindle(false, true, getFramePosition(currentSection.getInitialPosition()));
  }

  // Turn off interference checking with secondary spindle
  if (getSpindle(PART) == SPINDLE_SUB) {
    // writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_OFF", getSpindle(PART))));
  }

  // activate Y-axis
  if ((getSpindle(TOOL) == SPINDLE_LIVE) && !machineState.usePolarInterpolation && !machineState.usePolarCoordinates) {
    setYAxisMode(true);
  } else {
    setYAxisMode(false);
  }
  if (insertToolCall || wcsOut || feedMode) {
    writeBlock(feedMode, gPlaneModal.format(plane));
  }
  forceXYZ();
  gMotionModal.reset();

  if (currentSection.isMultiAxis()) {
    if (operationSupportsTCP && !bAxisIsManual) {
      forceWorkPlane();
      writeBlock(gFormat.format(getCode("ENABLE_B_AXIS")));
      writeBlock(mFormat.format(getCode("UNCLAMP_B_AXIS")));
      writeBlock(gMotionModal.format(0), bOutput.format(getB(abc, currentSection)));
      writeBlock(gFormat.format(158)); // Tool length offset in tool axis direction
      cAxisBrakeModal.reset();
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      gMotionModal.reset();

      var machinePosition = machineConfiguration.getOptimizedPosition(getGlobalPosition(currentSection.getInitialPosition()), abc, TCP_XYZ_OPTIMIZED, OPTIMIZE_TABLES, true);
      writeBlock(gMotionModal.format(0), cOutput.format(abc.z));
      writeBlock(gFormat.format(90), yOutput.format(0), zOutput.format(machinePosition.z), cOutput.format(abc.z));

      writeBlock(xOutput.format(machinePosition.x));

      forceAny();
      positionNumber = getSpindle(PART) == SPINDLE_MAIN ? 1 : multiEdge ? 7 : 8;
      writeBlock(gFormat.format(160)); // Cancel G158
      writeBlock("/" + gFormat.format(99)); //Collision avoidance off/Overrides M code - used in set up
      writeBlock(mFormat.format(getCode("COLLISION_AVOIDANCE_ON", true)));
      gPolarModal.reset(); // A code is resetting Y axis
      yAxisIsEnabled = false;
      setYAxisMode(true);
      writeBlock(
        gFormat.format(getCode("TCP_CONTROL_ON")),
        xOutput.format(currentSection.getInitialPosition().x),
        yOutput.format(currentSection.getInitialPosition().y),
        zOutput.format(currentSection.getInitialPosition().z),
        bOutput.format(abc.y),
        cOutput.format(abc.z),
        "TDS=" + positionNumber
      );
    } else {
      setCAxisDirection(cOutput.getCurrent(), abc.z);
      writeBlock(gMotionModal.format(0), cOutput.format(abc.z));
      writeBlock(gMotionModal.format(0), zOutput.format(currentSection.getInitialPosition().z));
      //forceAny();
    }
  } else {
    if (!machineState.isTurningOperation && !machineState.axialCenterDrilling && !machineState.usePolarCoordinates && !machineState.usePolarInterpolation) {
      if (gotBAxis) {
        if (machineState.tiltedPlaneMode) {
          if (!currentSection.isMultiAxis() && currentWorkPlaneABC != undefined) {
            if (abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y)) {
              forceUnlockMultiAxis();
              writeBlock("BA=" + abcFormat.format(getB(abc, currentSection)), gFormat.format(52));
              bOutput.format(getB(abc, currentSection));// For modality
            }
          }
          // Output initial position prior to turning on transformations
          var machinePosition = machineConfiguration.getOptimizedPosition(getGlobalPosition(currentSection.getInitialPosition()), abc, TCP_XYZ, OPTIMIZE_TABLES, true);
          writeBlock(gMotionModal.format(0), yOutput.format(machinePosition.y), zOutput.format(machinePosition.z));
          writeBlock(xOutput.format(machinePosition.x));
          forceXYZ();
        }
      }
      if (insertToolCall && abc.y == 0) {
        bOutput.format(0); // B-axis always moves to 0 at tool change
      }
      setWorkPlane(abc);
    }
  }
  // enable Polar coordinates mode
  if (machineState.usePolarCoordinates && (tool.type != TOOL_PROBE)) {
    if (polarCoordinatesDirection == undefined) {
      error(localize("Polar coordinates axis direction to maintain must be defined as a vector - x,y,z."));
      return;
    }
    setPolarCoordinates(true);
  }
  forceXYZ();
  if (abc !== undefined && !machineState.usePolarCoordinates) {
    cOutput.format(abc.z); // make C current - we do not want to output here
  }
  gMotionModal.reset();
  var initialPosition = getFramePosition(currentSection.getInitialPosition());

  if (insertToolCall || retracted || (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED)) {
    gMotionModal.reset();
    if (machineState.usePolarCoordinates) {
      var polarPosition = getPolarPosition(initialPosition.x, initialPosition.y, initialPosition.z);
      setCAxisDirection(cOutput.getCurrent(), polarPosition.second.z);
      writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      writeBlock(
        gMotionModal.format(0),
        xOutput.format(polarPosition.first.x),
        conditional(gotYAxis, yOutput.format(polarPosition.first.y)),
        cOutput.format(polarPosition.second.z)
      );
    } else if (machineState.usePolarInterpolation) {
      setPolarCoordinates(true);
      var polarPosition = getPolarPosition(initialPosition.x, initialPosition.y, initialPosition.z);
      setPolarCoordinates(false);
      writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      writeBlock(
        gMotionModal.format(0),
        xOutput.format(polarPosition.first.x),
        conditional(gotYAxis, yOutput.format(polarPosition.first.y))
      );
    } else {
      if (!currentSection.isMultiAxis()) {
        if (machineState.tiltedPlaneMode && !(machineState.isTurningOperation || machineState.axialCenterDrilling)) {
          writeBlock(
            gMotionModal.format(1),
            xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z),
            getFeed(highFeedrate)
          );
        } else {
          writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
          if (insertToolCall && gotYAxis &&
              (machineState.isTurningOperation || machineState.axialCenterDrilling)) {
            writeBlock(
              gMotionModal.format(0),
              xOutput.format(initialPosition.x),
              yOutput.format(0)
            );
          } else {
            writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
          }
        }
      }
    }
  } else if ((machineState.usePolarCoordinates || machineState.usePolarInterpolation) && yAxisWasEnabled) {
    if (gotYAxis && yOutput.isEnabled()) {
      writeBlock(gMotionModal.format(0), yOutput.format(0));
    }
  }

  // enable SFM spindle speed
  if (forceRPMMode) {
    startSpindle(false, false);
  }

  if (machineState.usePolarInterpolation) {
    setPolarInterpolation(true); // enable polar interpolation mode
  }

  if (getProperty("useParametricFeed") && !isDrillingCycle(true)) {
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

  previousSpindle = tempSpindle;
  activeSpindle = tempSpindle;

  if (false) { // DEBUG
    for (var key in machineState) {
      writeComment(key + " : " + machineState[key]);
    }
    writeComment("Tapping = " + tapping);
  }
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
        }
      } else { // milling
        // Use new operation property for polar milling
        if (currentSection.machiningType && (currentSection.machiningType == MACHINING_TYPE_POLAR)) {
          // Choose correct polar mode depending on machine capabilities
          if (gotPolarInterpolation && !forcePolarCoordinates) {
            forcePolarInterpolation = true;
          } else {
            forcePolarCoordinates = true;
          }

          // Update polar coordinates direction according to operation property
          polarCoordinatesDirection = currentSection.polarDirection;
        }
        if (gotPolarInterpolation && forcePolarInterpolation) { // polar mode is requested by user
          machineState.usePolarInterpolation = true;
          bestABC = undefined;
        } else if (forcePolarCoordinates) { // Polar coordinate mode is requested by user
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
      machineState.bAxisOrientationTurning = getBAxisOrientationTurning(section);
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

function setRadiusDiameterMode(mode) {
  if (mode == "diameter") {
    xOutput.setScale(2);
  } else {
    xOutput.setScale(1);
  }
}

function setPolarInterpolation(activate) {
  if (activate) {
    setCAxisDirection(cOutput.getCurrent(), 0);
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    cOutput.enable();
    cOutput.reset();
    writeBlock(gPolarModal.format(getCode("POLAR_INTERPOLATION_ON", getSpindle(PART))), cOutput.format(0)); // command for polar interpolation
    writeBlock(gPlaneModal.format(getG17Code()));
    yOutput.enable(); // required for G12.1
    cOutput.disable();
  } else {
    writeBlock(gPolarModal.format(getCode("POLAR_INTERPOLATION_OFF", getSpindle(PART))));
    if (!gotYAxis) {
      yOutput.disable();
    }
    cOutput.enable();
  }
}

var yAxisIsEnabled = undefined;
function setYAxisMode(activate) {
  if (gotYAxis && activate != yAxisIsEnabled) {
    if (activate) {
      writeBlock(gPolarModal.format(getCode("ENABLE_Y_AXIS", true)));
      yOutput.enable();
      yAxisIsEnabled = true;
      yAxisIsRetracted = false;
    } else {
      if (yAxisIsEnabled && !yAxisIsRetracted) {
        writeRetract(Y);
        yAxisIsRetracted = true;
      }
      writeBlock(gPolarModal.format(getCode("DISABLE_Y_AXIS", true)));
      yOutput.disable();
      yAxisIsEnabled = false;
    }
  }
}

// Position all axes to home position
function goHome(forceBAxis) {
  writeRetract(X);
  switch (getProperty("homeMethodZ")) {
  case "G20":
    writeBlock(gFormat.format(20), getSpindle(PART) == SPINDLE_MAIN ? "HP=1" : "HP=2");
    yAxisIsEnabled = true;
    gPolarModal.reset();
    setYAxisMode(false);
    break;
  case "WCS":
    if (gotYAxis) {
      setYAxisMode(true);
      writeRetract(Y, Z);
      if (gotBAxis && forceBAxis && !bAxisIsManual) {
        writeBlock(gMotionModal.format(0), bOutput.format(0)); // required to move to B0 to turn off B axis
        writeBlock(mFormat.format(getCode("CLAMP_B_AXIS")));
        writeBlock(gFormat.format(getCode("DISABLE_B_AXIS"))); // turn off B axis - B axis required to be at B0
      }
      setYAxisMode(false);
    } else {
      writeRetract(Z);
    }
    break;
  default:
    error(localize("Unsupported method specified for Z-home positioning."));
  }
}

function onDwell(seconds) {
  if (seconds > 9999.99) {
    warning(localize("Dwelling time is out of range."));
  }
  writeBlock(gFormat.format(4), dwellOutput.format(seconds));
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
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
  // don't output starts for threading
  if (threadNumber > 0) {
    return;
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    var useG1 = (((!getProperty("useG0") && ((((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) > 1))) || machineState.usePolarInterpolation) && !isCannedCycle);
    var gCode = useG1 ? (machineState.usePolarInterpolation && (x || y) ? 101 : 1) : 0;
    var f = useG1 ? (getFeed(machineState.usePolarInterpolation ? toPreciseUnit(2540, MM) : getHighfeedrate(_x))) : "";

    writeBlock(gMotionModal.format(gCode), x, y, z, f);
  }
}

function onLinear(_x, _y, _z, feed) {
  if (isSpeedFeedSynchronizationActive()) {
    resetFeed = true;
    var threadPitch = getParameter("operation:threadPitch");
    var threadsPerInch = 1.0 / threadPitch; // per mm for metric
    var startXYZ = getCurrentPosition();
    var deltaX = spatialFormat.getResultingValue(_x - startXYZ.x);
    xOutput.reset();
    zOutput.reset();
    writeBlock(
      gMotionModal.format(34),
      xOutput.format(_x),
      yOutput.format(_y),
      zOutput.format(_z),
      //iOutput.format(deltaX, 0),
      pitchOutput.format(1 / threadsPerInch)
    );
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

  var linearCode = 1;
  if (machineState.usePolarInterpolation && (x || y)) {
    linearCode = 101;
  }
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gMotionModal.format(linearCode), gFormat.format(41), x, y, z, f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gMotionModal.format(linearCode), gFormat.format(42), x, y, z, f);
        break;
      default:
        writeBlock(gMotionModal.format(linearCode), gFormat.format(40), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(linearCode), x, y, z, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(linearCode), f);
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

  setCAxisDirection(cOutput.getCurrent(), _c);

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(_a);
  var b = bOutput.format(_b);
  var c = cOutput.format(_c);
  if (x || y || z || a || b || c) {
    var useG1 = (((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) + (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0) > 1);
    if (useG1) {
      // axes are not synchronized
      writeBlock(gMotionModal.format(1), x, y, z, a, b, c, getFeed(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
      forceFeed();
    }
  }
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  if (!currentSection.isOptimizedForMachine()) {
    error(localize("Multi-axis motion is not supported for Polar coordinate mode."));
    return;
  }
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
    return;
  }

  setCAxisDirection(cOutput.getCurrent(), _c);

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(_a);
  var b = bOutput.format(_b);
  var c = cOutput.format(_c);

  if (x || y || z || a || b || c) {
    writeBlock(gMotionModal.format(1), x, y, z, a, b, c, getFeed(feed));
  }
}

// Start of Polar coordinates
var defaultPolarCoordinatesDirection = new Vector(1, 0, 0); // default direction for polar interpolation
var polarCoordinatesDirection = defaultPolarCoordinatesDirection; // vector to maintain tool at while in polar interpolation
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
    polarCoordinatesDirection = defaultPolarCoordinatesDirection; // reset when deactivated
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
  var directionCode = clockwise ? 2 : 3;
  directionCode += (machineState.usePolarCoordinates || machineState.usePolarInterpolation) ? 100 : 0;

  if (isSpeedFeedSynchronizationActive()) {
    error(localize("Speed-feed synchronization is not supported for circular moves."));
    return;
  }

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();

  if (isFullCircle()) {
    if (getProperty("useRadius") || isHelical() || machineState.usePolarInterpolation) { // radius mode does not support full arcs
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      xOutput.reset();
      yOutput.reset();
      writeBlock(gPlaneModal.format(getG17Code()), gMotionModal.format(directionCode), iOutput.format(cx - start.x), jOutput.format(cy - start.y), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      zOutput.reset();
      xOutput.reset();
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), iOutput.format(cx - start.x), kOutput.format(cz - start.z), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      yOutput.reset();
      zOutput.reset();
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), jOutput.format(cy - start.y), kOutput.format(cz - start.z), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else if (!getProperty("useRadius") && !machineState.usePolarInterpolation) {
    if (isHelical() && ((getCircularSweep() < toRad(30)) || (getHelicalPitch() > 10))) { // avoid G112 issue
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      xOutput.reset();
      yOutput.reset();
      writeBlock(gPlaneModal.format(getG17Code()), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), jOutput.format(cy - start.y), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      zOutput.reset();
      xOutput.reset();
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), kOutput.format(cz - start.z), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      yOutput.reset();
      zOutput.reset();
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y), kOutput.format(cz - start.z), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else { // use radius mode
    if (isHelical() && ((getCircularSweep() < toRad(30)) || (getHelicalPitch() > 10) || machineState.usePolarInterpolation)) {
      linearize(tolerance);
      return;
    }
    var r = getCircularRadius();
    if (toDeg(getCircularSweep()) > (180 + 1e-9)) {
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if ((!xFormat.isSignificant(start.x) || !yFormat.isSignificant(start.y) || !xFormat.isSignificant(x) || !yFormat.isSignificant(y))  && machineState.usePolarInterpolation) {
        linearize(tolerance); // avoid polar interpolation issues
        return;
      }
      xOutput.reset();
      yOutput.reset();
      writeBlock(gPlaneModal.format(getG17Code()), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "L" + rFormat.format(r), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      zOutput.reset();
      xOutput.reset();
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "L" + rFormat.format(r), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      yOutput.reset();
      zOutput.reset();
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "L" + rFormat.format(r), getFeed(feed));
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

var wAxisTorqueUpper = 30;
var wAxisTorqueMiddle = 25;
var wAxisTorqueLower = 5;
function onCycle() {
  if ((typeof isSubSpindleCycle == "function") && isSubSpindleCycle(cycleType)) {
    if (!gotSecondarySpindle) {
      error(localize("Secondary spindle is not available."));
    }

    // Start of stock transfer operation(s)
    if (!machineState.stockTransferIsActive) {
      if (cycleType != "secondary-spindle-return") {
        moveSubSpindle(HOME, 0, 0, false, "SUB SPINDLE RETURN", false);
      }
      goHome(isFirstSection() ? false : getPreviousSection().isMultiAxis());
      onCommand(COMMAND_STOP_SPINDLE);
      onCommand(COMMAND_COOLANT_OFF);
      onCommand(COMMAND_OPTIONAL_STOP);

      writeln("");
      if (hasParameter("operation-comment")) {
        var comment = getParameter("operation-comment");
        if (comment) {
          if (getProperty("showSequenceNumbers") == "toolChange") {
            writeCommentSeqno(comment);
          } else {
            writeComment(comment);
          }
        }
      }

      if (cycle.stopSpindle) {
        writeBlock(gFormat.format(getCode("SELECT_SPINDLE", SPINDLE_MAIN)), formatComment("MAIN SPINDLE"));
        writeBlock(mFormat.format(getCode("ENABLE_C_AXIS", getSpindle(PART))), formatComment("C1 AXIS ON"));
        onCommand(COMMAND_UNLOCK_MULTI_AXIS);
        gMotionModal.reset();
        writeBlock(gMotionModal.format(0), cOutput.format(0));
        onCommand(COMMAND_LOCK_MULTI_AXIS);
        writeBlock(gFormat.format(getCode("SELECT_SPINDLE", SPINDLE_SUB)), formatComment("SUB SPINDLE"));
        writeBlock(mFormat.format(getCode("ENABLE_C_AXIS", getSpindle(PART))), formatComment("C2 AXIS ON"));
        gMotionModal.reset();
        writeBlock(gMotionModal.format(0), cOutput.format(cycle.spindleOrientation), formatComment("SUB ANGLE"));
        cAxisBrakeModal.reset();
        onCommand(COMMAND_LOCK_MULTI_AXIS);
      }
      gFeedModeModal.reset();
    }

    switch (cycleType) {
    case "secondary-spindle-grab":
      if (currentSection.partCatcher) {
        engagePartCatcher(true);
      }
      writeBlock(mFormat.format(getCode("INTERNAL_INTERLOCK_ON", getSecondarySpindle())), formatComment("SUB CHUCK INTERLOCK RELEASE ON"));
      writeBlock(mFormat.format(getCode("INTERNAL_INTERLOCK_ON", getSpindle(PART))), formatComment("MAIN CHUCK INTERLOCK RELEASE ON"));
      clampChuck(getSecondarySpindle(), UNCLAMP);
      onDwell(cycle.dwell);
      gSpindleModeModal.reset();

      if (cycle.stopSpindle) { // no spindle rotation
        lastSpindleSpeed = 0;
      } else { // spindle rotation
        var transferCodes = getSpindleTransferCodes();

        // Write out maximum spindle speed
        if (transferCodes.spindleMode == SPINDLE_CONSTANT_SURFACE_SPEED) {
          var maximumSpindleSpeed = (transferCodes.maximumSpindleSpeed > 0) ? Math.min(transferCodes.maximumSpindleSpeed, getProperty("maximumSpindleSpeed")) : getProperty("maximumSpindleSpeed");
          writeBlock(gFormat.format(50), sOutput.format(maximumSpindleSpeed));
          sOutput.reset();
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
        writeBlock(
          gSpindleModeModal.format(spindleMode),
          sOutput.format(_spindleSpeed),
          mFormat.format(transferCodes.direction)
        );
        writeBlock(mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_SPEED", getSpindle(PART))), formatComment("SYNCHRONIZED ROTATION ON"));
        //writeBlock(mFormat.format(getCode("IGNORE_SPINDLE_ORIENTATION", getSpindle(PART))), formatComment("IGNORE SPINDLE ORIENTATION"));
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

      // writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_OFF", getSpindle(PART))));
      gMotionModal.reset();
      var upperZ = getParameter("stock-upper-z");
      moveSubSpindle(RAPID, cycle.feedPosition, 0, false, "", true);
      if (getProperty("transferUseTorque")) {
        writeBlock(gFormat.format(getCode("TORQUE_LIMIT_ON", getSpindle(PART))), "PW=" + integerFormat.format(wAxisTorqueUpper));
        writeBlock(
          gFormat.format(getCode("TORQUE_SKIP_ON", getSpindle(PART))),
          wOutput.format(cycle.chuckPosition),
          "D" + zFormat.format(cycle.feedPosition - cycle.chuckPosition),
          "L" + zFormat.format(cycle.feedPosition - upperZ),
          getFeed(cycle.feedrate),
          "PW=" + integerFormat.format(wAxisTorqueMiddle)
        );
        writeBlock(gFormat.format(getCode("TORQUE_LIMIT_ON", getSpindle(PART))), "PW=" + integerFormat.format(wAxisTorqueLower));

      } else {
        moveSubSpindle(FEED, cycle.chuckPosition, cycle.feedrate, false, "", true);
        onDwell(cycle.dwell);
      }
      clampChuck(getSecondarySpindle(), CLAMP);
      onDwell(cycle.dwell);
      if (getProperty("transferUseTorque")) {
        writeBlock(gFormat.format(getCode("TORQUE_LIMIT_OFF", getSpindle(PART))));
      }
      chuckMachineFrame = cycle.useMachineFrame;
      chuckSubPosition = cycle.chuckPosition;
      machineState.stockTransferIsActive = true;
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

      // bar pull
      if (pullMethod.pull) {
        clampChuck(getSpindle(PART), UNCLAMP);
        onDwell(cycle.dwell);
        gMotionModal.reset();
        moveSubSpindle(FEED, pullMethod.pullPosition, cycle.feedrate, false, "BAR PULL", true);
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
        wOutput.reset();
        moveSubSpindle(HOME, 0, 0, false, "SUB SPINDLE RETURN", false);
        writeBlock(mFormat.format(getCode("INTERNAL_INTERLOCK_OFF", getSpindle(PART))), formatComment("MAIN CHUCK INTERLOCK RELEASE OFF"));
        writeBlock(mFormat.format(getCode("INTERNAL_INTERLOCK_OFF", getSecondarySpindle())), formatComment("SUB CHUCK INTERLOCK RELEASE OFF"));
      } else {
        clampChuck(getSpindle(PART), CLAMP);
        onDwell(cycle.dwell);
        // mInterferModal.reset();
        // writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_OFF", getSpindle(PART))));
      }
      machineState.stockTransferIsActive = true;
      break;
    }
    return;
  }

  if (cycleType == "stock-transfer") {
    warning(localize("Stock transfer is not supported. Required machine specific customization."));
    return;
  }
}

var saveShowSequenceNumbers;
var isCannedCycle = false;

function onCyclePath() {
  saveShowSequenceNumbers = showSequenceNumbers;
  var verticalPasses;
  if (cycle.profileRoughingCycle == 0) {
    verticalPasses = false;
  } else if (cycle.profileRoughingCycle == 1) {
    verticalPasses = true;
  } else {
    error(localize("Unsupported passes type."));
    return;
  }
  isCannedCycle = true;
  // buffer all paths and stop feeds being output
  feedOutput.disable();
  showSequenceNumbers = "false";
  redirectToBuffer();
  writeBlock("NAT" + getCurrentSectionId() + " " + (verticalPasses ? "G82" : "G81"));
  gMotionModal.reset();
  xOutput.reset();
  zOutput.reset();
}

function onCyclePathEnd() {
  writeBlock(gFormat.format(80));
  showSequenceNumbers = saveShowSequenceNumbers; // reset property to initial state
  feedOutput.enable();
  var cyclePath = String(getRedirectionBuffer()).split(EOL); // get cycle path from buffer
  closeRedirection();
  for (var line in cyclePath) { // remove empty elements
    if (cyclePath[line] == "") {
      cyclePath.splice(line);
    }
  }

  // output cycle data
  switch (cycleType) {
  case "turning-canned-rough":
    feedOutput.reset();
    writeBlock(gFormat.format(85), "NAT" + getCurrentSectionId() +
        " D" + spatialFormat.format(cycle.depthOfCut) +
        " U" + xFormat.format(cycle.xStockToLeave) +
        " W" + spatialFormat.format(cycle.zStockToLeave) +
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
      writeBlock(cyclePath[i]); // output cycle path
    }
    showSequenceNumbers = saveShowSequenceNumbers; // reset property to initial state
    isCannedCycle = false;
  }
}

function getCommonCycle(x, y, z, r) {
  var c = cOutput.getCurrent();
  if (isFirstCyclePoint()) {
    forceXYZ();
    cOutput.reset();
  }
  if (machineState.usePolarCoordinates) {
    var polarPosition = getPolarPosition(x, y, z);
    setCurrentPositionAndDirection(polarPosition);
    cOutput.reset();
    return [xOutput.format(polarPosition.first.x), yOutput.format(polarPosition.first.y),
      zOutput.format(polarPosition.first.z), cOutput.format(polarPosition.second.z),
      conditional(r != 0, (gPlaneModal.getCurrent() == 17 ? "K" : "I") + spatialFormat.format(r))];
  } else {
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z), cOutput.format(c),
      conditional(r != 0, ((gPlaneModal.getCurrent() == 17) || !machineState.liveToolIsActive ? "K" : "I") + spatialFormat.format(r))];
  }
}

function writeCycleClearance(plane, clearance) {
  var currentPosition = getCurrentPosition();
  if (true) {
    onCycleEnd();
    switch (plane) {
    case 17:
      writeBlock(gMotionModal.format(0), zOutput.format(clearance));
      break;
    case 18:
      writeBlock(gMotionModal.format(0), yOutput.format(clearance));
      break;
    case 19:
      writeBlock(gMotionModal.format(0), xOutput.format(clearance));
      break;
    default:
      error(localize("Unsupported drilling orientation."));
      return;
    }
  }
}

var threadNumber = 0;
function onCyclePoint(x, y, z) {

  if (!getProperty("useCycles") || currentSection.isMultiAxis()) {
    expandCyclePoint(x, y, z);
    return;
  }

  var plane = gPlaneModal.getCurrent();
  var localZOutput = zOutput;
  if ((machineState.tiltedPlaneMode && machineState.liveToolIsActive) || machineState.axialCenterDrilling) {
    plane = getG17Code(); // XY plane
    localZOutput = zOutput;
  } else if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1)) ||
      isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, -1))) {
    plane = machineState.liveToolIsActive ? getG17Code() : 18; // XY plane
    localZOutput = zOutput;
  } else if (Vector.dot(currentSection.workPlane.forward, new Vector(0, 0, 1)) < 1e-7) {
    plane = 19; // YZ plane
    localZOutput = xOutput;
  } else {
    expandCyclePoint(x, y, z);
    return;
  }

  if (cycleType != "thread-turning" && machineState.liveToolIsActive) {
    writeBlock(gPlaneModal.format(plane));
  }

  switch (cycleType) {
  case "thread-turning":
    var numberOfThreads = 1;
    if ((hasParameter("operation:doMultipleThreads") && (getParameter("operation:doMultipleThreads") != 0))) {
      numberOfThreads = getParameter("operation:numberOfThreads");
    }
    if (isFirstCyclePoint()) {
      // increment thread number for multiple threads
      threadNumber++;
    }
    var i = cycle.incrementalX;
    if (getProperty("useSimpleThread")) {
      if (isFirstCyclePoint()) {
        forceThread();
      }
      var threadPhaseAngle = (360 / numberOfThreads) * (threadNumber - 1);
      var k = getCyclePoint(0).z - z;
      // threading cycle
      writeBlock(
        gCycleModal.format(33),
        xOutput.format(x - cycle.incrementalX),
        zOutput.format(getCyclePoint(0).z),
        g33IOutput.format(i, 0),
        g33KOutput.format(k, 0),
        g33COutput.format(threadPhaseAngle, 0),
        feedOutput.format(cycle.pitch)
      );

      var repeatPass = hasParameter("operation:nullPass") ? getParameter("operation:nullPass") : 0;
      if (isLastCyclePoint() && repeatPass) {
        forceXYZ();
        writeBlock(
          gCycleModal.format(33),
          xOutput.format(x - cycle.incrementalX),
          zOutput.format(getCyclePoint(0).z),
          g33IOutput.format(i, 0),
          g33KOutput.format(k, 0),
          g33COutput.format(threadPhaseAngle, 0),
          feedOutput.format(cycle.pitch)
        );
      }
    } else {
      if (isLastCyclePoint()) {
        var threadHeight = getParameter("operation:threadDepth");
        var firstDepthOfCut = threadHeight - Math.abs(getCyclePoint(0).x - x);
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

        if (threadNumber == 1) {
          writeBlock(
            gCycleModal.format(71),
            xOutput.format(x),
            zOutput.format(z),
            // "A" + taperFormat.format(Math.atan2(cycle.incrementalX, cycle.incrementalZ * -1)), // taper angle instead of I
            conditional(spatialFormat.isSignificant(cuttingAngle * 2), "B" + spatialFormat.format(cuttingAngle * 2)),
            "D" + xFormat.format(firstDepthOfCut),
            "H" + xFormat.format(threadHeight), // output as diameter
            conditional(spatialFormat.isSignificant(i), "I" + spatialFormat.format(i)),
            conditional(numberOfThreads > 1, "Q" + numberOfThreads),
            pitchOutput.format(cycle.pitch),
            mFormat.format(threadCuttingMode),
            mFormat.format(infeedModeCode)
          );
        }
      }
    }

    // reset thread number to zero if thread operation is finished.
    if (threadNumber == numberOfThreads && isLastCyclePoint()) {
      threadNumber = 0;
    }
    return;
  }

  var rapto = 0;
  if (isFirstCyclePoint()) { // first cycle point
    rapto = cycle.clearance - cycle.retract;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell, 99999999); // in seconds

    switch (cycleType) {
    case "drilling":
      writeCycleClearance(machineState.axialCenterDrilling ? 17 : plane, cycle.clearance);
      localZOutput.reset();
      writeBlock(
        gCycleModal.format(machineState.axialCenterDrilling ? 74 : 181),
        getCommonCycle(x, y, z, rapto),
        conditional(machineState.axialCenterDrilling, "D" + spatialFormat.format(cycle.depth + cycle.retract - cycle.stock)),
        getFeed(cycle.feedrate)
      );
      break;
    case "counter-boring":
      writeCycleClearance(machineState.axialCenterDrilling ? 17 : plane, cycle.clearance);
      localZOutput.reset();
      writeBlock(
        gCycleModal.format(machineState.axialCenterDrilling ? 74 : 182),
        getCommonCycle(x, y, z, rapto),
        conditional(machineState.axialCenterDrilling, "D" + spatialFormat.format(cycle.depth + cycle.retract - cycle.stock)),
        conditional(P > 0, eOutput.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    case "deep-drilling":
      writeCycleClearance(machineState.axialCenterDrilling ? 17 : plane, cycle.clearance);
      localZOutput.reset();
      writeBlock(
        gCycleModal.format(machineState.axialCenterDrilling ? 74 : 183),
        getCommonCycle(x, y, z, rapto),
        "D" + spatialFormat.format(cycle.incrementalDepth),
        "L" + spatialFormat.format(cycle.incrementalDepth),
        conditional(P > 0, eOutput.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    case "chip-breaking":
      writeCycleClearance(machineState.axialCenterDrilling ? 17 : plane, cycle.clearance);
      localZOutput.reset();
      writeBlock(
        gCycleModal.format(machineState.axialCenterDrilling ? 74 : 183),
        getCommonCycle(x, y, z, rapto),
        "D" + spatialFormat.format(cycle.incrementalDepth),
        conditional(cycle.accumulatedDepth > 0, "L" + spatialFormat.format(cycle.accumulatedDepth)),
        conditional(P > 0, eOutput.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    case "tapping":
    case "right-tapping":
    case "left-tapping":
      reverseTap = tool.type == TOOL_TAP_LEFT_HAND;
      if (machineState.axialCenterDrilling) {
        ///Turning Spindle
        if (P != 0) {
          expandCyclePoint(x, y, z);
        } else {
          if (!getProperty("useRigidTapping")) {
            writeCycleClearance(17, cycle.clearance);
            writeBlock(
              gCycleModal.format(reverseTap ? 78 : 77),
              getCommonCycle(x, y, z, 0),
              "K" + spatialFormat.format(rapto),
              getFeed(cycle.feedrate)
            );
          } else {
            writeCycleClearance(17, cycle.clearance);
            writeBlock(
              gCycleModal.format(reverseTap ? 108 : 107),
              getCommonCycle(x, y, z, 0),
              "K" + spatialFormat.format(rapto),
              getFeed(cycle.feedrate)
            );
          }
          onImpliedCommand(COMMAND_STOP_SPINDLE);
          forceSpindleSpeed = true;
          forceCoolant = true;
        }
      } else {
        //Milling Spindle
        if (!getProperty("useRigidTapping")) {
          writeCycleClearance(plane, cycle.clearance);
          localZOutput.reset();
          writeBlock(
            gCycleModal.format(reverseTap ? 298 : 184),
            getCommonCycle(x, y, z, rapto),
            // "D" + spatialFormat.format(cycle.depth + cycle.retract - cycle.stock),
            conditional(P > 0, eOutput.format(P)),
            getFeed(cycle.feedrate)
          );
        } else {
          writeCycleClearance(plane, cycle.clearance);
          localZOutput.reset();
          writeBlock(
            gCycleModal.format(reverseTap ? 179 : 178),
            getCommonCycle(x, y, z, rapto),
            "D0",
            // conditional(P > 0, eOutput.format(P)),
            getFeed(cycle.feedrate)
          );
          onImpliedCommand(COMMAND_STOP_SPINDLE);
          forceSpindleSpeed = true;
          forceCoolant = true;
        }
      }
      break;
    case "tapping-with-chip-breaking":
      if (machineState.axialCenterDrilling) {
        error(localize("Tapping with chip breaking is only supported with live tools."));
      } else {
        writeCycleClearance(plane, cycle.clearance);
        localZOutput.reset();
        reverseTap = tool.type == TOOL_TAP_LEFT_HAND;
        writeBlock(
          gCycleModal.format(reverseTap ? 179 : 178),
          getCommonCycle(x, y, z, rapto),
          "D0",
          "L" + spatialFormat.format(cycle.accumulatedDepth),
          "LD=" + spatialFormat.format(cycle.incrementalDepth),
          "LK=" + spatialFormat.format(cycle.chipBreakDistance),
          // conditional(P > 0, eOutput.format(P)),
          getFeed(cycle.feedrate)
        );
        onImpliedCommand(COMMAND_STOP_SPINDLE);
        forceSpindleSpeed = true;
        forceCoolant = true;
      }
      break;
    case "reaming":
    case "boring":
      writeCycleClearance(machineState.axialCenterDrilling ? 17 : plane, cycle.clearance);
      localZOutput.reset();
      writeBlock(
        gCycleModal.format(machineState.axialCenterDrilling ? 74 : 189),
        getCommonCycle(x, y, z, rapto),
        conditional(machineState.axialCenterDrilling, "D" + spatialFormat.format(cycle.depth + cycle.retract - cycle.stock)),
        conditional(P > 0, eOutput.format(P)),
        getFeed(cycle.feedrate)
      );
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else { // position to subsequent cycle points
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      writeBlock(getCommonCycle(x, y, z, rapto, false));
    }
  }
}

function onCycleEnd() {
  if (!cycleExpanded && !machineState.stockTransferIsActive) {
    if (cycleType != "thread-turning" &&
        cycleType != "turning-canned-rough" &&
        !machineState.axialCenterDrilling) {
      writeBlock(gCycleModal.format(180));
      xOutput.reset();
      zOutput.reset();
    } else {
      gCycleModal.reset();
    }
    gMotionModal.reset();
  }
  skipThreading = true;
}

function onPassThrough(text) {
  var commands = String(text).split(";");
  for (text in commands) {
    writeBlock(commands[text]);
  }
}

function onParameter(name, value) {
  var invalid = false;
  switch (name) {
  case "action":
    if (String(value).toUpperCase() == "PARTEJECT") {
      ejectRoutine = true;
    } else if (String(value).toUpperCase() == "USEPOLARMODE" ||
        String(value).toUpperCase() == "USEPOLARINTERPOLATION") {
      forcePolarInterpolation = true;
      forcePolarCoordinates = false;
    } else if (String(value).toUpperCase() == "USEXZCMODE" ||
        String(value).toUpperCase() == "USEPOLARCOORDINATES") {
      forcePolarCoordinates = true;
      forcePolarInterpolation = false;
    } else {
      invalid = true;
    }
  }
  if (invalid) {
    error(localize("Invalid action parameter: ") + value);
    return;
  }
}

function parseToggle() {
  var stat = undefined;
  for (i = 1; i < arguments.length; i++) {
    if (String(arguments[0]).toUpperCase() == String(arguments[i]).toUpperCase()) {
      if (String(arguments[i]).toUpperCase() == "YES") {
        stat = true;
      } else if (String(arguments[i]).toUpperCase() == "NO") {
        stat = false;
      } else {
        stat = i - 1;
        break;
      }
    }
  }
  return stat;
}

var currentCoolantMode = COOLANT_OFF;
var currentCoolantTurret = 1;
var coolantOff = undefined;
var isOptionalCoolant = false;
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
  if ((sOutput.getCurrent() != Number.POSITIVE_INFINITY) && rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) { // avoid redundant output of spindle speed
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

  gSpindleModeModal.reset();

  if ((getSpindle(PART) == SPINDLE_SUB) && !gotSecondarySpindle) {
    error(localize("Secondary spindle is not available."));
    return;
  }

  if (false /*tappingMode*/) {
    spindleDir = mFormat.format(getCode("RIGID_TAPPING", getSpindle(TOOL)));
  } else {
    spindleDir = mFormat.format(tool.clockwise ? getCode("START_SPINDLE_CW", getSpindle(TOOL)) : getCode("START_SPINDLE_CCW", getSpindle(TOOL)));
  }

  var spindleRange = getSpindleRange(_spindleSpeed);
  var maximumSpindleSpeed = (tool.maximumSpindleSpeed > 0) ? Math.min(tool.maximumSpindleSpeed, getProperty("maximumSpindleSpeed")) : getProperty("maximumSpindleSpeed");
  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    if (getSpindle(TOOL) == SPINDLE_LIVE) {
      error(localize("Constant surface speed not supported with live tool."));
      return;
    }
    _spindleSpeed = tool.surfaceSpeed * ((unit == MM) ? 1 / 1000.0 : 1 / 12.0);
    if (forceRPMMode) { // RPM mode is forced until move to initial position
      if (xFormat.getResultingValue(initialPosition.x) == 0) {
        _spindleSpeed = maximumSpindleSpeed;
      } else {
        _spindleSpeed = Math.min((_spindleSpeed * ((unit == MM) ? 1000.0 : 12.0) / (Math.PI * Math.abs(initialPosition.x * 2))), maximumSpindleSpeed);
      }
      spindleMode = gSpindleModeModal.format(getCode("CONSTANT_SURFACE_SPEED_OFF", getSpindle(TOOL)));
    } else {
      spindleMode = gSpindleModeModal.format(getCode("CONSTANT_SURFACE_SPEED_ON", getSpindle(TOOL)));
    }
    spindleRange = getSpindleRange(maximumSpindleSpeed);
  } else {
    spindleMode = getSpindle(TOOL) == SPINDLE_LIVE ? "" : gSpindleModeModal.format(getCode("CONSTANT_SURFACE_SPEED_OFF", getSpindle(TOOL)));
  }

  var scode = getSpindle(TOOL) == SPINDLE_LIVE ? sbOutput.format(_spindleSpeed) : sOutput.format(_spindleSpeed);
  writeBlock(spindleMode, scode, spindleDir, spindleRange);

  // wait for spindle here if required
  if (getProperty("useSSV")) {
    if (machineState.isTurningOperation && hasParameter("operation-strategy") && getParameter("operation-strategy") != "turningThread") {
      writeBlock(ssvModal.format(695));
    }
  }
  lastSpindleMode = tool.getSpindleMode();
  lastSpindleSpeed = _spindleSpeed;
  lastSpindleDirection = tool.clockwise;
}

/** Positions the sub spindle */
function moveSubSpindle(_method, _position, _feed, _useMachineFrame, _comment, _error) {
  if (!gotSecondarySpindle) {
    return;
  }
  if (_useMachineFrame) {
    error(localize("Machine frame not supported on Okuma."));
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
      gMotionModal.reset();
      writeBlock(
        gMotionModal.format(0),
        wOutput.format(getProperty("homePositionW")),
        conditional(_comment, formatComment(_comment))
      );
    }
    break;
  case RAPID:
    writeBlock(
      gMotionModal.format(0),
      wOutput.format(_position),
      conditional(_comment, formatComment(_comment))
    );
    break;
  case FEED:
    writeBlock(
      gMotionModal.format(1),
      wOutput.format(_position),
      getFeed(_feed),
      conditional(_comment, formatComment(_comment))
    );
    break;
  case TORQUE:
    writeBlock(
      gFormat.format(31),
      "P" + integerFormat.format(99),
      wOutput.format(_position),
      getFeed(_feed),
      conditional(_comment, formatComment(_comment))
    );
    break;
  }
}

function getSpindleRange(_spindleSpeed) {
  var speed = rpmFormat.getResultingValue(_spindleSpeed);
  if (machineState.isTurningOperation || machineState.axialCenterDrilling || machineState.isTurningOperation && gotBAxis) {
    if (getProperty("spindleRangeLow") == 0) {
      return "";
    }
    if (speed <= getProperty("spindleRangeLow")) {
      return mFormat.format(41);
    } else {
      return mFormat.format(42);
    }
  } else {
    if (getProperty("liveSpindleRangeLow") == 0) {
      return "";
    }
    if (speed <= getProperty("liveSpindleRangeLow")) {
      return mFormat.format(241);
    } else {
      return mFormat.format(242);
    }
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
    setCoolant(COOLANT_OFF);
    break;
  case COMMAND_COOLANT_ON:
    setCoolant(COOLANT_FLOOD);
    break;
  case COMMAND_LOCK_MULTI_AXIS:
    writeBlock(cAxisBrakeModal.format(getCode("LOCK_MULTI_AXIS", getSpindle(PART))));
    break;
  case COMMAND_UNLOCK_MULTI_AXIS:
    writeBlock(cAxisBrakeModal.format(getCode("UNLOCK_MULTI_AXIS", getSpindle(PART))));
    break;
  case COMMAND_START_CHIP_TRANSPORT:
    writeBlock(mFormat.format(getCode("START_CHIP_TRANSPORT")));
    break;
  case COMMAND_STOP_CHIP_TRANSPORT:
    writeBlock(mFormat.format(getCode("STOP_CHIP_TRANSPORT")));
    break;
  case COMMAND_OPEN_DOOR:
    if (gotDoorControl) {
      writeBlock(mFormat.format(getCode("OPEN_DOOR"))); // optional
    }
    break;
  case COMMAND_CLOSE_DOOR:
    if (gotDoorControl) {
      writeBlock(mFormat.format(getCode("CLOSE_DOOR"))); // optional
    }
    break;
  case COMMAND_BREAK_CONTROL:
    writeBlock(mFormat.format(360), formatComment("BREAK CONTROL"));
    break;
  case COMMAND_TOOL_MEASURE:
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
  case COMMAND_STOP_SPINDLE:
    writeBlock(mFormat.format(getCode("STOP_SPINDLE", activeSpindle)));
    sOutput.reset();
    sbOutput.reset();
    break;
  case COMMAND_ORIENTATE_SPINDLE:
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      writeBlock(mFormat.format(getCode("ORIENT_SPINDLE", getSpindle(PART))));
    } else {
      error(localize("Spindle orientation is not supported for live tooling."));
      return;
    }
    break;
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_SPINDLE_CLOCKWISE:
    writeBlock(mFormat.format(getCode("START_SPINDLE_CW", getSpindle(TOOL))));
    break;
  case COMMAND_SPINDLE_COUNTERCLOCKWISE:
    writeBlock(mFormat.format(getCode("START_SPINDLE_CCW", getSpindle(TOOL))));
    break;
  // case COMMAND_CLAMP: // add support for clamping
  // case COMMAND_UNCLAMP: // add support for clamping
  default:
    onUnsupportedCommand(command);
  }
}

/**
 Buffer Manual NC commands for processing later
*/
var bufferPassThrough = false; // enable to output the Pass Through commands until after ending the previous section
var manualNC = [];
function onManualNC(command, value) {
  if (command == COMMAND_PASS_THROUGH && bufferPassThrough) {
    manualNC.push({command:command, value:value});
  } else {
    expandManualNC(command, value);
  }
}

/**
 Processes the Manual NC commands
 Pass the desired command to process or leave argument list blank to process all buffered commands
*/
function executeManualNC(command) {
  for (var i = 0; i < manualNC.length; ++i) {
    if (!command || (command == manualNC[i].command)) {
      expandManualNC(manualNC[i].command, manualNC[i].value);
    }
  }
  for (var i = manualNC.length - 1; i >= 0; --i) {
    if (!command || (command == manualNC[i].command)) {
      manualNC.splice(i, 1);
    }
  }
}

/** Get synchronization/transfer code based on part cutoff spindle direction. */
function getSpindleTransferCodes() {
  var tool = currentSection.getTool();
  var transferCodes = {
    direction          : tool.clockwise ? getCode("START_SPINDLE_CW", getSpindle(PART)) : getCode("START_SPINDLE_CCW", getSpindle(PART)),
    spindleMode        : SPINDLE_CONSTANT_SPINDLE_SPEED,
    surfaceSpeed       : tool.surfaceSpeed,
    maximumSpindleSpeed: tool.maximumSpindleSpeed
  };
  var numberOfSections = getNumberOfSections();
  for (var i = getNextSection().getId(); i < numberOfSections; ++i) {
    var section = getSection(i);
    if (section.hasParameter("operation-strategy")) {
      if (section.getParameter("operation-strategy") == "turningPart") {
        var tool = section.getTool();
        transferCodes.direction = tool.clockwise ? getCode("START_SPINDLE_CW", getSpindle(PART)) : getCode("START_SPINDLE_CCW", getSpindle(PART));
        transferCodes.spindleMode = tool.getSpindleMode();
        transferCodes.surfaceSpeed = tool.surfaceSpeed;
        transferCodes.maximumSpindleSpeed = tool.maximumSpindleSpeed;
        break;
      } else if (section.getParameter("operation-strategy") == "turningSecondarySpindleReturn" || section.getParameter("operation-strategy") == "turningSecondarySpindlePull") {
        break;
      }
    } else {
      break;
    }
  }
  return transferCodes;
}

function getG17Code() {
  return machineState.usePolarInterpolation ? 17 : 17;
}

function ejectPart() {
  writeln("");
  if (getProperty("showSequenceNumbers") == "toolChange") {
    writeCommentSeqno(localize("PART EJECT"));
  } else {
    writeComment(localize("PART EJECT"));
  }
  gMotionModal.reset();
  // writeBlock(gMotionModal.format(0), gFormat.format(28), gFormat.format(53), "B" + abcFormat.format(0)); // retract bar feeder
  writeRetract(X); // Position all axes to home position
  writeRetract(Z);
  writeBlock(mFormat.format(getCode("UNLOCK_MULTI_AXIS", getSpindle(PART))));
  if (!getProperty("optimizeCAxisSelect")) {
    cAxisEngageModal.reset();
  }
  writeBlock(
    formatFeedMode(FEED_PER_MINUTE),
    // gFormat.format(53 + currentWorkOffset),
    // gPlaneModal.format(getG17Code()),
    cAxisEngageModal.format(getCode("DISABLE_C_AXIS", getSpindle(PART)))
  );
  // setCoolant(COOLANT_THROUGH_TOOL);
  gSpindleModeModal.reset();
  writeBlock(
    gSpindleModeModal.format(getCode("CONSTANT_SURFACE_SPEED_OFF", getSpindle(PART))),
    sOutput.format(50),
    mFormat.format(getCode("START_SPINDLE_CW", getSpindle(PART)))
  );
  // writeBlock(mFormat.format(getCode("INTERLOCK_BYPASS", getSpindle(PART))));
  if (getProperty("usePartCatcher")) {
    writeBlock(mFormat.format(getCode("PART_CATCHER_ON", getSpindle(PART))));
  }
  writeBlock(mFormat.format(getCode("UNCLAMP_CHUCK", getSpindle(PART))));
  onDwell(1.5);
  // writeBlock(mFormat.format(getCode("CYCLE_PART_EJECTOR")));
  // onDwell(0.5);
  if (getProperty("usePartCatcher")) {
    writeBlock(mFormat.format(getCode("PART_CATCHER_OFF", getSpindle(PART))));
    onDwell(1.1);
  }

  // clean out chips
  if (airCleanChuck) {
    writeBlock(mFormat.format(getCode("AIR_BLAST_ON", getSpindle(PART))));
    onDwell(2.5);
    writeBlock(mFormat.format(getCode("AIR_BLAST_OFF", getSpindle(PART))));
  }

  writeBlock(mFormat.format(getCode("STOP_SPINDLE", getSpindle(PART))));
  // setCoolant(COOLANT_OFF);
  writeComment(localize("END OF PART EJECT"));
  writeln("");
}

function engagePartCatcher(engage) {
  if (getProperty("usePartCatcher")) {
    if (engage) { // engage part catcher
      writeBlock(mFormat.format(getCode("PART_CATCHER_ON", true)), formatComment(localize("PART CATCHER ON")));
    } else { // disengage part catcher
      onCommand(COMMAND_COOLANT_OFF);
      writeBlock(mFormat.format(getCode("PART_CATCHER_OFF", true)), formatComment(localize("PART CATCHER OFF")));
    }
  }
}

function onSectionEnd() {
  if (currentSection.isMultiAxis() && operationSupportsTCP) {
    //These variables are current position so machine will not move
    var b = bOutput.getCurrent();
    var c = cOutput.getCurrent();
    //writeBlock(gMotionModal.format(0));
    writeBlock(
      gFormat.format(getCode("TCP_CONTROL_OFF")),
      "X=VSIOX",
      "Y=VSIOY",
      "Z=VSIOZ",
      "B=" + abcFormat.format(b),
      "C=" + abcFormat.format(c),
      getFeed(highFeedrate)
    );
    writeBlock(mFormat.format(getCode("COLLISION_AVOIDANCE_OFF", true)));
  }

  if (getProperty("useSSV")) {
    // ensure SSV is turned off
    writeBlock(ssvModal.format(694));
  }

  if (machineState.usePolarInterpolation) {
    setPolarInterpolation(false); // disable polar interpolation mode
  }

  if (isPolarModeActive()) {
    setPolarCoordinates(false); // disable Polar coordinates mode
  }

  cancelWorkPlane();

  // cancel SFM mode to preserve spindle speed
  if ((currentSection.getTool().getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) && !machineState.stockTransferIsActive) {
    startSpindle(false, true, getFramePosition(currentSection.getFinalPosition()));
  }

  if (getProperty("usePartCatcher") && partCutoff && currentSection.partCatcher) {
    engagePartCatcher(false);
  }
  /*
  // Handled in start of onSection
  if (!isLastSection()) {
    if ((getLiveToolingMode(getNextSection()) < 0) && !currentSection.isPatterned() && (getLiveToolingMode(currentSection) >= 0)) {
      writeBlock(cAxisEngageModal.format(getCode("DISABLE_C_AXIS", getSpindle(PART))));
    }
  }
*/

  if (partCutoff) {
    machineState.spindlesAreAttached = false;
  }

  /*
  // Handled in onSection
  if ((currentSection.getType() == TYPE_MILLING) &&
      (!hasNextSection() || (hasNextSection() && (getNextSection().getType() != TYPE_MILLING)))) {
    // exit milling mode
    if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      // +Z
    } else if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, -1))) {
      // -Z
    } else {
      onCommand(COMMAND_STOP_SPINDLE);
    }
  }
*/

  forcePolarCoordinates = false;
  forcePolarInterpolation = false;
  partCutoff = false;
  forceXYZ();
  skipThreading = false;
}

/** Output block to do safe retract and/or move to home position. */
function writeRetract() {
  if (arguments.length == 0) {
    error(localize("No axis specified for writeRetract()."));
    return;
  }
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
      words.push(xOutput.format(getProperty("homePositionX")));
      retracted = true; // specifies that the tool has been retracted to the safe plane
      break;
    case Y:
      yOutput.reset();
      words.push(yOutput.format(getProperty("homePositionY")));
      yAxisIsRetracted = true;
      break;
    case Z:
      zOutput.reset();
      words.push(zOutput.format(getProperty("homePositionZ")));
      break;
    default:
      error(localize("Bad axis specified for writeRetract()."));
      return;
    }
  }
  if (words.length > 0) {
    writeBlock(gMotionModal.format(0), words); // retract
  }
}

function onClose() {

  var liveTool = getSpindle(TOOL) == SPINDLE_LIVE;
  optionalSection = false;
  if (machineState.stockTransferIsActive) {
    writeBlock(mFormat.format(getCode("SPINDLE_SYNCHRONIZATION_OFF", getSpindle(PART))), formatComment("SYNCHRONIZED ROTATION OFF"));
  } else {
    onCommand(COMMAND_STOP_SPINDLE);
    setCoolant(COOLANT_OFF);
  }

  writeln("");

  if (getProperty("gotChipConveyor")) {
    onCommand(COMMAND_STOP_CHIP_TRANSPORT);
  }
  if (machineState.tailstockIsActive) {
    writeBlock(mFormat.format(getCode("TAILSTOCK_OFF", SPINDLE_MAIN)));
  }

  gMotionModal.reset();
  if (gotSecondarySpindle) {
    // writeBlock(gMotionModal.format(0), gFormat.format(28), gFormat.format(53), "B" + abcFormat.format(0)); // retract Sub Spindle if applicable
  }

  if (!getProperty("optimizeCAxisSelect")) {
    cAxisEngageModal.reset();
  }
  if (liveTool) {
    cAxisEngageModal.reset();
  }
  //writeBlock(gPlaneModal.format(getCode("ENABLE_TURNING"), getSpindle(PART)));

  // cancel load monitoring
  if (getProperty("loadMonitoring") != 0) {
    writeln("VLMON[" + vlmon + "]=0");
    writeln(mFormat.format(215));
  }
  writeBlock(cAxisEngageModal.format(getCode("DISABLE_C_AXIS", getSpindle(PART))));

  // Move to home position
  gMotionModal.reset();
  goHome(getSection(getNumberOfSections() - 1).isMultiAxis());
  writeBlock(rapidIgnoreLoadModal.format(215));
  // Automatically eject part
  if (ejectRoutine) {
    ejectPart();
  }

  // Process Manual NC commands
  executeManualNC();

  writeln("");
  onImpliedCommand(COMMAND_END);
  // writeBlock(mInterferModal.format(getCode("INTERFERENCE_CHECK_ON", getSpindle(PART))));
  onCommand(COMMAND_OPEN_DOOR);

  if (tool.breakControl) {
    onCommand(COMMAND_BREAK_CONTROL);
  }
  writeBlock(mFormat.format(30)); // stop program, spindle stop, coolant off
}

function setProperty(property, value) {
  properties[property].current = value;
}

// <<<<< INCLUDED FROM ../common/okuma mill-turn.cps
properties.maximumSpindleSpeed.value = 5000;
