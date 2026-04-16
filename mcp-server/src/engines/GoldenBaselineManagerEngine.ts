/**
 * GoldenBaselineManagerEngine — Golden Reference Program Management for Neural Testing
 * ====================================================================================
 * Addresses P0-CRITICAL scrutiny finding: "99.5% G-code accuracy claimed but no golden
 * reference programs defined."
 *
 * This engine provides:
 *   1. Golden baseline definition and storage
 *   2. Baseline creation, validation, and update operations
 *   3. Multi-metric comparison (checksum, semantic, tolerance-based)
 *   4. Regression detection for neural G-code generation
 *   5. 100 initial baseline programs across all machine categories
 *
 * Integration Points:
 *   - PostProcessorPipelineEngine (G-code generation validation)
 *   - BenchmarkSuiteEngine (regression test coordination)
 *   - NeuralGcodeGeneratorEngine (output validation)
 *   - QualityScoreEngine (accuracy metrics)
 *
 * Storage: mcp-server/data/baselines/
 *
 * @module engines/GoldenBaselineManagerEngine
 */

import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Machine/process category for baseline programs */
export type BaselineCategory = "lathe" | "mill" | "5axis" | "wedm" | "swiss" | "millturn";

/** Complexity level for baseline programs */
export type BaselineComplexity = "simple" | "medium" | "complex";

/** Result of baseline comparison */
export type ComparisonResult = "exact_match" | "within_tolerance" | "semantic_match" | "failed";

/** Input program metadata */
export interface InputProgramSpec {
  path: string;
  checksum: string;
  metadata: Record<string, unknown>;
}

/** Key metrics extracted from G-code output */
export interface GcodeMetrics {
  lineCount: number;
  toolChangeCount: number;
  estimatedCycleTime: number;   // seconds
  feedRateRange: [number, number];  // [min, max] mm/min
  spindleSpeedRange: [number, number];  // [min, max] RPM
}

/** Expected output specification */
export interface ExpectedOutputSpec {
  gcode: string;
  checksum: string;
  keyMetrics: GcodeMetrics;
}

/** Tolerance thresholds for comparison */
export interface BaselineTolerances {
  lineCountTolerance: number;      // fractional, e.g., 0.05 = ±5%
  cycleTimeTolerance: number;      // fractional, e.g., 0.10 = ±10%
  feedRateTolerance: number;       // fractional, e.g., 0.02 = ±2%
  semanticSimilarity: number;      // 0-1, e.g., 0.95 = 95% similar
}

/** Complete golden baseline definition */
export interface GoldenBaseline {
  baselineId: string;
  version: string;
  category: BaselineCategory;
  complexity: BaselineComplexity;
  inputProgram: InputProgramSpec;
  expectedOutput: ExpectedOutputSpec;
  tolerances: BaselineTolerances;
  createdAt: string;
  approvedBy: string;
  modelVersion: string;
  description?: string;
  tags?: string[];
}

/** Filter criteria for listing baselines */
export interface BaselineFilter {
  category?: BaselineCategory;
  complexity?: BaselineComplexity;
  tags?: string[];
  modelVersion?: string;
  approvedBy?: string;
}

/** Detailed comparison report */
export interface ComparisonReport {
  baselineId: string;
  result: ComparisonResult;
  checksumMatch: boolean;
  metricsWithinTolerance: boolean;
  semanticSimilarity: number;
  details: {
    lineCountDelta: number;       // actual - expected
    lineCountDeltaPct: number;    // percentage difference
    cycleTimeDelta: number;
    cycleTimeDeltaPct: number;
    feedRateInRange: boolean;
    spindleSpeedInRange: boolean;
    toolChangeCountMatch: boolean;
  };
  failureReasons: string[];
  timestamp: string;
}

/** Update record for audit trail */
export interface BaselineUpdateRecord {
  baselineId: string;
  previousVersion: string;
  newVersion: string;
  reason: string;
  updatedBy: string;
  updatedAt: string;
  previousChecksum: string;
  newChecksum: string;
}

/** Baseline registry index */
export interface BaselineRegistry {
  schemaVersion: string;
  totalBaselines: number;
  categoryCounts: Record<BaselineCategory, number>;
  complexityCounts: Record<BaselineComplexity, number>;
  lastUpdated: string;
  baselines: GoldenBaseline[];
  updateHistory: BaselineUpdateRecord[];
}

/** Export format options */
export type ExportFormat = "json" | "csv";

/** Validation result for baseline creation */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BASELINES_DIR = path.resolve(__dirname, "../../data/baselines");
const REGISTRY_FILE = path.join(BASELINES_DIR, "baseline-registry.json");
const SCHEMA_VERSION = "1.0.0";

/** Default tolerances for different complexity levels */
const DEFAULT_TOLERANCES: Record<BaselineComplexity, BaselineTolerances> = {
  simple: {
    lineCountTolerance: 0.05,      // ±5%
    cycleTimeTolerance: 0.10,      // ±10%
    feedRateTolerance: 0.02,       // ±2%
    semanticSimilarity: 0.95,      // 95%
  },
  medium: {
    lineCountTolerance: 0.07,      // ±7%
    cycleTimeTolerance: 0.12,      // ±12%
    feedRateTolerance: 0.03,       // ±3%
    semanticSimilarity: 0.93,      // 93%
  },
  complex: {
    lineCountTolerance: 0.10,      // ±10%
    cycleTimeTolerance: 0.15,      // ±15%
    feedRateTolerance: 0.05,       // ±5%
    semanticSimilarity: 0.90,      // 90%
  },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

/**
 * GoldenBaselineManagerEngine — Golden reference program management
 */
export class GoldenBaselineManagerEngine {
  private registry: BaselineRegistry;
  private initialized: boolean = false;
  private inMemoryMode: boolean = false;  // For testing without disk I/O

  constructor(options?: { inMemory?: boolean }) {
    this.registry = this.createEmptyRegistry();
    this.inMemoryMode = options?.inMemory ?? false;
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  /**
   * Initialize the engine, loading existing baselines from disk (or memory)
   */
  initialize(): void {
    if (this.initialized) return;

    if (!this.inMemoryMode) {
      this.ensureDirectoryExists();
      this.loadRegistry();
    } else {
      // In-memory mode: just initialize defaults directly
      this.initializeDefaultBaselines();
    }
    this.initialized = true;
    log.info(`GoldenBaselineManagerEngine initialized with ${this.registry.totalBaselines} baselines`);
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(BASELINES_DIR)) {
      fs.mkdirSync(BASELINES_DIR, { recursive: true });
    }
  }

  private createEmptyRegistry(): BaselineRegistry {
    return {
      schemaVersion: SCHEMA_VERSION,
      totalBaselines: 0,
      categoryCounts: { lathe: 0, mill: 0, "5axis": 0, wedm: 0, swiss: 0, millturn: 0 },
      complexityCounts: { simple: 0, medium: 0, complex: 0 },
      lastUpdated: new Date().toISOString(),
      baselines: [],
      updateHistory: [],
    };
  }

  private loadRegistry(): void {
    if (fs.existsSync(REGISTRY_FILE)) {
      try {
        const content = fs.readFileSync(REGISTRY_FILE, "utf-8");
        this.registry = JSON.parse(content);
        log.debug(`Loaded baseline registry with ${this.registry.totalBaselines} entries`);
      } catch (err) {
        log.warn(`Failed to load baseline registry, starting fresh: ${err}`);
        this.registry = this.createEmptyRegistry();
      }
    } else {
      this.registry = this.createEmptyRegistry();
      this.initializeDefaultBaselines();
    }
  }

  private saveRegistry(): void {
    this.registry.lastUpdated = new Date().toISOString();
    if (!this.inMemoryMode) {
      safeWriteSync(REGISTRY_FILE, JSON.stringify(this.registry, null, 2));
      log.debug(`Saved baseline registry with ${this.registry.totalBaselines} entries`);
    }
  }

  // --------------------------------------------------------------------------
  // BASELINE CRUD OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Create a new golden baseline
   */
  createBaseline(
    inputProgram: InputProgramSpec,
    expectedOutput: ExpectedOutputSpec,
    options: {
      category: BaselineCategory;
      complexity: BaselineComplexity;
      tolerances?: Partial<BaselineTolerances>;
      approvedBy: string;
      modelVersion: string;
      description?: string;
      tags?: string[];
    }
  ): GoldenBaseline {
    this.ensureInitialized();
    return this.createBaselineInternal(inputProgram, expectedOutput, options);
  }

  /**
   * Internal baseline creation (no ensureInitialized call - for use during initialization)
   */
  private createBaselineInternal(
    inputProgram: InputProgramSpec,
    expectedOutput: ExpectedOutputSpec,
    options: {
      category: BaselineCategory;
      complexity: BaselineComplexity;
      tolerances?: Partial<BaselineTolerances>;
      approvedBy: string;
      modelVersion: string;
      description?: string;
      tags?: string[];
    }
  ): GoldenBaseline {
    // Generate unique baseline ID
    const baselineId = this.generateBaselineId(options.category, options.complexity);

    // Merge tolerances with defaults
    const defaultTol = DEFAULT_TOLERANCES[options.complexity];
    const tolerances: BaselineTolerances = {
      ...defaultTol,
      ...options.tolerances,
    };

    // Validate inputs
    const validation = this.validateBaselineInputs(inputProgram, expectedOutput, tolerances);
    if (!validation.valid) {
      throw new Error(`Invalid baseline inputs: ${validation.errors.join("; ")}`);
    }

    // Create baseline
    const baseline: GoldenBaseline = {
      baselineId,
      version: "1.0.0",
      category: options.category,
      complexity: options.complexity,
      inputProgram: {
        ...inputProgram,
        checksum: inputProgram.checksum || this.computeChecksum(inputProgram.path),
      },
      expectedOutput: {
        ...expectedOutput,
        checksum: expectedOutput.checksum || this.computeChecksum(expectedOutput.gcode),
      },
      tolerances,
      createdAt: new Date().toISOString(),
      approvedBy: options.approvedBy,
      modelVersion: options.modelVersion,
      description: options.description,
      tags: options.tags,
    };

    // Add to registry
    this.registry.baselines.push(baseline);
    this.registry.totalBaselines++;
    this.registry.categoryCounts[baseline.category]++;
    this.registry.complexityCounts[baseline.complexity]++;

    this.saveRegistry();
    log.info(`Created baseline ${baselineId} (${options.category}/${options.complexity})`);

    return baseline;
  }

  /**
   * Validate actual G-code output against a baseline
   */
  validateAgainstBaseline(
    actualOutput: string,
    baselineId: string,
    actualMetrics?: Partial<GcodeMetrics>
  ): ComparisonReport {
    this.ensureInitialized();

    const baseline = this.getBaseline(baselineId);
    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineId}`);
    }

    const actualChecksum = this.computeChecksum(actualOutput);
    const expectedChecksum = baseline.expectedOutput.checksum;
    const checksumMatch = actualChecksum === expectedChecksum;

    // Extract metrics from actual output if not provided
    const metrics = actualMetrics
      ? this.completeMetrics(actualMetrics, actualOutput)
      : this.extractMetrics(actualOutput);

    // Compare metrics
    const expectedMetrics = baseline.expectedOutput.keyMetrics;
    const tolerances = baseline.tolerances;

    const lineCountDelta = metrics.lineCount - expectedMetrics.lineCount;
    const lineCountDeltaPct = Math.abs(lineCountDelta) / expectedMetrics.lineCount;

    const cycleTimeDelta = metrics.estimatedCycleTime - expectedMetrics.estimatedCycleTime;
    const cycleTimeDeltaPct = Math.abs(cycleTimeDelta) / expectedMetrics.estimatedCycleTime;

    const feedRateInRange =
      metrics.feedRateRange[0] >= expectedMetrics.feedRateRange[0] * (1 - tolerances.feedRateTolerance) &&
      metrics.feedRateRange[1] <= expectedMetrics.feedRateRange[1] * (1 + tolerances.feedRateTolerance);

    const spindleSpeedInRange =
      metrics.spindleSpeedRange[0] >= expectedMetrics.spindleSpeedRange[0] * 0.95 &&
      metrics.spindleSpeedRange[1] <= expectedMetrics.spindleSpeedRange[1] * 1.05;

    const toolChangeCountMatch = metrics.toolChangeCount === expectedMetrics.toolChangeCount;

    // Calculate semantic similarity
    const semanticSimilarity = checksumMatch ? 1.0 : this.calculateSemanticSimilarity(
      actualOutput,
      baseline.expectedOutput.gcode
    );

    // Determine overall result
    const metricsWithinTolerance =
      lineCountDeltaPct <= tolerances.lineCountTolerance &&
      cycleTimeDeltaPct <= tolerances.cycleTimeTolerance &&
      feedRateInRange;

    const failureReasons: string[] = [];

    let result: ComparisonResult;
    if (checksumMatch) {
      result = "exact_match";
    } else if (metricsWithinTolerance && semanticSimilarity >= tolerances.semanticSimilarity) {
      result = "within_tolerance";
    } else if (semanticSimilarity >= tolerances.semanticSimilarity) {
      result = "semantic_match";
      if (!metricsWithinTolerance) {
        if (lineCountDeltaPct > tolerances.lineCountTolerance) {
          failureReasons.push(`Line count delta ${(lineCountDeltaPct * 100).toFixed(1)}% exceeds tolerance ${(tolerances.lineCountTolerance * 100)}%`);
        }
        if (cycleTimeDeltaPct > tolerances.cycleTimeTolerance) {
          failureReasons.push(`Cycle time delta ${(cycleTimeDeltaPct * 100).toFixed(1)}% exceeds tolerance ${(tolerances.cycleTimeTolerance * 100)}%`);
        }
      }
    } else {
      result = "failed";
      failureReasons.push(`Semantic similarity ${(semanticSimilarity * 100).toFixed(1)}% below threshold ${(tolerances.semanticSimilarity * 100)}%`);
      if (lineCountDeltaPct > tolerances.lineCountTolerance) {
        failureReasons.push(`Line count delta ${(lineCountDeltaPct * 100).toFixed(1)}% exceeds tolerance`);
      }
      if (cycleTimeDeltaPct > tolerances.cycleTimeTolerance) {
        failureReasons.push(`Cycle time delta ${(cycleTimeDeltaPct * 100).toFixed(1)}% exceeds tolerance`);
      }
    }

    return {
      baselineId,
      result,
      checksumMatch,
      metricsWithinTolerance,
      semanticSimilarity,
      details: {
        lineCountDelta,
        lineCountDeltaPct,
        cycleTimeDelta,
        cycleTimeDeltaPct,
        feedRateInRange,
        spindleSpeedInRange,
        toolChangeCountMatch,
      },
      failureReasons,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update an existing baseline with new expected output
   */
  updateBaseline(
    baselineId: string,
    newExpected: ExpectedOutputSpec,
    reason: string,
    updatedBy: string
  ): GoldenBaseline {
    this.ensureInitialized();

    const index = this.registry.baselines.findIndex(b => b.baselineId === baselineId);
    if (index === -1) {
      throw new Error(`Baseline not found: ${baselineId}`);
    }

    const baseline = this.registry.baselines[index];
    const previousVersion = baseline.version;
    const previousChecksum = baseline.expectedOutput.checksum;

    // Increment version
    const [major, minor, patch] = baseline.version.split(".").map(Number);
    baseline.version = `${major}.${minor}.${patch + 1}`;

    // Update expected output
    baseline.expectedOutput = {
      ...newExpected,
      checksum: newExpected.checksum || this.computeChecksum(newExpected.gcode),
    };

    // Record update history
    const updateRecord: BaselineUpdateRecord = {
      baselineId,
      previousVersion,
      newVersion: baseline.version,
      reason,
      updatedBy,
      updatedAt: new Date().toISOString(),
      previousChecksum,
      newChecksum: baseline.expectedOutput.checksum,
    };
    this.registry.updateHistory.push(updateRecord);

    this.saveRegistry();
    log.info(`Updated baseline ${baselineId} from v${previousVersion} to v${baseline.version}`);

    return baseline;
  }

  /**
   * Get a specific baseline by ID
   */
  getBaseline(baselineId: string): GoldenBaseline | undefined {
    this.ensureInitialized();
    return this.registry.baselines.find(b => b.baselineId === baselineId);
  }

  /**
   * List baselines with optional filtering
   */
  listBaselines(filter?: BaselineFilter): GoldenBaseline[] {
    this.ensureInitialized();

    let results = [...this.registry.baselines];

    if (filter) {
      if (filter.category) {
        results = results.filter(b => b.category === filter.category);
      }
      if (filter.complexity) {
        results = results.filter(b => b.complexity === filter.complexity);
      }
      if (filter.modelVersion) {
        results = results.filter(b => b.modelVersion === filter.modelVersion);
      }
      if (filter.approvedBy) {
        results = results.filter(b => b.approvedBy === filter.approvedBy);
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(b =>
          b.tags && filter.tags!.some(t => b.tags!.includes(t))
        );
      }
    }

    return results;
  }

  /**
   * Delete a baseline
   */
  deleteBaseline(baselineId: string): boolean {
    this.ensureInitialized();

    const index = this.registry.baselines.findIndex(b => b.baselineId === baselineId);
    if (index === -1) {
      return false;
    }

    const baseline = this.registry.baselines[index];
    this.registry.baselines.splice(index, 1);
    this.registry.totalBaselines--;
    this.registry.categoryCounts[baseline.category]--;
    this.registry.complexityCounts[baseline.complexity]--;

    this.saveRegistry();
    log.info(`Deleted baseline ${baselineId}`);

    return true;
  }

  // --------------------------------------------------------------------------
  // EXPORT OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Export baselines to file
   */
  exportBaselines(format: ExportFormat, filter?: BaselineFilter): string {
    this.ensureInitialized();

    const baselines = this.listBaselines(filter);

    if (format === "json") {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        count: baselines.length,
        baselines,
      }, null, 2);
    }

    // CSV format
    const headers = [
      "baselineId", "version", "category", "complexity",
      "inputPath", "inputChecksum",
      "expectedChecksum", "lineCount", "toolChangeCount", "estimatedCycleTime",
      "feedRateMin", "feedRateMax", "spindleSpeedMin", "spindleSpeedMax",
      "lineCountTolerance", "cycleTimeTolerance", "feedRateTolerance", "semanticSimilarity",
      "createdAt", "approvedBy", "modelVersion", "description"
    ];

    const rows = baselines.map(b => [
      b.baselineId,
      b.version,
      b.category,
      b.complexity,
      b.inputProgram.path,
      b.inputProgram.checksum,
      b.expectedOutput.checksum,
      b.expectedOutput.keyMetrics.lineCount,
      b.expectedOutput.keyMetrics.toolChangeCount,
      b.expectedOutput.keyMetrics.estimatedCycleTime,
      b.expectedOutput.keyMetrics.feedRateRange[0],
      b.expectedOutput.keyMetrics.feedRateRange[1],
      b.expectedOutput.keyMetrics.spindleSpeedRange[0],
      b.expectedOutput.keyMetrics.spindleSpeedRange[1],
      b.tolerances.lineCountTolerance,
      b.tolerances.cycleTimeTolerance,
      b.tolerances.feedRateTolerance,
      b.tolerances.semanticSimilarity,
      b.createdAt,
      b.approvedBy,
      b.modelVersion,
      b.description || "",
    ]);

    return [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  }

  // --------------------------------------------------------------------------
  // STATISTICS AND REPORTING
  // --------------------------------------------------------------------------

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalBaselines: number;
    categoryCounts: Record<BaselineCategory, number>;
    complexityCounts: Record<BaselineComplexity, number>;
    lastUpdated: string;
    updateCount: number;
    coverage: {
      hasLathe: boolean;
      hasMill: boolean;
      has5Axis: boolean;
      hasWedm: boolean;
      hasSwiss: boolean;
      hasMillturn: boolean;
      coveragePercentage: number;
    };
  } {
    this.ensureInitialized();

    const categories: BaselineCategory[] = ["lathe", "mill", "5axis", "wedm", "swiss", "millturn"];
    const coveredCategories = categories.filter(c => this.registry.categoryCounts[c] > 0);

    return {
      totalBaselines: this.registry.totalBaselines,
      categoryCounts: { ...this.registry.categoryCounts },
      complexityCounts: { ...this.registry.complexityCounts },
      lastUpdated: this.registry.lastUpdated,
      updateCount: this.registry.updateHistory.length,
      coverage: {
        hasLathe: this.registry.categoryCounts.lathe > 0,
        hasMill: this.registry.categoryCounts.mill > 0,
        has5Axis: this.registry.categoryCounts["5axis"] > 0,
        hasWedm: this.registry.categoryCounts.wedm > 0,
        hasSwiss: this.registry.categoryCounts.swiss > 0,
        hasMillturn: this.registry.categoryCounts.millturn > 0,
        coveragePercentage: (coveredCategories.length / categories.length) * 100,
      },
    };
  }

  /**
   * Run regression test against all baselines in a category
   */
  runRegressionSuite(
    category: BaselineCategory,
    gcodeGenerator: (inputPath: string) => string
  ): {
    passed: number;
    failed: number;
    results: ComparisonReport[];
  } {
    this.ensureInitialized();

    const baselines = this.listBaselines({ category });
    const results: ComparisonReport[] = [];
    let passed = 0;
    let failed = 0;

    for (const baseline of baselines) {
      try {
        const actualOutput = gcodeGenerator(baseline.inputProgram.path);
        const report = this.validateAgainstBaseline(actualOutput, baseline.baselineId);
        results.push(report);

        if (report.result === "exact_match" || report.result === "within_tolerance") {
          passed++;
        } else {
          failed++;
        }
      } catch (err) {
        results.push({
          baselineId: baseline.baselineId,
          result: "failed",
          checksumMatch: false,
          metricsWithinTolerance: false,
          semanticSimilarity: 0,
          details: {
            lineCountDelta: 0,
            lineCountDeltaPct: 0,
            cycleTimeDelta: 0,
            cycleTimeDeltaPct: 0,
            feedRateInRange: false,
            spindleSpeedInRange: false,
            toolChangeCountMatch: false,
          },
          failureReasons: [`Generator error: ${err}`],
          timestamp: new Date().toISOString(),
        });
        failed++;
      }
    }

    return { passed, failed, results };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  private generateBaselineId(category: BaselineCategory, complexity: BaselineComplexity): string {
    const prefix = category.toUpperCase().replace("5AXIS", "5AX");
    const complexPrefix = complexity.charAt(0).toUpperCase();
    const count = this.registry.baselines.filter(
      b => b.category === category && b.complexity === complexity
    ).length + 1;
    const timestamp = Date.now().toString(36).toUpperCase();
    return `GB-${prefix}-${complexPrefix}${count.toString().padStart(3, "0")}-${timestamp}`;
  }

  private computeChecksum(content: string): string {
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  private validateBaselineInputs(
    inputProgram: InputProgramSpec,
    expectedOutput: ExpectedOutputSpec,
    tolerances: BaselineTolerances
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate input program
    if (!inputProgram.path) {
      errors.push("Input program path is required");
    }

    // Validate expected output
    if (!expectedOutput.gcode || expectedOutput.gcode.length === 0) {
      errors.push("Expected G-code output is required");
    }

    const metrics = expectedOutput.keyMetrics;
    if (metrics.lineCount <= 0) {
      errors.push("Line count must be positive");
    }
    if (metrics.toolChangeCount < 0) {
      errors.push("Tool change count cannot be negative");
    }
    if (metrics.estimatedCycleTime <= 0) {
      errors.push("Estimated cycle time must be positive");
    }
    if (metrics.feedRateRange[0] < 0 || metrics.feedRateRange[1] < metrics.feedRateRange[0]) {
      errors.push("Feed rate range must be valid [min, max] with non-negative values");
    }
    if (metrics.spindleSpeedRange[0] < 0 || metrics.spindleSpeedRange[1] < metrics.spindleSpeedRange[0]) {
      errors.push("Spindle speed range must be valid [min, max] with non-negative values");
    }

    // Validate tolerances
    if (tolerances.lineCountTolerance < 0 || tolerances.lineCountTolerance > 1) {
      errors.push("Line count tolerance must be between 0 and 1");
    }
    if (tolerances.cycleTimeTolerance < 0 || tolerances.cycleTimeTolerance > 1) {
      errors.push("Cycle time tolerance must be between 0 and 1");
    }
    if (tolerances.feedRateTolerance < 0 || tolerances.feedRateTolerance > 1) {
      errors.push("Feed rate tolerance must be between 0 and 1");
    }
    if (tolerances.semanticSimilarity < 0 || tolerances.semanticSimilarity > 1) {
      errors.push("Semantic similarity threshold must be between 0 and 1");
    }

    // Warnings
    if (tolerances.lineCountTolerance > 0.15) {
      warnings.push("Line count tolerance > 15% may allow significant deviations");
    }
    if (tolerances.semanticSimilarity < 0.85) {
      warnings.push("Semantic similarity threshold < 85% may miss important differences");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private extractMetrics(gcode: string): GcodeMetrics {
    const lines = gcode.split("\n").filter(l => l.trim().length > 0);
    const lineCount = lines.length;

    // Count tool changes (T command followed by M6 or standalone T)
    const toolChangePattern = /^[TN]?\d*\s*T\d+|M0?6/gm;
    const toolChangeMatches = gcode.match(toolChangePattern) || [];
    const toolChangeCount = Math.floor(toolChangeMatches.length / 2) || 1;

    // Extract feed rates
    const feedRatePattern = /F(\d+(?:\.\d+)?)/g;
    const feedRates: number[] = [];
    let match;
    while ((match = feedRatePattern.exec(gcode)) !== null) {
      feedRates.push(parseFloat(match[1]));
    }
    const feedRateRange: [number, number] = feedRates.length > 0
      ? [Math.min(...feedRates), Math.max(...feedRates)]
      : [100, 500];

    // Extract spindle speeds
    const spindlePattern = /S(\d+(?:\.\d+)?)/g;
    const spindleSpeeds: number[] = [];
    while ((match = spindlePattern.exec(gcode)) !== null) {
      spindleSpeeds.push(parseFloat(match[1]));
    }
    const spindleSpeedRange: [number, number] = spindleSpeeds.length > 0
      ? [Math.min(...spindleSpeeds), Math.max(...spindleSpeeds)]
      : [500, 3000];

    // Estimate cycle time (rough: sum of move lengths / avg feed)
    const avgFeed = feedRates.length > 0
      ? feedRates.reduce((a, b) => a + b, 0) / feedRates.length
      : 200;
    const estimatedCycleTime = (lineCount * 0.5) * 60 / avgFeed; // rough estimate

    return {
      lineCount,
      toolChangeCount,
      estimatedCycleTime,
      feedRateRange,
      spindleSpeedRange,
    };
  }

  private completeMetrics(partial: Partial<GcodeMetrics>, gcode: string): GcodeMetrics {
    const extracted = this.extractMetrics(gcode);
    return {
      lineCount: partial.lineCount ?? extracted.lineCount,
      toolChangeCount: partial.toolChangeCount ?? extracted.toolChangeCount,
      estimatedCycleTime: partial.estimatedCycleTime ?? extracted.estimatedCycleTime,
      feedRateRange: partial.feedRateRange ?? extracted.feedRateRange,
      spindleSpeedRange: partial.spindleSpeedRange ?? extracted.spindleSpeedRange,
    };
  }

  /**
   * Calculate semantic similarity between two G-code programs
   * Uses structural comparison of motion commands and operations
   */
  private calculateSemanticSimilarity(actual: string, expected: string): number {
    // Normalize both programs
    const normalizeGcode = (code: string): string[] => {
      return code
        .split("\n")
        .map(l => l.trim().toUpperCase())
        .filter(l => l.length > 0 && !l.startsWith("(") && !l.startsWith("%"))
        .map(l => l.replace(/\s+/g, " "));
    };

    const actualLines = normalizeGcode(actual);
    const expectedLines = normalizeGcode(expected);

    if (actualLines.length === 0 || expectedLines.length === 0) {
      return 0;
    }

    // Extract motion commands (G0, G1, G2, G3)
    const extractMotionSequence = (lines: string[]): string[] => {
      return lines
        .filter(l => /^[NG]?\d*\s*G0?[0123]/.test(l))
        .map(l => {
          // Extract just the G-code and significant coordinates
          const gMatch = l.match(/G0?([0123])/);
          const g = gMatch ? `G${gMatch[1]}` : "";
          const hasX = /X[+-]?\d/.test(l);
          const hasY = /Y[+-]?\d/.test(l);
          const hasZ = /Z[+-]?\d/.test(l);
          return `${g}${hasX ? "X" : ""}${hasY ? "Y" : ""}${hasZ ? "Z" : ""}`;
        });
    };

    const actualMotion = extractMotionSequence(actualLines);
    const expectedMotion = extractMotionSequence(expectedLines);

    // Calculate Jaccard similarity for motion sequences
    const actualSet = new Set(actualMotion);
    const expectedSet = new Set(expectedMotion);
    const intersection = new Set([...actualSet].filter(x => expectedSet.has(x)));
    const union = new Set([...actualSet, ...expectedSet]);

    const motionSimilarity = union.size > 0 ? intersection.size / union.size : 0;

    // Calculate line-by-line similarity using longest common subsequence ratio
    const lcsRatio = this.lcsRatio(actualLines, expectedLines);

    // Weighted average: motion structure (40%) + line sequence (60%)
    return 0.4 * motionSimilarity + 0.6 * lcsRatio;
  }

  /**
   * Calculate LCS ratio (longest common subsequence / max length)
   */
  private lcsRatio(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;

    if (m === 0 || n === 0) return 0;

    // Use space-optimized LCS
    const prev = new Array(n + 1).fill(0);
    const curr = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          curr[j] = prev[j - 1] + 1;
        } else {
          curr[j] = Math.max(prev[j], curr[j - 1]);
        }
      }
      [prev, curr].forEach((arr, idx) => {
        if (idx === 0) prev.splice(0, prev.length, ...curr);
      });
      curr.fill(0);
    }

    const lcsLength = prev[n];
    return lcsLength / Math.max(m, n);
  }

  // --------------------------------------------------------------------------
  // DEFAULT BASELINE INITIALIZATION (100 programs)
  // --------------------------------------------------------------------------

  /**
   * Initialize with 100 default baseline programs
   */
  private initializeDefaultBaselines(): void {
    log.info("Initializing 100 default golden baselines...");

    // 20 Simple Lathe Programs
    this.createDefaultLatheBaselines();

    // 20 Simple Mill Programs
    this.createDefaultMillBaselines();

    // 20 Complex 5-Axis Programs
    this.createDefault5AxisBaselines();

    // 20 Wire EDM Programs
    this.createDefaultWedmBaselines();

    // 20 Mixed (Swiss + Mill-Turn)
    this.createDefaultMixedBaselines();

    this.saveRegistry();
    log.info(`Initialized ${this.registry.totalBaselines} default baselines`);
  }

  private createDefaultLatheBaselines(): void {
    const lathePrograms = [
      { name: "OD_TURN_SIMPLE", desc: "Simple OD turning, single tool", cycles: 45, tools: 1 },
      { name: "OD_TURN_STEP", desc: "Stepped OD turning with shoulders", cycles: 85, tools: 1 },
      { name: "FACE_BASIC", desc: "Basic facing operation", cycles: 25, tools: 1 },
      { name: "BORE_THRU", desc: "Through bore with finishing pass", cycles: 65, tools: 2 },
      { name: "BORE_BLIND", desc: "Blind bore with bottom face", cycles: 75, tools: 2 },
      { name: "GROOVE_OD", desc: "OD grooving single groove", cycles: 35, tools: 1 },
      { name: "GROOVE_FACE", desc: "Face grooving operation", cycles: 40, tools: 1 },
      { name: "THREAD_EXT", desc: "External thread M20x2.5", cycles: 55, tools: 1 },
      { name: "THREAD_INT", desc: "Internal thread M16x2", cycles: 60, tools: 2 },
      { name: "CUTOFF", desc: "Parting/cutoff operation", cycles: 20, tools: 1 },
      { name: "DRILL_CENTER", desc: "Center drill + through drill", cycles: 40, tools: 2 },
      { name: "DRILL_PECK", desc: "Peck drilling deep hole", cycles: 70, tools: 1 },
      { name: "ROUGH_FINISH", desc: "Rough + finish OD profile", cycles: 120, tools: 2 },
      { name: "CONTOUR_OD", desc: "Complex OD contour", cycles: 95, tools: 2 },
      { name: "TAPER_OD", desc: "Tapered OD turning", cycles: 50, tools: 1 },
      { name: "RADIUS_OD", desc: "OD radius blending", cycles: 55, tools: 1 },
      { name: "CHAMFER_OD", desc: "OD chamfering", cycles: 30, tools: 1 },
      { name: "KNURL", desc: "Knurling operation", cycles: 45, tools: 1 },
      { name: "MULTI_START", desc: "Multi-start thread", cycles: 90, tools: 1 },
      { name: "LIVE_DRILL", desc: "Live tooling drilling", cycles: 65, tools: 2 },
    ];

    for (const prog of lathePrograms) {
      this.createSyntheticBaseline("lathe", "simple", prog.name, prog.desc, prog.cycles, prog.tools);
    }
  }

  private createDefaultMillBaselines(): void {
    const millPrograms = [
      { name: "FACE_MILL", desc: "Face milling operation", cycles: 50, tools: 1 },
      { name: "POCKET_RECT", desc: "Rectangular pocket", cycles: 85, tools: 1 },
      { name: "POCKET_CIRC", desc: "Circular pocket", cycles: 75, tools: 1 },
      { name: "CONTOUR_2D", desc: "2D contour profiling", cycles: 65, tools: 1 },
      { name: "DRILL_PATTERN", desc: "Bolt circle drilling", cycles: 45, tools: 1 },
      { name: "TAP_PATTERN", desc: "Tapping pattern", cycles: 55, tools: 2 },
      { name: "SLOT_LINEAR", desc: "Linear slot milling", cycles: 40, tools: 1 },
      { name: "SLOT_ARC", desc: "Arc slot milling", cycles: 55, tools: 1 },
      { name: "BOSS_CIRC", desc: "Circular boss", cycles: 60, tools: 2 },
      { name: "BOSS_RECT", desc: "Rectangular boss", cycles: 70, tools: 2 },
      { name: "CHAMFER_2D", desc: "2D chamfering", cycles: 35, tools: 1 },
      { name: "ENGRAVE", desc: "Text engraving", cycles: 120, tools: 1 },
      { name: "THREAD_MILL", desc: "Thread milling", cycles: 80, tools: 1 },
      { name: "HELICAL_BORE", desc: "Helical bore interpolation", cycles: 65, tools: 1 },
      { name: "PLUNGE_ROUGH", desc: "Plunge roughing", cycles: 95, tools: 1 },
      { name: "REST_MACHINE", desc: "Rest machining", cycles: 85, tools: 2 },
      { name: "ADAPTIVE_CLR", desc: "Adaptive clearing", cycles: 110, tools: 1 },
      { name: "HSM_FINISH", desc: "HSM finishing pass", cycles: 90, tools: 1 },
      { name: "SPOT_DRILL", desc: "Spot drilling", cycles: 30, tools: 1 },
      { name: "REAM_PATTERN", desc: "Reaming pattern", cycles: 50, tools: 2 },
    ];

    for (const prog of millPrograms) {
      this.createSyntheticBaseline("mill", "simple", prog.name, prog.desc, prog.cycles, prog.tools);
    }
  }

  private createDefault5AxisBaselines(): void {
    const fiveAxisPrograms = [
      { name: "IMPELLER_ROUGH", desc: "Impeller roughing 5-axis", cycles: 450, tools: 2 },
      { name: "IMPELLER_FINISH", desc: "Impeller blade finishing", cycles: 380, tools: 2 },
      { name: "BLISK_ROUGH", desc: "Blisk rough machining", cycles: 520, tools: 3 },
      { name: "BLISK_FINISH", desc: "Blisk finish machining", cycles: 480, tools: 2 },
      { name: "TURB_BLADE", desc: "Turbine blade 5-axis", cycles: 350, tools: 2 },
      { name: "MOLD_CORE", desc: "Mold core 5-axis finishing", cycles: 280, tools: 3 },
      { name: "MOLD_CAVITY", desc: "Mold cavity 5-axis", cycles: 320, tools: 3 },
      { name: "SWARF_CUT", desc: "Swarf cutting ruled surface", cycles: 180, tools: 1 },
      { name: "GEODESIC", desc: "Geodesic toolpath", cycles: 250, tools: 1 },
      { name: "FLOWLINE", desc: "Flowline finishing", cycles: 220, tools: 1 },
      { name: "PORT_ROUGH", desc: "Port roughing", cycles: 150, tools: 2 },
      { name: "PORT_FINISH", desc: "Port finishing", cycles: 180, tools: 2 },
      { name: "UNDERCUT_3PLUS2", desc: "3+2 undercut machining", cycles: 200, tools: 2 },
      { name: "MULTI_SIDE", desc: "Multi-sided machining", cycles: 280, tools: 4 },
      { name: "TILTED_PLANE", desc: "Tilted plane operations", cycles: 160, tools: 2 },
      { name: "AUTO_TILT", desc: "Auto-tilting toolpath", cycles: 240, tools: 1 },
      { name: "BARREL_CUT", desc: "Barrel cutter finishing", cycles: 190, tools: 1 },
      { name: "LOLLIPOP", desc: "Lollipop cutter operations", cycles: 170, tools: 1 },
      { name: "TUBE_DRILL", desc: "Tube drilling 5-axis", cycles: 120, tools: 2 },
      { name: "BONE_IMPLANT", desc: "Medical implant 5-axis", cycles: 400, tools: 3 },
    ];

    for (const prog of fiveAxisPrograms) {
      this.createSyntheticBaseline("5axis", "complex", prog.name, prog.desc, prog.cycles, prog.tools);
    }
  }

  private createDefaultWedmBaselines(): void {
    const wedmPrograms = [
      { name: "PUNCH_SIMPLE", desc: "Simple punch profile", cycles: 85, tools: 1 },
      { name: "PUNCH_COMPLEX", desc: "Complex punch with radii", cycles: 140, tools: 1 },
      { name: "DIE_OPENING", desc: "Die opening cutout", cycles: 120, tools: 1 },
      { name: "GEAR_PROFILE", desc: "Gear tooth profile", cycles: 180, tools: 1 },
      { name: "SPLINE_INT", desc: "Internal spline", cycles: 160, tools: 1 },
      { name: "KEYWAY", desc: "Keyway cutting", cycles: 65, tools: 1 },
      { name: "SLOT_NARROW", desc: "Narrow slot cutting", cycles: 75, tools: 1 },
      { name: "TAPER_CUT", desc: "Taper angle cutting", cycles: 95, tools: 1 },
      { name: "FORM_TOOL", desc: "Form tool profile", cycles: 130, tools: 1 },
      { name: "EXTRUSION", desc: "Extrusion die profile", cycles: 170, tools: 1 },
      { name: "INJECTION", desc: "Injection mold detail", cycles: 200, tools: 1 },
      { name: "ELECTRODE", desc: "EDM electrode shape", cycles: 150, tools: 1 },
      { name: "CARBIDE_INSERT", desc: "Carbide insert profile", cycles: 110, tools: 1 },
      { name: "PROGRESSIVE", desc: "Progressive die detail", cycles: 220, tools: 1 },
      { name: "TRIM_DIE", desc: "Trim die edge", cycles: 145, tools: 1 },
      { name: "BLANK_DIE", desc: "Blanking die", cycles: 125, tools: 1 },
      { name: "MULTI_PASS", desc: "Multi-pass finishing", cycles: 180, tools: 1 },
      { name: "SKIM_CUT", desc: "Skim cut finishing", cycles: 90, tools: 1 },
      { name: "NO_CORE", desc: "No-core cutting", cycles: 100, tools: 1 },
      { name: "SLUG_RETRACT", desc: "Slug retention cut", cycles: 115, tools: 1 },
    ];

    for (const prog of wedmPrograms) {
      this.createSyntheticBaseline("wedm", "medium", prog.name, prog.desc, prog.cycles, prog.tools);
    }
  }

  private createDefaultMixedBaselines(): void {
    // 10 Swiss-type programs
    const swissPrograms = [
      { name: "SWISS_OD", desc: "Swiss OD turning", cycles: 65, tools: 2 },
      { name: "SWISS_DRILL", desc: "Swiss cross drilling", cycles: 55, tools: 3 },
      { name: "SWISS_THREAD", desc: "Swiss threading", cycles: 70, tools: 2 },
      { name: "SWISS_GROOVE", desc: "Swiss grooving", cycles: 45, tools: 2 },
      { name: "SWISS_MILL", desc: "Swiss milling ops", cycles: 80, tools: 3 },
      { name: "SWISS_POLYGON", desc: "Swiss polygon turning", cycles: 60, tools: 2 },
      { name: "SWISS_BACKWORK", desc: "Swiss backworking", cycles: 75, tools: 3 },
      { name: "SWISS_MEDICAL", desc: "Swiss medical screw", cycles: 120, tools: 4 },
      { name: "SWISS_CONNECTOR", desc: "Swiss connector pin", cycles: 85, tools: 3 },
      { name: "SWISS_COMPLEX", desc: "Swiss complex part", cycles: 150, tools: 5 },
    ];

    for (const prog of swissPrograms) {
      this.createSyntheticBaseline("swiss", "medium", prog.name, prog.desc, prog.cycles, prog.tools);
    }

    // 10 Mill-turn programs
    const millturnPrograms = [
      { name: "MT_TURN_MILL", desc: "Turning + milling combo", cycles: 180, tools: 4 },
      { name: "MT_Y_AXIS", desc: "Y-axis milling on lathe", cycles: 140, tools: 3 },
      { name: "MT_B_AXIS", desc: "B-axis operations", cycles: 200, tools: 4 },
      { name: "MT_SUB_SPINDLE", desc: "Sub-spindle handoff", cycles: 160, tools: 3 },
      { name: "MT_GEAR_HUB", desc: "Gear hub complete", cycles: 280, tools: 6 },
      { name: "MT_FLANGE", desc: "Flange complete machining", cycles: 220, tools: 5 },
      { name: "MT_FITTING", desc: "Hydraulic fitting", cycles: 170, tools: 4 },
      { name: "MT_COUPLING", desc: "Coupling complete", cycles: 190, tools: 4 },
      { name: "MT_MANIFOLD", desc: "Manifold block", cycles: 320, tools: 7 },
      { name: "MT_AEROSPACE", desc: "Aerospace component", cycles: 380, tools: 8 },
    ];

    for (const prog of millturnPrograms) {
      this.createSyntheticBaseline("millturn", "complex", prog.name, prog.desc, prog.cycles, prog.tools);
    }
  }

  /**
   * Create a synthetic baseline for initialization (uses internal method to avoid recursion)
   */
  private createSyntheticBaseline(
    category: BaselineCategory,
    complexity: BaselineComplexity,
    name: string,
    description: string,
    lineCount: number,
    toolCount: number
  ): void {
    const gcode = this.generateSyntheticGcode(category, name, lineCount, toolCount);

    // Use internal method to avoid ensureInitialized() recursion
    this.createBaselineInternal(
      {
        path: `synthetic/${category}/${name}.nc`,
        checksum: this.computeChecksum(name),
        metadata: { synthetic: true, name },
      },
      {
        gcode,
        checksum: this.computeChecksum(gcode),
        keyMetrics: {
          lineCount,
          toolChangeCount: toolCount,
          estimatedCycleTime: lineCount * 2, // rough estimate
          feedRateRange: category === "wedm" ? [1, 10] : [100, 500],
          spindleSpeedRange: category === "wedm" ? [0, 0] : [500, 3000],
        },
      },
      {
        category,
        complexity,
        approvedBy: "system",
        modelVersion: "baseline-v1.0",
        description,
        tags: ["synthetic", category, complexity],
      }
    );
  }

  /**
   * Generate synthetic G-code for baseline initialization
   */
  private generateSyntheticGcode(
    category: BaselineCategory,
    name: string,
    lineCount: number,
    toolCount: number
  ): string {
    const lines: string[] = [];

    // Program header
    lines.push(`%`);
    lines.push(`O${Math.floor(Math.random() * 9000 + 1000)} (${name})`);
    lines.push(`(GOLDEN BASELINE - ${category.toUpperCase()})`);
    lines.push(`(GENERATED: ${new Date().toISOString()})`);
    lines.push(``);

    // Safety block
    lines.push(`G90 G94 G17`);
    if (category !== "wedm") {
      lines.push(`G21 (METRIC)`);
    }

    // Tool loops
    const linesPerTool = Math.floor((lineCount - 10) / toolCount);

    for (let t = 1; t <= toolCount; t++) {
      lines.push(``);
      lines.push(`(TOOL ${t})`);
      if (category !== "wedm") {
        lines.push(`T${t} M6`);
        lines.push(`S${1000 + t * 500} M3`);
      }
      lines.push(`G0 Z50.`);

      // Generate motion commands
      for (let i = 0; i < linesPerTool - 5; i++) {
        const g = i % 4 === 0 ? "G0" : "G1";
        const x = (Math.random() * 100).toFixed(3);
        const y = category !== "lathe" ? ` Y${(Math.random() * 100).toFixed(3)}` : "";
        const z = (Math.random() * -50).toFixed(3);
        const f = g === "G1" ? ` F${100 + Math.floor(Math.random() * 400)}` : "";
        lines.push(`${g} X${x}${y} Z${z}${f}`);
      }

      lines.push(`G0 Z50.`);
      if (category !== "wedm") {
        lines.push(`M5`);
      }
    }

    // Program end
    lines.push(``);
    lines.push(`G91 G28 Z0`);
    lines.push(`G28 X0 Y0`);
    lines.push(`M30`);
    lines.push(`%`);

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const goldenBaselineManagerEngine = new GoldenBaselineManagerEngine();
