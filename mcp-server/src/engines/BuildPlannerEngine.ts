/**
 * BuildPlannerEngine — U-FORE-02 (PSAU-FORESIGHT)
 * ================================================
 *
 * Given a roadmap unit ID, produces an ordered DAG of atomic build steps
 * with prerequisites, estimated tokens, estimated duration, risk level
 * and a rollback stub for each step.
 *
 * Pipeline:
 *   1. Locate the unit in milestone files (data/milestones/*.json)
 *   2. Hand off to AtomicStepDecomposerEngine for step extraction
 *   3. Apply the canonical ordering rules (schemas before engines,
 *      engines before dispatchers before tests before hooks before
 *      manifest regen before commit)
 *   4. Compute prerequisite edges and return a topologically sorted DAG
 *
 * This is NOT an executor — it just plans. The /plan-build skill calls
 * it and presents the plan to the user for approval.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  atomicStepDecomposerEngine,
  type AtomicStep,
  type AtomicStepDecomposerEngine,
  type StepKind,
  type UnitSpec,
} from "./AtomicStepDecomposerEngine.js";

// ─── Ordering constants ─────────────────────────────────────────────

/**
 * Canonical dependency order for step kinds. Earlier kinds must complete
 * before later kinds. Based on observed successful build patterns.
 */
export const KIND_ORDER: StepKind[] = [
  "read_schema",
  "write_schema",
  "write_engine",
  "wire_dispatcher",
  "write_test",
  "register_hook",
  "regenerate_manifest",
  "commit",
];

const KIND_RANK: Record<StepKind, number> = KIND_ORDER.reduce(
  (acc, k, i) => {
    acc[k] = i;
    return acc;
  },
  {} as Record<StepKind, number>
);

// ─── Types ──────────────────────────────────────────────────────────

export interface StepDAGNode extends AtomicStep {
  /** IDs of steps that must complete before this one runs. */
  prereqs: string[];
}

export interface BuildPlan {
  unitId: string;
  title?: string;
  steps: StepDAGNode[];
  totalEstTokens: number;
  totalEstDurationSec: number;
  maxRisk: number;
  warnings: string[];
}

export interface PlannerDeps {
  decomposer?: AtomicStepDecomposerEngine;
  milestoneDirs?: string[];
}

// ─── Engine ─────────────────────────────────────────────────────────

export class BuildPlannerEngine {
  readonly name = "BuildPlannerEngine";

  private decomposer: AtomicStepDecomposerEngine;
  private milestoneDirs: string[];

  constructor(deps: PlannerDeps = {}) {
    this.decomposer = deps.decomposer ?? atomicStepDecomposerEngine;
    this.milestoneDirs = deps.milestoneDirs ?? [
      "H:/prism/mcp-server/data/milestones",
    ];
  }

  /**
   * Plan a build for a roadmap unit by ID.
   *
   * @param unitId Roadmap unit id (e.g., "U-LEARN-01")
   * @returns BuildPlan with DAG, totals, warnings
   * @throws Error if unitId is not a non-empty string
   */
  async plan(unitId: string): Promise<BuildPlan> {
    this.assertUnitId(unitId);
    const warnings: string[] = [];
    const unit = this.loadUnit(unitId);
    if (!unit) {
      warnings.push(`unit ${unitId} not found in any milestone file — using stub`);
      return this.planFromUnit(
        { id: unitId, title: undefined, files_created: [], files_modified: [] },
        warnings
      );
    }
    return this.planFromUnit(unit, warnings);
  }

  /**
   * Plan directly from a unit spec (skips milestone lookup). Useful when
   * the caller already has the unit in hand or is planning a hypothetical.
   *
   * @param unit UnitSpec describing the work
   * @param warnings Optional warnings accumulator
   */
  planFromUnit(unit: UnitSpec, warnings: string[] = []): BuildPlan {
    if (!unit || typeof unit !== "object") {
      throw new Error("BuildPlannerEngine.planFromUnit: unit must be an object");
    }
    const steps = this.decomposer.decompose(unit);

    // Attach prerequisites per canonical KIND_ORDER.
    const byId: Record<string, StepDAGNode> = {};
    const nodes: StepDAGNode[] = steps.map((s) => {
      const node: StepDAGNode = { ...s, prereqs: [] };
      byId[s.id] = node;
      return node;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < i; j++) {
        const prev = nodes[j];
        const cur = nodes[i];
        // A previous step is a prereq if its kind ranks strictly earlier.
        if (KIND_RANK[prev.kind] < KIND_RANK[cur.kind]) {
          cur.prereqs.push(prev.id);
        }
      }
    }

    const sorted = this.topoSort(nodes);
    const cycle = sorted.length !== nodes.length;
    if (cycle) {
      warnings.push("cycle detected in planned DAG — falling back to canonical order");
    }

    const totalEstTokens = sorted.reduce((s, n) => s + n.estTokens, 0);
    const totalEstDurationSec = sorted.reduce((s, n) => s + n.estDurationSec, 0);
    const maxRisk = sorted.reduce((m, n) => Math.max(m, n.risk), 0);

    return {
      unitId: unit.id,
      title: unit.title,
      steps: sorted,
      totalEstTokens,
      totalEstDurationSec,
      maxRisk,
      warnings,
    };
  }

  /**
   * Validate a planner's output against a known-correct ordering.
   *
   * @param plan     The plan produced by plan()
   * @param expected Ordered list of step kinds observed in a successful build
   * @returns match ratio in [0,1]; 1.0 = perfect alignment
   */
  validateOrdering(plan: BuildPlan, expected: StepKind[]): number {
    if (plan.steps.length === 0 || expected.length === 0) return 0;
    const kinds = plan.steps.map((s) => s.kind);
    // Longest common subsequence / min length for ordinal match
    let hits = 0;
    let ei = 0;
    for (const k of kinds) {
      while (ei < expected.length && expected[ei] !== k) ei++;
      if (ei < expected.length && expected[ei] === k) {
        hits++;
        ei++;
      }
    }
    return hits / Math.max(kinds.length, expected.length);
  }

  // ─── Private ────────────────────────────────────────────────────────

  private assertUnitId(id: unknown): asserts id is string {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error("BuildPlannerEngine.plan: unitId must be a non-empty string");
    }
  }

  private loadUnit(unitId: string): UnitSpec | null {
    for (const dir of this.milestoneDirs) {
      if (!fs.existsSync(dir)) continue;
      let files: string[] = [];
      try {
        files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      } catch {
        continue;
      }
      for (const f of files) {
        const full = path.join(dir, f);
        try {
          const text = fs.readFileSync(full, "utf-8");
          if (!text.includes(unitId)) continue;
          const parsed = JSON.parse(text) as { units?: UnitSpec[]; sessions?: Array<{ units?: UnitSpec[] }> };
          const units = parsed.units ?? parsed.sessions?.flatMap((s) => s.units ?? []) ?? [];
          const hit = units.find((u) => u && u.id === unitId);
          if (hit) return hit;
        } catch {
          // skip broken milestone file
        }
      }
    }
    return null;
  }

  private topoSort(nodes: StepDAGNode[]): StepDAGNode[] {
    const inDeg: Record<string, number> = {};
    const byId: Record<string, StepDAGNode> = {};
    for (const n of nodes) {
      inDeg[n.id] = n.prereqs.length;
      byId[n.id] = n;
    }
    const queue: StepDAGNode[] = nodes.filter((n) => inDeg[n.id] === 0);
    // Stable tie-break by kind rank, then original index.
    queue.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
    const out: StepDAGNode[] = [];
    while (queue.length > 0) {
      const n = queue.shift()!;
      out.push(n);
      for (const other of nodes) {
        if (other.prereqs.includes(n.id)) {
          inDeg[other.id]--;
          if (inDeg[other.id] === 0) queue.push(other);
        }
      }
      queue.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
    }
    return out;
  }
}

export const buildPlannerEngine = new BuildPlannerEngine();
