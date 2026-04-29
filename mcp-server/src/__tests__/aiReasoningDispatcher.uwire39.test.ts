/**
 * aiReasoningDispatcher U-WIRE39 round-trip tests — ActualVsPredictedCollectorEngine.
 *
 * Validates avp_record / avp_stats / avp_emit_batch / avp_trend through prism_ai.
 * Engine has clear() so beforeEach() guarantees fresh buffer state per test.
 *
 * Engine internals verified:
 *   - record() computes residuals = actual - predicted, drops NaN/Infinity
 *   - jm_die_proven=true → weight = 2.0 (config.proven_program_weight default)
 *   - Buffer evicts oldest at config.buffer_capacity (default 10000)
 *   - emitTrainingBatch returns null when buffer < min_batch_size (default 32)
 *   - getResidualStats: MAE, bias, RMSE, min/max — null when no observations
 *   - accuracyTrend: needs ≥10 observations, splits at midpoint, 2% noise band
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE39
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  actualVsPredictedCollectorEngine,
  type ObservationInput,
} from "../engines/ActualVsPredictedCollectorEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["avp_record", "avp_stats", "avp_emit_batch", "avp_trend"] as const;

/** Build a minimal valid observation. */
function obs(overrides: Partial<ObservationInput> = {}): ObservationInput {
  return {
    job_id: "JOB-1",
    context: { material: "steel" },
    targets: { cutting_force_n: { predicted: 100, actual: 110 } },
    ...overrides,
  };
}

describe("U-WIRE39 — engine direct: ActualVsPredictedCollectorEngine", () => {
  beforeEach(() => {
    actualVsPredictedCollectorEngine.clear();
  });

  it("record computes residual = actual - predicted and stores it on the example", () => {
    const ex = actualVsPredictedCollectorEngine.record(
      obs({ targets: { cutting_force_n: { predicted: 100, actual: 110 } } }),
    );
    expect(ex.residuals.cutting_force_n).toBe(10);
    expect(ex.predictions.cutting_force_n).toBe(100);
    expect(ex.labels.cutting_force_n).toBe(110);
  });

  it("record default weight is 1.0; jm_die_proven=true bumps to 2.0", () => {
    const a = actualVsPredictedCollectorEngine.record(obs());
    const b = actualVsPredictedCollectorEngine.record(obs({ jm_die_proven: true, job_id: "JOB-2" }));
    expect(a.weight).toBe(1.0);
    expect(b.weight).toBe(2.0);
    expect(a.jm_die_proven).toBe(false);
    expect(b.jm_die_proven).toBe(true);
  });

  it("record auto-generates observation_id with 'obs-' prefix when omitted", () => {
    const ex = actualVsPredictedCollectorEngine.record(obs());
    expect(ex.observation_id.startsWith("obs-")).toBe(true);
    expect(ex.observation_id.length).toBeGreaterThan(4);
  });

  it("record auto-generates ISO timestamp when omitted; round-trips through Date", () => {
    const ex = actualVsPredictedCollectorEngine.record(obs());
    expect(new Date(ex.timestamp).toISOString()).toBe(ex.timestamp);
  });

  it("record drops NaN/Infinity target pairs but keeps valid ones in same observation", () => {
    const ex = actualVsPredictedCollectorEngine.record(
      obs({
        targets: {
          cutting_force_n: { predicted: 100, actual: 110 },
          power_kw: { predicted: NaN, actual: 5 },
          surface_finish_um: { predicted: 1.6, actual: Infinity },
          temperature_c: { predicted: 200, actual: 195 },
        },
      }),
    );
    expect(ex.residuals.cutting_force_n).toBe(10);
    expect(ex.residuals.temperature_c).toBe(-5);
    expect(ex.residuals.power_kw).toBe(undefined);
    expect(ex.residuals.surface_finish_um).toBe(undefined);
  });

  it("record throws on observation with no valid target pairs (all NaN/Infinity)", () => {
    expect(() =>
      actualVsPredictedCollectorEngine.record(
        obs({
          targets: {
            cutting_force_n: { predicted: NaN, actual: 110 },
            power_kw: { predicted: 5, actual: Infinity },
          },
        }),
      ),
    ).toThrowError(/no valid target pairs/);
  });

  it("record throws on missing context", () => {
    expect(() =>
      actualVsPredictedCollectorEngine.record({
        job_id: "X",
        targets: { cutting_force_n: { predicted: 1, actual: 2 } },
      } as unknown as ObservationInput),
    ).toThrowError(/context and targets/);
  });

  it("getResidualStats returns null when no observations recorded for the target", () => {
    const stats = actualVsPredictedCollectorEngine.getResidualStats("power_kw");
    expect(stats).toBe(null);
  });

  it("getResidualStats: 4 known residuals → MAE/bias/RMSE all match closed-form math", () => {
    // Residuals: 10, -10, 5, -5  →  MAE=7.5, bias=0, RMSE=sqrt(250/4)=7.905694...
    actualVsPredictedCollectorEngine.record(obs({ targets: { cutting_force_n: { predicted: 100, actual: 110 } } }));
    actualVsPredictedCollectorEngine.record(obs({ job_id: "J2", targets: { cutting_force_n: { predicted: 100, actual: 90 } } }));
    actualVsPredictedCollectorEngine.record(obs({ job_id: "J3", targets: { cutting_force_n: { predicted: 100, actual: 105 } } }));
    actualVsPredictedCollectorEngine.record(obs({ job_id: "J4", targets: { cutting_force_n: { predicted: 100, actual: 95 } } }));
    const s = actualVsPredictedCollectorEngine.getResidualStats("cutting_force_n");
    if (!s) throw new Error("stats unexpectedly null");
    expect(s.n).toBe(4);
    expect(s.mae).toBeCloseTo(7.5, 5);
    expect(s.bias).toBeCloseTo(0, 5);
    expect(s.rmse).toBeCloseTo(Math.sqrt(250 / 4), 5);
    expect(s.min_residual).toBe(-10);
    expect(s.max_residual).toBe(10);
  });

  it("getAllResidualStats returns one entry per target with observations; skips empty targets", () => {
    actualVsPredictedCollectorEngine.record(obs({ targets: { cutting_force_n: { predicted: 100, actual: 110 } } }));
    actualVsPredictedCollectorEngine.record(obs({ job_id: "J2", targets: { power_kw: { predicted: 5, actual: 5.2 } } }));
    const all = actualVsPredictedCollectorEngine.getAllResidualStats();
    const targets = all.map((s) => s.target).sort();
    expect(targets).toEqual(["cutting_force_n", "power_kw"]);
    for (const s of all) expect(s.n).toBeGreaterThan(0);
  });

  it("emitTrainingBatch returns null when buffer < min_batch_size", () => {
    actualVsPredictedCollectorEngine.record(obs());
    expect(actualVsPredictedCollectorEngine.emitTrainingBatch()).toBe(null);
  });

  it("emitTrainingBatch returns batch with stats + total_weight + coverage when ready", () => {
    // Default min_batch_size = 32 — record 32 observations
    const cfg = actualVsPredictedCollectorEngine.getConfig();
    for (let i = 0; i < cfg.min_batch_size; i++) {
      actualVsPredictedCollectorEngine.record(obs({
        job_id: `J${i}`,
        jm_die_proven: i < 5, // first 5 are proven (weight 2.0)
        targets: { cutting_force_n: { predicted: 100 + i, actual: 110 + i } },
      }));
    }
    const batch = actualVsPredictedCollectorEngine.emitTrainingBatch();
    if (!batch) throw new Error("batch unexpectedly null at min_batch_size");
    expect(batch.batch_id.startsWith("batch-")).toBe(true);
    expect(batch.examples.length).toBe(cfg.min_batch_size);
    // 5 proven (×2.0) + 27 default (×1.0) = 5*2 + 27 = 37
    expect(batch.total_weight).toBeCloseTo(37, 4);
    expect(batch.jm_die_proven_count).toBe(5);
    expect(batch.coverage).toEqual(["cutting_force_n"]);
    expect(batch.per_target_stats.length).toBeGreaterThan(0);
  });

  it("accuracyTrend returns 'insufficient_data' for < 10 observations", () => {
    for (let i = 0; i < 5; i++) {
      actualVsPredictedCollectorEngine.record(obs({ job_id: `J${i}` }));
    }
    const t = actualVsPredictedCollectorEngine.accuracyTrend("cutting_force_n");
    expect(t.trend).toBe("insufficient_data");
    expect(t.n).toBe(5);
  });

  it("accuracyTrend detects 'improving' when residuals shrink in second half", () => {
    // First 10 large residuals (RMSE ~10), next 10 small (RMSE ~1) → improving
    for (let i = 0; i < 10; i++) {
      actualVsPredictedCollectorEngine.record(obs({ job_id: `J${i}`, targets: { cutting_force_n: { predicted: 100, actual: 110 } } }));
    }
    for (let i = 10; i < 20; i++) {
      actualVsPredictedCollectorEngine.record(obs({ job_id: `J${i}`, targets: { cutting_force_n: { predicted: 100, actual: 101 } } }));
    }
    const t = actualVsPredictedCollectorEngine.accuracyTrend("cutting_force_n");
    expect(t.trend).toBe("improving");
    expect(t.first_half_rmse).toBeGreaterThan(t.second_half_rmse);
    expect(t.improvement_delta).toBeGreaterThan(0);
  });

  it("accuracyTrend detects 'degrading' when residuals grow in second half", () => {
    for (let i = 0; i < 10; i++) {
      actualVsPredictedCollectorEngine.record(obs({ job_id: `J${i}`, targets: { cutting_force_n: { predicted: 100, actual: 101 } } }));
    }
    for (let i = 10; i < 20; i++) {
      actualVsPredictedCollectorEngine.record(obs({ job_id: `J${i}`, targets: { cutting_force_n: { predicted: 100, actual: 110 } } }));
    }
    const t = actualVsPredictedCollectorEngine.accuracyTrend("cutting_force_n");
    expect(t.trend).toBe("degrading");
    expect(t.improvement_delta).toBeLessThan(0);
  });

  it("size getter reflects the number of recorded examples", () => {
    expect(actualVsPredictedCollectorEngine.size).toBe(0);
    actualVsPredictedCollectorEngine.record(obs());
    actualVsPredictedCollectorEngine.record(obs({ job_id: "J2" }));
    expect(actualVsPredictedCollectorEngine.size).toBe(2);
  });
});

describe("U-WIRE39 — schema integrity", () => {
  it("all 4 avp_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of NEW_ACTIONS) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of NEW_ACTIONS) {
      const schema = map[a];
      expect(schema === null || schema === undefined).toBe(false);
      expect(typeof (schema as { safeParse?: unknown }).safeParse).toBe("function");
    }
  });

  it("avp_record requires job_id + context.material + ≥1 targets entry", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.avp_record.safeParse({}).success).toBe(false);
    // Missing context
    expect(
      map.avp_record.safeParse({ job_id: "X", targets: { cutting_force_n: { predicted: 1, actual: 2 } } }).success,
    ).toBe(false);
    // Empty context.material
    expect(
      map.avp_record.safeParse({
        job_id: "X",
        context: { material: "" },
        targets: { cutting_force_n: { predicted: 1, actual: 2 } },
      }).success,
    ).toBe(false);
    // Valid
    expect(
      map.avp_record.safeParse({
        job_id: "X",
        context: { material: "steel" },
        targets: { cutting_force_n: { predicted: 1, actual: 2 } },
      }).success,
    ).toBe(true);
  });

  it("avp_record rejects unknown NeuralTarget keys in targets", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.avp_record.safeParse({
        job_id: "X",
        context: { material: "steel" },
        targets: { not_a_real_target: { predicted: 1, actual: 2 } },
      }).success,
    ).toBe(false);
  });

  it("avp_record rejects target pair missing predicted or actual", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.avp_record.safeParse({
        job_id: "X",
        context: { material: "steel" },
        targets: { cutting_force_n: { predicted: 1 } },
      }).success,
    ).toBe(false);
  });

  it("avp_record rejects iso_group outside the 6-letter enum", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.avp_record.safeParse({
        job_id: "X",
        context: { material: "steel", iso_group: "Z" },
        targets: { cutting_force_n: { predicted: 1, actual: 2 } },
      }).success,
    ).toBe(false);
  });

  it("avp_trend requires target enum value", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.avp_trend.safeParse({}).success).toBe(false);
    expect(map.avp_trend.safeParse({ target: "made_up" }).success).toBe(false);
    expect(map.avp_trend.safeParse({ target: "cutting_force_n" }).success).toBe(true);
  });

  it("avp_stats and avp_emit_batch accept empty params", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.avp_stats.safeParse({}).success).toBe(true);
    expect(map.avp_emit_batch.safeParse({}).success).toBe(true);
  });
});

describe("U-WIRE39 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    actualVsPredictedCollectorEngine.clear();
  });

  it("avp_record happy path returns recorded:true with example + buffer_size", async () => {
    const r = await executeAIReasoningAction("avp_record" as AIReasoningAction, {
      job_id: "J1",
      context: { material: "steel" },
      targets: { cutting_force_n: { predicted: 100, actual: 115 } },
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      recorded?: boolean;
      example?: { residuals?: { cutting_force_n?: number }; weight?: number };
      buffer_size?: number;
    };
    expect(data.recorded).toBe(true);
    expect(data.example?.residuals?.cutting_force_n).toBe(15);
    expect(data.example?.weight).toBe(1.0);
    expect(data.buffer_size).toBe(1);
  });

  it("avp_record on engine throw (all-NaN targets) returns recorded:false with error", async () => {
    const r = await executeAIReasoningAction("avp_record" as AIReasoningAction, {
      job_id: "J1",
      context: { material: "steel" },
      // Schema accepts numeric NaN (z.number() doesn't reject NaN by default in this Zod version);
      // engine drops them and throws "no valid target pairs".
      targets: { cutting_force_n: { predicted: 1e308 * 10, actual: 1e308 * 10 } },
    } as Record<string, unknown>);
    // Two valid acceptable outcomes: (a) schema rejects → success:false, or
    // (b) schema accepts but engine throws → recorded:false with error.
    if (r.success === true) {
      const data = r.data as { recorded?: boolean; error?: string };
      expect(data.recorded).toBe(false);
      expect((data.error ?? "").length).toBeGreaterThan(0);
    } else {
      expect((r.error ?? "").length).toBeGreaterThan(0);
    }
  });

  it("avp_stats happy path on empty buffer returns empty stats + targets_covered=0", async () => {
    const r = await executeAIReasoningAction("avp_stats" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { stats?: unknown[]; targets_covered?: number; buffer_size?: number };
    // The response-slim layer strips empty arrays to undefined; both
    // representations encode "no observations recorded yet".
    const noStats = data.stats === undefined || (Array.isArray(data.stats) && data.stats.length === 0);
    expect(noStats).toBe(true);
    // targets_covered=0 may also be slim-stripped → 0 OR undefined acceptable.
    expect(data.targets_covered === 0 || data.targets_covered === undefined).toBe(true);
    expect(data.buffer_size === 0 || data.buffer_size === undefined).toBe(true);
  });

  it("avp_stats after 3 records returns stats[0] with n=3 + correct MAE", async () => {
    // Residuals: +5, +10, +15 → MAE=10, bias=10
    for (const actual of [105, 110, 115]) {
      await executeAIReasoningAction("avp_record" as AIReasoningAction, {
        job_id: `J${actual}`,
        context: { material: "steel" },
        targets: { cutting_force_n: { predicted: 100, actual } },
      });
    }
    const r = await executeAIReasoningAction("avp_stats" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { stats?: Array<{ target?: string; n?: number; mae?: number; bias?: number }> };
    const s = (data.stats ?? [])[0];
    if (!s) throw new Error("stats[0] missing");
    expect(s.target).toBe("cutting_force_n");
    expect(s.n).toBe(3);
    expect(s.mae).toBeCloseTo(10, 5);
    expect(s.bias).toBeCloseTo(10, 5);
  });

  it("avp_emit_batch on small buffer returns ready:false with reason naming threshold", async () => {
    await executeAIReasoningAction("avp_record" as AIReasoningAction, {
      job_id: "J1",
      context: { material: "steel" },
      targets: { cutting_force_n: { predicted: 100, actual: 110 } },
    });
    const r = await executeAIReasoningAction("avp_emit_batch" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { ready?: boolean; reason?: string; min_batch_size?: number; buffer_size?: number };
    expect(data.ready).toBe(false);
    expect(data.min_batch_size).toBe(32); // engine default
    expect(data.buffer_size).toBe(1);
    expect((data.reason ?? "")).toContain("32");
  });

  it("avp_trend with insufficient data returns trend:'insufficient_data'", async () => {
    for (let i = 0; i < 5; i++) {
      await executeAIReasoningAction("avp_record" as AIReasoningAction, {
        job_id: `J${i}`,
        context: { material: "steel" },
        targets: { cutting_force_n: { predicted: 100, actual: 110 } },
      });
    }
    const r = await executeAIReasoningAction("avp_trend" as AIReasoningAction, { target: "cutting_force_n" });
    expect(r.success).toBe(true);
    const data = r.data as { trend?: string; n?: number };
    expect(data.trend).toBe("insufficient_data");
    expect(data.n).toBe(5);
  });

  it("avp_record FAIL: missing job_id → schema rejects", async () => {
    const bad: Record<string, unknown> = {
      context: { material: "steel" },
      targets: { cutting_force_n: { predicted: 1, actual: 2 } },
    };
    const r = await executeAIReasoningAction("avp_record" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("avp_record FAIL: empty job_id rejected by min(1)", async () => {
    const bad: Record<string, unknown> = {
      job_id: "",
      context: { material: "steel" },
      targets: { cutting_force_n: { predicted: 1, actual: 2 } },
    };
    const r = await executeAIReasoningAction("avp_record" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("avp_trend FAIL: missing target → schema rejects", async () => {
    const r = await executeAIReasoningAction("avp_trend" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("avp_trend FAIL: invalid target enum value → schema rejects", async () => {
    const r = await executeAIReasoningAction("avp_trend" as AIReasoningAction, { target: "not_real" });
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("U-WIRE39 — singleton continuity", () => {
  it("actualVsPredictedCollectorEngine singleton is the same object across re-imports", async () => {
    const mod = await import("../engines/ActualVsPredictedCollectorEngine.js");
    expect(mod.actualVsPredictedCollectorEngine).toBe(actualVsPredictedCollectorEngine);
  });
});
