/**
 * okuma-macro-patterns.ts — Okuma OSP Macro Programming Patterns
 * ===============================================================
 *
 * Advanced macro programming patterns extracted from JM Die programs.
 * Covers: angle calculations, tool offset automation, bar feeders, counters.
 *
 * @module data/okuma-macro-patterns
 */

import type { TribalTip } from "./tribal-knowledge-types.js";

/**
 * Trigonometric calculation patterns
 */
export const TRIG_MACRO_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-trig-001",
    title: "Angle Adjustment Macro",
    description:
      "Calculate actual tool angle using indicator measurement. Pattern: V2=[TAN[ANGL]*DIST], V3=[[V2+V1]/DIST], V4=ATAN[V3]. Uses block delete to stop machine for manual indicator reading.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die ANGLE-ADJUST.MIN macro",
    code_pattern: `
ANGL=5(ANGLE OF TOOL HOLDER)
DIST=.75(X SHIFT DISTANCE IN RADIUS)
/G1 X=-[DIST] Z=-[TAN[ANGL]*DIST] F5.
M00 (ENTER DIFFERENCE ON COMMON VARIABLE V1)
V2=[TAN[ANGL]*DIST]
V3=[[V2+V1]/DIST]
V4=ATAN[V3](CALCULATE ANGLE)`,
    tags: ["macro", "angle", "trigonometry", "indicator"],
  },
  {
    tip_id: "macro-trig-002",
    title: "Tool Offset Calculator Macro",
    description:
      "Automatically calculate X and Z tool offsets from tool length and angle. Uses SIN/COS with pivot point geometry. Pattern: V11=[[HYP*COS[ANGL]]*2]+V2, V12=V3+[HYP*SIN[ANGL]]. VTOFX/VTOFZ write directly to tool offset registers.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die ANGLE-TOOL-CALC.MIN macro",
    code_pattern: `
TOOL=7   (WHERE TO LOAD TOOL OFFSET)
V1=1.098 (TOOL LENGTH FROM TIP TO COLLET)
ANGL=20  (TOOL ANGLE POSITION)
V2=-2.94 (PIVOT POINT X IN DIAMETER)
V3=-1.97 (CENTER OF TOOL HOLDER IN Z)
V4=2.30  (DIST FROM PIVOT TO COLLET)
V5=V4+V1 (HYP)
V6=SIN[ANGL](Z AXIS)
V7=COS[ANGL](X AXIS)
V8=[[V5*V7]*2]
V11=V8+V2(X OFFSET)
V12=V3+[V5*V6](Z OFFSET)
/VTOFX[TOOL]=V11
/VTOFZ[TOOL]=V12`,
    tags: ["macro", "tool_offset", "sin", "cos", "automation"],
  },
];

/**
 * Bar feeder automation patterns
 */
export const BAR_FEEDER_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-bar-001",
    title: "Bar Feeder Subroutine",
    description:
      "Complete bar feeder automation subroutine with new bar detection. VDIN[24]=1 detects new bar. VDOUT[992]=1 activates bar link. M436 triggers bar feed. VWKCC[1] increments work counter for production tracking.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die MACRO.SSB subroutine",
    code_pattern: `
OBAR
IF [VORD[143] EQ 1] NSKP1
VUACM[1]='TURN BAR LINK ON'
VDOUT[992]=1
NSKP1
IF [VDIN[24] EQ 1] NEND (NEW BAR ?)
T121212
X0Z.03
M84
G4 F1.5
M83
RTS`,
    tags: ["macro", "bar_feeder", "automation", "subroutine"],
  },
  {
    tip_id: "macro-bar-002",
    title: "Work Counter Increment Subroutine",
    description:
      "Production counter subroutine using VWKCC system variable. Pattern: VWKCC[1]=VWKCC[1]+1 increments counter after each part. Used for production tracking and batch monitoring.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die MACRO.SSB OCONT subroutine",
    code_pattern: `
OCONT
VWKCC[1]=VWKCC[1]+1
RTS`,
    tags: ["macro", "counter", "production", "tracking"],
  },
];

/**
 * Conditional logic patterns
 */
export const CONDITIONAL_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-cond-001",
    title: "Digital Input Conditional Jump",
    description:
      "Use VDIN[n] to check digital inputs and branch program flow. Pattern: IF [VDIN[24] EQ 1] NLABEL. Common uses: bar present detection, door closed check, fixture sensing.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die MACRO.SSB analysis",
    code_pattern: `IF [VDIN[24] EQ 1] NEND (NEW BAR ?)`,
    tags: ["macro", "conditional", "digital_input", "vdin"],
  },
  {
    tip_id: "macro-cond-002",
    title: "VORD User Option Check",
    description:
      "Check user-defined options with VORD[n]. Pattern: IF [VORD[143] EQ 1] NSKP1. VORD variables are set via OSP option panel and persist across power cycles.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "JM Die MACRO.SSB analysis",
    code_pattern: `IF [VORD[143] EQ 1] NSKP1`,
    tags: ["macro", "vord", "option", "user_variable"],
  },
  {
    tip_id: "macro-cond-003",
    title: "Block Delete for Manual Operations",
    description:
      "Use /G1 (block delete) to optionally skip moves when block delete switch is ON. Allows operators to skip calibration or measurement sequences during production runs.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die ANGLE-ADJUST.MIN",
    code_pattern: `/G1 X=-[DIST] Z=-[TAN[ANGL]*DIST] F5.`,
    tags: ["macro", "block_delete", "optional", "operator"],
  },
];

/**
 * Alarm and messaging patterns
 */
export const ALARM_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-alarm-001",
    title: "User Alarm Message Display",
    description:
      "Display custom messages to operator with VUACM[n]. Pattern: VUACM[1]='MESSAGE TEXT'. Up to 4 simultaneous messages (VUACM[1-4]). Message persists until cleared by program.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die MACRO.SSB",
    code_pattern: `VUACM[1]='TURN BAR LINK ON'`,
    tags: ["macro", "alarm", "message", "operator_interface"],
  },
  {
    tip_id: "macro-alarm-002",
    title: "M00 Program Stop with Comment",
    description:
      "Use M00 with comment for operator instructions during program stop. Pattern: M00 (INSTRUCTION TEXT). Common uses: measurement input, tool change confirmation, setup verification.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die ANGLE-ADJUST.MIN",
    code_pattern: `M00 (ENTER DIFFERENCE ON COMMON VARIABLE V1)`,
    tags: ["macro", "m00", "stop", "operator_instruction"],
  },
];

/**
 * Mode control patterns
 */
export const MODE_CONTROL_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-mode-001",
    title: "Macro Mode Initialization",
    description:
      "G140 enables macro programming mode on Okuma OSP. Required at start of any program using variables or calculations. G141 returns to normal mode.",
    category: "macro",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.95,
    source: "JM Die macro programs",
    code_pattern: `G140`,
    tags: ["macro", "g140", "mode", "initialization"],
  },
  {
    tip_id: "macro-mode-002",
    title: "Single Tool Direction Mode",
    description:
      "G138 enables single tool direction (lathe turret single index). G139 returns to bi-directional. Use G138 when programming assumes specific turret rotation.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "JM Die ANGLE-ADJUST.MIN",
    code_pattern: `G138`,
    tags: ["macro", "g138", "turret", "direction"],
  },
  {
    tip_id: "macro-mode-003",
    title: "Absolute/Incremental with Feed Mode",
    description:
      "G91 (incremental) + G94 (feed per minute) combo for measurement macros. Allows precise relative positioning at constant feedrate regardless of spindle speed.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "JM Die ANGLE-ADJUST.MIN",
    code_pattern: `G91 G94`,
    tags: ["macro", "g91", "g94", "incremental", "feed_mode"],
  },
  {
    tip_id: "macro-mode-004",
    title: "M807/M808 Modal Code Save/Restore",
    description:
      "M808 saves current modal states (G/M codes). M807 restores them. Use at start/end of macros to preserve calling program's context. Critical for reusable subroutines.",
    category: "macro",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "JM Die ANGLE-ADJUST.MIN",
    code_pattern: `
M808 (SAVE MODAL STATES)
... macro code ...
M807 (RESTORE MODAL STATES)`,
    tags: ["macro", "m807", "m808", "modal", "save_restore"],
  },
];

/**
 * Tool offset register access patterns
 */
export const TOOL_OFFSET_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-offset-001",
    title: "Write Tool X Offset",
    description:
      "VTOFX[n]=value writes to tool n X offset register. Use block delete prefix /VTOFX to make optional. Offset is in diameter mode on Okuma lathes.",
    category: "macro",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "JM Die ANGLE-TOOL-CALC.MIN",
    code_pattern: `/VTOFX[TOOL]=V11`,
    tags: ["macro", "vtofx", "tool_offset", "x_axis"],
  },
  {
    tip_id: "macro-offset-002",
    title: "Write Tool Z Offset",
    description:
      "VTOFZ[n]=value writes to tool n Z offset register. Combined with VTOFX for complete tool setup automation. Use carefully - incorrect offsets cause crashes.",
    category: "macro",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "JM Die ANGLE-TOOL-CALC.MIN",
    code_pattern: `/VTOFZ[TOOL]=V12`,
    tags: ["macro", "vtofz", "tool_offset", "z_axis"],
  },
];

/**
 * Subroutine patterns
 */
export const SUBROUTINE_PATTERNS: TribalTip[] = [
  {
    tip_id: "macro-sub-001",
    title: "RTS Return from Subroutine",
    description:
      "RTS returns control to calling program. Always end subroutines with RTS, not M30. M30 ends entire program including main program that called subroutine.",
    category: "macro",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.98,
    source: "JM Die MACRO.SSB",
    code_pattern: `
OBAR
... subroutine code ...
RTS`,
    tags: ["macro", "rts", "subroutine", "return"],
  },
  {
    tip_id: "macro-sub-002",
    title: "GOTO for Subroutine Flow Control",
    description:
      "Use GOTO NLABEL for unconditional jumps within macros. Combine with IF conditionals for complex branching. Always ensure all paths reach RTS or M30.",
    category: "macro",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "JM Die MACRO.SSB",
    code_pattern: `
M1
GOTO NDONE
NEND (FACE NEW BAR)
... code ...
NDONE
RTS`,
    tags: ["macro", "goto", "branch", "flow_control"],
  },
];

/**
 * Get all macro patterns
 */
export function getAllMacroPatterns(): TribalTip[] {
  return [
    ...TRIG_MACRO_PATTERNS,
    ...BAR_FEEDER_PATTERNS,
    ...CONDITIONAL_PATTERNS,
    ...ALARM_PATTERNS,
    ...MODE_CONTROL_PATTERNS,
    ...TOOL_OFFSET_PATTERNS,
    ...SUBROUTINE_PATTERNS,
  ];
}

/**
 * Search macro patterns by keyword
 */
export function searchMacroPatterns(query: string): TribalTip[] {
  const q = query.toLowerCase();
  return getAllMacroPatterns().filter(
    (tip) =>
      tip.title.toLowerCase().includes(q) ||
      tip.description.toLowerCase().includes(q) ||
      tip.tags?.some((t) => t.toLowerCase().includes(q)) ||
      tip.code_pattern?.toLowerCase().includes(q)
  );
}

export default {
  TRIG_MACRO_PATTERNS,
  BAR_FEEDER_PATTERNS,
  CONDITIONAL_PATTERNS,
  ALARM_PATTERNS,
  MODE_CONTROL_PATTERNS,
  TOOL_OFFSET_PATTERNS,
  SUBROUTINE_PATTERNS,
  getAllMacroPatterns,
  searchMacroPatterns,
};
