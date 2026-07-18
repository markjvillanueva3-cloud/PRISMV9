/**
 * RouteSyncValidatorEngine — AUTO-4: Route-to-Client Sync Validation
 *
 * NOTE: This is a SOFTWARE DEVELOPMENT automation engine. It does NOT perform
 * manufacturing calculations. It scans backend routes and frontend API client
 * functions to detect sync mismatches:
 *   - Orphaned routes: backend endpoint exists but no frontend client function
 *   - Orphaned clients: frontend client function exists but no backend route
 *   - Path mismatches: client calls a path that doesn't match any route
 *
 * Workflow:
 *   1. scan() — parse all routes and client functions, match pairs
 *   2. report() — detailed mismatch report with suggested fixes
 *
 * Mathematical Foundation (from MCP-AUTOMATION-HARDENING-ROADMAP.md):
 *   Sync_Score = matched_pairs / (total_routes + total_client_fns - matched_pairs)
 *   Target: Sync_Score >= 0.90
 *
 * @module RouteSyncValidatorEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RouteEndpoint {
  file: string;
  method: string;
  path: string;
  handler: string;
  line: number;
}

export interface ClientFunction {
  file: string;
  function_name: string;
  method: string;
  path: string;
  line: number;
}

export interface SyncPair {
  route: RouteEndpoint;
  client: ClientFunction;
  match_quality: "exact" | "partial" | "inferred";
}

export interface RouteSyncReport {
  timestamp: string;
  total_routes: number;
  total_client_fns: number;
  matched_pairs: number;
  orphaned_routes: number;
  orphaned_clients: number;
  sync_score: number;
  target_score: number;
  gap: number;
  by_route_file: RouteFileSummary[];
  orphaned_route_list: RouteEndpoint[];
  orphaned_client_list: ClientFunction[];
  matched: SyncPair[];
  warnings: string[];
}

export interface RouteFileSummary {
  file: string;
  total_endpoints: number;
  matched: number;
  orphaned: number;
}

// ============================================================================
// PATHS
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(MCP_ROOT, "src");
const ROUTES_DIR = path.join(SRC_DIR, "routes");
const WEB_API_DIR = path.join(MCP_ROOT, "web", "src", "api");
const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "state", "shared", "ROUTE_SYNC_REPORT.json");

const TARGET_SCORE = 0.90;

// ============================================================================
// HELPERS
// ============================================================================

function safeRead(filePath: string): string {
  try { return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : ""; }
  catch { return ""; }
}

function safeListDir(dirPath: string): string[] {
  try { return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : []; }
  catch { return []; }
}

function round(v: number, decimals = 3): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ============================================================================
// ENGINE
// ============================================================================

class RouteSyncValidatorEngine {

  /**
   * Scan all backend routes and frontend API client functions, match pairs,
   * and report sync coverage.
   * @returns RouteSyncReport with matched pairs and orphans
   */
  async scan(): Promise<RouteSyncReport> {
    log.info("[RouteSync] Scanning route-to-client sync...");

    const routes = this._parseAllRoutes();
    const clients = this._parseAllClients();
    const warnings: string[] = [];

    // Match routes to client functions
    const matched: SyncPair[] = [];
    const matchedRouteIndices = new Set<number>();
    const matchedClientIndices = new Set<number>();

    for (let ri = 0; ri < routes.length; ri++) {
      for (let ci = 0; ci < clients.length; ci++) {
        if (matchedClientIndices.has(ci)) continue;
        const quality = this._matchQuality(routes[ri], clients[ci]);
        if (quality) {
          matched.push({ route: routes[ri], client: clients[ci], match_quality: quality });
          matchedRouteIndices.add(ri);
          matchedClientIndices.add(ci);
          break;
        }
      }
    }

    const orphanedRoutes = routes.filter((_, i) => !matchedRouteIndices.has(i));
    const orphanedClients = clients.filter((_, i) => !matchedClientIndices.has(i));

    // Compute sync score (Jaccard-like)
    const union = routes.length + clients.length - matched.length;
    const syncScore = union > 0 ? round(matched.length / union) : 1;

    // Per-file summary
    const routeFileMap = new Map<string, { total: number; matched: number }>();
    for (const r of routes) {
      const entry = routeFileMap.get(r.file) || { total: 0, matched: 0 };
      entry.total++;
      routeFileMap.set(r.file, entry);
    }
    for (const pair of matched) {
      const entry = routeFileMap.get(pair.route.file);
      if (entry) entry.matched++;
    }

    const byRouteFile: RouteFileSummary[] = [];
    for (const [file, data] of routeFileMap) {
      byRouteFile.push({
        file,
        total_endpoints: data.total,
        matched: data.matched,
        orphaned: data.total - data.matched,
      });
    }
    byRouteFile.sort((a, b) => b.orphaned - a.orphaned);

    // Warn about large sync gaps
    if (orphanedRoutes.length > 20) {
      warnings.push(`${orphanedRoutes.length} orphaned routes — consider batch-generating client functions`);
    }
    if (orphanedClients.length > 5) {
      warnings.push(`${orphanedClients.length} orphaned client functions — may reference removed/renamed routes`);
    }

    const report: RouteSyncReport = {
      timestamp: new Date().toISOString(),
      total_routes: routes.length,
      total_client_fns: clients.length,
      matched_pairs: matched.length,
      orphaned_routes: orphanedRoutes.length,
      orphaned_clients: orphanedClients.length,
      sync_score: syncScore,
      target_score: TARGET_SCORE,
      gap: round(TARGET_SCORE - syncScore),
      by_route_file: byRouteFile,
      orphaned_route_list: orphanedRoutes,
      orphaned_client_list: orphanedClients,
      matched,
      warnings,
    };

    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    } catch (e) {
      log.warn(`[RouteSync] Could not write report: ${e}`);
    }

    log.info(`[RouteSync] Routes: ${routes.length}. Clients: ${clients.length}. Matched: ${matched.length}. Sync: ${round(syncScore * 100)}%. Target: ${round(TARGET_SCORE * 100)}%.`);
    return report;
  }

  /**
   * Read the cached route sync report.
   * @returns Cached report or null
   */
  read(): RouteSyncReport | null {
    try {
      if (!fs.existsSync(OUTPUT_PATH)) return null;
      return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
    } catch { return null; }
  }

  /**
   * One-line summary for compact display.
   * @returns Human-readable sync coverage summary
   */
  summary(): string {
    const cached = this.read();
    if (!cached) return "No route sync report. Run scan first.";
    return `Route sync: ${cached.matched_pairs} matched / ${cached.total_routes} routes + ${cached.total_client_fns} clients (${round(cached.sync_score * 100)}%). Orphaned routes: ${cached.orphaned_routes}. Orphaned clients: ${cached.orphaned_clients}. Gap to ${round(cached.target_score * 100)}%: ${round(cached.gap * 100)}pp.`;
  }

  // ==========================================================================
  // ROUTE PARSING
  // ==========================================================================

  private _parseAllRoutes(): RouteEndpoint[] {
    const routes: RouteEndpoint[] = [];

    for (const f of safeListDir(ROUTES_DIR)) {
      if (!f.endsWith(".ts") || f === "index.ts" || f.endsWith(".d.ts")) continue;
      const content = safeRead(path.join(ROUTES_DIR, f));
      if (!content) continue;

      const fileRoutes = this._parseRouteFile(f, content);
      routes.push(...fileRoutes);
    }

    return routes;
  }

  private _parseRouteFile(fileName: string, content: string): RouteEndpoint[] {
    const endpoints: RouteEndpoint[] = [];
    const lines = content.split("\n");

    // Match: router.get("/path", ...), router.post("/path", ...), etc.
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    let m;
    while ((m = routeRegex.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const routePath = m[2];
      const line = content.slice(0, m.index).split("\n").length;

      // Try to extract handler name
      const afterMatch = content.slice(m.index, m.index + 200);
      const handlerMatch = afterMatch.match(/(?:async\s+)?\(\s*req|(\w+Handler|handle\w+)/);
      const handler = handlerMatch ? (handlerMatch[1] || "inline") : "inline";

      endpoints.push({
        file: fileName,
        method,
        path: routePath,
        handler,
        line,
      });
    }

    return endpoints;
  }

  // ==========================================================================
  // CLIENT PARSING
  // ==========================================================================

  private _parseAllClients(): ClientFunction[] {
    const clients: ClientFunction[] = [];

    for (const f of safeListDir(WEB_API_DIR)) {
      if (!f.endsWith(".ts") || f === "types.ts" || f.endsWith(".d.ts")) continue;
      const content = safeRead(path.join(WEB_API_DIR, f));
      if (!content) continue;

      const fileClients = this._parseClientFile(f, content);
      clients.push(...fileClients);
    }

    return clients;
  }

  private _parseClientFile(fileName: string, content: string): ClientFunction[] {
    const functions: ClientFunction[] = [];

    // Pattern 1: request<T>('GET'|'POST', '/path', ...)
    const requestRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)[^{]*\{[\s\S]*?(?:request|requestData|fetch)\s*(?:<[^>]*>)?\s*\(\s*["'`]?(GET|POST|PUT|DELETE|PATCH)["'`]?\s*,\s*["'`]([^"'`]+)["'`]/g;
    let m;
    while ((m = requestRegex.exec(content)) !== null) {
      const line = content.slice(0, m.index).split("\n").length;
      functions.push({
        file: fileName,
        function_name: m[1],
        method: m[2].toUpperCase(),
        path: m[3],
        line,
      });
    }

    // Pattern 2: Simpler — just find request/fetch calls with paths
    if (functions.length === 0) {
      const simpleRegex = /(?:request|requestData|fetch)\s*(?:<[^>]*>)?\s*\(\s*["'`]?(GET|POST|PUT|DELETE|PATCH)["'`]?\s*,\s*["'`]([^"'`]+)["'`]/g;
      while ((m = simpleRegex.exec(content)) !== null) {
        const line = content.slice(0, m.index).split("\n").length;
        // Try to find enclosing function name
        const before = content.slice(Math.max(0, m.index - 500), m.index);
        const fnMatch = before.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
        const fnName = fnMatch ? fnMatch[fnMatch.length - 1].replace(/^(?:export\s+)?(?:async\s+)?function\s+/, "") : "anonymous";

        functions.push({
          file: fileName,
          function_name: fnName,
          method: m[1].toUpperCase(),
          path: m[2],
          line,
        });
      }
    }

    return functions;
  }

  // ==========================================================================
  // MATCHING
  // ==========================================================================

  private _matchQuality(route: RouteEndpoint, client: ClientFunction): "exact" | "partial" | "inferred" | null {
    // Methods must match
    if (route.method !== client.method) return null;

    // Normalize paths: strip leading slash differences, API_BASE prefix
    const routePath = this._normalizePath(route.path);
    const clientPath = this._normalizePath(client.path);

    // Exact match
    if (routePath === clientPath) return "exact";

    // Partial match: route has :params, client has actual values or template literals
    const routePattern = routePath.replace(/:[^/]+/g, "[^/]+");
    if (new RegExp(`^${routePattern}$`).test(clientPath)) return "partial";

    // Client may include /api/v1 prefix
    const clientStripped = clientPath.replace(/^\/api\/v1/, "");
    if (routePath === clientStripped) return "exact";
    if (new RegExp(`^${routePattern}$`).test(clientStripped)) return "partial";

    // Inferred: same base path segment
    const routeBase = routePath.split("/").filter(Boolean).slice(0, 2).join("/");
    const clientBase = clientStripped.split("/").filter(Boolean).slice(0, 2).join("/");
    if (routeBase && routeBase === clientBase && routePath.split("/").length === clientStripped.split("/").length) {
      return "inferred";
    }

    return null;
  }

  private _normalizePath(p: string): string {
    return p
      .replace(/\/+/g, "/")
      .replace(/\/$/, "")
      .replace(/^\/?/, "/")
      .toLowerCase();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const routeSyncValidatorEngine = new RouteSyncValidatorEngine();
export { RouteSyncValidatorEngine };
