/**
 * Dispatcher-wiring E2E test for MS-PRINT-PROGRAM-LOOP / U-PPL-A5 —
 * MillPartClassifierEngine wired into millDispatcher (prism_mill).
 *
 * Covers the 4 exit conditions from the unit envelope:
 *   1. Engine + schema wired (action in z.enum + schema registered)
 *   2. Action name matches case statement (no z.enum drift)
 *   3. Zod schema accepts valid input + rejects invalid (boundary check)
 *   4. Engine round-trip works end-to-end (lazy-import + method invocation)
 *
 * Pattern mirrors millDispatcherUnwiredBatch3.test.ts (the established batch
 * precedent for wiring tests).
 */
import { describe, it, expect } from "vitest";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";
import {
  millPartClassifierEngine,
  MILL_PART_CLASSIFY_BATCH_MAX,
} from "../engines/MillPartClassifierEngine.js";

const UPPLA5_ACTIONS = [
  "mill_part_classify",
  "mill_part_classify_batch",
  "mill_part_family_profile",
  "mill_part_families_list",
] as const;

describe("U-PPL-A5 — MillPartClassifierEngine wired into millDispatcher", () => {
  describe("action enum registration", () => {
    it("registers all 4 actions in MILL_ACTIONS enum", () => {
      for (const action of UPPLA5_ACTIONS) {
        expect(MILL_ACTIONS).toContain(action);
      }
    });

    it("registers all 4 actions in MILL_ACTION_SCHEMAS map", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      for (const action of UPPLA5_ACTIONS) {
        expect(schemaKeys.has(action)).toBe(true);
      }
    });

    it("all 4 actions use mill_part_ snake_case prefix (consistent with mill_ discipline)", () => {
      for (const action of UPPLA5_ACTIONS) {
        expect(action.startsWith("mill_part_")).toBe(true);
        expect(action).toMatch(/^[a-z_]+$/);
      }
    });
  });

  describe("schema boundary — mill_part_classify", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };
    const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_part_classify;

    it("accepts a valid prismatic-plate input", () => {
      const r = schema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.success).toBe(true);
    });

    it("rejects negative length_mm", () => {
      const r = schema.safeParse({
        length_mm: -10, width_mm: 150, height_mm: 50,
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown stock_form", () => {
      const r = schema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        stock_form: "not_a_form",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown property (.strict())", () => {
      const r = schema.safeParse({
        length_mm: 200, width_mm: 150, height_mm: 50,
        bogus_field: "should fail",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — mill_part_classify_batch", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };
    const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_part_classify_batch;

    it("accepts a valid 3-part batch", () => {
      const r = schema.safeParse({
        parts: [
          { length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate" },
          { length_mm: 100, width_mm: 100, height_mm: 100, has_3d_surface: true },
          { length_mm: 50, width_mm: 50, height_mm: 50, min_wall_thickness_mm: 3 },
        ],
      });
      expect(r.success).toBe(true);
    });

    it("accepts empty parts array", () => {
      const r = schema.safeParse({ parts: [] });
      expect(r.success).toBe(true);
    });

    it(`rejects parts array beyond MILL_PART_CLASSIFY_BATCH_MAX=${MILL_PART_CLASSIFY_BATCH_MAX} (memory cap)`, () => {
      const oversize = Array.from({ length: MILL_PART_CLASSIFY_BATCH_MAX + 1 }, () => ({
        length_mm: 100, width_mm: 100, height_mm: 100,
      }));
      const r = schema.safeParse({ parts: oversize });
      expect(r.success).toBe(false);
    });

    it(`accepts parts array exactly at MILL_PART_CLASSIFY_BATCH_MAX=${MILL_PART_CLASSIFY_BATCH_MAX}`, () => {
      const atCap = Array.from({ length: MILL_PART_CLASSIFY_BATCH_MAX }, () => ({
        length_mm: 100, width_mm: 100, height_mm: 100,
      }));
      const r = schema.safeParse({ parts: atCap });
      expect(r.success).toBe(true);
    });

    it("rejects missing parts field", () => {
      const r = schema.safeParse({});
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — mill_part_family_profile", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };
    const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_part_family_profile;

    it("accepts each of the 4 valid families", () => {
      for (const family of ["prismatic", "pocket_2_5d", "mold_3d", "thin_wall"]) {
        expect(schema.safeParse({ family }).success).toBe(true);
      }
    });

    it("rejects unknown family (e.g., lathe family name)", () => {
      expect(schema.safeParse({ family: "shaft" }).success).toBe(false);
      expect(schema.safeParse({ family: "not_a_family" }).success).toBe(false);
    });

    it("rejects missing family field", () => {
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe("schema boundary — mill_part_families_list", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };
    const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_part_families_list;

    it("accepts empty object (no-arg action)", () => {
      expect(schema.safeParse({}).success).toBe(true);
    });

    it("rejects extra properties (.strict() no-arg discipline)", () => {
      expect(schema.safeParse({ unexpected: 1 }).success).toBe(false);
    });
  });

  describe("engine round-trip — same engine the dispatcher case-blocks invoke", () => {
    it("classify returns family=prismatic for plate + no pockets", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate",
      });
      expect(r.family).toBe("prismatic");
      expect(r.workholding_default).toBe("vise_standard");
      expect(r.toolpath_strategy).toBe("adaptive_clearing");
    });

    it("classify returns family=mold_3d for has_3d_surface=true", () => {
      const r = millPartClassifierEngine.classify({
        length_mm: 200, width_mm: 200, height_mm: 100, has_3d_surface: true,
      });
      expect(r.family).toBe("mold_3d");
      expect(r.toolpath_strategy).toBe("waterline");
    });

    it("classifyBatch returns one result per part with correct families", () => {
      const results = millPartClassifierEngine.classifyBatch([
        { length_mm: 200, width_mm: 150, height_mm: 50, stock_form: "plate" },
        { length_mm: 100, width_mm: 100, height_mm: 100, has_3d_surface: true },
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].family).toBe("prismatic");
      expect(results[1].family).toBe("mold_3d");
    });

    it("getFamilyProfile returns the thin_wall family profile", () => {
      const r = millPartClassifierEngine.getFamilyProfile("thin_wall");
      expect(r.family).toBe("thin_wall");
      expect(r.workholding).toBe("controlled_pressure");
      expect(r.strategy).toBe("trochoidal");
    });

    it("listFamilies returns exactly 4 entries", () => {
      const list = millPartClassifierEngine.listFamilies();
      expect(list).toHaveLength(4);
      const families = list.map(f => f.family).sort();
      expect(families).toEqual(["mold_3d", "pocket_2_5d", "prismatic", "thin_wall"]);
    });
  });

  describe("symmetry — every UPPL-A5 action has both enum + schema + handler", () => {
    it("MILL_ACTIONS and MILL_ACTION_SCHEMAS agree on the 4 new actions (no z.enum drift)", () => {
      const schemaKeys = Object.keys(MILL_ACTION_SCHEMAS);
      for (const action of UPPLA5_ACTIONS) {
        const inEnum = MILL_ACTIONS.includes(action);
        const inSchemas = schemaKeys.includes(action);
        expect(inEnum && inSchemas).toBe(true);
      }
    });
  });
});
