/**
 * Okuma OSP Dialect Knowledge Base — Static Tips
 *
 * Comprehensive G-code, M-code, variable, and programming pattern knowledge
 * for Okuma OSP-P300L and OSP-P500L controllers, mined from real production
 * programs and cross-referenced with Okuma programming manuals.
 *
 * Categories:
 *   gcode        — G-code definitions with Okuma-specific behavior
 *   mcode        — M-code definitions and sequences
 *   variable     — V/VC variable scope and naming conventions
 *   subroutine   — /CALL, /GOTO, label patterns
 *   safety       — Safety-critical programming rules
 *   dialect_diff — Where Okuma differs from Fanuc/Haas
 *   cycle        — Canned cycle patterns (G85, G87, G71, G74)
 *   caxis        — C-axis and live tooling patterns
 *   barfeeder    — Bar feeder loop and handshake patterns
 *   threading    — G71 threading specifics
 *   tooling      — NAT labels, 6-digit T-codes, speed modes
 *   graphics     — DEF WORK, PS LC, DRAW blocks
 *   macro        — Macro programming, IF/GOTO, expressions
 *
 * @module okuma-dialect-knowledge
 */

export type OkumaKnowledgeCategory =
  | "gcode"
  | "mcode"
  | "variable"
  | "subroutine"
  | "safety"
  | "dialect_diff"
  | "cycle"
  | "caxis"
  | "barfeeder"
  | "threading"
  | "tooling"
  | "graphics"
  | "macro";

export interface OkumaDialectTip {
  id: string;
  title: string;
  body: string;
  category: OkumaKnowledgeCategory;
  tags: string[];
  osp_family: ("P200" | "P300" | "P500")[];
  operation_types?: string[];
  machine_types?: ("lathe" | "mill_turn" | "multitask")[];
  confidence: number;
  source: string;
  gcodes?: string[];
  mcodes?: string[];
  parameters?: Record<string, string>;
}

// ============================================================================
// G-CODE KNOWLEDGE
// ============================================================================

const GCODE_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_g0",
    title: "G0 — Rapid Positioning",
    body: "Rapid traverse to position. Accepts X, Z for turning. When C-axis is active (M110/G138), also accepts C for angular positioning. Okuma rapids are NOT necessarily straight lines — machine moves each axis at max rate independently. Always retract to safe position (X20 Z20) before rapids across the part.",
    category: "gcode",
    tags: ["rapid", "positioning", "motion"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G0"],
    confidence: 100,
    source: "OSP-P300L Programming Manual + shop programs",
  },
  {
    id: "okuma_g1",
    title: "G1 — Linear Interpolation (Feed Move)",
    body: "Linear cutting move at programmed feed rate. Accepts X, Z, F (feed per rev in G95 mode). Unique to Okuma: A parameter for angular moves. A135 = move at 135 degrees (measured from +Z axis). A175 = near-parallel to Z axis. This replaces explicit X/Z endpoint calculation for tapers and chamfers.",
    category: "gcode",
    tags: ["linear", "feed", "cutting", "angular"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G1"],
    parameters: {
      "A": "Angular move direction in degrees from +Z axis (Okuma-specific)",
      "F": "Feed rate (per-rev in G95, per-min in G94)",
      "X": "X endpoint (diameter)",
      "Z": "Z endpoint",
    },
    confidence: 100,
    source: "OSP-P300L Programming Manual + A-6266.min, hex-pins-mark.min",
  },
  {
    id: "okuma_g2_g3",
    title: "G2/G3 — Circular Interpolation (Arcs)",
    body: "CW/CCW arcs. CRITICAL DIFFERENCE from Fanuc: Okuma uses L for arc radius (NOT R). Format: G2 X_ Z_ L_ or G3 X_ Z_ L_. L is the radius value. Also supports I/K incremental center offsets (same as Fanuc). When using I/K, they are INCREMENTAL from arc start point, not absolute. Shop preference: L for simple arcs, I/K for complex profiles.",
    category: "gcode",
    tags: ["arc", "circular", "radius", "L-word"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G2", "G3"],
    parameters: {
      "L": "Arc radius (Okuma-specific, replaces Fanuc R word)",
      "I": "Incremental X center offset from start point",
      "K": "Incremental Z center offset from start point",
    },
    confidence: 100,
    source: "OSP-P300L Manual + 460A20-0154-3.min, PFT-30315A-31.min",
  },
  {
    id: "okuma_g4",
    title: "G4 — Dwell",
    body: "Dwell (pause) at current position. CRITICAL DIFFERENCE: Okuma G4 F2 = dwell 2 SECONDS. Fanuc G4 P2000 = dwell 2 seconds (P in milliseconds). The F word on Okuma dwell is seconds, NOT the feed rate. Common usage: G4 F2 after cutoff to let part clear, G4 F0.5 before threading pass for spindle speed stabilization.",
    category: "gcode",
    tags: ["dwell", "pause", "timing"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G4"],
    parameters: {
      "F": "Dwell time in SECONDS (not milliseconds like Fanuc P)",
    },
    confidence: 100,
    source: "OSP-P300L Manual + A-6266.min (G4 F2 after cutoff)",
  },
  {
    id: "okuma_g50",
    title: "G50 S — Spindle Speed Clamp (Max RPM)",
    body: "Sets maximum spindle RPM for CSS mode (G96). SAFETY CRITICAL — without G50, the spindle will accelerate to machine max as the tool approaches center (X0). Standard shop values: G50 S2500 for OD work, G50 S3000 for small-diameter ID work, G50 S1800 for bar feeder operations. MUST appear before G96 in every tool section. Multiple G50 values per program are common (different limits per operation).",
    category: "gcode",
    tags: ["safety", "speed-clamp", "css", "max-rpm"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G50"],
    parameters: {
      "S": "Maximum spindle RPM (typical: 1800-3500)",
    },
    operation_types: ["od_rough", "od_finish", "id_rough", "id_finish", "groove", "cutoff", "thread"],
    confidence: 100,
    source: "OSP-P300L Safety Manual + all fixture programs",
  },
  {
    id: "okuma_g74",
    title: "G74 — Peck Drilling Cycle",
    body: "Peck drilling with retract. Okuma G74 uses D for peck depth and L for retract amount. Format: G74 Z-[depth] D[peck] L[retract] F[feed]. D value is the peck increment. L is how far to retract between pecks (typically 1-2mm / 0.040-0.080 inch). For deep holes (>3xD), use smaller peck depths. First peck can be larger (1xD), subsequent 0.5xD.",
    category: "gcode",
    tags: ["drilling", "peck", "canned-cycle"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G74"],
    parameters: {
      "D": "Peck depth increment",
      "L": "Retract amount between pecks",
      "F": "Feed rate (per-rev)",
      "Z": "Final hole depth",
    },
    operation_types: ["drill", "peck_drill"],
    confidence: 100,
    source: "OSP-P300L Manual + 460A20-0154-3.min",
  },
  {
    id: "okuma_g80",
    title: "G80 — Canned Cycle Cancel",
    body: "Cancels all active canned cycles (G74, G85, G87, G71). MUST be issued after every cycle before the next tool section or rapid move. Omitting G80 can cause unexpected repeated cycle motions on the next G0/G1.",
    category: "gcode",
    tags: ["cycle-cancel", "safety"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G80"],
    confidence: 100,
    source: "OSP-P300L Manual + all fixture programs",
  },
  {
    id: "okuma_g85",
    title: "G85 — Roughing Cycle (OD/ID Profile)",
    body: "Okuma's profile roughing cycle. Format: G85 NLABEL D[doc] U[finish_x] W[finish_z] F[feed]. NLABEL references a profile defined by G81 label. D = depth of cut per pass. U = radial finish allowance. W = axial finish allowance. F = roughing feed rate. The cycle automatically generates multiple passes to rough the profile, leaving U/W stock for finishing with G87. Typical values: D=0.06-0.10 (steel), U=0.003-0.010, W=0.003-0.005.",
    category: "cycle",
    tags: ["roughing", "profile", "canned-cycle", "turning"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G85"],
    parameters: {
      "NLABEL": "Profile label name (e.g., NTURN, NBORE, NR001)",
      "D": "Depth of cut per pass (radial, diameter value)",
      "U": "Finish allowance X (radial, diameter value)",
      "W": "Finish allowance Z (axial)",
      "F": "Feed rate (per-rev)",
    },
    operation_types: ["od_rough", "id_rough"],
    confidence: 100,
    source: "OSP-P300L Manual + 460A20-0154-3.min, WAFER-ID-PRO.min",
  },
  {
    id: "okuma_g87",
    title: "G87 — Finishing Cycle (Profile Follow)",
    body: "Profile finishing cycle that follows the exact contour defined by G81 label. Format: G87 NLABEL F[feed]. Runs at the finish feed rate along the previously defined profile (which was roughed by G85). The profile includes all arcs and tapers. Does NOT leave any stock — cuts to final dimension. Always use after G85 roughing of the same profile.",
    category: "cycle",
    tags: ["finishing", "profile", "canned-cycle", "turning"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G87"],
    parameters: {
      "NLABEL": "Same profile label used in G85",
      "F": "Finish feed rate (per-rev, typically 50-70% of rough feed)",
    },
    operation_types: ["od_finish", "id_finish"],
    confidence: 100,
    source: "OSP-P300L Manual + fixture programs",
  },
  {
    id: "okuma_g81",
    title: "G81 — Profile Label Definition",
    body: "Marks the start of a profile definition used by G85/G87 cycles. Format: NLABEL G81 followed by profile point sequence (G0/G1/G2/G3 moves). The profile ends at the last move before G80. Labels follow convention: NTURN for OD profiles, NBORE for ID profiles, NR001/NR002 for numbered profiles. The profile must be a continuous toolpath — no rapids allowed within the profile definition.",
    category: "cycle",
    tags: ["profile", "label", "definition"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G81"],
    confidence: 95,
    source: "OSP-P300L Manual + 460A20-0154-3.min, A-6266.min",
  },
  {
    id: "okuma_g96_g97",
    title: "G96/G97 — CSS vs Direct RPM",
    body: "G96 S[sfm] = Constant Surface Speed mode. Spindle RPM varies with diameter to maintain constant cutting speed. ALWAYS pair with G50 S[max] for safety. G97 S[rpm] = Direct RPM mode. Fixed spindle speed regardless of diameter. Use for drilling, tapping, threading. Shop pattern: G96 for all turning operations (OD/ID rough/finish), G97 for drills, center drills, threading. Never use G96 for drilling — the RPM calculation assumes turning diameter, not drill diameter.",
    category: "gcode",
    tags: ["css", "rpm", "spindle", "speed"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G96", "G97"],
    operation_types: ["od_rough", "od_finish", "id_rough", "id_finish", "drill", "thread"],
    confidence: 100,
    source: "OSP-P300L Manual + all fixture programs",
  },
  {
    id: "okuma_g95_g94",
    title: "G95/G94 — Feed Per Rev vs Feed Per Minute",
    body: "G95 = feed per revolution (in/rev or mm/rev). Standard for all turning operations. G94 = feed per minute (in/min or mm/min). Used for milling with live tooling and some drilling operations. Shop standard: G95 for 90%+ of operations. G94 only for live tooling milling operations where feed-per-rev doesn't apply (tool rotating, not spindle).",
    category: "gcode",
    tags: ["feed", "per-rev", "per-min"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G95", "G94"],
    confidence: 100,
    source: "OSP-P300L Manual + hex-pins-mark.min (G94 for live tool)",
  },
  {
    id: "okuma_g138_g136",
    title: "G138/G136 — C-Axis Enable/Disable",
    body: "G138 enables C-axis interpolation mode. G136 disables it. When G138 is active, C-axis becomes a synchronized interpolation axis (not just indexing). Required for milling operations on lathe. Sequence: M110 (C-axis on) → G138 (interpolation mode) → milling operations → G136 (cancel interpolation) → M109 (C-axis off). G138 alone doesn't turn on C-axis — M110 must come first.",
    category: "caxis",
    tags: ["c-axis", "interpolation", "live-tooling"],
    osp_family: ["P300", "P500"],
    gcodes: ["G138", "G136"],
    machine_types: ["mill_turn", "multitask"],
    confidence: 95,
    source: "OSP-P300L Manual + hex-pins-mark.min",
  },
  {
    id: "okuma_g119",
    title: "G119 — Spindle Orient / C-Axis Position",
    body: "Orients the spindle to a specific angular position for C-axis work. Used before engaging C-axis mode. Format: G119 C[angle]. The spindle decelerates to zero RPM and locks at the specified angle. Must be issued before M110/G138 sequence. Also used for oriented tool change on some machines.",
    category: "caxis",
    tags: ["spindle-orient", "c-axis", "positioning"],
    osp_family: ["P300", "P500"],
    gcodes: ["G119"],
    confidence: 90,
    source: "OSP-P300L Manual + hex-pins-mark.min",
  },
  {
    id: "okuma_g76",
    title: "G76 — Arc with L Radius (Short Form)",
    body: "Short-form arc command used within profile definitions. G76 X_ L_ specifies an arc to X endpoint with radius L. Direction (CW/CCW) is inferred from context. Commonly seen in G85/G87 profile definitions. Equivalent to G2/G3 but shorter syntax for simple arcs.",
    category: "gcode",
    tags: ["arc", "profile", "short-form"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G76"],
    parameters: {
      "X": "Arc endpoint (diameter)",
      "L": "Arc radius",
    },
    confidence: 85,
    source: "fixture programs (460A20-0154-3.min line profiles)",
  },
];

// ============================================================================
// M-CODE KNOWLEDGE
// ============================================================================

const MCODE_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_m0_m1",
    title: "M0/M1 — Program Stop / Optional Stop",
    body: "M0 (M00) = mandatory program stop. Machine halts, operator must press cycle start to continue. M1 (M01) = optional stop. Only halts if the Optional Stop button is active on the control panel. Shop convention: M1 after every tool change for first-article inspection. M0 before critical operations (threading, cutoff). M1 count in a program indicates inspection discipline.",
    category: "mcode",
    tags: ["stop", "optional-stop", "safety", "inspection"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M0", "M00", "M1", "M01"],
    confidence: 100,
    source: "OSP-P300L Manual + all fixture programs",
  },
  {
    id: "okuma_m3_m4_m5",
    title: "M3/M4/M5 — Spindle CW/CCW/Stop",
    body: "M3 = spindle clockwise (standard for right-hand tools). M4 = spindle counter-clockwise (left-hand tools, reverse threading). M5 = spindle stop. SAFETY RULE: M5 MUST appear before program end (M2/M30) and before every tool change. Failure to stop spindle before tool change can damage turret. M5 should also appear before any C-axis operations.",
    category: "mcode",
    tags: ["spindle", "rotation", "safety"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M3", "M4", "M5"],
    confidence: 100,
    source: "OSP-P300L Safety Manual + all fixture programs",
  },
  {
    id: "okuma_m8_m50_m51_m9",
    title: "M8/M50/M51/M9 — Coolant Control",
    body: "M8 = coolant on (generic). M50 = flood coolant on. M51 = mist coolant on. M9 = all coolant off. M13 = spindle CW + coolant on (combined). Shop practice: use M8 for standard flood. M51 for finishing passes (less thermal shock). Always M9 before tool change and program end. Coolant on/off count should be balanced.",
    category: "mcode",
    tags: ["coolant", "flood", "mist"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M8", "M9", "M13", "M50", "M51"],
    confidence: 100,
    source: "OSP-P300L Manual + fixture programs",
  },
  {
    id: "okuma_m12",
    title: "M12 — Feed Per Minute Override",
    body: "Forces feed rate interpretation to per-minute mode regardless of G95/G94 state. Used in special cases where a block needs mm/min feed while the rest of the program runs in per-rev mode. Rare — most programs use G94/G95 explicitly.",
    category: "mcode",
    tags: ["feed", "override"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M12"],
    confidence: 80,
    source: "OSP-P300L Manual",
  },
  {
    id: "okuma_m30_m2",
    title: "M30/M2 — Program End",
    body: "M30 = program end and rewind. Returns to program start. M2 = program end (no rewind on some controllers). Shop standard: always use M30. Sequence before M30: M5 (spindle stop) → M9 (coolant off) → G0 X20. Z20. (safe position) → M30. For bar feeder programs, M30 appears at the very end after the /GOTO loop exit condition.",
    category: "mcode",
    tags: ["program-end", "rewind"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M30", "M2"],
    confidence: 100,
    source: "OSP-P300L Manual + all fixture programs",
  },
  {
    id: "okuma_m32_m33",
    title: "M32/M33 — Threading Direction",
    body: "M32 = right-hand thread (standard). M33 = left-hand thread. Must be specified on the G71 threading line. Right-hand threads are ~95% of production work. Left-hand threads used for: left-hand jam nuts, turnbuckle ends, some pipe fittings. Always verify thread direction before running — wrong direction crashes the thread tool.",
    category: "threading",
    tags: ["threading", "direction", "right-hand", "left-hand"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M32", "M33"],
    operation_types: ["thread"],
    confidence: 100,
    source: "OSP-P300L Manual + A-6266.min",
  },
  {
    id: "okuma_m41_m42",
    title: "M41/M42 — Spindle Gear Range",
    body: "M41 = low gear range (high torque, lower max RPM). M42 = high gear range (lower torque, higher max RPM). Two-speed gearbox selection. Low gear: for heavy roughing, large diameters, high torque needs. High gear: for finishing, small diameters, high RPM needs. Gear change requires spindle stop. Not all Okuma lathes have two-speed gearboxes — newer machines are direct-drive.",
    category: "mcode",
    tags: ["gear", "spindle", "torque", "rpm"],
    osp_family: ["P200", "P300"],
    mcodes: ["M41", "M42"],
    confidence: 95,
    source: "OSP-P300L Manual + fixture programs",
  },
  {
    id: "okuma_m73_m75",
    title: "M73/M75 — Threading Compensation Codes",
    body: "M73 = threading with spring passes (chip formation compensation). Added to G71 line. M75 = threading with constant infeed (not compound angle). These modify how the threading cycle executes multiple passes. M73 adds extra spring passes at final depth for thread form accuracy. Shop standard: always use M73 for production threading.",
    category: "threading",
    tags: ["threading", "compensation", "spring-pass"],
    osp_family: ["P200", "P300", "P500"],
    mcodes: ["M73", "M75"],
    operation_types: ["thread"],
    confidence: 90,
    source: "OSP-P300L Manual + A-6266.min",
  },
  {
    id: "okuma_m110_m109",
    title: "M110/M109 — C-Axis On/Off",
    body: "M110 = enable C-axis mode. Spindle becomes a positioning axis. M109 = disable C-axis, return to spindle mode. Sequence for C-axis work: M5 (stop spindle) → M110 (C-axis on) → G138 (interpolation) → positioning/milling → G136 (cancel) → M109 (C-axis off) → M3 S[rpm] (restart spindle). C-axis operations use G94 (feed per minute) not G95.",
    category: "caxis",
    tags: ["c-axis", "enable", "disable", "live-tooling"],
    osp_family: ["P300", "P500"],
    mcodes: ["M110", "M109"],
    machine_types: ["mill_turn", "multitask"],
    confidence: 95,
    source: "OSP-P300L Manual + hex-pins-mark.min",
  },
  {
    id: "okuma_m146_m147",
    title: "M146/M147 — C-Axis Lock/Unlock",
    body: "M146 = lock C-axis (hold position). M147 = unlock C-axis (allow movement). Used during tool changes when C-axis is active — lock prevents unwanted rotation during turret index. Also used when transitioning between C-axis positions: M146 (lock) → tool change → M147 (unlock) → G0 C[angle] (move to next position).",
    category: "caxis",
    tags: ["c-axis", "lock", "unlock", "tool-change"],
    osp_family: ["P300", "P500"],
    mcodes: ["M146", "M147"],
    machine_types: ["mill_turn", "multitask"],
    confidence: 90,
    source: "hex-pins-mark.min patterns",
  },
];

// ============================================================================
// VARIABLE KNOWLEDGE
// ============================================================================

const VARIABLE_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_var_local",
    title: "V1-V100 — Local Variables",
    body: "Local variables are program-specific. Cleared when program starts. Convention from shop macros: V1-V10 = part dimensions (stock dia, finish OD, finish ID, part length). V20-V30 = drill parameters (dia, SFM, feed, peck, point angle). V35-V38 = stock allowances (OD/ID radial/axial). V40-V44 = depth of cut values. V45-V56 = speeds and feeds per operation. V60-V66 = clearances, RPM limits, safe positions. V70+ = calculated RPM values (V70 = V45*3.82/V1 etc.).",
    category: "variable",
    tags: ["variable", "local", "macro", "parametric"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 95,
    source: "BASIC-CASING.MIN, BASE WAFER INSERT MACRO.min patterns",
  },
  {
    id: "okuma_var_common",
    title: "VC100+ — Common (Global) Variables",
    body: "Common variables (VC100-VC999) persist across programs and power cycles. Used for: machine-level settings (VC100-VC110 = custom offsets), part counters (VC200 = parts made), batch settings (VC300 = batch quantity). CAUTION: changing a VC variable in one program affects ALL programs that use it. Convention: VC100-VC199 = machine setup, VC200-VC299 = counters, VC300+ = shared parameters.",
    category: "variable",
    tags: ["variable", "common", "global", "persistent"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 90,
    source: "OSP-P300L Manual + shop macro programs",
  },
  {
    id: "okuma_var_expressions",
    title: "Variable Arithmetic Expressions",
    body: "Okuma supports arithmetic in brackets: V70=[V45*3.82]/V1 calculates RPM from SFM. Operators: +, -, *, / (no exponent). Functions: SIN, COS, TAN, ATAN, SQRT, ABS, INT, FIX, FUP, ROUND. Example RPM calc: V70 = [V45 * 3.82] / V1 where V45=SFM, V1=diameter. Metric: V70 = [V45 * 1000] / [3.14159 * V1]. Always use 3.82 for imperial SFM→RPM (not 3.8197 — shop convention).",
    category: "macro",
    tags: ["arithmetic", "expression", "calculation", "rpm"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 90,
    source: "OSP-P300L Manual + macro programs",
  },
];

// ============================================================================
// SUBROUTINE & BRANCHING KNOWLEDGE
// ============================================================================

const SUBROUTINE_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_call",
    title: "/CALL — Subroutine Call",
    body: "Calls a named subroutine within the same program. Format: /CALL ONAME where ONAME is a label defined elsewhere in the program. Common patterns: /CALL OBAR (bar feeder initialization), /CALL OCONT (continue after optional stop), /CALL OSUB1 (generic subroutine). Unlike Fanuc M98 which calls external programs, Okuma /CALL is always internal. The called routine returns at its end to the line after /CALL.",
    category: "subroutine",
    tags: ["subroutine", "call", "internal"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 95,
    source: "OSP-P300L Manual + bar feeder programs",
  },
  {
    id: "okuma_goto",
    title: "/GOTO — Unconditional Jump",
    body: "Jumps to a named label. Format: /GOTO NLABEL. Common patterns: /GOTO NBAR (loop back to bar feeder start), /GOTO NSTRT (restart program), /GOTO NEND (skip to end). Used with IF for conditional branching. Bar feeder loop: NBAR ... /GOTO NBAR creates the repeat loop. Exit condition: IF [VC200 GE V66] /GOTO NEND.",
    category: "subroutine",
    tags: ["goto", "jump", "branching", "loop"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 95,
    source: "OSP-P300L Manual + bar feeder programs",
  },
  {
    id: "okuma_if_goto",
    title: "IF/GOTO — Conditional Branching",
    body: "Conditional jump. Format: IF [condition] /GOTO NLABEL. Condition operators: EQ (equal), NE (not equal), GT (greater than), GE (greater or equal), LT (less than), LE (less or equal). Variables in conditions: IF [V1 GT 2.0] /GOTO NLARGE. Common patterns: IF [VC200 GE V66] /GOTO NEND (part counter check), IF [V3 EQ 0] /GOTO NSKIP (skip optional operation).",
    category: "macro",
    tags: ["conditional", "branching", "if-goto"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 90,
    source: "OSP-P300L Manual + macro programs",
  },
];

// ============================================================================
// SAFETY KNOWLEDGE
// ============================================================================

const SAFETY_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_safety_g50",
    title: "G50 S — MANDATORY for CSS Mode",
    body: "CRITICAL SAFETY: Every G96 (CSS) block MUST have a preceding G50 S[max_rpm]. Without it, approaching X0 (centerline) causes spindle acceleration toward machine maximum (3500-5000 RPM on most Okuma lathes). This WILL cause part ejection on bar work, tool breakage on ID operations, and potential operator injury. Shop rule: G50 S2500 minimum, adjust per operation. Programs without G50+G96 pairing should be flagged as DANGEROUS.",
    category: "safety",
    tags: ["safety", "critical", "g50", "css", "max-rpm"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "OSP-P300L Safety Manual + incident reports",
  },
  {
    id: "okuma_safety_retract",
    title: "Safe Retract Position Between Tools",
    body: "MANDATORY: Retract to safe position (G0 X20. Z20. typical) between every tool section. This ensures the turret can index without collision. X value must clear the largest diameter in the program. Z value must clear the chuck face and any fixturing. Shop standard: X20 Z20 for most work, X50 Z20 for large-diameter parts. Never index turret with tool still at cutting position.",
    category: "safety",
    tags: ["safety", "retract", "tool-change", "collision"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "Shop safety rules + all fixture programs",
  },
  {
    id: "okuma_safety_spindle_stop",
    title: "M5 Before Program End",
    body: "Spindle MUST be stopped (M5) before M30 program end. Also stop before any C-axis engagement (M110). If spindle is left running at program end, it continues spinning — operator reaching in to remove part risks entanglement. Program end sequence: M5 → M9 → G0 X20. Z20. → M30.",
    category: "safety",
    tags: ["safety", "spindle", "program-end"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "OSP-P300L Safety Manual",
  },
  {
    id: "okuma_safety_coolant",
    title: "Coolant Balance (On/Off Pairing)",
    body: "Every M8/M50/M51 (coolant on) should be matched with M9 (coolant off) before the next tool change and at program end. Leaving coolant on during tool change wastes coolant and can cause splash during turret index. Coolant must be off before C-axis work to prevent flooding the live tool spindle.",
    category: "safety",
    tags: ["safety", "coolant", "balance"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 95,
    source: "Shop safety rules",
  },
  {
    id: "okuma_safety_barfeeder_loop",
    title: "Bar Feeder Must Have Loop",
    body: "Bar feeder programs MUST have a /GOTO NBAR loop structure. Without it, the bar feeder feeds once and stops — wasting material and requiring manual restart for each part. Structure: NBAR label at loop start, /CALL OBAR for bar feed, machining operations, /GOTO NBAR at loop end. Exit condition via IF [counter] check.",
    category: "barfeeder",
    tags: ["safety", "bar-feeder", "loop", "automation"],
    osp_family: ["P200", "P300", "P500"],
    machine_types: ["lathe"],
    confidence: 95,
    source: "460A20-0154-3.min, hex-pins-mark.min",
  },
];

// ============================================================================
// DIALECT DIFFERENCES (Okuma vs Fanuc/Haas)
// ============================================================================

const DIALECT_DIFF_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_diff_g71",
    title: "G71 — Threading (NOT Roughing like Fanuc)",
    body: "CRITICAL DIFFERENCE: Okuma G71 is the THREADING cycle. Fanuc G71 is the roughing cycle. This is the #1 source of confusion when converting between dialects. Okuma G71 parameters: X (thread OD/ID), Z (thread end), B (thread angle, 60 for metric/UNC), D (first infeed depth), U (finish allowance), H (total thread depth), F (pitch), J (spring passes), M32/M33 (direction). Fanuc equivalent for threading: G76. Okuma equivalent for Fanuc G71 roughing: G85.",
    category: "dialect_diff",
    tags: ["threading", "g71", "fanuc", "confusion", "critical"],
    osp_family: ["P200", "P300", "P500"],
    operation_types: ["thread"],
    confidence: 100,
    source: "Cross-dialect comparison + A-6266.min threading",
  },
  {
    id: "okuma_diff_dwell",
    title: "G4 F vs G4 P — Dwell Time Units",
    body: "Okuma: G4 F2 = dwell 2 seconds (F word = seconds). Fanuc: G4 P2000 = dwell 2 seconds (P word = milliseconds). Converting between dialects: multiply Okuma F by 1000 for Fanuc P. Common error: using G4 F2000 on Okuma thinking it's milliseconds — this would dwell for 2000 seconds (33 minutes).",
    category: "dialect_diff",
    tags: ["dwell", "g4", "fanuc", "time-units"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "Cross-dialect comparison",
  },
  {
    id: "okuma_diff_arc_radius",
    title: "L vs R — Arc Radius Word",
    body: "Okuma uses L for arc radius. Fanuc/Haas use R. G2 X_ Z_ L.022 (Okuma) = G2 X_ Z_ R.022 (Fanuc). When converting programs, replace all arc L words with R words (and vice versa). Both support I/K incremental center offsets identically.",
    category: "dialect_diff",
    tags: ["arc", "radius", "L-word", "R-word", "fanuc"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "Cross-dialect comparison + 460A20-0154-3.min arcs",
  },
  {
    id: "okuma_diff_tool_labels",
    title: "NAT Labels vs T-word Only",
    body: "Okuma uses NAT labels (NAT01, NAT02, ...) to mark tool sections. Each NAT label groups all operations for one tool. Fanuc/Haas use only T-word (T0101). The NAT label system makes programs more readable and allows named labels (NAT01 = 'OD ROUGH', NAT07 = 'B.BAR'). Tool codes are 6-digit: T010101 = tool 01, offset 01, nose radius 01. Fanuc is 4-digit: T0101.",
    category: "dialect_diff",
    tags: ["tool", "nat", "label", "t-code"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "Cross-dialect comparison + all fixture programs",
  },
  {
    id: "okuma_diff_angular_move",
    title: "A Word — Angular Moves (Okuma Only)",
    body: "Okuma G1 supports an A parameter for angular moves. G1 A135 moves the tool at 135 degrees (measured from +Z axis toward +X). This eliminates the need to calculate X/Z endpoints for chamfers and tapers. A180 = move in -Z direction. A90 = move in +X direction. A270 = move in -X direction. No Fanuc/Haas equivalent — must calculate X/Z endpoints manually.",
    category: "dialect_diff",
    tags: ["angular", "a-word", "taper", "chamfer", "okuma-only"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "hex-pins-mark.min, A-6266.min angular moves",
  },
  {
    id: "okuma_diff_subroutines",
    title: "/CALL vs M98 — Subroutine Calling",
    body: "Okuma: /CALL ONAME (internal named subroutine). Fanuc: M98 P1234 (external program number). Okuma: /GOTO NLABEL (jump to label). Fanuc: GOTO N1234 (jump to sequence number). Okuma subroutines are always internal to the program. Fanuc M98 calls separate program files. This affects program structure — Okuma programs are self-contained, Fanuc programs may require multiple files.",
    category: "dialect_diff",
    tags: ["subroutine", "call", "fanuc", "m98"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "Cross-dialect comparison",
  },
  {
    id: "okuma_diff_roughing_cycle",
    title: "G85 vs G71 — Profile Roughing Cycle",
    body: "Okuma G85 = profile roughing cycle (Fanuc G71). Okuma G87 = profile finishing cycle (Fanuc G70). The cycle structure is similar but the code numbers are completely different. Okuma G85 uses NLABEL reference to a G81 profile definition. Fanuc G71 uses P/Q block number range. Okuma has no direct equivalent of Fanuc G71 Type II (pattern repetition).",
    category: "dialect_diff",
    tags: ["roughing", "g85", "g71", "fanuc", "cycle"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "Cross-dialect comparison",
  },
  {
    id: "okuma_diff_caxis",
    title: "M110/G138 vs M19 — C-Axis Engagement",
    body: "Okuma C-axis: M110 (enable) → G138 (interpolation mode) → work → G136 (cancel) → M109 (disable). Fanuc: M19 (orient) → C-axis immediate. Okuma's two-step process (M110 + G138) provides more control but is more verbose. M146/M147 (lock/unlock) have no direct Fanuc equivalent.",
    category: "dialect_diff",
    tags: ["c-axis", "m110", "m19", "fanuc", "live-tooling"],
    osp_family: ["P300", "P500"],
    machine_types: ["mill_turn", "multitask"],
    confidence: 90,
    source: "Cross-dialect comparison",
  },
];

// ============================================================================
// THREADING KNOWLEDGE
// ============================================================================

const THREADING_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_g71_threading",
    title: "G71 — Okuma Threading Cycle (Complete Reference)",
    body: "Full syntax: G71 X[minor_dia] Z[thread_end] B[angle] D[first_depth] U[finish_allow] H[total_depth] F[pitch] J[spring_passes] M32/M33 M73. B60 = 60° thread (UNC, metric standard). B55 = 55° (BSP/BSPT). B30 = 30° (ACME). D = first infeed depth (controls chip load on first pass). H = total thread depth (minor to major). F = thread pitch (in inches for imperial, mm for metric). J = number of spring passes at final depth. M32 = right-hand, M33 = left-hand. M73 = spring pass compensation.",
    category: "threading",
    tags: ["threading", "g71", "parameters", "complete"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G71"],
    parameters: {
      "X": "Thread minor diameter (for OD) or major diameter (for ID)",
      "Z": "Thread end position",
      "B": "Thread angle: 60=UNC/metric, 55=BSP, 30=ACME, 29=ACME stub",
      "D": "First infeed depth (controls initial chip load)",
      "U": "Finish allowance (spring pass depth)",
      "H": "Total thread depth (half of pitch for standard 60° thread)",
      "F": "Thread pitch (inches for imperial, mm for metric)",
      "J": "Number of spring passes at final depth",
      "I": "Thread start offset (for NPT/tapered threads)",
    },
    operation_types: ["thread"],
    confidence: 100,
    source: "OSP-P300L Manual + A-6266.min, NPT12.min",
  },
  {
    id: "okuma_thread_depth",
    title: "Thread Depth Calculation",
    body: "For 60° threads: H (total depth) = pitch × 0.6134. For imperial TPI: pitch = 1/TPI, H = 0.6134/TPI. Example: 1/2-13 UNC → pitch=0.0769, H=0.6134/13=0.0472. For metric: M10×1.5 → pitch=1.5mm, H=1.5×0.6134=0.920mm. The D (first infeed) is typically H/5 to H/3 for steel. Subsequent passes use compound infeed (controller handles this automatically with M73).",
    category: "threading",
    tags: ["threading", "depth", "calculation"],
    osp_family: ["P200", "P300", "P500"],
    operation_types: ["thread"],
    confidence: 95,
    source: "Machinery's Handbook thread tables",
  },
  {
    id: "okuma_npt_threading",
    title: "NPT (Tapered Thread) — G71 with I Parameter",
    body: "For NPT (National Pipe Thread) tapered threads, add I parameter to G71. I = thread start offset (distance from thread start to first full-depth cut). NPT taper: 1/16 inch per inch (3/4° per side). G71 with I shifts the threading start point. Example from NPT12.min: G71 X_ Z_ B60 I[offset] D_ H_ F_ J_ M32 M73.",
    category: "threading",
    tags: ["threading", "npt", "taper", "pipe-thread"],
    osp_family: ["P200", "P300", "P500"],
    gcodes: ["G71"],
    operation_types: ["thread"],
    confidence: 90,
    source: "NPT12.min fixture program",
  },
];

// ============================================================================
// TOOLING KNOWLEDGE
// ============================================================================

const TOOLING_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_tool_code",
    title: "6-Digit Tool Codes (T010101)",
    body: "Okuma uses 6-digit tool codes: TTOONN where TT=tool number (01-12), OO=offset number (01-12), NN=nose radius compensation number. T010101 = tool 1, offset 1, nose comp 1. Most programs use matching numbers (T010101, T020202). The third pair enables multiple nose radius settings per tool (e.g., T010102 for a different insert on the same tool holder).",
    category: "tooling",
    tags: ["tool-code", "6-digit", "offset", "nose-radius"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "OSP-P300L Manual + all fixture programs",
  },
  {
    id: "okuma_nat_labels",
    title: "NAT Labels — Tool Section Markers",
    body: "NAT01 through NAT12 (or higher) mark the start of each tool section. Comment in parentheses describes the tool: NAT01 (OD ROUGH INSERT - R.015). The NAT label system is unique to Okuma — Fanuc programs have no equivalent structural marker. NAT labels make programs self-documenting. Shop convention: include tool description, insert nose radius, and operation in the NAT comment.",
    category: "tooling",
    tags: ["nat", "label", "tool-section", "organization"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 100,
    source: "All fixture programs",
  },
  {
    id: "okuma_speed_modes",
    title: "CSS vs RPM — Per Tool Section",
    body: "Each NAT section typically starts with either G96 S[sfm] (CSS for turning) or G97 S[rpm] (direct RPM for drilling/threading). Pattern from shop: NAT01 (OD ROUGH) = G96 S400. NAT02 (OD FINISH) = G96 S550. NAT03 (CENTER DRILL) = G97 S1200. NAT05 (DRILL) = G97 S800. NAT07 (BORE) = G96 S350. NAT09 (THREAD) = G97 S150. NAT11 (CUTOFF) = G96 S250.",
    category: "tooling",
    tags: ["speed", "css", "rpm", "per-tool"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 95,
    source: "Statistical analysis of fixture programs",
  },
];

// ============================================================================
// GRAPHICS & SIMULATION KNOWLEDGE
// ============================================================================

const GRAPHICS_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_def_work",
    title: "DEF WORK / END / DRAW — Graphics Block",
    body: "Okuma programs can include part graphics blocks for on-screen visualization. DEF WORK starts the block, END closes it, DRAW triggers display. Inside: PS LC,[x1,y1],[x2,y2] defines line segments. The graphics block is purely visual — it does NOT affect tool motion. Typically placed at program start before NAT01. Can be safely stripped from programs without affecting machining.",
    category: "graphics",
    tags: ["graphics", "def-work", "draw", "visualization"],
    osp_family: ["P200", "P300", "P500"],
    confidence: 90,
    source: "460A20-0154-3.min DEF WORK block",
  },
  {
    id: "okuma_g140_g180_g270",
    title: "G140/G180/G270 — Graphics Control Codes",
    body: "G140 = graphics lock (disable part graphics update). G180 = cancel DEF WORK block. G270 = part graphics visibility toggle. These codes are related to the OSP control screen visualization, not to machine motion. They can appear in programs but have no machining effect. Post processors should either pass them through or strip them depending on target controller.",
    category: "graphics",
    tags: ["graphics", "g140", "g180", "g270", "display"],
    osp_family: ["P300", "P500"],
    gcodes: ["G140", "G180", "G270"],
    confidence: 80,
    source: "OSP-P300L Manual",
  },
];

// ============================================================================
// BAR FEEDER KNOWLEDGE
// ============================================================================

const BARFEEDER_TIPS: OkumaDialectTip[] = [
  {
    id: "okuma_barfeeder_structure",
    title: "Bar Feeder Loop Structure",
    body: "Standard bar feeder program structure: (1) Header + variable initialization. (2) NBAR label (loop start). (3) /CALL OBAR (bar feeder advance). (4) Full machining cycle (all NAT sections). (5) /GOTO NBAR (loop back). (6) NEND label (loop exit). The /CALL OBAR sequence handles: bar advance to stop, clamp, face stock, set work offset. The /GOTO NBAR creates an infinite loop — exit via IF [VC200 GE V66] /GOTO NEND (part counter).",
    category: "barfeeder",
    tags: ["bar-feeder", "loop", "structure", "automation"],
    osp_family: ["P200", "P300", "P500"],
    machine_types: ["lathe"],
    confidence: 95,
    source: "460A20-0154-3.min, hex-pins-mark.min",
  },
  {
    id: "okuma_barfeeder_handshake",
    title: "Bar Feeder Handshake M-Codes",
    body: "The /CALL OBAR subroutine typically contains M-codes for bar feeder communication. Common handshake codes vary by bar feeder model (LNS, Iemca, FMB). Generic: M-code to open collet, M-code to advance bar, M-code to close collet. Some shops use custom M-codes (M100-M199 range). The bar advance amount is set either by the bar feeder controller or by a Z-axis move to a fixed stop position.",
    category: "barfeeder",
    tags: ["bar-feeder", "handshake", "m-code", "automation"],
    osp_family: ["P200", "P300", "P500"],
    machine_types: ["lathe"],
    confidence: 85,
    source: "Shop practice (machine-specific)",
  },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const OKUMA_DIALECT_KNOWLEDGE: OkumaDialectTip[] = [
  ...GCODE_TIPS,
  ...MCODE_TIPS,
  ...VARIABLE_TIPS,
  ...SUBROUTINE_TIPS,
  ...SAFETY_TIPS,
  ...DIALECT_DIFF_TIPS,
  ...THREADING_TIPS,
  ...TOOLING_TIPS,
  ...GRAPHICS_TIPS,
  ...BARFEEDER_TIPS,
];
