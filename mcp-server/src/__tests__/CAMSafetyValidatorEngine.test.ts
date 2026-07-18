/**
 * CAMSafetyValidatorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-SAFETY
 */
import { describe, it, expect } from "vitest";
import { CAMSafetyValidatorEngine } from "../engines/CAMSafetyValidatorEngine.js";
import { camTemplateGeneratorEngine } from "../engines/CAMTemplateGeneratorEngine.js";
import type { CamTemplate } from "../engines/CAMTemplateGeneratorEngine.js";

const engine = new CAMSafetyValidatorEngine();

describe("CAMSafetyValidatorEngine", () => {

  it("validates a default Fusion 360 face template with S(x)=1.0 (no findings)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.sx).toBe(1.0);
    expect(r.ok).toBe(true);
    expect(r.findings.length).toBe(0);
  });

  it("blocks template w/ spindle_rpm=80000 (above 60000 ceiling)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { spindle_rpm: 80000 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.rule === "spindle_rpm_ceiling" && f.severity === "block")).toBe(true);
  });

  it("warns at spindle_rpm=45000 (approaching ceiling)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { spindle_rpm: 45000 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.findings.some((f) => f.rule === "spindle_rpm_ceiling" && f.severity === "warn")).toBe(true);
  });

  it("blocks template w/ feed_xy=50000 (above HSM ceiling)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { feed_xy: 50000 },
    }) as CamTemplate;
    expect(engine.validateTemplate(tpl).ok).toBe(false);
  });

  it("blocks template w/ retract_height=0.5 (below 1 mm collision floor)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { retract_height: 0.5 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.rule === "retract_height_floor")).toBe(true);
  });

  it("warns at retract_height=2 (marginal but not blocking)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { retract_height: 2 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.findings.some((f) => f.rule === "retract_height_floor" && f.severity === "warn")).toBe(true);
  });

  it("blocks template w/ feed_plunge=15000 (above 10000 ceiling)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { feed_plunge: 15000 },
    }) as CamTemplate;
    expect(engine.validateTemplate(tpl).ok).toBe(false);
  });

  it("warns when coolant=none (dry cutting acceptable but flagged)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { coolant: "none" },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.findings.some((f) => f.rule === "coolant_required" && f.severity === "warn")).toBe(true);
  });

  it("S(x) drops by 0.20 per block, 0.02 per warn (no negatives)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { spindle_rpm: 80000, feed_xy: 50000, retract_height: 0.5 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    // 3 blocks → S(x) = 1 - 0.60 = 0.40
    expect(r.sx).toBeCloseTo(0.40, 6);
    expect(r.ok).toBe(false);
  });

  it("S(x) floors at 0 (never negative even with many violations)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { spindle_rpm: 80000, feed_xy: 50000, retract_height: 0.5, feed_plunge: 15000, stepdown: 30 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.sx).toBeGreaterThanOrEqual(0);
  });

  it("shop_floor tier requires S(x) ≥ 0.98 to pass", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      // 1 warn → S(x) = 1 - 0.02 = 0.98 (exact threshold)
      overrides: { spindle_rpm: 45000 },
    }) as CamTemplate;
    const r = engine.validateTemplate(tpl);
    expect(r.sx).toBeCloseTo(0.98, 6);
    expect(r.ok).toBe(true);
  });

  it("listRules returns at least 6 rule ids", () => {
    expect(engine.listRules().length).toBeGreaterThanOrEqual(6);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes validate + rules", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("validate");
    expect(names).toContain("rules");
  });
});
