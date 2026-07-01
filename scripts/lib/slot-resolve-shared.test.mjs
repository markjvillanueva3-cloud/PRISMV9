/**
 * slot-resolve-shared.test.mjs -- node:test suite for U-SLOT-RESOLVE-UNIFY.
 *
 * Locks the canonical slot resolver shared by precompact-handoff,
 * precompact-auto-trigger, and self-compact. The load-bearing guarantee: a
 * full-UUID harness sessionId resolves THIS chat's slot via an EXACT
 * `claude-<8hex>` match (NOT a lenient substring that could land on a peer).
 *
 * Run: `node scripts/lib/slot-resolve-shared.test.mjs` (node:test auto-runs on exit).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveSlotShared, canonicalChatId, SLOT_NAMES } from "./slot-resolve-shared.mjs";
import { SLOT_NAMES as CANON_SLOT_NAMES } from "../../.claude/helpers/chat-slots.mjs";

function doc(map) {
  const slots = {};
  for (const n of SLOT_NAMES) slots[n] = null;
  for (const [slot, chatId] of Object.entries(map)) {
    slots[slot] = { chatId, host: "h", lastHeartbeat: new Date().toISOString() };
  }
  return { slots };
}

// ---------------------------------------------------------------------------
// canonicalChatId
// ---------------------------------------------------------------------------
describe("canonicalChatId", () => {
  it("derives claude-<8hex> from a full UUID", () => {
    assert.equal(canonicalChatId("14b038a1-b568-490a-8f31-fb7e113a621b"), "claude-14b038a1");
  });
  it("passes through an already-canonical chatId", () => {
    assert.equal(canonicalChatId("claude-14b038a1"), "claude-14b038a1");
  });
  it("returns null on empty/invalid", () => {
    assert.equal(canonicalChatId(""), null);
    assert.equal(canonicalChatId(null), null);
    assert.equal(canonicalChatId(undefined), null);
  });
});

// ---------------------------------------------------------------------------
// T1 (THE fix): full-UUID sessionId resolves via EXACT canonical match.
//   Pre-unify, precompact-auto-trigger's exact line never fired (claude-8hex
//   != full UUID) so it relied on a lenient substring.
// ---------------------------------------------------------------------------
describe("resolveSlotShared T1: full-UUID sessionId -> exact canonical match", () => {
  it("resolves alpha for the full UUID whose first 8 hex own alpha", () => {
    const d = doc({ alpha: "claude-14b038a1", papa: "claude-deadbeef" });
    const r = resolveSlotShared(d, { sessionId: "14b038a1-b568-490a-8f31-fb7e113a621b" });
    assert.ok(r, "must resolve");
    assert.equal(r.slot, "alpha");
    assert.equal(r.entry.chatId, "claude-14b038a1");
  });
});

// ---------------------------------------------------------------------------
// T2 (adversarial): EXACT must beat LENIENT, even when a PEER's 8hex is a
//   substring of THIS chat's full UUID and the peer slot is iterated FIRST.
// ---------------------------------------------------------------------------
describe("resolveSlotShared T2: exact beats peer-substring (no peer leak)", () => {
  it("resolves MY slot (zulu) not the peer whose 8hex is inside my UUID", () => {
    // My UUID embeds the peer's 8hex "deadbeef" as a substring.
    const myUuid = "0000deadbeef0000-1111-2222-3333-444455556666";
    // bravo (iterated before zulu) is the peer whose bare id is a substring of myUuid.
    const d = doc({ bravo: "claude-deadbeef", zulu: "claude-00deadbe" });
    // NOTE my canonical id = claude-0000deadbe... slice(0,8)="0000dead" -> claude-0000dead
    // Seed zulu to own exactly my canonical id so the exact pass must win.
    d.slots.zulu.chatId = "claude-" + myUuid.slice(0, 8);
    const r = resolveSlotShared(d, { sessionId: myUuid });
    assert.ok(r, "must resolve");
    assert.equal(r.slot, "zulu", "exact canonical match must beat the earlier peer substring match");
  });
});

// ---------------------------------------------------------------------------
// T3: explicit slot wins over everything.
// ---------------------------------------------------------------------------
describe("resolveSlotShared T3: explicit slot wins", () => {
  it("returns the named slot regardless of sessionId", () => {
    const d = doc({ alpha: "claude-14b038a1", papa: "claude-deadbeef" });
    const r = resolveSlotShared(d, { slot: "papa", sessionId: "14b038a1-b568-x" });
    assert.equal(r.slot, "papa");
  });
});

// ---------------------------------------------------------------------------
// T4: exact match via an explicit chatId.
// ---------------------------------------------------------------------------
describe("resolveSlotShared T4: exact chatId match", () => {
  it("resolves by chatId option", () => {
    const d = doc({ mike: "claude-abc12345" });
    const r = resolveSlotShared(d, { chatId: "claude-abc12345" });
    assert.equal(r.slot, "mike");
  });
});

// ---------------------------------------------------------------------------
// T5: lenient substring fallback STILL works when no exact match exists
//   (back-compat for odd id shapes).
// ---------------------------------------------------------------------------
describe("resolveSlotShared T5: lenient fallback when no exact", () => {
  it("falls back to substring match", () => {
    // sessionId contains the bare id but is not the canonical claude-<8hex>.
    const d = doc({ kilo: "claude-cafef00d" });
    const r = resolveSlotShared(d, { sessionId: "prefix-cafef00d-suffix-not-canonical" });
    assert.ok(r, "lenient fallback must resolve");
    assert.equal(r.slot, "kilo");
  });
});

// ---------------------------------------------------------------------------
// T6: nothing matches -> null (no throw on empty doc / unknown id).
// ---------------------------------------------------------------------------
describe("resolveSlotShared T6: no match -> null", () => {
  it("returns null for an unknown chat and tolerates empty/missing docs", () => {
    assert.equal(resolveSlotShared(doc({ alpha: "claude-11111111" }), { sessionId: "99999999-x" }), null);
    assert.equal(resolveSlotShared(null, { sessionId: "abc" }), null);
    assert.equal(resolveSlotShared({}, { sessionId: "abc" }), null);
    assert.equal(resolveSlotShared(doc({}), {}), null);
  });
});

// ---------------------------------------------------------------------------
// T7 (drift-guard): inlined SLOT_NAMES must equal chat-slots.mjs canonical set.
// ---------------------------------------------------------------------------
describe("resolveSlotShared T7: SLOT_NAMES drift-guard", () => {
  it("inlined SLOT_NAMES matches chat-slots.mjs canonical SLOT_NAMES", () => {
    assert.deepEqual(SLOT_NAMES, CANON_SLOT_NAMES);
  });
});
