/**
 * aiReasoningDispatcher U-WIRE49 round-trip tests — SinkerEDMLoRADatasetBuilderEngine.
 *
 * Validates sinker_edm_lora_build_dataset / sinker_edm_lora_required_schema
 * through prism_ai. Engine wraps BaseLoRADatasetBuilder with a sinker-EDM
 * render (instruction = "Sequence <count> <electrode> electrodes for a
 * sinker-EDM cavity in <material>, depth <depth>mm.") and bins the
 * depth/width aspect ratio into 3 complexity classes.
 *
 * Engine internals (verified):
 *   - REQUIRED_FEATURE_KEYS: material, electrode_material, cavity_depth_mm,
 *     cavity_width_mm, electrode_count. Missing/null any → drop.
 *   - REQUIRED_ACTUAL_KEYS: total_wear_mm, achieved_ra_um, cycle_time_min.
 *     Each must be finite number ≥0.
 *   - enrichFingerprint() computes aspect = depth / max(width, 0.1) and bins
 *     to "simple" (≤2) / "moderate" (>2 ≤5) / "deep" (>5).
 *   - validate() SIDE EFFECT: depth/width > 5 ⇒ pushes "deep-cavity" label
 *     (idempotent) AND boosts weight to max(weight, 2.0).
 *   - id-prefixed with "sinker-edm-".
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE49
 */

import { describe, it, expect } from "vitest";
import { sinkerEDMLoRADatasetBuilderEngine } from "../engines/SinkerEDMLoRADatasetBuilderEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["sinker_edm_lora_build_dataset", "sinker_edm_lora_required_schema"] as const;

const SIMPLE_JOB = {
  id: "sk-simple",
  fingerprint: { material: "P-20", electrode_material: "Cu" },
  features: {
    material: "P-20",
    electrode_material: "Cu",
    cavity_depth_mm: 8,
    cavity_width_mm: 20, // aspect 0.4 → simple
    electrode_count: 2,
  },
  actual: { total_wear_mm: 0.05, achieved_ra_um: 0.8, cycle_time_min: 90 },
  weight: 1,
  labels: ["mold-cavity"],
};

const MODERATE_JOB = {
  id: "sk-moderate",
  fingerprint: { material: "H-13", electrode_material: "Cu" },
  features: {
    material: "H-13",
    electrode_material: "Cu",
    cavity_depth_mm: 30,
    cavity_width_mm: 10, // aspect 3.0 → moderate
    electrode_count: 4,
  },
  actual: { total_wear_mm: 0.2, achieved_ra_um: 1.6, cycle_time_min: 240 },
  weight: 1,
};

const DEEP_JOB = {
  id: "sk-deep",
  fingerprint: { material: "H-13", electrode_material: "Cu-W" },
  features: {
    material: "H-13",
    electrode_material: "Cu-W",
    cavity_depth_mm: 60,
    cavity_width_mm: 8, // aspect 7.5 → deep
    electrode_count: 6,
  },
  actual: { total_wear_mm: 0.4, achieved_ra_um: 0.4, cycle_time_min: 480 },
  // weight + labels deliberately absent — engine should auto-create
};

describe("U-WIRE49 — engine direct: SinkerEDMLoRADatasetBuilderEngine", () => {
  it("buildDataset on empty array returns 0 totalJobs, 0 validJobs, 24-char hex datasetFingerprint", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(r.stats.trainCount).toBe(0);
    expect(r.stats.valCount).toBe(0);
    expect(r.stats.testCount).toBe(0);
    // datasetFingerprint = sha1.slice(0,24) — exact hex pattern, not just "is string".
    expect(r.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("buildDataset on simple job places exactly 1 example with sinker-edm- id prefix and full instruction text", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB]);
    expect(r.stats.totalJobs).toBe(1);
    expect(r.stats.validJobs).toBe(1);
    expect(r.stats.trainCount + r.stats.valCount + r.stats.testCount).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("sinker-edm-sk-simple");
    expect(all[0].instruction).toBe(
      "Sequence 2 Cu electrodes for a sinker-EDM cavity in P-20, depth 8.0mm.",
    );
  });

  it("enrichFingerprint stamps complexity buckets at exact aspect-ratio boundaries", () => {
    // aspect = depth / max(width, 0.1). Boundaries: ≤2 simple; ≤5 moderate; >5 deep.
    const cases: Array<{ d: number; w: number; bucket: string; aspect: number }> = [
      { d: 5, w: 5, aspect: 1, bucket: "simple" },
      { d: 10, w: 5, aspect: 2, bucket: "simple" }, // ≤2 boundary
      { d: 15, w: 5, aspect: 3, bucket: "moderate" },
      { d: 25, w: 5, aspect: 5, bucket: "moderate" }, // ≤5 boundary
      { d: 30, w: 5, aspect: 6, bucket: "deep" },
      { d: 100, w: 8, aspect: 12.5, bucket: "deep" },
    ];
    for (const c of cases) {
      // Fresh labels array per iteration — validate() may mutate (push "deep-cavity"
      // for aspect>5), and a shared SIMPLE_JOB.labels reference would leak that
      // mutation across tests in this describe block.
      const job = {
        ...SIMPLE_JOB,
        id: `sk-${c.d}x${c.w}`,
        labels: [] as string[],
        features: { ...SIMPLE_JOB.features, cavity_depth_mm: c.d, cavity_width_mm: c.w },
      };
      const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([job]);
      const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
      expect(all[0].metadata.fingerprint.complexity).toBe(c.bucket);
    }
  });

  it("validate() side-effect: deep cavity (aspect>5) auto-adds 'deep-cavity' label and sets weight to exactly max(prev,2.0)", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([DEEP_JOB]);
    expect(r.stats.validJobs).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all[0].metadata.labels).toEqual(["deep-cavity"]);
    expect(all[0].metadata.weight).toBe(2.0); // DEEP_JOB had no weight → max(1,2.0)=2.0
    expect(r.stats.byLabel["deep-cavity"]).toBe(1);
    expect(all[0].metadata.fingerprint.complexity).toBe("deep");
  });

  it("deep-cavity boost is idempotent: existing label kept exactly once, weight=5 preserved (not lowered)", () => {
    const preLabeled = {
      ...DEEP_JOB,
      id: "sk-pre",
      labels: ["deep-cavity", "ribbed"],
      weight: 5, // already above 2.0 floor
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([preLabeled]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    // Order-preserving: existing labels precede no new additions since label already there.
    expect(all[0].metadata.labels).toEqual(["deep-cavity", "ribbed"]);
    expect(all[0].metadata.weight).toBe(5);
  });

  it("simple+moderate jobs (aspect ≤5) yield byLabel without 'deep-cavity' key", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, MODERATE_JOB]);
    expect(r.stats.byLabel["deep-cavity"]).toBe(undefined);
    // SIMPLE_JOB has labels=["mold-cavity"]; MODERATE_JOB has none.
    expect(r.stats.byLabel["mold-cavity"]).toBe(1);
  });

  it("render output is JSON with alphabetic key order (achieved_ra_um < cycle_time_min < total_wear_mm)", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    // Concrete shape — parse the JSON and assert order-preserved key positions.
    const out = all[0].output;
    const i_ra = out.indexOf('"achieved_ra_um"');
    const i_ct = out.indexOf('"cycle_time_min"');
    const i_tw = out.indexOf('"total_wear_mm"');
    expect(i_ra).toBeGreaterThan(-1);
    expect(i_ct).toBeGreaterThan(i_ra);
    expect(i_tw).toBeGreaterThan(i_ct);
    // Round-trip: JSON re-parses to the actual values verbatim.
    expect(JSON.parse(out)).toEqual({
      achieved_ra_um: 0.8,
      cycle_time_min: 90,
      total_wear_mm: 0.05,
    });
  });

  it("buildDataset drops job missing required feature electrode_count (validJobs counts the survivor)", () => {
    const bad = {
      id: "sk-bad-feat",
      fingerprint: { material: "P-20", electrode_material: "Cu" },
      features: {
        material: "P-20",
        electrode_material: "Cu",
        cavity_depth_mm: 10,
        cavity_width_mm: 20,
        // electrode_count missing
      },
      actual: { total_wear_mm: 0.1, achieved_ra_um: 1.0, cycle_time_min: 100 },
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, bad]);
    expect(r.stats.totalJobs).toBe(2);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with negative total_wear_mm; valid count = 1", () => {
    const bad = {
      ...SIMPLE_JOB,
      id: "sk-neg",
      actual: { total_wear_mm: -0.1, achieved_ra_um: 1.0, cycle_time_min: 100 },
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with NaN achieved_ra_um (non-finite adversarial)", () => {
    const bad = {
      ...SIMPLE_JOB,
      id: "sk-nan",
      actual: { total_wear_mm: 0.1, achieved_ra_um: Number.NaN, cycle_time_min: 100 },
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with Infinity cycle_time_min (non-finite adversarial)", () => {
    const bad = {
      ...SIMPLE_JOB,
      id: "sk-inf",
      actual: { total_wear_mm: 0.1, achieved_ra_um: 1.0, cycle_time_min: Number.POSITIVE_INFINITY },
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with string total_wear_mm (non-number adversarial)", () => {
    const bad = {
      ...SIMPLE_JOB,
      id: "sk-str",
      actual: { total_wear_mm: "0.1" as unknown as number, achieved_ra_um: 1.0, cycle_time_min: 100 },
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset accepts zero across all 3 actuals (boundary: ≥0 inclusive)", () => {
    const job = {
      ...SIMPLE_JOB,
      id: "sk-zero",
      actual: { total_wear_mm: 0, achieved_ra_um: 0, cycle_time_min: 0 },
    };
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([job]);
    expect(r.stats.validJobs).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(JSON.parse(all[0].output)).toEqual({
      achieved_ra_um: 0,
      cycle_time_min: 0,
      total_wear_mm: 0,
    });
  });

  it("simple+moderate+deep produce 3 distinct geometry hashes (0 collisions)", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, MODERATE_JOB, DEEP_JOB]);
    expect(r.stats.validJobs).toBe(3);
    expect(r.stats.geometryHashCollisions).toBe(0);
  });

  it("custom 50/25/25 split with 8 unique-fp jobs yields exactly 4/2/2 train/val/test", () => {
    const jobs = Array.from({ length: 8 }, (_, i) => ({
      ...SIMPLE_JOB,
      id: `sk-${i}`,
      fingerprint: { ...SIMPLE_JOB.fingerprint, idx: String(i) },
    }));
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset(jobs, {
      trainRatio: 0.5,
      valRatio: 0.25,
      testRatio: 0.25,
      seed: 29,
    });
    expect(r.stats.validJobs).toBe(8);
    expect(r.stats.trainCount).toBe(4);
    expect(r.stats.valCount).toBe(2);
    expect(r.stats.testCount).toBe(2);
  });

  it("buildDataset throws 'non-negative' on a negative split ratio", () => {
    expect(() =>
      sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB], {
        trainRatio: -0.1,
        valRatio: 0.5,
        testRatio: 0.6,
        seed: 1,
      }),
    ).toThrow(/non-negative/);
  });

  it("buildDataset throws 'sum to 1' when ratios don't add to 1", () => {
    expect(() =>
      sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB], {
        trainRatio: 0.5,
        valRatio: 0.5,
        testRatio: 0.5,
        seed: 1,
      }),
    ).toThrow(/sum to 1/);
  });

  it("two builds on identical input produce identical datasetFingerprint (deterministic)", () => {
    const r1 = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, DEEP_JOB]);
    const r2 = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, DEEP_JOB]);
    expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
    expect(r1.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("requiredSchema returns the documented sinker-EDM key lists verbatim", () => {
    const s = sinkerEDMLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toEqual([
      "material",
      "electrode_material",
      "cavity_depth_mm",
      "cavity_width_mm",
      "electrode_count",
    ]);
    expect(s.actuals).toEqual(["total_wear_mm", "achieved_ra_um", "cycle_time_min"]);
  });
});

describe("U-WIRE49 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });

  it("sinker_edm_lora_build_dataset on { jobs: [] } parses to itself unchanged (round-trip)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    expect(schema.parse({ jobs: [] })).toEqual({ jobs: [] });
  });

  it("sinker_edm_lora_build_dataset on a fully-formed job parses without throwing", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [SIMPLE_JOB] })).not.toThrow();
  });

  it("sinker_edm_lora_build_dataset rejects {} with no jobs key (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    expect(() => schema.parse({})).toThrow();
  });

  it("sinker_edm_lora_build_dataset rejects empty job id (boundary)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [{ ...SIMPLE_JOB, id: "" }] })).toThrow();
  });

  it("sinker_edm_lora_build_dataset rejects job missing fingerprint (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    const noFp: Record<string, unknown> = { ...SIMPLE_JOB };
    delete noFp.fingerprint;
    expect(() => schema.parse({ jobs: [noFp] })).toThrow();
  });

  it("sinker_edm_lora_build_dataset rejects job missing features (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    const noFeat: Record<string, unknown> = { ...SIMPLE_JOB };
    delete noFeat.features;
    expect(() => schema.parse({ jobs: [noFeat] })).toThrow();
  });

  it("sinker_edm_lora_build_dataset rejects job missing actual (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    const noActual: Record<string, unknown> = { ...SIMPLE_JOB };
    delete noActual.actual;
    expect(() => schema.parse({ jobs: [noActual] })).toThrow();
  });

  it("sinker_edm_lora_build_dataset split rejects ratios outside [0,1] (both ends)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    expect(() =>
      schema.parse({ jobs: [], split: { trainRatio: 1.5, valRatio: 0, testRatio: 0, seed: 1 } }),
    ).toThrow();
    expect(() =>
      schema.parse({ jobs: [], split: { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 } }),
    ).toThrow();
  });

  it("sinker_edm_lora_build_dataset split rejects non-finite seed (adversarial)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN },
      }),
    ).toThrow();
  });

  it("sinker_edm_lora_required_schema parses {} and ignores extras under passthrough", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sinker_edm_lora_required_schema"];
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ ignored: 1 })).toEqual({ ignored: 1 });
  });
});

describe("U-WIRE49 — dispatcher round-trip: prism_ai", () => {
  it("sinker_edm_lora_build_dataset on empty jobs returns success:true with zero stats and 24-hex fingerprint", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", { jobs: [] });
    expect(out.success).toBe(true);
    const data = out.data as {
      stats: { totalJobs: number; validJobs: number };
      datasetFingerprint: string;
    };
    expect(data.stats.totalJobs).toBe(0);
    expect(data.stats.validJobs).toBe(0);
    expect(data.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("sinker_edm_lora_build_dataset on simple job returns validJobs=1 and exactly one example across train/val/test", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", { jobs: [SIMPLE_JOB] });
    expect(out.success).toBe(true);
    const data = out.data as {
      examples: { train?: unknown[]; val?: unknown[]; test?: unknown[] };
      stats: { validJobs: number; trainCount: number; valCount: number; testCount: number };
    };
    expect(data.stats.validJobs).toBe(1);
    expect(data.stats.trainCount + data.stats.valCount + data.stats.testCount).toBe(1);
    const surviving = [data.examples.train, data.examples.val, data.examples.test].filter(
      (a) => Array.isArray(a) && a.length > 0,
    );
    expect(surviving).toHaveLength(1);
    expect(surviving[0]).toHaveLength(1);
  });

  it("custom 60/20/20 split with 10 unique-fp jobs yields exactly 6/2/2 through dispatcher", async () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...SIMPLE_JOB,
      id: `sk-${i}`,
      fingerprint: { ...SIMPLE_JOB.fingerprint, idx: String(i) },
    }));
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", {
      jobs,
      split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 37 },
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { trainCount: number; valCount: number; testCount: number } };
    expect(data.stats.trainCount).toBe(6);
    expect(data.stats.valCount).toBe(2);
    expect(data.stats.testCount).toBe(2);
  });

  it("dispatcher filters 5 invalid jobs out of 6, leaving validJobs=1", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", {
      jobs: [
        SIMPLE_JOB,
        // missing electrode_count
        {
          id: "sk-x1",
          fingerprint: { material: "P-20", electrode_material: "Cu" },
          features: { material: "P-20", electrode_material: "Cu", cavity_depth_mm: 10, cavity_width_mm: 20 },
          actual: { total_wear_mm: 0.1, achieved_ra_um: 1.0, cycle_time_min: 100 },
        },
        // negative wear
        {
          ...SIMPLE_JOB,
          id: "sk-x2",
          actual: { total_wear_mm: -0.1, achieved_ra_um: 1.0, cycle_time_min: 100 },
        },
        // NaN ra
        {
          ...SIMPLE_JOB,
          id: "sk-x3",
          actual: { total_wear_mm: 0.1, achieved_ra_um: Number.NaN, cycle_time_min: 100 },
        },
        // Infinity cycle
        {
          ...SIMPLE_JOB,
          id: "sk-x4",
          actual: { total_wear_mm: 0.1, achieved_ra_um: 1.0, cycle_time_min: Number.POSITIVE_INFINITY },
        },
        // string wear
        {
          ...SIMPLE_JOB,
          id: "sk-x5",
          actual: { total_wear_mm: "0.1" as unknown as number, achieved_ra_um: 1.0, cycle_time_min: 100 },
        },
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { totalJobs: number; validJobs: number } };
    expect(data.stats.totalJobs).toBe(6);
    expect(data.stats.validJobs).toBe(1);
  });

  it("dispatcher auto-stamps deep-cavity label on aspect>5 job", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", { jobs: [DEEP_JOB] });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { byLabel: Record<string, number> } };
    expect(data.stats.byLabel["deep-cavity"]).toBe(1);
  });

  it("sinker_edm_lora_required_schema returns the exact documented arrays", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_required_schema", {});
    expect(out.success).toBe(true);
    const data = out.data as { features: string[]; actuals: string[] };
    expect(data.features).toEqual([
      "material",
      "electrode_material",
      "cavity_depth_mm",
      "cavity_width_mm",
      "electrode_count",
    ]);
    expect(data.actuals).toEqual(["total_wear_mm", "achieved_ra_um", "cycle_time_min"]);
  });

  it("sinker_edm_lora_build_dataset with no jobs key returns success:false with /jobs|required/ error", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/jobs|required/i);
  });

  it("sinker_edm_lora_build_dataset with bad split ratio (5) returns success:false", async () => {
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", {
      jobs: [],
      split: { trainRatio: 5, valRatio: 0, testRatio: 0, seed: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("dispatcher build_dataset matches engine direct on datasetFingerprint+validJobs+geometryHashCollisions (3 buckets)", async () => {
    const direct = sinkerEDMLoRADatasetBuilderEngine.buildDataset([SIMPLE_JOB, MODERATE_JOB, DEEP_JOB]);
    const out = await executeAIReasoningAction("sinker_edm_lora_build_dataset", {
      jobs: [SIMPLE_JOB, MODERATE_JOB, DEEP_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      datasetFingerprint: string;
      stats: { validJobs: number; geometryHashCollisions: number };
    };
    expect(data.datasetFingerprint).toBe(direct.datasetFingerprint);
    expect(data.stats.validJobs).toBe(direct.stats.validJobs);
    expect(data.stats.geometryHashCollisions).toBe(direct.stats.geometryHashCollisions);
    // Concrete: 3 unique buckets → 0 collisions exactly.
    expect(data.stats.geometryHashCollisions).toBe(0);
    expect(data.stats.validJobs).toBe(3);
  });
});
