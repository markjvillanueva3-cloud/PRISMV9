/**
 * CAMInputExhaustionPlannerEngine.test.ts — U-LP01 Tests
 *
 * Tests for CAM exhaustion planning, coverage reporting, and per-CAM auditing.
 *
 * @unit CAM-UIX-INFRA-01/U-LP01
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import {
  CAMInputExhaustionPlannerEngine,
  camInputExhaustionPlannerEngine,
  type CoverageBaseline,
  type VendorRegistry,
  type PlanNextResult,
  type CoverageReport,
  type CAMAuditResult,
} from "../../engines/CAMInputExhaustionPlannerEngine.js";

// ============================================================================
// Test Fixtures
// ============================================================================

const mockBaseline: CoverageBaseline = {
  schemaVersion: 1,
  per_cam_baseline: {
    mastercam_x8: {
      tier: 1,
      strategy_catalog_coverage_pct: 0,
      ui_field_schema_coverage_pct: 0,
      post_dialect_coverage_pct: 0,
      sample_reproducibility_pct: 0,
      strategies_enumerated: 0,
      strategies_total_estimated: 150,
      fields_schematized: 0,
      fields_total_estimated: 7500,
      last_audit: null,
    },
    fusion360: {
      tier: 1,
      strategy_catalog_coverage_pct: 50,
      ui_field_schema_coverage_pct: 30,
      post_dialect_coverage_pct: 0,
      sample_reproducibility_pct: 0,
      strategies_enumerated: 40,
      strategies_total_estimated: 80,
      fields_schematized: 1200,
      fields_total_estimated: 4000,
      last_audit: "2026-04-20T00:00:00Z",
    },
    siemens_nx_cam: {
      tier: 2,
      strategy_catalog_coverage_pct: 0,
      ui_field_schema_coverage_pct: 0,
      post_dialect_coverage_pct: 0,
      sample_reproducibility_pct: 0,
      strategies_enumerated: 0,
      strategies_total_estimated: 100,
      fields_schematized: 0,
      fields_total_estimated: 5000,
      last_audit: null,
    },
    tebis: {
      tier: 3,
      strategy_catalog_coverage_pct: 0,
      ui_field_schema_coverage_pct: 0,
      post_dialect_coverage_pct: 0,
      sample_reproducibility_pct: 0,
      strategies_enumerated: 0,
      strategies_total_estimated: 40,
      fields_schematized: 0,
      fields_total_estimated: 2000,
      last_audit: null,
    },
  },
  aggregate_totals: {
    tier_1_cams: 2,
    tier_2_cams: 1,
    tier_3_cams: 1,
    total_strategies_estimated: 370,
    total_fields_estimated: 18500,
    current_strategy_coverage_pct: 0,
    current_field_coverage_pct: 0,
  },
};

const mockVendorRegistry: VendorRegistry = {
  schemaVersion: 1,
  tier_definitions: {
    tier_1: { coverage_floor_strategy_pct: 100, coverage_floor_ui_field_pct: 95 },
    tier_2: { coverage_floor_strategy_pct: 85, coverage_floor_ui_field_pct: 60 },
    tier_3: { coverage_floor_strategy_pct: 0, coverage_floor_ui_field_pct: 0 },
  },
  cam_systems: {
    mastercam_x8: {
      tier: 1,
      vendor: "CNC Software",
      display_name: "Mastercam X8+",
      file_prefixes: ["Mastercam"],
      engine_pattern: "*Mastercam*.ts",
      tips_file: "mastercam-tips.ts",
      bridge_engine: "MastercamAutomationBridge",
      scripting_sdk: "NetHook3 C#",
      post_language: "MPP",
      strategies_estimated: 150,
      fields_estimated: 7500,
      jmdie_program_count: 8924,
      in_scope: true,
    },
    fusion360: {
      tier: 1,
      vendor: "Autodesk",
      display_name: "Fusion 360 CAM",
      file_prefixes: ["Fusion"],
      engine_pattern: "*Fusion*.ts",
      tips_file: "fusion360-tips.ts",
      bridge_engine: "Fusion360AutomationBridge",
      scripting_sdk: "adsk.cam Python",
      post_language: "HSM Post",
      strategies_estimated: 80,
      fields_estimated: 4000,
      jmdie_program_count: 2156,
      in_scope: true,
    },
    siemens_nx_cam: {
      tier: 2,
      vendor: "Siemens",
      display_name: "Siemens NX CAM",
      file_prefixes: ["NX"],
      engine_pattern: "*NX*.ts",
      tips_file: "nx-cam-tips.ts",
      bridge_engine: "NXCAMAutomationBridge",
      scripting_sdk: "NX OpenAPI",
      post_language: "NX Post",
      strategies_estimated: 100,
      fields_estimated: 5000,
      in_scope: true,
    },
    tebis: {
      tier: 3,
      vendor: "Tebis",
      display_name: "Tebis",
      file_prefixes: ["Tebis"],
      engine_pattern: "*Tebis*.ts",
      tips_file: "tebis-tips.ts",
      bridge_engine: "TebisAutomationBridge",
      scripting_sdk: "Tebis API",
      post_language: "Tebis Post",
      strategies_estimated: 40,
      fields_estimated: 2000,
      in_scope: true,
    },
    out_of_scope_cam: {
      tier: 3,
      vendor: "Test",
      display_name: "Out of Scope CAM",
      file_prefixes: ["OOS"],
      engine_pattern: "*OOS*.ts",
      tips_file: "oos-tips.ts",
      bridge_engine: "OOSBridge",
      scripting_sdk: "None",
      post_language: "None",
      strategies_estimated: 10,
      fields_estimated: 500,
      in_scope: false,
    },
  },
};

// ============================================================================
// Test Suite
// ============================================================================

describe("CAMInputExhaustionPlannerEngine", () => {
  let engine: CAMInputExhaustionPlannerEngine;
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    CAMInputExhaustionPlannerEngine.resetInstance();
    engine = CAMInputExhaustionPlannerEngine.getInstance();

    readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockImplementation((path: any) => {
      if (path.includes("BASELINE")) return JSON.stringify(mockBaseline);
      if (path.includes("CURRENT")) return JSON.stringify(mockBaseline);
      if (path.includes("VENDOR_REGISTRY")) return JSON.stringify(mockVendorRegistry);
      throw new Error(`Unexpected path: ${path}`);
    });

    writeFileSyncSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    existsSyncSpy = vi.spyOn(fs, "existsSync").mockImplementation((path: any) => {
      if (path.includes("BASELINE")) return true;
      if (path.includes("VENDOR_REGISTRY")) return true;
      if (path.includes("CURRENT")) return false;
      return false;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton pattern", () => {
    it("returns same instance on multiple calls", () => {
      const instance1 = CAMInputExhaustionPlannerEngine.getInstance();
      const instance2 = CAMInputExhaustionPlannerEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("resetInstance creates new instance", () => {
      const instance1 = CAMInputExhaustionPlannerEngine.getInstance();
      CAMInputExhaustionPlannerEngine.resetInstance();
      const instance2 = CAMInputExhaustionPlannerEngine.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // planNext Tests
  // ==========================================================================

  describe("planNext", () => {
    it("prioritizes tier-1 CAMs over tier-2", () => {
      const result = engine.planNext();
      expect(result.tier).toBe(1);
      expect(result.priority).toBe("CRITICAL");
    });

    it("returns recommended CAM with largest coverage gap", () => {
      const result = engine.planNext();
      expect(result.recommended_cam).toBe("mastercam_x8");
      expect(result.coverage_gap.strategy_gap_pct).toBe(100);
    });

    it("returns valid unit recommendation", () => {
      const result = engine.planNext();
      expect(result.recommended_unit).toContain("U-CAT01");
    });

    it("calculates combined score with tier weighting", () => {
      const result = engine.planNext();
      expect(result.coverage_gap.combined_score).toBeGreaterThan(0);
    });

    it("returns none when all floors met", () => {
      const fullCoverage: CoverageBaseline = {
        ...mockBaseline,
        per_cam_baseline: {
          mastercam_x8: { ...mockBaseline.per_cam_baseline.mastercam_x8, strategy_catalog_coverage_pct: 100, ui_field_schema_coverage_pct: 100 },
          fusion360: { ...mockBaseline.per_cam_baseline.fusion360, strategy_catalog_coverage_pct: 100, ui_field_schema_coverage_pct: 100 },
          siemens_nx_cam: { ...mockBaseline.per_cam_baseline.siemens_nx_cam, strategy_catalog_coverage_pct: 100, ui_field_schema_coverage_pct: 100 },
          tebis: { ...mockBaseline.per_cam_baseline.tebis, strategy_catalog_coverage_pct: 100, ui_field_schema_coverage_pct: 100 },
        },
      };
      readFileSyncSpy.mockImplementation((path: any) => {
        if (path.includes("BASELINE") || path.includes("CURRENT")) return JSON.stringify(fullCoverage);
        if (path.includes("VENDOR_REGISTRY")) return JSON.stringify(mockVendorRegistry);
        throw new Error(`Unexpected path: ${path}`);
      });
      engine.clearCaches();

      const result = engine.planNext();
      expect(result.recommended_cam).toBe("none");
      expect(result.priority).toBe("LOW");
    });
  });

  // ==========================================================================
  // getCoverageReport Tests
  // ==========================================================================

  describe("getCoverageReport", () => {
    it("returns valid report structure", () => {
      const report = engine.getCoverageReport();
      expect(report).toHaveProperty("generated_at");
      expect(report).toHaveProperty("overall_omega");
      expect(report).toHaveProperty("tier_summary");
      expect(report).toHaveProperty("per_cam");
      expect(report).toHaveProperty("next_actions");
    });

    it("calculates tier summaries correctly", () => {
      const report = engine.getCoverageReport();
      expect(report.tier_summary.tier_1.cams).toBe(2);
      expect(report.tier_summary.tier_2.cams).toBe(1);
      expect(report.tier_summary.tier_3.cams).toBe(1);
    });

    it("includes per-CAM coverage details", () => {
      const report = engine.getCoverageReport();
      expect(report.per_cam.length).toBe(4);
      const mastercam = report.per_cam.find((c) => c.cam_id === "mastercam_x8");
      expect(mastercam).toBeDefined();
      expect(mastercam!.tier).toBe(1);
    });

    it("identifies gaps correctly", () => {
      const report = engine.getCoverageReport();
      const mastercam = report.per_cam.find((c) => c.cam_id === "mastercam_x8");
      expect(mastercam!.gaps.length).toBeGreaterThan(0);
      expect(mastercam!.meets_tier_floor).toBe(false);
    });

    it("omega is between 0 and 1", () => {
      const report = engine.getCoverageReport();
      expect(report.overall_omega).toBeGreaterThanOrEqual(0);
      expect(report.overall_omega).toBeLessThanOrEqual(1);
    });

    it("excludes out-of-scope CAMs", () => {
      const report = engine.getCoverageReport();
      const outOfScope = report.per_cam.find((c) => c.cam_id === "out_of_scope_cam");
      expect(outOfScope).toBeUndefined();
    });
  });

  // ==========================================================================
  // auditCam Tests
  // ==========================================================================

  describe("auditCam", () => {
    it("returns valid audit for tier-1 CAM", () => {
      const audit = engine.auditCam("mastercam_x8");
      expect(audit.cam_id).toBe("mastercam_x8");
      expect(audit.tier).toBe(1);
      expect(audit.display_name).toBe("Mastercam X8+");
    });

    it("identifies strategy gap for uncovered CAM", () => {
      const audit = engine.auditCam("mastercam_x8");
      const strategyGap = audit.gaps.find((g) => g.metric === "strategy_catalog");
      expect(strategyGap).toBeDefined();
      expect(strategyGap!.delta).toBe(100);
    });

    it("identifies field schema gap", () => {
      const audit = engine.auditCam("mastercam_x8");
      const fieldGap = audit.gaps.find((g) => g.metric === "ui_field_schema");
      expect(fieldGap).toBeDefined();
      expect(fieldGap!.delta).toBe(95);
    });

    it("includes JMDie reverse-engineering for tier-1", () => {
      const audit = engine.auditCam("mastercam_x8");
      const hasS7 = audit.recommended_ingestion_sources.some((s) => s.includes("S7"));
      expect(hasS7).toBe(true);
    });

    it("excludes JMDie for tier-2", () => {
      const audit = engine.auditCam("siemens_nx_cam");
      const hasS7 = audit.recommended_ingestion_sources.some((s) => s.includes("S7"));
      expect(hasS7).toBe(false);
    });

    it("throws for unknown CAM", () => {
      expect(() => engine.auditCam("nonexistent_cam")).toThrow("Unknown CAM");
    });

    it("estimates effort hours based on gaps", () => {
      const audit = engine.auditCam("mastercam_x8");
      expect(audit.estimated_effort_hours).toBeGreaterThan(0);
    });

    it("includes floor requirements", () => {
      const audit = engine.auditCam("mastercam_x8");
      expect(audit.floor_requirements.strategy_floor_pct).toBe(100);
      expect(audit.floor_requirements.field_floor_pct).toBe(95);
    });
  });

  // ==========================================================================
  // promoteCoverage Tests
  // ==========================================================================

  describe("promoteCoverage", () => {
    beforeEach(() => {
      existsSyncSpy.mockImplementation(() => true);
    });

    it("updates coverage metrics", () => {
      engine.promoteCoverage("mastercam_x8", {
        strategy_catalog_coverage_pct: 50,
        strategies_enumerated: 75,
      });

      expect(writeFileSyncSpy).toHaveBeenCalled();
      const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
      expect(writtenData.per_cam_baseline.mastercam_x8.strategy_catalog_coverage_pct).toBe(50);
    });

    it("sets last_audit timestamp", () => {
      engine.promoteCoverage("fusion360", { ui_field_schema_coverage_pct: 60 });

      const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
      expect(writtenData.per_cam_baseline.fusion360.last_audit).not.toBeNull();
    });

    it("recalculates aggregates", () => {
      engine.promoteCoverage("mastercam_x8", {
        strategies_enumerated: 150,
        fields_schematized: 7500,
      });

      const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
      expect(writtenData.aggregate_totals.current_strategy_coverage_pct).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // getInScopeCams Tests
  // ==========================================================================

  describe("getInScopeCams", () => {
    it("returns only in-scope CAMs", () => {
      const cams = engine.getInScopeCams();
      expect(cams.length).toBe(4);
      expect(cams.find((c) => c.id === "out_of_scope_cam")).toBeUndefined();
    });

    it("sorts by tier", () => {
      const cams = engine.getInScopeCams();
      expect(cams[0].tier).toBe(1);
      expect(cams[cams.length - 1].tier).toBe(3);
    });

    it("includes display names", () => {
      const cams = engine.getInScopeCams();
      expect(cams[0].display_name).toBeTruthy();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("error handling", () => {
    it("throws when baseline not found", () => {
      existsSyncSpy.mockReturnValue(false);
      engine.clearCaches();
      expect(() => engine.planNext()).toThrow("Coverage baseline not found");
    });

    it("throws when vendor registry not found", () => {
      existsSyncSpy.mockImplementation((path: any) => {
        if (path.includes("BASELINE")) return true;
        if (path.includes("VENDOR_REGISTRY")) return false;
        return false;
      });
      engine.clearCaches();
      expect(() => engine.planNext()).toThrow("Vendor registry not found");
    });
  });

  // ==========================================================================
  // Cross-CAM Variability Tests
  // ==========================================================================

  describe("cross-CAM variability", () => {
    it("handles all three tiers correctly", () => {
      const report = engine.getCoverageReport();
      const tier1Cams = report.per_cam.filter((c) => c.tier === 1);
      const tier2Cams = report.per_cam.filter((c) => c.tier === 2);
      const tier3Cams = report.per_cam.filter((c) => c.tier === 3);

      expect(tier1Cams.length).toBeGreaterThan(0);
      expect(tier2Cams.length).toBeGreaterThan(0);
      expect(tier3Cams.length).toBeGreaterThan(0);
    });

    it("applies different floor requirements per tier", () => {
      const tier1Audit = engine.auditCam("mastercam_x8");
      const tier2Audit = engine.auditCam("siemens_nx_cam");
      const tier3Audit = engine.auditCam("tebis");

      expect(tier1Audit.floor_requirements.strategy_floor_pct).toBe(100);
      expect(tier2Audit.floor_requirements.strategy_floor_pct).toBe(85);
      expect(tier3Audit.floor_requirements.strategy_floor_pct).toBe(0);
    });

    it("different CAMs have different estimated strategies", () => {
      const mastercamAudit = engine.auditCam("mastercam_x8");
      const fusionAudit = engine.auditCam("fusion360");
      const nxAudit = engine.auditCam("siemens_nx_cam");

      expect(mastercamAudit.current_metrics.strategies_total_estimated).toBe(150);
      expect(fusionAudit.current_metrics.strategies_total_estimated).toBe(80);
      expect(nxAudit.current_metrics.strategies_total_estimated).toBe(100);
    });
  });

  // ==========================================================================
  // Adversarial Input Tests
  // ==========================================================================

  describe("adversarial inputs", () => {
    it("handles empty string CAM ID", () => {
      expect(() => engine.auditCam("")).toThrow("Unknown CAM");
    });

    it("handles special characters in CAM ID", () => {
      expect(() => engine.auditCam("<script>alert(1)</script>")).toThrow("Unknown CAM");
    });

    it("handles very long CAM ID", () => {
      const longId = "a".repeat(1000);
      expect(() => engine.auditCam(longId)).toThrow("Unknown CAM");
    });

    it("handles NaN in coverage promotion", () => {
      engine.promoteCoverage("mastercam_x8", {
        strategy_catalog_coverage_pct: NaN,
      });
      const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
      expect(writtenData.per_cam_baseline.mastercam_x8.strategy_catalog_coverage_pct).toBeNaN();
    });

    it("handles negative coverage values", () => {
      engine.promoteCoverage("mastercam_x8", {
        strategy_catalog_coverage_pct: -50,
      });
      const writtenData = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
      expect(writtenData.per_cam_baseline.mastercam_x8.strategy_catalog_coverage_pct).toBe(-50);
    });

    it("handles Infinity in coverage", () => {
      engine.promoteCoverage("mastercam_x8", {
        fields_schematized: Infinity,
      });
      expect(writeFileSyncSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Boundary Condition Tests
  // ==========================================================================

  describe("boundary conditions", () => {
    it("handles exactly 100% strategy coverage", () => {
      const fullStratCoverage: CoverageBaseline = {
        ...mockBaseline,
        per_cam_baseline: {
          ...mockBaseline.per_cam_baseline,
          mastercam_x8: { ...mockBaseline.per_cam_baseline.mastercam_x8, strategy_catalog_coverage_pct: 100 },
        },
      };
      readFileSyncSpy.mockImplementation((path: any) => {
        if (path.includes("BASELINE") || path.includes("CURRENT")) return JSON.stringify(fullStratCoverage);
        if (path.includes("VENDOR_REGISTRY")) return JSON.stringify(mockVendorRegistry);
        throw new Error(`Unexpected path: ${path}`);
      });
      engine.clearCaches();

      const audit = engine.auditCam("mastercam_x8");
      const stratGap = audit.gaps.find((g) => g.metric === "strategy_catalog");
      expect(stratGap).toBeUndefined();
    });

    it("handles zero strategies estimated", () => {
      const zeroCam: VendorRegistry = {
        ...mockVendorRegistry,
        cam_systems: {
          ...mockVendorRegistry.cam_systems,
          zero_cam: {
            ...mockVendorRegistry.cam_systems.tebis,
            strategies_estimated: 0,
            fields_estimated: 0,
            in_scope: true,
          },
        },
      };
      const zeroBaseline: CoverageBaseline = {
        ...mockBaseline,
        per_cam_baseline: {
          ...mockBaseline.per_cam_baseline,
          zero_cam: { ...mockBaseline.per_cam_baseline.tebis, strategies_total_estimated: 0, fields_total_estimated: 0 },
        },
      };
      readFileSyncSpy.mockImplementation((path: any) => {
        if (path.includes("BASELINE") || path.includes("CURRENT")) return JSON.stringify(zeroBaseline);
        if (path.includes("VENDOR_REGISTRY")) return JSON.stringify(zeroCam);
        throw new Error(`Unexpected path: ${path}`);
      });
      engine.clearCaches();

      const report = engine.getCoverageReport();
      expect(report.per_cam.find((c) => c.cam_id === "zero_cam")).toBeDefined();
    });
  });
});
