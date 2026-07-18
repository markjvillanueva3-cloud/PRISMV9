/**
 * Tests for CADBuilderFanoutEngine (PA3-HERMES-CAD-BUILDER pure planner).
 * Reference-value + algebraic-invariant asserts (R9). The opus cost table is the real
 * OpusFastMaxAgentSpecEngine.costTableFor('opus') = sonnet x 5 = {20000,60000,150000}.
 */
import { describe, it, expect } from "vitest";
import {
  CADBuilderFanoutEngine,
  DEFAULT_BUILD_CELL_ROLES,
  DEFAULT_MERGE_GATED_IDS,
  type StatusUnit,
  type CostTable,
} from "../engines/CADBuilderFanoutEngine.js";
import { OpusFastMaxAgentSpecEngine } from "../engines/OpusFastMaxAgentSpecEngine.js";

const OPUS: CostTable = { short: 20_000, medium: 60_000, large: 150_000 };
const PER_CELL = 150_000 + 3 * 60_000; // builder(large) + 3 reviewers(medium) = 330000
const SPEC = { model: "opus", effort: "max", fastMode: true, rationale: "test" };

const PENDING = (id: string, phase = "C", extra: Partial<StatusUnit> = {}): StatusUnit => ({
  id,
  phase,
  state: "PENDING",
  title: id,
  ...extra,
});
const SHIPPED = (id: string, phase = "C"): StatusUnit => ({ id, phase, state: "SHIPPED", title: id });

describe("CADBuilderFanoutEngine.classifyBuildability", () => {
  it("a plain PENDING unit is buildable", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-FOO"))).toEqual({
      buildable: true,
      reason: "autonomous-pending",
    });
  });
  it("SHIPPED is excluded as already-shipped", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(SHIPPED("U-CAD-BOOLEAN")).reason).toBe("already-shipped");
  });
  it("operator-gated (op:true) is excluded", () => {
    expect(
      CADBuilderFanoutEngine.classifyBuildability({ id: "U-MERGE-SLOT-DELTA", phase: "A", state: "PENDING", op: true }),
    ).toEqual({ buildable: false, reason: "operator-gated" });
  });
  it("merge-gated ids are excluded (depend on the unmerged emitter)", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-NURBS-STEP-EMIT", "A")).reason).toBe("merge-gated");
    expect(CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-SCALE-COMPLEX", "D")).reason).toBe("merge-gated");
    expect(DEFAULT_MERGE_GATED_IDS.has("U-CAD-NURBS-STEP-EMIT")).toBe(true);
  });
  it("a T1-gated unit needs a GPU train run -> gpu-gated", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-REAL-TRAIN-RUN", "B", { gate: "T1" })).reason).toBe(
      "gpu-gated",
    );
  });
  it("T2/T3 gates are NOT gpu-gated (validation/printgen run autonomously)", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-PRINTGEN-E2E", "B", { gate: "T3" })).buildable).toBe(
      true,
    );
    expect(
      CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-VALIDATION-50-RUN", "B", { gate: "T2" })).buildable,
    ).toBe(true);
  });
  it("null / non-object -> invalid-unit (no throw)", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(null).reason).toBe("invalid-unit");
    expect(CADBuilderFanoutEngine.classifyBuildability(undefined).buildable).toBe(false);
  });
  it("mergeGatedIds override changes the verdict (self-clears post-merge)", () => {
    const r = CADBuilderFanoutEngine.classifyBuildability(PENDING("U-CAD-NURBS-STEP-EMIT", "A"), {
      mergeGatedIds: new Set<string>(),
    });
    expect(r.buildable).toBe(true);
  });
  it("a non-PENDING/non-SHIPPED state is excluded conservatively as state-<X> (never wrongly built)", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability({ id: "U-Z", phase: "C", state: "IN_PROGRESS" }).reason).toBe(
      "state-IN_PROGRESS",
    );
    expect(CADBuilderFanoutEngine.classifyBuildability({ id: "U-Z2", phase: "C", state: "blocked" }).buildable).toBe(false);
  });
  it("drifted gate case/whitespace still reads as the gate (no slip-through)", () => {
    expect(CADBuilderFanoutEngine.classifyBuildability(PENDING("U-X", "B", { gate: " t1 " })).reason).toBe("gpu-gated");
    expect(CADBuilderFanoutEngine.classifyBuildability({ id: "U-Y", phase: "C", state: " shipped " }).reason).toBe(
      "already-shipped",
    );
  });
});

describe("CADBuilderFanoutEngine.cellCost", () => {
  it("default roster against opus table = 330000", () => {
    expect(CADBuilderFanoutEngine.cellCost(OPUS)).toBe(PER_CELL);
    expect(DEFAULT_BUILD_CELL_ROLES.length).toBe(4);
  });
  it("null/empty cost table -> 0 (drives the zero-cost-table refusal)", () => {
    expect(CADBuilderFanoutEngine.cellCost(null)).toBe(0);
    expect(CADBuilderFanoutEngine.cellCost({})).toBe(0);
  });
  it("the engine cost table really is sonnet x 5 (single source = OpusFastMaxAgentSpecEngine)", () => {
    expect(OpusFastMaxAgentSpecEngine.costTableFor("opus")).toEqual(OPUS);
  });
});

describe("CADBuilderFanoutEngine.plan -- happy", () => {
  it("3 buildable units, ample budget -> 3 cells x 4 agents, est = 3*perCell", () => {
    const units = [PENDING("U-A"), PENDING("U-B"), PENDING("U-C")];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: 2_000_000, builderSpec: SPEC });
    expect(p.ok).toBe(true);
    expect(p.cellCount).toBe(3);
    expect(p.agentCount).toBe(12);
    expect(p.totalEstTokens).toBe(3 * PER_CELL);
    expect(p.refused.length).toBe(0);
    const builder = p.cells[0].agents.find((a) => a.role === "builder");
    expect(builder?.spec.model).toBe("opus");
    expect(builder?.spec.label).toBe("build:U-A");
    expect(builder?.subagent_type).toBe("coder");
  });
});

describe("CADBuilderFanoutEngine.plan -- failure modes", () => {
  it("empty units -> ok:false, no-autonomous-buildable-units", () => {
    const p = CADBuilderFanoutEngine.plan({ units: [], costTable: OPUS, budgetTokens: 1_000_000, builderSpec: SPEC });
    expect(p.ok).toBe(false);
    expect(p.reason).toBe("no-autonomous-buildable-units");
    expect(p.cellCount).toBe(0);
  });
  it("all SHIPPED -> 0 cells, every unit excluded as already-shipped", () => {
    const units = [SHIPPED("U-CAD-BOOLEAN"), SHIPPED("U-CAD-PATTERNS")];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: 1_000_000, builderSpec: SPEC });
    expect(p.cellCount).toBe(0);
    expect(p.excluded.length).toBe(2);
    expect(p.excluded.every((e) => e.reason === "already-shipped")).toBe(true);
  });
  it("budget 0 -> every buildable unit refused (R12: refused budget spawns NOTHING)", () => {
    const units = [PENDING("U-A"), PENDING("U-B")];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: 0, builderSpec: SPEC });
    expect(p.cellCount).toBe(0);
    expect(p.agentCount).toBe(0);
    expect(p.refused.length).toBe(2);
    expect(p.refused.every((r) => r.reason === "budget-exhausted")).toBe(true);
  });
  it("zero-cost table -> refused as zero-cost-table (never divide-by-zero spawn)", () => {
    const p = CADBuilderFanoutEngine.plan({ units: [PENDING("U-A")], costTable: {} as CostTable, budgetTokens: 1_000_000, builderSpec: SPEC });
    expect(p.cellCount).toBe(0);
    expect(p.refused[0].reason).toBe("zero-cost-table");
  });
  it("non-finite budget coerces to 0 (R12) -> all refused, never spawns", () => {
    const p = CADBuilderFanoutEngine.plan({ units: [PENDING("U-A")], costTable: OPUS, budgetTokens: NaN as unknown as number, builderSpec: SPEC });
    expect(p.budgetTokens).toBe(0);
    expect(p.cellCount).toBe(0);
  });
});

describe("CADBuilderFanoutEngine.plan -- adversarial", () => {
  it("realistic mixed STATUS list -> only the 2 true-autonomous units build, rest excluded with reasons", () => {
    const units: StatusUnit[] = [
      { id: "U-MERGE-SLOT-DELTA", phase: "A", state: "PENDING", op: true, title: "merge" },
      PENDING("U-CAD-NURBS-STEP-EMIT", "A"),
      PENDING("U-CAD-REAL-TRAIN-RUN", "B", { gate: "T1" }),
      PENDING("U-CAD-VALIDATION-50-RUN", "B", { gate: "T2" }),
      PENDING("U-CAD-PRINTGEN-E2E", "B", { gate: "T3" }),
      SHIPPED("U-CAD-BOOLEAN"),
    ];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: 2_000_000, builderSpec: SPEC });
    expect(p.cellCount).toBe(2);
    expect(p.cells.map((c) => c.unit).sort()).toEqual(["U-CAD-PRINTGEN-E2E", "U-CAD-VALIDATION-50-RUN"]);
    const reasons = Object.fromEntries(p.excluded.map((e) => [e.id, e.reason]));
    expect(reasons["U-MERGE-SLOT-DELTA"]).toBe("operator-gated");
    expect(reasons["U-CAD-NURBS-STEP-EMIT"]).toBe("merge-gated");
    expect(reasons["U-CAD-REAL-TRAIN-RUN"]).toBe("gpu-gated");
    expect(reasons["U-CAD-BOOLEAN"]).toBe("already-shipped");
  });
  it("budget caps mid-list -> partial spawn + budget-exhausted refusals; spend never exceeds budget", () => {
    const units = [PENDING("U-A"), PENDING("U-B"), PENDING("U-C"), PENDING("U-D"), PENDING("U-E")];
    const budget = 2 * PER_CELL + 1000;
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: budget, builderSpec: SPEC });
    expect(p.cellCount).toBe(2);
    expect(p.refused.length).toBe(3);
    expect(p.refused.every((r) => r.reason === "budget-exhausted")).toBe(true);
    expect(p.totalEstTokens).toBeLessThanOrEqual(budget);
  });
  it("EXACT-fit budget builds the cell (locks the > boundary, not >=)", () => {
    const units = [PENDING("U-A"), PENDING("U-B")];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: 2 * PER_CELL, builderSpec: SPEC });
    expect(p.cellCount).toBe(2);
    expect(p.totalEstTokens).toBe(2 * PER_CELL);
    expect(p.refused.length).toBe(0);
  });
  it("maxCells cap refuses beyond the cap even with ample budget", () => {
    const units = [PENDING("U-A"), PENDING("U-B"), PENDING("U-C"), PENDING("U-D")];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: 10_000_000, builderSpec: SPEC, maxCells: 2 });
    expect(p.cellCount).toBe(2);
    expect(p.refused.filter((r) => r.reason === "max-cells-reached").length).toBe(2);
  });
  it("phase priority -- a B-phase unit is built before a D-phase one when only 1 cell fits", () => {
    const units = [PENDING("U-DLATER", "D"), PENDING("U-BFIRST", "B")];
    const p = CADBuilderFanoutEngine.plan({ units, costTable: OPUS, budgetTokens: PER_CELL + 100, builderSpec: SPEC });
    expect(p.cellCount).toBe(1);
    expect(p.cells[0].unit).toBe("U-BFIRST");
    expect(p.refused[0].id).toBe("U-DLATER");
  });
});

describe("CADBuilderFanoutEngine.render", () => {
  it("renders a header + per-cell lines (ASCII only)", () => {
    const p = CADBuilderFanoutEngine.plan({ units: [PENDING("U-A")], costTable: OPUS, budgetTokens: 1_000_000, builderSpec: SPEC });
    const s = CADBuilderFanoutEngine.render(p);
    expect(s).toMatch(/CAD-FANOUT PLANNED/);
    expect(s).toMatch(/U-A/);
    expect(Buffer.byteLength(s, "utf8")).toBe(s.length); // ASCII-only proof
  });
  it("null plan renders a safe placeholder", () => {
    expect(CADBuilderFanoutEngine.render(null)).toMatch(/null plan/);
  });
});
