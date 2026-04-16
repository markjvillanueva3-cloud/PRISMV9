/**
  Copyright (C) 2012-2021 by Autodesk, Inc.
  All rights reserved.

  Roland post processor configuration.

  $Revision: 44082 fb05b1dc29ca4aa0705ccca42016cba821dbcaba $
  $Date: 2023-08-02 20:27:13 $

  FORKID {C1E71A5D-CAD6-45ba-B223-FE41348C147E}
*/

description = "Roland RML";
vendor = "Roland DG";
vendorUrl = "http://www.rolanddg.com";
legal = "Copyright (C) 2012-2021 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45702;

longDescription = "Generic post for Roland RML. By default the post will output code for MDX-15 and MDX-20. Other MDXs work if you select the correct machine model and options using the 'Machine type' property.";

extension = "prn";
programNameIsInteger = true;
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
  machineModel: {
    title      : "Machine type",
    description: "Sets the machine type.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {id:"mdx-15/20", title:"MDX-15/20"},
      {id:"mdx-40", title:"MDX-40"},
      {id:"mdx-50", title:"MDX-50"},
      {id:"mdx-540", title:"MDX-540"}
    ],
    value: "mdx-15/20",
    scope: "post"
  },
  useToolCall: {
    title      : "Use tool changer",
    description: "Specifies that a tool changer is available.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  spindleSpeedInRPM: {
    title      : "Spindle speed in RPM",
    description: "If enabled, the spindle speed is outputted with the RPM format rather than the RC spindle speed codes.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  rotaryTableAxis: {
    title      : "Rotary table axis",
    description: "Select rotary table axis. Check the table direction on the machine and use the (Reversed) selection if the table is moving in the opposite direction.",
    group      : "configuration",
    type       : "enum",
    values     : [
      {title:"No rotary", id:"none"},
      {title:"X", id:"x"},
      {title:"Y", id:"y"},
      {title:"Z", id:"z"},
      {title:"X (Reversed)", id:"-x"},
      {title:"Y (Reversed)", id:"-y"},
      {title:"Z (Reversed)", id:"-z"}
    ],
    value: "none",
    scope: "post"
  }
};

// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"#", range:[1, 1]}
  ]
};

var mFormat = createFormat({decimals:0});

var xyzFormat; // set in onOpen
var abcFormat = createFormat({decimals:1, forceDecimal:false, scale:DEG});
var feedFormat = createFormat({decimals:(unit == MM ? 1 : 1), forceDecimal:true, trim:false, scale:1.0 / 60});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var milliFormat = createFormat({decimals:0}); // milliseconds

var xOutput; // set in onOpen
var yOutput; // set in onOpen
var zOutput; // set in onOpen
var aOutput = createVariable({prefix:"A"}, abcFormat);
var bOutput = createVariable({prefix:"B"}, abcFormat);
var cOutput = createVariable({prefix:"C"}, abcFormat);
var feedOutput = createVariable({}, feedFormat);
var sOutput = createVariable({force:true}, rpmFormat);

// collected state
var rapidFeed;
var sMin;
var sMax;
var retracted = false;

/**
  Writes the specified block.
*/
function writeBlock() {
  writeln(formatWords(arguments) + ";");
}

/**
  Returns the machine type.
*/
function getMachineType() {
  return String(getProperty("machineModel")).toLowerCase();
}

/**
  Compare a text string to acceptable choices.

  Returns -1 if there is no match.
*/
function parseChoice() {
  for (var i = 1; i < arguments.length; ++i) {
    if (String(arguments[0]).toUpperCase() == String(arguments[i]).toUpperCase()) {
      return i - 1;
    }
  }
  return -1;
}

var receivedMachineConfiguration = false;

function activateMachine() {
  // disable unsupported rotary axes output
  if (!machineConfiguration.isMachineCoordinate(0) && (typeof aOutput != "undefined")) {
    aOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(1) && (typeof bOutput != "undefined")) {
    bOutput.disable();
  }
  if (!machineConfiguration.isMachineCoordinate(2) && (typeof cOutput != "undefined")) {
    cOutput.disable();
  }

  // save multi-axis feedrate settings from machine configuration
  var mode = machineConfiguration.getMultiAxisFeedrateMode();
  var type = mode == FEED_INVERSE_TIME ? machineConfiguration.getMultiAxisFeedrateInverseTimeUnits() :
    (mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateDPMType() : DPM_STANDARD);
  multiAxisFeedrate = {
    mode     : mode,
    maximum  : machineConfiguration.getMultiAxisFeedrateMaximum(),
    type     : type,
    tolerance: mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateOutputTolerance() : 0,
    bpwRatio : mode == FEED_DPM ? machineConfiguration.getMultiAxisFeedrateBpwRatio() : 1
  };

  // setup of retract/reconfigure  TAG: Only needed until post kernel supports these machine config settings
  if (receivedMachineConfiguration && machineConfiguration.performRewinds()) {
    safeRetractDistance = machineConfiguration.getSafeRetractDistance();
    safePlungeFeed = machineConfiguration.getSafePlungeFeedrate();
    safeRetractFeed = machineConfiguration.getSafeRetractFeedrate();
  }
  if (typeof safeRetractDistance == "number" && getProperty("safeRetractDistance") != undefined && getProperty("safeRetractDistance") != 0) {
    safeRetractDistance = getProperty("safeRetractDistance");
  }

  if (machineConfiguration.isHeadConfiguration()) {
    compensateToolLength = typeof compensateToolLength == "undefined" ? false : compensateToolLength;
  }

  if (machineConfiguration.isHeadConfiguration() && compensateToolLength) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var section = getSection(i);
      if (section.isMultiAxis()) {
        machineConfiguration.setToolLength(getBodyLength(section.getTool())); // define the tool length for head adjustments
        section.optimizeMachineAnglesByMachine(machineConfiguration, OPTIMIZE_AXIS);
      }
    }
  } else {
    optimizeMachineAngles2(OPTIMIZE_AXIS);
  }
}

function getBodyLength(tool) {
  for (var i = 0; i < getNumberOfSections(); ++i) {
    var section = getSection(i);
    if (tool.number == section.getTool().number) {
      return section.getParameter("operation:tool_overallLength", tool.bodyLength + tool.holderLength);
    }
  }
  return tool.bodyLength + tool.holderLength;
}

var receivedMachineConfiguration = false;

function defineMachine() {
  var useTCP = false;
  if (getProperty("rotaryTableAxis") != "none") {
    // Define rotary attributes from properties
    var rotary = parseChoice(getProperty("rotaryTableAxis"), "-Z", "-Y", "-X", "NONE", "X", "Y", "Z");
    if (rotary < 0) {
      error(localize("Valid rotaryTableAxis values are: None, X, Y, Z, -X, -Y, -Z"));
      return;
    }
    rotary -= 3;

    // Define Master (carrier) axis
    masterAxis = Math.abs(rotary) - 1;
    if (masterAxis >= 0) {
      var rotaryVector = [0, 0, 0];
      rotaryVector[masterAxis] = rotary / Math.abs(rotary);
      var aAxis = createAxis({coordinate:0, table:true, axis:rotaryVector, cyclic:true, preference:0, tcp:useTCP, reset:3});
      machineConfiguration = new MachineConfiguration(aAxis);

      setMachineConfiguration(machineConfiguration);
      if (receivedMachineConfiguration) {
        warning(localize("The provided CAM machine configuration is overwritten by the postprocessor."));
        receivedMachineConfiguration = false; // CAM provided machine configuration is overwritten
      }
    }
  } else {
    if (false) { // note: setup your machine here
      var aAxis = createAxis({coordinate:0, table:true, axis:[1, 0, 0], range:[-120, 120], preference:1, tcp:useTCP});
      var cAxis = createAxis({coordinate:2, table:true, axis:[0, 0, 1], range:[-360, 360], preference:0, tcp:useTCP});
      machineConfiguration = new MachineConfiguration(aAxis, cAxis);

      setMachineConfiguration(machineConfiguration);
      if (receivedMachineConfiguration) {
        warning(localize("The provided CAM machine configuration is overwritten by the postprocessor."));
        receivedMachineConfiguration = false; // CAM provided machine configuration is overwritten
      }
    }
  }

  if (!receivedMachineConfiguration) {
    // multiaxis settings
    if (machineConfiguration.isHeadConfiguration()) {
      machineConfiguration.setVirtualTooltip(false); // translate the pivot point to the virtual tool tip for nonTCP rotary heads
    }

    // retract / reconfigure
    var performRewinds = false; // set to true to enable the rewind/reconfigure logic
    if (performRewinds) {
      machineConfiguration.enableMachineRewinds(); // enables the retract/reconfigure logic
      safeRetractDistance = (unit == IN) ? 1 : 25; // additional distance to retract out of stock, can be overridden with a property
      safeRetractFeed = (unit == IN) ? 20 : 500; // retract feed rate
      safePlungeFeed = (unit == IN) ? 10 : 250; // plunge feed rate
      machineConfiguration.setSafeRetractDistance(safeRetractDistance);
      machineConfiguration.setSafeRetractFeedrate(safeRetractFeed);
      machineConfiguration.setSafePlungeFeedrate(safePlungeFeed);
      var stockExpansion = new Vector(toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN), toPreciseUnit(0.1, IN)); // expand stock XYZ values
      machineConfiguration.setRewindStockExpansion(stockExpansion);
    }

    // multi-axis feedrates
    if (machineConfiguration.isMultiAxisConfiguration()) {
      machineConfiguration.setMultiAxisFeedrate(
        useTCP ? FEED_FPM : getProperty("useDPMFeeds") ? FEED_DPM : FEED_INVERSE_TIME,
        99999.9999, // maximum output value for inverse time feed rates
        getProperty("useDPMFeeds") ? DPM_COMBINATION : INVERSE_MINUTES, // INVERSE_MINUTES/INVERSE_SECONDS or DPM_COMBINATION/DPM_STANDARD
        0.5, // tolerance to determine when the DPM feed has changed
        1.0 // ratio of rotary accuracy to linear accuracy for DPM calculations
      );
      setMachineConfiguration(machineConfiguration);
    }

    /* home positions */
    // machineConfiguration.setHomePositionX(toPreciseUnit(0, IN));
    // machineConfiguration.setHomePositionY(toPreciseUnit(0, IN));
    // machineConfiguration.setRetractPlane(toPreciseUnit(0, IN));
  }
}

function onOpen() {
  // define and enable machine configuration
  receivedMachineConfiguration = machineConfiguration.isReceived();
  if (typeof defineMachine == "function") {
    defineMachine(); // hardcoded machine configuration
  }
  activateMachine(); // enable the machine optimizations and settings
  setWordSeparator("");

  writeBlock(";;" + (getMachineType() == "mdx-15/20" ? "^IN" : "^DF"));

  switch (getMachineType()) {
  case "mdx-15/20":
    rapidFeed = 15.0 * 60;
    step = 0.025;
    sMin = 6500;
    sMax = 6500;
    break;
  case "mdx-40":
    rapidFeed = 50.0 * 60;
    step = 0.01;
    sMin = 4500;
    sMax = 15000;
    break;
  case "mdx-50":
    rapidFeed = 60.0 * 60;
    step = 0.01;
    sMin = 4500;
    sMax = 15000;
    break;
  case "mdx-540":
    rapidFeed = 125.0 * 60;
    step = 0.01;
    sMin = 3000;
    sMax = 12000;
    break;
  default:
    error(localize("No machine type is selected. You have to define a machine type using the properties."));
    return;
  }

  xyzFormat = createFormat({decimals:(unit == MM ? 0 : 0), scale:1.0 / step});
  xOutput = createVariable({force:true}, xyzFormat);
  yOutput = createVariable({force:true}, xyzFormat);
  zOutput = createVariable({force:true, onchange:function () {retracted = false;}}, xyzFormat);

  writeBlock(getMachineType() == "mdx-15/20" ? "!MC1" : "!MC0;V" + feedOutput.format(rapidFeed));
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

/** Force output of X, Y, Z, and F on next output. */
function forceAny() {
  forceXYZ();
  forceABC();
  feedOutput.reset();
}

function onParameter(name, value) {
}

function goHome() {
  feedOutput.reset(); // force V

  switch (String(getProperty("machineModel")).toLowerCase()) {
  case "mdx-15/20":
    writeBlock("^PR");
    writeBlock("V" + feedOutput.format(rapidFeed));
    writeBlock("Z0,0,162.6"); // retract
    writeBlock("^PA");
    break;
  case "mdx-40":
    writeBlock("^PR");
    writeBlock("V" + feedOutput.format(rapidFeed));
    writeBlock("Z0,0,10500"); // retract
    writeBlock("^PA");
    break;
  case "mdx-50":
    writeBlock("^PR");
    writeBlock("V" + feedOutput.format(rapidFeed));
    writeBlock("Z0,0,13500"); // retract
    writeBlock("^PA");
    break;
  case "mdx-540":
    writeBlock("^PR");
    writeBlock("V" + feedOutput.format(rapidFeed));
    writeBlock("Z0,0,15500"); // retract
    writeBlock("^PA");
    break;
  }
  zOutput.reset();
  retracted = true;
}

function getSpindleSpeed() {
  var rpm = spindleSpeed;
  var speedCode = 0;
  var sDiff = sMax - sMin;

  var checkrpm = sMin;
  var middle = sMin;
  while (checkrpm < rpm) { // find the closest speedCode
    speedCode += 1;
    var nextSpindleSpeed = ((sDiff / 15) * speedCode) + sMin;
    middle = (nextSpindleSpeed - checkrpm) / 2;
    checkrpm += (nextSpindleSpeed - checkrpm);
  }
  if ((rpm + middle) < checkrpm) { // find the middle of spindle speed range
    speedCode -= 1;
  }
  return speedCode;
}

function getOperationComment() {
  var operationComment = hasParameter("operation-comment") && getParameter("operation-comment");
  return operationComment;
}

var currentWorkPlaneABC = undefined;

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
}

function positionABC(abc, force) {
  if (typeof unwindABC == "function") {
    unwindABC(abc, false);
  }
  if (force) {
    forceABC();
  }
  var a = aOutput.format(abc.x);
  var b = bOutput.format(abc.y);
  var c = cOutput.format(abc.z);
  if (a || b || c) {
    if (!retracted) {
      if (typeof moveToSafeRetractPosition == "function") {
        moveToSafeRetractPosition();
      } else {
        goHome();
      }
    }
    //onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    //gMotionModal.reset();
    writeBlock("!ZE ", a, b, c);
    currentMachineABC = new Vector(abc);
    setCurrentABC(abc); // required for machine simulation
  }
}

function setWorkPlane(abc) {
  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }

  if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
    return; // no change
  }
  positionABC(abc, true);
  //onCommand(COMMAND_LOCK_MULTI_AXIS);
  currentWorkPlaneABC = abc;
}

function getWorkPlaneMachineABC(workPlane, _setWorkPlane, rotate) {
  var W = workPlane; // map to global frame

  var currentABC = isFirstSection() ? new Vector(0, 0, 0) : getCurrentDirection();
  var abc = machineConfiguration.getABCByPreference(W, currentABC, ABC, PREFER_PREFERENCE, ENABLE_ALL);

  var direction = machineConfiguration.getDirection(abc);
  if (!isSameDirection(direction, W.forward)) {
    error(localize("Orientation not supported."));
  }

  if (rotate) {
    var tcp = false;
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

function onSection() {
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  retracted = false; // specifies that the tool has been retracted to the safe plane
  var newWorkOffset = isFirstSection() ||
    (getPreviousSection().workOffset != currentSection.workOffset); // work offset changes
  var newWorkPlane = isFirstSection() ||
    !isSameDirection(getPreviousSection().getGlobalFinalToolAxis(), currentSection.getGlobalInitialToolAxis());
  if (insertToolCall || newWorkOffset || newWorkPlane) {
    // retract to safe plane
    retracted = true;
    goHome(); //retract
  }

  if (insertToolCall) {
    if (!isFirstSection() && getProperty("optionalStop")) {
      onCommand(COMMAND_OPTIONAL_STOP);
    }

    if (tool.number > 6) {
      warning(localize("Tool number exceeds maximum value."));
    }

    if (getProperty("useToolCall")) {
      writeBlock("J" + toolFormat.format(tool.number));
    } else {
      if (!isFirstSection()) {
        error(localize("Tool change is not supported without ATC. Please only post operations using the same tool."));
        return;
      }
    }
  }

  if (insertToolCall ||
      isFirstSection() ||
      (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) ||
      (tool.clockwise != getPreviousSection().getTool().clockwise)) {
    if (spindleSpeed < sMin) {
      error(
        subst(localize("Spindle speed exceeds the minimum value for operation \"%1\"."), getOperationComment()) + " " +
        subst(localize("The spindle speed has to be between %1 and %2 RPM."), rpmFormat.format(sMin), rpmFormat.format(sMax))
      );
      return;
    }
    if (spindleSpeed > sMax) {
      error(
        subst(localize("Spindle speed exceeds the maximum value for operation \"%1\"."), getOperationComment()) + " " +
        subst(localize("The spindle speed has to be between %1 and %2 RPM."), rpmFormat.format(sMin), rpmFormat.format(sMax))
      );
      return;
    }
    writeBlock(
      "!RC",
      (getProperty("spindleSpeedInRPM") ? sOutput.format(spindleSpeed) : getSpindleSpeed()) + ";",
      "!MC1" // spindle on (M03))
    );
  }

  // wcs
  // var workOffset = currentSection.workOffset;
  // writeBlock(currentSection.wcs);

  forceAny();

  if (machineConfiguration.isMultiAxisConfiguration()) { // use 5-axis indexing for multi-axis mode
    var abc = currentSection.isMultiAxis() ? currentSection.getInitialToolAxisABC() : getWorkPlaneMachineABC(currentSection.workPlane);
    if (currentSection.isMultiAxis()) {
      forceWorkPlane();
      cancelTransformation();
      positionABC(abc, true);
    } else {
      setWorkPlane(abc);
    }
  } else { // pure 3D
    var remaining = currentSection.workPlane;
    if (!isSameDirection(remaining.forward, new Vector(0, 0, 1))) {
      error(localize("Tool orientation is not supported."));
      return;
    }
    setRotation(remaining);
  }

  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  if (!retracted && !insertToolCall) {
    if (getCurrentPosition().z < initialPosition.z) {
      goHome();
      feedOutput.reset();
    }
  }

  if (insertToolCall) {
    writeBlock(
      "Z",
      xOutput.format(initialPosition.x), ",",
      yOutput.format(initialPosition.y), ",",
      zOutput.format(initialPosition.z)
    );
  }
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(
    "!RC",
    (getProperty("spindleSpeedInRPM") ? sOutput.format(spindleSpeed) : getSpindleSpeed()) + ";",
    "!MC1" // spindle on (M03))
  );
}

function onDwell(seconds) {
  if (seconds > 32767 / 1000.0) {
    warning(localize("Dwelling time is out of range."));
  }
  milliseconds = clamp(1, seconds * 1000, 32767);
  writeBlock("W", milliFormat.format(milliseconds));
}

function onRapid(_x, _y, _z) {
  if (radiusCompensation > 0) {
    error(localize("Radius compensation is not supported."));
    return;
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    var f = feedOutput.format(rapidFeed);
    if (f) {
      writeBlock("V" + f); // rapid feed (like G0)
    }
    writeBlock("Z", x + ",", y + ",", z);
    feedOutput.reset();
  }
}

function onLinear(_x, _y, _z, feed) {
  if (radiusCompensation > 0) {
    error(localize("Radius compensation is not supported."));
    return;
  }

  var f = feedOutput.format(feed);
  if (f) {
    writeBlock("V" + f);
  }

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  if (x || y || z) {
    writeBlock("Z", x + ",", y + ",", z);
  }
}

function onCircular() {
  linearize(tolerance); // note: could use operation tolerance
}

function onCommand(command) {
  onUnsupportedCommand(command);
}

function onSectionEnd() {
  forceAny();
}

function onClose() {
  writeBlock("!MC0"); // stop spindle
  goHome();

  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  writeBlock((getMachineType() == "mdx-15/20") ? "^IN" : "^DF");
}

function setProperty(property, value) {
  properties[property].current = value;
}
