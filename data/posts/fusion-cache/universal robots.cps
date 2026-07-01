/**
  Copyright (C) 2012-2021 by Autodesk, Inc.
  All rights reserved.

  Universal Robots post processor configuration.

  $Revision: 44106 42162b6c37d8849644d694c053a201a331ea3c40 $
  $Date: 2023-10-25 14:30:07 $

  FORKID {2FB73EBD-5EDE-46B5-A0E0-2283F46776BD}
*/

description = "Universal Robots";
vendor = "Universal Robots";
vendorUrl = "https://www.universal-robots.com/";
legal = "Copyright (C) 2012-2021 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "Generic post for Universal Robots CB-Series (URScript) and e-Series (G-code and URScript). Please refer to the User Guide for programming specification and sample. Always validate in Simulation mode before running any toolpath on your robot.";

// extension: Gcode needs .nc and Script needs .script. It will be managed in onTerminate function
extension = ".txt";
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
allowHelicalMoves = false;
allowedCircularPlanes = (1 << PLANE_XY);

// user-defined properties
properties = {
  fileFormat: {
    title      : "Output Format",
    description: "NC program Output file format",
    group      : "output",
    type       : "enum",
    value      : "GCode",
    values     : [
      {id:"GCode", title:"GCode"},
      {id:"URScript", title:"URScript"}
    ],
    scope: "post"
  },
  outputFile: {
    title      : "Output File",
    description: "NC program Output",
    group      : "output",
    type       : "enum",
    value      : "Single",
    values     : [
      {id:"Single", title:"Single"},
      {id:"Multiple", title:"Multiple"}
    ],
    scope: "post"
  },
  useSubfolder: {
    title      : "Use subfolder",
    description: "Specifies if files should be saved in subfolder or not.",
    group      : "output",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useCircular: {
    title      : "Use circular moves",
    description: "Specifies if files should contain circular moves (G02/G03 commands).",
    group      : "gcode",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  nameLimitation: {
    title      : "Toolpath name length limitation",
    description: "Check if each toolpath name has max 30 characters.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  addFileExtension: {
    title      : "NC files extension",
    description: "Specifies if nc file extension is needed.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    visible    : false,
    scope      : "post"
  },
  robotStartJ1: {
    title      : "Base (deg)",
    description: "UR robot joint value used for the initial position point before movel start (deg).",
    group      : "joint",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotStartJ2: {
    title      : "Shoulder (deg)",
    description: "UR robot joint value used for the initial position point before movel start (deg).",
    group      : "joint",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotStartJ3: {
    title      : "Elbow (deg)",
    description: "UR robot joint value used for the initial position point before movel start (deg).",
    group      : "joint",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotStartJ4: {
    title      : "Wrist 1 (deg)",
    description: "UR robot joint value used for the initial position point before movel start (deg).",
    group      : "joint",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotStartJ5: {
    title      : "Wrist 2 (deg)",
    description: "UR robot joint value used for the initial position point before movel start (deg).",
    group      : "joint",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotStartJ6: {
    title      : "Wrist 3 (deg)",
    description: "UR robot joint value used for the initial position point before movel start (deg).",
    group      : "joint",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotHeadAngle: {
    title      : "Robot head angle (deg)",
    description: "UR robot head angle around tool axis (deg)",
    group      : "parameters",
    type       : "number",
    value      : 30,
    scope      : "post"
  },
  robotSmoothing: {
    title      : "Robot radius smoothing (mm)",
    description: "UR robot path radius smoothing value (r=<value>m)",
    group      : "script",
    type       : "number",
    value      : 0.005,
    scope      : "post"
  },
  robotJointSpeed: {
    title      : "Robot movej tool speed (mm/s)",
    description: "UR robot tool speed during joint move (v=<value>m/s)",
    group      : "script",
    type       : "number",
    value      : 200,
    scope      : "post"
  },
  robotAcceleration: {
    title      : "Robot acceleration (mm/s^2)",
    description: "UR robot acceleration (a=<value>m/s^2)",
    group      : "script",
    type       : "number",
    value      : 1000,
    scope      : "post"
  },
  writeDateAndTime: {
    title      : "Write date and time",
    description: "Output date and time in the header of the code.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    visible    : false,
    scope      : "post"
  },
  writeCamVersion: {
    title      : "Write CAM version",
    description: "Output Autodesk CAM version in the header of the code.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    visible    : false,
    scope      : "post"
  },
  partOriginX: {
    title      : "PCS X (mm)",
    description: "Part origin offset in X (offset from robot base to part origin) (mm)",
    group      : "coords",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  partOriginY: {
    title      : "PCS Y (mm)",
    description: "Part origin offset in Y (offset from robot base to part origin) (mm)",
    group      : "coords",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  partOriginZ: {
    title      : "PCS Z (mm)",
    description: "Part origin offset in Z (offset from robot base to part origin) (mm)",
    group      : "coords",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  partOriginAx: {
    title      : "PCS Ax (deg, Rotation Vector)",
    description: "Part origin orientation Ax (orientation of part origin from robot base) (AxisAngle)",
    group      : "coords",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  partOriginAy: {
    title      : "PCS Ay (deg, Rotation Vector)",
    description: "Part origin orientation Ay (orientation of part origin from robot base) (AxisAngle)",
    group      : "coords",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  partOriginAz: {
    title      : "PCS Az (deg, Rotation Vector)",
    description: "Part origin orientation Az (orientation of part origin from robot base) (AxisAngle)",
    group      : "coords",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotPayload: {
    title      : "Robot payload (kg)",
    description: "Robot payload = mass of the end effector (kg)",
    group      : "script",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  tcpX: {
    title      : "TCP X (mm)",
    description: "Tool tip origin offset in X (offset from robot flange) (m)",
    group      : "tcp",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  tcpY: {
    title      : "TCP Y (mm)",
    description: "Tool tip origin offset in Y (offset from robot flange) (m)",
    group      : "tcp",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  tcpZ: {
    title      : "TCP Z (mm)",
    description: "Tool tip origin offset in Z (offset from robot flange) (m)",
    group      : "tcp",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  tcpAx: {
    title      : "TCP Ax (deg, Rotation Vector)",
    description: "Tool tip origin orientation Ax (orientation of tool tip from robot flange) (AxisAngle)",
    group      : "tcp",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  tcpAy: {
    title      : "TCP Ay (deg, Rotation Vector)",
    description: "Tool tip origin orientation Ay (orientation of tool tip from robot flange) (AxisAngle)",
    group      : "tcp",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  tcpAz: {
    title      : "TCP Az (deg, Rotation Vector)",
    description: "Tool tip origin orientation Az (orientation of tool tip from robot flange) (AxisAngle)",
    group      : "tcp",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  endEffectorBehaviorUR: {
    title      : "End-effector state (URScript)",
    description: "Set the end-effector state (including behavior during flat toolpath transitions)",
    group      : "additive2",
    type       : "enum",
    values     : [
      {title:"Off", id:"Off"},
      {title:"On + links On", id:"On"},
      {title:"On + links Off", id:"OnOff"}
    ],
    value: "Off",
    scope: "post"
  },
  portUR: {
    title      : "Port or digital output (URScript)",
    description: "Select the port or digital output (URScript)",
    group      : "additive2",
    type       : "enum",
    values     : [
      {title:"Standard 0", id:"standard_digital_out(0,"},
      {title:"Standard 1", id:"standard_digital_out(1,"},
      {title:"Standard 2", id:"standard_digital_out(2,"},
      {title:"Standard 3", id:"standard_digital_out(3,"},
      {title:"Standard 4", id:"standard_digital_out(4,"},
      {title:"Standard 5", id:"standard_digital_out(5,"},
      {title:"Standard 6", id:"standard_digital_out(6,"},
      {title:"Standard 7", id:"standard_digital_out(7,"},
      {title:"Tool 0", id:"tool_digital_out(0,"},
      {title:"Tool 1", id:"tool_digital_out(1,"},
      {title:"Configurable 0", id:"configurable_digital_out(0,"},
      {title:"Configurable 1", id:"configurable_digital_out(1,"},
      {title:"Configurable 2", id:"configurable_digital_out(2,"},
      {title:"Configurable 3", id:"configurable_digital_out(3,"},
      {title:"Configurable 4", id:"configurable_digital_out(4,"},
      {title:"Configurable 5", id:"configurable_digital_out(5,"},
      {title:"Configurable 6", id:"configurable_digital_out(6,"},
      {title:"Configurable 7", id:"configurable_digital_out(7,"}
    ],
    value: "standard_digital_out(0,",
    scope: "post"
  },
  waitUR: {
    title      : "Dwell time (URScript)",
    description: "Dwell time for each end-effector control command (URScript)",
    group      : "additive2",
    type       : "number",
    value      : 0.5,
    scope      : "post"
  },
  endEffectorBehaviorGC: {
    title      : "End-effector state (GCode)",
    description: "Set the end-effector state (including behavior during flat toolpath transitions).",
    group      : "additive1",
    type       : "enum",
    values     : [
      {title:"Off", id:"Off"},
      {title:"On + links On", id:"On"},
      {title:"On + links Off", id:"OnOff"}
    ],
    value: "Off",
    scope: "post"
  },
  portGC: {
    title      : "Port (GCode)",
    description: "Port to be used (GCode)",
    group      : "additive1",
    type       : "enum",
    values     : [
      {title:"0", id:"0"},
      {title:"1", id:"1"},
      {title:"2", id:"2"},
      {title:"3", id:"3"}
    ],
    value: "0",
    scope: "post"
  },
  waitGC: {
    title      : "Dwell time (GCode)",
    description: "Dwell time for each end-effector control command (GCode).",
    group      : "additive1",
    type       : "number",
    value      : 0.5,
    scope      : "post"
  },
  splitGCodeForAdditive: {
    title      : "Automatic toolpath splitting",
    description: "Automatic toolpath splitting at each end-effector command call (GCode).",
    group      : "gcode",
    type       : "boolean",
    value      : false,
    scope      : "post"
  }
};
groupDefinitions = {
  output       : {title:"Output", description:"Output file format", order:0},
  configuration: {title:"Robot Configuration", description:"General robot configuration", order:1},
  parameters   : {title:"Robot Parameters", description:"Robot parameters", order:2},
  gcode        : {title:"GCode: Motion Parameters", description:"GCode Motion Parameters", collapsed:true, order:3},
  additive1    : {title:"GCode: End-effector Control", description:"End-effector Control for GCode format", collapsed:true, order:4},
  tcp          : {title:"URScript: Tool Center Point (TCP)", description:"Tool Center Point - TCP (URScript)", collapsed:true, order:5},
  coords       : {title:"URScript: Part Coordinate System (PCS)", description:"Part Coordinate System - PCS (URScript)", collapsed:true, order:6},
  joint        : {title:"URScript: Toolpath Approach Pose", description:"Toolpath Approach Pose (URScript)", collapsed:true, order:7},
  script       : {title:"URScript: Motion Parameters", description:"URScript Motion Parameters", collapsed:true, order:8},
  additive2    : {title:"URScript: End-effector Control", description:"End-effector Control for URScript format", collapsed:true, order:9},
  preferences  : {title:"Miscellaneous", description:"Other post options", collapsed:true, order:10}
};

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

var gFormat = createFormat({prefix:"G", width:2, zeropad:true, decimals:1});
var mFormat = createFormat({prefix:"M", width:2, zeropad:true, decimals:1});
// GCode format
var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var feedFormat = createFormat({decimals:(unit == MM ? 3 : 4), scale:1.0});
var oFormat = createFormat({width:4, zeropad:true, decimals:0});
//
var aaFormat = createFormat({decimals:9, forceDecimal:true, trim:false});
var abcFormat = createFormat({decimals:6, forceDecimal:true, trim:true});
var jointFormat = createFormat({decimals:8, forceDecimal:true, trim:false, scale:1.0 / 180.0 * Math.PI});
var toolInfoFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3}); // seconds
var taperFormat = createFormat({decimals:1, scale:DEG});
var meterFormat = createFormat({decimals:9, forceDecimal:false, trim:true, scale:0.001});
//
var tFormat = createFormat({prefix:"T", width:1, zeropad:false, decimals:0});

// GCode format
var xOutput = createVariable({prefix:"X", force:true}, xyzFormat);
var yOutput = createVariable({prefix:"Y", force:true}, xyzFormat);
var zOutput = createVariable({prefix:"Z", force:true}, xyzFormat);
var iOutput = createReferenceVariable({prefix:"I", force:true}, xyzFormat);
var jOutput = createReferenceVariable({prefix:"J", force:true}, xyzFormat);
var kOutput = createReferenceVariable({prefix:"K", force:true}, xyzFormat);
var sOutput = createVariable({prefix:"", force:true}, rpmFormat);
var feedOutput = createVariable({prefix:"F"}, feedFormat);
//

var aOutput = createVariable({prefix:"A", force:true}, abcFormat);
var bOutput = createVariable({prefix:"B", force:true}, abcFormat);
var cOutput = createVariable({prefix:"C", force:true}, abcFormat);
var aaOutput = createVariable({prefix:"", force:true}, aaFormat);
var eOutput = createVariable({prefix:"E"}, xyzFormat); // extrusion length

var gMotionModal = createModal({}, gFormat);
var gPlaneModal = createModal({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createModal({}, gFormat);
var gUnitModal = createModal({}, gFormat);

var currentWorkOffset;
var toolpathIndex = 0;
var firstFeedParameter = 1;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var retracted = false; // specifies that the tool has been retracted to the safe plane
var firstLin = true; // set during onSection to reset first toolpath point
var pendingRadiusCompensation = -1;
var blockNumber = 1;
var endEffectorState = 0; // initial state of the end effector (0=off)
var endEffectorCommandOn = ""; // specifies the command to turn on the end effector
var endEffectorCommandOff = "";  // specifies the command to turn off the end effector
var endEffectors = false;
var dwellTime = 0;

var previousPosition = new Vector();
var moveFunction = "movel";
var subprograms = "";
var subName = "";
var subCounter = 0;
var subfolderPath;
var toolpathNames = new Array();
var permittedCommentChars = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:,'=_-&";

/**
  Writes the specified block.
*/
function writeBlock() {
  if (getProperty("fileFormat") == "GCode") {
    writeWords("N" + blockNumber, arguments);
    ++blockNumber;
  } else {
    writeWords(arguments);
  }
}

/**
  Formats a comment.
*/
function formatComment(text) {
  if (getProperty("fileFormat") == "GCode") {
    return "(" + filterText(String(text), permittedCommentChars).replace(/[()]/g, "") + ")";
  } else {
    return "# " + String(text);
  }
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

function onComment(message) {
  writeComment(message);
}

function coordinatesAreSame(xyz1, xyz2) {
  if (xyzFormat.getResultingValue(xyz1.x) != xyzFormat.getResultingValue(xyz2.x) ||
      xyzFormat.getResultingValue(xyz1.y) != xyzFormat.getResultingValue(xyz2.y) ||
      xyzFormat.getResultingValue(xyz1.z) != xyzFormat.getResultingValue(xyz2.z)) {
    return false;
  }
  return true;
}

function defineEndEffectorCodes() {
  if (getProperty("fileFormat") == "GCode") {
    endEffectorCommandOn = mFormat.format(62) + " P" + getProperty("portGC");
    endEffectorCommandOff = mFormat.format(63) + " P" + getProperty("portGC");
    dwellTime = gFormat.format(4) + " P" + getProperty("waitGC");
  } else {
    endEffectorCommandOn = "set_" + getProperty("portUR") + "True)";
    endEffectorCommandOff = "set_" + getProperty("portUR")  + "False)";
    dwellTime = "sleep(" + getProperty("waitUR") + ")";
  }
}

function onOpen() {
  // check if this configuration is able to manage tool change
  if (getToolTable().getNumberOfTools() > 1 && getProperty("outputFile") == "Single") {
    log("***       You may wish to select 'Multiple' Output Files        ***");
    error(localize("Tool change is not available in 'Single' Output File option."));
    return;
  }

  defineEndEffectorCodes();
  // check end-effector state for both formats
  if ((getProperty("fileFormat") == "URScript" && getProperty("endEffectorBehaviorUR") != "Off") || (getProperty("fileFormat") == "GCode" && getProperty("endEffectorBehaviorGC") != "Off")) {
    endEffectors = true;
  } else {
    endEffectors = false;
  }
  // store workoffset value to avoid multi wcs file
  currentWorkOffset = getSection(0).workOffset;

  // create subfolder if requested
  if (getProperty("useSubfolder")) {
    subfolderPath = FileSystem.getCombinedPath(FileSystem.getFolderPath(getOutputPath()), programName);
    if (!FileSystem.isFolder(subfolderPath)) {
      FileSystem.makeFolder(subfolderPath);
    }
  }

  if (getProperty("fileFormat") == "GCode") {
    setWordSeparator(" ");

    if (endEffectors && getProperty("splitGCodeForAdditive")) {
      setProperty("outputFile", "Multiple");
    }
    if (getProperty("outputFile") == "Single") {
      urGcodeHeader();
    }
  } else {
    // machine requires output only in MM
    unit = MM;
    highFeedrate = (unit == IN) ? 100 : 1000;
    // no arcs allowed in script format
    allowedCircularPlanes = 0;

    // Script format
    xyzFormat = createFormat({decimals:(unit == MM ? 6 : 8), forceDecimal:true, trim:false, scale:1.0 / 1000.0}); // mm -> m
    feedFormat = createFormat({decimals:(unit == MM ? 7 : 9), forceDecimal:false, scale:1.0 / 1000.0 / 60.0}); // mm/min -> m/s

    xOutput = createVariable({prefix:"", force:true}, xyzFormat);
    yOutput = createVariable({prefix:"", force:true}, xyzFormat);
    zOutput = createVariable({onchange:function () {retracted = false;}, prefix:"", force:true}, xyzFormat);
    feedOutput = createVariable({prefix:"", force:true}, feedFormat);

    setWordSeparator("");
    if (getProperty("outputFile") == "Single") {
      urInfoScript();
    }
  }
}

var operationCounter = 0;
function onSection() {
  cancelRotation();
  if (!currentSection.isMultiAxis())  {
    setRotation(currentSection.workPlane);
  }

  // used in coordinatesAreSame function
  previousPosition = new Vector(0, 0, 0);

  if (currentWorkOffset != currentSection.workOffset) {
    error(localize("Multiple Setup with different WCS is not available."));
    return;
  }

  if (getProperty("outputFile") == "Multiple") {
    firstLin = true;
  } else {
    toolpathIndex = currentSection.getId() + 1;
  }

  var insertToolCall = isFirstSection() || currentSection.getForceToolChange() ||
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
  opName = opName.replace(/[^a-zA-Z0-9_()]/g, "_");

  if (getProperty("useSubfolder")) {
    folder = subfolderPath;
  } else {
    folder = FileSystem.getFolderPath(getOutputPath());
  }

  // write toolpath name in array to check for duplicated names
  if (toolpathNames.length > 0 && toolpathNames.indexOf(opName) > -1) {
    ++operationCounter;
    opName += "_" + operationCounter;
  }

  subName = opName + "_";
  subCounter = 0;

  var toolNumber = isFFFOperation(currentSection) ? "FFF" : toolFormat.format(tool.number);

  if (insertToolCall && getProperty("outputFile") == "Multiple") {
    toolpathNames.push("TOOL " + toolNumber);
  }
  toolpathNames.push(opName);

  if (getProperty("nameLimitation")) {
    if (opName.length > 30) {
      error(subst(localize("Toolpath Name '%1' is longer than 30 characters. Please modify it to less than 30 characters."), opName));
      return;
    }
  }

  if (getProperty("fileFormat") == "GCode") {
    if (getProperty("outputFile") == "Multiple") {
      var path = FileSystem.getCombinedPath(folder, opName + ".nc");
      redirectToFile(path);
      urGcodeHeader();
    } else {
      var path = FileSystem.getCombinedPath(folder, opName + ".nc");
    }

    gMotionModal.reset();

    onSpindleSpeed(spindleSpeed);
    writeComment(localize("Tool               = ") + toolNumber);
    writeComment(localize("Toolpath name      = ") + opName);
    writeComment(localize("Head angle         = ") + getProperty("robotHeadAngle") + " deg");
  } else {
    var path = FileSystem.getCombinedPath(folder, opName + ".script");
    if (getProperty("outputFile") == "Multiple") {
      redirectToFile(path);
    }

    urHeader(opName);
    writeBlock("#");
    onSpindleSpeed(spindleSpeed);
    writeComment(localize("Tool               = ") + toolNumber);
    initializeActiveFeeds();
    writeBlock("#");
  }
}

function onDwell(seconds) {
}

function onSpindleSpeed(spindleSpeed) {
  writeComment(localize("Spindle Speed      = ") + sOutput.format(spindleSpeed) + " RPM");
}

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onRapid(_x, _y, _z) {
  if (isFFFOperation(currentSection)) {
    // for FFF: managing extruder on/off from here instead of onMovement()
    setAdditiveProcessOFF();
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, highFeedrate, 0);
}

function onLinear(_x, _y, _z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode is not supported by robot."));
    return;
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, feed, 1);
}

function onLinearExtrude(_x, _y, _z, feed) {
  if (isFFFOperation(currentSection)) {
    // for FFF: managing extruder on/off from here instead of onMovement()
    setAdditiveProcessON();
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, feed, 1);
}

function onRapid5D(_x, _y, _z, _i, _j, _k) {
  writeRobotMove(_x, _y, _z,  _i, _j, _k, highFeedrate, 0);
}

function onLinear5D(_x, _y, _z, _i, _j, _k, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode is not supported by robot."));
    return;
  }
  writeRobotMove(_x, _y, _z, _i, _j, _k, feed, 1);
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  if (!getProperty("useCircular")) {
    linearize(tolerance);
    return;
  }

  var start = getCurrentPosition();

  if (isFullCircle()) {
    if (isHelical()) {
      linearize(tolerance);
      return;
    }
  }

  if (getProperty("fileFormat") == "GCode") {
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0), feedOutput.format(feed));
      break;
    case PLANE_ZX:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x, 0), kOutput.format(cz - start.z, 0), feedOutput.format(feed));
      break;
    case PLANE_YZ:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y, 0), kOutput.format(cz - start.z, 0), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
    gMotionModal.reset();
  } else {
    // no arcs allowed in script format
    linearize(tolerance);
    // The syntax below is correct for circular moves in URScript format
    // There are still some issue with blend radius and trajectory
    // For the moment we prefer work without circular moves
    // calculate tool vector
    // var workPlane = currentSection.workPlane.forward;
    // var rha = getProperty("robotHeadAngle");
    // var vz = new Vector();

    // vz.x = workPlane.x;
    // vz.y = workPlane.y;
    // vz.z = workPlane.z;
    // var aa = getURAxisAngle3FromVectorAndRotationAngle(vz, rha);

    // // calculate mid-point of circle
    // var ip = getPositionU(0.5);

    // var fixedMotion = getProperty("outputFile") == "Single" ? ("),a=acc_" + toolpathIndex + ",v=" + getFeed(feed) + ",r=rad_smooth_" + toolpathIndex) : ("),a=acc,v=" + getFeed(feed) + ",r=rad_smooth");
    // // fixedMotion += ",mode=0)";
    // fixedMotion += ")";
    // var poseVia = xOutput.format(ip.x) + "," + yOutput.format(ip.y) + "," + zOutput.format(ip.z)  + "," + aaOutput.format(aa.x) + "," + aaOutput.format(aa.y) + "," + aaOutput.format(aa.z) + "]";
    // var poseTo = xOutput.format(x) + "," + yOutput.format(y) + "," + zOutput.format(z) + "," + aaOutput.format(aa.x) + "," + aaOutput.format(aa.y) + "," + aaOutput.format(aa.z) + "]";
    // writeBlock("movec(pose_trans(Ref_frame,p[" + poseVia + "),pose_trans(Ref_frame,p[" + poseTo + fixedMotion);
  }
}

/**
  Writes the right robot move (first point PTP, others as LIN)
*/
function writeRobotMove(x, y, z, i, j, k, feed, isoMove) {
  if (getProperty("fileFormat") == "URScript") {
    if (firstLin) {
      writeComment(localize("Toolpath Approach Pose"));
      writeJoints(getProperty("robotStartJ1"), getProperty("robotStartJ2"), getProperty("robotStartJ3"),
        getProperty("robotStartJ4"), getProperty("robotStartJ5"), getProperty("robotStartJ6"));
      writeComment(localize("First Toolpath Point"));
      writeLIN(x, y, z, i, j, k, getProperty("robotHeadAngle"), feed);
      firstLin = false;
    } else {
      writeLIN(x, y, z, i, j, k, getProperty("robotHeadAngle"), feed);
    }
  } else {
    writeLIN(x, y, z, i, j, k, getProperty("robotHeadAngle"), feed, isoMove);
    if (firstLin) {
      writeComment(localize("First Toolpath Point"));
      firstLin = false;
    }
  }
}

/**
  Move using joints
*/
function writeJoints(j1, j2, j3, j4, j5, j6) {
  var fixedMotion = getProperty("outputFile") == "Single" ? ("a=acc_" + toolpathIndex + ",v=vel_" + toolpathIndex + ",r=rad_smooth_" + toolpathIndex + ")") : "a=acc,v=vel,r=rad_smooth)";
  if (j1 == 0 && j2 == 0 && j3 == 0 && j4 == 0 && j5 == 0 && j6 == 0) {
    writeComment("movej([" + jointFormat.format(j1) + "," + jointFormat.format(j2) + "," + jointFormat.format(j3) + "," + jointFormat.format(j4) + "," +
      jointFormat.format(j5) + "," + jointFormat.format(j6) + "]," + fixedMotion);
  } else {
    writeBlock("movej([" + jointFormat.format(j1) + "," + jointFormat.format(j2) + "," + jointFormat.format(j3) + "," + jointFormat.format(j4) + "," +
    jointFormat.format(j5) + "," + jointFormat.format(j6) + "]," + fixedMotion);
  }
}

/**
  Move linear
*/
function writeLIN(x, y, z, i, j, k, angle, feed, isoMove) {
  // calculates UR axis angles from toolaxis vector and given head angle
  var vz = new Vector();
  vz.x = i;
  vz.y = j;
  vz.z = k;
  if (getProperty("fileFormat") == "URScript") {
    var aa = getURAxisAngle3FromVectorAndRotationAngle(vz, angle);
    var fixedMotion = getProperty("outputFile") == "Single" ? ("a=acc_" + toolpathIndex + ",v=" + getFeed(feed) + ",r=rad_smooth_" + toolpathIndex + ")") : ("a=acc,v=" + getFeed(feed) + ",r=rad_smooth)");
    writeBlock(moveFunction + "(pose_trans(Ref_frame,p[" + xOutput.format(x) + "," + yOutput.format(y) + "," + zOutput.format(z) + "," + aaOutput.format(aa.x) +
      "," + aaOutput.format(aa.y) + "," + aaOutput.format(aa.z) + "])," + fixedMotion);
  } else {
    var remaining = currentSection.workPlane;
    if (currentSection.isMultiAxis() || !isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      var ea = getUREulerAngleFromVector(vz, angle);
      if (coordinatesAreSame(new Vector(x, y, z), previousPosition)) {
        writeComment(localize("Warning. Consecutive points with the same XYZ coordinates !!!"));
      }
      writeBlock(gMotionModal.format(isoMove), xOutput.format(x), yOutput.format(y), zOutput.format(z), aOutput.format(ea.z), bOutput.format(ea.y), cOutput.format(ea.x), feedOutput.format(feed));
      // used in coordinatesAreSame function
      previousPosition = new Vector(x, y, z);
    } else {
      forceXYZ();
      writeBlock(gMotionModal.format(isoMove), xOutput.format(x), yOutput.format(y), zOutput.format(z), feedOutput.format(feed));
    }
  }
}

function isFFFOperation(section) {
  return section.getType() == TYPE_ADDITIVE && section.getTool().type == TOOL_MARKER;
}

function onMovement(movement) {
  // ignore all the onMovement stuff for FFF since the end effector switch
  // is handled in the onRapid and onLinearExtrude functions
  moveFunction = "movel";
  if (!isFFFOperation(currentSection)) {
    switch (movement) {
    case MOVEMENT_CUTTING:
    case MOVEMENT_FINISH_CUTTING:
      moveFunction = (getProperty("useMovep") ? "movep" : "movel");
      writeComment(localize("Cutting Move Starts"));
      setAdditiveProcessON();
      break;
    case MOVEMENT_PLUNGE:
      writeComment(localize("Plunge Move Starts"));
      break;
    case MOVEMENT_LEAD_IN:
      writeComment(localize("Lead In Move Starts"));
      break;
    case MOVEMENT_LEAD_OUT:
      writeComment(localize("Lead Out Move Starts"));
      setAdditiveProcessOFF();
      break;
    case MOVEMENT_LINK_TRANSITION:
      writeComment(localize("Link Move Starts"));
      if (getProperty("endEffectorBehaviorUR") == "OnOff" || getProperty("endEffectorBehaviorGC") == "OnOff") {
        setAdditiveProcessOFF();
      }
      break;
    case MOVEMENT_BRIDGING:
      writeComment(localize("Bridging Move Starts"));
      break;
    case MOVEMENT_LINK_DIRECT:
      writeComment(localize("Cutting Move Ends"));
      break;
    case MOVEMENT_HIGH_FEED:
    case MOVEMENT_RAPID:
      writeComment(localize("Rapid Move Starts"));
      setAdditiveProcessOFF();
      break;
    }
  } else {
    switch (movement) {
    case MOVEMENT_CUTTING:
    case MOVEMENT_FINISH_CUTTING:
      moveFunction = (getProperty("useMovep") ? "movep" : "movel");
      break;
    case MOVEMENT_HIGH_FEED:
    case MOVEMENT_RAPID:
      setAdditiveProcessOFF();
      break;
    }
  }
}

function splitForAdditive() {
  urGcodeFooter();
  if (isRedirecting()) {
    closeRedirection();
  }
  ++subCounter;
  var splittedToolpath = subName + subCounter;
  toolpathNames.push(splittedToolpath);
  var path = FileSystem.getCombinedPath(folder, splittedToolpath + ".nc");
  redirectToFile(path);
  gMotionModal.reset();
  blockNumber = 1;
  urGcodeHeader();
}

function setAdditiveProcessON() {
  if (endEffectors && endEffectorState == 0) {
    writeComment(localize("Turn on end-effector"));
    writeBlock(endEffectorCommandOn);
    writeComment(localize("Wait time in seconds"));
    writeBlock(dwellTime);
    endEffectorState = 1;
    if (getProperty("fileFormat") == "GCode" && getProperty("splitGCodeForAdditive")) {
      splitForAdditive();
    }
  }
}

function setAdditiveProcessOFF() {
  if (endEffectors && endEffectorState == 1) {
    writeComment(localize("Turn off end-effector"));
    writeBlock(endEffectorCommandOff);
    writeComment(localize("Wait time in seconds"));
    writeBlock(dwellTime);
    endEffectorState = 0;
    if (getProperty("fileFormat") == "GCode" && getProperty("splitGCodeForAdditive")) {
      splitForAdditive();
    }
  }
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

function onCommand(command) {
  switch (command) {
  case COMMAND_STOP:
    writeBlock("");
    forceSpindleSpeed = true;
    return;
  case COMMAND_OPTIONAL_STOP:
    writeComment(""); // need variable
    return;
  case COMMAND_COOLANT_ON:
    // setCoolant(COOLANT_FLOOD);
    return;
  case COMMAND_COOLANT_OFF:
    // setCoolant(COOLANT_OFF);
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
  default:
    onUnsupportedCommand(command);
  }
}

function onSectionEnd() {
  if (getProperty("outputFile") == "Multiple") {
    if (getProperty("fileFormat") == "GCode") {
      urGcodeFooter();
      blockNumber = 1;
      gAbsIncModal.reset();
      gUnitModal.reset();
    } else {
      urFooter();
    }
    subprograms += getRedirectionBuffer();
    closeRedirection();
  }
}

function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

function forceABC() {
  aOutput.reset();
  bOutput.reset();
  cOutput.reset();
}

function forceFeed() {
  currentFeedId = undefined;
  feedOutput.reset();
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
      forceFeed();
      currentFeedId = feedContext.id;
      if (toolpathIndex > 0) {
        return ("fed" + (firstFeedParameter + feedContext.id) + "_" + toolpathIndex);
      } else {
        return "fed" + (firstFeedParameter + feedContext.id);
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
      var feedContext = new FeedContext(id, localize("Lead-in"), getParameter("operation:tool_feedEntry"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_IN] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LEAD_OUT)) {
      var feedContext = new FeedContext(id, localize("Lead-out"), getParameter("operation:tool_feedExit"));
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
      var feedContext = new FeedContext(id, localize("Ramp"), getParameter("operation:tool_feedRamp"));
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
    if ((movements & (1 << MOVEMENT_HIGH_FEED)) | (1 << MOVEMENT_RAPID)) {
    // if ((movements & (1 << MOVEMENT_HIGH_FEED)) || (highFeedMapping != HIGH_FEED_NO_MAPPING)) {
      var feed;
      if (hasParameter("operation:highFeedrateMode") && getParameter("operation:highFeedrateMode") != "disabled") {
        feed = getParameter("operation:highFeedrate");
      } else {
        feed = this.highFeedrate;
      }
      var feedContext = new FeedContext(id, localize("High Feed-rapid"), feed);
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

  var motionSuffix = getProperty("outputFile") == "Single" ? ("_" + toolpathIndex) : "";

  writeComment(localize("Motion Settings"));
  writeBlock("acc" + motionSuffix + " = " + meterFormat.format(getProperty("robotAcceleration")) + " # Robot acceleration");
  writeBlock("vel" + motionSuffix + " = " + meterFormat.format(getProperty("robotJointSpeed")) + " # Robot movej tool speed");
  for (var i = 0; i < activeFeeds.length; ++i) {
    var feedContext = activeFeeds[i];
    writeBlock("fed" + (firstFeedParameter + feedContext.id) + motionSuffix + " = " + feedFormat.format(feedContext.feed) + " " + formatComment(feedContext.description));
  }
  writeBlock("rad_smooth" + motionSuffix + " = " + meterFormat.format(getProperty("robotSmoothing")) + " # Robot radius smoothing");
  writeBlock("#");
}

////// Vector and Matrix calculation for Script format //////
/**
  converts a vectorZ and a rotation angle around it to UR Euler angles
*/
function getURAxisAngle3FromVectorAndRotationAngle(vectorZ, angleInDegrees) {
  // X is rotated about standard XY-plane, not provided Z-axis
  var vectorX = Matrix.getZRotation(toRad(angleInDegrees)).transposed.multiply(new Vector(1, 0, 0));

  // X and Z form a non-orthogonal matrix, so cannot use standard matrix calculations
  var yAxis = Vector.cross(vectorZ, vectorX);
  var xAxis = Vector.cross(yAxis, vectorZ);
  var yAxis = Vector.cross(vectorZ, xAxis);

  m = new Matrix(xAxis, yAxis, vectorZ).transposed;

  var aa = getURAxisAngle3FromMatrix3x3(m);
  return aa;
}

/**
  Converts a rotation matrix 3x3 to UR Axis angle
*/
function getURAxisAngle3FromMatrix3x3(rotationMatrix) {
  var m00 = rotationMatrix.getElement(0, 0);
  var m01 = rotationMatrix.getElement(1, 0);
  var m02 = rotationMatrix.getElement(2, 0);
  var m10 = rotationMatrix.getElement(0, 1);
  var m11 = rotationMatrix.getElement(1, 1);
  var m12 = rotationMatrix.getElement(2, 1);
  var m20 = rotationMatrix.getElement(0, 2);
  var m21 = rotationMatrix.getElement(1, 2);
  var m22 = rotationMatrix.getElement(2, 2);

  var x = 0;
  var y = 0;
  var z = 0;
  var angle = 0;

  var EPSILON = 0.01;
  var EPSILON2 = 0.1;

  if ((Math.abs(m01 - m10) < EPSILON) && (Math.abs(m02 - m20) < EPSILON) && (Math.abs(m12 - m21) < EPSILON)) {
    if ((Math.abs(m01 + m10) < EPSILON2) && (Math.abs(m02 + m20) < EPSILON2) && (Math.abs(m12 + m21) < EPSILON2) && (Math.abs(m00 + m11 + m22 - 3) < EPSILON2)) {
      var v = new Vector(0, 0, 0);
      return v;
    }

    angle = Math.PI;
    var xx = (m00 + 1) / 2;
    var yy = (m11 + 1) / 2;
    var zz = (m22 + 1) / 2;
    var xy = (m01 + m10) / 4;
    var xz = (m02 + m20) / 4;
    var yz = (m12 + m21) / 4;

    if ((xx > yy) && (xx > zz)) {
      if (xx < EPSILON) {
        x = 0;
        y = 0.7071;
        z = 0.7071;
      } else {
        x = Math.sqrt(xx);
        y = xy / x;
        z = xz / x;
      }
    } else if (yy > zz) {
      if (yy < EPSILON) {
        x = 0.7071;
        y = 0;
        z = 0.7071;
      } else {
        y = Math.sqrt(yy);
        x = xy / y;
        z = yz / y;
      }
    } else {
      if (zz < EPSILON) {
        x = 0.7071;
        y = 0.7071;
        z = 0;
      } else {
        z = Math.sqrt(zz);
        x = xz / z;
        y = yz / z;
      }
    }

    var v = new Vector(x, y, z);
    v = v.normalized;
    v.x *= angle;
    v.y *= angle;
    v.z *= angle;
    return v;
  }

  var s = Math.sqrt((m21 - m12) * (m21 - m12) + (m02 - m20) * (m02 - m20) + (m10 - m01) * (m10 - m01));
  if (Math.abs(s) < 0.001) {
    s = 1;
  }
  angle = Math.acos((m00 + m11 + m22 - 1) / 2);
  x = (m21 - m12) / s;
  y = (m02 - m20) / s;
  z = (m10 - m01) / s;

  var v = new Vector(x, y, z);
  v = v.normalized;
  v.x *= angle;
  v.y *= angle;
  v.z *= angle;
  return v;
}
////////////////////////////////////////////////////////////

////// Vector and Matrix calculation for GCode format //////

/**
  Converts a vectorZ and a rotation angle around it to Universal Robot Euler angles
*/
function getUREulerAngleFromVector(vectorZ, angleInDegrees) {
  // X is rotated about standard XY-plane, not provided Z-axis
  var vectorX = Matrix.getZRotation(toRad(angleInDegrees)).transposed.multiply(new Vector(1, 0, 0));

  // X and Z form a non-orthogonal matrix, so cannot use standard matrix calculations
  var yAxis = Vector.cross(vectorZ, vectorX);
  var xAxis = Vector.cross(yAxis, vectorZ);
  var yAxis = Vector.cross(vectorZ, xAxis);

  m = new Matrix(xAxis, yAxis, vectorZ).transposed;
  ea = new Vector();
  var ea = m.transposed.getEuler2(EULER_ZYX_R).toDeg();

  return ea;
}

function applyAngleAxis(normal, a, vectorX) {

  var ux = normal.x;
  var uy = normal.y;
  var uz = normal.z;

  var i = vectorX.x;
  var j = vectorX.y;
  var k = vectorX.z;

  var ca = Math.cos(a);
  var sa = Math.sin(a);
  var t = 1 - ca;

  a11 = i * (ca + ux * ux * t) + j * (ux * uy * t - uz * sa) + k * (ux * uz * t + uy * sa);
  a21 = i * (ux * uy * t + uz * sa) + j * (ca + uy * uy * t) + k * (uy * uz * t - ux * sa);
  a31 = i * (uz * ux * t - uy * sa) + j * (uz * uy * t + ux * sa) + k * (ca + uz * uz * t);

  return new Vector(a11, a21, a31);

}

function urHeader(opName) {
  // =========== UNIVERSAL ROBOT HEADER SCRIPT VERSION ===================
  if (getProperty("outputFile") == "Multiple") {
    urInfoScript();
  } else {
    writeBlock("#");
  }
  writeBlock("# Toolpath Name = ", opName);
  writeComment(localize("Head angle    = ") + getProperty("robotHeadAngle") + " deg");
  if (getProperty("outputFile") == "Multiple" || isFirstSection()) {
    writeBlock("#");
    writeBlock("# Set TCP");

    var tx = getProperty("tcpX");
    var ty = getProperty("tcpY");
    var tz = getProperty("tcpZ");
    var taX = getProperty("tcpAx");
    var taY = getProperty("tcpAy");
    var taZ = getProperty("tcpAz");

    if (tx == 0 && ty == 0 && tz == 0 && taX == 0 && taY == 0 && taZ == 0) {
      writeComment("set_tcp(p[" + xOutput.format(tx) + "," + yOutput.format(ty) + "," + zOutput.format(tz) +
      "," + aaOutput.format(taX) + "," + aaOutput.format(taY) + "," + aaOutput.format(taZ) + "])");
    } else {
      writeBlock("set_tcp(p[" + xOutput.format(tx) + "," + yOutput.format(ty) + "," + zOutput.format(tz) +
      "," + toRad(aaOutput.format(taX)) + "," + toRad(aaOutput.format(taY)) + "," + toRad(aaOutput.format(taZ)) + "])");
    }
  }

  if (getProperty("outputFile") == "Multiple" || isFirstSection()) {
    writeBlock("#");
    writeBlock("# Set Part Coordinate System");

    var px = getProperty("partOriginX");
    var py = getProperty("partOriginY");
    var pz = getProperty("partOriginZ");
    var paX = getProperty("partOriginAx");
    var paY = getProperty("partOriginAy");
    var paZ = getProperty("partOriginAz");

    var block = "global Ref_frame = p[" + xOutput.format(px) + "," + yOutput.format(py) + "," +
      zOutput.format(pz) + "," + toRad(aaOutput.format(paX)) + "," + toRad(aaOutput.format(paY)) +
      "," + toRad(aaOutput.format(paZ)) + "]";

    if (px == 0 && py == 0 && pz == 0 && paX == 0 && paY == 0 && paZ == 0) {
      writeComment(block);
    } else {
      writeBlock(block);
    }
    writeBlock("#");
    writeBlock("# Set Payload");
    if (getProperty("robotPayload") == 0) {
      writeComment(localize("set_payload(") + getProperty("robotPayload") + ")");
    } else {
      writeBlock("set_payload(" + getProperty("robotPayload") + ")");
    }
  }
}

function urInfoScript() {
  writeBlock("#");
  if (programComment) {
    writeComment(programComment);
  }
  if (getProperty("writeCamVersion") && hasGlobalParameter("generated-by")) {
    var value = getGlobalParameter("generated-by");
    writeComment(localize("Generated by AUTODESK ") + value);
  }
  if ((typeof getHeaderVersion == "function") && getHeaderVersion()) {
    writeComment(localize("Post version") + ": " + getHeaderVersion());
  }
  if (getProperty("writeDateAndTime")) {
    var d = new Date();
    writeComment(localize("Creation date") + ": " + d.toLocaleDateString() + " " + d.toLocaleTimeString());
  }
}

function urGcodeHeader() {
  // =========== UNIVERSAL ROBOT HEADER GCODE VERSION ==================
  writeln("%");
  if (programComment) {
    writeComment(programComment.toUpperCase());
  }
  writeComment(localize("G-code output for Universal Robots' Remote TCP & Toolpath URCap"));
  writeComment(localize("Compatible with Polyscope 5.11.4 and above"));
  if (getProperty("writeCamVersion") && hasGlobalParameter("generated-by")) {
    var value = getGlobalParameter("generated-by");
    writeComment(localize("Generated by AUTODESK ") + value);
  }
  if ((typeof getHeaderVersion == "function") && getHeaderVersion()) {
    writeComment(localize("Post version") + ": " + getHeaderVersion());
  }
  if (getProperty("writeDateAndTime")) {
    var d = new Date();
    writeComment(localize("Creation date") + ": " + d.toLocaleDateString() + " " + d.toLocaleTimeString());
  }
  gAbsIncModal.reset();
  gUnitModal.reset();
  writeBlock(gAbsIncModal.format(90));
  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(20));
    break;
  case MM:
    writeBlock(gUnitModal.format(21));
    break;
  }
}

function urFooter() {
  // =========== UNIVERSAL ROBOT FOOTER SCRIPT VERSION ==================
  writeComment(localize("Last Toolpath Point"));
  writeBlock("end");
}

function urGcodeFooter() {
  // =========== UNIVERSAL ROBOT FOOTER GCODE VERSION ==================
  writeBlock(mFormat.format(30));
  writeln("%");
}

function onTerminate() {
  if (getProperty("addFileExtension")) {
    var outputPath = getOutputPath();
    var outputFolder = FileSystem.getFolderPath(getOutputPath());
    var programFilename = FileSystem.getFilename(outputPath);
    var _extension = getProperty("fileFormat") == "URScript" ? "script" : "nc";

    // move main program to subfolder if requested
    if (getProperty("useSubfolder")) {
      var subfilePath = FileSystem.getCombinedPath(subfolderPath, programFilename);
      if (FileSystem.isFile(subfilePath)) {
        FileSystem.moveFile(outputPath, FileSystem.replaceExtension(subfilePath, _extension));
      }
    } else {
      // add proper extension to the specific output file format
      if (FileSystem.isFile(outputPath)) {
        FileSystem.copyFile(outputPath, FileSystem.replaceExtension(outputPath, _extension));
      }
    }
    if (FileSystem.isFile(outputPath)) {
      FileSystem.remove(outputPath);
    }

    var file = new TextFile(outputFolder + "\\" + programFilename, true, "ansi");
    var path = getProperty("useSubfolder") ? subfolderPath : outputFolder;
    file.writeln("This is a dummy file.");
    file.writeln("Your program files are located here: " + path);
    file.close();
  }
}

function onClose() {
  if (getProperty("outputFile") == "Single") {
    if (getProperty("fileFormat") == "GCode") {
      urGcodeFooter();
    } else {
      urFooter();
    }
  } else {
    writeComment(localize("Multiple Programs list"));
    for (var i = 0; i < toolpathNames.length; ++i) {
      if (getProperty("fileFormat") == "GCode") {
        writeln("(" + toolpathNames[i] + ")");
      } else {
        // write tool infos or toolpath name in main program
        writeComment(toolpathNames[i]);
      }
    }
  }
}

function setProperty(property, value) {
  properties[property].current = value;
}
