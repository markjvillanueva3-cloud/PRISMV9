/**
 * WEDM Perception Hooks Tests — WEDM AGI Phase 1 / P1-MS1
 *
 * Covers U-P1-04 (wedm_sensor_anomaly) and U-P1-05 (wedm_twin_sync).
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { HookContext, HookResult } from "../../engines/HookExecutor.js";
import {
  wedmSensorAnomaly,
  wedmTwinSync,
  wedmPerceptionHooks,
  _resetAnomalyCounters,
} from "../../hooks/WEDMPerceptionHooks.js";
import {
  allHooks,
  hookCounts,
} from "../../hooks/index.js";
import {
  WEDMKalmanFusionEngine,
} from "../../engines/WEDMKalmanFusionEngine.js";
import {
  WEDMVirtualMachineEngine,
  wedmVirtualMachineEngine,
} from "../../engines/WEDMVirtualMachineEngine.js";
import type { WEDMMachineState } from "../../engines/WEDMMachineStateEngine.js";

function runHook(
  hook: { handler: (ctx: HookContext) => Promise<HookResult> | HookResult },
  ctx: Partial<HookContext>,
): HookResult {
  const full: HookContext = {
    operation: "test",
    phase: "post-tool",
    timestamp: new Date(),
    ...ctx,
  };
  const r = hook.handler(full);
  if (r instanceof Promise) throw new Error("Async hooks not expected here");
  return r;
}

function mkMachine(overrides: Partial<WEDMMachineState> = {}): WEDMMachineState {
  return {
    t_ms: 0,
    mode: "cutting",
    modeConfidence: 0.9,
    healthScore: 1.0,
    channels: {
      gap_voltage: null,
      discharge_current: null,
      wire_tension: null,
      flush_pressure: null,
      bath_temperature: null,
      spark_frequency: null,
    },
    position_mm: { x: 0, y: 0, u: 0, v: 0, z: 0 },
    activeAlarmBits: 0,
    activeWarnings: [],
    latencyMs: 0,
    ...overrides,
  };
}

describe("WEDM Perception Hooks — registration & shape", () => {
  it("exports exactly 2 perception hooks", () => {
    expect(wedmPerceptionHooks.length).toBe(2);
  });

  it("both hooks carry required HookDefinition fields", () => {
    for (const h of wedmPerceptionHooks) {
      expect(h.id).toMatch(/^wedm-/);
      expect(typeof h.handler).toBe("function");
      expect(h.phase).toBe("post-tool");
      expect(h.enabled).toBe(true);
      expect(h.tags).toContain("wedm");
      expect(h.tags).toContain("perception");
    }
  });

  it("perception hooks are wired into the global allHooks array", () => {
    const ids = new Set(allHooks.map((h) => h.id));
    expect(ids.has("wedm-sensor-anomaly")).toBe(true);
    expect(ids.has("wedm-twin-sync")).toBe(true);
  });

  it("hookCounts reports wedmPerception = 2", () => {
    expect((hookCounts as any).wedmPerception).toBe(2);
  });

  it("hook IDs are globally unique", () => {
    const count = allHooks.filter(
      (h) => h.id === "wedm-sensor-anomaly" || h.id === "wedm-twin-sync",
    ).length;
    expect(count).toBe(2);
  });
});

describe("wedm_sensor_anomaly — action gating + baseline", () => {
  beforeEach(() => _resetAnomalyCounters());

  it("skips when action is not a WEDM perception action", () => {
    const r = runHook(wedmSensorAnomaly, {
      target: { type: "calculation", action: "lathe_program", data: {} } as any,
    });
    expect(r.success).toBe(true);
    expect((r.data as any)?.skipped).toBe(true);
  });

  it("skips when payload has no fused state", () => {
    const r = runHook(wedmSensorAnomaly, {
      target: { type: "calculation", action: "wedm_fuse_sensors", data: {} } as any,
    });
    expect((r.data as any)?.skipped).toBe(true);
  });

  it("returns success for quiet fused channels", () => {
    const eng = new WEDMKalmanFusionEngine();
    eng.fuse({ t_ms: 0, gap_voltage_V: 80 });
    eng.fuse({ t_ms: 10, gap_voltage_V: 80.1 });
    const fused = eng.snapshot();
    const r = runHook(wedmSensorAnomaly, {
      target: { type: "calculation", action: "wedm_fuse_sensors", data: { fused } } as any,
    });
    expect(r.success).toBe(true);
    expect(r.message).toMatch(/within/i);
  });
});

describe("wedm_sensor_anomaly — Nelson rule (3σ × 3 consecutive)", () => {
  beforeEach(() => _resetAnomalyCounters());

  it("emits a transient warning on a single out-of-bounds frame", () => {
    const eng = new WEDMKalmanFusionEngine();
    // Prime the filter with stable baseline
    for (let i = 0; i < 5; i++) eng.fuse({ t_ms: i * 10, discharge_current_A: 10 });
    // Then inject one large spike
    const fused = eng.fuse({ t_ms: 100, discharge_current_A: 80 });
    const r = runHook(wedmSensorAnomaly, {
      target: { type: "calculation", action: "wedm_fuse_sensors", data: { fused } } as any,
    });
    expect(r.success).toBe(true);
    expect(r.warnings ?? (r.data as any)?.warnings).toBeDefined();
    expect(r.message).toMatch(/anomaly|> 3σ/);
  });

  it("escalates when anomalies persist for ≥3 consecutive frames", () => {
    const eng = new WEDMKalmanFusionEngine();
    for (let i = 0; i < 5; i++) eng.fuse({ t_ms: i * 10, gap_voltage_V: 80 });

    let last: HookResult | null = null;
    for (let i = 0; i < 3; i++) {
      const fused = eng.fuse({ t_ms: 100 + i * 10, gap_voltage_V: 160 });
      last = runHook(wedmSensorAnomaly, {
        session: { id: "s1", startTime: new Date(), toolCalls: 0, checkpoints: 0 },
        target: { type: "calculation", action: "wedm_fuse_sensors", data: { fused } } as any,
      });
    }
    expect(last!.message).toMatch(/Persistent/);
    expect((last!.data as any)?.persisted?.length).toBeGreaterThan(0);
  });

  it("resets the counter when the channel returns within bounds", () => {
    const eng = new WEDMKalmanFusionEngine();
    for (let i = 0; i < 5; i++) eng.fuse({ t_ms: i * 10, gap_voltage_V: 80 });

    // Two bad frames — not yet persistent
    for (let i = 0; i < 2; i++) {
      const bad = eng.fuse({ t_ms: 100 + i * 10, gap_voltage_V: 160 });
      runHook(wedmSensorAnomaly, {
        session: { id: "recovery", startTime: new Date(), toolCalls: 0, checkpoints: 0 },
        target: { type: "calculation", action: "wedm_fuse_sensors", data: { fused: bad } } as any,
      });
    }
    // Feed a run of baseline frames so the filter settles and produces
    // low-innovation (non-anomalous) updates.
    let last: HookResult | null = null;
    for (let i = 0; i < 20; i++) {
      const recovered = eng.fuse({ t_ms: 130 + i * 10, gap_voltage_V: 80 });
      last = runHook(wedmSensorAnomaly, {
        session: { id: "recovery", startTime: new Date(), toolCalls: 0, checkpoints: 0 },
        target: {
          type: "calculation",
          action: "wedm_fuse_sensors",
          data: { fused: recovered },
        } as any,
      });
    }
    // After convergence, hook reports within-bounds on the final frame.
    expect(last!.message).toMatch(/within/i);
  });

  it("counters are session-scoped (do not cross-contaminate)", () => {
    const eng1 = new WEDMKalmanFusionEngine();
    const eng2 = new WEDMKalmanFusionEngine();
    for (let i = 0; i < 5; i++) {
      eng1.fuse({ t_ms: i * 10, gap_voltage_V: 80 });
      eng2.fuse({ t_ms: i * 10, gap_voltage_V: 80 });
    }
    // 2 bad frames on session A
    for (let i = 0; i < 2; i++) {
      const fA = eng1.fuse({ t_ms: 100 + i * 10, gap_voltage_V: 160 });
      runHook(wedmSensorAnomaly, {
        session: { id: "A", startTime: new Date(), toolCalls: 0, checkpoints: 0 },
        target: { type: "calculation", action: "wedm_fuse_sensors", data: { fused: fA } } as any,
      });
    }
    // First bad frame on session B — must NOT trigger "persistent"
    const fB = eng2.fuse({ t_ms: 100, gap_voltage_V: 160 });
    const r = runHook(wedmSensorAnomaly, {
      session: { id: "B", startTime: new Date(), toolCalls: 0, checkpoints: 0 },
      target: { type: "calculation", action: "wedm_fuse_sensors", data: { fused: fB } } as any,
    });
    expect(r.message).not.toMatch(/Persistent/);
  });
});

describe("wedm_twin_sync — trigger + drift warning", () => {
  beforeEach(() => wedmVirtualMachineEngine.reset());

  it("skips when action is not a machine-state action", () => {
    const r = runHook(wedmTwinSync, {
      target: { type: "calculation", action: "cam_post_process", data: {} } as any,
    });
    expect((r.data as any)?.skipped).toBe(true);
  });

  it("skips when payload lacks a machine state", () => {
    const r = runHook(wedmTwinSync, {
      target: { type: "calculation", action: "wedm_machine_state_ingest", data: {} } as any,
    });
    expect((r.data as any)?.skipped).toBe(true);
  });

  it("invokes the twin sync and returns twin_t_ms on success", () => {
    const machine = mkMachine({ t_ms: 100, position_mm: { x: 1, y: 2, u: 0, v: 0, z: 0 } });
    const r = runHook(wedmTwinSync, {
      target: {
        type: "calculation",
        action: "wedm_machine_state_ingest",
        data: { machineState: machine },
      } as any,
    });
    expect(r.success).toBe(true);
    expect((r.data as any)?.twin_t_ms).toBe(100);
    expect(wedmVirtualMachineEngine.getState()?.t_ms).toBe(100);
  });

  it("warns when position drift ≥ 1 mm against the prior twin state", () => {
    // Seed the global twin at (0,0,0)
    wedmVirtualMachineEngine.sync(mkMachine({ t_ms: 0 }));
    const driftedPhysical = mkMachine({
      t_ms: 5,
      position_mm: { x: 1.5, y: 0, u: 0, v: 0, z: 0 },
    });
    const r = runHook(wedmTwinSync, {
      target: {
        type: "calculation",
        action: "wedm_machine_state_ingest",
        data: { machineState: driftedPhysical },
      } as any,
    });
    expect(r.success).toBe(true);
    expect(r.message).toMatch(/drift/i);
    expect((r.data as any)?.discrepancy?.withinBudget).toBe(false);
  });

  it("exit-gate: sync latency reported by twin stays under 10 ms", () => {
    const machine = mkMachine({ t_ms: 200 });
    const r = runHook(wedmTwinSync, {
      target: {
        type: "calculation",
        action: "wedm_machine_state_ingest",
        data: { machineState: machine },
      } as any,
    });
    const latency = (r.data as any)?.syncLatencyMs ?? 0;
    expect(latency).toBeLessThanOrEqual(10);
  });

  it("accepts payload keyed as `state` instead of `machineState`", () => {
    const machine = mkMachine({ t_ms: 42 });
    const r = runHook(wedmTwinSync, {
      target: {
        type: "calculation",
        action: "wedm_machine_state_ingest",
        data: { state: machine },
      } as any,
    });
    expect((r.data as any)?.twin_t_ms).toBe(42);
  });
});
