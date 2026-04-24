/**
 * SolidCAM category-metadata consistency — CAM-EXHAUST-MS0/U-CAM56
 *
 * Backfill story:
 *   - 4 of 6 SolidCAM section catalogs originally had top-level categories=[]
 *     (2.5d-operations, 3d-hss-hsr, 5-axis, imachining)
 *   - Per-op `category` fields existed but no catalog vocabulary was declared
 *   - Manifest's per-section `categories` mirrored the empty arrays
 *
 * This test guarantees the backfill stays in place and that
 * validateConsistency() catches future drift.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { SolidCAMFunctionIndexEngine } from "../engines/SolidCAMFunctionIndexEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data/cam-functions/solidcam");

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
}

const SECTION_FILES = [
  "2.5d-operations.json",
  "3d-hss-hsr.json",
  "5-axis.json",
  "imachining.json",
  "turning.json",
  "millturn.json",
] as const;

describe("SolidCAM catalog category-array coverage", () => {
  it.each(SECTION_FILES)("%s declares non-empty top-level categories[]", (file) => {
    const c = readJson(file);
    expect(Array.isArray(c.categories)).toBe(true);
    expect(c.categories.length).toBeGreaterThan(0);
  });

  it("backfilled sections declare expected category vocabularies", () => {
    expect(readJson("2.5d-operations.json").categories.slice().sort()).toEqual(
      ["finishing", "holemaking", "roughing", "threading"],
    );
    expect(readJson("3d-hss-hsr.json").categories.slice().sort()).toEqual(
      ["finishing_planar", "finishing_specialty", "finishing_z_level", "roughing"],
    );
    expect(readJson("5-axis.json").categories.slice().sort()).toEqual(
      ["positional", "simultaneous_axis", "simultaneous_drive", "specialty"],
    );
    expect(readJson("imachining.json").categories.slice().sort()).toEqual(
      ["adaptive_clearing", "database", "wizard"],
    );
  });

  it("every operation in every section has a category present in its catalog vocabulary", () => {
    const orphans: string[] = [];
    for (const file of SECTION_FILES) {
      const c = readJson(file);
      const vocab = new Set(c.categories ?? []);
      for (const [opId, op] of Object.entries<{ category?: string }>(c.operations ?? {})) {
        if (!op.category) {
          orphans.push(`${file}::${opId} (no category)`);
        } else if (!vocab.has(op.category)) {
          orphans.push(`${file}::${opId} category='${op.category}' not in vocab`);
        }
      }
    }
    expect(orphans).toEqual([]);
  });
});

describe("SolidCAM manifest <-> catalog category sync", () => {
  it("manifest's per-section categories matches catalog top-level categories", () => {
    const manifest = readJson("function-index.json");
    const sectionMap: Record<string, string> = {
      "2.5d_operations": "2.5d-operations.json",
      "3d-hss-hsr": "3d-hss-hsr.json",
      "5-axis": "5-axis.json",
      "imachining": "imachining.json",
      "turning": "turning.json",
      "millturn": "millturn.json",
    };
    const mismatches: string[] = [];
    for (const [secKey, file] of Object.entries(sectionMap)) {
      const manifestCats = (manifest.sections[secKey].categories ?? []).slice().sort();
      const catalogCats = (readJson(file).categories ?? []).slice().sort();
      if (JSON.stringify(manifestCats) !== JSON.stringify(catalogCats)) {
        mismatches.push(
          `${secKey}: manifest=${JSON.stringify(manifestCats)} catalog=${JSON.stringify(catalogCats)}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("SolidCAMFunctionIndexEngine.validateConsistency — extended", () => {
  it("returns is_consistent=true after U-CAM56 backfill", () => {
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    expect(r.is_consistent).toBe(true);
    expect(r.sections_missing_categories).toEqual([]);
    expect(r.orphan_categories).toEqual([]);
    expect(r.manifest_catalog_category_mismatches).toEqual([]);
  });

  it("66 ops / 1383 params reconcile against expected_totals", () => {
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    expect(r.actual_section_count).toBe(6);
    expect(r.actual_total_operations).toBe(66);
    expect(r.actual_total_parameters).toBe(1383);
    expect(r.duplicate_operation_ids).toEqual([]);
    expect(r.missing_files).toEqual([]);
  });
});

describe("SolidCAMFunctionIndexEngine.getCategoryUniverse — post-backfill", () => {
  it("returns all distinct per-op categories across 6 sections", () => {
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    const names = cats.map((c) => c.category).sort();
    const expected = [
      "adaptive_clearing",
      "c_axis",
      "database",
      "drilling",
      "finishing",
      "finishing_planar",
      "finishing_specialty",
      "finishing_z_level",
      "grooving_parting",
      "holemaking",
      "live_tooling",
      "multi_channel",
      "positional",
      "roughing",
      "simultaneous_axis",
      "simultaneous_drive",
      "specialty",
      "sub_spindle",
      "swiss_type",
      "threading",
      "wizard",
      "y_axis",
    ];
    expect(names).toEqual(expected);
  });

  it("'roughing' spans ≥3 sections (2.5d, 3d-hss-hsr, turning)", () => {
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    const roughing = cats.find((c) => c.category === "roughing");
    expect(roughing?.category).toBe("roughing");
    expect(roughing?.sections.sort()).toEqual(
      ["2.5d_operations", "3d-hss-hsr", "turning"].sort(),
    );
    // 2.5d-operations: pocket_2d, face_milling, slot_milling, t_slot, imachining_2d (5)
    // 3d-hss-hsr:      hsr_roughing, hsr_rest_roughing                          (2)
    // turning:         turn_rough_external, turn_rough_face, turn_rough_internal (3)
    expect(roughing?.operation_count).toBe(10);
  });

  it("operation_count totals match the 66-op corpus", () => {
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    const total = cats.reduce((acc, c) => acc + c.operation_count, 0);
    expect(total).toBe(66);
  });

  it("'specialty' spans 5-axis + turning + millturn", () => {
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    const specialty = cats.find((c) => c.category === "specialty");
    expect(specialty?.category).toBe("specialty");
    expect(specialty?.sections.sort()).toEqual(["5-axis", "millturn", "turning"]);
    // 5-axis:  5x_multiblade, 5x_port, 5x_undercut          (3)
    // turning: turn_profile_recursive                        (1)
    // millturn: mt_thread_chasing_sync, mt_bar_feeder_advance (2)
    expect(specialty?.operation_count).toBe(6);
  });

  it("returned list is sorted alphabetically by category name", () => {
    const cats = SolidCAMFunctionIndexEngine.getCategoryUniverse();
    const names = cats.map((c) => c.category);
    const sorted = names.slice().sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe("validateConsistency — drift-detection coverage", () => {
  it("report exposes sections_missing_categories as an empty array post-backfill", () => {
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    expect(Array.isArray(r.sections_missing_categories)).toBe(true);
    expect(r.sections_missing_categories).toEqual([]);
  });

  it("report exposes orphan_categories as an empty array post-backfill", () => {
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    expect(Array.isArray(r.orphan_categories)).toBe(true);
    expect(r.orphan_categories).toEqual([]);
  });

  it("report exposes manifest_catalog_category_mismatches as an empty array post-backfill", () => {
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    expect(Array.isArray(r.manifest_catalog_category_mismatches)).toBe(true);
    expect(r.manifest_catalog_category_mismatches).toEqual([]);
  });

  it("is_consistent equals the conjunction of all 8 sub-checks (any drift breaks it)", () => {
    const r = SolidCAMFunctionIndexEngine.validateConsistency();
    const allClean =
      r.actual_section_count === r.manifest_section_count &&
      r.actual_total_operations === r.manifest_total_operations &&
      r.actual_total_parameters === r.manifest_total_parameters &&
      r.duplicate_operation_ids.length === 0 &&
      r.missing_files.length === 0 &&
      r.sections_missing_categories.length === 0 &&
      r.orphan_categories.length === 0 &&
      r.manifest_catalog_category_mismatches.length === 0;
    expect(r.is_consistent).toBe(allClean);
    expect(r.is_consistent).toBe(true);
  });
});
