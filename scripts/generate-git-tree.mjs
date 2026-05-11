#!/usr/bin/env node
/**
 * generate-git-tree.mjs — plot the git commit DAG into the system-viz graph.
 *
 * Adds a new `Lgit` layer (inserted between L6 and L7 in the brain viewer's
 * layer stack, so it counts as an "arch" layer and its commit-parent edges
 * actually render):
 *
 *   Lgit  git.history                       — the root hub ("Git History")
 *         ├─ git.branch.<sanitized-name>     — one per local + remote branch ref (parent: git.history)
 *         └─ git.commit.<sha7>               — most-recent N commits across all refs (parent: tip-of-branch
 *                                              if it's a branch tip, else the hub). carries author/date/subject.
 *
 *   Edges:
 *     git.branch.<b>  --tip-->     git.commit.<sha7>     (the ref points here)
 *     git.commit.<c>  --parent-->  git.commit.<p>        (the DAG; multiple for merges)
 *     git.branch.<b>  --contains-->git.commit.<c>        (commits reachable & in-window for that branch's first-parent walk)
 *
 * This is the v1 "start plotting the git tree" increment. FOLLOW-UPS (not yet
 * done — would need to JSON.parse the 119 MB system-graph.json to know which
 * node ids exist):
 *   - link recent commits to the engine / dispatcher / hook / script nodes they
 *     touched (`git.commit.<c> --touched--> eng.<domain>.<name>` etc.) so the
 *     history dimension cross-links into the structure dimension.
 *   - colour commits by milestone scope ([SCOPE-MS#] prefix in the subject).
 *
 * Output: state/shared/system-viz/git-tree-augmentation.json (delta — idempotent;
 * merge-augmentations.mjs dedups by node id / edge key).
 *
 * Wired into scripts/regen-viz.mjs (FAST list) + scripts/merge-augmentations.mjs (loadOptional).
 * Manual run:  node scripts/generate-git-tree.mjs [--commits N] [--branches N]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const OUT = path.join(VIZ_DIR, "git-tree-augmentation.json");

// ── config (overridable via CLI) ─────────────────────────────────────────
const argv = process.argv.slice(2);
const argNum = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? parseInt(argv[i + 1], 10) || dflt : dflt; };
const MAX_COMMITS = argNum("--commits", 600);   // most-recent N commits across ALL refs
const MAX_BRANCHES = argNum("--branches", 120); // branch refs to plot (local + remote)
const US = "\x1f";                              // unit-separator delimiter (never in commit text)

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

// ── 1. branches (local heads + remote-tracking) ──────────────────────────
let branchLines = [];
try {
  branchLines = git(["for-each-ref", `--format=%(refname:short)${US}%(objectname:short)${US}%(committerdate:short)`, "--sort=-committerdate", "refs/heads", "refs/remotes"])
    .split("\n").map((l) => l.trim()).filter(Boolean);
} catch { branchLines = []; }
const branches = branchLines.slice(0, MAX_BRANCHES).map((l) => {
  const [name, tip, date] = l.split(US);
  return { name, tip, date };
}).filter((b) => b.name && b.tip && !b.name.endsWith("/HEAD"));
const tipShaSet = new Set(branches.map((b) => b.tip));
const branchByTip = new Map();
for (const b of branches) if (!branchByTip.has(b.tip)) branchByTip.set(b.tip, b);

function sanitizeBranchId(name) {
  return name.replace(/[^A-Za-z0-9._/-]/g, "-").replace(/\//g, "__").toLowerCase();
}

// ── 2. recent commits across all refs (the DAG) ──────────────────────────
// %h commit, %p abbreviated parent shas (space-separated, 0..n), %an author,
// %ad date(short), %s subject.
let commitRaw = [];
try {
  commitRaw = git(["log", "--all", `--pretty=format:%h${US}%p${US}%an${US}%ad${US}%s`, "--date=short", `-n${MAX_COMMITS}`])
    .split("\n").filter(Boolean);
} catch { commitRaw = []; }
const commits = commitRaw.map((line) => {
  const [sha, parents, author, date, subject] = line.split(US);
  return { sha, parents: (parents || "").trim() ? parents.trim().split(/\s+/) : [], author, date, subject: subject || "" };
});
const commitShaSet = new Set(commits.map((c) => c.sha));

// scope tag from the subject — "[SCOPE-MS#]" or "[SCOPE]/U-..." → SCOPE
function scopeOf(subject) {
  const m = subject.match(/^\[(?:MAIN]\s*\[)?([A-Z0-9][A-Z0-9-]*?)(?:-MS\d+)?\]/) || subject.match(/^\[([A-Z0-9][A-Z0-9-]*?)\]/);
  return m ? m[1] : null;
}

// ── 3. build the graph fragment ──────────────────────────────────────────
const COL_HUB = "#84cc16";      // lime — the git layer colour
const COL_BRANCH = "#a3e635";
const COL_COMMIT = "#65a30d";
const COL_TIP = "#bef264";

const newNodes = [];
const newEdges = [];
const pushNode = (n) => newNodes.push(n);
const pushEdge = (from, to, type, extra = {}) => newEdges.push({ from, to, type, status: "active", ...extra });

// root hub
const HUB = "git.history";
pushNode({
  id: HUB, layer: "Lgit", subgroup: "git_hub", label: `Git History (${commits.length} recent commits · ${branches.length} branches)`,
  status: "built", color: COL_HUB, size: 0.7, tier: 1, synthetic: true,
  branchCount: branches.length, commitCount: commits.length,
});

// current branch (resolved once)
let CURRENT_BRANCH = "";
try { CURRENT_BRANCH = git(["rev-parse", "--abbrev-ref", "HEAD"]).trim(); } catch { /* detached HEAD — leave blank */ }

// branch nodes
for (const b of branches) {
  const id = `git.branch.${sanitizeBranchId(b.name)}`;
  pushNode({
    id, layer: "Lgit", subgroup: "git_branch", parent: HUB, label: b.name,
    status: "built", color: COL_BRANCH, size: 0.32, tier: 2, synthetic: true,
    branch: b.name, tipSha: b.tip, lastCommitDate: b.date,
    isCurrent: b.name === CURRENT_BRANCH,
  });
  pushEdge(HUB, id, "contains", { intensity: 0.3 });
}

// commit nodes — parent is the owning branch tip if this commit IS a tip, else the hub
for (const c of commits) {
  const id = `git.commit.${c.sha}`;
  const isTip = tipShaSet.has(c.sha);
  const owningBranch = branchByTip.get(c.sha);
  const parentId = isTip && owningBranch ? `git.branch.${sanitizeBranchId(owningBranch.name)}` : HUB;
  const scope = scopeOf(c.subject);
  pushNode({
    id, layer: "Lgit", subgroup: isTip ? "git_tip" : "git_commit", parent: parentId,
    label: `${c.sha} ${c.subject.slice(0, 72)}`,
    status: "built", color: isTip ? COL_TIP : COL_COMMIT, size: isTip ? 0.22 : 0.12,
    tier: 3, synthetic: true,
    sha: c.sha, author: c.author, date: c.date, subject: c.subject,
    parentShas: c.parents, isMerge: c.parents.length > 1, isTip, scope: scope || undefined,
  });
}

// edges: branch --tip--> commit
for (const b of branches) {
  if (commitShaSet.has(b.tip)) pushEdge(`git.branch.${sanitizeBranchId(b.name)}`, `git.commit.${b.tip}`, "tip", { intensity: 0.6 });
}
// edges: commit --parent--> parent commit (the DAG; only when the parent is in-window)
let parentEdges = 0;
for (const c of commits) {
  for (const p of c.parents) {
    if (commitShaSet.has(p)) { pushEdge(`git.commit.${c.sha}`, `git.commit.${p}`, "parent", { intensity: c.parents.length > 1 ? 0.5 : 0.35, isMerge: c.parents.length > 1 }); parentEdges++; }
  }
}
// edges: branch --contains--> commit (first-parent walk from the tip, within the window)
let containsEdges = 0;
const commitBySha = new Map(commits.map((c) => [c.sha, c]));
for (const b of branches) {
  let cur = b.tip, hops = 0;
  while (cur && commitBySha.has(cur) && hops < 80) {
    pushEdge(`git.branch.${sanitizeBranchId(b.name)}`, `git.commit.${cur}`, "contains", { intensity: 0.12 });
    containsEdges++;
    cur = commitBySha.get(cur).parents[0];
    hops++;
  }
}

// dedup edges within the fragment (branch may walk into a commit twice; merge-augmentations also dedups)
{
  const seen = new Set();
  for (let i = newEdges.length - 1; i >= 0; i--) {
    const e = newEdges[i];
    const k = `${e.from}|${e.to}|${e.type}`;
    if (seen.has(k)) newEdges.splice(i, 1);
    else seen.add(k);
  }
}

const stats = {
  branches: branches.length,
  commits: commits.length,
  merges: commits.filter((c) => c.parents.length > 1).length,
  tips: branches.filter((b) => commitShaSet.has(b.tip)).length,
  parentEdges, containsEdges,
  scopesSeen: [...new Set(commits.map((c) => scopeOf(c.subject)).filter(Boolean))].slice(0, 30),
  currentBranch: CURRENT_BRANCH,
  windowDateRange: commits.length ? { newest: commits[0].date, oldest: commits[commits.length - 1].date } : null,
};

const out = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  layer: "Lgit",
  newNodes,
  newEdges,
  stats,
};

fs.mkdirSync(VIZ_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + "\n", "utf8");
console.log(`[git-tree] wrote git-tree-augmentation.json — ${newNodes.length} nodes (${branches.length} branches + ${commits.length} commits + 1 hub) · ${newEdges.length} edges (${parentEdges} parent, ${containsEdges} contains, ${stats.tips} tip)`);
console.log(`[git-tree]   window: ${stats.windowDateRange ? stats.windowDateRange.oldest + " → " + stats.windowDateRange.newest : "(empty)"} · merges=${stats.merges} · current=${CURRENT_BRANCH || "(detached)"}`);
