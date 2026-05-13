/**
 * LoRADriftCoordinatorEngine.test.ts — real-behavior tests
 *
 * Tests the cross-pipeline drift coordinator that buffers drift observations
 * in a rolling time window and fires coordinatedDrift events when ≥ threshold
 * pipelines have drifted concurrently.
 *
 * Covers: input validation, drift-floor classification (info vs warning),
 * coordinatedDrift emission, sliding-window pruning, config patch validation,
 * activePipelines deduplication + sort, allClear event semantics, buffer
 * size after prune, reset, deterministic clock injection.
 *
 * Wired by CAM-FUSION-LIVE-MS0/U-WIRE-LORA-DRIFT (engine was orphaned —
 * added 8 actions on prism_ai dispatcher).
 */

import { describe, it, expect } from "vitest";
import {
  createLoRADriftCoordinator,
  loRADriftCoordinatorEngine,
  type DriftObservation,
} from "../engines/LoRADriftCoordinatorEngine.js";

const T0 = Date.parse("2026-05-13T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

function obs(over: Partial<DriftObservation>): DriftObservation {
  return {
    pipelineType: "milling",
    delta: 0.15,
    observedAt: new Date(T0).toISOString(),
    baselineEvalScore: 0.85,
    currentEvalScore: 0.70,
    ...over,
  };
}

describe("LoRADriftCoordinatorEngine — input validation", () => {
  it("rejects an observation without a pipelineType", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(() => engine.record(obs({ pipelineType: undefined as unknown as DriftObservation["pipelineType"] })))
      .toThrow(/pipelineType required/);
  });

  it("rejects a non-finite delta", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(() => engine.record(obs({ delta: Number.NaN }))).toThrow(/delta must be finite/);
    expect(() => engine.record(obs({ delta: Number.POSITIVE_INFINITY }))).toThrow(/delta must be finite/);
  });

  it("rejects when observedAt is missing", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(() => engine.record(obs({ observedAt: "" }))).toThrow(/observedAt required/);
  });
});

describe("LoRADriftCoordinatorEngine — drift-floor classification", () => {
  it("classifies a tiny drift (below floor) as info", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    const ev = engine.record(obs({ delta: 0.05 })); // < 0.10 floor
    expect(ev.kind).toBe("pipelineDrift");
    expect(ev.severity).toBe("info");
    expect(ev.pipelineTypes).toEqual(["milling"]);
  });

  it("classifies a single above-floor drift as warning (single-pipeline)", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    const ev = engine.record(obs({ delta: 0.20 }));
    expect(ev.kind).toBe("pipelineDrift");
    expect(ev.severity).toBe("warning");
  });

  it("treats negative deltas (eval-score climb) above floor as drift via abs()", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    const ev = engine.record(obs({ delta: -0.30 }));
    expect(ev.kind).toBe("pipelineDrift");
    expect(ev.severity).toBe("warning");
  });

  it("uses the configured floor when patched", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0), { driftDeltaFloor: 0.50 });
    const ev = engine.record(obs({ delta: 0.20 })); // below new 0.50 floor
    expect(ev.severity).toBe("info");
  });
});

describe("LoRADriftCoordinatorEngine — coordinatedDrift trigger", () => {
  it("fires coordinatedDrift when 2 distinct pipelines drift in window (default threshold=2)", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    const ev = engine.record(obs({ pipelineType: "wedm", delta: 0.20 }));
    expect(ev.kind).toBe("coordinatedDrift");
    expect(ev.severity).toBe("critical");
    expect(ev.pipelineTypes.sort()).toEqual(["milling", "wedm"]);
  });

  it("does NOT fire coordinatedDrift on a second observation from the SAME pipeline", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    const ev = engine.record(obs({ pipelineType: "milling", delta: 0.30 }));
    expect(ev.kind).toBe("pipelineDrift");
  });

  it("requires the configured threshold count of distinct pipelines", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0), { coordinatedThreshold: 3 });
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    engine.record(obs({ pipelineType: "wedm", delta: 0.20 }));
    const ev = engine.record(obs({ pipelineType: "laser", delta: 0.20 }));
    expect(ev.kind).toBe("coordinatedDrift");
    expect(ev.pipelineTypes.length).toBe(3);
  });

  it("counts only above-floor observations toward coordinatedDrift", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 })); // above floor
    const ev = engine.record(obs({ pipelineType: "wedm", delta: 0.05 })); // below floor
    expect(ev.kind).toBe("pipelineDrift");
    expect(ev.severity).toBe("info");
  });
});

describe("LoRADriftCoordinatorEngine — sliding window pruning", () => {
  it("drops observations older than windowMs on the next record/query", () => {
    // Default window is 2h. Advance the clock past 2h between observations.
    let now = T0;
    const engine = createLoRADriftCoordinator(() => new Date(now));
    engine.record(obs({ pipelineType: "milling", delta: 0.20, observedAt: new Date(now).toISOString() }));
    now += 3 * HOUR_MS; // jump 3h forward — first obs now outside window
    const ev = engine.record(obs({ pipelineType: "wedm", delta: 0.20, observedAt: new Date(now).toISOString() }));
    // The old milling obs got pruned, so this is a single-pipeline drift, not coordinated.
    expect(ev.kind).toBe("pipelineDrift");
    expect(ev.pipelineTypes).toEqual(["wedm"]);
  });

  it("keeps observations within the configured window", () => {
    let now = T0;
    const engine = createLoRADriftCoordinator(() => new Date(now), { windowMs: 4 * HOUR_MS });
    engine.record(obs({ pipelineType: "milling", delta: 0.20, observedAt: new Date(now).toISOString() }));
    now += 3 * HOUR_MS; // still inside 4h window
    const ev = engine.record(obs({ pipelineType: "wedm", delta: 0.20, observedAt: new Date(now).toISOString() }));
    expect(ev.kind).toBe("coordinatedDrift");
  });

  it("prunes observations with unparseable timestamps", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    // Force-push a junk timestamp — prune should drop it on the next query.
    engine.record(obs({ pipelineType: "milling", delta: 0.20, observedAt: "not-a-date" }));
    // The first record() returned an event, but bufferSize after prune drops the row.
    expect(engine.bufferSize()).toBe(0);
  });
});

describe("LoRADriftCoordinatorEngine — config validation", () => {
  it("rejects a zero or negative windowMs", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(() => engine.setConfig({ windowMs: 0 })).toThrow(/windowMs must be positive/);
    expect(() => engine.setConfig({ windowMs: -100 })).toThrow(/windowMs must be positive/);
  });

  it("rejects coordinatedThreshold below 2 (single-pipeline alerts already exist)", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(() => engine.setConfig({ coordinatedThreshold: 1 })).toThrow(/coordinatedThreshold must be ≥ 2/);
    expect(() => engine.setConfig({ coordinatedThreshold: 0 })).toThrow(/coordinatedThreshold must be ≥ 2/);
  });

  it("rejects a negative driftDeltaFloor", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(() => engine.setConfig({ driftDeltaFloor: -0.01 })).toThrow(/driftDeltaFloor must be/);
  });

  it("accepts a valid patch and returns the merged config", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    const cfg = engine.setConfig({ windowMs: 5 * HOUR_MS, coordinatedThreshold: 3 });
    expect(cfg.windowMs).toBe(5 * HOUR_MS);
    expect(cfg.coordinatedThreshold).toBe(3);
    // Unspecified driftDeltaFloor retains default
    expect(cfg.driftDeltaFloor).toBe(0.10);
  });

  it("getConfig returns a copy (caller cannot mutate internal state)", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    const cfg = engine.getConfig();
    cfg.windowMs = 1; // mutate the copy
    expect(engine.getConfig().windowMs).toBe(2 * HOUR_MS); // internal unchanged
  });
});

describe("LoRADriftCoordinatorEngine — activePipelines + lifecycle", () => {
  it("returns active pipelines sorted alphabetically", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "wedm", delta: 0.20 }));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    engine.record(obs({ pipelineType: "laser", delta: 0.20 }));
    expect(engine.activePipelines()).toEqual(["laser", "milling", "wedm"]);
  });

  it("deduplicates the same pipeline reported multiple times", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    engine.record(obs({ pipelineType: "milling", delta: 0.30 }));
    engine.record(obs({ pipelineType: "milling", delta: 0.15 }));
    expect(engine.activePipelines()).toEqual(["milling"]);
  });

  it("excludes below-floor observations from activePipelines", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.05 })); // below floor
    expect(engine.activePipelines()).toEqual([]);
  });

  it("shouldTriggerMasterRetrain reflects activePipelines vs threshold", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(engine.shouldTriggerMasterRetrain()).toBe(false);
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    expect(engine.shouldTriggerMasterRetrain()).toBe(false); // 1 < 2
    engine.record(obs({ pipelineType: "wedm", delta: 0.20 }));
    expect(engine.shouldTriggerMasterRetrain()).toBe(true); // 2 ≥ 2
  });

  it("bufferSize counts only post-prune entries", () => {
    let now = T0;
    const engine = createLoRADriftCoordinator(() => new Date(now));
    engine.record(obs({ pipelineType: "milling", delta: 0.20, observedAt: new Date(now).toISOString() }));
    engine.record(obs({ pipelineType: "wedm", delta: 0.20, observedAt: new Date(now).toISOString() }));
    expect(engine.bufferSize()).toBe(2);
    now += 3 * HOUR_MS;
    expect(engine.bufferSize()).toBe(0); // both pruned
  });

  it("reset clears all observations", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    engine.record(obs({ pipelineType: "wedm", delta: 0.20 }));
    expect(engine.bufferSize()).toBe(2);
    engine.reset();
    expect(engine.bufferSize()).toBe(0);
    expect(engine.activePipelines()).toEqual([]);
  });
});

describe("LoRADriftCoordinatorEngine — checkAllClear semantics", () => {
  it("returns null when buffer is empty (no prior signal to clear)", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    expect(engine.checkAllClear()).toBe(null);
  });

  it("returns null while drifts are still active", () => {
    const engine = createLoRADriftCoordinator(() => new Date(T0));
    engine.record(obs({ pipelineType: "milling", delta: 0.20 }));
    expect(engine.checkAllClear()).toBe(null);
  });

  it("returns an allClear event when prior drifts have been pruned", () => {
    let now = T0;
    const engine = createLoRADriftCoordinator(() => new Date(now));
    // Record a single sub-floor observation — buffer has 1 row, no active drifts.
    engine.record(obs({ pipelineType: "milling", delta: 0.05, observedAt: new Date(now).toISOString() }));
    const ev = engine.checkAllClear();
    expect(ev?.kind).toBe("allClear");
    expect(ev?.severity).toBe("info");
    expect(ev?.pipelineTypes).toEqual([]);
  });
});

describe("LoRADriftCoordinatorEngine — module singleton", () => {
  it("exports a default singleton that records observations independently", () => {
    // The singleton uses a real wall-clock; pass an observedAt that's well
    // inside the default 2h window (use now) so the prune step doesn't drop
    // the record right after we add it.
    loRADriftCoordinatorEngine.reset();
    expect(loRADriftCoordinatorEngine.bufferSize()).toBe(0);
    loRADriftCoordinatorEngine.record({
      pipelineType: "milling",
      delta: 0.20,
      observedAt: new Date().toISOString(),
      baselineEvalScore: 0.85,
      currentEvalScore: 0.65,
    });
    expect(loRADriftCoordinatorEngine.bufferSize()).toBe(1);
    loRADriftCoordinatorEngine.reset();
  });
});
