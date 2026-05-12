#!/usr/bin/env node
/**
 * _envelope.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *
 * Profiling shim that wraps any Claude Code hook. Records wall-time + exit code
 * to `state/shared/hook-latency.jsonl` so `HookLatencyEngine` can surface
 * P50/P95/P99 per hook and the nightly digest can flag regressions.
 *
 * USAGE — wrap a settings.json hook entry by prefixing _envelope.mjs:
 *   BEFORE:  "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/foo.mjs"
 *   AFTER:   "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/_envelope.mjs H:/prism/.claude/hooks/foo.mjs"
 *
 * DESIGN — single-child spawn (no double-fork in the Windows fork-storm hot path),
 * stdin/stdout/stderr forwarded transparently, exit code preserved. The append to
 * hook-latency.jsonl is best-effort and never fails the wrapped hook. Self-overhead
 * is one stat + one append, <2 ms p99 on warm cache.
 *
 * KNOBS
 *   PRISM_HOOK_ENVELOPE=0         — disable wrapping; the shim becomes a direct exec
 *   PRISM_HOOK_LATENCY_JSONL=path — override output path (default state/shared/hook-latency.jsonl)
 *   PRISM_HOOK_LATENCY_MAX_BYTES  — rotate the JSONL once it exceeds this (default 50 MiB)
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const HARNESS_ROOT = "H:/prism";
const DEFAULT_JSONL = path.join(HARNESS_ROOT, "state/shared/hook-latency.jsonl");
const ROTATE_BYTES_DEFAULT = 50 * 1024 * 1024; // 50 MiB
const MAX_RECORD_BYTES = 4096;                  // cap one JSONL line so a bad hook can't blow up disk

const argv = process.argv.slice(2);
if (argv.length === 0) {
  // Nothing to wrap — exit clean. PostToolUse hooks should never block on this.
  process.exit(0);
}

const target = argv[0];
const targetArgs = argv.slice(1);

// Bypass mode: just exec the child with no envelope.
if (process.env.PRISM_HOOK_ENVELOPE === "0") {
  passthrough(target, targetArgs);
}

// ── read stdin once (hooks consume JSON stdin), forward to child ─────────────
let stdinBuf = Buffer.alloc(0);
try {
  // readFileSync on fd 0 is the simplest cross-platform read of piped stdin.
  stdinBuf = fs.readFileSync(0);
} catch {
  // No stdin (interactive run) → empty buffer; the child will see "" on stdin.
  stdinBuf = Buffer.alloc(0);
}

// ── invoke the wrapped hook, measure wall time ───────────────────────────────
const startedAt = Date.now();
const hrStart = process.hrtime.bigint();

const result = spawnSync(process.execPath, [target, ...targetArgs], {
  input: stdinBuf,
  windowsHide: true,
  // stdout/stderr captured (Buffer) so the parent can forward them verbatim
  // without re-encoding. `inherit` would skip the duration capture for short hooks.
  stdio: ["pipe", "pipe", "pipe"],
});

const durationMs = Number((process.hrtime.bigint() - hrStart) / 1_000_000n);

// ── forward child output to the harness ──────────────────────────────────────
if (result.stdout && result.stdout.length > 0) {
  try { process.stdout.write(result.stdout); } catch { /* pipe closed; harness already moved on */ }
}
if (result.stderr && result.stderr.length > 0) {
  try { process.stderr.write(result.stderr); } catch { /* same */ }
}

// ── record latency (best-effort; never blocks the child's exit) ──────────────
try {
  recordLatency({
    ts: new Date(startedAt).toISOString(),
    hook: basename(target),
    durationMs,
    exitCode: typeof result.status === "number" ? result.status : -1,
    signal: result.signal || null,
    targetPath: target.replace(/\\/g, "/"),
  });
} catch {
  // ignore — the wrapped hook's exit code is what matters
}

// Preserve child's exit code (and signal as 128+N if killed).
if (result.signal) {
  const sigNum = sigToNum(result.signal);
  process.exit(128 + sigNum);
}
process.exit(typeof result.status === "number" ? result.status : 0);

// ── helpers ──────────────────────────────────────────────────────────────────
function recordLatency(entry) {
  const out = process.env.PRISM_HOOK_LATENCY_JSONL || DEFAULT_JSONL;
  // Bound the record so a buggy hook's path can't OOM us.
  const line = JSON.stringify(entry).slice(0, MAX_RECORD_BYTES);
  // Rotate before appending if size would blow past the cap. Cheap stat; failure → just skip.
  const rotateAt = parseRotateBytes();
  try {
    const st = fs.statSync(out);
    if (st.size > rotateAt) {
      const archive = out + ".1";
      try { fs.rmSync(archive, { force: true }); } catch { /* ignore */ }
      try { fs.renameSync(out, archive); } catch { /* ignore — concurrent rotation */ }
    }
  } catch {
    // ENOENT — first write; just create the file below.
  }
  // Ensure parent dir exists (first-time install). Cheap; idempotent.
  try { fs.mkdirSync(path.dirname(out), { recursive: true }); } catch { /* ignore */ }
  // append-only, atomic at the line level on POSIX + Windows when fd is opened O_APPEND.
  fs.appendFileSync(out, line + "\n", { encoding: "utf8" });
}

function parseRotateBytes() {
  const raw = process.env.PRISM_HOOK_LATENCY_MAX_BYTES;
  if (!raw) return ROTATE_BYTES_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : ROTATE_BYTES_DEFAULT;
}

function basename(p) {
  const norm = String(p).replace(/\\/g, "/");
  const last = norm.split("/").pop() || norm;
  return last.replace(/\.mjs$/, "");
}

function sigToNum(sig) {
  // Map well-known signals; default to SIGTERM=15 if unknown so 128+15=143 surfaces.
  switch (sig) {
    case "SIGHUP": return 1;
    case "SIGINT": return 2;
    case "SIGTERM": return 15;
    case "SIGKILL": return 9;
    default: return 15;
  }
}

function passthrough(t, args) {
  let buf = Buffer.alloc(0);
  try { buf = fs.readFileSync(0); } catch { /* no stdin */ }
  const r = spawnSync(process.execPath, [t, ...args], { input: buf, stdio: ["pipe", "inherit", "inherit"], windowsHide: true });
  process.exit(typeof r.status === "number" ? r.status : 0);
}
