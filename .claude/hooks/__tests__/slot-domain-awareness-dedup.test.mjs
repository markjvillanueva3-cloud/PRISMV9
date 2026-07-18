// slot-domain-awareness-dedup.test.mjs
// -------------------------------------
// TOKEN-SAVINGS-EXPAND — verifies the injection-dedup adopter in
// slot-domain-awareness-inject.mjs. The hook emits a static slot-domain table on
// every UserPromptSubmit; the dedup gate must emit the FULL table only on
// first-emit / TTL-expiry / content-change, and a 1-line marker otherwise.
//
// Hermetic: each test builds a temp PRISM_ROOT with the two state files the hook
// reads (CHAT-SLOT-DOMAINS.md + chat-slots.json), so the dedup sidecar is written
// inside the fixture and the real H:/prism sidecar is never touched.
//
// R9: tests assert WHICH block was emitted (table vs marker) by content, and the
// content-change test proves the gate is content-keyed — a naive "emit once per
// session" impl would FAIL test 3.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HOOK = join(dirname(fileURLToPath(import.meta.url)), "..", "slot-domain-awareness-inject.mjs");

const DOMAINS_A = `# Chat-slot domains

| Slot | Domain |
|------|--------|
| **ALPHA** | Token optimization |
| **BRAVO** | Hermes building |

## Slots without explicit domain
`;

// Same shape, one domain text changed → block hash must change → must re-emit.
const DOMAINS_B = `# Chat-slot domains

| Slot | Domain |
|------|--------|
| **ALPHA** | Token optimization AND obsidian vault |
| **BRAVO** | Hermes building |

## Slots without explicit domain
`;

function makeRoot(domainsMd, { chatId } = {}) {
  const root = mkdtempSync(join(tmpdir(), "sd-dedup-"));
  const shared = join(root, "state", "shared");
  mkdirSync(shared, { recursive: true });
  writeFileSync(join(shared, "CHAT-SLOT-DOMAINS.md"), domainsMd, "utf8");
  const slots = chatId ? { alpha: { chatId } } : {};
  writeFileSync(join(shared, "chat-slots.json"), JSON.stringify({ slots }), "utf8");
  return root;
}

function runHook(root, sessionId, extraEnv = {}) {
  const env = { ...process.env, PRISM_ROOT: root, ...extraEnv };
  const input = sessionId === undefined ? "{}" : JSON.stringify({ session_id: sessionId });
  const r = spawnSync(process.execPath, [HOOK], { input, encoding: "utf8", env });
  assert.equal(r.status, 0, `hook exited non-zero: ${r.stderr}`);
  let parsed;
  try { parsed = JSON.parse(r.stdout); } catch { assert.fail(`non-JSON stdout: ${r.stdout}`); }
  return parsed?.hookSpecificOutput?.additionalContext ?? "";
}

const isTable = (c) => c.includes("Chat-slot domains") && c.includes("ALPHA");
const isMarker = (c) => c.startsWith("🔁") && /dedup/.test(c);

test("first-emit emits the FULL table", () => {
  const root = makeRoot(DOMAINS_A);
  try {
    const out = runHook(root, "sessAAA1unique");
    assert.ok(isTable(out), "first emit must be the full table");
    assert.ok(!isMarker(out), "first emit must not be a dedup marker");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("second emit (same sid, unchanged) emits the dedup MARKER, not the table", () => {
  const root = makeRoot(DOMAINS_A);
  try {
    const first = runHook(root, "sessBBB2unique");
    assert.ok(isTable(first), "setup: first emit should be the table");
    const second = runHook(root, "sessBBB2unique");
    assert.ok(isMarker(second), "second emit must be the dedup marker");
    assert.ok(!second.includes("ALPHA"), "dedup marker must NOT contain a domain row");
    assert.ok(second.length < first.length, "dedup marker must be shorter than the full table");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("content change between prompts RE-EMITS the full table (content-keyed, not call-count)", () => {
  // R9 strong test: a naive once-per-session gate would dedup the 2nd call even
  // though the table content changed. The hash-keyed gate must re-emit. One
  // persistent root + the SAME sid throughout (same hookTag bucket), so only the
  // content hash differs across calls.
  const sid = "sessCCC3unique";
  const root = makeRoot(DOMAINS_A);
  try {
    const a1 = runHook(root, sid);
    assert.ok(isTable(a1), "1st with DOMAINS_A → table");
    const a2 = runHook(root, sid);
    assert.ok(isMarker(a2), "2nd identical → marker");
    // change the domains file in place → new hash → must re-emit full
    writeFileSync(join(root, "state", "shared", "CHAT-SLOT-DOMAINS.md"), DOMAINS_B, "utf8");
    const b1 = runHook(root, sid);
    assert.ok(isTable(b1), "after content change → full table re-emitted");
    assert.ok(b1.includes("obsidian vault"), "re-emitted table must reflect the NEW content");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("PRISM_INJECTION_DEDUP_DISABLE=1 always emits the full table", () => {
  const root = makeRoot(DOMAINS_A);
  try {
    const first = runHook(root, "sessDDD4unique", { PRISM_INJECTION_DEDUP_DISABLE: "1" });
    const second = runHook(root, "sessDDD4unique", { PRISM_INJECTION_DEDUP_DISABLE: "1" });
    assert.ok(isTable(first) && isTable(second), "both emits must be the full table when dedup disabled");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("missing session_id emits the full table every time (zero regression)", () => {
  const root = makeRoot(DOMAINS_A);
  try {
    const first = runHook(root, undefined);
    const second = runHook(root, undefined);
    assert.ok(isTable(first) && isTable(second), "no sid → never dedups (pre-dedup behavior preserved)");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("PRISM_SLOT_DOMAIN_AWARENESS_DISABLE=1 is a silent no-op (unchanged behavior)", () => {
  const root = makeRoot(DOMAINS_A);
  try {
    const env = { ...process.env, PRISM_ROOT: root, PRISM_SLOT_DOMAIN_AWARENESS_DISABLE: "1" };
    const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ session_id: "x" }), encoding: "utf8", env });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "", "disabled hook must emit nothing");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
