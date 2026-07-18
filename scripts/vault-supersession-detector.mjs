#!/usr/bin/env node
// SIERRA-VAULT-OPS/U-VAULT-SUPERSEDE-DETECT -- Memory supersession detector (slot:sierra, 2026-06-17).
//
// The worst failure mode of a 2nd-brain (per the 2026 PKM articles) is surfacing
// STALE information as CURRENT -- "confidently wrong about your own data". PRISM has
// thousands of date-stamped memories (reference_X_2026-06-15.md) where a newer
// dated sibling supersedes an older one, but the older file is NOT marked, so the
// recall hot-path can still surface yesterday's snapshot as today's truth.
//
// This sentinel DETECTS that: a dated memory whose topic-stem has a strictly-newer
// dated sibling is a SUPERSESSION CANDIDATE. By default it is READ-ONLY -- it emits
// a triage report (state/shared/memory-supersession-report.json) + console summary.
// The gated `--mark` writer (default OFF) ADDITIVELY prepends the recall-readable
// marker to each candidate's authoritative copy (reversible, backed up, idempotent);
// it NEVER deletes, moves, or edits existing content (per [[feedback_never_delete_only_disable]]).
//
// SINGLE SOURCE OF TRUTH for "is this already superseded?": it imports the EXACT
// isSupersededMemory predicate the live recall path uses
// (scripts/lib/memory-index-search-lib.mjs, MEMORY-RECALL-SUPERSEDE 2026-06-01) so
// detection and recall-exclusion can never drift. The canonical marker the recall
// consumer reads is the case-sensitive past-tense PROSE form -- the vault uses NO
// status:/superseded_by: frontmatter (verified 0 of 11,493 files), so a follow-up
// --mark MUST write that prose form, not a new frontmatter key:
//   body blockquote:  > **SUPERSEDED <date> -- see [[newer]].**   (formatMarker)
// formatMarker emits exactly that (ASCII --; the consumer regex keys on
// > **SUPERSEDED\b, the dash is cosmetic) so its output is recall-readable by
// construction -- proven by a self-test in the suite.
//
// CLI:
//   node scripts/vault-supersession-detector.mjs            # console report (default)
//   node scripts/vault-supersession-detector.mjs --json     # machine report
//   node scripts/vault-supersession-detector.mjs --write    # persist report JSON
//   node scripts/vault-supersession-detector.mjs --limit 20 # show N candidates (console-only;
//                                                           # --json/--write always emit the full set)
//   node scripts/vault-supersession-detector.mjs --mark --dry-run  # preview exactly what --mark would do
//   node scripts/vault-supersession-detector.mjs --mark      # APPLY markers (reversible, per-run backup)
// --mark marks the H: copy (what recall reads) AND, for a C:-sourced memo, the C:
// source too (so the Stop feed C:->H: can't clobber the H: mark). Undo: restore the
// per-run backup (UNCONDITIONAL), or PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1 (re-includes
// in recall only after the next memory-index SIDECAR rebuild -- the sidecar bakes the
// exclusion at build time; the env flag alone affects only the live-scan recall path).

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync, unlinkSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import { isSupersededMemory } from "./lib/memory-index-search-lib.mjs";

const DEFAULT_MEMORY_ROOT = "H:/prism/knowledge/memories";
// The Claude-Code AutoMemory source dir (flat). A candidate whose basename also
// lives here is C:-SOURCED -- the Stop feed re-copies C:->H:, so a durable --mark
// must target the C: copy (else the next feed clobbers an H:-only mark). The
// detector flags this per-candidate (hasCSource) so the follow-up unit knows.
const DEFAULT_C_MEMORY_ROOT = "C:/Users/wompu/.claude/projects/H--prism/memory";
const DEFAULT_REPORT = "H:/prism/state/shared/memory-supersession-report.json";
const DEFAULT_LIMIT = 12;

function walkMd(root, { readdirImpl = readdirSync } = {}) {
  const out = [];
  let entries;
  try { entries = readdirImpl(root, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      if (/^(_archive|archive|quarantine|\.)/i.test(e.name)) continue;
      out.push(...walkMd(p, { readdirImpl }));
    } else if (e.isFile() && /\.md$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// Parse a PRISM dated-memory basename into { stem, dateStr, dateMs }. The date
// must be the TRAILING token immediately before .md (the reference_X_DATE.md
// convention); separators may be _, -, or . and may mix. A non-greedy stem + the
// \.md$ anchor means that when a name carries two dates, the LAST one is the
// version date and any earlier date stays inside the stem (so two notes that
// merely share an embedded date but differ in trailing version are not merged).
// Returns null for undated names, mid-name-only dates, and impossible dates.
export function parseDatedName(fileName) {
  const b = basename(String(fileName));
  const m = b.match(/^(.*?)[._-](20\d\d)[._-](\d{2})[._-](\d{2})\.md$/i);
  if (!m) return null;
  const stem = m[1].replace(/[._-]+$/, "");
  if (!stem) return null;
  const [, , y, mo, d] = m;
  // Validate real calendar bounds via a UTC round-trip. Date.parse is lenient and
  // SILENTLY ROLLS OVER impossible dates (2026-02-30 -> Mar 02, 2026-06-31 -> Jul 01),
  // which would make dateMs (ordering) diverge from dateStr (the operator-facing
  // marker) -- a stale older note could then mis-sort vs its sibling. Reconstruct
  // the date and reject anything the rollover changed (covers month 13, day 40,
  // Feb 30, Jun 31, ...). dateMs comes from the validated Date (no second parse).
  const yN = Number(y), moN = Number(mo), dN = Number(d);
  const dt = new Date(Date.UTC(yN, moN - 1, dN));
  if (dt.getUTCFullYear() !== yN || dt.getUTCMonth() !== moN - 1 || dt.getUTCDate() !== dN) return null;
  return { stem, dateStr: `${y}-${mo}-${d}`, dateMs: dt.getTime() };
}

// The canonical recall-readable supersession marker (body blockquote form). ASCII
// -- (the consumer regex SUPERSEDED_DECL_RE keys on > **SUPERSEDED\b). Past tense
// is load-bearing: it must read SUPERSEDED, never SUPERSEDES (the superseder).
export function formatMarker(olderDateStr, newerId) {
  return `> **SUPERSEDED ${olderDateStr} -- see [[${newerId}]].**`;
}

// EPISODIC-SERIES EXCLUSION (U-SIERRA-SUPERSEDE-SERIES-FIX, 2026-06-29, slot:sierra). The same-stem +
// strictly-newer-trailing-date rule conflates two DIFFERENT kinds of dated memo:
//   (a) a re-VERSIONED note -- "current state of topic X", where the newer truly supersedes the older
//       (the genuine supersession the recall path should exclude as stale), and
//   (b) a dated SERIES -- an episodic per-day/per-event record (a daily session trace, a per-ship
//       clean-ship snapshot, a per-review scrutiny ledger) where EACH date is independent history,
//       NOT a re-version of the prior one.
// Auto-marking class (b) as "superseded" silently drops genuine per-day history from the recall
// hot-path (live-caught by the 3-of-3 arm-C review of the auto-heal: 18/19 reference_session_alpha_*
// daily traces were wrongly marked). These series stems are therefore EXCLUDED from supersession
// candidacy entirely -- they are not stale-as-current, they are distinct records. The list is a
// conservative denylist of the fleet's known auto-generated dated series; extend it as new series
// classes appear (a false EXCLUSION only forgoes a mark, never makes a wrong one -- the safe direction).
const EPISODIC_SERIES_RE = /(?:^|[_-])(?:session|scrutiny|clean[_-]?ship|clean_ship|weekly[_-]?synthesis|daily[_-]?digest|context[_-]?regain)(?:$|[_-])/i;
export function isEpisodicSeriesStem(stem) {
  return EPISODIC_SERIES_RE.test(String(stem));
}

function relKnowledge(p) {
  return String(p).replace(/\\/g, "/").replace(/^.*\/knowledge\//, "knowledge/");
}

export function runSupersessionScan({
  memoryRoot = DEFAULT_MEMORY_ROOT,
  cMemoryRoot = DEFAULT_C_MEMORY_ROOT,
  nowMs = Date.now(),
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  existsImpl = existsSync,
} = {}) {
  const files = walkMd(memoryRoot, { readdirImpl });

  // C:-source basenames (lowercased) for durability guidance -- best-effort.
  const cBasenames = new Set();
  try {
    if (existsImpl(cMemoryRoot)) {
      for (const e of readdirImpl(cMemoryRoot, { withFileTypes: true })) {
        if (e.isFile() && /\.md$/i.test(e.name)) cBasenames.add(e.name.toLowerCase());
      }
    }
  } catch { /* best-effort -- guidance only, never throws the scan */ }

  // Collect dated files with their already-marked state. A file that fails to read
  // (locked / EIO / EACCES) is skipped, but we COUNT it (readErrors) so the report
  // never silently implies complete coverage -- an unreadable stale memo would
  // otherwise vanish from triage with no trace (R12 fail-loud on partial coverage).
  const dated = [];
  let readErrors = 0;
  for (const f of files) {
    const parsed = parseDatedName(f);
    if (!parsed) continue;
    let raw;
    try { raw = readFileImpl(f, "utf8"); } catch { readErrors++; continue; }
    dated.push({ path: f, base: basename(f), marked: isSupersededMemory(raw), ...parsed });
  }

  // Group by topic-stem.
  const byStem = new Map();
  for (const r of dated) {
    if (!byStem.has(r.stem)) byStem.set(r.stem, []);
    byStem.get(r.stem).push(r);
  }

  const report = {
    generatedAt: new Date(nowMs).toISOString(),
    memoryRoot, scanned: files.length, dated: dated.length, readErrors, stems: byStem.size,
    supersessionStems: 0, alreadyMarked: 0, unmarked: 0,
    candidates: [],
  };

  let seriesStemsExcluded = 0;
  for (const [stem, members] of byStem) {
    if (members.length < 2) continue;
    // Skip episodic dated series (session traces / clean-ship / scrutiny ledgers): each date is
    // independent history, NOT a re-version, so a newer sibling does NOT supersede an older one
    // (U-SIERRA-SUPERSEDE-SERIES-FIX). Counted so the report is honest about what it declined to flag.
    if (isEpisodicSeriesStem(stem)) { seriesStemsExcluded++; continue; }
    // Ascending by date, then basename for stable tie order.
    members.sort((a, b) => a.dateMs - b.dateMs || a.base.localeCompare(b.base));
    const maxMs = members[members.length - 1].dateMs;
    // Co-current tie: every member sharing the max date is "current" -- none of
    // them is superseded by another (can't order same-day snapshots). The newest
    // distinct-date file is the supersession target.
    const current = members[members.length - 1];
    const newerId = current.base.replace(/\.md$/i, "");
    let stemHasSuperseded = false;
    for (const m of members) {
      if (m.dateMs >= maxMs) continue; // current / co-current -- keep in recall
      stemHasSuperseded = true;
      if (m.marked) { report.alreadyMarked++; continue; }
      report.unmarked++;
      report.candidates.push({
        older: relKnowledge(m.path),
        olderAbs: String(m.path).replace(/\\/g, "/"),  // for --mark (the on-disk file to mark)
        base: m.base,
        olderDate: m.dateStr,
        newer: relKnowledge(current.path),
        newerId,
        hasCSource: cBasenames.has(m.base.toLowerCase()),
        marker: formatMarker(m.dateStr, newerId),
      });
    }
    if (stemHasSuperseded) report.supersessionStems++;
  }

  // Oldest-first so the most-stale leak surfaces at the top of the triage list.
  report.candidates.sort((a, b) => a.olderDate.localeCompare(b.olderDate));
  report.candidateCount = report.candidates.length;
  report.seriesStemsExcluded = seriesStemsExcluded; // episodic dated series intentionally not flagged
  return report;
}

// Insert the supersession marker into a note BODY (after frontmatter so the recall
// path's body scan sees it; if there is no frontmatter, prepend at the very top).
// Purely additive -- existing content is never edited or removed, only a single
// reversible blockquote line is added.
export function insertMarker(raw, marker) {
  const fm = String(raw).match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  if (fm) {
    const head = fm[1];
    const rest = raw.slice(head.length).replace(/^\r?\n/, ""); // collapse one leading blank
    return `${head}\n${marker}\n\n${rest}`;
  }
  return `${marker}\n\n${raw}`;
}

// Inverse of insertMarker: strip the canonical SUPERSEDED blockquote line(s) and collapse the
// blank padding the insert added, so a wrongly-marked memo is restored to recall. Idempotent
// (no-op when not marked). Used by --unmark-series to remediate the episodic-series false marks
// that pre-dated EPISODIC_SERIES_RE (U-SIERRA-SUPERSEDE-SERIES-FIX). Purely subtractive of the
// marker; the note's real content is untouched. Keys on the SAME `> **SUPERSEDED\b` form the
// recall predicate + formatMarker use, so detection/insert/remove can never drift.
export function removeMarker(raw) {
  const s = String(raw);
  if (!isSupersededMemory(s)) return s;                          // not marked -> nothing to undo
  let out = s.replace(/^> \*\*SUPERSEDED\b[^\n]*\r?\n/gm, "");   // drop the marker line(s)
  out = out.replace(/(\r?\n){3,}/g, "\n\n");                     // collapse the blank padding it left
  return out;
}

// Backup filename: an 8-char hash of the FULL source path + the flattened path, so
// two distinct sources can never alias to the same backup (the flatten alone could
// collide a `/` with a literal `_` at the same offset, letting one backup overwrite
// another and silently weakening reversibility -- the hash makes the name injective).
export function backupName(p) {
  const norm = String(p).replace(/\\/g, "/");
  const h = createHash("sha1").update(norm).digest("hex").slice(0, 8);
  return `${h}_${norm.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

// Apply the recall-readable marker to each candidate's AUTHORITATIVE copy. A
// C:-sourced file is marked at its C: source (the Stop feed propagates C:->H:; an
// H:-only mark would be clobbered on the next feed); an H:-native file is marked
// in place. Idempotent (skips an already-marked file), atomic (temp+rename), and
// every ORIGINAL is copied into a per-run backup dir before mutation (reversible).
// dryRun=true reports exactly what WOULD be marked without touching disk.
export function applyMarks({
  candidates,
  cMemoryRoot = DEFAULT_C_MEMORY_ROOT,
  backupRoot,
  stamp,
  dryRun = false,
  readFileImpl = readFileSync,
  writeFileImpl = writeFileSync,
  existsImpl = existsSync,
  mkdirImpl = mkdirSync,
  copyImpl = copyFileSync,
  renameImpl = renameSync,
  unlinkImpl = unlinkSync,
} = {}) {
  const result = { marked: 0, skippedAlreadyMarked: 0, missing: 0, errors: 0, files: [], backupDir: null };
  // Forward-slash normalized so the reported backupDir matches the (also normalized)
  // files[] paths; join() still consumes "/" correctly on Windows for the real I/O.
  if (!dryRun && backupRoot) result.backupDir = join(backupRoot, `memory-supersession-backup-${stamp}`).replace(/\\/g, "/");

  for (const c of (candidates || [])) {
    // Recall reads the H: vault (memory-index-search-lib DEFAULT_VAULT_ROOT), so the
    // H: copy is ALWAYS the target that matters. For a C:-sourced memo we ALSO mark
    // the C: source -- otherwise the next Stop feed (C:->H:) would copy the unmarked
    // C: original over our H: mark and silently revert it. Both copies carry the
    // identical marker, so the feed sees them byte-equal and stays stable.
    const targets = [c.olderAbs];
    if (c.hasCSource) targets.push(join(cMemoryRoot, c.base));
    for (const target of targets) {
      let raw;
      try { raw = readFileImpl(target, "utf8"); }
      catch { result.missing++; continue; }          // copy not where expected -> skip, count
      if (isSupersededMemory(raw)) { result.skippedAlreadyMarked++; continue; }  // idempotent
      const out = insertMarker(raw, c.marker);
      if (dryRun) { result.marked++; result.files.push(target.replace(/\\/g, "/")); continue; }
      try {
        if (result.backupDir) {
          if (!existsImpl(result.backupDir)) mkdirImpl(result.backupDir, { recursive: true });
          copyImpl(target, join(result.backupDir, backupName(target)));
        }
        const tmp = `${target}.tmp-supersede`;
        writeFileImpl(tmp, out, "utf8");
        renameImpl(tmp, target);
        result.marked++; result.files.push(target.replace(/\\/g, "/"));
      } catch {
        result.errors++;
        // best-effort: don't leave a half-written .tmp-supersede orphan if rename failed
        // (use the injected unlinkImpl so the cleanup path is testable like every other I/O op)
        try { unlinkImpl(`${target}.tmp-supersede`); } catch { /* nothing to clean */ }
      }
    }
  }
  return result;
}

// REMEDIATION (U-SIERRA-SUPERSEDE-SERIES-FIX): walk the vault and UN-mark every episodic-series memo
// that a pre-fix --mark run wrongly marked superseded (session traces / clean-ship / scrutiny ledgers).
// Restores them to the recall hot-path. Mirrors applyMarks' safety: idempotent (skips unmarked),
// atomic (temp+rename), per-run backup before each mutation, and un-marks BOTH the H: copy AND the
// matching C: source (so the Stop feed C:->H: doesn't re-introduce the mark). dryRun reports only.
export function runUnmarkSeries({
  memoryRoot = DEFAULT_MEMORY_ROOT,
  cMemoryRoot = DEFAULT_C_MEMORY_ROOT,
  backupRoot,
  stamp,
  dryRun = false,
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  writeFileImpl = writeFileSync,
  existsImpl = existsSync,
  mkdirImpl = mkdirSync,
  copyImpl = copyFileSync,
  renameImpl = renameSync,
  unlinkImpl = unlinkSync,
} = {}) {
  const files = walkMd(memoryRoot, { readdirImpl });
  const result = { scanned: files.length, seriesMarked: 0, unmarked: 0, missing: 0, errors: 0, files: [], backupDir: null };
  if (!dryRun && backupRoot) result.backupDir = join(backupRoot, `memory-unmark-series-backup-${stamp}`).replace(/\\/g, "/");

  for (const f of files) {
    const parsed = parseDatedName(f);
    if (!parsed || !isEpisodicSeriesStem(parsed.stem)) continue;  // only episodic-series memos
    let raw;
    try { raw = readFileImpl(f, "utf8"); } catch { result.missing++; continue; }
    if (!isSupersededMemory(raw)) continue;                       // not wrongly marked -> skip
    result.seriesMarked++;
    // H: copy (what recall reads) + the matching C: source if it too carries the mark.
    const base = basename(f);
    const targets = [String(f).replace(/\\/g, "/")];
    const cPath = join(cMemoryRoot, base);
    try { if (existsImpl(cPath) && isSupersededMemory(readFileImpl(cPath, "utf8"))) targets.push(cPath.replace(/\\/g, "/")); }
    catch { /* C: read best-effort -- never blocks the H: un-mark */ }
    for (const target of targets) {
      let traw;
      try { traw = readFileImpl(target, "utf8"); } catch { result.missing++; continue; }
      if (!isSupersededMemory(traw)) continue;                    // idempotent
      const out = removeMarker(traw);
      if (dryRun) { result.unmarked++; result.files.push(target); continue; }
      try {
        if (result.backupDir) {
          if (!existsImpl(result.backupDir)) mkdirImpl(result.backupDir, { recursive: true });
          copyImpl(target, join(result.backupDir, backupName(target)));
        }
        const tmp = `${target}.tmp-unmark`;
        writeFileImpl(tmp, out, "utf8");
        renameImpl(tmp, target);
        result.unmarked++; result.files.push(target);
      } catch {
        result.errors++;
        try { unlinkImpl(`${target}.tmp-unmark`); } catch { /* nothing to clean */ }
      }
    }
  }
  return result;
}

// Exit-code contract for --mark (R12 fail-loud). A per-file WRITE/BACKUP/RENAME failure
// (applyMarks result.errors) is a REAL failure the now-unattended nightly+on-Stop brain-refresh
// must surface LOUD -- a silently half-applied mark would otherwise read as a green "ok" step
// (the supersession step carries no benignExits, so exit 1 -> "failed"). `missing` is NOT a failure:
// a legitimately-absent C: source copy is expected (the H: copy that recall reads still got marked),
// so it never fails the run -- proven by the "C: source absent -> H: still marked" test. dryRun never fails.
export function markExitCode({ dryRun = false, errors = 0 } = {}) {
  return !dryRun && errors > 0 ? 1 : 0;
}

function parseArgs(argv) {
  const out = { json: false, write: false, mark: false, unmarkSeries: false, dryRun: false, limit: DEFAULT_LIMIT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--write") out.write = true;
    else if (a === "--mark") out.mark = true;
    else if (a === "--unmark-series") out.unmarkSeries = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--limit") { const n = parseInt(argv[++i], 10); if (Number.isFinite(n)) out.limit = Math.max(0, n); }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const start = Date.now();

  if (args.unmarkSeries) {
    // Remediation: un-mark episodic-series memos a pre-fix --mark run wrongly marked superseded.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const res = runUnmarkSeries({ backupRoot: "H:/prism/state/shared", stamp, dryRun: args.dryRun });
    const verb = args.dryRun ? "DRY-RUN would unmark" : "UNMARKED";
    process.stdout.write(
      `[supersession-detector] unmark-series: scanned=${res.scanned} seriesMarked=${res.seriesMarked} ` +
      `${verb}=${res.unmarked} missing=${res.missing} errors=${res.errors}` +
      (res.backupDir ? ` backup=${res.backupDir}` : "") + "\n",
    );
    res.files.slice(0, args.limit).forEach((f) => process.stdout.write(`    ${args.dryRun ? "would unmark" : "unmarked"}: ${f}\n`));
    if (!args.dryRun) {
      // Refresh the persisted report so vault-health sees the post-remediation state.
      try {
        const fresh = runSupersessionScan({});
        if (!existsSync(dirname(DEFAULT_REPORT))) mkdirSync(dirname(DEFAULT_REPORT), { recursive: true });
        writeFileSync(DEFAULT_REPORT, JSON.stringify(fresh, null, 2) + "\n", "utf8");
      } catch { /* best-effort report refresh */ }
    }
    process.exitCode = markExitCode({ dryRun: args.dryRun, errors: res.errors });
    return;
  }

  const report = runSupersessionScan({});
  const elapsedMs = Date.now() - start;

  if (args.mark) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const res = applyMarks({
      candidates: report.candidates,
      backupRoot: "H:/prism/state/shared",
      stamp,
      dryRun: args.dryRun,
    });
    const verb = args.dryRun ? "DRY-RUN would mark" : "MARKED";
    process.stdout.write(
      `[supersession-detector] candidates=${report.candidateCount} ${verb}=${res.marked} ` +
      `skippedAlreadyMarked=${res.skippedAlreadyMarked} missing=${res.missing} errors=${res.errors}` +
      (res.backupDir ? ` backup=${res.backupDir}` : "") + "\n",
    );
    res.files.slice(0, args.limit).forEach((f) => process.stdout.write(`    ${args.dryRun ? "would mark" : "marked"}: ${f}\n`));
    if (!args.dryRun) {
      process.stdout.write("  Reversible: restore the per-run backup (unconditional), or PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1 (takes effect after the next memory-index sidecar rebuild).\n");
      // Refresh the persisted report so consumers (e.g. vault-health) see the POST-mark
      // state, not the pre-apply candidate count -- otherwise --mark leaves a fresh-looking
      // but content-stale report that reads as a false WARN (R12).
      try {
        const fresh = runSupersessionScan({});
        if (!existsSync(dirname(DEFAULT_REPORT))) mkdirSync(dirname(DEFAULT_REPORT), { recursive: true });
        writeFileSync(DEFAULT_REPORT, JSON.stringify(fresh, null, 2) + "\n", "utf8");
      } catch { /* best-effort report refresh */ }
    }
    // R12: a partial apply (real write/backup/rename errors) must fail the step LOUD -- the nightly
    // brain-refresh supersession step has no benignExits, so exit 1 surfaces as a "failed" refresh
    // instead of a silent green. `missing` (absent C: copy) is expected and does NOT fail.
    process.exitCode = markExitCode({ dryRun: args.dryRun, errors: res.errors });
    return;
  }

  if (args.write) {
    if (!existsSync(dirname(DEFAULT_REPORT))) mkdirSync(dirname(DEFAULT_REPORT), { recursive: true });
    writeFileSync(DEFAULT_REPORT, JSON.stringify({ ...report, elapsedMs }, null, 2) + "\n", "utf8");
  }
  if (args.json) {
    process.stdout.write(JSON.stringify({ ...report, elapsedMs }, null, 2) + "\n");
    return;
  }

  const cSourced = report.candidates.filter((c) => c.hasCSource).length;
  process.stdout.write(
    `[supersession-detector] scanned=${report.scanned} dated=${report.dated} stems=${report.stems} ` +
    `supersessionStems=${report.supersessionStems} alreadyMarked=${report.alreadyMarked} ` +
    `UNMARKED=${report.candidateCount} (${cSourced} C:-sourced)` +
    `${report.readErrors ? ` readErrors=${report.readErrors}` : ""} elapsed=${elapsedMs}ms\n`,
  );
  if (report.candidateCount > 0) {
    process.stdout.write(`  (oldest ${Math.min(args.limit, report.candidateCount)} unmarked supersession candidates):\n`);
    report.candidates.slice(0, args.limit).forEach((c) => {
      process.stdout.write(`    ${c.older} (${c.olderDate})  ->  [[${c.newerId}]]${c.hasCSource ? "  [C:-sourced: mark C: copy]" : ""}\n`);
    });
    process.stdout.write("  READ-ONLY -- this detector never marks. A follow-up --mark unit writes the recall-readable\n");
    process.stdout.write("  > **SUPERSEDED <date> -- see [[newer]].** blockquote (reversible, backed up, operator-gated).\n");
    process.stdout.write("  Re-run with --write to persist state/shared/memory-supersession-report.json.\n");
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  try { main(); }
  catch (err) {
    try { process.stderr.write(`[supersession-detector] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
