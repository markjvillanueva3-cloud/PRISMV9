#!/usr/bin/env node
// tier: T3
/**
 * memory-autocompact-stop.mjs — Stop hook. The ACT counterpart to the
 * ALERT-only scripts/memory-size-watch.mjs.
 *
 * OBSIDIAN-BRAIN-FIX-MS0/U-OBF03 (2026-05-17, slot bravo claude-339c8ff7).
 *
 * Problem: the Anthropic harness auto-loads MEMORY.md into every chat at
 * SessionStart and SILENTLY truncates it past 24576 bytes ("Only part of it
 * was loaded") — breaking fleet-wide cross-session recall. memory-size-watch
 * only *alerts* (exit 0/1/2); the index has repeatedly re-grown past 97% of
 * the ceiling within DAYS of each one-shot manual U-MEMORY-COMPRESS. A
 * watchdog that warns but never acts is, in practice, the bug recurring.
 *
 * This hook ACTS when the index crosses the CRITICAL threshold: it
 * re-pointerizes over-budget index lines down to the ≤200-char pointer form
 * the global CLAUDE.md schema mandates. It NEVER deletes a pointer — the
 * `[Title](file.md)` link is always preserved so the underlying per-memory
 * file stays discoverable (the full detail lives there, not in the index;
 * the index is pointers, so trimming a verbose hook loses nothing
 * recoverable). Only the prose tail after the link is clipped.
 *
 * Concurrency (load-bearing): MEMORY.md is heavily peer-contended (multiple
 * chats append pointers). Blindly rewriting a file a peer is editing is
 * data loss — the exact anti-pattern. Defense: OPTIMISTIC CONCURRENCY — we
 * snapshot mtime at read, and just before the atomic rename we re-stat; if
 * mtime moved (a peer wrote in between) we ABORT and leave the file
 * untouched (next Stop retries). Acting only at ≥CRITICAL makes the race
 * window rare; the mtime guard makes a lost race harmless.
 *
 * Fail-soft on every path — a Stop hook must never block session end.
 *
 * Pure-core (unit-testable, no fs/process):
 *   isPointerLine(s) · compactPointerLine(s, maxBytes) · compactIndex(text, opts)
 * FS/hook layer:
 *   run() · main()
 *
 * Knobs:
 *   PRISM_MEMORY_AUTOCOMPACT_DISABLE=1     → no-op
 *   PRISM_MEMORY_AUTOCOMPACT_THRESHOLD=0.97 → act at/above this ratio of ceiling
 *   PRISM_MEMORY_PATH=<abs>                 → override target (tests)
 */

import { readFileSync, writeFileSync, renameSync, statSync, existsSync, unlinkSync } from "node:fs";

// Byte ceiling the harness truncates MEMORY.md at (mirrors memory-size-watch).
const CEILING_BYTES = 24576;
// Act only at/above this fraction of the ceiling (CRITICAL). Below this,
// memory-size-watch's WARN advisory is the appropriate (non-destructive)
// response — we do NOT rewrite a file that isn't actually in danger.
const DEFAULT_CRITICAL_RATIO = 0.97;
// Per-pointer byte budget — the global CLAUDE.md schema: index entries are
// pointers, ≤200 chars. Measured in BYTES (titles may be non-ASCII; the
// ceiling that matters is a byte count).
const MAX_POINTER_BYTES = 200;
const ELLIPSIS = " …";

const DEFAULT_MEMORY_PATH =
  process.env.PRISM_MEMORY_PATH ||
  "C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md";

function byteLen(s) { return Buffer.byteLength(s, "utf8"); }

/**
 * A compactable index pointer line: `- [Title](file.md) — hook` or `: hook`.
 * Sub-bullets, headers, prose, blank lines are NOT pointer lines and are
 * preserved verbatim.
 */
export function isPointerLine(line) {
  if (typeof line !== "string") return false;
  return /^- \[[^\]]+\]\([^)]+\.md\)\s*[—:-]/.test(line);
}

/**
 * Truncate a pointer line to <= maxBytes WITHOUT dropping the link. Strategy:
 * keep `- [Title](file.md)` + the separator, clip the prose tail, append " …".
 * If the link prefix ALONE already exceeds maxBytes, return the prefix
 * untrimmed (discoverability beats the budget — never mangle the link).
 * Multi-byte safe: clips on a byte budget but never splits a UTF-8 sequence.
 */
export function compactPointerLine(line, maxBytes = MAX_POINTER_BYTES) {
  if (typeof line !== "string") return line;
  if (byteLen(line) <= maxBytes) return line;
  const m = line.match(/^(- \[[^\]]+\]\([^)]+\.md\)\s*[—:-]\s*)([\s\S]*)$/);
  if (!m) return line; // not the shape we can safely clip — leave verbatim
  const prefix = m[1];
  const tail = m[2];
  const budget = maxBytes - byteLen(prefix) - byteLen(ELLIPSIS);
  if (budget <= 0) return prefix.replace(/\s+$/, ""); // link alone too long → keep link, drop tail
  // Clip tail to `budget` bytes without splitting a UTF-8 codepoint.
  let buf = Buffer.from(tail, "utf8").subarray(0, budget);
  let clipped = buf.toString("utf8");
  // toString may emit a replacement char if the last codepoint was split;
  // strip a trailing partial/replacement char defensively.
  clipped = clipped.replace(/�+$/, "").replace(/\s+$/, "");
  return prefix + clipped + ELLIPSIS;
}

/**
 * Compact every over-budget pointer line in `text`. Non-pointer lines are
 * preserved byte-for-byte. Idempotent: a second pass changes nothing.
 * Returns { content, beforeBytes, afterBytes, changed, linesCompacted }.
 */
export function compactIndex(text, opts = {}) {
  const maxBytes = opts.maxPointerBytes || MAX_POINTER_BYTES;
  const beforeBytes = byteLen(text);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  let linesCompacted = 0;
  const out = lines.map((ln) => {
    if (!isPointerLine(ln)) return ln;
    if (byteLen(ln) <= maxBytes) return ln;
    const c = compactPointerLine(ln, maxBytes);
    if (c !== ln) linesCompacted++;
    return c;
  });
  const content = out.join(eol);
  return {
    content,
    beforeBytes,
    afterBytes: byteLen(content),
    changed: content !== text,
    linesCompacted,
  };
}

/**
 * Hook body. Returns a short status object (for tests + telemetry). Never
 * throws — every failure path returns a {acted:false, reason} shape.
 */
export function run(opts = {}) {
  if (String(process.env.PRISM_MEMORY_AUTOCOMPACT_DISABLE ?? "") === "1") {
    return { acted: false, reason: "disabled" };
  }
  const file = opts.path || DEFAULT_MEMORY_PATH;
  const ratio = Number(process.env.PRISM_MEMORY_AUTOCOMPACT_THRESHOLD) || opts.criticalRatio || DEFAULT_CRITICAL_RATIO;
  const actAtBytes = Math.floor(CEILING_BYTES * ratio);

  if (!existsSync(file)) return { acted: false, reason: "no_memory_file" };

  let raw, mtime0;
  try {
    raw = readFileSync(file, "utf8");
    mtime0 = statSync(file).mtimeMs;
  } catch (e) {
    return { acted: false, reason: "read_failed", error: String((e && e.message) || e) };
  }

  const sizeNow = byteLen(raw);
  if (sizeNow < actAtBytes) {
    return { acted: false, reason: "below_critical", bytes: sizeNow, actAtBytes };
  }

  const res = compactIndex(raw, opts);
  if (!res.changed) {
    // At/over critical but no over-budget pointer lines to trim — this is a
    // real problem the hook can't fix (genuine content growth, not bloated
    // pointers). Surface it loudly rather than silently no-op (R12).
    return {
      acted: false,
      reason: "critical_but_no_compactable_lines",
      bytes: sizeNow,
      advisory: `MEMORY.md is ${sizeNow}B (>=${actAtBytes}) but no index pointer line exceeds ${MAX_POINTER_BYTES}B — growth is structural, not pointer-bloat. Manual U-MEMORY-COMPRESS / new-namespace split needed.`,
    };
  }

  // Optimistic concurrency: a peer may have appended a pointer between our
  // read and now. If mtime moved, ABORT — never clobber a peer's write.
  let mtime1;
  try { mtime1 = statSync(file).mtimeMs; } catch { mtime1 = mtime0; }
  if (mtime1 !== mtime0) {
    return { acted: false, reason: "peer_wrote_aborted", bytes: sizeNow };
  }

  // Atomic tmp+rename. Clean the tmp on any failure (no orphan, no clobber).
  let tmp = null;
  try {
    tmp = `${file}.autocompact.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, res.content, "utf8");
    // Final re-stat immediately before the rename — tightest possible window.
    let mtime2;
    try { mtime2 = statSync(file).mtimeMs; } catch { mtime2 = mtime0; }
    if (mtime2 !== mtime0) {
      try { unlinkSync(tmp); } catch { /* best-effort */ }
      return { acted: false, reason: "peer_wrote_aborted_late", bytes: sizeNow };
    }
    renameSync(tmp, file);
    return {
      acted: true,
      reason: "compacted",
      beforeBytes: res.beforeBytes,
      afterBytes: res.afterBytes,
      linesCompacted: res.linesCompacted,
    };
  } catch (e) {
    if (tmp) { try { unlinkSync(tmp); } catch { /* best-effort */ } }
    return { acted: false, reason: "write_failed", error: String((e && e.message) || e) };
  }
}

function main() {
  let result;
  try { result = run(); } catch (e) { result = { acted: false, reason: "threw", error: String((e && e.message) || e) }; }
  const out = { continue: true };
  if (result && result.acted) {
    out.systemMessage = `[memory-autocompact] MEMORY.md re-pointerized: ${result.beforeBytes}B → ${result.afterBytes}B (${result.linesCompacted} line(s) trimmed to ≤${MAX_POINTER_BYTES}B). Underlying per-memory files untouched.`;
  } else if (result && result.advisory) {
    out.systemMessage = `[memory-autocompact] ${result.advisory}`;
  } else {
    out.suppressOutput = true;
  }
  process.stdout.write(JSON.stringify(out));
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("memory-autocompact-stop.mjs");
if (invokedDirectly) main();
