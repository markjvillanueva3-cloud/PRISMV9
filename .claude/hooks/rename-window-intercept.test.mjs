#!/usr/bin/env node
/**
 * rename-window-intercept.test.mjs
 * Run: node --test .claude/hooks/rename-window-intercept.test.mjs
 *
 * Pure helpers are tested directly; end-to-end behavior (block / passthrough /
 * fail-open) is tested by running the hook as a real subprocess with crafted
 * stdin, which is how Claude Code actually invokes it.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  chatIdFromSession,
  parseRenameArg,
  isPeerForm,
} from "./rename-window-intercept.mjs";

const HOOK = fileURLToPath(new URL("./rename-window-intercept.mjs", import.meta.url));

/** Run the hook as Claude Code would: pipe a JSON event on stdin, capture stdout JSON. */
function runHook(inputObj, env = {}) {
  const stdin = JSON.stringify(inputObj);
  const out = execFileSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    timeout: 8000,
    env: { ...process.env, ...env },
  });
  return JSON.parse(out);
}

describe("chatIdFromSession", () => {
  test("derives claude-<8hex> from a full uuid", () => {
    assert.equal(chatIdFromSession("b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"), "claude-b6c4b196");
  });
  test("strips non-hex and truncates", () => {
    assert.equal(chatIdFromSession("ZZb6c4b196xx"), "claude-b6c4b196");
  });
  test("null/empty → null", () => {
    assert.equal(chatIdFromSession(null), null);
    assert.equal(chatIdFromSession(""), null);
    assert.equal(chatIdFromSession("zzzz"), null);
  });
});

describe("parseRenameArg", () => {
  test("matches /rename <name>", () => {
    assert.equal(parseRenameArg("/rename alpha-gnn"), "alpha-gnn");
  });
  test("matches /rename-chat <name> and bare rename", () => {
    assert.equal(parseRenameArg("/rename-chat Fleet Work"), "Fleet Work");
    assert.equal(parseRenameArg("rename foo"), "foo");
  });
  test("case-insensitive command, trims arg", () => {
    assert.equal(parseRenameArg("/ReName   spaced name  "), "spaced name");
  });
  test("bare /rename (no arg) → null (skill shows current state)", () => {
    assert.equal(parseRenameArg("/rename"), null);
    assert.equal(parseRenameArg("/rename   "), null);
  });
  test("non-rename prompts → null", () => {
    assert.equal(parseRenameArg("please rename the engine"), null);
    assert.equal(parseRenameArg("/renamexyz foo"), null);
    assert.equal(parseRenameArg(""), null);
    assert.equal(parseRenameArg(null), null);
  });
});

describe("isPeerForm", () => {
  const slots = ["alpha", "bravo", "charlie", "golf"];
  test("'<slot> <name>' is peer form", () => {
    assert.equal(isPeerForm("alpha gnn-build", slots), true);
    assert.equal(isPeerForm("BRAVO something", slots), true); // case-insensitive
  });
  test("single token (self-rename) is NOT peer form", () => {
    assert.equal(isPeerForm("alpha", slots), false);
    assert.equal(isPeerForm("my-cool-name", slots), false);
  });
  test("multi-word name whose first token is not a slot is NOT peer form", () => {
    assert.equal(isPeerForm("fleet reaper gnn", slots), false);
  });
  test("guards: no slots array / empty arg", () => {
    assert.equal(isPeerForm("alpha x", null), false);
    assert.equal(isPeerForm("", slots), false);
  });
});

describe("hook subprocess — fail-open + control paths", () => {
  test("empty stdin → {continue:true} (never blocks)", () => {
    const out = execFileSync(process.execPath, [HOOK], { input: "", encoding: "utf8", timeout: 8000 });
    assert.deepEqual(JSON.parse(out), { continue: true, suppressOutput: true });
  });

  test("garbage stdin → passthrough", () => {
    const out = execFileSync(process.execPath, [HOOK], { input: "not json {{{", encoding: "utf8", timeout: 8000 });
    assert.equal(JSON.parse(out).continue, true);
  });

  test("DISABLE knob → passthrough even for a rename prompt", () => {
    const r = runHook(
      { session_id: "b6c4b196-aaaa", prompt: "/rename whatever" },
      { PRISM_RENAME_WINDOW_DISABLE: "1" }
    );
    assert.equal(r.continue, true);
    assert.notEqual(r.decision, "block");
  });

  test("non-rename prompt → passthrough (does not block normal prompts)", () => {
    const r = runHook({ session_id: "deadbeef-0000", prompt: "what is 2+2?" });
    assert.equal(r.continue, true);
    assert.notEqual(r.decision, "block");
  });

  test("rename for a session that owns NO slot → passthrough (skill handles it, not a block)", () => {
    // 'ffffffff' is not a real claimed chat id → renameChat returns no_slot_owned
    const r = runHook({ session_id: "ffffffff-1111", prompt: "/rename should-not-block" });
    assert.equal(r.continue, true);
    assert.notEqual(r.decision, "block");
  });

  test("no session_id → passthrough", () => {
    const r = runHook({ prompt: "/rename x" });
    assert.equal(r.continue, true);
  });
});
