#!/usr/bin/env node
/**
 * telemetry-backfill.mjs
 *
 * Synthesizes pipeline-telemetry records from git history. Solves the
 * cold-start problem for adaptive-thresholds.mjs — without this, the
 * first 10-30 milestones tune against a near-empty ledger and produce
 * meaningless deltas.
 *
 * Strategy:
 *   1. Walk last N commits (default 50)
 *   2. For each commit:
 *      - extract [SCOPE-MS#] tag → milestone
 *      - infer stage from file paths in `git show --name-only`
 *      - synth 1× tool_used + 1× outcome (verdict=pass since it landed)
 *   3. Append to ledger with `synthesized: true` so we never confuse
 *      synth records with real-time PostToolUse autofire records
 *
 * Ledger entries get this shape (minimal, one per commit):
 *   {
 *     ts: commit_iso,
 *     milestone: <SCOPE-MS#>,
 *     stage: <S1..S11.7>,
 *     event: outcome,
 *     payload: { verdict: pass, sha, files_count, synthesized: true },
 *   }
 *
 * Usage:
 *   node telemetry-backfill.mjs                # last 50 commits
 *   node telemetry-backfill.mjs --commits 200  # custom count
 *   node telemetry-backfill.mjs --since 2026-04-01
 *   node telemetry-backfill.mjs --dry-run      # preview, write nothing
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const TELEMETRY = `${PRISM}/state/shared/pipeline-telemetry.jsonl`;
const DEFAULT_COMMITS = 50;

function args() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function git(args, opts = {}) {
  const r = spawnSync("git", args, {
    encoding: "utf8", cwd: PRISM, timeout: 10_000, ...opts,
  });
  return r.status === 0 ? r.stdout : "";
}

function deriveStageFromFiles(files) {
  for (const f of files) {
    const p = f.replace(/\\/g, "/");
    if (/\/src\/engines\//.test(p)) return "S5";
    if (/\/src\/tools\/dispatchers\//.test(p)) return "S6";
    if (/\/\.claude\/hooks\//.test(p)) return "S7";
    if (/\/\.claude\/(commands|skills)\//.test(p)) return "S8";
    if (/\/knowledge\/wiki\//.test(p)) return "S11.5";
    if (/\/__tests__\//.test(p) || /\.test\.[mc]?[jt]s$/.test(p)) return "S11";
  }
  return "phase4_loop";
}

function deriveMilestoneFromSubject(subject) {
  const m = subject.match(/\[([A-Z][A-Z0-9-]+-MS\d+[A-Z]?)\]/);
  return m ? m[1] : null;
}

function readExistingShas() {
  if (!fs.existsSync(TELEMETRY)) return new Set();
  const shas = new Set();
  const lines = fs.readFileSync(TELEMETRY, "utf8").split("\n").filter(Boolean);
  for (const l of lines) {
    try {
      const r = JSON.parse(l);
      if (r.payload?.sha) shas.add(r.payload.sha);
    } catch { /* skip */ }
  }
  return shas;
}

const opts = args();
const commits = Number(opts.commits) || DEFAULT_COMMITS;

const logArgs = ["log", `--max-count=${commits}`, "--pretty=format:%H%x09%cI%x09%s"];
if (opts.since) logArgs.push(`--since=${opts.since}`);
const logOut = git(logArgs);
if (!logOut) {
  console.error("git log returned no output (not a repo? no commits?)");
  process.exit(2);
}

const existingShas = readExistingShas();
const records = [];
let dedup = 0;
let untagged = 0;

for (const line of logOut.split("\n").filter(Boolean)) {
  const [sha, iso, ...subjectParts] = line.split("\t");
  const subject = subjectParts.join("\t");
  if (existingShas.has(sha)) { dedup++; continue; }
  const milestone = deriveMilestoneFromSubject(subject);
  if (!milestone) { untagged++; continue; }
  const filesOut = git(["show", "--name-only", "--pretty=format:", sha]);
  const files = filesOut.split("\n").filter(Boolean);
  const stage = deriveStageFromFiles(files);
  records.push({
    ts: iso,
    session_id: "backfill",
    milestone,
    phase: null,
    unit: null,
    stage,
    event: "outcome",
    payload: {
      verdict: "pass",
      sha,
      subject: subject.slice(0, 120),
      files_count: files.length,
      synthesized: true,
      kind: "leverage-realized",
    },
  });
}

console.log(`TELEMETRY BACKFILL${opts["dry-run"] ? " (DRY RUN)" : ""}`);
console.log("====================");
console.log(`Commits scanned:  ${logOut.split("\n").length}`);
console.log(`Already-in-ledger: ${dedup}`);
console.log(`Untagged commits: ${untagged}`);
console.log(`New records:      ${records.length}`);

if (!opts["dry-run"] && records.length > 0) {
  fs.mkdirSync(TELEMETRY.replace(/\/[^/]+$/, ""), { recursive: true });
  const out = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.appendFileSync(TELEMETRY, out);
  console.log(`Appended to: ${TELEMETRY}`);
}

if (records.length > 0) {
  console.log("");
  console.log("Sample (first 5):");
  for (const r of records.slice(0, 5)) {
    console.log(`  ${r.ts.slice(0, 19)}  ${r.milestone}  ${r.stage}  ${r.payload.subject.slice(0, 60)}`);
  }
}
