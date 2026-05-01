/**
 * HealthEngine — L2-P3-MS1 Infrastructure Layer
 *
 * System health checks: liveness, readiness, component status,
 * dependency checks, and overall health scoring.
 *
 * Actions: health_check, health_liveness, health_readiness,
 *          health_components, health_history
 */

// ============================================================================
// TYPES
// ============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Health Component configuration/data structure.
 */
export interface HealthComponent {
  name: string;
  status: HealthStatus;
  response_time_ms: number;
  last_check: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

/** Health Check configuration/data structure.
 */
export interface HealthCheck {
  status: HealthStatus;
  timestamp: string;
  uptime_sec: number;
  version: string;
  components: HealthComponent[];
  checks_passed: number;
  checks_failed: number;
  score_pct: number;
}

/** Health History Entry configuration/data structure.
 */
export interface HealthHistoryEntry {
  timestamp: string;
  status: HealthStatus;
  score_pct: number;
  failed_components: string[];
}

/** Health Checker type definition.
 */
export type HealthChecker = () => { status: HealthStatus; message?: string; metadata?: Record<string, unknown> };

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Health Engine engine/manager.
 */
export class HealthEngine {
  private components = new Map<string, HealthChecker>();
  private history: HealthHistoryEntry[] = [];
  private startTime = Date.now();
  private version = "1.0.0";
  private maxHistory = 500;

  /** Registers component.
   * @param name - name identifier
   * @param checker - checker
   * @returns void
   */
  registerComponent(name: string, checker: HealthChecker): void {
    this.components.set(name, checker);
  }

  /** Unregister Component.
   * @param name - name identifier
   * @returns true if condition is met
   */
  unregisterComponent(name: string): boolean {
    return this.components.delete(name);
  }

  /** Check.
   * @returns health check
   */
  check(): HealthCheck {
    const results: HealthComponent[] = [];
    let passed = 0;
    let failed = 0;

    /** For.
     * @param const - const
     * @param checker] - checker]
     * @returns void
     */
    for (const [name, checker] of this.components) {
      const start = performance.now();
      try {
        const result = checker();
        const elapsed = performance.now() - start;
        results.push({
          name, status: result.status,
          response_time_ms: Math.round(elapsed * 100) / 100,
          last_check: new Date().toISOString(),
          message: result.message,
          metadata: result.metadata,
        });
        if (result.status === "healthy") passed++;
        else failed++;
      } catch (err) {
        const elapsed = performance.now() - start;
        results.push({
          name, status: "unhealthy",
          response_time_ms: Math.round(elapsed * 100) / 100,
          last_check: new Date().toISOString(),
          message: err instanceof Error ? err.message : "Unknown error",
        });
        failed++;
      }
    }

    const total = passed + failed;
    const scorePct = total > 0 ? Math.round(passed / total * 100) : 100;
    const overallStatus: HealthStatus = failed === 0 ? "healthy" : failed < total * 0.5 ? "degraded" : "unhealthy";

    const entry: HealthHistoryEntry = {
      timestamp: new Date().toISOString(),
      status: overallStatus,
      score_pct: scorePct,
      failed_components: results.filter(c => c.status !== "healthy").map(c => c.name),
    };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_sec: Math.round((Date.now() - this.startTime) / 1000),
      version: this.version,
      components: results,
      checks_passed: passed,
      checks_failed: failed,
      score_pct: scorePct,
    };
  }

  /** Liveness.
   * @returns { alive: boolean; uptime_sec: number }
   */
  liveness(): { alive: boolean; uptime_sec: number } {
    return { alive: true, uptime_sec: Math.round((Date.now() - this.startTime) / 1000) };
  }

  /** Readiness.
   * @returns { ready: boolean; components: { name: string; ready: boolean }[] }
   */
  readiness(): { ready: boolean; components: { name: string; ready: boolean }[] } {
    const components: { name: string; ready: boolean }[] = [];
    /** For.
     * @param const - const
     * @param checker] - checker]
     * @returns void
     */
    for (const [name, checker] of this.components) {
      try {
        const result = checker();
        components.push({ name, ready: result.status === "healthy" || result.status === "degraded" });
      } catch {
        components.push({ name, ready: false });
      }
    }
    return { ready: components.every(c => c.ready), components };
  }

  /** Gets history.
   * @param limit - maximum number of results
   * @returns health history entry[]
   */
  getHistory(limit: number = 50): HealthHistoryEntry[] {
    return this.history.slice(-limit);
  }

  /** Sets version.
   * @param version - version
   * @returns void
   */
  setVersion(version: string): void {
    this.version = version;
  }

  /** List Components.
   * @returns string[]
   */
  listComponents(): string[] {
    return [...this.components.keys()];
  }

  /** Clear.
   * @returns void
   */
  clear(): void {
    this.components.clear();
    this.history = [];
  }
}

/** Health Engine constant.
 */
export const healthEngine = new HealthEngine();
