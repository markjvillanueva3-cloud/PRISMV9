/**
 * LatheDenotationalSemanticsEngine — G-Code Denotational Semantics
 *
 * U-LTH65: Maps each G-code word to pure function State → State.
 * Enables algebraic composition and state-independent proofs.
 * Includes Fanuc/Okuma dialect normalization to RS274 core.
 *
 * @module engines/LatheDenotationalSemanticsEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MachineState {
  // Position
  x: number;
  z: number;
  c?: number;

  // Modal groups
  motion_mode: MotionMode;
  positioning_mode: PositioningMode;
  units: UnitMode;
  feed_mode: FeedMode;
  spindle_mode: SpindleMode;
  plane: PlaneMode;
  canned_cycle: CannedCycleMode;
  work_offset: WorkOffsetMode;

  // Active values
  feedrate: number;
  spindle_speed: number;
  tool_number: number;
  tool_offset: number;

  // Offsets
  work_offset_values: { x: number; z: number };
  tool_offset_values: { x: number; z: number };

  // Spindle state
  spindle_direction: "cw" | "ccw" | "off";

  // Coolant
  coolant: "off" | "flood" | "mist" | "both";

  // Program state
  program_running: boolean;
  program_paused: boolean;
  block_skip_active: boolean;
  optional_stop_active: boolean;
}

export type MotionMode = "G0" | "G1" | "G2" | "G3" | "G33" | null;
export type PositioningMode = "G90" | "G91";
export type UnitMode = "G20" | "G21";
export type FeedMode = "G94" | "G95";
export type SpindleMode = "G96" | "G97";
export type PlaneMode = "G17" | "G18" | "G19";
export type CannedCycleMode = "G70" | "G71" | "G72" | "G73" | "G74" | "G75" | "G76" | null;
export type WorkOffsetMode = "G54" | "G55" | "G56" | "G57" | "G58" | "G59";

export type StateTransformer = (state: MachineState) => MachineState;

export interface GCodeSemantics {
  code: string;
  category: string;
  description: string;
  transform: StateTransformer;
  modal_group?: number;
  requires?: string[];
}

export interface MCodeSemantics {
  code: string;
  category: string;
  description: string;
  transform: StateTransformer;
}

export interface WordSemantics {
  word: string;
  description: string;
  parse: (value: number, state: MachineState) => Partial<MachineState>;
}

export type Dialect = "fanuc" | "okuma" | "rs274" | "haas" | "mazak";

export interface NormalizationResult {
  original: string;
  normalized: string;
  dialect_detected: Dialect;
  transformations: string[];
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const INITIAL_STATE: MachineState = {
  x: 0,
  z: 0,
  motion_mode: null,
  positioning_mode: "G90",
  units: "G21",
  feed_mode: "G94",
  spindle_mode: "G97",
  plane: "G18",
  canned_cycle: null,
  work_offset: "G54",
  feedrate: 100,
  spindle_speed: 0,
  tool_number: 0,
  tool_offset: 0,
  work_offset_values: { x: 0, z: 0 },
  tool_offset_values: { x: 0, z: 0 },
  spindle_direction: "off",
  coolant: "off",
  program_running: true,
  program_paused: false,
  block_skip_active: false,
  optional_stop_active: false,
};

// ============================================================================
// G-CODE SEMANTICS TABLE
// ============================================================================

const G_CODE_SEMANTICS: Record<string, GCodeSemantics> = {
  // Motion Group (Modal Group 1)
  G0: {
    code: "G0",
    category: "motion",
    description: "Rapid positioning",
    modal_group: 1,
    transform: (s) => ({ ...s, motion_mode: "G0" as MotionMode }),
  },
  G1: {
    code: "G1",
    category: "motion",
    description: "Linear interpolation",
    modal_group: 1,
    transform: (s) => ({ ...s, motion_mode: "G1" as MotionMode }),
  },
  G2: {
    code: "G2",
    category: "motion",
    description: "Circular interpolation CW",
    modal_group: 1,
    transform: (s) => ({ ...s, motion_mode: "G2" as MotionMode }),
  },
  G3: {
    code: "G3",
    category: "motion",
    description: "Circular interpolation CCW",
    modal_group: 1,
    transform: (s) => ({ ...s, motion_mode: "G3" as MotionMode }),
  },
  G33: {
    code: "G33",
    category: "motion",
    description: "Threading",
    modal_group: 1,
    transform: (s) => ({ ...s, motion_mode: "G33" as MotionMode }),
  },

  // Plane Selection (Modal Group 2)
  G17: {
    code: "G17",
    category: "plane",
    description: "XY plane selection",
    modal_group: 2,
    transform: (s) => ({ ...s, plane: "G17" as PlaneMode }),
  },
  G18: {
    code: "G18",
    category: "plane",
    description: "XZ plane selection",
    modal_group: 2,
    transform: (s) => ({ ...s, plane: "G18" as PlaneMode }),
  },
  G19: {
    code: "G19",
    category: "plane",
    description: "YZ plane selection",
    modal_group: 2,
    transform: (s) => ({ ...s, plane: "G19" as PlaneMode }),
  },

  // Positioning Mode (Modal Group 3)
  G90: {
    code: "G90",
    category: "positioning",
    description: "Absolute positioning",
    modal_group: 3,
    transform: (s) => ({ ...s, positioning_mode: "G90" as PositioningMode }),
  },
  G91: {
    code: "G91",
    category: "positioning",
    description: "Incremental positioning",
    modal_group: 3,
    transform: (s) => ({ ...s, positioning_mode: "G91" as PositioningMode }),
  },

  // Units (Modal Group 6)
  G20: {
    code: "G20",
    category: "units",
    description: "Inch units",
    modal_group: 6,
    transform: (s) => ({ ...s, units: "G20" as UnitMode }),
  },
  G21: {
    code: "G21",
    category: "units",
    description: "Metric units",
    modal_group: 6,
    transform: (s) => ({ ...s, units: "G21" as UnitMode }),
  },

  // Feed Mode (Modal Group 5)
  G94: {
    code: "G94",
    category: "feed_mode",
    description: "Feed per minute",
    modal_group: 5,
    transform: (s) => ({ ...s, feed_mode: "G94" as FeedMode }),
  },
  G95: {
    code: "G95",
    category: "feed_mode",
    description: "Feed per revolution",
    modal_group: 5,
    transform: (s) => ({ ...s, feed_mode: "G95" as FeedMode }),
  },

  // Spindle Mode
  G96: {
    code: "G96",
    category: "spindle_mode",
    description: "Constant surface speed",
    transform: (s) => ({ ...s, spindle_mode: "G96" as SpindleMode }),
  },
  G97: {
    code: "G97",
    category: "spindle_mode",
    description: "Constant RPM",
    transform: (s) => ({ ...s, spindle_mode: "G97" as SpindleMode }),
  },

  // Work Offsets (Modal Group 12)
  G54: {
    code: "G54",
    category: "work_offset",
    description: "Work coordinate system 1",
    modal_group: 12,
    transform: (s) => ({ ...s, work_offset: "G54" as WorkOffsetMode }),
  },
  G55: {
    code: "G55",
    category: "work_offset",
    description: "Work coordinate system 2",
    modal_group: 12,
    transform: (s) => ({ ...s, work_offset: "G55" as WorkOffsetMode }),
  },
  G56: {
    code: "G56",
    category: "work_offset",
    description: "Work coordinate system 3",
    modal_group: 12,
    transform: (s) => ({ ...s, work_offset: "G56" as WorkOffsetMode }),
  },
  G57: {
    code: "G57",
    category: "work_offset",
    description: "Work coordinate system 4",
    modal_group: 12,
    transform: (s) => ({ ...s, work_offset: "G57" as WorkOffsetMode }),
  },
  G58: {
    code: "G58",
    category: "work_offset",
    description: "Work coordinate system 5",
    modal_group: 12,
    transform: (s) => ({ ...s, work_offset: "G58" as WorkOffsetMode }),
  },
  G59: {
    code: "G59",
    category: "work_offset",
    description: "Work coordinate system 6",
    modal_group: 12,
    transform: (s) => ({ ...s, work_offset: "G59" as WorkOffsetMode }),
  },

  // Non-modal codes
  G4: {
    code: "G4",
    category: "dwell",
    description: "Dwell",
    transform: (s) => s, // No state change, just time delay
  },
  G28: {
    code: "G28",
    category: "reference",
    description: "Return to home position",
    transform: (s) => ({ ...s, x: 0, z: 0 }),
  },
  G50: {
    code: "G50",
    category: "coordinate",
    description: "Set coordinate system / max spindle speed",
    transform: (s) => s, // Handled by arguments
  },

  // Canned Cycles (Lathe)
  G70: {
    code: "G70",
    category: "canned_cycle",
    description: "Finishing cycle",
    transform: (s) => ({ ...s, canned_cycle: "G70" as CannedCycleMode }),
  },
  G71: {
    code: "G71",
    category: "canned_cycle",
    description: "Roughing cycle (OD)",
    transform: (s) => ({ ...s, canned_cycle: "G71" as CannedCycleMode }),
  },
  G72: {
    code: "G72",
    category: "canned_cycle",
    description: "Roughing cycle (facing)",
    transform: (s) => ({ ...s, canned_cycle: "G72" as CannedCycleMode }),
  },
  G73: {
    code: "G73",
    category: "canned_cycle",
    description: "Pattern repeating cycle",
    transform: (s) => ({ ...s, canned_cycle: "G73" as CannedCycleMode }),
  },
  G74: {
    code: "G74",
    category: "canned_cycle",
    description: "Peck drilling cycle (Z)",
    transform: (s) => ({ ...s, canned_cycle: "G74" as CannedCycleMode }),
  },
  G75: {
    code: "G75",
    category: "canned_cycle",
    description: "Grooving cycle (X)",
    transform: (s) => ({ ...s, canned_cycle: "G75" as CannedCycleMode }),
  },
  G76: {
    code: "G76",
    category: "canned_cycle",
    description: "Threading cycle",
    transform: (s) => ({ ...s, canned_cycle: "G76" as CannedCycleMode }),
  },
  G80: {
    code: "G80",
    category: "canned_cycle",
    description: "Cancel canned cycle",
    transform: (s) => ({ ...s, canned_cycle: null }),
  },
};

// ============================================================================
// M-CODE SEMANTICS TABLE
// ============================================================================

const M_CODE_SEMANTICS: Record<string, MCodeSemantics> = {
  M0: {
    code: "M0",
    category: "program",
    description: "Program stop",
    transform: (s) => ({ ...s, program_paused: true }),
  },
  M1: {
    code: "M1",
    category: "program",
    description: "Optional stop",
    transform: (s) => ({ ...s, program_paused: s.optional_stop_active }),
  },
  M2: {
    code: "M2",
    category: "program",
    description: "Program end",
    transform: (s) => ({ ...s, program_running: false, spindle_direction: "off", coolant: "off" }),
  },
  M3: {
    code: "M3",
    category: "spindle",
    description: "Spindle on CW",
    transform: (s) => ({ ...s, spindle_direction: "cw" }),
  },
  M4: {
    code: "M4",
    category: "spindle",
    description: "Spindle on CCW",
    transform: (s) => ({ ...s, spindle_direction: "ccw" }),
  },
  M5: {
    code: "M5",
    category: "spindle",
    description: "Spindle stop",
    transform: (s) => ({ ...s, spindle_direction: "off" }),
  },
  M6: {
    code: "M6",
    category: "tool",
    description: "Tool change",
    transform: (s) => s, // Tool number set by T word
  },
  M7: {
    code: "M7",
    category: "coolant",
    description: "Mist coolant on",
    transform: (s) => ({ ...s, coolant: s.coolant === "flood" ? "both" : "mist" }),
  },
  M8: {
    code: "M8",
    category: "coolant",
    description: "Flood coolant on",
    transform: (s) => ({ ...s, coolant: s.coolant === "mist" ? "both" : "flood" }),
  },
  M9: {
    code: "M9",
    category: "coolant",
    description: "Coolant off",
    transform: (s) => ({ ...s, coolant: "off" }),
  },
  M30: {
    code: "M30",
    category: "program",
    description: "Program end and rewind",
    transform: (s) => ({ ...s, program_running: false, spindle_direction: "off", coolant: "off" }),
  },
  M98: {
    code: "M98",
    category: "subprogram",
    description: "Subprogram call",
    transform: (s) => s, // Subprogram handled externally
  },
  M99: {
    code: "M99",
    category: "subprogram",
    description: "Subprogram return",
    transform: (s) => s,
  },
};

// ============================================================================
// WORD SEMANTICS TABLE
// ============================================================================

const WORD_SEMANTICS: Record<string, WordSemantics> = {
  X: {
    word: "X",
    description: "X axis position",
    parse: (value, state) => {
      const converted = state.units === "G20" ? value * 25.4 : value;
      if (state.positioning_mode === "G91") {
        return { x: state.x + converted };
      }
      return { x: converted };
    },
  },
  Z: {
    word: "Z",
    description: "Z axis position",
    parse: (value, state) => {
      const converted = state.units === "G20" ? value * 25.4 : value;
      if (state.positioning_mode === "G91") {
        return { z: state.z + converted };
      }
      return { z: converted };
    },
  },
  F: {
    word: "F",
    description: "Feedrate",
    parse: (value) => ({ feedrate: value }),
  },
  S: {
    word: "S",
    description: "Spindle speed",
    parse: (value) => ({ spindle_speed: value }),
  },
  T: {
    word: "T",
    description: "Tool selection",
    parse: (value) => ({
      tool_number: Math.floor(value / 100) || value,
      tool_offset: value % 100,
    }),
  },
};

// ============================================================================
// DIALECT NORMALIZATION
// ============================================================================

const DIALECT_MAPPINGS: Record<Dialect, Record<string, string>> = {
  fanuc: {},
  okuma: {
    G90: "G90", // Same in Okuma
    G91: "G91",
    G98: "G94", // Okuma G98 = Fanuc G94 (feed per minute)
    G99: "G95", // Okuma G99 = Fanuc G95 (feed per rev)
  },
  rs274: {},
  haas: {},
  mazak: {
    G112: "G18", // Mazak cylindrical interpolation → use XZ plane
  },
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheDenotationalSemanticsEngine {
  private gCodeTable: Map<string, GCodeSemantics> = new Map();
  private mCodeTable: Map<string, MCodeSemantics> = new Map();
  private wordTable: Map<string, WordSemantics> = new Map();

  constructor() {
    // Initialize tables
    for (const [code, semantics] of Object.entries(G_CODE_SEMANTICS)) {
      this.gCodeTable.set(code, semantics);
    }
    for (const [code, semantics] of Object.entries(M_CODE_SEMANTICS)) {
      this.mCodeTable.set(code, semantics);
    }
    for (const [word, semantics] of Object.entries(WORD_SEMANTICS)) {
      this.wordTable.set(word, semantics);
    }
  }

  // --------------------------------------------------------------------------
  // Semantic Lookup
  // --------------------------------------------------------------------------

  getGCodeSemantics(code: string): GCodeSemantics | null {
    return this.gCodeTable.get(code.toUpperCase()) || null;
  }

  getMCodeSemantics(code: string): MCodeSemantics | null {
    return this.mCodeTable.get(code.toUpperCase()) || null;
  }

  getWordSemantics(word: string): WordSemantics | null {
    return this.wordTable.get(word.toUpperCase()) || null;
  }

  getAllGCodes(): GCodeSemantics[] {
    return Array.from(this.gCodeTable.values());
  }

  getAllMCodes(): MCodeSemantics[] {
    return Array.from(this.mCodeTable.values());
  }

  // --------------------------------------------------------------------------
  // State Transformation
  // --------------------------------------------------------------------------

  applyGCode(code: string, state: MachineState): MachineState {
    const semantics = this.getGCodeSemantics(code);
    if (!semantics) return state;
    return semantics.transform(state);
  }

  applyMCode(code: string, state: MachineState): MachineState {
    const semantics = this.getMCodeSemantics(code);
    if (!semantics) return state;
    return semantics.transform(state);
  }

  applyWord(word: string, value: number, state: MachineState): MachineState {
    const semantics = this.getWordSemantics(word);
    if (!semantics) return state;
    const partial = semantics.parse(value, state);
    return { ...state, ...partial };
  }

  // --------------------------------------------------------------------------
  // Block Execution
  // --------------------------------------------------------------------------

  executeBlock(block: string, state: MachineState): MachineState {
    let currentState = { ...state };
    const normalized = block.toUpperCase().trim();

    // Extract and apply G-codes
    const gCodes = normalized.match(/G\d+(\.\d+)?/g) || [];
    for (const gCode of gCodes) {
      currentState = this.applyGCode(gCode.replace(".", ""), currentState);
    }

    // Extract and apply M-codes
    const mCodes = normalized.match(/M\d+/g) || [];
    for (const mCode of mCodes) {
      currentState = this.applyMCode(mCode, currentState);
    }

    // Extract and apply words
    const wordMatches = normalized.matchAll(/([XZFSTIJKRPQ])([+-]?\d*\.?\d+)/g);
    for (const match of wordMatches) {
      const word = match[1];
      const value = parseFloat(match[2]);
      currentState = this.applyWord(word, value, currentState);
    }

    return currentState;
  }

  executeProgram(program: string, initialState?: Partial<MachineState>): MachineState[] {
    const states: MachineState[] = [];
    let currentState: MachineState = { ...INITIAL_STATE, ...initialState };
    states.push(currentState);

    const lines = program.split("\n").filter((l) => {
      const trimmed = l.trim();
      return trimmed && !trimmed.startsWith("(") && !trimmed.startsWith("%") && !trimmed.startsWith("O");
    });

    for (const line of lines) {
      currentState = this.executeBlock(line, currentState);
      states.push(currentState);
    }

    return states;
  }

  // --------------------------------------------------------------------------
  // Dialect Normalization
  // --------------------------------------------------------------------------

  detectDialect(program: string): Dialect {
    const upper = program.toUpperCase();

    // Okuma indicators
    if (upper.includes("G98") || upper.includes("G99")) {
      // Check if used in feed context (Okuma style)
      if (upper.match(/G9[89]\s*F/)) return "okuma";
    }

    // Mazak indicators
    if (upper.includes("G112")) return "mazak";

    // Default to Fanuc/RS274
    return "fanuc";
  }

  normalizeToRS274(program: string, dialect?: Dialect): NormalizationResult {
    const detectedDialect = dialect || this.detectDialect(program);
    const mappings = DIALECT_MAPPINGS[detectedDialect];
    const transformations: string[] = [];

    let normalized = program;

    for (const [from, to] of Object.entries(mappings)) {
      if (from !== to && normalized.toUpperCase().includes(from)) {
        const regex = new RegExp(from, "gi");
        normalized = normalized.replace(regex, to);
        transformations.push(`${from} → ${to}`);
      }
    }

    return {
      original: program,
      normalized,
      dialect_detected: detectedDialect,
      transformations,
    };
  }

  // --------------------------------------------------------------------------
  // Algebraic Composition
  // --------------------------------------------------------------------------

  compose(...transformers: StateTransformer[]): StateTransformer {
    return (state: MachineState) => {
      let current = state;
      for (const t of transformers) {
        current = t(current);
      }
      return current;
    };
  }

  composeBlocks(blocks: string[]): StateTransformer {
    return (state: MachineState) => {
      let current = state;
      for (const block of blocks) {
        current = this.executeBlock(block, current);
      }
      return current;
    };
  }

  // --------------------------------------------------------------------------
  // Equivalence Testing
  // --------------------------------------------------------------------------

  statesEqual(a: MachineState, b: MachineState, tolerance: number = 0.0001): boolean {
    if (Math.abs(a.x - b.x) > tolerance) return false;
    if (Math.abs(a.z - b.z) > tolerance) return false;
    if (a.motion_mode !== b.motion_mode) return false;
    if (a.positioning_mode !== b.positioning_mode) return false;
    if (a.units !== b.units) return false;
    if (a.feed_mode !== b.feed_mode) return false;
    if (a.spindle_mode !== b.spindle_mode) return false;
    if (Math.abs(a.feedrate - b.feedrate) > tolerance) return false;
    if (Math.abs(a.spindle_speed - b.spindle_speed) > tolerance) return false;
    if (a.tool_number !== b.tool_number) return false;
    if (a.spindle_direction !== b.spindle_direction) return false;
    if (a.coolant !== b.coolant) return false;
    return true;
  }

  verifyRoundTrip(
    program: string,
    referenceExecutor: (program: string) => MachineState[]
  ): { match: boolean; differences: string[] } {
    const denotationalStates = this.executeProgram(program);
    const referenceStates = referenceExecutor(program);

    const differences: string[] = [];

    const minLen = Math.min(denotationalStates.length, referenceStates.length);
    for (let i = 0; i < minLen; i++) {
      if (!this.statesEqual(denotationalStates[i], referenceStates[i])) {
        differences.push(`Block ${i}: state mismatch`);
      }
    }

    if (denotationalStates.length !== referenceStates.length) {
      differences.push(`State count mismatch: ${denotationalStates.length} vs ${referenceStates.length}`);
    }

    return {
      match: differences.length === 0,
      differences,
    };
  }

  // --------------------------------------------------------------------------
  // Coverage Analysis
  // --------------------------------------------------------------------------

  getCoverage(): {
    g_codes: number;
    m_codes: number;
    words: number;
    total: number;
  } {
    return {
      g_codes: this.gCodeTable.size,
      m_codes: this.mCodeTable.size,
      words: this.wordTable.size,
      total: this.gCodeTable.size + this.mCodeTable.size + this.wordTable.size,
    };
  }

  getUncoveredCodes(usedCodes: string[]): string[] {
    const covered = new Set([
      ...this.gCodeTable.keys(),
      ...this.mCodeTable.keys(),
    ]);
    return usedCodes.filter((code) => !covered.has(code.toUpperCase()));
  }

  // --------------------------------------------------------------------------
  // Initial State
  // --------------------------------------------------------------------------

  createInitialState(overrides?: Partial<MachineState>): MachineState {
    return { ...INITIAL_STATE, ...overrides };
  }
}

export const latheDenotationalSemanticsEngine = new LatheDenotationalSemanticsEngine();
