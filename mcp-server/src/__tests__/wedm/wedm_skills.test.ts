/**
 * WEDM Skills Test Suite - Phase 0.17
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SKILLS_DIR = path.join(os.homedir(), ".claude", "commands");

const EXPECTED_SKILLS = [
  "wedm-studio",
  "wedm-learn",
  "wedm-compare",
  "wedm-report",
  "wedm-program",
  "wedm-feasibility",
  "wedm-troubleshoot",
  "wedm-cost",
  "wedm-batch",
  "wedm-jm-die",
  "wedm-ai-advisor",
  "wedm-controller",
];

describe("WEDM Skills", () => {
  it("SKILLS_DIR exists", () => {
    expect(fs.existsSync(SKILLS_DIR)).toBe(true);
  });

  for (const skillName of EXPECTED_SKILLS) {
    describe(skillName, () => {
      const skillPath = path.join(SKILLS_DIR, skillName + ".md");

      it("exists as .md file", () => {
        expect(fs.existsSync(skillPath)).toBe(true);
      });

      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, "utf-8");
        it("has YAML frontmatter", () => {
          expect(content.startsWith("---")).toBe(true);
        });
        it("has non-empty content", () => {
          expect(content.length).toBeGreaterThan(200);
        });
      }
    });
  }

  it("total count is 12", () => {
    const count = EXPECTED_SKILLS.filter((s) =>
      fs.existsSync(path.join(SKILLS_DIR, s + ".md"))
    ).length;
    expect(count).toBe(12);
  });
});
