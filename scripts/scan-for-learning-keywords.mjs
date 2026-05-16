#!/usr/bin/env node
/**
 * scan-for-learning-keywords.mjs
 *
 * MISTAKE-LEARNING-LOOP — scans recent git commits, working-tree diff,
 * session transcript, and recent Stop-hook outputs for keywords that
 * indicate a "lesson worth capturing" event (mistakes, errors, bugs,
 * fixes, regressions, false-positives, P0/P1, etc.) and emits a punch
 * list of any keyword hits that have NOT yet been captured to memory.
 *
 * USED BY:
 *   - `.claude/hooks/stop-learning-capture-prompt.mjs` (Stop hook advisory)
 *   - `.claude/commands/learn-from-mistake.md` (manual /learn-from-mistake)
 *   - operator: `node scripts/scan-for-learning-keywords.mjs`
 *
 * EXIT 0 always (advisory only). Stdout = JSON if --json, human-readable otherwise.
 *
 * KEYWORD CATEGORIES (heuristic — false positives expected; signal > noise):
 *   - critical:  "P0", "FAIL", "HOSTILE", "EXPLOITABLE", "VULNERABLE", "corrupted"
 *   - regression: "regression", "broke", "broken", "hijacked", "crashed"
 *   - error:     "error", "errored", "exception", "TypeError", "ReferenceError"
 *   - bug:       "bug", "footgun", "antipattern", "trap", "pitfall"
 *   - fix:       "fix", "fixed", "patched", "remediated", "closed"
 *   - mistake:   "mistake", "oops", "wrong", "shouldn't have", "got burned"
 *   - learn:     "lesson", "in hindsight", "next time", "false-positive", "false positive"
 *
 * DEDUP: a keyword hit is considered ALREADY CAPTURED if either:
 *   - a memo (feedback_*.md / reference_*.md) in the memory dir contains
 *     the matching commit SHA, or
 *   - the wiki has an entry with the matching code-tribal slug, or
 *   - MEMORY.md indexes it.
 *
 * KNOBS:
 *   PRISM_LEARNING_SCAN_DISABLE=1 — fail-fast (returns empty list)
 *   PRISM_LEARNING_SCAN_WINDOW_COMMITS=N — git log -N (default 20)
 *   PRISM_LEARNING_SCAN_MEMORY_DIR=/path — override default memory dir
 *
 * SCRUTINY: this script is part of the per-file gate (2 reviewer arms).
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const MEMORY_DIR = process.env.PRISM_LEARNING_SCAN_MEMORY_DIR
  || "C:/Users/wompu/.claude/projects/H--prism/memory";
const WIKI_DIR = path.join(REPO_ROOT, "knowledge/wiki");
const WINDOW_COMMITS = Number(process.env.PRISM_LEARNING_SCAN_WINDOW_COMMITS || 20);
const DISABLED = process.env.PRISM_LEARNING_SCAN_DISABLE === "1";

// Keyword catalog — case-insensitive word-boundary regex.
// Each entry: { category, pattern, severity (info|warn|critical), why }
const KEYWORDS = [
  { category: "critical",   pattern: /\bP0\b/,                          severity: "critical", why: "P0 finding — must capture root cause" },
  { category: "critical",   pattern: /\bP1\b/,                          severity: "warn",     why: "P1 finding — capture if it surprised you" },
  { category: "critical",   pattern: /\bFAIL(ED)?\b/i,                  severity: "warn",     why: "explicit failure — what failed and why?" },
  { category: "critical",   pattern: /\bHOSTILE\b/i,                    severity: "critical", why: "hostile-input scenario — capture defense" },
  { category: "critical",   pattern: /\bEXPLOITABLE\b/i,                severity: "critical", why: "security gap — capture mitigation" },
  { category: "critical",   pattern: /\bVULNERABLE\b/i,                 severity: "critical", why: "security gap — capture mitigation" },
  { category: "critical",   pattern: /\bCORRUPT(ED|ION)?\b/i,           severity: "warn",     why: "state corruption — capture recovery path" },
  { category: "regression", pattern: /\bregression\b/i,                 severity: "warn",     why: "regression — capture trigger + fix" },
  { category: "regression", pattern: /\bhijack(ed)?\b/i,                severity: "warn",     why: "commit/state hijack — capture recovery pattern" },
  { category: "regression", pattern: /\bbroke(n)?\b/i,                  severity: "info",     why: "something broke — capture cause" },
  { category: "regression", pattern: /\bcrash(ed|ing)?\b/i,             severity: "warn",     why: "crash — capture trigger + diagnostic" },
  { category: "error",      pattern: /\bTypeError\b/,                   severity: "info",     why: "runtime type bug — capture null-safety lesson" },
  { category: "error",      pattern: /\bReferenceError\b/,              severity: "info",     why: "runtime ref bug — capture scope/init lesson" },
  { category: "error",      pattern: /\berror(ed)?\b/i,                 severity: "info",     why: "error encountered — capture cause" },
  { category: "bug",        pattern: /\bfootgun\b/i,                    severity: "warn",     why: "language/API footgun — capture for future avoidance" },
  { category: "bug",        pattern: /\bantipattern\b/i,                severity: "info",     why: "antipattern identified — capture for code review" },
  { category: "bug",        pattern: /\b(trap|pitfall)\b/i,             severity: "info",     why: "trap/pitfall observed — capture warning" },
  { category: "fix",        pattern: /\bfix(ed|es)?\b/i,                severity: "info",     why: "fix landed — what was the bug + how to spot next time?" },
  { category: "fix",        pattern: /\bpatch(ed)?\b/i,                 severity: "info",     why: "patch landed — capture what changed and why" },
  { category: "fix",        pattern: /\bremediat(ed|ion)\b/i,           severity: "info",     why: "remediation — capture the pattern" },
  { category: "mistake",    pattern: /\bmistake\b/i,                    severity: "warn",     why: "user/agent error — capture for prevention" },
  { category: "mistake",    pattern: /\boops\b/i,                       severity: "info",     why: "minor goof — capture if non-obvious" },
  { category: "mistake",    pattern: /\bgot burned\b/i,                 severity: "warn",     why: "expensive lesson — capture for the team" },
  { category: "learn",      pattern: /\bin hindsight\b/i,               severity: "info",     why: "retrospective insight — capture" },
  { category: "learn",      pattern: /\bnext time\b/i,                  severity: "info",     why: "next-time rule — capture" },
  { category: "learn",      pattern: /\bfalse[- ]positive\b/i,          severity: "warn",     why: "false-positive — capture detector adjustment" },
  { category: "learn",      pattern: /\bfalse[- ]negative\b/i,          severity: "warn",     why: "false-negative — capture coverage gap" },
  { category: "learn",      pattern: /\blesson learned\b/i,             severity: "info",     why: "retro — capture" },
];

function safeGit(args, { cwd = REPO_ROOT, timeoutMs = 8000 } = {}) {
  try {
    return execFileSync("git", args, { cwd, timeout: timeoutMs, encoding: "utf8" });
  } catch {
    return "";
  }
}

function readMemoryIndex() {
  const indexPath = path.join(MEMORY_DIR, "MEMORY.md");
  try { return fs.readFileSync(indexPath, "utf8"); }
  catch { return ""; }
}

function listMemoryFiles() {
  try {
    return fs.readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
  } catch {
    return [];
  }
}

function readMemoryFile(name) {
  try { return fs.readFileSync(path.join(MEMORY_DIR, name), "utf8"); }
  catch { return ""; }
}

function listWikiCodeTribalSlugs() {
  const dir = path.join(WIKI_DIR, "code-tribal");
  try { return fs.readdirSync(dir).filter((f) => f.endsWith(".md")); }
  catch { return []; }
}

/**
 * Scan a text blob for keyword hits. Returns array of { category, severity,
 * why, match, context, source }. `context` is up to 120 chars around the
 * match; `source` describes where the hit came from.
 */
export function scanText(text, source) {
  const hits = [];
  if (!text || typeof text !== "string") return hits;
  for (const entry of KEYWORDS) {
    // Iterate matches; cap per-entry to 5 to bound output volume.
    const re = new RegExp(entry.pattern.source, entry.pattern.flags.includes("g") ? entry.pattern.flags : entry.pattern.flags + "g");
    let m;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < 5) {
      const start = Math.max(0, m.index - 50);
      const end = Math.min(text.length, m.index + m[0].length + 70);
      const ctx = text.slice(start, end).replace(/\s+/g, " ").trim();
      hits.push({
        category: entry.category,
        severity: entry.severity,
        why: entry.why,
        match: m[0],
        context: ctx,
        source,
      });
      count++;
    }
  }
  return hits;
}

/**
 * Check whether a hit appears to be already captured to memory.
 * A "captured" hit means either (a) the commit SHA referenced in the source
 * appears in a memory file, or (b) the context's lead-keyword has a memory
 * entry whose name fuzzy-matches.
 */
function isLikelyCaptured(hit, captureCorpus) {
  const ctx = hit.context.toLowerCase();
  // Extract SHA-like tokens (8-40 hex chars) from context.
  const shaMatch = ctx.match(/\b[0-9a-f]{8,40}\b/);
  if (shaMatch) {
    const sha = shaMatch[0];
    if (captureCorpus.includes(sha)) return true;
  }
  // Extract distinctive 12+ char token sequence; if memo file contains it,
  // we treat as captured (very approximate dedup, signal > noise).
  const distinctive = ctx.match(/\b\w{12,30}\b/);
  if (distinctive && captureCorpus.includes(distinctive[0].toLowerCase())) {
    return true;
  }
  return false;
}

function buildCaptureCorpus() {
  // Concatenate MEMORY.md + all memo content + wiki slugs (filenames only).
  let corpus = readMemoryIndex().toLowerCase();
  for (const f of listMemoryFiles()) {
    corpus += "\n" + readMemoryFile(f).toLowerCase();
  }
  corpus += "\n" + listWikiCodeTribalSlugs().join(" ").toLowerCase();
  return corpus;
}

export function scanGitCommits(windowN = WINDOW_COMMITS) {
  const log = safeGit(["log", "--no-merges", `-${windowN}`, "--pretty=format:%H%x09%s%x09%b%x1e"]);
  if (!log) return [];
  const entries = log.split("").map((s) => s.trim()).filter(Boolean);
  const hits = [];
  for (const entry of entries) {
    const [sha = "", subject = "", body = ""] = entry.split("\t");
    const text = subject + "\n" + body;
    const got = scanText(text, `git:${sha.slice(0, 10)}`);
    for (const h of got) h.commitSha = sha;
    hits.push(...got);
  }
  return hits;
}

export function scanGitDiff() {
  const diff = safeGit(["diff", "--unified=0", "HEAD"]);
  return scanText(diff, "diff:HEAD");
}

export function scanRecentMemos(maxAgeHours = 24) {
  // Optional: ALSO scan memos themselves for keyword phrases — surfaces
  // memos that talk about a class of issue we may have re-encountered.
  const hits = [];
  const cutoff = Date.now() - (maxAgeHours * 3600_000);
  for (const f of listMemoryFiles()) {
    try {
      const full = path.join(MEMORY_DIR, f);
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) continue;
      const text = fs.readFileSync(full, "utf8");
      // Only flag CRITICAL keywords in memo content (most memos discuss past
      // bugs; flagging every "fix" would be pure noise).
      for (const entry of KEYWORDS) {
        if (entry.severity !== "critical") continue;
        const re = new RegExp(entry.pattern.source, entry.pattern.flags.includes("g") ? entry.pattern.flags : entry.pattern.flags + "g");
        let m;
        let count = 0;
        while ((m = re.exec(text)) !== null && count < 1) {
          hits.push({
            category: entry.category, severity: entry.severity, why: entry.why,
            match: m[0], context: f, source: `memo:${f}`,
          });
          count++;
        }
      }
    } catch {}
  }
  return hits;
}

export function run({ windowCommits = WINDOW_COMMITS, json = false, includeMemos = false } = {}) {
  if (DISABLED) {
    return { ok: true, disabled: true, totalHits: 0, uncapturedHits: 0, hits: [] };
  }
  const allHits = [];
  allHits.push(...scanGitCommits(windowCommits));
  allHits.push(...scanGitDiff());
  if (includeMemos) allHits.push(...scanRecentMemos());

  const corpus = buildCaptureCorpus();
  const enriched = allHits.map((h) => ({ ...h, captured: isLikelyCaptured(h, corpus) }));
  const uncaptured = enriched.filter((h) => !h.captured);

  // Group uncaptured by severity for the punch list.
  const bySev = { critical: [], warn: [], info: [] };
  for (const h of uncaptured) (bySev[h.severity] || bySev.info).push(h);

  return {
    ok: true,
    totalHits: enriched.length,
    capturedHits: enriched.length - uncaptured.length,
    uncapturedHits: uncaptured.length,
    counts: { critical: bySev.critical.length, warn: bySev.warn.length, info: bySev.info.length },
    hits: uncaptured.slice(0, 50), // cap output volume
  };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("scan-for-learning-keywords.mjs")) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const includeMemos = args.includes("--memos");
  const windowArg = args.find((a) => a.startsWith("--window="));
  const windowCommits = windowArg ? Number(windowArg.split("=")[1]) : WINDOW_COMMITS;

  const result = run({ windowCommits, json, includeMemos });

  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const { totalHits, capturedHits, uncapturedHits, counts, hits } = result;
    process.stdout.write(`\n[learn-keywords] scanned ${windowCommits} commits + working diff\n`);
    process.stdout.write(`  total hits: ${totalHits}  captured: ${capturedHits}  uncaptured: ${uncapturedHits}\n`);
    process.stdout.write(`  severity: critical=${counts.critical} warn=${counts.warn} info=${counts.info}\n`);
    if (uncapturedHits === 0) {
      process.stdout.write(`  ✅ all flagged events appear captured to memory or wiki.\n\n`);
    } else {
      process.stdout.write(`\n  ⚠ uncaptured punch list (top ${hits.length}):\n`);
      for (const h of hits) {
        process.stdout.write(`    [${h.severity}/${h.category}] ${h.match} — ${h.source}\n`);
        process.stdout.write(`         "${h.context.slice(0, 140)}"\n`);
        process.stdout.write(`         why: ${h.why}\n\n`);
      }
      process.stdout.write(`  Run /learn-from-mistake or write a memo at ${MEMORY_DIR}/feedback_<slug>.md\n\n`);
    }
  }
  process.exit(0);
}
