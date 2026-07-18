#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-LITE — one-shot ingester. Walks `git log`
// over a configurable window, emits one episode per commit into the
// graphiti-lite episode store at state/shared/episodes.jsonl.
//
// Episode shape (per commit):
//   { source: "git-commit", source_id: <full-sha>, body: "<subject>",
//     valid_from: <commit-iso-time>, entities: [{name: <path>, type: "file"}],
//     metadata: { author, ref, slot? } }
//
// Idempotent: re-running skips commits whose SHA already has an episode
// (uses metadata.commit_sha for fast lookup, fallback to source_id match).
//
// Flags: --since "30 days ago" | --limit N | --dry-run | --json | --all
// --all forwards git log's --all flag for cross-branch capture (closes
// U-PSN-GRAPHITI-SEED-EXPANDED — episode count was capped at HEAD-branch
// commits in the --since window; --all reaches every ref).

import { spawnSync } from "node:child_process";
import { appendEpisode, buildEpisode, loadStore } from "./lib/episode-store.mjs";

const DEFAULT_SINCE = "30 days ago";
const DEFAULT_LIMIT = 500;
const DEFAULT_REPO = "H:/prism";

// Slot detection: commit subjects start with [SLOT] or [MAIN] markers per
// PRISM's chat-slot convention. Extract for metadata.
function extractSlot(subject) {
  if (typeof subject !== "string") return null;
  const m = subject.match(/^\[([A-Z][A-Za-z0-9-]*)\]\s+/);
  return m ? m[1] : null;
}

// Run git, return parsed commit records. Uses \x1f unit-separator for fields
// and relies on the blank line git emits between commits when --name-only is
// used with --pretty=format: (no trailing newline on format forces a blank
// line between commits but NOT at the very end — split("\n\n") handles both).
export function readGitLog({ since = DEFAULT_SINCE, limit = DEFAULT_LIMIT, repo = DEFAULT_REPO, all = false, noFiles = false, spawnImpl = spawnSync } = {}) {
  const SEP = "\x1f"; // ASCII unit separator — safe inside any git field value
  // RECSEP: ASCII record-separator between commits. `--pretty=format:` does
  // not add any separator between entries, so without --name-only (which
  // appends a file-list + blank line) we'd get every commit concatenated.
  // Append RECSEP to the format string + split on it in the parser.
  const RECSEP = "\x1e";
  const format = ["%H", "%aI", "%an", "%s"].join(SEP) + RECSEP;
  const args = [
    "-C", repo, "log",
    "--since", since,
    "--max-count", String(limit),
    `--pretty=format:${format}`,
  ];
  // --name-only walks file trees per commit (gives us file entities).
  // Skip when the caller knows the repo has corrupted tree objects that
  // would `fatal: unable to read tree` — episodes still seed with body +
  // sha + author, just no file-entity extraction. Insert before pretty.
  if (!noFiles) args.splice(args.length - 1, 0, "--name-only");
  // --all forwards every ref so the seed covers cross-branch commits
  // (peer slot branches `slot/<nato>`, work branches, integrator branches).
  // Insert AFTER "log" subcommand (index 3) — `git --all log` is rejected;
  // `git log --all` is the valid form.
  if (all) args.splice(3, 0, "--all");
  const result = spawnImpl("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    return { commits: [], error: result.stderr || `git exit ${result.status}` };
  }
  const commits = [];
  // Split on RECSEP (\x1e) — robust across both modes:
  //   with --name-only: "<fields>\n<file1>\n<file2>\x1e<fields>\n<file1>\x1e..."
  //   without:          "<fields>\x1e<fields>\x1e..."
  // (no-files mode would otherwise have no separator and all commits would
  // concatenate into one bogus record).
  for (const chunk of result.stdout.split("\x1e")) {
    const trimmed = chunk.trim();
    if (trimmed.length === 0) continue;
    const lines = trimmed.split("\n");
    const fields = lines[0].split(SEP);
    if (fields.length < 4) continue;
    const [sha, iso, author, subject] = fields;
    const files = lines.slice(1).map((l) => l.trim()).filter((l) => l.length > 0);
    commits.push({ sha, iso, author, subject, files });
  }
  return { commits, error: null };
}

export function commitToEpisode(commit) {
  return buildEpisode({
    source: "git-commit",
    source_id: commit.sha,
    body: commit.subject || "(no subject)",
    valid_from: commit.iso,
    entities: commit.files.slice(0, 30).map((f) => ({ name: f, type: "file" })),
    metadata: {
      commit_sha: commit.sha,
      author: commit.author,
      slot: extractSlot(commit.subject),
      file_count: commit.files.length,
    },
  });
}

export function seedFromGit({
  since = DEFAULT_SINCE,
  limit = DEFAULT_LIMIT,
  repo = DEFAULT_REPO,
  all = false,
  noFiles = false,
  storePath,
  dryRun = false,
  spawnImpl = spawnSync,
} = {}) {
  const { commits, error } = readGitLog({ since, limit, repo, all, noFiles, spawnImpl });
  if (error) return { ok: false, error, ingested: 0, skipped: 0, scanned: 0 };
  const store = loadStore({ storePath });
  const seen = new Set();
  for (const ep of store.episodes) {
    if (ep.source === "git-commit" && typeof ep.source_id === "string") seen.add(ep.source_id);
    if (ep.metadata && typeof ep.metadata.commit_sha === "string") seen.add(ep.metadata.commit_sha);
  }
  let ingested = 0;
  let skipped = 0;
  for (const commit of commits) {
    if (seen.has(commit.sha)) { skipped++; continue; }
    const ep = commitToEpisode(commit);
    if (!dryRun) appendEpisode(ep, { storePath });
    ingested++;
    seen.add(commit.sha);
  }
  return { ok: true, ingested, skipped, scanned: commits.length };
}

function parseArgs(argv) {
  const args = { since: DEFAULT_SINCE, limit: DEFAULT_LIMIT, dryRun: false, json: false, repo: DEFAULT_REPO, all: false, noFiles: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else if (a === "--all") args.all = true;
    else if (a === "--no-files") args.noFiles = true;
    else if (a === "--since") args.since = argv[++i] || DEFAULT_SINCE;
    else if (a === "--limit") args.limit = Number(argv[++i]) || DEFAULT_LIMIT;
    else if (a === "--repo") args.repo = argv[++i] || DEFAULT_REPO;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const start = Date.now();
  const result = seedFromGit(args);
  const elapsedMs = Date.now() - start;
  const summary = { ...result, elapsedMs, dryRun: args.dryRun };
  if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }
  if (!result.ok) {
    process.stderr.write(`[seed-episodes-from-git] FAILED: ${result.error}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `[seed-episodes-from-git] ${args.dryRun ? "DRY-RUN" : "APPLIED"} `
    + `scanned=${result.scanned} ingested=${result.ingested} `
    + `skipped-already-ingested=${result.skipped} elapsed=${elapsedMs}ms\n`,
  );
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) main();
