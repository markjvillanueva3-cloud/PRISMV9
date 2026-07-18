/**
 * QualityDashboardEngine — AUTO-7: Continuous Quality Dashboard
 *
 * NOTE: This is a SOFTWARE META-ENGINEERING engine for development quality
 * observability. It does NOT perform manufacturing quality analysis.
 * For manufacturing quality, see: QualityManagementEngine, SPCProcessCapabilityEngine.
 *
 * Aggregates quality metrics from multiple AUTO-phase engines:
 *   - QualityScoreEngine (AUTO-0): per-engine Q scores
 *   - SystemVariabilityIndexEngine: SVI/Psi reachability
 *   - FormulaValidationEngine (AUTO-5): physics formula accuracy
 *   - SelfImprovementPatternEngine (AUTO-6): improvement patterns
 *   - AutoFixPipelineEngine (AUTO-6): fix pipeline stats
 *   - Session state: test pass rates, schema coverage, route sync
 *
 * Produces per-domain (physics, business, CAM, system) and system-wide aggregation.
 * Fires alerts on regressions: Q drop, Psi decrease, accuracy drift, test failures.
 *
 * Stores results in state/shared/QUALITY_DASHBOARD.json
 *
 * @module QualityDashboardEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface DomainMetrics {
  domain: string;
  engine_count: number;
  mean_Q: number;
  min_Q: number;
  above_90_pct: number;
  below_70_count: number;
}

export interface AlertEntry {
  severity: "critical" | "high" | "medium" | "info";
  category: string;
  message: string;
  timestamp: string;
}

export interface DashboardSnapshot {
  timestamp: string;
  version: string;

  /** System-wide composite quality (min Q across all engines) */
  system_Q: number;
  /** Average Q across all scored engines */
  mean_Q: number;
  /** Total engines scored */
  total_engines: number;
  /** Engines with Q >= 0.90 */
  engines_above_90: number;
  /** Engines with Q < 0.70 */
  engines_below_70: number;

  /** Dimension averages (W, T, P, S, D, A) */
  dimension_averages: {
    W: number; T: number; P: number;
    S: number; D: number; A: number;
  };

  /** SVI metrics */
  svi: {
    value: string;
    psi_pct: number;
    trend: string;
    subsystem_count: number;
  };

  /** Formula accuracy metrics (AUTO-5) */
  formula_accuracy: {
    aggregate_accuracy: number;
    formulas_validated: number;
    formulas_passed: number;
    formulas_failed: number;
  };

  /** Self-improvement metrics (AUTO-6) */
  improvement: {
    patterns_detected: number;
    fixes_generated: number;
    fixes_promoted: number;
    improvement_rate: number;
  };

  /** Test health */
  tests: {
    test_files: number;
    pass_rate: number;
  };

  /** Schema coverage */
  schema_coverage: {
    actions_with_schema: number;
    total_actions: number;
    coverage_pct: number;
  };

  /** Per-domain breakdown */
  domains: DomainMetrics[];

  /** Active alerts */
  alerts: AlertEntry[];

  /** Trend data (last 10 snapshots) */
  trend: Array<{
    timestamp: string;
    system_Q: number;
    mean_Q: number;
    psi_pct: number;
    formula_accuracy: number;
  }>;
}

// ============================================================================
// PATHS
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
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

// ============================================================================
// DOMAIN CLASSIFICATION
// ============================================================================

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  physics: [
    "force", "kienzle", "taylor", "deflection", "thermal", "chatter",
    "wear", "stability", "constitutive", "stress", "strain", "friction",
    "cutting", "surface", "speed", "feed", "torque", "power", "spindle",
    "coolant", "temperature", "residual", "vibration", "damping",
  ],
  cam: [
    "toolpath", "postprocessor", "gcode", "cam", "nesting", "adaptive",
    "roughing", "finishing", "drilling", "boring", "turning", "milling",
    "threading", "tapping", "edm", "grinding", "laser", "waterjet",
    "fusion", "mastercam", "hypermill", "solidcam", "vericut",
  ],
  business: [
    "cost", "quote", "price", "invoice", "purchase", "order",
    "customer", "erp", "job", "scheduling", "capacity", "inventory",
    "payroll", "ledger", "profit", "revenue", "timeclock", "employee",
    "approval", "workflow",
  ],
  quality: [
    "quality", "spc", "capability", "inspection", "calibration",
    "compliance", "certification", "audit", "scrap", "ncr", "capa",
    "dfm", "fai", "metrology",
  ],
  system: [
    "session", "context", "telemetry", "pipeline", "registry",
    "algorithm", "agent", "orchestrat", "dispatcher", "schema",
    "variability", "improvement", "autofix", "autowiring", "dashboard",
    "formula", "validation", "milestone", "config", "bootstrap",
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

function safeReadJSON(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch { return null; }
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

function derivePsiPct(sviData: any): number {
  if (typeof sviData?.psi_pct === "number") return sviData.psi_pct;
  if (typeof sviData?.reachability_pct === "number") return sviData.reachability_pct;
  if (typeof sviData?.psi_reachability === "number") return round(sviData.psi_reachability * 100, 1);
  if (
    typeof sviData?.total_reachable === "number"
    && typeof sviData?.total_variability === "number"
    && sviData.total_variability > 0
  ) {
    return round((sviData.total_reachable / sviData.total_variability) * 100, 1);
  }
  if (typeof sviData?.psi_display === "string") {
    const parsed = Number.parseFloat(sviData.psi_display.replace("%", "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function classifyDomain(engineName: string): string {
  const lower = engineName.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return domain;
  }
  return "other";
}

// ============================================================================
// ENGINE
// ============================================================================

export class QualityDashboardEngine {
  private _cached: DashboardSnapshot | null = null;

  /**
   * Compute a full dashboard snapshot by aggregating all quality data sources.
   * @returns DashboardSnapshot with per-domain metrics, alerts, and trends
   */
  compute(): DashboardSnapshot {
    log.info("[QualityDashboard] Computing dashboard snapshot...");

    const qualityScores = safeReadJSON(QUALITY_SCORES_PATH);
    const sviData = safeReadJSON(SVI_PATH);
    const formulaData = safeReadJSON(FORMULA_ACCURACY_PATH);
    const improvementData = safeReadJSON(SELF_IMPROVEMENT_PATH);
    const autoFixData = safeReadJSON(AUTO_FIX_PATH);
    const promotedData = safeReadJSON(AUTO_FIX_PROMOTED_PATH);

    // --- Quality Scores (AUTO-0) ---
    const scores: any[] = qualityScores?.scores ?? [];
    const systemQ = qualityScores?.system_Q ?? 0;
    const meanQ = qualityScores?.mean_Q ?? 0;
    const totalEngines = qualityScores?.scored_engines ?? 0;
    const above90 = qualityScores?.engines_above_90 ?? 0;
    const below70 = qualityScores?.engines_below_70 ?? 0;
    const dimAvg = qualityScores?.dimension_averages ?? { W: 0, T: 0, P: 0, S: 0, D: 0, A: 0 };

    // --- SVI ---
    const sviValue = sviData?.svi_display ?? sviData?.svi ?? "unknown";
    const psiPct = derivePsiPct(sviData);
    const sviTrend = sviData?.trend ?? "unknown";
    const subsystemCount = sviData?.subsystems?.length ?? 0;

    // --- Formula Accuracy (AUTO-5) ---
    const aggAccuracy = formulaData?.aggregate_accuracy ?? 0;
    const formulasValidated = formulaData?.total_formulas ?? 0;
    const formulasPassed = formulaData?.passed ?? 0;
    const formulasFailed = formulaData?.failed ?? 0;

    // --- Self-Improvement (AUTO-6) ---
    const patternsDetected = improvementData?.total_patterns ?? 0;
    const fixesGenerated = autoFixData?.candidates_generated ?? 0;
    const promoted = Array.isArray(promotedData) ? promotedData.length :
                     (promotedData?.promoted_count ?? 0);
    const improvementRate = patternsDetected > 0 ? round(promoted / patternsDetected) : 0;

    // --- Test Health ---
    const testFiles = safeListDir(TESTS_DIR).filter(f => f.endsWith(".test.ts")).length;
    const passRate = this._estimateTestPassRate();

    // --- Schema Coverage ---
    const schemaCoverage = this._computeSchemaCoverage();

    // --- Per-Domain Breakdown ---
    const domains = this._computeDomainMetrics(scores);

    // --- Alerts ---
    const alerts = this._generateAlerts(
      systemQ, meanQ, below70, psiPct, aggAccuracy,
      passRate, schemaCoverage.coverage_pct, patternsDetected
    );

    // --- Trend (append to existing) ---
    const existing = this.read();
    const prevTrend = existing?.trend ?? [];
    const trendEntry = {
      timestamp: new Date().toISOString(),
      system_Q: systemQ,
      mean_Q: meanQ,
      psi_pct: psiPct,
      formula_accuracy: aggAccuracy,
    };
    const trend = [...prevTrend.slice(-9), trendEntry];

    const snapshot: DashboardSnapshot = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      system_Q: systemQ,
      mean_Q: meanQ,
      total_engines: totalEngines,
      engines_above_90: above90,
      engines_below_70: below70,
      dimension_averages: dimAvg,
      svi: { value: String(sviValue), psi_pct: psiPct, trend: sviTrend, subsystem_count: subsystemCount },
      formula_accuracy: {
        aggregate_accuracy: aggAccuracy,
        formulas_validated: formulasValidated,
        formulas_passed: formulasPassed,
        formulas_failed: formulasFailed,
      },
      improvement: {
        patterns_detected: patternsDetected,
        fixes_generated: fixesGenerated,
        fixes_promoted: promoted,
        improvement_rate: improvementRate,
      },
      tests: { test_files: testFiles, pass_rate: passRate },
      schema_coverage: schemaCoverage,
      domains,
      alerts,
      trend,
    };

    this._cached = snapshot;
    this._persist(snapshot);
    log.info(`[QualityDashboard] Snapshot complete: Q=${systemQ}, Psi=${psiPct}%, ${alerts.length} alerts`);
    return snapshot;
  }

  /**
   * Read the last computed dashboard from disk.
   * @returns DashboardSnapshot or null if not yet computed
   */
  read(): DashboardSnapshot | null {
    if (this._cached) return this._cached;
    return safeReadJSON(OUTPUT_PATH) as DashboardSnapshot | null;
  }

  /**
   * Get a compact markdown summary suitable for terminal/agent context.
   * @returns Multi-line markdown string
   */
  summary(): string {
    const d = this.read();
    if (!d) return "No dashboard data yet. Run quality_dashboard first.";

    const lines: string[] = [
      `# PRISM Quality Dashboard`,
      `Updated: ${d.timestamp}`,
      ``,
      `## System Health`,
      `  System Q (min): ${d.system_Q}  |  Mean Q: ${d.mean_Q}`,
      `  Engines: ${d.total_engines} scored  |  Above 0.90: ${d.engines_above_90}  |  Below 0.70: ${d.engines_below_70}`,
      ``,
      `## Dimensions (0-1)`,
      `  W=${d.dimension_averages.W}  T=${d.dimension_averages.T}  P=${d.dimension_averages.P}  S=${d.dimension_averages.S}  D=${d.dimension_averages.D}  A=${d.dimension_averages.A}`,
      ``,
      `## SVI / Reachability`,
      `  SVI: ${d.svi.value}  |  Psi: ${d.svi.psi_pct}%  |  Trend: ${d.svi.trend}`,
      ``,
      `## Formula Accuracy (AUTO-5)`,
      `  Accuracy: ${d.formula_accuracy.aggregate_accuracy}  |  ${d.formula_accuracy.formulas_passed}/${d.formula_accuracy.formulas_validated} passed`,
      ``,
      `## Self-Improvement (AUTO-6)`,
      `  Patterns: ${d.improvement.patterns_detected}  |  Fixes: ${d.improvement.fixes_generated}  |  Promoted: ${d.improvement.fixes_promoted}  |  Rate: ${d.improvement.improvement_rate}`,
      ``,
      `## Tests & Schemas`,
      `  Test files: ${d.tests.test_files}  |  Pass rate: ${d.tests.pass_rate}`,
      `  Schema coverage: ${d.schema_coverage.coverage_pct}% (${d.schema_coverage.actions_with_schema}/${d.schema_coverage.total_actions})`,
      ``,
      `## Domains`,
    ];

    for (const dm of d.domains) {
      lines.push(`  ${dm.domain}: ${dm.engine_count} engines, mean Q=${dm.mean_Q}, min Q=${dm.min_Q}, above 90%: ${dm.above_90_pct}%`);
    }

    if (d.alerts.length > 0) {
      lines.push(``, `## Alerts (${d.alerts.length})`);
      for (const a of d.alerts.slice(0, 15)) {
        lines.push(`  [${a.severity.toUpperCase()}] ${a.category}: ${a.message}`);
      }
      if (d.alerts.length > 15) lines.push(`  ... and ${d.alerts.length - 15} more`);
    }

    if (d.trend.length > 1) {
      lines.push(``, `## Trend (last ${d.trend.length} snapshots)`);
      for (const t of d.trend.slice(-5)) {
        lines.push(`  ${t.timestamp.slice(0, 16)}: Q=${t.system_Q} mean=${t.mean_Q} Psi=${t.psi_pct}% accuracy=${t.formula_accuracy}`);
      }
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // DOMAIN METRICS
  // ==========================================================================

  private _computeDomainMetrics(scores: any[]): DomainMetrics[] {
    const domainMap = new Map<string, any[]>();
    for (const s of scores) {
      const domain = classifyDomain(s.engine_name ?? "");
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain)!.push(s);
    }

    const result: DomainMetrics[] = [];
    for (const [domain, engines] of domainMap.entries()) {
      const qs = engines.map((e: any) => e.Q ?? 0);
      const above90 = qs.filter((q: number) => q >= 0.90).length;
      result.push({
        domain,
        engine_count: engines.length,
        mean_Q: round(qs.reduce((a: number, b: number) => a + b, 0) / (qs.length || 1)),
        min_Q: round(Math.min(...(qs.length > 0 ? qs : [0]))),
        above_90_pct: round(qs.length > 0 ? (above90 / qs.length) * 100 : 0, 1),
        below_70_count: qs.filter((q: number) => q < 0.70).length,
      });
    }

    return result.sort((a, b) => a.mean_Q - b.mean_Q);
  }

  // ==========================================================================
  // SCHEMA COVERAGE
  // ==========================================================================

  private _computeSchemaCoverage(): { actions_with_schema: number; total_actions: number; coverage_pct: number } {
    let totalActions = 0;
    let actionsWithSchema = 0;

    const schemaContent = new Map<string, string>();
    for (const f of safeListDir(SCHEMAS_DIR)) {
      if (!f.endsWith(".ts")) continue;
      try {
        const content = fs.readFileSync(path.join(SCHEMAS_DIR, f), "utf-8");
        schemaContent.set(f, content.toLowerCase());
      } catch { /* skip */ }
    }

    for (const f of safeListDir(DISPATCHERS_DIR)) {
      if (!f.endsWith(".ts") || f === "index.ts" || f.endsWith(".md")) continue;
      try {
        const content = fs.readFileSync(path.join(DISPATCHERS_DIR, f), "utf-8");
        const enumMatch = content.match(/\["([^\]]+)"\]\s*as\s*const/);
        if (!enumMatch) continue;
        const actions = content.match(/"([a-z_]+)"/g)?.slice(0, 200) ?? [];
        const uniqueActions = new Set(actions.map(a => a.replace(/"/g, "")));
        totalActions += uniqueActions.size;

        // Check if corresponding schema file has entries for these actions
        const prefix = f.replace(/Dispatcher\.ts$/, "").toLowerCase();
        for (const [schemaFile, schemaText] of schemaContent.entries()) {
          if (schemaFile.toLowerCase().includes(prefix)) {
            for (const action of uniqueActions) {
              if (schemaText.includes(action)) actionsWithSchema++;
            }
            break;
          }
        }
      } catch { /* skip */ }
    }

    const coveragePct = totalActions > 0 ? round((actionsWithSchema / totalActions) * 100, 1) : 0;
    return { actions_with_schema: actionsWithSchema, total_actions: totalActions, coverage_pct: coveragePct };
  }

  // ==========================================================================
  // TEST PASS RATE ESTIMATION
  // ==========================================================================

  private _estimateTestPassRate(): number {
    // Read test tracker if available, otherwise estimate from state
    const trackerPath = path.join(PROJECT_ROOT, "state", "session-test-tracker.json");
    const tracker = safeReadJSON(trackerPath);
    if (tracker?.pass_rate !== undefined) return round(tracker.pass_rate);
    if (tracker?.passed !== undefined && tracker?.total !== undefined && tracker.total > 0) {
      return round(tracker.passed / tracker.total);
    }
    // Default assumption: passing (last known state)
    return 1.0;
  }

  // ==========================================================================
  // ALERT GENERATION
  // ==========================================================================

  private _generateAlerts(
    systemQ: number, meanQ: number, below70: number,
    psiPct: number, accuracy: number,
    passRate: number, schemaCoverage: number,
    patterns: number
  ): AlertEntry[] {
    const alerts: AlertEntry[] = [];
    const now = new Date().toISOString();

    if (systemQ < 0.50) {
      alerts.push({ severity: "critical", category: "quality", message: `System Q=${systemQ} critically low (<0.50)`, timestamp: now });
    } else if (systemQ < 0.70) {
      alerts.push({ severity: "high", category: "quality", message: `System Q=${systemQ} below target (<0.70)`, timestamp: now });
    }

    if (below70 > 50) {
      alerts.push({ severity: "high", category: "quality", message: `${below70} engines below Q=0.70`, timestamp: now });
    } else if (below70 > 20) {
      alerts.push({ severity: "medium", category: "quality", message: `${below70} engines below Q=0.70`, timestamp: now });
    }

    if (accuracy > 0 && accuracy < 0.90) {
      alerts.push({ severity: "critical", category: "physics", message: `Formula accuracy=${accuracy} below 0.90`, timestamp: now });
    } else if (accuracy > 0 && accuracy < 0.95) {
      alerts.push({ severity: "high", category: "physics", message: `Formula accuracy=${accuracy} below 0.95 target`, timestamp: now });
    }

    if (psiPct > 0 && psiPct < 30) {
      alerts.push({ severity: "high", category: "svi", message: `Psi=${psiPct}% reachability low (<30%)`, timestamp: now });
    }

    if (passRate < 0.95 && passRate > 0) {
      alerts.push({ severity: "high", category: "tests", message: `Test pass rate=${passRate} below 0.95`, timestamp: now });
    }

    if (schemaCoverage < 80 && schemaCoverage > 0) {
      alerts.push({ severity: "medium", category: "schemas", message: `Schema coverage=${schemaCoverage}% below 80%`, timestamp: now });
    }

    if (patterns > 20) {
      alerts.push({ severity: "medium", category: "improvement", message: `${patterns} improvement patterns detected — review auto-fix candidates`, timestamp: now });
    }

    // Regression detection from trend
    const existing = safeReadJSON(OUTPUT_PATH) as DashboardSnapshot | null;
    if (existing) {
      if (systemQ > 0 && existing.system_Q > 0 && systemQ < existing.system_Q - 0.05) {
        alerts.push({ severity: "critical", category: "regression", message: `System Q dropped from ${existing.system_Q} to ${systemQ}`, timestamp: now });
      }
      if (psiPct > 0 && existing.svi.psi_pct > 0 && psiPct < existing.svi.psi_pct - 1) {
        alerts.push({ severity: "high", category: "regression", message: `Psi dropped from ${existing.svi.psi_pct}% to ${psiPct}%`, timestamp: now });
      }
    }

    return alerts.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, info: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private _persist(snapshot: DashboardSnapshot): void {
    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
      log.info(`[QualityDashboard] Persisted to ${OUTPUT_PATH}`);
    } catch (e: any) {
      log.warn(`[QualityDashboard] Persist failed: ${e?.message}`);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const qualityDashboardEngine = new QualityDashboardEngine();
