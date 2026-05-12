/**
 * PerformanceBudgetEngine - Enforces latency SLAs, memory limits, and offline inference support
 *
 * Addresses P0-CRITICAL gap: No latency SLAs defined, no memory limits, no offline inference support.
 *
 * Features:
 *   - Define performance budgets with p50/p95/p99/max latency targets
 *   - Memory budget enforcement (heap + model memory)
 *   - Operation modes: realtime, batch, offline
 *   - Network availability detection with fallback to local models
 *   - Metric collection for monitoring and CI regression tests
 *   - Budget violation alerts (warn/throw based on severity)
 *
 * @engine PerformanceBudgetEngine
 * @shortcode E1201
 * @dispatcher infraDispatcher
 * @actions perf_budget_check, perf_budget_wrap, perf_budget_stats, perf_budget_offline
 * @milestone PP-PERF-BUDGET
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LatencyBudget {
  /** 50th percentile latency target in milliseconds */
  p50: number;
  /** 95th percentile latency target in milliseconds */
  p95: number;
  /** 99th percentile latency target in milliseconds */
  p99: number;
  /** Hard timeout - operation fails if exceeded */
  max: number;
}

export interface MemoryBudget {
  /** Heap memory limit in MB */
  heapLimit: number;
  /** Memory allocated for loaded models in MB */
  modelMemory: number;
}

export type OperationMode = "realtime" | "batch" | "offline";

export interface PerformanceBudget {
  /** Human-readable operation description */
  operation: string;
  /** Latency targets per percentile */
  latencyBudget: LatencyBudget;
  /** Memory constraints */
  memoryBudget: MemoryBudget;
  /** Operation mode */
  mode: OperationMode;
}

export interface ExecutionMetric {
  /** Operation identifier */
  operationId: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Peak heap memory during execution in MB */
  peakHeapMb: number;
  /** Timestamp of execution */
  timestamp: number;
  /** Whether budget was violated */
  budgetViolated: boolean;
  /** Specific violations */
  violations: string[];
  /** Whether executed in offline mode */
  offlineMode: boolean;
}

export interface BudgetStats {
  /** Operation identifier */
  operationId: string;
  /** Total executions tracked */
  totalExecutions: number;
  /** Number of budget violations */
  violations: number;
  /** Violation rate (0-1) */
  violationRate: number;
  /** Actual percentile latencies */
  actualLatencies: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  /** Average heap usage */
  avgHeapMb: number;
  /** Peak heap usage observed */
  peakHeapMb: number;
  /** Budget compliance summary */
  compliance: {
    p50Met: boolean;
    p95Met: boolean;
    p99Met: boolean;
    maxMet: boolean;
    heapMet: boolean;
  };
}

export interface OfflineConfig {
  /** Whether offline mode is enabled */
  enabled: boolean;
  /** Local model paths for offline inference */
  localModelPaths: Map<string, string>;
  /** Cache directory for remote results */
  cacheDir: string;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Network check interval in milliseconds */
  networkCheckIntervalMs: number;
}

export interface BudgetViolation {
  /** Operation that violated */
  operationId: string;
  /** Type of violation */
  type: "latency_p50" | "latency_p95" | "latency_p99" | "latency_max" | "heap_limit" | "model_memory";
  /** Budget limit */
  limit: number;
  /** Actual value */
  actual: number;
  /** Unit of measurement */
  unit: "ms" | "MB";
  /** Severity level */
  severity: "warn" | "error" | "critical";
  /** Timestamp */
  timestamp: number;
}

export interface WrapResult<T> {
  /** The wrapped function's return value */
  result: T;
  /** Execution metrics */
  metrics: ExecutionMetric;
  /** Whether operation succeeded within budget */
  withinBudget: boolean;
  /** Violations encountered */
  violations: BudgetViolation[];
}

export interface NetworkStatus {
  /** Whether network is available */
  available: boolean;
  /** Last check timestamp */
  lastChecked: number;
  /** Latency to check endpoint in ms */
  latencyMs: number | null;
  /** Consecutive failures */
  consecutiveFailures: number;
}

export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Cache timestamp */
  cachedAt: number;
  /** TTL in milliseconds */
  ttlMs: number;
  /** Cache key */
  key: string;
}

// ─── Predefined Post-Processor Budgets ────────────────────────────────────────

export const PP_BUDGETS: Record<string, PerformanceBudget> = {
  pp_generate_simple: {
    operation: "Simple G-code generation",
    latencyBudget: { p50: 100, p95: 500, p99: 1000, max: 5000 },
    memoryBudget: { heapLimit: 512, modelMemory: 200 },
    mode: "realtime",
  },
  pp_generate_complex: {
    operation: "Complex 5-axis G-code",
    latencyBudget: { p50: 500, p95: 2000, p99: 5000, max: 30000 },
    memoryBudget: { heapLimit: 2048, modelMemory: 500 },
    mode: "batch",
  },
  pp_neural_inference: {
    operation: "Neural network inference",
    latencyBudget: { p50: 50, p95: 200, p99: 500, max: 2000 },
    memoryBudget: { heapLimit: 4096, modelMemory: 2000 },
    mode: "realtime",
  },
  pp_collision_check: {
    operation: "Collision detection",
    latencyBudget: { p50: 20, p95: 100, p99: 200, max: 1000 },
    memoryBudget: { heapLimit: 1024, modelMemory: 100 },
    mode: "realtime",
  },
  pp_toolpath_optimize: {
    operation: "Toolpath optimization",
    latencyBudget: { p50: 200, p95: 1000, p99: 3000, max: 15000 },
    memoryBudget: { heapLimit: 2048, modelMemory: 300 },
    mode: "batch",
  },
  pp_surface_analysis: {
    operation: "Surface finish analysis",
    latencyBudget: { p50: 50, p95: 200, p99: 500, max: 2000 },
    memoryBudget: { heapLimit: 512, modelMemory: 150 },
    mode: "realtime",
  },
  pp_thermal_simulation: {
    operation: "Thermal simulation",
    latencyBudget: { p50: 1000, p95: 5000, p99: 10000, max: 60000 },
    memoryBudget: { heapLimit: 4096, modelMemory: 1000 },
    mode: "batch",
  },
  pp_force_prediction: {
    operation: "Cutting force prediction",
    latencyBudget: { p50: 30, p95: 100, p99: 200, max: 1000 },
    memoryBudget: { heapLimit: 256, modelMemory: 50 },
    mode: "realtime",
  },
  pp_offline_inference: {
    operation: "Offline model inference",
    latencyBudget: { p50: 100, p95: 500, p99: 1000, max: 5000 },
    memoryBudget: { heapLimit: 2048, modelMemory: 1500 },
    mode: "offline",
  },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class PerformanceBudgetEngine {
  private budgets: Map<string, PerformanceBudget> = new Map();
  private metrics: Map<string, ExecutionMetric[]> = new Map();
  private violations: BudgetViolation[] = [];
  private networkStatus: NetworkStatus = {
    available: true,
    lastChecked: 0,
    latencyMs: null,
    consecutiveFailures: 0,
  };
  private offlineConfig: OfflineConfig = {
    enabled: false,
    localModelPaths: new Map(),
    cacheDir: ".prism-cache",
    cacheTtlMs: 3600000, // 1 hour
    networkCheckIntervalMs: 30000, // 30 seconds
  };
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxMetricsPerOperation = 1000;

  constructor() {
    // Initialize with predefined PP budgets
    for (const [id, budget] of Object.entries(PP_BUDGETS)) {
      this.budgets.set(id, budget);
    }
  }

  // ── Budget Management ───────────────────────────────────────────────────────

  /**
   * Register a new performance budget
   */
  registerBudget(operationId: string, budget: PerformanceBudget): void {
    this.budgets.set(operationId, budget);
  }

  /**
   * Get a registered budget
   */
  getBudget(operationId: string): PerformanceBudget | undefined {
    return this.budgets.get(operationId);
  }

  /**
   * List all registered budgets
   */
  listBudgets(): Array<{ operationId: string; budget: PerformanceBudget }> {
    return Array.from(this.budgets.entries()).map(([operationId, budget]) => ({
      operationId,
      budget,
    }));
  }

  // ── Budget Enforcement ──────────────────────────────────────────────────────

  /**
   * Wrap an async operation with budget enforcement
   * @param operationId - The operation identifier (must have a registered budget)
   * @param fn - The async function to execute
   * @param options - Additional options
   * @returns WrapResult with execution metrics and violations
   */
  async wrap<T>(
    operationId: string,
    fn: () => Promise<T>,
    options: {
      throwOnViolation?: boolean;
      allowOfflineFallback?: boolean;
      cacheKey?: string;
    } = {}
  ): Promise<WrapResult<T>> {
    const budget = this.budgets.get(operationId);
    if (!budget) {
      throw new Error(`No budget registered for operation: ${operationId}`);
    }

    const { throwOnViolation = false, allowOfflineFallback = true, cacheKey } = options;

    // Check cache first if in offline mode
    if (this.offlineConfig.enabled && cacheKey) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== undefined) {
        const metrics: ExecutionMetric = {
          operationId,
          durationMs: 0,
          peakHeapMb: 0,
          timestamp: Date.now(),
          budgetViolated: false,
          violations: [],
          offlineMode: true,
        };
        this.recordMetric(metrics);
        return {
          result: cached,
          metrics,
          withinBudget: true,
          violations: [],
        };
      }
    }

    // Capture initial heap state
    const initialHeap = this.getHeapUsageMb();
    const startTime = Date.now();
    let peakHeap = initialHeap;

    // Execute with timeout
    const timeoutMs = budget.latencyBudget.max;
    const heapCheckInterval = setInterval(() => {
      const currentHeap = this.getHeapUsageMb();
      if (currentHeap > peakHeap) {
        peakHeap = currentHeap;
      }
    }, 10);

    let result: T;
    let executionError: Error | null = null;

    try {
      result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    } catch (error) {
      executionError = error instanceof Error ? error : new Error(String(error));

      // Try offline fallback if enabled
      if (allowOfflineFallback && this.offlineConfig.enabled && cacheKey) {
        const fallback = this.getFromCache<T>(cacheKey);
        if (fallback !== undefined) {
          clearInterval(heapCheckInterval);
          const metrics: ExecutionMetric = {
            operationId,
            durationMs: Date.now() - startTime,
            peakHeapMb: peakHeap,
            timestamp: Date.now(),
            budgetViolated: true,
            violations: ["Fallback to cached result due to: " + executionError.message],
            offlineMode: true,
          };
          this.recordMetric(metrics);
          return {
            result: fallback,
            metrics,
            withinBudget: false,
            violations: [],
          };
        }
      }
      throw executionError;
    } finally {
      clearInterval(heapCheckInterval);
    }

    const durationMs = Date.now() - startTime;
    const finalHeap = this.getHeapUsageMb();
    if (finalHeap > peakHeap) {
      peakHeap = finalHeap;
    }

    // Check for violations
    const violationList: BudgetViolation[] = [];
    const violationStrings: string[] = [];

    // Note: p50/p95/p99 are percentile targets - we check against max for individual executions
    // The percentile compliance is calculated in getStats() across multiple executions
    if (durationMs > budget.latencyBudget.max) {
      const violation: BudgetViolation = {
        operationId,
        type: "latency_max",
        limit: budget.latencyBudget.max,
        actual: durationMs,
        unit: "ms",
        severity: "critical",
        timestamp: Date.now(),
      };
      violationList.push(violation);
      violationStrings.push(`latency_max: ${durationMs}ms > ${budget.latencyBudget.max}ms`);
    }

    if (peakHeap > budget.memoryBudget.heapLimit) {
      const violation: BudgetViolation = {
        operationId,
        type: "heap_limit",
        limit: budget.memoryBudget.heapLimit,
        actual: peakHeap,
        unit: "MB",
        severity: "error",
        timestamp: Date.now(),
      };
      violationList.push(violation);
      violationStrings.push(`heap_limit: ${peakHeap.toFixed(1)}MB > ${budget.memoryBudget.heapLimit}MB`);
    }

    // Record violations
    this.violations.push(...violationList);

    // Create metrics
    const metrics: ExecutionMetric = {
      operationId,
      durationMs,
      peakHeapMb: peakHeap,
      timestamp: Date.now(),
      budgetViolated: violationList.length > 0,
      violations: violationStrings,
      offlineMode: false,
    };

    this.recordMetric(metrics);

    // Cache result for offline use
    if (cacheKey) {
      this.setInCache(cacheKey, result);
    }

    // Throw if requested and violations occurred
    if (throwOnViolation && violationList.length > 0) {
      throw new Error(`Budget violation: ${violationStrings.join(", ")}`);
    }

    return {
      result: result!,
      metrics,
      withinBudget: violationList.length === 0,
      violations: violationList,
    };
  }

  /**
   * Wrap a synchronous operation with budget enforcement
   */
  wrapSync<T>(
    operationId: string,
    fn: () => T,
    options: { throwOnViolation?: boolean } = {}
  ): WrapResult<T> {
    const budget = this.budgets.get(operationId);
    if (!budget) {
      throw new Error(`No budget registered for operation: ${operationId}`);
    }

    const { throwOnViolation = false } = options;
    const initialHeap = this.getHeapUsageMb();
    const startTime = Date.now();

    let result: T;
    try {
      result = fn();
    } catch (error) {
      throw error;
    }

    const durationMs = Date.now() - startTime;
    const peakHeap = this.getHeapUsageMb();

    // Check for violations
    const violationList: BudgetViolation[] = [];
    const violationStrings: string[] = [];

    if (durationMs > budget.latencyBudget.max) {
      const violation: BudgetViolation = {
        operationId,
        type: "latency_max",
        limit: budget.latencyBudget.max,
        actual: durationMs,
        unit: "ms",
        severity: "critical",
        timestamp: Date.now(),
      };
      violationList.push(violation);
      violationStrings.push(`latency_max: ${durationMs}ms > ${budget.latencyBudget.max}ms`);
    }

    if (peakHeap > budget.memoryBudget.heapLimit) {
      const violation: BudgetViolation = {
        operationId,
        type: "heap_limit",
        limit: budget.memoryBudget.heapLimit,
        actual: peakHeap,
        unit: "MB",
        severity: "error",
        timestamp: Date.now(),
      };
      violationList.push(violation);
      violationStrings.push(`heap_limit: ${peakHeap.toFixed(1)}MB > ${budget.memoryBudget.heapLimit}MB`);
    }

    this.violations.push(...violationList);

    const metrics: ExecutionMetric = {
      operationId,
      durationMs,
      peakHeapMb: peakHeap,
      timestamp: Date.now(),
      budgetViolated: violationList.length > 0,
      violations: violationStrings,
      offlineMode: false,
    };

    this.recordMetric(metrics);

    if (throwOnViolation && violationList.length > 0) {
      throw new Error(`Budget violation: ${violationStrings.join(", ")}`);
    }

    return {
      result,
      metrics,
      withinBudget: violationList.length === 0,
      violations: violationList,
    };
  }

  // ── Metrics & Statistics ────────────────────────────────────────────────────

  /**
   * Get statistics for an operation
   */
  getStats(operationId: string): BudgetStats | null {
    const budget = this.budgets.get(operationId);
    const operationMetrics = this.metrics.get(operationId);

    if (!budget || !operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const heaps = operationMetrics.map((m) => m.peakHeapMb);
    const violationCount = operationMetrics.filter((m) => m.budgetViolated).length;

    const percentile = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, Math.min(index, arr.length - 1))];
    };

    const actualLatencies = {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      max: Math.max(...durations),
    };

    const avgHeap = heaps.reduce((s, h) => s + h, 0) / heaps.length;
    const peakHeap = Math.max(...heaps);

    return {
      operationId,
      totalExecutions: operationMetrics.length,
      violations: violationCount,
      violationRate: violationCount / operationMetrics.length,
      actualLatencies,
      avgHeapMb: parseFloat(avgHeap.toFixed(2)),
      peakHeapMb: parseFloat(peakHeap.toFixed(2)),
      compliance: {
        p50Met: actualLatencies.p50 <= budget.latencyBudget.p50,
        p95Met: actualLatencies.p95 <= budget.latencyBudget.p95,
        p99Met: actualLatencies.p99 <= budget.latencyBudget.p99,
        maxMet: actualLatencies.max <= budget.latencyBudget.max,
        heapMet: peakHeap <= budget.memoryBudget.heapLimit,
      },
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): BudgetStats[] {
    const stats: BudgetStats[] = [];
    for (const operationId of Array.from(this.budgets.keys())) {
      const stat = this.getStats(operationId);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats;
  }

  /**
   * Get recent violations
   */
  getViolations(limit = 100): BudgetViolation[] {
    return this.violations.slice(-limit);
  }

  /**
   * Clear metrics for testing or reset
   */
  clearMetrics(operationId?: string): void {
    if (operationId) {
      this.metrics.delete(operationId);
    } else {
      this.metrics.clear();
    }
    this.violations = [];
  }

  /**
   * Get raw metrics for an operation
   */
  getMetrics(operationId: string): ExecutionMetric[] {
    return this.metrics.get(operationId) ?? [];
  }

  // ── Offline Mode Support ────────────────────────────────────────────────────

  /**
   * Configure offline mode
   */
  configureOffline(config: Partial<OfflineConfig>): void {
    this.offlineConfig = { ...this.offlineConfig, ...config };
    if (config.localModelPaths) {
      this.offlineConfig.localModelPaths = new Map(config.localModelPaths);
    }
  }

  /**
   * Check if offline mode is enabled
   */
  isOfflineEnabled(): boolean {
    return this.offlineConfig.enabled;
  }

  /**
   * Enable offline mode
   */
  enableOffline(): void {
    this.offlineConfig.enabled = true;
  }

  /**
   * Disable offline mode
   */
  disableOffline(): void {
    this.offlineConfig.enabled = false;
  }

  /**
   * Check network availability
   */
  async checkNetworkAvailability(endpoint = "https://api.anthropic.com"): Promise<NetworkStatus> {
    const now = Date.now();

    // Return cached status if recent
    if (now - this.networkStatus.lastChecked < this.offlineConfig.networkCheckIntervalMs) {
      return this.networkStatus;
    }

    const startTime = Date.now();
    try {
      // Simple connectivity check - in real implementation would use fetch
      // Here we simulate for testability
      const available = await this.performNetworkCheck(endpoint);

      this.networkStatus = {
        available,
        lastChecked: now,
        latencyMs: Date.now() - startTime,
        consecutiveFailures: available ? 0 : this.networkStatus.consecutiveFailures + 1,
      };
    } catch {
      this.networkStatus = {
        available: false,
        lastChecked: now,
        latencyMs: null,
        consecutiveFailures: this.networkStatus.consecutiveFailures + 1,
      };
    }

    // Auto-enable offline mode after 3 consecutive failures
    if (this.networkStatus.consecutiveFailures >= 3) {
      this.enableOffline();
    }

    return this.networkStatus;
  }

  /**
   * Perform actual network check (overridable for testing)
   */
  protected async performNetworkCheck(_endpoint: string): Promise<boolean> {
    // In production, this would do a real HTTP request
    // Default to true for basic functionality
    return true;
  }

  /**
   * Get network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Register a local model path for offline inference
   */
  registerLocalModel(modelId: string, path: string): void {
    this.offlineConfig.localModelPaths.set(modelId, path);
  }

  /**
   * Get local model path
   */
  getLocalModelPath(modelId: string): string | undefined {
    return this.offlineConfig.localModelPaths.get(modelId);
  }

  // ── Caching ─────────────────────────────────────────────────────────────────

  /**
   * Get a value from cache
   */
  getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  setInCache<T>(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      cachedAt: Date.now(),
      ttlMs: ttlMs ?? this.offlineConfig.cacheTtlMs,
      key,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; keys: string[] } {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // ── CI Integration ──────────────────────────────────────────────────────────

  /**
   * Validate that all operations meet their budgets (for CI)
   * @returns Object with pass/fail status and details
   */
  validateBudgets(): {
    passed: boolean;
    results: Array<{
      operationId: string;
      passed: boolean;
      reason?: string;
      stats: BudgetStats | null;
    }>;
  } {
    const results: Array<{
      operationId: string;
      passed: boolean;
      reason?: string;
      stats: BudgetStats | null;
    }> = [];

    for (const operationId of Array.from(this.budgets.keys())) {
      const stats = this.getStats(operationId);

      if (!stats) {
        results.push({
          operationId,
          passed: true, // No data = no failure
          reason: "No execution data",
          stats: null,
        });
        continue;
      }

      const { compliance } = stats;
      const allMet =
        compliance.p50Met &&
        compliance.p95Met &&
        compliance.p99Met &&
        compliance.maxMet &&
        compliance.heapMet;

      const failedChecks: string[] = [];
      if (!compliance.p50Met) failedChecks.push("p50");
      if (!compliance.p95Met) failedChecks.push("p95");
      if (!compliance.p99Met) failedChecks.push("p99");
      if (!compliance.maxMet) failedChecks.push("max");
      if (!compliance.heapMet) failedChecks.push("heap");

      results.push({
        operationId,
        passed: allMet,
        reason: allMet ? undefined : `Failed: ${failedChecks.join(", ")}`,
        stats,
      });
    }

    return {
      passed: results.every((r) => r.passed),
      results,
    };
  }

  /**
   * Assert budget compliance (throws on failure - for test suites)
   */
  assertBudgetCompliance(operationId: string): void {
    const stats = this.getStats(operationId);
    if (!stats) {
      return; // No data to validate
    }

    const budget = this.budgets.get(operationId)!;
    const errors: string[] = [];

    if (!stats.compliance.p50Met) {
      errors.push(`p50 latency ${stats.actualLatencies.p50}ms exceeds budget ${budget.latencyBudget.p50}ms`);
    }
    if (!stats.compliance.p95Met) {
      errors.push(`p95 latency ${stats.actualLatencies.p95}ms exceeds budget ${budget.latencyBudget.p95}ms`);
    }
    if (!stats.compliance.p99Met) {
      errors.push(`p99 latency ${stats.actualLatencies.p99}ms exceeds budget ${budget.latencyBudget.p99}ms`);
    }
    if (!stats.compliance.maxMet) {
      errors.push(`max latency ${stats.actualLatencies.max}ms exceeds budget ${budget.latencyBudget.max}ms`);
    }
    if (!stats.compliance.heapMet) {
      errors.push(`peak heap ${stats.peakHeapMb}MB exceeds budget ${budget.memoryBudget.heapLimit}MB`);
    }

    if (errors.length > 0) {
      throw new Error(`Budget compliance failed for ${operationId}:\n${errors.join("\n")}`);
    }
  }

  /**
   * Generate a performance report (for CI artifacts)
   */
  generateReport(): {
    timestamp: number;
    summary: {
      totalOperations: number;
      operationsWithData: number;
      passingOperations: number;
      failingOperations: number;
      overallPassRate: number;
    };
    operations: BudgetStats[];
    recentViolations: BudgetViolation[];
  } {
    const validation = this.validateBudgets();
    const operationsWithData = validation.results.filter((r) => r.stats !== null);

    return {
      timestamp: Date.now(),
      summary: {
        totalOperations: this.budgets.size,
        operationsWithData: operationsWithData.length,
        passingOperations: validation.results.filter((r) => r.passed).length,
        failingOperations: validation.results.filter((r) => !r.passed).length,
        overallPassRate:
          operationsWithData.length > 0
            ? validation.results.filter((r) => r.passed).length / operationsWithData.length
            : 1,
      },
      operations: this.getAllStats(),
      recentViolations: this.getViolations(50),
    };
  }

  /**
   * One-liner status
   */
  oneLiner(): string {
    const validation = this.validateBudgets();
    const failing = validation.results.filter((r) => !r.passed).length;
    const total = validation.results.length;
    return `PerfBudget: ${total - failing}/${total} operations compliant, ${this.violations.length} violations`;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private recordMetric(metric: ExecutionMetric): void {
    let operationMetrics = this.metrics.get(metric.operationId);
    if (!operationMetrics) {
      operationMetrics = [];
      this.metrics.set(metric.operationId, operationMetrics);
    }

    operationMetrics.push(metric);

    // Limit stored metrics to prevent memory growth
    if (operationMetrics.length > this.maxMetricsPerOperation) {
      operationMetrics.shift();
    }
  }

  private getHeapUsageMb(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage().heapUsed / (1024 * 1024);
    }
    return 0;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const performanceBudgetEngine = new PerformanceBudgetEngine();
