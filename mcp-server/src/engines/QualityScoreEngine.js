import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../utils/Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_ROOT = path.resolve(__dirname, "../..");
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

const WEIGHTS = { W: 0.25, T: 0.2, P: 0.2, S: 0.15, D: 0.1, A: 0.1 };
const PHYSICS_MARKERS = [
  "physics/constants", "constants.js", "kc1_1", "kienzle", "taylor", "johnson_cook",
  "johnsoncook", "cuttingforce", "toollife", "surfacefinish", "thermal", "deflection",
  "chatter", "stability", "wear", "friction", "stress", "strain",
];
const EDGE_CASE_MARKERS = [
  "zero", "negative", "nan", "null", "undefined", "empty", "boundary", "edge",
  "overflow", "invalid", "malformed", "minimum", "maximum", ".throws", ".rejects",
];

function safeRead(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  } catch {
    return "";
  }
}

function safeListDir(dirPath) {
  try {
    return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
  } catch {
    return [];
  }
}

function round(value, decimals = 3) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function pct(part, total) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

class QualityScoreEngine {
  async compute(engineName) {
    log.info(`[QualityScore] Computing${engineName ? ` for ${engineName}` : " (full scan)"}...`);

    const indexContent = safeRead(INDEX_PATH);
    const dispatcherRefs = this._gatherDispatcherRefs();
    const schemaRefs = this._gatherSchemaRefs();
    const routeRefs = this._gatherRouteRefs();
    const apiClientRefs = this._gatherAPIClientRefs();
    const hookRefs = this._gatherHookRefs();
    const testFiles = this._gatherTestFiles();
    const engineFiles = safeListDir(ENGINES_DIR).filter(
      (file) =>
        file.endsWith(".ts") &&
        !file.endsWith(".test.ts") &&
        !file.endsWith(".d.ts") &&
        file !== "index.ts" &&
        !file.endsWith(".md"),
    );

    const scores = [];
    for (const file of engineFiles) {
      const name = file.replace(/\.ts$/, "");
      if (engineName && !name.toLowerCase().includes(engineName.toLowerCase())) continue;
      const content = safeRead(path.join(ENGINES_DIR, file));
      if (!content) continue;
      scores.push(this._scoreEngine(file, name, content, indexContent, dispatcherRefs, schemaRefs, routeRefs, apiClientRefs, hookRefs, testFiles));
    }

    const qValues = scores.map((score) => score.Q);
    const sorted = [...qValues].sort((a, b) => a - b);
    const median =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : 0;

    const dimensionAverages = { W: 0, T: 0, P: 0, S: 0, D: 0, A: 0 };
    for (const score of scores) {
      dimensionAverages.W += score.dimensions.W;
      dimensionAverages.T += score.dimensions.T;
      dimensionAverages.P += score.dimensions.P;
      dimensionAverages.S += score.dimensions.S;
      dimensionAverages.D += score.dimensions.D;
      dimensionAverages.A += score.dimensions.A;
    }

    const divisor = scores.length || 1;
    for (const key of Object.keys(dimensionAverages)) {
      dimensionAverages[key] = round(dimensionAverages[key] / divisor);
    }

    const below70 = scores.filter((score) => score.Q < 0.7);
    const alerts = [];
    if (below70.length > 0) alerts.push(`${below70.length} engines have Q < 0.70`);

    const report = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      total_engines: engineFiles.length,
      scored_engines: scores.length,
      system_Q: round(qValues.length > 0 ? Math.min(...qValues) : 0),
      mean_Q: round(qValues.reduce((acc, value) => acc + value, 0) / (qValues.length || 1)),
      median_Q: round(median),
      engines_above_90: scores.filter((score) => score.Q >= 0.9).length,
      engines_below_70: below70.length,
      dimension_averages: dimensionAverages,
      scores: scores.sort((a, b) => a.Q - b.Q),
      alerts,
    };

    this._persist(report);
    log.info(`[QualityScore] ${scores.length} engines. System Q=${report.system_Q}, Mean Q=${report.mean_Q}`);
    return report;
  }

  read() {
    const raw = safeRead(OUTPUT_PATH);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  summary(report) {
    const resolved = report ?? this.read();
    if (!resolved) return "No quality scores computed yet. Run quality_score with mode=scan first.";

    const lines = [
      "# PRISM Development Quality Score",
      `Updated: ${resolved.timestamp}`,
      `Engines: ${resolved.scored_engines}/${resolved.total_engines} scored`,
      "",
      "## Composite Scores",
      `  System Q (min):  ${resolved.system_Q}`,
      `  Mean Q:          ${resolved.mean_Q}`,
      `  Median Q:        ${resolved.median_Q}`,
      `  Above 0.90:      ${resolved.engines_above_90} (${pct(resolved.engines_above_90, resolved.scored_engines)})`,
      `  Below 0.70:      ${resolved.engines_below_70} (${pct(resolved.engines_below_70, resolved.scored_engines)})`,
      "",
      "## Dimension Averages (0-1 scale)",
      `  W (Wiring):      ${resolved.dimension_averages.W}  [weight: ${WEIGHTS.W}]`,
      `  T (Tests):       ${resolved.dimension_averages.T}  [weight: ${WEIGHTS.T}]`,
      `  P (Physics):     ${resolved.dimension_averages.P}  [weight: ${WEIGHTS.P}]`,
      `  S (Security):    ${resolved.dimension_averages.S}  [weight: ${WEIGHTS.S}]`,
      `  D (Docs):        ${resolved.dimension_averages.D}  [weight: ${WEIGHTS.D}]`,
      `  A (Automation):  ${resolved.dimension_averages.A}  [weight: ${WEIGHTS.A}]`,
    ];

    if (resolved.engines_below_70 > 0) {
      lines.push("", "## Engines Below 0.70");
      for (const score of resolved.scores.filter((entry) => entry.Q < 0.7).slice(0, 20)) {
        lines.push(`  ${score.engine_name}: Q=${score.Q} [W=${score.dimensions.W} T=${score.dimensions.T} P=${score.dimensions.P} S=${score.dimensions.S} D=${score.dimensions.D} A=${score.dimensions.A}]`);
      }
      if (resolved.engines_below_70 > 20) lines.push(`  ... and ${resolved.engines_below_70 - 20} more`);
    }

    if (resolved.alerts.length > 0) {
      lines.push("", "## Alerts");
      for (const alert of resolved.alerts) lines.push(`  - ${alert}`);
    }
    return lines.join("\n");
  }

  _scoreEngine(file, name, content, indexContent, dispatcherRefs, schemaRefs, routeRefs, apiClientRefs, hookRefs, testFiles) {
    const lowerContent = content.toLowerCase();
    const lowerName = name.toLowerCase();
    const exportedInIndex = indexContent.includes(name) || indexContent.includes(file.replace(".ts", ".js"));
    const hasDispatcherCase = dispatcherRefs.has(lowerName) || dispatcherRefs.has(file.replace(".ts", "").toLowerCase());
    const hasSchema = schemaRefs.has(lowerName);
    const hasRouteRef = routeRefs.has(lowerName);
    const hasAPIClientFn = apiClientRefs.has(lowerName);
    const wiring = {
      exported_in_index: exportedInIndex,
      has_dispatcher_case: hasDispatcherCase,
      has_schema: hasSchema,
      has_route_ref: hasRouteRef,
      has_api_client_fn: hasAPIClientFn,
    };

    const W = round((exportedInIndex ? 0.3 : 0) + (hasDispatcherCase ? 0.25 : 0) + (hasSchema ? 0.2 : 0) + (hasRouteRef ? 0.15 : 0) + (hasAPIClientFn ? 0.1 : 0));

    const testContent = testFiles.get(lowerName) || testFiles.get(lowerName.replace(/engine$/, "")) || "";
    const testFileExists = testContent.length > 0;
    const describeCount = testContent ? (testContent.match(/describe\s*\(/g) || []).length : 0;
    const itCount = testContent ? (testContent.match(/\bit\s*\(/g) || []).length : 0;
    const hasEdgeCases = testContent ? EDGE_CASE_MARKERS.some((marker) => testContent.toLowerCase().includes(marker)) : false;
    const test = {
      test_file_exists: testFileExists,
      describe_count: describeCount,
      it_count: itCount,
      has_edge_cases: hasEdgeCases,
    };

    const T = round((testFileExists ? 0.5 : 0) + (describeCount > 0 ? 0.15 : 0) + (itCount >= 3 ? 0.1 : itCount > 0 ? 0.05 : 0) + (hasEdgeCases ? 0.25 : 0));

    const isPhysics = PHYSICS_MARKERS.some((marker) => lowerContent.includes(marker));
    let P = 1;
    if (isPhysics) {
      const importsConstants = lowerContent.includes("physics/constants") || lowerContent.includes("constants.js");
      const hasFormulaRef = /\/\/.*(?:kienzle|taylor|johnson|iso\s*\d|astm|din|machiner)/i.test(content);
      const hasTypedReturns = content.includes("AtomicValue") || (content.includes("value:") && content.includes("unit:"));
      P = round((importsConstants ? 0.4 : 0) + (hasFormulaRef ? 0.3 : 0) + (hasTypedReturns ? 0.3 : 0));
    }

    const usesZod = content.includes("z.object") || content.includes("z.string") || content.includes("z.number");
    const hasInputChecks = content.includes("typeof ") || content.includes("isNaN") || content.includes("!== undefined") || content.includes("?? ") || content.includes("throw new ");
    const S = round((usesZod || hasSchema ? 0.5 : 0) + (hasInputChecks ? 0.5 : 0));

    const hasJSDoc = content.includes("/**");
    const hasParamReturns = content.includes("@param") || content.includes("@returns");
    const hasModuleDoc = content.includes("@module");
    const D = round((hasJSDoc ? 0.4 : 0) + (hasParamReturns ? 0.35 : 0) + (hasModuleDoc ? 0.25 : 0));

    const hasHookRef = hookRefs.has(lowerName);
    const hasSkillRef = lowerContent.includes("skill");
    const hasHookImport = lowerContent.includes("hookexecutor") || lowerContent.includes("executehooks") || lowerContent.includes("emitevent");
    const A = round((hasHookRef ? 0.4 : 0) + (hasSkillRef ? 0.3 : 0) + (hasHookImport ? 0.3 : 0));

    const dimensions = { W, T, P, S, D, A };
    const Q = round(WEIGHTS.W * W + WEIGHTS.T * T + WEIGHTS.P * P + WEIGHTS.S * S + WEIGHTS.D * D + WEIGHTS.A * A);
    const alerts = [];
    if (Q < 0.7) alerts.push(`Q=${Q} below 0.70`);
    if (W === 0) alerts.push("No wiring");
    if (T === 0) alerts.push("No tests");
    if (isPhysics && P < 0.5) alerts.push("Physics engine: check constants import");

    return {
      engine_file: `engines/${file}`,
      engine_name: name,
      dimensions,
      Q,
      wiring,
      test,
      is_physics_engine: isPhysics,
      alerts,
    };
  }

  _gatherDispatcherRefs() {
    const refs = new Set();
    for (const file of safeListDir(DISPATCHERS_DIR)) {
      if (!file.endsWith(".ts") || file === "index.ts" || file.endsWith(".md")) continue;
      const content = safeRead(path.join(DISPATCHERS_DIR, file)).toLowerCase();
      for (const match of content.match(/engines\/([a-z0-9_]+)/gi) || []) {
        refs.add(match.replace(/engines\//i, "").replace(/\.js$/i, "").toLowerCase());
      }
    }
    return refs;
  }

  _gatherSchemaRefs() {
    const refs = new Set();
    for (const file of safeListDir(SCHEMAS_DIR)) {
      if (!file.endsWith(".ts")) continue;
      const content = safeRead(path.join(SCHEMAS_DIR, file)).toLowerCase();
      for (const match of content.match(/[a-z]+engine/g) || []) refs.add(match);
      const prefix = file.replace(/actionschemas\.ts$/i, "").replace(/schemas\.ts$/i, "");
      if (prefix) refs.add(prefix.toLowerCase());
    }
    return refs;
  }

  _gatherRouteRefs() {
    const refs = new Set();
    for (const file of safeListDir(ROUTES_DIR)) {
      if (!file.endsWith(".ts") || file === "index.ts") continue;
      const content = safeRead(path.join(ROUTES_DIR, file)).toLowerCase();
      for (const match of content.match(/engines\/([a-z0-9_]+)/gi) || []) {
        refs.add(match.replace(/engines\//i, "").replace(/\.js$/i, "").toLowerCase());
      }
    }
    return refs;
  }

  _gatherAPIClientRefs() {
    const refs = new Set();
    for (const file of safeListDir(API_DIR)) {
      if (!file.endsWith(".ts")) continue;
      const content = safeRead(path.join(API_DIR, file)).toLowerCase();
      for (const match of content.match(/[a-z]+engine/g) || []) refs.add(match);
    }
    return refs;
  }

  _gatherHookRefs() {
    const refs = new Set();
    for (const file of safeListDir(HOOKS_DIR)) {
      if (!file.endsWith(".ts")) continue;
      const content = safeRead(path.join(HOOKS_DIR, file)).toLowerCase();
      for (const match of content.match(/engines\/([a-z0-9_]+)/gi) || []) {
        refs.add(match.replace(/engines\//i, "").replace(/\.js$/i, "").toLowerCase());
      }
      for (const match of content.match(/[a-z]+engine/g) || []) refs.add(match);
    }
    return refs;
  }

  _gatherTestFiles() {
    const engineIndex = new Map();
    const testEntries = [];
    for (const file of safeListDir(TESTS_DIR)) {
      if (!file.endsWith(".test.ts")) continue;
      const content = safeRead(path.join(TESTS_DIR, file));
      if (!content) continue;
      testEntries.push({ key: file.replace(/\.test\.ts$/, "").toLowerCase(), content });
    }

    for (const { key, content } of testEntries) {
      const engineNames = new Set();
      for (const match of content.match(/from\s+["']\.\.\/engines\/([A-Za-z0-9_]+?)(?:\.js)?["']/g) || []) {
        const nameMatch = match.match(/engines\/([A-Za-z0-9_]+)/);
        if (nameMatch) engineNames.add(nameMatch[1].toLowerCase());
      }
      for (const match of content.match(/describe\s*\(\s*["']([A-Za-z0-9_]+)["']/g) || []) {
        const nameMatch = match.match(/["']([A-Za-z0-9_]+)["']/);
        if (nameMatch) {
          const described = nameMatch[1].toLowerCase();
          if (described.includes("engine") || described.length > 5) engineNames.add(described);
        }
      }
      engineNames.add(key);
      for (const name of engineNames) {
        const existing = engineIndex.get(name) || "";
        engineIndex.set(name, existing + content);
      }
    }
    return engineIndex;
  }

  _persist(report) {
    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
      fs.writeFileSync(COMPACT_PATH, this.summary(report));
      log.info(`[QualityScore] Persisted to ${OUTPUT_PATH}`);
    } catch (error) {
      log.warn(`[QualityScore] Persist failed: ${error?.message}`);
    }
  }
}

const qualityScoreEngine = new QualityScoreEngine();

export { QualityScoreEngine, qualityScoreEngine };
