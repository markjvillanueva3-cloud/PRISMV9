// Tests for stop-obsidian-memory-extract.mjs — U-MEMO-EXTRACT-THROTTLE
// (slot:sierra 2026-06-09). Verifies the two fixed bugs encode INTENT (R9):
//   1. per-SESSION throttle (was fleet-global → starved all 26 chats)
//   2. transcript resolved from the stdin transcript_path (was largest-by-size)
// plus the supporting helpers (stdin parse, sanitize, prune, message extract).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readStdinPayload,
  sanitizeSessionId,
  sessionRateFile,
  checkRateLimit,
  recordRate,
  pruneStaleRateFiles,
  resolveTranscript,
  extractMessagesFromTranscript,
  MIN_INTERVAL_MS,
  RATE_DIR,
} from "../stop-obsidian-memory-extract.mjs";

function tmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `memo-extract-${label}-`));
}

// ── sanitizeSessionId ──────────────────────────────────────────────────────
test("sanitizeSessionId: normal id passes through", () => {
  assert.equal(sanitizeSessionId("0e5669d2-0f99-48ce-941d-0eac73b5624f"), "0e5669d2-0f99-48ce-941d-0eac73b5624f");
});
test("sanitizeSessionId: empty / null / non-string -> __global", () => {
  assert.equal(sanitizeSessionId(""), "__global");
  assert.equal(sanitizeSessionId(null), "__global");
  assert.equal(sanitizeSessionId(undefined), "__global");
  assert.equal(sanitizeSessionId(42), "__global");
});
test("sanitizeSessionId: dot-only / all-separator -> __global (no degenerate filename)", () => {
  assert.equal(sanitizeSessionId("."), "__global");
  assert.equal(sanitizeSessionId(".."), "__global");
  assert.equal(sanitizeSessionId("///"), "__global"); // separators -> "_" -> stripped -> empty -> __global
});
test("sessionRateFile: malicious session ids cannot escape RATE_DIR (path containment)", () => {
  const base = path.join(os.tmpdir(), "ratebase");
  for (const evil of ["../../etc/passwd", "a; rm -rf /", "..", "x/../../y", "..\\..\\win"]) {
    const f = sessionRateFile(evil, base);
    const stem = path.basename(f).replace(/\.json$/, "");
    assert.ok(!/[\\/]/.test(stem), `stem free of path separators: ${stem}`);
    assert.equal(path.resolve(path.dirname(f)), path.resolve(base), `resolved file stays directly under RATE_DIR: ${f}`);
  }
});

// ── sessionRateFile ────────────────────────────────────────────────────────
test("sessionRateFile: distinct sessions -> distinct files (the core fix)", () => {
  const a = sessionRateFile("sessA", RATE_DIR);
  const b = sessionRateFile("sessB", RATE_DIR);
  assert.notEqual(a, b, "two sessions MUST map to different rate files");
  assert.ok(a.endsWith("sessA.json"));
  assert.ok(b.endsWith("sessB.json"));
});
test("sessionRateFile: missing session -> __global file", () => {
  assert.ok(sessionRateFile(undefined, RATE_DIR).endsWith("__global.json"));
});

// ── checkRateLimit / recordRate round-trip + PER-SESSION ISOLATION ─────────
test("recordRate then checkRateLimit within interval -> throttled", () => {
  const dir = tmpDir("rt");
  const f = path.join(dir, "s.json");
  const t0 = 1_000_000;
  recordRate(f, t0);
  assert.equal(checkRateLimit(f, t0 + 1000), true, "just-recorded -> within interval -> throttled");
});
test("checkRateLimit: no prior file -> not throttled (first extraction allowed)", () => {
  const dir = tmpDir("fresh");
  assert.equal(checkRateLimit(path.join(dir, "never.json"), Date.now()), false);
});
test("checkRateLimit: past the interval -> not throttled (expires)", () => {
  const dir = tmpDir("exp");
  const f = path.join(dir, "s.json");
  const t0 = 5_000_000;
  recordRate(f, t0);
  assert.equal(checkRateLimit(f, t0 + MIN_INTERVAL_MS + 1), false, "after MIN_INTERVAL_MS -> allowed again");
});
test("PER-SESSION ISOLATION: session A recording does NOT throttle session B (anti-fleet-global)", () => {
  const dir = tmpDir("iso");
  const fA = sessionRateFile("chatA", dir);
  const fB = sessionRateFile("chatB", dir);
  const t0 = 9_000_000;
  recordRate(fA, t0);
  // The pre-fix bug: ONE shared file meant A's extraction throttled B fleet-wide.
  assert.equal(checkRateLimit(fA, t0 + 1000), true, "A is throttled by its own record");
  assert.equal(checkRateLimit(fB, t0 + 1000), false, "B must be UNAFFECTED by A — this fails if reverted to a single fleet-global rate file");
});

// ── pruneStaleRateFiles ────────────────────────────────────────────────────
test("pruneStaleRateFiles: removes only files older than maxAge; returns count", () => {
  const dir = tmpDir("prune");
  const fresh = path.join(dir, "fresh.json");
  const stale = path.join(dir, "stale.json");
  fs.writeFileSync(fresh, "{}");
  fs.writeFileSync(stale, "{}");
  // backdate `stale` 48h via utimes
  const old = (Date.now() - 48 * 60 * 60 * 1000) / 1000;
  fs.utimesSync(stale, old, old);
  const pruned = pruneStaleRateFiles(dir, 24 * 60 * 60 * 1000, Date.now());
  assert.equal(pruned, 1, "exactly the stale file pruned");
  assert.ok(fs.existsSync(fresh), "fresh kept");
  assert.ok(!fs.existsSync(stale), "stale removed");
});
test("pruneStaleRateFiles: missing dir -> 0, no throw", () => {
  assert.equal(pruneStaleRateFiles(path.join(os.tmpdir(), "nope-" + Math.random().toString(36).slice(2)), 1000, Date.now()), 0);
});

// ── readStdinPayload ───────────────────────────────────────────────────────
test("readStdinPayload: valid JSON via injected provider", () => {
  const p = readStdinPayload(() => '{"session_id":"abc","transcript_path":"/x/y.jsonl"}');
  assert.equal(p.session_id, "abc");
  assert.equal(p.transcript_path, "/x/y.jsonl");
});
test("readStdinPayload: empty / whitespace / malformed -> {} (fail-soft, never throws)", () => {
  assert.deepEqual(readStdinPayload(() => ""), {});
  assert.deepEqual(readStdinPayload(() => "   \n"), {});
  assert.deepEqual(readStdinPayload(() => "{not json"), {});
  assert.deepEqual(readStdinPayload(() => { throw new Error("stdin gone"); }), {});
});

// ── resolveTranscript ──────────────────────────────────────────────────────
test("resolveTranscript: reads the explicit stdin transcript_path (THIS session)", () => {
  const dir = tmpDir("resolve");
  const tp = path.join(dir, "session.jsonl");
  fs.writeFileSync(tp, '{"type":"assistant","message":{"content":"hello"}}\n');
  const out = resolveTranscript(tp);
  assert.ok(out.includes("hello"), "content of the explicit path is returned");
});
test("resolveTranscript: returns only the last 30KB window of a large transcript", () => {
  const dir = tmpDir("big");
  const tp = path.join(dir, "big.jsonl");
  const head = "HEADMARKER_OLD" + "X".repeat(40000);
  const tail = "TAILMARKER_UNIQUE";
  fs.writeFileSync(tp, head + tail);
  const out = resolveTranscript(tp);
  assert.ok(out.length <= 30000, `window capped at 30KB, got ${out.length}`);
  assert.ok(out.includes(tail), "the recent tail is preserved");
  assert.ok(!out.includes("HEADMARKER_OLD"), "the old head is dropped (only the recent window survives)");
});
test("resolveTranscript: missing explicit path -> falls back without throwing", () => {
  // Fallback hits the real TRANSCRIPT_DIR (latest-by-mtime); we only assert it
  // is non-throwing and returns null|string (hermetic re: shape, not content).
  const out = resolveTranscript("/does/not/exist/" + Math.random().toString(36).slice(2) + ".jsonl");
  assert.ok(out === null || typeof out === "string");
});

// ── extractMessagesFromTranscript ──────────────────────────────────────────
test("extractMessagesFromTranscript: pulls assistant + human, skips malformed, caps 20", () => {
  const lines = [];
  for (let i = 0; i < 25; i++) lines.push(JSON.stringify({ type: "assistant", message: { content: `msg${i}` } }));
  lines.push("this is not json");
  lines.push(JSON.stringify({ type: "human", message: { content: "a user line" } }));
  const msgs = extractMessagesFromTranscript(lines.join("\n"));
  assert.ok(msgs.length <= 20, `capped at 20, got ${msgs.length}`);
  assert.ok(msgs.some(m => m.startsWith("USER: ")), "human line prefixed USER:");
  assert.ok(!msgs.includes("this is not json"), "malformed line skipped");
});
test("extractMessagesFromTranscript: empty / falsy -> []", () => {
  assert.deepEqual(extractMessagesFromTranscript(""), []);
  assert.deepEqual(extractMessagesFromTranscript(null), []);
});
test("extractMessagesFromTranscript: array-content assistant message joined to text", () => {
  const line = JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "part-A" }, { type: "tool_use", id: "t1" }] } });
  const msgs = extractMessagesFromTranscript(line);
  assert.equal(msgs.length, 1);
  assert.ok(msgs[0].includes("part-A"));
});
test("extractMessagesFromTranscript: captures type:user (live Claude Code shape), string + array content", () => {
  // Live transcripts emit type:"user", NOT "human" — this test fails on the
  // old `=== "human"`-only code, which silently dropped every user turn.
  const lines = [
    JSON.stringify({ type: "user", message: { content: "a string user turn" } }),
    JSON.stringify({ type: "user", message: { content: [{ type: "text", text: "an array user turn" }, { type: "tool_result", content: "x" }] } }),
    JSON.stringify({ type: "assistant", message: { content: "asst reply" } }),
  ];
  const msgs = extractMessagesFromTranscript(lines.join("\n"));
  assert.ok(msgs.some(m => m === "USER: a string user turn"), "string-content user captured");
  assert.ok(msgs.some(m => m.startsWith("USER: an array user turn")), "array-content user captured (text parts only)");
  assert.ok(msgs.some(m => m === "asst reply"), "assistant still captured");
});
test("extractMessagesFromTranscript: legacy type:human still captured (back-compat)", () => {
  const line = JSON.stringify({ type: "human", message: { content: "legacy human turn" } });
  const msgs = extractMessagesFromTranscript(line);
  assert.ok(msgs.some(m => m === "USER: legacy human turn"));
});

// sanity: module exports exist (guards against an accidental export drop)
test("module exports the tested surface", () => {
  for (const fn of [readStdinPayload, sanitizeSessionId, sessionRateFile, checkRateLimit, recordRate, pruneStaleRateFiles, resolveTranscript, extractMessagesFromTranscript]) {
    assert.equal(typeof fn, "function");
  }
  assert.equal(typeof MIN_INTERVAL_MS, "number");
  assert.ok(fileURLToPath(import.meta.url).endsWith("stop-obsidian-memory-extract.test.mjs"));
});
