/**
  Copyright (C) 2012-2024 by Autodesk, Inc.
  All rights reserved.

  HAAS Lathe post processor configuration.

  $Revision: 44114 ab1de3dd91554a6c35a22668d25eeb4899d0c674 $
  $Date: 2024-03-06 00:12:31 $

  FORKID {14D60AD3-4366-49dc-939C-4DB5EA48FF68}
*/

description = "HAAS ST-25LY";

var turret1GotYAxis = true;
var turret1GotBAxis = false; // B-axis always requires customization to match the machine specific functions for doing rotations
var yAxisMinimum = toPreciseUnit(-50.8, MM); // specifies the minimum range for the Y-axis
var yAxisMaximum = toPreciseUnit(50.8, MM); // specifies the maximum range for the Y-axis
var gotMultiTurret = false; // specifies if the machine has several turrets

var gotDoorControl = false;

// >>>>> INCLUDED FROM ../common/haas lathe.cps
///////////////////////////////////////////////////////////////////////////////
//                        MANUAL NC COMMANDS
//
// The following ACTION commands are supported by this post.
//
//     partEject:[yes, no, stopped] - Manually eject the part
//     usePolarInterpolation      - Force Polar interpolation mode for next operation (usePolarMode is deprecated but still supported)
//     usePolarCoordinates        - Force Polar coordinates for the next operation (useXZCMode is deprecated but still supported)
//
///////////////////////////////////////////////////////////////////////////////

if (!description) {
  description = "HAAS Lathe";
}
var modelType = description;
vendor = "Haas Automation";
vendorUrl = "https://www.haascnc.com";
legal = "Copyright (C) 2012-2024 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45909;

if (!longDescription) {
  longDescription = subst("Preconfigured %1 post with support for mill-turn. You can force G112 mode for a specific operation by using Manual NC Action with keyword 'usepolarmode'.", description);
}

extension = "nc";
programNameIsInteger = true;
setCodePage("ascii");
keywords = "MODEL_IMAGE PREVIEW_IMAGE";

capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(120); // reduced sweep due to G112 support
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
allowSpiralMoves = false;
allowFeedPerRevolutionDrilling = true;
highFeedrate = (unit == IN) ? 470 : 12000;

// user-defined properties
properties = {
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
  writeVersion: {
    title      : "Write version",
    description: "Write the version number in the header of the code.",
    group      : "formats",
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
    value: "false",
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
  controllerType: {
    title      : "Controller type",
    description: "Select the type of controller on your machine.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {title:"Next Generation (NGC)", id:"ngc"},
      {title:"Classic (CHC)", id:"chc"}
    ],
    value: "chc",
    scope: ["post", "machine"]
  },
  maximumSpindleSpeed: {
    title      : "Max spindle speed",
    description: "Defines the maximum spindle speed allowed on the main spindle.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999]
  },
  subMaximumSpindleSpeed: {
    title      : "Max spindle speed for subspindle",
    description: "Defines the maximum spindle speed allowed on the subspindle.",
    group      : "configuration",
    type       : "integer",
    range      : [0, 999999999]
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
  autoEject: {
    title      : "Auto eject",
    description: "Specifies whether the part should automatically eject at the end of a program.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"Yes", id:"yes"},
      {title:"No", id:"no"},
      {title:"With spindle stopped", id:"stopped"}
    ],
    value: "no",
    scope: "post"
  },
  homePositionX: {
    title      : "G53 home position X",
    description: "G53 X-axis home position.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  homePositionY: {
    title      : "G53 home position Y",
    description: "G53 Y-axis home position.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
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
    title      : "G53 home position subspindle Z",
    description: "G53 Z-axis home position when Secondary Spindle is active.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  workPositionSub: {
    title      : "G53 subspindle working position",
    description: "G53 working position for Secondary Spindle when active.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  ejectPositionSub: {
    title      : "G53 subspindle eject position",
    description: "G53 eject position for Secondary Spindle.",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  useTailStock: {
    title      : "Use tail stock",
    description: "Enable to use the tail stock.",
    group      : "configuration",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useBarFeeder: {
    title      : "Use bar feeder",
    description: "Enable to use the bar feeder.",
    group      : "configuration",
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
  useG112: {
    title      : "Use G112 polar interpolation",
    description: "If enabled, the G112 feature will be used for polar interpolation. " + EOL +
      "If disabled, the postprocessor will calculate and output Polar/XZC coordinates.",
    group: "preferences",
    type : "boolean",
    value: false,
    scope: "post"
  },
  usePolarCircular: {
    title      : "Use G2/G3 with G112 polar interpolation",
    description: "Enables circular interpolation output while using G112 polar mode.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
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
  useG61: {
    title      : "Use G61 exact stop mode",
    description: "Enables exact stop mode.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  setting102: {
    title      : "Feed rate calculation diameter",
    description: "Defines the part diameter in inches that the control uses to calculate feed rates.",
    group      : "multiAxis",
    type       : "spatial",
    range      : [0.1, 9999],
    value      : 1,
    scope      : "post"
  },
  rapidRewinds: {
    title      : "Use G0 for rewinds",
    description: "Uses G0 moves for rewinding of the C-axis.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useSSV: {
    title      : "Use SSV",
    description: "Outputs M38/M39 to enable SSV for turning operations.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  optimizeCAxisSelect: {
    title      : "Optimize C-axis selection",
    description: "Optimizes the output of enable/disable C-axis codes.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  gotSecondarySpindle: {
    title      : "Got secondary spindle",
    description: "Specifies if the machine has a secondary spindle.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {title:"No", id:"false"},
      {title:"Positioning only", id:"true"},
      {title:"Contouring", id:"contouring"}
    ],
    value: "false",
    scope: "post"
  },
  gotLiveTooling: {
    title      : "Got Live Tooling",
    description: "Specifies if the machine has a milling spindle.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  looping: {
    title       : "Use M97 looping",
    description : "Output program for M97 looping.",
    group       : "looping",
    type        : "boolean",
    presentation: "yesno",
    value       : false,
    scope       : "post"
  },
  numberOfRepeats: {
    title      : "Number of repeats",
    description: "How many times to loop the program.",
    group      : "looping",
    type       : "integer",
    range      : [0, 99999999],
    value      : 1,
    scope      : "post"
  },
  useSimpleThread: {
    title      : "Use simple threading cycle",
    description: "Enable to output G92 simple threading cycle, disable to output G76 standard threading cycle.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  cleanAir: {
    title      : "Air clean chucks",
    description: "Enable to use the air blast to clean out the chuck on part transfers and part ejection.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  safeStartAllOperations: {
    title      : "Safe start all operations",
    description: "Write optional blocks at the beginning of all operations that include all commands to start program.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
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
  useSmoothing: {
    title      : "Use G187",
    description: "Specifies that smoothing using G187 should be used for milling operations.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useM130PartImages: {
    title      : "Include M130 part images",
    description: "Enable to include M130 part images with the NC file. Only valid with the Next Generation control.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useM130ToolImages: {
    title      : "Include M130 tool images",
    description: "Enable to include M130 tool images with the NC file. Only valid with the Next Generation control.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
};

groupDefinitions = {
  looping: {title:"Looping", collapsed:true, order:25}
};

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G", range:[54, 59]},
    {name:"Extended", format:"G154 P", range:[1, 99]}
  ]
};

var singleLineCoolant = false; // specifies to output multiple coolant codes in one line rather than in separate lines
// samples:
// {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
// {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
// {id: COOLANT_THROUGH_TOOL, turret1:{on: [8, 88], off:[9, 89]}, turret2:{on:88, off:89}}
// {id: COOLANT_THROUGH_TOOL, spindle1:{on: [8, 88], off:[9, 89]}, spindle2:{on:88, off:89}}
// {id: COOLANT_THROUGH_TOOL, spindle1t1:{on: [8, 88], off:[9, 89]}, spindle1t2:{on:88, off:89}}
var coolants = [
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST},
  {id:COOLANT_THROUGH_TOOL, on:88, off:89},
  {id:COOLANT_AIR, on:83, off:84},
  {id:COOLANT_AIR_THROUGH_TOOL},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL},
  {id:COOLANT_OFF, off:9}
];

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-";

var gFormat = createFormat({prefix:"G", decimals:0});
var mFormat = createFormat({prefix:"M", decimals:0});
var pFormat = createFormat({prefix:"P", decimals:0});

var spatialFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var xFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL, scale:2}); // diameter mode & IS SCALING POLAR COORDINATES
var yFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var zFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var rFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL}); // radius
var abcFormat = createFormat({decimals:3, type:FORMAT_REAL, scale:DEG});
var cFormat = createFormat({decimals:3, type:FORMAT_REAL, scale:DEG});
var fpmFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var fprFormat = createFormat({type:FORMAT_REAL, decimals:(unit == MM ? 3 : 4), minimum:(unit == MM ? 0.001 : 0.0001)});
var feedFormat = fpmFormat;
var pitchFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, type:FORMAT_REAL}); // seconds - range 0.001-99999.999
var milliFormat = createFormat({decimals:0}); // milliseconds // range 1-9999
var taperFormat = createFormat({decimals:1, scale:DEG});
var integerFormat = createFormat({decimals:0});
var threadQFormat = createFormat({decimals:3, type:FORMAT_LZS});
var g76AFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
var oFormat = createFormat({decimals:0, minDigitsLeft:5});

var xOutput = createOutputVariable({prefix:"X"}, xFormat);
var yOutput = createOutputVariable({prefix:"Y"}, yFormat);
var zOutput = createOutputVariable({prefix:"Z"}, zFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, abcFormat);
var cOutput = createOutputVariable({prefix:"C"}, cFormat);
var feedOutput = createOutputVariable({prefix:"F", tolerance:0.5}, feedFormat);
var pitchOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, pitchFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);
var pOutput = createOutputVariable({prefix:"P", control:CONTROL_FORCE}, rpmFormat);

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, spatialFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, spatialFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, spatialFormat);

// cycle thread output
var g76IOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, zFormat); // no scaling
var g76KOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, zFormat); // no scaling
var g76DOutput = createOutputVariable({prefix:"D", control:CONTROL_FORCE}, zFormat); // no scaling
var g76AOutput = createOutputVariable({prefix:"A", control:CONTROL_FORCE}, g76AFormat); // no scaling
var g76QOutput = createOutputVariable({prefix:"Q", control:CONTROL_FORCE}, threadQFormat);
var g92IOutput = createOutputVariable({prefix:"I"}, zFormat); // no scaling
var g92QOutput = createOutputVariable({prefix:"Q"}, threadQFormat);

var gMotionModal = createOutputVariable({onchange:function() {if (skipBlock) {forceModals(gMotionModal);}}}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createOutputVariable({onchange:function() {if (skipBlock) {forceModals(gPlaneModal);} forceModals(gMotionModal);}}, gFormat); // modal group 2 // G17-19
var gFeedModeModal = createOutputVariable({}, gFormat); // modal group 5 // G98-99
var gSpindleModeModal = createOutputVariable({}, gFormat); // modal group 5 // G96-97
var gSynchronizedSpindleModal = createOutputVariable({}, gFormat); // G198/G199
var gSpindleModal = createOutputVariable({}, gFormat); // G14/G15 SPINDLE MODE
var gUnitModal = createOutputVariable({}, gFormat); // modal group 6 // G20-21
var gCycleModal = createOutputVariable({}, gFormat); // modal group 9 // G81, ...
var gPolarModal = createOutputVariable({}, gFormat); // G112, G113
var ssvModal = createOutputVariable({}, mFormat); // M38, M39
var cAxisEngageModal = createOutputVariable({}, mFormat);
var cAxisBrakeModal = createOutputVariable({}, mFormat);
var gExactStopModal = createOutputVariable({}, gFormat); // modal group for exact stop codes
var tailStockModal = createOutputVariable({}, mFormat);

// fixed settings
var firstFeedParameter = 100;
var bAxisIsManual = false;

// defined in activateMachine
var gotYAxis;
var gotBAxis;

var WARNING_TURRET_UNSPECIFIED = 0;
var WARNING_REPEAT_TAPPING = 1;

var SPINDLE_MAIN = 0;
var SPINDLE_SUB = 1;
var SPINDLE_LIVE = 2;

// getSpindle parameters
var TOOL = false;
var PART = true;

// collected state
var sequenceNumber;
var currentWorkOffset;
var optionalSection = false;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var currentFeedId;
var previousSpindle = SPINDLE_MAIN;
var activeSpindle = SPINDLE_MAIN;
var forcePolarCoordinates = false; // forces Polar coordinate output, activated by Action:usePolarCoordinates
var forcePolarInterpolation = false; // force Polar interpolation output, activated by Action:usePolarInterpolation
var tapping = false;
var bestABC = undefined;
var partCutoff = false;
var showSequenceNumbers;
var ejectRoutine;
var g100Mirroring = false;
var g14IsActive = false;
var gotPolarInterpolation;
var xAxisMinimum;
var activeTurret = 1;
var lastSpindleMode = undefined;
var lastSpindleSpeed = 0;
var lastSpindleDirection = undefined;
var operationSupportsTCP; // multi-axis operation supports TCP
var gotSecondarySpindle;
var contouringSecondarySpindle;

// used to convert blocks to optional for safeStartAllOperations, might get used outside of onSection
var skipBlock = false;
var operationNeedsSafeStart = false;

var machineState = {
  isTurningOperation            : undefined,
  liveToolIsActive              : undefined,
  cAxisIsEngaged                : undefined,
  machiningDirection            : undefined,
  mainSpindleIsActive           : undefined,
  subSpindleIsActive            : undefined,
  mainSpindleBrakeIsActive      : undefined,
  subSpindleBrakeIsActive       : undefined,
  tailstockIsActive             : false,
  usePolarInterpolation         : false,
  usePolarCoordinates           : false,
  axialCenterDrilling           : false,
  currentBAxisOrientationTurning: new Vector(0, 0, 0),
  stockTransferIsActive         : false,
  feedPerRevolution             : undefined
};

/** G/M codes setup */
function getCode(code) {
  switch (code) {
  case "PART_CATCHER_ON":
    return mFormat.format(36);
  case "PART_CATCHER_OFF":
    return mFormat.format(37);
  case "TAILSTOCK_ON":
    machineState.tailstockIsActive = true;
    return mFormat.format(21);
  case "TAILSTOCK_OFF":
    machineState.tailstockIsActive = false;
    return mFormat.format(22);
  case "ENGAGE_C_AXIS":
    if (currentSection.spindle == SPINDLE_PRIMARY && getProperty("gotLiveTooling")) {
      machineState.cAxisIsEngaged = true;
      return cAxisEngageModal.format(154);
    } else {
      return "";
    }
  case "DISENGAGE_C_AXIS":
    if (currentSection.spindle == SPINDLE_PRIMARY && getProperty("gotLiveTooling")) {
      machineState.cAxisIsEngaged = false;
      return cAxisEngageModal.format(155);
    } else {
      return "";
    }
  case "POLAR_INTERPOLATION_ON":
    return gPolarModal.format(112);
  case "POLAR_INTERPOLATION_OFF":
    return gPolarModal.format(113);
  case "STOP_SPINDLE":
    lastSpindleSpeed = 0;
    lastSpindleDirection = undefined;
    if (machineState.liveToolIsActive) {
      machineState.liveToolIsActive = false;
      return mFormat.format(135);
    } else if (machineState.mainSpindleIsActive) {
      machineState.mainSpindleIsActive = false;
      return mFormat.format(5);
    } else if (machineState.subSpindleIsActive) {
      return getCode("STOP_SUB_SPINDLE");
    } else {
      return undefined;
    }
  case "STOP_SUB_SPINDLE":
    machineState.subSpindleIsActive = false;
    return mFormat.format(g14IsActive ? 5 : 145);
  case "START_LIVE_TOOL_CW":
    machineState.liveToolIsActive = true;
    return mFormat.format(133);
  case "START_LIVE_TOOL_CCW":
    machineState.liveToolIsActive = true;
    return mFormat.format(134);
  case "START_MAIN_SPINDLE_CW":
    machineState.mainSpindleIsActive = true;
    machineState.cAxisIsEngaged = false;
    return mFormat.format(3);
  case "START_MAIN_SPINDLE_CCW":
    machineState.mainSpindleIsActive = true;
    machineState.cAxisIsEngaged = false;
    return mFormat.format(4);
  case "START_SUB_SPINDLE_CW":
    machineState.subSpindleIsActive = true;
    machineState.cAxisIsEngaged = false;
    return mFormat.format(g14IsActive ? 3 : 143);
  case "START_SUB_SPINDLE_CCW":
    machineState.subSpindleIsActive = true;
    machineState.cAxisIsEngaged = false;
    return mFormat.format(g14IsActive ? 4 : 144);
  case "MAIN_SPINDLE_BRAKE_ON":
    machineState.mainSpindleBrakeIsActive = true;
    return cAxisBrakeModal.format(14);
  case "MAIN_SPINDLE_BRAKE_OFF":
    machineState.mainSpindleBrakeIsActive = false;
    return cAxisBrakeModal.format(15);
  case "SUB_SPINDLE_BRAKE_ON":
    machineState.subSpindleBrakeIsActive = true;
    return cAxisBrakeModal.format(g14IsActive ? 14 : 114);
  case "SUB_SPINDLE_BRAKE_OFF":
    machineState.subSpindleBrakeIsActive = false;
    return cAxisBrakeModal.format(g14IsActive ? 15 : 115);
  case "FEED_MODE_UNIT_REV":
    machineState.feedPerRevolution = true;
    return 99;
  case "FEED_MODE_UNIT_MIN":
    machineState.feedPerRevolution = false;
    return 98;
  case "CONSTANT_SURFACE_SPEED_ON":
    return gSpindleModeModal.format(96);
  case "CONSTANT_SURFACE_SPEED_OFF":
    return gSpindleModeModal.format(97);
  case "MAINSPINDLE_AIR_BLAST_ON":
    return mFormat.format(12);
  case "MAINSPINDLE_AIR_BLAST_OFF":
    return mFormat.format(13);
  case "SUBSPINDLE_AIR_BLAST_ON":
    return mFormat.format(112);
  case "SUBSPINDLE_AIR_BLAST_OFF":
    return mFormat.format(113);
  case "CLAMP_PRIMARY_CHUCK":
    return mFormat.format(10);
  case "UNCLAMP_PRIMARY_CHUCK":
    return mFormat.format(11);
  case "CLAMP_SECONDARY_CHUCK":
    return mFormat.format(110);
  case "UNCLAMP_SECONDARY_CHUCK":
    return mFormat.format(111);
  case "SPINDLE_SYNCHRONIZATION_ON":
    machineState.spindleSynchronizationIsActive = true;
    return gSynchronizedSpindleModal.format(199);
  case "SPINDLE_SYNCHRONIZATION_OFF":
    machineState.spindleSynchronizationIsActive = false;
    return gSynchronizedSpindleModal.format(198);
  case "START_CHIP_TRANSPORT":
    return mFormat.format(31);
  case "STOP_CHIP_TRANSPORT":
    return mFormat.format(33);
  case "OPEN_DOOR":
    return mFormat.format(85);
  case "CLOSE_DOOR":
    return mFormat.format(86);
  default:
    error(localize("Command " + code + " is not defined."));
    return 0;
  }
}

/** Write retract in XY/Z. */
function writeRetract(section, retractZ) {
  var _skipBlock = skipBlock;
  if (!isFirstSection()) {
    if (gotYAxis) {
      skipBlock = _skipBlock;
      writeBlock(gFormat.format(53), gMotionModal.format(0), "Y" + yFormat.format(getProperty("homePositionY"))); // retract
      yOutput.reset();
    }
    skipBlock = _skipBlock;
    writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX"))); // retract
    xOutput.reset();
    if (retractZ) {
      skipBlock = _skipBlock;
      writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + zFormat.format((section.spindle == SPINDLE_SECONDARY) ? getProperty("homePositionSubZ") : getProperty("homePositionZ"))); // retract with regard to spindle
      zOutput.reset();
    }
  }
}

/** Write WCS. */
function writeWCS(section) {
  if (section.workOffset != currentWorkOffset) {
    forceWorkPlane();
    writeBlock(section.wcs);
    currentWorkOffset = section.workOffset;
  }
}

/**  Returns the desired tolerance for the given section in MM.*/
function getTolerance() {
  var t1 = toPreciseUnit(tolerance, MM);
  var t2 = getParameter("operation:tolerance", t1);
  t1 = t1 > 0 ? Math.min(t1, t2) : t2;
  return unit == IN ? t1 * 25.4 : t1;
}

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    skipBlock = false;
    return;
  }
  if (showSequenceNumbers == "true") {
    if (sequenceNumber > 99999) {
      sequenceNumber = getProperty("sequenceNumberStart");
    }
    if (optionalSection || skipBlock) {
      if (text) {
        writeWords("/", "N" + sequenceNumber, text);
      }
    } else {
      writeWords2("N" + sequenceNumber, arguments);
    }
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    if (optionalSection || skipBlock) {
      writeWords2("/", arguments);
    } else {
      writeWords(arguments);
    }
  }
  skipBlock = false;
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

function formatComment(text) {
  return "(" + String(text).replace(/[()]/g, "") + ")";
}

/**
  Writes the specified block - used for tool changes only.
*/
function writeToolBlock() {
  var show = showSequenceNumbers;
  showSequenceNumbers = (show == "true" || show == "toolChange") ? "true" : "false";
  writeBlock(arguments);
  showSequenceNumbers = show;
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
    return Math.PI - abc.y;
  }
}

function activateMachine(section) {
  // TCP setting
  operationSupportsTCP = false;

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
    bAxis = createAxis({coordinate:1, table:false, axis:[0, -1, 0], range:[-0.001, 90.001], preference:0, tcp:true});
    if (getProperty("controllerType") == "ngc") {
      cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], cyclic:true, preference:0, tcp:operationSupportsTCP, reset:3});
    } else {
      cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], cyclic:false, range:[-8280, 8280], preference:0, tcp:operationSupportsTCP, reset:3});
    }
  } else {
    bAxis = createAxis({coordinate:1, table:false, axis:[0, 1, 0], range:[-0.001, 180.001], preference:0, tcp:true});
    if (getProperty("controllerType") == "ngc") {
      cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], cyclic:true, preference:0, tcp:operationSupportsTCP, reset:3});
    } else {
      cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], cyclic:false, range:[-8280, 8280], preference:0, tcp:operationSupportsTCP, reset:3});
    }
  }

  if (!getProperty("gotLiveTooling")) {
    machineConfiguration = new MachineConfiguration();
  } else if (gotBAxis) {
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
    machineConfiguration.setSpindleAxis(new Vector(1, 0, 0)); // set the spindle axis depending on B0 orientation
  }

  // define linear axes limits
  xAxisMinimum = getProperty("xAxisMinimum", 0);
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
    operationSupportsTCP ? FEED_FPM : FEED_FPM, // FEED_INVERSE_TIME,
    99999, // maximum output value for dpm feed rates
    DPM_COMBINATION, // INVERSE_MINUTES/INVERSE_SECONDS or DPM_COMBINATION/DPM_STANDARD
    0.5, // tolerance to determine when the DPM feed has changed
    unit == MM ? 1.0 : 1.0 // ratio of rotary accuracy to linear accuracy for DPM calculations
  );

  machineConfiguration.setVendor("HAAS");
  machineConfiguration.setModel(modelType);
  machineConfiguration.setControl(getProperty("controllerType") == "ngc" ? "Next Generation - NGC" : "Classic - CHC");
  setMachineConfiguration(machineConfiguration);
  if (section.isMultiAxis()) {
    section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
  }

  return turret;
}

function onOpen() {
  if (getProperty("useRadius")) {
    maximumCircularSweep = toRad(90); // avoid potential center calculation errors for CNC
  }

  if (getProperty("useG61")) {
    gExactStopModal.format(64);
  }

  if (getProperty("controllerType") == "chc") {
    setProperty("useM130PartImages", false);
    setProperty("useM130ToolImages", false);
  }

  gotSecondarySpindle = getProperty("gotSecondarySpindle") != "false"; // specifies if machine has a sub spindle
  contouringSecondarySpindle = getProperty("gotSecondarySpindle") == "contouring";

  // define machine
  activeTurret = activateMachine(getSection(0));

  if (highFeedrate <= 0) {
    error(localize("You must set 'highFeedrate' because axes are not synchronized for rapid traversal."));
    return;
  }

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }

  sequenceNumber = getProperty("sequenceNumberStart");
  writeln("%");

  if (programName) {
    var programId;
    try {
      programId = getAsInt(programName);
    } catch (e) {
      error(localize("Program name must be a number."));
      return;
    }
    if (!((programId >= 1) && (programId <= 99999))) {
      error(localize("Program number is out of range."));
      return;
    }
    if (programComment) {
      writeln("O" + oFormat.format(programId) + " (" + filterText(String(programComment).toUpperCase(), permittedCommentChars) + ")");
    } else {
      writeln("O" + oFormat.format(programId));
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
  var control = machineConfiguration.getControl();
  var mDescription = machineConfiguration.getDescription();

  if (getProperty("writeMachine") && (vendor || model || mDescription)) {
    writeComment(localize("Machine"));
    if (vendor) {
      writeComment("  " + localize("vendor") + ": " + vendor);
    }
    if (model) {
      writeComment("  " + localize("model") + ": " + model);
    }
    if (control) {
      writeComment("  " + localize("control") + ": " + control);
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
        var compensationOffset = tool.isTurningTool() ? tool.compensationOffset : tool.lengthOffset;
        var comment = "T" + toolFormat.format(tool.number * 100 + compensationOffset % 100) + " " +
          (tool.diameter != 0 ? "D=" + spatialFormat.format(tool.diameter) + " " : "") +
          (tool.isTurningTool() ? localize("NR") + "=" + spatialFormat.format(tool.noseRadius) : localize("CR") + "=" + spatialFormat.format(tool.cornerRadius)) +
          (tool.taperAngle > 0 && (tool.taperAngle < Math.PI) ? " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg") : "") +
          (zRanges[tool.number] ? " - " + localize("ZMIN") + "=" + spatialFormat.format(zRanges[tool.number].getMinimum()) : "") +
          " - " + localize(getToolTypeName(tool.type));
        writeComment(comment);

        if (getProperty("useM130ToolImages")) {
          var toolRenderer = createToolRenderer();
          if (toolRenderer) {
            toolRenderer.setBackgroundColor(new Color(1, 1, 1));
            toolRenderer.setFluteColor(new Color(40.0 / 255, 40.0 / 255, 40.0 / 255));
            toolRenderer.setShoulderColor(new Color(80.0 / 255, 80.0 / 255, 80.0 / 255));
            toolRenderer.setShaftColor(new Color(80.0 / 255, 80.0 / 255, 80.0 / 255));
            toolRenderer.setHolderColor(new Color(40.0 / 255, 40.0 / 255, 40.0 / 255));
            if (i % 2 == 0) {
              toolRenderer.setBackgroundColor(new Color(1, 1, 1));
            } else {
              toolRenderer.setBackgroundColor(new Color(240 / 255.0, 240 / 255.0, 240 / 255.0));
            }
            var path = "tool" + tool.number + ".png";
            var width = 400;
            var height = 532;
            toolRenderer.exportAs(path, "image/png", tool, width, height);
          }
        }
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

  if ((getNumberOfSections() > 0) && (getSection(0).workOffset == 0)) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      if (getSection(i).workOffset > 0) {
        error(localize("Using multiple work offsets is not possible if the initial work offset is 0."));
        return;
      }
    }
  }

  // support program looping for bar work
  if (getProperty("looping")) {
    if (getProperty("numberOfRepeats") < 1) {
      error(localize("numberOfRepeats must be greater than 0."));
      return;
    }
    if (sequenceNumber == 1) {
      sequenceNumber++;
    }
    writeln("");
    writeln("");
    writeComment(localize("Local Looping"));
    writeln("");
    writeBlock(mFormat.format(97), "P1", "L" + getProperty("numberOfRepeats"));
    onCommand(COMMAND_OPEN_DOOR);
    writeBlock(mFormat.format(30));
    writeln("");
    writeln("");
    writeln("N1 (START MAIN PROGRAM)");
  }

  // absolute coordinates and feed per min
  writeBlock(gFeedModeModal.format(getCode("FEED_MODE_UNIT_MIN")), gPlaneModal.format(18));
  writeBlock(gUnitModal.format(unit == IN ? 20 : 21));

  onCommand(COMMAND_CLOSE_DOOR);

  // writeBlock("#" + (firstFeedParameter - 1) + "=" + ((currentSection.spindle == SPINDLE_SECONDARY) ? getProperty("homePositionSubZ") : getProperty("homePositionZ")), formatComment("homePositionZ"));

  writeBlock(gFormat.format(50), sOutput.format(getSection(0).spindle == SPINDLE_PRIMARY ? getProperty("maximumSpindleSpeed") : getProperty("subMaximumSpindleSpeed")));
  sOutput.reset();

  if (getProperty("gotChipConveyor")) {
    onCommand(COMMAND_START_CHIP_TRANSPORT);
  }

  if (gotYAxis) {
    writeBlock(gFormat.format(53), gMotionModal.format(0), "Y" + yFormat.format(getProperty("homePositionY"))); // retract
  }
  writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX"))); // retract
  writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + zFormat.format(getProperty("homePositionZ"))); // retract
  if (gotSecondarySpindle) {
    var b = getSection(0).spindle == SPINDLE_PRIMARY ? getProperty("homePositionSubZ") : getProperty("workPositionSub");
    writeBlock(gFormat.format(53), gMotionModal.format(0), "B" + spatialFormat.format(b)); // retract Sub Spindle if applicable
  }

  // automatically eject part at end of program
  ejectRoutine = getProperty("autoEject");

/*
  if (getProperty("useM97")) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var section = getSection(i);
      writeBlock(mFormat.format(97), pFormat.format(section.getId() + getProperty("sequenceNumberStart")), conditional(section.hasParameter("operation-comment"), "(" + section.getParameter("operation-comment") + ")"));
    }
    writeBlock(mFormat.format(30));
    if (getProperty("showSequenceNumbers") && getProperty("useM97")) {
      error(localize("Properties 'showSequenceNumbers' and 'useM97' cannot be active together at the same time."));
      return;
    }
  }
*/
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

function writeG187() {
  if (isDrillingCycle(false) || !machineState.liveToolIsActive) {
    writeBlock(gFormat.format(187)); // reset G187 setting to machine default
  } else if (hasParameter("operation:tolerance")) {
    var tolerance = Math.max(getParameter("operation:tolerance"), 0);
    if (tolerance > 0) {
      var stockToLeaveThreshold = toUnit(0.1, MM);
      var stockToLeave = 0;
      var verticalStockToLeave = 0;
      if (hasParameter("operation:stockToLeave")) {
        stockToLeave = spatialFormat.getResultingValue(getParameter("operation:stockToLeave"));
      }
      if (hasParameter("operation:verticalStockToLeave")) {
        verticalStockToLeave = spatialFormat.getResultingValue(getParameter("operation:verticalStockToLeave"));
      }

      var workMode;
      if (((stockToLeave > stockToLeaveThreshold) && (verticalStockToLeave > stockToLeaveThreshold)) ||
        (hasParameter("operation:strategy") && getParameter("operation:strategy") == "face")) {
        workMode = 1; // roughing
      } else {
        if ((stockToLeave > 0) || (verticalStockToLeave > 0)) {
          workMode = 2; // default
        } else {
          workMode = 3; // fine
        }
      }
      writeBlock(gFormat.format(187), "P" + workMode); // set tolerance mode
      // writeBlock(gFormat.format(187), "P" + workMode, "E" + spatialFormat.format(tolerance)); // set tolerance mode
    } else {
      writeBlock(gFormat.format(187)); // reset G187 setting to machine default
    }
  } else {
    writeBlock(gFormat.format(187)); // reset G187 setting to machine default
  }
}

function FeedContext(id, description, feed) {
  this.id = id;
  this.description = description;
  this.feed = feed;
}

function formatFeedMode(mode) {
  var fMode = (mode == FEED_PER_REVOLUTION || tapping) ? getCode("FEED_MODE_UNIT_REV") : getCode("FEED_MODE_UNIT_MIN");
  if (fMode) {
    feedFormat = mode == FEED_PER_REVOLUTION ? fprFormat : fpmFormat;
    feedOutput.setFormat(feedFormat);
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

var currentWorkPlaneABC = undefined;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function setWorkPlane(abc) {
  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }

  var _skipBlock = false;
  if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
    if (operationNeedsSafeStart) {
      _skipBlock = true;
    } else {
      return; // no change
    }
  }

  skipBlock = _skipBlock;
  onCommand(COMMAND_UNLOCK_MULTI_AXIS);
  gMotionModal.reset();

  skipBlock = _skipBlock;
  writeBlock(
    gMotionModal.format(0),
    conditional(machineConfiguration.isMachineCoordinate(0), aOutput.format(abc.x)),
    conditional(machineConfiguration.isMachineCoordinate(1), bOutput.format(getB(abc, currentSection))),
    conditional(machineConfiguration.isMachineCoordinate(2), cOutput.format(abc.z))
  );

  if (!currentSection.isMultiAxis() && !machineState.usePolarInterpolation && !isPolarModeActive()) {
    skipBlock = _skipBlock;
    onCommand(COMMAND_LOCK_MULTI_AXIS);
    currentWorkPlaneABC = abc;
  } else {
    forceWorkPlane();
  }
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

  var direction = machineConfiguration.getDirection(abc);
  if (!isSameDirection(direction, W.forward)) {
    error(localize("Orientation not supported."));
  }

  if (machineState.isTurningOperation && gotBAxis) { // remapABC can change the B-axis orientation
    if (abc.z != 0) {
      error(localize("Could not calculate a B-axis turning angle within the range of the machine."));
      return abc;
    }
  }

  var tcp = false;
  if (tcp) {
    setRotation(W); // TCP mode
  } else {
    var O = machineConfiguration.getOrientation(abc);
    var R = machineConfiguration.getRemainingOrientation(abc, W);
    setRotation(R);
  }

  return abc;
}

var bAxisOrientationTurning = new Vector(0, 0, 0);

function setSpindleOrientationTurning(section) {
  var J; // cutter orientation
  var R; // cutting quadrant
  var leftHandTool = (hasParameter("operation:tool_hand") && (getParameter("operation:tool_hand") == "L" || getParameter("operation:tool_holderType") == 0));
  if (hasParameter("operation:machineInside")) {
    if (getParameter("operation:machineInside") == 0) {
      R = section.spindle == SPINDLE_PRIMARY ? 3 : 4;
    } else {
      R = section.spindle == SPINDLE_PRIMARY ? 2 : 1;
    }
  } else {
    if ((hasParameter("operation-strategy") && (getParameter("operation-strategy") == "turningFace")) ||
        (hasParameter("operation-strategy") && (getParameter("operation-strategy") == "turningPart"))) {
      R = section.spindle == SPINDLE_PRIMARY ? 3 : 4;
    } else {
      error(subst(localize("Failed to identify spindle orientation for operation \"%1\"."), getOperationComment()));
      return;
    }
  }
  if (leftHandTool) {
    J = section.spindle == (SPINDLE_PRIMARY ? 2 : 1);
  } else {
    J = section.spindle == (SPINDLE_PRIMARY ? 1 : 2);
  }
  writeComment("Post processor is not customized, add code for cutter orientation and cutting quadrant here if needed.");
}

function getBAxisOrientationTurning(section) {
  var toolAngle = hasParameter("operation:tool_angle") ? getParameter("operation:tool_angle") : 0;
  var toolOrientation = section.toolOrientation;
  if (toolAngle && (toolOrientation != 0)) {
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

var seenPatternIds = {};

function previewImage() {
  var permittedExtensions = ["JPG", "MP4", "MOV", "PNG", "JPEG"];
  var patternId = currentSection.getPatternId();
  var show = false;
  if (!seenPatternIds[patternId]) {
    show = true;
    seenPatternIds[patternId] = true;
  }
  var images = [];
  if (show) {
    if (FileSystem.isFile(FileSystem.getCombinedPath(FileSystem.getFolderPath(getOutputPath()), modelImagePath))) {
      images.push(modelImagePath);
    }
    if (hasParameter("autodeskcam:preview-name") && FileSystem.isFile(FileSystem.getCombinedPath(FileSystem.getFolderPath(getOutputPath()), getParameter("autodeskcam:preview-name")))) {
      images.push(getParameter("autodeskcam:preview-name"));
    }

    for (var i = 0; i < images.length; ++i) {
      var fileExtension = images[i].slice(images[i].lastIndexOf(".") + 1, images[i].length).toUpperCase();
      var permittedExtension = false;
      for (var j = 0; j < permittedExtensions.length; ++j) {
        if (fileExtension == permittedExtensions[j]) {
          permittedExtension = true;
          break; // found
        }
      }
      if (!permittedExtension) {
        warning(localize("The image file format " + "\"" + fileExtension + "\"" + " is not supported on HAAS controls."));
      }

      if (!getProperty("useM130PartImages") || !permittedExtension) {
        FileSystem.remove(FileSystem.getCombinedPath(FileSystem.getFolderPath(getOutputPath()), images[i])); // remove
        images.splice([i], 1); // remove from array
      }
    }
    if (images.length > 0) {
      writeBlock(mFormat.format(130), "(" + images[images.length - 1] + ")");
    }
  }
}

/**
  Compare a text string to acceptable choices.
  Returns -1 if there is no match.
*/
function parseChoice() {
  for (var i = 1; i < arguments.length; ++i) {
    if (String(arguments[0]).toUpperCase() == String(arguments[i]).toUpperCase()) {
      return i - 1;
    }
  }
  return -1;
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
  var previousTapping = tapping;
  tapping = isTappingCycle();

  var forceSectionRestart = optionalSection && !currentSection.isOptional();
  optionalSection = currentSection.isOptional();
  bestABC = undefined;

  machineState.isTurningOperation = (currentSection.getType() == TYPE_TURNING);
  if (machineState.isTurningOperation && gotBAxis) {
    bAxisOrientationTurning = getBAxisOrientationTurning(currentSection);
  }
  var insertToolCall = isToolChangeNeeded("number", "compensationOffset", "diameterOffset", "lengthOffset") || forceSectionRestart;
  var newWorkOffset = isNewWorkOffset() || forceSectionRestart;
  var newWorkPlane = isNewWorkPlane() || forceSectionRestart ||
    (machineState.isTurningOperation &&
      abcFormat.areDifferent(bAxisOrientationTurning.x, machineState.currentBAxisOrientationTurning.x) ||
      abcFormat.areDifferent(bAxisOrientationTurning.y, machineState.currentBAxisOrientationTurning.y) ||
      abcFormat.areDifferent(bAxisOrientationTurning.z, machineState.currentBAxisOrientationTurning.z));
  var retracted = false; // specifies that the tool has been retracted to the safe plane

  partCutoff = getParameter("operation-strategy", "") == "turningPart";
  operationNeedsSafeStart = getProperty("safeStartAllOperations") && !isFirstSection();
  gotPolarInterpolation =  getProperty("useG112") && (currentSection.spindle != SPINDLE_SECONDARY || contouringSecondarySpindle);

  var yAxisWasEnabled = !machineState.usePolarCoordinates && !machineState.usePolarInterpolation && machineState.liveToolIsActive;
  updateMachiningMode(currentSection); // sets the needed machining mode to machineState (usePolarInterpolation, usePolarCoordinates, axialCenterDrilling)

  // Get the active spindle
  var newSpindle = true;
  var tempSpindle = getSpindle(TOOL);
  if (isFirstSection()) {
    previousSpindle = tempSpindle;
  }
  newSpindle = tempSpindle != previousSpindle;

  if (insertToolCall || newSpindle || newWorkOffset || newWorkPlane &&
      (!currentSection.isPatterned() && (!machineState.stockTransferIsActive && !partCutoff))) {
    // retract to safe plane
    retracted = true;
    if (!isFirstSection()) {
      if (insertToolCall) {
        onCommand(COMMAND_COOLANT_OFF);
      }
      writeRetract(currentSection, true); // retract in Z also
    }
  }

  if (!machineState.stockTransferIsActive || !partCutoff) {
    if (currentSection.getTool().isLiveTool) {
      if (!isFirstSection() &&
          ((getPreviousSection().getTool().isLiveTool() != currentSection.getTool().isLiveTool()) ||
          (previousTapping && insertToolCall))) {
        writeBlock(getCode("STOP_SPINDLE"));
      }
    } else {
      writeBlock(getCode("STOP_SPINDLE"));
    }
  }

  /*
  if (getProperty("useM97") && !isFirstSection()) {
    writeBlock(mFormat.format(99));
  }
*/

  if (getProperty("useSSV")) {
    // ensure SSV is turned off
    writeBlock(ssvModal.format(39));
  }

  /*
  if (getProperty("useM97")) {
    writeBlock("N" + spatialFormat.format(currentSection.getId() + getProperty("sequenceNumberStart")));
  }
*/

  // Consider part cutoff as stockTransfer operation
  if (!(machineState.stockTransferIsActive && partCutoff)) {
    machineState.stockTransferIsActive = false;
  }

  writeln("");

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      writeComment(comment);
    }
  }

  if (!insertToolCall && operationNeedsSafeStart) {
    skipBlock = true;
    writeRetract(currentSection, true); // retract in Z also
  }

  // Write out notes
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

  // enable Polar coordinates mode
  if (machineState.usePolarCoordinates && (tool.type != TOOL_PROBE)) {
    if (polarCoordinatesDirection == undefined) {
      error(localize("Polar coordinates axis direction to maintain must be defined as a vector - x,y,z."));
      return;
    }
    setPolarCoordinates(true);
  }

  if (insertToolCall || operationNeedsSafeStart) {
    forceModals();
    if (getProperty("useM130ToolImages")) {
      writeBlock(mFormat.format(130), "(tool" + tool.number + ".png)");
    }

    if (insertToolCall) {
      forceWorkPlane();
    }
    if (!getProperty("optimizeCAxisSelect")) {
      cAxisEngageModal.reset();
    }
    retracted = insertToolCall;

    if (!isFirstSection() && getProperty("optionalStop")) {
      skipBlock = !insertToolCall;
      onCommand(COMMAND_OPTIONAL_STOP);
    }

    if (tool.number > 99) {
      warning(localize("Tool number exceeds maximum value."));
    }

    var compensationOffset = tool.isTurningTool() ? tool.compensationOffset : tool.lengthOffset;
    if (compensationOffset > 99) {
      error(localize("Compensation offset is out of range."));
      return;
    }

    if (gotSecondarySpindle) {
      switch (currentSection.spindle) {
      case SPINDLE_PRIMARY: // main spindle
        cFormat.setScale(DEG);
        cOutput.setPrefix("C");
        cOutput.setCyclicLimit(0);
        cOutput.setFormat(cFormat);
        skipBlock = !insertToolCall;
        writeBlock(gSpindleModal.format(15));
        if (gotYAxis && (g100Mirroring || isFirstSection())) {
          writeBlock(gFormat.format(100), "Y" + spatialFormat.format(0));
          g100Mirroring = false;
        }
        g14IsActive = false;
        break;
      case SPINDLE_SECONDARY: // sub spindle
        if (contouringSecondarySpindle) {
          cFormat.setScale(-DEG);
          cOutput.setFormat(cFormat);
        } else {
          cFormat.setScale(-DEG);
          cOutput.setPrefix("M19 R");
          cOutput.setCyclicLimit(360);
          cOutput.setCyclicSign(1);
          cOutput.setFormat(cFormat);
        }
        skipBlock = !insertToolCall;
        writeBlock(gSpindleModal.format(14));
        if (gotYAxis && !g100Mirroring) {
          writeBlock(gFormat.format(101), "Y" + spatialFormat.format(0));
          g100Mirroring = true;
        }
        g14IsActive = true;
        break;
      }
    }

    skipBlock = !insertToolCall;
    writeToolBlock("T" + toolFormat.format(tool.number * 100 + compensationOffset));
    if (tool.comment) {
      writeComment(tool.comment);
    }

    var showToolZMin = false;
    if (showToolZMin && (currentSection.getType() == TYPE_MILLING)) {
      if (is3D()) {
        var numberOfSections = getNumberOfSections();
        var zRange = currentSection.getGlobalZRange();
        var number = tool.number;
        for (var i = currentSection.getId() + 1; i < numberOfSections; ++i) {
          var section = getSection(i);
          if (section.getTool().number != number) {
            break;
          }
          zRange.expandToRange(section.getGlobalZRange());
        }
        writeComment(localize("ZMIN") + "=" + zRange.getMinimum());
      }
    }
  }

  if (!machineState.stockTransferIsActive) {
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      skipBlock = !insertToolCall  && (machineState.cAxisIsEngaged != undefined);
      writeBlock(conditional(machineState.cAxisIsEngaged || (machineState.cAxisIsEngaged == undefined)), getCode("DISENGAGE_C_AXIS"));
    } else { // milling
      var engage =  (currentSection.spindle == SPINDLE_PRIMARY) && (!machineState.cAxisIsEngaged || machineState.cAxisIsEngaged == undefined);
      if (engage) {
        var code = getCode("ENGAGE_C_AXIS");
        if (code) {
          writeBlock(code);
          writeBlock(gMotionModal.format(0), gFormat.format(28), "H" + abcFormat.format(0));
        }
      }
    }
  }

  // command stop for manual tool change, useful for quick change live tools
  if ((insertToolCall || operationNeedsSafeStart) && tool.manualToolChange) {
    skipBlock = !insertToolCall;
    onCommand(COMMAND_STOP);
    writeBlock("(" + "MANUAL TOOL CHANGE TO T" + toolFormat.format(tool.number * 100 + compensationOffset) + ")");
  }

  if (newSpindle) {
    // select spindle if required
  }

  // Get active feedrate mode
  forceModals(gFeedModeModal, gPlaneModal);
  var feedMode = formatFeedMode(currentSection.feedMode);
  feedOutput.setTolerance(machineState.feedPerRevolution ? 0 : 0.5); // for DPM feeds

  // Output modal commands here
  writeBlock(feedMode);
  writeBlock(gPlaneModal.format(getPlane()));

  // Engage tailstock
  if (getProperty("useTailStock")) {
    if (machineState.axialCenterDrilling || (currentSection.spindle == SPINDLE_SECONDARY) ||
       (machineState.liveToolIsActive && (getMachiningDirection(currentSection) == MACHINING_DIRECTION_AXIAL))) {
      if (currentSection.tailstock) {
        warning(localize("Tail stock is not supported for secondary spindle or Z-axis milling."));
      }
      if (machineState.tailstockIsActive) {
        writeBlock(getCode("TAILSTOCK_OFF"));
      }
    } else {
      writeBlock(currentSection.tailstock ? getCode("TAILSTOCK_ON") : getCode("TAILSTOCK_OFF"));
    }
  }

  // see page 138 in 96-8700an for stock transfer / G199/G198
  var spindleChange = tool.type != TOOL_PROBE &&
    (insertToolCall || forceSpindleSpeed || isSpindleSpeedDifferent() ||
    (!machineState.liveToolIsActive && !machineState.mainSpindleIsActive && !machineState.subSpindleIsActive));
  if (spindleChange || operationNeedsSafeStart) {
    forceSpindleSpeed = false;
    if (machineState.isTurningOperation) {
      if (spindleSpeed > 99999) {
        warning(subst(localize("Spindle speed exceeds maximum value for operation \"%1\"."), getOperationComment()));
      }
    } else {
      if (spindleSpeed > 6000) {
        warning(subst(localize("Spindle speed exceeds maximum value for operation \"%1\"."), getOperationComment()));
      }
    }
    skipBlock = !insertToolCall && !spindleChange;
    startSpindle(true, getFramePosition(currentSection.getInitialPosition()));
  }

  previewImage();

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }

  writeWCS(currentSection);

  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);

  if (currentSection.partCatcher) {
    engagePartCatcher(true);
  }

  forceAny();
  gMotionModal.reset();

  var abc = new Vector(0, 0, 0);
  if (machineConfiguration.isMultiAxisConfiguration()) {
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      if (gotBAxis) {
        // TAG: handle B-axis support for turning operations here
        writeBlock(gMotionModal.format(0), conditional(machineConfiguration.isMachineCoordinate(1), bOutput.format(getB(bAxisOrientationTurning, currentSection))));
        machineState.currentBAxisOrientationTurning = bAxisOrientationTurning;
        //setSpindleOrientationTurning();
      } else {
        setRotation(currentSection.workPlane);
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
      setWorkPlane(abc);
    }
  } else { // pure 3D
    var remaining = currentSection.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported by the CNC machine."));
      return;
    }
    setRotation(remaining);
  }
  forceAny();
  if (abc !== undefined) {
    if (!currentSection.isMultiAxis()) {
      cOutput.format(abc.z); // make C current - we do not want to output here
    }
  }

  if (machineState.cAxisIsEngaged) { // make sure C-axis in engaged
    if (!machineState.usePolarInterpolation && !isPolarModeActive() && !currentSection.isMultiAxis()) {
      onCommand(COMMAND_LOCK_MULTI_AXIS);
    } else {
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    }
  }

  if (getProperty("useSmoothing")) {
    writeG187();
  }

  var initialPosition = isPolarModeActive() ? getCurrentPosition() :  getFramePosition(currentSection.getInitialPosition());
  if ((isPolarModeActive() || machineState.usePolarInterpolation) && yAxisWasEnabled) {
    if (gotYAxis && yOutput.isEnabled()) {
      writeBlock(gMotionModal.format(0), yOutput.format(0));
    }
  }
  if (machineState.usePolarInterpolation) {
    setPolarInterpolation(true); // enable polar interpolation mode
  }
  gMotionModal.reset();

  if (getProperty("useG61")) {
    writeBlock(gExactStopModal.format(61));
  }

  if (insertToolCall || retracted || isPolarModeActive() || (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED)) {
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
    writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
  }

  // enable SFM spindle speed
  if (tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) {
    startSpindle(false);
  }

  if (getProperty("useParametricFeed") && !isDrillingCycle(true) && !isPolarModeActive()) {
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
    // writeComment((getMachineConfigurationAsText(machineConfiguration)));
  }
}

function getPlane() {
  if (getMachiningDirection(currentSection) == MACHINING_DIRECTION_AXIAL) { // axial
    if (isPolarModeActive() || isDrillingCycle(currentSection, false) || machineState.isTurningOperation) {
      return 18;
    } else {
      return 17; // G112 and XY milling only
    }
  } else if (getMachiningDirection(currentSection) == MACHINING_DIRECTION_RADIAL) { // radial
    return 19; // YZ plane
  } else {
    error(subst(localize("Unsupported machining direction for operation " +  "\"" + "%1" + "\"" + "."), getOperationComment()));
    return undefined;
  }
}

var MACHINING_DIRECTION_AXIAL = 0;
var MACHINING_DIRECTION_RADIAL = 1;
var MACHINING_DIRECTION_INDEXING = 2;

function getMachiningDirection(section) {
  var forward = section.workPlane.forward;
  if (section.isMultiAxis()) {
    forward = section.getGlobalInitialToolAxis();
    forward = Math.abs(forward.z) < 1e-7 ? new Vector(1, 0, 0) : forward; // radial multi-axis operation
  }
  if (isSameDirection(forward, new Vector(0, 0, 1))) {
    return MACHINING_DIRECTION_AXIAL;
  } else if (Vector.dot(forward, new Vector(0, 0, 1)) < 1e-7) {
    return MACHINING_DIRECTION_RADIAL;
  } else {
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
        machineState.axialCenterDrilling = isAxialCenterDrilling(section, false);
        if (machineState.axialCenterDrilling) {
          if (section.getTool().isLiveTool()) { // live tool
            if (!getProperty("gotLiveTooling")) {
              warning(localize("Live tools are not supported, using turning spindle instead."));
            } else {
              machineState.axialCenterDrilling = false;
            }
          }
        } else { // several holes not on XY center
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
  } else {
    // turning or multi axis, keep false
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

function setPolarInterpolation(activate) {
  if (activate) {
    writeBlock(gMotionModal.format(0), cOutput.format(0)); // set C-axis to 0 to avoid G112 issues
    writeBlock(getCode("POLAR_INTERPOLATION_ON")); // command for polar interpolation
    writeBlock(gPlaneModal.format(getPlane()));
    validate(gPlaneModal.getCurrent() == 17, localize("Internal post processor error.")); // make sure that G17 is active
    xFormat.setScale(1); // radius mode
    xOutput.setFormat(xFormat);
    yOutput.enable(); // required for G112
    forceWorkPlane();
  } else {
    writeBlock(getCode("POLAR_INTERPOLATION_OFF"));
    xFormat.setScale(2); // diameter mode
    xOutput.setFormat(xFormat);
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
  writeBlock(gFormat.format(4), "P" + milliFormat.format(milliseconds));
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
    // var useG1 = (((((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) > 1) || machineState.usePolarInterpolation) && !isCannedCycle);
    var useG1 = false;
    var gCode = useG1 ? 1 : 0;
    var f = useG1 ? getFeed(getHighfeedrate(_x)) : "";
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gMotionModal.format(gCode), gFormat.format(41), x, y, z, f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gMotionModal.format(gCode), gFormat.format(42), x, y, z, f);
        break;
      default:
        writeBlock(gMotionModal.format(gCode), gFormat.format(40), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(gCode), x, y, z, f);
      resetFeed = false;
    }
    forceFeed();
  }
}

function onLinear(_x, _y, _z, feed) {
  // don't output starts for threading
  if (threadNumber > 0) {
    return;
  }

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
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      writeBlock(gPlaneModal.format(getPlane()));
      if (getMachiningDirection(currentSection) == MACHINING_DIRECTION_INDEXING) {
        error(localize("Tool orientation is not supported for radius compensation."));
        return;
      }
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(41), x, y, z, getFeed(feed));
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(42), x, y, z, getFeed(feed));
        break;
      default:
        writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), gFormat.format(40), x, y, z, getFeed(feed));
      }
    } else {
      writeBlock(gMotionModal.format(isSpeedFeedSynchronizationActive() ? 32 : 1), x, y, z, getFeed(feed));
    }
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (currentSection.spindle == SPINDLE_SECONDARY && !contouringSecondarySpindle && !isPolarModeActive()) {
    error(localize("Multi-axis motion is not supported on the secondary spindle."));
    return;
  }
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode cannot be changed at rapid traversal."));
    return;
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(_a);
  var b = bOutput.format(getB(new Vector(_a, _b, _c), currentSection));
  var c = cOutput.format(_c);
  if (x || y || z || a || b || c) {
    var useG1 = (((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0) + (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0) > 1) && (a || b || c)) && !isCannedCycle;
    var gCode = useG1 ? 1 : 0;
    var f = useG1 ? getFeed(getHighfeedrate(_x)) : "";
    writeBlock(gMotionModal.format(gCode), x, y, z, a, b, c, f);
    if (!useG1) {
      forceFeed();
    }
  }
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  if (currentSection.spindle == SPINDLE_SECONDARY && !contouringSecondarySpindle) {
    error(localize("Multi-axis motion is not supported on the secondary spindle."));
    return;
  }
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
    return;
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(_a);
  var b = bOutput.format(getB(new Vector(_a, _b, _c), currentSection));
  var c = cOutput.format(_c);

  if (x || y || z || a || b || c) {
    var f = ((a || b || c)) ? getFeedDPM(_x, _y, _z, feed) : getFeed(feed);
    writeBlock(gMotionModal.format(1), x, y, z, a, b, c, f);
  }
}

// Start of multi-axis feedrate logic
function getFeedDPM(_x, _y, _z, feed) {
  var xyz = new Vector(_x, _y, _z);
  var axis = machineConfiguration.getNumberOfAxes() == 5 ? machineConfiguration.getAxisV() : machineConfiguration.getAxisU();
  var d1 = Vector.diff(xyz, axis.getOffset()).abs;
  var d2 = Vector.diff(getCurrentPosition(), axis.getOffset()).abs;
  var r1;
  var r2;
  if (isSameDirection(axis.getAxis(), new Vector(0, 0, 1)) || isSameDirection(axis.getAxis(), new Vector(0, 0, -1))) {
    r1 = new Vector(d1.x, d1.y, 0).length;
    r2 = new Vector(d2.x, d2.y, 0).length;
  } else if (isSameDirection(axis.getAxis(), new Vector(0, 1, 0)) || isSameDirection(axis.getAxis(), new Vector(0, -1, 0))) {
    r1 = new Vector(d1.x, 0, d1.z).length;
    r2 = new Vector(d2.x, 0, d2.z).length;
  } else {
    r1 = new Vector(0, d1.y, d1.z).length;
    r2 = new Vector(0, d2.y, d2.z).length;
  }
  var radius = (r1 + r2) / 2; // use average radius of move
  var feedRate = feed / (radius / (toPreciseUnit(getProperty("setting102"), IN) / 2.0));
  var dpmFeed = Math.min(feedRate, highFeedrate);
  return feedOutput.format(dpmFeed);
}
// End of multi-axis feedrate logic

// Start of onRewindMachine logic
/** Allow user to override the onRewind logic. */
function onRewindMachineEntry(_a, _b, _c) {
  if (isPolarModeActive()) {
    writeComment("Rewind of C-axis, make sure retracting is possible.");
    onCommand(COMMAND_STOP);
    writeBlock(gMotionModal.format(1), zOutput.format(currentSection.getInitialPosition().z), getFeed(safeRetractFeed));
    writeBlock(getCode("DISENGAGE_C_AXIS"));
    writeBlock(getCode("ENGAGE_C_AXIS"));
    gMotionModal.reset();
    xOutput.reset();
    startSpindle(false);

    var xyz = getCurrentPosition();
    var polarPosition = getPolarPosition(xyz.x, xyz.y, xyz.z);
    xyz = polarPosition.first;
    if (getProperty("rapidRewinds")) {
      writeBlock(gMotionModal.format(1), xOutput.format(xyz.x), getFeed(highFeedrate));
      writeBlock(gMotionModal.format(0), cOutput.format(_c));
    } else {
      writeBlock(gMotionModal.format(1), xOutput.format(xyz.x), cOutput.format(_c), getFeed(highFeedrate));
    }
    writeBlock(gMotionModal.format(1), zOutput.format(xyz.z), getFeed(safePlungeFeed));

    setCoolant(tool.coolant);
    writeComment("End of rewind");
  } else if (getMachiningDirection(currentSection) == MACHINING_DIRECTION_RADIAL) {
    writeComment("Start of rewind");
    writeBlock(gMotionModal.format(1), xOutput.format(currentSection.getInitialPosition().x), getFeed(safeRetractFeed));
    writeBlock(getCode("DISENGAGE_C_AXIS"));
    writeBlock(getCode("ENGAGE_C_AXIS"));
    writeBlock(gMotionModal.format(0), cOutput.format(_c));
    feedOutput.reset();
    writeBlock(gMotionModal.format(1), xOutput.format(getCurrentPosition().x), getFeed(safePlungeFeed));
    writeComment("End of rewind");
  } else { // should never get here
    error(localize("Automatic rewinds not enabled for this operation."));
  }
  return true;
}
// End of onRewindMachine logic

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
    forceWorkPlane();
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
  var toler = machineState.usePolarInterpolation ? getTolerance() / 2 : getTolerance();

  if (machineState.usePolarInterpolation && !getProperty("usePolarCircular")) {
    linearize(toler);
    return;
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

  if (isFullCircle()) {
    if (getProperty("useRadius") || isHelical()) { // radius mode does not support full arcs
      linearize(toler);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gPlaneModal.format(17), gMotionModal.format(directionCode), iOutput.format(cx - start.x), jOutput.format(cy - start.y), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), iOutput.format(cx - start.x), kOutput.format(cz - start.z), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), jOutput.format(cy - start.y), kOutput.format(cz - start.z), getFeed(feed));
      break;
    default:
      linearize(toler);
    }
  } else if (!getProperty("useRadius")) {
    if (isHelical() && ((getCircularSweep() < toRad(30)) || (getHelicalPitch() > 10))) { // avoid G112 issue
      linearize(toler);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (!xFormat.isSignificant(start.x) && machineState.usePolarInterpolation) {
        linearize(toler); // avoid G112 issues
        return;
      }
      writeBlock(gPlaneModal.format(17), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), jOutput.format(cy - start.y), getFeed(feed));
      break;
    case PLANE_ZX:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), kOutput.format(cz - start.z), getFeed(feed));
      break;
    case PLANE_YZ:
      if (machineState.usePolarInterpolation) {
        linearize(tolerance);
        return;
      }
      writeBlock(gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y), kOutput.format(cz - start.z), getFeed(feed));
      break;
    default:
      linearize(toler);
    }
  } else { // use radius mode
    if (isHelical() && ((getCircularSweep() < toRad(30)) || (getHelicalPitch() > 10))) {
      linearize(toler);
      return;
    }
    var r = getCircularRadius();
    if (toDeg(getCircularSweep()) > (180 + 1e-9)) {
      r = -r; // allow up to <360 deg arcs
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (!xFormat.isSignificant(start.x) && machineState.usePolarInterpolation) {
        linearize(toler); // avoid G112 issues
        return;
      }
      writeBlock(gPlaneModal.format(17), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), getFeed(feed));
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
      linearize(toler);
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

function onCycle() {
  if ((typeof isSubSpindleCycle == "function") && isSubSpindleCycle(cycleType)) {
    if (!gotSecondarySpindle) {
      error(localize("Secondary spindle is not available."));
    }

    writeln("");
    if (hasParameter("operation-comment")) {
      var comment = getParameter("operation-comment");
      if (comment) {
        writeComment(comment);
      }
    }

    if (!machineState.stockTransferIsActive) {
      setCoolant(COOLANT_OFF);
      writeRetract(currentSection, false); // no retract in Z

      // wcs required here
      currentWorkOffset = undefined;
      writeWCS(currentSection);

      // preload next cutting tool
      preloadCutoffTool();
    }

    switch (cycleType) {
    case "secondary-spindle-grab":
      writeBlock(conditional(machineState.cAxisIsEngaged, getCode("DISENGAGE_C_AXIS")));
      if (cycle.usePartCatcher) {
        engagePartCatcher(true);
      }
      writeBlock(gFeedModeModal.format(getCode("FEED_MODE_UNIT_MIN"))); // mm/rev
      if (cycle.stopSpindle) { // no spindle rotation
        writeBlock(getCode("STOP_SPINDLE"));
        writeBlock(mFormat.format(19));
        writeBlock(mFormat.format(119), "R" + abcFormat.format(cycle.spindleOrientation));
        lastSpindleSpeed = 0;
      } else { // spindle rotation
        var transferCodes = getSpindleTransferCodes();
        writeBlock(getCode("CONSTANT_SURFACE_SPEED_OFF"));
        writeBlock(sOutput.format(transferCodes.spindleRPM), transferCodes.spindleDirection ? getCode("START_MAIN_SPINDLE_CW") : getCode("START_MAIN_SPINDLE_CCW"));
        writeBlock(pOutput.format(transferCodes.spindleRPM), transferCodes.spindleDirection ? getCode("START_SUB_SPINDLE_CCW") : getCode("START_SUB_SPINDLE_CW")); // inverted
        writeBlock(getCode("SPINDLE_SYNCHRONIZATION_ON"), "R" + abcFormat.format(cycle.spindleOrientation), formatComment("SPINDLE SYNCHRONIZATION ON")); // Sync spindles
        lastSpindleSpeed = transferCodes.spindleRPM;
        lastSpindleMode = SPINDLE_CONSTANT_SPINDLE_SPEED;
        lastSpindleDirection = transferCodes.spindleDirection;
        forceSpindleSpeed = true;
      }
      if (getProperty("cleanAir")) {
        writeBlock(getCode("MAINSPINDLE_AIR_BLAST_ON"), formatComment("MAINSPINDLE AIR BLAST ON"));
        writeBlock(getCode("SUBSPINDLE_AIR_BLAST_ON"), formatComment("SUBSPINDLE AIR BLAST ON"));
      }
      writeBlock(
        getCode(currentSection.spindle == SPINDLE_PRIMARY ? "UNCLAMP_SECONDARY_CHUCK" : "UNCLAMP_PRIMARY_CHUCK"),
        formatComment(currentSection.spindle == SPINDLE_PRIMARY ? "UNCLAMP SECONDARY CHUCK" : "UNCLAMP PRIMARY CHUCK")
      );
      onDwell(cycle.dwell);
      gMotionModal.reset();
      writeBlock(conditional(cycle.useMachineFrame, gFormat.format(53)), gMotionModal.format(0), "B" + spatialFormat.format(cycle.feedPosition));
      if (getProperty("cleanAir")) {
        writeBlock(getCode("MAINSPINDLE_AIR_BLAST_OFF"), formatComment("MAINSPINDLE AIR BLAST OFF"));
        writeBlock(getCode("SUBSPINDLE_AIR_BLAST_OFF"), formatComment("SUBSPINDLE AIR BLAST OFF"));
      }

      onDwell(cycle.dwell);
      writeBlock(conditional(cycle.useMachineFrame, gFormat.format(53)), gMotionModal.format(1), "B" + spatialFormat.format(cycle.chuckPosition), getFeed(cycle.feedrate));
      writeBlock(
        getCode(currentSection.spindle == SPINDLE_PRIMARY ? "CLAMP_SECONDARY_CHUCK" : "CLAMP_PRIMARY_CHUCK"),
        formatComment(currentSection.spindle == SPINDLE_PRIMARY ? "CLAMP SECONDARY CHUCK" : "CLAMP PRIMARY CHUCK")
      );
      onDwell(cycle.dwell * 1.5);
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
        writeBlock(getCode("UNCLAMP_PRIMARY_CHUCK"), formatComment("UNCLAMP PRIMARY CHUCK"));
        onDwell(cycle.dwell);
        writeBlock(
          conditional(pullMethod.machineFrame, gFormat.format(53)),
          gMotionModal.format(1),
          "B" + spatialFormat.format(pullMethod.pullPosition),
          getFeed(cycle.feedrate)
        );
      }

      // move subspindle to home
      if (pullMethod.home) {
        setCoolant(COOLANT_OFF);
        if (pullMethod.unclampMode == "unclamp-secondary") { // leave part in main spindle
          if (pullMethod.pull) {
            writeBlock(getCode("CLAMP_PRIMARY_CHUCK"), formatComment("CLAMP PRIMARY CHUCK"));
          }
          onDwell(cycle.dwell * 1.5);
          writeBlock(getCode("UNCLAMP_SECONDARY_CHUCK"), formatComment("UNCLAMP SECONDARY CHUCK"));
          onDwell(cycle.dwell);
        } else if (pullMethod.unclampMode == "unclamp-primary") {
          if (!pullMethod.pull) {
            writeBlock(getCode("UNCLAMP_PRIMARY_CHUCK"), formatComment("UNCLAMP PRIMARY CHUCK"));
            onDwell(cycle.dwell);
          }
        }
        writeBlock(gMotionModal.format(0), gFormat.format(53), "B" + spatialFormat.format(getProperty("workPositionSub")));

        if (machineState.spindleSynchronizationIsActive) { // spindles are synchronized
          if (pullMethod.unclampMode == "unclamp-secondary") {
            writeBlock(getCode("CLAMP_SECONDARY_CHUCK"), formatComment("CLAMP SECONDARY CHUCK"));
          } else if (pullMethod.unclampMode == "unclamp-primary") {
            writeBlock(getCode("CLAMP_PRIMARY_CHUCK"), formatComment("CLAMP PRIMARY CHUCK"));
          }
          writeBlock(getCode("SPINDLE_SYNCHRONIZATION_OFF"), formatComment("SPINDLE SYNCHRONIZATION OFF")); // disable spindle sync
        }
        if (pullMethod.unclampMode == "unclamp-primary" || pullMethod.unclampMode == "keep-clamped") {
          writeBlock(getCode("STOP_SPINDLE"));
        } else {
          writeBlock(getCode("STOP_SUB_SPINDLE"));
        }
      } else {
        writeBlock(getCode("CLAMP_PRIMARY_CHUCK"), formatComment("CLAMP PRIMARY CHUCK"));
        onDwell(cycle.dwell * 1.5);
      }
      machineState.stockTransferIsActive = true;
      break;
    }
  }
}

var saveShowSequenceNumbers;
var pathBlockNumber = {start:0, end:0};
var isCannedCycle = false;

function onCyclePath() {
  saveShowSequenceNumbers = showSequenceNumbers;
  isCannedCycle = true;
  // buffer all paths and stop feeds being output
  feedOutput.disable();
  showSequenceNumbers = "false";
  redirectToBuffer();
  gMotionModal.reset();
  if ((hasParameter("operation:grooving") && getParameter("operation:grooving").toUpperCase() != "OFF")) {
    xOutput.reset();
    zOutput.reset();
  }
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
    writeBlock(gFormat.format(verticalPasses ? 72 : 71),
      "P" + (getStartEndSequenceNumber(cyclePath, true)),
      "Q" + (getStartEndSequenceNumber(cyclePath, false)),
      "U" + xFormat.format(cycle.xStockToLeave),
      "W" + spatialFormat.format(cycle.zStockToLeave),
      "D" + spatialFormat.format(cycle.depthOfCut),
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
    isCannedCycle = false;
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

function getCommonCycle(x, y, z, r) {
  if (machineState.usePolarCoordinates) { // Polar coordinates mode
    var polarPosition = getPolarPosition(x, y, z);
    setCurrentPositionAndDirection(polarPosition);
    if (currentSection.spindle == SPINDLE_SECONDARY) {
      xOutput.reset();
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      writeBlock(cOutput.format(polarPosition.second.z));
      onCommand(COMMAND_LOCK_MULTI_AXIS);
      return [xOutput.format(polarPosition.first.x), zOutput.format(polarPosition.first.z),
        (r !== undefined) ? ("R" + spatialFormat.format((gPlaneModal.getCurrent() == 19) ? r * 2 : r)) : ""];
    } else {
      xOutput.reset();
      cOutput.reset();
      return [xOutput.format(polarPosition.first.x), cOutput.format(polarPosition.second.z),
        zOutput.format(polarPosition.first.z),
        "R" + spatialFormat.format(r)];
    }
  } else {
    xOutput.reset();
    if (!isAxialCenterDrilling(currentSection, true) && !isTappingCycle()) {
      yOutput.reset();
    }
    zOutput.reset();
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z),
      (r !== undefined) ? ("R" + spatialFormat.format((gPlaneModal.getCurrent() == 19) ? r * 2 : r)) : ""];
  }
}

function writeCycleClearance() {
  if (true) {
    switch (gPlaneModal.getCurrent()) {
    case 18:
      writeBlock(gMotionModal.format(0), zOutput.format(cycle.clearance));
      break;
    case 19:
      writeBlock(gMotionModal.format(0), xOutput.format(cycle.clearance));
      break;
    default:
      error(localize("Unsupported drilling orientation."));
      return;
    }
  }
}

var threadNumber = 0;
var numberOfThreads = 1;
function onCyclePoint(x, y, z) {

  if (!getProperty("useCycles") || currentSection.isMultiAxis() || getMachiningDirection(currentSection) == MACHINING_DIRECTION_INDEXING) {
    expandCyclePoint(x, y, z);
    return;
  }
  writeBlock(gPlaneModal.format(getPlane()));

  var gCycleTapping;
  switch (cycleType) {
  case "tapping-with-chip-breaking":
  case "right-tapping":
  case "left-tapping":
  case "tapping":
    if (gPlaneModal.getCurrent() == 19) { // radial
      if (tool.type == TOOL_TAP_LEFT_HAND) {
        gCycleTapping = 196;
      } else {
        gCycleTapping = 195;
      }
    } else { // axial
      if (tool.type == TOOL_TAP_LEFT_HAND) {
        gCycleTapping = machineState.axialCenterDrilling ? 184 : 186;
      } else {
        gCycleTapping = machineState.axialCenterDrilling ? 84 : 95;
      }
    }
    break;
  }

  switch (cycleType) {
  case "thread-turning":
    // find number of threads and count which thread we are on
    numberOfThreads = 1;
    if ((hasParameter("operation:doMultipleThreads") && (getParameter("operation:doMultipleThreads") != 0))) {
      numberOfThreads = getParameter("operation:numberOfThreads");
    }
    if (isFirstCyclePoint()) {
      // increment thread number for multiple threads
      threadNumber += 1;
    }

    var threadPhaseAngle = (360 / numberOfThreads) * (threadNumber - 1);

    if (getProperty("useSimpleThread")) {
      var i = -cycle.incrementalX; // positive if taper goes down - delta radius

      // move to thread start for infeed angle other than 0, multiple threads and alternate infeed.
      if (zFormat.areDifferent(zOutput.getCurrent(), zFormat.getResultingValue(z))) {
        var zOut = zOutput.format(z - cycle.incrementalZ);
        if (zOut) {
          writeBlock(gMotionModal.format(0), zOut);
        }
        g92IOutput.reset();
        g92QOutput.reset();
        gCycleModal.reset();
        forceFeed();
        xOutput.reset();
        zOutput.reset();
      }

      writeBlock(
        gCycleModal.format(92),
        xOutput.format(x - cycle.incrementalX),
        yOutput.format(y),
        zOutput.format(z),
        conditional(zFormat.isSignificant(i), g92IOutput.format(i)),
        conditional(numberOfThreads > 1, g92QOutput.format(threadPhaseAngle)),
        feedOutput.format(cycle.pitch)
      );
    } else {
      if (isLastCyclePoint()) {
        // thread height and depth of cut
        var threadHeight = getParameter("operation:threadDepth");
        var firstDepthOfCut = cycle.firstPassDepth ? cycle.firstPassDepth : threadHeight - Math.abs(getCyclePoint(0).x - x);
        var cuttingAngle = getParameter("operation:infeedAngle", 29.5) * 2; // Angle is not stored with tool. toDeg(tool.getTaperAngle());
        var i = -cycle.incrementalX; // positive if taper goes down - delta radius
        gCycleModal.reset();

        var threadInfeedMode = "constant";
        if (hasParameter("operation:infeedMode")) {
          threadInfeedMode = getParameter("operation:infeedMode");
        }

        //  Cutting Method:
        //  P1 = Constant Amount/1 Edge
        //  P2 = Constant Amount/Both Edges
        //  P3 = Constant Depth/One Edge
        //  P4 = Constant Depth/Both Edges >>>>>> not supported

        var threadCuttingMode = 3;
        if (threadInfeedMode == "reduced") {
          threadCuttingMode = 1;
        } else if (threadInfeedMode == "constant") {
          threadCuttingMode = 3;
        } else if (threadInfeedMode == "alternate") {
          threadCuttingMode = 2;
        } else {
          error(localize("Unsupported Infeed Mode."));
          return;
        }

        // threading cycle
        gCycleModal.reset();
        xOutput.reset();
        zOutput.reset();
        writeBlock(
          gCycleModal.format(76),
          xOutput.format(x - cycle.incrementalX),
          zOutput.format(z),
          conditional(zFormat.isSignificant(i), g76IOutput.format(i)),
          g76KOutput.format(threadHeight),
          g76DOutput.format(firstDepthOfCut),
          g76AOutput.format(cuttingAngle),
          "P" + integerFormat.format(threadCuttingMode),
          conditional(numberOfThreads > 1, g76QOutput.format(threadPhaseAngle)),
          pitchOutput.format(cycle.pitch)
        );
      }
    }
    gMotionModal.reset();
    return;
  }
  if (true) {
    if (isDrillingCycle(false) && (gPlaneModal.getCurrent() == 17)) {
      error(localize("Drilling in G17 is not supported."));
      return;
    }
    // repositionToCycleClearance(cycle, x, y, z);
    // return to initial Z which is clearance plane and set absolute mode
    feedOutput.reset();

    var P = (cycle.dwell == 0) ? 0 : clamp(1, cycle.dwell * 1000, 99999999); // in milliseconds

    switch (cycleType) {
    case "drilling":
      writeCycleClearance();
      writeBlock(
        gCycleModal.format(gPlaneModal.getCurrent() == 19 ? 241 : 81),
        getCommonCycle(x, y, z, cycle.retract),
        getFeed(cycle.feedrate)
      );
      break;
    case "counter-boring":
      writeCycleClearance();
      if (P > 0) {
        writeBlock(
          gCycleModal.format(gPlaneModal.getCurrent() == 19 ? 242 : 82),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + milliFormat.format(P),
          getFeed(cycle.feedrate)
        );
      } else {
        writeBlock(
          gCycleModal.format(gPlaneModal.getCurrent() == 19 ? 241 : 81),
          getCommonCycle(x, y, z, cycle.retract),
          getFeed(cycle.feedrate)
        );
      }
      break;
    case "chip-breaking":
    case "deep-drilling":
      if (cycleType == "chip-breaking" && (cycle.accumulatedDepth < cycle.depth)) {
        expandCyclePoint(x, y, z);
        return;
      } else {
        writeCycleClearance();
        writeBlock(
          gCycleModal.format(gPlaneModal.getCurrent() == 19 ? 243 : 83),
          getCommonCycle(x, y, z, cycle.retract),
          "Q" + spatialFormat.format(cycle.incrementalDepth), // lathe prefers single Q peck value, IJK causes error
          // "I" + spatialFormat.format(cycle.incrementalDepth),
          // "J" + spatialFormat.format(cycle.incrementalDepthReduction),
          // "K" + spatialFormat.format(cycle.minimumIncrementalDepth),
          conditional(P > 0, "P" + milliFormat.format(P)),
          getFeed(cycle.feedrate)
        );
      }
      break;
    case "tapping":
      writeCycleClearance();
      if (gPlaneModal.getCurrent() == 19) {
        xOutput.reset();
        writeBlock(gMotionModal.format(0), zOutput.format(z), yOutput.format(y));
        writeBlock(gMotionModal.format(0), xOutput.format(cycle.retract));
        writeBlock(
          gCycleModal.format(gCycleTapping),
          getCommonCycle(x, y, z, undefined),
          getFeed(cycle.feedrate)
        );
      } else {
        writeBlock(
          gCycleModal.format(gCycleTapping),
          getCommonCycle(x, y, z, cycle.retract),
          getFeed(cycle.feedrate)
        );
      }
      forceFeed();
      break;
    case "left-tapping":
      writeCycleClearance();
      xOutput.reset();
      if (gPlaneModal.getCurrent() == 19) {
        writeBlock(gMotionModal.format(0), zOutput.format(z), yOutput.format(y));
        writeBlock(gMotionModal.format(0), xOutput.format(cycle.retract));
      }
      writeBlock(
        gCycleModal.format(gCycleTapping),
        getCommonCycle(x, y, z, (gPlaneModal.getCurrent() == 19) ? undefined : cycle.retract),
        getFeed(cycle.feedrate)
      );
      forceFeed();
      break;
    case "right-tapping":
      writeCycleClearance();
      xOutput.reset();
      if (gPlaneModal.getCurrent() == 19) {
        writeBlock(gMotionModal.format(0), zOutput.format(z), yOutput.format(y));
        writeBlock(gMotionModal.format(0), xOutput.format(cycle.retract));
      }
      writeBlock(
        gCycleModal.format(gCycleTapping),
        getCommonCycle(x, y, z, (gPlaneModal.getCurrent() == 19) ? undefined : cycle.retract),
        getFeed(cycle.feedrate)
      );
      forceFeed();
      break;
    case "tapping-with-chip-breaking":
      writeCycleClearance();
      xOutput.reset();
      if (gPlaneModal.getCurrent() == 19) {
        writeBlock(gMotionModal.format(0), zOutput.format(z), yOutput.format(y));
        writeBlock(gMotionModal.format(0), xOutput.format(cycle.retract));
      }

      // Parameter 57 bit 6, REPT RIG TAP, is set to 1 (On)
      // On Mill software versions12.09 and above, REPT RIG TAP has been moved from the Parameters to Setting 133
      warningOnce(localize("For tapping with chip breaking make sure REPT RIG TAP (Setting 133) is enabled on your Haas."), WARNING_REPEAT_TAPPING);

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
        if (first) {
          first = false;
          writeBlock(
            gCycleModal.format(gCycleTapping),
            getCommonCycle((gPlaneModal.getCurrent() == 19) ? u : x, y, (gPlaneModal.getCurrent() == 19) ? z : u, (gPlaneModal.getCurrent() == 19) ? undefined : cycle.retract),
            getFeed(cycle.feedrate)
          );
        } else {
          writeBlock(
            gCycleModal.format(gCycleTapping),
            conditional(gPlaneModal.getCurrent() == 18, "Z" + spatialFormat.format(u)),
            conditional(gPlaneModal.getCurrent() == 19, "X" + xFormat.format(u)),
            getFeed(cycle.feedrate)
          );
        }
        forceFeed();
      }
      break;
    case "fine-boring":
      expandCyclePoint(x, y, z);
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (gPlaneModal.getCurrent() == 19) {
        expandCyclePoint(x, y, z);
      } else {
        writeCycleClearance();
        writeBlock(
          gCycleModal.format(85),
          getCommonCycle(x, y, z, cycle.retract),
          getFeed(cycle.feedrate)
        );
      }
      break;
    case "stop-boring":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeCycleClearance();
        writeBlock(
          gCycleModal.format((gPlaneModal.getCurrent() == 19) ? 246 : 86),
          getCommonCycle(x, y, z, cycle.retract),
          getFeed(cycle.feedrate)
        );
      }
      break;
    case "boring":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeCycleClearance();
        writeBlock(
          gCycleModal.format((gPlaneModal.getCurrent() == 19) ? 245 : 85),
          getCommonCycle(x, y, z, cycle.retract),
          getFeed(cycle.feedrate)
        );
      }
      break;
    default:
      expandCyclePoint(x, y, z);
    }
    if (!cycleExpanded) {
      writeBlock(gCycleModal.format(80));
      gMotionModal.reset();
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else if (isPolarModeActive()) {
      var polarPosition = getPolarPosition(x, y, z);
      setCurrentPositionAndDirection(polarPosition);
      if (currentSection.spindle == SPINDLE_SECONDARY) {
        xOutput.reset();
        onCommand(COMMAND_UNLOCK_MULTI_AXIS);
        writeBlock(cOutput.format(polarPosition.second.z));
        onCommand(COMMAND_LOCK_MULTI_AXIS);
        writeBlock(xOutput.format(polarPosition.first.x));
      } else {
        xOutput.reset();
        cOutput.reset();
        writeBlock(xOutput.format(polarPosition.first.x), cOutput.format(polarPosition.second.z));
        writeBlock(_x, _c);
      }
    } else {
      var _x = xOutput.format(x);
      var _y = yOutput.format(y);
      var _z = zOutput.format(z);
      if (!_x && !_y && !_z) {
        switch (gPlaneModal.getCurrent()) {
        case 18: // ZX
          xOutput.reset(); // at least one axis is required
          yOutput.reset(); // at least one axis is required
          _x = xOutput.format(x);
          _y = yOutput.format(y);
          break;
        case 19: // YZ
          yOutput.reset(); // at least one axis is required
          zOutput.reset(); // at least one axis is required
          _y = yOutput.format(y);
          _z = zOutput.format(z);
          break;
        }
      }
      writeBlock(_x, _y, _z);
    }
  }
}

function onCycleEnd() {
  if (!cycleExpanded && !machineState.stockTransferIsActive && !((typeof isSubSpindleCycle == "function") && isSubSpindleCycle(cycleType)) &&
      cycleType != "turning-canned-rough") {
    switch (cycleType) {
    case "thread-turning":
      forceFeed();
      g92IOutput.reset();
      g92QOutput.reset();
      gCycleModal.reset();
      xOutput.reset();
      zOutput.reset();
      if (threadNumber == numberOfThreads) {
        threadNumber = 0;
      }
      break;
    default:
      writeBlock(gCycleModal.format(80));
      gMotionModal.reset();
    }
  }
}

function onPassThrough(text) {
  var commands = String(text).split(",");
  for (text in commands) {
    writeBlock(commands[text]);
  }
}

function onParameter(name, value) {
  var invalid = false;
  if (name == "action") {
    if (String(value).toUpperCase() == "USEPOLARMODE" ||
      String(value).toUpperCase() == "USEPOLARINTERPOLATION") {
      forcePolarInterpolation = true;
    } else if (String(value).toUpperCase() == "USEXZCMODE" ||
      String(value).toUpperCase() == "USEPOLARCOORDINATES") {
      forcePolarCoordinates = true;
    } else {
      var sText1 = String(value);
      var sText2 = new Array();
      sText2 = sText1.split(":");
      if (sText2.length != 2) {
        if (sText2[0].toUpperCase() == "PARTEJECT") {
          ejectRoutine = "yes";
          return;
        } else {
          error(localize("Invalid action command: ") + value);
          return;
        }
      }
      if (sText2[0].toUpperCase() == "PARTEJECT") {
        if (parseChoice(String(sText2[1]), "yes", "no", "stopped") >= 0) {
          ejectRoutine = String(sText2[1]).toLowerCase();
        } else {
          invalid = true;
        }
      } else {
        invalid = true;
      }
    }
    if (invalid) {
      error(localize("Invalid action parameter: ") + sText2[0] + ":" + sText2[1]);
      return;
    }
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
  if (getSpindle(TOOL) == SPINDLE_MAIN) {
    localCoolant = turret == 1 ? coolant.spindle1t1 : coolant.spindle1t2;
    localCoolant = typeof localCoolant == "undefined" ? coolant.spindle1 : localCoolant;
  } else if (getSpindle(TOOL) == SPINDLE_LIVE) {
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
  if ((getSpindle(TOOL) != SPINDLE_LIVE) && rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) { // avoid redundant output of spindle speed
    startSpindle(false, getFramePosition(currentSection.getInitialPosition()), spindleSpeed);
  } else if ((getSpindle(TOOL) == SPINDLE_LIVE) && rpmFormat.areDifferent(spindleSpeed, pOutput.getCurrent())) { // avoid redundant output of spindle speed
    startSpindle(false, getFramePosition(currentSection.getInitialPosition()), spindleSpeed);
  }
}

function startSpindle(forceRPMMode, initialPosition, rpm) {
  var _skipBlock = skipBlock;
  var _spindleSpeed = spindleSpeed;
  if (rpm !== undefined) {
    _spindleSpeed = rpm;
  }

  var useConstantSurfaceSpeed = currentSection.getTool().getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED;
  var maxSpeed = (currentSection.spindle == SPINDLE_SECONDARY) ? getProperty("subMaximumSpindleSpeed") : getProperty("maximumSpindleSpeed");
  var maximumSpindleSpeed = (tool.maximumSpindleSpeed > 0) ? Math.min(tool.maximumSpindleSpeed, maxSpeed) : maxSpeed;
  if (useConstantSurfaceSpeed && !forceRPMMode) {
    skipBlock = _skipBlock;
    writeBlock(gFormat.format(50), sOutput.format(maximumSpindleSpeed));
  } else if (!isFirstSection()) { // maximum spindle speed needs to be set when switching from SFM to RPM
    var prevConstantSurfaceSpeed = getPreviousSection().getTool().getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED;
    if (prevConstantSurfaceSpeed && !useConstantSurfaceSpeed) {
      writeBlock(gFormat.format(50), sOutput.format(maxSpeed));
    }
  }

  gSpindleModeModal.reset();
  skipBlock = _skipBlock;
  if (useConstantSurfaceSpeed && !forceRPMMode) {
    writeBlock(getCode("CONSTANT_SURFACE_SPEED_ON"));
  } else {
    writeBlock(getCode("CONSTANT_SURFACE_SPEED_OFF"));
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
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) { // turning main spindle
      skipBlock = _skipBlock;
      writeBlock(
        sOutput.format(_spindleSpeed),
        conditional(!tapping, tool.clockwise ? getCode("START_MAIN_SPINDLE_CW") : getCode("START_MAIN_SPINDLE_CCW"))
      );
    } else { // milling main spindle
      skipBlock = _skipBlock;
      writeBlock(
        (tapping ? sOutput.format(spindleSpeed) : pOutput.format(_spindleSpeed)),
        conditional(!tapping, tool.clockwise ? getCode("START_LIVE_TOOL_CW") : getCode("START_LIVE_TOOL_CCW"))
      );
    }
    break;
  case SPINDLE_SECONDARY: // sub spindle
    if (!gotSecondarySpindle) {
      error(localize("Secondary spindle is not available."));
      return;
    }
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) { // turning sub spindle
      gSpindleModeModal.reset();
      skipBlock = _skipBlock;
      writeBlock(
        sOutput.format(_spindleSpeed),
        conditional(!tapping, tool.clockwise ? getCode("START_SUB_SPINDLE_CW") : getCode("START_SUB_SPINDLE_CCW"))
      );
    } else { // milling sub spindle
      skipBlock = _skipBlock;
      writeBlock(pOutput.format(_spindleSpeed), tool.clockwise ? getCode("START_LIVE_TOOL_CW") : getCode("START_LIVE_TOOL_CCW"));
    }
    break;
  }

  if (getProperty("useSSV")) {
    if (machineState.isTurningOperation && hasParameter("operation-strategy") && getParameter("operation-strategy") != "turningThread") {
      skipBlock = _skipBlock;
      writeBlock(ssvModal.format(38));
    }
  }
  lastSpindleMode = tool.getSpindleMode();
  lastSpindleSpeed = _spindleSpeed;
  lastSpindleDirection = tool.clockwise;
}

function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    setCoolant(COOLANT_OFF);
    break;
  case COMMAND_COOLANT_ON:
    setCoolant(tool.coolant);
    break;
  case COMMAND_START_SPINDLE:
    if (machineState.isTurningOperation || machineState.axialCenterDrilling) {
      if (currentSection.spindle == SPINDLE_PRIMARY) {
        writeBlock(tool.clockwise ? getCode("START_MAIN_SPINDLE_CW") : getCode("START_MAIN_SPINDLE_CCW"));
      } else {
        writeBlock(tool.clockwise ? getCode("START_SUB_SPINDLE_CW") : getCode("START_SUB_SPINDLE_CCW"));
      }
    } else {
      writeBlock(tool.clockwise ? getCode("START_LIVE_TOOL_CW") : getCode("START_LIVE_TOOL_CCW"));
    }
    break;
  case COMMAND_STOP_SPINDLE:
    if (getProperty("useSSV")) {
      writeBlock(ssvModal.format(39));
    }
    writeBlock(getCode("STOP_SPINDLE"));
    break;
  case COMMAND_LOCK_MULTI_AXIS:
    writeBlock(getCode((currentSection.spindle == SPINDLE_PRIMARY) ? "MAIN_SPINDLE_BRAKE_ON" : "SUB_SPINDLE_BRAKE_ON"));
    break;
  case COMMAND_UNLOCK_MULTI_AXIS:
    writeBlock(getCode((currentSection.spindle == SPINDLE_PRIMARY) ? "MAIN_SPINDLE_BRAKE_OFF" : "SUB_SPINDLE_BRAKE_OFF"));
    break;
  case COMMAND_START_CHIP_TRANSPORT:
    writeBlock(getCode("START_CHIP_TRANSPORT"));
    break;
  case COMMAND_STOP_CHIP_TRANSPORT:
    writeBlock(getCode("STOP_CHIP_TRANSPORT"));
    break;
  case COMMAND_OPEN_DOOR:
    if (gotDoorControl) {
      writeBlock(getCode("OPEN_DOOR")); // optional
    }
    break;
  case COMMAND_CLOSE_DOOR:
    if (gotDoorControl) {
      writeBlock(getCode("CLOSE_DOOR")); // optional
    }
    break;
  case COMMAND_BREAK_CONTROL:
    break;
  case COMMAND_TOOL_MEASURE:
    break;
  case COMMAND_ACTIVATE_SPEED_FEED_SYNCHRONIZATION:
    break;
  case COMMAND_DEACTIVATE_SPEED_FEED_SYNCHRONIZATION:
    break;
  case COMMAND_STOP:
    if (!skipBlock) {
      forceSpindleSpeed = true;
      forceCoolant = true;
    }
    writeBlock(mFormat.format(0));
    break;
  case COMMAND_OPTIONAL_STOP:
    if (!skipBlock) {
      forceSpindleSpeed = true;
      forceCoolant = true;
    }
    writeBlock(mFormat.format(1));
    break;
  case COMMAND_END:
    writeBlock(mFormat.format(2));
    break;
  case COMMAND_ORIENTATE_SPINDLE:
    if (machineState.isTurningOperation) {
      if (currentSection.spindle == SPINDLE_PRIMARY) {
        writeBlock(mFormat.format(19)); // use P or R to set angle (optional)
      } else {
        writeBlock(mFormat.format(g14IsActive ? 19 : 119));
      }
    } else {
      if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
        writeBlock(mFormat.format(19)); // use P or R to set angle (optional)
      } else if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, -1))) {
        writeBlock(mFormat.format(g14IsActive ? 19 : 119));
      } else {
        error(localize("Spindle orientation is not supported for live tooling."));
        return;
      }
    }
    break;
  // case COMMAND_CLAMP: // add support for clamping
  // case COMMAND_UNCLAMP: // add support for clamping
  default:
    onUnsupportedCommand(command);
  }
}

/** Preload cutoff tool prior to spindle transfer/cutoff. */
var prePositionCutoffTool = true;
function preloadCutoffTool() {
  if (isLastSection()) {
    return;
  }
  var numberOfSections = getNumberOfSections();
  for (var i = getNextSection().getId(); i < numberOfSections; ++i) {
    var section = getSection(i);
    if (section.getParameter("operation-strategy") == "turningSecondarySpindleReturn" || section.getParameter("operation-strategy") == "turningSecondarySpindlePull") {
      continue;
    } else if (section.getType() != TYPE_TURNING || section.spindle != SPINDLE_PRIMARY) {
      break;
    } else if (section.getParameter("operation-strategy") == "turningPart") {
      var tool = section.getTool();
      var compensationOffset = tool.compensationOffset;
      writeBlock("T" + toolFormat.format(tool.number * 100 + compensationOffset));
      if (prePositionCutoffTool) {
        var initialPosition = getFramePosition(section.getInitialPosition());
        writeBlock(zOutput.format(initialPosition.z));
      }
      break;
    }
  }
  return;
}

/** Get synchronization/transfer code based on part cutoff spindle direction. */
function getSpindleTransferCodes() {
  var transferCodes = {direction:0, spindleMode:SPINDLE_CONSTANT_SPINDLE_SPEED, surfaceSpeed:0, maximumSpindleSpeed:0};
  transferCodes.spindleDirection = isFirstSection() ? true : getPreviousSection().getTool().clockwise; // clockwise
  transferCodes.spindleRPM = cycle.spindleSpeed;
  if (isLastSection()) {
    return transferCodes;
  }
  var numberOfSections = getNumberOfSections();
  for (var i = getNextSection().getId(); i < numberOfSections; ++i) {
    var section = getSection(i);
    if (section.getParameter("operation-strategy") == "turningSecondarySpindleReturn" || section.getParameter("operation-strategy") == "turningSecondarySpindlePull") {
      continue;
    } else if (section.getType() != TYPE_TURNING || section.spindle != SPINDLE_PRIMARY) {
      break;
    } else if (section.getType() == TYPE_TURNING) {
      var tool = section.getTool();
      transferCodes.spindleMode = tool.getSpindleMode();
      transferCodes.surfaceSpeed = tool.surfaceSpeed;
      transferCodes.maximumSpindleSpeed = tool.maximumSpindleSpeed;
      transferCodes.spindleDirection = tool.clockwise;
      break;
    }
  }
  return transferCodes;
}

function ejectPart() {
  writeln("");
  writeComment(localize("PART EJECT"));

  gMotionModal.reset();
  //writeBlock(gFormat.format(330)); // retract bar feeder
  //goHome(); // Position all axes to home position

  if (gotYAxis) {
    writeBlock(gFormat.format(53), gMotionModal.format(0), "Y" + yFormat.format(getProperty("homePositionY"))); // retract
    yOutput.reset();
  }
  writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX"))); // retract
  writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + zFormat.format(currentSection.spindle == SPINDLE_SECONDARY ? getProperty("homePositionSubZ") : getProperty("homePositionZ"))); // retract
  if (gotSecondarySpindle) {
    writeBlock(gFormat.format(53), gMotionModal.format(0), "B" + spatialFormat.format(getProperty("ejectPositionSub")));
  }

  onCommand(COMMAND_UNLOCK_MULTI_AXIS);
  if (!getProperty("optimizeCAxisSelect")) {
    cAxisEngageModal.reset();
  }
  writeBlock(
    gFeedModeModal.format(getCode("FEED_MODE_UNIT_MIN")),
    gPlaneModal.format(17),
    getCode("DISENGAGE_C_AXIS")
  );
  gSpindleModeModal.reset();
  if (ejectRoutine == "stopped") {
    writeBlock(getCode("STOP_SPINDLE"));
  } else {
    writeBlock(
      getCode("CONSTANT_SURFACE_SPEED_OFF"),
      sOutput.format(50),
      getCode(currentSection.spindle == SPINDLE_SECONDARY ? "START_SUB_SPINDLE_CW" : "START_MAIN_SPINDLE_CW")
    );
  }
  writeBlock(getCode("PART_CATCHER_ON"));
  onDwell(1.5);
  writeBlock(getCode(currentSection.spindle == SPINDLE_SECONDARY ? "UNCLAMP_SECONDARY_CHUCK" : "UNCLAMP_PRIMARY_CHUCK"));
  onDwell(1.5);
  writeBlock(getCode("PART_CATCHER_OFF"));
  onDwell(1.1);

  // clean out chips
  if (getProperty("cleanAir")) {
    writeBlock(getCode(currentSection.spindle == SPINDLE_SECONDARY ? "SUBSPINDLE_AIR_BLAST_ON" : "MAINSPINDLE_AIR_BLAST_ON"),
      formatComment("AIR BLAST ON"));
    onDwell(2.5);
    writeBlock(getCode(currentSection.spindle == SPINDLE_SECONDARY ? "SUBSPINDLE_AIR_BLAST_OFF" : "MAINSPINDLE_AIR_BLAST_OFF"),
      formatComment("AIR BLAST OFF"));
  }
  writeBlock(getCode("STOP_SPINDLE"));
  setCoolant(COOLANT_OFF);
  writeComment(localize("END OF PART EJECT"));
  writeln("");
}

function engagePartCatcher(engage) {
  if (engage) {
    // catch part here
    writeBlock(getCode("PART_CATCHER_ON"), formatComment(localize("PART CATCHER ON")));
  } else {
    onCommand(COMMAND_COOLANT_OFF);
    if (gotYAxis) {
      writeBlock(gFormat.format(53), gMotionModal.format(0), "Y" + yFormat.format(getProperty("homePositionY"))); // retract
      yOutput.reset();
    }
    writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX"))); // retract
    writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + zFormat.format(currentSection.spindle == SPINDLE_SECONDARY ? getProperty("homePositionSubZ") : getProperty("homePositionZ"))); // retract
    writeBlock(getCode("PART_CATCHER_OFF"), formatComment(localize("PART CATCHER OFF")));
    forceXYZ();
  }
}

function onSectionEnd() {

  if (currentSection.partCatcher) {
    engagePartCatcher(false);
  }

  if (machineState.usePolarInterpolation) {
    setPolarInterpolation(false); // disable polar interpolation mode
  }

  if (isPolarModeActive()) {
    setPolarCoordinates(false); // disable Polar coordinates mode
  }

  // cancel SFM mode to preserve spindle speed
  if ((tool.getSpindleMode() == SPINDLE_CONSTANT_SURFACE_SPEED) && !machineState.stockTransferIsActive) {
    startSpindle(true, getFramePosition(currentSection.getFinalPosition()));
  }

  if (getProperty("useG61")) {
    writeBlock(gExactStopModal.format(64));
  }

  if (((getCurrentSectionId() + 1) >= getNumberOfSections()) ||
      (tool.number != getNextSection().getTool().number)) {
    onCommand(COMMAND_BREAK_CONTROL);
  }

  if ((currentSection.getType() == TYPE_MILLING) &&
      (!hasNextSection() || (hasNextSection() && (getNextSection().getType() != TYPE_MILLING)))) {
    // exit milling mode
    if (isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      // +Z
    } else {
      writeBlock(getCode("STOP_SPINDLE"));
    }
  }

  if (machineState.cAxisIsEngaged && !getProperty("optimizeCAxisSelect")) {
    writeBlock(getCode("DISENGAGE_C_AXIS")); // used for c-axis encoder reset
    forceWorkPlane(); // needed since re-engage would result in undefined c-axis position
  }

  forcePolarCoordinates = false;
  forcePolarInterpolation = false;
  partCutoff = false;
  forceAny();
}

function onClose() {
  writeln("");

  optionalSection = false;

  onCommand(COMMAND_COOLANT_OFF);

  if (getProperty("gotChipConveyor")) {
    onCommand(COMMAND_STOP_CHIP_TRANSPORT);
  }

  if (getNumberOfSections() > 0) { // Retracting Z first causes safezone overtravel error to keep from crashing into subspindle. Z should already be retracted to and end of section.
    var section = getSection(getNumberOfSections() - 1);
    if ((section.getType() != TYPE_TURNING) && isSameDirection(section.workPlane.forward, new Vector(0, 0, 1))) {
      writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX")), conditional(gotYAxis, "Y" + yFormat.format(getProperty("homePositionY")))); // retract
      xOutput.reset();
      yOutput.reset();
      writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + zFormat.format((currentSection.spindle == SPINDLE_SECONDARY) ? getProperty("homePositionSubZ") : getProperty("homePositionZ"))); // retract
      zOutput.reset();
      writeBlock(getCode("STOP_SPINDLE"));
    } else {
      if (gotYAxis) {
        writeBlock(gFormat.format(53), gMotionModal.format(0), "Y" + yFormat.format(getProperty("homePositionY"))); // retract
      }
      writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX"))); // retract
      xOutput.reset();
      yOutput.reset();
      writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + zFormat.format(currentSection.spindle == SPINDLE_SECONDARY ? getProperty("homePositionSubZ") : getProperty("homePositionZ"))); // retract
      zOutput.reset();
      writeBlock(getCode("STOP_SPINDLE"));
    }
  }
  if (machineState.tailstockIsActive) {
    writeBlock(getCode("TAILSTOCK_OFF"));
  }

  gMotionModal.reset();
  if (!getProperty("optimizeCAxisSelect")) {
    cAxisEngageModal.reset();
  }
  writeBlock(getCode("DISENGAGE_C_AXIS"));

  if (ejectRoutine != "no") {
    ejectPart();
  }

  if (gotYAxis) {
    writeBlock(gFormat.format(53), gMotionModal.format(0), "Y" + yFormat.format(getProperty("homePositionY")));
    yOutput.reset();
  }

  if (getProperty("useBarFeeder")) {
    writeln("");
    writeComment(localize("Bar feed"));
    // feed bar here
    // writeBlock(gFormat.format(53), gMotionModal.format(0), "X" + xFormat.format(getProperty("homePositionX")));
    writeBlock(gFormat.format(105));
  }

  writeln("");
  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);

  // enable spindle first used in program
  if (getSection(0).getSpindle() != getSection(getNumberOfSections() - 1).getSpindle()) {
    switch (getSection(0).getSpindle()) {
    case SPINDLE_PRIMARY:
      writeBlock(gSpindleModal.format(15));
      if (gotYAxis && g100Mirroring) {
        writeBlock(gFormat.format(100), "Y" + spatialFormat.format(0));
      }
      break;
    case SPINDLE_SECONDARY:
      if (getProperty("looping")) {
        writeBlock(gSpindleModal.format(14));
        if (gotYAxis && !g100Mirroring) {
          writeBlock(gFormat.format(101), "Y" + spatialFormat.format(0));
        }
      }
      break;
    }
  }

  if (getProperty("useM130PartImages") || getProperty("useM130ToolImages")) {
    writeBlock(mFormat.format(131));
  }

  if (getProperty("looping")) {
    writeBlock(mFormat.format(99));
  } else if (true /*!getProperty("useM97")*/) {
    onCommand(COMMAND_OPEN_DOOR);
    writeBlock(mFormat.format(getProperty("useBarFeeder") ? 99 : 30)); // stop program, spindle stop, coolant off
  } else {
    writeBlock(mFormat.format(99));
  }
  writeln("%");
}
// <<<<< INCLUDED FROM ../common/haas lathe.cps

properties.maximumSpindleSpeed.value = 3400;
properties.subMaximumSpindleSpeed.value = 3400;
