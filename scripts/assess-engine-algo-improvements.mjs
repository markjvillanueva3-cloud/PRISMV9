#!/usr/bin/env node
/**
 * assess-engine-algo-improvements.mjs (DISCOVERY-EFFICIENCY, slot:tango 2026-06-15)
 *
 * Single-pass assessment of the engine + algorithm population for IMPROVEMENT
 * OPPORTUNITIES across five signals. Pure-node (no subprocess fan-out -- safe
 * under fork-storm pressure). Reads each .ts file once; builds an engine+
 * dispatcher identifier set for the dormant-algorithm cross-check.
 *
 * Signals (per file unless noted):
 *   1. inline-physics-constant -- defines a canonical kc1.1 / Taylor value
 *      locally instead of importing from physics/constants.ts (SAFETY anti-pattern;
 *      CLAUDE.md "never inline Kienzle/Taylor/material constants"). NO existing
 *      auditor enforced this rule -- this is the compliance scanner.
 *   2. no-test -- engine/algorithm with no companion <Name>.test.ts anywhere.
 *   3. stub -- placeholder markers (TODO / not implemented / stub return) in a
 *      short file (a real risk; a stub engine silently no-ops).
 *   4. dormant-algorithm -- algorithm not referenced by ANY dispatcher OR engine
 *      (truly dormant; library-layer consumed-by-engine is EXCLUDED, unlike a raw
 *      dispatcher-only check which over-counts).
 *   5. tiny -- file < 400 bytes (likely a re-export or stub shell).
 *
 * Output: state/shared/ENGINE-ALGO-ASSESSMENT-<date>.json + a human summary.
 * Advisory + mustHumanVerify (a signal is a candidate, not a confirmed defect).
 *
 * Usage: node scripts/assess-engine-algo-improvements.mjs [--json] [--top N]
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyInlineKc } from "./lib/inline-const-classify.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MCP = path.join(REPO, "mcp-server", "src");
const ENGINES = path.join(MCP, "engines");
const ALGOS = path.join(MCP, "algorithms");
const DISPATCHERS = path.join(MCP, "tools", "dispatchers");
const AUDIT_DATE = process.env.PRISM_ASSESS_DATE || new Date().toISOString().slice(0, 10);

// Canonical kc1.1 classification (matches-canonical vs DIVERGENT, the safety subset)
// lives in scripts/lib/inline-const-classify.mjs (pure + unit-tested). The legacy
// inline regex here matched only canonical values -> was blind to divergent ones.

function listTs(dir, recurse = false) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recurse && e.name !== "__tests__" && e.name !== "node_modules") out.push(...listTs(full, true));
      continue;
    }
    if (!e.name.endsWith(".ts") || e.name.endsWith(".test.ts") || /\.ts-\d+$/.test(e.name)) continue;
    if (e.name === "index.ts") continue;
    out.push(full);
  }
  return out;
}

// ---- build the test-name set (any *.test.ts basename, recursively) ----
function collectTestNames(dir, set) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") collectTestNames(full, set); continue; }
    const m = e.name.match(/^(.+)\.test\.ts$/);
    if (m) set.add(m[1].toLowerCase());
  }
}

// ---- detection ----
const IMPORT_CONST_RE = /from\s+["'][^"']*physics\/constants/;
const INLINE_TAYLOR_RE = /\btaylor[_]?C\b\s*[:=]\s*\d/i;
const STUB_RE = /\bnot implemented\b|throw new Error\(["'][^"']*not impl|return\s+null;\s*\/\/\s*stub|\bplaceholder\b|\/\/\s*TODO\b|\/\/\s*FIXME\b/i;

function analyzeFile(full, kind) {
  let src = "";
  try { src = readFileSync(full, "utf8"); } catch { return null; }
  const size = src.length;
  const importsConst = IMPORT_CONST_RE.test(src);
  const kc = classifyInlineKc(src);
  const inlineKc = kc.values.length > 0 || INLINE_TAYLOR_RE.test(src);
  // strip line comments + block comments for stub-in-real-code precision (avoid
  // matching a TODO inside a doc block of a complete engine) -- keep it simple:
  // stub flagged only when the file is also short (a real stub, not a TODO note).
  const stub = STUB_RE.test(src) && size < 4000;
  return {
    name: path.basename(full, ".ts"),
    kind,
    rel: path.relative(REPO, full).replace(/\\/g, "/"),
    sizeBytes: size,
    inlineConstant: inlineKc && !importsConst,
    inlineDivergent: kc.divergent.length > 0 && !importsConst,
    // canonical-group-only: every inline kc1.1 equals a canonical group value AND
    // none diverge -> an unambiguous refactor-to-import (the low-risk clean subset).
    inlineCanonicalOnly: kc.matchesCanonical.length > 0 && kc.divergent.length === 0 && !importsConst,
    divergentKc: kc.divergent,
    canonicalKc: kc.matchesCanonical,
    stub,
    tiny: size < 400,
  };
}

// ---- main ----
const engineFiles = listTs(ENGINES, false);
const algoFiles = listTs(ALGOS, false);
const dispatcherFiles = listTs(DISPATCHERS, false);

// Algorithm CONSUMPTION set (precise, import-path based). An algorithm is consumed
// iff some OTHER file imports its module directly (from the algorithms path)
// OR the barrel (algorithms/index.ts) re-exports it (the barrel is imported by 5+
// files). The prior name-token approach gave FALSE NEGATIVES: a same-named ENGINE
// masked an algorithm's dormancy (ClusteringEngine exists in BOTH algorithms/ AND
// engines/ -- the engine namesake made the dormant algorithm look consumed).
const consumedAlgos = new Set();
const ALGO_IMPORT_RE = /\/algorithms\/([A-Za-z_][A-Za-z0-9_]*)(?:\.js)?["']/g;
for (const f of [...engineFiles, ...dispatcherFiles, ...algoFiles]) {
  let src = "";
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  const self = path.basename(f, ".ts");
  for (const mm of src.matchAll(ALGO_IMPORT_RE)) {
    if (mm[1] !== self && mm[1] !== "index") consumedAlgos.add(mm[1]);
  }
}
// barrel re-exports count as consumed (algorithms/index.ts is imported by 5+ files).
try {
  const barrel = readFileSync(path.join(ALGOS, "index.ts"), "utf8");
  const bm = barrel.match(/\b[A-Z][A-Za-z0-9_]*\b/g);
  if (bm) for (const t of bm) consumedAlgos.add(t);
} catch { /* no barrel */ }

const testNames = new Set();
collectTestNames(path.join(MCP, "__tests__"), testNames);
collectTestNames(ENGINES, testNames);
collectTestNames(ALGOS, testNames);

const findings = { inlineConstant: [], inlineDivergent: [], inlineCanonicalOnly: [], noTest: [], stub: [], dormantAlgorithm: [], tiny: [], dupCluster: [] };
let engineCount = 0, algoCount = 0;

for (const f of engineFiles) {
  const a = analyzeFile(f, "engine");
  if (!a) continue;
  engineCount++;
  if (a.inlineConstant) findings.inlineConstant.push(a);
  if (a.inlineDivergent) findings.inlineDivergent.push(a);
  if (a.inlineCanonicalOnly) findings.inlineCanonicalOnly.push(a);
  if (!testNames.has(a.name.toLowerCase())) findings.noTest.push(a);
  if (a.stub) findings.stub.push(a);
  if (a.tiny) findings.tiny.push(a);
}
for (const f of algoFiles) {
  const a = analyzeFile(f, "algorithm");
  if (!a) continue;
  algoCount++;
  if (a.inlineConstant) findings.inlineConstant.push(a);
  if (a.inlineDivergent) findings.inlineDivergent.push(a);
  if (a.inlineCanonicalOnly) findings.inlineCanonicalOnly.push(a);
  if (!testNames.has(a.name.toLowerCase())) findings.noTest.push(a);
  if (a.stub) findings.stub.push(a);
  if (a.tiny) findings.tiny.push(a);
  // dormant: not imported by any other file (direct path) nor barrel-re-exported
  if (!consumedAlgos.has(a.name)) findings.dormantAlgorithm.push(a);
}

// ---- name-cluster near-duplicate detection. No engine-dedup auditor exists
// (DuplicationGuardEngine is create-time only; the dedupe-* scripts cover hooks/
// graph, not engines). Strip suffix variants -> stem; stems with >=2 members are
// dedup candidates (the Engine-vs-Adapter/Facade/V2 pattern the discovery sweep hit).
const STEM_SUFFIX = /(engines?|adapter|facade|bridge|shim|impl|router|v[23]|[23]|new|old)$/i;
function stemOf(name) {
  let s = name;
  for (let i = 0; i < 4; i++) { const n = s.replace(STEM_SUFFIX, ""); if (n === s) break; s = n; }
  return s.toLowerCase();
}
const stemMap = new Map();
for (const f of [...engineFiles, ...algoFiles]) {
  const nm = path.basename(f, ".ts");
  const st = stemOf(nm);
  if (st.length < 4) continue;
  let arr = stemMap.get(st);
  if (!arr) { arr = []; stemMap.set(st, arr); }
  arr.push(nm);
}
for (const [st, members] of stemMap) {
  if (members.length >= 2) findings.dupCluster.push({ stem: st, members, count: members.length });
}
findings.dupCluster.sort((a, b) => b.count - a.count);

const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  generatedBy: "assess-engine-algo-improvements.mjs",
  advisoryOnly: true,
  mustHumanVerify: true,
  population: { engines: engineCount, algorithms: algoCount, dispatchers: dispatcherFiles.length },
  counts: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])),
  findings,
};

const TOP = (() => { const i = process.argv.indexOf("--top"); return i >= 0 ? Number(process.argv[i + 1]) || 15 : 15; })();
const outDir = path.join(REPO, "state", "shared");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `ENGINE-ALGO-ASSESSMENT-${AUDIT_DATE}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: true, written: path.relative(REPO, outPath), population: report.population, counts: report.counts }));
} else {
  console.log(`\n=== ENGINE + ALGORITHM IMPROVEMENT ASSESSMENT (${AUDIT_DATE}) ===`);
  console.log(`population: ${engineCount} engines, ${algoCount} algorithms, ${dispatcherFiles.length} dispatchers`);
  console.log(`\nIMPROVEMENT OPPORTUNITIES (advisory, must-human-verify):`);
  console.log(`  inline-physics-constant (any kc1.1/Taylor, not importing): ${findings.inlineConstant.length}`);
  console.log(`    -> non-canonical-group kc1.1 (per-material table OR drift -- physics-reviewer triage, NOT auto-bug): ${findings.inlineDivergent.length}`);
  console.log(`    -> canonical-group-only inline (CLEAN refactor-to-import, low risk): ${findings.inlineCanonicalOnly.length}`);
  console.log(`  no-test:                          ${findings.noTest.length}`);
  console.log(`  stub-markers (short file):        ${findings.stub.length}`);
  console.log(`  dormant-algorithm (0 consumers):  ${findings.dormantAlgorithm.length}`);
  console.log(`  tiny (<400B, likely re-export):   ${findings.tiny.length}`);
  console.log(`  name-cluster dup candidates:      ${findings.dupCluster.length} clusters (${findings.dupCluster.reduce((s, c) => s + c.count, 0)} files)`);
  console.log(`\n--- top name-cluster dup candidates (top ${TOP}) ---`);
  for (const c of findings.dupCluster.slice(0, TOP)) console.log(`  ${c.stem.padEnd(26)} ${c.members.join(", ")}`);
  console.log(`\n--- non-canonical-group inline kc1.1 (per-material table OR drift -- triage, NOT auto-confirmed bugs) ---`);
  for (const x of findings.inlineDivergent.slice(0, TOP)) console.log(`  ${x.kind.padEnd(9)} ${x.name}  values=[${(x.divergentKc || []).join(",")}]  (${x.rel})`);
  console.log(`\n--- inline-constant violations (top ${TOP}, SAFETY priority) ---`);
  for (const x of findings.inlineConstant.slice(0, TOP)) console.log(`  ${x.kind.padEnd(9)} ${x.name}  (${x.rel})`);
  console.log(`\n--- dormant algorithms (top ${TOP}) ---`);
  for (const x of findings.dormantAlgorithm.slice(0, TOP)) console.log(`  ${x.name}  (${x.sizeBytes}B)`);
  console.log(`\nwritten: ${path.relative(REPO, outPath)}`);
}
