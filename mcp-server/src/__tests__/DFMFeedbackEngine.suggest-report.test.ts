/**
 * R9 tests for DFMFeedbackEngine.suggestImprovements() and generateReport()
 * These methods were absent; added to close camDispatcher dfm_suggest / dfm_report drift.
 *
 * Intent encoded:
 *   - suggestImprovements maps severity -> priority correctly
 *   - suggestImprovements sorts high before medium before low
 *   - suggestImprovements preserves action (recommendation) and rationale (message + physics)
 *   - generateReport sets ready_to_manufacture=false when critical_count>0
 *   - generateReport sets ready_to_manufacture=true when no critical issues
 *   - generateReport summary text reflects the worst severity class
 *   - generateReport passes improvements through unchanged
 *   - Empty analysis (no issues) produces empty improvements and clean report
 */

import { describe, it, expect } from "vitest";
import {
  DFMFeedbackEngine,
  DFMResult,
  DFMImprovement,
} from "../engines/DFMFeedbackEngine.js";

const engine = new DFMFeedbackEngine();

// ── Helper: build a minimal DFMResult ────────────────────────────────────────
function makeResult(overrides: Partial<DFMResult>): DFMResult {
  return {
    issues: [],
    score: 100,
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
    manufacturability: "excellent",
    ...overrides,
  };
}

// ── suggestImprovements ───────────────────────────────────────────────────────

describe("DFMFeedbackEngine.suggestImprovements", () => {
  it("maps critical severity to high priority", () => {
    const result = makeResult({
      issues: [{
        severity: "critical",
        category: "thin_wall",
        feature_id: "f1",
        message: "Wall 0.3mm is below minimum (0.5mm)",
        recommendation: "Increase wall to >=1mm or use EDM",
        physics_basis: "deflection increases cubically",
      }],
      critical_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements).toHaveLength(1);
    expect(improvements[0].priority).toBe("high");
    expect(improvements[0].category).toBe("thin_wall");
    expect(improvements[0].feature_id).toBe("f1");
  });

  it("maps warning severity to medium priority", () => {
    const result = makeResult({
      issues: [{
        severity: "warning",
        category: "deep_pocket",
        message: "Depth/width ratio 5.0:1 -- extended tool needed",
        recommendation: "Use anti-vibration tool, reduce feed 50%",
      }],
      warning_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements[0].priority).toBe("medium");
  });

  it("maps info severity to low priority", () => {
    const result = makeResult({
      issues: [{
        severity: "info",
        category: "material_concern",
        message: "Note: exotic alloy",
        recommendation: "Verify tooling compatibility",
      }],
      info_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements[0].priority).toBe("low");
  });

  it("sorts high before medium before low regardless of issue order", () => {
    const result = makeResult({
      issues: [
        { severity: "info",     category: "info_cat",    message: "info msg",    recommendation: "info rec" },
        { severity: "critical", category: "crit_cat",    message: "crit msg",    recommendation: "crit rec" },
        { severity: "warning",  category: "warn_cat",    message: "warn msg",    recommendation: "warn rec" },
      ],
      critical_count: 1,
      warning_count: 1,
      info_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements.map(i => i.priority)).toEqual(["high", "medium", "low"]);
  });

  it("action equals the issue recommendation", () => {
    const result = makeResult({
      issues: [{
        severity: "critical",
        category: "tight_tolerance",
        message: "+-0.003mm requires grinding",
        recommendation: "Relax to +-0.01mm for milling",
      }],
      critical_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements[0].action).toBe("Relax to +-0.01mm for milling");
  });

  it("rationale includes physics_basis when present", () => {
    const result = makeResult({
      issues: [{
        severity: "critical",
        category: "thin_wall",
        message: "Wall too thin",
        recommendation: "Widen wall",
        physics_basis: "delta=FL^3/3EI",
      }],
      critical_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements[0].rationale).toContain("delta=FL^3/3EI");
    expect(improvements[0].rationale).toContain("Wall too thin");
  });

  it("rationale omits physics suffix when physics_basis is absent", () => {
    const result = makeResult({
      issues: [{
        severity: "warning",
        category: "sharp_corner",
        message: "Corner radius 0.2mm",
        recommendation: "Increase to >=1mm",
      }],
      warning_count: 1,
    });

    const improvements = engine.suggestImprovements(result);
    // Should end with the message, no trailing parenthesis
    expect(improvements[0].rationale).toBe("Corner radius 0.2mm");
  });

  it("returns empty array for a result with no issues", () => {
    const result = makeResult({ issues: [] });
    expect(engine.suggestImprovements(result)).toEqual([]);
  });

  // Adversarial: multiple critical issues all become high priority
  it("multiple critical issues all map to high priority", () => {
    const result = makeResult({
      issues: [
        { severity: "critical", category: "c1", message: "m1", recommendation: "r1" },
        { severity: "critical", category: "c2", message: "m2", recommendation: "r2" },
      ],
      critical_count: 2,
    });

    const improvements = engine.suggestImprovements(result);
    expect(improvements).toHaveLength(2);
    expect(improvements.every(i => i.priority === "high")).toBe(true);
  });
});

// ── generateReport ────────────────────────────────────────────────────────────

describe("DFMFeedbackEngine.generateReport", () => {
  it("ready_to_manufacture is false when critical_count > 0", () => {
    const result = makeResult({ critical_count: 2, score: 60, manufacturability: "marginal" });
    const improvements: DFMImprovement[] = [];
    const report = engine.generateReport(result, improvements);
    expect(report.ready_to_manufacture).toBe(false);
  });

  it("ready_to_manufacture is true when critical_count === 0", () => {
    const result = makeResult({ critical_count: 0, warning_count: 1, score: 95, manufacturability: "excellent" });
    const improvements: DFMImprovement[] = [];
    const report = engine.generateReport(result, improvements);
    expect(report.ready_to_manufacture).toBe(true);
  });

  it("summary mentions critical count when critical issues exist", () => {
    const result = makeResult({ critical_count: 3, score: 40, manufacturability: "difficult" });
    const report = engine.generateReport(result, []);
    expect(report.summary).toContain("3 critical");
  });

  it("summary mentions warning count when only warnings exist", () => {
    const result = makeResult({ critical_count: 0, warning_count: 2, score: 90, manufacturability: "good" });
    const report = engine.generateReport(result, []);
    expect(report.summary).toContain("2 warning");
    expect(report.summary).not.toContain("critical");
  });

  it("summary is positive when no issues at all", () => {
    const result = makeResult({ critical_count: 0, warning_count: 0, score: 100, manufacturability: "excellent" });
    const report = engine.generateReport(result, []);
    expect(report.summary).toContain("manufacturable");
  });

  it("passes score, manufacturability, counts through unchanged", () => {
    const result = makeResult({ score: 73, manufacturability: "good", critical_count: 0, warning_count: 3, info_count: 1 });
    const report = engine.generateReport(result, []);
    expect(report.score).toBe(73);
    expect(report.manufacturability).toBe("good");
    expect(report.warning_count).toBe(3);
    expect(report.info_count).toBe(1);
  });

  it("passes improvements array through unchanged", () => {
    const result = makeResult({});
    const improvements: DFMImprovement[] = [
      { priority: "high", category: "thin_wall", action: "Widen wall", rationale: "deflection risk" },
    ];
    const report = engine.generateReport(result, improvements);
    expect(report.improvements).toBe(improvements); // same reference
    expect(report.improvements).toHaveLength(1);
  });

  // Adversarial: empty improvements list
  it("generates valid report with empty improvements", () => {
    const result = makeResult({ critical_count: 1, score: 80, manufacturability: "good" });
    const report = engine.generateReport(result, []);
    expect(report.improvements).toEqual([]);
    expect(report.ready_to_manufacture).toBe(false);
  });

  // Round-trip: analyze -> suggestImprovements -> generateReport
  it("round-trip analyze->suggest->report produces consistent counts", () => {
    const features = [{
      id: "pocket_1",
      type: "pocket",
      dimensions: { depth_mm: 50, width_mm: 5 },  // ratio 10:1 -> critical
      wall_thickness_mm: 0.4,                        // <0.5 -> critical
    }];
    const analysis = engine.analyze(features);
    const improvements = engine.suggestImprovements(analysis);
    const report = engine.generateReport(analysis, improvements);

    // Two critical issues -> critical_count >= 2
    expect(analysis.critical_count).toBeGreaterThanOrEqual(2);
    expect(improvements.filter(i => i.priority === "high")).toHaveLength(analysis.critical_count);
    expect(report.critical_count).toBe(analysis.critical_count);
    expect(report.ready_to_manufacture).toBe(false);
    expect(report.improvements).toHaveLength(improvements.length);
  });
});
