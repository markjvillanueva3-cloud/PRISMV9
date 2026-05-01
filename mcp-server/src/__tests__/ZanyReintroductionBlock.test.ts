/**
 * Tests for .claude/hooks/zany-reintroduction-block.mjs (P8-U06).
 *
 * Verifies the hook's pure classification functions: stripCommentsAndStrings,
 * countZAnyInCode, classifyEdit, classifyWrite. Block-decision logic is
 * trivially derived from these (isRegression flag) so unit tests cover the
 * algorithmic core directly.
 */

import { describe, it, expect } from "vitest";
import {
  stripCommentsAndStrings,
  countZAnyInCode,
  classifyEdit,
  classifyWrite,
} from "../../../.claude/hooks/zany-reintroduction-block.mjs";

describe("stripCommentsAndStrings", () => {
  it("returns empty string when given empty input", () => {
    expect(stripCommentsAndStrings("")).toBe("");
  });

  it("returns empty string when given null/undefined", () => {
    expect(stripCommentsAndStrings(null as unknown as string)).toBe("");
    expect(stripCommentsAndStrings(undefined as unknown as string)).toBe("");
  });

  it("strips line comments while preserving newline structure", () => {
    const src = "z.any() // comment z.any()\nz.any()";
    const stripped = stripCommentsAndStrings(src);
    expect(stripped.split("\n").length).toBe(2);
    expect((stripped.split("\n")[0].match(/z\.any\(\)/g) || []).length).toBe(1);
  });

  it("strips block comments", () => {
    const src = "a\n/* z.any() block */ z.any()\nb";
    const stripped = stripCommentsAndStrings(src);
    expect((stripped.split("\n")[1].match(/z\.any\(\)/g) || []).length).toBe(1);
  });

  it("strips z.any() inside double-quoted strings", () => {
    const src = 'const x = "z.any() in string"; z.any()';
    expect((stripCommentsAndStrings(src).match(/z\.any\(\)/g) || []).length).toBe(1);
  });

  it("strips z.any() inside backticks and single quotes", () => {
    const src = "const x = `z.any()`; const y = 'z.any()'; z.any()";
    expect((stripCommentsAndStrings(src).match(/z\.any\(\)/g) || []).length).toBe(1);
  });
});

describe("countZAnyInCode", () => {
  it("returns 0 for clean schemas", () => {
    const src = "import { z } from 'zod'; const a = z.object({ id: z.string() });";
    expect(countZAnyInCode(src)).toBe(0);
  });

  it("counts code-level z.any() occurrences", () => {
    const src =
      "const a = z.object({ x: z.any(), y: z.any().optional() }); const b = z.array(z.any());";
    expect(countZAnyInCode(src)).toBe(3);
  });

  it("ignores z.any() in comments", () => {
    const src = "// example: z.any()\n/* also z.any() */\nconst a = z.string();";
    expect(countZAnyInCode(src)).toBe(0);
  });

  it("ignores z.any() in string literals", () => {
    const src = `const x = "z.any() is unsafe"; const y = 'z.any()';`;
    expect(countZAnyInCode(src)).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(countZAnyInCode("")).toBe(0);
    expect(countZAnyInCode(null as unknown as string)).toBe(0);
    expect(countZAnyInCode(undefined as unknown as string)).toBe(0);
  });
});

describe("classifyEdit", () => {
  it("flags a clean to z.any() addition as regression", () => {
    const r = classifyEdit("z.string()", "z.any()");
    expect(r.before).toBe(0);
    expect(r.after).toBe(1);
    expect(r.delta).toBe(1);
    expect(r.isRegression).toBe(true);
  });

  it("does NOT flag a removal of z.any() (delta < 0)", () => {
    const r = classifyEdit("z.any()", "z.unknown()");
    expect(r.before).toBe(1);
    expect(r.after).toBe(0);
    expect(r.delta).toBe(-1);
    expect(r.isRegression).toBe(false);
  });

  it("does NOT flag a no-op refactor that preserves z.any() count", () => {
    const r = classifyEdit("z.any()", "z.any() // moved");
    expect(r.before).toBe(1);
    expect(r.after).toBe(1);
    expect(r.delta).toBe(0);
    expect(r.isRegression).toBe(false);
  });

  it("flags adding a NEW z.any() even when others persist", () => {
    const r = classifyEdit(
      "x: z.any(),",
      "x: z.any(), y: z.any(),",
    );
    expect(r.before).toBe(1);
    expect(r.after).toBe(2);
    expect(r.delta).toBe(1);
    expect(r.isRegression).toBe(true);
  });

  it("does NOT flag a regression if the added z.any() is in a string/comment", () => {
    const r = classifyEdit(
      "z.string()",
      "z.string() // tracking note: replace z.any() callers",
    );
    expect(r.before).toBe(0);
    expect(r.after).toBe(0);
    expect(r.isRegression).toBe(false);
  });
});

describe("classifyWrite", () => {
  it("flags any z.any() in a Write payload as regression", () => {
    const r = classifyWrite("import { z } from 'zod'; const a = z.object({ x: z.any() });");
    expect(r.before).toBe(0);
    expect(r.after).toBe(1);
    expect(r.delta).toBe(1);
    expect(r.isRegression).toBe(true);
  });

  it("does NOT flag a Write with no z.any()", () => {
    const r = classifyWrite("import { z } from 'zod'; const a = z.object({ x: z.string() });");
    expect(r.after).toBe(0);
    expect(r.isRegression).toBe(false);
  });

  it("does NOT flag z.any() inside comments or strings in a Write", () => {
    const r = classifyWrite(
      "// example showing z.any() is bad\nconst x = 'z.any()'; const a = z.object({});",
    );
    expect(r.after).toBe(0);
    expect(r.isRegression).toBe(false);
  });

  it("counts multiple z.any() correctly", () => {
    const r = classifyWrite("z.any(); z.any(); z.any();");
    expect(r.after).toBe(3);
    expect(r.delta).toBe(3);
    expect(r.isRegression).toBe(true);
  });

  it("returns delta = 0 for empty content", () => {
    const r = classifyWrite("");
    expect(r.before).toBe(0);
    expect(r.after).toBe(0);
    expect(r.delta).toBe(0);
    expect(r.isRegression).toBe(false);
  });
});
