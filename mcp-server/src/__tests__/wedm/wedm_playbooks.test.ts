/**
 * WEDM Playbooks Test Suite - Phase 0.17
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PLAYBOOKS_DIR = path.resolve(process.cwd(), "data/playbooks");

const EXPECTED_PLAYBOOKS = [
  { file: "wedm_drawing_to_program.json", minSteps: 12 },
  { file: "wedm_wire_break_diagnosis.json", minSteps: 6 },
  { file: "wedm_new_material_learning.json", minSteps: 8 },
  { file: "wedm_batch_optimization.json", minSteps: 5 },
  { file: "wedm_quality_gate_review.json", minSteps: 4 },
  { file: "wedm_parameter_tuning.json", minSteps: 7 },
  { file: "wedm_jm_die_customer.json", minSteps: 6 },
  { file: "wedm_continuous_learning.json", minSteps: 5 },
];

describe("WEDM Playbooks", () => {
  it("playbooks directory exists", () => {
    expect(fs.existsSync(PLAYBOOKS_DIR)).toBe(true);
  });

  for (const p of EXPECTED_PLAYBOOKS) {
    describe(p.file, () => {
      const playbookPath = path.join(PLAYBOOKS_DIR, p.file);

      it("exists", () => {
        expect(fs.existsSync(playbookPath)).toBe(true);
      });

      if (fs.existsSync(playbookPath)) {
        const data = JSON.parse(fs.readFileSync(playbookPath, "utf-8"));

        it("parses as valid JSON", () => {
          expect(data).toBeDefined();
        });

        it("has schemaVersion", () => {
          expect(data.schemaVersion).toBe(1);
        });

        it("has id and name", () => {
          expect(data.id).toBeDefined();
          expect(data.name).toBeDefined();
        });

        it("has enough steps", () => {
          expect(data.steps?.length).toBeGreaterThanOrEqual(p.minSteps);
        });
      }
    });
  }

  it("total count is 8", () => {
    const count = EXPECTED_PLAYBOOKS.filter((p) =>
      fs.existsSync(path.join(PLAYBOOKS_DIR, p.file))
    ).length;
    expect(count).toBe(8);
  });
});
