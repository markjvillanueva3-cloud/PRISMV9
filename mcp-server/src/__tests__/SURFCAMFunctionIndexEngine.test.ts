/**
 * SURFCAMFunctionIndexEngine.test.ts — CAM-EXHAUST-MS0/U-CAM51
 *
 * Real-data tests against the 4-file SURFCAM corpus
 * (milling-2d, milling-3d, turning, truemill). Engine is a passive
 * indexer — it parses the section JSONs, aggregates totals, and exposes
 * lookups + the TrueMill flagship helper. Concrete assertions only —
 * no presence-only `toBeTruthy()` placeholders.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SURFCAMFunctionIndexEngine } from "../engines/SURFCAMFunctionIndexEngine";

// ── Named constants — mirror engine API contract ────────────────────────────
const EXPECTED_SECTIONS = ["milling_2d", "milling_3d", "turning", "truemill"];
const EXPECTED_TOTAL_OPS = 17; // milling-2d 5 + milling-3d 4 + turning 5 + truemill 3
const EXPECTED_PARAMS_LOWER = 250;
const EXPECTED_PARAMS_UPPER = 320;
const EXPECTED_CATEGORY_COUNT = 17; // 1:1 with ops since each op has unique category
const TRUEMILL_OP_COUNT = 3;
const SEARCH_DEFAULT_LIMIT = 20;
const SEARCH_MAX_LIMIT_CLAMP = 500;
const TRUEMILL_OP_IDS = ["truemill_pocket", "truemill_profile", "truemill_rest"];
const MILLING_2D_OP_IDS = ["pocket_2d", "contour_2d", "drill_2d", "slot_2d", "face_2d"];
const TURNING_OP_IDS = ["turn_rough", "turn_finish", "groove", "thread", "cutoff"];

describe("SURFCAMFunctionIndexEngine", () => {
  beforeEach(() => {
    SURFCAMFunctionIndexEngine.resetCache();
  });

  describe("loadIndex / getIndex", () => {
    it("loads exactly four sections with system_id='surfcam'", () => {
      const idx = SURFCAMFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("surfcam");
      expect(Object.keys(idx.sections).sort()).toEqual([...EXPECTED_SECTIONS].sort());
    });

    it("aggregates exactly 17 total operations across sections", () => {
      const idx = SURFCAMFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(EXPECTED_TOTAL_OPS);
    });

    it("aggregates total parameters within documented band [250..320]", () => {
      const idx = SURFCAMFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBeGreaterThanOrEqual(EXPECTED_PARAMS_LOWER);
      expect(idx.total_parameters).toBeLessThanOrEqual(EXPECTED_PARAMS_UPPER);
    });

    it("collects 17 distinct categories (op→category 1:1)", () => {
      const idx = SURFCAMFunctionIndexEngine.getIndex();
      expect(idx.categories.length).toBe(EXPECTED_CATEGORY_COUNT);
      expect(idx.categories).toContain("pocket_2d");
      expect(idx.categories).toContain("zlevel_rough_3d");
      expect(idx.categories).toContain("turn_rough");
      expect(idx.categories).toContain("truemill_pocket");
    });

    it("caches loaded index — second call returns identical reference", () => {
      const a = SURFCAMFunctionIndexEngine.getIndex();
      const b = SURFCAMFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a fresh load on next access", () => {
      const a = SURFCAMFunctionIndexEngine.getIndex();
      SURFCAMFunctionIndexEngine.resetCache();
      const b = SURFCAMFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.total_operations).toBe(EXPECTED_TOTAL_OPS);
    });

    it("section schemaVersion is 1 across all loaded files", () => {
      const idx = SURFCAMFunctionIndexEngine.getIndex();
      for (const section of Object.values(idx.sections)) {
        expect(section.schemaVersion).toBe(1);
      }
    });
  });

  describe("listSections", () => {
    it("lists all four section keys", () => {
      expect(SURFCAMFunctionIndexEngine.listSections().sort()).toEqual(
        [...EXPECTED_SECTIONS].sort()
      );
    });
  });

  describe("getSection", () => {
    it("returns truemill section with all 3 flagship operations", () => {
      const s = SURFCAMFunctionIndexEngine.getSection("truemill");
      expect("error" in s).toBe(false);
      if ("error" in s) return;
      expect(s.section_key).toBe("truemill");
      expect(Object.keys(s.operations).sort()).toEqual([...TRUEMILL_OP_IDS].sort());
    });

    it("returns milling_2d with all 5 operation ids", () => {
      const s = SURFCAMFunctionIndexEngine.getSection("milling_2d");
      expect("error" in s).toBe(false);
      if ("error" in s) return;
      expect(Object.keys(s.operations).sort()).toEqual([...MILLING_2D_OP_IDS].sort());
    });

    it("returns turning section with 5 lathe operation ids", () => {
      const s = SURFCAMFunctionIndexEngine.getSection("turning");
      expect("error" in s).toBe(false);
      if ("error" in s) return;
      expect(Object.keys(s.operations).sort()).toEqual([...TURNING_OP_IDS].sort());
    });

    it("returns error envelope for unknown section, listing the 4 available", () => {
      const r = SURFCAMFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in r).toBe(true);
      if (!("error" in r)) return;
      expect(r.error).toBe("Section 'does_not_exist' not found");
      expect(r.available.sort()).toEqual([...EXPECTED_SECTIONS].sort());
    });
  });

  describe("listOperations", () => {
    it("flattens to 17 entries with full section/category context", () => {
      const ops = SURFCAMFunctionIndexEngine.listOperations();
      expect(ops.length).toBe(EXPECTED_TOTAL_OPS);
      for (const op of ops) {
        expect(typeof op.operation_id).toBe("string");
        expect(op.operation_id.length).toBeGreaterThan(0);
        expect(typeof op.display_name).toBe("string");
        expect(op.display_name.length).toBeGreaterThan(0);
        expect(EXPECTED_SECTIONS).toContain(op.section);
      }
    });

    it("includes truemill_pocket flagship under truemill section", () => {
      const ops = SURFCAMFunctionIndexEngine.listOperations();
      const tmPocket = ops.find((o) => o.operation_id === "truemill_pocket");
      expect(tmPocket).toEqual({
        operation_id: "truemill_pocket",
        display_name: "TrueMill Pocket",
        section: "truemill",
        category: "truemill_pocket",
      });
    });

    it("includes thread (G76) operation under turning section", () => {
      const ops = SURFCAMFunctionIndexEngine.listOperations();
      const thread = ops.find((o) => o.operation_id === "thread");
      expect(thread).toEqual({
        operation_id: "thread",
        display_name: "Threading",
        section: "turning",
        category: "thread",
      });
    });
  });

  describe("findParameter", () => {
    it("locates 'maxEngagementAngleDeg' across all 3 truemill ops, all required", () => {
      const hits = SURFCAMFunctionIndexEngine.findParameter("maxEngagementAngleDeg");
      expect(hits.length).toBe(TRUEMILL_OP_COUNT);
      for (const h of hits) {
        expect(h.section).toBe("truemill");
        expect(h.parameter.required).toBe(true);
        expect(h.parameter.unit).toBe("deg");
      }
    });

    it("substring 'tolerance' spans at least 2 sections", () => {
      const hits = SURFCAMFunctionIndexEngine.findParameter("tolerance");
      expect(hits.length).toBeGreaterThanOrEqual(6);
      const sections = new Set(hits.map((h) => h.section));
      expect(sections.size).toBeGreaterThanOrEqual(2);
    });

    it("case-insensitive — 'STEPDOWN' returns same hit count as 'stepdown'", () => {
      const upper = SURFCAMFunctionIndexEngine.findParameter("STEPDOWN");
      const lower = SURFCAMFunctionIndexEngine.findParameter("stepdown");
      expect(upper.length).toBe(lower.length);
      expect(upper.length).toBeGreaterThan(0);
    });

    it("missing parameter returns empty array (no throw)", () => {
      expect(SURFCAMFunctionIndexEngine.findParameter("nonexistentParamXyz123")).toEqual([]);
    });

    it("throws on empty string (failure mode: bad input)", () => {
      expect(() => SURFCAMFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/i
      );
    });

    it("throws on non-string input (failure mode: type guard)", () => {
      // @ts-expect-error — runtime guard test
      expect(() => SURFCAMFunctionIndexEngine.findParameter(undefined)).toThrow(
        /non-empty string/i
      );
    });
  });

  describe("searchParameters", () => {
    it("default limit caps results at 20", () => {
      const res = SURFCAMFunctionIndexEngine.searchParameters("e");
      expect(res.length).toBeLessThanOrEqual(SEARCH_DEFAULT_LIMIT);
      expect(res.length).toBeGreaterThan(0);
    });

    it("explicit limit honored", () => {
      const res = SURFCAMFunctionIndexEngine.searchParameters("a", 5);
      expect(res.length).toBeLessThanOrEqual(5);
    });

    it("matches description text — 'CEA' returns at least one description hit", () => {
      const res = SURFCAMFunctionIndexEngine.searchParameters("CEA", 100);
      expect(res.length).toBeGreaterThanOrEqual(1);
      // CEA appears only in TrueMill ops' descriptions
      const tmHits = res.filter((r) => r.section === "truemill");
      expect(tmHits.length).toBe(res.length);
    });

    it("clamps oversized limit (1e9 → 500)", () => {
      const res = SURFCAMFunctionIndexEngine.searchParameters("e", 1_000_000_000);
      expect(res.length).toBeLessThanOrEqual(SEARCH_MAX_LIMIT_CLAMP);
    });

    it("clamps zero limit up to default 20 (Math.floor(0)||20 path)", () => {
      const res = SURFCAMFunctionIndexEngine.searchParameters("e", 0);
      expect(res.length).toBeLessThanOrEqual(SEARCH_DEFAULT_LIMIT);
      expect(res.length).toBeGreaterThanOrEqual(1);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => SURFCAMFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/i
      );
    });

    it("returns empty for special-character query that matches nothing (adversarial)", () => {
      const res = SURFCAMFunctionIndexEngine.searchParameters("!@#$%^xyz_no_match");
      expect(res).toEqual([]);
    });
  });

  describe("getOperationsByCategory", () => {
    it("exact category 'truemill_pocket' returns 1 op", () => {
      const ops = SURFCAMFunctionIndexEngine.getOperationsByCategory("truemill_pocket");
      expect(ops.length).toBe(1);
      expect(ops[0]?.operation_id).toBe("truemill_pocket");
      expect(ops[0]?.section).toBe("truemill");
    });

    it("substring 'truemill' matches all 3 truemill ops", () => {
      const ops = SURFCAMFunctionIndexEngine.getOperationsByCategory("truemill");
      expect(ops.length).toBe(TRUEMILL_OP_COUNT);
      const ids = new Set(ops.map((o) => o.operation_id));
      expect(ids).toEqual(new Set(TRUEMILL_OP_IDS));
    });

    it("substring 'turn_' matches turn_rough + turn_finish", () => {
      const ops = SURFCAMFunctionIndexEngine.getOperationsByCategory("turn_");
      const ids = new Set(ops.map((o) => o.operation_id));
      expect(ids).toEqual(new Set(["turn_rough", "turn_finish"]));
    });

    it("unknown category returns empty array (no throw)", () => {
      expect(
        SURFCAMFunctionIndexEngine.getOperationsByCategory("invalidCategoryXyz")
      ).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() => SURFCAMFunctionIndexEngine.getOperationsByCategory("")).toThrow(
        /non-empty string/i
      );
    });
  });

  describe("getSummary", () => {
    it("returns aggregate stats matching index totals", () => {
      const s = SURFCAMFunctionIndexEngine.getSummary();
      const idx = SURFCAMFunctionIndexEngine.getIndex();
      expect(s.system_id).toBe("surfcam");
      expect(s.total_sections).toBe(EXPECTED_SECTIONS.length);
      expect(s.total_operations).toBe(idx.total_operations);
      expect(s.total_parameters).toBe(idx.total_parameters);
    });

    it("per-section operation counts sum to total", () => {
      const s = SURFCAMFunctionIndexEngine.getSummary();
      const sum = s.sections.reduce((acc, x) => acc + x.operations, 0);
      expect(sum).toBe(s.total_operations);
    });

    it("each section in summary has key + non-zero ops", () => {
      const s = SURFCAMFunctionIndexEngine.getSummary();
      expect(s.sections.length).toBe(EXPECTED_SECTIONS.length);
      for (const sec of s.sections) {
        expect(EXPECTED_SECTIONS).toContain(sec.key);
        expect(sec.operations).toBeGreaterThan(0);
      }
    });
  });

  describe("getTrueMillOperations (flagship helper)", () => {
    it("returns exactly the 3 TrueMill operation ids", () => {
      const ops = SURFCAMFunctionIndexEngine.getTrueMillOperations();
      expect(ops.length).toBe(TRUEMILL_OP_COUNT);
      expect(new Set(ops.map((o) => o.operation_id))).toEqual(new Set(TRUEMILL_OP_IDS));
    });

    it("every TrueMill op is tagged section='truemill' and category='truemill_*'", () => {
      const ops = SURFCAMFunctionIndexEngine.getTrueMillOperations();
      for (const op of ops) {
        expect(op.section).toBe("truemill");
        expect(op.category.startsWith("truemill_")).toBe(true);
      }
    });
  });

  describe("getOperation", () => {
    it("looks up truemill_pocket and returns full operation payload", () => {
      const r = SURFCAMFunctionIndexEngine.getOperation("truemill_pocket");
      expect("error" in r).toBe(false);
      if ("error" in r) return;
      expect(r.section).toBe("truemill");
      expect(r.operation.display_name).toBe("TrueMill Pocket");
      expect(r.operation.category).toBe("truemill_pocket");
      expect(r.operation.parameters.engagement?.maxEngagementAngleDeg?.required).toBe(true);
    });

    it("looks up turn_rough under turning with G71 cycleType default", () => {
      const r = SURFCAMFunctionIndexEngine.getOperation("turn_rough");
      expect("error" in r).toBe(false);
      if ("error" in r) return;
      expect(r.section).toBe("turning");
      expect(r.operation.parameters.cycle?.cycleType?.default).toBe("G71_longitudinal");
    });

    it("returns error envelope for missing operation (failure mode)", () => {
      const r = SURFCAMFunctionIndexEngine.getOperation("ghostOpId");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toBe("Operation 'ghostOpId' not found");
      }
    });

    it("throws on empty operationId (failure mode)", () => {
      expect(() => SURFCAMFunctionIndexEngine.getOperation("")).toThrow(
        /non-empty string/i
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns truemill training topics including CEA theory entry", () => {
      const topics = SURFCAMFunctionIndexEngine.getTrainingTopics("truemill");
      expect(topics.length).toBeGreaterThanOrEqual(1);
      const ceaTopic = topics.find((t) => t.topic.includes("CEA"));
      expect(ceaTopic === undefined).toBe(false);
      expect(ceaTopic?.best_practices.length).toBeGreaterThan(0);
      expect(ceaTopic?.key_concepts.length).toBeGreaterThan(0);
    });

    it("returns empty array for missing section (graceful)", () => {
      expect(SURFCAMFunctionIndexEngine.getTrainingTopics("notASection")).toEqual([]);
    });
  });
});
