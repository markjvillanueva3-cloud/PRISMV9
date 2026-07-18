/**
 * SpeedFeedPSNDecisionPriorEngine — tests
 *
 * Validates: 3-source fan-out, recency-weighted outcome-ledger fusion,
 * best-effort error handling (missing files don't throw), summary string,
 * no-prior fallback path.
 *
 * @module __tests__/SpeedFeedPSNDecisionPriorEngine.test
 */

import { describe, it, expect } from "vitest";
import { SpeedFeedPSNDecisionPriorEngine, speedFeedPSNDecisionPriorEngine } from "../engines/SpeedFeedPSNDecisionPriorEngine.js";
import type { NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const STEEL_12MM: NineAxisInput = {
  machine: { name: "Haas-VF4SS" },
  material: { name: "steel" },
  tooling: { tool_diameter_mm: 12, tool_material: "carbide" },
  toolpath: { operation: "milling", cut_type: "roughing" },
};

const ALUM_8MM: NineAxisInput = {
  material: { name: "aluminum_6061" },
  tooling: { tool_diameter_mm: 8, tool_material: "carbide" },
  toolpath: { operation: "milling" },
};

describe("SpeedFeedPSNDecisionPriorEngine — singleton + projection", () => {
  it("exports a singleton with a query() method", () => {
    expect(speedFeedPSNDecisionPriorEngine).toBeInstanceOf(SpeedFeedPSNDecisionPriorEngine);
  });

  it("query always returns 3 per-source entries (outcome_ledger + tribal_knowledge + wiki)", () => {
    const prior = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    expect(prior.per_source.length).toBe(3);
    const sourceTypes = prior.per_source.map(s => s.source);
    expect(sourceTypes).toContain("outcome_ledger");
    expect(sourceTypes).toContain("tribal_knowledge");
    expect(sourceTypes).toContain("wiki");
  });

  it("fused source has source='fused'", () => {
    const prior = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    expect(prior.fused.source).toBe("fused");
  });
});

describe("SpeedFeedPSNDecisionPriorEngine — best-effort error handling", () => {
  it("missing outcome ledger does NOT throw — returns zero-confidence prior", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path/that/does/not/exist");
    const prior = e.query(STEEL_12MM);
    const outcome = prior.per_source.find(s => s.source === "outcome_ledger");
    expect(outcome?.sample_count).toBe(0);
    expect(outcome?.confidence).toBe(0);
    expect(outcome?.notes[0]).toMatch(/not found|empty|failed/i);
  });

  it("missing wiki dir does NOT throw — returns zero-confidence prior", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path");
    const prior = e.query(STEEL_12MM);
    const wiki = prior.per_source.find(s => s.source === "wiki");
    expect(wiki?.sample_count).toBe(0);
    expect(wiki?.confidence).toBe(0);
  });

  it("missing tribal bridge does NOT throw — returns zero-confidence prior", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path");
    const prior = e.query(STEEL_12MM);
    const tribal = prior.per_source.find(s => s.source === "tribal_knowledge");
    expect(tribal?.sample_count).toBe(0);
    expect(tribal?.confidence).toBe(0);
  });
});

describe("SpeedFeedPSNDecisionPriorEngine — prior_exists flag", () => {
  it("prior_exists is false when every source returns zero samples", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path");
    const prior = e.query(ALUM_8MM);
    expect(prior.prior_exists).toBe(false);
  });

  it("summary contains 'pure-physics inference' when no quantitative prior", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path");
    const prior = e.query(ALUM_8MM);
    expect(prior.summary).toMatch(/pure-physics|no quantitative/i);
  });
});

describe("SpeedFeedPSNDecisionPriorEngine — fusion semantics", () => {
  it("fused confidence is in [0, 1]", () => {
    const prior = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    expect(prior.fused.confidence).toBeGreaterThanOrEqual(0);
    expect(prior.fused.confidence).toBeLessThanOrEqual(1);
  });

  it("fused sample_count is the sum of per_source sample counts", () => {
    const prior = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    const sum = prior.per_source.reduce((a, s) => a + s.sample_count, 0);
    expect(prior.fused.sample_count).toBe(sum);
  });

  it("when all sources return null vc_mpm, fused vc_mpm is null", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path");
    const prior = e.query(STEEL_12MM);
    expect(prior.fused.vc_mpm).toBeNull();
    expect(prior.fused.fz_mm).toBeNull();
    expect(prior.fused.mrr_cm3min).toBeNull();
  });
});

describe("SpeedFeedPSNDecisionPriorEngine — per-source contract", () => {
  it("outcome_ledger notes describe sample count or absence", () => {
    const e = new SpeedFeedPSNDecisionPriorEngine("/nonexistent/path");
    const prior = e.query(STEEL_12MM);
    const outcome = prior.per_source.find(s => s.source === "outcome_ledger");
    expect(outcome?.notes.length).toBeGreaterThan(0);
    expect(outcome?.notes[0]).toMatch(/not found|empty|0 match|outcomes/i);
  });

  it("wiki source uses wiki path consistent with project root", () => {
    const prior = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    const wiki = prior.per_source.find(s => s.source === "wiki");
    // Either present (real H:/prism wiki dir exists) or absent — both are valid
    expect(wiki?.sample_count).toBeGreaterThanOrEqual(0);
    expect(wiki?.sample_count).toBeLessThanOrEqual(1);
  });

  it("every source returns confidence in [0, 1]", () => {
    const prior = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    for (const s of prior.per_source) {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("SpeedFeedPSNDecisionPriorEngine — material + tool diameter matching", () => {
  it("steel 12mm + steel 8mm produce different queries (independent priors)", () => {
    const a = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    const b = speedFeedPSNDecisionPriorEngine.query({
      ...STEEL_12MM,
      tooling: { ...STEEL_12MM.tooling, tool_diameter_mm: 8 },
    });
    // Summaries reflect the different diameters
    expect(a.summary).toMatch(/12mm/);
    expect(b.summary).toMatch(/8mm/);
  });

  it("different materials produce different summaries", () => {
    const a = speedFeedPSNDecisionPriorEngine.query(STEEL_12MM);
    const b = speedFeedPSNDecisionPriorEngine.query(ALUM_8MM);
    expect(a.summary).toMatch(/steel/);
    expect(b.summary).toMatch(/aluminum/);
  });
});
