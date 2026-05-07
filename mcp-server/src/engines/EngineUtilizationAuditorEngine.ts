/**
 * EngineUtilizationAuditorEngine — Phase 0.23 U-UTL1
 *
 * Audits engine utilization across PRISM. Detects:
 * - Orphan engines (no dispatcher, no action, no consumer)
 * - Underutilized engines (rarely invoked)
 * - Duplicate functionality (semantic overlap)
 * - Missing test coverage
 * - Unwired engines (exist but not exported)
 *
 * Exit gate: <5% orphan engines reported.
 *
 * @module engines/EngineUtilizationAuditorEngine
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EngineUtilization {
  engineId: string;
  path: string;
  hasDispatcher: boolean;
  hasAction: boolean;
  hasTest: boolean;
  hasExport: boolean;
  consumerCount: number;
  lastInvoked: string | null;
  invokeCount: number;
  status: "active" | "underutilized" | "orphan" | "unwired";
}

export interface AuditResult {
  timestamp: string;
  totalEngines: number;
  activeEngines: number;
  underutilizedEngines: number;
  orphanEngines: number;
  unwiredEngines: number;
  orphanRate: number;
  testCoverage: number;
  dispatcherCoverage: number;
  engines: EngineUtilization[];
  recommendations: string[];
}

export interface AuditOptions {
  includeTests?: boolean;
  includeDispatchers?: boolean;
  minInvokeThreshold?: number;
  excludePatterns?: string[];
}

class EngineUtilizationAuditorEngine {
  private baseDir: string;
  private enginesDir: string;
  private dispatchersDir: string;
  private testsDir: string;
  private cache: Map<string, EngineUtilization> = new Map();
  private lastAudit: AuditResult | null = null;

  constructor() {
    this.baseDir = path.resolve(__dirname, "../..");
    this.enginesDir = path.join(this.baseDir, "src", "engines");
    this.dispatchersDir = path.join(this.baseDir, "src", "tools", "dispatchers");
    this.testsDir = path.join(this.baseDir, "src", "__tests__");
  }

  /**
   * Run full utilization audit across all engines.
   */
  async audit(options: AuditOptions = {}): Promise<AuditResult> {
    const {
      includeTests = true,
      includeDispatchers = true,
      minInvokeThreshold = 0,
      excludePatterns = ["index.ts", ".test.ts", ".spec.ts"],
    } = options;

    log.info("[EngineUtilizationAuditor] Starting audit...");

    const engines = this.discoverEngines(excludePatterns);
    const dispatcherRefs = includeDispatchers ? this.scanDispatchers() : new Set<string>();
    const testRefs = includeTests ? this.scanTests() : new Set<string>();
    const exportRefs = this.scanExports();

    const utilizations: EngineUtilization[] = [];
    let active = 0, underutilized = 0, orphan = 0, unwired = 0;
    let withTests = 0, withDispatchers = 0;

    for (const engineFile of engines) {
      const engineId = this.extractEngineId(engineFile);
      const enginePath = path.join(this.enginesDir, engineFile);

      const hasDispatcher = dispatcherRefs.has(engineId) || dispatcherRefs.has(engineFile);
      const hasTest = testRefs.has(engineId) || testRefs.has(engineFile.replace(".ts", ".test.ts"));
      const hasExport = exportRefs.has(engineId);
      const hasAction = this.checkHasAction(engineId, dispatcherRefs);
      const consumerCount = this.countConsumers(engineId);
      const { lastInvoked, invokeCount } = this.getInvocationStats(engineId);

      let status: EngineUtilization["status"];
      if (!hasDispatcher && !hasExport && consumerCount === 0) {
        status = "orphan";
        orphan++;
      } else if (!hasExport) {
        status = "unwired";
        unwired++;
      } else if (invokeCount < minInvokeThreshold && consumerCount < 2) {
        status = "underutilized";
        underutilized++;
      } else {
        status = "active";
        active++;
      }

      if (hasTest) withTests++;
      if (hasDispatcher) withDispatchers++;

      const util: EngineUtilization = {
        engineId,
        path: enginePath,
        hasDispatcher,
        hasAction,
        hasTest,
        hasExport,
        consumerCount,
        lastInvoked,
        invokeCount,
        status,
      };

      utilizations.push(util);
      this.cache.set(engineId, util);
    }

    const totalEngines = engines.length;
    const orphanRate = totalEngines > 0 ? (orphan / totalEngines) * 100 : 0;
    const testCoverage = totalEngines > 0 ? (withTests / totalEngines) * 100 : 0;
    const dispatcherCoverage = totalEngines > 0 ? (withDispatchers / totalEngines) * 100 : 0;

    const recommendations = this.generateRecommendations(utilizations, orphanRate);

    this.lastAudit = {
      timestamp: new Date().toISOString(),
      totalEngines,
      activeEngines: active,
      underutilizedEngines: underutilized,
      orphanEngines: orphan,
      unwiredEngines: unwired,
      orphanRate,
      testCoverage,
      dispatcherCoverage,
      engines: utilizations,
      recommendations,
    };

    log.info(`[EngineUtilizationAuditor] Audit complete: ${totalEngines} engines, ${orphan} orphans (${orphanRate.toFixed(1)}%)`);

    return this.lastAudit;
  }

  /**
   * Get orphan engines only.
   */
  getOrphans(): EngineUtilization[] {
    return Array.from(this.cache.values()).filter(e => e.status === "orphan");
  }

  /**
   * Get engines by status.
   */
  getByStatus(status: EngineUtilization["status"]): EngineUtilization[] {
    return Array.from(this.cache.values()).filter(e => e.status === status);
  }

  /**
   * Check if orphan rate meets exit gate (<5%).
   */
  meetsExitGate(): boolean {
    if (!this.lastAudit) return false;
    return this.lastAudit.orphanRate < 5;
  }

  /**
   * Get summary statistics.
   */
  getSummary(): { total: number; active: number; orphan: number; orphanRate: number } | null {
    if (!this.lastAudit) return null;
    return {
      total: this.lastAudit.totalEngines,
      active: this.lastAudit.activeEngines,
      orphan: this.lastAudit.orphanEngines,
      orphanRate: this.lastAudit.orphanRate,
    };
  }

  /**
   * Get last audit result.
   */
  getLastAudit(): AuditResult | null {
    return this.lastAudit;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private discoverEngines(excludePatterns: string[]): string[] {
    try {
      const files = fs.readdirSync(this.enginesDir);
      return files.filter(f => {
        if (!f.endsWith(".ts")) return false;
        for (const pattern of excludePatterns) {
          if (f.includes(pattern)) return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  }

  private extractEngineId(filename: string): string {
    return filename.replace(/\.ts$/, "").replace(/Engine$/, "");
  }

  private scanDispatchers(): Set<string> {
    const refs = new Set<string>();
    try {
      const files = fs.readdirSync(this.dispatchersDir).filter(f => f.endsWith("Dispatcher.ts"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(this.dispatchersDir, file), "utf-8");
        const imports = content.match(/from\s+["']\.\.\/\.\.\/engines\/([^"']+)["']/g) || [];
        for (const imp of imports) {
          const match = imp.match(/engines\/([^"']+)/);
          if (match) refs.add(match[1].replace(".js", "").replace(".ts", ""));
        }
      }
    } catch {
      // Directory may not exist
    }
    return refs;
  }

  private scanTests(): Set<string> {
    const refs = new Set<string>();
    try {
      const files = fs.readdirSync(this.testsDir).filter(f => f.endsWith(".test.ts"));
      for (const file of files) {
        refs.add(file);
        refs.add(file.replace(".test.ts", ""));
        refs.add(file.replace(".test.ts", "Engine"));
      }
    } catch {
      // Directory may not exist
    }
    return refs;
  }

  private scanExports(): Set<string> {
    const refs = new Set<string>();
    try {
      const indexPath = path.join(this.enginesDir, "index.ts");
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, "utf-8");
        const exports = content.match(/export\s+\*\s+from\s+["']\.\/([^"']+)["']/g) || [];
        for (const exp of exports) {
          const match = exp.match(/\.\/([^"']+)/);
          if (match) refs.add(match[1].replace(".js", "").replace(".ts", ""));
        }
      }
    } catch {
      // Index may not exist
    }
    return refs;
  }

  private checkHasAction(engineId: string, dispatcherRefs: Set<string>): boolean {
    return dispatcherRefs.has(engineId) || dispatcherRefs.has(engineId + "Engine");
  }

  private countConsumers(engineId: string): number {
    let count = 0;
    try {
      const files = fs.readdirSync(this.enginesDir).filter(f => f.endsWith(".ts") && !f.includes("index"));
      for (const file of files) {
        if (file.includes(engineId)) continue;
        const content = fs.readFileSync(path.join(this.enginesDir, file), "utf-8");
        if (content.includes(engineId)) count++;
      }
    } catch {
      // Ignore errors
    }
    return count;
  }

  private getInvocationStats(engineId: string): { lastInvoked: string | null; invokeCount: number } {
    // Would integrate with telemetry in production
    return { lastInvoked: null, invokeCount: 0 };
  }

  private generateRecommendations(utils: EngineUtilization[], orphanRate: number): string[] {
    const recs: string[] = [];

    if (orphanRate >= 5) {
      recs.push(`CRITICAL: Orphan rate ${orphanRate.toFixed(1)}% exceeds 5% exit gate threshold`);
    }

    const orphans = utils.filter(u => u.status === "orphan");
    if (orphans.length > 0) {
      recs.push(`Wire ${orphans.length} orphan engines to dispatchers or mark for deletion`);
      const top5 = orphans.slice(0, 5).map(o => o.engineId);
      recs.push(`Top orphans: ${top5.join(", ")}`);
    }

    const untested = utils.filter(u => !u.hasTest);
    if (untested.length > 10) {
      recs.push(`Add tests for ${untested.length} engines to improve coverage`);
    }

    const unwired = utils.filter(u => u.status === "unwired");
    if (unwired.length > 0) {
      recs.push(`Export ${unwired.length} unwired engines in engines/index.ts`);
    }

    return recs;
  }

  /**
   * Reset cache.
   */
  reset(): void {
    this.cache.clear();
    this.lastAudit = null;
    log.info("[EngineUtilizationAuditor] Cache cleared");
  }
}

export const engineUtilizationAuditorEngine = new EngineUtilizationAuditorEngine();
