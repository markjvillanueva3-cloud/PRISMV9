/**
 * QualityScoreEngine — AUTO-0: Development Quality Scorer
 *
 * NOTE: This is a SOFTWARE DEVELOPMENT quality scorer for codebase health.
 * It does NOT perform manufacturing quality analysis (SPC, Cpk, ISO 4287).
 * For manufacturing quality, see:
 *   - ProcessCapabilityPredictionEngine (Cp/Cpk per Montgomery/ISO 22514)
 *   - QualityManagementEngine (SPC charting, calibration)
 *   - SPCProcessCapabilityEngine (control charts, Nelson rules)
 *   - QualityFormulasEngine (quality engineering formulas)
 *
 * Quality dimensions (each 0-1):
 *   W = Wiring completeness (export → dispatcher → schema → route → API client)
 *   T = Test coverage (test file exists, has describe/it blocks, edge cases)
 *   P = Physics accuracy (imports constants, has formula refs, returns typed values)
 *   S = Security posture (Zod validation, input checks)
 *   D = Documentation (JSDoc, @param/@returns)
 *   A = Automation level (hook refs, skill refs)
 *
 * Composite: Q = 0.25W + 0.20T + 0.20P + 0.15S + 0.10D + 0.10A
 * Target: Q >= 0.90 for every engine.
 *
 * Mathematical Foundation (from MCP-AUTOMATION-HARDENING-ROADMAP.md):
 *   Gap = Q_max - Q_current  (Q_max = 1.0)
 *   Monotonic improvement: Q(t+1) >= Q(t) for all t
 *
 * Stores results in H:/prism/state/shared/QUALITY_SCORES.json
 *
 * @module QualityScoreEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface QualityDimensions {
  W: number;
  T: number;
  P: number;
  S: number;
  D: number;
  A: number;
}

export interface WiringDetail {
  exported_in_index: boolean;
  has_dispatcher_case: boolean;
  has_schema: boolean;
  has_route_ref: boolean;
  has_api_client_fn: boolean;
}

export interface TestDetail {
  test_file_exists: boolean;
  describe_count: number;
  it_count: number;
  has_edge_cases: boolean;
}

export interface EngineQualityScore {
  engine_file: string;
  engine_name: string;
  dimensions: QualityDimensions;
  Q: number;
  wiring: WiringDetail;
  test: TestDetail;
  is_physics_engine: boolean;
  alerts: string[];
}

export interface QualityReport {
  timestamp: string;
  version: string;
  total_engines: number;
  scored_engines: number;
  system_Q: number;
  mean_Q: number;
  median_Q: number;
  engines_above_90: number;
  engines_below_70: number;
  dimension_averages: QualityDimensions;
  scores: EngineQualityScore[];
  alerts: string[];
}

// ============================================================================
// WEIGHTS — from MCP-AUTOMATION-HARDENING-ROADMAP.md
// ============================================================================

const WEIGHTS = {
  W: 0.25,
  T: 0.20,
  P: 0.20,
  S: 0.15,
  D: 0.10,
  A: 0.10,
} as const;

// ============================================================================
// PATHS
// ============================================================================

// Resolve paths correctly whether running from source (vitest) or dist (bundle).
// In source: import.meta.dirname = .../mcp-server/src/engines/
// In dist bundle: import.meta.dirname = .../mcp-server/dist/ (esbuild single file)
const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")   // source: src/engines → mcp-server
  : path.resolve(import.meta.dirname, "..");     // dist: dist → mcp-server
const SRC_DIR = path.join(MCP_ROOT, "src");
const ENGINES_DIR = path.join(SRC_DIR, "engines");
const DISPATCHERS_DIR = path.join(SRC_DIR, "tools", "dispatchers");
const SCHEMAS_DIR = path.join(SRC_DIR, "schemas");
const ROUTES_DIR = path.join(SRC_DIR, "routes");
const TESTS_DIR = path.join(SRC_DIR, "__tests__");
const API_DIR = path.join(MCP_ROOT, "web", "src", "api");
const HOOKS_DIR = path.join(SRC_DIR, "hooks");
const INDEX_PATH = path.join(ENGINES_DIR, "index.ts");

const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "state", "shared", "QUALITY_SCORES.json");
const COMPACT_PATH = path.join(PROJECT_ROOT, "state", "shared", "QUALITY_SCORES_COMPACT.md");

const PHYSICS_MARKERS = [
  "physics/constants", "constants.js",
  "kc1_1", "kienzle", "taylor", "johnson_cook", "johnsoncook",
  "cuttingforce", "toollife", "surfacefinish",
  "thermal", "deflection", "chatter", "stability",
  "wear", "friction", "stress", "strain",
];

const EDGE_CASE_MARKERS = [
  "zero", "negative", "nan", "null", "undefined", "empty",
  "boundary", "edge", "overflow", "invalid", "malformed",
  "minimum", "maximum", ".throws", ".rejects",
];

// ============================================================================
// HELPERS
// ============================================================================

function safeRead(filePath: string): string {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  } catch { return ""; }
}

function safeListDir(dirPath: string): string[] {
  try {
    return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
  } catch { return []; }
}

function round(v: number, decimals = 3): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

// ============================================================================
// ENGINE
// ============================================================================

class QualityScoreEngine {

  /**
   * Compute development quality scores for all engines, or a single engine by name.
   * @param engineName Optional filter — if provided, scores only matching engines
   * @returns QualityReport with per-engine scores and system aggregates
   */
  async compute(engineName?: string): Promise<QualityReport> {
    log.info(`[QualityScore] Computing${engineName ? ` for ${engineName}` : " (full scan)"}...`);

    const indexContent = safeRead(INDEX_PATH);
    const dispatcherRefs = this._gatherDispatcherRefs();
    const schemaRefs = this._gatherSchemaRefs();
    const routeRefs = this._gatherRouteRefs();
    const apiClientRefs = this._gatherAPIClientRefs();
    const hookRefs = this._gatherHookRefs();
    const testFiles = this._gatherTestFiles();

    const engineFiles = safeListDir(ENGINES_DIR)
      .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")
        && f !== "index.ts" && !f.endsWith(".md"));

    const scores: EngineQualityScore[] = [];
    for (const file of engineFiles) {
      const name = file.replace(/\.ts$/, "");
      if (engineName && !name.toLowerCase().includes(engineName.toLowerCase())) continue;
      const content = safeRead(path.join(ENGINES_DIR, file));
      if (!content) continue;
      scores.push(this._scoreEngine(file, name, content, indexContent, dispatcherRefs, schemaRefs, routeRefs, apiClientRefs, hookRefs, testFiles));
    }

    const qValues = scores.map(s => s.Q);
    const sorted = [...qValues].sort((a, b) => a - b);
    const median = sorted.length > 0
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : 0;

    const dimAvg: QualityDimensions = { W: 0, T: 0, P: 0, S: 0, D: 0, A: 0 };
    for (const s of scores) {
      dimAvg.W += s.dimensions.W; dimAvg.T += s.dimensions.T;
      dimAvg.P += s.dimensions.P; dimAvg.S += s.dimensions.S;
      dimAvg.D += s.dimensions.D; dimAvg.A += s.dimensions.A;
    }
    const n = scores.length || 1;
    dimAvg.W = round(dimAvg.W / n); dimAvg.T = round(dimAvg.T / n);
    dimAvg.P = round(dimAvg.P / n); dimAvg.S = round(dimAvg.S / n);
    dimAvg.D = round(dimAvg.D / n); dimAvg.A = round(dimAvg.A / n);

    const alerts: string[] = [];
    const below70 = scores.filter(s => s.Q < 0.70);
    if (below70.length > 0) alerts.push(`${below70.length} engines have Q < 0.70`);

    const report: QualityReport = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      total_engines: engineFiles.length,
      scored_engines: scores.length,
      system_Q: round(qValues.length > 0 ? Math.min(...qValues) : 0),
      mean_Q: round(qValues.reduce((a, b) => a + b, 0) / (qValues.length || 1)),
      median_Q: round(median),
      engines_above_90: scores.filter(s => s.Q >= 0.90).length,
      engines_below_70: below70.length,
      dimension_averages: dimAvg,
      scores: scores.sort((a, b) => a.Q - b.Q),
      alerts,
    };

    this._persist(report);
    log.info(`[QualityScore] ${scores.length} engines. System Q=${report.system_Q}, Mean Q=${report.mean_Q}`);
    return report;
  }

  /**
   * Read the last computed quality report from disk.
   * @returns QualityReport or null if not yet computed
   */
  read(): QualityReport | null {
    const raw = safeRead(OUTPUT_PATH);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /**
   * Get a compact summary suitable for terminal/agent context.
   * @param report Optional report; reads from disk if omitted
   * @returns Multi-line markdown summary
   */
  summary(report?: QualityReport | null): string {
    const r = report ?? this.read();
    if (!r) return "No quality scores computed yet. Run quality_score with mode=scan first.";

    const lines: string[] = [
      `# PRISM Development Quality Score`,
      `Updated: ${r.timestamp}`,
      `Engines: ${r.scored_engines}/${r.total_engines} scored`,
      ``,
      `## Composite Scores`,
      `  System Q (min):  ${r.system_Q}`,
      `  Mean Q:          ${r.mean_Q}`,
      `  Median Q:        ${r.median_Q}`,
      `  Above 0.90:      ${r.engines_above_90} (${pct(r.engines_above_90, r.scored_engines)})`,
      `  Below 0.70:      ${r.engines_below_70} (${pct(r.engines_below_70, r.scored_engines)})`,
      ``,
      `## Dimension Averages (0-1 scale)`,
      `  W (Wiring):      ${r.dimension_averages.W}  [weight: ${WEIGHTS.W}]`,
      `  T (Tests):       ${r.dimension_averages.T}  [weight: ${WEIGHTS.T}]`,
      `  P (Physics):     ${r.dimension_averages.P}  [weight: ${WEIGHTS.P}]`,
      `  S (Security):    ${r.dimension_averages.S}  [weight: ${WEIGHTS.S}]`,
      `  D (Docs):        ${r.dimension_averages.D}  [weight: ${WEIGHTS.D}]`,
      `  A (Automation):  ${r.dimension_averages.A}  [weight: ${WEIGHTS.A}]`,
    ];

    if (r.engines_below_70 > 0) {
      lines.push(``, `## Engines Below 0.70`);
      for (const s of r.scores.filter(s => s.Q < 0.70).slice(0, 20)) {
        lines.push(`  ${s.engine_name}: Q=${s.Q} [W=${s.dimensions.W} T=${s.dimensions.T} P=${s.dimensions.P} S=${s.dimensions.S} D=${s.dimensions.D} A=${s.dimensions.A}]`);
      }
      if (r.engines_below_70 > 20) lines.push(`  ... and ${r.engines_below_70 - 20} more`);
    }

    if (r.alerts.length > 0) {
      lines.push(``, `## Alerts`);
      for (const a of r.alerts) lines.push(`  - ${a}`);
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // PER-ENGINE SCORING
  // ==========================================================================

  private _scoreEngine(
    file: string, name: string, content: string,
    indexContent: string, dispatcherRefs: Set<string>, schemaRefs: Set<string>,
    routeRefs: Set<string>, apiClientRefs: Set<string>, hookRefs: Set<string>,
    testFiles: Map<string, string>,
  ): EngineQualityScore {
    const lowerContent = content.toLowerCase();
    const lowerName = name.toLowerCase();

    // W: Wiring
    const exportedInIndex = indexContent.includes(name) || indexContent.includes(file.replace(".ts", ".js"));
    const hasDispatcherCase = dispatcherRefs.has(lowerName) || dispatcherRefs.has(file.replace(".ts", "").toLowerCase());
    const hasSchema = schemaRefs.has(lowerName);
    const hasRouteRef = routeRefs.has(lowerName);
    const hasAPIClientFn = apiClientRefs.has(lowerName);
    const wiring: WiringDetail = { exported_in_index: exportedInIndex, has_dispatcher_case: hasDispatcherCase, has_schema: hasSchema, has_route_ref: hasRouteRef, has_api_client_fn: hasAPIClientFn };
    const W = round((exportedInIndex ? 0.30 : 0) + (hasDispatcherCase ? 0.25 : 0) + (hasSchema ? 0.20 : 0) + (hasRouteRef ? 0.15 : 0) + (hasAPIClientFn ? 0.10 : 0));

    // T: Tests — use reverse index (handles bundled test files like batch34-engines.test.ts)
    const testContent = testFiles.get(lowerName) || testFiles.get(lowerName.replace(/engine$/, "")) || "";
    const testFileExists = testContent.length > 0;
    const describeCount = testContent ? (testContent.match(/describe\s*\(/g) || []).length : 0;
    const itCount = testContent ? (testContent.match(/\bit\s*\(/g) || []).length : 0;
    const hasEdgeCases = testContent ? EDGE_CASE_MARKERS.some(m => testContent.toLowerCase().includes(m)) : false;
    const test: TestDetail = { test_file_exists: testFileExists, describe_count: describeCount, it_count: itCount, has_edge_cases: hasEdgeCases };
    const T = round((testFileExists ? 0.50 : 0) + (describeCount > 0 ? 0.15 : 0) + (itCount >= 3 ? 0.10 : itCount > 0 ? 0.05 : 0) + (hasEdgeCases ? 0.25 : 0));

    // P: Physics
    const isPhysics = PHYSICS_MARKERS.some(m => lowerContent.includes(m));
    let P: number;
    if (!isPhysics) {
      P = 1.0;
    } else {
      const importsConstants = lowerContent.includes("physics/constants") || lowerContent.includes("constants.js");
      const hasFormulaRef = /\/\/.*(?:kienzle|taylor|johnson|iso\s*\d|astm|din|machiner)/i.test(content);
      const hasTypedReturns = content.includes("AtomicValue") || (content.includes("value:") && content.includes("unit:"));
      P = round((importsConstants ? 0.40 : 0) + (hasFormulaRef ? 0.30 : 0) + (hasTypedReturns ? 0.30 : 0));
    }

    // S: Security — credit both inline Zod AND schema-layer validation (schemas/ directory)
    const usesZod = content.includes("z.object") || content.includes("z.string") || content.includes("z.number");
    const hasSchemaLayerValidation = hasSchema; // from W dimension: schema exists in schemas/ dir
    const hasInputChecks = content.includes("typeof ") || content.includes("isNaN") || content.includes("!== undefined") || content.includes("?? ") || content.includes("throw new ");
    const S = round(
      ((usesZod || hasSchemaLayerValidation) ? 0.50 : 0)
      + (hasInputChecks ? 0.50 : 0)
    );

    // D: Documentation
    const hasJSDoc = content.includes("/**");
    const hasParamReturns = content.includes("@param") || content.includes("@returns");
    const hasModuleDoc = content.includes("@module");
    const D = round((hasJSDoc ? 0.40 : 0) + (hasParamReturns ? 0.35 : 0) + (hasModuleDoc ? 0.25 : 0));

    // A: Automation
    const hasHookRef = hookRefs.has(lowerName);
    const hasSkillRef = lowerContent.includes("skill");
    const hasHookImport = lowerContent.includes("hookexecutor") || lowerContent.includes("executehooks") || lowerContent.includes("emitevent");
    const A = round((hasHookRef ? 0.40 : 0) + (hasSkillRef ? 0.30 : 0) + (hasHookImport ? 0.30 : 0));

    const dimensions: QualityDimensions = { W, T, P, S, D, A };
    const Q = round(WEIGHTS.W * W + WEIGHTS.T * T + WEIGHTS.P * P + WEIGHTS.S * S + WEIGHTS.D * D + WEIGHTS.A * A);

    const alerts: string[] = [];
    if (Q < 0.70) alerts.push(`Q=${Q} below 0.70`);
    if (W === 0) alerts.push("No wiring");
    if (T === 0) alerts.push("No tests");
    if (isPhysics && P < 0.50) alerts.push("Physics engine: check constants import");

    return { engine_file: `engines/${file}`, engine_name: name, dimensions, Q, wiring, test, is_physics_engine: isPhysics, alerts };
  }

  // ==========================================================================
  // REFERENCE DATA GATHERERS
  // ==========================================================================

  /** @returns Set of lowercase engine names referenced in dispatcher files */
  private _gatherDispatcherRefs(): Set<string> {
    const refs = new Set<string>();
    for (const f of safeListDir(DISPATCHERS_DIR)) {
      if (!f.endsWith(".ts") || f === "index.ts" || f.endsWith(".md")) continue;
      const content = safeRead(path.join(DISPATCHERS_DIR, f)).toLowerCase();
      for (const m of content.match(/engines\/([a-z0-9_]+)/gi) || [])
        refs.add(m.replace(/engines\//i, "").replace(/\.js$/i, "").toLowerCase());
    }
    return refs;
  }

  /** @returns Set of lowercase engine names referenced in schema files */
  private _gatherSchemaRefs(): Set<string> {
    const refs = new Set<string>();
    for (const f of safeListDir(SCHEMAS_DIR)) {
      if (!f.endsWith(".ts")) continue;
      const content = safeRead(path.join(SCHEMAS_DIR, f)).toLowerCase();
      for (const m of content.match(/[a-z]+engine/g) || []) refs.add(m);
      const prefix = f.replace(/actionschemas\.ts$/i, "").replace(/schemas\.ts$/i, "");
      if (prefix) refs.add(prefix.toLowerCase());
    }
    return refs;
  }

  /** @returns Set of lowercase engine names referenced in route files */
  private _gatherRouteRefs(): Set<string> {
    const refs = new Set<string>();
    for (const f of safeListDir(ROUTES_DIR)) {
      if (!f.endsWith(".ts") || f === "index.ts") continue;
      const content = safeRead(path.join(ROUTES_DIR, f)).toLowerCase();
      for (const m of content.match(/engines\/([a-z0-9_]+)/gi) || [])
        refs.add(m.replace(/engines\//i, "").replace(/\.js$/i, "").toLowerCase());
    }
    return refs;
  }

  /** @returns Set of lowercase engine names referenced in API client files */
  private _gatherAPIClientRefs(): Set<string> {
    const refs = new Set<string>();
    for (const f of safeListDir(API_DIR)) {
      if (!f.endsWith(".ts")) continue;
      const content = safeRead(path.join(API_DIR, f)).toLowerCase();
      for (const m of content.match(/[a-z]+engine/g) || []) refs.add(m);
    }
    return refs;
  }

  /** @returns Set of lowercase engine names referenced in hook files */
  private _gatherHookRefs(): Set<string> {
    const refs = new Set<string>();
    for (const f of safeListDir(HOOKS_DIR)) {
      if (!f.endsWith(".ts")) continue;
      const content = safeRead(path.join(HOOKS_DIR, f)).toLowerCase();
      for (const m of content.match(/engines\/([a-z0-9_]+)/gi) || [])
        refs.add(m.replace(/engines\//i, "").replace(/\.js$/i, "").toLowerCase());
      for (const m of content.match(/[a-z]+engine/g) || []) refs.add(m);
    }
    return refs;
  }

  /**
   * Build a reverse index: for each engine name (lowercase), collect all test
   * file contents that reference it via imports or describe() blocks.
   * This handles bundled test files (e.g., batch34-engines.test.ts testing 13 engines).
   * @returns Map of lowercase engine name to concatenated test content that covers it
   */
  private _gatherTestFiles(): Map<string, string> {
    const engineIndex = new Map<string, string>();
    const testEntries: Array<{ key: string; content: string }> = [];

    for (const f of safeListDir(TESTS_DIR)) {
      if (!f.endsWith(".test.ts")) continue;
      const content = safeRead(path.join(TESTS_DIR, f));
      if (!content) continue;
      const key = f.replace(/\.test\.ts$/, "").toLowerCase();
      testEntries.push({ key, content });
    }

    // For each test file, extract all engine references from:
    // 1. imports: from "../engines/FooEngine.js" or from "../engines/FooEngine"
    // 2. describe blocks: describe("FooEngine", ...)
    // 3. variable references: fooEngine
    for (const { key, content } of testEntries) {
      const lowerContent = content.toLowerCase();

      // Extract engine names from import paths
      const importMatches = content.match(/from\s+["']\.\.\/engines\/([A-Za-z0-9_]+?)(?:\.js)?["']/g) || [];
      const engineNames = new Set<string>();
      for (const m of importMatches) {
        const nameMatch = m.match(/engines\/([A-Za-z0-9_]+)/);
        if (nameMatch) engineNames.add(nameMatch[1].toLowerCase());
      }

      // Extract engine names from describe() blocks
      const describeMatches = content.match(/describe\s*\(\s*["']([A-Za-z0-9_]+)["']/g) || [];
      for (const m of describeMatches) {
        const nameMatch = m.match(/["']([A-Za-z0-9_]+)["']/);
        if (nameMatch) {
          const dn = nameMatch[1].toLowerCase();
          if (dn.includes("engine") || dn.length > 5) engineNames.add(dn);
        }
      }

      // Also keep the file-name-based key for direct matches (e.g., FooEngine.test.ts)
      engineNames.add(key);

      for (const name of engineNames) {
        const existing = engineIndex.get(name) || "";
        engineIndex.set(name, existing + content);
      }
    }

    return engineIndex;
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private _persist(report: QualityReport): void {
    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
      fs.writeFileSync(COMPACT_PATH, this.summary(report));
      log.info(`[QualityScore] Persisted to ${OUTPUT_PATH}`);
    } catch (e: any) {
      log.warn(`[QualityScore] Persist failed: ${e?.message}`);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const qualityScoreEngine = new QualityScoreEngine();
export { QualityScoreEngine };
