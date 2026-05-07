/**
 * TestQualityAuditEngine — Classifies every .test.ts file as REAL / SHALLOW / SYNTHETIC
 *
 * This is a SOFTWARE QUALITY engine — it does NOT perform manufacturing calculations.
 * It reads test files and grades them on a 10-point rubric to identify synthetic tests
 * that must be regenerated with real assertions.
 *
 * Complements:
 *   - TestCoverageIndexEngine (tracks which engines have tests)
 *   - AutoTestGeneratorEngine (generates stubs for untested engines)
 *
 * This engine fills the gap: grading the QUALITY of existing tests.
 *
 * Rubric (0-10 points per file):
 *   Assertion depth      (0-3): bare toBeDefined → numeric toBeCloseTo → reference comparison
 *   Concrete inputs      (0-2): generic 1s/0s → realistic physics values
 *   Method coverage      (0-2): 0 methods called → 3+ methods including core
 *   Test case count      (0-2): <3 → 3-9 → 10+
 *   Edge cases           (0-1): none → zero/negative/extreme/NaN tested
 *
 * Grades:
 *   REAL       (7-10): actually tests behavior
 *   SHALLOW    (3-6):  structural checks only, needs deeper assertions
 *   SYNTHETIC  (0-2):  placeholder or trivially passing
 *
 * Hook anti-patterns (automatic SYNTHETIC regardless of score):
 *   - `|| true` suppression
 *   - `expect(true).toBe(true)` / `expect(1).toBe(1)`
 *   - 100% of tests are .skip() or .todo()
 *
 * @module engines/TestQualityAuditEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type QualityGrade = "REAL" | "SHALLOW" | "SYNTHETIC" | "CORRUPTED";

export interface TestQualityScore {
  filePath: string;
  fileName: string;
  grade: QualityGrade;
  score: number;
  breakdown: {
    assertionDepth: number;
    concreteInputs: number;
    methodCoverage: number;
    testCaseCount: number;
    edgeCases: number;
  };
  signals: {
    totalTests: number;
    skippedTests: number;
    bareDefinedAsserts: number;
    numericCloseToAsserts: number;
    numericRangeAsserts: number;
    trivialAsserts: number;
    orTrueSuppressions: number;
    distinctMethodCalls: number;
    hasEdgeCases: boolean;
    hasReferenceCompare: boolean;
    hasConcretePhysicsValues: boolean;
  };
  violations: string[];
  targetEngine: string | null;
}

export interface AuditReport {
  timestamp: string;
  totalFiles: number;
  byGrade: Record<QualityGrade, number>;
  byGradePercent: Record<QualityGrade, number>;
  violationCounts: Record<string, number>;
  worstOffenders: TestQualityScore[];
  corruptedFiles: string[];
  syntheticFiles: string[];
  shallowFiles: string[];
  realFiles: string[];
  scores: TestQualityScore[];
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

// Auto-SYNTHETIC markers
const RE_OR_TRUE = /\|\|\s*true\b/g;
const RE_TRIVIAL_TRUE = /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/g;
const RE_TRIVIAL_ONE = /expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)/g;
const RE_SKIP_TODO = /(?:it|test|describe)\s*\.\s*(?:skip|todo)\s*\(/g;

// Test structure — matches it(, it.skip(, it.todo(, test(, test.skip(, test.todo(
const RE_IT_BLOCK = /\b(?:it|test)\s*(?:\.\s*(?:skip|todo|only|each))?\s*\(/g;

// Assertion types — simplified (don't try to match inside expect() — just the matcher suffix)
const RE_BARE_DEFINED = /\.\s*toBeDefined\s*\(\s*\)/g;
const RE_BARE_NOT_NULL = /\.\s*not\s*\.\s*toBeNull\s*\(\s*\)/g;
const RE_TO_BE_CLOSE_TO = /\.\s*toBeCloseTo\s*\(/g;
const RE_TO_BE_GREATER = /\.\s*toBeGreaterThan(?:OrEqual)?\s*\(/g;
const RE_TO_BE_LESS = /\.\s*toBeLessThan(?:OrEqual)?\s*\(/g;
const RE_TO_BE_EXACT = /\.\s*toBe\s*\(\s*(-?\d+(?:\.\d+)?)/g; // numeric toBe
const RE_TO_MATCH_OBJECT = /\.\s*to(?:Match|Equal)(?:Object)?\s*\(/g;
const RE_TO_CONTAIN = /\.\s*toContain(?:Equal)?\s*\(/g;

// Edge case signals (input shapes)
const RE_ZERO_INPUT = /:\s*0(?:\.0+)?\s*[,}\]]/g;
const RE_NEGATIVE_INPUT = /:\s*-\d/g;
const RE_EXTREME = /\b(?:1e[+-]?\d+|Infinity|NaN|Number\.(MAX|MIN)_(SAFE_INTEGER|VALUE))\b/g;
const RE_EMPTY_INPUT = /:\s*(?:\[\]|\{\}|""|'')\s*[,}\]]/g;

// Realistic physics values (heuristic) — cutting speeds, feeds, materials
const RE_PHYSICS_SPEED = /(?:cutting_speed|vc|rpm|speed_mpm|surfaceSpeed)[\s:]+\d{2,4}/gi;
const RE_PHYSICS_FEED = /(?:feed|fz|chip_load|chipLoad|feedrate)[\s:]+0?\.\d+/gi;
const RE_PHYSICS_MATERIAL = /(?:steel|aluminum|titanium|carbide|HSS|A2|D2|S7|M2|H13|Inconel|Ti-6Al|6061)/gi;
const RE_PHYSICS_DIMENSION = /(?:diameter|depth|radius|thickness|width|length)_?(?:mm|in)?[\s:]+\d+/gi;

// Reference data signals
const RE_REFERENCE = /(?:handbook|sandvik|kennametal|haas|okuma|jm.?die|reference|golden|iso|asme|din)/gi;

// Engine name extraction
const RE_ENGINE_IMPORT = /import\s+\{[^}]*\}\s+from\s+['"]\.\.\/engines\/(\w+Engine)\.js['"]/;
const RE_ENGINE_FROM_FILENAME = /^(\w+Engine)\.test\.ts$/;

// Method call extraction
const RE_METHOD_CALL = /\b(\w+Engine|\w+engine)(?:\.\w+|\[\w+\])\s*\(/g;

// ============================================================================
// ENGINE
// ============================================================================

export class TestQualityAuditEngine {
  readonly testsDir: string;
  readonly extraRoots: string[];
  readonly extensions: string[];
  readonly excludeSegments: string[];

  constructor(opts?: string | {
    root?: string;
    extraRoots?: string[];
    extensions?: string[];
    excludeSegments?: string[];
  }) {
    if (typeof opts === "string" || typeof opts === "undefined") {
      this.testsDir = opts || this.resolveTestsDir();
      this.extraRoots = [];
      this.extensions = [".test.ts"];
      this.excludeSegments = ["node_modules", ".git"];
    } else {
      this.testsDir = opts.root || this.resolveTestsDir();
      this.extraRoots = opts.extraRoots || [];
      this.extensions = opts.extensions || [".test.ts"];
      this.excludeSegments = opts.excludeSegments || ["node_modules", ".git"];
    }
  }

  private resolveTestsDir(): string {
    // Prefer absolute well-known location; fall back to cwd-relative
    const candidates = [
      path.resolve(process.cwd(), "src/__tests__"),
      path.resolve(process.cwd(), "mcp-server/src/__tests__"),
      "H:/prism/mcp-server/src/__tests__",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  /** Does a filename match any configured test extension? */
  private hasTestExtension(name: string): boolean {
    return this.extensions.some(ext => name.endsWith(ext));
  }

  /** Recursively enumerate test files under a single root */
  private listUnder(root: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(root)) return out;
    const stack: string[] = [root];
    while (stack.length) {
      const current = stack.pop()!;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (this.excludeSegments.includes(entry.name)) continue;
          stack.push(full);
          continue;
        }
        if (entry.isFile() && this.hasTestExtension(entry.name)) {
          out.push(full);
        }
      }
    }
    return out;
  }

  /** Recursively enumerate test files across primary + extra roots */
  listTestFiles(dir: string = this.testsDir): string[] {
    const roots = [dir, ...this.extraRoots];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of roots) {
      for (const f of this.listUnder(r)) {
        if (seen.has(f)) continue;
        seen.add(f);
        out.push(f);
      }
    }
    return out;
  }

  /** Count non-overlapping regex matches */
  private countMatches(source: string, re: RegExp): number {
    const matches = source.match(re);
    return matches ? matches.length : 0;
  }

  /** Extract the primary engine under test (from import or filename) */
  private resolveTargetEngine(source: string, fileName: string): string | null {
    const byImport = source.match(RE_ENGINE_IMPORT);
    if (byImport) return byImport[1];
    const byName = fileName.match(RE_ENGINE_FROM_FILENAME);
    if (byName) return byName[1];
    return null;
  }

  /** Count distinct engine methods invoked (via any identifier imported from ../engines/) */
  private countDistinctMethods(source: string): number {
    const seen = new Set<string>();
    // Collect identifiers imported from an engines/ path
    const identifiers = new Set<string>();
    const importRe = /import\s+\{([^}]+)\}\s+from\s+['"][^'"]*\/engines\/[^'"]+['"]/g;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(source)) !== null) {
      for (const raw of im[1].split(",")) {
        const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()!.trim();
        if (name) identifiers.add(name);
      }
    }
    // Also treat any *Engine identifier as a potential target (covers aliased imports)
    const fallbackRe = /\b(\w+[Ee]ngine)\b/g;
    let fm: RegExpExecArray | null;
    while ((fm = fallbackRe.exec(source)) !== null) identifiers.add(fm[1]);

    for (const id of identifiers) {
      const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const callRe = new RegExp(`\\b${esc}\\s*\\.\\s*(\\w+)\\s*\\(`, "g");
      let cm: RegExpExecArray | null;
      while ((cm = callRe.exec(source)) !== null) seen.add(`${id}.${cm[1]}`);
    }
    return seen.size;
  }

  /** Score assertion depth (0-3) */
  private scoreAssertionDepth(signals: TestQualityScore["signals"]): number {
    const { bareDefinedAsserts, numericCloseToAsserts, numericRangeAsserts, hasReferenceCompare } = signals;
    const numericTotal = numericCloseToAsserts + numericRangeAsserts;
    const totalAsserts = bareDefinedAsserts + numericTotal;

    if (totalAsserts === 0) return 0;
    const bareRatio = bareDefinedAsserts / Math.max(1, totalAsserts);

    if (hasReferenceCompare && numericCloseToAsserts >= 3) return 3;
    if (numericTotal >= 5 && bareRatio < 0.5) return 3;
    if (numericTotal >= 3) return 2;
    if (numericTotal >= 1) return 1;
    return 0;
  }

  /** Score concrete inputs (0-2) */
  private scoreConcreteInputs(signals: TestQualityScore["signals"]): number {
    return signals.hasConcretePhysicsValues ? 2 : 0;
  }

  /** Score method coverage (0-2) */
  private scoreMethodCoverage(signals: TestQualityScore["signals"]): number {
    const n = signals.distinctMethodCalls;
    if (n >= 3) return 2;
    if (n >= 1) return 1;
    return 0;
  }

  /** Score test case count (0-2) */
  private scoreTestCaseCount(signals: TestQualityScore["signals"]): number {
    const running = signals.totalTests - signals.skippedTests;
    if (running >= 10) return 2;
    if (running >= 3) return 1;
    return 0;
  }

  /** Score edge cases (0-1) */
  private scoreEdgeCases(signals: TestQualityScore["signals"]): number {
    return signals.hasEdgeCases ? 1 : 0;
  }

  /** Classify a single test file */
  classifyFile(filePath: string): TestQualityScore {
    const source = fs.readFileSync(filePath, "utf8");
    const fileName = path.basename(filePath);
    const targetEngine = this.resolveTargetEngine(source, fileName);

    const totalTests = this.countMatches(source, RE_IT_BLOCK);
    const skippedTests = this.countMatches(source, RE_SKIP_TODO);
    const bareDefinedAsserts =
      this.countMatches(source, RE_BARE_DEFINED) +
      this.countMatches(source, RE_BARE_NOT_NULL);
    const numericCloseToAsserts = this.countMatches(source, RE_TO_BE_CLOSE_TO);
    const numericRangeAsserts =
      this.countMatches(source, RE_TO_BE_GREATER) +
      this.countMatches(source, RE_TO_BE_LESS) +
      this.countMatches(source, RE_TO_BE_EXACT);
    const trivialAsserts =
      this.countMatches(source, RE_TRIVIAL_TRUE) +
      this.countMatches(source, RE_TRIVIAL_ONE);
    const orTrueSuppressions = this.countMatches(source, RE_OR_TRUE);
    const distinctMethodCalls = this.countDistinctMethods(source);

    const hasEdgeCases =
      this.countMatches(source, RE_ZERO_INPUT) > 0 ||
      this.countMatches(source, RE_NEGATIVE_INPUT) > 0 ||
      this.countMatches(source, RE_EXTREME) > 0 ||
      this.countMatches(source, RE_EMPTY_INPUT) > 0;

    const hasReferenceCompare = this.countMatches(source, RE_REFERENCE) > 0;

    const hasConcretePhysicsValues =
      this.countMatches(source, RE_PHYSICS_SPEED) > 0 ||
      this.countMatches(source, RE_PHYSICS_FEED) > 0 ||
      this.countMatches(source, RE_PHYSICS_MATERIAL) > 0 ||
      this.countMatches(source, RE_PHYSICS_DIMENSION) > 0;

    const signals: TestQualityScore["signals"] = {
      totalTests,
      skippedTests,
      bareDefinedAsserts,
      numericCloseToAsserts,
      numericRangeAsserts,
      trivialAsserts,
      orTrueSuppressions,
      distinctMethodCalls,
      hasEdgeCases,
      hasReferenceCompare,
      hasConcretePhysicsValues,
    };

    const violations: string[] = [];
    // Detect corruption: no describe/it/test structure at all
    const hasTestStructure = /\bdescribe\s*\(/.test(source) || totalTests > 0;
    const isCorrupted = !hasTestStructure && source.length > 100;

    if (orTrueSuppressions > 0) violations.push(`${orTrueSuppressions}x '|| true' suppression`);
    if (trivialAsserts > 0) violations.push(`${trivialAsserts}x trivial assertion`);
    if (totalTests > 0 && skippedTests === totalTests) violations.push(`all ${totalTests} tests skipped`);
    if (totalTests === 0 && !isCorrupted) violations.push("zero test cases");
    if (isCorrupted) violations.push("no test structure (likely corrupted)");
    if (bareDefinedAsserts > 0 && numericCloseToAsserts + numericRangeAsserts === 0) {
      violations.push("only bare toBeDefined assertions");
    }
    // "no methods called" is only a violation if the file also has weak assertions
    // (FS-guard / contract-mock tests legitimately don't call engine methods)
    const anyAsserts = bareDefinedAsserts + numericCloseToAsserts + numericRangeAsserts + trivialAsserts;
    if (distinctMethodCalls === 0 && anyAsserts <= 2 && !isCorrupted) {
      violations.push("imports engine but calls no methods");
    }

    const breakdown = {
      assertionDepth: this.scoreAssertionDepth(signals),
      concreteInputs: this.scoreConcreteInputs(signals),
      methodCoverage: this.scoreMethodCoverage(signals),
      testCaseCount: this.scoreTestCaseCount(signals),
      edgeCases: this.scoreEdgeCases(signals),
    };

    let score =
      breakdown.assertionDepth +
      breakdown.concreteInputs +
      breakdown.methodCoverage +
      breakdown.testCaseCount +
      breakdown.edgeCases;

    // Auto-SYNTHETIC overrides
    const forceSynthetic =
      orTrueSuppressions > 0 ||
      trivialAsserts > 0 ||
      (totalTests > 0 && skippedTests === totalTests) ||
      (totalTests === 0 && !isCorrupted);

    let grade: QualityGrade;
    if (isCorrupted) {
      grade = "CORRUPTED";
      score = 0;
    } else if (forceSynthetic) {
      grade = "SYNTHETIC";
      score = Math.min(score, 2);
    } else if (score >= 7) {
      grade = "REAL";
    } else if (score >= 3) {
      grade = "SHALLOW";
    } else {
      grade = "SYNTHETIC";
    }

    return {
      filePath,
      fileName,
      grade,
      score,
      breakdown,
      signals,
      violations,
      targetEngine,
    };
  }

  /** Classify every test file in the directory */
  auditAll(): AuditReport {
    const files = this.listTestFiles();
    const scores: TestQualityScore[] = [];
    for (const f of files) {
      try {
        scores.push(this.classifyFile(f));
      } catch (err) {
        log.warn(`TestQualityAuditEngine: failed to classify ${f}: ${(err as Error).message}`);
      }
    }

    const byGrade: Record<QualityGrade, number> = { REAL: 0, SHALLOW: 0, SYNTHETIC: 0, CORRUPTED: 0 };
    const violationCounts: Record<string, number> = {};
    for (const s of scores) {
      byGrade[s.grade]++;
      for (const v of s.violations) {
        const key = v.replace(/^\d+x /, "Nx ");
        violationCounts[key] = (violationCounts[key] || 0) + 1;
      }
    }

    const total = scores.length || 1;
    const byGradePercent: Record<QualityGrade, number> = {
      REAL: +((byGrade.REAL / total) * 100).toFixed(1),
      SHALLOW: +((byGrade.SHALLOW / total) * 100).toFixed(1),
      SYNTHETIC: +((byGrade.SYNTHETIC / total) * 100).toFixed(1),
      CORRUPTED: +((byGrade.CORRUPTED / total) * 100).toFixed(1),
    };

    const worstOffenders = [...scores]
      .sort((a, b) => a.score - b.score)
      .slice(0, 50);

    return {
      timestamp: new Date().toISOString(),
      totalFiles: scores.length,
      byGrade,
      byGradePercent,
      violationCounts,
      worstOffenders,
      corruptedFiles: scores.filter(s => s.grade === "CORRUPTED").map(s => s.fileName).sort(),
      syntheticFiles: scores.filter(s => s.grade === "SYNTHETIC").map(s => s.fileName).sort(),
      shallowFiles: scores.filter(s => s.grade === "SHALLOW").map(s => s.fileName).sort(),
      realFiles: scores.filter(s => s.grade === "REAL").map(s => s.fileName).sort(),
      scores,
    };
  }

  /** Persist audit report to JSON */
  persistReport(report: AuditReport, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
  }
}

export const testQualityAuditEngine = new TestQualityAuditEngine();
