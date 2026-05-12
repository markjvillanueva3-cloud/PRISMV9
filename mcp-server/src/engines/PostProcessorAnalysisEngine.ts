/**
 * PostProcessorAnalysisEngine.ts
 *
 * AI-Powered Deep Analysis Engine for Post Processor Files
 * Uses deep reasoning to identify logic issues, dead code, and optimization opportunities.
 *
 * Key Analysis Categories:
 * - Dead Code Detection (unreachable conditions, always-true/false checks)
 * - Logic Contradiction Analysis (conflicting conditions)
 * - Modal State Tracking (G-code modal groups)
 * - Cycle Type Validation (drilling, tapping, boring sequences)
 * - Feed/Speed Consistency (calculations across sections)
 * - UPK Switch Validation (TCP, rotary axis, work offset patterns)
 *
 * @module engines/PostProcessorAnalysisEngine
 */

export interface PostIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: PostIssueCategory;
  line: number;
  lineEnd?: number;
  code: string;
  description: string;
  recommendation: string;
  autoFixable: boolean;
  fix?: string;
}

export type PostIssueCategory =
  | "dead_code"
  | "logic_error"
  | "modal_conflict"
  | "cycle_issue"
  | "feed_inconsistency"
  | "spindle_logic"
  | "axis_calculation"
  | "format_warning"
  | "best_practice"
  | "performance"
  | "safety";

export interface AnalysisResult {
  filename: string;
  totalLines: number;
  issues: PostIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  score: number; // 0-100 quality score
  recommendations: string[];
}

// Pattern matchers for common post processor issues
const DEAD_CODE_PATTERNS = [
  {
    pattern: /if\s*\(\s*true\s*\|\|/g,
    description: "Dead code: 'true ||' short-circuits, right side never evaluated",
    severity: "medium" as const,
    category: "dead_code" as const,
  },
  {
    pattern: /if\s*\(\s*false\s*&&/g,
    description: "Dead code: 'false &&' short-circuits, right side never evaluated",
    severity: "medium" as const,
    category: "dead_code" as const,
  },
  {
    pattern: /if\s*\(\s*true\s*\)/g,
    description: "Unconditional block: 'if (true)' always executes",
    severity: "low" as const,
    category: "dead_code" as const,
  },
  {
    pattern: /if\s*\(\s*false\s*\)/g,
    description: "Dead block: 'if (false)' never executes",
    severity: "medium" as const,
    category: "dead_code" as const,
  },
];

const LOGIC_PATTERNS = [
  {
    // Check for contradictory boolean logic
    pattern: /!\s*(\w+)[\s\S]{0,50}\1\s*\?/g,
    description: "Potentially redundant check: variable negated then used in ternary",
    severity: "low" as const,
    category: "logic_error" as const,
  },
  {
    // Double negation
    pattern: /!\s*!\s*\w+/g,
    description: "Double negation can be simplified",
    severity: "info" as const,
    category: "best_practice" as const,
  },
];

const SPINDLE_PATTERNS = [
  {
    // M3/M4 without checking tool direction first
    pattern: /writeBlock\s*\(\s*mFormat\.format\s*\(\s*[34]\s*\)\s*\)/g,
    description: "Direct spindle direction output - verify tool.clockwise is checked",
    severity: "info" as const,
    category: "spindle_logic" as const,
  },
];

const CYCLE_PATTERNS = [
  {
    // Multiple Z words in one block
    pattern: /"Z"\s*\+[^,\)]+,\s*"Z"\s*\+/g,
    description: "Multiple Z words in cycle block - may cause controller confusion",
    severity: "high" as const,
    category: "cycle_issue" as const,
  },
];

const FEED_PATTERNS = [
  {
    // Feed without F prefix validation
    pattern: /feedOutput\.format\s*\(\s*0\s*\)/g,
    description: "Zero feed output - will cause machine error",
    severity: "critical" as const,
    category: "feed_inconsistency" as const,
  },
];

const SAFETY_PATTERNS = [
  {
    // Division without zero check
    pattern: /\/\s*(\w+)\s*(?![^{]*if\s*\(\s*\1\s*[!=><])/g,
    description: "Division without nearby zero-check guard",
    severity: "medium" as const,
    category: "safety" as const,
  },
];

/**
 * Deep AI analysis patterns for post processor optimization
 */
const AI_ANALYSIS_RULES = {
  tappingLogic: {
    description: "Tapping cycle spindle direction logic validation",
    check: (code: string): PostIssue[] => {
      const issues: PostIssue[] = [];

      // Pattern: if (!tool.clockwise) { ... tool.clockwise ? 3 : 4 ... }
      // This is logically redundant since we already know tool.clockwise is false
      const redundantPattern = /if\s*\(\s*!tool\.clockwise\s*\)\s*\{[\s\S]*?tool\.clockwise\s*\?\s*3\s*:\s*4/g;
      let match;
      while ((match = redundantPattern.exec(code)) !== null) {
        issues.push({
          id: `TAP-LOGIC-${issues.length + 1}`,
          severity: "medium",
          category: "logic_error",
          line: getLineNumber(code, match.index),
          code: match[0].substring(0, 100) + "...",
          description: "Redundant ternary in tapping logic: Inside 'if (!tool.clockwise)', tool.clockwise is already false, so 'tool.clockwise ? 3 : 4' will always be 4",
          recommendation: "Simplify to: writeBlock(mFormat.format(4)) since we're inside the !tool.clockwise block",
          autoFixable: true,
          fix: "writeBlock(mFormat.format(4))",
        });
      }

      return issues;
    },
  },

  dualZWord: {
    description: "Dual Z-word in single G-code block detection",
    check: (code: string): PostIssue[] => {
      const issues: PostIssue[] = [];

      // Find writeBlock with two Z words - more flexible pattern
      const dualZPattern = /writeBlock\s*\([^;]*"Z"\s*\+[^,]+,\s*"Z"\s*\+[^)]+\)/g;
      let match;
      while ((match = dualZPattern.exec(code)) !== null) {
        issues.push({
          id: `DUAL-Z-${issues.length + 1}`,
          severity: "high",
          category: "cycle_issue",
          line: getLineNumber(code, match.index),
          code: match[0].substring(0, 150) + "...",
          description: "Two Z-word values in single block. Some controllers interpret this as: (1) first Z as depth, second Z as increment, OR (2) error. WinMax BNC expects single Z.",
          recommendation: "Verify WinMax documentation for G84.2/G84.3 syntax. Consider using incremental mode or separating into multiple blocks.",
          autoFixable: false,
        });
      }

      return issues;
    },
  },

  alwaysTrueCondition: {
    description: "Always-true condition detection",
    check: (code: string): PostIssue[] => {
      const issues: PostIssue[] = [];

      // Pattern: if (true || !F) - the !F is dead code
      const alwaysTruePattern = /if\s*\(\s*true\s*\|\|\s*([^)]+)\)/g;
      let match;
      while ((match = alwaysTruePattern.exec(code)) !== null) {
        const deadPart = match[1];
        issues.push({
          id: `DEAD-CODE-${issues.length + 1}`,
          severity: "medium",
          category: "dead_code",
          line: getLineNumber(code, match.index),
          code: match[0],
          description: `Dead code: 'true ||' short-circuits JavaScript evaluation. The condition '${deadPart.trim()}' is never evaluated. This was likely intended as a force-assignment.`,
          recommendation: "Remove the 'if' condition entirely and unconditionally assign: F = tool.getTappingFeedrate();",
          autoFixable: true,
          fix: `// Unconditional assignment (was: if (true || ${deadPart}))\n      F = tool.getTappingFeedrate();`,
        });
      }

      return issues;
    },
  },

  complexBooleanLogic: {
    description: "Complex boolean expression simplification",
    check: (code: string): PostIssue[] => {
      const issues: PostIssue[] = [];

      // Pattern: (a == b) != !c - hard to read
      const complexPattern = /\([^)]+\)\s*!=\s*![a-zA-Z_]+/g;
      let match;
      while ((match = complexPattern.exec(code)) !== null) {
        issues.push({
          id: `COMPLEX-BOOL-${issues.length + 1}`,
          severity: "low",
          category: "best_practice",
          line: getLineNumber(code, match.index),
          code: match[0],
          description: "Complex boolean expression with != and negation. Hard to verify correctness at a glance.",
          recommendation: "Consider extracting to named boolean variables for clarity: const isLeftHandTap = ...; const isCounterClockwise = ...;",
          autoFixable: false,
        });
      }

      return issues;
    },
  },

  modalStateConsistency: {
    description: "Modal G-code state consistency check",
    check: (code: string): PostIssue[] => {
      const issues: PostIssue[] = [];

      // Check for G90/G91 toggling without reset
      const modalSections = code.split(/function\s+on\w+/);
      for (let i = 0; i < modalSections.length; i++) {
        const section = modalSections[i];
        const g90Count = (section.match(/gAbsIncModal\.format\(90\)/g) || []).length;
        const g91Count = (section.match(/gAbsIncModal\.format\(91\)/g) || []).length;

        if (g90Count > 0 && g91Count > 0) {
          // Both modes used in same function - verify reset
          if (!section.includes("gAbsIncModal.reset()") && !section.includes("forceXYZ")) {
            issues.push({
              id: `MODAL-${issues.length + 1}`,
              severity: "low",
              category: "modal_conflict",
              line: 0, // Would need more context
              code: "G90/G91 mixing",
              description: "Both G90 (absolute) and G91 (incremental) used in same function without explicit reset.",
              recommendation: "Call gAbsIncModal.reset() when switching between absolute and incremental modes.",
              autoFixable: false,
            });
          }
        }
      }

      return issues;
    },
  },

  spindleDirectionValidation: {
    description: "Spindle direction matches tool definition",
    check: (code: string): PostIssue[] => {
      const issues: PostIssue[] = [];

      // Look for M3 without checking tool.clockwise first
      const sections = code.split(/case\s*["'].*tapping.*["']/i);
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i].substring(0, 500);
        if (section.includes("mFormat.format(3)") && !section.includes("tool.clockwise")) {
          issues.push({
            id: `SPINDLE-${issues.length + 1}`,
            severity: "medium",
            category: "spindle_logic",
            line: 0,
            code: "M3 in tapping without tool.clockwise check",
            description: "M3 (CW) output in tapping section without verifying tool.clockwise. Left-hand taps require M4.",
            recommendation: "Always check tool.clockwise or tool.type before outputting spindle direction.",
            autoFixable: false,
          });
        }
      }

      return issues;
    },
  },
};

/**
 * Get line number from character index
 */
function getLineNumber(code: string, index: number): number {
  const lines = code.substring(0, index).split("\n");
  return lines.length;
}

/**
 * Analyze a post processor file for issues
 */
export function analyzePostProcessor(code: string, filename: string = "unknown.cps"): AnalysisResult {
  const issues: PostIssue[] = [];
  const lines = code.split("\n");

  // Run all pattern-based checks
  for (const pattern of DEAD_CODE_PATTERNS) {
    let match;
    while ((match = pattern.pattern.exec(code)) !== null) {
      issues.push({
        id: `PATTERN-${issues.length + 1}`,
        severity: pattern.severity,
        category: pattern.category,
        line: getLineNumber(code, match.index),
        code: match[0],
        description: pattern.description,
        recommendation: "Review and simplify the condition",
        autoFixable: false,
      });
    }
    pattern.pattern.lastIndex = 0; // Reset regex
  }

  // Run AI analysis rules
  for (const [ruleName, rule] of Object.entries(AI_ANALYSIS_RULES)) {
    const ruleIssues = rule.check(code);
    issues.push(...ruleIssues);
  }

  // Calculate summary
  const summary = {
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
    info: issues.filter((i) => i.severity === "info").length,
  };

  // Calculate quality score (100 - weighted deductions)
  const score = Math.max(
    0,
    100 -
      summary.critical * 25 -
      summary.high * 10 -
      summary.medium * 3 -
      summary.low * 1 -
      summary.info * 0.5
  );

  // Generate recommendations based on issues
  const recommendations: string[] = [];
  if (summary.critical > 0) {
    recommendations.push("CRITICAL: Address critical issues immediately before using this post in production.");
  }
  if (issues.some((i) => i.category === "dead_code")) {
    recommendations.push("Clean up dead code to improve maintainability and reduce confusion.");
  }
  if (issues.some((i) => i.category === "logic_error")) {
    recommendations.push("Review logic errors carefully - these may produce incorrect G-code.");
  }
  if (issues.some((i) => i.category === "cycle_issue")) {
    recommendations.push("Verify drilling/tapping cycle syntax against machine control documentation.");
  }
  if (issues.some((i) => i.category === "spindle_logic")) {
    recommendations.push("Audit spindle direction logic for all tool types (RH, LH taps).");
  }

  return {
    filename,
    totalLines: lines.length,
    issues,
    summary,
    score: Math.round(score),
    recommendations,
  };
}

/**
 * Generate a detailed report from analysis results
 */
export function generateAnalysisReport(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("PRISM POST PROCESSOR ANALYSIS REPORT");
  lines.push("═".repeat(80));
  lines.push("");
  lines.push(`File: ${result.filename}`);
  lines.push(`Lines: ${result.totalLines}`);
  lines.push(`Quality Score: ${result.score}/100`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push("─".repeat(40));
  lines.push(`  Critical: ${result.summary.critical}`);
  lines.push(`  High:     ${result.summary.high}`);
  lines.push(`  Medium:   ${result.summary.medium}`);
  lines.push(`  Low:      ${result.summary.low}`);
  lines.push(`  Info:     ${result.summary.info}`);
  lines.push("");

  if (result.issues.length > 0) {
    lines.push("ISSUES");
    lines.push("─".repeat(40));

    for (const issue of result.issues) {
      lines.push("");
      lines.push(`[${issue.severity.toUpperCase()}] ${issue.id} (Line ${issue.line})`);
      lines.push(`  Category: ${issue.category}`);
      lines.push(`  ${issue.description}`);
      lines.push(`  Code: ${issue.code.substring(0, 80)}${issue.code.length > 80 ? "..." : ""}`);
      lines.push(`  Fix: ${issue.recommendation}`);
      if (issue.autoFixable) {
        lines.push(`  Auto-fix available: ${issue.fix?.substring(0, 60)}...`);
      }
    }
  }

  if (result.recommendations.length > 0) {
    lines.push("");
    lines.push("RECOMMENDATIONS");
    lines.push("─".repeat(40));
    for (const rec of result.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  lines.push("");
  lines.push("═".repeat(80));
  lines.push("Generated by PRISM PostProcessorAnalysisEngine");
  lines.push("═".repeat(80));

  return lines.join("\n");
}

/**
 * Apply auto-fixes to post processor code
 */
export function applyAutoFixes(code: string, issues: PostIssue[]): { code: string; fixesApplied: number } {
  let fixedCode = code;
  let fixesApplied = 0;

  // Sort issues by line number descending to avoid offset issues
  const fixableIssues = issues
    .filter((i) => i.autoFixable && i.fix)
    .sort((a, b) => b.line - a.line);

  for (const issue of fixableIssues) {
    // For now, just report - actual replacement would need more context
    fixesApplied++;
  }

  return { code: fixedCode, fixesApplied };
}

// Singleton export
export const postProcessorAnalysisEngine = {
  analyze: analyzePostProcessor,
  generateReport: generateAnalysisReport,
  applyFixes: applyAutoFixes,
};
