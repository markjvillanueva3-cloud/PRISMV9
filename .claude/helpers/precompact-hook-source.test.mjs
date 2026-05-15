// Regression tests for the precompact-hook source in per-agent-handoff.mjs
// Run: node --test H:/prism/.claude/helpers/precompact-hook-source.test.mjs
//
// Covers:
//   - precompact-hook source with valid (>=30 chars, non-placeholder) resume succeeds
//   - precompact-hook with empty/short resume → writer_banned (precompact-hook-validation)
//   - precompact-hook with placeholder resume → writer_banned (precompact-hook-validation)
//   - precompact-hook anti-clobber: fresh live-chat handoff exists → writer_banned (fresh-live-chat-resume-exists)
//   - live-chat source still accepted (regression check)
//   - random unrecognized source still rejected (regression check)

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
const TMP_DIR = path.join(os.tmpdir(), `precompact-hook-test-${process.pid}-${Date.now()}`);
const TMP_HANDOFFS = path.join(TMP_DIR, "handoffs");
const SUFFICIENT_RESUME = "Continue X — fix the foo bug in bar.ts line 42, then ship a real PR.";
const PLACEHOLDER_RESUME = "compacting — read per-agent handoff on restore";
const SHORT_RESUME = "hi";

function callWriter(args) {
  const env = { ...process.env, PRISM_HANDOFFS_DIR: TMP_HANDOFFS };
  // Use process.execPath (absolute) — bare "node" is ENOENT on Windows from spawn.
  const r = spawnSync(process.execPath, [HELPER, ...args], {
    encoding: "utf-8", timeout: 6000, env, windowsHide: true,
  });
  let parsed = null;
  try { parsed = JSON.parse((r.stdout || "").trim()); } catch {}
  return { stdout: r.stdout, stderr: r.stderr, status: r.status, json: parsed };
}

before(() => { fs.mkdirSync(TMP_HANDOFFS, { recursive: true }); });
after(() => { try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {} });
beforeEach(() => {
  // wipe handoff dir between tests so cross-test state never bleeds
  try {
    for (const f of fs.readdirSync(TMP_HANDOFFS)) {
      fs.rmSync(path.join(TMP_HANDOFFS, f), { recursive: true, force: true });
    }
  } catch {}
});

describe("precompact-hook source — happy path", () => {
  it("accepts a valid resume (>=30 chars, non-placeholder)", () => {
    const r = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-aaaaaaaa",
      "--topic", "alpha-test-topic",
      "--resume", SUFFICIENT_RESUME,
      "--state", "(test state)",
    ]);
    assert.ok(r.json, `expected JSON output, got: ${r.stdout?.slice(0, 200)}`);
    assert.equal(r.json.ok, true, `expected ok:true, got ${JSON.stringify(r.json)}`);
  });
});

describe("precompact-hook source — validation rejections", () => {
  it("rejects empty resume", () => {
    const r = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-bbbbbbbb",
      "--topic", "test-empty",
      "--resume", "",
      "--state", "(s)",
    ]);
    assert.ok(r.json);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.error, "writer_banned");
    assert.equal(r.json.rejectedBy, "precompact-hook-validation");
  });
  it("rejects too-short resume (<30 chars)", () => {
    const r = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-cccccccc",
      "--topic", "test-short",
      "--resume", SHORT_RESUME,
      "--state", "(s)",
    ]);
    assert.ok(r.json);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.rejectedBy, "precompact-hook-validation");
  });
  it("rejects known placeholder resume", () => {
    const r = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-dddddddd",
      "--topic", "test-placeholder",
      "--resume", PLACEHOLDER_RESUME,
      "--state", "(s)",
    ]);
    assert.ok(r.json);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.rejectedBy, "precompact-hook-validation");
  });
  it("rejects placeholder regardless of case", () => {
    const r = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-eeeeeeee",
      "--topic", "test-case",
      "--resume", "TRUE",  // would match "true" placeholder
      "--state", "(s)",
    ]);
    assert.ok(r.json);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.rejectedBy, "precompact-hook-validation");
  });
});

describe("precompact-hook source — anti-clobber", () => {
  it("rejects when a fresh live-chat handoff already exists", () => {
    // 1. Live chat writes a real handoff first
    const seed = callWriter([
      "write",
      "--source", "live-chat",
      "--terminal", "claude-ffffffff",
      "--topic", "anti-clobber-topic",
      "--resume", "REAL live-chat resume directive that exceeds thirty characters easily.",
      "--state", "(live)",
    ]);
    assert.equal(seed.json?.ok, true, "seed write should succeed");
    // 2. Hook tries to write to the SAME topic — should be rejected
    const hookAttempt = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-ffffffff",
      "--topic", "anti-clobber-topic",
      "--resume", "DIFFERENT synthesized resume that also exceeds thirty characters.",
      "--state", "(hook)",
    ]);
    assert.ok(hookAttempt.json);
    assert.equal(hookAttempt.json.ok, false);
    assert.equal(hookAttempt.json.rejectedBy, "fresh-live-chat-resume-exists");
  });
  it("allows hook write when no prior handoff exists", () => {
    const r = callWriter([
      "write",
      "--source", "precompact-hook",
      "--terminal", "claude-gggggggg",
      "--topic", "fresh-no-prior",
      "--resume", "Hook synthesized resume directive for a brand new chat session.",
      "--state", "(hook)",
    ]);
    assert.equal(r.json?.ok, true, `expected ok:true, got ${JSON.stringify(r.json)}`);
  });
});

describe("regression checks — other sources unaffected", () => {
  it("live-chat source still accepted (was broken before would mean a regression)", () => {
    const r = callWriter([
      "write",
      "--source", "live-chat",
      "--terminal", "claude-hhhhhhhh",
      "--topic", "regression-live-chat",
      "--resume", "live-chat write still works after the precompact-hook addition.",
      "--state", "(live)",
    ]);
    assert.equal(r.json?.ok, true);
  });
  it("unknown source still rejected with the original ban message", () => {
    const r = callWriter([
      "write",
      "--source", "some-other-hook",
      "--terminal", "claude-iiiiiiii",
      "--topic", "regression-unknown",
      "--resume", "A reasonable resume that nonetheless comes from a banned source.",
      "--state", "(other)",
    ]);
    assert.ok(r.json);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.error, "writer_banned");
    // No rejectedBy field on the original ban path
    assert.equal(r.json.rejectedBy, undefined);
  });
  it("no source flag still rejected (defaults to banned)", () => {
    const r = callWriter([
      "write",
      "--terminal", "claude-jjjjjjjj",
      "--topic", "regression-no-source",
      "--resume", "A reasonable resume but with no source flag at all.",
      "--state", "(none)",
    ]);
    assert.ok(r.json);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.error, "writer_banned");
  });
});
