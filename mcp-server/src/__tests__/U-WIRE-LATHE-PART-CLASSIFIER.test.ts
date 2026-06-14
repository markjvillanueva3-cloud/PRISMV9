/**
 * U-WIRE-LATHE-PART-CLASSIFIER — wiring-gate test
 * =================================================
 *
 * Verifies the 4 new dispatcher actions for `LathePartClassifierEngine`:
 *   - lathe_part_classify        → classify(input)
 *   - lathe_part_classify_batch  → classifyBatch(parts[])
 *   - lathe_part_family_profile  → getFamilyProfile(family)
 *   - lathe_part_family_list     → listFamilies()
 *
 * @module __tests__/U-WIRE-LATHE-PART-CLASSIFIER
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  lathePartClassifierEngine,
  type PartGeometryInput,
  type ClassificationResult,
} from "../engines/LathePartClassifierEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

// Long slender part → "shaft" family.
const SHAFT_INPUT: PartGeometryInput = {
  length_mm: 200,
  max_od_mm: 25,
  min_od_mm: 18,
  od_step_count: 3,
  stock_form: "bar",
  iso_group: "P",
};

// Short fat hollow → "disc" / "flange" family.
const DISC_INPUT: PartGeometryInput = {
  length_mm: 10,
  max_od_mm: 100,
  bore_id_mm: 20,
  has_bolt_circle: true,
  stock_form: "bar",
};

describe("U-WIRE-LATHE-PART-CLASSIFIER — turning-dispatcher wiring", () => {
  it("registers all 4 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ["lathe_part_classify", "lathe_part_classify_batch", "lathe_part_family_profile", "lathe_part_family_list"]) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("lathe_part_classify accepts canonical shaft input", () => {
    expect(SCHEMA_MAP["lathe_part_classify"]!.safeParse(SHAFT_INPUT).success).toBe(true);
  });

  it("lathe_part_classify rejects zero / negative length_mm and max_od_mm", () => {
    expect(SCHEMA_MAP["lathe_part_classify"]!.safeParse({ ...SHAFT_INPUT, length_mm: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_part_classify"]!.safeParse({ ...SHAFT_INPUT, max_od_mm: -1 }).success).toBe(false);
  });

  it("lathe_part_classify rejects unknown stock_form", () => {
    const bad = { ...SHAFT_INPUT, stock_form: "powder_bed" as unknown as PartGeometryInput["stock_form"] };
    expect(SCHEMA_MAP["lathe_part_classify"]!.safeParse(bad).success).toBe(false);
  });

  it("lathe_part_classify_batch requires non-empty parts array", () => {
    expect(SCHEMA_MAP["lathe_part_classify_batch"]!.safeParse({ parts: [SHAFT_INPUT, DISC_INPUT] }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_part_classify_batch"]!.safeParse({ parts: [] }).success).toBe(false);
  });

  it("lathe_part_family_profile requires family from the 15-enum set", () => {
    expect(SCHEMA_MAP["lathe_part_family_profile"]!.safeParse({ family: "shaft" }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_part_family_profile"]!.safeParse({ family: "octahedron" }).success).toBe(false);
  });

  it("lathe_part_family_list accepts empty input", () => {
    expect(SCHEMA_MAP["lathe_part_family_list"]!.safeParse({}).success).toBe(true);
  });

  // Dispatcher source surface — all 4 actions must have BOTH the enum entry and the case label.
  it("dispatcher source contains all 4 actions in enum AND case form", () => {
    for (const a of ["lathe_part_classify", "lathe_part_classify_batch", "lathe_part_family_profile", "lathe_part_family_list"]) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  function caseBlock(action: string): string {
    const startIdx = DISPATCHER_SRC.indexOf(`case "${action}":`);
    if (startIdx < 0) throw new Error(`${action} case missing`);
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${action}":`.length);
    return DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
  }

  it("classify case routes to .classify (negative-guards classifyBatch/getFamilyProfile/listFamilies)", () => {
    const block = caseBlock("lathe_part_classify");
    expect(block.includes("lathePartClassifierEngine.classify(")).toBe(true);
    if (block.includes("lathePartClassifierEngine.classifyBatch(") || block.includes("lathePartClassifierEngine.getFamilyProfile(") || block.includes("lathePartClassifierEngine.listFamilies(")) {
      throw new Error("classify case wired to a sibling method");
    }
  });

  it("classify_batch case routes to .classifyBatch (negative-guards classify/getFamilyProfile/listFamilies)", () => {
    const block = caseBlock("lathe_part_classify_batch");
    expect(block.includes("lathePartClassifierEngine.classifyBatch(")).toBe(true);
    if (block.includes("lathePartClassifierEngine.getFamilyProfile(") || block.includes("lathePartClassifierEngine.listFamilies(")) {
      throw new Error("classify_batch case wired to wrong sibling");
    }
  });

  it("family_profile case routes to .getFamilyProfile (negative-guards classify/classifyBatch/listFamilies)", () => {
    const block = caseBlock("lathe_part_family_profile");
    expect(block.includes("lathePartClassifierEngine.getFamilyProfile(")).toBe(true);
    if (block.includes("lathePartClassifierEngine.classifyBatch(") || block.includes("lathePartClassifierEngine.listFamilies(")) {
      throw new Error("family_profile case wired to wrong sibling");
    }
  });

  it("family_list case routes to .listFamilies (negative-guards classify/classifyBatch/getFamilyProfile)", () => {
    const block = caseBlock("lathe_part_family_list");
    expect(block.includes("lathePartClassifierEngine.listFamilies(")).toBe(true);
    if (block.includes("lathePartClassifierEngine.classifyBatch(") || block.includes("lathePartClassifierEngine.getFamilyProfile(")) {
      throw new Error("family_list case wired to wrong sibling");
    }
  });
});

describe("U-WIRE-LATHE-PART-CLASSIFIER — engine semantic round-trip", () => {
  it("shaft input (L/D > 3) classifies as 'shaft' family", () => {
    const r: ClassificationResult = lathePartClassifierEngine.classify(SHAFT_INPUT);
    expect(r.family).toBe("shaft");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.sequence_template.length).toBeGreaterThan(0);
  });

  it("disc input (L/D < 0.3) does NOT classify as 'shaft' (negative oracle)", () => {
    const r = lathePartClassifierEngine.classify(DISC_INPUT);
    expect(r.family).not.toBe("shaft");
  });

  it("listFamilies returns all 15 family entries with workholding + roughing fields", () => {
    const list = lathePartClassifierEngine.listFamilies();
    expect(list.length).toBe(15);
    for (const f of list) {
      expect(typeof f.family).toBe("string");
      expect(typeof f.workholding).toBe("string");
      expect(typeof f.roughing).toBe("string");
    }
  });

  it("classifyBatch returns one ClassificationResult per input part (definitional invariant)", () => {
    const r = lathePartClassifierEngine.classifyBatch([SHAFT_INPUT, DISC_INPUT, SHAFT_INPUT]);
    expect(r.length).toBe(3);
    expect(r[0]!.family).toBe("shaft");
    expect(r[2]!.family).toBe("shaft");
  });

  it("getFamilyProfile('shaft') returns FamilyProfile fields (workholding + roughing + sequence + thermal)", () => {
    const p = lathePartClassifierEngine.getFamilyProfile("shaft");
    expect(p.family).toBe("shaft");
    // FamilyProfile shape per engine line 106-113 — NOT the ClassificationResult shape.
    expect(typeof p.workholding).toBe("string");
    expect(typeof p.workholding_reason).toBe("string");
    expect(typeof p.roughing).toBe("string");
    expect(typeof p.roughing_reason).toBe("string");
    expect(Array.isArray(p.sequence)).toBe(true);
    expect(p.sequence.length).toBeGreaterThan(0);
    expect(typeof p.thermal).toBe("string");
  });
});
