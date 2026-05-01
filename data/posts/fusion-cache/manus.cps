/**
  Copyright (C) 2012-2022 by Autodesk, Inc.
  All rights reserved.

  MANUSnc APT post processor configuration.

  $Revision: 43586 2d41669e156047de3fad89c4d0e9d659168e46ad $
  $Date: 2022-01-12 12:22:52 $

  FORKID {507B4A6C-5594-4E83-BFFD-A0F22B6F17B2}
*/

description = "MANUSnc APT";
vendor = "MANUSpost";
vendorUrl = "https://www.manusnc.com/en";
legal = "Copyright (C) 2012-2022 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "APT post processor for MANUSnc.";

unit = ORIGINAL_UNIT; // do not map unit
extension = "apt";
setCodePage("utf-8");

capabilities = CAPABILITY_INTERMEDIATE | CAPABILITY_MILLING;

allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion

// user-defined properties
properties = {
  highAccuracy: {
    title      : "High accuracy",
    description: "Specifies short (no) or long (yes) numeric format.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  onlyXYArcs: {
    title      : "Only use XY arcs",
    description: "Only allow arc output on the XY plane.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG95forTapping: {
    title      : "Use G95 for tapping",
    description: "use IPR/MPR instead of IPM/MPM for tapping",
    type       : "boolean",
    value      : true,
    scope      : "post",
    group      : "preferences"
  },
  MANUSpostInstallationPath: {
    title      : "MANUSpost installation path",
    description: "Specifies the MANUSpost installation path.",
    group      : "start",
    type       : "string",
    value      : "C:\\MANUS Software\\MANUSPostV3",
    scope      : "post"
  },
  startMANUSpostAfterPostprocessing: {
    title      : "Start MANUSpost after post processing",
    description: "Starts MANUSpost immediately after post processing is complete.",
    group      : "start",
    type       : "boolean",
    value      : false,
    scope      : "post"
  }
};

groupDefinitions = {
  preferences: {title:"Preferences", description:"General preferences", order:0},
  start      : {title:"Execute", description:"Execute software", order:1}
};

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
var mainFormat = createFormat({decimals:6, forceDecimal:true});
var ijkFormat = createFormat({decimals:9, forceDecimal:true});

// collected state
var currentFeed;
var feedUnit;
var radiusCompensationActive = false;

function writeComment(text) {
  writeln("PPRINT/'" + filterText(text, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(.,)/-+*= \t") + "'");
}

function onComment(comment) {
  writeComment(comment);
}

function onOpen() {
  if (getProperty("onlyXYArcs")) {
    allowedCircularPlanes = 1 << PLANE_XY; // arcs on XY plane only
  }

  var machineId = machineConfiguration.getModel();
  writeln("MACHIN/" + machineId);
  writeln("PARTNO/'" + programName + "'");
  writeComment(programName);
  writeComment(programComment);

  if (!getProperty("highAccuracy")) {
    mainFormat = createFormat({decimals:4, forceDecimal:true});
    ijkFormat = createFormat({decimals:7, forceDecimal:true});
  }
}

var mapCommand = {
  COMMAND_STOP                    : "STOP",
  COMMAND_OPTIONAL_STOP           : "OPSTOP",
  COMMAND_STOP_SPINDLE            : "SPINDL/ON",
  COMMAND_START_SPINDLE           : "SPINDL/OFF",
  COMMAND_SPINDLE_CLOCKWISE       : "SPINDL/CLW",
  COMMAND_SPINDLE_COUNTERCLOCKWISE: "SPINDL/CCLW"
};

function onCommand(command) {
  switch (command) {
  case COMMAND_LOCK_MULTI_AXIS:
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    return;
  case COMMAND_BREAK_CONTROL:
    writeln("CSI_SET_PATH_PARAM/TOOL_BREAK=ON");
    return;
  case COMMAND_TOOL_MEASURE:
    return;
  }

  if (mapCommand[command]) {
    writeln(mapCommand[command]);
  } else {
    warning("Unsupported command: " + getCommandStringId(command));
    writeComment("Unsupported command: " + getCommandStringId(command));
  }
}

function onSection() {
  writeln("");
  writeln("START/'OPERATION'");
  writeln("MODE/ " + ((currentSection.getType() == TYPE_TURNING) ? "TURN" : "MILL"));
  writeln("TPRINT/" + tool.description);

  var strategy = getParameter("operation-strategy", "");
  if (strategy) {
    writeln("PPRINT/'Strategy: " + getParameter("operation-strategy", "") + "'");
  }
  var comment = getParameter("operation-comment", "");
  if (comment) {
    writeln("PPRINT/'Comment: " + comment + "'");
    writeln("CSI_TOOL_PATH/" + comment);
  }
  writeln("");
  writeln("UNITS/" + ((unit == IN) ? "INCHES" : "MM"));
  feedUnit = (unit == IN) ? "IPM" : "MMPM";

  if (currentSection.isMultiAxis()) {
    writeln("MULTAX/ON");
  } else {
    writeln("MULTAX/OFF");
  }

  var w = currentSection.workPlane;
  var o = currentSection.workOrigin;
  writeln("");
  writeln("PPRINT/'MATRIX DEFINITION'");
  writeln("PPRINT/'Output x(i),y(i),z(i)'");
  writeln("PPRINT/'Output x(j),y(j),z(j)'");
  writeln("PPRINT/'Output x(k),y(k),z(k)'");
  writeln("PPRINT/'Output dx,dy,dz'");
  writeln("MCS/" + (ijkFormat.format(w.right.x) + ", " + ijkFormat.format(w.right.y) + ", " + ijkFormat.format(w.right.z) + ", $"));
  writeln(ijkFormat.format(w.up.x) + ", " + ijkFormat.format(w.up.y) + ", " + ijkFormat.format(w.up.z) + ", $");
  writeln(ijkFormat.format(w.forward.x) + ", " + ijkFormat.format(w.forward.y) + ", " + ijkFormat.format(w.forward.z) + ", $");
  writeln(mainFormat.format(o.x) + ", " + mainFormat.format(o.y) + ", " + mainFormat.format(o.z));
  writeln("MCS2/" + (ijkFormat.format(w.right.x) +  ", " + ijkFormat.format(w.right.y) + ", " + ijkFormat.format(w.right.z) + "," + ijkFormat.format(w.up.x) + ", " + ijkFormat.format(w.up.y) + ", " + ijkFormat.format(w.up.z) + ", " + ijkFormat.format(w.forward.x) + ", " + ijkFormat.format(w.forward.y) + ", " + ijkFormat.format(w.forward.z)));
  writeln("");

  var d = tool.diameter;
  var r = tool.cornerRadius;
  var e = 0;
  var f = 0;
  var a = 0;
  var b = 0;
  var h = tool.bodyLength;
  writeln("CUTTER/" +
    mainFormat.format(d) + ", " +
    mainFormat.format(r) + ", " +
    mainFormat.format(e) + ", " +
    mainFormat.format(f) + ", " +
    mainFormat.format(a) + ", " +
    mainFormat.format(b) + ", " +
    mainFormat.format(h)
  );

  var t = tool.number;
  var p = 0;
  var l = tool.bodyLength;
  var o = tool.lengthOffset;
  var m = tool.diameterOffset;
  writeln("LOADTL/" + t + ", " + p + ", " + mainFormat.format(l) + ", " + o + ", " + m);

  if (tool.breakControl) {
    onCommand(COMMAND_BREAK_CONTROL);
  }

  if (isMilling()) {
    writeln("SPINDL/" + "RPM," + (tool.type == TOOL_TAP_LEFT_HAND ? (spindleSpeed * -1) :  spindleSpeed) + "," + (tool.clockwise ? "CLW" : "CCLW"));
  }

  if (isTurning()) {
    writeln(
      "SPINDL/" + mainFormat.format(spindleSpeed) + ", " + ((unit == IN) ? "SFM" : "SMM") + ", " + (tool.clockwise ? "CLW" : "CCLW")
    );
  }

  // CSI - Coolant Support
  switch (tool.coolant) {
  case COOLANT_OFF:
    // TAG: make sure we disabled coolant between sections
    // writeln("COOLNT/OFF");
    break;
  case COOLANT_FLOOD:
    writeln("COOLNT/FLOOD");
    break;
  case COOLANT_MIST:
    writeln("COOLNT/MIST");
    break;
  case COOLANT_THROUGH_TOOL:
    writeln("COOLNT/THRU");
    break;
  case COOLANT_FLOOD_MIST:
    writeln("COOLNT/FLOOD");
    writeln("COOLNT/MIST");
    break;
  case COOLANT_FLOOD_THROUGH_TOOL:
    writeln("COOLNT/FLOOD");
    writeln("COOLNT/THRU");
    break;
  default:
    warning(localize("Unsupported coolant."));
  }

  if (currentSection.workOffset != 0) {
    writeln("ZERO/" + currentSection.workOffset);
  }

/*
  var operationTolerance = getParameter("operation:tolerance", 0);
  if (operationTolerance > 0) {
    writeln("CSI_PATH_TOLERANCE/" + mainFormat.format(operationTolerance));
  }
*/
}

function onDwell(time) {
  writeln("DELAY/" + mainFormat.format(time)); // in seconds
}

function onRadiusCompensation() {
  if (radiusCompensation == RADIUS_COMPENSATION_OFF) {
    if (radiusCompensationActive) {
      radiusCompensationActive = false;
      writeln("CUTCOM/OFF");
    }
  } else {
    if (!radiusCompensationActive) {
      radiusCompensationActive = true;
      writeln("CUTCOM/ON");
    }
    var direction = (radiusCompensation == RADIUS_COMPENSATION_LEFT) ? "LEFT" : "RIGHT";
    if (tool.diameterOffset != 0) {
      writeln("CUTCOM/" + direction + ", " + mainFormat.format(tool.diameterOffset));
    } else {
      writeln("CUTCOM/" + direction);
    }
  }
}

function onRapid(x, y, z) {
  writeln("RAPID");
  writeln("GOTO/" + mainFormat.format(x) + ", " + mainFormat.format(y) + ", " + mainFormat.format(z));
  currentFeed = undefined; // avoid potential problems if user overrides settings within MANUSpost
}

function onLinear(x, y, z, feed) {
  if (feed != currentFeed) {
    currentFeed = feed;
    writeln("FEDRAT/" + mainFormat.format(feed) + ", " + feedUnit);
  }
  writeln("GOTO/" +  mainFormat.format(x) + ", " +  mainFormat.format(y) + ", " +  mainFormat.format(z));
}

function onRapid5D(x, y, z, dx, dy, dz) {
  writeln("RAPID");
  writeln(
    "GOTO/" + mainFormat.format(x) + ", " + mainFormat.format(y) + ", " + mainFormat.format(z) + ", " +
    ijkFormat.format(dx) + ", " + ijkFormat.format(dy) + ", " + ijkFormat.format(dz)
  );
  currentFeed = undefined; // avoid potential problems if user overrides settings within MANUSpost
}

function onLinear5D(x, y, z, dx, dy, dz, feed) {
  if (feed != currentFeed) {
    currentFeed = feed;
    writeln("FEDRAT/" + mainFormat.format(feed) + ", " + feedUnit);
  }
  writeln(
    "GOTO/" + mainFormat.format(x) + ", " + mainFormat.format(y) + ", " + mainFormat.format(z) + ", " +
    ijkFormat.format(dx) + ", " + ijkFormat.format(dy) + ", " + ijkFormat.format(dz)
  );
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  if (feed != currentFeed) {
    currentFeed = feed;
    writeln("FEDRAT/" + mainFormat.format(feed) + ", " + feedUnit);
  }

  var n = getCircularNormal();
  if (isClockwise()) {
    dir = 1;
  } else {
    dir = -1;
  }
  writeln(
    "CIRCLE/" + mainFormat.format(cx) + ", " + mainFormat.format(cy) + ", " + mainFormat.format(cz) + ", " +
    ijkFormat.format(n.x * dir) + ", " + ijkFormat.format(n.y * dir) + ", " + ijkFormat.format(n.z * dir) + ", " +
    mainFormat.format(getCircularRadius()) + ", " + mainFormat.format(toDeg(getCircularSweep())) + ", 0.0, 0.0, 0.0"
  );
  writeln("GOTO/" + mainFormat.format(x) + ", " + mainFormat.format(y) + ", " + mainFormat.format(z));
}

function onSpindleSpeed(spindleSpeed) {
  if (isMilling()) {
    writeln("SPINDL/" + "RPM," + mainFormat.format(spindleSpeed) + "," + (tool.clockwise ? "CLW" : "CCLW"));
  }

  if (isTurning()) {
    writeln(
      "SPINDL/" + mainFormat.format(spindleSpeed) + ", " + ((unit == IN) ? "SFM" : "SMM") + ", " + (tool.clockwise ? "CLW" : "CCLW")
    );
  }
}

var expandCurrentCycle = false;

function onCycle() {
  var d = mainFormat.format(cycle.depth);
  var f = mainFormat.format(cycle.feedrate);
  var c = mainFormat.format(cycle.clearance);
  var r = mainFormat.format(c - cycle.retract);
  var q = mainFormat.format(cycle.dwell);
  var i = mainFormat.format(cycle.incrementalDepth); // for pecking
  var p = mainFormat.format(tool.threadPitch);

  var RAPTO = mainFormat.format(cycle.retract - cycle.stock);
  var RTRCTO = mainFormat.format(cycle.clearance - cycle.stock);
  var RETURN = c;

  var statement;

  expandCurrentCycle = false;
  switch (cycleType) {
  case "drilling":
    statement = "CYCLE/DRILL, FEDTO, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RTRCTO, " + RTRCTO + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    break;
  case "counter-boring":
    statement = "CYCLE/DRILL, FEDTO, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    if (q > 0) {
      statement += ", DWELL, " + q;
    }
    break;
  case "reaming":
    statement = "CYCLE/REAM, FEDTO, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    if (q > 0) {
      statement += ", DWELL, " + q;
    }
    break;
  case "boring":
    statement = "CYCLE/BORE, FEDTO, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    statement += ", ORIENT, " + 0; // unknown orientation
    if (q > 0) {
      statement += ", DWELL, " + q;
    }
    break;
  case "fine-boring":
    statement = "CYCLE/BORE, FEDTO, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", " + cycle.shift + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    statement += ", ORIENT, " + 0; // unknown orientation
    if (q > 0) {
      statement += ", DWELL, " + q;
    }
    break;
  case "deep-drilling":
    statement = "CYCLE/DRILL, DEEP, FEDTO, " + d + ", INCR, " + i + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    if (q > 0) {
      statement += ", DWELL, " + q;
    }
    break;
  case "chip-breaking":
    statement = "CYCLE/BRKCHP, FEDTO, " + d + ", INCR, " + i + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    if (q > 0) {
      statement += ", DWELL, " + q;
    }
    break;
  case "tapping":
    if (tool.type == TOOL_TAP_LEFT_HAND) {
      cycleNotSupported();
    } else {
      if (getProperty("useG95forTapping")) {
        statement = "CYCLE/RIGID, DEPTH, " + d + ", PITCH" + ", " + p + ", CLEAR, " + c + ", RETURN, " + RETURN;
      } else {
        statement = "CYCLE/TAP, DEPTH, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
      }
      if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
        statement += ", RAPTO, " + RAPTO;
      }
    }
    break;
  case "left-tapping":
  case "right-tapping":
    if (getProperty("useG95forTapping")) {
      statement = "CYCLE/RIGID, DEPTH, " + d + ", PITCH" + ", " + p + ", CLEAR, " + c + ", RETURN, " + RETURN;
    } else {
      statement = "CYCLE/TAP, DEPTH, " + d + ", " + feedUnit + ", " + f + ", CLEAR, " + c + ", RETURN, " + RETURN;
    }
    if (mainFormat.getResultingValue(cycle.retract - cycle.stock) > 0) {
      statement += ", RAPTO, " + RAPTO;
    }
    break;
  case "gun-drilling":
    expandCurrentCycle = true;
    break;
  default:
    cycleNotSupported();
  }
  writeln(statement);
}

function onCyclePoint(x, y, z) {
  if (expandCurrentCycle) {
    expandCyclePoint(x, y, z);
  } else {
    writeln("GOTO/" + mainFormat.format(x) + ", " + mainFormat.format(y) + ", " + mainFormat.format(cycle.stock));
  }
}

function onCycleEnd() {
  if (!expandCurrentCycle) {
    writeln("CYCLE/OFF");
  }
  currentFeed = undefined; // avoid potential problems if user overrides settings within CAMplete
}

function onSectionEnd() {
  writeln("OPERATION/END");
}

function onClose() {
  writeln("END");
  writeln("FINI");
}

function onTerminate() {
  if (getProperty("startMANUSpostAfterPostprocessing")) {
    var exePath = getProperty("MANUSpostInstallationPath");
    if (!FileSystem.isFile(exePath)) {
      error(localize("MANUSpost was not found on your machine. Use property 'MANUSpostInstallationPath' to set the full path to the executable."));
      return;
    }
    executeNoWait(exePath, "\"", false, "");
  }
}

function setProperty(property, value) {
  properties[property].current = value;
}
