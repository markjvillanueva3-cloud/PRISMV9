// SESSION-CONTINUITY-MS0 (2026-05-22) -- behavioral tests for the slot-keyed
// handoff read tier in per-agent-handoff.mjs.
//
// The bug: work-slot handoffs are instance-keyed (HANDOFF-<claude-id>-<topic>.md).
// After a full terminal restart the chat's session-id is brand new, so an
// instance-keyed read MISSES every tier and falls through to family-latest --
// returning a random peer chat's handoff. `read --slot <nato>` resolves the
// handoff by the durable `slot:` frontmatter field instead, so /checkin-<nato>
// resumes the correct slot after a restart.
//
// These tests run the real CLI as a subprocess against an isolated
// PRISM_HANDOFFS_DIR, so they verify the actual `read --slot` contract --
// not a mocked internal. Each test would FAIL if the slot-keyed tier were
// removed (the read would fall through to newest-wins / family-latest).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = path.resolve("H:/prism/.claude/helpers/per-agent-handoff.mjs");

/**
 * Run per-agent-handoff.mjs with an isolated handoffs directory.
 * input:"" closes the child's stdin so readStdinSessionId() gets EOF
 * immediately instead of blocking on an open pipe.
 */
function runHandoff(args, handoffsDir) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf-8",
    input: "",
    env: { ...process.env, PRISM_HANDOFFS_DIR: handoffsDir },
  });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { ok: false, _parseFailed: true, _raw: r.stdout, _stderr: r.stderr };
  }
}

/** Write a fixture handoff with the given frontmatter + RESUME body. */
function writeHandoff(dir, name, frontmatter, resume, ageSeconds = 0) {
  const fm = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join("\n");
  const content =
    `---\n${fm}\n---\n\n# HANDOFF\nUpdated: now\n\n` +
    `## STATE\nfixture state\n\n## RESUME\n${resume}\n\n## CONTEXT\n\n`;
  const fp = path.join(dir, name);
  fs.writeFileSync(fp, content);
  if (ageSeconds > 0) {
    const t = new Date(Date.now() - ageSeconds * 1000);
    fs.utimesSync(fp, t, t);
  }
  return fp;
}

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-handoff-slot-"));
}

test("slot-keyed read returns the slot's own handoff, not a newer peer's", () => {
  const dir = mkTmp();
  try {
    // bravo's handoff -- older.
    writeHandoff(dir, "HANDOFF-claude-old11111-bravo-work.md",
      { session: "claude-old11111", topic: "bravo-work", slot: "bravo" },
      "BRAVO prior session work", 1000);
    // a peer alpha handoff -- NEWER. A naive newest-wins read grabs this.
    writeHandoff(dir, "HANDOFF-claude-peer22222-alpha-work.md",
      { session: "claude-peer22222", topic: "alpha-work", slot: "alpha" },
      "ALPHA peer work", 0);
    const r = runHandoff(["read", "--slot", "bravo"], dir);
    assert.equal(r.ok, true, "read --slot bravo should succeed");
    assert.equal(r.matchedBy, "slot-frontmatter");
    assert.match(r.content, /BRAVO prior session work/);
    assert.doesNotMatch(r.content, /ALPHA peer work/,
      "must NOT return the newer alpha peer handoff");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("slot-keyed read is per-slot isolated -- alpha returns alpha", () => {
  const dir = mkTmp();
  try {
    writeHandoff(dir, "HANDOFF-claude-old11111-bravo-work.md",
      { session: "claude-old11111", topic: "bravo-work", slot: "bravo" },
      "BRAVO work", 1000);
    writeHandoff(dir, "HANDOFF-claude-peer22222-alpha-work.md",
      { session: "claude-peer22222", topic: "alpha-work", slot: "alpha" },
      "ALPHA work", 0);
    const r = runHandoff(["read", "--slot", "alpha"], dir);
    assert.equal(r.ok, true);
    assert.match(r.content, /ALPHA work/);
    assert.doesNotMatch(r.content, /BRAVO work/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("slot-keyed read is authoritative -- no handoff yields no_slot_handoff, never a peer", () => {
  const dir = mkTmp();
  try {
    // Only an alpha handoff exists -- a fall-through would wrongly return it.
    writeHandoff(dir, "HANDOFF-claude-peer22222-alpha-work.md",
      { session: "claude-peer22222", topic: "alpha-work", slot: "alpha" },
      "ALPHA work", 0);
    const r = runHandoff(["read", "--slot", "bravo"], dir);
    assert.equal(r.ok, false, "no bravo handoff -> ok:false");
    assert.equal(r.error, "no_slot_handoff");
    assert.equal(r.slot, "bravo");
    // Critically: it must NOT fall through to the alpha peer's content.
    assert.equal(r.content, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("slot-keyed read falls back to the topic prefix when slot: is absent", () => {
  const dir = mkTmp();
  try {
    // Handoff predating the slot: frontmatter field -- only the topic prefix
    // (charlie-...) carries the slot identity.
    writeHandoff(dir, "HANDOFF-claude-leg33333-charlie-legacy.md",
      { session: "claude-leg33333", topic: "charlie-legacy" },
      "CHARLIE legacy work", 0);
    const r = runHandoff(["read", "--slot", "charlie"], dir);
    assert.equal(r.ok, true, "topic-prefix fallback should resolve charlie");
    assert.match(r.content, /CHARLIE legacy work/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("slot-keyed read returns the most-recent handoff for the slot", () => {
  const dir = mkTmp();
  try {
    writeHandoff(dir, "HANDOFF-claude-d1-delta-old.md",
      { session: "claude-d1", topic: "delta-old", slot: "delta" },
      "DELTA stale work", 5000);
    writeHandoff(dir, "HANDOFF-claude-d2-delta-fresh.md",
      { session: "claude-d2", topic: "delta-fresh", slot: "delta" },
      "DELTA freshest work", 10);
    const r = runHandoff(["read", "--slot", "delta"], dir);
    assert.equal(r.ok, true);
    assert.match(r.content, /DELTA freshest work/);
    assert.doesNotMatch(r.content, /DELTA stale work/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── U-HANDOFF-READ-SLOT-AWARE (2026-06-18, slot:alpha) ──────────────────────
// The "keep checking back into papa" bug: a terminal that churned papa->alpha
// accumulates handoffs under BOTH slots. The bare `read --terminal <id>` tier
// (same-instance-newest) was SLOT-BLIND -> returned the newest handoff (papa) ->
// every resume path (auto-resume, /loop, /checkin) re-emitted /startup-papa even
// though chat-slots says the chat now owns alpha. Tier (0.4) makes the read
// prefer the CURRENT-SLOT handoff (from chat-slots ground truth) over the newest.
//
// chatSlotsPath() derives from HANDOFFS_DIR/../chat-slots.json, so these tests
// put PRISM_HANDOFFS_DIR at <tmp>/handoffs and chat-slots at <tmp>/chat-slots.json.

function mkTmpWithSlots(slots) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-handoff-curslot-"));
  const dir = path.join(root, "handoffs");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, "chat-slots.json"),
    JSON.stringify({ schemaVersion: 1, slots }));
  return { root, dir };
}

test("read prefers the chat's CURRENT-SLOT handoff over a newer cross-slot one (the papa bug)", () => {
  const { root, dir } = mkTmpWithSlots({
    alpha: { chatId: "claude-curslot1" },   // this chat NOW owns alpha
    papa: { chatId: "claude-other999" },
  });
  try {
    // PAPA handoff for this chat -- NEWER (the churned-away stale one).
    writeHandoff(dir, "HANDOFF-claude-curslot1-papa-work.md",
      { session: "claude-curslot1", topic: "papa-work", slot: "papa" }, "PAPA stale work", 0);
    // ALPHA handoff for this chat -- OLDER (the one resume SHOULD pick).
    writeHandoff(dir, "HANDOFF-claude-curslot1-alpha-session.md",
      { session: "claude-curslot1", topic: "alpha-session", slot: "alpha" }, "ALPHA current work", 1000);
    const r = runHandoff(["read", "--agent", "claude-curslot1"], dir);
    assert.equal(r.ok, true);
    assert.equal(r.matchedBy, "same-instance-current-slot", "must prefer owned-slot, not newest-wins");
    assert.equal(r.slot, "alpha");
    assert.match(r.content, /ALPHA current work/);
    assert.doesNotMatch(r.content, /PAPA stale work/, "must NOT resume the newer cross-slot papa handoff");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("read falls through to same-instance-newest when the chat owns NO slot (byte-identical legacy)", () => {
  // chat-slots present but this chat is not an owner -> no slot preference ->
  // old behavior (newest-wins) must be preserved exactly.
  const { root, dir } = mkTmpWithSlots({ alpha: { chatId: "claude-someoneelse" } });
  try {
    writeHandoff(dir, "HANDOFF-claude-noown1-papa-work.md",
      { session: "claude-noown1", topic: "papa-work", slot: "papa" }, "NEWEST wins", 0);
    writeHandoff(dir, "HANDOFF-claude-noown1-alpha-x.md",
      { session: "claude-noown1", topic: "alpha-x", slot: "alpha" }, "older alpha", 1000);
    const r = runHandoff(["read", "--agent", "claude-noown1"], dir);
    assert.equal(r.ok, true);
    assert.equal(r.matchedBy, "same-instance-newest", "unowned chat -> legacy newest-wins");
    assert.match(r.content, /NEWEST wins/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("read falls through to newest when the owned slot has NO matching handoff (no starvation)", () => {
  // Chat owns alpha but only has papa handoffs -> tier 0.4 finds nothing ->
  // must still return something (newest), never an empty/no-handoff result.
  const { root, dir } = mkTmpWithSlots({ alpha: { chatId: "claude-onlyp1" } });
  try {
    writeHandoff(dir, "HANDOFF-claude-onlyp1-papa-work.md",
      { session: "claude-onlyp1", topic: "papa-work", slot: "papa" }, "only papa exists", 0);
    const r = runHandoff(["read", "--agent", "claude-onlyp1"], dir);
    assert.equal(r.ok, true);
    assert.equal(r.matchedBy, "same-instance-newest");
    assert.match(r.content, /only papa exists/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("read uses the durable slot: frontmatter when the topic is NOT slot-prefixed", () => {
  // Filename topic prefix misses (topic 'resume-here' has no slot prefix) but
  // the slot: frontmatter binds it to alpha -> pass-2 frontmatter match wins.
  const { root, dir } = mkTmpWithSlots({ alpha: { chatId: "claude-fm1" } });
  try {
    writeHandoff(dir, "HANDOFF-claude-fm1-papa-work.md",
      { session: "claude-fm1", topic: "papa-work", slot: "papa" }, "PAPA newer", 0);
    writeHandoff(dir, "HANDOFF-claude-fm1-resume-here.md",
      { session: "claude-fm1", topic: "resume-here", slot: "alpha" }, "ALPHA via frontmatter", 1000);
    const r = runHandoff(["read", "--agent", "claude-fm1"], dir);
    assert.equal(r.ok, true);
    assert.equal(r.matchedBy, "same-instance-current-slot");
    assert.equal(r.slot, "alpha");
    assert.match(r.content, /ALPHA via frontmatter/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
