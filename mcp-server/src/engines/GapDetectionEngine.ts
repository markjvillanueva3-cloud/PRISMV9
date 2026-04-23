/**
 * GapDetectionEngine — SQ1-0-GAP: Unified Codebase Gap Scanner
 *
 * NOTE: This is a SOFTWARE DEVELOPMENT tool — not a manufacturing engine.
 * It scans the PRISM codebase for missing wiring between engines, dispatchers,
 * schemas, routes, API client functions, and tests.
 *
 * Gap dimensions scanned:
 *   1. engine → index.ts export
 *   2. engine → dispatcher reference (lazy import)
 *   3. engine → Zod schema coverage
 *   4. engine → route reference
 *   5. engine → API client function
 *   6. engine → test file
 *   7. dispatcher action → schema entry
 *   8. route endpoint → API client function
 *
 * Each gap includes severity (critical/high/medium/low) and an auto-fix suggestion.
 *
 * @module GapDetectionEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type GapSeverity = "critical" | "high" | "medium" | "low";

export interface Gap {
  dimension: string;
  entity: string;
  description: string;
  severity: GapSeverity;
  fix_suggestion: string;
}

export interface DimensionSummary {
  dimension: string;
  total: number;
  covered: number;
  coverage_pct: number;
  gaps: Gap[];
}

export interface GapReport {
  timestamp: string;
  version: string;
  total_engines: number;
  total_dispatchers: number;
  total_actions: number;
  total_routes: number;
  dimensions: DimensionSummary[];
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_gaps: number;
  overall_coverage_pct: number;
  warnings: string[];
}

const VALID_DIMENSIONS = [
  "engine_index", "engine_dispatcher", "engine_schema", "engine_route",
  "engine_api_client", "engine_test", "dispatcher_schema", "route_api_client",
] as const;

// ============================================================================
// PATHS (source/dist agnostic)
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(MCP_ROOT, "src");
const ENGINES_DIR = path.join(SRC_DIR, "engines");
const DISPATCHERS_DIR = path.join(SRC_DIR, "tools", "dispatchers");
const SCHEMAS_DIR = path.join(SRC_DIR, "schemas");
const ROUTES_DIR = path.join(SRC_DIR, "routes");
const TESTS_DIR = path.join(SRC_DIR, "__tests__");
const API_DIR = path.join(MCP_ROOT, "web", "src", "api");
const INDEX_PATH = path.join(ENGINES_DIR, "index.ts");

const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "state", "shared", "GAP_REPORT.json");

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

function round(v: number, decimals = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ============================================================================
// ENGINE
// ============================================================================

class GapDetectionEngine {

  /**
   * Run a full gap scan across all dimensions.
   * @param target Optional engine name filter (scans only matching engines)
   * @param dimensions Optional dimension filter (e.g., ["engine_index", "engine_test"])
   * @returns GapReport with per-dimension summaries and aggregated counts
   */
  async scan(target?: string, dimensions?: string[]): Promise<GapReport> {
    const warnings: string[] = [];

    // Input validation
    if (target !== undefined && typeof target !== "string") {
      return this._errorReport(`Invalid target: expected string, got ${typeof target}`);
    }
    if (target && target.length > 200) {
      return this._errorReport("Invalid target: exceeds 200 character limit");
    }
    if (dimensions !== undefined && !Array.isArray(dimensions)) {
      return this._errorReport(`Invalid dimensions: expected array, got ${typeof dimensions}`);
    }
    if (dimensions && dimensions.length > 0) {
      const invalid = dimensions.filter(d => !(VALID_DIMENSIONS as readonly string[]).includes(d));
      if (invalid.length > 0) {
        warnings.push(`Unknown dimensions ignored: ${invalid.join(", ")}. Valid: ${VALID_DIMENSIONS.join(", ")}`);
      }
    }

    log.info(`[GapDetection] Scanning${target ? ` for ${target}` : " (full)"}...`);

    // Check if source directories exist
    if (!fs.existsSync(ENGINES_DIR)) {
      return this._errorReport(`Engines directory not found: ${ENGINES_DIR}`);
    }
    if (!fs.existsSync(DISPATCHERS_DIR)) {
      warnings.push("Dispatchers directory not found — dispatcher scans will be empty");
    }

    const allDimensions = [
      this._scanEngineIndex(target),
      this._scanEngineDispatcher(target),
      this._scanEngineSchema(target),
      this._scanEngineRoute(target),
      this._scanEngineApiClient(target),
      this._scanEngineTest(target),
      this._scanDispatcherSchema(),
      this._scanRouteApiClient(),
    ];

    let results = allDimensions;
    if (dimensions && dimensions.length > 0) {
      const validDimSet = new Set(dimensions.filter(d => (VALID_DIMENSIONS as readonly string[]).includes(d)));
      if (validDimSet.size > 0) {
        results = results.filter(d => validDimSet.has(d.dimension));
      }
    }

    const allGaps = results.flatMap(d => d.gaps);
    const critical = allGaps.filter(g => g.severity === "critical").length;
    const high = allGaps.filter(g => g.severity === "high").length;
    const medium = allGaps.filter(g => g.severity === "medium").length;
    const low = allGaps.filter(g => g.severity === "low").length;

    const totalCovered = results.reduce((s, d) => s + d.covered, 0);
    const totalAll = results.reduce((s, d) => s + d.total, 0);

    const engineFiles = this._getEngineFiles(target);
    const dispatcherFiles = this._getDispatcherFiles();
    const actionCount = this._countActions(dispatcherFiles);
    const routeFiles = safeListDir(ROUTES_DIR).filter(f => f.endsWith(".ts") && f !== "index.ts");

    // Edge-case warnings
    if (target && engineFiles.length === 0) {
      warnings.push(`No engines matched target "${target}" — report is empty`);
    }
    if (engineFiles.length > 2000) {
      warnings.push(`Large engine count (${engineFiles.length}) — scan may be slow`);
    }
    if (critical > 0) {
      warnings.push(`${critical} CRITICAL gap(s) found — address before shipping`);
    }

    const report: GapReport = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      total_engines: engineFiles.length,
      total_dispatchers: dispatcherFiles.length,
      total_actions: actionCount,
      total_routes: routeFiles.length,
      dimensions: results,
      critical_count: critical,
      high_count: high,
      medium_count: medium,
      low_count: low,
      total_gaps: allGaps.length,
      overall_coverage_pct: totalAll > 0 ? round((totalCovered / totalAll) * 100) : 100,
      warnings,
    };

    // Persist report
    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
      log.info(`[GapDetection] Report saved to ${OUTPUT_PATH}`);
    } catch (err: any) {
      log.warn(`[GapDetection] Could not save report: ${err.message}`);
    }

    return report;
  }

  /**
   * Read the last saved gap report without re-scanning.
   * @returns Persisted GapReport or null if none exists
   */
  async read(): Promise<GapReport | null> {
    const content = safeRead(OUTPUT_PATH);
    if (!content) return null;
    try {
      return JSON.parse(content) as GapReport;
    } catch { return null; }
  }

  /**
   * Generate a compact markdown summary of the gap report.
   * @param report Gap report to summarize
   * @returns Markdown string
   */
  summary(report: GapReport): string {
    const lines: string[] = [
      `# Gap Report — ${report.timestamp.slice(0, 10)}`,
      "",
      `**Coverage:** ${report.overall_coverage_pct}% | **Gaps:** ${report.total_gaps} (${report.critical_count}C ${report.high_count}H ${report.medium_count}M ${report.low_count}L)`,
      `**Engines:** ${report.total_engines} | **Dispatchers:** ${report.total_dispatchers} | **Actions:** ${report.total_actions} | **Routes:** ${report.total_routes}`,
      "",
      "| Dimension | Total | Covered | Coverage | Gaps |",
      "|-----------|-------|---------|----------|------|",
    ];

    for (const dim of report.dimensions) {
      lines.push(`| ${dim.dimension} | ${dim.total} | ${dim.covered} | ${dim.coverage_pct}% | ${dim.gaps.length} |`);
    }

    // Top 20 critical+high gaps
    const urgentGaps = report.dimensions
      .flatMap(d => d.gaps)
      .filter(g => g.severity === "critical" || g.severity === "high")
      .slice(0, 20);

    if (urgentGaps.length > 0) {
      lines.push("", "## Top Urgent Gaps", "");
      for (const g of urgentGaps) {
        lines.push(`- **[${g.severity.toUpperCase()}]** ${g.dimension}: ${g.entity} — ${g.description}`);
        lines.push(`  Fix: ${g.fix_suggestion}`);
      }
    }

    if (report.warnings.length > 0) {
      lines.push("", "## Warnings", "");
      for (const w of report.warnings) {
        lines.push(`- ${w}`);
      }
    }

    return lines.join("\n");
  }

  // ============================================================================
  // DIMENSION SCANNERS
  // ============================================================================

  /**
   * Dimension 1: engine → index.ts export
   * Checks if each engine file is re-exported from engines/index.ts
   */
  private _scanEngineIndex(target?: string): DimensionSummary {
    const engines = this._getEngineFiles(target);
    const indexContent = safeRead(INDEX_PATH).toLowerCase();
    const gaps: Gap[] = [];

    for (const file of engines) {
      const name = file.replace(/\.ts$/, "").toLowerCase();
      if (!indexContent.includes(name.toLowerCase())) {
        gaps.push({
          dimension: "engine_index",
          entity: file,
          description: `Not exported from engines/index.ts`,
          severity: "medium",
          fix_suggestion: `Add 'export { ${file.replace(".ts", "")} } from "./${file.replace(".ts", "")}.js";' to index.ts`,
        });
      }
    }

    return {
      dimension: "engine_index",
      total: engines.length,
      covered: engines.length - gaps.length,
      coverage_pct: engines.length > 0 ? round(((engines.length - gaps.length) / engines.length) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 2: engine → dispatcher reference
   * Checks if each engine is imported/referenced by at least one dispatcher
   */
  private _scanEngineDispatcher(target?: string): DimensionSummary {
    const engines = this._getEngineFiles(target);
    const dispatcherContent = this._loadAllContent(DISPATCHERS_DIR, ".ts", ["index.ts"]);
    const gaps: Gap[] = [];

    for (const file of engines) {
      const name = file.replace(/\.ts$/, "");
      const nameLower = name.toLowerCase();
      const found = dispatcherContent.some(({ content }) =>
        content.includes(nameLower) || content.includes(`engines/${nameLower}`)
      );
      if (!found) {
        gaps.push({
          dimension: "engine_dispatcher",
          entity: file,
          description: `Not referenced by any dispatcher — dead code`,
          severity: "high",
          fix_suggestion: `Wire to appropriate dispatcher with lazy import: const { ${name.replace("Engine", "").charAt(0).toLowerCase() + name.replace("Engine", "").slice(1)}Engine } = await import("../../engines/${name}.js")`,
        });
      }
    }

    return {
      dimension: "engine_dispatcher",
      total: engines.length,
      covered: engines.length - gaps.length,
      coverage_pct: engines.length > 0 ? round(((engines.length - gaps.length) / engines.length) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 3: engine → Zod schema
   * Checks if each engine has corresponding Zod schema entries in schemas/
   */
  private _scanEngineSchema(target?: string): DimensionSummary {
    const engines = this._getEngineFiles(target);
    const schemaContent = this._loadAllContent(SCHEMAS_DIR, ".ts");
    const gaps: Gap[] = [];

    for (const file of engines) {
      const name = file.replace(/\.ts$/, "").toLowerCase();
      const baseName = name.replace("engine", "");
      const found = schemaContent.some(({ content }) =>
        content.includes(name) || content.includes(baseName)
      );
      if (!found) {
        gaps.push({
          dimension: "engine_schema",
          entity: file,
          description: `No Zod schema found in schemas/`,
          severity: "medium",
          fix_suggestion: `Create schema in appropriate *ActionSchemas.ts file`,
        });
      }
    }

    return {
      dimension: "engine_schema",
      total: engines.length,
      covered: engines.length - gaps.length,
      coverage_pct: engines.length > 0 ? round(((engines.length - gaps.length) / engines.length) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 4: engine → route reference
   * Checks if each engine is referenced by at least one route file
   */
  private _scanEngineRoute(target?: string): DimensionSummary {
    const engines = this._getEngineFiles(target);
    const routeContent = this._loadAllContent(ROUTES_DIR, ".ts", ["index.ts"]);
    const gaps: Gap[] = [];

    for (const file of engines) {
      const name = file.replace(/\.ts$/, "").toLowerCase();
      const found = routeContent.some(({ content }) =>
        content.includes(name) || content.includes(`engines/${name}`)
      );
      if (!found) {
        gaps.push({
          dimension: "engine_route",
          entity: file,
          description: `Not referenced by any route — no REST API exposure`,
          severity: "low",
          fix_suggestion: `Add route endpoint or wire through dispatcher (not all engines need routes)`,
        });
      }
    }

    return {
      dimension: "engine_route",
      total: engines.length,
      covered: engines.length - gaps.length,
      coverage_pct: engines.length > 0 ? round(((engines.length - gaps.length) / engines.length) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 5: engine → API client function
   * Checks if each engine has corresponding API client functions in web/src/api/
   */
  private _scanEngineApiClient(target?: string): DimensionSummary {
    const engines = this._getEngineFiles(target);
    const apiContent = this._loadAllContent(API_DIR, ".ts");
    const gaps: Gap[] = [];

    for (const file of engines) {
      const name = file.replace(/\.ts$/, "").toLowerCase();
      const baseName = name.replace("engine", "");
      const found = apiContent.some(({ content }) =>
        content.includes(name) || content.includes(baseName)
      );
      if (!found) {
        gaps.push({
          dimension: "engine_api_client",
          entity: file,
          description: `No API client function in web/src/api/`,
          severity: "low",
          fix_suggestion: `Add client function to web/src/api/client.ts (only needed for frontend-facing engines)`,
        });
      }
    }

    return {
      dimension: "engine_api_client",
      total: engines.length,
      covered: engines.length - gaps.length,
      coverage_pct: engines.length > 0 ? round(((engines.length - gaps.length) / engines.length) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 6: engine → test file
   * Checks if each engine has at least one test file covering it
   */
  private _scanEngineTest(target?: string): DimensionSummary {
    const engines = this._getEngineFiles(target);
    const testContent = this._loadAllContent(TESTS_DIR, ".test.ts");
    const gaps: Gap[] = [];

    for (const file of engines) {
      const name = file.replace(/\.ts$/, "").toLowerCase();
      const baseName = name.replace("engine", "");
      const found = testContent.some(({ content }) =>
        content.includes(name) || content.includes(baseName) ||
        content.includes(`engines/${name}`) || content.includes(`"${file.replace(".ts", "")}"`)
      );
      if (!found) {
        gaps.push({
          dimension: "engine_test",
          entity: file,
          description: `No test file covers this engine`,
          severity: "high",
          fix_suggestion: `Create src/__tests__/${file.replace(".ts", ".test.ts")} with describe/it blocks`,
        });
      }
    }

    return {
      dimension: "engine_test",
      total: engines.length,
      covered: engines.length - gaps.length,
      coverage_pct: engines.length > 0 ? round(((engines.length - gaps.length) / engines.length) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 7: dispatcher action → schema entry
   * Checks if each dispatcher action has a corresponding Zod schema
   */
  private _scanDispatcherSchema(): DimensionSummary {
    const dispatchers = this._getDispatcherFiles();
    const schemaContent = this._loadAllContent(SCHEMAS_DIR, ".ts");
    const allSchemaText = schemaContent.map(s => s.content).join("\n");
    const gaps: Gap[] = [];
    let totalActions = 0;
    let coveredActions = 0;

    for (const file of dispatchers) {
      const content = safeRead(path.join(DISPATCHERS_DIR, file));
      const actionMatch = content.match(/\[([^\]]*)\]\s*as\s*const/);
      if (!actionMatch) continue;

      const actionsStr = actionMatch[1];
      const actions = actionsStr.match(/"([^"]+)"/g)?.map(a => a.replace(/"/g, "")) || [];
      const dispatcherName = file.replace("Dispatcher.ts", "").replace(".ts", "");

      for (const action of actions) {
        totalActions++;
        const actionKey = action.replace(/_/g, "").toLowerCase();
        if (allSchemaText.includes(action) || allSchemaText.includes(actionKey)) {
          coveredActions++;
        } else {
          gaps.push({
            dimension: "dispatcher_schema",
            entity: `${dispatcherName}:${action}`,
            description: `Action "${action}" has no Zod schema — params not validated`,
            severity: "medium",
            fix_suggestion: `Add schema for "${action}" in ${dispatcherName}ActionSchemas.ts`,
          });
        }
      }
    }

    return {
      dimension: "dispatcher_schema",
      total: totalActions,
      covered: coveredActions,
      coverage_pct: totalActions > 0 ? round((coveredActions / totalActions) * 100) : 100,
      gaps,
    };
  }

  /**
   * Dimension 8: route endpoint → API client function
   * Checks if each route has a corresponding API client function
   */
  private _scanRouteApiClient(): DimensionSummary {
    const routeFiles = safeListDir(ROUTES_DIR).filter(
      f => f.endsWith(".ts") && f !== "index.ts" && !f.endsWith(".md")
    );
    const apiContent = this._loadAllContent(API_DIR, ".ts");
    const allApiText = apiContent.map(s => s.content).join("\n");
    const gaps: Gap[] = [];
    let totalEndpoints = 0;
    let coveredEndpoints = 0;

    for (const file of routeFiles) {
      const content = safeRead(path.join(ROUTES_DIR, file));
      const routeName = file.replace(".ts", "");

      // Extract route paths from router.get/post/put/delete patterns
      const endpointMatches = content.match(/\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)/g) || [];
      for (const match of endpointMatches) {
        totalEndpoints++;
        const pathMatch = match.match(/["'`]([^"'`]+)/);
        const routePath = pathMatch ? pathMatch[1] : "";
        const routeKey = routeName.toLowerCase() + routePath.replace(/[/:]/g, "").toLowerCase();

        // Check if API client references this route domain
        if (allApiText.includes(routeName) || allApiText.includes(routePath) || allApiText.includes(routeKey)) {
          coveredEndpoints++;
        } else {
          // Only flag as gap if not a WebSocket or SSE endpoint
          const sev: GapSeverity = routePath.includes("stream") || routePath.includes("ws") ? "low" : "medium";
          gaps.push({
            dimension: "route_api_client",
            entity: `${routeName}:${routePath}`,
            description: `Route endpoint has no API client function`,
            severity: sev,
            fix_suggestion: `Add function to web/src/api/client.ts for ${routeName}${routePath}`,
          });
        }
      }
    }

    return {
      dimension: "route_api_client",
      total: totalEndpoints,
      covered: coveredEndpoints,
      coverage_pct: totalEndpoints > 0 ? round((coveredEndpoints / totalEndpoints) * 100) : 100,
      gaps,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _errorReport(message: string): GapReport {
    return {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      total_engines: 0,
      total_dispatchers: 0,
      total_actions: 0,
      total_routes: 0,
      dimensions: [],
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      total_gaps: 0,
      overall_coverage_pct: 0,
      warnings: [`ERROR: ${message}`],
    };
  }

  private _getEngineFiles(target?: string): string[] {
    return safeListDir(ENGINES_DIR).filter(f => {
      if (!f.endsWith(".ts") || f.endsWith(".test.ts") || f.endsWith(".d.ts")) return false;
      if (f === "index.ts" || f.endsWith(".md")) return false;
      if (target) return f.toLowerCase().includes(target.toLowerCase());
      return true;
    });
  }

  private _getDispatcherFiles(): string[] {
    return safeListDir(DISPATCHERS_DIR).filter(
      f => f.endsWith(".ts") && f !== "index.ts" && !f.endsWith(".md") && !f.endsWith(".d.ts")
    );
  }

  private _loadAllContent(dir: string, ext: string, exclude: string[] = []): Array<{ file: string; content: string }> {
    return safeListDir(dir)
      .filter(f => f.endsWith(ext) && !exclude.includes(f) && !f.endsWith(".d.ts") && !f.endsWith(".md"))
      .map(f => ({ file: f, content: safeRead(path.join(dir, f)).toLowerCase() }));
  }

  private _countActions(dispatcherFiles: string[]): number {
    let count = 0;
    for (const file of dispatcherFiles) {
      const content = safeRead(path.join(DISPATCHERS_DIR, file));
      const match = content.match(/\[([^\]]*)\]\s*as\s*const/);
      if (match) {
        const actions = match[1].match(/"[^"]+"/g) || [];
        count += actions.length;
      }
    }
    return count;
  }
}

export const gapDetectionEngine = new GapDetectionEngine();
