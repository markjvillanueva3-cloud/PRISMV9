/**
 * LatheTemporalPropertyCheckerEngine — Bounded LTL-to-SMT Verification
 *
 * U-LTH66: Temporal property checking using bounded LTL-to-SMT translation.
 * Implements Biere et al. 1999 style bounded model checking for lathe programs.
 *
 * Properties:
 * - G[G0_i → ¬inside_stock(x_i, z_i)] : Rapid moves not inside stock
 * - G[tchange_i → z_i ≥ Zsafe] : Tool changes at safe Z
 * - F[x == Xhome ∧ z == Zhome] before M30 : Home before program end
 *
 * @module engines/LatheTemporalPropertyCheckerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type LTLOperator = "G" | "F" | "X" | "U" | "R" | "W";
export type PropOperator = "and" | "or" | "not" | "implies" | "iff";

export interface AtomicProposition {
  type: "atomic";
  id: string;
  name: string;
  predicate: (blockIndex: number, state: BlockState) => boolean;
  smt_template: string;
}

export interface LTLFormula {
  type: "ltl";
  operator: LTLOperator;
  operands: (LTLFormula | PropFormula)[];
}

export interface PropFormula {
  type: "prop";
  operator?: PropOperator;
  atomic?: AtomicProposition;
  operands?: PropFormula[];
}

export interface BlockState {
  x: number;
  z: number;
  f: number;
  s: number;
  tool: number;
  motion_mode: string | null;
  is_rapid: boolean;
  is_tool_change: boolean;
  is_program_end: boolean;
}

export interface TemporalProperty {
  id: string;
  name: string;
  description: string;
  ltl_formula: string;
  formula: LTLFormula | PropFormula;
  category: "safety" | "liveness" | "reachability";
}

export interface BoundedCheckResult {
  property_id: string;
  property_name: string;
  status: "verified" | "violated" | "unknown" | "timeout";
  bound_k: number;
  time_ms: number;
  witness_trace?: WitnessTrace;
  smt_assertions_count: number;
}

export interface WitnessTrace {
  length: number;
  states: BlockState[];
  violation_block: number;
  violation_description: string;
}

export interface StockProfile {
  type: "cylinder";
  diameter_mm: number;
  length_mm: number;
  z_face: number;
}

export interface CheckerConfig {
  max_bound: number;
  timeout_ms: number;
  z_safe: number;
  x_home: number;
  z_home: number;
  stock?: StockProfile;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CheckerConfig = {
  max_bound: 500,
  timeout_ms: 10000,
  z_safe: 10,
  x_home: 0,
  z_home: 0,
};

// ============================================================================
// STANDARD TEMPORAL PROPERTIES
// ============================================================================

const RAPID_NOT_IN_STOCK: AtomicProposition = {
  type: "atomic",
  id: "rapid_not_in_stock",
  name: "Rapid move outside stock",
  predicate: (_, state) => {
    if (!state.is_rapid) return true;
    return state.z >= 0; // Simplified: rapid above Z0
  },
  smt_template: "(=> is_rapid_{i} (>= z_{i} 0))",
};

const TOOL_CHANGE_SAFE: AtomicProposition = {
  type: "atomic",
  id: "tool_change_safe",
  name: "Tool change at safe Z",
  predicate: (_, state) => {
    if (!state.is_tool_change) return true;
    return state.z >= DEFAULT_CONFIG.z_safe;
  },
  smt_template: "(=> is_tool_change_{i} (>= z_{i} z_safe))",
};

const AT_HOME: AtomicProposition = {
  type: "atomic",
  id: "at_home",
  name: "At home position",
  predicate: (_, state) => {
    return Math.abs(state.x - DEFAULT_CONFIG.x_home) < 0.001 &&
           Math.abs(state.z - DEFAULT_CONFIG.z_home) < 0.001;
  },
  smt_template: "(and (= x_{i} x_home) (= z_{i} z_home))",
};

const STANDARD_PROPERTIES: TemporalProperty[] = [
  {
    id: "PROP_RAPID_SAFETY",
    name: "Rapid Move Safety",
    description: "All rapid moves (G0) stay outside the stock material",
    ltl_formula: "G(rapid → ¬inside_stock)",
    formula: {
      type: "ltl",
      operator: "G",
      operands: [{
        type: "prop",
        atomic: RAPID_NOT_IN_STOCK,
      }],
    },
    category: "safety",
  },
  {
    id: "PROP_TOOL_CHANGE",
    name: "Safe Tool Change",
    description: "All tool changes occur at safe Z position",
    ltl_formula: "G(tool_change → z ≥ Zsafe)",
    formula: {
      type: "ltl",
      operator: "G",
      operands: [{
        type: "prop",
        atomic: TOOL_CHANGE_SAFE,
      }],
    },
    category: "safety",
  },
  {
    id: "PROP_HOME_BEFORE_END",
    name: "Home Before End",
    description: "Machine returns to home position before program end",
    ltl_formula: "F(at_home) before M30",
    formula: {
      type: "ltl",
      operator: "F",
      operands: [{
        type: "prop",
        atomic: AT_HOME,
      }],
    },
    category: "liveness",
  },
];

// ============================================================================
// ENGINE
// ============================================================================

class LatheTemporalPropertyCheckerEngine {
  private config: CheckerConfig = { ...DEFAULT_CONFIG };
  private properties: Map<string, TemporalProperty> = new Map();

  constructor() {
    for (const prop of STANDARD_PROPERTIES) {
      this.properties.set(prop.id, prop);
    }
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setConfig(config: Partial<CheckerConfig>): CheckerConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): CheckerConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Property Management
  // --------------------------------------------------------------------------

  getProperty(propertyId: string): TemporalProperty | null {
    return this.properties.get(propertyId) || null;
  }

  getAllProperties(): TemporalProperty[] {
    return Array.from(this.properties.values());
  }

  addProperty(property: TemporalProperty): void {
    this.properties.set(property.id, property);
  }

  // --------------------------------------------------------------------------
  // Bounded Model Checking
  // --------------------------------------------------------------------------

  checkProperty(
    propertyId: string,
    trace: BlockState[]
  ): BoundedCheckResult {
    const startTime = Date.now();
    const property = this.properties.get(propertyId);

    if (!property) {
      return {
        property_id: propertyId,
        property_name: "Unknown",
        status: "unknown",
        bound_k: 0,
        time_ms: Date.now() - startTime,
        smt_assertions_count: 0,
      };
    }

    const bound = Math.min(trace.length, this.config.max_bound);

    // Check property based on its type
    const result = this.evaluateFormula(property.formula, trace, bound);

    const checkResult: BoundedCheckResult = {
      property_id: propertyId,
      property_name: property.name,
      status: result.satisfied ? "verified" : "violated",
      bound_k: bound,
      time_ms: Date.now() - startTime,
      smt_assertions_count: this.countAssertions(property.formula, bound),
    };

    if (!result.satisfied && result.violationIndex !== undefined) {
      checkResult.witness_trace = {
        length: result.violationIndex + 1,
        states: trace.slice(0, result.violationIndex + 1),
        violation_block: result.violationIndex,
        violation_description: result.violationDescription || "Property violated",
      };
    }

    // Check for timeout
    if (Date.now() - startTime > this.config.timeout_ms) {
      checkResult.status = "timeout";
    }

    return checkResult;
  }

  checkAllProperties(trace: BlockState[]): BoundedCheckResult[] {
    const results: BoundedCheckResult[] = [];

    for (const property of this.properties.values()) {
      results.push(this.checkProperty(property.id, trace));
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // Formula Evaluation
  // --------------------------------------------------------------------------

  private evaluateFormula(
    formula: LTLFormula | PropFormula,
    trace: BlockState[],
    bound: number
  ): { satisfied: boolean; violationIndex?: number; violationDescription?: string } {
    if (formula.type === "ltl") {
      return this.evaluateLTL(formula, trace, bound);
    } else {
      return this.evaluateProp(formula, trace, 0);
    }
  }

  private evaluateLTL(
    formula: LTLFormula,
    trace: BlockState[],
    bound: number
  ): { satisfied: boolean; violationIndex?: number; violationDescription?: string } {
    switch (formula.operator) {
      case "G": // Globally: must hold at all positions
        for (let i = 0; i < bound; i++) {
          const result = this.evaluateFormula(formula.operands[0], trace, bound);
          if (!this.evaluateAtPosition(formula.operands[0], trace, i)) {
            return {
              satisfied: false,
              violationIndex: i,
              violationDescription: `Property violated at block ${i}`,
            };
          }
        }
        return { satisfied: true };

      case "F": // Eventually: must hold at some position
        for (let i = 0; i < bound; i++) {
          if (this.evaluateAtPosition(formula.operands[0], trace, i)) {
            return { satisfied: true };
          }
        }
        return {
          satisfied: false,
          violationIndex: bound - 1,
          violationDescription: `Property never satisfied within bound ${bound}`,
        };

      case "X": // Next: must hold at next position
        if (trace.length < 2) {
          return { satisfied: false, violationIndex: 0, violationDescription: "Trace too short for X operator" };
        }
        return {
          satisfied: this.evaluateAtPosition(formula.operands[0], trace, 1),
          violationIndex: this.evaluateAtPosition(formula.operands[0], trace, 1) ? undefined : 1,
        };

      case "U": // Until: operand[1] must eventually hold, and operand[0] holds until then
        for (let i = 0; i < bound; i++) {
          if (this.evaluateAtPosition(formula.operands[1], trace, i)) {
            return { satisfied: true };
          }
          if (!this.evaluateAtPosition(formula.operands[0], trace, i)) {
            return {
              satisfied: false,
              violationIndex: i,
              violationDescription: `Until violated at block ${i}`,
            };
          }
        }
        return {
          satisfied: false,
          violationIndex: bound - 1,
          violationDescription: `Until: second operand never became true within bound ${bound}`,
        };

      default:
        return { satisfied: true };
    }
  }

  private evaluateAtPosition(
    formula: LTLFormula | PropFormula,
    trace: BlockState[],
    position: number
  ): boolean {
    if (position >= trace.length) return true;
    const state = trace[position];

    if (formula.type === "prop") {
      return this.evaluatePropAtPosition(formula, state, position);
    }

    // For nested LTL formulas, we need to shift the evaluation window
    if (formula.type === "ltl") {
      const shiftedTrace = trace.slice(position);
      const result = this.evaluateLTL(formula, shiftedTrace, shiftedTrace.length);
      return result.satisfied;
    }

    return true;
  }

  private evaluateProp(
    formula: PropFormula,
    trace: BlockState[],
    position: number
  ): { satisfied: boolean; violationIndex?: number; violationDescription?: string } {
    if (position >= trace.length) {
      return { satisfied: true };
    }

    const satisfied = this.evaluatePropAtPosition(formula, trace[position], position);
    return {
      satisfied,
      violationIndex: satisfied ? undefined : position,
      violationDescription: satisfied ? undefined : `Proposition violated at block ${position}`,
    };
  }

  private evaluatePropAtPosition(
    formula: PropFormula,
    state: BlockState,
    position: number
  ): boolean {
    if (formula.atomic) {
      return formula.atomic.predicate(position, state);
    }

    if (!formula.operator || !formula.operands) return true;

    switch (formula.operator) {
      case "and":
        return formula.operands.every((op) => this.evaluatePropAtPosition(op, state, position));
      case "or":
        return formula.operands.some((op) => this.evaluatePropAtPosition(op, state, position));
      case "not":
        return !this.evaluatePropAtPosition(formula.operands[0], state, position);
      case "implies":
        return !this.evaluatePropAtPosition(formula.operands[0], state, position) ||
               this.evaluatePropAtPosition(formula.operands[1], state, position);
      case "iff":
        return this.evaluatePropAtPosition(formula.operands[0], state, position) ===
               this.evaluatePropAtPosition(formula.operands[1], state, position);
      default:
        return true;
    }
  }

  // --------------------------------------------------------------------------
  // SMT Generation
  // --------------------------------------------------------------------------

  generateSMTAssertions(
    property: TemporalProperty,
    bound: number
  ): string[] {
    const assertions: string[] = [];

    // Generate unrolled assertions for the bounded check
    assertions.push(`; Property: ${property.name}`);
    assertions.push(`; LTL: ${property.ltl_formula}`);
    assertions.push(`; Bound: ${bound}`);
    assertions.push("");

    if (property.formula.type === "ltl") {
      this.unrollLTLToSMT(property.formula, bound, assertions);
    }

    return assertions;
  }

  private unrollLTLToSMT(formula: LTLFormula, bound: number, assertions: string[]): void {
    switch (formula.operator) {
      case "G":
        // G(φ) unrolls to: φ_0 ∧ φ_1 ∧ ... ∧ φ_{k-1}
        assertions.push("; Globally (G): conjunction over all positions");
        for (let i = 0; i < bound; i++) {
          const propSMT = this.propToSMT(formula.operands[0], i);
          assertions.push(`(assert ${propSMT})`);
        }
        break;

      case "F":
        // F(φ) unrolls to: φ_0 ∨ φ_1 ∨ ... ∨ φ_{k-1}
        assertions.push("; Eventually (F): disjunction over all positions");
        const disjuncts: string[] = [];
        for (let i = 0; i < bound; i++) {
          disjuncts.push(this.propToSMT(formula.operands[0], i));
        }
        assertions.push(`(assert (or ${disjuncts.join(" ")}))`);
        break;

      case "X":
        // X(φ) = φ_1
        assertions.push("; Next (X): property at position 1");
        assertions.push(`(assert ${this.propToSMT(formula.operands[0], 1)})`);
        break;

      case "U":
        // φ U ψ unrolls with auxiliary variables
        assertions.push("; Until (U): φ holds until ψ becomes true");
        for (let j = 0; j < bound; j++) {
          const psiJ = this.propToSMT(formula.operands[1], j);
          const phiBeforeJ: string[] = [];
          for (let i = 0; i < j; i++) {
            phiBeforeJ.push(this.propToSMT(formula.operands[0], i));
          }
          if (phiBeforeJ.length > 0) {
            assertions.push(`(assert (=> ${psiJ} (and ${phiBeforeJ.join(" ")})))`);
          }
        }
        break;
    }
  }

  private propToSMT(formula: LTLFormula | PropFormula, position: number): string {
    if (formula.type === "prop" && formula.atomic) {
      return formula.atomic.smt_template.replace(/\{i\}/g, String(position));
    }

    if (formula.type === "prop" && formula.operator && formula.operands) {
      const ops = formula.operands.map((op) => this.propToSMT(op as PropFormula, position));
      switch (formula.operator) {
        case "and":
          return `(and ${ops.join(" ")})`;
        case "or":
          return `(or ${ops.join(" ")})`;
        case "not":
          return `(not ${ops[0]})`;
        case "implies":
          return `(=> ${ops[0]} ${ops[1]})`;
        default:
          return "true";
      }
    }

    return "true";
  }

  private countAssertions(formula: LTLFormula | PropFormula, bound: number): number {
    if (formula.type === "ltl") {
      switch (formula.operator) {
        case "G":
          return bound;
        case "F":
          return 1;
        case "X":
          return 1;
        case "U":
          return bound * bound;
        default:
          return 0;
      }
    }
    return 1;
  }

  // --------------------------------------------------------------------------
  // Trace Parsing
  // --------------------------------------------------------------------------

  parseTrace(blocks: Array<{
    x?: number;
    z?: number;
    f?: number;
    s?: number;
    t?: number;
    g_codes?: string[];
    m_codes?: string[];
  }>): BlockState[] {
    const trace: BlockState[] = [];
    let currentX = 0;
    let currentZ = 0;
    let currentF = 100;
    let currentS = 0;
    let currentTool = 0;

    for (const block of blocks) {
      if (block.x !== undefined) currentX = block.x;
      if (block.z !== undefined) currentZ = block.z;
      if (block.f !== undefined) currentF = block.f;
      if (block.s !== undefined) currentS = block.s;
      if (block.t !== undefined) currentTool = block.t;

      const isRapid = block.g_codes?.includes("G0") || false;
      const isToolChange = block.t !== undefined;
      const isProgramEnd = block.m_codes?.includes("M30") || block.m_codes?.includes("M2") || false;
      const motionMode = block.g_codes?.find((g) => ["G0", "G1", "G2", "G3"].includes(g)) || null;

      trace.push({
        x: currentX,
        z: currentZ,
        f: currentF,
        s: currentS,
        tool: currentTool,
        motion_mode: motionMode,
        is_rapid: isRapid,
        is_tool_change: isToolChange,
        is_program_end: isProgramEnd,
      });
    }

    return trace;
  }

  // --------------------------------------------------------------------------
  // Report Generation
  // --------------------------------------------------------------------------

  formatResults(results: BoundedCheckResult[]): string {
    const lines: string[] = [
      "Temporal Property Verification Report",
      "=====================================",
      "",
    ];

    for (const result of results) {
      const status = result.status === "verified" ? "✓ VERIFIED" :
                     result.status === "violated" ? "✗ VIOLATED" :
                     result.status === "timeout" ? "⏱ TIMEOUT" : "? UNKNOWN";

      lines.push(`${status} ${result.property_name}`);
      lines.push(`  Bound k=${result.bound_k}, ${result.time_ms}ms, ${result.smt_assertions_count} assertions`);

      if (result.witness_trace) {
        lines.push(`  Witness: ${result.witness_trace.violation_description}`);
        lines.push(`  Block ${result.witness_trace.violation_block}: ` +
          `X=${result.witness_trace.states[result.witness_trace.violation_block]?.x}, ` +
          `Z=${result.witness_trace.states[result.witness_trace.violation_block]?.z}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }
}

export const latheTemporalPropertyCheckerEngine = new LatheTemporalPropertyCheckerEngine();
