#!/usr/bin/env node
// doc-reflection-check.mjs — verifies that a commit touched the 4 doctrine
// surfaces (CLAUDE.md + MEMORY.md + wiki + Obsidian memory) per the
// feedback_reflect_all_changes_post_update standing rule. Pure read-only.
//
// Why: PRISM's doc-reflection rule says every change-set updates all 4
// surfaces in the same session. Today it's enforced piecemeal across
// 4 hooks. This script lets an operator (or future cron) verify a single
// commit honored the rule.
//
// U-DOC-REFLECT (AUDIT-SYNERGY-MS0, 2026-05-16).
//
// Usage:
//   node H:/prism/scripts/doc-reflection-check.mjs <commit-sha|HEAD|range>
//   node H:/prism/scripts/doc-reflection-check.mjs HEAD~3..HEAD     # range
//
// Output (text by default, --json for machine-readable):
//   commit: <sha>
//   subject: <one-line>
//   surfaces:
//     claudeMd: true  (paths: ...)
//     memoryMd: false
//     wiki: true      (paths: ...)
//     obsidian: false
//   score: 2/4

import { spawnSync } from "node:child_process";

const SURFACE_MATCHERS = [
  { key: "claudeMd", label: "CLAUDE.md", test: (p) => /(^|\/)CLAUDE\.md$/i.test(p) },
  { key: "memoryMd", label: "MEMORY.md", test: (p) => /(^|\/)MEMORY\.md$/i.test(p) },
  { key: "wiki",     label: "knowledge/wiki/**",   test: (p) => /(^|\/)knowledge\/wiki\//.test(p) },
  // Obsidian per-chat memory lives under C:/Users/<u>/.claude/projects/.../memory/
  // but git only tracks files under H:/prism. We accept the wiki memories/
  // dir as the in-repo proxy AND the project-folder memory dir (the latter
  // is captured if the operator runs the script from outside H:/prism with
  // --obsidian-glob, but the default just matches the in-repo path).
  { key: "obsidian", label: "knowledge/memories/** or wiki memories", test: (p) => /(^|\/)knowledge\/memories\//.test(p) || /memory\/[a-z0-9_-]+\.md$/i.test(p) },
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--cwd") args.cwd = argv[++i];
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.log(`doc-reflection-check — verify a commit touched all 4 doctrine surfaces

Usage:
  node H:/prism/scripts/doc-reflection-check.mjs <commit-sha|HEAD|HEAD~N..HEAD>

Options:
  --json        emit JSON instead of text
  --cwd <path>  run git from a different directory (default: H:/prism)
  -h, --help    this message

Exit codes:
  0  all 4 surfaces touched
  1  partial (1-3 surfaces)
  2  none touched
  3  git error / invalid ref
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args._.length === 0) {
  usage();
  process.exit(args.help ? 0 : 3);
}

const ref = args._[0];
const cwd = args.cwd || "H:/prism";

// Use --pretty=format with a sentinel so we can join later. For a single
// commit, git show; for a range, git log --name-only --pretty=format:'COMMIT %H %s'.
function runGit(refArg) {
  // Always treat as a range; single SHAs become `<sha>^..<sha>` so we get the
  // commit subject + changed files in one stream.
  const isRange = refArg.includes("..");
  const target = isRange ? refArg : `${refArg}^..${refArg}`;
  const res = spawnSync(
    "git",
    ["-C", cwd, "log", "--name-only", "--pretty=format:COMMIT %H | %s", target],
    { encoding: "utf8" }
  );
  if (res.status !== 0) {
    return { ok: false, err: res.stderr?.trim() || "git failed" };
  }
  return { ok: true, out: res.stdout };
}

function parseCommits(out) {
  const commits = [];
  let current = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith("COMMIT ")) {
      if (current) commits.push(current);
      const m = line.match(/^COMMIT ([0-9a-f]+) \| (.*)$/);
      if (!m) continue;
      current = { sha: m[1], subject: m[2], files: [] };
    } else if (line.trim() && current) {
      current.files.push(line.trim());
    }
  }
  if (current) commits.push(current);
  return commits;
}

function evaluate(files) {
  const surfaces = {};
  const matchedPaths = {};
  for (const s of SURFACE_MATCHERS) {
    const hits = files.filter(s.test);
    surfaces[s.key] = hits.length > 0;
    if (hits.length) matchedPaths[s.key] = hits;
  }
  const score = Object.values(surfaces).filter(Boolean).length;
  return { surfaces, matchedPaths, score, totalSurfaces: SURFACE_MATCHERS.length };
}

const git = runGit(ref);
if (!git.ok) {
  console.error(`doc-reflection-check: ${git.err}`);
  process.exit(3);
}

const commits = parseCommits(git.out);
if (commits.length === 0) {
  console.error(`doc-reflection-check: no commits in range ${ref}`);
  process.exit(3);
}

// Aggregate across the range — operator wants to know if the WORK as a whole
// touched all 4 surfaces, not whether each individual commit did.
const allFiles = [...new Set(commits.flatMap((c) => c.files))];
const result = evaluate(allFiles);

if (args.json) {
  const out = {
    ref,
    range: ref.includes("..") ? ref : `${ref}^..${ref}`,
    commits: commits.map((c) => ({ sha: c.sha, subject: c.subject, filesCount: c.files.length })),
    surfaces: result.surfaces,
    matchedPaths: result.matchedPaths,
    score: result.score,
    totalSurfaces: result.totalSurfaces,
    complete: result.score === result.totalSurfaces,
  };
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`doc-reflection-check ${ref}`);
  console.log(`  commits in range: ${commits.length}`);
  for (const c of commits.slice(0, 5)) {
    console.log(`    ${c.sha.slice(0, 9)} ${c.subject} (${c.files.length} files)`);
  }
  if (commits.length > 5) console.log(`    ... +${commits.length - 5} more`);
  console.log(`  surfaces touched:`);
  for (const s of SURFACE_MATCHERS) {
    const hit = result.surfaces[s.key];
    const paths = result.matchedPaths[s.key];
    const tag = hit ? "✓" : "✗";
    const detail = hit && paths ? ` (${paths.slice(0, 3).join(", ")}${paths.length > 3 ? "..." : ""})` : "";
    console.log(`    ${tag} ${s.label}${detail}`);
  }
  console.log(`  score: ${result.score}/${result.totalSurfaces} ${result.score === result.totalSurfaces ? "(complete)" : "(partial)"}`);
}

process.exit(result.score === result.totalSurfaces ? 0 : (result.score === 0 ? 2 : 1));
