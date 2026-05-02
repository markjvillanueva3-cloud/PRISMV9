/**
 * Fusion360StrategyEngine.test.ts
 *
 * Coverage:
 *   - happy path: each operation maps to a real catalog cycle code
 *   - prefer_adaptive flips MILL2D:Pocket → MILL2D:Adaptive (and 3D equivalent)
 *   - feature-driven dispatch: bowl/boss/saddle finishing → MILL3D:Scallop
 *   - parameter math: Vc → RPM via Vc=π·D·n/1000, RPM × flutes × fz = feed
 *   - ISO-group-aware Vc baselines (Sandvik C-2920:3 starting points)
 *   - Mfg Ext gating: probing/sheet_metal/swarf throw when license=false
 *   - failure modes: bad operation, bad iso group, missing catalog code
 *   - audit invariant: every (operation × iso) combination resolves
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360StrategyEngine,
  StrategyRequestSchema,
  ISOGroupSchema,
  OperationTypeSchema,
  ParameterEstimateSchema,
  StrategyResultSchema,
  type ISOGroup,
  type OperationType,
} from "../engines/Fusion360StrategyEngine.js";

const ISOS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

// ── 1. Happy path ──────────────────────────────────────────────────────────

describe("Fusion360StrategyEngine — happy path", () => {
  it("returns a parsed StrategyResult for steel pocket roughing", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P",
      tool_diameter_mm: 12, flutes: 4, feature: "pocket_2d",
    });
    expect(() => StrategyResultSchema.parse(r)).not.toThrow();
    expect(r.cycle_code).toBe("MILL2D:Pocket");
    expect(r.category).toBe("2d_milling");
    expect(r.parameters.rpm).toBeGreaterThan(0);
    expect(r.parameters.feed_mmpm).toBeGreaterThan(0);
    expect(r.is_adaptive).toBe(false);
    expect(r.requires_mfg_ext).toBe(false);
  });

  it("provenance string cites the Sandvik baseline + Fusion360CycleCatalog", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P",
    });
    expect(r.provenance).toContain("Sandvik");
    expect(r.provenance).toContain("Fusion360CycleCatalogEngine");
  });
});

// ── 2. prefer_adaptive flag ────────────────────────────────────────────────

describe("Fusion360StrategyEngine — prefer_adaptive", () => {
  it("prefer_adaptive=true on 2D pocket roughing → MILL2D:Adaptive", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P", feature: "pocket_2d", prefer_adaptive: true,
    });
    expect(r.cycle_code).toBe("MILL2D:Adaptive");
    expect(r.is_adaptive).toBe(true);
  });

  it("prefer_adaptive=true on 3D pocket roughing → MILL3D:AdaptiveClearing", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P", feature: "pocket_3d", prefer_adaptive: true,
    });
    expect(r.cycle_code).toBe("MILL3D:AdaptiveClearing");
    expect(r.is_adaptive).toBe(true);
  });

  it("prefer_adaptive=false on 2D pocket falls back to MILL2D:Pocket", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P", feature: "pocket_2d", prefer_adaptive: false,
    });
    expect(r.cycle_code).toBe("MILL2D:Pocket");
    expect(r.is_adaptive).toBe(false);
  });
});

// ── 3. Feature-driven dispatch ─────────────────────────────────────────────

describe("Fusion360StrategyEngine — feature-driven dispatch", () => {
  it("finishing on a bowl feature → MILL3D:Scallop", () => {
    expect(Fusion360StrategyEngine.recommend({
      operation: "finishing", iso_group: "N", feature: "bowl",
    }).cycle_code).toBe("MILL3D:Scallop");
  });

  it("finishing on a boss feature → MILL3D:Scallop", () => {
    expect(Fusion360StrategyEngine.recommend({
      operation: "finishing", iso_group: "N", feature: "boss",
    }).cycle_code).toBe("MILL3D:Scallop");
  });

  it("finishing on a saddle feature → MILL3D:Scallop", () => {
    expect(Fusion360StrategyEngine.recommend({
      operation: "finishing", iso_group: "N", feature: "saddle",
    }).cycle_code).toBe("MILL3D:Scallop");
  });

  it("contouring with contour_3d feature → MILL3D:Contour", () => {
    expect(Fusion360StrategyEngine.recommend({
      operation: "contouring", iso_group: "P", feature: "contour_3d",
    }).cycle_code).toBe("MILL3D:Contour");
  });

  it("contouring with contour_2d feature → MILL2D:Contour", () => {
    expect(Fusion360StrategyEngine.recommend({
      operation: "contouring", iso_group: "P", feature: "contour_2d",
    }).cycle_code).toBe("MILL2D:Contour");
  });
});

// ── 4. Parameter math ──────────────────────────────────────────────────────

describe("Fusion360StrategyEngine — parameter math", () => {
  it("RPM = Vc × 1000 / (π × D); 4-flute aluminum 12mm finishing", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "finishing", iso_group: "N", tool_diameter_mm: 12, flutes: 4,
    });
    // Vc(N, finishing) = 600 m/min; RPM = 600·1000 / (π·12) ≈ 15915
    expect(r.parameters.vc_mmin).toBe(600);
    expect(r.parameters.rpm).toBeGreaterThan(15000);
    expect(r.parameters.rpm).toBeLessThan(17000);
  });

  it("RPM scales inversely with tool diameter (smaller tool → higher RPM)", () => {
    const small = Fusion360StrategyEngine.recommend({
      operation: "finishing", iso_group: "N", tool_diameter_mm: 6, flutes: 4,
    });
    const big = Fusion360StrategyEngine.recommend({
      operation: "finishing", iso_group: "N", tool_diameter_mm: 25, flutes: 4,
    });
    expect(small.parameters.rpm).toBeGreaterThan(big.parameters.rpm);
  });

  it("feed = RPM × flutes × fz", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P", tool_diameter_mm: 12, flutes: 4,
    });
    const expected = r.parameters.rpm * 4 * r.parameters.fz_mm;
    // Allow for rounding to integer feed (engine rounds Math.round(feed_mmpm))
    expect(r.parameters.feed_mmpm).toBeCloseTo(Math.round(expected), 0);
  });

  it("ParameterEstimate parses cleanly through schema", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P", tool_diameter_mm: 12,
    });
    expect(() => ParameterEstimateSchema.parse(r.parameters)).not.toThrow();
  });
});

// ── 5. ISO-group baseline Vc ───────────────────────────────────────────────

describe("Fusion360StrategyEngine — ISO baseline Vc", () => {
  it("aluminum (N) has the highest Vc (600 m/min)", () => {
    const table = Fusion360StrategyEngine.baselineVcTable();
    expect(table.N).toBe(600);
    const max = Math.max(...Object.values(table));
    expect(max).toBe(600);
    expect(table.N).toBe(max);
  });

  it("superalloys (S) have the lowest Vc (Inconel/Ti regime)", () => {
    const table = Fusion360StrategyEngine.baselineVcTable();
    expect(table.S).toBe(80);
    const min = Math.min(...Object.values(table));
    expect(min).toBe(80);
  });

  it("roughing derates Vc by 20%; drilling by 30%", () => {
    const finish_P = Fusion360StrategyEngine.baselineVc("finishing", "P");
    const rough_P = Fusion360StrategyEngine.baselineVc("roughing", "P");
    const drill_P = Fusion360StrategyEngine.baselineVc("drilling", "P");
    expect(rough_P).toBeCloseTo(finish_P * 0.80, 5);
    expect(drill_P).toBeCloseTo(finish_P * 0.70, 5);
  });
});

// ── 6. Mfg Ext gating ─────────────────────────────────────────────────────

describe("Fusion360StrategyEngine — Mfg Ext gating", () => {
  it("probing_wcs throws when has_mfg_ext_license=false", () => {
    expect(() => Fusion360StrategyEngine.recommend({
      operation: "probing_wcs", iso_group: "P", has_mfg_ext_license: false,
    })).toThrow(/Manufacturing Extension license/);
  });

  it("probing_wcs succeeds when has_mfg_ext_license=true", () => {
    const r = Fusion360StrategyEngine.recommend({
      operation: "probing_wcs", iso_group: "P", has_mfg_ext_license: true,
    });
    expect(r.cycle_code).toBe("PROBE:WCS");
    expect(r.requires_mfg_ext).toBe(true);
  });

  it("swarf_5axis (Mfg Ext) throws when license=false", () => {
    expect(() => Fusion360StrategyEngine.recommend({
      operation: "swarf_5axis", iso_group: "S", has_mfg_ext_license: false,
    })).toThrow(/Manufacturing Extension license/);
  });

  it("Mfg Ext gating omitted (undefined) does NOT throw on probing", () => {
    // No explicit license field → engine permits the cycle (caller can audit later).
    const r = Fusion360StrategyEngine.recommend({
      operation: "probing_wcs", iso_group: "P",
    });
    expect(r.cycle_code).toBe("PROBE:WCS");
  });
});

// ── 7. Schema validation ──────────────────────────────────────────────────

describe("Fusion360StrategyEngine — schema validation", () => {
  it("StrategyRequestSchema rejects unknown operation (failure mode)", () => {
    const bad: unknown = { operation: "ion_milling", iso_group: "P" };
    expect(() => StrategyRequestSchema.parse(bad)).toThrow();
  });

  it("ISOGroupSchema rejects unknown iso group", () => {
    const bad: unknown = "X";
    expect(() => ISOGroupSchema.parse(bad)).toThrow();
  });

  it("OperationTypeSchema rejects unknown operation", () => {
    const bad: unknown = "ion_milling";
    expect(() => OperationTypeSchema.parse(bad)).toThrow();
  });

  it("StrategyRequestSchema rejects negative tool_diameter_mm (adversarial)", () => {
    expect(() => StrategyRequestSchema.parse({
      operation: "roughing", iso_group: "P", tool_diameter_mm: -5,
    })).toThrow();
  });
});

// ── 8. Audit invariant ────────────────────────────────────────────────────

describe("Fusion360StrategyEngine — audit", () => {
  it("auditEngine succeeds — every (operation, iso) combo resolves to a real catalog cycle", () => {
    const audit = Fusion360StrategyEngine.auditEngine();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("every operation across every ISO group returns a parseable result", () => {
    for (const op of OperationTypeSchema.options) {
      for (const iso of ISOS) {
        const result = Fusion360StrategyEngine.recommend({
          operation: op, iso_group: iso, tool_diameter_mm: 12, flutes: 4,
          has_mfg_ext_license: true,
        });
        expect(() => StrategyResultSchema.parse(result)).not.toThrow();
        expect(result.cycle_code.length).toBeGreaterThan(0);
        expect(result.parameters.rpm).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ── 9. pickCycle convenience ──────────────────────────────────────────────

describe("Fusion360StrategyEngine — pickCycle", () => {
  it("pickCycle returns the catalog cycle without computing parameters", () => {
    const c = Fusion360StrategyEngine.pickCycle({
      operation: "thread_milling", iso_group: "P",
    });
    expect(c.code).toBe("THREAD:Mill");
    expect(c.category).toBe("threading");
  });

  it("pickCycle for turning_thread returns TURN:Thread", () => {
    const c = Fusion360StrategyEngine.pickCycle({
      operation: "turning_thread", iso_group: "P",
    });
    expect(c.code).toBe("TURN:Thread");
    expect(c.isMillTurn).toBe(true);
  });
});

// ── 10. Dispatcher round-trip ────────────────────────────────────────────

describe("Fusion360StrategyEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the strategy actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_strategy_recommend");
    expect(mod.ACTIONS).toContain("cam_fusion360_strategy_pick_cycle");
    expect(mod.ACTIONS).toContain("cam_fusion360_strategy_baseline_vc");
    expect(mod.ACTIONS).toContain("cam_fusion360_strategy_audit");
  });

  it("engine reachable via the dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/Fusion360StrategyEngine.js");
    const r = mod.Fusion360StrategyEngine.recommend({
      operation: "roughing", iso_group: "P",
    });
    expect(r.cycle_code.length).toBeGreaterThan(0);
  });
});
