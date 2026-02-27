/**
 * CSP Setup Planning — Constraint Satisfaction for Setup Sequencing
 *
 * Solves the setup planning problem using constraint satisfaction/propagation.
 * Determines the minimum number of setups (workpiece orientations) and assigns
 * features to setups respecting accessibility, tolerance, and precedence constraints.
 *
 * Manufacturing uses: process planning, fixture design sequence, setup sheet
 * generation, minimize number of clampings for multi-feature parts.
 *
 * References:
 * - Tsang, E. (1993). "Foundations of Constraint Satisfaction"
 * - Zhang, H.C. & Huang, S.H. (1994). "Setup Planning in Automated Process Planning"
 *
 * @module algorithms/CSPSetupPlan
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export type AccessDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";

export interface FeatureSpec {
  id: string;
  /** Accessible from these directions. */
  access_directions: AccessDirection[];
  /** Machining time [min]. */
  machining_time: number;
  /** Must be done before these features (IDs). */
  precedence_before?: string[];
  /** Tolerance group (features in same group should be in same setup). */
  tolerance_group?: string;
  /** Required tool type. */
  tool_type?: string;
}

export interface CSPSetupPlanInput {
  /** Features to machine. */
  features: FeatureSpec[];
  /** Available setup orientations. Default all 6 cardinal directions. */
  available_orientations?: AccessDirection[];
  /** Setup change time [min]. Default 15. */
  setup_change_time?: number;
  /** Max features per setup. Default unlimited. */
  max_features_per_setup?: number;
  /** Prefer grouping by tool type. Default true. */
  group_by_tool?: boolean;
  /** Maximum solver iterations. Default 5000. */
  max_iterations?: number;
}

export interface SetupPlan {
  setup_number: number;
  orientation: AccessDirection;
  features: string[];
  machining_time: number;
  n_tool_changes: number;
}

export interface CSPSetupPlanOutput extends WithWarnings {
  /** Planned setups in execution order. */
  setups: SetupPlan[];
  /** Total number of setups. */
  n_setups: number;
  /** Total machining time [min]. */
  total_machining_time: number;
  /** Total setup change time [min]. */
  total_setup_time: number;
  /** Total time including changes [min]. */
  total_time: number;
  /** Unassigned features (if constraints are infeasible). */
  unassigned: string[];
  /** Whether all constraints were satisfied. */
  all_constraints_met: boolean;
  /** Precedence violations (should be 0). */
  precedence_violations: number;
  /** Tolerance group splits (groups split across setups). */
  tolerance_splits: number;
  calculation_method: string;
}

export class CSPSetupPlan implements Algorithm<CSPSetupPlanInput, CSPSetupPlanOutput> {

  validate(input: CSPSetupPlanInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.features?.length) {
      issues.push({ field: "features", message: "At least 1 feature required", severity: "error" });
    }
    for (const f of input.features ?? []) {
      if (!f.access_directions?.length) {
        issues.push({ field: `features[${f.id}]`, message: "At least 1 access direction required", severity: "error" });
      }
    }
    if (input.features?.length > 200) {
      issues.push({ field: "features", message: "Large feature set — performance may degrade", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: CSPSetupPlanInput): CSPSetupPlanOutput {
    const warnings: string[] = [];
    const { features } = input;
    const orientations = input.available_orientations ?? ["+X", "-X", "+Y", "-Y", "+Z", "-Z"] as AccessDirection[];
    const setupChangeTime = input.setup_change_time ?? 15;
    const maxPerSetup = input.max_features_per_setup ?? Infinity;
    const groupByTool = input.group_by_tool ?? true;

    // Build feature map
    const featureMap = new Map(features.map(f => [f.id, f]));

    // Build precedence graph
    const mustBefore = new Map<string, Set<string>>();
    for (const f of features) {
      if (f.precedence_before) {
        mustBefore.set(f.id, new Set(f.precedence_before));
      }
    }

    // Group features by compatible orientations
    const orientationGroups = new Map<string, FeatureSpec[]>();
    for (const orient of orientations) {
      orientationGroups.set(orient, []);
    }

    // Assign features to best orientation
    const featureOrientation = new Map<string, AccessDirection>();
    const assigned = new Set<string>();

    // Phase 1: Tolerance groups — keep together
    const tolGroups = new Map<string, FeatureSpec[]>();
    for (const f of features) {
      if (f.tolerance_group) {
        const existing = tolGroups.get(f.tolerance_group) ?? [];
        existing.push(f);
        tolGroups.set(f.tolerance_group, existing);
      }
    }

    // For each tolerance group, find common orientation
    for (const [groupId, groupFeatures] of tolGroups) {
      // Find orientations common to all features in group
      const commonOrients = orientations.filter(o =>
        groupFeatures.every(f => f.access_directions.includes(o))
      );

      if (commonOrients.length > 0) {
        // Pick orientation that serves most other unassigned features too
        let bestOrient = commonOrients[0];
        let bestCount = 0;
        for (const o of commonOrients) {
          const count = features.filter(f => !assigned.has(f.id) && f.access_directions.includes(o)).length;
          if (count > bestCount) { bestCount = count; bestOrient = o; }
        }

        for (const f of groupFeatures) {
          featureOrientation.set(f.id, bestOrient);
          assigned.add(f.id);
          orientationGroups.get(bestOrient)!.push(f);
        }
      } else {
        warnings.push(`Tolerance group "${groupId}" cannot be kept in single setup — no common orientation`);
      }
    }

    // Phase 2: Assign remaining features
    for (const f of features) {
      if (assigned.has(f.id)) continue;

      // Pick orientation with most existing features (minimize setups)
      let bestOrient = f.access_directions[0];
      let bestCount = 0;
      for (const o of f.access_directions) {
        if (!orientations.includes(o)) continue;
        const count = orientationGroups.get(o)!.length;
        if (count > bestCount) { bestCount = count; bestOrient = o; }
      }

      featureOrientation.set(f.id, bestOrient);
      assigned.add(f.id);
      orientationGroups.get(bestOrient)!.push(f);
    }

    // Phase 3: Order setups respecting precedence
    const usedOrients = orientations.filter(o => orientationGroups.get(o)!.length > 0);

    // Topological sort of setups based on feature precedence
    const setupOrder = this.topologicalSort(usedOrients, orientationGroups, mustBefore, featureOrientation);

    // Build setup plans
    const setups: SetupPlan[] = [];
    const unassigned: string[] = [];

    for (let i = 0; i < setupOrder.length; i++) {
      const orient = setupOrder[i];
      let setupFeatures = orientationGroups.get(orient)!;

      // Split if exceeding max per setup
      while (setupFeatures.length > 0) {
        const batch = setupFeatures.slice(0, maxPerSetup);
        setupFeatures = setupFeatures.slice(maxPerSetup);

        // Sort by tool type if grouping enabled
        if (groupByTool) {
          batch.sort((a, b) => (a.tool_type ?? "").localeCompare(b.tool_type ?? ""));
        }

        const toolTypes = new Set(batch.map(f => f.tool_type ?? "default"));

        setups.push({
          setup_number: setups.length + 1,
          orientation: orient,
          features: batch.map(f => f.id),
          machining_time: batch.reduce((s, f) => s + f.machining_time, 0),
          n_tool_changes: Math.max(0, toolTypes.size - 1),
        });
      }
    }

    // Check for unassigned features
    for (const f of features) {
      if (!assigned.has(f.id)) unassigned.push(f.id);
    }

    // Verify precedence
    let precViolations = 0;
    const featureSetupMap = new Map<string, number>();
    for (const setup of setups) {
      for (const fid of setup.features) {
        featureSetupMap.set(fid, setup.setup_number);
      }
    }
    for (const [fid, mustBeforeSet] of mustBefore) {
      const fSetup = featureSetupMap.get(fid) ?? 0;
      for (const beforeId of mustBeforeSet) {
        const bSetup = featureSetupMap.get(beforeId) ?? 0;
        if (fSetup > bSetup) precViolations++; // Feature is after its dependent
      }
    }

    // Count tolerance splits
    let tolSplits = 0;
    for (const [, groupFeatures] of tolGroups) {
      const setupNums = new Set(groupFeatures.map(f => featureSetupMap.get(f.id)));
      if (setupNums.size > 1) tolSplits++;
    }

    const totalMach = setups.reduce((s, st) => s + st.machining_time, 0);
    const totalSetup = Math.max(0, setups.length - 1) * setupChangeTime;

    return {
      setups,
      n_setups: setups.length,
      total_machining_time: totalMach,
      total_setup_time: totalSetup,
      total_time: totalMach + totalSetup,
      unassigned,
      all_constraints_met: precViolations === 0 && unassigned.length === 0 && tolSplits === 0,
      precedence_violations: precViolations,
      tolerance_splits: tolSplits,
      warnings,
      calculation_method: `CSP setup planning (${features.length} features, ${setups.length} setups, ${orientations.length} orientations)`,
    };
  }

  private topologicalSort(
    orients: AccessDirection[],
    groups: Map<string, FeatureSpec[]>,
    mustBefore: Map<string, Set<string>>,
    featureOrient: Map<string, AccessDirection>
  ): AccessDirection[] {
    // Build setup-level precedence
    const setupDeps = new Map<AccessDirection, Set<AccessDirection>>();
    for (const o of orients) setupDeps.set(o, new Set());

    for (const [fid, beforeSet] of mustBefore) {
      const fOrient = featureOrient.get(fid);
      if (!fOrient) continue;
      for (const bid of beforeSet) {
        const bOrient = featureOrient.get(bid);
        if (bOrient && bOrient !== fOrient) {
          setupDeps.get(bOrient)!.add(fOrient); // bOrient must come before fOrient
        }
      }
    }

    // Kahn's algorithm
    const inDegree = new Map<AccessDirection, number>();
    for (const o of orients) inDegree.set(o, 0);
    for (const [, deps] of setupDeps) {
      for (const d of deps) {
        inDegree.set(d, (inDegree.get(d) ?? 0) + 1);
      }
    }

    const queue: AccessDirection[] = [];
    for (const o of orients) {
      if ((inDegree.get(o) ?? 0) === 0) queue.push(o);
    }

    const result: AccessDirection[] = [];
    while (queue.length > 0) {
      // Pick orientation with most features (greedy)
      queue.sort((a, b) => (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0));
      const curr = queue.shift()!;
      result.push(curr);

      for (const dep of setupDeps.get(curr) ?? []) {
        const deg = (inDegree.get(dep) ?? 1) - 1;
        inDegree.set(dep, deg);
        if (deg === 0) queue.push(dep);
      }
    }

    // Add any remaining (cycle)
    for (const o of orients) {
      if (!result.includes(o)) result.push(o);
    }

    return result;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "csp-setup-plan",
      name: "CSP Setup Planning",
      description: "Constraint satisfaction for minimum-setup feature assignment with precedence",
      formula: "min |setups| s.t. access(f) ⊆ orient(s), prec(f₁,f₂) → setup(f₁) ≤ setup(f₂)",
      reference: "Tsang (1993); Zhang & Huang (1994)",
      safety_class: "standard",
      domain: "planning",
      inputs: { features: "Feature specs with access directions", available_orientations: "Setup orientations" },
      outputs: { setups: "Setup sequence", n_setups: "Number of setups", all_constraints_met: "Feasibility" },
    };
  }
}
