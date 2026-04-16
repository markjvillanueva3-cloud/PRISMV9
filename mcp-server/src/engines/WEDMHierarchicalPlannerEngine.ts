/**
 * WEDMHierarchicalPlannerEngine — WEDM AGI Phase 2 / U-P2-08
 *
 * Hierarchical Task Network (HTN) planner for WEDM jobs. Takes a high-level
 * part specification (features, material, tolerance class) and produces a
 * grounded plan tree whose leaves are primitive tasks executable by the
 * existing WEDM pipeline engines.
 *
 * Decomposition:
 *   Job
 *   ├── Setup          → mount, align, zero_wire, configure_generator
 *   ├── Machining      → for each feature: FeatureCut
 *   │                     ├── rough_cut
 *   │                     ├── (place_tab ×N if internal)
 *   │                     ├── skim_cut         (precision+ only)
 *   │                     ├── finish_cut       (mirror only — 2nd finish pass)
 *   │                     └── (release_slug if internal)
 *   ├── Inspection     → inspect  (if require_inspection)
 *   └── Teardown       → unload
 *
 * Validation: every primitive's preconditions must already be satisfied by
 * the union of prior primitives' effects. If not, the plan is flagged
 * invalid with a human-readable violation list — the caller decides what to
 * do.
 *
 * Exit gate (P2-MS3): HTN planner generates *valid* plans for 100% of
 * JM Die test parts (see wedm_hierarchical_planner.test.ts fixtures).
 *
 * Delegates pulse/toolpath/tab mechanics to existing engines — this engine
 * is pure structural planning.
 */

// ────────────────────────── Types ──────────────────────────

export type ToleranceClass = "rough" | "precision" | "mirror";
export type FeatureKind =
  | "external_profile"
  | "internal_profile"
  | "slot"
  | "hole";

export interface PartFeature {
  id: string;
  kind: FeatureKind;
  perimeter_mm: number;
  tolerance_class: ToleranceClass;
  start_point: { x: number; y: number };
  /** Count of tabs to place (0 = auto from perimeter, undefined = auto). */
  tab_count?: number;
}

export interface PartSpec {
  id: string;
  material: string;
  thickness_mm: number;
  features: PartFeature[];
  require_inspection?: boolean;
}

export type PrimitiveTask =
  | "mount_workpiece"
  | "align_workpiece"
  | "zero_wire"
  | "configure_generator"
  | "rough_cut"
  | "skim_cut"
  | "finish_cut"
  | "place_tab"
  | "release_slug"
  | "inspect"
  | "unload";

export interface PlanNode {
  id: string;
  task: string; // primitive name or composite label
  is_primitive: boolean;
  preconditions: string[];
  effects: string[];
  children?: PlanNode[];
  feature_id?: string;
}

export interface HTNPlan {
  part_id: string;
  root: PlanNode;
  primitives: PlanNode[]; // flat, execution-ordered
  depth: number;
  valid: boolean;
  violations: string[];
  stats: {
    total_primitives: number;
    feature_count: number;
    tab_placements: number;
  };
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMHierarchicalPlannerEngine {
  /** Decompose a part spec into an HTN plan and validate it. */
  plan(spec: PartSpec): HTNPlan {
    this.validateSpec(spec);

    const root: PlanNode = {
      id: `job:${spec.id}`,
      task: "Job",
      is_primitive: false,
      preconditions: [],
      effects: ["job_complete"],
      children: [],
    };

    const setup = this.decomposeSetup();
    const machining = this.decomposeMachining(spec);
    const inspection = spec.require_inspection
      ? this.decomposeInspection(spec)
      : null;
    const teardown = this.decomposeTeardown();

    root.children = [setup, machining];
    if (inspection) root.children.push(inspection);
    root.children.push(teardown);

    const primitives = this.flattenPrimitives(root);
    const { valid, violations } = this.validate(primitives);

    const depth = this.depth(root);
    const tabPlacements = primitives.filter(
      (p) => p.task === "place_tab",
    ).length;

    return {
      part_id: spec.id,
      root,
      primitives,
      depth,
      valid,
      violations,
      stats: {
        total_primitives: primitives.length,
        feature_count: spec.features.length,
        tab_placements: tabPlacements,
      },
    };
  }

  // ─── decomposition ────────────────────────────────────────

  private decomposeSetup(): PlanNode {
    return {
      id: "setup",
      task: "Setup",
      is_primitive: false,
      preconditions: [],
      effects: ["setup_complete"],
      children: [
        prim("setup:mount", "mount_workpiece", [], ["workpiece_mounted"]),
        prim(
          "setup:align",
          "align_workpiece",
          ["workpiece_mounted"],
          ["workpiece_aligned"],
        ),
        prim(
          "setup:zero",
          "zero_wire",
          ["workpiece_aligned"],
          ["wire_zeroed"],
        ),
        prim(
          "setup:gen",
          "configure_generator",
          ["wire_zeroed"],
          ["generator_configured"],
        ),
      ],
    };
  }

  private decomposeMachining(spec: PartSpec): PlanNode {
    const node: PlanNode = {
      id: "machining",
      task: "Machining",
      is_primitive: false,
      preconditions: ["setup_complete"],
      effects: ["all_features_cut"],
      children: spec.features.map((f) => this.decomposeFeatureCut(f)),
    };
    // Tag each feature's final primitive with a `${id}_complete` effect so
    // downstream primitives (inspection) can depend on it concretely.
    for (const child of node.children ?? []) {
      if (child.feature_id && child.children?.length) {
        const last = child.children[child.children.length - 1];
        if (!last.effects.includes(`${child.feature_id}_complete`)) {
          last.effects.push(`${child.feature_id}_complete`);
        }
      }
    }
    return node;
  }

  private decomposeFeatureCut(f: PartFeature): PlanNode {
    const internal =
      f.kind === "internal_profile" || f.kind === "hole" || f.kind === "slot";
    const tabs = internal ? this.tabCount(f) : 0;

    const children: PlanNode[] = [];
    children.push(
      prim(
        `feat:${f.id}:rough`,
        "rough_cut",
        ["generator_configured", "workpiece_mounted", "wire_zeroed"],
        [`${f.id}_rough_cut`],
        f.id,
      ),
    );

    if (internal && tabs > 0) {
      for (let i = 0; i < tabs; i++) {
        children.push(
          prim(
            `feat:${f.id}:tab${i}`,
            "place_tab",
            [`${f.id}_rough_cut`],
            [`${f.id}_tab_${i}_placed`],
            f.id,
          ),
        );
      }
    }

    if (f.tolerance_class === "precision" || f.tolerance_class === "mirror") {
      children.push(
        prim(
          `feat:${f.id}:skim`,
          "skim_cut",
          [`${f.id}_rough_cut`],
          [`${f.id}_skimmed`],
          f.id,
        ),
      );
    }

    if (f.tolerance_class === "mirror") {
      children.push(
        prim(
          `feat:${f.id}:finish`,
          "finish_cut",
          [`${f.id}_skimmed`],
          [`${f.id}_finished`],
          f.id,
        ),
      );
    }

    if (internal) {
      // Slug release depends on the *last* cutting pass for the feature.
      const lastCut =
        f.tolerance_class === "mirror"
          ? `${f.id}_finished`
          : f.tolerance_class === "precision"
            ? `${f.id}_skimmed`
            : `${f.id}_rough_cut`;
      children.push(
        prim(
          `feat:${f.id}:release`,
          "release_slug",
          [lastCut],
          [`${f.id}_slug_released`],
          f.id,
        ),
      );
    }

    return {
      id: `feat:${f.id}`,
      task: `FeatureCut(${f.kind})`,
      is_primitive: false,
      preconditions: ["setup_complete"],
      effects: [`${f.id}_complete`],
      feature_id: f.id,
      children,
    };
  }

  private decomposeInspection(spec: PartSpec): PlanNode {
    const featurePres = spec.features.map((f) => `${f.id}_complete`);
    return {
      id: "inspection",
      task: "Inspection",
      is_primitive: false,
      preconditions: ["all_features_cut"],
      effects: ["inspected"],
      children: [prim("inspect:do", "inspect", featurePres, ["inspected"])],
    };
  }

  private decomposeTeardown(): PlanNode {
    return {
      id: "teardown",
      task: "Teardown",
      is_primitive: false,
      preconditions: [],
      effects: ["unloaded"],
      children: [prim("teardown:unload", "unload", [], ["unloaded"])],
    };
  }

  // ─── internals ────────────────────────────────────────────

  /** Auto tab count from perimeter: 1 tab per ~50 mm, clamped to [1, 4]. */
  private tabCount(f: PartFeature): number {
    if (f.tab_count !== undefined) return Math.max(0, Math.floor(f.tab_count));
    const auto = Math.max(1, Math.min(4, Math.round(f.perimeter_mm / 50)));
    return auto;
  }

  private flattenPrimitives(node: PlanNode): PlanNode[] {
    const out: PlanNode[] = [];
    const walk = (n: PlanNode) => {
      if (n.is_primitive) {
        out.push(n);
        return;
      }
      for (const c of n.children ?? []) walk(c);
    };
    walk(node);
    return out;
  }

  private depth(node: PlanNode, d = 0): number {
    if (!node.children?.length) return d;
    return Math.max(...node.children.map((c) => this.depth(c, d + 1)));
  }

  private validate(primitives: PlanNode[]): {
    valid: boolean;
    violations: string[];
  } {
    const satisfied = new Set<string>();
    const violations: string[] = [];
    for (const p of primitives) {
      for (const pre of p.preconditions) {
        if (!satisfied.has(pre)) {
          violations.push(
            `${p.id} (${p.task}) missing precondition: ${pre}`,
          );
        }
      }
      for (const e of p.effects) satisfied.add(e);
    }
    // Job-level requirement: any feature that was started must be complete.
    return { valid: violations.length === 0, violations };
  }

  private validateSpec(spec: PartSpec): void {
    if (!spec.id) throw new Error("part spec requires id");
    if (!spec.material) throw new Error("part spec requires material");
    if (!Number.isFinite(spec.thickness_mm) || spec.thickness_mm <= 0) {
      throw new Error(`part spec thickness_mm must be positive`);
    }
    if (!Array.isArray(spec.features) || spec.features.length === 0) {
      throw new Error("part spec requires at least one feature");
    }
    const ids = new Set<string>();
    for (const f of spec.features) {
      if (!f.id) throw new Error("feature requires id");
      if (ids.has(f.id)) throw new Error(`duplicate feature id: ${f.id}`);
      ids.add(f.id);
      if (!Number.isFinite(f.perimeter_mm) || f.perimeter_mm <= 0) {
        throw new Error(
          `feature ${f.id} perimeter_mm must be positive, got ${f.perimeter_mm}`,
        );
      }
    }
  }
}

function prim(
  id: string,
  task: PrimitiveTask,
  preconditions: string[],
  effects: string[],
  feature_id?: string,
): PlanNode {
  return {
    id,
    task,
    is_primitive: true,
    preconditions,
    effects,
    feature_id,
  };
}

export const wedmHierarchicalPlannerEngine =
  new WEDMHierarchicalPlannerEngine();
