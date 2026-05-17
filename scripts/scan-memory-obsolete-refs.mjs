#!/usr/bin/env node
/**
 * scan-memory-obsolete-refs.mjs — META artifact for OBSOLESCENCE-CLEANUP-MS0/U-OBS-B3.
 *
 * Walks the memory namespace and flags references to engines/dispatchers/
 * hooks/scripts/skills that no longer exist in current PRISM. Output is
 * advisory ONLY — operator triages per file; never auto-deletes.
 *
 * USAGE:
 *   node scripts/scan-memory-obsolete-refs.mjs            # human report
 *   node scripts/scan-memory-obsolete-refs.mjs --json     # machine-readable
 *   node scripts/scan-memory-obsolete-refs.mjs --history  # tail prior runs
 *
 * EXIT: 0=clean, 1=warn (≥THRESHOLD_WARN_PCT stale), 2=critical (≥THRESHOLD_CRIT_PCT).
 *
 * Follow-up: register as `/loop --interval 7d` for MEMORY-AUDIT-WEEKLY.
 *
 * Doctrine: advisory ALWAYS. Sister to claude-md-drift.mjs.
 *
 * NOTE: pure filesystem reads only. No child_process.exec/spawn calls.
 */

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";

const MEMORY_DIR = process.env.PRISM_MEMORY_DIR ||
  "C:/Users/wompu/.claude/projects/H--prism/memory";
const REPO = process.env.PRISM_REPO || "H:/prism";
const HISTORY_FILE = join(REPO, "state/shared/memory-obsolete-refs-history.jsonl");

const THRESHOLD_WARN_PCT = 0.25;
const THRESHOLD_CRIT_PCT = 0.50;
const TOP_K = 10;
const SAMPLE_REFS_PER_FILE = 5;
const HISTORY_TAIL = 20;

const VERIFY_CACHE = new Map();
function memo(key, fn) {
  if (VERIFY_CACHE.has(key)) return VERIFY_CACHE.get(key);
  const v = fn();
  VERIFY_CACHE.set(key, v);
  return v;
}

function verifyEngine(name) {
  return memo(`engine:${name}`, () =>
    existsSync(join(REPO, "mcp-server/src/engines", `${name}.ts`)));
}
function verifyScript(name) {
  return memo(`script:${name}`, () => existsSync(join(REPO, name)));
}
function verifyHook(name) {
  return memo(`hook:${name}`, () => existsSync(join(REPO, name)));
}
function verifySkill(name) {
  return memo(`skill:${name}`, () => {
    for (const root of [
      "C:/Users/wompu/.claude/commands",
      join(REPO, ".claude/commands"),
    ]) {
      if (existsSync(join(root, `${name}.md`))) return true;
      if (name.includes(":")) {
        const [plugin, skill] = name.split(":");
        if (existsSync(join(root, plugin, `${skill}.md`))) return true;
      }
    }
    return false;
  });
}
function verifyDispatcher(name) {
  return memo(`dispatcher:${name}`, () => {
    const stem = name.replace(/^prism_/, "");
    const candidates = [
      join(REPO, "mcp-server/src/tools/dispatchers", `${stem}Dispatcher.ts`),
      join(REPO, "mcp-server/src/tools/dispatchers", `${stem.replace(/[_-]/g, "")}Dispatcher.ts`),
    ];
    return candidates.some(existsSync);
  });
}

const TOKEN_PATTERNS = [
  { kind: "engine",     rx: /\b([A-Z][A-Za-z0-9]+Engine)\b/g,          verifier: verifyEngine },
  { kind: "script",     rx: /\b(scripts?\/[\w./-]+\.m?js)\b/g,         verifier: verifyScript },
  { kind: "hook",       rx: /\b(\.claude\/hooks\/[\w./-]+\.m?js)\b/g,  verifier: verifyHook },
  { kind: "skill",      rx: /(?:^|[\s(`])\/([a-z][\w-]+)\b/g,          verifier: verifySkill },
  { kind: "dispatcher", rx: /\b(prism_[a-z_]+)\b/g,                    verifier: verifyDispatcher },
];

// Skip these — too common, mostly false-positive
const SKIP_TOKENS = new Set([
  "claude", "compact", "precompact", "handoff", "checkin", "loop", "goal", "rgs",
  "forge", "scrutinize", "system-viz", "master-index", "pick-unit", "pick-dev",
  "dedup", "envelope-sync", "close-out-audit", "fleet-reaper", "awareness-snapshot",
  "wiki-query", "memory-search", "deep-search", "remember",
  "init", "review", "schedule",
]);

function scanFile(absPath) {
  const content = readFileSync(absPath, "utf8");
  const found = [];
  const seen = new Set();
  for (const { kind, rx, verifier } of TOKEN_PATTERNS) {
    for (const match of content.matchAll(rx)) {
      const tok = match[1];
      if (!tok) continue;
      const cacheKey = `${kind}:${tok}`;
      if (seen.has(cacheKey)) continue;
      seen.add(cacheKey);
      if (kind === "skill" && SKIP_TOKENS.has(tok)) continue;
      if (!verifier(tok)) found.push({ kind, token: tok });
    }
  }
  return found;
}

function build() {
  const files = readdirSync(MEMORY_DIR)
    .filter((f) => f.endsWith(".md") && f !== "MEMORY.md");

  const perFile = [];
  let filesWithStale = 0;
  let totalStaleRefs = 0;

  for (const f of files) {
    try {
      const stale = scanFile(join(MEMORY_DIR, f));
      if (stale.length > 0) {
        filesWithStale++;
        totalStaleRefs += stale.length;
        perFile.push({ file: f, staleRefs: stale });
      }
    } catch { /* skip unreadable */ }
  }

  const pctStale = files.length > 0 ? filesWithStale / files.length : 0;
  let status = "fresh";
  if (pctStale >= THRESHOLD_CRIT_PCT) status = "critical";
  else if (pctStale >= THRESHOLD_WARN_PCT) status = "warn";

  return {
    generatedAt: new Date().toISOString(),
    memoryDir: MEMORY_DIR,
    filesScanned: files.length,
    filesWithStale,
    totalStaleRefs,
    pctStale: +pctStale.toFixed(3),
    status,
    perFile: perFile.sort((a, b) => b.staleRefs.length - a.staleRefs.length),
    exitCode: status === "critical" ? 2 : status === "warn" ? 1 : 0,
  };
}

function appendHistory(r) {
  try {
    mkdirSync(dirname(HISTORY_FILE), { recursive: true });
    const row = {
      at: r.generatedAt, files: r.filesScanned, stale: r.filesWithStale,
      refs: r.totalStaleRefs, pct: r.pctStale, status: r.status,
    };
    const tmp = HISTORY_FILE + "." + process.pid + ".tmp";
    let existing = "";
    try { existing = readFileSync(HISTORY_FILE, "utf8"); } catch {}
    writeFileSync(tmp, existing + JSON.stringify(row) + "\n");
    renameSync(tmp, HISTORY_FILE);
  } catch (e) {
    process.stderr.write(`[scan-memory-obsolete-refs] history append failed: ${e.message}\n`);
  }
}

function printHistory() {
  try {
    const raw = readFileSync(HISTORY_FILE, "utf8");
    console.log(JSON.stringify(
      raw.trim().split("\n").map((l) => JSON.parse(l)).slice(-HISTORY_TAIL),
      null, 2));
  } catch {
    console.log(JSON.stringify({ history: [], note: "no scans yet" }, null, 2));
  }
}

function printHuman(r) {
  console.log(`scan-memory-obsolete-refs @ ${r.generatedAt}`);
  console.log(`status=${r.status}  exit=${r.exitCode}`);
  console.log(`Files scanned: ${r.filesScanned}  with stale refs: ${r.filesWithStale} (${(r.pctStale * 100).toFixed(1)}%)`);
  console.log(`Total stale refs: ${r.totalStaleRefs}`);
  console.log("");
  console.log(`Top ${TOP_K} files by stale-ref count:`);
  for (const f of r.perFile.slice(0, TOP_K)) {
    console.log(`  ${f.staleRefs.length.toString().padStart(3)} stale  ${f.file}`);
    for (const s of f.staleRefs.slice(0, SAMPLE_REFS_PER_FILE)) {
      console.log(`           [${s.kind}] ${s.token}`);
    }
    if (f.staleRefs.length > SAMPLE_REFS_PER_FILE) {
      console.log(`           ... +${f.staleRefs.length - SAMPLE_REFS_PER_FILE} more`);
    }
  }
  console.log("");
  console.log("Doctrine: ADVISORY ONLY. Operator triages per file; never auto-deletes.");
}

const args = process.argv.slice(2);
if (args.includes("--history")) {
  printHistory();
} else {
  const r = build();
  appendHistory(r);
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else printHuman(r);
  process.exit(r.exitCode);
}
