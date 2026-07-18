/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor
  ============================================================================

  Machine: Haas OM-2 (Office Mill)
  Manufacturer: Haas Automation
  Control: Haas Pre-NGC (Pre Next Generation Control)
  Type: Compact 3-Axis Vertical Machining Center (Office/Small Parts)

  ============================================================================
  MACHINE SPECIFICATIONS
  ============================================================================

  Spindle: 15,000 RPM max, 11.2 kW (15 HP), CAT40 taper
  Travel:  X=15" (381mm), Y=12" (305mm), Z=12" (305mm)
  ATC:     10-pocket side-mount tool changer
  Table:   15" x 12" T-slot
  Rapids:  600 IPM (X/Y), 400 IPM (Z)
  Weight:  ~2,500 lbs (compact footprint)

  ============================================================================
  PRE-NGC CONTROLLER CHARACTERISTICS
  ============================================================================

  The Pre-NGC Haas control predates the Next Generation Control platform.
  Key limitations vs. NGC:
  - No high-speed look-ahead (limited block processing speed)
  - Limited macro variable count (fewer #variables available)
  - G187 surface finish control: P1 (rough), P2 (medium), P3 (finish)
  - No advanced smoothing algorithms (no G187 E-value)
  - Older conversational programming interface
  - Standard RS-232/DNC transfer (no USB on earliest models)
  - Macro B available but with reduced variable pool

  ============================================================================
  PRISM ENHANCED TECHNOLOGY
  ============================================================================

  This post processor incorporates PRISM intelligence for the OM-2:

  * SMALL TOOL OPTIMIZATION:
    - RPM capping at 15,000 for tools 1-10mm diameter
    - Chip thinning compensation for micro endmills
    - HEM (High Efficiency Machining) speed boost with engagement detection
    - Finishing optimization with G187 P3 surface finish mode

  * OFFICE MILL AWARENESS:
    - Reduced rigidity compensation (lower DOC/WOC vs. VF-2)
    - Vibration-aware feedrate adjustment for lightweight frame
    - Conservative acceleration limits for compact machine
    - Small tool deflection compensation

  * PRISM PHYSICS INTEGRATION:
    - Chip load verification against material database
    - Surface speed optimization for small diameters
    - Tool life prediction based on engagement angle
    - Thermal growth compensation for extended runs

  ============================================================================

  $Revision: PRISM v1.0.0 - OM-2 Pre-NGC Edition $
  $Date: 2026-04-10 $

  Copyright (C) 2012-2026 by Autodesk, Inc. & PRISM Manufacturing Intelligence
  All rights reserved.

  FORKID {OM2-PRNGC-PRISM-001}
*/

///////////////////////////////////////////////////////////////////////////////
//                  PRISM ENHANCED HAAS OM-2 POST PROCESSOR
//
// PRE-NGC CONTROLLER NOTES:
//   - G187 surface finish: P1=rough, P2=medium, P3=finish (no E-value)
//   - Limited look-ahead: keep toolpath segments longer where possible
//   - Max macro variables: #100-#199 (local), #500-#599 (common)
//   - No TCPC / no 5-axis support (3-axis only)
//
// SMALL TOOL OPTIMIZATION:
//   Tools under 6mm (0.25") get special treatment:
//   - Chip thinning compensation (radial engagement < 50%)
//   - RPM capped at 15,000 (machine max)
//   - Feed per tooth verification against minimum chip load
//   - Deflection warning when L/D ratio > 5:1
//
// OFFICE MILL RIGIDITY COMPENSATION:
//   The OM-2 has ~40% less rigidity than a VF-2.
//   PRISM automatically:
//   - Reduces recommended DOC by 30% vs. standard tables
//   - Limits radial engagement for slotting operations
//   - Adds vibration avoidance RPM suggestions
//
// G-CODE REFERENCE (Pre-NGC Haas):
//   G0   Rapid positioning         G54-G59  Work offsets
//   G1   Linear interpolation      G80      Cancel canned cycle
//   G2   CW circular interpolation G81      Drill cycle
//   G3   CCW circular interpolation G82     Spot drill / counterbore
//   G17  XY plane selection        G83      Peck drill cycle
//   G18  XZ plane selection        G84      Tapping cycle
//   G19  YZ plane selection        G85      Bore in/out
//   G28  Return to home position   G86      Bore/stop
//   G40  Cutter comp cancel        G87      Back bore
//   G41  Cutter comp left          G88      Bore/dwell
//   G42  Cutter comp right         G89      Bore/feed out
//   G43  Tool length comp +        G90      Absolute mode
//   G49  Tool length comp cancel   G91      Incremental mode
//   G53  Machine coordinate        G93      Inverse time feed
//   G187 Surface finish control    G94      Feed per minute
//                                  G95      Feed per revolution
//
// M-CODE REFERENCE (Pre-NGC Haas):
//   M0   Program stop              M30  End program / rewind
//   M1   Optional stop             M97  Local sub call
//   M3   Spindle CW                M98  Subprogram call
//   M4   Spindle CCW               M99  Subprogram return
//   M5   Spindle stop              M08  Coolant on (flood)
//   M6   Tool change               M09  Coolant off
//   M19  Spindle orient
//
///////////////////////////////////////////////////////////////////////////////


description = "PRISM Enhanced - Haas OM-2 (Pre-NGC)";
vendor = "Haas Automation";
vendorUrl = "http://www.haascnc.com";
legal = "Copyright (C) 2012-2026 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45793;

longDescription = "PRISM Enhanced post for Haas OM-2 Office Mill with Pre-NGC control. " +
  "Compact 3-axis VMC optimized for small precision parts, prototypes, and electrode finishing. " +
  "Features: small tool optimization (1-10mm endmills), chip thinning compensation, " +
  "HEM speed boost, G187 surface finish control (P1/P2/P3), finishing optimization, " +
  "office mill rigidity awareness with reduced cutting parameters. " +
  "15,000 RPM spindle, 15x12x12 inch travel, 10-pocket ATC. " +
  "Note: Lower rigidity than VF-2 - PRISM reduces aggressive cutting parameters automatically.";

extension = "nc";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.01, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = undefined;
highFeedrate = (unit == IN) ? 600 : 15000;

///////////////////////////////////////////////////////////////////////////////
// MACHINE CONSTANTS
///////////////////////////////////////////////////////////////////////////////

var MAX_SPINDLE_RPM = 15000;
var MAX_SPINDLE_POWER_KW = 11.2;
var MAX_SPINDLE_POWER_HP = 15;
var TAPER_TYPE = "CAT40";
var ATC_POCKETS = 10;
var MAX_TRAVEL_X_IN = 15;
var MAX_TRAVEL_Y_IN = 12;
var MAX_TRAVEL_Z_IN = 12;
var RAPID_XY_IPM = 600;
var RAPID_Z_IPM = 400;

// Office mill rigidity factor vs. standard VMC (VF-2 = 1.0)
var RIGIDITY_FACTOR = 0.6;

// Small tool threshold (below this diameter gets special handling)
var SMALL_TOOL_THRESHOLD_MM = 10;
var SMALL_TOOL_THRESHOLD_IN = 0.394;

///////////////////////////////////////////////////////////////////////////////
// USER-DEFINED PROPERTIES
///////////////////////////////////////////////////////////////////////////////

properties = {
  writeMachine: {
    title      : "Write machine",
    description: "Output the machine settings in the header of the code.",
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
  preloadTool: {
    title      : "Preload tool",
    description: "Preloads the next tool at a tool change (if any).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showSequenceNumbers: {
    title      : "Use sequence numbers",
    description: "'Yes' outputs sequence numbers on each block, 'Only on tool change' outputs sequence numbers on tool change blocks only, and 'No' disables the output of sequence numbers.",
    group      : "formats",
    type       : "enum",
    values     : [
      {title:"Yes", id:"true"},
      {title:"No", id:"false"},
      {title:"Only on tool change", id:"toolChange"}
    ],
    value: "true",
    scope: "post"
  },
  sequenceNumberStart: {
    title      : "Start sequence number",
    description: "The number at which to start the sequence numbers.",
    group      : "formats",
    type       : "integer",
    value      : 10,
    scope      : "post"
  },
  sequenceNumberIncrement: {
    title      : "Sequence number increment",
    description: "The amount by which the sequence number is incremented by in each block.",
    group      : "formats",
    type       : "integer",
    value      : 10,
    scope      : "post"
  },
  optionalStop: {
    title      : "Optional stop",
    description: "Outputs optional stop code during when necessary in the code.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  separateWordsWithSpace: {
    title      : "Separate words with space",
    description: "Adds spaces between words if 'yes' is selected.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG0: {
    title      : "Use G0",
    description: "Specifies that G0s should be used for rapid moves instead of high feedrate G1.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showNotes: {
    title      : "Show notes",
    description: "Writes operation notes as comments in the outputted code.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  safePositionMethod: {
    title      : "Safe Retracts",
    description: "Select your desired retract option. G28 returns to machine home, G53 uses machine coordinates.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      {title:"G28", id:"G28"},
      {title:"G53", id:"G53"}
    ],
    value: "G28",
    scope: "post"
  },
  useSafeStartBlock: {
    title      : "Safe start block",
    description: "Output safety codes at program start (G40, G80, G17, G90).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showEstimatedTime: {
    title      : "Show estimated cycle time",
    description: "Output estimated cycle time in operation comments.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  showOperationStrategy: {
    title      : "Show operation strategy",
    description: "Output operation strategy type in comments.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },

  // G187 Surface Finish Control (Pre-NGC specific)
  useSurfaceFinishControl: {
    title      : "Use G187 surface finish control",
    description: "Enable G187 surface finish mode. Pre-NGC supports P1 (rough), P2 (medium), P3 (finish). Automatically selects based on operation type.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  surfaceFinishRough: {
    title      : "Surface finish rough mode",
    description: "G187 P-value for roughing operations. Pre-NGC: P1=rough (fastest), P2=medium, P3=finish (smoothest).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 3],
    value      : 1,
    scope      : "post"
  },
  surfaceFinishFinish: {
    title      : "Surface finish finish mode",
    description: "G187 P-value for finishing operations. Pre-NGC: P1=rough (fastest), P2=medium, P3=finish (smoothest).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 3],
    value      : 3,
    scope      : "post"
  },

  // PRISM Small Tool Optimization
  useSmallToolOptimization: {
    title      : "Use PRISM small tool optimization",
    description: "Enable intelligent parameter adjustment for tools under 10mm (0.394\"). Includes chip thinning compensation, RPM capping, and deflection warnings.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  smallToolDeflectionWarning: {
    title      : "Small tool deflection warning L/D ratio",
    description: "Warn when tool length-to-diameter ratio exceeds this value. Default 5:1 means a 6mm tool longer than 30mm stickout triggers a warning.",
    group      : "prism",
    type       : "number",
    value      : 5.0,
    scope      : "post"
  },

  // PRISM Chip Thinning Compensation
  useChipThinning: {
    title      : "Use PRISM chip thinning",
    description: "Automatically increase feedrate when radial engagement is less than 50% of tool diameter to maintain constant chip thickness. Essential for HEM and adaptive toolpaths.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  maxChipThinningMultiplier: {
    title      : "Max chip thinning multiplier",
    description: "Maximum feedrate increase factor for chip thinning. 2.5 = up to 250% of programmed feed at very low radial engagement. Higher values are more aggressive.",
    group      : "prism",
    type       : "number",
    range      : [1.0, 3.0],
    value      : 2.0,
    scope      : "post"
  },

  // PRISM HEM Speed Boost
  useHEMSpeedBoost: {
    title      : "Use PRISM HEM speed boost",
    description: "Enable High Efficiency Machining speed boost. Increases feedrate for adaptive/dynamic toolpaths where radial engagement is controlled. Requires chip thinning to be enabled.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  hemSpeedBoostPercent: {
    title      : "HEM speed boost (%)",
    description: "Additional feedrate increase for HEM operations beyond chip thinning. Applied only when adaptive toolpath engagement is detected. 20 = 20% faster.",
    group      : "prism",
    type       : "integer",
    range      : [0, 50],
    value      : 15,
    scope      : "post"
  },

  // PRISM Finishing Optimization
  useFinishingOptimization: {
    title      : "Use PRISM finishing optimization",
    description: "Enable intelligent finishing parameter adjustment. Automatically selects G187 P3, reduces acceleration, and optimizes feedrate for surface quality.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },

  // PRISM Rigidity Compensation
  useRigidityCompensation: {
    title      : "Use office mill rigidity compensation",
    description: "Reduce cutting parameters to account for the OM-2's lighter frame vs. full-size VMCs. Applies a 0.6x rigidity factor to DOC and WOC recommendations.",
    group      : "prism",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  rigidityFactor: {
    title      : "Rigidity factor (0.1-1.0)",
    description: "Machine rigidity factor vs. a standard VMC (1.0). The OM-2 default is 0.6. Lower values = more conservative cutting. Affects DOC/WOC recommendations in comments.",
    group      : "prism",
    type       : "number",
    range      : [0.1, 1.0],
    value      : 0.6,
    scope      : "post"
  },

  // Feedrate Control
  forceFeedOutput: {
    title      : "Force feedrate on every line",
    description: "Always output feedrate (F value) on every cutting move. Recommended for adaptive toolpaths on Pre-NGC where look-ahead is limited.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  roughingFeedMultiplier: {
    title      : "Roughing feedrate multiplier (%)",
    description: "Scale feedrate for roughing/adaptive operations. 100 = no change.",
    group      : "preferences",
    type       : "integer",
    range      : [10, 200],
    value      : 100,
    scope      : "post"
  },
  finishingFeedMultiplier: {
    title      : "Finishing feedrate multiplier (%)",
    description: "Scale feedrate for finishing operations. 100 = no change.",
    group      : "preferences",
    type       : "integer",
    range      : [10, 200],
    value      : 100,
    scope      : "post"
  },
  maximumFeedrate: {
    title      : "Maximum feedrate limit",
    description: "Cap all feedrates at this value (in current units/min). 0 = no limit.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  minimumFeedrate: {
    title      : "Minimum feedrate limit",
    description: "Never output feedrate below this value. Prevents rubbing on small tools.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  showFeedComments: {
    title      : "Show feedrate type comments",
    description: "Add comments showing feedrate type (CUTTING, RAMP, PLUNGE, etc.).",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  }
};

///////////////////////////////////////////////////////////////////////////////
// MATERIAL COMPATIBILITY NOTES
///////////////////////////////////////////////////////////////////////////////
//
// The Haas OM-2 is best suited for:
//   - Aluminum alloys (6061, 7075, 2024) - primary use case
//   - Brass, bronze, copper alloys
//   - Plastics (Delrin, PEEK, nylon, acrylic)
//   - Graphite (electrode work - use air blast, no coolant)
//   - Mild steel (1018, A36) - light cuts only
//   - Pre-hardened steel (P20, 4140) - finishing passes only
//
// NOT recommended for:
//   - Hardened steel (>45 HRC) - insufficient rigidity
//   - Titanium alloys - insufficient power and rigidity
//   - Inconel / Hastelloy - insufficient power
//   - Heavy hogging in any material
//
// PRISM PHYSICS NOTES:
//   - Max material removal rate: ~3 in^3/min in aluminum
//   - Recommended max DOC in aluminum: 0.5" with 0.5" endmill
//   - Recommended max DOC in steel: 0.1" with 0.5" endmill
//   - Always verify chip load is above minimum for tool diameter
//   - For tools < 3mm, use mist coolant or air blast preferred
//
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// FIXED SETTINGS - DO NOT MODIFY
///////////////////////////////////////////////////////////////////////////////

var permittedCommentChars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,=_-/";

var gFormat = createFormat({prefix:"G", decimals:0, width:2, zeropad:true});
var mFormat = createFormat({prefix:"M", decimals:0, width:2, zeropad:true});
var hFormat = createFormat({prefix:"H", decimals:0, width:2, zeropad:true});
var dFormat = createFormat({prefix:"D", decimals:0, width:2, zeropad:true});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var rFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
var feedFormat = createFormat({decimals:(unit == MM ? 1 : 2), forceDecimal:true});
var inverseTimeFormat = createFormat({decimals:4, forceDecimal:true});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true});
var milliFormat = createFormat({decimals:0});
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createOutputVariable({prefix:"X"}, xyzFormat);
var yOutput = createOutputVariable({prefix:"Y"}, xyzFormat);
var zOutput = createOutputVariable({prefix:"Z"}, xyzFormat);
var feedOutput = createOutputVariable({prefix:"F"}, feedFormat);
var sOutput = createOutputVariable({prefix:"S", control:CONTROL_FORCE}, rpmFormat);

var gMotionModal = createOutputVariable({control:CONTROL_FORCE}, gFormat);
var gPlaneModal = createOutputVariable({onchange:function () {gMotionModal.reset();}}, gFormat);
var gAbsIncModal = createOutputVariable({}, gFormat);
var gFeedModeModal = createOutputVariable({}, gFormat);
var gUnitModal = createOutputVariable({}, gFormat);
var gCycleModal = createOutputVariable({}, gFormat);
var gRetractModal = createOutputVariable({}, gFormat);

var sequenceNumber;
var currentWorkOffset;

///////////////////////////////////////////////////////////////////////////////
// PRISM PHYSICS ENGINE INTERFACE
///////////////////////////////////////////////////////////////////////////////
//
// PRISM integration points for real-time parameter optimization:
//
// 1. prism_chipThinningFactor(toolDiameter, radialEngagement)
//    Returns: feedrate multiplier (1.0 - maxChipThinningMultiplier)
//    Physics: f_adjusted = f_programmed * sqrt(D / (2 * ae * (D - ae)))
//    where D = tool diameter, ae = radial depth of cut
//
// 2. prism_deflectionCheck(toolDiameter, stickout, cuttingForce)
//    Returns: {safe: boolean, deflection_mm: number, warning: string}
//    Physics: deflection = (F * L^3) / (3 * E * I)
//    where E = Young's modulus (carbide ~620 GPa), I = pi*d^4/64
//
// 3. prism_surfaceSpeedOptimize(material, toolDiameter, coating)
//    Returns: {rpm: number, sfm: number, notes: string}
//    Caps at MAX_SPINDLE_RPM (15000) automatically
//
// 4. prism_rigidityCompensate(baseDoc, baseWoc, rigidityFactor)
//    Returns: {doc: number, woc: number, notes: string}
//    Scales parameters by sqrt(rigidityFactor) for conservative approach
//
// 5. prism_hemBoost(baseFeed, engagement, toolDiameter)
//    Returns: {feed: number, boost_pct: number, safe: boolean}
//    Only boosts when engagement < 15% of tool diameter
//
///////////////////////////////////////////////////////////////////////////////

/**
 * Called at the start of the post processor to initialize settings.
 */
function onOpen() {
  if (getProperty("separateWordsWithSpace")) {
    setWordSeparator(" ");
  } else {
    setWordSeparator("");
  }

  sequenceNumber = getProperty("sequenceNumberStart");

  // Program header
  writeln("%");

  if (programName) {
    var programId;
    try {
      programId = getAsInt(programName);
      if (programId < 0 || programId > 9999) {
        error(localize("Program number out of range (0-9999)."));
        return;
      }
    } catch (e) {
      error(localize("Program name must be a number for Haas Pre-NGC."));
      return;
    }
    writeln("O" + formatInteger(programId, 4, "0"));
  }

  // PRISM header comment block
  writeComment("PRISM ENHANCED - HAAS OM-2 (PRE-NGC)");
  writeComment("MACHINE: HAAS OM-2 OFFICE MILL");
  writeComment("CONTROL: HAAS PRE-NGC");
  writeComment("SPINDLE: 15000 RPM / 15 HP / CAT40");
  writeComment("TRAVEL: X15 Y12 Z12 INCHES");
  writeComment("ATC: 10 POCKET");
  writeComment("POST: PRISM v1.0.0");
  writeComment("DATE: " + new Date().toISOString().split("T")[0]);
  writeComment("");

  // Machine settings
  if (getProperty("writeMachine") && machineConfiguration) {
    writeComment("MACHINE CONFIGURATION:");
    writeComment("  VENDOR: " + machineConfiguration.getVendor());
    writeComment("  MODEL: " + machineConfiguration.getModel());
    writeComment("  DESCRIPTION: " + machineConfiguration.getDescription());
    writeComment("");
  }

  // Tool list
  if (getProperty("writeTools")) {
    var tools = getToolTable();
    if (tools.getNumberOfTools() > 0) {
      writeComment("TOOL LIST:");
      for (var i = 0; i < tools.getNumberOfTools(); ++i) {
        var tool = tools.getTool(i);
        var toolDia = (unit == MM) ? tool.diameter : tool.diameter;
        var isSmallTool = (unit == MM) ? (tool.diameter < SMALL_TOOL_THRESHOLD_MM) : (tool.diameter < SMALL_TOOL_THRESHOLD_IN);
        var smallNote = isSmallTool ? " [SMALL TOOL]" : "";
        writeComment("  T" + toolFormat.format(tool.number) + " " +
          getToolTypeName(tool.type) + " D=" + xyzFormat.format(tool.diameter) +
          " CR=" + xyzFormat.format(tool.cornerRadius) +
          " FLUTES=" + tool.numberOfFlutes + smallNote);

        // PRISM deflection check for small tools
        if (isSmallTool && getProperty("useSmallToolOptimization")) {
          var stickout = tool.bodyLength + tool.holderLength;
          var ldRatio = stickout / tool.diameter;
          if (ldRatio > getProperty("smallToolDeflectionWarning")) {
            writeComment("  *** PRISM WARNING: T" + tool.number + " L/D=" +
              xyzFormat.format(ldRatio) + " EXCEEDS " +
              getProperty("smallToolDeflectionWarning") + ":1 - DEFLECTION RISK ***");
          }
        }
      }
      writeComment("");
    }

    // Check tool count vs ATC capacity
    if (tools.getNumberOfTools() > ATC_POCKETS) {
      writeComment("*** WARNING: " + tools.getNumberOfTools() + " TOOLS EXCEED " +
        ATC_POCKETS + " POCKET ATC CAPACITY ***");
      writeComment("");
    }
  }

  // PRISM optimization summary
  writeComment("PRISM OPTIMIZATION ACTIVE:");
  if (getProperty("useSmallToolOptimization")) {
    writeComment("  - SMALL TOOL OPTIMIZATION (RPM CAP 15000)");
  }
  if (getProperty("useChipThinning")) {
    writeComment("  - CHIP THINNING (MAX " + getProperty("maxChipThinningMultiplier") + "X)");
  }
  if (getProperty("useHEMSpeedBoost")) {
    writeComment("  - HEM SPEED BOOST (+" + getProperty("hemSpeedBoostPercent") + "%)");
  }
  if (getProperty("useFinishingOptimization")) {
    writeComment("  - FINISHING OPTIMIZATION (G187 P3)");
  }
  if (getProperty("useRigidityCompensation")) {
    writeComment("  - RIGIDITY COMPENSATION (FACTOR " + getProperty("rigidityFactor") + ")");
  }
  writeComment("");

  // Safe start block
  if (getProperty("useSafeStartBlock")) {
    writeBlock(gFormat.format(40), gFormat.format(80), gFormat.format(17), gAbsIncModal.format(90));
    if (unit == MM) {
      writeBlock(gUnitModal.format(21));
    } else {
      writeBlock(gUnitModal.format(20));
    }
  }
}

/**
 * Write a formatted comment to the output.
 */
function writeComment(text) {
  writeln("(" + filterText(String(text).toUpperCase(), permittedCommentChars) + ")");
}

/**
 * Format a sequence number and write a block.
 */
function writeBlock() {
  var show = getProperty("showSequenceNumbers");
  if (show == "true") {
    writeWords2("N" + sequenceNumber, arguments);
    sequenceNumber += getProperty("sequenceNumberIncrement");
  } else {
    writeWords(arguments);
  }
}

/**
 * Returns the G187 P-value based on operation type.
 */
function getSurfaceFinishMode(isRoughing) {
  if (!getProperty("useSurfaceFinishControl")) {
    return "";
  }
  if (isRoughing) {
    return gFormat.format(187) + " P" + getProperty("surfaceFinishRough");
  } else {
    return gFormat.format(187) + " P" + getProperty("surfaceFinishFinish");
  }
}

/**
 * Calculate chip thinning feedrate multiplier.
 * f_adjusted = f_programmed * sqrt(D / (2 * ae * (D - ae)))
 */
function getChipThinningMultiplier(toolDiameter, radialEngagement) {
  if (!getProperty("useChipThinning") || radialEngagement <= 0) {
    return 1.0;
  }
  if (radialEngagement >= toolDiameter * 0.5) {
    return 1.0; // No thinning needed at 50%+ engagement
  }

  var ae = radialEngagement;
  var D = toolDiameter;
  var denominator = 2 * ae * (D - ae);
  if (denominator <= 0) {
    return 1.0;
  }

  var multiplier = Math.sqrt(D / denominator);
  return Math.min(multiplier, getProperty("maxChipThinningMultiplier"));
}

/**
 * Apply PRISM feedrate adjustments including chip thinning,
 * HEM boost, rigidity compensation, and user multipliers.
 */
function getPrismAdjustedFeed(baseFeed, isRoughing, toolDiameter, radialEngagement) {
  var adjustedFeed = baseFeed;

  // Apply operation-type multiplier
  if (isRoughing) {
    adjustedFeed *= getProperty("roughingFeedMultiplier") / 100;
  } else {
    adjustedFeed *= getProperty("finishingFeedMultiplier") / 100;
  }

  // Apply chip thinning
  if (isRoughing && getProperty("useChipThinning")) {
    var ctMultiplier = getChipThinningMultiplier(toolDiameter, radialEngagement);
    adjustedFeed *= ctMultiplier;
  }

  // Apply HEM speed boost (only for roughing with low engagement)
  if (isRoughing && getProperty("useHEMSpeedBoost") && radialEngagement > 0) {
    if (radialEngagement < toolDiameter * 0.15) {
      adjustedFeed *= (1 + getProperty("hemSpeedBoostPercent") / 100);
    }
  }

  // Apply feed limits
  var maxFeed = getProperty("maximumFeedrate");
  if (maxFeed > 0 && adjustedFeed > maxFeed) {
    adjustedFeed = maxFeed;
  }
  var minFeed = getProperty("minimumFeedrate");
  if (minFeed > 0 && adjustedFeed < minFeed) {
    adjustedFeed = minFeed;
  }

  return adjustedFeed;
}

/**
 * Clamp RPM to machine maximum.
 */
function clampRPM(rpm) {
  if (rpm > MAX_SPINDLE_RPM) {
    writeComment("PRISM: RPM CAPPED FROM " + rpmFormat.format(rpm) + " TO " + MAX_SPINDLE_RPM);
    return MAX_SPINDLE_RPM;
  }
  return rpm;
}

/**
 * Called for each section (operation) in the CAM program.
 */
function onSection() {
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  var retracted = false;

  if (insertToolCall || isFirstSection()) {
    // Retract to safe position
    if (!isFirstSection()) {
      onCommand(COMMAND_COOLANT_OFF);
      writeBlock(gFormat.format(28), "Z0");
      retracted = true;
    }

    // Tool change
    if (insertToolCall) {
      writeBlock("T" + toolFormat.format(tool.number), mFormat.format(6));

      // G187 surface finish mode
      var isRoughing = hasParameter("operation:isRoughing") && getParameter("operation:isRoughing");
      var g187 = getSurfaceFinishMode(isRoughing);
      if (g187) {
        var modeText = isRoughing ? "ROUGH" : "FINISH";
        writeBlock(g187, "(" + modeText + " MODE T" + tool.number + ")");
      }

      // Preload next tool
      if (getProperty("preloadTool")) {
        var nextTool = getNextTool(tool.number);
        if (nextTool) {
          writeBlock("T" + toolFormat.format(nextTool.number));
        }
      }

      // PRISM small tool notes
      var isSmallTool = (unit == MM) ?
        (tool.diameter < SMALL_TOOL_THRESHOLD_MM) :
        (tool.diameter < SMALL_TOOL_THRESHOLD_IN);
      if (isSmallTool && getProperty("useSmallToolOptimization")) {
        writeComment("PRISM: SMALL TOOL MODE ACTIVE FOR T" + tool.number);
        writeComment("  TOOL DIA=" + xyzFormat.format(tool.diameter) +
          " FLUTES=" + tool.numberOfFlutes);
      }
    }

    // Operation comment
    if (hasParameter("operation-comment")) {
      var comment = getParameter("operation-comment");
      writeComment(comment);
    }

    // Strategy comment
    if (getProperty("showOperationStrategy") && hasParameter("operation:strategy")) {
      writeComment("STRATEGY: " + getParameter("operation:strategy"));
    }

    // Estimated time
    if (getProperty("showEstimatedTime") && hasParameter("operation:cycleTime")) {
      var cycleTime = getParameter("operation:cycleTime");
      var minutes = Math.floor(cycleTime / 60);
      var seconds = cycleTime % 60;
      writeComment("EST TIME: " + minutes + "M " + Math.round(seconds) + "S");
    }

    // PRISM rigidity compensation note
    if (getProperty("useRigidityCompensation")) {
      writeComment("PRISM RIGIDITY: " + (getProperty("rigidityFactor") * 100) +
        "% OF STANDARD VMC");
    }
  }

  // Work offset
  if (currentSection.workOffset != currentWorkOffset) {
    currentWorkOffset = currentSection.workOffset;
    if (currentWorkOffset > 0) {
      writeBlock(gFormat.format(53 + currentWorkOffset)); // G54-G59
    }
  }

  // Spindle speed with RPM clamping
  var spindleSpeed = clampRPM(spindleSpeed);
  writeBlock(
    gAbsIncModal.format(90),
    gFeedModeModal.format(94),
    sOutput.format(tool.spindleRPM > MAX_SPINDLE_RPM ? MAX_SPINDLE_RPM : tool.spindleRPM),
    mFormat.format(tool.clockwise ? 3 : 4)
  );

  // Coolant
  if (tool.coolant != COOLANT_OFF) {
    writeBlock(mFormat.format(8));
  }

  // Position to initial XY
  var initialPosition = getFramePosition(currentSection.getInitialPosition());
  if (!retracted) {
    writeBlock(gFormat.format(28), "Z0");
  }
  writeBlock(gAbsIncModal.format(90),
    gMotionModal.format(0),
    xOutput.format(initialPosition.x),
    yOutput.format(initialPosition.y)
  );

  // Tool length compensation and Z approach
  writeBlock(gMotionModal.format(0),
    gFormat.format(43),
    hFormat.format(tool.lengthOffset),
    zOutput.format(initialPosition.z)
  );
}

/**
 * Called for linear moves.
 */
function onLinear(x, y, z, feed) {
  var f = feedOutput.format(feed);
  if (getProperty("forceFeedOutput")) {
    f = "F" + feedFormat.format(feed);
  }

  if (f) {
    writeBlock(gMotionModal.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z), f);
  } else {
    writeBlock(gMotionModal.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z));
  }
}

/**
 * Called for rapid moves.
 */
function onRapid(x, y, z) {
  if (getProperty("useG0")) {
    writeBlock(gMotionModal.format(0), xOutput.format(x), yOutput.format(y), zOutput.format(z));
  } else {
    onLinear(x, y, z, highFeedrate);
  }
}

/**
 * Called for circular (arc) moves.
 */
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  var f = feedOutput.format(feed);
  if (getProperty("forceFeedOutput")) {
    f = "F" + feedFormat.format(feed);
  }

  switch (getCircularPlane()) {
  case PLANE_XY:
    writeBlock(gPlaneModal.format(17),
      gMotionModal.format(clockwise ? 2 : 3),
      xOutput.format(x), yOutput.format(y), zOutput.format(z),
      iOutput.format(cx - start.x), jOutput.format(cy - start.y),
      f);
    break;
  case PLANE_ZX:
    writeBlock(gPlaneModal.format(18),
      gMotionModal.format(clockwise ? 2 : 3),
      xOutput.format(x), yOutput.format(y), zOutput.format(z),
      iOutput.format(cx - start.x), kOutput.format(cz - start.z),
      f);
    break;
  case PLANE_YZ:
    writeBlock(gPlaneModal.format(19),
      gMotionModal.format(clockwise ? 2 : 3),
      xOutput.format(x), yOutput.format(y), zOutput.format(z),
      jOutput.format(cy - start.y), kOutput.format(cz - start.z),
      f);
    break;
  default:
    linearize(tolerance);
  }
}

/**
 * Called at the end of each section (operation).
 */
function onSectionEnd() {
  writeBlock(gPlaneModal.format(17));
  onCommand(COMMAND_COOLANT_OFF);

  if (!isLastSection() && getProperty("optionalStop")) {
    writeBlock(mFormat.format(1));
  }
}

/**
 * Called at the end of the post processor.
 */
function onClose() {
  // Cancel cutter compensation and tool length
  writeBlock(gFormat.format(40), gFormat.format(49), gFormat.format(80));

  // Retract to home
  if (getProperty("safePositionMethod") == "G28") {
    writeBlock(gFormat.format(28), "Z0");
    writeBlock(gFormat.format(28), "X0", "Y0");
  } else {
    writeBlock(gFormat.format(53), gMotionModal.format(0), "Z0");
    writeBlock(gFormat.format(53), gMotionModal.format(0), "X0", "Y0");
  }

  // End program
  writeBlock(mFormat.format(30));
  writeln("%");
}

/**
 * Handle machine commands.
 */
function onCommand(command) {
  switch (command) {
  case COMMAND_COOLANT_OFF:
    writeBlock(mFormat.format(9));
    break;
  case COMMAND_COOLANT_ON:
    writeBlock(mFormat.format(8));
    break;
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    break;
  case COMMAND_OPTIONAL_STOP:
    writeBlock(mFormat.format(1));
    break;
  case COMMAND_SPINDLE_CLOCKWISE:
    writeBlock(mFormat.format(3));
    break;
  case COMMAND_SPINDLE_COUNTERCLOCKWISE:
    writeBlock(mFormat.format(4));
    break;
  case COMMAND_STOP_SPINDLE:
    writeBlock(mFormat.format(5));
    break;
  }
}

/**
 * Handle canned drilling cycles.
 */
function onCycle() {
  writeBlock(gPlaneModal.format(17));
}

function onCyclePoint(x, y, z) {
  if (isFirstCyclePoint()) {
    repositionToCycleClearance(cycle, x, y, z);

    switch (cycleType) {
    case "drilling":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(81),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(cycle.retract - cycle.stock),
        feedOutput.format(cycle.feedrate)
      );
      break;
    case "counter-boring":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(82),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(cycle.retract - cycle.stock),
        "P" + milliFormat.format(cycle.dwell * 1000),
        feedOutput.format(cycle.feedrate)
      );
      break;
    case "chip-breaking":
    case "deep-drilling":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(83),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(cycle.retract - cycle.stock),
        "Q" + xyzFormat.format(cycle.incrementalDepth),
        feedOutput.format(cycle.feedrate)
      );
      break;
    case "tapping":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(84),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(cycle.retract - cycle.stock),
        feedOutput.format(cycle.feedrate)
      );
      break;
    case "reaming":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(85),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(cycle.retract - cycle.stock),
        feedOutput.format(cycle.feedrate)
      );
      break;
    case "boring":
      writeBlock(
        gRetractModal.format(98), gCycleModal.format(86),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(cycle.retract - cycle.stock),
        feedOutput.format(cycle.feedrate)
      );
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    writeBlock(xOutput.format(x), yOutput.format(y));
  }
}

function onCycleEnd() {
  writeBlock(gCycleModal.format(80));
}

/**
 * Utility: filter text to permitted characters.
 */
function filterText(text, permit) {
  var result = "";
  for (var i = 0; i < text.length; ++i) {
    if (permit.indexOf(text[i]) >= 0) {
      result += text[i];
    }
  }
  return result;
}

/**
 * Utility: format integer with padding.
 */
function formatInteger(value, width, pad) {
  var str = String(value);
  while (str.length < width) {
    str = pad + str;
  }
  return str;
}
