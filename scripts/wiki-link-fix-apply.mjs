#!/usr/bin/env node
/**
 * COMBO-EFFICIENCY-MS0 / P1-U02 follow-up — wiki-link auto-apply.
 *
 * Reads:  state/shared/wiki-link-fix-candidates.json (P1-U02 suggester output)
 * Writes: edits source files in-place (default DRY RUN — `--apply` required to write)
 *         state/shared/wiki-link-fix-apply-report.json
 *
 * Auto-applies high-confidence link fixes (score >= AUTO_APPLY_FLOOR, default 0.85)
 * to the source markdown files. Below the floor, candidates remain in the
 * suggester output for operator review.
 *
 * SAFETY CONTRACTS:
 *   1. DRY RUN is the default. `--apply` flag REQUIRED to actually write.
 *   2. Only edits files inside the knowledge/ tree (safety perimeter).
 *   3. Per-file backup written to state/shared/.wiki-link-fix-backups/<sha8>.bak
 *      before any modification (when --backup is passed, default OFF).
 *   4. Hard cap on edits per run (--max, default 200) — prevents runaway.
 *   5. Idempotent: if the broken link is no longer present in the source file
 *      (already fixed by a prior run / human edit), skip silently.
 *   6. Stop-on-first-write-error: never partially corrupt multiple files.
 *
 * Pure exports (testable without filesystem):
 *   buildReplacementToken(suggestedTargetPath) → string  // basename without .md
 *   eligibleCandidate(candidate, floor)        → boolean // safety gate
 *   applyReplacementToText(text, brokenLink, newLink) → {text, replaced}
 *   inSafetyPerimeter(filePath, knowledgeRoot) → boolean
 *
 * I/O wrapper:
 *   applyFixes({candidatesPath, prismRoot, autoApplyFloor, dryRun, maxEdits,
 *               makeBackup, outReportPath, write})
 *
 * CLI:
 *   node scripts/wiki-link-fix-apply.mjs                    # DRY RUN (default)
 *   node scripts/wiki-link-fix-apply.mjs --apply            # actually write
 *   node scripts/wiki-link-fix-apply.mjs --apply --max 50   # cap edits
 *   node scripts/wiki-link-fix-apply.mjs --apply --backup   # save .bak per file
 *
 * Knobs:
 *   PRISM_WIKI_LINK_APPLY_DISABLE=1            no-op CLI
 *   PRISM_WIKI_LINK_FIX_AUTO_APPLY_FLOOR=N     confidence cutoff (default 0.85)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const SCHEMA_VERSION = "1.0.0";

const DEFAULT_AUTO_APPLY_FLOOR = 0.85;
const DEFAULT_MAX_EDITS = 200;
const KNOWLEDGE_SAFETY_DIR = "knowledge";  // safety perimeter — only edit files under this dir

// ─── Pure: buildReplacementToken ───────────────────────────────────────────

/**
 * Convert a suggested target file path to a wiki-link token.
 * The wiki convention: `[[basename-without-extension]]`.
 * Defensive: returns null on missing/invalid input.
 */
export function buildReplacementToken(suggestedTargetPath) {
  if (typeof suggestedTargetPath !== "string" || suggestedTargetPath.length === 0) return null;
  const base = path.basename(suggestedTargetPath, ".md");
  if (!base || base.includes("..") || /[<>"|?*]/.test(base)) return null;
  return base;
}

// ─── Pure: eligibleCandidate ───────────────────────────────────────────────

/**
 * Safety gate for auto-apply. Returns true iff:
 *   - confidence is "high"
 *   - bestScore >= floor
 *   - at least 1 suggestion exists with valid target path
 *   - from + normalized + link are all present (audit-shape complete)
 */
export function eligibleCandidate(candidate, floor = DEFAULT_AUTO_APPLY_FLOOR) {
  if (!candidate || typeof candidate !== "object") return false;
  if (candidate.confidence !== "high") return false;
  if (typeof candidate.bestScore !== "number" || candidate.bestScore < floor) return false;
  if (!Array.isArray(candidate.suggestions) || candidate.suggestions.length === 0) return false;
  if (typeof candidate.suggestions[0].target !== "string") return false;
  if (typeof candidate.from !== "string" || candidate.from.length === 0) return false;
  if (typeof candidate.link !== "string" || candidate.link.length === 0) return false;
  return true;
}

// ─── Pure: applyReplacementToText ──────────────────────────────────────────

/**
 * Replace `[[brokenLink]]` token with `[[newLink]]` in source text.
 * Whole-token match: `[[X]]` where X === brokenLink (no aliases like `[[X|alt]]` —
 * the audit doesn't track aliases, so don't touch them).
 * Returns {text, replaced} where replaced is the number of substitutions made.
 */
export function applyReplacementToText(text, brokenLink, newLink) {
  if (typeof text !== "string" || typeof brokenLink !== "string" || typeof newLink !== "string") {
    return { text: text ?? "", replaced: 0 };
  }
  if (brokenLink.length === 0 || newLink.length === 0) {
    return { text, replaced: 0 };
  }
  // Escape regex metachars in brokenLink (defensive).
  const escaped = brokenLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match [[brokenLink]] only (no pipe-alias form).
  const pattern = new RegExp(`\\[\\[${escaped}\\]\\]`, "g");
  let count = 0;
  const out = text.replace(pattern, () => {
    count++;
    return `[[${newLink}]]`;
  });
  return { text: out, replaced: count };
}

// ─── Pure: inSafetyPerimeter ───────────────────────────────────────────────

/**
 * Verify a file path is INSIDE the knowledge/ subtree of prismRoot.
 * Prevents edits to source code / config / other peer-owned files.
 * Uses path.relative to defeat ../ escapes.
 */
export function inSafetyPerimeter(filePath, knowledgeRoot) {
  if (typeof filePath !== "string" || typeof knowledgeRoot !== "string") return false;
  if (filePath.length === 0 || knowledgeRoot.length === 0) return false;
  try {
    const abs = path.resolve(filePath);
    const root = path.resolve(knowledgeRoot);
    const rel = path.relative(root, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── I/O wrapper ───────────────────────────────────────────────────────────

const DEFAULT_CANDIDATES = "state/shared/wiki-link-fix-candidates.json";
const DEFAULT_OUT_REPORT = "state/shared/wiki-link-fix-apply-report.json";
const DEFAULT_BACKUP_DIR = "state/shared/.wiki-link-fix-backups";

function safeReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

function sha8(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 8);
}

export function applyFixes({
  candidatesPath = null,
  prismRoot = ".",
  autoApplyFloor = DEFAULT_AUTO_APPLY_FLOOR,
  dryRun = true,
  maxEdits = DEFAULT_MAX_EDITS,
  makeBackup = false,
  outReportPath = null,
  write = true,
} = {}) {
  const resolve = (rel) => path.join(prismRoot, rel);
  const cands = candidatesPath ?? resolve(DEFAULT_CANDIDATES);
  const knowledgeRoot = path.join(prismRoot, KNOWLEDGE_SAFETY_DIR);
  const backupDir = resolve(DEFAULT_BACKUP_DIR);

  const candidatesJson = safeReadJson(cands);
  const candidates = (candidatesJson && Array.isArray(candidatesJson.candidates)) ? candidatesJson.candidates : [];

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    candidatesPath: cands,
    dryRun,
    autoApplyFloor,
    maxEdits,
    knowledgeRoot,
    totalCandidates: candidates.length,
    eligibleCount: 0,
    appliedCount: 0,
    skippedCount: 0,
    skippedReasons: { "not-eligible": 0, "outside-safety-perimeter": 0, "source-file-missing": 0, "broken-link-not-found": 0, "max-edits-reached": 0, "invalid-replacement-token": 0 },
    applied: [],
    skipped: [],
    errors: [],
  };

  // Pre-pass: ensure backup dir exists if we're applying-with-backup.
  if (!dryRun && makeBackup) {
    try { fs.mkdirSync(backupDir, { recursive: true }); }
    catch (e) { report.errors.push({ stage: "mkdir-backup-dir", message: e.message }); }
  }

  for (const cand of candidates) {
    if (report.appliedCount >= maxEdits) {
      report.skipped.push({ link: cand?.link ?? "?", from: cand?.from ?? "?", reason: "max-edits-reached" });
      report.skippedReasons["max-edits-reached"]++;
      report.skippedCount++;
      continue;
    }
    if (!eligibleCandidate(cand, autoApplyFloor)) {
      report.skipped.push({ link: cand?.link ?? "?", from: cand?.from ?? "?", reason: "not-eligible" });
      report.skippedReasons["not-eligible"]++;
      report.skippedCount++;
      continue;
    }
    report.eligibleCount++;
    // Resolve absolute file path (audit stores repo-relative).
    const absFromPath = path.isAbsolute(cand.from) ? cand.from : path.join(prismRoot, cand.from);
    if (!inSafetyPerimeter(absFromPath, knowledgeRoot)) {
      report.skipped.push({ link: cand.link, from: cand.from, reason: "outside-safety-perimeter" });
      report.skippedReasons["outside-safety-perimeter"]++;
      report.skippedCount++;
      continue;
    }
    if (!fs.existsSync(absFromPath)) {
      report.skipped.push({ link: cand.link, from: cand.from, reason: "source-file-missing" });
      report.skippedReasons["source-file-missing"]++;
      report.skippedCount++;
      continue;
    }
    const newToken = buildReplacementToken(cand.suggestions[0].target);
    if (!newToken) {
      report.skipped.push({ link: cand.link, from: cand.from, reason: "invalid-replacement-token" });
      report.skippedReasons["invalid-replacement-token"]++;
      report.skippedCount++;
      continue;
    }
    let originalText;
    try { originalText = fs.readFileSync(absFromPath, "utf8"); }
    catch (e) {
      report.errors.push({ stage: "read-source", file: cand.from, message: e.message });
      report.skippedCount++;
      continue;
    }
    const { text: newText, replaced } = applyReplacementToText(originalText, cand.link, newToken);
    if (replaced === 0) {
      // Idempotent — file already cleaned up, skip silently.
      report.skipped.push({ link: cand.link, from: cand.from, reason: "broken-link-not-found" });
      report.skippedReasons["broken-link-not-found"]++;
      report.skippedCount++;
      continue;
    }
    if (dryRun) {
      report.applied.push({ link: cand.link, from: cand.from, newLink: newToken, replacements: replaced, mode: "dry-run" });
      report.appliedCount++;
      continue;
    }
    // Apply with optional backup.
    if (makeBackup) {
      try {
        const backupName = `${sha8(absFromPath)}.${path.basename(absFromPath)}.bak`;
        fs.writeFileSync(path.join(backupDir, backupName), originalText);
      } catch (e) {
        // Backup failure → STOP (don't risk un-recoverable edits).
        report.errors.push({ stage: "backup-write", file: cand.from, message: e.message, fatal: true });
        break;
      }
    }
    try {
      fs.writeFileSync(absFromPath, newText);
      report.applied.push({ link: cand.link, from: cand.from, newLink: newToken, replacements: replaced, mode: "applied" });
      report.appliedCount++;
    } catch (e) {
      // Write failure → STOP (file may be in inconsistent state, don't proceed).
      report.errors.push({ stage: "source-write", file: cand.from, message: e.message, fatal: true });
      break;
    }
  }

  if (write) {
    const out = outReportPath ?? resolve(DEFAULT_OUT_REPORT);
    try {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(report, null, 2));
      return { report, written: out };
    } catch (e) {
      report.errors.push({ stage: "report-write", message: e.message });
      return { report, written: null };
    }
  }
  return { report, written: null };
}

// ─── CLI ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { apply: false, root: ".", max: DEFAULT_MAX_EDITS, backup: false, candidates: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--backup") args.backup = true;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a === "--candidates") args.candidates = argv[++i] ?? null;
    else if (a === "--out") args.out = argv[++i] ?? null;
    else if (a === "--max") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.max = Math.floor(n);
    }
  }
  return args;
}

function cliMain(argv) {
  if (process.env.PRISM_WIKI_LINK_APPLY_DISABLE === "1") {
    console.log(JSON.stringify({ ok: true, skipped: "disabled-via-env" }));
    return 0;
  }
  const { apply, root, max, backup, candidates, out } = parseArgs(argv);
  const envFloor = Number(process.env.PRISM_WIKI_LINK_FIX_AUTO_APPLY_FLOOR);
  const floor = Number.isFinite(envFloor) && envFloor >= 0 && envFloor <= 1 ? envFloor : DEFAULT_AUTO_APPLY_FLOOR;
  const r = applyFixes({
    candidatesPath: candidates,
    prismRoot: root,
    autoApplyFloor: floor,
    dryRun: !apply,
    maxEdits: max,
    makeBackup: backup,
    outReportPath: out,
  });
  console.log(JSON.stringify({
    ok: true,
    written: r.written,
    dryRun: !apply,
    totalCandidates: r.report.totalCandidates,
    eligibleCount: r.report.eligibleCount,
    appliedCount: r.report.appliedCount,
    skippedCount: r.report.skippedCount,
    skippedReasons: r.report.skippedReasons,
    errorCount: r.report.errors.length,
  }, null, 2));
  return r.report.errors.some((e) => e.fatal) ? 1 : 0;
}

const isMain = (() => {
  try {
    const invokedAs = process.argv[1] && path.resolve(process.argv[1]);
    const selfPath = new URL(import.meta.url).pathname.replace(/^\//, "");
    return invokedAs && path.resolve(selfPath) === invokedAs;
  } catch { return false; }
})();
if (isMain) {
  process.exit(cliMain(process.argv.slice(2)));
}
