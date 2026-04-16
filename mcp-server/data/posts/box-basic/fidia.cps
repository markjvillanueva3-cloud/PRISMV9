/**
  Copyright (C) 2012-2025 by Autodesk, Inc.
  All rights reserved.

  FIDIA post processor configuration.

  $Revision: 44207 3c29ebc507e8e59a0898c47558016451f197da94 $
  $Date: 2025-12-17 08:29:21 $

  FORKID {968DC40E-DA9D-4b14-A078-6615FB082675}
*/

description = "FIDIA";
vendor = "FIDIA";
vendorUrl = "http://www.fidia.it";
legal = "Copyright (C) 2012-2025 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Generic milling post for FIDIA with an option to run ViMill interface.";

dependencies = "fidia.hta";

extension = "cnc";
programNameIsInteger = false;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = 1 << PLANE_XY; // allow only XY circular motion
highFeedrate = (unit == MM) ? 5000 : 200;

// user-defined properties
properties = {
  useTiltedWorkplane: {
    title      : "Use G21",
    description: "Enable to output G21 blocks for 3+2 operations, disable to output rotary angles.",
    group      : "multiAxis",
    type       : "boolean",
    value      : true,
    scope      : ["machine", "post"]
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
    value      : false,
    scope      : "post"
  },
  safePositionMethod: {
    title      : "Safe Retracts",
    description: "Select your desired retract option. 'Clearance Height' retracts to the operation clearance height. G290 is not available on all versions of the controler",
    group      : "homePositions",
    type       : "enum",
    values     : [
      {title:"G290", id:"G290"}, // not available on v3.9, but it exist in v5.7, like a Fanuc G53
      {title:"M242", id:"M242"}, // for the older controllers (only Z move)
      {title:"Clearance Height", id:"clearanceHeight"}
    ],
    value: "M242",
    scope: "post"
  },
  exportVimill: {
    title      : "Export to ViMill",
    description: "Export data to ViMill for automatic simulation of generated NC programs.",
    group      : "ViMill",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  outputFile: {
    title      : "Output File",
    description: "NC program Output",
    group      : "ViMill",
    type       : "enum",
    value      : "Single",
    values     : [
      {id:"Single", title:"Single"},
      {id:"Multiple", title:"Multiple"}
    ],
    scope: "post"
  }
};

var gFormat = createFormat({prefix:"G", minDigitsLeft:2, decimals:0});
var mFormat = createFormat({prefix:"M", minDigitsLeft:2, decimals:0});
var hFormat = createFormat({prefix:"H", minDigitsLeft:2, decimals:0});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), type:FORMAT_REAL});
var abcFormat = createFormat({decimals:3, type:FORMAT_REAL, scale:DEG});
var feedFormat = createFormat({decimals:0, scale:(unit == MM ? 1 : 100)});
var toolFormat = createFormat({minDigitsLeft:2, decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, type:FORMAT_REAL}); // seconds - range 0.001-99999.999
var secIntegerFormat = createFormat({decimals:0}); // seconds // range 1-9999
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createOutputVariable({onchange:function() {state.retractedX = false;}, prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({onchange:function() {state.retractedY = false;}, prefix:"Y"}, xyzFormat);
var zOutput = createOutputVariable({onchange:function() {state.retractedZ = false;}, prefix:"Z"}, xyzFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, abcFormat);
var cOutput = createOutputVariable({prefix:"C"}, abcFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, xyzFormat);

var gMotionModal = createOutputVariable({
  onchange: function () {
    if (gMotionModal.getCurrent() == 0) {
      gMotionModal.reset(); // force motion commands for rapid movements
    }
    if (skipBlocks) {forceModals(gMotionModal);}
  }
}, gFormat);
var gPlaneModal = createOutputVariable({onchange:function() {if (skipBlocks) {forceModals(gPlaneModal);} forceModals(gMotionModal);}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createOutputVariable({onchange:function() {if (skipBlocks) {forceModals(gAbsIncModal);}}}, gFormat);  // modal group 1 // G90-91
var gUnitModal = createOutputVariable({}, gFormat); // modal group 1 // G70-71
var gCycleModal = createOutputVariable({}, gFormat); // modal group 4 // G82, ...
var gRotationModal = createOutputVariable({current : 20,
  onchange: function () {
    state.twpIsActive = gRotationModal.getCurrent() == 21;
    machineSimulation({}); // update machine simulation TWP state
  }
}, gFormat); // modal group 16 // G20-G21
var rotaryAxisClamp = createOutputVariable({}, mFormat);

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G55 O", range:[1, 99]}
  ]
};

var settings = {
  coolant: {
    // samples:
    // {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
    // {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
    // {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
    coolants: [
      {id:COOLANT_FLOOD, on:8},
      {id:COOLANT_MIST, on:7},
      {id:COOLANT_THROUGH_TOOL},
      {id:COOLANT_AIR},
      {id:COOLANT_AIR_THROUGH_TOOL},
      {id:COOLANT_SUCTION},
      {id:COOLANT_FLOOD_MIST},
      {id:COOLANT_FLOOD_THROUGH_TOOL},
      {id:COOLANT_OFF, off:9}
    ],
    singleLineCoolant: false, // specifies to output multiple coolant codes in one line rather than in separate lines
  },
  retract: {
    cancelRotationOnRetracting: false, // specifies that rotations (G68) need to be canceled prior to retracting
    methodXY                  : undefined, // special condition, overwrite retract behavior per axis
    methodZ                   : undefined, // special condition, overwrite retract behavior per axis
    useZeroValues             : ["G290", "M242"], // enter property value id(s) for using "0" value instead of machineConfiguration axes home position values (ie G30 Z0)
    homeXY                    : {onIndexing:false, onToolChange:false, onProgramEnd:{axes:[X, Y]}} // Specifies when the machine should be homed in X/Y. Sample: onIndexing:{axes:[X, Y], singleLine:false}
  },
  machineAngles: { // refer to https://cam.autodesk.com/posts/reference/classMachineConfiguration.html#a14bcc7550639c482492b4ad05b1580c8
    controllingAxis: ABC,
    type           : PREFER_PREFERENCE,
    options        : ENABLE_ALL
  },
  workPlaneMethod: {
    useTiltedWorkplane    : true, // specifies that tilted workplanes should be used (ie. G68.2, G254, PLANE SPATIAL, CYCLE800), can be overwritten by property
    eulerConvention       : EULER_XYZ_S, // specifies the euler convention (ie EULER_XYZ_R), set to undefined to use machine angles for TWP commands ('undefined' requires machine configuration)
    eulerCalculationMethod: "standard", // ('standard' / 'machine') 'machine' adjusts euler angles to match the machines ABC orientation, machine configuration required
    cancelTiltFirst       : true, // cancel tilted workplane prior to WCS (G54-G59) blocks
    forceMultiAxisIndexing: false, // force multi-axis indexing for 3D programs
    optimizeType          : OPTIMIZE_AXIS // can be set to OPTIMIZE_NONE, OPTIMIZE_BOTH, OPTIMIZE_TABLES, OPTIMIZE_HEADS, OPTIMIZE_AXIS. 'undefined' uses legacy rotations
  },
  comments: {
    permittedCommentChars: " abcdefghijklmnopqrstuvwxyz0123456789.,=_-", // letters are not case sensitive, use option 'outputFormat' below. Set to 'undefined' to allow any character
    prefix               : "(", // specifies the prefix for the comment
    suffix               : ")", // specifies the suffix for the comment
    outputFormat         : "upperCase", // can be set to "upperCase", "lowerCase" and "ignoreCase". Set to "ignoreCase" to write comments without upper/lower case formatting
    maximumLineLength    : 80 // the maximum number of characters allowed in a line, set to 0 to disable comment output
  },
  maximumSequenceNumber       : undefined, // the maximum sequence number (Nxxx), use 'undefined' for unlimited
  maximumToolNumber           : 99, // specifies the maximum allowed tool number
  // fixed settings below, do not modify
  outputToolLengthCompensation: false, // specifies if tool length compensation code should be output (G43)
  outputToolLengthOffset      : false, // specifies if tool length offset code should be output (Hxx)
  supportsInverseTimeFeed     : false // this postprocessor does not support inverse time feedrates
};

// collected state
var tcpCommands = [];
var folder;
var toolpathNames = new Array();

function fidiaHeader(opName) {
  gRotationModal.format(20); // Default to G20 Rotation Off

  if (getProperty("outputFile") == "Single") {
    writeComment(programName);
  } else {
    writeComment(programName + "_" + opName);
  }
  writeComment(programComment);
  writeProgramHeader();
  // absolute coordinates
  writeBlock(gAbsIncModal.format(90));
  writeBlock(gPlaneModal.format(17), "Q1"); // select circular interpolation plane G17, and tool length compensation direction Q1=Z+
  writeBlock(gUnitModal.format(unit == MM ? 71 : 70));
}

function fidiaFooter() {
  optionalSection = false;
  onCommand(COMMAND_COOLANT_OFF);
  onCommand(COMMAND_STOP_SPINDLE);
  cancelWorkPlane();
  setTCP(false, tcpIsOutputForTwp);
  writeRetract(Z); // retract
  forceWorkPlane();
  setWorkPlane(new Vector(0, 0, 0)); // reset working plane
  if (getSetting("retract.homeXY.onProgramEnd", false)) {
    writeRetract(settings.retract.homeXY.onProgramEnd);
  }
}

function onOpen() {
  // define and enable machine configuration
  receivedMachineConfiguration = machineConfiguration.isReceived();
  if (typeof defineMachine == "function") {
    defineMachine(); // hardcoded machine configuration
  }
  activateMachine(); // enable the machine optimizations and settings

  // configuration for simulation only
  if (getSimulationStreamPath() != "") {
    setProperty("outputFile", "Single");
    setProperty("exportVimill", false);
  }
  if (machineConfiguration.isMultiAxisConfiguration() && tcp.isSupportedByMachine) {
    if (machineConfiguration.isHeadConfiguration()) {
      tcpCommands.push({on:96, off:97}); // head head
      var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
      for (var i in axes) {
        if (axes[i].isEnabled() && axes[i].isTable()) {
          tcpCommands.push({on:196, off:197}); // head table
          break;
        }
      }
    } else {
      tcpCommands.push({on:196, off:197}); // table table
    }
  }
  if (getProperty("outputFile") == "Single") {
    if (getProperty("exportVimill")) {
      createSubfolders();
      var path = FileSystem.getCombinedPath(folder + "//Programs", programName + ".cnc");
      redirectToFile(path);
    }
    fidiaHeader();
  } else {
    if (getProperty("exportVimill")) {
      createSubfolders();
    } else {
      error(localize("Multiple nc files are only available when exporting to ViMill."));
    }
  }
  validateCommonParameters();
}

function onParameter(name, value) {
}

var currentWorkPlaneABC = undefined;
function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function cancelWorkPlane(force) {
  if (typeof gRotationModal != "undefined") {
    if (force) {
      gRotationModal.reset();
    }
    var command = gRotationModal.format(20);
    if (command) {
      writeBlock(command); // cancel frame
      forceWorkPlane();
    }
  }
}

function setWorkPlane(abc) {
  if (!settings.workPlaneMethod.forceMultiAxisIndexing && is3D() && !machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }
  if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
    return; // no change
  }

  writeRetract(Z);
  if (getSetting("retract.homeXY.onIndexing", false)) {
    writeRetract(settings.retract.homeXY.onIndexing);
  }
  if (settings.workPlaneMethod.useTiltedWorkplane) {
    cancelWorkPlane();
    if (machineConfiguration.isMultiAxisConfiguration()) {
      var machineABC = abc.isNonZero() ? (currentSection.isMultiAxis() ? getCurrentDirection() : getWorkPlaneMachineABC(currentSection, false)) : abc;
      if (settings.workPlaneMethod.useABCPrepositioning || machineABC.isZero()) {
        positionABC(machineABC, false);
      } else {
        setCurrentABC(machineABC);
      }
    }
    if (abc.isNonZero()) {
      gRotationModal.reset();
      // the TCP command below is only output to enable tool length compensation, the control does not act like if TCP is enabled when TWP is active.
      setTCP(tcp.isSupportedByMachine); // enable TCP is desired before enable TWP
      writeBlock(gRotationModal.format(21), "RX" + abcFormat.format(abc.x), "RY" + abcFormat.format(abc.y), "RZ" + abcFormat.format(abc.z)); // set frame
    } else {
      cancelWorkPlane();
    }
    state.tcpIsActive = false; // set state.tcpIsActive to false to reflect that TCP is not active when TWP is active.
    machineSimulation({a:getCurrentABC().x, b:getCurrentABC().y, c:getCurrentABC().z, coordinates:MACHINE, eulerAngles:abc});
  } else {
    positionABC(abc, true);
  }
  forceABC();
  forceXYZ();

  if (!currentSection.isMultiAxis()) {
    onCommand(COMMAND_LOCK_MULTI_AXIS);
  }
  currentWorkPlaneABC = abc;
}

var tcpIsOutputForTwp = false;
function setTCP(_tcp, force) {
  if (!force) {
    if (!tcp.isSupportedByMachine || state.tcpIsActive == _tcp) {
      return;
    }
  }
  for (var i in tcpCommands) {
    writeBlock(gFormat.format(_tcp ? tcpCommands[i].on : tcpCommands[i].off));
  }
  // RTCP commands are output even for 3+2 toolpaths using TWP. Therefor variable tcpIsOutputForTwp is used.
  // It acts like a tool length compensation command when TWP is enabled, but it is not real RTCP.
  state.tcpIsActive = _tcp;
  tcpIsOutputForTwp = _tcp;
  machineSimulation({}); // update machine simulation TCP state
}

function onSection() {
  var forceSectionRestart = optionalSection && !currentSection.isOptional();
  optionalSection = currentSection.isOptional();
  var insertToolCall = isToolChangeNeeded("number") || forceSectionRestart || getProperty("outputFile") == "Multiple";
  var newWorkOffset = isNewWorkOffset() || forceSectionRestart;
  var newWorkPlane = isNewWorkPlane() || forceSectionRestart || (typeof defineWorkPlane == "function" &&
    Vector.diff(defineWorkPlane(getPreviousSection(), false), defineWorkPlane(currentSection, false)).length > 1e-4);

  var opName = getParameter("operation-comment", "unnamed_" + currentSection.getId());
  opName = opName.replace(/[^a-zA-Z0-9_()]/g, "_");

  if (getProperty("outputFile") == "Multiple") {
    gAbsIncModal.reset();
    gPlaneModal.reset();
    gUnitModal.reset();
    state.retractedZ = false;
    setProperty("writeTools", false);
    currentWorkPlaneABC = undefined;
    forceABC();

    toolpathNames.push(opName);
    var path = FileSystem.getCombinedPath(folder + "//Programs", opName + ".nc");
    redirectToFile(path);
    fidiaHeader(opName);
  }

  if (insertToolCall || newWorkOffset || newWorkPlane || state.tcpIsActive || currentSection.isMultiAxis()) {
    if (insertToolCall && !isFirstSection()) {
      onCommand(COMMAND_COOLANT_OFF); // turn off coolant before retract during tool change
      onCommand(COMMAND_STOP_SPINDLE); // stop spindle before retract during tool change
    }
    cancelWorkPlane();
    setTCP(false, tcpIsOutputForTwp || isFirstSection());
    writeRetract(Z); // retract

    if (isFirstSection()) {
      cancelWorkPlane(machineConfiguration.isMultiAxisConfiguration() && settings.workPlaneMethod.useTiltedWorkplane);
      if ((isFirstSection() || insertToolCall || getProperty("outputFile") == "Multiple") && machineConfiguration.isMultiAxisConfiguration()) {
        positionABC(new Vector(0, 0, 0));
      }
      forceABC();
    } else {
      if (insertToolCall || newWorkPlane) {
        cancelWorkPlane();
      }
    }
  }

  writeln("");
  writeComment(opName);

  writeToolCall(tool, insertToolCall);
  startSpindle(tool, insertToolCall);

  // Output modal commands here
  writeBlock(gAbsIncModal.format(90));
  var _plane = gPlaneModal.format(17);
  if (_plane) {
    writeBlock(_plane + " Q1"); // select circular interpolation plane G17, and tool length compensation direction Q1=Z+
  }

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }
  writeWCS(currentSection, true);
  forceXYZ();

  // position rotary axes for multi-axis and 3+2 operations
  var abc = defineWorkPlane(currentSection, !machineConfiguration.isHeadConfiguration());

  // prepositioning
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  var isRequired = insertToolCall || state.retractedZ || (!isFirstSection() && getPreviousSection().isMultiAxis());

  writeInitialPositioning(initialPosition, isRequired);

  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);
}

function onDwell(seconds) {
  var maxValue = 99999.999;
  if (seconds > maxValue) {
    warning(subst(localize("Dwelling time of '%1' exceeds the maximum value of '%2' in operation '%3'"), seconds, maxValue, getParameter("operation-comment", "")));
  }
  writeBlock(gFormat.format(4), "HD" + secFormat.format(seconds));
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(sOutput.format(spindleSpeed));
}

function onCycle() {
}

function getCommonCycle(x, y, z, r, c) {
  forceXYZ();
  return [xOutput.format(x), yOutput.format(y), zOutput.format(c),
    "E" + xyzFormat.format(z),
    "R" + xyzFormat.format(r)];
}

function onCyclePoint(x, y, z) {
  if (!isSameDirection(machineConfiguration.getSpindleAxis(), getForwardDirection(currentSection))) {
    expandCyclePoint(x, y, z);
    return;
  }
  if (isFirstCyclePoint()) {
    repositionToCycleClearance(cycle, x, y, z);

    var F = cycle.feedrate;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell, 99999999); // in seconds

    switch (cycleType) {
    case "drilling":
      writeBlock(feedOutput.format(F),
        gAbsIncModal.format(90), gCycleModal.format(82),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        conditional(P > 0, "H" + secIntegerFormat.format(P))
      );
      break;
    case "counter-boring":
      writeBlock(feedOutput.format(F),
        gAbsIncModal.format(90), gCycleModal.format(82),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        conditional(P > 0, "H" + secIntegerFormat.format(P))
      );
      break;
    case "chip-breaking":
      if ((cycle.accumulatedDepth < cycle.depth) || (P < 0.001)) { // fidia need a dwell for chip breaking, as it's the same command as deep-drilling.
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(feedOutput.format(F),
          gAbsIncModal.format(90), gCycleModal.format(83),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "D" + xyzFormat.format(cycle.incrementalDepth),
          "H" + secIntegerFormat.format(P)
        );
      }
      break;
    case "deep-drilling":
      if (P > 0) { // dwell is not supported for fidia deep drill, as it's the same command as chip-breaking.
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(feedOutput.format(F),
          gAbsIncModal.format(90), gCycleModal.format(83),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "D" + xyzFormat.format(cycle.incrementalDepth)
        );
      }
      break;
    case "tapping":
      if (!F) {
        F = tool.getTappingFeedrate();
      }
      writeBlock(feedOutput.format(F), sOutput.format(spindleSpeed),
        gAbsIncModal.format(90), gCycleModal.format(84),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "H" + secIntegerFormat.format(P)
      );
      break;
    case "left-tapping":
      error(localize("Left tapping is not supported"));
      break;
    case "right-tapping":
      if (!F) {
        F = tool.getTappingFeedrate();
      }
      writeBlock(feedOutput.format(F), sOutput.format(spindleSpeed),
        gAbsIncModal.format(90), gCycleModal.format(84),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "H" + secIntegerFormat.format(P)
      );
      break;
    case "fine-boring":
      expandCyclePoint(x, y, z);
      break;
    case "back-boring":
      expandCyclePoint(x, y, z);
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      writeBlock(feedOutput.format(F),
        gAbsIncModal.format(90), gCycleModal.format(85),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "H" + secIntegerFormat.format(P)
      );
      break;
    case "stop-boring":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(feedOutput.format(F),
          gAbsIncModal.format(90), gCycleModal.format(86),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance)
        );
      }
      break;
    case "boring":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      writeBlock(feedOutput.format(F),
        gAbsIncModal.format(90), gCycleModal.format(85),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        "H" + secIntegerFormat.format(P)
      );
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      writeBlock(xOutput.format(x), yOutput.format(y));
    }
  }
}

function onCycleEnd() {
  if (!cycleExpanded) {
    writeBlock(gCycleModal.format(80));
    zOutput.reset();
  }
}

function onLinear(_x, _y, _z, feed) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = feedOutput.format(feed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      var d = tool.diameterOffset;
      writeBlock(gPlaneModal.format(17));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gFormat.format(41));
        writeBlock(gMotionModal.format(1), x, y, z, f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gFormat.format(42));
        writeBlock(gMotionModal.format(1), x, y, z, f);
        break;
      default:
        writeBlock(gFormat.format(40));
        writeBlock(gMotionModal.format(1), x, y, z, f);
      }
    } else {
      writeBlock(gMotionModal.format(1), x, y, z, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      feedOutput.reset(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed, feedMode) {
  if (!currentSection.isOptimizedForMachine()) {
    error(localize("This post configuration has not been customized for 5-axis simultaneous toolpath."));
  }
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
  }

  forceXYZ();
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(_a);
  var b = bOutput.format(_b);
  var c = cOutput.format(_c);
  var f = feedOutput.format(feed);

  if (x || y || z || a || b || c) {
    writeBlock(gMotionModal.format(1), x, y, z, a, b, c, f);
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      feedOutput.reset(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
  }

  gMotionModal.reset();
  var directionCode = isHelical() ? clockwise ? 22 : 23 : clockwise ? 2 : 3;
  if (isFullCircle()) {
    if (isHelical()) {
      switch (getCircularPlane()) {
      case PLANE_XY:
        writeBlock(gAbsIncModal.format(90), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), jOutput.format(cy), "P" + xyzFormat.format(360), feedOutput.format(feed));
        break;
      default:
        linearize(tolerance);
      }
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), iOutput.format(cx), jOutput.format(cy), feedOutput.format(feed));
      break;
    case PLANE_ZX:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), zOutput.format(z), iOutput.format(cx), kOutput.format(cz), feedOutput.format(feed));
      break;
    case PLANE_YZ:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(directionCode), yOutput.format(y), zOutput.format(z), jOutput.format(cy), kOutput.format(cz), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else {
    var sweep = toDeg(getCircularSweep());
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), jOutput.format(cy), conditional(isHelical(), "P" + xyzFormat.format(sweep)), feedOutput.format(feed));
      break;
    case PLANE_ZX:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), kOutput.format(cz), conditional(isHelical(), "P" + xyzFormat.format(sweep)), feedOutput.format(feed));
      break;
    case PLANE_YZ:
      writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(directionCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy), kOutput.format(cz), conditional(isHelical(), "P" + xyzFormat.format(sweep)), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  }
}

var mapCommand = {
  COMMAND_END                     : 2,
  COMMAND_SPINDLE_CLOCKWISE       : 3,
  COMMAND_SPINDLE_COUNTERCLOCKWISE: 4,
  COMMAND_STOP_SPINDLE            : 5,
  COMMAND_ORIENTATE_SPINDLE       : 19,
};

function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    setCoolant(COOLANT_OFF);
    return;
  case COMMAND_COOLANT_ON:
    setCoolant(tool.coolant);
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
    return;
  case COMMAND_START_SPINDLE:
    forceSpindleSpeed = false;
    writeBlock(sOutput.format(spindleSpeed), mFormat.format(tool.clockwise ? 3 : 4));
    return;
  case COMMAND_LOAD_TOOL:
    writeToolBlock(mFormat.format(6), "T." + toolFormat.format(tool.number));
    writeComment(tool.comment);
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    writeBlock(rotaryAxisClamp.format(10)); // depending on the machine parameters AXSLCKM10, or AXSLCKM12 it can be M10, or M12
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    writeBlock(rotaryAxisClamp.format(11)); // M11 unlock all axis
    return;
  case COMMAND_BREAK_CONTROL:
    return;
  case COMMAND_TOOL_MEASURE:
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
  writeBlock(gPlaneModal.format(17));
  if (!isLastSection() && (getNextSection().getTool().coolant != tool.coolant)) {
    setCoolant(COOLANT_OFF);
  }
  forceAny();

  if (getProperty("outputFile") == "Multiple") {
    fidiaFooter();
    closeRedirection();
    sequenceNumber = getProperty("sequenceNumberStart"); // reset sequence line number
  }
}

function writeRetract() {
  var retract = getRetractParameters.apply(this, arguments);
  if (retract && retract.words.length > 0) {
    if (typeof cancelWCSRotation == "function" && getSetting("retract.cancelRotationOnRetracting", false)) { // cancel rotation before retracting
      cancelWCSRotation();
    }
    for (var i in retract.words) {
      var words = retract.singleLine ? retract.words : retract.words[i];
      switch (retract.method) {
      case "G290":
        forceModals(gMotionModal, gAbsIncModal);
        writeBlock(gFormat.format(290), words);
        break;
      case "M242":
        forceModals(gMotionModal, gAbsIncModal);
        if (retract.retractAxes[2]) { // only Z is supported
          writeBlock(mFormat.format(242));
        } else {
          warning(localize("Retracting in XY is ignored if property 'Safe Retracts' is set to 'M242'."));
        }
        break;
      default:
        error(subst(localize("Unsupported safe position method '%1'"), retract.method));
      }
      machineSimulation({
        x          : (retract.method == "G290") ? (retract.singleLine || words.indexOf("X") != -1 ? retract.positions.x : undefined) : undefined,
        y          : (retract.method == "G290") ? (retract.singleLine || words.indexOf("Y") != -1 ? retract.positions.y : undefined) : undefined,
        z          : retract.singleLine || words.indexOf("Z") != -1 ? retract.positions.z : undefined,
        coordinates: MACHINE
      });
      if (retract.singleLine) {
        break;
      }
    }
  }
}

// ViMill code - Start
/* eslint-disable */
function showDialog() {
  if (!FileSystem.isFolder(FileSystem.getTemporaryFolder())) {
    FileSystem.makeFolder(FileSystem.getTemporaryFolder());
  }
  var path = FileSystem.getTemporaryFile("post");
  var storedSettings = getConfigurationFolder() + "\\ADSKCAMViMillSettings.txt";

  if (!FileSystem.isFile(storedSettings)) {
    try {
      var file = new TextFile(storedSettings, true, "utf-8");
      file.close();
    } catch (e) {
      //
    }
  }
  
  var arg = "\"" + path + "\" \"" + storedSettings + "\"";
  execute(findFile("fidia.hta"), arg, false, "");

  try {
    var file = new TextFile(path, false, "utf-8");
    while (true) {
      var line = file.readln();
      var index = line.indexOf("=");
      if (index >= 0) {
        linesFromHTA.push(line);
      }

      if (line.indexOf("exportStock") >= 0) {
        if (line.substr(index + 1) == "1") {exportStock = true;}
      }
      if (line.indexOf("exportPart") >= 0) {
        if (line.substr(index + 1) == "1") {exportPart = true;}
      }
      if (line.indexOf("exportFixture") >= 0) {
        if (line.substr(index + 1) == "1") {exportFixture = true;}
      }
    }
    file.close();
  } catch (e) {
  }

  if (FileSystem.isFile(path)) {
    if (FileSystem.isFile(storedSettings)) {
      FileSystem.remove(storedSettings);
    }
    FileSystem.copyFile(path, storedSettings);
    FileSystem.remove(path);
  }
  return true;
}

var linesFromHTA = [];

this.exportStock = true;
this.exportPart = true;
this.exportFixture = true;

function createToolDatabaseFile() {
  var path = folder + "//Tools//TOOLS.xml";
  redirectToFile(path);

  writeln("<?xml version=" + "\"" + "1.0" + "\"" + "?>");
  writeln("<ViMillToolLibrary>");
  writeln("   <Tools>");

  var tools = getToolTable();
  if (tools.getNumberOfTools() > 0) {
    for (var i = 0; i < tools.getNumberOfTools(); ++i) {
      var tool = tools.getTool(i);
      var holder = tool.holder;
      var tName = tool.description;
      var fluteLength = tool.fluteLength;
      var tType = getToolTypeName(tool.type);
      var ttType = "";

      switch (tType) {
      case "face mill":
      case "flat end mill":
        ttType = "TOOL_TYPE_1";
        break;
      case "ball end mill":
        ttType = "TOOL_TYPE_3";
        break;
      case "bullnose end mill":
      case "slot mill":
        ttType = "TOOL_TYPE_2";
        break;
      default:
        ttType = "TOOL_TYPE_UNKNOWN";
      }

      writeln("     <Tool ToolID=" + "\"" + tool.number + "\"" + " Units=" + "\"" + ((unit == IN) ? "Inch" : "Millimeter") + "\" TCUTNR=\"" + tool.numberOfFlutes +
       "\" PRESETL=\"" + xyzFormat.format(tool.bodyLength + tool.holderLength) + "\" PREDIAM=\"" + xyzFormat.format(tool.diameter) +
       "\" PRERADIUS=\"" + xyzFormat.format(tool.cornerRadius) + "\" ANGLE=\"" + (tool.taperAngle ? xyzFormat.format(tool.taperAngle) : 0) +
       "\" TOOLNAME=\"" + tName + "\" TTYP=\"" + ttType + "\">");

      writeln("       <Type>Milling</Type>");
      writeln("       <Cutter Type=\"CUTTER_XZSECTION\">");
      writeln("           <XZSection>");
      writeln("             <Pt>");
      writeln("                 <X>0</X>");
      writeln("                 <Z>0</Z>");
      writeln("             </Pt>");

      var cutter = tool.getCutterProfile();
      var isCuttingElement = true;
      for (var k = 0; k < cutter.getNumberOfEntities() / 2; ++k) {
        var arc = ((cutter.getEntity(k).clockwise == true) || cutter.getEntity(k).center.length > 1e-4);
        var startX = xyzFormat.format(cutter.getEntity(k).start.x);
        var endX = xyzFormat.format(cutter.getEntity(k).end.x);
        var endY = xyzFormat.format(cutter.getEntity(k).end.y);
        var centerX = xyzFormat.format(cutter.getEntity(k).center.x);
        var centerY = xyzFormat.format(cutter.getEntity(k).center.y);
        var arcDir = cutter.getEntity(k).clockwise ? "CW" : "CCW";

        if (arc) {
          var radius = Vector.diff(cutter.getEntity(k).start, cutter.getEntity(k).center).length;
          radius = (unit == IN) ? radius * 25.4 : radius;
          var p = cutter.getEntity(k).clockwise ? (radius - fluteLength) : fluteLength;
          var q = (2 * Math.sqrt(p * ((radius * 2) - p))) / 2;
          if (cutter.getEntity(k).clockwise) {
            q = startX + radius - q;
          } else {
            q = startX + q;
          }
          writeln("             <Arc>");
          writeln("                 <X>" + centerX + "</X>");
          writeln("                 <Z>" + centerY + "</Z>");
          writeln("                 <R>" + radius + "</R>");
          writeln("                 <Dir>" + arcDir + "</Dir>");
          writeln("             </Arc>");
        }
        writeln("             <Pt>");
        writeln("                 <X>" + endX + "</X>");
        writeln("                 <Z>" + endY + "</Z>");
        writeln("             </Pt>");

        if ((endY >= fluteLength) && isCuttingElement) {
          writeln("             <Pt>");
          writeln("                 <X>0</X>");
          writeln("                 <Z>" + endY + "</Z>");
          writeln("             </Pt>");

          writeln("           </XZSection>");
          writeln("       </Cutter>");
          writeln("       <Shank Type=\"SHANK_XZSECTION\">");
          writeln("           <XZSection>");
          writeln("             <Pt>");
          writeln("                 <X>0</X>");
          writeln("                 <Z>" + endY + "</Z>");
          writeln("             </Pt>");
          writeln("             <Pt>");
          writeln("                 <X>" + endX + "</X>");
          writeln("                 <Z>" + endY + "</Z>");
          writeln("             </Pt>");
          isCuttingElement = false;
        }
      }
      writeln("           </XZSection>");

      if (isCuttingElement) {
        writeln("        </Cutter>");
      } else {
        writeln("        </Shank>");
      }

      if (holder && holder.hasSections()) {
        var meshHolder = tool.getHolderAsMesh(0.05);
        var nameHolder = tool.getHolderDescription();
        nameHolder = nameHolder.replace(/[^a-zA-Z0-9_()+]/g, "_") + ".stl";
        var holderPath = FileSystem.getCombinedPath(folder + "//Tools//Holders", nameHolder);
        Mesh.saveMesh(holderPath, "application/sla", meshHolder);
        writeln("        <Holder Type=\"HOLDER_STL\">");
        writeln("           <File>Holders\\" + nameHolder + "</File>");
        writeln("           <HiddenConeLen>0</HiddenConeLen>");
        writeln("        </Holder>");
      }
      writeln("     </Tool>");
    }
  }
  writeln("   </Tools>");
  writeln("</ViMillToolLibrary>");
  closeRedirection();
}

function createProjectFile() {
  var path = FileSystem.getCombinedPath(folder, programName + ".vimill");
  redirectToFile(path);

  // Post location
  writeln("[PP]");
  if (getProperty("outputFile") == "Single") {
    writeln("File=Programs\\" + programName + ".cnc");
  } else {
    writeln("File=Programs\\" + programName + ".PRC");
  }

  writeln("[Simulation]");
  for (var i = 1; i < linesFromHTA.length; ++i) {
    writeln(linesFromHTA[i]);
  }

  writeln("stockFileName=Stock\\STOCK.stl");
  writeln("targetFileName=Target\\PART.stl");
  if (destFixturePath != "") {
    writeln("fixture_name_1=Fixtures\\FIXTURE.stl");
  }
  writeln("MetalFixtureColour=IRON");
  writeln("MetalStockColour=COPPER");
  writeln("MetalTargetColour=STEEL");
  writeln("MetalToolColour=STEEL");
  writeln("MetalToolHolderColour=IRON");
  writeln("MetalToolShankColour = BRASS");
  writeln("Inch=" + (unit == 0 ? 1 : 0));

  writeln("stockType=0");
  writeln("stockFilesNumber=1");
  writeln("fixturesNumber=1");

  // Direction of X axis
  writeln("ModelsOrientation_ix=1");
  writeln("ModelsOrientation_iy=0");
  writeln("ModelsOrientation_iz=0");
  // Direction of Y axis
  writeln("ModelsOrientation_jx=0");
  writeln("ModelsOrientation_jy=1");
  writeln("ModelsOrientation_jz=0");
  // Direction of Z axis
  writeln("ModelsOrientation_kx=0");
  writeln("ModelsOrientation_ky=0");
  writeln("ModelsOrientation_kz=1");

  var partPosition = getSection(0).getPartAttachPoint();
  var headPosition = machineConfiguration.getHeadAttachPoint();

  var xOffset = 0;
  var yOffset = 0;
  var zOffset = 0;
  if (machineConfiguration.isHeadConfiguration()) {
    xOffset = (machineConfiguration.getAxisU().getOffset().x + machineConfiguration.getAxisV().getOffset().x + machineConfiguration.getAxisW().getOffset().x);
    yOffset = (machineConfiguration.getAxisU().getOffset().y + machineConfiguration.getAxisV().getOffset().y + machineConfiguration.getAxisW().getOffset().y);
    zOffset = (machineConfiguration.getAxisU().getOffset().z + machineConfiguration.getAxisV().getOffset().z + machineConfiguration.getAxisW().getOffset().z);
  }

  writeln("offline_origin_x_" + getSection(0).workOffset + "=" + xyzFormat.format(partPosition.x + headPosition.x + xOffset));
  writeln("offline_origin_y_" + getSection(0).workOffset + "=" + xyzFormat.format(partPosition.y + headPosition.y + yOffset));
  writeln("offline_origin_z_" + getSection(0).workOffset + "=" + xyzFormat.format(partPosition.z + headPosition.z + zOffset));
  writeln("stockXmax=10.000");
  writeln("stockXmin=0.000");
  writeln("stockYmax=10.000");
  writeln("stockYmin=0.000");
  writeln("stockZmax=10.000");
  writeln("stockZmin=0.000");
  writeln("fixture_machine_sr=offlineOrigin");
  writeln("fixture_offline_origin_sr=" + getSection(0).workOffset);
  writeln("ToolsIniFile=Tools\\TOOLS.xml");
  writeln("wp_machine_sr=offlineOrigin");
  writeln("wp_offline_origin_sr=" + getSection(0).workOffset);
  writeln("wp_origin_sr=-1");
  writeln("tp_machine_sr=offlineOrigin");
  writeln("tp_offline_origin_sr=10");
  writeln("tp_origin_sr=-1");
  writeln("wp_traslRtcpComp=1");
  writeln("fixture_traslRtcpComp=1");
  writeln("[SimulationInitialStatus]");
  writeln("GWorkPlane=17");
  writeln("QWorkPlane=1");
  writeln("Roto=0");
  writeln("Rtcp=1");
  writeln("InitialToolID=0");
  writeln("toolReference=TIP");
  closeRedirection();

}

var destStockPath = "";
var destPartPath = "";
var destFixturePath = "";

function createVerificationJob() {
  var stockPath;
  if (hasGlobalParameter("autodeskcam:stock-path")) {
    stockPath = getGlobalParameter("autodeskcam:stock-path");
  }

  var partPath;
  if (hasGlobalParameter("autodeskcam:part-path")) {
    partPath = getGlobalParameter("autodeskcam:part-path");
  }

  var fixturePath;
  if (hasGlobalParameter("autodeskcam:fixture-path")) {
    fixturePath = getGlobalParameter("autodeskcam:fixture-path");
  }

  if (FileSystem.isFile(stockPath)) {
    destStockPath = FileSystem.getCombinedPath(folder + "//Stock", "STOCK.stl");
    FileSystem.copyFile(stockPath, destStockPath);
  }

  if (FileSystem.isFile(partPath)) {
    destPartPath = FileSystem.getCombinedPath(folder + "//Target", "PART.stl");
    FileSystem.copyFile(partPath, destPartPath);
  }

  if (FileSystem.isFile(fixturePath)) {
    destFixturePath = FileSystem.getCombinedPath(folder + "//Fixtures", "FIXTURE.stl");
    FileSystem.copyFile(fixturePath, destFixturePath);
  }
}

function createSubfolders() {
  // create subfolder
  folder = FileSystem.getFolderPath(getOutputPath());
  folder = FileSystem.getCombinedPath(folder, programName);

  if (!FileSystem.isFolder(folder)) {
    FileSystem.makeFolder(folder);
  }

  FileSystem.makeFolder(folder + "//Fixtures");
  FileSystem.makeFolder(folder + "//Machine");
  FileSystem.makeFolder(folder + "//Programs");
  FileSystem.makeFolder(folder + "//Stock");
  FileSystem.makeFolder(folder + "//Target");
  FileSystem.makeFolder(folder + "//Tools");
  FileSystem.makeFolder(folder + "//Tools//Cutters");
  FileSystem.makeFolder(folder + "//Tools//Holders");
  FileSystem.makeFolder(folder + "//Tools//Shanks");
}
// ViMill code End
/* eslint-enable */

/**
 * Writes the initial positioning procedure for a section to get to the start position of the toolpath.
 * @param {Vector} position The initial position to move to
 * @param {boolean} isRequired true: Output full positioning, false: Output full positioning in optional state or output simple positioning only
 * @param {String} codes1 Allows to add additional code to the first positioning line
 * @param {String} codes2 Allows to add additional code to the second positioning line (if applicable)
 * @example
  var myVar1 = formatWords("T" + tool.number, currentSection.wcs);
  var myVar2 = getCoolantCodes(tool.coolant);
  writeInitialPositioning(initialPosition, isRequired, myVar1, myVar2);
*/
function writeInitialPositioning(position, isRequired, codes1, codes2) {
  var motionCode = {single:0, multi:0};
  switch (highFeedMapping) {
  case HIGH_FEED_MAP_ANY:
    motionCode = {single:1, multi:1}; // map all rapid traversals to high feed
    break;
  case HIGH_FEED_MAP_MULTI:
    motionCode = {single:0, multi:1}; // map rapid traversal along more than one axis to high feed
    break;
  }
  var feed = (highFeedMapping != HIGH_FEED_NO_MAPPING) ? getFeed(highFeedrate) : "";
  var additionalCodes = [formatWords(codes1), formatWords(codes2)];

  forceModals(gMotionModal);
  writeStartBlocks(isRequired, function() {
    var modalCodes = formatWords(gAbsIncModal.format(90), gPlaneModal.format(17));
    if (machineConfiguration.isHeadConfiguration()) { // head/head head/table kinematics
      var machineABC = currentSection.isMultiAxis() ? defineWorkPlane(currentSection, false) : getWorkPlaneMachineABC(currentSection, false);
      machineConfiguration.setToolLength(getSetting("workPlaneMethod.compensateToolLength", false) ? getBodyLength(currentSection.getTool()) : 0); // define the tool length for head adjustments
      var mode = currentSection.isOptimizedForMachine() ? TCP_XYZ_OPTIMIZED : TCP_XYZ;
      var globalPosition = getGlobalPosition(currentSection.getInitialPosition());
      var machinePosition = machineConfiguration.getOptimizedPosition(globalPosition, machineABC, mode, OPTIMIZE_BOTH, true);
      var prePosition = (currentSection.isOptimizedForMachine() || currentSection.isMultiAxis()) ? position :
        (settings.workPlaneMethod.useTiltedWorkplane && !tcp.isSupportedByMachine) ? machinePosition : globalPosition;

      cancelWorkPlane();
      positionABC(machineABC);
      setTCP(true); // force TCP for prepositioning although the operation may not require it
      writeBlock(modalCodes, gMotionModal.format(motionCode.multi), xOutput.format(prePosition.x), yOutput.format(prePosition.y), feed, additionalCodes[0]);
      machineSimulation({x:prePosition.x, y:prePosition.y});
      writeBlock(modalCodes, gMotionModal.format(motionCode.single), zOutput.format(prePosition.z), feed, additionalCodes[1]);
      machineSimulation({z:prePosition.z});

      if (!currentSection.isMultiAxis()) {
        if (getSetting("workPlaneMethod.useTiltedWorkplane", false)) {
          var saveRetractedState = [state.retractedX, state.retractedY, state.retractedZ];
          state.retractedX = state.retractedY = state.retractedZ = true; // set retracted states to true to avoid retraction
          defineWorkPlane(currentSection, true); // apply workplane for the operation if TWP is supported
          [state.retractedX, state.retractedY, state.retractedZ] = saveRetractedState; // restore retracted states
        }
      }
    } else {
      // multi axis prepositioning with TWP
      if (currentSection.isMultiAxis() && getSetting("workPlaneMethod.prepositionWithTWP", true) && getSetting("workPlaneMethod.useTiltedWorkplane", false) &&
        tcp.isSupportedByOperation && getCurrentDirection().isNonZero()) {
        var W = machineConfiguration.isMultiAxisConfiguration() ? machineConfiguration.getOrientation(getCurrentDirection()) :
          Matrix.getOrientationFromDirection(getCurrentDirection());
        var prePosition = W.getTransposed().multiply(position);
        var angles = settings.workPlaneMethod.eulerConvention != undefined ? W.getEuler2(settings.workPlaneMethod.eulerConvention) : getCurrentDirection();
        setTCP(true); // force TCP command output, used for tool length compensation
        var saveTCPstate = state.tcpIsActive;
        setWorkPlane(angles, true);
        writeBlock(modalCodes, gMotionModal.format(motionCode.multi), xOutput.format(prePosition.x), yOutput.format(prePosition.y), feed, additionalCodes[0]);
        machineSimulation({x:prePosition.x, y:prePosition.y});
        cancelWorkPlane();
        state.tcpIsActive = saveTCPstate; // restore TCP state after positioning using TWP
        writeBlock(additionalCodes[1]); // omit Z-axis output is desired
        forceAny(); // required to output XYZ coordinates in the following line
      } else {
        if (tcp.isSupportedByOperation) {
          setTCP(true);
        }

        if (tcp.isSupportedByOperation && getCurrentDirection().isNonZero()) {
          writeBlock(modalCodes, gMotionModal.format(motionCode.multi), xOutput.format(position.x), yOutput.format(position.y), zOutput.format(position.z), feed, additionalCodes[0]);
          machineSimulation({x:position.x, y:position.y, z:position.z});
        } else {
          writeBlock(modalCodes, gMotionModal.format(motionCode.multi), xOutput.format(position.x), yOutput.format(position.y), feed, additionalCodes[0]);
          machineSimulation({x:position.x, y:position.y});
          writeBlock(gMotionModal.format(motionCode.single), zOutput.format(position.z), additionalCodes[1]);
          machineSimulation(tcp.isSupportedByOperation ? {x:position.x, y:position.y, z:position.z} : {z:position.z});
        }
      }
    }
    forceModals(gMotionModal);
    if (isRequired) {
      additionalCodes = []; // clear additionalCodes buffer
    }
  });

  if (!isRequired) { // simple positioning
    var modalCodes = formatWords(gAbsIncModal.format(90), gPlaneModal.format(17));
    forceXYZ();
    if (!state.retractedZ && xyzFormat.getResultingValue(getCurrentPosition().z) < xyzFormat.getResultingValue(position.z)) {
      writeBlock(modalCodes, gMotionModal.format(motionCode.single), zOutput.format(position.z), feed);
      machineSimulation({z:position.z});
    }
    writeBlock(modalCodes, gMotionModal.format(motionCode.multi), xOutput.format(position.x), yOutput.format(position.y), feed, additionalCodes);
    machineSimulation({x:position.x, y:position.y});
  }
  if (!state.tcpIsActive && isTCPSupportedByOperation(currentSection)) {
    error(localize("Internal error, TCP is required but was not output by the postprocessor."));
  }
}

Matrix.getOrientationFromDirection = function (ijk) {
  var forward = ijk;
  var unitZ = new Vector(0, 0, 1);
  var W;
  if (Math.abs(Vector.dot(forward, unitZ)) < 0.5) {
    var imX = Vector.cross(forward, unitZ).getNormalized();
    W = new Matrix(imX, Vector.cross(forward, imX), forward);
  } else {
    var imX = Vector.cross(new Vector(0, 1, 0), forward).getNormalized();
    W = new Matrix(imX, Vector.cross(forward, imX), forward);
  }
  return W;
};

function onClose() {
  if (getProperty("outputFile") == "Single") {
    fidiaFooter();
  } else {
    var path = FileSystem.getCombinedPath(folder + "//Programs", programName + ".PRC");
    redirectToFile(path);
    writeln(">" + formatComment(localize("Multiple Programs list")));
    for (var i = 0; i < toolpathNames.length; ++i) {
      writeln("IPC => CNC " + toolpathNames[i] + ".nc");
    }
  }
  if (isRedirecting()) {
    closeRedirection();

    writeln("*** Status File - Not for use ***");
    writeln("Files are saved to: " + folder);
    writeln("*********************************");
  }
}

function onTerminate() {
  if (getProperty("exportVimill")) {
    showDialog();
    createVerificationJob();
    createProjectFile();
    createToolDatabaseFile();
  }
}

// >>>>> INCLUDED FROM include_files/commonFunctions.cpi
// internal variables, do not change
var receivedMachineConfiguration;
var tcp = {isSupportedByControl:getSetting("supportsTCP", true), isSupportedByMachine:false, isSupportedByOperation:false};
var state = {
  retractedX              : false, // specifies that the machine has been retracted in X
  retractedY              : false, // specifies that the machine has been retracted in Y
  retractedZ              : false, // specifies that the machine has been retracted in Z
  tcpIsActive             : false, // specifies that TCP is currently active
  twpIsActive             : false, // specifies that TWP is currently active
  lengthCompensationActive: !getSetting("outputToolLengthCompensation", true), // specifies that tool length compensation is active
  mainState               : true // specifies the current context of the state (true = main, false = optional)
};
var validateLengthCompensation = getSetting("outputToolLengthCompensation", true); // disable validation when outputToolLengthCompensation is disabled
var multiAxisFeedrate;
var sequenceNumber;
var optionalSection = false;
var currentWorkOffset;
var forceSpindleSpeed = false;
var operationNeedsSafeStart = false; // used to convert blocks to optional for safeStartAllOperations

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

  // setup usage of useTiltedWorkplane
  settings.workPlaneMethod.useTiltedWorkplane = getProperty("useTiltedWorkplane") != undefined ? getProperty("useTiltedWorkplane") :
    getSetting("workPlaneMethod.useTiltedWorkplane", false);
  settings.workPlaneMethod.useABCPrepositioning = getSetting("workPlaneMethod.useABCPrepositioning", true);

  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // don't need to modify any settings for 3-axis machines
  }

  // identify if any of the rotary axes has TCP enabled
  var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
  tcp.isSupportedByMachine = axes.some(function(axis) {return axis.isEnabled() && axis.isTCPEnabled();}); // true if TCP is enabled on any rotary axis

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

  if (revision >= 50294) {
    activateAutoPolarMode({tolerance:tolerance / 2, optimizeType:OPTIMIZE_AXIS, expandCycles:getSetting("polarCycleExpandMode", EXPAND_ALL)});
  }

  if (machineConfiguration.isHeadConfiguration() && getSetting("workPlaneMethod.compensateToolLength", false)) {
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
      if (section.hasParameter("operation:tool_assemblyGaugeLength")) { // For Fusion
        return section.getParameter("operation:tool_assemblyGaugeLength", tool.bodyLength + tool.holderLength);
      } else { // Legacy products
        return section.getParameter("operation:tool_overallLength", tool.bodyLength + tool.holderLength);
      }
    }
  }
  return tool.bodyLength + tool.holderLength;
}

function getFeed(f) {
  if (getProperty("useG95")) {
    return feedOutput.format(f / spindleSpeed); // use feed value
  }
  if (typeof activeMovements != "undefined" && activeMovements) {
    var feedContext = activeMovements[movement];
    if (feedContext != undefined) {
      if (!feedFormat.areDifferent(feedContext.feed, f)) {
        if (feedContext.id == currentFeedId) {
          return ""; // nothing has changed
        }
        forceFeed();
        currentFeedId = feedContext.id;
        return settings.parametricFeeds.feedOutputVariable + (settings.parametricFeeds.firstFeedParameter + feedContext.id);
      }
    }
    currentFeedId = undefined; // force parametric feed next time
  }
  return feedOutput.format(f); // use feed value
}

function validateCommonParameters() {
  validateToolData();
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (getSection(0).workOffset == 0 && section.workOffset > 0) {
      if (!(typeof wcsDefinitions != "undefined" && wcsDefinitions.useZeroOffset)) {
        error(localize("Using multiple work offsets is not possible if the initial work offset is 0."));
      }
    }
    if (section.isMultiAxis()) {
      if (!section.isOptimizedForMachine() &&
        (!getSetting("workPlaneMethod.useTiltedWorkplane", false) || !getSetting("supportsToolVectorOutput", false))) {
        error(localize("This postprocessor requires a machine configuration for 5-axis simultaneous toolpath."));
      }
      if (machineConfiguration.getMultiAxisFeedrateMode() == FEED_INVERSE_TIME && !getSetting("supportsInverseTimeFeed", true)) {
        error(localize("This postprocessor does not support inverse time feedrates."));
      }
      if (getSetting("supportsToolVectorOutput", false) && !tcp.isSupportedByControl) {
        error(localize("Incompatible postprocessor settings detected." + EOL +
        "Setting 'supportsToolVectorOutput' requires setting 'supportsTCP' to be enabled as well."));
      }
    }
  }
  if (!tcp.isSupportedByControl && tcp.isSupportedByMachine) {
    error(localize("The machine configuration has TCP enabled which is not supported by this postprocessor."));
  }
  if (getProperty("safePositionMethod") == "clearanceHeight") {
    var msg = "-Attention- Property 'Safe Retracts' is set to 'Clearance Height'." + EOL +
      "Ensure the clearance height will clear the part and or fixtures." + EOL +
      "Raise the Z-axis to a safe height before starting the program.";
    warning(msg);
    writeComment(msg);
  }
}

function validateToolData() {
  var _default = 99999;
  var _maximumSpindleRPM = machineConfiguration.getMaximumSpindleSpeed() > 0 ? machineConfiguration.getMaximumSpindleSpeed() :
    settings.maximumSpindleRPM == undefined ? _default : settings.maximumSpindleRPM;
  var _maximumToolNumber = machineConfiguration.isReceived() && machineConfiguration.getNumberOfTools() > 0 ? machineConfiguration.getNumberOfTools() :
    settings.maximumToolNumber == undefined ? _default : settings.maximumToolNumber;
  var _maximumToolLengthOffset = settings.maximumToolLengthOffset == undefined ? _default : settings.maximumToolLengthOffset;
  var _maximumToolDiameterOffset = settings.maximumToolDiameterOffset == undefined ? _default : settings.maximumToolDiameterOffset;

  var header = ["Detected maximum values are out of range.", "Maximum values:"];
  var warnings = {
    toolNumber    : {msg:"Tool number value exceeds the maximum value for tool: " + EOL, max:" Tool number: " + _maximumToolNumber, values:[]},
    lengthOffset  : {msg:"Tool length offset value exceeds the maximum value for tool: " + EOL, max:" Tool length offset: " + _maximumToolLengthOffset, values:[]},
    diameterOffset: {msg:"Tool diameter offset value exceeds the maximum value for tool: " + EOL, max:" Tool diameter offset: " + _maximumToolDiameterOffset, values:[]},
    spindleSpeed  : {msg:"Spindle speed exceeds the maximum value for operation: " + EOL, max:" Spindle speed: " + _maximumSpindleRPM, values:[]}
  };

  var toolIds = [];
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (toolIds.indexOf(section.getTool().getToolId()) === -1) { // loops only through sections which have a different tool ID
      var toolNumber = section.getTool().number;
      var lengthOffset = section.getTool().lengthOffset;
      var diameterOffset = section.getTool().diameterOffset;
      var comment = section.getParameter("operation-comment", "");

      if (toolNumber > _maximumToolNumber && !getProperty("toolAsName")) {
        warnings.toolNumber.values.push(SP + toolNumber + EOL);
      }
      if (lengthOffset > _maximumToolLengthOffset) {
        warnings.lengthOffset.values.push(SP + "Tool " + toolNumber + " (" + comment + "," + " Length offset: " + lengthOffset + ")" + EOL);
      }
      if (diameterOffset > _maximumToolDiameterOffset) {
        warnings.diameterOffset.values.push(SP + "Tool " + toolNumber + " (" + comment + "," + " Diameter offset: " + diameterOffset + ")" + EOL);
      }
      toolIds.push(section.getTool().getToolId());
    }
    // loop through all sections regardless of tool id for idenitfying spindle speeds

    // identify if movement ramp is used in current toolpath, use ramp spindle speed for comparisons
    var ramp = section.getMovements() & ((1 << MOVEMENT_RAMP) | (1 << MOVEMENT_RAMP_ZIG_ZAG) | (1 << MOVEMENT_RAMP_PROFILE) | (1 << MOVEMENT_RAMP_HELIX));
    var _sectionSpindleSpeed = Math.max(section.getTool().spindleRPM, ramp ? section.getTool().rampingSpindleRPM : 0, 0);
    if (_sectionSpindleSpeed > _maximumSpindleRPM) {
      warnings.spindleSpeed.values.push(SP + section.getParameter("operation-comment", "") + " (" + _sectionSpindleSpeed + " RPM" + ")" + EOL);
    }
  }

  // sort lists by tool number
  warnings.toolNumber.values.sort(function(a, b) {return a - b;});
  warnings.lengthOffset.values.sort(function(a, b) {return a.localeCompare(b);});
  warnings.diameterOffset.values.sort(function(a, b) {return a.localeCompare(b);});

  var warningMessages = [];
  for (var key in warnings) {
    if (warnings[key].values != "") {
      header.push(warnings[key].max); // add affected max values to the header
      warningMessages.push(warnings[key].msg + warnings[key].values.join(""));
    }
  }
  if (warningMessages.length != 0) {
    warningMessages.unshift(header.join(EOL) + EOL);
    warning(warningMessages.join(EOL));
  }
}

function forceFeed() {
  currentFeedId = undefined;
  feedOutput.reset();
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

/** Force output of X, Y, Z, A, B, C, and F on next output. */
function forceAny() {
  forceXYZ();
  forceABC();
  forceFeed();
}

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  var prefix = getSetting("sequenceNumberPrefix", "N");
  var suffix = getSetting("writeBlockSuffix", "");
  if ((optionalSection || skipBlocks) && !getSetting("supportsOptionalBlocks", true)) {
    error(localize("Optional blocks are not supported by this post."));
  }
  if (getProperty("showSequenceNumbers") == "true") {
    if (sequenceNumber == undefined || sequenceNumber >= settings.maximumSequenceNumber) {
      sequenceNumber = getProperty("sequenceNumberStart");
    }
    if (optionalSection || skipBlocks) {
      writeWords2("/", prefix + sequenceNumber, text + suffix);
    } else {
      writeWords2(prefix + sequenceNumber, text + suffix);
    }
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    if (optionalSection || skipBlocks) {
      writeWords2("/", text + suffix);
    } else {
      writeWords(text + suffix);
    }
  }
}

validate(settings.comments, "Setting 'comments' is required but not defined.");
function formatComment(text) {
  var prefix = settings.comments.prefix;
  var suffix = settings.comments.suffix;
  var _permittedCommentChars = settings.comments.permittedCommentChars == undefined ? "" : settings.comments.permittedCommentChars;
  switch (settings.comments.outputFormat) {
  case "upperCase":
    text = text.toUpperCase();
    _permittedCommentChars = _permittedCommentChars.toUpperCase();
    break;
  case "lowerCase":
    text = text.toLowerCase();
    _permittedCommentChars = _permittedCommentChars.toLowerCase();
    break;
  case "ignoreCase":
    _permittedCommentChars = _permittedCommentChars.toUpperCase() + _permittedCommentChars.toLowerCase();
    break;
  default:
    error(localize("Unsupported option specified for setting 'comments.outputFormat'."));
  }
  if (_permittedCommentChars != "") {
    text = filterText(String(text), _permittedCommentChars);
  }
  text = String(text).substring(0, settings.comments.maximumLineLength - prefix.length - suffix.length);
  return text != "" ? prefix + text + suffix : "";
}

/**
  Output a comment.
*/
function writeComment(text) {
  if (!text) {
    return;
  }
  var comments = String(text).split(/\r?\n/);
  for (comment in comments) {
    var _comment = formatComment(comments[comment]);
    if (_comment) {
      if (getSetting("comments.showSequenceNumbers", false)) {
        writeBlock(_comment);
      } else {
        writeln(_comment);
      }
    }
  }
}

function onComment(text) {
  writeComment(text);
}

/**
  Writes the specified block - used for tool changes only.
*/
function writeToolBlock() {
  var show = getProperty("showSequenceNumbers");
  setProperty("showSequenceNumbers", (show == "true" || show == "toolChange") ? "true" : "false");
  writeBlock(arguments);
  setProperty("showSequenceNumbers", show);
  machineSimulation({/*x:toPreciseUnit(200, MM), y:toPreciseUnit(200, MM), coordinates:MACHINE,*/ mode:TOOLCHANGE}); // move machineSimulation to a tool change position
}

var skipBlocks = false;
var initialState = JSON.parse(JSON.stringify(state)); // save initial state
var optionalState = JSON.parse(JSON.stringify(state));
var saveCurrentSectionId = undefined;
function writeStartBlocks(isRequired, code) {
  var saveSkipBlocks = skipBlocks;
  var saveMainState = state; // save main state

  if (!isRequired) {
    if (!getProperty("safeStartAllOperations", false)) {
      return; // when safeStartAllOperations is disabled, dont output code and return
    }
    if (saveCurrentSectionId != getCurrentSectionId()) {
      saveCurrentSectionId = getCurrentSectionId();
      forceModals(); // force all modal variables when entering a new section
      optionalState = Object.create(initialState); // reset optionalState to initialState when entering a new section
    }
    skipBlocks = true; // if values are not required, but safeStartAllOperations is enabled - write following blocks as optional
    state = optionalState; // set state to optionalState if skipBlocks is true
    state.mainState = false;
  }
  code(); // writes out the code which is passed to this function as an argument

  state = saveMainState; // restore main state
  skipBlocks = saveSkipBlocks; // restore skipBlocks value
}

var pendingRadiusCompensation = -1;
function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
  if (pendingRadiusCompensation >= 0 && !getSetting("supportsRadiusCompensation", true)) {
    error(localize("Radius compensation mode is not supported."));
    return;
  }
}

function onPassThrough(text) {
  var commands = String(text).split(",");
  for (text in commands) {
    writeBlock(commands[text]);
  }
}

function forceModals() {
  if (arguments.length == 0) { // reset all modal variables listed below
    var modals = [
      "gMotionModal",
      "gPlaneModal",
      "gAbsIncModal",
      "gFeedModeModal",
      "feedOutput"
    ];
    if (operationNeedsSafeStart && (typeof currentSection != "undefined" && currentSection.isMultiAxis())) {
      modals.push("fourthAxisClamp", "fifthAxisClamp", "sixthAxisClamp");
    }
    for (var i = 0; i < modals.length; ++i) {
      if (typeof this[modals[i]] != "undefined") {
        this[modals[i]].reset();
      }
    }
  } else {
    for (var i in arguments) {
      arguments[i].reset(); // only reset the modal variable passed to this function
    }
  }
}

/** Helper function to be able to use a default value for settings which do not exist. */
function getSetting(setting, defaultValue) {
  var result = defaultValue;
  var keys = setting.split(".");
  var obj = settings;
  for (var i in keys) {
    if (obj[keys[i]] != undefined) { // setting does exist
      result = obj[keys[i]];
      if (typeof [keys[i]] === "object") {
        obj = obj[keys[i]];
        continue;
      }
    } else { // setting does not exist, use default value
      if (defaultValue != undefined) {
        result = defaultValue;
      } else {
        error("Setting '" + keys[i] + "' has no default value and/or does not exist.");
        return undefined;
      }
    }
  }
  return result;
}

function getForwardDirection(_section) {
  var forward = undefined;
  var _optimizeType = settings.workPlaneMethod && settings.workPlaneMethod.optimizeType;
  if (_section.isMultiAxis()) {
    forward = _section.workPlane.forward;
  } else if (!getSetting("workPlaneMethod.useTiltedWorkplane", false) && machineConfiguration.isMultiAxisConfiguration()) {
    if (_optimizeType == undefined) {
      var saveRotation = getRotation();
      getWorkPlaneMachineABC(_section, true);
      forward = getRotation().forward;
      setRotation(saveRotation); // reset rotation
    } else {
      var abc = getWorkPlaneMachineABC(_section, false);
      var forceAdjustment = settings.workPlaneMethod.optimizeType == OPTIMIZE_TABLES || settings.workPlaneMethod.optimizeType == OPTIMIZE_BOTH;
      forward = machineConfiguration.getOptimizedDirection(_section.workPlane.forward, abc, false, forceAdjustment);
    }
  } else {
    forward = getRotation().forward;
  }
  return forward;
}

function getRetractParameters() {
  var _arguments = typeof arguments[0] === "object" ? arguments[0].axes : arguments;
  var singleLine = arguments[0].singleLine == undefined ? true : arguments[0].singleLine;
  var words = []; // store all retracted axes in an array
  var retractAxes = new Array(false, false, false);
  var method = getProperty("safePositionMethod", "undefined");
  if (method == "clearanceHeight") {
    if (!is3D()) {
      error(localize("Safe retract option 'Clearance Height' is only supported when all operations are along the setup Z-axis."));
    }
    return undefined;
  }
  validate(settings.retract, "Setting 'retract' is required but not defined.");
  validate(_arguments.length != 0, "No axis specified for getRetractParameters().");
  for (i in _arguments) {
    retractAxes[_arguments[i]] = true;
  }
  if ((retractAxes[0] || retractAxes[1]) && !state.retractedZ) { // retract Z first before moving to X/Y home
    error(localize("Retracting in X/Y is not possible without being retracted in Z."));
    return undefined;
  }
  // special conditions
  if (retractAxes[0] || retractAxes[1]) {
    method = getSetting("retract.methodXY", method);
  }
  if (retractAxes[2]) {
    method = getSetting("retract.methodZ", method);
  }
  // define home positions
  var useZeroValues = (settings.retract.useZeroValues && settings.retract.useZeroValues.indexOf(method) != -1);
  var _xHome = machineConfiguration.hasHomePositionX() && !useZeroValues ? machineConfiguration.getHomePositionX() : toPreciseUnit(0, MM);
  var _yHome = machineConfiguration.hasHomePositionY() && !useZeroValues ? machineConfiguration.getHomePositionY() : toPreciseUnit(0, MM);
  var _zHome = machineConfiguration.getRetractPlane() != 0 && !useZeroValues ? machineConfiguration.getRetractPlane() : toPreciseUnit(0, MM);
  for (var i = 0; i < _arguments.length; ++i) {
    switch (_arguments[i]) {
    case X:
      if (!state.retractedX) {
        words.push("X" + xyzFormat.format(_xHome));
        xOutput.reset();
        state.retractedX = true;
      }
      break;
    case Y:
      if (!state.retractedY) {
        words.push("Y" + xyzFormat.format(_yHome));
        yOutput.reset();
        state.retractedY = true;
      }
      break;
    case Z:
      if (!state.retractedZ) {
        words.push("Z" + xyzFormat.format(_zHome));
        zOutput.reset();
        state.retractedZ = true;
      }
      break;
    default:
      error(localize("Unsupported axis specified for getRetractParameters()."));
      return undefined;
    }
  }
  return {
    method     : method,
    retractAxes: retractAxes,
    words      : words,
    positions  : {
      x: retractAxes[0] ? _xHome : undefined,
      y: retractAxes[1] ? _yHome : undefined,
      z: retractAxes[2] ? _zHome : undefined},
    singleLine: singleLine};
}

/** Returns true when subprogram logic does exist into the post. */
function subprogramsAreSupported() {
  return typeof subprogramState != "undefined";
}

// Start of machine simulation connection move support
var debugSimulation = false; // enable to output debug information for connection move support in the NC program
var TCPON = "TCP ON";
var TCPOFF = "TCP OFF";
var TWPON = "TWP ON";
var TWPOFF = "TWP OFF";
var TOOLCHANGE = "TOOL CHANGE";
var RETRACTTOOLAXIS = "RETRACT TOOLAXIS";
var WORK = "WORK CS";
var MACHINE = "MACHINE CS";
var MIN = "MIN";
var MAX = "MAX";
var WARNING_NON_RANGE = [0, 1, 2];
var isTwpOn;
var isTcpOn;
/**
 * Helper function for connection moves in machine simulation.
 * @param {Object} parameters An object containing the desired options for machine simulation.
 * @note Available properties are:
 * @param {Number} x X axis position, alternatively use MIN or MAX to move to the axis limit
 * @param {Number} y Y axis position, alternatively use MIN or MAX to move to the axis limit
 * @param {Number} z Z axis position, alternatively use MIN or MAX to move to the axis limit
 * @param {Number} a A axis position (in radians)
 * @param {Number} b B axis position (in radians)
 * @param {Number} c C axis position (in radians)
 * @param {Number} feed desired feedrate, automatically set to high/current feedrate if not specified
 * @param {String} mode mode TCPON | TCPOFF | TWPON | TWPOFF | TOOLCHANGE | RETRACTTOOLAXIS
 * @param {String} coordinates WORK | MACHINE - if undefined, work coordinates will be used by default
 * @param {Number} eulerAngles the calculated Euler angles for the workplane
 * @example
  machineSimulation({a:abc.x, b:abc.y, c:abc.z, coordinates:MACHINE});
  machineSimulation({x:toPreciseUnit(200, MM), y:toPreciseUnit(200, MM), coordinates:MACHINE, mode:TOOLCHANGE});
*/
function machineSimulation(parameters) {
  if (revision < 50198 || skipBlocks || (getSimulationStreamPath() == "" && !debugSimulation)) {
    return; // return when post kernel revision is lower than 50198 or when skipBlocks is enabled
  }
  getAxisLimit = function(axis, limit) {
    validate(limit == MIN || limit == MAX, subst(localize("Invalid argument \"%1\" passed to the machineSimulation function."), limit));
    var range = axis.getRange();
    if (range.isNonRange()) {
      var axisLetters = ["X", "Y", "Z"];
      var warningMessage = subst(localize("An attempt was made to move the \"%1\" axis to its MIN/MAX limits during machine simulation, but its range is set to \"unlimited\"." + EOL +
        "A limited range must be set for the \"%1\" axis in the machine definition, or these motions will not be shown in machine simulation."), axisLetters[axis.getCoordinate()]);
      warningOnce(warningMessage, WARNING_NON_RANGE[axis.getCoordinate()]);
      return undefined;
    }
    return limit == MIN ? range.minimum : range.maximum;
  };
  var x = (isNaN(parameters.x) && parameters.x) ? getAxisLimit(machineConfiguration.getAxisX(), parameters.x) : parameters.x;
  var y = (isNaN(parameters.y) && parameters.y) ? getAxisLimit(machineConfiguration.getAxisY(), parameters.y) : parameters.y;
  var z = (isNaN(parameters.z) && parameters.z) ? getAxisLimit(machineConfiguration.getAxisZ(), parameters.z) : parameters.z;
  var rotaryAxesErrorMessage = localize("Invalid argument for rotary axes passed to the machineSimulation function. Only numerical values are supported.");
  var a = (isNaN(parameters.a) && parameters.a) ? error(rotaryAxesErrorMessage) : parameters.a;
  var b = (isNaN(parameters.b) && parameters.b) ? error(rotaryAxesErrorMessage) : parameters.b;
  var c = (isNaN(parameters.c) && parameters.c) ? error(rotaryAxesErrorMessage) : parameters.c;
  var coordinates = parameters.coordinates;
  var eulerAngles = parameters.eulerAngles;
  var feed = parameters.feed;
  if (feed === undefined && typeof gMotionModal !== "undefined") {
    feed = gMotionModal.getCurrent() !== 0;
  }
  var mode = parameters.mode;
  var performToolChange = mode == TOOLCHANGE;
  if (mode !== undefined && ![TCPON, TCPOFF, TWPON, TWPOFF, TOOLCHANGE, RETRACTTOOLAXIS].includes(mode)) {
    error(subst("Mode '%1' is not supported.", mode));
  }

  // mode takes precedence over TCP/TWP states
  var enableTCP = isTcpOn;
  var enableTWP = isTwpOn;
  if (mode === TCPON || mode === TCPOFF) {
    enableTCP = mode === TCPON;
  } else if (mode === TWPON || mode === TWPOFF) {
    enableTWP = mode === TWPON;
  } else {
    enableTCP = typeof state !== "undefined" && state.tcpIsActive;
    enableTWP = typeof state !== "undefined" && state.twpIsActive;
  }
  var disableTCP = !enableTCP;
  var disableTWP = !enableTWP;
  if (disableTWP) {
    simulation.setTWPModeOff();
    isTwpOn = false;
  }
  if (disableTCP) {
    simulation.setTCPModeOff();
    isTcpOn = false;
  }
  if (enableTCP) {
    simulation.setTCPModeOn();
    isTcpOn = true;
  }
  if (enableTWP) {
    if (settings.workPlaneMethod.eulerConvention == undefined) {
      simulation.setTWPModeAlignToCurrentPose();
    } else if (eulerAngles) {
      simulation.setTWPModeByEulerAngles(settings.workPlaneMethod.eulerConvention, eulerAngles.x, eulerAngles.y, eulerAngles.z);
    }
    isTwpOn = true;
  }
  if (mode == RETRACTTOOLAXIS) {
    simulation.retractAlongToolAxisToLimit();
  }

  if (debugSimulation) {
    writeln("  DEBUG" + JSON.stringify(parameters));
    writeln("  DEBUG" + JSON.stringify({isTwpOn:isTwpOn, isTcpOn:isTcpOn, feed:feed}));
  }

  if (x !== undefined || y !== undefined || z !== undefined || a !== undefined || b !== undefined || c !== undefined) {
    if (x !== undefined) {simulation.setTargetX(x);}
    if (y !== undefined) {simulation.setTargetY(y);}
    if (z !== undefined) {simulation.setTargetZ(z);}
    if (a !== undefined) {simulation.setTargetA(a);}
    if (b !== undefined) {simulation.setTargetB(b);}
    if (c !== undefined) {simulation.setTargetC(c);}

    if (feed != undefined && feed) {
      simulation.setMotionToLinear();
      simulation.setFeedrate(typeof feed == "number" ? feed : feedOutput.getCurrent() == 0 ? highFeedrate : feedOutput.getCurrent());
    } else {
      simulation.setMotionToRapid();
    }

    if (coordinates != undefined && coordinates == MACHINE) {
      simulation.moveToTargetInMachineCoords();
    } else {
      simulation.moveToTargetInWorkCoords();
    }
  }
  if (performToolChange) {
    simulation.performToolChangeCycle();
    simulation.moveToTargetInMachineCoords();
  }
}
// <<<<< INCLUDED FROM include_files/commonFunctions.cpi
// >>>>> INCLUDED FROM include_files/defineMachine.cpi
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
// <<<<< INCLUDED FROM include_files/defineMachine.cpi
// >>>>> INCLUDED FROM include_files/defineWorkPlane.cpi
validate(settings.workPlaneMethod, "Setting 'workPlaneMethod' is required but not defined.");
function defineWorkPlane(_section, _setWorkPlane) {
  var abc = new Vector(0, 0, 0);
  if (settings.workPlaneMethod.forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) {
    if (isPolarModeActive()) {
      abc = getCurrentDirection();
    } else if (_section.isMultiAxis()) {
      forceWorkPlane();
      cancelTransformation();
      abc = _section.isOptimizedForMachine() ? _section.getInitialToolAxisABC() : _section.getGlobalInitialToolAxis();
    } else if (settings.workPlaneMethod.useTiltedWorkplane && settings.workPlaneMethod.eulerConvention != undefined) {
      if (settings.workPlaneMethod.eulerCalculationMethod == "machine" && machineConfiguration.isMultiAxisConfiguration()) {
        abc = machineConfiguration.getOrientation(getWorkPlaneMachineABC(_section, true)).getEuler2(settings.workPlaneMethod.eulerConvention);
      } else {
        abc = _section.workPlane.getEuler2(settings.workPlaneMethod.eulerConvention);
      }
    } else {
      abc = getWorkPlaneMachineABC(_section, true);
    }

    if (_setWorkPlane) {
      if (_section.isMultiAxis() || isPolarModeActive()) { // 4-5x simultaneous operations
        cancelWorkPlane();
        if (_section.isOptimizedForMachine()) {
          positionABC(abc, true);
        } else {
          setCurrentDirection(abc);
        }
      } else { // 3x and/or 3+2x operations
        setWorkPlane(abc);
      }
    }
  } else {
    var remaining = _section.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported."));
      return abc;
    }
    setRotation(remaining);
  }
  tcp.isSupportedByOperation = isTCPSupportedByOperation(_section);
  return abc;
}

function isTCPSupportedByOperation(_section) {
  var _tcp = _section.getOptimizedTCPMode() == OPTIMIZE_NONE;
  if (!_section.isMultiAxis() && (settings.workPlaneMethod.useTiltedWorkplane ||
    (machineConfiguration.isMultiAxisConfiguration() && settings.workPlaneMethod.optimizeType != undefined ?
      getWorkPlaneMachineABC(_section, false).isZero() : isSameDirection(machineConfiguration.getSpindleAxis(), getForwardDirection(_section))) ||
    settings.workPlaneMethod.optimizeType == OPTIMIZE_HEADS ||
    settings.workPlaneMethod.optimizeType == OPTIMIZE_TABLES ||
    settings.workPlaneMethod.optimizeType == OPTIMIZE_BOTH)) {
    _tcp = false;
  }
  return _tcp;
}
// <<<<< INCLUDED FROM include_files/defineWorkPlane.cpi
// >>>>> INCLUDED FROM include_files/getWorkPlaneMachineABC.cpi
validate(settings.machineAngles, "Setting 'machineAngles' is required but not defined.");
function getWorkPlaneMachineABC(_section, rotate) {
  var currentABC = isFirstSection() ? new Vector(0, 0, 0) : getCurrentABC();
  var abc = _section.getABCByPreference(machineConfiguration, _section.workPlane, currentABC, settings.machineAngles.controllingAxis, settings.machineAngles.type, settings.machineAngles.options);
  if (!isSameDirection(machineConfiguration.getDirection(abc), _section.workPlane.forward)) {
    error(localize("Orientation not supported."));
  }
  if (rotate) {
    if (settings.workPlaneMethod.optimizeType == undefined || settings.workPlaneMethod.useTiltedWorkplane) { // legacy
      var useTCP = false;
      var R = machineConfiguration.getRemainingOrientation(abc, _section.workPlane);
      setRotation(useTCP ? _section.workPlane : R);
    } else {
      if (!_section.isOptimizedForMachine()) {
        machineConfiguration.setToolLength(getSetting("workPlaneMethod.compensateToolLength", false) ? getBodyLength(_section.getTool()) : 0); // define the tool length for head adjustments
        _section.optimize3DPositionsByMachine(machineConfiguration, abc, settings.workPlaneMethod.optimizeType);
      }
    }
  }
  return abc;
}
// <<<<< INCLUDED FROM include_files/getWorkPlaneMachineABC.cpi
// >>>>> INCLUDED FROM include_files/positionABC.cpi
function positionABC(abc, force) {
  if (!machineConfiguration.isMultiAxisConfiguration()) {
    error("Function 'positionABC' can only be used with multi-axis machine configurations.");
  }
  if (typeof unwindABC == "function") {
    unwindABC(abc);
  }
  if (force) {
    forceABC();
  }
  var a = aOutput.format(abc.x);
  var b = bOutput.format(abc.y);
  var c = cOutput.format(abc.z);
  if (a || b || c) {
    writeRetract(Z);
    if (getSetting("retract.homeXY.onIndexing", false)) {
      writeRetract(settings.retract.homeXY.onIndexing);
    }
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), a, b, c);
    setCurrentABC(abc); // required for machine simulation
    machineSimulation({a:abc.x, b:abc.y, c:abc.z, coordinates:MACHINE});
  }
}
// <<<<< INCLUDED FROM include_files/positionABC.cpi
// >>>>> INCLUDED FROM include_files/writeWCS.cpi
function writeWCS(section, wcsIsRequired) {
  if (section.workOffset != currentWorkOffset) {
    if (getSetting("workPlaneMethod.cancelTiltFirst", false) && wcsIsRequired) {
      cancelWorkPlane();
    }
    if (typeof forceWorkPlane == "function" && wcsIsRequired) {
      forceWorkPlane();
    }
    writeStartBlocks(wcsIsRequired, function () {
      writeBlock(section.wcs);
    });
    currentWorkOffset = section.workOffset;
  }
}
// <<<<< INCLUDED FROM include_files/writeWCS.cpi
// >>>>> INCLUDED FROM include_files/writeToolCall.cpi
function writeToolCall(tool, insertToolCall) {
  if (!isFirstSection()) {
    writeStartBlocks(!getProperty("safeStartAllOperations") && insertToolCall, function () {
      writeRetract(Z); // write optional Z retract before tool change if safeStartAllOperations is enabled
    });
  }
  writeStartBlocks(insertToolCall, function () {
    writeRetract(Z);
    if (getSetting("retract.homeXY.onToolChange", false)) {
      writeRetract(settings.retract.homeXY.onToolChange);
    }
    if (!isFirstSection() && insertToolCall) {
      if (typeof forceWorkPlane == "function") {
        forceWorkPlane();
      }
      onCommand(COMMAND_COOLANT_OFF); // turn off coolant on tool change
      if (typeof disableLengthCompensation == "function") {
        disableLengthCompensation(false);
      }
    }

    if (tool.manualToolChange) {
      onCommand(COMMAND_STOP);
      writeComment("MANUAL TOOL CHANGE TO T" + toolFormat.format(tool.number));
    } else {
      if (!isFirstSection() && getProperty("optionalStop") && insertToolCall) {
        onCommand(COMMAND_OPTIONAL_STOP);
      }
      onCommand(COMMAND_LOAD_TOOL);
    }
  });
  if (typeof forceModals == "function" && (insertToolCall || getProperty("safeStartAllOperations"))) {
    forceModals();
  }
}
// <<<<< INCLUDED FROM include_files/writeToolCall.cpi
// >>>>> INCLUDED FROM include_files/startSpindle.cpi
function startSpindle(tool, insertToolCall) {
  if (tool.type != TOOL_PROBE) {
    var spindleSpeedIsRequired = insertToolCall || forceSpindleSpeed || isFirstSection() ||
      rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent()) ||
      (tool.clockwise != getPreviousSection().getTool().clockwise);

    writeStartBlocks(spindleSpeedIsRequired, function () {
      if (spindleSpeedIsRequired || operationNeedsSafeStart) {
        onCommand(COMMAND_START_SPINDLE);
      }
    });
  }
}
// <<<<< INCLUDED FROM include_files/startSpindle.cpi
// >>>>> INCLUDED FROM include_files/coolant.cpi
var currentCoolantMode = COOLANT_OFF;
var coolantOff = undefined;
var isOptionalCoolant = false;
var forceCoolant = false;

function setCoolant(coolant) {
  var coolantCodes = getCoolantCodes(coolant);
  if (Array.isArray(coolantCodes)) {
    writeStartBlocks(!isOptionalCoolant, function () {
      if (settings.coolant.singleLineCoolant) {
        writeBlock(coolantCodes.join(getWordSeparator()));
      } else {
        for (var c in coolantCodes) {
          writeBlock(coolantCodes[c]);
        }
      }
    });
    return undefined;
  }
  return coolantCodes;
}

function getCoolantCodes(coolant, format) {
  if (!getProperty("useCoolant", true)) {
    return undefined; // coolant output is disabled by property if it exists
  }
  isOptionalCoolant = false;
  if (typeof operationNeedsSafeStart == "undefined") {
    operationNeedsSafeStart = false;
  }
  var multipleCoolantBlocks = new Array(); // create a formatted array to be passed into the outputted line
  var coolants = settings.coolant.coolants;
  if (!coolants) {
    error(localize("Coolants have not been defined."));
  }
  if (tool.type && tool.type == TOOL_PROBE) { // avoid coolant output for probing
    coolant = COOLANT_OFF;
  }
  if (coolant == currentCoolantMode) {
    if (operationNeedsSafeStart && coolant != COOLANT_OFF) {
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
    if (format == undefined || format) {
      return multipleCoolantBlocks; // return the single formatted coolant value
    } else {
      return m; // return unformatted coolant value
    }
  }
  return undefined;
}
// <<<<< INCLUDED FROM include_files/coolant.cpi
// >>>>> INCLUDED FROM include_files/writeProgramHeader.cpi
properties.writeMachine = {
  title      : "Write machine",
  description: "Output the machine settings in the header of the program.",
  group      : "formats",
  type       : "boolean",
  value      : true,
  scope      : "post"
};
properties.writeTools = {
  title      : "Write tool list",
  description: "Output a tool list in the header of the program.",
  group      : "formats",
  type       : "boolean",
  value      : true,
  scope      : "post"
};
function writeProgramHeader() {
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
      writeComment("  " + localize("description") + ": " + mDescription);
    }
  }

  // dump tool information
  if (getProperty("writeTools")) {
    if (false) { // set to true to use the post kernel version of the tool list
      writeToolTable(TOOL_NUMBER_COL);
    } else {
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
          var comment = (getProperty("toolAsName") ? "\"" + tool.description.toUpperCase() + "\"" : "T" + toolFormat.format(tool.number)) + " " +
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
  }
}
// <<<<< INCLUDED FROM include_files/writeProgramHeader.cpi

// >>>>> INCLUDED FROM include_files/onRapid_fanuc.cpi
function onRapid(_x, _y, _z) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      error(localize("Radius compensation mode cannot be changed at rapid traversal."));
      return;
    }
    writeBlock(gMotionModal.format(0), x, y, z);
    forceFeed();
  }
}
// <<<<< INCLUDED FROM include_files/onRapid_fanuc.cpi
// >>>>> INCLUDED FROM include_files/onRapid5D_fanuc.cpi
function onRapid5D(_x, _y, _z, _a, _b, _c) {
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
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : toolVectorOutputI.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : toolVectorOutputJ.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : toolVectorOutputK.format(_c);

  if (x || y || z || a || b || c) {
    writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
    forceFeed();
  }
}
// <<<<< INCLUDED FROM include_files/onRapid5D_fanuc.cpi
// >>>>> INCLUDED FROM include_files/rewind.cpi
function onMoveToSafeRetractPosition() {
  if (!getSetting("allowCancelTCPBeforeRetracting", false)) {
    writeRetract(Z);
  }
  if (state.tcpIsActive) { // cancel TCP so that tool doesn't follow rotaries
    if (typeof setTCP == "function") {
      setTCP(false);
    } else {
      disableLengthCompensation(false);
    }
  }
  writeRetract(Z);
  if (getSetting("retract.homeXY.onIndexing", false)) {
    writeRetract(settings.retract.homeXY.onIndexing);
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
  onRapid5D(_x, _y, _z, _a, _b, _c);
  setCurrentABC(new Vector(_a, _b, _c));
  machineSimulation({a:_a, b:_b, c:_c, coordinates:MACHINE});
  xOutput.enable();
  yOutput.enable();
  zOutput.enable();
  forceXYZ();
}

/** Return from safe position after indexing rotaries. */
function onReturnFromSafeRetractPosition(_x, _y, _z) {
  if (!machineConfiguration.isHeadConfiguration()) {
    writeInitialPositioning(new Vector(_x, _y, _z), true);
    if (highFeedMapping != HIGH_FEED_NO_MAPPING) {
      onLinear5D(_x, _y, _z, getCurrentDirection().x, getCurrentDirection().y, getCurrentDirection().z, highFeedrate);
    } else {
      onRapid5D(_x, _y, _z, getCurrentDirection().x, getCurrentDirection().y, getCurrentDirection().z);
    }
    machineSimulation({x:_x, y:_y, z:_z, a:getCurrentDirection().x, b:getCurrentDirection().y, c:getCurrentDirection().z});
  } else {
    if (tcp.isSupportedByOperation) {
      if (typeof setTCP == "function") {
        setTCP(true);
      } else {
        writeBlock(getOffsetCode(), hFormat.format(tool.lengthOffset));
      }
    }
    forceXYZ();
    xOutput.reset();
    yOutput.reset();
    zOutput.disable();
    if (highFeedMapping != HIGH_FEED_NO_MAPPING) {
      onLinear(_x, _y, _z, highFeedrate);
    } else {
      onRapid(_x, _y, _z);
    }
    machineSimulation({x:_x, y:_y});
    zOutput.enable();
    invokeOnRapid(_x, _y, _z);
  }
}
// <<<<< INCLUDED FROM include_files/rewind.cpi
