// lathe-closed-loop-coverage.integration.test.ts — CLOSED-LOOP-MS0/U-CL6
//
// "Training for every possibility to generate a lathe part" proof: drive the REAL production
// chain end-to-end across EVERY toolpath category and assert each generated program is PROPER
// (lint-clean) and PASSES the closed-loop test. Zero fixtures — the engine itself supplies the
// templates, so the field-name seam (cannedCycle / cssMode) is exercised for real:
//   buildAllTemplates() [U-CL2] -> emitFromTemplate() [U-CL5] -> assessProgram()/closedLoopTest() [U-CL4]
// A NEGATIVE CONTROL (G96 with no G50 cap) must still FAIL so an all-PASS result is not vacuous.
import { describe, test, expect } from "vitest";
import { LatheToolpathTemplateEngine } from "../engines/LatheToolpathTemplateEngine.js";
// Offline .mjs substrate (no MCP/dist dep). Path: src/__tests__ -> src -> mcp-server -> root -> scripts.
import { emitFromTemplate } from "../../../scripts/lib/lathe-template-emitter.mjs";
import { assessProgram } from "../../../scripts/lathe-program-assessor.mjs";
import { closedLoopTest } from "../../../scripts/lathe-closed-loop-test.mjs";

const CTX = { controller: "okuma" };
const TOOLS_ON_HAND = {
  insert: { count: 212 }, "carbide-blank": { count: 5372 },
  drill: { count: 149 }, "thread-insert": { count: 88 }, "groove-insert": { count: 64 },
  "boring-bar": { count: 41 },
};

describe("CLOSED-LOOP coverage — every toolpath type generates a PROPER program (U-CL6)", () => {
  const templates = LatheToolpathTemplateEngine.buildAllTemplates({ iso_group: "P" });
  const categories = LatheToolpathTemplateEngine.listCategories();

  test("the engine produces a non-trivial template library spanning every category", () => {
    expect(templates.length).toBeGreaterThanOrEqual(8);
    const covered = new Set(templates.map((t) => t.category));
    for (const cat of categories) expect(covered.has(cat)).toBe(true);
  });

  for (const cat of categories) {
    test(`category "${cat}": real template -> emit -> assessProgram is PROPER (no ERROR gotchas)`, () => {
      const tpl = templates.find((t) => t.category === cat);
      if (!tpl) throw new Error(`engine produced no template for category ${cat}`);
      // the engine must hand the emitter the exact field shape it reads (the seam under test):
      expect(tpl.cannedCycle).toMatch(/^G\d\d$/);
      expect(["G96", "G97"]).toContain(tpl.cssMode);

      const program = emitFromTemplate(tpl, { maxRpm: 3000, rpm: 800 });
      const a = assessProgram(program, CTX);
      expect.soft(a.errorCount, `category ${cat} emitted ERROR gotchas: ${a.ruleSet.join(", ")}`).toBe(0);
      expect(a.proper).toBe(true);
      // the two defects the assessment found endemic in the existing JM "enhanced" programs
      // must never appear in a PRISM-generated program:
      expect(a.ruleSet).not.toContain("css-no-rpm-cap");
      expect(a.ruleSet).not.toContain("feed-mode-undeclared");
      // CSS regime must match the template's declared mode (threading/drilling = constant RPM):
      if (tpl.cssMode === "G97") {
        expect(program).toContain("G97");
        expect(program).not.toContain("G96");
      } else {
        expect(program).toContain("G96");
        expect(program).toContain("G50"); // CSS must carry a spindle overspeed cap
      }
    });
  }

  test("ALL templates emit PROPER — full library, not just one per category", () => {
    const failures = templates
      .map((t) => ({ id: t.strategyId, cat: t.category, a: assessProgram(emitFromTemplate(t), CTX) }))
      .filter((r) => !r.a.proper)
      .map((r) => `${r.cat}/${r.id}: ${r.a.ruleSet.join(",")}`);
    expect(failures, `non-proper emitted programs:\n${failures.join("\n")}`).toEqual([]);
  });

  test("with tools on hand, every category PASSES the full closed-loop test", () => {
    for (const cat of categories) {
      const tpl = templates.find((t) => t.category === cat)!;
      const program = emitFromTemplate(tpl, { maxRpm: 3000, rpm: 800 });
      const r = closedLoopTest({ programText: program, ctx: CTX, purchaseByType: TOOLS_ON_HAND });
      expect(r.verdict, `${cat} verdict=${r.verdict} reasons=${r.reasons.join("; ")}`).toBe("PASS");
    }
  });

  test("NEGATIVE CONTROL: a G96 program with no G50 cap FAILs — the harness can fail (not vacuous)", () => {
    const broken = "G95\nG96 S200 M03\nG71 P1 Q2 U0.5 W0.1 D2000 F0.3\nG00 X5.0\nM30\n";
    const r = closedLoopTest({ programText: broken, ctx: CTX, purchaseByType: TOOLS_ON_HAND });
    expect(r.proper).toBe(false);
    expect(r.verdict).toBe("FAIL");
    expect(r.assessment.ruleSet).toContain("css-no-rpm-cap");
  });
});
