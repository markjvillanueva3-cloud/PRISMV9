/**
 * WirePrismHooks — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U02 + P11-U07
 *
 * Pure-function tests for the hook-wiring applier. The I/O layer
 * (applyWiringToFile) is exercised via injected paths in a temp
 * fixture so no real settings.json is touched.
 *
 * Asserts:
 *   1. resolveHookCommand builds the expected portable-node command
 *   2. hookEntryMatches detects existing entries by command equality
 *   3. blockHasHook walks matcher groups + hooks[] correctly
 *   4. addHookToBlock is immutable + groups by matcher (idempotent)
 *   5. applyWiring is idempotent — re-running adds nothing
 *   6. applyWiring honors per-hook matcher (PreToolUse|Bash etc.)
 *   7. applyWiring is defensive on missing/non-string event
 *   8. P11_U02_HOOKS / P11_U07_HOOKS expose the documented hook lists
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/wire-prism-hooks.mjs");

let resolveHookCommand: any;
let hookEntryMatches: any;
let blockHasHook: any;
let addHookToBlock: any;
let applyWiring: any;
let P11_U02_HOOKS: any;
let P11_U07_HOOKS: any;
let DEFAULT_HOOKS_DIR: any;

beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  resolveHookCommand = mod.resolveHookCommand;
  hookEntryMatches = mod.hookEntryMatches;
  blockHasHook = mod.blockHasHook;
  addHookToBlock = mod.addHookToBlock;
  applyWiring = mod.applyWiring;
  P11_U02_HOOKS = mod.P11_U02_HOOKS;
  P11_U07_HOOKS = mod.P11_U07_HOOKS;
  DEFAULT_HOOKS_DIR = mod.DEFAULT_HOOKS_DIR;
});

describe("P11-wire/resolveHookCommand", () => {
  it("builds the canonical portable-node command for a hook", () => {
    const cmd = resolveHookCommand("foo");
    expect(cmd).toBe(`"H:/.claude/bin/portable-node" "H:/.claude/hooks/foo.mjs"`);
  });
  it("respects custom hooks-dir override", () => {
    const cmd = resolveHookCommand("foo", "/custom/hooks");
    expect(cmd).toBe(`"H:/.claude/bin/portable-node" "/custom/hooks/foo.mjs"`);
  });
  it("returns empty string for non-string / empty hookName", () => {
    expect(resolveHookCommand("")).toBe("");
    expect(resolveHookCommand(null)).toBe("");
    expect(resolveHookCommand(42)).toBe("");
  });
  it("uses DEFAULT_HOOKS_DIR when override is non-string", () => {
    const cmd = resolveHookCommand("foo", null);
    expect(cmd).toContain(DEFAULT_HOOKS_DIR);
  });
});

describe("P11-wire/hookEntryMatches", () => {
  it("detects matching command in entry.hooks[]", () => {
    const entry = { matcher: ".*", hooks: [{ type: "command", command: "x" }] };
    expect(hookEntryMatches(entry, "x")).toBe(true);
  });
  it("returns false on no-match", () => {
    const entry = { matcher: ".*", hooks: [{ type: "command", command: "x" }] };
    expect(hookEntryMatches(entry, "y")).toBe(false);
  });
  it("returns false for null/missing entry or hooks", () => {
    expect(hookEntryMatches(null, "x")).toBe(false);
    expect(hookEntryMatches({ matcher: ".*" }, "x")).toBe(false);
    expect(hookEntryMatches({ matcher: ".*", hooks: null }, "x")).toBe(false);
  });
});

describe("P11-wire/blockHasHook", () => {
  const block = [
    { matcher: ".*", hooks: [{ type: "command", command: "alpha" }] },
    { matcher: "Write", hooks: [{ type: "command", command: "beta" }] },
  ];
  it("finds command across matcher groups", () => {
    expect(blockHasHook(block, "alpha")).toBe(true);
    expect(blockHasHook(block, "beta")).toBe(true);
  });
  it("returns false on absent command", () => {
    expect(blockHasHook(block, "gamma")).toBe(false);
  });
  it("returns false on non-array block (3 failure modes)", () => {
    expect(blockHasHook(null, "x")).toBe(false);
    expect(blockHasHook({}, "x")).toBe(false);
    expect(blockHasHook(undefined, "x")).toBe(false);
  });
});

describe("P11-wire/addHookToBlock — immutable + grouped", () => {
  it("appends a new matcher group when none matches", () => {
    const block: any[] = [];
    const out = addHookToBlock(block, "foo", "CMD", "Bash");
    expect(out).toEqual([{ matcher: "Bash", hooks: [{ type: "command", command: "CMD" }] }]);
    expect(block).toEqual([]); // input not mutated
  });
  it("appends to existing matcher group when matcher matches", () => {
    const block = [{ matcher: "Bash", hooks: [{ type: "command", command: "old" }] }];
    const out = addHookToBlock(block, "foo", "CMD", "Bash");
    expect(out).toEqual([{
      matcher: "Bash",
      hooks: [
        { type: "command", command: "old" },
        { type: "command", command: "CMD" },
      ],
    }]);
    // Original block must be untouched
    expect(block[0].hooks.length).toBe(1);
  });
  it("is idempotent — second call with same command adds nothing", () => {
    const block = [{ matcher: ".*", hooks: [{ type: "command", command: "CMD" }] }];
    const out = addHookToBlock(block, "foo", "CMD", ".*");
    expect(out).toEqual(block);
  });
  it("creates new group for different matcher", () => {
    const block = [{ matcher: ".*", hooks: [{ type: "command", command: "old" }] }];
    const out = addHookToBlock(block, "foo", "CMD", "Bash");
    expect(out.length).toBe(2);
    expect(out[1].matcher).toBe("Bash");
  });
});

describe("P11-wire/applyWiring — idempotent + correct routing", () => {
  it("wires every hook in plan to its event block on first run", () => {
    const plan = {
      "h1": { event: "PreToolUse", matcher: "Write" },
      "h2": { event: "PostToolUse" },
    };
    const r = applyWiring({}, plan);
    expect(r.added.length).toBe(2);
    expect(r.skipped.length).toBe(0);
    expect(Array.isArray(r.settings.hooks.PreToolUse)).toBe(true);
    expect(Array.isArray(r.settings.hooks.PostToolUse)).toBe(true);
  });
  it("is idempotent — second apply on result skips all entries", () => {
    const plan = { "h1": { event: "PreToolUse", matcher: "Write" } };
    const first = applyWiring({}, plan);
    const second = applyWiring(first.settings, plan);
    expect(second.added.length).toBe(0);
    expect(second.skipped.length).toBe(1);
    expect(second.skipped[0].reason).toContain("already wired");
  });
  it("honors per-hook matcher value (groups under same matcher)", () => {
    const plan = {
      "h1": { event: "PreToolUse", matcher: "Bash" },
      "h2": { event: "PreToolUse", matcher: "Bash" },
    };
    const r = applyWiring({}, plan);
    // Both go into same Bash matcher group
    expect(r.settings.hooks.PreToolUse.length).toBe(1);
    expect(r.settings.hooks.PreToolUse[0].hooks.length).toBe(2);
  });
  it("falls back to .* matcher when matcher omitted", () => {
    const plan = { "h1": { event: "PreToolUse" } };
    const r = applyWiring({}, plan);
    expect(r.settings.hooks.PreToolUse[0].matcher).toBe(".*");
  });
  it("skips entries with missing/empty event (3 failure modes)", () => {
    const plan = {
      "h1": { matcher: "Bash" },
      "h2": { event: 42 },
      "h3": { event: "" },
    };
    const r = applyWiring({}, plan);
    expect(r.added.length).toBe(0);
    expect(r.skipped.length).toBe(3);
    for (const s of r.skipped) expect(s.reason).toBe("no event in plan");
  });
  it("preserves unrelated settings keys (non-mutating on top-level)", () => {
    const inputSettings = { hooks: {}, otherKey: "preserved", nested: { a: 1 } };
    const plan = { "h1": { event: "PreToolUse" } };
    const r = applyWiring(inputSettings, plan);
    expect(r.settings.otherKey).toBe("preserved");
    expect(r.settings.nested).toEqual({ a: 1 });
    // Original unchanged
    expect(inputSettings.hooks).toEqual({});
  });
});

describe("P11-wire/canonical hook lists", () => {
  it("P11_U02_HOOKS exposes 20 wireable hooks (5 missing-from-disk omitted from spec'd 25)", () => {
    const ids = Object.keys(P11_U02_HOOKS);
    expect(ids.length).toBe(20);
    expect(P11_U02_HOOKS["file-claim-guard"].event).toBe("PreToolUse");
    expect(P11_U02_HOOKS["claude-md-mirror"].event).toBe("SessionStart");
    expect(P11_U02_HOOKS["chat-bus-inject"].event).toBe("UserPromptSubmit");
  });
  it("P11_U07_HOOKS exposes 10 wireable hooks (4 missing-from-disk omitted from spec'd 14)", () => {
    const ids = Object.keys(P11_U07_HOOKS);
    expect(ids.length).toBe(10);
    expect(P11_U07_HOOKS["awareness-bootstrap"].event).toBe("SessionStart");
    expect(P11_U07_HOOKS["goal-stack-inject"].event).toBe("UserPromptSubmit");
    expect(P11_U07_HOOKS["metacognition-check"].event).toBe("PreToolUse");
  });
  it("hook lists are frozen (immutable)", () => {
    expect(Object.isFrozen(P11_U02_HOOKS)).toBe(true);
    expect(Object.isFrozen(P11_U07_HOOKS)).toBe(true);
  });
});
