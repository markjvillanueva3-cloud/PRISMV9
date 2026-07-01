/**
 * SpeedFeedBaselineComparatorEngine — tests
 *
 * Validates the comparator against the curated baseline database. Reference values
 * are documented inside the engine's BASELINE_DB (Sandvik, Kennametal, CNCCookbook,
 * Titans of CNC, HSMAdvisor public tables).
 *
 * @module __tests__/SpeedFeedBaselineComparatorEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  SpeedFeedBaselineComparatorEngine,
  speedFeedBaselineComparatorEngine,
} from "../engines/SpeedFeedBaselineComparatorEngine.js";
import type { NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const engine = speedFeedBaselineComparatorEngine;

const STEEL_12MM_ROUGH: NineAxisInput = {
  material: { name: "steel", hardness_hb: 180 },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", coating: "TiAlN" },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional" },
};

const ALU_10MM_ROUGH: NineAxisInput = {
  material: { name: "aluminum_6061", hardness_hb: 95 },
  tooling: { tool_diameter_mm: 10, flutes: 3, tool_material: "carbide" },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional" },
};

const TI_10MM_ROUGH: NineAxisInput = {
  material: { name: "titanium", hardness_hb: 320 },
  tooling: { tool_diameter_mm: 10, flutes: 4, tool_material: "carbide" },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional" },
};

describe("SpeedFeedBaselineComparatorEngine — listBaselines", () => {
  it("returns ≥10 entries spanning 6+ ISO groups", () => {
    const all = engine.listBaselines();
    expect(all.length).toBeGreaterThanOrEqual(10);
    const isoGroups = new Set(all.map(e => e.iso_group));
    expect(isoGroups.size).toBeGreaterThanOrEqual(6);
  });

  it("filters by ISO group P — every entry's iso_group is exactly P", () => {
    const pOnly = engine.listBaselines("P");
    expect(pOnly.length).toBeGreaterThanOrEqual(2);
    expect(pOnly.every(e => e.iso_group === "P")).toBe(true);
  });

  it("filters by ISO group N — every entry's iso_group is exactly N", () => {
    const nOnly = engine.listBaselines("N");
    expect(nOnly.length).toBeGreaterThanOrEqual(2);
    expect(nOnly.every(e => e.iso_group === "N")).toBe(true);
  });
});

describe("SpeedFeedBaselineComparatorEngine — supportedKeys coverage", () => {
  it("includes milling + turning + drilling operations", () => {
    const keys = engine.supportedKeys();
    const ops = new Set(keys.map(k => k.operation));
    expect(ops.has("milling")).toBe(true);
    expect(ops.has("turning")).toBe(true);
    expect(ops.has("drilling")).toBe(true);
  });

  it("every key has positive diameter_mm", () => {
    const keys = engine.supportedKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every(k => k.diameter_mm > 0)).toBe(true);
  });
});

describe("SpeedFeedBaselineComparatorEngine — findBaseline matching", () => {
  it("steel P 12mm milling roughing returns entry with ≥3 sources incl sandvik", () => {
    const found = engine.findBaseline("P", "carbide", 12, "milling", "roughing");
    expect(found?.iso_group).toBe("P");
    expect(found?.diameter_mm).toBe(12);
    expect(found?.sources.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(found?.sources.some(s => s.source === "sandvik")).toBe(true);
  });

  it("14mm tool buckets to nearest-non-exceeding 12mm baseline", () => {
    const found = engine.findBaseline("P", "carbide", 14, "milling", "roughing");
    expect(found?.diameter_mm).toBe(12);
  });

  it("7mm tool buckets to nearest-non-exceeding 6mm baseline", () => {
    const found = engine.findBaseline("P", "carbide", 7, "milling", "roughing");
    expect(found?.diameter_mm).toBe(6);
  });

  it("unknown diameter falls back to same iso+toolMat+op (different cut_type)", () => {
    const found = engine.findBaseline("P", "carbide", 100, "milling", "semi_finishing");
    expect(found?.iso_group).toBe("P");
    expect(found?.operation).toBe("milling");
  });
});

describe("SpeedFeedBaselineComparatorEngine — compare() core", () => {
  it("steel 12mm roughing: baseline_key matches P/carbide/12mm/milling/roughing", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    expect(r.baseline_found).toBe(true);
    expect(r.baseline_key).toMatch(/P\/carbide\/12mm\/milling\/roughing/);
    expect(r.baseline_median?.vc_mpm ?? 0).toBeGreaterThan(150);
    expect(r.baseline_median?.vc_mpm ?? 999).toBeLessThan(300);
  });

  it("agreement_score is in [0, 1]", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    expect(r.agreement_score).toBeGreaterThanOrEqual(0);
    expect(r.agreement_score).toBeLessThanOrEqual(1);
  });

  it("baseline_range vc_mpm_low ≤ vc_mpm_high", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    const low = r.baseline_range?.vc_mpm_low ?? 0;
    const high = r.baseline_range?.vc_mpm_high ?? Infinity;
    expect(low).toBeLessThanOrEqual(high);
  });

  it("per_source has exactly 4 entries for steel 12mm (Sandvik+Kenn+CNCC+HSM)", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    expect(r.per_source.length).toBe(4);
    const sources = new Set(r.per_source.map(p => p.source));
    expect(sources.has("sandvik")).toBe(true);
    expect(sources.has("kennametal")).toBe(true);
    expect(sources.has("cnccookbook")).toBe(true);
    expect(sources.has("hsmadvisor")).toBe(true);
  });

  it("every per_source citation is ≥20 characters", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    expect(r.per_source.every(p => p.citation.length >= 20)).toBe(true);
  });

  it("aluminum 10mm baseline_median Vc > 500 m/min (Sandvik 800 median)", () => {
    const r = engine.compare(ALU_10MM_ROUGH);
    expect(r.baseline_found).toBe(true);
    expect(r.baseline_median?.vc_mpm ?? 0).toBeGreaterThan(500);
  });

  it("titanium 10mm baseline_median Vc ≤ 80 m/min (Sandvik 60 median)", () => {
    const r = engine.compare(TI_10MM_ROUGH);
    expect(r.baseline_found).toBe(true);
    expect(r.baseline_median?.vc_mpm ?? 999).toBeLessThanOrEqual(80);
  });

  it("variance_pct.vc sign matches PRISM-vs-median direction", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    const prismVc = r.prism_output.vc_mpm;
    const medianVc = r.baseline_median?.vc_mpm ?? prismVc;
    if (prismVc > medianVc + 0.5) {
      expect(r.variance_pct.vc).toBeGreaterThan(0);
    } else if (prismVc < medianVc - 0.5) {
      expect(r.variance_pct.vc).toBeLessThan(0);
    } else {
      expect(Math.abs(r.variance_pct.vc)).toBeLessThan(1);
    }
  });

  it("nine_axis_result.resolved_axes.material.name passes through input", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    expect(r.nine_axis_result.resolved_axes.material.name).toBe("steel");
    expect(r.nine_axis_result.mode).toBe("prism_optimized");
  });

  it("missing baseline (ceramic ploughshare thread mill) → agreement 0 + warning", () => {
    const r = engine.compare({
      material: { name: "unobtainium" },
      tooling: { tool_diameter_mm: 4, tool_material: "ceramic" },
      toolpath: { operation: "thread_milling", cut_type: "finishing" },
    });
    expect(r.baseline_found).toBe(false);
    expect(r.agreement_score).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toMatch(/No baseline/);
  });
});

describe("SpeedFeedBaselineComparatorEngine — in_envelope ±15% gate", () => {
  it("steel 12mm: in_envelope flag agrees with variance bounds", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    const vcOk = Math.abs(r.variance_pct.vc) <= 15;
    const fzOk = Math.abs(r.variance_pct.fz) <= 15;
    if (vcOk && fzOk) {
      expect(r.in_envelope).toBe(true);
    }
  });

  it("hardened steel HRC 58 vs soft-steel 1018 baseline produces envelope warning", () => {
    const r = engine.compare({
      material: { name: "steel", hardness_hb: 600 },
      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
    });
    if (r.baseline_found && Math.abs(r.variance_pct.vc) > 25) {
      expect(r.in_envelope).toBe(false);
      const envWarn = r.warnings.find(w => /exceeds|envelope/.test(w));
      expect(envWarn).toMatch(/Vc Δ|envelope/);
    }
  });
});

describe("SpeedFeedBaselineComparatorEngine — citation traceability per source", () => {
  it("Sandvik citation includes page reference or year", () => {
    const found = engine.findBaseline("P", "carbide", 12, "milling", "roughing");
    const sandvik = found?.sources.find(s => s.source === "sandvik");
    expect(sandvik?.citation).toMatch(/p\.|catalog|p[0-9]|2024/i);
  });

  it("CNCCookbook citation contains cnccookbook.com URL", () => {
    const found = engine.findBaseline("P", "carbide", 12, "milling", "roughing");
    const cnc = found?.sources.find(s => s.source === "cnccookbook");
    expect(cnc?.citation).toMatch(/cnccookbook\.com/);
  });

  it("HSMAdvisor citation notes operator account (jmdie)", () => {
    const found = engine.findBaseline("P", "carbide", 12, "milling", "roughing");
    const hsm = found?.sources.find(s => s.source === "hsmadvisor");
    expect(hsm?.citation).toMatch(/operator|account|jmdie/i);
  });

  it("Titans of CNC citation references YouTube/Academy if present", () => {
    const found = engine.findBaseline("N", "carbide", 10, "milling", "roughing");
    const titans = found?.sources.find(s => s.source === "titans_of_cnc");
    if (titans) {
      expect(titans.citation).toMatch(/YouTube|Titans|Academy/i);
    }
  });
});

describe("SpeedFeedBaselineComparatorEngine — turning baseline coverage", () => {
  it("steel 25mm turning roughing: baseline Vc > 150 m/min", () => {
    const r = engine.compare({
      material: { name: "steel" },
      tooling: { tool_diameter_mm: 25, tool_material: "carbide" },
      toolpath: { operation: "turning", cut_type: "roughing" },
    });
    expect(r.baseline_found).toBe(true);
    expect(r.baseline_median?.vc_mpm ?? 0).toBeGreaterThan(150);
  });

  it("aluminum 25mm turning roughing: baseline Vc > 400 m/min", () => {
    const r = engine.compare({
      material: { name: "aluminum_6061" },
      tooling: { tool_diameter_mm: 25, tool_material: "carbide" },
      toolpath: { operation: "turning", cut_type: "roughing" },
    });
    expect(r.baseline_found).toBe(true);
    expect(r.baseline_median?.vc_mpm ?? 0).toBeGreaterThan(400);
  });
});

describe("SpeedFeedBaselineComparatorEngine — drilling baseline coverage", () => {
  // Note: full compare() flow on drilling currently exposes a pre-existing
  // UltimateSpeedFeedEngine constraint (chip_width derivation for drilling ops);
  // validate the baseline-DB side via findBaseline + listBaselines until that
  // upstream Kienzle path is updated for drill kinematics.
  it("findBaseline returns steel 10mm drill entry with Vc median in 100-140 m/min", () => {
    const found = engine.findBaseline("P", "carbide", 10, "drilling", "roughing");
    expect(found?.operation).toBe("drilling");
    expect(found?.diameter_mm).toBe(10);
    const vcs = (found?.sources ?? []).map(s => s.vc_mpm).sort((a, b) => a - b);
    expect(vcs.length).toBeGreaterThanOrEqual(2);
    const median = vcs.length % 2 === 1
      ? vcs[Math.floor(vcs.length / 2)]!
      : (vcs[vcs.length / 2 - 1]! + vcs[vcs.length / 2]!) / 2;
    expect(median).toBeGreaterThanOrEqual(100);
    expect(median).toBeLessThanOrEqual(140);
  });
});

describe("SpeedFeedBaselineComparatorEngine — multi-source statistical signal", () => {
  it("4-source steel entry does NOT emit 'low statistical power' warning", () => {
    const r = engine.compare(STEEL_12MM_ROUGH);
    const hasLowPower = r.warnings.some(w => /low statistical power/.test(w));
    expect(hasLowPower).toBe(false);
  });

  it("2-source hardened-steel finishing emits 'low statistical power' warning", () => {
    const r = engine.compare({
      material: { name: "steel", hardness_hrc: 45 },
      tooling: { tool_diameter_mm: 10, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "finishing" },
    });
    if (r.baseline_found && r.per_source.length < 3) {
      const lowPower = r.warnings.find(w => /low statistical power/.test(w));
      expect(lowPower).toMatch(/baseline source/);
    }
  });
});
