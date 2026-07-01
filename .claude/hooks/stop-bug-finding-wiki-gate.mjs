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
 * If missing → emit a `systemMessage` reminder. Advisory by default — Stop
 * chains already carry the per-file scrutiny gate + 3-of-3 strict consensus
 * that block on real correctness issues. Two opt-in modes harden it:
 *   - AUTOSTUB writes a skeleton wiki entry for each gap (gap → empty entry)
 *   - HARD blocks the Stop while a genuine gap remains (no entry, no stub)
 *
 * Knobs:
 *   PRISM_BUG_FINDING_WIKI_GATE_DISABLE=1   — disable entirely
 *   PRISM_BUG_FINDING_WIKI_GATE_HORIZON=N   — look-back commit count (default 3)
 *   PRISM_BUG_FINDING_WIKI_GATE_MAX_LIST=N  — advisory line cap (default 8)
 *   PRISM_BUG_FINDING_WIKI_GATE_AUTOSTUB=1  — auto-create a skeleton wiki stub
 *   PRISM_BUG_FINDING_WIKI_GATE_HARD=1      — block the Stop on a genuine gap
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
const AUTOSTUB = process.env.PRISM_BUG_FINDING_WIKI_GATE_AUTOSTUB === "1";
const HARD = process.env.PRISM_BUG_FINDING_WIKI_GATE_HARD === "1";

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
 * missing AND nothing was stubbed (caller decides whether to attach a
 * systemMessage at all).
 *
 * @param {Array<{type: string, slug: string, ref: string}>} missing  genuine gaps
 * @param {Array<{type: string, slug: string, stubPath: string}>} [stubbed]  auto-stubs created this run
 * @returns {string}
 */
export function renderAdvisory(missing, stubbed = []) {
  const miss = Array.isArray(missing) ? missing : [];
  const stub = Array.isArray(stubbed) ? stubbed : [];
  if (miss.length === 0 && stub.length === 0) return "";
  const lines = [];
  if (miss.length > 0) {
    lines.push("⚠ Wiki gap detected — bug finding(s) shipped without companion wiki entries.");
    lines.push("Rule: feedback_always_update_wiki_on_bug_finding (2026-05-17, lima 77971357).");
    lines.push("");
    for (const m of miss.slice(0, MAX_LIST)) {
      lines.push(`  · [${m.type}] ${m.slug}`);
      lines.push(`      → ${m.ref}`);
    }
    if (miss.length > MAX_LIST) {
      lines.push(`  · …and ${miss.length - MAX_LIST} more`);
    }
    lines.push("");
    lines.push("Write knowledge/wiki/lessons/<bug-class-slug>.md (or code-tribal/) with sections:");
    lines.push("  § Symptom · § Root cause · § Detection · § Prevention · § Cross-refs");
  }
  if (stub.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("✎ Auto-stub created — fill in the skeleton(s) before they rot:");
    for (const s of stub.slice(0, MAX_LIST)) {
      lines.push(`  · ${s.stubPath}   (${s.slug})`);
    }
    if (stub.length > MAX_LIST) {
      lines.push(`  · …and ${stub.length - MAX_LIST} more`);
    }
  }
  lines.push("Knob: PRISM_BUG_FINDING_WIKI_GATE_DISABLE=1 (one-shot override).");
  return lines.join("\n");
}

/**
 * Render an auto-generated wiki stub for a bug-finding with no companion
 * entry. The skeleton carries the five required sections + frontmatter
 * tagged `status: stub` / `auto_generated: true` so a later wiki-lint pass
 * (or a plain grep) can find unfilled stubs. The advisory still names every
 * stub created so the operator fills it in the same session.
 *
 * @param {{type?: string, slug?: string, ref?: string}} finding
 * @returns {string}  markdown content
 */
export function renderWikiStub(finding) {
  const slug = slugify(finding?.slug || "");
  const ref = String(finding?.ref || slug || "unknown bug finding").slice(0, REF_MAX_LEN);
  const type = String(finding?.type || "unknown");
  const today = new Date().toISOString().slice(0, 10);
  return [
    "---",
    `title: ${ref}`,
    "tags: [lesson, bug-finding, stub, auto-generated]",
    `created: ${today}`,
    "status: stub",
    "auto_generated: true",
    "source: stop-bug-finding-wiki-gate auto-stub",
    "sibling-memory: feedback_always_update_wiki_on_bug_finding",
    "---",
    "",
    `# ${ref}`,
    "",
    "> AUTO-GENERATED STUB — fill in the five sections below, then drop",
    "> `status: stub` + `auto_generated: true` from the frontmatter. Created",
    "> by `stop-bug-finding-wiki-gate` per feedback_always_update_wiki_on_bug_finding.",
    "",
    "## Symptom",
    "",
    "_TODO — what was observed? The visible failure._",
    "",
    "## Root cause",
    "",
    "_TODO — why did it happen? The underlying defect._",
    "",
    "## Detection",
    "",
    "_TODO — how was it caught, and how to catch this class earlier?_",
    "",
    "## Prevention",
    "",
    "_TODO — what stops it recurring? A gate, a test, a convention._",
    "",
    "## Cross-refs",
    "",
    `- Finding type: \`${type}\``,
    `- Ref: \`${ref}\``,
    "",
  ].join("\n");
}

/**
 * Create an auto-generated wiki stub for a missing bug-finding under
 * `<wikiRoot>/lessons/<slug>.md`. Idempotent (never overwrites an existing
 * file) and fail-soft (returns null on any I/O error — a Stop hook must
 * never throw). Returns the wiki-relative POSIX path on success, else null.
 *
 * @param {{type?: string, slug?: string, ref?: string}} finding
 * @param {{wikiRoot?: string}} [opts]
 * @returns {string|null}
 */
export function createWikiStub(finding, opts = {}) {
  const wikiRoot = opts.wikiRoot || path.join(REPO_ROOT, "knowledge", "wiki");
  const slug = slugify(finding?.slug || "");
  if (!slug) return null;
  const lessonsDir = path.join(wikiRoot, "lessons");
  const target = path.join(lessonsDir, `${slug}.md`);
  try {
    if (fs.existsSync(target)) return null;        // idempotent — never clobber
    fs.mkdirSync(lessonsDir, { recursive: true });
    fs.writeFileSync(target, renderWikiStub(finding), "utf8");
    return `lessons/${slug}.md`;
  } catch {
    return null;                                   // fail-soft
  }
}

/**
 * Hook entry point — invoked by the Stop hook chain.
 *
 * @param {object} [opts]
 * @param {number}  [opts.horizon]   look-back commit count
 * @param {string}  [opts.wikiRoot]  wiki root override (test fixtures)
 * @param {boolean} [opts.autostub]  write a skeleton entry for each gap
 * @param {boolean} [opts.hard]      block the Stop while a genuine gap remains
 * @param {Array}   [opts.findings]  inject findings, bypassing the live git scan (test seam)
 * @returns {{continue:boolean, systemMessage?:string, decision?:string, reason?:string}}
 */
export function runGate({ horizon = HORIZON, wikiRoot, autostub = AUTOSTUB, hard = HARD, findings } = {}) {
  if (DISABLE) {
    return { continue: true };
  }
  const found = Array.isArray(findings) ? findings : detectBugFindings(horizon);
  if (found.length === 0) {
    return { continue: true };
  }
  const missing = found.filter(f => !hasCompanionWikiEntry(f.slug, { wikiRoot }));
  if (missing.length === 0) {
    return { continue: true };
  }

  // AUTOSTUB — convert each gap from "no entry" to "empty entry to fill". A
  // successfully stubbed finding is no longer missing: the companion file
  // now exists, so it drops out of `stillMissing` (and out of HARD's reach).
  const stubbed = [];
  if (autostub) {
    for (const f of missing) {
      const stubPath = createWikiStub(f, { wikiRoot });
      if (stubPath) stubbed.push({ ...f, stubPath });
    }
  }
  const stubbedSlugs = new Set(stubbed.map(s => s.slug));
  const stillMissing = missing.filter(f => !stubbedSlugs.has(f.slug));
  const advisory = renderAdvisory(stillMissing, stubbed);

  // HARD — refuse the Stop while a genuine gap remains (no entry AND no
  // stub). Opt-in only: doctrine default is advisory so the per-file
  // scrutiny + 3-of-3 gates stay in front. With AUTOSTUB also on, stubs
  // normally satisfy every gap so HARD never bites — by design.
  if (hard && stillMissing.length > 0) {
    return { continue: false, decision: "block", reason: advisory };
  }
  if (!advisory) {
    return { continue: true };
  }
  return { continue: true, systemMessage: advisory };
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
