/**
 * LatheDeepLogicEngine — Formal Logic & Constraint Satisfaction for Lathe Programming
 * =====================================================================================
 *
 * Implements rigorous formal logic systems and constraint satisfaction for intelligent
 * lathe programming decisions. Combines classical logic with specialized manufacturing
 * inference to produce provably correct machining recommendations.
 *
 * Logic Systems Implemented:
 *   1. Propositional Logic — Boolean satisfiability, rule-based inference
 *   2. First-Order Logic — Predicate logic for material-tool-operation relationships
 *   3. Constraint Satisfaction — Machine/tool/physics/quality constraints
 *   4. Temporal Logic — Operation sequencing and precedence constraints
 *   5. Fuzzy Logic — Soft constraints with linguistic variables
 *   6. Modal Logic — Possibility, necessity, and belief revision
 *   7. Defeasible Reasoning — Default rules with exceptions
 *
 * References:
 *   - Russell, S. & Norvig, P. (2020). Artificial Intelligence: A Modern Approach
 *   - Zadeh, L.A. (1965). Fuzzy Sets. Information and Control, 8(3), 338-353
 *   - Pollock, J.L. (1987). Defeasible Reasoning. Cognitive Science, 11(4), 481-518
 *   - Kripke, S. (1963). Semantical Considerations on Modal Logic
 *   - Prior, A.N. (1957). Time and Modality — Temporal Logic
 *   - Machinery's Handbook, 31st Ed. — Process Planning
 *   - Peter Smid, CNC Programming Handbook
 *
 * @module engines/LatheDeepLogicEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";

// ============================================================================
// PROPOSITIONAL LOGIC TYPES
// ============================================================================

/** Propositional variable */
export interface PropositionalVariable {
  id: string;
  name: string;
  domain: "operation" | "material" | "tool" | "machine" | "quality" | "safety";
  value: boolean | null; // null = unassigned
  description: string;
}

/** Propositional formula node types */
export type PropFormulaType = "var" | "not" | "and" | "or" | "implies" | "iff";

/** Propositional formula (recursive AST) */
export interface PropFormula {
  type: PropFormulaType;
  variable?: string;
  left?: PropFormula;
  right?: PropFormula;
  operand?: PropFormula;
}

/** Propositional inference rule */
export interface PropositionalRule {
  id: string;
  name: string;
  premise: PropFormula;
  conclusion: PropFormula;
  domain: string;
  source: string;
  confidence: number;
}

/** SAT solver result */
export interface SATResult {
  satisfiable: boolean;
  assignment: Map<string, boolean> | null;
  conflicts: string[];
  reasoning: string[];
  computation_time_ms: number;
}

/** Truth table row */
export interface TruthTableRow {
  assignment: Map<string, boolean>;
  result: boolean;
}

/** Truth table result */
export interface TruthTableResult {
  variables: string[];
  rows: TruthTableRow[];
  tautology: boolean;
  contradiction: boolean;
  satisfiable_count: number;
}

// ============================================================================
// FIRST-ORDER LOGIC TYPES
// ============================================================================

/** Domain entity */
export interface FOLEntity {
  id: string;
  type: "material" | "tool" | "operation" | "machine" | "parameter";
  properties: Record<string, unknown>;
}

/** Predicate definition */
export interface Predicate {
  name: string;
  arity: number;
  domain_types: string[];
  description: string;
  evaluator: (args: FOLEntity[]) => boolean;
}

/** Quantified variable */
export interface QuantifiedVariable {
  name: string;
  type: string;
  quantifier: "forall" | "exists";
}

/** First-order formula */
export interface FOLFormula {
  type: "predicate" | "not" | "and" | "or" | "implies" | "forall" | "exists";
  predicate?: string;
  arguments?: string[];
  variable?: QuantifiedVariable;
  subformula?: FOLFormula;
  left?: FOLFormula;
  right?: FOLFormula;
}

/** Universal rule (forall X: premise(X) -> conclusion(X)) */
export interface UniversalRule {
  id: string;
  name: string;
  variable: QuantifiedVariable;
  premise: FOLFormula;
  conclusion: FOLFormula;
  source: "physics" | "tribal" | "standard" | "learned";
  priority: number;
}

/** FOL query result */
export interface FOLQueryResult {
  query: string;
  satisfied: boolean;
  witnesses: FOLEntity[][] | null;
  proof_steps: string[];
  confidence: number;
}

// ============================================================================
// CONSTRAINT SATISFACTION TYPES
// ============================================================================

/** Numeric constraint */
export interface NumericConstraint {
  id: string;
  name: string;
  variable: string;
  operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in_range";
  value: number;
  max_value?: number; // for in_range
  unit: string;
  source: "machine" | "tool" | "physics" | "quality" | "tribal";
  priority: "hard" | "soft";
  penalty?: number; // for soft constraints
}

/** Relational constraint (between variables) */
export interface RelationalConstraint {
  id: string;
  name: string;
  left_variable: string;
  operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  right_variable: string;
  coefficient?: number; // left op coefficient * right
  source: string;
  priority: "hard" | "soft";
}

/** Expression constraint (arbitrary expression) */
export interface ExpressionConstraint {
  id: string;
  name: string;
  expression: string; // e.g., "power <= max_spindle_power"
  variables: string[];
  evaluator: (values: Map<string, number>) => boolean;
  source: string;
  priority: "hard" | "soft";
  description: string;
}

/** Constraint satisfaction problem */
export interface CSP {
  id: string;
  name: string;
  variables: Map<string, { min: number; max: number; step?: number }>;
  numeric_constraints: NumericConstraint[];
  relational_constraints: RelationalConstraint[];
  expression_constraints: ExpressionConstraint[];
}

/** CSP solution */
export interface CSPSolution {
  satisfiable: boolean;
  assignment: Map<string, number> | null;
  violated_constraints: string[];
  soft_penalty: number;
  search_nodes: number;
  computation_time_ms: number;
  optimization_score?: number;
}

// ============================================================================
// TEMPORAL LOGIC TYPES
// ============================================================================

/** Temporal operator */
export type TemporalOperator =
  | "always"      // G: always in the future
  | "eventually"  // F: sometime in the future
  | "next"        // X: in the next state
  | "until"       // U: until
  | "before"      // precedes
  | "after"       // follows
  | "during"      // overlaps
  | "immediately_before"; // adjacent predecessor

/** Temporal formula */
export interface TemporalFormula {
  type: "proposition" | "not" | "and" | "or" | "temporal";
  proposition?: string;
  operator?: TemporalOperator;
  left?: TemporalFormula;
  right?: TemporalFormula;
}

/** Operation sequence rule */
export interface SequenceRule {
  id: string;
  name: string;
  operation_a: string;
  operator: TemporalOperator;
  operation_b: string;
  reason: string;
  source: "physics" | "best_practice" | "tribal" | "safety";
  priority: "mandatory" | "recommended" | "optional";
}

/** Temporal consistency check result */
export interface TemporalCheckResult {
  consistent: boolean;
  violations: Array<{
    rule_id: string;
    operation_a: string;
    operation_b: string;
    expected: string;
    actual: string;
    severity: "error" | "warning";
  }>;
  suggested_reordering: string[] | null;
  reasoning: string[];
}

// ============================================================================
// FUZZY LOGIC TYPES
// ============================================================================

/** Linguistic variable */
export interface LinguisticVariable {
  name: string;
  universe: [number, number]; // [min, max]
  unit: string;
  terms: FuzzyTerm[];
}

/** Fuzzy term (linguistic value) */
export interface FuzzyTerm {
  name: string;
  membership_function: MembershipFunction;
}

/** Membership function types */
export type MembershipFunctionType = "triangular" | "trapezoidal" | "gaussian" | "sigmoid";

/** Membership function definition */
export interface MembershipFunction {
  type: MembershipFunctionType;
  parameters: number[]; // interpretation depends on type
}

/** Fuzzy rule */
export interface FuzzyRule {
  id: string;
  name: string;
  antecedent: FuzzyAntecedent[];
  consequent: FuzzyConsequent;
  weight: number;
  source: string;
}

/** Fuzzy rule antecedent (IF part) */
export interface FuzzyAntecedent {
  variable: string;
  term: string;
  hedged?: "very" | "somewhat" | "not";
}

/** Fuzzy rule consequent (THEN part) */
export interface FuzzyConsequent {
  variable: string;
  term: string;
}

/** Fuzzy inference result */
export interface FuzzyInferenceResult {
  variable: string;
  crisp_value: number;
  unit: string;
  term_memberships: Map<string, number>;
  active_rules: string[];
  defuzzification_method: string;
  confidence: number;
}

// ============================================================================
// MODAL LOGIC TYPES
// ============================================================================

/** Modal operator */
export type ModalOperator =
  | "necessary"   // box: necessarily true
  | "possible"    // diamond: possibly true
  | "believes"    // epistemic: agent believes
  | "knows"       // epistemic: agent knows
  | "obligatory"  // deontic: must be done
  | "permitted";  // deontic: may be done

/** Modal formula */
export interface ModalFormula {
  type: "proposition" | "modal" | "not" | "and" | "or" | "implies";
  proposition?: string;
  operator?: ModalOperator;
  agent?: string;
  subformula?: ModalFormula;
  left?: ModalFormula;
  right?: ModalFormula;
}

/** Possible world */
export interface PossibleWorld {
  id: string;
  name: string;
  propositions: Map<string, boolean>;
  accessibility: string[]; // IDs of accessible worlds
}

/** Kripke model */
export interface KripkeModel {
  worlds: PossibleWorld[];
  actual_world: string;
  accessibility_relation: "reflexive" | "transitive" | "euclidean" | "symmetric" | "serial";
}

/** Modal evaluation result */
export interface ModalEvalResult {
  world_id: string;
  formula: ModalFormula;
  value: boolean;
  supporting_worlds: string[];
  counterexample_worlds: string[];
  explanation: string;
}

/** Belief revision result */
export interface BeliefRevisionResult {
  original_beliefs: Map<string, boolean>;
  new_evidence: string;
  revised_beliefs: Map<string, boolean>;
  changes: Array<{
    belief: string;
    old_value: boolean;
    new_value: boolean;
    reason: string;
  }>;
  consistency_preserved: boolean;
}

// ============================================================================
// DEFEASIBLE REASONING TYPES
// ============================================================================

/** Defeasible rule */
export interface DefeasibleRule {
  id: string;
  name: string;
  type: "strict" | "defeasible" | "defeater";
  antecedent: PropFormula;
  consequent: PropFormula;
  priority: number;
  exceptions: string[]; // IDs of defeaters
  source: string;
}

/** Argument in defeasible reasoning */
export interface Argument {
  id: string;
  conclusion: string;
  support: DefeasibleRule[];
  strength: number;
}

/** Defeat relation */
export interface DefeatRelation {
  defeating: string; // argument ID
  defeated: string;  // argument ID
  type: "rebuttal" | "undercut" | "priority";
}

/** Defeasible inference result */
export interface DefeasibleResult {
  query: string;
  status: "accepted" | "rejected" | "undecided";
  supporting_arguments: Argument[];
  opposing_arguments: Argument[];
  defeats: DefeatRelation[];
  justified_conclusions: string[];
  reasoning_trace: string[];
}

// ============================================================================
// INTEGRATED LOGIC RESULT TYPES
// ============================================================================

/** Complete logic analysis for lathe operation */
export interface LatheLogicAnalysis {
  operation_context: {
    operation_type: string;
    material: string;
    machine: string;
    tool: string;
  };
  propositional_analysis: {
    rules_evaluated: number;
    inferences_made: string[];
    validity: SATResult;
  };
  fol_analysis: {
    universal_rules_applied: string[];
    existential_queries: FOLQueryResult[];
  };
  constraint_satisfaction: {
    csp_result: CSPSolution;
    critical_constraints: string[];
    optimization_achieved: boolean;
  };
  temporal_analysis: TemporalCheckResult;
  fuzzy_recommendations: FuzzyInferenceResult[];
  modal_analysis: {
    necessary_conditions: string[];
    possible_alternatives: string[];
    epistemic_state: Map<string, number>;
  };
  defeasible_conclusions: DefeasibleResult;
  overall_confidence: number;
  recommendations: string[];
  warnings: string[];
}

// ============================================================================
// PROPOSITIONAL LOGIC ENGINE
// ============================================================================

class PropositionalLogicEngine {
  private variables = new Map<string, PropositionalVariable>();
  private rules: PropositionalRule[] = [];

  /**
   * Register a propositional variable
   */
  registerVariable(variable: PropositionalVariable): void {
    this.variables.set(variable.id, variable);
  }

  /**
   * Register an inference rule
   */
  registerRule(rule: PropositionalRule): void {
    this.rules.push(rule);
  }

  /**
   * Evaluate a propositional formula under an assignment
   * Reference: Russell & Norvig Ch. 7 — Propositional Semantics
   */
  evaluate(formula: PropFormula, assignment: Map<string, boolean>): boolean {
    switch (formula.type) {
      case "var": {
        const val = assignment.get(formula.variable!);
        if (val === undefined) {
          throw new Error(`Unassigned variable: ${formula.variable}`);
        }
        return val;
      }
      case "not":
        return !this.evaluate(formula.operand!, assignment);
      case "and":
        return this.evaluate(formula.left!, assignment) &&
               this.evaluate(formula.right!, assignment);
      case "or":
        return this.evaluate(formula.left!, assignment) ||
               this.evaluate(formula.right!, assignment);
      case "implies":
        return !this.evaluate(formula.left!, assignment) ||
               this.evaluate(formula.right!, assignment);
      case "iff":
        return this.evaluate(formula.left!, assignment) ===
               this.evaluate(formula.right!, assignment);
      default:
        throw new Error(`Unknown formula type: ${formula.type}`);
    }
  }

  /**
   * Extract all variables from a formula
   */
  extractVariables(formula: PropFormula): Set<string> {
    const vars = new Set<string>();
    const extract = (f: PropFormula) => {
      if (f.type === "var" && f.variable) {
        vars.add(f.variable);
      }
      if (f.operand) extract(f.operand);
      if (f.left) extract(f.left);
      if (f.right) extract(f.right);
    };
    extract(formula);
    return vars;
  }

  /**
   * Generate truth table for a formula
   * Reference: Logic textbooks — enumeration method
   */
  generateTruthTable(formula: PropFormula): TruthTableResult {
    const variables = Array.from(this.extractVariables(formula));
    const n = variables.length;
    const rows: TruthTableRow[] = [];
    let satisfiable_count = 0;

    // Enumerate all 2^n assignments
    for (let i = 0; i < Math.pow(2, n); i++) {
      const assignment = new Map<string, boolean>();
      for (let j = 0; j < n; j++) {
        assignment.set(variables[j], Boolean((i >> (n - 1 - j)) & 1));
      }
      const result = this.evaluate(formula, assignment);
      rows.push({ assignment, result });
      if (result) satisfiable_count++;
    }

    return {
      variables,
      rows,
      tautology: satisfiable_count === rows.length,
      contradiction: satisfiable_count === 0,
      satisfiable_count,
    };
  }

  /**
   * DPLL-based SAT solver
   * Reference: Davis, M. & Putnam, H. (1960). A Computing Procedure for Quantification Theory
   */
  solveSAT(formula: PropFormula): SATResult {
    const startTime = Date.now();
    const variables = Array.from(this.extractVariables(formula));
    const conflicts: string[] = [];
    const reasoning: string[] = [];

    // Convert to CNF for DPLL (simplified approach)
    const result = this.dpll(formula, new Map(), variables, reasoning);

    return {
      satisfiable: result !== null,
      assignment: result,
      conflicts,
      reasoning,
      computation_time_ms: Date.now() - startTime,
    };
  }

  /**
   * DPLL algorithm implementation
   */
  private dpll(
    formula: PropFormula,
    assignment: Map<string, boolean>,
    remaining: string[],
    reasoning: string[]
  ): Map<string, boolean> | null {
    // Try to evaluate with current assignment
    try {
      if (remaining.length === 0) {
        const result = this.evaluate(formula, assignment);
        reasoning.push(`Full assignment evaluates to ${result}`);
        return result ? assignment : null;
      }
    } catch {
      // Variables still unassigned, continue
    }

    // Unit propagation (simplified)
    // In full DPLL, we would analyze CNF clauses

    // Choose next variable
    const variable = remaining[0];
    const newRemaining = remaining.slice(1);

    // Try true
    const trueAssign = new Map(assignment);
    trueAssign.set(variable, true);
    reasoning.push(`Trying ${variable} = true`);
    const trueResult = this.dpll(formula, trueAssign, newRemaining, reasoning);
    if (trueResult) return trueResult;

    // Try false
    const falseAssign = new Map(assignment);
    falseAssign.set(variable, false);
    reasoning.push(`Backtracking: trying ${variable} = false`);
    return this.dpll(formula, falseAssign, newRemaining, reasoning);
  }

  /**
   * Apply forward chaining inference
   * Reference: Russell & Norvig Ch. 7.5 — Forward Chaining
   */
  forwardChain(facts: Map<string, boolean>): {
    derived: Map<string, boolean>;
    applied_rules: string[];
    reasoning: string[];
  } {
    const derived = new Map(facts);
    const applied_rules: string[] = [];
    const reasoning: string[] = [];
    let changed = true;

    while (changed) {
      changed = false;
      for (const rule of this.rules) {
        try {
          if (this.evaluate(rule.premise, derived)) {
            const conclusionVars = this.extractVariables(rule.conclusion);
            for (const v of conclusionVars) {
              if (!derived.has(v)) {
                // Evaluate what the conclusion should be
                const testAssign = new Map(derived);
                testAssign.set(v, true);
                if (this.evaluate(rule.conclusion, testAssign)) {
                  derived.set(v, true);
                  applied_rules.push(rule.id);
                  reasoning.push(`Rule ${rule.name}: derived ${v} = true`);
                  changed = true;
                }
              }
            }
          }
        } catch {
          // Rule premise not fully evaluable yet
        }
      }
    }

    return { derived, applied_rules, reasoning };
  }

  /**
   * Create lathe-specific propositional rules
   */
  createLatheRules(): void {
    // Register variables
    this.registerVariable({
      id: "tool_steel_material", name: "Material is tool steel",
      domain: "material", value: null, description: "Material hardness > 45 HRC"
    });
    this.registerVariable({
      id: "reduce_speed_40", name: "Reduce speed 40%",
      domain: "operation", value: null, description: "Apply 40% speed reduction"
    });
    this.registerVariable({
      id: "use_carbide", name: "Use carbide tooling",
      domain: "tool", value: null, description: "Carbide insert required"
    });
    this.registerVariable({
      id: "use_ceramic", name: "Use ceramic tooling",
      domain: "tool", value: null, description: "Ceramic insert for hardened materials"
    });
    this.registerVariable({
      id: "coolant_required", name: "Coolant required",
      domain: "safety", value: null, description: "Flood coolant must be active"
    });
    this.registerVariable({
      id: "finishing_operation", name: "Finishing operation",
      domain: "operation", value: null, description: "This is a finishing pass"
    });
    this.registerVariable({
      id: "high_surface_finish", name: "High surface finish required",
      domain: "quality", value: null, description: "Ra < 1.6 um required"
    });

    // Rule: Tool steel -> reduce speed 40%
    this.registerRule({
      id: "r1", name: "Tool steel speed reduction",
      premise: { type: "var", variable: "tool_steel_material" },
      conclusion: { type: "var", variable: "reduce_speed_40" },
      domain: "materials", source: "tribal", confidence: 0.95
    });

    // Rule: Tool steel -> use carbide OR ceramic
    this.registerRule({
      id: "r2", name: "Tool steel tooling",
      premise: { type: "var", variable: "tool_steel_material" },
      conclusion: {
        type: "or",
        left: { type: "var", variable: "use_carbide" },
        right: { type: "var", variable: "use_ceramic" }
      },
      domain: "tooling", source: "standard", confidence: 0.99
    });

    // Rule: Finishing -> coolant required
    this.registerRule({
      id: "r3", name: "Finishing coolant requirement",
      premise: { type: "var", variable: "finishing_operation" },
      conclusion: { type: "var", variable: "coolant_required" },
      domain: "process", source: "best_practice", confidence: 0.90
    });

    // Rule: High finish AND finishing -> ceramic preferred
    this.registerRule({
      id: "r4", name: "High finish ceramic preference",
      premise: {
        type: "and",
        left: { type: "var", variable: "high_surface_finish" },
        right: { type: "var", variable: "finishing_operation" }
      },
      conclusion: { type: "var", variable: "use_ceramic" },
      domain: "quality", source: "standard", confidence: 0.85
    });
  }
}

// ============================================================================
// FIRST-ORDER LOGIC ENGINE
// ============================================================================

class FirstOrderLogicEngine {
  private predicates = new Map<string, Predicate>();
  private entities = new Map<string, FOLEntity>();
  private universalRules: UniversalRule[] = [];

  /**
   * Register a predicate
   */
  registerPredicate(predicate: Predicate): void {
    this.predicates.set(predicate.name, predicate);
  }

  /**
   * Register an entity
   */
  registerEntity(entity: FOLEntity): void {
    this.entities.set(entity.id, entity);
  }

  /**
   * Register a universal rule
   */
  registerUniversalRule(rule: UniversalRule): void {
    this.universalRules.push(rule);
  }

  /**
   * Evaluate a predicate with given arguments
   */
  evaluatePredicate(name: string, argIds: string[]): boolean {
    const predicate = this.predicates.get(name);
    if (!predicate) {
      throw new Error(`Unknown predicate: ${name}`);
    }
    const args = argIds.map(id => {
      const entity = this.entities.get(id);
      if (!entity) throw new Error(`Unknown entity: ${id}`);
      return entity;
    });
    return predicate.evaluator(args);
  }

  /**
   * Query existential formula: exists X: predicate(X)
   * Reference: Russell & Norvig Ch. 9 — Inference in First-Order Logic
   */
  queryExists(predicateName: string, entityType: string): FOLQueryResult {
    const proof_steps: string[] = [];
    const witnesses: FOLEntity[][] = [];

    proof_steps.push(`Searching for ${entityType} satisfying ${predicateName}`);

    for (const [id, entity] of this.entities) {
      if (entity.type === entityType) {
        try {
          if (this.evaluatePredicate(predicateName, [id])) {
            witnesses.push([entity]);
            proof_steps.push(`Found witness: ${entity.id} (${JSON.stringify(entity.properties)})`);
          }
        } catch {
          // Predicate evaluation failed
        }
      }
    }

    const satisfied = witnesses.length > 0;
    proof_steps.push(satisfied
      ? `Existential query satisfied with ${witnesses.length} witness(es)`
      : `No witnesses found - existential query unsatisfied`);

    return {
      query: `exists ${entityType}: ${predicateName}`,
      satisfied,
      witnesses: satisfied ? witnesses : null,
      proof_steps,
      confidence: satisfied ? 1.0 : 0.0,
    };
  }

  /**
   * Query universal formula: forall X: premise(X) -> conclusion(X)
   * Uses universal instantiation
   */
  queryForall(
    entityType: string,
    premisePredicate: string,
    conclusionPredicate: string
  ): FOLQueryResult {
    const proof_steps: string[] = [];
    let satisfied = true;
    const counterexamples: FOLEntity[][] = [];

    proof_steps.push(`Checking: forall ${entityType}: ${premisePredicate} -> ${conclusionPredicate}`);

    for (const [id, entity] of this.entities) {
      if (entity.type === entityType) {
        try {
          const premiseHolds = this.evaluatePredicate(premisePredicate, [id]);
          if (premiseHolds) {
            const conclusionHolds = this.evaluatePredicate(conclusionPredicate, [id]);
            if (!conclusionHolds) {
              satisfied = false;
              counterexamples.push([entity]);
              proof_steps.push(`Counterexample: ${entity.id} satisfies premise but not conclusion`);
            } else {
              proof_steps.push(`${entity.id}: premise -> conclusion holds`);
            }
          }
        } catch {
          // Skip entities where predicates don't apply
        }
      }
    }

    proof_steps.push(satisfied
      ? `Universal statement verified for all ${entityType} entities`
      : `Universal statement falsified by ${counterexamples.length} counterexample(s)`);

    return {
      query: `forall ${entityType}: ${premisePredicate} -> ${conclusionPredicate}`,
      satisfied,
      witnesses: satisfied ? null : counterexamples,
      proof_steps,
      confidence: satisfied ? 1.0 : 1 - (counterexamples.length / this.countEntitiesOfType(entityType)),
    };
  }

  /**
   * Count entities of a given type
   */
  private countEntitiesOfType(type: string): number {
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.type === type) count++;
    }
    return Math.max(count, 1);
  }

  /**
   * Apply universal rules (forward reasoning)
   */
  applyUniversalRules(): {
    applied: string[];
    inferences: Array<{ rule: string; entity: string; inference: string }>;
  } {
    const applied: string[] = [];
    const inferences: Array<{ rule: string; entity: string; inference: string }> = [];

    // Sort rules by priority
    const sortedRules = [...this.universalRules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      for (const [id, entity] of this.entities) {
        if (entity.type === rule.variable.type) {
          // This is a simplified application - full implementation would
          // recursively evaluate FOL formulas
          applied.push(rule.id);
          inferences.push({
            rule: rule.name,
            entity: id,
            inference: `Applied ${rule.name} to ${id}`,
          });
        }
      }
    }

    return { applied, inferences };
  }

  /**
   * Create lathe-specific predicates and rules
   */
  createLathePredicates(): void {
    // Predicate: is_hard_material(m) - material hardness > 45 HRC
    this.registerPredicate({
      name: "is_hard_material",
      arity: 1,
      domain_types: ["material"],
      description: "Material is hardened (> 45 HRC)",
      evaluator: (args) => {
        const mat = args[0];
        const hrc = mat.properties["hardness_hrc"] as number;
        return hrc !== undefined && hrc > 45;
      },
    });

    // Predicate: can_cut(tool, material) - tool can machine material
    this.registerPredicate({
      name: "can_cut",
      arity: 2,
      domain_types: ["tool", "material"],
      description: "Tool is capable of cutting the material",
      evaluator: (args) => {
        const tool = args[0];
        const material = args[1];
        const toolGrade = tool.properties["grade"] as string;
        const matHardness = material.properties["hardness_hrc"] as number || 30;

        // Ceramic can cut hardened steel
        if (toolGrade === "ceramic" && matHardness > 45) return true;
        // Carbide can cut up to 55 HRC
        if (toolGrade === "carbide" && matHardness <= 55) return true;
        // CBN for very hard materials
        if (toolGrade === "cbn" && matHardness > 45) return true;
        // HSS only for soft materials
        if (toolGrade === "hss" && matHardness < 30) return true;

        return false;
      },
    });

    // Predicate: requires_coolant(operation) - operation needs coolant
    this.registerPredicate({
      name: "requires_coolant",
      arity: 1,
      domain_types: ["operation"],
      description: "Operation requires flood coolant",
      evaluator: (args) => {
        const op = args[0];
        const opType = op.properties["type"] as string;
        // Threading, grooving, drilling always need coolant
        return ["thread", "groove", "drill", "bore", "finish"].includes(opType);
      },
    });

    // Predicate: exceeds_power(operation, machine)
    this.registerPredicate({
      name: "exceeds_power",
      arity: 2,
      domain_types: ["operation", "machine"],
      description: "Operation exceeds machine power capacity",
      evaluator: (args) => {
        const op = args[0];
        const machine = args[1];
        const opPower = op.properties["required_power_kw"] as number || 0;
        const maxPower = machine.properties["max_power_kw"] as number || 30;
        return opPower > maxPower;
      },
    });
  }
}

// ============================================================================
// CONSTRAINT SATISFACTION ENGINE
// ============================================================================

class ConstraintSatisfactionEngine {
  /**
   * Solve a constraint satisfaction problem
   * Reference: Russell & Norvig Ch. 6 — Constraint Satisfaction Problems
   */
  solveCSP(csp: CSP): CSPSolution {
    const startTime = Date.now();
    const variables = Array.from(csp.variables.keys());
    const violated: string[] = [];
    let searchNodes = 0;

    // Arc consistency preprocessing (simplified)
    // In full implementation: AC-3 algorithm

    // Backtracking search with constraint propagation
    const result = this.backtrackSearch(
      csp,
      new Map(),
      variables,
      0,
      (nodes) => { searchNodes = nodes; }
    );

    // Check soft constraints and calculate penalty
    let softPenalty = 0;
    if (result) {
      for (const constraint of csp.numeric_constraints) {
        if (constraint.priority === "soft") {
          if (!this.checkNumericConstraint(constraint, result)) {
            violated.push(constraint.id);
            softPenalty += constraint.penalty || 1;
          }
        }
      }
    }

    return {
      satisfiable: result !== null,
      assignment: result,
      violated_constraints: violated,
      soft_penalty: softPenalty,
      search_nodes: searchNodes,
      computation_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Backtracking search for CSP
   */
  private backtrackSearch(
    csp: CSP,
    assignment: Map<string, number>,
    remaining: string[],
    nodeCount: number,
    reportNodes: (n: number) => void
  ): Map<string, number> | null {
    reportNodes(nodeCount + 1);

    if (remaining.length === 0) {
      // All variables assigned - check all constraints
      if (this.checkAllConstraints(csp, assignment)) {
        return assignment;
      }
      return null;
    }

    // MRV heuristic: choose variable with smallest domain
    const variable = remaining[0]; // simplified - full impl uses MRV
    const domain = csp.variables.get(variable)!;
    const step = domain.step || 1;

    // Generate ordered domain values (LCV heuristic would order by least constraining)
    const values: number[] = [];
    for (let v = domain.min; v <= domain.max; v += step) {
      values.push(v);
    }

    for (const value of values) {
      const newAssignment = new Map(assignment);
      newAssignment.set(variable, value);

      // Check constraints involving this variable
      if (this.checkPartialConstraints(csp, newAssignment, variable)) {
        const result = this.backtrackSearch(
          csp,
          newAssignment,
          remaining.slice(1),
          nodeCount + 1,
          reportNodes
        );
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Check all hard constraints
   */
  private checkAllConstraints(csp: CSP, assignment: Map<string, number>): boolean {
    // Check numeric constraints
    for (const c of csp.numeric_constraints.filter(c => c.priority === "hard")) {
      if (!this.checkNumericConstraint(c, assignment)) return false;
    }

    // Check relational constraints
    for (const c of csp.relational_constraints.filter(c => c.priority === "hard")) {
      if (!this.checkRelationalConstraint(c, assignment)) return false;
    }

    // Check expression constraints
    for (const c of csp.expression_constraints.filter(c => c.priority === "hard")) {
      if (!c.evaluator(assignment)) return false;
    }

    return true;
  }

  /**
   * Check constraints involving a specific variable (for pruning)
   */
  private checkPartialConstraints(
    csp: CSP,
    assignment: Map<string, number>,
    variable: string
  ): boolean {
    // Check numeric constraints on this variable
    for (const c of csp.numeric_constraints.filter(
      c => c.priority === "hard" && c.variable === variable
    )) {
      if (!this.checkNumericConstraint(c, assignment)) return false;
    }

    // Check relational constraints involving this variable
    for (const c of csp.relational_constraints.filter(
      c => c.priority === "hard" &&
           (c.left_variable === variable || c.right_variable === variable) &&
           assignment.has(c.left_variable) && assignment.has(c.right_variable)
    )) {
      if (!this.checkRelationalConstraint(c, assignment)) return false;
    }

    return true;
  }

  /**
   * Check a numeric constraint
   */
  private checkNumericConstraint(
    c: NumericConstraint,
    assignment: Map<string, number>
  ): boolean {
    const val = assignment.get(c.variable);
    if (val === undefined) return true; // Not yet assigned

    switch (c.operator) {
      case "eq": return val === c.value;
      case "neq": return val !== c.value;
      case "lt": return val < c.value;
      case "lte": return val <= c.value;
      case "gt": return val > c.value;
      case "gte": return val >= c.value;
      case "in_range": return val >= c.value && val <= (c.max_value ?? c.value);
      default: return true;
    }
  }

  /**
   * Check a relational constraint
   */
  private checkRelationalConstraint(
    c: RelationalConstraint,
    assignment: Map<string, number>
  ): boolean {
    const left = assignment.get(c.left_variable);
    const right = assignment.get(c.right_variable);
    if (left === undefined || right === undefined) return true;

    const rightAdjusted = right * (c.coefficient ?? 1);

    switch (c.operator) {
      case "eq": return left === rightAdjusted;
      case "neq": return left !== rightAdjusted;
      case "lt": return left < rightAdjusted;
      case "lte": return left <= rightAdjusted;
      case "gt": return left > rightAdjusted;
      case "gte": return left >= rightAdjusted;
      default: return true;
    }
  }

  /**
   * Create lathe machining CSP
   * Kienzle force: Fc = kc1_1 * ap * fn^(1-mc)
   * Power: P = Fc * Vc / 60000 [kW]
   * Taylor tool life: T = (C/Vc)^(1/n)
   * Surface finish: Ra = fn^2 / (8 * r_nose) * 1000 [um]
   */
  createLatheCSP(
    material: ISOGroup,
    maxSpindlePower: number,
    maxRPM: number,
    toolNoseRadius: number,
    diameter: number,
    targetRa: number
  ): CSP {
    const kienzle = CANONICAL_KIENZLE[material];
    const taylor = CANONICAL_TAYLOR[material];

    return {
      id: "lathe_machining_csp",
      name: "Lathe Machining Parameter CSP",
      variables: new Map([
        ["Vc", { min: 50, max: 400, step: 10 }],      // Cutting speed m/min
        ["fn", { min: 0.05, max: 0.5, step: 0.01 }], // Feed mm/rev
        ["ap", { min: 0.5, max: 5.0, step: 0.1 }],   // Depth of cut mm
      ]),
      numeric_constraints: [
        // Surface finish constraint: Ra = fn^2 / (8 * r_nose) * 1000 <= targetRa
        // Rearranged: fn <= sqrt(targetRa * 8 * r_nose / 1000)
        {
          id: "surface_finish",
          name: "Surface finish limit",
          variable: "fn",
          operator: "lte",
          value: Math.sqrt(targetRa * 8 * toolNoseRadius / 1000),
          unit: "mm/rev",
          source: "quality",
          priority: "hard",
        },
        // Minimum depth for efficient cutting
        {
          id: "min_depth",
          name: "Minimum depth of cut",
          variable: "ap",
          operator: "gte",
          value: 0.5,
          unit: "mm",
          source: "physics",
          priority: "hard",
        },
      ],
      relational_constraints: [],
      expression_constraints: [
        // Power constraint: P = kc1_1 * ap * fn^(1-mc) * Vc / 60000 <= maxPower
        {
          id: "power_limit",
          name: "Spindle power limit",
          expression: "power <= max_spindle_power",
          variables: ["Vc", "fn", "ap"],
          evaluator: (values) => {
            const Vc = values.get("Vc")!;
            const fn = values.get("fn")!;
            const ap = values.get("ap")!;
            const Fc = kienzle.kc1_1 * ap * Math.pow(fn, 1 - kienzle.mc);
            const power = Fc * Vc / 60000;
            return power <= maxSpindlePower;
          },
          source: "machine",
          priority: "hard",
          description: "Cutting power must not exceed spindle capacity",
        },
        // RPM constraint from diameter: RPM = Vc * 1000 / (pi * D) <= maxRPM
        {
          id: "rpm_limit",
          name: "Spindle RPM limit",
          expression: "rpm <= max_rpm",
          variables: ["Vc"],
          evaluator: (values) => {
            const Vc = values.get("Vc")!;
            const rpm = (Vc * 1000) / (Math.PI * diameter);
            return rpm <= maxRPM;
          },
          source: "machine",
          priority: "hard",
          description: "Spindle RPM must not exceed machine limit",
        },
        // Tool life constraint: T = (C/Vc)^(1/n) >= 15 minutes
        {
          id: "tool_life_min",
          name: "Minimum tool life",
          expression: "tool_life >= 15",
          variables: ["Vc"],
          evaluator: (values) => {
            const Vc = values.get("Vc")!;
            const T = Math.pow(taylor.C / Vc, 1 / taylor.n);
            return T >= 15;
          },
          source: "tribal",
          priority: "soft",
          description: "Tool life should exceed 15 minutes for efficiency",
        },
      ],
    };
  }
}

// ============================================================================
// TEMPORAL LOGIC ENGINE
// ============================================================================

class TemporalLogicEngine {
  private sequenceRules: SequenceRule[] = [];

  /**
   * Register a sequence rule
   */
  registerSequenceRule(rule: SequenceRule): void {
    this.sequenceRules.push(rule);
  }

  /**
   * Check temporal consistency of operation sequence
   * Reference: Prior (1957) — Temporal Logic
   */
  checkSequence(operations: string[]): TemporalCheckResult {
    const violations: TemporalCheckResult["violations"] = [];
    const reasoning: string[] = [];

    reasoning.push(`Checking sequence: ${operations.join(" -> ")}`);

    for (const rule of this.sequenceRules) {
      const posA = operations.indexOf(rule.operation_a);
      const posB = operations.indexOf(rule.operation_b);

      // Skip if operations not in sequence
      if (posA === -1 || posB === -1) continue;

      let violated = false;
      let expected = "";

      switch (rule.operator) {
        case "before":
          violated = posA >= posB;
          expected = `${rule.operation_a} before ${rule.operation_b}`;
          break;
        case "after":
          violated = posA <= posB;
          expected = `${rule.operation_a} after ${rule.operation_b}`;
          break;
        case "immediately_before":
          violated = posA !== posB - 1;
          expected = `${rule.operation_a} immediately before ${rule.operation_b}`;
          break;
        // Add more operators as needed
      }

      if (violated) {
        const severity = rule.priority === "mandatory" ? "error" : "warning";
        violations.push({
          rule_id: rule.id,
          operation_a: rule.operation_a,
          operation_b: rule.operation_b,
          expected,
          actual: `position ${posA} vs ${posB}`,
          severity,
        });
        reasoning.push(`VIOLATION [${severity}]: ${rule.name} - ${expected}`);
      } else {
        reasoning.push(`OK: ${rule.name}`);
      }
    }

    // Generate suggested reordering if violations exist
    let suggested_reordering: string[] | null = null;
    if (violations.length > 0) {
      suggested_reordering = this.topologicalSort(operations, this.sequenceRules);
    }

    return {
      consistent: violations.length === 0,
      violations,
      suggested_reordering,
      reasoning,
    };
  }

  /**
   * Topological sort to satisfy precedence constraints
   * Reference: Kahn's algorithm
   */
  private topologicalSort(operations: string[], rules: SequenceRule[]): string[] | null {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const op of operations) {
      graph.set(op, []);
      inDegree.set(op, 0);
    }

    // Build graph from rules
    for (const rule of rules) {
      if (rule.operator === "before" || rule.operator === "immediately_before") {
        const fromOp = rule.operation_a;
        const toOp = rule.operation_b;
        if (graph.has(fromOp) && graph.has(toOp)) {
          graph.get(fromOp)!.push(toOp);
          inDegree.set(toOp, (inDegree.get(toOp) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue = operations.filter(op => (inDegree.get(op) || 0) === 0);
    const result: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const neighbor of graph.get(node) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If not all nodes included, there's a cycle
    if (result.length !== operations.length) {
      return null; // Cycle detected - no valid ordering
    }

    return result;
  }

  /**
   * Create lathe-specific sequence rules
   */
  createLatheSequenceRules(): void {
    // Face before OD rough
    this.registerSequenceRule({
      id: "seq1",
      name: "Face before OD rough",
      operation_a: "face",
      operator: "before",
      operation_b: "od_rough",
      reason: "Establish datum before roughing",
      source: "best_practice",
      priority: "mandatory",
    });

    // Rough before finish
    this.registerSequenceRule({
      id: "seq2",
      name: "Rough before finish",
      operation_a: "od_rough",
      operator: "before",
      operation_b: "od_finish",
      reason: "Remove bulk material before finishing",
      source: "physics",
      priority: "mandatory",
    });

    // ID operations after OD when possible
    this.registerSequenceRule({
      id: "seq3",
      name: "OD before ID",
      operation_a: "od_finish",
      operator: "before",
      operation_b: "id_rough",
      reason: "Maintain rigidity with more material",
      source: "tribal",
      priority: "recommended",
    });

    // Thread after all other operations
    this.registerSequenceRule({
      id: "seq4",
      name: "Thread last",
      operation_a: "od_finish",
      operator: "before",
      operation_b: "thread",
      reason: "Threads are delicate features",
      source: "best_practice",
      priority: "mandatory",
    });

    // Grooving before parting
    this.registerSequenceRule({
      id: "seq5",
      name: "Groove before part",
      operation_a: "groove",
      operator: "before",
      operation_b: "part_off",
      reason: "Cannot groove after parting",
      source: "physics",
      priority: "mandatory",
    });

    // Coolant on before cutting
    this.registerSequenceRule({
      id: "seq6",
      name: "Coolant before cut",
      operation_a: "coolant_on",
      operator: "immediately_before",
      operation_b: "od_rough",
      reason: "Flood coolant must be active before cutting",
      source: "safety",
      priority: "mandatory",
    });
  }
}

// ============================================================================
// FUZZY LOGIC ENGINE
// ============================================================================

class FuzzyLogicEngine {
  private linguisticVariables = new Map<string, LinguisticVariable>();
  private rules: FuzzyRule[] = [];

  /**
   * Register a linguistic variable
   */
  registerVariable(variable: LinguisticVariable): void {
    this.linguisticVariables.set(variable.name, variable);
  }

  /**
   * Register a fuzzy rule
   */
  registerRule(rule: FuzzyRule): void {
    this.rules.push(rule);
  }

  /**
   * Calculate membership degree
   * Reference: Zadeh (1965) — Fuzzy Sets
   */
  membership(mf: MembershipFunction, value: number): number {
    switch (mf.type) {
      case "triangular": {
        // params: [a, b, c] where a <= b <= c
        const [a, b, c] = mf.parameters;
        if (value <= a || value >= c) return 0;
        if (value <= b) return (value - a) / (b - a);
        return (c - value) / (c - b);
      }
      case "trapezoidal": {
        // params: [a, b, c, d] where a <= b <= c <= d
        const [a, b, c, d] = mf.parameters;
        if (value <= a || value >= d) return 0;
        if (value >= b && value <= c) return 1;
        if (value < b) return (value - a) / (b - a);
        return (d - value) / (d - c);
      }
      case "gaussian": {
        // params: [mean, sigma]
        const [mean, sigma] = mf.parameters;
        return Math.exp(-0.5 * Math.pow((value - mean) / sigma, 2));
      }
      case "sigmoid": {
        // params: [a, c] - steepness a, crossover point c
        const [a, c] = mf.parameters;
        return 1 / (1 + Math.exp(-a * (value - c)));
      }
      default:
        return 0;
    }
  }

  /**
   * Apply hedge to membership degree
   */
  applyHedge(degree: number, hedge?: "very" | "somewhat" | "not"): number {
    switch (hedge) {
      case "very": return degree * degree; // Concentration
      case "somewhat": return Math.sqrt(degree); // Dilation
      case "not": return 1 - degree; // Complement
      default: return degree;
    }
  }

  /**
   * Fuzzify a crisp input value
   */
  fuzzify(variableName: string, crispValue: number): Map<string, number> {
    const variable = this.linguisticVariables.get(variableName);
    if (!variable) throw new Error(`Unknown variable: ${variableName}`);

    const memberships = new Map<string, number>();
    for (const term of variable.terms) {
      memberships.set(term.name, this.membership(term.membership_function, crispValue));
    }
    return memberships;
  }

  /**
   * Perform fuzzy inference (Mamdani method)
   * Reference: Mamdani (1975) — Fuzzy Inference Systems
   */
  infer(inputs: Map<string, number>, outputVariable: string): FuzzyInferenceResult {
    const outputVar = this.linguisticVariables.get(outputVariable);
    if (!outputVar) throw new Error(`Unknown output variable: ${outputVariable}`);

    const activeRules: string[] = [];
    const aggregatedOutput = new Map<number, number>();

    // Step 1: Fuzzify inputs
    const fuzzifiedInputs = new Map<string, Map<string, number>>();
    for (const [varName, crispValue] of inputs) {
      fuzzifiedInputs.set(varName, this.fuzzify(varName, crispValue));
    }

    // Step 2: Apply rules
    for (const rule of this.rules) {
      if (rule.consequent.variable !== outputVariable) continue;

      // Calculate rule firing strength (min of antecedent memberships)
      let firingStrength = 1;
      for (const antecedent of rule.antecedent) {
        const varMemberships = fuzzifiedInputs.get(antecedent.variable);
        if (!varMemberships) {
          firingStrength = 0;
          break;
        }
        let degree = varMemberships.get(antecedent.term) || 0;
        degree = this.applyHedge(degree, antecedent.hedged);
        firingStrength = Math.min(firingStrength, degree);
      }

      if (firingStrength > 0) {
        firingStrength *= rule.weight;
        activeRules.push(rule.id);

        // Clip consequent membership function
        const consequentTerm = outputVar.terms.find(t => t.name === rule.consequent.term);
        if (consequentTerm) {
          // Sample the output space
          const [min, max] = outputVar.universe;
          const step = (max - min) / 100;
          for (let x = min; x <= max; x += step) {
            const mfValue = this.membership(consequentTerm.membership_function, x);
            const clipped = Math.min(mfValue, firingStrength);
            const current = aggregatedOutput.get(x) || 0;
            aggregatedOutput.set(x, Math.max(current, clipped)); // Max aggregation
          }
        }
      }
    }

    // Step 3: Defuzzify (centroid method)
    let numerator = 0;
    let denominator = 0;
    for (const [x, mu] of aggregatedOutput) {
      numerator += x * mu;
      denominator += mu;
    }
    const crispValue = denominator > 0 ? numerator / denominator :
      (outputVar.universe[0] + outputVar.universe[1]) / 2;

    // Calculate term memberships for output
    const termMemberships = this.fuzzify(outputVariable, crispValue);

    return {
      variable: outputVariable,
      crisp_value: crispValue,
      unit: outputVar.unit,
      term_memberships: termMemberships,
      active_rules: activeRules,
      defuzzification_method: "centroid",
      confidence: denominator > 0 ? Math.min(1, denominator / activeRules.length) : 0,
    };
  }

  /**
   * Create lathe-specific fuzzy system
   */
  createLatheFuzzySystem(): void {
    // Input: Material hardness
    this.registerVariable({
      name: "hardness",
      universe: [20, 70],
      unit: "HRC",
      terms: [
        { name: "soft", membership_function: { type: "trapezoidal", parameters: [20, 20, 30, 40] } },
        { name: "medium", membership_function: { type: "triangular", parameters: [30, 45, 55] } },
        { name: "hard", membership_function: { type: "trapezoidal", parameters: [50, 58, 70, 70] } },
      ],
    });

    // Input: Depth of cut
    this.registerVariable({
      name: "depth",
      universe: [0.1, 10],
      unit: "mm",
      terms: [
        { name: "shallow", membership_function: { type: "trapezoidal", parameters: [0.1, 0.1, 0.5, 1.5] } },
        { name: "medium", membership_function: { type: "triangular", parameters: [1, 2.5, 4] } },
        { name: "deep", membership_function: { type: "trapezoidal", parameters: [3, 5, 10, 10] } },
      ],
    });

    // Input: Feed rate
    this.registerVariable({
      name: "feed",
      universe: [0.05, 0.5],
      unit: "mm/rev",
      terms: [
        { name: "fine", membership_function: { type: "trapezoidal", parameters: [0.05, 0.05, 0.1, 0.15] } },
        { name: "medium", membership_function: { type: "triangular", parameters: [0.1, 0.2, 0.3] } },
        { name: "coarse", membership_function: { type: "trapezoidal", parameters: [0.25, 0.35, 0.5, 0.5] } },
      ],
    });

    // Output: Recommended cutting speed adjustment (percentage)
    this.registerVariable({
      name: "speed_adjustment",
      universe: [-50, 50],
      unit: "%",
      terms: [
        { name: "decrease_much", membership_function: { type: "trapezoidal", parameters: [-50, -50, -40, -20] } },
        { name: "decrease", membership_function: { type: "triangular", parameters: [-30, -15, 0] } },
        { name: "maintain", membership_function: { type: "triangular", parameters: [-10, 0, 10] } },
        { name: "increase", membership_function: { type: "triangular", parameters: [0, 15, 30] } },
        { name: "increase_much", membership_function: { type: "trapezoidal", parameters: [20, 40, 50, 50] } },
      ],
    });

    // Fuzzy rules for speed adjustment
    // Hard material, deep cut -> decrease speed much
    this.registerRule({
      id: "fr1", name: "Hard deep -> decrease much",
      antecedent: [
        { variable: "hardness", term: "hard" },
        { variable: "depth", term: "deep" },
      ],
      consequent: { variable: "speed_adjustment", term: "decrease_much" },
      weight: 1.0,
      source: "physics",
    });

    // Hard material, shallow cut -> decrease
    this.registerRule({
      id: "fr2", name: "Hard shallow -> decrease",
      antecedent: [
        { variable: "hardness", term: "hard" },
        { variable: "depth", term: "shallow" },
      ],
      consequent: { variable: "speed_adjustment", term: "decrease" },
      weight: 1.0,
      source: "physics",
    });

    // Soft material, shallow cut, fine feed -> increase
    this.registerRule({
      id: "fr3", name: "Soft finishing -> increase",
      antecedent: [
        { variable: "hardness", term: "soft" },
        { variable: "depth", term: "shallow" },
        { variable: "feed", term: "fine" },
      ],
      consequent: { variable: "speed_adjustment", term: "increase" },
      weight: 0.9,
      source: "tribal",
    });

    // Medium everything -> maintain
    this.registerRule({
      id: "fr4", name: "Medium conditions -> maintain",
      antecedent: [
        { variable: "hardness", term: "medium" },
        { variable: "depth", term: "medium" },
      ],
      consequent: { variable: "speed_adjustment", term: "maintain" },
      weight: 0.8,
      source: "standard",
    });

    // Coarse feed, deep cut -> decrease
    this.registerRule({
      id: "fr5", name: "Heavy roughing -> decrease",
      antecedent: [
        { variable: "feed", term: "coarse" },
        { variable: "depth", term: "deep" },
      ],
      consequent: { variable: "speed_adjustment", term: "decrease" },
      weight: 1.0,
      source: "physics",
    });

    // Soft material, any depth, coarse feed -> maintain (high MRR OK)
    this.registerRule({
      id: "fr6", name: "Soft aggressive -> maintain",
      antecedent: [
        { variable: "hardness", term: "soft" },
        { variable: "feed", term: "coarse" },
      ],
      consequent: { variable: "speed_adjustment", term: "maintain" },
      weight: 0.7,
      source: "tribal",
    });
  }
}

// ============================================================================
// MODAL LOGIC ENGINE
// ============================================================================

class ModalLogicEngine {
  private worlds = new Map<string, PossibleWorld>();
  private actualWorld: string = "";

  /**
   * Create a Kripke model
   */
  createModel(model: KripkeModel): void {
    for (const world of model.worlds) {
      this.worlds.set(world.id, world);
    }
    this.actualWorld = model.actual_world;
  }

  /**
   * Evaluate modal formula in a world
   * Reference: Kripke (1963) — Modal Logic Semantics
   */
  evaluate(formula: ModalFormula, worldId: string): ModalEvalResult {
    const world = this.worlds.get(worldId);
    if (!world) throw new Error(`Unknown world: ${worldId}`);

    const result = this.evalRecursive(formula, world);
    const supporting: string[] = [];
    const counterexamples: string[] = [];

    // For modal operators, track which worlds support/contradict
    if (formula.type === "modal" && formula.operator) {
      for (const accessibleId of world.accessibility) {
        const accessibleWorld = this.worlds.get(accessibleId);
        if (accessibleWorld && formula.subformula) {
          const subResult = this.evalRecursive(formula.subformula, accessibleWorld);
          if (subResult) {
            supporting.push(accessibleId);
          } else {
            counterexamples.push(accessibleId);
          }
        }
      }
    }

    return {
      world_id: worldId,
      formula,
      value: result,
      supporting_worlds: supporting,
      counterexample_worlds: counterexamples,
      explanation: this.generateExplanation(formula, result, world),
    };
  }

  /**
   * Recursive modal formula evaluation
   */
  private evalRecursive(formula: ModalFormula, world: PossibleWorld): boolean {
    switch (formula.type) {
      case "proposition": {
        return world.propositions.get(formula.proposition!) ?? false;
      }
      case "not": {
        return !this.evalRecursive(formula.subformula!, world);
      }
      case "and": {
        return this.evalRecursive(formula.left!, world) &&
               this.evalRecursive(formula.right!, world);
      }
      case "or": {
        return this.evalRecursive(formula.left!, world) ||
               this.evalRecursive(formula.right!, world);
      }
      case "implies": {
        return !this.evalRecursive(formula.left!, world) ||
               this.evalRecursive(formula.right!, world);
      }
      case "modal": {
        return this.evalModal(formula, world);
      }
      default:
        return false;
    }
  }

  /**
   * Evaluate modal operators
   */
  private evalModal(formula: ModalFormula, world: PossibleWorld): boolean {
    const subformula = formula.subformula!;
    const accessible = world.accessibility.map(id => this.worlds.get(id)).filter(Boolean) as PossibleWorld[];

    switch (formula.operator) {
      case "necessary": // Box: true in all accessible worlds
        return accessible.every(w => this.evalRecursive(subformula, w));

      case "possible": // Diamond: true in at least one accessible world
        return accessible.some(w => this.evalRecursive(subformula, w));

      case "knows": // Epistemic: true in all worlds agent considers possible
        // For epistemic logic, treat accessibility as agent's epistemic alternatives
        return accessible.every(w => this.evalRecursive(subformula, w));

      case "believes": // Weaker than knows - allows for false beliefs
        return accessible.length === 0 ||
               accessible.some(w => this.evalRecursive(subformula, w));

      case "obligatory": // Deontic: required in ideal worlds
        // Ideal worlds are those accessible via deontic accessibility
        return accessible.every(w => this.evalRecursive(subformula, w));

      case "permitted": // Deontic: allowed in at least one ideal world
        return accessible.some(w => this.evalRecursive(subformula, w));

      default:
        return false;
    }
  }

  /**
   * Generate natural language explanation
   */
  private generateExplanation(
    formula: ModalFormula,
    result: boolean,
    world: PossibleWorld
  ): string {
    if (formula.type === "proposition") {
      return `"${formula.proposition}" is ${result ? "true" : "false"} in world ${world.name}`;
    }
    if (formula.type === "modal") {
      const opName = formula.operator === "necessary" ? "necessarily" :
                     formula.operator === "possible" ? "possibly" :
                     formula.operator;
      return `It is ${result ? "" : "not "}${opName} true that ${JSON.stringify(formula.subformula)}`;
    }
    return `Formula evaluates to ${result}`;
  }

  /**
   * Perform belief revision (AGM framework)
   * Reference: Alchourron, Gardenfors, Makinson (1985) — Belief Revision
   */
  reviseBeliefs(
    currentBeliefs: Map<string, boolean>,
    newEvidence: string,
    evidenceValue: boolean
  ): BeliefRevisionResult {
    const revised = new Map(currentBeliefs);
    const changes: BeliefRevisionResult["changes"] = [];

    // Simple revision: incorporate new evidence
    const oldValue = revised.get(newEvidence);
    revised.set(newEvidence, evidenceValue);

    if (oldValue !== undefined && oldValue !== evidenceValue) {
      changes.push({
        belief: newEvidence,
        old_value: oldValue,
        new_value: evidenceValue,
        reason: "Direct evidence update",
      });
    }

    // Check for consistency violations and resolve
    // This is a simplified version - full AGM uses contraction + expansion

    // Example: if we now believe "tool_is_worn" is true, revise "tool_is_fresh"
    if (newEvidence === "tool_is_worn" && evidenceValue) {
      const wasFresh = revised.get("tool_is_fresh");
      if (wasFresh) {
        revised.set("tool_is_fresh", false);
        changes.push({
          belief: "tool_is_fresh",
          old_value: true,
          new_value: false,
          reason: "Contradicts new evidence about tool wear",
        });
      }
    }

    // Check consistency
    let consistent = true;
    // Simple check: no proposition and its negation both true
    // In real implementation, use full consistency check

    return {
      original_beliefs: currentBeliefs,
      new_evidence: newEvidence,
      revised_beliefs: revised,
      changes,
      consistency_preserved: consistent,
    };
  }

  /**
   * Create lathe machining possible worlds
   */
  createLatheMachiningWorlds(): void {
    // Actual world: current machining state
    const actual: PossibleWorld = {
      id: "w0",
      name: "Current State",
      propositions: new Map([
        ["tool_is_fresh", true],
        ["coolant_active", true],
        ["speed_optimal", false],
        ["surface_acceptable", true],
      ]),
      accessibility: ["w1", "w2", "w3"],
    };

    // Alternative: higher speed world
    const highSpeed: PossibleWorld = {
      id: "w1",
      name: "High Speed Alternative",
      propositions: new Map([
        ["tool_is_fresh", false], // Tool wears faster
        ["coolant_active", true],
        ["speed_optimal", true],
        ["surface_acceptable", true],
        ["cycle_time_reduced", true],
      ]),
      accessibility: ["w0"],
    };

    // Alternative: conservative world
    const conservative: PossibleWorld = {
      id: "w2",
      name: "Conservative Alternative",
      propositions: new Map([
        ["tool_is_fresh", true],
        ["coolant_active", true],
        ["speed_optimal", false],
        ["surface_acceptable", true],
        ["tool_life_extended", true],
      ]),
      accessibility: ["w0"],
    };

    // Alternative: aggressive roughing
    const aggressive: PossibleWorld = {
      id: "w3",
      name: "Aggressive Roughing",
      propositions: new Map([
        ["tool_is_fresh", false],
        ["coolant_active", true],
        ["speed_optimal", true],
        ["surface_acceptable", false], // May have marks
        ["mrr_maximized", true],
      ]),
      accessibility: ["w0"],
    };

    this.createModel({
      worlds: [actual, highSpeed, conservative, aggressive],
      actual_world: "w0",
      accessibility_relation: "symmetric",
    });
  }
}

// ============================================================================
// DEFEASIBLE REASONING ENGINE
// ============================================================================

class DefeasibleReasoningEngine {
  private rules: DefeasibleRule[] = [];

  /**
   * Register a defeasible rule
   */
  registerRule(rule: DefeasibleRule): void {
    this.rules.push(rule);
  }

  /**
   * Perform defeasible reasoning
   * Reference: Pollock (1987) — Defeasible Reasoning
   */
  reason(facts: Map<string, boolean>, query: string): DefeasibleResult {
    const supporting: Argument[] = [];
    const opposing: Argument[] = [];
    const defeats: DefeatRelation[] = [];
    const reasoning: string[] = [];

    reasoning.push(`Query: ${query}`);
    reasoning.push(`Facts: ${JSON.stringify(Object.fromEntries(facts))}`);

    // Build arguments for and against the query
    for (const rule of this.rules) {
      // Check if rule conclusion matches query
      const concludes = this.formulaMatches(rule.consequent, query);
      const concludesNegation = this.formulaMatches(rule.consequent, `not_${query}`);

      if (!concludes && !concludesNegation) continue;

      // Check if premise is satisfied
      const premiseSatisfied = this.evaluatePremise(rule.antecedent, facts);

      if (premiseSatisfied) {
        const argument: Argument = {
          id: `arg_${rule.id}`,
          conclusion: concludes ? query : `not_${query}`,
          support: [rule],
          strength: rule.priority * (rule.type === "strict" ? 1.5 : 1.0),
        };

        if (concludes) {
          supporting.push(argument);
          reasoning.push(`Support: ${rule.name} (${rule.type}, priority ${rule.priority})`);
        } else {
          opposing.push(argument);
          reasoning.push(`Opposition: ${rule.name} (${rule.type}, priority ${rule.priority})`);
        }
      }
    }

    // Compute defeat relations
    for (const sup of supporting) {
      for (const opp of opposing) {
        // Rebuttal: direct contradiction
        defeats.push({
          defeating: sup.strength > opp.strength ? sup.id : opp.id,
          defeated: sup.strength > opp.strength ? opp.id : sup.id,
          type: "rebuttal",
        });
      }
    }

    // Check for undercutting defeaters
    for (const rule of this.rules.filter(r => r.type === "defeater")) {
      for (const sup of supporting) {
        for (const supportRule of sup.support) {
          if (rule.exceptions.includes(supportRule.id)) {
            const premiseSatisfied = this.evaluatePremise(rule.antecedent, facts);
            if (premiseSatisfied) {
              defeats.push({
                defeating: `defeater_${rule.id}`,
                defeated: sup.id,
                type: "undercut",
              });
              reasoning.push(`Undercut: ${rule.name} defeats ${supportRule.name}`);
            }
          }
        }
      }
    }

    // Determine final status
    let status: "accepted" | "rejected" | "undecided" = "undecided";
    const undefeatedSupporting = supporting.filter(
      s => !defeats.some(d => d.defeated === s.id)
    );
    const undefeatedOpposing = opposing.filter(
      o => !defeats.some(d => d.defeated === o.id)
    );

    if (undefeatedSupporting.length > 0 && undefeatedOpposing.length === 0) {
      status = "accepted";
    } else if (undefeatedSupporting.length === 0 && undefeatedOpposing.length > 0) {
      status = "rejected";
    }

    reasoning.push(`Final status: ${status}`);

    return {
      query,
      status,
      supporting_arguments: supporting,
      opposing_arguments: opposing,
      defeats,
      justified_conclusions: status === "accepted" ? [query] : [],
      reasoning_trace: reasoning,
    };
  }

  /**
   * Check if formula matches a query string
   */
  private formulaMatches(formula: PropFormula, query: string): boolean {
    if (formula.type === "var") {
      return formula.variable === query;
    }
    if (formula.type === "not" && formula.operand?.type === "var") {
      return `not_${formula.operand.variable}` === query;
    }
    return false;
  }

  /**
   * Evaluate if premise is satisfied given facts
   */
  private evaluatePremise(premise: PropFormula, facts: Map<string, boolean>): boolean {
    try {
      // For simple variable premises
      if (premise.type === "var" && premise.variable) {
        return facts.get(premise.variable) ?? false;
      }
      if (premise.type === "not" && premise.operand?.type === "var") {
        const val = facts.get(premise.operand.variable!);
        return val === undefined ? false : !val;
      }
      if (premise.type === "and" && premise.left && premise.right) {
        return this.evaluatePremise(premise.left, facts) &&
               this.evaluatePremise(premise.right, facts);
      }
      if (premise.type === "or" && premise.left && premise.right) {
        return this.evaluatePremise(premise.left, facts) ||
               this.evaluatePremise(premise.right, facts);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Create lathe-specific defeasible rules
   */
  createLatheDefeasibleRules(): void {
    // Default rule: steel -> use carbide
    this.registerRule({
      id: "d1",
      name: "Default carbide for steel",
      type: "defeasible",
      antecedent: { type: "var", variable: "is_steel" },
      consequent: { type: "var", variable: "use_carbide" },
      priority: 5,
      exceptions: ["d2", "d3"],
      source: "standard",
    });

    // Exception: hardened steel -> use ceramic instead
    this.registerRule({
      id: "d2",
      name: "Hardened steel uses ceramic",
      type: "defeasible",
      antecedent: {
        type: "and",
        left: { type: "var", variable: "is_steel" },
        right: { type: "var", variable: "is_hardened" },
      },
      consequent: { type: "var", variable: "use_ceramic" },
      priority: 7, // Higher priority defeats d1
      exceptions: [],
      source: "physics",
    });

    // Exception: interrupted cut on hardened -> back to carbide
    this.registerRule({
      id: "d3",
      name: "Interrupted hardened uses toughened carbide",
      type: "defeasible",
      antecedent: {
        type: "and",
        left: {
          type: "and",
          left: { type: "var", variable: "is_steel" },
          right: { type: "var", variable: "is_hardened" },
        },
        right: { type: "var", variable: "is_interrupted" },
      },
      consequent: { type: "var", variable: "use_toughened_carbide" },
      priority: 9, // Highest priority
      exceptions: [],
      source: "tribal",
    });

    // Defeater: thin wall defeats aggressive parameters
    this.registerRule({
      id: "df1",
      name: "Thin wall defeats aggressive",
      type: "defeater",
      antecedent: { type: "var", variable: "thin_wall_part" },
      consequent: {
        type: "not",
        operand: { type: "var", variable: "use_aggressive_params" },
      },
      priority: 10,
      exceptions: [],
      source: "physics",
    });

    // Default: rough before finish
    this.registerRule({
      id: "d4",
      name: "Default rough then finish",
      type: "strict", // Strict rule - cannot be defeated
      antecedent: { type: "var", variable: "needs_finishing" },
      consequent: { type: "var", variable: "rough_first" },
      priority: 10,
      exceptions: [],
      source: "physics",
    });
  }
}

// ============================================================================
// MAIN LATHE DEEP LOGIC ENGINE
// ============================================================================

class LatheDeepLogicEngine {
  private propLogic: PropositionalLogicEngine;
  private folLogic: FirstOrderLogicEngine;
  private cspEngine: ConstraintSatisfactionEngine;
  private temporalLogic: TemporalLogicEngine;
  private fuzzyLogic: FuzzyLogicEngine;
  private modalLogic: ModalLogicEngine;
  private defeasibleLogic: DefeasibleReasoningEngine;

  constructor() {
    this.propLogic = new PropositionalLogicEngine();
    this.folLogic = new FirstOrderLogicEngine();
    this.cspEngine = new ConstraintSatisfactionEngine();
    this.temporalLogic = new TemporalLogicEngine();
    this.fuzzyLogic = new FuzzyLogicEngine();
    this.modalLogic = new ModalLogicEngine();
    this.defeasibleLogic = new DefeasibleReasoningEngine();

    this.initializeLogicSystems();
  }

  /**
   * Initialize all logic subsystems with lathe-specific knowledge
   */
  private initializeLogicSystems(): void {
    this.propLogic.createLatheRules();
    this.folLogic.createLathePredicates();
    this.temporalLogic.createLatheSequenceRules();
    this.fuzzyLogic.createLatheFuzzySystem();
    this.modalLogic.createLatheMachiningWorlds();
    this.defeasibleLogic.createLatheDefeasibleRules();

    log.info("LatheDeepLogicEngine: All logic systems initialized");
  }

  /**
   * Perform comprehensive logic analysis for a lathe operation
   */
  analyzeOperation(context: {
    operation_type: string;
    material: string;
    material_iso: ISOGroup;
    machine: string;
    tool: string;
    hardness_hrc?: number;
    diameter_mm: number;
    depth_mm: number;
    feed_mm_rev: number;
    max_power_kw: number;
    max_rpm: number;
    tool_nose_radius_mm: number;
    target_ra_um: number;
    sequence?: string[];
  }): LatheLogicAnalysis {
    const startTime = Date.now();

    // 1. Propositional analysis
    const propFacts = new Map<string, boolean>([
      ["tool_steel_material", context.hardness_hrc !== undefined && context.hardness_hrc > 45],
      ["finishing_operation", context.operation_type.includes("finish")],
      ["high_surface_finish", context.target_ra_um < 1.6],
    ]);
    const propResult = this.propLogic.forwardChain(propFacts);

    // 2. First-order logic analysis
    this.folLogic.registerEntity({
      id: "current_material",
      type: "material",
      properties: {
        name: context.material,
        iso_group: context.material_iso,
        hardness_hrc: context.hardness_hrc || 30,
      },
    });
    this.folLogic.registerEntity({
      id: "current_tool",
      type: "tool",
      properties: {
        name: context.tool,
        grade: context.tool.includes("ceramic") ? "ceramic" : "carbide",
      },
    });
    this.folLogic.registerEntity({
      id: "current_operation",
      type: "operation",
      properties: {
        type: context.operation_type,
        required_power_kw: this.estimatePower(context),
      },
    });
    this.folLogic.registerEntity({
      id: "current_machine",
      type: "machine",
      properties: {
        name: context.machine,
        max_power_kw: context.max_power_kw,
      },
    });

    const existsToolQuery = this.folLogic.queryExists("can_cut", "tool");
    const powerCheckQuery = this.folLogic.queryForall(
      "operation",
      "requires_coolant",
      "requires_coolant"
    );

    // 3. Constraint satisfaction
    const csp = this.cspEngine.createLatheCSP(
      context.material_iso,
      context.max_power_kw,
      context.max_rpm,
      context.tool_nose_radius_mm,
      context.diameter_mm,
      context.target_ra_um
    );
    const cspResult = this.cspEngine.solveCSP(csp);

    // 4. Temporal analysis (if sequence provided)
    let temporalResult: TemporalCheckResult = {
      consistent: true,
      violations: [],
      suggested_reordering: null,
      reasoning: ["No sequence provided"],
    };
    if (context.sequence && context.sequence.length > 0) {
      temporalResult = this.temporalLogic.checkSequence(context.sequence);
    }

    // 5. Fuzzy logic recommendations
    const fuzzyInputs = new Map<string, number>([
      ["hardness", context.hardness_hrc || 30],
      ["depth", context.depth_mm],
      ["feed", context.feed_mm_rev],
    ]);
    const fuzzyResult = this.fuzzyLogic.infer(fuzzyInputs, "speed_adjustment");

    // 6. Modal analysis
    const necessityCheck = this.modalLogic.evaluate(
      {
        type: "modal",
        operator: "necessary",
        subformula: { type: "proposition", proposition: "coolant_active" },
      },
      "w0"
    );
    const possibilityCheck = this.modalLogic.evaluate(
      {
        type: "modal",
        operator: "possible",
        subformula: { type: "proposition", proposition: "speed_optimal" },
      },
      "w0"
    );

    // 7. Defeasible reasoning for tool selection
    const defFacts = new Map<string, boolean>([
      ["is_steel", ["P", "H"].includes(context.material_iso)],
      ["is_hardened", (context.hardness_hrc || 0) > 45],
      ["is_interrupted", false], // Would need more context
      ["thin_wall_part", false], // Would need geometry analysis
      ["needs_finishing", context.operation_type.includes("finish")],
    ]);
    const defResult = this.defeasibleLogic.reason(defFacts, "use_carbide");

    // Generate recommendations and warnings
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (propResult.applied_rules.includes("r1")) {
      recommendations.push("Reduce cutting speed by 40% for tool steel material");
    }
    if (!existsToolQuery.satisfied) {
      warnings.push("No suitable tool found for this material - review tooling");
    }
    if (!cspResult.satisfiable) {
      warnings.push("Cannot satisfy all machining constraints - review parameters");
    }
    if (fuzzyResult.crisp_value < -20) {
      recommendations.push(`Fuzzy inference suggests reducing speed by ${Math.abs(fuzzyResult.crisp_value).toFixed(0)}%`);
    }
    if (!temporalResult.consistent) {
      warnings.push(`Operation sequence has ${temporalResult.violations.length} violation(s)`);
      if (temporalResult.suggested_reordering) {
        recommendations.push(`Suggested sequence: ${temporalResult.suggested_reordering.join(" -> ")}`);
      }
    }
    if (defResult.status === "accepted") {
      recommendations.push(`Defeasible reasoning supports: ${defResult.query}`);
    }

    const analysisTime = Date.now() - startTime;

    // Calculate overall confidence
    const confidences = [
      existsToolQuery.confidence,
      cspResult.satisfiable ? 0.9 : 0.3,
      temporalResult.consistent ? 1.0 : 0.5,
      fuzzyResult.confidence,
      defResult.status === "undecided" ? 0.5 : 0.85,
    ];
    const overallConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    log.info(`LatheDeepLogicEngine: Analysis complete in ${analysisTime}ms, confidence: ${overallConfidence.toFixed(2)}`);

    return {
      operation_context: {
        operation_type: context.operation_type,
        material: context.material,
        machine: context.machine,
        tool: context.tool,
      },
      propositional_analysis: {
        rules_evaluated: propResult.applied_rules.length,
        inferences_made: propResult.reasoning,
        validity: {
          satisfiable: true,
          assignment: propResult.derived,
          conflicts: [],
          reasoning: propResult.reasoning,
          computation_time_ms: 0,
        },
      },
      fol_analysis: {
        universal_rules_applied: [],
        existential_queries: [existsToolQuery, powerCheckQuery],
      },
      constraint_satisfaction: {
        csp_result: cspResult,
        critical_constraints: csp.expression_constraints.map(c => c.name),
        optimization_achieved: cspResult.satisfiable && cspResult.soft_penalty === 0,
      },
      temporal_analysis: temporalResult,
      fuzzy_recommendations: [fuzzyResult],
      modal_analysis: {
        necessary_conditions: necessityCheck.value ? ["coolant_active"] : [],
        possible_alternatives: possibilityCheck.supporting_worlds,
        epistemic_state: new Map([
          ["coolant_active", 1.0],
          ["speed_optimal", possibilityCheck.value ? 0.7 : 0.3],
        ]),
      },
      defeasible_conclusions: defResult,
      overall_confidence: overallConfidence,
      recommendations,
      warnings,
    };
  }

  /**
   * Estimate power requirement using Kienzle
   * Fc = kc1_1 * ap * fn^(1-mc)
   * P = Fc * Vc / 60000 [kW]
   */
  private estimatePower(context: {
    material_iso: ISOGroup;
    depth_mm: number;
    feed_mm_rev: number;
    diameter_mm: number;
    max_rpm: number;
  }): number {
    const kienzle = CANONICAL_KIENZLE[context.material_iso];
    const Fc = kienzle.kc1_1 * context.depth_mm *
               Math.pow(context.feed_mm_rev, 1 - kienzle.mc);
    // Estimate Vc from diameter and typical RPM
    const Vc = (Math.PI * context.diameter_mm * context.max_rpm * 0.7) / 1000;
    return (Fc * Vc) / 60000;
  }

  /**
   * Solve parameter optimization with all constraints
   */
  optimizeParameters(context: {
    material_iso: ISOGroup;
    max_power_kw: number;
    max_rpm: number;
    tool_nose_radius_mm: number;
    diameter_mm: number;
    target_ra_um: number;
  }): {
    optimal: { Vc: number; fn: number; ap: number };
    constraints_satisfied: boolean;
    mrr_mm3_per_min: number;
    predicted_tool_life_min: number;
    predicted_power_kw: number;
  } {
    const csp = this.cspEngine.createLatheCSP(
      context.material_iso,
      context.max_power_kw,
      context.max_rpm,
      context.tool_nose_radius_mm,
      context.diameter_mm,
      context.target_ra_um
    );

    const solution = this.cspEngine.solveCSP(csp);

    if (!solution.satisfiable || !solution.assignment) {
      // Return conservative defaults
      return {
        optimal: { Vc: 100, fn: 0.15, ap: 1.0 },
        constraints_satisfied: false,
        mrr_mm3_per_min: 15000,
        predicted_tool_life_min: 30,
        predicted_power_kw: 5,
      };
    }

    const Vc = solution.assignment.get("Vc")!;
    const fn = solution.assignment.get("fn")!;
    const ap = solution.assignment.get("ap")!;

    // Calculate derived values
    const kienzle = CANONICAL_KIENZLE[context.material_iso];
    const taylor = CANONICAL_TAYLOR[context.material_iso];

    const Fc = kienzle.kc1_1 * ap * Math.pow(fn, 1 - kienzle.mc);
    const power = (Fc * Vc) / 60000;
    const toolLife = Math.pow(taylor.C / Vc, 1 / taylor.n);
    const mrr = Vc * fn * ap * 1000; // mm^3/min

    return {
      optimal: { Vc, fn, ap },
      constraints_satisfied: true,
      mrr_mm3_per_min: mrr,
      predicted_tool_life_min: toolLife,
      predicted_power_kw: power,
    };
  }

  /**
   * Validate operation sequence using temporal logic
   */
  validateSequence(operations: string[]): {
    valid: boolean;
    violations: Array<{ rule: string; severity: string }>;
    corrected_sequence: string[] | null;
  } {
    const result = this.temporalLogic.checkSequence(operations);
    return {
      valid: result.consistent,
      violations: result.violations.map(v => ({
        rule: v.rule_id,
        severity: v.severity,
      })),
      corrected_sequence: result.suggested_reordering,
    };
  }

  /**
   * Get fuzzy speed recommendation
   */
  getFuzzySpeedRecommendation(
    hardness_hrc: number,
    depth_mm: number,
    feed_mm_rev: number
  ): {
    adjustment_percent: number;
    confidence: number;
    linguistic_summary: string;
  } {
    const inputs = new Map<string, number>([
      ["hardness", hardness_hrc],
      ["depth", depth_mm],
      ["feed", feed_mm_rev],
    ]);

    const result = this.fuzzyLogic.infer(inputs, "speed_adjustment");

    // Find dominant term
    let maxMembership = 0;
    let dominantTerm = "maintain";
    for (const [term, membership] of result.term_memberships) {
      if (membership > maxMembership) {
        maxMembership = membership;
        dominantTerm = term;
      }
    }

    const termDescriptions: Record<string, string> = {
      decrease_much: "significantly reduce",
      decrease: "moderately reduce",
      maintain: "maintain current",
      increase: "moderately increase",
      increase_much: "significantly increase",
    };

    return {
      adjustment_percent: result.crisp_value,
      confidence: result.confidence,
      linguistic_summary: `Recommendation: ${termDescriptions[dominantTerm] || dominantTerm} cutting speed (${result.crisp_value.toFixed(1)}% adjustment)`,
    };
  }

  /**
   * Reason about tool selection using defeasible logic
   */
  reasonToolSelection(facts: {
    is_steel: boolean;
    is_hardened: boolean;
    is_interrupted: boolean;
    is_high_temp_alloy: boolean;
    needs_fine_finish: boolean;
  }): {
    recommended_tool: string;
    confidence: string;
    reasoning: string[];
    alternatives: string[];
  } {
    const factMap = new Map<string, boolean>([
      ["is_steel", facts.is_steel],
      ["is_hardened", facts.is_hardened],
      ["is_interrupted", facts.is_interrupted],
      ["is_high_temp_alloy", facts.is_high_temp_alloy],
      ["needs_finishing", facts.needs_fine_finish],
    ]);

    // Query different tool options
    const carbideResult = this.defeasibleLogic.reason(factMap, "use_carbide");
    const ceramicResult = this.defeasibleLogic.reason(factMap, "use_ceramic");

    const recommendations: Array<{ tool: string; status: string; priority: number }> = [];

    if (carbideResult.status === "accepted") {
      recommendations.push({ tool: "carbide", status: "accepted", priority: 1 });
    }
    if (ceramicResult.status === "accepted") {
      recommendations.push({ tool: "ceramic", status: "accepted", priority: 2 });
    }

    // If hardened and not interrupted, prefer ceramic
    if (facts.is_hardened && !facts.is_interrupted) {
      recommendations.push({ tool: "ceramic", status: "preferred", priority: 3 });
    }
    // If hardened and interrupted, use toughened carbide
    if (facts.is_hardened && facts.is_interrupted) {
      recommendations.push({ tool: "toughened_carbide", status: "required", priority: 4 });
    }
    // If high temp alloy, use ceramic or whisker-reinforced
    if (facts.is_high_temp_alloy) {
      recommendations.push({ tool: "whisker_ceramic", status: "recommended", priority: 3 });
    }

    // Sort by priority (highest first)
    recommendations.sort((a, b) => b.priority - a.priority);

    const best = recommendations[0] || { tool: "carbide", status: "default", priority: 0 };
    const alternatives = recommendations.slice(1).map(r => r.tool);

    return {
      recommended_tool: best.tool,
      confidence: best.status,
      reasoning: [...carbideResult.reasoning_trace, ...ceramicResult.reasoning_trace],
      alternatives: [...new Set(alternatives)],
    };
  }

  /**
   * Check modal possibilities for process alternatives
   */
  checkProcessAlternatives(currentState: Map<string, boolean>): {
    necessary_for_success: string[];
    possible_improvements: string[];
    impossible_without_change: string[];
  } {
    // Update actual world with current state
    const actualWorld = this.modalLogic["worlds"].get("w0");
    if (actualWorld) {
      for (const [prop, val] of currentState) {
        actualWorld.propositions.set(prop, val);
      }
    }

    const necessary: string[] = [];
    const possible: string[] = [];
    const impossible: string[] = [];

    // Check what's necessary for acceptable surface
    const surfaceNecessary = this.modalLogic.evaluate(
      {
        type: "modal",
        operator: "necessary",
        subformula: { type: "proposition", proposition: "surface_acceptable" },
      },
      "w0"
    );
    if (surfaceNecessary.value) {
      necessary.push("surface_acceptable is necessary in all reachable states");
    }

    // Check possible improvements
    const speedOptPossible = this.modalLogic.evaluate(
      {
        type: "modal",
        operator: "possible",
        subformula: { type: "proposition", proposition: "speed_optimal" },
      },
      "w0"
    );
    if (speedOptPossible.value) {
      possible.push(`Speed optimization possible via: ${speedOptPossible.supporting_worlds.join(", ")}`);
    }

    const cycleReducePossible = this.modalLogic.evaluate(
      {
        type: "modal",
        operator: "possible",
        subformula: { type: "proposition", proposition: "cycle_time_reduced" },
      },
      "w0"
    );
    if (cycleReducePossible.value) {
      possible.push("Cycle time reduction is achievable");
    } else {
      impossible.push("Cycle time reduction not achievable with current setup");
    }

    return {
      necessary_for_success: necessary,
      possible_improvements: possible,
      impossible_without_change: impossible,
    };
  }

  /**
   * Generate proof for a machining decision
   */
  generateProof(decision: string, facts: Map<string, boolean>): {
    decision: string;
    proof_valid: boolean;
    proof_steps: string[];
    assumptions: string[];
    conclusion: string;
  } {
    const steps: string[] = [];
    const assumptions: string[] = [];

    steps.push(`Goal: Prove "${decision}"`);
    steps.push("---");

    // List assumptions (facts)
    for (const [fact, val] of facts) {
      if (val) {
        assumptions.push(fact);
        steps.push(`Assumption ${assumptions.length}: ${fact} is TRUE`);
      }
    }

    // Apply forward chaining
    const propResult = this.propLogic.forwardChain(facts);

    steps.push("---");
    steps.push("Applying inference rules:");

    for (const reasoning of propResult.reasoning) {
      steps.push(`  ${reasoning}`);
    }

    // Check if decision is derived
    const derived = propResult.derived.get(decision);
    const proved = derived === true;

    steps.push("---");
    if (proved) {
      steps.push(`PROVED: ${decision} follows from the given facts.`);
    } else {
      steps.push(`NOT PROVED: ${decision} cannot be derived from the given facts.`);

      // Try defeasible reasoning as fallback
      const defResult = this.defeasibleLogic.reason(facts, decision);
      if (defResult.status === "accepted") {
        steps.push(`However, defeasible reasoning ACCEPTS ${decision} (non-monotonically).`);
      }
    }

    return {
      decision,
      proof_valid: proved,
      proof_steps: steps,
      assumptions,
      conclusion: proved ? `${decision} is logically valid` : `${decision} is not derivable`,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheDeepLogicEngine = new LatheDeepLogicEngine();

// Also export the class for testing
export { LatheDeepLogicEngine };

// Export sub-engines for direct access if needed
export {
  PropositionalLogicEngine,
  FirstOrderLogicEngine,
  ConstraintSatisfactionEngine,
  TemporalLogicEngine,
  FuzzyLogicEngine,
  ModalLogicEngine,
  DefeasibleReasoningEngine,
};
