/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  HURCO post processor configuration.

  $Revision: 44111 94721f91f2af908b84d6a6b6174ef99ce1f2d57f $
  $Date: 2024-02-07 23:10:28 $

  FORKID {1B14E478-26FE-4db2-A3E7-FB814E8C0B4E}
*/

// >>>>> INCLUDED FROM generic_posts/hurco.cps
description = "HURCO";
vendor = "HURCO";
vendorUrl = "http://www.hurco.com";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Generic post for HURCO. Note that this post supports both ISNC (ISO NC mode) and BNC (Basic NC mode). By default ISNC mode is used but you can switch to BNC mode by disabling the 'isnc' property. Also note that you can turn on 3D arcs by enabling the 'allow3DArcs' property so you will get arcs in any plane instead of only in the primary planes G17/G18/G19. Note that the HURCO CNC cannot guarantee that no gouging will happen at rewinds when using vector output for multi-axis simultaneous machining as vector does not provide enough information. You need to define the machine in the post to be safe. By default positioning moves will be output as high feed G1s instead of G0s. You can turn on the property 'useG0' to force G0s but be careful as the CNC will follow a dogleg path rather than a direct path.";

extension = "hnc";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
highFeedrate = (unit == IN) ? 100 : 5000;

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
  isnc: {
    title      : "Use ISNC or BNC mode",
    description: "Selects between ISNC (ISO NC mode) and BNC (Basic NC mode).",
    group      : "formats",
    type       : "boolean",
    values     : [
      "Basic NC mode",
      "ISO NC mode"
    ],
    value: true,
    scope: "post"
  },
  separateWordsWithSpace: {
    title      : "Separate words with space",
    description: "Adds spaces between words if 'yes' is selected.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  allow3DArcs: {
    title      : "Allow 3D arcs",
    description: "Specifies whether 3D circular arcs are allowed.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
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
  useG0: {
    title      : "Use G0",
    description: "Specifies that G0s should be used for rapid moves.",
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
  useMultiAxisFeatures: {
    title      : "Use G68.2",
    description: "Enable to use G68.2 for 3+2 operations.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  preferredTilt: {
    title      : "Prefer positive tilt",
    description: "Specifies whether to prefer positive or negative tilt angles.",
    group      : "multiAxis",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolChangePositionX: {
    title      : "Safe tool change position X",
    description: "Specify whether to use a safe tool change position in the X axis.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolChangePositionY: {
    title      : "Safe tool change position Y",
    description: "Specify whether to use a safe tool change position in the X axis.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  machineAxisABC: {
    title      : "Machine axes",
    description: "Specify your machine axes here, for use with vector output only.",
    group      : "configuration",
    type       : "string",
    value      : "ABC",
    scope      : "post"
  },
  safePositionMethod: {
    title      : "Safe Retracts",
    description: "Select your desired retract option. 'Clearance Height' retracts to the operation clearance height.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      // {title:"G28", id: "G28"},
      {title:"G53", id:"G53"},
      {title:"Clearance Height", id:"clearanceHeight"}
    ],
    value: "G53",
    scope: "post"
  },
  useM140: {
    title      : "Use M140",
    description: "Specifies to use M140 for Z-axis retracts instead of G53.",
    group      : "homePositions",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG43: {
    title      : "Use G43",
    description: "Enable to use G43 for tool length compensation",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  singleResultsFile: {
    title      : "Create single results file",
    description: "Set to false if you want to store the measurement results for each probe / inspection toolpath in a separate file",
    group      : "probing",
    type       : "boolean",
    value      : true,
    scope      : "post"
  }
};

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G", range:[54, 59]}
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
  {id:COOLANT_THROUGH_TOOL, on:88},
  {id:COOLANT_AIR},
  {id:COOLANT_AIR_THROUGH_TOOL},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL},
  {id:COOLANT_OFF, off:9}
];

var gFormat = createFormat({prefix:"G", decimals:1});
var mFormat = createFormat({prefix:"M", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var dFormat = createFormat({prefix:"D", decimals:0});
var probeWCSFormat = createFormat({decimals:0, forceDecimal:true});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var ijkFormat = createFormat({decimals:6, forceDecimal:true});
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var feedFormat = createFormat({decimals:(unit == MM ? 1 : 2), forceDecimal:true});
var inverseTimeFormat = createFormat({decimals:3, forceDecimal:true});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-9999.999
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var zOutput = createOutputVariable({onchange:function () {retracted = false;}, prefix:"Z"}, xyzFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, abcFormat);
var cOutput = createOutputVariable({prefix:"C"}, abcFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var inverseTimeOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, inverseTimeFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);
var dOutput = createOutputVariable({}, dFormat);

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, xyzFormat);
var irOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat);
var jrOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat);
var krOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, xyzFormat);

var gMotionModal = createOutputVariable({}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createOutputVariable({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createOutputVariable({}, gFormat); // modal group 3 // G90-91
var gFeedModeModal = createOutputVariable({}, gFormat); // modal group 5 // G93-95
var gUnitModal = createOutputVariable({}, gFormat); // modal group 6 // G20-21 or G70-71
var gCycleModal = createOutputVariable({}, gFormat); // modal group 9 // G81, ...
var gRetractModal = createOutputVariable({}, gFormat); // modal group 10 // G98-99
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
    [32, 33], // A axis clamp / unclamp
    [34, 35], // B axis clamp / unclamp
    [12, 13]  // C axis clamp / unclamp
  ],
  mFormat
);

// fixed settings
var firstFeedParameter = 1;
var useMultiAxisFeatures; // defined using property
var forceMultiAxisIndexing = false; // force multi-axis indexing for 3D programs

var allowIndexingWCSProbing = false; // specifies that probe WCS with tool orientation is supported
var probeVariables = {
  outputRotationCodes: false, // defines if it is required to output rotation codes
  probeAngleMethod   : "OFF", // OFF, AXIS_ROT, G68, G54.4
  compensationXY     : undefined
};

// collected state
var sequenceNumber;
var currentWorkOffset;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var currentFeedId;
var retracted = false; // specifies that the tool has been retracted to the safe plane
var useVectorOutput = false; // states that useMultiAxisFeatures is enabled and no machine configuration is active
probeMultipleFeatures = true;

/** Returns true if the given ABC axis is available for use with vector output. */
function hasABCAxis(name) {
  return String(getProperty("machineAxisABC")).toUpperCase().indexOf(name) != -1;
}

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  if (getProperty("showSequenceNumbers") == "true") {
    if (text) {
      if (sequenceNumber > 9999999) {
        sequenceNumber = getProperty("sequenceNumberStart");
      }
      writeWords2("N" + sequenceNumber, text);
      sequenceNumber += getProperty("sequenceNumberIncrement");
    }
  } else {
    writeWords(arguments);
  }
}

function formatComment(text) {
  return "(" + String(text).replace(/[()]/g, "") + ")";
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
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

// Start of machine configuration logic
var compensateToolLength = false; // add the tool length to the pivot distance for nonTCP rotary heads

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

  // setup usage of multiAxisFeatures
  useMultiAxisFeatures = getProperty("useMultiAxisFeatures") != undefined ? getProperty("useMultiAxisFeatures") :
    (typeof useMultiAxisFeatures != "undefined" ? useMultiAxisFeatures : false);
  useABCPrepositioning = getProperty("useABCPrepositioning") != undefined ? getProperty("useABCPrepositioning") :
    (typeof useABCPrepositioning != "undefined" ? useABCPrepositioning : false);

  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // don't need to modify any settings for 3-axis machines
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

  if (machineConfiguration.isHeadConfiguration()) {
    compensateToolLength = typeof compensateToolLength == "undefined" ? false : compensateToolLength;
  }

  if (machineConfiguration.isHeadConfiguration() && compensateToolLength) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var section = getSection(i);
      if (section.isMultiAxis()) {
        machineConfiguration.setToolLength(getBodyLength(section.getTool())); // define the tool length for head adjustments
        section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
      }
    }
  } else {
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
  if (false) { // note: setup your machine here
    var aAxis = createAxis({coordinate:0, table:true, axis:[1, 0, 0], range:[-120, 120], preference:1, tcp:useTCP});
    var cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], range:[-360, 360], preference:0, tcp:useTCP});
    machineConfiguration = new MachineConfiguration(aAxis, cAxis);

    setMachineConfiguration(machineConfiguration);
    if (receivedMachineConfiguration) {
      warning(localize("The provided CAM machine configuration is overwritten by the postprocessor."));
      receivedMachineConfiguration = false; // CAM provided machine configuration is overwritten
    }
  }

  if (!receivedMachineConfiguration) {
    // multiaxis settings
    if (machineConfiguration.isHeadConfiguration()) {
      machineConfiguration.setVirtualTooltip(false); // translate the pivot point to the virtual tool tip for nonTCP rotary heads
    }

    // retract / reconfigure
    var performRewinds = false; // set to true to enable the rewind/reconfigure logic
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
    // machineConfiguration.setHomePositionX(toPreciseUnit(0, IN));
    // machineConfiguration.setHomePositionY(toPreciseUnit(0, IN));
    // machineConfiguration.setRetractPlane(toPreciseUnit(0, IN));
  }
}
// End of machine configuration logic

function onOpen() {
  // define and enable machine configuration
  receivedMachineConfiguration = machineConfiguration.isReceived();

  if (typeof defineMachine == "function") {
    defineMachine(); // hardcoded machine configuration
  }
  activateMachine(); // enable the machine optimizations and settings

  if (getProperty("useG0") && (highFeedrate <= 0)) {
    error(localize("You must set 'highFeedrate' because axes are not synchronized for rapid traversal."));
    return;
  }

  if (useMultiAxisFeatures && !machineConfiguration.isMultiAxisConfiguration()) {
    var text = String(getProperty("machineAxisABC")).toUpperCase();
    for (var i = 0; i < text.length; ++i) {
      if ("ABC".indexOf(text.charAt(i)) == -1) {
        error(localize("Property 'machineAxisABC' must be A, B, C or any combination of these axes!"));
        return;
      }
    }
    useVectorOutput = true;
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
    if (!((programId >= 1) && (programId <= 9999))) {
      error(localize("Program number is out of range."));
    }
    var oFormat = createFormat({width:4, zeropad:true, decimals:0});
    writeln(
      "O" + oFormat.format(programId) +
      conditional(programComment, " " + formatComment(programComment))
    );
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  if (getProperty("useG0")) {
    writeComment(localize("Using G0 which travels along dogleg path."));
  } else {
    writeComment(subst(localize("Using high feed G1 F%1 instead of G0."), feedFormat.format(highFeedrate)));
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

  //Probing Surface Inspection
  if (typeof inspectionWriteVariables == "function") {
    inspectionWriteVariables();
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

  if (useVectorOutput && isMultiAxis()) {
    onCommand(COMMAND_STOP);
    onComment("We cannot guarantee that the CNC will not have to do a rewind during cutting when using vector output.");
    onComment("Machine needs to be defined in post to use ABC output and hence avoid risk of gouges during rewind. Please be careful.");
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
  writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17));
  if (!getProperty("isnc")) {
    writeBlock(gAbsIncModal.format(75)); // multi-quadrant arc interpolation mode
  }

  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(getProperty("isnc") ? 20 : 70));
    break;
  case MM:
    writeBlock(gUnitModal.format(getProperty("isnc") ? 21 : 71));
    break;
  }
  onCommand(COMMAND_START_CHIP_TRANSPORT);

  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) {
    writeBlock(mFormat.format(31)); // rotary axes encoder reset
    writeBlock(mFormat.format(126)); // shortest path traverse
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

function printProbeResults() {
  return currentSection.getParameter("printResults", 0) == 1;
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
var currentWorkPlaneUVW = undefined; // right vector from workplane matrix

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
  currentWorkPlaneUVW = undefined;
}

function defineWorkPlane(_section, _setWorkPlane) {
  var abc = new Vector(0, 0, 0);
  if (currentSection && (currentSection.getId() == _section.getId())) {
    operationSupportsTCP = (_section.isMultiAxis() || !useMultiAxisFeatures) && _section.getOptimizedTCPMode() == OPTIMIZE_NONE;
  }
  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) { // use 5-axis indexing for multi-axis mode
    // set working plane after datum shift

    if (_section.isMultiAxis()) {
      cancelTransformation();
      if (_setWorkPlane) {
        forceWorkPlane();
      }
      if (machineConfiguration.isMultiAxisConfiguration()) {
        abc = _section.getInitialToolAxisABC();
        if (_setWorkPlane) {
          if (!retracted) {
            writeRetract(Z);
          }
          onCommand(COMMAND_UNLOCK_MULTI_AXIS);
          gMotionModal.reset();
          if (!operationSupportsTCP) {
            positionABC(abc, true);
          }
        }
      } else {
        if (_setWorkPlane) {
          var d = _section.getGlobalInitialToolAxis();
          // position
          if (!operationSupportsTCP) {
            writeBlock(
              gAbsIncModal.format(90),
              gMotionModal.format(0),
              "I" + xyzFormat.format(d.x), "J" + xyzFormat.format(d.y), "K" + xyzFormat.format(d.z)
            );
          }
        }
      }
    } else {
      if (!(useMultiAxisFeatures && useVectorOutput)) {
        abc = getWorkPlaneMachineABC(_section.workPlane, _setWorkPlane, true);
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
  return abc;
}

function cancelWorkPlane(force) {
  if (force) {
    gRotationModal.reset();
  }
  writeBlock(gRotationModal.format(69)); // cancel frame
  forceWorkPlane();
}

function setWorkPlane(abc) {
  if (!forceMultiAxisIndexing && is3D() && !machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }
  if (forceMultiAxisIndexing) {
    forceWorkPlane();
  }

  var W = currentSection.workPlane;
  if (machineConfiguration.isMultiAxisConfiguration()) {
    if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
      return; // ignore, no change
    }
  } else {
    if (!((currentWorkPlaneABC == undefined || currentWorkPlaneUVW == undefined) ||
        ijkFormat.areDifferent(W.up.x, currentWorkPlaneABC.x) ||
        ijkFormat.areDifferent(W.up.y, currentWorkPlaneABC.y) ||
        ijkFormat.areDifferent(W.up.z, currentWorkPlaneABC.z) ||
        ijkFormat.areDifferent(W.right.x, currentWorkPlaneUVW.x) ||
        ijkFormat.areDifferent(W.right.y, currentWorkPlaneUVW.y) ||
        ijkFormat.areDifferent(W.right.z, currentWorkPlaneUVW.z))) {
      return; // ignore, no change
    }
  }

  onCommand(COMMAND_UNLOCK_MULTI_AXIS);

  if (useMultiAxisFeatures) {
    if (true) { // we don't want to use G69 for reset alone
      writeBlock(gFormat.format(0), mFormat.format(140)); // retract along tool vector
      cancelWorkPlane(true); // cancel frame
      gMotionModal.reset();
      var initialPosition = getFramePosition(currentSection.getInitialPosition()); // TAG
      if (useVectorOutput) {
        writeBlock(
          gFormat.format(68.2),
          "X" + xyzFormat.format(currentSection.workOrigin.x),
          "Y" + xyzFormat.format(currentSection.workOrigin.y),
          "Z" + xyzFormat.format(currentSection.workOrigin.z),
          "I" + ijkFormat.format(W.right.x), "J" + ijkFormat.format(W.right.y), "K" + ijkFormat.format(W.right.z),
          "U" + ijkFormat.format(W.up.x), "V" + ijkFormat.format(W.up.y), "W" + ijkFormat.format(W.up.z)
        ); // set frame
        var d = currentSection.getInitialToolAxis();
        writeBlock(
          gMotionModal.format(0), gFormat.format(8.2),
          xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
          "I" + ijkFormat.format(d.x), "J" + ijkFormat.format(d.y), "K" + ijkFormat.format(d.z)
        );
      } else {
        var workPlaneCode = 68.2;
        if (machineConfiguration.getNumberOfAxes() == 5 &&
            machineConfiguration.getAxisU().getCoordinate() > machineConfiguration.getAxisV().getCoordinate()) {
          workPlaneCode = 68.3;
        }
        setCurrentABC(abc); // required for machine simulation
        writeBlock(
          gFormat.format(workPlaneCode),
          "X" + xyzFormat.format(currentSection.workOrigin.x),
          "Y" + xyzFormat.format(currentSection.workOrigin.y),
          "Z" + xyzFormat.format(currentSection.workOrigin.z),
          conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc.z))
        ); // set frame
        writeBlock(
          gMotionModal.format(0), gFormat.format(8.2),
          xOutput.format(initialPosition.x),
          yOutput.format(initialPosition.y),
          zOutput.format(initialPosition.z),
          conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc.z))
        );
      }
      // writeBlock(mFormat.format(141));
    } else {
      cancelWorkPlane(); // cancel frame
    }
  } else {
    gMotionModal.reset();
    positionABC(abc, true);
  }

  onCommand(COMMAND_LOCK_MULTI_AXIS);

  if (machineConfiguration.isMultiAxisConfiguration()) {
    currentWorkPlaneABC = abc;
  } else {
    currentWorkPlaneABC = W.up;
    currentWorkPlaneUVW = W.right;
  }
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
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), a, b, c);
    currentMachineABC = new Vector(abc);
    if (getCurrentSectionId() != -1) {
      setCurrentABC(abc); // required for machine simulation
    }
  }
}

var closestABC = false; // choose closest machine angles
var currentMachineABC;

function getWorkPlaneMachineABC(workPlane) {
  var W = workPlane; // map to global frame

  var abc = machineConfiguration.getABC(W);
  if (closestABC) {
    if (currentMachineABC) {
      abc = machineConfiguration.remapToABC(abc, currentMachineABC);
    } else {
      abc = machineConfiguration.getPreferredABC(abc);
    }
  } else {
    abc = machineConfiguration.getPreferredABC(abc);
  }

  try {
    abc = machineConfiguration.remapABC(abc);
    currentMachineABC = abc;
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

  var tcp = false;
  cancelTransformation();
  if (tcp) {
    setRotation(W); // TCP mode
  } else {
    var O = machineConfiguration.getOrientation(abc);
    var R = machineConfiguration.getRemainingOrientation(abc, W);
    var rotate = true;
    var axis = machineConfiguration.getAxisV();
    if (axis.isEnabled() && axis.isTable()) {
      var ix = axis.getCoordinate();
      var rotAxis = axis.getAxis();
      if (isSameDirection(machineConfiguration.getDirection(abc), rotAxis) ||
          isSameDirection(machineConfiguration.getDirection(abc), Vector.product(rotAxis, -1))) {
        var direction = isSameDirection(machineConfiguration.getDirection(abc), rotAxis) ? 1 : -1;
        abc.setCoordinate(ix, Math.atan2(R.right.y, R.right.x) * direction);
        rotate = false;
      }
    }
    if (rotate) {
      setRotation(R);
    }
  }

  return abc;
}

function onSection() {
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  retracted = false; // specifies that the tool has been retracted to the safe plane
  var newWorkOffset = isFirstSection() ||
    (getPreviousSection().workOffset != currentSection.workOffset); // work offset changes
  var newWorkPlane = isFirstSection() ||
    !isSameDirection(getPreviousSection().getGlobalFinalToolAxis(), currentSection.getGlobalInitialToolAxis()) ||
    (currentSection.isOptimizedForMachine() && getPreviousSection().isOptimizedForMachine() &&
      Vector.diff(getPreviousSection().getFinalToolAxisABC(), currentSection.getInitialToolAxisABC()).length > 1e-4) ||
    (!machineConfiguration.isMultiAxisConfiguration() && currentSection.isMultiAxis()) ||
    (!getPreviousSection().isMultiAxis() && currentSection.isMultiAxis() ||
      getPreviousSection().isMultiAxis() && !currentSection.isMultiAxis()); // force newWorkPlane between indexing and simultaneous operations
  if (insertToolCall || newWorkOffset || newWorkPlane) {

    // stop spindle before retract during tool change
    if (insertToolCall && !isFirstSection()) {
      onCommand(COMMAND_STOP_SPINDLE);
    }

    // retract to safe plane
    writeRetract(Z);
    forceXYZ();

    // Head axes need to return to 0 for tool change
    if (insertToolCall && !isFirstSection() && machineConfiguration.isHeadConfiguration()) {
      var resetAxes = getCurrentDirection();
      var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
      for (var i = 0; i < axes.length; ++i) {
        if (axes[i].isEnabled() && axes[i].isHead()) {
          resetAxes.setCoordinate(axes[i].getCoordinate(), 0);
        }
      }
      positionABC(resetAxes, false);
    }

    // move to tool change position
    if (insertToolCall) {
      if (getProperty("toolChangePositionX") || getProperty("toolChangePositionY")) {
        writeBlock(gFormat.format(53), conditional(getProperty("toolChangePositionX"), "X" + xyzFormat.format(0)), conditional(getProperty("toolChangePositionY"), "Y" + xyzFormat.format(0)));
      }
    }
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
    forceModals();
    forceWorkPlane();

    if (!isFirstSection()) {
      setCoolant(COOLANT_OFF);
      if (getProperty("optionalStop")) {
        onCommand(COMMAND_OPTIONAL_STOP);
      }
    }

    if (tool.number > 99) {
      warning(localize("Tool number exceeds maximum value."));
    }

    writeToolBlock("T" + toolFormat.format(tool.number), mFormat.format(6));
    if (tool.comment) {
      writeComment(tool.comment);
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
        writeComment(localize("ZMIN") + "=" + zRange.getMinimum());
      }
    }

    if (getProperty("preloadTool")) {
      var nextTool = getNextTool(tool.number);
      if (nextTool) {
        writeBlock("T" + toolFormat.format(nextTool.number));
      } else {
        // preload first tool
        var section = getSection(0);
        var firstToolNumber = section.getTool().number;
        if (tool.number != firstToolNumber) {
          writeBlock("T" + toolFormat.format(firstToolNumber));
        }
      }
    }
    if (tool.type == TOOL_PROBE) {
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(19)); // spindle orientation
        writeBlock(mFormat.format(26)); // select the part probe, M27 is selecting the tool probe
        writeBlock(mFormat.format(41)); // Single touch probing, M42 is 2 touch probing
      } else {
        error(localize("Probing or surface inspection is only allowed in ISNC mode!"));
      }
    }
  }

  var spindleChanged = tool.type != TOOL_PROBE &&
    (insertToolCall || forceSpindleSpeed || isFirstSection() ||
    (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) ||
    (tool.clockwise != getPreviousSection().getTool().clockwise));
  if (spindleChanged) {
    forceSpindleSpeed = false;

    if (spindleSpeed < 1) {
      error(localize("Spindle speed out of range."));
      return;
    }
    if (spindleSpeed > 65535) {
      warning(localize("Spindle speed exceeds maximum value."));
    }
    writeBlock(
      sOutput.format(spindleSpeed), mFormat.format(tool.clockwise ? 3 : 4)
    );
  }

  // Output modal commands here
  writeBlock(gPlaneModal.format(17), gAbsIncModal.format(90), gFeedModeModal.format(94));

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }

  if (currentSection.workOffset != currentWorkOffset) {
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  forceXYZ();

  var abc = defineWorkPlane(currentSection, true);
  setProbeAngle(); // output probe angle rotations if required
  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);

  forceAny();
  var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
  var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(highFeedrate) : "";
  if (currentSection.isMultiAxis() && operationSupportsTCP) {
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);

    writeBlock(gFormat.format(69));
    writeBlock(mFormat.format(128)); // only after we are at initial position

    // turn
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    if (currentSection.isOptimizedForMachine()) {
      writeBlock(
        gMotionModal.format(G), gFormat.format(8.2),
        xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
        aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), F
      );
    } else {
      var d = currentSection.getGlobalInitialToolAxis();
      gMotionModal.reset();
      writeBlock(
        gMotionModal.format(G), gFormat.format(8.2),
        xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
        "I" + ijkFormat.format(d.x), "J" + ijkFormat.format(d.y), "K" + ijkFormat.format(d.z), F
      );
    }
    writeBlock(gFormat.format(43.4));
    writeBlock(mFormat.format(200), "P" + (getProperty("preferredTilt") ? 1 : 2)); // prefer positive/negative tilt
  } else {
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    if (!retracted && !insertToolCall) {
      if (getCurrentPosition().z < initialPosition.z) {
        writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      }
    }

    if (insertToolCall || retracted) {
      var lengthOffset = tool.lengthOffset;
      if (lengthOffset > 200) {
        warning(localize("The length offset exceeds the maximum value."));
      }

      gMotionModal.reset();
      writeBlock(gPlaneModal.format(17));

      if (!machineConfiguration.isHeadConfiguration()) {
        writeBlock(
          gAbsIncModal.format(90),
          gMotionModal.format(G), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), F
        );
        if (!useMultiAxisFeatures || currentSection.isZOriented()) {
          writeBlock(
            gMotionModal.format(0),
            conditional(getProperty("useG43"), gFormat.format(43)),
            zOutput.format(initialPosition.z),
            hFormat.format(lengthOffset)
          );
        } else {
          writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
        }
      } else {
        if (!useMultiAxisFeatures || currentSection.isZOriented()) {
          writeBlock(
            gAbsIncModal.format(90),
            gMotionModal.format(G),
            conditional(getProperty("useG43"), gFormat.format(43)),
            xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z),
            F, hFormat.format(lengthOffset)
          );
        } else {
          writeBlock(
            gAbsIncModal.format(90),
            gMotionModal.format(G),
            xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z),
            F
          );
        }
      }
    } else {
      writeBlock(
        gAbsIncModal.format(90),
        gMotionModal.format(G),
        xOutput.format(initialPosition.x),
        yOutput.format(initialPosition.y),
        F
      );
    }
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

  if (isProbeOperation()) {
    validate(probeVariables.probeAngleMethod != "G68", "You cannot probe while G68 Rotation is in effect.");
    validate(probeVariables.probeAngleMethod != "G54.4", "You cannot probe while workpiece setting error compensation G54.4 is enabled.");
    // writeBlock(gFormat.format(65), "P" + 9832); // spin the probe on //Probe doesn't need to be activate or de activated, as the controller is doing it automatically at toolchange.
    inspectionCreateResultsFileHeader();
  }

  // surface Inspection
  if (isInspectionOperation() && (typeof inspectionProcessSectionStart == "function")) {
    inspectionProcessSectionStart();
  }
/*
  if (getProperty("smoothingTolerance") > 0) {
    writeBlock(gFormat.format(5.2), "P1", "Q" + xyzFormat.format(getProperty("smoothingTolerance")));
  }
*/
}

function onDwell(seconds) {
  if (seconds > 9999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  seconds = clamp(0.001, seconds, 9999.999);
  writeBlock(gFormat.format(4), "P" + secFormat.format(seconds));
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(sOutput.format(spindleSpeed));
}

function onCycle() {
  writeBlock(gPlaneModal.format(17));
}

function getCommonCycle(x, y, z, r) {
  forceXYZ();
  if (getProperty("isnc")) {
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(r)];
  } else {
    return [xOutput.format(x), yOutput.format(y),
      "Z" + xyzFormat.format(z),
      "R" + xyzFormat.format(r)];
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
      break;
    }
  }
  probeVariables.outputRotationCodes = true;
}

/** Output rotation offset based on angular probing cycle. */
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
      var n = xyzFormat.format(0);
      writeBlock(
        gRotationModal.format(68), gAbsIncModal.format(90),
        // probeVariables.compensationXY, "Z" + n, "I" + n, "J" + n, "K" + xyzFormat.format(1), "R[#144]"
        probeVariables.compensationXY, "R[#144]"
      );
      validateWorkOffset = true;
      break;
    case "AXIS_ROT":
      var param = 5200 + probeOutputWorkOffset * 20 + 5;
      writeBlock("#" + param + " = " + "[#" + param + " + #144]");
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
    writeBlock(gFormat.format(65), "P" + 9810, _x, _y, getFeed(highFeedrate)); // protected positioning move
  }
  if (_z && z < getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
}

function onCyclePoint(x, y, z) {
  if (cycleType == "inspect") {
    if (typeof inspectionCycleInspect == "function") {
      inspectionCycleInspect(cycle, x, y, z);
      return;
    } else {
      cycleNotSupported();
    }
  }
  if (!isSameDirection(getRotation().forward, new Vector(0, 0, 1))) {
    expandCyclePoint(x, y, z);
    return;
  }
  if (isProbeOperation()) {
    if (!isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      if (!allowIndexingWCSProbing && currentSection.strategy == "probe") {
        error(localize("Updating WCS / work offset using probing is only supported by the CNC in the WCS frame."));
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

  if (isFirstCyclePoint() || isProbeOperation()) {
    if (!isProbeOperation()) {
      // return to initial Z which is clearance plane and set absolute mode
      repositionToCycleClearance(cycle, x, y, z);
    }
    // R is only used in G99 mode for BNC

    var F = cycle.feedrate;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell, 9999.999); // in seconds

    switch (cycleType) {
    case "drilling":
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
          getCommonCycle(x, y, z, cycle.retract),
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          feedOutput.format(F)
        );
      }
      break;
    case "counter-boring":
      if (P > 0) {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(82),
            getCommonCycle(x, y, z, cycle.retract),
            "P" + secFormat.format(P), // not optional
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(82),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            "P" + secFormat.format(P), // not optional
            feedOutput.format(F)
          );
        }
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
            getCommonCycle(x, y, z, cycle.retract),
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            feedOutput.format(F)
          );
        }
      }
      break;
    case "chip-breaking":
      if ((cycle.accumulatedDepth < cycle.depth) || (P > 0)) {
        expandCyclePoint(x, y, z);
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
            getCommonCycle(x, y, z, cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            feedOutput.format(F)
          );
        }
      }
      break;
    case "deep-drilling":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
            getCommonCycle(x, y, z, cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            feedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            "Z" + xyzFormat.format(cycle.incrementalDepth), // first peck
            conditional((cycle.minimumIncrementalDepth != undefined) && (cycle.minimumIncrementalDepth < cycle.incrementalDepth), "Z" + xyzFormat.format(cycle.minimumIncrementalDepth)), // remaining pecks
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            feedOutput.format(F)
          );
        }
      }
      break;
    case "tapping":
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 74 : 84),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC mode
        if (tool.type != TOOL_TAP_LEFT_HAND) { // right hand
          writeBlock(mFormat.format(3)); // cw
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            //"Z" + xyzFormat.format(cycle.incrementalDepth),
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            "P" + secFormat.format(P), // not optional
            feedOutput.format(F)
          );
          if (!tool.clockwise) {
            writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
          }
        } else { // left hand
          // warning: not rigid

          writeBlock(mFormat.format((tool.type == TOOL_TAP_LEFT_HAND) ? 4 : 3));
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            feedOutput.format(F)
          );
          if ((tool.type == TOOL_TAP_LEFT_HAND) != !tool.clockwise) {
            writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
          }
        }
      }
      break;
    case "left-tapping":
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(74),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC mode
        // warning: not rigid
        writeBlock(mFormat.format(4)); // ccw
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          feedOutput.format(F)
        );
        if (tool.clockwise) {
          writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
        }
      }
      break;
    case "right-tapping":
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(mFormat.format(3)); // cw
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
          xOutput.format(x),
          yOutput.format(y),
          "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
          "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
          "P" + secFormat.format(P), // not optional
          feedOutput.format(F)
        );
        if (!tool.clockwise) {
          writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
        }
      }
      break;
    case "tapping-with-chip-breaking":
    case "left-tapping-with-chip-breaking":
    case "right-tapping-with-chip-breaking":
      if (cycle.accumulatedDepth < cycle.depth) {
        error(localize("Accumulated pecking depth is not supported for canned tapping cycles with chip breaking."));
        return;
      }
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        forceXYZ();
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 84.3 : 84.2),
          // getCommonCycle(x, y, z, cycle.retract),
          xOutput.format(x),
          yOutput.format(y),
          "Z" + xyzFormat.format(z),
          "Z" + xyzFormat.format(cycle.incrementalDepth),
          "R" + xyzFormat.format(cycle.retract),
          "P" + secFormat.format(P), // not optional
          conditional(cycle.minimumIncrementalDepth < cycle.depth, "Q" + xyzFormat.format(cycle.minimumIncrementalDepth)), // optional
          feedOutput.format(F)
        );
        zOutput.reset();
      } else { // BNC mode
        if (tool.type != TOOL_TAP_LEFT_HAND) { // right hand
          writeBlock(mFormat.format(3)); // cw
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            "Z" + xyzFormat.format(cycle.incrementalDepth),
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            "P" + secFormat.format(P), // not optional
            feedOutput.format(F)
          );
          if (!tool.clockwise) {
            writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
          }
        } else {
          error(localize("Left-tapping with chip breaking is not supported."));
        }
      }
      break;
    case "fine-boring":
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(76),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          "Q" + xyzFormat.format(cycle.shift),
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(76),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          "P" + secFormat.format(P), // not optional
          "Q" + xyzFormat.format(cycle.shift),
          feedOutput.format(F)
        );
      }
      break;
    case "back-boring":
      if (!getProperty("isnc")) {
        error(localize("Back boring is not supported."));
      }
      var dx = (gPlaneModal.getCurrent() == 19) ? cycle.backBoreDistance : 0;
      var dy = (gPlaneModal.getCurrent() == 18) ? cycle.backBoreDistance : 0;
      var dz = (gPlaneModal.getCurrent() == 17) ? cycle.backBoreDistance : 0;
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(87),
        getCommonCycle(x - dx, y - dy, z - dz, cycle.bottom),
        "Q" + xyzFormat.format(cycle.shift),
        "P" + secFormat.format(P), // not optional
        feedOutput.format(F)
      );
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
          getCommonCycle(x, y, z, cycle.retract),
          feedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          feedOutput.format(F)
        );
      }
      break;
    case "stop-boring":
      if ((P > 0) || !getProperty("isnc")) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(86),
          getCommonCycle(x, y, z, cycle.retract),
          feedOutput.format(F)
        );
      }
      break;
    case "manual-boring":
      if (!getProperty("isnc")) {
        error(localize("Manual boring is not supported."));
      }
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88),
        getCommonCycle(x, y, z, cycle.retract),
        "P" + secFormat.format(P), // not optional
        feedOutput.format(F)
      );
      break;
    case "boring":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(89),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          feedOutput.format(F)
        );
      } else { // BNC
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(89),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          "P" + secFormat.format(P), // not optional
          feedOutput.format(F)
        );
      }
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
        error(localize("Action -Update Tool Wear- is not supported with this cycle."));
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
        error(localize("Action -Update Tool Wear- is not supported with this cycle."));
        return;
      }
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      var _x = xOutput.format(x);
      var _y = yOutput.format(y);
      if (!_x && !_y) {
        xOutput.reset(); // at least one axis is required
        _x = xOutput.format(x);
      }
      writeBlock(_x, _y);
    }
  }
}

function getProbingArguments(cycle, updateWCS) {
  var outputWCSCode = updateWCS && currentSection.strategy == "probe";
  var probeOutputWorkOffset = currentSection.probeWorkOffset;
  if (outputWCSCode) {
    validate(probeOutputWorkOffset <= 99, "Work offset is out of range.");
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
    conditional(outputWCSCode, "S" + probeWCSFormat.format(probeOutputWorkOffset > 6 ? (probeOutputWorkOffset - 6 + 100) : probeOutputWorkOffset))
  ];
}

function onCycleEnd() {
  if (isProbeOperation()) {
    zOutput.reset();
    gMotionModal.reset();
    writeBlock(gFormat.format(65), "P" + 9810, zOutput.format(cycle.retract)); // protected retract move
  } else {
    if (!cycleExpanded) {
      writeBlock(gCycleModal.format(80));
      zOutput.reset();
    }
  }
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
      error(localize("Radius compensation mode cannot be changed at rapid traversal."));
      return;
    }
    if (!getProperty("useG0") && (((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) > 1)) {
      // axes are not synchronized
      writeBlock(gMotionModal.format(1), x, y, z, feedOutput.format(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z);
      forceFeed();
    }
  }
}

function onLinear(_x, _y, _z, feed) {
  if (pendingRadiusCompensation >= 0) {
    // ensure that we end at desired position when compensation is turned off
    xOutput.reset();
    yOutput.reset();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(feed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      var d = tool.diameterOffset;
      if (d > 200) {
        warning(localize("The diameter offset exceeds the maximum value."));
      }
      writeBlock(gPlaneModal.format(17));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(41), x, y, z, dOutput.format(d), f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(42), x, y, z, dOutput.format(d), f);
        break;
      default:
        writeBlock(gMotionModal.format(1), gFormat.format(40), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(1), x, y, z, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode cannot be changed at rapid traversal."));
    return;
  }

  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }

  var num =
    (xyzFormat.areDifferent(_x, xOutput.getCurrent()) ? 1 : 0) +
    (xyzFormat.areDifferent(_y, yOutput.getCurrent()) ? 1 : 0) +
    (xyzFormat.areDifferent(_z, zOutput.getCurrent()) ? 1 : 0) +
    ((aOutput.isEnabled() && abcFormat.areDifferent(_a, aOutput.getCurrent())) ? 1 : 0) +
    ((bOutput.isEnabled() && abcFormat.areDifferent(_b, bOutput.getCurrent())) ? 1 : 0) +
    ((cOutput.isEnabled() && abcFormat.areDifferent(_c, cOutput.getCurrent())) ? 1 : 0);

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : "I" + ijkFormat.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : "J" + ijkFormat.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : "K" + ijkFormat.format(_c);

  if (x || y || z || a || b || c) {
    if (!getProperty("useG0") && (operationSupportsTCP || (num > 1))) {
      // axes are not synchronized
      writeBlock(gFeedModeModal.format(94), gMotionModal.format(1), x, y, z, a, b, c, getFeed(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
      forceFeed();
    }
  }
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed, feedMode) {
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
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : "I" + ijkFormat.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : "J" + ijkFormat.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : "K" + ijkFormat.format(_c);
  if (feedMode == FEED_INVERSE_TIME) {
    forceFeed();
  }
  var f = feedMode == FEED_INVERSE_TIME ? inverseTimeOutput.format(feed) : getFeed(feed);
  var fMode = feedMode == FEED_INVERSE_TIME ? 93 : 94;

  if (x || y || z || a || b || c) {
    writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), x, y, z, a, b, c, f);
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), f);
    }
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();

  if (isFullCircle()) {
    if (isHelical()) {
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), irOutput.format(cx - start.x), jrOutput.format(cy - start.y), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx), jOutput.format(cy), getFeed(feed));
      }
      break;
    case PLANE_ZX:
      if (getProperty("isnc")) {
        // right-handed
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), irOutput.format(cx - start.x), krOutput.format(cz - start.z), getFeed(feed));
      } else {
        // note: left hand coordinate system
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), iOutput.format(cx), kOutput.format(cz), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jrOutput.format(cy - start.y), krOutput.format(cz - start.z), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jOutput.format(cy), kOutput.format(cz), getFeed(feed));
      }
      break;
    default:
      linearize(tolerance);
    }
  } else {
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), irOutput.format(cx - start.x), jrOutput.format(cy - start.y), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), jOutput.format(cy), getFeed(feed));
      }
      break;
    case PLANE_ZX:
      if (isHelical()) {
        linearize(tolerance);
        return;
      }

      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), irOutput.format(cx - start.x), krOutput.format(cz - start.z), getFeed(feed));
      } else {
        // note: left hand coordinate system
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), kOutput.format(cz), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (isHelical()) {
        linearize(tolerance);
        return;
      }

      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jrOutput.format(cy - start.y), krOutput.format(cz - start.z), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy), kOutput.format(cz), getFeed(feed));
      }
      break;
    default:
      if (getProperty("allow3DArcs")) {
        // make sure maximumCircularSweep is well below 360deg
        // we could use G2.4 or G3.4 - direction is calculated
        var ip = getPositionU(0.5);
        writeBlock(gAbsIncModal.format(90), gMotionModal.format(clockwise ? 2.4 : 3.4), xOutput.format(ip.x), yOutput.format(ip.y), zOutput.format(ip.z));
        writeBlock(xOutput.format(x), yOutput.format(y), zOutput.format(z), getFeed(feed));
      } else {
        linearize(tolerance);
      }
    }
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
  var multipleCoolantBlocks = new Array(); // create a formatted array to be passed into the outputted line
  if (!coolants) {
    error(localize("Coolants have not been defined."));
  }
  if (tool.type == TOOL_PROBE) { // avoid coolant output for probing
    coolant = COOLANT_OFF;
  }
  if (coolant == currentCoolantMode && (!forceCoolant || coolant == COOLANT_OFF)) {
    return undefined; // coolant is already active
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
  for (var c in coolants) { // find required coolant codes into the coolants array
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
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    if ((useVectorOutput && hasABCAxis("A")) || aOutput.isEnabled()) {
      writeBlock(mClampModal.format(32));
    }
    if ((useVectorOutput && hasABCAxis("B")) || bOutput.isEnabled()) {
      writeBlock(mClampModal.format(34));
    }
    if ((useVectorOutput && hasABCAxis("C")) || cOutput.isEnabled()) {
      writeBlock(mClampModal.format(12));
    }
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    if ((useVectorOutput && hasABCAxis("A")) || aOutput.isEnabled()) {
      writeBlock(mClampModal.format(33));
    }
    if ((useVectorOutput && hasABCAxis("B")) || bOutput.isEnabled()) {
      writeBlock(mClampModal.format(35));
    }
    if ((useVectorOutput && hasABCAxis("C")) || cOutput.isEnabled()) {
      writeBlock(mClampModal.format(13));
    }
    return;
  case COMMAND_START_CHIP_TRANSPORT:
    writeBlock(mFormat.format(59));
    return;
  case COMMAND_STOP_CHIP_TRANSPORT:
    writeBlock(mFormat.format(61));
    return;
  case COMMAND_BREAK_CONTROL:
    return;
  case COMMAND_TOOL_MEASURE:
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

function onSectionEnd() {
  if (currentSection.isMultiAxis()) {
    writeBlock(gFeedModeModal.format(94)); // inverse time feed off
    if (operationSupportsTCP) {
      writeBlock(mFormat.format(129));
    }
    if (!isLastSection()) {
      writeBlock(mFormat.format(31)); // rotary axes encoder reset
    }
    // the code below gets the machine angles from previous operation.  closestABC must also be set to true
    if (currentSection.isOptimizedForMachine()) {
      currentMachineABC = currentSection.getFinalToolAxisABC();
    }
  }
  writeBlock(gPlaneModal.format(17));
  if (!isLastSection() && (getNextSection().getTool().coolant != tool.coolant)) {
    setCoolant(COOLANT_OFF);
  }
  if (((getCurrentSectionId() + 1) >= getNumberOfSections()) ||
      (tool.number != getNextSection().getTool().number)) {
    onCommand(COMMAND_BREAK_CONTROL);
  }

  if (isProbeOperation()) {
    // writeBlock(gFormat.format(65), "P" + 9833); // spin the probe off //Probe doesn't need to be activate or de activated, as the controller is doing it automatically at toolchange.
    if (probeVariables.probeAngleMethod != "G68") {
      setProbeAngle(); // output probe angle rotations if required
    }
  }
  forceAny();
}

/** Output block to do safe retract and/or move to home position. */
function writeRetract() {
  var words = []; // store all retracted axes in an array
  var retractAxes = new Array(false, false, false);
  var method = getProperty("safePositionMethod");
  if (method == "clearanceHeight") {
    if (!is3D()) {
      error(localize("Safe retract option 'Clearance Height' is only supported when all operations are along the setup Z-axis."));
    }
    return;
  }
  validate(arguments.length != 0, "No axis specified for writeRetract().");

  for (i in arguments) {
    retractAxes[arguments[i]] = true;
  }
  if ((retractAxes[0] || retractAxes[1]) && !retracted) { // retract Z first before moving to X/Y home
    error(localize("Retracting in X/Y is not possible without being retracted in Z."));
    return;
  }
  // special conditions
  /*
  if (retractAxes[2]) { // Z doesn't use G53
    method = "G28";
  }
  */
  if (gRotationModal.getCurrent() == 68) { // cancel G68 before retracting
    cancelWorkPlane(true);
  }
  // define home positions
  var _xHome;
  var _yHome;
  var _zHome;
  if (method == "G28") {
    _xHome = toPreciseUnit(0, MM);
    _yHome = toPreciseUnit(0, MM);
    _zHome = toPreciseUnit(0, MM);
  } else {
    _xHome = machineConfiguration.hasHomePositionX() ? machineConfiguration.getHomePositionX() : toPreciseUnit(0, MM);
    _yHome = machineConfiguration.hasHomePositionY() ? machineConfiguration.getHomePositionY() : toPreciseUnit(0, MM);
    _zHome = machineConfiguration.getRetractPlane() != 0 ? machineConfiguration.getRetractPlane() : toPreciseUnit(0, MM);
  }
  for (var i = 0; i < arguments.length; ++i) {
    switch (arguments[i]) {
    case X:
      words.push("X" + xyzFormat.format(_xHome));
      xOutput.reset();
      break;
    case Y:
      words.push("Y" + xyzFormat.format(_yHome));
      yOutput.reset();
      break;
    case Z:
      words.push("Z" + xyzFormat.format(_zHome));
      zOutput.reset();
      retracted = true;
      break;
    default:
      error(localize("Unsupported axis specified for writeRetract()."));
      return;
    }
  }
  if (words.length > 0) {
    switch (method) {
    case "G28":
      gMotionModal.reset();
      gAbsIncModal.reset();
      writeBlock(gFormat.format(28), gAbsIncModal.format(91), words);
      writeBlock(gAbsIncModal.format(90));
      break;
    case "G53":
      gMotionModal.reset();
      if (retractAxes[2] && getProperty("useM140")) {
        writeBlock(gFormat.format(0), mFormat.format(140));
      } else {
        writeBlock(gAbsIncModal.format(90), gFormat.format(53), gMotionModal.format(0), words);
      }
      break;
    default:
      error(localize("Unsupported safe position method."));
      return;
    }
  }
}

// Start of onRewindMachine logic
/** Allow user to override the onRewind logic. */
function onRewindMachineEntry(_a, _b, _c) {
  return false;
}

/** Retract to safe position before indexing rotaries. */
function onMoveToSafeRetractPosition() {
  writeRetract(Z);
  // cancel TCP so that tool doesn't follow rotaries
  if (currentSection.isMultiAxis() && operationSupportsTCP) {
    writeBlock(mFormat.format(129));
  }
}

/** Rotate axes to new position above reentry position */
function onRotateAxes(_x, _y, _z, _a, _b, _c) {
  // position rotary axes
  xOutput.disable();
  yOutput.disable();
  zOutput.disable();
  invokeOnRapid5D(_x, _y, _z, _a, _b, _c);
  setCurrentABC(new Vector(_a, _b, _c));
  xOutput.enable();
  yOutput.enable();
  zOutput.enable();
}

/** Return from safe position after indexing rotaries. */
function onReturnFromSafeRetractPosition(_x, _y, _z) {
  // reinstate TCP / tool length compensation
  if (operationSupportsTCP) {
    writeBlock(mFormat.format(128));
    var abc = getCurrentDirection();
    gMotionModal.reset();
    forceAny();
    var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
    var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(highFeedrate) : "";
    writeBlock(
      gMotionModal.format(G), gFormat.format(8.2),
      xOutput.format(_x), yOutput.format(_y), zOutput.format(_z),
      aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), F
    );
    writeBlock(gFormat.format(43.4));
    writeBlock(mFormat.format(200), "P" + (getProperty("preferredTilt") ? 1 : 2)); // prefer positive/negative tilt
  } else {
    // position in XY
    forceXYZ();
    xOutput.reset();
    yOutput.reset();
    zOutput.disable();
    invokeOnRapid(_x, _y, _z);

    // position in Z
    zOutput.enable();
    invokeOnRapid(_x, _y, _z);
  }
}
// End of onRewindMachine logic

function onClose() {
  if (isDPRNTopen) {
    writeln("DPRNT[END]");
    writeBlock("PCLOS");
    isDPRNTopen = false;
    if (typeof inspectionProcessSectionEnd == "function") {
      inspectionProcessSectionEnd();
    }
  }
  if (probeVariables.probeAngleMethod == "G68") {
    cancelWorkPlane();
  }
  setCoolant(COOLANT_OFF);

  /*
  if (useMultiAxisFeatures && !is3D()) {
    writeBlock(gFormat.format(0), mFormat.format(140)); // retract
    writeBlock(
      gFormat.format(68.2),
      xOutput.format(0), yOutput.format(0), zOutput.format(0),
      "I" + ijkFormat.format(1), "J" + ijkFormat.format(0), "K" + ijkFormat.format(0),
      "U" + ijkFormat.format(0), "V" + ijkFormat.format(1), "W" + ijkFormat.format(0)
    );
    forceXYZ();
    gMotionModal.reset();
    writeBlock(
      gMotionModal.format(0), gFormat.format(8.2),
      xOutput.format(0), yOutput.format(0), zOutput.format(0),
      "I" + ijkFormat.format(0), "J" + ijkFormat.format(0), "K" + ijkFormat.format(1)
    );
  } else {
    writeBlock(gAbsIncModal.format(90), gFormat.format(53), "Z" + xyzFormat.format(0)); // retract
  }
*/

  writeRetract(Z);
  zOutput.reset();

  writeRetract(X, Y);

  if (machineConfiguration.isMultiAxisConfiguration() || (useMultiAxisFeatures && !is3D())) {
    if (useMultiAxisFeatures) {
      cancelWorkPlane(true);
    }
    writeBlock(mFormat.format(31)); // rotary axes encoder reset
    if (useVectorOutput) {
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      // reset rotaries to 0 when using vector output
    } else {
      positionABC(new Vector(0, 0, 0), true);
    }
  }

  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) {
    writeBlock(mFormat.format(127)); // cancel shortest path traverse
  }

  onCommand(COMMAND_STOP_CHIP_TRANSPORT);
  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  writeBlock(mFormat.format(2)); // end of program, stop spindle, coolant off
  writeln("E");
}

// >>>>> INCLUDED FROM include_files/commonInspectionFunctions_fanuc.cpi
var macroFormat = createFormat({prefix:(typeof inspectionVariables == "undefined" ? "#" : inspectionVariables.localVariablePrefix), decimals:0});
var macroRoundingFormat =  (unit == MM) ? "[53]" : "[44]";
var isDPRNTopen = false;
var localVariableStart = 19;
var localVariable = [
  macroFormat.format(localVariableStart + 1),
  macroFormat.format(localVariableStart + 2),
  macroFormat.format(localVariableStart + 3),
  macroFormat.format(localVariableStart + 4),
  macroFormat.format(localVariableStart + 5),
  macroFormat.format(localVariableStart + 6)
];

function defineLocalVariable(indx, value) {
  writeln(localVariable[indx - 1] + " = " + value);
}

function formatLocalVariable(prefix, indx, rnd) {
  return prefix + localVariable[indx - 1] + rnd;
}

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
    resFile = resFile.toUpperCase();
    writeln("DPRNT[START]");
    writeln("DPRNT[RESULTSFILE*" + resFile + "]");
    if (hasGlobalParameter("document-id")) {
      writeln("DPRNT[DOCUMENTID*" + getGlobalParameter("document-id").toUpperCase() + "]");
    }
    if (hasGlobalParameter("model-version")) {
      writeln("DPRNT[MODELVERSION*" + getGlobalParameter("model-version").toUpperCase() + "]");
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
    return ("#122[60]");
  }
}

function inspectionWriteCADTransform() {
  var cadOrigin = currentSection.getModelOrigin();
  var cadWorkPlane = currentSection.getModelPlane().getTransposed();
  var cadEuler = cadWorkPlane.getEuler2(EULER_XYZ_S);
  defineLocalVariable(1, abcFormat.format(cadEuler.x));
  defineLocalVariable(2, abcFormat.format(cadEuler.y));
  defineLocalVariable(3, abcFormat.format(cadEuler.z));
  defineLocalVariable(4, xyzFormat.format(-cadOrigin.x));
  defineLocalVariable(5, xyzFormat.format(-cadOrigin.y));
  defineLocalVariable(6, xyzFormat.format(-cadOrigin.z));
  writeln(
    "DPRNT[G331" +
    "*N" + getPointNumber() +
    formatLocalVariable("*A", 1, macroRoundingFormat) +
    formatLocalVariable("*B", 2, macroRoundingFormat) +
    formatLocalVariable("*C", 3, macroRoundingFormat) +
    formatLocalVariable("*X", 4, macroRoundingFormat) +
    formatLocalVariable("*Y", 5, macroRoundingFormat) +
    formatLocalVariable("*Z", 6, macroRoundingFormat) +
    "]"
  );
}

function inspectionWriteWorkplaneTransform() {
  var orientation = machineConfiguration.isMultiAxisConfiguration() ? machineConfiguration.getOrientation(getCurrentDirection()) : currentSection.workPlane;
  var abc = orientation.getEuler2(EULER_XYZ_S);
  defineLocalVariable(1, abcFormat.format(abc.x));
  defineLocalVariable(2, abcFormat.format(abc.y));
  defineLocalVariable(3, abcFormat.format(abc.z));
  writeln("DPRNT[G330" +
    "*N" + getPointNumber() +
    formatLocalVariable("*A", 1, macroRoundingFormat) +
    formatLocalVariable("*B", 2, macroRoundingFormat) +
    formatLocalVariable("*C", 3, macroRoundingFormat) +
    "*X0*Y0*Z0*I0*R0]"
  );
}

function writeProbingToolpathInformation(cycleDepth) {
  defineLocalVariable(1, getParameter("autodeskcam:operation-id"));
  writeln(formatLocalVariable("DPRNT[TOOLPATHID*", 1, "[54]]"));
  if (isInspectionOperation()) {
    writeln("DPRNT[TOOLPATH*" + getParameter("operation-comment").toUpperCase().replace(/[()]/g, "") + "]");
  } else {
    defineLocalVariable(2, xyzFormat.format(cycleDepth));
    writeln(formatLocalVariable("DPRNT[CYCLEDEPTH*", 2, macroRoundingFormat + "]"));
  }
}
// <<<<< INCLUDED FROM include_files/commonInspectionFunctions_fanuc.cpi
// <<<<< INCLUDED FROM generic_posts/hurco.cps

capabilities |= CAPABILITY_INSPECTION;
description = "HURCO Inspect Surface";
longDescription = "Generic post for Hurco with Inspection capabilities. It require the NC Productivity Package Option.";

// >>>>> INCLUDED FROM inspection/common/fanuc base inspection properties.cps
properties.probeCalibrationMethod = {
  title      : "Probe calibration Method",
  description: "Select the probe calibration method",
  group      : "probing",
  type       : "enum",
  values     : [
    {id:"Renishaw", title:"Renishaw"},
    {id:"Autodesk", title:"Autodesk"},
    {id:"Other", title:"Other"}
  ],
  value: "Renishaw",
  scope: "post"
};
properties.probeLocalVar = {
  title      : "Local variable start",
  description: "Specify the starting value for macro # variables that are to be used for calculations during inspection paths",
  group      : "probing",
  type       : "integer",
  value      : 100,
  scope      : "post"
};
properties.useDirectConnection = {
  title      : "Stream Measured Point Data",
  description: "Set to true to stream inspection results",
  group      : "probing",
  type       : "boolean",
  value      : false,
  scope      : "post"
};
properties.probeResultsBuffer = {
  title      : "Measurement results store start",
  description: "Specify the starting value of macro # variables where measurement results are stored",
  group      : "probing",
  type       : "integer",
  value      : 800,
  scope      : "post"
};
properties.probeNumberofPoints = {
  title      : "Measurement number of points to store",
  description: "This is the maximum number of measurement results that can be stored in the buffer",
  group      : "probing",
  type       : "integer",
  value      : 4,
  scope      : "post"
};
properties.controlConnectorVersion = {
  title      : "Results connector version",
  description: "Interface version for direct connection to read inspection results",
  group      : "probing",
  type       : "integer",
  value      : 1,
  scope      : "post"
};
properties.toolOffsetType = {
  title      : "Tool offset type",
  description: "Select the which offsets are available on the tool offset page",
  group      : "probing",
  type       : "enum",
  values     : [
    {id:"geomWear", title:"Geometry & Wear"},
    {id:"geomOnly", title:"Geometry only"}
  ],
  value: "geomOnly",
  scope: "post"
};
properties.commissioningMode = {
  title      : "Commissioning Mode",
  description: "Enables commissioning mode where M0 and messages are output at key points in the program",
  group      : "probing",
  type       : "boolean",
  value      : true,
  scope      : "post"
};
properties.probeOnCommand = {
  title      : "Probe On Command",
  description: "The command used to turn the probe on, this can be a M code or sub program call",
  group      : "probing",
  type       : "string",
  value      : "",
  scope      : "post"
};
properties.probeOffCommand = {
  title      : "Probe Off Command",
  description: "The command used to turn the probe off, this can be a M code or sub program call",
  group      : "probing",
  type       : "string",
  value      : "",
  scope      : "post"
};
properties.probeCalibratedRadius = {
  title      : "Calibrated Radius",
  description: "Macro Variable used for storing probe calibrated radi",
  group      : "probing",
  type       : "integer",
  value      : 0,
  scope      : "post"
};
properties.probeEccentricityX = {
  title      : "Eccentricity X",
  description: "Macro Variable used for storing the X eccentricity",
  group      : "probing",
  type       : "integer",
  value      : 0,
  scope      : "post"
};
properties.probeEccentricityY = {
  title      : "Eccentricity Y",
  description: "Macro Variable used for storing the Y eccentricity",
  group      : "probing",
  type       : "integer",
  value      : 0,
  scope      : "post"
};
properties.calibrationNCOutput = {
  title      : "Calibration NC Output Type",
  description: "Choose none if the NC program created is to be used for calibrating the probe",
  group      : "probing",
  type       : "enum",
  values     : [
    {id:"none", title:"none"},
    {id:"Ring Gauge", title:"Ring Gauge"}
  ],
  value: "none",
  scope: "post"
};

// inspection variables
var inspectionVariables = {
  localVariablePrefix            : "#",
  probeRadius                    : 0,
  systemVariableMeasuredX        : 5061,
  systemVariableMeasuredY        : 5062,
  systemVariableMeasuredZ        : 5063,
  pointNumber                    : 1,
  probeResultsBufferFull         : false,
  probeResultsBufferIndex        : 1,
  hasInspectionSections          : false,
  inspectionSectionCount         : 0,
  systemVariableOffsetLengthTable: 2000,
  systemVariableOffsetWearTable  : 2200,
  systemVariableActiveToolNumber : 4111,
  workpieceOffset                : "",
  alternateTriggerCheck          : false,
  toolLengthParameterCheck       : true,
  printParameterCheck            : true
};
// <<<<< INCLUDED FROM inspection/common/fanuc base inspection properties.cps

// modify default settings
properties.probeOnCommand.value = " ";
properties.probeOffCommand.value = " ";
inspectionVariables.alternateTriggerCheck = true;
inspectionVariables.toolLengthParameterCheck = false;
inspectionVariables.printParameterCheck = false;

var saveShowSequenceNumbers;

// >>>>> INCLUDED FROM inspection/common/fanuc base inspection.cps
// code for inspection support

var ijkInspectionFormat = createFormat({decimals:5, forceDecimal:true});

var MEASURE_COMMAND = 31;
var LINEAR_COMMAND = 1;

function inspectionWriteVariables() {
  sequenceNumber = sequenceNumber == undefined ? getProperty("sequenceNumberStart") : sequenceNumber;
  saveShowSequenceNumbers = getProperty("showSequenceNumbers");
  // loop through all NC stream sections to check for surface inspection
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (section.strategy == "inspectSurface") {
      inspectionVariables.workpieceOffset = section.workOffset;
      var count = 1;
      var localVar = getProperty("probeLocalVar");
      var prefix = inspectionVariables.localVariablePrefix;
      inspectionVariables.probeRadius = prefix + count;
      inspectionVariables.xTarget = prefix + ++count;
      inspectionVariables.yTarget = prefix + ++count;
      inspectionVariables.zTarget = prefix + ++count;
      inspectionVariables.xMeasured = prefix + ++count;
      inspectionVariables.yMeasured = prefix + ++count;
      inspectionVariables.zMeasured = prefix + ++count;
      inspectionVariables.activeToolLength = prefix + ++count;
      inspectionVariables.macroVariable1 = prefix + ++count;
      inspectionVariables.macroVariable2 = prefix + ++count;
      inspectionVariables.macroVariable3 = prefix + ++count;
      inspectionVariables.macroVariable4 = prefix + ++count;
      inspectionVariables.macroVariable5 = prefix + ++count;
      inspectionVariables.macroVariable6 = prefix + ++count;
      inspectionVariables.macroVariable7 = prefix + ++count;
      inspectionVariables.workplaneTransformA = prefix + ++count;
      inspectionVariables.workplaneTransformB = prefix + ++count;
      inspectionVariables.workplaneTransformC = prefix + ++count;
      if (getProperty("calibrationNCOutput") == "Ring Gauge") {
        inspectionVariables.measuredXStartingAddress = localVar;
        inspectionVariables.measuredYStartingAddress = localVar + 10;
        inspectionVariables.measuredZStartingAddress = localVar + 20;
        inspectionVariables.measuredIStartingAddress = localVar + 30;
        inspectionVariables.measuredJStartingAddress = localVar + 40;
        inspectionVariables.measuredKStartingAddress = localVar + 50;
      }
      inspectionValidateInspectionSettings();
      inspectionVariables.probeResultsReadPointer = prefix + (getProperty("probeResultsBuffer") + 2);
      inspectionVariables.probeResultsWritePointer = prefix + (getProperty("probeResultsBuffer") + 3);
      inspectionVariables.probeResultsCollectionActive = prefix + (getProperty("probeResultsBuffer") + 4);
      inspectionVariables.probeResultsStartAddress = getProperty("probeResultsBuffer") + 5;
      if (getProperty("commissioningMode")) {
        writeBlock("#3006=1" + formatComment("Property " + properties.commissioningMode.title + " is enabled"));
        writeComment("When the machine is measuring correctly please disable this property");
      }
      if (getProperty("useDirectConnection")) {
        // check to make sure local variables used in results buffer and inspection do not clash
        var localStart = getProperty("probeLocalVar");
        var localEnd = count;
        var bufferStart = getProperty("probeResultsBuffer");
        var bufferEnd = getProperty("probeResultsBuffer") + ((3 * getProperty("probeNumberofPoints")) + 8);
        if ((localStart >= bufferStart && localStart <= bufferEnd) ||
            (localEnd >= bufferStart && localEnd <= bufferEnd)) {
          error("Local variables defined (" + prefix + localStart + "-" + prefix + localEnd +
              ") and live probe results storage area (" + prefix + bufferStart + "-" + prefix + bufferEnd + ") overlap."
          );
        }
        writeBlock(macroFormat.format(getProperty("probeResultsBuffer")) + " = " + getProperty("controlConnectorVersion"));
        writeBlock(macroFormat.format(getProperty("probeResultsBuffer") + 1) + " = " + getProperty("probeNumberofPoints"));
        writeBlock(inspectionVariables.probeResultsReadPointer + " = 0");
        writeBlock(inspectionVariables.probeResultsWritePointer + " = 1");
        writeBlock(inspectionVariables.probeResultsCollectionActive + " = 0");
        if (getProperty("probeResultultsBuffer") == 0) {
          error("Probe Results Buffer start address cannot be zero when using a direct connection.");
        }
        inspectionWriteFusionConnectorInterface("HEADER");
      }
      inspectionVariables.hasInspectionSections = true;
      break;
    }
  }
}

function inspectionValidateInspectionSettings() {
  var errorText = "";
  if (getProperty("probeOnCommand") == "") {
    errorText += "\n-Probe On Command-";
  }
  if (getProperty("probeOffCommand") == "") {
    errorText += "\n-Probe Off Command-";
  }
  if (getProperty("probeCalibratedRadius") == 0) {
    errorText += "\n-Calibrated Radius-";
  }
  if (getProperty("probeEccentricityX") == 0) {
    errorText += "\n-Eccentricity X-";
  }
  if (getProperty("probeEccentricityY") == 0) {
    errorText += "\n-Eccentricity Y-";
  }
  if (errorText != "") {
    error(localize("The following properties need to be configured:" + errorText + "\n-Please consult the guide PDF found at https://cam.autodesk.com/hsmposts?p=fanuc_inspection for more information-"));
  }
}

function onProbe(status) {
  if (status) { // probe ON
    if (getProperty("commissioningMode")) {
      var outputType = getProperty("calibrationNCOutput") == "Ring Gauge" ? "S#1" : "";
      writeBlock(mFormat.format(19), outputType);
    }
    // writeBlock(mFormat.format(184)); // Doosan Allow G01 or G31 move without spindle speed active (M185 to activate)
    if (getProperty("probeOnCommand").trim().length != 0) {
      writeBlock(getProperty("probeOnCommand")); // Command for switching the probe on
    }
    onDwell(2);
    if (getProperty("commissioningMode")) {
      writeBlock("#3006=1" + formatComment("Ensure Probe Is Active"));
    }
  } else { // probe OFF
    if (getProperty("probeOffCommand").trim().length != 0) {
      writeBlock(getProperty("probeOffCommand")); // Command for switching the probe off
    }
    onDwell(2);
    if (getProperty("commissioningMode")) {
      writeBlock("#3006=1" + formatComment("Ensure Probe Has Deactivated"));
    }
  }
}

function inspectionCycleInspect(cycle, epx, epy, epz) {
  if (getNumberOfCyclePoints() != 3) {
    error(localize("Missing Endpoint in Inspection Cycle, check Approach and Retract heights"));
  }
  var x = xyzFormat.format(epx);
  var y = xyzFormat.format(epy);
  var z = xyzFormat.format(epz);
  forceFeed(); // ensure feed is always output - just incase.
  if (currentSection.isMultiAxis() && inspectionVariables.controllerParameterCheck) {
    forceSequenceNumbers(true);
    writeBlock(inspectionVariables.macroVariable1 + "=PRM[5400,5]");
    writeBlock("IF [" + inspectionVariables.macroVariable1 + " EQ 1] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("MACHINE PARAMETER 5400 BIT 5 NEEDS to BE 1 FOR MULTI-AXIS"));
    writeBlock(" ");
    forceSequenceNumbers(false);
  }
  var f;
  if (isFirstCyclePoint() || isLastCyclePoint()) {
    f = isFirstCyclePoint() ? cycle.safeFeed : cycle.linkFeed;
    inspectionCalculateTargetEndpoint(x, y, z);
    if (isFirstCyclePoint()) {
      writeComment("Approach Move");
      inspectionWriteCycleMove(f, MEASURE_COMMAND);
      inspectionProbeTriggerCheck(false); // not triggered
    } else {
      writeComment("Retract Move");
      inspectionWriteCycleMove(f, LINEAR_COMMAND);
      forceXYZ();
    }
  } else {
    f = cycle.measureFeed;
    // var f = 300;
    inspectionWriteNominalData(cycle);
    if (getProperty("useDirectConnection")) {
      inspectionWriteFusionConnectorInterface("MEASURE");
    }
    inspectionCalculateTargetEndpoint(x, y, z);
    writeComment("Measure Move");
    if (getProperty("commissioningMode") && inspectionVariables.pointNumber == 1) {
      writeBlock("#3006=1" + formatComment("Probe is about to contact part. Axes should stop on contact"));
    }
    inspectionWriteCycleMove(f, MEASURE_COMMAND);
    inspectionProbeTriggerCheck(true); // triggered
    inspectionCorrectProbeMeasurement();
    inspectionWriteMeasuredData(cycle);
  }
}

function inspectionWriteNominalData(cycle) {
  var m = getRotation();
  var v = new Vector(cycle.nominalX, cycle.nominalY, cycle.nominalZ);
  var vt = m.multiply(v);
  var pathVector = new Vector(cycle.nominalI, cycle.nominalJ, cycle.nominalK);
  var nv = m.multiply(pathVector).normalized;
  cycle.nominalX = vt.x;
  cycle.nominalY = vt.y;
  cycle.nominalZ = vt.z;
  cycle.nominalI = nv.x;
  cycle.nominalJ = nv.y;
  cycle.nominalK = nv.z;
  writeln(inspectionVariables.xTarget + "=" + xyzFormat.format(cycle.nominalX));
  writeln(inspectionVariables.yTarget + "=" + xyzFormat.format(cycle.nominalY));
  writeln(inspectionVariables.zTarget + "=" + xyzFormat.format(cycle.nominalZ));
  writeln(inspectionVariables.macroVariable1 + "=" + ijkInspectionFormat.format(cycle.nominalI));
  writeln(inspectionVariables.macroVariable2 + "=" + ijkInspectionFormat.format(cycle.nominalJ));
  writeln(inspectionVariables.macroVariable3 + "=" + ijkInspectionFormat.format(cycle.nominalK));
  writeln(inspectionVariables.macroVariable4 + "=" + xyzFormat.format(getParameter("operation:inspectSurfaceOffset")));
  writeln(inspectionVariables.macroVariable5 + "=" + xyzFormat.format(getParameter("operation:inspectUpperTolerance")));
  writeln(inspectionVariables.macroVariable6 + "=" + xyzFormat.format(getParameter("operation:inspectLowerTolerance")));

  writeln("DPRNT[G800" +
    "*N" + inspectionVariables.pointNumber +
    "*X" + inspectionVariables.xTarget + macroRoundingFormat +
    "*Y" + inspectionVariables.yTarget + macroRoundingFormat +
    "*Z" + inspectionVariables.zTarget + macroRoundingFormat +
    "*I" + inspectionVariables.macroVariable1 + macroRoundingFormat +
    "*J" + inspectionVariables.macroVariable2 + macroRoundingFormat +
    "*K" + inspectionVariables.macroVariable3 + macroRoundingFormat +
    "*O" + inspectionVariables.macroVariable4 + macroRoundingFormat +
    "*U" + inspectionVariables.macroVariable5 + macroRoundingFormat +
    "*L" + inspectionVariables.macroVariable6 + macroRoundingFormat +
    "]"
  );
}

function inspectionCalculateTargetEndpoint(x, y, z) {
  writeComment("CALCULATE TARGET ENDPOINT");
  writeBlock(inspectionVariables.xTarget + "=" + x + "-" + macroFormat.format(getProperty("probeEccentricityX")));
  writeBlock(inspectionVariables.yTarget + "=" + y + "-" + macroFormat.format(getProperty("probeEccentricityY")));
  writeBlock(inspectionVariables.zTarget + "=" + z + "+[" + xyzFormat.format(tool.diameter / 2) + "-" + inspectionVariables.probeRadius + "]");
}

function inspectionWriteMeasureMove(f) {
  writeBlock(gFormat.format(31),
    "X" + inspectionVariables.xTarget,
    "Y" + inspectionVariables.yTarget,
    "Z" + inspectionVariables.zTarget,
    feedOutput.format(f)
  );
}
function inspectionWriteCycleMove(feedRate, moveType) {
  writeBlock(gFormat.format(moveType),
    "X" + inspectionVariables.xTarget,
    "Y" + inspectionVariables.yTarget,
    "Z" + inspectionVariables.zTarget,
    feedOutput.format(feedRate)
  );
}

function inspectionProbeTriggerCheck(triggered) {
  var condition = !inspectionVariables.alternateTriggerCheck ? triggered ?  " GT " : " LT " : triggered ?  "#3020 EQ 1" : "#3020 EQ 0";
  var message = triggered ? "NO POINT TAKEN" : "PATH OBSTRUCTED";
  var inPositionTolerance = (unit == MM) ? 0.01 : 0.0004;
  if (!inspectionVariables.alternateTriggerCheck) {
    writeBlock(inspectionVariables.macroVariable1 + "=" + inspectionVariables.xTarget + "-" + macroFormat.format(inspectionVariables.systemVariableMeasuredX));
    writeBlock(inspectionVariables.macroVariable2 + "=" + inspectionVariables.yTarget + "-" + macroFormat.format(inspectionVariables.systemVariableMeasuredY));
    writeBlock(inspectionVariables.macroVariable3 + "=" + inspectionVariables.zTarget + "-" + macroFormat.format(inspectionVariables.systemVariableMeasuredZ) + "+" + inspectionVariables.activeToolLength);
    writeBlock(inspectionVariables.macroVariable4 + "=" +
    "[" + inspectionVariables.macroVariable1 + "*" + inspectionVariables.macroVariable1 + "]" + "+"  +
    "[" + inspectionVariables.macroVariable2 + "*" + inspectionVariables.macroVariable2 + "]" + "+"  +
    "[" + inspectionVariables.macroVariable3 + "*" + inspectionVariables.macroVariable3 + "]"
    );
  }
  forceSequenceNumbers(true);
  writeBlock("IF [" +
  conditional(!inspectionVariables.alternateTriggerCheck, inspectionVariables.macroVariable4) +
  condition +
  conditional(!inspectionVariables.alternateTriggerCheck, inPositionTolerance) +
  "] GOTO" + skipNLines(2));
  writeBlock("#3000 = 1 " + formatComment(message));
  writeBlock(" ");
  forceSequenceNumbers(false);

}

function inspectionCorrectProbeMeasurement() {
  writeComment("Correct Measurements");
  writeBlock(
    inspectionVariables.xMeasured + "=" + macroFormat.format(inspectionVariables.systemVariableMeasuredX) + "+" + macroFormat.format(getProperty("probeEccentricityX"))
  );
  writeBlock(
    inspectionVariables.yMeasured + "=" + macroFormat.format(inspectionVariables.systemVariableMeasuredY) + "+" + macroFormat.format(getProperty("probeEccentricityY"))
  );
  // need to consider probe centre tool output point in future too
  writeBlock(
    inspectionVariables.zMeasured + "=" +
    macroFormat.format(inspectionVariables.systemVariableMeasuredZ) + "-" +
    inspectionVariables.activeToolLength + "+" +
    inspectionVariables.probeRadius
  );
}

function inspectionWriteFusionConnectorInterface(ncSection) {
  if (ncSection == "MEASURE") {
    writeBlock("IF " + inspectionVariables.probeResultsCollectionActive + " NE 1 GOTO " + inspectionVariables.pointNumber);
    writeBlock("WHILE [" + inspectionVariables.probeResultsReadPointer + " EQ " + inspectionVariables.probeResultsWritePointer + "] DO 1");
    onDwell(0.5);
    writeComment("WAITING FOR FUSION CONNECTION");
    writeBlock("G53");
    writeBlock("END 1");
    writeBlock("N" + inspectionVariables.pointNumber);
  } else {
    writeBlock("WHILE [" + inspectionVariables.probeResultsCollectionActive + " NE 1] DO 1");
    onDwell(0.5);
    writeComment("WAITING FOR FUSION CONNECTION");
    writeBlock("G53");
    writeBlock("END 1");
  }
}

function inspectionCalculateDeviation(cycle) {
  //calculate the deviation and produce a warning if out of tolerance.
  //(Measured + ((vector *(-1))*calibrated radi))

  writeComment("calculate deviation");
  //compensate for tip rad in X
  writeBlock(
    inspectionVariables.macroVariable1 + "=[" +
    inspectionVariables.xMeasured + "+[[" +
    ijkFormat.format(cycle.nominalI) + "*[-1]]*" +
    inspectionVariables.probeRadius + "]]"
  );
  //compensate for tip rad in Y
  writeBlock(
    inspectionVariables.macroVariable2 + "=[" +
    inspectionVariables.yMeasured + "+[[" +
    ijkFormat.format(cycle.nominalJ) + "*[-1]]*" +
    inspectionVariables.probeRadius + "]]"
  );
  //compensate for tip rad in Z
  writeBlock(
    inspectionVariables.macroVariable3 + "=[" +
    inspectionVariables.zMeasured + "+[[" +
    ijkFormat.format(cycle.nominalK) + "*[-1]]*" +
    inspectionVariables.probeRadius + "]]"
  );
  //Calculate deviation vector (Measured x - nominal x)
  writeBlock(
    inspectionVariables.macroVariable4 + "=[" +
    inspectionVariables.macroVariable1 + "-[" +
    xyzFormat.format(cycle.nominalX) + "]]"
  );
  //Calculate deviation vector (Measured y - nominal y)
  writeBlock(
    inspectionVariables.macroVariable5 + "=[" +
    inspectionVariables.macroVariable2 + "-[" +
    xyzFormat.format(cycle.nominalY) + "]]"
  );
  //Calculate deviation vector (Measured Z - nominal Z)
  writeBlock(
    inspectionVariables.macroVariable6 + "=[" +
    inspectionVariables.macroVariable3 + "-[" +
    xyzFormat.format(cycle.nominalZ) + "]]"
  );
  //sqrt xyz.xyz this is the value of the deviation
  writeBlock(
    inspectionVariables.macroVariable7 + "=SQRT[[" +
    inspectionVariables.macroVariable4 + "*" +
    inspectionVariables.macroVariable4 + "]+[" +
    inspectionVariables.macroVariable5 + "*" +
    inspectionVariables.macroVariable5 + "]+[" +
    inspectionVariables.macroVariable6 + "*" +
    inspectionVariables.macroVariable6 + "]]"
  );
  //sign of the vector
  writeBlock(
    inspectionVariables.macroVariable1 + "=[[" +
    ijkFormat.format(cycle.nominalI) + "*" +
    inspectionVariables.macroVariable4 + "]+[" +
    ijkFormat.format(cycle.nominalJ) + "*" +
    inspectionVariables.macroVariable5 + "]+[" +
    ijkFormat.format(cycle.nominalK) + "*" +
    inspectionVariables.macroVariable6 + "]]"
  );
  //Print out deviation value
  forceSequenceNumbers(true);
  writeBlock(
    "IF [" + inspectionVariables.macroVariable1 + "GE0] GOTO" + skipNLines(3)
  );
  writeBlock(
    inspectionVariables.macroVariable4 + "=" +
    inspectionVariables.macroVariable7
  );
  writeBlock("GOTO" + skipNLines(2));
  writeBlock(
    inspectionVariables.macroVariable4 + "=[" +
    inspectionVariables.macroVariable7 + "*[-1]]"
  );
  writeBlock(" ");
  writeln(
    "DPRNT[G802" + "*N" + inspectionVariables.pointNumber +
      "*DEVIATION*" + inspectionVariables.macroVariable4 + macroRoundingFormat + "]"
  );
  //Tolerance check
  writeBlock(
    "IF [" + inspectionVariables.macroVariable4 +
     "LT" + (xyzFormat.format(getParameter("operation:inspectUpperTolerance"))) +
     "] GOTO" + skipNLines(3)
  );
  writeBlock(
    "#3006 = 1" + formatComment("Inspection point over tolerance")
  );
  writeBlock("GOTO" + skipNLines(3));
  writeBlock(
    "IF [" + inspectionVariables.macroVariable4 +
    "GT" + (xyzFormat.format(getParameter("operation:inspectLowerTolerance"))) +
    "] GOTO" + skipNLines(2)
  );
  writeBlock(
    "#3006 = 1" + formatComment("Inspection point under tolerance")
  );
  writeBlock(" ");
  forceSequenceNumbers(false);
}

function inspectionWriteMeasuredData(cycle) {
  writeln("DPRNT[G801" +
    "*N" + inspectionVariables.pointNumber +
    "*X" + inspectionVariables.xMeasured + macroRoundingFormat +
    "*Y" + inspectionVariables.yMeasured + macroRoundingFormat +
    "*Z" + inspectionVariables.zMeasured + macroRoundingFormat +
    "*R" + inspectionVariables.probeRadius + macroRoundingFormat +
    "]"
  );

  if (cycle.outOfPositionAction == "stop-message") {
    inspectionCalculateDeviation(cycle);
  }

  if (getProperty("useDirectConnection")) {
    var writeResultIndexX = inspectionVariables.probeResultsStartAddress + (3 * inspectionVariables.probeResultsBufferIndex);
    var writeResultIndexY = inspectionVariables.probeResultsStartAddress + (3 * inspectionVariables.probeResultsBufferIndex) + 1;
    var writeResultIndexZ = inspectionVariables.probeResultsStartAddress + (3 * inspectionVariables.probeResultsBufferIndex) + 2;

    writeBlock(macroFormat.format(writeResultIndexX) + " = " + inspectionVariables.xMeasured);
    writeBlock(macroFormat.format(writeResultIndexY) + " = " + inspectionVariables.yMeasured);
    writeBlock(macroFormat.format(writeResultIndexZ) + " = " + inspectionVariables.zMeasured);
    inspectionVariables.probeResultsBufferIndex += 1;
    if (inspectionVariables.probeResultsBufferIndex > getProperty("probeNumberofPoints")) {
      inspectionVariables.probeResultsBufferIndex = 0;
    }
    writeBlock(inspectionVariables.probeResultsWritePointer + " = " + inspectionVariables.probeResultsBufferIndex);
  }

  if (getProperty("commissioningMode") && (getProperty("calibrationNCOutput") == "Ring Gauge")) {
    writeBlock(macroFormat.format(inspectionVariables.measuredXStartingAddress + inspectionVariables.pointNumber) +
    "=" + inspectionVariables.xMeasured);
    writeBlock(macroFormat.format(inspectionVariables.measuredYStartingAddress + inspectionVariables.pointNumber) +
    "=" + inspectionVariables.yMeasured);
    writeBlock(macroFormat.format(inspectionVariables.measuredZStartingAddress + inspectionVariables.pointNumber) +
    "=" + inspectionVariables.zMeasured);
    writeBlock(macroFormat.format(inspectionVariables.measuredIStartingAddress + inspectionVariables.pointNumber) +
    "=" + xyzFormat.format(cycle.nominalI));
    writeBlock(macroFormat.format(inspectionVariables.measuredJStartingAddress + inspectionVariables.pointNumber) +
    "=" + xyzFormat.format(cycle.nominalJ));
    writeBlock(macroFormat.format(inspectionVariables.measuredKStartingAddress + inspectionVariables.pointNumber) +
    "=" + xyzFormat.format(cycle.nominalK));
  }
  inspectionVariables.pointNumber += 1;
}

function forceSequenceNumbers(force) {
  if (force) {
    setProperty("showSequenceNumbers", "true");
  } else {
    setProperty("showSequenceNumbers", saveShowSequenceNumbers);
  }
}

function skipNLines(n) {
  return (n * getProperty("sequenceNumberIncrement") + sequenceNumber);
}

function resultsOutputLine(n, s) {
  if (n == 0) {
    writeBlock("GOTO #1");
  } else if (n != 20)  {
    writeln("GOTO " + (20 + s));
  }
  sequenceNumber = (n == 0) ? s : n + s;
  writeBlock(" ");
}

function inspectionProcessSectionStart() {
  // only write header once if user selects a single results file
  if (!isDPRNTopen || !getProperty("singleResultsFile") || (currentSection.workOffset != inspectionVariables.workpieceOffset)) {
    inspectionCreateResultsFileHeader();
    inspectionVariables.workpieceOffset = currentSection.workOffset;
  }
  // write the toolpath name as a comment
  writeProbingToolpathInformation();
  inspectionWriteCADTransform();
  inspectionWriteWorkplaneTransform();
  inspectionVariables.inspectionSectionCount += 1;
  if (getProperty("toolOffsetType") == "geomOnly") {
    writeComment("Geometry Only");
    writeBlock(
      inspectionVariables.activeToolLength + "=" +
      inspectionVariables.localVariablePrefix + "[" +
      inspectionVariables.systemVariableOffsetLengthTable + " + " +
      macroFormat.format(inspectionVariables.systemVariableActiveToolNumber) +
      "]"
    );
  } else {
    writeComment("Geometry and Wear");
    writeBlock(
      inspectionVariables.activeToolLength + "=" +
      inspectionVariables.localVariablePrefix + "[" +
      inspectionVariables.systemVariableOffsetLengthTable + " + " +
      macroFormat.format(inspectionVariables.systemVariableActiveToolNumber) +
      "] + " +
      inspectionVariables.localVariablePrefix + "[" +
      inspectionVariables.systemVariableOffsetWearTable + " + " +
      macroFormat.format(inspectionVariables.systemVariableActiveToolNumber) +
      "]"
    );
  }
  if (getProperty("probeCalibrationMethod") == "Renishaw") {
    writeBlock(inspectionVariables.probeRadius + "=[[" +
      macroFormat.format(getProperty("probeCalibratedRadius")) + " + " +
      macroFormat.format(getProperty("probeCalibratedRadius") + 1) + "]" + "/2]"
    );
  } else {
    writeBlock(inspectionVariables.probeRadius + "=" + macroFormat.format(getProperty("probeCalibratedRadius")));
  }
  if (getProperty("commissioningMode") && !isDPRNTopen) {
    writeln("DPRNT[CALIBRATED*RADIUS*" + inspectionVariables.probeRadius + macroRoundingFormat + "]");
    writeln("DPRNT[ECCENTRICITY*X****" + macroFormat.format(getProperty("probeEccentricityX")) + macroRoundingFormat + "]");
    writeln("DPRNT[ECCENTRICITY*Y****" + macroFormat.format(getProperty("probeEccentricityY")) + macroRoundingFormat + "]");
    forceSequenceNumbers(true);
    writeBlock("IF [" + inspectionVariables.probeRadius + " NE #0] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY CALIBRATED RADIUS INCORRECT"));
    writeBlock("IF [" + inspectionVariables.probeRadius + " NE 0] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY CALIBRATED RADIUS INCORRECT"));
    writeBlock("IF [" + inspectionVariables.probeRadius + " LT " + xyzFormat.format(tool.diameter / 2) + "] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY CALIBRATED RADIUS INCORRECT"));
    var maxEccentricity = (unit == MM) ? 0.2 : 0.0079;
    writeBlock("IF [ABS[" + macroFormat.format(getProperty("probeEccentricityX")) + "] LT " + maxEccentricity + "] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY ECCENTRICITY X INCORRECT"));
    writeBlock("IF [ABS[" + macroFormat.format(getProperty("probeEccentricityY")) + "] LT " + maxEccentricity + "] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY ECCENTRICITY Y INCORRECT"));
    writeBlock("IF [" + macroFormat.format(getProperty("probeEccentricityX")) + " NE #0] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY ECCENTRICITY X INCORRECT"));
    writeBlock("IF [" + macroFormat.format(getProperty("probeEccentricityY")) + " NE #0] GOTO" + skipNLines(2));
    writeBlock("#3000 = 1" + formatComment("PROBE NOT CALIBRATED OR PROPERTY ECCENTRICITY Y INCORRECT"));
    forceSequenceNumbers(false);
  }
  isDPRNTopen = true;
  if (inspectionVariables.toolLengthParameterCheck) {
    forceSequenceNumbers(true);
    writeBlock(inspectionVariables.macroVariable1 + "=PRM[6014,4]");
    writeBlock("IF [" + inspectionVariables.macroVariable1 + " EQ 0] GOTO" + skipNLines(2));
    writeBlock(inspectionVariables.activeToolLength + " = 0");
    writeBlock(" ");
    forceSequenceNumbers(false);
  }
}

function inspectionProcessSectionEnd() {
  // close inspection results file if the NC has inspection toolpaths
  if (inspectionVariables.hasInspectionSections) {
    if (getProperty("commissioningMode") && inspectionVariables.printParameterCheck) {
      forceSequenceNumbers(true);
      writeBlock(inspectionVariables.macroVariable1 + "=PRM[6019,3]");
      writeBlock("IF [" + inspectionVariables.macroVariable1 + " NE 0] GOTO" + skipNLines(2));
      writeBlock("#3006 = 1 " + formatComment("MRESULTS FILENAME IS PRNTXXXX.DAT"));
      writeBlock("IF [" + inspectionVariables.macroVariable1 + " NE 1] GOTO" + skipNLines(2));
      writeBlock("#3006 = 1 " + formatComment("MRESULTS FILENAME IS MCR_PRNT.TXT"));
      var skipValue = skipNLines(2);
      writeBlock("#1 = [PRM[20] + " + skipValue + "]");
      resultsOutputLine(0, skipValue);
      writeln("#3006=1" + formatComment("A Results file has been output to - Serial"));
      resultsOutputLine(4, skipValue);
      writeln("#3006=1" + formatComment("A Results file has been output to - Memory Card"));
      resultsOutputLine(5, skipValue);
      writeln("#3006=1" + formatComment("A Results file has been output to - Data Server"));
      resultsOutputLine(9, skipValue);
      writeln("#3006=1" + formatComment("A Results file has been output to - FTP"));
      resultsOutputLine(15, skipValue);
      writeln("#3006=1" + formatComment("A Results file has been output to - ethernet"));
      resultsOutputLine(17, skipValue);
      writeln("#3006=1" + formatComment("A Results file has been output to - USB"));
      resultsOutputLine(20, skipValue);
      forceSequenceNumbers(false);
      onCommand(COMMAND_STOP);
    }
  }
}
// <<<<< INCLUDED FROM inspection/common/fanuc base inspection.cps
