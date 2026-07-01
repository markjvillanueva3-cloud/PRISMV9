#!/usr/bin/env node
// scripts/vault-link-doctor.mjs
//
// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
//
// WHY: the vault has ~19.6K broken link instances across ~14.8K notes, which is
// the root of its ~24% orphan rate. But verify-then-build (2026-06-17) showed
// MOST broken links are DANGLING (point to notes that were never created --
// `.base` files, aspirational concept stubs, corpus refs), NOT typo-fixable. A
// blind mass-rewrite would be ineffective AND dangerous. So this tool CLASSIFIES
// first and rewrites ONLY a link with a UNIQUE high-confidence rematch -- it heals
// authored intent, it NEVER invents a link (the failure mode the 2026 PKM
// literature warns poisons an agent's second brain).
//
// IMMUNE TO THE PRIOR HOLE (U-VAULT-LINK-HEAL-HARDEN, d948b85a74e7, 2026-06-08):
// that tool used Levenshtein EDIT-DISTANCE and had to disarm ~14,100 short-token
// near-collisions auto-applied as renames (goal->go, echo->eco, skill->mill). This
// tool does NOT use edit distance -- a heal requires EXACT slug equality
// (slugify(target) === slugify(noteKey), i.e. identical after dropping separators +
// lowercasing) AND a unique non-self candidate. `goal`/`go` have DIFFERENT slugs and
// can never match; the only equivalence is separators/case (a TRUE rename, e.g.
// reference-slot == reference_slot). Empirically (2026-06-17 live run, 12,629 heals):
// ZERO heals had a slug <=4 chars; all were >=7, 99.97% >=10. Therefore NO min-length
// guard is added (it would wrongly block a correct short exact match like [[wedm]] ->
// wedm.md). Do NOT reintroduce fuzzy/edit-distance matching here.
//
// Three classes per broken target:
//   HEALABLE  -- resolves to EXACTLY ONE note by a stronger match than the
//                navigator uses (slug-normalized basename/title/alias), high
//                confidence -> safe to rewrite. >1 candidate is ambiguous and NOT
//                healable UNLESS a CANONICAL-PREFERENCE derank (dropping known
//                mirror/stub copies under galaxies/ | triplet-stubs/ | _legacy-root/)
//                leaves exactly one canonical -- then that unique canonical heals.
//   NON_NOTE  -- a `.base` file, an external scheme (http://, obsidian://), or an
//                asset target -- not a note link; never a heal/orphan defect.
//   DANGLING  -- no candidate note exists; a genuine dangling reference (concept
//                stub / never-created note). Reported, not rewritten.
//
// SAFETY:
//   - DRY-RUN by default; `--apply` performs the rewrite.
//   - Rewrites are SURGICAL per occurrence: only the `target` span inside `[[ ]]`
//     is swapped; any `|alias` and `#heading` are preserved.
//   - Links inside fenced/inline code are SKIPPED (never corrupt a code sample).
//   - Atomic write (temp + rename); a vault holding the memory-sync lock is skipped.
//   - Heals only HEALABLE-tier links; DANGLING/NON_NOTE are never touched.
//
// Usage:
//   node scripts/vault-link-doctor.mjs                 # dry-run summary
//   node scripts/vault-link-doctor.mjs --json          # machine JSON
//   node scripts/vault-link-doctor.mjs --samples 20    # show N per class
//   node scripts/vault-link-doctor.mjs --apply         # heal the HEALABLE tier
//   node scripts/vault-link-doctor.mjs --ambiguous     # advisory review of ambiguous
//                                                       # (real note exists, >1 rival;
//                                                       # never auto-healed -- human picks)
//
// @module vault-link-doctor
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const NAV = await import(pathToFileURL("H:/prism/scripts/obsidian-vault-navigator.mjs").href);
const { buildVaultModel, extractWikilinks, normalizeKey, DEFAULT_VAULT } = NAV;

const SYNC_LOCK = ".obsidian-memory-sync.lock";
const MAX_FILE = 512 * 1024; // skip rewriting a note larger than this (corpus dumps)

// ============================================================================
// PURE HELPERS
// ============================================================================

/** Slug of a link target / note key: keep [a-z0-9], drop everything else. Used as
 *  the strong-match key so `[[Hermes Memory Vault MS0]]` and the file
 *  `reference_hermes_memory_vault_ms0` collapse to the same slug. */
export function slugify(s) {
  return normalizeKey(String(s)).replace(/[^a-z0-9]/g, "");
}

/** Is a broken target a NON-NOTE link (never a heal/orphan defect)? */
export function isNonNote(target) {
  const t = String(target).trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return true;        // http://, obsidian://, file://
  if (/\.(base|canvas|png|jpg|jpeg|gif|svg|pdf|excalidraw)$/i.test(t)) return true; // non-markdown asset
  if (t.endsWith("/")) return true;                          // folder-navigation link ([[tribal/]]) -- a folder ref, not a note (matching it to a same-basename note is a false positive)
  if (/^["'].*["']$/.test(t)) return true;                   // quoted literal ([["cam"]]) -- code/array text captured from a transcript, not a real wikilink
  return false;
}

/**
 * Subdirs that hold a NON-canonical MIRROR or STUB copy of a note whose canonical
 * version lives elsewhere under a type/section dir:
 *   `galaxies/<g>/`  -- the per-galaxy MEMORY.md Obsidian mirror (canonical = the
 *                       reference/ | feedback/ | project/ copy)
 *   `triplet-stubs/` -- a course triplet stub (canonical = the parent course note)
 *   `_legacy-root/`  -- a legacy pre-type-dir mirror of a root memo
 * A broken slug that collides ONLY because one of these mirror copies shares the
 * canonical's slug is NOT a genuine ambiguity -- the canonical copy is unambiguously
 * the intended target. Measured 2026-06-17 (live vault): deranking these resolves
 * 74 of 169 ambiguous broken links to a single canonical. The same-dir dual-file slug
 * variants that REMAINED (a generated wiki formula `x-quote.md` vs `xquote.md` --
 * identical after slugify) are now resolved by the SEPARATOR-VARIANT COLLAPSE
 * (preferKebabVariant below): there is no subdir tell, so selection KEYS on the kebab-
 * case form (more word-boundary separators = the wiki slug convention). Live 2026-06-18:
 * this collapsed the residual ambiguous broken links 95 -> 15.
 */
const MIRROR_STUB_SUBDIR_RE = /(^|\/)(galaxies|triplet-stubs|_legacy-root)\//;

/** True if `rel` is under a known mirror/stub subdir (see MIRROR_STUB_SUBDIR_RE). */
export function isMirrorStub(rel) {
  return MIRROR_STUB_SUBDIR_RE.test(String(rel).replace(/\\/g, "/"));
}

/** A generated test-node doc lives under a `tests/` path segment (e.g.
 *  `wiki/architecture/tests/qd/qdrantmemoryengine.md`). It shares its subject's slug only
 *  because it is named after it. A `[[qdrant-memory-engine]]` link targets the ENGINE, never
 *  its test doc -- so a tests/ copy is NON-CANONICAL noise in a slug collision, same as a
 *  mirror copy. (A unique test-doc match with NO rival still heals via the single-candidate
 *  path; this only de-noises a >1 collision where a real subject doc also matches.) */
const TEST_DOC_SUBDIR_RE = /(^|\/)tests?\//;
export function isTestDoc(rel) {
  return TEST_DOC_SUBDIR_RE.test(String(rel).replace(/\\/g, "/"));
}

/**
 * SEPARATOR-VARIANT COLLAPSE. A generated-wiki collision where the SAME logical note
 * exists in the SAME directory under two basenames that differ ONLY by separator
 * placement (e.g. `...-additive-quote.md` vs `...-additivequote.md` -- both slugify
 * identically, so they collide). Unlike a mirror copy there is no subdir tell, but
 * there IS a canonical tell: the kebab-case form (more word-boundary separators) is the
 * wiki slug convention -- the SELECTION KEY here. (Size only corroborates: in every
 * reachable heal pair observed live 2026-06-18 the kebab form is the larger/canonical
 * file, but size is a signal, NOT the key -- separator count is.)
 *
 * Returns the unique most-separated candidate IFF every candidate is the same logical
 * note (same dir AND same separator-stripped basename); otherwise null (do NOT guess --
 * a cross-dir/category dup or a genuine different-note rivalry must stay ambiguous).
 * @param {string[]} cands
 * @returns {string|null}
 */
export function preferKebabVariant(cands) {
  if (!Array.isArray(cands) || cands.length < 2) return null;
  const norm = (r) => String(r).replace(/\\/g, "/");
  // NB: a slash-less (root-level) path has nothing to strip, so dirOf returns the whole
  // basename -> two root-level variants get DIFFERENT pseudo-dirs and never same-dir-match,
  // so root-level pairs fail-closed (stay ambiguous). Intentional: no canonical-dir tell there.
  const dirOf = (r) => norm(r).replace(/\/[^/]*$/, "");
  const baseOf = (r) => norm(r).split("/").pop().replace(/\.md$/i, "");
  const sepNorm = (b) => b.replace(/[-_\s]+/g, "").toLowerCase();
  const d0 = dirOf(cands[0]), n0 = sepNorm(baseOf(cands[0]));
  // ALL candidates must share the directory AND the separator-stripped basename, i.e.
  // they are the same logical note differing only by separator placement.
  if (!cands.every((r) => dirOf(r) === d0 && sepNorm(baseOf(r)) === n0)) return null;
  // sepCount counts only `-`/`_` (kebab/snake separators); spaces are intentionally NOT
  // counted -- generated wiki basenames are filesystem names (`-`/`_` only, never spaces).
  const sepCount = (r) => (baseOf(r).match(/[-_]/g) || []).length;
  const maxSep = Math.max(...cands.map(sepCount));
  const winners = cands.filter((r) => sepCount(r) === maxSep);
  return winners.length === 1 ? winners[0] : null; // unique kebab-canonical, else don't guess
}

/**
 * Build the slug -> Set(relpath) index from the vault model's basenameIndex. The
 * navigator already indexes filename basename + fm.name + fm.aliases (each
 * normalizeKey'd); we re-key those by the stronger SLUG so a link that differs
 * only in separators/spacing/case still resolves to its note.
 * @param {Map<string,string[]>} basenameIndex
 * @returns {Map<string,Set<string>>}
 */
export function buildSlugIndex(basenameIndex) {
  const slugIndex = new Map();
  for (const [key, rels] of basenameIndex) {
    const s = slugify(key);
    if (!s) continue;
    let set = slugIndex.get(s);
    if (!set) { set = new Set(); slugIndex.set(s, set); }
    for (const r of rels) set.add(r);
  }
  return slugIndex;
}

/**
 * Classify a single broken target. The caller has already confirmed
 * normalizeKey(target) is NOT in basenameIndex (i.e. the link is broken).
 * @param {string} target  raw wikilink target (alias/heading already stripped)
 * @param {string} fromRel the note the link is in (to exclude self-match)
 * @param {Map<string,Set<string>>} slugIndex
 * @returns {{cls:"HEALABLE"|"DANGLING"|"NON_NOTE", to?:string, candidates?:number, cands?:string[], deranked?:boolean}}
 */
export function classifyBrokenTarget(target, fromRel, slugIndex) {
  if (isNonNote(target)) return { cls: "NON_NOTE" };
  const s = slugify(target);
  if (!s) return { cls: "DANGLING" };
  const set = slugIndex.get(s);
  if (!set || set.size === 0) return { cls: "DANGLING" };
  const cands = [...set].filter((r) => r !== fromRel); // exclude self
  if (cands.length === 1) return { cls: "HEALABLE", to: cands[0], candidates: 1 };
  if (cands.length > 1) {
    // CANONICAL-PREFERENCE DERANK: a slug that collides ONLY because a NON-CANONICAL copy
    // shares it is not a genuine ambiguity -- drop those and prefer the canonical. Two
    // non-canonical buckets: a mirror/stub copy (galaxies/, triplet-stubs/, _legacy-root/)
    // and a generated test-node doc (tests/ -- a `[[X]]` link means X, never X's test). If
    // EXACTLY ONE canonical remains the target is unique -> HEALABLE (flagged `deranked`).
    // Else stay ambiguous, but report the canonical rivals (noise removed) so --ambiguous
    // surfaces the REAL ones. (If filtering empties the pool -- all candidates are
    // mirror/test -- fall back to the full set so we never heal to a non-canonical.)
    const canonical = cands.filter((r) => !isMirrorStub(r) && !isTestDoc(r));
    if (canonical.length === 1) return { cls: "HEALABLE", to: canonical[0], candidates: 1, deranked: true };
    // SEPARATOR-VARIANT COLLAPSE: if the surviving canonical rivals are the SAME logical note
    // in the same dir differing only by separator placement, prefer the kebab-case form.
    if (canonical.length > 1) {
      const kebab = preferKebabVariant(canonical);
      if (kebab) return { cls: "HEALABLE", to: kebab, candidates: 1, deranked: true };
    }
    const pool = canonical.length > 0 ? canonical : cands;
    return { cls: "DANGLING", candidates: pool.length, cands: pool }; // ambiguous -> NEVER auto-pick (pool = rival notes, for --ambiguous review)
  }
  return { cls: "DANGLING" };
}

/**
 * Locate code spans (fenced ``` blocks + inline `code`) as [start,end) ranges so
 * a link inside code is never rewritten. Returns a sorted range list.
 * @param {string} text
 * @returns {Array<[number,number]>}
 */
export function codeRanges(text) {
  const ranges = [];
  let m;
  const fence = /```[\s\S]*?```/g;
  while ((m = fence.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length]);
  const inline = /`[^`\r\n]*`/g;
  while ((m = inline.exec(text)) !== null) ranges.push([m.index, m.index + m[0].length]);
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

function inAnyRange(pos, ranges) {
  for (const [a, b] of ranges) { if (pos >= a && pos < b) return true; if (a > pos) break; }
  return false;
}

/**
 * Blank out code spans (fenced + inline), preserving length, so diagnose() sees
 * the SAME link set rewriteLinks() will touch. Without this, a [[link]] that
 * lives only inside code is classified HEALABLE but rewriteLinks (correctly)
 * refuses it -> the HEALABLE count never converges to what --apply heals (R12).
 * @param {string} text
 * @returns {string}
 */
export function stripCode(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length))
    .replace(/`[^`\r\n]*`/g, (m) => " ".repeat(m.length));
}

/**
 * Rewrite the HEALABLE links in a note body. For each `[[target...]]` NOT inside
 * code, if `heals` has an entry for normalizeKey(target), swap only the target
 * text (preserve `|alias` and `#heading`); the new display target is the matched
 * note's basename without `.md`.
 * @param {string} text
 * @param {Map<string,string>} heals  normalizeKey(target) -> new relpath
 * @returns {{text:string, count:number}}
 */
export function rewriteLinks(text, heals) {
  if (typeof text !== "string" || !heals || heals.size === 0) return { text, count: 0 };
  const ranges = codeRanges(text);
  let count = 0;
  const out = text.replace(/(!?)\[\[([^\]\r\n]{1,256})\]\]/g, (full, bang, inner, offset) => {
    if (inAnyRange(offset, ranges)) return full;
    let target = inner, suffix = "";
    const pipe = inner.indexOf("|");
    const hash = inner.indexOf("#");
    const cut = [pipe, hash].filter((i) => i !== -1).sort((a, b) => a - b)[0];
    if (cut !== undefined) { target = inner.slice(0, cut); suffix = inner.slice(cut); }
    const to = heals.get(normalizeKey(target.trim()));
    if (!to) return full;
    const newTarget = path.basename(to).replace(/\.md$/i, "");
    count++;
    return `${bang}[[${newTarget}${suffix}]]`;
  });
  return { text: out, count };
}

// ============================================================================
// DIAGNOSE (build model -> classify every broken link)
// ============================================================================

// Cap on captured ambiguous links (with full candidate lists) for the --ambiguous
// review report. Ambiguous count is ~150 today, so 1000 captures all with headroom.
const AMBIG_CAP = 1000;

export function diagnose(vaultRoot = DEFAULT_VAULT, io = {}) {
  const { readFileImpl = fs.readFileSync } = io;
  const model = buildVaultModel(vaultRoot, io);
  const slugIndex = buildSlugIndex(model.basenameIndex);
  const report = {
    vaultRoot, notes: model.notes.size,
    brokenInstances: 0, notesWithBroken: 0,
    healable: 0, derankedHeals: 0, dangling: 0, nonNote: 0, ambiguous: 0,
    healByNote: new Map(),     // rel -> Map(normKey -> newRel)
    samples: { HEALABLE: [], DANGLING: [], NON_NOTE: [] },
    ambiguousLinks: [],        // {from, target, candidates:[rel...]} for --ambiguous review
  };
  for (const rel of model.notes.keys()) {
    let raw;
    try { raw = readFileImpl(path.join(vaultRoot, rel), "utf8"); } catch { continue; }
    if (raw.length > MAX_FILE) raw = raw.slice(0, MAX_FILE);
    const seen = new Set();
    let noteHadBroken = false;
    // Scan with code spans blanked so a code-embedded [[link]] is NOT classified
    // HEALABLE (rewriteLinks would refuse it -> non-convergent count). Consistent
    // with applyHeals, which skips code via codeRanges.
    for (const target of extractWikilinks(stripCode(raw))) {
      if (model.basenameIndex.has(normalizeKey(target))) continue; // resolves -> not broken
      const dedupKey = normalizeKey(target);
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      report.brokenInstances++;
      noteHadBroken = true;
      const c = classifyBrokenTarget(target, rel, slugIndex);
      if (c.cls === "HEALABLE") {
        report.healable++;
        if (c.deranked) report.derankedHeals++;
        let hm = report.healByNote.get(rel);
        if (!hm) { hm = new Map(); report.healByNote.set(rel, hm); }
        hm.set(dedupKey, c.to);
        if (report.samples.HEALABLE.length < 50) report.samples.HEALABLE.push({ from: rel, target, to: c.to, deranked: !!c.deranked });
      } else if (c.cls === "NON_NOTE") {
        report.nonNote++;
        if (report.samples.NON_NOTE.length < 50) report.samples.NON_NOTE.push({ from: rel, target });
      } else {
        report.dangling++;
        if (c.candidates && c.candidates > 1) {
          report.ambiguous++;
          // capture the rival candidate notes so --ambiguous can present them for a
          // human to pick (a real note exists but >1 matches -> never auto-rewritten).
          if (report.ambiguousLinks.length < AMBIG_CAP) report.ambiguousLinks.push({ from: rel, target, candidates: c.cands || [] });
        }
        if (report.samples.DANGLING.length < 50) report.samples.DANGLING.push({ from: rel, target, candidates: c.candidates || 0 });
      }
    }
    if (noteHadBroken) report.notesWithBroken++;
  }
  return report;
}

/**
 * Apply the HEALABLE rewrites from a diagnose() report. Atomic per-file; skips
 * everything when the memory-sync lock is held (re-checked PER FILE -- TOCTOU, the
 * feed may grab the lock mid-run). Fail-soft per file. REVERSIBILITY: most healable
 * vault files are git-UNTRACKED (verified -- git is NOT the undo), so when a
 * `backupDir` is given, each file's ORIGINAL is copied there (mirroring its
 * relpath) BEFORE the rewrite, making the whole run restorable. The CLI always
 * passes one. Returns counts + the backupDir used.
 * @param {object} report  a diagnose() result
 * @param {string} vaultRoot
 * @param {object} io  { readFileImpl, writeFileImpl, renameImpl, existsImpl, mkdirImpl, copyImpl, backupDir }
 */
export function applyHeals(report, vaultRoot = DEFAULT_VAULT, io = {}) {
  const {
    readFileImpl = fs.readFileSync, writeFileImpl = fs.writeFileSync,
    renameImpl = fs.renameSync, existsImpl = fs.existsSync,
    mkdirImpl = fs.mkdirSync, copyImpl = fs.copyFileSync,
    backupDir = null,
  } = io;
  let filesHealed = 0, linksHealed = 0, skippedLocked = 0, backedUp = 0;
  const lockPath = path.join(vaultRoot, SYNC_LOCK);
  for (const [rel, hm] of report.healByNote) {
    if (existsImpl(lockPath)) { skippedLocked++; continue; } // re-check per file (TOCTOU)
    const full = path.join(vaultRoot, rel);
    let raw;
    try { raw = readFileImpl(full, "utf8"); } catch { continue; }
    const { text, count } = rewriteLinks(raw, hm);
    if (count === 0 || text === raw) continue;
    const tmp = `${full}.tmp.${process.pid}`;
    try {
      if (backupDir) {
        const bak = path.join(backupDir, rel);
        mkdirImpl(path.dirname(bak), { recursive: true });
        copyImpl(full, bak); // snapshot ORIGINAL before mutating (reversible)
        backedUp++;
      }
      writeFileImpl(tmp, text, "utf8");
      renameImpl(tmp, full);
      filesHealed++; linksHealed += count;
    } catch { /* fail-soft: leave the note untouched */ }
  }
  return { filesHealed, linksHealed, skippedLocked, backedUp, backupDir };
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n != null && !n.startsWith("--")) { flags[k] = n; i++; } else flags[k] = true;
    }
  }
  return flags;
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const report = diagnose();
  const sampleN = Number(flags.samples) || 8;
  if (flags.json) {
    const { healByNote, ...rest } = report;
    process.stdout.write(JSON.stringify({ ...rest, healNotes: healByNote.size }, null, 2) + "\n");
    return;
  }
  if (flags.ambiguous) {
    // Advisory review of the AMBIGUOUS subset of DANGLING: a real note exists but >1
    // candidate matches, so it can never be auto-healed -- present the rivals for a
    // human to pick. READ-ONLY: writes only the JSON review report, never a memo.
    const reportPath = path.join(report.vaultRoot, "..", "state", "shared", "vault-ambiguous-links-report.json");
    const truncated = report.ambiguous > report.ambiguousLinks.length;
    const payload = {
      generatedAt: new Date().toISOString(), vaultRoot: report.vaultRoot, notes: report.notes,
      ambiguousTotal: report.ambiguous, captured: report.ambiguousLinks.length, truncated, links: report.ambiguousLinks,
    };
    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
      process.stdout.write(`[vault-link-doctor --ambiguous] ${report.ambiguous} ambiguous broken link(s); ${report.ambiguousLinks.length} captured -> ${reportPath}\n`);
    } catch (e) {
      process.stderr.write(`[vault-link-doctor --ambiguous] could not write report: ${e?.message || e}\n`);
      process.stdout.write(`[vault-link-doctor --ambiguous] ${report.ambiguous} ambiguous broken link(s) (report unwritten)\n`);
    }
    for (const a of report.ambiguousLinks.slice(0, sampleN)) {
      process.stdout.write(`  ${a.from.split("/").pop()}: [[${a.target}]] (${a.candidates.length} candidates)\n`);
      for (const cand of a.candidates.slice(0, 6)) process.stdout.write(`      -> ${cand}\n`);
    }
    if (truncated) process.stdout.write(`  NOTE: captured ${report.ambiguousLinks.length} of ${report.ambiguous} (AMBIG_CAP=${AMBIG_CAP}) -- raise the cap to see all.\n`);
    process.stdout.write("  ADVISORY -- pick the right target by hand; an ambiguous link is NEVER auto-rewritten.\n");
    return;
  }
  const pct = (n) => report.brokenInstances ? (100 * n / report.brokenInstances).toFixed(1) : "0.0";
  process.stdout.write(
    `[vault-link-doctor] notes=${report.notes} brokenLinks=${report.brokenInstances} (in ${report.notesWithBroken} notes)\n` +
    `  HEALABLE  ${report.healable} (${pct(report.healable)}%) -- unique high-confidence rematch -> safe rewrite (${report.healByNote.size} notes${report.derankedHeals ? `; ${report.derankedHeals} via canonical-derank` : ""})\n` +
    `  DANGLING  ${report.dangling} (${pct(report.dangling)}%) -- no/ambiguous candidate (${report.ambiguous} ambiguous); never rewritten\n` +
    `  NON_NOTE  ${report.nonNote} (${pct(report.nonNote)}%) -- .base/external/asset; not a note defect\n`,
  );
  for (const cls of ["HEALABLE", "DANGLING", "NON_NOTE"]) {
    const s = report.samples[cls].slice(0, sampleN);
    if (!s.length) continue;
    process.stdout.write(`  ${cls} sample:\n`);
    for (const x of s) {
      process.stdout.write(x.to
        ? `    ${x.from.split("/").pop()}: [[${x.target}]] -> ${x.to}\n`
        : `    ${x.from.split("/").pop()}: [[${x.target}]]${x.candidates > 1 ? ` (${x.candidates} candidates -- ambiguous)` : ""}\n`);
    }
  }
  if (flags.apply) {
    // Reversibility: most healable files are git-untracked, so snapshot originals
    // into a timestamped backup dir before mutating (restore = copy back).
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = typeof flags.backup === "string"
      ? flags.backup
      : path.join(report.vaultRoot, "..", "state", "shared", `vault-link-heal-backup-${stamp}`);
    const res = applyHeals(report, report.vaultRoot, { backupDir });
    process.stdout.write(`  APPLIED: healed ${res.linksHealed} link(s) in ${res.filesHealed} file(s); ` +
      `backed up ${res.backedUp} original(s) -> ${backupDir}` +
      (res.skippedLocked ? ` (skipped ${res.skippedLocked} -- sync lock held; re-run)` : "") + "\n");
  } else {
    process.stdout.write("  (dry-run) re-run with --apply to heal the HEALABLE tier.\n");
  }
}

const __direct = (() => { try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("vault-link-doctor.mjs"); } catch { return false; } })();
if (__direct) main();
