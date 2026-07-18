import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  TITLE_TO_TOOLTYPE,
  extractInserts,
  extractParamRanges,
  extractGMCodes,
  extractHeuristicRules,
  extractTitleBodyPairs,
  extractModuleTitleMap,
  buildPriorsForCourse,
  buildPriorBundle,
} from "../lathe-academy-priors.mjs";

const here = import.meta.dirname;
const repoRoot = resolve(here, "..", "..", "..");
const course5Path = resolve(repoRoot, "mcp-server/src/data/academy/course-5-turning-operations.ts");
const course5Src = readFileSync(course5Path, "utf8");

describe("extractInserts", () => {
  it("extracts known ISO insert codes", () => {
    const body = "**CNMG** and **WNMG** and **SNMG** inserts.";
    assert.deepEqual(extractInserts(body), ["CNMG", "WNMG", "SNMG"]);
  });

  it("dedupes repeated mentions", () => {
    assert.deepEqual(extractInserts("**CNMG** twice **CNMG**."), ["CNMG"]);
  });

  it("returns empty array for non-string input", () => {
    assert.deepEqual(extractInserts(null), []);
    assert.deepEqual(extractInserts(undefined), []);
    assert.deepEqual(extractInserts(42), []);
  });
});

describe("extractGMCodes", () => {
  it("recognizes lathe-canned cycles", () => {
    const { g_codes, m_codes } = extractGMCodes("Run G71 then G96 with G50 and M03.");
    assert.ok(g_codes.includes("G71"));
    assert.ok(g_codes.includes("G96"));
    assert.ok(g_codes.includes("G50"));
    assert.ok(m_codes.includes("M03"));
  });

  it("ignores single-digit G codes", () => {
    assert.equal(extractGMCodes("G0 G1 G2 G3 only.").g_codes.length, 0);
  });
});

describe("extractTitleBodyPairs (real course-5 source)", () => {
  it("recovers at least 5 lesson pairs with expected titles", () => {
    const pairs = extractTitleBodyPairs(course5Src);
    assert.ok(pairs.length >= 5);
    const titles = pairs.map(p => p.title);
    assert.ok(titles.includes("OD Roughing"));
    assert.ok(titles.includes("OD Finishing"));
    assert.ok(titles.includes("Facing"));
  });
});

describe("extractModuleTitleMap (real course-5 source)", () => {
  it("recovers the module index map from mk() calls", () => {
    const map = extractModuleTitleMap(course5Src);
    assert.equal(map[1], "OD Roughing");
    assert.equal(map[2], "OD Finishing");
    assert.equal(map[6], "Boring");
  });
});

describe("buildPriorsForCourse (real course-5 data)", () => {
  it("produces priors for known turning ToolTypes", () => {
    const priors = buildPriorsForCourse("course-5", course5Src);
    assert.ok(priors.length >= 6);
    const toolTypes = new Set(priors.map(p => p.tool_type));
    assert.ok(toolTypes.has("od_rough"));
    assert.ok(toolTypes.has("od_finish"));
    assert.ok(toolTypes.has("face"));
  });

  it("the od_rough prior carries real insert and gcode data", () => {
    const priors = buildPriorsForCourse("course-5", course5Src);
    const odRough = priors.find(p => p.tool_type === "od_rough");
    assert.ok(odRough);
    assert.ok(odRough.inserts.length >= 3);
    assert.ok(odRough.inserts.includes("CNMG"));
    assert.ok(odRough.canned_cycles.includes("G71"));
    assert.equal(odRough.physics_basis, "academy/course-5/mod-1: OD Roughing");
  });

  it("the od_finish prior carries G96 surface-speed reference", () => {
    const priors = buildPriorsForCourse("course-5", course5Src);
    const odFinish = priors.find(p => p.tool_type === "od_finish");
    assert.ok(odFinish);
    assert.ok(odFinish.canned_cycles.includes("G96"));
  });

  it("returns empty array for empty inputs", () => {
    assert.deepEqual(buildPriorsForCourse("", "any"), []);
    assert.deepEqual(buildPriorsForCourse("course-x", ""), []);
    assert.deepEqual(buildPriorsForCourse(null, null), []);
  });
});

describe("buildPriorBundle (real multi-course)", () => {
  it("aggregates priors with schemaVersion tag", () => {
    const bundle = buildPriorBundle([
      { courseId: "course-5", sourceText: course5Src },
    ], "2026-05-26T00:00:00Z");
    assert.equal(bundle.schemaVersion, "1.0.0");
    assert.equal(bundle.generated_at, "2026-05-26T00:00:00Z");
    assert.deepEqual(bundle.source_courses, ["course-5"]);
    assert.ok(bundle.priors.length >= 6);
  });

  it("skips courses that produce zero priors", () => {
    const bundle = buildPriorBundle([
      { courseId: "course-empty", sourceText: "nothing here" },
      { courseId: "course-5", sourceText: course5Src },
    ]);
    assert.deepEqual(bundle.source_courses, ["course-5"]);
  });
});

describe("TITLE_TO_TOOLTYPE sanity", () => {
  it("maps to valid ToolType values", () => {
    const validToolTypes = new Set([
      "od_rough", "od_finish", "od_groove", "od_thread",
      "id_rough", "id_finish", "id_groove", "id_thread",
      "face", "center_drill", "drill", "boring_bar",
      "cutoff", "parting", "unknown", "cross_cutting",
    ]);
    for (const toolType of Object.values(TITLE_TO_TOOLTYPE)) {
      assert.ok(validToolTypes.has(toolType));
    }
  });
});

describe("extractParamRanges and extractHeuristicRules", () => {
  it("returns objects for valid text input", () => {
    assert.equal(typeof extractParamRanges("some text"), "object");
    assert.ok(Array.isArray(extractHeuristicRules("some text")));
  });
});
