/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  HAAS VR-11 post processor configuration.

  $Revision: 44083 865c6f1c385b9194ab63e73899f0a4787fce12a6 $
  $Date: 2023-08-14 12:16:17 $

  FORKID {DBD402DA-DE90-4634-A6A3-0AE5CC97DEC7}
*/

description = "Haas VR-11";

var homePositionX = -120; // X-home position in inches
var homePositionY = 0; // Y-home position in inches
var adjustRetractHeight = true; // adjust retract height for A-axis position to avoid tool changer
highFeedrate = 360 * 25.4; // must be in MM

// >>>>> INCLUDED FROM haas/head-head/common/haas head-head.cps
///////////////////////////////////////////////////////////////////////////////
//                        MANUAL NC COMMANDS
//
// The following ACTION commands are supported by this post.
//
//     bDirection: positive, closest, negative     - Selects the preferred direction of the B-axis
//     VFD_HIGH                      - Uses high pressure flood coolant if machine has VFD
//     VFD_LOW                       - Uses low pressure flood coolant if machine has VFD
//     VFD_NORMAL                    - Uses normal pressure flood coolant if machine has VFD
//
///////////////////////////////////////////////////////////////////////////////

if (!description) {
  description = "Haas Head-Head Mill";
}
vendor = "Haas Automation";
vendorUrl = "https://www.haascnc.com";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45909;

longDescription = subst("Generic post for the %1 mill with a Next Generation control.", description);

extension = "nc";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(355);
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
allowSpiralMoves = true;
allowFeedPerRevolutionDrilling = true;
probeMultipleFeatures = true;

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
    value      : true,
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
  preloadTool: {
    title      : "Preload tool",
    description: "Preloads the next tool at a tool change (if any).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
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
    value      : 5,
    scope      : "post"
  },
  optionalStop: {
    title      : "Optional stop",
    description: "Specifies that optional stops M1 should be output at tool changes.",
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
    description: "If yes is selected, arcs are output using radius values rather than IJK.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useParametricFeed: {
    title      : "Parametric feed",
    description: "Parametric feed values based on movement type are output.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  showNotes: {
    title      : "Show notes",
    description: "Enable to output notes for operations.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useG0: {
    title      : "Use G0",
    description: "Specifies that G0s should be used for rapid moves.  Make sure that Setting 335 (LINEAR RAPID MOVE) is set to 'Linear + Rotary'.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useG28: {
    title      : "Use G28 instead of G53",
    description: "Specifies that machine retracts should be done using G28 instead of G53.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useSubroutines: {
    title      : "Use subroutines",
    description: "Select your desired subroutine option. 'All Operations' creates subroutines per each operation.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"No", id:"none"},
      {title:"All Operations", id:"allOperations"},
      {title:"Cycles", id:"cycles"},
      {title:"Patterns", id:"patterns"}
    ],
    value: "none",
    scope: "post"
  },
  useSmoothing: {
    title      : "Use G187",
    description: "G187 smoothing mode.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"Off", id:"-1"},
      {title:"Automatic", id:"9999"},
      {title:"Rough", id:"1"},
      {title:"Medium", id:"2"},
      {title:"Finish", id:"3"}
    ],
    value: "-1",
    scope: "post"
  },
  optionallyCycleToolsAtStart: {
    title      : "Optionally cycle tools at start",
    description: "Cycle through each tool used at the beginning of the program when block delete is turned off.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  measureTools: {
    title      : "Optionally measure tools at start",
    description: "Measure each tool used at the beginning of the program when block delete is turned off.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolBreakageTolerance: {
    title      : "Tool breakage tolerance",
    description: "Specifies the tolerance for which tool break detection will raise an alarm.",
    group      : "preferences",
    type       : "spatial",
    value      : 0.1,
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
  fastToolChange: {
    title      : "Fast tool change",
    description: "Skip spindle off, coolant off, and Z retract to make tool change quicker.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useG95forTapping: {
    title      : "Use G95 for tapping",
    description: "use IPR/MPR instead of IPM/MPM for tapping",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  safeRetractDistance: {
    title      : "Safe retract distance for rewinds",
    description: "Specifies the distance to add to retract distance when rewinding rotary axes.",
    group      : "multiAxis",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  safeRetractDistanceZ: {
    title      : "Safe Z-retract distance for head rotations",
    description: "Specifies the distance above the part to retract to when positioning rotary axes on a head machine.",
    group      : "multiAxis",
    type       : "spatial",
    value      : 4,
    scope      : "post"
  },
  useMultiAxisFeatures: {
    title      : "Use FCS",
    description: "Specifies that the Feature Coordinate System (G268/G269)  should be used.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  preferredTilt: {
    title      : "Preferred B-axis direction",
    description: "Select the desired direction for the B-axis.",
    group      : "multiAxis",
    type       : "enum",
    values     : [
      {title:"Positive", id:"1"},
      {title:"Closest", id:"0"},
      {title:"Negative", id:"-1"}
    ],
    value: "0",
    scope: "post"
  },
  homePositionX: {
    title      : "G53 home position X",
    description: "G53 X-axis home position used as safe tool change position.",
    group      : "homePositions",
    type       : "number",
    value      : homePositionX,
    scope      : "post"
  },
  homePositionY: {
    title      : "G53 home position Y",
    description: "G53 Y-axis home position used as safe tool change position.",
    group      : "homePositions",
    type       : "number",
    value      : homePositionY,
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
  forceHomeOnIndexing: {
    title      : "Move to home prior to head alignment",
    description: "Enable to move to the defined G53 home position in X & Y prior to a head alignment move.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  centerOnMultiAxis: {
    title      : "Move to center of model for head positioning",
    description: "Enable to move to the center of the model prior to rotating the heads in a multi-axis operation.\nUsed to avoid exceeding the XY-limits of the machine.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  adjustKnuckleAngle: {
    title      : "Automatic C-axis positioning",
    description: "Choose the automatic positioning of C-axis based on the direction of a 3-axis cut.\nDisabled - disables automatic positioning, \nPreposition - prepositions the C-axis prior to each move, \nStay down - repositions the C-axis prior to the move when the limit is reached, \nRetract - retracts and repositions the C-axis when the limit is reached, \nLock - locks the C-axis at the current angle when the limit is reached, ",
    type       : "enum",
    group      : "multiAxis",
    values     : [
      {title:"Disabled", id:"disabled"},
      {title:"Preposition", id:"preposition"},
      {title:"Stay down", id:"staydown"},
      {title:"Retract", id:"retract"},
      {title:"Lock", id:"lock"}
    ],
    value: "disabled",
    scope: "post"
  },
  knuckleCircular: {
    title      : "Circular C-axis positioning",
    description: "Choose the output style for automatic positioning of the C-axis on circular blocks.\nYes - outputs the C-axis on a circular block, \nNo - linearizes circular moves when Automatic C-axis positioning is enabled, \nLock - locks the C-axis at the current angle for circular blocks, \n",
    type       : "enum",
    group      : "multiAxis",
    values     : [
      {title:"Yes", id:"true"},
      {title:"No", id:"false"},
      {title:"Lock", id:"lock"}
    ],
    value: "true",
    scope: "post"
  },
  baseKnuckleAngle: {
    title      : "Base C-axis positioning angle",
    description: "Defines the direction of the C-axis for a move along the postive X-axis in degrees.",
    group      : "multiAxis",
    type       : "number",
    value      : 90,
    scope      : "post"
  },
  singleResultsFile: {
    title      : "Create single results file",
    description: "Set to false if you want to store the measurement results for each probe / inspection toolpath in a separate file",
    group      : "probing",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useClampCodes: {
    title      : "Use clamp codes",
    description: "Specifies whether clamp codes for rotary axes should be output. For simultaneous toolpaths rotary axes will always get unclamped.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  coolantPressure: {
    title      : "Coolant pressure",
    description: "Select the coolant pressure if equipped with a Variable Frequency Drive.  Select 'Default' if this option is not installed.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"Default", id:""},
      {title:"Low", id:"P0"},
      {title:"Normal", id:"P1"},
      {title:"High", id:"P2"}
    ],
    value: "",
    scope: "post"
  }
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
// {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
var coolants = [
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST},
  {id:COOLANT_THROUGH_TOOL, on:88, off:89},
  {id:COOLANT_AIR, on:83, off:84},
  {id:COOLANT_AIR_THROUGH_TOOL, on:73, off:74},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL, on:[88, 8], off:[89, 9]},
  {id:COOLANT_OFF, off:9}
];

// old machines only support 4 digits
var oFormat = createFormat({width:5, zeropad:true, decimals:0});
var nFormat = createFormat({decimals:0});

var gFormat = createFormat({prefix:"G", decimals:0});
var mFormat = createFormat({prefix:"M", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var dFormat = createFormat({prefix:"D", decimals:0});
var probeWCSFormat = createFormat({prefix:"S", decimals:0, forceDecimal:true});
var probeExtWCSFormat = createFormat({prefix:"S154.", width:2, zeropad:true, decimals:0});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var rFormat = xyzFormat; // radius
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var feedFormat = createFormat({decimals:(unit == MM ? 2 : 3), forceDecimal:true});
var feedPerRevFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var pitchFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-1000
var milliFormat = createFormat({decimals:0}); // milliseconds // range 1-9999
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var zOutput = createOutputVariable({onchange:function() {retracted = false;}, prefix:"Z"}, xyzFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, abcFormat);
var cOutput = createOutputVariable({prefix:"C"}, abcFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var inverseTimeOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, feedFormat);
var pitchOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, pitchFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);
var dOutput = createOutputVariable({}, dFormat);

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, xyzFormat);

var gMotionModal = createOutputVariable({onchange:function() {if (skipBlock) {forceModals(gMotionModal);}}}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal  = createOutputVariable({onchange:function() {if (skipBlock) {forceModals(gPlaneModal);} forceModals(gMotionModal);}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createOutputVariable({onchange:function() {if (skipBlock) {forceModals(gAbsIncModal);}}}, gFormat); // modal group 3 // G90-91
var gFeedModeModal = createOutputVariable({}, gFormat); // modal group 5 // G93-94
var gUnitModal = createOutputVariable({}, gFormat); // modal group 6 // G20-21
var gCycleModal = createOutputVariable({}, gFormat); // modal group 9 // G81, ...
var gRetractModal = createOutputVariable({control:CONTROL_FORCE}, gFormat); // modal group 10 // G98-99
var gRotationModal = createOutputVariable({
  onchange: function () {
    if (probeVariables.probeAngleMethod == "G68") {
      probeVariables.outputRotationCodes = true;
    }
  }
}, gFormat); // modal group 16 // G68-G69
var mClampModal = createModalGroup(
  {strict:false},
  [
    [10, 11], // 4th axis clamp / unclamp
    [12, 13] // 5th axis clamp / unclamp
  ],
  mFormat
);

// fixed settings
var firstFeedParameter = 100; // the first variable to use with parametric feed
var forceResetWorkPlane = false; // enable to force reset of machine ABC on new orientation
var minimumCyclePoints = 5; // minimum number of points in cycle operation to consider for subprogram
var useDwoForPositioning = true; // specifies to use the DWO feature for XY positioning for multi-axis operations

var allowIndexingWCSProbing = false; // specifies that probe WCS with tool orientation is supported
var probeVariables = {
  outputRotationCodes: false, // defines if it is required to output rotation codes
  probeAngleMethod   : "OFF", // OFF, AXIS_ROT, G68, G54.4
  compensationXY     : undefined,
  rotationalAxis     : -1
};

var SUB_UNKNOWN = 0;
var SUB_PATTERN = 1;
var SUB_CYCLE = 2;

// collected state
var sequenceNumber;
var currentWorkOffset;
var coolantPressure = "";
var currentCoolantPressure = "";
var optionalSection = false;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var currentFeedId;
var maximumCircularRadiiDifference = toPreciseUnit(0.005, MM);
var maximumLineLength = 80; // the maximum number of charaters allowed in a line
var subprograms = [];
var currentPattern = -1;
var firstPattern = false;
var currentSubprogram;
var lastSubprogram;
var initialSubprogramNumber = 90000;
var definedPatterns = new Array();
var incrementalMode = false;
var saveShowSequenceNumbers;
var cycleSubprogramIsActive = false;
var patternIsActive = false;
var lastOperationComment = "";
var incrementalSubprogram;
var retracted = false; // specifies that the tool has been retracted to the safe plane
var measureTool = false;
var tapping = false;
var useABCPrepositioning = true; // disable to use G253
var useDWOCycles = false; // do not work on machine at this time, Haas supposed to be fixing this
var axisIsClamped = true; // rotary axes are clamped
var bDirection = -2; // default setting
var highRotaryFeedrate = (unit == IN) ? 200 : 5000; // high feed for positioning rotary axes, too high can cause machine fault
var previousABCPosition = new Vector(0, 0, 0);
var currentRetractPlane = 0; // current Z retract level

// used to convert blocks to optional for safeStartAllOperations, might get used outside of onSection
var operationNeedsSafeStart = false;

/**
  Writes the specified block.
*/
var skipBlock = false;
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  var maximumSequenceNumber = ((getProperty("useSubroutines") == "allOperations") || (getProperty("useSubroutines") == "patterns") ||
    (getProperty("useSubroutines") == "cycles")) ? initialSubprogramNumber : 99999;
  if (getProperty("showSequenceNumbers") == "true") {
    if (sequenceNumber >= maximumSequenceNumber) {
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
  Writes the specified block - used for tool changes only.
*/
function writeToolBlock() {
  var show = getProperty("showSequenceNumbers");
  setProperty("showSequenceNumbers", (show == "true" || show == "toolChange") ? "true" : "false");
  writeBlock(arguments);
  setProperty("showSequenceNumbers", show);
}

/**
  Writes the specified optional block.
*/
function writeOptionalBlock() {
  skipBlock = true;
  writeBlock(arguments);
}

function formatComment(text) {
  return "(" + String(text).replace(/[()]/g, "") + ")";
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text.substr(0, maximumLineLength - 2)));
}

/**
  Output debug line
*/
function writeDebug(text) {
  writeComment("DEBUG - " + text);
  log("DEBUG - " + text);
}

/**
  Returns the matching HAAS tool type for the tool.
*/
function getHaasToolType(toolType) {
  switch (toolType) {
  case TOOL_DRILL:
  case TOOL_REAMER:
    return 1; // drill
  case TOOL_TAP_RIGHT_HAND:
  case TOOL_TAP_LEFT_HAND:
    return 2; // tap
  case TOOL_MILLING_FACE:
  case TOOL_MILLING_SLOT:
  case TOOL_BORING_BAR:
    return 3; // shell mill
  case TOOL_MILLING_END_FLAT:
  case TOOL_MILLING_END_BULLNOSE:
  case TOOL_MILLING_TAPERED:
  case TOOL_MILLING_DOVETAIL:
    return 4; // end mill
  case TOOL_DRILL_SPOT:
  case TOOL_MILLING_CHAMFER:
  case TOOL_DRILL_CENTER:
  case TOOL_COUNTER_SINK:
  case TOOL_COUNTER_BORE:
  case TOOL_MILLING_THREAD:
  case TOOL_MILLING_FORM:
    return 5; // center drill
  case TOOL_MILLING_END_BALL:
  case TOOL_MILLING_LOLLIPOP:
    return 6; // ball nose
  case TOOL_PROBE:
    return 7; // probe
  default:
    error(localize("Invalid HAAS tool type."));
    return -1;
  }
}

function getHaasProbingType(toolType, use9023) {
  switch (getHaasToolType(toolType)) {
  case 3:
  case 4:
    return (use9023 ? 23 : 1); // rotate
  case 1:
  case 2:
  case 5:
  case 6:
  case 7:
    return (use9023 ? 12 : 2); // non rotate
  case 0:
    return (use9023 ? 13 : 3); // rotate length and dia
  default:
    error(localize("Invalid HAAS tool type."));
    return -1;
  }
}

function writeToolCycleBlock(tool) {
  writeOptionalBlock("T" + toolFormat.format(tool.number), mFormat.format(6)); // get tool
  writeOptionalBlock(mFormat.format(0)); // wait for operator
}

function prepareForToolCheck() {
  onCommand(COMMAND_STOP_SPINDLE);
  onCommand(COMMAND_COOLANT_OFF);

  // cancel TCP so that tool doesn't follow tables
  if (currentSection.isMultiAxis() && operationSupportsTCP) {
    disableLengthCompensation(false, "TCPC OFF");
  }
  if ((currentSection.isMultiAxis() && getCurrentDirection().length != 0) ||
    (currentMachineABC != undefined && currentMachineABC.length != 0)) {
    setWorkPlane(new Vector(0, 0, 0));
    forceWorkPlane();
  }
}

function writeToolMeasureBlock(tool, preMeasure) {
  var writeFunction = measureTool ? writeBlock : writeOptionalBlock;
  var comment = measureTool ? formatComment("MEASURE TOOL") : "";

  if (!preMeasure) {
    prepareForToolCheck();
  }
  if (true) { // use Macro P9023 to measure tools
    var probingType = getHaasProbingType(tool.type, true);
    writeFunction(
      gFormat.format(65),
      "P9023",
      "A" + probingType + ".",
      "T" + toolFormat.format(tool.number),
      conditional((probingType != 12), "H" + xyzFormat.format(getBodyLength(tool))),
      conditional((probingType != 12), "D" + xyzFormat.format(tool.diameter)),
      comment
    );
  } else { // use Macro P9995 to measure tools
    writeFunction("T" + toolFormat.format(tool.number), mFormat.format(6)); // get tool
    writeFunction(
      gFormat.format(65),
      "P9995",
      "A0.",
      "B" + getHaasToolType(tool.type) + ".",
      "C" + getHaasProbingType(tool.type, false) + ".",
      "T" + toolFormat.format(tool.number),
      "E" + xyzFormat.format(getBodyLength(tool)),
      "D" + xyzFormat.format(tool.diameter),
      "K" + xyzFormat.format(0.1),
      "I0.",
      comment
    ); // probe tool
  }
  measureTool = false;
}

// Start of machine configuration logic
var compensateToolLength = false; // add the tool length to the pivot distance for nonTCP rotary heads
var virtualTooltip = false; // translate the pivot point to the virtual tool tip for nonTCP rotary heads
// internal variables, do not change
var receivedMachineConfiguration;
var operationSupportsTCP;
var multiAxisFeedrate;

function activateMachine() {
  // disable unsupported rotary axes output
  if (!machineConfiguration.isMachineCoordinate(0) && (typeof aOutput != "undefined")) {
    aOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(1) && (typeof bOutput != "undefined")) {
    bOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(2) && (typeof cOutput != "undefined")) {
    cOutput.disable();
  }

  // don't need to modify any settings if 3-axis machine
  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return;
  }

  // setup usage of multiAxisFeatures
  useDWO = getProperty("useMultiAxisFeatures") != undefined ? getProperty("useMultiAxisFeatures") :
    (typeof useDWO != "undefined" ? useDWO : false);
  useABCPrepositioning = getProperty("useABCPrepositioning") != undefined ? getProperty("useABCPrepositioning") :
    (typeof useABCPrepositioning != "undefined" ? useABCPrepositioning : false);
  if (receivedMachineConfiguration && machineConfiguration.getMaximumFeedrate() > 0) {
    highFeedrate = machineConfiguration.getMaximumFeedrate();
  }

  // save multi-axis feedrate settings from machine configuration
  var mode = machineConfiguration.getMultiAxisFeedrateMode();
  var type = mode == FEED_INVERSE_TIME ? machineConfiguration.getMultiAxisFeedrateInverseTimeUnits() :
    (mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateDPMType() : DPM_STANDARD);
  multiAxisFeedrate = {
    mode     : mode,
    maximum  : machineConfiguration.getMultiAxisFeedrateMaximum(),
    type     : type,
    tolerance: mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateOutputTolerance() : 0,
    bpwRatio : mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateBpwRatio() : 1
  };

  // setup of retract/reconfigure  TAG: Only needed until post kernel supports these machine config settings
  if (receivedMachineConfiguration && machineConfiguration.performRewinds()) {
    safeRetractDistance = machineConfiguration.getSafeRetractDistance();
    safePlungeFeed = machineConfiguration.getSafePlungeFeedrate();
    safeRetractFeed = machineConfiguration.getSafeRetractFeedrate();
  }
  if (typeof safeRetractDistance == "number" && getProperty("safeRetractDistance") != undefined && getProperty("safeRetractDistance") != 0) {
    safeRetractDistance = getProperty("safeRetractDistance");
  }

  // setup for head configurations
  if (machineConfiguration.isHeadConfiguration()) {
    compensateToolLength = typeof compensateToolLength == "undefined" ? false : compensateToolLength;
  }

  // calculate the ABC angles and adjust the points for multi-axis operations
  // rotary heads may require the tool length be added to the pivot length
  // so we need to optimize each section individually
  if (machineConfiguration.isHeadConfiguration() && compensateToolLength) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var section = getSection(i);
      if (section.isMultiAxis()) {
        machineConfiguration.setToolLength(getBodyLength(section.getTool())); // define the tool length for head adjustments
        section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
      }
    }
  } else { // tables and rotary heads with TCP support can be optimized with a single call
    optimizeMachineAngles2(OPTIMIZE_AXIS);
  }
}

function getBodyLength(tool) {
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (tool.number == section.getTool().number) {
      return section.getParameter("operation:tool_overallLength", tool.bodyLength + tool.holderLength);
    }
  }
  return tool.bodyLength + tool.holderLength;
}

function defineMachine() {
  var useTCP = true;
  if (receivedMachineConfiguration) {
    var bAxis = machineConfiguration.getAxisU();
    var cAxis = machineConfiguration.getAxisV();
    if ((!bAxis.isEnabled() || !bAxis.isHead()) ||
        (!cAxis.isEnabled() || cAxis.getCoordinate() != 2 || !isSameDirection(cAxis.getAxis().abs, new Vector(0, 0, 1)) || !cAxis.isHead())) {
      warning(localize("The provided CAM machine configuration is overwritten by the postprocessor."));
      receivedMachineConfiguration = false;
    }
  }

  if (!receivedMachineConfiguration) { // CAM provided machine configuration takes precedence
  // if (true) { // hardcoded machine configuration takes precedence
    var bAxis = createAxis({coordinate:1, table:false, axis:[0, -1, 0], range:[-120 - 0.0001, 120 + 0.0001], preference:parseInt(getProperty("preferredTilt"), 10), cyclic:false, tcp:useTCP});
    var cAxis = createAxis({coordinate:2, table:false, axis:[0, 0, -1], range:[-245 - 0.0001, 240 + 0.0001], preference:0, cyclic:false, tcp:useTCP});
    machineConfiguration = new MachineConfiguration(bAxis, cAxis);
    setMachineConfiguration(machineConfiguration);

    // retract / reconfigure
    var performRewinds = true; // set to true to enable the rewind/reconfigure logic
    if (performRewinds) {
      machineConfiguration.enableMachineRewinds(); // enables the retract/reconfigure logic
      safeRetractDistance = (unit == IN) ? 1 : 25; // additional distance to retract out of stock, can be overridden with a property
      safeRetractFeed = (unit == IN) ? 20 : 500; // retract feed rate
      safePlungeFeed = (unit == IN) ? 10 : 250; // plunge feed rate
      machineConfiguration.setSafeRetractDistance(safeRetractDistance);
      machineConfiguration.setSafeRetractFeedrate(safeRetractFeed);
      machineConfiguration.setSafePlungeFeedrate(safePlungeFeed);
      var stockExpansion = new Vector(toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN)); // expand stock XYZ values
      machineConfiguration.setRewindStockExpansion(stockExpansion);
    }

    // multi-axis feedrates
    if (machineConfiguration.isMultiAxisConfiguration()) {
      machineConfiguration.setMultiAxisFeedrate(
        useTCP ? FEED_FPM : getProperty("useDPMFeeds") ? FEED_DPM : FEED_INVERSE_TIME,
        9999.99, // maximum output value for inverse time feed rates
        getProperty("useDPMFeeds") ? DPM_COMBINATION : INVERSE_MINUTES, // INVERSE_MINUTES/INVERSE_SECONDS or DPM_COMBINATION/DPM_STANDARD
        0.5, // tolerance to determine when the DPM feed has changed
        1.0 // ratio of rotary accuracy to linear accuracy for DPM calculations
      );
      setMachineConfiguration(machineConfiguration);
    }
    /* home positions */
    machineConfiguration.setHomePositionX(getProperty("homePositionX"));
    machineConfiguration.setHomePositionY(getProperty("homePositionY"));
    machineConfiguration.setRetractPlane(getProperty("homePositionZ"));
    if (receivedMachineConfiguration) {
      warning(localize("The provided CAM machine configuration is overwritten by the postprocessor."));
      receivedMachineConfiguration = false; // CAM provided machine configuration is overwritten
    }
  }
}
// End of machine configuration logic

function onOpen() {
  receivedMachineConfiguration = machineConfiguration.isReceived();
  if (typeof defineMachine == "function") {
    defineMachine(); // hardcoded machine configuration
  }
  activateMachine(); // enable the machine optimizations and settings

  if (getProperty("useRadius")) {
    maximumCircularSweep = toRad(90); // avoid potential center calculation errors for CNC
  }
  if (!getProperty("useMultiAxisFeatures")) {
    useDwoForPositioning = false;
  }

  gRotationModal.format(69); // Default to G69 Rotation Off
  mClampModal.format(10); // Default 4th axis modal code to be clamped
  mClampModal.format(12); // Default 5th axis modal code to be clamped

  minRetract = toPreciseUnit(2, IN);
  if (getProperty("safeRetractDistanceZ") < minRetract) {
    error(subst(localize("The Safe Z-retract distance for head rotations must be at least %1"), minRetract) +
      (unit == IN ? "in." : "mm."));
    return;
  }
  if ((unit == MM) && getProperty("forceHomeOnIndexing") && (getProperty("homePositionX") == homePositionX) && (homePositionX != 0)) {
    error(localize("The 'G53 Home Positon X' property is defined in inches, but the output is in millimeters."));
    return;
  }
  if ((unit == MM) && (getProperty("homePositionY") == homePositionY) && (homePositionY != 0)) {
    error(localize("The 'G53 Home Positon Y' property is defined in inches, but the output is in millimeters."));
    return;
  }

  if (toPreciseUnit(highFeedrate, MM) <= 0) {
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
    writeln(
      "O" + oFormat.format(programId) +
      conditional(programComment, " " + formatComment(programComment.substr(0, maximumLineLength - 2 - ("O" + oFormat.format(programId)).length - 1)))
    );
    lastSubprogram = (initialSubprogramNumber - 1);
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  if (getProperty("useG0")) {
    writeComment(localize("CAUTION: Using G0.  Make sure that Setting 335 is set to 'Linear + Rotary'."));
  } else {
    writeComment(subst(localize("Using high feed G1 F%1 instead of G0."), feedFormat.format(toPreciseUnit(highFeedrate, MM))));
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
      writeComment("  " + localize("vendor") + ": " + vendor);
    }
    if (model) {
      writeComment("  " + localize("model") + ": " + model);
    }
    if (description) {
      writeComment("  " + localize("description") + ": "  + description);
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
        var comment = "T" + toolFormat.format(tool.number) + " " +
          "D=" + xyzFormat.format(tool.diameter) + " " +
          localize("CR") + "=" + xyzFormat.format(tool.cornerRadius);
        if ((tool.taperAngle > 0) && (tool.taperAngle < Math.PI)) {
          comment += " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg");
        }
        if (zRanges[tool.number]) {
          comment += " - " + localize("ZMIN") + "=" + xyzFormat.format(zRanges[tool.number].getMinimum());
        }
        comment += " - " + getToolTypeName(tool.type);
        writeComment(comment);
      }
    }
  }

  // optionally cycle through all tools
  if (getProperty("optionallyCycleToolsAtStart") || getProperty("measureTools")) {
    var tools = getToolTable();
    if (tools.getNumberOfTools() > 0) {
      writeln("");

      writeOptionalBlock(mFormat.format(0), formatComment(localize("Read note"))); // wait for operator
      writeComment(localize("With BLOCK DELETE turned off each tool will cycle through"));
      writeComment(localize("the spindle to verify that the correct tool is in the tool magazine"));
      if (getProperty("measureTools")) {
        writeComment(localize("and to automatically measure it"));
      }
      writeComment(localize("Once the tools are verified turn BLOCK DELETE on to skip verification"));

      for (var i = 0; i < tools.getNumberOfTools(); ++i) {
        var tool = tools.getTool(i);
        if (getProperty("measureTools") && (tool.type == TOOL_PROBE)) {
          continue;
        }
        var comment = "T" + toolFormat.format(tool.number) + " " +
          "D=" + xyzFormat.format(tool.diameter) + " " +
          localize("CR") + "=" + xyzFormat.format(tool.cornerRadius);
        if ((tool.taperAngle > 0) && (tool.taperAngle < Math.PI)) {
          comment += " " + localize("TAPER") + "=" + taperFormat.format(tool.taperAngle) + localize("deg");
        }
        comment += " - " + getToolTypeName(tool.type);
        writeComment(comment);
        if (getProperty("measureTools")) {
          writeToolMeasureBlock(tool, true);
        } else {
          writeToolCycleBlock(tool);
        }
      }
    }
    writeln("");
  }

  if (false /*getProperty("useMultiAxisFeatures")*/) {
    var failed = false;
    var dynamicWCSs = {};
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var section = getSection(i);
      var description = section.hasParameter("operation-comment") ? section.getParameter("operation-comment") : ("#" + (i + 1));
      if (!section.hasDynamicWorkOffset()) {
        error(subst(localize("Dynamic work offset has not been set for operation '%1'."), description));
        failed = true;
      }

      var o = section.getDynamicWCSOrigin();
      var p = section.getDynamicWCSPlane();
      if (dynamicWCSs[section.getDynamicWorkOffset()]) {
        if ((Vector.diff(o, dynamicWCSs[section.getDynamicWorkOffset()].origin).length > 1e-9) ||
            (Matrix.diff(p, dynamicWCSs[section.getDynamicWorkOffset()].plane).n1 > 1e-9)) {
          error(subst(localize("Dynamic WCS mismatch for operation '%1'."), description));
          failed = true;
        }
      } else {
        dynamicWCSs[section.getDynamicWorkOffset()] = {origin:o, plane:p};
      }
    }
    if (failed) {
      return;
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
          if (xyzFormat.areDifferent(tooli.diameter, toolj.diameter) ||
              xyzFormat.areDifferent(tooli.cornerRadius, toolj.cornerRadius) ||
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

  // absolute coordinates and feed per min
  writeBlock(gAbsIncModal.format(90), gFeedModeModal.format(94), gPlaneModal.format(17));
  writeBlock(gFormat.format(49), gFormat.format(269));

  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(20));
    break;
  case MM:
    writeBlock(gUnitModal.format(21));
    break;
  }

  // Probing Surface Inspection
  if (typeof inspectionWriteVariables == "function") {
    inspectionWriteVariables();
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

var lengthCompensationActive = false;

/** Disables length compensation if currently active or if forced. */
function disableLengthCompensation(force) {
  if (lengthCompensationActive || force) {
    // validate(retracted, "Cannot cancel length compensation if the machine is not fully retracted.");
    writeBlock(gFormat.format(49));
    lengthCompensationActive = false;
  }
}

// Start of smoothing logic
var smoothingSettings = {
  roughing              : 1, // roughing level for smoothing in automatic mode
  semi                  : 2, // semi-roughing level for smoothing in automatic mode
  semifinishing         : 2, // semi-finishing level for smoothing in automatic mode
  finishing             : 3, // finishing level for smoothing in automatic mode
  thresholdRoughing     : toPreciseUnit(0.5, MM), // operations with stock/tolerance above that threshold will use roughing level in automatic mode
  thresholdFinishing    : toPreciseUnit(0.05, MM), // operations with stock/tolerance below that threshold will use finishing level in automatic mode
  thresholdSemiFinishing: toPreciseUnit(0.1, MM), // operations with stock/tolerance above finishing and below threshold roughing that threshold will use semi finishing level in automatic mode

  differenceCriteria: "level", // options: "level", "tolerance", "both". Specifies criteria when output smoothing codes
  autoLevelCriteria : "stock", // use "stock" or "tolerance" to determine levels in automatic mode
  cancelCompensation: false // tool length compensation must be canceled prior to changing the smoothing level
};

// collected state below, do not edit
var smoothing = {
  cancel     : false, // cancel tool length prior to update smoothing for this operation
  isActive   : false, // the current state of smoothing
  isAllowed  : false, // smoothing is allowed for this operation
  isDifferent: false, // tells if smoothing levels/tolerances/both are different between operations
  level      : -1, // the active level of smoothing
  tolerance  : -1, // the current operation tolerance
  force      : false // smoothing needs to be forced out in this operation
};

function initializeSmoothing() {
  var previousLevel = smoothing.level;
  var previousTolerance = smoothing.tolerance;

  // determine new smoothing levels and tolerances
  smoothing.level = parseInt(getProperty("useSmoothing"), 10);
  smoothing.level = isNaN(smoothing.level) ? -1 : smoothing.level;
  smoothing.tolerance = Math.max(getParameter("operation:tolerance", smoothingSettings.thresholdFinishing), 0);

  // automatically determine smoothing level
  if (smoothing.level == 9999) {
    if (smoothingSettings.autoLevelCriteria == "stock") { // determine auto smoothing level based on stockToLeave
      var stockToLeave = xyzFormat.getResultingValue(getParameter("operation:stockToLeave", 0));
      var verticalStockToLeave = xyzFormat.getResultingValue(getParameter("operation:verticalStockToLeave", 0));
      if (((stockToLeave >= smoothingSettings.thresholdRoughing) && (verticalStockToLeave >= smoothingSettings.thresholdRoughing)) ||
          getParameter("operation:strategy", "") == "face") {
        smoothing.level = smoothingSettings.roughing; // set roughing level
      } else {
        if (((stockToLeave >= smoothingSettings.thresholdSemiFinishing) && (stockToLeave < smoothingSettings.thresholdRoughing)) &&
          ((verticalStockToLeave >= smoothingSettings.thresholdSemiFinishing) && (verticalStockToLeave  < smoothingSettings.thresholdRoughing))) {
          smoothing.level = smoothingSettings.semi; // set semi level
        } else if (((stockToLeave >= smoothingSettings.thresholdFinishing) && (stockToLeave < smoothingSettings.thresholdSemiFinishing)) &&
          ((verticalStockToLeave >= smoothingSettings.thresholdFinishing) && (verticalStockToLeave  < smoothingSettings.thresholdSemiFinishing))) {
          smoothing.level = smoothingSettings.semifinishing; // set semi-finishing level
        } else {
          smoothing.level = smoothingSettings.finishing; // set finishing level
        }
      }
    } else { // detemine auto smoothing level based on operation tolerance instead of stockToLeave
      if (smoothing.tolerance >= smoothingSettings.thresholdRoughing ||
          getParameter("operation:strategy", "") == "face") {
        smoothing.level = smoothingSettings.roughing; // set roughing level
      } else {
        if (((smoothing.tolerance >= smoothingSettings.thresholdSemiFinishing) && (smoothing.tolerance < smoothingSettings.thresholdRoughing))) {
          smoothing.level = smoothingSettings.semi; // set semi level
        } else if (((smoothing.tolerance >= smoothingSettings.thresholdFinishing) && (smoothing.tolerance < smoothingSettings.thresholdSemiFinishing))) {
          smoothing.level = smoothingSettings.semifinishing; // set semi-finishing level
        } else {
          smoothing.level = smoothingSettings.finishing; // set finishing level
        }
      }
    }
  }
  if (smoothing.level == -1) { // useSmoothing is disabled
    smoothing.isAllowed = false;
  } else { // do not output smoothing for the following operations
    smoothing.isAllowed = !(currentSection.getTool().type == TOOL_PROBE || currentSection.checkGroup(STRATEGY_DRILLING));
  }
  if (!smoothing.isAllowed) {
    smoothing.level = -1;
    smoothing.tolerance = -1;
  }

  switch (smoothingSettings.differenceCriteria) {
  case "level":
    smoothing.isDifferent = smoothing.level != previousLevel;
    break;
  case "tolerance":
    smoothing.isDifferent = xyzFormat.areDifferent(smoothing.tolerance, previousTolerance);
    break;
  case "both":
    smoothing.isDifferent = smoothing.level != previousLevel || xyzFormat.areDifferent(smoothing.tolerance, previousTolerance);
    break;
  default:
    error(localize("Unsupported smoothing criteria."));
    return;
  }

  // tool length compensation needs to be canceled when smoothing state/level changes
  if (smoothingSettings.cancelCompensation) {
    smoothing.cancel = !isFirstSection() && smoothing.isDifferent;
  }
}

function setSmoothing(mode) {
  if (mode == smoothing.isActive && (!mode || !smoothing.isDifferent) && !smoothing.force) {
    return; // return if smoothing is already active or is not different
  }
  if (typeof lengthCompensationActive != "undefined" && smoothingSettings.cancelCompensation) {
    validate(!lengthCompensationActive, "Length compensation is active while trying to update smoothing.");
  }
  if (mode) { // enable smoothing
    writeBlock(
      gFormat.format(187),
      "P" + smoothing.level,
      conditional((smoothingSettings.differenceCriteria != "level"), "E" + xyzFormat.format(smoothing.tolerance))
    );
  } else { // disable smoothing
    writeBlock(gFormat.format(187));
  }
  smoothing.isActive = mode;
  smoothing.force = false;
  smoothing.isDifferent = false;
}
// End of smoothing logic

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

  var id = 0;
  var activeFeeds = new Array();
  if (hasParameter("operation:tool_feedCutting")) {
    if (movements & ((1 << MOVEMENT_CUTTING) | (1 << MOVEMENT_LINK_TRANSITION) | (1 << MOVEMENT_EXTENDED))) {
      var feedContext = new FeedContext(id, localize("Cutting"), getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_CUTTING] = feedContext;
      if (!hasParameter("operation:tool_feedTransition")) {
        activeMovements[MOVEMENT_LINK_TRANSITION] = feedContext;
      }
      activeMovements[MOVEMENT_EXTENDED] = feedContext;
    }
    ++id;
    if (movements & (1 << MOVEMENT_PREDRILL)) {
      feedContext = new FeedContext(id, localize("Predrilling"), getParameter("operation:tool_feedCutting"));
      activeMovements[MOVEMENT_PREDRILL] = feedContext;
      activeFeeds.push(feedContext);
    }
    ++id;
  }

  if (hasParameter("operation:finishFeedrate")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), getParameter("operation:finishFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedEntry")) {
    if (movements & (1 << MOVEMENT_LEAD_IN)) {
      var feedContext = new FeedContext(id, localize("Entry"), getParameter("operation:tool_feedEntry"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_IN] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LEAD_OUT)) {
      var feedContext = new FeedContext(id, localize("Exit"), getParameter("operation:tool_feedExit"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_OUT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:noEngagementFeedrate")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), getParameter("operation:noEngagementFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting") &&
             hasParameter("operation:tool_feedEntry") &&
             hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), Math.max(getParameter("operation:tool_feedCutting"), getParameter("operation:tool_feedEntry"), getParameter("operation:tool_feedExit")));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:reducedFeedrate")) {
    if (movements & (1 << MOVEMENT_REDUCED)) {
      var feedContext = new FeedContext(id, localize("Reduced"), getParameter("operation:reducedFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_REDUCED] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedRamp")) {
    if (movements & ((1 << MOVEMENT_RAMP) | (1 << MOVEMENT_RAMP_HELIX) | (1 << MOVEMENT_RAMP_PROFILE) | (1 << MOVEMENT_RAMP_ZIG_ZAG))) {
      var feedContext = new FeedContext(id, localize("Ramping"), getParameter("operation:tool_feedRamp"));
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
      var feedContext = new FeedContext(id, localize("Plunge"), getParameter("operation:tool_feedPlunge"));
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
        feed = toPreciseUnit(this.highFeedrate, MM);
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
var activeDWO = false;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function positionABC(abc, force) {
  if (typeof unwindABC == "function") {
    unwindABC(abc, false);
  }
  if (force) {
    forceABC();
  }
  var a = aOutput.format(abc.x);
  var b = bOutput.format(abc.y);
  var c = cOutput.format(abc.z);
  if (a || b || c) {
    if (!retracted) {
      if (typeof moveToSafeRetractPosition == "function") {
        moveToSafeRetractPosition();
      } else {
        writeRetract(Z);
      }
    }
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), a, b, c);
    currentMachineABC = new Vector(abc);
    if (getCurrentSectionId() != -1) {
      setCurrentABC(abc); // required for machine simulation
    }
  }
}

function defineWorkPlane(_section, _setWorkPlane) {
  var abc = new Vector(0, 0, 0);
  if (machineConfiguration.isMultiAxisConfiguration()) { // use 5-axis indexing for multi-axis mode
    // set working plane after datum shift

    if (_section.isMultiAxis()) {
      cancelTransformation();
      abc = _section.getInitialToolAxisABC();
      if (_setWorkPlane) {
        cancelWorkPlane();
        if (!retracted) {
          writeRetract(Z);
        }
        forceWorkPlane();
        // onCommand(COMMAND_UNLOCK_MULTI_AXIS); // handled automatically by the control
        positionABC(abc, true);
      }
    } else {
      if (getProperty("useMultiAxisFeatures") && !tapping) {
        abc = _section.workPlane.getEuler2(EULER_XYZ_S);
        cancelTransformation();
      } else {
        abc = getWorkPlaneMachineABC(_section.workPlane, _setWorkPlane);
      }
      if (_setWorkPlane) {
        setWorkPlane(abc);
      }
    }
  } else { // pure 3D
    var remaining = _section.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported."));
      return abc;
    }
    setRotation(remaining);
  }
  if (currentSection && (currentSection.getId() == _section.getId())) {
    operationSupportsTCP = (_section.isMultiAxis() || !useDWO) && _section.getOptimizedTCPMode() == OPTIMIZE_NONE;
  }
  return abc;
}

function cancelWorkPlane() {
  if (activeDWO) {
    writeBlock(gFormat.format(269)); // cancel DWO
    activeDWO = false;
  }
}

function setWorkPlane(abc) {
  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }

  var _skipBlock = skipBlock;
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

  // skipBlock = _skipBlock;
  // onCommand(COMMAND_UNLOCK_MULTI_AXIS);

  skipBlock = _skipBlock;
  cancelWorkPlane();

  // skipBlock = _skipBlock;
  // onCommand(COMMAND_LOCK_MULTI_AXIS);

  if (getProperty("useMultiAxisFeatures") && !tapping &&
      (abcFormat.isSignificant(abc.x) || abcFormat.isSignificant(abc.y) || abcFormat.isSignificant(abc.z))) {
    skipBlock = _skipBlock;
    writeBlock(
      gFormat.format(268),
      "X" + xyzFormat.format(0), "Y" + xyzFormat.format(0), "Z" + xyzFormat.format(0),
      "I" + xyzFormat.format(toDeg(abc.x)), "J" + xyzFormat.format(toDeg(abc.y)), "K" + xyzFormat.format(toDeg(abc.z)),
      "Q123", // EULER_ZYX
      formatComment("ENABLE FCS")
    ); // enable Feature Coordinate System
    if (!useABCPrepositioning) {
      writeBlock(gFormat.format(253));  // required to rotate the head
    }
    activeDWO = true;
  }

  currentWorkPlaneABC = abc;
  skipBlock = false;
}

var closestABC = true; // choose closest machine angles
var currentMachineABC = new Vector(0, 0, 0);

function getPreferenceWeight(_abc) {
  var axis = new Array(machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW());
  var abc = new Array(_abc.x, _abc.y, _abc.z);
  var preference = new Array((bDirection == -2 ? axis[0].getPreference() : bDirection), axis[1].getPreference(), axis[2].getPreference());

  var count = 0;
  for (var i = 0; i < 3; ++i) {
    if (axis[i].isEnabled()) {
      count += ((abcFormat.getResultingValue(abc[axis[i].getCoordinate()]) * preference[i]) < 0) ? -1 : 1;
    }
  }
  return count;
}

function remapToABC(currentABC, previousABC) {
  var both = machineConfiguration.getABCByDirectionBoth(machineConfiguration.getDirection(currentABC));
  var abc1 = machineConfiguration.remapToABC(both[0], previousABC);
  abc1 = machineConfiguration.remapABC(abc1);
  var abc2 = machineConfiguration.remapToABC(both[1], previousABC);
  abc2 = machineConfiguration.remapABC(abc2);

  // choose angles based on preference
  var preference1 = getPreferenceWeight(abc1);
  var preference2 = getPreferenceWeight(abc2);
  if (preference1 > preference2) {
    return abc1;
  } else if (preference2 > preference1) {
    return abc2;
  }

  // choose angles based on closest solution
  if (abcFormat.getResultingValue(Vector.diff(abc1, previousABC).length) <= abcFormat.getResultingValue(Vector.diff(abc2, previousABC).length)) {
    return abc1;
  } else {
    return abc2;
  }
}

function getWorkPlaneMachineABC(workPlane, _setWorkPlane) {
  var W = workPlane; // map to global frame

  var abc = machineConfiguration.getABC(W);
  if (closestABC && (getProperty("preferredTilt") == "0" || bDirection != -2)) {
    if (currentMachineABC) {
      abc = remapToABC(abc, currentMachineABC);
    } else {
      abc = machineConfiguration.getPreferredABC(abc);
    }
  } else {
    abc = machineConfiguration.getPreferredABC(abc);
  }

  try {
    abc = machineConfiguration.remapABC(abc);
    if (_setWorkPlane) {
      currentMachineABC = abc;
    }
  } catch (e) {
    error(
      localize("Machine angles not supported") + ":"
      + conditional(machineConfiguration.isMachineCoordinate(0), " A" + abcFormat.format(abc.x))
      + conditional(machineConfiguration.isMachineCoordinate(1), " B" + abcFormat.format(abc.y))
      + conditional(machineConfiguration.isMachineCoordinate(2), " C" + abcFormat.format(abc.z))
    );
  }

  var direction = machineConfiguration.getDirection(abc);
  if (!isSameDirection(direction, W.forward)) {
    error(localize("Orientation not supported."));
  }

  if (!machineConfiguration.isABCSupported(abc)) {
    error(
      localize("Work plane is not supported") + ":"
      + conditional(machineConfiguration.isMachineCoordinate(0), " A" + abcFormat.format(abc.x))
      + conditional(machineConfiguration.isMachineCoordinate(1), " B" + abcFormat.format(abc.y))
      + conditional(machineConfiguration.isMachineCoordinate(2), " C" + abcFormat.format(abc.z))
    );
  }

  var tcp = !getProperty("useMultiAxisFeatures") || tapping;
  if (tcp) {
    setRotation(W); // TCP mode
  } else {
    if (false) { // is not needed and does not work with head/head machines
      var O = machineConfiguration.getOrientation(abc);
      var R = machineConfiguration.getRemainingOrientation(abc, W);
      setRotation(R);
    }
  }

  return abc;
}

function printProbeResults() {
  return currentSection.getParameter("printResults", 0) == 1;
}

function onPassThrough(text) {
  var commands = String(text).split(",");
  for (text in commands) {
    writeBlock(commands[text]);
  }
}

function onManualNC(command, value) {
  switch (command) {
  case COMMAND_ACTION:
    var sText1 = String(value);
    var sText2 = new Array();
    sText2 = sText1.split(":");
    if (sText2.length != 2) {
      error(localize("Invalid action command: ") + value);
      return;
    }
    if (String(sText2[0]).toUpperCase() == "BDIRECTION") {
      bDirection = parseToggle(sText2[1], "DEFAULT", "NEGATIVE", "CLOSEST", "POSITIVE");
      if (bDirection == undefined) {
        error(localize("bDirection must be Default, Negative, Closest, or Positive"));
        return;
      }
      bDirection -= 2;
    } else if (String(value).toUpperCase() == "VFD_LOW") {
      coolantPressure = "P0";
    } else if (String(value).toUpperCase() == "VFD_NORMAL") {
      coolantPressure = "P1";
    } else if (String(value).toUpperCase() == "VFD_HIGH") {
      coolantPressure = "P2";
    } else {
      error(localize("Invalid action command: ") + value);
    }
    break;
  default:
    expandManualNC(command, value);
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

/** Returns true if the spatial vectors are significantly different. */
function areSpatialVectorsDifferent(_vector1, _vector2) {
  return (xyzFormat.getResultingValue(_vector1.x) != xyzFormat.getResultingValue(_vector2.x)) ||
    (xyzFormat.getResultingValue(_vector1.y) != xyzFormat.getResultingValue(_vector2.y)) ||
    (xyzFormat.getResultingValue(_vector1.z) != xyzFormat.getResultingValue(_vector2.z));
}

/** Returns true if the spatial boxes are a pure translation. */
function areSpatialBoxesTranslated(_box1, _box2) {
  return !areSpatialVectorsDifferent(Vector.diff(_box1[1], _box1[0]), Vector.diff(_box2[1], _box2[0])) &&
    !areSpatialVectorsDifferent(Vector.diff(_box2[0], _box1[0]), Vector.diff(_box2[1], _box1[1]));
}

/** Returns true if the spatial boxes are same. */
function areSpatialBoxesSame(_box1, _box2) {
  return !areSpatialVectorsDifferent(_box1[0], _box2[0]) && !areSpatialVectorsDifferent(_box1[1], _box2[1]);
}

function subprogramDefine(_initialPosition, _abc, _retracted, _zIsOutput) {
  // convert patterns into subprograms
  var usePattern = false;
  patternIsActive = false;
  if (currentSection.isPatterned && currentSection.isPatterned() && (getProperty("useSubroutines") == "patterns")) {
    currentPattern = currentSection.getPatternId();
    firstPattern = true;
    for (var i = 0; i < definedPatterns.length; ++i) {
      if ((definedPatterns[i].patternType == SUB_PATTERN) && (currentPattern == definedPatterns[i].patternId)) {
        currentSubprogram = definedPatterns[i].subProgram;
        usePattern = definedPatterns[i].validPattern;
        firstPattern = false;
        break;
      }
    }

    if (firstPattern) {
      // determine if this is a valid pattern for creating a subprogram
      usePattern = subprogramIsValid(currentSection, currentPattern, SUB_PATTERN);
      if (usePattern) {
        currentSubprogram = ++lastSubprogram;
      }
      definedPatterns.push({
        patternType    : SUB_PATTERN,
        patternId      : currentPattern,
        subProgram     : currentSubprogram,
        validPattern   : usePattern,
        initialPosition: _initialPosition,
        finalPosition  : _initialPosition
      });
    }

    if (usePattern) {
      // make sure Z-position is output prior to subprogram call
      if (!_retracted && !_zIsOutput) {
        writeBlock(gMotionModal.format(0), zOutput.format(_initialPosition.z));
      }

      // call subprogram
      writeBlock(mFormat.format(97), "P" + nFormat.format(currentSubprogram));
      patternIsActive = true;

      if (firstPattern) {
        subprogramStart(_initialPosition, _abc, incrementalSubprogram);
      } else {
        skipRemainingSection();
        setCurrentPosition(getFramePosition(currentSection.getFinalPosition()));
      }
    }
  }

  // Output cycle operation as subprogram
  if (!usePattern && (getProperty("useSubroutines") == "cycles") && currentSection.doesStrictCycle &&
      (currentSection.getNumberOfCycles() == 1) && currentSection.getNumberOfCyclePoints() >= minimumCyclePoints) {
    var finalPosition = getFramePosition(currentSection.getFinalPosition());
    currentPattern = currentSection.getNumberOfCyclePoints();
    firstPattern = true;
    for (var i = 0; i < definedPatterns.length; ++i) {
      if ((definedPatterns[i].patternType == SUB_CYCLE) && (currentPattern == definedPatterns[i].patternId) &&
          !areSpatialVectorsDifferent(_initialPosition, definedPatterns[i].initialPosition) &&
          !areSpatialVectorsDifferent(finalPosition, definedPatterns[i].finalPosition)) {
        currentSubprogram = definedPatterns[i].subProgram;
        usePattern = definedPatterns[i].validPattern;
        firstPattern = false;
        break;
      }
    }

    if (firstPattern) {
      // determine if this is a valid pattern for creating a subprogram
      usePattern = subprogramIsValid(currentSection, currentPattern, SUB_CYCLE);
      if (usePattern) {
        currentSubprogram = ++lastSubprogram;
      }
      definedPatterns.push({
        patternType    : SUB_CYCLE,
        patternId      : currentPattern,
        subProgram     : currentSubprogram,
        validPattern   : usePattern,
        initialPosition: _initialPosition,
        finalPosition  : finalPosition
      });
    }
    cycleSubprogramIsActive = usePattern;
  }

  // Output each operation as a subprogram
  if (!usePattern && (getProperty("useSubroutines") == "allOperations")) {
    currentSubprogram = ++lastSubprogram;
    writeBlock(mFormat.format(97), "P" + nFormat.format(currentSubprogram));
    firstPattern = true;
    subprogramStart(_initialPosition, _abc, false);
  }
}

function subprogramStart(_initialPosition, _abc, _incremental) {
  redirectToBuffer();
  var comment = "";
  if (hasParameter("operation-comment")) {
    comment = getParameter("operation-comment");
  }
  writeln(
    "N" + nFormat.format(currentSubprogram) +
    conditional(comment, formatComment(comment.substr(0, maximumLineLength - 2 - 6 - 1)))
  );
  saveShowSequenceNumbers = getProperty("showSequenceNumbers");
  setProperty("showSequenceNumbers", "false");
  if (_incremental) {
    setAbsIncMode(true, _initialPosition, _abc);
  }
  gPlaneModal.reset();
  gMotionModal.reset();
}

function subprogramEnd() {
  if (firstPattern) {
    writeBlock(mFormat.format(99));
    writeln("");
    subprograms += getRedirectionBuffer();
  }
  forceAny();
  firstPattern = false;
  setProperty("showSequenceNumbers", saveShowSequenceNumbers);
  closeRedirection();
}

function subprogramIsValid(_section, _patternId, _patternType) {
  var sectionId = _section.getId();
  var numberOfSections = getNumberOfSections();
  var validSubprogram = _patternType != SUB_CYCLE;

  var masterPosition = new Array();
  masterPosition[0] = getFramePosition(_section.getInitialPosition());
  masterPosition[1] = getFramePosition(_section.getFinalPosition());
  var tempBox = _section.getBoundingBox();
  var masterBox = new Array();
  masterBox[0] = getFramePosition(tempBox[0]);
  masterBox[1] = getFramePosition(tempBox[1]);

  var rotation = getRotation();
  var translation = getTranslation();
  incrementalSubprogram = undefined;

  for (var i = 0; i < numberOfSections; ++i) {
    var section = getSection(i);
    if (section.getId() != sectionId) {
      defineWorkPlane(section, false);
      // check for valid pattern
      if (_patternType == SUB_PATTERN) {
        if (section.getPatternId() == _patternId) {
          var patternPosition = new Array();
          patternPosition[0] = getFramePosition(section.getInitialPosition());
          patternPosition[1] = getFramePosition(section.getFinalPosition());
          tempBox = section.getBoundingBox();
          var patternBox = new Array();
          patternBox[0] = getFramePosition(tempBox[0]);
          patternBox[1] = getFramePosition(tempBox[1]);

          if (areSpatialBoxesSame(masterPosition, patternPosition) && areSpatialBoxesSame(masterBox, patternBox) && !section.isMultiAxis()) {
            incrementalSubprogram = incrementalSubprogram ? incrementalSubprogram : false;
          } else if (!areSpatialBoxesTranslated(masterPosition, patternPosition) || !areSpatialBoxesTranslated(masterBox, patternBox)) {
            validSubprogram = false;
            break;
          } else {
            incrementalSubprogram = true;
          }
        }

      // check for valid cycle operation
      } else if (_patternType == SUB_CYCLE) {
        if ((section.getNumberOfCyclePoints() == _patternId) && (section.getNumberOfCycles() == 1)) {
          var patternInitial = getFramePosition(section.getInitialPosition());
          var patternFinal = getFramePosition(section.getFinalPosition());
          if (!areSpatialVectorsDifferent(patternInitial, masterPosition[0]) && !areSpatialVectorsDifferent(patternFinal, masterPosition[1])) {
            validSubprogram = true;
            break;
          }
        }
      }
    }
  }
  setRotation(rotation);
  setTranslation(translation);
  return (validSubprogram);
}

/**
 * Sets xyz and abc output formats to incremental or absolute type
 * @param {boolean} incremental true: Sets incremental mode, false: Sets absolute mode
 * @param {Vector} xyz Linear axis values for formating
 * @param {Vector} abc Rotary axis values for formating
*/

function setAbsIncMode(incremental, xyz, abc) {
  var outputFormats = [xOutput, yOutput, zOutput, aOutput, bOutput, cOutput];
  for (var i = 0; i < outputFormats.length; ++i) {
    outputFormats[i].setType(incremental ? TYPE_INCREMENTAL : TYPE_ABSOLUTE);
    if (i <= 2) { // xyz
      outputFormats[i].setCurrent(xyz.getCoordinate(i));
    } else { // abc
      outputFormats[i].setCurrent(abc.getCoordinate(i - 3));
    }
  }
  incrementalMode = incremental;
  if (incremental) {
    gAbsIncModal.reset();
  }
  writeBlock(gAbsIncModal.format(incremental ? 91 : 90));
}

function prePositionXYZ(initialPosition, abc, lengthOffset, newWorkPlane) {
  var preposition = (!operationNeedsSafeStart &&
    (abcFormat.areDifferent(abc.x, previousABCPosition.x) ||
    abcFormat.areDifferent(abc.y, previousABCPosition.y) ||
    abcFormat.areDifferent(abc.z, previousABCPosition.z)));
  var safeStart = operationNeedsSafeStart && !preposition;
  if (preposition || safeStart) {
    //var _skipBlock = operationNeedsSafeStart && !(currentSection.isMultiAxis() || (!isFirstSection() && (getPreviousSection().isMultiAxis() || newWorkPlane)));
    var _skipBlock = safeStart;
    writeComment("PREPOSITIONING START");
    if (currentSection.isMultiAxis()) {
      skipBlock = _skipBlock;
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    }
    var dwo = !currentSection.isMultiAxis() && getProperty("useMultiAxisFeatures") && !tapping;
    var W = currentSection.workPlane;

    var tcpPosition;
    var workpiece = getWorkpiece();
    if (dwo) {
      tcpPosition = W.multiply(initialPosition);
    } else if (currentSection.isMultiAxis() && getProperty("centerOnMultiAxis")) { // position BC at center of model to avoid out-of-limits
      tcpPosition = new Vector(
        workpiece.lower.x + ((workpiece.upper.x - workpiece.lower.x) / 2),
        workpiece.lower.y + ((workpiece.upper.y - workpiece.lower.y) / 2),
        initialPosition.z);
    } else {
      tcpPosition = initialPosition;
    }
    var clearance = new Vector(tcpPosition.x, tcpPosition.y, workpiece.upper.z + getProperty("safeRetractDistanceZ"));

    if (!retracted) {
      skipBlock = _skipBlock;
      writeRetract(Z);
    }

    var angles = (abc.isNonZero() && dwo) ? getWorkPlaneMachineABC(currentSection.workPlane, false) : abc;
    skipBlock = _skipBlock;
    var positionInABC = !currentSection.isMultiAxis() && (getProperty("homePositionZ") < 0) && !getProperty("forceHomeOnIndexing");
    forceABC();
    for (var i = 0; i < 2; ++i) { // the order of XY and BC positioning differs based on if XY has been moved to home (forceHomeOnIndexing)
      if ((!getProperty("forceHomeOnIndexing") && (i == 0)) || (getProperty("forceHomeOnIndexing") && (i == 1))) {
        skipBlock = _skipBlock;
        writeBlock(
          gMotionModal.format(0),
          xOutput.format(tcpPosition.x),
          yOutput.format(tcpPosition.y),
          positionInABC ? bOutput.format(angles.y) : "", // optimize ABC positioning when Z is not at limit of machine
          (!currentSection.isMultiAxis() && !getProperty("forceHomeOnIndexing")) ? cOutput.format(angles.z) : "",
          formatComment(positionInABC ? "PREPOSITION AXES" : "PREPOSITION XY")
        );
      } else {
        if (!currentSection.isMultiAxis() && useABCPrepositioning) {
          if (!retracted) { // need to enable TCP when rotating heads at Z-level
            skipBlock = _skipBlock;
            writeRetractSafeZ(clearance.z, true, true, "ENABLE TCP", true);
            if (!positionInABC) {
              skipBlock = _skipBlock;
              prePositionABC(_skipBlock, angles, highRotaryFeedrate);
            }
            if (dwo) {
              skipBlock = _skipBlock;
              writeRetractSafeZ(clearance.z, true, false, "ENABLE TOOL LENGTH COMPENSATION", true);
            }
            lengthCompensationActive = true;
          } else {
            skipBlock = _skipBlock;
            disableLengthCompensation(false);
            skipBlock = _skipBlock;
            cancelWorkPlane();
            if (!positionInABC) {
              skipBlock = _skipBlock;
              prePositionABC(_skipBlock, angles, 0);
            }
            feedOutput.reset();
          }
        }
      }
    }

    if (retracted && dwo) {
      skipBlock = _skipBlock;
      writeRetractSafeZ(clearance, true, false, "POSITION IN Z", true);
      forceXYZ();
    }

    if (dwo) {
      var dwoClearance = W.getTransposed().multiply(clearance);
      forceWorkPlane();
      skipBlock = _skipBlock;
      defineWorkPlane(currentSection, true);
      forceXYZ();
      skipBlock = _skipBlock;
      writeBlock(
        gMotionModal.format(1),
        xOutput.format(dwoClearance.x),
        yOutput.format(dwoClearance.y),
        zOutput.format(dwoClearance.z),
        getFeed(toPreciseUnit(highFeedrate, MM)),
        formatComment("POSITION IN FCS")
      );
      // skipBlock = _skipBlock;
      // onCommand(COMMAND_LOCK_MULTI_AXIS); // handled automatically by the control
    } else if (!lengthCompensationActive) {
      skipBlock = _skipBlock;
      writeRetractSafeZ(clearance, true, false, "POSITION IN Z", true);
      forceXYZ();
    }

    if (currentSection.isMultiAxis()) {
      forceABC();
      prePositionABC(_skipBlock, angles, highRotaryFeedrate);
      if (currentSection.isMultiAxis() && getProperty("centerOnMultiAxis")) {
        clearance = new Vector(initialPosition.x, initialPosition.y, workpiece.upper.z + getProperty("safeRetractDistanceZ"));
        writeRetractSafeZ(clearance, false, false, "POSITION IN XY", true);
      }
    }
    previousABCPosition = angles;
    setCurrentABC(previousABCPosition);

    if (!_skipBlock) {
      writeBlock(
        gMotionModal.format(getProperty("useG0") ? 0 : 1),
        xOutput.format(initialPosition.x),
        yOutput.format(initialPosition.y),
        zOutput.format(initialPosition.z),
        !getProperty("useG0") ? getFeed(toPreciseUnit(highFeedrate, MM)) : "",
        formatComment("INITIAL POSITION")
      );
    } else {
      forceXYZ();
      var x = xOutput.format(initialPosition.x);
      var y = yOutput.format(initialPosition.y);
      if (!getProperty("useG0")) {
        // axes are not synchronized
        gMotionModal.reset();
        feedOutput.reset();
        writeBlock(gAbsIncModal.format(90), gMotionModal.format(1), x, y, getFeed(toPreciseUnit(highFeedrate, MM)));
      } else {
        writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), x, y);
      }
    }
    writeComment("PREPOSITIONING END");
  } else { // no rotary axes change
    defineWorkPlane(currentSection, true);
    writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
    writeRetractSafeZ(initialPosition.z, true, false, "", true);
  }

  coolantPressure = coolantPressure == "" ? getProperty("coolantPressure", "") : coolantPressure; // manual NC Action command takes precedence over property

  if (!forceCoolant) {
    forceCoolant = coolantPressure != currentCoolantPressure;
  }

  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);
}

function prePositionABC(_skipBlock, abc, feed) {
  // protect against tool hitting tool changer
  if (retracted && !getProperty("useG28")) {
    var plane = calculateRetractPlane(abc);
    if (plane < currentRetractPlane) {
      writeBlock(gFormat.format(53), gMotionModal.format(0), "Z" + xyzFormat.format(plane));
    }
  }
  skipBlock = _skipBlock;
  var g = gMotionModal.format(feed == 0 ? 0 : 1);
  var f = feed == 0 ? "" : getFeed(feed);
  writeBlock(g, aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), f, formatComment("ROTATE HEAD"));
  previousABCPosition = new Vector(abc.x, abc.y, abc.z);
  setCurrentABC(abc);
}

function onSection() {
  var forceSectionRestart = optionalSection && !currentSection.isOptional();
  optionalSection = currentSection.isOptional();

  var insertToolCall = forceSectionRestart || isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  retracted = false;

  var zIsOutput = false; // true if the Z-position has been output, used for patterns
  var newWorkOffset = isFirstSection() || forceSectionRestart ||
    (getPreviousSection().workOffset != currentSection.workOffset); // work offset changes
  var newWorkPlane = isFirstSection() || forceSectionRestart ||
    !isSameDirection(getPreviousSection().getGlobalFinalToolAxis(), currentSection.getGlobalInitialToolAxis()) ||
    (currentSection.isOptimizedForMachine() && getPreviousSection().isOptimizedForMachine() &&
      Vector.diff(getPreviousSection().getFinalToolAxisABC(), currentSection.getInitialToolAxisABC()).length > 1e-4) ||
    (!machineConfiguration.isMultiAxisConfiguration() && currentSection.isMultiAxis()) ||
    (!getPreviousSection().isMultiAxis() && currentSection.isMultiAxis() ||
      getPreviousSection().isMultiAxis() && !currentSection.isMultiAxis()); // force newWorkPlane between indexing and simultaneous operations

  tapping = hasParameter("operation:cycleType") &&
    ((getParameter("operation:cycleType") == "tapping") ||
    (getParameter("operation:cycleType") == "right-tapping") ||
    (getParameter("operation:cycleType") == "left-tapping") ||
    (getParameter("operation:cycleType") == "tapping-with-chip-breaking"));

  operationNeedsSafeStart = getProperty("safeStartAllOperations") && !isFirstSection() && !insertToolCall;

  knuckleAdjustmentIsActive = (getProperty("adjustKnuckleAngle") != "disabled") && is3D() && (currentSection.strategy != "drill");
  safeKnuckleClearance = getWorkpiece().upper.z + toPreciseUnit(safeKnuckleDistance, IN);

  // define smoothing mode
  initializeSmoothing();

  if ((insertToolCall && !getProperty("fastToolChange")) || newWorkOffset || newWorkPlane || toolChecked) {
    // stop spindle before retract during tool change
    if (insertToolCall && !isFirstSection() && !toolChecked && !getProperty("fastToolChange")) {
      onCommand(COMMAND_STOP_SPINDLE);
    }

    if (insertToolCall && !isFirstSection()) {
      onCommand(COMMAND_COOLANT_OFF);
    }

    // retract to safe plane
    writeRetract(Z);

    if (forceResetWorkPlane && newWorkPlane) {
      forceWorkPlane();
      setWorkPlane(new Vector(0, 0, 0)); // reset working plane
    }
  }

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment && ((comment !== lastOperationComment) || !patternIsActive || insertToolCall)) {
      writeln("");
      writeComment(comment);
      lastOperationComment = comment;
    } else if (!patternIsActive || insertToolCall) {
      writeln("");
    }
  } else {
    writeln("");
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

  if (operationNeedsSafeStart) {
    if (!retracted) {
      skipBlock = true;
      writeRetract(Z);
    }
  }

  if (insertToolCall || operationNeedsSafeStart) {
    forceModals();
    if (getProperty("fastToolChange") && !isProbeOperation()) {
      currentCoolantMode = COOLANT_OFF;
    } else if (insertToolCall) { // no coolant off command if safe start operation
      // onCommand(COMMAND_COOLANT_OFF);
    }

    if (!isFirstSection() && getProperty("optionalStop") && insertToolCall) {
      onCommand(COMMAND_OPTIONAL_STOP);
    }

    if ((tool.number > 200 && tool.number < 1000) || tool.number > 9999) {
      warning(localize("Tool number out of range."));
    }

    skipBlock = !insertToolCall;
    writeToolBlock(
      "T" + toolFormat.format(tool.number),
      mFormat.format(6)
    );
    currentRetractPlane = 0; // tool change fully retracts tool
    if (tool.comment) {
      writeComment(tool.comment);
    }
    if (measureTool) {
      writeToolMeasureBlock(tool, false);
    }
    if (insertToolCall) {
      forceWorkPlane();
      newWorkPlane = true;
    }
    var showToolZMin = false;
    if (showToolZMin) {
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
        writeComment(localize("ZMIN") + "=" + xyzFormat.format(zRange.getMinimum()));
      }
    }
  }

  // activate those two coolant modes before the spindle is turned on
  if ((tool.coolant == COOLANT_THROUGH_TOOL) || (tool.coolant == COOLANT_AIR_THROUGH_TOOL) || (tool.coolant == COOLANT_FLOOD_THROUGH_TOOL)) {
    if (!isFirstSection() && !insertToolCall && (currentCoolantMode != tool.coolant)) {
      onCommand(COMMAND_STOP_SPINDLE);
      forceSpindleSpeed = true;
    }
    setCoolant(tool.coolant);
  } else if ((currentCoolantMode == COOLANT_THROUGH_TOOL) || (currentCoolantMode == COOLANT_AIR_THROUGH_TOOL) || (currentCoolantMode == COOLANT_FLOOD_THROUGH_TOOL)) {
    onCommand(COMMAND_STOP_SPINDLE);
    setCoolant(COOLANT_OFF);
    forceSpindleSpeed = true;
  }

  if (toolChecked) {
    forceSpindleSpeed = true; // spindle must be restarted if tool is checked without a tool change
    toolChecked = false; // state of tool is not known at the beginning of a section since it could be broken for the previous section
  }

  var spindleChanged = tool.type != TOOL_PROBE &&
    (insertToolCall || forceSpindleSpeed || isFirstSection() ||
    (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) ||
    (tool.clockwise != getPreviousSection().getTool().clockwise));
  if (spindleChanged || (operationNeedsSafeStart && tool.type != TOOL_PROBE)) {
    forceSpindleSpeed = false;

    if (spindleSpeed < 1) {
      error(localize("Spindle speed out of range."));
      return;
    }
    maximumSpindleRPM = machineConfiguration.getMaximumSpindleSpeed() > 0 ? machineConfiguration.getMaximumSpindleSpeed() : 20000;
    if (spindleSpeed > maximumSpindleRPM) {
      warning(subst(localize("Spindle speed '" + spindleSpeed + " RPM' exceeds maximum value of '%1 RPM' in operation '%2'"), maximumSpindleRPM, String(getParameter("operation-comment"))));
    }
    skipBlock = !spindleChanged;
    writeBlock(
      sOutput.format(spindleSpeed), mFormat.format(tool.clockwise ? 3 : 4)
    );
  }

  if (getProperty("useParametricFeed") &&
      hasParameter("operation-strategy") &&
      (getParameter("operation-strategy") != "drill") && // legacy
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

  // Output modal commands here
  writeBlock(gAbsIncModal.format(90), gFeedModeModal.format(94), gPlaneModal.format(17));

  // wcs
  if (insertToolCall || operationNeedsSafeStart) { // force work offset when changing tool
    currentWorkOffset = undefined;
    skipBlock = operationNeedsSafeStart && !newWorkOffset && !insertToolCall;
  }

  if (currentSection.workOffset != currentWorkOffset) {
    forceWorkPlane();
    newWorkPlane = true;
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  forceXYZ();
  if (newWorkOffset) {
    forceWorkPlane();
    newWorkPlane = true;
  }

  var abc = defineWorkPlane(currentSection, false);
  setProbeAngle(); // output probe angle rotations if required

  if (operationNeedsSafeStart) {
    forceAny();
  } else { // don't force rotaries between 3D operations
    forceXYZ();
    forceFeed();
  }
  gMotionModal.reset();

  smoothing.force = operationNeedsSafeStart && (getProperty("useSmoothing") != "-1");
  setSmoothing(smoothing.isAllowed);

  var initialPosition = getFramePosition(currentSection.getInitialPosition());

  var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
  var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(toPreciseUnit(highFeedrate, MM)) : "";
  if (insertToolCall || retracted || operationNeedsSafeStart || newWorkPlane ||
      (!isFirstSection() && (currentSection.isMultiAxis() != getPreviousSection().isMultiAxis()))) {
    var lengthOffset = tool.lengthOffset;
    if ((lengthOffset > 200 && lengthOffset < 1000) || lengthOffset > 9999) {
      error(localize("Length offset out of range."));
      return;
    }

    gMotionModal.reset();

    prePositionXYZ(initialPosition, abc, lengthOffset, newWorkPlane);

    zIsOutput = true;
    gMotionModal.reset();
  } else {
    var x = xOutput.format(initialPosition.x);
    var y = yOutput.format(initialPosition.y);
    if (x && y) {
      // axes are not synchronized
      writeBlock(gAbsIncModal.format(90), gMotionModal.format(G), x, y, F);
    } else {
      writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), x, y);
    }
  }

  if (insertToolCall || operationNeedsSafeStart) {
    if (getProperty("preloadTool")) {
      var nextTool = getNextTool(tool.number);
      if (nextTool) {
        skipBlock = !insertToolCall;
        writeBlock("T" + toolFormat.format(nextTool.number));
      } else {
        // preload first tool
        var section = getSection(0);
        var firstToolNumber = section.getTool().number;
        if (tool.number != firstToolNumber) {
          skipBlock = !insertToolCall;
          writeBlock("T" + toolFormat.format(firstToolNumber));
        }
      }
    }
  }

  if (isProbeOperation()) {
    validate(probeVariables.probeAngleMethod != "G68", "You cannot probe while G68 Rotation is in effect.");
    validate(probeVariables.probeAngleMethod != "G54.4", "You cannot probe while workpiece setting error compensation G54.4 is enabled.");
    writeBlock(gFormat.format(65), "P" + 9832); // spin the probe on
    inspectionCreateResultsFileHeader();
  } else {
    if (isInspectionOperation() && (typeof inspectionProcessSectionStart == "function")) {
      inspectionProcessSectionStart();
    }
  }
  // define subprogram
  subprogramDefine(initialPosition, abc, retracted, zIsOutput);
}

function onDwell(seconds) {
  if (seconds > 99999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  seconds = clamp(0.001, seconds, 99999.999);
  writeBlock(gFeedModeModal.format(94), gFormat.format(4), "P" + milliFormat.format(seconds * 1000));
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(sOutput.format(spindleSpeed));
}

function onCycle() {
  writeBlock(gPlaneModal.format(17));
}

function getCommonCycle(x, y, z, r, c) {
  forceXYZ(); // force xyz on first drill hole of any cycle
  if (incrementalMode) {
    zOutput.format(c);
    return [xOutput.format(x), yOutput.format(y),
      "Z" + xyzFormat.format(z - r),
      "R" + xyzFormat.format(r - c)];
  } else {
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(r)];
  }
}

function setCyclePosition(_position) {
  switch (gPlaneModal.getCurrent()) {
  case 17: // XY
    zOutput.format(_position);
    break;
  case 18: // ZX
    yOutput.format(_position);
    break;
  case 19: // YZ
    xOutput.format(_position);
    break;
  }
}

/** Convert approach to sign. */
function approach(value) {
  validate((value == "positive") || (value == "negative"), "Invalid approach.");
  return (value == "positive") ? 1 : -1;
}

function setProbeAngleMethod() {
  probeVariables.probeAngleMethod = (machineConfiguration.getNumberOfAxes() < 5 || is3D()) ? (getProperty("useG54x4") ? "G54.4" : "G68") : "UNSUPPORTED";
  var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
  for (var i = 0; i < axes.length; ++i) {
    if (axes[i].isEnabled() && isSameDirection((axes[i].getAxis()).getAbsolute(), new Vector(0, 0, 1)) && axes[i].isTable()) {
      probeVariables.probeAngleMethod = "AXIS_ROT";
      probeVariables.rotationalAxis = axes[i].getCoordinate();
      break;
    }
  }
  probeVariables.outputRotationCodes = true;
}
/**
  Output rotation offset based on angular probing cycle.
*/
function setProbeAngle() {
  if (probeVariables.outputRotationCodes) {
    var probeOutputWorkOffset = currentSection.probeWorkOffset;
    validate(probeOutputWorkOffset <= 6, "Angular Probing only supports work offsets 1-6.");
    if (probeVariables.probeAngleMethod == "G68" && (Vector.diff(currentSection.getGlobalInitialToolAxis(), new Vector(0, 0, 1)).length > 1e-4)) {
      error(localize("You cannot use multi axis toolpaths while G68 Rotation is in effect."));
    }
    var validateWorkOffset = false;
    switch (probeVariables.probeAngleMethod) {
    case "G54.4":
      var param = 26000 + (probeOutputWorkOffset * 10);
      writeBlock("#" + param + "=#135");
      writeBlock("#" + (param + 1) + "=#136");
      writeBlock("#" + (param + 5) + "=#144");
      writeBlock(gFormat.format(54.4), "P" + probeOutputWorkOffset);
      break;
    case "G68":
      gRotationModal.reset();
      gAbsIncModal.reset();
      writeBlock(gRotationModal.format(68), gAbsIncModal.format(90), probeVariables.compensationXY, "R[#194]");
      validateWorkOffset = true;
      break;
    case "AXIS_ROT":
      var param = 5200 + probeOutputWorkOffset * 20 + probeVariables.rotationalAxis + 4;
      writeBlock("#" + param + " = " + "[#" + param + " + #194]");
      forceWorkPlane(); // force workplane to rotate ABC in order to apply rotation offsets
      currentWorkOffset = undefined; // force WCS output to make use of updated parameters
      validateWorkOffset = true;
      break;
    default:
      error(localize("Angular Probing is not supported for this machine configuration."));
      return;
    }
    if (validateWorkOffset) {
      for (var i = currentSection.getId(); i < getNumberOfSections(); ++i) {
        if (getSection(i).workOffset != currentSection.workOffset) {
          error(localize("WCS offset cannot change while using angle rotation compensation."));
          return;
        }
      }
    }
    probeVariables.outputRotationCodes = false;
  }
}

function protectedProbeMove(_cycle, x, y, z) {
  var _x = xOutput.format(x);
  var _y = yOutput.format(y);
  var _z = zOutput.format(z);
  if (_z && z >= getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
  if (_x || _y) {
    writeBlock(gFormat.format(65), "P" + 9810, _x, _y, getFeed(toPreciseUnit(highFeedrate, MM))); // protected positioning move
  }
  if (_z && z < getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
}

/**
  Cancel WCS rotation when needed.
*/
function cancelG68Rotation(force) {
  if (force) {
    gRotationModal.reset();
  }
  writeBlock(gRotationModal.format(69));
}

function repositionToCycleRetract(_cycle, x, y, z) {
  var toolAxis = currentSection.workPlane.forward;
  var position = Vector.sum(new Vector(x, y, z), Vector.product(toolAxis, _cycle.retract - _cycle.bottom));
  onRapid(position.x, position.y, position.z);
}

function onCyclePoint(x, y, z) {

  if (isInspectionOperation() && (typeof inspectionCycleInspect == "function")) {
    inspectionCycleInspect(cycle, x, y, z);
    return;
  }

  if (tapping && !isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
    if (cycleType == "tapping-with-chip-breaking") {
      error(localize("Tapping with chip breaking is not allowed outside of the XY-plane"));
    }
    repositionToCycleClearance(cycle, x, y, z);
    repositionToCycleRetract(cycle, x, y, z);
    gCycleModal.reset();
    forceXYZ();
    var tappingFPM = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
    var F = (getProperty("useG95forTapping") ? tool.getThreadPitch() : tappingFPM);
    if (getProperty("useG95forTapping")) {
      writeBlock(gFeedModeModal.format(95));
    }
    writeBlock(
      gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 174 : 184),
      xOutput.format(x), yOutput.format(y), zOutput.format(z),
      getProperty("useG95forTapping") ? pitchOutput.format(F) : feedOutput.format(F));
    onCycleEnd();
    return;
  }

  if (!isSameDirection(getRotation().forward, new Vector(0, 0, 1)) ||
      (!isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1)) && !useDWOCycles)) {
    expandCyclePoint(x, y, z);
    return;
  }
  if (isProbeOperation()) {
    if (!isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      if (!allowIndexingWCSProbing && currentSection.strategy == "probe") {
        error(localize("Updating WCS / work offset using probing is only supported by the CNC in the WCS frame."));
        return;
      } else if (getProperty("useMultiAxisFeatures")) {
        error(localize("Your machine does not support the selected probing operation with DWO enabled."));
        return;
      }
    }
    if (printProbeResults()) {
      writeProbingToolpathInformation(z - cycle.depth + tool.diameter / 2);
      inspectionWriteCADTransform();
      inspectionWriteWorkplaneTransform();
      if (typeof inspectionWriteVariables == "function") {
        inspectionVariables.pointNumber += 1;
      }
    }
    protectedProbeMove(cycle, x, y, z);
  }

  var forceCycle = false;
  switch (cycleType) {
  case "tapping-with-chip-breaking":
  case "left-tapping-with-chip-breaking":
  case "right-tapping-with-chip-breaking":
    forceCycle = true;
    if (!isFirstCyclePoint()) {
      writeBlock(gCycleModal.format(80));
      gMotionModal.reset();
    }
  }
  if (forceCycle || isFirstCyclePoint() || isProbeOperation()) {
    if (!isProbeOperation()) {
      // return to initial Z which is clearance plane and set absolute mode
      repositionToCycleClearance(cycle, x, y, z);
    }

    if (currentSection.feedMode == FEED_PER_REVOLUTION) {
      feedOutput.setFormat(feedPerRevFormat); // apply feedPerRevFormat to feedOutput
      writeBlock(gFeedModeModal.format(95));
    }
    var F = cycle.feedrate;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell * 1000, 99999999); // in milliseconds

    switch (cycleType) {
    case "drilling":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(81),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        feedOutput.format(F)
      );
      break;
    case "counter-boring":
      if (P > 0) {
        writeBlock(
          gRetractModal.format(98), gCycleModal.format(82),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "P" + milliFormat.format(P), // not optional
          feedOutput.format(F)
        );
      } else {
        writeBlock(
          gRetractModal.format(98), gCycleModal.format(81),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          feedOutput.format(F)
        );
      }
      break;
    case "chip-breaking":
      if ((cycle.accumulatedDepth < cycle.depth) && (cycle.incrementalDepthReduction > 0)) {
        expandCyclePoint(x, y, z);
      } else if (cycle.accumulatedDepth < cycle.depth) {
        writeBlock(
          gRetractModal.format(98), gCycleModal.format(73),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          ("Q" + xyzFormat.format(cycle.incrementalDepth)),
          ("K" + xyzFormat.format(cycle.accumulatedDepth)),
          conditional(P > 0, "P" + milliFormat.format(P)), // optional
          feedOutput.format(F)
        );
      } else {
        writeBlock(
          gRetractModal.format(98), gCycleModal.format(73),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          (((cycle.incrementalDepthReduction > 0) ? "I" : "Q") + xyzFormat.format(cycle.incrementalDepth)),
          conditional(cycle.incrementalDepthReduction > 0, "J" + xyzFormat.format(cycle.incrementalDepthReduction)),
          conditional(cycle.incrementalDepthReduction > 0, "K" + xyzFormat.format(cycle.minimumIncrementalDepth)),
          conditional(P > 0, "P" + milliFormat.format(P)), // optional
          feedOutput.format(F)
        );
      }
      break;
    case "deep-drilling":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(83),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        (((cycle.incrementalDepthReduction > 0) ? "I" : "Q") + xyzFormat.format(cycle.incrementalDepth)),
        conditional(cycle.incrementalDepthReduction > 0, "J" + xyzFormat.format(cycle.incrementalDepthReduction)),
        conditional(cycle.incrementalDepthReduction > 0, "K" + xyzFormat.format(cycle.minimumIncrementalDepth)),
        conditional(P > 0, "P" + milliFormat.format(P)), // optional
        feedOutput.format(F)
      );
      break;
    case "tapping":
      var tappingFPM = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
      F = (getProperty("useG95forTapping") ? tool.getThreadPitch() : tappingFPM);
      if (getProperty("useG95forTapping")) {
        writeBlock(gFeedModeModal.format(95));
      }
      writeBlock(
        gRetractModal.format(98), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 74 : 84),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        pitchOutput.format(F)
      );
      forceFeed();
      break;
    case "left-tapping":
      var tappingFPM = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
      F = (getProperty("useG95forTapping") ? tool.getThreadPitch() : tappingFPM);
      if (getProperty("useG95forTapping")) {
        writeBlock(gFeedModeModal.format(95));
      }
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(74),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        pitchOutput.format(F)
      );
      forceFeed();
      break;
    case "right-tapping":
      var tappingFPM = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
      F = (getProperty("useG95forTapping") ? tool.getThreadPitch() : tappingFPM);
      if (getProperty("useG95forTapping")) {
        writeBlock(gFeedModeModal.format(95));
      }
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(84),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        pitchOutput.format(F)
      );
      forceFeed();
      break;
    case "tapping-with-chip-breaking":
    case "left-tapping-with-chip-breaking":
    case "right-tapping-with-chip-breaking":
      if (cycle.accumulatedDepth < cycle.depth) {
        error(localize("Accumulated pecking depth is not supported for tapping cycles with chip breaking."));
        return;
      } else {
        var tappingFPM = tool.getThreadPitch() * rpmFormat.getResultingValue(spindleSpeed);
        F = (getProperty("useG95forTapping") ? tool.getThreadPitch() : tappingFPM);
        if (getProperty("useG95forTapping")) {
          writeBlock(gFeedModeModal.format(95));
        }
        // Parameter 57 bit 6, REPT RIG TAP, is set to 1 (On)
        // On Mill software versions12.09 and above, REPT RIG TAP has been moved from the Parameters to Setting 133
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
          if ((u - 0.001) <= cycle.bottom) {
            u = cycle.bottom;
          }
          if (first) {
            first = false;
            writeBlock(
              gRetractModal.format(99), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND ? 74 : 84)),
              getCommonCycle((gPlaneModal.getCurrent() == 19) ? u : x, (gPlaneModal.getCurrent() == 18) ? u : y, (gPlaneModal.getCurrent() == 17) ? u : z, cycle.retract, cycle.clearance),
              pitchOutput.format(F)
            );
          } else {
            var position;
            var depth;
            switch (gPlaneModal.getCurrent()) {
            case 17:
              xOutput.reset();
              position = xOutput.format(x);
              depth = zOutput.format(u);
              break;
            case 18:
              zOutput.reset();
              position = zOutput.format(z);
              depth = yOutput.format(u);
              break;
            case 19:
              yOutput.reset();
              position = yOutput.format(y);
              depth = xOutput.format(u);
              break;
            }
            writeBlock(conditional(u <= cycle.bottom, gRetractModal.format(98)), position, depth);
          }
          if (incrementalMode) {
            setCyclePosition(cycle.retract);
          }
        }
      }
      forceFeed();
      break;
    case "fine-boring":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(76),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "P" + milliFormat.format(P), // not optional
        "Q" + xyzFormat.format(cycle.shift),
        feedOutput.format(F)
      );
      forceSpindleSpeed = true;
      break;
    case "back-boring":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        var dx = (gPlaneModal.getCurrent() == 19) ? cycle.backBoreDistance : 0;
        var dy = (gPlaneModal.getCurrent() == 18) ? cycle.backBoreDistance : 0;
        var dz = (gPlaneModal.getCurrent() == 17) ? cycle.backBoreDistance : 0;
        writeBlock(
          gRetractModal.format(98), gCycleModal.format(77),
          getCommonCycle(x - dx, y - dy, z - dz, cycle.bottom, cycle.clearance),
          "Q" + xyzFormat.format(cycle.shift),
          feedOutput.format(F)
        );
        forceSpindleSpeed = true;
      }
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(85),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        feedOutput.format(F)
      );
      break;
    case "stop-boring":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gRetractModal.format(98), gCycleModal.format(86),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          feedOutput.format(F)
        );
        forceSpindleSpeed = true;
      }
      break;
    case "manual-boring":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(88),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "P" + milliFormat.format(P), // not optional
        feedOutput.format(F)
      );
      break;
    case "boring":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(89),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "P" + milliFormat.format(P), // not optional
        feedOutput.format(F)
      );
      break;
    case "probing-x":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "X" + xyzFormat.format(x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "Y" + xyzFormat.format(y + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-z":
      protectedProbeMove(cycle, x, y, Math.min(z - cycle.depth + cycle.probeClearance, cycle.retract));
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-wall":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-wall":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-channel":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-channel-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-channel":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-channel-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "D" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "Z" + xyzFormat.format(z - cycle.depth),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "Z" + xyzFormat.format(z - cycle.depth),
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width2),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "X" + xyzFormat.format(cycle.width1),
        "R" + xyzFormat.format(cycle.probeClearance),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Y" + xyzFormat.format(cycle.width2),
        "R" + xyzFormat.format(cycle.probeClearance),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Y" + xyzFormat.format(cycle.width2),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-inner-corner":
      var cornerX = x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2);
      var cornerY = y + approach(cycle.approach2) * (cycle.probeClearance + tool.diameter / 2);
      var cornerI = 0;
      var cornerJ = 0;
      if (cycle.probeSpacing !== undefined) {
        cornerI = cycle.probeSpacing;
        cornerJ = cycle.probeSpacing;
      }
      if ((cornerI != 0) && (cornerJ != 0)) {
        if (currentSection.strategy == "probe") {
          setProbeAngleMethod();
          probeVariables.compensationXY = "X[#185] Y[#186]";
        }
      }
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9815, xOutput.format(cornerX), yOutput.format(cornerY),
        conditional(cornerI != 0, "I" + xyzFormat.format(cornerI)),
        conditional(cornerJ != 0, "J" + xyzFormat.format(cornerJ)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-outer-corner":
      var cornerX = x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2);
      var cornerY = y + approach(cycle.approach2) * (cycle.probeClearance + tool.diameter / 2);
      var cornerI = 0;
      var cornerJ = 0;
      if (cycle.probeSpacing !== undefined) {
        cornerI = cycle.probeSpacing;
        cornerJ = cycle.probeSpacing;
      }
      if ((cornerI != 0) && (cornerJ != 0)) {
        if (currentSection.strategy == "probe") {
          setProbeAngleMethod();
          probeVariables.compensationXY = "X[#185] Y[#186]";
        }
      }
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9816, xOutput.format(cornerX), yOutput.format(cornerY),
        conditional(cornerI != 0, "I" + xyzFormat.format(cornerI)),
        conditional(cornerJ != 0, "J" + xyzFormat.format(cornerJ)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-plane-angle":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9843,
        "X" + xyzFormat.format(x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "D" + xyzFormat.format(cycle.probeSpacing),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "A" + xyzFormat.format(cycle.nominalAngle != undefined ? cycle.nominalAngle : 90),
        getProbingArguments(cycle, false)
      );
      if (currentSection.strategy == "probe") {
        setProbeAngleMethod();
        probeVariables.compensationXY = "X" + xyzFormat.format(0) + " Y" + xyzFormat.format(0);
      }
      break;
    case "probing-y-plane-angle":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9843,
        "Y" + xyzFormat.format(y + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "D" + xyzFormat.format(cycle.probeSpacing),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "A" + xyzFormat.format(cycle.nominalAngle != undefined ? cycle.nominalAngle : 0),
        getProbingArguments(cycle, false)
      );
      if (currentSection.strategy == "probe") {
        setProbeAngleMethod();
        probeVariables.compensationXY = "X" + xyzFormat.format(0) + " Y" + xyzFormat.format(0);
      }
      break;
    case "probing-xy-pcd-hole":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9819,
        "A" + xyzFormat.format(cycle.pcdStartingAngle),
        "B" + xyzFormat.format(cycle.numberOfSubfeatures),
        "C" + xyzFormat.format(cycle.widthPCD),
        "D" + xyzFormat.format(cycle.widthFeature),
        "K" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, false)
      );
      if (cycle.updateToolWear) {
        error(localize("Action -Update Tool Wear- is not supported with this cycle"));
        return;
      }
      break;
    case "probing-xy-pcd-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9819,
        "A" + xyzFormat.format(cycle.pcdStartingAngle),
        "B" + xyzFormat.format(cycle.numberOfSubfeatures),
        "C" + xyzFormat.format(cycle.widthPCD),
        "D" + xyzFormat.format(cycle.widthFeature),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, false)
      );
      if (cycle.updateToolWear) {
        error(localize("Action -Update Tool Wear- is not supported with this cycle"));
        return;
      }
      break;
    default:
      expandCyclePoint(x, y, z);
    }

    // place cycle operation in subprogram
    if (cycleSubprogramIsActive) {
      if (forceCycle || cycleExpanded || isProbeOperation()) {
        cycleSubprogramIsActive = false;
      } else {
        // call subprogram
        writeBlock(mFormat.format(97), "P" + nFormat.format(currentSubprogram));
        subprogramStart(new Vector(x, y, z), new Vector(0, 0, 0), false);
      }
    }
    if (incrementalMode) { // set current position to clearance height
      setCyclePosition(cycle.clearance);
    }

  // 2nd through nth cycle point
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      var _x;
      var _y;
      var _z;
      if (!xyzFormat.areDifferent(x, xOutput.getCurrent()) &&
          !xyzFormat.areDifferent(y, yOutput.getCurrent()) &&
          !xyzFormat.areDifferent(z, zOutput.getCurrent())) {
        switch (gPlaneModal.getCurrent()) {
        case 17: // XY
          xOutput.reset(); // at least one axis is required
          break;
        case 18: // ZX
          zOutput.reset(); // at least one axis is required
          break;
        case 19: // YZ
          yOutput.reset(); // at least one axis is required
          break;
        }
      }
      if (incrementalMode) { // set current position to retract height
        setCyclePosition(cycle.retract);
      }
      writeBlock(xOutput.format(x), yOutput.format(y), zOutput.format(z));
      if (incrementalMode) { // set current position to clearance height
        setCyclePosition(cycle.clearance);
      }
    }
  }
}

function getProbingArguments(cycle, updateWCS) {
  var outputWCSCode = updateWCS && currentSection.strategy == "probe";
  var probeOutputWorkOffset = currentSection.probeWorkOffset;
  if (outputWCSCode) {
    validate(
      probeOutputWorkOffset > 0 && (probeOutputWorkOffset > 6 ? probeOutputWorkOffset - 6 : probeOutputWorkOffset) <= 99,
      "Work offset is out of range."
    );
    var nextWorkOffset = hasNextSection() ? getNextSection().workOffset == 0 ? 1 : getNextSection().workOffset : -1;
    if (probeOutputWorkOffset == nextWorkOffset) {
      currentWorkOffset = undefined;
    }
  }
  return [
    (cycle.angleAskewAction == "stop-message" ? "B" + xyzFormat.format(cycle.toleranceAngle ? cycle.toleranceAngle : 0) : undefined),
    ((cycle.updateToolWear && cycle.toolWearErrorCorrection < 100) ? "F" + xyzFormat.format(cycle.toolWearErrorCorrection ? cycle.toolWearErrorCorrection / 100 : 100) : undefined),
    (cycle.wrongSizeAction == "stop-message" ? "H" + xyzFormat.format(cycle.toleranceSize ? cycle.toleranceSize : 0) : undefined),
    (cycle.outOfPositionAction == "stop-message" ? "M" + xyzFormat.format(cycle.tolerancePosition ? cycle.tolerancePosition : 0) : undefined),
    ((cycle.updateToolWear && cycleType == "probing-z") ? "T" + xyzFormat.format(cycle.toolLengthOffset) : undefined),
    ((cycle.updateToolWear && cycleType !== "probing-z") ? "T" + xyzFormat.format(cycle.toolDiameterOffset) : undefined),
    (cycle.updateToolWear ? "V" + xyzFormat.format(cycle.toolWearUpdateThreshold ? cycle.toolWearUpdateThreshold : 0) : undefined),
    (cycle.printResults ? "W" + xyzFormat.format(1 + cycle.incrementComponent) : undefined), // 1 for advance feature, 2 for reset feature count and advance component number. first reported result in a program should use W2.
    conditional(outputWCSCode, (probeOutputWorkOffset > 6 ? probeExtWCSFormat.format((probeOutputWorkOffset - 6)) : probeWCSFormat.format(probeOutputWorkOffset)))
  ];
}

function onCycleEnd() {
  if (isProbeOperation()) {
    zOutput.reset();
    gMotionModal.reset();
    writeBlock(gFormat.format(65), "P" + 9810, zOutput.format(cycle.retract)); // protected retract move
  } else {
    if (cycleSubprogramIsActive) {
      subprogramEnd();
      cycleSubprogramIsActive = false;
    }
    if (!cycleExpanded || tapping) {
      writeBlock(gCycleModal.format(80));
      gMotionModal.reset();
      feedOutput.reset();
    }
    writeBlock(gFeedModeModal.format(94));
    if (currentSection.feedMode == FEED_PER_REVOLUTION) {
      feedOutput.setFormat(feedFormat); // re-apply feedFormat to feedOutput
    }
  }
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onRapid(_x, _y, _z) {
  if (knuckleAdjustmentIsActive) {
    knuckleRapid(_x, _y, _z);
    return;
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      error(localize("Radius compensation mode cannot be changed at rapid traversal."));
      return;
    }
    if (!getProperty("useG0") && (((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) > 1)) {
      // axes are not synchronized
      writeBlock(gFeedModeModal.format(94), gMotionModal.format(1), x, y, z, getFeed(toPreciseUnit(highFeedrate, MM)));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z);
      forceFeed();
    }
  }
}

function onLinear(_x, _y, _z, feed) {
  var c = "";
  if (knuckleAdjustmentIsActive) {
    c = knuckleLinear(_x, _y, _z, feed);
    if (c == "false") {
      return;
    } else if ((getProperty("adjustKnuckleAngle") == "preposition") && c) {
      writeBlock(gMotionModal.format(0), c);
      c = "";
    }
  }

  if (pendingRadiusCompensation >= 0) {
    // ensure that we end at desired position when compensation is turned off
    xOutput.reset();
    yOutput.reset();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(feed);
  var fMode = currentSection.feedMode == FEED_PER_REVOLUTION ? 95 : 94;
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      var d = tool.diameterOffset;
      if ((d > 200 && d < 1000) || d > 9999) {
        warning(localize("Diameter offset out of range."));
      }
      writeBlock(gPlaneModal.format(17), gFeedModeModal.format(fMode));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(41), x, y, z, c, dOutput.format(d), f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(42), x, y, z, c, dOutput.format(d), f);
        break;
      default:
        writeBlock(gMotionModal.format(1), gFormat.format(40), x, y, z, c, f);
      }
    } else {
      writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), x, y, z, c, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
  previousZ = _z;
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (!currentSection.isOptimizedForMachine()) {
    error(localize("This post configuration has not been customized for 5-axis simultaneous toolpath."));
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
  var b = bOutput.format(_b);
  var c = cOutput.format(_c);
  if (x || y || z || a || b || c) {
    var numLinear = (x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0);
    var numRotary = (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0);
    if ((!getProperty("useG0") && numLinear > 1) || numRotary > 0 || operationSupportsTCP) { // required with rotary moves to maintain TCP
      writeBlock(gMotionModal.format(1), x, y, z, a, b, c, getFeed(toPreciseUnit(highFeedrate, MM)));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
      forceFeed();
    }
  }
  previousABCPosition = new Vector(_a, _b, _c);
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  if (!currentSection.isOptimizedForMachine()) {
    error(localize("This post configuration has not been customized for 5-axis simultaneous toolpath."));
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
  var b = bOutput.format(_b);
  var c = cOutput.format(_c);

  var f = {};
  f.frn = feedOutput.format(feed);
  f.fmode = 94;

  if (x || y || z || a || b || c) {
    writeBlock(gFeedModeModal.format(f.fmode), gMotionModal.format(1), x, y, z, a, b, c, f.frn);
  } else if (f.frn) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      feedOutput.reset(); // force feed on next line
    } else {
      writeBlock(gFeedModeModal.format(f.fmode), gMotionModal.format(1), f.frn);
    }
  }
  previousABCPosition = new Vector(_a, _b, _c);
}

// Start of automatic C-axis positioning logic
var knuckleFeed = toPreciseUnit(10, IN); // plunge feedrate during retract/reposition
var minimumKnuckleDistance = toPreciseUnit(0.2, IN); // distance along linear move to rotate C-axis
var safeKnuckleDistance = 0.2; // distance above part to retract when C-axis has to be repositioned
var previousKnuckleAngle = 0; // maintained by post
var previousZ; // maintained by post
var knuckleAdjustmentIsActive; // defined in onSection
var safeKnuckleClearance; // defined in onSection

var rapidMove; // rapid move buffering
var rapidDir;
var rapidIsBuffered = false;

var linearMove; // linear move buffering
var linearFeed;
var linearIsBuffered = false;

function getKnuckleAngle(start, end, center, plane, clockwise) {
  var angle;
  if (center != undefined) {
    var endVec = Vector.diff(end, center).normalized;
    var axis = plane == PLANE_ZX ? new Vector(0, 1, 0) : (plane == PLANE_YZ ? new Vector(1, 0, 0) : new Vector(0, 0, 1));
    var fwdVec = clockwise ? Vector.cross(endVec, axis) : Vector.cross(axis, endVec);
    angle = toRad(getProperty("baseKnuckleAngle")) - fwdVec.getXYAngle();
  } else {
    var fwdVec = Vector.diff(end, start).getNormalized();
    if ((xyzFormat.getResultingValue(start.x) == xyzFormat.getResultingValue(end.x)) &&
      (xyzFormat.getResultingValue(start.y) == xyzFormat.getResultingValue(end.y))) {
      angle = previousKnuckleAngle;
    } else {
      angle = toRad(getProperty("baseKnuckleAngle")) - fwdVec.getXYAngle();
    }
  }
  return checkKnuckleAngle(angle, true, true);
}

function checkKnuckleAngle(angle, output, reposition) {
  //writeDebug("angle = " + abcFormat.format(angle));
  //writeDebug("previous = " + abcFormat.format(previousKnuckleAngle));
  var diff = angle - previousKnuckleAngle;
  var i = 0;
  while (true) {
    if (diff > Math.PI) {
      diff -= Math.PI * 2;
    } else if (diff < -Math.PI) {
      diff += Math.PI * 2;
    } else {
      break;
    }
    i++;
    if (i == 10) {
      error(localize("Cannot calculate C-axis angle"));
      return "";
    }
  }
  angle = toRad(abcFormat.getResultingValue(previousKnuckleAngle + diff));
  angle = (angle < machineConfiguration.getAxisV().getRange().minimum) ? angle + (Math.PI * 2) : angle;
  angle = (angle > machineConfiguration.getAxisV().getRange().maximum) ? angle - (Math.PI * 2) : angle;
  diff = angle - previousKnuckleAngle;

  if (reposition) {
    if (!repositionKnuckle(angle, diff, false)) {
      return "";
    }
  }

  if (output) {
    var c = cOutput.format(angle);
    previousKnuckleAngle = angle;
    return c;
  }
  return "";
}

function repositionKnuckle(angle, diff, force) {
  if (force || ((abcFormat.getResultingValue(Math.abs(diff)) > 180) && !rapidIsBuffered)) {
    if (force) {
      cOutput.reset();
    }
    var comment = force ? "" : formatComment("Reposition Head");

    switch (getProperty("adjustKnuckleAngle")) {
    case "staydown":
      var c = cOutput.format(angle);
      writeBlock(gMotionModal.format(1), c, getFeed(toPreciseUnit(highFeedrate, MM)), comment);
      break;
    case "retract":
      var c = cOutput.format(angle);
      writeBlock(gMotionModal.format(1), zOutput.format(safeKnuckleClearance), getFeed(toPreciseUnit(highFeedrate, MM)));
      writeBlock(gMotionModal.format(1), c, getFeed(toPreciseUnit(highFeedrate, MM)), comment);
      writeBlock(gMotionModal.format(1), zOutput.format(getCurrentPosition().z), feedOutput.format(knuckleFeed));
      break;
    case "lock":
      return false;
    }
  }
  return true;
}

function knuckleRapid(_x, _y, _z) {
  flushRapid("");
  previousKnuckleAngle = 0;
  rapidMove = new Vector(_x, _y, _z);
  rapidDir = Vector.diff(rapidMove, getCurrentPosition()).normalized;
  rapidIsBuffered = true;
  if (!getNextRecord().isMotion()) {
    flushRapid("");
  }
}

function flushRapid(c) {
  if (!rapidIsBuffered) {
    return c;
  }
  // writeDebug("buffered rapid");
  var x = xOutput.format(rapidMove.x);
  var y = yOutput.format(rapidMove.y);
  var z = zOutput.format(rapidMove.z);
  if (x || y || z) {
    if ((getProperty("adjustKnuckleAngle") == "retract") && (previousZ < safeKnuckleClearance) && c) {
      repositionKnuckle(previousKnuckleAngle, 0, true);
      writeBlock(gMotionModal.format(1), x, y, z, feedOutput.format(toPreciseUnit(highFeedrate, MM)));
      if (!z) {
        writeBlock(gMotionModal.format(1), zOutput.format(previousZ), getFeed(toPreciseUnit(highFeedrate, MM))); // plunge back down in Z
      }
    } else {
      writeBlock(gMotionModal.format(1), x, y, z, c, getFeed(toPreciseUnit(highFeedrate, MM)));
    }
    feedOutput.reset();
    c = "";
  }
  previousZ = rapidMove.z;
  rapidIsBuffered = false;

  if (linearIsBuffered) {
    //writeDebug("buffered linear");

    var x = xOutput.format(linearMove.x);
    var y = yOutput.format(linearMove.y);
    var z = zOutput.format(linearMove.z);
    if (x || y || z) {
      writeBlock(gMotionModal.format(1), x, y, z, feedOutput.format(linearFeed));
      feedOutput.reset();
    }
    previousZ = linearMove.z;
    linearIsBuffered = false;
  }
  return c;
}

function knuckleLinear(_x, _y, _z, feed) {
  var current = getCurrentPosition();
  var end = new Vector(_x, _y, _z);
  var fwd = Vector.diff(end, current).normalized;
  if (isSameDirection(fwd, new Vector(0, 0, -1))) {
    if (true) {
      linearMove = end;
      linearFeed = feed;
      linearIsBuffered = true;
      return "false";
    }
  }

  var c = getKnuckleAngle(current, end);
  c = flushRapid(c);

  if ((getProperty("adjustKnuckleAngle") == "preposition") && c) {
    writeBlock(gMotionModal.format(0), c);
    c = "";
  } else if (c) {
    var dist = Vector.diff(current, end).length;
    if (dist > minimumKnuckleDistance) {
      var midpoint = Vector.sum(current, Vector.product(fwd, minimumKnuckleDistance));
      writeBlock(gMotionModal.format(1), xOutput.format(midpoint.x), yOutput.format(midpoint.y), zOutput.format(midpoint.z), c, feedOutput.format(feed));
      c = "";
    }
  }

  return c;
}

function linearizeCircular(c, toler) {
  if (c) {
    cOutput.reset();
  }
  linearize(toler);
}
// End of automatic C-axis positioning logic

// Start of onRewindMachine logic
/** Allow user to override the onRewind logic. */
function onRewindMachineEntry(_a, _b, _c) {
  return false;
}

/** Retract to safe position before indexing rotaries. */
var safeRetractPositionZ;
function onMoveToSafeRetractPosition() {
  var position = getCurrentPosition();
  var workpiece = getWorkpiece();
  safeRetractPositionZ = workpiece.upper.z + getProperty("safeRetractDistanceZ");
  writeRetractSafeZ(new Vector(position.x, position.y, safeRetractPositionZ), false, false, "", false);
  if (getProperty("centerOnMultiAxis")) {
    invokeOnRapid(
      workpiece.lower.x + ((workpiece.upper.x - workpiece.lower.x) / 2),
      workpiece.lower.y + ((workpiece.upper.y - workpiece.lower.y) / 2),
      safeRetractPositionZ
    );
  }
}

/** Rotate axes to new position above reentry position */
function onRotateAxes(_x, _y, _z, _a, _b, _c) {
  // position rotary axes
  xOutput.disable();
  yOutput.disable();
  zOutput.disable();
  if (typeof unwindABC == "function") {
    unwindABC(new Vector(_a, _b, _c), false);
  }
  onLinear5D(_x, _y, _z, _a, _b, _c, highRotaryFeedrate);
  setCurrentABC(new Vector(_a, _b, _c));
  xOutput.enable();
  yOutput.enable();
  zOutput.enable();
}

/** Return from safe position after indexing rotaries. */
function onReturnFromSafeRetractPosition(_x, _y, _z) {
  if (getProperty("centerOnMultiAxis")) {
    invokeOnRapid(_x, _y, safeRetractPositionZ);
  }
  invokeOnRapid(_x, _y, _z);
}
// End of onRewindMachine logic

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (isSpiral()) {
    var startRadius = getCircularStartRadius();
    var endRadius = getCircularRadius();
    var dr = Math.abs(endRadius - startRadius);
    if (dr > maximumCircularRadiiDifference) { // maximum limit
      linearize(tolerance); // or alternatively use other G-codes for spiral motion
      return;
    }
  }

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();

  var c = "";
  if (knuckleAdjustmentIsActive && (getProperty("knuckleCircular") != "false")) {
    c = getKnuckleAngle(start, new Vector(x, y, z), new Vector(cx, cy, cz), getCircularPlane(), clockwise);
    c = flushRapid(c);
  } else if (getProperty("knuckleCircular") == "false") {
    linearize(tolerance);
    return;
  }

  if (isFullCircle()) {
    if (getProperty("useRadius") || isHelical()) { // radius mode does not support full arcs
      linearizeCircular(c, tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx - start.x), jOutput.format(cy - start.y), c, getFeed(feed));
      break;
    case PLANE_ZX:
      if (activeDWO && machineConfiguration.isHeadConfiguration()) {
        linearizeCircular(c, tolerance);
      } else {
        writeBlock(gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx - start.x), kOutput.format(cz - start.z), c, getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (activeDWO && machineConfiguration.isHeadConfiguration()) {
        linearizeCircular(c, tolerance);
      } else {
        writeBlock(gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jOutput.format(cy - start.y), kOutput.format(cz - start.z), c, getFeed(feed));
      }
      break;
    default:
      linearizeCircular(c, tolerance);
    }
  } else if (!getProperty("useRadius")) {
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), jOutput.format(cy - start.y), c, getFeed(feed));
      break;
    case PLANE_ZX:
      if (activeDWO && machineConfiguration.isHeadConfiguration()) {
        linearizeCircular(c, tolerance);
      } else {
        writeBlock(gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), kOutput.format(cz - start.z), c, getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (activeDWO && machineConfiguration.isHeadConfiguration()) {
        linearizeCircular(c, tolerance);
      } else {
        writeBlock(gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y), kOutput.format(cz - start.z), c, getFeed(feed));
      }
      break;
    default:
      linearizeCircular(c, tolerance);
    }
  } else { // use radius mode
    var r = getCircularRadius();
    if (toDeg(getCircularSweep()) > (180 + 1e-9)) {
      r = -r; // allow up to <360 deg arcs
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), c, "R" + rFormat.format(r), getFeed(feed));
      break;
    case PLANE_ZX:
      if (activeDWO && machineConfiguration.isHeadConfiguration()) {
        linearizeCircular(c, tolerance);
      } else {
        writeBlock(gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), c, "R" + rFormat.format(r), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (activeDWO && machineConfiguration.isHeadConfiguration()) {
        linearizeCircular(c, tolerance);
      } else {
        writeBlock(gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), c, "R" + rFormat.format(r), getFeed(feed));
      }
      break;
    default:
      linearizeCircular(c, tolerance);
    }
  }
}

var currentCoolantMode = COOLANT_OFF;
var coolantOff = undefined;
var forceCoolant = false;
var isOptionalCoolant = false;
var isSpecialCoolantActive = false;

function setCoolant(coolant) {
  var coolantCodes = getCoolantCodes(coolant);
  forceSingleLine = false;
  currentCoolantPressure = coolant == COOLANT_FLOOD ? currentCoolantPressure : "";
  if ((coolantCodes != undefined) && (coolant == COOLANT_FLOOD)) {
    if (coolantPressure != "") {
      forceSingleLine = true;
      coolantCodes.push(coolantPressure);
    }
    currentCoolantPressure = coolantPressure;
  }
  if (Array.isArray(coolantCodes)) {
    if (singleLineCoolant || forceSingleLine) {
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

function getCoolantCodes(coolant) {
  isOptionalCoolant = false;
  var multipleCoolantBlocks = new Array(); // create a formatted array to be passed into the outputted line
  if (!coolants) {
    error(localize("Coolants have not been defined."));
  }
  if (tool.type == TOOL_PROBE) { // avoid coolant output for probing
    coolant = COOLANT_OFF;
  }
  if (coolant == currentCoolantMode) {
    if (operationNeedsSafeStart && coolant != COOLANT_OFF && !isSpecialCoolantActive) {
      isOptionalCoolant = true;
    } else if (!forceCoolant || coolant == COOLANT_OFF) {
      return undefined; // coolant is already active
    }
  }
  if ((coolant != COOLANT_OFF) && (currentCoolantMode != COOLANT_OFF) && (coolantOff != undefined) && !isOptionalCoolant && !forceCoolant) {
    if (Array.isArray(coolantOff)) {
      for (var i in coolantOff) {
        multipleCoolantBlocks.push(coolantOff[i]);
      }
    } else {
      multipleCoolantBlocks.push(coolantOff);
    }
  }
  forceCoolant = false;

  if (isSpecialCoolantActive) {
    forceSpindleSpeed = true;
  }
  var m;
  var coolantCodes = {};
  for (var c in coolants) { // find required coolant codes into the coolants array
    if (coolants[c].id == coolant) {
      isSpecialCoolantActive = (coolants[c].id == COOLANT_THROUGH_TOOL) || (coolants[c].id == COOLANT_FLOOD_THROUGH_TOOL) || (coolants[c].id == COOLANT_AIR_THROUGH_TOOL);
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
    for (var i in multipleCoolantBlocks) {
      if (typeof multipleCoolantBlocks[i] == "number") {
        multipleCoolantBlocks[i] = mFormat.format(multipleCoolantBlocks[i]);
      }
    }
    return multipleCoolantBlocks; // return the single formatted coolant value
  }
  return undefined;
}

var mapCommand = {
  COMMAND_END                     : 2,
  COMMAND_SPINDLE_CLOCKWISE       : 3,
  COMMAND_SPINDLE_COUNTERCLOCKWISE: 4,
  COMMAND_STOP_SPINDLE            : 5,
  COMMAND_ORIENTATE_SPINDLE       : 19,
  COMMAND_LOAD_TOOL               : 6
};

function onCommand(command) {
  switch (command) {
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_OPTIONAL_STOP:
    writeBlock(mFormat.format(1));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_COOLANT_ON:
    setCoolant(COOLANT_FLOOD);
    return;
  case COMMAND_COOLANT_OFF:
    setCoolant(COOLANT_OFF);
    return;
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    if (axisIsClamped && !operationNeedsSafeStart) {
      return;
    }
    var outputClampCodes = getProperty("useClampCodes") || currentSection.isMultiAxis();
    if (outputClampCodes && machineConfiguration.isMultiAxisConfiguration() && (machineConfiguration.getNumberOfAxes() >= 4)) {
      var _skipBlock = skipBlock;
      writeBlock(mClampModal.format(10)); // lock 4th-axis motion
      if (machineConfiguration.getNumberOfAxes() == 5) {
        skipBlock = _skipBlock;
        writeBlock(mClampModal.format(12)); // lock 5th-axis motion
      }
    }
    axisIsClamped = true;
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    if (!axisIsClamped && !operationNeedsSafeStart) {
      return;
    }
    if (machineConfiguration.isMultiAxisConfiguration() && (machineConfiguration.getNumberOfAxes() >= 4)) {
      var _skipBlock = skipBlock;
      writeBlock(mClampModal.format(11)); // unlock 4th-axis motion
      if (machineConfiguration.getNumberOfAxes() == 5) {
        skipBlock = _skipBlock;
        writeBlock(mClampModal.format(13)); // unlock 5th-axis motion
      }
    }
    axisIsClamped = false;
    return;
  case COMMAND_BREAK_CONTROL:
    if (!toolChecked) { // avoid duplicate COMMAND_BREAK_CONTROL
      prepareForToolCheck();
      writeBlock(
        gFormat.format(65),
        "P" + 9853,
        "T" + toolFormat.format(tool.number),
        "B" + xyzFormat.format(0),
        "H" + xyzFormat.format(getProperty("toolBreakageTolerance"))
      );
      toolChecked = true;
      lengthCompensationActive = false; // macro 9853 cancels tool length compensation
    }
    return;
  case COMMAND_TOOL_MEASURE:
    measureTool = true;
    return;
  case COMMAND_START_CHIP_TRANSPORT:
    // writeBlock(mFormat.format(31));
    return;
  case COMMAND_STOP_CHIP_TRANSPORT:
    // writeBlock(mFormat.format(33));
    return;
  case COMMAND_PROBE_ON:
    return;
  case COMMAND_PROBE_OFF:
    return;
  }

  var stringId = getCommandStringId(command);
  var mcode = mapCommand[stringId];
  if (mcode != undefined) {
    writeBlock(mFormat.format(mcode));
  } else {
    onUnsupportedCommand(command);
  }
}

var toolChecked = false; // specifies that the tool has been checked with the probe

function onSectionEnd() {
  if (typeof inspectionProcessSectionEnd == "function") {
    inspectionProcessSectionEnd();
  }
  if (!isLastSection() && (getNextSection().getTool().coolant != tool.coolant)) {
    setCoolant(COOLANT_OFF);
  }
  if ((((getCurrentSectionId() + 1) >= getNumberOfSections()) ||
      (tool.number != getNextSection().getTool().number)) &&
      tool.breakControl) {
    onCommand(COMMAND_BREAK_CONTROL);
  } else {
    toolChecked = false;
  }

  if (true) {
    if (isRedirecting()) {
      if (firstPattern) {
        var finalPosition = getFramePosition(currentSection.getFinalPosition());
        var abc;
        if (currentSection.isMultiAxis() && machineConfiguration.isMultiAxisConfiguration()) {
          abc = currentSection.getFinalToolAxisABC();
        } else {
          abc = currentWorkPlaneABC;
        }
        if (abc == undefined) {
          abc = new Vector(0, 0, 0);
        }
        setAbsIncMode(false, finalPosition, abc);
        subprogramEnd();
      }
    }
  }
  if (getProperty("safeStartAllOperations")) {
    forceAny();
  } else { // don't force rotaries between 3D operations
    forceXYZ();
    forceFeed();
  }

  if (isProbeOperation()) {
    writeBlock(gFormat.format(65), "P" + 9833); // spin the probe off
    if (probeVariables.probeAngleMethod != "G68") {
      setProbeAngle(); // output probe angle rotations if required
    }
  }

  operationNeedsSafeStart = false; // reset for next section

  // the code below gets the machine angles from previous operation.  closestABC must also be set to true
  if (currentSection.isMultiAxis() && currentSection.isOptimizedForMachine()) {
    currentMachineABC = currentSection.getFinalToolAxisABC();
  }

  writeBlock(gFeedModeModal.format(94)); // feed per minute

  if (currentSection.isMultiAxis()) {
    if (hasNextSection() && !getNextSection().isMultiAxis()) {
      onCommand(COMMAND_LOCK_MULTI_AXIS);
    }
  }

  // reset for next section
  coolantPressure = "";
}

/** Output block to do safe retract in Z for head machine. */
function writeRetractSafeZ(position, enableComp, forceTCP, comment, forceRetract) {

  if (!retracted || forceRetract) {
    var lengthOffset = tool.lengthOffset;
    var workpiece = getWorkpiece();
    var clearance = workpiece.upper.z + getProperty("safeRetractDistanceZ");

    if ((clearance > getCurrentPosition().z) || enableComp || forceRetract) {
      if (typeof position != "number") {
        forceXYZ();
        writeBlock(
          gMotionModal.format(0),
          conditional(enableComp, gFormat.format((currentSection.isMultiAxis() || forceTCP || knuckleAdjustmentIsActive) ? 234 : 43)),
          xOutput.format(position.x),
          yOutput.format(position.y),
          zOutput.format(position.z),
          conditional(enableComp, hFormat.format(lengthOffset)),
          conditional(comment, formatComment(comment))
        );
      } else {
        zOutput.reset();
        writeBlock(
          gMotionModal.format(0),
          conditional(enableComp, gFormat.format((currentSection.isMultiAxis() || forceTCP || knuckleAdjustmentIsActive) ? 234 : 43)),
          zOutput.format(position),
          conditional(enableComp, hFormat.format(lengthOffset)),
          conditional(comment, formatComment(comment))
        );
      }
      feedOutput.reset();
    }
    lengthCompensationActive = enableComp ? true : lengthCompensationActive;

    // optional move to safe XY - not implemented
  }
}

/** Calculates the retract plane based on the B-axis position. */
var baseRetractDiameter = toPreciseUnit(3, IN); // minimum tool diameter for retract plane calculations
var baseRetractPosition = toPreciseUnit(-13.5, IN); // upper retract limit with B90
function calculateRetractPlane(_abc) {
  // retract to full height
  if (!adjustRetractHeight) {
    return machineConfiguration.getRetractPlane();
  }

  var radius = Math.max(tool.diameter, baseRetractDiameter) / 2;
  var retractPosition = baseRetractPosition - (radius - (baseRetractDiameter / 2));
  var b = Math.abs(_abc.y);
  var minAngle = toRad(42); // minumum angle to consider for adjustment
  var plane = 0;
  if (b > minAngle) {
    var max = toRad(90) - minAngle;
    var delta = b - minAngle;
    plane = (delta / max) * retractPosition;
  }
  // var plane = Math.sin(Math.abs(_abc.y) - minAngle) * retractPosition;
  return (plane < machineConfiguration.getRetractPlane()) ? plane : machineConfiguration.getRetractPlane();
}

/** Output block to do safe retract and/or move to home position. */
function writeRetract() {
  // initialize routine
  var _xyzMoved = new Array(false, false, false);
  var _useG28 = getProperty("useG28"); // can be either true or false
  var _skipBlock = skipBlock;

  // check syntax of call
  if (arguments.length == 0) {
    error(localize("No axis specified for writeRetract()."));
    return;
  }
  for (var i = 0; i < arguments.length; ++i) {
    if ((arguments[i] < 0) || (arguments[i] > 2)) {
      error(localize("Bad axis specified for writeRetract()."));
      return;
    }
    if (_xyzMoved[arguments[i]]) {
      error(localize("Cannot retract the same axis twice in one line"));
      return;
    }
    _xyzMoved[arguments[i]] = true;
  }

  // special conditions
  if (_useG28 && _xyzMoved[2] && (_xyzMoved[0] || _xyzMoved[1])) { // XY don't use G28
    error(localize("You cannot move home in XY & Z in the same block."));
    return;
  }
  if (_xyzMoved[0] || _xyzMoved[1]) {
    _useG28 = false;
  }
  cancelG68Rotation(); // G68 has to be canceled for retracts
  var retractPlane = calculateRetractPlane(previousABCPosition); // calculate safe retract height

  // define home positions
  var _xHome;
  var _yHome;
  var _zHome;
  if (_useG28) {
    _xHome = 0;
    _yHome = 0;
    _zHome = 0;
  } else {
    _xHome = machineConfiguration.hasHomePositionX() ? machineConfiguration.getHomePositionX() : 0;
    _yHome = machineConfiguration.hasHomePositionY() ? machineConfiguration.getHomePositionY() : 0;
    _zHome = retractPlane;
  }

  // format home positions
  var words = []; // store all retracted axes in an array
  for (var i = 0; i < arguments.length; ++i) {
    // define the axes to move
    switch (arguments[i]) {
    case X:
      words.push("X" + xyzFormat.format(_xHome));
      break;
    case Y:
      words.push("Y" + xyzFormat.format(_yHome));
      break;
    case Z:
      skipBlock = _skipBlock;
      cancelWorkPlane();
      skipBlock = _skipBlock;
      disableLengthCompensation(false);
      skipBlock = _skipBlock;
      words.push("Z" + xyzFormat.format(_zHome));
      retracted = !skipBlock;
      currentRetractPlane = _zHome;
      break;
    }
  }

  // output move to home
  if (words.length > 0) {
    if (_useG28) {
      gAbsIncModal.reset();
      writeBlock(gFormat.format(28), gAbsIncModal.format(91), words);
      writeBlock(gAbsIncModal.format(90));
    } else {
      gMotionModal.reset();
      writeBlock(gAbsIncModal.format(90), gFormat.format(53), gMotionModal.format(0), words);
    }

    cancelWorkPlane();

    if (_xyzMoved[2]) { // reset head when retracted
      var a = aOutput.format(0);
      var b = bOutput.format(0);
      var c = cOutput.format(0);
      if (a || b || c) {
        skipBlock = _skipBlock;
        if (getProperty("forceHomeOnIndexing")) {
          writeRetract(X, Y);
          skipBlock = _skipBlock;
        }
        // var clamped = axisIsClamped;
        // onCommand(COMMAND_UNLOCK_MULTI_AXIS); // handled automatically by the control
        skipBlock = _skipBlock;
        writeBlock(gMotionModal.format(0), a, b, c, formatComment("ALIGN HEAD"));
        /*if (clamped) { // handled automatically by the control
          skipBlock = _skipBlock;
          onCommand(COMMAND_LOCK_MULTI_AXIS);
        }*/
        currentMachineABC = new Vector(0, 0, 0);
        previousABCPosition = new Vector(0, 0, 0);
      }
    }

    // force any axes that move to home on next block
    if (_xyzMoved[0]) {
      xOutput.reset();
    }
    if (_xyzMoved[1]) {
      yOutput.reset();
    }
    if (_xyzMoved[2]) {
      zOutput.reset();
    }
  }
}

var isDPRNTopen = false;
function inspectionCreateResultsFileHeader() {
  if (isDPRNTopen) {
    if (!getProperty("singleResultsFile")) {
      writeln("DPRNT[END]");
      writeBlock("PCLOS");
      isDPRNTopen = false;
    }
  }

  if (isProbeOperation() && !printProbeResults()) {
    return; // if print results is not desired by probe/ probeWCS
  }

  if (!isDPRNTopen) {
    writeBlock("PCLOS");
    writeBlock("POPEN");
    // check for existence of none alphanumeric characters but not spaces
    var resFile;
    if (getProperty("singleResultsFile")) {
      resFile = getParameter("job-description") + "-RESULTS";
    } else {
      resFile = getParameter("operation-comment") + "-RESULTS";
    }
    resFile = resFile.replace(/:/g, "-");
    resFile = resFile.replace(/[^a-zA-Z0-9 -]/g, "");
    resFile = resFile.replace(/\s/g, "-");
    writeln("DPRNT[START]");
    writeln("DPRNT[RESULTSFILE*" + resFile + "]");
    if (hasGlobalParameter("document-id")) {
      writeln("DPRNT[DOCUMENTID*" + getGlobalParameter("document-id") + "]");
    }
    if (hasGlobalParameter("model-version")) {
      writeln("DPRNT[MODELVERSION*" + getGlobalParameter("model-version") + "]");
    }
  }
  if (isProbeOperation() && printProbeResults()) {
    isDPRNTopen = true;
  }
}

function getPointNumber() {
  if (typeof inspectionWriteVariables == "function") {
    return (inspectionVariables.pointNumber);
  } else {
    return ("#172[60]");
  }
}

function inspectionWriteCADTransform() {
  var cadOrigin = currentSection.getModelOrigin();
  var cadWorkPlane = currentSection.getModelPlane().getTransposed();
  var cadEuler = cadWorkPlane.getEuler2(EULER_XYZ_S);
  writeln(
    "DPRNT[G331" +
    "*N" + getPointNumber() +
    "*A" + abcFormat.format(cadEuler.x) +
    "*B" + abcFormat.format(cadEuler.y) +
    "*C" + abcFormat.format(cadEuler.z) +
    "*X" + xyzFormat.format(-cadOrigin.x) +
    "*Y" + xyzFormat.format(-cadOrigin.y) +
    "*Z" + xyzFormat.format(-cadOrigin.z) +
    "]"
  );
}

function inspectionWriteWorkplaneTransform() {
  var orientation = (machineConfiguration.isMultiAxisConfiguration() && currentMachineABC != undefined) ? machineConfiguration.getOrientation(currentMachineABC) : currentSection.workPlane;
  var abc = orientation.getEuler2(EULER_XYZ_S);
  writeln("DPRNT[G330" +
    "*N" + getPointNumber() +
    "*A" + abcFormat.format(abc.x) +
    "*B" + abcFormat.format(abc.y) +
    "*C" + abcFormat.format(abc.z) +
    "*X0*Y0*Z0*I0*R0]"
  );
}

function writeProbingToolpathInformation(cycleDepth) {
  writeln("DPRNT[TOOLPATHID*" + getParameter("autodeskcam:operation-id") + "]");
  if (isInspectionOperation()) {
    writeln("DPRNT[TOOLPATH*" + getParameter("operation-comment") + "]");
  } else {
    writeln("DPRNT[CYCLEDEPTH*" + xyzFormat.format(cycleDepth) + "]");
  }
}

function onClose() {
  if (isDPRNTopen) {
    writeln("DPRNT[END]");
    writeBlock("PCLOS");
    isDPRNTopen = false;
    if (typeof inspectionProcessSectionEnd == "function") {
      inspectionProcessSectionEnd();
    }
  }
  cancelG68Rotation();
  writeln("");

  optionalSection = false;

  onCommand(COMMAND_STOP_SPINDLE);
  onCommand(COMMAND_COOLANT_OFF);

  cancelWorkPlane();

  // retract
  forceABC();
  writeRetract(Z);
  onCommand(COMMAND_LOCK_MULTI_AXIS);

  if (!getProperty("forceHomeOnIndexing")) {
    writeRetract(Y);
  }
  if (getProperty("homePositionCenter", false) && hasParameter("part-upper-x") && hasParameter("part-lower-x")) {
    var xHome = (getParameter("part-upper-x") + getParameter("part-lower-x")) / 2;
    writeBlock(gFormat.format(0), xOutput.format(xHome));
  }

  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  writeBlock(mFormat.format(30)); // stop program, spindle stop, coolant off
  if (subprograms.length > 0) {
    writeln("");
    write(subprograms);
  }
  writeln("");
  writeln("%");
}

/*
keywords += (keywords ? " MODEL_IMAGE" : "MODEL_IMAGE");

function onTerminate() {
  var outputPath = getOutputPath();
  var programFilename = FileSystem.getFilename(outputPath);
  var programSize = FileSystem.getFileSize(outputPath);
  var postPath = findFile("setup-sheet-excel-2007.cps");
  var intermediatePath = getIntermediatePath();
  var a = "--property unit " + ((unit == IN) ? "0" : "1"); // use 0 for inch and 1 for mm
  if (programName) {
    a += " --property programName \"'" + programName + "'\"";
  }
  if (programComment) {
    a += " --property programComment \"'" + programComment + "'\"";
  }
  a += " --property programFilename \"'" + programFilename + "'\"";
  a += " --property programSize \"" + programSize + "\"";
  a += " --noeditor --log temp.log \"" + postPath + "\" \"" + intermediatePath + "\" \"" + FileSystem.replaceExtension(outputPath, "xlsx") + "\"";
  execute(getPostProcessorPath(), a, false, "");
  executeNoWait("excel", "\"" + FileSystem.replaceExtension(outputPath, "xlsx") + "\"", false, "");
}
*/

function setProperty(property, value) {
  properties[property].current = value;
}
// <<<<< INCLUDED FROM haas/head-head/common/haas head-head.cps
properties.homePositionCenter = {
  title      : "Home position center",
  description: "Enable to center the part along X at the end of program for easy access.",
  group      : "homePositions",
  type       : "boolean",
  value      : false,
  scope      : "post"
};
