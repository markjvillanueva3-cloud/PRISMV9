/**
  Copyright (C) 2012-2022 by Autodesk, Inc.
  All rights reserved.

  Fanuc LS post processor configuration.

  $Revision: 43887 fb064a68a13c1a9ba6bc91902ec6d9d43d6087a7 $
  $Date: 2022-07-14 15:09:04 $

  FORKID {2A6BE688-1B3D-47B6-85F0-392C1630401D}
*/

///////////////////////////////////////////////////////////////////////////////
//     CUSTOM NC COMMANDS - search for 'Machine specific output, modify as needed'
//
//     endEffectorCommandOn   - Modify this variable to define the commands to turn ON the end effector, if needed
//     endEffectorCommandOff  - Modify this variable to define the commands to turn OFF the end effector, if needed
//
//     spindleOn()            - Modify this function to define the commands to turn ON the spindle, if needed
//     spindleOff()           - Modify this function to define the commands to turn OFF the spindle, if needed
//
///////////////////////////////////////////////////////////////////////////////

description = "Fanuc Robotics";
vendor = "Fanuc";
vendorUrl = "https://www.fanuc.eu/uk/en/robots";
legal = "Copyright (C) 2012-2022 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "Generic Fanuc Robotics LS post. Please refer to the User Guide for programming specification and sample. Always validate with Roboguide before loading any toolpath on your Robot.";

extension = "txt"; // status file extension
var fileExtension = "LS"; // program file extension
programNameIsInteger = false;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_ADDITIVE;
tolerance = spatial(0.1, MM);

highFeedrate = (unit == IN) ? 100 : 1000;
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowSpiralMoves = true;
allowedCircularPlanes = 0;

properties = {
  endEffectorBehavior: {
    title      : "End-effector state",
    description: "Set the end-effector state (including behavior during flat toolpath transitions).",
    group      : "process",
    type       : "enum",
    values     : [
      {title:"OFF", id:"Off"},
      {title:"ON + links ON", id:"On"},
      {title:"ON + links OFF", id:"OnOff"}
    ],
    value: "Off",
    scope: "post"
  },
  robotHeadAngle: {
    title      : "Robot head angle",
    description: "Robot head angle around tool axis in degrees",
    group      : "process",
    type       : "number",
    value      : 30,
    scope      : "post"
  },
  robotConfiguration: {
    title      : "Robot configuration (CONFIG)",
    description: "Robot arm configuration (CONFIG)",
    group      : "configuration",
    type       : "string",
    value      : "F U T, 0, 0, 0",
    scope      : "post"
  },
  robotJointSpeed: {
    title      : "Robot joint speed (%)",
    description: "Robot joint move speed (%)",
    group      : "configuration",
    type       : "integer",
    value      : 20,
    scope      : "post"
  },
  flipToolFrame: {
    title      : "Flip Tool Frame",
    description: "Flip the tool frame (Z- is along the tool axis).",
    group      : "parameters",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  robotAccuracy: {
    title      : "Robot accuracy (CNT)",
    description: "Robot accuracy (CNT)",
    group      : "parameters",
    type       : "string",
    value      : "CNT50",
    scope      : "post"
  },
  robotToolData: {
    title      : "Robot tool data",
    description: "Fanuc tool data used for FFF toolpath",
    group      : "fff",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  robotBaseData: {
    title      : "Robot base data",
    description: "Fanuc base data used for FFF toolpath",
    group      : "fff",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  nameLimitation: {
    title      : "Toolpath name max 30 chars",
    description: "Check if each toolpath name has max 30 characters.",
    group      : "general",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSubfolder: {
    title      : "Use subfolder",
    description: "Specifies if files should be saved in subfolder or not.",
    group      : "general",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  writeDateAndTime: {
    title      : "Write date and time",
    description: "Output date and time in the header of the code.",
    group      : "general",
    type       : "boolean",
    value      : true,
    scope      : "post"
  }
};
groupDefinitions = {
  process      : {title:"Process", description:"Process post settings", order:0},
  configuration: {title:"Configuration", description:"General robot configuration", order:1},
  parameters   : {title:"Parameters", description:"Robot parameters", order:2},
  fff          : {title:"FFF Settings", description:"FFF Settings", collapsed:true, order:3},
  general      : {title:"General", description:"Other post options", collapsed:true, order:4}
};

var singleLineCoolant = false; // specifies to output multiple coolant codes in one line rather than in separate lines
// samples:
// {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
// {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
// {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
var coolants = [
  {id:COOLANT_FLOOD},
  {id:COOLANT_MIST},
  {id:COOLANT_THROUGH_TOOL},
  {id:COOLANT_AIR},
  {id:COOLANT_AIR_THROUGH_TOOL},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL},
  {id:COOLANT_OFF}
];

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, trim:false});
var abcFormat = createFormat({decimals:3, forceDecimal:true, trim:false});
var feedFormat = createFormat({decimals:(unit == MM ? 0 : 0), forceDecimal:false, scale:1.0 / 60.0}); // mm/min -> mm/s
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var dateFormat = createFormat({decimals:0, width:2, zeropad:true});
var lineFormat = createFormat({decimals:0, zeropad:true});

var xOutput = createVariable({prefix:"", force:true}, xyzFormat);
var yOutput = createVariable({prefix:"", force:true}, xyzFormat);
var zOutput = createVariable({onchange:function () {retracted = false;}, prefix:"", force:true}, xyzFormat);
var r1Output = createVariable({prefix:"", force:true}, abcFormat);
var r2Output = createVariable({prefix:"", force:true}, abcFormat);
var r3Output = createVariable({prefix:"", force:true}, abcFormat);
var lineOutput = createVariable({prefix:"  ", force:true}, lineFormat);
var pointOutput = createVariable({prefix:"", force:true}, lineFormat);
var dateOutput = createVariable({prefix:"", force:true}, dateFormat);
var feedOutput = createVariable({prefix:"", force:true}, feedFormat);
var sOutput = createVariable({prefix:"", force:true}, rpmFormat);

var retracted = false; // specifies that the tool has been retracted to the safe plane
var firstLin = true; // set during onSection to reset first toolpath point
var pendingRadiusCompensation = -1;
var toolNumber = 0;
var actualWorkOffset = 0;
var endEffectorState = 0; // initial state of the end effector (0 =off)

var subfolderPath;
var lineCounter = 1; // counter used for toolpath lines
var lineCounterMain = 1; // counter used for lines counter in main program
var pointCounter = 0; // counter used for toolpath points
var lines = new Array(); // array used to write toolpath lines in the footer
var coords = new Array(); // array used to write toolpath lines in the footer
var toolpathNames = new Array();
var permittedCommentChars = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-+";
/**
  Writes the specified block.
*/
function writeBlock() {
  writeWords(arguments);
}

/**
  Formats a comment.
*/
function formatComment(text) {
  return lineOutput.format(lineCounter++) + ":  ! " + filterText(String(text), permittedCommentChars).replace(/[()]/g, "");
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

var FIELD = "                    ";

/** Make sure fields are aligned. */
function fld(text) {
  var length = text.length;
  if (length > 12) {
    return text;
  }
  return FIELD.substr(0, 12 - length) + text;
}

function onOpen() {
  // Machine requires output only in MM
  unit = MM;

  // create subfolder if requested
  folder = FileSystem.getFolderPath(getOutputPath());
  if (getProperty("useSubfolder")) {
    folder = FileSystem.getCombinedPath(folder, programName);
    if (!FileSystem.isFolder(folder)) {
      FileSystem.makeFolder(folder);
    }
  }
  programFilename = FileSystem.replaceExtension(FileSystem.getFilename(getOutputPath()), fileExtension);

  redirectToBuffer();
  writeBlock("/PROG " + FileSystem.replaceExtension(FileSystem.getFilename(getOutputPath().toUpperCase()), ""));
  writeHeader();
  writeBlock("FILE_NAME       = ;");
  writeBlock("VERSION         = 0;");
  writeBlock("LINE_COUNT      = 0;");
  writeBlock("MEMORY_SIZE     = 0;");
  writeBlock("PROTECT         = READ_WRITE;");
  writeBlock("TCD:  STACK_SIZE        = 0,");
  writeBlock("      TASK_PRIORITY     = 50,");
  writeBlock("      TIME_SLICE        = 0,");
  writeBlock("      BUSY_LAMP_OFF     = 0,");
  writeBlock("      ABORT_REQUEST     = 0,");
  writeBlock("      PAUSE_REQUEST     = 0;");
  writeBlock("DEFAULT_GROUP   = 1,*,*,*,*;");
  writeBlock("CONTROL_CODE    = 00000000 00000000;");
  writeBlock("/MN");
  mainProgram = getRedirectionBuffer();
  closeRedirection();

  if (FileSystem.getFilename(getOutputPath()).split(".").pop() == fileExtension) {
    error(subst(localize("The status file extension cannot be '.%1'."), fileExtension));
    return;
  }
  writeln("*** Status File - Not for use ***");
  writeln("Files are saved to: " + folder);
  writeln("Main program: " + programFilename);
}

function onComment(message) {
  // writeComment(message);
  lines.push(message);
}

/**
  Writes the right robot move (first point joint, others as linear)
*/
function writeRobotMove(x, y, z, i, j, k, feed) {
  if (firstLin) {
    writeJoint(x, y, z, i, j, k, getProperty("robotHeadAngle"), feed);
    spindleOn();
    firstLin = false;
  } else {
    writeLinear(x, y, z, i, j, k, getProperty("robotHeadAngle"), feed);
  }
}

/**
  Joint move
*/
function writeJoint(x, y, z, i, j, k, angle, feed) {
  lines.push("J P[" + pointOutput.format(++pointCounter) + "] " + getProperty("robotJointSpeed") + "% " + getProperty("robotAccuracy") + "  ;");
  writePoint(x, y, z, i, j, k, angle, feed);
}

/**
  Linear move
*/
function writeLinear(x, y, z, i, j, k, angle, feed) {
  lines.push("L P[" + pointOutput.format(++pointCounter) + "] " + feedOutput.format(feed) + "mm/sec " + getProperty("robotAccuracy") + "  ;");
  writePoint(x, y, z, i, j, k, angle, feed);
}

/**
  Write coord
*/
function writePoint(x, y, z, i, j, k, angle, feed) {
  var vz = new Vector();
  vz.x = i;
  vz.y = j;
  vz.z = k;
  var ea = getFanucEulerAngleFromVectorAndRotationAngle(vz, angle);

  coords.push("P[" + pointOutput.format(pointCounter) + "]{");
  coords.push("  GP1:");
  coords.push("  UF : " + actualWorkOffset + ", UT : " + toolFormat.format(toolNumber) + ",     CONFIG : '" + getProperty("robotConfiguration") + "',");

  var line1 = "  X =" + fld(xOutput.format(x)) + "  mm,  Y =" + fld(yOutput.format(y)) + "  mm,  Z =" + fld(zOutput.format(z)) + "  mm,";
  var line2 = "  W =" + fld(r1Output.format(ea.x)) + " deg,  P =" + fld(r2Output.format(ea.y)) + " deg,  R =" + fld(r3Output.format(ea.z)) + " deg";

  coords.push(line1);
  coords.push(line2);
  coords.push("};");
}

var operationCounter = 0;
function onSection() {
  redirectToBuffer(); // main program is stored in buffer and written out in onClose
  firstLin = true;
  cancelRotation();
  if (!currentSection.isMultiAxis())  {
    setRotation(currentSection.workPlane);
  }

  if (currentSection.workOffset == 0 && !isFFFOperation(currentSection)) {
    error(localize("Robot user frame has not been specified. Define it as WCS value, editing current Setup."));
  } else {
    actualWorkOffset = isFFFOperation(currentSection) ? getProperty("robotBaseData") : currentSection.workOffset;
  }

  var insertToolCall = isFirstSection() || currentSection.getForceToolChange && currentSection.getForceToolChange() ||
  (tool.number != getPreviousSection().getTool().number);

  var counter = 1;
  var opName;
  if (isFFFOperation(currentSection)) {
    opName = (programName + "_" + counter);
    counter = counter++;
  } else {
    if (hasParameter("operation-comment")) {
      opName = getParameter("operation-comment");
    } else if (hasParameter("notes")) {
      opName = getParameter("notes");
    } else {
      opName = ("unnamed_" + counter);
      counter = counter++;
    }
  }

  opName = opName.replace(/[^a-zA-Z0-9_+]/g, "_");

  // write toolpath name in Array to check for duplicated names
  if (toolpathNames.length > 0 && toolpathNames.indexOf(opName) > -1) {
    ++operationCounter;
    opName += "_" + operationCounter;
  }
  toolpathNames.push(opName);

  if (getProperty("nameLimitation")) {
    if (opName.length > 30) {
      error(subst(localize("Toolpath Name '%1' is longer than 30 characters. Please modify it to less than 30 characters."), opName));
    }
  }

  var path = FileSystem.getCombinedPath(folder, opName + ".LS");

  // write toolpath name in main program
  if (insertToolCall) {
    toolNumber = isFFFOperation(currentSection) ? getProperty("robotToolData") : tool.number;
    writeBlock(lineOutput.format(lineCounterMain++) + ":  ! CALL TOOL_CHANGE (" + toolFormat.format(toolNumber) + ")");
  }

  writeBlock(lineOutput.format(lineCounterMain) + ":  CALL " + opName + " ;");
  mainProgram += getRedirectionBuffer();
  closeRedirection();

  // start writing in subprogram
  redirectToFile(path);
  writeBlock("/PROG  " + opName);
}

function isFFFOperation(section) {
  return section.getType() == TYPE_ADDITIVE && section.getTool().type == TOOL_MARKER;
}

function onMovement(movement) {
  // We can use a simple milling (subtractive) toolpaths as additive :
  // ignore all the onMovement stuff for FFF since the end effector switch
  // is handled in the onRapid and onLinearExtrude functions

  if (!isFFFOperation(currentSection)) {
    switch (movement) {
    case MOVEMENT_CUTTING:
    case MOVEMENT_FINISH_CUTTING:
      lines.push("  ! Cutting Move Starts");
      setAdditiveProcessOn();
      break;
    case MOVEMENT_PLUNGE:
      lines.push("  ! Plunge Move Starts");
      break;
    case MOVEMENT_LEAD_IN:
      lines.push("  ! Lead In Move Starts");
      break;
    case MOVEMENT_LEAD_OUT:
      lines.push("  ! Lead Out Move Starts");
      setAdditiveProcessOff();
      break;
    case MOVEMENT_LINK_TRANSITION:
      lines.push("  ! Link Move Starts");
      if (getProperty("endEffectorBehavior") == "OnOff") {
        setAdditiveProcessOff();
      }
      break;
    case MOVEMENT_BRIDGING:
      lines.push("  ! Bridging Move Starts");
      break;
    case MOVEMENT_LINK_DIRECT:
      lines.push("  ! Cutting Move Ends");
      break;
    case MOVEMENT_RAPID:
      lines.push("  ! Rapid Move Starts");
      setAdditiveProcessOff();
      break;
    case MOVEMENT_DEPOSITING:
      lines.push("  ! Depositing Move Starts");
      setAdditiveProcessOn();
      break;
    }
  }
}

/**
  Machine specific output, modify as needed
  An end-effector is the device at the end of a robotic arm.
  It may consist in different gripper/tool/etc. and the activation/deactivation code depends on the end-effector type.
  These codes are to be customized by integrator and/or end-user.
*/

var endEffectorCommandOn = "==> END EFFECTOR ON: DEFINE YOUR CODE HERE IN THE POST"; // specifies the command to turn on the end effector
var endEffectorCommandOff = "==> END EFFECTOR OFF: DEFINE YOUR CODE HERE IN THE POST";  // specifies the command to turn off the end effector

function setAdditiveProcessOn() {
  if (getProperty("endEffectorBehavior") != "Off" && endEffectorState == 0) {
    lines.push(endEffectorCommandOn);
    endEffectorState = 1;
  }
}

function setAdditiveProcessOff() {
  if (getProperty("endEffectorBehavior") != "Off" && endEffectorState == 1) {
    lines.push(endEffectorCommandOff);
    endEffectorState = 0;
  }
}

function onDwell(seconds) {
}

/**
  Machine specific output, modify as needed
*/
function spindleOn() {
  if (isMilling() && !isDepositionOperation()) {
    lines.push("  ! R[1]=" + sOutput.format(spindleSpeed) + "  ;");
    lines.push("CALL SPINDLE_ON" + "  ;");
  }
}
function spindleOff() {
  if (isMilling() && !isDepositionOperation()) {
    writeBlock(lineOutput.format(lineCounter++) + ":  ! R[1]=0  ;");
    writeBlock(lineOutput.format(lineCounter++) + ":CALL SPINDLE_OFF  ;");
  }
}

function onSpindleSpeed(spindleSpeed) {
  spindleOn();
}

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onRapid(_x, _y, _z) {
  if (isFFFOperation(currentSection)) {
    setAdditiveProcessOff();
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, highFeedrate);
}

function onLinear(_x, _y, _z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode is not supported by robot."));
    return;
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, feed);
}

function onLinearExtrude(_x, _y, _z, feed) {
  if (isFFFOperation(currentSection)) {
    setAdditiveProcessOn();
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, feed);
}

function onRapid5D(_x, _y, _z, _i, _j, _k) {
  writeRobotMove(_x, _y, _z,  _i, _j, _k, highFeedrate);
}

function onLinear5D(_x, _y, _z, _i, _j, _k, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode is not supported by robot."));
    return;
  }
  writeRobotMove(_x, _y, _z, _i, _j, _k, feed);
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  linearize(tolerance);
}

var currentCoolantMode = COOLANT_OFF;
var coolantOff = undefined;

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
  if (coolant == currentCoolantMode) {
    return undefined; // coolant is already active
  }
  if ((coolant != COOLANT_OFF) && (currentCoolantMode != COOLANT_OFF) && (coolantOff != undefined)) {
    if (Array.isArray(coolantOff)) {
      for (var i in coolantOff) {
        multipleCoolantBlocks.push(coolantOff[i]);
      }
    } else {
      multipleCoolantBlocks.push(coolantOff);
    }
  }

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

var deviceOn = false;

function setDeviceMode(enable) {
  if (enable != deviceOn) {
    deviceOn = enable;
    if (enable) {
      writeComment("TURN ON CUTTING HERE");
    } else {
      writeComment("TURN OFF CUTTING HERE");
    }
  }
}

function onPower(power) {
  setDeviceMode(power);
}

function onCommand(command) {
  switch (command) {
  case COMMAND_STOP:
    return;
  case COMMAND_OPTIONAL_STOP:
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
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    return;
  case COMMAND_BREAK_CONTROL:
    return;
  case COMMAND_TOOL_MEASURE:
    return;
  case COMMAND_POWER_ON:
    return;
  case COMMAND_POWER_OFF:
    return;
  default:
    onUnsupportedCommand(command);
  }
}

function onSectionEnd() {
  writeHeader();
  writeBlock("FILE_NAME       = ;");
  writeBlock("VERSION         = 0;");
  writeBlock("LINE_COUNT      = 0;");
  writeBlock("MEMORY_SIZE     = 0;");
  writeBlock("PROTECT         = READ_WRITE;");
  writeBlock("TCD:  STACK_SIZE        = 0,");
  writeBlock("      TASK_PRIORITY     = 50,");
  writeBlock("      TIME_SLICE        = 0,");
  writeBlock("      BUSY_LAMP_OFF     = 0,");
  writeBlock("      ABORT_REQUEST     = 0,");
  writeBlock("      PAUSE_REQUEST     = 0;");
  writeBlock("DEFAULT_GROUP   = 1,*,*,*,*;");
  writeBlock("CONTROL_CODE    = 00000000 00000000;");
  writeBlock("/MN");

  if (hasGlobalParameter("generated-by")) {
    var value = getGlobalParameter("generated-by");
    writeComment("Generated by AUTODESK " + value + ";");
  }

  writeComment("");
  writeBlock(lineOutput.format(lineCounter++) + ":  UFRAME_NUM=" + actualWorkOffset + "  ;");
  writeBlock(lineOutput.format(lineCounter++) + ":  UTOOL_NUM=" + toolFormat.format(toolNumber) + "  ;");
  writeComment("");

  for (var i = 0; i < lines.length; ++i) {
    var lineOut = lines[i];
    writeBlock(lineOutput.format(lineCounter++) + ":" + lineOut);
  }
  spindleOff();
  writeComment("");
  writeBlock("/POS");

  for (var i = 0; i < coords.length; ++i) {
    var coordOut = coords[i];
    writeBlock(coordOut);
  }
  writeBlock("/END");
  closeRedirection();

  lineCounter = 1; // reset toolpath line counter
  pointCounter = 0; // reset toolpath point counter
  coords = new Array();
  lines = new Array();
}

/**
  converts a vectorZ and a rotation angle around it to Fanuc Euler angles
*/
function getFanucEulerAngleFromVectorAndRotationAngle(vectorZ, angleInDegrees) {
  // X is rotated about standard XY-plane, not provided Z-axis
  var vectorX = Matrix.getZRotation(toRad(angleInDegrees)).transposed.multiply(new Vector(1, 0, 0));

  // X and Z form a non-orthogonal matrix, so cannot use standard matrix calculations
  var yAxis = Vector.cross(vectorZ, vectorX);
  var xAxis = Vector.cross(yAxis, vectorZ);
  var yAxis = Vector.cross(vectorZ, xAxis);

  m = new Matrix(xAxis, yAxis, vectorZ).transposed;

  if (getProperty("flipToolFrame")) {
    m = Matrix.getAxisRotation(new Vector(0, 1, 0), Math.PI).multiply(m);
  }

  ea = new Vector();
  var ea = m.transposed.getEuler2(EULER_XYZ_S).toDeg();

  return ea;
}

function writeDate() {
  var date = new Date();
  writeBlock("CREATE          = DATE " + date.getFullYear().toString() + "-" + dateOutput.format(date.getMonth() + 1) + "-" + dateOutput.format(date.getDate()) + "  TIME " + dateOutput.format(date.getHours()) + ":" + dateOutput.format(date.getMinutes()) + ":" + dateOutput.format(date.getSeconds()) + ";");
  writeBlock("MODIFIED        = DATE " + date.getFullYear().toString() + "-" + dateOutput.format(date.getMonth() + 1) + "-" + dateOutput.format(date.getDate()) + "  TIME " + dateOutput.format(date.getHours()) + ":" + dateOutput.format(date.getMinutes()) + ":" + dateOutput.format(date.getSeconds()) + ";");
}

function writeHeader() {
  writeBlock("/ATTR");
  writeBlock("OWNER           = " + getGlobalParameter("username", "Autodesk") + ";");
  writeBlock("COMMENT         = \"" + (programComment ? programComment : "Autodesk") + "\";");
  writeBlock("PROG_SIZE       = 0;");
  if (getProperty("writeDateAndTime")) {
    writeDate();
  }
}

function onClose() {
  // write out main program
  redirectToFile(FileSystem.getCombinedPath(folder, programFilename));
  write(mainProgram);
  writeBlock("/END");
  closeRedirection();
}

function setProperty(property, value) {
  properties[property].current = value;
}
