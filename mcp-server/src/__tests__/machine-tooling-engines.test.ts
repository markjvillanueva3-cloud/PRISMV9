/**
 * Tests for Machine & Tooling Intelligence Engine Batch 12:
 * MachineSelection, ToolSelection, ToolCrib, ToolholderDynamics,
 * MachinabilityRating, MaterialEquivalence, MaterialSelection, TensileToMachinability
 */
import { describe, it, expect } from "vitest";
import { machineSelectionEngine } from "../engines/MachineSelectionEngine.js";
import { toolSelectionEngine } from "../engines/ToolSelectionEngine.js";
import { toolCribEngine } from "../engines/ToolCribEngine.js";
import { toolholderDynamicsEngine } from "../engines/ToolholderDynamicsEngine.js";
import { machinabilityRatingEngine } from "../engines/MachinabilityRatingEngine.js";
import { materialEquivalenceEngine } from "../engines/MaterialEquivalenceEngine.js";
import { materialSelectionEngine } from "../engines/MaterialSelectionEngine.js";
import { tensileToMachinabilityEngine } from "../engines/TensileToMachinabilityEngine.js";

// ── Machine Selection ────────────────────────────────────────────
describe("MachineSelectionEngine", () => {
  it("recommends machines for requirements", () => {
    const r = machineSelectionEngine.recommend({
      part_envelope_mm: { x: 300, y: 200, z: 100 },
      operations: ["face_mill", "drill", "bore"],
      material_iso_group: "P",
    });
    expect(r).toBeDefined();
    expect(Array.isArray(r)).toBe(true);
  });

  it("compares machines", () => {
    const r = machineSelectionEngine.compare(["haas_vf2", "dmg_635"]);
    expect(r).toBeDefined();
  });

  it("validates machine for operation", () => {
    const r = machineSelectionEngine.validate("haas_vf2", {
      part_envelope_mm: { x: 200, y: 150, z: 80 },
      operations: ["face_mill"],
    });
    expect(r).toBeDefined();
  });
});

// ── Tool Selection ───────────────────────────────────────────────
describe("ToolSelectionEngine", () => {
  const req = {
    operation_type: "face_mill",
    material_iso_group: "P",
    feature_diameter_mm: 50,
  };

  it("recommends tools", () => {
    const r = toolSelectionEngine.recommend(req);
    expect(r).toBeDefined();
    expect(Array.isArray(r)).toBe(true);
  });

  it("compares tools", () => {
    const r = toolSelectionEngine.compare(["tool_a", "tool_b"], req);
    expect(r).toBeDefined();
  });

  it("suggests alternatives", () => {
    const r = toolSelectionEngine.alternatives("indexable_facemill_50", req);
    expect(r).toBeDefined();
  });
});

// ── Tool Crib ────────────────────────────────────────────────────
describe("ToolCribEngine", () => {
  it("checks out a tool", () => {
    const r = toolCribEngine.checkout("EM-10-4F", "OP-001", "HAAS-VF2", "JOB-100");
    expect(r).toBeDefined();
    expect(r.success).toBeDefined();
    expect(r.message).toBeDefined();
  });

  it("checks in a tool", () => {
    toolCribEngine.checkout("EM-12-4F", "OP-001", "HAAS-VF2", "JOB-100");
    const r = toolCribEngine.checkin("EM-12-4F", "OP-001", 45, "worn");
    expect(r).toBeDefined();
  });

  it("generates inventory report", () => {
    const r = toolCribEngine.inventoryReport();
    expect(r).toBeDefined();
    expect(r.total_items).toBeGreaterThanOrEqual(0);
  });

  it("generates reorder recommendations", () => {
    const r = toolCribEngine.reorderRecommendations();
    expect(r).toBeDefined();
    expect(Array.isArray(r)).toBe(true);
  });
});

// ── Toolholder Dynamics ──────────────────────────────────────────
describe("ToolholderDynamicsEngine", () => {
  const input = {
    holder_type: "shrink_fit" as const,
    taper: "HSK-A63" as const,
    gauge_length_mm: 120,
    holder_diameter_mm: 40,
    tool_diameter_mm: 10,
    tool_stickout_mm: 45,
    tool_material: "carbide" as const,
  };

  it("analyzes FRF", () => {
    const r = toolholderDynamicsEngine.analyzeFRF(input);
    expect(r.natural_freq_Hz).toBeGreaterThan(0);
    expect(r.static_stiffness_N_per_um).toBeGreaterThan(0);
    expect(r.damping_ratio).toBeGreaterThan(0);
  });

  it("compares two holders", () => {
    const collet = { ...input, holder_type: "collet" as const };
    const r = toolholderDynamicsEngine.compare(input, collet);
    expect(r.recommended).toBeDefined();
    expect(r.stiffness_ratio).toBeGreaterThan(0);
  });

  it("shrink fit stiffer than collet", () => {
    const shrink = toolholderDynamicsEngine.analyzeFRF(input);
    const collet = toolholderDynamicsEngine.analyzeFRF({
      ...input, holder_type: "collet" as const,
    });
    expect(shrink.static_stiffness_N_per_um).toBeGreaterThanOrEqual(
      collet.static_stiffness_N_per_um
    );
  });
});

// ── Machinability Rating ─────────────────────────────────────────
describe("MachinabilityRatingEngine", () => {
  it("rates material machinability", () => {
    const r = machinabilityRatingEngine.rate({ material_name: "1018" });
    expect(r.overall_rating).toBeGreaterThan(0);
    expect(r.category).toBeDefined();
    expect(r.notes.some((note) => note.includes("[Playbook"))).toBe(true);
  });

  it("harder material = lower rating", () => {
    const soft = machinabilityRatingEngine.rate({
      material_name: "1018", hardness_HRC: 15,
    });
    const hard = machinabilityRatingEngine.rate({
      material_name: "4340", hardness_HRC: 45,
    });
    expect(soft.overall_rating).toBeGreaterThan(hard.overall_rating);
  });

  it("compares materials", () => {
    const r = machinabilityRatingEngine.compare([
      { material_name: "1018" },
      { material_name: "316L" },
    ]);
    expect(r.materials).toBeDefined();
    expect(r.materials.length).toBe(2);
  });
});

// ── Material Equivalence ─────────────────────────────────────────
describe("MaterialEquivalenceEngine", () => {
  it("finds equivalent for AISI 4140", () => {
    const r = materialEquivalenceEngine.findEquivalent({
      designation: "4140",
      from_standard: "AISI",
    });
    expect(r).toBeDefined();
    expect(r.equivalents.length).toBeGreaterThan(0);
  });

  it("finds specific standard equivalent", () => {
    const r = materialEquivalenceEngine.findEquivalent({
      designation: "4140",
      from_standard: "AISI",
      to_standard: "DIN",
    });
    expect(r).toBeDefined();
  });

  it("compares two materials", () => {
    const r = materialEquivalenceEngine.compare("4140", "4340");
    expect(r).toBeDefined();
    expect(r.match_pct).toBeDefined();
  });
});

// ── Material Selection ───────────────────────────────────────────
describe("MaterialSelectionEngine", () => {
  it("recommends materials", () => {
    const r = materialSelectionEngine.recommend({
      application: "structural",
      min_tensile_MPa: 500,
    });
    expect(r).toBeDefined();
    expect(Array.isArray(r)).toBe(true);
  });

  it("compares materials", () => {
    const r = materialSelectionEngine.compare(["4140", "4340"]);
    expect(r).toBeDefined();
  });

  it("reports machinability", () => {
    const r = materialSelectionEngine.machinability("4140");
    expect(r).toBeDefined();
  });
});

// ── Tensile to Machinability ─────────────────────────────────────
describe("TensileToMachinabilityEngine", () => {
  it("converts tensile data to machinability", () => {
    const r = tensileToMachinabilityEngine.convert({
      ultimate_tensile_MPa: 620,
      yield_strength_MPa: 415,
      elongation_pct: 22,
      hardness_HBW: 187,
      material_class: "alloy_steel",
    });
    expect(r.machinability_rating_pct).toBeGreaterThan(0);
    expect(r.specific_cutting_force_N_mm2).toBeGreaterThan(0);
    expect(r.chip_type).toBeDefined();
    expect(r.tool_recommendation).toBeDefined();
  });

  it("aluminum has higher machinability than titanium", () => {
    const al = tensileToMachinabilityEngine.convert({
      ultimate_tensile_MPa: 310,
      yield_strength_MPa: 275,
      elongation_pct: 17,
      hardness_HBW: 95,
      material_class: "aluminum",
    });
    const ti = tensileToMachinabilityEngine.convert({
      ultimate_tensile_MPa: 950,
      yield_strength_MPa: 880,
      elongation_pct: 14,
      hardness_HBW: 334,
      material_class: "titanium",
    });
    expect(al.machinability_rating_pct).toBeGreaterThan(
      ti.machinability_rating_pct
    );
  });

  it("higher tensile = higher cutting force", () => {
    const lo = tensileToMachinabilityEngine.convert({
      ultimate_tensile_MPa: 400,
      yield_strength_MPa: 250,
      elongation_pct: 30,
      hardness_HBW: 120,
      material_class: "carbon_steel",
    });
    const hi = tensileToMachinabilityEngine.convert({
      ultimate_tensile_MPa: 1200,
      yield_strength_MPa: 1000,
      elongation_pct: 10,
      hardness_HBW: 360,
      material_class: "alloy_steel",
    });
    expect(hi.specific_cutting_force_N_mm2).toBeGreaterThan(
      lo.specific_cutting_force_N_mm2
    );
  });
});
