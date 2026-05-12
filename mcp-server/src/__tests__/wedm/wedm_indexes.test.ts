/**
 * WEDM Indexes Test Suite - Phase 0.17
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = path.resolve(process.cwd(), "data/state");

const EXPECTED_INDEXES = [
  "WEDM_ENGINE_USAGE_INDEX.json",
  "WEDM_ACTION_RESOLUTION_INDEX.json",
  "WEDM_SKILL_MANIFEST_INDEX.json",
  "WEDM_TIP_USAGE_INDEX.json",
  "WEDM_PROGRAM_SIMILARITY_INDEX.json",
  "WEDM_CUSTOMER_PATTERN_INDEX.json",
  "WEDM_FORMULA_PROVENANCE_INDEX.json",
  "WEDM_ALIAS_TABLE.json",
];

describe("WEDM Indexes", () => {
  it("state directory exists", () => {
    expect(fs.existsSync(STATE_DIR)).toBe(true);
  });

  for (const indexFile of EXPECTED_INDEXES) {
    describe(indexFile, () => {
      const indexPath = path.join(STATE_DIR, indexFile);

      it("exists", () => {
        expect(fs.existsSync(indexPath)).toBe(true);
      });

      if (fs.existsSync(indexPath)) {
        const data = JSON.parse(fs.readFileSync(indexPath, "utf-8"));

        it("has schemaVersion", () => {
          expect(data.schemaVersion).toBe(1);
        });

        it("has generatedAt timestamp", () => {
          expect(data.generatedAt).toBeDefined();
        });
      }
    });
  }

  it("total count is 8", () => {
    const count = EXPECTED_INDEXES.filter((f) =>
      fs.existsSync(path.join(STATE_DIR, f))
    ).length;
    expect(count).toBe(8);
  });

  describe("Formula provenance has MIT citations", () => {
    const filePath = path.join(STATE_DIR, "WEDM_FORMULA_PROVENANCE_INDEX.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      it("formulasWithMITCitations > 0", () => {
        expect(data.formulasWithMITCitations).toBeGreaterThan(0);
      });

      it("mitCoursesCited has 5 courses", () => {
        expect(data.mitCoursesCited?.length).toBeGreaterThanOrEqual(5);
      });
    }
  });
});
