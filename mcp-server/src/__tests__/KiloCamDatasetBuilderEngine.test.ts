/**
 * KiloCamDatasetBuilderEngine Tests — KILO-CAM-MASTERY-MS0 campaign iter 3
 *
 * Verifies buildDataset emits one row per (system, toolpath), surfaces
 * untyped toolpaths instead of silently including them, propagates
 * material + tolerance + intent verbatim, and rejects malformed catalogs.
 *
 * @milestone KILO-CAM-MASTERY-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloCamDatasetBuilderEngine,
  BuildDatasetResultSchema,
  type CamToolpathCatalog,
} from "../engines/KiloCamDatasetBuilderEngine.js";

// ============================================================================
// FIXTURES — small catalog mirroring iter2's structure
// ============================================================================

const CATALOG_3_SYSTEM: CamToolpathCatalog = {
  schemaVersion: "1.0.0",
  priority_order: ["hypermill", "fusion360", "mastercam"],
  systems: {
    hypermill: {
      version: "2024",
      vendor_doc_anchor: "hyperMILL 2024 Strategy Reference",
      toolpath_count: 3,
      toolpaths: [
        { id: "hm.2d.face_milling", category: "face", geometry_hint: "planar_face" },
        { id: "hm.3dr.optirough", category: "pocket", geometry_hint: "3d_roughing_volume" },
        { id: "hm.5x.swarf", category: "5axis", geometry_hint: "ruled_swarf_surface" },
      ],
    },
    fusion360: {
      version: "2024",
      vendor_doc_anchor: "Fusion 360 Manufacture Help",
      toolpath_count: 2,
      toolpaths: [
        { id: "f360.2d.face", category: "face", geometry_hint: "planar_face" },
        { id: "f360.3dr.adaptive_clearing", category: "pocket", geometry_hint: "3d_roughing_volume" },
      ],
    },
    mastercam: {
      version: "2024",
      vendor_doc_anchor: "Mastercam 2024 Help",
      toolpath_count: 1,
      toolpaths: [
        { id: "mc.2d.face", category: "face", geometry_hint: "planar_face" },
      ],
    },
  },
};

const CATALOG_WITH_UNTYPED: CamToolpathCatalog = {
  schemaVersion: "1.0.0",
  priority_order: ["hypermill"],
  systems: {
    hypermill: {
      version: "2024",
      vendor_doc_anchor: "test",
      toolpath_count: 2,
      toolpaths: [
        { id: "hm.good", category: "face", geometry_hint: "planar_face" },
        { id: "hm.untyped", category: "", geometry_hint: "unknown" },
      ],
    },
  },
};

// ============================================================================
// PER-SYSTEM ROW EMISSION
// ============================================================================

describe("KiloCamDatasetBuilderEngine", () => {
  describe("buildDataset — row emission", () => {
    it("emits one row per (system, toolpath) — total 6 from 3 systems (3+2+1)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.total_rows).toBe(6);
    });

    it("system_row_counts reflects per-system enumeration", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.system_row_counts.hypermill).toBe(3);
      expect(out.system_row_counts.fusion360).toBe(2);
      expect(out.system_row_counts.mastercam).toBe(1);
    });

    it("strategy_id defaults to toolpath_id (1:1)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      const face = out.rows.find(r => r.toolpath_id === "hm.2d.face_milling")!;
      expect(face.strategy_id).toBe("hm.2d.face_milling");
    });

    it("category + geometry_hint flow through verbatim", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      const swarf = out.rows.find(r => r.toolpath_id === "hm.5x.swarf")!;
      expect(swarf.category).toBe("5axis");
      expect(swarf.geometry_hint).toBe("ruled_swarf_surface");
    });

    it("priority order respected (rows ordered by system then by catalog order)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.rows[0].system).toBe("hypermill");
      expect(out.rows[3].system).toBe("fusion360");
      expect(out.rows[5].system).toBe("mastercam");
    });
  });

  // ==========================================================================
  // OPTS — systems filter + intent + material + tolerance
  // ==========================================================================

  describe("buildDataset — opts", () => {
    it("systems filter restricts output to named systems only", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM, {
        systems: ["fusion360"],
      });
      expect(out.total_rows).toBe(2);
      expect(out.rows.every(r => r.system === "fusion360")).toBe(true);
    });

    it("intent default is use_every_toolpath (Phase 5)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.intent).toBe("use_every_toolpath");
      expect(out.rows[0].intent).toBe("use_every_toolpath");
    });

    it("intent can be overridden (Phase 6 best_strategy_for_feature)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM, {
        intent: "best_strategy_for_feature",
      });
      expect(out.intent).toBe("best_strategy_for_feature");
      expect(out.rows[0].intent).toBe("best_strategy_for_feature");
    });

    it("material_iso_group default is P (Phase 5 steel default)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.material_iso_group).toBe("P");
      expect(out.rows[0].material_iso_group).toBe("P");
    });

    it("material_iso_group override propagates to every row", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM, {
        material_iso_group: "S",
      });
      expect(out.rows.every(r => r.material_iso_group === "S")).toBe(true);
    });

    it("tolerance_total_mm propagates to every row when set (kilo refuse-list)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM, {
        tolerance_total_mm: 0.025,
      });
      expect(out.rows.every(r => r.tolerance_total_mm === 0.025)).toBe(true);
    });

    it("tolerance left undefined per row when opts.tolerance_total_mm not set", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.rows.every(r => r.tolerance_total_mm === undefined)).toBe(true);
    });
  });

  // ==========================================================================
  // REFUSE-LIST: untyped toolpaths surfaced, NOT silently emitted
  // ==========================================================================

  describe("refuse: no silent fallback on untyped toolpath", () => {
    it("untyped toolpath does NOT produce a dataset row", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_WITH_UNTYPED);
      expect(out.total_rows).toBe(1); // only hm.good gets a row
      expect(out.rows[0].toolpath_id).toBe("hm.good");
    });

    it("untyped toolpath is surfaced in untyped_toolpaths array (operator-visible)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_WITH_UNTYPED);
      expect(out.untyped_toolpaths.length).toBe(1);
      expect(out.untyped_toolpaths[0].toolpath_id).toBe("hm.untyped");
      expect(out.untyped_toolpaths[0].system).toBe("hypermill");
    });

    it("clean catalog produces empty untyped_toolpaths array", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.untyped_toolpaths.length).toBe(0);
    });
  });

  // ==========================================================================
  // SCHEMA INVARIANTS
  // ==========================================================================

  describe("R12 schema gates", () => {
    it("output passes its own zod schema round-trip", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      const parsed = BuildDatasetResultSchema.parse(out);
      expect(parsed.total_rows).toBe(6);
    });

    it("rejects empty toolpaths array on a system", () => {
      const bad: CamToolpathCatalog = {
        schemaVersion: "1.0.0",
        priority_order: ["x"],
        systems: {
          x: { version: "v", vendor_doc_anchor: "d", toolpath_count: 0, toolpaths: [] as never },
        },
      };
      expect(() => kiloCamDatasetBuilderEngine.buildDataset(bad)).toThrow();
    });

    it("rejects invalid catalog schemaVersion", () => {
      const bad = { ...CATALOG_3_SYSTEM, schemaVersion: "0.9.9" as never };
      expect(() => kiloCamDatasetBuilderEngine.buildDataset(bad as CamToolpathCatalog)).toThrow();
    });

    it("output fingerprints source for auditability", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.source).toBe("kilo_cam_dataset_builder");
      expect(out.rows[0].source).toBe("kilo_cam_dataset_builder");
    });

    it("schemaVersion 1.0.0 on output", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM);
      expect(out.schemaVersion).toBe("1.0.0");
    });

    it("unknown system in opts.systems is silently skipped (catalog ground truth)", () => {
      const out = kiloCamDatasetBuilderEngine.buildDataset(CATALOG_3_SYSTEM, {
        systems: ["hypermill", "does_not_exist"],
      });
      expect(out.total_rows).toBe(3); // hypermill rows only
      expect(out.system_row_counts.hypermill).toBe(3);
      expect(out.system_row_counts.does_not_exist).toBeUndefined();
    });
  });
});
