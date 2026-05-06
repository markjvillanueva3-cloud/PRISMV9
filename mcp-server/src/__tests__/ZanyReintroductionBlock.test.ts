/**
 * ZanyReintroductionBlock — INTEL-OLLAMA-OBSIDIAN-MS0/P8-U06.
 *
 * Pure-function tests for the .claude/hooks/zany-reintroduction-block.mjs
 * PreToolUse hook. The hook gates Write/Edit ops that would add z.any()
 * calls to any file under **\/schemas\/*.ts.
 *
 * Asserts:
 *   1. isSchemaFile recognises **\/schemas/**.ts files (case-insensitive
 *      with cross-platform separator); rejects non-schema paths.
 *   2. countZAnyCalls counts only z.any( occurrences (whitespace-tolerant);
 *      not fooled by z.anyof( or unrelated comments.
 *   3. decideBlock for Write: blocks when newContent contains z.any();
 *      passes for non-schema files / non-Write-Edit tools / no z.any().
 *   4. decideBlock for Edit: net-positive z.any() additions are blocked,
 *      net-zero/negative refactors pass through.
 *   5. parsePreToolUsePayload extracts tool_name + file_path + content/
 *      new_string/old_string from the documented Claude Code hook stdin
 *      shape; null on malformed JSON.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(HERE, "../../../.claude/hooks/zany-reintroduction-block.mjs");

let isSchemaFile: any, countZAnyCalls: any, decideBlock: any, parsePreToolUsePayload: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(HOOK).href);
  isSchemaFile = mod.isSchemaFile;
  countZAnyCalls = mod.countZAnyCalls;
  decideBlock = mod.decideBlock;
  parsePreToolUsePayload = mod.parsePreToolUsePayload;
});

describe("P8-U06 isSchemaFile", () => {
  it("matches files under a schemas/ directory ending in .ts", () => {
    expect(isSchemaFile("mcp-server/src/schemas/calcActionSchemas.ts")).toBe(true);
    expect(isSchemaFile("/abs/path/schemas/foo.ts")).toBe(true);
  });

  it("normalises Windows backslashes", () => {
    expect(isSchemaFile("mcp-server\\src\\schemas\\bar.ts")).toBe(true);
    expect(isSchemaFile("H:\\repo\\src\\schemas\\baz.ts")).toBe(true);
  });

  it("is case-insensitive on extension", () => {
    expect(isSchemaFile("src/schemas/foo.TS")).toBe(true);
  });

  it("rejects non-schemas paths", () => {
    expect(isSchemaFile("src/engines/Foo.ts")).toBe(false);
    expect(isSchemaFile("README.md")).toBe(false);
    expect(isSchemaFile("schemas-helper.ts")).toBe(false);
  });

  it("rejects schemas-named directories that aren't direct parents", () => {
    // schemas/sub/foo.ts — schemas isn't the immediate parent
    expect(isSchemaFile("src/schemas/sub/foo.ts")).toBe(false);
  });

  it("rejects non-.ts files in schemas dir", () => {
    expect(isSchemaFile("src/schemas/foo.js")).toBe(false);
    expect(isSchemaFile("src/schemas/README.md")).toBe(false);
  });

  it("returns false for non-string / empty input", () => {
    expect(isSchemaFile(null)).toBe(false);
    expect(isSchemaFile(undefined)).toBe(false);
    expect(isSchemaFile("")).toBe(false);
    expect(isSchemaFile(42)).toBe(false);
  });
});

describe("P8-U06 countZAnyCalls", () => {
  it("counts simple z.any() calls", () => {
    expect(countZAnyCalls("const x = z.any();")).toBe(1);
    expect(countZAnyCalls("const x = z.any(); const y = z.any();")).toBe(2);
  });

  it("tolerates whitespace between z.any and (", () => {
    expect(countZAnyCalls("z.any (\n  )")).toBe(1);
    expect(countZAnyCalls("z.any\t(  )")).toBe(1);
  });

  it("counts within larger Zod expressions", () => {
    const src = `
      const schema = z.object({
        loose: z.any(),
        list: z.array(z.any()),
        opt: z.any().optional(),
      });
    `;
    expect(countZAnyCalls(src)).toBe(3);
  });

  it("does NOT match z.anyof( or other prefixed tokens", () => {
    expect(countZAnyCalls("z.anyof(['a', 'b'])")).toBe(0);
    expect(countZAnyCalls("Math.any(")).toBe(0); // not prefixed by `z.`
  });

  it("does NOT match comments mentioning z.any without parens", () => {
    expect(countZAnyCalls("// z.any is bad")).toBe(0);
    expect(countZAnyCalls("/* avoid z.any */")).toBe(0);
  });

  it("returns 0 on empty / non-string input", () => {
    expect(countZAnyCalls("")).toBe(0);
    expect(countZAnyCalls(null)).toBe(0);
    expect(countZAnyCalls(undefined)).toBe(0);
    expect(countZAnyCalls(42)).toBe(0);
  });
});

describe("P8-U06 decideBlock — Write tool", () => {
  it("blocks Write of a schemas file when newContent contains z.any()", () => {
    const r = decideBlock({
      toolName: "Write",
      filePath: "mcp-server/src/schemas/foo.ts",
      newContent: "import { z } from 'zod';\nexport const s = z.object({ x: z.any() });",
    });
    expect(r.block).toBe(true);
    expect(r.addedCount).toBe(1);
    expect(r.reason).toContain("z.any");
    expect(r.reason).toContain("foo.ts");
  });

  it("counts multiple z.any() additions", () => {
    const r = decideBlock({
      toolName: "Write",
      filePath: "src/schemas/x.ts",
      newContent: "z.any(); z.any(); z.any();",
    });
    expect(r.block).toBe(true);
    expect(r.addedCount).toBe(3);
  });

  it("passes Write of a schemas file with no z.any()", () => {
    const r = decideBlock({
      toolName: "Write",
      filePath: "src/schemas/clean.ts",
      newContent: "export const s = z.object({ x: z.string() });",
    });
    expect(r.block).toBe(false);
    expect(r.addedCount).toBe(0);
  });

  it("passes Write of a non-schemas file even with z.any()", () => {
    const r = decideBlock({
      toolName: "Write",
      filePath: "src/engines/FooEngine.ts",
      newContent: "const sloppy = z.any();",
    });
    expect(r.block).toBe(false);
  });

  it("passes when toolName is something other than Write/Edit", () => {
    const r = decideBlock({
      toolName: "Bash",
      filePath: "src/schemas/foo.ts",
      newContent: "z.any()",
    });
    expect(r.block).toBe(false);
  });
});

describe("P8-U06 decideBlock — Edit tool", () => {
  it("blocks Edit when new_string adds more z.any() than old_string had", () => {
    const r = decideBlock({
      toolName: "Edit",
      filePath: "src/schemas/x.ts",
      oldContent: "const a = z.string();",
      newContent: "const a = z.any();",
    });
    expect(r.block).toBe(true);
    expect(r.addedCount).toBe(1);
  });

  it("passes Edit when net z.any() count is unchanged (refactor)", () => {
    const r = decideBlock({
      toolName: "Edit",
      filePath: "src/schemas/x.ts",
      oldContent: "z.any()",
      newContent: "z.any()",
    });
    expect(r.block).toBe(false);
    expect(r.addedCount).toBe(0);
  });

  it("passes Edit when z.any() is being REMOVED (cleanup)", () => {
    const r = decideBlock({
      toolName: "Edit",
      filePath: "src/schemas/x.ts",
      oldContent: "z.any(); z.any();",
      newContent: "z.string();",
    });
    expect(r.block).toBe(false);
    expect(r.addedCount).toBe(-2);
  });

  it("passes Edit when oldContent absent (treats old count as 0); only blocks if new>0", () => {
    const r = decideBlock({
      toolName: "Edit",
      filePath: "src/schemas/x.ts",
      newContent: "z.any();",
    });
    expect(r.block).toBe(true);
  });

  it("blocks Edit with delta > 0 even if old already had some", () => {
    const r = decideBlock({
      toolName: "Edit",
      filePath: "src/schemas/x.ts",
      oldContent: "z.any();",
      newContent: "z.any(); z.any(); z.any();",
    });
    expect(r.block).toBe(true);
    expect(r.addedCount).toBe(2);
  });
});

describe("P8-U06 decideBlock — defensive paths", () => {
  it("safe on null/non-object args", () => {
    expect(decideBlock(null).block).toBe(false);
    expect(decideBlock(undefined).block).toBe(false);
    expect(decideBlock("string").block).toBe(false);
  });

  it("passes when newContent is non-string", () => {
    expect(decideBlock({
      toolName: "Write",
      filePath: "src/schemas/x.ts",
      newContent: 42 as any,
    }).block).toBe(false);
  });

  it("passes for non-schema file even when toolName is Write/Edit", () => {
    expect(decideBlock({
      toolName: "Write",
      filePath: "docs/README.md",
      newContent: "z.any() in docs",
    }).block).toBe(false);
  });
});

describe("P8-U06 parsePreToolUsePayload", () => {
  it("parses a well-formed Write payload", () => {
    const raw = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/schemas/foo.ts", content: "z.any();" },
    });
    const r = parsePreToolUsePayload(raw);
    expect(r).not.toBeNull();
    expect(r.toolName).toBe("Write");
    expect(r.filePath).toBe("src/schemas/foo.ts");
    expect(r.newContent).toBe("z.any();");
  });

  it("parses an Edit payload with new_string + old_string", () => {
    const raw = JSON.stringify({
      tool_name: "Edit",
      tool_input: {
        file_path: "src/schemas/x.ts",
        new_string: "z.any();",
        old_string: "z.string();",
      },
    });
    const r = parsePreToolUsePayload(raw);
    expect(r.toolName).toBe("Edit");
    expect(r.newContent).toBe("z.any();");
    expect(r.oldContent).toBe("z.string();");
  });

  it("returns null on malformed JSON", () => {
    expect(parsePreToolUsePayload("{not json")).toBeNull();
    expect(parsePreToolUsePayload("")).toBeNull();
    expect(parsePreToolUsePayload(null as any)).toBeNull();
  });

  it("returns null when tool_name is missing", () => {
    const raw = JSON.stringify({ tool_input: { file_path: "x" } });
    expect(parsePreToolUsePayload(raw)).toBeNull();
  });

  it("defaults missing fields to empty strings (not undefined)", () => {
    const raw = JSON.stringify({ tool_name: "Write" });
    const r = parsePreToolUsePayload(raw);
    expect(r.toolName).toBe("Write");
    expect(r.filePath).toBe("");
    expect(r.newContent).toBe("");
    expect(r.oldContent).toBe("");
  });
});
