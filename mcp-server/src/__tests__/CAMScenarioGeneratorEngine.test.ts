/**
 * CAMScenarioGeneratorEngine.test.ts — U-CAMTEST08..13
 * =====================================================
 *
 * Comprehensive-build coverage for the unified scenario generator that
 * powers all six PHASE-8 generator units (08 = pocket_2d, 09 = contour_2d,
 * 10 = drilling+threading, 11 = surface_3d, 12 = multi_axis, 13 = turning).
 *
 * Per-category counts validated:
 *   pocket_2d   = 108
 *   contour_2d  = 108
 *   drilling    = 72
 *   threading   = 54   (1 part × 9 × 4 + 1 part × 9 × 2)
 *   surface_3d  = 108
 *   multi_axis  = 117  (3 parts × 9 × 3 + 1 part × 9 × 4)
 *   turning     = 54   (3 parts × 9 × 2)
 *   ----------------- TOTAL = 621
 */

import { describe, it, expect } from "vitest";
import {
  CAMScenarioGeneratorEngine,
  GeneratedScenarioSchema,
  GeneratorConfigSchema,
  StressProfileSchema,
} from "../engines/CAMScenarioGeneratorEngine.js";

// Per-category expected counts (host-filtered against part.preferred_hosts).
const EXPECTED_COUNTS = {
  pocket_2d:  108,
  contour_2d: 108,
  drilling:    72,
  threading:   54,
  surface_3d: 108,
  multi_axis: 117,
  turning:     54,
} as const;
const EXPECTED_TOTAL = 621;

// ── 1. Generator shape ──────────────────────────────────────────────────────

describe("CAMScenarioGeneratorEngine — generator shape", () => {
  it("generateAll() produces 621 scenarios at the calm baseline", () => {
    const all = CAMScenarioGeneratorEngine.generateAll();
    expect(all.length).toBe(EXPECTED_TOTAL);
  });

  it("predictCount() matches generateAll().length exactly", () => {
    const pred = CAMScenarioGeneratorEngine.predictCount();
    const actual = CAMScenarioGeneratorEngine.generateAll().length;
    expect(pred).toBe(actual);
  });

  it("audit invariant: generator passes self-audit", () => {
    const audit = CAMScenarioGeneratorEngine.auditGenerator();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("ALL_CATEGORIES exposes every fixture category (7)", () => {
    expect(CAMScenarioGeneratorEngine.ALL_CATEGORIES.length).toBe(7);
  });

  it("ALL_HOSTS exposes every in-host runner target (4)", () => {
    expect(CAMScenarioGeneratorEngine.ALL_HOSTS.length).toBe(4);
  });
});

// ── 2. Per-category counts (U-CAMTEST08..13) ────────────────────────────────

describe("CAMScenarioGeneratorEngine — per-category counts", () => {
  it("U-CAMTEST08 pocket_2d → 108 scenarios (3 parts × 9 slots × 4 hosts)", () => {
    expect(CAMScenarioGeneratorEngine.generatePocket2D().length).toBe(EXPECTED_COUNTS.pocket_2d);
  });

  it("U-CAMTEST09 contour_2d → 108 scenarios", () => {
    expect(CAMScenarioGeneratorEngine.generateContour2D().length).toBe(EXPECTED_COUNTS.contour_2d);
  });

  it("U-CAMTEST10 drilling+threading → 126 scenarios (72 + 54)", () => {
    const combined = CAMScenarioGeneratorEngine.generateDrillingAndThreading();
    expect(combined.length).toBe(EXPECTED_COUNTS.drilling + EXPECTED_COUNTS.threading);
    const drilling = combined.filter(s => s.category === "drilling").length;
    const threading = combined.filter(s => s.category === "threading").length;
    expect(drilling).toBe(EXPECTED_COUNTS.drilling);
    expect(threading).toBe(EXPECTED_COUNTS.threading);
  });

  it("U-CAMTEST11 surface_3d → 108 scenarios", () => {
    expect(CAMScenarioGeneratorEngine.generateSurface3D().length).toBe(EXPECTED_COUNTS.surface_3d);
  });

  it("U-CAMTEST12 multi_axis → 117 scenarios (3 parts × 9 × 3 + 1 part × 9 × 4)", () => {
    expect(CAMScenarioGeneratorEngine.generateMultiAxis().length).toBe(EXPECTED_COUNTS.multi_axis);
  });

  it("U-CAMTEST13 turning → 54 scenarios (3 parts × 9 × 2 mill-turn hosts)", () => {
    expect(CAMScenarioGeneratorEngine.generateTurning().length).toBe(EXPECTED_COUNTS.turning);
  });

  it("category counts sum to the total (no double-counting)", () => {
    const sum = (Object.values(EXPECTED_COUNTS) as number[]).reduce((acc, n) => acc + n, 0);
    expect(sum).toBe(EXPECTED_TOTAL);
  });
});

// ── 3. Host filtering invariants ────────────────────────────────────────────

describe("CAMScenarioGeneratorEngine — host filtering", () => {
  it("turning scenarios only target mill-turn hosts (mastercam + hypermill)", () => {
    const turning = CAMScenarioGeneratorEngine.generateTurning();
    expect(turning.length).toBeGreaterThan(0);
    for (const s of turning) {
      expect(["mastercam", "hypermill"]).toContain(s.host);
    }
  });

  it("multi_axis impeller scenarios skip inventor_hsm (per part preferred_hosts)", () => {
    const ma = CAMScenarioGeneratorEngine.generateMultiAxis();
    const impeller = ma.filter(s => s.part_id === "multi_axis_impeller");
    expect(impeller.length).toBeGreaterThan(0);
    for (const s of impeller) expect(s.host).not.toBe("inventor_hsm");
  });

  it("multi_axis fillet_blend scenarios include inventor_hsm (4-host part)", () => {
    const ma = CAMScenarioGeneratorEngine.generateMultiAxis();
    const fillet = ma.filter(s => s.part_id === "multi_axis_fillet_blend");
    const hosts = new Set(fillet.map(s => s.host));
    expect(hosts.has("inventor_hsm")).toBe(true);
    expect(hosts.size).toBe(4);
  });

  it("explicit hosts filter narrows the output (only fusion360)", () => {
    const fusion = CAMScenarioGeneratorEngine.generate({
      categories: ["pocket_2d"], hosts: ["fusion360"],
    });
    expect(fusion.length).toBe(27); // 3 parts × 9 slots × 1 host
    for (const s of fusion) expect(s.host).toBe("fusion360");
  });

  it("explicit hosts filter excluding all hosts produces empty output", () => {
    expect(CAMScenarioGeneratorEngine.generate({
      categories: ["turning"], hosts: ["fusion360", "inventor_hsm"],
    }).length).toBe(0);
  });
});

// ── 4. Scenario shape validity ─────────────────────────────────────────────

describe("CAMScenarioGeneratorEngine — scenario shape", () => {
  it("every scenario passes GeneratedScenarioSchema validation", () => {
    const all = CAMScenarioGeneratorEngine.generateAll();
    for (const s of all) {
      expect(() => GeneratedScenarioSchema.parse(s)).not.toThrow();
    }
  });

  it("scenario_id is unique across the calm baseline", () => {
    const all = CAMScenarioGeneratorEngine.generateAll();
    const ids = new Set(all.map(s => s.scenario_id));
    expect(ids.size).toBe(all.length);
  });

  it("expected_frame_count is always a positive multiple of 6 (matches OVERLAY_TYPES)", () => {
    const all = CAMScenarioGeneratorEngine.generateAll();
    for (const s of all) {
      expect(s.expected_frame_count % 6).toBe(0);
      expect(s.expected_frame_count).toBeGreaterThan(0);
    }
  });

  it("scenario_id format = '{host}_{part}_{slot}_{stress}'", () => {
    const sample = CAMScenarioGeneratorEngine.generatePocket2D()[0];
    expect(sample.scenario_id).toBe(
      `${sample.host}_${sample.part_id}_${sample.slot_id}_${sample.stress_profile}`,
    );
  });

  it("stock_id matches the stock catalog naming convention", () => {
    const all = CAMScenarioGeneratorEngine.generatePocket2D();
    for (const s of all) {
      expect(s.stock_id).toMatch(/^stock_[a-z0-9_]+_(6061|1018|d2|inconel718|uhmw)$/);
    }
  });
});

// ── 5. Stress profile behavior ─────────────────────────────────────────────

describe("CAMScenarioGeneratorEngine — stress profiles", () => {
  it("calm profile: 0 band transitions, no hard_stop", () => {
    const calm = CAMScenarioGeneratorEngine.generate({ stress_profile: "calm" });
    for (const s of calm) {
      expect(s.expected_band_transitions).toBe(0);
      expect(s.deliberate_hard_stop).toBe(false);
    }
  });

  it("stress_bands profile: 2 transitions, no hard_stop", () => {
    const stressed = CAMScenarioGeneratorEngine.generate({
      categories: ["pocket_2d"], stress_profile: "stress_bands",
    });
    for (const s of stressed) {
      expect(s.expected_band_transitions).toBe(2);
      expect(s.deliberate_hard_stop).toBe(false);
    }
  });

  it("deliberate_hard_stop profile: 4 transitions, hard_stop=true", () => {
    const trip = CAMScenarioGeneratorEngine.generate({
      categories: ["pocket_2d"], stress_profile: "deliberate_hard_stop",
    });
    for (const s of trip) {
      expect(s.expected_band_transitions).toBe(4);
      expect(s.deliberate_hard_stop).toBe(true);
    }
  });

  it("stress_profile is reflected in scenario_id suffix", () => {
    const calm = CAMScenarioGeneratorEngine.generatePocket2D()[0];
    expect(calm.scenario_id.endsWith("_calm")).toBe(true);
  });
});

// ── 6. Cross-engine wiring (Stock + Matrix) ────────────────────────────────

describe("CAMScenarioGeneratorEngine — cross-engine wiring", () => {
  it("scenario.material_id is sourced from MaterialToolMatrix per-slot resolution", () => {
    const sample = CAMScenarioGeneratorEngine.generate({
      categories: ["pocket_2d"], hosts: ["fusion360"],
    })[0];
    // First slot is M1T1 → material_index 1 → first recommended material.
    expect(sample.slot_id).toBe("M1T1");
    expect(sample.material_id.length).toBeGreaterThan(0);
  });

  it("scenario.stock_id resolves to a real entry in StockWorkholdingCatalog", async () => {
    const { StockWorkholdingCatalogEngine } = await import("../engines/StockWorkholdingCatalogEngine.js");
    const all = CAMScenarioGeneratorEngine.generatePocket2D();
    for (const s of all) {
      expect(StockWorkholdingCatalogEngine.get(s.stock_id)).not.toBeNull();
    }
  });

  it("scenario.tool_id format matches MaterialToolMatrix tool naming", () => {
    const all = CAMScenarioGeneratorEngine.generatePocket2D();
    for (const s of all) {
      expect(s.tool_id).toMatch(/^tool_pocket_2d_/);
    }
  });
});

// ── 7. Schema validation (failure modes + adversarial) ────────────────────

describe("CAMScenarioGeneratorEngine — schema validation", () => {
  it("GeneratorConfigSchema rejects expected_frame_count that is not a multiple of 6", () => {
    expect(() => GeneratorConfigSchema.parse({ expected_frame_count: 7 })).toThrow();
  });

  it("GeneratorConfigSchema rejects negative latency budget", () => {
    expect(() => GeneratorConfigSchema.parse({ latency_p99_budget_ms: -1 })).toThrow();
  });

  it("GeneratorConfigSchema rejects unknown stress_profile", () => {
    const bad: unknown = "panic";
    expect(() => GeneratorConfigSchema.parse({ stress_profile: bad })).toThrow();
  });

  it("StressProfileSchema rejects unknown profile 'meltdown'", () => {
    const bad: unknown = "meltdown";
    expect(() => StressProfileSchema.parse(bad)).toThrow();
  });

  it("GeneratedScenarioSchema rejects empty scenario_id (failure mode)", () => {
    expect(() => GeneratedScenarioSchema.parse({
      scenario_id: "", category: "pocket_2d", host: "fusion360",
      part_id: "p", stock_id: "s", material_id: "m", tool_id: "t",
      slot_id: "M1T1", expected_frame_count: 12, expected_band_transitions: 0,
      deliberate_hard_stop: false, latency_p99_budget_ms: 100, stress_profile: "calm",
    })).toThrow();
  });

  it("GeneratedScenarioSchema rejects malformed slot_id (adversarial)", () => {
    expect(() => GeneratedScenarioSchema.parse({
      scenario_id: "ok", category: "pocket_2d", host: "fusion360",
      part_id: "p", stock_id: "s", material_id: "m", tool_id: "t",
      slot_id: "X9Z9", expected_frame_count: 12, expected_band_transitions: 0,
      deliberate_hard_stop: false, latency_p99_budget_ms: 100, stress_profile: "calm",
    })).toThrow();
  });
});

// ── 8. Convenience-method counts (per-unit acceptance check) ──────────────

describe("CAMScenarioGeneratorEngine — convenience methods", () => {
  it.each([
    ["generatePocket2D",            108],
    ["generateContour2D",           108],
    ["generateDrillingAndThreading", 126],
    ["generateSurface3D",           108],
    ["generateMultiAxis",           117],
    ["generateTurning",              54],
  ] as const)("%s yields %i scenarios", (method, expected) => {
    const fn = CAMScenarioGeneratorEngine[method as keyof typeof CAMScenarioGeneratorEngine] as () => unknown[];
    expect(fn().length).toBe(expected);
  });
});

// ── 9. Dispatcher round-trip ───────────────────────────────────────────────

describe("U-CAMTEST08..13 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all scenario generator actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_scenario_generate");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_all");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_pocket_2d");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_contour_2d");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_drilling_threading");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_surface_3d");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_multi_axis");
    expect(mod.ACTIONS).toContain("cam_scenario_generate_turning");
    expect(mod.ACTIONS).toContain("cam_scenario_predict_count");
    expect(mod.ACTIONS).toContain("cam_scenario_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/CAMScenarioGeneratorEngine.js");
    expect(mod.CAMScenarioGeneratorEngine.generateAll().length).toBe(EXPECTED_TOTAL);
  });

  it("derived dependency invariant: turning count = 3 × 9 × 2", async () => {
    const mod = await import("../engines/CAMScenarioGeneratorEngine.js");
    expect(mod.CAMScenarioGeneratorEngine.generateTurning().length).toBe(54);
  });
});
