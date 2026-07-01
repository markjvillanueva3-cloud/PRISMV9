/**
 * Tests: IndustryStandardsComplianceEngine, TestingProtocolEngine, CertificationTrackingEngine
 * 40+ tests covering ISO 2768, AS9100, ISO 13485, IATF 16949, DIN 65151, ISO 14644,
 * ISO 3685 tool life protocols, ISO 4287/4288 surface finish, ISO 14253-1 dimensional,
 * material cert validation, tool cert tracking, machine calibration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  IndustryStandardsComplianceEngine,
} from "../engines/IndustryStandardsComplianceEngine.js";
import {
  TestingProtocolEngine,
} from "../engines/TestingProtocolEngine.js";
import {
  CertificationTrackingEngine,
} from "../engines/CertificationTrackingEngine.js";

// ============================================================================
// IndustryStandardsComplianceEngine
// ============================================================================

describe("IndustryStandardsComplianceEngine", () => {
  const engine = new IndustryStandardsComplianceEngine();

  describe("checkCompliance", () => {
    it("should pass ISO 2768 fine tolerance check for aerospace part", () => {
      const result = engine.checkCompliance({
        industry: "aerospace",
        part: { material: "Ti-6Al-4V", tolerances_mm: [0.05], process: "milling" },
      });
      expect(result.compliant).toBe(true);
      expect(result.standard_checks.length).toBeGreaterThan(0);
      const iso2768 = result.standard_checks.find(c => c.standard === "ISO 2768");
      expect(iso2768).toBeDefined();
      expect(iso2768!.passes).toBe(true);
    });

    it("should fail ISO 2768 when tolerance exceeds fine class limit", () => {
      const result = engine.checkCompliance({
        industry: "aerospace",
        part: { material: "Ti-6Al-4V", tolerances_mm: [0.5] },
      });
      const iso2768Checks = result.standard_checks.filter(c => c.standard === "ISO 2768");
      const failedCheck = iso2768Checks.find(c => !c.passes);
      expect(failedCheck).toBeDefined();
      expect(result.non_conformances.length).toBeGreaterThan(0);
      expect(result.compliant).toBe(false);
    });

    it("should check ISO 1302 surface finish for milling", () => {
      const result = engine.checkCompliance({
        industry: "general",
        part: { material: "steel", surface_finish_Ra_um: 1.2, process: "milling" },
      });
      const iso1302 = result.standard_checks.find(c => c.standard === "ISO 1302");
      expect(iso1302).toBeDefined();
      expect(iso1302!.passes).toBe(true);
    });

    it("should fail ISO 1302 when Ra exceeds typical for process", () => {
      const result = engine.checkCompliance({
        industry: "general",
        part: { material: "steel", surface_finish_Ra_um: 5.0, process: "milling" },
      });
      const iso1302 = result.standard_checks.find(c => c.standard === "ISO 1302");
      expect(iso1302).toBeDefined();
      expect(iso1302!.passes).toBe(false);
      expect(result.non_conformances.some(nc => nc.standard === "ISO 1302")).toBe(true);
    });

    it("should include AS9100 requirements for aerospace", () => {
      const result = engine.checkCompliance({
        industry: "aerospace",
        part: { material: "Inconel 718" },
      });
      const as9100 = result.standard_checks.filter(c => c.standard === "AS9100");
      expect(as9100.length).toBeGreaterThan(5);
      expect(result.required_documentation).toContain("FAI Report (AS9102)");
      expect(result.required_documentation).toContain("Material Certificate");
    });

    it("should include DIN 65151 surface check for aerospace", () => {
      const result = engine.checkCompliance({
        industry: "aerospace",
        part: { material: "Ti-6Al-4V", surface_finish_Ra_um: 2.0, process: "turning" },
      });
      const din = result.standard_checks.find(c => c.standard === "DIN 65151");
      expect(din).toBeDefined();
      expect(din!.passes).toBe(true);
    });

    it("should fail DIN 65151 for excessive surface roughness", () => {
      const result = engine.checkCompliance({
        industry: "aerospace",
        part: { material: "Ti-6Al-4V", surface_finish_Ra_um: 6.5, process: "turning" },
      });
      const din = result.standard_checks.find(c => c.standard === "DIN 65151");
      expect(din).toBeDefined();
      expect(din!.passes).toBe(false);
    });

    it("should include ISO 13485 requirements for medical", () => {
      const result = engine.checkCompliance({
        industry: "medical",
        part: { material: "CoCrMo", process: "grinding" },
      });
      const med = result.standard_checks.filter(c => c.standard === "ISO 13485");
      expect(med.length).toBeGreaterThan(5);
      expect(result.required_documentation).toContain("ISO 10993 Test Report");
      expect(result.required_documentation).toContain("Risk Management File");
    });

    it("should include ISO 14644 cleanroom for medical", () => {
      const result = engine.checkCompliance({
        industry: "medical",
        part: { material: "PEEK" },
      });
      const cleanroom = result.standard_checks.find(c => c.standard === "ISO 14644");
      expect(cleanroom).toBeDefined();
      expect(result.required_documentation).toContain("Cleanroom Certification");
    });

    it("should include IATF 16949 for automotive", () => {
      const result = engine.checkCompliance({
        industry: "automotive",
        part: { material: "4140 steel", process: "turning" },
      });
      const iatf = result.standard_checks.filter(c => c.standard === "IATF 16949");
      expect(iatf.length).toBeGreaterThan(5);
      expect(result.required_documentation).toContain("PPAP Package");
      expect(result.required_documentation).toContain("Cpk Study");
    });

    it("should use medium tolerance class for automotive", () => {
      const result = engine.checkCompliance({
        industry: "automotive",
        part: { material: "steel", tolerances_mm: [0.15] },
      });
      const iso2768 = result.standard_checks.find(c => c.standard === "ISO 2768");
      expect(iso2768).toBeDefined();
      expect(iso2768!.requirement).toContain("medium");
    });

    it("should allow custom standards list", () => {
      const result = engine.checkCompliance({
        industry: "general",
        standards: ["ISO 2768"],
        part: { material: "aluminum", tolerances_mm: [0.1] },
      });
      // Only ISO 2768 checks, no ISO 1302
      expect(result.standard_checks.every(c => c.standard === "ISO 2768")).toBe(true);
    });

    it("should handle part with no tolerances or surface finish specified", () => {
      const result = engine.checkCompliance({
        industry: "general",
        part: { material: "steel" },
      });
      expect(result.compliant).toBe(true);
      expect(result.standard_checks.length).toBeGreaterThan(0);
    });

    it("should deduplicate required documentation", () => {
      const result = engine.checkCompliance({
        industry: "aerospace",
        part: { material: "Ti-6Al-4V", surface_finish_Ra_um: 0.8 },
      });
      const uniqueDocs = new Set(result.required_documentation);
      expect(uniqueDocs.size).toBe(result.required_documentation.length);
    });

    it("should check grinding surface finish with ISO 1302", () => {
      const result = engine.checkCompliance({
        industry: "general",
        part: { material: "steel", surface_finish_Ra_um: 0.2, process: "grinding" },
      });
      const iso1302 = result.standard_checks.find(c => c.standard === "ISO 1302");
      expect(iso1302).toBeDefined();
      expect(iso1302!.passes).toBe(true);
    });
  });

  describe("getRequirements", () => {
    it("should return ISO 2768 tolerance bands for general milling", () => {
      const result = engine.getRequirements({
        industry: "general",
        process_type: "milling",
      });
      expect(result.industry).toBe("general");
      expect(result.requirements.length).toBeGreaterThan(5);
      const tolReqs = result.requirements.filter(r => r.standard === "ISO 2768");
      expect(tolReqs.length).toBeGreaterThan(0);
    });

    it("should return aerospace requirements including AS9100", () => {
      const result = engine.getRequirements({
        industry: "aerospace",
        process_type: "turning",
      });
      const as9100 = result.requirements.filter(r => r.standard === "AS9100");
      expect(as9100.length).toBeGreaterThan(5);
      expect(as9100.every(r => r.mandatory)).toBe(true);
    });

    it("should return medical requirements including ISO 13485", () => {
      const result = engine.getRequirements({
        industry: "medical",
        process_type: "grinding",
      });
      const med = result.requirements.filter(r => r.standard === "ISO 13485");
      expect(med.length).toBeGreaterThan(5);
    });

    it("should return DIN 65151 surface limits for aerospace", () => {
      const result = engine.getRequirements({
        industry: "aerospace",
        process_type: "milling",
      });
      const din = result.requirements.filter(r => r.standard === "DIN 65151");
      expect(din.length).toBeGreaterThan(3);
      expect(din.some(r => r.requirement.includes("bearing_surface"))).toBe(true);
    });

    it("should include ISO 1302 surface data for known processes", () => {
      const result = engine.getRequirements({
        industry: "general",
        process_type: "honing",
      });
      const iso1302 = result.requirements.filter(r => r.standard === "ISO 1302");
      expect(iso1302.some(r => r.requirement.includes("honing"))).toBe(true);
    });
  });

  describe("suggestStandards", () => {
    it("should suggest aerospace standards for titanium", () => {
      const result = engine.suggestStandards({
        material: "Ti-6Al-4V",
        process: "milling",
        application: "aerospace bracket",
      });
      expect(result.standards.some(s => s.standard === "AS9100")).toBe(true);
      expect(result.standards.some(s => s.standard === "DIN 65151")).toBe(true);
    });

    it("should suggest medical standards for cobalt chrome", () => {
      const result = engine.suggestStandards({
        material: "CoCrMo cobalt",
        process: "grinding",
        application: "medical implant",
      });
      expect(result.standards.some(s => s.standard === "ISO 13485")).toBe(true);
      expect(result.standards.some(s => s.standard === "ISO 10993")).toBe(true);
    });

    it("should suggest automotive standards for vehicle application", () => {
      const result = engine.suggestStandards({
        material: "4140 steel",
        process: "turning",
        application: "automotive powertrain",
      });
      expect(result.standards.some(s => s.standard === "IATF 16949")).toBe(true);
    });

    it("should always suggest ISO 2768", () => {
      const result = engine.suggestStandards({
        material: "aluminum",
        process: "milling",
      });
      expect(result.standards.some(s => s.standard === "ISO 2768")).toBe(true);
    });

    it("should return standards sorted by relevance", () => {
      const result = engine.suggestStandards({
        material: "Inconel 718",
        process: "turning",
        application: "aerospace turbine",
      });
      for (let i = 1; i < result.standards.length; i++) {
        expect(result.standards[i].relevance).toBeLessThanOrEqual(
          result.standards[i - 1].relevance
        );
      }
    });

    it("should include material-specific AMS specs for titanium", () => {
      const result = engine.suggestStandards({
        material: "titanium Ti-6Al-4V",
        process: "milling",
      });
      expect(result.standards.some(s => s.standard.startsWith("AMS"))).toBe(true);
    });
  });
});

// ============================================================================
// TestingProtocolEngine
// ============================================================================

describe("TestingProtocolEngine", () => {
  const engine = new TestingProtocolEngine();

  describe("generateToolLifeTest", () => {
    it("should generate ISO 3685 protocol for carbide tools", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "carbide",
        workpiece_material: "AISI 1045 steel",
        cutting_speed_range_mpm: [100, 300],
      });
      expect(result.protocol.speeds_mpm.length).toBe(5);
      expect(result.protocol.feed_mm).toBe(0.2);
      expect(result.protocol.depth_mm).toBe(2.0);
      expect(result.protocol.wear_criterion.type).toBe("VB");
      expect(result.protocol.wear_criterion.limit_mm).toBe(0.3);
      expect(result.total_tools_needed).toBeGreaterThan(0);
      expect(result.estimated_time_hours).toBeGreaterThan(0);
    });

    it("should use logarithmic speed spacing", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "carbide",
        workpiece_material: "steel",
        cutting_speed_range_mpm: [100, 1000],
        num_speed_points: 4,
      });
      const speeds = result.protocol.speeds_mpm;
      expect(speeds.length).toBe(4);
      expect(speeds[0]).toBeCloseTo(100, 0);
      expect(speeds[speeds.length - 1]).toBeCloseTo(1000, 0);
      // Log spacing: ratios should be approximately equal
      const ratio1 = speeds[1] / speeds[0];
      const ratio2 = speeds[2] / speeds[1];
      expect(ratio1).toBeCloseTo(ratio2, 0);
    });

    it("should predict shorter life at higher speeds (Taylor)", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "carbide",
        workpiece_material: "steel",
        cutting_speed_range_mpm: [100, 300],
      });
      const matrix = result.test_matrix;
      for (let i = 1; i < matrix.length; i++) {
        expect(matrix[i].expected_life_min).toBeLessThan(matrix[i - 1].expected_life_min);
      }
    });

    it("should adjust life for difficult-to-machine materials", () => {
      const easyResult = engine.generateToolLifeTest({
        tool_type: "carbide",
        workpiece_material: "aluminum 6061",
        cutting_speed_range_mpm: [200, 400],
        num_speed_points: 3,
      });
      const hardResult = engine.generateToolLifeTest({
        tool_type: "carbide",
        workpiece_material: "Inconel 718",
        cutting_speed_range_mpm: [200, 400],
        num_speed_points: 3,
      });
      // Aluminum should have longer expected life than Inconel
      expect(easyResult.test_matrix[0].expected_life_min)
        .toBeGreaterThan(hardResult.test_matrix[0].expected_life_min);
    });

    it("should use KT wear criterion for diamond tools", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "diamond",
        workpiece_material: "aluminum",
        cutting_speed_range_mpm: [300, 1000],
      });
      expect(result.protocol.wear_criterion.type).toBe("KT");
    });

    it("should use VBmax for ceramic tools", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "ceramic",
        workpiece_material: "hardened steel",
        cutting_speed_range_mpm: [200, 600],
      });
      expect(result.protocol.wear_criterion.type).toBe("VBmax");
    });

    it("should include comprehensive data collection list", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "carbide",
        workpiece_material: "steel",
        cutting_speed_range_mpm: [100, 300],
      });
      expect(result.data_collection.length).toBeGreaterThanOrEqual(8);
      expect(result.data_collection.some(d => d.includes("Flank wear"))).toBe(true);
      expect(result.data_collection.some(d => d.includes("Cutting forces"))).toBe(true);
    });

    it("should respect custom num_speed_points", () => {
      const result = engine.generateToolLifeTest({
        tool_type: "HSS",
        workpiece_material: "steel",
        cutting_speed_range_mpm: [30, 80],
        num_speed_points: 8,
      });
      expect(result.protocol.speeds_mpm.length).toBe(8);
      expect(result.test_matrix.length).toBe(8);
    });
  });

  describe("generateSurfaceFinishTest", () => {
    it("should select correct cutoff per ISO 4288 for Ra 1.6", () => {
      const result = engine.generateSurfaceFinishTest({
        process: "milling",
        target_Ra_um: 1.6,
        measurement_method: "contact",
      });
      expect(result.measurement_params.cutoff_mm).toBe(0.8);
      expect(result.measurement_params.evaluation_length_mm).toBe(4.0);
    });

    it("should select 0.25mm cutoff for fine finish Ra 0.05", () => {
      const result = engine.generateSurfaceFinishTest({
        process: "grinding",
        target_Ra_um: 0.05,
        measurement_method: "contact",
      });
      expect(result.measurement_params.cutoff_mm).toBe(0.25);
    });

    it("should use Gaussian filter for contact method", () => {
      const result = engine.generateSurfaceFinishTest({
        process: "turning",
        target_Ra_um: 3.2,
        measurement_method: "contact",
      });
      expect(result.measurement_params.filter_type).toContain("Gaussian");
    });

    it("should use Robust Gaussian for optical method", () => {
      const result = engine.generateSurfaceFinishTest({
        process: "turning",
        target_Ra_um: 3.2,
        measurement_method: "optical",
      });
      expect(result.measurement_params.filter_type).toContain("Robust");
    });

    it("should increase sample size for fine surfaces", () => {
      const fine = engine.generateSurfaceFinishTest({
        process: "lapping",
        target_Ra_um: 0.05,
        measurement_method: "optical",
      });
      const coarse = engine.generateSurfaceFinishTest({
        process: "milling",
        target_Ra_um: 3.2,
        measurement_method: "contact",
      });
      expect(fine.sample_size).toBeGreaterThan(coarse.sample_size);
    });

    it("should set Rz ~ 4x Ra", () => {
      const result = engine.generateSurfaceFinishTest({
        process: "turning",
        target_Ra_um: 1.6,
        measurement_method: "contact",
      });
      expect(result.acceptance_criteria.max_Rz_um).toBeCloseTo(6.4, 1);
    });

    it("should use 16% rule for fine surfaces", () => {
      const result = engine.generateSurfaceFinishTest({
        process: "grinding",
        target_Ra_um: 0.2,
        measurement_method: "contact",
      });
      expect(result.acceptance_criteria.rule).toContain("16%");
    });
  });

  describe("generateDimensionalTest", () => {
    it("should compute ISO 14253-1 conformance zones", () => {
      const result = engine.generateDimensionalTest({
        nominal_mm: 50.0,
        tolerance_mm: 0.1,
        measurement_uncertainty_mm: 0.005,
      });
      expect(result.details.upper_spec_mm).toBeCloseTo(50.05, 4);
      expect(result.details.lower_spec_mm).toBeCloseTo(49.95, 4);
      expect(result.details.acceptance_upper_mm).toBeCloseTo(50.045, 4);
      expect(result.details.acceptance_lower_mm).toBeCloseTo(49.955, 4);
    });

    it("should not require Gage R&R when uncertainty <= 10% of tolerance", () => {
      const result = engine.generateDimensionalTest({
        nominal_mm: 25.0,
        tolerance_mm: 0.5,
        measurement_uncertainty_mm: 0.01,
      });
      expect(result.gauge_R_R_required).toBe(false);
      expect(result.decision_rule).toContain("negligible");
    });

    it("should require Gage R&R when uncertainty > 10% of tolerance", () => {
      const result = engine.generateDimensionalTest({
        nominal_mm: 25.0,
        tolerance_mm: 0.05,
        measurement_uncertainty_mm: 0.01,
      });
      expect(result.gauge_R_R_required).toBe(true);
    });

    it("should warn when uncertainty > 40% of tolerance", () => {
      const result = engine.generateDimensionalTest({
        nominal_mm: 10.0,
        tolerance_mm: 0.01,
        measurement_uncertainty_mm: 0.005,
      });
      expect(result.decision_rule).toContain("WARNING");
      expect(result.decision_rule).toContain("inadequate");
    });

    it("should produce symmetric conformance zone", () => {
      const result = engine.generateDimensionalTest({
        nominal_mm: 100.0,
        tolerance_mm: 0.2,
        measurement_uncertainty_mm: 0.02,
      });
      const midpoint = (result.conformance_zone_mm[0] + result.conformance_zone_mm[1]) / 2;
      expect(midpoint).toBeCloseTo(100.0, 4);
    });
  });
});

// ============================================================================
// CertificationTrackingEngine
// ============================================================================

describe("CertificationTrackingEngine", () => {
  let engine: CertificationTrackingEngine;

  beforeEach(() => {
    engine = new CertificationTrackingEngine();
  });

  describe("trackMaterialCert", () => {
    it("should validate compliant material cert", () => {
      const result = engine.trackMaterialCert({
        material: "Ti-6Al-4V",
        heat_lot: "H2026-001",
        mill_cert_data: {
          tensile_MPa: 950,
          yield_MPa: 880,
          elongation_pct: 14,
          hardness: 35,
        },
        spec: "AMS 4911 Ti-6Al-4V",
      });
      expect(result.compliant).toBe(true);
      expect(result.cert_valid).toBe(true);
      expect(result.deviations.length).toBe(0);
    });

    it("should detect tensile strength below spec", () => {
      const result = engine.trackMaterialCert({
        material: "Ti-6Al-4V",
        heat_lot: "H2026-002",
        mill_cert_data: {
          tensile_MPa: 800,
          yield_MPa: 880,
          elongation_pct: 12,
        },
        spec: "AMS 4911 Ti-6Al-4V",
      });
      expect(result.compliant).toBe(false);
      expect(result.deviations.some(d => d.includes("Tensile"))).toBe(true);
    });

    it("should detect hardness out of range", () => {
      const result = engine.trackMaterialCert({
        material: "4140 steel",
        heat_lot: "H2026-003",
        mill_cert_data: {
          tensile_MPa: 700,
          yield_MPa: 500,
          elongation_pct: 18,
          hardness: 350,
        },
        spec: "ASTM A29 4140",
      });
      expect(result.deviations.some(d => d.includes("Hardness"))).toBe(true);
    });

    it("should flag missing tensile data", () => {
      const result = engine.trackMaterialCert({
        material: "steel",
        heat_lot: "H2026-004",
        mill_cert_data: { yield_MPa: 400 },
        spec: "ASTM A29 1045",
      });
      expect(result.deviations.some(d => d.includes("not provided"))).toBe(true);
      expect(result.cert_valid).toBe(false);
    });

    it("should infer spec for unknown spec string", () => {
      const result = engine.trackMaterialCert({
        material: "aluminum 6061",
        heat_lot: "H2026-005",
        mill_cert_data: {
          tensile_MPa: 310,
          yield_MPa: 250,
          elongation_pct: 12,
        },
        spec: "CUSTOM-SPEC-123",
      });
      expect(result.spec_requirements).toBeDefined();
      expect(result.spec_requirements.min_tensile_MPa).toBeGreaterThan(0);
    });

    it("should validate stainless steel cert", () => {
      const result = engine.trackMaterialCert({
        material: "316 stainless",
        heat_lot: "H2026-006",
        mill_cert_data: {
          tensile_MPa: 580,
          yield_MPa: 290,
          elongation_pct: 50,
          hardness: 180,
        },
        spec: "ASTM A276 316",
      });
      expect(result.compliant).toBe(true);
      expect(result.cert_valid).toBe(true);
    });
  });

  describe("trackToolCert", () => {
    it("should report valid tool cert", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() - 30);
      const result = engine.trackToolCert({
        tool_id: "T-001",
        manufacturer: "Sandvik",
        grade: "GC4325",
        coating: "CVD TiCN-Al2O3",
        batch: "B2026-100",
        inspection_date: futureDate.toISOString().split("T")[0],
      });
      expect(result.cert_status).toBe("valid");
      expect(result.days_remaining).toBeGreaterThan(300);
      expect(result.recertification_needed).toBe(false);
    });

    it("should report expiring tool cert", () => {
      const almostExpired = new Date();
      almostExpired.setDate(almostExpired.getDate() - 345);
      const result = engine.trackToolCert({
        tool_id: "T-002",
        manufacturer: "Kennametal",
        grade: "KC5010",
        coating: "PVD TiAlN",
        batch: "B2026-200",
        inspection_date: almostExpired.toISOString().split("T")[0],
      });
      expect(result.cert_status).toBe("expiring");
      expect(result.days_remaining).toBeLessThanOrEqual(30);
      expect(result.recertification_needed).toBe(true);
    });

    it("should report expired tool cert", () => {
      const result = engine.trackToolCert({
        tool_id: "T-003",
        manufacturer: "ISCAR",
        grade: "IC808",
        coating: "PVD",
        batch: "B2025-001",
        inspection_date: "2024-01-01",
      });
      expect(result.cert_status).toBe("expired");
      expect(result.days_remaining).toBe(0);
      expect(result.recertification_needed).toBe(true);
    });
  });

  describe("trackMachineCal", () => {
    it("should report current calibration", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);
      const result = engine.trackMachineCal({
        machine_id: "DMG-001",
        last_calibration: recentDate.toISOString().split("T")[0],
        calibration_interval_days: 365,
        measurements: [
          { axis: "X", error_um: 3, spec_um: 10 },
          { axis: "Y", error_um: 5, spec_um: 10 },
          { axis: "Z", error_um: 2, spec_um: 10 },
        ],
      });
      expect(result.cal_status).toBe("current");
      expect(result.in_spec).toBe(true);
      expect(result.days_until_due).toBeGreaterThan(300);
    });

    it("should detect overdue calibration", () => {
      const result = engine.trackMachineCal({
        machine_id: "DMG-002",
        last_calibration: "2024-01-01",
        calibration_interval_days: 365,
      });
      expect(result.cal_status).toBe("overdue");
      expect(result.recommended_actions.some(a => a.includes("overdue"))).toBe(true);
    });

    it("should detect out-of-spec axis", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);
      const result = engine.trackMachineCal({
        machine_id: "DMG-003",
        last_calibration: recentDate.toISOString().split("T")[0],
        calibration_interval_days: 365,
        measurements: [
          { axis: "X", error_um: 3, spec_um: 10 },
          { axis: "Y", error_um: 15, spec_um: 10 },
          { axis: "Z", error_um: 2, spec_um: 10 },
        ],
      });
      expect(result.in_spec).toBe(false);
      expect(result.worst_axis).toBe("Y");
      expect(result.recommended_actions.some(a => a.includes("Y axis"))).toBe(true);
    });

    it("should warn when axis approaching spec limit", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);
      const result = engine.trackMachineCal({
        machine_id: "DMG-004",
        last_calibration: recentDate.toISOString().split("T")[0],
        calibration_interval_days: 365,
        measurements: [
          { axis: "X", error_um: 9, spec_um: 10 },
          { axis: "Y", error_um: 2, spec_um: 10 },
        ],
      });
      expect(result.in_spec).toBe(true);
      expect(result.worst_axis).toBe("X");
      expect(result.recommended_actions.some(a => a.includes("monitor"))).toBe(true);
    });

    it("should report due_soon calibration", () => {
      const almostDue = new Date();
      almostDue.setDate(almostDue.getDate() - 340);
      const result = engine.trackMachineCal({
        machine_id: "DMG-005",
        last_calibration: almostDue.toISOString().split("T")[0],
        calibration_interval_days: 365,
      });
      expect(result.cal_status).toBe("due_soon");
      expect(result.recommended_actions.some(a => a.includes("schedule"))).toBe(true);
    });
  });

  describe("generateAuditReport", () => {
    it("should generate empty report with no tracked items", () => {
      const result = engine.generateAuditReport({ scope: "all" });
      expect(result.items_tracked).toBe(0);
      expect(result.summary).toContain("No items tracked");
    });

    it("should generate report with mixed compliance", () => {
      // Track a compliant material
      engine.trackMaterialCert({
        material: "Ti-6Al-4V",
        heat_lot: "H001",
        mill_cert_data: { tensile_MPa: 950, yield_MPa: 880 },
        spec: "AMS 4911 Ti-6Al-4V",
      });
      // Track a non-compliant material
      engine.trackMaterialCert({
        material: "Ti-6Al-4V",
        heat_lot: "H002",
        mill_cert_data: { tensile_MPa: 700, yield_MPa: 600 },
        spec: "AMS 4911 Ti-6Al-4V",
      });

      const result = engine.generateAuditReport({ scope: "material" });
      expect(result.items_tracked).toBe(2);
      expect(result.items_compliant).toBe(1);
      expect(result.items_non_conformant).toBe(1);
      expect(result.action_items.length).toBe(1);
    });

    it("should scope report to specific category", () => {
      // Add material and tool records
      engine.trackMaterialCert({
        material: "steel",
        heat_lot: "H100",
        mill_cert_data: { tensile_MPa: 600, yield_MPa: 400 },
        spec: "ASTM A29 1045",
      });
      engine.trackToolCert({
        tool_id: "T-100",
        manufacturer: "Test",
        grade: "G1",
        coating: "TiN",
        batch: "B1",
        inspection_date: "2024-01-01",
      });

      const matReport = engine.generateAuditReport({ scope: "material" });
      const toolReport = engine.generateAuditReport({ scope: "tool" });
      const allReport = engine.generateAuditReport({ scope: "all" });

      expect(matReport.items_tracked).toBe(1);
      expect(toolReport.items_tracked).toBe(1);
      expect(allReport.items_tracked).toBe(2);
    });

    it("should include all categories in 'all' scope", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      engine.trackMaterialCert({
        material: "steel",
        heat_lot: "H200",
        mill_cert_data: { tensile_MPa: 600, yield_MPa: 400 },
        spec: "ASTM A29 1045",
      });
      engine.trackToolCert({
        tool_id: "T-200",
        manufacturer: "Sandvik",
        grade: "GC",
        coating: "CVD",
        batch: "B200",
        inspection_date: recentDate.toISOString().split("T")[0],
      });
      engine.trackMachineCal({
        machine_id: "M-200",
        last_calibration: recentDate.toISOString().split("T")[0],
        calibration_interval_days: 365,
      });

      const report = engine.generateAuditReport({ scope: "all" });
      expect(report.items_tracked).toBe(3);
    });
  });
});
