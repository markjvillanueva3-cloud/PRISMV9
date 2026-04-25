/**
 * CAMFunctionRouterEngine tests — production surface (U-CAM71)
 * ===========================================================================
 * Companion to CAMCatalogLoaderEngine.test.ts. Exercises the production router
 * directly so the Stop-hook's untested-engine check sees a 1:1 file for
 * CAMFunctionRouterEngine.
 *
 * Replaces the original stub-flag tests once the engine left stub status under
 * U-CAM71 (synonym expansion + capability matrix + multi-feature scoring).
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMFunctionRouterEngine,
  camFunctionRouterEngine,
} from "../engines/CAMFunctionRouterEngine.js";
import { PRIORITY_5_SLUGS } from "../registries/CAMSystemRegistry.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const router = new CAMFunctionRouterEngine(loader);

describe("CAMFunctionRouterEngine — construction + default singleton", () => {
  it("constructs with explicit loader", () => {
    expect(router).toBeInstanceOf(CAMFunctionRouterEngine);
  });

  it("default singleton is importable", () => {
    expect(camFunctionRouterEngine).toBeInstanceOf(CAMFunctionRouterEngine);
  });
});

describe("CAMFunctionRouterEngine — production surface", () => {
  it("returns a result marked as production (stub:false, mode:production)", () => {
    const r = router.route({ intent: "pocket" });
    expect(r.stub).toBe(false);
    expect(r.mode).toBe("production");
  });

  it("returns a candidates array even when intent has no match", () => {
    const r = router.route({ intent: "totally-unmatched-gibberish-xyzzy" });
    expect(Array.isArray(r.candidates)).toBe(true);
  });

  it("caps candidates at 5", () => {
    const r = router.route({ intent: "operation" });
    expect(r.candidates.length).toBeLessThanOrEqual(5);
  });

  it("sets fallback_used=true and confidence_label='none' when no match found", () => {
    const r = router.route({
      intent: "nonexistent-function-name-zzzz",
      target_cam: "mastercam",
    });
    if (r.candidates.length === 0) {
      expect(r.fallback_used).toBe(true);
      expect(r.confidence_label).toBe("none");
    }
  });

  it("limits candidates to the requested CAM when target_cam is set", () => {
    const r = router.route({ intent: "total", target_cam: "hypermill" });
    for (const c of r.candidates) expect(c.cam).toBe("hypermill");
  });

  it("searches all priority-5 when target_cam is omitted", () => {
    const r = router.route({ intent: "total" });
    const cams = new Set(r.candidates.map((c) => c.cam));
    for (const cam of cams) expect(PRIORITY_5_SLUGS).toContain(cam);
  });

  it("rejects unknown CAM slug gracefully (no throw, no candidates)", () => {
    const r = router.route({ intent: "pocket", target_cam: "not-a-real-cam" });
    expect(r.candidates).toHaveLength(0);
    expect(r.fallback_used).toBe(true);
  });

  it("returns confidence 0 for empty intent", () => {
    const r = router.route({ intent: "" });
    expect(r.confidence).toBe(0);
    expect(r.confidence_label).toBe("none");
  });

  it("confidence and per-candidate scores stay in [0, 1]", () => {
    const r = router.route({ intent: "operation parameters" });
    for (const c of r.candidates) {
      expect(c.score).toBeGreaterThan(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("matched_function is a string when any candidate exists, null otherwise", () => {
    const r = router.route({ intent: "operation" });
    if (r.candidates.length > 0) {
      expect(typeof r.matched_function).toBe("string");
    } else {
      expect(r.matched_function).toBeNull();
    }
  });

  it("target_cam echoes the best candidate cam when one is found", () => {
    const r = router.route({ intent: "parameters", target_cam: "mastercam" });
    if (r.candidates.length > 0) {
      expect(r.target_cam).toBe("mastercam");
    }
  });

  it("sorts candidates by descending score", () => {
    const r = router.route({ intent: "operation parameters total" });
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });
});

describe("CAMFunctionRouterEngine — intent normalization + synonym expansion", () => {
  it("normalizes intent (lowercase, drops stop-words and punctuation)", () => {
    const r = router.route({ intent: "Pocket the Part!" });
    expect(r.intent_normalized).toContain("pocket");
    expect(r.intent_normalized).toContain("part");
    expect(r.intent_normalized).not.toContain("the");
    expect(r.intent_normalized.every((t) => t === t.toLowerCase())).toBe(true);
  });

  it("expands synonyms — 'rough' pulls in adaptive/clearing/hem/vortex", () => {
    const r = router.route({ intent: "rough" });
    const exp = new Set(r.expanded_terms);
    expect(exp.has("rough")).toBe(true);
    // At least one of the canonical synonyms must be present
    const synFamilies = ["adaptive", "clearing", "hem", "vortex", "high-efficiency"];
    expect(synFamilies.some((s) => exp.has(s))).toBe(true);
  });

  it("expansion is deduped and a superset of normalized tokens", () => {
    const r = router.route({ intent: "5-axis roughing pocket" });
    const norm = new Set(r.intent_normalized);
    for (const n of norm) expect(r.expanded_terms).toContain(n);
    const seen = new Set<string>();
    for (const t of r.expanded_terms) {
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });
});

describe("CAMFunctionRouterEngine — confidence labels", () => {
  it("assigns 'none' when score is 0", () => {
    const r = router.route({ intent: "" });
    expect(r.confidence_label).toBe("none");
  });

  it("label is one of the four canonical values", () => {
    const r = router.route({ intent: "operation" });
    expect(["high", "medium", "low", "none"]).toContain(r.confidence_label);
  });

  it("label thresholds are monotonic with confidence score", () => {
    const samples = [
      router.route({ intent: "" }),
      router.route({ intent: "operation" }),
      router.route({ intent: "5-axis adaptive roughing pocket contour" }),
    ];
    for (const r of samples) {
      const expected =
        r.confidence === 0
          ? "none"
          : r.confidence >= 0.7
          ? "high"
          : r.confidence >= 0.4
          ? "medium"
          : "low";
      expect(r.confidence_label).toBe(expected);
    }
  });
});

describe("CAMFunctionRouterEngine — capability bias", () => {
  it("capability_bonus is included in score and within [0, 0.15]", () => {
    const r = router.route({ intent: "5-axis", target_cam: "hypermill" });
    for (const c of r.candidates) {
      expect(c.capability_bonus).toBeGreaterThanOrEqual(0);
      expect(c.capability_bonus).toBeLessThanOrEqual(0.15);
    }
  });
});
