/**
 * TurningQualityComplianceEngine — per-engine tests (MS8 / U-LPQ05-08)
 */
import { describe, it, expect } from "vitest";
import { turningQualityComplianceEngine } from "../engines/TurningQualityComplianceEngine.js";

function features(n = 3) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push({
      id: `F${i}`,
      criticality: "functional" as const,
      nominal_mm: 10 + i,
      tolerance_mm: 0.02,
      has_gdt: false,
    });
  }
  return out;
}

describe("TurningQualityComplianceEngine", () => {
  it("none regime requires only inspection plan", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-001",
      regime: "none",
      lot_size: 10,
      features: features(),
    });
    const ip = r.artefacts.find(a => a.name === "inspection_plan")!;
    expect(ip.required).toBe(true);
    const fai = r.artefacts.find(a => a.name === "fai")!;
    expect(fai.required).toBe(false);
  });

  it("aerospace regime requires FAI", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-002",
      regime: "aerospace",
      lot_size: 50,
      features: features(),
    });
    expect(r.artefacts.find(a => a.name === "fai")!.required).toBe(true);
  });

  it("CMM program required when any feature has GD&T", () => {
    const f = features();
    f[0]!.has_gdt = true;
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-003",
      regime: "none",
      lot_size: 10,
      features: f,
    });
    expect(r.artefacts.find(a => a.name === "cmm_program")!.required).toBe(true);
  });

  it("CMM not required when no GD&T and regime is none", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-004",
      regime: "none",
      lot_size: 10,
      features: features(),
    });
    expect(r.artefacts.find(a => a.name === "cmm_program")!.required).toBe(false);
  });

  it("SPC required when lot_size ≥ threshold", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-005",
      regime: "none",
      lot_size: 50,
      features: features(),
      spc_threshold: 30,
    });
    expect(r.artefacts.find(a => a.name === "spc_prediction")!.required).toBe(true);
  });

  it("SPC required for medical regardless of lot size", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-006",
      regime: "medical",
      lot_size: 5,
      features: features(),
    });
    expect(r.artefacts.find(a => a.name === "spc_prediction")!.required).toBe(true);
  });

  it("Gage R&R required for any critical feature", () => {
    const f = features();
    f[0]!.criticality = "critical";
    f[0]!.gage_uncertainty_mm = 0.001;
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-007",
      regime: "none",
      lot_size: 10,
      features: f,
    });
    expect(r.artefacts.find(a => a.name === "gage_rr")!.required).toBe(true);
  });

  it("Gage R&R fails when gage_uncertainty / tolerance > 10%", () => {
    const f = features();
    f[0]!.criticality = "critical";
    f[0]!.gage_uncertainty_mm = 0.005; // 25% of 0.02mm tol
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-008",
      regime: "none",
      lot_size: 10,
      features: f,
    });
    const gage = r.artefacts.find(a => a.name === "gage_rr")!;
    expect(gage.blocking_issue).toBeDefined();
    expect(r.is_compliant).toBe(false);
  });

  it("Gage R&R passes when ratio ≤ 10%", () => {
    const f = features();
    f[0]!.criticality = "critical";
    f[0]!.gage_uncertainty_mm = 0.001; // 5% of 0.02mm
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-009",
      regime: "none",
      lot_size: 10,
      features: f,
    });
    expect(r.artefacts.find(a => a.name === "gage_rr")!.blocking_issue).toBeUndefined();
  });

  it("flags missing gage_uncertainty_mm on critical features", () => {
    const f = features();
    f[0]!.criticality = "critical";
    // Deliberately leave gage_uncertainty_mm undefined.
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-010",
      regime: "none",
      lot_size: 10,
      features: f,
    });
    expect(r.artefacts.find(a => a.name === "gage_rr")!.blocking_issue).toMatch(/gage_uncertainty_mm missing/);
  });

  it("safety_critical regime activates all artefacts", () => {
    const f = features();
    f[0]!.criticality = "safety_critical";
    f[0]!.gage_uncertainty_mm = 0.001;
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-011",
      regime: "safety_critical",
      lot_size: 5,
      features: f,
    });
    expect(r.artefacts.find(a => a.name === "fai")!.required).toBe(true);
    expect(r.artefacts.find(a => a.name === "spc_prediction")!.required).toBe(true);
    expect(r.artefacts.find(a => a.name === "gage_rr")!.required).toBe(true);
  });

  it("checkPackage marks is_compliant=true when all required produced", () => {
    const f = features();
    f[0]!.criticality = "critical";
    f[0]!.gage_uncertainty_mm = 0.001;
    const req = turningQualityComplianceEngine.planRequirements({
      part_id: "P-012",
      regime: "aerospace",
      lot_size: 50,
      features: f,
    });
    const final = turningQualityComplianceEngine.checkPackage(req, {
      inspection_plan: true,
      fai: true,
      cmm_program: true,
      spc_prediction: true,
      gage_rr: true,
    });
    expect(final.is_compliant).toBe(true);
  });

  it("checkPackage flags missing artefacts as blocking", () => {
    const req = turningQualityComplianceEngine.planRequirements({
      part_id: "P-013",
      regime: "aerospace",
      lot_size: 50,
      features: features(),
    });
    const final = turningQualityComplianceEngine.checkPackage(req, {
      inspection_plan: true,
      fai: false,
    });
    expect(final.is_compliant).toBe(false);
    expect(final.blocking_issues.some(b => /fai/.test(b))).toBe(true);
  });

  it("warns on empty feature list", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-014",
      regime: "none",
      lot_size: 1,
      features: [],
    });
    expect(r.warnings.some(w => /No features/.test(w))).toBe(true);
  });

  it("returns one artefact per category (5 total)", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-015",
      regime: "none",
      lot_size: 10,
      features: features(),
    });
    expect(r.artefacts).toHaveLength(5);
  });

  it("regime + part_id + lot_size echoed on output", () => {
    const r = turningQualityComplianceEngine.planRequirements({
      part_id: "P-016",
      regime: "medical",
      lot_size: 42,
      features: features(),
    });
    expect(r.part_id).toBe("P-016");
    expect(r.regime).toBe("medical");
    expect(r.lot_size).toBe(42);
  });
});
