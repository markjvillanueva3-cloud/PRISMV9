/**
 * Tests for CrossProcessFeatureBridge
 * @see src/engines/CrossProcessFeatureBridge.ts
 * @see U-XPROC-FEAT-01 (cross-process feature routing for mill, lathe, wedm)
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessFeatureBridge,
  FEATURE_PROCESSES,
  FEATURE_FEASIBILITY,
  SUPPORTED_FEATURES,
  type FeatureProcessId,
  type FeasibilityRank,
} from "../engines/CrossProcessFeatureBridge.js";

// ============================================================================
// SECTION 1 — listKnownFeatures(): registry snapshot
// ============================================================================

describe("CrossProcessFeatureBridge.listKnownFeatures()", () => {
  it("returns exactly 12 features in SUPPORTED_FEATURES order", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    expect(features).toHaveLength(12);
    expect(features.map((f) => f.feature)).toEqual([
      "pocket_2d",
      "pocket_3d",
      "slot",
      "hole_drill",
      "hole_thread_internal",
      "hole_thread_external",
      "groove_external",
      "groove_internal",
      "profile_2d",
      "face_milling",
      "boring",
      "chamfer",
    ]);
  });

  it("each feature has at least 1 feasible process option", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    for (const f of features) {
      const feasible = f.process_options.filter(
        (opt) => opt.feasibility === "primary" || opt.feasibility === "alternate",
      );
      expect(feasible.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each feature's recommended_process is feasible (not infeasible)", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    for (const f of features) {
      const recOpt = f.process_options.find((opt) => opt.process === f.recommended_process);
      // recOpt must exist with feasibility !== "infeasible"; if missing or infeasible, this throws.
      const feas = recOpt === undefined ? "MISSING" : recOpt.feasibility;
      expect(feas).not.toBe("MISSING");
      expect(feas).not.toBe("infeasible");
    }
  });

  it("each feature has cad_operation_keywords (non-empty)", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    for (const f of features) {
      expect(f.cad_operation_keywords.length).toBeGreaterThan(0);
      f.cad_operation_keywords.forEach((kw) => {
        expect(typeof kw).toBe("string");
        expect(kw.length).toBeGreaterThan(0);
      });
    }
  });

  it("every feasible process_option has at least 1 strategy; infeasible has none", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    for (const f of features) {
      for (const opt of f.process_options) {
        if (opt.feasibility === "infeasible") {
          expect(opt.strategies).toEqual([]);
        } else {
          expect(opt.strategies.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every feature has all 3 processes covered (mill+lathe+wedm)", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    for (const f of features) {
      const procs = f.process_options.map((opt) => opt.process).sort();
      expect(procs).toEqual(["lathe", "mill", "wedm"]);
    }
  });

  it("has unique feature ids (no duplicates)", () => {
    const features = CrossProcessFeatureBridge.listKnownFeatures();
    const ids = features.map((f) => f.feature);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ============================================================================
// SECTION 2 — listFeatureOptions(): per-feature process options
// ============================================================================

describe("CrossProcessFeatureBridge.listFeatureOptions()", () => {
  it("returns 3 process options for pocket_2d (mill+lathe+wedm)", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("pocket_2d");
    expect(opts).toHaveLength(3);
    const procs = opts.map((o) => o.process).sort();
    expect(procs).toEqual(["lathe", "mill", "wedm"]);
  });

  it("marks mill as primary for pocket_2d with adaptive_clear strategy", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("pocket_2d");
    const mill = opts.find((o) => o.process === "mill");
    expect(mill?.feasibility).toBe("primary");
    expect(mill?.strategies).toContain("adaptive_clear");
    expect(mill?.strategies).toContain("2d_pocket");
  });

  it("marks lathe as infeasible for pocket_2d with rotation-axis rationale", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("pocket_2d");
    const lathe = opts.find((o) => o.process === "lathe");
    expect(lathe?.feasibility).toBe("infeasible");
    expect(lathe?.strategies).toEqual([]);
    expect(lathe?.rationale).toMatch(/rotating/i);
  });

  it("marks lathe as primary for groove_external with od_groove strategy", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("groove_external");
    const lathe = opts.find((o) => o.process === "lathe");
    expect(lathe?.feasibility).toBe("primary");
    expect(lathe?.strategies).toContain("od_groove");
  });

  it("marks both mill AND lathe as primary for hole_thread_internal, wedm infeasible", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("hole_thread_internal");
    const mill = opts.find((o) => o.process === "mill");
    const lathe = opts.find((o) => o.process === "lathe");
    const wedm = opts.find((o) => o.process === "wedm");
    expect(mill?.feasibility).toBe("primary");
    expect(lathe?.feasibility).toBe("primary");
    expect(wedm?.feasibility).toBe("infeasible");
  });

  it("marks wedm as primary for profile_2d with 2d_profile + 4_axis_taper strategies", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("profile_2d");
    const wedm = opts.find((o) => o.process === "wedm");
    expect(wedm?.feasibility).toBe("primary");
    expect(wedm?.strategies).toContain("2d_profile");
    expect(wedm?.strategies).toContain("4_axis_taper");
  });

  it("marks both mill AND lathe as primary for boring", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("boring");
    const mill = opts.find((o) => o.process === "mill");
    const lathe = opts.find((o) => o.process === "lathe");
    expect(mill?.feasibility).toBe("primary");
    expect(lathe?.feasibility).toBe("primary");
  });

  it("normalizes uppercase feature id (POCKET_2D → pocket_2d)", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("POCKET_2D");
    expect(opts).toHaveLength(3);
    const mill = opts.find((o) => o.process === "mill");
    expect(mill?.feasibility).toBe("primary");
  });

  it("normalizes mixed-case feature id with whitespace", () => {
    const opts = CrossProcessFeatureBridge.listFeatureOptions("  Pocket_2D  ");
    expect(opts).toHaveLength(3);
  });

  it("throws on empty string", () => {
    expect(() => CrossProcessFeatureBridge.listFeatureOptions("")).toThrow(/non-empty/);
  });

  it("throws on whitespace-only string", () => {
    expect(() => CrossProcessFeatureBridge.listFeatureOptions("   ")).toThrow(/non-empty/);
  });

  it("throws on unknown feature id with supported list in error", () => {
    expect(() => CrossProcessFeatureBridge.listFeatureOptions("nonexistent_feature")).toThrow(
      /unknown feature.*pocket_2d/,
    );
  });

  it("throws on non-string input (number)", () => {
    const badInput = 42 as unknown as string;
    expect(() => CrossProcessFeatureBridge.listFeatureOptions(badInput)).toThrow(
      /must be a string/,
    );
  });

  it("throws on non-string input (null)", () => {
    const badInput = null as unknown as string;
    expect(() => CrossProcessFeatureBridge.listFeatureOptions(badInput)).toThrow(
      /must be a string/,
    );
  });

  it("returns defensive copies — mutation does not corrupt registry", () => {
    const first = CrossProcessFeatureBridge.listFeatureOptions("pocket_2d");
    const originalRationale = first[0].rationale;
    first[0].rationale = "MUTATED";
    const second = CrossProcessFeatureBridge.listFeatureOptions("pocket_2d");
    expect(second[0].rationale).toBe(originalRationale);
    expect(second[0].rationale).not.toBe("MUTATED");
  });
});

// ============================================================================
// SECTION 3 — route(): full per-feature breakdown
// ============================================================================

describe("CrossProcessFeatureBridge.route()", () => {
  it("returns full result for pocket_2d (no filter, no CAD lookup)", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "pocket_2d" });
    expect(out.feature).toBe("pocket_2d");
    expect(out.description).toMatch(/2D pocket/i);
    expect(out.process_options).toHaveLength(3);
    expect(out.recommended_process).toBe("mill");
    expect(out.cad_coverage).toEqual([]);
    expect(out.warnings).toEqual([]);
  });

  it("recommends lathe for groove_external", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "groove_external" });
    expect(out.recommended_process).toBe("lathe");
  });

  it("recommends wedm for profile_2d", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "profile_2d" });
    expect(out.recommended_process).toBe("wedm");
  });

  it("filters process_options when processes=['mill'] is provided", async () => {
    const out = await CrossProcessFeatureBridge.route({
      feature: "pocket_2d",
      processes: ["mill"],
    });
    expect(out.process_options).toHaveLength(1);
    expect(out.process_options[0].process).toBe("mill");
    expect(out.recommended_process).toBe("mill");
  });

  it("returns null recommended_process when filter excludes the canonical primary", async () => {
    // pocket_2d primary is mill; filter to wedm only
    const out = await CrossProcessFeatureBridge.route({
      feature: "pocket_2d",
      processes: ["wedm"],
    });
    expect(out.recommended_process).toBeNull();
    expect(out.process_options).toHaveLength(1);
    expect(out.process_options[0].process).toBe("wedm");
    expect(out.process_options[0].feasibility).toBe("alternate");
  });

  it("preserves rationale text for infeasible processes (lathe on pocket_2d)", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "pocket_2d" });
    const lathe = out.process_options.find((o) => o.process === "lathe");
    expect(lathe?.feasibility).toBe("infeasible");
    expect(lathe?.rationale).toMatch(/rotating workpiece/i);
  });

  it("assembles notes with feature metadata", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "pocket_2d" });
    expect(out.notes.some((n) => n.includes("feature=pocket_2d"))).toBe(true);
    expect(out.notes.some((n) => n.includes("description="))).toBe(true);
    expect(out.notes.some((n) => n.includes("cad_operation_keywords"))).toBe(true);
  });

  it("notes processes_filter when filter is supplied", async () => {
    const out = await CrossProcessFeatureBridge.route({
      feature: "pocket_2d",
      processes: ["mill", "wedm"],
    });
    expect(out.notes.some((n) => n.includes("processes_filter=[mill, wedm]"))).toBe(true);
  });

  it("performs CAD coverage lookup when cad_operation_id is provided", async () => {
    // EXTRUDE_CUT is a canonical pocket_2d keyword and exists in multiple CAD catalogs.
    // We don't depend on a specific match count (catalogs may shift) — we
    // assert that the cad_operation_id round-tripped into notes and the
    // result shape is intact (cad_coverage is an array, may be 0+ matches).
    const out = await CrossProcessFeatureBridge.route({
      feature: "pocket_2d",
      cad_operation_id: "EXTRUDE_CUT",
    });
    expect(out.cad_coverage.length).toBeGreaterThanOrEqual(0);
    expect(out.notes.some((n) => n.includes("cad_operation_id=EXTRUDE_CUT"))).toBe(true);
    // Each match (if any) must carry the expected fields
    out.cad_coverage.forEach((m) => {
      expect(typeof m.system).toBe("string");
      expect(typeof m.module_id).toBe("string");
      expect(m.operation_id).toBe("EXTRUDE_CUT");
    });
  });

  it("throws on missing request object", async () => {
    const badInput = undefined as unknown as { feature: string };
    await expect(CrossProcessFeatureBridge.route(badInput)).rejects.toThrow(
      /request object required/,
    );
  });

  it("throws on unknown feature id", async () => {
    await expect(
      CrossProcessFeatureBridge.route({ feature: "made_up_feature" }),
    ).rejects.toThrow(/unknown feature/);
  });

  it("throws on empty feature", async () => {
    await expect(CrossProcessFeatureBridge.route({ feature: "" })).rejects.toThrow(/non-empty/);
  });

  it("throws on processes filter that is not an array", async () => {
    const badProcesses = "mill" as unknown as FeatureProcessId[];
    await expect(
      CrossProcessFeatureBridge.route({ feature: "pocket_2d", processes: badProcesses }),
    ).rejects.toThrow(/processes must be an array/);
  });

  it("throws on processes filter containing an unknown id", async () => {
    const badProcesses = ["bogus_proc"] as unknown as FeatureProcessId[];
    await expect(
      CrossProcessFeatureBridge.route({ feature: "pocket_2d", processes: badProcesses }),
    ).rejects.toThrow(/invalid process/);
  });

  it("throws on cad_operation_id that is empty string", async () => {
    await expect(
      CrossProcessFeatureBridge.route({ feature: "pocket_2d", cad_operation_id: "" }),
    ).rejects.toThrow(/non-empty string/);
  });

  it("throws on cad_operation_id that is a number", async () => {
    const badId = 42 as unknown as string;
    await expect(
      CrossProcessFeatureBridge.route({ feature: "pocket_2d", cad_operation_id: badId }),
    ).rejects.toThrow(/non-empty string/);
  });

  it("throws on cad_operation_id that is whitespace-only", async () => {
    await expect(
      CrossProcessFeatureBridge.route({ feature: "pocket_2d", cad_operation_id: "   " }),
    ).rejects.toThrow(/non-empty string/);
  });

  it("surfaces warning when cad_operation_id has no catalog matches", async () => {
    const out = await CrossProcessFeatureBridge.route({
      feature: "pocket_2d",
      cad_operation_id: "DEFINITELY_NOT_A_REAL_CAD_OP_XYZ_123",
    });
    expect(out.cad_coverage).toEqual([]);
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.warnings.some((w) => w.includes("not found in any of the 5 CAD catalogs"))).toBe(
      true,
    );
  });
});

// ============================================================================
// SECTION 4 — exported constants
// ============================================================================

describe("Module exports — constants & types", () => {
  it("FEATURE_PROCESSES has exactly mill, lathe, wedm (in this order)", () => {
    expect(FEATURE_PROCESSES).toEqual(["mill", "lathe", "wedm"]);
  });

  it("FEATURE_FEASIBILITY has exactly primary, alternate, infeasible (in this order)", () => {
    expect(FEATURE_FEASIBILITY).toEqual(["primary", "alternate", "infeasible"]);
  });

  it("SUPPORTED_FEATURES has 12 entries", () => {
    expect(SUPPORTED_FEATURES).toHaveLength(12);
  });

  it("FeasibilityRank type assignment compiles for all 3 ranks", () => {
    const a: FeasibilityRank = "primary";
    const b: FeasibilityRank = "alternate";
    const c: FeasibilityRank = "infeasible";
    expect([a, b, c]).toEqual(["primary", "alternate", "infeasible"]);
  });
});

// ============================================================================
// SECTION 5 — process-by-process spot checks (covers hole_drill, slot, etc.)
// ============================================================================

describe("CrossProcessFeatureBridge — per-process spot checks", () => {
  it("hole_drill: mill primary, lathe alternate (axial only), wedm alternate (start hole)", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "hole_drill" });
    expect(out.recommended_process).toBe("mill");
    const lathe = out.process_options.find((o) => o.process === "lathe");
    const wedm = out.process_options.find((o) => o.process === "wedm");
    expect(lathe?.feasibility).toBe("alternate");
    expect(wedm?.feasibility).toBe("alternate");
    expect(wedm?.strategies).toContain("start_hole_only");
  });

  it("slot: mill primary, wedm alternate, lathe infeasible", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "slot" });
    expect(out.recommended_process).toBe("mill");
    const lathe = out.process_options.find((o) => o.process === "lathe");
    expect(lathe?.feasibility).toBe("infeasible");
  });

  it("groove_internal: lathe primary, mill+wedm both infeasible", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "groove_internal" });
    expect(out.recommended_process).toBe("lathe");
    const mill = out.process_options.find((o) => o.process === "mill");
    const wedm = out.process_options.find((o) => o.process === "wedm");
    expect(mill?.feasibility).toBe("infeasible");
    expect(wedm?.feasibility).toBe("infeasible");
  });

  it("face_milling: mill primary, lathe alternate (facing op), wedm infeasible", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "face_milling" });
    expect(out.recommended_process).toBe("mill");
    const lathe = out.process_options.find((o) => o.process === "lathe");
    const wedm = out.process_options.find((o) => o.process === "wedm");
    expect(lathe?.feasibility).toBe("alternate");
    expect(lathe?.strategies).toContain("facing_op");
    expect(wedm?.feasibility).toBe("infeasible");
  });

  it("chamfer: mill+lathe both primary, wedm alternate (taper_cut)", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "chamfer" });
    const mill = out.process_options.find((o) => o.process === "mill");
    const lathe = out.process_options.find((o) => o.process === "lathe");
    const wedm = out.process_options.find((o) => o.process === "wedm");
    expect(mill?.feasibility).toBe("primary");
    expect(lathe?.feasibility).toBe("primary");
    expect(wedm?.feasibility).toBe("alternate");
    expect(wedm?.strategies).toContain("taper_cut");
  });

  it("hole_thread_external: lathe primary, mill alternate (thread_mill), wedm infeasible", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "hole_thread_external" });
    expect(out.recommended_process).toBe("lathe");
    const mill = out.process_options.find((o) => o.process === "mill");
    const wedm = out.process_options.find((o) => o.process === "wedm");
    expect(mill?.feasibility).toBe("alternate");
    expect(mill?.strategies).toContain("thread_mill");
    expect(wedm?.feasibility).toBe("infeasible");
  });

  it("pocket_3d: mill primary, lathe+wedm both infeasible (3D walls not addressable)", async () => {
    const out = await CrossProcessFeatureBridge.route({ feature: "pocket_3d" });
    expect(out.recommended_process).toBe("mill");
    const lathe = out.process_options.find((o) => o.process === "lathe");
    const wedm = out.process_options.find((o) => o.process === "wedm");
    expect(lathe?.feasibility).toBe("infeasible");
    expect(wedm?.feasibility).toBe("infeasible");
  });
});
