/**
  Copyright (C) 2018-2023 by Autodesk, Inc.
  All rights reserved.

 LulzBot post processor configuration.

  $Revision: 44106 85222cccf9cee3e216d9ee111aa5823d026a774f $
  $Date: 2024-01-03 15:11:55 $

  FORKID {76576242-61D1-4860-B383-89EB860D8E0A}
*/

description = "LulzBot";
vendor = "LulzBot";
vendorUrl = "https://www.lulzbot.com/";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Post for exporting toolpath to the LulzBot mini, mini 2, TAZ 5, TAZ 6, TAZ Pro, TAZ Pro S, TAZ Pro XT, TAZ SideKick, TAZ Workhorse";

extension = "gcode";
setCodePage("ascii");

capabilities = CAPABILITY_ADDITIVE;
tolerance = spatial(0.002, MM);

highFeedrate = toPreciseUnit(6000, MM);
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.4, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = false; // disable helical support
allowSpiralMoves = false; // disable spiral support
allowedCircularPlanes = 1 << PLANE_XY; // allow XY circular motion

// user-defined properties
properties = {
  printerModel: {
    title      : "Printer model",
    description: "Select the printer model for generating the gcode.",
    type       : "enum",
    values     : [
      {title:"mini", id:"mini"},
      {title:"mini 2", id:"mini2"},
      {title:"TAZ 5", id:"taz5"},
      {title:"TAZ 6", id:"taz6"},
      {title:"TAZ Pro S", id:"tazpros"},
      {title:"TAZ Pro XT", id:"tazproxt"},
      {title:"TAZ Pro", id:"tazpro"},
      {title:"TAZ Sidekick 289", id:"tazsidekick289"},
      {title:"TAZ Sidekick 747", id:"tazsidekick747"},
      {title:"TAZ Workhorse", id:"tazworkhorse"},
    ],
    value: "taz5",
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
var integerFormat = createFormat({decimals:0});
var gMotionModal = createOutputVariable({control:CONTROL_FORCE}, gFormat); // modal group 1 - G0-G3
var gAbsIncModal = createOutputVariable({}, gFormat); // modal group 3 - G90-91

// Specify the required commands for your printer below.
var commands = {
  extruderChangeCommand : undefined, // command to change the extruder
  setExtruderTemperature: mFormat.format(104), // command to set the extruder temperature
  waitExtruder          : mFormat.format(109), // wait command for the extruder temperature
  setBedTemperature     : mFormat.format(140), // command to set the bed temperature
  waitBed               : mFormat.format(190), // wait command for the bed temperature
  reportTemperatures    : undefined, // command to report the temperatures to the printer
  fan                   : {on:mFormat.format(106), off:mFormat.format(107)}, // command turn the fan on/off
  extrusionMode         : {relative:mFormat.format(83), absolute:mFormat.format(82)} // commands for relative / absolute filament extrusion mode
};

var settings = {
  useG0              : true, // specifies to either use G0 or G1 commands for rapid movements
  maximumExtruderTemp: 295, // specifies the maximum extruder temperature
  skipParkPosition   : false, // set to true to avoid output of the park position at the end of the program
  comments           : {
    permittedCommentChars: " abcdefghijklmnopqrstuvwxyz0123456789.,=_-*+:/'", // letters are not case sensitive, use option 'outputFormat' below. Set to 'undefined' to allow any character
    prefix               : ";", // specifies the prefix for the comment
    suffix               : "", // specifies the suffix for the comment
    outputFormat         : "ignoreCase", // can be set to "upperCase", "lowerCase" and "ignoreCase". Set to "ignoreCase" to write comments without upper/lower case formatting
    maximumLineLength    : 80 // the maximum number of characters allowed in a line
  }
};

// collected state
var activeExtruder = 0; // track the active extruder.
var machineType = "";

function setFormats(_desiredUnit) {
  if (_desiredUnit != unit) {
    writeComment(subst(localize("This printer does not support programs in %1."), _desiredUnit == IN ? "inches" : "millimeters"));
    writeComment(localize("The program has been converted to the supported unit."));
    unit = _desiredUnit;
  }

  xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
  feedFormat = createFormat({decimals:(unit == MM ? 0 : 1)});
  dimensionFormat = createFormat({decimals:(unit == MM ? 3 : 4), zeropad:false, suffix:(unit == MM ? "mm" : "in")});

  xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
  yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
  zOutput = createOutputVariable({prefix:"Z"}, xyzFormat);
  feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
  eOutput = createOutputVariable({prefix:"E", type:getProperty("relativeExtrusion") ? TYPE_INCREMENTAL : TYPE_ABSOLUTE}, xyzFormat);
  sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, xyzFormat); // parameter temperature or speed
  iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat); // circular output
  jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat); // circular output
}

function onOpen() {
  setFormats(MM); // machine require input code in MM
  if (typeof writeProgramHeader == "function") {
    writeProgramHeader();
  }
  writeBlock(gFormat.format(unit == MM ? 21 : 20)); // set unit
  writeBlock(gAbsIncModal.format(90));
  machineType = getProperty("printerModel");
  if ((machineType == "mini") || (machineType == "mini2") || (machineType == "taz6")) {
    writeBlock(gFormat.format(26)); // clear probe fail
  }
  writeBlock(getCode(getProperty("relativeExtrusion") ? commands.extrusionMode.relative : commands.extrusionMode.absolute));

  // homing
  writeBlock(gFormat.format(28), xOutput.format(0), yOutput.format(0));
  writeBlock(gFormat.format(28), zOutput.format(0));
  writeBlock(mFormat.format(117), localize("Heating..."));
  writeBlock(mFormat.format(400)); // wait for finished moves
}

// lulzBot bed leveling
function bedLeveling() {
  writeBlock(mFormat.format(204), sOutput.format(toPreciseUnit((machineType == "taz6" ? 100 : 300), MM))); // set probe acceleration
  writeBlock(gFormat.format(29)); // probe
  writeBlock(mFormat.format(420), sOutput.format(1)); // enable bed mesh
  writeBlock(mFormat.format(425), "Z"); // use z backlask compensation
  writeBlock(mFormat.format(425), "Z", "F0"); // turn off z backlask compensation
  writeBlock(mFormat.format(204), sOutput.format(toPreciseUnit((machineType == "taz6" ? 500 : 2000), MM))); // set travel acceleration
  zOutput.reset();  // reset the output of the variables used when activating the bed leveling function
  feedOutput.reset();
}

function onSection() {
  forceXYZE();
  // approach start point
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  writeBlock(gMotionModal.format(1), zOutput.format(initialPosition.z), feedOutput.format(highFeedrate));

  // eventually wipe on some models, then move to initial Z
  if ((machineType == "mini") || (machineType == "mini2") || (machineType == "taz6")) {
    bedLeveling();
    writeBlock(gMotionModal.format(1), zOutput.format(initialPosition.z), feedOutput.format(highFeedrate)); // move extruder away from build plate
  }

  writeBlock(gMotionModal.format(1), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), feedOutput.format(highFeedrate));
  writeBlock(gFormat.format(92), eOutput.format(0));
  forceXYZE();
  writeBlock(mFormat.format(117), localize("Printing..."));
  writeBlock(mFormat.format(73), "P0");
  writeBlock(mFormat.format(75));
}

function onClose() {
  writeBlock(mFormat.format(400)); // end all moves
  writeBlock(mFormat.format(77), formatComment("end print timer"));
  writeComment("Turn off axis");
  writeBlock(mFormat.format(84));
  writeBlock(mFormat.format(82));
  writeBlock(gAbsIncModal.format(90));
  writeBlock(mFormat.format(117), localize("Print complete"));
  writeComment(localize("END OF GCODE"));
}

// >>>>> INCLUDED FROM ../common/onBedTemp.cpi
function onBedTemp(temp, wait) {
  if (wait) {
    writeBlock(getCode(commands.reportTemperatures));
    writeBlock(getCode(commands.waitBed), sOutput.format(temp));
  } else {
    writeBlock(getCode(commands.setBedTemperature), sOutput.format(temp));
  }
}
// <<<<< INCLUDED FROM ../common/onBedTemp.cpi
// >>>>> INCLUDED FROM ../common/onExtruderTemp.cpi
function onExtruderTemp(temp, wait, id) {
  if (typeof executeTempTowerFeatures == "function" && getProperty("_trigger") != undefined) {
    if (getProperty("_trigger") != "disabled" && (getCurrentPosition().z == 0)) {
      temp = getProperty("tempStart"); // override temperature with the starting temperature for the temp tower feature
    }
  }
  if (wait) {
    writeBlock(getCode(commands.reportTemperatures));
    writeBlock(getCode(commands.waitExtruder), sOutput.format(temp), tFormat.format(id));
  } else {
    writeBlock(getCode(commands.setExtruderTemperature), sOutput.format(temp), tFormat.format(id));
  }
}
// <<<<< INCLUDED FROM ../common/onExtruderTemp.cpi
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
// >>>>> INCLUDED FROM ../common/onLayer.cpi
function onLayer(num) {
  if (typeof executeTempTowerFeatures == "function") {
    executeTempTowerFeatures(num);
  }
  if (num == 1) {
    writeComment("LAYER_COUNT:" + integerFormat.format(layerCount));
  }
  writeComment("LAYER:" + integerFormat.format(num));
  if (typeof changeFilament == "function" && getProperty("changeLayers") != undefined) {
    changeFilament(num);
  }
  if (typeof pausePrint == "function" && getProperty("pauseLayers") != undefined) {
    pausePrint(num);
  }
}
// <<<<< INCLUDED FROM ../common/onLayer.cpi
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
