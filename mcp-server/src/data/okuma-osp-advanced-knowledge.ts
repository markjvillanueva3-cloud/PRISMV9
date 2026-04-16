/**
 * Okuma OSP Advanced Knowledge — Extracted from Program Examples
 * ===============================================================
 *
 * Real patterns extracted from H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples/
 * These are production-proven patterns from Okuma technical documentation.
 *
 * @module data/okuma-osp-advanced-knowledge
 * @version 1.0.0
 */

// ============================================================================
// TOOL LIFE MANAGEMENT
// ============================================================================

/**
 * Tool life management system variables and patterns
 * Source: LIFE-TEST.MIN, LIFE-CHECK.SSB
 */
export const OKUMA_TOOL_LIFE_PATTERNS = {
  /** Tool group life status variable - 1 = expired */
  group_life_status: "VGRLF[group_number]",

  /** Tool life monitoring setup */
  monitoring: {
    /** Monitor mode values: 10=Z+S, 11=X+Z+S, etc. */
    enable_pattern: "VLMON[tool_group]=monitor_mode",
    disable_pattern: "VLMON[tool_group]=0",
    monitor_modes: {
      "10": "Z + Spindle monitoring",
      "11": "X + Z + Spindle monitoring",
      "12": "All axes monitoring",
    },
  },

  /** Tool group and operation group selection */
  selection: {
    tool_group: "TG=group_number",
    operation_group: "OG=operation_number",
  },

  /** User alarm for tool life expired */
  alarm_pattern: `
    VUACM[1]='TOOL LIFE'
    VUACM[10]=' NG'
    VDOUT[992]=1
  `,

  /** Complete tool life check subroutine */
  check_subroutine: `
    O8888
    (SUB TO CHECK TOOL GROUPS)
    TLN1=96 (TOTAL NUMBER OF GROUPS)
    CT1=1 (INITIALIZE COUNT UP)
    N1 IF[VGRLF[CT1] EQ 1]GOTO N999
    IF[CT1 GE TLN1]GOTO N100
    CT1=CT1+1
    GOTO N1
    N999 VUACM[1]='TOOL LIFE'
    VUACM[10]=' NG'
    VDOUT[992]=1
    N100 RTS
  `,
};

// ============================================================================
// BAR FEEDER INTEGRATION
// ============================================================================

/**
 * Bar feeder integration patterns
 * Source: OBAR.SSB, bar-chk.min, BAR-CHECK.SSB
 */
export const OKUMA_BAR_FEEDER_PATTERNS = {
  /** Digital inputs for bar feeder status */
  digital_inputs: {
    VDIN_24: "Bar present / stock available",
    VDIN_25: "Bar feeder ready",
    VDIN_26: "End of bar",
  },

  /** Position setting for bar feed */
  position_variable: "VPWTP=position_value",

  /** M-codes for chuck/collet control */
  chuck_control: {
    M83: "Chuck close",
    M84: "Chuck open",
    M76: "Collet close (sub-spindle)",
    M77: "Collet open (sub-spindle)",
  },

  /** Bar feeder specific M-codes */
  bar_feeder_mcodes: {
    M436: "Bar feed command",
    M437: "Bar feed complete confirm",
    M331: "Macro single block stop",
  },

  /** Complete bar check routine */
  bar_check_pattern: `
    G13
    G140
    G50S2500
    N1 G0X50Z1P10
    IF [VDIN[24] EQ 1] NBAR
    M331
    M0
    GOTO NEND
    NBAR M84
    VPWTP=494.7795
    M77
    M436
    M83
    M76
    G0 X50 Z.5 T1224 (STOCK STOP)
    X0
    M84
    G1 G94 Z0 F100
    M83
    G0 Z1
    X50
    NEND
    G14
    G141
  `,
};

// ============================================================================
// C-AXIS SYNCHRONIZATION
// ============================================================================

/**
 * C-axis synchronization patterns for multi-spindle machining
 * Source: C-SYNC-1S.MIN, C-SYNC-2S.MIN
 */
export const OKUMA_C_AXIS_SYNC_PATTERNS = {
  /** Main spindle C-axis control */
  main_spindle: {
    c_axis_on: "M110",
    c_axis_off: "M109",
  },

  /** Sub-spindle C-axis control */
  sub_spindle: {
    c_axis_on: "M892",
    c_axis_off: "M891",
  },

  /** Synchronization modes */
  sync_modes: {
    sync_on_a_turret: "M889 (C-AXIS SYNC MODE ON - A TURRET CONTROL)",
    sync_on_b_turret: "M890 (C-AXIS SYNC MODE ON - B TURRET CONTROL)",
    sync_off: "M888 (C-AXIS SYNC MODE OFF)",
  },

  /** Complete sync pattern for single saddle */
  single_saddle_sync: `
    G140
    M110 (MAIN C-AXIS ON)
    M892 (SUB C-AXIS ON)
    M889 (C-AXIS SYNC MODE ON -A- TURRET CONTROL)
    G0 C90
    G4 F2
    G0 C180.
    G4 F2
    G0 C270
    G4 F2
    M888 (C-AXIS SYNC MODE OFF)
    M891 (SUB C-AXIS OFF)
    M109
    M02
  `,
};

// ============================================================================
// THREAD MILLING
// ============================================================================

/**
 * Thread milling patterns with Y-axis
 * Source: THREAD-MILL-ID-OD.MIN
 */
export const OKUMA_THREAD_MILL_PATTERNS = {
  /** Milling mode control */
  milling_mode: {
    enable: "M147",
    disable: "M146",
  },

  /** Plane selection for milling */
  plane_selection: {
    XY_plane: "G17",
    XZ_plane: "G18",
    YZ_plane: "G19",
  },

  /** Tool data access variables */
  tool_data: {
    nose_radius_x: "VDNRX[tool_id]",
    nose_radius_z: "VDNRZ[tool_id]",
    tool_id_calc: "[VTDIN*10000]+VTDTN",
  },

  /** OD thread milling subroutine */
  od_thread_mill: `
    OTHOD
    (THREADMILL O.D. Z-AXIS)
    V199=[VTDIN*10000]+VTDTN
    M331
    V198=VDNRX[V199]
    V197=VDNRZ[V199]
    M331
    IF[V198 GE V197] NV198
    M331
    V198=V197
    M331
    NV198 M808
    CD=CD+[V198*2]
    M331
    G0 G90 G94 G17 X=XS+[CD/2]+[LR*2] Y=YS Z=ZS M147
    G1 G17 X=XS+[CD/2]+LR Y=YS+LR Z=ZS F=FD*2
    G3 Z=VSIOZ-[PT/4] Y=YS X=XS+[CD/2] L=LR F=FD
    NCUT1 G2 Z=VSIOZ-[PT/2] Y=YS X=XS-[CD/2] L=CD/2
    Z=VSIOZ-[PT/2] Y=YS X=XS+[CD/2] L=CD/2
    M331
    IF [VSIOZ GE ZF] NCUT1
    G3 Z=VSIOZ-[PT/4] Y=YS-LR X=XS+[CD/2]+LR L=LR F=FD*2
    G1 X=XS+[CD/2]+[LR*2] Y=YS F=FD*4
    G0 G18 Z=ZS M146
    RTS
  `,

  /** Thread mill parameters */
  parameters: {
    XS: "X-start position",
    YS: "Y-start position",
    ZA: "Z-approach position above part",
    ZS: "Z-start position / bottom of thread",
    ZF: "Z-finish depth position",
    FD: "Feed rate IPR",
    CD: "Thread minor diameter",
    PT: "Thread pitch",
    LR: "Lead in/out arc size",
  },
};

// ============================================================================
// USER ALARMS
// ============================================================================

/**
 * User alarm programming patterns
 * Source: Alarm-Smpl.min, Manual Pages.pdf
 */
export const OKUMA_USER_ALARM_PATTERNS = {
  /** User alarm character variables */
  alarm_text: {
    line_1: "VUACM[1]='text line 1'",
    line_2: "VUACM[2]='text line 2'",
    line_10: "VUACM[10]='additional text'",
  },

  /** Digital output for alarm trigger */
  alarm_output: {
    general_alarm: "VDOUT[990]=1",
    tool_alarm: "VDOUT[992]=1",
    safety_alarm: "VDOUT[991]=1",
  },

  /** Complete alarm pattern */
  alarm_example: `
    NALM VUACM[1]='FEED RATE'
    VUACM[10]=' <100%'
    VDOUT[990]=1
  `,

  /** Feed rate check pattern */
  feed_rate_check: "IF[VORD[0023] NE 1] GOTO NALM (100% FEED RATE)",
};

// ============================================================================
// RAPID FEED CONTROL
// ============================================================================

/**
 * Rapid feed override control
 */
export const OKUMA_RAPID_CONTROL_PATTERNS = {
  /** Rapid feed override */
  rapid_ignore: "M216 (RAPID FEED IGNORE)",
  rapid_on: "M215 (RAPID FEED ON)",

  /** Common usage pattern */
  usage: `
    NSTT M216 (RAPID FEED IGNORE)
    (... probing or sensitive operations ...)
    M215 (RAPID FEED ON)
  `,
};

// ============================================================================
// COORDINATE SYSTEM SWITCHING
// ============================================================================

/**
 * G13/G14 coordinate system patterns
 */
export const OKUMA_COORDINATE_PATTERNS = {
  /** Coordinate systems */
  systems: {
    G13: "Switch to lathe (turning) coordinate system",
    G14: "Switch to machining center (milling) coordinate system",
    G140: "Modal lathe coordinate system",
    G141: "Modal machining center coordinate system",
  },

  /** Typical usage */
  turning_to_milling: `
    G14  (Switch to milling coordinates)
    G141 (Modal milling)
    (... milling operations ...)
    G13  (Switch back to turning)
    G140 (Modal turning)
  `,
};

// ============================================================================
// VARIABLE LOST MOTION COMPENSATION
// ============================================================================

/**
 * Variable lost motion compensation patterns
 * Source: LE32-164-R08a.pdf
 */
export const OKUMA_LOST_MOTION_PATTERNS = {
  /** Lost motion system variables */
  variables: {
    VLMCX: "Lost motion compensation X-axis",
    VLMCZ: "Lost motion compensation Z-axis",
    VLMCY: "Lost motion compensation Y-axis",
  },

  /** Enable/disable */
  control: {
    enable: "G268",
    disable: "G269",
  },

  /** Application guidelines */
  guidelines: [
    "Use for precision finishing operations",
    "Compensates for mechanical backlash",
    "Values typically 0.001-0.010mm",
    "Adjust based on measured deviation",
  ],
};

// ============================================================================
// PROBING PATTERNS
// ============================================================================

/**
 * Touch probe and gauging patterns
 * Source: PROBE.SSB, Probing-Cycle-Instructions.doc
 */
export const OKUMA_PROBING_PATTERNS = {
  /** Probe commands */
  commands: {
    G31: "Skip function (probe touch)",
    G313: "Auto touch setter measurement",
    G314: "Tool breakage check",
  },

  /** Probe data variables */
  variables: {
    VPSKX: "Probe skip position X",
    VPSKZ: "Probe skip position Z",
    VPSKY: "Probe skip position Y",
  },

  /** Tool breakage check pattern */
  tool_breakage_check: `
    G313-TOOL-CHK.MIN pattern:
    1. Position tool above touch setter
    2. Execute G313 measurement
    3. Compare to stored length
    4. Alarm if deviation exceeds tolerance
  `,
};

// ============================================================================
// SYSTEM VARIABLE QUICK REFERENCE
// ============================================================================

/**
 * Common Okuma OSP system variables
 */
export const OKUMA_SYSTEM_VARIABLES = {
  // Position variables
  VSIOX: "Servo input position X",
  VSIOZ: "Servo input position Z",
  VSIOY: "Servo input position Y",
  VSIOC: "Servo input position C",

  // Tool data
  VTDIN: "Tool data index number",
  VTDTN: "Tool number in turret",
  VDNRX: "Tool nose radius X (array)",
  VDNRZ: "Tool nose radius Z (array)",

  // Digital I/O
  VDIN: "Digital input (array)",
  VDOUT: "Digital output (array)",

  // Spindle
  VSACT: "Actual spindle speed",
  VSOUT: "Spindle speed command",

  // Feed
  VFACT: "Actual feed rate",
  VFORD: "Feed override dial position",
  VORD: "Override settings (array)",

  // Time
  VTIME: "Timer variable",
  VPWON: "Power-on time",
  VCYTM: "Cycle time",

  // Alarm
  VUACM: "User alarm character message (array)",
  VALMS: "Alarm status",

  // Tool life
  VGRLF: "Group life status (array)",
  VLMON: "Life monitor setting (array)",
};

// ============================================================================
// M-CODE QUICK REFERENCE (OKUMA OSP)
// ============================================================================

/**
 * Common Okuma M-codes beyond standard
 */
export const OKUMA_M_CODES = {
  // Spindle
  M109: "Main C-axis OFF",
  M110: "Main C-axis ON",
  M111: "Sub spindle C-axis OFF",
  M112: "Sub spindle C-axis ON",

  // Chuck/Collet
  M76: "Sub collet close",
  M77: "Sub collet open",
  M83: "Chuck close",
  M84: "Chuck open",

  // Tailstock
  M14: "Tailstock forward",
  M15: "Tailstock retract",

  // Steady rest
  M18: "Steady rest close",
  M19: "Steady rest open",

  // Milling mode
  M146: "Milling mode OFF",
  M147: "Milling mode ON",

  // Rapid override
  M215: "Rapid feed ON",
  M216: "Rapid feed IGNORE",

  // Macro control
  M331: "Single block stop in macro",
  M808: "Macro wait",

  // Bar feeder
  M436: "Bar feed command",
  M437: "Bar feed complete",

  // C-axis sync
  M888: "C-axis sync OFF",
  M889: "C-axis sync ON (A turret)",
  M890: "C-axis sync ON (B turret)",
  M891: "Sub C-axis OFF",
  M892: "Sub C-axis ON",
};

// ============================================================================
// STATISTICS
// ============================================================================

export const OKUMA_KNOWLEDGE_STATS = {
  source: "H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples/",
  programs_analyzed: 90,
  pattern_categories: 12,
  system_variables: Object.keys(OKUMA_SYSTEM_VARIABLES).length,
  m_codes: Object.keys(OKUMA_M_CODES).length,
  extraction_date: "2026-04-15",
};
