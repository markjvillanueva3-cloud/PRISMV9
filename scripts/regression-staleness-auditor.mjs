#!/usr/bin/env node
/**
 * regression-staleness-auditor — surface stale entries in CLAUDE.md
 * "## Recent regressions" section so autonomous loops stop chasing
 * already-fixed bugs.
 *
 * Compounding-gains rationale: during kilo session 2026-05-17, four out
 * of four regression-list entries that an autonomous /loop picked up as
 * "next unit" turned out to be already fixed (stop-force-loop-continue,
 * posttool-edit-bundle ENOENT refs, DISPATCHER_DIGEST parser, original
 * U-OLLAMA-R1). The loop burned 3 of 4 iterations verifying stale claims.
 * This auditor cross-checks each entry against git log + current code state
 * so the staleness signal surfaces BEFORE the loop chases it.
 *
 * Strictly ADVISORY: never edits CLAUDE.md (peer-contested + Karpathy R8
 * "match conventions even when you disagree" — surface the issue in the
 * chat-bus, do not silently mutate). The fix path is "human reviews and
 * prunes" not "auto-prune".
 *
 * Heuristics (priority order):
 *   1. Explicit "fix: see commit <SHA>" or "fixed in <SHA>" → CERTAIN-SHIPPED
 *      (the fix author already named the resolving commit; entry is doc debt)
 *   2. Entry mentions `observed-in: <SHA>` AND git log shows later commits
 *      touching any file path mentioned in the entry → LIKELY-STALE
 *   3. Entry has "fix: pending" but no later commits touch the files →
 *      FRESH (still pending)
 *   4. No SHA, no file refs, prose-only → UNKNOWN
 *
 * Usage:
 *   node scripts/regression-staleness-auditor.mjs            # human summary
 *   node scripts/regression-staleness-auditor.mjs --json     # machine output
 *   node scripts/regression-staleness-auditor.mjs --ledger   # append JSONL row
 *
 * Exit codes (cron-friendly):
 *   0 — no stale entries found (all fresh or unknown)
 *   1 — likely-stale entries found (>= 1)
 *   2 — measurement error (CLAUDE.md unreadable, git unavailable)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLAUDE_MD = join(REPO_ROOT, "CLAUDE.md");
const LEDGER_FILE = join(REPO_ROOT, "state", "shared", "regression-staleness-history.jsonl");
const SECTION_HEADER = "## Recent regressions";
const GIT_TIMEOUT_MS = 5000;
const SHA_RE = /\b[0-9a-f]{7,40}\b/;
const PATH_RE = /\b(?:mcp-server\/src\/[\w/.-]+\.[a-z]+|\.claude\/(?:hooks|helpers|commands|schemas)\/[\w/.-]+\.[a-z]+|scripts\/[\w/.-]+\.[a-z]+)\b/g;
const FIX_SHIPPED_RE = /(?:fix(?:ed)?(?:\s+in)?|shipped(?:\s+in)?)\s*[:—]?\s*(?:commit\s+)?([0-9a-f]{7,40})/i;

const argv = process.argv.slice(2);
const jsonOut = argv.includes("--json");
const writeLedger = argv.includes("--ledger");

function readClaudeMd() {
  if (!existsSync(CLAUDE_MD)) return null;
  try { return readFileSync(CLAUDE_MD, "utf8"); } catch { return null; }
}

function extractSection(md) {
  const lines = md.split(/\r?\n/);
  const startIdx = lines.findIndex(l => l.trim().startsWith(SECTION_HEADER));
  if (startIdx < 0) return null;
  // section runs to next H2 (or EOF)
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { endIdx = i; break; }
  }
  return lines.slice(startIdx + 1, endIdx).join("\n");
}

function parseEntries(sectionText) {
  // Entries start with `- YYYY-MM-DD |`. Continuation lines (multi-line entries)
  // are absorbed until the next entry header or end-of-section.
  const out = [];
  const lines = sectionText.split(/\r?\n/);
  let current = null;
  for (const raw of lines) {
    const m = raw.match(/^-\s+(\d{4}-\d{2}-\d{2})\s*\|/);
    if (m) {
      if (current) out.push(current);
      current = { date: m[1], rawLines: [raw] };
    } else if (current) {
      current.rawLines.push(raw);
    }
  }
  if (current) out.push(current);
  // Hydrate parsed fields
  return out.map(e => {
    const body = e.rawLines.join(" ");
    const observedShaMatch = body.match(/observed-in:\s*([0-9a-f]{7,40})/i);
    const fixShippedMatch = body.match(FIX_SHIPPED_RE);
    const isPending = /fix:\s*pending/i.test(body);
    const paths = [...new Set((body.match(PATH_RE) || []))];
    const titleMatch = body.match(/\*\*([^*]+)\*\*/);
    return {
      date: e.date,
      title: titleMatch ? titleMatch[1].trim() : body.slice(2, 80).trim(),
      observedSha: observedShaMatch ? observedShaMatch[1] : null,
      fixShippedSha: fixShippedMatch ? fixShippedMatch[1] : null,
      isPending,
      paths,
      bodyLen: body.length,
    };
  });
}

function runGit(args, cwd = REPO_ROOT) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", timeout: GIT_TIMEOUT_MS });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || "").trim();
}

function commitExists(sha) {
  if (!sha) return false;
  return runGit(["cat-file", "-e", sha + "^{commit}"]) !== null;
}

function laterCommitsTouching(sinceDate, paths) {
  if (!paths.length) return [];
  // "since" is the day AFTER the regression date so we don't catch the entry's
  // own observation commit.
  const sinceArg = `--since=${sinceDate}T23:59:59`;
  const args = ["log", "--oneline", sinceArg, "--"].concat(paths);
  const out = runGit(args);
  if (!out) return [];
  return out.split(/\r?\n/).filter(Boolean).slice(0, 5);
}

function classify(entry) {
  // Priority 1: explicit fix-shipped SHA + commit exists
  if (entry.fixShippedSha && commitExists(entry.fixShippedSha)) {
    return { status: "certain-shipped", evidence: `fix sha ${entry.fixShippedSha} present in git` };
  }
  // Need file refs to do path-based heuristics
  if (!entry.paths.length) {
    return { status: "unknown", evidence: "no file paths in entry — manual review" };
  }
  // Priority 2/3: later commits to mentioned files
  const later = laterCommitsTouching(entry.date, entry.paths);
  if (later.length === 0) {
    return entry.isPending
      ? { status: "fresh-pending", evidence: `no later commits to ${entry.paths.length} file(s)` }
      : { status: "fresh-unknown", evidence: `no later commits; no 'fix: pending' marker` };
  }
  return {
    status: entry.isPending ? "likely-stale" : "possibly-shipped",
    evidence: `${later.length} later commit(s): ${later[0]}`,
    laterCommits: later,
  };
}

function main() {
  const md = readClaudeMd();
  if (!md) {
    const err = { ok: false, error: "claude_md_unreadable", path: CLAUDE_MD };
    console.log(jsonOut ? JSON.stringify(err) : `ERR: cannot read ${CLAUDE_MD}`);
    process.exit(2);
  }
  const section = extractSection(md);
  if (!section) {
    const err = { ok: false, error: "section_missing", header: SECTION_HEADER };
    console.log(jsonOut ? JSON.stringify(err) : `ERR: '${SECTION_HEADER}' not found in CLAUDE.md`);
    process.exit(2);
  }
  // Health-check git
  if (runGit(["rev-parse", "HEAD"]) === null) {
    const err = { ok: false, error: "git_unavailable" };
    console.log(jsonOut ? JSON.stringify(err) : "ERR: git unavailable");
    process.exit(2);
  }

  const entries = parseEntries(section);
  const classified = entries.map(e => ({ ...e, ...classify(e) }));

  const counts = classified.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const likelyStale = classified.filter(c => c.status === "likely-stale" || c.status === "certain-shipped");

  const report = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: CLAUDE_MD,
    sectionLines: section.split(/\r?\n/).length,
    entriesTotal: classified.length,
    counts,
    likelyStaleCount: likelyStale.length,
    likelyStale,
    advisoryOnly: true,
    mustHumanVerify: true,
    note: "Never auto-prunes CLAUDE.md. Human reviews + prunes pruned entries.",
  };

  if (writeLedger) {
    try {
      mkdirSync(dirname(LEDGER_FILE), { recursive: true });
      const row = { ts: report.generatedAt, total: report.entriesTotal, counts, likelyStale: report.likelyStaleCount };
      // Atomic append: read existing, concat, rename
      const tmp = LEDGER_FILE + `.tmp-${process.pid}-${Date.now()}`;
      const existing = existsSync(LEDGER_FILE) ? readFileSync(LEDGER_FILE, "utf8") : "";
      writeFileSync(tmp, existing + JSON.stringify(row) + "\n", "utf8");
      renameSync(tmp, LEDGER_FILE);
    } catch (e) {
      // Ledger failure is non-fatal — report still emits
      report.ledgerError = String(e?.message || e);
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`regression-staleness-auditor — ${report.entriesTotal} entries scanned`);
    console.log(`  counts: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    if (likelyStale.length === 0) {
      console.log("  ✓ no stale entries — section is clean");
    } else {
      console.log(`  ⚠ ${likelyStale.length} stale candidate(s) for human review:`);
      for (const s of likelyStale.slice(0, 10)) {
        console.log(`    - ${s.date} [${s.status}] ${s.title.slice(0, 90)}`);
        console.log(`        ${s.evidence}`);
      }
    }
  }

  // Exit codes — cron/CI friendly
  if (likelyStale.length > 0) process.exit(1);
  process.exit(0);
}

main();
