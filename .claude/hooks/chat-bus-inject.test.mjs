// Tests for chat-bus-inject.mjs U-COORD09 (Ambient Awareness Badge) —
// compact-mode toggle exported alongside the verbose formatBrief.
// Uses node:test — vitest harness broken per [[reference_fleet_reaper_ms1]].
// Run: node --test H:/prism/.claude/hooks/chat-bus-inject.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPACT_MODE_ENV,
  formatCompactBadge,
  formatBrief,
} from "./chat-bus-inject.mjs";

// ─── helpers ───────────────────────────────────────────────────────────────

function mkPeer(id, ageMin = 1) {
  return { sessionId: id, pcName: "PC-test", ageMin };
}
function mkClaim(p, sid = "peer-x", intent = "edit") {
  return {
    path: p,
    sessionId: sid,
    intent,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}
function mkMsg(body, sid = "peer-y") {
  return {
    sessionId: sid,
    pcName: "PC-test",
    kind: "message",
    body,
    ts: new Date().toISOString(),
  };
}

// ─── COMPACT_MODE_ENV export ──────────────────────────────────────────────

test("COMPACT_MODE_ENV exports the canonical env-var name", () => {
  // The hook documentation, the README, and operator muscle-memory all key
  // on this exact string — drift here is a cross-doc rot risk.
  assert.equal(COMPACT_MODE_ENV, "PRISM_CHAT_BUS_COMPACT");
});

// ─── formatCompactBadge — empty-return contract ────────────────────────────

test("formatCompactBadge — returns empty string when peers + claims + messages are all zero", () => {
  const out = formatCompactBadge({
    messages: [],
    claims: [],
    peers: [],
    sessionId: "claude-test",
  });
  assert.equal(out, "");
});

// ─── formatCompactBadge — single-category emission ─────────────────────────

test("formatCompactBadge — peers-only surfaces peer count (intentional deviation from formatBrief)", () => {
  const out = formatCompactBadge({
    messages: [],
    claims: [],
    peers: [mkPeer("peer-1"), mkPeer("peer-2"), mkPeer("peer-3")],
    sessionId: "claude-test",
  });
  assert.match(out, /3 peers online/);
  assert.doesNotMatch(out, /foreign claim/);
  assert.doesNotMatch(out, /unread/);
});

test("formatCompactBadge — claims-only surfaces claim count", () => {
  const out = formatCompactBadge({
    messages: [],
    claims: [mkClaim("a"), mkClaim("b")],
    peers: [],
    sessionId: "claude-test",
  });
  assert.match(out, /2 foreign claims/);
  // Negatives must match the count *phrase*, not the bare word — the footer
  // mentions "peer/claim list" which would false-positive a bare /peer/.
  assert.doesNotMatch(out, /\d+ peers? online/);
  assert.doesNotMatch(out, /\d+ unread/);
});

test("formatCompactBadge — messages-only surfaces unread count", () => {
  const out = formatCompactBadge({
    messages: [mkMsg("hi")],
    claims: [],
    peers: [],
    sessionId: "claude-test",
  });
  assert.match(out, /1 unread/);
  assert.doesNotMatch(out, /\d+ peers? online/);
  assert.doesNotMatch(out, /\d+ foreign claims?/);
});

// ─── formatCompactBadge — combined emission ────────────────────────────────

test("formatCompactBadge — all three categories appear when all non-zero", () => {
  const out = formatCompactBadge({
    messages: [mkMsg("hi"), mkMsg("there")],
    claims: [mkClaim("/foo"), mkClaim("/bar"), mkClaim("/baz")],
    peers: [mkPeer("p1")],
    sessionId: "claude-test",
  });
  assert.match(out, /1 peer online/);
  assert.match(out, /3 foreign claims/);
  assert.match(out, /2 unread/);
  // Separator invariant — kills a mutation that swaps " · " for plain " ".
  // The middot delimiter is what visually disambiguates the badge from a
  // natural-language sentence.
  assert.match(out, / · /);
});

// ─── formatCompactBadge — singular vs plural agreement ────────────────────

test("formatCompactBadge — singular forms for count=1 (peer / claim / unread)", () => {
  const out = formatCompactBadge({
    messages: [mkMsg("one")],
    claims: [mkClaim("/only")],
    peers: [mkPeer("p1")],
    sessionId: "claude-test",
  });
  assert.match(out, /1 peer online/);
  assert.match(out, /1 foreign claim\b/); // \b prevents matching "claims"
  // "unread" has no plural form in this format — same word either way
  assert.match(out, /1 unread/);
});

test("formatCompactBadge — plural forms for count>1 (peers / claims)", () => {
  const out = formatCompactBadge({
    messages: [],
    claims: [mkClaim("/a"), mkClaim("/b")],
    peers: [mkPeer("a"), mkPeer("b")],
    sessionId: "claude-test",
  });
  assert.match(out, /2 peers online/);
  assert.match(out, /2 foreign claims/);
});

// ─── formatCompactBadge — single-line + bounded-size invariants ───────────

test("formatCompactBadge — output contains NO newline characters (single-line invariant)", () => {
  const out = formatCompactBadge({
    messages: [mkMsg("with\nnewlines"), mkMsg("x")],
    claims: [mkClaim("/foo")],
    peers: [mkPeer("p1")],
    sessionId: "claude-test",
  });
  assert.doesNotMatch(out, /\n/);
});

test("formatCompactBadge — bounded size (≤ 256 chars) at realistic fleet scale", () => {
  // Realistic fleet: 12 chats max; the badge ignores the actual peer
  // lists (it only emits counts) so even pathological inputs should not
  // bloat. This is the token-reduction property the unit is named after.
  const peers = Array.from({ length: 50 }, (_, i) => mkPeer(`peer-${i}`));
  const claims = Array.from({ length: 100 }, (_, i) => mkClaim(`/p${i}`));
  const messages = Array.from({ length: 100 }, (_, i) => mkMsg(`m${i}`));
  const out = formatCompactBadge({
    messages,
    claims,
    peers,
    sessionId: "claude-stress",
  });
  assert.ok(
    out.length <= 256,
    `badge length ${out.length} exceeds 256-char ceiling: ${out}`
  );
});

test("formatCompactBadge — embeds the session id verbatim for operator visibility", () => {
  const out = formatCompactBadge({
    messages: [],
    claims: [],
    peers: [mkPeer("p1")],
    sessionId: "claude-a61bbf34",
  });
  assert.match(out, /claude-a61bbf34/);
});

test("formatCompactBadge — names PRISM_CHAT_BUS_COMPACT in the footer so operators know how to disable", () => {
  const out = formatCompactBadge({
    messages: [],
    claims: [],
    peers: [mkPeer("p1")],
    sessionId: "claude-test",
  });
  assert.match(out, /PRISM_CHAT_BUS_COMPACT/);
});

// ─── formatBrief regression — verbose path unchanged ──────────────────────

test("formatBrief — still suppresses peers-only state (regression: contract unchanged by U-COORD09)", () => {
  const out = formatBrief({
    messages: [],
    claims: [],
    peers: [mkPeer("p1"), mkPeer("p2")],
    sessionId: "claude-test",
  });
  // Pre-U-COORD09 behavior: peers-only returns "" because messages.length === 0
  // AND claims.length === 0. The verbose formatter is unchanged here.
  assert.equal(out, "");
});

test("formatBrief — still suppresses fully-empty state (regression)", () => {
  const out = formatBrief({
    messages: [],
    claims: [],
    peers: [],
    sessionId: "claude-test",
  });
  assert.equal(out, "");
});

test("formatBrief — still emits verbose multi-line block when there are claims", () => {
  const out = formatBrief({
    messages: [],
    claims: [mkClaim("/foo")],
    peers: [mkPeer("p1")],
    sessionId: "claude-test",
  });
  // Multi-line is the verbose contract — count newlines to confirm.
  const newlineCount = (out.match(/\n/g) || []).length;
  assert.ok(
    newlineCount >= 3,
    `expected verbose multi-line block, got ${newlineCount} newlines: ${out}`
  );
  assert.match(out, /🔗 Chat Bus/);
  assert.match(out, /Files claimed by OTHER chats/);
});
