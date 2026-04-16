/**
  Copyright (C) 2015-2024 by Autodesk, Inc.
  All rights reserved.

  $Revision: 44110 058ad3fcadd4bcf4c23db3bffce724e6c8437b07 $
  $Date: 2024-01-30 13:09:09 $

  FORKID {B5B66186-5B39-4510-BFE1-E8D7F359234D}
*/

description = "Lightburn";
vendor = "Lightburn";
vendorUrl = "https://lightburnsoftware.com/";
legal = "Copyright (C) 2015-2024 by Autodesk, Inc.";
certificationLevel = 2;

longDescription = "Generic post for Lightburn laser software. The post will output the toolpath as SVG graphics which can be imported into Lightburn manually or automatically.";

extension = "svg";
mimetype = "image/svg+xml";
setCodePage("utf-8");

capabilities = CAPABILITY_JET;

minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(90); // avoid potential center calculation errors for CNC
allowHelicalMoves = true;
allowedCircularPlanes = (1 << PLANE_XY); // only XY arcs

properties = {
  aStartLightburnAfterPostprocessing: {
    title      : "Automatically load design in Lightburn",
    description: "Automatically loads your design in Lightburn after post processing is complete. Lightburn will be automatically started if necessary.",
    group      : "lightburn",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  bLightburnInstallationPath: {
    title      : "Installation Path of Lightburn's SendUDP.exe",
    description: "Specifies the location of a Lightburn file called SendUDP.exe that should live in the file location that Lightburn is installed. " +
      "This file is most commonly found at C:\\Program Files\\LightBurn\\SendUDP.exe. " +
      "However, you should verify the true location and enter it here. If this location is not correct, the post processor will NOT be able to open Lightburn.",
    group: "lightburn",
    type : "string",
    value: "C:\\Program Files\\LightBurn\\SendUDP.exe",
    scope: "post"
  },
  aLineWidth: {
    title      : "SVG stroke width (mm)",
    description: "The width of lines in the SVG in mm.",
    group      : "preferences",
    type       : "number",
    value      : 0.1,
    scope      : "post"
  },
  aCheckForRadiusCompensation: {
    title      : "Disallow sideways compensation",
    description: "Check every operation for Sideways Compensation 'In Control'. Throw an error if enabled and Sideways Compensation is used.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  aIgnoreLeadMoves: {
    title      : "Ignore lead-in/lead-out moves",
    description: "Enable to ignore lead-in/lead-out moves.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  }
};

groupDefinitions = {
  lightburn: {title:"Lightburn Options", collapsed:true, order:25}
};

xyzFormat = createFormat({decimals:3});
decimalFormat = createFormat({decimals:3});

var POST_URL = "https://cam.autodesk.com/hsmposts?p=lightburn_laser";

// Recommended colors for color mapping.
var COLOR_00 = "000000";
var COLOR_01 = "0000FF";
var COLOR_02 = "FF0000";
var COLOR_03 = "00E000";
var COLOR_04 = "D0D000";
var COLOR_05 = "FF8000";
var COLOR_06 = "00E0E0";
var COLOR_07 = "FF00FF";
var COLOR_08 = "B4B4B4";
var COLOR_09 = "0000A0";
var COLOR_10 = "A00000";
var COLOR_11 = "00A000";
var COLOR_12 = "A0A000";
var COLOR_13 = "C08000";
var COLOR_14 = "00A0FF";
var COLOR_15 = "A000A0";
var COLOR_16 = "808080";
var COLOR_17 = "7D87B9";
var COLOR_18 = "BB7784";
var COLOR_19 = "4A6FE3";
var COLOR_20 = "D33F6A";
var COLOR_21 = "8CD78C";
var COLOR_22 = "F0B98D";
var COLOR_23 = "F6C4E1";
var COLOR_24 = "FA9ED4";
var COLOR_25 = "500A78";
var COLOR_26 = "B45A00";
var COLOR_27 = "004754";
var COLOR_28 = "86FA88";
var COLOR_29 = "FFDB66";

var COLOR_CYCLE = [COLOR_00,
  COLOR_01,
  COLOR_02,
  COLOR_03,
  COLOR_04,
  COLOR_05,
  COLOR_06,
  COLOR_07,
  COLOR_08,
  COLOR_09,
  COLOR_10,
  COLOR_11,
  COLOR_12,
  COLOR_13,
  COLOR_14,
  COLOR_15,
  COLOR_16,
  COLOR_17,
  COLOR_18,
  COLOR_19,
  COLOR_20,
  COLOR_21,
  COLOR_22,
  COLOR_23,
  COLOR_24,
  COLOR_25,
  COLOR_26,
  COLOR_27,
  COLOR_28,
  COLOR_29];

var MIN_COLORS = 6; // minimum number of colors

/** Select a subset of colors so our preferred color pallet is used (and not simply the color with the lowest hex value first). */
function selectColors() {
  var requiredColors = Math.max(MIN_COLORS, getNumberOfSections()); // makes sure that more than enough colors get made
  var finalColorCycle = [];
  var numColors = COLOR_CYCLE.length;

  // if the number of default colors is too small, we will build lighter shades of those colors to fill in the extra needed colors
  var alphaSteps = Math.ceil(requiredColors / numColors);
  var alphaStepSize = 1 / (alphaSteps + 1);  // + 1 stops the last alpha blend stage for all colors being FFFFFF
  var alphaStepIndex = 0;
  var colorIndex = 0;
  var finalColorCycle = [];

  for (var i = 0; i < requiredColors; i++) {
    finalColorCycle.push(alphaBlendHexColor(COLOR_CYCLE[colorIndex], 1 - (alphaStepSize * alphaStepIndex)));
    colorIndex += 1;  // next color
    if (colorIndex >= numColors) {
      colorIndex = 0;  // start back at the first color
      alphaStepIndex++;  // next lighter shade
    }
  }

  // reset all color related variables to allow re-runs
  machineState.activeColorCycle = sortColors(finalColorCycle);
}

function compareHexValues(a, b) {
  if (a.hexValue < b.hexValue) {
    return -1;
  }
  if (a.hexValue > b.hexValue) {
    return 1;
  }
  return 0;
}

/** Lightburn doesn't respect the order of operations in the SVG file, it re-sorts them by the hex color value in ascending order
    so here the color cycle is sorted to preserve op order from CAM. */
function sortColors(inputColors) {
  var mappedColors = new Array();
  for (var color in inputColors) {
    mappedColors.push({hexColor:"#" + inputColors[color], hexValue:parseInt(inputColors[color], 16)});
  }
  mappedColors.sort(compareHexValues);

  var returnColors = new Array();
  for (var color in mappedColors) {
    returnColors.push(mappedColors[color].hexColor);
  }
  return returnColors;
}

/** Returns a hex color that is alphaPercent lighter than the input color. */
function alphaBlendHexColor(hexColorString, alphaPercent) {
  // alphaPercent needs to be converted from a float to a fraction of 255
  var alpha = alphaPercent;

  // hex color needs to be converted from a hex string to its constituent parts:
  var red = parseInt(hexColorString.substring(0, 2), 16);
  var green = parseInt(hexColorString.substring(2, 4), 16);
  var blue = parseInt(hexColorString.substring(4, 6), 16);

  return [alphaBlend(red, alpha), alphaBlend(green, alpha), alphaBlend(blue, alpha)].join("");
}

/** Returns properly padded 2 digit hex strings for RGB color channels. */
function toHexColorChannel(decimal) {
  var hex = decimal.toString(16);
  return (hex.length === 1 ? "0" : "") + hex;
}

/** Alpha blend a color channel white. */
function alphaBlend(colorChannel, alpha) {
  return toHexColorChannel(Math.round((1 - alpha) * 255 + alpha * colorChannel));
}

/** Called on the start of each section, initalizes the first color from the active color cycle. */
function nextColor() {
  machineState.currentColorIndex++;
  if (machineState.currentColorIndex >= machineState.activeColorCycle.length) {
    error(localize("Not enough colors were generated!"));
  }

  machineState.currentHexColor = machineState.activeColorCycle[machineState.currentColorIndex];
}

var useFillForSection = false; // should the current section be cut (using a stroke) or etched (using a fill)?
/** For Etch/Vaporize/Engrave, returns fill settings, otherwise none. */
function fill() {
  if (useFillForSection) {
    return "fill=\"" + machineState.currentHexColor + "\"";
  }
  return "fill=\"none\"";
}

/** for through cuts, returns stroke settings, otherwise none */
function stroke() {
  if (useFillForSection) {
    return "stroke=\"none\"";
  }
  return "stroke=\"" + machineState.currentHexColor + "\" stroke-width=\"" + getProperty("aLineWidth") + "\"";
}

var activePathElements = [];
function addPathElement() {
  var args = Array.prototype.slice.call(arguments);

  // don't allow moves after a rapid or similar move
  if (arguments[0] === "M") {
    if (machineState.allowMoveCommand) {
      // if this is a move, this should disable further moves untill rapid or similar is detected.
      machineState.allowMoveCommand = false;
    } else {
      // skip rendering this move command since it was not preceeded by a rapid move
      return;
    }
  }

  activePathElements.push(args.join(" "));
}

function finishPath() {
  if (!activePathElements || activePathElements.length === 0) {
    error(localize("An operation resulted in no detectable paths!"));
    return;
  }

  var opComment = hasParameter("operation-comment") ? getParameter("operation-comment") : "[No Title]";

  writeln("<g id=\"operation-" + (1 + currentSection.getId()) + "\">");
  writeln("    <title>" + opComment + " (" + localize("Op") + ": " + (1 + currentSection.getId()) + "/" + getNumberOfSections() + ")</title>");
  writeln(
    "    <path d=\"" + activePathElements.join("\n             ") +
    "\" " +
    fill() +
    " " +
    stroke() +
    "/>"
  );
  writeln("</g>");
  activePathElements = [];
  machineState.allowMoveCommand = true;
}

/** return true if the program should halt because of missing radius compensation in the computer */
function isRadiusCompensationInvalid() {
  if (getProperty("aCheckForRadiusCompensation") && (radiusCompensation != RADIUS_COMPENSATION_OFF)) {
    error(localize(subst("Operation: %1. The Sideways Compensation type 'In Control' is not supported. This must be set to 'In Computer' in the passes tab.", (1 + currentSection.getId()))));
    return;
  }
}

function printVector(v) {
  return decimalFormat.format(v.x) + "," + decimalFormat.format(v.y);
}

var machineState;

/** Global state. */
function resetState() {
  return {
    // selected colors to use for this run
    activeColorCycle : null,
    // the hex string of the current color
    currentHexColor  : null,
    // the index of the current color
    currentColorIndex: -1,
    // track if the next path element can be a move command
    allowMoveCommand : null,
  };
}

function onOpen() {
  unit = MM; // machine requires input in MM

  // reset all per-run state
  machineState = resetState();

  // select colors now that the number of ops is available
  selectColors();

  // calculate workpiece dimensions
  var workpiece = getWorkpiece();
  workpiece.expandTo(new Vector(0, 0, 0)); // include origin of WCS, which is always 0,0,0

  // calculate translations
  var translateX = 0;
  var translateY = 0;

  writeln("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>");
  writeln("<svg xmlns=\"http://www.w3.org/2000/svg\">");
  writeln("<desc>Created with " + description + " for Fusion CAM and HSM. To download visit: " + POST_URL + "</desc>");

  // translate + scale operation to flip the Y axis so the output is in the same x/y orientation it was in Fusion
  writeln("<g id=\"global-translation-frame\" transform=\"translate(" + decimalFormat.format(translateX) + ", " + decimalFormat.format(translateY) + ") scale(1, -1)\">");
}

function onComment(text) {
  writeln("<!--" + text + "-->");
}

function onSection() {
  switch (tool.type) {
  case TOOL_WATER_JET:
    warning(localize("Using waterjet cutter but allowing it anyway."));
    break;
  case TOOL_LASER_CUTTER:
    break;
  case TOOL_PLASMA_CUTTER:
    warning(localize("Using plasma cutter but allowing it anyway."));
    break;
  case TOOL_MARKER:
    warning(localize("Using marker but allowing it anyway."));
    break;
  default:
    error(localize("The CNC does not support the required tool."));
    return;
  }

  // use Jet Mode to decide if the shape should be filled or have no fill
  switch (currentSection.jetMode) {
  case JET_MODE_THROUGH:
    useFillForSection = false;
    break;
  case JET_MODE_ETCHING:
  case JET_MODE_VAPORIZE:
    useFillForSection = true;
    break;
  default:
    error(localize("Unsupported cutting mode."));
    return;
  }

  var remaining = currentSection.workPlane;
  if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
    error(localize("Tool orientation is not supported."));
    return;
  }
  setRotation(remaining);
  nextColor();
}

function ignoreMove() {
  switch (movement) {
  case MOVEMENT_CUTTING:
  case MOVEMENT_REDUCED:
  case MOVEMENT_FINISH_CUTTING:
    break;
  case MOVEMENT_LEAD_IN:
  case MOVEMENT_LEAD_OUT:
    if (getProperty("aIgnoreLeadMoves")) {
      machineState.allowMoveCommand = true;
      return true;
    }
    break;
  case MOVEMENT_RAPID:
  case MOVEMENT_HIGH_FEED:
  case MOVEMENT_LINK_TRANSITION:
  case MOVEMENT_LINK_DIRECT:
  default:
    machineState.allowMoveCommand = true;
    return true;
  }
  return false;
}

function writeLine(x, y) {
  isRadiusCompensationInvalid();
  if (ignoreMove()) {
    return;
  }

  var start = getCurrentPosition();
  if ((xyzFormat.format(start.x) == xyzFormat.format(x)) &&
      (xyzFormat.format(start.y) == xyzFormat.format(y))) {
    return; // ignore vertical
  }

  addPathElement("M", xyzFormat.format(start.x), xyzFormat.format(start.y));
  addPathElement("L", xyzFormat.format(x), xyzFormat.format(y));
}

function onRapid(x, y, z) {
  writeLine(x, y);
}

function onLinear(x, y, z, feed) {
  writeLine(x, y);
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  isRadiusCompensationInvalid();
  if (ignoreMove()) {
    return;
  }

  var start = getCurrentPosition();

  var largeArc = (getCircularSweep() > Math.PI) ? 1 : 0;
  var sweepFlag = isClockwise() ? 0 : 1;
  addPathElement("M", xyzFormat.format(start.x), xyzFormat.format(start.y));
  addPathElement("A", xyzFormat.format(getCircularRadius()), xyzFormat.format(getCircularRadius()), 0, largeArc, sweepFlag, xyzFormat.format(x), xyzFormat.format(y));
}

function onCommand() {
}

function onSectionEnd() {
  finishPath();
}

function onClose() {
  writeln("</g>");
  writeln("</svg>");
}

function onTerminate() {
  if (getProperty("aStartLightburnAfterPostprocessing")) {
    var outputPath = getOutputPath(); // Find the output path for the SVG file the post processor is creating
    var exePath = getProperty("bLightburnInstallationPath");
    if (!FileSystem.isFile(exePath)) {
      error(localize("Lightburn software was not found on your machine. Use property 'LightburnInstallationPath' to set the full path to the executable."));
      return;
    }
    executeNoWait(exePath, "\"" + outputPath + "\"", false, ""); // Open Lightburn via SendUDP.ext and load the SVG file that this post processor created
  }
}
