/**
 * TestCoverageIndexEngine — Test Coverage Mapping & Analysis
 *
 * Phase 0.2 from AGI proximity plan. Indexes which engines have tests,
 * tracks coverage gaps, and enables targeted test generation.
 *
 * Scans __tests__/ directory and maps test files to source engines.
 * Provides coverageFor() and uncoveredEngines() methods.
 *
 * @module engines/TestCoverageIndexEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

export interface TestCoverageEntry {
  engineName: string;
  enginePath: string;
  testPath: string | null;
  hasCoverage: boolean;
  testCount?: number;
  lastTestRun?: string;
}

export interface CoverageStats {
  totalEngines: number;
  coveredEngines: number;
  uncoveredEngines: number;
  coveragePercent: number;
  gapList: string[];
}

export interface TestMapping {
  testFile: string;
  coveredEngines: string[];
  testDescriptions: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENGINE_SUFFIX_PATTERN = /Engine\.ts$/;
const TEST_SUFFIX_PATTERN = /\.test\.ts$/;

// Engines that don't need tests (configs, types, etc.)
const EXCLUDED_ENGINES = new Set([
  "index.ts",
  "types.ts",
  "constants.ts",
  "BaseEngine.ts",
]);

// ============================================================================
// CACHE STATE
// ============================================================================

let COVERAGE_CACHE: Map<string, TestCoverageEntry> | null = null;
let TEST_MAPPINGS_CACHE: Map<string, TestMapping> | null = null;
let CACHE_LOADED_AT = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

// ============================================================================
// ENGINE
// ============================================================================

export class TestCoverageIndexEngine {
  private baseDir: string;
  private enginesDir: string;
  private testsDir: string;
  private statePath: string;

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    this.enginesDir = path.join(this.baseDir, "src", "engines");
    this.testsDir = path.join(this.baseDir, "src", "__tests__");
    this.statePath = path.join(this.baseDir, "data", "state", "TEST_COVERAGE_INDEX.json");
    log.info("[TestCoverageIndex] Initialized — test coverage mapping");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Check if an engine has test coverage
   */
  async hasCoverage(engineName: string): Promise<boolean> {
    const coverage = await this.loadCoverage();
    const normalized = this.normalizeEngineName(engineName);
    const entry = coverage.get(normalized);
    return entry?.hasCoverage || false;
  }

  /**
   * Get coverage details for a specific engine
   */
  async coverageFor(engineName: string): Promise<TestCoverageEntry | null> {
    const coverage = await this.loadCoverage();
    const normalized = this.normalizeEngineName(engineName);
    return coverage.get(normalized) || null;
  }

  /**
   * Get all engines without test coverage
   */
  async uncoveredEngines(): Promise<string[]> {
    const coverage = await this.loadCoverage();
    const uncovered: string[] = [];

    for (const [name, entry] of coverage) {
      if (!entry.hasCoverage) {
        uncovered.push(name);
      }
    }

    return uncovered.sort();
  }

  /**
   * Get coverage statistics
   */
  async getStats(): Promise<CoverageStats> {
    const coverage = await this.loadCoverage();
    const uncovered = await this.uncoveredEngines();

    const totalEngines = coverage.size;
    const uncoveredCount = uncovered.length;
    const coveredCount = totalEngines - uncoveredCount;
    const coveragePercent = totalEngines > 0 ? (coveredCount / totalEngines) * 100 : 0;

    return {
      totalEngines,
      coveredEngines: coveredCount,
      uncoveredEngines: uncoveredCount,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      gapList: uncovered.slice(0, 20), // Top 20 gaps
    };
  }

  /**
   * Find test file for an engine
   */
  async findTestFor(engineName: string): Promise<string | null> {
    const coverage = await this.loadCoverage();
    const normalized = this.normalizeEngineName(engineName);
    const entry = coverage.get(normalized);
    return entry?.testPath || null;
  }

  /**
   * Get all engines covered by a test file
   */
  async enginesCoveredBy(testFile: string): Promise<string[]> {
    const mappings = await this.loadTestMappings();
    const normalized = path.basename(testFile);
    const mapping = mappings.get(normalized);
    return mapping?.coveredEngines || [];
  }

  /**
   * Suggest test file name for an engine
   */
  suggestTestPath(engineName: string): string {
    const baseName = this.normalizeEngineName(engineName);
    return `src/__tests__/${baseName}.test.ts`;
  }

  /**
   * Get coverage summary for session injection
   */
  async getCompactSummary(): Promise<string> {
    const stats = await this.getStats();
    const lines: string[] = [];

    lines.push("# Test Coverage Summary");
    lines.push(`Coverage: ${stats.coveragePercent}% (${stats.coveredEngines}/${stats.totalEngines})`);

    if (stats.gapList.length > 0) {
      lines.push(`Top gaps: ${stats.gapList.slice(0, 5).join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * Rebuild coverage index from file system
   */
  async rebuildIndex(): Promise<void> {
    log.info("[TestCoverageIndex] Rebuilding index...");

    const coverage = new Map<string, TestCoverageEntry>();
    const mappings = new Map<string, TestMapping>();

    // Scan engines directory
    const engines = await this.scanEngines();

    // Scan tests directory
    const tests = await this.scanTests();

    // Build test → engine mappings
    for (const testFile of tests) {
      const mapping = await this.parseTestFile(testFile);
      mappings.set(path.basename(testFile), mapping);
    }

    // Match engines to tests
    for (const engine of engines) {
      const engineName = this.normalizeEngineName(engine);
      const testPath = this.findMatchingTest(engineName, tests, mappings);

      coverage.set(engineName, {
        engineName,
        enginePath: `src/engines/${engine}`,
        testPath,
        hasCoverage: testPath !== null,
      });
    }

    // Persist and cache
    await this.persistIndex(coverage, mappings);
    COVERAGE_CACHE = coverage;
    TEST_MAPPINGS_CACHE = mappings;
    CACHE_LOADED_AT = Date.now();

    log.info(`[TestCoverageIndex] Indexed ${coverage.size} engines, ${mappings.size} test files`);
  }

  /**
   * Record a test run for an engine
   */
  async recordTestRun(engineName: string): Promise<void> {
    const coverage = await this.loadCoverage();
    const normalized = this.normalizeEngineName(engineName);
    const entry = coverage.get(normalized);

    if (entry) {
      entry.lastTestRun = new Date().toISOString();
      await this.persistIndex(coverage, TEST_MAPPINGS_CACHE || new Map());
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async loadCoverage(): Promise<Map<string, TestCoverageEntry>> {
    if (COVERAGE_CACHE && Date.now() - CACHE_LOADED_AT < CACHE_TTL_MS) {
      return COVERAGE_CACHE;
    }

    log.info("[TestCoverageIndex] Loading coverage index...");

    try {
      if (fs.existsSync(this.statePath)) {
        const content = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
        COVERAGE_CACHE = new Map(Object.entries(content.coverage || {}));
        TEST_MAPPINGS_CACHE = new Map(Object.entries(content.mappings || {}));
        CACHE_LOADED_AT = Date.now();
        return COVERAGE_CACHE;
      }
    } catch (err) {
      log.warn(`[TestCoverageIndex] Could not load index: ${err}`);
    }

    // Build initial index
    await this.rebuildIndex();
    return COVERAGE_CACHE!;
  }

  private async loadTestMappings(): Promise<Map<string, TestMapping>> {
    await this.loadCoverage(); // Ensures both caches are loaded
    return TEST_MAPPINGS_CACHE || new Map();
  }

  private async scanEngines(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.enginesDir);
      return files.filter((f) => {
        if (!f.endsWith(".ts")) return false;
        if (f.endsWith(".test.ts")) return false;
        if (EXCLUDED_ENGINES.has(f)) return false;
        return true;
      });
    } catch {
      return [];
    }
  }

  private async scanTests(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.testsDir);
      return files.filter((f) => f.endsWith(".test.ts"));
    } catch {
      return [];
    }
  }

  private async parseTestFile(testFile: string): Promise<TestMapping> {
    const fullPath = path.join(this.testsDir, testFile);
    const coveredEngines: string[] = [];
    const testDescriptions: string[] = [];

    try {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Extract imported engines
      const importPattern = /import\s+.*?\s+from\s+["']\.\.\/engines\/([^"']+)["']/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const engineFile = match[1].replace(/\.js$/, "");
        coveredEngines.push(this.normalizeEngineName(engineFile));
      }

      // Extract test descriptions
      const describePattern = /describe\s*\(\s*["']([^"']+)["']/g;
      while ((match = describePattern.exec(content)) !== null) {
        testDescriptions.push(match[1]);
      }

      const itPattern = /it\s*\(\s*["']([^"']+)["']/g;
      while ((match = itPattern.exec(content)) !== null) {
        testDescriptions.push(match[1]);
      }
    } catch {
      // Skip files that can't be read
    }

    return {
      testFile,
      coveredEngines,
      testDescriptions,
    };
  }

  private findMatchingTest(
    engineName: string,
    testFiles: string[],
    mappings: Map<string, TestMapping>
  ): string | null {
    // Check direct name match
    const directMatch = `${engineName}.test.ts`;
    if (testFiles.includes(directMatch)) {
      return `src/__tests__/${directMatch}`;
    }

    // Check engine name variations
    const variations = [
      `${engineName}-engine.test.ts`,
      `${engineName.replace(/engine$/i, "")}.test.ts`,
      `${engineName.toLowerCase()}.test.ts`,
    ];

    for (const variant of variations) {
      if (testFiles.includes(variant)) {
        return `src/__tests__/${variant}`;
      }
    }

    // Check if any test file imports this engine
    for (const [testFile, mapping] of mappings) {
      if (mapping.coveredEngines.includes(engineName)) {
        return `src/__tests__/${testFile}`;
      }
    }

    return null;
  }

  private async persistIndex(
    coverage: Map<string, TestCoverageEntry>,
    mappings: Map<string, TestMapping>
  ): Promise<void> {
    const content = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      coverage: Object.fromEntries(coverage),
      mappings: Object.fromEntries(mappings),
    };

    const dir = path.dirname(this.statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.statePath, JSON.stringify(content));
  }

  private normalizeEngineName(name: string): string {
    return name
      .replace(/\.ts$/, "")
      .replace(/\.js$/, "")
      .replace(/Engine$/i, "")
      .toLowerCase();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const testCoverageIndexEngine = new TestCoverageIndexEngine();
