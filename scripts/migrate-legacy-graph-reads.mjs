#!/usr/bin/env node
/**
 * migrate-legacy-graph-reads.mjs — idempotent migrator
 *
 * The 546MB system-graph.json crosses V8's ~536MB max-string-length ceiling,
 * so every legacy `JSON.parse(fs.readFileSync(GRAPH, "utf8"))` callsite throws
 * `ERR_STRING_TOO_LONG`. Forty-two generators failed in the 2026-05-24 regen
 * run for this reason. The streaming reader at `scripts/lib/graph-io.mjs`
 * (`readGraphStreaming`) avoids the ceiling by walking the buffer.
 *
 * This script:
 *   1. Walks `scripts/` (non-recursive — sub-dirs are utilities).
 *   2. For each `.mjs` file containing the legacy read pattern:
 *      a. Skip files that already import `readGraphStreaming` (idempotent).
 *      b. Insert `import { readGraphStreaming } from "./lib/graph-io.mjs";`
 *         after the last existing `import …;` line.
 *      c. Replace every occurrence of
 *           `JSON.parse(fs.readFileSync(GRAPH, "utf8"))`
 *         with a size-gated ternary:
 *           `(fs.statSync(GRAPH).size > 256 * 1024 * 1024
 *             ? readGraphStreaming(GRAPH)
 *             : JSON.parse(fs.readFileSync(GRAPH, "utf8")))`.
 *   3. Reports per-file outcome (already-fixed / patched / skipped).
 *
 * The migrator is non-destructive: it only matches the EXACT legacy pattern.
 * Any custom callsite that uses a different variable name (not `GRAPH`) is
 * left alone — operator must hand-fix those.
 *
 * Usage:
 *   node scripts/migrate-legacy-graph-reads.mjs            # apply
 *   node scripts/migrate-legacy-graph-reads.mjs --dry-run  # report only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname);

const LEGACY_PATTERN = /JSON\.parse\(fs\.readFileSync\(GRAPH\s*,\s*["']utf8["']\)\)/g;
const IMPORT_LINE = `import { readGraphStreaming } from "./lib/graph-io.mjs";`;
const REPLACEMENT = `(fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")))`;

function patchFile(absPath) {
  const original = fs.readFileSync(absPath, "utf8");
  if (!LEGACY_PATTERN.test(original)) return { status: "no-pattern" };
  LEGACY_PATTERN.lastIndex = 0; // reset after .test

  if (original.includes("readGraphStreaming") && original.includes("./lib/graph-io.mjs")) {
    // Already partially migrated — just replace callsites, don't double-add import.
    const patched = original.replace(LEGACY_PATTERN, REPLACEMENT);
    if (patched === original) return { status: "already-migrated" };
    fs.writeFileSync(absPath, patched);
    return { status: "callsites-only", replaced: (original.match(LEGACY_PATTERN) || []).length };
  }

  // Inject import after the last `import …;` line.
  const lines = original.split(/\r?\n/);
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx < 0) return { status: "no-imports-found" };

  lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  let body = lines.join("\n");
  const replacedCount = (body.match(LEGACY_PATTERN) || []).length;
  body = body.replace(LEGACY_PATTERN, REPLACEMENT);

  fs.writeFileSync(absPath, body);
  return { status: "patched", replaced: replacedCount };
}

function main(argv) {
  const dryRun = argv.includes("--dry-run");
  const files = fs.readdirSync(SCRIPTS_DIR, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith(".mjs") && e.name !== path.basename(fileURLToPath(import.meta.url)))
    .map(e => path.join(SCRIPTS_DIR, e.name));

  const tallies = { patched: 0, "already-migrated": 0, "callsites-only": 0, "no-pattern": 0, "no-imports-found": 0 };

  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    if (!LEGACY_PATTERN.test(raw)) { tallies["no-pattern"]++; continue; }
    LEGACY_PATTERN.lastIndex = 0;

    if (dryRun) {
      const count = (raw.match(LEGACY_PATTERN) || []).length;
      console.log(`  WOULD patch ${path.basename(f)} (${count} callsite${count === 1 ? "" : "s"})`);
      tallies.patched++;
      continue;
    }
    const r = patchFile(f);
    tallies[r.status] = (tallies[r.status] || 0) + 1;
    if (r.status === "patched" || r.status === "callsites-only") {
      console.log(`  ${r.status === "patched" ? "✓" : "+"} ${path.basename(f)} (${r.replaced} callsite${r.replaced === 1 ? "" : "s"})`);
    }
  }

  console.log("");
  console.log(`[migrate-legacy-graph-reads] ${dryRun ? "DRY RUN" : "DONE"} — tallies:`, tallies);
  return 0;
}

const argv1 = process.argv[1] || "";
if (argv1.endsWith("migrate-legacy-graph-reads.mjs")) {
  process.exit(main(process.argv.slice(2)));
}
