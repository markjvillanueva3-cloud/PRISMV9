/**
 * aiReasoningDispatcher U-WIRE51 round-trip tests — FiveAxisLoRADatasetBuilderEngine.
 *
 * Validates fiveaxis_lora_build_dataset / fiveaxis_lora_required_schema
 * through prism_ai. Engine wraps BaseLoRADatasetBuilder with a 5-axis render
 * (instruction = "Recommend 5-axis tool-axis and feed/speed for <op_type>
 * on <material> at tilt=<deg>° with/without TCPC.") and bins tilt_deg into
 * 10° increments for split stratification.
 *
 * Engine internals (verified):
 *   - REQUIRED_FEATURE_KEYS: material, tool_class, op_type, machine_class,
 *     tilt_deg, tcpc_enabled. Missing/null/empty-string any → drop.
 *   - REQUIRED_ACTUAL_KEYS: surface_ra_um. Must be finite NUMBER > 0
 *     (STRICT — zero rejected, negative rejected, NaN/Infinity rejected).
 *   - enrichFingerprint(): tilt_bucket = "t" + Math.round(tilt/10)*10.
 *     Examples: tilt=87 → "t90"; tilt=85 → "t90" (rounds-up at .5);
 *     tilt=84 → "t80"; tilt=0 → "t0".
 *   - validate() SIDE EFFECT: |tilt - 90| < 5 (STRICT) ⇒ auto-labels
 *     "near-singularity" (idempotent) AND boosts weight to max(weight, 2.0).
 *   - id-prefixed with "5axis-".
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE51
 */

import { describe, it, expect } from "vitest";
import { fiveAxisLoRADatasetBuilderEngine } from "../engines/FiveAxisLoRADatasetBuilderEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["fiveaxis_lora_build_dataset", "fiveaxis_lora_required_schema"] as const;

const HORIZONTAL_JOB = {
  id: "fa-horiz",
  fingerprint: { material: "Ti-6Al-4V", op_type: "swarf-finishing" },
  features: {
    material: "Ti-6Al-4V",
    tool_class: "ball-end-6mm",
    op_type: "swarf-finishing",
    machine_class: "DMG-Mori-DMU65",
    tilt_deg: 0, // horizontal — far from singularity
    tcpc_enabled: true,
  },
  actual: { surface_ra_um: 0.4 },
  weight: 1,
  labels: ["impeller"],
};

const TILT_45_JOB = {
  id: "fa-tilt45",
  fingerprint: { material: "Inconel-718", op_type: "port-finishing" },
  features: {
    material: "Inconel-718",
    tool_class: "ball-end-8mm",
    op_type: "port-finishing",
    machine_class: "Hermle-C400",
    tilt_deg: 45, // mid-range, away from singularity
    tcpc_enabled: false,
  },
  actual: { surface_ra_um: 0.8 },
  weight: 1,
};

const SINGULARITY_JOB = {
  id: "fa-sing",
  fingerprint: { material: "Ti-6Al-4V", op_type: "blade-finishing" },
  features: {
    material: "Ti-6Al-4V",
    tool_class: "ball-end-6mm",
    op_type: "blade-finishing",
    machine_class: "DMG-Mori-DMU65",
    tilt_deg: 88, // |88-90|=2 < 5 → near-singularity
    tcpc_enabled: true,
  },
  actual: { surface_ra_um: 0.6 },
  // weight + labels deliberately absent — engine should auto-create
};

describe("U-WIRE51 — engine direct: FiveAxisLoRADatasetBuilderEngine", () => {
  it("buildDataset on empty array returns 0 totalJobs/validJobs and 24-char hex datasetFingerprint", () => {
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(r.stats.trainCount).toBe(0);
    expect(r.stats.valCount).toBe(0);
    expect(r.stats.testCount).toBe(0);
    expect(r.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("buildDataset on horizontal job places one example with 5axis- id prefix and exact instruction string", () => {
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB]);
    expect(r.stats.totalJobs).toBe(1);
    expect(r.stats.validJobs).toBe(1);
    expect(r.stats.trainCount + r.stats.valCount + r.stats.testCount).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("5axis-fa-horiz");
    expect(all[0].instruction).toBe(
      "Recommend 5-axis tool-axis and feed/speed for swarf-finishing on Ti-6Al-4V at tilt=0.0° with TCPC.",
    );
  });

  it("instruction varies tcpc_enabled phrasing: 'with TCPC' vs 'without TCPC'", () => {
    const r1 = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB]);
    const r2 = fiveAxisLoRADatasetBuilderEngine.buildDataset([TILT_45_JOB]);
    const all1 = [...r1.examples.train, ...r1.examples.val, ...r1.examples.test];
    const all2 = [...r2.examples.train, ...r2.examples.val, ...r2.examples.test];
    expect(all1[0].instruction).toContain("with TCPC");
    expect(all1[0].instruction).not.toContain("without TCPC");
    expect(all2[0].instruction).toContain("without TCPC");
    expect(all2[0].instruction).toContain("tilt=45.0");
  });

  it("enrichFingerprint stamps tilt_bucket at 10° increments (round-half-up)", () => {
    const cases: Array<{ tilt: number; bucket: string }> = [
      { tilt: 0, bucket: "t0" },
      { tilt: 4, bucket: "t0" }, // 4/10=0.4 → 0
      { tilt: 5, bucket: "t10" }, // round-half-up
      { tilt: 14, bucket: "t10" },
      { tilt: 15, bucket: "t20" },
      { tilt: 45, bucket: "t50" }, // Math.round rounds up at .5
      { tilt: 60, bucket: "t60" },
      { tilt: 89, bucket: "t90" }, // bucket=90 even though near-singularity flag also fires
    ];
    for (const c of cases) {
      const job = {
        ...HORIZONTAL_JOB,
        id: `fa-${c.tilt}`,
        labels: [] as string[], // fresh array — singularity-boost doesn't leak across cases
        features: { ...HORIZONTAL_JOB.features, tilt_deg: c.tilt },
      };
      const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([job]);
      const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
      expect(all[0].metadata.fingerprint.tilt_bucket).toBe(c.bucket);
    }
  });

  it("validate() side-effect: |tilt-90|<5 auto-adds 'near-singularity' label and sets weight=max(prev,2.0)", () => {
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([SINGULARITY_JOB]);
    expect(r.stats.validJobs).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all[0].metadata.labels).toEqual(["near-singularity"]);
    expect(all[0].metadata.weight).toBe(2.0); // SINGULARITY_JOB had no weight → max(1,2.0)=2.0
    expect(r.stats.byLabel["near-singularity"]).toBe(1);
  });

  it("near-singularity threshold is STRICT |tilt-90|<5: tilt=85 (|x|=5) does NOT trigger; tilt=86 (|x|=4) does", () => {
    const onBoundary = {
      ...HORIZONTAL_JOB,
      id: "fa-85",
      labels: [] as string[],
      features: { ...HORIZONTAL_JOB.features, tilt_deg: 85 },
    };
    const justInside = {
      ...HORIZONTAL_JOB,
      id: "fa-86",
      labels: [] as string[],
      features: { ...HORIZONTAL_JOB.features, tilt_deg: 86 },
    };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([onBoundary, justInside]);
    expect(r.stats.byLabel["near-singularity"]).toBe(1); // only tilt=86
  });

  it("singularity boost is idempotent: pre-labeled 'near-singularity' kept once, weight=5 preserved", () => {
    const preLabeled = {
      ...SINGULARITY_JOB,
      id: "fa-pre",
      labels: ["near-singularity", "blade"],
      weight: 5,
    };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([preLabeled]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all[0].metadata.labels).toEqual(["near-singularity", "blade"]);
    expect(all[0].metadata.weight).toBe(5);
  });

  it("render output JSON contains exactly { surface_ra_um } and round-trips to verbatim value", () => {
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(JSON.parse(all[0].output)).toEqual({ surface_ra_um: 0.4 });
  });

  it("buildDataset drops job missing required feature (tcpc_enabled absent)", () => {
    const bad = {
      id: "fa-bad-feat",
      fingerprint: { material: "Ti-6Al-4V" },
      features: {
        material: "Ti-6Al-4V",
        tool_class: "ball-end-6mm",
        op_type: "finishing",
        machine_class: "DMG-Mori",
        tilt_deg: 30,
        // tcpc_enabled missing
      },
      actual: { surface_ra_um: 0.5 },
    };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, bad]);
    expect(r.stats.totalJobs).toBe(2);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with empty-string feature (engine treats '' as missing)", () => {
    const bad = {
      ...HORIZONTAL_JOB,
      id: "fa-empty",
      features: { ...HORIZONTAL_JOB.features, tool_class: "" },
    };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with surface_ra_um=0 (STRICT >0 boundary, not >=0)", () => {
    const bad = { ...HORIZONTAL_JOB, id: "fa-zero", actual: { surface_ra_um: 0 } };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with negative surface_ra_um (failure mode)", () => {
    const bad = { ...HORIZONTAL_JOB, id: "fa-neg", actual: { surface_ra_um: -0.1 } };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with NaN surface_ra_um (non-finite adversarial)", () => {
    const bad = { ...HORIZONTAL_JOB, id: "fa-nan", actual: { surface_ra_um: Number.NaN } };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with Infinity surface_ra_um (non-finite adversarial)", () => {
    const bad = {
      ...HORIZONTAL_JOB,
      id: "fa-inf",
      actual: { surface_ra_um: Number.POSITIVE_INFINITY },
    };
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("3 distinct fingerprints (horiz + tilt45 + singularity) → 0 hash collisions", () => {
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, TILT_45_JOB, SINGULARITY_JOB]);
    expect(r.stats.validJobs).toBe(3);
    expect(r.stats.geometryHashCollisions).toBe(0);
  });

  it("custom 50/25/25 split with 8 unique-fp jobs yields exactly 4/2/2 train/val/test", () => {
    const jobs = Array.from({ length: 8 }, (_, i) => ({
      ...HORIZONTAL_JOB,
      id: `fa-${i}`,
      fingerprint: { ...HORIZONTAL_JOB.fingerprint, idx: String(i) },
    }));
    const r = fiveAxisLoRADatasetBuilderEngine.buildDataset(jobs, {
      trainRatio: 0.5,
      valRatio: 0.25,
      testRatio: 0.25,
      seed: 61,
    });
    expect(r.stats.validJobs).toBe(8);
    expect(r.stats.trainCount).toBe(4);
    expect(r.stats.valCount).toBe(2);
    expect(r.stats.testCount).toBe(2);
  });

  it("buildDataset throws 'non-negative' on a negative split ratio", () => {
    expect(() =>
      fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB], {
        trainRatio: -0.1,
        valRatio: 0.5,
        testRatio: 0.6,
        seed: 1,
      }),
    ).toThrow(/non-negative/);
  });

  it("two builds on identical input produce identical 24-char hex datasetFingerprint (deterministic)", () => {
    const r1 = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, TILT_45_JOB]);
    const r2 = fiveAxisLoRADatasetBuilderEngine.buildDataset([HORIZONTAL_JOB, TILT_45_JOB]);
    expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
    expect(r1.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("requiredSchema returns the exact 5-axis key lists (6 features, 1 actual)", () => {
    const s = fiveAxisLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toEqual([
      "material",
      "tool_class",
      "op_type",
      "machine_class",
      "tilt_deg",
      "tcpc_enabled",
    ]);
    expect(s.actuals).toEqual(["surface_ra_um"]);
  });
});

describe("U-WIRE51 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });

  it("fiveaxis_lora_build_dataset on { jobs: [] } parses to itself unchanged", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    expect(schema.parse({ jobs: [] })).toEqual({ jobs: [] });
  });

  it("fiveaxis_lora_build_dataset on a fully-formed job parses without throwing", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [HORIZONTAL_JOB] })).not.toThrow();
  });

  it("fiveaxis_lora_build_dataset rejects {} (missing jobs)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    expect(() => schema.parse({})).toThrow();
  });

  it("fiveaxis_lora_build_dataset rejects empty job id", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [{ ...HORIZONTAL_JOB, id: "" }] })).toThrow();
  });

  it("fiveaxis_lora_build_dataset rejects job missing fingerprint", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    const noFp: Record<string, unknown> = { ...HORIZONTAL_JOB };
    delete noFp.fingerprint;
    expect(() => schema.parse({ jobs: [noFp] })).toThrow();
  });

  it("fiveaxis_lora_build_dataset rejects job missing features", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    const noFeat: Record<string, unknown> = { ...HORIZONTAL_JOB };
    delete noFeat.features;
    expect(() => schema.parse({ jobs: [noFeat] })).toThrow();
  });

  it("fiveaxis_lora_build_dataset rejects job missing actual", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    const noActual: Record<string, unknown> = { ...HORIZONTAL_JOB };
    delete noActual.actual;
    expect(() => schema.parse({ jobs: [noActual] })).toThrow();
  });

  it("fiveaxis_lora_build_dataset split rejects ratios outside [0,1] (both ends)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    expect(() =>
      schema.parse({ jobs: [], split: { trainRatio: 1.5, valRatio: 0, testRatio: 0, seed: 1 } }),
    ).toThrow();
    expect(() =>
      schema.parse({ jobs: [], split: { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 } }),
    ).toThrow();
  });

  it("fiveaxis_lora_build_dataset split rejects non-finite seed", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN },
      }),
    ).toThrow();
  });

  it("fiveaxis_lora_required_schema parses {} and ignores extras", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["fiveaxis_lora_required_schema"];
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ ignored: "x" })).toEqual({ ignored: "x" });
  });
});

describe("U-WIRE51 — dispatcher round-trip: prism_ai", () => {
  it("fiveaxis_lora_build_dataset on empty jobs returns success:true with 24-hex fingerprint", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", { jobs: [] });
    expect(out.success).toBe(true);
    const data = out.data as {
      stats: { totalJobs: number; validJobs: number };
      datasetFingerprint: string;
    };
    expect(data.stats.totalJobs).toBe(0);
    expect(data.stats.validJobs).toBe(0);
    expect(data.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("fiveaxis_lora_build_dataset on horizontal job returns validJobs=1 with one example surviving slim", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", { jobs: [HORIZONTAL_JOB] });
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
      ...HORIZONTAL_JOB,
      id: `fa-${i}`,
      fingerprint: { ...HORIZONTAL_JOB.fingerprint, idx: String(i) },
    }));
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", {
      jobs,
      split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 73 },
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { trainCount: number; valCount: number; testCount: number } };
    expect(data.stats.trainCount).toBe(6);
    expect(data.stats.valCount).toBe(2);
    expect(data.stats.testCount).toBe(2);
  });

  it("dispatcher filters 5 invalid jobs out of 6, leaving validJobs=1", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", {
      jobs: [
        HORIZONTAL_JOB,
        // missing tcpc_enabled
        {
          id: "fa-x1",
          fingerprint: { material: "Ti" },
          features: {
            material: "Ti",
            tool_class: "ball",
            op_type: "fin",
            machine_class: "M",
            tilt_deg: 30,
          },
          actual: { surface_ra_um: 0.5 },
        },
        // surface_ra_um = 0
        { ...HORIZONTAL_JOB, id: "fa-x2", actual: { surface_ra_um: 0 } },
        // negative
        { ...HORIZONTAL_JOB, id: "fa-x3", actual: { surface_ra_um: -0.1 } },
        // NaN
        { ...HORIZONTAL_JOB, id: "fa-x4", actual: { surface_ra_um: Number.NaN } },
        // Infinity
        { ...HORIZONTAL_JOB, id: "fa-x5", actual: { surface_ra_um: Number.POSITIVE_INFINITY } },
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { totalJobs: number; validJobs: number } };
    expect(data.stats.totalJobs).toBe(6);
    expect(data.stats.validJobs).toBe(1);
  });

  it("dispatcher auto-stamps 'near-singularity' label on |tilt-90|<5 job", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", {
      jobs: [SINGULARITY_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { byLabel: Record<string, number> } };
    expect(data.stats.byLabel["near-singularity"]).toBe(1);
  });

  it("fiveaxis_lora_required_schema returns the exact 5-axis arrays via dispatcher", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_required_schema", {});
    expect(out.success).toBe(true);
    const data = out.data as { features: string[]; actuals: string[] };
    expect(data.features).toEqual([
      "material",
      "tool_class",
      "op_type",
      "machine_class",
      "tilt_deg",
      "tcpc_enabled",
    ]);
    expect(data.actuals).toEqual(["surface_ra_um"]);
  });

  it("fiveaxis_lora_build_dataset with no jobs key returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/jobs|required/i);
  });

  it("fiveaxis_lora_build_dataset with bad split ratio returns success:false", async () => {
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", {
      jobs: [],
      split: { trainRatio: 5, valRatio: 0, testRatio: 0, seed: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("dispatcher build_dataset matches engine direct on fingerprint+stats (3-fp equivalence)", async () => {
    const direct = fiveAxisLoRADatasetBuilderEngine.buildDataset([
      HORIZONTAL_JOB,
      TILT_45_JOB,
      SINGULARITY_JOB,
    ]);
    const out = await executeAIReasoningAction("fiveaxis_lora_build_dataset", {
      jobs: [HORIZONTAL_JOB, TILT_45_JOB, SINGULARITY_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      datasetFingerprint: string;
      stats: { validJobs: number; geometryHashCollisions: number };
    };
    expect(data.datasetFingerprint).toBe(direct.datasetFingerprint);
    expect(data.stats.validJobs).toBe(direct.stats.validJobs);
    expect(data.stats.geometryHashCollisions).toBe(direct.stats.geometryHashCollisions);
    expect(data.stats.geometryHashCollisions).toBe(0);
    expect(data.stats.validJobs).toBe(3);
  });
});
