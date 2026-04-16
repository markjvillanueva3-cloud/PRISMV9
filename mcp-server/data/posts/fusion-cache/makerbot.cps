/**
  Copyright (C) 2012-2023 by Autodesk, Inc.
  All rights reserved.

  MakerBot Replicator post processor configuration.

  $Revision: 44106 42162b6c37d8849644d694c053a201a331ea3c40 $
  $Date: 2023-10-25 14:30:07 $

  FORKID {554C6EC0-1393-432C-BB72-6A5F0BE2CFF2}
*/

description = "Makerbot";
vendor = "Makerbot";
vendorUrl = "https://www.makerbot.com/";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Post to export toolpath for Makerbot Replicator machines in gcode format. (Replicator, Replicator 2, Replicator 2X). " +
  "The GPX PostProcessor add-in can be downloaded from here: https://autode.sk/3nPOEj8";

extension = "gcode";
setCodePage("ascii");

capabilities = CAPABILITY_ADDITIVE;
tolerance = spatial(0.002, MM);

highFeedrate = toPreciseUnit(10500, MM);
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.4, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = false; // disable helical support
allowSpiralMoves = false; // disable spiral support
allowedCircularPlanes = 0; // makerbot firmware does not support circular interpolation.

// user-defined properties
properties = {
  heatedBedCommand: {
    title      : "Heated Bed Command",
    description: "Specifies the M-code used to turn on the heated bed.",
    type       : "enum",
    values     : [
      {title:"Not available", id:"-1"},
      {title:"M109", id:"109"},
      {title:"M140", id:"140"}
    ],
    value: "109",
    scope: "machine"
  }
};

// included properties
if (typeof properties != "object") {
  properties = {};
}
if (typeof groupDefinitions != "object") {
  groupDefinitions = {};
}
// >>>>> INCLUDED FROM ../common/propertyTemperatureTower.cpi
properties._trigger = {
  title      : "Trigger",
  description: "Specifies whether to use the Z-height or layer number as the trigger to change temperature of the active Extruder.",
  type       : "enum",
  values     : [
    {title:"Disabled", id:"disabled"},
    {title:"by Height", id:"height"},
    {title:"by Layer", id:"layer"}
  ],
  value: "disabled",
  scope: "post",
  group: "temperatureTower"
};
properties._triggerValue = {
  title      : "Trigger Value",
  description: "This number specifies either the Z-height or the layer number increment on when a change should be triggered.",
  type       : "number",
  value      : 10,
  scope      : "post",
  group      : "temperatureTower"
};
properties.tempStart = {
  title      : "Start Temperature",
  description: "Specifies the starting temperature for the active Extruder (degrees C). Note that the temperature specified in the print settings will be overridden by this value.",
  type       : "integer",
  value      : 190,
  scope      : "post",
  group      : "temperatureTower"
};
properties.tempInterval = {
  title      : "Temperature Interval",
  description: "Every step, increase the temperature of the active Extruder by this amount (degrees C).",
  type       : "integer",
  value      : 5,
  scope      : "post",
  group      : "temperatureTower"
};

groupDefinitions.temperatureTower = {
  title      : "Temperature Tower",
  description: "Temperature Towers are used to test new filaments in order to identify the best printing temperature. " +
      "When utilized, this functionality generates a Gcode file where the temperature increases by a set amount, every step in height or layer number.",
  collapsed: true,
  order    : 0
};
// <<<<< INCLUDED FROM ../common/propertyTemperatureTower.cpi
// >>>>> INCLUDED FROM ../common/propertyRelativeExtrusion.cpi
properties.relativeExtrusion = {
  title      : "Relative extrusion mode",
  description: "Select the filament extrusion mode, either absolute or relative.",
  type       : "boolean",
  value      : true,
  scope      : "post"
};
// <<<<< INCLUDED FROM ../common/propertyRelativeExtrusion.cpi

var gFormat = createFormat({prefix:"G", width:1, decimals:0});
var mFormat = createFormat({prefix:"M", width:2, zeropad:true, decimals:0});
var tFormat = createFormat({prefix:"T", width:1, decimals:0});
var pFormat = createFormat({prefix:"P", width:1, decimals:0});
var integerFormat = createFormat({decimals:0});
var gMotionModal = createOutputVariable({control:CONTROL_FORCE}, gFormat); // modal group 1 - G0-G3
var gAbsIncModal = createOutputVariable({}, gFormat); // modal group 3 - G90-91

// Specify the required commands for your printer below.
var commands = {
  extruderChangeCommand : mFormat.format(135), // command to change the extruder
  setExtruderTemperature: mFormat.format(104), // command to set the extruder temperature
  waitExtruder          : undefined, // wait command for the extruder temperature
  setBedTemperature     : undefined, // command to set the bed temperature
  waitBed               : undefined, // wait command for the bed temperature
  reportTemperatures    : undefined, // command to report the temperatures to the printer
  fan                   : {on:mFormat.format(106), off:"M127 T0"}, // command turn the fan on/off
  extrusionMode         : {relative:mFormat.format(83), absolute:mFormat.format(82)} // commands for relative / absolute filament extrusion mode
};

var settings = {
  useG0              : true, // specifies to either use G0 or G1 commands for rapid movements
  maximumExtruderTemp: 260, // specifies the maximum extruder temperature
  skipParkPosition   : false, // set to true to avoid output of the park position at the end of the program
  comments           : {
    permittedCommentChars: " abcdefghijklmnopqrstuvwxyz0123456789.,=_-*+:/", // letters are not case sensitive, use option 'outputFormat' below. Set to 'undefined' to allow any character
    prefix               : ";", // specifies the prefix for the comment
    suffix               : "", // specifies the suffix for the comment
    outputFormat         : "ignoreCase", // can be set to "upperCase", "lowerCase" and "ignoreCase". Set to "ignoreCase" to write comments without upper/lower case formatting
    maximumLineLength    : 80 // the maximum number of characters allowed in a line
  }
};

// collected state
var activeExtruder = 0; // track the active extruder.
var ignoreFirstSet = true;

function setFormats(_desiredUnit) {
  if (_desiredUnit != unit) {
    writeComment(subst(localize("This printer does not support programs in %1."), _desiredUnit == IN ? "inches" : "millimeters"));
    writeComment(localize("The program has been converted to the supported unit."));
    unit = _desiredUnit;
  }

  xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
  feedFormat = createFormat({decimals:(unit == MM ? 0 : 1)});
  dimensionFormat = createFormat({decimals:(unit == MM ? 3 : 4), zeropad:false, suffix:(unit == MM ? "mm" : "in")});

  xOutput = createOutputVariable({prefix:"X", control:CONTROL_FORCE}, xyzFormat);
  yOutput = createOutputVariable({prefix:"Y", control:CONTROL_FORCE}, xyzFormat);
  zOutput = createOutputVariable({prefix:"Z", control:CONTROL_FORCE}, xyzFormat);
  feedOutput = createOutputVariable({prefix:"F", control:CONTROL_FORCE}, feedFormat);
  eOutput = createOutputVariable({prefix:"E", type:getProperty("relativeExtrusion") ? TYPE_INCREMENTAL : TYPE_ABSOLUTE}, xyzFormat);
  sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, xyzFormat); // parameter temperature or speed
  iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat); // circular output
  jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat); // circular output
}

function onOpen() {
  setFormats(MM); // machine require input code in MM
  writeBlock(gFormat.format(unit == MM ? 21 : 20));

  // MakerBot specific start codes
  writeBlock(mFormat.format(136), "(enable build)");
  writeBlock(mFormat.format(73), pFormat.format(0)); // send progress

  // homing
  writeBlock(gMotionModal.format(162), "X Y", feedOutput.format(toPreciseUnit(2000, MM)) + " (home XY axis maximum)");
  writeBlock(gMotionModal.format(161), "Z", feedOutput.format(toPreciseUnit(900, MM)) + " (home Z axes minimum)");

  // build setup codes
  var _z = toPreciseUnit(-5, MM);
  writeBlock(
    gMotionModal.format(92), xOutput.format(0), yOutput.format(0), zOutput.format(_z),
    "A" + integerFormat.format(0), "B" + integerFormat.format(0), "(set Z to " + xyzFormat.format(_z) + ")"
  );
  writeBlock(gMotionModal.format(1), zOutput.format(0), feedOutput.format(toPreciseUnit(900, MM)), "(move Z to '0')");
  writeBlock(gMotionModal.format(161), "Z", feedOutput.format(toPreciseUnit(100, MM)), "(home Z axis minimum)");
  writeBlock(mFormat.format(132), "X Y Z A B (Recall stored home offsets for XYZAB axis)");

  writeBlock(gMotionModal.format(130), xOutput.format(20), yOutput.format(20), "A" + integerFormat.format(20), "B" + integerFormat.format(20), "(Lower stepper Vrefs while heating)");

  if (typeof writeProgramHeader == "function") {
    writeProgramHeader();
  }
}

function onSection() {
  // after heating bed / extruder reset stepper motor vref
  writeBlock(gMotionModal.format(130), xOutput.format(127), yOutput.format(127), "A" + xyzFormat.format(127), "B" + xyzFormat.format(127), "(Set Stepper motor Vref to defaults)");
  writeBlock(gAbsIncModal.format(90)); // absolute spatial co-ordinates
  writeBlock(getCode(getProperty("relativeExtrusion") ? commands.extrusionMode.relative : commands.extrusionMode.absolute));

  // activate the used extruder
  writeBlock(getCode(commands.extruderChangeCommand), tFormat.format(activeExtruder));

  // lower build plate
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  writeBlock(gMotionModal.format(1), zOutput.format(initialPosition.z), feedOutput.format(highFeedrate));

  writeBlock(gFormat.format(92), eOutput.format(0));
  forceXYZE();
}

function onClose() {
  writeBlock(mFormat.format(18), "A B (Turn off A and B Steppers)");
  writeBlock(gMotionModal.format(1), zOutput.format(toPreciseUnit(155, MM)), feedOutput.format(toPreciseUnit(900, MM)));
  writeBlock(gMotionModal.format(162), "X Y", feedOutput.format(toPreciseUnit(2000, MM)));
  writeBlock(mFormat.format(18), "X Y Z (Turn off steppers after a build)");
  writeBlock(getCode(commands.setExtruderTemperature), sOutput.format(0), tFormat.format(activeExtruder));
  writeBlock(mFormat.format(70), "P5", "(We <3 Making Things!)");
  writeBlock(mFormat.format(72), "P1", "( Play Ta-Da song )");
  writeBlock(mFormat.format(73), pFormat.format(100));
  writeBlock(mFormat.format(137), "(build end notification)");
  writeComment("END OF GCODE");
}

function onBedTemp(temp, wait) {
  if (getProperty("heatedBedCommand") == "-1") {
    return;
  }
  var bedTempCommand = getProperty("heatedBedCommand") == "109" ? 109 : 140;
  if (wait) {
    writeBlock(mFormat.format(bedTempCommand), sOutput.format(temp), tFormat.format(0));
    writeBlock(mFormat.format(134), tFormat.format(0));
  } else {
    if (!ignoreFirstSet) {
      writeBlock(mFormat.format(bedTempCommand), sOutput.format(temp), tFormat.format(0));
    }
  }
}

function onExtruderTemp(temp, wait, id) {
  if (typeof executeTempTowerFeatures == "function" && getProperty("_trigger") != undefined) {
    if (getProperty("_trigger") != "disabled" && (getCurrentPosition().z == 0)) {
      temp = getProperty("tempStart"); // override temperature with the starting temperature for the temp tower feature
    }
  }
  if (wait) {
    // output M135 here only if using one extruder
    if (numberOfExtruders == 1) {
      writeBlock(getCode(commands.extruderChangeCommand), tFormat.format(id));
      ignoreFirstSet = false;
    }
    writeBlock(getCode(commands.setExtruderTemperature), sOutput.format(temp), tFormat.format(id));
    writeBlock(mFormat.format(133), tFormat.format(id));
  } else {
    if (!ignoreFirstSet) {
      writeBlock(getCode(commands.setExtruderTemperature), sOutput.format(temp), tFormat.format(id));
    }
  }
}

function onLayer(num) {
  if (typeof executeTempTowerFeatures == "function") {
    executeTempTowerFeatures(num);
  }
  writeComment("Layer : " + integerFormat.format(num) + " of " + integerFormat.format(layerCount));
  writeBlock(mFormat.format(73), pFormat.format((num - 1) / layerCount * 100), "; Update Progress"); // write progress
}

// include("../common/onBedTemp.cpi");  // printer specific logic implemented
// include("../common/onExtruderTemp.cpi");  // printer specific logic implemented
// >>>>> INCLUDED FROM ../common/onExtruderChange.cpi
function onExtruderChange(id) {
  if (id > machineConfiguration.getNumberExtruders()) {
    error(subst(localize("This printer does not support the extruder '%1'."), integerFormat.format(id)));
    return;
  }
  writeBlock(getCode(commands.extruderChangeCommand), tFormat.format(id));
  activeExtruder = id;
  forceXYZE();
}
// <<<<< INCLUDED FROM ../common/onExtruderChange.cpi
// >>>>> INCLUDED FROM ../common/onExtrusionReset.cpi
function onExtrusionReset(length) {
  if (getProperty("relativeExtrusion")) {
    eOutput.setCurrent(0);
  }
  eOutput.reset();
  writeBlock(gFormat.format(92), eOutput.format(length));
}
// <<<<< INCLUDED FROM ../common/onExtrusionReset.cpi
// >>>>> INCLUDED FROM ../common/onFanSpeed.cpi
function onFanSpeed(speed, id) {
  if (!commands.fan) {
    return;
  }
  if (speed == 0) {
    writeBlock(getCode(commands.fan.off));
  } else {
    writeBlock(getCode(commands.fan.on), sOutput.format(speed));
  }
}
// <<<<< INCLUDED FROM ../common/onFanSpeed.cpi
// include("../common/onLayer.cpi");  // Layer progress indicator
// >>>>> INCLUDED FROM ../common/writeProgramHeader.cpi
function writeProgramHeader() {
  if (programName) {
    writeComment(programName);
  }
  if (programComment) {
    writeComment(programComment);
  }
  writeComment(subst(localize("Printer name: %1 %2"), machineConfiguration.getVendor(), machineConfiguration.getModel()));
  writeComment("TIME:" + integerFormat.format(printTime));  // do not localize
  writeComment(subst(localize("Print time: %1"), formatCycleTime(printTime)));
  for (var i = 1; i <= numberOfExtruders; ++i) {

    writeComment(subst(localize("Extruder %1 material used: %2"), i, dimensionFormat.format(getExtruder(i).extrusionLength)));
    writeComment(subst(localize("Extruder %1 material name: %2"), i, getExtruder(i).materialName));
    writeComment(subst(localize("Extruder %1 filament diameter: %2"), i, xyzFormat.format(getExtruder(i).filamentDiameter) + localize("mm")));
    writeComment(subst(localize("Extruder %1 nozzle diameter: %2"), i, xyzFormat.format(getExtruder(i).nozzleDiameter) + localize("mm")));
    writeComment(subst(localize("Extruder %1 offset x: %2"), i, dimensionFormat.format(machineConfiguration.getExtruderOffsetX(i))));
    writeComment(subst(localize("Extruder %1 offset y: %2"), i, dimensionFormat.format(machineConfiguration.getExtruderOffsetY(i))));
    writeComment(subst(localize("Extruder %1 offset z: %2"), i, dimensionFormat.format(machineConfiguration.getExtruderOffsetZ(i))));
    writeComment(subst(localize("Extruder %1 max temp: %2"), i, integerFormat.format(getExtruder(i).temperature)));
  }
  writeComment(subst(localize("Bed temp: %1"), integerFormat.format(bedTemp)));
  writeComment(subst(localize("Layer count: %1"), integerFormat.format(layerCount)));
  writeComment(subst(localize("Width: %1"), dimensionFormat.format(machineConfiguration.getWidth() - machineConfiguration.getCenterPositionX())));
  writeComment(subst(localize("Depth: %1"), dimensionFormat.format(machineConfiguration.getDepth() - machineConfiguration.getCenterPositionY())));
  writeComment(subst(localize("Height: %1"), dimensionFormat.format(machineConfiguration.getHeight() + machineConfiguration.getCenterPositionZ())));
  writeComment(subst(localize("Center x: %1"), dimensionFormat.format((machineConfiguration.getWidth() / 2.0) - machineConfiguration.getCenterPositionX())));
  writeComment(subst(localize("Center y: %1"), dimensionFormat.format((machineConfiguration.getDepth() / 2.0) - machineConfiguration.getCenterPositionY())));
  writeComment(subst(localize("Center z: %1"), dimensionFormat.format(machineConfiguration.getCenterPositionZ())));
  writeComment(subst(localize("Count of bodies: %1"), integerFormat.format(partCount)));
  writeComment(subst(localize("Fusion version: %1"), getGlobalParameter("version")));
}
// <<<<< INCLUDED FROM ../common/writeProgramHeader.cpi
// >>>>> INCLUDED FROM ../common/commonAdditiveFunctions.cpi
function writeBlock() {
  writeWords(arguments);
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
  return text != "" ?  prefix + text + suffix : "";
}

/**
  Output a comment.
*/
function writeComment(text) {
  if (!text) {
    return;
  }
  var comments = String(text).split(EOL);
  for (comment in comments) {
    var _comment = formatComment(comments[comment]);
    if (_comment) {
      writeln(_comment);
    }
  }
}

function onComment(text) {
  writeComment(text);
}

function forceXYZE() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
  eOutput.reset();
}

function getCode(code) {
  return typeof code == "undefined" ? "" : code;
}

function onParameter(name, value) {
  switch (name) {
  case "feedRate":
    rapidFeedrate = toPreciseUnit(value, MM) > highFeedrate ? highFeedrate : toPreciseUnit(value, MM);
    break;
  }
}

var nextTriggerValue;
var newTemperature;
var maximumExtruderTemp = 260;
function executeTempTowerFeatures(num) {
  if (settings.maximumExtruderTemp != undefined) {
    maximumExtruderTemp = settings.maximumExtruderTemp;
  }
  if (getProperty("_trigger") != "disabled") {
    var multiplier = getProperty("_trigger") == "height" ? 100 : 1;
    var currentValue = getProperty("_trigger") == "height" ? xyzFormat.format(getCurrentPosition().z * 100) : (num - 1);
    if (num == 1) { // initialize
      nextTriggerValue = getProperty("_triggerValue") * multiplier;
      newTemperature = getProperty("tempStart");
    } else {
      if (currentValue >= nextTriggerValue) {
        newTemperature += getProperty("tempInterval");
        nextTriggerValue += getProperty("_triggerValue") * multiplier;
        if (newTemperature <= maximumExtruderTemp) {
          onExtruderTemp(newTemperature, false, activeExtruder);
        } else {
          error(subst(
            localize("Requested extruder temperature of '%1' exceeds the maximum value of '%2'."), newTemperature, maximumExtruderTemp)
          );
        }
      }
    }
  }
}

function formatCycleTime(cycleTime) {
  var seconds = cycleTime % 60 | 0;
  var minutes = ((cycleTime - seconds) / 60 | 0) % 60;
  var hours = (cycleTime - minutes * 60 - seconds) / (60 * 60) | 0;
  if (hours > 0) {
    return subst(localize("%1h:%2m:%3s"), hours, minutes, seconds);
  } else if (minutes > 0) {
    return subst(localize("%1m:%2s"), minutes, seconds);
  } else {
    return subst(localize("%1s"), seconds);
  }
}

var rapidFeedrate = highFeedrate;
function onRapid(_x, _y, _z) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = feedOutput.format(rapidFeedrate);

  if (settings.skipParkPosition) {
    var num =
      (!xyzFormat.areDifferent(_x, currentSection.getFinalPosition().x) ? 1 : 0) +
      (!xyzFormat.areDifferent(_y, currentSection.getFinalPosition().y) ? 1 : 0) +
      (!xyzFormat.areDifferent(_z, currentSection.getFinalPosition().z) ? 1 : 0);
    if (num > 0 && isLastMotionRecord(getNextRecord().getId() + 1)) {
      return; // skip movements to park position
    }
  }
  if (x || y || z || f) {
    writeBlock(gMotionModal.format(settings.useG0 ? 0 : 1), x, y, z, f);
    feedOutput.reset();
  }
}

function onLinearExtrude(_x, _y, _z, _f, _e) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = feedOutput.format(_f);
  var e = eOutput.format(_e);
  if (x || y || z || f || e) {
    writeBlock(gMotionModal.format(1), x, y, z, f, e);
  }
}

function onCircularExtrude(_clockwise, _cx, _cy, _cz, _x, _y, _z, _f, _e) {
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = feedOutput.format(_f);
  var e = eOutput.format(_e);
  var start = getCurrentPosition();
  var i = iOutput.format(_cx - start.x);
  var j = jOutput.format(_cy - start.y);

  switch (getCircularPlane()) {
  case PLANE_XY:
    writeBlock(gMotionModal.format(_clockwise ? 2 : 3), x, y, i, j, f, e);
    break;
  default:
    linearize(tolerance);
  }
}

function getLayersFromProperty(_property) {
  var layer = getProperty(_property).toString().split(",");
  for (var i in layer) {
    if (!isNaN(parseFloat(layer[i])) && !isNaN(layer[i] - 0) && (layer[i] - Math.floor(layer[i])) === 0) {
      layer[i] = parseFloat(layer[i], 10);
    } else {
      error(subst(
        localize("The property '%1' contains an invalid value of '%2'. Only integers are allowed."), _property.title, layer[i])
      );
      return undefined;
    }
  }
  return layer; // returns an array of layer numbers as integers
}

var pauseLayers;
function pausePrint(num) {
  if (getProperty("pauseLayers") != "") {
    validate(commands.pauseCommand != undefined, "The pause command is not defined.");
    if (num == 1) { // initialize array
      pauseLayers = getLayersFromProperty(properties.pauseLayers);
    }
    if (pauseLayers.indexOf(num) > -1) {
      writeComment(localize("PAUSE PRINT"));
      writeBlock(getCode(commands.displayCommand), getProperty("pauseMessage"));
      forceXYZE();
      writeBlock(gMotionModal.format(1), zOutput.format(machineConfiguration.getParkPositionZ()));
      writeBlock(gMotionModal.format(1), xOutput.format(machineConfiguration.getParkPositionX()), yOutput.format(machineConfiguration.getParkPositionY()));
      writeBlock(getCode(commands.pauseCommand));
    }
  }
}

var changeLayers;
function changeFilament(num) {
  if (getProperty("changeLayers") != "") {
    validate(commands.changeFilament.command != undefined, "The filament change command is not defined.");
    if (num == 1) { // initialize array
      changeLayers = getLayersFromProperty(properties.changeLayers);
    }
    if (changeLayers.indexOf(num) > -1) {
      writeComment(localize("FILAMENT CHANGE"));
      if (getProperty("changeMessage") != "") {
        writeBlock(getCode(commands.displayCommand), getProperty("changeMessage"));
      }
      var words = new Array();
      words.push(commands.changeFilament.command);
      /*
      if (!getProperty("useFirmwareConfiguration")) {
        words.push("X" + xyzFormat.format(machineConfiguration.getParkPositionX()));
        words.push("Y" + xyzFormat.format(machineConfiguration.getParkPositionY()));
        words.push("Z" + xyzFormat.format(getProperty("zPosition")));
        words.push(commands.changeFilament.initialRetract + xyzFormat.format(getProperty("initialRetract")));
        words.push(commands.changeFilament.removalRetract + xyzFormat.format(getProperty("removalRetract")));
      }
      */
      writeBlock(words);
      forceXYZE();
      feedOutput.reset();
    }
  }
}

function isLastMotionRecord(record) {
  while (!(getRecord(record).isMotion())) {
    if (getRecord(record).getType() == RECORD_OPERATION_END) {
      return true;
    }
    ++record;
  }
  return false;
}
// <<<<< INCLUDED FROM ../common/commonAdditiveFunctions.cpi
