/**
 * CAMCrossSystemTranslatorEngine tests — production surface (U-CAM75)
 * ===========================================================================
 * Coverage:
 *   - Happy path: full param + operation translation across 3+ CAM pairs
 *   - 3 failure modes: unknown target slug, unknown operation, no params
 *   - 2+ adversarial: empty source_parameters, all-unmapped params, wildcards
 *   - 3+ spanning CAMs: hyperMILL ↔ Mastercam, Fusion360 ↔ SolidCAM, NX ↔ PowerMill
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMCrossSystemTranslatorEngine,
  camCrossSystemTranslatorEngine,
} from "../engines/CAMCrossSystemTranslatorEngine.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const tx = new CAMCrossSystemTranslatorEngine(loader);

describe("CAMCrossSystemTranslatorEngine — construction", () => {
  it("constructs and exposes translate()", () => {
    expect(tx).toBeInstanceOf(CAMCrossSystemTranslatorEngine);
    expect(typeof tx.translate).toBe("function");
  });

  it("default singleton is a CAMCrossSystemTranslatorEngine", () => {
    expect(camCrossSystemTranslatorEngine).toBeInstanceOf(CAMCrossSystemTranslatorEngine);
  });
});

describe("CAMCrossSystemTranslatorEngine — happy path translations", () => {
  it("Mastercam dynamic_mill → hyperMILL maxx_machining (full param map)", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "dynamic_mill",
      source_parameters: {
        spindle_speed: 12000,
        feedrate: 2400,
        fz: 0.06,
        max_stepdown: 5.0,
        stepover: 4.0,
        tool_diameter: 12.7,
      },
    });
    expect(r.target_operation).toBe("maxx_machining");
    expect(r.target_parameters).toEqual({
      spindle_rpm: 12000,
      feed_rate: 2400,
      feed_per_tooth: 0.06,
      axial_depth: 5.0,
      radial_depth: 4.0,
      tool_diameter: 12.7,
    });
    expect(r.unmapped_parameters).toHaveLength(0);
    expect(r.mappings).toHaveLength(6);
    expect(r.stub).toBe(false);
    expect(r.mode).toBe("production");
  });

  it("Fusion360 adaptive_3d → SolidCAM imachining (operation alias collapse)", () => {
    const r = tx.translate({
      source_cam: "fusion360",
      target_cam: "solidcam",
      source_operation: "adaptive_3d",
      source_parameters: { spindleSpeed: 10000, cuttingFeedrate: 2000, feedPerTooth: 0.05 },
    });
    expect(r.target_operation).toBe("imachining");
    expect(r.target_parameters.spindle_speed).toBe(10000);
    expect(r.target_parameters.feed_rate).toBe(2000);
    expect(r.target_parameters.fz).toBe(0.05);
    expect(r.mappings).toHaveLength(3);
    expect(r.mappings[0].canonical).toBe("rpm");
  });

  it("NX-CAM pocket_milling → PowerMill area_clearance (variability check)", () => {
    const r = tx.translate({
      source_cam: "nx-cam",
      target_cam: "powermill",
      source_operation: "pocket_milling",
      source_parameters: { spindle_speed: 8000, cut_feed: 1200, depth_per_cut: 3.0 },
    });
    expect(r.target_operation).toBe("area_clearance");
    expect(r.target_parameters.spindle_speed).toBe(8000);
    expect(r.target_parameters.cutting_feedrate).toBe(1200);
    expect(r.target_parameters.stepdown).toBe(3.0);
    expect(r.unmapped_parameters).toHaveLength(0);
  });

  it("loss_summary always reports mapped/total ratio + percent", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "fusion360",
      source_operation: "drill",
      source_parameters: { spindle_speed: 5000, feedrate: 250, weird_unmapped: "x" },
    });
    expect(r.loss_summary).toMatch(/2\/3 params mapped/);
    expect(r.loss_summary).toMatch(/33\.3% loss/);
    expect(r.unmapped_parameters).toEqual(["weird_unmapped"]);
  });
});

describe("CAMCrossSystemTranslatorEngine — failure modes", () => {
  it("unknown target_cam slug preserves full source as unmapped", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "not-a-cam",
      source_operation: "drill",
      source_parameters: { spindle_speed: 5000, feedrate: 250 },
    });
    expect(r.target_operation).toBeNull();
    expect(r.target_parameters).toEqual({});
    expect(r.unmapped_parameters).toEqual(["spindle_speed", "feedrate"]);
    expect(r.loss_summary).toMatch(/unknown target_cam slug/);
    expect(r.mappings).toHaveLength(0);
  });

  it("unknown operation produces target_operation=null but still translates params", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "totally_made_up_op_xyz",
      source_parameters: { spindle_speed: 9000 },
    });
    expect(r.target_operation).toBeNull();
    expect(r.target_parameters.spindle_rpm).toBe(9000);
    expect(r.loss_summary).toMatch(/no canonical match/);
  });

  it("all-unmapped params: every key falls into unmapped_parameters", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "fusion360",
      source_operation: "drill",
      source_parameters: { foo: 1, bar: 2, baz: 3 },
    });
    expect(r.target_parameters).toEqual({});
    expect(r.unmapped_parameters).toEqual(["foo", "bar", "baz"]);
    expect(r.loss_summary).toMatch(/0\/3 params mapped \(100\.0% loss\)/);
  });
});

describe("CAMCrossSystemTranslatorEngine — adversarial inputs", () => {
  it("empty source_parameters yields zero mappings, zero loss percentage", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "drill",
      source_parameters: {},
    });
    expect(r.target_parameters).toEqual({});
    expect(r.unmapped_parameters).toHaveLength(0);
    expect(r.mappings).toHaveLength(0);
    expect(r.loss_summary).toMatch(/0\/0 params mapped/);
  });

  it("source param values may be NaN/Infinity/null — translator preserves verbatim (no coercion)", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "drill",
      source_parameters: { spindle_speed: NaN, feedrate: Infinity, fz: null as unknown as number },
    });
    expect(Number.isNaN(r.target_parameters.spindle_rpm as number)).toBe(true);
    expect(r.target_parameters.feed_rate).toBe(Infinity);
    expect(r.target_parameters.feed_per_tooth).toBeNull();
  });

  it("substring collisions resolve by first-match: 'feed' inside 'feed_rate' goes to feed_rate canonical", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "pocket",
      source_parameters: { feedrate: 1500, feed_per_tooth: 0.05 },
    });
    expect(r.target_parameters.feed_rate).toBe(1500);
    expect(r.target_parameters.feed_per_tooth).toBe(0.05);
    expect(r.mappings.find(m => m.source === "feedrate")?.canonical).toBe("feed_rate");
    expect(r.mappings.find(m => m.source === "feed_per_tooth")?.canonical).toBe("fz");
  });
});

describe("CAMCrossSystemTranslatorEngine — telemetry pass-through", () => {
  it("attaches catalog_coverage_pct + catalog_param_count when target valid", () => {
    const r = tx.translate({
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "pocket",
      source_parameters: { feedrate: 1000 },
    });
    expect(typeof r.catalog_coverage_pct).toBe("number");
    expect(typeof r.catalog_param_count).toBe("number");
    expect(r.catalog_coverage_pct).toBeGreaterThanOrEqual(0);
    expect(r.catalog_coverage_pct).toBeLessThanOrEqual(100);
  });
});
