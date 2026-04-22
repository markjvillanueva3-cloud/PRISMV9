/**
 * CAMCatalogEnrichmentValidator tests — U-CAM-ENRICH-04
 * ========================================================
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMCatalogEnrichmentValidator,
  camCatalogEnrichmentValidator,
} from "../engines/CAMCatalogEnrichmentValidator.js";

const engine = new CAMCatalogEnrichmentValidator();

function tmpIndex(tmp: string) {
  const phys = {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    cams: {
      mastercam: {
        source_files: [], total_params_scanned: 100, matched_params: 40, coverage_pct: 40,
        matches: [],
      },
      hypermill: {
        source_files: [], total_params_scanned: 50, matched_params: 25, coverage_pct: 50,
        matches: [],
      },
    },
    global_summary: { total_cams: 2, total_matches: 65, formula_usage: {} },
  };
  const trib = {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    total_tips_scanned: 200, total_tips_with_matches: 120, total_links: 120,
    by_tip: {}, by_param: {}, by_cam_param: {},
    summary: {
      per_cam_tip_count: { mastercam: 100, hypermill: 100 },
      per_cam_linked_count: { mastercam: 60, hypermill: 60 },
      top_formulas: {},
    },
  };
  const acts = {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    total_params: 65, total_actions: 200,
    by_cam_param: { mastercam: [], hypermill: [] },
    summary: { per_cam_count: { mastercam: 40, hypermill: 25 }, action_usage: {} },
  };

  const physPath = path.join(tmp, "phys.json");
  const tribPath = path.join(tmp, "trib.json");
  const actsPath = path.join(tmp, "acts.json");
  fs.writeFileSync(physPath, JSON.stringify(phys));
  fs.writeFileSync(tribPath, JSON.stringify(trib));
  fs.writeFileSync(actsPath, JSON.stringify(acts));
  return { physPath, tribPath, actsPath };
}

describe("CAMCatalogEnrichmentValidator — validate()", () => {
  it("reports per-CAM coverage from all three indexes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath: path.join(tmp, "baseline.json"),
      });
      expect(r.reports).toHaveLength(2);
      const mc = r.reports.find((x) => x.cam_slug === "mastercam")!;
      expect(mc.physics_coverage_pct).toBeCloseTo(40, 1);
      expect(mc.actions_coverage_pct).toBeCloseTo(40, 1);
      expect(mc.tips_linked_pct).toBeCloseTo(60, 1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("computes overall_score as weighted combo (0.5/0.3/0.2)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
      });
      const mc = r.reports.find((x) => x.cam_slug === "mastercam")!;
      const expected = 40 * 0.5 + 40 * 0.3 + 60 * 0.2; // 44
      expect(mc.overall_score).toBeCloseTo(expected, 1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("writes a baseline when none exists + writeBaselineIfMissing=true", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const baselinePath = path.join(tmp, "baseline.json");
      engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
        writeBaselineIfMissing: true,
      });
      expect(fs.existsSync(baselinePath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
      expect(saved.per_cam.mastercam.physics_coverage_pct).toBeCloseTo(40, 1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("passes when current ≥ baseline (no regression)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const baselinePath = path.join(tmp, "baseline.json");
      engine.captureBaseline({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
      });
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
      });
      expect(r.baseline_compared).toBe(true);
      expect(r.regressions).toHaveLength(0);
      expect(r.passed).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("detects regressions when current < baseline × (1 - drift)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const baselinePath = path.join(tmp, "baseline.json");
      engine.captureBaseline({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
      });
      // Rewrite a regressed physics index (mastercam drops 40% → 10%)
      const phys = JSON.parse(fs.readFileSync(physPath, "utf-8"));
      phys.cams.mastercam.matched_params = 10;
      phys.cams.mastercam.coverage_pct = 10;
      fs.writeFileSync(physPath, JSON.stringify(phys));
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
        driftTolerance: 0.10,
      });
      expect(r.passed).toBe(false);
      expect(r.regressions.length).toBeGreaterThan(0);
      expect(r.regressions.find((x) => x.cam_slug === "mastercam" && x.metric === "physics_coverage_pct")).toBeDefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("returns empty report set when all indexes missing", () => {
    const r = engine.validate({
      physicsIndexPath: "/nonexistent/phys.json",
      tribalIndexPath: "/nonexistent/trib.json",
      aiActionsIndexPath: "/nonexistent/acts.json",
      baselinePath: "/nonexistent/baseline.json",
    });
    expect(r.reports).toHaveLength(0);
    expect(r.global_score).toBe(0);
    expect(r.baseline_compared).toBe(false);
  });

  it("handles a CAM with only tribal-tip data (zero params)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const trib = {
        schemaVersion: 1, generated_at: new Date().toISOString(),
        total_tips_scanned: 10, total_tips_with_matches: 5, total_links: 5,
        by_tip: {}, by_param: {}, by_cam_param: {},
        summary: {
          per_cam_tip_count: { solidcam: 10 },
          per_cam_linked_count: { solidcam: 5 },
          top_formulas: {},
        },
      };
      const p = path.join(tmp, "trib.json");
      fs.writeFileSync(p, JSON.stringify(trib));
      const r = engine.validate({
        physicsIndexPath: "/missing",
        tribalIndexPath: p,
        aiActionsIndexPath: "/missing",
        baselinePath: path.join(tmp, "baseline.json"),
      });
      const sc = r.reports.find((x) => x.cam_slug === "solidcam")!;
      expect(sc.tips_linked_pct).toBeCloseTo(50, 1);
      expect(sc.physics_coverage_pct).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("captureBaseline() always writes a fresh baseline even if one exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const baselinePath = path.join(tmp, "baseline.json");
      fs.writeFileSync(baselinePath, JSON.stringify({ schemaVersion: 1, captured_at: "2020-01-01", per_cam: {} }));
      const b = engine.captureBaseline({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
      });
      expect(b.captured_at).not.toBe("2020-01-01");
      expect(b.per_cam.mastercam).toBeDefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("driftTolerance of 0 means any drop is a regression", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const baselinePath = path.join(tmp, "baseline.json");
      engine.captureBaseline({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
      });
      // Drop mastercam physics 40 → 39 (tiny regression)
      const phys = JSON.parse(fs.readFileSync(physPath, "utf-8"));
      phys.cams.mastercam.matched_params = 39;
      fs.writeFileSync(physPath, JSON.stringify(phys));
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
        driftTolerance: 0,
      });
      expect(r.regressions.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("driftTolerance of 0.5 swallows a 50% drop", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const baselinePath = path.join(tmp, "baseline.json");
      engine.captureBaseline({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
      });
      const phys = JSON.parse(fs.readFileSync(physPath, "utf-8"));
      phys.cams.mastercam.matched_params = 25; // 40→25 ≈ 37.5% drop
      fs.writeFileSync(physPath, JSON.stringify(phys));
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath,
        driftTolerance: 0.5,
      });
      // 25/100=25; baseline=40; allowed=40*0.5=20 → 25≥20 → no regression
      expect(r.regressions.find((x) => x.cam_slug === "mastercam" && x.metric === "physics_coverage_pct")).toBeUndefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("minOverallScore enforces a floor even without baseline", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-val-"));
    try {
      const { physPath, tribPath, actsPath } = tmpIndex(tmp);
      const r = engine.validate({
        physicsIndexPath: physPath,
        tribalIndexPath: tribPath,
        aiActionsIndexPath: actsPath,
        baselinePath: path.join(tmp, "baseline.json"),
        minOverallScore: 99,
      });
      expect(r.passed).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("singleton is importable + same type", () => {
    expect(camCatalogEnrichmentValidator).toBeInstanceOf(CAMCatalogEnrichmentValidator);
    expect(camCatalogEnrichmentValidator.name).toBe("CAMCatalogEnrichmentValidator");
  });
});
