/**
 * PostProcessorKnowledgeEngine.ts
 *
 * Deep Knowledge Base for Post Processor Intelligence
 * Extracted from:
 * - Post Processor Training Guide (314 pages)
 * - Postability UPK Documentation (26 pages)
 *
 * This engine provides comprehensive knowledge about:
 * - Entry functions (onOpen, onSection, onCircular, onCyclePoint, etc.)
 * - Drilling cycle types and parameters
 * - Multi-axis configuration (rotary switches, TCP, tilt planes)
 * - Manual NC commands
 * - Work offset and WCS handling
 * - Machine setup information
 * - Rotary axis configuration
 * - Feed per revolution handling
 * - G-code output patterns
 *
 * @module engines/PostProcessorKnowledgeEngine
 */

// ============================================================================
// ENTRY FUNCTION KNOWLEDGE BASE
// ============================================================================

export interface EntryFunction {
  name: string;
  signature: string;
  description: string;
  parameters: ParameterDefinition[];
  returnType: string;
  category: "lifecycle" | "motion" | "cycle" | "command" | "manual" | "utility";
  commonPatterns: string[];
  bestPractices: string[];
  warnings: string[];
  relatedFunctions: string[];
}

export interface ParameterDefinition {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  defaultValue?: string;
}

export const ENTRY_FUNCTIONS: EntryFunction[] = [
  // Lifecycle Functions
  {
    name: "onOpen",
    signature: "function onOpen()",
    description:
      "Called once at the beginning of post processing. Initializes the output NC file with machine defaults, tool list, and startup codes.",
    parameters: [],
    returnType: "void",
    category: "lifecycle",
    commonPatterns: [
      "Write program header with date/time",
      "Output tool list if properties.writeTools is true",
      "Initialize sequence numbers",
      "Set default modal states (G90, G17, G40, G80)",
      "Output machine-specific startup codes",
    ],
    bestPractices: [
      "Always call writeProgramHeader() for operator identification",
      "Use permittedCommentChars to sanitize header text",
      "Initialize all modal groups to known states",
      "Set machineParameters for drilling cycle support",
    ],
    warnings: [
      "Do not output motion commands in onOpen",
      "Ensure all formats are defined before onOpen is called",
      "Tool list output order must match tool sequence",
    ],
    relatedFunctions: ["onSection", "onClose", "writeProgramHeader"],
  },
  {
    name: "onSection",
    signature: "function onSection()",
    description:
      "Called at the start of each operation. Handles tool changes, work offset selection, spindle startup, and coolant activation.",
    parameters: [],
    returnType: "void",
    category: "lifecycle",
    commonPatterns: [
      "Check isFirstSection() for initial operation handling",
      "Output tool change if tool.number changes",
      "Set work coordinate system (G54-G59, G54.1 Pn)",
      "Output spindle speed and direction (M03/M04)",
      "Activate coolant (M08, M07, M50-M59)",
      "Handle work plane orientation for 3+2 machining",
    ],
    bestPractices: [
      "Use insertToolCall flag for optimized tool changes",
      "Always retract Z before XY positioning",
      "Call forceXYZ() after tool change",
      "Handle workPlaneABC for tilted work planes",
    ],
    warnings: [
      "Tool length compensation must be active before cutting",
      "Never skip spindle warmup for high-speed operations",
      "Check TCP state for 5-axis operations",
    ],
    relatedFunctions: ["onSectionEnd", "writeToolCall", "setWorkPlane"],
  },
  {
    name: "onSectionEnd",
    signature: "function onSectionEnd()",
    description:
      "Called at the end of each operation. Handles coolant off, spindle stop, and operation-specific cleanup.",
    parameters: [],
    returnType: "void",
    category: "lifecycle",
    commonPatterns: [
      "Turn off coolant if not needed for next operation",
      "Retract tool to safe position",
      "Cancel cutter compensation (G40)",
      "Output operation end comment",
    ],
    bestPractices: [
      "Check if next operation uses same tool before retracting",
      "Use forceAny() to reset modal states",
      "Handle TCP deactivation for 5-axis operations",
    ],
    warnings: ["Do not stop spindle between same-tool operations"],
    relatedFunctions: ["onSection", "writeRetract", "setCoolant"],
  },
  {
    name: "onClose",
    signature: "function onClose()",
    description:
      "Called once at the end of post processing. Outputs program end codes and final retracts.",
    parameters: [],
    returnType: "void",
    category: "lifecycle",
    commonPatterns: [
      "Retract all axes to home position",
      "Stop spindle (M05)",
      "Turn off all coolant (M09)",
      "Cancel tool length compensation (G49)",
      "Output program end (M30 or M02)",
      "Rewind to program start if required",
    ],
    bestPractices: [
      "Use writeRetract(X, Y, Z) for full home return",
      "Output machine unlock codes if applicable",
      "Add program footer with statistics",
    ],
    warnings: [
      "M30 vs M02 selection depends on controller",
      "Some machines require specific shutdown sequence",
    ],
    relatedFunctions: ["onOpen", "writeRetract", "onTerminate"],
  },
  {
    name: "onTerminate",
    signature: "function onTerminate()",
    description:
      "Called after post processing is complete. Used for cleanup and final validation.",
    parameters: [],
    returnType: "void",
    category: "lifecycle",
    commonPatterns: [
      "Validate output file integrity",
      "Calculate and display statistics",
      "Close any open subprograms",
    ],
    bestPractices: ["Use for post-processing validation only"],
    warnings: ["Cannot output to NC file after onTerminate"],
    relatedFunctions: ["onClose"],
  },
  // Motion Functions
  {
    name: "onRapid",
    signature: "function onRapid(x, y, z)",
    description:
      "Called for rapid positioning moves (G00). Must handle axis formatting and modal output.",
    parameters: [
      { name: "x", type: "number", description: "Target X position" },
      { name: "y", type: "number", description: "Target Y position" },
      { name: "z", type: "number", description: "Target Z position" },
    ],
    returnType: "void",
    category: "motion",
    commonPatterns: [
      "Output G00 with formatted axis values",
      "Skip output if position unchanged (modal)",
      "Handle axis limits validation",
      "Apply coordinate transformation for rotated planes",
    ],
    bestPractices: [
      "Use xOutput.format(x) for modal position output",
      "Check maximumSpindleRPM for high-speed rapids",
      "Validate against machine envelope",
    ],
    warnings: [
      "Never output rapid during cutter compensation",
      "Check for collision before long rapids",
      "Some controllers require G01 with high feed instead",
    ],
    relatedFunctions: ["onLinear", "onRapid5D"],
  },
  {
    name: "onLinear",
    signature: "function onLinear(x, y, z, feed)",
    description:
      "Called for linear interpolation moves (G01). Handles feed rate output and cutting motion.",
    parameters: [
      { name: "x", type: "number", description: "Target X position" },
      { name: "y", type: "number", description: "Target Y position" },
      { name: "z", type: "number", description: "Target Z position" },
      { name: "feed", type: "number", description: "Feed rate in units/min" },
    ],
    returnType: "void",
    category: "motion",
    commonPatterns: [
      "Output G01 with axis values and F word",
      "Handle feed per revolution mode (G95)",
      "Apply radius compensation when active",
      "Split long moves for better accuracy",
    ],
    bestPractices: [
      "Use getFeed(feed) for formatted output",
      "Check pendingRadiusCompensation before output",
      "Monitor movement type for optimization",
    ],
    warnings: [
      "Feed rate must be specified for first cutting move",
      "Long linear moves may violate chord error tolerance",
    ],
    relatedFunctions: ["onRapid", "onCircular", "onLinear5D"],
  },
  {
    name: "onRapid5D",
    signature: "function onRapid5D(x, y, z, a, b, c)",
    description:
      "Called for 5-axis rapid positioning moves. Must handle rotary axis output and TCP compensation.",
    parameters: [
      { name: "x", type: "number", description: "Target X position" },
      { name: "y", type: "number", description: "Target Y position" },
      { name: "z", type: "number", description: "Target Z position" },
      { name: "a", type: "number", description: "A-axis rotation (radians)" },
      { name: "b", type: "number", description: "B-axis rotation (radians)" },
      { name: "c", type: "number", description: "C-axis rotation (radians)" },
    ],
    returnType: "void",
    category: "motion",
    commonPatterns: [
      "Convert radians to degrees for output",
      "Check for singularity (tool parallel to rotation axis)",
      "Handle rotary axis rewinding",
      "Apply TCP compensation if not handled by control",
    ],
    bestPractices: [
      "Use abcFormat for rotary axis formatting",
      "Check for large rotary moves (>170 degrees)",
      "Validate against rotary axis limits",
    ],
    warnings: [
      "Singularity handling is critical for BC head machines",
      "TCP must be active for simultaneous 5-axis",
      "Some controls require G43.4/G43.5 for TCP",
    ],
    relatedFunctions: ["onLinear5D", "onRapid"],
  },
  {
    name: "onLinear5D",
    signature: "function onLinear5D(x, y, z, a, b, c, feed)",
    description:
      "Called for simultaneous 5-axis linear interpolation. Core function for multi-axis machining.",
    parameters: [
      { name: "x", type: "number", description: "Target X position" },
      { name: "y", type: "number", description: "Target Y position" },
      { name: "z", type: "number", description: "Target Z position" },
      { name: "a", type: "number", description: "A-axis rotation (radians)" },
      { name: "b", type: "number", description: "B-axis rotation (radians)" },
      { name: "c", type: "number", description: "C-axis rotation (radians)" },
      { name: "feed", type: "number", description: "Feed rate" },
    ],
    returnType: "void",
    category: "motion",
    commonPatterns: [
      "Output G01 with all 5+ axes",
      "Use inverse time feed (G93) if required",
      "Apply machine compensation if TCP not available",
      "Check for and handle pole crossings",
    ],
    bestPractices: [
      "Set invokeOnLinear5D = true if onLinear5D exists",
      "Use getABC(currentSection) for start angles",
      "Monitor for large rotary moves",
    ],
    warnings: [
      "Inverse time feed requires recalculation for each move",
      "Rotary axis speed limits may require feed override",
      "TCP activation/deactivation must be managed carefully",
    ],
    relatedFunctions: ["onRapid5D", "onCircular"],
  },
  {
    name: "onCircular",
    signature: "function onCircular(clockwise, cx, cy, cz, x, y, z, feed)",
    description:
      "Called for circular, helical, and spiral interpolation (G02/G03). Must handle plane selection and center point calculation.",
    parameters: [
      {
        name: "clockwise",
        type: "boolean",
        description: "True for CW (G02), false for CCW (G03)",
      },
      { name: "cx", type: "number", description: "Center X coordinate" },
      { name: "cy", type: "number", description: "Center Y coordinate" },
      { name: "cz", type: "number", description: "Center Z coordinate" },
      { name: "x", type: "number", description: "End point X" },
      { name: "y", type: "number", description: "End point Y" },
      { name: "z", type: "number", description: "End point Z" },
      { name: "feed", type: "number", description: "Feed rate" },
    ],
    returnType: "void",
    category: "motion",
    commonPatterns: [
      "Use getCircularPlane() to determine XY/YZ/ZX plane",
      "Output G17/G18/G19 for plane selection",
      "Calculate IJK offsets from center to start point",
      "Handle full circles requiring intermediate point",
      "Linearize unsupported circular moves",
    ],
    bestPractices: [
      "Use maximumCircularRadius/minimumCircularRadius for validation",
      "Check circularMergeTolerance for consecutive arcs",
      "Handle helical moves (isHelical()) appropriately",
    ],
    warnings: [
      "Radius compensation cannot start on circular move",
      "Full circles (360°) require special handling",
      "Small radius arcs may need linearization",
    ],
    relatedFunctions: ["linearize", "isHelical", "isSpiral"],
  },
  // Cycle Functions
  {
    name: "onCyclePoint",
    signature: "function onCyclePoint(x, y, z)",
    description:
      "Called for each point in a drilling or probing cycle. Routes to appropriate cycle handler.",
    parameters: [
      { name: "x", type: "number", description: "Hole bottom X position" },
      { name: "y", type: "number", description: "Hole bottom Y position" },
      { name: "z", type: "number", description: "Hole bottom Z position" },
    ],
    returnType: "void",
    category: "cycle",
    commonPatterns: [
      "Check isFirstCyclePoint() for cycle definition output",
      "Route to writeDrillCycle, writeProbeCycle, or inspectionCycleInspect",
      "Handle cycle expansion for unsupported cycles",
      "Output positioning moves for subsequent holes",
    ],
    bestPractices: [
      "Use cycleType variable to identify cycle",
      "Check cycle.clearance and cycle.retract heights",
      "Handle FPR feedrates with allowFeedPerRevolutionDrilling",
    ],
    warnings: [
      "Expanded cycles must handle all positioning",
      "Some controllers require G80 between different cycles",
    ],
    relatedFunctions: ["onCycleEnd", "expandCyclePoint"],
  },
  {
    name: "onCycleEnd",
    signature: "function onCycleEnd()",
    description:
      "Called after all points in a cycle operation have been processed. Cancels the active cycle.",
    parameters: [],
    returnType: "void",
    category: "cycle",
    commonPatterns: [
      "Output G80 to cancel canned cycle",
      "Reset cycle-specific modal states",
      "Return to clearance plane if required",
    ],
    bestPractices: ["Check cycleExpanded before outputting G80"],
    warnings: [
      "Some controllers cancel cycle differently",
      "Ensure tool is at safe Z before next operation",
    ],
    relatedFunctions: ["onCyclePoint"],
  },
  // Command Functions
  {
    name: "onCommand",
    signature: "function onCommand(command)",
    description:
      "Called for machine commands like spindle control, coolant, and tool changes.",
    parameters: [
      {
        name: "command",
        type: "number",
        description: "Command constant (COMMAND_*)",
      },
    ],
    returnType: "void",
    category: "command",
    commonPatterns: [
      "Switch on command type to output appropriate M-code",
      "Handle COMMAND_STOP_SPINDLE, COMMAND_START_SPINDLE",
      "Process COMMAND_COOLANT_ON/OFF",
      "Support COMMAND_TOOL_MEASURE for probing",
    ],
    bestPractices: [
      "Use mapCommand object for M-code mapping",
      "Handle unsupported commands gracefully",
      "Log warning for COMMAND_UNSUPPORTED",
    ],
    warnings: ["Not all commands are supported on all controllers"],
    relatedFunctions: ["onSpindleSpeed", "setCoolant"],
  },
  {
    name: "onDwell",
    signature: "function onDwell(seconds)",
    description:
      "Called for dwell/pause commands (G04). Outputs timed pause in program execution.",
    parameters: [
      { name: "seconds", type: "number", description: "Dwell time in seconds" },
    ],
    returnType: "void",
    category: "command",
    commonPatterns: [
      "Output G04 with P word (seconds or milliseconds)",
      "Some controllers use X word instead of P",
      "Convert seconds to controller-specific units",
    ],
    bestPractices: [
      "Check controller specification for dwell format",
      "Use secFormat for proper decimal places",
    ],
    warnings: [
      "P word interpretation varies by controller",
      "Very long dwells may trigger watchdog timeout",
    ],
    relatedFunctions: [],
  },
  {
    name: "onComment",
    signature: "function onComment(message)",
    description:
      "Called to output a comment to the NC file. Must format according to controller requirements.",
    parameters: [
      { name: "message", type: "string", description: "Comment text" },
    ],
    returnType: "void",
    category: "command",
    commonPatterns: [
      "Use formatComment() to sanitize text",
      "Apply permittedCommentChars filtering",
      "Wrap in parentheses or use semicolon prefix",
      "Truncate to maximumLineLength if needed",
    ],
    bestPractices: [
      "Define comment settings at top of post",
      "Handle embedded parentheses in comment text",
    ],
    warnings: [
      "Some controllers have strict comment character limits",
      "Long comments may be truncated",
    ],
    relatedFunctions: ["writeComment", "formatComment"],
  },
  {
    name: "onSpindleSpeed",
    signature: "function onSpindleSpeed(spindleSpeed)",
    description:
      "Called when spindle speed changes during program. Outputs S word with optional range check.",
    parameters: [
      { name: "spindleSpeed", type: "number", description: "RPM value" },
    ],
    returnType: "void",
    category: "command",
    commonPatterns: [
      "Output S word with formatted RPM",
      "Check against maximumSpindleRPM",
      "Handle CSS mode on lathes",
      "Output gear change codes if required",
    ],
    bestPractices: [
      "Use rpmFormat for spindle speed",
      "Warn if speed exceeds machine limits",
    ],
    warnings: [
      "Speed changes during cutting may affect surface finish",
      "CSS mode requires special handling",
    ],
    relatedFunctions: ["onCommand"],
  },
  {
    name: "onRadiusCompensation",
    signature: "function onRadiusCompensation()",
    description:
      "Called when radius compensation mode changes. Handles G41/G42/G40 output.",
    parameters: [],
    returnType: "void",
    category: "command",
    commonPatterns: [
      "Check radiusCompensation variable for state",
      "Set pendingRadiusCompensation for delayed output",
      "Output G41 (left) or G42 (right) with D word",
      "Output G40 to cancel compensation",
    ],
    bestPractices: [
      "Start compensation on linear move, not arc",
      "Use D0 or actual diameter offset number",
    ],
    warnings: [
      "Cannot start/end compensation on rapid or arc",
      "Compensation direction depends on climb/conventional",
    ],
    relatedFunctions: ["onLinear", "onCircular"],
  },
  {
    name: "onOrientateSpindle",
    signature: "function onOrientateSpindle(angle)",
    description:
      "Called to orient spindle to specific angle. Used for boring cycles and tool changes.",
    parameters: [
      {
        name: "angle",
        type: "number",
        description: "Orientation angle in degrees",
      },
    ],
    returnType: "void",
    category: "command",
    commonPatterns: [
      "Output M19 with angle specification",
      "Some controllers use M05 + specific orientation code",
      "Handle zero vs non-zero orientation",
    ],
    bestPractices: ["Check controller capabilities for orientation"],
    warnings: ["Not all spindles support orientation"],
    relatedFunctions: ["onCommand"],
  },
  {
    name: "onMovement",
    signature: "function onMovement(movement)",
    description:
      "Called when movement type changes. Used for optimization and high-speed machining settings.",
    parameters: [
      {
        name: "movement",
        type: "number",
        description: "Movement type constant",
      },
    ],
    returnType: "void",
    category: "motion",
    commonPatterns: [
      "Track MOVEMENT_CUTTING, MOVEMENT_LEAD_IN, MOVEMENT_LEAD_OUT",
      "Adjust feed rates based on movement type",
      "Enable/disable high-speed modes",
    ],
    bestPractices: [
      "Use movement type for feed optimization",
      "Apply different tolerance for rapid vs cutting",
    ],
    warnings: ["Movement tracking is optional but recommended"],
    relatedFunctions: ["onLinear", "onRapid"],
  },
  // Manual NC Functions
  {
    name: "onManualNC",
    signature: "function onManualNC(command, value)",
    description:
      "Called for Manual NC commands inserted in operation tree. Routes to appropriate handler.",
    parameters: [
      {
        name: "command",
        type: "number",
        description: "Manual NC command type",
      },
      { name: "value", type: "any", description: "Command value/parameter" },
    ],
    returnType: "void",
    category: "manual",
    commonPatterns: [
      "Buffer commands for delayed execution",
      "Route COMMAND_ACTION to onParameter",
      "Handle COMMAND_DISPLAY_MESSAGE specially",
      "Use expandManualNC for standard handling",
    ],
    bestPractices: [
      "Execute buffered commands at appropriate point in operation",
      "Create templates for common Manual NC commands",
    ],
    warnings: [
      "Manual NC commands are processed before onSection",
      "May need buffering for proper placement",
    ],
    relatedFunctions: ["onParameter", "expandManualNC"],
  },
  {
    name: "onParameter",
    signature: "function onParameter(name, value)",
    description:
      "Called for parameter passing from CAM to post. Handles action commands and cycle parameters.",
    parameters: [
      { name: "name", type: "string", description: "Parameter name" },
      { name: "value", type: "any", description: "Parameter value" },
    ],
    returnType: "void",
    category: "manual",
    commonPatterns: [
      "Handle 'action' parameter for custom commands",
      "Parse colon-separated command:value format",
      "Store settings for later use in operations",
    ],
    bestPractices: [
      "Use parseChoice helper for enumerated values",
      "Validate parameter values before storing",
    ],
    warnings: ["Invalid action format should error clearly"],
    relatedFunctions: ["onManualNC"],
  },
  {
    name: "onPassThrough",
    signature: "function onPassThrough(text)",
    description:
      "Called for pass-through text to be output directly to NC file without modification.",
    parameters: [
      { name: "text", type: "string", description: "Text to output directly" },
    ],
    returnType: "void",
    category: "manual",
    commonPatterns: [
      "Split on comma for multiple lines",
      "Output each line with writeln",
      "No formatting or validation applied",
    ],
    bestPractices: [
      "Use sparingly - post has no control over output",
      "Prefer structured commands over pass-through",
    ],
    warnings: [
      "Pass-through text bypasses all safety checks",
      "May cause invalid NC file if misused",
    ],
    relatedFunctions: ["writeln"],
  },
  // Utility Functions
  {
    name: "onFeedMode",
    signature: "function onFeedMode(mode)",
    description:
      "Called when feed mode changes between per-minute and per-revolution.",
    parameters: [
      {
        name: "mode",
        type: "number",
        description: "FEED_PER_MINUTE or FEED_PER_REVOLUTION",
      },
    ],
    returnType: "void",
    category: "utility",
    commonPatterns: [
      "Output G94 for per-minute, G95 for per-revolution",
      "Update feedFormat based on mode",
      "Handle transition between modes",
    ],
    bestPractices: [
      "Track current feed mode to avoid redundant output",
      "Recalculate effective feed when mode changes",
    ],
    warnings: ["Not all machines support per-revolution feed"],
    relatedFunctions: ["onLinear", "getFeed"],
  },
];

// ============================================================================
// DRILLING CYCLE KNOWLEDGE BASE
// ============================================================================

export interface DrillingCycleType {
  cycleType: string;
  description: string;
  gCode: string;
  parameters: CycleParameter[];
  expandedBehavior: string;
  supportedCommands: string[];
  bestPractices: string[];
}

export interface CycleParameter {
  name: string;
  description: string;
  required: boolean;
  unit?: string;
}

export const DRILLING_CYCLES: DrillingCycleType[] = [
  {
    cycleType: "drilling",
    description: "Basic drilling - feed to depth and rapid out",
    gCode: "G81",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Hole depth", required: true },
      { name: "feedrate", description: "Drilling feed rate", required: true },
    ],
    expandedBehavior: "G00 to clearance, G00 to retract, G01 to depth, G00 out",
    supportedCommands: [],
    bestPractices: [
      "Use for shallow holes (depth < 3x diameter)",
      "Ensure proper chip evacuation with coolant",
      "Start with center drill for accuracy",
    ],
  },
  {
    cycleType: "counter-boring",
    description: "Feed to depth, dwell at bottom, rapid out",
    gCode: "G82",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Hole depth", required: true },
      { name: "feedrate", description: "Feed rate", required: true },
      { name: "dwell", description: "Dwell time at bottom (seconds)", required: true },
    ],
    expandedBehavior:
      "G00 to clearance, G00 to retract, G01 to depth, G04 dwell, G00 out",
    supportedCommands: [],
    bestPractices: [
      "Dwell improves hole bottom finish",
      "Use for counterbore and spotface operations",
      "Dwell time typically 0.1-0.5 seconds",
    ],
  },
  {
    cycleType: "chip-breaking",
    description: "Multiple pecks with partial retract to break chips",
    gCode: "G73",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Final depth", required: true },
      {
        name: "incrementalDepth",
        description: "Peck depth per cycle",
        required: true,
      },
      { name: "feedrate", description: "Feed rate", required: true },
    ],
    expandedBehavior:
      "Peck to incrementalDepth, retract chipBreakDistance, repeat until depth",
    supportedCommands: ["COMMAND_BREAK_CONTROL"],
    bestPractices: [
      "Use machineParameters.chipBreakDistance for retract amount",
      "Effective for moderately deep holes (3-5x diameter)",
      "Faster than deep drilling for most materials",
    ],
  },
  {
    cycleType: "deep-drilling",
    description: "Peck drilling with full retraction at end of each peck",
    gCode: "G83",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Final depth", required: true },
      { name: "incrementalDepth", description: "Peck depth", required: true },
      { name: "feedrate", description: "Feed rate", required: true },
      { name: "dwell", description: "Dwell at bottom (optional)", required: false },
    ],
    expandedBehavior:
      "Peck to incrementalDepth, full retract to clear chips, rapid back, repeat",
    supportedCommands: [],
    bestPractices: [
      "Use for deep holes (>5x diameter)",
      "Full retract ensures chip evacuation",
      "May need reduced peck depth for stringy materials",
      "If dwell not supported, expand the cycle",
    ],
  },
  {
    cycleType: "tapping",
    description: "Rigid or floating tap cycle",
    gCode: "G84",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Thread depth", required: true },
      { name: "pitch", description: "Thread pitch", required: true },
      {
        name: "threading",
        description: "right or left hand",
        required: false,
      },
    ],
    expandedBehavior:
      "Feed in synchronously, reverse spindle, feed out at same rate",
    supportedCommands: ["COMMAND_START_SPINDLE", "COMMAND_STOP_SPINDLE"],
    bestPractices: [
      "Rigid tapping requires synchronized spindle encoder",
      "Calculate feed = pitch × RPM",
      "Left-hand tapping uses G74",
      "Use pitch (E word) or FPR feedrate depending on controller",
    ],
  },
  {
    cycleType: "left-tapping",
    description: "Left-hand thread tapping cycle",
    gCode: "G74",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Thread depth", required: true },
      { name: "pitch", description: "Thread pitch", required: true },
    ],
    expandedBehavior:
      "CCW spindle feed in, CW spindle feed out (opposite of G84)",
    supportedCommands: ["COMMAND_START_SPINDLE", "COMMAND_STOP_SPINDLE"],
    bestPractices: [
      "Used for left-hand threads only",
      "Spindle direction opposite of right-hand tapping",
    ],
  },
  {
    cycleType: "boring",
    description: "Basic boring - feed in, stop spindle, rapid out",
    gCode: "G85",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Bore depth", required: true },
      { name: "feedrate", description: "Feed rate", required: true },
    ],
    expandedBehavior: "Feed in, feed out (no spindle stop)",
    supportedCommands: [],
    bestPractices: [
      "Produces better finish than drilling",
      "Use for precision holes requiring tight tolerance",
    ],
  },
  {
    cycleType: "stop-boring",
    description:
      "Boring with spindle stop and manual retract or oriented retract",
    gCode: "G86/G87/G88/G89",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Bore depth", required: true },
      { name: "feedrate", description: "Feed rate", required: true },
      { name: "dwell", description: "Dwell at bottom", required: false },
      { name: "shift", description: "Shift amount for retract", required: false },
    ],
    expandedBehavior: "Feed in, stop spindle, orient/shift, rapid out",
    supportedCommands: [
      "COMMAND_STOP_SPINDLE",
      "COMMAND_START_SPINDLE",
      "COMMAND_ORIENTATE_SPINDLE",
    ],
    bestPractices: [
      "G86: Stop spindle at bottom, rapid out (mars surface)",
      "G87: Oriented rapid in, bore out",
      "G88: Dwell at bottom, manual retract",
      "G89: Dwell and feed retract",
    ],
  },
  {
    cycleType: "fine-boring",
    description: "Precision boring with shift for retract",
    gCode: "G76",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "depth", description: "Bore depth", required: true },
      { name: "feedrate", description: "Feed rate", required: true },
      { name: "shift", description: "Shift direction and amount", required: true },
    ],
    expandedBehavior: "Feed in, orient spindle, shift tool off wall, rapid out",
    supportedCommands: ["COMMAND_ORIENTATE_SPINDLE"],
    bestPractices: [
      "Prevents tool drag marks on bore wall",
      "Requires spindle orientation capability",
      "Shift direction typically toward spindle center",
    ],
  },
  {
    cycleType: "reaming",
    description: "Ream operation with controlled feed in and out",
    gCode: "G85",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Ream depth", required: true },
      { name: "feedrate", description: "Feed rate", required: true },
    ],
    expandedBehavior: "Feed in at feedrate, feed out at same rate",
    supportedCommands: [],
    bestPractices: [
      "Feed out slowly to maintain surface finish",
      "Use floating reamer holder if possible",
      "Lower RPM than drilling (typically 50-70%)",
    ],
  },
  {
    cycleType: "gun-drilling",
    description: "Deep hole drilling with guided pilot and peck",
    gCode: "expanded",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "retract", description: "Retract plane", required: true },
      { name: "depth", description: "Final depth", required: true },
      { name: "incrementalDepth", description: "Peck depth", required: true },
      { name: "dwellDepth", description: "Depth for dwell", required: false },
      { name: "stopSpindle", description: "Stop spindle during positioning", required: false },
    ],
    expandedBehavior:
      "Always expanded - custom pecking with spindle control options",
    supportedCommands: ["COMMAND_STOP_SPINDLE", "COMMAND_START_SPINDLE"],
    bestPractices: [
      "Use for extremely deep holes (>10x diameter)",
      "Requires through-tool coolant",
      "May need spindle speed changes during cycle",
    ],
  },
  {
    cycleType: "break-through-drilling",
    description: "Drilling with reduced parameters before breakthrough",
    gCode: "expanded",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "depth", description: "Final depth", required: true },
      { name: "breakThroughDepth", description: "Depth to start reducing", required: true },
      {
        name: "breakThroughFeedrate",
        description: "Reduced feed for breakthrough",
        required: true,
      },
      {
        name: "breakThroughSpindleSpeed",
        description: "Reduced RPM for breakthrough",
        required: false,
      },
    ],
    expandedBehavior:
      "Normal drilling until breakThroughDepth, then reduce speed/feed",
    supportedCommands: [],
    bestPractices: [
      "Prevents burr and blowout on exit side",
      "Critical for thin-wall and sheet metal work",
      "Reduce feed by 50-75% for breakthrough",
    ],
  },
  {
    cycleType: "thread-milling",
    description: "Helical thread milling cycle",
    gCode: "expanded",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "depth", description: "Thread depth", required: true },
      { name: "pitch", description: "Thread pitch", required: true },
      { name: "diameter", description: "Thread major diameter", required: true },
      { name: "direction", description: "climb or conventional", required: true },
      { name: "threading", description: "right or left", required: true },
      {
        name: "compensation",
        description: "control, wear, or inverseWear",
        required: false,
      },
    ],
    expandedBehavior: "Helical interpolation with pitch per revolution",
    supportedCommands: [],
    bestPractices: [
      "Single-point thread mill for all pitches",
      "Multi-point thread mill for specific pitch",
      "Use climb milling for better finish",
    ],
  },
  {
    cycleType: "circular-pocket-milling",
    description: "Circular pocket milling cycle",
    gCode: "expanded",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "depth", description: "Pocket depth", required: true },
      { name: "diameter", description: "Pocket diameter", required: true },
      {
        name: "incrementalDepth",
        description: "Depth of cut per pass",
        required: true,
      },
      { name: "direction", description: "climb or conventional", required: true },
    ],
    expandedBehavior: "Helical entry with expanding circular passes",
    supportedCommands: [],
    bestPractices: [
      "Good for counterbore preparation",
      "Use helical entry for smooth engagement",
      "Multiple depth passes for deep pockets",
    ],
  },
  {
    cycleType: "bore-milling",
    description: "Bore hole using circular milling",
    gCode: "expanded",
    parameters: [
      { name: "clearance", description: "Clearance height", required: true },
      { name: "depth", description: "Bore depth", required: true },
      { name: "diameter", description: "Final bore diameter", required: true },
      { name: "direction", description: "climb or conventional", required: true },
    ],
    expandedBehavior: "Circular interpolation at specified diameter",
    supportedCommands: [],
    bestPractices: [
      "Use for oversized holes with standard tools",
      "Climb milling for better finish",
      "Can produce tighter tolerance than drilling",
    ],
  },
];

// ============================================================================
// UPK (UNIFIED POST KERNEL) SETTINGS KNOWLEDGE BASE
// ============================================================================

export interface UPKSwitch {
  name: string;
  description: string;
  values: { value: string | number; meaning: string }[];
  defaultValue: string | number;
  category:
    | "rotary"
    | "offset"
    | "control"
    | "home"
    | "5axis"
    | "millturn"
    | "misc";
  relatedSwitches: string[];
  bestPractices: string[];
}

export const UPK_SWITCHES: UPKSwitch[] = [
  // Rotary Switches
  {
    name: "userotlock",
    description: "Control output of rotary axis locking M codes",
    values: [
      { value: 0, meaning: "Do not output locking M codes" },
      { value: 1, meaning: "Output locking M codes" },
      { value: 2, meaning: "Rot & Tilt combined locking" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["userotbrake", "usetiltlock", "lockcomm"],
    bestPractices: [
      "Enable for machines with pneumatic/hydraulic axis locks",
      "Post automatically determines when to lock based on operation",
      "Use Misc Int 7 and 8 to override automatic behavior",
    ],
  },
  {
    name: "userotbrake",
    description: "Control output of rotary axis braking M codes",
    values: [
      { value: 0, meaning: "Do not output braking M codes" },
      { value: 1, meaning: "Output braking M codes" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["userotlock", "usetiltbrake"],
    bestPractices: [
      "Brakes are softer than locks",
      "Use for 3+2 positioning where axis doesn't need full lock",
    ],
  },
  {
    name: "one_revr",
    description: "Limit 3+2 rotary positioning range",
    values: [
      { value: 0, meaning: "No limit (full range)" },
      { value: 1, meaning: "Limit to 0 to 360 degrees" },
      { value: 2, meaning: "Limit to -180 to 180 degrees" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["one_revt"],
    bestPractices: [
      "Setting 2 (-180 to 180) minimizes rotation distance",
      "Only applies to 3+2 operations and safe indexing moves",
    ],
  },
  {
    name: "rot_feed",
    description: "Use calculated rotary feed values",
    values: [
      { value: 0, meaning: "Use programmed feed rate as-is" },
      { value: 1, meaning: "Calculate rotary feed (inverse time or deg/min)" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["frdegstp"],
    bestPractices: [
      "Modern machines with TCPM don't need calculated feeds",
      "Set to 1 only for older controls without TCP",
    ],
  },
  {
    name: "maxincrot",
    description: "Maximum incremental rotary motion before unwind",
    values: [{ value: "degrees", meaning: "Typically 170 degrees max" }],
    defaultValue: 170,
    category: "rotary",
    relatedSwitches: ["maxinctilt"],
    bestPractices: [
      "Large rotary moves can cause collisions",
      "Should not exceed 170 degrees in most cases",
      "Post will unwind or flip solution when limit reached",
    ],
  },
  {
    name: "usetiltlock",
    description: "Control output of tilt axis locking M codes",
    values: [
      { value: 0, meaning: "Do not output locking M codes" },
      { value: 1, meaning: "Output locking M codes" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["usetiltbrake", "userotlock"],
    bestPractices: [
      "Enable for machines with tilt axis brake/lock",
      "Used in conjunction with MiscInt 8 for override",
    ],
  },
  {
    name: "usetiltbrake",
    description: "Control output of tilt axis braking M codes",
    values: [
      { value: 0, meaning: "Do not output braking M codes" },
      { value: 1, meaning: "Output braking M codes" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["usetiltlock", "userotbrake"],
    bestPractices: [
      "Brakes provide softer hold than full locks",
      "May be needed for heavy head configurations",
    ],
  },
  {
    name: "lockcomm",
    description: "Output comments with lock/brake codes",
    values: [
      { value: 0, meaning: "Do not output comments" },
      { value: 1, meaning: "Output comments with lock codes" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["userotlock", "usetiltlock"],
    bestPractices: [
      "Useful for debugging and operator understanding",
      "Comments indicate lock/unlock status",
    ],
  },
  {
    name: "one_revt",
    description: "Limit 3+2 tilt positioning range",
    values: [
      { value: 0, meaning: "No limit (full range)" },
      { value: 1, meaning: "Limit to 0 to 360 degrees" },
      { value: 2, meaning: "Limit to -180 to 180 degrees" },
    ],
    defaultValue: 0,
    category: "rotary",
    relatedSwitches: ["one_revr"],
    bestPractices: [
      "Matches rotary axis range limiting",
      "Setting 2 minimizes indexing distance",
    ],
  },
  {
    name: "frdegstp",
    description: "Step limit for rotary feed output in deg/min",
    values: [{ value: "degrees/min", meaning: "Minimum change to output new feed" }],
    defaultValue: 1,
    category: "rotary",
    relatedSwitches: ["rot_feed"],
    bestPractices: [
      "Reduces redundant feed rate output",
      "Only outputs when change exceeds this threshold",
    ],
  },
  {
    name: "maxinctilt",
    description: "Maximum incremental tilt motion before unwind",
    values: [{ value: "degrees", meaning: "Typically 170 degrees max" }],
    defaultValue: 170,
    category: "rotary",
    relatedSwitches: ["maxincrot"],
    bestPractices: [
      "Same concept as maxincrot for tilt axis",
      "Large moves trigger unwind or solution flip",
    ],
  },
  {
    name: "force_wcs",
    description: "Force WCS output at every tool change",
    values: [
      { value: 0, meaning: "Only output WCS when changed" },
      { value: 1, meaning: "Force WCS output at every tool change" },
    ],
    defaultValue: 0,
    category: "offset",
    relatedSwitches: ["workofs_out", "wcstype"],
    bestPractices: [
      "Enabled by default at start of file and after retracts",
      "Force output for safety-critical applications",
    ],
  },
  // Machine Orientation and Offset
  {
    name: "workofs_out",
    description: "Work offset output control",
    values: [
      { value: -1, meaning: "Use output from Mastercam" },
      { value: 0, meaning: "Always G54" },
      { value: 6, meaning: "G54.1 P1" },
      { value: -2, meaning: "Main=1st offset, Sub=2nd (mill-turn)" },
    ],
    defaultValue: -1,
    category: "offset",
    relatedSwitches: ["wcstype", "force_wcs"],
    bestPractices: [
      "Use -1 to respect CAM programming",
      "Use fixed offset for dedicated fixtures",
      "-2 is mill-turn specific for dual spindle machines",
    ],
  },
  {
    name: "wcstype",
    description: "Work coordinate system output style",
    values: [
      { value: 0, meaning: "G92 at start only" },
      { value: 1, meaning: "G92 at each toolchange" },
      { value: 2, meaning: "G54 style offsets" },
      { value: 3, meaning: "Off - no offset output" },
    ],
    defaultValue: 2,
    category: "offset",
    relatedSwitches: ["workofs_out", "force_wcs"],
    bestPractices: [
      "G54 style (2) is most common modern approach",
      "G92 shift is older method - use when required by control",
    ],
  },
  {
    name: "shiftlocation",
    description: "Tool plane shift application point",
    values: [
      { value: 0, meaning: "Shift in world coords before plane rotation" },
      { value: 1, meaning: "Shift with plane rotation (requires tilt plane)" },
      { value: 2, meaning: "Shift in plane coords after rotation" },
    ],
    defaultValue: 0,
    category: "offset",
    relatedSwitches: ["ignoreorg", "tiltplane"],
    bestPractices: [
      "Only set to 1 if control has tilted plane function",
      "Controls how WCS vs tool plane origin difference is applied",
    ],
  },
  // Advanced Control Options
  {
    name: "tcp",
    description: "Tool center point management enable",
    values: [
      { value: 0, meaning: "TCP off - post compensates for kinematics" },
      { value: 1, meaning: "TCP on - control handles transformation" },
      { value: 2, meaning: "Table fixed coordinate system" },
    ],
    defaultValue: 0,
    category: "control",
    relatedSwitches: ["tiltplane", "vector", "postcomp"],
    bestPractices: [
      "Enable if machine has G43.4/G43.5 or TCPM function",
      "When off, post must compensate for rotary axis motion",
      "Table fixed is for specific machine configurations",
    ],
  },
  {
    name: "tiltplane",
    description: "Enable tilted work planes (G68.2, etc.)",
    values: [
      { value: 0, meaning: "Off" },
      { value: 1, meaning: "On" },
      { value: 2, meaning: "On, not for Z/X tool axes" },
      { value: 3, meaning: "On, not for Z tool axis" },
    ],
    defaultValue: 0,
    category: "control",
    relatedSwitches: ["tcp", "tiltcomb", "shiftlocation"],
    bestPractices: [
      "Enables coordinate system rotation for 3+2",
      "Setting 2/3 avoids tilt plane for aligned tool vectors",
      "Combines with tiltcomb for spatial angle selection",
    ],
  },
  {
    name: "vector",
    description: "5-axis output mode",
    values: [
      { value: 0, meaning: "Physical rotary/tilt angles output" },
      { value: 1, meaning: "Vector output (IJK direction)" },
    ],
    defaultValue: 0,
    category: "control",
    relatedSwitches: ["tcp"],
    bestPractices: [
      "Vector output useful for controls that accept tool direction",
      "Physical angles are more common",
    ],
  },
  // Home Motion
  {
    name: "use_home",
    description: "Home position source",
    values: [
      { value: 0, meaning: "Use post-defined home (x_home, etc.)" },
      { value: 1, meaning: "Use Mastercam operation home positions" },
    ],
    defaultValue: 0,
    category: "home",
    relatedSwitches: ["home_style", "x_home_in", "x_home_mm"],
    bestPractices: [
      "Use 0 for consistent machine-specific home positions",
      "Use 1 when operations define specific clearance positions",
    ],
  },
  {
    name: "home_style",
    description: "Home position command style",
    values: [
      { value: 0, meaning: "G90 G53 (absolute machine coordinates)" },
      { value: 1, meaning: "G91 G28 (incremental to home)" },
      { value: 2, meaning: "G91 G30 (incremental to second home)" },
      { value: 3, meaning: "G90 (absolute with no special code)" },
    ],
    defaultValue: 0,
    category: "home",
    relatedSwitches: ["use_home", "use_g_inc"],
    bestPractices: [
      "G53 is most common for modern controls",
      "G28 requires intermediate point for safe clearance",
      "Controller specific - verify before changing",
    ],
  },
  // 5-Axis Specific
  {
    name: "pivotdis",
    description: "Distance from tilt axis center to gauge line (mm)",
    values: [{ value: "mm", meaning: "Machine-specific dimension" }],
    defaultValue: 0,
    category: "5axis",
    relatedSwitches: ["offsetdis", "postcomp", "vrtltip"],
    bestPractices: [
      "Only relevant when post compensates for rotary axis",
      "Measure from collet line to tilt axis centerline",
      "Critical for accurate 5-axis without TCP",
    ],
  },
  {
    name: "cleardis",
    description: "Retract clearance for 5-axis unwinds (mm)",
    values: [{ value: "mm", meaning: "Safe retract distance along tool vector" }],
    defaultValue: 25,
    category: "5axis",
    relatedSwitches: ["maxincrot", "maxinctilt"],
    bestPractices: [
      "Used when operation doesn't provide clearance value",
      "Must clear all fixtures and clamps",
      "Typical values: 25-50mm",
    ],
  },
  {
    name: "postcomp",
    description: "Post compensates for tool length",
    values: [
      { value: 0, meaning: "No - control or TCP handles it" },
      { value: 1, meaning: "Yes - post shifts coordinates" },
    ],
    defaultValue: 0,
    category: "5axis",
    relatedSwitches: ["tcp", "pivotdis", "offsetdis", "vrtltip"],
    bestPractices: [
      "Only enable when machine lacks TCP capability",
      "Requires accurate pivotdis and offsetdis values",
      "Post must know full machine kinematics",
    ],
  },
  // Mill-Turn Specific
  {
    name: "Vtl",
    description: "VTL/mill-turn programming mode",
    values: [
      { value: 0, meaning: "Standard mill-turn with Top WCS" },
      { value: 1, meaning: "VTL mode with Lathe Z = World Z" },
    ],
    defaultValue: 0,
    category: "millturn",
    relatedSwitches: ["yturn"],
    bestPractices: [
      "VTL mode for vertical turning lathes",
      "Affects coordinate system orientation",
    ],
  },
  {
    name: "yturn",
    description: "Y output for turning operations",
    values: [
      { value: 0, meaning: "No Y output for turning" },
      { value: 1, meaning: "Output Y0 at start of turning operations" },
    ],
    defaultValue: 0,
    category: "millturn",
    relatedSwitches: ["Vtl"],
    bestPractices: ["Enable if machine needs explicit Y0 for turning mode"],
  },
  {
    name: "old_new_sw",
    description: "Lathe canned cycle format",
    values: [
      { value: 0, meaning: "Old format (6T style)" },
      { value: 1, meaning: "New format (0T+ style)" },
    ],
    defaultValue: 1,
    category: "millturn",
    relatedSwitches: [],
    bestPractices: [
      "Depends on control manufacturer and version",
      "Fanuc 6T uses different format than modern Fanuc",
    ],
  },
  // Miscellaneous Control
  {
    name: "hel_lead",
    description: "Helical move output with lead/pitch",
    values: [
      { value: 0, meaning: "Standard helical output" },
      { value: 1, meaning: "Use lead/pitch value for helical" },
    ],
    defaultValue: 0,
    category: "misc",
    relatedSwitches: [],
    bestPractices: [
      "Enable for controls that use K (pitch) for helical moves",
    ],
  },
  {
    name: "tool_table",
    description: "Output tool table in program header",
    values: [
      { value: 0, meaning: "No tool table output" },
      { value: 1, meaning: "Output tool table" },
    ],
    defaultValue: 1,
    category: "misc",
    relatedSwitches: [],
    bestPractices: [
      "Helps operators verify tool setup",
      "Can include tool description, diameter, length",
    ],
  },
  {
    name: "use_pitch",
    description: "Tapping cycle feed output",
    values: [
      { value: 0, meaning: "Use feedrate (F word)" },
      { value: 1, meaning: "Use pitch (E or F word as pitch)" },
    ],
    defaultValue: 0,
    category: "misc",
    relatedSwitches: ["rigid_tap"],
    bestPractices: [
      "Some controls require pitch instead of feed for tapping",
      "Pitch = 1/TPI (inch) or mm per thread (metric)",
    ],
  },
  {
    name: "rigid_tap",
    description: "Rigid tapping mode",
    values: [
      { value: 0, meaning: "Floating tap output" },
      { value: 1, meaning: "Rigid tap (M29 output, suppress spindle)" },
    ],
    defaultValue: 0,
    category: "misc",
    relatedSwitches: ["use_pitch"],
    bestPractices: [
      "Rigid tapping requires synchronized spindle",
      "M29 typically precedes G84 for rigid mode",
      "May suppress S word in cycle call",
    ],
  },
  {
    name: "ixtol",
    description: "Index tolerance for rotary axis (degrees)",
    values: [{ value: "degrees", meaning: "Tolerance for index error check" }],
    defaultValue: 0.001,
    category: "misc",
    relatedSwitches: [],
    bestPractices: [
      "Error generated if calculated angle deviates by more than this",
      "Only applies to index-only rotary axes",
      "Machine definition must specify index increment",
    ],
  },
  {
    name: "force_output",
    description: "Force modal G-code output",
    values: [
      { value: 0, meaning: "Modal output at toolchanges" },
      { value: 1, meaning: "Force all G-codes on every block" },
    ],
    defaultValue: 0,
    category: "misc",
    relatedSwitches: [],
    bestPractices: [
      "Modal is more efficient (smaller file)",
      "Force output useful for debugging or safety-critical machines",
    ],
  },
];

// ============================================================================
// MISCELLANEOUS INTEGERS AND REALS KNOWLEDGE BASE
// ============================================================================

export interface MiscValue {
  id: string;
  name: string;
  description: string;
  values: { value: number | string; meaning: string }[];
  category: "milling" | "millturn" | "general";
  machineType: string[];
}

export const MISC_VALUES: MiscValue[] = [
  {
    id: "MiscInt2",
    name: "Absolute/Incremental Output",
    description: "Controls absolute or incremental coordinate output in main program",
    values: [
      { value: 0, meaning: "Absolute (G90)" },
      { value: 1, meaning: "Incremental (G91)" },
    ],
    category: "general",
    machineType: ["mill", "millturn"],
  },
  {
    id: "MiscInt3",
    name: "Surface Normal Vectors",
    description: "Output surface normal vectors for 3D tool wear compensation",
    values: [
      { value: 0, meaning: "Disabled" },
      { value: 1, meaning: "Enabled (5-axis toolpaths, ball nose tools)" },
    ],
    category: "milling",
    machineType: ["5axis"],
  },
  {
    id: "MiscInt4",
    name: "Rotary Axis Solution",
    description: "Select which of 2 possible rotary axis solutions to start with",
    values: [
      { value: 0, meaning: "Solution 1" },
      { value: 1, meaning: "Solution 2" },
    ],
    category: "milling",
    machineType: ["5axis"],
  },
  {
    id: "MiscInt5",
    name: "TCP Mode Selection (Mill-Turn)",
    description: "Run multi-axis without TCP function",
    values: [
      { value: 0, meaning: "Use TCP function" },
      { value: 1, meaning: "Non-TCP mode (changes feed, TLC, coords)" },
    ],
    category: "millturn",
    machineType: ["millturn"],
  },
  {
    id: "MiscInt6",
    name: "Feed Per Revolution",
    description: "Change from units/min to units/rev output",
    values: [
      { value: 0, meaning: "Feed per minute" },
      { value: 1, meaning: "Feed per revolution (post calculates)" },
    ],
    category: "general",
    machineType: ["mill", "millturn"],
  },
  {
    id: "MiscInt7",
    name: "Rotary Axis Lock Override",
    description: "Override automatic rotary axis lock selection",
    values: [
      { value: 0, meaning: "Automatic (post decides based on cut type)" },
      { value: 1, meaning: "Force lock rotary axis" },
      { value: 2, meaning: "Turn brake on" },
      { value: 3, meaning: "Turn off locking" },
    ],
    category: "milling",
    machineType: ["4axis", "5axis"],
  },
  {
    id: "MiscInt8",
    name: "Tilt Axis Lock Override",
    description: "Override automatic tilt axis lock selection",
    values: [
      { value: 0, meaning: "Automatic (post decides based on cut type)" },
      { value: 1, meaning: "Force lock tilt axis" },
      { value: 2, meaning: "Turn brake on" },
      { value: 3, meaning: "Turn off locking" },
    ],
    category: "milling",
    machineType: ["5axis"],
  },
  {
    id: "MiscInt9",
    name: "Rotary Interpolation Mode (Mill-Turn)",
    description: "Face or diameter rotary interpolation selection",
    values: [
      { value: 0, meaning: "Face (G12.1)" },
      { value: 1, meaning: "Diameter (G07.1)" },
    ],
    category: "millturn",
    machineType: ["millturn"],
  },
  {
    id: "MiscInt10",
    name: "Program Stop Type",
    description: "Force program stop vs optional stop",
    values: [
      { value: 0, meaning: "Optional stop (M01)" },
      { value: 1, meaning: "Program stop (M00)" },
    ],
    category: "general",
    machineType: ["mill", "millturn", "lathe"],
  },
  {
    id: "MiscReal1",
    name: "High Speed Machining Method",
    description: "Select HSM function if available on control",
    values: [
      { value: 0, meaning: "Off" },
      { value: 1, meaning: "G08 P1 - Advanced look ahead" },
      { value: 2, meaning: "G05.1 Q1 R - AI contour control" },
      { value: 3, meaning: "G05 P10000 R - High precision contour" },
    ],
    category: "milling",
    machineType: ["mill", "5axis"],
  },
  {
    id: "MiscReal2",
    name: "HSM R Coefficient",
    description: "R value used with Misc Real 1 HSM functions",
    values: [{ value: "varies", meaning: "Control-specific coefficient" }],
    category: "milling",
    machineType: ["mill", "5axis"],
  },
  {
    id: "MiscReal7",
    name: "Null Toolchange Retract (Start)",
    description: "Retract motion between operations with same tool",
    values: [
      { value: 0, meaning: "Along tool axis (if supported)" },
      { value: 1, meaning: "Single axis retract (typically Z)" },
      { value: 2, meaning: "Retract + move to XY home" },
      { value: 3, meaning: "No retract (stay at clearance)" },
    ],
    category: "general",
    machineType: ["mill", "5axis", "millturn"],
  },
  {
    id: "MiscReal8",
    name: "Null Toolchange Retract (Mid)",
    description:
      "Retract motion during operation (between chains, depth cuts)",
    values: [
      { value: 0, meaning: "Along tool axis (if supported)" },
      { value: 1, meaning: "Single axis retract (typically Z)" },
      { value: 2, meaning: "Retract + move to XY home" },
      { value: 3, meaning: "No retract (stay at clearance)" },
    ],
    category: "general",
    machineType: ["mill", "5axis", "millturn"],
  },
  {
    id: "MiscReal9",
    name: "Rotary Axis Start Position Control",
    description: "Control rotary axis position at operation start",
    values: [
      { value: 0, meaning: "Use calculated position" },
      { value: 1, meaning: "Use value from MiscReal10" },
      { value: 2, meaning: "Use last operation's position" },
      { value: 3, meaning: "Use revolutions from MiscReal10" },
      { value: 4, meaning: "Prompt user for value" },
    ],
    category: "milling",
    machineType: ["4axis", "5axis"],
  },
  {
    id: "MiscReal10",
    name: "Rotary Axis Value",
    description: "Value or revolution count for MiscReal9",
    values: [{ value: "varies", meaning: "Physical angle or revolution count" }],
    category: "milling",
    machineType: ["4axis", "5axis"],
  },
];

// ============================================================================
// CIRCULAR INTERPOLATION SETTINGS
// ============================================================================

export interface CircularSetting {
  name: string;
  description: string;
  defaultValue: number | string | boolean;
  unit: string;
  bestPractices: string[];
}

export const CIRCULAR_SETTINGS: CircularSetting[] = [
  {
    name: "allowHelicalMoves",
    description:
      "Allow helical moves (circular with Z movement) to be passed to onCircular",
    defaultValue: true,
    unit: "boolean",
    bestPractices: [
      "Set false if control doesn't support helical interpolation",
      "Helical moves will be linearized if disabled",
    ],
  },
  {
    name: "allowSpiralMoves",
    description:
      "Allow spiral moves (start and end radii differ) to be passed to onCircular",
    defaultValue: false,
    unit: "boolean",
    bestPractices: [
      "Most controls don't support true spiral interpolation",
      "Enable only for controls with G02.4/G03.4 or similar",
    ],
  },
  {
    name: "maximumCircularRadius",
    description:
      "Maximum radius for circular moves - larger arcs are linearized",
    defaultValue: 1000,
    unit: "mm",
    bestPractices: [
      "Set based on control's arc limit",
      "Very large arcs are indistinguishable from lines",
    ],
  },
  {
    name: "minimumCircularRadius",
    description:
      "Minimum radius for circular moves - smaller arcs are linearized",
    defaultValue: 0.01,
    unit: "mm",
    bestPractices: [
      "Very small arcs may cause control errors",
      "Linearization produces equivalent motion",
    ],
  },
  {
    name: "minimumCircularSweep",
    description: "Minimum angular sweep for circular output (radians)",
    defaultValue: 0.01,
    unit: "radians",
    bestPractices: ["Tiny arcs are more efficiently output as linear moves"],
  },
  {
    name: "maximumCircularSweep",
    description: "Maximum angular sweep per circular block (radians)",
    defaultValue: Math.PI * 2,
    unit: "radians",
    bestPractices: [
      "Full circles (2π) may need intermediate point on some controls",
      "Set to π for controls requiring half circles max",
    ],
  },
  {
    name: "circularInputTolerance",
    description:
      "Tolerance for converting near-circular helical moves to pure circular",
    defaultValue: 0.0001,
    unit: "mm",
    bestPractices: [
      "Small helical Z movement within tolerance becomes circular",
      "Set to 0 to disable this feature",
    ],
  },
  {
    name: "circularMergeTolerance",
    description:
      "Tolerance for merging consecutive circular records into single arc",
    defaultValue: 0.001,
    unit: "mm",
    bestPractices: [
      "CAM may break circles into multiple arcs",
      "Merging reduces file size and improves motion",
    ],
  },
  {
    name: "tolerance",
    description: "Tolerance for linearizing circular moves",
    defaultValue: 0.01,
    unit: "mm",
    bestPractices: [
      "Controls chord error when circular is linearized",
      "Smaller values produce more linear segments",
    ],
  },
];

// ============================================================================
// POST PROCESSOR KNOWLEDGE ENGINE CLASS
// ============================================================================

export class PostProcessorKnowledgeEngine {
  private static instance: PostProcessorKnowledgeEngine;

  private constructor() {}

  static getInstance(): PostProcessorKnowledgeEngine {
    if (!PostProcessorKnowledgeEngine.instance) {
      PostProcessorKnowledgeEngine.instance =
        new PostProcessorKnowledgeEngine();
    }
    return PostProcessorKnowledgeEngine.instance;
  }

  /**
   * Get entry function documentation
   */
  getEntryFunction(name: string): EntryFunction | undefined {
    return ENTRY_FUNCTIONS.find(
      (f) => f.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get all entry functions by category
   */
  getEntryFunctionsByCategory(
    category: EntryFunction["category"]
  ): EntryFunction[] {
    return ENTRY_FUNCTIONS.filter((f) => f.category === category);
  }

  /**
   * Get drilling cycle information
   */
  getDrillingCycle(cycleType: string): DrillingCycleType | undefined {
    return DRILLING_CYCLES.find((c) => c.cycleType === cycleType);
  }

  /**
   * Get all drilling cycles
   */
  getAllDrillingCycles(): DrillingCycleType[] {
    return [...DRILLING_CYCLES];
  }

  /**
   * Get UPK switch information
   */
  getUPKSwitch(name: string): UPKSwitch | undefined {
    return UPK_SWITCHES.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get UPK switches by category
   */
  getUPKSwitchesByCategory(category: UPKSwitch["category"]): UPKSwitch[] {
    return UPK_SWITCHES.filter((s) => s.category === category);
  }

  /**
   * Get misc value information
   */
  getMiscValue(id: string): MiscValue | undefined {
    return MISC_VALUES.find((m) => m.id.toLowerCase() === id.toLowerCase());
  }

  /**
   * Get circular interpolation settings
   */
  getCircularSettings(): CircularSetting[] {
    return [...CIRCULAR_SETTINGS];
  }

  /**
   * Search knowledge base across all categories
   */
  search(query: string): {
    entryFunctions: EntryFunction[];
    drillingCycles: DrillingCycleType[];
    upkSwitches: UPKSwitch[];
    miscValues: MiscValue[];
  } {
    const lowerQuery = query.toLowerCase();

    return {
      entryFunctions: ENTRY_FUNCTIONS.filter(
        (f) =>
          f.name.toLowerCase().includes(lowerQuery) ||
          f.description.toLowerCase().includes(lowerQuery) ||
          f.commonPatterns.some((p) => p.toLowerCase().includes(lowerQuery))
      ),
      drillingCycles: DRILLING_CYCLES.filter(
        (c) =>
          c.cycleType.toLowerCase().includes(lowerQuery) ||
          c.description.toLowerCase().includes(lowerQuery) ||
          c.gCode.toLowerCase().includes(lowerQuery)
      ),
      upkSwitches: UPK_SWITCHES.filter(
        (s) =>
          s.name.toLowerCase().includes(lowerQuery) ||
          s.description.toLowerCase().includes(lowerQuery)
      ),
      miscValues: MISC_VALUES.filter(
        (m) =>
          m.name.toLowerCase().includes(lowerQuery) ||
          m.description.toLowerCase().includes(lowerQuery)
      ),
    };
  }

  /**
   * Get recommended settings for a machine type
   */
  getRecommendedSettings(machineType: string): {
    switches: UPKSwitch[];
    miscValues: MiscValue[];
    tips: string[];
  } {
    const normalizedType = machineType.toLowerCase();
    let switches: UPKSwitch[] = [];
    let miscValues: MiscValue[] = [];
    const tips: string[] = [];

    if (normalizedType.includes("5axis") || normalizedType.includes("5-axis")) {
      switches = UPK_SWITCHES.filter(
        (s) => s.category === "5axis" || s.category === "rotary"
      );
      miscValues = MISC_VALUES.filter(
        (m) =>
          m.machineType.includes("5axis") || m.machineType.includes("4axis")
      );
      tips.push(
        "Enable TCP (tcp=1) if machine has G43.4/G43.5 capability",
        "Set maxincrot and maxinctilt to prevent large rotary moves",
        "Configure tiltplane for 3+2 positioning",
        "Verify pivotdis and offsetdis for post compensation"
      );
    } else if (normalizedType.includes("millturn")) {
      switches = UPK_SWITCHES.filter(
        (s) =>
          s.category === "millturn" ||
          s.category === "rotary" ||
          s.category === "offset"
      );
      miscValues = MISC_VALUES.filter((m) =>
        m.machineType.includes("millturn")
      );
      tips.push(
        "Configure workofs_out=-2 for main/sub spindle offsets",
        "Set xmult values for diameter vs radius output per cut type",
        "Verify old_new_sw for correct canned cycle format"
      );
    } else if (
      normalizedType.includes("mill") ||
      normalizedType.includes("3axis")
    ) {
      switches = UPK_SWITCHES.filter(
        (s) =>
          s.category === "offset" ||
          s.category === "home" ||
          s.category === "misc"
      );
      miscValues = MISC_VALUES.filter((m) => m.machineType.includes("mill"));
      tips.push(
        "Configure home_style for your control's reference method",
        "Set HSM mode (MiscReal1) if available on control",
        "Verify wcstype matches your work offset setup"
      );
    }

    return { switches, miscValues, tips };
  }

  /**
   * Validate post processor configuration
   */
  validateConfiguration(config: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check TCP vs postcomp conflict
    if (config.tcp === 1 && config.postcomp === 1) {
      errors.push(
        "Cannot enable both TCP (tcp=1) and post compensation (postcomp=1)"
      );
    }

    // Check 5-axis settings consistency
    if (config.postcomp === 1) {
      if (!config.pivotdis) {
        errors.push(
          "Post compensation enabled but pivotdis not set - required for accurate output"
        );
      }
      if (!config.offsetdis && config.offsetdis !== 0) {
        warnings.push("Post compensation enabled - verify offsetdis is correct");
      }
    }

    // Check rotary limits
    if (typeof config.maxincrot === "number" && config.maxincrot > 180) {
      warnings.push(
        "maxincrot > 180° may cause unsafe rotary moves - consider reducing"
      );
    }

    // Check work offset settings
    if (config.wcstype === 0 || config.wcstype === 1) {
      warnings.push(
        "G92 work offset style is legacy - consider G54 style (wcstype=2)"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate code snippet for entry function
   */
  generateFunctionTemplate(functionName: string): string | null {
    const func = this.getEntryFunction(functionName);
    if (!func) return null;

    const params = func.parameters.map((p) => p.name).join(", ");
    const paramDocs = func.parameters
      .map((p) => ` * @param {${p.type}} ${p.name} - ${p.description}`)
      .join("\n");

    return `/**
 * ${func.description}
${paramDocs}
 */
function ${func.name}(${params}) {
  // ${func.commonPatterns[0] || "Implementation here"}
  ${func.bestPractices.map((bp) => `// Best practice: ${bp}`).join("\n  ")}
}`;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStatistics(): {
    entryFunctions: number;
    drillingCycles: number;
    upkSwitches: number;
    miscValues: number;
    circularSettings: number;
    totalItems: number;
  } {
    return {
      entryFunctions: ENTRY_FUNCTIONS.length,
      drillingCycles: DRILLING_CYCLES.length,
      upkSwitches: UPK_SWITCHES.length,
      miscValues: MISC_VALUES.length,
      circularSettings: CIRCULAR_SETTINGS.length,
      totalItems:
        ENTRY_FUNCTIONS.length +
        DRILLING_CYCLES.length +
        UPK_SWITCHES.length +
        MISC_VALUES.length +
        CIRCULAR_SETTINGS.length,
    };
  }
}

// Export singleton instance
export const postProcessorKnowledgeEngine =
  PostProcessorKnowledgeEngine.getInstance();

export default postProcessorKnowledgeEngine;
