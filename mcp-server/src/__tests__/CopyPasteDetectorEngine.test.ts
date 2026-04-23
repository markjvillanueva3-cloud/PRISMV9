import { describe, it, expect } from "vitest";
import {
  CopyPasteDetectorEngine,
  copyPasteDetectorEngine,
} from "../engines/CopyPasteDetectorEngine.js";

describe("CopyPasteDetectorEngine", () => {
  it("singleton instantiated", () => {
    expect(copyPasteDetectorEngine).toBeInstanceOf(CopyPasteDetectorEngine);
    expect(copyPasteDetectorEngine.name).toBe("CopyPasteDetectorEngine");
  });

  it("short idiomatic code is accepted", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({ code: `export function add(a: number, b: number): number {\n  return a + b;\n}\n` });
    expect(v.recommendation).toBe("accept");
    expect(v.suspicious).toBe(false);
  });

  it("template tokens trigger high score + reject", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({ code: "const x = {{USER_VALUE}};\nconst y = <placeholder>;" });
    expect(v.suspicious).toBe(true);
    expect(v.score).toBeGreaterThanOrEqual(0.3);
    expect(v.indicators).toContain("template_tokens_present");
  });

  it("placeholder identifiers flagged", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({ code: "const foo = 1; const bar = foo + 1; console.info(bar);" });
    expect(v.indicators).toContain("placeholder_identifier");
  });

  it("mixed ESM + CJS flagged", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({
      code: `import fs from 'node:fs';\nconst path = require('node:path');\nconsole.info(fs, path);`,
    });
    expect(v.indicators).toContain("mixed_import_styles");
  });

  it("CJS in declared ESM repo flagged", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({
      code: `const x = require('./x');`,
      repoImportStyle: "esm",
    });
    expect(v.indicators).toContain("cjs_in_esm_repo");
  });

  it("extremely commented code flagged", () => {
    const e = new CopyPasteDetectorEngine();
    const heavy = `// This function does a thing\n// It is important\n// Be careful here\nexport function x() { return 1; }`;
    const v = e.detect({ code: heavy });
    expect(v.indicators.some((i) => i.startsWith("high_comment_density"))).toBe(true);
  });

  it("recommendation tiers: accept/review/reject", () => {
    const e = new CopyPasteDetectorEngine();
    const accept = e.detect({ code: "export const x = 1;\n" }).recommendation;
    const review = e.detect({ code: "const foo = 1;\nconst bar = {{VAR}};\n" }).recommendation;
    const reject = e.detect({ code: "const x = {{A}};\nconst y = <placeholder>;\nconst foo = require('x');\nimport z from 'a';" }).recommendation;
    expect(accept).toBe("accept");
    expect(["review", "reject"]).toContain(review);
    expect(reject).toBe("reject");
  });

  it("score is clamped to [0,1]", () => {
    const e = new CopyPasteDetectorEngine();
    const kitchen = `import x from 'a';\nconst y = require('b');\nconst foo = {{T}};\n<placeholder>\n// very long comment line\n// another one\n// another\n// more\n// more`;
    const v = e.detect({ code: kitchen });
    expect(v.score).toBeLessThanOrEqual(1);
    expect(v.score).toBeGreaterThanOrEqual(0);
  });

  it("FAIL: missing code throws", () => {
    const e = new CopyPasteDetectorEngine();
    expect(() => e.detect({} as unknown as { code: string })).toThrow(/code required/);
  });

  it("FAIL: non-string code throws", () => {
    const e = new CopyPasteDetectorEngine();
    expect(() => e.detect({ code: 12 as unknown as string })).toThrow(/code required/);
  });

  it("ADV: empty code returns accept", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({ code: "" });
    expect(v.recommendation).toBe("accept");
    expect(v.score).toBe(0);
  });

  it("ADV: very large code doesn't crash", () => {
    const e = new CopyPasteDetectorEngine();
    const big = "export const x = 1;\n".repeat(10_000);
    const v = e.detect({ code: big });
    expect(v.score).toBeLessThanOrEqual(1);
  });

  it("summary string communicates tier", () => {
    const e = new CopyPasteDetectorEngine();
    const v = e.detect({ code: "const x = {{A}};" });
    expect(v.summary.length).toBeGreaterThan(0);
  });
});
