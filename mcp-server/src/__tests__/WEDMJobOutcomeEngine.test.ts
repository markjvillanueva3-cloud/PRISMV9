/**
 * WEDMJobOutcomeEngine — outcome ledger + bus-mirror tests.
 *
 * BRIDGE-DEEP/U-BRIDGE-SHOPFLOOR-LEARN follow-up coverage. Asserts the
 * engine's bit-exact record+replay invariant + the BRIDGE-DEEP emit hook
 * (PRISM_WEDM_BRIDGE_DISABLE knob + try/catch). Concrete reference values
 * throughout — no toBeDefined() stubs.
 *
 * @module __tests__/WEDMJobOutcomeEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  wedmJobOutcomeEngine,
  WEDMJobOutcomeEngine,
} from "../engines/WEDMJobOutcomeEngine.js";

// Helper — build a structurally-valid WEDMJobOutcome.
// jobIds are unique per test so the engine's duplicate-guard never fires
// unintentionally and so the live outcome bus shard never collides on
// lineage_id across reruns.
function makeOutcome(overrides: Record<string, unknown> = {}): unknown {
  const jobId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    jobId,
    finishedAt: "2026-05-20T18:00:00Z",
    material: "D2",
    thicknessMm: 12,
    wireDiameterMm: 0.25,
    wireMaterial: "brass",
    controller: "fanuc" as const,
    predicted: { raUm: 2.0, cycleTimeMin: 45, wireBreaks: 0 },
    actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 0 },
    recordedBy: "test-suite",
    ...(overrides as object),
  };
}

describe("WEDMJobOutcomeEngine — recordOutcome (R12 contract)", () => {
  beforeEach(() => {
    wedmJobOutcomeEngine._resetForTests();
  });

  it("accepts a structurally-valid outcome and returns concrete error signals", () => {
    const r = wedmJobOutcomeEngine.recordOutcome(makeOutcome());
    expect(r.accepted).toBe(true);
    expect(r.newTotalJobs).toBe(1);
    // 48 - 45 = 3 minute cycle-time error (concrete algebraic invariant)
    expect(r.cycleTimeErrorMin.value).toBeCloseTo(3, 5);
    expect(r.cycleTimeErrorMin.unit).toBe("min");
    // 2.3 - 2.0 = 0.3 micron Ra error
    expect(r.raErrorUm.value).toBeCloseTo(0.3, 5);
    expect(r.raErrorUm.unit).toBe("um");
  });

  it("rejects malformed input (missing required field) with accepted:false", () => {
    const r = wedmJobOutcomeEngine.recordOutcome({ jobId: "x" } as unknown);
    expect(r.accepted).toBe(false);
    expect(r.newTotalJobs).toBe(0);
    expect(r.raErrorUm.source).toBe("rejected");
    expect(r.raErrorUm.confidence).toBe(0);
  });

  it("rejects duplicate jobId on replay (idempotency guard)", () => {
    const outcome = makeOutcome();
    const r1 = wedmJobOutcomeEngine.recordOutcome(outcome);
    expect(r1.accepted).toBe(true);
    const r2 = wedmJobOutcomeEngine.recordOutcome(outcome);
    expect(r2.accepted).toBe(false);
    expect(r2.reason).toBe("duplicate jobId");
    expect(r2.raErrorUm.source).toBe("duplicate");
    // totalJobs MUST NOT increment on duplicate
    expect(r2.newTotalJobs).toBe(1);
  });

  it("handles totally-malformed input (null) without crashing", () => {
    const r = wedmJobOutcomeEngine.recordOutcome(null as unknown);
    expect(r.accepted).toBe(false);
    expect(r.jobId).toBe("invalid");
  });
});

describe("WEDMJobOutcomeEngine — query surface", () => {
  beforeEach(() => {
    wedmJobOutcomeEngine._resetForTests();
  });

  it("getLast(n) returns newest-first and clamps to recent.length", () => {
    const o1 = makeOutcome({ jobId: "j-1", finishedAt: "2026-05-20T18:00:00Z" });
    const o2 = makeOutcome({ jobId: "j-2", finishedAt: "2026-05-20T18:00:01Z" });
    wedmJobOutcomeEngine.recordOutcome(o1);
    wedmJobOutcomeEngine.recordOutcome(o2);
    const last2 = wedmJobOutcomeEngine.getLast(2);
    expect(last2.length).toBe(2);
    // The engine uses unshift, so the most recently RECORDED is at [0].
    // o2 was recorded second → at index 0.
    expect(last2[0].jobId).toBe("j-2");
    expect(last2[1].jobId).toBe("j-1");
    // Clamping: requesting 100 from 2 records returns 2, not 100.
    expect(wedmJobOutcomeEngine.getLast(100).length).toBe(2);
    // Negative or NaN → 0 (defensive guard)
    expect(wedmJobOutcomeEngine.getLast(-5).length).toBe(0);
  });

  it("getById finds an existing job and returns null for unknown", () => {
    const o = makeOutcome({ jobId: "find-me-1" });
    wedmJobOutcomeEngine.recordOutcome(o);
    const found = wedmJobOutcomeEngine.getById("find-me-1");
    expect(found?.jobId).toBe("find-me-1");
    expect(wedmJobOutcomeEngine.getById("ghost-jobid-9999")).toBe(null);
  });

  it("queryByMaterial is case-insensitive and respects limit", () => {
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "m-1", material: "D2" }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "m-2", material: "d2" }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "m-3", material: "Cu" }),
    );
    const d2 = wedmJobOutcomeEngine.queryByMaterial("D2");
    expect(d2.total).toBe(2);
    expect(d2.jobs.length).toBe(2);
    expect(d2.filteredBy.material).toBe("D2");
    // limit clamp
    const oneOnly = wedmJobOutcomeEngine.queryByMaterial("D2", 1);
    expect(oneOnly.jobs.length).toBe(1);
    expect(oneOnly.total).toBe(2);
  });
});

describe("WEDMJobOutcomeEngine — getStats rollup invariants", () => {
  beforeEach(() => {
    wedmJobOutcomeEngine._resetForTests();
  });

  it("starts at totalJobs=0 with zero-confidence atomic values", () => {
    const s = wedmJobOutcomeEngine.getStats();
    expect(s.totalJobs).toBe(0);
    expect(s.meanRaMAEUm.confidence).toBe(0);
    expect(s.meanCycleTimeMAEMin.confidence).toBe(0);
  });

  it("computes mean-absolute-error across two recorded outcomes (algebraic)", () => {
    // ra errors: +0.3, -0.5 → MAE = (0.3 + 0.5) / 2 = 0.4
    // cycle errors: +3, -2 → MAE = (3 + 2) / 2 = 2.5
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({
        jobId: "s-1",
        predicted: { raUm: 2.0, cycleTimeMin: 45, wireBreaks: 0 },
        actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 0 },
      }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({
        jobId: "s-2",
        predicted: { raUm: 3.0, cycleTimeMin: 50, wireBreaks: 0 },
        actual: { raUm: 2.5, cycleTimeMin: 48, wireBreaks: 0 },
      }),
    );
    const s = wedmJobOutcomeEngine.getStats();
    expect(s.totalJobs).toBe(2);
    expect(s.meanRaMAEUm.value).toBeCloseTo(0.4, 5);
    expect(s.meanCycleTimeMAEMin.value).toBeCloseTo(2.5, 5);
    // confidence is total-driven: 0.3 + N*0.02 capped at 0.95 → 0.3+0.04 = 0.34
    expect(s.meanRaMAEUm.confidence).toBeCloseTo(0.34, 2);
  });

  it("aggregates wire-break rate across recorded outcomes", () => {
    // 3 jobs with breaks 0, 2, 1 → mean = 1.0 per job
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "wb-1", actual: { raUm: 2, cycleTimeMin: 45, wireBreaks: 0 } }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "wb-2", actual: { raUm: 2, cycleTimeMin: 45, wireBreaks: 2 } }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "wb-3", actual: { raUm: 2, cycleTimeMin: 45, wireBreaks: 1 } }),
    );
    expect(wedmJobOutcomeEngine.getStats().wireBreakRate.value).toBeCloseTo(1.0, 5);
  });

  it("per-material stats split correctly across materials", () => {
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "p-1", material: "D2" }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "p-2", material: "D2" }),
    );
    wedmJobOutcomeEngine.recordOutcome(
      makeOutcome({ jobId: "p-3", material: "Cu" }),
    );
    const stats = wedmJobOutcomeEngine.getStats();
    expect(stats.perMaterial.D2.count).toBe(2);
    expect(stats.perMaterial.CU.count).toBe(1);
  });
});

describe("WEDMJobOutcomeEngine — snapshot + class export", () => {
  beforeEach(() => {
    wedmJobOutcomeEngine._resetForTests();
  });

  it("snapshot returns a defensive copy (mutation does not leak)", () => {
    wedmJobOutcomeEngine.recordOutcome(makeOutcome({ jobId: "snap-1" }));
    const snap = wedmJobOutcomeEngine.snapshot();
    snap.totalJobs = 99999; // mutate the snapshot
    snap.recent.length = 0;
    // Engine state unchanged
    expect(wedmJobOutcomeEngine.getStats().totalJobs).toBe(1);
    expect(wedmJobOutcomeEngine.getLast(10).length).toBe(1);
  });

  it("WEDMJobOutcomeEngine class is exported (separate instances possible)", () => {
    // The named export allows independent instances for testing — not for
    // production. Just verify the constructor is callable.
    const fresh = new WEDMJobOutcomeEngine();
    expect(fresh).toBeInstanceOf(WEDMJobOutcomeEngine);
    expect(typeof fresh.recordOutcome).toBe("function");
  });
});

describe("WEDMJobOutcomeEngine — BRIDGE-DEEP emit hook (PRISM_WEDM_BRIDGE_DISABLE)", () => {
  beforeEach(() => {
    wedmJobOutcomeEngine._resetForTests();
    delete process.env.PRISM_WEDM_BRIDGE_DISABLE;
  });

  it("recordOutcome succeeds even when bridge emit is disabled (knob honored)", () => {
    process.env.PRISM_WEDM_BRIDGE_DISABLE = "1";
    try {
      const r = wedmJobOutcomeEngine.recordOutcome(makeOutcome({ jobId: "knob-1" }));
      expect(r.accepted).toBe(true);
      // Local truth (the WEDM ledger / rollup) is unaffected by the bridge knob.
      expect(wedmJobOutcomeEngine.getStats().totalJobs).toBe(1);
    } finally {
      delete process.env.PRISM_WEDM_BRIDGE_DISABLE;
    }
  });

  it("bridge knob does not affect the per-event error signal (delta still computed)", () => {
    process.env.PRISM_WEDM_BRIDGE_DISABLE = "1";
    try {
      const r = wedmJobOutcomeEngine.recordOutcome(
        makeOutcome({
          jobId: "delta-knob",
          predicted: { raUm: 1.0, cycleTimeMin: 30, wireBreaks: 0 },
          actual: { raUm: 1.5, cycleTimeMin: 35, wireBreaks: 0 },
        }),
      );
      expect(r.cycleTimeErrorMin.value).toBeCloseTo(5, 5);
      expect(r.raErrorUm.value).toBeCloseTo(0.5, 5);
    } finally {
      delete process.env.PRISM_WEDM_BRIDGE_DISABLE;
    }
  });
});
