/**
 * BuildDispatcher — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U04.
 *
 * Pure-function tests for buildDispatcher.ts (the third dispatcher
 * deliverable in the P9-U04 trio alongside hookDispatcher [shipped] and
 * sessionDispatcher [shipped]).
 *
 * Asserts:
 *   1. normalizeFilePath: trim, reject empty/non-string, backslash → slash.
 *   2. validateAction: per-action param shape gates (pre_edit/post_edit/
 *      score_for_file need filePath; quality_summary needs glob; unknown
 *      action rejected).
 *   3. classifyDelta: improved/regressed/unchanged classification with
 *      ±0.01 deadband; non-finite inputs default to unchanged.
 *   4. registerBuildDispatcher attaches a tool named 'prism_build' to a
 *      mock server with the documented action enum.
 */

import { describe, it, expect, vi } from "vitest";
import {
  normalizeFilePath,
  validateAction,
  classifyDelta,
  registerBuildDispatcher,
} from "../tools/dispatchers/buildDispatcher.js";

describe("P9-U04 normalizeFilePath", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeFilePath("  src/foo.ts  ")).toBe("src/foo.ts");
  });

  it("converts Windows backslashes to forward slashes", () => {
    expect(normalizeFilePath("src\\foo\\bar.ts")).toBe("src/foo/bar.ts");
  });

  it("returns null for empty string", () => {
    expect(normalizeFilePath("")).toBeNull();
    expect(normalizeFilePath("   ")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(normalizeFilePath(null)).toBeNull();
    expect(normalizeFilePath(undefined)).toBeNull();
    expect(normalizeFilePath(42)).toBeNull();
    expect(normalizeFilePath({})).toBeNull();
  });

  it("preserves already-normalised paths unchanged", () => {
    expect(normalizeFilePath("src/foo/bar.ts")).toBe("src/foo/bar.ts");
  });

  it("handles mixed slashes correctly", () => {
    expect(normalizeFilePath("src\\foo/bar\\baz.ts")).toBe("src/foo/bar/baz.ts");
  });
});

describe("P9-U04 validateAction", () => {
  it("pre_edit accepts filePath string", () => {
    expect(validateAction("pre_edit", { filePath: "src/foo.ts" })).toBeNull();
  });

  it("pre_edit rejects missing filePath", () => {
    expect(validateAction("pre_edit", {})).toContain("filePath");
  });

  it("pre_edit rejects empty filePath string", () => {
    expect(validateAction("pre_edit", { filePath: "" })).toContain("filePath");
  });

  it("pre_edit rejects non-string filePath", () => {
    expect(validateAction("pre_edit", { filePath: 42 as any })).toContain("filePath");
  });

  it("post_edit accepts filePath", () => {
    expect(validateAction("post_edit", { filePath: "src/foo.ts" })).toBeNull();
  });

  it("post_edit rejects missing filePath", () => {
    expect(validateAction("post_edit", {})).toContain("filePath");
  });

  it("score_for_file accepts filePath", () => {
    expect(validateAction("score_for_file", { filePath: "src/foo.ts" })).toBeNull();
  });

  it("quality_summary accepts glob string", () => {
    expect(validateAction("quality_summary", { glob: "src/**/*.ts" })).toBeNull();
  });

  it("quality_summary rejects missing glob", () => {
    expect(validateAction("quality_summary", {})).toContain("glob");
  });

  it("quality_summary rejects empty glob", () => {
    expect(validateAction("quality_summary", { glob: "" })).toContain("glob");
  });

  it("rejects unknown action with descriptive message", () => {
    const err = validateAction("widgets", { filePath: "x" });
    expect(err).toContain("unknown action");
    expect(err).toContain("widgets");
  });

  it("rejects null params", () => {
    expect(validateAction("pre_edit", null as any)).toContain("object");
  });
});

describe("P9-U04 classifyDelta", () => {
  it("improved when curr > prev + deadband", () => {
    expect(classifyDelta(0.5, 0.6)).toBe("improved");
    expect(classifyDelta(0.5, 0.52)).toBe("improved");
  });

  it("regressed when curr < prev - deadband", () => {
    expect(classifyDelta(0.6, 0.5)).toBe("regressed");
    expect(classifyDelta(0.6, 0.58)).toBe("regressed");
  });

  it("unchanged within ±0.01 deadband", () => {
    expect(classifyDelta(0.5, 0.5)).toBe("unchanged");
    expect(classifyDelta(0.5, 0.505)).toBe("unchanged");
    expect(classifyDelta(0.5, 0.495)).toBe("unchanged");
  });

  it("unchanged when prev is non-finite (NaN/Infinity/null)", () => {
    expect(classifyDelta(NaN, 0.5)).toBe("unchanged");
    expect(classifyDelta(Infinity, 0.5)).toBe("unchanged");
    expect(classifyDelta(null, 0.5)).toBe("unchanged");
  });

  it("unchanged when curr is non-finite", () => {
    expect(classifyDelta(0.5, NaN)).toBe("unchanged");
    expect(classifyDelta(0.5, undefined)).toBe("unchanged");
  });

  it("handles negative scores symmetrically", () => {
    expect(classifyDelta(-0.5, -0.4)).toBe("improved");
    expect(classifyDelta(-0.4, -0.5)).toBe("regressed");
  });

  it("zero-to-positive transition is improved", () => {
    expect(classifyDelta(0, 0.5)).toBe("improved");
  });
});

describe("P9-U04 registerBuildDispatcher", () => {
  it("registers a tool named 'prism_build' on the server", () => {
    const calls: any[] = [];
    const mockServer = {
      tool: (name: string, _desc: string, _schema: any, _handler: any) => {
        calls.push({ name });
      },
    };
    registerBuildDispatcher(mockServer);
    expect(calls.length).toBe(1);
    expect(calls[0].name).toBe("prism_build");
  });

  it("schema declares all 4 documented actions in z.enum", () => {
    let capturedSchema: any = null;
    const mockServer = {
      tool: (_name: string, _desc: string, schema: any, _handler: any) => {
        capturedSchema = schema;
      },
    };
    registerBuildDispatcher(mockServer);
    expect(capturedSchema).not.toBeNull();
    // The action enum should accept exactly these 4 values
    const enumValues = capturedSchema.action._zod?.def?.entries
      ?? capturedSchema.action.options
      ?? [];
    // Different zod versions surface enums differently; assert the enum size by
    // probing parse behavior instead.
    expect(capturedSchema.action.parse("pre_edit")).toBe("pre_edit");
    expect(capturedSchema.action.parse("post_edit")).toBe("post_edit");
    expect(capturedSchema.action.parse("quality_summary")).toBe("quality_summary");
    expect(capturedSchema.action.parse("score_for_file")).toBe("score_for_file");
    expect(() => capturedSchema.action.parse("widgets")).toThrow();
  });

  it("description references both companion dispatchers (hookDispatcher + sessionDispatcher)", () => {
    let capturedDesc: string | null = null;
    const mockServer = {
      tool: (_name: string, desc: string, _schema: any, _handler: any) => {
        capturedDesc = desc;
      },
    };
    registerBuildDispatcher(mockServer);
    expect(capturedDesc).not.toBeNull();
    expect(capturedDesc!).toContain("prism_hook");
    expect(capturedDesc!).toContain("prism_session");
    expect(capturedDesc!).toContain("P9-U04");
  });

  it("description lists all 4 actions explicitly", () => {
    let capturedDesc: string | null = null;
    const mockServer = {
      tool: (_name: string, desc: string, _schema: any, _handler: any) => {
        capturedDesc = desc;
      },
    };
    registerBuildDispatcher(mockServer);
    expect(capturedDesc!).toContain("pre_edit");
    expect(capturedDesc!).toContain("post_edit");
    expect(capturedDesc!).toContain("quality_summary");
    expect(capturedDesc!).toContain("score_for_file");
  });
});

describe("P9-U04 dispatcher handler round-trip", () => {
  // Invoke the registered handler directly with a mocked server.tool capture
  // so we exercise the real validateAction → engine call path without booting
  // the full MCP server.
  async function captureHandler() {
    let handler: any = null;
    const mockServer = {
      tool: (_n: string, _d: string, _s: any, h: any) => {
        handler = h;
      },
    };
    registerBuildDispatcher(mockServer);
    return handler;
  }

  it("handler exists after registration", async () => {
    const h = await captureHandler();
    expect(typeof h).toBe("function");
  });

  it("handler returns dispatcherError envelope for invalid params", async () => {
    const h = await captureHandler();
    const r = await h({ action: "pre_edit", params: {} });
    // dispatcherError shape varies but always includes a content array with
    // error details — accept either { isError: true } or content with error
    // text.
    const text = JSON.stringify(r);
    expect(text).toContain("filePath");
  });

  it("handler returns dispatcherError for unknown action via validateAction", async () => {
    const h = await captureHandler();
    const r = await h({ action: "widgets" as any, params: {} });
    expect(r).toBeDefined();
    // Either zod throws before our handler (and the test runner reports it)
    // or our validateAction surfaces the error. Accept both via a string scan.
    const text = JSON.stringify(r);
    expect(/widgets|unknown|invalid/i.test(text)).toBe(true);
  });
});
