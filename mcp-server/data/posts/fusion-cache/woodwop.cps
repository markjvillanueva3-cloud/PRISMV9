/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  woodWOP post processor configuration.

  $Revision: 44090 7ce8321816d02b808a4194b97ca3c0c0149e2842 $
  $Date: 2023-09-26 17:31:14 $

  FORKID {2A265A9B-0B98-43a0-A447-177302864E1E}
*/

///////////////////////////////////////////////////////////////////////////////
//                        MANUAL NC COMMANDS
//
// The following ACTION commands are supported by this post.
//
//     GrooveWidth:width      - The groove width for sawing operations (NB).
//     ApproachMode:mode      - Contour/saw approach mode (MDA), can be 'tangent', 'lateral', 'vertical'
//     ExitMode:mode          - Contour/saw exit mode (MDE), can be 'tangent', 'lateral', 'vertical'
//     InsertDowel:Off, depth - Outputs a dowel insertion command after drilling a hole.
//                              Can be 'Off' to disable dowel insertion or the 'depth' to insert a dowel after each drilled hole.
//
///////////////////////////////////////////////////////////////////////////////

description = "woodWOP";
vendor = "HOMAG";
vendorUrl = "http://www.homag.com";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45892;

longDescription = "Generic woodWOP post with support for multi-axis machines. By default any drilling will be executed before all milling. You can turn off the 'doAllDrillingFirst' property to use the programmed order.";

extension = "mpr";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.3, MM); // avoid errors with smaller radii
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(90); // limit to 180deg for now to work around issues with 360deg arcs // limit to 90deg to avoid potential center calculation errors for CNC
allowHelicalMoves = true;
allowedCircularPlanes = (1 << PLANE_XY); // allow XY circular motion
mapWorkOrigin = false;

// user-defined properties
properties = {
  doAllDrillingFirst: {
    title      : "Do all drilling first",
    description: "Enable to reorder toolpath to do all drilling first.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useDrillThrough: {
    title      : "Use Drill Tip Through Bottom",
    description: "Enable to treat the Drill Tip Through Bottom checkbox as drilling through the part (LSL).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useBoreToolNumber: {
    title      : "Output tool number for drilling",
    description: "Enable to output tool numbers with drilling operations, disable to output the hole diameter.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useBoreFeeds: {
    title      : "Output feedrates for drilling",
    description: "Enable to output the programmed feedrate with drilling operations, disable to output the hole diameter.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  machineModel: {
    title      : "Machine type",
    description: "Select the machine type to output in the MAT command.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {title:"HOMAG", id:"HOMAG"},
      {title:"CF-HOMAG", id:"CF-HOMAG"},
      {title:"FK-HOMAG", id:"FK-HOMAG"},
      {title:"WEEKE", id:"WEEKE"}
    ],
    value: "WEEKE",
    scope: "post"
  },
  shiftOrigin: {
    title      : "Shift origin to part origin",
    description: "Enable to shift the WCS origin to the selected origin of the part as specifed by the 'Part origin' property.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  wcsOrigin: {
    title      : "Part origin",
    description: "The origin of the part can be on any corner of the part, select Lower left, Lower right, Upper right, or Upper left.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"Lower left", id:"F0"},
      {title:"Lower right", id:"01"},
      {title:"Upper right", id:"02"},
      {title:"Upper left", id:"03"}
    ],
    value: "F0",
    scope: "post"
  },
  stockDefinition: {
    title      : "Stock definition",
    description: "The stock definition can either be defined as the 'Size' of the stock or the 'Offset' of the stock from the finished part.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"Stock size", id:"size"},
      {title:"Stock offset", id:"offset"}
    ],
    value: "size",
    scope: "post"
  },
  freeMotionParkPosition: {
    title      : "Free motion park position",
    description: "Specifies where the machine should park after cutting.",
    group      : "homePositions",
    type       : "integer",
    values     : [
      0,
      1,
      2,
      3,
      4,
      5
    ],
    value: 1,
    scope: "post"
  },
  freeMotionAdditional: {
    title      : "Free motion additional",
    description: "Specifies how much to add to the free motion park position (in mm).",
    group      : "homePositions",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  isoOnly: {
    title      : "Output NC code in ISO format",
    description: "Enable to output all operations in ISO format using the Universal Makro.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  showSequenceNumbers: {
    title      : "Use sequence numbers",
    description: "Use sequence numbers for each ISO block.",
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
  showNotes: {
    title      : "Show notes",
    description: "Writes operation notes as comments in the ISO output code.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useComments: {
    title      : "Show comments",
    description: "Enable to write out standard commments using the '\\ comment' syntax.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  homePositionZ: {
    title      : "Z home position",
    description: "Z home position between multi-axis operations.",
    group      : "homePositions",
    type       : "spatial",
    value      : 100,
    scope      : "post"
  },
  useSmoothing: {
    title      : "Use smoothing",
    description: "Enables BSPLINE style smoothing for contours and multi-axis operations.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  smoothingPathDev: {
    title      : "Path deviation",
    description: "Allowed linear path deviation for smoothing.",
    group      : "preferences",
    type       : "number",
    value      : 0.02,
    scope      : "post"
  },
  smoothingTrackDev: {
    title      : "Angular deviation",
    description: "Allowed rotary angle deviation for smoothing.",
    group      : "preferences",
    type       : "number",
    value      : 1,
    scope      : "post"
  },
  useRadius: {
    title      : "Radius arcs",
    description: "If yes is selected, arcs are output using radius values rather than IJK in ISO mode.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useMultiAxisFeatures: {
    title      : "Use ISO work planes",
    description: "Enable to output work planes for 3+2 operations in ISO mode.  Disable to output 3+2 operations using TCP in ISO mode.",
    group      : "multiAxis",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  abcToler: {
    title      : "A-axis tolerance",
    description: "The tolerance used to determine the output of the A-axis.",
    group      : "multiAxis",
    type       : "spatial",
    value      : 0.001,
    scope      : "post"
  },
  sawMode: {
    title      : "Saw mode",
    description: "Defines the macro to use when a saw blade is used.  'Contour' outputs the 193 Sawing_contour macro, 'Groove' outputs the '109 Sawing_vertical' and '124 Sawing_with_A_angle' macros.",
    group      : "saw",
    type       : "enum",
    values     : [
      {title:"Contour", id:"contour"},
      {title:"Groove", id:"groove"}
    ],
    value: "groove",
    scope: "post"
  },
  startRoutine: {
    title      : "Start subroutine",
    description: "Select the start subroutine to output in ISO mode.",
    group      : "formats",
    type       : "enum",
    values     : [
      {title:"UNCVK40", id:"UNCVK40"},
      {title:"OUNCVK40", id:"OUNCVK40"}
    ],
    value: "UNCVK40",
    scope: "post"
  }
};

groupDefinitions = {
  saw: {title:"Saw Aggregate", collapsed:true, description:"Settings related to an aggregate saw attachment", order:25},
};

var nFormat = createFormat({prefix:"N", decimals:0, width:4, zeropad:true});
var gFormat = createFormat({prefix:"G", decimals:0});

var xFormat = createFormat({decimals:4});
var yFormat = createFormat({decimals:4});
var zFormat = createFormat({decimals:4});
var xyzFormat = createFormat({decimals:4});
var eulerFormat = createFormat({decimals:3, scale:DEG});
var abcFormat = createFormat({decimals:3, forceDecimal:true, trim:false, scale:DEG});
var radianFormat = createFormat({decimals:3, forceDecimal:true});
var rFormat = createFormat({decimals:4});
var spatialFormat = createFormat({decimals:4});
var feedFormat = createFormat({decimals:3, scale:0.001});
var isoFeedFormat = createFormat({decimals:3, forceDecimal:true, trim:false, scale:0.001});
var integerFormat = createFormat({decimals:0});
var wcsFormat = createFormat({decimals:2, width:2, zeropad:true});

var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var zOutput = createOutputVariable({prefix:"Z"}, xyzFormat);
var aOutput = createOutputVariable({prefix:"A"}, abcFormat);
var bOutput = createOutputVariable({prefix:"B"}, abcFormat);
var cOutput = createOutputVariable({prefix:"C"}, abcFormat);
var feedOutput = createOutputVariable({prefix:"F"}, isoFeedFormat);

// circular output
var iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat);
var jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat);
var kOutput = createOutputVariable({prefix:"K", control:CONTROL_FORCE}, xyzFormat);

var gMotionModal = createOutputVariable({}, gFormat); // modal group 1 // G0-G3, ...

// fixed settings
var useMultiAxisFeatures = true; // use #CS work planes
var useABCPrepositioning = true; // position ABC axes prior to #CS work plane
var retracted = false; // specifies that the tool has been retracted to the safe plane

var REDIRECT_ID = 99999;
var SAW_OFF = 0;
var SAW_CONTOUR = 1;
var SAW_GROOVE = 2;

// collected state
var inContour = false;
var contourId = 0;
var entityId = 0;
var currentFeed = -1;
var machining = [];
var definedWorkPlanes = [];
var virtualConfiguration = {};
var sequenceNumber;
var redirectBuffer = [];
var redirectIndex = 0;
var previousABC = new Vector(0, 0, 0);
var useISO;
var tcpActive;
var workOrigin;
var sawIsActive = SAW_OFF;
var workpiece;
var workpieceDelta;
var workpieceOffset;
var part;
var partDelta;
var grooveWidth = 0;
var approachMode = "SEN"; // vertical entry to contour
var exitMode = "SEN_AB"; // vertical exit from contour
var insertDowel = false;
var dowelDepth = 0;
var translation;
var identityWCS;

/**
  Writes the specified block.
*/
function writeSimpleBlock() {
  writeWords(arguments);
}

/**
  Writes the specified ISO block
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  if (getProperty("showSequenceNumbers")) {
    if (sequenceNumber > 9999) {
      sequenceNumber = getProperty("sequenceNumberStart");
    }
    writeWords2(nFormat.format(sequenceNumber), arguments);
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    writeWords(arguments);
  }
}

/**
  Output a woodWOP comment.
*/
function writeSimpleComment(text) {
  if (getProperty("useComments")) {
    writeSimpleBlock("\\ " + text);
  }
}

/**
  Output an ISO comment.
*/
function writeComment(text) {
  writeBlock("(" + text + ")");
}

/**
  Output a KM comment.
*/
function writeKMComment(text) {
  writeVar("KM", text);
}

function writeVal(name, value) {
  writeln(name + "=" + value);
}

function writeVar(name, value) {
  writeln(formatVar(name, value));

}
function formatVar(name, value) {
  return name + "=\"" + value + "\"";
}

var SMOOTH_DEFINE = 0;
var SMOOTH_RESET = 1;
var SMOOTH_ENABLE = 2;
var SMOOTH_DISABLE = 3;
var currentSmoothing = SMOOTH_DISABLE;
var smoothing = {enabled:false, pathDev:0.02, trackDev:1};
function setSmoothing(type) {
  if (!smoothing.enabled || type == currentSmoothing ||
    (hasParameter("operation-strategy") && (getParameter("operation-strategy") == "drill"))) {
    return;
  }

  switch (type) {
  case SMOOTH_DEFINE:
    writeln(
      "#HSC[BSPLINE PATH_DEV=" + spatialFormat.format(smoothing.pathDev) +
      " TRACK_DEV=" + spatialFormat.format(smoothing.trackDev) + "]"
    );
    writeln("#SET SLOPE PROFIL[3]");
    currentSmoothing = SMOOTH_DISABLE;
    break;
  case SMOOTH_RESET:
    writeln("#SET SLOPE PROFIL");
    currentSmoothing = SMOOTH_DISABLE;
    break;
  case SMOOTH_ENABLE:
    writeln("#HSC ON");
    currentSmoothing = SMOOTH_ENABLE;
    break;
  case SMOOTH_DISABLE:
    writeln("#HSC OFF");
    currentSmoothing = SMOOTH_DISABLE;
    break;
  }
}

function coordinatesAreSame(xyz1, xyz2) {
  if (xyzFormat.getResultingValue(xyz1.x) != xyzFormat.getResultingValue(xyz2.x) ||
      xyzFormat.getResultingValue(xyz1.y) != xyzFormat.getResultingValue(xyz2.y) ||
      xyzFormat.getResultingValue(xyz1.z) != xyzFormat.getResultingValue(xyz2.z)) {
    return false;
  }
  return true;
}

function anglesAreSame(abc1, abc2) {
  if (eulerFormat.getResultingValue(abc1.x) != eulerFormat.getResultingValue(abc2.x) ||
      eulerFormat.getResultingValue(abc1.y) != eulerFormat.getResultingValue(abc2.y) ||
      eulerFormat.getResultingValue(abc1.z) != eulerFormat.getResultingValue(abc2.z)) {
    return false;
  }
  return true;
}

function getDefinedWorkPlane(sectionId) {
  for (var i = 0; i < definedWorkPlanes.length; i++) {
    if (definedWorkPlanes[i].section == sectionId) {
      return definedWorkPlanes[i];
    }
  }
  return definedWorkPlanes[0];
}

function onOpen() {

  unit = MM; // output units are always in MM
  sequenceNumber = getProperty("sequenceNumberStart");
  useMultiAxisFeatures = getProperty("useMultiAxisFeatures");
  identityWCS = getProperty("wcsOrigin");
  aOutput.setTolerance(getProperty("abcToler"));

  // smoothing variables
  smoothing.enabled = getProperty("useSmoothing");
  smoothing.pathDev = getProperty("smoothingPathDev");
  smoothing.trackDev = getProperty("smoothingTrackDev");

  // Define machine configuration if program has multi-axis operation(s)
  if (isMultiAxis() || getProperty("isoOnly")) {
    // physical machine configuration
    var headAngle = -39.18;
    var aAxis = createAxis({coordinate:0, table:false, axis:[0, -Math.cos(toRad(headAngle)), -Math.sin(toRad(headAngle))], range:[-189, 189]});
    var cAxis = createAxis({coordinate:2, table:false, axis:[0, 0, -1], range:[-365, 365], cyclic:false, reset:1});
    machineConfiguration = new MachineConfiguration(aAxis, cAxis);

    // virtual machine configuration expected by controller
    var virtualAAxis = createAxis({coordinate:0, table:false, axis:[-1, 0, 0], range:[-99.99, 99.99]});
    var virtualCAxis = createAxis({coordinate:2, table:false, axis:[0, 0, -1], cyclic:true}); // range: [-365, 365], cyclic: false});
    virtualConfiguration = new MachineConfiguration(virtualAAxis, virtualCAxis);

    setMachineConfiguration(machineConfiguration);
    optimizeMachineAngles2(0); // TCP mode
  }

  if (!machineConfiguration.isMachineCoordinate(0)) {
    aOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(1)) {
    bOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(2)) {
    cOutput.disable();
  }

  if (programName) {
    writeSimpleComment(programName);
  }
  if (programComment) {
    writeSimpleComment(programComment);
  }

  writeln("[H");
  writeVar("VERSION", "4.0");
  writeVar("INCH", 0 /*(unit == IN) ? 1 : 0*/); // 0 mm, 1 inch // we map inches to mm
  writeVar("MAT", getProperty("machineModel")); // HOMAG, CF-HOMAG, FK-HOMAG, WEEKE
  writeVar("OP", getProperty("doAllDrillingFirst") ? 1 : 0);
  writeVar("FM", getProperty("freeMotionParkPosition")); // free motion part posisiton 0-4
  writeVar("FW", spatialFormat.format(getProperty("freeMotionAdditional"))); // in mm

  workpiece = getWorkpiece();
  workpieceDelta = Vector.diff(workpiece.upper, workpiece.lower);
  part = new BoundingBox(new Vector(getGlobalParameter("part-lower-x", 0), getGlobalParameter("part-lower-y", 0), getGlobalParameter("part-lower-z", 0)),
    new Vector(getGlobalParameter("part-upper-x", 0), getGlobalParameter("part-upper-y", 0), getGlobalParameter("part-upper-z", 0)));
  partDelta = Vector.diff(part.upper, part.lower);
  workpieceOffset = getWorkpieceOffset();

  // variables
  writeln("");
  writeln("[001");
  /*
  writeVar("L", 0);
  writeVar("KM", "");
  writeVar("B", 0);
  writeVar("KM", "");
  writeVar("D", 0);
  writeVar("KM", "");
  */
  writeVar("i", 25.4);
  writeKMComment("Inch conversion");
  if (partDelta.isNonZero()) {
    writeVar("L", spatialFormat.format(partDelta.x));
    writeKMComment("Part Length");
    writeVar("W", spatialFormat.format(partDelta.y));
    writeKMComment("Part Width");
  }
  if (workpieceDelta.isNonZero()) {
    if (getProperty("stockDefinition") == "offset") {
      writeVar("SOX", spatialFormat.format(workpieceDelta.x - partDelta.x));
      writeKMComment("Stock Offset X");
      writeVar("SOY", spatialFormat.format(workpieceDelta.y - partDelta.y));
      writeKMComment("Stock Offset Y");
    } else {
      writeVar("SL", spatialFormat.format(workpieceDelta.x));
      writeKMComment("Stock Length");
      writeVar("SW", spatialFormat.format(workpieceDelta.y));
      writeKMComment("Stock Width");
    }
    writeVar("T", spatialFormat.format(workpieceDelta.z));
    writeKMComment("Stock Height");
    writeVar("POX", spatialFormat.format(part.lower.x - workpiece.lower.x));
    writeKMComment("Part Offset X");
    writeVar("POY", spatialFormat.format(part.lower.y - workpiece.lower.y));
    writeKMComment("Part Offset Y");
  }
  writeVar("X", 0);
  writeKMComment("");
  writeVar("Y", 0);
  writeKMComment("");

  // workpiece
  if (workpieceDelta.isNonZero()) {
    writeln("");
    writeln("<100 \\WerkStck\\");
    writeVar("LA", "L"); // length of finished part
    writeVar("BR", "W"); // width of finished part
    writeVar("DI", "T"); // thickness of stock
    writeVar("FNX", "POX"); // finished part origin in X
    writeVar("FNY", "POY"); // finished part origin in Y
    if (getProperty("stockDefinition") == "size") {
      writeVar("RL", "SL"); // length of raw piece
      writeVar("RB", "SW"); // width of raw piece
    } else {
      writeVar("AX", "SOX"); // offset in X of finished part
      writeVar("AY", "SOY"); // offset in Y of finished part
    }
  }

  if (!getProperty("isoOnly")) {
    var workPlaneID = 4;
    var id;
    setFormats(identityWCS);
    var numberOfSections = getNumberOfSections();
    for (var i = 0; i < numberOfSections; ++i) {
      section = getSection(i);
      var euler = new Vector(0, 0, 0);
      var abc = new Vector(0, 0, 0);
      var origin = new Vector(0, 0, 0);
      var horizontalDrilling = isDrillingCycle(section) && isPerpto(section.workPlane.forward, new Vector(0, 0, 1));
      if (!section.isMultiAxis()) {
        if (getSawMode(section.getTool()) != SAW_GROOVE) { // saw cuts/horizontal drilling use F0 coordinate system
          origin = getWorkOrigin(section);
          euler = section.workPlane.getEuler2(EULER_ZXZ_R); // used for contours
          abc = getWorkPlaneMachineABC(section.workPlane, false); // used for drilling
        }
      }
      var found = false;
      for (var j = 0; j < definedWorkPlanes.length; ++j) {
        if (anglesAreSame(euler, definedWorkPlanes[j].euler) && (euler.isZero() || coordinatesAreSame(origin, definedWorkPlanes[j].origin))) {
          id = definedWorkPlanes[j].id;
          found = true;
          break;
        }
      }
      if (!found) {
        id = euler.isZero() ? identityWCS : wcsFormat.format(workPlaneID++);
        if ((id != identityWCS || id == "F0")) {
          var origin = id == identityWCS ? new Vector(0, 0, 0) : origin;
          writeln("");
          writeln("[K");
          writeln("<00 \\Koordinatensystem\\");
          writeVar("NR", id);
          writeVar("XP", xFormat.format(origin.x)); // X-origin
          writeVar("XF", 1); // X-scale
          writeVar("YP", yFormat.format(origin.y)); // Y-origin
          writeVar("YF", 1); // Y-scale
          writeVar("ZP", zFormat.format(origin.z)); // Z-origin
          writeVar("ZF", 1); // Z-scale
          writeVar("D1", eulerFormat.format(euler.x)); // rotation about Z
          writeVar("KI", eulerFormat.format(euler.y)); // rotation about X'
          writeVar("D2", eulerFormat.format(euler.z)); // rotation about Z"
          writeVar("MI", 0); // mirrored
        }
      }
      definedWorkPlanes.push({section:i, id:id, origin:origin, euler:euler, abc:abc, workPlane:section.workPlane});
    }
  }
}

function onComment(message) {
  var section = typeof currentSection == "undefined" ? getSection(0) : currentSection;
  if (section.isMultiAxis() || getProperty("isoOnly")) {
    writeComment(message);
  } else {
    writeSimpleComment(message);
  }
}

function parseNumbers(_text, _max) {
  // extract values between commas
  var sText1 = _text;
  var sText2 = new Array();
  var retCoord = new Array();
  sText2 = sText1.split(",");

  // too many values, return 0
  if (sText2.length > _max) {
    return retCoord;
  }

  // parse numbers
  for (i = 0; i < sText2.length; i++) {
    retCoord[i] = parseFloat(sText2[i]);
    if (isNaN(retCoord[i])) {
      return new Array();
    }
  }

  // return number of values
  return retCoord;
}

function onParameter(name, value) {
  if (name == "action") {
    var sText1 = String(value).toUpperCase();
    var sText2 = new Array();
    sText2 = sText1.split(":");
    if (sText2.length != 2) {
      error(localize("Invalid action command") + ": " + value);
      return;
    }
    if (sText2[0] == "GROOVEWIDTH") {
      var num = parseNumbers(sText2[1], 1);
      if (num.length != 1) {
        error(localize("Invalid GROOVEWIDTH command" + ": " + value));
        return;
      }
      grooveWidth = num[0];
    } else if (sText2[0] == "APPROACHMODE") {
      switch (sText2[1]) {
      case "TANGENT":
        approachMode = "TAN";
        break;
      case "LATERAL":
        approachMode = "SEI";
        break;
      case "VERTICAL":
        approachMode = "SEN";
        break;
      default:
        error(localize("The APPROACHMODE value must be 'TANGENT', 'LATERAL', or 'VERTICAL'"));
        return;
      }
    } else if (sText2[0] == "EXITMODE") {
      switch (sText2[1]) {
      case "TANGENT":
        exitMode = "TAN_AB";
        break;
      case "LATERAL":
        exitMode = "SEI_AB";
        break;
      case "VERTICAL":
        exitMode = "SEN_AB";
        break;
      default:
        error(localize("The EXITMODE value must be 'TANGENT', 'LATERAL', or 'VERTICAL'"));
        return;
      }
    } else if (sText2[0] == "INSERTDOWEL") {
      if (sText2[1] == "OFF") {
        insertDowel = false;
      } else {
        var num = parseNumbers(sText2[1], 1);
        if (num.length != 1) {
          error(localize("Invalid INSERTDOWEL command" + ": " + value));
          return;
        }
        dowelDepth = num[0];
        insertDowel = true;
      }
    } else {
      error(localize("Unknown Action command") + ": " + value);
    }
  }
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

var currentWorkPlaneABC = undefined;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function cancelWorkPlane() {
  writeln("#CS OFF"); // cancel frame
  forceWorkPlane();
}

function setWorkPlane(abc, euler) {
  if (currentSection.isMultiAxis()) {
    return; // ignore
  }

  if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
    return; // no change
  }

  onCommand(COMMAND_UNLOCK_MULTI_AXIS);
  /* if (!retracted) {
    writeRetract(Z);
  }*/

  if (useMultiAxisFeatures) {
    if (machineConfiguration.isMultiAxisConfiguration() && useABCPrepositioning) {
      if (euler.isNonZero()) {
        var origin = getWorkOrigin(currentSection);
        writeln(
          "#CS ON[" +
          xyzFormat.format(origin.x) + "," + xyzFormat.format(origin.y) + "," + xyzFormat.format(origin.z) + "," +
          eulerFormat.format(euler.z) + "," + eulerFormat.format(euler.y) + "," + eulerFormat.format(euler.x) + "]"
        ); // set frame
      }
      gMotionModal.reset();
      var abc1 = getABC(abc);
      writeBlock(
        gMotionModal.format(0),
        conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc1.x)),
        conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc1.y)),
        conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc1.z))
      );
    }
  } else {
    var abc1 = getABC(abc);
    writeBlock(
      gMotionModal.format(0),
      conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc1.x)),
      conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc1.y)),
      conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc1.z))
    );
  }

  onCommand(COMMAND_LOCK_MULTI_AXIS);

  currentWorkPlaneABC = abc;
}

var closestABC = false; // choose closest machine angles
var currentMachineABC;

function getWorkPlaneMachineABC(workPlane, rotate) {
  // calculate ISO plane
  if (useISO) {
    return getWorkPlaneMachineISO(workPlane, rotate);
  }

  var W = workPlane; // map to global frame

  // Workplane angles are between -360 - 360 : Beta=A, Alpha=C
  var abc = W.getTurnAndTilt(Y, Z);
  if (abc.y != 0) {
    abc.setZ(Math.PI + abc.z); // axis rotates in opposite direction, can't specify direction with Turn and Tilt
  }
  if (abc.y < 0) {
    abc.setY(-abc.y);
    abc.setZ(abc.z + Math.PI);
  }
  if (abc.z < 0) {
    abc.setZ(abc.z + (Math.PI * 2));
  }
  if (eulerFormat.format(abc.z) > 360) {
    abc.setZ(abc.z - (Math.PI * 2));
  }
  return abc;
}

function getWorkPlaneMachineISO(workPlane, rotate) {
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

  if (rotate) {
    var tcp = true;
    if (tcp) {
      setRotation(W); // TCP mode
    } else {
      var O = machineConfiguration.getOrientation(abc);
      var R = machineConfiguration.getRemainingOrientation(abc, W);
      setRotation(R);
    }
  }

  return abc;
}

/** calculates the virtual ABC position from the physical ABC position */
function getABC(_abc) {
  var axis = machineConfiguration.getDirection(_abc);
  var both = virtualConfiguration.getABCByDirectionBoth(axis);

  var abc1 = remapABC(both.first, _abc);
  var abc2 = remapABC(both.second, _abc);

  var abc = new Vector(abc1.x, abc1.y, abc1.z);
  if (Math.abs(abc2.x - _abc.x) < Math.abs(abc1.x - _abc.x)) {
    abc = new Vector(abc2.x, abc2.y, abc2.z);
  }
  if (abcFormat.format(abc.x) == 0) { // protect against C0 when tool is vertical
    abc.setZ(previousABC.z);
  }

  if (!virtualConfiguration.getAxisV().isCyclic()) {
    if ((radianFormat.getResultingValue(abc.x) < virtualConfiguration.getAxisU().getRange().getMinimum()) ||
        (radianFormat.getResultingValue(abc.x) > virtualConfiguration.getAxisU().getRange().getMaximum())) {
      error(subst(localize("A%1 is outside of the virtual limits of the machine"), abcFormat.format(abc.x)));
      return abc;
    }
    if ((radianFormat.getResultingValue(abc.z) < virtualConfiguration.getAxisV().getRange().getMinimum()) ||
        (radianFormat.getResultingValue(abc.z) > virtualConfiguration.getAxisV().getRange().getMaximum())) {
      error(subst(localize("C%1 is outside of the virtual limits of the machine"), abcFormat.format(abc.z)));
      return abc;
    }
  }
  return abc;
}

/** calculate the closest virtual C-axis to the physical C-axis position */
function remapABC(_abc, _currentABC) {
  var abc = new Vector(_abc.x, _abc.y, _abc.z);
  if (abcFormat.getResultingValue(_abc.x) == 0 && abcFormat.getResultingValue(_abc.z) == 0) {
    abc.setZ(cOutput.getCurrent());
  }
  var dist = Math.abs(abc.z - _currentABC.z);

  if (virtualConfiguration.getAxisV().isCyclic() || ((_abc.z + Math.PI * 2) <= virtualConfiguration.getAxisV().getRange().getMaximum())) {
    var dist1 = Math.abs((_abc.z + Math.PI * 2) - _currentABC.z);
    if (dist1 < dist) {
      dist = dist1;
      abc.setZ(_abc.z + Math.PI * 2);
    }
  }
  if (virtualConfiguration.getAxisV().isCyclic() || ((_abc.z - Math.PI * 2) >= virtualConfiguration.getAxisV().getRange().getMinimum())) {
    var dist1 = Math.abs((_abc.z - Math.PI * 2) - _currentABC.z);
    if (dist1 < dist) {
      dist = dist1;
      abc.setZ(_abc.z - Math.PI * 2);
    }
  }
  return abc;
}

function getWorkpieceOffset() {
  switch (getProperty("wcsOrigin")) {
  case "F0":
    partOrigin = part.lower;
    workpieceOrigin = workpiece.lower;
    break;
  case "01":
    partOrigin = new Vector(part.upper.x, part.lower.y, part.lower.z);
    workpieceOrigin = new Vector(workpiece.upper.x, workpiece.lower.y, workpiece.lower.z);
    break;
  case "02":
    partOrigin = new Vector(part.upper.x, part.upper.y, part.lower.z);
    workpieceOrigin = new Vector(workpiece.upper.x, workpiece.upper.y, workpiece.lower.z);
    break;
  case "03":
    partOrigin = new Vector(part.lower.x, part.upper.y, part.lower.z);
    workpieceOrigin = new Vector(workpiece.lower.x, workpiece.upper.y, workpiece.lower.z);
    break;
  }
  return Vector.diff(partOrigin, workpieceOrigin);
}

function getWorkOrigin(section) {
  workpiece = getWorkpiece();
  switch (getProperty("wcsOrigin")) {
  case "F0": // lower left
    shift = workpiece.lower;
    break;
  case "01": // lower right
    var shift = new Vector(workpiece.upper.x, workpiece.lower.y, workpiece.lower.z);
    break;
  case "02": // upper right
    var shift = new Vector(workpiece.upper.x, workpiece.upper.y, workpiece.lower.z);
    break;
  case "03": // upper left
    var shift = new Vector(workpiece.lower.x, workpiece.upper.y, workpiece.lower.z);
    break;
  }
  var origin = Vector.diff(Vector.diff(section.workOrigin, shift), workpieceOffset);
  return origin;
}

function wcsMirrored(wcs) {
  return {
    x       : (wcs == "01" || wcs == "02") ? -1 : 1,
    y       : (wcs == "02" || wcs == "03") ? -1 : 1,
    z       : 1,
    mirrored: wcs == "01" || wcs == "03"
  };
}

function setFormats(wcs) {
  xFormat.setScale(wcsMirrored(wcs).x);
  yFormat.setScale(wcsMirrored(wcs).y);
  zFormat.setScale(wcsMirrored(wcs).z);
}

function isPerpto(a, b) {
  return Math.abs(Vector.dot(a, b)) < (1e-7);
}

function onSection() {
  sawIsActive = getSawMode(tool);
  compensatedMove = RADIUS_COMPENSATION_OFF;

  // origin is always at lower left of part, except for 3+2 operations, which use the operation origin
  workOrigin = getWorkOrigin(currentSection);
  var forward = currentSection.workPlane.forward;
  workpiece = getWorkpiece();
  var horizontalDrilling = !getProperty("isoOnly") &&
    (getParameter("operation-strategy", "") == "drill") && isPerpto(forward, new Vector(0, 0, 1));
  cancelTransformation();
  translation = getTranslation();
  if (horizontalDrilling) { // horizontal drilling uses TCP coordinates
    setRotation(currentSection.workPlane);
  }

  if (getProperty("shiftOrigin")) {
    if (horizontalDrilling) {
      translation = Vector.sum(translation, workOrigin);
    } else if ((currentSection.isMultiAxis() || getProperty("isoOnly") || sawIsActive == SAW_GROOVE)) {
      translation = Vector.sum(translation, workOrigin);
      setRotation(currentSection.workPlane); // TCP mode
      setTranslation(translation);
    } else if (isSameDirection(forward, new Vector(0, 0, 1))) {
      if (getDefinedWorkPlane(getCurrentSectionId()).id == identityWCS) { // F0 coordinate system does not define origin, so a translation must be added
        translation = Vector.sum(translation, workOrigin);
        setTranslation(translation);
      }
    } else if (getDefinedWorkPlane(getCurrentSectionId()).id != identityWCS) {
      translation = Vector.sum(translation, Vector.diff(part.lower, partOrigin));
    }
  }

  useISO = currentSection.isMultiAxis() || getProperty("isoOnly");
  tcpActive = true;

  if (!useISO) {
    setFormats(getDefinedWorkPlane(currentSection.getId()).id);
  }

  var abc = new Vector(0, 0, 0);
  var abcPlane = new Vector(0, 0, 0);

  if (useISO) {
    if (currentSection.isMultiAxis()) {
      abc = currentSection.getInitialToolAxisABC();
    } else { // pure 3D
      abc = getWorkPlaneMachineABC(currentSection.workPlane, !useMultiAxisFeatures);
      if (useMultiAxisFeatures) {
        var euler = currentSection.workPlane.getEuler2(EULER_ZYX_R);
        abcPlane = new Vector(euler.x, euler.y, euler.z);
        tcpActive = abc.isZero();
      }
    }
    redirectToBuffer(); // ISO operations output in onClose along with all other operations

    var comment = hasParameter("operation-comment") ? getParameter("operation-comment") : "";
    var notes = (getProperty("showNotes") && hasParameter("notes")) ? getParameter("notes") : "";
    if (comment || notes) {
      writeln("");
      writeln("<101 \\Kommentar\\");
      if (comment) {
        writeKMComment(comment);
        if (notes) {
          writeKMComment("");
        }
      }
      if (notes) {
        var lines = String(notes).split("\n");
        var r1 = new RegExp("^[\\s]+", "g");
        var r2 = new RegExp("[\\s]+$", "g");
        for (line in lines) {
          var comment = lines[line].replace(r1, "").replace(r2, "");
          if (comment) {
            writeKMComment(comment);
          }
        }
      }
    }

    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    var tcpPosition = tcpActive ? initialPosition : currentSection.workPlane.multiply(initialPosition);
    writeln("");
    writeln("<153\\Universal Makro\\");
    writeVar("LOCAL", 1);
    writeVar("XA", xyzFormat.format(tcpPosition.x)); // initial XYZ position
    writeVar("YA", xyzFormat.format(tcpPosition.y));
    writeVar("ZA", xyzFormat.format(tcpPosition.z));
    writeVar("WI", abcFormat.format(abc.z)); // initial C-axis rotation
    writeVar("WZ", tool.number);
    writeVar("SM", 1); // rpm mode
    writeVar("S_", integerFormat.format(spindleSpeed));
    if (hasParameter("operation:tool_feedCutting")) {
      writeVar("F_", isoFeedFormat.format(getParameter("operation:tool_feedCutting")));
    }
    writeVar("WWP", 0); // 1 = evaluate woodWOP parameters
    writeVar("BBA", 0); // 1 = evaluate processing range
    writeVar("KRI", 0); // 1 = spindle is not orientated perpendicular
    writeVar("P1", 0); // parameters
    writeVar("P2", 0);
    writeVar("P3", 0);
    writeVar("P4", 0);
    writeVar("PX1", 0); // operation range
    writeVar("PY1", 0);
    writeVar("PX2", 0);
    writeVar("PY2", 0);

    writeln("");
    writeln("STARTLOCAL");
    writeln("L " + getProperty("startRoutine"));

    if (spindleSpeed != 0) {
      writeln("\"STRSPINDEL\"");
    }
    setSmoothing(SMOOTH_DEFINE);

    if (tcpActive) {
      writeln("#RTCP ON");
      forceAny();
    } else {
      writeln("#RTCP ON"); // required with #CS plane
      forceWorkPlane();
      setWorkPlane(abc, abcPlane);
      forceXYZ();
    }

    gMotionModal.reset();
    if (tcpActive) { // multi-axis
      var abc1 = getABC(abc);
      writeBlock(gMotionModal.format(0), cOutput.format(abc1.z));
      writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), aOutput.format(abc1.x));
      writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      previousABC = new Vector(abc1.x, abc1.y, abc1.z);
    } else { // 3 + 2
      writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z));
    }
  } else {
    if (section.getParameter("operation:compensationType") == "wear") {
      error(localize("Wear compensation is not allowed."));
      return;
    }
  }
}

function onSpindleSpeed(spindleSpeed) {
  if (useISO) { // cannot output spindle speed in the middle of a tpaCAD contour
    writeVar("S_A", integerFormat.format(spindleSpeed));
  }
}

function onDwell(seconds) {
}

function onCycle() {
}

function onCyclePoint(x, y, z) {
  if (useISO) {
    expandCyclePoint(x, y, z);
  } else {
    cycle.dwell = getParameter("operation:dwellBeforeRetract", 1) ? cycle.dwell : 0;
    var through = (getProperty("useDrillThrough") && getParameter("operation:drillTipThroughBottom", 0)) ||
      ((cycle.depth + 0.001) >= (workpiece.upper.z - workpiece.lower.z));
    machining.push({
      id         : -1,
      sectionId  : getCurrentSectionId(),
      p          : new Vector(x, y, z),
      cycle      : cycle,
      type       : cycleType,
      through    : through,
      translation: translation,
      dowel      : insertDowel,
      dowelDepth : dowelDepth});
  }
}

function onCycleEnd() {
  if (!cycleExpanded) {
    zOutput.reset();
  }
}

var pendingRadiusCompensation = -1;
var compensatedMove;
var firstCompensatedMove;

function onRadiusCompensation() {
  pendingRadiusCompensation = radiusCompensation;
  compensatedMove = radiusCompensation;
  firstCompensatedMove = true;
}

// buffer straight line moves to reduce profile size
var linearMove;
var linearFeed;
var linearDirection;
var linearIsBuffered = false;

function pushLinear(x, y, z, feed) {
  // don't output duplicate points
  var currentPosition = getCurrentPosition();
  if ((xyzFormat.getResultingValue(x) == xyzFormat.getResultingValue(currentPosition.x)) &&
      (xyzFormat.getResultingValue(y) == xyzFormat.getResultingValue(currentPosition.y)) &&
      (xyzFormat.getResultingValue(z) == xyzFormat.getResultingValue(currentPosition.z))) { // ignore zero length lines
    return;
  }

  // buffer moves in same direction
  var dir = Vector.diff(new Vector(x, y, z), getCurrentPosition()).getNormalized();
  if (linearIsBuffered) {
    if (isSameDirection(dir, linearDirection) && feed == linearFeed) {
      linearMove = new Vector(x, y, z);
      return;
    }
    flushLinear(linearMove.x, linearMove.y, linearMove.z, linearFeed);
  }

  // buffer move if next record is linear
  if (getNextRecord().getType() == RECORD_LINEAR) {
    linearMove = new Vector(x, y, z);
    linearFeed = feed;
    linearDirection = dir;
    linearIsBuffered = true;
  } else {
    flushLinear(x, y, z, feed);
  }
}

function flushLinear(x, y, z, feed) {
  writeln("");
  writeln("$E" + entityId);
  writeln("KL");
  writeVal("X", xFormat.format(x));
  writeVal("Y", yFormat.format(y));
  writeVal("Z", zFormat.format(z));
  entityId += 1;

  linearIsBuffered = false;
}

function compensationEntryMove() {
  if (getParameter("operation:compensationType", "computer") != "computer") {
    if (compensatedMove == RADIUS_COMPENSATION_OFF) {
      return true;
    }
    // ignore first compensation move, it is not part of the lead-in and causes problems with the profile
    if (firstCompensatedMove) {
      firstCompensatedMove = false;
      return true;
    }
  }
  return false;
}

function onRapid(_x, _y, _z) {
  if (useISO) {
    var x = xOutput.format(_x);
    var y = yOutput.format(_y);
    var z = zOutput.format(_z);
    if (x || y || z) {
      if (pendingRadiusCompensation >= 0) {
        error(localize("Radius compensation mode cannot be changed at rapid traversal."));
        return;
      }
      setSmoothing(SMOOTH_DISABLE);
      writeBlock(gMotionModal.format(0), x, y, z);
      forceFeed();
    }
    return;
  }

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation is not supported."));
    return;
  }

  if (sawIsActive == SAW_GROOVE) {
    bufferSawMove(_x, _y, _z, 0);
    return;
  }

  if (linearIsBuffered) {
    flushLinear(linearMove.x, linearMove.y, linearMove.z, linearFeed);
  }

  if (inContour) {
    machining.push({
      id       : contourId,
      sectionId: getCurrentSectionId(),
      entities : entityId,
      feed     : currentFeed,
      saw      : sawIsActive,
      mda      : approachMode,
      mde      : exitMode
    });
    inContour = false;
  }
}

function onLinear(_x, _y, _z, feed) {
  if (useISO) {
    setSmoothing(SMOOTH_ENABLE);

    var x = xOutput.format(_x);
    var y = yOutput.format(_y);
    var z = zOutput.format(_z);
    var f = feedOutput.format(feed);
    if (x || y || z) {
      if (pendingRadiusCompensation >= 0) {
        pendingRadiusCompensation = -1;
        switch (radiusCompensation) {
        case RADIUS_COMPENSATION_LEFT:
          writeBlock(gMotionModal.format(1), x, y, z, f, gFormat.format(41));
          break;
        case RADIUS_COMPENSATION_RIGHT:
          writeBlock(gMotionModal.format(1), x, y, z, f, gFormat.format(42));
          break;
        default:
          writeBlock(gMotionModal.format(1), x, y, z, f, gFormat.format(40));
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
    return;
  }

  // ignore all uncompensated moves since compensation is active for the entire operation
  pendingRadiusCompensation = -1;
  if (compensationEntryMove()) {
    return;
  }

  if (sawIsActive == SAW_GROOVE) {
    bufferSawMove(_x, _y, _z, feed);
    return;
  }

  if (!inContour) {
    writeln("");
    contourId += 1;
    writeln("]" + contourId);
    entityId = 0;

    var start = getCurrentPosition();
    writeln("");
    writeln("$E" + entityId);
    writeln("KP");
    writeVal("X", xFormat.format(start.x));
    writeVal("Y", yFormat.format(start.y));
    writeVal("Z", zFormat.format(start.z));
    writeVal("KO", getDefinedWorkPlane(getCurrentSectionId()).id);
    entityId += 1;

    currentFeed = feed;
    inContour = true;
  }

  if ((movement == MOVEMENT_CUTTING) || (movement == MOVEMENT_FINISH_CUTTING)) {
    currentFeed = feed;
  }
  // currentFeed = Math.min(currentFeed, feed);

  pushLinear(_x, _y, _z, feed);
}

var sawPositions = new Array();

function getSawMode(tool) {
  return tool.type == TOOL_MILLING_SLOT ? (getProperty("sawMode") == "contour" ? SAW_CONTOUR : SAW_GROOVE) : SAW_OFF;
}

function bufferSawMove(x, y, z, feed) {
  if (sawPositions.length == 0 || xyzFormat.getResultingValue(Vector.diff(new Vector(x, y, z), sawPositions[sawPositions.length - 1].xyz).length)) {
    sawPositions.push({xyz:new Vector(x, y, z), feed:feed, movement:movement});
  }
}

function flushSawMove() {
  // break out saw moves
  var currentPosition = undefined;
  var sawMoves = new Array();
  for (var i = 0; i < sawPositions.length; ++i) {
    switch (sawPositions[i].movement) {
    case MOVEMENT_RAPID:
      currentPosition = sawPositions[i].xyz;
      break;
    case MOVEMENT_LEAD_IN:
    case MOVEMENT_LEAD_OUT:
      currentPosition = sawPositions[i].xyz;
      break;
    case MOVEMENT_CUTTING:
    case MOVEMENT_FINISH_CUTTING:
    case MOVEMENT_REDUCED:
      if (currentPosition == undefined) {
        currentPosition = sawPositions[i].xyz;
      } else {
        sawMoves.push({start:currentPosition, end:sawPositions[i].xyz, feed:sawPositions[i].feed, used:true});
        currentPosition = sawPositions[i].xyz;
      }
      break;
    default:
      currentPosition = sawPositions[i].xyz;
      break;
    }
  }

  if (false) { // DEBUG
    for (var i = 0; i < sawMoves.length; ++i) {
      if (sawMoves.used) {
        writeDebug("");
        writeDebug("start = " + sawMoves[i].start);
        writeDebug("end = " + sawMoves[i].end);
      }
    }
  }

  // validate saw moves
  if (sawMoves.length > 1) {
    var sawDirection = Vector.diff(sawMoves[0].end, sawMoves[0].start).getNormalized();
    for (var i = 1; i < sawMoves.length; ++i) {
      var moveDirection = Vector.diff(sawMoves[i].end, sawMoves[i].start).getNormalized();
      if (xyzFormat.getResultingValue(Vector.diff(sawMoves[i - 1].end, sawMoves[i].start).length) <= toPreciseUnit(0.001, IN)) {
        if (Vector.diff(moveDirection, sawDirection).length > toPreciseUnit(0.001, IN)) { // saw direction changes
          error(localize("Saw move changes direction during cut."));
          return;
        } else { // remove saw cuts in same direction
          sawMoves[i - 1].used = false;
          sawMoves[i].start = sawMoves[i - 1].start;
        }
      }
    }
  }

  // output saw moves
  writeSawMoves(sawMoves);
}

function writeSawMoves(sawMoves) {
  for (var i = 0; i < sawMoves.length; ++i) {
    if (sawMoves[i].used) {
      var start = new Vector(sawMoves[i].start.x, sawMoves[i].start.y, sawMoves[i].start.z);
      var end = new Vector(sawMoves[i].end.x, sawMoves[i].end.y, sawMoves[i].end.z);
      var forward = currentSection.workPlane.forward; // getRotation().multiply(new Vector(0, 0, 1));

      // output points are along edge of cutter
      var dir = "left";
      if (hasParameter("operation:compensationType") && hasParameter("operation:compensation")) {
        if (getParameter("operation:compensationType") != "control") {
          var offsetVector = new Vector(0, 0, 0);
          dir = getParameter("operation:compensation");
          var sawDirection = Vector.diff(end, start).getNormalized();
          if (dir == "right") {
            offsetVector = Vector.product(Vector.cross(forward, sawDirection).getNormalized(), (tool.diameter / 2));
          } else if (dir == "left") {
            offsetVector = Vector.product(Vector.cross(sawDirection, forward).getNormalized(), (tool.diameter / 2));
          }
          start = Vector.sum(start, offsetVector);
          end = Vector.sum(end, offsetVector);
        }
      }

      // output points are at center of blade
      start = Vector.sum(start, Vector.product(forward, (tool.fluteLength / 2)));
      end = Vector.sum(end, Vector.product(forward, (tool.fluteLength / 2)));

      // write out saw operation
      machining.push({
        id         : contourId,
        sectionId  : getCurrentSectionId(),
        entities   : entityId,
        feed       : sawMoves[i].feed,
        saw        : sawIsActive,
        start      : start,
        end        : end,
        cutSide    : dir,
        grooveWidth: (grooveWidth == 0 ? tool.getFluteLength() : grooveWidth),
        mda        : approachMode,
        mde        : exitMode
      });
    }
  }
  sawPositions = new Array(); // zero out saw moves
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode cannot be changed at rapid traversal."));
    return;
  }

  var abc = getABC(new Vector(_a, _b, _c));

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(abc.x);
  var b = bOutput.format(abc.y);
  var c = cOutput.format(abc.z);
  if (x || y || z || a || b || c) {
    setSmoothing(SMOOTH_DISABLE);
    writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
    forceFeed();
  }
  previousABC = new Vector(abc.x, abc.y, abc.z);
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
    return;
  }

  setSmoothing(SMOOTH_ENABLE);
  var abc = getABC(new Vector(_a, _b, _c));

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = aOutput.format(abc.x);
  var b = bOutput.format(abc.y);
  var c = cOutput.format(abc.z);
  var f = feedOutput.format(feed);
  if (x || y || z || a || b || c) {
    writeBlock(gMotionModal.format(1), x, y, z, a, b, c, f);
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gMotionModal.format(1), f);
    }
  }
  previousABC = new Vector(abc.x, abc.y, abc.z);
}

// Start of onRewindMachine logic
/***** Be sure to add 'safeRetractDistance' to post getProperty(" ")*****/
var performRewinds = true; // enables the onRewindMachine logic
var safeRetractFeed = (unit == IN) ? 20 : 500;
var safePlungeFeed = (unit == IN) ? 10 : 250;
var stockAllowance = new Vector(toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN));

/** Allow user to override the onRewind logic. */
function onRewindMachineEntry(_a, _b, _c) {
  return false;
}

/** Retract to safe position before indexing rotaries. */
function moveToSafeRetractPosition(isRetracted) {
  if (getProperty("homePositionZ") <= getCurrentPosition().z) {
    error(localize("Z-Home position must be higher than current Z position during a retract and reconfigure."));
    return;
  }
  writeRetract(Z);
}

/** Return from safe position after indexing rotaries. */
function returnFromSafeRetractPosition(position, abc) {
  forceXYZ();
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
  onRapid5D(position.x, position.y, position.z, abc.x, abc.y, abc.z);
  //zOutput.enable();
  //onExpandedRapid(position.x, position.y, position.z);
}

/** Intersect the point-vector with the stock box. */
function intersectStock(point, direction) {
  var stock = getWorkpiece();
  stock.expandTo(Vector.sum(stock.lower, getTranslation()));
  stock.expandTo(Vector.sum(stock.upper, getTranslation()));
  var intersection = stock.getRayIntersection(point, direction, stockAllowance);
  return intersection === null ? undefined : intersection.second;
}

/** Calculates the retract point using the stock box and safe retract distance. */
function getRetractPosition(currentPosition, currentDirection) {
  var retractPos = intersectStock(currentPosition, currentDirection);
  if ((retractPos == undefined) || (Vector.diff(currentPosition, retractPos).length > tool.getBodyLength())) {
    if (tool.getFluteLength() != 0) {
      retractPos = Vector.sum(currentPosition, Vector.product(currentDirection, tool.getFluteLength()));
    }
  }
  if ((retractPos != undefined) && getProperty("safeRetractDistance")) {
    retractPos = Vector.sum(retractPos, Vector.product(currentDirection, getProperty("safeRetractDistance")));
  }
  return retractPos;
}

/** Determines if the angle passed to onRewindMachine is a valid starting position. */
function isRewindAngleValid(_a, _b, _c) {
  // make sure the angles are different from the last output angles
  if (!abcFormat.areDifferent(getCurrentDirection().x, _a) &&
      !abcFormat.areDifferent(getCurrentDirection().y, _b) &&
      !abcFormat.areDifferent(getCurrentDirection().z, _c)) {
    error(
      localize("REWIND: Rewind angles are the same as the previous angles: ") +
      abcFormat.format(_a) + ", " + abcFormat.format(_b) + ", " + abcFormat.format(_c)
    );
    return false;
  }

  // make sure angles are within the limits of the machine
  var abc = new Array(_a, _b, _c);
  var ix = machineConfiguration.getAxisU().getCoordinate();
  var failed = false;
  if ((ix != -1) && !machineConfiguration.getAxisU().isSupported(abc[ix])) {
    failed = true;
  }
  ix = machineConfiguration.getAxisV().getCoordinate();
  if ((ix != -1) && !machineConfiguration.getAxisV().isSupported(abc[ix])) {
    failed = true;
  }
  ix = machineConfiguration.getAxisW().getCoordinate();
  if ((ix != -1) && !machineConfiguration.getAxisW().isSupported(abc[ix])) {
    failed = true;
  }
  if (failed) {
    error(
      localize("REWIND: Rewind angles are outside the limits of the machine: ") +
      abcFormat.format(_a) + ", " + abcFormat.format(_b) + ", " + abcFormat.format(_c)
    );
    return false;
  }

  return true;
}

function onRewindMachine(_a, _b, _c) {

  var abc = getABC(new Vector(_a, _b, _c));

  if (!performRewinds) {
    error(localize("REWIND: Rewind of machine is required for simultaneous multi-axis toolpath and has been disabled."));
    return;
  }

  // Allow user to override rewind logic
  if (onRewindMachineEntry(_a, _b, _c)) {
    return;
  }

  // Determine if input angles are valid or will cause a crash
  if (!isRewindAngleValid(_a, _b, _c)) {
    error(
      localize("REWIND: Rewind angles are invalid:") +
      abcFormat.format(abc.x) + ", " + abcFormat.format(abc.y) + ", " + abcFormat.format(abc.z)
    );
    return;
  }

  // Work with the tool end point
  if (currentSection.getOptimizedTCPMode() == 0) {
    currentTool = getCurrentPosition();
  } else {
    currentTool = machineConfiguration.getOrientation(getCurrentDirection()).multiply(getCurrentPosition());
  }
  var currentABC = getCurrentDirection();
  var currentDirection = machineConfiguration.getDirection(currentABC);

  // Calculate the retract position
  var retractPosition = getRetractPosition(currentTool, currentDirection);

  // Output warning that axes take longest route
  if (retractPosition == undefined) {
    error(localize("REWIND: Cannot calculate retract position."));
    return;
  } else {
    var text = localize("REWIND: Tool is retracting due to rotary axes limits.");
    warning(text);
    writeComment(text);
  }

  // Move to retract position
  var position;
  if (currentSection.getOptimizedTCPMode() == 0) {
    position = retractPosition;
  } else {
    position = machineConfiguration.getOrientation(getCurrentDirection()).getTransposed().multiply(retractPosition);
  }
  onLinear5D(position.x, position.y, position.z, currentABC.x, currentABC.y, currentABC.z, safeRetractFeed);

  // Cancel so that tool doesn't follow tables
  //writeBlock(gFormat.format(49), formatComment("TCPC OFF"));

  // Position to safe machine position for rewinding axes
  moveToSafeRetractPosition(false);

  // Rotate axes to new position above reentry position
  xOutput.disable();
  yOutput.disable();
  zOutput.disable();
  onRapid5D(position.x, position.y, position.z, _a, _b, _c);
  xOutput.enable();
  yOutput.enable();
  zOutput.enable();

  // Reinstate
  // writeBlock(gFormat.format(234), //hFormat.format(tool.lengthOffset), formatComment("TCPC ON"));

  // Move back to position above part
  if (currentSection.getOptimizedTCPMode() != 0) {
    position = machineConfiguration.getOrientation(new Vector(_a, _b, _c)).getTransposed().multiply(retractPosition);
  }
  returnFromSafeRetractPosition(position, new Vector(_a, _b, _c));

  // Plunge tool back to original position
  if (currentSection.getOptimizedTCPMode() != 0) {
    currentTool = machineConfiguration.getOrientation(new Vector(_a, _b, _c)).getTransposed().multiply(currentTool);
  }
  onLinear5D(currentTool.x, currentTool.y, currentTool.z, _a, _b, _c, safePlungeFeed);
}
// End of onRewindMachine logic

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (useISO) {
    isoCircular(clockwise, cx, cy, cz, x, y, z, feed);
    return;
  }

  // ignore all uncompensated moves since compensation is active for the entire operation
  if (compensationEntryMove()) {
    return;
  }

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  if (sawIsActive == SAW_GROOVE) {
    bufferSawMove(x, y, z, feed);
    return;
  }

  if (linearIsBuffered) {
    flushLinear(linearMove.x, linearMove.y, linearMove.z, linearFeed);
  }

  /*
  if ((movement != MOVEMENT_CUTTING) && (movement != MOVEMENT_FINISH_CUTTING)) {
    if (inContour) {
      machining.push({id:contourId, sectionId:getCurrentSectionId(), entities:entityId, feed:currentFeed});
      inContour = false;
    }
    return;
  }
  */

  var KO = getDefinedWorkPlane(getCurrentSectionId()).id;
  if (!inContour) {
    writeln("");
    writeln("]" + contourId);
    contourId += 1;
    entityId = 0;

    var start = getCurrentPosition();
    writeln("");
    writeln("$E" + entityId);
    writeln("KP");
    writeVal("X", xFormat.format(start.x));
    writeVal("Y", yFormat.format(start.y));
    writeVal("Z", zFormat.format(start.z));
    writeVal("KO", KO);
    entityId += 1;

    currentFeed = feed;
    inContour = true;
  }

  if ((movement == MOVEMENT_CUTTING) || (movement == MOVEMENT_FINISH_CUTTING)) {
    currentFeed = feed;
  }
  // currentFeed = Math.min(currentFeed, feed);

  switch (getCircularPlane()) {
  case PLANE_XY:
    writeln("");
    writeln("$E" + entityId);
    writeln("KA");
    writeVal("X", xFormat.format(x));
    writeVal("Y", yFormat.format(y));
    writeVal("Z", zFormat.format(z));
    // var ip = getPositionU(0.5);
    // writeVal("I", xyzFormat.format(ip.x));
    // writeVal("J", xyzFormat.format(ip.y));
    // writeVal("K", xyzFormat.format(ip.z));
    writeVal("R", rFormat.format(getCircularRadius() + toPreciseUnit(0.002, MM))); // around rounding issue
    var small = Math.abs(getCircularSweep()) <= Math.PI;
    clockwise = wcsMirrored(KO).mirrored ? !clockwise : clockwise;
    if (small) {
      writeVal("DS", clockwise ? 0 : 1);
    } else {
      writeVal("DS", clockwise ? 2 : 3);
    }
    entityId += 1;
    break;
  default:
    linearize(tolerance);
  }
}

function isoCircular(clockwise, cx, cy, cz, x, y, z, feed) {

  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();

  if (isFullCircle()) {
    if (getProperty("useRadius") || isHelical()) { // radius mode does not support full arcs
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx - start.x), jOutput.format(cy - start.y), feedOutput.format(feed));
      break;
    case PLANE_ZX:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx - start.x), kOutput.format(cz - start.z), feedOutput.format(feed));
      break;
    case PLANE_YZ:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), jOutput.format(cy - start.y), kOutput.format(cz - start.z), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else if (!getProperty("useRadius")) {
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), jOutput.format(cy - start.y), feedOutput.format(feed));
      break;
    case PLANE_ZX:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x), kOutput.format(cz - start.z), feedOutput.format(feed));
      break;
    case PLANE_YZ:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y), kOutput.format(cz - start.z), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else { // use radius mode
    var r = getCircularRadius();
    if (toDeg(getCircularSweep()) > (180 + 1e-9)) {
      r = -r; // allow up to <360 deg arcs
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), feedOutput.format(feed));
      break;
    case PLANE_ZX:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), feedOutput.format(feed));
      break;
    case PLANE_YZ:
      writeBlock(gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + rFormat.format(r), feedOutput.format(feed));
      break;
    default:
      linearize(tolerance);
    }
  }
}

function onCommand(command) {
}

function onSectionEnd() {
  if (useISO) {
    writeRetract(Z);
    if (aOutput.getCurrent() != 0) {
      writeBlock(gMotionModal.format(0), aOutput.format(0));
    }
    if (cOutput.getCurrent() != 0) {
      writeBlock(gMotionModal.format(0), cOutput.format(0));
    }
    if (tcpActive) {
      writeln("#RTCP OFF");
    } else {
      cancelWorkPlane();
      writeln("#RTCP OFF");
    }
    setSmoothing(SMOOTH_DISABLE);
    setSmoothing(SMOOTH_RESET);
    writeln("L " + (getProperty("startRoutine") == "UNCVK40" ?  "UNCHK40" : "OUNCHK40"));
    writeln("ENDLOCAL");
  }

  if (isRedirecting()) {
    redirectBuffer[redirectIndex] = getRedirectionBuffer();
    closeRedirection();
    machining.push({id:REDIRECT_ID, index:redirectIndex++});
  } else if (sawIsActive == SAW_GROOVE) {
    flushSawMove();
  } else if (inContour) {
    machining.push({
      id       : contourId,
      sectionId: getCurrentSectionId(),
      entities : entityId,
      feed     : currentFeed,
      saw      : sawIsActive,
      mda      : approachMode,
      mde      : exitMode
    });
    inContour = false;
  }
  grooveWidth = 0;
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
      if (!machineConfiguration.hasHomePositionX()) {
        error(localize("A home position has not been defined in X."));
        return;
      }
      words.push(xOutput.format(machineConfiguration.getHomePositionX()));
      break;
    case Y:
      if (!machineConfiguration.hasHomePositionY()) {
        error(localize("A home position has not been defined in Y."));
        return;
      }
      words.push(yOutput.format(machineConfiguration.getHomePositionY()));
      break;
    case Z:
      if (getProperty("homePositionZ") > getCurrentPosition().z) {
        words.push(zOutput.format(getProperty("homePositionZ")));
        retracted = true; // specifies that the tool has been retracted to the safe plane
      }
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

function writeDrillBlock(m, wpData, tool) {
  var forward = wpData.workPlane.forward;
  var horizontalDrilling = isPerpto(forward, new Vector(0, 0, 1));
  var KO = horizontalDrilling ? identityWCS : wpData.id;
  setFormats(KO);
  if (isSameDirection(forward, new Vector(0, 0, 1)) || isSameDirection(forward, new Vector(0, 0, -1))) { // XY drilling operation
    var BM = (m.type == "chip-breaking" || m.type == "deep-drilling") ? "BMR" : (m.through ? "LSL" : "LS");
    if (isSameDirection(forward, new Vector(0, 0, -1))) {
      m.p = wpData.workPlane.multiply(m.p);
      BM += "U";
    }
    writeln("<102 \\BohrVert\\");
    writeVar("XA", xFormat.format(m.p.x));
    writeVar("YA", yFormat.format(m.p.y));
    if (xyzFormat.getResultingValue(m.cycle.stock - part.upper.z) != 0 ||
        xyzFormat.getResultingValue(part.upper.z - workpiece.upper.z)) {
      writeVar("ZA", zFormat.format(m.cycle.stock + m.translation.z)); // requires absolute value
    }
    if (m.type == "chip-breaking" || m.type == "deep-drilling") {
      writeVar("ZT", xyzFormat.format(m.cycle.incrementalDepth));
      writeVar("RM", m.type == "chip-breaking" ? "@" + xyzFormat.format(m.cycle.chipBreakDistance) : xyzFormat.format(m.cycle.retract - m.cycle.stock));
    }
    if (m.cycle.dwell > 0 || (m.type == "chip-breaking" || m.type == "deep-drilling")) {
      writeVar("VW", m.cycle.dwell);
    }
    writeVar("BM", BM);
    writeVar("TI", xyzFormat.format(m.cycle.depth));
    if (getProperty("useBoreToolNumber")) {
      writeVar("TNO", tool.number);
    } else {
      writeVar("DU", spatialFormat.format(tool.diameter));
    }
    writeVar("F_", getProperty("useBoreFeeds") ? feedFormat.format(m.cycle.feedrate) : "STANDARD");
    if (KO != "F0") {
      writeVar("KO", KO);
    }
  } else if (isPerpto(forward, new Vector(0, 0, 1))) { // horizontal drilling
    var BM;
    var WI = "";
    if (isSameDirection(forward, new Vector(1, 0, 0))) {
      BM = wcsMirrored(KO).x > 0 ? "XM" : "XP";
    } else if (isSameDirection(forward, new Vector(-1, 0, 0))) {
      BM = wcsMirrored(KO).x > 0 ? "XP" : "XM";
    } else if (isSameDirection(forward, new Vector(0, 1, 0))) {
      BM = wcsMirrored(KO).y > 0 ? "YM" : "YP";
    } else if (isSameDirection(forward, new Vector(0, -1, 0))) {
      BM = wcsMirrored(KO).y > 0 ? "YP" : "YM";
    } else {
      BM = "C";
      var angle = wpData.abc.z;
      var mirrored = wcsMirrored(KO);
      if (mirrored.x == -1) {
        angle = mirrored.y == 1 ? angle = toRad(180) - angle : toRad(180) + angle;
      } else if (mirrored.y == -1) {
        angle = -angle;
      }
      var WI = eulerFormat.format(angle);
    }
    var BM2 = (m.type == "chip-breaking" || m.type == "deep-drilling") ? "BMR" : "STD";
    m.p = Vector.sum(m.p, Vector.product(forward, m.cycle.depth));
    var xyz = Vector.sum(m.p, m.translation);

    writeln("<103 \\BohrHoriz\\");
    writeVar("XA", xFormat.format(xyz.x));
    writeVar("YA", yFormat.format(xyz.y));
    writeVar("ZA", zFormat.format(xyz.z));
    writeVar("BM", BM);
    writeVar("BM2", BM2);
    if (WI) {
      writeVar("WI", WI);
    }
    if (m.type == "chip-breaking" || m.type == "deep-drilling") {
      writeVar("ZT", xyzFormat.format(m.cycle.incrementalDepth));
      writeVar("RM", m.type == "chip-breaking" ? "@" + xyzFormat.format(m.cycle.chipBreakDistance) : xyzFormat.format(m.cycle.retract - m.cycle.stock));
    }
    if (m.cycle.dwell > 0 || (m.type == "chip-breaking" || m.type == "deep-drilling")) {
      writeVar("VW", m.cycle.dwell);
    }
    writeVar("TI", xyzFormat.format(m.cycle.depth));
    if (getProperty("useBoreToolNumber")) {
      writeVar("TNO", tool.number);
    } else {
      writeVar("DU", spatialFormat.format(tool.diameter));
    }
    writeVar("F_", getProperty("useBoreFeeds") ? feedFormat.format(m.cycle.feedrate) : "STANDARD");
    if (KO != "F0") {
      writeVar("KO", KO);
    }
  } else { // 3+2 drilling operation
    var BM = (m.type == "chip-breaking" || m.type == "deep-drilling") ? "BMR" : "STD";
    m.p.setZ(m.p.z + m.cycle.depth);
    var xyz = m.p; // wpData.workPlane.multiply(m.p);
    writeln("<104 \\BohrUniv\\");
    writeVar("XA", xyzFormat.format(xyz.x));
    writeVar("YA", xyzFormat.format(xyz.y));
    writeVar("ZA", xyzFormat.format(xyz.z));
    writeVar("BM", BM);
    // writeVar("CA", eulerFormat.format(wpData.abc.z));
    // writeVar("WI", eulerFormat.format(wpData.abc.y));
    if (m.type == "chip-breaking" || m.type == "deep-drilling") {
      writeVar("ZT", xyzFormat.format(m.cycle.incrementalDepth));
      writeVar("RM", m.type == "chip-breaking" ? "@" + xyzFormat.format(m.cycle.chipBreakDistance) : xyzFormat.format(m.cycle.retract - m.cycle.stock));
    }
    if (m.cycle.dwell > 0 || (m.type == "chip-breaking" || m.type == "deep-drilling")) {
      writeVar("VW", m.cycle.dwell);
    }
    writeVar("TI", xyzFormat.format(m.cycle.depth));
    if (getProperty("useBoreToolNumber")) {
      writeVar("TNO", tool.number);
    } else {
      writeVar("DU", spatialFormat.format(tool.diameter));
    }
    writeVar("F_", getProperty("useBoreFeeds") ? feedFormat.format(m.cycle.feedrate) : "STANDARD");
    writeVar("KO", KO);
  }

  // insert dowel
  if (m.dowel) {
    if (xyzFormat.getResultingValue(m.dowelDepth) > xyzFormat.getResultingValue(m.cycle.depth)) {
      error(subst(localize("The dowel depth of %1 is greater than the drilling depth of %2"),
        xyzFormat.getResultingValue(m.dowelDepth), xyzFormat.getResultingValue(m.cycle.depth)));
    }
    writeln("");
    writeln("<139 \\Komponente\\");
    writeVar("IN", "ABD_ENU.MPR");
    writeVar("XA", "0.0");
    writeVar("YA", "0.0");
    writeVar("ZA", "0.0");
    writeVar("EM", "0.0");
    writeVar("VA", "Edge 2");
    writeVar("VA", "Pos " + xyzFormat.format(m.dowelDepth));
    writeVar("VA", "ZPos " + xyzFormat.format(xyz.z));
    writeVar("VA", "Diameter " + spatialFormat.format(tool.diameter));
    writeVar("VA", "depth " + xyzFormat.format(m.cycle.depth));
    writeVar("VA", "dowel 1");
    writeVar("VA", "glue 1");
    writeVar("VA", "number 1");
    writeVar("VA", "grid 0");
    writeVar("VA", "center 0");
    writeVar("VA", "inch 0");
    writeVar("VA", "KAT=Komponentenmakro");
    writeVar("MNM", "ABD_ENU");
    writeVar("ORI", "");
    writeVar("KO", KO);
  }
}

function writeContourBlock(m, wpData, tool) {
  var forward = wpData.workPlane.forward;
  var section = getSection(wpData.section);
  var wrk = "NOWRK";
  if (section.getParameter("operation:compensationType") == "control") {
    wrk = section.getParameter("operation:compensation") == "left" ? "WRKL" : "WRKR";
  }
  if (wpData.id == identityWCS) { // vertical contour
    writeln("<105 \\Konturfraesen\\");
    writeVar("EA", m.id + ":" + 0);
    writeVar("MDA", m.mda);
    writeVar("EE", m.id + ":" + (m.entities - 1));
    writeVar("MDE", m.mde);
    writeVar("RK", wrk);
    writeVar("TNO", tool.number);
    writeVar("ZA", "@0"); // ignore all Z in program
    writeVar("F_", feedFormat.format(m.feed));
    writeVar("SM", 1); // rpm
    if (getProperty("useSmoothing")) {
      writeVar("KG", 2); // 0 = off, 1 = Contour mode, 2 = Bspline Mode
      writeVar("MBA", spatialFormat.format(getProperty("smoothingPathDev")));
      writeVar("MWA", spatialFormat.format(getProperty("smoothingTrackDev")));
    }
    writeVar("S_A", integerFormat.format(tool.spindleRPM)); // use cutting speed, cannot output spindle speed in the middle of a contour
  } else if (Math.abs(Vector.dot(forward, new Vector(0, 0, 1))) < 1e-7) { // horizontal contour
    writeln("<133 \\Horizontal Konturfraesen\\");
    writeVar("EA", m.id + ":" + 0);
    writeVar("MDA", m.mda);
    writeVar("RK", wrk);
    writeVar("EE", m.id + ":" + (m.entities - 1));
    writeVar("MDE", m.mde);
    writeVar("EM", 0);
    writeVar("RI", 1);
    writeVar("TNO", tool.number);
    writeVar("SM", 1); // rpm
    writeVar("S_A", integerFormat.format(tool.spindleRPM)); // use cutting speed, cannot output spindle speed in the middle of a contour
    writeVar("F_", feedFormat.format(m.feed));
    writeVar("AB", 0); // distance to programmed contour
    writeVar("ZM", "@0"); // Z-mass
    if (getProperty("useSmoothing")) {
      writeVar("KG", 2); // 0 = off, 1 = Contour mode, 2 = Bspline Mode
      writeVar("MBA", spatialFormat.format(getProperty("smoothingPathDev")));
      writeVar("MWA", spatialFormat.format(getProperty("smoothingTrackDev")));
    }
  } else { // 3+2 contour
    writeln("<140 \\Vektor Konturfraesen\\");
    writeVar("EA", m.id + ":" + 0);
    writeVar("MDA", m.mda);
    writeVar("RK", wrk);
    writeVar("EE", m.id + ":" + (m.entities - 1));
    writeVar("MDE", m.mde);
    writeVar("EM", 0);
    writeVar("RI", 1);
    writeVar("TNO", tool.number);
    writeVar("SM", 1); // rpm
    writeVar("S_A", integerFormat.format(tool.spindleRPM)); // use cutting speed, cannot output spindle speed in the middle of a contour
    writeVar("F_", feedFormat.format(m.feed));
    writeVar("AB", 0); // distance to programmed contour
    writeVar("ZM", "@0"); // Z-mass
    if (getProperty("useSmoothing")) {
      writeVar("KG", 2); // 0 = off, 1 = Contour mode, 2 = Bspline Mode
      writeVar("MBA", spatialFormat.format(getProperty("smoothingPathDev")));
      writeVar("MWA", spatialFormat.format(getProperty("smoothingTrackDev")));
    }
  }
}

function writeSawContour(m, wpData, tool) {
  writeln("<193 \\Kontursaegen\\");
  writeVar("EA", m.id + ":" + (m.entities > 2 ? 1 : 0));
  writeVar("MDA", m.mda);
  writeVar("EE", m.id + ":" + (m.entities - 1));
  writeVar("MDE", m.mde);
  writeVar("RK", "NOWRK");
  writeVar("TNO", tool.number);
  writeVar("ZM", spatialFormat.format(tool.getFluteLength()));
  writeVar("Z_", "0");
  writeVar("ZA", "0"); // ignore all Z in program
  writeVar("BL", tool.coolant == "COOLANT_AIR" ? "1" : "0"); // blow-off sprayer control
  writeVar("RI", "1"); // forward along contour
  writeVar("F_", feedFormat.format(m.feed));
  writeVar("SM", 1); // rpm
  writeVar("S_A", integerFormat.format(tool.spindleRPM)); // use cutting speed, cannot output spindle speed in the middle of a contour
  writeVar("F_Z", "0");
  writeVar("AB", "0");
  writeVar("VLS", "0");
  writeVar("VLE", "0");
  writeVar("HP", "0");
  writeVar("SP", "0");
  writeVar("YVE", "0");
  writeVar("ASG", "0");
  writeVar("RP", "STANDARD");
}

function writeSawGroove(m, wpData, tool) {
  setFormats(wpData.id);
  var abc = getWorkPlaneMachineABC(wpData.workPlane, false);
  if (abcFormat.format(abc.y) == 0) {
    error(localize("Horizontal saw cuts are not supported when using Grooving macros."));
    return;
  }
  var angled = abcFormat.format(abc.y) != 90;
  writeln(angled ? "<124 \\groove_R\\" : "<109 \\grooveen\\");
  writeVar("XA", xFormat.format(m.start.x));
  writeVar("YA", yFormat.format(m.start.y));
  writeVar("XE", xFormat.format(m.end.x));
  writeVar("YE", yFormat.format(m.end.y));
  writeVar("AN", 0);
  writeVar("NB", xyzFormat.format(m.grooveWidth)); // groove width
  writeVar("RK", "NOWRK");
  if (angled) {
    writeVar("WI", abcFormat.format(abc.y));
  }
  writeVar("EM", "MOD1");
  // writeVar("VZ", Math.min(m.start.z, m.end.z)); // scoring Z-level
  // writeVar("MV", m.cutSide == "right" ? "GGL" : "GL");
  var z = Math.min(m.start.z, m.end.z);
  if (angled) {
    writeVar("Z_", zFormat.format(z));
  } else {
    writeVar("TI", zFormat.format(partDelta.z - z + (workpiece.upper.z - part.upper.z)));
  }
  writeVar("MN", m.cutSide == "right" ? "GGL" : "GL");
  writeVar("OP", 0);
  writeVar("T_", tool.number);
  writeVar("F_", feedFormat.format(m.feed));
  writeVar("SM", 1); // rpm
  writeVar("S_A", integerFormat.format(tool.spindleRPM)); // use cutting speed, cannot output spindle speed in the middle of a contour
  writeVar("KO", wpData.id);
}

function onClose() {

  for (var i = 0; i < machining.length; ++i) {
    var m = machining[i];
    var tool  = 0;
    var wpData;
    if (m.id != REDIRECT_ID) {
      wpData = getDefinedWorkPlane(m.sectionId);
      tool = getSection(m.sectionId).getTool();
    }
    writeln("");

    if (m.id == REDIRECT_ID) {
      write(redirectBuffer[m.index]);
    } else if (m.id < 0) {
      writeDrillBlock(m, wpData, tool);
    } else if (m.saw == SAW_CONTOUR) {
      writeSawContour(m, wpData, tool);
    } else if (m.saw == SAW_GROOVE) {
      writeSawGroove(m, wpData, tool);
    } else {
      writeContourBlock(m, wpData, tool);
    }
  }

  writeln("");
  writeln("<101 \\Kommentar\\");
  if (programName) {
    writeKMComment(programName);
  }
  if (programComment) {
    writeKMComment(programComment);
  }
  writeVar("KAT", "Kommentar");
  writeVar("MNM", "Kommentar");

  writeln("!");
}
