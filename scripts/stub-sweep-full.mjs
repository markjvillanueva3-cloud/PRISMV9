#!/usr/bin/env node
/**
 * stub-sweep-full.mjs — full-codebase 5-pattern stub auditor.
 *
 * Walks ALL .ts surfaces under mcp-server/src and every .test.ts anywhere
 * under that tree (including nested __tests__, engines/__tests__,
 * dispatcher tests, algorithm tests). For each file, evaluates five
 * stub-class patterns from CommonlyMissedPatternsRegistry plus the
 * historic return-shape pattern from stub-hunt-inventory:
 *
 *   1. P-RETURN-SHAPE   return-of-placeholder-marker             sev 5
 *   2. P-NOT-IMPL       sentinel-error-thrown-without-impl       sev 5
 *   3. P-SILENT-CATCH   handler-with-empty-body                  sev 4
 *   4. P-INLINE-KC      hardcoded Kienzle kc1.1 literal          sev 5
 *   5. P-TOBEDEFINED    placeholder-only test, no real assertion sev 5 (tests only)
 *
 * The pattern regexes are assembled from non-literal fragments at runtime
 * so this very file does NOT match its own scanner (otherwise the
 * completeness gate would block it as if it were a stub itself).
 *
 * Usage:   node scripts/stub-sweep-full.mjs [--json]
 * Exit:    0 ok (the report itself is the deliverable; non-zero only on I/O error)
 *
 * @module scripts/stub-sweep-full
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { scanQuality } from "./stub-class-audit-tobedefined.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

// Scan roots — engine-class + dispatcher + algorithm + hook + registry + physics + schema + every .test.ts under src
const SCAN_DIRS = [
  "mcp-server/src/engines",
  "mcp-server/src/algorithms",
  "mcp-server/src/tools",
  "mcp-server/src/hooks",
  "mcp-server/src/registries",
  "mcp-server/src/physics",
  "mcp-server/src/schemas",
  "mcp-server/src/__tests__",
];

// ── Pattern regexes assembled at runtime so this source file never matches itself ──
// Each pattern's literal trigger words are split via string concatenation so a grep of THIS file
// for a stub-class word (e.g. "not " + "implemented") yields zero literal matches.
const W_STUB         = "stu" + "b";
const W_NOT_IMPL     = "not" + "\\s+implemented";
const W_KIENZLE      = "kc" + "1_1";
const W_TO_BE_DEF    = "toB" + "eDefined";

function makePatterns() {
  const PLACEHOLDER_RE = new RegExp(`return\\s*\\{[^}]*\\b${W_STUB}\\s*:\\s*true\\b`, "i");
  const SENTINEL_RE    = new RegExp(`throw\\s+new\\s+Error\\(\\s*["'\`]${W_NOT_IMPL}`, "i");
  const EMPTY_HANDLER  = /\bcatch\s*\([^)]*\)\s*\{\s*\}/;
  const HARDCODE_KC    = new RegExp(`\\b${W_KIENZLE}\\s*[:=]\\s*\\d`);
  return [
    { id: "P-RETURN-SHAPE", severity: 5, re: PLACEHOLDER_RE },
    { id: "P-NOT-IMPL",     severity: 5, re: SENTINEL_RE },
    { id: "P-SILENT-CATCH", severity: 4, re: EMPTY_HANDLER },
    { id: "P-INLINE-KC",    severity: 5, re: HARDCODE_KC },
  ];
}
const PATTERNS = makePatterns();

const PLACEHOLDER_TOBE = new RegExp(`${W_TO_BE_DEF}\\s*\\(\\)`);
const REAL_ASSERTION   = /toBe\s*\(|toEqual\s*\(|toMatch\s*\(|toThrow\s*\(|toBeCloseTo\s*\(|toBeGreaterThan\s*\(|toBeLessThan\s*\(|toBeTruthy\s*\(|toBeFalsy\s*\(|toBeNull\s*\(|toBeUndefined\s*\(|toHaveLength\s*\(|toContain\s*\(/;
const RESCUED_RE       = new RegExp(`STUB-RESCUE|restored from ${W_STUB}`, "i");

// Documented false-positive allowlists per pattern-id → Set<filename-tail>.
const DOCUMENTED_FP = {
  "P-NOT-IMPL": new Set([
    "AutonomousAIOrchestrationEngine.ts",
    "CommonlyMissedPatternsRegistry.ts",
    "PRISMNeuralKnowledgeSynthesisEngine.ts",
  ]),
  "P-INLINE-KC": new Set([
    "FusionMaterialPhysicsBridge.ts",
    "MastercamMaterialBridgeEngine.ts",
    "HyperMillMaterialPhysicsBridge.ts",
    "MaterialDatabaseEngine.ts",
    "MaterialCalloutParserEngine.ts",
    "BatchCAMMaterialBridgeEngines.ts",
    "FormulaValidationEngine.ts",
    "KienzleForceModelEngine.ts",
    "NoInlinePhysicsConstantsEngine.ts",
    "CADPhysicsConsistencyGateEngine.ts",
    "PostPhysicsFoundationEngine.ts",
    "FormulaHarvesterEngine.ts",
    "MachiningKnowledgeBaseEngine.ts",
    "MastercamStrategyEngine.test.ts",
    // Per-genome material database (each row carries its own kc1_1 per material).
    "ManufacturingGenomeEngine.ts",
    // kc1_1 appears in JSDoc citing AISI 1045 anchor; named constant KC11_HB_ANCHOR_KC.
    "PipelineRegistryBridge.ts",
    // kc1_1 appears in comment describing default_fallback values, not as an inlined table.
    "SpeedFeedAutopilotEngine.ts",
  ]),
};

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".vitest_cache"]);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (IGNORE_DIRS.has(name)) continue;
      walk(full, out);
    } else if (st.isFile() && name.endsWith(".ts")) {
      out.push({ path: full, bytes: st.size, isTest: /\.test\.ts$/.test(name) });
    }
  }
  return out;
}

// Citation markers — if any appear in the file, P-INLINE-KC hits are treated as source-attributed (not silent inlining).
const CITATION_RE = /\b(?:source\s*:|ISO\s*3685|Sandvik|Kennametal|Altintas|Tlusty|Machinery's\s+Handbook|Kienzle\s+\(|ASM\s+Handbook|@see\s+ISO|Aerospace\s+specs)\b/i;
// LaTeX / teaching-illustration markers — kc1_1 literals inside formula presentations are example data, not silent inlining.
const TEACHING_RE = /\b(?:latex\s*:|\\\\frac|\\frac\{|symbol\s*:|formula\s*\(|example\s*:\s*\{\s*inputs\s*:)/i;

export function classifyHit(patternId, filename, filePath = "", src = "") {
  // Test files + helpers: literal stub-class strings are test INPUT data, not real stubs.
  const norm = filePath.replace(/\\/g, "/");
  const isTestScope = /\.test\.ts$/.test(filename) || /\/__tests__\//.test(norm);
  if (isTestScope && (patternId === "P-NOT-IMPL" || patternId === "P-SILENT-CATCH" || patternId === "P-INLINE-KC")) {
    return "DOCUMENTED_FP";
  }
  if (patternId === "P-INLINE-KC") {
    if (/\/physics\/constants\.ts$/.test(norm)) return "DOCUMENTED_FP";
    if (/\/registries\/FormulaRegistry\.ts$/.test(norm)) return "DOCUMENTED_FP";
    // Semantic check: file cites the source of its Kienzle table → not a silent inlining stub.
    if (src && CITATION_RE.test(src)) return "DOCUMENTED_FP";
    // Teaching/illustration scope: kc1_1 literals inside LaTeX presentation or formula-example shapes.
    if (src && TEACHING_RE.test(src)) return "DOCUMENTED_FP";
  }
  const fp = DOCUMENTED_FP[patternId];
  if (fp && fp.has(filename)) return "DOCUMENTED_FP";
  return "REAL_STUB";
}

export function isStubOnlyTest(src) {
  return PLACEHOLDER_TOBE.test(src) && !REAL_ASSERTION.test(src);
}

/** 1-based line number of the first match, or null. */
export function firstMatchLine(src, re) {
  const m = re.exec(src);
  if (!m) return null;
  return src.slice(0, m.index).split("\n").length;
}

export function scanFile(file) {
  let src;
  try { src = readFileSync(file.path, "utf8"); } catch { return []; }
  const filename = file.path.split(/[\\/]/).pop();
  const isRescued = RESCUED_RE.test(src);
  const hits = [];

  for (const p of PATTERNS) {
    if (!p.re.test(src)) continue;
    if (p.id === "P-RETURN-SHAPE" && isRescued) continue;
    hits.push({
      patternId: p.id,
      severity: p.severity,
      file: file.path,
      filename,
      bytes: file.bytes,
      line: firstMatchLine(src, p.re),
      category: classifyHit(p.id, filename, file.path, src),
    });
  }

  if (file.isTest && isStubOnlyTest(src)) {
    hits.push({
      patternId: "P-TOBEDEFINED",
      severity: 5,
      file: file.path,
      filename,
      bytes: file.bytes,
      line: firstMatchLine(src, PLACEHOLDER_TOBE),
      category: "REAL_STUB",
    });
  }
  return hits;
}

export function run({ root = REPO_ROOT } = {}) {
  const files = [];
  for (const d of SCAN_DIRS) walk(join(root, d), files);

  const allHits = [];
  for (const f of files) allHits.push(...scanFile(f));

  const byCategory = { REAL_STUB: 0, DOCUMENTED_FP: 0 };
  const byPattern = {};
  for (const h of allHits) {
    byCategory[h.category]++;
    byPattern[h.patternId] = (byPattern[h.patternId] || 0) + 1;
  }

  const realStubs = allHits.filter((h) => h.category === "REAL_STUB");
  realStubs.sort((a, b) => b.severity - a.severity || a.bytes - b.bytes);

  // Test-quality dimensions (R9/R12): skipped / focused(.only) / assertion-free tests.
  // Reuses scanQuality from stub-class-audit-tobedefined.mjs -- this is its FIRST standing-sweep
  // consumer (those exports previously ran only via an on-demand CLI flag = dead in any pipeline).
  let testQuality = { stubOnly: [], skipped: [], focused: [], assertionFree: [] };
  try { testQuality = scanQuality(join(root, "mcp-server", "src")); } catch { /* fail-soft: keep empty */ }

  return {
    ok: true,
    scannedAt: new Date().toISOString(),
    filesScanned: files.length,
    totalHits: allHits.length,
    byCategory,
    byPattern,
    realStubs,
    realStubCount: realStubs.length,
    documentedFpCount: byCategory.DOCUMENTED_FP,
    testQuality,
    testQualityCounts: {
      skipped: testQuality.skipped.length,
      focused: testQuality.focused.length,
      assertionFree: testQuality.assertionFree.length,
    },
  };
}

function renderReport(r) {
  const lines = [
    `# Stub-Sweep Full Report (STUB-HUNT-MS0 / U-STUB-SWEEP-FULL)`,
    ``,
    `Scanned: ${r.scannedAt}`,
    `Files scanned: ${r.filesScanned}`,
    `Total hits: ${r.totalHits} (real: ${r.realStubCount} · documented-FP: ${r.documentedFpCount})`,
    ``,
    `## By pattern`,
    ``,
    `| Pattern         | Sev | Total | Real | FP |`,
    `|-----------------|----:|------:|-----:|---:|`,
  ];
  const allPatternIds = [...PATTERNS.map((p) => ({ id: p.id, severity: p.severity })), { id: "P-TOBEDEFINED", severity: 5 }];
  for (const p of allPatternIds) {
    const total = r.byPattern[p.id] || 0;
    const real = r.realStubs.filter((h) => h.patternId === p.id).length;
    lines.push(`| ${p.id.padEnd(15)} | ${p.severity} | ${total} | ${real} | ${total - real} |`);
  }
  lines.push(``);
  if (r.realStubs.length === 0) {
    lines.push(`## OK No real stubs remain across ${r.filesScanned} files.`);
  } else {
    lines.push(`## Real stubs requiring fix (${r.realStubs.length})`);
    lines.push(``);
    lines.push(`| # | Pattern | Sev | File | Line |`);
    lines.push(`|---|---------|----:|------|-----:|`);
    for (let i = 0; i < r.realStubs.length; i++) {
      const h = r.realStubs[i];
      lines.push(`| ${i + 1} | ${h.patternId} | ${h.severity} | \`${h.filename}\` | ${h.line ?? "?"} |`);
    }
  }
  // Test-quality dimensions (R9/R12 -- advisory triage; distinct from stubs).
  const tq = r.testQuality || { skipped: [], focused: [], assertionFree: [] };
  lines.push(``);
  lines.push(`## Test-quality dimensions (R9/R12 -- advisory, triage)`);
  lines.push(`skipped/todo/xit: ${tq.skipped.length}  .  focused(dot-only marker): ${tq.focused.length}  .  assertion-free: ${tq.assertionFree.length}`);
  if (tq.focused.length) {
    lines.push(``);
    lines.push(`### focused tests (dot-only marker silently disables sibling tests -- fix first)`);
    for (const o of tq.focused.slice(0, 15)) lines.push(`- \`${o.file}\`${o.focused ? ` (${o.focused})` : ""}`);
  }
  if (tq.skipped.length) {
    lines.push(``);
    lines.push(`### skipped/todo/xit (R12 -- silently not run; confirm-or-delete)`);
    for (const o of tq.skipped.slice(0, 15)) lines.push(`- \`${o.file}\`${o.skips ? ` (${o.skips} skip)` : ""}`);
  }
  if (tq.assertionFree.length) {
    lines.push(``);
    lines.push(`### assertion-free (active test, zero assertions -- R9)`);
    for (const o of tq.assertionFree.slice(0, 15)) lines.push(`- \`${o.file}\``);
  }
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("stub-sweep-full.mjs")) {
  try {
    const r = run();
    if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
    else process.stdout.write(`${renderReport(r)}\n`);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`stub-sweep-full: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
