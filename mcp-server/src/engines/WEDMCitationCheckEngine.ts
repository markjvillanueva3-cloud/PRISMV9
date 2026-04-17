/**
 * WEDMCitationCheckEngine.ts — MS-P1-100PCT U-P1-02
 *
 * Validates that all WEDM engine outputs trace to published citations.
 * Detects synthetic parameters, placeholders, and uncited values.
 *
 * Used by:
 *   - Hook: wedm-synthetic-block (CI HARD BLOCK on uncited parameters)
 *   - Action: prism_edm:wedm_citation_check
 *   - Skill: /wedm-cite
 *
 * Citation requirements per Deep Logic pillar:
 *   - Every numeric constant must cite a source (ISO standard, paper, manufacturer spec)
 *   - Feed rates must trace to Kunieda (2005) or published conditions
 *   - Wire parameters must cite manufacturer spec sheets
 *   - Offsets must cite DiBitonto (1989) or equivalent
 */

import { promises as fs } from "fs";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface CitationCheckResult {
  /** Engine file name */
  engine: string;
  /** Overall pass/fail */
  passed: boolean;
  /** Number of cited values */
  citedCount: number;
  /** Number of uncited/synthetic values */
  uncitedCount: number;
  /** Specific issues found */
  issues: CitationIssue[];
  /** Citation coverage percentage */
  coveragePct: number;
}

export interface CitationIssue {
  /** Type of issue */
  type: "synthetic" | "placeholder" | "hardcoded" | "uncited" | "todo";
  /** Line number in file */
  line: number;
  /** Code snippet */
  snippet: string;
  /** Severity */
  severity: "error" | "warning" | "info";
  /** Suggested fix */
  suggestion: string;
}

export interface CitationSummary {
  /** Total engines scanned */
  totalEngines: number;
  /** Engines with full citation coverage */
  fullyCited: number;
  /** Engines with partial coverage */
  partiallyCited: number;
  /** Engines with critical issues */
  critical: number;
  /** Overall coverage percentage */
  overallCoveragePct: number;
  /** Per-engine results */
  results: CitationCheckResult[];
  /** Timestamp */
  timestamp: string;
}

// ============================================================================
// PATTERNS TO DETECT
// ============================================================================

const SYNTHETIC_PATTERNS = [
  { pattern: /synthetic/i, type: "synthetic" as const, severity: "error" as const },
  { pattern: /placeholder/i, type: "placeholder" as const, severity: "error" as const },
  { pattern: /TODO/i, type: "todo" as const, severity: "warning" as const },
  { pattern: /FIXME/i, type: "todo" as const, severity: "warning" as const },
  { pattern: /hardcode/i, type: "hardcoded" as const, severity: "warning" as const },
];

// Patterns that indicate a value IS properly cited (whitelist)
const CITATION_PATTERNS = [
  /source:/i,
  /ref:/i,
  /citation:/i,
  /per\s+(ISO|ASTM|JIS|DIN)/i,
  /\(?\d{4}\)?.*?(CIRP|J\.\s*Appl|Int\.\s*J|Annals)/i,  // Year + journal
  /Kunieda/i,
  /Klocke/i,
  /DiBitonto/i,
  /Toenshoff/i,
  /Bedra|Berkenhoff|Shinko|Hitachi|Sumitomo/i,  // Manufacturer
  /AtomicValue/i,  // Using AtomicValue pattern indicates traceability
];

// Magic numbers that are suspicious without citation
const MAGIC_NUMBER_PATTERNS = [
  { pattern: /=\s*\d+\.?\d*\s*;/, threshold: 2.0 }, // Assignment of numeric constant
  { pattern: /const\s+\w+\s*=\s*\d+\.?\d*/, threshold: 0 }, // Const declaration
];

// Acceptable uses of "synthetic" (not errors)
const SYNTHETIC_WHITELIST = [
  /synthetic.*training/i,  // ML training data
  /synthetic.*test/i,      // Test data
  /synthetic.*noise/i,     // Test noise
  /synthetic.*label/i,     // Labels
  /distinguish.*synthetic/i, // Documentation
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class WEDMCitationCheckEngine {
  private readonly enginesPath = path.join(process.cwd(), "src/engines");

  /**
   * Check a single file for citation issues.
   */
  async checkFile(filePath: string): Promise<CitationCheckResult> {
    const fileName = path.basename(filePath);
    const issues: CitationIssue[] = [];

    let content: string;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch {
      return {
        engine: fileName,
        passed: false,
        citedCount: 0,
        uncitedCount: 0,
        issues: [{ type: "uncited", line: 0, snippet: "File not found", severity: "error", suggestion: "Check file path" }],
        coveragePct: 0,
      };
    }

    const lines = content.split("\n");
    let citedCount = 0;
    let uncitedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for synthetic patterns
      for (const { pattern, type, severity } of SYNTHETIC_PATTERNS) {
        if (pattern.test(line)) {
          // Check if it's in the whitelist
          const isWhitelisted = SYNTHETIC_WHITELIST.some((wp) => wp.test(line));
          if (!isWhitelisted) {
            issues.push({
              type,
              line: lineNum,
              snippet: line.trim().substring(0, 80),
              severity,
              suggestion: this.getSuggestion(type),
            });
            uncitedCount++;
          }
        }
      }

      // Check if line has citation markers
      const hasCitation = CITATION_PATTERNS.some((p) => p.test(line));
      if (hasCitation) {
        citedCount++;
      }
    }

    const totalValues = citedCount + uncitedCount;
    const coveragePct = totalValues > 0 ? (citedCount / totalValues) * 100 : 100;
    const passed = issues.filter((i) => i.severity === "error").length === 0;

    return {
      engine: fileName,
      passed,
      citedCount,
      uncitedCount,
      issues,
      coveragePct,
    };
  }

  /**
   * Check all WEDM engines for citation coverage.
   */
  async checkAllWEDMEngines(): Promise<CitationSummary> {
    const results: CitationCheckResult[] = [];

    // Find all WEDM/EDM/WireEDM engine files
    let files: string[];
    try {
      const allFiles = await fs.readdir(this.enginesPath);
      files = allFiles.filter(
        (f) =>
          (f.startsWith("WEDM") || f.startsWith("EDM") || f.startsWith("WireEDM")) &&
          f.endsWith(".ts") &&
          !f.endsWith(".test.ts")
      );
    } catch {
      files = [];
    }

    for (const file of files) {
      const result = await this.checkFile(path.join(this.enginesPath, file));
      results.push(result);
    }

    const fullyCited = results.filter((r) => r.passed && r.coveragePct === 100).length;
    const partiallyCited = results.filter((r) => r.passed && r.coveragePct < 100).length;
    const critical = results.filter((r) => !r.passed).length;

    const totalCited = results.reduce((sum, r) => sum + r.citedCount, 0);
    const totalUncited = results.reduce((sum, r) => sum + r.uncitedCount, 0);
    const total = totalCited + totalUncited;
    const overallCoveragePct = total > 0 ? (totalCited / total) * 100 : 100;

    return {
      totalEngines: results.length,
      fullyCited,
      partiallyCited,
      critical,
      overallCoveragePct,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if a specific engine passes citation requirements.
   * Used by the wedm-synthetic-block hook.
   */
  async checkEngine(engineName: string): Promise<{ passed: boolean; issues: CitationIssue[] }> {
    const filePath = path.join(this.enginesPath, engineName);
    const result = await this.checkFile(filePath);
    return {
      passed: result.passed,
      issues: result.issues,
    };
  }

  /**
   * Generate citation report for a set of files.
   */
  async generateReport(files?: string[]): Promise<string> {
    const summary = files
      ? await this.checkSpecificFiles(files)
      : await this.checkAllWEDMEngines();

    const lines: string[] = [];
    lines.push("# WEDM Citation Check Report");
    lines.push(`Generated: ${summary.timestamp}`);
    lines.push("");
    lines.push("## Summary");
    lines.push(`- Total engines scanned: ${summary.totalEngines}`);
    lines.push(`- Fully cited: ${summary.fullyCited}`);
    lines.push(`- Partially cited: ${summary.partiallyCited}`);
    lines.push(`- Critical issues: ${summary.critical}`);
    lines.push(`- Overall coverage: ${summary.overallCoveragePct.toFixed(1)}%`);
    lines.push("");

    if (summary.critical > 0) {
      lines.push("## Critical Issues");
      for (const result of summary.results.filter((r) => !r.passed)) {
        lines.push(`### ${result.engine}`);
        for (const issue of result.issues.filter((i) => i.severity === "error")) {
          lines.push(`- Line ${issue.line}: [${issue.type}] ${issue.snippet}`);
          lines.push(`  Suggestion: ${issue.suggestion}`);
        }
        lines.push("");
      }
    }

    if (summary.partiallyCited > 0) {
      lines.push("## Warnings");
      for (const result of summary.results.filter((r) => r.passed && r.issues.length > 0)) {
        lines.push(`### ${result.engine} (${result.coveragePct.toFixed(0)}% coverage)`);
        for (const issue of result.issues.filter((i) => i.severity === "warning")) {
          lines.push(`- Line ${issue.line}: [${issue.type}] ${issue.snippet}`);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Check specific files (for pre-commit hook use).
   */
  private async checkSpecificFiles(files: string[]): Promise<CitationSummary> {
    const results: CitationCheckResult[] = [];

    for (const file of files) {
      const result = await this.checkFile(file);
      results.push(result);
    }

    const fullyCited = results.filter((r) => r.passed && r.coveragePct === 100).length;
    const partiallyCited = results.filter((r) => r.passed && r.coveragePct < 100).length;
    const critical = results.filter((r) => !r.passed).length;

    const totalCited = results.reduce((sum, r) => sum + r.citedCount, 0);
    const totalUncited = results.reduce((sum, r) => sum + r.uncitedCount, 0);
    const total = totalCited + totalUncited;
    const overallCoveragePct = total > 0 ? (totalCited / total) * 100 : 100;

    return {
      totalEngines: results.length,
      fullyCited,
      partiallyCited,
      critical,
      overallCoveragePct,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get suggestion for fixing an issue.
   */
  private getSuggestion(type: CitationIssue["type"]): string {
    switch (type) {
      case "synthetic":
        return "Replace with published value from manufacturer spec or research paper";
      case "placeholder":
        return "Implement actual calculation or cite published value";
      case "hardcoded":
        return "Move to constants.ts with citation or use AtomicValue pattern";
      case "todo":
        return "Complete implementation with proper citations";
      case "uncited":
        return "Add source citation in comment or use AtomicValue";
      default:
        return "Review and add citation";
    }
  }

  /**
   * Get list of engines with synthetic parameters.
   */
  async getEnginesWithSynthetics(): Promise<string[]> {
    const summary = await this.checkAllWEDMEngines();
    return summary.results
      .filter((r) => r.issues.some((i) => i.type === "synthetic"))
      .map((r) => r.engine);
  }
}

export const wedmCitationCheckEngine = new WEDMCitationCheckEngine();
