/**
 * precompact-release-slot.test.mjs -- tests for the pure exports of the
 * PreCompact slot-release hook. node:test.
 *
 * Covers buildVerboseVerdict (PreCompact output contract, regression lock for
 * U-PRECOMPACT-MEMO-CONTRACT sibling) and stableIdFromSession (session-id ->
 * chatId derivation). Happy + >=3 failure + >=2 adversarial per R9.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildVerboseVerdict, stableIdFromSession } from "./precompact-release-slot.mjs";

// --- buildVerboseVerdict -- PreCompact output contract (regression lock) -----
// PreCompact has NO `hookSpecificOutput` contract; the earlier shape
// { hookSpecificOutput: { hookEventName: "PreCompact", additionalContext } }
// was rejected by the harness, silently dropping the slot-release warning on
// the VERBOSE path. The note must ride the top-level `systemMessage` field.

test("buildVerboseVerdict: note -> { continue:true, systemMessage } and NO hookSpecificOutput (regression lock)", () => {
  const v = buildVerboseVerdict("slot bravo freed for fleet");
  assert.equal(v.continue, true);
  assert.equal(v.systemMessage, "slot bravo freed for fleet");
  assert.equal("hookSpecificOutput" in v, false, "PreCompact verdict must NOT carry hookSpecificOutput");
});

test("buildVerboseVerdict: only uses allowed PreCompact top-level keys and is JSON-serializable", () => {
  const ALLOWED = new Set([
    "continue", "suppressOutput", "stopReason", "decision", "reason",
    "systemMessage", "terminalSequence", "permissionDecision",
  ]);
  const round = JSON.parse(JSON.stringify(buildVerboseVerdict("any note")));
  for (const k of Object.keys(round)) {
    assert.ok(ALLOWED.has(k), `key "${k}" is not an allowed PreCompact top-level field`);
  }
});

test("buildVerboseVerdict: always continues -- a PreCompact hook must never block /compact", () => {
  assert.equal(buildVerboseVerdict("x").continue, true);
  assert.notEqual(buildVerboseVerdict("x").decision, "block");
});

// --- stableIdFromSession -- session_id -> chatId derivation ------------------

test("stableIdFromSession: full uuid -> claude-<first-8-hex> (happy path)", () => {
  assert.equal(
    stableIdFromSession("31b302a2-1334-4b15-87f3-6aa6d7d85dfa"),
    "claude-31b302a2",
  );
});

test("stableIdFromSession: adversarial -- uppercase hex is lowercased", () => {
  assert.equal(
    stableIdFromSession("31B302A2-1334-4B15-87F3-6AA6D7D85DFA"),
    "claude-31b302a2",
  );
});

test("stableIdFromSession: adversarial -- non-hex letters are stripped before the 8-char take", () => {
  // 'g'..'z' are not [0-9a-f]; they are removed, then the first 8 survivors form the id.
  assert.equal(stableIdFromSession("deadbeef-cafe"), "claude-deadbeef");
  assert.equal(stableIdFromSession("gg-deadbeef99"), "claude-deadbeef");
});

test("stableIdFromSession: failure-mode -- null / undefined / non-string -> null", () => {
  assert.equal(stableIdFromSession(null), null);
  assert.equal(stableIdFromSession(undefined), null);
  assert.equal(stableIdFromSession(12345678), null);
  assert.equal(stableIdFromSession(""), null);
});

test("stableIdFromSession: failure-mode -- fewer than 8 hex chars available -> null (no short id)", () => {
  assert.equal(stableIdFromSession("abc"), null);          // only 3 hex
  assert.equal(stableIdFromSession("zzzzzzzz"), null);     // 0 hex after strip
  assert.equal(stableIdFromSession("12-34-56"), null);     // only 6 hex
});
