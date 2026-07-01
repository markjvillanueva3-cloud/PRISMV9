#!/usr/bin/env node
/**
 * memory-compress-v2.mjs — U-MEMORY-COMPRESS-V2 (JULIETT-12CHAT-ALLOCATION-MS0).
 *
 * MEMORY.md is auto-loaded into every chat at SessionStart; the Anthropic
 * harness silently truncates it past 24576 bytes ("Only part of it was
 * loaded"), breaking fleet-wide cross-session recall. The 2026-05-16 one-shot
 * U-MEMORY-COMPRESS fix had no durable mechanism — the `## Indexed memories`
 * index re-grew (33710 B / 137% of ceiling at this writing).
 *
 * This compresses the index by enforcing the global-CLAUDE.md rule
 * "index entries are ≤200-char pointers; detail lives in the linked files".
 * Each `- [title](slug.md) — description` line whose total length exceeds the
 * cap has its DESCRIPTION truncated at a word boundary + ellipsis. The
 * `[title](slug.md) — ` skeleton is NEVER touched, so every primary pointer
 * survives and the per-memory `<slug>.md` files (the real detail) are
 * untouched.
 *
 * Advisory by default — prints a diff + byte delta, does NOT write. `--apply`
 * performs the write (atomic temp+rename). Idempotent: a second run is a no-op.
 *
 * Modes:
 *   node scripts/memory-compress-v2.mjs            # diff preview (no write)
 *   node scripts/memory-compress-v2.mjs --apply    # write the compressed file
 *   node scripts/memory-compress-v2.mjs --json     # machine-readable summary
 *
 * Env:
 *   PRISM_AUTO_MEMORY_FILE   override the MEMORY.md path
 *   PRISM_MEMORY_MAX_LINE    per-entry char cap (default 200)
 *
 * Exit: 0 ok · 1 nothing-to-do (already compressed) on --apply · 2 read error.
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

// Per global CLAUDE.md: index entries are ≤200-char pointers.
const DEFAULT_MAX_LINE = 200;
// The harness truncation ceiling — reported in the summary for context.
const CEILING_BYTES = 24576;

// KEEP-IN-SYNC with scripts/memory-size-watch.mjs:resolveMemoryFile — both
// resolve the same auto-memory file; replicated (not imported) because
// memory-size-watch.mjs has no CLI guard and importing it runs its main().
export function resolveMemoryFile(env = process.env, home = homedir()) {
  const override = env.PRISM_AUTO_MEMORY_FILE;
  if (override && existsSync(override)) return override;
  const candidates = [
    join(home, ".claude/projects/H--PRISM/memory/MEMORY.md"),
    join(home, ".claude/projects/H--prism/memory/MEMORY.md"),
    "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

// An index entry: "- [title](slug) — description". The title may itself
// contain " — " (e.g. "U-P0-U02 recovery — Ollama ..."), so the link group
// `\([^)]*\)` is the anchor — the FIRST " — " AFTER the close-paren splits
// skeleton from description. Non-greedy title, no-`)` link body.
const ENTRY_RE = /^(- \[.*?\]\([^)]*\) — )(.*)$/;

/**
 * Truncate `desc` so that `skeleton + desc` fits within `maxLen`. Cut at the
 * last word boundary before the budget and append a single-char ellipsis.
 * If even the skeleton already exceeds maxLen the skeleton is returned as-is
 * (never corrupt a pointer to hit a byte target — R12: report, don't lie).
 */
export function truncateEntry(skeleton, desc, maxLen) {
  const full = skeleton + desc;
  if (full.length <= maxLen) return { line: full, truncated: false };
  const budget = maxLen - skeleton.length - 1; // -1 for the ellipsis
  if (budget <= 0) {
    // Skeleton alone is at/over the cap — cannot truncate without corrupting
    // the pointer. Keep the skeleton intact; this entry stays over-length.
    return { line: skeleton.trimEnd(), truncated: false, skeletonOverflow: true };
  }
  let cut = desc.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > budget * 0.5) cut = cut.slice(0, lastSpace); // prefer a word boundary
  cut = cut.trimEnd().replace(/[.,;:—-]+$/, "").trimEnd();
  return { line: `${skeleton}${cut}…`, truncated: true };
}

/**
 * Pure compressor. Splits MEMORY.md into header / index-entry lines / footer,
 * truncates over-cap entries, returns the rebuilt text + stats. Header and
 * footer (and any non-entry line) pass through verbatim — so every
 * `[name](file.md)` pointer and every section heading is preserved.
 */
export function compressMemory(text, { maxLineLen = DEFAULT_MAX_LINE } = {}) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const out = [];
  let entriesSeen = 0, entriesTruncated = 0, skeletonOverflow = 0;
  for (const line of lines) {
    const m = line.match(ENTRY_RE);
    if (!m) { out.push(line); continue; }
    entriesSeen++;
    const r = truncateEntry(m[1], m[2], maxLineLen);
    if (r.truncated) entriesTruncated++;
    if (r.skeletonOverflow) skeletonOverflow++;
    out.push(r.line);
  }
  const compressed = out.join(eol);
  const enc = (s) => Buffer.byteLength(s, "utf8");
  return {
    compressed,
    originalBytes: enc(text),
    compressedBytes: enc(compressed),
    entriesSeen,
    entriesTruncated,
    skeletonOverflow,
    changed: compressed !== text,
  };
}

/** Every `[label](target)` markdown link in the text (skeleton pointers + any
 *  inline link). Used by the test to assert no pointer is dropped. */
export function extractMdLinks(text) {
  const links = [];
  const re = /\[[^\]\n]+\]\([^)\n]+\)/g;
  let m;
  while ((m = re.exec(text)) !== null) links.push(m[0]);
  return links;
}

function atomicWrite(path, content) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const asJson = args.has("--json");
  const maxLineLen = parseInt(process.env.PRISM_MEMORY_MAX_LINE || String(DEFAULT_MAX_LINE), 10) || DEFAULT_MAX_LINE;

  const file = resolveMemoryFile();
  let text;
  try { text = readFileSync(file, "utf8"); }
  catch (e) {
    process.stderr.write(`memory-compress-v2: cannot read ${file}: ${e.message}\n`);
    return 2;
  }

  const r = compressMemory(text, { maxLineLen });

  // R12: a compression that preserves every pointer is the safety invariant.
  // Verify it here and fail loud rather than silently shipping a lossy file.
  const before = extractMdLinks(text);
  const after = extractMdLinks(r.compressed);
  // Items in `before` not in `after` = dropped. Named for the SET membership being checked
  // (was `beforeSet` pre-3-of-3 Arm-B/C P3 — misleading since the set is built from `after`).
  const afterSet = new Set(after);
  const droppedPointers = before.filter((l) => !afterSet.has(l));
  // Skeleton pointers must ALL survive. Inline links inside a truncated
  // description may legitimately be cut — flag them separately.
  const skeletonDropped = droppedPointers.filter((l) => /\.md\)$/.test(l));

  if (asJson) {
    process.stdout.write(JSON.stringify({
      file, maxLineLen, ceilingBytes: CEILING_BYTES,
      originalBytes: r.originalBytes, compressedBytes: r.compressedBytes,
      bytesSaved: r.originalBytes - r.compressedBytes,
      entriesSeen: r.entriesSeen, entriesTruncated: r.entriesTruncated,
      skeletonOverflow: r.skeletonOverflow,
      droppedInlineLinks: droppedPointers.length,
      skeletonDropped: skeletonDropped.length,
      changed: r.changed, applied: false,
    }, null, 2) + "\n");
  }

  if (skeletonDropped.length > 0) {
    process.stderr.write(`memory-compress-v2: REFUSING — ${skeletonDropped.length} skeleton pointer(s) would be dropped:\n`);
    for (const l of skeletonDropped) process.stderr.write(`  ${l}\n`);
    return 2;
  }

  if (!asJson) {
    process.stderr.write(
      `memory-compress-v2: ${file}\n` +
      `  ${r.originalBytes} → ${r.compressedBytes} bytes (saved ${r.originalBytes - r.compressedBytes}, ceiling ${CEILING_BYTES})\n` +
      `  entries: ${r.entriesSeen} seen, ${r.entriesTruncated} truncated, ${r.skeletonOverflow} skeleton-overflow\n` +
      (droppedPointers.length ? `  ${droppedPointers.length} inline link(s) in truncated descriptions dropped (detail lives in slug files)\n` : "")
    );
  }

  if (!r.changed) {
    if (!asJson) process.stderr.write("  already compressed — no change\n");
    return apply ? 1 : 0;
  }

  if (apply) {
    atomicWrite(file, r.compressed);
    if (!asJson) process.stderr.write(`  WROTE ${r.compressedBytes} bytes\n`);
  } else {
    if (!asJson) process.stderr.write("  (preview — re-run with --apply to write)\n");
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { process.exit(main()); }
  catch (e) {
    process.stderr.write(`memory-compress-v2 fatal: ${e.message}\n${e.stack}\n`);
    process.exit(2);
  }
}
