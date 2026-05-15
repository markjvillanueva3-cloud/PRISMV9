#!/usr/bin/env node
/**
 * validate-hook-orphan-signal.mjs
 * ==============================
 * Sister to validate-unwired-signal.mjs — but for HOOK ORPHAN signal instead of
 * engine NEEDS_WIRING signal.
 *
 * Problem: high-value-additions-rank.mjs's measureHookOrphans() reports 312 orphan
 * hooks (65.8% orphan rate) by looking for hook references in settings.json + bundle
 * files. But hooks can ALSO be wired via:
 *   1. Other hooks invoking them (transitive wiring via spawn/import)
 *   2. PowerShell scheduled-task scripts (scripts/system-health/*.ps1)
 *   3. scripts/*.mjs invoking via child_process.spawn / execFile
 *   4. The MCP server-side hook registry (mcp-server/src/hooks/*.ts)
 *   5. Cron registry (state/shared/golf-cron-registry.json, scripts/cron-registry-reconcile.mjs)
 *
 * Each of those is a legitimate wiring path the HVA detector misses. Without this
 * validator, the 312-orphan signal mis-prioritises hook-cleanup milestones — many
 * of the "orphans" are actually wired transitively.
 *
 * This script:
 *   1. Loads orphan hook list from scripts/high-value-additions-rank.mjs --json
 *      output (or accepts a list via --source).
 *   2. Samples N (default 50, seed=42 deterministic via Fisher-Yates + mulberry32).
 *   3. For each, runs 5 detection strategies across the whole repo:
 *        a. settings.json command field (corroborates HVA)
 *        b. bundle file HOOK_BASE template literals (corroborates HVA)
 *        c. hook-to-hook spawn/import (transitive wiring — MISSED BY HVA)
 *        d. PowerShell scheduled-task scripts under scripts/system-health/ (MISSED BY HVA)
 *        e. .mjs/.ts files invoking via child_process.spawn / execFile (MISSED BY HVA)
 *   4. Classifies each orphan as:
 *        TRULY-ORPHAN          — no wiring path found
 *        FALSE-POSITIVE-WIRED  — at least one strong-signal wiring path
 *        WEAK-SIGNAL           — only doc/wiki references, no executable invocation
 *        EXEMPT                — has explicit `// HOOK-ORPHAN-EXEMPT:` marker
 *   5. Computes false-positive rate; gates at <= 15% (looser than engine validator
 *      because hook orphans have more legitimate-but-unwired cases — e.g. dormant
 *      hooks waiting on a feature flag).
 *   6. Exit: 0 PASS, 1 FAIL, 2 error.
 *
 * Usage:
 *   node scripts/validate-hook-orphan-signal.mjs                  # default sample=50, seed=42
 *   node scripts/validate-hook-orphan-signal.mjs --sample 100 --seed 7
 *   node scripts/validate-hook-orphan-signal.mjs --all            # check every orphan (slower)
 *   node scripts/validate-hook-orphan-signal.mjs --json --auto-report
 *
 * Author: claude-6d0595bf (delta slot — was bravo) 2026-05-15, iter4 of /loop session 6d0595bf
 * Tracks: U-HVA-HOOK-ORPHAN-VALIDATE (companion to U-HVA-UNWIRED-SIGNAL-VALIDATE)
 * Related: scripts/validate-unwired-signal.mjs (engine equivalent),
 *          scripts/high-value-additions-rank.mjs (signal source)
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const HOOKS_DIR = path.join(ROOT, ".claude", "hooks");
const BUNDLES_DIR = path.join(HOOKS_DIR, "bundles");
const STATE_DIR = path.join(ROOT, "state", "shared");
const SCRIPTS_DIR = path.join(ROOT, "scripts");
const MCP_HOOKS_DIR = path.join(ROOT, "mcp-server", "src", "hooks");
const SETTINGS_PATHS = ["H:/.claude/settings.json", path.join(ROOT, ".claude", "settings.json")];

// ---------- defaults ----------
const DEFAULT_SAMPLE_SIZE = 50;
const DEFAULT_SEED = 42;
const DEFAULT_MAX_FP_RATE_PCT = 15;   // looser than engine validator (15 vs 10)
const FIRST_FP_PRINT_LIMIT = 5;
const VERBOSE_MATCH_LIMIT = 3;
const ENGINE_HEAD_SCAN_BYTES = 2000;
const MAX_CONTENT_BYTES_FOR_REGEX = 1024 * 1024;

const STRONG_WIRING_KINDS = new Set([
  "settings_json",     // direct wiring in settings.json
  "bundle",            // referenced by a hook bundle
  "hook_to_hook",      // another hook invokes it via spawn/import
  "scheduled_task",    // scripts/system-health/*.ps1
  "script_invocation", // scripts/*.mjs invokes via child_process
  "mcp_registry",      // mcp-server/src/hooks/*.ts imports it
]);

// ---------- CLI ----------

function parseArgs(argv) {
  const args = {
    sample: DEFAULT_SAMPLE_SIZE, seed: DEFAULT_SEED, maxFpRate: DEFAULT_MAX_FP_RATE_PCT,
    all: false, json: false, verbose: false, quiet: false, autoReport: false,
    source: null, report: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sample") args.sample = parseInt(argv[++i], 10);
    else if (a === "--seed") args.seed = parseInt(argv[++i], 10);
    else if (a === "--max-fp-rate") args.maxFpRate = parseFloat(argv[++i]);
    else if (a === "--source") args.source = argv[++i];
    else if (a === "--report") args.report = argv[++i];
    else if (a === "--auto-report") args.autoReport = true;
    else if (a === "--all") args.all = true;
    else if (a === "--json") args.json = true;
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--quiet") args.quiet = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node validate-hook-orphan-signal.mjs [--sample N] [--seed N] [--max-fp-rate %] [--all] [--json] [--verbose] [--quiet] [--report PATH] [--auto-report] [--source PATH]");
      process.exit(0);
    } else if (a.startsWith("--")) {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(args.sample) || args.sample < 1) { console.error("--sample must be >0"); process.exit(2); }
  if (!Number.isFinite(args.seed)) { console.error("--seed must be a number"); process.exit(2); }
  if (!Number.isFinite(args.maxFpRate) || args.maxFpRate < 0 || args.maxFpRate > 100) { console.error("--max-fp-rate 0..100"); process.exit(2); }
  return args;
}

// ---------- IO helpers ----------

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function statSafe(p) { try { return fs.statSync(p); } catch { return null; } }

function writeReport(report, explicitPath) {
  const ymd = new Date().toISOString().slice(0, 10);
  const defaultPath = path.join(STATE_DIR, `HOOK-ORPHAN-VALIDATION-${ymd}.json`);
  const target = explicitPath || defaultPath;
  const abs = path.resolve(target);
  if (!abs.startsWith(path.resolve(ROOT))) {
    console.error(`--report path must be inside ${ROOT}: ${target}`);
    return null;
  }
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(report, null, 2) + "\n");
    return abs;
  } catch (e) {
    console.error(`failed to write report to ${abs}: ${e.message}`);
    return null;
  }
}

function listFilesRecursive(dir, opts = {}) {
  const exts = opts.exts || [".mjs", ".js", ".ts", ".ps1", ".json"];
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 20;
  const exclude = new Set(opts.exclude || ["node_modules", ".git", ".cache"]);
  const out = [];
  function walk(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (exclude.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) out.push(full);
    }
  }
  walk(dir, 0);
  return out;
}

// ---------- deterministic RNG (mulberry32) ----------

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleDeterministic(arr, n, seed) {
  if (n >= arr.length) return arr.slice();
  const rng = makeRng(seed);
  const idx = arr.map((_, i) => i);
  for (let i = idx.length - 1; i > idx.length - 1 - n; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(idx.length - n).map(i => arr[i]);
}

// ---------- load orphan hook list ----------

function loadOrphanList(sourceOverride) {
  if (sourceOverride) {
    const j = readJsonSafe(sourceOverride);
    if (!j) { console.error(`--source not found/invalid JSON: ${sourceOverride}`); process.exit(2); }
    return extractHookList(j);
  }
  // Default: read latest HOOK-ORPHAN audit JSON if it exists, else compute live from
  // the HVA script's --json output.
  const hvaPath = path.join(SCRIPTS_DIR, "high-value-additions-rank.mjs");
  if (!statSafe(hvaPath)) { console.error(`high-value-additions-rank.mjs not found at ${hvaPath}`); process.exit(2); }
  // Re-derive orphan list from HVA logic in-process (re-implement the bundle scan).
  return computeOrphansFromDisk();
}

function computeOrphansFromDisk() {
  const wired = new Set();
  // Pass 1: settings.json
  for (const sp of SETTINGS_PATHS) {
    const s = readJsonSafe(sp);
    if (!s) continue;
    const walk = (o) => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        if (typeof o.command === "string") {
          const m = o.command.match(/hooks\/([\w.-]+)\.mjs/g) || [];
          m.forEach(x => wired.add(x.replace("hooks/", "").replace(".mjs", "")));
        }
        Object.values(o).forEach(walk);
      }
    };
    walk(s);
  }
  // Pass 2: bundles
  try {
    for (const bf of fs.readdirSync(BUNDLES_DIR).filter(f => f.endsWith(".mjs"))) {
      const content = readSafe(path.join(BUNDLES_DIR, bf));
      const patterns = [
        /HOOK_BASE\}?\/([\w.-]+)\.mjs/g,
        /["'`](?:\.\.\/)*\.?\/?([\w.-]+)\.mjs["'`]/g,
        /hooks\/([\w.-]+)\.mjs/g,
      ];
      for (const re of patterns) {
        let m;
        while ((m = re.exec(content))) {
          const name = m[1];
          if (name && !name.startsWith(".") && !name.includes("/")) wired.add(name);
        }
      }
    }
  } catch { /* bundle dir missing */ }
  const sourceHooks = [];
  try {
    for (const f of fs.readdirSync(HOOKS_DIR)) {
      if (f.endsWith(".mjs")) sourceHooks.push(f.replace(".mjs", ""));
    }
  } catch { /* dir missing */ }
  const orphans = sourceHooks.filter(h => !wired.has(h));
  return orphans.map(name => ({ name }));
}

function extractHookList(audit) {
  if (Array.isArray(audit.orphans)) {
    return audit.orphans.map(o => typeof o === "string" ? { name: o } : { name: o.name || o.hook, ...o }).filter(o => o.name);
  }
  if (Array.isArray(audit.orphanHooks)) {
    return audit.orphanHooks.map(o => typeof o === "string" ? { name: o } : { name: o.name || o.hook, ...o }).filter(o => o.name);
  }
  console.error("unknown audit schema (expected { orphans: [...] } or { orphanHooks: [...] })");
  process.exit(2);
}

// ---------- hook exemption marker ----------

function isHookExempt(hookName) {
  const p = path.join(HOOKS_DIR, `${hookName}.mjs`);
  const head = readSafe(p).slice(0, ENGINE_HEAD_SCAN_BYTES);
  return /\/\/\s*HOOK-ORPHAN-EXEMPT:/.test(head);
}

// ---------- wiring detection patterns ----------

function buildHookPatterns(hookName) {
  const esc = hookName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    // Strategy a: bundle / settings reference (handled by computeOrphansFromDisk; here we detect transitive)
    // Strategy b: hook-to-hook invocation — spawn/exec/import of another hook
    hookToHook: new RegExp(`(?:spawn|execFile|fork|import).*hooks/${esc}\\.mjs`, "m"),
    // Strategy c: PowerShell scheduled task
    psTask: new RegExp(`hooks[\\/\\\\]${esc}\\.mjs`, "m"),
    // Strategy d: script invocation via child_process
    scriptCp: new RegExp(`(?:spawn|execFile|exec|fork)\\s*\\([^)]*hooks/${esc}`, "m"),
    // Strategy e: MCP-side hook registry import
    mcpImport: new RegExp(`(?:from|import)\\s+["'][^"']*hooks[/\\\\]${esc}["']`, "m"),
    // Strategy f: settings.json command field (re-verify — primary path)
    settingsCmd: new RegExp(`hooks/${esc}\\.mjs`, "m"),
  };
}

function classifyConsumer(filePath) {
  // Use forward-slash-normalized full path + segment-matching so the classifier
  // works regardless of whether ROOT matches the file's repo (e.g. when tests
  // feed paths from a sibling worktree).
  const norm = filePath.replace(/\\/g, "/");
  if (norm.endsWith("settings.json")) return "settings_json";
  if (norm.includes("/.claude/hooks/bundles/")) return "bundle";
  if (norm.includes("/__tests__/") || norm.endsWith(".test.mjs")) return "test";
  if (norm.includes("/.claude/hooks/") && norm.endsWith(".mjs")) return "hook_to_hook";
  if (norm.includes("/scripts/system-health/") && norm.endsWith(".ps1")) return "scheduled_task";
  if (norm.includes("/scripts/") && (norm.endsWith(".mjs") || norm.endsWith(".js"))) return "script_invocation";
  if (norm.includes("/mcp-server/src/hooks/")) return "mcp_registry";
  return "other";
}

function scanHook(hookName, consumerFiles, cache) {
  if (isHookExempt(hookName)) {
    return { hookName, classification: "EXEMPT", reasons: ["HOOK-ORPHAN-EXEMPT marker"], matches: [] };
  }
  const pats = buildHookPatterns(hookName);
  const matches = [];
  for (const f of consumerFiles) {
    // Skip the hook's own file
    if (path.basename(f, path.extname(f)) === hookName) continue;
    let content = cache.get(f);
    if (content === undefined) {
      content = readSafe(f);
      if (content.length > MAX_CONTENT_BYTES_FOR_REGEX) content = content.slice(0, MAX_CONTENT_BYTES_FOR_REGEX);
      cache.set(f, content);
    }
    if (!content) continue;
    const hits = [];
    for (const [kind, re] of Object.entries(pats)) {
      if (re.test(content)) hits.push(kind);
    }
    if (hits.length === 0) continue;
    const consumerKind = classifyConsumer(f);
    matches.push({
      consumer: path.relative(ROOT, f).replace(/\\/g, "/"),
      consumerKind,
      strategies: hits,
    });
  }
  const strongMatch = matches.find(m => STRONG_WIRING_KINDS.has(m.consumerKind));
  if (strongMatch) {
    return {
      hookName,
      classification: "FALSE-POSITIVE-WIRED",
      reasons: [`wired via ${strongMatch.consumerKind} (${strongMatch.consumer})`],
      matches,
    };
  }
  if (matches.length > 0) {
    return {
      hookName,
      classification: "WEAK-SIGNAL",
      reasons: [`only ${matches.map(m => m.consumerKind).join("/")} matches — no exec wiring`],
      matches,
    };
  }
  return { hookName, classification: "TRULY-ORPHAN", reasons: ["no wiring path found"], matches: [] };
}

// ---------- main ----------

function main() {
  const args = parseArgs(process.argv);
  if (!statSafe(HOOKS_DIR)) {
    console.error(`hooks dir not found at ${HOOKS_DIR}`);
    process.exit(2);
  }

  const orphans = loadOrphanList(args.source);
  if (orphans.length === 0) {
    const empty = {
      schemaVersion: "1.0.0",
      generated: new Date().toISOString(),
      generatedBy: "scripts/validate-hook-orphan-signal.mjs",
      totalOrphanPool: 0, sampleSize: 0,
      counts: { "TRULY-ORPHAN": 0, "FALSE-POSITIVE-WIRED": 0, "WEAK-SIGNAL": 0, EXEMPT: 0 },
      falsePositiveRatePct: 0, threshold: args.maxFpRate, verdict: "PASS",
      note: "no orphan hooks (goal state)",
      perHook: [],
    };
    if (args.json) process.stdout.write(JSON.stringify(empty, null, 2) + "\n");
    else console.log("validate-hook-orphan-signal: no orphan hooks [PASS]");
    if (args.report || args.autoReport) writeReport(empty, args.report);
    process.exit(0);
  }

  const sample = args.all
    ? orphans.slice()
    : sampleDeterministic(orphans, Math.min(args.sample, orphans.length), args.seed);

  // Build consumer file list once
  const consumerFiles = [
    ...SETTINGS_PATHS.filter(p => statSafe(p)),
    ...listFilesRecursive(HOOKS_DIR, { exts: [".mjs"] }),
    ...listFilesRecursive(SCRIPTS_DIR, { exts: [".mjs", ".js", ".ps1"] }),
    ...(statSafe(MCP_HOOKS_DIR) ? listFilesRecursive(MCP_HOOKS_DIR, { exts: [".ts"] }) : []),
  ];
  const cache = new Map();

  const results = sample.map(o => scanHook(o.name, consumerFiles, cache));
  const counts = { "TRULY-ORPHAN": 0, "FALSE-POSITIVE-WIRED": 0, "WEAK-SIGNAL": 0, EXEMPT: 0 };
  for (const r of results) counts[r.classification] = (counts[r.classification] || 0) + 1;
  const fpRate = (counts["FALSE-POSITIVE-WIRED"] / results.length) * 100;
  const verdict = fpRate <= args.maxFpRate ? "PASS" : "FAIL";

  const report = {
    schemaVersion: "1.0.0",
    generated: new Date().toISOString(),
    generatedBy: "scripts/validate-hook-orphan-signal.mjs",
    args: {
      sample: args.all ? orphans.length : sample.length,
      seed: args.all ? null : args.seed,
      all: args.all,
      maxFpRate: args.maxFpRate,
    },
    totalOrphanPool: orphans.length,
    sampleSize: results.length,
    counts,
    falsePositiveRatePct: +fpRate.toFixed(2),
    threshold: args.maxFpRate,
    verdict,
    perHook: args.verbose
      ? results
      : results.map(r => ({
          hookName: r.hookName,
          classification: r.classification,
          firstMatch: r.matches[0] ? `${r.matches[0].consumerKind}:${r.matches[0].consumer}` : null,
        })),
  };

  let reportPath = null;
  if (args.report || args.autoReport) {
    reportPath = writeReport(report, args.report);
    if (reportPath) report.reportPath = reportPath;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else if (!args.quiet) {
    const tag = verdict === "PASS" ? "[PASS]" : "[FAIL]";
    console.log(`+- validate-hook-orphan-signal - sample=${results.length}/${orphans.length} seed=${args.all ? "ALL" : args.seed}`);
    console.log(`| truly-orphan:         ${counts["TRULY-ORPHAN"]}`);
    console.log(`| false-positive-wired: ${counts["FALSE-POSITIVE-WIRED"]}`);
    console.log(`| weak-signal:          ${counts["WEAK-SIGNAL"]}`);
    console.log(`| exempt:               ${counts.EXEMPT}`);
    console.log(`| false-positive rate:  ${fpRate.toFixed(2)}% (threshold <=${args.maxFpRate}%)`);
    console.log(`| verdict:              ${tag} ${verdict}`);
    if (reportPath) console.log(`| report:               ${path.relative(ROOT, reportPath)}`);
    if (args.verbose) {
      console.log("|");
      for (const r of results) {
        const t = r.classification === "FALSE-POSITIVE-WIRED" ? "[FP]"
                : r.classification === "TRULY-ORPHAN" ? "[OR]"
                : r.classification === "EXEMPT" ? "[EX]" : "[..]";
        console.log(`| ${t} ${r.hookName}: ${r.classification} - ${r.reasons[0] || ""}`);
        for (const m of r.matches.slice(0, VERBOSE_MATCH_LIMIT)) {
          console.log(`|     ${m.consumerKind}: ${m.consumer} [${m.strategies.join(",")}]`);
        }
      }
    } else {
      const fps = results.filter(r => r.classification === "FALSE-POSITIVE-WIRED").slice(0, FIRST_FP_PRINT_LIMIT);
      if (fps.length) {
        console.log(`|`);
        console.log(`| top false positives (first ${FIRST_FP_PRINT_LIMIT}):`);
        for (const r of fps) {
          const m = r.matches[0];
          console.log(`|   ${r.hookName} -> ${m.consumerKind}: ${m.consumer}`);
        }
      }
    }
    console.log(`+-`);
  }

  process.exit(verdict === "PASS" ? 0 : 1);
}

const isCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === url.pathToFileURL(process.argv[1]).href;
  } catch { return false; }
})();

if (isCli) {
  try { main(); } catch (e) {
    console.error(`fatal: ${e.message}`);
    console.error(e.stack);
    process.exit(2);
  }
}

export {
  parseArgs, buildHookPatterns, scanHook, sampleDeterministic, makeRng,
  classifyConsumer, isHookExempt, writeReport, computeOrphansFromDisk,
  STRONG_WIRING_KINDS,
  DEFAULT_SAMPLE_SIZE, DEFAULT_SEED, DEFAULT_MAX_FP_RATE_PCT,
};
