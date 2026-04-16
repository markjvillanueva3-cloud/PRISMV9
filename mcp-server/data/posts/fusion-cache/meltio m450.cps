/**
  Copyright (C) 2018-2022 by Autodesk, Inc.
  All rights reserved.

  Meltio M450 DED post configuration.

  $Revision: 44106 42162b6c37d8849644d694c053a201a331ea3c40 $
  $Date: 2023-10-25 14:30:07 $

  FORKID {1C80CAA7-D8B4-4AAC-86B5-F42F646E9760}
*/

description = "Meltio M450";
vendor = "Meltio";
vendorUrl = "http://www.meltio3d.com";
legal = "Copyright (C) 2012-2022 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "Meltio M450 post to export DED toolpaths using the additive fff operations in gcode format";

extension = "gcode";
setCodePage("ascii");

capabilities = CAPABILITY_ADDITIVE;
tolerance = spatial(0.002, MM);
highFeedrate = toPreciseUnit(3000, MM);

// needed for range checking, will be effectively passed from Fusion
var printerLimits = {
  x: {min:0, max:150.0}, //Defines the x bed size
  y: {min:0, max:150.0}, //Defines the y bed size
  z: {min:0, max:450.0} //Defines the z bed size
};

// user-defined properties
properties = {
  shieldGas: {
    title      : "Shield Gas",
    description: "Shield Gas Flow Rate (L/min)",
    type       : "integer",
    value      : 5000,
    scope      : "post"
  },
  hotWireVoltage: {
    title      : "Hot Wire Voltage",
    description: "Set Hot Wire Voltage (V)",
    type       : "integer",
    value      : 5000,
    scope      : "post"
  },
  hotWireCurrent: {
    title      : "Hot Wire Current",
    description: "Set Hot Wire Current (A)",
    type       : "integer",
    value      : 1,
    scope      : "post"
  },
  comperatorVoltage: {
    title      : "Comperator Voltage",
    description: "Comperator Voltage",
    type       : "integer",
    value      : 4000,
    scope      : "post"
  }
};

var extruderOffsets = [[0, 0, 0], [0, 0, 0]];
var activeExtruder = 0;  //Track the active extruder.

var integerFormat = createFormat({decimals:0});
var xyzFormat;
var xFormat;
var yFormat;
var zFormat;

var fFormat = createFormat({prefix:"F", zeropad:false});
var gFormat = createFormat({prefix:"G", width:1, zeropad:false, decimals:0});
var mFormat = createFormat({prefix:"M", width:2, zeropad:true, decimals:0});
var sFormat = createFormat({prefix:"S", zeropad:false});
var tFormat = createFormat({prefix:"T", width:1, zeropad:false, decimals:0});
var wFormat = createFormat({prefix:"W", zeropad:false});

var feedFormat;
var dimensionFormat;

var gMotionModal = createModal({force:true}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createModal({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19 //Actually unused
var gAbsIncModal = createModal({}, gFormat); // modal group 3 // G90-91
var depositionModal = createModal({}, mFormat);

var xOutput;
var yOutput;
var zOutput;
var feedOutput;
var eOutput;  // Extrusion length

var layerHeight = 0;
var currentHeight = 0;

// generic functions

// Writes the specified block.
function writeBlock() {
  writeWords(arguments);
}

function formatComment(text) {
  return ";" + text;
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

// onOpen helper functions

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

function getPrinterGeometry() {
  machineConfiguration = getMachineConfiguration();

  // Get the printer geometry from the machine configuration
  printerLimits.x.min = 0 - machineConfiguration.getCenterPositionX();
  printerLimits.y.min = 0 - machineConfiguration.getCenterPositionY();
  printerLimits.z.min = 0 + machineConfiguration.getCenterPositionZ();

  printerLimits.x.max = machineConfiguration.getWidth() - machineConfiguration.getCenterPositionX();
  printerLimits.y.max = machineConfiguration.getDepth() - machineConfiguration.getCenterPositionY();
  printerLimits.z.max = machineConfiguration.getHeight() + machineConfiguration.getCenterPositionZ();

  extruderOffsets[0][0] = machineConfiguration.getExtruderOffsetX(1);
  extruderOffsets[0][1] = machineConfiguration.getExtruderOffsetY(1);
  extruderOffsets[0][2] = machineConfiguration.getExtruderOffsetZ(1);
  if (numberOfExtruders > 1) {
    extruderOffsets[1] = [];
    extruderOffsets[1][0] = machineConfiguration.getExtruderOffsetX(2);
    extruderOffsets[1][1] = machineConfiguration.getExtruderOffsetY(2);
    extruderOffsets[1][2] = machineConfiguration.getExtruderOffsetZ(2);
  }
}

function setFormats(_desiredUnit) {
  // Do we need to force the output in millimeter, as some firmware doesn't support inches output?
  if (_desiredUnit != unit) {
    writeComment(subst(localize("Outputting the code in %1 since the printer does not support switching unit via G20/G21."), _desiredUnit == IN ? "inches" : "millimeters"));
    unit = _desiredUnit;
  }

  xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
  xFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
  yFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
  zFormat = createFormat({decimals:(unit == MM ? 3 : 4)});
  feedFormat = createFormat({decimals:(unit == MM ? 0 : 1)});
  dimensionFormat = createFormat({decimals:(unit == MM ? 3 : 4), zeropad:false, suffix:(unit == MM ? "mm" : "in")});

  xOutput = createVariable({prefix:"X"}, xFormat);
  yOutput = createVariable({prefix:"Y"}, yFormat);
  zOutput = createVariable({prefix:"Z"}, zFormat);
  feedOutput = createVariable({prefix:"F"}, feedFormat);
  eOutput = createIncrementalVariable({prefix:"E"}, xyzFormat); // extrusion length
  sOutput = createVariable({prefix:"S", force:true}, xyzFormat); // parameter temperature or speed
  iOutput = createReferenceVariable({prefix:"I", force:true}, xyzFormat); // circular output
  jOutput = createReferenceVariable({prefix:"J", force:true}, xyzFormat); // circular output
}

function onOpen() {
  setFormats(MM); // machine require input code in MM

  getPrinterGeometry();

  if (programName) {
    writeComment(programName);
  }
  if (programComment) {
    writeComment(programComment);
  }

  writeComment("Printer Name: " + machineConfiguration.getVendor() + " " + machineConfiguration.getModel());
  writeComment("Print Time: " + xyzFormat.format(printTime) + "s");
  writeComment("Duration : " + formatCycleTime(printTime) + "  " + integerFormat.format(layerCount) + " layers");
  writeComment("Material Used: " + dimensionFormat.format(getExtruder(1).extrusionLength));
  writeComment("Material Name: " + getExtruder(1).materialName);
  writeComment("Wire Filament Diameter: " + dimensionFormat.format(getExtruder(1).filamentDiameter));
  writeComment("Layer Count: " + integerFormat.format(layerCount));

  if (hasGlobalParameter("ext2-extrusion-len") &&
    hasGlobalParameter("ext2-nozzle-dia") &&
    hasGlobalParameter("ext2-temp") && hasGlobalParameter("ext2-filament-dia") &&
    hasGlobalParameter("ext2-material-name")
  ) {
    writeComment("Extruder 2 Material Used: " + dimensionFormat.format(getExtruder(2).extrusionLength));
    writeComment("Extruder 2 Material Name: " + getExtruder(2).materialName);
    writeComment("Extruder 2 Filament Diameter: " + dimensionFormat.format(getExtruder(2).filamentDiameter));
    writeComment("Extruder 2 Nozzle Diameter: " + dimensionFormat.format(getExtruder(2).nozzleDiameter));
    writeComment("Extruder 2 Max Temp: " + integerFormat.format(getExtruder(2).temperature));
    writeComment("Extruder 2 Offset X: " + dimensionFormat.format(extruderOffsets[1][0]));
    writeComment("Extruder 2 Offset Y: " + dimensionFormat.format(extruderOffsets[1][1]));
    writeComment("Extruder 2 Offset Z: " + dimensionFormat.format(extruderOffsets[1][2]));
  }

  writeComment("Count of Bodies: " + integerFormat.format(partCount));
  writeComment("Version of Fusion: " + getGlobalParameter("version"));

  writeBlock(" ");
  writeBlock("----Process setup----");
  writeBlock(gAbsIncModal.format(90), formatComment("Absolute mode"));
  writeBlock(mFormat.format(83), formatComment("Wire feeder relative mode"));
  writeBlock(mFormat.format(106), sFormat.format(0));
  writeBlock(gFormat.format(119), "Z" + integerFormat.format(0), formatComment("Set temporary Z offset to zero"));
  writeBlock(gFormat.format(29), fFormat.format(0), formatComment("Maintain compensation throughout the print"));
  writeBlock(gFormat.format(29), "A", formatComment("Activate Z live offset"));
  writeBlock(gFormat.format(215), "Z" + integerFormat.format(1), formatComment("Turn on shield gas"));
  writeBlock(gFormat.format(215), wFormat.format(1));
  writeBlock(gFormat.format(215), "F" + integerFormat.format(getProperty("shieldGas")), formatComment("Set Shield gas flow rate"));
  writeBlock(" ");
  writeComment("Setup process control");
  writeBlock(gFormat.format(122), "S" + integerFormat.format(getProperty("comperatorVoltage")), formatComment("Set comperator voltage"));
  writeBlock(gFormat.format(112), "V" + integerFormat.format(getProperty("hotWireVoltage")),
    "C" + integerFormat.format(getProperty("hotWireCurrent")), formatComment("Set hotwire voltage and current"));
  writeBlock(" ");
  writeBlock(";" + gFormat.format(113), sFormat.format(50), formatComment("Start blower fan at 50%"));
  writeBlock(gFormat.format(100), fFormat.format(1), formatComment("Turn on door fan"));
  writeBlock(mFormat.format(400), formatComment("Ensure all above commands have been executed"));
  writeBlock(gFormat.format(4), sFormat.format(4), formatComment("Wait"));
  writeBlock(gFormat.format(114), formatComment("Tare the load cell"));
  writeBlock(mFormat.format(400), formatComment("Ensure all above commands have been executed"));
  writeBlock(gFormat.format(4), sFormat.format(2), formatComment("Wait"));
  writeBlock(mFormat.format(400), formatComment("Ensure all above commands have been executed"));
  writeBlock(mFormat.format(83), formatComment("Wire feeder relative mode"));
  writeBlock(" ");
  writeBlock(gFormat.format(28), "X" + xyzFormat.format(0), formatComment("Home X"));
  writeBlock(gFormat.format(28), "Y" + xyzFormat.format(0), formatComment("Home Y"));
  writeBlock(gFormat.format(1), xOutput.format(toPreciseUnit(75, MM)), yOutput.format(toPreciseUnit(85, MM)), feedOutput.format(toPreciseUnit(2000, MM)), formatComment("Go to center for first probe"));      //++++++++++++++------------------
  writeBlock(" ");
  writeBlock(mFormat.format(102), formatComment("Probe Z"));
  writeBlock(tFormat.format(0), formatComment("Select tool zero"));
  writeBlock(" ");
  writeBlock("----Toolpath----");
  depositionModal.format(103);// to disable the first output
}

// generic helper functions

/** Force output of X, Y, and Z. */
function forceXYZ() {
  xOutput.reset();
  yOutput.reset();
  zOutput.reset();
}

function forceFeed() {
  feedOutput.reset();
}

function onSection() {
  var range = currentSection.getBoundingBox();
  axes = ["x", "y", "z"];
  formats = [xFormat, yFormat, zFormat];
  for (var element in axes) {
    var min = formats[element].getResultingValue(range.lower[axes[element]]);
    var max = formats[element].getResultingValue(range.upper[axes[element]]);
    if (printerLimits[axes[element]].max < max || printerLimits[axes[element]].min > min) {
      error(localize("A toolpath is outside of the build volume."));
    }
  }
  currentHeight = 0;
}

// miscellaneous entry functions

function onComment(message) {
  writeComment(message);
}

function onParameter(name, value) {
}

// additive entry functions

function onLayer(num) {
  writeComment(" layer " + integerFormat.format(num) + ", Z = " + xyzFormat.format(currentHeight));
  if (num == 1) {
    layerHeight = getGlobalParameter("layer-height-first", 0);
  } else {
    layerHeight = getGlobalParameter("layer-height", 0);
  }
  currentHeight += layerHeight;
}

// motion entry functions
function onRapid(_x, _y, _z) {
  writeBlock(depositionModal.format(103)); // disable deposition
  forceXYZ();
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z - layerHeight); // fff toolpath generate at the bead top, DED need the bead bottom coordinate
  var f = feedOutput.format(toPreciseUnit(highFeedrate, MM));
  if (x || y || z) {
    writeBlock(gMotionModal.format(1), x, y, z, f);
  }

  forceFeed();
}

function onLinearExtrude(_x, _y, _z, _f, _e) {
  writeBlock(depositionModal.format(101)); // enable deposition
  forceXYZ();
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z - layerHeight); // fff toolpath generate at the bead top, DED need the bead bottom coordinate
  var f = feedOutput.format(_f);
  var e = eOutput.format(_e);
  if (x || y || z || f || e) {
    writeBlock(gMotionModal.format(1), x, y, z, f, e);
  }
}

function onClose() {
  writeln("");
  writeComment("End of gcode");
  depositionModal.reset();
  writeBlock(depositionModal.format(103));
  depositionModal.reset();
  writeBlock(" ");
  writeBlock(mFormat.format(140), sFormat.format(0), formatComment("Turn off bed"));
  writeBlock(gFormat.format(112), "P", "O", formatComment("Turn off TDK completely"));
  writeBlock(gFormat.format(108), "P", "O", formatComment("Laser off and set to zero"));
  writeBlock(gFormat.format(215), "Z" + integerFormat.format(0), formatComment("Turn off shielding gas"));
  writeBlock(gFormat.format(215), "F0000", formatComment("Set flow rate to zero"));
  writeBlock(gFormat.format(215), "Z" + integerFormat.format(0));
  writeBlock(gFormat.format(215), wFormat.format(0));
  writeBlock(gFormat.format(215), fFormat.format(0));
  writeBlock(" ");
  writeBlock(gAbsIncModal.format(90));
  writeBlock(depositionModal.format(103));
  writeBlock(gAbsIncModal.format(91));
  writeBlock(gFormat.format(1), zOutput.format(toPreciseUnit(20, MM)), feedOutput.format(toPreciseUnit(1000, MM)));
  writeBlock(gAbsIncModal.format(90));
  writeBlock(" ");
  writeBlock(mFormat.format(400));
  writeBlock(gFormat.format(4), sFormat.format(2), formatComment("wait for filer fan to stop"));
  writeBlock(mFormat.format(400));
  writeBlock(gFormat.format(113), sFormat.format(100));
  writeBlock(gFormat.format(4), sFormat.format(60));
  writeBlock(gFormat.format(113), sFormat.format(0));
  writeBlock(gFormat.format(100), fFormat.format(0));
}

function setProperty(property, value) {
  properties[property].current = value;
}
