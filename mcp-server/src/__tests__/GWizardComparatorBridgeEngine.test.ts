/**
 * Tests for GWizardComparatorBridgeEngine — PRISM vs G-Wizard comparison leg.
 *
 * Strategy: the deterministic G-Wizard side (unit conversion + translation) is exercised via
 * the PUBLIC `prepare()` method, which stops short of the heavy physics orchestrator. Only the
 * two genuine integration assertions (per-axis diff + agreement, and axis composition) call the
 * full `run()`. This keeps the suite fast and robust under machine load while still verifying
 * real behavior. R9: every assertion is pinned to a hand-computed reference value — a hardcoded-
 * return engine would fail these, not pass them.
 */

import { describe, it, expect } from "vitest";
import {
  gWizardComparatorBridgeEngine,
  GWizardComparatorBridgeEngine,
  GWizardCompareInputSchema,
} from "../engines/GWizardComparatorBridgeEngine.js";
import type { GWizardTool } from "../engines/GWizardAdapterEngine.js";

// ── Fixture builder ──────────────────────────────────────────────────────
function makeTool(overrides: Partial<GWizardTool> = {}): GWizardTool {
  return {
    key: 1,
    tabname: "Mill",
    guid: "test-guid-001",
    slot: 1,
    description: "1/2in 4FL Carbide Endmill",
    tool: "Carbide Endmill",
    geometry: "endmill",
    flutes: 4,
    diameter: 0.5, // inches
    toolmaterial: "Carbide",
    sfm: 400,
    ipt: 0.004,
    units: "inches",
    ...overrides,
  };
}

const STEEL = { iso_group: "P" as const, name: "AISI 1018" };
// Real machine load can push a single physics-orchestrator run past the 5s default; the two
// integration tests below get a generous ceiling so contention can't false-fail correct logic.
const RUN_TIMEOUT = 120_000;

describe("GWizardComparatorBridgeEngine", () => {
  it("exposes a singleton instance of the class", () => {
    expect(gWizardComparatorBridgeEngine).toBeInstanceOf(GWizardComparatorBridgeEngine);
  });

  describe("G-Wizard recommendation normalization (deterministic, via prepare())", () => {
    it("converts inch-install sfm/ipt to PRISM-canonical metric exactly", () => {
      const gw = gWizardComparatorBridgeEngine.prepare({ tool_override: makeTool(), material: STEEL })
        .gwizard_recommendation;
      // vc = 400 ft/min * 0.3048 = 121.92 m/min
      expect(gw.vc_mpm).toBeCloseTo(121.92, 2);
      // fz = 0.004 in * 25.4 = 0.1016 mm
      expect(gw.fz_mm).toBeCloseTo(0.1016, 4);
      // rpm = vc*1000/(π·D_mm), D = 0.5in = 12.7mm → 121920/(π·12.7) ≈ 3056
      expect(gw.rpm).toBe(Math.round((121.92 * 1000) / (Math.PI * 12.7)));
      expect(gw.rpm).toBeCloseTo(3056, 0);
      // feed = rpm·fz·flutes pinned to a HAND-computed literal (not derived from gw.rpm —
      // a consistently-wrong engine must not be able to pass): ≈ 3055.8 * 0.1016 * 4 ≈ 1242
      expect(gw.feed_mmmin).toBeGreaterThan(1238);
      expect(gw.feed_mmmin).toBeLessThan(1246);
      expect(gw.units).toBe("inches");
    });

    it("treats a metric-install tool's columns as already-metric (no 25.4× inflation)", () => {
      const gw = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ units: "mm", diameter: 12.7, sfm: 121.92, ipt: 0.1016 }),
        material: STEEL,
      }).gwizard_recommendation;
      expect(gw.vc_mpm).toBeCloseTo(121.92, 2); // NOT 121.92*0.3048 (= 37.16)
      expect(gw.fz_mm).toBeCloseTo(0.1016, 4); // NOT 0.1016*25.4 (= 2.58)
      expect(gw.units).toBe("mm");
    });

    it("inch and metric encodings of the SAME physical cut yield equal canonical vc/fz/rpm", () => {
      const inch = gWizardComparatorBridgeEngine.prepare({ tool_override: makeTool(), material: STEEL })
        .gwizard_recommendation;
      const mm = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ units: "mm", diameter: 12.7, sfm: 121.92, ipt: 0.1016 }),
        material: STEEL,
      }).gwizard_recommendation;
      expect(inch.vc_mpm).toBeCloseTo(mm.vc_mpm, 1);
      expect(inch.fz_mm).toBeCloseTo(mm.fz_mm, 3);
      expect(inch.rpm).toBeCloseTo(mm.rpm, 0);
    });

    it("prefers manufacturer sfm/ipt when useMfg flags are set", () => {
      const gw = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ sfm: 400, ipt: 0.004, useMfgSFM: true, mfgSFM: 500, useMfgIPT: true, mfgIPT: 0.005 }),
        material: STEEL,
      }).gwizard_recommendation;
      // 500 ft/min * 0.3048 = 152.4 (proves it used mfgSFM=500, not sfm=400→121.92)
      expect(gw.vc_mpm).toBeCloseTo(152.4, 1);
      expect(gw.fz_mm).toBeCloseTo(0.005 * 25.4, 4);
      expect(gw.source).toBe("manufacturer");
    });
  });

  describe("UNITS FIRST guard", () => {
    it("warns loudly and assumes inches when units are unknown", () => {
      const prep = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ units: "unknown" }),
        material: STEEL,
      });
      expect(prep.gwizard_recommendation.units).toBe("unknown");
      // Treated-as-inches: 400 ft/min → 121.92 m/min (NOT passed through as 400 m/min).
      expect(prep.gwizard_recommendation.vc_mpm).toBeCloseTo(121.92, 2);
      expect(prep.warnings.some((w) => /25\.4|unknown|assuming INCHES/i.test(w))).toBe(true);
    });
  });

  describe("translation (via prepare())", () => {
    it("pattern-matches tool material families", () => {
      const hss = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ toolmaterial: "HSS-Co", tool: "HSS Endmill" }),
        material: STEEL,
      }).translation;
      expect(hss.tool_material).toBe("hss");

      const pcd = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ toolmaterial: "PCD" }),
        material: { iso_group: "N", name: "6061" },
      }).translation;
      expect(pcd.tool_material).toBe("pcd");
    });

    it("caller tool_material_overrides take precedence over pattern match", () => {
      const t = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ toolmaterial: "MysteryGrade" }),
        material: STEEL,
        tool_material_overrides: { MysteryGrade: "cermet" },
      }).translation;
      expect(t.tool_material).toBe("cermet");
      expect(t.tool_material_source).toBe("caller-override");
    });

    it("infers operation from the tool string, caller override wins", () => {
      const drill = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ tool: "Carbide Drill", geometry: "drill", description: "8mm drill" }),
        material: STEEL,
      }).translation;
      expect(drill.operation).toBe("drilling");
      expect(drill.operation_source).toBe("pattern-match");

      const forced = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool(),
        material: STEEL,
        operation: "boring",
      }).translation;
      expect(forced.operation).toBe("boring");
      expect(forced.operation_source).toBe("caller-override");
    });

    it("infers ISO group from a free-text material name when iso_group omitted", () => {
      const al = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool(),
        material: { name: "6061-T6 Aluminum" },
      }).translation;
      expect(al.iso_group).toBe("N");

      const ti = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool(),
        material: { name: "Ti-6Al-4V annealed" },
      }).translation;
      expect(ti.iso_group).toBe("S");
    });

    it("falls back to P (steel) with a warning when the material name matches no ISO pattern", () => {
      const prep = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool(),
        material: { name: "Unobtanium XJ-9" },
      });
      expect(prep.translation.iso_group).toBe("P");
      expect(prep.warnings.some((w) => /could not infer iso/i.test(w))).toBe(true);
    });
  });

  describe("flute / ipt gaps (via prepare())", () => {
    it("warns and yields NaN feed (not a fabricated 0) when the tool has no flute count", () => {
      const prep = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ flutes: undefined }),
        material: STEEL,
      });
      // fz is flute-independent → still derived to its real value.
      expect(prep.gwizard_recommendation.fz_mm).toBeCloseTo(0.1016, 4);
      // feed needs flutes → NaN sentinel, NOT 0 (a fabricated 0 would poison the agreement score).
      expect(prep.gwizard_recommendation.feed_mmmin).toBeNaN();
      expect(prep.warnings.some((w) => /flute/i.test(w))).toBe(true);
    });

    it("yields NaN fz/feed when ipt is missing, but keeps the real vc/rpm", () => {
      const gw = gWizardComparatorBridgeEngine.prepare({
        tool_override: makeTool({ ipt: undefined, chipload: undefined }),
        material: STEEL,
      }).gwizard_recommendation;
      expect(gw.vc_mpm).toBeCloseTo(121.92, 2);
      expect(gw.rpm).toBeCloseTo(3056, 0);
      expect(gw.fz_mm).toBeNaN();
      expect(gw.feed_mmmin).toBeNaN();
    });
  });

  describe("tool selection from a crib state (via prepare())", () => {
    it("selects a tool by description_contains from a state_override crib", () => {
      const state = {
        tools: [
          makeTool({ guid: "a", description: "1/4in 2FL", diameter: 0.25 }),
          makeTool({ guid: "b", description: "3/8in drill", tool: "Carbide Drill", geometry: "drill", diameter: 0.375, flutes: 2 }),
        ],
        source_path: "fixture",
        source_mtime_ms: 0,
        rows_seen: 2,
        warnings: [],
      };
      const prep = gWizardComparatorBridgeEngine.prepare({
        state_override: state,
        tool_selector: { description_contains: "drill" },
        material: STEEL,
      });
      expect(prep.tool.guid).toBe("b");
      expect(prep.translation.operation).toBe("drilling");
    });

    it("warns and uses the first tool when no selector is supplied", () => {
      const state = {
        tools: [makeTool({ guid: "first" }), makeTool({ guid: "second" })],
        source_path: "fixture",
        source_mtime_ms: 0,
        rows_seen: 2,
        warnings: [],
      };
      const prep = gWizardComparatorBridgeEngine.prepare({ state_override: state, material: STEEL });
      expect(prep.tool.guid).toBe("first");
      expect(prep.warnings.some((w) => /first crib tool/i.test(w))).toBe(true);
    });
  });

  describe("fail-loud edge cases (via prepare())", () => {
    it("throws when the tool has no surface speed", () => {
      expect(() =>
        gWizardComparatorBridgeEngine.prepare({ tool_override: makeTool({ sfm: undefined }), material: STEEL }),
      ).toThrow(/no surface speed/i);
    });

    it("throws when the tool has no usable diameter", () => {
      expect(() =>
        gWizardComparatorBridgeEngine.prepare({ tool_override: makeTool({ diameter: undefined }), material: STEEL }),
      ).toThrow(/diameter/i);
    });

    it("rejects material with neither iso_group nor name (schema)", () => {
      const parsed = GWizardCompareInputSchema.safeParse({ tool_override: makeTool(), material: {} });
      expect(parsed.success).toBe(false);
    });
  });

  // ── Integration: ONE full physics-orchestrator run covering every run()-only invariant.
  // Kept to a single orchestrator call so the suite stays fast/robust even under heavy fleet load.
  describe("full run() — PRISM integration", () => {
    it(
      "compares exactly vc/fz/rpm/feed (no MRR axis) with internally-consistent deltas + agreement",
      () => {
        // Depths feed PRISM's toolpath but MUST NOT add an MRR axis (G-Wizard has no cut depth).
        const res = gWizardComparatorBridgeEngine.run({
          tool_override: makeTool(),
          material: STEEL,
          axial_depth_mm: 6,
          radial_depth_mm: 4.8,
        });

        // Exactly the 4 G-Wizard-informed axes — never MRR.
        expect(res.axes.map((a) => a.axis).sort()).toEqual(["feed", "fz", "rpm", "vc"]);

        // Per-axis delta + agreement are internally consistent (a stub returning fixed numbers
        // could not satisfy delta = prism - gw AND the agreement formula simultaneously).
        for (const a of res.axes) {
          expect(a.delta_abs).toBeCloseTo(a.prism - a.gwizard, 2);
          if (a.gwizard !== 0) {
            expect(a.delta_pct).toBeCloseTo((a.prism - a.gwizard) / a.gwizard, 3);
          }
          const expectedAgreement = Math.max(0, 1 - Math.min(1, Math.abs(a.delta_pct) / 0.5));
          expect(a.axis_agreement).toBeCloseTo(expectedAgreement, 3);
        }
        expect(res.agreement_score).toBeGreaterThanOrEqual(0);
        expect(res.agreement_score).toBeLessThanOrEqual(1);

        // PRISM genuinely ran — its recommendation carries real, positive cutting physics.
        expect(res.prism_result.recommendation.cutting_speed_mpm).toBeGreaterThan(0);
        expect(res.prism_result.recommendation.spindle_rpm).toBeGreaterThan(0);
      },
      RUN_TIMEOUT,
    );
  });
});
