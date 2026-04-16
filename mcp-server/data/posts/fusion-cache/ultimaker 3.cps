/**
  Copyright (C) 2018-2023 by Autodesk, Inc.
  All rights reserved.

  Ultimaker 3 post processor configuration.

  $Revision: 44106 85222cccf9cee3e216d9ee111aa5823d026a774f $
  $Date: 2024-01-03 15:11:55 $

  FORKID {CB96FE40-2046-491E-8E17-A2BA58ABD7B4}
*/

description = "Ultimaker 3";
vendor = "Ultimaker";
vendorUrl = "https://ultimaker.com/";
legal = "Copyright (C) 2012-2023 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45917;

longDescription = "Post for exporting toolpath to the Ultimaker 3 range of printers in gcode format (3, 3 extended, S3...)";

// >>>>> INCLUDED FROM ../base/ultimaker base.cps

extension = "gcode";
setCodePage("ascii");

capabilities = CAPABILITY_ADDITIVE;
tolerance = spatial(0.002, MM);

highFeedrate = toPreciseUnit(18000, MM);
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
  writeDate: {
    title      : "Write date",
    description: "Specifies if the Generator Build Date is shown in nc output.",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  extruder1Material: {
    title      : "Extruder 1 material",
    description: "Select material for the extruder 1. Selecting None will disable the material definition output.",
    type       : "enum",
    values     : [
      {title:"None", id:"None"},
      {title:"Generic ABS", id:"Generic ABS"},
      {title:"Generic Breakaway", id:"Generic Breakaway"},
      {title:"Generic CPE", id:"Generic CPE"},
      {title:"Generic CPE+", id:"Generic CPE+"},
      {title:"Generic Nylon", id:"Generic Nylon"},
      {title:"Generic PC", id:"Generic PC"},
      {title:"Generic PLA", id:"Generic PLA"},
      {title:"Generic PP", id:"Generic PP"},
      {title:"Generic PVA", id:"Generic PVA"},
      {title:"Generic TPU 95A", id:"Generic TPU 95A"},
      {title:"Generic Tough PLA", id:"Generic Tough PLA"},
      {title:"Ultimaker ABS", id:"Ultimaker ABS"},
      {title:"Ultimaker Breakaway", id:"Ultimaker Breakaway"},
      {title:"Ultimaker CPE", id:"Ultimaker CPE"},
      {title:"Ultimaker CPE+", id:"Ultimaker CPE+"},
      {title:"Ultimaker Nylon", id:"Ultimaker Nylon"},
      {title:"Ultimaker PC", id:"Ultimaker PC"},
      {title:"Ultimaker PLA", id:"Ultimaker PLA"},
      {title:"Ultimaker PP", id:"Ultimaker PP"},
      {title:"Ultimaker PVA", id:"Ultimaker PVA"},
      {title:"Ultimaker TPU 95A", id:"Ultimaker TPU 95A"},
      {title:"Ultimaker Tough PLA", id:"Ultimaker Tough PLA"}
    ],
    value: "Generic ABS",
    scope: "post"
  },
  extruder1MaterialColor: {
    title      : "Extruder 1 material color",
    description: "Select material color for the extruder 1.",
    type       : "enum",
    values     : [
      {title:"Black", id:"Black"},
      {title:"Blue", id:"Blue"},
      {title:"Dark Grey", id:"Dark Grey"},
      {title:"Generic", id:"Generic"},
      {title:"Green", id:"Green"},
      {title:"Grey", id:"Grey"},
      {title:"Light Grey", id:"Light Grey"},
      {title:"Magenta", id:"Magenta"},
      {title:"Natural", id:"Natural"},
      {title:"Orange", id:"Orange"},
      {title:"Pearl Gold", id:"Pearl Gold"},
      {title:"Pearl-White", id:"Pearl-White"},
      {title:"Red", id:"Red"},
      {title:"Silver Metallic", id:"Silver Metallic"},
      {title:"Transparent", id:"Transparent"},
      {title:"White", id:"White"},
      {title:"Yellow", id:"Yellow"}
    ],
    value: "Black",
    scope: "post"
  },
  extruder1printcoreName: {
    title      : "Extruder 1 print core",
    description: "Select the name of the print core for the extruder 1." + EOL +
                 "AA: normal build materials (most common)" + EOL +
                 "BB: PVA supports" + EOL +
                 "CC: abrasive, composites and metal",
    type  : "enum",
    values: [
      {title:"AA 0.25", id:"AA 0.25"},
      {title:"AA 0.4", id:"AA 0.4"},
      {title:"AA 0.8", id:"AA 0.8"},
      {title:"BB 0.4", id:"BB 0.4"},
      {title:"BB 0.8", id:"BB 0.8"},
      {title:"CC 0.4", id:"CC 0.4"},
      {title:"CC 0.6", id:"CC 0.6"}
    ],
    value: "AA 0.4",
    scope: "post"
  },
  extruder2Material: {
    title      : "Extruder 2 material",
    description: "Select material for the extruder 2. Selecting None will disable the material definition output.",
    type       : "enum",
    values     : [
      {title:"None", id:"None"},
      {title:"Generic ABS", id:"Generic ABS"},
      {title:"Generic Breakaway", id:"Generic Breakaway"},
      {title:"Generic CPE", id:"Generic CPE"},
      {title:"Generic CPE+", id:"Generic CPE+"},
      {title:"Generic Nylon", id:"Generic Nylon"},
      {title:"Generic PC", id:"Generic PC"},
      {title:"Generic PLA", id:"Generic PLA"},
      {title:"Generic PP", id:"Generic PP"},
      {title:"Generic PVA", id:"Generic PVA"},
      {title:"Generic TPU 95A", id:"Generic TPU 95A"},
      {title:"Generic Tough PLA", id:"Generic Tough PLA"},
      {title:"Ultimaker ABS", id:"Ultimaker ABS"},
      {title:"Ultimaker Breakaway", id:"Ultimaker Breakaway"},
      {title:"Ultimaker CPE", id:"Ultimaker CPE"},
      {title:"Ultimaker CPE+", id:"Ultimaker CPE+"},
      {title:"Ultimaker Nylon", id:"Ultimaker Nylon"},
      {title:"Ultimaker PC", id:"Ultimaker PC"},
      {title:"Ultimaker PLA", id:"Ultimaker PLA"},
      {title:"Ultimaker PP", id:"Ultimaker PP"},
      {title:"Ultimaker PVA", id:"Ultimaker PVA"},
      {title:"Ultimaker TPU 95A", id:"Ultimaker TPU 95A"},
      {title:"Ultimaker Tough PLA", id:"Ultimaker Tough PLA"}
    ],
    value: "Generic ABS",
    scope: "post"
  },
  extruder2MaterialColor: {
    title      : "Extruder 2 material color",
    description: "Select material color for the extruder 2.",
    type       : "enum",
    values     : [
      {title:"Black", id:"Black"},
      {title:"Blue", id:"Blue"},
      {title:"Dark Grey", id:"Dark Grey"},
      {title:"Generic", id:"Generic"},
      {title:"Green", id:"Green"},
      {title:"Grey", id:"Grey"},
      {title:"Light Grey", id:"Light Grey"},
      {title:"Magenta", id:"Magenta"},
      {title:"Natural", id:"Natural"},
      {title:"Orange", id:"Orange"},
      {title:"Pearl Gold", id:"Pearl Gold"},
      {title:"Pearl-White", id:"Pearl-White"},
      {title:"Red", id:"Red"},
      {title:"Silver Metallic", id:"Silver Metallic"},
      {title:"Transparent", id:"Transparent"},
      {title:"White", id:"White"},
      {title:"Yellow", id:"Yellow"}
    ],
    value: "Black",
    scope: "post"
  },
  extruder2printcoreName: {
    title      : "Extruder 2 print core",
    description: "Select the name of the print core for the extruder 2." + EOL +
                 "AA: normal build materials (most common)" + EOL +
                 "BB: PVA supports" + EOL +
                 "CC: abrasive, composites and metal",
    type  : "enum",
    values: [
      {title:"AA 0.25", id:"AA 0.25"},
      {title:"AA 0.4", id:"AA 0.4"},
      {title:"AA 0.8", id:"AA 0.8"},
      {title:"BB 0.4", id:"BB 0.4"},
      {title:"BB 0.8", id:"BB 0.8"},
      {title:"CC 0.4", id:"CC 0.4"},
      {title:"CC 0.6", id:"CC 0.6"}
    ],
    value: "AA 0.4",
    scope: "post"
  }
};

// included properties
if (typeof properties != "object") {
  properties = {};
}
if (typeof groupDefinitions != "object") {
  groupDefinitions = {};
}

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
  extrusionMode         : {relative:mFormat.format(83), absolute:mFormat.format(82)}, // commands for relative / absolute filament extrusion mode
  displayCommand        : mFormat.format(117), // command to display a message on the printer screen
  pauseCommand          : mFormat.format(0) // command to pause the print, waiting for user manual restart
};

var settings = {
  useG0              : true, // specifies to either use G0 or G1 commands for rapid movements
  maximumExtruderTemp: 280, // specifies the maximum extruder temperature
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
var materialMapping = [
  {id:"Generic ABS", col:"Generic", guid:"60636bb4-518f-42e7-8237-fe77b194ebe0"},
  {id:"Generic Breakaway", col:"Generic", guid:"7e6207c4-22ff-441a-b261-ff89f166d6a0"},
  {id:"Generic CPE", col:"Generic", guid:"12f41353-1a33-415e-8b4f-a775a6c70cc6"},
  {id:"Generic CPE+", col:"Generic", guid:"e2409626-b5a0-4025-b73e-b58070219259"},
  {id:"Generic Nylon", col:"Generic", guid:"28fb4162-db74-49e1-9008-d05f1e8bef5c"},
  {id:"Generic PC", col:"Generic", guid:"98c05714-bf4e-4455-ba27-57d74fe331e4"},
  {id:"Generic PLA", col:"Generic", guid:"506c9f0d-e3aa-4bd4-b2d2-23e2425b1aa9"},
  {id:"Generic PP", col:"Generic", guid:"aa22e9c7-421f-4745-afc2-81851694394a"},
  {id:"Generic PVA", col:"Generic", guid:"86a89ceb-4159-47f6-ab97-e9953803d70f"},
  {id:"Generic TPU 95A", col:"Generic", guid:"1d52b2be-a3a2-41de-a8b1-3bcdb5618695"},
  {id:"Generic Tough PLA", col:"Generic", guid:"9d5d2d7c-4e77-441c-85a0-e9eefd4aa68c"},
  {id:"Ultimaker ABS", col:"Black", guid:"2f9d2279-9b0e-4765-bf9b-d1e1e13f3c49"},
  {id:"Ultimaker ABS", col:"Blue", guid:"7c9575a6-c8d6-40ec-b3dd-18d7956bfaae"},
  {id:"Ultimaker ABS", col:"Green", guid:"3400c0d1-a4e3-47de-a444-7b704f287171"},
  {id:"Ultimaker ABS", col:"Grey", guid:"8b75b775-d3f2-4d0f-8fb2-2a3dd53cf673"},
  {id:"Ultimaker ABS", col:"Orange", guid:"0b4ca6ef-eac8-4b23-b3ca-5f21af00e54f"},
  {id:"Ultimaker ABS", col:"Pearl Gold", guid:"7cbdb9ca-081a-456f-a6ba-f73e4e9cb856"},
  {id:"Ultimaker ABS", col:"Red", guid:"5df7afa6-48bd-4c19-b314-839fe9f08f1f"},
  {id:"Ultimaker ABS", col:"Silver Metallic", guid:"763c926e-a5f7-4ba0-927d-b4e038ea2735"},
  {id:"Ultimaker ABS", col:"White", guid:"5253a75a-27dc-4043-910f-753ae11bc417"},
  {id:"Ultimaker ABS", col:"Yellow", guid:"e873341d-d9b8-45f9-9a6f-5609e1bcff68"},
  {id:"Ultimaker Breakaway", col:"White", guid:"7e6207c4-22ff-441a-b261-ff89f166d5f9"},
  {id:"Ultimaker CPE", col:"Black", guid:"a8955dc3-9d7e-404d-8c03-0fd6fee7f22d"},
  {id:"Ultimaker CPE", col:"Blue", guid:"4d816290-ce2e-40e0-8dc8-3f702243131e"},
  {id:"Ultimaker CPE", col:"Dark Grey", guid:"10961c00-3caf-48e9-a598-fa805ada1e8d"},
  {id:"Ultimaker CPE", col:"Green", guid:"7ff6d2c8-d626-48cd-8012-7725fa537cc9"},
  {id:"Ultimaker CPE", col:"Light Grey", guid:"173a7bae-5e14-470e-817e-08609c61e12b"},
  {id:"Ultimaker CPE", col:"Red", guid:"00181d6c-7024-479a-8eb7-8a2e38a2619a"},
  {id:"Ultimaker CPE", col:"Transparent", guid:"bd0d9eb3-a920-4632-84e8-dcd6086746c5"},
  {id:"Ultimaker CPE", col:"White", guid:"881c888e-24fb-4a64-a4ac-d5c95b096cd7"},
  {id:"Ultimaker CPE", col:"Yellow", guid:"b9176a2a-7a0f-4821-9f29-76d882a88682"},
  {id:"Ultimaker CPE+", col:"Black", guid:"1aca047a-42df-497c-abfb-0e9cb85ead52"},
  {id:"Ultimaker CPE+", col:"Transparent", guid:"a9c340fe-255f-4914-87f5-ec4fcb0c11ef"},
  {id:"Ultimaker CPE+", col:"White", guid:"6df69b13-2d96-4a69-a297-aedba667e710"},
  {id:"Ultimaker Nylon", col:"Black", guid:"c64c2dbe-5691-4363-a7d9-66b2dc12837f"},
  {id:"Ultimaker Nylon", col:"Transparent", guid:"e256615d-a04e-4f53-b311-114b90560af9"},
  {id:"Ultimaker PC", col:"Black", guid:"e92b1f0b-a069-4969-86b4-30127cfb6f7b"},
  {id:"Ultimaker PC", col:"Transparent", guid:"8a38a3e9-ecf7-4a7d-a6a9-e7ac35102968"},
  {id:"Ultimaker PC", col:"White", guid:"5e786b05-a620-4a87-92d0-f02becc1ff98"},
  {id:"Ultimaker PLA", col:"Black", guid:"3ee70a86-77d8-4b87-8005-e4a1bc57d2ce"},
  {id:"Ultimaker PLA", col:"Blue", guid:"44a029e6-e31b-4c9e-a12f-9282e29a92ff"},
  {id:"Ultimaker PLA", col:"Green", guid:"2433b8fb-dcd6-4e36-9cd5-9f4ee551c04c"},
  {id:"Ultimaker PLA", col:"Magenta", guid:"fe3982c8-58f4-4d86-9ac0-9ff7a3ab9cbc"},
  {id:"Ultimaker PLA", col:"Orange", guid:"d9549dba-b9df-45b9-80a5-f7140a9a2f34"},
  {id:"Ultimaker PLA", col:"Pearl-White", guid:"d9fc79db-82c3-41b5-8c99-33b3747b8fb3"},
  {id:"Ultimaker PLA", col:"Red", guid:"9cfe5bf1-bdc5-4beb-871a-52c70777842d"},
  {id:"Ultimaker PLA", col:"Silver Metallic", guid:"0e01be8c-e425-4fb1-b4a3-b79f255f1db9"},
  {id:"Ultimaker PLA", col:"Transparent", guid:"532e8b3d-5fd4-4149-b936-53ada9bd6b85"},
  {id:"Ultimaker PLA", col:"White", guid:"e509f649-9fe6-4b14-ac45-d441438cb4ef"},
  {id:"Ultimaker PLA", col:"Yellow", guid:"9c1959d0-f597-46ec-9131-34020c7a54fc"},
  {id:"Ultimaker PP", col:"Transparent", guid:"c7005925-2a41-4280-8cdd-4029e3fe5253"},
  {id:"Ultimaker PVA", col:"Natural", guid:"fe15ed8a-33c3-4f57-a2a7-b4b78a38c3cb"},
  {id:"Ultimaker TPU 95A", col:"Black", guid:"eff40bcf-588d-420d-a3bc-a5ffd8c7f4b3"},
  {id:"Ultimaker TPU 95A", col:"Blue", guid:"5f4a826c-7bfe-460f-8650-a9178b180d34"},
  {id:"Ultimaker TPU 95A", col:"Red", guid:"07a4547f-d21f-41a0-8eee-bc92125221b3"},
  {id:"Ultimaker TPU 95A", col:"White", guid:"6a2573e6-c8ee-4c66-8029-3ebb3d5adc5b"},
  {id:"Ultimaker Tough PLA", col:"Black", guid:"03f24266-0291-43c2-a6da-5211892a2699"},
  {id:"Ultimaker Tough PLA", col:"Green", guid:"6d71f4ad-29ab-4b50-8f65-22d99af294dd"},
  {id:"Ultimaker Tough PLA", col:"Red", guid:"2db25566-9a91-4145-84a5-46c90ed22bdf"},
  {id:"Ultimaker Tough PLA", col:"White", guid:"851427a0-0c9a-4d7c-a9a8-5cc92f84af1f"}
];

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
  feedOutput = createOutputVariable({prefix:"F"}, feedFormat);  eOutput = createOutputVariable({prefix:"E", type:getProperty("relativeExtrusion") ? TYPE_INCREMENTAL : TYPE_ABSOLUTE}, xyzFormat);
  sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, xyzFormat); // parameter temperature or speed
  iOutput = createOutputVariable({prefix:"I", control:CONTROL_FORCE}, xyzFormat); // circular output
  jOutput = createOutputVariable({prefix:"J", control:CONTROL_FORCE}, xyzFormat); // circular output
}

function onOpen() {
  setFormats(MM); // machine requires input in MM
  var globalBoundaries = getSection(0).getBoundingBox();

  // check user input on material selection
  var materialGUID1;
  var materialGUID2;

  // output the specific header for this printer
  writeComment("START_OF_HEADER");  // do not translate, interpreted by the firmware
  writeComment("HEADER_VERSION:0.1");
  writeComment("FLAVOR:Griffin");
  writeComment("GENERATOR.NAME:" + getGlobalParameter("generated-by", "Fusion"));
  writeComment("GENERATOR.VERSION:main");
  if (getProperty("writeDate")) {
    writeComment("GENERATOR.BUILD_DATE:" + getFormatedDate());
  }
  writeComment("TARGET_MACHINE.NAME:" + machineConfiguration.getVendor() + " " + machineConfiguration.getModel());
  if (getProperty("extruder1Material") != "None") {
    materialGUID1 = getMaterialAndColorGUID(1); // searching guid for extruder 1
    writeComment("EXTRUDER_TRAIN.0.INITIAL_TEMPERATURE:" + integerFormat.format(getExtruder(1).temperature));
    writeComment("EXTRUDER_TRAIN.0.MATERIAL.GUID:" + materialGUID1);
    writeComment("EXTRUDER_TRAIN.0.MATERIAL.VOLUME_USED:" + xyzFormat.format(getExtruder(1).extrusionLength));
    writeComment("EXTRUDER_TRAIN.0.NOZZLE.DIAMETER:" + xyzFormat.format(getExtruder(1).nozzleDiameter));
    writeComment("EXTRUDER_TRAIN.0.NOZZLE.NAME:" + getPrintCore(1));
  }
  if (hasGlobalParameter("ext2-extrusion-len") &&
        hasGlobalParameter("ext2-nozzle-dia") &&
        hasGlobalParameter("ext2-temp")
  ) {
    if (getProperty("extruder2Material") != "None") {
      materialGUID2 = getMaterialAndColorGUID(2); // searching guid for extruder 2
      writeComment("EXTRUDER_TRAIN.1.INITIAL_TEMPERATURE:" + integerFormat.format(getExtruder(2).temperature));
      writeComment("EXTRUDER_TRAIN.1.MATERIAL.GUID:" + materialGUID2);
      writeComment("EXTRUDER_TRAIN.1.MATERIAL.VOLUME_USED:" + xyzFormat.format(getExtruder(2).extrusionLength));
      writeComment("EXTRUDER_TRAIN.1.NOZZLE.DIAMETER:" + xyzFormat.format(getExtruder(2).nozzleDiameter));
      writeComment("EXTRUDER_TRAIN.1.NOZZLE.NAME:" + getPrintCore(2));
    }
  }
  writeComment("BUILD_PLATE.TYPE: glass");
  writeComment("BUILD_PLATE.INITIAL_TEMPERATURE:" + integerFormat.format(bedTemp));
  writeComment("PRINT.TIME:" + xyzFormat.format(printTime));
  writeComment("PRINT.SIZE.MIN.X:" + (xyzFormat.format(globalBoundaries.lower.x)));
  writeComment("PRINT.SIZE.MIN.Y:" + (xyzFormat.format(globalBoundaries.lower.y)));
  writeComment("PRINT.SIZE.MIN.Z:" + (xyzFormat.format(globalBoundaries.lower.z)));
  writeComment("PRINT.SIZE.MAX.X:" + (xyzFormat.format(globalBoundaries.upper.x)));
  writeComment("PRINT.SIZE.MAX.Y:" + (xyzFormat.format(globalBoundaries.upper.y)));
  writeComment("PRINT.SIZE.MAX.Z:" + (xyzFormat.format(globalBoundaries.upper.z)));
  writeComment("END_OF_HEADER");

  if (programName) {
    writeComment(programName);
  }
  if (programComment) {
    writeComment(programComment);
  }
  writeBlock(gFormat.format(unit == MM ? 21 : 20)); // set unit
}

function onSection() {
  writeBlock(gAbsIncModal.format(90)); // absolute spatial co-ordinates
  writeBlock(getCode(getProperty("relativeExtrusion") ? commands.extrusionMode.relative : commands.extrusionMode.absolute));
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  writeBlock(gMotionModal.format(0), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z), feedOutput.format(rapidFeedrate));
  // Filament advance
  writeBlock(gMotionModal.format(1), eOutput.format(toPreciseUnit(37, MM)), feedOutput.format(toPreciseUnit(720, MM)));
  eOutput.reset();
  writeBlock(gFormat.format(92), eOutput.format(0));
}

function onClose() {
  writeComment(localize("END OF GCODE"));
}

function getFormatedDate() {
  var d = new Date();
  var month = "" + (d.getMonth() + 1);
  var day = "" + d.getDate();
  var year = d.getFullYear();

  if (month.length < 2) {month = "0" + month;}
  if (day.length < 2) {day = "0" + day;}

  return [year, month, day].join("-");
}

function getMaterialAndColorGUID(extruderNumber) {
  var errorMsg = "";
  var errorMaterial = "";
  var errorColor = "";
  var materialName = "";
  var colorName = "";

  // get the color and material from the properties
  if (extruderNumber == 1) {
    materialName = getProperty("extruder1Material");
    colorName = getProperty("extruder1MaterialColor");
  } else if (extruderNumber == 2) {
    materialName = getProperty("extruder2Material");
    colorName = getProperty("extruder2MaterialColor");
  } else {
    error(localize("Wrong extruder number passed to getMaterialAndColorGUID function"));
  }

  // all colors associated with a generic material will be treated as a generic color.
  if (materialName.substring(0, 7) == "Generic") {
    colorName = "Generic";
  }

  // search values and create errors message in one go
  for (var c in materialMapping) { // find required material and color into the mapping array

    if ((materialMapping[c].id == materialName) && (materialMapping[c].col == colorName)) {
      return materialMapping[c].guid;
    } else { // combination not found, build the error message
      if (materialMapping[c].id == materialName) {
        errorMaterial += "\r\n- " + materialMapping[c].col;
      }
      if (materialMapping[c].col == colorName) {
        errorColor += "\r\n- " + materialMapping[c].id;
      }
    }
  }
  // building an error message available colors for the material, or available materials for the color.
  errorMsg += "The selected material combination '" + materialName + " " + colorName + "' for extruder " + integerFormat.format(extruderNumber) + " is not a valid material for the Ultimaker printer !";
  errorMsg += errorMaterial ? "\r\nMaterial : '" + materialName + "' is available with the following colors: " + errorMaterial : "";
  errorMsg += errorColor ? "\r\nColor : '" + colorName + "' is available with the following materials: " + errorColor + "\r\n- and all the generic materials" : "";
  error(errorMsg);

  return undefined;
}

function getPrintCore(extruderNumber) {
  var nozzleDiameter = xyzFormat.getResultingValue(getExtruder(extruderNumber).nozzleDiameter);
  var printCoreDiameter = 0.0;
  var printCore = extruderNumber == 1 ? getProperty("extruder1printcoreName") : getProperty("extruder2printcoreName");

  switch (printCore) {
  case "AA 0.25":
    printCoreDiameter = 0.25;
    break;
  case "AA 0.4":
  case "BB 0.4":
    printCoreDiameter = 0.4;
    break;
  case "AA 0.8":
  case "BB 0.8":
    printCoreDiameter = 0.8;
    break;
  case "CC 0.6":
    printCoreDiameter = 0.6;
    break;
  default : needWarning = true;
    break;
  }
  if (nozzleDiameter != printCoreDiameter) {
    warning(subst(localize("The selected print core %1 does not match the nozzle diameter defined in the machine configuration file."), printCore));
  }
  return printCore;
}
// <<<<< INCLUDED FROM ../base/ultimaker base.cps
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
properties.relativeExtrusion.value = false;
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
// include("../common/writeProgramHeader.cpi");  // Ultimaker have it's own specific header
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
