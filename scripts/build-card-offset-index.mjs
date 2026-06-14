#!/usr/bin/env node
/**
 * build-card-offset-index.mjs — emit the seekable node-card offset index
 * (node-cards.jsonl + node-card-offsets.json) from the ALREADY-BUILT
 * system-graph-index.json (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX,
 * slot:sierra).
 *
 * WHY a standalone in ADDITION to the build-graph-index integration: the
 * integration keeps the pair fresh on every (heavy, ~138s) regen-viz, but this
 * script BACKFILLS the index NOW from the 193MB sidecar already on disk — a
 * ~1-2s read, NOT a 644MB graph re-parse. It is also the validation surface:
 * run it, then `node-card <id>` and confirm `source: node-card-offsets`.
 *
 * The offset index inherits the GRAPH source stamps recorded in the sidecar's
 * head (sourceMtimeMs / sourceSizeBytes), so the reader's freshnessOf() compares
 * them to a stat of the live graph exactly like every other sidecar.
 *
 * MEMORY: parsing the 193MB sidecar needs ~0.6-1 GB heap; main() re-execs once
 * with --max-old-space-size when invoked without a heap flag (disable:
 * PRISM_BUILD_CARD_OFFSET_NO_REEXEC=1).
 *
 * CLI:  node scripts/build-card-offset-index.mjs [--index <path>] [--out-dir <dir>]
 * Exit: 0 ok · 1 fail (sidecar missing / parse fail / no-nodes).
 */

import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  buildCardOffsetIndex,
  writeCardOffsetIndex,
  offsetIndexPathsFor,
} from "./lib/node-card-offset-lib.mjs";

export const EXIT_OK = 0;
export const EXIT_FAIL = 1;

const DEFAULT_INDEX_PATH = "H:/prism/state/shared/system-viz/system-graph-index.json";
const HEAP_TARGET_MB = 4096;

/**
 * Read the system-graph-index sidecar, build + write the offset index pair.
 * Throws (fail-loud) on missing / unparseable / node-less sidecar.
 *
 * @param {object} [opts] — { indexPath, outDir }
 * @returns {object} summary
 */
export function generate({ indexPath = DEFAULT_INDEX_PATH, outDir } = {}) {
  if (!existsSync(indexPath)) {
    throw new Error(
      `system-graph-index.json not found: ${indexPath} — run build-graph-index.mjs (or regen-viz) first`,
    );
  }
  const t0 = Date.now();
  let sidecar;
  try {
    sidecar = JSON.parse(readFileSync(indexPath, "utf8"));
  } catch (e) {
    throw new Error(`sidecar parse failed: ${e.message}`);
  }
  if (!sidecar || !Array.isArray(sidecar.nodes)) {
    throw new Error("sidecar has no nodes[] array — is this a system-graph-index.json?");
  }

  const built = buildCardOffsetIndex(sidecar.nodes);
  if (built.count === 0) {
    throw new Error("0 cards built — refusing to write an empty offset index");
  }

  // co-locate beside the sidecar (or the override dir).
  const baseOut = outDir
    ? path.join(outDir, path.basename(indexPath))
    : indexPath;
  const { jsonlPath, offsetsPath } = offsetIndexPathsFor(baseOut);

  const res = writeCardOffsetIndex(built, {
    jsonlPath,
    offsetsPath,
    // Propagate the GRAPH stamps the sidecar recorded (NOT the sidecar's own
    // mtime) so freshness is measured against the live graph.
    meta: {
      sourceGraph: sidecar.sourceGraph || "system-graph.json",
      sourceMtimeMs: sidecar.sourceMtimeMs || 0,
      sourceSizeBytes: sidecar.sourceSizeBytes || 0,
    },
  });

  return {
    indexPath,
    jsonlPath,
    offsetsPath,
    count: res.count,
    skipped: built.skipped,
    dupSkipped: built.dupSkipped,
    jsonlBytes: res.jsonlBytes,
    offsetsBytes: res.offsetsBytes,
    elapsedMs: Date.now() - t0,
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--index") out.indexPath = argv[++i];
    else if (argv[i] === "--out-dir") out.outDir = argv[++i];
  }
  return out;
}

/** Re-exec self with a raised heap when invoked without one (193MB parse). */
function reExecWithHeapIfNeeded() {
  if (process.env.PRISM_BUILD_CARD_OFFSET_NO_REEXEC === "1") return;
  const hasHeapFlag = process.execArgv.some((a) => /^--max[-_]old[-_]space[-_]size=/.test(a));
  if (hasHeapFlag) return;
  const self = fileURLToPath(import.meta.url);
  const r = spawnSync(
    process.execPath,
    [`--max-old-space-size=${HEAP_TARGET_MB}`, self, ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, PRISM_BUILD_CARD_OFFSET_NO_REEXEC: "1" } },
  );
  if (r.error) {
    process.stderr.write(`[build-card-offset-index] ✗ heap re-exec failed: ${r.error.message}\n`);
    process.exit(EXIT_FAIL);
  }
  process.exit(r.status == null ? EXIT_FAIL : r.status);
}

function main() {
  reExecWithHeapIfNeeded();
  const args = parseArgs(process.argv.slice(2));
  try {
    const r = generate(args);
    process.stdout.write(
      `[build-card-offset-index] ✓ ${r.count} cards `
      + `(${r.skipped} skipped, ${r.dupSkipped} dup) · `
      + `jsonl ${(r.jsonlBytes / 1048576).toFixed(1)} MB · `
      + `offsets ${(r.offsetsBytes / 1048576).toFixed(1)} MB · `
      + `${(r.elapsedMs / 1000).toFixed(1)}s → ${r.offsetsPath}\n`,
    );
    process.exit(EXIT_OK);
  } catch (e) {
    process.stderr.write(`[build-card-offset-index] ✗ ${e.message}\n`);
    process.exit(EXIT_FAIL);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) {
  main();
}
