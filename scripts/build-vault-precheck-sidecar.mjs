#!/usr/bin/env node
// scripts/build-vault-precheck-sidecar.mjs
// SUBSTRATE-UTIL Gap 8 slice-a (2026-06-29, slot:sierra) -- generator for the obsidian
// vault-precheck body-excerpt sidecar. Walks SCAN_DIRS (single-sourced in vault-precheck-lib),
// extracts {relPath, bucket, basename, first-250-char excerpt} per file, and writes
// state/shared/vault-precheck-sidecar.json with a sourceMtimeMs freshness stamp (mirrors
// memory-index-sidecar). The hook consumes this for BODY recall; absent it, the hook falls back
// to a live basename-only walk (so this generator is purely additive).
//
// Run: node scripts/build-vault-precheck-sidecar.mjs   (add to a regen cadence later)

import { writeFileSync, renameSync } from "node:fs";
import {
  buildEntries, SIDECAR_PATH, SCHEMA_VERSION, SCAN_TARGETS, REPO_ROOT,
} from "./lib/vault-precheck-lib.mjs";

// All scanned buckets across both roots (knowledge/ dirs + state/shared/specs).
const ALL_BUCKETS = SCAN_TARGETS.flatMap((t) => t.buckets);

function main() {
  const { entries, youngestMtimeMs } = buildEntries();
  const doc = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    sourceDirs: ALL_BUCKETS,
    sourceMtimeMs: youngestMtimeMs,
    entryCount: entries.length,
    entries,
  };
  // Atomic write (temp + rename) so a concurrent hook read never sees a torn file.
  const tmp = `${SIDECAR_PATH}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(doc));
  // rename is atomic on the same volume so a concurrent hook read never sees a torn file.
  try {
    renameSync(tmp, SIDECAR_PATH);
  } catch {
    writeFileSync(SIDECAR_PATH, JSON.stringify(doc));
  }
  const withExcerpt = entries.filter((e) => e.excerpt).length;
  process.stdout.write(
    `vault-precheck-sidecar: ${entries.length} entries (${withExcerpt} with excerpt) across ${ALL_BUCKETS.length} dirs -> ${SIDECAR_PATH}\n`,
  );
}

main();
