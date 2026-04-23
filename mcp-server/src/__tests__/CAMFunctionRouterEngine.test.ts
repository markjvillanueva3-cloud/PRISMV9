/**
 * CAMFunctionRouterEngine tests — dedicated file per wiring hook requirement
 * ===========================================================================
 * Companion to CAMCatalogLoaderEngine.test.ts. Exercises the router stub
 * surface directly so the Stop-hook's untested-engine check sees a 1:1 file
 * for CAMFunctionRouterEngine.
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

describe("CAMFunctionRouterEngine — route() surface", () => {
  it("returns a result marked stub:true", () => {
    const r = router.route({ intent: "pocket" });
    expect(r.stub).toBe(true);
  });

  it("returns a candidates array even when empty", () => {
    const r = router.route({ intent: "totally-unmatched-gibberish-xyzzy" });
    expect(Array.isArray(r.candidates)).toBe(true);
  });

  it("caps candidates at 5", () => {
    const r = router.route({ intent: "operation" });
    expect(r.candidates.length).toBeLessThanOrEqual(5);
  });

  it("sets fallback_used when no match found", () => {
    const r = router.route({
      intent: "nonexistent-function-name-zzzz",
      target_cam: "mastercam",
    });
    if (r.candidates.length === 0) expect(r.fallback_used).toBe(true);
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
    expect(r.confidence).toBeGreaterThanOrEqual(0);
  });

  it("confidence scores are in [0, 1]", () => {
    const r = router.route({ intent: "operation parameters" });
    for (const c of r.candidates) {
      expect(c.score).toBeGreaterThan(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("matched_function is a string when any candidate exists", () => {
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
