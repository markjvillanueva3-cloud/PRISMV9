#!/usr/bin/env node
// classify-git-tree.mjs — classify all worktrees + branches with a recommended action.
// Read-only. Emits state/shared/GIT-TREE-PUNCHLIST.json + .md.
// Usage:
//   node scripts/classify-git-tree.mjs [--repo H:/prism] [--out state/shared/GIT-TREE-PUNCHLIST]
//
// Classification rules:
//   worktrees:
//     - HEAD == 000000000... → PRUNE_CORRUPT (git worktree remove --force)
//     - branch missing       → PRUNE_CORRUPT
//     - branch fully merged into PROTECTED_BASE AND worktree dir clean → REMOVE_WORKTREE
//     - branch fully merged into PROTECTED_BASE AND worktree dirty     → NEEDS_REVIEW (uncommitted WIP)
//     - branch NOT merged AND last-commit >ARCHIVE_DAYS days old       → NEEDS_REVIEW (stale active work)
//     - else                                                            → KEEP
//   branches (refs/heads/ that aren't a current worktree branch):
//     - merged into PROTECTED_BASE AND age >ARCHIVE_DAYS                → ARCHIVE_TAG_AND_DELETE
//     - age >ARCHIVE_DAYS                                                → NEEDS_REVIEW
//     - else                                                             → KEEP

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const ARCHIVE_DAYS = 90; // 3 months
const PROTECTED_BASE = "cad-fusion-live-ms0"; // primary base; main is checked secondarily
const SECONDARY_BASE = "main";
const SHORT_SHA_LEN = 9;

const args = parseArgs(process.argv.slice(2));
const REPO = args.repo || "H:/prism";
const OUT_BASE = args.out || `${REPO}/state/shared/GIT-TREE-PUNCHLIST`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function git(...gitArgs) {
  const r = spawnSync("git", ["-C", REPO, ...gitArgs], { encoding: "utf8" });
  if (r.error) throw new Error(`git ${gitArgs[0]} failed: ${r.error.message}`);
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

function listWorktrees() {
  const r = git("worktree", "list", "--porcelain");
  if (r.status !== 0) throw new Error(`git worktree list failed: ${r.stderr}`);
  const blocks = r.stdout.split(/\r?\n\r?\n/).filter(Boolean);
  return blocks.map(b => {
    const lines = b.split(/\r?\n/);
    const get = (k) => {
      const ln = lines.find(l => l.startsWith(k + " "));
      return ln ? ln.slice(k.length + 1) : null;
    };
    const has = (k) => lines.some(l => l === k);
    return {
      path: get("worktree"),
      head: get("HEAD"),
      branch: get("branch"),
      detached: has("detached"),
      bare: has("bare"),
    };
  });
}

function branchExists(branchRef) {
  if (!branchRef) return false;
  const r = git("rev-parse", "--verify", "--quiet", branchRef);
  return r.status === 0;
}

function isMergedInto(branchRef, baseRef) {
  if (!branchExists(branchRef) || !branchExists(baseRef)) return false;
  // branch is merged if base contains its tip
  const r = git("merge-base", "--is-ancestor", branchRef, baseRef);
  return r.status === 0;
}

function lastCommitTime(branchRef) {
  const r = git("log", "-1", "--format=%ct", branchRef);
  if (r.status !== 0) return 0;
  return Number(r.stdout.trim()) * 1000 || 0;
}

function lastCommitSubject(branchRef) {
  const r = git("log", "-1", "--format=%s", branchRef);
  return r.status === 0 ? r.stdout.trim() : "";
}

function worktreeDirty(wtPath) {
  if (!existsSync(wtPath)) return { exists: false, dirty: null, fileCount: 0 };
  const r = spawnSync("git", ["-C", wtPath, "status", "--porcelain"], { encoding: "utf8" });
  if (r.error || r.status !== 0) return { exists: true, dirty: null, fileCount: 0 };
  const lines = r.stdout.split(/\r?\n/).filter(Boolean);
  return { exists: true, dirty: lines.length > 0, fileCount: lines.length };
}

function listLocalBranches() {
  const r = git("for-each-ref", "--format=%(refname:short)|%(committerdate:unix)|%(subject)", "refs/heads/");
  if (r.status !== 0) return [];
  return r.stdout.split(/\r?\n/).filter(Boolean).map(line => {
    const [name, ts, subject] = line.split("|");
    return {
      name,
      lastCommitTime: Number(ts) * 1000 || 0,
      lastCommitSubject: subject || "",
    };
  });
}

function ageDays(ts) {
  if (!ts) return Infinity;
  return Math.floor((Date.now() - ts) / 86400000);
}

function classifyWorktree(wt) {
  const result = {
    ...wt,
    headShort: wt.head ? wt.head.slice(0, SHORT_SHA_LEN) : null,
    branchShort: wt.branch ? wt.branch.replace("refs/heads/", "") : null,
    branchExists: false,
    mergedIntoPrimary: false,
    mergedIntoSecondary: false,
    lastCommitMs: 0,
    lastCommitSubject: "",
    ageDays: null,
    dirExists: false,
    dirty: null,
    fileCount: 0,
    recommendation: "KEEP",
    reason: "",
  };

  // Main repo path: always KEEP
  if (wt.path === REPO.replace(/\//g, path.sep) || wt.path === REPO) {
    result.recommendation = "KEEP";
    result.reason = "main repo";
    const d = worktreeDirty(wt.path);
    result.dirExists = d.exists;
    result.dirty = d.dirty;
    result.fileCount = d.fileCount;
    return result;
  }

  // Corrupt: zero SHA
  if (wt.head && /^0+$/.test(wt.head)) {
    result.recommendation = "PRUNE_CORRUPT";
    result.reason = "HEAD is all-zero SHA";
    return result;
  }

  // Branch missing
  if (wt.branch) {
    result.branchExists = branchExists(wt.branch);
    if (!result.branchExists) {
      result.recommendation = "PRUNE_CORRUPT";
      result.reason = `branch ${wt.branchShort} does not exist`;
      return result;
    }
    result.mergedIntoPrimary = isMergedInto(wt.branch, PROTECTED_BASE);
    result.mergedIntoSecondary = isMergedInto(wt.branch, `origin/${SECONDARY_BASE}`)
                                || isMergedInto(wt.branch, SECONDARY_BASE);
    result.lastCommitMs = lastCommitTime(wt.branch);
    result.lastCommitSubject = lastCommitSubject(wt.branch).slice(0, 120);
    result.ageDays = ageDays(result.lastCommitMs);
  }

  // Worktree dir state
  const d = worktreeDirty(wt.path);
  result.dirExists = d.exists;
  result.dirty = d.dirty;
  result.fileCount = d.fileCount;

  if (!result.dirExists) {
    result.recommendation = "PRUNE_CORRUPT";
    result.reason = "worktree directory missing on disk";
    return result;
  }

  if (result.mergedIntoPrimary || result.mergedIntoSecondary) {
    if (result.dirty) {
      result.recommendation = "NEEDS_REVIEW";
      result.reason = `branch merged but worktree has ${result.fileCount} uncommitted file(s)`;
    } else {
      result.recommendation = "REMOVE_WORKTREE";
      result.reason = `branch merged into ${result.mergedIntoPrimary ? PROTECTED_BASE : SECONDARY_BASE}, worktree clean`;
    }
    return result;
  }

  if (result.ageDays !== null && result.ageDays > ARCHIVE_DAYS) {
    result.recommendation = "NEEDS_REVIEW";
    result.reason = `unmerged, last commit ${result.ageDays}d ago — possibly abandoned`;
    return result;
  }

  result.recommendation = "KEEP";
  result.reason = `active unmerged work (last commit ${result.ageDays}d ago)`;
  return result;
}

function classifyBranch(b, worktreeBranches) {
  const result = {
    ...b,
    ageDays: ageDays(b.lastCommitTime),
    inWorktree: worktreeBranches.has(b.name),
    mergedIntoPrimary: false,
    mergedIntoSecondary: false,
    recommendation: "KEEP",
    reason: "",
  };

  if (result.inWorktree) {
    result.recommendation = "KEEP";
    result.reason = "branch is checked out in a worktree";
    return result;
  }

  if (b.name === PROTECTED_BASE || b.name === SECONDARY_BASE) {
    result.recommendation = "KEEP";
    result.reason = "protected base branch";
    return result;
  }

  result.mergedIntoPrimary = isMergedInto(b.name, PROTECTED_BASE);
  result.mergedIntoSecondary = isMergedInto(b.name, `origin/${SECONDARY_BASE}`)
                            || isMergedInto(b.name, SECONDARY_BASE);

  if ((result.mergedIntoPrimary || result.mergedIntoSecondary) && result.ageDays > ARCHIVE_DAYS) {
    result.recommendation = "ARCHIVE_TAG_AND_DELETE";
    result.reason = `merged + ${result.ageDays}d old`;
    return result;
  }
  if (result.ageDays > ARCHIVE_DAYS) {
    result.recommendation = "NEEDS_REVIEW";
    result.reason = `${result.ageDays}d old, not confirmed merged`;
    return result;
  }
  result.recommendation = "KEEP";
  result.reason = `active (${result.ageDays}d old)`;
  return result;
}

function tally(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Object.fromEntries(m);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Git Tree Punchlist`);
  lines.push(``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Repo: \`${report.repo}\``);
  lines.push(`Primary base: \`${PROTECTED_BASE}\`  Secondary: \`${SECONDARY_BASE}\``);
  lines.push(`Archive threshold: ${ARCHIVE_DAYS} days`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Surface | Total | KEEP | REMOVE | PRUNE_CORRUPT | ARCHIVE | NEEDS_REVIEW |`);
  lines.push(`|---|---:|---:|---:|---:|---:|---:|`);
  const wt = report.worktreeTally;
  const br = report.branchTally;
  lines.push(`| Worktrees | ${report.worktrees.length} | ${wt.KEEP ?? 0} | ${wt.REMOVE_WORKTREE ?? 0} | ${wt.PRUNE_CORRUPT ?? 0} | — | ${wt.NEEDS_REVIEW ?? 0} |`);
  lines.push(`| Branches | ${report.branches.length} | ${br.KEEP ?? 0} | — | — | ${br.ARCHIVE_TAG_AND_DELETE ?? 0} | ${br.NEEDS_REVIEW ?? 0} |`);
  lines.push(``);

  lines.push(`## Worktrees`);
  lines.push(``);
  lines.push(`| Action | Path | Branch | HEAD | Age | Dirty | Reason |`);
  lines.push(`|---|---|---|---|---:|---|---|`);
  const wtOrder = ["PRUNE_CORRUPT", "REMOVE_WORKTREE", "NEEDS_REVIEW", "KEEP"];
  const sorted = [...report.worktrees].sort((a, b) =>
    wtOrder.indexOf(a.recommendation) - wtOrder.indexOf(b.recommendation));
  for (const w of sorted) {
    const age = w.ageDays === null ? "—" : `${w.ageDays}d`;
    const dirty = w.dirty === null ? "?" : (w.dirty ? `dirty(${w.fileCount})` : "clean");
    lines.push(`| ${w.recommendation} | \`${w.path}\` | \`${w.branchShort ?? "(detached)"}\` | \`${w.headShort ?? "—"}\` | ${age} | ${dirty} | ${w.reason} |`);
  }
  lines.push(``);

  lines.push(`## Branches (not in worktrees)`);
  lines.push(``);
  lines.push(`| Action | Branch | Age | Merged-Primary | Merged-Secondary | Last subject |`);
  lines.push(`|---|---|---:|---|---|---|`);
  const brOrder = ["ARCHIVE_TAG_AND_DELETE", "NEEDS_REVIEW", "KEEP"];
  const sortedBr = [...report.branches].filter(b => !b.inWorktree).sort((a, b) =>
    brOrder.indexOf(a.recommendation) - brOrder.indexOf(b.recommendation));
  for (const b of sortedBr) {
    const age = b.ageDays === Infinity ? "—" : `${b.ageDays}d`;
    const mp = b.mergedIntoPrimary ? "✓" : "—";
    const ms = b.mergedIntoSecondary ? "✓" : "—";
    const subj = (b.lastCommitSubject || "").slice(0, 60);
    lines.push(`| ${b.recommendation} | \`${b.name}\` | ${age} | ${mp} | ${ms} | ${subj} |`);
  }
  lines.push(``);

  lines.push(`## Suggested commands (Phase 1+2)`);
  lines.push(``);
  lines.push("```bash");
  for (const w of report.worktrees.filter(x => x.recommendation === "PRUNE_CORRUPT")) {
    lines.push(`git -C ${report.repo} worktree remove --force "${w.path}"  # ${w.reason}`);
  }
  for (const w of report.worktrees.filter(x => x.recommendation === "REMOVE_WORKTREE")) {
    lines.push(`git -C ${report.repo} worktree remove "${w.path}"          # ${w.reason}`);
  }
  for (const b of report.branches.filter(x => x.recommendation === "ARCHIVE_TAG_AND_DELETE")) {
    lines.push(`git -C ${report.repo} tag archive/${b.name}-2026-05-13 ${b.name} && git -C ${report.repo} branch -D ${b.name}`);
  }
  lines.push(`git -C ${report.repo} worktree prune  # cleanup metadata`);
  lines.push("```");
  return lines.join("\n");
}

// ------- main -------
const worktrees = listWorktrees();
const worktreeBranches = new Set(worktrees.map(w => w.branch).filter(Boolean));
const branches = listLocalBranches();

const classifiedWt = worktrees.map(classifyWorktree);
const classifiedBr = branches.map(b => classifyBranch(b, worktreeBranches));

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repo: REPO,
  primaryBase: PROTECTED_BASE,
  secondaryBase: SECONDARY_BASE,
  archiveDays: ARCHIVE_DAYS,
  worktrees: classifiedWt,
  branches: classifiedBr,
  worktreeTally: tally(classifiedWt, "recommendation"),
  branchTally: tally(classifiedBr, "recommendation"),
};

const outDir = path.dirname(OUT_BASE);
mkdirSync(outDir, { recursive: true });
writeFileSync(`${OUT_BASE}.json`, JSON.stringify(report, null, 2));
writeFileSync(`${OUT_BASE}.md`, renderMarkdown(report));
console.log(`Punchlist written:\n  ${OUT_BASE}.json\n  ${OUT_BASE}.md`);
console.log(`Worktrees: ${JSON.stringify(report.worktreeTally)}`);
console.log(`Branches:  ${JSON.stringify(report.branchTally)}`);
