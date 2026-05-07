/**
 * CAMCatalogLoaderEngine tests
 * =============================
 * Verifies F3 schema binding against the real captured catalogs. If any of
 * these assertions regress, a Phase-1 catalog is malformed or a non-canonical
 * directory has been added.
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import { camFunctionRouterEngine } from "../engines/CAMFunctionRouterEngine.js";
import {
  camParameterValidatorEngine,
  camStrategyRecommenderEngine,
  camCrossSystemTranslatorEngine,
  camParameterOptimizerEngine,
  camAGIReasoningEngine,
  camTribalKnowledgeEngine,
  camFeatureLearningEngine,
} from "../engines/CAMPhase5Stubs.js";
import {
  CAM_SYSTEM_REGISTRY,
  PRIORITY_5_SLUGS,
  getCAMSystem,
  isCAMSlug,
  getCAMSystemsByTier,
} from "../registries/CAMSystemRegistry.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);

describe("CAMSystemRegistry", () => {
  it("contains the full priority-5", () => {
    expect(PRIORITY_5_SLUGS).toContain("mastercam");
    expect(PRIORITY_5_SLUGS).toContain("hypermill");
    expect(PRIORITY_5_SLUGS).toContain("fusion360");
    expect(PRIORITY_5_SLUGS).toContain("inventor-hsm");
    expect(PRIORITY_5_SLUGS).toContain("solidcam");
    expect(PRIORITY_5_SLUGS).toHaveLength(5);
  });

  it("keeps InventorCAM and Inventor HSM as separate systems (F4)", () => {
    const hsm = getCAMSystem("inventor-hsm");
    const ic = getCAMSystem("inventorcam");
    expect(hsm.vendor).toMatch(/Autodesk/i);
    expect(ic.vendor).toMatch(/SolidCAM/i);
    expect(hsm.tier).toBe(1);
    expect(ic.tier).toBe(3);
  });

  it("isCAMSlug rejects unknown slugs", () => {
    expect(isCAMSlug("fusion")).toBe(false); // old non-canonical
    expect(isCAMSlug("fusion360")).toBe(true);
    expect(isCAMSlug("nonsense")).toBe(false);
  });

  it("tier queries return the expected counts", () => {
    expect(getCAMSystemsByTier(1)).toHaveLength(5);
    expect(getCAMSystemsByTier(2).length).toBeGreaterThanOrEqual(3);
    expect(getCAMSystemsByTier(3).length).toBeGreaterThanOrEqual(5);
  });
});

describe("CAMCatalogLoaderEngine", () => {
  it("loads priority-5 systems without throwing", () => {
    const result = loader.loadAll();
    expect(result.loaded_at).toBeTruthy();
    expect(Object.keys(result.systems).length).toBeGreaterThanOrEqual(5);
  });

  it("reports drift for each priority-5 CAM", () => {
    const result = loader.loadAll();
    const slugs = result.drift_report.map((d) => d.slug);
    for (const p5 of PRIORITY_5_SLUGS) {
      expect(slugs).toContain(p5);
    }
  });

  it("detects non-canonical directories if any are added", () => {
    const result = loader.loadAll();
    // After F4 cleanup, no unknown dirs should remain
    expect(result.errors.filter((e) => e.includes("Non-canonical"))).toHaveLength(0);
  });

  it("produces catalog param counts for hypermill (shipped overnight)", () => {
    const sys = loader.loadOne("hypermill");
    expect(sys.has_any_data).toBe(true);
    expect(sys.total_param_count).toBeGreaterThan(0);
    expect(sys.functions_files.length + sys.ui_files.length).toBeGreaterThan(0);
  });

  it("solidcam reports missing data (F2 — no catalog yet)", () => {
    const sys = loader.loadOne("solidcam");
    expect(sys.has_any_data).toBe(false);
    const drift = loader.loadAll().drift_report.find((d) => d.slug === "solidcam");
    expect(drift?.status).toBe("missing");
  });

  it("priority5Coverage returns 5 entries", () => {
    const cov = loader.priority5Coverage();
    expect(cov).toHaveLength(5);
  });
});

describe("CAMFunctionRouterEngine (stub)", () => {
  it("returns a result marked stub", () => {
    const r = camFunctionRouterEngine.route({ intent: "pocket" });
    expect(r.stub).toBe(true);
    expect(r.candidates).toBeInstanceOf(Array);
  });

  it("limits to a single CAM when target_cam is given", () => {
    const r = camFunctionRouterEngine.route({
      intent: "pocket",
      target_cam: "hypermill",
    });
    expect(r.stub).toBe(true);
    for (const c of r.candidates) expect(c.cam).toBe("hypermill");
  });

  it("rejects unknown CAM slug gracefully", () => {
    const r = camFunctionRouterEngine.route({
      intent: "pocket",
      target_cam: "not-a-cam",
    });
    expect(r.fallback_used).toBe(true);
    expect(r.candidates).toHaveLength(0);
  });
});

describe("CAM Phase-5 stubs produce live telemetry", () => {
  it("validator degrades gracefully with catalog coverage in output", () => {
    const r = camParameterValidatorEngine.validate({
      target_cam: "hypermill",
      parameters: {},
    });
    expect(r.stub).toBe(true);
    expect(r.catalog_param_count).toBeGreaterThan(0);
  });

  it("recommender, optimizer, translator, reasoning, tribal, feature all bind catalog", () => {
    const target = "mastercam";
    expect(camStrategyRecommenderEngine.recommend({ target_cam: target }).stub).toBe(true);
    expect(
      camParameterOptimizerEngine.optimize({
        target_cam: target,
        objective: "balanced",
        current: {},
      }).stub
    ).toBe(true);
    expect(
      camCrossSystemTranslatorEngine.translate({
        source_cam: "hypermill",
        target_cam: target,
        source_operation: "pocket",
        source_parameters: {},
      }).stub
    ).toBe(true);
    expect(
      camAGIReasoningEngine.reason({ target_cam: target, decision_context: "x" }).stub
    ).toBe(true);
    expect(
      camTribalKnowledgeEngine.lookup({ target_cam: target, query: "thin wall" }).stub
    ).toBe(true);
    expect(camFeatureLearningEngine.recognize({ target_cam: target }).stub).toBe(true);
  });

  it("solidcam telemetry shows 0% coverage (F2)", () => {
    const r = camParameterValidatorEngine.validate({
      target_cam: "solidcam",
      parameters: {},
    });
    expect(r.catalog_coverage_pct).toBe(0);
    expect(r.catalog_param_count).toBe(0);
  });
});

describe("Filesystem sanity", () => {
  it("no empty fusion/ alias directory remains (F4)", () => {
    expect(fs.existsSync(path.join(DATA_ROOT, "cam-functions", "fusion"))).toBe(false);
  });

  it("solidcam scaffolding directories exist (F2)", () => {
    expect(fs.existsSync(path.join(DATA_ROOT, "cam-functions", "solidcam"))).toBe(true);
    expect(fs.existsSync(path.join(DATA_ROOT, "cam-ui", "solidcam"))).toBe(true);
  });
});
