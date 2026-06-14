/**
 * Tests for SpeedFeedTriComparatorEngine — unified PRISM vs HSMAdvisor vs G-Wizard.
 *
 * Each full run() costs ONE physics-orchestrator call (the engine reuses the baseline
 * comparator's single PRISM run), so the suite is bounded to 3 orchestrator calls with a
 * generous timeout for fleet-contention robustness. External systems (HSMAdvisor / G-Wizard)
 * are injected via *_state_override so the test needs neither install. R9: consensus is asserted
 * as the actual median of the systems the engine reports — not a hardcoded number — and the
 * HSMAdvisor metric conversions are pinned to hand-computed reference values.
 */

import { describe, it, expect } from "vitest";
import {
  speedFeedTriComparatorEngine,
  SpeedFeedTriComparatorEngine,
  TriCompareInputSchema,
} from "../engines/SpeedFeedTriComparatorEngine.js";

const RUN_TIMEOUT = 120_000;

// Canonical cut: AISI 1018 (P), Ø12.7mm (0.5in) 4FL carbide endmill, milling roughing.
// This combination HAS a literature baseline in SpeedFeedBaselineComparatorEngine's DB.
const CANONICAL = {
  material: { iso_group: "P" as const, name: "AISI 1018" },
  tooling: { tool_diameter_mm: 12.7, flutes: 4, tool_material: "carbide" as const },
  toolpath: { operation: "milling" as const, cut_type: "roughing" as const, axial_depth_mm: 6, radial_depth_mm: 4.8 },
};

// HSMAdvisor live <Cut> for a Ø0.5in tool (aligned with the canonical Ø12.7mm).
function hsmaState(diameterIn = 0.5) {
  return {
    cut: { sfm: 720, ipt: 0.003, rpm: 5418, feed: 65, mrr: 1.0, material_id: 227 },
    tool: { diameter: diameterIn, flutes: 4 },
    settings: {},
  };
}

// G-Wizard crib with one matching carbide endmill.
const GWIZARD_STATE = {
  tools: [
    {
      key: 1, tabname: "Mill", guid: "gw1", slot: 1, description: "1/2in 4FL Carbide EM",
      tool: "Carbide Endmill", geometry: "endmill", flutes: 4, diameter: 0.5,
      toolmaterial: "Carbide", sfm: 740, ipt: 0.0032, units: "inches" as const,
    },
  ],
  source_path: "fixture",
  source_mtime_ms: 0,
  rows_seen: 1,
  warnings: [],
};

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

// Mirrors the comparator's internal round(n, 1) so per_source variances can be asserted
// EXACTLY (not via toBeCloseTo) against the live PRISM vc/fz + the published source anchors.
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

describe("SpeedFeedTriComparatorEngine", () => {
  it("exposes a singleton instance", () => {
    expect(speedFeedTriComparatorEngine).toBeInstanceOf(SpeedFeedTriComparatorEngine);
  });

  describe("input validation (no physics run)", () => {
    it("rejects material with neither iso_group nor name", () => {
      const parsed = TriCompareInputSchema.safeParse({ material: {}, tooling: { tool_diameter_mm: 10 } });
      expect(parsed.success).toBe(false);
    });
    it("rejects a non-positive tool diameter", () => {
      const parsed = TriCompareInputSchema.safeParse({ material: { iso_group: "P" }, tooling: { tool_diameter_mm: 0 } });
      expect(parsed.success).toBe(false);
    });
  });

  it(
    "stacks all 4 systems on one metric basis, with HSMAdvisor aligned and a 3-external consensus",
    () => {
      const res = speedFeedTriComparatorEngine.run({
        ...CANONICAL,
        hsmadvisor_state_override: hsmaState(0.5),
        gwizard_state_override: GWIZARD_STATE,
        gwizard_tool_selector: { guid: "gw1" },
      });

      // Fixed system order + availability.
      expect(res.systems.map((s) => s.system)).toEqual(["prism", "baseline", "hsmadvisor", "gwizard"]);
      const by = (n: string) => res.systems.find((s) => s.system === n)!;
      expect(by("prism").available).toBe(true);
      expect(by("baseline").available).toBe(true); // P/carbide/12mm/milling/rough is in the DB
      expect(by("hsmadvisor").available).toBe(true);
      expect(by("hsmadvisor").aligned).toBe(true); // Ø0.5in cut matches canonical Ø12.7mm
      expect(by("gwizard").available).toBe(true);

      // HSMAdvisor metric conversion pinned to hand-computed references (proves no 25.4×/0.3048 slip).
      const hsma = by("hsmadvisor").axes!;
      expect(hsma.vc_mpm).toBeCloseTo(720 * 0.3048, 1); // 219.5 m/min
      expect(hsma.fz_mm).toBeCloseTo(0.003 * 25.4, 4); // 0.0762 mm/tooth
      expect(hsma.mrr_cm3min).toBeCloseTo(1.0 * 16.387064, 1); // in³→cm³

      // G-Wizard metric conversion pinned.
      const gw = by("gwizard").axes!;
      expect(gw.vc_mpm).toBeCloseTo(740 * 0.3048, 1); // 225.6 m/min
      expect(gw.mrr_cm3min).toBeNull(); // G-Wizard never contributes MRR

      // Consensus is the ACTUAL median of the 3 available external systems (not hardcoded).
      const externalVc = [by("baseline").axes!.vc_mpm, hsma.vc_mpm, gw.vc_mpm];
      expect(res.consensus).not.toBeNull();
      expect(res.consensus!.vc_mpm).toBeCloseTo(median(externalVc), 1);

      // PRISM-vs-consensus verdict structure.
      expect(res.prism_vs_consensus).not.toBeNull();
      expect(res.prism_vs_consensus!.external_systems_used).toBe(3);
      expect(res.prism_vs_consensus!.per_axis.map((a) => a.axis)).toEqual(["vc", "fz", "rpm", "feed"]);
      for (const a of res.prism_vs_consensus!.per_axis) {
        expect(["aligned", "prism_higher", "prism_lower", "no_consensus"]).toContain(a.verdict);
        if (Number.isFinite(a.delta_pct)) {
          // verdict must be consistent with the 10% band.
          if (Math.abs(a.delta_pct) <= 0.1) expect(a.verdict).toBe("aligned");
          else expect(a.verdict).toBe(a.delta_pct > 0 ? "prism_higher" : "prism_lower");
        }
      }
      expect(res.prism_vs_consensus!.overall_agreement).toBeGreaterThanOrEqual(0);
      expect(res.prism_vs_consensus!.overall_agreement).toBeLessThanOrEqual(1);

      // Pairwise: PRISM vs each available external (3).
      expect(res.pairwise.map((p) => p.vs).sort()).toEqual(["baseline", "gwizard", "hsmadvisor"]);
      for (const p of res.pairwise) {
        expect(p.agreement).toBeGreaterThanOrEqual(0);
        expect(p.agreement).toBeLessThanOrEqual(1);
      }
    },
    RUN_TIMEOUT,
  );

  describe("baseline_detail — per-vendor published breakdown (U-OSC-COMPARE-PER-VENDOR)", () => {
    it(
      "surfaces cnccookbook (G-Wizard publisher) + hsmadvisor per-source variances, sign-correct vs the live PRISM output",
      () => {
        // No live closed-app adapters needed — baseline_detail is the PUBLISHED reference path.
        const res = speedFeedTriComparatorEngine.run({
          ...CANONICAL,
          include_hsmadvisor: false,
          include_gwizard: false,
        });

        expect(res.baseline_detail).not.toBeNull();
        expect(res.baseline_detail!.baseline_found).toBe(true);
        // Canonical cell resolves to the P/carbide/12mm/milling/roughing DB row.
        expect(res.baseline_detail!.baseline_key).toBe("P/carbide/12mm/milling/roughing");

        // PRISM's reported vc/fz ARE the exact values the comparator used to score per_source
        // (compare() reads recommendation.cutting_speed_mpm / feed_per_tooth_mm — same object).
        const prism = res.systems.find((s) => s.system === "prism")!;
        const prismVc = prism.axes!.vc_mpm;
        const prismFz = prism.axes!.fz_mm;

        // cnccookbook = CNCCookbook, the publisher of G-Wizard. Published carbide P/1018/12mm
        // milling-roughing reference: vc 200 m/min, fz 0.07 mm/tooth (DB row).
        const cc = res.baseline_detail!.per_source.find((s) => s.source === "cnccookbook");
        expect(cc!.source).toBe("cnccookbook");
        expect(cc!.citation).toContain("cnccookbook.com");
        expect(cc!.vc_variance_pct).toBe(round1(((prismVc - 200) / 200) * 100));
        expect(cc!.fz_variance_pct).toBe(round1(((prismFz - 0.07) / 0.07) * 100));

        // hsmadvisor published reference: vc 225 m/min, fz 0.08 mm/tooth (DB row).
        const hsm = res.baseline_detail!.per_source.find((s) => s.source === "hsmadvisor");
        expect(hsm!.source).toBe("hsmadvisor");
        expect(hsm!.vc_variance_pct).toBe(round1(((prismVc - 225) / 225) * 100));
        expect(hsm!.fz_variance_pct).toBe(round1(((prismFz - 0.08) / 0.08) * 100));

        // Sign convention: a positive variance MUST mean PRISM is faster/higher than that vendor.
        if (prismVc > 225) expect(hsm!.vc_variance_pct).toBeGreaterThan(0);
        if (prismVc < 225) expect(hsm!.vc_variance_pct).toBeLessThan(0);
      },
      RUN_TIMEOUT,
    );

    it(
      "returns null baseline_detail when no literature baseline exists for the cell",
      () => {
        // Exotic combo absent from the baseline DB: thread-milling Inconel (S) at Ø3.17mm.
        const res = speedFeedTriComparatorEngine.run({
          material: { iso_group: "S" as const, name: "Inconel 718" },
          tooling: { tool_diameter_mm: 3.17, flutes: 2, tool_material: "carbide" as const },
          toolpath: { operation: "thread_milling" as const, cut_type: "finishing" as const },
          include_hsmadvisor: false,
          include_gwizard: false,
        });
        expect(res.baseline_detail).toBeNull();
      },
      RUN_TIMEOUT,
    );
  });

  it(
    "includes a misaligned HSMAdvisor cut but flags it (and warns) — single-external consensus",
    () => {
      const res = speedFeedTriComparatorEngine.run({
        ...CANONICAL,
        include_baseline: false,
        include_gwizard: false,
        hsmadvisor_state_override: hsmaState(0.25), // Ø0.25in ≠ canonical Ø12.7mm
      });
      expect(res.systems.map((s) => s.system)).toEqual(["prism", "hsmadvisor"]);
      const hsma = res.systems.find((s) => s.system === "hsmadvisor")!;
      expect(hsma.available).toBe(true); // included...
      expect(hsma.aligned).toBe(false); // ...but flagged not-aligned
      expect(res.warnings.some((w) => /not-aligned|Δ|aligned/i.test(w))).toBe(true);
      // Only HSMAdvisor backs the consensus.
      expect(res.prism_vs_consensus!.external_systems_used).toBe(1);
      expect(res.consensus!.vc_mpm).toBeCloseTo(hsma.axes!.vc_mpm, 1);
    },
    RUN_TIMEOUT,
  );

  it(
    "degrades to a PRISM-only result (consensus null) when every external system is excluded",
    () => {
      const res = speedFeedTriComparatorEngine.run({
        ...CANONICAL,
        include_baseline: false,
        include_hsmadvisor: false,
        include_gwizard: false,
      });
      expect(res.systems.map((s) => s.system)).toEqual(["prism"]);
      expect(res.systems[0]!.axes!.vc_mpm).toBeGreaterThan(0); // PRISM genuinely ran
      expect(res.consensus).toBeNull();
      expect(res.prism_vs_consensus).toBeNull();
      expect(res.pairwise).toEqual([]);
      expect(res.warnings.some((w) => /no external system/i.test(w))).toBe(true);
    },
    RUN_TIMEOUT,
  );

  // OSCAR-SFC-9AXIS-MS0/U-OSC-CLOSED-LOOP (2026-06-08, live-caught): a
  // misaligned HSMAdvisor advisory must NOT pollute the consensus when an
  // aligned external (baseline) is present. Live closed-loop showed a single
  // open 634 m/min HSMAdvisor cut dragging the titanium-cell consensus up to
  // 345 m/min (impossible), making PRISM's correct ~42 m/min look wrong.
  it(
    "EXCLUDES a misaligned HSMAdvisor cut from consensus when an aligned baseline exists",
    () => {
      // A WILDLY divergent misaligned cut (2100 sfm ≈ 640 m/min — the real
      // titanium-cell pollutant from the live run), on a Ø6.35mm tool that
      // does NOT match the canonical Ø12.7mm ⇒ flagged not-aligned.
      const wildMisalignedHsm = {
        cut: { sfm: 2100, ipt: 0.003, rpm: 5418, feed: 65, mrr: 1.0, material_id: 227 },
        tool: { diameter: 0.25, flutes: 4 }, // Ø6.35mm ≠ canonical Ø12.7mm
        settings: {},
      };
      const res = speedFeedTriComparatorEngine.run({
        ...CANONICAL,
        include_baseline: true, // aligned external (no tool-alignment concept)
        include_gwizard: false,
        hsmadvisor_state_override: wildMisalignedHsm,
      });
      const hsma = res.systems.find((s) => s.system === "hsmadvisor")!;
      const baseline = res.systems.find((s) => s.system === "baseline")!;
      // HSMAdvisor is still SHOWN (available) and flagged not-aligned...
      expect(hsma.available).toBe(true);
      expect(hsma.aligned).toBe(false);
      // Premise guard: the misaligned advisory (≈640 m/min) is far from the
      // baseline — so IF it were folded into a 2-point median, the consensus
      // would land roughly halfway between them. Prove it doesn't.
      expect(Math.abs(hsma.axes!.vc_mpm - baseline.axes!.vc_mpm)).toBeGreaterThan(100);
      // The consensus is the BASELINE alone — the misaligned advisory excluded.
      expect(res.consensus!.vc_mpm).toBeCloseTo(baseline.axes!.vc_mpm, 1);
      expect(res.prism_vs_consensus!.external_systems_used).toBe(1);
    },
    RUN_TIMEOUT,
  );

  // OSCAR-SFC-9AXIS-MS0/U-OSC-CLOSED-LOOP-GW (2026-06-08): symmetric with the
  // HSMAdvisor case — a G-Wizard crib tool whose diameter does NOT match the
  // canonical cut is an unverifiable advisory and must be flagged not-aligned
  // + excluded from consensus when an aligned external (baseline) exists.
  it(
    "FLAGS and EXCLUDES a misaligned G-Wizard crib tool from consensus",
    () => {
      // Crib tool is Ø1.0in (25.4mm) ≠ canonical Ø12.7mm, with a divergent sfm.
      const misalignedGwState = {
        tools: [
          {
            key: 1, tabname: "Mill", guid: "gwBig", slot: 1,
            description: "1in 4FL Carbide EM", tool: "Carbide Endmill",
            geometry: "endmill", flutes: 4, diameter: 1.0,
            toolmaterial: "Carbide", sfm: 1800, ipt: 0.004, units: "inches" as const,
          },
        ],
        source_path: "fixture", source_mtime_ms: 0, rows_seen: 1, warnings: [],
      };
      const res = speedFeedTriComparatorEngine.run({
        ...CANONICAL,
        include_baseline: true, // aligned external
        include_hsmadvisor: false,
        gwizard_state_override: misalignedGwState,
        gwizard_tool_selector: { guid: "gwBig" },
      });
      const gw = res.systems.find((s) => s.system === "gwizard")!;
      const baseline = res.systems.find((s) => s.system === "baseline")!;
      // G-Wizard is still SHOWN (available) but flagged not-aligned...
      expect(gw.available).toBe(true);
      expect(gw.aligned).toBe(false);
      expect(res.warnings.some((w) => /gwizard.*not-aligned|gwizard.*Ø/i.test(w))).toBe(true);
      // Premise guard: the misaligned crib value (≈549 m/min from 1800 sfm) is
      // far from baseline — folding it in would visibly move the median.
      expect(Math.abs(gw.axes!.vc_mpm - baseline.axes!.vc_mpm)).toBeGreaterThan(100);
      // ...but consensus is the BASELINE alone — the misaligned crib excluded.
      expect(res.consensus!.vc_mpm).toBeCloseTo(baseline.axes!.vc_mpm, 1);
      expect(res.prism_vs_consensus!.external_systems_used).toBe(1);
    },
    RUN_TIMEOUT,
  );
});
