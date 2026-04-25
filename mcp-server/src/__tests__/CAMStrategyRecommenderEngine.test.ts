/**
 * CAMStrategyRecommenderEngine tests — production surface (U-CAM73)
 * ===========================================================================
 * Companion to CAMCatalogLoaderEngine.test.ts. Covers the recommender's
 * own file (extracted from CAMPhase5Stubs.ts under U-CAM73) so the Stop-hook
 * untested-engine check sees a 1:1 file for the engine.
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMStrategyRecommenderEngine,
  camStrategyRecommenderEngine,
} from "../engines/CAMStrategyRecommenderEngine.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const recommender = new CAMStrategyRecommenderEngine(loader);

describe("CAMStrategyRecommenderEngine — construction + default singleton", () => {
  it("constructs with explicit loader", () => {
    expect(recommender).toBeInstanceOf(CAMStrategyRecommenderEngine);
  });

  it("default singleton is importable", () => {
    expect(camStrategyRecommenderEngine).toBeInstanceOf(CAMStrategyRecommenderEngine);
  });
});

describe("CAMStrategyRecommenderEngine — basic surface", () => {
  it("returns a production-mode result (stub:false, mode:'production')", () => {
    const r = recommender.recommend({ target_cam: "hypermill", part_hint: "pocket" });
    expect(r.stub).toBe(false);
    expect(r.mode).toBe("production");
  });

  it("returns null + 'unknown CAM slug' rationale for unknown target_cam", () => {
    const r = recommender.recommend({ target_cam: "not-a-real-cam" });
    expect(r.recommended_strategy).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.confidence_label).toBe("none");
    expect(r.rationale).toMatch(/unknown CAM slug/);
    expect(r.candidates).toHaveLength(0);
  });

  it("solidcam yields a real recommendation now that U-CAM33-37 catalog data is on disk", () => {
    // Premise of this test changed when CAM-EXHAUST-MS0/U-CAM33..U-CAM37 landed
    // the SolidCAM extractions (2.5d-operations, 3d-hss-hsr, 5-axis, imachining,
    // turning-millturn). The recommender now produces real candidates for
    // solidcam+pocket, so the assertion flips from null to non-null.
    const r = recommender.recommend({ target_cam: "solidcam", part_hint: "pocket" });
    expect(r.recommended_strategy).not.toBeNull();
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.rationale.length).toBeGreaterThan(0);
  });

  it("hypermill+pocket yields a non-null recommendation with positive confidence", () => {
    const r = recommender.recommend({ target_cam: "hypermill", part_hint: "pocket" });
    expect(r.catalog_param_count).toBeGreaterThan(0);
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.recommended_strategy).not.toBeNull();
  });
});

describe("CAMStrategyRecommenderEngine — scoring + ranking", () => {
  it("candidates are sorted by descending score", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "pocket adaptive",
      material: "AL6061",
    });
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });

  it("score equals the sum of weighted parts (part_hint + material + capability)", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "5-axis swarf blade",
      material: "Inconel 718",
    });
    for (const c of r.candidates) {
      const sum = c.parts.part_hint + c.parts.material + c.parts.capability;
      expect(c.score).toBeCloseTo(sum, 5);
    }
  });

  it("each part-component sits in its weighted upper bound", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "pocket",
      material: "AL6061",
    });
    for (const c of r.candidates) {
      expect(c.parts.part_hint).toBeGreaterThanOrEqual(0);
      expect(c.parts.part_hint).toBeLessThanOrEqual(0.4);
      expect(c.parts.material).toBeGreaterThanOrEqual(0);
      expect(c.parts.material).toBeLessThanOrEqual(0.35);
      expect(c.parts.capability).toBeGreaterThanOrEqual(0);
      expect(c.parts.capability).toBeLessThanOrEqual(0.25);
    }
  });

  it("alternatives is best.length-1 names from candidates (excludes the top pick)", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "pocket",
      material: "AL6061",
      max_alternatives: 3,
    });
    if (r.candidates.length > 1) {
      expect(r.alternatives.length).toBe(r.candidates.length - 1);
      expect(r.alternatives.includes(r.recommended_strategy as string)).toBe(false);
    }
  });
});

describe("CAMStrategyRecommenderEngine — domain-knowledge expansion", () => {
  it("part_hint 'pocket' boosts pocket/area/adaptive operations on hypermill", () => {
    const r = recommender.recommend({ target_cam: "hypermill", part_hint: "pocket" });
    if (r.candidates.length > 0) {
      // top candidates' part-hint contribution must exceed zero somewhere
      const anyPartHit = r.candidates.some((c) => c.parts.part_hint > 0);
      expect(anyPartHit).toBe(true);
    }
  });

  it("material 'AL6061' triggers material-affinity score on at least one candidate", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "rough",
      material: "AL6061",
    });
    if (r.candidates.length > 0) {
      const anyMatHit = r.candidates.some((c) => c.parts.material > 0);
      expect(anyMatHit).toBe(true);
    }
  });

  it("capability bias is non-zero on at least one hypermill 5-axis candidate", () => {
    const r = recommender.recommend({ target_cam: "hypermill", part_hint: "5-axis swarf" });
    if (r.candidates.length > 0) {
      const anyCap = r.candidates.some((c) => c.parts.capability > 0);
      expect(anyCap).toBe(true);
    }
  });

  it("empty inputs (no part_hint + no material) still works without throwing — pure capability score", () => {
    const r = recommender.recommend({ target_cam: "hypermill" });
    expect(r.stub).toBe(false);
    for (const c of r.candidates) {
      expect(c.parts.part_hint).toBe(0);
      expect(c.parts.material).toBe(0);
      // capability may still produce a positive score
    }
  });
});

describe("CAMStrategyRecommenderEngine — confidence labels", () => {
  it("labels 'none' when confidence is 0", () => {
    const r = recommender.recommend({ target_cam: "not-a-real-cam" });
    expect(r.confidence).toBe(0);
    expect(r.confidence_label).toBe("none");
  });

  it("label is one of the four canonical values", () => {
    const r = recommender.recommend({ target_cam: "hypermill", part_hint: "pocket" });
    expect(["high", "medium", "low", "none"]).toContain(r.confidence_label);
  });

  it("rationale references CAM strategy drivers when a candidate is found", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "5-axis swarf",
      material: "Ti-6Al-4V",
    });
    if (r.recommended_strategy !== null) {
      expect(r.rationale).toMatch(/selected/);
    }
  });
});

describe("CAMStrategyRecommenderEngine — alternatives cap", () => {
  it("respects max_alternatives — caps top list at max+1 entries", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "pocket adaptive",
      material: "AL6061",
      max_alternatives: 2,
    });
    expect(r.candidates.length).toBeLessThanOrEqual(3); // 1 best + 2 alternatives
  });

  it("default max_alternatives is 4 → at most 5 entries", () => {
    const r = recommender.recommend({
      target_cam: "hypermill",
      part_hint: "pocket",
      material: "AL6061",
    });
    expect(r.candidates.length).toBeLessThanOrEqual(5);
  });
});
