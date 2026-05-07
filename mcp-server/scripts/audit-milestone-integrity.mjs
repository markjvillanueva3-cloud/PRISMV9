/**
 * Milestone Integrity Auditor — INTEL-OLLAMA-OBSIDIAN-MS0 / TIE-UP utility
 *
 * Walks a roadmap milestone JSON, verifies that every "completed" unit's
 * deliverable paths exist on disk, AND flags "ghost-shipped" units —
 * commits whose subject prefix `[<MILESTONE>]/<UNIT>:` exist in git log
 * but whose milestone-JSON entry has no `status: "completed"` field.
 *
 * Origin: discovered 2026-05-07 that P4-U02 was ghost-shipped (commit
 * 683305e62, 5 days old) but never closed in INTEL-OLLAMA-OBSIDIAN-MS0.json
 * until manual retroactive close. This auditor catches the inverse class
 * of bug too — units marked "completed" whose deliverables vanished.
 *
 * Pure-function exports for tests:
 *   - extractMilestoneId(milestone)             → "INTEL-OLLAMA-OBSIDIAN-MS0"
 *   - flattenUnits(milestone)                   → unit[]
 *   - parseGitLogForUnits(log, milestoneId)     → Map<unitId, sha>
 *   - resolveDeliverablePath(repoRoot, deliv)   → absolute path or null
 *   - classifyUnit(unit, deliverablesExist, gitMap) → status enum
 *   - summarizeAudit(rows)                      → counts + verdict
 *   - formatMarkdownReport(audit, milestoneId, generatedAt) → md string
 *
 * Run as script:
 *   node audit-milestone-integrity.mjs --milestone INTEL-OLLAMA-OBSIDIAN-MS0
 *   node audit-milestone-integrity.mjs --milestone <id> --json
 *   node audit-milestone-integrity.mjs --milestone <id> --strict   # exit 1 on drift
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, isAbsolute, basename } from "node:path";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// CONSTANTS =================================================================

export const DEFAULT_REPO_ROOT = "H:/prism-iooms0";
export const DEFAULT_MILESTONE_DIR = "mcp-server/data/milestones";
export const DEFAULT_REPORT_DIR = "mcp-server/data/state";

/**
 * Per-unit audit verdicts.
 *  - "ok":                 completed in JSON, deliverables exist, commit found
 *  - "deliverable-gap":    completed in JSON, deliverables[] missing on disk
 *  - "ghost-shipped":      commit subject found, but JSON has no completed status
 *  - "open":               no commit, no completed status — work pending
 *  - "anachronism":        completed in JSON but no matching commit found
 *  - "scope-invalidated":  unit's spec premise is invalid for this branch
 *                          (e.g., target file/dispatcher doesn't exist).
 *                          Honestly closed without lying about completion.
 *                          Does NOT count toward drift — it's a documented
 *                          spec mismatch, not pending work.
 */
export const VERDICTS = Object.freeze({
  OK: "ok",
  DELIVERABLE_GAP: "deliverable-gap",
  GHOST_SHIPPED: "ghost-shipped",
  OPEN: "open",
  ANACHRONISM: "anachronism",
  SCOPE_INVALIDATED: "scope-invalidated",
});

// PURE FUNCTIONS (exported for tests) =======================================

export function extractMilestoneId(milestone) {
  if (!milestone || typeof milestone !== "object") return "";
  return typeof milestone.id === "string" ? milestone.id : "";
}

/**
 * Flatten the milestone's nested phases[].units[] into a single array,
 * tagging each with its parent phase id so reports can group by phase.
 * Defensive on missing phases / units.
 */
export function flattenUnits(milestone) {
  if (!milestone || !Array.isArray(milestone.phases)) return [];
  const out = [];
  for (const phase of milestone.phases) {
    if (!phase || !Array.isArray(phase.units)) continue;
    const phaseId = typeof phase.id === "string" ? phase.id : "UNKNOWN";
    for (const u of phase.units) {
      if (!u || typeof u.id !== "string") continue;
      out.push({ ...u, phaseId });
    }
  }
  return out;
}

/**
 * Parse `git log --oneline --all` for commits attributed to this milestone.
 * Matches subject formats observed in PRISM history:
 *   `<sha> [MS]/UNIT: ...`              — current preferred
 *   `<sha> MS/UNIT: ...`                — older bracketless form
 *   `<sha> [MS]/UNIT1+UNIT2+UNIT3: ...` — multi-unit ship
 *   `<sha> [MS]/PX-U01..U05: ...`       — range form (inclusive expand)
 *
 * Each unit ID extracted gets the FIRST (most recent) commit. Suffixes
 * `-fix`, `-test-tighten<N>`, `-close`, `-amend`, `-patch<N>`, `-rev<N>`
 * are stripped — those are follow-on commits, not separate units.
 */
export function parseGitLogForUnits(log, milestoneId) {
  const map = new Map();
  if (typeof log !== "string" || typeof milestoneId !== "string" || milestoneId.length === 0) {
    return map;
  }
  const escaped = milestoneId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Capture the token block between `[MS]/` (or bare `MS/`) and the first `:`.
  const re = new RegExp(`^([0-9a-f]{6,40})\\s+.*?\\[?${escaped}\\]?/([A-Z0-9_+\\-.]+):`, "i");
  for (const line of log.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const sha = m[1];
    for (const tok of expandUnitTokens(m[2])) {
      const unitId = tok.replace(/-(fix|test-tighten\d*|close|amend|patch\d*|rev\d*)$/i, "");
      if (unitId.length > 0 && !map.has(unitId)) map.set(unitId, sha);
    }
  }
  return map;
}

/**
 * Expand a unit-token block from a commit subject into the full set of
 * unit ids it covers. Handles single, sticky-phase '+', range '..', and
 * combinations. Phase prefix is sticky across `+` chains.
 *
 * Examples:
 *   "P5-U01"               → ["P5-U01"]
 *   "P5-U01+U02+U03"       → ["P5-U01", "P5-U02", "P5-U03"]
 *   "P5-U01..U05"          → ["P5-U01", "P5-U02", "P5-U03", "P5-U04", "P5-U05"]
 *   "P5-U01..U05+P6-U03"   → P5-U01..P5-U05 + P6-U03
 *   "P9-U02+P9-U03+P22-U01"→ ["P9-U02","P9-U03","P22-U01"]
 */
export function expandUnitTokens(tokenBlock) {
  if (typeof tokenBlock !== "string" || tokenBlock.length === 0) return [];
  const out = [];
  let lastPhase = "";
  for (const piece of tokenBlock.split("+")) {
    if (piece.length === 0) continue;
    const rangeMatch = piece.match(/^(?:(P\d+)-)?(U\d+)\.\.(U\d+)$/i);
    if (rangeMatch) {
      const phase = rangeMatch[1] ?? lastPhase;
      if (!phase) continue;
      lastPhase = phase;
      const startNum = parseInt(rangeMatch[2].slice(1), 10);
      const endNum = parseInt(rangeMatch[3].slice(1), 10);
      if (Number.isFinite(startNum) && Number.isFinite(endNum) && endNum >= startNum && (endNum - startNum) < 50) {
        for (let n = startNum; n <= endNum; n++) {
          out.push(`${phase}-U${String(n).padStart(2, "0")}`);
        }
      }
      continue;
    }
    const fullMatch = piece.match(/^(P\d+)-(U\d+[A-Za-z0-9_-]*)$/);
    if (fullMatch) {
      lastPhase = fullMatch[1];
      out.push(`${fullMatch[1]}-${fullMatch[2]}`);
      continue;
    }
    const stickyMatch = piece.match(/^(U\d+[A-Za-z0-9_-]*)$/);
    if (stickyMatch && lastPhase) {
      out.push(`${lastPhase}-${stickyMatch[1]}`);
    }
  }
  return out;
}

/**
 * Resolve a deliverable path against a repo root. Handles three cases:
 *  1. absolute (use as-is, but warn if outside repo)
 *  2. starts with `H:/` or drive letter (absolute, but coerced)
 *  3. relative (join with repoRoot)
 * Returns null for non-string / empty / wildcard ("4 files") pseudo-paths.
 */
export function resolveDeliverablePath(repoRoot, deliv) {
  if (!deliv || typeof deliv !== "object" || typeof deliv.path !== "string") return null;
  const p = deliv.path.trim();
  if (p.length === 0) return null;
  // Pseudo-paths like ".claude/hooks/ollama-*.mjs (4 files)" are not real files
  if (/\([0-9]+\s*files?\)/i.test(p) || p.includes("*")) return null;
  if (isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p)) return p;
  if (typeof repoRoot !== "string" || repoRoot.length === 0) return null;
  return join(repoRoot, p);
}

/**
 * Classify a unit per the VERDICTS enum given:
 *   - unit.status: "completed" | undefined
 *   - allDeliverablesExist: bool (caller pre-checks fs)
 *   - gitMap: Map<unitId, sha>
 */
export function classifyUnit(unit, allDeliverablesExist, gitMap) {
  if (!unit || typeof unit.id !== "string") return VERDICTS.OPEN;
  // SCOPE_INVALIDATED is short-circuited first — it's an honest "we
  // looked at this and the spec premise doesn't match the codebase"
  // close-out. Independent of commit / deliverable state.
  if (unit.status === "scope_invalidated") return VERDICTS.SCOPE_INVALIDATED;
  const completed = unit.status === "completed";
  const hasCommit = gitMap instanceof Map && gitMap.has(unit.id);
  // ANACHRONISM (JSON says completed, no commit found) is checked next —
  // it's a stronger drift signal than a missing deliverable, and we don't
  // want it masked by an "OK" classification when the deliverables happen
  // to exist by coincidence.
  if (completed && !hasCommit) return VERDICTS.ANACHRONISM;
  if (completed && allDeliverablesExist) return VERDICTS.OK;
  if (completed && !allDeliverablesExist) return VERDICTS.DELIVERABLE_GAP;
  if (!completed && hasCommit) return VERDICTS.GHOST_SHIPPED;
  return VERDICTS.OPEN;
}

/**
 * Aggregate row counts. Drift = anything except OK + OPEN.
 */
export function summarizeAudit(rows) {
  const counts = {
    total: 0,
    ok: 0,
    deliverableGap: 0,
    ghostShipped: 0,
    open: 0,
    anachronism: 0,
    scopeInvalidated: 0,
  };
  if (!Array.isArray(rows)) return { ...counts, drift: 0, verdict: "OK" };
  for (const r of rows) {
    counts.total++;
    switch (r?.verdict) {
      case VERDICTS.OK: counts.ok++; break;
      case VERDICTS.DELIVERABLE_GAP: counts.deliverableGap++; break;
      case VERDICTS.GHOST_SHIPPED: counts.ghostShipped++; break;
      case VERDICTS.OPEN: counts.open++; break;
      case VERDICTS.ANACHRONISM: counts.anachronism++; break;
      case VERDICTS.SCOPE_INVALIDATED: counts.scopeInvalidated++; break;
      default: break;
    }
  }
  // scope-invalidated is an honest-close, NOT drift — same as OK + open.
  const drift = counts.deliverableGap + counts.ghostShipped + counts.anachronism;
  return { ...counts, drift, verdict: drift === 0 ? "OK" : "DRIFT" };
}

/**
 * Render a markdown report. Stable, deterministic — sorted by phaseId
 * then unit id. Used as the audit artifact written to data/state/.
 */
export function formatMarkdownReport(audit, milestoneId, generatedAt) {
  if (!audit || !Array.isArray(audit.rows)) audit = { rows: [], summary: summarizeAudit([]) };
  const ts = typeof generatedAt === "string" && generatedAt.length > 0
    ? generatedAt
    : new Date().toISOString();
  const id = typeof milestoneId === "string" ? milestoneId : "UNKNOWN";
  const s = audit.summary;
  const verdictBadge = s.verdict === "OK" ? "✅ OK" : "⚠ DRIFT";
  const lines = [
    `# Milestone Integrity Audit — ${id}`,
    ``,
    `**Generated:** ${ts}`,
    `**Verdict:** ${verdictBadge}`,
    ``,
    `## Summary`,
    `| Metric | Count |`,
    `| --- | --- |`,
    `| Total units | ${s.total} |`,
    `| OK (completed + deliverables present) | ${s.ok} |`,
    `| Deliverable-gap (completed in JSON, files missing) | ${s.deliverableGap} |`,
    `| Ghost-shipped (commit found, JSON not closed) | ${s.ghostShipped} |`,
    `| Anachronism (closed in JSON, no commit) | ${s.anachronism} |`,
    `| Scope-invalidated (spec premise doesn't match branch) | ${s.scopeInvalidated ?? 0} |`,
    `| Open (no commit, not completed) | ${s.open} |`,
    `| **Drift total** | **${s.drift}** |`,
    ``,
  ];
  const sorted = audit.rows.slice().sort((a, b) => {
    const pa = a?.phaseId ?? "";
    const pb = b?.phaseId ?? "";
    if (pa !== pb) return pa < pb ? -1 : 1;
    const ua = a?.unitId ?? "";
    const ub = b?.unitId ?? "";
    return ua < ub ? -1 : ua > ub ? 1 : 0;
  });
  if (sorted.length > 0) {
    lines.push(`## Per-unit detail`);
    lines.push(`| Phase | Unit | Verdict | Commit | Notes |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const r of sorted) {
      const sha = r.commitSha ? r.commitSha.slice(0, 9) : "—";
      const note = r.note ?? "";
      lines.push(`| ${r.phaseId ?? ""} | ${r.unitId} | ${r.verdict} | ${sha} | ${note} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// I/O LAYER =================================================================

function readGitLog(repoRoot, maxCount = 5000) {
  try {
    const out = execSync(`git log --oneline --all -n ${Number(maxCount)}`, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });
    return out;
  } catch {
    return "";
  }
}

export function auditMilestone(opts = {}) {
  const repoRoot = opts.repoRoot ?? DEFAULT_REPO_ROOT;
  const milestoneId = opts.milestoneId;
  if (!milestoneId) throw new Error("auditMilestone: milestoneId required");
  const milestonePath = opts.milestonePath
    ?? join(repoRoot, DEFAULT_MILESTONE_DIR, `${milestoneId}.json`);

  let milestone;
  try {
    milestone = JSON.parse(readFileSync(milestonePath, "utf8"));
  } catch (err) {
    throw new Error(`failed to read milestone JSON at ${milestonePath}: ${err.message}`);
  }
  const id = extractMilestoneId(milestone);
  if (id !== milestoneId) {
    throw new Error(`milestone id mismatch: file declares ${id}, expected ${milestoneId}`);
  }

  const gitLog = opts.gitLog ?? readGitLog(repoRoot, opts.maxCommits ?? 5000);
  const gitMap = parseGitLogForUnits(gitLog, milestoneId);

  const units = flattenUnits(milestone);
  const rows = [];
  for (const u of units) {
    const deliverables = Array.isArray(u.deliverables) ? u.deliverables : [];
    const checks = deliverables.map((d) => {
      const p = resolveDeliverablePath(repoRoot, d);
      return { path: p, exists: p ? existsSync(p) : null, raw: d?.path ?? "" };
    });
    const concrete = checks.filter((c) => c.path !== null);
    const allExist = concrete.length === 0
      ? true   // unit declares no concrete deliverables (e.g. milestone-JSON-only commits)
      : concrete.every((c) => c.exists === true);
    const verdict = classifyUnit(u, allExist, gitMap);
    const sha = gitMap.get(u.id) ?? null;
    let note = "";
    if (verdict === VERDICTS.DELIVERABLE_GAP) {
      const missing = concrete.filter((c) => !c.exists).map((c) => c.raw);
      note = `missing: ${missing.join(", ")}`;
    } else if (verdict === VERDICTS.GHOST_SHIPPED) {
      note = `commit ${sha?.slice(0, 9)} exists but status not set`;
    } else if (verdict === VERDICTS.ANACHRONISM) {
      note = `closed in JSON but no commit subject matches`;
    }
    rows.push({
      phaseId: u.phaseId,
      unitId: u.id,
      verdict,
      commitSha: sha,
      deliverables: checks,
      note,
    });
  }
  const summary = summarizeAudit(rows);
  return { milestoneId, rows, summary };
}

// MAIN ======================================================================

async function main() {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) args.set(a.slice(2, eq), a.slice(eq + 1));
      else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) {
        args.set(a.slice(2), process.argv[++i]);
      } else {
        args.set(a.slice(2), "true");
      }
    }
  }
  const milestoneId = args.get("milestone");
  if (!milestoneId) {
    console.error("usage: audit-milestone-integrity.mjs --milestone <ID> [--json] [--strict] [--write]");
    process.exit(2);
  }
  const repoRoot = args.get("repo") ?? DEFAULT_REPO_ROOT;
  const wantJson = args.get("json") === "true";
  const strict = args.get("strict") === "true";
  const write = args.get("write") === "true";

  const audit = auditMilestone({ repoRoot, milestoneId });
  if (wantJson) {
    process.stdout.write(JSON.stringify(audit, null, 2));
  } else {
    process.stdout.write(formatMarkdownReport(audit, milestoneId, new Date().toISOString()));
  }

  if (write) {
    const reportDir = join(repoRoot, DEFAULT_REPORT_DIR);
    mkdirSync(reportDir, { recursive: true });
    const stem = `milestone-audit-${milestoneId.toLowerCase()}`;
    writeFileSync(join(reportDir, `${stem}.json`), JSON.stringify(audit, null, 2), "utf8");
    writeFileSync(
      join(reportDir, `${stem}.md`),
      formatMarkdownReport(audit, milestoneId, new Date().toISOString()),
      "utf8",
    );
    process.stderr.write(`\nwrote ${join(reportDir, stem)}.{json,md}\n`);
  }

  if (strict && audit.summary.drift > 0) {
    process.stderr.write(`\nDRIFT detected (${audit.summary.drift} units) — exit 1 (strict mode)\n`);
    process.exit(1);
  }
}

const __isMain = (() => {
  try {
    const argv1 = process.argv?.[1];
    if (!argv1) return false;
    return import.meta.url === pathToFileURL(argv1).href;
  } catch {
    return false;
  }
})();

if (__isMain) {
  main().catch((e) => {
    console.error("FATAL", e);
    process.exit(1);
  });
}
