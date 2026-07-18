/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  Techman Robot post processor configuration.

  $Revision: 44068 3d4d2636dc8987bb0087a0af8b8686f1e4cbd831 $
  $Date: 2023-05-30 13:40:56 $

  FORKID {610DBAA8-6F18-4286-9901-BF607185C321}
*/

///////////////////////////////////////////////////////////////////////////////
//     CUSTOM NC COMMANDS - search for 'Machine specific output, modify as needed'
//
//     endEffectorCommandOn   - Modify this variable to define the commands to turn ON the end effector, if needed
//     endEffectorCommandOff  - Modify this variable to define the commands to turn OFF the end effector, if needed
//
///////////////////////////////////////////////////////////////////////////////

description = "Techman Robot";
vendor = "Techman";
vendorUrl = "https://www.tm-robot.com/en/";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Generic Techman Robot post processor. Always validate with virtual controller before loading any toolpath on your Robot.";

extension = "txt";
programNameIsInteger = false;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_ADDITIVE;
tolerance = spatial(0.25, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
highFeedrate = (unit == IN) ? 500 : 5000;

// no arcs are available
allowHelicalMoves = false;
allowSpiralMoves = false;
allowedCircularPlanes = 0;

// collected state
var counter = 0;

// user-defined properties
properties = {
  robotHeadAngle: {
    title      : "Robot head angle",
    description: "Techman robot head angle around the Z axis of the tool.",
    group      : "process",
    type       : "number",
    value      : 30,
    scope      : "post"
  },
  flipToolFrame: {
    title      : "Flip tool frame",
    description: "Flip the tool frame (Z- is along the tool axis).",
    group      : "process",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
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
  robotBase1: {
    title      : "Base X",
    description: "Techman robot base X point used for base definition.",
    group      : "basedef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotBase2: {
    title      : "Base Y",
    description: "Techman robot base Y point used for base definition.",
    group      : "basedef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotBase3: {
    title      : "Base Z",
    description: "Techman robot base Z point used for base definition.",
    group      : "basedef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotBase4: {
    title      : "Base Rx",
    description: "Techman robot base Rx point used for base definition.",
    group      : "basedef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotBase5: {
    title      : "Base Ry",
    description: "Techman robot base Ry point used for base definition.",
    group      : "basedef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotBase6: {
    title      : "Base Rz",
    description: "Techman robot base Rz point used for base definition.",
    group      : "basedef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotTool1: {
    title      : "Tool X",
    description: "Techman robot tool X point used for tool definition.",
    group      : "tooldef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotTool2: {
    title      : "Tool Y",
    description: "Techman robot tool Y point used for tool definition.",
    group      : "tooldef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotTool3: {
    title      : "Tool Z",
    description: "Techman robot tool Z point used for tool definition.",
    group      : "tooldef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotTool4: {
    title      : "Tool Rx",
    description: "Techman robot tool Rx point used for tool definition.",
    group      : "tooldef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotTool5: {
    title      : "Tool Ry",
    description: "Techman robot tool Ry point used for tool definition.",
    group      : "tooldef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  robotTool6: {
    title      : "Tool Rz",
    description: "Techman robot tool Rz point used for tool definition.",
    group      : "tooldef",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  joint1: {
    title      : "Joint A1",
    description: "PTP move - Joint Angle 1.",
    group      : "joints",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  joint2: {
    title      : "Joint A2",
    description: "PTP move - Joint Angle 2.",
    group      : "joints",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  joint3: {
    title      : "Joint A3",
    description: "PTP move - Joint Angle 3.",
    group      : "joints",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  joint4: {
    title      : "Joint A4",
    description: "PTP move - Joint Angle 4.",
    group      : "joints",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  joint5: {
    title      : "Joint A5",
    description: "PTP move - Joint Angle 5.",
    group      : "joints",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  joint6: {
    title      : "Joint A6",
    description: "PTP move - Joint Angle 6.",
    group      : "joints",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  // Motion parameters
  lineAbs: {
    title      : "Line ABS velocity",
    description: "Line ABS, enable absolute velocity.",
    group      : "parameters",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  lsaVelocity: {
    title      : "LSA velocity",
    description: "LSA Velocity, absolute velocity value.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  lsttts: {
    title      : "LSTTTS value",
    description: "LSTTTS, time to stop speed.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  plsaVelocity: {
    title      : "PLSA velocity",
    description: "PLSA Velocity, absolute velocity value.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  plsttts: {
    title      : "PLSTTTS value",
    description: "PLSTTTS, time to stop speed.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  lsPercentage: {
    title      : "LS percentage",
    description: "LS Percentage, speed percentage.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  pstttsof: {
    title      : "PSTTTSOF value",
    description: "PSTTTSOF, enable time to stop.",
    group      : "parameters",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  psttts: {
    title      : "PSTTTS value",
    description: "PSTTTS, time to stop speed.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  psPercentage: {
    title      : "PS percentage",
    description: "PS Percentage, speed percentage.",
    group      : "parameters",
    type       : "number",
    value      : 100,
    scope      : "post"
  },
  //
  robotBlend: {
    title      : "Robot blend value (mm)",
    description: "Robot Blend Value.",
    group      : "parameters",
    type       : "number",
    value      : 1,
    scope      : "post"
  },
  robotConfig: {
    title      : "Robot configuration",
    description: "Techman Robot Configuration.",
    group      : "parameters",
    type       : "string",
    value      : "0,2,4",
    scope      : "post"
  },
  // mass paramters
  amassCenterX: {
    title      : "Mass center X",
    description: "Mass Center X.",
    group      : "mass",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  amassCenterY: {
    title      : "Mass center Y",
    description: "Mass Center Y.",
    group      : "mass",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  amassCenterZ: {
    title      : "Mass center Z",
    description: "Mass Center Z.",
    group      : "mass",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  massCenterW: {
    title      : "Mass center W",
    description: "Mass Center W.",
    group      : "mass",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  massCenterV: {
    title      : "Mass center V",
    description: "Mass Center V.",
    group      : "mass",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  massCenterU: {
    title      : "Mass center U",
    description: "Mass Center U.",
    group      : "mass",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  // inertia paramters
  inertiaX: {
    title      : "Inertia X",
    description: "Inertia X.",
    group      : "inertia",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  inertiaY: {
    title      : "Inertia Y",
    description: "Inertia Y.",
    group      : "inertia",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  inertiaZ: {
    title      : "Inertia Z",
    description: "Inertia Z.",
    group      : "inertia",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  // 'a' prefix added to have this property at the top of the list
  auseZip: {
    title      : "Encrypt output folder",
    description: "Specifies if the output folder should be compressed or not.",
    group      : "encryption",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  exePath: {
    title      : "Executable path",
    description: "Specifies the location of the executable path.",
    group      : "encryption",
    type       : "string",
    value      : "C:\\Techman\\TMExportZip.exe",
    scope      : "post"
  },
  fileAuthor: {
    title      : "Author",
    description: "Specifies the zip file author.",
    group      : "encryption",
    type       : "string",
    value      : "ADSK",
    scope      : "post"
  },
  zipPasswd: {
    title      : "Password",
    description: "Specifies the zip file password. Please note that TMExportZip needs a password at least 8 characters long.",
    group      : "encryption",
    type       : "string",
    value      : "Tm000000",
    scope      : "post"
  }
};

groupDefinitions = {
  process   : {title:"Process", description:"Process post settings", order:0},
  basedef   : {title:"Base definition", description:"Robot base definition", collapsed:true, order:1},
  tooldef   : {title:"Tool definition", description:"Robot tool definition", collapsed:true, order:2},
  parameters: {title:"Parameters", description:"Robot parameters", collapsed:true, order:3},
  joints    : {title:"PTP joints", description:"PTP joints angles", collapsed:true, order:4},
  inertia   : {title:"Inertia data", description:"Inertia data", collapsed:true, order:5},
  mass      : {title:"Mass data", description:"Mass data", collapsed:true, order:6},
  encryption: {title:"Encryption", description:"Techman encryption", order:7}
};

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, trim:false});
var abcFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true, trim:false});
var feedFormat = createFormat({decimals:(unit == MM ? 2 : 3), forceDecimal:false});
var toolFormat = createFormat({decimals:0});

var xOutput = createVariable({prefix:"", force:true}, xyzFormat);
var yOutput = createVariable({prefix:",", force:true}, xyzFormat);
var zOutput = createVariable({prefix:",", force:true}, xyzFormat);
var iOutput = createVariable({prefix:",", force:true}, abcFormat);
var jOutput = createVariable({prefix:",", force:true}, abcFormat);
var kOutput = createVariable({prefix:",", force:true}, abcFormat);
var feedOutput = createVariable({prefix:",", force:true}, feedFormat);

var subfolderPath;
var subfolderPathZip;
var folders = new Array();

var lines = new Array();
// lines is an array used to write toolpath lines at the end of each session
// the controller needs the total number of point for each toolpath in the header - first line
// we need to buffer the entire output to calculate the number of points before writing

var endEffectorState = 0; // initial state of the end effector (0 =off)

var pendingRadiusCompensation = -1;
var pointIndex;
var baseName = "";
var toolName = "";
var opName = "";

var settings = {
  coolant: {
    coolants: [
      {id:COOLANT_FLOOD},
      {id:COOLANT_MIST},
      {id:COOLANT_THROUGH_TOOL},
      {id:COOLANT_AIR},
      {id:COOLANT_AIR_THROUGH_TOOL},
      {id:COOLANT_SUCTION},
      {id:COOLANT_FLOOD_MIST},
      {id:COOLANT_FLOOD_THROUGH_TOOL},
      {id:COOLANT_OFF}
    ],
    singleLineCoolant: false, // specifies to output multiple coolant codes in one line rather than in separate lines
  },
  workPlaneMethod: {
    eulerConvention: EULER_XYZ_S // specifies the euler convention (ie EULER_XYZ_R), set to undefined to use machine angles for TWP commands ('undefined' requires machine configuration)
  },
  comments: {
    permittedCommentChars: " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:;,'=_-",
    prefix               : "(", // specifies the prefix for the comment
    suffix               : ")", // specifies the suffix for the comment
    upperCase            : false, // set to true to output all comments in upper case
  },
};

validate(settings.comments, "Setting 'comments' is required but not defined.");
function formatComment(text) {
  var prefix = settings.comments.prefix;
  var suffix = settings.comments.suffix;
  text = settings.comments.upperCase ? text.toUpperCase() : text;
  text = filterText(String(text), settings.comments.permittedCommentChars).replace(/[()]/g, "");
  text = String(text).substring(0, settings.comments.maximumLineLength - prefix.length - suffix.length);
  return text != "" ?  prefix + text + suffix : "";
}

function writeComment(text) {
  writeln(formatComment(text));
}

function writeBlock() {
  writeWords(arguments);
}

function header() {
  writeln("<Root PointCount=\"" + pointIndex + "\" PvtPointCount=\"0\" TaskCount=\"0\" PvtTaskCount=\"0\" ID=\"\">");
  writeln("  <Version>1.4</Version>");
  writeln("  <Base>");
  writeln("    <Name>" + baseName + "</Name>");
  writeln("    <Data>0.0000,0.0000,0.0000,0.0000,0.0000,0.0000</Data>");
  writeBlock("    <Data>" + getProperty("robotBase1"), getProperty("robotBase2"), getProperty("robotBase3"),
    getProperty("robotBase4"), getProperty("robotBase5"), getProperty("robotBase6") + "</Data>");
  writeln("    <Type />");
  writeln("  </Base>");
  writeln("  <TCP>");
  writeln("    <Name>" + toolName + "</Name>");
  writeln("    <Description />");
  writeln("    <GPTFF>");
  writeln("      <X>" + getProperty("robotTool1") + "</X>");
  writeln("      <Y>" + getProperty("robotTool2") + "</Y>");
  writeln("      <Z>" + getProperty("robotTool3") + "</Z>");
  writeln("      <W>" + getProperty("robotTool4") + "</W>");
  writeln("      <V>" + getProperty("robotTool5") + "</V>");
  writeln("      <U>" + getProperty("robotTool6") + "</U>");
  writeln("    </GPTFF>");
  writeln("    <Mass>0</Mass>");
  writeln("    <MassCenter>");
  writeln("      <X>" + getProperty("amassCenterX") + "</X>");
  writeln("      <Y>" + getProperty("amassCenterY") + "</Y>");
  writeln("      <Z>" + getProperty("amassCenterZ") + "</Z>");
  writeln("      <W>" + getProperty("massCenterW") + "</W>");
  writeln("      <V>" + getProperty("massCenterV") + "</V>");
  writeln("      <U>" + getProperty("massCenterU") + "</U>");
  writeln("    </MassCenter>");
  writeln("    <Inertia>");
  writeln("      <Ixx>" + getProperty("inertiaX") + "</Ixx>");
  writeln("      <Iyy>" + getProperty("inertiaY") + "</Iyy>");
  writeln("      <Izz>" + getProperty("inertiaZ") + "</Izz>");
  writeln("    </Inertia>");
  writeln("    <GPTCF>");
  writeln("      <X>0</X>");
  writeln("      <Y>0</Y>");
  writeln("      <Z>0</Z>");
  writeln("      <W>0</W>");
  writeln("      <V>0</V>");
  writeln("      <U>0</U>");
  writeln("    </GPTCF>");
  writeln("    <Studio_tcp />");
  writeln("    <Studio_stp />");
  writeln("  </TCP>");
}

function writeDummy(folder) {
  // write fixed text in the dummy file
  writeln("*** Status File - Not for use ***");
  writeln("Files are saved to: " + folder);
  var tools = getToolTable();
  if (tools.getNumberOfTools() > 1) {
    for (var i = 0; i < tools.getNumberOfTools() - 1; ++i) {
      if (tools.getTool(i) != tools.getTool(i + 1)) {
        writeln("");
        writeln("      *** Please carefully check your output files ***");
        writeln("NC Program contains toolpaths calculated using different tools");
        writeln("     Tool change is not available on Techman controller");
        writeln("**************************************************************");
        writeln("");
        break; // write warning message just onces
      }
    }
  }
  writeln("");
}

function createSubfolders(subfolder, sectionName) {
  var subName = FileSystem.getCombinedPath(subfolder, "Projects");
  if (!FileSystem.isFolder(subName)) {
    FileSystem.makeFolder(subName);
  }
  subName = FileSystem.getCombinedPath(subName, programName);
  if (!FileSystem.isFolder(subName)) {
    FileSystem.makeFolder(subName);
  }

  folders.push(subName);
  writeExternalDat(subName);
  writeExternalFlow(subName, sectionName);
  writeExternalProg(subName);
}

function onOpen() {
  // Machine requires output only in MM
  unit = MM;
  setWordSeparator(",");

  if (programComment) {
    baseName = programComment;
  } else {
    baseName = "Base" + getSection(0).workOffset;
  }

  // create subfolders as requested by Techman output structure
  subfolderPath = FileSystem.getCombinedPath(FileSystem.getFolderPath(getOutputPath()), programName);
  if (!FileSystem.isFolder(subfolderPath)) {
    FileSystem.makeFolder(subfolderPath);
  }

  writeDummy(subfolderPath);
  var section = getSection(0);

  // create a subfolder for each toolpath
  if (getNumberOfSections() > 1) {
    for (var i = 1; i <= getNumberOfSections(); ++i) {
      var programNameI = programName + "_" + i;
      var newFolder = FileSystem.getCombinedPath(subfolderPath, programNameI);
      if (!FileSystem.isFolder(newFolder)) {
        FileSystem.makeFolder(newFolder);
      }
      var section = getSection(i - 1);
      if (section.getTool().comment != "") {
        toolName = section.getTool().comment;
      } else {
        toolName = "TOOL" + section.getTool().number;
      }

      var secName = getOperationName(section, false);
      subfolderPathZip = "NONE";
      createSubfolders(newFolder, secName);
      writeExternalXml(newFolder);
    }
  } else {
    // case of a single toolpath
    subfolderPathZip = subfolderPath;

    if (section.getTool().comment != "") {
      toolName = section.getTool().comment;
    } else {
      toolName = "TOOL" + section.getTool().number;
    }

    var secName = getOperationName(section, false);
    createSubfolders(subfolderPath, secName);
    writeExternalXml(subfolderPath);
  }
  counter  = 0;
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
      setAdditiveProcessOn();
      break;
    case MOVEMENT_PLUNGE:
      break;
    case MOVEMENT_LEAD_IN:
      break;
    case MOVEMENT_LEAD_OUT:
      setAdditiveProcessOff();
      break;
    case MOVEMENT_LINK_TRANSITION:
      if (getProperty("endEffectorBehavior") == "OnOff") {
        setAdditiveProcessOff();
      }
      break;
    case MOVEMENT_BRIDGING:
      break;
    case MOVEMENT_LINK_DIRECT:
      break;
    case MOVEMENT_RAPID:
      setAdditiveProcessOff();
      break;
    case MOVEMENT_DEPOSITING:
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
    endEffectorState = 1;
    lines.push(formatComment(endEffectorCommandOn));
  }
}

function setAdditiveProcessOff() {
  if (getProperty("endEffectorBehavior") != "Off" && endEffectorState == 1) {
    endEffectorState = 0;
    lines.push(formatComment(endEffectorCommandOff));
  }
}

function getOperationName(section, showError) {
  var name;
  if (String(section.getParameter("operation-comment", "")).trim()) {
    name = section.getParameter("operation-comment");
  } else if (String(section.getParameter("notes", "")).trim()) {
    var notes = String(section.getParameter("notes")).split("\n");
    name = notes[0];
  } else {
    if (showError) {
      writeln("");
      writeln("    *** Please carefully check your output files ***");
      writeln("No operation comment or notes entered. Toolpath is unnamed");
      writeln("**********************************************************");
      writeln("");
    }
    name = ("unnamed_" + ++counter);
  }
  name = name.replace(/[^a-zA-Z0-9_()+]/g, "_");

  if (showError) {
    if (name == programName) {
      error(localize("Toolpath Name and File Name must be different."));
    }
  }
  return name;
}

function onSection() {
  pointIndex = 0;

  cancelRotation();
  if (!currentSection.isMultiAxis())  {
    setRotation(currentSection.workPlane);
  }

  opName = getOperationName(currentSection, true);
}

function onDwell(seconds) {
}

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
}

function onRapid(_x, _y, _z) {
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, getProperty("robotHeadAngle"), highFeedrate);
}

function onLinear(_x, _y, _z, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode is not supported by robot."));
    return;
  }
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, getProperty("robotHeadAngle"), highFeedrate);
}

function onLinearExtrude(_x, _y, _z, feed) {
  var workPlane = currentSection.workPlane.forward;
  writeRobotMove(_x, _y, _z, workPlane.x, workPlane.y, workPlane.z, getProperty("robotHeadAngle"), feed);
}

function onRapid5D(_x, _y, _z, _i, _j, _k) {
  writeRobotMove(_x, _y, _z,  _i, _j, _k, getProperty("robotHeadAngle"), highFeedrate);
}

function onLinear5D(_x, _y, _z, _i, _j, _k, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode is not supported by robot."));
    return;
  }
  writeRobotMove(_x, _y, _z,  _i, _j, _k, getProperty("robotHeadAngle"), feed);
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  linearize(tolerance);
}

function getTechmanEulerAngleFromVectorAndRotationAngle(vectorZ, angleInDegrees) {
  // X is rotated about standard XY-plane, not provided Z-axis
  var vectorX = new Vector();
  vectorX = Matrix.getZRotation(toRad(angleInDegrees)).transposed.multiply(new Vector(1, 0, 0));

  // X and Z form a non-orthogonal matrix, so cannot use standard matrix calculations
  var yAxis = Vector.cross(vectorZ, vectorX);
  var xAxis = Vector.cross(yAxis, vectorZ);
  yAxis = Vector.cross(vectorZ, xAxis);

  m = new Matrix(xAxis, yAxis, vectorZ).transposed;

  if (getProperty("flipToolFrame")) {
    m = Matrix.getAxisRotation(new Vector(0, 1, 0), Math.PI).multiply(m);
  }

  var ea = new Vector();

  // euler convention calculation
  var ea = m.transposed.getEuler2(settings.workPlaneMethod.eulerConvention).toDeg();

  return ea;
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

function writeRobotMove(x, y, z, i, j, k, angle, feed) {
  // Writes xyz ijk uvw coords for the solver
  var vz = new Vector();
  vz.x = i;
  vz.y = j;
  vz.z = k;

  var ea = getTechmanEulerAngleFromVectorAndRotationAngle(vz, angle);

  if (pointIndex == 0) {
    lines.push("  <Point Index=\"" + pointIndex++ + "\">");
    lines.push("    <Motion>PTP</Motion>");
    lines.push("    <coordinate>0.0,0.0,0.0,0.0,0.0,0.0</coordinate>");
    lines.push("    <joint_angle>" + getProperty("joint1") + "," + getProperty("joint2") + "," +  getProperty("joint3") + "," +
      getProperty("joint4") + "," +  getProperty("joint5") + "," +  getProperty("joint6") + "</joint_angle>");
    lines.push("    <tool_mode>" + xOutput.format(x) + yOutput.format(y) + zOutput.format(z) +
      iOutput.format(ea.x) + jOutput.format(ea.y) + kOutput.format(ea.z) + "</tool_mode>");
    lines.push("    <Blend>YES</Blend>");
    lines.push("    <BlendValue>" + getProperty("robotBlend") + "</BlendValue>");
    lines.push("    <LineABS>" + getProperty("lineAbs") + "</LineABS>");
    lines.push("    <LSAVelocity>" + getProperty("lsaVelocity") + "</LSAVelocity>");
    lines.push("    <LSTTTS>" + getProperty("lsttts") + "</LSTTTS>");
    lines.push("    <PLSAVelocity>" + getProperty("plsaVelocity") + "</PLSAVelocity>");
    lines.push("    <PLSTTTS>" + getProperty("plsttts") + "</PLSTTTS>");
    lines.push("    <LSPercentage>" + getProperty("lsPercentage") + "</LSPercentage>");
    lines.push("    <PSTTTSOF>" + getProperty("pstttsof") + "</PSTTTSOF>");
    lines.push("    <PSTTTS>" + getProperty("psttts") + "</PSTTTS>");
    lines.push("    <PSPercentage>" + getProperty("psPercentage") + "</PSPercentage>");
    lines.push("    <Config>" + getProperty("robotConfig") + "</Config>");
    lines.push("  </Point>");
  }

  lines.push("  <Point Index=\"" + pointIndex++ + "\">");
  lines.push("    <Motion>PLine</Motion>");
  lines.push("    <coordinate>0.0,0.0,0.0,0.0,0.0,0.0</coordinate>");
  lines.push("    <joint_angle>0.0,0.0,0.0,0.0,0.0,0.0</joint_angle>");
  lines.push("    <tool_mode>" + xOutput.format(x) + yOutput.format(y) + zOutput.format(z) +
  iOutput.format(ea.x) + jOutput.format(ea.y) + kOutput.format(ea.z) + "</tool_mode>");
  lines.push("    <Blend>YES</Blend>");
  lines.push("    <BlendValue>" + getProperty("robotBlend") + "</BlendValue>");
  lines.push("    <LineABS>" + getProperty("lineAbs") + "</LineABS>");
  lines.push("    <LSAVelocity>" + getProperty("lsaVelocity") + "</LSAVelocity>");
  lines.push("    <LSTTTS>" + getProperty("lsttts") + "</LSTTTS>");
  lines.push("    <PLSAVelocity>" + getProperty("plsaVelocity") + "</PLSAVelocity>");
  lines.push("    <PLSTTTS>" + getProperty("plsttts") + "</PLSTTTS>");
  lines.push("    <LSPercentage>" + getProperty("lsPercentage") + "</LSPercentage>");
  lines.push("    <PSTTTSOF>" + getProperty("pstttsof") + "</PSTTTSOF>");
  lines.push("    <PSTTTS>" + getProperty("psttts") + "</PSTTTS>");
  lines.push("    <PSPercentage>" + getProperty("psPercentage") + "</PSPercentage>");
  lines.push("    <Config>" + getProperty("robotConfig") + "</Config>");
  lines.push("  </Point>");
}

function writeExternalDat(folder) {
  var extFile = programName + ".dat";
  pathAutodesk = FileSystem.getCombinedPath(folder, extFile);

  redirectToFile(pathAutodesk);
  writeln("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>");
  writeln("<Root>");
  writeln("  <Version>1.04Export</Version>");
  writeln("  <RobotBases>");
  writeln("    <Base name=\"RobotBase\" basedata=\"0,0,0,0,0,0\" type=\"R\" number=\"0\" />");
  writeBlock("    <Base name=\"" + baseName + "\" basedata=\"" + getProperty("robotBase1"), getProperty("robotBase2"), getProperty("robotBase3"),
    getProperty("robotBase4"), getProperty("robotBase5"), getProperty("robotBase6") + "\" type=\"C\" number=\"1\" />");
  writeln("  </RobotBases>");
  writeln("</Root>");
  closeRedirection();
}

function writeExternalFlow(folder, sectionName) {
  var extFile = programName + ".flow";
  pathAutodesk = FileSystem.getCombinedPath(folder, extFile);

  redirectToFile(pathAutodesk);
  writeln("{");
  writeln("  \"FlowFile\": {");
  writeln("    \"Version\": \"1.14Export\"");
  writeln("  },");
  writeln("  \"BaseMathDefine\": null,");
  writeln("  \"BaseStart\": {");
  writeln("    \"Name\": \"Start\",");
  writeln("    \"ParentNode\": \"\",");
  writeln("    \"ChildNode\": \"Path1\",");
  writeln("    \"ReplaceName\": \"Start\",");
  writeln("    \"InitValue\": \"YES\",");
  writeln("    \"NodeType\": \"Start\",");
  writeln("    \"StickSpeed\": \"5\",");
  writeln("    \"Trialed\": \"False\",");
  writeln("    \"UpdateFlag\": \"\",");
  writeln("    \"ObjectNode\": {");
  writeln("      \"ProfileName\": \"All Full Speed Operation Space\",");
  writeln("      \"BindingSpace\": \"\",");
  writeln("      \"BindingBase\": \"RobotBase\"");
  writeln("    },");
  writeln("    \"SubFlowName\": \"\",");
  writeln("    \"ThreadName\": \"\",");
  writeln("    \"CompileOption\": null,");
  writeln("    \"Version\": \"1.80.2200.27277\",");
  writeln("    \"NonPauseFlag\": false,");
  writeln("    \"NoIOInitial\": false,");
  writeln("    \"Tag\": \"Main\",");
  writeln("    \"Attribute\": 0,");
  writeln("    \"EnableBlendingSetCmd\": false,");
  writeln("    \"EnableBusyLoopOptimization\": true");
  writeln("  },");
  writeln("  \"BaseObjectSingle\": [");
  writeln("    {");
  writeln("      \"Name\": \"Path1\",");
  writeln("      \"NodeID\": 1,");
  writeln("      \"ParentNode\": \"Start\",");
  writeln("      \"ChildNode\": \"\",");
  writeln("      \"ReplaceName\": \"Path1\",");
  writeln("      \"HMIFlowPoint\": [");
  writeln("        124.12916666666649,");
  writeln("        201.3729166666663");
  writeln("      ],");
  writeln("      \"NodeType\": \"Path\",");
  writeln("      \"NodeIcon\": \"\",");
  writeln("      \"GroupName\": null,");
  writeln("      \"ThreadName\": \"\",");
  writeln("      \"SubFlowName\": \"\",");
  writeln("      \"InitValue\": \"YES\",");
  writeln("      \"UpdateFlag\": \"\",");
  writeln("      \"ObjectNode\": {");
  writeln("        \"FileName\": \"" + sectionName + "\",");
  writeln("        \"PathSpeed\": 100,");
  writeln("        \"InitialPointMotion\": \"PLine\",");
  writeln("        \"InitialPointBlend\": \"YES\",");
  writeln("        \"InitialPointBlendValue\": 10,");
  writeln("        \"PSPercentage\": \"100\",");
  writeln("        \"PSTTTS\": \"500\",");
  writeln("        \"PSTTTSOF\": \"ON\",");
  writeln("        \"PTPType\": 0,");
  writeln("        \"LineABS\": \"OFF\",");
  writeln("        \"LSPercentage\": \"100\",");
  writeln("        \"LSAVelocity\": \"250\",");
  writeln("        \"LSTTTS\": \"500\",");
  writeln("        \"PLSAVelocity\": \"250\",");
  writeln("        \"PLSTTTS\": \"500\",");
  writeln("        \"BaseName\": \"" + baseName + "\",");
  writeln("        \"TCPName\": \"" + toolName + "\",");
  writeln("        \"EnableLoad\": false,");
  writeln("        \"LoadValue\": \"0\",");
  writeln("        \"IsKeepPose\": false,");
  writeln("        \"DisablePrecisePositioning\": false,");
  writeln("        \"DisableStickSpeedLink\": false,");
  writeln("        \"InitialPointDisableStickSpeedLink\": false,");
  writeln("        \"SmartPTPConfig\": false,");
  writeln("        \"pathBaseName\": \""  + baseName + "\",");
  writeln("        \"pathTcpName\": \"" + toolName + "\",");
  writeln("        \"IsBaseShifting\": false,");
  writeln("        \"IsToolShifting\": false,");
  writeln("        \"IsPvtMode\": false,");
  writeln("        \"IsBackwardDircetion\": false,");
  writeln("        \"IsFileNameVar\": false");
  writeln("      },");
  writeln("      \"Attribute\": 0");
  writeln("    }");
  writeln("  ],");
  writeln("  \"BaseObjectMulti\": null,");
  writeln("  \"SubFlowStart\": null,");
  writeln("  \"MultiThreadStart\": null");
  writeln("}");
  closeRedirection();
}

function writeExternalProg(folder) {
  var extFile = programName + ".prog";
  pathAutodesk = FileSystem.getCombinedPath(folder, extFile);

  redirectToFile(pathAutodesk);
  writeln("");
  closeRedirection();
}

function writeExternalXml(folder) {
  var extFile = "ConfigData.xml";

  pathAutodesk = FileSystem.getCombinedPath(folder, extFile);
  redirectToFile(pathAutodesk);
  writeln("<Configuration>");
  writeln(" <TCPConfig>");
  writeln("   <EndEffector order=\"1\" default=\"true\">");
  writeln("     <Name>" + toolName + "</Name>");
  writeln("     <Description />");
  writeln("     <GPTFF>");
  writeln("       <X>" + getProperty("robotTool1") + "</X>");
  writeln("       <Y>" + getProperty("robotTool2") + "</Y>");
  writeln("       <Z>" + getProperty("robotTool3") + "</Z>");
  writeln("       <W>" + getProperty("robotTool4") + "</W>");
  writeln("       <V>" + getProperty("robotTool5") + "</V>");
  writeln("       <U>" + getProperty("robotTool6") + "</U>");
  writeln("     </GPTFF>");
  writeln("     <Mass>0.0</Mass>");
  writeln("     <MassCenter>");
  writeln("       <X>" + getProperty("amassCenterX") + "</X>");
  writeln("       <Y>" + getProperty("amassCenterY") + "</Y>");
  writeln("       <Z>" + getProperty("amassCenterZ") + "</Z>");
  writeln("       <W>" + getProperty("massCenterW") + "</W>");
  writeln("       <V>" + getProperty("massCenterV") + "</V>");
  writeln("       <U>" + getProperty("massCenterU") + "</U>");
  writeln("     </MassCenter>");
  writeln("     <Inertia>");
  writeln("       <Ixx>" + getProperty("inertiaX") + "</Ixx>");
  writeln("       <Iyy>" + getProperty("inertiaY") + "</Iyy>");
  writeln("       <Izz>" + getProperty("inertiaZ") + "</Izz>");
  writeln("     </Inertia>");
  writeln("     <GPTCF>");
  writeln("       <X>0</X>");
  writeln("       <Y>0</Y>");
  writeln("       <Z>0</Z>");
  writeln("       <W>0</W>");
  writeln("       <V>0</V>");
  writeln("       <U>0</U>");
  writeln("     </GPTCF>");
  writeln("     <Studio_tcp />");
  writeln("     <Studio_stp />");
  writeln("   </EndEffector>");
  writeln(" </TCPConfig>");
  writeln("</Configuration>");
  closeRedirection();
}

function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    return;
  case COMMAND_COOLANT_ON:
    return;
  case COMMAND_STOP:
    return;
  case COMMAND_OPTIONAL_STOP:
    return;
  case COMMAND_START_SPINDLE:
    return;
  case COMMAND_LOAD_TOOL:
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    return;
  case COMMAND_START_CHIP_TRANSPORT:
    return;
  case COMMAND_STOP_CHIP_TRANSPORT:
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
}

function onSectionEnd() {
// writes a nc-file for each toolpath
  var toolpathFile = opName + ".path";

  if (folders.length > 0) {
    var toolpathIndex = currentSection.getId();
    pathAutodesk = FileSystem.getCombinedPath(folders[toolpathIndex], toolpathFile);
  } else {
    pathAutodesk = FileSystem.getCombinedPath(subfolderPath, toolpathFile);
  }

  redirectToFile(pathAutodesk);
  header();

  for (var i = 0; i < lines.length; ++i) {
    writeBlock(lines[i]);
  }
  writeln("</Root>");
  closeRedirection();
  lines = new Array();
}

/* call Techman zip function
 /V: author /P: Zip password
*/
function zipMe() {
  var exe = getProperty("exePath");
  var passwd = getProperty("zipPasswd");
  if (passwd.length < 8) {
    error(localize("TMExportZip needs a password at least 8 characters long. Please check your password."));
    return;
  }
  if (subfolderPathZip == "NONE") {
    for (var i = 0; i < folders.length; ++i) {
      var kkk = folders[i].indexOf("Projects");
      var subFold = folders[i].slice(0, kkk - 1) + "\"";
      var args = "/V:" + getProperty("fileAuthor") + " /P:" + passwd + " \"" + subFold;
      executeNoWait("\"" + exe + "\"", args, true, "");
    }
  } else {
    var args = "/V:" + getProperty("fileAuthor") + " /P:" + passwd + " \"" + subfolderPathZip + "\"";
    executeNoWait("\"" + exe + "\"", args, true, "");
  }
}

function onTerminate() {
  if (getProperty("auseZip")) {
    zipMe();
  }
}

function onClose() {
}

function setProperty(property, value) {
  properties[property].current = value;
}

