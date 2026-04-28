/**
 * ControllerKnowledgeEngine.ts
 *
 * AI-Powered Controller Knowledge Base for Post Processor Intelligence
 *
 * This engine provides comprehensive knowledge about CNC machine controllers,
 * enabling intelligent post processor generation and conversion using deep
 * reasoning and cross-domain synthesis.
 *
 * Supported Controller Families:
 * - Hurco WinMax (BNC/ISNC modes)
 * - Haas (NGC - Next Generation Control)
 * - Fanuc (0i, 30i, 31i, etc.)
 * - Okuma OSP (P200, P300)
 * - Siemens SINUMERIK (840D, ONE)
 * - Mazatrol (Matrix, Smart, SmoothX)
 * - Heidenhain TNC (iTNC 530, TNC 640)
 * - Mitsubishi (M70, M80)
 * - Fagor (CNC 8070)
 * - Centroid (Acorn, Allin1DC)
 *
 * @module engines/ControllerKnowledgeEngine
 */

export type ControllerFamily =
  | "hurco_winmax"
  | "haas_ngc"
  | "fanuc"
  | "okuma_osp"
  | "siemens_sinumerik"
  | "mazatrol"
  | "heidenhain_tnc"
  | "mitsubishi"
  | "fagor"
  | "centroid"
  | "brother_c00"
  | "generic_iso";

export interface ControllerProfile {
  family: ControllerFamily;
  name: string;
  versions: string[];
  manufacturer: string;
  programmingStyle: "conversational" | "iso" | "hybrid";
  features: ControllerFeatures;
  resources: ResourceMapping[];
  cycleDefinitions: CycleDefinition[];
  mCodeMappings: MCodeMapping[];
  gCodeDialect: GCodeDialect;
}

export interface ControllerFeatures {
  rigidTapping: boolean;
  highSpeedMachining: boolean;
  lookAhead: number; // blocks
  maxBlockRate: number; // blocks/sec
  maxAxes: number;
  supportsNURBS: boolean;
  supportsHelical: boolean;
  supportsCutterComp: boolean;
  supportsToolLength: boolean;
  supportsWorkOffset: boolean;
  supportsProbing: boolean;
  supportsSubprograms: boolean;
  supportsMacros: boolean;
  supportsParametricProgramming: boolean;
  tcp5Axis: boolean;
  rtcp: boolean;
  smoothingModes: string[];
  uniqueFeatures: string[];
}

export interface ResourceMapping {
  type: "pdf" | "cps" | "post" | "config" | "manual" | "training";
  path: string;
  description: string;
  version?: string;
}

export interface CycleDefinition {
  name: string;
  gCode: string;
  description: string;
  parameters: CycleParameter[];
  notes: string[];
}

export interface CycleParameter {
  letter: string;
  description: string;
  required: boolean;
  defaultValue?: string | number;
}

export interface MCodeMapping {
  mCode: number;
  description: string;
  category: "spindle" | "coolant" | "tool" | "special" | "custom";
  notes?: string;
}

export interface GCodeDialect {
  absoluteMode: string; // G90
  incrementalMode: string; // G91
  rapidMove: string; // G00
  linearMove: string; // G01
  cwArc: string; // G02
  ccwArc: string; // G03
  dwell: string; // G04
  toolLengthComp: string; // G43/G43.1
  toolLengthCancel: string; // G49
  cutterCompLeft: string; // G41
  cutterCompRight: string; // G42
  cutterCompCancel: string; // G40
  workOffsetBase: string; // G54
  programEnd: string; // M30
  spindleCW: string; // M03
  spindleCCW: string; // M04
  spindleStop: string; // M05
  coolantOn: string; // M08
  coolantOff: string; // M09
  toolChange: string; // M06
  rigidTapCode?: string;
  smoothingCode?: string;
  highAccuracyCode?: string;
}

// Controller Knowledge Database
export const CONTROLLER_PROFILES: Record<ControllerFamily, ControllerProfile> = {
  hurco_winmax: {
    family: "hurco_winmax",
    name: "Hurco WinMax",
    versions: ["BNC", "ISNC", "WinMax 10", "WinMax 11"],
    manufacturer: "Hurco",
    programmingStyle: "hybrid",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 100,
      maxBlockRate: 1000,
      maxAxes: 5,
      supportsNURBS: false,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: false,
      smoothingModes: ["G05.3"],
      uniqueFeatures: [
        "UltiMotion (G64)",
        "M16 Auto Buffering",
        "M140 Z-Axis Retract",
        "Conversational + ISO dual mode",
        "Part Zero Storage",
        "Smart Intercon",
      ],
    },
    resources: [
      {
        type: "pdf",
        path: "H:\\prism\\resources\\RESOURCE PDFS\\WinMax-Mill-Intro-Class-Workbook.pdf",
        description: "WinMax Mill Introduction Training Workbook",
      },
      {
        type: "pdf",
        path: "H:\\prism\\resources\\WinMax Mill RECOVERY AND RESTART.pdf",
        description: "Recovery and Restart Procedures",
      },
      {
        type: "pdf",
        path: "H:\\prism\\resources\\WinMax Mill CUTTER COMPENSATION.pdf",
        description: "Cutter Compensation Guide",
      },
      {
        type: "pdf",
        path: "H:\\prism\\resources\\POSTS AND MACHINES\\5-Axis-Post-Package_Cope_2015\\5-Axis Post Package_Cope 2015\\Hurco 5-Axis Post Notes_Cope 2014.pdf",
        description: "5-Axis Post Notes",
      },
      {
        type: "post",
        path: "H:\\prism\\resources\\POSTS AND MACHINES\\Hurco_VMX_30 i__Max_R02g_E07",
        description: "HyperMILL Hurco VMX 30i Post Package",
      },
    ],
    cycleDefinitions: [
      // Basic Drilling Cycles
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["BNC uses relative Z, ISNC uses absolute Z"],
      },
      {
        name: "Spot Drilling",
        gCode: "G82",
        description: "Spot drill / counterbore with dwell",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time (ms)", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Use P word for dwell at bottom", "Good for chamfering, counterboring"],
      },
      {
        name: "Peck Drilling",
        gCode: "G83",
        description: "Deep hole peck drilling",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Full retract between pecks", "Use for L/D > 3"],
      },
      {
        name: "High Speed Peck",
        gCode: "G73",
        description: "High speed peck drilling (chip break)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Partial retract between pecks", "Faster than G83", "Use for L/D 2-4"],
      },
      // Tapping Cycles
      {
        name: "Floating Tapping",
        gCode: "G84",
        description: "Floating tap cycle (ISNC mode)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate (rpm*pitch)", required: true },
        ],
        notes: ["ISNC mode", "For tension/compression tap holders", "Requires M29 for rigid"],
      },
      {
        name: "Peck Tapping RH",
        gCode: "G84.2",
        description: "Rigid tapping with chip breaking - Right Hand (ISNC)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Total depth (1st Z)", required: true },
          { letter: "Z", description: "Peck increment (2nd Z)", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: ["ISNC mode only", "Right-hand tap", "Uses dual Z-word syntax unique to WinMax"],
      },
      {
        name: "Peck Tapping LH",
        gCode: "G84.3",
        description: "Rigid tapping with chip breaking - Left Hand (ISNC)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Total depth (1st Z)", required: true },
          { letter: "Z", description: "Peck increment (2nd Z)", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: ["ISNC mode only", "Left-hand tap", "Uses dual Z-word syntax unique to WinMax"],
      },
      {
        name: "Rigid Tapping BNC",
        gCode: "G88",
        description: "Rigid tapping cycle (BNC mode only)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: ["BNC mode ONLY", "Use G84 with M29 for ISNC rigid tapping"],
      },
      // Boring Cycles
      {
        name: "Boring",
        gCode: "G85",
        description: "Boring cycle - feedrate retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Retracts at feedrate", "Best surface finish", "Use for finish boring"],
      },
      {
        name: "Boring with Dwell",
        gCode: "G86",
        description: "Boring cycle with dwell at bottom",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time (ms)", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["BNC: spindle stop at bottom, rapid retract", "ISNC: feed retract with optional dwell"],
      },
      {
        name: "Back Boring",
        gCode: "G87",
        description: "Back boring cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Shift amount", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["BNC: spindle orient, shift, bore backside", "For back counterboring"],
      },
      {
        name: "Boring with Spindle Orient",
        gCode: "G89",
        description: "Boring cycle with spindle orient and shift",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time (ms)", required: false },
          { letter: "Q", description: "Shift amount", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Orient spindle, shift tool, retract", "Prevents drag marks"],
      },
      // Reaming
      {
        name: "Reaming",
        gCode: "G85",
        description: "Reaming cycle (same as finish bore)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Use G85 for reaming", "Feed retract preserves hole finish"],
      },
      // Reverse Tapping (LH thread)
      {
        name: "Reverse Tapping",
        gCode: "G74",
        description: "Left-hand (reverse) tapping cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: ["BNC: G74 for LH tap", "ISNC: use G84.3 for rigid LH peck tap"],
      },
      // Probing Cycles
      {
        name: "Skip/Probe",
        gCode: "G31",
        description: "Skip function / probing cycle",
        parameters: [
          { letter: "X", description: "X target", required: false },
          { letter: "Y", description: "Y target", required: false },
          { letter: "Z", description: "Z target", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Motion stops when probe signal trips",
          "M26 selects part probe signal",
          "M27 selects tool probe signal",
          "M42 enables two-touch probing",
        ],
      },
    ],
    mCodeMappings: [
      // Spindle Control
      { mCode: 3, description: "Spindle CW", category: "spindle" },
      { mCode: 4, description: "Spindle CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      // Tool Change
      { mCode: 6, description: "Tool Change", category: "tool" },
      // Coolant Control
      { mCode: 7, description: "Secondary Coolant On", category: "coolant" },
      { mCode: 8, description: "Primary Coolant On (Flood)", category: "coolant" },
      { mCode: 9, description: "All Coolant Off", category: "coolant" },
      { mCode: 10, description: "Primary + Secondary Coolant On", category: "coolant" },
      { mCode: 68, description: "Washdown Coolant On", category: "coolant" },
      { mCode: 69, description: "Washdown Coolant Off", category: "coolant" },
      // Program Control
      { mCode: 0, description: "Program Stop (spindle/coolant off)", category: "special" },
      { mCode: 1, description: "Optional Stop (refixture)", category: "special" },
      { mCode: 2, description: "Program End", category: "special" },
      { mCode: 30, description: "Program End + Rewind", category: "special" },
      // Rotary Axis Clamps
      { mCode: 12, description: "Clamp Rotary C Axis", category: "special" },
      { mCode: 13, description: "Unclamp Rotary C Axis", category: "special" },
      { mCode: 32, description: "Clamp Rotary A Axis", category: "special" },
      { mCode: 33, description: "Unclamp Rotary A Axis", category: "special" },
      { mCode: 34, description: "Clamp Rotary B Axis", category: "special" },
      { mCode: 35, description: "Unclamp Rotary B Axis", category: "special" },
      // Machine Functions
      { mCode: 20, description: "Advance Indexer One Position", category: "special" },
      { mCode: 21, description: "Initiate Lubrication", category: "special" },
      { mCode: 25, description: "Retract Z to Tool Change Height", category: "special" },
      { mCode: 36, description: "Servos Off", category: "special" },
      // Probing
      { mCode: 26, description: "Select Part Probe Signal", category: "special" },
      { mCode: 27, description: "Select Tool Probe Signal", category: "special" },
      { mCode: 41, description: "Deactivate Two-Touch Probing (G31)", category: "special" },
      { mCode: 42, description: "Enable Auto Two-Touch Probing (G31)", category: "special", notes: "Auto backup and re-touch at reduced feed" },
      // Tapping
      { mCode: 29, description: "Rigid Tapping Mode", category: "special", notes: "ISNC mode only" },
      // Chip Conveyor
      { mCode: 59, description: "Chip Conveyor Forward", category: "special" },
      { mCode: 60, description: "Chip Conveyor Reverse", category: "special" },
      { mCode: 61, description: "Chip Conveyor Stop", category: "special" },
      // Auxiliary Outputs
      { mCode: 52, description: "Auxiliary Output 1 On", category: "custom" },
      { mCode: 53, description: "Auxiliary Output 2 On", category: "custom" },
      { mCode: 54, description: "Auxiliary Output 3 On", category: "custom" },
      { mCode: 55, description: "Auxiliary Output 4 On", category: "custom" },
      { mCode: 62, description: "Auxiliary Output 1 Off", category: "custom" },
      { mCode: 63, description: "Auxiliary Output 2 Off", category: "custom" },
      { mCode: 64, description: "Auxiliary Output 3 Off", category: "custom" },
      { mCode: 65, description: "Auxiliary Output 4 Off", category: "custom" },
      // Pallet Changer
      { mCode: 56, description: "Pallet Change (non-confirmation)", category: "special" },
      { mCode: 57, description: "Rotate to Pallet 1", category: "special" },
      { mCode: 58, description: "Rotate to Pallet 2", category: "special" },
      // Rotary Axis Direction
      { mCode: 76, description: "Normal A Axis Operation", category: "special" },
      { mCode: 77, description: "Reverse A Axis Operation", category: "special" },
      { mCode: 78, description: "Normal B Axis Operation", category: "special" },
      { mCode: 79, description: "Reverse B Axis Operation", category: "special" },
      { mCode: 80, description: "C Axis Right-Handed", category: "special" },
      { mCode: 81, description: "C Axis Left-Handed", category: "special" },
      // Subprograms
      { mCode: 98, description: "Subprogram Call", category: "special" },
      { mCode: 99, description: "Return from Subprogram / Jump", category: "special" },
      // 5-Axis Specific
      { mCode: 126, description: "Shortest Rotary Angle Path Traverse", category: "special", notes: "5-axis optimization" },
      { mCode: 127, description: "Cancel Shortest Rotary Angle Path (M126)", category: "special" },
      { mCode: 128, description: "Tool Center Point Management (TCPM)", category: "special", notes: "5-axis TCP" },
      { mCode: 129, description: "Cancel TCPM (M128)", category: "special" },
      { mCode: 140, description: "Retract Along Tool Vector", category: "special", notes: "Safe 5-axis retract" },
      { mCode: 200, description: "Tilt Axis Preference", category: "special", notes: "5-axis orientation" },
    ],
    gCodeDialect: {
      // Basic Motion
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      // Dwell and Threading
      dwell: "G04",
      threadingCycle: "G32",
      threadMilling: "G33",
      // Tool Compensation
      toolLengthComp: "G43",
      toolLengthCompNegative: "G44",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      // Work Coordinates
      workOffsetBase: "G54",
      workOffsetG55: "G55",
      workOffsetG56: "G56",
      workOffsetG57: "G57",
      workOffsetG58: "G58",
      workOffsetG59: "G59",
      additionalWorkOffsets: "G154 P1-P99",
      // Coordinate Systems
      machineCoordinates: "G53",
      localCoordinateSystem: "G52",
      // Plane Selection
      xyPlane: "G17",
      xzPlane: "G18",
      yzPlane: "G19",
      // Units
      inchMode: "G20",
      metricMode: "G21",
      // Canned Cycles
      cancelCannedCycle: "G80",
      skipCycle: "G31",
      // Scaling & Rotation
      scaling: "G50",
      scalingOn: "G51",
      rotation: "G68",
      rotationCancel: "G69",
      // Polar Coordinates
      polarOn: "G16",
      polarOff: "G15",
      // Spindle
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      spindleOrient: "M19",
      // Coolant
      coolantOn: "M08",
      coolantOff: "M09",
      secondaryCoolantOn: "M07",
      // Tool
      toolChange: "M06",
      programEnd: "M30",
      programStop: "M00",
      optionalStop: "M01",
      // Special Hurco/WinMax
      rigidTapCode: "M29",
      smoothingCode: "G05.3",
      highAccuracyCode: "G64",
      ultimotionOn: "G64",
      ultimotionOff: "G63",
      autoBuffering: "M16",
      // Return Modes
      returnToInitialLevel: "G98",
      returnToRLevel: "G99",
      // Feedrate Modes
      feedPerMinute: "G94",
      feedPerRev: "G95",
      inverseTime: "G93",
      // Exact Stop
      exactStop: "G09",
      exactStopMode: "G61",
      cuttingMode: "G64",
      // Cutter Compensation Types
      cutterCompLookAhead: "G41.2",
      cutterComp3D: "G41.3",
    },
    // BNC vs ISNC Mode Differences
    modeSpecificBehavior: {
      bnc: {
        description: "Basic NC mode - Hurco-specific syntax",
        zValues: "relative",
        tappingCycle: "G88",
        backBoring: "G87 (spindle orient + shift)",
        advantages: ["Easier for manual programmers", "Hurco-native syntax"],
      },
      isnc: {
        description: "Industry Standard NC mode - Fanuc-compatible",
        zValues: "absolute",
        tappingCycle: "G84 + M29",
        peckTapping: "G84.2 (RH) / G84.3 (LH)",
        advantages: ["Post processor compatibility", "CAM system support", "Industry standard"],
      },
    },
  },

  haas_ngc: {
    family: "haas_ngc",
    name: "Haas NGC",
    versions: ["Classic", "NGC", "Next Generation Control"],
    manufacturer: "Haas Automation",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 80,
      maxBlockRate: 1000,
      maxAxes: 5,
      supportsNURBS: false,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["G187"],
      uniqueFeatures: [
        "G187 Smoothness Control (E1-E3, P1-P3)",
        "Wireless Probing",
        "Dynamic Work Offsets (DWOS)",
        "VPS (Visual Programming System)",
        "TCPC (Tool Center Point Control)",
      ],
    },
    resources: [
      {
        type: "post",
        path: "H:\\prism\\resources\\POSTS AND MACHINES\\Haas_VF-2__H-VF_R12c_E19",
        description: "HyperMILL Haas VF-2 Post Package",
      },
    ],
    cycleDefinitions: [
      // Drilling Cycles
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle — no dwell, rapid retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["No dwell at bottom", "Retract at rapid rate"],
      },
      {
        name: "Spot Drilling / Counterbore",
        gCode: "G82",
        description: "Spot drill or counterbore with optional dwell at bottom",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["P dwell improves spot-drill accuracy", "Use for chamfering and counterboring"],
      },
      {
        name: "Peck Drilling",
        gCode: "G83",
        description: "Deep hole peck drilling — full retract to R each peck",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "First peck depth (positive)", required: true },
          { letter: "I", description: "Peck depth reduction per pass", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "I reduces peck depth each pass — use for stringy materials",
          "Full retract to R plane between each peck",
          "Use for L/D > 3 or gummy materials (stainless, titanium)",
        ],
      },
      {
        name: "High Speed Peck Drilling",
        gCode: "G73",
        description: "Chip-break peck drilling — partial retract only (faster than G83)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck depth increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Partial retract (chip break) — does NOT clear to R plane",
          "Faster than G83; use for L/D 2-4 in aluminum and cast iron",
        ],
      },
      // Tapping Cycles
      {
        name: "Rigid Tapping RH",
        gCode: "G84",
        description: "Rigid tapping cycle — right-hand thread",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "J", description: "Retract spindle speed override (optional)", required: false },
          { letter: "Q", description: "Peck depth (SW 100.23.000.1201+ only)", required: false },
          { letter: "F", description: "Pitch feedrate (RPM x pitch)", required: true },
        ],
        notes: [
          "Setting 130=0: feed in IPR/MPR (recommended — most accurate)",
          "Setting 130=1: feed in IPM/MPM (older Haas default)",
          "J word sets retract RPM — use J=2x spindle speed to speed up retract",
          "G95 mode (IPR) recommended — feedrate equals pitch value directly",
          "Q-peck parameter available from NGC SW 100.23.000.1201+",
        ],
      },
      {
        name: "Peck Rigid Tapping RH",
        gCode: "G84.2",
        description: "Peck rigid tapping — right-hand with chip breaking (SW 100.23.000.1201+)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment depth", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: [
          "Requires NGC software version 100.23.000.1201 or newer",
          "Q sets peck increment — partial retract between pecks for chip clearing",
          "Essential for deep tapping in stainless steel and titanium",
        ],
      },
      {
        name: "Reverse Tapping LH",
        gCode: "G74",
        description: "Left-hand (reverse) tapping cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "J", description: "Retract spindle speed override (optional)", required: false },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: [
          "Use for left-hand threads (reverse polarity spindle direction)",
          "Spindle must start CCW (M04) before this cycle",
        ],
      },
      // Boring Cycles
      {
        name: "Fine Boring",
        gCode: "G76",
        description: "Fine boring cycle with spindle orient and tool shift on retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Tool shift amount on retract", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Spindle orients at bottom before Q-shift retract — prevents drag marks",
          "Best surface finish boring cycle on Haas NGC",
          "Requires Setting 46 (G76/G87 spindle direction) to match tool geometry",
        ],
      },
      {
        name: "Boring Feed Retract",
        gCode: "G85",
        description: "Boring or reaming cycle — feedrate retract for best finish",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Retract at feedrate — use for finish boring and reaming"],
      },
      {
        name: "Back Boring",
        gCode: "G87",
        description: "Back boring — shift and bore from below the workpiece",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane (start point below part)", required: true },
          { letter: "Q", description: "Tool shift amount for clearance", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Spindle orients, shifts Q, rapid to R below part, spindle on, bore upward to Z",
          "Use Setting 46 to set orient direction for correct shift clearance",
        ],
      },
      // Circular Milling Cycles (Haas-specific)
      {
        name: "Circular Pocket CW",
        gCode: "G12",
        description: "Circular pocket milling — clockwise, tool at center",
        parameters: [
          { letter: "I", description: "First radius (starting step or innermost radius)", required: true },
          { letter: "J", description: "Final radius (pocket radius for straight wall)", required: false },
          { letter: "K", description: "Depth per pass (Z step)", required: true },
          { letter: "L", description: "Number of Z passes", required: false, defaultValue: 1 },
          { letter: "D", description: "Cutter compensation register", required: false },
          { letter: "Q", description: "Start angle offset", required: false },
          { letter: "P", description: "Finish passes", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Tool MUST be positioned at pocket center XY before calling G12",
          "Machines outward from center using helical moves",
          "Use D offset for cutter compensation to hit exact diameter",
          "Haas-specific cycle — not available on other controllers",
        ],
      },
      {
        name: "Circular Pocket CCW",
        gCode: "G13",
        description: "Circular pocket milling — counterclockwise, tool at center",
        parameters: [
          { letter: "I", description: "First radius (starting step or innermost radius)", required: true },
          { letter: "J", description: "Final radius (pocket radius for straight wall)", required: false },
          { letter: "K", description: "Depth per pass (Z step)", required: true },
          { letter: "L", description: "Number of Z passes", required: false, defaultValue: 1 },
          { letter: "D", description: "Cutter compensation register", required: false },
          { letter: "Q", description: "Start angle offset", required: false },
          { letter: "P", description: "Finish passes", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Same as G12 but counterclockwise — use for conventional milling direction",
          "Tool must be at pocket center before calling",
          "Haas-specific cycle",
        ],
      },
      {
        name: "General Pocket Milling",
        gCode: "G150",
        description: "General pocket milling — boundary defined by subprogram",
        parameters: [
          { letter: "P", description: "Subprogram number containing pocket boundary", required: true },
          { letter: "D", description: "Tool diameter offset register", required: true },
          { letter: "I", description: "Stepover per pass", required: true },
          { letter: "J", description: "Overlap amount", required: false, defaultValue: 0 },
          { letter: "K", description: "Depth per pass (Z step)", required: true },
          { letter: "L", description: "Number of finishing passes", required: false, defaultValue: 0 },
          { letter: "Q", description: "Start position offset", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "CRITICAL: G150 does NOT ramp or helical-enter — pre-drill or helical-enter required first",
          "Define pocket boundary in subprogram using G01/G02/G03 moves",
          "Haas-specific mini-CAM cycle — useful when CAM is unavailable",
          "Subprogram must end with M99",
        ],
      },
      // 5-Axis / TCPC
      {
        name: "TCPC Tool Length Comp (5-axis)",
        gCode: "G234",
        description: "Tool Center Point Control — 5-axis TCPC mode activation",
        parameters: [
          { letter: "H", description: "Tool length offset register", required: true },
        ],
        notes: [
          "Replaces G43 for 5-axis simultaneous machining on Haas UMC series",
          "Requires Settings 276-281 (rotary pivot point XYZ offsets for A and B axes)",
          "Setting 256 must be ON to enable TCPC feature",
          "Setting 33 must be set to correct tool offset measurement method",
          "Always test at low feed (F10) first — incorrect pivot distances cause crashes",
          "Cancel with G49 before returning to 3-axis operations",
        ],
      },
      // Probing
      {
        name: "Skip / Probe",
        gCode: "G31",
        description: "Skip function — motion stops when probe signal activates",
        parameters: [
          { letter: "X", description: "X target position", required: false },
          { letter: "Y", description: "Y target position", required: false },
          { letter: "Z", description: "Z target position", required: false },
          { letter: "F", description: "Probe feedrate", required: true },
        ],
        notes: [
          "Use with WIPS macro calls (G65 P9023, P9995) for automated probing",
          "Probe results stored in macro variables #140-#199 (Renishaw) or #10001-#10020 (WIPS)",
          "G103 P1 required before reading variables to prevent look-ahead issues",
        ],
      },
    ],
    mCodeMappings: [
      // Program Control
      { mCode: 0, description: "Program Stop (spindle and coolant off)", category: "special" },
      { mCode: 1, description: "Optional Stop (active when Optional Stop key on)", category: "special" },
      { mCode: 2, description: "Program End (no rewind)", category: "special" },
      { mCode: 30, description: "Program End and Rewind to top", category: "special" },
      // Spindle
      { mCode: 3, description: "Spindle On CW", category: "spindle" },
      { mCode: 4, description: "Spindle On CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      {
        mCode: 19,
        description: "Spindle Orient (P = angle in degrees, Q = direction)",
        category: "spindle",
        notes: "P0-P360 sets orient angle; Q1=CW, Q2=CCW",
      },
      // Coolant
      { mCode: 7, description: "Mist Coolant On", category: "coolant" },
      { mCode: 8, description: "Flood Coolant On", category: "coolant" },
      { mCode: 9, description: "All Coolant Off", category: "coolant" },
      {
        mCode: 88,
        description: "Through-Spindle Coolant (TSC) On",
        category: "coolant",
        notes: "P0=low, P1=normal, P2=high pressure (VFD equipped)",
      },
      { mCode: 89, description: "Through-Spindle Coolant (TSC) Off", category: "coolant" },
      { mCode: 93, description: "Air Blast On", category: "coolant" },
      // Tool Change
      { mCode: 6, description: "Tool Change (ATC)", category: "tool" },
      // Axis Clamps (4th and 5th axis)
      { mCode: 10, description: "4th Axis Brake On (clamp)", category: "special" },
      { mCode: 11, description: "4th Axis Brake Off (unclamp)", category: "special" },
      { mCode: 12, description: "5th Axis Brake On (clamp)", category: "special" },
      { mCode: 13, description: "5th Axis Brake Off (unclamp)", category: "special" },
      // Tapping
      {
        mCode: 29,
        description: "Rigid Tapping Mode Enable",
        category: "special",
        notes: "Use before G84 on Classic Haas; NGC uses G84 natively rigid",
      },
      // Subprograms
      { mCode: 97, description: "Local Subprogram Call (same file O-number)", category: "special" },
      { mCode: 98, description: "External Subprogram Call", category: "special" },
      {
        mCode: 99,
        description: "Subprogram End / Return (P = line number to jump to)",
        category: "special",
      },
      // Pallet Changer
      { mCode: 36, description: "Pallet Change (with confirmation/interlock)", category: "special" },
      { mCode: 37, description: "Pallet Change (no confirmation)", category: "special" },
      { mCode: 50, description: "Pallet Clamp", category: "special" },
      // Part Catcher (HS series)
      { mCode: 51, description: "Part Catcher On", category: "special" },
      { mCode: 52, description: "Part Catcher Off", category: "special" },
      // Chip Conveyor
      { mCode: 59, description: "Chip Conveyor Forward", category: "special" },
      { mCode: 60, description: "Chip Conveyor Reverse", category: "special" },
      { mCode: 61, description: "Chip Conveyor Stop", category: "special" },
      // Spindle Speed Variation
      {
        mCode: 138,
        description: "Spindle Speed Variation (SSV) On",
        category: "spindle",
        notes: "Reduces chatter by varying spindle speed +/-V% at W Hz",
      },
      { mCode: 139, description: "Spindle Speed Variation (SSV) Off", category: "spindle" },
      // 5-Axis Rotary Path
      {
        mCode: 126,
        description: "Shortest Rotary Path Traverse On",
        category: "special",
        notes: "Selects shorter rotary path for multi-axis positioning",
      },
      { mCode: 127, description: "Shortest Rotary Path Traverse Off", category: "special" },
      // Tool Probe Arm
      { mCode: 104, description: "Extend Tool Setting Probe Arm", category: "special" },
      { mCode: 105, description: "Retract Tool Setting Probe Arm", category: "special" },
      // Branching / Macros
      { mCode: 96, description: "Conditional Branch on Skip Signal (probe trip)", category: "special" },
      {
        mCode: 109,
        description: "Interactive User Input to Macro Variable",
        category: "special",
        notes: "Prompts operator for input stored in user-specified macro variable",
      },
      // M130 Images
      {
        mCode: 130,
        description: "Display Part or Tool Image on Operator Panel",
        category: "special",
        notes: "M130 (filename) — requires image option installed",
      },
    ],
    gCodeDialect: {
      // Basic Motion
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      // Tool Compensation
      toolLengthComp: "G43",
      toolLengthCompTCPC: "G234",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      // Work Coordinates
      workOffsetBase: "G54",
      workOffsetG55: "G55",
      workOffsetG56: "G56",
      workOffsetG57: "G57",
      workOffsetG58: "G58",
      workOffsetG59: "G59",
      extendedWorkOffsets: "G154 P1-P99",
      machineCoordinates: "G53",
      localCoordinateSystem: "G52",
      // DWO (Dynamic Work Offsets) - 5-axis tilted workplane
      dynamicWorkOffsetEnable: "G254",
      dynamicWorkOffsetCancel: "G255",
      // Coordinate Rotation and Scaling
      scalingOff: "G50",
      scalingOn: "G51",
      rotation: "G68",
      rotationCancel: "G69",
      // Polar Coordinates
      polarOn: "G16",
      polarOff: "G15",
      // Plane Selection
      xyPlane: "G17",
      xzPlane: "G18",
      yzPlane: "G19",
      // Units
      inchMode: "G20",
      metricMode: "G21",
      // Canned Cycles
      cancelCannedCycle: "G80",
      // Cycle Return Modes
      returnToInitialLevel: "G98",
      returnToRLevel: "G99",
      // Feedrate Modes
      feedPerMinute: "G94",
      feedPerRev: "G95",
      inverseTime: "G93",
      // Exact Stop
      exactStop: "G09",
      exactStopMode: "G61",
      cuttingMode: "G64",
      // Spindle
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      spindleOrient: "M19",
      // Coolant
      coolantOn: "M08",
      coolantOff: "M09",
      throughSpindleCoolantOn: "M88",
      throughSpindleCoolantOff: "M89",
      // Tool
      toolChange: "M06",
      programEnd: "M30",
      programStop: "M00",
      optionalStop: "M01",
      // Smoothing / Accuracy
      smoothingCode: "G187",
      highAccuracyCode: "G187 P3",
      roughingSmoothing: "G187 P1",
      mediumSmoothing: "G187 P2",
      finishSmoothing: "G187 P3",
      customSmoothing: "G187 Px Ey",
      // Rigid Tapping
      rigidTapCode: "M29",
      // Spindle Speed Variation
      ssvOn: "M138",
      ssvOff: "M139",
    },
  },

  fanuc: {
    family: "fanuc",
    name: "FANUC",
    versions: ["0i-MF", "0i-TF", "30i-B", "31i-B", "32i-B"],
    manufacturer: "FANUC",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 200,
      maxBlockRate: 2000,
      maxAxes: 8,
      supportsNURBS: true,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["G05", "G08", "G05.1"],
      uniqueFeatures: [
        "AI Contour Control II",
        "Nano CNC",
        "Fine Surface Technology",
        "High Precision Contour Control (HPCC)",
        "Servo Learning Oscillation",
      ],
    },
    resources: [
      {
        type: "post",
        path: "H:\\prism\\resources\\POSTS AND MACHINES\\Roku-Roku_HC-658__F_R10b_E20",
        description: "HyperMILL Fanuc Post Package (Roku-Roku)",
      },
    ],
    cycleDefinitions: [
      {
        name: "Drilling",
        gCode: "G81",
        description: "Spot drilling / center drilling — modal, retract to R plane (G99) or initial plane (G98)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["G98 retracts to initial Z; G99 retracts to R-plane"],
      },
      {
        name: "Counterboring with Dwell",
        gCode: "G82",
        description: "Counterboring — drills to depth, dwells, then retracts",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["P is optional; omit for no dwell. Used for spotting and counterboring."],
      },
      {
        name: "High Speed Peck",
        gCode: "G73",
        description: "High speed peck drilling — partial retract (chip breaking, not full retract)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck depth increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Retract distance set by parameter #5114 (typically 1 mm)",
          "Use for depths up to 5xD in steel",
          "Much faster than G83 for shallow-to-medium depth holes",
        ],
      },
      {
        name: "Deep Hole Peck",
        gCode: "G83",
        description: "Deep hole peck drilling — full retract to R-plane between pecks for chip evacuation",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck depth increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Full retract to R plane each peck — slower but necessary for gummy materials",
          "Use for titanium, stainless, and depths >5xD",
        ],
      },
      {
        name: "Rigid Tapping",
        gCode: "G84",
        description: "Rigid tapping — synchronized spindle reversal on retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate = pitch × RPM (or pitch in G95 / usePitchForTapping mode)", required: true },
        ],
        notes: [
          "Requires M29 S_ before G84 to activate rigid mode",
          "Use G95 (IPR/MPR) or usePitchForTapping property to program F as pitch directly",
          "Left-hand tapping uses G74 (CCW spindle, CW retract)",
        ],
      },
      {
        name: "Left-Hand Rigid Tapping",
        gCode: "G74",
        description: "Left-hand tapping / reverse tapping cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate or pitch", required: true },
        ],
        notes: [
          "Spindle runs CCW to depth, CW to retract",
          "Also used for left-hand thread tapping on turning centers",
        ],
      },
      {
        name: "Reaming",
        gCode: "G85",
        description: "Reaming cycle — feed in, feed out at same rate",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Spindle remains ON during retract — distinguishes from G86"],
      },
      {
        name: "Boring — Spindle Stop Retract",
        gCode: "G86",
        description: "Boring cycle — spindle stops at depth, rapid retract (leaves witness mark)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Spindle stops (M05) at bottom, rapid retract may leave witness line",
          "Use G76 for precision boring without witness mark",
        ],
      },
      {
        name: "Fine Boring",
        gCode: "G76",
        description: "Fine boring — spindle orients and shifts before retract to prevent witness mark",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time at bottom in milliseconds", required: false, defaultValue: 0 },
          { letter: "Q", description: "Tool shift distance before retract", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Spindle orients (M19), shifts by Q amount, then retracts — no witness mark",
          "P dwell at bottom recommended for smooth finish",
          "Q direction is set by parameter #5101 bit 4 (typically X+ direction)",
          "Requires oriented spindle stop capability",
        ],
      },
      {
        name: "Back Boring",
        gCode: "G87",
        description: "Back boring cycle — bores from bottom toward spindle nose",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth (bottom)", required: true },
          { letter: "R", description: "Clearance below part", required: true },
          { letter: "Q", description: "Tool shift for clearance entry", required: true },
          { letter: "P", description: "Dwell at top in milliseconds", required: false },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Tool shifts by Q, rapid to R below part, shifts back, bores upward",
          "Only available in G98 mode (returns to initial Z above part)",
        ],
      },
      {
        name: "Boring with Manual Retract",
        gCode: "G88",
        description: "Boring — spindle stops, waits for operator to manually retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Control enters feed-hold after dwell; operator must manually retract"],
      },
      {
        name: "Boring with Dwell",
        gCode: "G89",
        description: "Boring cycle with dwell at bottom — feed in, dwell, feed out",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: true },
          { letter: "F", description: "Feedrate (in and out)", required: true },
        ],
        notes: ["Feed retract like G85 but with dwell; used for finishing bores"],
      },
      {
        name: "Cycle Cancel",
        gCode: "G80",
        description: "Cancel all canned cycles — mandatory after last hole in a cycle block",
        parameters: [],
        notes: [
          "Must appear on its own block or combined with positioning",
          "Also auto-cancelled by G00/G01 motions in some control versions",
        ],
      },
    ],
    mCodeMappings: [
      { mCode: 0, description: "Program Stop (mandatory)", category: "special", notes: "Stops program; operator must press cycle start to continue" },
      { mCode: 1, description: "Optional Stop", category: "special", notes: "Stops only when Optional Stop switch is ON on operator panel" },
      { mCode: 2, description: "Program End", category: "special", notes: "Ends program; does not rewind to start (use M30 for rewind)" },
      { mCode: 3, description: "Spindle CW", category: "spindle" },
      { mCode: 4, description: "Spindle CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      { mCode: 6, description: "Tool Change", category: "tool", notes: "Executes ATC; T-word before M06 selects next tool" },
      { mCode: 7, description: "Mist Coolant On", category: "coolant" },
      { mCode: 8, description: "Flood Coolant On", category: "coolant" },
      { mCode: 9, description: "Coolant Off (all)", category: "coolant" },
      { mCode: 19, description: "Spindle Orient", category: "spindle", notes: "Required before G76 fine boring and some tool change sequences" },
      { mCode: 29, description: "Rigid Tapping Mode", category: "special", notes: "Sync spindle for G84/G74; must precede cycle block with S word: M29 S500" },
      { mCode: 30, description: "Program End + Rewind", category: "special", notes: "Ends execution and rewinds to program start; preferred over M02" },
      { mCode: 48, description: "Feed/Speed Override Enable", category: "special", notes: "Re-enables operator override knobs after M49" },
      { mCode: 49, description: "Feed/Speed Override Disable", category: "special", notes: "Locks feed/speed at 100% — used in tapping and thread cutting" },
      { mCode: 88, description: "Through-Tool Coolant On", category: "coolant", notes: "High-pressure coolant through spindle center; use with M08 for combined flood+through" },
      { mCode: 89, description: "Through-Tool Coolant Off", category: "coolant", notes: "Cancels through-tool coolant; M09 cancels both flood and through-tool" },
      { mCode: 98, description: "Subprogram Call", category: "special", notes: "M98 P[program number] L[repeat count]; L omit = 1 repeat" },
      { mCode: 99, description: "Subprogram Return / Loop", category: "special", notes: "Returns to main program; in main program context restarts from top (loop)" },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
      rigidTapCode: "M29",
      smoothingCode: "G05.1 Q1",
      highAccuracyCode: "G08 P1",
      nanoSmoothingCode: "G05.1 Q3",
      tiltedWorkplaneCode: "G68.2",
      cancelTiltedWorkplane: "G69",
      confirmTiltedWorkplane: "G53.1",
      tcpMode: "G43.4",
      tcpMode5axis: "G43.5",
      workOffsetExtended: "G54.1 P",
      workpieceErrorComp: "G54.4",
      unitsMM: "G21",
      unitsInch: "G20",
      planeXY: "G17",
      planeZX: "G18",
      planeYZ: "G19",
      feedPerMin: "G94",
      feedPerRev: "G95",
      cycleRetractInitial: "G98",
      cycleRetractRPlane: "G99",
      homePosition: "G28",
      secondHomePosition: "G30",
      machineCoordsys: "G53",
      macroCall: "G65",
      skipFunction: "G31",
    },
  },

  okuma_osp: {
    family: "okuma_osp",
    name: "Okuma OSP",
    versions: ["P200", "P300", "P500"],
    manufacturer: "Okuma",
    programmingStyle: "hybrid",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 1000,
      maxBlockRate: 2000,
      maxAxes: 9,
      supportsNURBS: true,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["G08", "Super-NURBS"],
      uniqueFeatures: [
        "Super-NURBS",
        "Collision Avoidance System (CAS)",
        "Thermo-Friendly Concept",
        "Machining Navi",
        "5-Axis Auto Tuning System",
        "OSP-AI",
      ],
    },
    resources: [
      {
        type: "post",
        path: "H:\\prism\\resources\\POSTS AND MACHINES\\Okuma_Genos_M460V-5AX__OSP_R01w_E03",
        description: "HyperMILL Okuma Genos 5-Axis Post Package",
      },
    ],
    cycleDefinitions: [
      {
        name: "Drilling",
        gCode: "G81",
        description: "Drilling cycle — OSP uses standard G81 syntax, retract plane specified by R",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth (absolute)", required: true },
          { letter: "R", description: "Retract plane (absolute)", required: true },
          { letter: "F", description: "Feedrate (mm/min)", required: true },
        ],
        notes: [
          "OSP uses G98 (retract to initial Z) / G99 (retract to R) — same as Fanuc",
          "Cycle cancel G80 required after last hole; not auto-cancelled by positioning",
        ],
      },
      {
        name: "Spot Drilling with Dwell",
        gCode: "G82",
        description: "Spot drilling cycle — feed to depth, dwell, rapid retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time (milliseconds)", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["P dwell helps clean chamfer at entry hole"],
      },
      {
        name: "High-Speed Peck Drilling",
        gCode: "G73",
        description: "High-speed peck — partial retract (chip-break) between pecks",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment depth (positive, mm)", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Retract amount between pecks is a machine parameter (not Q) — only lifts ~1mm",
          "Use for holes up to 5xD in steel; faster cycle time than G83",
        ],
      },
      {
        name: "Deep Hole Peck Drilling",
        gCode: "G83",
        description: "Deep hole drilling — full retract to R-plane between pecks for chip evacuation",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck depth per pass (positive, mm)", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Use for holes > 5xD or gummy materials (stainless, titanium)"],
      },
      {
        name: "Rigid Tapping",
        gCode: "G84",
        description: "Rigid tapping — spindle synchronized with Z axis. OSP also accepts G284.",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth (full thread depth)", required: true },
          { letter: "R", description: "Retract plane (above part surface)", required: true },
          { letter: "F", description: "Pitch feedrate = thread pitch × RPM (mm/min)", required: true },
        ],
        notes: [
          "OSP does NOT require M29 before G84 — synchronization is internal to the cycle",
          "G284 is an OSP-native tapping cycle with identical parameters to G84",
          "Set property 'Use G284' in post to output G284 instead of G84",
          "Example: M6×1.0 at 1000 RPM → F1000.0",
        ],
      },
      {
        name: "Left-Hand Rigid Tapping",
        gCode: "G74",
        description: "Left-hand tapping — CCW entry, CW retract",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: ["Spindle runs CCW on entry, CW on retract"],
      },
      {
        name: "Fine Boring",
        gCode: "G76",
        description: "Fine boring — spindle orients and shifts before retract to eliminate witness mark",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Tool nose shift amount before retract (mm)", required: true },
          { letter: "P", description: "Dwell at bottom (milliseconds)", required: false, defaultValue: 0 },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "OSP uses M906 P[angle×10] internally for spindle orientation — no separate M19 block",
          "Q direction is set by machine parameter — typically X+ direction",
        ],
      },
      {
        name: "Boring with Feed Retract",
        gCode: "G85",
        description: "Boring / reaming cycle — feed in and feed out, spindle ON throughout",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate (in and out)", required: true },
        ],
        notes: ["Spindle remains CW on retract — leaves smooth bore wall"],
      },
      {
        name: "Boring with Dwell",
        gCode: "G89",
        description: "Boring cycle with dwell at bottom — feed in, dwell, feed out",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell at bottom (milliseconds)", required: true },
          { letter: "F", description: "Feedrate (in and out)", required: true },
        ],
        notes: ["Like G85 with added dwell; use for finishing bores to spring back"],
      },
      {
        name: "High-Cut Contouring Mode",
        gCode: "G08",
        description: "High-Cut contouring — OSP advanced motion smoothing for HSM and Super-NURBS",
        parameters: [
          { letter: "P", description: "Level: -1=Off, 0=High Quality, 1=Standard, 2=High Speed, 9999=Auto", required: true },
          { letter: "E", description: "Path tolerance (mm) — typically 4× finishing tolerance for roughing", required: false },
          { letter: "D", description: "Super-NURBS fitting tolerance (mm) — only when I2 active", required: false },
          { letter: "I", description: "Interpolation type: 2 = Super-NURBS spline fitting of linear G01 segments", required: false },
          { letter: "L", description: "Max segment length for NURBS fitting (mm, e.g. L19.0)", required: false },
        ],
        notes: [
          "G08 P0 = High Quality: best surface finish, lowest speed",
          "G08 P1 = Standard: balanced speed/finish",
          "G08 P2 = High Speed: fastest, tolerates higher path deviation",
          "G08 P9999 = Automatic: OSP selects level based on tolerance threshold",
          "G08 P0 E0.005 D0.002 I2 L19.0 = Super-NURBS finishing mode",
          "Cancel with G08 P-1 before program end or after HSM section",
        ],
      },
      {
        name: "Cycle Cancel",
        gCode: "G80",
        description: "Cancel all active canned cycles",
        parameters: [],
        notes: [
          "Must be explicitly programmed — OSP does not auto-cancel cycles on G00/G01",
          "Can be combined with positioning: G80 X0 Y0",
        ],
      },
    ],
    mCodeMappings: [
      { mCode: 2, description: "Program End (no rewind)", category: "special", notes: "Ends program; OSP recommends M02 for single-part programs" },
      { mCode: 3, description: "Spindle CW (forward)", category: "spindle" },
      { mCode: 4, description: "Spindle CCW (reverse)", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      { mCode: 6, description: "Tool Change (ATC)", category: "tool", notes: "T-word before M06 selects tool; preload next tool with T-word after M06" },
      { mCode: 7, description: "Mist Coolant On", category: "coolant" },
      { mCode: 8, description: "Flood Coolant On", category: "coolant" },
      { mCode: 9, description: "All Coolant Off", category: "coolant", notes: "Cancels flood, mist, and air blast simultaneously" },
      { mCode: 10, description: "4th Axis Clamp", category: "special", notes: "Clamps A-axis (rotary table); use before cutting with 3+2 setup" },
      { mCode: 11, description: "4th Axis Unclamp", category: "special" },
      { mCode: 15, description: "Table Rotation CW Direction", category: "special", notes: "Used with rotary scale tables; constrains table rotation direction" },
      { mCode: 16, description: "Table Rotation CCW Direction", category: "special" },
      { mCode: 19, description: "Spindle Orient (default angle)", category: "spindle", notes: "Positions spindle to reference angle; use M906 P[angle] for specific angle" },
      { mCode: 26, description: "5th Axis Clamp (B-axis)", category: "special", notes: "Clamps B-axis for 3+2 setups on 5-axis machines" },
      { mCode: 27, description: "5th Axis Unclamp (B-axis)", category: "special" },
      { mCode: 30, description: "Program End and Rewind", category: "special", notes: "Preferred program end — rewinds to O-number start; equivalent to M02 + rewind" },
      { mCode: 50, description: "Through-Tool Coolant On", category: "coolant", notes: "Spindle center coolant; requires through-spindle coolant unit option" },
      { mCode: 51, description: "Air Blast On", category: "coolant", notes: "Activates air blast at spindle nose for chip clearing" },
      { mCode: 130, description: "Feed Hold Active (no speed stop)", category: "special", notes: "Pauses feed-related axes; spindle continues — used in macro-driven probing" },
      { mCode: 131, description: "Cancel Feed Hold (M130)", category: "special" },
      { mCode: 279, description: "Chip Conveyor On", category: "special", notes: "Activate in program header for unattended/lights-out runs" },
      { mCode: 338, description: "Cancel Air + Through-Tool Coolant (combined)", category: "coolant" },
      { mCode: 339, description: "Air Blast + Through-Tool Coolant On (combined)", category: "coolant", notes: "Use with M12 for simultaneous air and spindle coolant" },
      { mCode: 510, description: "Collision Avoidance System (CAS) OFF", category: "special", notes: "CRITICAL: Must disable CAS before 5-axis simultaneous toolpaths; re-enable with M511 after" },
      { mCode: 511, description: "Collision Avoidance System (CAS) ON", category: "special", notes: "CAS is ON by default at power-on; M511 restores after M510 disable" },
      { mCode: 906, description: "Spindle Orient to Angle (M906 Pnnn)", category: "spindle", notes: "P = target angle in degrees × 10. Example: M906 P900 orients spindle to 90.0°" },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      // OSP native work offsets: G15 H## (H1-H200). G54 accepted in compatibility mode only.
      workOffsetBase: "G15 H1",
      programEnd: "M02",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
      // OSP High-Cut contouring mode; cancel with G08 P-1
      smoothingCode: "G08",
      // OSP rigid tap native: no M29 required; G284 is OSP-specific alternative
      rigidTapCode: "G84",
      // High-accuracy / fine surface mode uses G08 P0 (High Quality)
      highAccuracyCode: "G08 P0",
    },
  },

  siemens_sinumerik: {
    family: "siemens_sinumerik",
    name: "Siemens SINUMERIK",
    versions: ["840D", "840D sl", "ONE"],
    manufacturer: "Siemens",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 500,
      maxBlockRate: 2000,
      maxAxes: 31,
      supportsNURBS: true,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["CYCLE832", "TRAORI"],
      uniqueFeatures: [
        "Top Surface / Fine Surface Quality (CYCLE832 level 1)",
        "CYCLE832 High Speed Settings — 3-level roughing/semi/finishing",
        "TRAORI — 5-Axis Simultaneous TCP Transformation",
        "TRAFOOF — Cancel TCP Transformation",
        "CYCLE800 — Tilted Working Plane (3+2 indexing with swivel data record)",
        "ShopMill / ShopTurn — Graphical conversational programming layer",
        "Sinumerik Operate — Unified HMI for 840D sl and ONE",
        "COMPCAD — Collision and component protection monitoring",
        "FFWON / FFWOF — Feed-forward control activation/deactivation",
        "PROC / ENDPROC — Structured subroutine programming with parameter passing",
        "FGROUP — Axis feed group definition for 5-axis interpolation",
        "G505–G599 — Extended work offsets (95 additional frames)",
        "SUPA — Super G0 retract (ignores all frames including G53)",
        "CIP — Circle through intermediate point (G2/G3 alternative)",
        "TRANS / ATRANS / ROT / AROT — Programmable zero shifts and rotations",
      ],
    },
    resources: [
      {
        type: "cps",
        path: "H:\\PRISM\\resources\\FUSION BASIC POSTS\\siemens-840d.cps",
        description: "Autodesk Fusion 360 Siemens SINUMERIK 840D post processor",
        version: "44207 (2025-12-17)",
      },
      {
        type: "cps",
        path: "H:\\PRISM\\resources\\FUSION BASIC POSTS\\siemens sinumerik one.cps",
        description: "Autodesk Fusion 360 Siemens SINUMERIK ONE post processor",
        version: "44207 (2025-12-17)",
      },
    ],
    cycleDefinitions: [
      // ── Drilling cycles ─────────────────────────────────────────────────
      {
        name: "Drilling",
        gCode: "CYCLE81",
        description: "Basic drilling — feed to depth, rapid retract; no dwell",
        parameters: [
          { letter: "RTP",    description: "Retract plane (absolute)",                             required: true  },
          { letter: "RFP",    description: "Reference plane (absolute)",                           required: true  },
          { letter: "SDIS",   description: "Safety distance above reference plane",                required: false, defaultValue: 2 },
          { letter: "DP",     description: "Final drilling depth (absolute)",                      required: true  },
          { letter: "DPR",    description: "Depth relative to RFP (unsigned; alternative to DP)", required: false },
          { letter: "_GMODE", description: "Extended: geometry mode — 0=tip-based depth",         required: false, defaultValue: 0 },
          { letter: "_DMODE", description: "Extended: plane mode — 0=keep current active plane",  required: false, defaultValue: 0 },
          { letter: "_AMODE", description: "Extended: alternate mode bit-coded",                  required: false, defaultValue: 10 },
        ],
        notes: [
          "Called with MCALL for modal positioning — subsequent XY moves repeat the cycle",
          "Cancel modal call with bare MCALL (no arguments) after last hole",
          "useExtendedCycles post property appends _GMODE, _DMODE, _AMODE (requires control >= 2011)",
        ],
      },
      {
        name: "Spot Drilling / Counterbore",
        gCode: "CYCLE82",
        description: "Drilling with programmable dwell at depth — spot drilling and counterboring",
        parameters: [
          { letter: "RTP",    description: "Retract plane (absolute)",               required: true  },
          { letter: "RFP",    description: "Reference plane (absolute)",             required: true  },
          { letter: "SDIS",   description: "Safety distance",                        required: false, defaultValue: 2 },
          { letter: "DP",     description: "Final depth (absolute)",                 required: true  },
          { letter: "DPR",    description: "Depth relative to RFP",                 required: false },
          { letter: "DTB",    description: "Dwell time at depth (seconds)",          required: false, defaultValue: 0 },
          { letter: "_GMODE", description: "Extended: geometry mode",                required: false, defaultValue: 0 },
          { letter: "_DMODE", description: "Extended: plane mode",                   required: false, defaultValue: 0 },
          { letter: "_AMODE", description: "Extended: alternate mode",               required: false, defaultValue: 10 },
        ],
        notes: [
          "DTB dwell prevents bell-mouthing — essential for spot-drilling chamfer preparation",
          "Use for countersinking: dwell ensures full cone form at the programmed depth",
        ],
      },
      {
        name: "Deep Hole Drilling (Peck)",
        gCode: "CYCLE83",
        description: "Deep hole drilling — chip breaking (VARI=0) or full retract (VARI=1) peck cycles",
        parameters: [
          { letter: "RTP",    description: "Retract plane (absolute)",                            required: true  },
          { letter: "RFP",    description: "Reference plane (absolute)",                          required: true  },
          { letter: "SDIS",   description: "Safety distance",                                     required: false, defaultValue: 2 },
          { letter: "DP",     description: "Final depth (absolute)",                              required: true  },
          { letter: "DPR",    description: "Depth relative to RFP",                              required: false },
          { letter: "FDEP",   description: "First drilling depth (absolute)",                     required: true  },
          { letter: "FDPR",   description: "First depth relative to RFP (unsigned)",              required: false },
          { letter: "_DAM",   description: "Degression per peck (unsigned; reduces peck depth)",  required: false, defaultValue: 0 },
          { letter: "DTB",    description: "Dwell time at depth",                                 required: false, defaultValue: 0 },
          { letter: "DTS",    description: "Dwell time at start of each peck",                    required: false, defaultValue: 0 },
          { letter: "FRF",    description: "Feedrate factor for first peck (0.001-1.0)",          required: false, defaultValue: 1 },
          { letter: "VARI",   description: "Variant: 0=chip break (partial retract), 1=full retract to RTP+SDIS", required: true },
          { letter: "_AXN",   description: "Tool axis (blank = active plane normal)",             required: false },
          { letter: "_MDEP",  description: "Minimum peck depth",                                  required: false },
          { letter: "_VRT",   description: "Retract distance for chip breaking (VARI=0)",         required: false, defaultValue: 1 },
          { letter: "_DTD",   description: "Dwell time at depth (alternate to DTB)",              required: false, defaultValue: 0 },
          { letter: "_DIS1",  description: "Limit distance",                                      required: false, defaultValue: 0 },
          { letter: "_GMODE", description: "Extended: geometry mode (0=tip-based depth)",         required: false, defaultValue: 0 },
          { letter: "_DMODE", description: "Extended: plane mode",                                required: false, defaultValue: 0 },
          { letter: "_AMODE", description: "Extended: alternate mode — 1001110 typical",          required: false, defaultValue: 1001110 },
        ],
        notes: [
          "VARI=0: chip breaking — partial retract by _VRT mm; faster but less chip clearing",
          "VARI=1: full retract — pulls chip to surface; required for gummy materials (stainless, Ti)",
          "Degression: each successive peck = previous peck minus _DAM (use for work-hardening materials)",
          "FRF < 1.0 slows the first peck to improve drill entry stability",
        ],
      },
      {
        name: "Tapping (Rigid / Floating)",
        gCode: "CYCLE84",
        description: "Rigid or floating tapping — synchronised spindle and feed, supports LH/RH threads",
        parameters: [
          { letter: "RTP",     description: "Retract plane (absolute)",                              required: true  },
          { letter: "RFP",     description: "Reference plane (absolute)",                            required: true  },
          { letter: "SDIS",    description: "Safety distance",                                       required: false, defaultValue: 2 },
          { letter: "DP",      description: "Final depth (absolute)",                                required: true  },
          { letter: "DPR",     description: "Depth relative to RFP",                                required: false },
          { letter: "DTB",     description: "Dwell time at depth",                                   required: false, defaultValue: 0 },
          { letter: "SDAC",    description: "Spindle direction after cycle (3=CW, 4=CCW, 5=stop)",  required: true  },
          { letter: "MPIT",    description: "Thread size as metric M-number (M1-M48); blank if using PIT", required: false },
          { letter: "PIT",     description: "Thread pitch in mm/rev (e.g., 1.25 for M8x1.25)",      required: false },
          { letter: "POSS",    description: "Spindle position for oriented stop (degrees)",          required: false, defaultValue: 0 },
          { letter: "SST",     description: "Tapping speed (rpm)",                                   required: true  },
          { letter: "SST1",    description: "Retract speed (rpm); typically same as SST",            required: false },
          { letter: "_AXN",    description: "Tool axis (0 = tool spindle)",                          required: false, defaultValue: 0 },
          { letter: "_PITA",   description: "Pitch unit: 1=mm, 2=inch, 3=TPI",                      required: false, defaultValue: 1 },
          { letter: "_TECHNO", description: "Technology parameter string",                           required: false },
          { letter: "_VARI",   description: "Machining type: 0=full depth, 1=partial retract, 2=full retract", required: false, defaultValue: 0 },
          { letter: "_DAM",    description: "Incremental depth for partial tapping",                 required: false },
          { letter: "_VRT",    description: "Retract distance for chip breaking",                    required: false },
        ],
        notes: [
          "840D rigid tapping is default — no floating tap holder required",
          "LH tap: SDAC=4, _AMODE=1002002; RH tap: SDAC=3, _AMODE=1001002",
          "PIT in mm/rev — M8x1.25 -> PIT=1.25; M10x1.5 -> PIT=1.5",
          "For metric threads: MPIT=8 (M8) auto-selects standard pitch; PIT overrides",
        ],
      },
      {
        name: "Reaming",
        gCode: "CYCLE85",
        description: "Reaming — independent in-feed (FFR) and retract (RFF) rates; optional dwell",
        parameters: [
          { letter: "RTP",  description: "Retract plane (absolute)",       required: true  },
          { letter: "RFP",  description: "Reference plane (absolute)",     required: true  },
          { letter: "SDIS", description: "Safety distance",                required: false, defaultValue: 2 },
          { letter: "DP",   description: "Final depth (absolute)",         required: true  },
          { letter: "DPR",  description: "Depth relative to RFP",         required: false },
          { letter: "DTB",  description: "Dwell at depth (seconds)",       required: false, defaultValue: 0 },
          { letter: "FFR",  description: "Feed rate for reaming (mm/min)", required: true  },
          { letter: "RFF",  description: "Feed rate for retract (mm/min)", required: true  },
        ],
        notes: [
          "Use separate FFR (ream) and RFF (retract) to prevent scratch marks on bore wall",
          "Typical: RFF = 2-3x FFR for fast retract; always match FFR to reamer manufacturer rec",
        ],
      },
      {
        name: "Boring — Stop without Dwell (No Orient)",
        gCode: "CYCLE87",
        description: "Boring with spindle stop at depth — no dwell, requires manual retract; uncommon in automation",
        parameters: [
          { letter: "RTP",  description: "Retract plane (absolute)",         required: true  },
          { letter: "RFP",  description: "Reference plane",                  required: true  },
          { letter: "SDIS", description: "Safety distance",                  required: false },
          { letter: "DP",   description: "Final depth (absolute)",           required: true  },
          { letter: "DPR",  description: "Depth relative to RFP",           required: false },
          { letter: "SDIR", description: "Spindle direction (3=CW, 4=CCW)", required: true  },
        ],
        notes: ["Used in automated cells only when manual intervention is acceptable"],
      },
      {
        name: "Boring — Stop with Dwell",
        gCode: "CYCLE88",
        description: "Boring with spindle stop and dwell at depth — selected when cycle.dwell > 0",
        parameters: [
          { letter: "RTP",  description: "Retract plane (absolute)",         required: true  },
          { letter: "RFP",  description: "Reference plane",                  required: true  },
          { letter: "SDIS", description: "Safety distance",                  required: false },
          { letter: "DP",   description: "Final depth (absolute)",           required: true  },
          { letter: "DPR",  description: "Depth relative to RFP",           required: false },
          { letter: "DTB",  description: "Dwell time (seconds)",             required: false, defaultValue: 0 },
          { letter: "SDIR", description: "Spindle direction (3=CW, 4=CCW)", required: true  },
        ],
        notes: [
          "Post selects CYCLE88 over CYCLE87 when cycle.dwell > 0",
          "After dwell the spindle re-starts and the tool retracts at feed rate",
        ],
      },
      {
        name: "Fine Boring (Orient Retract)",
        gCode: "CYCLE86",
        description: "Fine boring — oriented spindle stop, lateral shift before retract to prevent wall scratches",
        parameters: [
          { letter: "RTP",  description: "Retract plane (absolute)",                          required: true  },
          { letter: "RFP",  description: "Reference plane",                                   required: true  },
          { letter: "SDIS", description: "Safety distance",                                   required: false },
          { letter: "DP",   description: "Final depth (absolute)",                            required: true  },
          { letter: "DPR",  description: "Depth relative to RFP",                            required: false },
          { letter: "DTB",  description: "Dwell at depth",                                   required: false, defaultValue: 0 },
          { letter: "SDIR", description: "Spindle direction (3=CW, 4=CCW)",                  required: true  },
          { letter: "RPA",  description: "Retract shift in abscissa — -cos(orient)*shift",   required: true  },
          { letter: "RPO",  description: "Retract shift in ordinate — -sin(orient)*shift",   required: true  },
          { letter: "RPAP", description: "Retract in applicate (incremental, signed)",        required: false, defaultValue: 0 },
          { letter: "POSS", description: "Spindle orientation angle for stop (degrees)",      required: true  },
        ],
        notes: [
          "POSS orients insert tip away from bore wall; RPA/RPO shift clears the insert before retract",
          "Required for H7-class precision bores — prevents scratch from the insert tip",
          "_GMODE=0: lift-off; _DMODE=0: keep active plane; _AMODE=10: dwell in seconds",
        ],
      },
      {
        name: "Boring (Feed Retract)",
        gCode: "CYCLE89",
        description: "Simple boring — feed in, dwell, feed out at same rate; no spindle orient",
        parameters: [
          { letter: "RTP",  description: "Retract plane (absolute)", required: true  },
          { letter: "RFP",  description: "Reference plane",          required: true  },
          { letter: "SDIS", description: "Safety distance",          required: false },
          { letter: "DP",   description: "Final depth (absolute)",   required: true  },
          { letter: "DPR",  description: "Depth relative to RFP",   required: false },
          { letter: "DTB",  description: "Dwell at depth",          required: false, defaultValue: 0 },
        ],
        notes: ["Retract at feed rate; minimal bore-wall marks; simpler than CYCLE86"],
      },
      // ── 5-Axis / Tilted Workplane ────────────────────────────────────────
      {
        name: "Tilted Working Plane",
        gCode: "CYCLE800",
        description: "3+2 indexed machining — positions rotary axes and activates a tilted WCS from a swivel data record",
        parameters: [
          { letter: "FR",    description: "Retract mode: 0=none, 1=retract Z, 2=retract Z then XY",                required: true,  defaultValue: 1   },
          { letter: "TC",    description: "Swivel data record name (string, in double quotes)",                     required: true                      },
          { letter: "ST",    description: "Selection from swivel data record (0 = use record as-is)",              required: false, defaultValue: 0   },
          { letter: "MODE",  description: "Euler rotation sequence: 27=CBA(ZYX), 39=CAB(ZXY), 57=ABC(XYZ), 45=ACB(XZY), 30=BCA(YZX), 54=BAC(YXZ), 192=rotary angles", required: true, defaultValue: 27 },
          { letter: "X0",    description: "Tool carrier pivot point offset X",                                      required: false, defaultValue: 0   },
          { letter: "Y0",    description: "Tool carrier pivot point offset Y",                                      required: false, defaultValue: 0   },
          { letter: "Z0",    description: "Tool carrier pivot point offset Z",                                      required: false, defaultValue: 0   },
          { letter: "A",     description: "Rotation angle around X axis (degrees)",                                 required: true                      },
          { letter: "B",     description: "Rotation angle around Y axis (degrees)",                                 required: true                      },
          { letter: "C",     description: "Rotation angle around Z axis (degrees)",                                 required: true                      },
          { letter: "X1",    description: "Offset X in new tilted coordinate system",                               required: false, defaultValue: 0   },
          { letter: "Y1",    description: "Offset Y in new tilted coordinate system",                               required: false, defaultValue: 0   },
          { letter: "Z1",    description: "Offset Z in new tilted coordinate system",                               required: false, defaultValue: 0   },
          { letter: "DIR",   description: "Rotation direction for shortest path: 1=positive, -1=negative",         required: true,  defaultValue: -1  },
          { letter: "FR_I",  description: "Extended: intermediate retract mode",                                    required: false                     },
          { letter: "DMODE", description: "Extended: plane mode after activation (0=keep current)",                required: false, defaultValue: 0   },
        ],
        notes: [
          "CYCLE800() with no arguments cancels the tilted working plane and returns to G54",
          "TC must match a Swivel Data Record name configured in machine data (SD 42940-42970)",
          "MODE 27 (ZYX Euler, CBA order) is most common for 840D table/head kinematics",
          "MODE 192 uses actual rotary axis positions directly — requires multi-axis machine config",
          "Post property cycle800SwivelDataRecord sets TC; this MUST match the machine setup record name",
          "Controls prior to 2011: set useExtendedCycles=false (omit FR_I and DMODE)",
          "Retract modes: FR=0 no move, FR=1 retract Z only, FR=2 retract Z then X/Y to home",
          "After CYCLE800 the WCS is tilted — all subsequent XYZ moves are in the tilted frame",
        ],
      },
      {
        name: "High-Speed Smoothing",
        gCode: "CYCLE832",
        description: "HSC mode — activates jerk/acc smoothing and look-ahead for surface quality; tolerance-based",
        parameters: [
          { letter: "TOL",    description: "Contour tolerance in mm — tighter = smoother surface but slower",         required: true,  defaultValue: 0.01   },
          { letter: "TECHNO", description: "6-digit technology code: 112001=roughing, 112002=semi, 112003=finishing", required: true,  defaultValue: 112001 },
          { letter: "VARI",   description: "Variant — 1=active (used in legacy alternate CYCLE832 syntax only)",      required: false, defaultValue: 1      },
        ],
        notes: [
          "Standard syntax: CYCLE832(0.01, 112001) — tolerance then 6-digit tech code",
          "6-digit TECHNO = '11200' prefix + level digit: 1=rough, 2=semi-rough, 3=finish",
          "CYCLE832() (no args) cancels smoothing — always cancel before tool change",
          "Post auto mode (useSmoothing=9999): selects level from operation stock/tolerance",
          "Thresholds: stock >= 0.2mm -> level 3 roughing; stock <= 0.05mm -> level 1 finishing",
          "CYCLE832 affects look-ahead (up to 500 blocks), jerk filtering, and acc/dec profile",
          "Alternative syntax: CYCLE832(0.01, 1, 1) — tolerance, level, variant (pre-2011 style)",
        ],
      },
      {
        name: "5-Axis TCP Transformation",
        gCode: "TRAORI",
        description: "Real-time TCP transformation for simultaneous 5-axis — maintains tool-tip position while rotating",
        parameters: [
          { letter: "n",   description: "Transformation number — omit or use 1 for the default transformation", required: false, defaultValue: 1 },
          { letter: "A3=", description: "Tool orientation vector I-component (unit vector, active during G1 moves)", required: false },
          { letter: "B3=", description: "Tool orientation vector J-component",                                       required: false },
          { letter: "C3=", description: "Tool orientation vector K-component",                                       required: false },
        ],
        notes: [
          "TRAORI activates 5-axis simultaneous machining with real-time TCP (RTCP) compensation",
          "TRAFOOF cancels the TCP transformation — always call before repositioning in machine coords",
          "With TRAORI active: G1 moves maintain constant tool-tip position regardless of rotary motion",
          "Tool vector on each G1 block: A3=<I> B3=<J> C3=<K> (unit vector, output every line)",
          "FGROUP(X,Y,Z,A,B) before TRAORI specifies which axes belong to the interpolation feed group",
          "Use TRAORI only for simultaneous 5-axis — for 3+2 indexed machining use CYCLE800 instead",
          "Post: TRAORI for multi-axis TCP sections; TRAFOOF at section end or before tool change",
          "SINUMERIK ONE: TRAORI also supports tool-tip following in ACC (advanced surface control)",
        ],
      },
    ],
    mCodeMappings: [
      { mCode: 0,  description: "Program Stop — unconditional; requires operator restart",            category: "special"  },
      { mCode: 1,  description: "Optional Stop — active when optional stop switch is on",             category: "special"  },
      { mCode: 2,  description: "End of Program — no rewind; does not return to program start",       category: "special"  },
      { mCode: 3,  description: "Spindle CW (clockwise)",                                             category: "spindle"  },
      { mCode: 4,  description: "Spindle CCW (counter-clockwise)",                                    category: "spindle"  },
      { mCode: 5,  description: "Spindle Stop",                                                       category: "spindle"  },
      { mCode: 6,  description: "Tool Change — T-word selects tool; M6 executes the change",          category: "tool",    notes: "Next tool pre-loaded in carousel if preloadTool property=true" },
      { mCode: 7,  description: "Coolant Mist On",                                                    category: "coolant"  },
      { mCode: 8,  description: "Flood Coolant On",                                                   category: "coolant"  },
      { mCode: 9,  description: "All Coolant Off",                                                    category: "coolant"  },
      { mCode: 17, description: "End of Subroutine (SPF) — return to caller program",                 category: "special", notes: "Placed at end of .spf subprogram files; equivalent to Fanuc M99" },
      { mCode: 19, description: "Spindle Oriented Stop — use SPOS= for angle",                        category: "spindle", notes: "Required before CYCLE86 fine boring and CYCLE84 with POSS" },
      { mCode: 30, description: "End of Main Program — rewinds to program start",                     category: "special"  },
      { mCode: 40, description: "Gear Range Automatic Selection",                                     category: "spindle", notes: "M40-M45 select gear ranges; M40=auto selects based on S-word" },
      { mCode: 41, description: "Gear Range 1 (lowest speed range)",                                  category: "spindle"  },
      { mCode: 42, description: "Gear Range 2",                                                       category: "spindle"  },
      { mCode: 43, description: "Gear Range 3",                                                       category: "spindle"  },
      { mCode: 44, description: "Gear Range 4",                                                       category: "spindle"  },
      { mCode: 45, description: "Gear Range 5 (highest speed range)",                                 category: "spindle"  },
      { mCode: 70, description: "Mirror X axis",                                                      category: "special", notes: "Siemens programmable mirror — also use MIRROR/AMIRROR keywords" },
      { mCode: 71, description: "Mirror Y axis",                                                      category: "special"  },
      { mCode: 74, description: "Delete Mirroring",                                                   category: "special"  },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G0",
      linearMove: "G1",
      cwArc: "G2",
      ccwArc: "G3",
      dwell: "G4",
      toolLengthComp: "D1",
      toolLengthCancel: "D0",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M3",
      spindleCCW: "M4",
      spindleStop: "M5",
      coolantOn: "M8",
      coolantOff: "M9",
      toolChange: "M6",
      rigidTapCode: "CYCLE84",
      smoothingCode: "CYCLE832",
      highAccuracyCode: "TRAORI",
    },
  },

  mazatrol: {
    family: "mazatrol",
    name: "Mazatrol",
    versions: ["Matrix", "Matrix 2", "Smart", "SmoothX", "SmoothG"],
    manufacturer: "Mazak",
    programmingStyle: "conversational",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 500,
      maxBlockRate: 1500,
      maxAxes: 5,
      supportsNURBS: true,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["Smooth Machining"],
      uniqueFeatures: [
        "Mazatrol Conversational Programming",
        "SmoothAI",
        "Smooth Corner Control",
        "Active Vibration Control",
        "Intelligent Pocket Milling",
      ],
    },
    resources: [
      {
        type: "cps",
        path: "H:\\PRISM\\resources\\FUSION BASIC POSTS\\mazak integrex i-200.cps",
        description: "Mazak Integrex i-200 Fusion 360 Post Processor (Smooth/Matrix)",
        version: "44199",
      },
      {
        type: "cps",
        path: "H:\\PRISM\\resources\\FUSION BASIC POSTS\\mazak qtu 200-m.cps",
        description: "Mazak QTU 200-M (Quick Turn) Fusion 360 Post Processor (Smooth/Matrix/640MT)",
        version: "44199",
      },
      {
        type: "cps",
        path: "H:\\PRISM\\resources\\FUSION BASIC POSTS\\mazak turning.cps",
        description: "Mazak Turning baseline post processor (EIA turning operations)",
      },
    ],
    cycleDefinitions: [
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle (EIA mode)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position (live tooling / Integrex milling)", required: false },
          { letter: "Z", description: "Z depth (absolute)", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "EIA (ISO) programming mode only — not applicable in Mazatrol conversational",
          "On mill-turn: engage C-axis with M200 before milling cycles",
          "G17 plane select required for XY-plane drilling on live tooling",
        ],
      },
      {
        name: "Peck Drilling",
        gCode: "G83",
        description: "Deep-hole peck drilling — full retract between pecks",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment (positive value)", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [
          "Use for L/D > 3 in live tooling operations",
          "Full retract to R-plane for chip evacuation",
        ],
      },
      {
        name: "High Speed Peck Drilling",
        gCode: "G73",
        description: "Chip-break peck drilling — partial retract (faster than G83)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Partial retract for chip breaking only", "Use for L/D 2-4 with good chip control"],
      },
      {
        name: "Rigid Tapping",
        gCode: "G84",
        description: "Rigid tapping — M29 required on Matrix; Smooth uses G84 natively",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch in mm/rev", required: true },
        ],
        notes: [
          "Matrix: output M29 S[rpm] before G84 block for rigid mode",
          "Smooth: G84 alone engages rigid tap via parameter setting",
          "Feed-per-revolution mode (G95) must be active during rigid tapping",
        ],
      },
      {
        name: "Simple Threading — Quick Turn / QTU",
        gCode: "G92",
        description: "Single-pass thread cutting cycle for lathe (QTU / Quick Turn controllers)",
        parameters: [
          { letter: "X", description: "Thread minor diameter (diameter mode)", required: true },
          { letter: "Z", description: "Thread end Z position", required: true },
          { letter: "F", description: "Thread pitch in mm/rev", required: true },
          { letter: "R", description: "Taper amount (for tapered threads)", required: false },
        ],
        notes: [
          "Single-pass — programmer specifies successive X infeed values for multiple passes",
          "Fusion post property useSimpleThread=true outputs G92 on QTU",
          "Same G-code on 640MT, Matrix, and Smooth controllers",
        ],
      },
      {
        name: "Multiple-Pass Threading — Quick Turn / QTU",
        gCode: "G76",
        description: "Automatic multi-pass thread cutting cycle (QTU / Quick Turn)",
        parameters: [
          { letter: "P", description: "Thread form P010060 = 1 finish pass, 0 deg relief, 60 deg angle (first block)", required: true },
          { letter: "Q", description: "Minimum depth of cut radius value (first block)", required: true },
          { letter: "R", description: "Finish allowance radius (first block)", required: true },
          { letter: "X", description: "Thread minor diameter (second block)", required: true },
          { letter: "Z", description: "Thread end Z (second block)", required: true },
          { letter: "F", description: "Thread pitch", required: true },
        ],
        notes: [
          "Two-block format: first block sets tool nose/finish, second defines thread geometry",
          "Preferred for production threading — control calculates all infeed passes",
          "Fusion post property useSimpleThread=false outputs G76",
        ],
      },
      {
        name: "Simple Threading — Integrex",
        gCode: "G292",
        description: "Single-pass thread cutting cycle for Integrex i-series (EIA mode)",
        parameters: [
          { letter: "X", description: "Thread minor diameter (diameter mode)", required: true },
          { letter: "Z", description: "Thread end Z position", required: true },
          { letter: "F", description: "Thread pitch in mm/rev", required: true },
        ],
        notes: [
          "Integrex-specific — G292 is the Integrex analogue of lathe G92",
          "Fusion Integrex post: useSimpleThread=true outputs G292",
          "EIA programming mode only; not available in Mazatrol conversational",
        ],
      },
      {
        name: "Multiple-Pass Threading — Integrex",
        gCode: "G276",
        description: "Automatic multi-pass threading cycle for Integrex i-series (EIA mode)",
        parameters: [
          { letter: "P", description: "Thread form parameters", required: true },
          { letter: "Q", description: "Minimum cut depth (radius)", required: true },
          { letter: "R", description: "Finish allowance", required: true },
          { letter: "X", description: "Thread minor diameter", required: true },
          { letter: "Z", description: "Thread end Z", required: true },
          { letter: "F", description: "Thread pitch", required: true },
        ],
        notes: [
          "Integrex-specific equivalent of G76 for lathe",
          "Fusion Integrex post: useSimpleThread=false outputs G276",
        ],
      },
      {
        name: "Polar Interpolation ON",
        gCode: "G12.1",
        description: "Enable polar (XC) interpolation — mills slots/flats/keyways on turned parts",
        parameters: [
          { letter: "G12.1", description: "Enable for main spindle", required: true },
          { letter: "P2", description: "Enable for sub-spindle (Integrex only)", required: false },
        ],
        notes: [
          "Converts XY linear moves into X-radius and C-rotary-degrees for live tooling",
          "Must engage C-axis (M200) and set RPM (G97) or CSS (G96) before G12.1",
          "Cancel with G13.1 before returning to turning — omission corrupts subsequent turning moves",
          "Integrex sub-spindle: add P2 parameter — G12.1 P2",
          "Post property polarAxisDesignation=XC outputs X and C words; UH outputs U and H words",
          "G61.1 geometry compensation (useG61=true) should be active during polar milling",
        ],
      },
      {
        name: "Polar Interpolation OFF",
        gCode: "G13.1",
        description: "Cancel polar interpolation — return to normal Cartesian / turning mode",
        parameters: [],
        notes: [
          "Always cancel G12.1 before turning operations or program end",
          "Omitting G13.1 causes control to interpret turning X moves as Cartesian not diameter",
        ],
      },
      {
        name: "Tilted Work Plane — G68",
        gCode: "G68",
        description: "3+2 tilted work plane using rotation vector (standard Integrex method)",
        parameters: [
          { letter: "X", description: "Rotation origin X", required: true },
          { letter: "Y", description: "Rotation origin Y", required: true },
          { letter: "Z", description: "Rotation origin Z", required: true },
          { letter: "I", description: "Rotation axis I component", required: true },
          { letter: "J", description: "Rotation axis J component", required: true },
          { letter: "K", description: "Rotation axis K component", required: true },
          { letter: "R", description: "Rotation angle (degrees)", required: true },
        ],
        notes: [
          "Fusion post property tiltedPlaneMethod=G68",
          "B-axis must be physically positioned before G68 is issued",
          "Cancel tilted plane with G69",
          "Use G43 H#3020 for TCP tool length compensation in tilted plane",
        ],
      },
      {
        name: "Tilted Work Plane — G68.2",
        gCode: "G68.2",
        description: "3+2 tilted work plane using Euler angles (Smooth controller preferred)",
        parameters: [
          { letter: "X", description: "Origin X offset", required: true },
          { letter: "Y", description: "Origin Y offset", required: true },
          { letter: "Z", description: "Origin Z offset", required: true },
          { letter: "I", description: "Euler angle 1 (degrees)", required: true },
          { letter: "J", description: "Euler angle 2 (degrees)", required: true },
          { letter: "K", description: "Euler angle 3 (degrees)", required: true },
        ],
        notes: [
          "Fusion post property tiltedPlaneMethod=G68.2",
          "Preferred for Smooth controllers — enables full RTCP during 3+2 operations",
          "Cancel with G69",
        ],
      },
      {
        name: "Constant Surface Speed",
        gCode: "G96",
        description: "CSS — spindle RPM auto-adjusts to maintain surface speed as diameter changes",
        parameters: [
          { letter: "S", description: "Surface speed in m/min (metric) or sfm (inch)", required: true },
        ],
        notes: [
          "Always set maximum RPM clamp with G50 S_ before activating G96",
          "Cancel with G97 (direct RPM mode) when switching to live tooling milling",
          "Required for finish turning — prevents speed runaway and chatter at small diameters",
        ],
      },
    ],
    mCodeMappings: [
      { mCode: 3, description: "Live Tool / Milling Spindle CW", category: "spindle", notes: "Integrex: M3 = live tool (SPINDLE_LIVE). QTU: M3 = live tool" },
      { mCode: 4, description: "Live Tool / Milling Spindle CCW", category: "spindle" },
      { mCode: 5, description: "Live Tool / Milling Spindle Stop", category: "spindle" },
      { mCode: 203, description: "Main Turning Spindle CW (Integrex)", category: "spindle", notes: "SPINDLE_MAIN on Integrex = M203" },
      { mCode: 204, description: "Main Turning Spindle CCW (Integrex)", category: "spindle" },
      { mCode: 205, description: "Main Turning Spindle Stop (Integrex)", category: "spindle" },
      { mCode: 210, description: "Clamp / Index Main Spindle (Integrex)", category: "spindle", notes: "Clamp for C-axis indexing or tool change positioning" },
      { mCode: 212, description: "Unclamp Main Spindle (Integrex)", category: "spindle" },
      { mCode: 207, description: "Clamp Main Chuck (Integrex)", category: "special" },
      { mCode: 206, description: "Unclamp Main Chuck (Integrex)", category: "special" },
      { mCode: 200, description: "Enable C-Axis Main Spindle (Integrex)", category: "special", notes: "Must be called before polar interpolation (G12.1) or live tooling milling" },
      { mCode: 202, description: "Disable C-Axis Main Spindle (Integrex)", category: "special" },
      { mCode: 303, description: "Sub Spindle CW", category: "spindle", notes: "SPINDLE_SUB = M303" },
      { mCode: 304, description: "Sub Spindle CCW", category: "spindle" },
      { mCode: 305, description: "Sub Spindle Stop", category: "spindle" },
      { mCode: 310, description: "Clamp / Index Sub Spindle", category: "spindle" },
      { mCode: 312, description: "Unclamp Sub Spindle", category: "spindle" },
      { mCode: 307, description: "Clamp Sub Chuck", category: "special" },
      { mCode: 306, description: "Unclamp Sub Chuck", category: "special" },
      { mCode: 300, description: "Enable C-Axis Sub Spindle", category: "special" },
      { mCode: 302, description: "Disable C-Axis Sub Spindle", category: "special" },
      { mCode: 14, description: "Lock C-Axis / Multi-Axis Brake Main Spindle (Integrex)", category: "special", notes: "Brake C-axis for rigid milling; separate from M210 spindle clamp" },
      { mCode: 15, description: "Unlock C-Axis / Multi-Axis Brake Main Spindle (Integrex)", category: "special" },
      { mCode: 114, description: "Lock C-Axis / Multi-Axis Brake Sub Spindle (Integrex)", category: "special" },
      { mCode: 115, description: "Unlock C-Axis / Multi-Axis Brake Sub Spindle (Integrex)", category: "special" },
      { mCode: 107, description: "Lock B-Axis (Integrex)", category: "special", notes: "Lock B before G68/G68.2 tilted plane or 3+2 milling operations" },
      { mCode: 108, description: "Unlock B-Axis (Integrex)", category: "special" },
      { mCode: 511, description: "Spindle Synchronization ON Phase or Speed (Matrix / Smooth)", category: "special", notes: "Bar stock transfer sync; Matrix uses M511 for both phase and speed modes" },
      { mCode: 513, description: "Spindle Synchronization OFF", category: "special" },
      { mCode: 508, description: "Torque Skip ON stock transfer torque control", category: "special", notes: "Sub-spindle applies pulling torque against main chuck during part transfer" },
      { mCode: 509, description: "Torque Skip OFF", category: "special" },
      { mCode: 31, description: "Interlock Bypass ON sub-spindle stock transfer", category: "special", notes: "Required to allow sub-spindle to close on part while main chuck is still clamped" },
      { mCode: 32, description: "Interlock Bypass OFF", category: "special" },
      { mCode: 380, description: "Speed Synchronization ON QTU 640MT controller only", category: "special", notes: "640MT uses M380 for speed sync instead of M511" },
      { mCode: 381, description: "Speed Synchronization OFF QTU 640MT only", category: "special" },
      { mCode: 19, description: "Orient Main Spindle (to reference angle)", category: "spindle" },
      { mCode: 39, description: "Orient Sub Spindle", category: "spindle" },
      { mCode: 29, description: "Rigid Tapping Mode Matrix must precede G84", category: "special", notes: "Matrix: output M29 S[rpm] before G84 for rigid tap; Smooth does not require M29" },
      { mCode: 8, description: "Flood Coolant On", category: "coolant" },
      { mCode: 9, description: "All Coolant Off", category: "coolant" },
      { mCode: 51, description: "Through Spindle Coolant On (Integrex TSC)", category: "coolant", notes: "Integrex: coolant through milling spindle; off = M163" },
      { mCode: 163, description: "Through Spindle Coolant Off (Integrex TSC)", category: "coolant" },
      { mCode: 88, description: "Through Spindle Coolant On (QTU)", category: "coolant", notes: "QTU / Quick Turn TSC; off = M89" },
      { mCode: 89, description: "Through Spindle Coolant Off (QTU)", category: "coolant" },
      { mCode: 129, description: "Air Blast On (Integrex)", category: "coolant" },
      { mCode: 26, description: "Air Blast On Main Spindle (QTU)", category: "coolant" },
      { mCode: 27, description: "Air Blast Off Main Spindle (QTU)", category: "coolant" },
      { mCode: 36, description: "Air Blast On Sub Spindle (QTU)", category: "coolant" },
      { mCode: 37, description: "Air Blast Off Sub Spindle (QTU)", category: "coolant" },
      { mCode: 248, description: "Part Catcher Extend (Integrex)", category: "special" },
      { mCode: 249, description: "Part Catcher Retract (Integrex)", category: "special" },
      { mCode: 48, description: "Part Catcher Extend (QTU / Quick Turn)", category: "special" },
      { mCode: 49, description: "Part Catcher Retract (QTU / Quick Turn)", category: "special" },
      { mCode: 185, description: "Cycle Part Ejector (QTU)", category: "special" },
      { mCode: 841, description: "Tailstock Advance (Integrex)", category: "special" },
      { mCode: 843, description: "Tailstock Retract (Integrex)", category: "special" },
      { mCode: 741, description: "Tailstock Advance (QTU / Quick Turn)", category: "special" },
      { mCode: 743, description: "Tailstock Retract (QTU / Quick Turn)", category: "special" },
      { mCode: 0, description: "Program Stop", category: "special" },
      { mCode: 1, description: "Optional Stop", category: "special" },
      { mCode: 2, description: "Program End", category: "special" },
      { mCode: 30, description: "Program End + Rewind", category: "special" },
      { mCode: 6, description: "Tool Change EIA mode", category: "tool", notes: "Mazatrol conversational handles tool selection in tool block; M06 used in EIA mode only" },
      { mCode: 98, description: "Subprogram Call", category: "special" },
      { mCode: 99, description: "Return from Subprogram", category: "special" },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCompFixed: "G43 H#3020",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      geometryCompOn: "G61.1",
      workOffsetBase: "G54",
      workOffsetG55: "G55",
      workOffsetG56: "G56",
      workOffsetG57: "G57",
      workOffsetG58: "G58",
      workOffsetG59: "G59",
      extendedWorkOffsets: "G54.1 P1-P48",
      xyPlane: "G17",
      xzPlane: "G18",
      yzPlane: "G19",
      inchMode: "G20",
      metricMode: "G21",
      machineCoordinates: "G53",
      localCoordinateSystem: "G52",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      mainSpindleCW: "M203",
      mainSpindleCCW: "M204",
      mainSpindleStop: "M205",
      constantSurfaceSpeed: "G96",
      rpmMode: "G97",
      maxRpmClamp: "G50 S_",
      feedPerMinute: "G94",
      feedPerRev: "G95",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
      programEnd: "M30",
      programStop: "M00",
      optionalStop: "M01",
      cancelCannedCycle: "G80",
      returnToInitialLevel: "G98",
      returnToRLevel: "G99",
      rotation: "G68",
      rotationEuler: "G68.2",
      rotationCancel: "G69",
      polarInterpolationOn: "G12.1",
      polarInterpolationOff: "G13.1",
      polarSubSpindle: "G12.1 P2",
      enableCAxisMain: "M200",
      disableCAxisMain: "M202",
      enableCAxisSub: "M300",
      disableCAxisSub: "M302",
      lockBAxis: "M107",
      unlockBAxis: "M108",
      spindleSyncOn: "M511",
      spindleSyncOff: "M513",
      simpleThreadLathe: "G92",
      multiPassThreadLathe: "G76",
      simpleThreadIntegrex: "G292",
      multiPassThreadIntegrex: "G276",
      rigidTapCode: "M29",
      smoothingCode: "Smooth Machining Control",
      highAccuracyCode: "G61.1",
    },
  },

  heidenhain_tnc: {
    family: "heidenhain_tnc",
    name: "Heidenhain TNC",
    versions: ["iTNC 530", "TNC 620", "TNC 640"],
    manufacturer: "Heidenhain",
    programmingStyle: "hybrid",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 1024,
      maxBlockRate: 2000,
      maxAxes: 18,
      supportsNURBS: false,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["M128", "FUNCTION TCPM"],
      uniqueFeatures: [
        "Klartext Programming",
        "Dynamic Collision Monitoring (DCM)",
        "Adaptive Feed Control (AFC)",
        "3D Tool Compensation",
        "Touch Probe Cycles",
      ],
    },
    resources: [
      {
        type: "config",
        path: "H:\\prism\\resources\\HSMWorks 2026\\editor\\Templates\\Heidenhain Milling.TYP",
        description: "Heidenhain Milling Template",
      },
      {
        type: "config",
        path: "H:\\prism\\resources\\HSMWorks 2026\\editor\\Templates\\Heidenhain_iTNC530_60642x-04_SP8.TYP",
        description: "iTNC 530 Template",
      },
      {
        type: "config",
        path: "H:\\prism\\resources\\HSMWorks 2026\\editor\\Templates\\Heidenhain_Conversational.TYP",
        description: "Heidenhain Conversational Template",
      },
    ],
    cycleDefinitions: [
      {
        name: "Drilling",
        gCode: "CYCL DEF 200",
        description: "Basic drilling cycle",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Depth", required: true },
          { letter: "Q206", description: "Feed rate for plunging", required: true },
          { letter: "Q202", description: "Plunging depth", required: false },
          { letter: "Q210", description: "Dwell time at top", required: false },
          { letter: "Q203", description: "Surface coordinate", required: true },
          { letter: "Q204", description: "2nd set-up clearance", required: false },
          { letter: "Q211", description: "Dwell time at depth", required: false },
        ],
        notes: ["Klartext format", "Q203 defines workpiece surface"],
      },
      {
        name: "Universal Drilling",
        gCode: "CYCL DEF 203",
        description: "Universal drilling with full parameters",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Depth", required: true },
          { letter: "Q206", description: "Plunging feed", required: true },
          { letter: "Q202", description: "Plunging depth", required: true },
          { letter: "Q212", description: "Decrement", required: false },
          { letter: "Q213", description: "Breakthrough", required: false },
          { letter: "Q205", description: "Min plunge depth", required: false },
          { letter: "Q211", description: "Dwell time", required: false },
          { letter: "Q208", description: "Retract feed", required: false },
          { letter: "Q256", description: "Retract to", required: false },
        ],
        notes: ["Most versatile drilling cycle"],
      },
      {
        name: "Universal Pecking",
        gCode: "CYCL DEF 205",
        description: "Deep hole pecking with chip breaking",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Depth", required: true },
          { letter: "Q206", description: "Plunging feed", required: true },
          { letter: "Q202", description: "Peck depth", required: true },
          { letter: "Q212", description: "Decrement", required: false },
          { letter: "Q205", description: "Min depth", required: false },
          { letter: "Q258", description: "Distance from bottom", required: false },
          { letter: "Q259", description: "Feed for chip breaking", required: false },
          { letter: "Q257", description: "Chip break depth", required: false },
        ],
        notes: ["Full chip evacuation to R-plane"],
      },
      {
        name: "Rigid Tapping",
        gCode: "CYCL DEF 207",
        description: "Rigid tapping (new format)",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Thread depth", required: true },
          { letter: "Q239", description: "Pitch", required: true },
          { letter: "Q203", description: "Surface coordinate", required: true },
          { letter: "Q204", description: "2nd set-up clearance", required: false },
        ],
        notes: ["Synchronized spindle/feed", "For rigid tap holders"],
      },
      {
        name: "Tapping with Chip Break",
        gCode: "CYCL DEF 209",
        description: "Tapping with chip breaking pecks",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Thread depth", required: true },
          { letter: "Q239", description: "Pitch", required: true },
          { letter: "Q257", description: "Chip break depth", required: true },
          { letter: "Q256", description: "Retract distance", required: false },
          { letter: "Q336", description: "Angle of spindle", required: false },
        ],
        notes: ["For deep tapping in stringy materials"],
      },
      {
        name: "Reaming",
        gCode: "CYCL DEF 201",
        description: "Reaming cycle",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Depth", required: true },
          { letter: "Q206", description: "Feed rate", required: true },
          { letter: "Q211", description: "Dwell time", required: false },
          { letter: "Q208", description: "Retract feed", required: false },
        ],
        notes: ["Feed retract for better finish"],
      },
      {
        name: "Boring",
        gCode: "CYCL DEF 202",
        description: "Boring cycle with orient",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Depth", required: true },
          { letter: "Q206", description: "Feed rate", required: true },
          { letter: "Q211", description: "Dwell time", required: false },
          { letter: "Q214", description: "Disengaging direction", required: false },
          { letter: "Q336", description: "Angle of spindle", required: false },
        ],
        notes: ["Spindle orient for clean retract"],
      },
      {
        name: "Back Boring",
        gCode: "CYCL DEF 204",
        description: "Back boring / back counterboring",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q249", description: "Depth 1", required: true },
          { letter: "Q250", description: "Depth 2", required: true },
          { letter: "Q251", description: "Bore diameter", required: true },
          { letter: "Q252", description: "Pre-bore diameter", required: true },
          { letter: "Q253", description: "Feed for pre-pos", required: true },
          { letter: "Q254", description: "Milling feed", required: true },
          { letter: "Q255", description: "Shift amount", required: true },
        ],
        notes: ["For back counterboring through-holes"],
      },
      {
        name: "Bore Milling",
        gCode: "CYCL DEF 208",
        description: "Helical bore milling",
        parameters: [
          { letter: "Q200", description: "Set-up clearance", required: true },
          { letter: "Q201", description: "Depth", required: true },
          { letter: "Q206", description: "Helical feed", required: true },
          { letter: "Q334", description: "Helical infeed per rev", required: true },
          { letter: "Q335", description: "Nominal diameter", required: true },
          { letter: "Q342", description: "Pre-finishing diameter", required: false },
        ],
        notes: ["For large holes with small tools"],
      },
      {
        name: "Thread Milling",
        gCode: "CYCL DEF 262",
        description: "Thread milling cycle",
        parameters: [
          { letter: "Q335", description: "Nominal diameter", required: true },
          { letter: "Q239", description: "Pitch", required: true },
          { letter: "Q201", description: "Thread depth", required: true },
          { letter: "Q355", description: "Thread type (0=RH, 1=LH)", required: true },
          { letter: "Q253", description: "Pre-positioning feed", required: true },
          { letter: "Q351", description: "Climb/conventional", required: false },
        ],
        notes: ["Full-form or single-point thread mills"],
      },
      {
        name: "Tolerance/Smoothing",
        gCode: "CYCL DEF 32",
        description: "Tolerance and HSC smoothing control",
        parameters: [
          { letter: "T", description: "Tolerance value", required: true },
          { letter: "HSC-MODE", description: "0=finish, 1=rough", required: false },
          { letter: "TA", description: "Rotary tolerance", required: false },
        ],
        notes: ["Critical for HSM surface finish"],
      },
      {
        name: "Working Plane",
        gCode: "CYCL DEF 19",
        description: "Tilted working plane (legacy)",
        parameters: [
          { letter: "A", description: "A-axis rotation", required: false },
          { letter: "B", description: "B-axis rotation", required: false },
          { letter: "C", description: "C-axis rotation", required: false },
        ],
        notes: ["Replaced by PLANE SPATIAL in newer controls"],
      },
      {
        name: "Datum Shift",
        gCode: "CYCL DEF 7",
        description: "Work coordinate offset",
        parameters: [
          { letter: "X", description: "X offset", required: false },
          { letter: "Y", description: "Y offset", required: false },
          { letter: "Z", description: "Z offset", required: false },
        ],
        notes: ["CYCL DEF 7.1 #N for preset selection"],
      },
      {
        name: "Dwell",
        gCode: "CYCL DEF 9",
        description: "Dwell/pause cycle",
        parameters: [
          { letter: "DWELL", description: "Time in seconds", required: true },
        ],
        notes: ["Alternative to G4"],
      },
    ],
    mCodeMappings: [
      // Spindle
      { mCode: 3, description: "Spindle CW", category: "spindle" },
      { mCode: 4, description: "Spindle CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      { mCode: 19, description: "Spindle Orient", category: "spindle" },
      // Tool
      { mCode: 6, description: "Tool Change", category: "tool" },
      // Coolant
      { mCode: 7, description: "Mist Coolant", category: "coolant" },
      { mCode: 8, description: "Coolant On", category: "coolant" },
      { mCode: 9, description: "Coolant Off", category: "coolant" },
      // 5-Axis
      { mCode: 128, description: "TCPM On (Tool Center Point Management)", category: "special", notes: "5-axis TCP" },
      { mCode: 129, description: "TCPM Off", category: "special" },
      { mCode: 140, description: "Retract along tool axis", category: "special", notes: "MB MAX for Z retract" },
      // Safe Position
      { mCode: 91, description: "Position to machine zero (absolute)", category: "special" },
      { mCode: 92, description: "Position to machine zero (relative)", category: "special" },
      // Indexing
      { mCode: 94, description: "Linear axis indexing", category: "special" },
      { mCode: 126, description: "Shortest path for rotary", category: "special" },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "L",
      linearMove: "L",
      cwArc: "DR-",
      ccwArc: "DR+",
      dwell: "G04",
      toolLengthComp: "L",
      toolLengthCancel: "L",
      cutterCompLeft: "RL",
      cutterCompRight: "RR",
      cutterCompCancel: "R0",
      workOffsetBase: "CYCL DEF 7.0",
      programEnd: "M30",
      spindleCW: "M3",
      spindleCCW: "M4",
      spindleStop: "M5",
      coolantOn: "M8",
      coolantOff: "M9",
      toolChange: "TOOL CALL",
      smoothingCode: "M128",
    },
  },

  mitsubishi: {
    family: "mitsubishi",
    name: "Mitsubishi",
    // M70: entry-level, 200-block look-ahead, no SSS II
    // M80: mid-range, 400-block look-ahead, SSS Control II standard
    // M800: flagship, 540-block look-ahead, SSS Control II + OMR-DD + spline interpolation
    versions: ["M70", "M70V", "M80", "M80W", "M800", "M800W", "M850W"],
    manufacturer: "Mitsubishi Electric",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 540,          // M800 flagship; M80=400; M70=200
      maxBlockRate: 2400,      // M800W with SSS II; M80=1700; M70=1000
      maxAxes: 8,
      supportsNURBS: true,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["SSS Control II", "G05 P10000 (high-speed)", "Spline Interpolation"],
      uniqueFeatures: [
        "SSS Control II (Super Smooth Surface) — automatic spline conversion, 540-block look-ahead",
        "OMR-DD (Optimum Machine Response - Direct Drive) — feedforward servo control",
        "OMR-FF (Optimum Machine Response - Feed Forward) — M850W 5-axis motion smoothing",
        "Hybrid Control — simultaneous mill-turn with synchronized axes",
        "G-code List Types 2-7 — turning dialect (lists 2/4/6 use G98/G99; 3/5/7 use G94/G95)",
        "8-digit program numbers (O00000001–O99999999)",
        "Extended work offsets G54.1 P1–P300",
      ],
    },
    resources: [
      {
        type: "cps" as const,
        path: "H:/PRISM/resources/HSMWorks 2026/posts/mitsubishi.cps",
        description: "Mitsubishi milling post processor — Autodesk HSMWorks 2026",
        version: "44812",
      },
      {
        type: "cps" as const,
        path: "H:/PRISM/resources/FUSION BASIC POSTS/mitsubishi turning.cps",
        description: "Mitsubishi turning post processor — Autodesk Fusion 360 basic",
        version: "44193",
      },
      {
        type: "cps" as const,
        path: "H:/PRISM/resources/FUSION BASIC POSTS/mitsubishi.cps",
        description: "Mitsubishi milling post processor — Autodesk Fusion 360 basic",
      },
    ],
    cycleDefinitions: [
      {
        name: "Drilling",
        gCode: "G81",
        description: "Standard drilling — no dwell, rapid retract to R-plane or initial Z",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Hole bottom depth", required: true },
          { letter: "R", description: "R-plane (clearance) position", required: true },
          { letter: "F", description: "Drilling feedrate", required: true },
        ],
        notes: ["G98 retracts to initial Z; G99 retracts to R-plane"],
      },
      {
        name: "Counter-Boring / Spot Drilling with Dwell",
        gCode: "G82",
        description: "Drilling with programmable dwell at hole bottom",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Hole bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "P", description: "Dwell time in milliseconds (P500 = 0.5s)", required: false, defaultValue: 0 },
          { letter: "F", description: "Drilling feedrate", required: true },
        ],
        notes: ["P value in milliseconds — Mitsubishi uses ms not seconds"],
      },
      {
        name: "High-Speed Peck Drilling (Chip Break)",
        gCode: "G73",
        description: "Chip-breaking peck drilling — small fixed retract, does NOT return to R-plane",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Hole bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "Q", description: "Peck increment depth (positive)", required: true },
          { letter: "F", description: "Drilling feedrate", required: true },
        ],
        notes: [
          "Retract is machine-parameter-defined (typically 1mm) — much faster than G83",
          "Best for holes up to 5xD in steel; use G83 for gummy materials or deeper holes",
        ],
      },
      {
        name: "Deep Hole Peck Drilling",
        gCode: "G83",
        description: "Full-retract peck drilling — returns to R-plane each peck for chip evacuation",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Hole bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "Q", description: "Peck increment depth (positive)", required: true },
          { letter: "F", description: "Drilling feedrate", required: true },
        ],
        notes: ["Preferred for stainless, titanium, and holes deeper than 5xD"],
      },
      {
        name: "Left-Hand Tapping",
        gCode: "G74",
        description: "Left-hand tapping — CCW entry, CW retract; rigid mode via ,R1 suffix",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Tap bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Pitch (mm/rev) for rigid; pitch x RPM for floating", required: true },
          { letter: ",R", description: "Rigid flag: ,R1=rigid tapping, ,R0=floating", required: false, defaultValue: 1 },
        ],
        notes: ["Rigid tapping (,R1) locks spindle encoder to Z-axis servo for precision depth control"],
      },
      {
        name: "Right-Hand Tapping / Rigid Tapping",
        gCode: "G84",
        description: "Right-hand tapping — CW entry, CCW retract; rigid mode via ,R1 suffix",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Tap bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: false, defaultValue: 0 },
          { letter: "F", description: "Pitch (mm/rev) for rigid; pitch x RPM for floating", required: true },
          { letter: ",R", description: "Rigid flag: ,R1=rigid tapping, ,R0=floating", required: false, defaultValue: 1 },
        ],
        notes: [
          "Mitsubishi-specific: ,R1 appended to G84 block (e.g. G84 Z-20. R5. F1.5,R1)",
          "Also handles chip-breaking tapping when Q peck increment is specified",
        ],
      },
      {
        name: "Fine Boring",
        gCode: "G76",
        description: "Fine boring with spindle orient (M19) and shift retract — scratch-free bore wall",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Bore bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "P", description: "Dwell at bottom in ms (required even if 0)", required: true, defaultValue: 0 },
          { letter: "Q", description: "Shift amount (use I/J for specific orientation angle)", required: true },
          { letter: "F", description: "Boring feedrate", required: true },
        ],
        notes: [
          "Spindle orients via M19 before retract; Q shift moves tool clear of bore wall",
          "Use I/J vectors instead of Q for angled shift direction control",
        ],
      },
      {
        name: "Reaming",
        gCode: "G85",
        description: "Reaming cycle — feed in, feed out at same feedrate (no dwell)",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Ream bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "F", description: "Reaming feedrate (applies to both entry and retract)", required: true },
        ],
        notes: ["Retract at same feedrate as entry — use G89 for dwell variant"],
      },
      {
        name: "Boring / Reaming with Dwell",
        gCode: "G89",
        description: "Boring or reaming with dwell at bottom — feed retract",
        parameters: [
          { letter: "X", description: "Hole X position", required: true },
          { letter: "Y", description: "Hole Y position", required: true },
          { letter: "Z", description: "Bottom depth", required: true },
          { letter: "R", description: "R-plane position", required: true },
          { letter: "P", description: "Dwell at bottom in milliseconds", required: true },
          { letter: "F", description: "Feed rate", required: true },
        ],
        notes: ["Used when feed retract is required and dwell at bottom is needed"],
      },
      {
        name: "Canned Cycle Cancel",
        gCode: "G80",
        description: "Cancel all active canned cycles — mandatory before changing motion planes",
        parameters: [],
        notes: [
          "Always cancel before G17/G18/G19 plane changes",
          "Z axis output variable resets internally after G80 block",
        ],
      },
    ],
    mCodeMappings: [
      { mCode: 0,  description: "Program stop — spindle/coolant remain active; requires operator cycle start to resume", category: "special" as const },
      { mCode: 1,  description: "Optional stop — halts only when optional stop switch is ON at panel", category: "special" as const },
      { mCode: 2,  description: "Program end — rewinds to start, resets modal codes", category: "special" as const },
      { mCode: 3,  description: "Spindle CW (clockwise)", category: "spindle" as const },
      { mCode: 4,  description: "Spindle CCW (counter-clockwise)", category: "spindle" as const },
      { mCode: 5,  description: "Spindle stop (decelerates to zero)", category: "spindle" as const },
      { mCode: 6,  description: "Tool change — ATC executes; must have M05 and Z retracted first", category: "tool" as const },
      { mCode: 8,  description: "Flood coolant ON", category: "coolant" as const },
      { mCode: 9,  description: "All coolant OFF (flood, mist, through-tool)", category: "coolant" as const },
      { mCode: 10, description: "Part catcher ON — extends catch tray for auto part ejection after cutoff (turning)", category: "special" as const },
      { mCode: 11, description: "Part catcher OFF — retracts catch tray", category: "special" as const },
      { mCode: 19, description: "Spindle orientation — halts spindle at defined angle; required before G76 fine boring retract", category: "spindle" as const },
      { mCode: 29, description: "Rigid tapping pre-command (some M800 machine builder variants; Mitsubishi default uses ,R1 on G84/G74)", category: "spindle" as const, notes: "Verify with machine builder — not universal across all M800 configs" },
      { mCode: 30, description: "Program end and rewind — stops spindle, turns off coolant, rewinds program pointer", category: "special" as const },
      { mCode: 88, description: "Through-tool (high-pressure) coolant ON — machine option required; activates alongside M8 flood", category: "coolant" as const },
      { mCode: 89, description: "Through-tool coolant OFF", category: "coolant" as const },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      // G04 Pxxx — dwell in milliseconds (P500 = 0.5s). Range: P1–P99999999
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      // Standard G54-G59 (6 offsets); extended: G54.1 P1 through G54.1 P300
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
      // Rigid tap: ,R1 appended to G84/G74 block (e.g. "G84 Z-20. R5. F1.5,R1")
      rigidTapCode: "G84,R1",
      // SSS Control II: G05 P10000 = high-speed ON (M800/M80); G05 P0 = OFF all models; M70 uses G05 P1
      smoothingCode: "G05 P10000",
      // High-accuracy mode — lower P value trades processing speed for geometric accuracy
      highAccuracyCode: "G05 P1",
    },
  },

  fagor: {
    family: "fagor",
    name: "Fagor CNC",
    versions: ["CNC 8070", "CNC 8065", "CNC 8060"],
    manufacturer: "Fagor Automation",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 300,
      maxBlockRate: 1500,
      maxAxes: 28,
      supportsNURBS: true,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: true,
      rtcp: true,
      smoothingModes: ["G51"],
      uniqueFeatures: ["ProGTL3 Geometry Editor", "HSSA", "Dynamic Machining Control"],
    },
    resources: [],
    cycleDefinitions: [],
    mCodeMappings: [],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
      smoothingCode: "G51",
    },
  },

  centroid: {
    family: "centroid",
    name: "Centroid",
    versions: ["Acorn", "Allin1DC", "M400"],
    manufacturer: "Centroid",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 100,
      maxBlockRate: 500,
      maxAxes: 6,
      supportsNURBS: false,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: false,
      rtcp: false,
      smoothingModes: [],
      uniqueFeatures: ["Intercon Conversational", "CNC12 Software", "Digital Servo Drives"],
    },
    resources: [],
    cycleDefinitions: [],
    mCodeMappings: [],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G0",
      linearMove: "G1",
      cwArc: "G2",
      ccwArc: "G3",
      dwell: "G4",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M3",
      spindleCCW: "M4",
      spindleStop: "M5",
      coolantOn: "M8",
      coolantOff: "M9",
      toolChange: "M6",
    },
  },

  // ============================================================================
  // Brother CNC-C00 — Speedio High-Speed Drilling & Tapping Center
  // Sources: FUSION BASIC POSTS/brother.cps, brother speedio.cps (Autodesk 2025)
  // Covers: Speedio S, W, R, U, F, H series machines
  // ============================================================================
  brother_c00: {
    family: "brother_c00",
    name: "Brother CNC-C00 (Speedio)",
    versions: [
      "CNC-C00",
      "CNC-C00B",
      "Speedio S series",
      "Speedio W series",
      "Speedio R series",
      "Speedio U series",
      "Speedio F series",
      "Speedio H series",
    ],
    manufacturer: "Brother Industries",
    programmingStyle: "iso",
    features: {
      rigidTapping: true,
      highSpeedMachining: true,
      lookAhead: 200,
      maxBlockRate: 2000,
      maxAxes: 5,
      supportsNURBS: false,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: true,
      supportsSubprograms: true,
      supportsMacros: true,
      supportsParametricProgramming: true,
      tcp5Axis: false,
      rtcp: false,
      smoothingModes: ["High Accuracy Mode A", "High Accuracy Mode B", "M298"],
      uniqueFeatures: [
        "G77/G78 pitch-based tapping cycles (no F feedrate calculation required)",
        "Double tap withdraw speed (L word in G77 — up to 6000 RPM retract)",
        "High Accuracy Mode A/B/M298 with 6 levels: standard, roughing, medium-rough, medium-rough-high, finishing, finishing-high",
        "Machining Load Monitor M341/M342/M343 for automatic tool breakage detection",
        "Through-tool coolant M494/M495 (Speedio spindle-coolant option)",
        "Extended WCS: G54-G59 + G54.1 P1-P300 (300 additional work offsets)",
        "High-speed tool change: 0.9 sec chip-to-chip (Speedio S series)",
        "30+ taps per minute capability on compact table-type drilling centers",
        "Preload next tool during cut (ATC preload — no wait between operations)",
        "Washdown coolant M68/M69 (chip wash option)",
      ],
    },
    resources: [
      {
        type: "cps",
        path: "H:\\prism\\resources\\FUSION BASIC POSTS\\brother.cps",
        description: "Autodesk Fusion Brother post processor — G77/G78 pitch tapping, M298 smoothing",
        version: "44207 2025-12-17",
      },
      {
        type: "cps",
        path: "H:\\prism\\resources\\FUSION BASIC POSTS\\brother speedio.cps",
        description: "Autodesk Fusion Brother Speedio post — S/W/R/U/F/H series, A-axis, trunnion AC, load monitor",
        version: "44207 2025-12-17",
      },
      {
        type: "cps",
        path: "H:\\prism\\resources\\FUSION BASIC POSTS\\brother multi-tasking.cps",
        description: "Autodesk Fusion Brother multi-tasking post processor",
        version: "44207 2025-12-17",
      },
      {
        type: "cps",
        path: "H:\\prism\\resources\\FUSION BASIC POSTS\\brother speedio inspection.cps",
        description: "Autodesk Fusion Brother Speedio probing / inspection post processor",
        version: "44207 2025-12-17",
      },
    ],
    cycleDefinitions: [
      // --- Drilling cycles ---
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate (mm/min)", required: true },
        ],
        notes: ["Fanuc-compatible", "Use G98 to retract to initial level, G99 to R-plane"],
      },
      {
        name: "Spot Drilling / Counterbore with Dwell",
        gCode: "G82",
        description: "Spot drill or counterbore with optional dwell at depth",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "P", description: "Dwell time (milliseconds)", required: false },
          { letter: "F", description: "Feedrate (mm/min)", required: true },
        ],
        notes: ["P in milliseconds at hole bottom", "Omit P for no dwell"],
      },
      {
        name: "Deep Hole Peck Drilling",
        gCode: "G83",
        description: "Full-retract peck drilling for deep holes",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment (mm)", required: true },
          { letter: "F", description: "Feedrate (mm/min)", required: true },
        ],
        notes: ["Full retract between pecks for chip clearing", "Use for L/D > 4 or gummy materials"],
      },
      {
        name: "High-Speed Peck (Chip Break)",
        gCode: "G73",
        description: "High-speed peck drilling with chip break — partial retract only",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment (mm)", required: true },
          { letter: "F", description: "Feedrate (mm/min)", required: true },
        ],
        notes: ["Partial retract — faster than G83", "Suitable for cast iron, aluminum to L/D 4", "Preferred on Brother for shallow-moderate depth holes"],
      },
      // --- Tapping cycles — Brother-preferred G77/G78 pitch-based ---
      {
        name: "Rigid Tapping RH — Pitch (Brother preferred)",
        gCode: "G77",
        description: "Right-hand rigid tapping using pitch value — Brother CNC-C00 native cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Thread pitch (mm/rev) or TPI", required: true },
          { letter: "L", description: "Withdraw spindle speed override (RPM, max 6000)", required: false },
        ],
        notes: [
          "PREFERRED tapping cycle on all Brother CNC-C00 machines",
          "F = pitch (e.g., F1.25 for M8x1.25) — no feedrate math required",
          "L word = withdraw RPM (set L to 2x spindle speed for faster retract, cap at 6000)",
          "Enables 30+ taps/minute on Speedio compact drilling centers",
          "Post property doubleTapWithdrawSpeed outputs L = min(S*2, 6000) automatically",
        ],
      },
      {
        name: "Rigid Tapping LH — Pitch (Brother preferred)",
        gCode: "G78",
        description: "Left-hand rigid tapping using pitch value — Brother CNC-C00 native cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Thread pitch (mm/rev) or TPI", required: true },
          { letter: "L", description: "Withdraw spindle speed override (RPM, max 6000)", required: false },
        ],
        notes: ["Left-hand thread variant of G77", "Same pitch-based F and double-withdraw-speed L capability"],
      },
      {
        name: "Floating Tapping RH — Feedrate (Fanuc-compatible fallback)",
        gCode: "G84",
        description: "Right-hand tapping using feedrate (F = pitch × RPM)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate = pitch × spindle speed", required: true },
        ],
        notes: ["Fanuc-compatible fallback", "F must equal pitch × RPM", "Use G77 (pitch) instead when possible on Brother"],
      },
      {
        name: "Floating Tapping LH — Feedrate (Fanuc-compatible fallback)",
        gCode: "G74",
        description: "Left-hand tapping using feedrate (F = pitch × RPM)",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate = pitch × spindle speed", required: true },
        ],
        notes: ["Left-hand feedrate-based tapping fallback", "Use G78 (pitch) on Brother whenever possible"],
      },
      // --- Boring cycles ---
      {
        name: "Boring — Feed Retract",
        gCode: "G85",
        description: "Boring cycle with feed retract for best surface finish",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate (mm/min)", required: true },
        ],
        notes: ["Feeds in and feeds out — best bore finish", "Use for precision bores and reaming"],
      },
      // --- Probing ---
      {
        name: "Skip Function / Probing",
        gCode: "G31",
        description: "Skip function for on-machine probing cycles",
        parameters: [
          { letter: "X", description: "X target", required: false },
          { letter: "Y", description: "Y target", required: false },
          { letter: "Z", description: "Z target", required: false },
          { letter: "F", description: "Probe approach feedrate", required: true },
        ],
        notes: [
          "Motion stops when probe signal trips",
          "Compatible with Renishaw and Blum probing systems",
          "Use with G65 macro calls for Renishaw macro-based cycles",
        ],
      },
    ],
    mCodeMappings: [
      // Spindle
      { mCode: 3, description: "Spindle CW (forward)", category: "spindle" },
      { mCode: 4, description: "Spindle CCW (reverse)", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      // Tool change
      { mCode: 6, description: "Automatic Tool Change", category: "tool", notes: "0.9 sec chip-to-chip on Speedio S series" },
      // Coolant
      { mCode: 8, description: "Flood Coolant On", category: "coolant" },
      { mCode: 9, description: "All Coolant Off", category: "coolant" },
      { mCode: 68, description: "Washdown Coolant On", category: "coolant", notes: "Chip washdown — Speedio option" },
      { mCode: 69, description: "Washdown Coolant Off", category: "coolant" },
      { mCode: 88, description: "Through-Tool Coolant On (basic models)", category: "coolant", notes: "Standard Brother through-spindle coolant" },
      { mCode: 89, description: "Through-Tool Coolant Off (basic models)", category: "coolant" },
      { mCode: 494, description: "Through-Tool Coolant On — Speedio high-pressure", category: "coolant", notes: "Speedio spindle-coolant option (higher pressure than M88)" },
      { mCode: 495, description: "Through-Tool Coolant Off — Speedio high-pressure", category: "coolant" },
      // Program control
      { mCode: 0, description: "Program Stop (mandatory)", category: "special" },
      { mCode: 1, description: "Optional Stop", category: "special" },
      { mCode: 2, description: "Program End", category: "special" },
      { mCode: 30, description: "Program End + Rewind", category: "special" },
      // Subprograms
      { mCode: 98, description: "Subprogram Call", category: "special" },
      { mCode: 99, description: "Return from Subprogram", category: "special" },
      // Rotary / 4th & 5th axis clamps
      { mCode: 10, description: "Clamp A Axis (4th axis)", category: "special", notes: "Clamp before 3+2 positioning" },
      { mCode: 11, description: "Unclamp A Axis (4th axis)", category: "special" },
      { mCode: 12, description: "Clamp C Axis (trunnion 5th)", category: "special", notes: "AC-trunnion configuration" },
      { mCode: 13, description: "Unclamp C Axis (trunnion 5th)", category: "special" },
      // Machining Load Monitor — Speedio
      { mCode: 340, description: "Machining Load Monitor OFF", category: "special" },
      { mCode: 341, description: "Machining Load Monitor ON — all axes", category: "special", notes: "Detects overload AND underload (tool breakage)" },
      { mCode: 342, description: "Machining Load Monitor ON — max overload only", category: "special", notes: "Triggers when spindle/axis load exceeds maximum threshold" },
      { mCode: 343, description: "Machining Load Monitor ON — min underload only", category: "special", notes: "Triggers on tool breakage (load drops below minimum threshold)" },
      // High accuracy mode
      { mCode: 298, description: "High Accuracy Mode M298 variant", category: "special", notes: "Alternative smoothing mode — verify availability on specific machine model" },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
      rigidTapCode: "G77",
      smoothingCode: "High Accuracy Mode A/B",
      highAccuracyCode: "M298",
    },
  },

  generic_iso: {
    family: "generic_iso",
    name: "Generic ISO/EIA",
    versions: ["RS-274D", "ISO 6983"],
    manufacturer: "Various",
    programmingStyle: "iso",
    features: {
      rigidTapping: false,
      highSpeedMachining: false,
      lookAhead: 0,
      maxBlockRate: 100,
      maxAxes: 3,
      supportsNURBS: false,
      supportsHelical: true,
      supportsCutterComp: true,
      supportsToolLength: true,
      supportsWorkOffset: true,
      supportsProbing: false,
      supportsSubprograms: true,
      supportsMacros: false,
      supportsParametricProgramming: false,
      tcp5Axis: false,
      rtcp: false,
      smoothingModes: [],
      uniqueFeatures: [],
    },
    resources: [],
    cycleDefinitions: [
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: [],
      },
    ],
    mCodeMappings: [
      { mCode: 3, description: "Spindle CW", category: "spindle" },
      { mCode: 4, description: "Spindle CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      { mCode: 6, description: "Tool Change", category: "tool" },
      { mCode: 8, description: "Coolant On", category: "coolant" },
      { mCode: 9, description: "Coolant Off", category: "coolant" },
    ],
    gCodeDialect: {
      absoluteMode: "G90",
      incrementalMode: "G91",
      rapidMove: "G00",
      linearMove: "G01",
      cwArc: "G02",
      ccwArc: "G03",
      dwell: "G04",
      toolLengthComp: "G43",
      toolLengthCancel: "G49",
      cutterCompLeft: "G41",
      cutterCompRight: "G42",
      cutterCompCancel: "G40",
      workOffsetBase: "G54",
      programEnd: "M30",
      spindleCW: "M03",
      spindleCCW: "M04",
      spindleStop: "M05",
      coolantOn: "M08",
      coolantOff: "M09",
      toolChange: "M06",
    },
  },
};

/**
 * Get controller profile by family
 */
export function getControllerProfile(family: ControllerFamily): ControllerProfile {
  return CONTROLLER_PROFILES[family];
}

/**
 * Get all available controller families
 */
export function getAvailableControllers(): ControllerFamily[] {
  return Object.keys(CONTROLLER_PROFILES) as ControllerFamily[];
}

/**
 * Compare two controllers and identify differences
 */
export function compareControllers(
  source: ControllerFamily,
  target: ControllerFamily
): ControllerComparison {
  const sourceProfile = CONTROLLER_PROFILES[source];
  const targetProfile = CONTROLLER_PROFILES[target];

  const comparison: ControllerComparison = {
    source,
    target,
    gCodeDifferences: [],
    mCodeDifferences: [],
    cycleDifferences: [],
    featureDifferences: [],
    conversionNotes: [],
  };

  // Compare G-code dialects
  const sourceDialect = sourceProfile.gCodeDialect;
  const targetDialect = targetProfile.gCodeDialect;

  for (const [key, sourceValue] of Object.entries(sourceDialect)) {
    const targetValue = targetDialect[key as keyof GCodeDialect];
    if (sourceValue !== targetValue) {
      comparison.gCodeDifferences.push({
        function: key,
        sourceCode: sourceValue || "N/A",
        targetCode: targetValue || "N/A",
        note: `${key}: ${sourceValue} -> ${targetValue}`,
      });
    }
  }

  // Compare features
  const sourceFeatures = sourceProfile.features;
  const targetFeatures = targetProfile.features;

  for (const [key, sourceValue] of Object.entries(sourceFeatures)) {
    const targetValue = targetFeatures[key as keyof ControllerFeatures];
    if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
      comparison.featureDifferences.push({
        feature: key,
        sourceSupport: String(sourceValue),
        targetSupport: String(targetValue),
        impact: determineFeatureImpact(key, sourceValue, targetValue),
      });
    }
  }

  // Generate conversion notes
  comparison.conversionNotes = generateConversionNotes(sourceProfile, targetProfile);

  return comparison;
}

export interface ControllerComparison {
  source: ControllerFamily;
  target: ControllerFamily;
  gCodeDifferences: GCodeDifference[];
  mCodeDifferences: MCodeDifference[];
  cycleDifferences: CycleDifference[];
  featureDifferences: FeatureDifference[];
  conversionNotes: string[];
}

interface GCodeDifference {
  function: string;
  sourceCode: string;
  targetCode: string;
  note: string;
}

interface MCodeDifference {
  function: string;
  sourceCode: number;
  targetCode: number;
  note: string;
}

interface CycleDifference {
  cycleName: string;
  sourceFormat: string;
  targetFormat: string;
  note: string;
}

interface FeatureDifference {
  feature: string;
  sourceSupport: string;
  targetSupport: string;
  impact: "critical" | "high" | "medium" | "low";
}

function determineFeatureImpact(
  _feature: string,
  _sourceValue: unknown,
  _targetValue: unknown
): "critical" | "high" | "medium" | "low" {
  // Simplified impact assessment
  return "medium";
}

function generateConversionNotes(
  source: ControllerProfile,
  target: ControllerProfile
): string[] {
  const notes: string[] = [];

  // Programming style differences
  if (source.programmingStyle !== target.programmingStyle) {
    notes.push(
      `Programming style: ${source.programmingStyle} -> ${target.programmingStyle}. May require significant syntax changes.`
    );
  }

  // 5-axis differences
  if (source.features.tcp5Axis && !target.features.tcp5Axis) {
    notes.push(
      "WARNING: Source supports TCP 5-axis but target does not. 5-axis operations will need manual review."
    );
  }

  // Rigid tapping
  if (source.features.rigidTapping && !target.features.rigidTapping) {
    notes.push(
      "WARNING: Source supports rigid tapping but target does not. Tapping cycles may need float tap holders."
    );
  }

  // Smoothing mode differences
  if (source.gCodeDialect.smoothingCode !== target.gCodeDialect.smoothingCode) {
    const sourceSmooth = source.gCodeDialect.smoothingCode || "None";
    const targetSmooth = target.gCodeDialect.smoothingCode || "None";
    notes.push(`Smoothing code: ${sourceSmooth} -> ${targetSmooth}`);
  }

  return notes;
}

// Singleton export
export const controllerKnowledgeEngine = {
  getProfile: getControllerProfile,
  getAvailableControllers,
  compare: compareControllers,
  profiles: CONTROLLER_PROFILES,
};
