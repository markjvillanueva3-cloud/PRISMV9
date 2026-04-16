/**
 * WEDM-CAL-MS4 U-CAL21: Production Readiness Score Tests
 *
 * Tests for WEDMProductionReadinessEngine:
 * - Overall score computation (target: 90+)
 * - Per-dimension scoring (area rate, kerf, finish, MRR, calibration)
 * - Blocker detection
 * - Persistence to WEDM_FINAL_READINESS.json
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = "data/state";
const OUTPUT_FILE = path.join(STATE_DIR, "WEDM_FINAL_READINESS.json");

describe("WEDM-CAL-MS4 U-CAL21: Production Readiness Engine", () => {
  let engine: any;

  beforeEach(async () => {
    const module = await import("../engines/WEDMProductionReadinessEngine.js");
    engine = new module.WEDMProductionReadinessEngine();
    // Clean up any previous test output
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Basic Generation
  // ═══════════════════════════════════════════════════════════════════════

  it("generates report with all required fields", () => {
    const report = engine.generate();

    expect(report).toHaveProperty("version");
    expect(report).toHaveProperty("generated_at");
    expect(report).toHaveProperty("overall_score");
    expect(report).toHaveProperty("target_score", 90);
    expect(report).toHaveProperty("production_ready");
    expect(report).toHaveProperty("dimensions");
    expect(report).toHaveProperty("calibration_confidence");
    expect(report).toHaveProperty("validation_results");
    expect(report).toHaveProperty("recommendations");
    expect(report).toHaveProperty("blockers");
  });

  it("generates report with 5 scoring dimensions", () => {
    const report = engine.generate();

    expect(report.dimensions).toHaveLength(5);
    const names = report.dimensions.map((d: any) => d.name);
    expect(names).toContain("Area Rate Accuracy");
    expect(names).toContain("Kerf Prediction");
    expect(names).toContain("Surface Finish (Ra)");
    expect(names).toContain("MRR Efficiency");
    expect(names).toContain("Calibration Confidence");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Score Computation
  // ═══════════════════════════════════════════════════════════════════════

  it("achieves 90+ score with good calibration data", () => {
    const report = engine.generate({
      prediction_accuracy: {
        area_rate_deviation_pct: 10,
        kerf_deviation_pct: 8,
        finish_deviation_pct: 15,
        mrr_deviation_pct: 12,
      },
      bayesian_priors: [
        { material: "D2", k_ra: { value: 1.02, variance: 0.02, samples: 10 }, eta_mrr: { value: 0.98, variance: 0.02, samples: 10 } },
        { material: "M2", k_ra: { value: 1.05, variance: 0.03, samples: 8 }, eta_mrr: { value: 0.95, variance: 0.03, samples: 8 } },
      ],
      test_results: [
        { suite: "wedm-calibration", passed: 50, failed: 0, timestamp: new Date().toISOString() },
      ],
    });

    expect(report.overall_score).toBeGreaterThanOrEqual(90);
    expect(report.production_ready).toBe(true);
    expect(report.blockers).toHaveLength(0);
  });

  it("fails production readiness with high deviation", () => {
    const report = engine.generate({
      prediction_accuracy: {
        area_rate_deviation_pct: 50,
        kerf_deviation_pct: 40,
        finish_deviation_pct: 80,
        mrr_deviation_pct: 60,
      },
    });

    expect(report.overall_score).toBeLessThan(90);
    expect(report.production_ready).toBe(false);
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("detects blockers for extreme deviations", () => {
    const report = engine.generate({
      prediction_accuracy: {
        area_rate_deviation_pct: 35,
        kerf_deviation_pct: 30,
        finish_deviation_pct: 75,
        mrr_deviation_pct: 45,
      },
    });

    expect(report.blockers).toContain("Area rate deviation >30% — production predictions unreliable");
    expect(report.blockers.some((b: string) => b.includes("Ra deviation"))).toBe(true);
    expect(report.production_ready).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Dimension Scoring
  // ═══════════════════════════════════════════════════════════════════════

  it("scores within-target deviation as pass", () => {
    const report = engine.generate({
      prediction_accuracy: {
        area_rate_deviation_pct: 15, // within ±20%
        kerf_deviation_pct: 10,      // within ±15%
        finish_deviation_pct: 20,    // within ±30%
        mrr_deviation_pct: 15,       // within ±20%
      },
    });

    const areaRate = report.dimensions.find((d: any) => d.name === "Area Rate Accuracy");
    expect(areaRate.status).toBe("pass");
    expect(areaRate.score).toBeGreaterThanOrEqual(80);

    const kerf = report.dimensions.find((d: any) => d.name === "Kerf Prediction");
    expect(kerf.status).toBe("pass");
    expect(kerf.score).toBeGreaterThanOrEqual(80);
  });

  it("scores above-target deviation as marginal", () => {
    const report = engine.generate({
      prediction_accuracy: {
        area_rate_deviation_pct: 30, // outside ±20%, within ±40%
        kerf_deviation_pct: 22,      // outside ±15%, within ±30%
        finish_deviation_pct: 50,    // outside ±30%, within ±70%
        mrr_deviation_pct: 30,       // outside ±20%, within ±40%
      },
    });

    const areaRate = report.dimensions.find((d: any) => d.name === "Area Rate Accuracy");
    expect(areaRate.status).toBe("marginal");
    expect(areaRate.score).toBeGreaterThanOrEqual(40);
    expect(areaRate.score).toBeLessThan(80);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Calibration Confidence
  // ═══════════════════════════════════════════════════════════════════════

  it("computes high confidence for low variance priors", () => {
    const report = engine.generate({
      bayesian_priors: [
        { material: "D2", k_ra: { value: 1.0, variance: 0.01, samples: 20 }, eta_mrr: { value: 1.0, variance: 0.01, samples: 20 } },
      ],
    });

    expect(report.calibration_confidence).toHaveLength(1);
    expect(report.calibration_confidence[0].confidence_score).toBeGreaterThanOrEqual(90);
  });

  it("computes low confidence for high variance priors", () => {
    const report = engine.generate({
      bayesian_priors: [
        { material: "D2", k_ra: { value: 1.0, variance: 0.15, samples: 2 }, eta_mrr: { value: 1.0, variance: 0.15, samples: 2 } },
      ],
    });

    expect(report.calibration_confidence[0].confidence_score).toBeLessThan(60);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Validation Results
  // ═══════════════════════════════════════════════════════════════════════

  it("includes validation results in report", () => {
    const report = engine.generate({
      test_results: [
        { suite: "wedm-calibration", passed: 45, failed: 5, timestamp: "2026-04-14T10:00:00Z" },
        { suite: "wedm-ai-advanced", passed: 40, failed: 2, timestamp: "2026-04-14T10:00:00Z" },
      ],
    });

    expect(report.validation_results).toHaveLength(2);
    expect(report.validation_results[0].pass_rate).toBeCloseTo(90);
    expect(report.validation_results[1].pass_rate).toBeCloseTo(95.2, 0);
  });

  it("adds blocker for low test pass rate", () => {
    const report = engine.generate({
      test_results: [
        { suite: "wedm-failing", passed: 80, failed: 20, timestamp: "2026-04-14T10:00:00Z" },
      ],
    });

    expect(report.blockers.some((b: string) => b.includes("Test pass rate"))).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Recommendations
  // ═══════════════════════════════════════════════════════════════════════

  it("generates recommendations for moderate deviations", () => {
    const report = engine.generate({
      prediction_accuracy: {
        area_rate_deviation_pct: 25, // >20% but <30%
        kerf_deviation_pct: 18,      // >15% but <25%
        finish_deviation_pct: 40,    // >30% but <70%
        mrr_deviation_pct: 18,
      },
    });

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some((r: string) => r.includes("Area rate"))).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Persistence
  // ═══════════════════════════════════════════════════════════════════════

  it("persists report to WEDM_FINAL_READINESS.json", () => {
    const { path: outPath, report } = engine.persist({
      prediction_accuracy: { area_rate_deviation_pct: 15 },
    });

    expect(outPath).toContain("WEDM_FINAL_READINESS.json");
    expect(fs.existsSync(outPath)).toBe(true);

    const loaded = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(loaded.overall_score).toBe(report.overall_score);
    expect(loaded.version).toBe("1.0.0");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Default Values
  // ═══════════════════════════════════════════════════════════════════════

  it("uses sensible defaults when no input provided", () => {
    const report = engine.generate({});

    // Should have default calibration confidence entries
    expect(report.calibration_confidence.length).toBeGreaterThan(0);
    // Should have default validation results
    expect(report.validation_results.length).toBeGreaterThan(0);
    // Should compute reasonable score
    expect(report.overall_score).toBeGreaterThan(50);
    expect(report.overall_score).toBeLessThanOrEqual(100);
  });
});
