/**
 * TurningRulesGeneratorEngine Test Suite
 */
import { describe, it, expect } from "vitest";
import { turningRulesGeneratorEngine } from "../engines/TurningRulesGeneratorEngine.js";

describe("TurningRulesGeneratorEngine", () => {
  it("generates velocity envelopes for ISO P material", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      iso_group: "P",
    });
    const vcRules = set.rules.filter((r) => r.kind === "velocity_envelope");
    expect(vcRules.length).toBeGreaterThan(0);
    expect(vcRules[0]!.bounds.field).toBe("Vc_m_min");
  });

  it("velocity envelope bounds match Sandvik reference for P", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      iso_group: "P",
      operation: "roughing",
    });
    const vc = set.rules.find((r) => r.kind === "velocity_envelope")!;
    expect(vc.bounds.min).toBe(180);
    expect(vc.bounds.max).toBe(260);
  });

  it("ISO N (aluminum) has higher velocity than ISO S (Ti)", () => {
    const alu = turningRulesGeneratorEngine.generate({
      material: "6061",
      iso_group: "N",
      operation: "roughing",
    });
    const ti = turningRulesGeneratorEngine.generate({
      material: "Ti-6Al-4V",
      iso_group: "S",
      operation: "roughing",
    });
    const aluVc = alu.rules.find((r) => r.kind === "velocity_envelope")!;
    const tiVc = ti.rules.find((r) => r.kind === "velocity_envelope")!;
    expect(aluVc.bounds.max!).toBeGreaterThan(tiVc.bounds.max!);
  });

  it("generates feed envelope for roughing", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      operation: "roughing",
    });
    const fn = set.rules.find((r) => r.kind === "feed_envelope");
    expect(fn).toBeDefined();
    expect(fn!.bounds.min).toBe(0.2);
    expect(fn!.bounds.max).toBe(0.5);
  });

  it("finishing feed envelope is tighter than roughing", () => {
    const rough = turningRulesGeneratorEngine.generate({
      material: "4140",
      operation: "roughing",
    });
    const finish = turningRulesGeneratorEngine.generate({
      material: "4140",
      operation: "finishing",
    });
    const roughFn = rough.rules.find((r) => r.kind === "feed_envelope")!;
    const finishFn = finish.rules.find((r) => r.kind === "feed_envelope")!;
    expect(finishFn.bounds.max!).toBeLessThan(roughFn.bounds.max!);
  });

  it("generates DoC envelope for roughing", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      operation: "roughing",
    });
    const ap = set.rules.find((r) => r.kind === "doc_envelope");
    expect(ap).toBeDefined();
    expect(ap!.bounds.max!).toBeGreaterThan(ap!.bounds.min!);
  });

  it("generates spindle constraint for slant_bed", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      machine_class: "slant_bed",
    });
    const rpm = set.rules.find((r) => r.kind === "spindle_constraint");
    expect(rpm).toBeDefined();
    expect(rpm!.bounds.max).toBe(5000);
  });

  it("Swiss machines allow higher RPM than VTL", () => {
    const swiss = turningRulesGeneratorEngine.generate({
      material: "4140",
      machine_class: "swiss",
    });
    const vtl = turningRulesGeneratorEngine.generate({
      material: "4140",
      machine_class: "vertical",
    });
    const swissRpm = swiss.rules.find((r) => r.kind === "spindle_constraint")!;
    const vtlRpm = vtl.rules.find((r) => r.kind === "spindle_constraint")!;
    expect(swissRpm.bounds.max!).toBeGreaterThan(vtlRpm.bounds.max!);
  });

  it("chatter constraint: dampened > carbide > steel L/D limit", () => {
    const steel = turningRulesGeneratorEngine.generate({
      material: "4140",
      tool_type: "steel_shank_boring_bar",
    });
    const carbide = turningRulesGeneratorEngine.generate({
      material: "4140",
      tool_type: "carbide_boring_bar",
    });
    const dampened = turningRulesGeneratorEngine.generate({
      material: "4140",
      tool_type: "dampened_anti-vibration_bar",
    });
    const sLd = steel.rules.find((r) => r.kind === "chatter_constraint")!.bounds.max;
    const cLd = carbide.rules.find((r) => r.kind === "chatter_constraint")!.bounds.max;
    const dLd = dampened.rules.find((r) => r.kind === "chatter_constraint")!.bounds.max;
    expect(dLd).toBeGreaterThan(cLd!);
    expect(cLd).toBeGreaterThan(sLd!);
  });

  it("reports rule_count_by_kind", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      iso_group: "P",
      operation: "roughing",
      tool_type: "carbide_insert",
      machine_class: "slant_bed",
    });
    expect(set.rule_count_by_kind.velocity_envelope).toBeGreaterThan(0);
    expect(set.rule_count_by_kind.feed_envelope).toBeGreaterThan(0);
    expect(set.rule_count_by_kind.doc_envelope).toBeGreaterThan(0);
    expect(set.rule_count_by_kind.spindle_constraint).toBeGreaterThan(0);
    expect(set.rule_count_by_kind.chatter_constraint).toBeGreaterThan(0);
  });

  it("mergeRuleSets keeps tightest bounds", () => {
    const a = turningRulesGeneratorEngine.generate({
      material: "4140",
      operation: "roughing",
    });
    const b = turningRulesGeneratorEngine.generate({
      material: "4140",
      operation: "finishing",
    });
    const merged = turningRulesGeneratorEngine.mergeRuleSets([a, b]);
    const fn = merged.rules.find((r) => r.kind === "feed_envelope")!;
    // Merged feed should narrow to [finishing.min, finishing.max] since roughing range contains it
    expect(fn.bounds.max!).toBeLessThanOrEqual(0.5);
  });

  it("each rule has an id + source + priority", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "4140",
      iso_group: "P",
      operation: "roughing",
    });
    set.rules.forEach((r) => {
      expect(r.id).toMatch(/^rule_/);
      expect(r.source.length).toBeGreaterThan(0);
      expect(r.priority).toBeGreaterThan(0);
    });
  });

  it("empty context produces empty rule set", () => {
    const set = turningRulesGeneratorEngine.generate({ material: "4140" });
    expect(set.rules.length).toBe(0);
  });

  it("getStats reports rule kinds + ISO groups", () => {
    const s = turningRulesGeneratorEngine.getStats();
    expect(s.rule_kinds).toContain("velocity_envelope");
    expect(s.supported_iso_groups).toContain("P");
    expect(s.supported_iso_groups).toContain("S");
  });
});
