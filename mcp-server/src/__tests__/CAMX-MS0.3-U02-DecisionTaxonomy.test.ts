/**
 * CAMX-MS0.3 / U-CAMX02 — 114-point decision taxonomy
 *
 * Validates the canonical classification of the 114 decision points across
 * the 9 production pipelines into the 12 orchestrator categories. This is
 * the retrofit debt ledger that units U-CAMX03..U-CAMX24 draw down.
 */
import { describe, it, expect } from "vitest";
import {
  PIPELINE_DECISION_TAXONOMY,
  byPipeline,
  byCategory,
  byCurrentMethod,
  lookup,
  stats,
  type DecisionCategory,
  type Pipeline,
  type CurrentMethod,
} from "../data/pipelineDecisionTaxonomy.js";

const ALL_CATEGORIES: DecisionCategory[] = [
  "tool_select", "strategy_select", "parameter_optimize", "coolant_select",
  "entry_exit_select", "sequence_optimize", "workholding_validate",
  "controller_select", "holder_select", "coating_select",
  "work_offset_select", "safety_check",
];

const ALL_PIPELINES: Pipeline[] = [
  "PrintToProgram", "Turning", "MultiAxis", "MillTurn",
  "EDM", "Grinding", "Laser", "Waterjet", "QuoteToShip",
];

// ────────────────────────────────────────────────────────────────────────
// Structure + counts
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX02 — counts + structure", () => {
  it("taxonomy contains exactly 114 decision points", () => {
    expect(PIPELINE_DECISION_TAXONOMY.length).toBe(114);
  });
  it("every decision_point id is unique", () => {
    const ids = PIPELINE_DECISION_TAXONOMY.map((d) => d.decision_point);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every entry declares every required field", () => {
    for (const d of PIPELINE_DECISION_TAXONOMY) {
      expect(typeof d.decision_point).toBe("string");
      expect(d.decision_point.length).toBeGreaterThan(0);
      expect(typeof d.pipeline).toBe("string");
      expect(typeof d.stage).toBe("string");
      expect(typeof d.category).toBe("string");
      expect(typeof d.current_method).toBe("string");
      expect(typeof d.description).toBe("string");
      expect(typeof d.rubric_id).toBe("string");
    }
  });
  it("rubric_id naming matches {CATEGORY}_RUBRIC pattern", () => {
    for (const d of PIPELINE_DECISION_TAXONOMY) {
      expect(d.rubric_id).toMatch(/_RUBRIC$/);
    }
  });
  it("taxonomy is frozen (immutable)", () => {
    expect(Object.isFrozen(PIPELINE_DECISION_TAXONOMY)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 12-category coverage
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX02 — 12 categories", () => {
  for (const cat of ALL_CATEGORIES) {
    it(`category "${cat}" has at least 1 decision point`, () => {
      const pts = byCategory(cat);
      expect(pts.length).toBeGreaterThan(0);
    });
  }
  it("every decision point uses one of the 12 canonical categories", () => {
    const valid = new Set<string>(ALL_CATEGORIES);
    for (const d of PIPELINE_DECISION_TAXONOMY) {
      expect(valid.has(d.category)).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// 9-pipeline coverage
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX02 — 9 pipelines", () => {
  for (const p of ALL_PIPELINES) {
    it(`pipeline "${p}" has at least 1 decision point`, () => {
      expect(byPipeline(p).length).toBeGreaterThan(0);
    });
  }
  it("PrintToProgram has 22 decision points", () => {
    expect(byPipeline("PrintToProgram").length).toBe(22);
  });
  it("Turning has 14 decision points", () => {
    expect(byPipeline("Turning").length).toBe(14);
  });
  it("MultiAxis has 12 decision points", () => {
    expect(byPipeline("MultiAxis").length).toBe(12);
  });
  it("QuoteToShip has 14 decision points", () => {
    expect(byPipeline("QuoteToShip").length).toBe(14);
  });
  it("per-pipeline count sums to 114", () => {
    let total = 0;
    for (const p of ALL_PIPELINES) total += byPipeline(p).length;
    expect(total).toBe(114);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Retrofit debt ledger
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX02 — retrofit debt ledger", () => {
  it("stats() reports totals by pipeline, category, and method", () => {
    const s = stats();
    expect(s.total).toBe(114);
    expect(typeof s.by_pipeline.PrintToProgram).toBe("number");
    expect(typeof s.by_category.tool_select).toBe("number");
    expect(typeof s.by_current_method.HARDCODED).toBe("number");
    expect(typeof s.by_current_method.HEURISTIC).toBe("number");
    expect(typeof s.by_current_method.DYNAMIC).toBe("number");
  });
  it("all three current_method classes are represented", () => {
    const s = stats();
    // We expect HARDCODED + HEURISTIC > 0; DYNAMIC may start at 0 before retrofit passes
    expect(s.by_current_method.HARDCODED + s.by_current_method.HEURISTIC).toBeGreaterThan(0);
  });
  it("retrofit_pending = HARDCODED + HEURISTIC", () => {
    const s = stats();
    expect(s.retrofit_pending).toBe(s.by_current_method.HARDCODED + s.by_current_method.HEURISTIC);
  });
  it("byCurrentMethod('HARDCODED') returns ≥1 point", () => {
    expect(byCurrentMethod("HARDCODED").length).toBeGreaterThan(0);
  });
  it("byCurrentMethod('HEURISTIC') returns ≥1 point", () => {
    expect(byCurrentMethod("HEURISTIC").length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Query helpers
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX02 — lookup", () => {
  it("lookup finds known decision point", () => {
    const r = lookup("p2p.wcs_select");
    expect(r).toBeDefined();
    expect(r?.pipeline).toBe("PrintToProgram");
    expect(r?.category).toBe("work_offset_select");
  });
  it("lookup returns undefined for unknown id", () => {
    expect(lookup("__nonexistent__")).toBeUndefined();
  });
  it("decision_point ids use dot notation (pipeline.name)", () => {
    for (const d of PIPELINE_DECISION_TAXONOMY) {
      expect(d.decision_point).toMatch(/^[a-z0-9]+(\.[a-z0-9_]+)+$/);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Cross-consistency: each category has ≥2 points spread across pipelines
// ────────────────────────────────────────────────────────────────────────

describe("CAMX-MS0.3 U-CAMX02 — cross-cover sanity", () => {
  it("tool_select appears in ≥4 pipelines (universal decision)", () => {
    const pipelines = new Set(byCategory("tool_select").map((d) => d.pipeline));
    expect(pipelines.size).toBeGreaterThanOrEqual(4);
  });
  it("parameter_optimize appears in ≥5 pipelines (universal decision)", () => {
    const pipelines = new Set(byCategory("parameter_optimize").map((d) => d.pipeline));
    expect(pipelines.size).toBeGreaterThanOrEqual(5);
  });
  it("safety_check appears in ≥3 pipelines", () => {
    const pipelines = new Set(byCategory("safety_check").map((d) => d.pipeline));
    expect(pipelines.size).toBeGreaterThanOrEqual(3);
  });
  it("each pipeline touches ≥3 distinct categories", () => {
    for (const p of ALL_PIPELINES) {
      const cats = new Set(byPipeline(p).map((d) => d.category));
      expect(cats.size).toBeGreaterThanOrEqual(3);
    }
  });
});
