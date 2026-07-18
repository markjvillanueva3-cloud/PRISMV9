#!/usr/bin/env node
/**
 * claude-md-archive-regressions.mjs — golf's CLAUDE.md regression-log drain.
 *
 * OBSIDIAN-BRAIN-FIX-MS0 / FORGE-AUDIT-V2 follow-up (2026-05-17, slot bravo).
 *
 * Problem (measured by scripts/claude-md-weight.mjs): H:/prism/CLAUDE.md is
 * ~130 KB / 711 lines — ~6x Anthropic's ≤200-line guidance, the threshold
 * past which Claude demonstrably starts IGNORING the file's instructions.
 * The `## Recent regressions` section alone is ~29 KB of append-only forensic
 * log — pure history that belongs in the wiki, not in a file auto-loaded
 * into every chat of a 13-chat fleet on every turn.
 *
 * This is the "golf syncs it" mechanism the operator asked for: CLAUDE.md
 * stays a small doctrine index; the `## Recent regressions` section is an
 * INBOX that work-chats + the regression auto-writer append to; golf runs
 * this drain (twice daily) to move everything older than the keep-window
 * into knowledge/wiki/lessons/claude-md-regression-log.md and leave the
 * section short. Nothing is deleted — regressions are RELOCATED to a
 * discoverable wiki leaf; the section keeps a pointer to it.
 *
 * Re-runnable + idempotent: a second run with nothing to drain is a no-op.
 *
 * Usage:
 *   node scripts/claude-md-archive-regressions.mjs            # drain
 *   node scripts/claude-md-archive-regressions.mjs --dry-run  # show, no write
 *   node scripts/claude-md-archive-regressions.mjs --json
 *   node scripts/claude-md-archive-regressions.mjs --keep N   # keep N newest in CLAUDE.md (default 3)
 *
 * Pure-core (testable): parseRegressionSection(text) · planDrain(section, keepN)
 * FS layer: run()
 */

import { readFileSync, writeFileSync, renameSync, existsSync, statSync, unlinkSync } from "node:fs";

const CLAUDE_MD = process.env.PRISM_CLAUDE_MD || "H:/prism/CLAUDE.md";
const ARCHIVE = process.env.PRISM_REGRESSION_ARCHIVE || "H:/prism/knowledge/wiki/lessons/claude-md-regression-log.md";
const SECTION_HEADER = "## Recent regressions";
// A regression entry is a top-level bullet, normally dated. Sub-lines that
// continue an entry are not `- `-prefixed, so a simple per-line split works.
const ENTRY_RE = /^- /;
// Preamble lines are recognised by CONTENT (HTML comment) not POSITION. The
// canonical `<!-- Append-only … -->` line from regression-auto-write.mjs and
// any other one-line `<!-- … -->` are preserved; the prior archive-pointer
// line (matching POINTER_MARK below) is stripped so re-runs do not duplicate.
const HTML_COMMENT_RE = /^\s*<!--.*-->\s*$/;
const POINTER_MARK = "claude-md-regression-log.md";
const DEFAULT_KEEP = 3;

/**
 * Locate the `## Recent regressions` section. Returns the header line index,
 * the section body lines (between header and the next `## ` / EOF), and the
 * index where the section ends (exclusive). null if no section.
 */
export function parseRegressionSection(text) {
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.trim() === SECTION_HEADER);
  if (headerIdx < 0) return null;
  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { endIdx = i; break; }
  }
  return { lines, headerIdx, endIdx, body: lines.slice(headerIdx + 1, endIdx) };
}

/**
 * Decide what to archive vs keep. body = section lines after the header.
 * Entries are `- `-prefixed bullets (a bullet plus any non-bullet
 * continuation lines belong together). HTML comments / blank lines that
 * precede the first entry are "preamble" and stay. Keeps the newest keepN
 * entries in CLAUDE.md, archives the rest.
 *
 * Returns { preamble[], keep[], archive[], entryCount } where keep/archive
 * are arrays of entry-strings (each may be multi-line, joined by \n).
 */
export function planDrain(body, keepN = DEFAULT_KEEP) {
  const preamble = [];
  const entries = [];
  let cur = null;
  for (const ln of body) {
    // HTML-comment lines are ALWAYS extracted — never absorbed as entry
    // continuation. This makes planDrain robust to a misbehaving inserter
    // that drops an entry ABOVE the canonical comment / pointer: the
    // comments end the current entry, stay in preamble (or get stripped
    // if pointer), and the entry is preserved cleanly.
    if (HTML_COMMENT_RE.test(ln)) {
      if (cur !== null) { entries.push(cur); cur = null; }
      if (ln.includes(POINTER_MARK)) {
        // prior archive-pointer — strip so re-runs do not accumulate
      } else {
        preamble.push(ln); // canonical `<!-- Append-only … -->` etc.
      }
      continue;
    }
    if (ENTRY_RE.test(ln)) {
      if (cur !== null) entries.push(cur);
      cur = ln;
    } else if (cur !== null) {
      cur += "\n" + ln; // continuation line of the current entry
    } else if (ln.trim() !== "") {
      // stray pre-entry prose — preserve (defensive; not expected in practice)
      preamble.push(ln);
    }
    // else: pre-entry blank — drop, regenerated on write.
  }
  if (cur !== null) entries.push(cur);
  // Trim trailing whitespace on each entry. Body-end blank lines absorb as
  // continuation onto the last entry; without this trim, each run would add
  // one more trailing blank between the last kept entry and the next
  // section (P1, code-analyzer Reviewer A 2026-05-17).
  const trimmedEntries = entries.map((e) => e.replace(/[\s\n]+$/, ""));
  // Newest entries are at the TOP (Boris back-flow appends to top).
  const keep = trimmedEntries.slice(0, Math.max(0, keepN));
  const archive = trimmedEntries.slice(Math.max(0, keepN));
  return { preamble, keep, archive, entryCount: trimmedEntries.length };
}

function atomicWrite(file, content) {
  const tmp = `${file}.archtmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, file);
    return { ok: true };
  } catch (e) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* best-effort */ }
    return { ok: false, error: String((e && e.message) || e) };
  }
}

export function run(opts = {}) {
  const keepN = Number.isFinite(opts.keepN) ? opts.keepN : DEFAULT_KEEP;
  const dryRun = !!opts.dryRun;
  const claudeMd = opts.claudeMd || CLAUDE_MD;
  const archive = opts.archive || ARCHIVE;

  if (!existsSync(claudeMd)) return { ok: false, reason: "no_claude_md", path: claudeMd };
  let text, mtime0;
  try {
    text = readFileSync(claudeMd, "utf8");
    mtime0 = statSync(claudeMd).mtimeMs;
  } catch (e) {
    return { ok: false, reason: "read_failed", error: String((e && e.message) || e) };
  }

  const sec = parseRegressionSection(text);
  if (!sec) return { ok: false, reason: "no_regression_section" };

  const { preamble, keep, archive: toArchive, entryCount } = planDrain(sec.body, keepN);
  if (toArchive.length === 0) {
    return { ok: true, drained: 0, kept: keep.length, reason: "nothing_to_drain" };
  }

  // --- Build the new archive wiki leaf (prepend newest, keep prior content) ---
  let priorArchive = "";
  if (existsSync(archive)) {
    try { priorArchive = readFileSync(archive, "utf8"); } catch { priorArchive = ""; }
  }
  const stamp = new Date().toISOString();
  const archiveHeader = priorArchive.startsWith("# ")
    ? "" // already has a title — just prepend a dated batch below it
    : "# CLAUDE.md regression log (archived)\n\n" +
      "> Drained from `CLAUDE.md` `## Recent regressions` by " +
      "`scripts/claude-md-archive-regressions.mjs` (golf maintenance). " +
      "Newest batch on top. CLAUDE.md keeps only the most recent few + a pointer here.\n\n";
  const batch = `## Archived ${stamp} — ${toArchive.length} entr${toArchive.length === 1 ? "y" : "ies"}\n\n` +
    toArchive.join("\n") + "\n\n";
  let newArchive;
  if (archiveHeader) {
    newArchive = archiveHeader + batch + priorArchive;
  } else {
    // splice the batch right after the existing title line
    const nl = priorArchive.indexOf("\n");
    const titleLine = priorArchive.slice(0, nl + 1);
    const rest = priorArchive.slice(nl + 1);
    newArchive = titleLine + "\n" + batch + rest.replace(/^\n+/, "");
  }

  // --- Rebuild the CLAUDE.md section: header + preamble + pointer + keep ---
  // The pointer MUST be a single-line HTML comment. regression-auto-write.mjs
  // `insertEntry()` skip-loop only walks past `<!-- … -->` and blank lines
  // before inserting a new entry — a markdown-italic pointer would catch the
  // skip-loop's stop and the auto-writer would prepend ABOVE the pointer,
  // which on the next drain would mis-classify the orphaned pointer as entry
  // continuation. HTML-comment form keeps the contract honest.
  const archiveRelPointer =
    "<!-- Older entries archived to knowledge/wiki/lessons/claude-md-regression-log.md " +
    "(drained by `scripts/claude-md-archive-regressions.mjs`). -->";
  const newSection = [sec.lines[sec.headerIdx], ...preamble, archiveRelPointer, "", ...keep];
  const newLines = [
    ...sec.lines.slice(0, sec.headerIdx),
    ...newSection,
    "",
    ...sec.lines.slice(sec.endIdx),
  ];
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const newText = newLines.join(eol);

  if (dryRun) {
    return { ok: true, dryRun: true, drained: toArchive.length, kept: keep.length,
             beforeBytes: Buffer.byteLength(text), afterBytes: Buffer.byteLength(newText) };
  }

  // Optimistic-concurrency guard: CLAUDE.md is peer-contended. If it changed
  // between our read and now, abort — never clobber a peer append.
  let mtime1;
  try { mtime1 = statSync(claudeMd).mtimeMs; } catch { mtime1 = mtime0; }
  if (mtime1 !== mtime0) return { ok: false, reason: "peer_wrote_aborted" };

  // Write archive FIRST (additive — safe; at worst a transient duplicate),
  // then CLAUDE.md (the shrink). If step 2 fails, nothing is lost.
  const aw = atomicWrite(archive, newArchive);
  if (!aw.ok) return { ok: false, reason: "archive_write_failed", error: aw.error };
  const cw = atomicWrite(claudeMd, newText);
  if (!cw.ok) return { ok: false, reason: "claude_md_write_failed", error: cw.error,
                        note: "archive already written — re-run is safe (idempotent)" };

  // --- verify-after-rename ---
  // Re-read CLAUDE.md and confirm: (a) the section still parses, (b) the
  // entry count matches keep.length, (c) exactly one pointer line is present.
  // Fail loud (R12) — a verify miss is a silent-corruption class.
  let verifyText;
  try { verifyText = readFileSync(claudeMd, "utf8"); }
  catch (e) {
    return { ok: false, reason: "verify_read_failed", error: String((e && e.message) || e) };
  }
  const verifySec = parseRegressionSection(verifyText);
  if (!verifySec) return { ok: false, reason: "verify_section_missing" };
  // Count entries directly — every entry STARTS with `- ` and continuation
  // lines do not (ENTRY_RE has no leading whitespace tolerance), so a per-line
  // count of `^- ` matches the number of entries exactly. Avoids the
  // `Infinity` keepN smell flagged in per-file gate (P1, Reviewer A 2026-05-17).
  const verifyEntryCount = verifySec.body.filter((l) => ENTRY_RE.test(l)).length;
  if (verifyEntryCount !== keep.length) {
    return { ok: false, reason: "verify_entry_count_mismatch",
             expected: keep.length, found: verifyEntryCount };
  }
  const fileLines = verifyText.split(/\r?\n/);
  const pointerLines = fileLines.filter(
    (l) => HTML_COMMENT_RE.test(l) && l.includes(POINTER_MARK)
  );
  if (pointerLines.length !== 1) {
    return { ok: false, reason: "verify_pointer_count", pointerCount: pointerLines.length };
  }
  // Canonical comment must not be DUPLICATED — its absence is allowed (older
  // CLAUDE.md may not carry it), but a planDrain regression that mistakenly
  // copied it should fail loud (P1, Reviewer B 2026-05-17).
  const canonicalCount = fileLines.filter(
    (l) => HTML_COMMENT_RE.test(l) && /Append-only/.test(l)
  ).length;
  if (canonicalCount > 1) {
    return { ok: false, reason: "verify_canonical_duplicated", canonicalCount };
  }

  return {
    ok: true, drained: toArchive.length, kept: keep.length, entryCount,
    beforeBytes: Buffer.byteLength(text), afterBytes: Buffer.byteLength(newText),
    archive,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");
  const keepIdx = argv.indexOf("--keep");
  const keepN = keepIdx >= 0 && argv[keepIdx + 1] ? parseInt(argv[keepIdx + 1], 10) : DEFAULT_KEEP;

  let r;
  try { r = run({ dryRun, keepN: Number.isFinite(keepN) ? keepN : DEFAULT_KEEP }); }
  catch (e) { r = { ok: false, reason: "threw", error: String((e && e.message) || e) }; }

  if (asJson) { process.stdout.write(JSON.stringify(r, null, 2)); }
  else if (r.ok && r.drained > 0) {
    process.stdout.write(
      `claude-md-archive-regressions: drained ${r.drained} entr${r.drained === 1 ? "y" : "ies"} → archive` +
      `${r.dryRun ? " (DRY-RUN — no write)" : ""}\n` +
      `  CLAUDE.md ${r.beforeBytes} B → ${r.afterBytes} B (kept ${r.kept} newest)\n`
    );
  } else if (r.ok) {
    process.stdout.write(`claude-md-archive-regressions: nothing to drain (${r.kept} entries within keep-window)\n`);
  } else {
    process.stdout.write(`claude-md-archive-regressions: NO-OP — ${r.reason}${r.error ? " (" + r.error + ")" : ""}\n`);
  }
  process.exit(r.ok ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("claude-md-archive-regressions.mjs");
if (invokedDirectly) main();
