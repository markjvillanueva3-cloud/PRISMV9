/**
  Copyright (C) 2012-2022 by Autodesk, Inc.
  All rights reserved.

  ShopSabre Plasma (WinCNC) post processor configuration.

  $Revision: 44083 80e88add7592ec6de8eb5f0e0516e95cfe8572bd $
  $Date: 2023-08-14 12:47:05 $

  FORKID {68E11907-EB8E-4CE8-A5A8-D6CFD380C8D8}
*/

description = "ShopSabre Plasma";
vendor = "ShopSabre CNC";
vendorUrl = "http://www.shopsabre.com";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "Generic post for ShopSabre plasma cutter with WinCNC control. For use with ShopMaster PRO series.\n" +
  "Drilling is supported with use of the CNC Plasma Drill Feature by enabling the 'Got drill head' property.  G56 is used for drilling operations.\n" +
  "Etching is supported with the use of the Vibratory Plate Marking Scribe feature by enabling the 'Got marking scribe' property and using the Etch cutting mode. G55 is used for etching operations\n.";

extension = "tap";
setCodePage("ascii");

capabilities = CAPABILITY_JET | CAPABILITY_MILLING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
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
    value      : false,
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
    value      : 1,
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
  useFeeds: {
    title      : "Use feedrates",
    description: "Output the cutting feedrate at the start of an operation.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  gotDrillHead: {
    title      : "Got drill head",
    description: "Enable if your machine has the CNC Plasma Drill Feature.  Work offset G56 will be used for drilling operations.",
    group      : "configuration",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  gotScribe: {
    title      : "Got marking scribe",
    description: "Enable if your machine has the Vibratory Plate Marking Scribe.  Use the Etch Cutting Mode with the Marking Scribe.  Work offset G55 will be used for etching operations.",
    group      : "configuration",
    type       : "boolean",
    value      : false,
    scope      : "post"
  }
};

var gFormat = createFormat({prefix:"G", decimals:0});
var mFormat = createFormat({prefix:"M", decimals:1});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-1000
var feedFormat = createFormat({decimals:(unit == MM ? 1 : 2)});

var xOutput = createVariable({prefix:"X"}, xyzFormat);
var yOutput = createVariable({prefix:"Y"}, xyzFormat);
var zOutput = createVariable({prefix:"Z"}, xyzFormat);
var aOutput = createVariable({prefix:"A"}, abcFormat);
var bOutput = createVariable({prefix:"B"}, abcFormat);
var cOutput = createVariable({prefix:"C"}, abcFormat);
var feedOutput = createVariable({prefix:"F"}, feedFormat);

// circular output
var iOutput = createReferenceVariable({prefix:"I", force:true}, xyzFormat);
var jOutput = createReferenceVariable({prefix:"J", force:true}, xyzFormat);
var kOutput = createReferenceVariable({prefix:"K", force:true}, xyzFormat);

var gMotionModal = createModal({}, gFormat); // modal group 1 // G0-G3, ...
var gAbsIncModal = createModal({}, gFormat); // modal group 3 // G90-91
var gUnitModal = createModal({}, gFormat); // modal group 6 // G20-22
var gWCSModal = createModal({}, gFormat); // modal group // G54-G56

var mPlasmaModal = createModal({}, mFormat); // plasma on/off

// collected state
var sequenceNumber;
var gotDrillOperation = false;
var gotScribeOperation = false;
var gotJetOperation = false;
var cuttingMode = "JET";

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
  return "[" + String(text).replace(/[[\]]/g, "") + "]";
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

function onOpen() {

  // check for supported machining operations
  for (var i = 0; i < getNumberOfSections(); ++i) {
    section = getSection(i);
    if (isDrillingCycle(section, false)) {
      gotDrillOperation = true;
    } else if (section.strategy == "jet2d" && section.jetMode == JET_MODE_ETCHING) {
      gotScribeOperation = true;
    } else if (section.strategy == "jet2d") {
      gotJetOperation = true;
    }
  }

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
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
      writeComment("  " + localize("description") + ": "  + description);
    }
  }

  // absolute coordinates and feed per min
  writeBlock(gAbsIncModal.format(90));
  writeBlock(gMotionModal.format(53));

  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(20));
    break;
  case MM:
    writeBlock(gUnitModal.format(22)); // G21 is cm
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
}

function onParameter(name, value) {
}

var currentWorkPlaneABC = undefined;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
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
    return new Vector();
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
  if (tcp) {
    setRotation(W); // TCP mode
  } else {
    var O = machineConfiguration.getOrientation(abc);
    var R = machineConfiguration.getRemainingOrientation(abc, W);
    setRotation(R);
  }

  return abc;
}

function onSection() {

  writeln("");

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      writeComment(comment);
    }
  }

  if (!isDrillingCycle()) {
    switch (tool.type) {
    case TOOL_PLASMA_CUTTER:
      break;
    default:
      error(localize("The CNC does not support the required tool/process. Only plasma cutting is supported."));
      return;
    }
  }

  var previousCuttingMode = cuttingMode;
  if (isDrillingCycle(false)) {
    if (!getProperty("gotDrillHead")) {
      error(localize("You must enable the Drill head to use drilling operations."));
      return;
    }
    cuttingMode = "DRILL";
  } else if (currentSection.strategy == "jet2d") {
    switch (currentSection.jetMode) {
    case JET_MODE_THROUGH:
      cuttingMode = "JET";
      break;
    case JET_MODE_ETCHING:
      if (getProperty("gotScribe")) {
        cuttingMode = "ETCH";
      } else {
        error(localize("Etch cutting mode is not supported without enabling the Scribe Marker."));
        return;
      }
      break;
    case JET_MODE_VAPORIZE:
      error(localize("Vaporize cutting mode is not supported."));
      break;
    default:
      error(localize("Unsupported cutting mode."));
      return;
    }
  } else {
    error(localize("The CNC does not support the required tool/process. Only plasma cutting is supported."));
    return;
  }

  var wcsCode = undefined;
  if (cuttingMode == "DRILL") {
    writeBlock(mPlasmaModal.format(66));
    wcsCode = 56;
    zOutput.enable();
  } else if (cuttingMode == "ETCH") {
    writeBlock(mPlasmaModal.format(66));
    wcsCode = 55;
    zOutput.enable();
  } else {
    writeBlock(mPlasmaModal.format(65));
    if (gotDrillOperation || gotScribeOperation) {
      wcsCode = 54;
    }
    zOutput.disable();
  }
  if (wcsCode && (wcsCode != gWCSModal.getCurrent() || gWCSModal.getCurrent() != 54)) {
    if (!isFirstSection()) {
      writeBlock(gFormat.format(53), "Z");
    }
    writeBlock(gWCSModal.format(wcsCode));
  }

  if (getProperty("useFeeds")) {
    if (cuttingMode != previousCuttingMode) {
      feedOutput.reset();
    }
    if (isDrillingCycle(false)) {
      if (getParameter("operation:tool_feedPlunge", 0) != 0) {
        var f = feedOutput.format(getParameter("operation:tool_feedPlunge"));
        if (f) {
          writeBlock(f + "Z");
        }
      }
    } else {
      if (getParameter("operation:tool_feedCutting", 0) != 0) {
        var f = feedOutput.format(getParameter("operation:tool_feedCutting"));
        if (f) {
          writeBlock(f + "XY");
        }
      }
    }
  }

  { // pure 3D
    var remaining = currentSection.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported."));
      return;
    }
    setRotation(remaining);
  }

  if (cuttingMode == "DRILL") {
    writeBlock(mFormat.format(3.2));
  } else if (cuttingMode == "ETCH") {
    writeBlock(mFormat.format(3));
  }

  forceAny();

  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
}

function onDwell(seconds) {
  if (seconds > 99999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  seconds = clamp(0.001, seconds, 99999.999);
  writeBlock(gFormat.format(4), "X" + secFormat.format(seconds));
}

function onCycle() {
}

function getCommonCycle(x, y, z, r) {
}

function onCyclePoint(x, y, z) {
  expandCyclePoint(x, y, z);
}

function onCycleEnd() {
}

var pendingRadiusCompensation = -1;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onPower(power) {
  if (cuttingMode == "JET") {
    writeBlock(mFormat.format(power ? 61 : 62));
  }
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
    writeBlock(gMotionModal.format(0), x, y, z);
  }
}

function onLinear(_x, _y, _z, feed) {
  // at least one axis is required
  if (pendingRadiusCompensation >= 0) {
    // ensure that we end at desired position when compensation is turned off
    xOutput.reset();
    yOutput.reset();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      var offset = getParameter("operation:tool_kerfWidth", 0) / 2;
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        writeBlock(gFormat.format(41), "O" + xyzFormat.format(offset));
        writeBlock(gMotionModal.format(1), x, y, z);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        writeBlock(gFormat.format(42), "O" + xyzFormat.format(offset));
        writeBlock(gMotionModal.format(1), x, y, z);
        break;
      default:
        writeBlock(gFormat.format(40));
        writeBlock(gMotionModal.format(1), x, y, z);
      }
    } else {
      writeBlock(gMotionModal.format(1), x, y, z);
    }
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  error(localize("The CNC does not support 5-axis simultaneous toolpath."));
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  error(localize("The CNC does not support 5-axis simultaneous toolpath."));
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
      gMotionModal.reset();
      xOutput.reset();
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0));
      break;
    default:
      linearize(tolerance);
    }
  } else {
    switch (getCircularPlane()) {
    case PLANE_XY:
      gMotionModal.reset();
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0));
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
  if (cuttingMode == "DRILL") {
    writeBlock(mFormat.format(5.2));
  } else if (cuttingMode == "ETCH") {
    writeBlock(mFormat.format(5));
  }
  forceAny();
}

function onClose() {
  if (gotDrillOperation || gotScribeOperation) {
    writeBlock(gFormat.format(53), "Z");
  }
  writeln("");
  writeBlock(mPlasmaModal.format(66));
}

// Start of Kernel functions
function setProperty(property, value) {
  properties[property].current = value;
}
/**
  Determines whether the section is a drilling operation.
  It takes an optional section and the optional checkBoringCycles.
  If section is omitted, assumes it is currentSection.
  checkBoringCycles = true (boring cycles are treated as drilling cycles),
  false (boring cycles are not treated as drilling cycles)
*/
function isDrillingCycle() {
  const start = (arguments.length > 0 && typeof arguments[0] == "object") ? 1 : 0;
  const section = (arguments.length > 0 && typeof arguments[0] == "object") ? arguments[0] :
    (typeof currentSection == "undefined" ? undefined : currentSection);
  if (typeof section == "undefined") {
    return undefined;
  }
  const checkBoringCycles = (arguments.length > start && typeof arguments[start] == "boolean") ? arguments[start] : true;
  return section.strategy == "drill" && !isMillingCycle(section, !checkBoringCycles);
}

/**
  Determines whether the section is a milling cycle operation.
  It takes an optional section and the optional checkBoringCycles.
  If section is omitted, assumes it is currentSection.
  checkBoringCycles = true (boring cycles are treated as milling cycles),
  false (boring cycles are not treated as milling cycles)
*/
function isMillingCycle() {
  const start = (arguments.length > 0 && typeof arguments[0] == "object") ? 1 : 0;
  const section = (arguments.length > 0 && typeof arguments[0] == "object") ? arguments[0] :
    (typeof currentSection == "undefined" ? undefined : currentSection);
  if (typeof section == "undefined") {
    return undefined;
  }
  const checkBoringCycles = (arguments.length > start && typeof arguments[start] == "boolean") ? arguments[start] : false;
  return (section.strategy == "drill") &&
    ((section.getParameter("diameter", 0) != 0) ||
    (checkBoringCycles && (section.getParameter("shift", 0) != 0)));
}
