/**
 * Tests for the RoadmapExecutor — Parallel Execution Protocol Engine
 * Tests: DAG construction, ready-unit detection, parallel batching,
 *        position management, phase gate checks.
 */
import { describe, it, expect } from "vitest";
import {
  buildDependencyDAG,
  getReadyUnits,
  getReadyUnitsInPhase,
  planPhaseExecution,
  planRoadmapExecution,
  createInitialPosition,
  getCompletedIds,
  advancePosition,
  checkPhaseGate,
  summarizePlan,
  getNextBatch,
  validateBatch,
} from "../engines/RoadmapExecutor.js";
import {
  createEmptyUnit,
  createEmptyPhase,
  type RoadmapEnvelope,
  type RoadmapUnit,
  type RoadmapPhase,
} from "../schemas/roadmapSchema.js";

// ── Test Fixtures ────────────────────────────────────────────────────

function makeUnit(id: string, phase: string, seq: number, deps: string[] = []): RoadmapUnit {
  const unit = createEmptyUnit(id, `Unit ${id}`, phase, seq);
  unit.dependencies = deps;
  unit.estimated_tokens = 400;
  return unit;
}

function makePhase(id: string, units: RoadmapUnit[]): RoadmapPhase {
  const phase = createEmptyPhase(id, `Phase ${id}`);
  phase.units = units;
  return phase;
}

function makeRoadmap(phases: RoadmapPhase[]): RoadmapEnvelope {
  const totalUnits = phases.reduce((sum, p) => sum + p.units.length, 0);
  return {
    id: "TEST",
    version: "1.0.0",
    title: "Test Roadmap",
    brief: "Test",
    created_at: new Date().toISOString(),
    created_by: "test",
    phases,
    total_units: totalUnits,
    total_sessions: "1",
    role_matrix: [],
    tool_map: [],
    deliverables_index: [],
    existing_leverage: [],
    scrutiny_config: {
      pass_mode: "adaptive",
      min_passes: 3,
      max_passes: 7,
      convergence_rule: "delta < 2",
      escalation_rule: "if pass 4+ finds CRITICAL, flag for human review",
      scrutinizer_model: "opus-4.6",
      scrutinizer_effort: 90,
      gap_categories: [],
      improvement_threshold: 0.92,
    },
  };
}

// ── DAG Construction ─────────────────────────────────────────────────

describe("buildDependencyDAG", () => {
  it("builds a DAG from independent units", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1),
      makeUnit("P1-U03", "P1", 2),
    ]);
    const roadmap = makeRoadmap([phase]);
    const dag = buildDependencyDAG(roadmap);

    expect(dag.totalUnits).toBe(3);
    expect(dag.hasCycles).toBe(false);
    // All independent → single layer
    expect(dag.layers.length).toBe(1);
    expect(dag.layers[0].length).toBe(3);
  });

  it("detects dependency chain", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1, ["P1-U01"]),
      makeUnit("P1-U03", "P1", 2, ["P1-U02"]),
    ]);
    const roadmap = makeRoadmap([phase]);
    const dag = buildDependencyDAG(roadmap);

    expect(dag.layers.length).toBe(3);
    expect(dag.layers[0]).toEqual(["P1-U01"]);
    expect(dag.layers[1]).toEqual(["P1-U02"]);
    expect(dag.layers[2]).toEqual(["P1-U03"]);
  });

  it("detects diamond dependency", () => {
    // U01 -> U02, U01 -> U03, U02+U03 -> U04
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1, ["P1-U01"]),
      makeUnit("P1-U03", "P1", 2, ["P1-U01"]),
      makeUnit("P1-U04", "P1", 3, ["P1-U02", "P1-U03"]),
    ]);
    const roadmap = makeRoadmap([phase]);
    const dag = buildDependencyDAG(roadmap);

    expect(dag.layers.length).toBe(3);
    expect(dag.layers[0]).toEqual(["P1-U01"]);
    expect(dag.layers[1].sort()).toEqual(["P1-U02", "P1-U03"]);
    expect(dag.layers[2]).toEqual(["P1-U04"]);
  });

  it("detects circular dependency", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0, ["P1-U02"]),
      makeUnit("P1-U02", "P1", 1, ["P1-U01"]),
    ]);
    const roadmap = makeRoadmap([phase]);
    const dag = buildDependencyDAG(roadmap);

    expect(dag.hasCycles).toBe(true);
    expect(dag.cycleInfo).toContain("P1-U01");
    expect(dag.cycleInfo).toContain("P1-U02");
  });
});

// ── Ready Unit Detection ─────────────────────────────────────────────

describe("getReadyUnits", () => {
  it("returns all units when no dependencies", () => {
    const units = [
      makeUnit("U1", "P1", 0),
      makeUnit("U2", "P1", 1),
      makeUnit("U3", "P1", 2),
    ];
    const ready = getReadyUnits(units, new Set());
    expect(ready.length).toBe(3);
  });

  it("excludes units with unmet dependencies", () => {
    const units = [
      makeUnit("U1", "P1", 0),
      makeUnit("U2", "P1", 1, ["U1"]),
      makeUnit("U3", "P1", 2, ["U1"]),
    ];
    const ready = getReadyUnits(units, new Set());
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe("U1");
  });

  it("includes units whose dependencies are all met", () => {
    const units = [
      makeUnit("U1", "P1", 0),
      makeUnit("U2", "P1", 1, ["U1"]),
      makeUnit("U3", "P1", 2, ["U1"]),
    ];
    const ready = getReadyUnits(units, new Set(["U1"]));
    expect(ready.length).toBe(2);
    expect(ready.map(u => u.id).sort()).toEqual(["U2", "U3"]);
  });

  it("excludes already-completed units", () => {
    const units = [
      makeUnit("U1", "P1", 0),
      makeUnit("U2", "P1", 1),
    ];
    const ready = getReadyUnits(units, new Set(["U1"]));
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe("U2");
  });
});

// ── Parallel Batching ────────────────────────────────────────────────

describe("planPhaseExecution", () => {
  it("creates single parallel batch for independent units", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1),
      makeUnit("P1-U03", "P1", 2),
    ]);
    const plan = planPhaseExecution(phase, new Set());

    expect(plan.batches.length).toBe(1);
    expect(plan.batches[0].parallel).toBe(true);
    expect(plan.batches[0].units.length).toBe(3);
    expect(plan.parallelBatches).toBe(1);
  });

  it("creates sequential batches for linear chain", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1, ["P1-U01"]),
      makeUnit("P1-U03", "P1", 2, ["P1-U02"]),
    ]);
    const plan = planPhaseExecution(phase, new Set());

    expect(plan.batches.length).toBe(3);
    expect(plan.batches.every(b => !b.parallel)).toBe(true);
    expect(plan.sequentialBatches).toBe(3);
  });

  it("creates mixed batches for diamond pattern", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1, ["P1-U01"]),
      makeUnit("P1-U03", "P1", 2, ["P1-U01"]),
      makeUnit("P1-U04", "P1", 3, ["P1-U02", "P1-U03"]),
    ]);
    const plan = planPhaseExecution(phase, new Set());

    expect(plan.batches.length).toBe(3);
    // Batch 1: U01 (sequential)
    expect(plan.batches[0].units.length).toBe(1);
    // Batch 2: U02 + U03 (parallel)
    expect(plan.batches[1].units.length).toBe(2);
    expect(plan.batches[1].parallel).toBe(true);
    // Batch 3: U04 (sequential)
    expect(plan.batches[2].units.length).toBe(1);
  });
});

// ── Full Roadmap Plan ────────────────────────────────────────────────

describe("planRoadmapExecution", () => {
  it("plans across multiple phases", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [
        makeUnit("P1-U01", "P1", 0),
        makeUnit("P1-U02", "P1", 1),
      ]),
      makePhase("P2", [
        makeUnit("P2-U01", "P2", 0, ["P1-U01"]),
        makeUnit("P2-U02", "P2", 1),
      ]),
    ]);

    const plan = planRoadmapExecution(roadmap);
    expect(plan.phases.length).toBe(2);
    expect(plan.totalUnits).toBe(4);
    expect(plan.totalBatches).toBeGreaterThan(0);
  });

  it("reports summary text", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [
        makeUnit("P1-U01", "P1", 0),
        makeUnit("P1-U02", "P1", 1),
      ]),
    ]);
    const plan = planRoadmapExecution(roadmap);
    const summary = summarizePlan(plan);

    expect(summary).toContain("ROADMAP EXECUTION PLAN");
    expect(summary).toContain("PARALLEL");
  });
});

// ── Position Management ──────────────────────────────────────────────

describe("position management", () => {
  it("creates initial position at first unit", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [
        makeUnit("P1-U01", "P1", 0),
        makeUnit("P1-U02", "P1", 1),
      ]),
    ]);
    const pos = createInitialPosition(roadmap);

    expect(pos.current_unit).toBe("P1-U01");
    expect(pos.current_phase).toBe("P1");
    expect(pos.units_completed).toBe(0);
    expect(pos.status).toBe("IN_PROGRESS");
  });

  it("advances position after unit completion", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [
        makeUnit("P1-U01", "P1", 0),
        makeUnit("P1-U02", "P1", 1),
      ]),
    ]);
    const pos = createInitialPosition(roadmap);
    const updated = advancePosition(
      pos,
      [{ unitId: "P1-U01", buildPassed: true }],
      roadmap
    );

    expect(updated.units_completed).toBe(1);
    expect(updated.last_completed_unit).toBe("P1-U01");
    expect(updated.percent_complete).toBe(50);
    expect(updated.current_unit).toBe("P1-U02");
  });

  it("marks COMPLETE when all units done", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [makeUnit("P1-U01", "P1", 0)]),
    ]);
    const pos = createInitialPosition(roadmap);
    const updated = advancePosition(
      pos,
      [{ unitId: "P1-U01", buildPassed: true }],
      roadmap
    );

    expect(updated.status).toBe("COMPLETE");
    expect(updated.percent_complete).toBe(100);
  });

  it("extracts completed IDs from position", () => {
    const pos = createInitialPosition(
      makeRoadmap([makePhase("P1", [makeUnit("P1-U01", "P1", 0)])])
    );
    pos.history = [
      { unit_id: "P1-U01", completed_at: "2026-01-01", build_status: true },
      { unit_id: "P1-U02", completed_at: "2026-01-01", build_status: true },
    ];
    const ids = getCompletedIds(pos);
    expect(ids.has("P1-U01")).toBe(true);
    expect(ids.has("P1-U02")).toBe(true);
    expect(ids.size).toBe(2);
  });
});

// ── Phase Gate Checks ────────────────────────────────────────────────

describe("checkPhaseGate", () => {
  it("passes when all checks met", () => {
    const phase = makePhase("P1", [
      makeUnit("P1-U01", "P1", 0),
      makeUnit("P1-U02", "P1", 1),
    ]);
    const result = checkPhaseGate(
      phase,
      new Set(["P1-U01", "P1-U02"]),
      { buildPassed: true, testsPassed: true, testCount: 111, baselineTestCount: 111, omegaScore: 1.0 }
    );

    expect(result.passed).toBe(true);
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it("fails when build fails", () => {
    const phase = makePhase("P1", [makeUnit("P1-U01", "P1", 0)]);
    const result = checkPhaseGate(
      phase,
      new Set(["P1-U01"]),
      { buildPassed: false, testsPassed: true, testCount: 111, baselineTestCount: 111, omegaScore: 1.0 }
    );

    expect(result.passed).toBe(false);
    const buildCheck = result.checks.find(c => c.name === "build_passes");
    expect(buildCheck?.passed).toBe(false);
  });

  it("fails when omega below floor", () => {
    const phase = makePhase("P1", [makeUnit("P1-U01", "P1", 0)]);
    const result = checkPhaseGate(
      phase,
      new Set(["P1-U01"]),
      { buildPassed: true, testsPassed: true, testCount: 111, baselineTestCount: 111, omegaScore: 0.5 }
    );

    expect(result.passed).toBe(false);
    const omegaCheck = result.checks.find(c => c.name === "omega_floor");
    expect(omegaCheck?.passed).toBe(false);
  });

  it("fails on test regression", () => {
    const phase = makePhase("P1", [makeUnit("P1-U01", "P1", 0)]);
    const result = checkPhaseGate(
      phase,
      new Set(["P1-U01"]),
      { buildPassed: true, testsPassed: true, testCount: 100, baselineTestCount: 111, omegaScore: 1.0 }
    );

    expect(result.passed).toBe(false);
    const antiReg = result.checks.find(c => c.name === "anti_regression");
    expect(antiReg?.passed).toBe(false);
  });
});

// ── getNextBatch ─────────────────────────────────────────────────────

describe("getNextBatch", () => {
  it("returns parallel batch when multiple units ready", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [
        makeUnit("P1-U01", "P1", 0),
        makeUnit("P1-U02", "P1", 1),
        makeUnit("P1-U03", "P1", 2),
      ]),
    ]);
    const pos = createInitialPosition(roadmap);
    const result = getNextBatch(roadmap, pos);

    expect(result.batch).not.toBeNull();
    expect(result.batch!.parallel).toBe(true);
    expect(result.batch!.units.length).toBe(3);
    expect(result.complete).toBe(false);
    expect(result.message).toContain("PARALLEL");
  });

  it("returns single unit when only one ready", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [
        makeUnit("P1-U01", "P1", 0),
        makeUnit("P1-U02", "P1", 1, ["P1-U01"]),
      ]),
    ]);
    const pos = createInitialPosition(roadmap);
    const result = getNextBatch(roadmap, pos);

    expect(result.batch!.parallel).toBe(false);
    expect(result.batch!.units.length).toBe(1);
    expect(result.message).toContain("SEQUENTIAL");
  });

  it("returns complete when all done", () => {
    const roadmap = makeRoadmap([
      makePhase("P1", [makeUnit("P1-U01", "P1", 0)]),
    ]);
    const pos = createInitialPosition(roadmap);
    pos.history = [{ unit_id: "P1-U01", completed_at: "2026-01-01", build_status: true }];
    pos.units_completed = 1;

    const result = getNextBatch(roadmap, pos);
    expect(result.complete).toBe(true);
    expect(result.batch).toBeNull();
  });
});
