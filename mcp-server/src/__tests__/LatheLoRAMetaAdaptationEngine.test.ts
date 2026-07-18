/**
 * LATHE-LORA-MS0/U-LLR-META — real-behavior tests for the promotion-decision capstone.
 *
 * Pure + deterministic. Two gates: absolute deploy-ready (mirrors nn-graph gradeMetrics —
 * AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15, missing=fail) AND measured lift over the incumbent.
 * Every verdict (promote/hold/reject) is asserted on hand-chosen metric sets so the test fails
 * if either gate or the lift math drifts (R9 intent check). No bare toBeDefined.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRAMetaAdaptationEngine as meta } from "../engines/LatheLoRAMetaAdaptationEngine.js";

const ds = (...p: string[]) => path.resolve(__dirname, "..", ...p);
const deployReady = { auroc: 0.85, macroF1: 0.6, brier: 0.1 }; // clears all default gates

describe("LatheLoRAMetaAdaptationEngine — guards", () => {
  it("throws when candidate metrics are missing", () => {
    expect(() => meta.decide({} as never)).toThrow(/candidate/);
    expect(() => meta.decide({ candidate: null } as never)).toThrow(/candidate/);
  });
});

describe("LatheLoRAMetaAdaptationEngine — absolute deploy-ready gate (mirror gradeMetrics)", () => {
  it("low AUROC → reject, failure names AUROC", () => {
    const r = meta.decide({ candidate: { auroc: 0.7, macroF1: 0.6, brier: 0.1 } });
    expect(r.verdict).toBe("reject");
    expect(r.absoluteGate.pass).toBe(false);
    expect(r.absoluteGate.failures.some((f) => /AUROC/.test(f))).toBe(true);
  });

  it("a MISSING metric is a failure, never a silent pass (brier absent → reject)", () => {
    const r = meta.decide({ candidate: { auroc: 0.85, macroF1: 0.6 } });
    expect(r.verdict).toBe("reject");
    expect(r.absoluteGate.failures.some((f) => /Brier.*n\/a/.test(f))).toBe(true);
  });

  it("Brier is lower-is-better — Brier above the ceiling fails", () => {
    const r = meta.decide({ candidate: { auroc: 0.85, macroF1: 0.6, brier: 0.2 } });
    expect(r.verdict).toBe("reject");
    expect(r.absoluteGate.failures.some((f) => /Brier 0\.2000 > 0\.15/.test(f))).toBe(true);
  });
});

describe("LatheLoRAMetaAdaptationEngine — measured-lift promotion logic", () => {
  it("deploy-ready + NO incumbent → promote (first deployable adapter)", () => {
    const r = meta.decide({ candidate: deployReady });
    expect(r.verdict).toBe("promote");
    expect(r.lift.delta).toBeNull();
    expect(r.reasons[0]).toMatch(/no incumbent/i);
  });

  it("deploy-ready + beats incumbent by ≥ minLift → promote (delta surfaced)", () => {
    const r = meta.decide({ candidate: { auroc: 0.85, macroF1: 0.6, brier: 0.1 }, incumbent: { auroc: 0.8, macroF1: 0.6, brier: 0.1 } });
    expect(r.verdict).toBe("promote");
    expect(r.lift.delta).toBeCloseTo(0.05, 6);
    expect(r.lift.meets).toBe(true);
  });

  it("deploy-ready but marginal lift (< minLift) → hold (keep incumbent)", () => {
    const r = meta.decide({ candidate: { auroc: 0.81, macroF1: 0.6, brier: 0.1 }, incumbent: { auroc: 0.8, macroF1: 0.6, brier: 0.1 } });
    expect(r.verdict).toBe("hold");
    expect(r.lift.delta).toBeCloseTo(0.01, 6);
    expect(r.lift.meets).toBe(false);
  });

  it("deploy-ready but candidate WORSE than incumbent (negative delta) → hold", () => {
    const r = meta.decide({ candidate: { auroc: 0.82, macroF1: 0.6, brier: 0.1 }, incumbent: { auroc: 0.9, macroF1: 0.6, brier: 0.1 } });
    expect(r.verdict).toBe("hold");
    expect(r.lift.delta).toBeCloseTo(-0.08, 6);
  });

  it("unmeasurable lift (lift metric absent on candidate) → hold", () => {
    const r = meta.decide({
      candidate: deployReady, // no successRate
      incumbent: { auroc: 0.8, macroF1: 0.6, brier: 0.1, successRate: 0.7 },
      liftMetric: "successRate",
    });
    expect(r.verdict).toBe("hold");
    expect(r.lift.delta).toBeNull();
    expect(r.reasons[0]).toMatch(/unmeasurable/i);
  });
});

describe("LatheLoRAMetaAdaptationEngine — overrides", () => {
  it("negative minLift is clamped to 0 → any non-negative lift promotes", () => {
    const r = meta.decide({ candidate: { auroc: 0.801, macroF1: 0.6, brier: 0.1 }, incumbent: { auroc: 0.8, macroF1: 0.6, brier: 0.1 }, minLift: -1 });
    expect(r.lift.required).toBe(0);
    expect(r.verdict).toBe("promote");
  });

  it("stricter gate override flips a default-pass candidate to reject", () => {
    const r = meta.decide({ candidate: deployReady, gates: { auroc: 0.9 } });
    expect(r.verdict).toBe("reject");
    expect(r.gates.auroc).toBe(0.9);
  });

  it("liftMetric=macroF1 evaluates lift on macroF1 (ignores a higher incumbent AUROC)", () => {
    const r = meta.decide({
      candidate: { auroc: 0.85, macroF1: 0.7, brier: 0.1 },
      incumbent: { auroc: 0.99, macroF1: 0.6, brier: 0.1 },
      liftMetric: "macroF1",
      minLift: 0.05,
    });
    expect(r.lift.metric).toBe("macroF1");
    expect(r.lift.delta).toBeCloseTo(0.1, 6);
    expect(r.verdict).toBe("promote");
  });

  it("invalid liftMetric falls back to the auroc default", () => {
    const r = meta.decide({ candidate: deployReady, liftMetric: "garbage" as never });
    expect(r.lift.metric).toBe("auroc");
  });
});

describe("LATHE-LORA-MS0/U-LLR-META — dispatcher + schema wiring", () => {
  it("turningDispatcher has the ACTIONS entry + case for lathe_lora_meta_adapt_decide", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    expect(src.includes('case "lathe_lora_meta_adapt_decide":')).toBe(true);
    expect(src.includes('"lathe_lora_meta_adapt_decide",')).toBe(true);
  });

  it("schema requires a candidate object; rejects missing candidate + null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(typeof m.lathe_lora_meta_adapt_decide?.safeParse).toBe("function");
    expect(m.lathe_lora_meta_adapt_decide!.safeParse({ candidate: { auroc: 0.85, macroF1: 0.6, brier: 0.1 } }).success).toBe(true);
    expect(m.lathe_lora_meta_adapt_decide!.safeParse({ incumbent: { auroc: 0.8 } }).success).toBe(false); // missing candidate
    expect(m.lathe_lora_meta_adapt_decide!.safeParse(null).success).toBe(false);
  });
});
