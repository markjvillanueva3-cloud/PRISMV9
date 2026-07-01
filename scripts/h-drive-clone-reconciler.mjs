#!/usr/bin/env node
/**
 * h-drive-clone-reconciler.mjs -- reconcile the H: drive's ~84 prism-* directories
 * against git's registered worktrees, so the 2nd brain knows which clones are LIVE
 * slot worktrees vs stale milestone worktrees vs orphan stray clones -- and which
 * are cleanup candidates (H-DRIVE-VAULT-SYNERGY/U-5, slot:papa).
 *
 * U-1's coverage map deduped clones into a single count. This ENRICHES that: for
 * each prism-* dir it resolves git metadata (branch, last commit, age) and a kind:
 *   live-slot          -- registered worktree on a slot/<nato> branch (NEVER touch)
 *   registered-locked  -- a registered worktree marked locked (NEVER touch)
 *   registered-worktree-- a registered worktree on a work/* milestone branch
 *   orphan-clone       -- a prism-* dir NOT registered as a worktree (stray full clone)
 *
 * Cleanup candidates = orphan-clones only (operator-review, never auto-deleted; an
 * orphan may hold unpushed work). Emits ONE vault note + state/shared/H-DRIVE-CLONES
 * .{md,json} with a cleanup-candidates section.
 *
 *   node scripts/h-drive-clone-reconciler.mjs            # write note + map
 *   node scripts/h-drive-clone-reconciler.mjs --json     # report only
 *   node scripts/h-drive-clone-reconciler.mjs --dry-run  # resolve, no writes
 *
 * Env: PRISM_HDRIVE_CLONES_FROZEN_TIME=<iso> pins generatedAt for diff-stable output.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY  @unit U-5  slot:papa
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyTopLevel, normPath } from "./lib/h-drive-taxonomy.mjs";

const H_ROOT = "H:/";
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const VAULT_DIR = path.join(REPO_ROOT, "knowledge", "memories", "reference");
const MAP_MD = path.join(REPO_ROOT, "state", "shared", "H-DRIVE-CLONES.md");
const MAP_JSON = path.join(REPO_ROOT, "state", "shared", "H-DRIVE-CLONES.json");
const SCHEMA_VERSION = "1.0.0";
const GIT_TIMEOUT_MS = 8000; // per git call; fail-soft on timeout
const STALE_DAYS = 14;       // an orphan with no commit in this window is "stale"
const SECONDS_PER_DAY = 86400;

function nowIso() {
  return process.env.PRISM_HDRIVE_CLONES_FROZEN_TIME || new Date().toISOString();
}

/**
 * Parse `git worktree list --porcelain` into records (pure).
 * @param {string} txt porcelain output
 * @returns {Array<{path:string, head:string, branch:string|null, locked:boolean, detached:boolean}>}
 */
export function parseWorktreeList(txt) {
  const out = [];
  let cur = null;
  for (const raw of String(txt || "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith("worktree ")) {
      if (cur) out.push(cur);
      cur = { path: normPath(line.slice("worktree ".length)), head: "", branch: null, locked: false, detached: false };
    } else if (!cur) {
      continue;
    } else if (line.startsWith("HEAD ")) {
      cur.head = line.slice("HEAD ".length).slice(0, 10);
    } else if (line.startsWith("branch ")) {
      cur.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (line === "detached") {
      cur.detached = true;
    } else if (line === "locked" || line.startsWith("locked ")) {
      cur.locked = true;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Classify one prism-* clone (pure).
 * @param {{name:string, registered:boolean, branch:string|null, locked:boolean, lastCommitDays:number|null}} m
 * @returns {{kind:string, isCleanupCandidate:boolean, reason:string}}
 */
export function classifyClone(m) {
  const branch = m.branch || "";
  const isSlot = /^slot\//.test(branch) || /^prism-slot-/i.test(m.name);
  if (m.registered && isSlot) {
    return { kind: "live-slot", isCleanupCandidate: false, reason: "active slot worktree -- never touch" };
  }
  if (m.registered && m.locked) {
    return { kind: "registered-locked", isCleanupCandidate: false, reason: "git-locked worktree -- never touch" };
  }
  if (m.registered) {
    return { kind: "registered-worktree", isCleanupCandidate: false, reason: `registered worktree on ${branch || "(detached)"} -- prune via golf/git worktree remove if stale` };
  }
  // Not registered as a worktree = a stray full clone.
  const staleNote = m.lastCommitDays === null
    ? "no resolvable HEAD"
    : m.lastCommitDays >= STALE_DAYS
      ? `last commit ${m.lastCommitDays}d ago (stale)`
      : `last commit ${m.lastCommitDays}d ago`;
  return { kind: "orphan-clone", isCleanupCandidate: true, reason: `unregistered stray clone (${staleNote}) -- operator review before removal (may hold unpushed work)` };
}

/** Days since an ISO/epoch commit date, or null. (pure given `now`) */
export function daysSince(commitEpochSec, nowEpochSec) {
  if (!Number.isFinite(commitEpochSec) || !Number.isFinite(nowEpochSec)) return null;
  const d = Math.floor((nowEpochSec - commitEpochSec) / SECONDS_PER_DAY);
  return d >= 0 ? d : 0;
}

/** Build the consolidated clones vault note (pure). */
export function buildCloneNote(clones, generatedAt, summary) {
  const byKind = {};
  for (const c of clones) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  const kindLines = Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- \`${k}\`: ${v}`).join("\n");
  const cands = clones.filter((c) => c.isCleanupCandidate);
  const candLines = cands.length
    ? cands.map((c) => `- \`${c.name}\` -- ${c.reason}`).join("\n")
    : "- (none)";
  return `---
name: reference_hdrive_clones
description: "H-drive prism-* clone reconciliation -- ${clones.length} clones (${summary.live} live-slot, ${summary.registered} registered, ${summary.orphans} orphan), ${cands.length} cleanup candidates"
metadata:
  type: reference
  node_type: memory
---

# H-drive prism-* clones -- WORKTREE RECONCILIATION

> Auto-generated by \`scripts/h-drive-clone-reconciler.mjs\` (H-DRIVE-VAULT-SYNERGY/U-5, slot:papa). Re-run to refresh.
> generatedAt: ${generatedAt}  ·  ${clones.length} clones  ·  ${cands.length} cleanup candidates

## What this is
H:/ holds **${clones.length}** \`prism-*\` directories (slot worktrees + milestone worktrees + stray clones). This reconciles them against \`git worktree list\` so the brain knows which are LIVE vs prunable. The U-1 coverage map deduped these to a single count; this is the per-clone detail.

## Kinds
${kindLines}

## Cleanup candidates (operator review -- NEVER auto-deleted; an orphan may hold unpushed work)
${candLines}

## How to act
- live-slot / registered-locked: **never touch**.
- registered-worktree (stale milestone): \`git worktree remove <path>\` then \`git branch -d <branch>\` (golf hygiene domain).
- orphan-clone: verify no unpushed work (\`git -C <dir> log --oneline @{u}.. \`), then remove the directory.

Full map: \`state/shared/H-DRIVE-CLONES.md\`. Sister: [[reference_papa_hdrive_vault_synergy_2026_06_14]] · the U-1 coverage map (\`H-DRIVE-COVERAGE.md\`).
`;
}

/** Build the clones map (md + json), pure. */
export function buildCloneMap(clones, generatedAt) {
  const summary = {
    live: clones.filter((c) => c.kind === "live-slot").length,
    registered: clones.filter((c) => c.kind === "registered-worktree" || c.kind === "registered-locked").length,
    orphans: clones.filter((c) => c.kind === "orphan-clone").length,
    cleanupCandidates: clones.filter((c) => c.isCleanupCandidate).length,
  };
  const json = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    totalClones: clones.length,
    ...summary,
    clones: clones.map((c) => ({
      name: c.name, kind: c.kind, branch: c.branch, head: c.head,
      lastCommitDays: c.lastCommitDays, isCleanupCandidate: c.isCleanupCandidate, reason: c.reason,
    })),
  };
  const rows = clones
    .slice()
    .sort((a, b) => Number(b.isCleanupCandidate) - Number(a.isCleanupCandidate) || a.name.localeCompare(b.name))
    .map((c) => `| ${c.name} | ${c.kind} | ${c.branch || "(detached)"} | ${c.lastCommitDays === null ? "?" : c.lastCommitDays + "d"} | ${c.isCleanupCandidate ? "REVIEW" : "keep"} |`)
    .join("\n");
  const md = `# H-DRIVE prism-* CLONE RECONCILIATION

> Auto-generated by \`scripts/h-drive-clone-reconciler.mjs\` (H-DRIVE-VAULT-SYNERGY/U-5, slot:papa). generatedAt: ${generatedAt}
> ${clones.length} clones: ${summary.live} live-slot · ${summary.registered} registered · ${summary.orphans} orphan · **${summary.cleanupCandidates} cleanup candidates**.
> Reconciles the ~84 H:/prism-* dirs against \`git worktree list\`. Orphans are operator-review (may hold unpushed work) -- NEVER auto-deleted.

| clone | kind | branch | last-commit age | action |
|-------|------|--------|-----------------|--------|
${rows}

## Doctrine
Refresh: \`node scripts/h-drive-clone-reconciler.mjs\`. Pruning registered worktrees is golf's hygiene domain. Sister to the U-1 coverage map (\`H-DRIVE-COVERAGE.md\`). Spec: \`state/shared/specs/H-DRIVE-VAULT-SYNERGY-PLAN-2026-06-14.md\`.
`;
  return { md, json, summary };
}

// -- live orchestration -----------------------------------------------------

function git(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const jsonOnly = argv.includes("--json");
  const dryRun = argv.includes("--dry-run");
  const generatedAt = nowIso();
  const nowEpoch = Math.floor((process.env.PRISM_HDRIVE_CLONES_FROZEN_TIME ? Date.parse(process.env.PRISM_HDRIVE_CLONES_FROZEN_TIME) : Date.now()) / 1000);

  // One git call for the registered-worktree map.
  const porcelain = git(REPO_ROOT, ["worktree", "list", "--porcelain"]) || "";
  const registered = new Map();
  for (const w of parseWorktreeList(porcelain)) registered.set(normPath(w.path), w);

  // Enumerate H:/ prism-* dirs.
  let names = [];
  try {
    names = fs.readdirSync(H_ROOT, { withFileTypes: true })
      .filter((e) => { try { return e.isDirectory(); } catch { return false; } })
      .map((e) => e.name)
      .filter((n) => classifyTopLevel(n).class === "worktree-clone");
  } catch { /* drive unreadable -> empty */ }

  const clones = [];
  for (const name of names) {
    const abs = normPath(path.join(H_ROOT, name));
    const reg = registered.get(abs);
    let branch = reg ? reg.branch : null;
    let head = reg ? reg.head : null;
    let lastCommitDays = null;
    if (!reg) {
      // Orphan: interrogate directly (bounded, fail-soft).
      branch = git(abs, ["rev-parse", "--abbrev-ref", "HEAD"]);
      head = (git(abs, ["rev-parse", "--short=10", "HEAD"]) || "") || null;
      const epoch = git(abs, ["log", "-1", "--format=%ct"]);
      lastCommitDays = epoch ? daysSince(Number(epoch), nowEpoch) : null;
    } else {
      const epoch = git(abs, ["log", "-1", "--format=%ct"]);
      lastCommitDays = epoch ? daysSince(Number(epoch), nowEpoch) : null;
    }
    const cls = classifyClone({ name, registered: !!reg, branch, locked: reg ? reg.locked : false, lastCommitDays });
    clones.push({ name, branch, head, lastCommitDays, ...cls });
  }

  const { md, json, summary } = buildCloneMap(clones, generatedAt);

  if (jsonOnly) {
    process.stdout.write(JSON.stringify(json, null, 2) + "\n");
    return;
  }

  if (!dryRun) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    fs.writeFileSync(path.join(VAULT_DIR, "reference_hdrive_clones.md"), buildCloneNote(clones, generatedAt, summary), "utf8");
    fs.mkdirSync(path.dirname(MAP_MD), { recursive: true });
    fs.writeFileSync(MAP_MD, md, "utf8");
    fs.writeFileSync(MAP_JSON, JSON.stringify(json, null, 2), "utf8");
  }

  process.stdout.write(
    `[hdrive-clones] ${dryRun ? "(dry-run) " : ""}${clones.length} clones | ${summary.live} live-slot | ${summary.registered} registered | ${summary.orphans} orphan | ${summary.cleanupCandidates} cleanup candidates\n` +
    (dryRun ? "" : `[hdrive-clones] wrote note + map -> ${path.relative(REPO_ROOT, MAP_MD)}\n`),
  );
}

const __isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (__isCli) main();
