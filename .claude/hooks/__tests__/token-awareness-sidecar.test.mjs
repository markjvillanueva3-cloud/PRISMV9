// TOKEN-AWARENESS-MS0 / U-TA03 — sidecar writer hook tests.
// Tests the hook as a subprocess (real stdin/stdout contract), with a tmpdir
// transcript and a synthetic chat-slots.json.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOOK = path.resolve("H:/prism/.claude/hooks/token-awareness-sidecar.mjs");
const SIDECAR_DIR = "H:/prism/state/shared";

// Helper — run the hook with given stdin payload + env, capture exit.
function runHook(stdinObj, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (code) => resolve({ code, stdout, stderr }));
    child.stdin.write(JSON.stringify(stdinObj));
    child.stdin.end();
  });
}

function readSidecar(slot) {
  const fp = path.join(SIDECAR_DIR, `token-budget-${slot}.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    return null;
  }
}

function makeTmpTranscript(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ta-sc-"));
  const fp = path.join(dir, "session.jsonl");
  fs.writeFileSync(fp, content);
  return { dir, fp };
}

// ── happy path ──────────────────────────────────────────────────────────────
test("sidecar — exit 0 on empty stdin", async () => {
  const r = await runHook({});
  assert.equal(r.code, 0);
});

test("sidecar — exit 0 on missing session_id", async () => {
  const r = await runHook({ transcript_path: "/nonexistent" });
  assert.equal(r.code, 0);
});

test("sidecar — exit 0 on malformed stdin (no crash)", async () => {
  // Send raw garbage via raw mode
  const r = await new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("exit", (code) => resolve({ code, stdout: out, stderr: err }));
    child.stdin.write("this is not json {{");
    child.stdin.end();
  });
  assert.equal(r.code, 0);
});

test("sidecar — disable knob short-circuits", async () => {
  const r = await runHook(
    { session_id: "test-disabled-123", transcript_path: "/tmp/x" },
    { PRISM_TOKEN_AWARE_SIDECAR_DISABLE: "1" },
  );
  assert.equal(r.code, 0);
  // sidecar file for slot 'unknown' should NOT have been written THIS call
  // (we can't easily prove no-write since prior runs may have created it; the
  // exit-0-fast assertion is the contract here)
});

test("sidecar — writes file for unknown slot with valid session + transcript", async () => {
  const { dir, fp } = makeTmpTranscript(
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_test", usage: { input_tokens: 100, output_tokens: 20 } },
    }) + "\n",
  );
  try {
    // Clean any stale sidecar
    const sidecarPath = path.join(SIDECAR_DIR, "token-budget-unknown.json");
    if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);

    const r = await runHook({
      session_id: "test-unknown-slot-9876",
      transcript_path: fp,
    });
    assert.equal(r.code, 0);
    const s = readSidecar("unknown");
    assert.ok(s, "sidecar should exist after hook write");
    assert.equal(s.schemaVersion, "1.0.0");
    assert.equal(s.sessionId, "test-unknown-slot-9876");
    assert.equal(s.slot, "unknown");
    assert.equal(s.hook, "token-awareness-sidecar");
    assert.ok(s.capturedAt, "capturedAt must be set");
    assert.ok(s.sources.transcript, "transcript source should be present");
    assert.equal(s.cumulative.input, 100);
    assert.equal(s.cumulative.output, 20);
    assert.ok(["GREEN", "YELLOW", "RED", "CRITICAL"].includes(s.zone));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sidecar — extracts rate_limits from v1.2.80+ stdin shape", async () => {
  const r = await runHook({
    session_id: "test-rl-1234",
    transcript_path: "/nonexistent/intentional",
    rate_limits: {
      five_hour: { used_percentage: 67, resets_at: "2026-05-20T10:00:00Z" },
      seven_day: { used_percentage: 51, resets_at: "2026-05-26T10:00:00Z" },
    },
  });
  assert.equal(r.code, 0);
  const s = readSidecar("unknown");
  assert.ok(s);
  assert.ok(s.sources.rateLimits, "rateLimits source must be true");
  assert.equal(s.quota.fiveHour.pct, 0.67);
  assert.equal(s.quota.sevenDay.pct, 0.51);
  assert.equal(s.quota.fiveHour.resetsAt, "2026-05-20T10:00:00Z");
});

test("sidecar — accepts both 0..1 and 0..100 used_percentage", async () => {
  // 0..1 form
  await runHook({
    session_id: "test-rl-frac-1",
    transcript_path: "/nonexistent",
    rate_limits: { five_hour: { used_percentage: 0.55 } },
  });
  const a = readSidecar("unknown");
  assert.equal(a.quota.fiveHour.pct, 0.55);

  // 0..100 form
  await runHook({
    session_id: "test-rl-pct-1",
    transcript_path: "/nonexistent",
    rate_limits: { five_hour: { used_percentage: 55 } },
  });
  const b = readSidecar("unknown");
  assert.equal(b.quota.fiveHour.pct, 0.55);
});

test("sidecar — zone classification end-to-end", async () => {
  // RED on 5h quota at 90%
  await runHook({
    session_id: "test-zone-red",
    transcript_path: "/nonexistent",
    rate_limits: { five_hour: { used_percentage: 90 } },
  });
  const s = readSidecar("unknown");
  assert.equal(s.zone, "RED");
  assert.equal(s.worstSource, "5h");
  assert.equal(s.action, "compact");
});

test("sidecar — schema is JSON-roundtrip-clean", async () => {
  await runHook({
    session_id: "test-schema-1",
    transcript_path: "/nonexistent",
  });
  const s = readSidecar("unknown");
  assert.ok(s);
  // Must roundtrip without loss
  const round = JSON.parse(JSON.stringify(s));
  assert.deepEqual(round, s);
});

// ── ctx estimate sanity (regression: 2026-05-20 false-positive CRITICAL) ────
// Bug: when no `"isCompactSummary":true` marker appeared in the last 4MB of a
// long-lived transcript, the fallback used stat.size (entire file including
// pre-compact bloat) → ctxTokens > ctxMax (live observation: alpha 5.27M
// against ctxMax 1.00M). Fix: cap fallback to window, sanity-clamp result.
import {
  estimateCtxFromBytes,
  CTX_SANITY_CAP_TOKENS,
  CTX_MAX_TOKENS,
  STATUSLINE_BYTES_PER_TOKEN,
  TRANSCRIPT_TAIL_BYTES,
} from "../token-awareness-sidecar.mjs";

test("estimateCtxFromBytes — small transcript, no marker: uses file size", () => {
  const { fp } = makeTmpTranscript("x".repeat(1024));
  const r = estimateCtxFromBytes(fp);
  // 1024 bytes / 3.5 = ~293 tokens
  assert.equal(r, Math.round(1024 / STATUSLINE_BYTES_PER_TOKEN));
});

test("estimateCtxFromBytes — large transcript, no marker: returns null (unknowable)", () => {
  // Transcript larger than the 4MB window with no compact marker → a /compact
  // happened older than the window. Active context size is unobservable.
  // R12 invariant: surface null, NOT a fake-credible 1.1× ctxMax (the first-cut
  // fix capped the value but still produced 100% CRITICAL).
  // Use 5MB (> 4MB window) — large enough to exercise the bug, small enough to
  // stay light on memory-pressured fleet hosts.
  const big = "x".repeat(5 * 1024 * 1024);
  const { fp } = makeTmpTranscript(big);
  const r = estimateCtxFromBytes(fp);
  assert.equal(r, null, `ctxTokens must be null for unknowable case; got ${r}`);
});

test("estimateCtxFromBytes — sub-window file, no marker: measurable, not null", () => {
  // File < TRANSCRIPT_TAIL_BYTES → entire file is observable, no compact has
  // happened yet. Must produce a real number, never null — null is reserved
  // for the genuinely-unknowable case (file > window AND no marker).
  const halfWindow = Math.floor(TRANSCRIPT_TAIL_BYTES / 2);
  const text = "x".repeat(halfWindow);
  const { fp } = makeTmpTranscript(text);
  const r = estimateCtxFromBytes(fp);
  assert.ok(r != null && r > 0, `sub-window case must return non-null; got ${r}`);
  assert.equal(r, Math.round(halfWindow / STATUSLINE_BYTES_PER_TOKEN));
});

test("estimateCtxFromBytes — compact marker in tail: only post-boundary bytes count", () => {
  // 8 MB pre-compact + marker + 1 MB live = 9 MB. Marker in last 4 MB → use
  // bytes after marker only (~1 MB → 287K tokens).
  const pre = "p".repeat(8 * 1024 * 1024);
  const marker = '{"isCompactSummary":true}\n';
  const post = "L".repeat(1024 * 1024);
  const { fp } = makeTmpTranscript(pre + marker + post);
  const r = estimateCtxFromBytes(fp);
  // Expect ~ (marker+post).length / 3.5 — well under sanity cap and well
  // under ctxMax. Crucial: must NOT report > ctxMax just because the file
  // is 9 MB total.
  assert.ok(r < CTX_MAX_TOKENS, `ctxTokens=${r} expected < ctxMax=${CTX_MAX_TOKENS}`);
  assert.ok(r > 0, "expected non-zero token estimate");
});

test("estimateCtxFromBytes — sanity cap is structurally above ctxMax", () => {
  // Sanity check on the constants themselves: cap must be above ctxMax (else
  // every healthy session looks over-budget) and below 2× ctxMax (else it's
  // not really a cap).
  assert.ok(CTX_SANITY_CAP_TOKENS > CTX_MAX_TOKENS);
  assert.ok(CTX_SANITY_CAP_TOKENS < CTX_MAX_TOKENS * 2);
});
