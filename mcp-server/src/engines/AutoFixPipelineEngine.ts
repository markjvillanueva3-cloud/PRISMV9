/**
 * AutoFixPipelineEngine — AUTO-6 U-SI2: Auto-Fix Pipeline
 *
 * Takes detected improvement patterns from SelfImprovementPatternEngine
 * and generates concrete fix candidates: hooks, scripts, skills, or tests.
 *
 * Pipeline stages (per MCP-AUTOMATION-HARDENING-ROADMAP.md AUTO-6):
 *   1. Read patterns from SELF_IMPROVEMENT_PATTERNS.json
 *   2. For each high-priority pattern: generate a fix candidate
 *   3. Dry-run validation: does the fix template make sense?
 *   4. Human approval gate: no auto-fix enters production without review
 *   5. Track promoted fixes for System_Improvement_Rate metric
 *
 * Formula: System_Improvement_Rate = fixes_promoted / patterns_detected
 *
 * NOTE: This is a SOFTWARE META-ENGINEERING engine for automated fix generation.
 * It does NOT perform physics calculations or process materials.
 *
 * Stores results in state/shared/AUTO_FIX_CANDIDATES.json
 * Promoted fixes tracked in state/shared/AUTO_FIX_PROMOTED.json
 *
 * @module AutoFixPipelineEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import type { ImprovementPattern, SelfImprovementReport } from "./SelfImprovementPatternEngine.js";

// ============================================================================
// TYPES
// ============================================================================

type FixType = "hook" | "script" | "skill" | "test" | "engine" | "schema";

/** A generated fix candidate */
export interface FixCandidate {
  id: string;
  pattern_id: string;
  fix_type: FixType;
  file_path: string;
  description: string;
  template: string;
  dry_run_valid: boolean;
  dry_run_reason: string;
  status: "candidate" | "approved" | "promoted" | "rejected";
  created_at: string;
  approved_at?: string;
  promoted_at?: string;
}

/** Full pipeline report */
export interface AutoFixReport {
  timestamp: string;
  patterns_analyzed: number;
  candidates_generated: number;
  candidates: FixCandidate[];
  improvement_rate: number;
  warnings: string[];
}

/** Promotion tracking */
interface PromotionLog {
  promoted: Array<{
    fix_id: string;
    pattern_id: string;
    fix_type: string;
    file_path: string;
    promoted_at: string;
  }>;
  total_promoted: number;
  total_patterns: number;
  rate: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MCP_STATE_DIR = path.resolve(import.meta.dirname, "../state/shared");
const CANDIDATE_FILE = path.join(
  import.meta.dirname.includes("dist") ? path.resolve(import.meta.dirname, "../../state/shared") : MCP_STATE_DIR,
  "AUTO_FIX_CANDIDATES.json"
);
const PROMOTED_FILE = path.join(
  import.meta.dirname.includes("dist") ? path.resolve(import.meta.dirname, "../../state/shared") : MCP_STATE_DIR,
  "AUTO_FIX_PROMOTED.json"
);
const PATTERN_FILE_CANDIDATES = [
  path.join(MCP_STATE_DIR, "SELF_IMPROVEMENT_PATTERNS.json"),
  path.resolve(import.meta.dirname, "../../state/shared/SELF_IMPROVEMENT_PATTERNS.json"),
  path.resolve(import.meta.dirname, "../../../state/shared/SELF_IMPROVEMENT_PATTERNS.json"),
];

// Minimum priority threshold for generating fix candidates
const PRIORITY_THRESHOLD = 1.0;

// ============================================================================
// ENGINE
// ============================================================================

export class AutoFixPipelineEngine {
  private warnings: string[] = [];

  /**
   * Generate fix candidates from detected patterns.
   * Reads SELF_IMPROVEMENT_PATTERNS.json and generates template fixes.
   * @returns AutoFixReport with candidates
   */
  compute(): AutoFixReport {
    this.warnings = [];

    // Stage 1: Read patterns
    const patterns = this.loadPatterns();
    if (!patterns) {
      return {
        timestamp: new Date().toISOString(),
        patterns_analyzed: 0,
        candidates_generated: 0,
        candidates: [],
        improvement_rate: 0,
        warnings: ["No improvement patterns found. Run self_improvement_scan first."],
      };
    }

    // Stage 2-3: Generate + dry-run-validate candidates for high-priority patterns.
    // Shared with suggest() via buildCandidates (which drops malformed candidates and
    // records a warning for each). highPriority is kept here for patterns_analyzed.
    const highPriority = patterns.filter((p) => p.priority >= PRIORITY_THRESHOLD);
    const validCandidates = this.buildCandidates(patterns);

    // Compute improvement rate from promotion log
    const promotionLog = this.loadPromotionLog();
    const totalPatterns = patterns.length || 1;
    const rate = promotionLog.total_promoted / totalPatterns;

    const report: AutoFixReport = {
      timestamp: new Date().toISOString(),
      patterns_analyzed: highPriority.length,
      candidates_generated: validCandidates.length,
      candidates: validCandidates,
      improvement_rate: Math.round(rate * 1000) / 1000,
      warnings: this.warnings,
    };

    this.saveResults(report);

    log.info(
      `AutoFixPipelineEngine: generated ${report.candidates_generated} candidates ` +
        `from ${report.patterns_analyzed} patterns, improvement rate ${report.improvement_rate}`
    );

    return report;
  }

  /**
   * Read cached report from disk.
   */
  read(): AutoFixReport | null {
    const candidates = [
      CANDIDATE_FILE,
      path.resolve(import.meta.dirname, "../../state/shared/AUTO_FIX_CANDIDATES.json"),
      path.resolve(import.meta.dirname, "../../../state/shared/AUTO_FIX_CANDIDATES.json"),
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
   * Approve a candidate by ID. Sets status to "approved".
   * @param fixId The fix candidate ID (e.g., "AFX-001")
   * @returns Updated candidate or null
   */
  approve(fixId: string): FixCandidate | null {
    const report = this.read();
    if (!report) return null;

    const candidate = report.candidates.find((c) => c.id === fixId);
    if (!candidate) return null;

    candidate.status = "approved";
    candidate.approved_at = new Date().toISOString();
    this.saveResults(report);
    return candidate;
  }

  /**
   * Promote an approved candidate. Marks it as promoted and logs it.
   * The actual file creation is left to the human or a follow-up action.
   * @param fixId The fix candidate ID
   * @returns Updated candidate or null
   */
  promote(fixId: string): FixCandidate | null {
    const report = this.read();
    if (!report) return null;

    const candidate = report.candidates.find((c) => c.id === fixId);
    if (!candidate || candidate.status !== "approved") return null;

    candidate.status = "promoted";
    candidate.promoted_at = new Date().toISOString();
    this.saveResults(report);

    // Update promotion log
    const promotionLog = this.loadPromotionLog();
    promotionLog.promoted.push({
      fix_id: fixId,
      pattern_id: candidate.pattern_id,
      fix_type: candidate.fix_type,
      file_path: candidate.file_path,
      promoted_at: candidate.promoted_at,
    });
    promotionLog.total_promoted = promotionLog.promoted.length;

    // Load pattern count for rate calculation
    const patterns = this.loadPatterns();
    promotionLog.total_patterns = patterns?.length || promotionLog.total_patterns;
    promotionLog.rate =
      promotionLog.total_patterns > 0
        ? promotionLog.total_promoted / promotionLog.total_patterns
        : 0;

    this.savePromotionLog(promotionLog);
    return candidate;
  }

  /**
   * Generate a markdown summary.
   */
  summary(): string {
    const report = this.read();
    if (!report) {
      return "No auto-fix candidates generated yet. Run `prism_dev auto_fix_generate` first.";
    }

    const lines: string[] = [
      `# Auto-Fix Pipeline Report`,
      ``,
      `**Updated**: ${report.timestamp}`,
      `**Patterns Analyzed**: ${report.patterns_analyzed}`,
      `**Candidates Generated**: ${report.candidates_generated}`,
      `**Improvement Rate**: ${(report.improvement_rate * 100).toFixed(1)}%`,
      ``,
      `| # | Pattern | Type | File | Status | Valid |`,
      `|---|---------|------|------|--------|-------|`,
    ];

    for (const c of report.candidates.slice(0, 20)) {
      lines.push(
        `| ${c.id} | ${c.pattern_id} | ${c.fix_type} | ${path.basename(c.file_path)} | ${c.status} | ${c.dry_run_valid ? "Y" : "N"} |`
      );
    }

    if (report.candidates.length > 20) {
      lines.push(``, `*...and ${report.candidates.length - 20} more candidates*`);
    }

    // Promotion stats
    const promotionLog = this.loadPromotionLog();
    lines.push(
      ``,
      `## Promotion Stats`,
      `- Total promoted: ${promotionLog.total_promoted}`,
      `- Total patterns: ${promotionLog.total_patterns}`,
      `- Rate: ${(promotionLog.rate * 100).toFixed(1)}%`,
    );

    if (report.warnings.length > 0) {
      lines.push(``, `## Warnings`, ``);
      for (const w of report.warnings) {
        lines.push(`- ${w}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * SelfImprovement -> AutoFix handoff (P9-U02). Generate validated fix candidates
   * directly from patterns WITHOUT persisting -- the pure, in-memory counterpart to
   * compute(). When `patterns` is omitted it loads from SELF_IMPROVEMENT_PATTERNS.json
   * (so an ad-hoc caller and the scan pipeline share one entry point); an explicit
   * (even empty) array is used as-is -- never falling back to disk. Filters by the same
   * PRIORITY_THRESHOLD as compute() and returns only the candidate list.
   * @param patterns Optional patterns to suggest fixes for; omit to load from disk.
   * @returns The generated FixCandidate[] (empty when nothing qualifies). Never writes.
   */
  suggest(patterns?: ImprovementPattern[]): FixCandidate[] {
    this.warnings = [];
    // `??` (nullish) so an explicit [] is respected; only undefined loads from disk.
    const source = patterns ?? this.loadPatterns() ?? [];
    return this.buildCandidates(source);
  }

  // ==========================================================================
  // CANDIDATE GENERATION
  // ==========================================================================

  /**
   * Pure candidate core shared by compute() and suggest(): filter patterns to the
   * PRIORITY_THRESHOLD, generate a typed fix candidate per qualifying pattern, dry-run
   * validate it, and drop malformed candidates (recording a warning for each). Assigns
   * sequential AFX ids in pattern order exactly as the original compute() loop did.
   * Does NOT persist -- the caller decides whether to saveResults().
   */
  private buildCandidates(patterns: ImprovementPattern[]): FixCandidate[] {
    const candidates: FixCandidate[] = [];
    const highPriority = patterns.filter((p) => p.priority >= PRIORITY_THRESHOLD);
    for (const pattern of highPriority) {
      const candidate = this.generateCandidate(pattern, candidates.length + 1);
      if (candidate) {
        this.validateCandidate(candidate);
        candidates.push(candidate);
      }
    }
    return candidates.filter((c) => {
      if (!c.id || !c.template || !c.file_path) {
        this.warnings.push(`Rejected malformed candidate for pattern ${c.pattern_id}`);
        return false;
      }
      return true;
    });
  }

  private generateCandidate(
    pattern: ImprovementPattern,
    index: number
  ): FixCandidate | null {
    const id = `AFX-${String(index).padStart(3, "0")}`;
    const now = new Date().toISOString();

    switch (pattern.suggested_fix) {
      case "hook":
        return this.generateHookCandidate(id, pattern, now);
      case "test":
        return this.generateTestCandidate(id, pattern, now);
      case "script":
        return this.generateScriptCandidate(id, pattern, now);
      case "skill":
        return this.generateSkillCandidate(id, pattern, now);
      case "engine":
        return this.generateEngineFixCandidate(id, pattern, now);
      case "schema":
        return this.generateSchemaCandidate(id, pattern, now);
      default:
        return this.generateHookCandidate(id, pattern, now);
    }
  }

  private generateHookCandidate(
    id: string,
    p: ImprovementPattern,
    now: string
  ): FixCandidate {
    const safeDomain = p.domain.replace(/[^a-z0-9-]/g, "-");
    const fileName = `enforce-${safeDomain}-autofix.py`;
    const filePath = path.join("~/.claude/hooks/lib", fileName);

    const template = [
      `#!/usr/bin/env python3`,
      `"""`,
      `AUTO-GENERATED HOOK: Fix for pattern ${p.id}`,
      `Category: ${p.category} | Domain: ${p.domain} | Severity: ${p.severity}`,
      `Description: ${p.description.slice(0, 100)}`,
      `Generated by AutoFixPipelineEngine (AUTO-6 U-SI2)`,
      `"""`,
      `import json, sys`,
      ``,
      `def main():`,
      `    try:`,
      `        data = json.loads(sys.stdin.read())`,
      `    except Exception:`,
      `        print(json.dumps({"continue": True}))`,
      `        return`,
      ``,
      `    # IMPLEMENT: Add validation logic for ${p.domain}`,
      `    # Pattern: ${p.description.slice(0, 80)}`,
      `    # Suggested: ${p.fix_description.slice(0, 80)}`,
      `    print(json.dumps({"continue": True}))`,
      ``,
      `if __name__ == "__main__":`,
      `    main()`,
    ].join("\n");

    return {
      id,
      pattern_id: p.id,
      fix_type: "hook",
      file_path: filePath,
      description: p.fix_description,
      template,
      dry_run_valid: true,
      dry_run_reason: "Template is syntactically valid Python",
      status: "candidate",
      created_at: now,
    };
  }

  private generateTestCandidate(
    id: string,
    p: ImprovementPattern,
    now: string
  ): FixCandidate {
    const safeName = p.domain.replace(/[^a-z0-9-]/g, "-");
    const fileName = `autofix-${safeName}.test.ts`;
    const filePath = path.join("src/__tests__", fileName);

    const template = [
      `/**`,
      ` * AUTO-GENERATED TEST: Coverage for pattern ${p.id}`,
      ` * Category: ${p.category} | Domain: ${p.domain}`,
      ` * ${p.description.slice(0, 80)}`,
      ` * Generated by AutoFixPipelineEngine (AUTO-6 U-SI2)`,
      ` */`,
      `import { describe, it, expect } from "vitest";`,
      ``,
      `describe("${p.domain} coverage", () => {`,
      `  it("should handle the ${p.category} pattern", () => {`,
      `    // IMPLEMENT: Add test for: ${p.fix_description.slice(0, 60)}`,
      `    expect(true).toBe(true);`,
      `  });`,
      `});`,
    ].join("\n");

    return {
      id,
      pattern_id: p.id,
      fix_type: "test",
      file_path: filePath,
      description: p.fix_description,
      template,
      dry_run_valid: true,
      dry_run_reason: "Template is syntactically valid TypeScript",
      status: "candidate",
      created_at: now,
    };
  }

  private generateScriptCandidate(
    id: string,
    p: ImprovementPattern,
    now: string
  ): FixCandidate {
    const safeName = p.domain.replace(/[^a-z0-9-]/g, "-");
    const filePath = path.join("scripts", `autofix-${safeName}.mjs`);

    const template = [
      `#!/usr/bin/env node`,
      `/**`,
      ` * AUTO-GENERATED SCRIPT: Fix for pattern ${p.id}`,
      ` * ${p.description.slice(0, 80)}`,
      ` * Generated by AutoFixPipelineEngine (AUTO-6 U-SI2)`,
      ` */`,
      ``,
      `// IMPLEMENT: ${p.fix_description.slice(0, 80)}`,
      `console.log("Script placeholder for ${p.domain} fix");`,
    ].join("\n");

    return {
      id,
      pattern_id: p.id,
      fix_type: "script",
      file_path: filePath,
      description: p.fix_description,
      template,
      dry_run_valid: true,
      dry_run_reason: "Template is valid Node.js script",
      status: "candidate",
      created_at: now,
    };
  }

  private generateSkillCandidate(
    id: string,
    p: ImprovementPattern,
    now: string
  ): FixCandidate {
    const safeName = p.domain.replace(/[^a-z0-9-]/g, "-");
    const filePath = path.join("~/.claude/commands", `autofix-${safeName}.md`);

    const template = [
      `# Auto-Fix: ${p.domain}`,
      ``,
      `## Purpose`,
      `${p.fix_description}`,
      ``,
      `## Pattern Detected`,
      `- Category: ${p.category}`,
      `- Severity: ${p.severity}`,
      `- Frequency: ${p.frequency}`,
      ``,
      `## Action`,
      `Define the skill action for fixing ${p.domain} patterns here.`,
    ].join("\n");

    return {
      id,
      pattern_id: p.id,
      fix_type: "skill",
      file_path: filePath,
      description: p.fix_description,
      template,
      dry_run_valid: true,
      dry_run_reason: "Template is valid Markdown skill definition",
      status: "candidate",
      created_at: now,
    };
  }

  private generateEngineFixCandidate(
    id: string,
    p: ImprovementPattern,
    now: string
  ): FixCandidate {
    return {
      id,
      pattern_id: p.id,
      fix_type: "engine",
      file_path: `src/engines/ (manual fix needed)`,
      description: p.fix_description,
      template: `// Engine fix for ${p.id}: ${p.fix_description}\n// Requires manual implementation — auto-generation not safe for engine code.`,
      dry_run_valid: false,
      dry_run_reason: "Engine fixes require manual implementation for safety",
      status: "candidate",
      created_at: now,
    };
  }

  private generateSchemaCandidate(
    id: string,
    p: ImprovementPattern,
    now: string
  ): FixCandidate {
    return {
      id,
      pattern_id: p.id,
      fix_type: "schema",
      file_path: `src/schemas/ (manual wiring needed)`,
      description: p.fix_description,
      template: `// Schema fix for ${p.id}: ${p.fix_description}\n// Requires manual wiring — auto-generation not safe for schema code.`,
      dry_run_valid: false,
      dry_run_reason: "Schema fixes require manual wiring for correctness",
      status: "candidate",
      created_at: now,
    };
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  private validateCandidate(candidate: FixCandidate): void {
    // Basic syntactic validation of the template
    if (!candidate.template || candidate.template.length < 10) {
      candidate.dry_run_valid = false;
      candidate.dry_run_reason = "Template too short to be useful";
      return;
    }

    // For hooks: check Python syntax markers
    if (candidate.fix_type === "hook") {
      if (!candidate.template.includes("def main()")) {
        candidate.dry_run_valid = false;
        candidate.dry_run_reason = "Hook template missing main() function";
        return;
      }
    }

    // For tests: check vitest markers
    if (candidate.fix_type === "test") {
      if (!candidate.template.includes("describe(") || !candidate.template.includes("expect(")) {
        candidate.dry_run_valid = false;
        candidate.dry_run_reason = "Test template missing describe/expect blocks";
        return;
      }
    }
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private loadPatterns(): ImprovementPattern[] | null {
    for (const fp of PATTERN_FILE_CANDIDATES) {
      try {
        if (fs.existsSync(fp)) {
          const data: SelfImprovementReport = JSON.parse(fs.readFileSync(fp, "utf-8"));
          return data.patterns || null;
        }
      } catch {
        /* try next */
      }
    }
    return null;
  }

  private loadPromotionLog(): PromotionLog {
    const candidates = [
      PROMOTED_FILE,
      path.resolve(import.meta.dirname, "../../state/shared/AUTO_FIX_PROMOTED.json"),
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
    return { promoted: [], total_promoted: 0, total_patterns: 0, rate: 0 };
  }

  private savePromotionLog(log: PromotionLog): void {
    const candidates = [
      PROMOTED_FILE,
      path.resolve(import.meta.dirname, "../../state/shared/AUTO_FIX_PROMOTED.json"),
    ];
    for (const fp of candidates) {
      try {
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, JSON.stringify(log, null, 2));
        return;
      } catch {
        /* try next */
      }
    }
  }

  private saveResults(report: AutoFixReport): void {
    const candidates = [
      CANDIDATE_FILE,
      path.resolve(import.meta.dirname, "../../state/shared/AUTO_FIX_CANDIDATES.json"),
    ];
    for (const fp of candidates) {
      try {
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, JSON.stringify(report, null, 2));
        log.info(`AutoFixPipelineEngine: saved results to ${fp}`);
        return;
      } catch {
        /* try next */
      }
    }
    this.warnings.push("Could not save results to disk");
  }
}

export const autoFixPipelineEngine = new AutoFixPipelineEngine();
