#!/usr/bin/env node
/**
 * dev-tool-conflict-detector.mjs - META artifact from /forge-audit-v2 2026-05-17
 *
 * Re-runnable measurement of "two independent dev-tool scripts/hooks write the
 * same output path -> last-writer-wins clobber" - the same bug class as the
 * canonical generate-system-viz.mjs vs regen-viz.mjs regression.
 *
 * What it does:
 *   1. Walks H:/prism/scripts/*.mjs + H:/prism/.claude/hooks/*.mjs (top-level
 *      + bundles/ subdir).
 *   2. For each file, extracts every literal path it writes via
 *      writeFileSync / fs.writeFile / atomicWrite{Json,File} / .tmp-rename.
 *   3. Resolves path.join(SOME_DIR, "literal.json") when SOME_DIR is a
 *      module-level const literal - best-effort, no eval.
 *   4. Groups by output path and reports every path written by >=2 different
 *      scripts. Filters known append-only paths (chat-bus jsonl, telemetry
 *      ledgers) and helper-routed paths (chat-slots.mjs claims).
 *
 * Output:
 *   - JSON to stdout when --json
 *   - Human-readable summary otherwise
 *   - Exit code 0 if <= baseline conflicts, 1 if regression detected.
 *
 * Baseline (measured 2026-05-17 echo): 5 confirmed clobber-risk conflicts +
 * 1 known canonical (system-graph.json). Total = 6.
 *
 * Knobs:
 *   --json              machine-readable
 *   --baseline=N        override expected count (default 6)
 *   --include-known     do not filter the known system-graph.json case
 *   --paths-only        list just conflicting paths (one per line)
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SCRIPTS_DIR = path.join(ROOT, "scripts");
const HOOKS_DIR = path.join(ROOT, ".claude/hooks");
const HOOK_BUNDLES_DIR = path.join(HOOKS_DIR, "bundles");

const args = new Set(process.argv.slice(2));
const isJson = args.has("--json");
const includeKnown = args.has("--include-known");
const pathsOnly = args.has("--paths-only");
const baselineArg = process.argv.find((a) => a.startsWith("--baseline="));
const BASELINE = baselineArg ? parseInt(baselineArg.split("=")[1], 10) : 6;

const APPEND_ONLY = new Set([
  "state/shared/AGENT_CHAT.jsonl",
  "state/shared/async-hook-queue.jsonl",
  "mcp-server/data/state/hook-fire-counts.jsonl",
  "state/shared/synergy-history.jsonl",
  "state/shared/memory-size-history.jsonl",
  "state/shared/node-staleness-history.jsonl",
  "state/shared/fleet-memory-history.jsonl",
  "state/shared/fleet-task-health-history.jsonl",
  "state/shared/loop-state.jsonl",
]);

const HELPER_ROUTED = new Set([
  "state/shared/chat-slots.json",
]);

const KNOWN_CANONICAL = new Set([
  "state/shared/system-viz/system-graph.json",
]);

function walkMjs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__" || entry.name === "node_modules") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMjs(p, out);
    else if (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")) out.push(p);
  }
  return out;
}

function extractConstPaths(src) {
  // First pass: collect literal-only const assignments.
  // Second pass: resolve path.join(...) calls that reference earlier consts.
  // First-cut: capture inner literal-string fragments from path.join and
  // concatenate with "/". Earlier-const refs resolve via the same map.
  const consts = {};
  const reSimple = /^\s*const\s+(\w+)\s*=\s*(?:"([^"]+)"|'([^']+)');/gm;
  let m;
  while ((m = reSimple.exec(src))) {
    consts[m[1]] = (m[2] || m[3] || "").replace(/\\/g, "/");
  }
  const reJoin = /^\s*const\s+(\w+)\s*=\s*path\.join\(([^)]+)\);/gm;
  // Multiple passes to resolve chained refs (OUT_DIR -> OUT_FILE).
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    let mm;
    reJoin.lastIndex = 0;
    while ((mm = reJoin.exec(src))) {
      const name = mm[1];
      if (consts[name]) continue; // already resolved
      const argStr = mm[2];
      const args = argStr.split(",").map((a) => a.trim());
      const parts = [];
      let allResolved = true;
      for (const a of args) {
        const litM = a.match(/^["']([^"']+)["']$/);
        if (litM) { parts.push(litM[1]); continue; }
        if (consts[a]) { parts.push(consts[a]); continue; }
        // unresolved arg (e.g. ROOT before we know what it is, or fn call) - skip
        allResolved = false;
        break;
      }
      if (allResolved && parts.length) {
        consts[name] = parts.join("/").replace(/\\/g, "/").replace(/\/+/g, "/");
        changed = true;
      }
    }
    if (!changed) break;
  }
  return consts;
}

function extractWrites(src, consts) {
  const writes = new Set();
  const reLit = /(?:fs\.)?(?:writeFileSync|writeFile|appendFileSync|appendFile)\s*\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = reLit.exec(src))) writes.add(normalize(m[1]));
  const reConst = /(?:fs\.)?(?:writeFileSync|writeFile|appendFileSync|appendFile)\s*\(\s*([A-Z_][A-Z0-9_]*)/g;
  while ((m = reConst.exec(src))) {
    const resolved = consts[m[1]];
    if (resolved) writes.add(normalize(resolved));
  }
  const reAtomic = /atomicWrite(?:Json|File)(?:Sync)?\s*\(\s*(?:["']([^"']+)["']|([A-Z_][A-Z0-9_]*))/g;
  while ((m = reAtomic.exec(src))) {
    if (m[1]) writes.add(normalize(m[1]));
    else if (m[2] && consts[m[2]]) writes.add(normalize(consts[m[2]]));
  }
  return writes;
}

function normalize(p) {
  return p
    .replace(/\\/g, "/")
    .replace(/^H:\/prism\//i, "")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/");
}

function isAppendOnly(p) {
  for (const k of APPEND_ONLY) if (p === k || p.endsWith(k)) return true;
  return false;
}
function isHelperRouted(p) {
  for (const k of HELPER_ROUTED) if (p === k || p.endsWith(k)) return true;
  return false;
}
function isKnownCanonical(p) {
  for (const k of KNOWN_CANONICAL) if (p === k || p.endsWith(k)) return true;
  return false;
}

function main() {
  const files = [...walkMjs(SCRIPTS_DIR), ...walkMjs(HOOKS_DIR), ...walkMjs(HOOK_BUNDLES_DIR)];
  const writers = new Map();
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    const consts = extractConstPaths(src);
    const writes = extractWrites(src, consts);
    for (const w of writes) {
      if (!w || w.length < 4) continue;
      if (w.includes("${")) continue;
      if (w.endsWith(".tmp") || w.includes("/__tests__/")) continue;
      if (!writers.has(w)) writers.set(w, new Set());
      writers.get(w).add(path.relative(ROOT, f).replace(/\\/g, "/"));
    }
  }
  const conflicts = [];
  for (const [p, ws] of writers) {
    if (ws.size < 2) continue;
    if (isAppendOnly(p)) continue;
    if (isHelperRouted(p)) continue;
    if (!includeKnown && isKnownCanonical(p)) continue;
    conflicts.push({ path: p, writerCount: ws.size, writers: [...ws].sort() });
  }
  conflicts.sort((a, b) => b.writerCount - a.writerCount || a.path.localeCompare(b.path));

  const regression = conflicts.length > BASELINE;
  const result = {
    scanned: files.length,
    baseline: BASELINE,
    confirmedConflicts: conflicts.length,
    regression,
    conflicts,
    knownCanonical: includeKnown ? null : [...KNOWN_CANONICAL],
    appendOnlyFiltered: [...APPEND_ONLY],
    helperRoutedFiltered: [...HELPER_ROUTED],
  };

  if (isJson) {
    process.stdout.write(JSON.stringify(result, null, 2));
  } else if (pathsOnly) {
    for (const c of conflicts) process.stdout.write(c.path + "\n");
  } else {
    process.stdout.write(`# dev-tool conflict scan\n`);
    process.stdout.write(`scanned: ${files.length} files (scripts + hooks + bundles)\n`);
    process.stdout.write(`baseline: ${BASELINE} | found: ${conflicts.length} | regression: ${regression ? "YES" : "no"}\n\n`);
    for (const c of conflicts) {
      process.stdout.write(`[${c.writerCount}] ${c.path}\n`);
      for (const w of c.writers) process.stdout.write(`     ${w}\n`);
    }
  }
  process.exit(regression ? 1 : 0);
}

main();
