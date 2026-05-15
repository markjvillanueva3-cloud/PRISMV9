/**
 * dispatcher-digest-regen.test.mjs — companion to .claude/hooks/dispatcher-digest-regen.mjs (iter 7).
 *
 * Coverage: relevantPaths (input shape variants) + touchedDispatcherLand (regex match across
 * Windows + POSIX paths, .test.ts exclusion, mixed batches).
 *
 * Hermetic — imports pure-function exports; does NOT invoke the hook's `main()` because that
 * reads stdin + spawns a child process.
 */

import { describe, it, expect } from "vitest";

import {
  relevantPaths,
  touchedDispatcherLand,
  RELEVANT_RE,
  TEST_EXCLUDE_RE,
} from "../../.claude/hooks/dispatcher-digest-regen.mjs";

// ── relevantPaths ────────────────────────────────────────────────────────────

describe("relevantPaths", () => {
  it("extracts file_path from Edit/Write shape", () => {
    expect(relevantPaths({ file_path: "/x/y.ts" })).toEqual(["/x/y.ts"]);
  });

  it("extracts edits[].file_path from MultiEdit shape", () => {
    expect(relevantPaths({ edits: [{ file_path: "/a.ts" }, { file_path: "/b.ts" }] }))
      .toEqual(["/a.ts", "/b.ts"]);
  });

  it("supports both camelCase + snake_case shapes (filePath / file_path / path)", () => {
    expect(relevantPaths({ filePath: "/c.ts" })).toEqual(["/c.ts"]);
    expect(relevantPaths({ path: "/d.ts" })).toEqual(["/d.ts"]);
  });

  it("handles file_paths array (multi-target)", () => {
    expect(relevantPaths({ file_paths: ["/m.ts", "/n.ts"] })).toEqual(["/m.ts", "/n.ts"]);
  });

  it("returns [] for null input (defensive)", () => {
    expect(relevantPaths(null)).toEqual([]);
  });

  it("returns [] for empty object", () => {
    expect(relevantPaths({})).toEqual([]);
  });

  it("ignores non-string path values", () => {
    expect(relevantPaths({ file_path: 42 })).toEqual([]);
    expect(relevantPaths({ edits: [{ file_path: null }] })).toEqual([]);
  });
});

// ── touchedDispatcherLand ────────────────────────────────────────────────────

describe("touchedDispatcherLand", () => {
  it("matches dispatcher .ts file via POSIX path", () => {
    expect(touchedDispatcherLand(["H:/prism/mcp-server/src/tools/dispatchers/safetyDispatcher.ts"])).toBe(true);
  });

  it("matches dispatcher .ts file via Windows backslash path", () => {
    // Windows native — the hook's regex normalizes \ → / before matching
    expect(touchedDispatcherLand(["H:\\prism\\mcp-server\\src\\tools\\dispatchers\\camDispatcher.ts"])).toBe(true);
  });

  it("excludes .test.ts files (those don't affect digest output)", () => {
    expect(touchedDispatcherLand(["H:/prism/mcp-server/src/tools/dispatchers/safetyDispatcher.test.ts"])).toBe(false);
  });

  it("rejects non-dispatcher .ts files (engines/, hooks/, etc.)", () => {
    expect(touchedDispatcherLand(["H:/prism/mcp-server/src/engines/Foo.ts"])).toBe(false);
    expect(touchedDispatcherLand(["H:/prism/mcp-server/src/hooks/Bar.ts"])).toBe(false);
    expect(touchedDispatcherLand(["H:/prism/mcp-server/src/schemas/Baz.ts"])).toBe(false);
  });

  it("rejects unrelated paths (scripts, docs, etc.)", () => {
    expect(touchedDispatcherLand(["H:/prism/scripts/foo.mjs", "H:/prism/CLAUDE.md"])).toBe(false);
  });

  it("returns true for mixed batch when at least one is a dispatcher .ts", () => {
    expect(touchedDispatcherLand([
      "H:/prism/scripts/foo.mjs",
      "H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts",
      "H:/prism/CLAUDE.md",
    ])).toBe(true);
  });

  it("returns false for empty input", () => {
    expect(touchedDispatcherLand([])).toBe(false);
  });

  it("rejects similar-but-wrong paths (typo defenses)", () => {
    expect(touchedDispatcherLand(["H:/prism/mcp-server/src/dispatchers/Foo.ts"])).toBe(false);  // missing tools/
    expect(touchedDispatcherLand(["H:/prism/mcp-server/tools/dispatchers/Foo.ts"])).toBe(false); // missing src/
  });
});

// ── RELEVANT_RE / TEST_EXCLUDE_RE direct ─────────────────────────────────────

describe("RELEVANT_RE", () => {
  it("matches normalized POSIX dispatcher path", () => {
    expect(RELEVANT_RE.test("H:/prism/mcp-server/src/tools/dispatchers/X.ts")).toBe(true);
  });

  it("rejects path missing dispatcher segment", () => {
    expect(RELEVANT_RE.test("H:/prism/mcp-server/src/tools/X.ts")).toBe(false);
  });
});

describe("TEST_EXCLUDE_RE", () => {
  it("matches .test.ts suffix", () => {
    expect(TEST_EXCLUDE_RE.test("foo.test.ts")).toBe(true);
  });

  it("does not match plain .ts", () => {
    expect(TEST_EXCLUDE_RE.test("foo.ts")).toBe(false);
  });

  it("does not match .test.tsx (different ext)", () => {
    expect(TEST_EXCLUDE_RE.test("foo.test.tsx")).toBe(false);
  });
});
