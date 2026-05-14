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
import { writeFileSync, mkdirSync, renameSync, statSync, unlinkSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const ARCHIVE_DAYS = 90; // 3 months
const PROTECTED_BASE = "cad-fusion-live-ms0"; // primary base; main is checked secondarily
const SECONDARY_BASE = "main";
const SHORT_SHA_LEN = 9;
const SHELL_UNSAFE_RE = /[;&|`$()\n\r<>"']/;
const TODAY_ISO_DATE = new Date().toISOString().slice(0, 10);

function shellSafe(s) {
  if (typeof s !== "string") return false;
  return !SHELL_UNSAFE_RE.test(s);
}

function quoteForShell(s) {
  // POSIX single-quote: 'foo' → 'foo', any inner ' becomes '\''
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function atomicWrite(filePath, content) {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, filePath);
  } catch (e) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

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
  let st;
  try { st = statSync(wtPath); } catch { return { exists: false, dirty: null, fileCount: 0, stashCount: 0 }; }
  if (!st.isDirectory()) return { exists: false, dirty: null, fileCount: 0, stashCount: 0 };
  const r = spawnSync("git", ["-C", wtPath, "status", "--porcelain"], { encoding: "utf8" });
  if (r.error || r.status !== 0) return { exists: true, dirty: null, fileCount: 0, stashCount: 0 };
  const lines = r.stdout.split(/\r?\n/).filter(Boolean);
  // P1 fix: detect stashed WIP — git stash --porcelain doesn't exist, parse `git stash list`
  const sr = spawnSync("git", ["-C", wtPath, "stash", "list"], { encoding: "utf8" });
  const stashCount = (sr.status === 0 && sr.stdout) ? sr.stdout.split(/\r?\n/).filter(Boolean).length : 0;
  return { exists: true, dirty: lines.length > 0 || stashCount > 0, fileCount: lines.length, stashCount };
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

  // Main repo path: always KEEP (P1 fix — path.resolve handles Win backslash + forward slash)
  const normWt = path.resolve(wt.path);
  const normRepo = path.resolve(REPO);
  const wtCmp = process.platform === "win32" ? normWt.toLowerCase() : normWt;
  const repoCmp = process.platform === "win32" ? normRepo.toLowerCase() : normRepo;
  if (wtCmp === repoCmp) {
    result.recommendation = "KEEP";
    result.reason = "main repo";
    const d = worktreeDirty(wt.path);
    result.dirExists = d.exists;
    result.dirty = d.dirty;
    result.fileCount = d.fileCount;
    result.stashCount = d.stashCount;
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
  result.stashCount = d.stashCount;

  if (!result.dirExists) {
    result.recommendation = "PRUNE_CORRUPT";
    result.reason = "worktree directory missing on disk";
    return result;
  }

  if (result.mergedIntoPrimary || result.mergedIntoSecondary) {
    if (result.dirty || result.stashCount > 0) {
      result.recommendation = "NEEDS_REVIEW";
      const parts = [];
      if (result.fileCount > 0) parts.push(`${result.fileCount} uncommitted file(s)`);
      if (result.stashCount > 0) parts.push(`${result.stashCount} stashed entry(ies)`);
      result.reason = `branch merged but worktree has ${parts.join(" + ")}`;
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

function classifyBranch(b, worktreeBranchesShort) {
  const result = {
    ...b,
    ageDays: ageDays(b.lastCommitTime),
    inWorktree: worktreeBranchesShort.has(b.name),
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
  lines.push(`> Generated ${TODAY_ISO_DATE}. Lines with shell-unsafe characters in branch names or paths are SKIPPED — see "Skipped (unsafe)" below.`);
  lines.push(``);
  lines.push("```bash");
  const skipped = [];
  const repoArg = quoteForShell(report.repo);
  function safeLine(parts) {
    // parts: array of {raw: string, kind: 'path'|'ref'|'static'}
    for (const p of parts) {
      if (p.kind !== "static" && !shellSafe(p.raw)) {
        skipped.push(p.raw);
        return null;
      }
    }
    return parts.map(p => p.kind === "static" ? p.raw : quoteForShell(p.raw)).join("");
  }
  for (const w of report.worktrees.filter(x => x.recommendation === "PRUNE_CORRUPT")) {
    const line = safeLine([
      { kind: "static", raw: `git -C ${repoArg} worktree remove --force ` },
      { kind: "path",   raw: w.path },
      { kind: "static", raw: `  # PRUNE_CORRUPT` },
    ]);
    if (line) lines.push(line);
  }
  for (const w of report.worktrees.filter(x => x.recommendation === "REMOVE_WORKTREE")) {
    const line = safeLine([
      { kind: "static", raw: `git -C ${repoArg} worktree remove ` },
      { kind: "path",   raw: w.path },
      { kind: "static", raw: `  # merged` },
    ]);
    if (line) lines.push(line);
  }
  for (const b of report.branches.filter(x => x.recommendation === "ARCHIVE_TAG_AND_DELETE")) {
    const line = safeLine([
      { kind: "static", raw: `git -C ${repoArg} tag ` },
      { kind: "ref",    raw: `archive/${b.name}-${TODAY_ISO_DATE}` },
      { kind: "static", raw: ` ` },
      { kind: "ref",    raw: b.name },
      { kind: "static", raw: ` && git -C ${repoArg} branch -D ` },
      { kind: "ref",    raw: b.name },
    ]);
    if (line) lines.push(line);
  }
  lines.push(`git -C ${repoArg} worktree prune  # cleanup metadata`);
  lines.push("```");
  if (skipped.length) {
    lines.push(``);
    lines.push(`### Skipped (unsafe characters in ref or path)`);
    lines.push(``);
    for (const s of skipped) {
      lines.push(`- \`${s.replace(/`/g, "\\`")}\`  — verify manually, do not copy-paste`);
    }
  }
  return lines.join("\n");
}

// ------- main -------
const worktrees = listWorktrees();
// P0 fix: porcelain emits `refs/heads/work/foo`; for-each-ref emits `work/foo`.
// Strip prefix so .has() lookups match.
const worktreeBranchesShort = new Set(
  worktrees.map(w => w.branch ? w.branch.replace(/^refs\/heads\//, "") : null).filter(Boolean)
);
const branches = listLocalBranches();

const classifiedWt = worktrees.map(classifyWorktree);
const classifiedBr = branches.map(b => classifyBranch(b, worktreeBranchesShort));

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
atomicWrite(`${OUT_BASE}.json`, JSON.stringify(report, null, 2));
atomicWrite(`${OUT_BASE}.md`, renderMarkdown(report));
console.log(`Punchlist written:\n  ${OUT_BASE}.json\n  ${OUT_BASE}.md`);
console.log(`Worktrees: ${JSON.stringify(report.worktreeTally)}`);
console.log(`Branches:  ${JSON.stringify(report.branchTally)}`);
