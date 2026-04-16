/**
 * Okuma OSP Program Examples Knowledge Tips
 * ==========================================
 *
 * Comprehensive tribal knowledge extracted from real Okuma OSP program examples
 * found in H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples/
 *
 * Categories covered:
 *   - tool_life          : Tool life management (VLMON, VGRLF, TG, OG)
 *   - c_axis_sync        : C-axis synchronization (M889, M888, M110, M109)
 *   - bar_feeder         : Bar feeder integration (VDIN, VPWTP, M436)
 *   - touch_setter       : Tool breakage detection (VDOUT, OTLLS, G313)
 *   - thread_mill        : Thread milling patterns (G138, G20, VDNRX)
 *   - user_alarms        : User alarm programming (VUACM, VDOUT)
 *   - probing            : Probing and gauging (VPSKX, G31, GET/PUT)
 *   - variable_motion    : Variable lost motion compensation
 *   - timing             : Timer variables and dwells (VTIME, VCYTM)
 *   - engraving          : Character engraving macros
 *   - multi_spindle      : Multi-spindle coordination
 *   - data_io            : Data read/write operations
 *
 * @module data/okuma-osp-program-examples
 * @version 1.0.0
 */

export interface OkumaOSPTip {
  tip_id: string;
  title: string;
  body: string;
  category:
    | "tool_life"
    | "c_axis_sync"
    | "bar_feeder"
    | "touch_setter"
    | "thread_mill"
    | "user_alarms"
    | "probing"
    | "variable_motion"
    | "timing"
    | "engraving"
    | "multi_spindle"
    | "data_io"
    | "safety"
    | "coolant"
    | "axis_control";
  severity: "critical" | "warning" | "info" | "best_practice";
  confidence: number;
  machine_type: "lathe" | "mill_turn" | "multitask";
  controller: "okuma_osp";
  osp_family: ("P200" | "P300" | "P500")[];
  source: string;
  tags: string[];
  code_example?: string;
  variables?: Record<string, string>;
  mcodes?: string[];
  gcodes?: string[];
  parameters?: Record<string, string>;
  created_at?: string;
}

// ============================================================================
// TOOL LIFE MANAGEMENT TIPS
// ============================================================================

const TOOL_LIFE_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-tl-001",
    title: "VLMON Tool Load Monitor Setup",
    body: "VLMON[n] enables tool load monitoring for tool group n. The value determines which axes are monitored: 10 = Z-axis + Spindle load, 11 = X + Z + Spindle load, 12 = All axes monitored. Set VLMON[group]=0 to disable monitoring for a group. This is essential for lights-out machining to detect tool wear or breakage before catastrophic failure.",
    category: "tool_life",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LIFE-TEST.MIN",
    tags: ["tool-life", "monitoring", "load", "automation"],
    code_example: `
(ENABLE TOOL LOAD MONITORING)
VLMON[1]=11      (GROUP 1: X+Z+SPINDLE MONITORING)
VLMON[2]=10      (GROUP 2: Z+SPINDLE ONLY)
VLMON[3]=0       (GROUP 3: MONITORING OFF)
TG=1             (SELECT TOOL GROUP 1)
T0101            (CALL TOOL FROM GROUP 1)
`,
    variables: {
      "VLMON[n]": "Tool load monitor setting for group n (0=off, 10=Z+S, 11=X+Z+S, 12=all)",
    },
  },
  {
    tip_id: "osp-tl-002",
    title: "VGRLF Tool Group Life Status Check",
    body: "VGRLF[n] returns the life status of tool group n. When VGRLF[n] = 1, the tool life for that group has expired. Use this in a loop to check all 96 possible tool groups before starting a job. This prevents running with expired tools that could cause quality issues or crashes.",
    category: "tool_life",
    severity: "critical",
    confidence: 98,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LIFE-CHECK.SSB",
    tags: ["tool-life", "status", "expired", "pre-check"],
    code_example: `
O8888
(SUB TO CHECK TOOL GROUPS)
TLN1=96               (TOTAL NUMBER OF GROUPS)
CT1=1                 (INITIALIZE COUNTER)
N1 IF[VGRLF[CT1] EQ 1]GOTO N999
IF[CT1 GE TLN1]GOTO N100
CT1=CT1+1
GOTO N1
N999 VUACM[1]='TOOL LIFE'
VUACM[10]=' NG'
VDOUT[992]=1          (TRIGGER ALARM)
N100 RTS
`,
    variables: {
      "VGRLF[n]": "Tool group life status (0=OK, 1=expired)",
      "TLN1": "Total number of tool groups to check",
      "CT1": "Loop counter variable",
    },
  },
  {
    tip_id: "osp-tl-003",
    title: "TLID Tool Life ID Command",
    body: "TLID command allows direct access to tool life management data. Used to identify which tool in a group is currently active and how much life remains. Combined with TG (tool group) and OG (operation group) commands for complete tool life management.",
    category: "tool_life",
    severity: "info",
    confidence: 85,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LIFE-TEST.MIN",
    tags: ["tool-life", "identification", "management"],
    parameters: {
      "TG": "Tool Group selection (TG=1 through TG=96)",
      "OG": "Operation Group selection",
      "TLID": "Tool Life ID for direct access",
    },
  },
  {
    tip_id: "osp-tl-004",
    title: "Complete Tool Life Pre-Check Subroutine",
    body: "Before starting any lights-out production run, call a subroutine that loops through all 96 tool groups checking VGRLF status. If any group shows expired (VGRLF=1), trigger a user alarm and halt the program. This prevents running entire batches with worn tools.",
    category: "tool_life",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LIFE-CHECK.SSB",
    tags: ["tool-life", "subroutine", "pre-check", "automation", "lights-out"],
    code_example: `
(CALL AT PROGRAM START)
CALL O8888          (CHECK ALL TOOL GROUPS)

(SUBROUTINE O8888)
O8888
(TOOL LIFE CHECK ALL GROUPS)
TLN1=96
CT1=1
NLOOP IF[VGRLF[CT1] EQ 1]GOTO NALARM
IF[CT1 GE TLN1]GOTO NPASS
CT1=CT1+1
GOTO NLOOP
NALARM VUACM[1]='TOOL GROUP'
VUACM[2]=CT1
VUACM[10]='LIFE EXPIRED'
VDOUT[992]=1
M0
NPASS RTS
`,
  },
  {
    tip_id: "osp-tl-005",
    title: "Tool Group Selection with TG Command",
    body: "TG=n selects tool group n for subsequent tool life management operations. Tool groups allow multiple sister tools to be rotated automatically when one reaches its life limit. Always specify TG before the T-code when using tool life management.",
    category: "tool_life",
    severity: "info",
    confidence: 92,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LIFE-TEST.MIN",
    tags: ["tool-life", "group", "selection", "sister-tools"],
    code_example: `
TG=1                (SELECT TOOL GROUP 1)
T0101               (CALL TOOL - GROUP MANAGES WHICH SISTER)
G50 S2500
G96 S650 M3
(MACHINING OPERATIONS)
`,
    parameters: {
      "TG": "Tool group number (1-96)",
    },
  },
];

// ============================================================================
// C-AXIS SYNCHRONIZATION TIPS
// ============================================================================

const C_AXIS_SYNC_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-ca-001",
    title: "M889 C-Axis Sync Mode ON (A-Turret Control)",
    body: "M889 activates C-axis synchronization mode with the A-turret controlling the motion. In sync mode, both main and sub spindle C-axes move together in lockstep. This is essential for cross-drilling, milling features that span both spindles, or synchronized part transfer operations.",
    category: "c_axis_sync",
    severity: "critical",
    confidence: 95,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-1S.MIN",
    tags: ["c-axis", "sync", "multi-spindle", "coordination"],
    mcodes: ["M889"],
    code_example: `
G140
M110              (MAIN C-AXIS ON)
M892              (SUB C-AXIS ON)
M889              (C-AXIS SYNC MODE ON - A TURRET CONTROL)
G0 C90
G4 F2             (DWELL FOR SYNC STABILIZATION)
G0 C180.
G4 F2
G0 C270
G4 F2
M888              (C-AXIS SYNC MODE OFF)
M891              (SUB C-AXIS OFF)
M109              (MAIN C-AXIS OFF)
`,
  },
  {
    tip_id: "osp-ca-002",
    title: "M888 C-Axis Sync Mode OFF",
    body: "M888 disables C-axis synchronization mode, returning both spindles to independent operation. CRITICAL: Always issue M888 before attempting to stop either spindle independently or before returning to normal turning mode. Failure to do so can cause mechanical damage.",
    category: "c_axis_sync",
    severity: "critical",
    confidence: 98,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-1S.MIN, C-SYNC-2S.MIN",
    tags: ["c-axis", "sync-off", "safety"],
    mcodes: ["M888"],
    code_example: `
(END OF SYNCHRONIZED OPERATIONS)
M888              (C-AXIS SYNC MODE OFF - MUST DO FIRST)
G4 F1             (DWELL FOR DECELERATION)
M891              (SUB C-AXIS OFF)
M109              (MAIN C-AXIS OFF)
G0 X50 Z20        (RETRACT BEFORE SPINDLE START)
`,
  },
  {
    tip_id: "osp-ca-003",
    title: "M110/M109 Main C-Axis Enable/Disable",
    body: "M110 enables the main spindle C-axis (converts spindle to servo-controlled positioning axis). M109 disables it, returning to normal spindle mode. SEQUENCE MATTERS: Always M5 (stop spindle) before M110, and always issue M109 before M3/M4 to restart spindle rotation.",
    category: "c_axis_sync",
    severity: "critical",
    confidence: 98,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-1S.MIN",
    tags: ["c-axis", "main-spindle", "enable", "disable"],
    mcodes: ["M110", "M109"],
    code_example: `
(TURNING COMPLETE - TRANSITION TO C-AXIS)
M5                (STOP SPINDLE FIRST!)
G4 F1             (DWELL FOR SPINDLE STOP)
M110              (MAIN C-AXIS ON)
G0 C0             (HOME C-AXIS)
(MILLING OPERATIONS)
M109              (C-AXIS OFF)
M3 S1200          (RESTART SPINDLE)
`,
  },
  {
    tip_id: "osp-ca-004",
    title: "M892/M891 Sub C-Axis Enable/Disable",
    body: "M892 enables the sub-spindle C-axis. M891 disables it. For synchronized C-axis operations, both M110 (main) and M892 (sub) must be active before calling M889 (sync mode). Always disable in reverse order: M888 first, then M891, then M109.",
    category: "c_axis_sync",
    severity: "critical",
    confidence: 95,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-2S.MIN",
    tags: ["c-axis", "sub-spindle", "coordination"],
    mcodes: ["M892", "M891"],
    code_example: `
(DUAL SPINDLE C-AXIS ACTIVATION)
M5                (STOP MAIN SPINDLE)
M205              (STOP SUB SPINDLE)
G4 F2             (WAIT FOR BOTH TO STOP)
M110              (MAIN C-AXIS ON)
M892              (SUB C-AXIS ON)
G0 C0 P10         (POSITION BOTH TO 0)
(OPERATIONS)
M891              (SUB C-AXIS OFF FIRST)
M109              (MAIN C-AXIS OFF)
`,
  },
  {
    tip_id: "osp-ca-005",
    title: "G4 Dwell Required After C-Axis Sync Commands",
    body: "CRITICAL: Always include a G4 dwell (minimum F1-F2 seconds) after issuing C-axis synchronization commands (M889, M888). The mechanical coupling requires time to engage/disengage. Omitting the dwell can cause sync errors, position drift, or mechanical damage.",
    category: "c_axis_sync",
    severity: "critical",
    confidence: 98,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-1S.MIN",
    tags: ["c-axis", "sync", "dwell", "safety", "timing"],
    gcodes: ["G4"],
    code_example: `
M889              (SYNC ON)
G4 F2             (MANDATORY 2-SECOND DWELL!)
G0 C90            (NOW SAFE TO MOVE)

(AT END)
M888              (SYNC OFF)
G4 F2             (MANDATORY DWELL AGAIN!)
`,
  },
  {
    tip_id: "osp-ca-006",
    title: "M890 C-Axis Sync Mode ON (B-Turret Control)",
    body: "M890 activates C-axis synchronization with B-turret control (vs M889 for A-turret). On machines with dual turrets, this determines which turret's commanded C-axis position controls the synchronized motion. Use M889 for upper turret operations, M890 for lower turret operations.",
    category: "c_axis_sync",
    severity: "info",
    confidence: 90,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-2S.MIN",
    tags: ["c-axis", "b-turret", "dual-turret", "sync"],
    mcodes: ["M890"],
  },
];

// ============================================================================
// BAR FEEDER INTEGRATION TIPS
// ============================================================================

const BAR_FEEDER_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-bf-001",
    title: "VDIN[24] Bar Present Check",
    body: "VDIN[24] is the digital input for bar feeder stock present status. When VDIN[24]=1, bar stock is available. When VDIN[24]=0, the bar is depleted. Always check this at the start of each cycle in a bar feeder loop to avoid running empty.",
    category: "bar_feeder",
    severity: "critical",
    confidence: 98,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "OBAR.SSB, bar-chk.min",
    tags: ["bar-feeder", "stock", "input", "automation"],
    variables: {
      "VDIN[24]": "Bar present status (1=stock available, 0=empty)",
      "VDIN[25]": "Bar feeder ready signal",
      "VDIN[26]": "End of bar signal",
    },
    code_example: `
G13
G140
NLOOP
IF [VDIN[24] EQ 0] GOTO NEMPTY
(MACHINING CYCLE)
GOTO NLOOP
NEMPTY
VUACM[1]='BAR FEEDER'
VUACM[10]='STOCK EMPTY'
M0
M30
`,
  },
  {
    tip_id: "osp-bf-002",
    title: "VPWTP Workpiece Transfer Position",
    body: "VPWTP sets the workpiece transfer position for bar feeder pull-out or sub-spindle pickup. This is the Z-axis position where the bar extends to for gripping. Value is in machine coordinates (absolute). Must be calculated based on part length + grip length + clearance.",
    category: "bar_feeder",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "OBAR.SSB, BAR-CHECK.SSB",
    tags: ["bar-feeder", "position", "transfer", "setup"],
    variables: {
      "VPWTP": "Workpiece transfer position (machine coordinates)",
    },
    code_example: `
(SET BAR PULL-OUT POSITION)
VPWTP=494.7795      (CALCULATED: PART LENGTH + GRIP + CLEARANCE)
M77                 (COLLET OPEN)
M436                (BAR FEED COMMAND)
M76                 (COLLET CLOSE)
`,
  },
  {
    tip_id: "osp-bf-003",
    title: "M436 Bar Feed Command",
    body: "M436 triggers the bar feeder to advance stock to the programmed VPWTP position. The machine waits for the bar feeder confirmation signal before continuing. Always verify VDIN[24]=1 before issuing M436 to avoid feeding into an empty channel.",
    category: "bar_feeder",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "OBAR.SSB",
    tags: ["bar-feeder", "feed", "advance"],
    mcodes: ["M436"],
    code_example: `
IF [VDIN[24] EQ 1] NBAR
M331                (SINGLE BLOCK STOP - NO BAR)
M0
GOTO NEND
NBAR M84            (MAIN CHUCK OPEN)
VPWTP=494.7795
M77                 (SUB COLLET OPEN)
M436                (BAR FEED!)
M83                 (MAIN CHUCK CLOSE)
M76                 (SUB COLLET CLOSE)
`,
  },
  {
    tip_id: "osp-bf-004",
    title: "M76/M77 Collet Close/Open (Sub-Spindle)",
    body: "M76 closes the sub-spindle collet, M77 opens it. Used during bar transfer operations to grip the bar end with the sub-spindle before cutoff. Sequence: M77 (open), position sub-spindle, M76 (close), cutoff, M77 (release).",
    category: "bar_feeder",
    severity: "critical",
    confidence: 98,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "OBAR.SSB, BAR-CHECK.SSB",
    tags: ["collet", "sub-spindle", "grip"],
    mcodes: ["M76", "M77"],
    code_example: `
(SUB-SPINDLE PICKUP SEQUENCE)
G0 W-50.0           (SUB APPROACH)
M77                 (COLLET OPEN)
G0 W-10.0           (FINAL APPROACH)
M76                 (COLLET CLOSE - GRIP PART)
G4 F0.5             (DWELL FOR GRIP)
(CUTOFF OPERATION)
`,
  },
  {
    tip_id: "osp-bf-005",
    title: "M83/M84 Chuck Close/Open (Main Spindle)",
    body: "M83 closes the main spindle chuck, M84 opens it. Fundamental to all bar feeder operations. SAFETY: Always ensure tool is retracted (X > part diameter + clearance) before issuing M84. M83 should only be issued when bar position is confirmed.",
    category: "bar_feeder",
    severity: "critical",
    confidence: 98,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P200", "P300", "P500"],
    source: "OBAR.SSB",
    tags: ["chuck", "main-spindle", "grip", "safety"],
    mcodes: ["M83", "M84"],
    code_example: `
(BAR FEED SEQUENCE)
G0 X50 Z20          (RETRACT FIRST!)
M84                 (CHUCK OPEN)
M436                (BAR FEED)
G4 F1               (DWELL FOR SETTLE)
M83                 (CHUCK CLOSE)
G4 F0.5             (GRIP CONFIRM DWELL)
`,
  },
  {
    tip_id: "osp-bf-006",
    title: "M331 Macro Single Block Stop",
    body: "M331 forces a single block stop even when running in automatic mode. Used in bar feeder macros to pause for operator intervention when bar is empty or error condition detected. The program halts until cycle start is pressed.",
    category: "bar_feeder",
    severity: "info",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "OBAR.SSB, bar-chk.min",
    tags: ["macro", "stop", "intervention", "automation"],
    mcodes: ["M331"],
    code_example: `
IF [VDIN[24] EQ 1] NBAR
M331                (STOP - NO BAR PRESENT)
VUACM[1]='LOAD BAR'
M0
GOTO NEND
NBAR
(CONTINUE WITH BAR PRESENT)
`,
  },
  {
    tip_id: "osp-bf-007",
    title: "Complete Bar Feeder Check Routine",
    body: "A complete bar feeder check routine should: 1) Check VDIN[24] for bar present, 2) Open chuck M84, 3) Set VPWTP position, 4) Open collet M77, 5) Feed bar M436, 6) Close chuck M83, 7) Close collet M76, 8) Position stock stop tool and face to zero.",
    category: "bar_feeder",
    severity: "best_practice",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "BAR-CHECK.SSB",
    tags: ["bar-feeder", "routine", "complete", "best-practice"],
    code_example: `
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
G0 X50 Z.5 T1224    (STOCK STOP TOOL)
X0
M84
G1 G94 Z0 F100      (FACE TO ZERO)
M83
G0 Z1
X50
NEND
G14
G141
`,
  },
];

// ============================================================================
// TOUCH-SETTER / TOOL BREAKAGE TIPS
// ============================================================================

const TOUCH_SETTER_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-ts-001",
    title: "VDOUT[35]=1 Tool Breakage Detection Enable",
    body: "VDOUT[35]=1 enables the tool breakage detection output signal. When a tool breakage is detected (via touch-setter comparison), this output triggers the machine alarm system. Set VDOUT[35]=0 to clear the condition after addressing the broken tool.",
    category: "touch_setter",
    severity: "critical",
    confidence: 92,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Auto Touch-setter folder",
    tags: ["tool-breakage", "detection", "output", "alarm"],
    variables: {
      "VDOUT[35]": "Tool breakage detection output (1=broken detected, 0=clear)",
    },
    code_example: `
(TOOL BREAKAGE CHECK RESULT)
IF [ABS[MEASURED - STORED] GT TOLERANCE] NBROKEN
GOTO NCONTINUE
NBROKEN VDOUT[35]=1
VUACM[1]='TOOL BROKEN'
VUACM[10]='T' + VTDIN
M0
NCONTINUE
`,
  },
  {
    tip_id: "osp-ts-002",
    title: "OTLLS Tool Length Measuring Subroutine",
    body: "OTLLS is the standard Okuma subroutine name for tool length measuring with the auto touch-setter. It accepts parameters for measurement position, approach direction, tolerance, and tool number. Call with required parameters for automated tool measurement.",
    category: "touch_setter",
    severity: "info",
    confidence: 88,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G13-TOOL-SET.MIN",
    tags: ["tool-length", "measurement", "subroutine", "touch-setter"],
    parameters: {
      "MSPX": "Measurement start position X",
      "MSPZ": "Measurement start position Z",
      "APP": "Approach distance",
      "IMP": "Impact detection distance",
      "DNG": "Danger zone distance",
      "DOK": "Detection OK tolerance",
      "TLN": "Tool number to measure",
      "XP1-XP3": "X probe positions",
      "ZP1-ZP3": "Z probe positions",
    },
  },
  {
    tip_id: "osp-ts-003",
    title: "M117/M118 Touch-Setter Arm Advance/Retract",
    body: "M117 advances the touch-setter arm into the work zone. M118 retracts it to the safe position. CRITICAL: Always verify arm retracted (M118) before any spindle start or rapid moves near the arm zone. Collision with touch-setter arm is expensive.",
    category: "touch_setter",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G313-TOOL-CHK.MIN",
    tags: ["touch-setter", "arm", "advance", "retract", "safety"],
    mcodes: ["M117", "M118"],
    code_example: `
(TOOL BREAKAGE CHECK SEQUENCE)
M5                  (SPINDLE STOP)
G0 X100 Z50         (CLEAR WORK ZONE)
M117                (ARM ADVANCE)
G4 F2               (WAIT FOR ARM)
(MEASUREMENT MOVES)
G0 Z-10
G31 X5 F100         (PROBE TOUCH)
(CHECK RESULTS)
M118                (ARM RETRACT)
G4 F2               (WAIT FOR ARM CLEAR)
`,
  },
  {
    tip_id: "osp-ts-004",
    title: "M127/M126 Touch-Setter Air-Blow On/Off",
    body: "M127 activates the air-blow on the touch-setter to clear chips before measurement. M126 turns it off. Always issue M127 before approaching the touch-setter to ensure clean contact. Coolant and chips on the probe cause false readings.",
    category: "touch_setter",
    severity: "warning",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G13-TOOL-CHK.MIN",
    tags: ["touch-setter", "air-blow", "cleaning", "accuracy"],
    mcodes: ["M127", "M126"],
    code_example: `
M117                (ARM ADVANCE)
M127                (AIR BLOW ON - CLEAN PROBE)
G4 F3               (BLOW FOR 3 SECONDS)
M126                (AIR BLOW OFF)
G0 Z-5              (APPROACH PROBE)
G31 X10 F50         (PROBE TOUCH)
`,
  },
  {
    tip_id: "osp-ts-005",
    title: "G313 Auto Touch-Setter Measurement Cycle",
    body: "G313 is the canned cycle for automatic tool measurement with the touch-setter. It handles approach, touch, measurement, and offset update in a single call. Parameters specify which tool offset to update and measurement direction.",
    category: "touch_setter",
    severity: "info",
    confidence: 88,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G313-G14-CHK.MIN",
    tags: ["touch-setter", "measurement", "canned-cycle", "g313"],
    gcodes: ["G313"],
  },
  {
    tip_id: "osp-ts-006",
    title: "Tool Breakage Detection Tolerance Settings",
    body: "Set appropriate tolerance values for tool breakage detection. Typical values: DOK (detection OK) = 0.01mm for precision tools, 0.05mm for roughing tools. DNG (danger zone) = 1-2mm. If measured length differs from stored by more than DOK, trigger breakage alarm.",
    category: "touch_setter",
    severity: "best_practice",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G14-L-TOOL-CHK.MIN",
    tags: ["tolerance", "breakage", "detection", "setup"],
    parameters: {
      "DOK": "Detection OK tolerance (0.01-0.05mm typical)",
      "DNG": "Danger zone distance (1-2mm typical)",
    },
  },
];

// ============================================================================
// THREAD MILLING TIPS
// ============================================================================

const THREAD_MILL_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-tm-001",
    title: "G138/G136 Special Coordinates for Thread Milling",
    body: "G138 enables special coordinate mode for thread milling on Okuma mill-turn machines. G136 cancels it. In G138 mode, the control interprets coordinates differently for helical interpolation. Always pair with M147 (milling mode) for thread milling operations.",
    category: "thread_mill",
    severity: "critical",
    confidence: 92,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "THREAD-MILL-ID-OD.MIN",
    tags: ["thread-mill", "coordinates", "helical", "interpolation"],
    gcodes: ["G138", "G136"],
    code_example: `
M110                (C-AXIS ON)
G138                (SPECIAL COORDINATES ON)
M147                (MILLING MODE ON)
G17                 (XY PLANE FOR MILLING)
(THREAD MILLING OPERATIONS)
G18                 (BACK TO XZ PLANE)
M146                (MILLING MODE OFF)
G136                (SPECIAL COORDINATES OFF)
M109                (C-AXIS OFF)
`,
  },
  {
    tip_id: "osp-tm-002",
    title: "G20 HP=4 Plane Selection for Thread Milling",
    body: "G20 HP=4 selects the appropriate working plane for thread milling operations. The HP parameter specifies the plane type for helical interpolation. This is Okuma-specific syntax not found on Fanuc controllers.",
    category: "thread_mill",
    severity: "info",
    confidence: 85,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "THREAD-MILL-ID-OD.MIN",
    tags: ["thread-mill", "plane", "selection"],
    gcodes: ["G20"],
    parameters: {
      "HP": "Plane selection parameter (HP=4 for thread milling)",
    },
  },
  {
    tip_id: "osp-tm-003",
    title: "VDNRX/VDNRZ Tool Nose Radius Arrays",
    body: "VDNRX[n] and VDNRZ[n] are arrays containing tool nose radius values in X and Z directions for each tool ID. Used in thread milling calculations to determine actual cutting diameter. Access with calculated tool ID: V199=[VTDIN*10000]+VTDTN.",
    category: "thread_mill",
    severity: "info",
    confidence: 88,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "THREAD-MILL-ID-OD.MIN",
    tags: ["tool-data", "nose-radius", "compensation", "arrays"],
    variables: {
      "VDNRX[n]": "Tool nose radius X-direction for tool ID n",
      "VDNRZ[n]": "Tool nose radius Z-direction for tool ID n",
      "VTDIN": "Tool data index number",
      "VTDTN": "Tool number in turret",
    },
    code_example: `
V199=[VTDIN*10000]+VTDTN    (CALCULATE TOOL ID)
V198=VDNRX[V199]            (GET X NOSE RADIUS)
V197=VDNRZ[V199]            (GET Z NOSE RADIUS)
IF[V198 GE V197] NV198
V198=V197                   (USE LARGER RADIUS)
NV198 M808
CD=CD+[V198*2]              (ADJUST CUTTING DIAMETER)
`,
  },
  {
    tip_id: "osp-tm-004",
    title: "M147/M146 Milling Mode Enable/Disable",
    body: "M147 enables milling mode (Y-axis engaged for live tooling). M146 disables it. CRITICAL for thread milling: M147 must be active before any Y-axis interpolation. Always disable with M146 before returning to turning operations or C-axis index moves.",
    category: "thread_mill",
    severity: "critical",
    confidence: 95,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "THREAD-MILL-ID-OD.MIN",
    tags: ["milling-mode", "y-axis", "live-tooling", "enable"],
    mcodes: ["M147", "M146"],
    code_example: `
(START THREAD MILL)
G0 G90 G94 G17 X=XS+[CD/2]+[LR*2] Y=YS Z=ZS M147
G1 G17 X=XS+[CD/2]+LR Y=YS+LR Z=ZS F=FD*2
(HELICAL THREAD CUTTING)
G3 Z=VSIOZ-[PT/4] Y=YS X=XS+[CD/2] L=LR F=FD
(EXIT)
G0 G18 Z=ZS M146
`,
  },
  {
    tip_id: "osp-tm-005",
    title: "VSIOZ Current Z Position Variable",
    body: "VSIOZ returns the current servo input position of the Z-axis in real-time. Essential for thread milling loops where you need to track Z progress during helical interpolation. Use in conditional loops: IF [VSIOZ GE ZF] NCUT1.",
    category: "thread_mill",
    severity: "info",
    confidence: 92,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "THREAD-MILL-ID-OD.MIN",
    tags: ["position", "z-axis", "servo", "real-time"],
    variables: {
      "VSIOZ": "Servo input position Z-axis",
      "VSIOX": "Servo input position X-axis",
      "VSIOY": "Servo input position Y-axis",
      "VSIOC": "Servo input position C-axis",
    },
    code_example: `
NCUT1 G2 Z=VSIOZ-[PT/2] Y=YS X=XS-[CD/2] L=CD/2
Z=VSIOZ-[PT/2] Y=YS X=XS+[CD/2] L=CD/2
M331
IF [VSIOZ GE ZF] NCUT1    (LOOP UNTIL DEPTH REACHED)
`,
  },
  {
    tip_id: "osp-tm-006",
    title: "OD Thread Milling Subroutine Pattern",
    body: "The OTHOD (OD Thread Helical) subroutine pattern performs external thread milling. It calculates tool compensation from nose radius, approaches with lead-in arc, executes helical G2/G3 moves for thread form, and exits with lead-out arc. Parameters: XS, YS, ZS (start), ZF (finish), CD (diameter), PT (pitch), FD (feed), LR (lead arc radius).",
    category: "thread_mill",
    severity: "best_practice",
    confidence: 90,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "THREAD-MILL-ID-OD.MIN",
    tags: ["thread-mill", "subroutine", "od-thread", "helical"],
    code_example: `
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
    parameters: {
      "XS": "X-start position",
      "YS": "Y-start position (usually 0)",
      "ZS": "Z-start position (bottom of thread)",
      "ZF": "Z-finish depth position",
      "FD": "Feed rate IPR",
      "CD": "Thread minor diameter",
      "PT": "Thread pitch",
      "LR": "Lead in/out arc radius",
    },
  },
];

// ============================================================================
// USER ALARMS TIPS
// ============================================================================

const USER_ALARM_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-ua-001",
    title: "VUACM User Alarm Character Message Lines",
    body: "VUACM[1] through VUACM[10] are user alarm character message variables. Set these before triggering VDOUT alarm outputs to display descriptive messages on the control screen. VUACM[1] is line 1 (typically category), VUACM[10] is often used for the detail line.",
    category: "user_alarms",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Alarm-Smpl.min",
    tags: ["alarm", "message", "display", "user-interface"],
    variables: {
      "VUACM[1]": "Alarm message line 1 (max ~20 chars)",
      "VUACM[2]": "Alarm message line 2",
      "VUACM[10]": "Additional detail message line",
    },
    code_example: `
(TRIGGER USER ALARM WITH MESSAGE)
VUACM[1]='TOOL LIFE'
VUACM[10]=' NG'
VDOUT[992]=1          (TRIGGER ALARM OUTPUT)
`,
  },
  {
    tip_id: "osp-ua-002",
    title: "VDOUT[990-999] Alarm Trigger Outputs",
    body: "VDOUT[990] through VDOUT[999] are digital outputs reserved for user alarm triggers. Set VDOUT[990]=1 for general alarms, VDOUT[992]=1 for tool alarms, VDOUT[991]=1 for safety alarms. The control stops and displays the VUACM messages when these are triggered.",
    category: "user_alarms",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Alarm-Smpl.min, Manual Pages.pdf",
    tags: ["alarm", "output", "trigger", "stop"],
    variables: {
      "VDOUT[990]": "General user alarm trigger",
      "VDOUT[991]": "Safety alarm trigger",
      "VDOUT[992]": "Tool alarm trigger",
    },
    code_example: `
(DIFFERENT ALARM TYPES)
(GENERAL ALARM)
VUACM[1]='PROCESS ERROR'
VDOUT[990]=1

(TOOL ALARM)
VUACM[1]='TOOL LIFE NG'
VDOUT[992]=1

(SAFETY ALARM)
VUACM[1]='DOOR OPEN'
VDOUT[991]=1
`,
  },
  {
    tip_id: "osp-ua-003",
    title: "Feed Rate Override Check with Alarm",
    body: "Use VORD[0023] to check if feed rate override is at 100%. If not, display an alarm message. This is useful for ensuring consistent cycle times and preventing operators from running at reduced feed rates that affect production schedules.",
    category: "user_alarms",
    severity: "warning",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Alarm-Smpl.min",
    tags: ["feed-rate", "override", "check", "production"],
    variables: {
      "VORD[0023]": "Feed rate override status (1 = 100%)",
    },
    code_example: `
IF[VORD[0023] NE 1] GOTO NALM
(CONTINUE NORMAL OPERATION)
GOTO NCONTINUE

NALM VUACM[1]='FEED RATE'
VUACM[10]=' <100%'
VDOUT[990]=1
NCONTINUE
`,
  },
  {
    tip_id: "osp-ua-004",
    title: "Clear User Alarm After Resolution",
    body: "After the alarm condition is resolved, set VDOUT[99x]=0 to clear the alarm state. If the alarm was triggered in a loop, make sure the clear happens outside the loop or the alarm will immediately re-trigger.",
    category: "user_alarms",
    severity: "info",
    confidence: 88,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Alarm-Smpl.min",
    tags: ["alarm", "clear", "reset"],
    code_example: `
(ALARM CLEAR SEQUENCE)
VUACM[1]=''           (CLEAR MESSAGE)
VUACM[10]=''
VDOUT[992]=0          (CLEAR ALARM OUTPUT)
`,
  },
  {
    tip_id: "osp-ua-005",
    title: "Concatenating Variable Values in Alarm Messages",
    body: "You can concatenate variable values with text strings in VUACM messages to show dynamic information like tool numbers or measured values. Use the + operator: VUACM[1]='TOOL '+CT1 where CT1 is a numeric variable.",
    category: "user_alarms",
    severity: "info",
    confidence: 85,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Alarm-Smpl.min",
    tags: ["alarm", "message", "dynamic", "variables"],
    code_example: `
(DYNAMIC ALARM MESSAGE)
CT1=5                 (TOOL GROUP WITH PROBLEM)
VUACM[1]='TOOL GROUP'
VUACM[2]=CT1          (SHOWS "5")
VUACM[10]='LIFE EXPIRED'
VDOUT[992]=1
`,
  },
];

// ============================================================================
// PROBING AND DATA I/O TIPS
// ============================================================================

const PROBING_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-pr-001",
    title: "G31 Skip Function for Probing",
    body: "G31 is the skip function that stops feed motion when the probe signal is received. Move the probe toward the surface at feed rate; when contact is made, motion stops and skip position variables are populated. Essential for all custom probing routines.",
    category: "probing",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P200", "P300", "P500"],
    source: "PROBE.SSB",
    tags: ["probing", "skip", "touch", "measurement"],
    gcodes: ["G31"],
    code_example: `
(PROBE Z SURFACE)
G0 Z10                (POSITION ABOVE SURFACE)
G31 Z-5 F100          (FEED DOWN UNTIL SKIP)
ZTOUCH=VPSKZ          (STORE SKIP POSITION)
G0 Z10                (RETRACT)
`,
  },
  {
    tip_id: "osp-pr-002",
    title: "VPSKX/VPSKZ/VPSKY Probe Skip Position Variables",
    body: "After a G31 skip move, the skip (touch) positions are stored in VPSKX (X), VPSKZ (Z), and VPSKY (Y). These are the machine coordinates where probe contact occurred. Use these values for offset calculations and part measurement.",
    category: "probing",
    severity: "critical",
    confidence: 95,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "PROBE.SSB, Probing-Cycle-Instructions.doc",
    tags: ["probing", "position", "variables", "measurement"],
    variables: {
      "VPSKX": "Probe skip position X-axis",
      "VPSKZ": "Probe skip position Z-axis",
      "VPSKY": "Probe skip position Y-axis",
    },
    code_example: `
G31 X50 F50           (PROBE TOWARD PART OD)
XMEASURED=VPSKX       (STORE X TOUCH POSITION)
DIAMETER=XMEASURED*2  (CALCULATE DIAMETER)
XERROR=DIAMETER-XNOMINAL
IF[ABS[XERROR] GT XTOL] NGALARM
`,
  },
  {
    tip_id: "osp-pr-003",
    title: "GET/PUT Commands for Data File Access",
    body: "GET and PUT commands allow reading from and writing to external data files. GET reads values from a file into variables, PUT writes variable values to a file. Essential for logging measurement data, storing offsets externally, or interfacing with quality systems.",
    category: "data_io",
    severity: "info",
    confidence: 88,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "DATA-TEST.MIN, RWGP from Special functions 1 ME32-095-R08a.pdf",
    tags: ["data", "file", "read", "write", "logging"],
    code_example: `
(WRITE MEASUREMENT DATA TO FILE)
PUT MD1/MEAS-DATA.CSV
VTIME
VPSKZ
XMEASURED
DIAMETER
END

(READ MASTER OFFSETS FROM FILE)
GET MD1/MASTER-OFFSETS.CSV
XMASTER
ZMASTER
END
`,
  },
  {
    tip_id: "osp-pr-004",
    title: "M216/M215 Rapid Feed Override Control",
    body: "M216 ignores rapid feed override (runs at programmed rapid regardless of dial). M215 re-enables rapid override control. Use M216 for probing sequences where you need consistent approach speeds, then M215 to restore normal operation.",
    category: "probing",
    severity: "info",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "PROBE.SSB",
    tags: ["rapid", "override", "probing", "speed"],
    mcodes: ["M216", "M215"],
    code_example: `
NSTT M216             (RAPID FEED IGNORE)
G0 Z10                (CONSISTENT APPROACH)
G31 Z-2 F100          (PROBE TOUCH)
(MEASUREMENT LOGIC)
M215                  (RAPID FEED OVERRIDE ON)
G0 Z50                (NORMAL RETRACT)
`,
  },
];

// ============================================================================
// VARIABLE LOST MOTION COMPENSATION TIPS
// ============================================================================

const VARIABLE_MOTION_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-vm-001",
    title: "VLMCX/VLMCZ/VLMCY Lost Motion Compensation Variables",
    body: "VLMCX, VLMCZ, and VLMCY are system variables for lost motion (backlash) compensation per axis. These can be adjusted dynamically during a program to compensate for position-dependent backlash or thermal drift. Values are typically 0.001-0.010mm.",
    category: "variable_motion",
    severity: "info",
    confidence: 85,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LE32-164-R08a.pdf",
    tags: ["lost-motion", "backlash", "compensation", "precision"],
    variables: {
      "VLMCX": "Lost motion compensation X-axis",
      "VLMCZ": "Lost motion compensation Z-axis",
      "VLMCY": "Lost motion compensation Y-axis",
    },
  },
  {
    tip_id: "osp-vm-002",
    title: "G268/G269 Variable Lost Motion Enable/Disable",
    body: "G268 enables variable lost motion compensation. G269 disables it. When enabled, the compensation values in VLMCX/VLMCZ are applied during direction reversals. Use for precision finishing operations where backlash affects dimensional accuracy.",
    category: "variable_motion",
    severity: "info",
    confidence: 82,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "LE32-164-R08a.pdf",
    tags: ["lost-motion", "enable", "disable", "precision"],
    gcodes: ["G268", "G269"],
    code_example: `
(PRECISION FINISHING WITH LOST MOTION COMP)
G268                  (ENABLE LOST MOTION COMP)
VLMCX=0.005           (SET X COMPENSATION)
VLMCZ=0.003           (SET Z COMPENSATION)
(FINISH PASS OPERATIONS)
G269                  (DISABLE WHEN DONE)
`,
  },
];

// ============================================================================
// TIMING AND TIMER TIPS
// ============================================================================

const TIMING_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-ti-001",
    title: "VTIME Timer Variable for Custom Timing",
    body: "VTIME is a system variable that returns the current timer value in seconds. Can be used for custom dwell implementations, timeout logic, or cycle time measurement. Reset with VTIME=0 at the start of a section to measure elapsed time.",
    category: "timing",
    severity: "info",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "RE VTIME System Variables.msg",
    tags: ["timer", "time", "measurement", "dwell"],
    variables: {
      "VTIME": "Current timer value (seconds)",
    },
    code_example: `
VTIME=0               (RESET TIMER)
(OPERATION)
G0 X50 Z20
T0202
G0 X30 Z5
(CHECK ELAPSED TIME)
IF[VTIME GT 30] NTIMEOUT
GOTO NCONTINUE
NTIMEOUT
VUACM[1]='CYCLE TIME'
VUACM[10]='EXCEEDED'
M0
NCONTINUE
`,
  },
  {
    tip_id: "osp-ti-002",
    title: "VCYTM Cycle Time Variable",
    body: "VCYTM returns the current cycle time counter value. Unlike VTIME which is resettable, VCYTM tracks the running production cycle and is used for OEE calculations and production monitoring.",
    category: "timing",
    severity: "info",
    confidence: 88,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "FLIP-PART-TIME.MIN",
    tags: ["cycle-time", "production", "monitoring"],
    variables: {
      "VCYTM": "Cycle time counter (seconds)",
    },
  },
  {
    tip_id: "osp-ti-003",
    title: "VPWON Power-On Time Variable",
    body: "VPWON returns the total power-on time of the machine in hours. Useful for maintenance scheduling, logging, and tracking machine utilization over time.",
    category: "timing",
    severity: "info",
    confidence: 85,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "ARMROID-TEST.MIN",
    tags: ["power-on", "utilization", "maintenance"],
    variables: {
      "VPWON": "Power-on time (hours)",
    },
  },
];

// ============================================================================
// COOLANT AND SAFETY TIPS
// ============================================================================

const COOLANT_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-cl-001",
    title: "M8/M9 Coolant On/Off Standard Codes",
    body: "M8 activates flood coolant, M9 deactivates all coolant. These are universal across Okuma machines. SAFETY RULE: Always M9 before tool change, before C-axis operations, and before program end. Coolant spray during tool change can damage turret sensors.",
    category: "coolant",
    severity: "critical",
    confidence: 98,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P200", "P300", "P500"],
    source: "Pgm-Chk-Coolant-All.min.txt",
    tags: ["coolant", "flood", "safety"],
    mcodes: ["M8", "M9"],
    code_example: `
(PROPER COOLANT SEQUENCE)
G0 X30 Z5
T0101
G50 S2500
G96 S650 M3
G0 X22 Z2
M8                    (COOLANT ON - CUTTING ABOUT TO START)
G1 Z0 F0.012
(TURNING OPERATIONS)
G0 X50 Z20
M9                    (COOLANT OFF BEFORE TOOL CHANGE)
M5
T0202
`,
  },
  {
    tip_id: "osp-cl-002",
    title: "M50/M51 High-Pressure Coolant Control",
    body: "M50 activates high-pressure flood coolant (if equipped). M51 activates mist coolant. These are supplemental to M8/M9 and may vary by machine configuration. Check machine-specific documentation for pressure settings and flow rates.",
    category: "coolant",
    severity: "info",
    confidence: 85,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Pgm-Chk-Coolant-All.min.txt",
    tags: ["coolant", "high-pressure", "mist"],
    mcodes: ["M50", "M51"],
  },
  {
    tip_id: "osp-cl-003",
    title: "Air Blow Check Pattern",
    body: "Before critical operations (probing, touch-setter, sensitive measurements), check that air blow is working properly to clear chips. Use M127 (air on) with dwell, then M126 (air off). This ensures clean contact surfaces.",
    category: "coolant",
    severity: "warning",
    confidence: 90,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Pgm-Chk-Airblow-All.min.txt",
    tags: ["air-blow", "cleaning", "chips"],
    mcodes: ["M127", "M126"],
    code_example: `
(AIR BLOW CHECK BEFORE PROBE)
G0 X100 Z50           (CLEAR WORK ZONE)
M127                  (AIR BLOW ON)
G4 F3                 (BLOW FOR 3 SECONDS)
M126                  (AIR BLOW OFF)
M117                  (PROBE ARM ADVANCE)
`,
  },
];

// ============================================================================
// AXIS CONTROL AND COORDINATE TIPS
// ============================================================================

const AXIS_CONTROL_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-ax-001",
    title: "G13/G14 Coordinate System Selection",
    body: "G13 selects lathe (turning) coordinate system. G14 selects machining center (milling) coordinate system. CRITICAL for mill-turn machines: use G13 for all turning operations, G14 for milling/drilling. The coordinate interpretation changes completely between modes.",
    category: "axis_control",
    severity: "critical",
    confidence: 98,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G13-G14-CHK.MIN",
    tags: ["coordinates", "turning", "milling", "mode"],
    gcodes: ["G13", "G14"],
    code_example: `
(TURNING SECTION)
G13                   (LATHE COORDINATES)
G140                  (MODAL TURNING)
G0 X50 Z10
(TURNING OPERATIONS)

(MILLING SECTION)
G14                   (MACHINING CENTER COORDINATES)
G141                  (MODAL MILLING)
M110                  (C-AXIS ON)
G0 X50 Y0 Z10
(MILLING OPERATIONS)
`,
  },
  {
    tip_id: "osp-ax-002",
    title: "G140/G141 Modal Coordinate System",
    body: "G140 makes lathe coordinate system modal (stays in turning mode). G141 makes milling coordinate system modal. These persist across blocks until changed. Use with G13/G14 for explicit mode control.",
    category: "axis_control",
    severity: "info",
    confidence: 92,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "G13-G14-CHK.MIN",
    tags: ["coordinates", "modal", "persistent"],
    gcodes: ["G140", "G141"],
  },
  {
    tip_id: "osp-ax-003",
    title: "W-Axis Transfer Position Programming",
    body: "On machines with sub-spindle W-axis, use W coordinates for sub-spindle positioning. W-axis moves independently from Z-axis. Coordinate W-axis positions carefully during part transfer to avoid collisions with main spindle tooling.",
    category: "axis_control",
    severity: "critical",
    confidence: 90,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "W-Home Program Coordinates.MIN",
    tags: ["w-axis", "sub-spindle", "transfer", "positioning"],
    code_example: `
(SUB-SPINDLE APPROACH)
G0 W-100              (APPROACH MAIN SPINDLE)
M77                   (COLLET OPEN)
G0 W-50               (FINAL APPROACH)
G4 F0.5               (SETTLE)
M76                   (COLLET CLOSE)
(CUTOFF)
M77                   (RELEASE)
G0 W100               (RETRACT TO HOME)
`,
  },
  {
    tip_id: "osp-ax-004",
    title: "P Parameter for Turret Selection",
    body: "On dual-turret machines, append P10 (turret 1/upper) or P20 (turret 2/lower) to positioning commands to specify which turret should execute the move. Example: G0 X50 Z10 P10 moves upper turret.",
    category: "axis_control",
    severity: "critical",
    confidence: 92,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "bar-chk.min",
    tags: ["dual-turret", "turret-select", "positioning"],
    parameters: {
      "P10": "Upper turret / Turret 1 / A-turret",
      "P20": "Lower turret / Turret 2 / B-turret",
    },
    code_example: `
G0 X50 Z10 P10        (UPPER TURRET POSITION)
T0101 P10             (UPPER TURRET TOOL CALL)
G0 X80 Z30 P20        (LOWER TURRET POSITION)
T0101 P20             (LOWER TURRET TOOL CALL)
`,
  },
];

// ============================================================================
// SAFETY TIPS
// ============================================================================

const SAFETY_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-sf-001",
    title: "G50 S Speed Clamp Before CSS Mode",
    body: "CRITICAL SAFETY: Always issue G50 S[max_rpm] BEFORE activating G96 (Constant Surface Speed) mode. Without the speed clamp, the spindle will accelerate to machine maximum as the tool approaches center (X=0). This can cause catastrophic failure, especially on small diameters.",
    category: "safety",
    severity: "critical",
    confidence: 100,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P200", "P300", "P500"],
    source: "All fixture programs",
    tags: ["safety", "speed-clamp", "css", "critical"],
    gcodes: ["G50", "G96"],
    code_example: `
(CORRECT - SPEED CLAMP FIRST)
G50 S2500             (MAX 2500 RPM)
G96 S650 M3           (CSS AT 650 SFM)

(WRONG - DANGEROUS!)
G96 S650 M3           (NO SPEED CLAMP!)
G0 X0                 (SPINDLE WILL OVER-SPEED!)
`,
  },
  {
    tip_id: "osp-sf-002",
    title: "M5 Before Tool Change Mandatory",
    body: "ALWAYS issue M5 (spindle stop) before any tool change command. The turret indexing mechanism can be damaged if the spindle is rotating during tool change. Also issue M9 (coolant off) to prevent coolant from spraying into turret during index.",
    category: "safety",
    severity: "critical",
    confidence: 100,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P200", "P300", "P500"],
    source: "All fixture programs",
    tags: ["safety", "tool-change", "spindle-stop"],
    mcodes: ["M5", "M9"],
    code_example: `
(CORRECT TOOL CHANGE SEQUENCE)
G0 X50 Z20            (RETRACT)
M9                    (COOLANT OFF)
M5                    (SPINDLE STOP)
T0202                 (TOOL CHANGE - NOW SAFE)
`,
  },
  {
    tip_id: "osp-sf-003",
    title: "Retract Before Rapid Across Part",
    body: "Never rapid (G0) across the part face without first retracting to a safe X position. Okuma rapids are NOT straight lines - each axis moves at maximum rate independently. A diagonal rapid can crash through the part.",
    category: "safety",
    severity: "critical",
    confidence: 98,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P200", "P300", "P500"],
    source: "Shop best practice",
    tags: ["safety", "rapid", "retract", "collision"],
    code_example: `
(WRONG - DANGEROUS DIAGONAL RAPID)
G0 X5 Z-30            (FINISH BORE)
G0 X50 Z10            (DIAGONAL - MAY HIT PART!)

(CORRECT - SAFE RETRACT FIRST)
G0 X5 Z-30            (FINISH BORE)
G0 Z5                 (RETRACT Z FIRST)
G0 X50                (THEN MOVE X)
G0 Z10                (FINAL POSITION)
`,
  },
  {
    tip_id: "osp-sf-004",
    title: "Soft Limit Update Procedure",
    body: "When changing fixtures or work envelope, update soft limits to prevent axis overtravel. Use the Soft Limit Update macro to set new boundaries. Always verify limits with slow jog moves before running automatic cycle.",
    category: "safety",
    severity: "warning",
    confidence: 88,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Soft Limit Update.MIN",
    tags: ["soft-limit", "safety", "setup", "overtravel"],
  },
  {
    tip_id: "osp-sf-005",
    title: "Dwell After Spindle Stop Before C-Axis",
    body: "Always include a G4 dwell (minimum F1) after M5 and before M110 (C-axis enable). The spindle needs time to fully decelerate before transitioning to servo-controlled C-axis mode. Attempting C-axis engagement while spindle is still rotating causes faults.",
    category: "safety",
    severity: "critical",
    confidence: 95,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "hex-pins-mark.min",
    tags: ["safety", "dwell", "spindle", "c-axis"],
    code_example: `
(TRANSITION TO C-AXIS)
M5                    (SPINDLE STOP)
G4 F2                 (WAIT 2 SECONDS FOR DECELERATION)
M110                  (NOW SAFE TO ENABLE C-AXIS)
G0 C0                 (POSITION C-AXIS)
`,
  },
];

// ============================================================================
// ENGRAVING TIPS
// ============================================================================

const ENGRAVING_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-en-001",
    title: "Character Engraving Subroutine Structure",
    body: "Okuma supports character engraving via subroutines that define stroke patterns for each character. The Z-CHARACTERS.SSB library contains ASCII character definitions. Call characters by ASCII code or direct reference from the main program.",
    category: "engraving",
    severity: "info",
    confidence: 85,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Z-CHARACTERS.SSB, Check-Ltr-Num.min",
    tags: ["engraving", "characters", "subroutine", "marking"],
  },
  {
    tip_id: "osp-en-002",
    title: "Serial Number Increment Macro",
    body: "The NUMBERS.SSB subroutine library supports automatic serial number incrementing. Store the current serial number in a persistent variable, increment after each part, and call the appropriate digit subroutines for engraving.",
    category: "engraving",
    severity: "info",
    confidence: 82,
    machine_type: "lathe",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "NUMBERS.SSB, Number-test.min",
    tags: ["engraving", "serial-number", "automation", "increment"],
    code_example: `
(SERIAL NUMBER ENGRAVING)
SNUM=VC100            (LOAD PERSISTENT SERIAL NUMBER)
(ENGRAVE DIGITS)
CALL OENGRAVE SNUM=SNUM
(INCREMENT FOR NEXT PART)
VC100=VC100+1         (PERSISTENT - SURVIVES POWER OFF)
`,
  },
  {
    tip_id: "osp-en-003",
    title: "G132 Polar Coordinate Engraving on Cylindrical Surfaces",
    body: "G132 enables polar coordinate mode for engraving on cylindrical (OD) surfaces. Combined with C-axis positioning, allows text to wrap around the part circumference. Set character height and spacing relative to the circumference, not linear distance.",
    category: "engraving",
    severity: "info",
    confidence: 80,
    machine_type: "mill_turn",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "Engrave C-Z, G132/LET-NUM-OD-CZ.SSB",
    tags: ["engraving", "polar", "cylindrical", "od-engrave"],
    gcodes: ["G132"],
  },
];

// ============================================================================
// MULTI-SPINDLE TIPS
// ============================================================================

const MULTI_SPINDLE_TIPS: OkumaOSPTip[] = [
  {
    tip_id: "osp-ms-001",
    title: "M203/M204/M205 Sub-Spindle Rotation Control",
    body: "M203 starts sub-spindle CW, M204 starts CCW, M205 stops sub-spindle. These are independent of main spindle M3/M4/M5. For part transfer with synchronized handoff, ensure both spindles are at the same RPM and direction before engaging workpiece.",
    category: "multi_spindle",
    severity: "critical",
    confidence: 92,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "C-SYNC-2S.MIN",
    tags: ["sub-spindle", "rotation", "multi-spindle"],
    mcodes: ["M203", "M204", "M205"],
    code_example: `
(SYNCHRONIZED SPINDLE START)
M3 S1000              (MAIN SPINDLE CW 1000 RPM)
M203 S1000            (SUB SPINDLE CW 1000 RPM - MATCH!)
G4 F2                 (WAIT FOR SPEED STABILIZATION)
(PART TRANSFER)
`,
  },
  {
    tip_id: "osp-ms-002",
    title: "Synchronized Part Transfer Sequence",
    body: "For part transfer between main and sub spindle: 1) Match spindle speeds, 2) Position W-axis for approach, 3) Open sub collet M77, 4) Final approach, 5) Close sub collet M76, 6) Dwell for grip, 7) Open main chuck M84, 8) Retract W-axis, 9) Close main chuck M83.",
    category: "multi_spindle",
    severity: "critical",
    confidence: 95,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P300", "P500"],
    source: "BAR-CHECK.SSB, UNLOAD.SSB",
    tags: ["part-transfer", "synchronization", "handoff"],
    code_example: `
(PART TRANSFER SEQUENCE)
M3 S500               (MAIN SPINDLE)
M203 S500             (SUB SPINDLE - MATCHED)
G4 F2                 (SPEED STABILIZE)
G0 W-100              (SUB APPROACH)
M77                   (SUB COLLET OPEN)
G0 W-52               (GRIP POSITION)
M76                   (SUB COLLET CLOSE)
G4 F0.5               (GRIP CONFIRM)
M84                   (MAIN CHUCK OPEN)
G4 F0.3               (RELEASE CONFIRM)
G0 W50                (SUB RETRACT WITH PART)
M83                   (MAIN CHUCK CLOSE)
`,
  },
  {
    tip_id: "osp-ms-003",
    title: "Z-W Overlap Function for Cycle Time",
    body: "The Z-W Overlap function allows main Z-axis and sub W-axis to move simultaneously during part transfer operations. This reduces cycle time by overlapping motions that would otherwise be sequential. Enable with specific parameter settings.",
    category: "multi_spindle",
    severity: "info",
    confidence: 85,
    machine_type: "multitask",
    controller: "okuma_osp",
    osp_family: ["P500"],
    source: "Z-W Overlap/Z-W Overlap Function.docx",
    tags: ["cycle-time", "optimization", "overlap", "simultaneous"],
  },
];

// ============================================================================
// EXPORT ALL TIPS
// ============================================================================

export const OKUMA_OSP_PROGRAM_EXAMPLE_TIPS: OkumaOSPTip[] = [
  ...TOOL_LIFE_TIPS,
  ...C_AXIS_SYNC_TIPS,
  ...BAR_FEEDER_TIPS,
  ...TOUCH_SETTER_TIPS,
  ...THREAD_MILL_TIPS,
  ...USER_ALARM_TIPS,
  ...PROBING_TIPS,
  ...VARIABLE_MOTION_TIPS,
  ...TIMING_TIPS,
  ...COOLANT_TIPS,
  ...AXIS_CONTROL_TIPS,
  ...SAFETY_TIPS,
  ...ENGRAVING_TIPS,
  ...MULTI_SPINDLE_TIPS,
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get tips by category
 */
export function getOkumaTipsByCategory(category: OkumaOSPTip["category"]): OkumaOSPTip[] {
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter((tip) => tip.category === category);
}

/**
 * Get tips by severity
 */
export function getOkumaTipsBySeverity(severity: OkumaOSPTip["severity"]): OkumaOSPTip[] {
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter((tip) => tip.severity === severity);
}

/**
 * Get tips containing specific M-code
 */
export function getOkumaTipsByMCode(mcode: string): OkumaOSPTip[] {
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter(
    (tip) => tip.mcodes?.includes(mcode) || tip.mcodes?.includes(mcode.toUpperCase())
  );
}

/**
 * Get tips containing specific G-code
 */
export function getOkumaTipsByGCode(gcode: string): OkumaOSPTip[] {
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter(
    (tip) => tip.gcodes?.includes(gcode) || tip.gcodes?.includes(gcode.toUpperCase())
  );
}

/**
 * Get tips containing specific variable
 */
export function getOkumaTipsByVariable(variable: string): OkumaOSPTip[] {
  const upperVar = variable.toUpperCase();
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter((tip) => {
    if (!tip.variables) return false;
    return Object.keys(tip.variables).some((v) => v.toUpperCase().includes(upperVar));
  });
}

/**
 * Search tips by keyword in title or body
 */
export function searchOkumaTips(keyword: string): OkumaOSPTip[] {
  const lowerKeyword = keyword.toLowerCase();
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter(
    (tip) =>
      tip.title.toLowerCase().includes(lowerKeyword) ||
      tip.body.toLowerCase().includes(lowerKeyword) ||
      tip.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * Get critical safety tips (always review before running)
 */
export function getCriticalSafetyTips(): OkumaOSPTip[] {
  return OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.filter(
    (tip) => tip.severity === "critical" && (tip.category === "safety" || tip.tags.includes("safety"))
  );
}

// ============================================================================
// STATISTICS
// ============================================================================

export const OKUMA_OSP_TIPS_STATS = {
  total_tips: OKUMA_OSP_PROGRAM_EXAMPLE_TIPS.length,
  by_category: {
    tool_life: getOkumaTipsByCategory("tool_life").length,
    c_axis_sync: getOkumaTipsByCategory("c_axis_sync").length,
    bar_feeder: getOkumaTipsByCategory("bar_feeder").length,
    touch_setter: getOkumaTipsByCategory("touch_setter").length,
    thread_mill: getOkumaTipsByCategory("thread_mill").length,
    user_alarms: getOkumaTipsByCategory("user_alarms").length,
    probing: getOkumaTipsByCategory("probing").length,
    variable_motion: getOkumaTipsByCategory("variable_motion").length,
    timing: getOkumaTipsByCategory("timing").length,
    coolant: getOkumaTipsByCategory("coolant").length,
    axis_control: getOkumaTipsByCategory("axis_control").length,
    safety: getOkumaTipsByCategory("safety").length,
    engraving: getOkumaTipsByCategory("engraving").length,
    multi_spindle: getOkumaTipsByCategory("multi_spindle").length,
  },
  by_severity: {
    critical: getOkumaTipsBySeverity("critical").length,
    warning: getOkumaTipsBySeverity("warning").length,
    info: getOkumaTipsBySeverity("info").length,
    best_practice: getOkumaTipsBySeverity("best_practice").length,
  },
  source_files_referenced: [
    "LIFE-TEST.MIN",
    "LIFE-CHECK.SSB",
    "C-SYNC-1S.MIN",
    "C-SYNC-2S.MIN",
    "OBAR.SSB",
    "bar-chk.min",
    "BAR-CHECK.SSB",
    "THREAD-MILL-ID-OD.MIN",
    "Alarm-Smpl.min",
    "PROBE.SSB",
    "G313-TOOL-CHK.MIN",
    "LE32-164-R08a.pdf",
    "Z-CHARACTERS.SSB",
    "NUMBERS.SSB",
    "Z-W Overlap Function.docx",
  ],
  extraction_date: "2026-04-15",
  controller_family: "Okuma OSP-P200/P300/P500",
};
