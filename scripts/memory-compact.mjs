#!/usr/bin/env node
/**
 * memory-compact.mjs — U-OBF03, OBSIDIAN-BRAIN-FIX-MS0 (2026-05-17, slot bravo).
 *
 * MEMORY.md is auto-loaded into EVERY chat at SessionStart. The Anthropic
 * harness silently truncates it past 24576 bytes ("Only part of it was
 * loaded") — the freshest index entries become unreachable fleet-wide.
 *
 * `scripts/memory-size-watch.mjs` ALERTS when the index approaches the
 * ceiling; this script ACTS: it rotates the OLDEST `## Indexed memories`
 * pointer-lines out to a discoverable archive (`MEMORY-ARCHIVE.md`, same
 * memory directory — the SessionStart brain reads memory files on demand,
 * so an archive there stays reachable) and leaves a pointer behind.
 *
 * REDESIGN of a first attempt that targeted per-line bloat — the real
 * failure mode is ENTRY-COUNT growth, so this rotates whole entries.
 *
 * Safety properties:
 *   - lockfile-guarded atomic RMW (PER-SLOT-CLAIM pattern). Note: the lock
 *     coordinates concurrent invocations of THIS script across chats — it
 *     is not a cross-tool mutex against a human Edit landing on MEMORY.md
 *     mid-RMW. The op is rare and fast (<1s) so the practical race is
 *     compaction-vs-compaction, which the lock fully serializes.
 *   - abort-not-proceed: any stat / lock failure returns {ok:false} with
 *     ZERO writes — never a partial mutation.
 *   - archive written FIRST (additive), MEMORY.md shrunk SECOND — if step 2
 *     fails nothing is lost; re-run is idempotent (worst case a duplicate
 *     batch in the archive, which is cosmetic overflow).
 *   - verify-after-write: re-reads MEMORY.md and fails loud if still over
 *     the truncation ceiling.
 *   - stamp-throttle so it is safe to wire to a fast cron / golf cadence.
 *
 * Units: the harness truncates on BYTES (24576). The global memory schema's
 * "≤200 chars per entry" is a separate per-entry guideline — this script
 * targets the BYTE ceiling and additionally reports entries over 200 chars.
 *
 * Usage:
 *   node scripts/memory-compact.mjs                 # compact if over target
 *   node scripts/memory-compact.mjs --dry-run       # show plan, no write
 *   node scripts/memory-compact.mjs --json
 *   node scripts/memory-compact.mjs --force         # bypass the throttle
 *   node scripts/memory-compact.mjs --target-pct 0.75
 *   node scripts/memory-compact.mjs --keep-min 30
 *
 * Pure-core (unit-tested): parseMemory · compactPlan · buildMemoryText ·
 * buildArchiveText · acquireLock. FS+lock+throttle layer: run().
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// The Anthropic harness truncates the auto-loaded MEMORY.md past this many bytes.
export const CEILING_BYTES = 24576;
const DEFAULT_TARGET_PCT = 0.80;
const DEFAULT_KEEP_MIN = 20;
const DEFAULT_THROTTLE_MS = 30 * 60 * 1000; // 30 min
const LOCK_TTL_MS = 60 * 1000;              // a compaction completes in <1s
const ENTRY_CHAR_GUIDELINE = 200;           // global memory-schema per-entry hint

const MEMORY_MD = "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md";
const INDEX_HEADER = "## Indexed memories";
const ENTRY_RE = /^- /;
const POINTER_MARK = "MEMORY-ARCHIVE.md";

function makePointerLine() {
  return (
    "> Older index entries are archived to [MEMORY-ARCHIVE.md](MEMORY-ARCHIVE.md) — " +
    "discoverable, read on demand. This index keeps the most recent."
  );
}

/**
 * Locate the `## Indexed memories` section. Splits the file into the head
 * (everything up to + including the section header), the entry lines, any
 * stray non-entry lines, and the tail (the next `## ` section onward).
 * A prior archive-pointer line is recognised and dropped (regenerated on
 * write — this is the "strip prior pointer" guard against accumulation).
 */
export function parseMemory(text) {
  if (typeof text !== "string") return { sectionFound: false, eol: "\n" };
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.trim() === INDEX_HEADER);
  if (headerIdx < 0) return { sectionFound: false, eol };
  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { endIdx = i; break; }
  }
  const body = lines.slice(headerIdx + 1, endIdx);
  const entries = [];
  const strayLines = [];
  for (const ln of body) {
    if (ENTRY_RE.test(ln)) entries.push(ln);
    else if (ln.trim() === "") continue;
    else if (ln.includes(POINTER_MARK)) continue; // prior pointer — strip + regenerate
    else strayLines.push(ln);
  }
  return {
    sectionFound: true,
    eol,
    headLines: lines.slice(0, headerIdx + 1),
    entries,
    strayLines,
    tailLines: lines.slice(endIdx),
  };
}

/** Rebuild the full MEMORY.md text from parsed pieces + the kept entries. */
export function buildMemoryText({ headLines, strayLines = [], keep, tailLines = [], eol = "\n", pointerLine }) {
  const out = [...headLines, pointerLine, "", ...strayLines, ...keep];
  if (tailLines.length) {
    if (tailLines[0].trim() !== "") out.push("");
    out.push(...tailLines);
  }
  return out.join(eol);
}

/**
 * Decide what to keep vs archive. Entries are newest-first (the index is
 * maintained newest-at-top). Keeps the newest entries that fit under
 * targetBytes; archives the rest (oldest). Never keeps fewer than keepMin
 * even if that leaves the file over target — entries cannot be shrunk, only
 * moved, and an over-target result is surfaced (not silently accepted).
 */
export function compactPlan(parsed, { targetBytes, keepMin, pointerLine }) {
  const { headLines, strayLines, entries, tailLines, eol } = parsed;
  const build = (n) =>
    buildMemoryText({ headLines, strayLines, keep: entries.slice(0, n), tailLines, eol, pointerLine });
  let keepCount = entries.length;
  let finalText = build(keepCount);
  while (keepCount > keepMin && Buffer.byteLength(finalText, "utf8") > targetBytes) {
    keepCount--;
    finalText = build(keepCount);
  }
  return {
    keep: entries.slice(0, keepCount),
    archive: entries.slice(keepCount),
    finalText,
    finalBytes: Buffer.byteLength(finalText, "utf8"),
  };
}

/** Build the archive file — newest archived batch on top, prior batches preserved. */
export function buildArchiveText(priorArchive, archivedEntries, stamp, eol = "\n") {
  const batchLines = [
    `## Archived ${stamp} — ${archivedEntries.length} entr${archivedEntries.length === 1 ? "y" : "ies"}`,
    "",
    ...archivedEntries,
  ];
  const TITLE = "# PRISM Memory — Archived Index Entries";
  const INTRO =
    "> Overflow of MEMORY.md `## Indexed memories`, rotated by " +
    "`scripts/memory-compact.mjs` (U-OBF03). NOT auto-loaded into context — " +
    "discoverable, read on demand. Newest archived batch on top.";
  if (typeof priorArchive !== "string" || !priorArchive.trim()) {
    return [TITLE, "", INTRO, "", ...batchLines, ""].join(eol);
  }
  const lines = priorArchive.split(/\r?\n/);
  let firstBatch = lines.findIndex((l) => /^## Archived /.test(l));
  if (firstBatch < 0) firstBatch = lines.length;
  let headEnd = firstBatch;
  while (headEnd > 0 && lines[headEnd - 1].trim() === "") headEnd--;
  const header = lines.slice(0, headEnd);
  const rest = lines.slice(firstBatch);
  return [...header, "", ...batchLines, "", ...rest]
    .join(eol)
    .replace(/(?:\r?\n){3,}/g, eol + eol);
}

/**
 * PER-SLOT-CLAIM-style lockfile. Exclusive create; if the lock exists and is
 * older than ttlMs it is stolen (the prior holder crashed); else acquisition
 * fails so the caller can abort-not-proceed.
 */
export function acquireLock(lockPath, { ttlMs = LOCK_TTL_MS, now = Date.now() } = {}) {
  const payload = JSON.stringify({ pid: process.pid, host: os.hostname(), ts: now });
  try {
    fs.writeFileSync(lockPath, payload, { flag: "wx" });
    return { ok: true };
  } catch (e) {
    if (e.code !== "EEXIST") return { ok: false, reason: "lock_write_error", error: String(e.message || e) };
    let holder = null;
    try { holder = JSON.parse(fs.readFileSync(lockPath, "utf8")); } catch { /* unreadable holder */ }
    // Null/corrupt holder (0-byte stale lock fails JSON.parse) OR future-ts -> stale-stealable.
    // Pre-2026-05-26 the !holder guard was missing; see regression test.
    const ageEffective =
      !holder || !Number.isFinite(holder.ts) || holder.ts > now + 24 * 60 * 60 * 1000
        ? Infinity
        : now - holder.ts;
    if (ageEffective > ttlMs) {
      try { fs.unlinkSync(lockPath); fs.writeFileSync(lockPath, payload, { flag: "wx" }); }
      catch (e2) { return { ok: false, reason: "lock_steal_failed", error: String(e2.message || e2) }; }
      return { ok: true, stoleStale: true };
    }
    return { ok: false, reason: "locked", holder };
  }
}

export function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch { /* best-effort */ }
}

function atomicWrite(file, content) {
  const tmp = `${file}.cmptmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, content, "utf8");
    fs.renameSync(tmp, file);
    return { ok: true };
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch { /* best-effort */ }
    return { ok: false, error: String((e && e.message) || e) };
  }
}

function writeStamp(stampPath, ts) {
  try { fs.writeFileSync(stampPath, JSON.stringify({ ts }), "utf8"); } catch { /* throttle is best-effort */ }
}

function countOversizeEntries(entries) {
  return entries.filter((e) => e.length > ENTRY_CHAR_GUIDELINE).length;
}

export function run(opts = {}) {
  const memoryPath = opts.memoryPath || MEMORY_MD;
  const dir = path.dirname(memoryPath);
  const archivePath = opts.archivePath || path.join(dir, "MEMORY-ARCHIVE.md");
  const lockPath = opts.lockPath || path.join(dir, ".memory-compact.lock");
  const stampPath = opts.stampPath || path.join(dir, ".memory-compact.stamp");
  const targetPct = Number.isFinite(opts.targetPct) ? opts.targetPct : DEFAULT_TARGET_PCT;
  // Validate-loud: a targetPct outside (0,1] would otherwise yield a target ≥
  // ceiling and silently make the script a no-op every run.
  if (!(targetPct > 0 && targetPct <= 1)) {
    return { ok: false, reason: "invalid_target_pct", targetPct };
  }
  const targetBytes = Number.isFinite(opts.targetBytes)
    ? opts.targetBytes
    : Math.floor(CEILING_BYTES * targetPct);
  const keepMin = Number.isFinite(opts.keepMin) ? opts.keepMin : DEFAULT_KEEP_MIN;
  if (!(keepMin >= 0 && Number.isInteger(keepMin))) {
    return { ok: false, reason: "invalid_keep_min", keepMin };
  }
  const throttleMs = Number.isFinite(opts.throttleMs) ? opts.throttleMs : DEFAULT_THROTTLE_MS;
  const dryRun = !!opts.dryRun;
  const force = !!opts.force;
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();

  // 1. Throttle — dry-run bypasses (a dry-run never writes the stamp).
  if (!force && !dryRun) {
    try {
      const last = JSON.parse(fs.readFileSync(stampPath, "utf8"));
      if (last && Number.isFinite(last.ts) && now - last.ts < throttleMs) {
        return { ok: true, skipped: "throttled", nextEligibleInMs: throttleMs - (now - last.ts) };
      }
    } catch { /* no stamp / unreadable — proceed */ }
  }

  // 2. Lock — abort-not-proceed on any acquisition failure.
  const lock = acquireLock(lockPath, { ttlMs: LOCK_TTL_MS, now });
  if (!lock.ok) return { ok: false, reason: lock.reason, holder: lock.holder, error: lock.error };

  try {
    // 3. Read — explicit stat then read; any failure aborts with zero writes.
    let text;
    try {
      fs.statSync(memoryPath);
      text = fs.readFileSync(memoryPath, "utf8");
    } catch (e) {
      return { ok: false, reason: "memory_read_failed", error: String((e && e.message) || e) };
    }
    const beforeBytes = Buffer.byteLength(text, "utf8");
    // Normalize CRLF -> LF on input so the planner's finalBytes (LF) matches
    // the on-disk write (also LF after normalization). A mixed-EOL input would
    // otherwise be promoted to all-CRLF on write, silently growing the file by
    // ~1 byte per line and drifting the ceiling check.
    text = text.replace(/\r\n/g, "\n");

    const parsed = parseMemory(text);
    if (!parsed.sectionFound) return { ok: false, reason: "no_index_section", beforeBytes };

    const pointerLine = makePointerLine();
    const plan = compactPlan(parsed, { targetBytes, keepMin, pointerLine });
    const oversize = countOversizeEntries(parsed.entries);

    if (plan.archive.length === 0) {
      if (!dryRun) writeStamp(stampPath, now);
      return {
        ok: true, archived: 0, kept: plan.keep.length,
        beforeBytes, afterBytes: beforeBytes, targetBytes,
        belowTarget: beforeBytes <= targetBytes,
        entriesOver200Chars: oversize, reason: "under_target",
      };
    }

    let priorArchive = "";
    try { priorArchive = fs.readFileSync(archivePath, "utf8"); } catch { priorArchive = ""; }
    const stamp = new Date(now).toISOString();
    const archiveText = buildArchiveText(priorArchive, plan.archive, stamp, parsed.eol);

    if (dryRun) {
      return {
        ok: true, dryRun: true, archived: plan.archive.length, kept: plan.keep.length,
        beforeBytes, afterBytes: plan.finalBytes, targetBytes,
        belowTarget: plan.finalBytes <= targetBytes,
        entriesOver200Chars: oversize,
      };
    }

    // 4. Atomic write — archive FIRST (additive/safe), MEMORY.md SECOND (the shrink).
    const aw = atomicWrite(archivePath, archiveText);
    if (!aw.ok) return { ok: false, reason: "archive_write_failed", error: aw.error };
    const mw = atomicWrite(memoryPath, plan.finalText);
    if (!mw.ok) {
      return { ok: false, reason: "memory_write_failed", error: mw.error,
               note: "archive already written — re-run is safe (idempotent)" };
    }

    // 5. Verify-after-write — fail loud if still over the truncation ceiling.
    let verifyBytes;
    try { verifyBytes = Buffer.byteLength(fs.readFileSync(memoryPath, "utf8"), "utf8"); }
    catch (e) { return { ok: false, reason: "verify_read_failed", error: String((e && e.message) || e) }; }
    if (verifyBytes > CEILING_BYTES) {
      return { ok: false, reason: "verify_over_ceiling", afterBytes: verifyBytes, beforeBytes };
    }

    writeStamp(stampPath, now);
    return {
      ok: true, archived: plan.archive.length, kept: plan.keep.length,
      beforeBytes, afterBytes: verifyBytes, targetBytes,
      belowTarget: verifyBytes <= targetBytes,
      entriesOver200Chars: oversize, archivePath,
    };
  } finally {
    releaseLock(lockPath);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const num = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : undefined;
  };
  const opts = { dryRun, force };
  const tp = num("--target-pct"); if (Number.isFinite(tp)) opts.targetPct = tp;
  const tb = num("--target-bytes"); if (Number.isFinite(tb)) opts.targetBytes = tb;
  const km = num("--keep-min"); if (Number.isFinite(km)) opts.keepMin = km;

  let r;
  try { r = run(opts); }
  catch (e) { r = { ok: false, reason: "threw", error: String((e && e.message) || e) }; }

  if (asJson) {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  } else if (r.ok && r.skipped) {
    process.stdout.write(`memory-compact: skipped (${r.skipped})\n`);
  } else if (r.ok && r.archived > 0) {
    process.stdout.write(
      `memory-compact: archived ${r.archived} entr${r.archived === 1 ? "y" : "ies"}` +
      `${r.dryRun ? " (DRY-RUN — no write)" : ""}\n` +
      `  MEMORY.md ${r.beforeBytes} B -> ${r.afterBytes} B (kept ${r.kept} newest, target ${r.targetBytes} B)\n`
    );
  } else if (r.ok) {
    process.stdout.write(
      `memory-compact: nothing to archive — ${r.beforeBytes} B within target ${r.targetBytes} B (${r.kept} entries)\n`
    );
  } else {
    process.stdout.write(`memory-compact: NO-OP — ${r.reason}${r.error ? " (" + r.error + ")" : ""}\n`);
  }
  process.exit(r.ok ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("memory-compact.mjs");
if (invokedDirectly) main();
