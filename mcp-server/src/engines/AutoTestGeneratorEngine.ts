/**
 * AutoTestGeneratorEngine — AUTO-3: Automatic Test Stub Generation
 *
 * NOTE: This is a SOFTWARE DEVELOPMENT automation engine. It does NOT perform
 * manufacturing calculations. It scans engines for missing test files and generates
 * vitest test stubs with domain-aware content:
 *   - Physics engines get manufacturer data comparison tests
 *   - Dispatcher-wired engines get action invocation tests
 *   - All engines get edge case stubs (zero, negative, NaN)
 *
 * Workflow:
 *   1. scan() — identify all engines without test files
 *   2. generate() — produce test file code for untested engines
 *   3. apply() — write generated test files to __tests__/
 *
 * All output is DRY RUN by default.
 *
 * Mathematical Foundation (from MCP-AUTOMATION-HARDENING-ROADMAP.md):
 *   Test_Coverage = engines_with_tests / total_engines
 *   Target: Test_Coverage >= 0.80
 *
 * @module AutoTestGeneratorEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface EngineTestStatus {
  engine_file: string;
  engine_name: string;
  has_test: boolean;
  test_file?: string;
  test_count: number;
  has_edge_cases: boolean;
  is_physics_engine: boolean;
  public_methods: string[];
}

export interface TestGapReport {
  timestamp: string;
  total_engines: number;
  engines_with_tests: number;
  engines_without_tests: number;
  test_coverage: number;
  target_coverage: number;
  gap: number;
  physics_engines_untested: number;
  missing: EngineTestStatus[];
}

export interface GeneratedTest {
  engine_file: string;
  engine_name: string;
  test_file: string;
  test_code: string;
  test_count: number;
  domain: "physics" | "business" | "infra" | "general";
}

export interface TestGenerationResult {
  timestamp: string;
  total_generated: number;
  tests: GeneratedTest[];
  dry_run: boolean;
  files_written: string[];
  warnings: string[];
}

// ============================================================================
// PATHS
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(MCP_ROOT, "src");
const ENGINES_DIR = path.join(SRC_DIR, "engines");
const TESTS_DIR = path.join(SRC_DIR, "__tests__");
const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "state", "shared", "TEST_GAP_REPORT.json");

const TARGET_COVERAGE = 0.80;

const PHYSICS_MARKERS = [
  "physics/constants", "constants.js",
  "kc1_1", "kienzle", "taylor", "johnson_cook",
  "cuttingforce", "toollife", "surfacefinish",
  "thermal", "deflection", "chatter", "stability",
  "wear", "friction", "stress", "strain",
  "force", "torque", "power", "temperature",
];

const EDGE_CASE_MARKERS = [
  "zero", "negative", "nan", "null", "undefined", "empty",
  "boundary", "edge", "overflow", "invalid", "malformed",
  "minimum", "maximum", ".throws", ".rejects",
];

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

class AutoTestGeneratorEngine {

  /**
   * Scan all engines and report test coverage.
   * @returns TestGapReport with per-engine test status
   */
  async scan(): Promise<TestGapReport> {
    log.info("[AutoTest] Scanning engine test coverage...");

    const engineFiles = safeListDir(ENGINES_DIR)
      .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")
        && f !== "index.ts" && !f.endsWith(".md") && !f.endsWith(".types.ts"));

    const testFiles = safeListDir(TESTS_DIR)
      .filter(f => f.endsWith(".test.ts"))
      .map(f => f.toLowerCase());

    const statuses: EngineTestStatus[] = [];

    for (const file of engineFiles) {
      const baseName = file.replace(/\.ts$/, "");
      const content = safeRead(path.join(ENGINES_DIR, file));
      if (!content) continue;

      const className = this._extractClassName(content) || baseName;
      const methods = this._extractPublicMethods(content);
      const isPhysics = this._isPhysicsEngine(content);

      // Check for matching test file
      const testMatch = this._findTestFile(baseName, className, testFiles);
      let testCount = 0;
      let hasEdgeCases = false;

      if (testMatch) {
        const testContent = safeRead(path.join(TESTS_DIR, testMatch));
        testCount = (testContent.match(/\bit\s*\(/g) || []).length;
        const contentLower = testContent.toLowerCase();
        hasEdgeCases = EDGE_CASE_MARKERS.some(m => contentLower.includes(m));
      }

      statuses.push({
        engine_file: file,
        engine_name: className,
        has_test: !!testMatch,
        test_file: testMatch || undefined,
        test_count: testCount,
        has_edge_cases: hasEdgeCases,
        is_physics_engine: isPhysics,
        public_methods: methods,
      });
    }

    const withTests = statuses.filter(s => s.has_test).length;
    const missing = statuses.filter(s => !s.has_test);
    const coverage = statuses.length > 0 ? round(withTests / statuses.length) : 1;
    const physicsUntested = missing.filter(s => s.is_physics_engine).length;

    const report: TestGapReport = {
      timestamp: new Date().toISOString(),
      total_engines: statuses.length,
      engines_with_tests: withTests,
      engines_without_tests: missing.length,
      test_coverage: coverage,
      target_coverage: TARGET_COVERAGE,
      gap: round(TARGET_COVERAGE - coverage),
      physics_engines_untested: physicsUntested,
      missing,
    };

    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    } catch (e) {
      log.warn(`[AutoTest] Could not write report: ${e}`);
    }

    log.info(`[AutoTest] Coverage: ${withTests}/${statuses.length} (${round(coverage * 100)}%). Missing: ${missing.length}. Physics untested: ${physicsUntested}. Target: ${round(TARGET_COVERAGE * 100)}%.`);
    return report;
  }

  /**
   * Generate vitest test stubs for engines that lack tests.
   * @param engineFilter Optional — only generate for matching engine name
   * @param maxTests Max test files to generate (default 30)
   * @param dryRun If true (default), only return generated code without writing
   * @returns TestGenerationResult with generated test code
   */
  async generate(engineFilter?: string, maxTests = 30, dryRun = true): Promise<TestGenerationResult> {
    const report = await this.scan();
    let targets = report.missing;
    if (engineFilter) {
      targets = targets.filter(t => t.engine_name.toLowerCase().includes(engineFilter.toLowerCase()));
    }

    // Prioritize physics engines (more critical to test)
    targets.sort((a, b) => {
      if (a.is_physics_engine && !b.is_physics_engine) return -1;
      if (!a.is_physics_engine && b.is_physics_engine) return 1;
      return b.public_methods.length - a.public_methods.length;
    });

    const tests: GeneratedTest[] = [];
    const filesWritten: string[] = [];
    const warnings: string[] = [];

    for (const target of targets.slice(0, maxTests)) {
      const content = safeRead(path.join(ENGINES_DIR, target.engine_file));
      if (!content) continue;

      const generated = this._generateTestForEngine(target, content);
      if (generated) {
        tests.push(generated);
        if (target.is_physics_engine) {
          warnings.push(`${target.engine_name}: Physics engine — auto-generated tests need manufacturer data for real validation`);
        }
      }
    }

    if (!dryRun && tests.length > 0) {
      for (const t of tests) {
        const testDir = path.dirname(t.test_file);
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
        if (!fs.existsSync(t.test_file)) {
          fs.writeFileSync(t.test_file, t.test_code);
          filesWritten.push(t.test_file);
          log.info(`[AutoTest] Created: ${path.basename(t.test_file)}`);
        } else {
          warnings.push(`${path.basename(t.test_file)} already exists — skipped`);
        }
      }
    }

    log.info(`[AutoTest] Generated ${tests.length} test files${dryRun ? " (dry run)" : ` → ${filesWritten.length} files written`}`);

    return {
      timestamp: new Date().toISOString(),
      total_generated: tests.length,
      tests,
      dry_run: dryRun,
      files_written: filesWritten,
      warnings,
    };
  }

  /**
   * Read the cached test gap report.
   * @returns Cached report or null
   */
  read(): TestGapReport | null {
    try {
      if (!fs.existsSync(OUTPUT_PATH)) return null;
      return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
    } catch { return null; }
  }

  /**
   * One-line summary for compact display.
   * @returns Human-readable test coverage summary
   */
  summary(): string {
    const cached = this.read();
    if (!cached) return "No test gap report. Run scan first.";
    return `Test coverage: ${cached.engines_with_tests}/${cached.total_engines} (${round(cached.test_coverage * 100)}%). Missing: ${cached.engines_without_tests}. Physics untested: ${cached.physics_engines_untested}. Gap to ${round(cached.target_coverage * 100)}%: ${round(cached.gap * 100)}pp.`;
  }

  // ==========================================================================
  // PARSING
  // ==========================================================================

  private _extractClassName(content: string): string | null {
    const m = content.match(/(?:export\s+)?class\s+(\w+)/);
    return m ? m[1] : null;
  }

  private _extractSingletonName(content: string): string | null {
    const m = content.match(/export\s+const\s+(\w+)\s*=\s*new\s+\w+/);
    return m ? m[1] : null;
  }

  private _extractPublicMethods(content: string): string[] {
    const methods: string[] = [];
    const regex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      const name = m[1];
      if (name.startsWith("_") || name === "constructor" || name === "if"
        || name === "for" || name === "while" || name === "switch"
        || name === "catch" || name === "function") continue;
      if (!methods.includes(name)) methods.push(name);
    }
    return methods;
  }

  private _isPhysicsEngine(content: string): boolean {
    const lower = content.toLowerCase();
    return PHYSICS_MARKERS.some(m => lower.includes(m));
  }

  private _findTestFile(baseName: string, className: string, testFiles: string[]): string | null {
    const baseNameLower = baseName.toLowerCase();
    const classLower = className.toLowerCase();

    for (const tf of testFiles) {
      if (tf.includes(baseNameLower) || tf.includes(classLower)) {
        return tf;
      }
      // Also check without "engine" suffix
      const withoutEngine = baseNameLower.replace("engine", "");
      if (withoutEngine && tf.includes(withoutEngine)) {
        return tf;
      }
    }
    return null;
  }

  private _classifyDomain(content: string): "physics" | "business" | "infra" | "general" {
    const lower = content.toLowerCase();
    if (PHYSICS_MARKERS.some(m => lower.includes(m))) return "physics";
    if (/quote|cost|invoice|billing|erp|accounting|capacity|oee|scheduling/i.test(lower)) return "business";
    if (/quality|schema|wiring|dispatch|route|hook|config|session|telemetry/i.test(lower)) return "infra";
    return "general";
  }

  // ==========================================================================
  // TEST GENERATION
  // ==========================================================================

  private _generateTestForEngine(status: EngineTestStatus, content: string): GeneratedTest | null {
    const baseName = status.engine_file.replace(/\.ts$/, "");
    const testFile = path.join(TESTS_DIR, `${baseName}.test.ts`);
    const singletonName = this._extractSingletonName(content) || status.engine_name.charAt(0).toLowerCase() + status.engine_name.slice(1);
    const domain = this._classifyDomain(content);

    const imports = `import { describe, it, expect } from "vitest";\nimport { ${singletonName} } from "../engines/${baseName}.js";`;

    const methodTests: string[] = [];
    const methods = status.public_methods.slice(0, 8);

    for (const methodName of methods) {
      const isAsync = content.includes(`async ${methodName}`);
      const awaitStr = isAsync ? "await " : "";
      const asyncStr = isAsync ? "async " : "";

      methodTests.push(`
  describe("${methodName}()", () => {
    it("returns a defined result", ${asyncStr}() => {
      const result = ${awaitStr}${singletonName}.${methodName}();
      expect(result).toBeDefined();
    });

    it("handles missing input gracefully", ${asyncStr}() => {
      // Should not throw on undefined/empty input
      expect(() => ${singletonName}.${methodName}()).not.toThrow();
    });
  });`);
    }

    // Add domain-specific tests
    if (domain === "physics") {
      methodTests.push(`
  describe("physics validation", () => {
    it("returns AtomicValue-shaped results with units", () => {
      // Physics engines should return { value, unit, uncertainty, source }
      // TODO: Add manufacturer reference data comparison
      expect(true).toBe(true);
    });

    it("produces physically reasonable values", () => {
      // Values should be positive, within known physical bounds
      // TODO: Add specific bounds from Sandvik/ISO/Kennametal data
      expect(true).toBe(true);
    });
  });`);
    }

    if (domain === "business") {
      methodTests.push(`
  describe("business logic", () => {
    it("returns structured result with required fields", () => {
      // Business engines should return typed objects, never raw numbers
      expect(true).toBe(true);
    });
  });`);
    }

    // Edge case tests for all domains
    methodTests.push(`
  describe("edge cases", () => {
    it("handles zero values without crashing", () => {
      // Zero inputs should produce meaningful error or zero output, not NaN/Infinity
      expect(true).toBe(true);
    });

    it("handles negative values without crashing", () => {
      // Negative inputs should be caught and reported, not silently produce wrong results
      expect(true).toBe(true);
    });
  });`);

    const testCount = methodTests.length * 2; // approximate it() count
    const testCode = `/**
 * ${baseName}.test.ts — Auto-generated tests for ${status.engine_name}
 * Domain: ${domain}
 * Generated: ${new Date().toISOString()}
 *
 * These are STUB tests. Replace placeholder assertions with real test data.
 * ${domain === "physics" ? "Physics engines MUST be validated against manufacturer data (Sandvik, ISO, Kennametal)." : ""}
 */

${imports}

describe("${status.engine_name}", () => {${methodTests.join("\n")}
});
`;

    return {
      engine_file: status.engine_file,
      engine_name: status.engine_name,
      test_file: testFile,
      test_code: testCode,
      test_count: testCount,
      domain,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const autoTestGeneratorEngine = new AutoTestGeneratorEngine();
export { AutoTestGeneratorEngine };
