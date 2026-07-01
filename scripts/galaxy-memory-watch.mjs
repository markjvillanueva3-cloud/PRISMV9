#!/usr/bin/env node
// scripts/galaxy-memory-watch.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-COMPACT.
//
//   node scripts/galaxy-memory-watch.mjs            # human-readable per-galaxy compaction watch
//   node scripts/galaxy-memory-watch.mjs --json     # machine-readable watch() result
//   node scripts/galaxy-memory-watch.mjs --history  # tail the watch history jsonl
//
// Cron/CI exit codes (mirrors memory-size-watch.mjs): 0 = clean · 1 = compaction candidate(s) found ·
// 2 = measurement error. ADVISORY — writes only its own MEMORY-WATCH.{md,json} sidecars; never rewrites
// a galaxy MEMORY.md.

import fs from "node:fs";
import { watch, DEFAULT_HISTORY_PATH } from "./lib/galaxy-memory-watch.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");

function tailHistory(n) {
  try {
    return fs.readFileSync(DEFAULT_HISTORY_PATH, "utf8").trim().split("\n").filter(Boolean).slice(-n).map((l) => JSON.parse(l));
  } catch { return []; }
}

try {
  if (args.includes("--history")) {
    const recs = tailHistory(20);
    if (json) console.log(JSON.stringify(recs, null, 2));
    else recs.forEach((r) => console.log(`${r.generatedAt}  ${r.candidateCount} cand  ${r.totalBytes}B  ${r.worst}`));
    process.exit(0);
  }

  const res = watch();
  if (json) {
    console.log(JSON.stringify(res, null, 2));
  } else if (res.disabled) {
    console.log("galaxy-memory-watch disabled (PRISM_GCF_COMPACT_DISABLE=1)");
  } else if (!res.written) {
    console.error(`galaxy-memory-watch: ${res.reason}${res.error ? " — " + res.error : ""}`);
  } else {
    const bar = res.worst === "critical" ? "🔴 CRITICAL" : res.worst === "warn" ? "🟠 WARN" : "🟢 OK";
    console.log(`${bar}  ${res.candidateCount}/${res.galaxyCount} galaxy brains flagged for compaction`);
    for (const c of res.candidates) console.log(`  • ${c.galaxy}  ${c.bytes}B  [${c.sizeStatus}]`);
    if (res.candidateCount > res.candidates.length) console.log(`  …and ${res.candidateCount - res.candidates.length} more — full list in ${res.jsonPath}`);
    if (res.candidateCount) console.log(`  → ${res.mdPath} (move detail to <galaxy>/MEMORY-ARCHIVE.md, keep pointers)`);
  }
  process.exit(res.exitCode ?? 0);
} catch (e) {
  // never throw out of the CLI; surface as a measurement error
  if (json) console.log(JSON.stringify({ ok: false, reason: "cli-error", error: String((e && e.message) || e) }, null, 2));
  else console.error(`galaxy-memory-watch CLI error: ${String((e && e.message) || e)}`);
  process.exit(2);
}
