/**
 * okuma-osp-extracted-tips.ts — Okuma OSP Tribal Knowledge from Program Examples
 * ================================================================================
 *
 * Extracted from H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples/
 * Source: Real Okuma OSP production programs
 *
 * @module data/okuma-osp-extracted-tips
 */

import type { TribalTip } from "./tribal-knowledge-types.js";

/**
 * Okuma OSP system variables extracted from production programs
 */
export const OKUMA_SYSTEM_VARIABLES = {
  // Tool Life Management
  VLMON: {
    description: "Tool load monitor settings",
    usage: "VLMON[tool_group] = monitor_bits",
    values: {
      0: "Monitor OFF",
      10: "Monitor Z + S (spindle)",
      11: "Monitor X + Z + S (all axes)",
    },
    example: "VLMON[2]=11 (MONITOR TG=2, X+Z+S)",
  },
  VGRLF: {
    description: "Tool group life status",
    usage: "IF[VGRLF[group] EQ 1] — tool expired",
    example: "IF[VGRLF[CT1] EQ 1]GOTO N999",
  },
  TLID: {
    description: "Tool Life ID command",
    usage: "Execute after tool load monitor setup",
    example: "TLID (TOOL LIFE MANAGMENT)",
  },
  VORD: {
    description: "Override values",
    usage: "VORD[23] = feed override (1 = 100%)",
    example: "IF[VORD[0023] NE 1] GOTO NALM (100% FEED RATE)",
  },

  // Digital I/O
  VDIN: {
    description: "Digital input values",
    usage: "VDIN[channel] = input state (0/1)",
    common: {
      24: "Bar feeder - bar present",
    },
    example: "IF [VDIN[24] EQ 1] NBAR",
  },
  VDOUT: {
    description: "Digital output control",
    usage: "VDOUT[channel] = output state",
    common: {
      34: "Tool offset data read-out cycle",
      35: "Tool breakage detection cycle",
      "990-999": "User alarm triggers",
    },
    example: "VDOUT[35]=1 (TOOL BREAKAGE DETECTION CYCLE ON)",
  },

  // User Alarms
  VUACM: {
    description: "User alarm messages",
    usage: "VUACM[line] = message string",
    lines: {
      1: "First line of message",
      10: "Second line of message",
    },
    example: "VUACM[1]='TOOL LIFE' / VUACM[10]=' NG'",
  },

  // Position Data
  VPWTP: {
    description: "Workpiece transfer position",
    usage: "Set before bar pull",
    example: "VPWTP=494.7795",
  },
  VSIOZ: {
    description: "Current Z position (servo interpolated)",
    usage: "Read current Z for incremental loops",
    example: "IF [VSIOZ GE ZF] NCUT1",
  },
  VSZOX: {
    description: "Workpiece offset X",
    usage: "For coordinate system calculations",
    example: "VSZSX=-VSZOX VSZSY=-VSZOY",
  },
  VSZOY: {
    description: "Workpiece offset Y",
    usage: "For coordinate system calculations",
    example: "G0 X=XP+VSZOX Y0",
  },

  // Tool Data
  VTDIN: {
    description: "Tool diameter identification number",
    usage: "For thread mill diameter calculation",
    example: "V199=[VTDIN*10000]+VTDTN",
  },
  VTDTN: {
    description: "Tool turret number",
    usage: "Combined with VTDIN for unique tool ID",
    example: "V199=[VTDIN*10000]+VTDTN",
  },
  VDNRX: {
    description: "Tool nose radius X direction array",
    usage: "VDNRX[tool_id] = nose radius",
    example: "V198=VDNRX[V199]",
  },
  VDNRZ: {
    description: "Tool nose radius Z direction array",
    usage: "VDNRZ[tool_id] = nose radius",
    example: "V197=VDNRZ[V199]",
  },
} as const;

/**
 * Okuma OSP M-codes extracted from production programs
 */
export const OKUMA_M_CODES = {
  // Chuck/Collet Control
  M76: { description: "Collet close", category: "workholding" },
  M77: { description: "Collet open", category: "workholding" },
  M83: { description: "Chuck close", category: "workholding" },
  M84: { description: "Chuck open", category: "workholding" },

  // C-Axis Synchronization
  M109: { description: "Main C-axis OFF", category: "c_axis" },
  M110: { description: "Main C-axis ON", category: "c_axis" },
  M888: { description: "C-axis sync mode OFF", category: "c_axis" },
  M889: { description: "C-axis sync mode ON (turret control)", category: "c_axis" },
  M891: { description: "Sub C-axis OFF", category: "c_axis" },
  M892: { description: "Sub C-axis ON", category: "c_axis" },

  // Touch-setter/Probing
  M117: { description: "Probe arm advance (left)", category: "probing" },
  M118: { description: "Probe arm retract (left)", category: "probing" },
  M126: { description: "Air-blow OFF", category: "probing" },
  M127: { description: "Air-blow ON", category: "probing" },
  M137: { description: "Probe arm advance (right)", category: "probing" },
  M138: { description: "Probe arm retract (right)", category: "probing" },

  // Y-Axis Control
  M146: { description: "Y-axis disengage", category: "y_axis" },
  M147: { description: "Y-axis engage", category: "y_axis" },

  // Rapid Control
  M215: { description: "Rapid feed ON", category: "feed" },
  M216: { description: "Rapid feed IGNORE", category: "feed" },

  // Synchronization
  M323: { description: "Tool select synchronization", category: "sync" },
  M331: { description: "Wait/synchronization command", category: "sync" },

  // Bar Feeder
  M436: { description: "Bar feed command", category: "bar_feeder" },

  // Coolant Special
  M808: { description: "Through-spindle coolant activation", category: "coolant" },
  M960: { description: "Canned cycle execute", category: "cycles" },
} as const;

/**
 * Okuma OSP G-codes extracted from production programs
 */
export const OKUMA_G_CODES = {
  // Coordinate Systems
  G13: { description: "Workpiece coordinate 1 select", category: "coordinates" },
  G14: { description: "Workpiece coordinate 2 select", category: "coordinates" },
  G136: { description: "Special coordinates OFF", category: "coordinates" },
  G137: { description: "Special coordinates ON (for Y-axis)", category: "coordinates" },
  G138: { description: "Turn special coordinates ON", category: "coordinates" },
  G140: { description: "Machine coordinate mode ON", category: "coordinates" },
  G141: { description: "Machine coordinate mode OFF", category: "coordinates" },

  // Plane Selection
  G17: { description: "XY plane (for milling)", category: "plane" },
  G18: { description: "ZX plane (default lathe)", category: "plane" },
  "G20 HP=4": { description: "4-axis plane selection", category: "plane" },

  // Canned Cycles
  G180: { description: "Cancel canned cycle", category: "cycles" },
  G181: { description: "Standard drilling cycle", category: "cycles" },
  G183: { description: "Peck drilling cycle (D=peck, L=return)", category: "cycles" },

  // Roughing/Finishing
  G81: { description: "Start roughing profile definition", category: "roughing" },
  G80: { description: "End roughing profile definition", category: "roughing" },
  G85: { description: "Roughing cycle call (NR, D, U, W, F)", category: "roughing" },
  G87: { description: "Finishing cycle call", category: "roughing" },
} as const;

/**
 * Extracted tribal tips from Okuma program examples
 */
export const OKUMA_EXTRACTED_TIPS: TribalTip[] = [
  // Tool Life Management
  {
    tip_id: "okuma-tlm-001",
    title: "Tool Life Monitoring Setup",
    description:
      "Use VLMON[tool_group]=11 to monitor X+Z+spindle load for cutting tools. Value 10 monitors Z+S only. Always call TLID after setting monitor.",
    category: "tool_management",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "info",
    confidence: 0.95,
    source: "LIFE-TEST.MIN",
    code_example: `VLMON[2]=11 (MONITOR TG=2, X+Z+S)
TG=2 OG=1
TLID`,
    tags: ["tool_life", "monitoring", "vlmon"],
  },
  {
    tip_id: "okuma-tlm-002",
    title: "Check All Tool Groups Before Machining",
    description:
      "Loop through all 96 tool groups checking VGRLF[n] for expired tools. If any group returns 1, trigger user alarm and stop.",
    category: "tool_management",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "critical",
    confidence: 0.95,
    source: "LIFE-TEST.MIN",
    code_example: `TLN1=96 (TOTAL NUMBER OF GROUPS)
CT1=1
N1 IF[VGRLF[CT1] EQ 1]GOTO N999
IF[CT1 GE TLN1]GOTO N100
CT1=CT1+1
GOTO N1
N999 VUACM[1]='TOOL LIFE'
VUACM[10]=' NG'
VDOUT[992]=1`,
    tags: ["tool_life", "vgrlf", "loop"],
  },

  // C-Axis Synchronization
  {
    tip_id: "okuma-caxis-001",
    title: "C-Axis Sync Sequence for Single Saddle",
    description:
      "Always turn on main C-axis (M110) and sub C-axis (M892) before activating sync mode (M889). Include G4 dwells for synchronization stability.",
    category: "c_axis",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "warning",
    confidence: 0.95,
    source: "C-SYNC-1S.MIN",
    code_example: `M110 (MAIN C-AXIS ON)
M892 (SUB C-AXIS ON)
M889 (C-AXIS SYNC MODE ON)
G0 C90
G4 F2 (DWELL FOR SYNC)
G0 C180
M888 (C-AXIS SYNC MODE OFF)
M891 (SUB C-AXIS OFF)
M109 (MAIN C-AXIS OFF)`,
    tags: ["c_axis", "synchronization", "m889"],
  },

  // Bar Feeder
  {
    tip_id: "okuma-bar-001",
    title: "Bar Feeder Check Sequence",
    description:
      "Check VDIN[24] for bar presence before attempting bar feed. Set VPWTP for workpiece transfer position before calling M436.",
    category: "bar_feeder",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "critical",
    confidence: 0.95,
    source: "bar-chk.min",
    code_example: `IF [VDIN[24] EQ 1] NBAR
M331
M0
GOTO NEND
NBAR M84 (OPEN CHUCK)
VPWTP=494.7795 (TRANSFER POSITION)
M77 (OPEN COLLET)
M436 (BAR FEED)
M83 (CLOSE CHUCK)
M76 (CLOSE COLLET)`,
    tags: ["bar_feeder", "vdin", "vpwtp"],
  },

  // Touch-Setter
  {
    tip_id: "okuma-ts-001",
    title: "Tool Breakage Detection Sequence",
    description:
      "Activate VDOUT[35]=1 for tool breakage detection. Use OTLLS subroutine with proper parameters. Always air-blow (M127) before arm advance.",
    category: "tool_measurement",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "warning",
    confidence: 0.95,
    source: "G13-TOOL-CHK.MIN",
    code_example: `VDOUT[35]=1 (TOOL BREAKAGE DETECTION ON)
M127 (AIR-BLOW ON)
M117 M137 (ARM ADVANCE)
M126 (AIR-BLOW OFF)
CALL OTLLS MSPX=1 MSPZ=0 APP=.2 IMP=.02 DNG=.005 DOK=0 TLN=0808 XP1=8 ZP1=1.75
M127 (AIR-BLOW ON)
M118 M138 (ARM RETRACT)
M126 (AIR-BLOW OFF)
VDOUT[35]=0`,
    tags: ["touch_setter", "tool_breakage", "otlls"],
  },

  // Thread Milling
  {
    tip_id: "okuma-tm-001",
    title: "Thread Mill Macro Parameters",
    description:
      "Thread mill macros use VTDIN/VTDTN for tool ID, VDNRX/VDNRZ for nose radius. Engage Y-axis (M147) before helical, disengage (M146) after.",
    category: "thread_milling",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "info",
    confidence: 0.95,
    source: "THREAD-MILL-ID-OD.MIN",
    code_example: `G138 (SPECIAL COORDS ON)
M808 (TSC ON)
V199=[VTDIN*10000]+VTDTN
V198=VDNRX[V199]
G0 M147 (Y-AXIS ENGAGE)
G3 Z=VSIOZ-[PT/4] Y=YS X=XS+[CD/2] L=LR F=FD
NCUT G2 Z=VSIOZ-[PT/2] L=CD/2
IF [VSIOZ GE ZF] NCUT
G0 M146 (Y-AXIS DISENGAGE)
G136`,
    tags: ["thread_mill", "helical", "y_axis"],
  },

  // Engraving
  {
    tip_id: "okuma-eng-001",
    title: "Engraving Variable Setup",
    description:
      "Engraving macros use VC[10]=scale, VC[11]=depth, VC[12]=Z feed, VC[13]=XY feed. LOCX/LOCY set character center position.",
    category: "engraving",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "info",
    confidence: 0.95,
    source: "Z-CHARACTERS.SSB",
    code_example: `VC[10] = 1.0 (SCALE FACTOR)
VC[11] = .005 (DEPTH OF CUT)
VC[12] = 5.0 (Z FEEDRATE)
VC[13] = 20.0 (XY FEEDRATE)
LOCX=1.0 LOCY=0.5
CALL OLETA (ENGRAVE LETTER A)`,
    tags: ["engraving", "variables", "characters"],
  },

  // Drilling Patterns
  {
    tip_id: "okuma-drill-001",
    title: "Off-Center Bolt Circle Pattern",
    description:
      "Use G137 for coordinate shift, calculate positions with COS/SIN. VSZOX/VSZOY provide workpiece offsets. Use NOEX for non-executing calculations.",
    category: "drilling",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "info",
    confidence: 0.95,
    source: "DRILL.SSB",
    code_example: `G137 (COORD SHIFT ON)
VSZSX=-VSZOX VSZSY=-VSZOY
NOEX BC=BC/2 HC=0 DP=360/DP
NLOOP IF[HC GE 360] NEND
NOEX XP=COS[HC]*BC
NOEX YP=SIN[HC]*BC
G181 X=VSZOX+XP Y=VSZOY+YP Z=ZD F=FD M960
HC=HC+DP
GOTO NLOOP
NEND G136`,
    tags: ["drilling", "bolt_circle", "polar"],
  },

  // User Alarms
  {
    tip_id: "okuma-alarm-001",
    title: "Custom User Alarm Setup",
    description:
      "Set VUACM[1] and VUACM[10] for two-line alarm message. Trigger with VDOUT[990-999]. Use for tool life, feed override, and process errors.",
    category: "alarms",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "info",
    confidence: 0.95,
    source: "LIFE-TEST.MIN",
    code_example: `VUACM[1]='FEED RATE'
VUACM[10]=' <100%'
VDOUT[990]=1 (TRIGGER ALARM)`,
    tags: ["user_alarm", "vuacm", "vdout"],
  },

  // Feed Override Check
  {
    tip_id: "okuma-feed-001",
    title: "Feed Override 100% Check",
    description:
      "Check VORD[23] equals 1 before critical operations. If override is reduced, trigger alarm. Use M216 to ignore rapid override during setup.",
    category: "safety",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "critical",
    confidence: 0.95,
    source: "LIFE-TEST.MIN",
    code_example: `IF[VORD[0023] NE 1] GOTO NALM
NSTT M216 (RAPID FEED IGNORE)
( ... critical machining ... )
M215 (RAPID FEED ON)
( ... continue ... )
NALM VUACM[1]='FEED RATE'
VUACM[10]=' <100%'
VDOUT[990]=1`,
    tags: ["feed_override", "safety", "vord"],
  },

  // Wait/Sync
  {
    tip_id: "okuma-sync-001",
    title: "M331 Synchronization Command",
    description:
      "Use M331 between variable calculations and motion commands to ensure proper timing. Critical for reading system variables before use.",
    category: "synchronization",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "warning",
    confidence: 0.90,
    source: "Multiple programs",
    code_example: `V199=[VTDIN*10000]+VTDTN
M331 (WAIT)
V198=VDNRX[V199]
V197=VDNRZ[V199]
M331 (WAIT)
IF[V198 GE V197] NV198`,
    tags: ["m331", "sync", "timing"],
  },

  // Coordinate Systems
  {
    tip_id: "okuma-coord-001",
    title: "G13/G14 Workpiece Coordinate Selection",
    description:
      "G13 selects workpiece coordinate 1 (main spindle), G14 selects coordinate 2 (sub spindle). Use G140/G141 for machine coordinates.",
    category: "coordinates",
    machine_type: "lathe",
    controller: "okuma_osp",
    severity: "info",
    confidence: 0.95,
    source: "bar-chk.min",
    code_example: `G13 (WORKPIECE COORD 1)
G140 (MACHINE COORDS ON)
( ... program main spindle ... )
G14 (WORKPIECE COORD 2)
G141 (MACHINE COORDS OFF)
( ... program sub spindle ... )`,
    tags: ["g13", "g14", "workpiece_offset"],
  },
];

/**
 * Get all Okuma OSP extracted tips
 */
export function getOkumaExtractedTips(): TribalTip[] {
  return OKUMA_EXTRACTED_TIPS;
}

/**
 * Search tips by tag
 */
export function searchTipsByTag(tag: string): TribalTip[] {
  return OKUMA_EXTRACTED_TIPS.filter((tip) =>
    tip.tags?.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Get tips by category
 */
export function getTipsByCategory(category: string): TribalTip[] {
  return OKUMA_EXTRACTED_TIPS.filter(
    (tip) => tip.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get critical tips only
 */
export function getCriticalTips(): TribalTip[] {
  return OKUMA_EXTRACTED_TIPS.filter((tip) => tip.severity === "critical");
}

export default {
  OKUMA_SYSTEM_VARIABLES,
  OKUMA_M_CODES,
  OKUMA_G_CODES,
  OKUMA_EXTRACTED_TIPS,
  getOkumaExtractedTips,
  searchTipsByTag,
  getTipsByCategory,
  getCriticalTips,
};
