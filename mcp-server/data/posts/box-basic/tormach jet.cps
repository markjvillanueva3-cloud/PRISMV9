/**
  Copyright (C) 2012-2025 by Autodesk, Inc.
  All rights reserved.

  Tormach Jet post processor configuration.

  $Revision: 44191 10f6400eaf1c75a27c852ee82b57479e7a9134c0 $
  $Date: 2025-08-21 13:23:15 $

  FORKID {A2A0FA84-AE48-4859-859C-7BB063ADC6A3}
*/

description = "Tormach Jet";
vendor = "Tormach";
vendorUrl = "http://www.tormach.com";
legal = "Copyright (C) 2012-2025 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45843;

longDescription = "Generic post for Tormach jet with PathPilot.  You can perform standalone piercing by programming a Drilling operation.";

extension = "nc";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_JET;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.01, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = false;
allowedCircularPlanes = 1 << PLANE_XY; // only XY

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
  showSequenceNumbers: {
    title      : "Use sequence numbers",
    description: "Use sequence numbers for each block of outputted code.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
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
  separateWordsWithSpace: {
    title      : "Separate words with space",
    description: "Adds spaces between words if 'yes' is selected.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useRetracts: {
    title      : "Use retracts",
    description: "Output retracts, otherwise only output part contours for importing into a third-party jet application.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  allowHeadSwitches: {
    title      : "Allow head switches",
    description: "Enable to output code to allow heads to be manually switched for piercing and cutting.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  enableAutoFS: {
    title      : "Enable AutoFS",
    description: "Instead of outputting feed rates, use M200 AutoFS command for PathPilot.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    scope      : "post"
  }
};

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G", range:[54, 59]},
    {name:"Extended", format:"G59.", range:[1, 3]},
    {name:"Extra", format:"G54.1 P", range:[10, 500]}
  ]
};

var gFormat = createFormat({prefix:"G", decimals:0});
var mFormat = createFormat({prefix:"M", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var pFormat = createFormat({prefix:"P", decimals:3});

var toolFormat = createFormat({decimals:0});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
var feedFormat = createFormat({decimals:(unit == MM ? 1 : 2)});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-1000

var xOutput = createVariable({prefix:"X"}, xyzFormat);
var yOutput = createVariable({prefix:"Y"}, xyzFormat);
var feedOutput = createVariable({prefix:"F"}, feedFormat);

// circular output
var iOutput = createReferenceVariable({prefix:"I"}, xyzFormat);
var jOutput = createReferenceVariable({prefix:"J"}, xyzFormat);

var gMotionModal = createModal({}, gFormat); // modal group 1 // G0-G3, ...
var gAbsIncModal = createModal({}, gFormat); // modal group 3 // G90-91
var gUnitModal = createModal({}, gFormat); // modal group 6 // G20-22

// collected state
var sequenceNumber;
var currentWorkOffset;
var split = false;

/**
  Writes the specified block.
*/
function writeBlock() {
  if (getProperty("showSequenceNumbers")) {
    writeWords2("N" + sequenceNumber, arguments);
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    writeWords(arguments);
  }
}

function formatComment(text) {
  return "(" + String(text).replace(/[()]/g, "") + ")";
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

function onOpen() {

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }

  if (getProperty("enableAutoFS")) {
    feedOutput.disable();
  }
  sequenceNumber = getProperty("sequenceNumberStart");

  if (programName) {
    writeComment(programName);
  }
  if (programComment) {
    writeComment(programComment);
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
      writeComment("  " + localize("description") + ": " + description);
    }
  }

  if (hasGlobalParameter("material")) {
    writeComment("MATERIAL = " + getGlobalParameter("material"));
  }

  if (hasGlobalParameter("material-hardness")) {
    writeComment("MATERIAL HARDNESS = " + getGlobalParameter("material-hardness"));
  }

  // stock - workpiece
  var workpiece = getWorkpiece();
  var delta = Vector.diff(workpiece.upper, workpiece.lower);
  if (delta.isNonZero()) {
    writeComment("THICKNESS = " + xyzFormat.format(workpiece.upper.z - workpiece.lower.z));
  }

  writeComment("Imperial units are used for setting modals.");
  writeBlock(gUnitModal.format(20));

  // absolute coordinates and feed per min
  writeBlock(gAbsIncModal.format(90));
  writeBlock(gFormat.format(64), pFormat.format(0.005));

  if (!getProperty("enableAutoFS")) {
    writeComment("Using default cutting params since AutoFS is disabled in Fusion.");
    writeComment("Modify these values as needed:");
    writeBlock(mFormat.format(207), pFormat.format(0.15));
    writeBlock(mFormat.format(208), pFormat.format(0.06));
    writeBlock(mFormat.format(209), pFormat.format(0.1));
    writeBlock(mFormat.format(210), pFormat.format(127));
    writeBlock(mFormat.format(211), pFormat.format(45));
  }

  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(20));
    break;
  case MM:
    writeBlock(gUnitModal.format(21));
    break;
  }
}

function onComment(message) {
  writeComment(message);
}

/** Force output of X, Y, and Z. */
function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
}

/** Force output of X, Y, Z, A, B, C, and F on next output. */
function forceAny() {
  forceXYZ();
  feedOutput.reset();
}

function onSection() {
  var insertToolCall = isToolChangeNeeded("number");

  writeln("");

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      writeComment(comment);
    }
  }

  if (insertToolCall) {
    var lengthOffset = tool.lengthOffset;
    if (lengthOffset > 256) {
      error(localize("Length offset out of range."));
      return;
    }

    writeBlock("T" + toolFormat.format(tool.number), gFormat.format(43), hFormat.format(lengthOffset), mFormat.format(6));

    if (tool.comment) {
      writeComment(tool.comment);
    }

    switch (tool.type) {
    case TOOL_WATER_JET:
      writeComment("Waterjet cutting");
      break;
    case TOOL_LASER_CUTTER:
      writeComment("Laser cutting");
      break;
    case TOOL_PLASMA_CUTTER:
      writeComment("Plasma cutting");
      break;
    case TOOL_DRILL:
      if (!isDrillingCycle()) {
        error(localize("Drills are only valid for drilling/piercing operation."));
      }
      break;
    /*
    case TOOL_MARKER:
      writeComment("Marker");
      break;
    */
    default:
      error(localize("The CNC does not support the required tool."));
      return;
    }
    writeln("");
    if (isDrillingCycle()) {
      writeComment("Jet diameter = " + xyzFormat.format(tool.diameter));
      writeComment("PIERCING");
    } else {
      writeComment("Jet diameter = " + xyzFormat.format(tool.jetDiameter));
      writeComment("Cut height = " + xyzFormat.format(tool.cutHeight));
      writeln("");

      switch (currentSection.jetMode) {
      case JET_MODE_THROUGH:
        writeComment("THROUGH CUTTING");
        break;
      case JET_MODE_ETCHING:
        writeComment("ETCH CUTTING");
        break;
      case JET_MODE_VAPORIZE:
        writeComment("VAPORIZE CUTTING");
        break;
      default:
        error(localize("Unsupported cutting mode."));
        return;
      }
      writeComment("QUALITY = " + currentSection.quality);
    }

    if (tool.comment) {
      writeComment(tool.comment);
    }
    writeln("");
  }

  { // pure 3D
    var remaining = currentSection.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported."));
      return;
    }
    setRotation(remaining);
  }

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }
  if (currentSection.workOffset != currentWorkOffset) {
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  forceAny();

  split = false;
  if (getProperty("useRetracts")) {
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    gMotionModal.reset();
    writeBlock(
      gAbsIncModal.format(90),
      gMotionModal.format(0),
      xOutput.format(initialPosition.x),
      yOutput.format(initialPosition.y)
    );
  } else {
    split = true;
  }
}

function onDwell(seconds) {
  if (seconds > 99999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  seconds = clamp(0.001, seconds, 99999.999);
  writeBlock(gFormat.format(4), "X" + secFormat.format(seconds));
}

function onCycle() {
  if (getProperty("enableAutoFS")) {
    writeComment("AutoFS");
    writeBlock(mFormat.format(200));
  }
}

function getCommonCycle(x, y, z, r) {
}

function onCyclePoint(x, y, z) {
  switch (cycleType) {
  case "drilling":
    writeBlock(gMotionModal.format(0), xOutput.format(x), yOutput.format(y));
    writeBlock(gFormat.format(15), formatComment("Probe"));
    writeBlock(gFormat.format(16), formatComment("Pierce"));
    writeBlock(mFormat.format(205), formatComment("Disable Jet"));
    break;
  default:
    error("Only drilling/piercing cycles are supported.");
  }
}

function onCycleEnd() {
  writeBlock(gFormat.format(30), formatComment("Move home"));
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

var shapeArea = 0;
var shapePerimeter = 0;
var shapeSide = "inner";
var cuttingSequence = "";

function onParameter(name, value) {
  if ((name == "action") && (value == "pierce")) {
    if (getProperty("enableAutoFS")) {
      writeComment("AutoFS");
      writeBlock(mFormat.format(200));
    }
    writeComment("Probe");
    writeBlock(gFormat.format(15));
    writeComment("Pierce");
    writeBlock(gFormat.format(16));
  } else if (name == "shapeArea") {
    shapeArea = value;
    writeComment("SHAPE AREA = " + xyzFormat.format(shapeArea));
  } else if (name == "shapePerimeter") {
    shapePerimeter = value;
    writeComment("SHAPE PERIMETER = " + xyzFormat.format(shapePerimeter));
  } else if (name == "shapeSide") {
    shapeSide = value;
    writeComment("SHAPE SIDE = " + value);
  } else if (name == "beginSequence") {
    switchHeads(value);
  }
}

function switchHeads(head) {
  if ((head == "piercing" && cuttingSequence != "piercing") || (head == "cutting" && cuttingSequence == "piercing")) {
    if (getProperty("allowHeadSwitches")) {
      writeln("");
      writeComment(subst("Switch to %1 head before continuing"), head);
      onCommand(COMMAND_STOP);
      writeln("");
    }
  }
  cuttingSequence = head;
}

var deviceOn = false;
function setDeviceMode(enable) {
  if (enable != deviceOn) {
    deviceOn = enable;
    if (enable) {
      // pass
    } else {
      writeComment("Disable Jet");
      writeBlock(mFormat.format(205));
      writeBlock(gFormat.format(30));

    }
  }
}

function onPower(power) {
  setDeviceMode(power);
}

function onRapid(_x, _y, _z) {

  if (!getProperty("useRetracts") && ((movement == MOVEMENT_RAPID) || (movement == MOVEMENT_HIGH_FEED))) {
    doSplit();
    return;
  }
  if (split) {
    split = false;
    var start = getCurrentPosition();
    onRapid(start.x, start.y, start.z);
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);

  if (x || y) {
    if (pendingRadiusCompensation >= 0) {
      error(localize("Radius compensation mode cannot be changed at rapid traversal."));
      return;
    }
    writeBlock(gMotionModal.format(0), x, y);
    feedOutput.reset();
  }
}

function onLinear(_x, _y, _z, feed) {
  if (isDrillingCycle()) {
    return;
  }

  if (!getProperty("useRetracts") && ((movement == MOVEMENT_RAPID) || (movement == MOVEMENT_HIGH_FEED))) {
    doSplit();
    return;
  }
  if (split) {
    resumeFromSplit(feed);
  }

  // at least one axis is required
  if (pendingRadiusCompensation >= 0) {
    // ensure that we end at desired position when compensation is turned off
    xOutput.reset();
    yOutput.reset();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);

  var f = feedOutput.format(feed);
  if (x || y) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gFormat.format(41));
        writeBlock(gMotionModal.format(1), x, y, f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gFormat.format(42));
        writeBlock(gMotionModal.format(1), x, y, f);
        break;
      default:
        writeBlock(gFormat.format(40));
        writeBlock(gMotionModal.format(1), x, y, f);
      }
    } else {
      writeBlock(gMotionModal.format(1), x, y, f);
    }
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      feedOutput.reset(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  error(localize("The CNC does not support 5-axis simultaneous toolpath."));
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  error(localize("The CNC does not support 5-axis simultaneous toolpath."));
}

function doSplit() {
  if (!split) {
    split = true;
    gMotionModal.reset();
    forceAny();
  }
}

function resumeFromSplit(feed) {
  if (split) {
    split = false;
    var start = getCurrentPosition();
    var _pendingRadiusCompensation = pendingRadiusCompensation;
    pendingRadiusCompensation = -1;
    onLinear(start.x, start.y, start.z, feed);
    pendingRadiusCompensation = _pendingRadiusCompensation;
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }
  if (split) {
    resumeFromSplit(feed);
  }

  var start = getCurrentPosition();
  if (isFullCircle()) {
    if (isHelical()) {
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else {
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  }
}

var mapCommand = {
  COMMAND_STOP         : 0,
  COMMAND_OPTIONAL_STOP: 1
};

function onCommand(command) {
  switch (command) {
  case COMMAND_POWER_ON:
    return;
  case COMMAND_POWER_OFF:
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
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
  setDeviceMode(false);
  forceAny();
}

function onClose() {
  writeln("");
  writeBlock(mFormat.format(30));
}
