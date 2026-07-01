#!/usr/bin/env node
// wire-graph-inject-hooks-to-daemon.mjs
// FLEET-SEARCH-DAEMON-MS0 / U-DAEMON-HOTHOOKS
//
// Patches the four hot per-tool graph-context injector hooks
//   pre-{read,write,grep,bash}-graph-inject.mjs
// to query the WARM search daemon FIRST (async searchViaDaemon -> node http,
// ZERO extra process spawn) and fall back to the in-process runMasterIndexSearch
// on any daemon miss. The async seam is correct here (curl-based searchViaDaemonSync
// would add a process spawn per tool call -> worsens the fork-storm; node-http does
// not). main() in all four hooks is already async, so awaiting is free.
//
// Why: measured in-process pre-read hook latency = ~3383ms avg AND flaky (returns
// 0 hits under memory pressure -- the 262MB sidecar is rejected at the 384MB hook
// heap, so it streams the 745MB graph or falls to the 59MB partial). A warm-daemon
// http hit is ~80ms with full coverage. ~40x faster + a correctness fix, and it
// shrinks the long-lived heavy hook processes that feed the fleet fork-storm.
//
// SAFE: every edit is exact-string + count-verified; node --check per file; any
// file that fails verification or --check is restored from its .bak. Idempotent
// (a file already containing searchViaDaemon is skipped). PRISM_INDEX_DAEMON_DISABLE=1
// reverts behavior fleet-wide at runtime (searchViaDaemon returns null -> in-process).
//
// Usage:
//   node scripts/wire-graph-inject-hooks-to-daemon.mjs            # apply
//   node scripts/wire-graph-inject-hooks-to-daemon.mjs --dry      # show, do not write
//   node scripts/wire-graph-inject-hooks-to-daemon.mjs --revert   # restore from .bak

import { readFileSync, writeFileSync, existsSync, unlinkSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const HOOK_DIR = "H:/prism/.claude/hooks";
const HOOKS = [
  "pre-read-graph-inject.mjs",
  "pre-write-graph-inject.mjs",
  "pre-grep-graph-inject.mjs",
  "pre-bash-graph-inject.mjs",
];

// Exact-string edits. Each MUST match exactly `count` times or the file is skipped+restored.
const EDITS = [
  {
    from: "  let runMasterIndexSearch;\n",
    to: "  let runMasterIndexSearch;\n  let searchViaDaemon;\n",
    count: 1,
  },
  {
    from: '({ runMasterIndexSearch } = await import("../../scripts/lib/master-index-search-lib.mjs"));',
    to: '({ runMasterIndexSearch, searchViaDaemon } = await import("../../scripts/lib/master-index-search-lib.mjs"));',
    count: 1,
  },
  {
    from: '    const result = runMasterIndexSearch(keys.join(" "), { topK });',
    to: [
      "    // FLEET-SEARCH-DAEMON-MS0: warm-daemon first (node http, no spawn, full",
      "    // coverage); fall back to in-process on any miss (down/disabled/timeout).",
      "    let result = null;",
      '    try { result = await searchViaDaemon(keys.join(" "), { topK, daemonTimeoutMs: 400 }); } catch { result = null; }',
      '    if (!result) result = runMasterIndexSearch(keys.join(" "), { topK });',
    ].join("\n"),
    count: 1,
  },
];

const MODE = process.argv.includes("--revert") ? "revert" : process.argv.includes("--dry") ? "dry" : "apply";
const occurrences = (hay, needle) => hay.split(needle).length - 1;

let ok = 0, skipped = 0, failed = 0;

for (const name of HOOKS) {
  const file = `${HOOK_DIR}/${name}`;
  const bak = `${file}.bak-daemonwire`;
  if (!existsSync(file)) { console.log(`  [MISS] ${name} -- not found`); failed++; continue; }

  if (MODE === "revert") {
    if (existsSync(bak)) { copyFileSync(bak, file); unlinkSync(bak); console.log(`  [REVERT] ${name} <- .bak`); ok++; }
    else console.log(`  [skip] ${name} -- no .bak to revert`);
    continue;
  }

  const orig = readFileSync(file, "utf8");
  if (orig.includes("searchViaDaemon")) { console.log(`  [skip] ${name} -- already wired`); skipped++; continue; }

  // verify every edit matches the expected count BEFORE touching anything
  let bad = false;
  for (const e of EDITS) {
    const n = occurrences(orig, e.from);
    if (n !== e.count) { console.log(`  [FAIL] ${name} -- edit match=${n} expected=${e.count} for: ${e.from.slice(0, 48)}...`); bad = true; }
  }
  if (bad) { failed++; continue; }

  let patched = orig;
  for (const e of EDITS) patched = patched.split(e.from).join(e.to);

  if (MODE === "dry") { console.log(`  [DRY] ${name} -- 3/3 edits would apply (+${patched.length - orig.length} bytes)`); ok++; continue; }

  copyFileSync(file, bak);
  writeFileSync(file, patched, "utf8");
  const chk = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (chk.status !== 0) {
    copyFileSync(bak, file); unlinkSync(bak);
    console.log(`  [FAIL] ${name} -- node --check failed, restored: ${(chk.stderr || "").slice(0, 80).replace(/\n/g, " ")}`);
    failed++; continue;
  }
  unlinkSync(bak);
  console.log(`  [OK] ${name} -- 3/3 edits + node --check clean`);
  ok++;
}

console.log(`\nmode=${MODE}  ok=${ok}  skipped=${skipped}  failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);
