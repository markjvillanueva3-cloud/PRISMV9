#!/usr/bin/env node
// tier: T3
/**
 * stop-bug-finding-wiki-gate.mjs — Stop advisory hook enforcing the
 * [[feedback_always_update_wiki_on_bug_finding]] standing rule.
 *
 * Detects bug-finding artifacts shipped in this session's commits (or
 * uncommitted in the working tree) and verifies a companion wiki entry
 * exists. Three detection signals:
 *
 *   1. New line added to `H:/prism/CLAUDE.md` § Recent regressions
 *      (the back-flow log named in CLAUDE.md doctrine).
 *   2. New `feedback_*.md` or `reference_*_(bug|regression|fix)_*.md`
 *      memory file under the project memory dir.
 *   3. Commit subject containing bug-class keywords (FAILLOUD, regression,
 *      silent, corruption, R12, BLOCK, fail-loud, rot, [fix]).
 *
 * For each detected bug-finding, check for a companion wiki entry under:
 *   - knowledge/wiki/lessons/
 *   - knowledge/wiki/code-tribal/
 *   - knowledge/wiki/architecture/   (only if the entry references the bug)
 *
 * If missing → emit a `systemMessage` reminder (NOT block). Stop chains
 * already carry the per-file scrutiny gate + 3-of-3 strict consensus that
 * block on real correctness issues; this gate is the durable
 * teaching-surface enforcer, advisory by design.
 *
 * Knobs:
 *   PRISM_BUG_FINDING_WIKI_GATE_DISABLE=1   — disable entirely
 *   PRISM_BUG_FINDING_WIKI_GATE_HORIZON=N   — look-back commit count (default 3)
 *   PRISM_BUG_FINDING_WIKI_GATE_MAX_LIST=N  — advisory line cap (default 8)
 *   PRISM_MEMORY_DIR=<path>                 — override memory dir (test-only)
 */

import fs from "node:fs";
import path from "node:path";
import * as childProc from "node:child_process";

const REPO_ROOT = "H:/prism";
const DEFAULT_HORIZON = 3;
const DEFAULT_MAX_LIST = 8;
const GIT_TIMEOUT_MS = 5000;
const MIN_TOKEN_LEN_FOR_FUZZY_MATCH = 4;
const SLUG_MAX_LEN = 60;
const REF_MAX_LEN = 120;
const HORIZON = Number(process.env.PRISM_BUG_FINDING_WIKI_GATE_HORIZON || DEFAULT_HORIZON);
const MAX_LIST = Number(process.env.PRISM_BUG_FINDING_WIKI_GATE_MAX_LIST || DEFAULT_MAX_LIST);
const DISABLE = process.env.PRISM_BUG_FINDING_WIKI_GATE_DISABLE === "1";

/** Bug-class keywords in a commit subject. Case-insensitive substring match. */
export const BUG_KEYWORDS = Object.freeze([
  "[fix]",
  "regression",
  "silent",
  "fail-silent",
  "corruption",
  "R12",
  "BLOCK",
  " wrong",
  "MERGE-FAILLOUD",
  "FAILLOUD",
  "fail-loud",
  "rot",
]);

/** Memory file name patterns that imply a bug finding. */
export const MEMORY_BUG_PATTERNS = [
  /^feedback_.*\.md$/i,
  /^reference_.*_(bug|regression|fix|fail|rot|silent)_.*\.md$/i,
  /^reference_u_.*_(faillod|faillud)_.*\.md$/i,
];

/**
 * Safely run a git command — uses spawnSync (no shell, no injection risk).
 * Returns the stdout string on success, empty string on any error.
 *
 * @param {string[]} args
 * @returns {string}
 */
function safeGit(args) {
  try {
    const r = childProc.spawnSync("git", ["-C", REPO_ROOT, ...args], {
      encoding: "utf8",
      timeout: GIT_TIMEOUT_MS,
    });
    return r.status === 0 ? (r.stdout || "") : "";
  } catch {
    return "";
  }
}

/**
 * Scan the last N commits for bug-finding signals + uncommitted working-tree
 * markers. Returns array of `{type, slug, ref}` records.
 *
 * @param {number} horizon  number of commits to scan
 * @returns {Array<{type: string, slug: string, ref: string}>}
 */
export function detectBugFindings(horizon = HORIZON) {
  const findings = [];
  const commitRange = `HEAD~${horizon}..HEAD`;

  // Signal 1: new ## Recent regressions lines in recent commits (diff of CLAUDE.md)
  const claudeMdDiff = safeGit(["log", "-p", "--no-color", commitRange, "--", "CLAUDE.md"]);
  for (const line of claudeMdDiff.split(/\r?\n/)) {
    const m = /^\+-\s*\d{4}-\d{2}-\d{2}\s*\|\s*\*\*(.+?)\*\*/.exec(line);
    if (m) {
      findings.push({
        type: "claude-md-regression",
        slug: slugify(m[1]).slice(0, SLUG_MAX_LEN),
        ref: m[1].slice(0, REF_MAX_LEN),
      });
    }
  }

  // Signal 2: new memory files in recent commits + uncommitted ones
  const commitFiles = safeGit(["log", "--name-only", "--pretty=format:", commitRange]);
  const seenMemPaths = new Set();
  for (const f of commitFiles.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    const base = path.basename(f);
    if (MEMORY_BUG_PATTERNS.some(p => p.test(base)) && !seenMemPaths.has(f)) {
      seenMemPaths.add(f);
      findings.push({
        type: "memory-bug-file",
        slug: base.replace(/\.md$/, ""),
        ref: f,
      });
    }
  }
  const stat = safeGit(["status", "--short", "--untracked-files=all"]);
  for (const line of stat.split(/\r?\n/)) {
    const m = /^[ ?A][ ?M]\s+(.+\.md)$/.exec(line);
    if (!m) continue;
    const base = path.basename(m[1]);
    if (MEMORY_BUG_PATTERNS.some(p => p.test(base))) {
      findings.push({
        type: "memory-bug-file-uncommitted",
        slug: base.replace(/\.md$/, ""),
        ref: m[1],
      });
    }
  }

  // Signal 3: bug-class keywords in commit subjects
  const subjects = safeGit(["log", "--pretty=format:%H %s", commitRange]);
  for (const line of subjects.split(/\r?\n/)) {
    const lower = line.toLowerCase();
    for (const kw of BUG_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        const sha = line.slice(0, 12);
        findings.push({
          type: "commit-subject-bug-kw",
          slug: slugify(line.slice(13)).slice(0, SLUG_MAX_LEN),
          ref: sha,
        });
        break;
      }
    }
  }

  const seen = new Set();
  return findings.filter(f => {
    if (seen.has(f.slug)) return false;
    seen.add(f.slug);
    return true;
  });
}

/** Cheap kebab-case slug, ASCII-only. */
export function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Check whether a wiki entry exists for a given bug-finding slug. Looks for
 * the slug as either a filename or a substring inside lessons/, code-tribal/,
 * or architecture/ markdown files.
 *
 * @param {string} slug
 * @param {{wikiRoot?: string}} [opts]
 * @returns {boolean}
 */
export function hasCompanionWikiEntry(slug, opts = {}) {
  const wikiRoot = opts.wikiRoot || path.join(REPO_ROOT, "knowledge", "wiki");
  if (!slug) return false;
  const checkDirs = ["lessons", "code-tribal", "architecture"];
  const tokens = slug.split("-").filter(t => t.length >= MIN_TOKEN_LEN_FOR_FUZZY_MATCH);
  for (const sub of checkDirs) {
    const dirAbs = path.join(wikiRoot, sub);
    if (!fs.existsSync(dirAbs)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.endsWith(".md")) continue;
      const nameNoExt = ent.name.replace(/\.md$/, "").toLowerCase();
      if (nameNoExt.includes(slug)) return true;
      for (const t of tokens) {
        if (nameNoExt.includes(t)) return true;
      }
    }
  }
  return false;
}

/**
 * Render the operator-facing advisory message. Returns "" when nothing is
 * missing (caller decides whether to attach a systemMessage at all).
 *
 * @param {Array<{type: string, slug: string, ref: string}>} missing
 * @returns {string}
 */
export function renderAdvisory(missing) {
  if (!missing || missing.length === 0) return "";
  const lines = [];
  lines.push("⚠ Wiki gap detected — bug finding(s) shipped without companion wiki entries.");
  lines.push("Rule: feedback_always_update_wiki_on_bug_finding (2026-05-17, lima 77971357).");
  lines.push("");
  for (const m of missing.slice(0, MAX_LIST)) {
    lines.push(`  · [${m.type}] ${m.slug}`);
    lines.push(`      → ${m.ref}`);
  }
  if (missing.length > MAX_LIST) {
    lines.push(`  · …and ${missing.length - MAX_LIST} more`);
  }
  lines.push("");
  lines.push("Write knowledge/wiki/lessons/<bug-class-slug>.md (or code-tribal/) with sections:");
  lines.push("  § Symptom · § Root cause · § Detection · § Prevention · § Cross-refs");
  lines.push("Knob: PRISM_BUG_FINDING_WIKI_GATE_DISABLE=1 (one-shot override).");
  return lines.join("\n");
}

/** Hook entry point — invoked by the Stop hook chain. */
export function runGate({ horizon = HORIZON, wikiRoot } = {}) {
  if (DISABLE) {
    return { continue: true };
  }
  const findings = detectBugFindings(horizon);
  if (findings.length === 0) {
    return { continue: true };
  }
  const missing = findings.filter(f => !hasCompanionWikiEntry(f.slug, { wikiRoot }));
  if (missing.length === 0) {
    return { continue: true };
  }
  return {
    continue: true,
    systemMessage: renderAdvisory(missing),
  };
}

// CLI / hook entry — only run when invoked directly, NOT on import.
const isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    return import.meta.url.endsWith(argv1) || import.meta.url === `file://${argv1}`;
  } catch { return false; }
})();
if (isMain) {
  if (!process.stdin.isTTY) {
    process.stdin.resume();
    process.stdin.on("data", () => {});
    process.stdin.on("end", () => {
      process.stdout.write(JSON.stringify(runGate()));
    });
  } else {
    process.stdout.write(JSON.stringify(runGate()));
  }
}
