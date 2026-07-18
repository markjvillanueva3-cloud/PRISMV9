/**
 * SelfImprovementPatternEngine — AUTO-6 U-SI1: Pattern Detection
 *
 * Monitors PRISM session state for repeated patterns that indicate
 * systemic issues worth automating away. Reads from multiple state
 * files to detect:
 *   - Repeated failure patterns (same domain/type failing 3+ times)
 *   - Quality score drops across engines
 *   - Hook block frequency (which hooks fire most often)
 *   - Unresolved or recurring failures
 *
 * Priority formula (per MCP-AUTOMATION-HARDENING-ROADMAP.md AUTO-6):
 *   Improvement_Priority = frequency × severity_weight × (1 - automation_level)
 *
 * Where:
 *   frequency = number of occurrences across sessions
 *   severity_weight = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 }
 *   automation_level = 0 if no hook/script exists, 1 if fully automated
 *
 * NOTE: This is a SOFTWARE META-ENGINEERING engine for self-improvement pattern
 * detection. It does NOT perform physics calculations or process materials.
 * For physics validation, see FormulaValidationEngine (AUTO-5).
 *
 * Outputs ranked patterns with suggested fix type (hook, script, skill, test).
 *
 * State sources:
 *   - state/failure_patterns.jsonl — historical failure patterns
 *   - state/ERROR_LOG.jsonl — error events
 *   - state/LEARNING_LOG.jsonl — learnings from sessions
 *   - mcp-server/state/shared/QUALITY_SCORES.json — quality scores
 *   - mcp-server/state/shared/FORMULA_ACCURACY.json — formula accuracy
 *   - state/session-edit-counter.json — edit/review ratios
 *
 * @module SelfImprovementPatternEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Severity levels for improvement patterns */
type Severity = "critical" | "high" | "medium" | "low";

/** Categories of detected patterns */
type PatternCategory =
  | "repeated_failure"
  | "quality_gap"
  | "hook_block_frequency"
  | "formula_regression"
  | "test_gap"
  | "wiring_gap"
  | "unresolved_error";

/** Suggested fix types */
type FixType = "hook" | "script" | "skill" | "test" | "engine" | "schema";

/** A single failure record from failure_patterns.jsonl */
interface FailureRecord {
  id: string;
  type: string;
  domain: string;
  context: string;
  error: string;
  severity: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
  resolved: boolean;
  resolved_at?: string;
  prevention?: string;
}

/** A detected improvement pattern */
export interface ImprovementPattern {
  id: string;
  category: PatternCategory;
  description: string;
  frequency: number;
  severity: Severity;
  automation_level: number;
  priority: number;
  suggested_fix: FixType;
  fix_description: string;
  source_file?: string;
  domain: string;
  last_seen: string;
}

/** Full report from compute() */
export interface SelfImprovementReport {
  timestamp: string;
  total_patterns: number;
  patterns: ImprovementPattern[];
  aggregate_priority: number;
  system_improvement_rate: number;
  sources_read: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
};

// In vitest: import.meta.dirname = src/engines/, in dist: import.meta.dirname = dist/
// failure_patterns.jsonl lives at H:/prism/state/, QUALITY_SCORES at mcp-server/state/shared/
const STATE_DIR = fs.existsSync(path.resolve(import.meta.dirname, "../../../state/failure_patterns.jsonl"))
  ? path.resolve(import.meta.dirname, "../../../state")   // vitest: src/engines → H:/prism/state
  : path.resolve(import.meta.dirname, "../../state");     // dist: dist → H:/prism/state
const MCP_STATE_DIR = path.resolve(import.meta.dirname, "../state/shared");
const RESULT_FILE = path.join(
  import.meta.dirname.includes("dist") ? path.resolve(import.meta.dirname, "../../state/shared") : MCP_STATE_DIR,
  "SELF_IMPROVEMENT_PATTERNS.json"
);

// ============================================================================
// ENGINE
// ============================================================================

export class SelfImprovementPatternEngine {
  private patterns: ImprovementPattern[] = [];
  private warnings: string[] = [];
  private sourcesRead: string[] = [];

  /**
   * Compute improvement patterns from all available state sources.
   * @returns SelfImprovementReport with ranked patterns
   */
  compute(): SelfImprovementReport {
    this.patterns = [];
    this.warnings = [];
    this.sourcesRead = [];

    this.analyzeFailurePatterns();
    this.analyzeQualityScores();
    this.analyzeFormulaAccuracy();
    this.analyzeErrorLog();
    this.analyzeLearningLog();
    this.analyzeEditReviewRatio();

    // Output validation: clamp priorities to sane range, reject invalid entries
    this.patterns = this.patterns.filter((p) => {
      if (p.frequency < 0 || !Number.isFinite(p.priority)) {
        this.warnings.push(`Rejected invalid pattern: freq=${p.frequency}, priority=${p.priority}`);
        return false;
      }
      // Clamp priority to [0, 100] — anything beyond indicates a data anomaly
      p.priority = Math.max(0, Math.min(100, p.priority));
      return true;
    });

    // Sort by priority (highest first)
    this.patterns.sort((a, b) => b.priority - a.priority);

    // Assign sequential IDs
    this.patterns.forEach((p, i) => {
      p.id = `SIP-${String(i + 1).padStart(3, "0")}`;
    });

    const totalPriority = this.patterns.reduce((s, p) => s + p.priority, 0);
    const automated = this.patterns.filter((p) => p.automation_level > 0.5).length;
    const rate = this.patterns.length > 0 ? automated / this.patterns.length : 1.0;

    const report: SelfImprovementReport = {
      timestamp: new Date().toISOString(),
      total_patterns: this.patterns.length,
      patterns: this.patterns,
      aggregate_priority: Math.round(totalPriority * 100) / 100,
      system_improvement_rate: Math.round(rate * 1000) / 1000,
      sources_read: this.sourcesRead,
      warnings: this.warnings,
    };

    // Persist results
    this.saveResults(report);

    log.info(
      `SelfImprovementPatternEngine: detected ${report.total_patterns} patterns, ` +
        `aggregate priority ${report.aggregate_priority}, improvement rate ${report.system_improvement_rate}`
    );

    return report;
  }

  /**
   * Read cached report from disk.
   * @returns SelfImprovementReport or null if not found
   */
  read(): SelfImprovementReport | null {
    const candidates = [
      RESULT_FILE,
      path.resolve(import.meta.dirname, "../../state/shared/SELF_IMPROVEMENT_PATTERNS.json"),
      path.resolve(import.meta.dirname, "../../../state/shared/SELF_IMPROVEMENT_PATTERNS.json"),
    ];
    for (const fp of candidates) {
      try {
        if (fs.existsSync(fp)) {
          return JSON.parse(fs.readFileSync(fp, "utf-8"));
        }
      } catch {
        /* try next */
      }
    }
    return null;
  }

  /**
   * Generate a markdown summary of the top patterns.
   * @returns Markdown string
   */
  summary(): string {
    const report = this.read();
    if (!report) {
      return "No self-improvement patterns computed yet. Run `prism_dev self_improvement_scan` first.";
    }

    const lines: string[] = [
      `# Self-Improvement Patterns`,
      ``,
      `**Updated**: ${report.timestamp}`,
      `**Total Patterns**: ${report.total_patterns}`,
      `**Improvement Rate**: ${(report.system_improvement_rate * 100).toFixed(1)}%`,
      `**Aggregate Priority**: ${report.aggregate_priority.toFixed(1)}`,
      ``,
      `| # | Priority | Severity | Category | Domain | Description | Fix |`,
      `|---|----------|----------|----------|--------|-------------|-----|`,
    ];

    for (const p of report.patterns.slice(0, 20)) {
      lines.push(
        `| ${p.id} | ${p.priority.toFixed(2)} | ${p.severity} | ${p.category} | ${p.domain} | ${p.description.slice(0, 60)} | ${p.suggested_fix}: ${p.fix_description.slice(0, 40)} |`
      );
    }

    if (report.patterns.length > 20) {
      lines.push(``, `*...and ${report.patterns.length - 20} more patterns*`);
    }

    if (report.warnings.length > 0) {
      lines.push(``, `## Warnings`, ``);
      for (const w of report.warnings) {
        lines.push(`- ${w}`);
      }
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // ANALYZERS
  // ==========================================================================

  private analyzeFailurePatterns(): void {
    const fp = path.join(STATE_DIR, "failure_patterns.jsonl");
    if (!fs.existsSync(fp)) {
      this.warnings.push("failure_patterns.jsonl not found — skipping failure analysis");
      return;
    }

    this.sourcesRead.push("failure_patterns.jsonl");

    try {
      const lines = fs.readFileSync(fp, "utf-8").trim().split("\n");
      const records: FailureRecord[] = lines
        .map((l) => {
          try {
            return JSON.parse(l) as FailureRecord;
          } catch {
            return null;
          }
        })
        .filter((r): r is FailureRecord => r !== null);

      for (const rec of records) {
        // Only flag patterns with 3+ occurrences or unresolved issues
        if (rec.occurrences < 3 && rec.resolved) continue;

        const severity = this.mapSeverity(rec.severity);
        const isAutomated = rec.resolved && rec.prevention?.includes("Auto-resolved") ? 0.7 : 0;
        const freq = rec.occurrences;
        const priority = freq * SEVERITY_WEIGHTS[severity] * (1 - isAutomated);

        if (priority < 0.5) continue; // Skip low-impact patterns

        this.patterns.push({
          id: "",
          category: rec.resolved ? "repeated_failure" : "unresolved_error",
          description: `${rec.type} in ${rec.domain}: ${rec.error.slice(0, 120)}`,
          frequency: freq,
          severity,
          automation_level: isAutomated,
          priority: Math.round(priority * 100) / 100,
          suggested_fix: this.suggestFixType(rec),
          fix_description: this.suggestFixDescription(rec),
          source_file: "failure_patterns.jsonl",
          domain: rec.domain,
          last_seen: rec.last_seen,
        });
      }
    } catch (e) {
      this.warnings.push(`Failed to parse failure_patterns.jsonl: ${e}`);
    }
  }

  private analyzeQualityScores(): void {
    const candidates = [
      path.join(import.meta.dirname, "../state/shared/QUALITY_SCORES.json"),
      path.resolve(import.meta.dirname, "../../state/shared/QUALITY_SCORES.json"),
    ];

    let data: Record<string, unknown> | null = null;
    for (const fp of candidates) {
      try {
        if (fs.existsSync(fp)) {
          data = JSON.parse(fs.readFileSync(fp, "utf-8"));
          this.sourcesRead.push("QUALITY_SCORES.json");
          break;
        }
      } catch {
        /* try next */
      }
    }

    if (!data) {
      this.warnings.push("QUALITY_SCORES.json not found — skipping quality analysis");
      return;
    }

    const engines = (data as Record<string, unknown>).engines as
      | Record<string, { Q: number; W: number; T: number; P: number }>
      | undefined;
    if (!engines) return;

    // Find engines with Q < 0.70 (critical gap)
    for (const [name, scores] of Object.entries(engines)) {
      if (typeof scores !== "object" || scores === null) continue;
      const q = scores.Q;
      if (typeof q !== "number") continue;

      if (q < 0.50) {
        this.patterns.push({
          id: "",
          category: "quality_gap",
          description: `Engine ${name} has Q=${q.toFixed(2)} (critical: <0.50)`,
          frequency: 1,
          severity: "critical",
          automation_level: 0,
          priority: (1 - q) * 10,
          suggested_fix: this.qualityFixType(scores),
          fix_description: this.qualityFixDescription(name, scores),
          domain: "quality",
          last_seen: (data as Record<string, string>).timestamp || new Date().toISOString(),
        });
      } else if (q < 0.70) {
        this.patterns.push({
          id: "",
          category: "quality_gap",
          description: `Engine ${name} has Q=${q.toFixed(2)} (below target 0.70)`,
          frequency: 1,
          severity: "high",
          automation_level: 0,
          priority: (1 - q) * 5,
          suggested_fix: this.qualityFixType(scores),
          fix_description: this.qualityFixDescription(name, scores),
          domain: "quality",
          last_seen: (data as Record<string, string>).timestamp || new Date().toISOString(),
        });
      }
    }
  }

  private analyzeFormulaAccuracy(): void {
    const candidates = [
      path.join(import.meta.dirname, "../state/shared/FORMULA_ACCURACY.json"),
      path.resolve(import.meta.dirname, "../../state/shared/FORMULA_ACCURACY.json"),
    ];

    let data: Record<string, unknown> | null = null;
    for (const fp of candidates) {
      try {
        if (fs.existsSync(fp)) {
          data = JSON.parse(fs.readFileSync(fp, "utf-8"));
          this.sourcesRead.push("FORMULA_ACCURACY.json");
          break;
        }
      } catch {
        /* try next */
      }
    }

    if (!data) {
      this.warnings.push("FORMULA_ACCURACY.json not found — skipping formula accuracy analysis");
      return;
    }

    const results = data.results as Record<string, { accuracy: number }> | undefined;
    if (!results) return;

    for (const [formula, result] of Object.entries(results)) {
      if (typeof result !== "object" || result === null) continue;
      const acc = result.accuracy;
      if (typeof acc !== "number") continue;

      if (acc < 0.90) {
        this.patterns.push({
          id: "",
          category: "formula_regression",
          description: `Formula ${formula} accuracy ${(acc * 100).toFixed(1)}% (below 90% BLOCK threshold)`,
          frequency: 1,
          severity: "critical",
          automation_level: 0.5, // Hook exists via U-FA2
          priority: (1 - acc) * 10 * (1 - 0.5),
          suggested_fix: "engine",
          fix_description: `Fix ${formula} implementation to match published reference data`,
          domain: "physics",
          last_seen: data.timestamp as string || new Date().toISOString(),
        });
      } else if (acc < 0.95) {
        this.patterns.push({
          id: "",
          category: "formula_regression",
          description: `Formula ${formula} accuracy ${(acc * 100).toFixed(1)}% (below 95% WARN threshold)`,
          frequency: 1,
          severity: "medium",
          automation_level: 0.5,
          priority: (1 - acc) * 5 * (1 - 0.5),
          suggested_fix: "engine",
          fix_description: `Improve ${formula} calibration against manufacturer data`,
          domain: "physics",
          last_seen: data.timestamp as string || new Date().toISOString(),
        });
      }
    }
  }

  private analyzeErrorLog(): void {
    const fp = path.join(STATE_DIR, "ERROR_LOG.jsonl");
    if (!fs.existsSync(fp)) return;

    this.sourcesRead.push("ERROR_LOG.jsonl");

    try {
      const lines = fs.readFileSync(fp, "utf-8").trim().split("\n");
      // Group by error message prefix to detect repeated errors
      const errorGroups = new Map<string, number>();

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const msg = (entry.error || entry.message || "").slice(0, 80);
          if (msg) {
            errorGroups.set(msg, (errorGroups.get(msg) || 0) + 1);
          }
        } catch {
          /* skip malformed lines */
        }
      }

      for (const [msg, count] of errorGroups) {
        if (count < 2) continue;
        this.patterns.push({
          id: "",
          category: "unresolved_error",
          description: `Repeated error (${count}x): ${msg}`,
          frequency: count,
          severity: count >= 5 ? "high" : "medium",
          automation_level: 0,
          priority: count * SEVERITY_WEIGHTS[count >= 5 ? "high" : "medium"],
          suggested_fix: "hook",
          fix_description: `Add validation hook to prevent: ${msg.slice(0, 50)}`,
          domain: "error-handling",
          last_seen: new Date().toISOString(),
        });
      }
    } catch {
      this.warnings.push("Failed to parse ERROR_LOG.jsonl");
    }
  }

  private analyzeLearningLog(): void {
    const fp = path.join(STATE_DIR, "LEARNING_LOG.jsonl");
    if (!fs.existsSync(fp)) return;

    this.sourcesRead.push("LEARNING_LOG.jsonl");

    try {
      const lines = fs.readFileSync(fp, "utf-8").trim().split("\n");
      // Look for correction patterns — repeated user corrections indicate missing automation
      const corrections = new Map<string, number>();

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === "correction" || entry.type === "user_override") {
            const domain = entry.domain || "general";
            corrections.set(domain, (corrections.get(domain) || 0) + 1);
          }
        } catch {
          /* skip */
        }
      }

      for (const [domain, count] of corrections) {
        if (count < 2) continue;
        this.patterns.push({
          id: "",
          category: "repeated_failure",
          description: `User corrected ${domain} behavior ${count} times — needs automation`,
          frequency: count,
          severity: count >= 5 ? "high" : "medium",
          automation_level: 0,
          priority: count * SEVERITY_WEIGHTS[count >= 5 ? "high" : "medium"] * 1.5, // Boost: user pain
          suggested_fix: "hook",
          fix_description: `Create enforcement hook for ${domain} to prevent recurring corrections`,
          domain,
          last_seen: new Date().toISOString(),
        });
      }
    } catch {
      this.warnings.push("Failed to parse LEARNING_LOG.jsonl");
    }
  }

  private analyzeEditReviewRatio(): void {
    const fp = path.join(STATE_DIR, "..", "mcp-server", "state", "session-edit-counter.json");
    if (!fs.existsSync(fp)) return;

    this.sourcesRead.push("session-edit-counter.json");

    try {
      const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
      const edits = data.edit_count || 0;
      const reviews = data.prism_review_count || 0;

      if (edits > 20 && reviews === 0) {
        this.patterns.push({
          id: "",
          category: "quality_gap",
          description: `${edits} edits with 0 reviews this session — review discipline gap`,
          frequency: edits,
          severity: "high",
          automation_level: 0.3, // Review gate hook exists but isn't blocking enough
          priority: Math.min(edits / 5, 10) * SEVERITY_WEIGHTS.high * (1 - 0.3),
          suggested_fix: "hook",
          fix_description: "Tighten review-gate.sh to block after fewer edits",
          domain: "quality",
          last_seen: new Date().toISOString(),
        });
      }
    } catch {
      /* skip */
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private mapSeverity(s: string): Severity {
    const lower = (s || "medium").toLowerCase();
    if (lower === "critical" || lower === "crit") return "critical";
    if (lower === "high") return "high";
    if (lower === "low") return "low";
    return "medium";
  }

  private suggestFixType(rec: FailureRecord): FixType {
    if (rec.type === "stale-reference") return "hook";
    if (rec.type === "missing-data") return "test";
    if (rec.domain === "build-system") return "script";
    if (rec.domain === "calculations") return "hook";
    return "hook";
  }

  private suggestFixDescription(rec: FailureRecord): string {
    if (rec.type === "stale-reference") {
      return `Add pre-flight check hook for ${rec.domain} to validate references before use`;
    }
    if (rec.type === "missing-data") {
      return `Add test coverage for ${rec.context} data availability`;
    }
    if (rec.domain === "calculations") {
      return `Add input validation hook for ${rec.context} to reject invalid parameters`;
    }
    return `Add automated check for ${rec.type} in ${rec.domain}`;
  }

  private qualityFixType(scores: { W: number; T: number; P: number }): FixType {
    if (scores.W < 0.3) return "schema";
    if (scores.T < 0.3) return "test";
    if (scores.P < 0.3) return "engine";
    return "test";
  }

  private qualityFixDescription(
    name: string,
    scores: { W: number; T: number; P: number }
  ): string {
    const gaps: string[] = [];
    if (scores.W < 0.5) gaps.push("wiring");
    if (scores.T < 0.5) gaps.push("tests");
    if (scores.P < 0.5) gaps.push("physics");
    return `Improve ${name}: fix ${gaps.join(", ")} gaps`;
  }

  private saveResults(report: SelfImprovementReport): void {
    const candidates = [
      RESULT_FILE,
      path.resolve(import.meta.dirname, "../../state/shared/SELF_IMPROVEMENT_PATTERNS.json"),
    ];

    for (const fp of candidates) {
      try {
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, JSON.stringify(report, null, 2));
        log.info(`SelfImprovementPatternEngine: saved results to ${fp}`);
        return;
      } catch {
        /* try next */
      }
    }
    this.warnings.push("Could not save results to disk");
  }
}

export const selfImprovementPatternEngine = new SelfImprovementPatternEngine();
