import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../utils/Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");
const SHARED_DIR = path.join(PROJECT_ROOT, "state", "shared");
const OUTPUT_PATH = path.join(SHARED_DIR, "QUALITY_DASHBOARD.json");
const QUALITY_SCORES_PATH = path.join(SHARED_DIR, "QUALITY_SCORES.json");
const SVI_PATH = path.join(SHARED_DIR, "SVI.json");
const FORMULA_ACCURACY_PATH = path.join(SHARED_DIR, "FORMULA_ACCURACY.json");
const SELF_IMPROVEMENT_PATH = path.join(SHARED_DIR, "SELF_IMPROVEMENT_PATTERNS.json");
const AUTO_FIX_PATH = path.join(SHARED_DIR, "AUTO_FIX_CANDIDATES.json");
const AUTO_FIX_PROMOTED_PATH = path.join(SHARED_DIR, "AUTO_FIX_PROMOTED.json");
const TESTS_DIR = path.join(MCP_ROOT, "src", "__tests__");
const SCHEMAS_DIR = path.join(MCP_ROOT, "src", "schemas");
const DISPATCHERS_DIR = path.join(MCP_ROOT, "src", "tools", "dispatchers");

const DOMAIN_KEYWORDS = {
  physics: ["force", "kienzle", "taylor", "deflection", "thermal", "chatter", "wear", "stability", "stress", "strain", "friction", "cutting", "surface", "speed", "feed", "torque", "power", "spindle", "coolant", "temperature", "vibration", "damping"],
  cam: ["toolpath", "postprocessor", "gcode", "cam", "adaptive", "roughing", "finishing", "drilling", "turning", "milling", "threading", "edm", "grinding", "laser", "waterjet", "fusion", "mastercam", "hypermill", "solidcam"],
  business: ["cost", "quote", "price", "invoice", "purchase", "order", "customer", "erp", "job", "scheduling", "capacity", "inventory", "payroll", "ledger", "profit", "revenue", "employee", "approval", "workflow"],
  quality: ["quality", "spc", "capability", "inspection", "calibration", "compliance", "certification", "audit", "scrap", "ncr", "capa", "dfm", "fai", "metrology"],
  system: ["session", "context", "telemetry", "pipeline", "registry", "algorithm", "agent", "dispatcher", "schema", "variability", "improvement", "autofix", "autowiring", "dashboard", "formula", "validation", "milestone", "config", "bootstrap"],
};

function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
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

function derivePsiPct(sviData) {
  if (typeof sviData?.psi_pct === "number") return sviData.psi_pct;
  if (typeof sviData?.reachability_pct === "number") return sviData.reachability_pct;
  if (typeof sviData?.psi_reachability === "number") return round(sviData.psi_reachability * 100, 1);
  if (typeof sviData?.total_reachable === "number" && typeof sviData?.total_variability === "number" && sviData.total_variability > 0) {
    return round((sviData.total_reachable / sviData.total_variability) * 100, 1);
  }
  if (typeof sviData?.psi_display === "string") {
    const parsed = Number.parseFloat(sviData.psi_display.replace("%", "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function classifyDomain(engineName) {
  const lower = engineName.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return domain;
  }
  return "other";
}

class QualityDashboardEngine {
  constructor() {
    this._cached = null;
  }

  compute() {
    log.info("[QualityDashboard] Computing dashboard snapshot...");

    const qualityScores = safeReadJSON(QUALITY_SCORES_PATH);
    const sviData = safeReadJSON(SVI_PATH);
    const formulaData = safeReadJSON(FORMULA_ACCURACY_PATH);
    const improvementData = safeReadJSON(SELF_IMPROVEMENT_PATH);
    const autoFixData = safeReadJSON(AUTO_FIX_PATH);
    const promotedData = safeReadJSON(AUTO_FIX_PROMOTED_PATH);

    const scores = qualityScores?.scores ?? [];
    const systemQ = qualityScores?.system_Q ?? 0;
    const meanQ = qualityScores?.mean_Q ?? 0;
    const totalEngines = qualityScores?.scored_engines ?? 0;
    const above90 = qualityScores?.engines_above_90 ?? 0;
    const below70 = qualityScores?.engines_below_70 ?? 0;
    const dimensionAverages = qualityScores?.dimension_averages ?? { W: 0, T: 0, P: 0, S: 0, D: 0, A: 0 };

    const psiPct = derivePsiPct(sviData);
    const patternsDetected = improvementData?.total_patterns ?? 0;
    const fixesPromoted = Array.isArray(promotedData) ? promotedData.length : promotedData?.promoted_count ?? 0;
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      system_Q: systemQ,
      mean_Q: meanQ,
      total_engines: totalEngines,
      engines_above_90: above90,
      engines_below_70: below70,
      dimension_averages: dimensionAverages,
      svi: {
        value: String(sviData?.svi_display ?? sviData?.svi ?? "unknown"),
        psi_pct: psiPct,
        trend: sviData?.trend ?? "unknown",
        subsystem_count: sviData?.subsystems?.length ?? 0,
      },
      formula_accuracy: {
        aggregate_accuracy: formulaData?.aggregate_accuracy ?? 0,
        formulas_validated: formulaData?.total_formulas ?? 0,
        formulas_passed: formulaData?.passed ?? 0,
        formulas_failed: formulaData?.failed ?? 0,
      },
      improvement: {
        patterns_detected: patternsDetected,
        fixes_generated: autoFixData?.candidates_generated ?? 0,
        fixes_promoted: fixesPromoted,
        improvement_rate: patternsDetected > 0 ? round(fixesPromoted / patternsDetected) : 0,
      },
      tests: {
        test_files: safeListDir(TESTS_DIR).filter((file) => file.endsWith(".test.ts")).length,
        pass_rate: this._estimateTestPassRate(),
      },
      schema_coverage: this._computeSchemaCoverage(),
      domains: this._computeDomainMetrics(scores),
      alerts: this._generateAlerts(systemQ, below70, psiPct, formulaData?.aggregate_accuracy ?? 0, this._estimateTestPassRate(), this._computeSchemaCoverage().coverage_pct, patternsDetected),
      trend: [...(this.read()?.trend ?? []).slice(-9), { timestamp: new Date().toISOString(), system_Q: systemQ, mean_Q: meanQ, psi_pct: psiPct, formula_accuracy: formulaData?.aggregate_accuracy ?? 0 }],
    };

    this._cached = snapshot;
    this._persist(snapshot);
    log.info(`[QualityDashboard] Snapshot complete: Q=${systemQ}, Psi=${psiPct}%, ${snapshot.alerts.length} alerts`);
    return snapshot;
  }

  read() {
    if (this._cached) return this._cached;
    return safeReadJSON(OUTPUT_PATH);
  }

  summary() {
    const dashboard = this.read();
    if (!dashboard) return "No dashboard data yet. Run quality_dashboard first.";
    const lines = [
      "# PRISM Quality Dashboard",
      `Updated: ${dashboard.timestamp}`,
      "",
      "## System Health",
      `  System Q (min): ${dashboard.system_Q}  |  Mean Q: ${dashboard.mean_Q}`,
      `  Engines: ${dashboard.total_engines} scored  |  Above 0.90: ${dashboard.engines_above_90}  |  Below 0.70: ${dashboard.engines_below_70}`,
    ];
    return lines.join("\n");
  }

  _computeDomainMetrics(scores) {
    const domainMap = new Map();
    for (const score of scores) {
      const domain = classifyDomain(score.engine_name ?? "");
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain).push(score);
    }
    const result = [];
    for (const [domain, engines] of domainMap.entries()) {
      const qValues = engines.map((engine) => engine.Q ?? 0);
      const above90 = qValues.filter((value) => value >= 0.9).length;
      result.push({
        domain,
        engine_count: engines.length,
        mean_Q: round(qValues.reduce((acc, value) => acc + value, 0) / (qValues.length || 1)),
        min_Q: round(Math.min(...(qValues.length > 0 ? qValues : [0]))),
        above_90_pct: round(qValues.length > 0 ? (above90 / qValues.length) * 100 : 0, 1),
        below_70_count: qValues.filter((value) => value < 0.7).length,
      });
    }
    return result.sort((a, b) => a.mean_Q - b.mean_Q);
  }

  _computeSchemaCoverage() {
    let totalActions = 0;
    let actionsWithSchema = 0;
    const schemaContent = new Map();
    for (const file of safeListDir(SCHEMAS_DIR)) {
      if (!file.endsWith(".ts")) continue;
      try {
        schemaContent.set(file, fs.readFileSync(path.join(SCHEMAS_DIR, file), "utf-8").toLowerCase());
      } catch {}
    }
    for (const file of safeListDir(DISPATCHERS_DIR)) {
      if (!file.endsWith(".ts") || file === "index.ts" || file.endsWith(".md")) continue;
      try {
        const content = fs.readFileSync(path.join(DISPATCHERS_DIR, file), "utf-8");
        const enumMatch = content.match(/\["([^\]]+)"\]\s*as\s*const/);
        if (!enumMatch) continue;
        const actions = content.match(/"([a-z_]+)"/g)?.slice(0, 200) ?? [];
        const uniqueActions = new Set(actions.map((action) => action.replace(/"/g, "")));
        totalActions += uniqueActions.size;
        const prefix = file.replace(/Dispatcher\.ts$/, "").toLowerCase();
        for (const [schemaFile, schemaText] of schemaContent.entries()) {
          if (!schemaFile.toLowerCase().includes(prefix)) continue;
          for (const action of uniqueActions) {
            if (schemaText.includes(action)) actionsWithSchema++;
          }
          break;
        }
      } catch {}
    }
    return {
      actions_with_schema: actionsWithSchema,
      total_actions: totalActions,
      coverage_pct: totalActions > 0 ? round((actionsWithSchema / totalActions) * 100, 1) : 0,
    };
  }

  _estimateTestPassRate() {
    const tracker = safeReadJSON(path.join(PROJECT_ROOT, "state", "session-test-tracker.json"));
    if (tracker?.pass_rate !== undefined) return round(tracker.pass_rate);
    if (tracker?.passed !== undefined && tracker?.total !== undefined && tracker.total > 0) {
      return round(tracker.passed / tracker.total);
    }
    return 1;
  }

  _generateAlerts(systemQ, below70, psiPct, accuracy, passRate, schemaCoverage, patterns) {
    const alerts = [];
    const now = new Date().toISOString();
    if (systemQ < 0.5) alerts.push({ severity: "critical", category: "quality", message: `System Q=${systemQ} critically low (<0.50)`, timestamp: now });
    else if (systemQ < 0.7) alerts.push({ severity: "high", category: "quality", message: `System Q=${systemQ} below target (<0.70)`, timestamp: now });
    if (below70 > 50) alerts.push({ severity: "high", category: "quality", message: `${below70} engines below Q=0.70`, timestamp: now });
    else if (below70 > 20) alerts.push({ severity: "medium", category: "quality", message: `${below70} engines below Q=0.70`, timestamp: now });
    if (accuracy > 0 && accuracy < 0.9) alerts.push({ severity: "critical", category: "physics", message: `Formula accuracy=${accuracy} below 0.90`, timestamp: now });
    else if (accuracy > 0 && accuracy < 0.95) alerts.push({ severity: "high", category: "physics", message: `Formula accuracy=${accuracy} below 0.95 target`, timestamp: now });
    if (psiPct > 0 && psiPct < 30) alerts.push({ severity: "high", category: "svi", message: `Psi=${psiPct}% reachability low (<30%)`, timestamp: now });
    if (passRate < 0.95 && passRate > 0) alerts.push({ severity: "high", category: "tests", message: `Test pass rate=${passRate} below 0.95`, timestamp: now });
    if (schemaCoverage < 80 && schemaCoverage > 0) alerts.push({ severity: "medium", category: "schemas", message: `Schema coverage=${schemaCoverage}% below 80%`, timestamp: now });
    if (patterns > 20) alerts.push({ severity: "medium", category: "improvement", message: `${patterns} improvement patterns detected - review auto-fix candidates`, timestamp: now });
    return alerts;
  }

  _persist(snapshot) {
    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
      log.info(`[QualityDashboard] Persisted to ${OUTPUT_PATH}`);
    } catch (error) {
      log.warn(`[QualityDashboard] Persist failed: ${error?.message}`);
    }
  }
}

const qualityDashboardEngine = new QualityDashboardEngine();

export { QualityDashboardEngine, qualityDashboardEngine };
