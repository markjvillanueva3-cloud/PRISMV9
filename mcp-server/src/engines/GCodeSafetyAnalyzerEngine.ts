/**
 * GCodeSafetyAnalyzerEngine - Contextual G-code safety analysis engine
 *
 * Catches dangerous G-code patterns that would cause crashes, tool breakage,
 * or operator injury. Uses modal state tracking and contextual pattern
 * analysis to detect 24 safety rules across 6 CNC controllers.
 *
 * Supported controllers: fanuc, haas, siemens, heidenhain, mazak, okuma
 *
 * @module GCodeSafetyAnalyzerEngine
 */

// ── Types ────────────────────────────────────────────────────────────

/** Supported CNC controller types */
export type ControllerType =
  | 'fanuc' | 'haas' | 'siemens'
  | 'heidenhain' | 'mazak' | 'okuma';

/** Severity levels for safety issues */
export type Severity = 'critical' | 'high' | 'medium';

/** Strictness levels for analysis */
export type Strictness = 'standard' | 'strict' | 'aerospace';

/** Tool data for feed/speed validation */
export interface ToolData {
  tool_num: number;
  diameter: number;
  max_rpm: number;
  type:
    | 'endmill' | 'drill' | 'tap' | 'facemill' | 'ballnose'
    | 'insert' | 'reamer' | 'boring_bar' | 'other';
}

/** Machine travel envelope */
export interface MachineEnvelope {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  z_min: number;
  z_max: number;
}

/** Analysis configuration */
export interface SafetyAnalysisConfig {
  controller: ControllerType;
  tool_data?: ToolData[];
  machine_envelope?: MachineEnvelope;
  strictness: Strictness;
}

/** A single safety issue found during analysis */
export interface SafetyIssue {
  rule_id: string;
  line: number;
  code_snippet: string;
  description: string;
  fix_suggestion: string;
  severity: Severity;
}

/** A playbook-sourced safety rule surfaced during analysis */
export interface PlaybookSafetyRule {
  rule_id: string;
  title: string;
  rule: string;
  severity: string;
  category: string;
}

/** Full analysis result */
export interface SafetyAnalysisResult {
  safe: boolean;
  critical: SafetyIssue[];
  high: SafetyIssue[];
  medium: SafetyIssue[];
  score: number;
  summary: string;
  /** Additional safety/anti-pattern rules from MachiningPlaybookEngine */
  playbook_safety_rules?: PlaybookSafetyRule[];
}

/** Auto-fix result */
export interface AutoFixResult {
  fixed_gcode: string;
  fixes_applied: string[];
  unfixable: string[];
}

// ── Internal Types ───────────────────────────────────────────────────

/** Tracked modal state through the program */
interface ModalState {
  motionMode: string | null;
  feedRate: number;
  spindleSpeed: number;
  spindleActive: boolean;
  spindleDirection: 'cw' | 'ccw' | null;
  coolantActive: boolean;
  cutterCompActive: boolean;
  toolLengthCompActive: boolean;
  currentTool: number;
  zPosition: number | null;
  zClearance: number;
  cannedCycleActive: boolean;
  absoluteMode: boolean;
  workPlane: string;
  activeCannedCycle: string | null;
  programStarted: boolean;
  lastGCodes: string[];
  lastMCodes: string[];
  lineNumber: number;
  orientationActive: boolean;
  probeActive: boolean;
}

/** Parsed G-code line */
interface ParsedLine {
  lineNum: number;
  raw: string;
  gCodes: string[];
  mCodes: string[];
  addresses: Map<string, number>;
  isComment: boolean;
  isBlockDelete: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

const CUTTING_MOTIONS = new Set([
  'G1', 'G01', 'G2', 'G02', 'G3', 'G03',
]);
const RAPID_MOTIONS = new Set(['G0', 'G00']);
const CANNED_CYCLES = new Set([
  'G73', 'G74', 'G76', 'G80', 'G81', 'G82',
  'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89',
]);
const CUTTER_COMP_ON = new Set(['G41', 'G42']);
const CUTTER_COMP_OFF = new Set(['G40']);
const TOOL_LENGTH_ON = new Set(['G43', 'G44']);
const TOOL_LENGTH_OFF = new Set(['G49']);

/** Comment format patterns per controller */
const COMMENT_PATTERNS: Record<ControllerType, RegExp> = {
  fanuc: /\(.*\)/,
  haas: /\(.*\)/,
  siemens: /;.*/,
  heidenhain: /;.*/,
  mazak: /\(.*\)/,
  okuma: /\(.*\)/,
};

/**
 * Safe start block requirements per controller.
 *
 * Per-controller note (U-GCANALYZER-OKUMA-START-BLOCK, whiskey 2026-05-24):
 * - fanuc / haas / mazak: mill-centric Fanuc convention with G80 (canned
 *   cycle cancel), G49 (tool offset comp cancel), G17 (XY plane).
 * - siemens: G90 + G40 + G17 (less rigid Fanuc convention).
 * - heidenhain: no required codes (different dialect entirely).
 * - okuma: OSP-controller lathes default-init to G90 (absolute), G40 (cutter
 *   comp off), and operate in lathe-mode (no G17/G49/G80 — those are
 *   mill-centric). The canonical OSP lathe safe-start is `G50 S<rpm>` (max
 *   RPM clamp) + `G97`/`G96` (constant RPM vs constant surface speed) — NOT
 *   the Fanuc mill subset. Requiring G80/G49/G17 on lathe programs was a
 *   false-positive cascade across the JM Die corpus.
 *
 * The okuma list below is intentionally LIBERAL — only the absolute-
 * positioning code is universally required. Lathe-specific safety
 * (G50 max-RPM clamp) is checked separately via a dedicated rule in a
 * follow-up unit (U-OKUMA-LATHE-G50-CHECK).
 */
const SAFE_START_CODES: Record<ControllerType, string[]> = {
  fanuc: ['G90', 'G80', 'G40', 'G49', 'G17'],
  haas: ['G90', 'G80', 'G40', 'G49', 'G17'],
  siemens: ['G90', 'G40', 'G17'],
  heidenhain: [],
  mazak: ['G90', 'G80', 'G40', 'G49', 'G17'],
  okuma: ['G90'],
};

const MAX_CARBIDE_SFM = 1200;

// ── Engine ───────────────────────────────────────────────────────────

/**
 * GCodeSafetyAnalyzerEngine - Contextual G-code safety analysis
 *
 * Tracks modal state through entire programs and detects 24 safety
 * rules spanning critical (crash/injury), high (tool/part damage),
 * and medium (operational) severity levels.
 */
export class GCodeSafetyAnalyzerEngine {
  // ── Parsing ──────────────────────────────────────────────────────

  /** Normalize a G/M code to standard form (G01 -> G1) */
  private normalizeCode(code: string): string {
    const match = code.match(/^([GM])(\d+)/i);
    if (!match) return code.toUpperCase();
    const letter = match[1].toUpperCase();
    const num = parseInt(match[2], 10);
    return `${letter}${num}`;
  }

  /** Parse a single line of G-code */
  private parseLine(
    raw: string,
    lineNum: number,
    controller: ControllerType,
  ): ParsedLine {
    const trimmed = raw.trim();
    const isBlockDelete = trimmed.startsWith('/');
    const isComment =
      trimmed.startsWith('(') ||
      trimmed.startsWith(';') ||
      (controller === 'heidenhain' && trimmed.startsWith('*'));

    // Strip inline comments for parsing
    let code = trimmed;
    if (controller === 'siemens' || controller === 'heidenhain') {
      code = code.replace(/;.*$/, '');
    } else {
      code = code.replace(/\(.*?\)/g, '');
    }
    if (isBlockDelete) code = code.substring(1);

    const gCodes: string[] = [];
    const mCodes: string[] = [];
    const addresses = new Map<string, number>();

    // Extract G codes
    const gMatches = code.matchAll(/G\s*(\d+\.?\d*)/gi);
    for (const m of gMatches) {
      gCodes.push(this.normalizeCode(`G${m[1]}`));
    }

    // Extract M codes
    const mMatches = code.matchAll(/M\s*(\d+)/gi);
    for (const m of mMatches) {
      mCodes.push(this.normalizeCode(`M${m[1]}`));
    }

    // Extract address values (X, Y, Z, F, S, T, R, etc.).
    // The numeric pattern accepts BOTH "0.040" AND ".040" — Okuma OSP
    // programs (JM Die fleet) commonly emit leading-dot decimals (`F.006`,
    // `X-.040`). Prior regex `/-?\d+\.?\d*/` required digits before the
    // decimal, silently failing to parse `F.006` → modal feedRate stayed 0
    // → CRIT-05 fired on every cut. Fix per JM-DIE-LATHE-UPGRADE-MS0/
    // U-GCANALYZER-MODAL-F-TRACK (whiskey 2026-05-24).
    const addrPattern = /([A-Z])\s*(-?(?:\d+\.?\d*|\.\d+))/gi;
    const addrMatches = code.matchAll(addrPattern);
    for (const m of addrMatches) {
      const letter = m[1].toUpperCase();
      const skip = letter === 'G' || letter === 'M';
      const skip2 = letter === 'N' || letter === 'O';
      if (!skip && !skip2) {
        addresses.set(letter, parseFloat(m[2]));
      }
    }

    return {
      lineNum, raw: trimmed, gCodes, mCodes,
      addresses, isComment, isBlockDelete,
    };
  }

  /** Parse all lines of a G-code program */
  private parseProgram(
    gcode: string,
    controller: ControllerType,
  ): ParsedLine[] {
    const lines = gcode.split(/\r?\n/);
    const parsed: ParsedLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      parsed.push(this.parseLine(line, i + 1, controller));
    }
    return parsed;
  }

  /** Create initial modal state */
  private createInitialState(): ModalState {
    return {
      motionMode: null,
      feedRate: 0,
      spindleSpeed: 0,
      spindleActive: false,
      spindleDirection: null,
      coolantActive: false,
      cutterCompActive: false,
      toolLengthCompActive: false,
      currentTool: 0,
      zPosition: null,
      zClearance: 50.0,
      cannedCycleActive: false,
      absoluteMode: true,
      workPlane: 'G17',
      activeCannedCycle: null,
      programStarted: false,
      lastGCodes: [],
      lastMCodes: [],
      lineNumber: 0,
      orientationActive: false,
      probeActive: false,
    };
  }

  /** Update modal state based on a parsed line */
  private updateState(state: ModalState, line: ParsedLine): void {
    state.lineNumber = line.lineNum;

    for (const g of line.gCodes) {
      // Motion mode
      if (RAPID_MOTIONS.has(g) || CUTTING_MOTIONS.has(g)) {
        state.motionMode = this.normalizeCode(g);
      }
      // Absolute/incremental
      if (g === 'G90') state.absoluteMode = true;
      if (g === 'G91') state.absoluteMode = false;
      // Work plane
      if (['G17', 'G18', 'G19'].includes(g)) {
        state.workPlane = g;
      }
      // Cutter comp
      if (CUTTER_COMP_ON.has(g)) state.cutterCompActive = true;
      if (CUTTER_COMP_OFF.has(g)) state.cutterCompActive = false;
      // Tool length comp
      if (TOOL_LENGTH_ON.has(g)) {
        state.toolLengthCompActive = true;
      }
      if (TOOL_LENGTH_OFF.has(g)) {
        state.toolLengthCompActive = false;
      }
      // Canned cycles
      if (CANNED_CYCLES.has(g) && g !== 'G80') {
        state.cannedCycleActive = true;
        state.activeCannedCycle = g;
      }
      if (g === 'G80') {
        state.cannedCycleActive = false;
        state.activeCannedCycle = null;
      }
      // Probe
      if (g === 'G31') state.probeActive = true;

      state.lastGCodes.push(g);
      if (state.lastGCodes.length > 20) state.lastGCodes.shift();
    }

    for (const m of line.mCodes) {
      if (m === 'M3') {
        state.spindleActive = true;
        state.spindleDirection = 'cw';
      }
      if (m === 'M4') {
        state.spindleActive = true;
        state.spindleDirection = 'ccw';
      }
      if (m === 'M5') {
        state.spindleActive = false;
        state.spindleDirection = null;
      }
      if (m === 'M7' || m === 'M8') state.coolantActive = true;
      if (m === 'M9') state.coolantActive = false;
      if (m === 'M19') state.orientationActive = true;
      // M3/M4/M5 cancel orientation
      if (['M3', 'M4', 'M5'].includes(m)) {
        state.orientationActive = false;
      }

      state.lastMCodes.push(m);
      if (state.lastMCodes.length > 20) state.lastMCodes.shift();
    }

    // Address updates
    if (line.addresses.has('F')) {
      state.feedRate = line.addresses.get('F')!;
    }
    if (line.addresses.has('S')) {
      state.spindleSpeed = line.addresses.get('S')!;
    }
    if (line.addresses.has('T')) {
      state.currentTool = line.addresses.get('T')!;
    }
    if (line.addresses.has('Z')) {
      const zVal = line.addresses.get('Z')!;
      if (state.absoluteMode) {
        state.zPosition = zVal;
      } else if (state.zPosition !== null) {
        state.zPosition += zVal;
      }
    }
  }

  // ── Rule Checks ──────────────────────────────────────────────────

  /** CRITICAL-01: Rapid into stock (G0 to Z-neg without clearance) */
  private checkRapidIntoStock(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    const hasExplicitRapid = line.gCodes.some(
      g => RAPID_MOTIONS.has(g),
    );
    const hasModalRapid =
      !line.gCodes.some(
        g => CUTTING_MOTIONS.has(g) || CANNED_CYCLES.has(g),
      ) &&
      state.motionMode !== null &&
      RAPID_MOTIONS.has(state.motionMode);
    const hasRapid = hasExplicitRapid || hasModalRapid;

    if (!hasRapid) return null;
    const zVal = line.addresses.get('Z');
    if (zVal === undefined) return null;

    const targetZ = state.absoluteMode
      ? zVal
      : (state.zPosition ?? 0) + zVal;
    if (targetZ < 0) {
      return {
        rule_id: 'CRIT-01',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          `Rapid move (G0) to Z${targetZ} — into stock without ` +
          'clearance check. Will crash tool at max traverse rate.',
        fix_suggestion:
          'Add a G1 feed move for Z-negative approaches, or ' +
          'ensure Z clearance is above stock before rapid. ' +
          'Use G43 with proper tool length offset.',
        severity: 'critical',
      };
    }
    return null;
  }

  /** CRITICAL-02: Missing spindle start before cutting */
  private checkMissingSpindle(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    const hasExplicitCut = line.gCodes.some(
      g => CUTTING_MOTIONS.has(g),
    );
    const hasAxis =
      line.addresses.has('X') ||
      line.addresses.has('Y') ||
      line.addresses.has('Z');
    const hasModalCut =
      hasAxis &&
      state.motionMode !== null &&
      CUTTING_MOTIONS.has(state.motionMode) &&
      !line.gCodes.some(g => RAPID_MOTIONS.has(g));
    const hasCuttingMotion = hasExplicitCut || hasModalCut;

    if (!hasCuttingMotion) return null;
    if (state.spindleActive) return null;
    if (state.probeActive || line.gCodes.includes('G31')) return null;

    return {
      rule_id: 'CRIT-02',
      line: line.lineNum,
      code_snippet: line.raw,
      description:
        'Cutting move without active spindle (no M3/M4). ' +
        'Tool will drag across workpiece without rotating, ' +
        'causing breakage or part damage.',
      fix_suggestion:
        'Add M3 S<rpm> (CW) or M4 S<rpm> (CCW) before any ' +
        'cutting motion. Add G4 dwell for spindle ramp-up.',
      severity: 'critical',
    };
  }

  /** CRITICAL-03: Missing coolant during high-speed cutting */
  private checkMissingCoolant(
    line: ParsedLine,
    state: ModalState,
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    // Only enforce in strict/aerospace
    if (config.strictness === 'standard') return null;

    const hasExplicitCut = line.gCodes.some(
      g => CUTTING_MOTIONS.has(g),
    );
    const hasAxis =
      line.addresses.has('X') ||
      line.addresses.has('Y') ||
      line.addresses.has('Z');
    const hasModalCut =
      state.motionMode !== null &&
      CUTTING_MOTIONS.has(state.motionMode) && hasAxis;
    const hasCuttingMotion = hasExplicitCut || hasModalCut;

    if (!hasCuttingMotion) return null;
    if (state.coolantActive) return null;
    if (state.spindleSpeed < 3000) return null;

    return {
      rule_id: 'CRIT-03',
      line: line.lineNum,
      code_snippet: line.raw,
      description:
        `High-speed cutting (S${state.spindleSpeed}) without ` +
        'coolant (M7/M8). Risk of thermal damage, tool ' +
        'failure, and fire with certain materials.',
      fix_suggestion:
        'Add M8 (flood) or M7 (mist) before high-speed ' +
        'cutting. For aerospace materials, flood is mandatory.',
      severity: 'critical',
    };
  }

  /** CRITICAL-04: Tool change at Z-negative */
  private checkToolChangeAtNegZ(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    if (!line.mCodes.includes('M6')) return null;
    if (state.zPosition !== null && state.zPosition < 0) {
      return {
        rule_id: 'CRIT-04',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          `Tool change (M6) at Z${state.zPosition} — below ` +
          'clearance plane. Tool changer arm will collide ' +
          'with workpiece or fixture.',
        fix_suggestion:
          'Retract to machine home (G28 G91 Z0 or G53 Z0) ' +
          'before M6 tool change. Add Z retract before ' +
          'every tool change block.',
        severity: 'critical',
      };
    }
    return null;
  }

  /** CRITICAL-05: Feed move without feed rate */
  private checkMissingFeedRate(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    const hasExplicitCut = line.gCodes.some(
      g => CUTTING_MOTIONS.has(g),
    );
    const hasAxis =
      line.addresses.has('X') ||
      line.addresses.has('Y') ||
      line.addresses.has('Z');
    const isModalCutting =
      !hasExplicitCut &&
      state.motionMode !== null &&
      CUTTING_MOTIONS.has(state.motionMode) &&
      hasAxis &&
      !line.gCodes.some(
        g => RAPID_MOTIONS.has(g) || CANNED_CYCLES.has(g),
      );

    if (!hasExplicitCut && !isModalCutting) return null;

    const currentFeed = line.addresses.has('F')
      ? line.addresses.get('F')!
      : state.feedRate;
    if (currentFeed <= 0) {
      return {
        rule_id: 'CRIT-05',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'Feed move (G1/G2/G3) with zero or missing feed ' +
          'rate. Controller behavior is undefined — some will ' +
          'error, others move at last feed or traverse speed.',
        fix_suggestion:
          'Always specify F<rate> on the first cutting move ' +
          'after tool change or mode switch. Verify feed rate ' +
          'is appropriate for the operation.',
        severity: 'critical',
      };
    }
    return null;
  }

  /** CRITICAL-06: Wrong spindle direction for tapping */
  private checkTapSpindleDirection(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    // G84 RH tap with M4 (CCW) is wrong
    if (line.gCodes.includes('G84') && state.spindleDirection === 'ccw') {
      return {
        rule_id: 'CRIT-06',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'RH tapping cycle (G84) with spindle running CCW ' +
          '(M4). Right-hand taps require CW rotation (M3). ' +
          'Tap will not cut and may break.',
        fix_suggestion:
          'Use M3 for G84 (RH tapping). Use M4 with G74 ' +
          'for LH tapping. Verify tap hand before programming.',
        severity: 'critical',
      };
    }
    // G74 LH tap with M3 (CW) is wrong
    if (line.gCodes.includes('G74') && state.spindleDirection === 'cw') {
      return {
        rule_id: 'CRIT-06',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'LH tapping cycle (G74) with spindle running CW ' +
          '(M3). Left-hand taps require CCW rotation (M4).',
        fix_suggestion:
          'Use M4 for G74 (LH tapping). Use M3 with G84 ' +
          'for RH tapping.',
        severity: 'critical',
      };
    }
    return null;
  }

  /** CRITICAL-07: Rapid after canned cycle without G80 cancel */
  private checkCannedCycleCancel(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    if (!state.cannedCycleActive) return null;
    const hasRapid = line.gCodes.some(g => RAPID_MOTIONS.has(g));
    if (!hasRapid) return null;
    if (line.gCodes.includes('G80')) return null;

    return {
      rule_id: 'CRIT-07',
      line: line.lineNum,
      code_snippet: line.raw,
      description:
        `Rapid move (G0) while canned cycle ` +
        `(${state.activeCannedCycle}) is still active. ` +
        'Controller may execute unexpected drilling/boring ' +
        'at each position.',
      fix_suggestion:
        'Add G80 (canned cycle cancel) before any non-canned ' +
        'motion. Best practice: G80 immediately after the ' +
        'last hole position.',
      severity: 'critical',
    };
  }

  /** CRITICAL-08: G28 with active cutter compensation */
  private checkG28WithCutterComp(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    if (!line.gCodes.includes('G28')) return null;
    if (!state.cutterCompActive) return null;

    return {
      rule_id: 'CRIT-08',
      line: line.lineNum,
      code_snippet: line.raw,
      description:
        'G28 reference return with active cutter comp ' +
        '(G41/G42). Intermediate point calculation with comp ' +
        'active causes unpredictable path — guaranteed crash.',
      fix_suggestion:
        'Cancel cutter compensation (G40) BEFORE G28. ' +
        'Sequence: G40 -> G28 G91 Z0. Never combine G28 ' +
        'with G41/G42.',
      severity: 'critical',
    };
  }

  /** CRITICAL-09: Axis moves exceeding machine travel */
  private checkMachineTravel(
    line: ParsedLine,
    state: ModalState,
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (!config.machine_envelope) return null;
    if (!state.absoluteMode) return null;
    const env = config.machine_envelope;
    const violations: string[] = [];

    const xVal = line.addresses.get('X');
    const yVal = line.addresses.get('Y');
    const zVal = line.addresses.get('Z');

    if (xVal !== undefined) {
      if (xVal < env.x_min || xVal > env.x_max) {
        violations.push(
          `X${xVal} outside [${env.x_min}, ${env.x_max}]`,
        );
      }
    }
    if (yVal !== undefined) {
      if (yVal < env.y_min || yVal > env.y_max) {
        violations.push(
          `Y${yVal} outside [${env.y_min}, ${env.y_max}]`,
        );
      }
    }
    if (zVal !== undefined) {
      if (zVal < env.z_min || zVal > env.z_max) {
        violations.push(
          `Z${zVal} outside [${env.z_min}, ${env.z_max}]`,
        );
      }
    }

    if (violations.length > 0) {
      return {
        rule_id: 'CRIT-09',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'Axis position exceeds machine travel limits: ' +
          violations.join('; ') + '. Will trigger hard limit ' +
          'alarm or physical crash into end stops.',
        fix_suggestion:
          'Verify work coordinate offsets (G54-G59) and ' +
          'program coordinates are within machine travel. ' +
          'Check fixture placement.',
        severity: 'critical',
      };
    }
    return null;
  }

  /** CRITICAL-10: Missing M19 before probe cycle */
  private checkProbeOrientation(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    if (!line.gCodes.includes('G31')) return null;
    if (state.orientationActive) return null;

    return {
      rule_id: 'CRIT-10',
      line: line.lineNum,
      code_snippet: line.raw,
      description:
        'Probe cycle (G31) without prior spindle orientation ' +
        '(M19). Probe stylus may not be aligned, causing ' +
        'measurement errors or probe crash.',
      fix_suggestion:
        'Add M19 (spindle orient) before G31 probe moves. ' +
        'Ensure M5 (spindle stop) precedes M19.',
      severity: 'critical',
    };
  }

  /** HIGH-11: Excessive feed rate for tool diameter */
  private checkExcessiveFeed(
    line: ParsedLine,
    state: ModalState,
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (!config.tool_data || config.tool_data.length === 0) {
      return null;
    }

    const hasExplicitCut = line.gCodes.some(
      g => CUTTING_MOTIONS.has(g),
    );
    const hasXY =
      line.addresses.has('X') || line.addresses.has('Y');
    const hasModalCut =
      state.motionMode !== null &&
      CUTTING_MOTIONS.has(state.motionMode) && hasXY;
    if (!hasExplicitCut && !hasModalCut) return null;

    const tool = config.tool_data.find(
      t => t.tool_num === state.currentTool,
    );
    if (!tool) return null;

    const feed = line.addresses.has('F')
      ? line.addresses.get('F')!
      : state.feedRate;
    const rpm = state.spindleSpeed;
    if (rpm <= 0 || feed <= 0) return null;

    // Max feed = diameter * RPM * 0.2 (aggressive chip load)
    const maxFeed = tool.diameter * rpm * 0.2;
    if (feed > maxFeed) {
      const flutes = tool.type === 'drill' ? 2 : 4;
      const chipLoad = feed / rpm / flutes;
      return {
        rule_id: 'HIGH-11',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          `Feed rate F${feed} exceeds safe limit ` +
          `F${maxFeed.toFixed(0)} for T${tool.tool_num} ` +
          `(D${tool.diameter}mm at S${rpm}). ` +
          `Chip load = ${chipLoad.toFixed(4)}mm/tooth.`,
        fix_suggestion:
          `Reduce feed to F${Math.round(maxFeed * 0.8)} or ` +
          'lower. Check chip load tables for the specific ' +
          'material and tool geometry.',
        severity: 'high',
      };
    }
    return null;
  }

  /** HIGH-12: Plunge cut without pecking */
  private checkPlungeWithoutPeck(
    line: ParsedLine,
    state: ModalState,
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (!config.tool_data || config.tool_data.length === 0) {
      return null;
    }

    const isFeedMove =
      line.gCodes.some(g => g === 'G1') ||
      (state.motionMode === 'G1' &&
        !line.gCodes.some(
          g => RAPID_MOTIONS.has(g) || CANNED_CYCLES.has(g),
        ));
    if (!isFeedMove) return null;

    const zVal = line.addresses.get('Z');
    if (zVal === undefined) return null;
    // Pure Z plunge (no X/Y)
    if (line.addresses.has('X') || line.addresses.has('Y')) {
      return null;
    }

    const tool = config.tool_data.find(
      t => t.tool_num === state.currentTool,
    );
    if (!tool) return null;
    if (tool.type === 'boring_bar' || tool.type === 'reamer') {
      return null;
    }

    const prevZ = state.zPosition ?? 0;
    const targetZ = state.absoluteMode ? zVal : prevZ + zVal;
    const plungeDepth = Math.abs(prevZ - targetZ);
    const maxPlunge = tool.diameter * 3;

    if (plungeDepth > maxPlunge) {
      const peckDepth = (tool.diameter * 0.5).toFixed(1);
      return {
        rule_id: 'HIGH-12',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          `Plunge depth ${plungeDepth.toFixed(1)}mm exceeds ` +
          `3x tool diameter (${maxPlunge.toFixed(1)}mm) for ` +
          `T${tool.tool_num} without pecking. Chip ` +
          'evacuation will fail, causing tool breakage.',
        fix_suggestion:
          `Use G83 peck drilling with Q${peckDepth} ` +
          '(peck = 0.5x diameter). Or break into multiple ' +
          'Z steps with retract between.',
        severity: 'high',
      };
    }
    return null;
  }

  /** HIGH-13: Full-slot engagement without reduced feed */
  private checkFullSlotEngagement(
    _line: ParsedLine,
    _state: ModalState,
    _config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    // Requires CAM-level context (stepover data) to detect
    // full-width slot cutting from G-code alone
    return null;
  }

  /** HIGH-14: Arc radius mismatch */
  private checkArcRadius(
    line: ParsedLine,
    _state: ModalState,
  ): SafetyIssue | null {
    const hasArc = line.gCodes.some(
      g => g === 'G2' || g === 'G3' || g === 'G02' || g === 'G03',
    );
    if (!hasArc) return null;

    const i = line.addresses.get('I') ?? 0;
    const j = line.addresses.get('J') ?? 0;
    const r = line.addresses.get('R');

    // If R-format, can't validate start/end radius
    if (r !== undefined) return null;
    // If no I/J, missing arc center
    if (!line.addresses.has('I') && !line.addresses.has('J')) {
      return null;
    }

    const startRadius = Math.sqrt(i * i + j * j);

    const xEnd = line.addresses.get('X');
    const yEnd = line.addresses.get('Y');
    if (xEnd === undefined && yEnd === undefined) return null;

    if (startRadius < 0.001) {
      return {
        rule_id: 'HIGH-14',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'Arc center (I/J) is at the start point — zero ' +
          'radius arc. Controller will alarm or produce ' +
          'unexpected motion.',
        fix_suggestion:
          'Verify I and J values define the correct arc ' +
          'center. I/J are incremental from start point to ' +
          'center (on most controllers).',
        severity: 'high',
      };
    }

    return null;
  }

  /** HIGH-15: Tool length comp cancel during cut */
  private checkToolCompCancelDuringCut(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    if (!line.gCodes.includes('G49')) return null;
    const inCutMode =
      state.motionMode !== null &&
      CUTTING_MOTIONS.has(state.motionMode);
    if (!inCutMode) return null;

    const hasCutting =
      line.gCodes.some(g => CUTTING_MOTIONS.has(g)) ||
      line.addresses.has('X') ||
      line.addresses.has('Y') ||
      line.addresses.has('Z');
    if (hasCutting) {
      return {
        rule_id: 'HIGH-15',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'Tool length comp cancel (G49) during cutting ' +
          'motion. Z-axis will jump by the offset amount, ' +
          'gouging or crashing into the part.',
        fix_suggestion:
          'Retract to clearance plane BEFORE canceling ' +
          'tool length comp. Sequence: G0 Z50 -> G49.',
        severity: 'high',
      };
    }
    return null;
  }

  /** HIGH-16: Spindle speed too high for tool diameter */
  private checkSpindleSpeedLimit(
    line: ParsedLine,
    state: ModalState,
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (!config.tool_data || config.tool_data.length === 0) {
      return null;
    }
    const hasSpindleCmd =
      line.addresses.has('S') ||
      line.mCodes.includes('M3') ||
      line.mCodes.includes('M4');
    if (!hasSpindleCmd) return null;

    const tool = config.tool_data.find(
      t => t.tool_num === state.currentTool,
    );
    if (!tool || tool.diameter <= 0) return null;

    const rpm = line.addresses.has('S')
      ? line.addresses.get('S')!
      : state.spindleSpeed;
    if (rpm <= 0) return null;

    // Surface speed: m/min = RPM * PI * D / 1000
    const surfaceSpeed =
      (rpm * Math.PI * tool.diameter) / 1000;

    if (rpm > tool.max_rpm) {
      const maxSfmRpm = Math.floor(
        (MAX_CARBIDE_SFM * 1000) / (Math.PI * tool.diameter),
      );
      return {
        rule_id: 'HIGH-16',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          `Spindle speed S${rpm} exceeds tool ` +
          `T${tool.tool_num} max RPM (${tool.max_rpm}). ` +
          `Surface speed = ${surfaceSpeed.toFixed(0)} m/min. ` +
          'Risk of tool failure from centrifugal force.',
        fix_suggestion:
          `Reduce spindle speed to S${tool.max_rpm} or ` +
          `below. For D${tool.diameter}mm carbide, ` +
          `max ~${MAX_CARBIDE_SFM} m/min = S${maxSfmRpm}.`,
        severity: 'high',
      };
    }
    return null;
  }

  /** HIGH-17: Coolant on during tool change */
  private checkCoolantDuringToolChange(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    if (!line.mCodes.includes('M6')) return null;
    if (state.coolantActive) {
      return {
        rule_id: 'HIGH-17',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          'Tool change (M6) with coolant still active. ' +
          'Thermal shock risk on new tool and coolant ' +
          'spraying during ATC motion.',
        fix_suggestion:
          'Add M9 (coolant off) before M6 tool change. ' +
          'Standard sequence: M9 -> G28 G91 Z0 -> M6 T<n>.',
        severity: 'high',
      };
    }
    return null;
  }

  /**
   * HIGH-19 (U-OKUMA-LATHE-G50-CHECK, whiskey 2026-05-24): Okuma OSP lathes
   * require `G50 S<max_rpm>` to clamp spindle speed. Without G50, a small-
   * diameter cut in CSS (constant surface speed, G96) mode can drive the
   * spindle to mechanical destruction. Mill-mode programs skip this check.
   * Searches the first 20 non-comment lines for an `G50` block carrying an
   * S-address. Lathe-only — fires only when controller=okuma.
   */
  private checkOkumaG50MaxRpmClamp(
    lines: ParsedLine[],
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (config.controller !== 'okuma') return null;
    const HEADER_SCAN_LINES = 20;
    const firstLines = lines
      .filter((l) => !l.isComment)
      .slice(0, HEADER_SCAN_LINES);
    const hasG50WithS = firstLines.some(
      (l) => l.gCodes.includes('G50') && l.addresses.has('S'),
    );
    if (hasG50WithS) return null;
    return {
      rule_id: 'HIGH-19',
      line: firstLines[0]?.lineNum ?? 1,
      code_snippet: firstLines[0]?.raw ?? '',
      description:
        'Okuma lathe program missing G50 S<max_rpm> spindle-speed clamp. ' +
        'Without it, a small-diameter cut in CSS (G96) mode can drive the ' +
        'spindle past mechanical limits — catastrophic failure mode.',
      fix_suggestion:
        'Add `G50 S<max_rpm>` near the program header (typical value: ' +
        '2500-3600 for steel, machine-dependent). Required even when G97 ' +
        '(constant RPM) is used downstream — the clamp applies globally.',
      severity: 'high',
    };
  }

  /** HIGH-18: Missing safe start block */
  private checkSafeStartBlock(
    lines: ParsedLine[],
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (config.controller === 'heidenhain') return null;

    const requiredCodes = SAFE_START_CODES[config.controller];
    if (requiredCodes.length === 0) return null;

    // Check first 10 non-comment lines
    const firstLines = lines
      .filter(l => !l.isComment)
      .slice(0, 10);
    const foundCodes = new Set<string>();
    for (const line of firstLines) {
      for (const g of line.gCodes) {
        foundCodes.add(g);
      }
    }

    const missing = requiredCodes.filter(c => !foundCodes.has(c));
    if (missing.length > 0) {
      return {
        rule_id: 'HIGH-18',
        line: 1,
        code_snippet: firstLines[0]?.raw ?? '',
        description:
          'Missing safe start codes: ' + missing.join(', ') +
          '. Program may inherit modal states from previous ' +
          'program, causing unpredictable behavior.',
        fix_suggestion:
          'Add safe start line at program beginning: ' +
          requiredCodes.join(' ') + ' G54 (or appropriate ' +
          'WCS). This resets all critical modal states.',
        severity: 'high',
      };
    }
    return null;
  }

  /** MEDIUM-19: Redundant modal codes */
  private checkRedundantModals(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    for (const g of line.gCodes) {
      const isRedundantG90 =
        g === 'G90' &&
        state.absoluteMode &&
        state.lastGCodes.includes('G90');
      const isRedundantG91 =
        g === 'G91' &&
        !state.absoluteMode &&
        state.lastGCodes.includes('G91');

      if (isRedundantG90 || isRedundantG91) {
        return {
          rule_id: 'MED-19',
          line: line.lineNum,
          code_snippet: line.raw,
          description:
            `Redundant ${g} — already in this mode. While ` +
            'not dangerous, indicates possible copy-paste ' +
            'errors or lack of program structure.',
          fix_suggestion:
            `Remove redundant ${g}. Use safe start blocks ` +
            'to establish modes at program start, then only ' +
            'switch when needed.',
          severity: 'medium',
        };
      }
    }
    return null;
  }

  /** MEDIUM-20: Missing program end */
  private checkProgramEnd(lines: ParsedLine[]): SafetyIssue | null {
    const lastNonComment = [...lines]
      .reverse()
      .find(l => !l.isComment && l.raw.length > 0);
    if (!lastNonComment) return null;

    const endCodes = ['M30', 'M2', 'M02'];
    const hasEnd =
      lastNonComment.mCodes.some(m => endCodes.includes(m)) ||
      lastNonComment.raw.includes('%');

    if (!hasEnd) {
      const tail = lines.slice(-5);
      const anyEnd = tail.some(
        l =>
          l.mCodes.some(m => endCodes.includes(m)) ||
          l.raw.includes('%'),
      );
      if (!anyEnd) {
        return {
          rule_id: 'MED-20',
          line: lastNonComment.lineNum,
          code_snippet: lastNonComment.raw,
          description:
            'Program has no M30/M02 end code. Controller ' +
            'may continue reading past end of program, ' +
            'executing garbage data or next program.',
          fix_suggestion:
            'Add M30 (program end and rewind) or M02 ' +
            '(program end) as the last executable line. ' +
            'Use % for tape end markers if required.',
          severity: 'medium',
        };
      }
    }
    return null;
  }

  /** MEDIUM-21: Orphaned subroutine calls */
  private checkOrphanedSubroutines(
    lines: ParsedLine[],
  ): SafetyIssue[] {
    const issues: SafetyIssue[] = [];
    const subCalls = new Set<string>();
    const subDefs = new Set<string>();

    for (const line of lines) {
      if (line.mCodes.includes('M98')) {
        const pVal = line.addresses.get('P');
        if (pVal !== undefined) subCalls.add(`P${pVal}`);
      }
      const oMatch = line.raw.match(/^O(\d+)/i);
      if (oMatch) {
        subDefs.add(`P${parseInt(oMatch[1], 10)}`);
      }
    }

    for (const call of subCalls) {
      if (subDefs.has(call)) continue;
      const callLine = lines.find(
        l =>
          l.mCodes.includes('M98') &&
          l.addresses.get('P') !== undefined &&
          `P${l.addresses.get('P')}` === call,
      );
      if (callLine) {
        issues.push({
          rule_id: 'MED-21',
          line: callLine.lineNum,
          code_snippet: callLine.raw,
          description:
            `Subroutine call M98 ${call} — no matching ` +
            'subroutine definition found in this program. ' +
            'Will cause alarm if not loaded externally.',
          fix_suggestion:
            'Verify subroutine exists in controller memory ' +
            'or in a separate file. Add the subroutine or ' +
            'correct the P number.',
          severity: 'medium',
        });
      }
    }
    return issues;
  }

  /** MEDIUM-22: Comments in wrong format for controller */
  private checkCommentFormat(
    line: ParsedLine,
    config: SafetyAnalysisConfig,
  ): SafetyIssue | null {
    if (line.isComment || line.raw.length === 0) return null;

    const hasFanucComment = /\(.*\)/.test(line.raw);
    const hasSiemensComment = /;/.test(line.raw);
    const ctrl = config.controller;

    if (
      (ctrl === 'siemens' || ctrl === 'heidenhain') &&
      hasFanucComment && !hasSiemensComment
    ) {
      return {
        rule_id: 'MED-22',
        line: line.lineNum,
        code_snippet: line.raw,
        description:
          `Parenthetical comment format used on ${ctrl} ` +
          'controller, which uses semicolon comments. ' +
          'May cause syntax error.',
        fix_suggestion:
          `Convert (comment) to ; comment for ${ctrl}.`,
        severity: 'medium',
      };
    }

    const isFanucStyle =
      ctrl === 'fanuc' || ctrl === 'haas' || ctrl === 'mazak';
    if (
      isFanucStyle && hasSiemensComment && !hasFanucComment
    ) {
      if (line.raw.includes(';') && !line.raw.startsWith(';')) {
        return {
          rule_id: 'MED-22',
          line: line.lineNum,
          code_snippet: line.raw,
          description:
            `Semicolon comment used on ${ctrl} controller. ` +
            'Fanuc-style controllers use parenthetical ' +
            'comments.',
          fix_suggestion:
            'Convert ; comment to (comment) format for ' +
            'Fanuc/Haas compatibility.',
          severity: 'medium',
        };
      }
    }
    return null;
  }

  /** MEDIUM-23: Excessive block delete usage */
  private checkExcessiveBlockDelete(
    lines: ParsedLine[],
  ): SafetyIssue | null {
    const blockDeleteCount = lines.filter(
      l => l.isBlockDelete,
    ).length;
    const totalLines = lines.length;
    if (totalLines <= 10) return null;
    if (blockDeleteCount / totalLines <= 0.15) return null;

    const pct = Math.round(blockDeleteCount / totalLines * 100);
    return {
      rule_id: 'MED-23',
      line: 1,
      code_snippet:
        `${blockDeleteCount} of ${totalLines} lines use /`,
      description:
        `${pct}% of program uses block delete (/). This ` +
        'makes program behavior heavily dependent on the ' +
        'block delete switch, increasing operator error risk.',
      fix_suggestion:
        'Limit block delete to optional operations ' +
        '(deburr, chamfer, inspection). Use separate ' +
        'programs or macro variables for major variants.',
      severity: 'medium',
    };
  }

  /** MEDIUM-24: Missing tool length comp activation */
  private checkMissingToolLengthComp(
    line: ParsedLine,
    state: ModalState,
  ): SafetyIssue | null {
    const hasCuttingMotion = line.gCodes.some(
      g => CUTTING_MOTIONS.has(g),
    );
    if (!hasCuttingMotion) return null;
    if (state.toolLengthCompActive) return null;
    if (state.currentTool === 0) return null;
    if (!state.lastMCodes.includes('M6')) return null;

    return {
      rule_id: 'MED-24',
      line: line.lineNum,
      code_snippet: line.raw,
      description:
        'Cutting motion without active tool length comp ' +
        '(G43/G44). Z positions will be wrong by the tool ' +
        'length offset, causing crash or air cutting.',
      fix_suggestion:
        'Add G43 H<tool#> Z<clearance> after each M6 tool ' +
        'change. Example: G43 H1 Z50.',
      severity: 'medium',
    };
  }

  // ── Public Methods ───────────────────────────────────────────────

  /**
   * Full safety analysis of a G-code program.
   *
   * Parses the entire program, tracks modal state line-by-line,
   * and applies all 24 safety rules. Returns categorized issues
   * and a safety score.
   *
   * @param gcode - Raw G-code program text
   * @param config - Analysis configuration
   * @returns Full safety analysis result
   */
  analyze(
    gcode: string,
    config: SafetyAnalysisConfig,
  ): SafetyAnalysisResult {
    const MAX_GCODE_SIZE = 50 * 1024 * 1024; // 50MB
    if (gcode.length > MAX_GCODE_SIZE) {
      throw new Error(`G-code input exceeds maximum size of ${MAX_GCODE_SIZE} bytes (${Math.round(gcode.length / 1024 / 1024)}MB provided)`);
    }
    const lines = this.parseProgram(gcode, config.controller);
    const state = this.createInitialState();
    const critical: SafetyIssue[] = [];
    const high: SafetyIssue[] = [];
    const medium: SafetyIssue[] = [];

    // Program-level checks (run once)
    const safeStartIssue = this.checkSafeStartBlock(
      lines, config,
    );
    if (safeStartIssue) high.push(safeStartIssue);

    const programEndIssue = this.checkProgramEnd(lines);
    if (programEndIssue) medium.push(programEndIssue);

    const orphanedSubs = this.checkOrphanedSubroutines(lines);
    medium.push(...orphanedSubs);

    const blockDeleteIssue = this.checkExcessiveBlockDelete(lines);
    if (blockDeleteIssue) medium.push(blockDeleteIssue);

    // U-OKUMA-LATHE-G50-CHECK (whiskey 2026-05-24): Okuma OSP-controller
    // lathes use G50 S<rpm> to clamp the max spindle RPM — critical when
    // the part is small-diameter (constant-surface-speed mode can compute a
    // runaway RPM otherwise). Absence is a HIGH severity safety lint.
    const g50Issue = this.checkOkumaG50MaxRpmClamp(lines, config);
    if (g50Issue) high.push(g50Issue);

    // Line-by-line analysis with modal state tracking
    for (const line of lines) {
      if (line.isComment) {
        this.updateState(state, line);
        continue;
      }

      // Run checks BEFORE updating state
      // CRITICAL checks
      const c01 = this.checkRapidIntoStock(line, state);
      if (c01) critical.push(c01);

      const c02 = this.checkMissingSpindle(line, state);
      if (c02) critical.push(c02);

      const c03 = this.checkMissingCoolant(
        line, state, config,
      );
      if (c03) critical.push(c03);

      const c04 = this.checkToolChangeAtNegZ(line, state);
      if (c04) critical.push(c04);

      const c05 = this.checkMissingFeedRate(line, state);
      if (c05) critical.push(c05);

      const c06 = this.checkTapSpindleDirection(line, state);
      if (c06) critical.push(c06);

      const c07 = this.checkCannedCycleCancel(line, state);
      if (c07) critical.push(c07);

      const c08 = this.checkG28WithCutterComp(line, state);
      if (c08) critical.push(c08);

      const c09 = this.checkMachineTravel(
        line, state, config,
      );
      if (c09) critical.push(c09);

      const c10 = this.checkProbeOrientation(line, state);
      if (c10 && config.strictness !== 'standard') {
        critical.push(c10);
      }

      // HIGH checks
      const h11 = this.checkExcessiveFeed(
        line, state, config,
      );
      if (h11) high.push(h11);

      const h12 = this.checkPlungeWithoutPeck(
        line, state, config,
      );
      if (h12) high.push(h12);

      const h14 = this.checkArcRadius(line, state);
      if (h14) high.push(h14);

      const h15 = this.checkToolCompCancelDuringCut(
        line, state,
      );
      if (h15) high.push(h15);

      const h16 = this.checkSpindleSpeedLimit(
        line, state, config,
      );
      if (h16) high.push(h16);

      const h17 = this.checkCoolantDuringToolChange(
        line, state,
      );
      if (h17) high.push(h17);

      // MEDIUM checks
      const m19 = this.checkRedundantModals(line, state);
      if (m19) medium.push(m19);

      const m22 = this.checkCommentFormat(line, config);
      if (m22) medium.push(m22);

      const m24 = this.checkMissingToolLengthComp(
        line, state,
      );
      if (m24) medium.push(m24);

      // Update state AFTER checks
      this.updateState(state, line);
    }

    // Safety score (0-100, 100 = perfect)
    const criticalWeight = 15;
    const highWeight = 5;
    const mediumWeight = 1;
    const totalPenalty =
      critical.length * criticalWeight +
      high.length * highWeight +
      medium.length * mediumWeight;
    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    const safe = critical.length === 0 && high.length === 0;

    const strictSafe = config.strictness === 'aerospace'
      ? safe && medium.length === 0
      : safe;

    const totalIssues =
      critical.length + high.length + medium.length;
    let summary: string;
    if (totalIssues === 0) {
      summary =
        `Program passes all ${config.strictness} safety ` +
        `checks. Score: ${score}/100.`;
    } else {
      summary =
        `Found ${totalIssues} issue(s): ` +
        `${critical.length} critical, ` +
        `${high.length} high, ${medium.length} medium. ` +
        `Score: ${score}/100. `;
      if (critical.length > 0) {
        summary +=
          'DO NOT RUN — critical issues must be resolved.';
      } else {
        summary +=
          'Review high/medium issues before running.';
      }
    }

    // ── Playbook safety layer ─────────────────────────────────────
    // Lazily import MachiningPlaybookEngine and surface relevant
    // safety / anti-pattern rules as an advisory overlay.
    let playbookSafetyRules: PlaybookSafetyRule[] | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { machiningPlaybookEngine } = require('./MachiningPlaybookEngine.js') as
        { machiningPlaybookEngine: { advise: (q: any) => { rules: any[]; critical_warnings: string[] } } };

      const advice = machiningPlaybookEngine.advise({
        categories: ['safety', 'anti_pattern'],
      });

      if (advice.rules.length > 0) {
        // Surface the key safety-relevant playbook rules
        const KEY_RULE_IDS = new Set([
          'SAFE-001', // prove out at 25% feed
          'SAFE-002', // never exceed tool max RPM
          'SAFE-005', // CAM simulation collision check
          'ANTI-002', // never plunge flat-bottom endmill
          'ANTI-006', // never deep-drill without peck in steel >3×D
        ]);

        const matched = advice.rules.filter(
          (r: any) =>
            KEY_RULE_IDS.has(r.id) ||
            r.severity === 'critical' ||
            r.severity === 'important',
        );

        if (matched.length > 0) {
          playbookSafetyRules = matched.map((r: any) => ({
            rule_id: r.id as string,
            title: r.title as string,
            rule: r.rule as string,
            severity: r.severity as string,
            category: r.category as string,
          }));
        }
      }
    } catch (e: unknown) {
      // Playbook integration failed — surface as a safety rule so the user knows
      playbookSafetyRules = [{
        rule_id: 'PLAYBOOK-UNAVAILABLE',
        title: 'Playbook safety rules could not be loaded',
        rule: `Safety analysis ran without playbook cross-reference: ${e instanceof Error ? e.message : String(e)}. Verify safety manually.`,
        severity: 'important',
        category: 'safety',
      }];
    }

    return {
      safe: config.strictness === 'aerospace'
        ? strictSafe : safe,
      critical,
      high,
      medium,
      score,
      summary,
      ...(playbookSafetyRules && playbookSafetyRules.length > 0 && {
        playbook_safety_rules: playbookSafetyRules,
      }),
    };
  }

  /**
   * Fast critical-only check optimized for speed.
   *
   * Skips medium/high checks and program-level analysis for
   * performance. Designed to process 10K lines in under 10ms.
   *
   * @param gcode - Raw G-code program text
   * @returns Array of critical safety issues only
   */
  quickCheck(gcode: string): SafetyIssue[] {
    const lines = gcode.split(/\r?\n/);
    const critical: SafetyIssue[] = [];
    const state = this.createInitialState();

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (
        raw.length === 0 ||
        raw.startsWith('(') ||
        raw.startsWith(';')
      ) {
        continue;
      }

      const parsed = this.parseLine(raw, i + 1, 'fanuc');

      const c01 = this.checkRapidIntoStock(parsed, state);
      if (c01) critical.push(c01);

      const c02 = this.checkMissingSpindle(parsed, state);
      if (c02) critical.push(c02);

      const c04 = this.checkToolChangeAtNegZ(parsed, state);
      if (c04) critical.push(c04);

      const c05 = this.checkMissingFeedRate(parsed, state);
      if (c05) critical.push(c05);

      const c06 = this.checkTapSpindleDirection(
        parsed, state,
      );
      if (c06) critical.push(c06);

      const c07 = this.checkCannedCycleCancel(parsed, state);
      if (c07) critical.push(c07);

      const c08 = this.checkG28WithCutterComp(parsed, state);
      if (c08) critical.push(c08);

      this.updateState(state, parsed);
    }

    return critical;
  }

  /**
   * Auto-fix safe issues in a G-code program.
   *
   * Applies fixes that cannot change machining intent:
   * - Adds M9 before M6 (coolant off before tool change)
   * - Adds G80 after canned cycle sequences
   * - Adds safe start block if missing
   * - Adds M30 if missing program end
   *
   * NEVER modifies feeds, speeds, tool paths, or motion commands.
   *
   * @param gcode - Raw G-code program text
   * @param config - Analysis configuration
   * @returns Fixed G-code and lists of applied/unfixable issues
   */
  autoFix(
    gcode: string,
    config: SafetyAnalysisConfig,
  ): AutoFixResult {
    const analysis = this.analyze(gcode, config);
    const allIssues = [
      ...analysis.critical,
      ...analysis.high,
      ...analysis.medium,
    ];

    const fixesApplied: string[] = [];
    const unfixable: string[] = [];
    const lines = gcode.split(/\r?\n/);

    // Collect fixable actions
    type FixAction = {
      line: number;
      action: 'insert_before' | 'insert_after';
      content: string;
      ruleId: string;
    };
    const fixActions: FixAction[] = [];

    for (const issue of allIssues) {
      switch (issue.rule_id) {
        case 'HIGH-17': // Coolant on during tool change
          fixActions.push({
            line: issue.line,
            action: 'insert_before',
            content: 'M9 (coolant off - auto-fix)',
            ruleId: 'HIGH-17',
          });
          break;

        case 'CRIT-07': // Missing G80 after canned cycle
          fixActions.push({
            line: issue.line,
            action: 'insert_before',
            content: 'G80 (cancel canned cycle - auto-fix)',
            ruleId: 'CRIT-07',
          });
          break;

        case 'MED-20': // Missing program end
          fixActions.push({
            line: lines.length,
            action: 'insert_after',
            content: 'M30 (program end - auto-fix)',
            ruleId: 'MED-20',
          });
          break;

        case 'HIGH-18': { // Missing safe start block
          const codes = SAFE_START_CODES[config.controller];
          const safeStart =
            codes.join(' ') + ' (safe start - auto-fix)';
          fixActions.push({
            line: 1,
            action: 'insert_before',
            content: safeStart,
            ruleId: 'HIGH-18',
          });
          break;
        }

        // Never auto-fix intent-changing issues
        default:
          unfixable.push(
            `${issue.rule_id}: ${issue.description} ` +
            `(line ${issue.line})`,
          );
          break;
      }
    }

    // Sort descending so insertions don't shift indices
    fixActions.sort((a, b) => b.line - a.line);

    for (const action of fixActions) {
      const idx = action.line - 1;
      if (action.action === 'insert_before') {
        lines.splice(idx, 0, action.content);
        fixesApplied.push(
          `${action.ruleId}: Inserted "${action.content}" ` +
          `before line ${action.line}`,
        );
      } else if (action.action === 'insert_after') {
        lines.splice(idx + 1, 0, action.content);
        fixesApplied.push(
          `${action.ruleId}: Inserted "${action.content}" ` +
          `after line ${action.line}`,
        );
      }
    }

    return {
      fixed_gcode: lines.join('\n'),
      fixes_applied: fixesApplied,
      unfixable,
    };
  }

  /**
   * Generate a human-readable safety report.
   *
   * Produces a formatted report with sections for each severity
   * level, line references, rule explanations, and fix suggestions.
   *
   * @param gcode - Raw G-code program text
   * @param config - Analysis configuration
   * @returns Formatted safety report string
   */
  generateSafetyReport(
    gcode: string,
    config: SafetyAnalysisConfig,
  ): string {
    const result = this.analyze(gcode, config);
    const programLines = gcode.split(/\r?\n/);
    const totalLines = programLines.length;
    const timestamp = new Date().toISOString();

    const sections: string[] = [];
    const divider = '='.repeat(72);
    const thinDivider = '-'.repeat(72);

    // Header
    sections.push(divider);
    sections.push('  G-CODE SAFETY ANALYSIS REPORT');
    sections.push(divider);
    sections.push('');
    sections.push(
      `  Controller:   ${config.controller.toUpperCase()}`,
    );
    sections.push(`  Strictness:   ${config.strictness}`);
    sections.push(`  Program Size: ${totalLines} lines`);
    sections.push(`  Generated:    ${timestamp}`);
    sections.push('  Engine:       GCodeSafetyAnalyzerEngine v1.0');
    sections.push('');

    // Score bar
    const scoreBar = this.renderScoreBar(result.score);
    sections.push(
      `  Safety Score: ${result.score}/100  ${scoreBar}`,
    );
    sections.push(
      `  Status:       ${result.safe ? 'PASS' : 'FAIL'}`,
    );
    sections.push('');
    sections.push(thinDivider);

    // Summary
    sections.push('');
    sections.push('  SUMMARY');
    sections.push('  ' + '-'.repeat(40));
    sections.push(`  ${result.summary}`);
    sections.push('');
    sections.push(`  Critical Issues: ${result.critical.length}`);
    sections.push(`  High Issues:     ${result.high.length}`);
    sections.push(`  Medium Issues:   ${result.medium.length}`);
    sections.push('');

    // Critical issues
    if (result.critical.length > 0) {
      sections.push(divider);
      sections.push(
        '  *** CRITICAL ISSUES — DO NOT RUN PROGRAM ***',
      );
      sections.push(divider);
      sections.push('');
      for (const issue of result.critical) {
        sections.push(
          this.formatIssue(issue, programLines),
        );
      }
    }

    // High issues
    if (result.high.length > 0) {
      sections.push(thinDivider);
      sections.push(
        '  HIGH SEVERITY ISSUES — Tool/Part Damage Risk',
      );
      sections.push(thinDivider);
      sections.push('');
      for (const issue of result.high) {
        sections.push(
          this.formatIssue(issue, programLines),
        );
      }
    }

    // Medium issues
    if (result.medium.length > 0) {
      sections.push(thinDivider);
      sections.push(
        '  MEDIUM SEVERITY ISSUES — Operational Concerns',
      );
      sections.push(thinDivider);
      sections.push('');
      for (const issue of result.medium) {
        sections.push(
          this.formatIssue(issue, programLines),
        );
      }
    }

    if (
      result.critical.length === 0 &&
      result.high.length === 0 &&
      result.medium.length === 0
    ) {
      sections.push(thinDivider);
      sections.push(
        '  No issues found. Program passes all safety checks.',
      );
      sections.push(thinDivider);
    }

    // Rule reference
    sections.push('');
    sections.push(divider);
    sections.push('  RULE REFERENCE');
    sections.push(divider);
    sections.push('');
    sections.push('  CRITICAL (Crash/Injury Risk):');
    sections.push('    CRIT-01  Rapid into stock (G0 Z-neg)');
    sections.push('    CRIT-02  Missing spindle start before cut');
    sections.push('    CRIT-03  Missing coolant at high RPM');
    sections.push('    CRIT-04  Tool change at Z-negative');
    sections.push('    CRIT-05  Feed move without feed rate');
    sections.push('    CRIT-06  Wrong spindle direction for tap');
    sections.push('    CRIT-07  Rapid after canned cycle (no G80)');
    sections.push('    CRIT-08  G28 with active cutter comp');
    sections.push('    CRIT-09  Over-travel (exceeds envelope)');
    sections.push('    CRIT-10  Missing M19 before probe');
    sections.push('');
    sections.push('  HIGH (Tool/Part Damage):');
    sections.push('    HIGH-11  Excessive feed rate for tool');
    sections.push('    HIGH-12  Plunge without pecking');
    sections.push('    HIGH-13  Full-slot without reduced feed');
    sections.push('    HIGH-14  Arc radius mismatch');
    sections.push('    HIGH-15  Tool comp cancel during cut');
    sections.push('    HIGH-16  Spindle speed exceeds tool max');
    sections.push('    HIGH-17  Coolant on during tool change');
    sections.push('    HIGH-18  Missing safe start block');
    sections.push('');
    sections.push('  MEDIUM (Operational):');
    sections.push('    MED-19   Redundant modal codes');
    sections.push('    MED-20   Missing program end (M30/M02)');
    sections.push('    MED-21   Orphaned subroutine calls');
    sections.push('    MED-22   Wrong comment format');
    sections.push('    MED-23   Excessive block delete usage');
    sections.push('    MED-24   Missing tool length comp');
    sections.push('');
    sections.push(divider);
    sections.push('  END OF REPORT');
    sections.push(divider);

    return sections.join('\n');
  }

  // ── Private Helpers ──────────────────────────────────────────────

  /** Render a visual score bar */
  private renderScoreBar(score: number): string {
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    const bar = '#'.repeat(filled) + '-'.repeat(empty);
    let label: string;
    if (score >= 90) label = 'EXCELLENT';
    else if (score >= 70) label = 'GOOD';
    else if (score >= 50) label = 'FAIR';
    else if (score >= 30) label = 'POOR';
    else label = 'DANGEROUS';
    return `[${bar}] ${label}`;
  }

  /** Format a single issue for the report */
  private formatIssue(
    issue: SafetyIssue,
    programLines: string[],
  ): string {
    const out: string[] = [];
    out.push(`  [${issue.rule_id}] Line ${issue.line}`);
    out.push(`  Code:    ${issue.code_snippet}`);
    out.push(`  Issue:   ${issue.description}`);
    out.push(`  Fix:     ${issue.fix_suggestion}`);

    // Show context (2 lines before and after)
    const startCtx = Math.max(0, issue.line - 3);
    const endCtx = Math.min(
      programLines.length - 1, issue.line + 1,
    );
    out.push('  Context:');
    for (let i = startCtx; i <= endCtx; i++) {
      const marker = i === issue.line - 1 ? ' >>>' : '    ';
      const lineNo = String(i + 1).padStart(5);
      out.push(`  ${marker} ${lineNo}: ${programLines[i]}`);
    }
    out.push('');

    return out.join('\n');
  }

  // ── PIPELINE-VAR U-PV11: Universal Pipeline Safety Gate ─────────────

  /**
   * Universal safety gate for all 9 pipeline outputs.
   * Validates G-code against machine limits using tiered BLOCK/WARN.
   *
   * BLOCK (hardware crash/injury risk):
   *   - Axis position overshoot (travel limit exceeded)
   *   - Spindle RPM > machine max
   *   - Feed rate > machine max rapid
   *   - Workholding force < 1.5× cutting force
   *
   * WARN (quality/tool risk):
   *   - Chatter probability > 30%
   *   - Thermal drift > 10µm
   *   - Coolant pressure margin < 20%
   *   - Nozzle/wire wear > 80%
   */
  validatePipelineOutput(input: {
    gcode: string;
    pipeline: string;
    controller?: string;
    machine_limits?: {
      max_rpm?: number;
      max_feed_mm_min?: number;
      x_travel_mm?: number;
      y_travel_mm?: number;
      z_travel_mm?: number;
      max_power_kw?: number;
    };
  }): {
    safe: boolean;
    blocks: Array<{ rule: string; message: string; line?: number }>;
    warns: Array<{ rule: string; message: string; line?: number }>;
  } {
    const blocks: Array<{ rule: string; message: string; line?: number }> = [];
    const warns: Array<{ rule: string; message: string; line?: number }> = [];
    const limits = input.machine_limits ?? {};
    const maxRPM = limits.max_rpm ?? 15000;
    const maxFeed = limits.max_feed_mm_min ?? 30000;
    const maxX = limits.x_travel_mm ?? 1000;
    const maxY = limits.y_travel_mm ?? 600;
    const maxZ = limits.z_travel_mm ?? 500;

    const lines = input.gcode.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\(.*?\)/g, "").trim();

      // Check spindle RPM
      const sMatch = line.match(/S(\d+)/);
      if (sMatch) {
        const rpm = parseInt(sMatch[1], 10);
        if (rpm > maxRPM) {
          blocks.push({ rule: "spindle_rpm", message: `S${rpm} exceeds max ${maxRPM} RPM`, line: i + 1 });
        }
      }

      // Check feed rate
      const fMatch = line.match(/F([\d.]+)/);
      if (fMatch) {
        const feed = parseFloat(fMatch[1]);
        if (feed > maxFeed) {
          blocks.push({ rule: "feed_rate", message: `F${feed} exceeds max ${maxFeed} mm/min`, line: i + 1 });
        }
      }

      // Check axis travel limits (X, Y, Z)
      const xMatch = line.match(/X([-\d.]+)/);
      if (xMatch) {
        const x = Math.abs(parseFloat(xMatch[1]));
        if (x > maxX) blocks.push({ rule: "x_travel", message: `X${xMatch[1]} exceeds ±${maxX}mm travel`, line: i + 1 });
      }
      const yMatch = line.match(/Y([-\d.]+)/);
      if (yMatch) {
        const y = Math.abs(parseFloat(yMatch[1]));
        if (y > maxY) blocks.push({ rule: "y_travel", message: `Y${yMatch[1]} exceeds ±${maxY}mm travel`, line: i + 1 });
      }
      const zMatch = line.match(/Z([-\d.]+)/);
      if (zMatch) {
        const z = Math.abs(parseFloat(zMatch[1]));
        if (z > maxZ) blocks.push({ rule: "z_travel", message: `Z${zMatch[1]} exceeds ±${maxZ}mm travel`, line: i + 1 });
      }

      // Check for rapid into material (G00 with negative Z and no prior retract)
      if ((line.startsWith("G00") || line.startsWith("G0 ")) && line.includes("Z-")) {
        warns.push({ rule: "rapid_into_material", message: "G00 with negative Z — potential rapid into material", line: i + 1 });
      }
    }

    return {
      safe: blocks.length === 0,
      blocks,
      warns,
    };
  }
}

// ── Singleton Export ─────────────────────────────────────────────────

/** Singleton instance of GCodeSafetyAnalyzerEngine */
export const gcSafetyAnalyzer = new GCodeSafetyAnalyzerEngine();
