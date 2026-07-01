/**
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1 — wire test (slot:alpha, 2026-05-22)
 *
 * Round-trips 6 actions through millDispatcher's prism_mill tool, surfacing
 * 2 previously-unwired 5-axis LoRA closed-loop engines:
 *
 *   FiveAxisLoRADatasetBuilderEngine → mill_5axis_lora_build_dataset,
 *                                      mill_5axis_lora_required_schema
 *   FiveAxisLoRACadenceEngine        → mill_5axis_lora_cadence_state,
 *                                      mill_5axis_lora_cadence_config,
 *                                      mill_5axis_lora_cadence_should_run,
 *                                      mill_5axis_lora_cadence_check_drift
 *
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs):
 *   - required schema features = 6 keys incl. tilt_deg + tcpc_enabled;
 *     actuals = ["surface_ra_um"] (5-axis domain adds the two extra axes).
 *   - 5-axis cadence config defaults: interval="weekly", minNewJobs=10,
 *     driftThreshold=0.12, performanceThreshold=60, maxVersions=6 — looser
 *     than milling because 5-axis job volume is ~10% of milling at JM Die.
 *   - singularity weighting: a job at tilt=90° (gimbal-lock) is up-weighted
 *     to weight>=2.0 and tagged "near-singularity" so the adapter sees the
 *     rare regime more often.
 *   - checkDrift delta = (baseline - current)/baseline; drifted iff
 *     delta > 0.12. checkDrift(50,80) → delta 0.375 → drifted. checkDrift(80,80)
 *     → delta 0 → not drifted. baseline 0 → divide-by-zero guard → not drifted.
 *
 * Each test invokes through the dispatcher handler, not the engine singleton —
 * verifies action-enum entry + Zod schema + case dispatch end-to-end.
 *
 * Pattern mirrors businessDispatcher.bridge-wire-business.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MILL_ACTIONS,
  MILL_DISPATCHER_ACTION_COUNT,
  registerMillDispatcher,
} from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const FIVEAXIS_LORA_ACTIONS = [
  "mill_5axis_lora_build_dataset",
  "mill_5axis_lora_required_schema",
  "mill_5axis_lora_cadence_state",
  "mill_5axis_lora_cadence_config",
  "mill_5axis_lora_cadence_should_run",
  "mill_5axis_lora_cadence_check_drift",
] as const;

interface ToolCall {
  action: string;
  params?: Record<string, unknown>;
}

let handler:
  | ((args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: unknown,
      fn: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>,
    ) => {
      if (_name === "prism_mill") handler = fn;
    },
  };
  // registerMillDispatcher's `server` parameter is typed `any` — no cast needed.
  registerMillDispatcher(fakeServer);
  if (!handler) throw new Error("millDispatcher did not register prism_mill tool");
});

/** Invoke the dispatcher handler and normalize the (slimResponse) reply shape. */
async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r: any = await handler(c);
  // Shape A: { content: [{ type: "text", text: "<json>" }] }
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape B: { type: "text", text: "<json>" }
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape C: plain object
  if (r && typeof r === "object") {
    const success = !r.error && r.success !== false && !r.isError;
    return { raw: r, success, error: r.error };
  }
  return { raw: r, success: true };
}

/** Extract the inner result payload regardless of slim wrapping. */
function payload(raw: any): any {
  if (raw && typeof raw === "object") {
    if (raw.result !== undefined) return raw.result;
    if (raw.data !== undefined) return raw.data;
  }
  return raw;
}

/** A schema-valid RawJob for the 5-axis LoRA dataset builder. */
function rawJob(
  id: string,
  tiltDeg: number,
  ra: number,
  opts: { tcpc?: boolean; material?: string } = {},
): Record<string, unknown> {
  const material = opts.material ?? "Ti-6Al-4V";
  return {
    id,
    fingerprint: { material, tilt_bucket_seed: tiltDeg },
    features: {
      material,
      tool_class: "ballnose",
      op_type: "finish",
      machine_class: "5axis-trunnion",
      tilt_deg: tiltDeg,
      tcpc_enabled: opts.tcpc ?? true,
    },
    actual: { surface_ra_um: ra },
  };
}

describe("U-BRIDGE-WIRE-MILL iter-1 — FiveAxis LoRA pair wired into millDispatcher", () => {
  describe("action enum + schema registration", () => {
    it("registers all 6 actions in MILL_ACTIONS enum", () => {
      for (const action of FIVEAXIS_LORA_ACTIONS) {
        expect(MILL_ACTIONS).toContain(action);
      }
    });

    it("registers all 6 actions in MILL_ACTION_SCHEMAS map", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      for (const action of FIVEAXIS_LORA_ACTIONS) {
        expect(schemaKeys.has(action)).toBe(true);
      }
    });

    it("all 6 actions use the mill_5axis_lora_ snake_case prefix", () => {
      for (const action of FIVEAXIS_LORA_ACTIONS) {
        expect(action.startsWith("mill_5axis_lora_")).toBe(true);
        expect(action).toMatch(/^[a-z0-9_]+$/); // '5' in 5axis is allowed
      }
    });

    it("anti-regression: action count is at least 121 (95 pre-iter-1 + 20 uai + 6 here)", () => {
      expect(MILL_DISPATCHER_ACTION_COUNT).toBeGreaterThanOrEqual(121);
    });

    it("no duplicate actions after the iter-1 additions", () => {
      expect(new Set(MILL_ACTIONS).size).toBe(MILL_ACTIONS.length);
    });
  });

  describe("dispatcher round-trip — mill_5axis_lora_required_schema", () => {
    it("returns the 6-key 5-axis feature schema with tilt_deg + tcpc_enabled", async () => {
      const r = await call({ action: "mill_5axis_lora_required_schema", params: {} });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(Array.isArray(p.features)).toBe(true);
      expect(p.features).toHaveLength(6);
      expect(p.features).toContain("tilt_deg");
      expect(p.features).toContain("tcpc_enabled");
      expect(p.actuals).toEqual(["surface_ra_um"]);
    });
  });

  describe("dispatcher round-trip — mill_5axis_lora_cadence_config", () => {
    it("returns the weekly 5-axis cadence defaults", async () => {
      const r = await call({ action: "mill_5axis_lora_cadence_config", params: {} });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.interval).toBe("weekly");
      expect(p.minNewJobs).toBe(10);
      expect(p.driftThreshold).toBeCloseTo(0.12, 5);
      expect(p.performanceThreshold).toBe(60);
      expect(p.maxVersions).toBe(6);
    });
  });

  describe("dispatcher round-trip — mill_5axis_lora_cadence_state", () => {
    it("returns a fresh cadence state nesting the weekly config", async () => {
      const r = await call({ action: "mill_5axis_lora_cadence_state", params: {} });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      // CadenceState nests the full config; the empty runs/versions arrays
      // are dropped by slimResponse, so assert on the populated fields only.
      expect(p.config.interval).toBe("weekly");
      expect(p.config.minNewJobs).toBe(10);
      expect(typeof p.jobsSinceLastRun).toBe("number");
      expect(p.jobsSinceLastRun).toBe(0);
    });
  });

  describe("dispatcher round-trip — mill_5axis_lora_cadence_should_run", () => {
    it("a fresh cadence (0 new jobs) should NOT trigger a run (minNewJobs=10 gate)", async () => {
      const r = await call({ action: "mill_5axis_lora_cadence_should_run", params: {} });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(typeof p.should).toBe("boolean");
      expect(p.should).toBe(false);
      expect(typeof p.details).toBe("string");
      expect(p.details).toMatch(/0\/10|new jobs/);
    });
  });

  describe("dispatcher round-trip — mill_5axis_lora_cadence_check_drift", () => {
    it("flags drift when current score drops well below baseline (delta > 0.12)", async () => {
      const r = await call({
        action: "mill_5axis_lora_cadence_check_drift",
        params: { currentScore: 50, baselineScore: 80 },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.drifted).toBe(true);
      expect(p.delta).toBeCloseTo(0.375, 5); // (80-50)/80
    });

    it("does NOT flag drift when scores are equal (delta = 0)", async () => {
      const r = await call({
        action: "mill_5axis_lora_cadence_check_drift",
        params: { currentScore: 80, baselineScore: 80 },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.drifted).toBe(false);
      expect(p.delta).toBeCloseTo(0, 5);
      expect(p.triggerRetrain).toBe(false);
    });

    it("does NOT flag drift for a small dip below the 12% threshold", async () => {
      const r = await call({
        action: "mill_5axis_lora_cadence_check_drift",
        params: { currentScore: 78, baselineScore: 80 }, // delta 0.025 < 0.12
      });
      expect(r.success).toBe(true);
      expect(payload(r.raw).drifted).toBe(false);
    });

    it("boundary: baseline score of 0 hits the divide-by-zero guard → not drifted", async () => {
      const r = await call({
        action: "mill_5axis_lora_cadence_check_drift",
        params: { currentScore: 10, baselineScore: 0 },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.drifted).toBe(false);
      expect(p.delta).toBe(0);
    });

    it("failure mode: non-numeric currentScore is rejected", async () => {
      const r = await call({
        action: "mill_5axis_lora_cadence_check_drift",
        params: { currentScore: "not-a-number", baselineScore: 80 },
      });
      expect(r.success).toBe(false);
    });

    it("adversarial: non-finite (Infinity) score is rejected", async () => {
      const r = await call({
        action: "mill_5axis_lora_cadence_check_drift",
        params: { currentScore: Number.POSITIVE_INFINITY, baselineScore: 80 },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — mill_5axis_lora_build_dataset", () => {
    it("builds a train/val/test split from valid 5-axis RawJob records", async () => {
      const jobs = [
        rawJob("5ax-001", 10, 0.6),
        rawJob("5ax-002", 25, 0.8, { tcpc: false }),
        rawJob("5ax-003", 40, 1.0, { material: "Inconel-718" }),
        rawJob("5ax-004", 55, 1.2),
        rawJob("5ax-005", 70, 1.4, { material: "17-4PH" }),
      ];
      const r = await call({ action: "mill_5axis_lora_build_dataset", params: { jobs } });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(Array.isArray(p.examples.train)).toBe(true);
      // slimResponse drops empty val/test arrays when a small split yields 0 —
      // sum + concat defensively so the count assertion stays exact.
      const total =
        (p.examples.train?.length ?? 0) +
        (p.examples.val?.length ?? 0) +
        (p.examples.test?.length ?? 0);
      expect(total).toBe(5);
      // Every rendered example carries a 5-axis instruction + numeric weight.
      const all = [
        ...(p.examples.train ?? []),
        ...(p.examples.val ?? []),
        ...(p.examples.test ?? []),
      ];
      for (const ex of all) {
        expect(ex.instruction).toMatch(/5-axis tool-axis/);
        expect(typeof ex.metadata.weight).toBe("number");
      }
    });

    it("singularity weighting: a tilt=90° job is up-weighted (>=2.0) + tagged near-singularity", async () => {
      const jobs = [
        rawJob("5ax-normal", 30, 0.7),
        rawJob("5ax-singular", 90, 1.5), // gimbal-lock — |tilt-90| < 5°
        rawJob("5ax-normal-2", 15, 0.9),
      ];
      const r = await call({ action: "mill_5axis_lora_build_dataset", params: { jobs } });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      const all = [
        ...(p.examples.train ?? []),
        ...(p.examples.val ?? []),
        ...(p.examples.test ?? []),
      ];
      const singular = all.find((e: any) => e.metadata.source_job === "5ax-singular");
      expect(singular?.metadata?.source_job).toBe("5ax-singular");
      expect(singular.metadata.weight).toBeGreaterThanOrEqual(2.0);
      expect(singular.metadata.labels).toContain("near-singularity");
      // A normal (low-tilt) job keeps the default unit weight and is NOT
      // tagged — its empty labels array is dropped by slimResponse, so
      // coalesce to [] before the negative membership check.
      const normal = all.find((e: any) => e.metadata.source_job === "5ax-normal");
      expect(normal?.metadata?.source_job).toBe("5ax-normal");
      expect(normal.metadata.weight).toBeLessThan(2.0);
      expect(normal.metadata.labels ?? []).not.toContain("near-singularity");
    });

    it("respects an explicit deterministic split config", async () => {
      const jobs = Array.from({ length: 10 }, (_, i) =>
        rawJob(`5ax-split-${i}`, 10 + i * 5, 0.5 + i * 0.1),
      );
      const r = await call({
        action: "mill_5axis_lora_build_dataset",
        params: {
          jobs,
          split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 42 },
        },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      const total =
        (p.examples.train?.length ?? 0) +
        (p.examples.val?.length ?? 0) +
        (p.examples.test?.length ?? 0);
      expect(total).toBe(10);
      expect(p.examples.train.length).toBeGreaterThan(0);
    });

    it("failure mode: empty jobs array is rejected (schema .min(1))", async () => {
      const r = await call({ action: "mill_5axis_lora_build_dataset", params: { jobs: [] } });
      expect(r.success).toBe(false);
    });

    it("failure mode: a job missing the required 'id' field is rejected (RawJobSchema)", async () => {
      const { id: _omitted, ...noId } = rawJob("placeholder", 20, 0.8);
      const r = await call({ action: "mill_5axis_lora_build_dataset", params: { jobs: [noId] } });
      expect(r.success).toBe(false);
    });

    it("failure mode: missing 'jobs' field entirely is rejected", async () => {
      const r = await call({ action: "mill_5axis_lora_build_dataset", params: {} });
      expect(r.success).toBe(false);
    });

    it("adversarial: jobs passed as a non-array is rejected", async () => {
      const r = await call({
        action: "mill_5axis_lora_build_dataset",
        params: { jobs: "not-an-array" },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — direct safeParse", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };

    it("mill_5axis_lora_required_schema accepts {} and rejects extra keys (.strict())", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_lora_required_schema;
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ unexpected: 1 }).success).toBe(false);
    });

    it("mill_5axis_lora_cadence_check_drift requires both numeric scores", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_lora_cadence_check_drift;
      expect(schema.safeParse({ currentScore: 70, baselineScore: 80 }).success).toBe(true);
      expect(schema.safeParse({ currentScore: 70 }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });
});
