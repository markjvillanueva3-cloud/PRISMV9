/**
 * LATHE-LORA-MS0/U-LLR-UNCERTAINTY — real-behavior tests for the calibration gate.
 *
 * Pure + deterministic (no store, no I/O). Every verdict/threshold assertion is a
 * concrete value computed by hand from the documented formula (R9 intent check) — the
 * tests fail if the renormalisation, the calibration discount, or any safety band drifts.
 * Safety overrides (S(x) bands + hazard flags) are asserted to be NON-softenable: they
 * must override even a maximal-confidence prediction.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRAUncertaintyQuantifierEngine as gate } from "../engines/LatheLoRAUncertaintyQuantifierEngine.js";

const ds = (...p: string[]) => path.resolve(__dirname, "..", ...p);

describe("LatheLoRAUncertaintyQuantifierEngine — guards + clamping", () => {
  it("throws when modelConfidence is not a finite number", () => {
    expect(() => gate.assess({ modelConfidence: NaN })).toThrow(/modelConfidence/);
    expect(() => gate.assess({} as never)).toThrow(/modelConfidence/);
    expect(() => gate.assess({ modelConfidence: "0.9" as never })).toThrow(/modelConfidence/);
  });

  it("clamps an out-of-range modelConfidence and records the clamp reason", () => {
    const r = gate.assess({ modelConfidence: 1.5, sampleSupport: 20, conflictCount: 0, paramCount: 1, historicalSuccessRate: 1 });
    expect(r.calibratedConfidence).toBe(1); // 1.0 × (1−0) — clamped from 1.5
    expect(r.reasons.some((x) => /clamped/.test(x))).toBe(true);
  });
});

describe("LatheLoRAUncertaintyQuantifierEngine — calibration math + verdict bands", () => {
  it("high confidence + full support + agreement + reliable → auto (uncertainty 0)", () => {
    const r = gate.assess({ modelConfidence: 0.95, sampleSupport: 20, conflictCount: 0, paramCount: 3, historicalSuccessRate: 0.95 });
    expect(r.uncertainty).toBe(0);
    expect(r.calibratedConfidence).toBe(0.95);
    expect(r.verdict).toBe("auto");
  });

  it("NO modulating signal → neutral uncertainty 0.5 → max-confidence still only reaches review (never auto on nothing)", () => {
    const r = gate.assess({ modelConfidence: 1 });
    expect(r.uncertainty).toBe(0.5);
    expect(r.calibratedConfidence).toBe(0.5);
    expect(r.verdict).toBe("review");
    expect(r.components.length).toBe(0); // absent signals omitted, not zero-weighted
  });

  it("epistemic: zero sample support drives uncertainty to 1 → reject; weight renormalises to 1.0", () => {
    const r = gate.assess({ modelConfidence: 0.9, sampleSupport: 0 });
    expect(r.components).toEqual([{ name: "epistemic", value: 1, weight: 1 }]);
    expect(r.uncertainty).toBe(1);
    expect(r.calibratedConfidence).toBe(0);
    expect(r.verdict).toBe("reject");
  });

  it("epistemic saturates at SUPPORT_SATURATION (20 samples → 0 uncertainty)", () => {
    const r = gate.assess({ modelConfidence: 0.9, sampleSupport: 50 });
    expect(r.components[0]?.value).toBe(0);
    expect(r.uncertainty).toBe(0);
  });

  it("conflict: 2 of 4 fused params disagreed → conflict component 0.5", () => {
    const r = gate.assess({ modelConfidence: 0.9, conflictCount: 2, paramCount: 4 });
    expect(r.components).toEqual([{ name: "conflict", value: 0.5, weight: 1 }]);
    expect(r.calibratedConfidence).toBe(0.45); // 0.9 × (1−0.5)
    expect(r.verdict).toBe("reject");
  });

  it("reliability: over-confidence (claimed 0.9, delivered 0.4) adds a 0.5 uncertainty gap", () => {
    const r = gate.assess({ modelConfidence: 0.9, historicalSuccessRate: 0.4 });
    expect(r.components).toEqual([{ name: "reliability", value: 0.5, weight: 1 }]);
    expect(r.verdict).toBe("reject"); // 0.9 × 0.5 = 0.45 < 0.5
  });

  it("reliability: UNDER-confidence adds NO uncertainty (claimed 0.9 < delivered 0.99 → 0)", () => {
    const r = gate.assess({ modelConfidence: 0.9, historicalSuccessRate: 0.99 });
    expect(r.components[0]).toEqual({ name: "reliability", value: 0, weight: 1 });
    expect(r.uncertainty).toBe(0);
    expect(r.verdict).toBe("auto"); // 0.9 × 1 = 0.9 ≥ 0.85
  });

  it("two present components renormalise their weights to sum 1", () => {
    const r = gate.assess({ modelConfidence: 1, sampleSupport: 10, conflictCount: 0, paramCount: 2 });
    // epistemic = 1−10/20 = 0.5 ; conflict = 0 ; weights 0.4/0.75 & 0.35/0.75
    const wsum = r.components.reduce((s, c) => s + c.weight, 0);
    expect(wsum).toBeCloseTo(1, 6);
    expect(r.uncertainty).toBeCloseTo(0.5 * (0.4 / 0.75), 3); // ≈0.267
    expect(r.verdict).toBe("review");
  });
});

describe("LatheLoRAUncertaintyQuantifierEngine — non-softenable safety overrides", () => {
  const strongAuto = { modelConfidence: 0.99, sampleSupport: 20, conflictCount: 0, paramCount: 3, historicalSuccessRate: 0.99 };

  it("tool-breakage hazard forces reject even at maximal confidence", () => {
    const r = gate.assess({ ...strongAuto, toolBreakageRisk: true });
    expect(r.verdict).toBe("reject");
    expect(r.reasons.some((x) => /HARD REJECT.*tool-breakage/.test(x))).toBe(true);
  });

  it("collision hazard forces reject", () => {
    expect(gate.assess({ ...strongAuto, collisionRisk: true }).verdict).toBe("reject");
  });

  it("S(x) < 0.70 (red) → reject regardless of confidence", () => {
    const r = gate.assess({ ...strongAuto, safetyScore: 0.6 });
    expect(r.verdict).toBe("reject");
    expect(r.reasons.some((x) => /S\(x\).*0\.7/.test(x))).toBe(true);
  });

  it("S(x) in [0.70,0.90) (yellow) caps an otherwise-auto prediction at review", () => {
    const r = gate.assess({ ...strongAuto, safetyScore: 0.8 });
    expect(r.verdict).toBe("review");
    expect(r.reasons.some((x) => /warning band/.test(x))).toBe(true);
  });

  it("S(x) ≥ 0.90 (green) applies no safety downgrade — auto stays auto", () => {
    expect(gate.assess({ ...strongAuto, safetyScore: 0.95 }).verdict).toBe("auto");
  });

  it("every verdict carries a non-empty reasons[] (R12 — surfaced WHY)", () => {
    expect(gate.assess({ modelConfidence: 0.9, sampleSupport: 20, conflictCount: 0, paramCount: 1, historicalSuccessRate: 0.9 }).reasons.length).toBeGreaterThan(0);
  });
});

describe("LATHE-LORA-MS0/U-LLR-UNCERTAINTY — dual dispatcher + schema wiring", () => {
  it("turningDispatcher has ACTIONS entry + case for lathe_lora_calibration_gate", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    expect(src.includes('case "lathe_lora_calibration_gate":')).toBe(true);
    expect(src.includes('"lathe_lora_calibration_gate",')).toBe(true);
  });

  it("safetyDispatcher routes lathe_lora_calibration_gate (dual-wire to prism_safety)", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "safetyDispatcher.ts"), "utf8");
    expect(src.includes("lathe_lora_calibration_gate")).toBe(true);
    expect(src.includes("LatheLoRAUncertaintyQuantifierEngine")).toBe(true);
  });

  it("turning schema requires modelConfidence; rejects missing + null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(typeof m.lathe_lora_calibration_gate?.safeParse).toBe("function");
    expect(m.lathe_lora_calibration_gate!.safeParse({ modelConfidence: 0.9 }).success).toBe(true);
    expect(m.lathe_lora_calibration_gate!.safeParse({}).success).toBe(false);
    expect(m.lathe_lora_calibration_gate!.safeParse(null).success).toBe(false);
  });

  it("safety schema registered in ACTION_SAFETY_SCHEMAS with the same contract", async () => {
    const { ACTION_SAFETY_SCHEMAS } = await import("../schemas/safetyActionSchemas.js");
    const m = ACTION_SAFETY_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(typeof m.lathe_lora_calibration_gate?.safeParse).toBe("function");
    expect(m.lathe_lora_calibration_gate!.safeParse({ modelConfidence: 0.9 }).success).toBe(true);
    expect(m.lathe_lora_calibration_gate!.safeParse({}).success).toBe(false);
  });
});
