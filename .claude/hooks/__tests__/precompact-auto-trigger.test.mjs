// Regression tests for precompact-auto-trigger.mjs compact-boundary fix
// (2026-05-15). Protect against the bug where estimateFromBytes() divided the
// ENTIRE transcript size by 3.5 and reported pre-compact bloat as current-
// context tokens (1.43M-token false positive observed in session 6eac1b66).
//
// Uses Node's built-in `node:test` runner so it runs without depending on
// vitest discovery config. Invoke with:
//   node --test H:/prism/.claude/hooks/__tests__/precompact-auto-trigger.test.mjs

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/precompact-auto-trigger.mjs";
const CONTEXT_CAP = 1_000_000;

let tmpDir;
let transcriptPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "precompact-test-"));
  transcriptPath = path.join(tmpDir, "transcript.jsonl");
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

function writeJsonl(entries) {
  fs.writeFileSync(transcriptPath, entries.map(e => JSON.stringify(e)).join("\n") + "\n");
}

function runHook(stdinObj) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj),
    encoding: "utf-8",
    timeout: 10_000,
  });
  if (r.status !== 0 && !r.stdout) {
    throw new Error(`hook crashed: ${r.stderr || r.error?.message || "unknown"}`);
  }
  try { return JSON.parse(r.stdout || "{}"); }
  catch { throw new Error(`hook emitted non-JSON: ${r.stdout?.slice(0, 200)}`); }
}

function assistantEntry(totalTokens, opts = {}) {
  return {
    type: "assistant",
    timestamp: opts.timestamp || new Date().toISOString(),
    isCompactSummary: opts.isCompactSummary || false,
    message: {
      content: opts.content || [],
      usage: {
        input_tokens: 0,
        cache_read_input_tokens: totalTokens,
        cache_creation_input_tokens: 0,
      },
    },
  };
}

describe("precompact-auto-trigger compact-boundary fix", () => {
  it("returns silent continue on a fresh small transcript", () => {
    writeJsonl([assistantEntry(50_000)]);
    const out = runHook({
      session_id: "test-fresh-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
  });

  it("does NOT hard-block when a compact summary precedes huge pre-compact bytes", () => {
    // 6+ MB of pre-compact noise + isCompactSummary marker + small post-compact tail.
    // Without the fix, byte-estimate would report ~1.7M tokens → HARD BLOCK.
    const noisyTurn = (i) => ({
      type: "user",
      timestamp: new Date(Date.now() - 1000 * (1000 - i)).toISOString(),
      message: { content: "x".repeat(2000) },
    });
    const lines = [];
    for (let i = 0; i < 3000; i++) lines.push(noisyTurn(i));
    lines.push(assistantEntry(420_000, { isCompactSummary: true }));   // boundary
    lines.push(assistantEntry(285_000));                                // post-compact
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    assert.ok(st.size > 5_000_000, `expected >5MB transcript, got ${st.size}`);

    const out = runHook({
      session_id: "test-compact-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Pre-fix this returned {decision:"block",reason:"CONTEXT AT 1,xxx,xxx TOKENS..."}
    assert.notEqual(out.decision, "block", `unexpected hard-block: ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
  });

  it("DOES hard-block when post-compact tokens are legitimately high", () => {
    const lines = [
      assistantEntry(100_000, { isCompactSummary: true }),
      assistantEntry(950_000),
    ];
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-hard-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.equal(out.decision, "block");
    assert.match(out.reason, /CONTEXT AT|PRECOMPACT/);
  });

  it("falls back to legacy byte-estimate when no compact marker exists", () => {
    writeJsonl([assistantEntry(50_000)]);
    const out = runHook({
      session_id: "test-nocompact-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.equal(out.continue, true);
  });

  it("tightened 1.1× cap sanity floor catches broken counts without hard-blocking", () => {
    const lines = [assistantEntry(100_000, { isCompactSummary: true })];
    const noisy = "x".repeat(2_000);
    for (let i = 0; i < 2_500; i++) lines.push({ type: "user", message: { content: noisy } });
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    assert.ok(st.size > CONTEXT_CAP * 1.1 * 3.5, `expected size to exceed sanity floor, got ${st.size}`);

    const out = runHook({
      session_id: "test-sanityfloor-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Either no block, or sanity-floor branch advisory — never decision:block.
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });

  it("uses the LAST compact summary when the transcript has multiple", () => {
    const lines = [];
    lines.push(assistantEntry(800_000, { isCompactSummary: true }));   // early compact
    const noisy = "y".repeat(1500);
    for (let i = 0; i < 1500; i++) lines.push({ type: "user", message: { content: noisy } });
    lines.push(assistantEntry(200_000, { isCompactSummary: true }));   // last compact
    lines.push(assistantEntry(280_000));                                 // healthy
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-multicompact-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });

  it("ignores assistant usage from before the most recent compact boundary", () => {
    const lines = [
      assistantEntry(950_000),                                  // pre-compact, would block
      assistantEntry(50_000, { isCompactSummary: true }),       // boundary
      assistantEntry(120_000),                                  // post-compact, healthy
    ];
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-ignorepre-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });
});
