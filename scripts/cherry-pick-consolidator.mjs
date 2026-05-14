#!/usr/bin/env node
/**
 * cherry-pick-consolidator.mjs — safe, scoped landing planner for stranded commits.
 *
 * Built for WORKTREE-CONSOLIDATE-MS0 (P0 / U-FND02). The 2026-05-06 session landed
 * stranded worktrees by hand; this is the re-runnable, SAFE-BY-DEFAULT replacement.
 *
 * The core insight (from HANDOFF-claude-e7271397): a branch's raw `ahead` count
 * massively over-states the work to land — many "ahead" commits were already
 * cherry-picked / rebased onto base under different SHAs. `git cherry` is git's
 * built-in patch-id dedup: it marks each commit `-` (a patch-equivalent is
 * already on base) or `+` (genuinely not landed). We plan only the `+` set.
 *
 * SAFETY MODEL — this tool mutates git history ONLY under --execute, and even
 * then it REFUSES to:
 *   - operate when the resolved target branch IS the base branch,
 *   - operate when the target branch looks like an integration branch
 *     (main / cad-fusion-live-* / origin/*),
 *   - leave a half-finished cherry-pick (any conflict → `git cherry-pick --abort`
 *     + hard stop; never a partial landing).
 * Default mode is PLAN: read-only analysis, writes a reviewable plan file, mutates
 * nothing. The plan is what a human / the WORKTREE-CONSOLIDATE pause-gate reviews
 * before anyone runs --execute.
 *
 * Usage:
 *   node scripts/cherry-pick-consolidator.mjs --source work/ppgh05
 *   node scripts/cherry-pick-consolidator.mjs --source work/ppgh05 --base origin/main
 *   node scripts/cherry-pick-consolidator.mjs --source work/ppgh05 --json
 *   node scripts/cherry-pick-consolidator.mjs --source work/ppgh05 \
 *        --execute --target work/merge-staging-ms0 --target-worktree H:/prism-merge-staging
 *   node scripts/cherry-pick-consolidator.mjs --help
 *
 * Exit codes: 0 ok · 2 misuse / refused-unsafe · 1 ran but git reported a problem.
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const DEFAULT_BASE = "origin/cad-fusion-live-ms0";
// PRISM's .git is large and the box is often under multi-chat load — `git cherry`
// (patch-id dedup over hundreds of upstream commits) routinely needs >2 min.
// Default 5 min; raise via PRISM_GIT_TIMEOUT_MS when the box is heavily loaded.
const GIT_TIMEOUT_MS = Number(process.env.PRISM_GIT_TIMEOUT_MS) || 300_000;
// Branch-name shapes that must never be a cherry-pick TARGET — these are
// integration branches; landing into them is the human-gated final step.
// Expanded per scrutiny: was just main|master|origin|cad-fusion-live|integration —
// missed develop/release/prod/staging/HEAD which are also integration shapes.
const PROTECTED_TARGET_PATTERNS = [
  /^main$/i,
  /^master$/i,
  /^origin\//i,
  /^cad-fusion-live/i,
  /(^|\/)integration(\/|$)/i,
  /^develop$/i,
  /^release(\/|$)/i,
  /^prod(uction)?$/i,
  /^staging$/i,
  /^HEAD$/i,
  /^trunk$/i,
];

// ─── Arg parsing ────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const args = {
    source: null,
    base: DEFAULT_BASE,
    target: null,
    targetWorktree: null,
    execute: false,
    json: false,
    noWrite: false,
    help: false,
  };
  const errors = [];
  const valueFlags = {
    "--source": "source",
    "--base": "base",
    "--target": "target",
    "--target-worktree": "targetWorktree",
  };
  for (let i = 0; i < argv.length; i += 1) {
    let raw = argv[i];
    let inline = null;
    const eq = raw.indexOf("=");
    if (raw.startsWith("--") && eq !== -1) {
      inline = raw.slice(eq + 1);
      raw = raw.slice(0, eq);
    }
    if (raw === "--execute") args.execute = true;
    else if (raw === "--json") args.json = true;
    else if (raw === "--no-write") args.noWrite = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (valueFlags[raw]) {
      const v = inline ?? argv[++i];
      if (v == null || v.startsWith("--")) errors.push(`${raw} requires a value`);
      else args[valueFlags[raw]] = v;
    } else {
      errors.push(`unknown argument: ${raw}`);
    }
  }
  if (!args.help) {
    if (!args.source) errors.push("--source <branch> is required");
    if (args.execute && !args.target) errors.push("--execute requires --target <branch>");
    if (args.execute && !args.targetWorktree) {
      errors.push("--execute requires --target-worktree <path> (never cherry-pick in the main tree)");
    }
  }
  return { args, errors };
}

// ─── Git helpers ────────────────────────────────────────────────────────────
function git(cwd, gitArgs, { timeoutMs = GIT_TIMEOUT_MS } = {}) {
  return execFileSync("git", gitArgs, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

function gitSafe(cwd, gitArgs, opts) {
  try {
    return { ok: true, out: git(cwd, gitArgs, opts).trim() };
  } catch (err) {
    return { ok: false, out: "", error: (err?.stderr || err?.message || String(err)).toString().trim() };
  }
}

// ─── Pure logic (exported for tests) ────────────────────────────────────────
/**
 * Parse `git cherry -v <base> <source>` output.
 * Each line: "<sign> <sha> <subject>" where sign is "+" (not landed) or "-"
 * (patch-equivalent already on base).
 * @returns {{toLand: Array<{sha,subject}>, alreadyLanded: Array<{sha,subject}>}}
 */
export function parseGitCherry(cherryOut) {
  const toLand = [];
  const alreadyLanded = [];
  for (const line of (cherryOut || "").split(/\r?\n/)) {
    const m = line.match(/^([+-])\s+([0-9a-f]{7,40})\s?(.*)$/i);
    if (!m) continue;
    const entry = { sha: m[2], subject: (m[3] || "").trim() };
    if (m[1] === "+") toLand.push(entry);
    else alreadyLanded.push(entry);
  }
  return { toLand, alreadyLanded };
}

/** Extract the leading [SCOPE] / [SCOPE-MS#] tag from a commit subject. */
export function scopeOf(subject) {
  const m = (subject || "").match(/^\s*\[([A-Z0-9][A-Z0-9._/-]*)\]/i);
  return m ? m[1].toUpperCase() : "(unscoped)";
}

/**
 * Group commits by [SCOPE] tag, preserving commit order within each group.
 * `git cherry` lists oldest→newest, so the per-group arrays are already in
 * the order they must be cherry-picked.
 * @returns {Array<{scope, count, commits}>} sorted by count desc
 */
export function groupByScope(commits) {
  const groups = new Map();
  for (const c of commits) {
    const scope = scopeOf(c.subject);
    if (!groups.has(scope)) groups.set(scope, []);
    groups.get(scope).push(c);
  }
  return [...groups.entries()]
    .map(([scope, list]) => ({ scope, count: list.length, commits: list }))
    .sort((a, b) => b.count - a.count || a.scope.localeCompare(b.scope));
}

/**
 * Heuristic conflict-risk: commits touching files known to be multi-chat
 * contention hot-spots (dispatchers, schemas, settings) are higher risk.
 * Pure function over a {sha -> [files]} map.
 */
export function assessConflictRisk(commits, filesBySha) {
  const HOT = [
    /dispatchers?\//i,
    /ActionSchemas?\.ts$/i,
    /\.claude[\\/]settings/i,
    /roadmap-index\.json$/i,
    /package\.json$/i,
  ];
  let hotCommits = 0;
  const hotFiles = new Set();
  for (const c of commits) {
    const files = filesBySha[c.sha] || [];
    let isHot = false;
    for (const f of files) {
      if (HOT.some((re) => re.test(f))) {
        isHot = true;
        hotFiles.add(f);
      }
    }
    if (isHot) hotCommits += 1;
  }
  const ratio = commits.length ? hotCommits / commits.length : 0;
  let level = "low";
  if (ratio >= 0.5) level = "high";
  else if (ratio >= 0.15 || hotCommits > 0) level = "medium";
  return { level, hotCommits, totalCommits: commits.length, hotFiles: [...hotFiles].sort() };
}

/** Refuse unsafe cherry-pick targets. @returns {string|null} reason if unsafe. */
export function unsafeTargetReason(target, base, source) {
  // Trim — copy-paste of " main\n" or "main " must NOT bypass the regex check.
  const t = (target || "").trim();
  if (!t) return "no target branch";
  // Normalize BOTH sides of the equality check on the `origin/` prefix, not just
  // the base side — `--base cad-fusion-live-ms0 --target origin/cad-fusion-live-ms0`
  // is the same dangerous shape as the other direction.
  const stripOrigin = (s) => (s || "").replace(/^origin\//, "");
  if (stripOrigin(t) === stripOrigin(base)) return `target '${t}' IS the base branch`;
  if (source && stripOrigin(t) === stripOrigin(source)) return `target '${t}' IS the source branch — would be a no-op or self-overwrite`;
  for (const re of PROTECTED_TARGET_PATTERNS) {
    if (re.test(t)) return `target '${t}' matches a protected integration-branch pattern (${re})`;
  }
  return null;
}

// ─── Plan builder (read-only git) ───────────────────────────────────────────
function buildPlan(args) {
  const problems = [];

  // Validate refs exist.
  const srcCheck = gitSafe(REPO, ["rev-parse", "--verify", "--quiet", args.source + "^{commit}"]);
  if (!srcCheck.ok || !srcCheck.out) {
    return { ok: false, fatal: `source ref '${args.source}' not found`, problems };
  }
  const baseCheck = gitSafe(REPO, ["rev-parse", "--verify", "--quiet", args.base + "^{commit}"]);
  if (!baseCheck.ok || !baseCheck.out) {
    return { ok: false, fatal: `base ref '${args.base}' not found (fetch it first?)`, problems };
  }
  // Cross-history sanity: source + base must share a common ancestor. With 47
  // worktrees and a history strip on 2026-05-12, orphan/rebased branches are
  // real — `git cherry` on a cross-history pair emits a noisy, confusing list.
  const mb = gitSafe(REPO, ["merge-base", args.source, args.base]);
  if (!mb.ok || !mb.out) {
    return { ok: false, fatal: `'${args.source}' and '${args.base}' share no common ancestor — refusing to plan a cross-history cherry-pick`, problems };
  }

  // git cherry -v = built-in patch-id dedup.
  const cherry = gitSafe(REPO, ["cherry", "-v", args.base, args.source]);
  if (!cherry.ok) {
    return { ok: false, fatal: `git cherry failed: ${cherry.error}`, problems };
  }
  const { toLand, alreadyLanded } = parseGitCherry(cherry.out);

  // Per-commit changed-file list for conflict-risk scoring.
  const filesBySha = {};
  for (const c of toLand) {
    const f = gitSafe(REPO, ["show", "--no-color", "--name-only", "--format=", c.sha]);
    filesBySha[c.sha] = f.ok ? f.out.split(/\r?\n/).filter(Boolean) : [];
    if (!f.ok) problems.push(`could not list files for ${c.sha}: ${f.error}`);
  }

  const groups = groupByScope(toLand);
  const risk = assessConflictRisk(toLand, filesBySha);

  return {
    ok: true,
    problems,
    plan: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: args.source,
      base: args.base,
      aheadAfterPatchIdDedup: toLand.length,
      alreadyLandedByPatchId: alreadyLanded.length,
      rawAhead: toLand.length + alreadyLanded.length,
      conflictRisk: risk,
      scopeGroups: groups.map((g) => ({
        scope: g.scope,
        count: g.count,
        commits: g.commits.map((c) => ({
          sha: c.sha,
          subject: c.subject,
          files: (filesBySha[c.sha] || []).length,
        })),
      })),
      orderedShas: toLand.map((c) => c.sha),
    },
  };
}

// ─── Execute (gated, mutating) ──────────────────────────────────────────────
function executeCherryPick(plan, args) {
  const reason = unsafeTargetReason(args.target, args.base, args.source);
  if (reason) return { ok: false, refused: true, error: `REFUSED: ${reason}` };
  if (!existsSync(args.targetWorktree)) {
    return { ok: false, refused: true, error: `REFUSED: target worktree '${args.targetWorktree}' does not exist` };
  }
  // Confirm the target worktree is actually on the target branch.
  const cur = gitSafe(args.targetWorktree, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!cur.ok) return { ok: false, refused: true, error: `REFUSED: cannot read HEAD of target worktree: ${cur.error}` };
  if (cur.out !== args.target) {
    return {
      ok: false,
      refused: true,
      error: `REFUSED: target worktree is on '${cur.out}', not the requested target '${args.target}'`,
    };
  }
  // Refuse if the target worktree has ANY half-finished operation. `git rev-parse
  // --git-path X` emits a path RELATIVE to the worktree's current dir for linked
  // worktrees — `existsSync(rawPath)` silently resolves against the SCRIPT's cwd
  // and was always false in production. Anchor against the worktree path.
  for (const marker of ["CHERRY_PICK_HEAD", "MERGE_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"]) {
    const r = gitSafe(args.targetWorktree, ["rev-parse", "--git-path", marker]);
    if (r.ok && r.out) {
      const abs = resolve(args.targetWorktree, r.out);
      if (existsSync(abs)) {
        return { ok: false, refused: true, error: `REFUSED: target worktree has ${marker} in progress — resolve manually before --execute` };
      }
    }
  }
  // Refuse if the target worktree has uncommitted changes — cherry-pick onto a
  // dirty tree mangles state and the abort path can't clean it up.
  const status = gitSafe(args.targetWorktree, ["status", "--porcelain"]);
  if (status.ok && status.out.trim()) {
    const head = status.out.split(/\r?\n/).slice(0, 5).join("\n");
    return { ok: false, refused: true, error: `REFUSED: target worktree has uncommitted changes:\n${head}${status.out.split(/\r?\n/).length > 5 ? "\n  ..." : ""}` };
  }

  const applied = [];
  for (const sha of plan.orderedShas) {
    const res = gitSafe(args.targetWorktree, ["cherry-pick", "-x", sha], { timeoutMs: GIT_TIMEOUT_MS });
    if (!res.ok) {
      // Capture --abort outcome explicitly. In the shared multi-chat tree a peer
      // can hold index.lock and `--abort` itself can fail — silently swallowing
      // that violates "never a partial landing" in the worst possible way.
      const abort = gitSafe(args.targetWorktree, ["cherry-pick", "--abort"]);
      let halfFinished = false;
      const re = gitSafe(args.targetWorktree, ["rev-parse", "--git-path", "CHERRY_PICK_HEAD"]);
      if (re.ok && re.out) halfFinished = existsSync(resolve(args.targetWorktree, re.out));
      return {
        ok: false,
        halfFinished,
        applied,
        stoppedAt: sha,
        error: halfFinished
          ? `cherry-pick of ${sha} FAILED and --abort also FAILED — target worktree is in HALF-FINISHED state (${applied.length} applied before stop); manual recovery required`
          : `cherry-pick of ${sha} failed (likely conflict) — aborted cleanly, ${applied.length} applied before stop`,
        detail: res.error.slice(0, 400),
        abortDetail: abort.ok ? null : abort.error.slice(0, 400),
      };
    }
    applied.push(sha);
  }
  return { ok: true, applied };
}

// ─── Report rendering ───────────────────────────────────────────────────────
function renderMarkdown(plan, executeResult) {
  const L = [];
  L.push(`# Cherry-pick plan — ${plan.source} → (staging)`);
  L.push("");
  L.push(`**Generated:** ${plan.generatedAt}`);
  L.push(`**Source:** \`${plan.source}\` · **Base:** \`${plan.base}\``);
  L.push("");
  L.push(`- Raw ahead: **${plan.rawAhead}**`);
  L.push(`- Already landed (patch-id match, \`git cherry\` \`-\`): **${plan.alreadyLandedByPatchId}**`);
  L.push(`- **Genuinely to land: ${plan.aheadAfterPatchIdDedup}**`);
  L.push(`- Conflict risk: **${plan.conflictRisk.level}** (${plan.conflictRisk.hotCommits}/${plan.conflictRisk.totalCommits} commits touch contention hot-spots)`);
  if (plan.conflictRisk.hotFiles.length) {
    L.push(`  - hot files: ${plan.conflictRisk.hotFiles.slice(0, 8).map((f) => "`" + f + "`").join(", ")}${plan.conflictRisk.hotFiles.length > 8 ? " …" : ""}`);
  }
  L.push("");
  L.push("## Scope groups (cherry-pick order within each)");
  L.push("");
  for (const g of plan.scopeGroups) {
    L.push(`### \`[${g.scope}]\` — ${g.count} commit(s)`);
    for (const c of g.commits) {
      L.push(`- \`${c.sha.slice(0, 10)}\` ${c.subject} _(${c.files} file${c.files === 1 ? "" : "s"})_`);
    }
    L.push("");
  }
  if (executeResult) {
    L.push("## Execution result");
    L.push("");
    if (executeResult.ok) {
      L.push(`✅ Applied ${executeResult.applied.length} commit(s) cleanly.`);
    } else if (executeResult.refused) {
      L.push(`🛑 ${executeResult.error}`);
    } else {
      L.push(`❌ ${executeResult.error}`);
      if (executeResult.detail) L.push("```\n" + executeResult.detail + "\n```");
    }
    L.push("");
  } else {
    L.push("## Execution");
    L.push("");
    L.push("_DRY RUN — nothing was cherry-picked. Re-run with `--execute --target <branch> --target-worktree <path>` after this plan is reviewed._");
    L.push("");
  }
  return L.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "cherry-pick-consolidator — safe scoped landing planner for stranded commits.\n" +
      "  --source <branch>           branch with stranded commits (required)\n" +
      "  --base <ref>                base to dedup against (default origin/cad-fusion-live-ms0)\n" +
      "  --execute                   actually cherry-pick (requires --target + --target-worktree)\n" +
      "  --target <branch>           staging branch to land onto (never an integration branch)\n" +
      "  --target-worktree <path>    worktree checked out on --target\n" +
      "  --json | --no-write | --help\n",
    );
    process.exit(0);
  }
  if (errors.length) {
    for (const e of errors) process.stderr.write(`cherry-pick-consolidator: ${e}\n`);
    process.exit(2);
  }

  // Even in plan mode, validate the target safety up-front so an operator
  // never builds a plan against a target they cannot legally execute on.
  if (args.target) {
    const reason = unsafeTargetReason(args.target, args.base);
    if (reason) {
      process.stderr.write(`cherry-pick-consolidator: REFUSED — ${reason}\n`);
      process.exit(2);
    }
  }

  const built = buildPlan(args);
  if (!built.ok) {
    process.stderr.write(`cherry-pick-consolidator: ${built.fatal}\n`);
    process.exit(1);
  }
  const { plan, problems } = built;

  let executeResult = null;
  if (args.execute) {
    executeResult = executeCherryPick(plan, args);
  }

  if (!args.noWrite) {
    const outDir = join(REPO, "state", "shared", "cherry-pick-plans");
    mkdirSync(outDir, { recursive: true });
    const slug = plan.source.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    const stamp = plan.generatedAt.replace(/[:.]/g, "-");
    const jsonPath = join(outDir, `plan-${slug}-${stamp}.json`);
    const mdPath = join(outDir, `plan-${slug}-${stamp}.md`);
    writeFileSync(jsonPath, JSON.stringify({ ...plan, executeResult }, null, 2) + "\n");
    writeFileSync(mdPath, renderMarkdown(plan, executeResult));
    if (!args.json) {
      process.stdout.write(`Wrote ${mdPath}\n`);
      process.stdout.write(`Wrote ${jsonPath}\n`);
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ ...plan, problems, executeResult }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `\n${plan.source} → ${plan.base}: raw ${plan.rawAhead} ahead · ` +
      `${plan.alreadyLandedByPatchId} already landed (patch-id) · ` +
      `${plan.aheadAfterPatchIdDedup} to land · risk ${plan.conflictRisk.level}\n`,
    );
    for (const g of plan.scopeGroups) {
      process.stdout.write(`  [${g.scope}] ${g.count}\n`);
    }
    if (executeResult) {
      if (executeResult.ok) process.stdout.write(`\n✅ executed: ${executeResult.applied.length} applied\n`);
      else process.stdout.write(`\n${executeResult.refused ? "🛑" : "❌"} ${executeResult.error}\n`);
    } else {
      process.stdout.write("\n(dry run — use --execute to land)\n");
    }
  }

  const failed = problems.length > 0 || (executeResult && !executeResult.ok && !executeResult.refused);
  process.exit(failed ? 1 : 0);
}

// Only run main() when invoked directly (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
