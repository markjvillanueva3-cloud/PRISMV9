#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-SEED-ENTITY-FIX — repair tool
// Scans episodes.jsonl for source=git-commit episodes with entities.length===0,
// looks up changed files via `git show --name-only --pretty=format: <SHA>`,
// appends a tombstone for the broken episode + a new episode with entities populated.
//
// Idempotent: skips SHAs that already have a non-empty-entity episode.
// Flags: --dry-run | --json | --store <path>

import { spawnSync } from "node:child_process";
import {
  loadStore,
  appendEpisode,
  appendTombstone,
  buildEpisode,
} from "./lib/episode-store.mjs";

const DEFAULT_STORE = "H:/prism/state/shared/episodes.jsonl";
const DEFAULT_REPO  = "H:/prism";

function getFilesForSha(sha, repo = DEFAULT_REPO) {
  const result = spawnSync(
    "git",
    ["-C", repo, "show", "--name-only", "--pretty=format:", sha],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0) return { files: [], error: result.stderr || `git exit ${result.status}` };
  const files = result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return { files, error: null };
}

function parseArgs(argv) {
  const args = { dryRun: false, json: false, store: DEFAULT_STORE, repo: DEFAULT_REPO };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else if (a === "--store") args.store = argv[++i] || DEFAULT_STORE;
    else if (a === "--repo")  args.repo  = argv[++i] || DEFAULT_REPO;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = loadStore({ storePath: args.store });

  // Build set of SHAs that already have populated entities (skip these).
  const populated = new Set(
    store.episodes
      .filter((e) => e.source === "git-commit" && e.entities && e.entities.length > 0)
      .map((e) => e.source_id),
  );

  const targets = store.episodes.filter(
    (e) =>
      e.source === "git-commit" &&
      (!e.entities || e.entities.length === 0) &&
      !populated.has(e.source_id),
  );

  const results = [];
  for (const ep of targets) {
    const sha = ep.source_id;
    const { files, error } = getFilesForSha(sha, args.repo);
    if (error) {
      results.push({ sha, status: "error", error });
      continue;
    }
    if (!args.dryRun) {
      appendTombstone({ target_id: ep.id, reason: "repair-entity-fix" }, { storePath: args.store });
      const fixed = buildEpisode({
        source: "git-commit",
        source_id: sha,
        body: ep.body,
        valid_from: ep.valid_from,
        entities: files.slice(0, 30).map((f) => ({ name: f, type: "file" })),
        relationships: ep.relationships || [],
        metadata: {
          ...ep.metadata,
          file_count: files.length,
          repaired_from: ep.id,
        },
      });
      appendEpisode(fixed, { storePath: args.store });
    }
    results.push({ sha, status: args.dryRun ? "dry-run" : "repaired", fileCount: files.length });
  }

  const summary = {
    scanned: store.episodes.filter((e) => e.source === "git-commit").length,
    repaired: results.filter((r) => r.status === "repaired").length,
    dryRun: results.filter((r) => r.status === "dry-run").length,
    skipped: populated.size,
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    return;
  }
  const verb = args.dryRun ? "DRY-RUN" : "APPLIED";
  process.stdout.write(
    `[repair-episode-entities] ${verb} scanned=${summary.scanned} repaired=${summary.repaired} ` +
    `skipped-already-ok=${summary.skipped} errors=${summary.errors}\n`,
  );
  for (const r of summary.details) {
    process.stdout.write(`  ${r.status.padEnd(10)} sha=${r.sha.slice(0, 12)} files=${r.fileCount ?? "-"} ${r.error || ""}\n`);
  }
}

main();
