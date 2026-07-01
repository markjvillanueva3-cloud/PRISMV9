/**
 * PRISM MCP Server -- Feature Interaction Engine
 *
 * Manufacturing feature interaction analysis:
 * - Precedence graph construction (type rules + geometric nesting)
 * - Topological sort with priority (Kahn's algorithm)
 * - Feature interaction detection (interference, tolerance, access blocking)
 * - Accessibility analysis (6-direction approach)
 * - Setup minimization (direction grouping)
 *
 * Based on MIT 16.410, MIT 2.008.
 * Ported from PRISM_FEATURE_INTERACTION_ENGINE.js (monolith R2.3.1).
 *
 * @module FeatureInteractionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Bounds3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface MfgFeature {
  id: string;
  type: string;
  parentFeatureId?: string;
  bounds?: Bounds3D;
  center?: { x: number; y: number; z: number };
  stage?: string;
  volume?: number;
  tolerances?: Array<{ datum?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

/**
 * Severity of a precedence edge. Most edges are normal type-based or geometric
 * constraints. When a constraint matches a playbook anti-pattern, the edge is
 * elevated to the anti-pattern's severity ("critical" | "important" | …) and
 * carries the matched rule IDs for traceability. PB-MS0/P3-U01.
 */
export type PrecedenceEdgeSeverity = "normal" | "critical" | "important" | "recommended" | "tip";

/**
 * Anti-pattern shape used by the cross-reference helper. Matches the subset of
 * `PlaybookRule` (`MachiningPlaybookEngine`) that the cross-ref logic reads.
 * Kept as a structural type so tests can inject fixtures without importing the
 * full PlaybookRule (with its 14+ optional fields). PB-MS0/P3-U01.
 */
export interface AntiPatternRule {
  id: string;
  severity: string;
  title: string;
  rule: string;
  reasoning: string;
}

/**
 * Severity rank table — single source of truth shared between the engine and
 * its tests. Critical > important > recommended > tip > normal. When multiple
 * anti-patterns match a single precedence edge, the highest-ranked severity
 * wins. PB-MS0/P3-U01.
 */
export const PRECEDENCE_SEVERITY_RANK: Readonly<Record<string, number>> = Object.freeze({
  normal: 0,
  tip: 1,
  recommended: 2,
  important: 3,
  critical: 4,
});

/**
 * Pure matcher: given an edge's two endpoint feature types + a list of
 * anti-pattern rules, return the elevation to apply (highest-rank severity +
 * matching rule IDs) or `null` if no anti-pattern references BOTH endpoints.
 *
 * The both-endpoints rule is what prevents global false-positive elevation —
 * a rule mentioning only one endpoint type would otherwise elevate every edge
 * that touched a feature of that type. PB-MS0/P3-U01.
 *
 * @param fromType      Lowercased feature type at edge tail
 * @param toType        Lowercased feature type at edge head
 * @param antiPatterns  Candidate anti-pattern rules (already filtered by category)
 * @returns Elevation result, or `null` to leave the edge unchanged
 */
export function matchAntiPatternsToEdge(
  fromType: string,
  toType: string,
  antiPatterns: readonly AntiPatternRule[],
): { severity: PrecedenceEdgeSeverity; ruleIds: string[] } | null {
  if (!fromType || !toType || antiPatterns.length === 0) return null;
  const matchedIds: string[] = [];
  let maxSeverity: PrecedenceEdgeSeverity | null = null;
  let maxRank = PRECEDENCE_SEVERITY_RANK.normal;

  for (const ap of antiPatterns) {
    const ruleText = `${ap.title} ${ap.rule} ${ap.reasoning}`.toLowerCase();
    if (ruleText.includes(fromType) && ruleText.includes(toType)) {
      const apRank = PRECEDENCE_SEVERITY_RANK[ap.severity];
      // Skip rules whose severity isn't in the rank table — they cannot
      // legitimately elevate any edge. Returning a "normal" elevation with
      // attached ruleIds would violate the elevation-is-meaningful contract.
      if (apRank === undefined) continue;
      if (!matchedIds.includes(ap.id)) matchedIds.push(ap.id);
      if (apRank > maxRank) {
        maxRank = apRank;
        maxSeverity = ap.severity as PrecedenceEdgeSeverity;
      }
    }
  }

  return (matchedIds.length > 0 && maxSeverity !== null)
    ? { severity: maxSeverity, ruleIds: matchedIds }
    : null;
}

export interface PrecedenceEdge {
  from: string;
  to: string;
  type: string;
  constraint: string;
  /** Elevated when a playbook anti-pattern matches the constraint. PB-MS0/P3-U01. */
  severity?: PrecedenceEdgeSeverity;
  /** Playbook rule IDs that elevated this edge. PB-MS0/P3-U01. */
  antiPatternRuleIds?: string[];
}

export interface PrecedenceGraph {
  nodes: Map<string, { feature: MfgFeature; predecessors: string[]; successors: string[] }>;
  edges: PrecedenceEdge[];
  adjacencyList: Map<string, string[]>;
}

export interface Interaction {
  type: string;
  features: [string, string];
  description: string;
  recommendation?: string;
  blocker?: string;
  blocked?: string;
}

export interface SequenceResult {
  success: boolean;
  sequence?: string[];
  operations?: MfgFeature[];
  error?: string;
}

export interface SetupPlan {
  setups: Array<{
    id: string;
    primaryDirection?: string;
    features: MfgFeature[];
    estimatedTime?: number;
    requiresIndexing?: boolean;
    requiresSpecialFixturing?: boolean;
    notes?: string;
  }>;
  totalSetups: number;
  featureCount: number;
  efficiency: number;
  workholding_suggestions?: string[];
  datum_strategy?: string;
  playbook_applied_rules?: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

const PRECEDENCE_RULES: Record<string, string[]> = {
  THREAD: ["HOLE", "BORE"],
  COUNTERBORE: ["HOLE"],
  COUNTERSINK: ["HOLE"],
  TAP: ["HOLE", "BORE"],
  REAM: ["HOLE", "BORE"],
  FINISH_SURFACE: ["ROUGH_SURFACE"],
  INTERNAL_GROOVE: ["BORE"],
  KEYWAY: ["BORE"],
  FINISH_BORE: ["ROUGH_BORE"],
  POLISH: ["FINISH_SURFACE"],
};

const INTERACTION_TYPES = {
  PRECEDENCE: "precedence",
  INTERFERENCE: "interference",
  SHARED_SETUP: "shared_setup",
  ACCESS_BLOCK: "access_block",
  TOLERANCE: "tolerance",
};

class FeatureInteractionEngineImpl {

  /** Build precedence graph from feature list. */
  buildPrecedenceGraph(features: MfgFeature[]): PrecedenceGraph {
    const graph: PrecedenceGraph = {
      nodes: new Map(),
      edges: [],
      adjacencyList: new Map(),
    };

    for (const f of features) {
      graph.nodes.set(f.id, { feature: f, predecessors: [], successors: [] });
      graph.adjacencyList.set(f.id, []);
    }

    // Type-based precedence
    for (const f of features) {
      const required = PRECEDENCE_RULES[f.type] ?? [];
      for (const priorType of required) {
        const priors = features.filter(p =>
          p.type === priorType && (p.id === f.parentFeatureId || this._featuresOverlap(p, f)),
        );
        for (const prior of priors) {
          this._addEdge(graph, prior.id, f.id, `${priorType} before ${f.type}`);
        }
      }
    }

    // Geometric nesting precedence
    for (const f1 of features) {
      for (const f2 of features) {
        if (f1.id !== f2.id && this._isNested(f2, f1)) {
          if (!graph.adjacencyList.get(f1.id)!.includes(f2.id)) {
            this._addEdge(graph, f1.id, f2.id, "Container feature before nested");
          }
        }
      }
    }

    // PB-MS0/P3-U01: cross-reference precedence edges with playbook anti-patterns;
    // elevate severity + record matched rule IDs for downstream consumers.
    this._crossReferenceAntiPatterns(graph, features);

    return graph;
  }

  /**
   * For each precedence edge in `graph`, query the playbook anti-pattern set
   * and elevate the edge when an anti-pattern rule mentions both endpoint
   * feature types. Fail-soft — if the playbook isn't available the graph is
   * returned unchanged. Mutates `graph.edges` in place. PB-MS0/P3-U01.
   *
   * @param graph     Precedence graph whose edges are cross-referenced
   * @param features  Feature list (provides feature-type metadata for endpoints)
   */
  private _crossReferenceAntiPatterns(graph: PrecedenceGraph, features: MfgFeature[]): void {
    let antiPatterns: readonly AntiPatternRule[] = [];
    try {
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
      const featureTypes = features.map(f => f.type?.toLowerCase()).filter((t): t is string => Boolean(t));
      if (featureTypes.length === 0) return;
      antiPatterns = (machiningPlaybookEngine.antiPatterns({ features: featureTypes }) ?? []) as readonly AntiPatternRule[];
    } catch { return; }

    if (antiPatterns.length === 0) return;
    this.applyAntiPatternsToEdges(graph, antiPatterns);
  }

  /**
   * Apply a pre-fetched anti-pattern list to a graph's edges. Split out from
   * `_crossReferenceAntiPatterns` so tests can inject deterministic anti-pattern
   * fixtures and exercise the matching/elevation paths without depending on the
   * live MachiningPlaybookEngine state. PB-MS0/P3-U01.
   *
   * @param graph         Precedence graph (mutated in place)
   * @param antiPatterns  Anti-pattern rules to test each edge against
   */
  applyAntiPatternsToEdges(graph: PrecedenceGraph, antiPatterns: readonly AntiPatternRule[]): void {
    for (const edge of graph.edges) {
      const fromType = graph.nodes.get(edge.from)?.feature.type?.toLowerCase();
      const toType = graph.nodes.get(edge.to)?.feature.type?.toLowerCase();
      if (!fromType || !toType) continue;

      const match = matchAntiPatternsToEdge(fromType, toType, antiPatterns);
      if (match) {
        edge.severity = match.severity;
        edge.antiPatternRuleIds = match.ruleIds;
      }
    }
  }

  /** Detect interactions between feature pairs. */
  detectInteractions(features: MfgFeature[]): Interaction[] {
    const interactions: Interaction[] = [];

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const f1 = features[i], f2 = features[j];

        if (this._featuresOverlap(f1, f2) && f1.type !== f2.type) {
          interactions.push({
            type: INTERACTION_TYPES.INTERFERENCE,
            features: [f1.id, f2.id],
            description: `${f1.type} and ${f2.type} have geometric interference`,
          });
        }

        if (this._haveToleranceRelation(f1, f2)) {
          interactions.push({
            type: INTERACTION_TYPES.TOLERANCE,
            features: [f1.id, f2.id],
            description: "Features share tight tolerance",
            recommendation: "Machine in same setup if possible",
          });
        }
      }
    }
    return interactions;
  }

  /** Topological sort with priority (roughing first, larger first). */
  generateOperationSequence(graph: PrecedenceGraph): SequenceResult {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    for (const [id, node] of graph.nodes) {
      inDegree.set(id, node.predecessors.length);
      if (node.predecessors.length === 0) queue.push(id);
    }

    const sequence: string[] = [];
    const typeOrder: Record<string, number> = { ROUGH: 0, SEMI_FINISH: 1, FINISH: 2 };

    while (queue.length > 0) {
      queue.sort((a, b) => {
        const fA = graph.nodes.get(a)!.feature;
        const fB = graph.nodes.get(b)!.feature;
        const tA = typeOrder[fA.stage ?? ""] ?? 1;
        const tB = typeOrder[fB.stage ?? ""] ?? 1;
        if (tA !== tB) return tA - tB;
        return (fB.volume ?? 0) - (fA.volume ?? 0);
      });

      const current = queue.shift()!;
      sequence.push(current);

      for (const succ of graph.adjacencyList.get(current) ?? []) {
        const deg = inDegree.get(succ)! - 1;
        inDegree.set(succ, deg);
        if (deg === 0) queue.push(succ);
      }
    }

    if (sequence.length !== graph.nodes.size) {
      return { success: false, error: "Cycle detected in precedence graph" };
    }

    return {
      success: true,
      sequence,
      operations: sequence.map(id => graph.nodes.get(id)!.feature),
    };
  }

  /** Minimize setups by grouping features by access direction. */
  minimizeSetups(features: MfgFeature[]): SetupPlan {
    const dirGroups = new Map<string, MfgFeature[]>();
    const directions = ["+Z", "-Z", "+X", "-X", "+Y", "-Y"];

    for (const f of features) {
      // Assign primary direction based on feature orientation
      const dir = this._primaryDirection(f) ?? directions[0];
      if (!dirGroups.has(dir)) dirGroups.set(dir, []);
      dirGroups.get(dir)!.push(f);
    }

    const opposites: Record<string, string> = { "+Z": "-Z", "-Z": "+Z", "+X": "-X", "-X": "+X", "+Y": "-Y", "-Y": "+Y" };
    const processed = new Set<string>();
    const setups: SetupPlan["setups"] = [];

    for (const [dir, feats] of dirGroups) {
      if (processed.has(dir)) continue;
      const setup: SetupPlan["setups"][0] = {
        id: `SETUP_${setups.length + 1}`,
        primaryDirection: dir,
        features: [...feats],
        estimatedTime: 5 + feats.length * 2,
      };

      const opp = opposites[dir];
      if (opp && dirGroups.has(opp) && !processed.has(opp)) {
        setup.features.push(...dirGroups.get(opp)!);
        setup.requiresIndexing = true;
        processed.add(opp);
      }
      setups.push(setup);
      processed.add(dir);
    }

    // Playbook workholding & datum advice
    let workholdingSuggestions: string[] | undefined;
    let datumStrategy: string | undefined;
    let playbookRules: string[] | undefined;
    try {
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
      const featureTypes = features.map(f => f.type?.toLowerCase() ?? "unknown");
      const setupResult = machiningPlaybookEngine.setupAdvice(featureTypes);
      workholdingSuggestions = setupResult.workholding_suggestions;
      datumStrategy = setupResult.datum_strategy;
      playbookRules = setupResult.applied_rules;
    } catch { /* playbook not available */ }

    return {
      setups,
      totalSetups: setups.length,
      featureCount: features.length,
      efficiency: setups.length > 0 ? features.length / setups.length : 0,
      workholding_suggestions: workholdingSuggestions,
      datum_strategy: datumStrategy,
      playbook_applied_rules: playbookRules,
    };
  }

  // ── Private helpers ──

  private _addEdge(graph: PrecedenceGraph, from: string, to: string, constraint: string): void {
    graph.edges.push({ from, to, type: INTERACTION_TYPES.PRECEDENCE, constraint });
    graph.nodes.get(from)!.successors.push(to);
    graph.nodes.get(to)!.predecessors.push(from);
    graph.adjacencyList.get(from)!.push(to);
  }

  private _featuresOverlap(f1: MfgFeature, f2: MfgFeature): boolean {
    if (!f1.bounds || !f2.bounds) return false;
    const a = f1.bounds, b = f2.bounds;
    return !(a.max.x < b.min.x || a.min.x > b.max.x ||
             a.max.y < b.min.y || a.min.y > b.max.y ||
             a.max.z < b.min.z || a.min.z > b.max.z);
  }

  private _isNested(inner: MfgFeature, outer: MfgFeature): boolean {
    if (!inner.bounds || !outer.bounds) return false;
    const a = inner.bounds, b = outer.bounds;
    return a.min.x >= b.min.x && a.max.x <= b.max.x &&
           a.min.y >= b.min.y && a.max.y <= b.max.y &&
           a.min.z >= b.min.z && a.max.z <= b.max.z;
  }

  private _haveToleranceRelation(f1: MfgFeature, f2: MfgFeature): boolean {
    if (!f1.tolerances || !f2.tolerances) return false;
    return f1.tolerances.some(t => t.datum === f2.id) || f2.tolerances.some(t => t.datum === f1.id);
  }

  private _primaryDirection(f: MfgFeature): string | null {
    if (!f.center) return null;
    // Simple heuristic: features near top → +Z, near bottom → -Z, etc.
    return "+Z";
  }
}

export const featureInteractionEngine = new FeatureInteractionEngineImpl();
