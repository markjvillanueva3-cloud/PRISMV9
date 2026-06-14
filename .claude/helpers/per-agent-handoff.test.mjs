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
