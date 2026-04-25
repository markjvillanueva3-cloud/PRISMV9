/**
 * CAMParameterOptimizerEngine tests — production surface (U-CAM74)
 * ===========================================================================
 * Coverage floor (per CAM-EXHAUST-MS0 enforcement):
 *   - Happy path: each of 4 objectives, real param adjustments observable
 *   - 3 failure modes: unknown CAM slug, no-match params, empty current
 *   - 2+ adversarial: NaN, Infinity, oversize values
 *   - 3 spanning CAM systems: hyperMILL, Mastercam, SolidCAM (+ NX, PowerMill)
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMParameterOptimizerEngine,
  camParameterOptimizerEngine,
  type OptimizedParameter,
} from "../engines/CAMParameterOptimizerEngine.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const optimizer = new CAMParameterOptimizerEngine(loader);

const findChange = (changes: OptimizedParameter[], paramName: string): OptimizedParameter => {
  const c = changes.find((x) => x.param === paramName);
  if (!c) throw new Error(`expected change for param '${paramName}', got: ${changes.map((c) => c.param).join(",")}`);
  return c;
};

describe("CAMParameterOptimizerEngine — construction", () => {
  it("constructs with explicit loader and exposes optimize() method", () => {
    expect(optimizer).toBeInstanceOf(CAMParameterOptimizerEngine);
    expect(typeof optimizer.optimize).toBe("function");
  });

  it("default singleton is a CAMParameterOptimizerEngine", () => {
    expect(camParameterOptimizerEngine).toBeInstanceOf(CAMParameterOptimizerEngine);
  });
});

describe("CAMParameterOptimizerEngine — happy path (4 objectives)", () => {
  const baseline = { rpm: 8000, feed_rate: 1500, fz: 0.05, ap: 4.0, ae: 6.0 };

  it("cycle_time on hyperMILL: feed/rpm/ae increase, mean improvement positive", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: baseline });
    expect(r.stub).toBe(false);
    expect(r.mode).toBe("production");
    expect(r.target_cam).toBe("hypermill");
    expect(r.objective).toBe("cycle_time");
    expect(r.optimized.feed_rate).toBeGreaterThan(baseline.feed_rate);
    expect(r.optimized.rpm).toBeGreaterThan(baseline.rpm);
    expect(r.optimized.ae).toBeGreaterThan(baseline.ae);
    expect(r.changes.length).toBe(4); // feed_rate, rpm, ae, ap
    expect(r.expected_improvement_pct).toBeGreaterThan(5);
    expect(r.expected_improvement_pct).toBeLessThan(30);
  });

  it("surface_finish on Mastercam: chip_load/stepover/depth all decrease (delta < 0)", () => {
    const r = optimizer.optimize({ target_cam: "mastercam", objective: "surface_finish", current: baseline });
    expect(r.optimized.fz).toBeLessThan(baseline.fz);
    expect(r.optimized.ae).toBeLessThan(baseline.ae);
    expect(r.optimized.ap).toBeLessThan(baseline.ap);
    for (const c of r.changes) {
      expect(c.delta_pct).toBeLessThan(0);
    }
    expect(r.changes.length).toBe(3);
  });

  it("tool_life on SolidCAM: rpm decreases, fz increases, depth decreases", () => {
    const r = optimizer.optimize({ target_cam: "solidcam", objective: "tool_life", current: baseline });
    expect(findChange(r.changes, "rpm").delta_pct).toBeLessThan(0);
    expect(findChange(r.changes, "fz").delta_pct).toBeGreaterThan(0);
    expect(findChange(r.changes, "ap").delta_pct).toBeLessThan(0);
    expect(r.changes.length).toBe(3);
  });

  it("balanced on Fusion360: small lift on feed and trim on stepover", () => {
    const r = optimizer.optimize({ target_cam: "fusion360", objective: "balanced", current: baseline });
    expect(r.optimized.feed_rate).toBeGreaterThan(baseline.feed_rate);
    expect(r.optimized.ae).toBeLessThan(baseline.ae);
    expect(r.expected_improvement_pct).toBeGreaterThan(0);
    expect(r.expected_improvement_pct).toBeLessThan(8);
  });
});

describe("CAMParameterOptimizerEngine — variability across CAM systems", () => {
  const baseline = { feed_rate: 1500 };

  it("hyperMILL applies a larger feed bump than Fusion360 (capability scale 1.15 vs 0.95)", () => {
    const hm = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: baseline });
    const fu = optimizer.optimize({ target_cam: "fusion360", objective: "cycle_time", current: baseline });
    expect(hm.optimized.feed_rate).toBeGreaterThan(fu.optimized.feed_rate);
    // exact: 1500 * (1 + 0.15*1.15) = 1758.75 ; 1500 * (1 + 0.15*0.95) = 1713.75
    expect(hm.optimized.feed_rate).toBeCloseTo(1758.75, 2);
    expect(fu.optimized.feed_rate).toBeCloseTo(1713.75, 2);
  });

  it("solidcam, nx-cam, powermill all increase feed_rate for cycle_time", () => {
    const sc = optimizer.optimize({ target_cam: "solidcam", objective: "cycle_time", current: baseline });
    const nx = optimizer.optimize({ target_cam: "nx-cam", objective: "cycle_time", current: baseline });
    const pm = optimizer.optimize({ target_cam: "powermill", objective: "cycle_time", current: baseline });
    expect(sc.optimized.feed_rate).toBeCloseTo(1500 * (1 + 0.15 * 1.10), 2);
    expect(nx.optimized.feed_rate).toBeCloseTo(1500 * (1 + 0.15 * 1.05), 2);
    expect(pm.optimized.feed_rate).toBeCloseTo(1500 * (1 + 0.15 * 1.10), 2);
  });
});

describe("CAMParameterOptimizerEngine — failure modes", () => {
  it("unknown CAM slug returns rationale 'unknown_cam_slug' and zero changes", () => {
    const r = optimizer.optimize({ target_cam: "not-a-cam", objective: "cycle_time", current: { rpm: 1000 } });
    expect(r.changes).toHaveLength(0);
    expect(r.expected_improvement_pct).toBe(0);
    expect(r.rationale).toBe("unknown_cam_slug");
    expect(r.optimized).toEqual({ rpm: 1000 });
    expect(r.target_cam).toBe("not-a-cam");
  });

  it("no-matching-params yields zero changes and explanatory rationale", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: { unknown_xyz: 42 } });
    expect(r.changes).toHaveLength(0);
    expect(r.expected_improvement_pct).toBe(0);
    expect(r.rationale).toMatch(/No parameters in 'current' matched/);
    expect(r.optimized).toEqual({ unknown_xyz: 42 });
  });

  it("empty current map returns zero changes with no error", () => {
    const r = optimizer.optimize({ target_cam: "mastercam", objective: "balanced", current: {} });
    expect(r.changes).toHaveLength(0);
    expect(r.optimized).toEqual({});
    expect(r.expected_improvement_pct).toBe(0);
  });
});

describe("CAMParameterOptimizerEngine — adversarial inputs", () => {
  it("NaN feed_rate is recorded as non-finite rejection, original value preserved", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: { feed_rate: NaN } });
    const ch = findChange(r.changes, "feed_rate");
    expect(ch.reason).toMatch(/non-finite/);
    expect(ch.delta_pct).toBe(0);
    expect(Number.isNaN(r.optimized.feed_rate)).toBe(true);
  });

  it("Infinity rpm is rejected with non-finite reason — no silent clamp", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "tool_life", current: { rpm: Infinity } });
    const ch = findChange(r.changes, "rpm");
    expect(ch.reason).toMatch(/non-finite/);
    expect(r.optimized.rpm).toBe(Infinity);
  });

  it("oversize feed_rate (49000 mm/min) clamps to 50000 max, marks clamped:true", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: { feed_rate: 49000 } });
    const ch = findChange(r.changes, "feed_rate");
    expect(ch.clamped).toBe(true);
    expect(r.optimized.feed_rate).toBe(50_000);
  });

  it("max_step_pct=0.05 caps the cycle_time feed bias below its natural 0.1725", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: { feed_rate: 1000 }, max_step_pct: 0.05 });
    const ch = findChange(r.changes, "feed_rate");
    expect(ch.delta_pct).toBeCloseTo(5.0, 5);
    expect(r.optimized.feed_rate).toBeCloseTo(1050, 5);
  });
});

describe("CAMParameterOptimizerEngine — telemetry pass-through", () => {
  it("attaches catalog_coverage_pct and non-negative catalog_param_count", () => {
    const r = optimizer.optimize({ target_cam: "hypermill", objective: "cycle_time", current: { rpm: 8000 } });
    expect(typeof r.catalog_coverage_pct).toBe("number");
    expect(typeof r.catalog_param_count).toBe("number");
    expect(r.catalog_param_count).toBeGreaterThanOrEqual(0);
    expect(r.catalog_coverage_pct).toBeGreaterThanOrEqual(0);
    expect(r.catalog_coverage_pct).toBeLessThanOrEqual(100);
  });
});
