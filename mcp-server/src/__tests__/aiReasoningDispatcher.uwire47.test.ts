/**
 * aiReasoningDispatcher U-WIRE47 round-trip tests — WaterjetLoRADatasetBuilderEngine.
 *
 * Validates waterjet_lora_build_dataset / waterjet_lora_required_schema through
 * prism_ai. Engine wraps BaseLoRADatasetBuilder with a waterjet-specific render
 * (instruction = "Recommend waterjet feed for <material> <thickness>mm at Q<level>.")
 * and enriches the fingerprint with `quality: "Q<n>"` so the train/val/test split
 * stratifies across the 5 quality regimes. Stateless.
 *
 * Engine internals (verified):
 *   - REQUIRED_FEATURE_KEYS: material, thickness_mm, quality_level,
 *     abrasive_flow_g_min, orifice_mm. Missing/null any → drop.
 *   - quality_level must be integer in [1,5]; non-integer or out-of-range → drop.
 *   - REQUIRED_ACTUAL_KEYS: edge_taper_deg, cycle_time_s, achieved_quality.
 *     Must each be finite number ≥0 (zero allowed; negative dropped).
 *   - enrichFingerprint() injects `quality: "Q<n>"` derived from features
 *     before delegating to BaseLoRADatasetBuilder.
 *   - id-prefixed with "waterjet-".
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE47
 */

import { describe, it, expect } from "vitest";
import { waterjetLoRADatasetBuilderEngine } from "../engines/WaterjetLoRADatasetBuilderEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["waterjet_lora_build_dataset", "waterjet_lora_required_schema"] as const;

const GOOD_JOB = {
  id: "wj-001",
  fingerprint: { material: "AL-6061", thickness_mm: 12 },
  features: {
    material: "AL-6061",
    thickness_mm: 12,
    quality_level: 3,
    abrasive_flow_g_min: 380,
    orifice_mm: 0.3,
  },
  actual: { edge_taper_deg: 1.2, cycle_time_s: 240, achieved_quality: 3 },
  weight: 1,
  labels: ["aluminum"],
};

const Q5_JOB = {
  id: "wj-q5",
  fingerprint: { material: "AL-6061", thickness_mm: 12 },
  features: {
    material: "AL-6061",
    thickness_mm: 12,
    quality_level: 5,
    abrasive_flow_g_min: 420,
    orifice_mm: 0.25,
  },
  actual: { edge_taper_deg: 0.3, cycle_time_s: 580, achieved_quality: 5 },
  labels: ["finishing"],
};

const MISSING_FEATURE_JOB = {
  id: "wj-bad-feat",
  fingerprint: { material: "AL-6061", thickness_mm: 12 },
  features: {
    material: "AL-6061",
    thickness_mm: 12,
    quality_level: 3,
    abrasive_flow_g_min: 380,
    // orifice_mm missing
  },
  actual: { edge_taper_deg: 1.2, cycle_time_s: 240, achieved_quality: 3 },
};

const NON_INT_QUALITY_JOB = {
  id: "wj-q-noint",
  fingerprint: { material: "SS-304", thickness_mm: 8 },
  features: {
    material: "SS-304",
    thickness_mm: 8,
    quality_level: 2.5, // non-integer
    abrasive_flow_g_min: 420,
    orifice_mm: 0.3,
  },
  actual: { edge_taper_deg: 1.0, cycle_time_s: 200, achieved_quality: 3 },
};

const Q_OUT_OF_RANGE_JOB = {
  id: "wj-q-oor",
  fingerprint: { material: "SS-304", thickness_mm: 8 },
  features: {
    material: "SS-304",
    thickness_mm: 8,
    quality_level: 7, // > 5
    abrasive_flow_g_min: 420,
    orifice_mm: 0.3,
  },
  actual: { edge_taper_deg: 1.0, cycle_time_s: 200, achieved_quality: 3 },
};

const NEGATIVE_TAPER_JOB = {
  id: "wj-neg",
  fingerprint: { material: "AL-6061", thickness_mm: 12 },
  features: {
    material: "AL-6061",
    thickness_mm: 12,
    quality_level: 3,
    abrasive_flow_g_min: 380,
    orifice_mm: 0.3,
  },
  actual: { edge_taper_deg: -0.5, cycle_time_s: 240, achieved_quality: 3 },
};

const NAN_CYCLE_JOB = {
  id: "wj-nan",
  fingerprint: { material: "AL-6061", thickness_mm: 12 },
  features: {
    material: "AL-6061",
    thickness_mm: 12,
    quality_level: 3,
    abrasive_flow_g_min: 380,
    orifice_mm: 0.3,
  },
  actual: { edge_taper_deg: 1.2, cycle_time_s: Number.NaN, achieved_quality: 3 },
};

const INFINITY_QUALITY_JOB = {
  id: "wj-inf",
  fingerprint: { material: "AL-6061", thickness_mm: 12 },
  features: {
    material: "AL-6061",
    thickness_mm: 12,
    quality_level: 3,
    abrasive_flow_g_min: 380,
    orifice_mm: 0.3,
  },
  actual: { edge_taper_deg: 1.2, cycle_time_s: 240, achieved_quality: Number.POSITIVE_INFINITY },
};

describe("U-WIRE47 — engine direct: WaterjetLoRADatasetBuilderEngine", () => {
  it("buildDataset on empty array returns valid stats with zero rows", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(typeof r.datasetFingerprint).toBe("string");
    expect(r.datasetFingerprint.length).toBe(24);
  });

  it("buildDataset on single Q3 job places one example with waterjet- id prefix", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB]);
    expect(r.stats.validJobs).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("waterjet-wj-001");
    expect(all[0].instruction).toContain("waterjet");
    expect(all[0].instruction).toContain("AL-6061");
    expect(all[0].instruction).toContain("12.0mm");
    expect(all[0].instruction).toContain("Q3");
  });

  it("enrichFingerprint stamps quality:Q<n> into example metadata", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, Q5_JOB]);
    expect(r.stats.validJobs).toBe(2);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const q3 = all.find((e) => e.id === "waterjet-wj-001");
    const q5 = all.find((e) => e.id === "waterjet-wj-q5");
    expect(q3?.metadata.fingerprint.quality).toBe("Q3");
    expect(q5?.metadata.fingerprint.quality).toBe("Q5");
  });

  it("buildDataset render produces alphabetically sorted JSON output", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    // achieved_quality < cycle_time_s < edge_taper_deg alphabetically.
    const out = all[0].output;
    expect(out.indexOf("achieved_quality")).toBeLessThan(out.indexOf("cycle_time_s"));
    expect(out.indexOf("cycle_time_s")).toBeLessThan(out.indexOf("edge_taper_deg"));
  });

  it("buildDataset drops job missing required feature (orifice_mm absent)", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, MISSING_FEATURE_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with non-integer quality_level (e.g. 2.5)", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, NON_INT_QUALITY_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with quality_level out of [1,5] range (boundary)", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, Q_OUT_OF_RANGE_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with negative edge_taper_deg actual (failure mode)", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, NEGATIVE_TAPER_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with NaN cycle_time_s (adversarial: non-finite)", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, NAN_CYCLE_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with Infinity achieved_quality (adversarial)", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, INFINITY_QUALITY_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset accepts zero edge_taper_deg (boundary: ≥0 allowed)", () => {
    const job = { ...GOOD_JOB, id: "wj-zero", actual: { ...GOOD_JOB.actual, edge_taper_deg: 0 } };
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([job]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset propagates labels through stats", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, Q5_JOB]);
    expect(r.stats.byLabel.aluminum).toBe(1);
    expect(r.stats.byLabel.finishing).toBe(1);
  });

  it("buildDataset honors custom split (50/25/25 seed=99) with 8 unique-fp jobs", () => {
    const jobs = Array.from({ length: 8 }, (_, i) => ({
      ...GOOD_JOB,
      id: `wj-${i}`,
      fingerprint: { ...GOOD_JOB.fingerprint, idx: String(i) },
    }));
    const r = waterjetLoRADatasetBuilderEngine.buildDataset(jobs, {
      trainRatio: 0.5,
      valRatio: 0.25,
      testRatio: 0.25,
      seed: 99,
    });
    expect(r.stats.validJobs).toBe(8);
    expect(r.stats.trainCount).toBe(4);
    expect(r.stats.valCount).toBe(2);
    expect(r.stats.testCount).toBe(2);
  });

  it("buildDataset throws on negative split ratio (boundary)", () => {
    expect(() =>
      waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB], {
        trainRatio: -0.1,
        valRatio: 0.5,
        testRatio: 0.6,
        seed: 1,
      }),
    ).toThrow(/non-negative/);
  });

  it("buildDataset throws on split ratios summing != 1 (boundary)", () => {
    expect(() =>
      waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB], {
        trainRatio: 0.5,
        valRatio: 0.5,
        testRatio: 0.5,
        seed: 1,
      }),
    ).toThrow(/sum to 1/);
  });

  it("buildDataset reproduces datasetFingerprint deterministically", () => {
    const r1 = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, Q5_JOB]);
    const r2 = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, Q5_JOB]);
    expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
  });

  it("requiredSchema returns documented waterjet feature + actual key lists", () => {
    const s = waterjetLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toEqual([
      "material",
      "thickness_mm",
      "quality_level",
      "abrasive_flow_g_min",
      "orifice_mm",
    ]);
    expect(s.actuals).toEqual(["edge_taper_deg", "cycle_time_s", "achieved_quality"]);
  });
});

describe("U-WIRE47 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });

  it("waterjet_lora_build_dataset minimal valid input parses (empty jobs)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    const parsed = schema.parse({ jobs: [] });
    expect(parsed).toEqual({ jobs: [] });
  });

  it("waterjet_lora_build_dataset accepts a fully-formed job", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [GOOD_JOB] })).not.toThrow();
  });

  it("waterjet_lora_build_dataset rejects missing jobs key (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    expect(() => schema.parse({})).toThrow();
  });

  it("waterjet_lora_build_dataset rejects job with empty id (boundary)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [{ ...GOOD_JOB, id: "" }] })).toThrow();
  });

  it("waterjet_lora_build_dataset rejects job missing fingerprint (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    const noFp = { ...GOOD_JOB } as Record<string, unknown>;
    delete noFp.fingerprint;
    expect(() => schema.parse({ jobs: [noFp] })).toThrow();
  });

  it("waterjet_lora_build_dataset rejects job missing features (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    const noFeat = { ...GOOD_JOB } as Record<string, unknown>;
    delete noFeat.features;
    expect(() => schema.parse({ jobs: [noFeat] })).toThrow();
  });

  it("waterjet_lora_build_dataset rejects job missing actual (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    const noActual = { ...GOOD_JOB } as Record<string, unknown>;
    delete noActual.actual;
    expect(() => schema.parse({ jobs: [noActual] })).toThrow();
  });

  it("waterjet_lora_build_dataset split rejects ratio outside [0,1]", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 1.5, valRatio: 0, testRatio: 0, seed: 1 },
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 },
      }),
    ).toThrow();
  });

  it("waterjet_lora_build_dataset split rejects non-finite seed (adversarial)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN },
      }),
    ).toThrow();
  });

  it("waterjet_lora_required_schema accepts empty input", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_required_schema"];
    expect(() => schema.parse({})).not.toThrow();
  });

  it("waterjet_lora_required_schema accepts unknown extra fields (passthrough)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["waterjet_lora_required_schema"];
    expect(() => schema.parse({ extraneous: "ignored" })).not.toThrow();
  });
});

describe("U-WIRE47 — dispatcher round-trip: prism_ai", () => {
  it("waterjet_lora_build_dataset on empty jobs returns success:true, zero stats", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", { jobs: [] });
    expect(out.success).toBe(true);
    const data = out.data as {
      stats: { totalJobs: number; validJobs: number };
      datasetFingerprint: string;
    };
    expect(data.stats.totalJobs).toBe(0);
    expect(data.stats.validJobs).toBe(0);
    expect(typeof data.datasetFingerprint).toBe("string");
  });

  it("waterjet_lora_build_dataset on single good Q3 job returns DatasetBuildResult", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", { jobs: [GOOD_JOB] });
    expect(out.success).toBe(true);
    // slimResponse strips empty arrays — one valid job → only `test` survives.
    const data = out.data as {
      examples: { train?: unknown[]; val?: unknown[]; test?: unknown[] };
      stats: { validJobs: number; trainCount: number; valCount: number; testCount: number };
      datasetFingerprint: string;
    };
    expect(data.stats.validJobs).toBe(1);
    expect(data.stats.trainCount + data.stats.valCount + data.stats.testCount).toBe(1);
    const surviving = [data.examples.train, data.examples.val, data.examples.test].filter(
      (a) => Array.isArray(a) && a.length > 0,
    );
    expect(surviving).toHaveLength(1);
  });

  it("waterjet_lora_build_dataset honors custom split (60/20/20 seed=11)", async () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...GOOD_JOB,
      id: `wj-${i}`,
      fingerprint: { ...GOOD_JOB.fingerprint, idx: String(i) },
    }));
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {
      jobs,
      split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 11 },
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { trainCount: number; valCount: number; testCount: number } };
    expect(data.stats.trainCount).toBe(6);
    expect(data.stats.valCount).toBe(2);
    expect(data.stats.testCount).toBe(2);
  });

  it("waterjet_lora_build_dataset filters out invalid jobs (engine validate)", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {
      jobs: [
        GOOD_JOB,
        MISSING_FEATURE_JOB,
        NON_INT_QUALITY_JOB,
        Q_OUT_OF_RANGE_JOB,
        NEGATIVE_TAPER_JOB,
        NAN_CYCLE_JOB,
        INFINITY_QUALITY_JOB,
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { totalJobs: number; validJobs: number } };
    expect(data.stats.totalJobs).toBe(7);
    expect(data.stats.validJobs).toBe(1);
  });

  it("waterjet_lora_required_schema returns documented features + actuals", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_required_schema", {});
    expect(out.success).toBe(true);
    const data = out.data as { features: string[]; actuals: string[] };
    expect(data.features).toEqual([
      "material",
      "thickness_mm",
      "quality_level",
      "abrasive_flow_g_min",
      "orifice_mm",
    ]);
    expect(data.actuals).toEqual(["edge_taper_deg", "cycle_time_s", "achieved_quality"]);
  });

  it("waterjet_lora_build_dataset without jobs key returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/jobs|required/i);
  });

  it("waterjet_lora_build_dataset with empty job id returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {
      jobs: [{ ...GOOD_JOB, id: "" }],
    });
    expect(out.success).toBe(false);
  });

  it("waterjet_lora_build_dataset with bad split ratio returns success:false", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {
      jobs: [],
      split: { trainRatio: 5, valRatio: 0, testRatio: 0, seed: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("waterjet_lora_build_dataset stratifies Q3+Q5 in fingerprint via dispatcher", async () => {
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {
      jobs: [GOOD_JOB, Q5_JOB],
    });
    expect(out.success).toBe(true);
    // Q3 and Q5 produce DIFFERENT geometry hashes (because enrichFingerprint
    // adds quality:Q3 vs quality:Q5), so two unique fingerprints → 0 collisions.
    const data = out.data as { stats: { validJobs: number; geometryHashCollisions: number } };
    expect(data.stats.validJobs).toBe(2);
    expect(data.stats.geometryHashCollisions).toBe(0);
  });

  it("dispatcher build_dataset matches engine direct on fingerprint+stats", async () => {
    const direct = waterjetLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, Q5_JOB]);
    const out = await executeAIReasoningAction("waterjet_lora_build_dataset", {
      jobs: [GOOD_JOB, Q5_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      datasetFingerprint: string;
      stats: { validJobs: number; geometryHashCollisions: number };
    };
    expect(data.datasetFingerprint).toBe(direct.datasetFingerprint);
    expect(data.stats.validJobs).toBe(direct.stats.validJobs);
    expect(data.stats.geometryHashCollisions).toBe(direct.stats.geometryHashCollisions);
  });
});
