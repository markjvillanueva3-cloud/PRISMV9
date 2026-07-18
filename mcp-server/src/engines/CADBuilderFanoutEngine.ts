/**
 * CADBuilderFanoutEngine -- PA3-HERMES-CAD-BUILDER pure planner (operator directive 2026-06-26, slot:delta).
 *
 * THE GAP IT CLOSES.
 *   The operator wants parallel hermes/octopus agents to AUTOMATICALLY build the
 *   remaining CAD units faster ("drastically increase parallel hermes agents ...
 *   automatically invoked, ultracode"). Alpha shipped the analogue for the system-viz
 *   GRAPH (GraphImprovementFanoutEngine + a .mts cron driver). This is the CAD-UNIT
 *   analogue: read the git-reconciled CAD-completion status, find the units that are
 *   genuinely autonomous-buildable (NOT operator/merge/GPU-gated), and plan a PARALLEL
 *   build fan-out -- one build cell per unit, each cell a builder + physics/test/code
 *   reviewers (the CLAUDE.md multi-agent build pattern).
 *
 * WHAT THIS ADDS (and ONLY this -- it forks nothing; R8).
 *   The PURE, cell-aware budget planner + buildability classifier. The consumer (the
 *   .mts driver / the `hermes_cad_build_plan` dispatcher action / a live-chat Workflow)
 *   supplies the opus cost table + opus-fast-max builder spec from OpusFastMaxAgentSpecEngine,
 *   so the opus 5x multiplier lives in ONE place (that engine), never here. The risky half
 *   (actually spawning the agents) lives in the consumer -- this engine only DESCRIBES the
 *   build cells + sizes the budget, so it is fully testable with no I/O.
 *
 * PURE: no I/O, no Date.now, no agent-spawning. Cost table + units are injected.
 *
 * Karpathy discipline:
 *   CLASSIFY: buildability classification (pure predicate) + greedy cell-budget fit.
 *   TECHNIQUE: phase-ranked greedy packing of fixed-cost build cells into the budget;
 *     reuse the injected opus cost table rather than re-deriving any multiplier.
 *   EDGE CASES: empty/all-shipped units -> 0 cells (ok:false); budget 0 / zero-cost table
 *     -> every unit refused (R12 -- a refused budget spawns NOTHING); a unit that does not
 *     fit is REFUSED (surfaced), never silently dropped; drifted gate case -> normalized.
 *   FAILURE MODES: gated units (operator/merge/GPU) can never reach a build cell -- the
 *     classifier excludes them with an explicit reason (no phantom CAD build of a unit that
 *     depends on the unmerged smooth-solid emitter or a GPU train run).
 *
 * @module engines/CADBuilderFanoutEngine
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types + policy surface
// ---------------------------------------------------------------------------

export type CellSize = "short" | "medium" | "large";

export interface BuildCellRole {
  role: string;
  size: CellSize;
  subagent_type: string;
}

/**
 * Default agent roster for ONE CAD-unit build cell -- the CLAUDE.md multi-agent build
 * pattern (builder + physics-reviewer + test-reviewer + code-reviewer). `subagent_type`
 * names map to PRISM's real agent registry so a consumer Workflow can spawn them directly.
 */
export const DEFAULT_BUILD_CELL_ROLES: readonly BuildCellRole[] = Object.freeze([
  Object.freeze({ role: "builder", size: "large", subagent_type: "coder" }) as BuildCellRole,
  Object.freeze({ role: "physics-review", size: "medium", subagent_type: "physics-reviewer" }) as BuildCellRole,
  Object.freeze({ role: "test-review", size: "medium", subagent_type: "test-review-agent" }) as BuildCellRole,
  Object.freeze({ role: "code-review", size: "medium", subagent_type: "code-analyzer" }) as BuildCellRole,
]);

/** Terminal-gate codes that require a TRAINED adapter (a Blackwell GPU window) -- not autonomous. */
export const GPU_GATED_GATES: ReadonlySet<string> = new Set(["T1"]);

/**
 * CAD units that depend on the unmerged `slot/delta` smooth-solid emitter and so cannot be
 * built on trunk until `U-MERGE-SLOT-DELTA` lands (operator-gated merge). Building them
 * pre-merge would duplicate already-built capability (R8). Override via opts.mergeGatedIds
 * (the driver clears it post-merge -- see deriveMergeGatedIds).
 */
export const DEFAULT_MERGE_GATED_IDS: ReadonlySet<string> = new Set([
  "U-CAD-NURBS-STEP-EMIT",
  "U-CAD-SCALE-COMPLEX",
]);

/** A CAD-COMPLETION-STATUS `results` entry (the subset the planner reads). */
export interface StatusUnit {
  id?: string;
  phase?: string;
  gate?: string | null;
  op?: boolean;
  state?: string;
  title?: string;
}

export interface CostTable {
  short: number;
  medium: number;
  large: number;
}

export interface BuildabilityVerdict {
  buildable: boolean;
  reason: string;
}

export interface PlanAgent {
  role: string;
  subagent_type: string;
  size: CellSize;
  estTokens: number;
  spec: Record<string, unknown>;
}

export interface PlanCell {
  unit: string;
  phase: string | null;
  gate: string | null;
  title: string;
  estTokens: number;
  agents: PlanAgent[];
}

export interface FanoutPlan {
  ok: boolean;
  reason: string;
  perCellTokens: number;
  totalEstTokens: number;
  budgetTokens: number;
  cellCount: number;
  agentCount: number;
  cells: PlanCell[];
  refused: Array<{ id: string; reason: string }>;
  excluded: Array<{ id: string; reason: string }>;
}

export interface ClassifyOpts {
  mergeGatedIds?: ReadonlySet<string>;
  gpuGatedGates?: ReadonlySet<string>;
}

export interface PlanArgs {
  units: StatusUnit[];
  costTable: CostTable;
  budgetTokens: number;
  builderSpec?: Record<string, unknown>;
  maxCells?: number;
  roles?: readonly BuildCellRole[];
  opts?: ClassifyOpts;
}

/** Phase ordering -- run/train units (B) before capability (C) before throughput (D)/orchestration (PA). */
const PHASE_RANK: Readonly<Record<string, number>> = Object.freeze({ A: 0, B: 1, C: 2, D: 3, PA: 4 });

/** Validate the numeric/array shape of plan args without throwing on a messy live status. */
const PlanArgsShape = z.object({
  budgetTokens: z.coerce.number().finite().nonnegative().catch(0),
  maxCells: z.coerce.number().int().min(1).max(20).catch(8),
});

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class CADBuilderFanoutEngine {
  /**
   * Classify whether a CAD-completion status unit is autonomously buildable by a parallel
   * build cell THIS session (no operator/merge/GPU gate). String fields are normalized so an
   * upstream STATUS-generator drift (case/whitespace) can never flip a gated unit to buildable.
   *
   * @param unit a CAD-COMPLETION-STATUS result entry
   * @param opts optional mergeGatedIds / gpuGatedGates overrides
   * @returns { buildable, reason }
   */
  static classifyBuildability(unit: StatusUnit | null | undefined, opts: ClassifyOpts = {}): BuildabilityVerdict {
    const mergeGated = opts.mergeGatedIds ?? DEFAULT_MERGE_GATED_IDS;
    const gpuGates = opts.gpuGatedGates ?? GPU_GATED_GATES;
    if (!unit || typeof unit !== "object") return { buildable: false, reason: "invalid-unit" };
    const state = typeof unit.state === "string" ? unit.state.trim().toUpperCase() : unit.state;
    const gate = typeof unit.gate === "string" ? unit.gate.trim().toUpperCase() : unit.gate;
    if (state === "SHIPPED") return { buildable: false, reason: "already-shipped" };
    if (state && state !== "PENDING") return { buildable: false, reason: `state-${state}` };
    if (unit.op === true) return { buildable: false, reason: "operator-gated" };
    if (unit.id && mergeGated.has(unit.id)) return { buildable: false, reason: "merge-gated" };
    if (gate && gpuGates.has(gate)) return { buildable: false, reason: "gpu-gated" };
    return { buildable: true, reason: "autonomous-pending" };
  }

  /**
   * Total token cost of one build cell = sum of its agents' size-bucket costs.
   *
   * @param costTable injected (e.g. OpusFastMaxAgentSpecEngine.costTableFor('opus'))
   * @param roles cell roster (default DEFAULT_BUILD_CELL_ROLES)
   * @returns tokens for one cell (0 if the cost table is empty/zero)
   */
  static cellCost(costTable: Partial<CostTable> | null | undefined, roles: readonly BuildCellRole[] = DEFAULT_BUILD_CELL_ROLES): number {
    if (!costTable || typeof costTable !== "object") return 0;
    return roles.reduce((sum, r) => sum + (Number(costTable[r.size]) || 0), 0);
  }

  /**
   * Plan a parallel CAD-unit build fan-out: pack autonomous-buildable PENDING units into
   * fixed-cost build cells until the token budget (or maxCells) is exhausted. Greedy by phase
   * priority, then input order. Degrades gracefully -- units that do not fit are REFUSED
   * (surfaced), never silently dropped (R12).
   *
   * NOTE (R8): this is a fixed-cost cell packer, NOT OpusFastMaxAgentSpecEngine.planParallelism
   * (which sizes N *homogeneous* agents). Each cell is a fixed 4-agent heterogeneous-size build
   * cell, so the envelope engine's largest-prefix walk does not apply -- the divergence is intentional.
   *
   * @param args { units, costTable, budgetTokens, builderSpec, maxCells, roles, opts }
   * @returns FanoutPlan
   */
  static plan(args: PlanArgs): FanoutPlan {
    const a = args ?? ({} as PlanArgs);
    const list = Array.isArray(a.units) ? a.units : [];
    const roles = a.roles ?? DEFAULT_BUILD_CELL_ROLES;
    const norm = PlanArgsShape.parse({ budgetTokens: a.budgetTokens, maxCells: a.maxCells ?? 8 });
    const budget = Math.max(0, Math.trunc(norm.budgetTokens));
    const cap = Math.trunc(norm.maxCells);
    const costTable = a.costTable;
    const builderSpec = a.builderSpec ?? {};
    const perCell = CADBuilderFanoutEngine.cellCost(costTable, roles);

    // Partition once: buildable vs excluded (with reason). The excluded list is the honest
    // "why these are not in the batch" surface (operator/merge/GPU gated / already-shipped).
    const classified = list.map((u) => ({ unit: u, cls: CADBuilderFanoutEngine.classifyBuildability(u, a.opts ?? {}) }));
    const excluded = classified
      .filter((c) => !c.cls.buildable)
      .map((c) => ({ id: c.unit?.id ?? "(unknown)", reason: c.cls.reason }));

    const buildable = classified
      .filter((c) => c.cls.buildable)
      .sort((x, y) => (PHASE_RANK[x.unit.phase ?? ""] ?? 9) - (PHASE_RANK[y.unit.phase ?? ""] ?? 9));

    const cells: PlanCell[] = [];
    const refused: Array<{ id: string; reason: string }> = [];
    let spent = 0;

    for (const { unit } of buildable) {
      const uid = unit.id ?? "(unknown)";
      if (cells.length >= cap) {
        refused.push({ id: uid, reason: "max-cells-reached" });
        continue;
      }
      if (perCell <= 0) {
        refused.push({ id: uid, reason: "zero-cost-table" });
        continue;
      }
      if (spent + perCell > budget) {
        refused.push({ id: uid, reason: "budget-exhausted" });
        continue;
      }
      spent += perCell;
      cells.push({
        unit: uid,
        phase: unit.phase ?? null,
        gate: unit.gate ?? null,
        title: unit.title ?? "",
        estTokens: perCell,
        agents: roles.map((r) => ({
          role: r.role,
          subagent_type: r.subagent_type,
          size: r.size,
          estTokens: Number(costTable?.[r.size]) || 0,
          spec:
            r.role === "builder"
              ? { ...builderSpec, label: `build:${uid}` }
              : { ...builderSpec, label: `${r.role}:${uid}` },
        })),
      });
    }

    return {
      ok: cells.length > 0,
      reason: cells.length ? "planned" : buildable.length ? "no-buildable-units-fit-budget" : "no-autonomous-buildable-units",
      perCellTokens: perCell,
      totalEstTokens: spent,
      budgetTokens: budget,
      cellCount: cells.length,
      agentCount: cells.length * roles.length,
      cells,
      refused,
      excluded,
    };
  }

  /** One-line render of a fan-out plan for logs / ledgers (ASCII-only). */
  static render(p: FanoutPlan | null | undefined): string {
    if (!p) return "[CAD-FANOUT] (null plan)";
    const head =
      `[CAD-FANOUT ${p.ok ? "PLANNED" : "EMPTY"}] cells=${p.cellCount} agents=${p.agentCount} ` +
      `est=${p.totalEstTokens}/${p.budgetTokens} tok (perCell=${p.perCellTokens})`;
    const cellLines = (p.cells ?? []).map(
      (c) => `  - ${String(c.unit).padEnd(26)} [${c.phase}${c.gate ? "/" + c.gate : ""}] ${c.agents.length} agents`,
    );
    const refusedLine = p.refused?.length
      ? `  refused: ${p.refused.map((r) => `${r.id}(${r.reason})`).join(", ")}`
      : "";
    return [head, ...cellLines, refusedLine].filter(Boolean).join("\n");
  }
}

export const cadBuilderFanoutEngine = CADBuilderFanoutEngine;
