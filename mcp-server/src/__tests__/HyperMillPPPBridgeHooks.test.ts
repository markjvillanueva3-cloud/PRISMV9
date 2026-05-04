/**
 * HyperMillPPPBridgeHooks — strict-legitimacy vitest
 *
 * Coverage shape:
 *   class shape + happy + ≥3 failure modes + ≥2 adversarial
 *
 * Engine has zero external runtime deps (only types from HyperMillPPPInputAdapter
 * and a CONTROLLER_FAMILY_TO_DIALECT constant import) → no mocks needed.
 *
 * Canonical Kienzle kc1.1 values per CLAUDE.md §SAFETY:
 *   P=1800, M=2100, K=1100, N=700, S=2800, H=3200
 */
import { describe, it, expect } from "vitest";
import {
  HyperMillPPPBridgeHooks,
  hyperMillPPPBridgeHooks,
  type HyperMillPPPContext,
} from "../engines/HyperMillPPPBridgeHooks.js";
import type { NCBlock, NCMotionType } from "../engines/HyperMillPPPInputAdapter.js";

// ── Named constants (canonical kc1.1 from src/physics/constants.ts) ─────────
const KC_P = 1800;
const KC_M = 2100;
const KC_K = 1100;
const KC_N = 700;
const KC_S = 2800;
const KC_H = 3200;
const DEFAULT_MAX_RPM = 15000;
const DEFAULT_MAX_FEED = 40000;
const DEFAULT_TOOL_DIA_MM = 10;
const DEFAULT_FLUTE_COUNT = 4;

// ── Helpers ──────────────────────────────────────────────────────────────────
const block = (
  partial: Partial<NCBlock> & { motion_type: NCMotionType; line_number: number; raw: string }
): NCBlock => ({
  g_codes: [],
  m_codes: [],
  spindle_rpm: null,
  feed_mmpm: null,
  passthrough: false,
  is_rtcp: false,
  is_traori: false,
  ...partial,
});

const baseContext = (overrides: Partial<HyperMillPPPContext> = {}): HyperMillPPPContext => ({
  material_iso_group: "P",
  kc1_1: KC_P,
  cycle_type: "hmFace",
  tool_diameter_mm: DEFAULT_TOOL_DIA_MM,
  flute_count: DEFAULT_FLUTE_COUNT,
  controller_family: "fanuc",
  dialect: "fanuc",
  machine_max_rpm: DEFAULT_MAX_RPM,
  machine_max_feed_mmpm: DEFAULT_MAX_FEED,
  ...overrides,
});

describe("HyperMillPPPBridgeHooks", () => {
  // ── Class shape ────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("singleton is an instance of HyperMillPPPBridgeHooks", () => {
      expect(hyperMillPPPBridgeHooks instanceof HyperMillPPPBridgeHooks).toBe(true);
    });

    it("exposes preHook and postHook methods", () => {
      expect(typeof hyperMillPPPBridgeHooks.preHook).toBe("function");
      expect(typeof hyperMillPPPBridgeHooks.postHook).toBe("function");
    });
  });

  // ── preHook — ISO group resolution ────────────────────────────────────────
  describe("preHook — ISO group → kc1.1 mapping (canonical)", () => {
    it.each<[string, number]>([
      ["P", KC_P],
      ["M", KC_M],
      ["K", KC_K],
      ["N", KC_N],
      ["S", KC_S],
      ["H", KC_H],
    ])("ISO group %s resolves to kc1.1 = %i (no warning)", (iso, expectedKc) => {
      const r = hyperMillPPPBridgeHooks.preHook([], { material_iso_group: iso });
      expect(r.success).toBe(true);
      expect(r.context.material_iso_group).toBe(iso);
      expect(r.context.kc1_1).toBe(expectedKc);
      expect(r.warnings.length).toBe(0);
    });

    it("lowercase iso group is uppercased before lookup", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], { material_iso_group: "m" });
      expect(r.context.material_iso_group).toBe("M");
      expect(r.context.kc1_1).toBe(KC_M);
      expect(r.warnings.length).toBe(0);
    });

    it("missing ISO group defaults to P with kc1.1 = 1800 (no warning, default is canonical)", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {});
      expect(r.context.material_iso_group).toBe("P");
      expect(r.context.kc1_1).toBe(KC_P);
      expect(r.warnings.length).toBe(0);
    });

    it("unknown ISO group warns and falls back to P", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], { material_iso_group: "Z" });
      expect(r.context.material_iso_group).toBe("Z");
      expect(r.context.kc1_1).toBe(KC_P);
      expect(r.warnings.length).toBe(1);
      expect(r.warnings[0].includes("Unknown ISO group 'Z'")).toBe(true);
      expect(r.warnings[0].includes(`kc1.1=${KC_P}`)).toBe(true);
    });
  });

  // ── preHook — dialect resolution ──────────────────────────────────────────
  describe("preHook — controller_family → dialect resolution", () => {
    it("fanuc → fanuc dialect", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], { controller_family: "fanuc" });
      expect(r.context.dialect).toBe("fanuc");
    });

    it("dmg → siemens dialect (DMG runs Siemens 840D)", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], { controller_family: "dmg" });
      expect(r.context.dialect).toBe("siemens");
    });

    it("hermle → heidenhain dialect (Hermle runs TNC)", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], { controller_family: "hermle" });
      expect(r.context.dialect).toBe("heidenhain");
    });

    it("explicit dialect overrides controller_family mapping", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {
        controller_family: "fanuc",
        dialect: "siemens",
      });
      expect(r.context.dialect).toBe("siemens");
    });

    it("missing controller_family defaults to fanuc/fanuc", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {});
      expect(r.context.controller_family).toBe("fanuc");
      expect(r.context.dialect).toBe("fanuc");
    });
  });

  // ── preHook — defaults & machine limits ───────────────────────────────────
  describe("preHook — defaults and machine limit handling", () => {
    it("missing machine limits → defaults 15000 RPM / 40000 mm/min, no warning", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {});
      expect(r.context.machine_max_rpm).toBe(DEFAULT_MAX_RPM);
      expect(r.context.machine_max_feed_mmpm).toBe(DEFAULT_MAX_FEED);
      expect(r.warnings.length).toBe(0);
    });

    it("zero machine_max_rpm passes through but emits warning", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], { machine_max_rpm: 0 });
      // The engine warns but does NOT replace 0 with 15000 — context carries 0
      expect(r.context.machine_max_rpm).toBe(0);
      expect(r.warnings.some(w => w.includes("zero or negative"))).toBe(true);
    });

    it("negative machine_max_rpm passes through but emits warning", () => {
      const NEGATIVE_RPM = -100;
      const r = hyperMillPPPBridgeHooks.preHook([], { machine_max_rpm: NEGATIVE_RPM });
      expect(r.context.machine_max_rpm).toBe(NEGATIVE_RPM);
      expect(r.warnings.some(w => w.includes("zero or negative"))).toBe(true);
    });

    it("missing tool_diameter_mm defaults to 10mm, missing flute_count defaults to 4", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {});
      expect(r.context.tool_diameter_mm).toBe(DEFAULT_TOOL_DIA_MM);
      expect(r.context.flute_count).toBe(DEFAULT_FLUTE_COUNT);
    });

    it("missing cycle_type defaults to 'unknown'", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {});
      expect(r.context.cycle_type).toBe("unknown");
    });
  });

  // ── preHook — block enrichment counting ───────────────────────────────────
  describe("preHook — enrichable block counting", () => {
    it("counts only motion blocks (linear, arc_cw, arc_ccw, 5axis_rtcp)", () => {
      const blocks: NCBlock[] = [
        block({ motion_type: "linear",     line_number: 1, raw: "G1" }),
        block({ motion_type: "arc_cw",     line_number: 2, raw: "G2" }),
        block({ motion_type: "arc_ccw",    line_number: 3, raw: "G3" }),
        block({ motion_type: "5axis_rtcp", line_number: 4, raw: "G43.4", is_rtcp: true }),
        block({ motion_type: "rapid",      line_number: 5, raw: "G0" }),       // excluded
        block({ motion_type: "comment",    line_number: 6, raw: "( cmt )" }),  // excluded
        block({ motion_type: "toolchange", line_number: 7, raw: "M6 T1" }),    // excluded
      ];
      const FOUR_MOTION_BLOCKS = 4;
      const r = hyperMillPPPBridgeHooks.preHook(blocks, {});
      expect(r.blocks_to_enrich).toBe(FOUR_MOTION_BLOCKS);
    });

    it("adversarial: empty blocks array → 0 enrichable, no error", () => {
      const r = hyperMillPPPBridgeHooks.preHook([], {});
      expect(r.success).toBe(true);
      expect(r.blocks_to_enrich).toBe(0);
    });

    it("adversarial: 1000-block program processes without crash", () => {
      const ONE_THOUSAND = 1000;
      const blocks: NCBlock[] = Array.from({ length: ONE_THOUSAND }, (_, i) =>
        block({ motion_type: "linear", line_number: i + 1, raw: `G1 X${i}` })
      );
      const r = hyperMillPPPBridgeHooks.preHook(blocks, {});
      expect(r.blocks_to_enrich).toBe(ONE_THOUSAND);
    });
  });

  // ── postHook — RPM/feed envelope validation ───────────────────────────────
  describe("postHook — RPM/feed envelope validation", () => {
    it("happy path: all blocks within envelope → all_valid true, zero violations", () => {
      const ctx = baseContext({ machine_max_rpm: 12000, machine_max_feed_mmpm: 10000 });
      const blocks: NCBlock[] = [
        block({ motion_type: "linear", line_number: 1, raw: "G1 S5000 F2000", spindle_rpm: 5000, feed_mmpm: 2000 }),
        block({ motion_type: "linear", line_number: 2, raw: "G1 S6000 F3000", spindle_rpm: 6000, feed_mmpm: 3000 }),
      ];
      const TWO = 2;
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.all_valid).toBe(true);
      expect(r.rpm_violations).toBe(0);
      expect(r.feed_violations).toBe(0);
      expect(r.findings.length).toBe(0);
      expect(r.blocks_validated).toBe(TWO);
    });

    it("over-RPM block → CRITICAL finding, rpm_violations=1, all_valid false", () => {
      const RPM_LIMIT = 12000;
      const OVER_RPM = 14000;
      const ctx = baseContext({ machine_max_rpm: RPM_LIMIT });
      const blocks: NCBlock[] = [
        block({ motion_type: "linear", line_number: 1, raw: `G1 S${OVER_RPM}`, spindle_rpm: OVER_RPM }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.all_valid).toBe(false);
      expect(r.rpm_violations).toBe(1);
      expect(r.findings.length).toBe(1);
      expect(r.findings[0].severity).toBe("CRITICAL");
      expect(r.findings[0].finding.includes(`S${OVER_RPM}`)).toBe(true);
      expect(r.findings[0].finding.includes(`max ${RPM_LIMIT}`)).toBe(true);
      expect(r.findings[0].line_number).toBe(1);
    });

    it("over-feed block → CRITICAL finding, feed_violations=1", () => {
      const FEED_LIMIT = 8000;
      const OVER_FEED = 12000;
      const ctx = baseContext({ machine_max_feed_mmpm: FEED_LIMIT });
      const blocks: NCBlock[] = [
        block({ motion_type: "linear", line_number: 5, raw: `G1 F${OVER_FEED}`, feed_mmpm: OVER_FEED }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.all_valid).toBe(false);
      expect(r.feed_violations).toBe(1);
      expect(r.findings[0].finding.includes(`max feed ${FEED_LIMIT}`)).toBe(true);
    });

    it("RPM exactly at limit → not a violation (>, not >=)", () => {
      const LIMIT = 12000;
      const ctx = baseContext({ machine_max_rpm: LIMIT });
      const blocks: NCBlock[] = [
        block({ motion_type: "linear", line_number: 1, raw: "G1", spindle_rpm: LIMIT }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.rpm_violations).toBe(0);
      expect(r.all_valid).toBe(true);
    });

    it("RPM null skipped (no S value on block)", () => {
      const ctx = baseContext({ machine_max_rpm: 100 });
      const blocks: NCBlock[] = [
        block({ motion_type: "linear", line_number: 1, raw: "G1 X5", spindle_rpm: null }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.rpm_violations).toBe(0);
      expect(r.findings.length).toBe(0);
    });

    it("passthrough block is skipped entirely (TRAORI Siemens)", () => {
      const ctx = baseContext({ machine_max_rpm: 100, machine_max_feed_mmpm: 100 });
      const blocks: NCBlock[] = [
        block({
          motion_type: "traori",
          line_number: 1,
          raw: "TRAORI",
          spindle_rpm: 999999,
          feed_mmpm: 999999,
          passthrough: true,
        }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.rpm_violations).toBe(0);
      expect(r.feed_violations).toBe(0);
      expect(r.findings.length).toBe(0);
      expect(r.blocks_validated).toBe(0);
    });
  });

  // ── postHook — RTCP validation ────────────────────────────────────────────
  describe("postHook — RTCP (G43.4) validation", () => {
    it("RTCP block with S value → counted as validated, no warning", () => {
      const ctx = baseContext();
      const blocks: NCBlock[] = [
        block({
          motion_type: "5axis_rtcp",
          line_number: 1,
          raw: "G43.4 S8000",
          is_rtcp: true,
          spindle_rpm: 8000,
        }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.rtcp_blocks_validated).toBe(1);
      expect(r.findings.length).toBe(0);
    });

    it("RTCP block missing S value → WARNING (severity not CRITICAL)", () => {
      const ctx = baseContext();
      const blocks: NCBlock[] = [
        block({
          motion_type: "5axis_rtcp",
          line_number: 7,
          raw: "G43.4",
          is_rtcp: true,
          spindle_rpm: null,
        }),
      ];
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.rtcp_blocks_validated).toBe(1);
      expect(r.findings.length).toBe(1);
      expect(r.findings[0].severity).toBe("WARNING");
      expect(r.findings[0].finding.includes("G43.4 RTCP")).toBe(true);
      // WARNING does NOT flip all_valid (only CRITICAL violations do)
      expect(r.all_valid).toBe(true);
    });

    it("multiple RTCP blocks: count totals, separate findings per missing-S", () => {
      const ctx = baseContext();
      const blocks: NCBlock[] = [
        block({ motion_type: "5axis_rtcp", line_number: 1, raw: "G43.4 S5000", is_rtcp: true, spindle_rpm: 5000 }),
        block({ motion_type: "5axis_rtcp", line_number: 2, raw: "G43.4",       is_rtcp: true, spindle_rpm: null }),
        block({ motion_type: "5axis_rtcp", line_number: 3, raw: "G43.4",       is_rtcp: true, spindle_rpm: null }),
      ];
      const THREE_RTCP = 3;
      const TWO_WARNINGS = 2;
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.rtcp_blocks_validated).toBe(THREE_RTCP);
      expect(r.findings.length).toBe(TWO_WARNINGS);
      const allWarnings = r.findings.every(f => f.severity === "WARNING");
      expect(allWarnings).toBe(true);
    });
  });

  // ── postHook — adversarial cases ──────────────────────────────────────────
  describe("postHook — adversarial inputs", () => {
    it("empty blocks array → all_valid true, zero counts", () => {
      const r = hyperMillPPPBridgeHooks.postHook([], baseContext());
      expect(r.all_valid).toBe(true);
      expect(r.blocks_validated).toBe(0);
      expect(r.findings.length).toBe(0);
      expect(r.rtcp_blocks_validated).toBe(0);
    });

    it("block with both RPM and feed over limit → 2 findings, both CRITICAL", () => {
      const RPM_LIM = 1000;
      const FEED_LIM = 1000;
      const ctx = baseContext({ machine_max_rpm: RPM_LIM, machine_max_feed_mmpm: FEED_LIM });
      const blocks: NCBlock[] = [
        block({
          motion_type: "linear",
          line_number: 9,
          raw: "G1 S5000 F5000",
          spindle_rpm: 5000,
          feed_mmpm: 5000,
        }),
      ];
      const TWO_FINDINGS = 2;
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.findings.length).toBe(TWO_FINDINGS);
      expect(r.rpm_violations).toBe(1);
      expect(r.feed_violations).toBe(1);
      const allCritical = r.findings.every(f => f.severity === "CRITICAL");
      expect(allCritical).toBe(true);
      expect(r.all_valid).toBe(false);
    });

    it("blocks_validated counts non-passthrough only (mixed batch)", () => {
      const ctx = baseContext();
      const blocks: NCBlock[] = [
        block({ motion_type: "linear",      line_number: 1, raw: "G1" }),
        block({ motion_type: "traori",      line_number: 2, raw: "TRAORI", passthrough: true }),
        block({ motion_type: "linear",      line_number: 3, raw: "G1" }),
        block({ motion_type: "passthrough", line_number: 4, raw: "(stuff)", passthrough: true }),
      ];
      const TWO_NON_PASSTHROUGH = 2;
      const r = hyperMillPPPBridgeHooks.postHook(blocks, ctx);
      expect(r.blocks_validated).toBe(TWO_NON_PASSTHROUGH);
    });
  });
});
