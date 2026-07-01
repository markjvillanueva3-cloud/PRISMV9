/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  PROMAX post processor configuration.

  $Revision: 44070 a160b80f61536304f4392350bf6679608d72d57c $
  $Date: 2023-06-05 21:47:42 $

  FORKID {50603A1C-0297-4742-B26B-38458BE123EF}
*/

description = "PROMAX";
vendor = "PROMAX";
vendorUrl = "https://www.promax.it";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "Generic 3-axis post processor for V1.1 PROMAX CNCs.";

extension = "iso";
setCodePage("ascii");

capabilities = CAPABILITY_MILLING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion

// user-defined properties
properties = {
  headType: {
    title      : "Head type",
    description: "Specifies the head type to use.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {title:"Single", id:"single"},
      {title:"Multiple", id:"multiple"}
    ],
    value: "single",
    scope: "post"
  },
  useHead: {
    title      : "Use head",
    description: "Use H code function.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG65: {
    title      : "Use G65",
    description: "Enable (G65) or disable (G64) 3D interpolation.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useCoolant: {
    title      : "Use coolant",
    description: "Use M8-M9 for coolant.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useG43: {
    title      : "Use G43",
    description: "Use G43 for tool length compensation.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSpindleDirection: {
    title      : "Use M3-M4",
    description: "Enable/disable spindle direction codes.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useM06: {
    title      : "Use M6",
    description: "Disable to avoid outputting M6. If disabled, preload is also disabled.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useM30: {
    title      : "Use M30-M31",
    description: "Use M31 for program start and M30 for program end.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  writeToolTable: {
    title      : "Define tool table",
    description: "Copy tool information to IsoUs ToolTable.",
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
  feedUnit: {
    title      : "Feed unit",
    description: "Specifies the feedrate unit: M/min or MM/min.",
    group      : "preferences",
    type       : "enum",
    values     : [
      {title:"M/Min", id:"0.001"},
      {title:"MM/Min", id:"1"}
    ],
    value: "1",
    scope: "post"
  },
  zDirection: {
    title      : "Z direction",
    description: "Z direction for G43.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {title:"Negative -", id:"-"},
      {title:"Positive +", id:"+"}
    ],
    value: "-",
    scope: "post"
  },
  stlModel: {
    title      : "Load STL model in preview",
    description: "Save STL in IsoUs\\UsMachines\\DynamicStl\\Name.stl.",
    group      : "stl",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  stlAlignment:
  {
    title      : "STL alignment mode",
    description: "Defines the STL position in the preview.",
    type       : "enum",
    group      : "stl",
    values     : [
      {title:"DownLeft", id:"0"},
      {title:"DownCenter", id:"1"},
      {title:"DownRight", id:"2"},
      {title:"MiddleRight", id:"3"},
      {title:"UpRight", id:"4"},
      {title:"UpCenter", id:"5"},
      {title:"UpLeft", id:"6"},
      {title:"MiddleLeft", id:"7"},
      {title:"CenterSide", id:"8"},
      {title:"CenterCube", id:"9"},
      {title:"Deafault", id:"10"},
      {title:"ModelOrigin", id:"11"}
    ],
    value: "11",
    scope: "post"
  },
  sideAlignment:
  {
    title      : "STL side alignment",
    description: "Defines the side aligment. This property is ignored when ModelOrigin is used for the STL position.",
    type       : "enum",
    group      : "stl",
    values     : [
      {title:"SideUp", id:"0"},
      {title:"SideDown", id:"1"},
      {title:"SideLeft", id:"2"},
      {title:"SideRight", id:"3"},
      {title:"SideFront", id:"4"},
      {title:"SideBack", id:"5"}
    ],
    value: "0",
    scope: "post"
  },
  stlName: {
    title      : "STL name",
    description: "STL name without extension.",
    group      : "stl",
    type       : "file",
    value      : "StlModel",
    scope      : "post"
  },
  checkToolName: {
    title      : "Check tool name",
    description: "Specifies if we have to check tool name.",
    group      : "configuration",
    type       : "boolean",
    value      : true,
    visible    : false,
    scope      : "post"
  },
  safePositionMethod: {
    title      : "Safe Retracts",
    description: "Select your desired retract option. 'Clearance Height' retracts to the operation clearance height.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      {title:"G28", id:"G28"},
      // {title:"G53", id:"G53"}
      {title:"Clearance Height", id:"clearanceHeight"}
    ],
    value: "clearanceHeight",
    scope: "post"
  }
};

groupDefinitions = {
  stl: {title:"STL Settings", description:"STL settings", order:25}
};

var singleLineCoolant = false; // specifies to output multiple coolant codes in one line rather than in separate lines
// samples:
// {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
// {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
// {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
var coolants = [
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST, on:7},
  {id:COOLANT_THROUGH_TOOL},
  {id:COOLANT_AIR},
  {id:COOLANT_AIR_THROUGH_TOOL},
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST},
  {id:COOLANT_FLOOD_THROUGH_TOOL},
  {id:COOLANT_OFF, off:9}
];

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-";

var nFormat = createFormat({prefix:"N", decimals:0});
var gFormat = createFormat({prefix:"G", decimals:1});
var mFormat = createFormat({prefix:"M", decimals:0});
var pFormat = createFormat({prefix:"P", decimals:(unit == MM ? 3 : 4), scale:0.5});
var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var feedFormat; // defined in onOpen
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-99999.999
var milliFormat = createFormat({decimals:0}); // milliseconds // range 1-9999
var taperFormat = createFormat({decimals:1, scale:DEG});
var spatialFormat = createFormat({decimals:3, forceDecimal:true, trim:false});
var pitchFormat = createFormat({decimals:1, forceDecimal:true});

var xOutput = createVariable({prefix:"X"}, xyzFormat);
var yOutput = createVariable({prefix:"Y"}, xyzFormat);
var zOutput = createVariable({onchange:function () {retracted = false;}, prefix:"Z"}, xyzFormat);
var zOutputFixed = createVariable({onchange:function () {retracted = false;}, prefix:"Z"}, xyzFormat);
var feedOutput; // defined in onOpen
var sOutput = createVariable({prefix:"S", force:true}, rpmFormat);
var pOutput = createVariable({}, pFormat);

// circular output
var iOutput = createReferenceVariable({prefix:"I", force:true}, xyzFormat);
var jOutput = createReferenceVariable({prefix:"J", force:true}, xyzFormat);
var kOutput = createReferenceVariable({prefix:"K", force:true}, xyzFormat);

var gMotionModal = createModal({}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createModal({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createModal({}, gFormat); // modal group 3 // G90-91
var gFeedModeModal = createModal({}, gFormat); // modal group 5 // G93-94
var gUnitModal = createModal({}, gFormat); // modal group 6 // G20-21
var gCycleModal = createModal({}, gFormat); // modal group 9 // G81, ...

// fixed settings
var maximumLineLength = 80; // the maximum number of charaters allowed in a line

// collected state
var retracted = false; // specifies that the tool has been retracted to the safe plane
var forceSpindleSpeed = false;

var axisDepthName = "Z";
var axesNames = "XYZABCUVW";

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  writeWords(arguments);
}

function formatComment(text) {
  return "//" + filterText(String(text).toUpperCase(), permittedCommentChars);
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

function onOpen() {
  feedFormat = createFormat({decimals:2, forceDecimal:true, scale:parseFloat(getProperty("feedUnit"))});
  feedOutput = createVariable({prefix:"F"}, feedFormat);

  writeComment(longDescription);
  if (getProperty("headType") == "multiple") {
    writeComment("Multiple Head configuration");
  } else {
    writeComment("Single Head configuration");
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
        var comment = "T" + toolFormat.format(tool.number) + "  " +
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

  //STL Model load
  if (getProperty("stlModel")) {
    var stlFile = getProperty("stlName").toUpperCase().trim();
    if (stlFile == "") {
      error(localize("Invalid STL File Name.."));
    } else {
      var val = "EXD.STL_LOAD \"" + stlFile + "\" ";
      if (getProperty("stlAlignment") != "10") {
        val += "A" + getProperty("stlAlignment");
        if (getProperty("stlAlignment") != "11") {
          val += " B" + getProperty("sideAlignment");

          // define the center of the workpiece
          var workpiece = getWorkpiece();
          val += " X" + spatialFormat.format(workpiece.lower.x + ((workpiece.upper.x - workpiece.lower.x) / 2));
          val += " Y" + spatialFormat.format(workpiece.lower.y + ((workpiece.upper.y - workpiece.lower.y) / 2));
          val += " Z" + spatialFormat.format(workpiece.lower.z + ((workpiece.upper.z - workpiece.lower.z) / 2));
        }
      }
      writeBlock(val);
    }
  }

  writeBlock(gAbsIncModal.format(90), gFormat.format(60), gFormat.format(getProperty("useG65") ? 65 : 64), gFormat.format(40), gFormat.format(44), gPlaneModal.format(17));

  switch (unit) {
  case IN:
    writeBlock(gUnitModal.format(20));
    break;
  case MM:
    writeBlock(gUnitModal.format(21));
    break;
  }
  // Start Program
  if (getProperty("useM30")) {
    writeBlock(mFormat.format(31));
  }
}

function onComment(message) {
  var comments = String(message).split(";");
  for (comment in comments) {
    writeComment(comments[comment]);
  }
}

/** Force output of X, Y, and Z. */
function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

/** Force output of X, Y, Z, A, B, C, and F on next output. */
function forceAny() {
  forceXYZ();
  feedOutput.reset();
}

function getFeed(f) {
  f = (feedFormat.format(f) <= 0) ? (Math.pow(10, feedFormat.getNumberOfDecimals() * -1) / feedFormat.getScale()) : f;
  return feedOutput.format(f);
}

function onSection() {
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  retracted = false;

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
    if (insertToolCall && !isFirstSection()) {
      onCommand(COMMAND_STOP_SPINDLE);
      setCoolant(COOLANT_OFF);
    }
    // retract to safe plane
    writeRetract(Z);
  }

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    writeln("");
    writeComment(comment);
  }

  if (insertToolCall) {

    if (tool.number > 256) {
      warning(localize("Tool number exceeds maximum value."));
    }

    var head = 1;
    if (getProperty("headType") == "multiple") {
      axisDepthName = "Z";
      var name = tool.comment.toUpperCase();
      var indexName = -1;
      for (var n = 0; n < axesNames.length; n++) {
        if (name == axesNames[n]) {
          indexName = n;
          break;
        }
      }
      if (indexName == -1) {
        if (getProperty("checkToolName")) {
          error(
            subst(
              localize("DEPTH AXIS:%1 %2 Invalid name for Depth Axis in tool comment - MUST BE X Y Z A B C U V W"),
              name, "T" + toolFormat.format(tool.number)
            )
          );
        }
        name = axisDepthName;
      }
      axisDepthName = name;
      head = tool.turret;
      zOutput = createVariable({onchange:function () {retracted = false;}, prefix:axisDepthName}, xyzFormat);
    } else {
      if (tool.comment) {
        writeComment(tool.comment);
      }
    }

    if (getProperty("useG43")) {
      writeBlock(gFormat.format(44));
    }

    if (getProperty("writeToolTable")) {
      writeBlock("EXD.WRITE_TOOLPAR " + toolFormat.format(tool.number) + " 0 " + spatialFormat.format(tool.diameter)); // Diameter
      writeBlock("EXD.WRITE_TOOLPAR " + toolFormat.format(tool.number) + " 1 " + spatialFormat.format(tool.bodyLength)); // Length
      if (getProperty("headType") == "multiple") {
        writeBlock("EXD.WRITE_HEADPAR " + tool.turret + " 0 " + indexName); // Head
      }
    }

    writeBlock(
      conditional(getProperty("useHead"), "H" + head),
      "T" + toolFormat.format(tool.number),
      conditional(getProperty("useM06"), mFormat.format(6))
    );

    if (getProperty("useG43")) {
      writeBlock(
        gFormat.format(43),
        "X0",
        "K1",
        (getProperty("headType") == "multiple" ? axisDepthName : "Z") + getProperty("zDirection")
      );
    }
  }

  if (tool.type != TOOL_PROBE) {
    var outputSpindleSpeed = insertToolCall || forceSpindleSpeed || isFirstSection() ||
      rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent()) ||
      (tool.clockwise != getPreviousSection().getTool().clockwise);
    if (outputSpindleSpeed) {
      forceSpindleSpeed = false;
      if (tool.spindleRPM < 1) {
        error(localize("Spindle speed out of range."));
        return;
      }
      if (tool.spindleRPM > 99999) {
        warning(localize("Spindle speed exceeds maximum value."));
      }
      var tapping = hasParameter("operation:cycleType") &&
        ((getParameter("operation:cycleType") == "tapping") ||
        (getParameter("operation:cycleType") == "right-tapping") ||
        (getParameter("operation:cycleType") == "left-tapping") ||
        (getParameter("operation:cycleType") == "tapping-with-chip-breaking"));
      if (!tapping) {
        writeBlock(sOutput.format(tool.spindleRPM), conditional(getProperty("useSpindleDirection"), mFormat.format(tool.clockwise ? 3 : 4)));
      }
    }
  }

  forceXYZ();
  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);

  forceAny();
  gMotionModal.reset();

  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  if (!retracted && !insertToolCall) {
    if (getCurrentPosition().z < initialPosition.z) {
      writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
    }
  }

  if (insertToolCall || retracted) {
    var lengthOffset = tool.lengthOffset;
    if (lengthOffset > 256) {
      error(localize("Length offset out of range."));
      return;
    }

    gMotionModal.reset();
    writeBlock(gPlaneModal.format(17));

    writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
  } else {
    writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y));
  }
}

function onDwell(seconds) {
  // dwell always in seconds
  writeBlock(gFormat.format(4), "F" + secFormat.format(seconds));
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(sOutput.format(spindleSpeed));
}

function onCycle() {
  writeBlock(gPlaneModal.format(17));
}

function getCommonCycle(x, y, z, r, c) {
  forceXYZ();
  return [xOutput.format(x), yOutput.format(y), zOutputFixed.format(z), "R" + xyzFormat.format(r)];
}

function onCyclePoint(x, y, z) {

  // check if we can group the drilling or not
  var cycleRequiresRetract = xyzFormat.areDifferent(cycle.retract, cycle.clearance);

  if (isFirstCyclePoint() || cycleRequiresRetract) {

    // return to initial Z which is clearance plane and set absolute mode
    repositionToCycleClearance(cycle, getCurrentPosition().x, getCurrentPosition().y, z);

    var F = cycle.feedrate;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell * 1000, 99999999); // in milliseconds

    switch (cycleType) {
    case "drilling":
      writeComment("DRILLING");
      writeBlock(
        gCycleModal.format(81),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        getFeed(F)
      );
      break;
    case "counter-boring":
      writeComment("COUNTER-BORING  P=" + secFormat.format(P / 1000));
      if (P > 0) {
        writeBlock(
          gCycleModal.format(82),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "P" + milliFormat.format(P),
          getFeed(F)
        );
      } else {
        writeBlock(
          gCycleModal.format(81),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          getFeed(F)
        );
      }
      break;
    case "chip-breaking":
      writeComment("CHIP-BREAKING  P=" + secFormat.format(P / 1000));
      if ((cycle.accumulatedDepth < cycle.depth) || P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gCycleModal.format(83),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "Q" + xyzFormat.format(cycle.incrementalDepth), getFeed(F),
          "P" + spatialFormat.format(cycle.chipBreakDistance)
        );
      }
      break;
    case "deep-drilling":
      writeComment("DEEP-DRILLING  P=" + secFormat.format(P / 1000));
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gCycleModal.format(83),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "Q" + xyzFormat.format(cycle.incrementalDepth),
          getFeed(F)
        );
      }
      break;
    case "tapping":
    case "left-tapping":
    case "right-tapping":
      writeComment(tool.type == TOOL_TAP_LEFT_HAND ? "LEFT-TAPPING" : "RIGHT-TAPPING");
      F = tool.getThreadPitch() * rpmFormat.getResultingValue(tool.spindleRPM);
      writeBlock(
        gCycleModal.format(84),
        getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
        getFeed(F),
        conditional(tool.type != TOOL_TAP_LEFT_HAND, "A1"),
        "Q" + pitchFormat.format(tool.getThreadPitch()),
        conditional(P > 0, "P" + milliFormat.format(P))
      );
      break;
    case "fine-boring":
      error(localize("FINE-BORING is not supported.."));
      break;
    case "back-boring":
      error(localize("BACK-BORING is not supported.."));
      break;
    case "reaming":
      writeComment("REAMING");
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (P > 0) {
        writeBlock(gCycleModal.format(82),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "Q1",
          "P" + milliFormat.format(P),
          getFeed(F)
        );
      } else {
        writeBlock(
          gCycleModal.format(81),
          getCommonCycle(x, y, z, cycle.retract, cycle.clearance),
          "Q1",
          getFeed(F)
        );
      }
      break;
    case "stop-boring":
    case "manual-boring":
    case "boring":
    default:
      expandCyclePoint(x, y, z);
    }
    if (cycleRequiresRetract && !cycleExpanded) {
      writeBlock(gCycleModal.format(80));
      gMotionModal.reset();
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
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
    writeBlock(gMotionModal.format(0), x, y, z);
    feedOutput.reset();
  }
}

function onLinear(_x, _y, _z, feed) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(feed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      writeBlock(gPlaneModal.format(17));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        pOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(41), x, y, z, f, pOutput.format(tool.diameter));
        break;
      case RADIUS_COMPENSATION_RIGHT:
        pOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(42), x, y, z, f, pOutput.format(tool.diameter));
        break;
      default:
        writeBlock(gMotionModal.format(1), gFormat.format(40), x, y, z, f);
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
      writeBlock(gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0), getFeed(feed));
      break;
    case PLANE_ZX:
      writeBlock(gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), iOutput.format(cx - start.x, 0), kOutput.format(cz - start.z, 0), getFeed(feed));
      break;
    case PLANE_YZ:
      writeBlock(gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jOutput.format(cy - start.y, 0), kOutput.format(cz - start.z, 0), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  } else if (true) {
    // do not use radius mode  -> always here
    switch (getCircularPlane()) {
    case PLANE_XY:
      writeBlock(gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x, 0), jOutput.format(cy - start.y, 0), getFeed(feed));
      break;
    case PLANE_ZX:
      writeBlock(gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx - start.x, 0), kOutput.format(cz - start.z, 0), getFeed(feed));
      break;
    case PLANE_YZ:
      writeBlock(gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy - start.y, 0), kOutput.format(cz - start.z, 0), getFeed(feed));
      break;
    default:
      linearize(tolerance);
    }
  }
}

var currentCoolantMode = undefined;
var coolantOff = undefined;
var forceCoolant = false;

function setCoolant(coolant) {
  if (!getProperty("useCoolant")) {
    return undefined;
  }
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
  if (coolant == currentCoolantMode && !forceCoolant) {
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
  COMMAND_END              : 2,
  COMMAND_ORIENTATE_SPINDLE: 19,
  COMMAND_LOAD_TOOL        : 6
};

function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    setCoolant(COOLANT_OFF);
    return;
  case COMMAND_COOLANT_ON:
    setCoolant(COOLANT_FLOOD);
    return;
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_STOP_SPINDLE:
    if (getProperty("useSpindleDirection")) {
      writeBlock(mFormat.format(5));
    }
    return;
  case COMMAND_SPINDLE_CLOCKWISE:
    if (getProperty("useSpindleDirection")) {
      writeBlock(mFormat.format(3));
    }
    return;
  case COMMAND_SPINDLE_COUNTERCLOCKWISE:
    if (getProperty("useSpindleDirection")) {
      writeBlock(mFormat.format(4));
    }
    return;
  case COMMAND_STOP:
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_OPTIONAL_STOP:
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
  if (((getCurrentSectionId() + 1) >= getNumberOfSections()) || (tool.number != getNextSection().getTool().number)) {
    onCommand(COMMAND_BREAK_CONTROL);
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
  if ((retractAxes[0] && !machineConfiguration.hasHomePositionX()) || (retractAxes[1] && !machineConfiguration.hasHomePositionY())) {
    method = "G28";
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
      writeBlock(gAbsIncModal.format(90), gFormat.format(53), gMotionModal.format(0), words);
      break;
    default:
      error(localize("Unsupported safe position method."));
      return;
    }
  }
}

function onClose() {
  writeln("");
  onCommand(COMMAND_COOLANT_OFF);

  writeRetract(Z); // retract

  onImpliedCommand(COMMAND_END);
  onCommand(COMMAND_STOP_SPINDLE);
  // stop program, spindle stop, coolant off
  if (getProperty("useM30")) {
    writeBlock(mFormat.format(30));
  }
}

function setProperty(property, value) {
  properties[property].current = value;
}
