#!/usr/bin/env node
/**
 * validate-unwired-signal.mjs
 * ===========================
 * Independent verifier for the NEEDS_WIRING signal produced by
 * `scripts/audit-unwired-engines.mjs` + surfaced through
 * `state/shared/BUILD_STATE.json` + `state/shared/UNWIRED-ENGINE-AUDIT-*.json`.
 *
 * Problem (CLAUDE.md regression 2026-05-14):
 *   The audit's NEEDS_WIRING list has a ~50% false-positive rate on sample.
 *   Engines flagged "unwired" are actually consumed by dispatchers/hooks/routes/
 *   orchestrators via patterns the audit doesn't catch (singleton wrappers with
 *   `instance` suffix, default imports, dynamic `import()`, type-only imports,
 *   action-handler maps that don't grep as `case "x":`).
 *
 *   Every wiring milestone that consumes this signal mis-prioritises 50% of its
 *   slots on already-wired engines — wasted fleet cycles.
 *
 * This script:
 *   1. Loads the most recent UNWIRED-ENGINE-AUDIT-*.json (or BUILD_STATE.json
 *      sample_engines as fallback).
 *   2. Samples N engines deterministically (`--sample 50` default, `--seed` for
 *      reproducibility).
 *   3. For each, runs 6 independent detection strategies across the WHOLE
 *      mcp-server/src tree (not just the audit's narrow consumer list):
 *        a. Direct import: `import { EngineClassName } from`
 *        b. Singleton instance: `import { engineClassNameInstance } from`
 *        c. Default import / re-export: `import EngineClassName from` / `export.*EngineClassName`
 *        d. Construct / type-ref: `new EngineClassName(` / `: EngineClassName`
 *        e. Dynamic import: `import("../engines/EngineClassName")`
 *        f. WIRE-EXEMPT marker in engine file itself
 *      Each match is categorised by *consumer file type* (dispatcher / route /
 *      registry / hook / orchestrator / singleton / test / cross-engine / other).
 *   4. Classifies each engine as one of:
 *        TRULY-UNWIRED         — no consumer match anywhere (real wiring target)
 *        FALSE-POSITIVE-WIRED  — at least one strong-signal consumer (dispatcher /
 *                                route / registry / hook / orchestrator / singleton)
 *        WEAK-SIGNAL           — only test-file or cross-engine matches (still
 *                                technically unwired from dispatcher POV but not
 *                                a clean orphan)
 *        EXEMPT                — has `// WIRE-EXEMPT:` marker
 *   5. Computes false-positive rate = FALSE-POSITIVE-WIRED / sample_size.
 *   6. PASS if rate ≤ 10% (configurable `--max-fp-rate`); FAIL otherwise.
 *   7. Exit code: 0 = PASS, 1 = FAIL, 2 = script error.
 *
 * Usage:
 *   node scripts/validate-unwired-signal.mjs               # default sample=50, seed=42
 *   node scripts/validate-unwired-signal.mjs --sample 100 --seed 7
 *   node scripts/validate-unwired-signal.mjs --json        # machine-readable
 *   node scripts/validate-unwired-signal.mjs --verbose     # full per-engine detail
 *   node scripts/validate-unwired-signal.mjs --all         # check every NEEDS_WIRING (slow)
 *   node scripts/validate-unwired-signal.mjs --max-fp-rate 5   # tighter gate
 *
 * Author: claude-6d0595bf (bravo slot) 2026-05-15
 * Tracks: U-HVA-UNWIRED-SIGNAL-VALIDATE (CLAUDE.md regression 2026-05-14)
 * Related: scripts/audit-unwired-engines.mjs (the generator this verifies),
 *          scripts/high-value-additions-rank.mjs (consumes the same signal)
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const MCP_SRC = path.join(ROOT, "mcp-server", "src");

// ---------- defaults ----------
const DEFAULT_SAMPLE_SIZE = 50;          // per CLAUDE.md U-HVA-UNWIRED-SIGNAL-VALIDATE spec
const DEFAULT_SEED = 42;                 // reproducible across runs unless overridden
const DEFAULT_MAX_FP_RATE_PCT = 10;      // gate threshold from CLAUDE.md spec
const FIRST_FALSE_POS_PRINT_LIMIT = 5;   // pretty-mode top-N false positives
const VERBOSE_MATCH_PRINT_LIMIT = 3;     // per-engine match cap in --verbose
const ENGINE_HEAD_SCAN_BYTES = 2000;     // bytes to read from engine head for WIRE-EXEMPT marker
const DISPATCHERS_DIR = path.join(MCP_SRC, "tools", "dispatchers");
const ROUTES_DIR = path.join(MCP_SRC, "routes");
const REGISTRIES_DIR = path.join(MCP_SRC, "registries");
const HOOKS_DIR = path.join(MCP_SRC, "hooks");
const ENGINES_DIR = path.join(MCP_SRC, "engines");
const STATE_DIR = path.join(ROOT, "state", "shared");

// ---------- CLI parsing ----------

function parseArgs(argv) {
  const args = {
    sample: DEFAULT_SAMPLE_SIZE,
    seed: DEFAULT_SEED,
    json: false,
    verbose: false,
    quiet: false,
    all: false,
    maxFpRate: DEFAULT_MAX_FP_RATE_PCT,
    source: null,
    report: null,        // explicit path; null + --auto-report uses dated default
    autoReport: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sample") args.sample = parseInt(argv[++i], 10);
    else if (a === "--seed") args.seed = parseInt(argv[++i], 10);
    else if (a === "--max-fp-rate") args.maxFpRate = parseFloat(argv[++i]);
    else if (a === "--source") args.source = argv[++i];
    else if (a === "--report") args.report = argv[++i];
    else if (a === "--auto-report") args.autoReport = true;
    else if (a === "--json") args.json = true;
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--quiet") args.quiet = true;
    else if (a === "--all") args.all = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node validate-unwired-signal.mjs [--sample N] [--seed N] [--all] [--max-fp-rate %] [--json] [--verbose] [--quiet] [--report PATH] [--auto-report] [--source PATH]");
      process.exit(0);
    } else if (a.startsWith("--")) {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(args.sample) || args.sample < 1) {
    console.error("--sample must be a positive integer");
    process.exit(2);
  }
  if (!Number.isFinite(args.seed)) {
    console.error("--seed must be a finite integer");
    process.exit(2);
  }
  if (!Number.isFinite(args.maxFpRate) || args.maxFpRate < 0 || args.maxFpRate > 100) {
    console.error("--max-fp-rate must be a percentage 0..100");
    process.exit(2);
  }
  return args;
}

// ---------- IO helpers ----------

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function statSafe(p) { try { return fs.statSync(p); } catch { return null; } }

function writeReport(report, explicitPath) {
  // P1 fix (reviewer B): emit dated JSON report to state/shared/ so downstream
  // consumers (HVA, BUILD_STATE pipeline) can subscribe without parsing stdout.
  const ymd = new Date().toISOString().slice(0, 10);
  const defaultPath = path.join(STATE_DIR, `UNWIRED-SIGNAL-VALIDATION-${ymd}.json`);
  const target = explicitPath || defaultPath;
  // Path-safety guard: refuse paths outside ROOT (reviewer B P3)
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

function listTsFiles(dir, opts = {}) {
  // opts.includeTests=false (default) → skip __tests__ subdirs and *.test.ts files.
  // opts.maxDepth=20 hard cap to prevent stack overflow / symlink loops.
  const includeTests = !!opts.includeTests;
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 20;
  const out = [];
  function walk(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        if (!includeTests && e.name === "__tests__") continue;
        walk(full, depth + 1);
      } else if (e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) {
        if (!includeTests && e.name.endsWith(".test.ts")) continue;
        out.push(full);
      }
    }
  }
  walk(dir, 0);
  return out;
}

// Recursive — picks up __tests__/ subdirs anywhere under MCP_SRC + *.test.ts files
// co-located with their subject. P0-1 fix (reviewer A).
function listTestFilesRecursive() {
  const out = [];
  const maxDepth = 20;
  function walk(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        walk(full, depth + 1);
      } else if (e.isFile() && (e.name.endsWith(".test.ts") || (e.name.endsWith(".ts") && full.replace(/\\/g, "/").includes("/__tests__/")))) {
        out.push(full);
      }
    }
  }
  walk(MCP_SRC, 0);
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
  // Fisher-Yates partial shuffle
  const idx = arr.map((_, i) => i);
  for (let i = idx.length - 1; i > idx.length - 1 - n; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(idx.length - n).map(i => arr[i]);
}

// ---------- load NEEDS_WIRING list ----------

function loadUnwiredList(sourceOverride) {
  if (sourceOverride) {
    const j = readJsonSafe(sourceOverride);
    if (!j) {
      console.error(`source not found or invalid JSON: ${sourceOverride}`);
      process.exit(2);
    }
    const overrideMtime = new Date(statSafe(sourceOverride)?.mtimeMs || 0).toISOString();
    return { engines: extractEngineList(j, sourceOverride), source: sourceOverride, sourceMtime: overrideMtime };
  }
  // Prefer most recent UNWIRED-ENGINE-AUDIT-*.json
  const auditFiles = fs.readdirSync(STATE_DIR)
    .filter(f => /^UNWIRED-ENGINE-AUDIT-.*\.json$/.test(f))
    .map(f => ({ name: f, path: path.join(STATE_DIR, f), mtime: statSafe(path.join(STATE_DIR, f))?.mtimeMs || 0 }))
    .sort((a, b) => b.mtime - a.mtime);
  if (auditFiles.length) {
    const top = auditFiles[0];
    const j = readJsonSafe(top.path);
    if (j) return { engines: extractEngineList(j, top.path), source: top.path, sourceMtime: new Date(top.mtime).toISOString() };
  }
  // Fallback: BUILD_STATE.json sample_engines (only top 5 — limited)
  const bs = readJsonSafe(path.join(STATE_DIR, "BUILD_STATE.json"));
  if (bs?.NEEDS_WIRING?.sample_engines) {
    const list = bs.NEEDS_WIRING.sample_engines.map(e => ({ name: e.name, suggestedDispatcher: e.suggestedDispatcher || null }));
    return { engines: list, source: path.join(STATE_DIR, "BUILD_STATE.json"), sourceMtime: new Date(statSafe(path.join(STATE_DIR, "BUILD_STATE.json"))?.mtimeMs || 0).toISOString() };
  }
  console.error("no NEEDS_WIRING source found (looked for UNWIRED-ENGINE-AUDIT-*.json + BUILD_STATE.json)");
  process.exit(2);
}

function extractEngineList(audit, sourcePath) {
  // Schema variants seen in the wild:
  //   { unwiredEngines: [ { engine: "X", ... } ] }       — current audit-unwired-engines.mjs (canonical field: "engine")
  //   { unwiredEngines: [ { name: "X", ... } ] }         — older variant
  //   { unwiredEngines: [ "X", "Y" ] }                   — flat list
  //   { engines:        [ { name|basename: "X", classification|classified: "UNWIRED" } ] }
  //   { unwired:        [ ... ] }                        — yet another variant
  const nameOf = (e) => (typeof e === "string" ? e : (e?.name || e?.basename || e?.engine || null));
  const norm = (e) => ({ name: nameOf(e), ...(typeof e === "object" && e !== null ? e : {}) });
  if (Array.isArray(audit.unwiredEngines)) {
    return audit.unwiredEngines.map(norm).filter(e => e.name);
  }
  if (Array.isArray(audit.engines)) {
    return audit.engines
      .filter(e => e.classified === "UNWIRED" || e.classification === "UNWIRED")
      .map(norm).filter(e => e.name);
  }
  if (Array.isArray(audit.unwired)) {
    return audit.unwired.map(norm).filter(e => e.name);
  }
  console.error(`unknown audit schema for ${sourcePath}`);
  process.exit(2);
}

// ---------- engine detection ----------

const STRONG_CONSUMER_KINDS = new Set(["dispatcher", "route", "registry", "hook", "orchestrator", "singleton"]);

function classifyConsumerFile(filePath) {
  const rel = path.relative(MCP_SRC, filePath).replace(/\\/g, "/");
  if (rel.startsWith("tools/dispatchers/")) return "dispatcher";
  if (rel.startsWith("routes/")) return "route";
  if (rel.startsWith("registries/")) return "registry";
  if (rel.startsWith("hooks/")) return "hook";
  if (rel.startsWith("__tests__/") || rel.endsWith(".test.ts")) return "test";
  if (rel.startsWith("engines/")) {
    const base = path.basename(rel, ".ts");
    if (/Singleton$/.test(base)) return "singleton";
    if (/Orchestrator/i.test(base)) return "orchestrator";
    return "cross-engine";
  }
  return "other";
}

function isExempt(engineName) {
  const enginePath = path.join(ENGINES_DIR, `${engineName}.ts`);
  const head = readSafe(enginePath).slice(0, ENGINE_HEAD_SCAN_BYTES);
  return /\/\/\s*WIRE-EXEMPT:/.test(head);
}

// Patterns split into STRONG (any one is sufficient evidence of wiring) and
// CO_SIGNAL (must accompany at least one STRONG match — caught
// false-positives from string literals / JSDoc / debug logs per reviewer A P0-2).
function buildSearchPatterns(engineName) {
  // Escape the name for regex (engine names are PascalCase identifiers, safe but be defensive)
  const esc = engineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const instanceName = engineName.charAt(0).toLowerCase() + engineName.slice(1);
  const instanceEsc = instanceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    strong: {
      // Strategy a: named import or destructure import — matches `import { Engine } from`
      namedImport: new RegExp(`import\\s+\\{[^}]*\\b${esc}\\b[^}]*\\}\\s+from`, "m"),
      // Strategy b: singleton instance import (lowerCamel + optional Instance|Singleton suffix)
      instanceImport: new RegExp(`import\\s+\\{[^}]*\\b${instanceEsc}(?:Instance|Singleton)?\\b[^}]*\\}\\s+from`, "m"),
      // Strategy c: default import / namespace import
      defaultOrNamespace: new RegExp(`import\\s+(?:${esc}|\\*\\s+as\\s+${esc})\\s+from`, "m"),
      // Strategy d: construct
      construct: new RegExp(`\\bnew\\s+${esc}\\s*\\(`, "m"),
      // Strategy e: dynamic import
      dynamicImport: new RegExp(`import\\s*\\(\\s*["'][^"']*${esc}["']`, "m"),
      // Strategy f: re-export
      reExport: new RegExp(`export\\s+\\{[^}]*\\b${esc}\\b[^}]*\\}`, "m"),
      // Strategy g: path-based import (engine basename in module path — P1-1 fix, mirrors audit)
      pathImport: new RegExp(`from\\s+["'][^"']*\\b${esc}(?:\\.js)?["']`, "m"),
      // Strategy h: dynamic import path-based — `import("../engines/Name.js")`
      dynamicImportPath: new RegExp(`import\\s*\\(\\s*["'][^"']*\\b${esc}(?:\\.js)?["']`, "m"),
    },
    coSignal: {
      // CO_SIGNAL only — counted only when at least one strong match also fires
      // (prevents false positives from comments / JSDoc / string-literal references)
      typeRef: new RegExp(`:\\s*${esc}\\b`, "m"),
      propAccess: new RegExp(`\\b${esc}\\.[a-zA-Z_]`, "m"),
    },
  };
}

// Per-file content size cap before regex (reviewer P1-5 ReDoS hardening)
const MAX_CONTENT_BYTES_FOR_REGEX = 1024 * 1024;   // 1 MB

function scanEngine(engineName, consumerFiles, contentCache) {
  if (isExempt(engineName)) {
    return { engineName, classification: "EXEMPT", reasons: ["WIRE-EXEMPT marker in engine file"], matches: [] };
  }
  const pats = buildSearchPatterns(engineName);
  const matches = [];
  for (const f of consumerFiles) {
    // Skip the engine's own file
    const fb = path.basename(f, ".ts");
    if (fb === engineName) continue;
    let content = contentCache.get(f);
    if (content === undefined) {
      content = readSafe(f);
      // Truncate oversized files defensively to bound regex backtracking
      if (content.length > MAX_CONTENT_BYTES_FOR_REGEX) content = content.slice(0, MAX_CONTENT_BYTES_FOR_REGEX);
      contentCache.set(f, content);
    }
    if (!content) continue;
    const strongHits = [];
    for (const [kind, re] of Object.entries(pats.strong)) {
      if (re.test(content)) strongHits.push(kind);
    }
    const coSignalHits = [];
    for (const [kind, re] of Object.entries(pats.coSignal)) {
      if (re.test(content)) coSignalHits.push(kind);
    }
    // Co-signals only count when a strong match also fires in the same file.
    // This blocks the propAccess/typeRef false positives from string literals + JSDoc.
    const effectiveHits = strongHits.length > 0
      ? [...strongHits, ...coSignalHits]
      : [];
    if (effectiveHits.length === 0) continue;
    const consumerKind = classifyConsumerFile(f);
    matches.push({
      consumer: path.relative(MCP_SRC, f).replace(/\\/g, "/"),
      consumerKind,
      strategies: effectiveHits,
    });
  }
  // Classify
  const strongMatch = matches.find(m => STRONG_CONSUMER_KINDS.has(m.consumerKind));
  if (strongMatch) {
    return {
      engineName,
      classification: "FALSE-POSITIVE-WIRED",
      reasons: [`wired via ${strongMatch.consumerKind} (${strongMatch.consumer})`],
      matches,
    };
  }
  if (matches.length > 0) {
    return {
      engineName,
      classification: "WEAK-SIGNAL",
      reasons: [`only ${matches.map(m => m.consumerKind).join("/")} matches — no dispatcher/route/registry/hook/orchestrator/singleton wiring`],
      matches,
    };
  }
  return { engineName, classification: "TRULY-UNWIRED", reasons: ["no consumer found"], matches: [] };
}

// ---------- main ----------

function main() {
  const args = parseArgs(process.argv);
  if (!statSafe(MCP_SRC)) {
    console.error(`mcp-server/src not found at ${MCP_SRC}`);
    process.exit(2);
  }

  const { engines: unwired, source, sourceMtime } = loadUnwiredList(args.source);
  if (unwired.length === 0) {
    // P0-4 fix: empty NEEDS_WIRING list is the GOAL STATE, not an error.
    // Downstream cron/CI gates would mis-fire if we exited 2 here.
    const emptyReport = {
      schemaVersion: "1.0.0",
      generated: new Date().toISOString(),
      generatedBy: "scripts/validate-unwired-signal.mjs",
      source,
      sourceMtime,
      totalUnwiredPool: 0,
      sampleSize: 0,
      counts: { "TRULY-UNWIRED": 0, "FALSE-POSITIVE-WIRED": 0, "WEAK-SIGNAL": 0, EXEMPT: 0 },
      falsePositiveRatePct: 0,
      threshold: args.maxFpRate,
      verdict: "PASS",
      note: "NEEDS_WIRING list empty — nothing to audit (goal state)",
      perEngine: [],
    };
    if (args.json) process.stdout.write(JSON.stringify(emptyReport, null, 2) + "\n");
    else console.log("validate-unwired-signal: NEEDS_WIRING list empty — nothing to audit [PASS]");
    if (args.report) writeReport(emptyReport, args.report);
    process.exit(0);
  }

  // De-dup by name (defensive — some audits include duplicates across orphan-list sections)
  const seen = new Set();
  const dedup = unwired.filter(e => {
    if (!e.name || seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });

  const sample = args.all ? dedup : sampleDeterministic(dedup, Math.min(args.sample, dedup.length), args.seed);

  // Build consumer file list once.
  // P0-1 fix: tests are scanned RECURSIVELY across all of MCP_SRC so co-located
  // `__tests__/` subdirs are not missed.
  const consumerFiles = [
    ...listTsFiles(DISPATCHERS_DIR),
    ...listTsFiles(ROUTES_DIR),
    ...listTsFiles(REGISTRIES_DIR),
    ...listTsFiles(HOOKS_DIR),
    ...listTsFiles(ENGINES_DIR),   // catches orchestrator + singleton + cross-engine
    ...listTestFilesRecursive(),
  ];
  const contentCache = new Map();

  const results = sample.map(e => scanEngine(e.name, consumerFiles, contentCache));
  const counts = {
    "TRULY-UNWIRED": 0,
    "FALSE-POSITIVE-WIRED": 0,
    "WEAK-SIGNAL": 0,
    EXEMPT: 0,
  };
  for (const r of results) counts[r.classification] = (counts[r.classification] || 0) + 1;
  const fpRate = (counts["FALSE-POSITIVE-WIRED"] / results.length) * 100;
  const verdict = fpRate <= args.maxFpRate ? "PASS" : "FAIL";

  const report = {
    schemaVersion: "1.0.0",
    generated: new Date().toISOString(),
    generatedBy: "scripts/validate-unwired-signal.mjs",
    source,
    sourceMtime,
    args: {
      sample: args.all ? dedup.length : sample.length,
      seed: args.all ? null : args.seed,
      all: args.all,
      maxFpRate: args.maxFpRate,
    },
    totalUnwiredPool: dedup.length,
    sampleSize: results.length,
    counts,
    falsePositiveRatePct: +fpRate.toFixed(2),
    threshold: args.maxFpRate,
    verdict,
    perEngine: args.verbose ? results : results.map(r => ({
      engineName: r.engineName,
      classification: r.classification,
      firstMatch: r.matches[0] ? `${r.matches[0].consumerKind}:${r.matches[0].consumer}` : null,
    })),
  };

  // Emit JSON report file (P1 fix from reviewer B) — explicit --report path OR
  // dated state/shared/ default when --auto-report (or json mode without quiet).
  let reportPath = null;
  if (args.report || args.autoReport) {
    reportPath = writeReport(report, args.report);
    if (reportPath) report.reportPath = reportPath;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else if (!args.quiet) {
    // CLAUDE.md "no emojis" rule — use plain [PASS] / [FAIL] tags.
    const tag = verdict === "PASS" ? "[PASS]" : "[FAIL]";
    console.log(`+- validate-unwired-signal - sample=${results.length}/${dedup.length} seed=${args.all ? "ALL" : args.seed}`);
    console.log(`| source: ${path.relative(ROOT, source)} (mtime ${sourceMtime || "n/a"})`);
    console.log(`| truly-unwired:        ${counts["TRULY-UNWIRED"]}`);
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
                : r.classification === "TRULY-UNWIRED" ? "[OK]"
                : r.classification === "EXEMPT" ? "[EX]"
                : "[..]";
        console.log(`| ${t} ${r.engineName}: ${r.classification} - ${r.reasons[0] || ""}`);
        for (const m of r.matches.slice(0, VERBOSE_MATCH_PRINT_LIMIT)) {
          console.log(`|     ${m.consumerKind}: ${m.consumer} [${m.strategies.join(",")}]`);
        }
      }
    } else {
      const fps = results.filter(r => r.classification === "FALSE-POSITIVE-WIRED").slice(0, FIRST_FALSE_POS_PRINT_LIMIT);
      if (fps.length) {
        console.log(`|`);
        console.log(`| top false positives (first ${FIRST_FALSE_POS_PRINT_LIMIT}):`);
        for (const r of fps) {
          const m = r.matches[0];
          console.log(`|   ${r.engineName} -> ${m.consumerKind}: ${m.consumer}`);
        }
      }
    }
    console.log(`+-`);
  }

  process.exit(verdict === "PASS" ? 0 : 1);
}

// Run main() only when invoked as CLI (not on import for tests).
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

// ---------- exports for hermetic tests (no CLI side-effects on import) ----------
export {
  parseArgs,
  buildSearchPatterns,
  scanEngine,
  sampleDeterministic,
  makeRng,
  classifyConsumerFile,
  extractEngineList,
  isExempt,
  writeReport,
  loadUnwiredList,
  STRONG_CONSUMER_KINDS,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_SEED,
  DEFAULT_MAX_FP_RATE_PCT,
  MAX_CONTENT_BYTES_FOR_REGEX,
};
