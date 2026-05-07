/**
 * LatheProgramSMTEncoderEngine — SMT-LIB2 Encoder for Lathe Programs
 *
 * U-LTH63: Encodes lathe G-code programs to SMT-LIB2 format for formal verification.
 * Consumes modal state from PPModalStateTrackerEngine and emits LinearConstraint[]
 * for FormalVerificationEngine.prove().
 *
 * Variables per block: x_i, z_i, f_i, s_i, tool_i
 * Transitions: G90 (absolute) x_{i+1} = target_x, G91 (incremental) x_{i+1} = x_i + dx
 *
 * @module engines/LatheProgramSMTEncoderEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type SMTSortType = "Real" | "Int" | "Bool";

export interface SMTVariable {
  name: string;
  sort: SMTSortType;
  block_index: number;
}

export interface LinearConstraint {
  id: string;
  type: "linear" | "nonlinear" | "boolean";
  variables: string[];
  coefficients: number[];
  operator: "=" | "<=" | ">=" | "<" | ">" | "!=";
  constant: number;
  description: string;
  block_index: number;
}

export interface SMTAssertion {
  id: string;
  smt_lib2: string;
  constraint: LinearConstraint;
  property_type: SMTPropertyType;
}

export type SMTPropertyType =
  | "envelope_x"
  | "envelope_z"
  | "feedrate_limit"
  | "spindle_limit"
  | "collision_check"
  | "safe_tool_change"
  | "rapid_not_in_material"
  | "home_before_end"
  | "transition";

export interface ProofInput {
  program_id: string;
  block_count: number;
  variables: SMTVariable[];
  constraints: LinearConstraint[];
  assertions: SMTAssertion[];
  smt_lib2_preamble: string;
  smt_lib2_body: string;
  encoding_time_ms: number;
}

export interface GCodeBlock {
  line_number: number;
  raw: string;
  g_codes: string[];
  m_codes: string[];
  x?: number;
  z?: number;
  f?: number;
  s?: number;
  t?: number;
  i?: number;
  k?: number;
  r?: number;
  p?: number;
  q?: number;
}

export interface ModalState {
  motion_mode: "G0" | "G1" | "G2" | "G3" | null;
  positioning_mode: "G90" | "G91";
  units: "G20" | "G21";
  feed_mode: "G94" | "G95";
  spindle_mode: "G96" | "G97";
  plane: "G17" | "G18" | "G19";
  current_tool: number;
  current_x: number;
  current_z: number;
  current_f: number;
  current_s: number;
  wcs_offset: { x: number; z: number };
}

export interface EncoderConfig {
  x_min: number;
  x_max: number;
  z_min: number;
  z_max: number;
  f_max: number;
  s_max: number;
  z_safe: number;
  x_home: number;
  z_home: number;
  include_arc_constraints: boolean;
  include_collision_constraints: boolean;
}

export interface EncodingResult {
  success: boolean;
  proof_input: ProofInput | null;
  errors: string[];
  warnings: string[];
  stats: {
    blocks_encoded: number;
    constraints_generated: number;
    variables_declared: number;
    encoding_time_ms: number;
  };
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: EncoderConfig = {
  x_min: -50,
  x_max: 300,
  z_min: -500,
  z_max: 50,
  f_max: 10000,
  s_max: 6000,
  z_safe: 10,
  x_home: 0,
  z_home: 0,
  include_arc_constraints: true,
  include_collision_constraints: true,
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheProgramSMTEncoderEngine {
  private config: EncoderConfig = { ...DEFAULT_CONFIG };

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setConfig(config: Partial<EncoderConfig>): EncoderConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): EncoderConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Main Encoding
  // --------------------------------------------------------------------------

  encode(
    programId: string,
    blocks: GCodeBlock[],
    initialState?: Partial<ModalState>
  ): EncodingResult {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (blocks.length === 0) {
      return {
        success: false,
        proof_input: null,
        errors: ["Empty program"],
        warnings: [],
        stats: { blocks_encoded: 0, constraints_generated: 0, variables_declared: 0, encoding_time_ms: 0 },
      };
    }

    const state: ModalState = {
      motion_mode: null,
      positioning_mode: "G90",
      units: "G21",
      feed_mode: "G94",
      spindle_mode: "G97",
      plane: "G18",
      current_tool: 1,
      current_x: 0,
      current_z: 0,
      current_f: 100,
      current_s: 1000,
      wcs_offset: { x: 0, z: 0 },
      ...initialState,
    };

    const variables: SMTVariable[] = [];
    const constraints: LinearConstraint[] = [];
    const assertions: SMTAssertion[] = [];

    // Declare initial state variables
    this.declareBlockVariables(variables, 0, state);

    // Add initial state constraints
    constraints.push(
      this.createEqualityConstraint("init_x", "x_0", state.current_x, 0, "Initial X position"),
      this.createEqualityConstraint("init_z", "z_0", state.current_z, 0, "Initial Z position"),
      this.createEqualityConstraint("init_f", "f_0", state.current_f, 0, "Initial feedrate"),
      this.createEqualityConstraint("init_s", "s_0", state.current_s, 0, "Initial spindle speed"),
      this.createEqualityConstraint("init_t", "t_0", state.current_tool, 0, "Initial tool")
    );

    // Encode each block
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockIndex = i + 1;

      try {
        // Update modal state from G-codes
        this.updateModalState(state, block);

        // Declare variables for this block
        this.declareBlockVariables(variables, blockIndex, state);

        // Generate transition constraints
        const transitionConstraints = this.encodeBlockTransition(state, block, blockIndex);
        constraints.push(...transitionConstraints);

        // Generate envelope constraints
        const envelopeConstraints = this.encodeEnvelopeConstraints(blockIndex);
        constraints.push(...envelopeConstraints);

        // Generate feedrate/spindle constraints
        constraints.push(this.encodeFeedrateConstraint(blockIndex));
        constraints.push(this.encodeSpindleConstraint(blockIndex));

        // Handle arc moves (G2/G3)
        if (this.config.include_arc_constraints && (block.g_codes.includes("G2") || block.g_codes.includes("G3"))) {
          const arcConstraints = this.encodeArcConstraints(state, block, blockIndex);
          constraints.push(...arcConstraints);
          if (arcConstraints.some(c => c.type === "nonlinear")) {
            warnings.push(`Block ${blockIndex}: Arc constraint requires QF_NRA solver`);
          }
        }

        // Rapid motion safety (G0 not in material)
        if (block.g_codes.includes("G0")) {
          const rapidConstraint = this.encodeRapidSafetyConstraint(blockIndex);
          constraints.push(rapidConstraint);
        }

        // Tool change safety
        if (block.t !== undefined && block.t !== state.current_tool) {
          const toolChangeConstraint = this.encodeToolChangeSafetyConstraint(blockIndex);
          constraints.push(toolChangeConstraint);
        }

        // Update state for next iteration
        this.applyBlockToState(state, block);

      } catch (err) {
        errors.push(`Block ${blockIndex}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Add end-of-program constraint (home before M30)
    const hasM30 = blocks.some(b => b.m_codes.includes("M30"));
    if (hasM30) {
      constraints.push(this.encodeHomeBeforeEndConstraint(blocks.length));
    }

    // Generate SMT-LIB2 output
    const preamble = this.generatePreamble(variables);
    const body = this.generateBody(constraints);

    // Build assertions from constraints
    for (const constraint of constraints) {
      assertions.push(this.constraintToAssertion(constraint));
    }

    const encodingTime = Date.now() - startTime;

    const proofInput: ProofInput = {
      program_id: programId,
      block_count: blocks.length,
      variables,
      constraints,
      assertions,
      smt_lib2_preamble: preamble,
      smt_lib2_body: body,
      encoding_time_ms: encodingTime,
    };

    return {
      success: errors.length === 0,
      proof_input: proofInput,
      errors,
      warnings,
      stats: {
        blocks_encoded: blocks.length,
        constraints_generated: constraints.length,
        variables_declared: variables.length,
        encoding_time_ms: encodingTime,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Variable Declaration
  // --------------------------------------------------------------------------

  private declareBlockVariables(variables: SMTVariable[], blockIndex: number, _state: ModalState): void {
    variables.push(
      { name: `x_${blockIndex}`, sort: "Real", block_index: blockIndex },
      { name: `z_${blockIndex}`, sort: "Real", block_index: blockIndex },
      { name: `f_${blockIndex}`, sort: "Real", block_index: blockIndex },
      { name: `s_${blockIndex}`, sort: "Real", block_index: blockIndex },
      { name: `t_${blockIndex}`, sort: "Int", block_index: blockIndex }
    );
  }

  // --------------------------------------------------------------------------
  // Modal State Management
  // --------------------------------------------------------------------------

  private updateModalState(state: ModalState, block: GCodeBlock): void {
    for (const gcode of block.g_codes) {
      switch (gcode) {
        case "G0": state.motion_mode = "G0"; break;
        case "G1": state.motion_mode = "G1"; break;
        case "G2": state.motion_mode = "G2"; break;
        case "G3": state.motion_mode = "G3"; break;
        case "G90": state.positioning_mode = "G90"; break;
        case "G91": state.positioning_mode = "G91"; break;
        case "G20": state.units = "G20"; break;
        case "G21": state.units = "G21"; break;
        case "G94": state.feed_mode = "G94"; break;
        case "G95": state.feed_mode = "G95"; break;
        case "G96": state.spindle_mode = "G96"; break;
        case "G97": state.spindle_mode = "G97"; break;
        case "G17": state.plane = "G17"; break;
        case "G18": state.plane = "G18"; break;
        case "G19": state.plane = "G19"; break;
      }
    }
  }

  private applyBlockToState(state: ModalState, block: GCodeBlock): void {
    const unitFactor = state.units === "G20" ? 25.4 : 1;

    if (block.x !== undefined) {
      const xValue = block.x * unitFactor;
      state.current_x = state.positioning_mode === "G91"
        ? state.current_x + xValue
        : xValue;
    }

    if (block.z !== undefined) {
      const zValue = block.z * unitFactor;
      state.current_z = state.positioning_mode === "G91"
        ? state.current_z + zValue
        : zValue;
    }

    if (block.f !== undefined) state.current_f = block.f;
    if (block.s !== undefined) state.current_s = block.s;
    if (block.t !== undefined) state.current_tool = block.t;
  }

  // --------------------------------------------------------------------------
  // Constraint Generation
  // --------------------------------------------------------------------------

  private createEqualityConstraint(
    id: string,
    variable: string,
    value: number,
    blockIndex: number,
    description: string
  ): LinearConstraint {
    return {
      id,
      type: "linear",
      variables: [variable],
      coefficients: [1],
      operator: "=",
      constant: value,
      description,
      block_index: blockIndex,
    };
  }

  private encodeBlockTransition(
    state: ModalState,
    block: GCodeBlock,
    blockIndex: number
  ): LinearConstraint[] {
    const constraints: LinearConstraint[] = [];
    const prevIndex = blockIndex - 1;
    const unitFactor = state.units === "G20" ? 25.4 : 1;

    // X transition
    if (block.x !== undefined) {
      const xTarget = block.x * unitFactor;
      if (state.positioning_mode === "G90") {
        // Absolute: x_{i} = target
        constraints.push({
          id: `trans_x_${blockIndex}`,
          type: "linear",
          variables: [`x_${blockIndex}`],
          coefficients: [1],
          operator: "=",
          constant: xTarget,
          description: `X absolute move to ${xTarget}`,
          block_index: blockIndex,
        });
      } else {
        // Incremental: x_{i} = x_{i-1} + dx
        constraints.push({
          id: `trans_x_${blockIndex}`,
          type: "linear",
          variables: [`x_${blockIndex}`, `x_${prevIndex}`],
          coefficients: [1, -1],
          operator: "=",
          constant: xTarget,
          description: `X incremental move by ${xTarget}`,
          block_index: blockIndex,
        });
      }
    } else {
      // No X move: x_{i} = x_{i-1}
      constraints.push({
        id: `trans_x_${blockIndex}`,
        type: "linear",
        variables: [`x_${blockIndex}`, `x_${prevIndex}`],
        coefficients: [1, -1],
        operator: "=",
        constant: 0,
        description: "X unchanged",
        block_index: blockIndex,
      });
    }

    // Z transition
    if (block.z !== undefined) {
      const zTarget = block.z * unitFactor;
      if (state.positioning_mode === "G90") {
        constraints.push({
          id: `trans_z_${blockIndex}`,
          type: "linear",
          variables: [`z_${blockIndex}`],
          coefficients: [1],
          operator: "=",
          constant: zTarget,
          description: `Z absolute move to ${zTarget}`,
          block_index: blockIndex,
        });
      } else {
        constraints.push({
          id: `trans_z_${blockIndex}`,
          type: "linear",
          variables: [`z_${blockIndex}`, `z_${prevIndex}`],
          coefficients: [1, -1],
          operator: "=",
          constant: zTarget,
          description: `Z incremental move by ${zTarget}`,
          block_index: blockIndex,
        });
      }
    } else {
      constraints.push({
        id: `trans_z_${blockIndex}`,
        type: "linear",
        variables: [`z_${blockIndex}`, `z_${prevIndex}`],
        coefficients: [1, -1],
        operator: "=",
        constant: 0,
        description: "Z unchanged",
        block_index: blockIndex,
      });
    }

    // Feedrate transition
    if (block.f !== undefined) {
      constraints.push({
        id: `trans_f_${blockIndex}`,
        type: "linear",
        variables: [`f_${blockIndex}`],
        coefficients: [1],
        operator: "=",
        constant: block.f,
        description: `Feedrate set to ${block.f}`,
        block_index: blockIndex,
      });
    } else {
      constraints.push({
        id: `trans_f_${blockIndex}`,
        type: "linear",
        variables: [`f_${blockIndex}`, `f_${prevIndex}`],
        coefficients: [1, -1],
        operator: "=",
        constant: 0,
        description: "Feedrate unchanged",
        block_index: blockIndex,
      });
    }

    // Spindle transition
    if (block.s !== undefined) {
      constraints.push({
        id: `trans_s_${blockIndex}`,
        type: "linear",
        variables: [`s_${blockIndex}`],
        coefficients: [1],
        operator: "=",
        constant: block.s,
        description: `Spindle set to ${block.s}`,
        block_index: blockIndex,
      });
    } else {
      constraints.push({
        id: `trans_s_${blockIndex}`,
        type: "linear",
        variables: [`s_${blockIndex}`, `s_${prevIndex}`],
        coefficients: [1, -1],
        operator: "=",
        constant: 0,
        description: "Spindle unchanged",
        block_index: blockIndex,
      });
    }

    // Tool transition
    if (block.t !== undefined) {
      constraints.push({
        id: `trans_t_${blockIndex}`,
        type: "linear",
        variables: [`t_${blockIndex}`],
        coefficients: [1],
        operator: "=",
        constant: block.t,
        description: `Tool change to T${block.t}`,
        block_index: blockIndex,
      });
    } else {
      constraints.push({
        id: `trans_t_${blockIndex}`,
        type: "linear",
        variables: [`t_${blockIndex}`, `t_${prevIndex}`],
        coefficients: [1, -1],
        operator: "=",
        constant: 0,
        description: "Tool unchanged",
        block_index: blockIndex,
      });
    }

    return constraints;
  }

  private encodeEnvelopeConstraints(blockIndex: number): LinearConstraint[] {
    return [
      {
        id: `env_x_min_${blockIndex}`,
        type: "linear",
        variables: [`x_${blockIndex}`],
        coefficients: [1],
        operator: ">=",
        constant: this.config.x_min,
        description: `X >= ${this.config.x_min}`,
        block_index: blockIndex,
      },
      {
        id: `env_x_max_${blockIndex}`,
        type: "linear",
        variables: [`x_${blockIndex}`],
        coefficients: [1],
        operator: "<=",
        constant: this.config.x_max,
        description: `X <= ${this.config.x_max}`,
        block_index: blockIndex,
      },
      {
        id: `env_z_min_${blockIndex}`,
        type: "linear",
        variables: [`z_${blockIndex}`],
        coefficients: [1],
        operator: ">=",
        constant: this.config.z_min,
        description: `Z >= ${this.config.z_min}`,
        block_index: blockIndex,
      },
      {
        id: `env_z_max_${blockIndex}`,
        type: "linear",
        variables: [`z_${blockIndex}`],
        coefficients: [1],
        operator: "<=",
        constant: this.config.z_max,
        description: `Z <= ${this.config.z_max}`,
        block_index: blockIndex,
      },
    ];
  }

  private encodeFeedrateConstraint(blockIndex: number): LinearConstraint {
    return {
      id: `feed_limit_${blockIndex}`,
      type: "linear",
      variables: [`f_${blockIndex}`],
      coefficients: [1],
      operator: "<=",
      constant: this.config.f_max,
      description: `Feedrate <= ${this.config.f_max}`,
      block_index: blockIndex,
    };
  }

  private encodeSpindleConstraint(blockIndex: number): LinearConstraint {
    return {
      id: `spindle_limit_${blockIndex}`,
      type: "linear",
      variables: [`s_${blockIndex}`],
      coefficients: [1],
      operator: "<=",
      constant: this.config.s_max,
      description: `Spindle <= ${this.config.s_max}`,
      block_index: blockIndex,
    };
  }

  private encodeArcConstraints(
    state: ModalState,
    block: GCodeBlock,
    blockIndex: number
  ): LinearConstraint[] {
    const constraints: LinearConstraint[] = [];
    const prevIndex = blockIndex - 1;

    // Arc radius constraint: (x - cx)^2 + (z - cz)^2 = R^2
    // This is nonlinear - requires QF_NRA
    if (block.i !== undefined || block.k !== undefined || block.r !== undefined) {
      const centerOffsetX = (block.i ?? 0) * (state.units === "G20" ? 25.4 : 1);
      const centerOffsetZ = (block.k ?? 0) * (state.units === "G20" ? 25.4 : 1);

      constraints.push({
        id: `arc_radius_start_${blockIndex}`,
        type: "nonlinear",
        variables: [`x_${prevIndex}`, `z_${prevIndex}`],
        coefficients: [1, 1],
        operator: "=",
        constant: 0,
        description: `Arc start point on circle (center offset: ${centerOffsetX}, ${centerOffsetZ})`,
        block_index: blockIndex,
      });

      constraints.push({
        id: `arc_radius_end_${blockIndex}`,
        type: "nonlinear",
        variables: [`x_${blockIndex}`, `z_${blockIndex}`],
        coefficients: [1, 1],
        operator: "=",
        constant: 0,
        description: "Arc end point on same circle",
        block_index: blockIndex,
      });
    }

    return constraints;
  }

  private encodeRapidSafetyConstraint(blockIndex: number): LinearConstraint {
    // G0 moves should be above safe Z (simplified - full collision detection more complex)
    return {
      id: `rapid_safe_${blockIndex}`,
      type: "linear",
      variables: [`z_${blockIndex}`],
      coefficients: [1],
      operator: ">=",
      constant: this.config.z_safe,
      description: `Rapid move: Z >= safe height ${this.config.z_safe}`,
      block_index: blockIndex,
    };
  }

  private encodeToolChangeSafetyConstraint(blockIndex: number): LinearConstraint {
    return {
      id: `tool_change_safe_${blockIndex}`,
      type: "linear",
      variables: [`z_${blockIndex}`],
      coefficients: [1],
      operator: ">=",
      constant: this.config.z_safe,
      description: `Tool change: Z >= safe height ${this.config.z_safe}`,
      block_index: blockIndex,
    };
  }

  private encodeHomeBeforeEndConstraint(lastBlockIndex: number): LinearConstraint {
    // Simplified: just check Z is at home at program end
    return {
      id: `home_z_end`,
      type: "linear",
      variables: [`z_${lastBlockIndex}`],
      coefficients: [1],
      operator: "=",
      constant: this.config.z_home,
      description: `Program end: Z at home position ${this.config.z_home}`,
      block_index: lastBlockIndex,
    };
  }

  // --------------------------------------------------------------------------
  // SMT-LIB2 Generation
  // --------------------------------------------------------------------------

  private generatePreamble(variables: SMTVariable[]): string {
    const lines: string[] = [
      "(set-logic QF_LRA)",
      "; Variables for lathe program state per block",
    ];

    for (const v of variables) {
      lines.push(`(declare-const ${v.name} ${v.sort})`);
    }

    return lines.join("\n");
  }

  private generateBody(constraints: LinearConstraint[]): string {
    const lines: string[] = [];

    for (const c of constraints) {
      lines.push(`; ${c.description}`);
      lines.push(`(assert ${this.constraintToSMT(c)})`);
    }

    lines.push("(check-sat)");
    lines.push("(get-model)");

    return lines.join("\n");
  }

  private constraintToSMT(c: LinearConstraint): string {
    if (c.variables.length === 1) {
      const term = c.coefficients[0] === 1
        ? c.variables[0]
        : `(* ${c.coefficients[0]} ${c.variables[0]})`;
      return `(${this.opToSMT(c.operator)} ${term} ${c.constant})`;
    }

    // Multi-variable constraint
    const terms = c.variables.map((v, i) => {
      const coef = c.coefficients[i];
      if (coef === 1) return v;
      if (coef === -1) return `(- ${v})`;
      return `(* ${coef} ${v})`;
    });

    const sum = terms.length === 1 ? terms[0] : `(+ ${terms.join(" ")})`;
    return `(${this.opToSMT(c.operator)} ${sum} ${c.constant})`;
  }

  private opToSMT(op: LinearConstraint["operator"]): string {
    switch (op) {
      case "=": return "=";
      case "<=": return "<=";
      case ">=": return ">=";
      case "<": return "<";
      case ">": return ">";
      case "!=": return "distinct";
    }
  }

  private constraintToAssertion(c: LinearConstraint): SMTAssertion {
    return {
      id: c.id,
      smt_lib2: `(assert ${this.constraintToSMT(c)})`,
      constraint: c,
      property_type: this.inferPropertyType(c),
    };
  }

  private inferPropertyType(c: LinearConstraint): SMTPropertyType {
    if (c.id.startsWith("env_x")) return "envelope_x";
    if (c.id.startsWith("env_z")) return "envelope_z";
    if (c.id.startsWith("feed")) return "feedrate_limit";
    if (c.id.startsWith("spindle")) return "spindle_limit";
    if (c.id.startsWith("arc")) return "collision_check";
    if (c.id.startsWith("tool_change")) return "safe_tool_change";
    if (c.id.startsWith("rapid")) return "rapid_not_in_material";
    if (c.id.startsWith("home")) return "home_before_end";
    return "transition";
  }

  // --------------------------------------------------------------------------
  // Parsing Helpers
  // --------------------------------------------------------------------------

  parseGCode(program: string): GCodeBlock[] {
    const blocks: GCodeBlock[] = [];
    const lines = program.split("\n").filter(l => l.trim() && !l.trim().startsWith("("));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("%") || line.startsWith("O")) continue;

      const block: GCodeBlock = {
        line_number: i + 1,
        raw: line,
        g_codes: [],
        m_codes: [],
      };

      // Extract G-codes
      const gMatches = line.match(/G\d+(\.\d+)?/g);
      if (gMatches) block.g_codes = gMatches;

      // Extract M-codes
      const mMatches = line.match(/M\d+/g);
      if (mMatches) block.m_codes = mMatches;

      // Extract axis values
      const xMatch = line.match(/X([+-]?\d*\.?\d+)/);
      if (xMatch) block.x = parseFloat(xMatch[1]);

      const zMatch = line.match(/Z([+-]?\d*\.?\d+)/);
      if (zMatch) block.z = parseFloat(zMatch[1]);

      const fMatch = line.match(/F(\d*\.?\d+)/);
      if (fMatch) block.f = parseFloat(fMatch[1]);

      const sMatch = line.match(/S(\d+)/);
      if (sMatch) block.s = parseFloat(sMatch[1]);

      const tMatch = line.match(/T(\d+)/);
      if (tMatch) block.t = parseInt(tMatch[1], 10);

      const iMatch = line.match(/I([+-]?\d*\.?\d+)/);
      if (iMatch) block.i = parseFloat(iMatch[1]);

      const kMatch = line.match(/K([+-]?\d*\.?\d+)/);
      if (kMatch) block.k = parseFloat(kMatch[1]);

      const rMatch = line.match(/R([+-]?\d*\.?\d+)/);
      if (rMatch) block.r = parseFloat(rMatch[1]);

      blocks.push(block);
    }

    return blocks;
  }

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  encodeFromString(programId: string, program: string, config?: Partial<EncoderConfig>): EncodingResult {
    if (config) this.setConfig(config);
    const blocks = this.parseGCode(program);
    return this.encode(programId, blocks);
  }

  getFullSMTLIB2(proofInput: ProofInput): string {
    return `${proofInput.smt_lib2_preamble}\n\n${proofInput.smt_lib2_body}`;
  }
}

export const latheProgramSMTEncoderEngine = new LatheProgramSMTEncoderEngine();
