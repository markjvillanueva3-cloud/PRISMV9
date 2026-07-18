/**
 * CAMMultiSetupPlannerEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-SETUPS
 */
import { describe, it, expect } from "vitest";
import { CAMMultiSetupPlannerEngine } from "../engines/CAMMultiSetupPlannerEngine.js";
import type { FeatureForSetup } from "../engines/CAMMultiSetupPlannerEngine.js";

const engine = new CAMMultiSetupPlannerEngine();

describe("CAMMultiSetupPlannerEngine", () => {

  it("3-axis VMC, all features +Z accessible → single setup", () => {
    const features: FeatureForSetup[] = [
      { id: "F1", featureClass: "face",      accessVector: "+Z" },
      { id: "F2", featureClass: "pocket_2d", accessVector: "+Z" },
      { id: "F3", featureClass: "thru_hole", accessVector: "+Z" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_3axis" });
    expect(p.setups.length).toBe(1);
    expect(p.setups[0].upAxis).toBe("+Z");
    expect(p.setups[0].features.length).toBe(3);
    expect(p.refixtureCount).toBe(0);
    expect(p.unreachable.length).toBe(0);
  });

  it("3-axis VMC, top + bottom features → bottom is unreachable", () => {
    const features: FeatureForSetup[] = [
      { id: "F_top",    featureClass: "face",      accessVector: "+Z" },
      { id: "F_bottom", featureClass: "pocket_2d", accessVector: "-Z" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_3axis" });
    expect(p.setups.length).toBe(1);
    expect(p.unreachable).toContain("F_bottom");
  });

  it("5-axis trunnion folds all reachable features into ONE setup", () => {
    const features: FeatureForSetup[] = [
      { id: "Ftop",    featureClass: "face",          accessVector: "+Z" },
      { id: "Fbot",    featureClass: "pocket_2d",     accessVector: "-Z" },
      { id: "Fleft",   featureClass: "thru_hole",     accessVector: "-X" },
      { id: "Fblade",  featureClass: "impeller_blade",accessVector: "5axis" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_5axis" });
    expect(p.setups.length).toBe(1);
    expect(p.setups[0].features.length).toBe(4);
    expect(p.refixtureCount).toBe(0);
  });

  it("4-axis VMC reaches +Z + +X + -X (rotary axes)", () => {
    const features: FeatureForSetup[] = [
      { id: "Ftop",  featureClass: "face", accessVector: "+Z" },
      { id: "Fpx",   featureClass: "thru_hole", accessVector: "+X" },
      { id: "Fmx",   featureClass: "thru_hole", accessVector: "-X" },
      { id: "Fpy",   featureClass: "thru_hole", accessVector: "+Y" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_4axis" });
    expect(p.setups.length).toBe(3);
    expect(p.setups[0].upAxis).toBe("+Z");
    expect(p.setups[1].upAxis).toBe("+X");
    expect(p.setups[2].upAxis).toBe("-X");
    expect(p.unreachable).toContain("Fpy");
  });

  it("HMC tombstone reaches 4 sides (+Z + lateral all)", () => {
    const features: FeatureForSetup[] = [
      { id: "F1", featureClass: "face", accessVector: "+Z" },
      { id: "F2", featureClass: "thru_hole", accessVector: "+X" },
      { id: "F3", featureClass: "thru_hole", accessVector: "-X" },
      { id: "F4", featureClass: "thru_hole", accessVector: "+Y" },
      { id: "F5", featureClass: "thru_hole", accessVector: "-Y" },
    ];
    const p = engine.plan({ features, machineClass: "hmc" });
    expect(p.setups.length).toBe(5);
    expect(p.unreachable.length).toBe(0);
  });

  it("setup order: +Z first, then lateral", () => {
    const features: FeatureForSetup[] = [
      { id: "Fmx",   featureClass: "thru_hole", accessVector: "-X" },
      { id: "Ftop",  featureClass: "face", accessVector: "+Z" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_4axis" });
    expect(p.setups[0].upAxis).toBe("+Z");
    expect(p.setups[1].upAxis).toBe("-X");
  });

  it("re-fixture instruction emitted between consecutive setups", () => {
    const features: FeatureForSetup[] = [
      { id: "F1", featureClass: "face", accessVector: "+Z" },
      { id: "F2", featureClass: "thru_hole", accessVector: "+X" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_4axis" });
    expect(typeof p.setups[0].refixtureFrom === "undefined").toBe(true);
    expect(typeof p.setups[1].refixtureFrom).toBe("string");
    expect(p.setups[1].refixtureFrom!).toMatch(/tip|90/i);
  });

  it("re-fixture from +Z to -X uses the tip-90 instruction", () => {
    const features: FeatureForSetup[] = [
      { id: "F1", featureClass: "face", accessVector: "+Z" },
      { id: "F2", featureClass: "thru_hole", accessVector: "-X" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_4axis" });
    expect(p.setups[1].refixtureFrom!).toMatch(/tip part 90/i);
  });

  it("lathe only reaches +Z (spindle line)", () => {
    const features: FeatureForSetup[] = [
      { id: "F1", featureClass: "external_profile", accessVector: "+Z" },
      { id: "F2", featureClass: "thru_hole",        accessVector: "+X" },
    ];
    const p = engine.plan({ features, machineClass: "lathe" });
    expect(p.setups.length).toBe(1);
    expect(p.unreachable).toContain("F2");
  });

  it("empty features → empty setups + zero refixtures", () => {
    const p = engine.plan({ features: [], machineClass: "vmc_3axis" });
    expect(p.setups.length).toBe(0);
    expect(p.refixtureCount).toBe(0);
    expect(p.unreachable.length).toBe(0);
  });

  it("refixtureCount = setups.length - 1", () => {
    const features: FeatureForSetup[] = [
      { id: "F1", featureClass: "face", accessVector: "+Z" },
      { id: "F2", featureClass: "thru_hole", accessVector: "+X" },
      { id: "F3", featureClass: "thru_hole", accessVector: "-X" },
    ];
    const p = engine.plan({ features, machineClass: "vmc_4axis" });
    expect(p.refixtureCount).toBe(p.setups.length - 1);
    expect(p.refixtureCount).toBe(2);
  });

  it("reachable(vmc_3axis) → [+Z] only", () => {
    const r = engine.reachable("vmc_3axis");
    expect(r).toEqual(["+Z"]);
  });

  it("reachable(vmc_5axis) → 7 vectors including 5axis", () => {
    const r = engine.reachable("vmc_5axis");
    expect(r.length).toBe(7);
    expect(r).toContain("5axis");
  });

  it("reachable(hmc) → 5 vectors (no -Z)", () => {
    const r = engine.reachable("hmc");
    expect(r.length).toBe(5);
    expect(r).toContain("+Z");
    expect(r).toContain("+X");
    expect(r).toContain("-Y");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes plan + reachable", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("plan");
    expect(names).toContain("reachable");
  });
});
