/**
 * error-learn-store — behavioural tests against fingerprint, recordEvent,
 * searchSimilar, and proposeHookDraft. Uses a sandbox project root.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let sandboxRoot;
let originalCwd;

beforeEach(() => {
  originalCwd = process.cwd();
  sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "errlearn-"));
  fs.mkdirSync(path.join(sandboxRoot, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(sandboxRoot, ".claude", "settings.json"), "{}");
  fs.mkdirSync(path.join(sandboxRoot, "mcp-server", "data", "state"), { recursive: true });
  process.chdir(sandboxRoot);
});

afterEach(() => {
  process.chdir(originalCwd);
  if (sandboxRoot && fs.existsSync(sandboxRoot)) fs.rmSync(sandboxRoot, { recursive: true, force: true });
});

async function loadStore() {
  // Import fresh each test so module state (if any) doesn't leak across cases
  const mod = await import("./error-learn-store.mjs?cachebuster=" + Date.now());
  return mod;
}

describe("fingerprint — normalization", () => {
  it("collapses whitespace and lowercases", async () => {
    const { fingerprint } = await loadStore();
    expect(fingerprint("HELLO\n  WORLD\t!!")).toBe("hello world");
  });

  it("strips most punctuation but keeps : = - _ / .", async () => {
    const { fingerprint } = await loadStore();
    expect(fingerprint("foo:bar=baz/qux.ts-1_2")).toBe("foo:bar=baz/qux.ts-1_2");
  });

  it("returns empty string for falsy input", async () => {
    const { fingerprint } = await loadStore();
    expect(fingerprint("")).toBe("");
    expect(fingerprint(null)).toBe("");
    expect(fingerprint(undefined)).toBe("");
  });

  it("caps output at 60 chars", async () => {
    const { fingerprint } = await loadStore();
    expect(fingerprint("x".repeat(200)).length).toBe(60);
  });
});

describe("fileSuffix — extension classification", () => {
  it("classifies test files", async () => {
    const { fileSuffix } = await loadStore();
    expect(fileSuffix("/a/b/c.test.ts")).toBe("test.ts");
    expect(fileSuffix("/a/b/c.spec.ts")).toBe("test.ts");
    expect(fileSuffix("/a/b/c.test.mjs")).toBe("test.mjs");
  });

  it("returns plain extension for non-test files", async () => {
    const { fileSuffix } = await loadStore();
    expect(fileSuffix("/a/b/MyEngine.ts")).toBe("ts");
    expect(fileSuffix("/a/b/script.mjs")).toBe("mjs");
    expect(fileSuffix("/a/b/data.json")).toBe("json");
  });

  it("returns empty string for empty path", async () => {
    const { fileSuffix } = await loadStore();
    expect(fileSuffix("")).toBe("");
  });

  it("rejects command strings — Bash events have no file (anti-pollution)", async () => {
    const { fileSuffix } = await loadStore();
    // Capture hooks passed Bash commands to fileSuffix, yielding garbage
    // "suffixes" (e.g. "ts 2>&1 | tail -80") that fragmented promote grouping.
    expect(fileSuffix("npm run build")).toBe("");
    expect(fileSuffix("cd h:/prism  node x.mjs 2>&1 | tail -80")).toBe("");
    expect(fileSuffix("node scripts/health.mjs 2>&1 | head -5")).toBe("");
    expect(fileSuffix(null)).toBe("");
    expect(fileSuffix(42)).toBe("");
    // A real path whose PARENT dir has a space but basename is clean still works.
    expect(fileSuffix("C:/Users/Mark Villanueva/.claude/x.ts")).toBe("ts");
  });
});

describe("recordEvent + readAll — persistence", () => {
  it("writes a single event with required fields", async () => {
    const { recordEvent, readAll, ERROR_CLASSES } = await loadStore();
    recordEvent({
      tool: "Write",
      error_class: ERROR_CLASSES.HOOK_BLOCK,
      hook_id: "test-legitimacy",
      file_suffix: "test.ts",
      trigger: "toBeUndefined",
      fingerprint: "abc",
      snippet: "blocked",
    });
    const all = readAll();
    expect(all.length).toBe(1);
    expect(all[0].tool).toBe("Write");
    expect(all[0].hook_id).toBe("test-legitimacy");
    expect(all[0].error_class).toBe("hook_block");
    expect(typeof all[0].ts).toBe("string");
  });

  it("appends multiple events preserving order", async () => {
    const { recordEvent, readAll } = await loadStore();
    recordEvent({ tool: "Write", trigger: "a", error_class: "hook_block" });
    recordEvent({ tool: "Edit", trigger: "b", error_class: "tool_error" });
    recordEvent({ tool: "Bash", trigger: "c", error_class: "tool_error" });
    const all = readAll();
    expect(all.map((e) => e.trigger)).toEqual(["a", "b", "c"]);
  });

  it("readAll returns empty array when ledger missing", async () => {
    const { readAll } = await loadStore();
    expect(readAll()).toEqual([]);
  });
});

describe("searchSimilar — recency-weighted ranking", () => {
  it("filters by tool", async () => {
    const { recordEvent, searchSimilar } = await loadStore();
    recordEvent({ tool: "Write", trigger: "x", error_class: "hook_block", file_suffix: "ts", hook_id: "h1" });
    recordEvent({ tool: "Bash", trigger: "x", error_class: "tool_error", file_suffix: "sh", hook_id: "h2" });
    const found = searchSimilar({ tool: "Write" });
    expect(found.length).toBe(1);
    expect(found[0].hook_id).toBe("h1");
  });

  it("filters by file_suffix", async () => {
    const { recordEvent, searchSimilar } = await loadStore();
    recordEvent({ tool: "Write", error_class: "hook_block", file_suffix: "test.ts", hook_id: "ha" });
    recordEvent({ tool: "Write", error_class: "hook_block", file_suffix: "ts", hook_id: "hb" });
    const found = searchSimilar({ tool: "Write", file_suffix: "test.ts" });
    expect(found.length).toBe(1);
    expect(found[0].hook_id).toBe("ha");
  });

  it("filters by trigger substring (case-insensitive)", async () => {
    const { recordEvent, searchSimilar } = await loadStore();
    recordEvent({ tool: "Write", error_class: "hook_block", trigger: "ToBeUndefined", hook_id: "h1" });
    recordEvent({ tool: "Write", error_class: "hook_block", trigger: "wildcard-perm", hook_id: "h2" });
    const found = searchSimilar({ tool: "Write", trigger: "tobeundefined" });
    expect(found.length).toBe(1);
    expect(found[0].hook_id).toBe("h1");
  });

  it("groups duplicates and counts occurrences", async () => {
    const { recordEvent, searchSimilar } = await loadStore();
    for (let i = 0; i < 4; i++) {
      recordEvent({ tool: "Write", error_class: "hook_block", trigger: "x", hook_id: "same", fingerprint: "fp" });
    }
    const found = searchSimilar({ tool: "Write" });
    expect(found.length).toBe(1);
    expect(found[0].count).toBe(4);
  });

  it("respects limit", async () => {
    const { recordEvent, searchSimilar } = await loadStore();
    for (let i = 0; i < 5; i++) {
      recordEvent({ tool: "Write", error_class: "hook_block", hook_id: `h${i}`, fingerprint: `f${i}` });
    }
    const found = searchSimilar({ tool: "Write", limit: 2 });
    expect(found.length).toBe(2);
  });

  it("returns empty when no matches", async () => {
    const { recordEvent, searchSimilar } = await loadStore();
    recordEvent({ tool: "Write", error_class: "hook_block", hook_id: "h1" });
    expect(searchSimilar({ tool: "NotARealTool" })).toEqual([]);
  });
});

describe("proposeHookDraft — scaffold generation", () => {
  it("includes pattern count and trigger in the draft body", async () => {
    const { proposeHookDraft } = await loadStore();
    const draft = proposeHookDraft({
      tool: "Write",
      hook_id: "test-legitimacy",
      trigger: "toBeUndefined",
      count: 3,
      latest_ts: "2026-04-27T12:00:00Z",
    });
    expect(draft).toContain("learned-test-legitimacy");
    expect(draft).toContain("3× block");
    expect(draft).toContain("toBeUndefined");
    expect(draft).toContain("PreToolUse");
    expect(draft).toContain("Never promote to hard-block");
  });

  it("falls back to __never_match__ when trigger is missing", async () => {
    const { proposeHookDraft } = await loadStore();
    const draft = proposeHookDraft({ tool: "Write", count: 1, latest_ts: "2026-04-27T12:00:00Z" });
    expect(draft).toContain("__never_match__");
  });

  it("escapes regex metacharacters in trigger", async () => {
    const { proposeHookDraft } = await loadStore();
    const draft = proposeHookDraft({
      tool: "Write",
      trigger: "a.b*c",
      count: 1,
      latest_ts: "2026-04-27T12:00:00Z",
    });
    expect(draft).toContain("a\\.b\\*c");
  });
});

describe("clearLedger — predicate-based pruning", () => {
  it("clears entire ledger when no predicate", async () => {
    const { recordEvent, readAll, clearLedger } = await loadStore();
    recordEvent({ tool: "Write" });
    recordEvent({ tool: "Edit" });
    clearLedger();
    expect(readAll()).toEqual([]);
  });

  it("clears matching entries when predicate provided", async () => {
    const { recordEvent, readAll, clearLedger } = await loadStore();
    recordEvent({ tool: "Write", hook_id: "rotten" });
    recordEvent({ tool: "Edit", hook_id: "good" });
    const removed = clearLedger((e) => e.hook_id === "rotten");
    expect(removed).toBe(1);
    const remaining = readAll();
    expect(remaining.length).toBe(1);
    expect(remaining[0].hook_id).toBe("good");
  });
});
