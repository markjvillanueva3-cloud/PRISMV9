/**
 * KiloHyperCadFeatureTaggerEngine Tests — KILO-CAM-MASTERY-MS0 iter 4
 *
 * Covers tagHyperCadFeatures: maps CAD-AI features to hyperMILL PFC tags,
 * surfaces unknown types + missing-tolerance per kilo refuse-list. Every
 * assertion verifies a concrete value or count (no presence-only stubs).
 *
 * @milestone KILO-CAM-MASTERY-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloHyperCadFeatureTaggerEngine,
  HyperCadFeatureTagSetSchema,
  type CadGeometrySlice,
} from "../engines/KiloHyperCadFeatureTaggerEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

const PART_TYPICAL: CadGeometrySlice = {
  part_id: "PART-100",
  features: [
    { id: "F1", type: "pocket", cycle_hint: "pocket", tolerance_total_mm: 0.05,
      dimension_mm: { width: 40, depth: 25, height_or_depth: 12 } },
    { id: "F2", type: "face", cycle_hint: "face", tolerance_total_mm: 0.1,
      dimension_mm: { width: 100, depth: 80 } },
    { id: "F3", type: "drill_hole", cycle_hint: "drill",
      dimension_mm: { width: 8, depth: 8, height_or_depth: 20 } },
    { id: "F4", type: "thread", tolerance_total_mm: 0.025,
      dimension_mm: { width: 10, depth: 10, height_or_depth: 18 } },
    { id: "F5", type: "fillet", tolerance_total_mm: 0.05 },
  ],
  material_iso_group: "P",
};

const PART_WITH_UNKNOWN: CadGeometrySlice = {
  part_id: "PART-200",
  features: [
    { id: "F1", type: "pocket", tolerance_total_mm: 0.05 },
    { id: "F2", type: "weird_undocumented_type", tolerance_total_mm: 0.1 },
    { id: "F3", type: "another_unknown" },
  ],
  material_iso_group: "M",
};

const PART_TOLERANCE_GAPS: CadGeometrySlice = {
  part_id: "PART-300",
  features: [
    { id: "F1", type: "pocket", tolerance_total_mm: 0.05 },
    { id: "F2", type: "face" }, // no tolerance
    { id: "F3", type: "hole" }, // no tolerance
  ],
  material_iso_group: "K",
};

describe("KiloHyperCadFeatureTaggerEngine", () => {

  // ==========================================================================
  // TYPE → PFC CATEGORY MAPPING (hyperMILL 2024 PFC §3.1)
  // ==========================================================================

  describe("type→PFC category mapping", () => {
    it("pocket type maps to PFC pocket category", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f1 = out.tags.find(t => t.feature_id === "F1")!;
      expect(f1.pfc_category).toBe("pocket");
    });

    it("face type maps to PFC face category", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f2 = out.tags.find(t => t.feature_id === "F2")!;
      expect(f2.pfc_category).toBe("face");
    });

    it("drill_hole type maps to PFC hole category", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f3 = out.tags.find(t => t.feature_id === "F3")!;
      expect(f3.pfc_category).toBe("hole");
    });

    it("thread type maps to PFC thread category", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f4 = out.tags.find(t => t.feature_id === "F4")!;
      expect(f4.pfc_category).toBe("thread");
    });

    it("fillet type maps to PFC fillet category", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f5 = out.tags.find(t => t.feature_id === "F5")!;
      expect(f5.pfc_category).toBe("fillet");
    });

    it("uppercase POCKET still maps to pocket (case-insensitive normalize)", () => {
      const cad: CadGeometrySlice = {
        part_id: "CASE", features: [{ id: "F1", type: "POCKET" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("pocket");
    });
  });

  // ==========================================================================
  // RECOMMENDED CYCLE (hyperMILL Strategy Picker default mappings)
  // ==========================================================================

  describe("recommended_cycle defaults", () => {
    it("pocket recommends OptiRough", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f1 = out.tags.find(t => t.feature_id === "F1")!;
      expect(f1.recommended_cycle).toBe("OptiRough");
    });

    it("face recommends Face Milling", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f2 = out.tags.find(t => t.feature_id === "F2")!;
      expect(f2.recommended_cycle).toBe("Face Milling");
    });

    it("hole recommends Drilling", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f3 = out.tags.find(t => t.feature_id === "F3")!;
      expect(f3.recommended_cycle).toBe("Drilling");
    });

    it("thread recommends Thread Milling", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f4 = out.tags.find(t => t.feature_id === "F4")!;
      expect(f4.recommended_cycle).toBe("Thread Milling");
    });
  });

  // ==========================================================================
  // REFUSE-LIST: NO SILENT FALLBACK ON AMBIGUOUS CALLOUTS
  // ==========================================================================

  describe("refuse: no silent fallback on ambiguous types", () => {
    it("unknown type 'weird_undocumented_type' surfaces in unhandled list", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_WITH_UNKNOWN);
      expect(out.unhandled_feature_types).toContain("weird_undocumented_type");
    });

    it("unknown type 'another_unknown' surfaces in unhandled list", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_WITH_UNKNOWN);
      expect(out.unhandled_feature_types).toContain("another_unknown");
    });

    it("unknown-type features produce 0 tags (refuse-list — no silent fallback)", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_WITH_UNKNOWN);
      // Only F1 (pocket) gets a tag — F2 and F3 are surfaced as unhandled, not tagged
      expect(out.tags.length).toBe(1);
      expect(out.tags[0].feature_id).toBe("F1");
    });
  });

  // ==========================================================================
  // REFUSE-LIST: TOLERANCE-STACK PROPAGATION
  // ==========================================================================

  describe("refuse: tolerance-stack propagation (never loosens silently)", () => {
    it("explicit tolerance 0.05 flows through verbatim", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f1 = out.tags.find(t => t.feature_id === "F1")!;
      expect(f1.tolerance_total_mm).toBe(0.05);
    });

    it("tighter explicit tolerance 0.025 flows through verbatim", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f4 = out.tags.find(t => t.feature_id === "F4")!;
      expect(f4.tolerance_total_mm).toBe(0.025);
    });

    it("missing tolerance stays missing (no heuristic fill); operator-surfaced", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TOLERANCE_GAPS);
      // F1 = explicit 0.05 (propagates), F2/F3 = missing.
      // Refuse-list: never silently fill. The gap must be visible in features_missing_tolerance.
      const f1 = out.tags.find(t => t.feature_id === "F1")!;
      const f2 = out.tags.find(t => t.feature_id === "F2")!;
      const f3 = out.tags.find(t => t.feature_id === "F3")!;
      expect(f1.tolerance_total_mm).toBe(0.05);
      expect(f2.tolerance_total_mm === undefined).toBe(true);
      expect(f3.tolerance_total_mm === undefined).toBe(true);
      expect(out.features_missing_tolerance).toEqual(expect.arrayContaining(["F2", "F3"]));
      expect(out.features_missing_tolerance.length).toBe(2);
    });

    it("features with explicit tolerance are NOT in features_missing_tolerance", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TOLERANCE_GAPS);
      expect(out.features_missing_tolerance.includes("F1")).toBe(false);
    });
  });

  // ==========================================================================
  // DIMENSIONAL PASSTHROUGH
  // ==========================================================================

  describe("dimension_mm passthrough", () => {
    it("pocket emits width=40, depth=25, height_or_depth=12 verbatim", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f1 = out.tags.find(t => t.feature_id === "F1")!;
      expect(f1.dimension_mm.width).toBe(40);
      expect(f1.dimension_mm.depth).toBe(25);
      expect(f1.dimension_mm.height_or_depth).toBe(12);
    });

    it("face emits width=100, depth=80 (height_or_depth omitted by source)", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f2 = out.tags.find(t => t.feature_id === "F2")!;
      expect(f2.dimension_mm.width).toBe(100);
      expect(f2.dimension_mm.depth).toBe(80);
      expect(f2.dimension_mm.height_or_depth === undefined).toBe(true);
    });

    it("feature with no dimension_mm emits empty {} (never NaN, never Infinity)", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const f5 = out.tags.find(t => t.feature_id === "F5")!;
      expect(Object.keys(f5.dimension_mm).length).toBe(0);
    });
  });

  // ==========================================================================
  // R12 SCHEMA GATES (fail loud)
  // ==========================================================================

  describe("R12 schema gates", () => {
    it("output passes own zod schema round-trip", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      const parsed = HyperCadFeatureTagSetSchema.parse(out);
      expect(parsed.tags.length).toBe(5);
    });

    it("empty features array rejected", () => {
      expect(() =>
        kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures({
          part_id: "EMPTY", features: [], material_iso_group: "P",
        }),
      ).toThrow();
    });

    it("invalid material iso_group rejected", () => {
      const bad = { ...PART_TYPICAL, material_iso_group: "Z" as never };
      expect(() =>
        kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(bad as CadGeometrySlice),
      ).toThrow();
    });

    it("negative tolerance rejected", () => {
      const bad: CadGeometrySlice = {
        part_id: "BAD",
        features: [{ id: "F1", type: "pocket", tolerance_total_mm: -0.05 }],
        material_iso_group: "P",
      };
      expect(() => kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(bad)).toThrow();
    });

    it("output names source fingerprint kilo_hypercad_feature_tagger", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      expect(out.source).toBe("kilo_hypercad_feature_tagger");
    });

    it("output declares schemaVersion 1.0.0", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      expect(out.schemaVersion).toBe("1.0.0");
    });

    it("part_id and material_iso_group flow through unchanged", () => {
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(PART_TYPICAL);
      expect(out.part_id).toBe("PART-100");
      expect(out.material_iso_group).toBe("P");
    });
  });

  // ==========================================================================
  // ALIAS COVERAGE — hyperMILL synonyms common in CAD-AI emit
  // ==========================================================================

  describe("type-alias coverage (hyperMILL synonyms)", () => {
    it("cavity maps to pocket", () => {
      const cad: CadGeometrySlice = {
        part_id: "A", features: [{ id: "F1", type: "cavity" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("pocket");
    });

    it("bore maps to hole", () => {
      const cad: CadGeometrySlice = {
        part_id: "A", features: [{ id: "F1", type: "bore" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("hole");
    });

    it("groove maps to slot", () => {
      const cad: CadGeometrySlice = {
        part_id: "A", features: [{ id: "F1", type: "groove" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("slot");
    });

    it("round maps to fillet (CAD-system terminology variance)", () => {
      const cad: CadGeometrySlice = {
        part_id: "A", features: [{ id: "F1", type: "round" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("fillet");
    });

    it("tapped_hole maps to thread", () => {
      const cad: CadGeometrySlice = {
        part_id: "A", features: [{ id: "F1", type: "tapped_hole" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("thread");
    });

    it("counterbore maps to hole", () => {
      const cad: CadGeometrySlice = {
        part_id: "A", features: [{ id: "F1", type: "counterbore" }], material_iso_group: "P",
      };
      const out = kiloHyperCadFeatureTaggerEngine.tagHyperCadFeatures(cad);
      expect(out.tags[0].pfc_category).toBe("hole");
    });
  });
});
