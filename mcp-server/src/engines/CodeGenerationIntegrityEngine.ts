/**
 * CodeGenerationIntegrityEngine — AI Code Generation Quality Assurance
 * =====================================================================
 * Prevents corrupted code generation by validating content before writing.
 * This is a critical safeguard for AI agents that generate TypeScript code.
 *
 * Corruption Types Prevented:
 *   - Binary data in source files (zlib, sourcemaps)
 *   - Mixed file content (multiple engine definitions in one file)
 *   - Truncated/incomplete code
 *   - Invalid TypeScript syntax patterns
 *   - Source map contamination in .ts files
 *
 * Usage:
 *   import { codeGenerationIntegrityEngine } from "./CodeGenerationIntegrityEngine.js";
 *
 *   // Before writing any generated code:
 *   const result = codeGenerationIntegrityEngine.validateBeforeWrite({
 *     filepath: "src/engines/MyNewEngine.ts",
 *     content: generatedCode,
 *     fileType: "engine"
 *   });
 *
 *   if (!result.valid) {
 *     console.error("Code validation failed:", result.errors);
 *     // DO NOT WRITE — code is corrupted
 *   }
 *
 * @module engines/CodeGenerationIntegrityEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type FileType = "engine" | "algorithm" | "dispatcher" | "test" | "route" | "schema" | "hook" | "utility" | "unknown";

export interface ValidationInput {
  filepath: string;
  content: string;
  fileType?: FileType;
  /** If true, attempt to fix minor issues */
  autoFix?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;  // 0-1, how confident we are in validity
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: CodeMetrics;
  autoFixed?: string;  // Fixed content if autoFix was requested and possible
}

export interface ValidationError {
  type: CorruptionType;
  severity: "critical" | "major" | "moderate";
  message: string;
  line?: number;
  context?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

export interface CodeMetrics {
  lineCount: number;
  charCount: number;
  importCount: number;
  exportCount: number;
  classCount: number;
  functionCount: number;
  binaryBytePercent: number;
  avgLineLength: number;
  maxLineLength: number;
}

export type CorruptionType =
  | "BINARY_DATA"           // Non-text binary content
  | "SOURCEMAP_LEAK"        // .map content in source
  | "MIXED_CONTENT"         // Multiple file definitions merged
  | "TRUNCATED"             // Incomplete file (missing closing braces)
  | "INVALID_START"         // File doesn't start with valid TS
  | "DECLARATION_LEAK"      // .d.ts content in source
  | "ENCODING_ERROR"        // Invalid UTF-8 sequences
  | "EMPTY_FILE"            // Zero content
  | "SYNTAX_PATTERN"        // Obvious syntax errors
  | "DUPLICATE_EXPORTS";    // Same export declared multiple times

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

/** Binary data signatures that should never appear in TypeScript */
const BINARY_SIGNATURES = [
  /^\x00/,                           // Null byte at start
  /\x01/,                            // SOH character
  /\x78\x9c/,                        // zlib header
  /\x1f\x8b/,                        // gzip header
  /\x50\x4b\x03\x04/,                // ZIP header
  /\x89PNG/,                         // PNG header
  /\xff\xd8\xff/,                    // JPEG header
];

/** Source map contamination patterns */
const SOURCEMAP_PATTERNS = [
  /^\/\/# sourceMappingURL=/m,
  /^\/\/# sourceURL=/m,
  /\.map$/,
  /"mappings":\s*"[A-Za-z0-9+/;,]+"/, // Source map JSON
];

/** Valid TypeScript file starts */
const VALID_TS_STARTS = [
  /^\/\*\*/,                         // JSDoc comment
  /^\/\//,                           // Single-line comment
  /^import\s/,                       // Import statement
  /^export\s/,                       // Export statement
  /^declare\s/,                      // Ambient declaration
  /^const\s/,                        // Const declaration
  /^let\s/,                          // Let declaration
  /^var\s/,                          // Var declaration
  /^class\s/,                        // Class declaration
  /^interface\s/,                    // Interface declaration
  /^type\s/,                         // Type alias
  /^function\s/,                     // Function declaration
  /^enum\s/,                         // Enum declaration
  /^namespace\s/,                    // Namespace declaration
  /^abstract\s/,                     // Abstract class
  /^async\s/,                        // Async function
  /^'use strict'/,                   // Strict mode
  /^"use strict"/,                   // Strict mode
];

/** Mixed content indicators */
const MIXED_CONTENT_PATTERNS = [
  /^\/\*\*[\s\S]*?\*\/[\s\S]*?^\/\*\*[\s\S]*?class\s+\w+Engine/m,  // Multiple JSDoc blocks with different engines
  /class\s+(\w+Engine)[\s\S]*?class\s+(?!\1)\w+Engine/,              // Multiple engine classes
  /export\s+class\s+(\w+)[\s\S]*?export\s+class\s+(?!\1)\w+/,        // Multiple exported classes
];

/** Declaration file leakage */
const DECLARATION_PATTERNS = [
  /^export declare /m,               // .d.ts export declare
  /\/\/# sourceMappingURL=.*\.d\.ts\.map/,
  /\.d\.ts\.map$/,
];

// ============================================================================
// ENGINE
// ============================================================================

export class CodeGenerationIntegrityEngine {
  private validationHistory: Array<{ filepath: string; result: ValidationResult; timestamp: string }> = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Validate code before writing to disk.
   * CALL THIS BEFORE EVERY fs.writeFile ON GENERATED CODE.
   */
  validateBeforeWrite(input: ValidationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const content = input.content;
    const filepath = input.filepath;

    // ── Empty file check ──
    if (!content || content.trim().length === 0) {
      errors.push({
        type: "EMPTY_FILE",
        severity: "critical",
        message: "Generated content is empty",
      });
      return this.buildResult(false, 0, errors, warnings, this.computeMetrics(content));
    }

    // ── Binary data detection ──
    const binaryCheck = this.detectBinaryData(content);
    if (binaryCheck.hasBinary) {
      errors.push({
        type: "BINARY_DATA",
        severity: "critical",
        message: `Binary data detected: ${binaryCheck.signature}`,
        context: binaryCheck.context,
      });
    }

    // ── Source map contamination ──
    const sourcemapCheck = this.detectSourceMapLeak(content);
    if (sourcemapCheck.hasLeak) {
      errors.push({
        type: "SOURCEMAP_LEAK",
        severity: "major",
        message: `Source map content detected in TypeScript file`,
        line: sourcemapCheck.line,
        context: sourcemapCheck.context,
      });
    }

    // ── Declaration file leakage ──
    const declCheck = this.detectDeclarationLeak(content);
    if (declCheck.hasLeak) {
      errors.push({
        type: "DECLARATION_LEAK",
        severity: "major",
        message: ".d.ts declaration content detected in source file",
        line: declCheck.line,
      });
    }

    // ── Valid TypeScript start ──
    const startCheck = this.checkValidStart(content);
    if (!startCheck.valid) {
      errors.push({
        type: "INVALID_START",
        severity: "critical",
        message: "File does not start with valid TypeScript pattern",
        context: startCheck.actualStart,
      });
    }

    // ── Mixed content detection ──
    const mixedCheck = this.detectMixedContent(content, input.fileType);
    if (mixedCheck.hasMixed) {
      errors.push({
        type: "MIXED_CONTENT",
        severity: "critical",
        message: `Multiple ${mixedCheck.type} definitions detected in single file`,
        context: mixedCheck.classes?.join(", "),
      });
    }

    // ── Truncated file check ──
    const truncatedCheck = this.detectTruncation(content);
    if (truncatedCheck.truncated) {
      errors.push({
        type: "TRUNCATED",
        severity: "critical",
        message: `File appears truncated: ${truncatedCheck.reason}`,
      });
    }

    // ── Encoding validation ──
    const encodingCheck = this.validateEncoding(content);
    if (!encodingCheck.valid) {
      errors.push({
        type: "ENCODING_ERROR",
        severity: "major",
        message: `Invalid encoding: ${encodingCheck.issues.join(", ")}`,
      });
    }

    // ── Syntax pattern checks ──
    const syntaxWarnings = this.checkSyntaxPatterns(content);
    warnings.push(...syntaxWarnings);

    // ── Duplicate export check ──
    const dupCheck = this.checkDuplicateExports(content);
    if (dupCheck.hasDuplicates) {
      errors.push({
        type: "DUPLICATE_EXPORTS",
        severity: "moderate",
        message: `Duplicate exports detected: ${dupCheck.duplicates.join(", ")}`,
      });
    }

    // ── Compute metrics ──
    const metrics = this.computeMetrics(content);

    // ── High binary byte percentage warning ──
    if (metrics.binaryBytePercent > 0.5) {
      warnings.push({
        type: "HIGH_BINARY_PERCENT",
        message: `${(metrics.binaryBytePercent * 100).toFixed(1)}% non-printable characters`,
        suggestion: "Check for encoding issues or binary contamination",
      });
    }

    // ── Very long lines warning ──
    if (metrics.maxLineLength > 500) {
      warnings.push({
        type: "VERY_LONG_LINES",
        message: `Maximum line length is ${metrics.maxLineLength} characters`,
        suggestion: "Check for minified or concatenated content",
      });
    }

    // ── Calculate confidence ──
    const confidence = this.calculateConfidence(errors, warnings, metrics);
    const valid = errors.filter(e => e.severity === "critical" || e.severity === "major").length === 0;

    // ── Auto-fix if requested ──
    let autoFixed: string | undefined;
    if (input.autoFix && !valid && errors.length > 0) {
      autoFixed = this.attemptAutoFix(content, errors);
      if (autoFixed) {
        const revalidation = this.validateBeforeWrite({ ...input, content: autoFixed, autoFix: false });
        if (revalidation.valid) {
          log.info(`[CodeGenerationIntegrity] Auto-fixed ${errors.length} issues in ${filepath}`);
        }
      }
    }

    const result = this.buildResult(valid, confidence, errors, warnings, metrics, autoFixed);

    // ── Record in history ──
    this.recordValidation(filepath, result);

    return result;
  }

  /**
   * Quick check if content is likely valid TypeScript.
   * Use for fast pre-screening before full validation.
   */
  quickValidate(content: string): { likely_valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Empty
    if (!content?.trim()) {
      issues.push("Empty content");
      return { likely_valid: false, issues };
    }

    // Binary signature
    for (const sig of BINARY_SIGNATURES) {
      if (sig.test(content.slice(0, 100))) {
        issues.push("Binary signature detected");
        return { likely_valid: false, issues };
      }
    }

    // Valid start
    const firstLine = content.split("\n")[0].trim();
    const hasValidStart = VALID_TS_STARTS.some(p => p.test(firstLine));
    if (!hasValidStart && firstLine.length > 0) {
      issues.push("Does not start with valid TypeScript");
    }

    // Source map at end
    if (/\/\/# sourceMappingURL=/.test(content)) {
      issues.push("Contains sourceMappingURL directive");
    }

    return { likely_valid: issues.length === 0, issues };
  }

  /**
   * Get validation statistics.
   */
  getStatistics(): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    commonErrors: Array<{ type: string; count: number }>;
  } {
    const total = this.validationHistory.length;
    const passed = this.validationHistory.filter(h => h.result.valid).length;
    const failed = total - passed;

    // Count error types
    const errorCounts = new Map<string, number>();
    for (const h of this.validationHistory) {
      for (const e of h.result.errors) {
        errorCounts.set(e.type, (errorCounts.get(e.type) || 0) + 1);
      }
    }

    const commonErrors = Array.from(errorCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total : 1,
      commonErrors,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private detectBinaryData(content: string): { hasBinary: boolean; signature?: string; context?: string } {
    for (const sig of BINARY_SIGNATURES) {
      if (sig.test(content.slice(0, 100))) {
        return {
          hasBinary: true,
          signature: sig.source,
          context: content.slice(0, 50).replace(/[\x00-\x1f]/g, "?"),
        };
      }
    }

    // Check for high concentration of non-printable characters
    const sample = content.slice(0, 1000);
    let nonPrintable = 0;
    for (const char of sample) {
      const code = char.charCodeAt(0);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        nonPrintable++;
      }
    }
    if (nonPrintable / sample.length > 0.1) {
      return {
        hasBinary: true,
        signature: "high_non_printable",
        context: `${nonPrintable} non-printable characters in first 1000 bytes`,
      };
    }

    return { hasBinary: false };
  }

  private detectSourceMapLeak(content: string): { hasLeak: boolean; line?: number; context?: string } {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of SOURCEMAP_PATTERNS) {
        if (pattern.test(lines[i])) {
          return {
            hasLeak: true,
            line: i + 1,
            context: lines[i].slice(0, 80),
          };
        }
      }
    }
    return { hasLeak: false };
  }

  private detectDeclarationLeak(content: string): { hasLeak: boolean; line?: number } {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of DECLARATION_PATTERNS) {
        if (pattern.test(lines[i])) {
          return { hasLeak: true, line: i + 1 };
        }
      }
    }
    return { hasLeak: false };
  }

  private checkValidStart(content: string): { valid: boolean; actualStart?: string } {
    const firstLine = content.split("\n")[0].trim();
    if (!firstLine) {
      return { valid: false, actualStart: "(empty first line)" };
    }

    const hasValidStart = VALID_TS_STARTS.some(p => p.test(firstLine));
    return {
      valid: hasValidStart,
      actualStart: hasValidStart ? undefined : firstLine.slice(0, 50),
    };
  }

  private detectMixedContent(content: string, fileType?: FileType): { hasMixed: boolean; type?: string; classes?: string[] } {
    // For engine files, check for multiple engine class definitions
    if (fileType === "engine") {
      const engineClasses = content.match(/class\s+(\w+Engine)/g);
      if (engineClasses && engineClasses.length > 1) {
        const names = engineClasses.map(m => m.replace(/class\s+/, ""));
        const unique = [...new Set(names)];
        if (unique.length > 1) {
          return { hasMixed: true, type: "engine class", classes: unique };
        }
      }
    }

    // Check for multiple JSDoc @module declarations
    const modules = content.match(/@module\s+\S+/g);
    if (modules && modules.length > 1) {
      const unique = [...new Set(modules)];
      if (unique.length > 1) {
        return { hasMixed: true, type: "module", classes: unique };
      }
    }

    return { hasMixed: false };
  }

  private detectTruncation(content: string): { truncated: boolean; reason?: string } {
    const lines = content.split("\n");
    const lastLine = lines[lines.length - 1].trim();

    // Count braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;

    if (openBraces > closeBraces + 5) {
      return { truncated: true, reason: `${openBraces - closeBraces} unclosed braces` };
    }

    // Check for incomplete function/class at end
    if (/^\s*(if|for|while|function|class|async|export)\s*\([^)]*$/.test(lastLine)) {
      return { truncated: true, reason: "Incomplete statement at end" };
    }

    // Very short file with complex structure suggests truncation
    if (lines.length < 10 && openBraces > 3) {
      return { truncated: true, reason: "File too short for structure complexity" };
    }

    return { truncated: false };
  }

  private validateEncoding(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for replacement characters (encoding errors)
    if (content.includes("\uFFFD")) {
      issues.push("Contains replacement characters (encoding errors)");
    }

    // Check for byte order mark (shouldn't be in middle of file)
    if (content.indexOf("\uFEFF", 1) > 0) {
      issues.push("Contains BOM in middle of file");
    }

    // Check for null bytes
    if (content.includes("\x00")) {
      issues.push("Contains null bytes");
    }

    return { valid: issues.length === 0, issues };
  }

  private checkSyntaxPatterns(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Unterminated string literals (simple heuristic)
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Count quotes (excluding escaped)
      const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
      const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
      const backticks = (line.match(/(?<!\\)`/g) || []).length;

      if (singleQuotes % 2 !== 0 && !line.includes("//") && !line.includes("/*")) {
        warnings.push({
          type: "POSSIBLE_UNTERMINATED_STRING",
          message: `Odd number of single quotes on line ${i + 1}`,
          suggestion: "Check for unterminated string literals",
        });
      }
    }

    return warnings;
  }

  private checkDuplicateExports(content: string): { hasDuplicates: boolean; duplicates: string[] } {
    const exports = content.match(/export\s+(const|let|var|class|function|interface|type|enum)\s+(\w+)/g);
    if (!exports) return { hasDuplicates: false, duplicates: [] };

    const names = exports.map(e => {
      const match = e.match(/export\s+\w+\s+(\w+)/);
      return match ? match[1] : "";
    }).filter(Boolean);

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const name of names) {
      if (seen.has(name)) {
        duplicates.push(name);
      }
      seen.add(name);
    }

    return { hasDuplicates: duplicates.length > 0, duplicates };
  }

  private computeMetrics(content: string): CodeMetrics {
    const lines = content.split("\n");
    const lineLengths = lines.map(l => l.length);

    // Count non-printable bytes
    let binaryBytes = 0;
    for (const char of content) {
      const code = char.charCodeAt(0);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        binaryBytes++;
      }
    }

    return {
      lineCount: lines.length,
      charCount: content.length,
      importCount: (content.match(/^import\s/gm) || []).length,
      exportCount: (content.match(/^export\s/gm) || []).length,
      classCount: (content.match(/class\s+\w+/g) || []).length,
      functionCount: (content.match(/function\s+\w+|=>\s*\{/g) || []).length,
      binaryBytePercent: content.length > 0 ? binaryBytes / content.length : 0,
      avgLineLength: lines.length > 0 ? lineLengths.reduce((a, b) => a + b, 0) / lines.length : 0,
      maxLineLength: Math.max(...lineLengths, 0),
    };
  }

  private calculateConfidence(errors: ValidationError[], warnings: ValidationWarning[], metrics: CodeMetrics): number {
    let confidence = 1.0;

    // Deduct for errors
    for (const e of errors) {
      switch (e.severity) {
        case "critical": confidence -= 0.4; break;
        case "major": confidence -= 0.25; break;
        case "moderate": confidence -= 0.1; break;
      }
    }

    // Deduct for warnings
    confidence -= warnings.length * 0.05;

    // Deduct for suspicious metrics
    if (metrics.binaryBytePercent > 0.01) confidence -= 0.2;
    if (metrics.maxLineLength > 1000) confidence -= 0.1;
    if (metrics.lineCount < 5 && metrics.classCount > 0) confidence -= 0.15;

    return Math.max(0, Math.min(1, confidence));
  }

  private attemptAutoFix(content: string, errors: ValidationError[]): string | undefined {
    let fixed = content;

    for (const error of errors) {
      switch (error.type) {
        case "SOURCEMAP_LEAK":
          // Remove sourcemap comments
          fixed = fixed.replace(/\/\/# sourceMappingURL=.*$/gm, "");
          break;

        case "DECLARATION_LEAK":
          // Can't auto-fix declaration leaks easily
          break;

        default:
          // Most corruption can't be auto-fixed
          break;
      }
    }

    return fixed !== content ? fixed : undefined;
  }

  private buildResult(
    valid: boolean,
    confidence: number,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    metrics: CodeMetrics,
    autoFixed?: string
  ): ValidationResult {
    return { valid, confidence, errors, warnings, metrics, autoFixed };
  }

  private recordValidation(filepath: string, result: ValidationResult): void {
    this.validationHistory.push({
      filepath,
      result,
      timestamp: new Date().toISOString(),
    });

    // Trim history
    if (this.validationHistory.length > this.MAX_HISTORY) {
      this.validationHistory = this.validationHistory.slice(-this.MAX_HISTORY);
    }

    // Log failures
    if (!result.valid) {
      log.warn(`[CodeGenerationIntegrity] Validation FAILED for ${filepath}: ${result.errors.map(e => e.type).join(", ")}`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const codeGenerationIntegrityEngine = new CodeGenerationIntegrityEngine();
