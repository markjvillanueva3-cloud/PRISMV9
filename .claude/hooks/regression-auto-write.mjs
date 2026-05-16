#!/usr/bin/env node
// tier: T3
/**
 * regression-auto-write.mjs — Stop hook (T3 observer).
 *
 * Closes the U-VAULT03 "regression auto-write pending" gap. When a chat
 * commits a regression-fix at session end, this hook detects the commit
 * pattern + appends a canonical entry to CLAUDE.md "## Recent regressions"
 * section so the loop closes automatically (today: manual write only).
 *
 * Detection: commit subject matches /\b(fix|restore|repair|regression|patch|
 * wiring-restore|revert)\b/i — narrow enough to skip routine commits, broad
 * enough to catch the common fix-class. The user can opt-out per-commit
 * with `[no-regression-record]` in the subject or body.
 *
 * Idempotency: scans CLAUDE.md for the commit SHA before writing. If the
 * SHA is already recorded, skip silently.
 *
 * Non-blocking. Pure observer. Never refuses Stop.
 *
 * Knobs:
 *   PRISM_REGRESSION_AUTO_WRITE_DISABLE=1  → no-op
 *   PRISM_REGRESSION_AUTO_WRITE_DRY_RUN=1  → print formatted entry to stderr but don't write
 *   PRISM_REGRESSION_AUTO_WRITE_TIMEOUT_MS  default 2000
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = process.env.PRISM_ROOT || "H:/prism";
const CLAUDE_MD = path.join(REPO, "CLAUDE.md");
const SECTION_HEADER = "## Recent regressions";
const SECTION_COMMENT = "<!-- Append-only log per Boris CLAUDE.md back-flow pattern. New entries at TOP. -->";
const TIMEOUT_MS = parseInt(process.env.PRISM_REGRESSION_AUTO_WRITE_TIMEOUT_MS || "2000", 10) || 2000;
// Strong fix-class words — unambiguous in commit subjects. "patch" and "revert"
// removed 2026-05-16 per per-file scrutiny gate (Arm A finding: false-positives
// on "patch version bump", "revert feature toggle", etc). Operators wanting
// those can use `restore` or include `regression` in the subject.
const FIX_RX = /\b(fix|restore|repair|regression|wiring-restore|rescue)\b/i;
const OPT_OUT_RX = /\[no-regression-record\]/i;
const MAX_CONCURRENT_RETRY = 3;

function approve() { process.stdout.write(JSON.stringify({ continue: true })); }

export function isRegressionFixSubject(subject) {
  if (typeof subject !== "string" || subject.length < 5) return false;
  if (OPT_OUT_RX.test(subject)) return false;
  // FIX_RX must match a real word — not an arbitrary substring like "prefix"
  // which contains "fix". The \b boundaries in FIX_RX already enforce this.
  return FIX_RX.test(subject);
}

export function isOptedOut(subject, body) {
  return OPT_OUT_RX.test(subject || "") || OPT_OUT_RX.test(body || "");
}

/**
 * Parse the commit's metadata into a canonical regression entry.
 * Format:
 *   - YYYY-MM-DD | **<title>** | observed-in: <sha-short> | fix: see commit | verify: git show <sha-short>
 */
export function formatRegressionEntry({ sha, date, subject, body }) {
  const shortSha = (sha || "").slice(0, 9);
  // Title = subject with the [SCOPE]/U-id prefix stripped (cleaner display).
  // Handles both single-bracket (`[X]/U-Y: …`) and double-bracket (`[MAIN] [X]/U-Y: …`)
  // commit-subject conventions; one-or-more `\[…\]` groups separated by optional whitespace.
  let title = (subject || "").replace(/^\s*(?:\[[^\]]+\]\s*)+[/\s]*[A-Z0-9-]+:\s*/i, "").trim();
  if (!title) title = subject || "(no subject)";
  if (title.length > 140) title = title.slice(0, 137) + "...";
  return `- ${date} | **${title}** | observed-in: ${shortSha} | fix: see commit | verify: \`git -C H:/prism show ${shortSha}\``;
}

export function hasShaAlready(claudeMd, sha) {
  if (typeof claudeMd !== "string" || !sha) return false;
  const shortSha = sha.slice(0, 9);
  return claudeMd.includes(shortSha);
}

/**
 * Insert the new entry at the TOP of the "## Recent regressions" section
 * (right after the header + comment line). Returns { ok, content } or
 * { ok: false, reason }.
 */
export function insertEntry(claudeMd, entry) {
  if (typeof claudeMd !== "string") return { ok: false, reason: "claudeMd_not_string" };
  const headerIdx = claudeMd.indexOf(SECTION_HEADER);
  if (headerIdx < 0) return { ok: false, reason: "section_missing" };
  // Find the end of the header line + the optional comment line that follows.
  const headerEndNl = claudeMd.indexOf("\n", headerIdx);
  if (headerEndNl < 0) return { ok: false, reason: "section_truncated" };
  // Check if the next line is the canonical comment — if so, skip past it too.
  // Skip past any comment-line OR blank-line run that follows the section header.
  // Tolerant of variants: the canonical `<!-- Append-only … -->` comment, any other
  // `<!-- … -->` line, OR blank lines. Stops at the first content line.
  let insertAt = headerEndNl + 1;
  while (insertAt < claudeMd.length) {
    const nextNl = claudeMd.indexOf("\n", insertAt);
    const lineEnd = nextNl < 0 ? claudeMd.length : nextNl;
    const line = claudeMd.slice(insertAt, lineEnd).trim();
    // Stop on first non-comment, non-blank line — that's where to insert.
    if (line === "" || (line.startsWith("<!--") && line.endsWith("-->"))) {
      if (nextNl < 0) { insertAt = claudeMd.length; break; }
      insertAt = nextNl + 1;
    } else {
      break;
    }
  }
  // Prepend new entry; preserve blank lines if any
  const before = claudeMd.slice(0, insertAt);
  const after = claudeMd.slice(insertAt);
  return { ok: true, content: before + entry + "\n" + after };
}

function readHeadCommit() {
  try {
    const sha = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%H"], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!sha) return null;
    const subject = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%s"], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const body = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%b"], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dateRaw = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%cI"], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const date = dateRaw.slice(0, 10);  // YYYY-MM-DD
    return { sha, subject, body, date };
  } catch {
    return null;
  }
}

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, content, "utf8");
    fs.renameSync(tmp, filePath);
  } catch (err) {
    // Cleanup orphan tmp on any failure (write or rename).
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

/**
 * Write the regression entry with concurrent-peer-safe retry semantics.
 *
 * The race we're closing: two chats both detect fix-pattern commits at the
 * same Stop. Both read CLAUDE.md, both insertEntry into their own copy, both
 * atomicWrite. Last writer wins — one entry is lost permanently.
 *
 * Mitigation: after each rename, RE-READ and verify our short-SHA appears.
 * If not (a peer overwrote us), retry from re-read: re-check idempotency
 * (their entry may have ALREADY recorded a similar regression), re-insert,
 * re-write. Cap at MAX_CONCURRENT_RETRY attempts.
 *
 * Note: this is NOT a true distributed lock — that requires OS-level locks
 * (advisory `flock`/`LockFile`). But the retry-with-verify approach handles
 * the common 2-chat race correctly: the LATER chat to attempt will either
 * see the earlier chat's entry (idempotent skip) or successfully append on
 * retry. The cap prevents pathological infinite-retry under heavy contention.
 */
export function writeWithConcurrencyGuard(filePath, sha, computeContent) {
  let attempts = 0;
  while (attempts < MAX_CONCURRENT_RETRY) {
    attempts++;
    const current = fs.readFileSync(filePath, "utf8");
    // Idempotency check: if a peer already recorded this SHA between read+write,
    // skip silently.
    if (hasShaAlready(current, sha)) {
      return { ok: true, skipped: "sha_already_present", attempts };
    }
    const next = computeContent(current);
    if (!next) return { ok: false, reason: "compute_returned_null", attempts };
    atomicWrite(filePath, next);
    // Verify-after-rename: re-read and confirm our SHA is still present.
    const verify = fs.readFileSync(filePath, "utf8");
    if (hasShaAlready(verify, sha)) return { ok: true, attempts };
    // Else: a peer overwrote us. Loop to retry.
  }
  return { ok: false, reason: "max_retries_exceeded", attempts };
}

function main() {
  if (String(process.env.PRISM_REGRESSION_AUTO_WRITE_DISABLE ?? "") === "1") {
    return approve();
  }
  const dryRun = String(process.env.PRISM_REGRESSION_AUTO_WRITE_DRY_RUN ?? "") === "1";

  const commit = readHeadCommit();
  if (!commit) return approve();  // No commit or git failed — fast path

  if (!isRegressionFixSubject(commit.subject)) return approve();
  if (isOptedOut(commit.subject, commit.body)) return approve();

  let claudeMd;
  try { claudeMd = fs.readFileSync(CLAUDE_MD, "utf8"); }
  catch { return approve(); }

  if (hasShaAlready(claudeMd, commit.sha)) return approve();  // Idempotent — already written

  const entry = formatRegressionEntry(commit);
  if (dryRun) {
    process.stderr.write(`[regression-auto-write DRY-RUN] would prepend:\n${entry}\n`);
    return approve();
  }

  // First-pass check that the section exists — bail before the write loop if
  // the file lacks "## Recent regressions" entirely.
  const firstInsert = insertEntry(claudeMd, entry);
  if (!firstInsert.ok) return approve();

  // Concurrency-safe write: re-reads on each retry to handle the 2-chat race
  // where a peer's regression entry overwrites ours between read and rename.
  try {
    writeWithConcurrencyGuard(CLAUDE_MD, commit.sha, (current) => {
      // Idempotency: if peer wrote our SHA between our reads, the guard skips.
      // Otherwise insert into the current content (peer's entry preserved).
      const r = insertEntry(current, entry);
      return r.ok ? r.content : null;
    });
  } catch { /* File locked or unwritable — skip silently per non-blocking contract */ }

  return approve();
}

// Run only when invoked directly, not when imported by tests.
import { pathToFileURL } from "node:url";
const isMain = typeof process.argv[1] === "string"
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try { main(); }
  catch { approve(); }
}
