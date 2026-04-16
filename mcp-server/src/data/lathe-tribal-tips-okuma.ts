/**
 * Lathe Tribal Tips — Okuma OSP Specific Knowledge
 * =================================================
 *
 * Expert tips extracted from Okuma program examples and AOT documentation.
 * These tips encode real-world production knowledge.
 *
 * @module data/lathe-tribal-tips-okuma
 */

import type { TribalTip } from "./tribal-knowledge-tips.js";

/**
 * Okuma OSP-specific tribal tips
 */
export const OKUMA_LATHE_TRIBAL_TIPS: TribalTip[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // TOOL LIFE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_tool_life_001",
    category: "tool_life",
    controller: "Okuma OSP",
    title: "Always check tool groups before machining",
    tip: "Use VGRLF[group] to check tool life status before each operation. Value of 1 indicates group is expired. Loop through all groups (typically 96) at program start.",
    severity: "critical",
    confidence: 0.95,
    source: "Okuma Program Examples - LIFE-TEST.MIN",
  },
  {
    id: "okuma_tool_life_002",
    category: "tool_life",
    controller: "Okuma OSP",
    title: "Set tool monitoring with VLMON",
    tip: "Configure tool life monitoring per group: VLMON[group]=10 for Z+S, VLMON[group]=11 for X+Z+S. Always turn off with VLMON[group]=0 when switching groups.",
    severity: "high",
    confidence: 0.92,
    source: "Okuma Program Examples - LIFE-TEST.MIN",
  },
  {
    id: "okuma_tool_life_003",
    category: "tool_life",
    controller: "Okuma OSP",
    title: "Use TLID for tool life data update",
    tip: "Call TLID (Tool Life ID) command to update tool life counters. Place after each cutting operation for accurate tracking.",
    severity: "medium",
    confidence: 0.88,
    source: "Okuma Program Examples - LIFE-TEST.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BAR FEEDER INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_bar_feeder_001",
    category: "automation",
    controller: "Okuma OSP",
    title: "Check VDIN[24] for bar presence",
    tip: "Before feeding, check VDIN[24] for bar availability. Value of 1 = bar present. Generate alarm or stop if no bar available.",
    severity: "critical",
    confidence: 0.95,
    source: "Okuma Program Examples - bar-chk.min",
  },
  {
    id: "okuma_bar_feeder_002",
    category: "automation",
    controller: "Okuma OSP",
    title: "Set bar position with VPWTP",
    tip: "Use VPWTP=value to set precise bar feed position. Calculate based on part length + cutoff width + remnant allowance.",
    severity: "high",
    confidence: 0.90,
    source: "Okuma Program Examples - bar-chk.min",
  },
  {
    id: "okuma_bar_feeder_003",
    category: "automation",
    controller: "Okuma OSP",
    title: "Sequence chuck/collet operations correctly",
    tip: "For part transfer: M84 (main chuck open), M77 (sub collet open), M436 (bar feed), M83 (main close), M76 (sub close). Order matters!",
    severity: "critical",
    confidence: 0.93,
    source: "Okuma Program Examples - bar-chk.min",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // C-AXIS SYNCHRONIZATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_caxis_001",
    category: "multi_axis",
    controller: "Okuma OSP",
    title: "Enable both C-axes before sync",
    tip: "For C-axis synchronization: M110 (main C ON), M892 (sub C ON), THEN M889 (sync ON). Reverse order to disable: M888, M891, M109.",
    severity: "critical",
    confidence: 0.95,
    source: "Okuma Program Examples - C-SYNC-1S.MIN",
  },
  {
    id: "okuma_caxis_002",
    category: "multi_axis",
    controller: "Okuma OSP",
    title: "Add dwell after sync C moves",
    tip: "After synchronized C-axis moves, add G4 F2 (2-second dwell) to allow mechanical settling before next move.",
    severity: "medium",
    confidence: 0.85,
    source: "Okuma Program Examples - C-SYNC-1S.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // THREAD MILLING
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_threadmill_001",
    category: "threading",
    controller: "Okuma OSP",
    title: "Account for tool nose radius in thread milling",
    tip: "Read tool nose radius with VDNRX/VDNRZ and add to thread diameter calculation. Use max of X and Z radius for safety.",
    severity: "high",
    confidence: 0.92,
    source: "Okuma Program Examples - THREAD-MILL-ID-OD.MIN",
  },
  {
    id: "okuma_threadmill_002",
    category: "threading",
    controller: "Okuma OSP",
    title: "Use M147/M146 for milling mode",
    tip: "Switch to milling mode with M147 before thread milling, return to turning with M146. Required for proper Y-axis interpolation.",
    severity: "critical",
    confidence: 0.95,
    source: "Okuma Program Examples - THREAD-MILL-ID-OD.MIN",
  },
  {
    id: "okuma_threadmill_003",
    category: "threading",
    controller: "Okuma OSP",
    title: "Double feed rate for lead-in/lead-out arcs",
    tip: "Use 2x feed rate for lead-in arc (F=FD*2) and 4x for retract move (F=FD*4) to reduce cycle time without affecting thread quality.",
    severity: "medium",
    confidence: 0.88,
    source: "Okuma Program Examples - THREAD-MILL-ID-OD.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COORDINATE SYSTEMS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_coords_001",
    category: "programming",
    controller: "Okuma OSP",
    title: "Use G13/G14 for turning/milling switch",
    tip: "G13 switches to lathe coordinates, G14 to machining center. Use modal versions G140/G141 to maintain state across blocks.",
    severity: "high",
    confidence: 0.95,
    source: "Okuma Program Examples",
  },
  {
    id: "okuma_coords_002",
    category: "programming",
    controller: "Okuma OSP",
    title: "Select correct plane for milling",
    tip: "After G14/G141, select plane: G17 (XY) for face milling, G18 (XZ) for turning, G19 (YZ) for side milling. Default after G14 is G17.",
    severity: "high",
    confidence: 0.90,
    source: "Okuma Program Examples - THREAD-MILL-ID-OD.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // USER ALARMS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_alarm_001",
    category: "programming",
    controller: "Okuma OSP",
    title: "Set VUACM before VDOUT for clear alarms",
    tip: "Set alarm text with VUACM[1]='message' BEFORE triggering with VDOUT[990]=1. Text won't display if set after trigger.",
    severity: "medium",
    confidence: 0.90,
    source: "Okuma Program Examples - Alarm-Smpl.min",
  },
  {
    id: "okuma_alarm_002",
    category: "programming",
    controller: "Okuma OSP",
    title: "Check feed override before cutting",
    tip: "Verify VORD[0023] equals 1 (100% feed) before precision operations. Generate alarm if override is reduced.",
    severity: "high",
    confidence: 0.88,
    source: "Okuma Program Examples - LIFE-TEST.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MACRO PROGRAMMING
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_macro_001",
    category: "programming",
    controller: "Okuma OSP",
    title: "Use M331 for macro debugging",
    tip: "Insert M331 at checkpoints in macros to enable single-block stop. Helps verify variable values and flow during testing.",
    severity: "low",
    confidence: 0.92,
    source: "Okuma Program Examples",
  },
  {
    id: "okuma_macro_002",
    category: "programming",
    controller: "Okuma OSP",
    title: "Calculate tool ID with formula",
    tip: "Tool data index = [VTDIN*10000]+VTDTN. Use this to access VDNRX, VDNRZ and other tool-specific arrays.",
    severity: "high",
    confidence: 0.95,
    source: "Okuma Program Examples - THREAD-MILL-ID-OD.MIN",
  },
  {
    id: "okuma_macro_003",
    category: "programming",
    controller: "Okuma OSP",
    title: "Use named parameters for readability",
    tip: "Define parameters like XS, YS, ZS, PT, FD at subroutine start. Call with CALL Oname XS=value YS=value for clear, maintainable code.",
    severity: "medium",
    confidence: 0.90,
    source: "Okuma Program Examples - THREAD-MILL-ID-OD.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RAPID CONTROL
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_rapid_001",
    category: "safety",
    controller: "Okuma OSP",
    title: "Disable rapid override for probing",
    tip: "Use M216 to ignore rapid override dial during probing or sensitive operations. Restore with M215 after completion.",
    severity: "high",
    confidence: 0.92,
    source: "Okuma Program Examples - LIFE-TEST.MIN",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AOT (AUTOMATIC OPERATION TIME)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "okuma_aot_001",
    category: "optimization",
    controller: "Okuma OSP",
    title: "Enable Adaptive Cutting Control for variable stock",
    tip: "AOT Adaptive Cutting Control automatically adjusts feed based on cutting load. Reduces cycle time by 5-15% on castings and forgings with stock variation.",
    severity: "medium",
    confidence: 0.85,
    source: "Okuma AOT.pdf",
  },
  {
    id: "okuma_aot_002",
    category: "optimization",
    controller: "Okuma OSP",
    title: "Use Corner Deceleration for tight tolerances",
    tip: "AOT Corner Deceleration reduces speed at sharp corners automatically. Enable for parts requiring < 0.05mm positional accuracy at corners.",
    severity: "medium",
    confidence: 0.85,
    source: "Okuma AOT.pdf",
  },
  {
    id: "okuma_aot_003",
    category: "optimization",
    controller: "Okuma OSP",
    title: "Set Super NURBS for complex contours",
    tip: "Enable Super NURBS interpolation for smooth surface finish on complex profiles. Processes CAM points as splines rather than linear segments.",
    severity: "medium",
    confidence: 0.82,
    source: "Okuma AOT.pdf",
  },
];

/**
 * Statistics
 */
export const OKUMA_TIPS_STATS = {
  total_tips: OKUMA_LATHE_TRIBAL_TIPS.length,
  categories: [...new Set(OKUMA_LATHE_TRIBAL_TIPS.map(t => t.category))],
  by_severity: {
    critical: OKUMA_LATHE_TRIBAL_TIPS.filter(t => t.severity === "critical").length,
    high: OKUMA_LATHE_TRIBAL_TIPS.filter(t => t.severity === "high").length,
    medium: OKUMA_LATHE_TRIBAL_TIPS.filter(t => t.severity === "medium").length,
    low: OKUMA_LATHE_TRIBAL_TIPS.filter(t => t.severity === "low").length,
  },
};
