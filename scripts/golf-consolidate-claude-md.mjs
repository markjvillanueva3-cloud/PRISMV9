#!/usr/bin/env node
/**
 * scripts/golf-consolidate-claude-md.mjs
 *
 * Golf-slot consolidator for CLAUDE-MD-PER-SLOT-MS0 — reads each slot's
 * proposed-additions inbox (state/shared/claude-md-slots/CLAUDE-<slot>.md),
 * extracts `## Proposed §Recent regressions entry` blocks, appends unique
 * entries to canonical H:/PRISM/CLAUDE.md §Recent regressions, and marks
 * each inbox file as consumed.
 *
 * MVP scope (2026-05-19):
 *   - ONLY §Recent regressions consolidation. Future units extend to other
 *     section types (`## Proposed section: …` full-section additions).
 *   - Reads ALL CLAUDE-*.md files (NOT just current slot's — golf reads
 *     every slot's inbox).
 *   - Dedupe by line-content hash (same line text already in CLAUDE.md
 *     = skip).
 *   - Atomic write of canonical CLAUDE.md.
 *   - Consumed inbox files: frontmatter `status: consumed-<iso-date>`
 *     + body retained for audit trail (NOT deleted — operator can review).
 *
 * Karpathy discipline:
 *   CLASSIFY:  structural markdown merge with section-aware insertion
 *   TECHNIQUE: regex-anchored section boundaries + line-set dedupe + atomic rename
 *   EDGE:      missing inbox dir, malformed frontmatter, no §Recent regressions
 *              in canonical, slot already consumed, line already present
 *   FAILURE:   atomic-write fails, canonical edit collision (golf-only gate
 *              bypassed via PRISM_CLAUDE_MD_GUARD_BYPASS=1), inbox file locked
 *
 * Run authority: golf slot OR operator with bypass env var. The hook
 * worktree-commit-route + CLAUDE.md edit gate enforce slot binding at edit
 * time; this script doesn't try to spoof — it relies on the operator
 * having golf binding OR explicit bypass.
 *
 * Exit codes:
 *   0  consolidated cleanly (or no-op if no inbox files / no new entries)
 *   1  at least one inbox file had parse errors (consolidation proceeded
 *      for valid files, failed files reported)
 *   2  preflight failure (canonical CLAUDE.md missing, can't write, etc.)
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PRISM_ROOT = "H:/PRISM";
const DISPLAY_LINE_TRUNCATE = 110; // chars to display per entry in text mode
const INBOX_DIR = path.join(PRISM_ROOT, "state/shared/claude-md-slots");
const CANONICAL_CLAUDE_MD = path.join(PRISM_ROOT, "CLAUDE.md");
const RECENT_REGRESSIONS_MARKER = "## Recent regressions";
const NEXT_SECTION_MARKER_RE = /^##\s+/m; // any `## ` line after the marker

// ─── Pure core ────────────────────────────────────────────────────────────

/**
 * Parse frontmatter from a CLAUDE-<slot>.md inbox file.
 * Returns { frontmatter, body } or { error } on malformed input.
 */
export function parseInboxFile(text) {
  if (typeof text !== "string") return { error: "input not string" };
  if (!text.startsWith("---\n")) {
    return { error: "missing frontmatter delimiter (---)" };
  }
  const closeIdx = text.indexOf("\n---\n", 4);
  if (closeIdx === -1) {
    return { error: "unterminated frontmatter" };
  }
  const fmText = text.slice(4, closeIdx);
  const body = text.slice(closeIdx + 5);

  const frontmatter = {};
  for (const line of fmText.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$/);
    if (m) frontmatter[m[1]] = m[2];
  }

  return { frontmatter, body };
}

/**
 * Extract proposed §Recent regressions entries from an inbox body.
 * Looks for a `## Proposed §Recent regressions entry` heading followed by
 * a fenced code block containing the entries; returns the lines inside
 * the fence that start with `- ` (bullet list per CLAUDE.md convention).
 *
 * Tolerant: missing section → []; missing fence → looks for `- ` lines
 * immediately after the heading.
 */
export function extractRecentRegressionsEntries(body) {
  if (typeof body !== "string") return [];
  const headingIdx = body.search(/^##\s+Proposed\s+§Recent\s+regressions\s+entry/im);
  if (headingIdx === -1) return [];
  const rest = body.slice(headingIdx);
  // Find first fenced code block after the heading
  const fenceOpen = rest.search(/^```/m);
  let segment;
  if (fenceOpen === -1) {
    // No fence — treat rest of section until next ## as raw
    const nextSection = rest.slice(1).search(/^##\s+/m);
    segment = nextSection === -1 ? rest : rest.slice(0, nextSection + 1);
  } else {
    const afterFence = rest.slice(fenceOpen);
    // Find closing fence on its own line
    const closeMatch = afterFence.slice(3).search(/^```/m);
    segment = closeMatch === -1
      ? afterFence.slice(3) // unterminated — accept what we have
      : afterFence.slice(3, 3 + closeMatch);
  }
  return segment
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
}

/**
 * Hash a regression line for dedupe (case-folded after stripping markdown).
 * Stable across whitespace variation; identical content = identical hash.
 */
export function regressionLineHash(line) {
  if (typeof line !== "string") return "";
  const normalized = line
    .replace(/^- /, "")
    .replace(/\*+/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Find the §Recent regressions section in canonical CLAUDE.md and extract
 * its existing entries (for dedupe). Returns { startIdx, endIdx, entries }.
 *   startIdx: char index of the heading line start
 *   endIdx:   char index just after the section (start of next ## or EOF)
 *   entries:  array of `- ...` lines currently in the section
 */
export function locateRecentRegressionsSection(canonicalText) {
  if (typeof canonicalText !== "string") {
    return { startIdx: -1, endIdx: -1, entries: [] };
  }
  const headingIdx = canonicalText.search(new RegExp(`^${escapeRegex(RECENT_REGRESSIONS_MARKER)}`, "m"));
  if (headingIdx === -1) {
    return { startIdx: -1, endIdx: -1, entries: [] };
  }
  // Find next `## ` line after the heading
  const afterHeading = canonicalText.slice(headingIdx + RECENT_REGRESSIONS_MARKER.length);
  const nextSectionRel = afterHeading.search(NEXT_SECTION_MARKER_RE);
  const endIdx = nextSectionRel === -1
    ? canonicalText.length
    : headingIdx + RECENT_REGRESSIONS_MARKER.length + nextSectionRel;
  const sectionBody = canonicalText.slice(headingIdx, endIdx);
  const entries = sectionBody
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
  return { startIdx: headingIdx, endIdx, entries };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Plan what would change: which proposed entries are NEW (not already in
 * canonical) and which are duplicates. Pure — no I/O.
 *
 * @param {string[]} canonicalEntries - existing `- ...` lines in §Recent regressions
 * @param {Array<{slot:string, entries:string[]}>} proposed - per-slot proposed entries
 * @returns {{
 *   new_entries: Array<{slot:string, line:string, hash:string}>,
 *   duplicates: Array<{slot:string, line:string, hash:string}>,
 *   canonical_hashes: Set<string>
 * }}
 */
export function planConsolidation(canonicalEntries, proposed) {
  const canonicalHashes = new Set(canonicalEntries.map(regressionLineHash));
  const newEntries = [];
  const duplicates = [];
  const seenInThisRun = new Set(); // dedupe across slots within one run
  for (const { slot, entries } of proposed) {
    for (const line of entries) {
      const h = regressionLineHash(line);
      if (canonicalHashes.has(h) || seenInThisRun.has(h)) {
        duplicates.push({ slot, line, hash: h });
      } else {
        newEntries.push({ slot, line, hash: h });
        seenInThisRun.add(h);
      }
    }
  }
  return { new_entries: newEntries, duplicates, canonical_hashes: canonicalHashes };
}

// ─── I/O layer ────────────────────────────────────────────────────────────

function listInboxFiles() {
  if (!existsSync(INBOX_DIR)) return [];
  try {
    return readdirSync(INBOX_DIR)
      .filter((f) => /^CLAUDE-[a-z]+\.md$/.test(f))
      .map((f) => path.join(INBOX_DIR, f))
      .sort();
  } catch (e) {
    return [];
  }
}

function safeReadInbox(filePath) {
  try {
    const text = readFileSync(filePath, "utf8");
    const parsed = parseInboxFile(text);
    if (parsed.error) {
      return { ok: false, file: filePath, reason: parsed.error };
    }
    const slot = parsed.frontmatter.slot || path.basename(filePath, ".md").replace(/^CLAUDE-/, "");
    const status = parsed.frontmatter.status || "pending-consolidation";
    if (status.startsWith("consumed-")) {
      return { ok: true, file: filePath, slot, status, entries: [], skipped: "already-consumed" };
    }
    const entries = extractRecentRegressionsEntries(parsed.body);
    return { ok: true, file: filePath, slot, status, entries, frontmatter: parsed.frontmatter, body: parsed.body };
  } catch (e) {
    return { ok: false, file: filePath, reason: `read failed: ${e.message}` };
  }
}

function atomicWriteFile(targetPath, content) {
  const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, targetPath);
}

function markInboxConsumed(file, originalFm, originalBody) {
  const now = new Date().toISOString().slice(0, 10);
  const fmLines = Object.entries({ ...originalFm, status: `consumed-${now}` })
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const newContent = `---\n${fmLines}\n---\n${originalBody}`;
  atomicWriteFile(file, newContent);
}

// ─── Orchestration ────────────────────────────────────────────────────────

function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const asJson = args.has("--json");

  // Preflight
  if (!existsSync(CANONICAL_CLAUDE_MD)) {
    const out = { ok: false, error: "preflight", reason: `canonical missing: ${CANONICAL_CLAUDE_MD}` };
    process.stdout.write(asJson ? JSON.stringify(out, null, 2) + "\n" : `PREFLIGHT FAILED: ${out.reason}\n`);
    process.exit(2);
  }

  const inboxFiles = listInboxFiles();
  const readResults = inboxFiles.map(safeReadInbox);
  const validReads = readResults.filter((r) => r.ok && r.entries && r.entries.length > 0);
  const consumedSkips = readResults.filter((r) => r.ok && r.skipped === "already-consumed");
  const readErrors = readResults.filter((r) => !r.ok);

  const proposed = validReads.map((r) => ({ slot: r.slot, entries: r.entries }));

  const canonicalText = readFileSync(CANONICAL_CLAUDE_MD, "utf8");
  const section = locateRecentRegressionsSection(canonicalText);
  if (section.startIdx === -1) {
    const out = {
      ok: false,
      error: "section-not-found",
      reason: `canonical CLAUDE.md has no '${RECENT_REGRESSIONS_MARKER}' section — must be created manually first`,
    };
    process.stdout.write(asJson ? JSON.stringify(out, null, 2) + "\n" : `ERROR: ${out.reason}\n`);
    process.exit(2);
  }

  const plan = planConsolidation(section.entries, proposed);

  const summary = {
    ok: readErrors.length === 0,
    dryRun,
    inboxFiles: inboxFiles.length,
    validReads: validReads.length,
    consumedSkips: consumedSkips.length,
    readErrors: readErrors.length,
    proposedTotal: proposed.reduce((s, p) => s + p.entries.length, 0),
    newEntries: plan.new_entries.length,
    duplicates: plan.duplicates.length,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify({ summary, plan: { new_entries: plan.new_entries, duplicates: plan.duplicates }, readErrors }, null, 2) + "\n");
  } else {
    process.stdout.write(`GOLF CONSOLIDATE — ${dryRun ? "DRY RUN" : "APPLY"}\n`);
    process.stdout.write(`===========================================\n`);
    process.stdout.write(`Inbox files:    ${summary.inboxFiles} (${summary.validReads} with entries, ${summary.consumedSkips} already consumed, ${summary.readErrors} errors)\n`);
    process.stdout.write(`Proposed:       ${summary.proposedTotal} entries total\n`);
    process.stdout.write(`New:            ${summary.newEntries}\n`);
    process.stdout.write(`Duplicates:     ${summary.duplicates}\n`);
    if (plan.new_entries.length > 0) {
      process.stdout.write(`\nNew entries to append:\n`);
      for (const e of plan.new_entries) {
        process.stdout.write(`  [${e.slot}] ${e.line.slice(0, DISPLAY_LINE_TRUNCATE)}${e.line.length > DISPLAY_LINE_TRUNCATE ? "…" : ""}\n`);
      }
    }
    if (readErrors.length > 0) {
      process.stdout.write(`\nRead errors:\n`);
      for (const e of readErrors) {
        process.stdout.write(`  ${e.file}: ${e.reason}\n`);
      }
    }
  }

  if (dryRun || plan.new_entries.length === 0) {
    process.exit(readErrors.length === 0 ? 0 : 1);
  }

  // Apply: insert new entries at the END of §Recent regressions (just before
  // the next section's `## ` or at EOF). Append-only preserves chronological
  // order; sort-by-date is a future refinement.
  let insertionPoint = section.endIdx;
  // Walk back over trailing blank lines so we insert tightly before the next section
  while (insertionPoint > section.startIdx && canonicalText[insertionPoint - 1] === "\n") {
    insertionPoint -= 1;
  }
  const newLines = plan.new_entries.map((e) => e.line).join("\n");
  const updated =
    canonicalText.slice(0, insertionPoint) +
    "\n" + newLines + "\n" +
    canonicalText.slice(insertionPoint);

  try {
    atomicWriteFile(CANONICAL_CLAUDE_MD, updated);
  } catch (e) {
    process.stderr.write(`atomic write failed: ${e.message}\n`);
    process.exit(2);
  }

  // Mark each successfully-consumed inbox file
  for (const r of validReads) {
    try {
      markInboxConsumed(r.file, r.frontmatter, r.body);
    } catch (e) {
      process.stderr.write(`failed to mark ${r.file} consumed: ${e.message}\n`);
    }
  }

  if (!asJson) {
    process.stdout.write(`\n✓ Appended ${plan.new_entries.length} entry(ies) to ${CANONICAL_CLAUDE_MD} §Recent regressions\n`);
    process.stdout.write(`✓ Marked ${validReads.length} inbox file(s) consumed\n`);
  }
  process.exit(readErrors.length === 0 ? 0 : 1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(import.meta.url.replace(/^file:\/\/\//, "")).toLowerCase();
if (isMain) {
  main();
}
