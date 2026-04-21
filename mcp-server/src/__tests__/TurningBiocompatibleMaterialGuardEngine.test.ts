/**
 * TurningBiocompatibleMaterialGuardEngine — per-engine tests (MS9 / U-LPR03)
 */
import { describe, it, expect } from "vitest";
import { turningBiocompatibleMaterialGuardEngine } from "../engines/TurningBiocompatibleMaterialGuardEngine.js";

function goodTi() {
  return {
    material: "titanium_6al4v" as const,
    coolant: { name: "synthetic_A", is_chlorinated: false, is_synthetic: true, batch_number: "B-123" },
    tooling: [{ tool_number: 1, substrate: "carbide_m", iron_contaminated: false }],
    workholding: { kind: "collet" as const, material: "aluminum_bronze", iron_contaminated: false },
    cmtr_on_file: true,
  };
}

describe("TurningBiocompatibleMaterialGuardEngine", () => {
  it("ALLOWs clean titanium setup with CMTR and non-chlorinated coolant", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check(goodTi());
    expect(r.verdict).toBe("ALLOW");
    expect(r.issues).toHaveLength(0);
  });

  it("BLOCKS titanium run with chlorinated coolant (ASTM F86)", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      coolant: { name: "chlor_oil", is_chlorinated: true, batch_number: "B-X" },
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.issues.some(i => i.rule === "TI_NO_CHLORINATED_COOLANT")).toBe(true);
  });

  it("BLOCKS titanium run with iron-contaminated tool", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      tooling: [{ tool_number: 1, substrate: "carbide_p25", iron_contaminated: true }],
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.issues.some(i => i.rule === "TI_NO_IRON_CONTACT")).toBe(true);
  });

  it("BLOCKS titanium run with iron-contaminated workholding", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      workholding: { kind: "chuck", material: "steel", iron_contaminated: true },
    });
    expect(r.verdict).toBe("BLOCK");
  });

  it("BLOCKS without CMTR for implant material", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      cmtr_on_file: false,
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.issues.some(i => i.rule === "CMTR_REQUIRED")).toBe(true);
  });

  it("WARNs implant-grade stainless without dedicated machine", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      material: "stainless_316l",
      coolant: { name: "synth", is_chlorinated: false, batch_number: "B-1" },
      tooling: [{ tool_number: 1, substrate: "carbide_m", iron_contaminated: false }],
      workholding: { kind: "collet", material: "brass", iron_contaminated: false },
      cmtr_on_file: true,
      dedicated_machine: false,
    });
    expect(r.verdict).toBe("WARN");
    expect(r.issues.some(i => i.rule === "IMPLANT_SS_DEDICATED")).toBe(true);
  });

  it("ALLOWs implant-grade stainless on dedicated machine", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      material: "stainless_316l",
      coolant: { name: "synth", is_chlorinated: false, batch_number: "B-1" },
      tooling: [{ tool_number: 1, substrate: "carbide_m", iron_contaminated: false }],
      workholding: { kind: "collet", material: "brass", iron_contaminated: false },
      cmtr_on_file: true,
      dedicated_machine: true,
    });
    expect(r.verdict).toBe("ALLOW");
  });

  it("BLOCKS CoCr with aluminum-contaminated tool", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      material: "cocr_mo",
      coolant: { name: "synth", is_chlorinated: false, batch_number: "B-1" },
      tooling: [
        { tool_number: 1, substrate: "CBN", iron_contaminated: false, aluminum_contaminated: true },
      ],
      workholding: { kind: "chuck", material: "steel", iron_contaminated: false },
      cmtr_on_file: true,
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.issues.some(i => i.rule === "COCR_NO_ALUMINUM_CONTACT")).toBe(true);
  });

  it("WARNs CoCr without CBN/ceramic inserts", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      material: "cocr_w",
      coolant: { name: "synth", is_chlorinated: false, batch_number: "B-1" },
      tooling: [{ tool_number: 1, substrate: "carbide_m", iron_contaminated: false }],
      workholding: { kind: "chuck", material: "steel", iron_contaminated: false },
      cmtr_on_file: true,
    });
    expect(r.verdict).toBe("WARN");
    expect(r.issues.some(i => i.rule === "COCR_PREFERRED_TOOLING")).toBe(true);
  });

  it("non_implant material passes without CMTR requirement", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      material: "non_implant",
      coolant: { name: "synth", is_chlorinated: true, batch_number: "B-1" }, // chlorinated OK on non-implant
      tooling: [{ tool_number: 1, substrate: "carbide_p", iron_contaminated: true }],
      workholding: { kind: "chuck", material: "steel", iron_contaminated: true },
      cmtr_on_file: false,
    });
    expect(r.verdict).toBe("ALLOW");
  });

  it("multiple issues aggregate correctly", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      coolant: { name: "chlor", is_chlorinated: true, batch_number: "B" },
      tooling: [
        { tool_number: 1, substrate: "carbide", iron_contaminated: true },
        { tool_number: 2, substrate: "carbide", iron_contaminated: true },
      ],
      workholding: { kind: "chuck", material: "steel", iron_contaminated: true },
      cmtr_on_file: false,
    });
    expect(r.verdict).toBe("BLOCK");
    expect(r.issues.filter(i => i.severity === "critical").length).toBeGreaterThanOrEqual(4);
  });

  it("reasons array populated for every verdict", () => {
    const allow = turningBiocompatibleMaterialGuardEngine.check(goodTi());
    expect(allow.reasons.length).toBeGreaterThan(0);
    const block = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      cmtr_on_file: false,
    });
    expect(block.reasons.length).toBeGreaterThan(0);
  });

  it("issue detail references specific tool number for TI_NO_IRON_CONTACT", () => {
    const r = turningBiocompatibleMaterialGuardEngine.check({
      ...goodTi(),
      tooling: [
        { tool_number: 7, substrate: "carbide", iron_contaminated: true },
      ],
    });
    const issue = r.issues.find(i => i.rule === "TI_NO_IRON_CONTACT")!;
    expect(issue.detail).toMatch(/Tool 7/);
  });
});
