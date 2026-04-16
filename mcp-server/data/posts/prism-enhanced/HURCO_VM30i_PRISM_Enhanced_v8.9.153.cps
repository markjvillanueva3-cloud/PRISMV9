/**
  PRISM Manufacturing Intelligence - Enhanced Post Processor
  ============================================================================
  
  Machine: HURCO VM30i
  Manufacturer: HURCO
  Control: WinMax (ISNC/BNC Compatible)
  Type: 3-Axis Vertical Machining Center
  
  ============================================================================
  PRISM ENHANCED ROUGHING TECHNOLOGY™
  ============================================================================
  
  This post processor incorporates the best of all advanced roughing
  technologies, including:
  
  ★ PRISM ENHANCED ROUGHING TECHNOLOGY:
    - Dynamic Depth Feed Adjustment (KEY to fast 3D adaptive!)
    - Intelligent Chip Thinning Compensation
    - Corner Deceleration Control with G-Force Limiting
    - Arc Feed Correction for Constant Chip Thickness
    - Direction Change Detection with Smooth Feed Ramping
    - 8-Level Aggressiveness Control (Conservative to Maximum MRR)
    - Tool Stickout Analysis with Deflection Compensation
    
  ★ HURCO-SPECIFIC OPTIMIZATIONS:
    - G05.3 Smoothing (Auto Rough P35 / Finish P10)
    - M16 Automatic Buffering for Smooth Motion
    - M98 Subprogram Support for Air Through Spindle
    - M140 Z-Axis Retract Support
    - UltiMotion Cutting Mode (G64)
    - Chip Conveyor Control (M59/M61)
    - Washdown Coolant Support (M68/M69)
    
  ★ PRODUCTIVITY FEATURES:
    - Minimum Z Retract Between Work Offsets
    - Spindle Warm-Up Routine
    - Safe Start Block
    - Speed-Up Suggestions in G-code Comments
    - Estimated Cycle Time Display
    
  ============================================================================
  
  $Revision: PRISM v8.9.154 Enhanced Edition $
  $Date: 2026-04-05 $
  
  Copyright (C) 2012-2026 by Autodesk, Inc. & PRISM Manufacturing Intelligence
  All rights reserved.
  
  FORKID {1B14E478-26FE-4db2-A3E7-FB814E8C0B4E}
*/

///////////////////////////////////////////////////////////////////////////////
//                  PRISM ENHANCED HURCO VM30i POST PROCESSOR
//
// PRISM ENHANCED ROUGHING TECHNOLOGY - KEY TO FAST ADAPTIVE:
//   During 3D adaptive, axial depth varies - shallow cuts GO FASTER!
//   
//   Properties:
//   - "Use dynamic depth feed adjustment" - Master switch (ON by default)
//   - "Maximum dynamic feed increase (%)" - Cap at 150% default
//   - "Prism base feedrate" - 0 = use Fusion programmed feed
//   
//   Example: Programmed feed 100 IPM with 150% max increase:
//   - Full depth: 100 IPM
//   - Half depth: 141 IPM (+41%)
//   - Quarter depth: 150 IPM (capped)
//
// G05.3 SMOOTHING - NOW AFTER M6 LINE:
//   Output immediately after tool change with tool number:
//   T1 M6
//   G05.3 P35 (T1 ROUGH SMOOTHING)   <- Clearly for Tool 1
//   T2                                <- Preload next tool
//
// PRISM ADVANCED FEED OPTIMIZATION:
//   - Tool stickout analysis with deflection compensation
//   - Chip thinning compensation (up to 2.5x at 5% stepover)
//   - Axial depth adjustment for optimal chip load
//   - 3D adaptive engagement detection
//   - SPEED-UP SUGGESTIONS in G-code comments
//
// PRISM ENHANCED ROUGHING VARIABLE FEED:
//   - Arc feed correction for constant chip thickness
//   - Direction change detection with smooth transitions
//   - Feed ramping to prevent load spikes
//   - 8-level aggressiveness slider (1=conservative, 8=maximum MRR)
//
// G-FORCE OPTIMIZATION:
//   - Machine acceleration-limited motion
//   - Corner velocity limiting based on radius
//   - Jerk control for smooth surfaces
//
// OTHER: Air through spindle M98, minimum Z retract, safe start
//
///////////////////////////////////////////////////////////////////////////////


description = "PRISM Enhanced - HURCO VM30i";
vendor = "HURCO";
vendorUrl = "http://www.hurco.com";
legal = "Copyright (C) 2012-2022 by Autodesk, Inc.";
certificationLevel = 2;
minimumRevision = 45793;

longDescription = "PRISM Enhanced post for HURCO VM30i with WinMax control. Features PRISM Enhanced Roughing Technology™: dynamic depth feed adjustment (the KEY to fast 3D adaptive), intelligent chip thinning compensation, corner deceleration with G-force optimization, arc feed correction, direction change detection, 8-level aggressiveness control. Includes Hurco-specific: G05.3 smoothing (auto rough/finish values), M16 automatic buffering, M98 subprograms for air through spindle, minimum Z retract between WCS. Supports both ISNC and BNC modes.";

extension = "hnc";
programNameIsInteger = true;
setCodePage("ascii");

capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;
tolerance = spatial(0.002, MM);

minimumChordLength = spatial(0.01, MM);
minimumCircularRadius = spatial(0.001, MM);
maximumCircularRadius = spatial(5000, MM);
minimumCircularSweep = toRad(0.001);
maximumCircularSweep = toRad(1800);
allowHelicalMoves = true;
allowedCircularPlanes = undefined; // allow any circular motion
highFeedrate = (unit == IN) ? 1000 : 5000;

// user-defined properties
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
    description: "Output a tool list in the header of the code. Disable when using PRISM Fusion add-in (add-in manages tooling).",
    group      : "formats",
    type       : "boolean",
    value      : false,
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
    value: "false",
    scope: "post"
  },
  sequenceNumberStart: {
    title      : "Start sequence number",
    description: "The number at which to start the sequence numbers.",
    group      : "formats",
    type       : "integer",
    value      : 0,
    scope      : "post"
  },
  sequenceNumberIncrement: {
    title      : "Sequence number increment",
    description: "The amount by which the sequence number is incremented by in each block.",
    group      : "formats",
    type       : "integer",
    value      : 0,
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
  isnc: {
    title      : "Use ISNC mode",
    description: "YES = ISNC (ISO NC mode, recommended). NO = BNC (Basic NC mode).",
    group      : "formats",
    type       : "boolean",
    value: true,
    scope: "post"
  },
  separateWordsWithSpace: {
    title      : "Separate words with space",
    description: "Adds spaces between words if 'yes' is selected.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  allow3DArcs: {
    title      : "Allow 3D arcs",
    description: "Specifies whether 3D circular arcs are allowed.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useParametricFeed: {
    title      : "Parametric feed",
    description: "Specifies the feed value that should be output using a Q value.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useG0: {
    title      : "Use G0",
    description: "Specifies that G0s should be used for rapid moves.",
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
    value      : false,
    scope      : "post"
  },
  preferredTilt: {
    title      : "Prefer positive tilt",
    description: "Specifies whether to prefer positive or negative tilt angles.",
    group      : "multiAxis",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolChangePositionX: {
    title      : "Safe tool change position X",
    description: "Specify whether to use a safe tool change position in the X axis.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  toolChangePositionY: {
    title      : "Safe tool change position Y",
    description: "Specify whether to use a safe tool change position in the Y axis.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  machineAxisABC: {
    title      : "Machine axes",
    description: "Specify your machine axes here, for use with vector output only.",
    group      : "configuration",
    type       : "string",
    value      : "ABC",
    scope      : "post"
  },
  safePositionMethod: {
    title      : "Safe Retracts",
    description: "Select your desired retract option. 'Clearance Height' retracts to the operation clearance height.",
    group      : "homePositions",
    type       : "enum",
    values     : [
      // {title:"G28", id: "G28"},
      {title:"G28", id:"G28"},
      {title:"Clearance Height", id:"clearanceHeight"}
    ],
    value: "G28",
    scope: "post"
  },
  useM140: {
    title      : "Use M140",
    description: "Specifies to use M140 for Z-axis retracts instead of G53.",
    group      : "homePositions",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  singleResultsFile: {
    title      : "Create single results file",
    description: "Set to false if you want to store the measurement results for each probe / inspection toolpath in a separate file",
    group      : "probing",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSmoothing: {
    title      : "Use smoothing",
    description: "Enables G05.3 smoothing at the beginning of each operation. Automatically sets P35 for roughing (stock to leave > 0) and P10 for finishing (no stock to leave).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  smoothingRoughValue: {
    title      : "Smoothing rough value",
    description: "G05.3 P value for roughing operations (when stock to leave > 0).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 100],
    value      : 35,
    scope      : "post"
  },
  smoothingFinishValue: {
    title      : "Smoothing finish value",
    description: "G05.3 P value for finishing operations (when stock to leave = 0).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 100],
    value      : 10,
    scope      : "post"
  },
  smoothingSemiFinishValue: {
    title      : "Smoothing semi-finish value",
    description: "G05.3 P value for semi-finishing operations (when stock to leave is small).",
    group      : "preferences",
    type       : "integer",
    range      : [1, 100],
    value      : 20,
    scope      : "post"
  },
  useSafeStartBlock: {
    title      : "Safe start block",
    description: "Output safety codes at program start (G40, G80, G17, G90).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSpindleWarmUp: {
    title      : "Spindle warm-up",
    description: "Enable spindle warm-up routine at program start.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  spindleWarmUpRPM: {
    title      : "Spindle warm-up max RPM",
    description: "Maximum RPM to ramp up to during spindle warm-up.",
    group      : "preferences",
    type       : "integer",
    value      : 8000,
    scope      : "post"
  },
  spindleWarmUpTime: {
    title      : "Spindle warm-up time (minutes)",
    description: "Total time for spindle warm-up routine.",
    group      : "preferences",
    type       : "integer",
    value      : 5,
    scope      : "post"
  },
  useAutomaticBuffering: {
    title      : "Automatic buffering",
    description: "Enable M16 automatic buffering for smoother motion.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useWashdownCoolant: {
    title      : "Washdown coolant",
    description: "Enable washdown coolant at program end (M68/M69).",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  useMaxRapidRate: {
    title      : "Use max rapid rate (M194)",
    description: "Enable M194 to set maximum rapid rate. Set to 0 to disable.",
    group      : "preferences",
    type       : "integer",
    value      : 0,
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
  useChipConveyor: {
    title      : "Use chip conveyor",
    description: "Enable chip conveyor control (M59 on / M61 off).",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  useSubprogramAirThruSpindle: {
    title      : "Use subprogram for air through spindle",
    description: "Call M98 subprograms instead of M11 for air through spindle. Required for machines where M11 Q1/Q0 doesn't work.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  airOnSubprogram: {
    title      : "Air ON subprogram number",
    description: "Subprogram number to call for air through spindle ON (e.g., 9100 calls O9100).",
    group      : "preferences",
    type       : "integer",
    value      : 9100,
    scope      : "post"
  },
  airOffSubprogram: {
    title      : "Air OFF subprogram number",
    description: "Subprogram number to call for air through spindle OFF (e.g., 9101 calls O9101).",
    group      : "preferences",
    type       : "integer",
    value      : 9101,
    scope      : "post"
  },
  airThruSpindleAuxOutput: {
    title      : "Air through spindle auxiliary output",
    description: "If your air through spindle is wired to an auxiliary output, specify which one (1-12). Set to 0 to disable. M52-M55 = outputs 1-4, M142-M149 = outputs 5-12.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 12],
    value      : 0,
    scope      : "post"
  },
  useMinimumZRetract: {
    title      : "Use minimum Z retract between WCS",
    description: "When changing work offsets (not tool changes), retract only to clearance above stock instead of full Z home. Saves time on multi-fixture setups.",
    group      : "homePositions",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  minimumZRetractClearance: {
    title      : "Minimum Z retract clearance",
    description: "Distance above the highest point of stock/part to retract to when using minimum Z retract. In current units (inch or mm).",
    group      : "homePositions",
    type       : "spatial",
    value      : 1.0,
    scope      : "post"
  },
  minimumZRetractFromWCS: {
    title      : "Minimum Z retract from WCS zero",
    description: "When using minimum Z retract, this is the Z position (in WCS) to retract to. Positive value = above WCS Z0. Set to 0 to use clearance above stock top instead.",
    group      : "homePositions",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  // PRISM Variable Feedrate Options for Adaptive Roughing
  forceFeedOutput: {
    title      : "Force feedrate on every line",
    description: "Always output feedrate (F value) on every cutting move. Essential for adaptive/dynamic toolpaths where feedrate varies with engagement. Disables modal feedrate optimization.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  roughingFeedMultiplier: {
    title      : "Roughing feedrate multiplier (%)",
    description: "Scale feedrate for roughing/adaptive operations by this percentage. 100 = no change, 120 = 20% faster, 80 = 20% slower. Applied to cutting moves only.",
    group      : "preferences",
    type       : "integer",
    range      : [10, 200],
    value      : 100,
    scope      : "post"
  },
  finishingFeedMultiplier: {
    title      : "Finishing feedrate multiplier (%)",
    description: "Scale feedrate for finishing operations by this percentage. 100 = no change. Applied to finish cutting moves only.",
    group      : "preferences",
    type       : "integer",
    range      : [10, 200],
    value      : 100,
    scope      : "post"
  },
  maximumFeedrate: {
    title      : "Maximum feedrate limit",
    description: "Cap all feedrates at this value (in current units per minute). Set to 0 to disable limit. Useful for machine protection or conservative cuts.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  minimumFeedrate: {
    title      : "Minimum feedrate limit",
    description: "Never output feedrate below this value (in current units per minute). Set to 0 to disable. Prevents excessively slow feeds that could cause rubbing.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  showFeedComments: {
    title      : "Show feedrate type comments",
    description: "Add comments showing the type of feedrate being used (CUTTING, RAMP, PLUNGE, etc.). Helpful for debugging adaptive toolpaths.",
    group      : "formats",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  // PRISM Enhanced Variable Feedrate Control
  usePrismEnhancedFeed: {
    title      : "Use Prism Enhanced variable feed",
    description: "Enable intelligent feedrate adjustment similar to advanced roughing technologies. Automatically reduces feed in corners and arcs to maintain constant chip thickness, and ramps feed smoothly between different cutting conditions.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismAggressivenessLevel: {
    title      : "Prism aggressiveness level (1-8)",
    description: "Similar to an aggressiveness slider. Level 1 = conservative (reduced MRR, longer tool life). Level 8 = aggressive (maximum MRR). Affects how much feed reduction is applied in corners.",
    group      : "preferences",
    type       : "integer",
    range      : [1, 8],
    value      : 5,
    scope      : "post"
  },
  arcFeedCorrection: {
    title      : "Arc feed correction (%)",
    description: "Reduce feedrate on arcs/corners by this percentage to maintain constant chip thickness. 100% = full correction (constant chip load), 0% = no correction (constant feed). PRISM default is 100%.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 100],
    value      : 100,
    scope      : "post"
  },
  directionChangeFeedReduction: {
    title      : "Direction change feed reduction (%)",
    description: "Reduce feedrate when tool changes direction sharply. This simulates increased engagement at corners. 30 = reduce by 30% at sharp corners.",
    group      : "preferences",
    type       : "integer",
    range      : [0, 50],
    value      : 25,
    scope      : "post"
  },
  feedRampingDistance: {
    title      : "Feed ramping distance",
    description: "Distance over which to smoothly ramp feedrate changes (in current units). 0 = instant feed changes, 0.5 = smooth 0.5 inch/mm transition. Prevents sudden load spikes.",
    group      : "preferences",
    type       : "spatial",
    value      : 0,
    scope      : "post"
  },
  minChipLoadFeed: {
    title      : "Minimum chip load feedrate (%)",
    description: "Never reduce feedrate below this percentage of programmed feed, even in tight corners. Prevents rubbing. 50 = minimum 50% of programmed feed.",
    group      : "preferences",
    type       : "integer",
    range      : [20, 100],
    value      : 50,
    scope      : "post"
  },
  // PRISM Advanced Feed Optimization Based on Cutting Parameters
  useAdvancedFeedOptimization: {
    title      : "Use advanced feed optimization",
    description: "Automatically adjust feedrates based on tool stickout, radial engagement, and axial depth. Calculates optimal feeds for each cutting condition.",
    group      : "preferences",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  showOptimizationNotes: {
    title      : "Show optimization notes in G-code",
    description: "Add comments in G-code showing current cutting parameters, calculated adjustments, and suggestions for speeding up operations.",
    group      : "formats",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  toolStickoutMultiplier: {
    title      : "Tool stickout safety factor",
    description: "How aggressively to reduce feed for long stickout. 1.0 = standard reduction, 0.5 = less reduction (aggressive), 1.5 = more reduction (conservative). Stickout > 4xD triggers reduction.",
    group      : "preferences",
    type       : "number",
    value      : 1.0,
    scope      : "post"
  },
  maxStickoutRatio: {
    title      : "Maximum safe stickout ratio",
    description: "Maximum stickout-to-diameter ratio before significant feed reduction. Typical: 3-4 for roughing, 5-6 for finishing. Beyond this, feed is progressively reduced.",
    group      : "preferences",
    type       : "number",
    value      : 4.0,
    scope      : "post"
  },
  useChipThinningCompensation: {
    title      : "Use chip thinning compensation",
    description: "Increase feedrate at low radial engagements to maintain target chip load. At 10% stepover, actual chip is thinner than programmed - this compensates automatically.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  maxChipThinningMultiplier: {
    title      : "Maximum chip thinning multiplier",
    description: "Maximum feed increase for chip thinning compensation. 2.0 = allow up to 2x feed increase at very light stepovers. Prevents runaway speeds.",
    group      : "preferences",
    type       : "number",
    value      : 1.5,
    scope      : "post"
  },
  adaptiveDepthFeedAdjust: {
    title      : "Adjust feed for axial depth",
    description: "Reduce feed when axial depth exceeds optimal range for tool. Deeper cuts with controlled radial = OK, but extreme depths need feed reduction.",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  finishingStickoutTolerance: {
    title      : "Finishing stickout tolerance ratio",
    description: "For finishing operations, allow higher stickout before reducing feed (lighter cuts). Typically 1.5x the roughing tolerance.",
    group      : "preferences",
    type       : "number",
    value      : 6.0,
    scope      : "post"
  },
  roughingOptimalWOC: {
    title      : "Roughing optimal WOC (%)",
    description: "Optimal width of cut for roughing as % of tool diameter. Feeds are optimized around this value. Typical adaptive: 10-25%.",
    group      : "preferences",
    type       : "integer",
    range      : [5, 50],
    value      : 15,
    scope      : "post"
  },
  finishingMaxWOC: {
    title      : "Finishing max WOC (%)",
    description: "Maximum width of cut for finishing operations as % of tool diameter. Exceeding this triggers feed reduction for surface quality.",
    group      : "preferences",
    type       : "integer",
    range      : [5, 100],
    value      : 35,
    scope      : "post"
  },
  // PRISM Dynamic Feed Adjustment for 3D Adaptive
  useDynamicDepthFeed: {
    title      : "Use dynamic depth feed adjustment",
    description: "For 3D adaptive toolpaths: automatically INCREASE feedrate when cutting shallow (near stock top) and maintain feed at full depth. This is the KEY to fast adaptive machining - lighter cuts can go faster!",
    group      : "preferences",
    type       : "boolean",
    value      : true,
    scope      : "post"
  },
  dynamicDepthMaxIncrease: {
    title      : "Maximum dynamic feed increase (%)",
    description: "Maximum feed increase when cutting at shallow depths. 150 = allow up to 50% faster at shallow cuts. Higher = more aggressive.",
    group      : "preferences",
    type       : "integer",
    range      : [100, 200],
    value      : 150,
    scope      : "post"
  },
  adaptiveBaseFeed: {
    title      : "Adaptive base feedrate (0=use programmed)",
    description: "Base feedrate for adaptive toolpaths. If 0, uses the programmed feed from Fusion. Set this to your optimal full-depth feed, then dynamic adjustment will INCREASE feed at lighter cuts.",
    group      : "preferences",
    type       : "number",
    value      : 0,
    scope      : "post"
  },
  // ═══ PRISM SERVER INTEGRATION ═══
  usePrismServer: {
    title      : "Use PRISM server for physics S/F",
    description: "When enabled and PRISM server is running, tool parameters and cut context from the PRISM Fusion add-in are used to compute physics-optimized spindle speed and feedrate via Kienzle force model. Overrides CAM-programmed S/F with PRISM-calculated values.",
    group      : "prism",
    type       : "boolean",
    value      : false,
    scope      : "post"
  },
  prismServerUrl: {
    title      : "PRISM server URL",
    description: "URL of the PRISM MCP server for physics optimization.",
    group      : "prism",
    type       : "string",
    value      : "http://127.0.0.1:18361",
    scope      : "post"
  },
  prismMaterialOverride: {
    title      : "Material override",
    description: "Override Fusion material for PRISM physics (e.g., '4140 Steel', '7075-T6'). Leave blank to use Fusion material name.",
    group      : "prism",
    type       : "string",
    value      : "",
    scope      : "post"
  },
  prismOptimizationTarget: {
    title      : "Optimization target",
    description: "What to optimize for when using PRISM physics.",
    group      : "prism",
    type       : "enum",
    values     : [
      {title:"Balanced", id:"balanced"},
      {title:"Maximum Speed", id:"max_speed"},
      {title:"Maximum Tool Life", id:"max_tool_life"},
      {title:"Surface Quality", id:"surface_quality"},
      {title:"Minimum Cost", id:"min_cost"}
    ],
    value: "balanced",
    scope: "post"
  },
  prismAggressiveness: {
    title      : "PRISM aggressiveness (0-100)",
    description: "0=Conservative (first article), 50=Balanced, 100=Maximum productivity. Controls how aggressively PRISM pushes speeds and feeds.",
    group      : "prism",
    type       : "integer",
    range      : [0, 100],
    value      : 50,
    scope      : "post"
  }
};


// =============================================================================
// PRISM G-FORCE OPTIMIZATION MODULE
// =============================================================================
// Optimizes motion based on machine dynamics to prevent:
// - Servo following errors
// - Surface finish degradation  
// - Excessive machine vibration
// Based on PRISM Manufacturing Intelligence v8.9.152 physics engine
// =============================================================================

var PRISM_GFORCE = {
    // HURCO VM30i acceleration limits (g)
    accelLimit: 0.5,
    
    // Jerk limit (m/s³)
    jerkLimit: 35,
    
    // Gravity constant (m/s²)
    GRAVITY: 9.81,
    
    // Corner G-force limit
    cornerG: 0.35,
    
    // Chip thinning lookup table (ae/D ratio → feed multiplier)
    // Based on chip thickness = fz * sqrt(ae/D * (1 - ae/D))
    chipThinningTable: {
        0.05: 2.50,  // 5% stepover → 250% feed increase
        0.10: 1.80,  // 10% stepover
        0.15: 1.55,
        0.20: 1.40,
        0.25: 1.30,
        0.30: 1.22,
        0.35: 1.16,
        0.40: 1.12,
        0.45: 1.08,
        0.50: 1.05,  // 50% stepover → nominal
        0.60: 1.00,
        0.70: 0.95,
        0.80: 0.90,
        0.90: 0.85,
        1.00: 0.80   // Slotting → reduce 20%
    },
    
    // Corner deceleration factors (included angle → feed multiplier)
    cornerFactorTable: {
        180: 1.00,   // Straight line
        170: 0.98,
        160: 0.95,
        150: 0.90,
        140: 0.85,
        135: 0.78,   // 45° corner
        130: 0.72,
        120: 0.65,
        110: 0.55,
        100: 0.45,
        90: 0.35,    // 90° corner
        80: 0.28,
        70: 0.22,
        60: 0.16,
        45: 0.10,
        30: 0.05
    },
    
    /**
     * Get chip thinning factor from lookup table with interpolation
     */
    getChipThinningFactor: function(aeRatio) {
        if (aeRatio >= 1.0) return 0.80;
        if (aeRatio <= 0.05) return 2.50;
        
        var ratios = Object.keys(this.chipThinningTable).map(Number).sort(function(a,b){return a-b;});
        for (var i = 0; i < ratios.length; i++) {
            if (aeRatio <= ratios[i]) {
                if (i === 0) return this.chipThinningTable[ratios[0]];
                var lower = ratios[i - 1];
                var upper = ratios[i];
                var t = (aeRatio - lower) / (upper - lower);
                return this.chipThinningTable[lower] * (1 - t) + this.chipThinningTable[upper] * t;
            }
        }
        return 1.0;
    },
    
    /**
     * Get corner deceleration factor from lookup table
     */
    getCornerFactor: function(angleChange) {
        var angles = Object.keys(this.cornerFactorTable).map(Number).sort(function(a,b){return b-a;});
        for (var i = 0; i < angles.length; i++) {
            if (angleChange <= angles[i]) {
                return this.cornerFactorTable[angles[i]];
            }
        }
        return 0.05;
    },
    
    /**
     * Calculate maximum feed for segment length based on acceleration
     */
    getMaxFeedForSegment: function(segmentLength) {
        var a = this.accelLimit * this.GRAVITY * 1000; // mm/s²
        var maxVelocity = Math.sqrt(2 * a * segmentLength); // mm/s
        return maxVelocity * 60; // mm/min
    },
    
    /**
     * Calculate deceleration distance for given feed
     */
    getDecelDistance: function(feed) {
        var v = feed / 60; // mm/s
        var a = this.accelLimit * this.GRAVITY * 1000; // mm/s²
        return (v * v) / (2 * a); // mm
    },
    
    /**
     * Get corner velocity limit based on radius
     */
    getCornerVelocity: function(radius) {
        if (radius <= 0) return 0;
        var gLimit = this.cornerG * this.GRAVITY * 1000; // mm/s²
        var v = Math.sqrt(gLimit * radius); // mm/s
        return v * 60; // mm/min
    },
    
    /**
     * Check if corner requires deceleration
     */
    needsDeceleration: function(angleChange) {
        return angleChange < 135;
    }
};

/**
 * Apply PRISM G-force limited feed
 */
function getPrismGForceLimitedFeed(baseFeed, segmentLength, angleChange) {
    var maxFeed = baseFeed;
    
    // Apply segment length limit
    var segmentMaxFeed = PRISM_GFORCE.getMaxFeedForSegment(segmentLength);
    maxFeed = Math.min(maxFeed, segmentMaxFeed);
    
    // Apply corner deceleration
    if (angleChange !== undefined && PRISM_GFORCE.needsDeceleration(angleChange)) {
        var cornerFactor = PRISM_GFORCE.getCornerFactor(angleChange);
        maxFeed *= cornerFactor;
    }
    
    return maxFeed;
}


// wcs definiton
wcsDefinitions = {
  useZeroOffset: false,
  wcs          : [
    {name:"Standard", format:"G", range:[54, 59]}
  ]
};

var singleLineCoolant = false; // specifies to output multiple coolant codes in one line rather than in separate lines
// samples:
// {id: COOLANT_THROUGH_TOOL, on: 88, off: 89}
// {id: COOLANT_THROUGH_TOOL, on: [8, 88], off: [9, 89]}
// {id: COOLANT_THROUGH_TOOL, on: "M88 P3 (myComment)", off: "M89"}
//
// HURCO COOLANT CODES:
// M7  = Through spindle coolant (TSC)
// M8  = Flood coolant
// M9  = Both coolant systems off
// M10 = Both coolant systems on
// M11 Q1 = Air through spindle ON (requires Q parameter - may not work on all machines)
// M11 Q0 = Air through spindle OFF
// M52-M55 = Auxiliary outputs 1-4
// M62-M65 = Auxiliary outputs 1-4 off
// M142-M149 = Auxiliary outputs 5-12
// M152-M159 = Auxiliary outputs 5-12 off
// M68 = Washdown coolant on
// M69 = Washdown coolant off
//
// AIR THROUGH SPINDLE WORKAROUND:
// If M11 Q1/Q0 doesn't work on your machine, enable "Use subprogram for air through spindle"
// This will call M98 P9100 (air on) and M98 P9101 (air off) subprograms
// You must create these subprograms on the machine using whatever method works at the console
//
var coolants = [
  {id:COOLANT_FLOOD, on:8},
  {id:COOLANT_MIST, on:7},  // Using TSC for mist
  {id:COOLANT_THROUGH_TOOL, on:7},
  {id:COOLANT_AIR, on:52, off:62},  // Auxiliary output 1: M52=on, M62=off
  {id:COOLANT_AIR_THROUGH_TOOL},  // Handled specially - see getCoolantCodes()
  {id:COOLANT_SUCTION},
  {id:COOLANT_FLOOD_MIST, on:[8, 7]},  // Both flood and TSC
  {id:COOLANT_FLOOD_THROUGH_TOOL, on:10},  // M10 = both coolant systems on
  {id:COOLANT_OFF, off:9}  // M9 turns off coolants - air off handled separately
];

// Track if air through spindle is currently active
var airThruSpindleActive = false;

var gFormat = createFormat({prefix:"G", decimals:1});
var mFormat = createFormat({prefix:"M", decimals:0});
var hFormat = createFormat({prefix:"H", decimals:0});
var dFormat = createFormat({prefix:"D", decimals:0});
var probeWCSFormat = createFormat({decimals:0, forceDecimal:true});

var xyzFormat = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true});
var ijkFormat = createFormat({decimals:6, forceDecimal:true});
var abcFormat = createFormat({decimals:3, forceDecimal:true, scale:DEG});
// PRISM fix: Milling feeds use 0 decimals (whole numbers) — tapping/threading use precise decimals
var feedFormat = createFormat({decimals:0, forceDecimal:false});
var feedFormatPrecise = createFormat({decimals:(unit == MM ? 3 : 4), forceDecimal:true}); // for tapping, threading, probing
var inverseTimeFormat = createFormat({decimals:3, forceDecimal:true});
var toolFormat = createFormat({decimals:0});
var rpmFormat = createFormat({decimals:0});
var secFormat = createFormat({decimals:3, forceDecimal:true}); // seconds - range 0.001-9999.999
var taperFormat = createFormat({decimals:1, scale:DEG});

var xOutput = createVariable({prefix:"X"}, xyzFormat);
var yOutput = createVariable({prefix:"Y"}, xyzFormat);
var zOutput = createVariable({onchange:function () {retracted = false;}, prefix:"Z"}, xyzFormat);
var aOutput = createVariable({prefix:"A"}, abcFormat);
var bOutput = createVariable({prefix:"B"}, abcFormat);
var cOutput = createVariable({prefix:"C"}, abcFormat);
var feedOutput = createVariable({prefix:"F"}, feedFormat);
var feedOutputPrecise = createVariable({prefix:"F"}, feedFormatPrecise); // for tapping/threading only
var inverseTimeOutput = createVariable({prefix:"F", force:true}, inverseTimeFormat);
var sOutput = createVariable({prefix:"S", force:true}, rpmFormat);
var dOutput = createVariable({}, dFormat);

// circular output
var iOutput = createVariable({prefix:"I", force:true}, xyzFormat);
var jOutput = createVariable({prefix:"J", force:true}, xyzFormat);
var kOutput = createVariable({prefix:"K", force:true}, xyzFormat);
var irOutput = createReferenceVariable({prefix:"I", force:true}, xyzFormat);
var jrOutput = createReferenceVariable({prefix:"J", force:true}, xyzFormat);
var krOutput = createReferenceVariable({prefix:"K", force:true}, xyzFormat);

var gMotionModal = createModal({}, gFormat); // modal group 1 // G0-G3, ...
var gPlaneModal = createModal({onchange:function () {gMotionModal.reset();}}, gFormat); // modal group 2 // G17-19
var gAbsIncModal = createModal({}, gFormat); // modal group 3 // G90-91
var gFeedModeModal = createModal({}, gFormat); // modal group 5 // G93-95
var gUnitModal = createModal({}, gFormat); // modal group 6 // G20-21 or G70-71
var gCycleModal = createModal({}, gFormat); // modal group 9 // G81, ...
var gRetractModal = createModal({}, gFormat); // modal group 10 // G98-99
var gRotationModal = createModal({
  onchange: function () {
    if (probeVariables.probeAngleMethod == "G68") {
      probeVariables.outputRotationCodes = true;
    }
  }
}, gFormat); // modal group 16 // G68-G69
var mClampModal = createModalGroup(
  {strict:false},
  [
    [32, 33], // A axis clamp / unclamp
    [34, 35], // B axis clamp / unclamp
    [12, 13]  // C axis clamp / unclamp
  ],
  mFormat
);

// fixed settings
var firstFeedParameter = 1;
var useMultiAxisFeatures = true;
var forceMultiAxisIndexing = false; // force multi-axis indexing for 3D programs

var allowIndexingWCSProbing = false; // specifies that probe WCS with tool orientation is supported
var probeVariables = {
  outputRotationCodes: false, // defines if it is required to output rotation codes
  probeAngleMethod   : "OFF", // OFF, AXIS_ROT, G68, G54.4
  compensationXY     : undefined
};

// collected state
var sequenceNumber;
var currentWorkOffset;
var forceSpindleSpeed = false;
var activeMovements; // do not use by default
var currentFeedId;
var retracted = false; // specifies that the tool has been retracted to the safe plane
var useVectorOutput = false; // states that useMultiAxisFeatures is enabled and no machine configuration is active
probeMultipleFeatures = true;

/** Returns true if the given ABC axis is available for use with vector output. */
function hasABCAxis(name) {
  return String(getProperty("machineAxisABC")).toUpperCase().indexOf(name) != -1;
}

/**
  Writes the specified block.
*/
function writeBlock() {
  var text = formatWords(arguments);
  if (!text) {
    return;
  }
  if (getProperty("showSequenceNumbers") == "true") {
    if (text) {
      if (sequenceNumber > 9999999) {
        sequenceNumber = getProperty("sequenceNumberStart");
      }
      writeWords2("N" + sequenceNumber, text);
      sequenceNumber += getProperty("sequenceNumberIncrement");
    }
  } else {
    writeWords(arguments);
  }
}

function formatComment(text) {
  return "(" + String(text).replace(/[()]/g, "") + ")";
}

/**
  Writes the specified block - used for tool changes only.
*/
function writeToolBlock() {
  var show = getProperty("showSequenceNumbers");
  setProperty("showSequenceNumbers", (show == "true" || show == "toolChange") ? "true" : "false");
  writeBlock(arguments);
  setProperty("showSequenceNumbers", show);
}

/**
  Output a comment.
*/
function writeComment(text) {
  writeln(formatComment(text));
}

// Start of machine configuration logic
var compensateToolLength = false; // add the tool length to the pivot distance for nonTCP rotary heads

// internal variables, do not change
var receivedMachineConfiguration;
var operationSupportsTCP;
var multiAxisFeedrate;

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

  // setup usage of multiAxisFeatures
  useMultiAxisFeatures = getProperty("useMultiAxisFeatures") != undefined ? getProperty("useMultiAxisFeatures") :
    (typeof useMultiAxisFeatures != "undefined" ? useMultiAxisFeatures : false);
  useABCPrepositioning = getProperty("useABCPrepositioning") != undefined ? getProperty("useABCPrepositioning") :
    (typeof useABCPrepositioning != "undefined" ? useABCPrepositioning : false);

  if (!machineConfiguration.isMultiAxisConfiguration()) {
    return; // don't need to modify any settings for 3-axis machines
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

function defineMachine() {
  var useTCP = true;
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
        9999.99, // maximum output value for inverse time feed rates
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
// End of machine configuration logic

function onOpen() {
  // define and enable machine configuration
  receivedMachineConfiguration = machineConfiguration.isReceived();

  if (typeof defineMachine == "function") {
    defineMachine(); // hardcoded machine configuration
  }
  activateMachine(); // enable the machine optimizations and settings

  if (getProperty("useG0") && (highFeedrate <= 0)) {
    error(localize("You must set 'highFeedrate' because axes are not synchronized for rapid traversal."));
    return;
  }

  gFeedModeModal.format(94);

  if (useMultiAxisFeatures && !machineConfiguration.isMultiAxisConfiguration()) {
    var text = String(getProperty("machineAxisABC")).toUpperCase();
    for (var i = 0; i < text.length; ++i) {
      if ("ABC".indexOf(text.charAt(i)) == -1) {
        error(localize("Property 'machineAxisABC' must be A, B, C or any combination of these axes!"));
        return;
      }
    }
    useVectorOutput = true;
  }

  if (!getProperty("separateWordsWithSpace")) {
    setWordSeparator("");
  }

  sequenceNumber = getProperty("sequenceNumberStart");
  writeln("%");

  if (programName) {
    var programId;
    try {
      programId = getAsInt(programName);
    } catch (e) {
      error(localize("Program name must be a number."));
      return;
    }
    if (!((programId >= 1) && (programId <= 9999))) {
      error(localize("Program number is out of range."));
    }
    var oFormat = createFormat({width:4, zeropad:true, decimals:0});
    writeln(
      "O" + oFormat.format(programId) +
      conditional(programComment, " " + formatComment(programComment))
    );
  } else {
    error(localize("Program name has not been specified."));
    return;
  }

  if (getProperty("useG0")) {
    writeComment(localize("Using G0 which travels along dogleg path."));
  } else {
    writeComment(subst(localize("Using high feed G1 F%1 instead of G0."), feedFormat.format(highFeedrate)));
  }

  // dump machine configuration
  var vendor = machineConfiguration.getVendor();
  var model = machineConfiguration.getModel();
  var description = machineConfiguration.getDescription();

  if (getProperty("writeMachine") && (vendor || model || description)) {
    writeComment(localize("Machine"));
    if (vendor) {
      writeComment("  " + localize("vendor") + ": " + vendor);
    }
    if (model) {
      writeComment("  " + localize("model") + ": " + model);
    }
    if (description) {
      writeComment("  " + localize("description") + ": "  + description);
    }
  }

  //Probing Surface Inspection
  if (typeof inspectionWriteVariables == "function") {
    inspectionWriteVariables();
  }

  // PRISM physics data via operation:comment JSON or Add-in pre-optimization
  if (getProperty("usePrismServer")) {
    writeComment("PRISM ENHANCED: Physics data via Add-in or operation:comment JSON");
    writeComment("PRISM TARGET: " + getProperty("prismOptimizationTarget").toUpperCase() +
                 " | AGGR: " + getProperty("prismAggressiveness") + "%");
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
        var comment = "T" + toolFormat.format(tool.number) + " " +
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

  if (false) {
    // check for duplicate tool number
    for (var i = 0; i < getNumberOfSections(); ++i) {
      var sectioni = getSection(i);
      var tooli = sectioni.getTool();
      for (var j = i + 1; j < getNumberOfSections(); ++j) {
        var sectionj = getSection(j);
        var toolj = sectionj.getTool();
        if (tooli.number == toolj.number) {
          if (xyzFormat.areDifferent(tooli.diameter, toolj.diameter) ||
              xyzFormat.areDifferent(tooli.cornerRadius, toolj.cornerRadius) ||
              abcFormat.areDifferent(tooli.taperAngle, toolj.taperAngle) ||
              (tooli.numberOfFlutes != toolj.numberOfFlutes)) {
            error(
              subst(
                localize("Using the same tool number for different cutter geometry for operation '%1' and '%2'."),
                sectioni.hasParameter("operation-comment") ? sectioni.getParameter("operation-comment") : ("#" + (i + 1)),
                sectionj.hasParameter("operation-comment") ? sectionj.getParameter("operation-comment") : ("#" + (j + 1))
              )
            );
            return;
          }
        }
      }
    }
  }

  if (useVectorOutput && isMultiAxis()) {
    onCommand(COMMAND_STOP);
    onComment("We cannot guarantee that the CNC will not have to do a rewind during cutting when using vector output.");
    onComment("Machine needs to be defined in post to use ABC output and hence avoid risk of gouges during rewind. Please be careful.");
  }

  if ((getNumberOfSections() > 0) && (getSection(0).workOffset == 0)) {
    for (var i = 0; i < getNumberOfSections(); ++i) {
      if (getSection(i).workOffset > 0) {
        error(localize("Using multiple work offsets is not possible if the initial work offset is 0."));
        return;
      }
    }
  }

  // Safe start block - cancel any active modes
  if (getProperty("useSafeStartBlock")) {
    writeComment("SAFE START BLOCK");
    writeBlock(gFormat.format(40), formatComment("CANCEL CUTTER COMP"));
    writeBlock(gFormat.format(80), formatComment("CANCEL CANNED CYCLES"));
  }

  // absolute coordinates and feed per min
  writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17));
  if (!getProperty("isnc")) {
    writeBlock(gAbsIncModal.format(75)); // multi-quadrant arc interpolation mode
  }

  // Enable automatic buffering for smoother motion
  if (getProperty("useAutomaticBuffering")) {
    writeBlock(mFormat.format(16), formatComment("AUTOMATIC BUFFERING ON"));
  }

  // Set maximum rapid rate if specified
  if (getProperty("useMaxRapidRate") > 0) {
    writeBlock(mFormat.format(194), "P" + getProperty("useMaxRapidRate"), formatComment("MAX RAPID RATE"));
  }

  // Spindle warm-up routine
  if (getProperty("useSpindleWarmUp")) {
    writeln("");
    writeComment("SPINDLE WARM-UP ROUTINE");
    var maxRPM = getProperty("spindleWarmUpRPM");
    var warmUpTime = getProperty("spindleWarmUpTime");
    var steps = 4;
    var timePerStep = (warmUpTime * 60) / steps; // convert minutes to seconds, divide by steps
    
    for (var i = 1; i <= steps; i++) {
      var stepRPM = Math.round((maxRPM / steps) * i);
      writeBlock(sOutput.format(stepRPM), mFormat.format(3));
      writeBlock(gFormat.format(4), "P" + xyzFormat.format(timePerStep));
    }
    writeBlock(mFormat.format(5), formatComment("SPINDLE WARM-UP COMPLETE"));
    writeln("");
  }

  // Start chip conveyor
  if (getProperty("useChipConveyor")) {
    onCommand(COMMAND_START_CHIP_TRANSPORT);
  }

  if (useMultiAxisFeatures && (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration())) {
    writeBlock(mFormat.format(31)); // rotary axes encoder reset
    writeBlock(mFormat.format(126)); // shortest path traverse
  }
}

function onComment(message) {
  writeComment(message);
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

function printProbeResults() {
  return currentSection.getParameter("printResults", 0) == 1;
}

function FeedContext(id, description, feed) {
  this.id = id;
  this.description = description;
  this.feed = feed;
}

/** Track current movement type for feedrate comments */
var currentMovementType = "";

/** Variables for Prism Enhanced feed control */
var previousPosition = null;
var previousDirection = null;
var previousFeed = 0;
var prismEnhancedArcRadius = 0;
var prismEnhancedActive = false;

/** Get movement type description for comments */
function getMovementDescription(movementType) {
  switch (movementType) {
  case MOVEMENT_RAPID: return "RAPID";
  case MOVEMENT_LEAD_IN: return "LEAD-IN";
  case MOVEMENT_LEAD_OUT: return "LEAD-OUT";
  case MOVEMENT_CUTTING: return "CUTTING";
  case MOVEMENT_LINK_TRANSITION: return "TRANSITION";
  case MOVEMENT_LINK_DIRECT: return "LINK";
  case MOVEMENT_RAMP_HELIX: return "RAMP-HELIX";
  case MOVEMENT_RAMP_PROFILE: return "RAMP-PROFILE";
  case MOVEMENT_RAMP_ZIG_ZAG: return "RAMP-ZIGZAG";
  case MOVEMENT_RAMP: return "RAMP";
  case MOVEMENT_PLUNGE: return "PLUNGE";
  case MOVEMENT_PREDRILL: return "PREDRILL";
  case MOVEMENT_EXTENDED: return "EXTENDED";
  case MOVEMENT_REDUCED: return "REDUCED";
  case MOVEMENT_FINISH_CUTTING: return "FINISH";
  case MOVEMENT_HIGH_FEED: return "HIGH-FEED";
  default: return "MOVE";
  }
}

/**
  Apply feedrate multiplier based on movement type.
  Roughing multiplier applies to: CUTTING, RAMP, PLUNGE, EXTENDED, REDUCED
  Finishing multiplier applies to: FINISH_CUTTING
*/
function applyFeedMultiplier(f, movementType) {
  var multiplier = 100;
  
  // Determine which multiplier to apply
  if (movementType == MOVEMENT_FINISH_CUTTING) {
    multiplier = getProperty("finishingFeedMultiplier");
  } else if (movementType == MOVEMENT_CUTTING || 
             movementType == MOVEMENT_RAMP || 
             movementType == MOVEMENT_RAMP_HELIX ||
             movementType == MOVEMENT_RAMP_PROFILE ||
             movementType == MOVEMENT_RAMP_ZIG_ZAG ||
             movementType == MOVEMENT_PLUNGE ||
             movementType == MOVEMENT_EXTENDED ||
             movementType == MOVEMENT_REDUCED) {
    multiplier = getProperty("roughingFeedMultiplier");
  }
  
  // Apply multiplier
  if (multiplier != 100) {
    f = f * multiplier / 100;
  }
  
  return f;
}

/**
  Apply minimum and maximum feedrate limits.
*/
function applyFeedLimits(f) {
  var maxFeed = getProperty("maximumFeedrate");
  var minFeed = getProperty("minimumFeedrate");
  
  // Apply maximum limit
  if (maxFeed > 0 && f > maxFeed) {
    f = maxFeed;
  }
  
  // Apply minimum limit
  if (minFeed > 0 && f < minFeed) {
    f = minFeed;
  }
  
  return f;
}

/**
  PRISM Enhanced Feed Control Functions
  
  These functions implement variable feedrate logic similar to advanced roughing technologies:
  1. Arc Feed Correction - reduces feed on arcs to maintain constant chip thickness
  2. Direction Change Detection - reduces feed at sharp corners (increased engagement)
  3. Feed Ramping - smooth transitions between different feedrates
  4. Level-based aggressiveness - similar to prism's 1-8 level slider
*/

/**
  Calculate the aggressiveness factor based on Prism aggressiveness level (1-8).
  Level 1 = 0.5 (very conservative), Level 8 = 1.0 (full speed)
  This affects how much feed correction is applied.
*/
function getPrismAggressivenessLevelFactor() {
  var level = getProperty("prismAggressivenessLevel");
  // Linear interpolation: level 1 = 0.5, level 8 = 1.0
  return 0.5 + (level - 1) * (0.5 / 7);
}

/**
  Calculate arc feed correction factor.
  When cutting on an arc, the inside of the tool engages more material.
  Smaller radius = more engagement = slower feed needed.
  
  Based on chip thickness formula: CT = fz * sin(engagement_angle/2)
  For arcs: effective_engagement increases as radius decreases
  
  @param radius - Arc radius (0 for linear moves)
  @param toolRadius - Current tool radius
  @returns Feed multiplier (0.5 to 1.0)
*/
function calculateArcFeedFactor(radius, toolRadius) {
  if (!getProperty("usePrismEnhancedFeed")) {
    return 1.0;
  }
  
  var correction = getProperty("arcFeedCorrection") / 100;
  if (correction == 0 || radius == 0 || radius > toolRadius * 10) {
    return 1.0; // No correction for linear moves or large arcs
  }
  
  // The smaller the arc radius relative to tool, the more we reduce feed
  // Minimum factor based on minChipLoadFeed property
  var minFactor = getProperty("minChipLoadFeed") / 100;
  var levelFactor = getPrismAggressivenessLevelFactor();
  
  // Calculate engagement increase factor
  // When arc radius = tool radius, engagement is maximum
  // When arc radius >> tool radius, engagement is near normal
  var radiusRatio = Math.min(radius / toolRadius, 5);
  var baseFactor = 0.6 + (0.4 * (radiusRatio / 5)); // 0.6 at ratio=1, 1.0 at ratio=5+
  
  // Apply correction percentage and level
  var factor = 1.0 - ((1.0 - baseFactor) * correction * levelFactor);
  
  // Ensure we don't go below minimum
  return Math.max(factor, minFactor);
}

/**
  Calculate direction change feed factor.
  When tool changes direction sharply, momentary engagement increases.
  This reduces feed proportionally to the angle change.
  
  @param currentDir - Current movement direction vector [x, y, z]
  @param previousDir - Previous movement direction vector [x, y, z]
  @returns Feed multiplier (0.5 to 1.0)
*/
function calculateDirectionChangeFactor(currentDir, previousDir) {
  if (!getProperty("usePrismEnhancedFeed") || previousDir == null) {
    return 1.0;
  }
  
  var reductionPercent = getProperty("directionChangeFeedReduction");
  if (reductionPercent == 0) {
    return 1.0;
  }
  
  // Calculate dot product to find angle between directions
  var dotProduct = (currentDir[0] * previousDir[0]) + 
                   (currentDir[1] * previousDir[1]) + 
                   (currentDir[2] * previousDir[2]);
  
  // Clamp to valid range for acos
  dotProduct = Math.max(-1, Math.min(1, dotProduct));
  
  // Calculate angle in radians (0 = same direction, PI = opposite)
  var angle = Math.acos(dotProduct);
  
  // Normalize to 0-1 range (0 = no change, 1 = 180° turn)
  var angleRatio = angle / Math.PI;
  
  // Apply reduction based on angle
  // Sharp corners (>90°) get full reduction, gradual curves get less
  var reductionFactor = angleRatio * angleRatio; // Squared for more natural curve
  var reduction = (reductionPercent / 100) * reductionFactor;
  
  var minFactor = getProperty("minChipLoadFeed") / 100;
  var levelFactor = getPrismAggressivenessLevelFactor();
  
  // Apply level factor (higher level = less reduction)
  reduction = reduction * (2.0 - levelFactor);
  
  return Math.max(1.0 - reduction, minFactor);
}

/**
  Apply feed ramping for smooth transitions.
  Gradually changes from previous feed to target feed over specified distance.
  
  @param targetFeed - Desired feedrate
  @param previousFeed - Previous feedrate
  @param distance - Distance of current move
  @returns Ramped feedrate
*/
function applyFeedRamping(targetFeed, previousFeed, distance) {
  var rampDistance = getProperty("feedRampingDistance");
  if (rampDistance == 0 || previousFeed == 0 || distance == 0) {
    return targetFeed;
  }
  
  // If we're within ramping distance, blend feeds
  if (distance < rampDistance) {
    var ratio = distance / rampDistance;
    return previousFeed + (targetFeed - previousFeed) * ratio;
  }
  
  return targetFeed;
}

/**
  Store position and direction for next move comparison.
  Called during linear and circular moves.
*/
function updatePrismEnhancedState(x, y, z) {
  if (!getProperty("usePrismEnhancedFeed")) {
    return;
  }
  
  if (previousPosition != null) {
    var dx = x - previousPosition[0];
    var dy = y - previousPosition[1];
    var dz = z - previousPosition[2];
    var length = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (length > 0.0001) {
      previousDirection = [dx/length, dy/length, dz/length];
    }
  }
  
  previousPosition = [x, y, z];
}

/**
  Calculate Prism Enhanced adjusted feedrate.
  Combines all feed correction factors.
  
  @param f - Base feedrate from CAM
  @param isArc - True if this is a circular move
  @param arcRadius - Radius of arc (0 for linear)
  @param currentPos - Current position [x, y, z]
  @param moveDistance - Distance of this move
  @returns Adjusted feedrate
*/
function applyPrismEnhancedFeed(f, isArc, arcRadius, currentPos, moveDistance) {
  if (!getProperty("usePrismEnhancedFeed")) {
    return f;
  }
  
  var adjustedFeed = f;
  var toolRadius = tool.diameter / 2;
  
  // 1. Apply arc feed correction
  if (isArc && arcRadius > 0) {
    var arcFactor = calculateArcFeedFactor(arcRadius, toolRadius);
    adjustedFeed = adjustedFeed * arcFactor;
    prismEnhancedArcRadius = arcRadius; // Store for potential comments
  } else {
    prismEnhancedArcRadius = 0;
  }
  
  // 2. Apply direction change correction (for linear moves)
  if (!isArc && currentPos != null && previousPosition != null) {
    var dx = currentPos[0] - previousPosition[0];
    var dy = currentPos[1] - previousPosition[1];
    var dz = currentPos[2] - previousPosition[2];
    var length = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (length > 0.0001) {
      var currentDir = [dx/length, dy/length, dz/length];
      var dirFactor = calculateDirectionChangeFactor(currentDir, previousDirection);
      adjustedFeed = adjustedFeed * dirFactor;
    }
  }
  
  // 3. Apply feed ramping
  if (previousFeed > 0 && moveDistance > 0) {
    adjustedFeed = applyFeedRamping(adjustedFeed, previousFeed, moveDistance);
  }
  
  // Store for next iteration
  previousFeed = adjustedFeed;
  
  return adjustedFeed;
}

///////////////////////////////////////////////////////////////////////////////
//        ADVANCED FEED OPTIMIZATION BASED ON CUTTING PARAMETERS
//
// These functions implement intelligent feed adjustment similar to how
// advanced roughing technologies Technology Wizard calculates optimal feeds based on:
// - Tool stickout (deflection risk)
// - Radial engagement / Width of Cut (chip thinning)
// - Axial depth of cut
// - Operation type (roughing vs finishing)
// - 3D adaptive stepover considerations
///////////////////////////////////////////////////////////////////////////////

/** Variables to track current cutting parameters */
var currentOperationType = ""; // "roughing", "finishing", "adaptive3d", etc.
var currentRadialDepth = 0;    // Width of cut
var currentAxialDepth = 0;     // Depth of cut
var currentStickout = 0;       // Tool stickout length
var optimizationNotesOutput = false;

/**
  Get cutting parameters from current section.
  Extracts radial depth, axial depth, and determines operation type.
*/
function getCuttingParameters() {
  var params = {
    radialDepth: 0,
    axialDepth: 0,
    stepover: 0,
    stepdown: 0,
    radialStock: 0,
    axialStock: 0,
    isRoughing: false,
    isFinishing: false,
    isAdaptive: false,
    is3D: false,
    strategy: ""
  };
  
  // Get operation strategy
  if (hasParameter("operation-strategy")) {
    params.strategy = getParameter("operation-strategy").toLowerCase();
    params.isAdaptive = params.strategy.indexOf("adaptive") >= 0;
    params.is3D = params.strategy.indexOf("3d") >= 0 || params.strategy.indexOf("contour") >= 0;
  }
  
  // Determine if roughing or finishing based on stock to leave
  if (hasParameter("operation:stockToLeave")) {
    params.radialStock = getParameter("operation:stockToLeave");
  }
  if (hasParameter("operation:verticalStockToLeave")) {
    params.axialStock = getParameter("operation:verticalStockToLeave");
  }
  
  // Get stepover (radial depth)
  if (hasParameter("operation:stepover")) {
    params.stepover = getParameter("operation:stepover");
    params.radialDepth = params.stepover;
  }
  if (hasParameter("operation:maximumStepover")) {
    params.stepover = Math.max(params.stepover, getParameter("operation:maximumStepover"));
    params.radialDepth = params.stepover;
  }
  
  // Get stepdown (axial depth)
  if (hasParameter("operation:stepdown")) {
    params.stepdown = getParameter("operation:stepdown");
    params.axialDepth = params.stepdown;
  }
  if (hasParameter("operation:maximumStepdown")) {
    params.stepdown = Math.max(params.stepdown, getParameter("operation:maximumStepdown"));
    params.axialDepth = params.stepdown;
  }
  
  // Get stock/model Z boundaries for dynamic depth calculation
  params.stockZHigh = 0;
  params.stockZLow = 0;
  params.modelZHigh = 0;
  params.modelZLow = 0;
  
  // Try to get stock boundaries
  if (hasParameter("operation:stockZHigh")) {
    params.stockZHigh = getParameter("operation:stockZHigh");
  }
  if (hasParameter("operation:stockZLow")) {
    params.stockZLow = getParameter("operation:stockZLow");
  }
  // Try model boundaries as fallback
  if (hasParameter("operation:zHigh")) {
    params.modelZHigh = getParameter("operation:zHigh");
  }
  if (hasParameter("operation:zLow")) {
    params.modelZLow = getParameter("operation:zLow");
  }
  
  // Use section Z range as final fallback
  if (params.stockZHigh == 0 && params.modelZHigh == 0) {
    var zRange = currentSection.getGlobalZRange();
    params.stockZHigh = zRange.getMaximum();
    params.stockZLow = zRange.getMinimum();
  }
  
  // Store the effective top Z for dynamic calculations
  params.effectiveTopZ = params.stockZHigh > 0 ? params.stockZHigh : params.modelZHigh;
  params.effectiveBottomZ = params.stockZLow != 0 ? params.stockZLow : params.modelZLow;
  params.totalDepthRange = params.effectiveTopZ - params.effectiveBottomZ;
  
  // Classify operation
  // IMPORTANT: Adaptive toolpaths are ALWAYS roughing operations for feed purposes!
  // Even with 0 stock to leave, adaptive is removing bulk material at high engagement.
  // The programmed feed from Fusion is calculated for full engagement - don't reduce it!
  if (params.isAdaptive) {
    params.isRoughing = true;
    params.isFinishing = false;
  } else {
    var totalStock = params.radialStock + params.axialStock;
    if (totalStock <= 0.001) {
      params.isFinishing = true;
    } else if (totalStock >= 0.5 || (unit == MM && totalStock >= 0.1)) {
      params.isRoughing = true;
    } else {
      params.isFinishing = true; // Semi-finish treated as finishing for feed purposes
    }
  }
  
  return params;
}

/**
  Calculate tool stickout ratio and feed adjustment factor.
  
  Deflection increases with cube of stickout length.
  When stickout/diameter > threshold, reduce feed to prevent chatter.
  
  @param toolDiameter - Tool diameter
  @param toolLength - Tool overall length or flute length
  @param isFinishing - True if finishing operation
  @returns Object with ratio and feed multiplier
*/
function calculateStickoutFactor(toolDiameter, toolLength, isFinishing) {
  var result = {
    ratio: 0,
    factor: 1.0,
    warning: "",
    suggestion: ""
  };
  
  if (toolDiameter <= 0 || toolLength <= 0) {
    return result;
  }
  
  // Calculate stickout ratio
  result.ratio = toolLength / toolDiameter;
  
  // Get threshold based on operation type
  var threshold = isFinishing ? getProperty("finishingStickoutTolerance") : getProperty("maxStickoutRatio");
  var safetyFactor = getProperty("toolStickoutMultiplier");
  
  if (result.ratio <= threshold) {
    result.factor = 1.0;
    result.suggestion = "Stickout OK - no reduction needed";
  } else {
    // Progressive reduction beyond threshold
    // Formula: reduction increases with square of excess ratio
    var excess = result.ratio - threshold;
    var reductionPercent = Math.min(50, excess * excess * 5 * safetyFactor);
    result.factor = 1.0 - (reductionPercent / 100);
    
    if (result.ratio > threshold * 1.5) {
      result.warning = "HIGH STICKOUT WARNING";
      result.suggestion = "Consider shorter tool or reduced DOC";
    } else {
      result.suggestion = "Feed reduced " + Math.round(reductionPercent) + "% for stickout";
    }
  }
  
  return result;
}

/**
  Calculate chip thinning compensation factor.
  
  At low radial engagements (stepover), the actual chip thickness is less
  than the programmed chip load. To maintain target chip load, feed can
  be increased. This is the key to high-efficiency machining.
  
  Formula: Actual_chip = Programmed_chip * sqrt(Ae/D)
  Where Ae = radial depth, D = tool diameter
  
  To compensate: Feed_adjusted = Feed_programmed / sqrt(Ae/D)
  
  @param radialDepth - Width of cut (stepover)
  @param toolDiameter - Tool diameter
  @returns Object with factor and notes
*/
function calculateChipThinningFactor(radialDepth, toolDiameter) {
  var result = {
    factor: 1.0,
    engagementPercent: 0,
    chipThinningPercent: 0,
    suggestion: ""
  };
  
  if (!getProperty("useChipThinningCompensation") || radialDepth <= 0 || toolDiameter <= 0) {
    return result;
  }
  
  // Calculate engagement percentage
  result.engagementPercent = (radialDepth / toolDiameter) * 100;
  
  if (result.engagementPercent >= 50) {
    // At 50%+ engagement, no chip thinning compensation (conventional milling)
    result.factor = 1.0;
    result.suggestion = "High engagement - standard feed";
    return result;
  }
  
  // Calculate chip thinning factor
  // sqrt(Ae/D) gives the chip thickness ratio
  var chipRatio = Math.sqrt(radialDepth / toolDiameter);
  result.chipThinningPercent = (1.0 - chipRatio) * 100;
  
  // Compensation factor (inverse of chip ratio)
  var maxMultiplier = getProperty("maxChipThinningMultiplier");
  result.factor = Math.min(1.0 / chipRatio, maxMultiplier);
  
  if (result.factor > 1.2) {
    result.suggestion = "Chip thinning: +" + Math.round((result.factor - 1) * 100) + "% feed increase recommended";
  } else {
    result.suggestion = "Light chip thinning compensation applied";
  }
  
  return result;
}

/**
  Calculate axial depth feed adjustment factor.
  
  For ADAPTIVE/ROUGHING: 
    - Lighter axial cuts (less than optimal) = INCREASE feed (chip thinning in Z)
    - Deeper cuts approaching flute length = maintain or slightly reduce
  For FINISHING: 
    - Light axial depths preferred for surface quality
  
  This is the KEY to 3D adaptive: as depth varies, feed should compensate!
  Shallower cut = less material = CAN GO FASTER
  
  @param axialDepth - Depth of cut
  @param toolDiameter - Tool diameter
  @param fluteLength - Tool flute length
  @param isFinishing - True if finishing operation
  @param isAdaptive - True if adaptive/3D operation
  @returns Object with factor and notes
*/
function calculateAxialDepthFactor(axialDepth, toolDiameter, fluteLength, isFinishing, isAdaptive) {
  var result = {
    factor: 1.0,
    depthRatio: 0,
    suggestion: ""
  };
  
  if (!getProperty("adaptiveDepthFeedAdjust") || axialDepth <= 0 || toolDiameter <= 0) {
    return result;
  }
  
  // Calculate depth as ratio of tool diameter
  result.depthRatio = axialDepth / toolDiameter;
  
  // Get optimal depth for this operation type
  // Adaptive roughing: optimal is typically 1.5-2.5x diameter
  // Finishing: optimal is 0.5-1.0x diameter
  var optimalDepthRatio = isFinishing ? 0.5 : 2.0;
  
  if (isAdaptive) {
    // ADAPTIVE OPERATIONS: Only INCREASE feed for shallow cuts
    // NEVER reduce - Fusion calculated the optimal feed for the programmed DOC
    
    if (result.depthRatio < optimalDepthRatio * 0.5) {
      // Very shallow cut - INCREASE feed significantly
      var shallowRatio = result.depthRatio / optimalDepthRatio;
      result.factor = Math.min(1.0 / Math.sqrt(shallowRatio), getProperty("maxChipThinningMultiplier"));
      result.suggestion = "Shallow DOC - FEED INCREASED +" + Math.round((result.factor - 1) * 100) + "%";
    } else if (result.depthRatio < optimalDepthRatio) {
      // Moderately shallow - slight feed increase
      var shallowRatio = result.depthRatio / optimalDepthRatio;
      result.factor = 1.0 + ((1.0 - shallowRatio) * 0.3); // Up to 30% increase
      result.suggestion = "Light DOC - feed increased +" + Math.round((result.factor - 1) * 100) + "%";
    } else {
      // Normal or deep - use programmed feed (factor = 1.0)
      result.factor = 1.0;
      result.suggestion = "Good DOC for adaptive (" + xyzFormat.format(result.depthRatio) + "xD)";
    }
  } else if (!isFinishing) {
    // NON-ADAPTIVE ROUGHING: Can apply some reductions for safety
    var maxSafeDepthRatio = fluteLength > 0 ? (fluteLength / toolDiameter) * 0.9 : 2.5;
    
    if (result.depthRatio < optimalDepthRatio * 0.5) {
      var shallowRatio = result.depthRatio / optimalDepthRatio;
      result.factor = Math.min(1.0 / Math.sqrt(shallowRatio), getProperty("maxChipThinningMultiplier"));
      result.suggestion = "Shallow DOC - FEED INCREASED +" + Math.round((result.factor - 1) * 100) + "%";
    } else if (result.depthRatio <= maxSafeDepthRatio) {
      result.factor = 1.0;
      result.suggestion = "Good DOC for roughing (" + xyzFormat.format(result.depthRatio) + "xD)";
    } else {
      result.factor = maxSafeDepthRatio / result.depthRatio;
      result.suggestion = "Deep cut exceeds optimal - feed reduced " + Math.round((1 - result.factor) * 100) + "%";
    }
  } else {
    // FINISHING LOGIC
    if (result.depthRatio <= optimalDepthRatio) {
      result.factor = 1.0;
    } else {
      result.factor = optimalDepthRatio / result.depthRatio;
      result.suggestion = "Deep finish cut - feed reduced for quality";
    }
  }
  
  return result;
}

///////////////////////////////////////////////////////////////////////////////
//        DYNAMIC DEPTH FEED ADJUSTMENT FOR 3D ADAPTIVE
//
// This is the KEY to fast adaptive toolpaths!
// During 3D adaptive, the axial depth varies constantly as the tool follows
// the model surface. Shallow cuts = less material = CAN GO FASTER.
//
// How it works:
// 1. Track the stock top Z and total depth range for the operation
// 2. During each cutting move, calculate current depth from actual Z position
// 3. Shallow cuts (Z near stock top) get INCREASED feed
// 4. Full depth cuts maintain programmed feed
//
// This mimics what an experienced machinist does - running faster on light
// cleanup passes and full speed on the initial slotting/profiling.
///////////////////////////////////////////////////////////////////////////////

/** Global variables for dynamic depth tracking */
var dynamicDepthStockTop = 0;
var dynamicDepthStockBottom = 0;
var dynamicDepthRange = 0;
var dynamicDepthProgrammedStepdown = 0;
var dynamicDepthEnabled = false;

/**
  Initialize dynamic depth tracking for current operation.
  Called at start of each section.
  
  @param params - Cutting parameters from getCuttingParameters()
*/
function initializeDynamicDepth(params) {
  dynamicDepthEnabled = getProperty("useDynamicDepthFeed") && 
                        (params.isAdaptive || params.is3D) && 
                        !params.isFinishing;
  
  if (!dynamicDepthEnabled) {
    return;
  }
  
  dynamicDepthStockTop = params.effectiveTopZ;
  dynamicDepthStockBottom = params.effectiveBottomZ;
  dynamicDepthRange = params.totalDepthRange;
  dynamicDepthProgrammedStepdown = params.axialDepth > 0 ? params.axialDepth : (tool.diameter * 2);
  
  if (getProperty("showOptimizationNotes")) {
    writeComment("DYNAMIC DEPTH FEED: Stock Z range " + xyzFormat.format(dynamicDepthStockTop) + 
                 " to " + xyzFormat.format(dynamicDepthStockBottom));
  }
}

/**
  Calculate dynamic feed multiplier based on current Z position.
  
  Principle: Current depth / Programmed stepdown = engagement ratio
  - At full stepdown: ratio = 1.0, feed = programmed
  - At half stepdown: ratio = 0.5, feed = INCREASED
  - At quarter stepdown: ratio = 0.25, feed = SIGNIFICANTLY INCREASED
  
  The feed increase is sqrt-based for chip thinning compensation.
  
  @param currentZ - Current Z position during cutting
  @param baseFeed - Programmed feedrate
  @returns Adjusted feedrate (will be >= baseFeed for adaptive)
*/
function calculateDynamicDepthFeed(currentZ, baseFeed) {
  if (!dynamicDepthEnabled || dynamicDepthRange <= 0) {
    return baseFeed;
  }
  
  // Use adaptive base feed if configured, otherwise use programmed feed
  var effectiveBaseFeed = getProperty("adaptiveBaseFeed") > 0 ? 
                          getProperty("adaptiveBaseFeed") : baseFeed;
  
  // Calculate how deep we are relative to stock top
  var currentDepth = dynamicDepthStockTop - currentZ;
  
  // If we're above stock, no adjustment needed (rapid/position move)
  if (currentDepth <= 0) {
    return effectiveBaseFeed;
  }
  
  // Calculate depth ratio (how much of programmed stepdown we're using)
  var depthRatio = Math.min(currentDepth / dynamicDepthProgrammedStepdown, 1.0);
  
  // At shallow depths, INCREASE feed using inverse sqrt relationship
  // This compensates for chip thinning in Z direction
  // At 25% depth: sqrt(0.25) = 0.5, so inverse = 2.0 (but we cap it)
  // At 50% depth: sqrt(0.5) = 0.71, so inverse = 1.41
  // At 100% depth: sqrt(1.0) = 1.0, so inverse = 1.0 (no change)
  
  var maxIncrease = getProperty("dynamicDepthMaxIncrease") / 100.0;
  var feedMultiplier;
  
  if (depthRatio < 0.1) {
    // Very shallow - apply maximum increase
    feedMultiplier = maxIncrease;
  } else {
    // Standard chip thinning compensation
    feedMultiplier = Math.min(1.0 / Math.sqrt(depthRatio), maxIncrease);
  }
  
  return effectiveBaseFeed * feedMultiplier;
}

/**
  Calculate 3D adaptive stepover feed adjustment.
  
  CRITICAL: For adaptive toolpaths, Fusion has ALREADY calculated the optimal
  feed based on engagement. We should NEVER reduce below the programmed feed!
  
  This function should only INCREASE feed when engagement is lighter than
  optimal, allowing faster cuts on cleanup passes.
  
  @param radialStepover - Radial stepover
  @param axialStepover - Axial stepover (scallop-based)
  @param toolDiameter - Tool diameter
  @param isRoughing - True if roughing operation
  @returns Object with combined factor and notes
*/
function calculate3DAdaptiveFactor(radialStepover, axialStepover, toolDiameter, isRoughing) {
  var result = {
    factor: 1.0,
    radialPercent: 0,
    axialPercent: 0,
    effectiveEngagement: 0,
    suggestion: ""
  };
  
  if (toolDiameter <= 0) {
    return result;
  }
  
  // Only calculate if we have stepover data
  if (radialStepover <= 0 && axialStepover <= 0) {
    result.suggestion = "No stepover data - using programmed feed";
    return result;
  }
  
  result.radialPercent = (radialStepover / toolDiameter) * 100;
  result.axialPercent = (axialStepover / toolDiameter) * 100;
  
  // For adaptive, radial engagement is what matters most
  // If no radial stepover detected, use a reasonable default
  var effectiveRadial = result.radialPercent > 0 ? result.radialPercent : getProperty("roughingOptimalWOC");
  
  // Target engagement for feed increase consideration
  var targetEngagement = isRoughing ? getProperty("roughingOptimalWOC") : getProperty("finishingMaxWOC");
  
  // Only INCREASE feed for light engagement - NEVER decrease!
  // Fusion already calculated the optimal feed for the programmed engagement.
  if (effectiveRadial < targetEngagement * 0.75) {
    // Light engagement - can speed up
    // Use chip thinning formula: Feed_increase = sqrt(Target / Actual)
    var increaseRatio = Math.sqrt(targetEngagement / Math.max(effectiveRadial, 1));
    result.factor = Math.min(increaseRatio, getProperty("maxChipThinningMultiplier"));
    result.suggestion = "Light engagement (" + Math.round(effectiveRadial) + "%) - feed can increase +" + 
                        Math.round((result.factor - 1) * 100) + "%";
  } else {
    // Normal or heavy engagement - use Fusion's programmed feed (factor = 1.0)
    result.factor = 1.0;
    result.suggestion = "Normal engagement (" + Math.round(effectiveRadial) + "%) - using programmed feed";
  }
  
  return result;
}

/**
  Master function to calculate all feed optimization factors.
  Combines stickout, chip thinning, axial depth, and 3D factors.
  
  @param baseFeed - Original programmed feed
  @param params - Cutting parameters from getCuttingParameters()
  @returns Object with final feed and all factors
*/
function calculateOptimizedFeed(baseFeed, params) {
  var result = {
    originalFeed: baseFeed,
    optimizedFeed: baseFeed,
    stickoutFactor: 1.0,
    chipThinningFactor: 1.0,
    axialFactor: 1.0,
    adaptive3DFactor: 1.0,
    combinedFactor: 1.0,
    notes: [],
    speedUpSuggestions: [],
    warnings: []
  };
  
  if (!getProperty("useAdvancedFeedOptimization")) {
    return result;
  }
  
  var toolDia = tool.diameter;
  var toolLen = tool.fluteLength > 0 ? tool.fluteLength : tool.bodyLength;
  var isFinish = params.isFinishing;
  
  // 1. Stickout factor
  var stickout = calculateStickoutFactor(toolDia, toolLen, isFinish);
  result.stickoutFactor = stickout.factor;
  if (stickout.warning) {
    result.warnings.push(stickout.warning);
  }
  if (stickout.suggestion) {
    result.notes.push(stickout.suggestion);
  }
  
  // 2. Chip thinning compensation
  var chipThin = calculateChipThinningFactor(params.radialDepth, toolDia);
  result.chipThinningFactor = chipThin.factor;
  if (chipThin.suggestion) {
    result.notes.push(chipThin.suggestion);
  }
  
  // 3. Axial depth factor - CRITICAL for 3D adaptive (lighter cuts = faster feeds)
  var isAdaptiveOp = params.is3D || params.isAdaptive;
  var axialF = calculateAxialDepthFactor(params.axialDepth, toolDia, tool.fluteLength, isFinish, isAdaptiveOp);
  result.axialFactor = axialF.factor;
  if (axialF.suggestion) {
    result.notes.push(axialF.suggestion);
  }
  
  // 4. 3D Adaptive factor (if applicable)
  if (params.is3D || params.isAdaptive) {
    var adapt3D = calculate3DAdaptiveFactor(params.radialDepth, params.axialDepth, toolDia, params.isRoughing);
    result.adaptive3DFactor = adapt3D.factor;
    if (adapt3D.suggestion) {
      result.notes.push(adapt3D.suggestion);
    }
  }
  
  // Combine all factors
  // For ADAPTIVE operations: Only apply INCREASES - Fusion calculated optimal feed
  // For non-adaptive: Apply reductions as needed for safety
  var reductionFactors = [];
  var increaseFactors = [];
  
  [result.stickoutFactor, result.chipThinningFactor, result.axialFactor, result.adaptive3DFactor].forEach(function(f) {
    if (f < 1.0) {
      reductionFactors.push(f);
    } else if (f > 1.0) {
      increaseFactors.push(f);
    }
  });
  
  // Apply increases (average, capped)
  var increaseAvg = 1.0;
  if (increaseFactors.length > 0) {
    var sum = 0;
    increaseFactors.forEach(function(f) { sum += f; });
    increaseAvg = sum / increaseFactors.length;
    increaseAvg = Math.min(increaseAvg, getProperty("maxChipThinningMultiplier"));
  }
  
  // Apply reductions - BUT NOT FOR ADAPTIVE!
  // For adaptive toolpaths, Fusion has already calculated the optimal feed
  // based on engagement. We should only INCREASE feed, never reduce it.
  var reductionProduct = 1.0;
  if (!params.isAdaptive) {
    // Non-adaptive: apply safety reductions
    reductionFactors.forEach(function(f) { reductionProduct *= f; });
  } else {
    // Adaptive: ignore reductions - Fusion knows best
    if (reductionFactors.length > 0) {
      result.notes.push("Note: Feed reductions disabled for adaptive - using Fusion's calculated feed");
    }
  }
  
  result.combinedFactor = reductionProduct * increaseAvg;
  result.optimizedFeed = baseFeed * result.combinedFactor;
  
  // Generate speed-up suggestions
  if (params.isRoughing) {
    if (chipThin.engagementPercent < 10) {
      result.speedUpSuggestions.push("TO SPEED UP: Increase stepover to " + getProperty("roughingOptimalWOC") + "% for optimal chip load");
    }
    if (stickout.ratio < 3 && axialF.depthRatio < 1.5) {
      result.speedUpSuggestions.push("TO SPEED UP: Increase DOC to " + xyzFormat.format(toolDia * 1.5) + " (1.5xD) - tool can handle it");
    }
    if (result.combinedFactor < 0.8) {
      result.speedUpSuggestions.push("TO SPEED UP: Use shorter tool or reduce DOC to allow faster feeds");
    }
  }
  
  if (params.isFinishing) {
    if (chipThin.engagementPercent > getProperty("finishingMaxWOC")) {
      result.speedUpSuggestions.push("QUALITY TIP: Reduce stepover for better surface finish");
    }
  }
  
  return result;
}

/**
  Output optimization notes at the start of an operation.
*/
function writeOptimizationNotes(params, optimization) {
  if (!getProperty("showOptimizationNotes") || optimizationNotesOutput) {
    return;
  }
  
  optimizationNotesOutput = true;
  
  writeComment("=== FEED OPTIMIZATION ANALYSIS ===");
  writeComment("Operation: " + (params.isRoughing ? "ROUGHING" : "FINISHING") + 
               (params.isAdaptive ? " (ADAPTIVE)" : "") +
               (params.is3D ? " (3D)" : ""));
  
  // Tool info
  writeComment("Tool: D" + xyzFormat.format(tool.diameter) + 
               " FL" + xyzFormat.format(tool.fluteLength > 0 ? tool.fluteLength : tool.bodyLength) +
               " (Stickout ratio: " + xyzFormat.format(optimization.stickoutFactor < 1 ? 
                 tool.bodyLength / tool.diameter : tool.fluteLength / tool.diameter) + ":1)");
  
  // Cutting parameters
  if (params.radialDepth > 0) {
    writeComment("Radial DOC: " + xyzFormat.format(params.radialDepth) + 
                 " (" + Math.round((params.radialDepth / tool.diameter) * 100) + "% of D)");
  }
  if (params.axialDepth > 0) {
    writeComment("Axial DOC: " + xyzFormat.format(params.axialDepth) +
                 " (" + xyzFormat.format(params.axialDepth / tool.diameter) + "xD)");
  }
  
  // Factors applied
  writeComment("Feed factors: Stickout=" + xyzFormat.format(optimization.stickoutFactor) +
               " ChipThin=" + xyzFormat.format(optimization.chipThinningFactor) +
               " Axial=" + xyzFormat.format(optimization.axialFactor));
  if (params.is3D || params.isAdaptive) {
    writeComment("3D/Adaptive factor: " + xyzFormat.format(optimization.adaptive3DFactor));
  }
  writeComment("Combined multiplier: " + xyzFormat.format(optimization.combinedFactor));
  
  // Warnings
  optimization.warnings.forEach(function(w) {
    writeComment("*** " + w + " ***");
  });
  
  // Notes
  optimization.notes.forEach(function(n) {
    writeComment(n);
  });
  
  // Speed-up suggestions
  if (optimization.speedUpSuggestions.length > 0) {
    writeComment("--- OPTIMIZATION SUGGESTIONS ---");
    optimization.speedUpSuggestions.forEach(function(s) {
      writeComment(s);
    });
  }
  
  writeComment("=================================");
}

/** Cached cutting parameters and optimization for current section */
var cachedCuttingParams = null;
var cachedOptimization = null;
var currentCuttingZ = 0; // Track current Z for dynamic depth feed calculation

function getFeed(f) {
  // Get or cache cutting parameters for this section
  if (cachedCuttingParams == null && getProperty("useAdvancedFeedOptimization")) {
    cachedCuttingParams = getCuttingParameters();
    cachedOptimization = calculateOptimizedFeed(f, cachedCuttingParams);
  }

  // DYNAMIC DEPTH FEED ADJUSTMENT - KEY FOR FAST ADAPTIVE!
  // This INCREASES feed when cutting shallow and maintains feed at full depth
  if (getProperty("useDynamicDepthFeed") && dynamicDepthEnabled) {
    f = calculateDynamicDepthFeed(currentCuttingZ, f);
  }

  // Apply advanced feed optimization based on cutting parameters
  if (getProperty("useAdvancedFeedOptimization") && cachedOptimization != null) {
    f = f * cachedOptimization.combinedFactor;
  }

  // Apply feedrate multiplier based on current movement type
  f = applyFeedMultiplier(f, movement);

  // Apply Prism Enhanced feed adjustments (arc correction, direction changes, ramping)
  if (getProperty("usePrismEnhancedFeed")) {
    f = applyPrismEnhancedFeed(f, prismEnhancedIsArc, prismEnhancedArcRadius,
                            prismCurrentPos, prismMoveDistance);
  }

  // Apply min/max limits
  f = applyFeedLimits(f);

  // PRISM FIX: Smart feed rounding — tapping/threading keeps decimals, everything else rounds
  var isTappingOrThreading = (movement == MOVEMENT_DRILLING || movement == MOVEMENT_LEAD_IN) &&
      (hasParameter("operation:cycleType") &&
       (getParameter("operation:cycleType") == "tapping" ||
        getParameter("operation:cycleType") == "right-tapping" ||
        getParameter("operation:cycleType") == "left-tapping" ||
        getParameter("operation:cycleType") == "tapping-with-chip-breaking" ||
        getParameter("operation:cycleType") == "thread-milling"));

  var usePreciseFeed = isTappingOrThreading || (f > 0 && f < 1); // sub-1 IPM feeds need decimals

  if (!usePreciseFeed) {
    // Round to nearest whole number for milling/drilling feeds
    f = Math.round(f);
  }

  // Track movement type for comments
  var newMovementType = getMovementDescription(movement);
  var feedChanged = (currentMovementType != newMovementType);
  currentMovementType = newMovementType;

  // Output feedrate comment if enabled and movement type changed
  if (getProperty("showFeedComments") && feedChanged) {
    var extraInfo = "";
    if (getProperty("usePrismEnhancedFeed") && prismEnhancedIsArc && prismEnhancedArcRadius > 0) {
      extraInfo = " R" + xyzFormat.format(prismEnhancedArcRadius);
    }
    if (getProperty("useDynamicDepthFeed") && dynamicDepthEnabled) {
      extraInfo += " Z" + xyzFormat.format(currentCuttingZ);
    }
    var commentFmt = usePreciseFeed ? feedFormatPrecise : feedFormat;
    writeComment("FEED: " + newMovementType + " F" + commentFmt.format(f) + extraInfo);
  }

  // Select the correct output variable (feedOutput rounds to whole, feedOutputPrecise keeps decimals)
  var activeFeedOutput = usePreciseFeed ? feedOutputPrecise : feedOutput;

  // Force feedrate output on every line for dynamic/adaptive feeds
  if (getProperty("forceFeedOutput") || getProperty("usePrismEnhancedFeed") ||
      (getProperty("useDynamicDepthFeed") && dynamicDepthEnabled)) {
    activeFeedOutput.reset();
    return activeFeedOutput.format(f);
  }

  // Normal modal feedrate handling
  if (activeMovements) {
    var feedContext = activeMovements[movement];
    if (feedContext != undefined) {
      var contextFeed = usePreciseFeed ? feedContext.feed : Math.round(feedContext.feed);
      var activeFeedFormat = usePreciseFeed ? feedFormatPrecise : feedFormat;
      if (!activeFeedFormat.areDifferent(contextFeed, f)) {
        if (feedContext.id == currentFeedId) {
          return ""; // feed unchanged at output precision
        }
        forceFeed();
        currentFeedId = feedContext.id;
        return "F#" + (firstFeedParameter + feedContext.id);
      }
    }
    currentFeedId = undefined; // force Q feed next time
  }
  return activeFeedOutput.format(f);
}

function initializeActiveFeeds() {
  activeMovements = new Array();
  var movements = currentSection.getMovements();

  var id = 0;
  var activeFeeds = new Array();
  if (hasParameter("operation:tool_feedCutting")) {
    if (movements & ((1 << MOVEMENT_CUTTING) | (1 << MOVEMENT_LINK_TRANSITION) | (1 << MOVEMENT_EXTENDED))) {
      var feedContext = new FeedContext(id, localize("Cutting"), getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_CUTTING] = feedContext;
      activeMovements[MOVEMENT_LINK_TRANSITION] = feedContext;
      activeMovements[MOVEMENT_EXTENDED] = feedContext;
    }
    ++id;
    if (movements & (1 << MOVEMENT_PREDRILL)) {
      feedContext = new FeedContext(id, localize("Predrilling"), getParameter("operation:tool_feedCutting"));
      activeMovements[MOVEMENT_PREDRILL] = feedContext;
      activeFeeds.push(feedContext);
    }
    ++id;
  }

  if (hasParameter("operation:finishFeedrate")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), getParameter("operation:finishFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting")) {
    if (movements & (1 << MOVEMENT_FINISH_CUTTING)) {
      var feedContext = new FeedContext(id, localize("Finish"), getParameter("operation:tool_feedCutting"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_FINISH_CUTTING] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedEntry")) {
    if (movements & (1 << MOVEMENT_LEAD_IN)) {
      var feedContext = new FeedContext(id, localize("Entry"), getParameter("operation:tool_feedEntry"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_IN] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LEAD_OUT)) {
      var feedContext = new FeedContext(id, localize("Exit"), getParameter("operation:tool_feedExit"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LEAD_OUT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:noEngagementFeedrate")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), getParameter("operation:noEngagementFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  } else if (hasParameter("operation:tool_feedCutting") &&
             hasParameter("operation:tool_feedEntry") &&
             hasParameter("operation:tool_feedExit")) {
    if (movements & (1 << MOVEMENT_LINK_DIRECT)) {
      var feedContext = new FeedContext(id, localize("Direct"), Math.max(getParameter("operation:tool_feedCutting"), getParameter("operation:tool_feedEntry"), getParameter("operation:tool_feedExit")));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_LINK_DIRECT] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:reducedFeedrate")) {
    if (movements & (1 << MOVEMENT_REDUCED)) {
      var feedContext = new FeedContext(id, localize("Reduced"), getParameter("operation:reducedFeedrate"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_REDUCED] = feedContext;
    }
    ++id;
  }

  if (hasParameter("operation:tool_feedRamp")) {
    if (movements & ((1 << MOVEMENT_RAMP) | (1 << MOVEMENT_RAMP_HELIX) | (1 << MOVEMENT_RAMP_PROFILE) | (1 << MOVEMENT_RAMP_ZIG_ZAG))) {
      var feedContext = new FeedContext(id, localize("Ramping"), getParameter("operation:tool_feedRamp"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_RAMP] = feedContext;
      activeMovements[MOVEMENT_RAMP_HELIX] = feedContext;
      activeMovements[MOVEMENT_RAMP_PROFILE] = feedContext;
      activeMovements[MOVEMENT_RAMP_ZIG_ZAG] = feedContext;
    }
    ++id;
  }
  if (hasParameter("operation:tool_feedPlunge")) {
    if (movements & (1 << MOVEMENT_PLUNGE)) {
      var feedContext = new FeedContext(id, localize("Plunge"), getParameter("operation:tool_feedPlunge"));
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_PLUNGE] = feedContext;
    }
    ++id;
  }
  if (true) { // high feed
    if ((movements & (1 << MOVEMENT_HIGH_FEED)) || (highFeedMapping != HIGH_FEED_NO_MAPPING)) {
      var feed;
      if (hasParameter("operation:highFeedrateMode") && getParameter("operation:highFeedrateMode") != "disabled") {
        feed = getParameter("operation:highFeedrate");
      } else {
        feed = this.highFeedrate;
      }
      var feedContext = new FeedContext(id, localize("High Feed"), feed);
      activeFeeds.push(feedContext);
      activeMovements[MOVEMENT_HIGH_FEED] = feedContext;
      activeMovements[MOVEMENT_RAPID] = feedContext;
    }
    ++id;
  }

  for (var i = 0; i < activeFeeds.length; ++i) {
    var feedContext = activeFeeds[i];
    writeBlock("#" + (firstFeedParameter + feedContext.id) + "=" + feedFormat.format(feedContext.feed), formatComment(feedContext.description));
  }
}

var currentWorkPlaneABC = undefined;
var currentWorkPlaneUVW = undefined; // right vector from workplane matrix

function forceWorkPlane() {
  currentWorkPlaneABC = undefined;
  currentWorkPlaneUVW = undefined;
}

function cancelWorkPlane(force) {
  if (force) {
    gRotationModal.reset();
  }
  writeBlock(gRotationModal.format(69)); // cancel frame
  forceWorkPlane();
}

function setWorkPlane(abc) {
  if (!forceMultiAxisIndexing && is3D() && !machineConfiguration.isMultiAxisConfiguration()) {
    return; // ignore
  }
  if (forceMultiAxisIndexing) {
    forceWorkPlane();
  }

  var W = currentSection.workPlane;
  if (machineConfiguration.isMultiAxisConfiguration()) {
    if (!((currentWorkPlaneABC == undefined) ||
        abcFormat.areDifferent(abc.x, currentWorkPlaneABC.x) ||
        abcFormat.areDifferent(abc.y, currentWorkPlaneABC.y) ||
        abcFormat.areDifferent(abc.z, currentWorkPlaneABC.z))) {
      return; // ignore, no change
    }
  } else {
    if (!((currentWorkPlaneABC == undefined || currentWorkPlaneUVW == undefined) ||
        ijkFormat.areDifferent(W.up.x, currentWorkPlaneABC.x) ||
        ijkFormat.areDifferent(W.up.y, currentWorkPlaneABC.y) ||
        ijkFormat.areDifferent(W.up.z, currentWorkPlaneABC.z) ||
        ijkFormat.areDifferent(W.right.x, currentWorkPlaneUVW.x) ||
        ijkFormat.areDifferent(W.right.y, currentWorkPlaneUVW.y) ||
        ijkFormat.areDifferent(W.right.z, currentWorkPlaneUVW.z))) {
      return; // ignore, no change
    }
  }

  onCommand(COMMAND_UNLOCK_MULTI_AXIS);

  if (useMultiAxisFeatures) {
    if (true) { // we don't want to use G69 for reset alone
      writeBlock(gFormat.format(0), mFormat.format(140)); // retract along tool vector
      cancelWorkPlane(true); // cancel frame
      gMotionModal.reset();
      var initialPosition = getFramePosition(currentSection.getInitialPosition()); // TAG
      if (useVectorOutput) {
        writeBlock(
          gFormat.format(68.2),
          "X" + xyzFormat.format(currentSection.workOrigin.x),
          "Y" + xyzFormat.format(currentSection.workOrigin.y),
          "Z" + xyzFormat.format(currentSection.workOrigin.z),
          "I" + ijkFormat.format(W.right.x), "J" + ijkFormat.format(W.right.y), "K" + ijkFormat.format(W.right.z),
          "U" + ijkFormat.format(W.up.x), "V" + ijkFormat.format(W.up.y), "W" + ijkFormat.format(W.up.z)
        ); // set frame
        var d = currentSection.getInitialToolAxis();
        writeBlock(
          gMotionModal.format(0), gFormat.format(8.2),
          xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
          "I" + ijkFormat.format(d.x), "J" + ijkFormat.format(d.y), "K" + ijkFormat.format(d.z)
        );
      } else {
        var workPlaneCode = 68.2;
        if (machineConfiguration.getNumberOfAxes() == 5 &&
            machineConfiguration.getAxisU().getCoordinate() > machineConfiguration.getAxisV().getCoordinate()) {
          workPlaneCode = 68.3;
        }
        setCurrentABC(abc); // required for machine simulation
        writeBlock(
          gFormat.format(workPlaneCode),
          "X" + xyzFormat.format(currentSection.workOrigin.x),
          "Y" + xyzFormat.format(currentSection.workOrigin.y),
          "Z" + xyzFormat.format(currentSection.workOrigin.z),
          conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc.z))
        ); // set frame
        writeBlock(
          gMotionModal.format(0), gFormat.format(8.2),
          xOutput.format(initialPosition.x),
          yOutput.format(initialPosition.y),
          zOutput.format(initialPosition.z),
          conditional(machineConfiguration.isMachineCoordinate(0), "A" + abcFormat.format(abc.x)),
          conditional(machineConfiguration.isMachineCoordinate(1), "B" + abcFormat.format(abc.y)),
          conditional(machineConfiguration.isMachineCoordinate(2), "C" + abcFormat.format(abc.z))
        );
      }
      // writeBlock(mFormat.format(141));
    } else {
      cancelWorkPlane(); // cancel frame
    }
  } else {
    gMotionModal.reset();
    positionABC(abc, true);
  }

  onCommand(COMMAND_LOCK_MULTI_AXIS);

  if (machineConfiguration.isMultiAxisConfiguration()) {
    currentWorkPlaneABC = abc;
  } else {
    currentWorkPlaneABC = W.up;
    currentWorkPlaneUVW = W.right;
  }
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
        writeRetract(Z);
      }
    }
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);
    gMotionModal.reset();
    writeBlock(gMotionModal.format(0), a, b, c);
    currentMachineABC = new Vector(abc);
    if (getCurrentSectionId() != -1) {
      setCurrentABC(abc); // required for machine simulation
    }
  }
}

var closestABC = false; // choose closest machine angles
var currentMachineABC;

function getWorkPlaneMachineABC(workPlane) {
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

  var tcp = false;
  cancelTransformation();
  if (tcp) {
    setRotation(W); // TCP mode
  } else {
    var O = machineConfiguration.getOrientation(abc);
    var R = machineConfiguration.getRemainingOrientation(abc, W);
    var rotate = true;
    var axis = machineConfiguration.getAxisV();
    if (axis.isEnabled() && axis.isTable()) {
      var ix = axis.getCoordinate();
      var rotAxis = axis.getAxis();
      if (isSameDirection(machineConfiguration.getDirection(abc), rotAxis) ||
          isSameDirection(machineConfiguration.getDirection(abc), Vector.product(rotAxis, -1))) {
        var direction = isSameDirection(machineConfiguration.getDirection(abc), rotAxis) ? 1 : -1;
        abc.setCoordinate(ix, Math.atan2(R.right.y, R.right.x) * direction);
        rotate = false;
      }
    }
    if (rotate) {
      setRotation(R);
    }
  }

  return abc;
}


/**
 * Output PRISM optimization header for current section
 * Shows active optimizations and recommendations
 */
// ═══ PRISM SERVER PHYSICS INTEGRATION ═══
// PRISM physics data arrives via operation:comment JSON, NOT via HTTP.
// Fusion 360 CPS runtime is sandboxed — HTTPClient does NOT exist.
// The PRISM Add-in modifies S/F directly via adsk.cam API before post.
// Extra data is embedded in operation:comment as:
//   {prism:{force, power, confidence, tool_life_min, stable_rpm_min, stable_rpm_max}}

var prismCachedSF = {}; // operationId → {rpm, feed, confidence, force_N, power_kW}

function getPrismOptimizedSF(operationId) {
  if (prismCachedSF[operationId]) return prismCachedSF[operationId];

  // Try to read PRISM data from operation comment JSON
  try {
    var comment = getParameter("operation:comment");
    if (comment) {
      var jsonStart = comment.indexOf("{prism:");
      if (jsonStart === -1) jsonStart = comment.indexOf('{"prism":');
      if (jsonStart >= 0) {
        var jsonStr = comment.substring(jsonStart);
        var data = JSON.parse(jsonStr);
        if (data && data.prism) {
          var p = data.prism;
          var sf = {
            rpm: p.stable_rpm_min ? Math.round((p.stable_rpm_min + p.stable_rpm_max) / 2) : 0,
            feed: 0, // feed set by add-in via adsk.cam API
            confidence: p.confidence || 0,
            force_N: p.force || 0,
            power_kW: p.power || 0,
            tool_life_min: p.tool_life_min || 0
          };
          prismCachedSF[operationId] = sf;
          return sf;
        }
      }
    }
  } catch (e) {
    // No PRISM data in comment — use standard S/F from CAM
  }
  return null;
}

function getMaterialName() {
  if (hasGlobalParameter("material")) return getGlobalParameter("material");
  if (hasGlobalParameter("material-name")) return getGlobalParameter("material-name");
  return "Steel";
}

function writePrismOptimizationHeader(section) {
    if (getProperty("showOptimizationNotes")) {
        writeComment("==============================================");
        writeComment("PRISM ENHANCED ROUGHING TECHNOLOGY");
        writeComment("==============================================");
        
        var params = getCuttingParameters();
        
        // Show active features
        var activeFeatures = [];
        if (getProperty("usePrismEnhancedFeed")) activeFeatures.push("Variable Feed");
        if (getProperty("useChipThinningCompensation")) activeFeatures.push("Chip Thinning");
        if (getProperty("useDynamicDepthFeed")) activeFeatures.push("Dynamic Depth");
        if (getProperty("useAdvancedFeedOptimization")) activeFeatures.push("Advanced Opt");
        
        if (activeFeatures.length > 0) {
            writeComment("ACTIVE: " + activeFeatures.join(", "));
        }
        
        // Show operation type
        var opType = params.isAdaptive ? "3D ADAPTIVE" : 
                     params.isRoughing ? "ROUGHING" : "FINISHING";
        writeComment("OPERATION: " + opType);
        
        // Show aggressiveness level
        if (getProperty("usePrismEnhancedFeed")) {
            var level = getProperty("prismAggressivenessLevel");
            var levelDesc = level <= 2 ? "CONSERVATIVE" : 
                           level <= 4 ? "MODERATE" :
                           level <= 6 ? "AGGRESSIVE" : "MAXIMUM MRR";
            writeComment("AGGRESSIVENESS: Level " + level + " (" + levelDesc + ")");
        }
        
        writeComment("==============================================");
    }
}


function onSection() {
  // Output PRISM optimization header
  if (isFirstSection()) {
    writePrismOptimizationHeader(currentSection);
  }

  // Reset cached parameters for new section
  cachedCuttingParams = null;
  cachedOptimization = null;
  optimizationNotesOutput = false;
  
  // Reset prism state for new section
  previousPosition = null;
  previousDirection = null;
  previousFeed = 0;
  
  // Initialize dynamic depth tracking for this section
  // This enables feed INCREASE when cutting shallow on adaptive toolpaths
  if (getProperty("useDynamicDepthFeed")) {
    var tempParams = getCuttingParameters();
    initializeDynamicDepth(tempParams);
  }
  
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange && currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  retracted = false; // specifies that the tool has been retracted to the safe plane
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

    // stop spindle before retract during tool change
    if (insertToolCall && !isFirstSection()) {
      onCommand(COMMAND_STOP_SPINDLE);
    }

    // Determine retract method
    // Use minimum retract when: changing work offset, NOT changing tools, and feature is enabled
    var useMinRetract = getProperty("useMinimumZRetract") && 
                        newWorkOffset && 
                        !insertToolCall && 
                        !isFirstSection();
    
    if (useMinRetract) {
      // Minimum retract - only go to clearance above stock
      writeMinimumRetract();
    } else {
      // Full retract to safe plane (G28 or configured method)
      writeRetract(Z);
    }
    forceXYZ();

    // Head axes need to return to 0 for tool change
    if (insertToolCall && !isFirstSection() && machineConfiguration.isHeadConfiguration()) {
      var resetAxes = getCurrentDirection();
      var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
      for (var i = 0; i < axes.length; ++i) {
        if (axes[i].isEnabled() && axes[i].isHead()) {
          resetAxes.setCoordinate(axes[i].getCoordinate(), 0);
        }
      }
      positionABC(resetAxes, false);
    }

    // save tool change position
    if (insertToolCall && !isFirstSection()) {
      if (getProperty("toolChangePositionX") || getProperty("toolChangePositionY")) {
        writeBlock(gFormat.format(53), conditional(getProperty("toolChangePositionX"), "X" + xyzFormat.format(0)), conditional(getProperty("toolChangePositionY"), "Y" + xyzFormat.format(0)));
      }
    }
  }

  if (hasParameter("operation-comment")) {
    var comment = getParameter("operation-comment");
    if (comment) {
      writeComment(comment);
    }
  }

  // Show estimated cycle time for the operation
  if (getProperty("showEstimatedTime")) {
    var cycleTime = currentSection.getCycleTime();
    if (cycleTime > 0) {
      var minutes = Math.floor(cycleTime / 60);
      var seconds = Math.round(cycleTime % 60);
      writeComment("EST. TIME: " + minutes + " MIN " + seconds + " SEC");
    }
  }
  
  // Show operation strategy if available
  if (getProperty("showOperationStrategy")) {
    if (hasParameter("operation-strategy")) {
      var strategy = getParameter("operation-strategy").toUpperCase();
      writeComment("STRATEGY: " + strategy);
    }
  }

  if (getProperty("showNotes") && hasParameter("notes")) {
    var notes = getParameter("notes");
    if (notes) {
      var lines = String(notes).split("\n");
      var r1 = new RegExp("^[\\s]+", "g");
      var r2 = new RegExp("[\\s]+$", "g");
      for (line in lines) {
        var comment = lines[line].replace(r1, "").replace(r2, "");
        if (comment) {
          writeComment(comment);
        }
      }
    }
  }

  // Output advanced feed optimization analysis
  if (getProperty("useAdvancedFeedOptimization") && getProperty("showOptimizationNotes")) {
    var cuttingParams = getCuttingParameters();
    // Use a representative feed for analysis (cutting feed)
    var baseFeed = hasParameter("operation:tool_feedCutting") ? getParameter("operation:tool_feedCutting") : 0;
    if (baseFeed > 0) {
      var optimization = calculateOptimizedFeed(baseFeed, cuttingParams);
      writeOptimizationNotes(cuttingParams, optimization);
      // Cache for use in getFeed
      cachedCuttingParams = cuttingParams;
      cachedOptimization = optimization;
    }
  }

  if (insertToolCall) {
    forceWorkPlane();

    if (!isFirstSection()) {
      setCoolant(COOLANT_OFF);
      if (getProperty("optionalStop")) {
        onCommand(COMMAND_OPTIONAL_STOP);
      }
    }

    if (tool.number > 99) {
      warning(localize("Tool number exceeds maximum value."));
    }

    writeToolBlock("T" + toolFormat.format(tool.number), mFormat.format(6));
    if (tool.comment) {
      writeComment(tool.comment);
    }
    
    // Output smoothing code G05.3 P## IMMEDIATELY after tool change
    // This ensures it's clearly associated with the tool just loaded (on M6 line above)
    // Automatically selects P value based on stock to leave for THIS operation
    if (getProperty("useSmoothing")) {
      var stockToLeave = 0;
      if (hasParameter("operation:stockToLeave")) {
        stockToLeave = getParameter("operation:stockToLeave");
      }
      var verticalStockToLeave = 0;
      if (hasParameter("operation:verticalStockToLeave")) {
        verticalStockToLeave = getParameter("operation:verticalStockToLeave");
      }
      var radialStockToLeave = 0;
      if (hasParameter("operation:radialStockToLeave")) {
        radialStockToLeave = getParameter("operation:radialStockToLeave");
      }
      var axialStockToLeave = 0;
      if (hasParameter("operation:axialStockToLeave")) {
        axialStockToLeave = getParameter("operation:axialStockToLeave");
      }
      
      // Get max stock to leave value
      var maxStock = Math.max(stockToLeave, verticalStockToLeave, radialStockToLeave, axialStockToLeave);
      
      // Check if this is an adaptive operation - always use roughing smoothing
      var isAdaptiveOperation = false;
      if (hasParameter("operation-strategy")) {
        var strategy = getParameter("operation-strategy").toLowerCase();
        isAdaptiveOperation = strategy.indexOf("adaptive") >= 0;
      }
      
      // Thresholds for semi-finish detection (in mm)
      var roughingThreshold = unit == MM ? 0.5 : 0.02;  // Above this = roughing
      var semiFinishThreshold = unit == MM ? 0.1 : 0.004;  // Above this = semi-finish
      
      var smoothingValue;
      var smoothingType;
      
      // ADAPTIVE operations ALWAYS get roughing smoothing (speed over quality)
      if (isAdaptiveOperation || maxStock >= roughingThreshold) {
        smoothingValue = getProperty("smoothingRoughValue");
        smoothingType = isAdaptiveOperation ? "ADAPTIVE ROUGH" : "ROUGH";
      } else if (maxStock >= semiFinishThreshold) {
        smoothingValue = getProperty("smoothingSemiFinishValue");
        smoothingType = "SEMI-FINISH";
      } else {
        smoothingValue = getProperty("smoothingFinishValue");
        smoothingType = "FINISH";
      }
      writeBlock("G05.3", "P" + smoothingValue, formatComment("T" + tool.number + " " + smoothingType + " SMOOTHING"));
    }
    
    var showToolZMin = false;
    if (showToolZMin) {
      if (is3D()) {
        var numberOfSections = getNumberOfSections();
        var zRange = currentSection.getGlobalZRange();
        var number = tool.number;
        for (var i = currentSection.getId() + 1; i < numberOfSections; ++i) {
          var section = getSection(i);
          if (section.getTool().number != number) {
            break;
          }
          zRange.expandToRange(section.getGlobalZRange());
        }
        writeComment(localize("ZMIN") + "=" + zRange.getMinimum());
      }
    }

    if (getProperty("preloadTool")) {
      var nextTool = getNextTool(tool.number);
      if (nextTool) {
        writeBlock("T" + toolFormat.format(nextTool.number));
      } else {
        // preload first tool
        var section = getSection(0);
        var firstToolNumber = section.getTool().number;
        if (tool.number != firstToolNumber) {
          writeBlock("T" + toolFormat.format(firstToolNumber));
        }
      }
    }
    if (tool.type == TOOL_PROBE) {
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(19)); // spindle orientation
        writeBlock(mFormat.format(26)); // select the part probe, M27 is selecting the tool probe
        writeBlock(mFormat.format(41)); // Single touch probing, M42 is 2 touch probing
      } else {
        error(localize("Probing or surface inspection is only allowed in ISNC mode!"));
      }
    }
  }

  // PRISM: Get physics-optimized S/F from operation:comment JSON
  var prismSF = null;
  if (getProperty("usePrismServer") && tool.type != TOOL_PROBE) {
    prismSF = getPrismOptimizedSF(currentSection.getId());
    if (prismSF) {
      if (prismSF.rpm > 0) spindleSpeed = prismSF.rpm;
      writeComment("PRISM PHYSICS: S" + prismSF.rpm + " (Fc=" + Math.round(prismSF.force_N) + "N P=" +
                   prismSF.power_kW.toFixed(1) + "kW conf=" + Math.round(prismSF.confidence * 100) + "%)");
    }
  }

  var spindleChanged = tool.type != TOOL_PROBE &&
    (insertToolCall || forceSpindleSpeed || isFirstSection() ||
    (rpmFormat.areDifferent(spindleSpeed, sOutput.getCurrent())) ||
    (tool.clockwise != getPreviousSection().getTool().clockwise));
  if (spindleChanged) {
    forceSpindleSpeed = false;

    if (spindleSpeed < 1) {
      error(localize("Spindle speed out of range."));
      return;
    }
    if (spindleSpeed > 65535) {
      warning(localize("Spindle speed exceeds maximum value."));
    }
    writeBlock(
      sOutput.format(spindleSpeed), mFormat.format(tool.clockwise ? 3 : 4)
    );
  }

  // wcs
  if (insertToolCall) { // force work offset when changing tool
    currentWorkOffset = undefined;
  }

  if (currentSection.workOffset != currentWorkOffset) {
    writeBlock(currentSection.wcs);
    currentWorkOffset = currentSection.workOffset;
  }

  forceXYZ();

  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) { // use 5-axis indexing for multi-axis mode
    // set working plane after datum shift

    if (currentSection.isMultiAxis()) {
      forceWorkPlane();
      cancelTransformation();
    } else {
      var abc = new Vector(0, 0, 0);
      if (useVectorOutput) {
        // writeln("VECTOR")
        abc = currentSection.getGlobalInitialToolAxis(); // using vectors
      } else {
        // writeln("MACHINE ANGLES")
        abc = getWorkPlaneMachineABC(currentSection.workPlane);
      }
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
  if (currentSection) {
    operationSupportsTCP = (currentSection.isMultiAxis() || !useMultiAxisFeatures) && currentSection.getOptimizedTCPMode() == OPTIMIZE_NONE;
  }
  setProbeAngle(); // output probe angle rotations if required
  // set coolant after we have positioned at Z
  setCoolant(tool.coolant);

  forceAny();
  var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
  var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(highFeedrate) : "";
  if (currentSection.isMultiAxis()) {
    onCommand(COMMAND_UNLOCK_MULTI_AXIS);

    writeBlock(gFormat.format(69));
    writeBlock(mFormat.format(128)); // only after we are at initial position

    // turn
    var abc;
    var d = currentSection.getGlobalInitialToolAxis();
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    if (currentSection.isOptimizedForMachine()) {
      abc = currentSection.getInitialToolAxisABC();
      writeBlock(
        gMotionModal.format(G), gFormat.format(8.2),
        xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
        aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), F
      );
    } else {
      gMotionModal.reset();
      writeBlock(
        gMotionModal.format(G), gFormat.format(8.2),
        xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), zOutput.format(initialPosition.z),
        "I" + ijkFormat.format(d.x), "J" + ijkFormat.format(d.y), "K" + ijkFormat.format(d.z), F
      );
    }
    writeBlock(gFormat.format(43.4));
    writeBlock(mFormat.format(200), "P" + (getProperty("preferredTilt") ? 1 : 2)); // prefer positive/negative tilt
  } else {
    var initialPosition = getFramePosition(currentSection.getInitialPosition());
    if (!retracted && !insertToolCall) {
      if (getCurrentPosition().z < initialPosition.z) {
        writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
      }
    }

    if (insertToolCall || retracted) {
      var lengthOffset = tool.lengthOffset;
      if (lengthOffset > 200) {
        warning(localize("The length offset exceeds the maximum value."));
      }

      gMotionModal.reset();
      writeBlock(gPlaneModal.format(17));

      if (!machineConfiguration.isHeadConfiguration()) {
        writeBlock(
          gAbsIncModal.format(90),
          gMotionModal.format(G), xOutput.format(initialPosition.x), yOutput.format(initialPosition.y), F
        );
        if (!useMultiAxisFeatures || currentSection.isZOriented()) {
          writeBlock(gMotionModal.format(0), gFormat.format(43), zOutput.format(initialPosition.z), hFormat.format(lengthOffset));
        } else {
          writeBlock(gMotionModal.format(0), zOutput.format(initialPosition.z));
        }
      } else {
        if (!useMultiAxisFeatures || currentSection.isZOriented()) {
          writeBlock(
            gAbsIncModal.format(90),
            gMotionModal.format(G),
            gFormat.format(43), xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z), F, hFormat.format(lengthOffset)
          );
        } else {
          writeBlock(
            gAbsIncModal.format(90),
            gMotionModal.format(G),
            xOutput.format(initialPosition.x),
            yOutput.format(initialPosition.y),
            zOutput.format(initialPosition.z),
            F
          );
        }
      }
    } else {
      writeBlock(
        gAbsIncModal.format(90),
        gMotionModal.format(G),
        xOutput.format(initialPosition.x),
        yOutput.format(initialPosition.y),
        F
      );
    }
  }

  if (getProperty("useParametricFeed") &&
      hasParameter("operation-strategy") &&
      (getParameter("operation-strategy") != "drill") && // legacy
      !(currentSection.hasAnyCycle && currentSection.hasAnyCycle())) {
    if (!insertToolCall &&
        activeMovements &&
        (getCurrentSectionId() > 0) &&
        ((getPreviousSection().getPatternId() == currentSection.getPatternId()) && (currentSection.getPatternId() != 0))) {
      // use the current feeds
    } else {
      initializeActiveFeeds();
    }
  } else {
    activeMovements = undefined;
  }

  if (isProbeOperation()) {
    validate(probeVariables.probeAngleMethod != "G68", "You cannot probe while G68 Rotation is in effect.");
    validate(probeVariables.probeAngleMethod != "G54.4", "You cannot probe while workpiece setting error compensation G54.4 is enabled.");
    // writeBlock(gFormat.format(65), "P" + 9832); // spin the probe on //Probe doesn't need to be activate or de activated, as the controller is doing it automatically at toolchange.
    inspectionCreateResultsFileHeader();
  }

  // surface Inspection
  if (isInspectionOperation() && (typeof inspectionProcessSectionStart == "function")) {
    inspectionProcessSectionStart();
  }
/*
  if (getProperty("smoothingTolerance") > 0) {
    writeBlock(gFormat.format(5.2), "P1", "Q" + xyzFormat.format(getProperty("smoothingTolerance")));
  }
*/
}

function onDwell(seconds) {
  if (seconds > 9999.999) {
    warning(localize("Dwelling time is out of range."));
  }
  seconds = clamp(0.001, seconds, 9999.999);
  writeBlock(gFormat.format(4), "P" + secFormat.format(seconds));
}

function onSpindleSpeed(spindleSpeed) {
  writeBlock(sOutput.format(spindleSpeed));
}

function onCycle() {
  writeBlock(gPlaneModal.format(17));
}

function getCommonCycle(x, y, z, r) {
  forceXYZ();
  if (getProperty("isnc")) {
    return [xOutput.format(x), yOutput.format(y),
      zOutput.format(z),
      "R" + xyzFormat.format(r)];
  } else {
    return [xOutput.format(x), yOutput.format(y),
      "Z" + xyzFormat.format(z),
      "R" + xyzFormat.format(r)];
  }
}

/** Convert approach to sign. */
function approach(value) {
  validate((value == "positive") || (value == "negative"), "Invalid approach.");
  return (value == "positive") ? 1 : -1;
}

function setProbeAngleMethod() {
  probeVariables.probeAngleMethod = (machineConfiguration.getNumberOfAxes() < 5 || is3D()) ? (getProperty("useG54x4") ? "G54.4" : "G68") : "UNSUPPORTED";
  var axes = [machineConfiguration.getAxisU(), machineConfiguration.getAxisV(), machineConfiguration.getAxisW()];
  for (var i = 0; i < axes.length; ++i) {
    if (axes[i].isEnabled() && isSameDirection((axes[i].getAxis()).getAbsolute(), new Vector(0, 0, 1)) && axes[i].isTable()) {
      probeVariables.probeAngleMethod = "AXIS_ROT";
      break;
    }
  }
  probeVariables.outputRotationCodes = true;
}

/** Output rotation offset based on angular probing cycle. */
function setProbeAngle() {
  if (probeVariables.outputRotationCodes) {
    var probeOutputWorkOffset = currentSection.probeWorkOffset;
    validate(probeOutputWorkOffset <= 6, "Angular Probing only supports work offsets 1-6.");
    if (probeVariables.probeAngleMethod == "G68" && (Vector.diff(currentSection.getGlobalInitialToolAxis(), new Vector(0, 0, 1)).length > 1e-4)) {
      error(localize("You cannot use multi axis toolpaths while G68 Rotation is in effect."));
    }
    var validateWorkOffset = false;
    switch (probeVariables.probeAngleMethod) {
    case "G54.4":
      var param = 26000 + (probeOutputWorkOffset * 10);
      writeBlock("#" + param + "=#135");
      writeBlock("#" + (param + 1) + "=#136");
      writeBlock("#" + (param + 5) + "=#144");
      writeBlock(gFormat.format(54.4), "P" + probeOutputWorkOffset);
      break;
    case "G68":
      gRotationModal.reset();
      gAbsIncModal.reset();
      var n = xyzFormat.format(0);
      writeBlock(
        gRotationModal.format(68), gAbsIncModal.format(90),
        // probeVariables.compensationXY, "Z" + n, "I" + n, "J" + n, "K" + xyzFormat.format(1), "R[#144]"
        probeVariables.compensationXY, "R[#144]"
      );
      validateWorkOffset = true;
      break;
    case "AXIS_ROT":
      var param = 5200 + probeOutputWorkOffset * 20 + 5;
      writeBlock("#" + param + " = " + "[#" + param + " + #144]");
      forceWorkPlane(); // force workplane to rotate ABC in order to apply rotation offsets
      currentWorkOffset = undefined; // force WCS output to make use of updated parameters
      validateWorkOffset = true;
      break;
    default:
      error(localize("Angular Probing is not supported for this machine configuration."));
      return;
    }
    if (validateWorkOffset) {
      for (var i = currentSection.getId(); i < getNumberOfSections(); ++i) {
        if (getSection(i).workOffset != currentSection.workOffset) {
          error(localize("WCS offset cannot change while using angle rotation compensation."));
          return;
        }
      }
    }
    probeVariables.outputRotationCodes = false;
  }
}

function protectedProbeMove(_cycle, x, y, z) {
  var _x = xOutput.format(x);
  var _y = yOutput.format(y);
  var _z = zOutput.format(z);
  if (_z && z >= getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
  if (_x || _y) {
    writeBlock(gFormat.format(65), "P" + 9810, _x, _y, getFeed(highFeedrate)); // protected positioning move
  }
  if (_z && z < getCurrentPosition().z) {
    writeBlock(gFormat.format(65), "P" + 9810, _z, getFeed(cycle.feedrate)); // protected positioning move
  }
}

function onCyclePoint(x, y, z) {
  if (cycleType == "inspect") {
    if (typeof inspectionCycleInspect == "function") {
      inspectionCycleInspect(cycle, x, y, z);
      return;
    } else {
      cycleNotSupported();
    }
  }
  if (!isSameDirection(getRotation().forward, new Vector(0, 0, 1))) {
    expandCyclePoint(x, y, z);
    return;
  }
  if (isProbeOperation()) {
    if (!isSameDirection(currentSection.workPlane.forward, new Vector(0, 0, 1))) {
      if (!allowIndexingWCSProbing && currentSection.strategy == "probe") {
        error(localize("Updating WCS / work offset using probing is only supported by the CNC in the WCS frame."));
        return;
      }
    }
    if (printProbeResults()) {
      writeProbingToolpathInformation(z - cycle.depth + tool.diameter / 2);
      inspectionWriteCADTransform();
      inspectionWriteWorkplaneTransform();
      if (typeof inspectionWriteVariables == "function") {
        inspectionVariables.pointNumber += 1;
      }
    }
    protectedProbeMove(cycle, x, y, z);
  }

  if (isFirstCyclePoint() || isProbeOperation()) {
    if (!isProbeOperation()) {
      // return to initial Z which is clearance plane and set absolute mode
      repositionToCycleClearance(cycle, x, y, z);
    }
    // R is only used in G99 mode for BNC

    var F = cycle.feedrate;
    var P = !cycle.dwell ? 0 : clamp(1, cycle.dwell, 9999.999); // in seconds

    // PRISM FIX: Tapping/threading cycles need precise feed (pitch), everything else rounds
    var isTapCycle = (cycleType == "tapping" || cycleType == "left-tapping" || cycleType == "right-tapping" ||
                      cycleType == "tapping-with-chip-breaking" || cycleType == "left-tapping-with-chip-breaking" ||
                      cycleType == "right-tapping-with-chip-breaking" || cycleType == "thread-milling");
    var cycleFeedOutput = isTapCycle ? feedOutputPrecise : feedOutput;

    switch (cycleType) {
    case "drilling":
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
          getCommonCycle(x, y, z, cycle.retract),
          cycleFeedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          cycleFeedOutput.format(F)
        );
      }
      break;
    case "counter-boring":
      if (P > 0) {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(82),
            getCommonCycle(x, y, z, cycle.retract),
            "P" + secFormat.format(P), // not optional
            cycleFeedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(82),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            "P" + secFormat.format(P), // not optional
            cycleFeedOutput.format(F)
          );
        }
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
            getCommonCycle(x, y, z, cycle.retract),
            cycleFeedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(81),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            cycleFeedOutput.format(F)
          );
        }
      }
      break;
    case "chip-breaking":
      if ((cycle.accumulatedDepth < cycle.depth) || (P > 0)) {
        expandCyclePoint(x, y, z);
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
            getCommonCycle(x, y, z, cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            cycleFeedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(73),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            cycleFeedOutput.format(F)
          );
        }
      }
      break;
    case "deep-drilling":
      if (P > 0) {
        expandCyclePoint(x, y, z);
      } else {
        if (getProperty("isnc")) {
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
            getCommonCycle(x, y, z, cycle.retract),
            "Q" + xyzFormat.format(cycle.incrementalDepth),
            cycleFeedOutput.format(F)
          );
        } else { // BNC mode
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(83),
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            "Z" + xyzFormat.format(cycle.incrementalDepth), // first peck
            conditional((cycle.minimumIncrementalDepth != undefined) && (cycle.minimumIncrementalDepth < cycle.incrementalDepth), "Z" + xyzFormat.format(cycle.minimumIncrementalDepth)), // remaining pecks
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            cycleFeedOutput.format(F)
          );
        }
      }
      break;
    case "tapping":
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 74 : 84),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          cycleFeedOutput.format(F)
        );
      } else { // BNC mode
        if (tool.type != TOOL_TAP_LEFT_HAND) { // right hand
          writeBlock(mFormat.format(3)); // cw
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            //"Z" + xyzFormat.format(cycle.incrementalDepth),
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            "P" + secFormat.format(P), // not optional
            cycleFeedOutput.format(F)
          );
          if (!tool.clockwise) {
            writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
          }
        } else { // left hand
          // warning: not rigid

          writeBlock(mFormat.format((tool.type == TOOL_TAP_LEFT_HAND) ? 4 : 3));
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
            getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
            cycleFeedOutput.format(F)
          );
          if ((tool.type == TOOL_TAP_LEFT_HAND) != !tool.clockwise) {
            writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
          }
        }
      }
      break;
    case "left-tapping":
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(74),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          cycleFeedOutput.format(F)
        );
      } else { // BNC mode
        // warning: not rigid
        writeBlock(mFormat.format(4)); // ccw
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          cycleFeedOutput.format(F)
        );
        if (tool.clockwise) {
          writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
        }
      }
      break;
    case "right-tapping":
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(84),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          cycleFeedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(mFormat.format(3)); // cw
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
          xOutput.format(x),
          yOutput.format(y),
          "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
          "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
          "P" + secFormat.format(P), // not optional
          cycleFeedOutput.format(F)
        );
        if (!tool.clockwise) {
          writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
        }
      }
      break;
    case "tapping-with-chip-breaking":
    case "left-tapping-with-chip-breaking":
    case "right-tapping-with-chip-breaking":
      if (cycle.accumulatedDepth < cycle.depth) {
        error(localize("Accumulated pecking depth is not supported for canned tapping cycles with chip breaking."));
        return;
      }
      if (true || !F) {
        F = tool.getTappingFeedrate();
      }
      if (getProperty("isnc")) {
        forceXYZ();
        writeBlock(mFormat.format(29)); // rigid
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format((tool.type == TOOL_TAP_LEFT_HAND) ? 84.3 : 84.2),
          // getCommonCycle(x, y, z, cycle.retract),
          xOutput.format(x),
          yOutput.format(y),
          "Z" + xyzFormat.format(z),
          "Z" + xyzFormat.format(cycle.incrementalDepth),
          "R" + xyzFormat.format(cycle.retract),
          "P" + secFormat.format(P), // not optional
          conditional(cycle.minimumIncrementalDepth < cycle.depth, "Q" + xyzFormat.format(cycle.minimumIncrementalDepth)), // optional
          cycleFeedOutput.format(F)
        );
        zOutput.reset();
      } else { // BNC mode
        if (tool.type != TOOL_TAP_LEFT_HAND) { // right hand
          writeBlock(mFormat.format(3)); // cw
          writeBlock(
            gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88), // rigid
            xOutput.format(x),
            yOutput.format(y),
            "Z" + xyzFormat.format(cycle.clearance - cycle.bottom),
            "Z" + xyzFormat.format(cycle.incrementalDepth),
            "R" + xyzFormat.format(zOutput.getCurrent() - cycle.retract),
            "P" + secFormat.format(P), // not optional
            cycleFeedOutput.format(F)
          );
          if (!tool.clockwise) {
            writeBlock(mFormat.format(tool.clockwise ? 3 : 4));
          }
        } else {
          error(localize("Left-tapping with chip breaking is not supported."));
        }
      }
      break;
    case "fine-boring":
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(76),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          "Q" + xyzFormat.format(cycle.shift),
          cycleFeedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(76),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          "P" + secFormat.format(P), // not optional
          "Q" + xyzFormat.format(cycle.shift),
          cycleFeedOutput.format(F)
        );
      }
      break;
    case "back-boring":
      if (!getProperty("isnc")) {
        error(localize("Back boring is not supported."));
      }
      var dx = (gPlaneModal.getCurrent() == 19) ? cycle.backBoreDistance : 0;
      var dy = (gPlaneModal.getCurrent() == 18) ? cycle.backBoreDistance : 0;
      var dz = (gPlaneModal.getCurrent() == 17) ? cycle.backBoreDistance : 0;
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(87),
        getCommonCycle(x - dx, y - dy, z - dz, cycle.bottom),
        "Q" + xyzFormat.format(cycle.shift),
        "P" + secFormat.format(P), // not optional
        cycleFeedOutput.format(F)
      );
      break;
    case "reaming":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
          getCommonCycle(x, y, z, cycle.retract),
          cycleFeedOutput.format(F)
        );
      } else { // BNC mode
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(85),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          cycleFeedOutput.format(F)
        );
      }
      break;
    case "stop-boring":
      if ((P > 0) || !getProperty("isnc")) {
        expandCyclePoint(x, y, z);
      } else {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(86),
          getCommonCycle(x, y, z, cycle.retract),
          cycleFeedOutput.format(F)
        );
      }
      break;
    case "manual-boring":
      if (!getProperty("isnc")) {
        error(localize("Manual boring is not supported."));
      }
      writeBlock(
        gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(88),
        getCommonCycle(x, y, z, cycle.retract),
        "P" + secFormat.format(P), // not optional
        cycleFeedOutput.format(F)
      );
      break;
    case "boring":
      if (feedFormat.getResultingValue(cycle.feedrate) != feedFormat.getResultingValue(cycle.retractFeedrate)) {
        expandCyclePoint(x, y, z);
        break;
      }
      if (getProperty("isnc")) {
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(89),
          getCommonCycle(x, y, z, cycle.retract),
          "P" + secFormat.format(P), // not optional
          cycleFeedOutput.format(F)
        );
      } else { // BNC
        writeBlock(
          gRetractModal.format(98), gAbsIncModal.format(90), gCycleModal.format(89),
          getCommonCycle(x, y, cycle.clearance - cycle.bottom, zOutput.getCurrent() - cycle.retract),
          "P" + secFormat.format(P), // not optional
          cycleFeedOutput.format(F)
        );
      }
      break;
    case "probing-x":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "X" + xyzFormat.format(x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "Y" + xyzFormat.format(y + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-z":
      protectedProbeMove(cycle, x, y, Math.min(z - cycle.depth + cycle.probeClearance, cycle.retract));
      writeBlock(
        gFormat.format(65), "P" + 9811,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-wall":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-wall":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-channel":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-channel-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-channel":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-y-channel-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "D" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9814,
        "Z" + xyzFormat.format(z - cycle.depth),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-circular-partial-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9823,
        "Z" + xyzFormat.format(z - cycle.depth),
        "A" + xyzFormat.format(cycle.partialCircleAngleA),
        "B" + xyzFormat.format(cycle.partialCircleAngleB),
        "C" + xyzFormat.format(cycle.partialCircleAngleC),
        "D" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-hole":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Y" + xyzFormat.format(cycle.width2),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        // not required "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "X" + xyzFormat.format(cycle.width1),
        "R" + xyzFormat.format(cycle.probeClearance),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Y" + xyzFormat.format(cycle.width2),
        "R" + xyzFormat.format(cycle.probeClearance),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-rectangular-hole-with-island":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "X" + xyzFormat.format(cycle.width1),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      writeBlock(
        gFormat.format(65), "P" + 9812,
        "Z" + xyzFormat.format(z - cycle.depth),
        "Y" + xyzFormat.format(cycle.width2),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(-cycle.probeClearance),
        getProbingArguments(cycle, true)
      );
      break;

    case "probing-xy-inner-corner":
      var cornerX = x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2);
      var cornerY = y + approach(cycle.approach2) * (cycle.probeClearance + tool.diameter / 2);
      var cornerI = 0;
      var cornerJ = 0;
      if (cycle.probeSpacing !== undefined) {
        cornerI = cycle.probeSpacing;
        cornerJ = cycle.probeSpacing;
      }
      if ((cornerI != 0) && (cornerJ != 0)) {
        if (currentSection.strategy == "probe") {
          setProbeAngleMethod();
          probeVariables.compensationXY = "X[#185] Y[#186]";
        }
      }
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9815, xOutput.format(cornerX), yOutput.format(cornerY),
        conditional(cornerI != 0, "I" + xyzFormat.format(cornerI)),
        conditional(cornerJ != 0, "J" + xyzFormat.format(cornerJ)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-xy-outer-corner":
      var cornerX = x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2);
      var cornerY = y + approach(cycle.approach2) * (cycle.probeClearance + tool.diameter / 2);
      var cornerI = 0;
      var cornerJ = 0;
      if (cycle.probeSpacing !== undefined) {
        cornerI = cycle.probeSpacing;
        cornerJ = cycle.probeSpacing;
      }
      if ((cornerI != 0) && (cornerJ != 0)) {
        if (currentSection.strategy == "probe") {
          setProbeAngleMethod();
          probeVariables.compensationXY = "X[#185] Y[#186]";
        }
      }
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9816, xOutput.format(cornerX), yOutput.format(cornerY),
        conditional(cornerI != 0, "I" + xyzFormat.format(cornerI)),
        conditional(cornerJ != 0, "J" + xyzFormat.format(cornerJ)),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, true)
      );
      break;
    case "probing-x-plane-angle":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9843,
        "X" + xyzFormat.format(x + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "D" + xyzFormat.format(cycle.probeSpacing),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "A" + xyzFormat.format(cycle.nominalAngle != undefined ? cycle.nominalAngle : 90),
        getProbingArguments(cycle, false)
      );
      if (currentSection.strategy == "probe") {
        setProbeAngleMethod();
        probeVariables.compensationXY = "X" + xyzFormat.format(0) + " Y" + xyzFormat.format(0);
      }
      break;
    case "probing-y-plane-angle":
      protectedProbeMove(cycle, x, y, z - cycle.depth);
      writeBlock(
        gFormat.format(65), "P" + 9843,
        "Y" + xyzFormat.format(y + approach(cycle.approach1) * (cycle.probeClearance + tool.diameter / 2)),
        "D" + xyzFormat.format(cycle.probeSpacing),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "A" + xyzFormat.format(cycle.nominalAngle != undefined ? cycle.nominalAngle : 0),
        getProbingArguments(cycle, false)
      );
      if (currentSection.strategy == "probe") {
        setProbeAngleMethod();
        probeVariables.compensationXY = "X" + xyzFormat.format(0) + " Y" + xyzFormat.format(0);
      }
      break;
    case "probing-xy-pcd-hole":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9819,
        "A" + xyzFormat.format(cycle.pcdStartingAngle),
        "B" + xyzFormat.format(cycle.numberOfSubfeatures),
        "C" + xyzFormat.format(cycle.widthPCD),
        "D" + xyzFormat.format(cycle.widthFeature),
        "K" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        getProbingArguments(cycle, false)
      );
      if (cycle.updateToolWear) {
        error(localize("Action -Update Tool Wear- is not supported with this cycle."));
        return;
      }
      break;
    case "probing-xy-pcd-boss":
      protectedProbeMove(cycle, x, y, z);
      writeBlock(
        gFormat.format(65), "P" + 9819,
        "A" + xyzFormat.format(cycle.pcdStartingAngle),
        "B" + xyzFormat.format(cycle.numberOfSubfeatures),
        "C" + xyzFormat.format(cycle.widthPCD),
        "D" + xyzFormat.format(cycle.widthFeature),
        "Z" + xyzFormat.format(z - cycle.depth),
        "Q" + xyzFormat.format(cycle.probeOvertravel),
        "R" + xyzFormat.format(cycle.probeClearance),
        getProbingArguments(cycle, false)
      );
      if (cycle.updateToolWear) {
        error(localize("Action -Update Tool Wear- is not supported with this cycle."));
        return;
      }
      break;
    default:
      expandCyclePoint(x, y, z);
    }
  } else {
    if (cycleExpanded) {
      expandCyclePoint(x, y, z);
    } else {
      var _x = xOutput.format(x);
      var _y = yOutput.format(y);
      if (!_x && !_y) {
        xOutput.reset(); // at least one axis is required
        _x = xOutput.format(x);
      }
      writeBlock(_x, _y);
    }
  }
}

function getProbingArguments(cycle, updateWCS) {
  var outputWCSCode = updateWCS && currentSection.strategy == "probe";
  var probeOutputWorkOffset = currentSection.probeWorkOffset;
  if (outputWCSCode) {
    validate(probeOutputWorkOffset <= 99, "Work offset is out of range.");
    var nextWorkOffset = hasNextSection() ? getNextSection().workOffset == 0 ? 1 : getNextSection().workOffset : -1;
    if (probeOutputWorkOffset == nextWorkOffset) {
      currentWorkOffset = undefined;
    }
  }
  return [
    (cycle.angleAskewAction == "stop-message" ? "B" + xyzFormat.format(cycle.toleranceAngle ? cycle.toleranceAngle : 0) : undefined),
    ((cycle.updateToolWear && cycle.toolWearErrorCorrection < 100) ? "F" + xyzFormat.format(cycle.toolWearErrorCorrection ? cycle.toolWearErrorCorrection / 100 : 100) : undefined),
    (cycle.wrongSizeAction == "stop-message" ? "H" + xyzFormat.format(cycle.toleranceSize ? cycle.toleranceSize : 0) : undefined),
    (cycle.outOfPositionAction == "stop-message" ? "M" + xyzFormat.format(cycle.tolerancePosition ? cycle.tolerancePosition : 0) : undefined),
    ((cycle.updateToolWear && cycleType == "probing-z") ? "T" + xyzFormat.format(cycle.toolLengthOffset) : undefined),
    ((cycle.updateToolWear && cycleType !== "probing-z") ? "T" + xyzFormat.format(cycle.toolDiameterOffset) : undefined),
    (cycle.updateToolWear ? "V" + xyzFormat.format(cycle.toolWearUpdateThreshold ? cycle.toolWearUpdateThreshold : 0) : undefined),
    (cycle.printResults ? "W" + xyzFormat.format(1 + cycle.incrementComponent) : undefined), // 1 for advance feature, 2 for reset feature count and advance component number. first reported result in a program should use W2.
    conditional(outputWCSCode, "S" + probeWCSFormat.format(probeOutputWorkOffset > 6 ? (probeOutputWorkOffset - 6 + 100) : probeOutputWorkOffset))
  ];
}

function onCycleEnd() {
  if (isProbeOperation()) {
    zOutput.reset();
    gMotionModal.reset();
    writeBlock(gFormat.format(65), "P" + 9810, zOutput.format(cycle.retract)); // protected retract move
  } else {
    if (!cycleExpanded) {
      writeBlock(gCycleModal.format(80));
      zOutput.reset();
    }
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
    if (!getProperty("useG0") && (((x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0)) > 1)) {
      // axes are not synchronized
      writeBlock(gMotionModal.format(1), x, y, z, feedOutput.format(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z);
      forceFeed();
    }
  }
}

/** Global variables for prism feed calculations in motion functions */
var prismMoveDistance = 0;
var prismCurrentPos = null;
var prismEnhancedIsArc = false;
var prismEnhancedArcRadius = 0;

function onLinear(_x, _y, _z, feed) {
  // Set current Z for dynamic depth feed calculation - MUST BE BEFORE getFeed()
  currentCuttingZ = _z;
  
  // Calculate move distance for prism
  if (getProperty("usePrismEnhancedFeed")) {
    var start = getCurrentPosition();
    var dx = _x - start.x;
    var dy = _y - start.y;
    var dz = _z - start.z;
    prismMoveDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    prismCurrentPos = [_x, _y, _z];
    prismEnhancedIsArc = false;
    prismEnhancedArcRadius = 0;
  }
  
  if (pendingRadiusCompensation >= 0) {
    // ensure that we end at desired position when compensation is turned off
    xOutput.reset();
    yOutput.reset();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var f = getFeed(feed);
  if (x || y || z) {
    if (pendingRadiusCompensation >= 0) {
      pendingRadiusCompensation = -1;
      var d = tool.diameterOffset;
      if (d > 200) {
        warning(localize("The diameter offset exceeds the maximum value."));
      }
      writeBlock(gPlaneModal.format(17));
      switch (radiusCompensation) {
      case RADIUS_COMPENSATION_LEFT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(41), x, y, z, dOutput.format(d), f);
        break;
      case RADIUS_COMPENSATION_RIGHT:
        dOutput.reset();
        writeBlock(gMotionModal.format(1), gFormat.format(42), x, y, z, dOutput.format(d), f);
        break;
      default:
        writeBlock(gMotionModal.format(1), gFormat.format(40), x, y, z, f);
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
  
  // Update prism state for direction tracking
  if (getProperty("usePrismEnhancedFeed")) {
    updatePrismEnhancedState(_x, _y, _z);
  }
}

function onRapid5D(_x, _y, _z, _a, _b, _c) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation mode cannot be changed at rapid traversal."));
    return;
  }

  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }

  var num =
    (xyzFormat.areDifferent(_x, xOutput.getCurrent()) ? 1 : 0) +
    (xyzFormat.areDifferent(_y, yOutput.getCurrent()) ? 1 : 0) +
    (xyzFormat.areDifferent(_z, zOutput.getCurrent()) ? 1 : 0) +
    ((aOutput.isEnabled() && abcFormat.areDifferent(_a, aOutput.getCurrent())) ? 1 : 0) +
    ((bOutput.isEnabled() && abcFormat.areDifferent(_b, bOutput.getCurrent())) ? 1 : 0) +
    ((cOutput.isEnabled() && abcFormat.areDifferent(_c, cOutput.getCurrent())) ? 1 : 0);

  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : "I" + ijkFormat.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : "J" + ijkFormat.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : "K" + ijkFormat.format(_c);

  if (x || y || z || a || b || c) {
    if (!getProperty("useG0") && (operationSupportsTCP || (num > 1))) {
      // axes are not synchronized
      writeBlock(gFeedModeModal.format(94), gMotionModal.format(1), x, y, z, a, b, c, getFeed(highFeedrate));
    } else {
      writeBlock(gMotionModal.format(0), x, y, z, a, b, c);
      forceFeed();
    }
  }
}

function onLinear5D(_x, _y, _z, _a, _b, _c, feed, feedMode) {
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for 5-axis move."));
    return;
  }
  if (!currentSection.isOptimizedForMachine()) {
    forceXYZ();
  }
  var x = xOutput.format(_x);
  var y = yOutput.format(_y);
  var z = zOutput.format(_z);
  var a = currentSection.isOptimizedForMachine() ? aOutput.format(_a) : "I" + ijkFormat.format(_a);
  var b = currentSection.isOptimizedForMachine() ? bOutput.format(_b) : "J" + ijkFormat.format(_b);
  var c = currentSection.isOptimizedForMachine() ? cOutput.format(_c) : "K" + ijkFormat.format(_c);
  if (feedMode == FEED_INVERSE_TIME) {
    forceFeed();
  }
  var f = feedMode == FEED_INVERSE_TIME ? inverseTimeOutput.format(feed) : getFeed(feed);
  var fMode = feedMode == FEED_INVERSE_TIME ? 93 : 94;

  if (x || y || z || a || b || c) {
    writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), x, y, z, a, b, c, f);
  } else if (f) {
    if (getNextRecord().isMotion()) { // try not to output feed without motion
      forceFeed(); // force feed on next line
    } else {
      writeBlock(gFeedModeModal.format(fMode), gMotionModal.format(1), f);
    }
  }
}

function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
  // Set current Z for dynamic depth feed calculation - MUST BE BEFORE getFeed()
  currentCuttingZ = z;
  
  if (pendingRadiusCompensation >= 0) {
    error(localize("Radius compensation cannot be activated/deactivated for a circular move."));
    return;
  }

  var start = getCurrentPosition();
  
  // Set up prism variables for arc feed correction
  if (getProperty("usePrismEnhancedFeed")) {
    // Calculate arc radius
    var dx = start.x - cx;
    var dy = start.y - cy;
    prismEnhancedArcRadius = Math.sqrt(dx*dx + dy*dy);
    prismEnhancedIsArc = true;
    prismCurrentPos = [x, y, z];
    // Estimate arc length for move distance
    var sweep = getCircularSweep();
    prismMoveDistance = Math.abs(sweep * prismEnhancedArcRadius);
  }

  if (isFullCircle()) {
    if (isHelical()) {
      linearize(tolerance);
      return;
    }
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), irOutput.format(cx - start.x, 0), jrOutput.format(cy - start.y, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), iOutput.format(cx), jOutput.format(cy), getFeed(feed));
      }
      break;
    case PLANE_ZX:
      if (getProperty("isnc")) {
        // right-handed
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), irOutput.format(cx - start.x, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        // note: left hand coordinate system
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), iOutput.format(cx), kOutput.format(cz), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jrOutput.format(cy - start.y, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), jOutput.format(cy), kOutput.format(cz), getFeed(feed));
      }
      break;
    default:
      linearize(tolerance);
    }
  } else {
    switch (getCircularPlane()) {
    case PLANE_XY:
      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), irOutput.format(cx - start.x, 0), jrOutput.format(cy - start.y, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(17), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), jOutput.format(cy), getFeed(feed));
      }
      break;
    case PLANE_ZX:
      if (isHelical()) {
        linearize(tolerance);
        return;
      }

      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), irOutput.format(cx - start.x, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        // note: left hand coordinate system
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(18), gMotionModal.format(clockwise ? 3 : 2), xOutput.format(x), yOutput.format(y), zOutput.format(z), iOutput.format(cx), kOutput.format(cz), getFeed(feed));
      }
      break;
    case PLANE_YZ:
      if (isHelical()) {
        linearize(tolerance);
        return;
      }

      if (getProperty("isnc")) {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jrOutput.format(cy - start.y, 0), krOutput.format(cz - start.z, 0), getFeed(feed));
      } else {
        writeBlock(gAbsIncModal.format(90), gPlaneModal.format(19), gMotionModal.format(clockwise ? 2 : 3), xOutput.format(x), yOutput.format(y), zOutput.format(z), jOutput.format(cy), kOutput.format(cz), getFeed(feed));
      }
      break;
    default:
      if (getProperty("allow3DArcs")) {
        // make sure maximumCircularSweep is well below 360deg
        // we could use G2.4 or G3.4 - direction is calculated
        var ip = getPositionU(0.5);
        writeBlock(gAbsIncModal.format(90), gMotionModal.format(clockwise ? 2.4 : 3.4), xOutput.format(ip.x), yOutput.format(ip.y), zOutput.format(ip.z));
        writeBlock(xOutput.format(x), yOutput.format(y), zOutput.format(z), getFeed(feed));
      } else {
        linearize(tolerance);
      }
    }
  }
  
  // Update prism state for direction tracking
  if (getProperty("usePrismEnhancedFeed")) {
    updatePrismEnhancedState(x, y, z);
  }
}

var currentCoolantMode = COOLANT_OFF;
var coolantOff = undefined;
var forceCoolant = false;

function setCoolant(coolant) {
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
  if (coolant == currentCoolantMode && (!forceCoolant || coolant == COOLANT_OFF)) {
    return undefined; // coolant is already active
  }
  
  // Special handling for air through spindle
  if (coolant == COOLANT_AIR_THROUGH_TOOL) {
    // Turn on air through spindle
    var airOnCode = getAirThruSpindleOnCode();
    if (airOnCode) {
      multipleCoolantBlocks.push(airOnCode);
      airThruSpindleActive = true;
    }
    currentCoolantMode = coolant;
    return multipleCoolantBlocks;
  }
  
  // If turning off coolant and air through spindle was active, turn it off
  if (coolant == COOLANT_OFF && airThruSpindleActive) {
    var airOffCode = getAirThruSpindleOffCode();
    if (airOffCode) {
      multipleCoolantBlocks.push(airOffCode);
      airThruSpindleActive = false;
    }
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

/** Returns the M-code or subprogram call to turn on air through spindle */
function getAirThruSpindleOnCode() {
  var auxOutput = getProperty("airThruSpindleAuxOutput");
  
  // Option 1: Use auxiliary output
  if (auxOutput > 0 && auxOutput <= 12) {
    if (auxOutput <= 4) {
      return mFormat.format(51 + auxOutput) + " " + formatComment("AIR THRU SPINDLE ON");  // M52-M55
    } else {
      return mFormat.format(137 + auxOutput) + " " + formatComment("AIR THRU SPINDLE ON");  // M142-M149 (output 5-12)
    }
  }
  
  // Option 2: Use subprogram call
  if (getProperty("useSubprogramAirThruSpindle")) {
    var subNum = getProperty("airOnSubprogram");
    return mFormat.format(98) + " P" + subNum + " " + formatComment("AIR THRU SPINDLE ON");
  }
  
  // Option 3: Try M11 Q1 (may not work on all machines)
  return "M11 Q1 " + formatComment("AIR THRU SPINDLE ON");
}

/** Returns the M-code or subprogram call to turn off air through spindle */
function getAirThruSpindleOffCode() {
  var auxOutput = getProperty("airThruSpindleAuxOutput");
  
  // Option 1: Use auxiliary output
  if (auxOutput > 0 && auxOutput <= 12) {
    if (auxOutput <= 4) {
      return mFormat.format(61 + auxOutput) + " " + formatComment("AIR THRU SPINDLE OFF");  // M62-M65
    } else {
      return mFormat.format(147 + auxOutput) + " " + formatComment("AIR THRU SPINDLE OFF");  // M152-M159 (output 5-12)
    }
  }
  
  // Option 2: Use subprogram call
  if (getProperty("useSubprogramAirThruSpindle")) {
    var subNum = getProperty("airOffSubprogram");
    return mFormat.format(98) + " P" + subNum + " " + formatComment("AIR THRU SPINDLE OFF");
  }
  
  // Option 3: Try M11 Q0 (may not work on all machines)
  return "M11 Q0 " + formatComment("AIR THRU SPINDLE OFF");
}

var mapCommand = {
  COMMAND_END                     : 2,
  COMMAND_SPINDLE_CLOCKWISE       : 3,
  COMMAND_SPINDLE_COUNTERCLOCKWISE: 4,
  COMMAND_STOP_SPINDLE            : 5,
  COMMAND_ORIENTATE_SPINDLE       : 19,
  COMMAND_LOAD_TOOL               : 6
};

function onCommand(command) {
  switch (command) {
  case COMMAND_STOP:
    writeBlock(mFormat.format(0));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_OPTIONAL_STOP:
    writeBlock(mFormat.format(1));
    forceSpindleSpeed = true;
    forceCoolant = true;
    return;
  case COMMAND_START_SPINDLE:
    onCommand(tool.clockwise ? COMMAND_SPINDLE_CLOCKWISE : COMMAND_SPINDLE_COUNTERCLOCKWISE);
    return;
  case COMMAND_LOCK_MULTI_AXIS:
    if ((useVectorOutput && hasABCAxis("A")) || aOutput.isEnabled()) {
      writeBlock(mClampModal.format(32));
    }
    if ((useVectorOutput && hasABCAxis("B")) || bOutput.isEnabled()) {
      writeBlock(mClampModal.format(34));
    }
    if ((useVectorOutput && hasABCAxis("C")) || cOutput.isEnabled()) {
      writeBlock(mClampModal.format(12));
    }
    return;
  case COMMAND_UNLOCK_MULTI_AXIS:
    if ((useVectorOutput && hasABCAxis("A")) || aOutput.isEnabled()) {
      writeBlock(mClampModal.format(33));
    }
    if ((useVectorOutput && hasABCAxis("B")) || bOutput.isEnabled()) {
      writeBlock(mClampModal.format(35));
    }
    if ((useVectorOutput && hasABCAxis("C")) || cOutput.isEnabled()) {
      writeBlock(mClampModal.format(13));
    }
    return;
  case COMMAND_START_CHIP_TRANSPORT:
    writeBlock(mFormat.format(59));
    return;
  case COMMAND_STOP_CHIP_TRANSPORT:
    writeBlock(mFormat.format(61));
    return;
  case COMMAND_BREAK_CONTROL:
    return;
  case COMMAND_TOOL_MEASURE:
    return;
  case COMMAND_PROBE_ON:
    return;
  case COMMAND_PROBE_OFF:
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
  if (currentSection.isMultiAxis()) {
    writeBlock(gFeedModeModal.format(94)); // inverse time feed off
    writeBlock(mFormat.format(129));
    if (!isLastSection()) {
      writeBlock(mFormat.format(31)); // rotary axes encoder reset
    }
    // the code below gets the machine angles from previous operation.  closestABC must also be set to true
    if (currentSection.isOptimizedForMachine()) {
      currentMachineABC = currentSection.getFinalToolAxisABC();
    }
  }
  writeBlock(gPlaneModal.format(17));
  if (!isLastSection() && (getNextSection().getTool().coolant != tool.coolant)) {
    setCoolant(COOLANT_OFF);
  }
  if (((getCurrentSectionId() + 1) >= getNumberOfSections()) ||
      (tool.number != getNextSection().getTool().number)) {
    onCommand(COMMAND_BREAK_CONTROL);
  }

  if (isProbeOperation()) {
    // writeBlock(gFormat.format(65), "P" + 9833); // spin the probe off //Probe doesn't need to be activate or de activated, as the controller is doing it automatically at toolchange.
    if (probeVariables.probeAngleMethod != "G68") {
      setProbeAngle(); // output probe angle rotations if required
    }
  }
  forceAny();
}

/**
  Output block for minimum Z retract between work offsets.
  Instead of retracting to Z home (G28), this retracts to a clearance height
  above the stock/part. Saves significant time on multi-fixture setups.
*/
function writeMinimumRetract() {
  var retractZ;
  var clearance = getProperty("minimumZRetractClearance");
  var fixedRetract = getProperty("minimumZRetractFromWCS");
  
  if (fixedRetract != 0) {
    // User specified a fixed Z position relative to WCS zero
    retractZ = fixedRetract;
    writeComment("MIN RETRACT TO Z" + xyzFormat.format(retractZ) + " (FIXED)");
  } else {
    // Calculate retract based on stock top + clearance
    // Get the highest Z point from current section's stock or part
    var stockZMax = 0;
    
    // Try to get stock top from current section
    if (hasParameter("operation:stockZHigh")) {
      stockZMax = getParameter("operation:stockZHigh");
    } else if (currentSection.hasParameter("operation:zRange:max")) {
      stockZMax = currentSection.getParameter("operation:zRange:max");
    } else {
      // Fallback: use clearance height from the operation if available
      var clearanceHeight = currentSection.getGlobalZRange().getMaximum();
      stockZMax = clearanceHeight;
    }
    
    retractZ = stockZMax + clearance;
    writeComment("MIN RETRACT TO Z" + xyzFormat.format(retractZ) + " (STOCK+" + xyzFormat.format(clearance) + ")");
  }
  
  // Output the retract move in the CURRENT work coordinate system
  // We're still in the previous WCS at this point
  gMotionModal.reset();
  writeBlock(gAbsIncModal.format(90), gMotionModal.format(0), "Z" + xyzFormat.format(retractZ));
  zOutput.reset();
  retracted = true;
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
  /*
  if (retractAxes[2]) { // Z doesn't use G53
    method = "G28";
  }
  */
  if (gRotationModal.getCurrent() == 68) { // cancel G68 before retracting
    cancelWorkPlane(true);
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
      if (retractAxes[2] && useMultiAxisFeatures && getProperty("useM140")) {
        writeBlock(gFormat.format(0), mFormat.format(140));
      } else {
        writeBlock(gAbsIncModal.format(90), gFormat.format(53), gMotionModal.format(0), words);
      }
      break;
    default:
      error(localize("Unsupported safe position method."));
      return;
    }
  }
}

var isDPRNTopen = false;
function inspectionCreateResultsFileHeader() {
  if (isDPRNTopen) {
    if (!getProperty("singleResultsFile")) {
      writeln("DPRNT[END]");
      writeBlock("PCLOS");
      isDPRNTopen = false;
    }
  }

  if (isProbeOperation() && !printProbeResults()) {
    return; // if print results is not desired by probe/ probeWCS
  }

  if (!isDPRNTopen) {
    writeBlock("PCLOS");
    writeBlock("POPEN");
    // check for existence of none alphanumeric characters but not spaces
    var resFile;
    if (getProperty("singleResultsFile")) {
      resFile = getParameter("job-description") + "-RESULTS";
    } else {
      resFile = getParameter("operation-comment") + "-RESULTS";
    }
    resFile = resFile.replace(/:/g, "-");
    resFile = resFile.replace(/[^a-zA-Z0-9 -]/g, "");
    resFile = resFile.replace(/\s/g, "-");
    writeln("DPRNT[START]");
    writeln("DPRNT[RESULTSFILE*" + resFile + "]");
    if (hasGlobalParameter("document-id")) {
      writeln("DPRNT[DOCUMENTID*" + getGlobalParameter("document-id") + "]");
    }
    if (hasGlobalParameter("model-version")) {
      writeln("DPRNT[MODELVERSION*" + getGlobalParameter("model-version") + "]");
    }
  }
  if (isProbeOperation() && printProbeResults()) {
    isDPRNTopen = true;
  }
}

function getPointNumber() {
  if (typeof inspectionWriteVariables == "function") {
    return (inspectionVariables.pointNumber);
  } else {
    return ("#122[60]");
  }
}

function inspectionWriteCADTransform() {
  var cadOrigin = currentSection.getModelOrigin();
  var cadWorkPlane = currentSection.getModelPlane().getTransposed();
  var cadEuler = cadWorkPlane.getEuler2(EULER_XYZ_S);
  writeln(
    "DPRNT[G331" +
    "*N" + getPointNumber() +
    "*A" + abcFormat.format(cadEuler.x) +
    "*B" + abcFormat.format(cadEuler.y) +
    "*C" + abcFormat.format(cadEuler.z) +
    "*X" + xyzFormat.format(-cadOrigin.x) +
    "*Y" + xyzFormat.format(-cadOrigin.y) +
    "*Z" + xyzFormat.format(-cadOrigin.z) +
    "]"
  );
}

function inspectionWriteWorkplaneTransform() {
  var orientation = (machineConfiguration.isMultiAxisConfiguration() && currentMachineABC != undefined) ? machineConfiguration.getOrientation(currentMachineABC) : currentSection.workPlane;
  var abc = orientation.getEuler2(EULER_XYZ_S);
  writeln("DPRNT[G330" +
    "*N" + getPointNumber() +
    "*A" + abcFormat.format(abc.x) +
    "*B" + abcFormat.format(abc.y) +
    "*C" + abcFormat.format(abc.z) +
    "*X0*Y0*Z0*I0*R0]"
  );
}

function writeProbingToolpathInformation(cycleDepth) {
  writeln("DPRNT[TOOLPATHID*" + getParameter("autodeskcam:operation-id") + "]");
  if (isInspectionOperation()) {
    writeln("DPRNT[TOOLPATH*" + getParameter("operation-comment") + "]");
  } else {
    writeln("DPRNT[CYCLEDEPTH*" + xyzFormat.format(cycleDepth) + "]");
  }
}

// Start of onRewindMachine logic
/** Allow user to override the onRewind logic. */
function onRewindMachineEntry(_a, _b, _c) {
  return false;
}

/** Retract to safe position before indexing rotaries. */
function onMoveToSafeRetractPosition() {
  writeRetract(Z);
  // cancel TCP so that tool doesn't follow rotaries
  if (currentSection.isMultiAxis() && operationSupportsTCP) {
    writeBlock(mFormat.format(129));
  }
}

/** Rotate axes to new position above reentry position */
function onRotateAxes(_x, _y, _z, _a, _b, _c) {
  // position rotary axes
  xOutput.disable();
  yOutput.disable();
  zOutput.disable();
  invokeOnRapid5D(_x, _y, _z, _a, _b, _c);
  setCurrentABC(new Vector(_a, _b, _c));
  xOutput.enable();
  yOutput.enable();
  zOutput.enable();
}

/** Return from safe position after indexing rotaries. */
function onReturnFromSafeRetractPosition(_x, _y, _z) {
  // reinstate TCP / tool length compensation
  if (operationSupportsTCP) {
    writeBlock(mFormat.format(128));
    var abc = getCurrentDirection();
    gMotionModal.reset();
    forceAny();
    var G = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? 1 : 0;
    var F = ((highFeedMapping != HIGH_FEED_NO_MAPPING) || !getProperty("useG0")) ? getFeed(highFeedrate) : "";
    writeBlock(
      gMotionModal.format(G), gFormat.format(8.2),
      xOutput.format(_x), yOutput.format(_y), zOutput.format(_z),
      aOutput.format(abc.x), bOutput.format(abc.y), cOutput.format(abc.z), F
    );
    writeBlock(gFormat.format(43.4));
    writeBlock(mFormat.format(200), "P" + (getProperty("preferredTilt") ? 1 : 2)); // prefer positive/negative tilt
  } else {
    // position in XY
    forceXYZ();
    xOutput.reset();
    yOutput.reset();
    zOutput.disable();
    invokeOnRapid(_x, _y, _z);

    // position in Z
    zOutput.enable();
    invokeOnRapid(_x, _y, _z);
  }
}
// End of onRewindMachine logic

function onClose() {
  if (isDPRNTopen) {
    writeln("DPRNT[END]");
    writeBlock("PCLOS");
    isDPRNTopen = false;
    if (typeof inspectionProcessSectionEnd == "function") {
      inspectionProcessSectionEnd();
    }
  }
  if (probeVariables.probeAngleMethod == "G68") {
    cancelWorkPlane();
  }
  setCoolant(COOLANT_OFF);

  /*
  if (useMultiAxisFeatures && !is3D()) {
    writeBlock(gFormat.format(0), mFormat.format(140)); // retract
    writeBlock(
      gFormat.format(68.2),
      xOutput.format(0), yOutput.format(0), zOutput.format(0),
      "I" + ijkFormat.format(1), "J" + ijkFormat.format(0), "K" + ijkFormat.format(0),
      "U" + ijkFormat.format(0), "V" + ijkFormat.format(1), "W" + ijkFormat.format(0)
    );
    forceXYZ();
    gMotionModal.reset();
    writeBlock(
      gMotionModal.format(0), gFormat.format(8.2),
      xOutput.format(0), yOutput.format(0), zOutput.format(0),
      "I" + ijkFormat.format(0), "J" + ijkFormat.format(0), "K" + ijkFormat.format(1)
    );
  } else {
    writeBlock(gAbsIncModal.format(91), gFormat.format(28), "Z" + xyzFormat.format(0)); // retract
  }
*/

  writeRetract(Z);
  zOutput.reset();

  writeRetract(X, Y);

  if (machineConfiguration.isMultiAxisConfiguration() || (useMultiAxisFeatures && !is3D())) {
    cancelWorkPlane(true);
    writeBlock(mFormat.format(31)); // rotary axes encoder reset
    if (useVectorOutput) {
      onCommand(COMMAND_UNLOCK_MULTI_AXIS);
      // reset rotaries to 0 when using vector output
    } else {
      positionABC(new Vector(0, 0, 0), true);
    }
  }

  if (forceMultiAxisIndexing || !is3D() || machineConfiguration.isMultiAxisConfiguration()) {
    writeBlock(mFormat.format(127)); // cancel shortest path traverse
  }

  // Disable automatic buffering
  if (getProperty("useAutomaticBuffering")) {
    writeBlock(mFormat.format(17), formatComment("AUTOMATIC BUFFERING OFF"));
  }

  // Washdown coolant at end of program
  if (getProperty("useWashdownCoolant")) {
    writeComment("WASHDOWN CYCLE");
    writeBlock(mFormat.format(68), formatComment("WASHDOWN COOLANT ON"));
    writeBlock(gFormat.format(4), "P5.", formatComment("DWELL 5 SEC"));
    writeBlock(mFormat.format(69), formatComment("WASHDOWN COOLANT OFF"));
  }

  // Stop chip conveyor
  if (getProperty("useChipConveyor")) {
    onCommand(COMMAND_STOP_CHIP_TRANSPORT);
  }
  
  onImpliedCommand(COMMAND_END);
  onImpliedCommand(COMMAND_STOP_SPINDLE);
  
  writeln("");
  writeComment("END OF PROGRAM");
  writeBlock(mFormat.format(2)); // end of program, stop spindle, coolant off
  
  writeln("E");
}

function setProperty(property, value) {
  properties[property].current = value;
}
