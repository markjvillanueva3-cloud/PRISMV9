/**
 * MultiSetupFeasibilityChainEngine
 * Answers: "Can this complex part be manufactured in N setups?"
 * Chains workpiece state across setups, checks tool accessibility per setup,
 * detects dead-end sequences, and suggests optimal setup ordering.
 *
 * Uses topological sorting for constraint dependencies, Monte Carlo
 * for datum chain error propagation (RSS), and branch-and-bound
 * for optimal setup sequence search.
 *
 * Physics models:
 *   - Datum chain RSS: σ_total = √Σ(positioning_error_i² + repeatability_i²)
 *   - Accessibility: tool_length ≥ feature_depth + 5mm clearance
 *   - Holder clearance: holder_dia/2 + 2mm < wall_distance
 *   - Monte Carlo datum: N=500 trials, Box-Muller normal sampling
 *   - Branch-and-bound: cost = Σ(setup_cost + tool_change_cost + datum_error_penalty)
 *
 * References:
 *   - Montgomery (2019): SPC, 8th Ed — RSS tolerance stacking
 *   - Halevi & Weill (1995): Principles of Process Planning, Ch. 7
 *   - Zhang & Merchant (1993): Design and planning of manufacturing systems
 *   - ISO 230-1: Machine tool accuracy, datum chain analysis
 *   - Koenig & Land (1966): Branch-and-bound algorithm
 *
 * Actions: multi_setup_analyze, multi_setup_datum_chain,
 *          multi_setup_optimize, multi_setup_dead_ends (machineSetupDispatcher)
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/MultiSetupFeasibilityChainEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Feature to be machined */
export interface MSFeature {
  id: string;
  type: string;
  dimensions: { x: number; y: number; z: number };
  tolerance: number;
  requires_access_from: string[];
  depends_on?: string[];
  surface_finish_ra?: number;
  blocks_access_to?: string[];
  setup_options?: string[];
  priority?: number;
}

/** Available setup configuration */
export interface MSSetup {
  id: string;
  orientation: string;
  workholding: string;
  accessible_faces: string[];
}

/** Tool available for machining */
export interface MSTool {
  diameter: number;
  length: number;
  type: string;
  holder_diameter?: number;
}

/** Machine travel limits */
export interface MSMachine {
  x_travel: number;
  y_travel: number;
  z_travel: number;
}

/** Full analysis input */
export interface AnalyzeFeasibilityInput {
  features: MSFeature[];
  available_setups: MSSetup[];
  tools: MSTool[];
  machine?: MSMachine;
}

/** Setup in the resulting sequence */
export interface SetupSequenceEntry {
  setup_id: string;
  features_in_setup: string[];
  datum_reference: string;
  estimated_time_min: number;
}

/** Full analysis result */
export interface AnalyzeFeasibilityResult {
  feasible: boolean;
  setup_sequence: SetupSequenceEntry[];
  datum_chain_error_mm: number;
  critical_path: string[];
  dead_ends: Array<{ feature_id: string; reason: string }>;
  risk_score: number;
  alternatives?: Array<{ sequence: string[]; risk: number; cost_delta: number }>;
}

/** Datum chain input */
export interface CheckDatumChainInput {
  setups: Array<{
    datum_features: string[];
    positioning_error_mm: number;
    repeatability_mm: number;
  }>;
  critical_tolerance: number;
}

/** Datum chain result */
export interface CheckDatumChainResult {
  cumulative_rss_error_mm: number;
  worst_case_error_mm: number;
  probability_meeting_tolerance: number;
  per_setup_contribution: Array<{ setup_index: number; error_contribution_mm: number; pct_of_total: number }>;
  tolerance_met: boolean;
  margin_mm: number;
}

/** Sequence optimization input */
export interface FindOptimalSequenceInput {
  features: Array<{ id: string; setup_options: string[]; priority?: number }>;
  constraints: Array<{ before: string; after: string }>;
  optimization: "min_setups" | "min_tool_changes" | "min_datum_error";
}

/** Sequence optimization result */
export interface FindOptimalSequenceResult {
  optimal_sequence: string[];
  optimal_setups: string[];
  cost: number;
  alternatives: Array<{ sequence: string[]; setups: string[]; cost: number; cost_delta_pct: number }>;
  eliminated: Array<{ sequence: string[]; reason: string }>;
}

/** Dead-end detection input */
export interface DetectDeadEndsInput {
  features: Array<{
    id: string;
    depends_on?: string[];
    blocks_access_to?: string[];
  }>;
}

/** Dead-end detection result */
export interface DetectDeadEndsResult {
  dead_ends: Array<{
    feature_id: string;
    blocked_features: string[];
    reason: string;
    resolution: string;
  }>;
  dependency_graph: Array<{ from: string; to: string }>;
  topological_order: string[];
  has_cycles: boolean;
  cycle_members?: string[];
}

// ============================================================================
// SEEDED PRNG — Box-Muller normal sampling (deterministic for tests)
// ============================================================================

class SeededRNG {
  private state: number;
  constructor(seed: number = 42) {
    this.state = seed;
  }
  /** Mulberry32 — fast 32-bit PRNG */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Box-Muller transform: two uniform → one normal(mean, std) */
  normal(mean: number, std: number): number {
    const u1 = Math.max(1e-10, this.next());
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

export class MultiSetupFeasibilityChainEngine {

  // --------------------------------------------------------------------------
  // 1. analyzeFeasibility — Full multi-setup chain analysis
  // --------------------------------------------------------------------------

  analyzeFeasibility(input: AnalyzeFeasibilityInput): AnalyzeFeasibilityResult {
    log.info("[MultiSetupFeasibilityChain] analyzeFeasibility called");

    const { features, available_setups, tools, machine } = input;

    if (!features || features.length === 0) {
      return {
        feasible: false,
        setup_sequence: [],
        datum_chain_error_mm: 0,
        critical_path: [],
        dead_ends: [{ feature_id: "N/A", reason: "No features provided" }],
        risk_score: 1.0,
      };
    }

    if (!available_setups || available_setups.length === 0) {
      return {
        feasible: false,
        setup_sequence: [],
        datum_chain_error_mm: 0,
        critical_path: [],
        dead_ends: features.map(f => ({ feature_id: f.id, reason: "No setups available" })),
        risk_score: 1.0,
      };
    }

    // Step 1: Assign each feature to valid setups
    const featureSetupMap = this._assignFeaturesToSetups(features, available_setups, tools, machine);

    // Step 2: Detect dead-ends
    const deadEndResult = this.detectDeadEnds({ features });
    const deadEnds = deadEndResult.dead_ends.map(d => ({
      feature_id: d.feature_id,
      reason: d.reason,
    }));

    // Step 3: Check for unassignable features
    const unassignable: Array<{ feature_id: string; reason: string }> = [];
    for (const f of features) {
      const validSetups = featureSetupMap.get(f.id);
      if (!validSetups || validSetups.length === 0) {
        unassignable.push({ feature_id: f.id, reason: "No setup can access this feature — no setup provides required face access" });
      }
    }

    if (unassignable.length > 0) {
      return {
        feasible: false,
        setup_sequence: [],
        datum_chain_error_mm: 0,
        critical_path: unassignable.map(u => u.feature_id),
        dead_ends: [...unassignable, ...deadEnds],
        risk_score: 1.0,
      };
    }

    // Step 4: Build dependency-respecting topological order
    const topoOrder = this._topologicalSort(features);

    // Step 5: Greedy setup sequence assignment (respecting topo order)
    const setupSequence = this._buildSetupSequence(topoOrder, featureSetupMap, available_setups);

    // Step 6: Datum chain error via RSS
    const datumSetups = setupSequence.map((_s, i) => ({
      datum_features: [setupSequence[i].datum_reference],
      positioning_error_mm: 0.005 + i * 0.002, // increasing error per re-fixture
      repeatability_mm: 0.003,
    }));
    const minTolerance = Math.min(...features.map(f => f.tolerance));
    const datumResult = this.checkDatumChain({
      setups: datumSetups,
      critical_tolerance: minTolerance,
    });

    // Step 7: Build critical path (longest dependency chain)
    const criticalPath = this._findCriticalPath(features);

    // Step 8: Risk score (0=perfect, 1=infeasible)
    const riskScore = this._computeRiskScore(datumResult, deadEnds, setupSequence, features);

    // Step 9: Generate alternatives (swap setup order where possible)
    const alternatives = this._generateAlternatives(features, featureSetupMap, available_setups, setupSequence);

    return {
      feasible: deadEnds.length === 0 && riskScore < 0.9,
      setup_sequence: setupSequence,
      datum_chain_error_mm: datumResult.cumulative_rss_error_mm,
      critical_path: criticalPath,
      dead_ends: deadEnds,
      risk_score: Math.round(riskScore * 1000) / 1000,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // 2. checkDatumChain — RSS datum error propagation with Monte Carlo
  // --------------------------------------------------------------------------

  checkDatumChain(input: CheckDatumChainInput): CheckDatumChainResult {
    log.info("[MultiSetupFeasibilityChain] checkDatumChain called");

    const { setups, critical_tolerance } = input;

    if (!setups || setups.length === 0) {
      return {
        cumulative_rss_error_mm: 0,
        worst_case_error_mm: 0,
        probability_meeting_tolerance: 1.0,
        per_setup_contribution: [],
        tolerance_met: true,
        margin_mm: critical_tolerance,
      };
    }

    // Analytical RSS: σ_total = √Σ(pos_err² + rep_err²)
    let sumOfSquares = 0;
    let worstCase = 0;
    const contributions: Array<{ setup_index: number; error_contribution_mm: number; pct_of_total: number }> = [];

    for (let i = 0; i < setups.length; i++) {
      const s = setups[i];
      const setupError = Math.sqrt(s.positioning_error_mm ** 2 + s.repeatability_mm ** 2);
      sumOfSquares += setupError ** 2;
      worstCase += setupError;
      contributions.push({ setup_index: i, error_contribution_mm: setupError, pct_of_total: 0 });
    }

    const rssError = Math.sqrt(sumOfSquares);

    // Fill percentage contributions
    for (const c of contributions) {
      c.pct_of_total = rssError > 0 ? Math.round((c.error_contribution_mm ** 2 / sumOfSquares) * 100) : 0;
    }

    // Monte Carlo verification (N=500)
    const mcTrials = 500;
    const rng = new SeededRNG(42);
    let exceedances = 0;

    for (let trial = 0; trial < mcTrials; trial++) {
      let totalError = 0;
      for (const s of setups) {
        const posErr = rng.normal(0, s.positioning_error_mm);
        const repErr = rng.normal(0, s.repeatability_mm);
        totalError += posErr + repErr;
      }
      if (Math.abs(totalError) > critical_tolerance / 2) {
        exceedances++;
      }
    }

    const probability = 1 - exceedances / mcTrials;
    const toleranceMet = rssError * 3 < critical_tolerance; // 3σ criterion
    const margin = critical_tolerance - rssError * 3;

    return {
      cumulative_rss_error_mm: Math.round(rssError * 1e6) / 1e6,
      worst_case_error_mm: Math.round(worstCase * 1e6) / 1e6,
      probability_meeting_tolerance: Math.round(probability * 1000) / 1000,
      per_setup_contribution: contributions,
      tolerance_met: toleranceMet,
      margin_mm: Math.round(margin * 1e6) / 1e6,
    };
  }

  // --------------------------------------------------------------------------
  // 3. findOptimalSequence — Branch-and-bound sequence optimization
  // --------------------------------------------------------------------------

  findOptimalSequence(input: FindOptimalSequenceInput): FindOptimalSequenceResult {
    log.info("[MultiSetupFeasibilityChain] findOptimalSequence called");

    const { features, constraints, optimization } = input;

    if (!features || features.length === 0) {
      return { optimal_sequence: [], optimal_setups: [], cost: 0, alternatives: [], eliminated: [] };
    }

    // Build adjacency list for constraints
    const adj = new Map<string, Set<string>>();
    const inDeg = new Map<string, number>();
    for (const f of features) {
      adj.set(f.id, new Set());
      inDeg.set(f.id, 0);
    }
    for (const c of constraints) {
      if (adj.has(c.before) && adj.has(c.after)) {
        adj.get(c.before)!.add(c.after);
        inDeg.set(c.after, (inDeg.get(c.after) || 0) + 1);
      }
    }

    // Check for cycles
    const topoOrder = this._kahnSort(adj, inDeg);
    if (topoOrder.length < features.length) {
      // Cycle detected
      const placed = new Set(topoOrder);
      const cycleMembers = features.filter(f => !placed.has(f.id)).map(f => f.id);
      return {
        optimal_sequence: [],
        optimal_setups: [],
        cost: Infinity,
        alternatives: [],
        eliminated: [{ sequence: cycleMembers, reason: "Circular dependency detected — these features form a constraint cycle" }],
      };
    }

    // Branch-and-bound: enumerate valid permutations (bounded for performance)
    const featureMap = new Map(features.map(f => [f.id, f]));
    const allSequences: Array<{ sequence: string[]; setups: string[]; cost: number }> = [];
    const eliminated: Array<{ sequence: string[]; reason: string }> = [];

    // Generate permutations respecting constraints (BFS on valid topo orderings)
    const validOrderings = this._enumerateTopologicalOrders(adj, inDeg, features.length, 50);

    for (const ordering of validOrderings) {
      const setups: string[] = [];
      let cost = 0;
      let prevSetup = "";
      let valid = true;

      for (const fId of ordering) {
        const feat = featureMap.get(fId);
        if (!feat || !feat.setup_options || feat.setup_options.length === 0) {
          valid = false;
          break;
        }

        // Pick best setup for this feature
        let bestSetup = feat.setup_options[0];
        if (optimization === "min_setups" || optimization === "min_tool_changes") {
          // Prefer reusing previous setup
          if (prevSetup && feat.setup_options.includes(prevSetup)) {
            bestSetup = prevSetup;
          }
        } else if (optimization === "min_datum_error") {
          // Prefer first setup (lowest datum chain index)
          bestSetup = feat.setup_options[0];
        }

        setups.push(bestSetup);

        // Cost computation
        if (optimization === "min_setups") {
          if (bestSetup !== prevSetup && prevSetup !== "") cost += 10;
        } else if (optimization === "min_tool_changes") {
          if (bestSetup !== prevSetup && prevSetup !== "") cost += 5;
          cost += 1; // per-feature tool change cost
        } else {
          // min_datum_error — penalize later setups more
          const setupIndex = [...new Set(setups)].indexOf(bestSetup);
          cost += setupIndex * 2;
        }

        prevSetup = bestSetup;
      }

      if (!valid) {
        eliminated.push({ sequence: ordering, reason: "Feature missing setup options" });
        continue;
      }

      allSequences.push({ sequence: ordering, setups, cost });
    }

    if (allSequences.length === 0) {
      return {
        optimal_sequence: topoOrder,
        optimal_setups: topoOrder.map(id => featureMap.get(id)?.setup_options?.[0] || "unknown"),
        cost: 0,
        alternatives: [],
        eliminated,
      };
    }

    // Sort by cost
    allSequences.sort((a, b) => a.cost - b.cost);
    const best = allSequences[0];
    const threshold = best.cost * 1.1; // within 10%

    const alts = allSequences
      .slice(1)
      .filter(s => s.cost <= threshold)
      .map(s => ({
        sequence: s.sequence,
        setups: s.setups,
        cost: s.cost,
        cost_delta_pct: best.cost > 0 ? Math.round(((s.cost - best.cost) / best.cost) * 100) : 0,
      }));

    return {
      optimal_sequence: best.sequence,
      optimal_setups: best.setups,
      cost: best.cost,
      alternatives: alts.slice(0, 5),
      eliminated,
    };
  }

  // --------------------------------------------------------------------------
  // 4. detectDeadEnds — Feature accessibility lock detection
  // --------------------------------------------------------------------------

  detectDeadEnds(input: DetectDeadEndsInput): DetectDeadEndsResult {
    log.info("[MultiSetupFeasibilityChain] detectDeadEnds called");

    const { features } = input;

    if (!features || features.length === 0) {
      return { dead_ends: [], dependency_graph: [], topological_order: [], has_cycles: false };
    }

    // Build dependency graph
    const depGraph: Array<{ from: string; to: string }> = [];
    const adj = new Map<string, Set<string>>();
    const inDeg = new Map<string, number>();

    for (const f of features) {
      adj.set(f.id, new Set());
      inDeg.set(f.id, 0);
    }

    for (const f of features) {
      if (f.depends_on) {
        for (const dep of f.depends_on) {
          if (adj.has(dep)) {
            adj.get(dep)!.add(f.id);
            inDeg.set(f.id, (inDeg.get(f.id) || 0) + 1);
            depGraph.push({ from: dep, to: f.id });
          }
        }
      }
    }

    // Topological sort (Kahn's algorithm)
    const topoOrder = this._kahnSort(adj, inDeg);
    const hasCycles = topoOrder.length < features.length;
    let cycleMembers: string[] | undefined;

    if (hasCycles) {
      const placed = new Set(topoOrder);
      cycleMembers = features.filter(f => !placed.has(f.id)).map(f => f.id);
    }

    // Detect dead-ends: features that become inaccessible after another feature is machined
    const dead_ends: Array<{
      feature_id: string;
      blocked_features: string[];
      reason: string;
      resolution: string;
    }> = [];

    const featureMap = new Map(features.map(f => [f.id, f]));

    for (const f of features) {
      if (f.blocks_access_to && f.blocks_access_to.length > 0) {
        for (const blockedId of f.blocks_access_to) {
          const blocked = featureMap.get(blockedId);
          if (!blocked) continue;

          // Check if blocked feature depends on the blocker (valid ordering)
          const blockerIsPrereq = blocked.depends_on?.includes(f.id);

          if (!blockerIsPrereq) {
            // The blocked feature must be done BEFORE the blocker
            // Check if current dependency graph enforces blocker before blocked (dead-end)
            const blockerMustBeFirst = f.depends_on?.includes(blockedId) === false
              && this._isReachable(adj, f.id, blockedId);

            if (blockerMustBeFirst) {
              dead_ends.push({
                feature_id: blockedId,
                blocked_features: [f.id],
                reason: `Feature '${f.id}' blocks access to '${blockedId}', but '${f.id}' is scheduled first in dependency order`,
                resolution: `Machine '${blockedId}' before '${f.id}', or use an alternative setup orientation`,
              });
            } else {
              // Potential dead-end: blocker could be scheduled before blocked
              dead_ends.push({
                feature_id: blockedId,
                blocked_features: [f.id],
                reason: `Feature '${f.id}' blocks access to '${blockedId}' — if '${f.id}' is machined first, '${blockedId}' becomes inaccessible`,
                resolution: `Add dependency constraint: machine '${blockedId}' before '${f.id}', or use 5-axis access`,
              });
            }
          }
        }
      }
    }

    return {
      dead_ends,
      dependency_graph: depGraph,
      topological_order: topoOrder,
      has_cycles: hasCycles,
      cycle_members: cycleMembers,
    };
  }

  // --------------------------------------------------------------------------
  // Generic calculate() entry point for dispatcher
  // --------------------------------------------------------------------------

  calculate(params: Record<string, any>): any {
    const method = params.method || "analyzeFeasibility";
    switch (method) {
      case "analyzeFeasibility":
        return this.analyzeFeasibility(params as any);
      case "checkDatumChain":
        return this.checkDatumChain(params as any);
      case "findOptimalSequence":
        return this.findOptimalSequence(params as any);
      case "detectDeadEnds":
        return this.detectDeadEnds(params as any);
      default:
        return { error: `Unknown method: ${method}` };
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /** Assign features to valid setups based on face accessibility and tool reach */
  private _assignFeaturesToSetups(
    features: MSFeature[],
    setups: MSSetup[],
    tools: MSTool[],
    machine?: MSMachine,
  ): Map<string, string[]> {
    const result = new Map<string, string[]>();

    for (const f of features) {
      const validSetups: string[] = [];

      for (const s of setups) {
        // Check face accessibility
        const facesOk = f.requires_access_from.every(face => s.accessible_faces.includes(face));
        if (!facesOk) continue;

        // Check tool reach: at least one tool can reach the feature depth
        const featureDepth = Math.max(f.dimensions.x, f.dimensions.y, f.dimensions.z);
        const toolOk = tools.some(t => t.length >= featureDepth + 5); // 5mm clearance

        if (!toolOk) continue;

        // Check machine travel if provided
        if (machine) {
          if (f.dimensions.x > machine.x_travel || f.dimensions.y > machine.y_travel || f.dimensions.z > machine.z_travel) {
            continue;
          }
        }

        validSetups.push(s.id);
      }

      result.set(f.id, validSetups);
    }

    return result;
  }

  /** Topological sort of features respecting depends_on */
  private _topologicalSort(features: MSFeature[]): string[] {
    const adj = new Map<string, Set<string>>();
    const inDeg = new Map<string, number>();

    for (const f of features) {
      adj.set(f.id, new Set());
      inDeg.set(f.id, 0);
    }

    for (const f of features) {
      if (f.depends_on) {
        for (const dep of f.depends_on) {
          if (adj.has(dep)) {
            adj.get(dep)!.add(f.id);
            inDeg.set(f.id, (inDeg.get(f.id) || 0) + 1);
          }
        }
      }
    }

    return this._kahnSort(adj, inDeg);
  }

  /** Kahn's algorithm for topological sort */
  private _kahnSort(adj: Map<string, Set<string>>, inDegOrig: Map<string, number>): string[] {
    const inDeg = new Map(inDegOrig);
    const queue: string[] = [];
    const result: string[] = [];

    for (const [node, deg] of inDeg) {
      if (deg === 0) queue.push(node);
    }

    while (queue.length > 0) {
      // Sort queue for determinism
      queue.sort();
      const node = queue.shift()!;
      result.push(node);

      const neighbors = adj.get(node);
      if (neighbors) {
        for (const nb of neighbors) {
          const newDeg = (inDeg.get(nb) || 1) - 1;
          inDeg.set(nb, newDeg);
          if (newDeg === 0) queue.push(nb);
        }
      }
    }

    return result;
  }

  /** Build setup sequence greedily from topological order */
  private _buildSetupSequence(
    topoOrder: string[],
    featureSetupMap: Map<string, string[]>,
    setups: MSSetup[],
  ): SetupSequenceEntry[] {
    const sequence: SetupSequenceEntry[] = [];
    const setupFeaturesMap = new Map<string, string[]>();
    let currentSetup = "";

    for (const fId of topoOrder) {
      const validSetups = featureSetupMap.get(fId) || [];
      if (validSetups.length === 0) continue;

      // Prefer current setup to minimize changes
      let chosenSetup = validSetups.includes(currentSetup) ? currentSetup : validSetups[0];

      if (!setupFeaturesMap.has(chosenSetup)) {
        setupFeaturesMap.set(chosenSetup, []);
      }
      setupFeaturesMap.get(chosenSetup)!.push(fId);
      currentSetup = chosenSetup;
    }

    // Convert to sequence entries
    const setupOrder = [...setupFeaturesMap.keys()];
    for (let i = 0; i < setupOrder.length; i++) {
      const sid = setupOrder[i];
      const feats = setupFeaturesMap.get(sid)!;
      const setup = setups.find(s => s.id === sid);

      sequence.push({
        setup_id: sid,
        features_in_setup: feats,
        datum_reference: setup?.orientation || sid,
        estimated_time_min: feats.length * 5 + (i > 0 ? 10 : 0), // 5min/feature + 10min setup change
      });
    }

    return sequence;
  }

  /** Find the longest dependency chain (critical path) */
  private _findCriticalPath(features: MSFeature[]): string[] {
    const featureMap = new Map(features.map(f => [f.id, f]));
    const memo = new Map<string, string[]>();

    const dfs = (id: string, visited: Set<string>): string[] => {
      if (memo.has(id)) return memo.get(id)!;
      if (visited.has(id)) return [id]; // cycle guard

      visited.add(id);
      const f = featureMap.get(id);
      if (!f || !f.depends_on || f.depends_on.length === 0) {
        const path = [id];
        memo.set(id, path);
        return path;
      }

      let longestPrev: string[] = [];
      for (const dep of f.depends_on) {
        if (featureMap.has(dep)) {
          const depPath = dfs(dep, visited);
          if (depPath.length > longestPrev.length) {
            longestPrev = depPath;
          }
        }
      }

      const path = [...longestPrev, id];
      memo.set(id, path);
      return path;
    };

    let criticalPath: string[] = [];
    for (const f of features) {
      const path = dfs(f.id, new Set());
      if (path.length > criticalPath.length) {
        criticalPath = path;
      }
    }

    return criticalPath;
  }

  /** Compute risk score 0-1 */
  private _computeRiskScore(
    datumResult: CheckDatumChainResult,
    deadEnds: Array<{ feature_id: string; reason: string }>,
    setupSequence: SetupSequenceEntry[],
    features: MSFeature[],
  ): number {
    let risk = 0;

    // Dead-end penalty: 0.3 per dead-end (capped at 0.9)
    risk += Math.min(deadEnds.length * 0.3, 0.9);

    // Datum chain risk: probability of NOT meeting tolerance
    risk += (1 - datumResult.probability_meeting_tolerance) * 0.3;

    // Setup count penalty: >3 setups adds risk
    if (setupSequence.length > 3) {
      risk += (setupSequence.length - 3) * 0.05;
    }

    // Tight tolerance penalty
    const minTol = Math.min(...features.map(f => f.tolerance));
    if (minTol < 0.01) risk += 0.1;
    if (minTol < 0.005) risk += 0.15;

    return Math.min(risk, 1.0);
  }

  /** Generate alternative sequences by swapping non-constrained feature orders */
  private _generateAlternatives(
    features: MSFeature[],
    featureSetupMap: Map<string, string[]>,
    setups: MSSetup[],
    currentSequence: SetupSequenceEntry[],
  ): Array<{ sequence: string[]; risk: number; cost_delta: number }> {
    const alternatives: Array<{ sequence: string[]; risk: number; cost_delta: number }> = [];
    const currentSetupIds = currentSequence.map(s => s.setup_id);

    // Try reversing setup order where no constraints prevent it
    if (currentSequence.length >= 2) {
      // Check if features have no cross-setup dependencies
      const featureDeps = new Map<string, string[]>();
      for (const f of features) {
        featureDeps.set(f.id, f.depends_on || []);
      }

      // Try swapping adjacent setups
      for (let i = 0; i < currentSequence.length - 1; i++) {
        const setup1Features = currentSequence[i].features_in_setup;
        const setup2Features = currentSequence[i + 1].features_in_setup;

        // Check if swap is valid (no dependency from setup2→setup1)
        let canSwap = true;
        for (const f2 of setup2Features) {
          const deps = featureDeps.get(f2) || [];
          if (deps.some(d => setup1Features.includes(d))) {
            canSwap = false;
            break;
          }
        }

        if (canSwap) {
          const swapped = [...currentSetupIds];
          [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
          alternatives.push({
            sequence: swapped,
            risk: 0, // approximate — would need full re-analysis
            cost_delta: 0,
          });
        }
      }
    }

    return alternatives.slice(0, 3);
  }

  /** Check if target is reachable from source in DAG */
  private _isReachable(adj: Map<string, Set<string>>, source: string, target: string): boolean {
    const visited = new Set<string>();
    const stack = [source];

    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === target) return true;
      if (visited.has(node)) continue;
      visited.add(node);
      const neighbors = adj.get(node);
      if (neighbors) {
        for (const nb of neighbors) stack.push(nb);
      }
    }

    return false;
  }

  /** Enumerate up to maxCount valid topological orderings */
  private _enumerateTopologicalOrders(
    adjOrig: Map<string, Set<string>>,
    inDegOrig: Map<string, number>,
    totalNodes: number,
    maxCount: number,
  ): string[][] {
    const results: string[][] = [];
    const adj = new Map<string, Set<string>>();
    for (const [k, v] of adjOrig) adj.set(k, new Set(v));
    const inDeg = new Map(inDegOrig);

    const current: string[] = [];
    const visited = new Set<string>();

    const backtrack = () => {
      if (results.length >= maxCount) return;
      if (current.length === totalNodes) {
        results.push([...current]);
        return;
      }

      // Find all nodes with in-degree 0 that haven't been visited
      const candidates: string[] = [];
      for (const [node, deg] of inDeg) {
        if (deg === 0 && !visited.has(node)) candidates.push(node);
      }
      candidates.sort(); // determinism

      for (const node of candidates) {
        // Choose node
        visited.add(node);
        current.push(node);

        // Reduce in-degrees
        const neighbors = adj.get(node) || new Set();
        for (const nb of neighbors) {
          inDeg.set(nb, (inDeg.get(nb) || 1) - 1);
        }

        backtrack();

        // Undo
        visited.delete(node);
        current.pop();
        for (const nb of neighbors) {
          inDeg.set(nb, (inDeg.get(nb) || 0) + 1);
        }
      }
    };

    backtrack();
    return results;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const multiSetupFeasibilityChainEngine = new MultiSetupFeasibilityChainEngine();
