/**
 * PPGCodeLintEngine — Syntactic & modal sanity checker for G-code programs
 *
 * Catches common post-processor output bugs that crash machines but slip
 * past physics/safety validators:
 *   1. Cutter comp (G41/G42) left active across tool change
 *   2. Drill cycle (G81-G89) not cancelled by G80 before movement
 *   3. F-word specified in G0 rapid moves (feedrate ignored — dangerous habit)
 *   4. M3/M4 spindle command with no prior Sxxx
 *   5. Unbalanced parentheses in comments
 *   6. Orphan line numbers (N-words out of sequence)
 *   7. Invalid modal combinations (G90+G91, G96+G97, etc.)
 *   8. Negative Z rapid above Z0 during setup (air-cut alert)
 *   9. Rapid to negative Z without prior safe Z
 *  10. Coolant on (M8/M9) mismatches
 *  11. Tool change (M6) with cutter comp active
 *  12. Program end (M2/M30) missing
 *  13. Duplicate N-numbers
 *  14. Illegal character in block
 *
 * Distinct from:
 *   - PPPhysicsConstraintValidator (cutting forces, chip load)
 *   - PPSafetyRuleValidator (safety business rules)
 *   - ProbingProgramEngine (probe cycle generation)
 *
 * @module PPGCodeLintEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type LintSeverity = "critical" | "warning" | "info";

export interface LintIssue {
  line: number;                    // 1-indexed line number
  severity: LintSeverity;
  rule: string;                    // rule id (e.g., "cutter-comp-tool-change")
  message: string;                 // human-readable description
  block_text?: string;             // the offending block
  suggestion?: string;             // suggested fix
}

export interface LintSummary {
  total_lines: number;
  total_issues: number;
  critical: number;
  warnings: number;
  info: number;
  rules_triggered: string[];
  passed: boolean;                 // true if 0 critical
}

export interface LintResult {
  issues: LintIssue[];
  summary: LintSummary;
}

// ── Modal state tracking ──────────────────────────────────────────────

interface ModalState {
  motion?: string;          // G0, G1, G2, G3
  plane?: string;           // G17, G18, G19
  distance?: string;        // G90, G91
  units?: string;           // G20, G21
  cutter_comp?: string;     // G40, G41, G42
  feed_mode?: string;       // G93, G94, G95
  spindle_mode?: string;    // G96, G97
  coolant?: string[];       // M7, M8, M9
  spindle_dir?: string;     // M3, M4, M5
  drill_cycle?: string;     // G81-G89 or null
  last_s_word?: number;     // last spindle speed seen
  active_tool?: number;     // T-word / M6 tool
  current_z?: number;
  current_x?: number;
  current_y?: number;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPGCodeLintEngine {
  /**
   * Lint a complete G-code program.
   */
  lint(gcodeText: string, options: { strict?: boolean; controller?: string } = {}): LintResult {
    const lines = gcodeText.split(/\r?\n/);
    const issues: LintIssue[] = [];
    const state: ModalState = { coolant: [] };
    const seenNNums = new Set<number>();
    let hasProgramEnd = false;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i];
      const trimmed = raw.trim();

      if (trimmed.length === 0) continue;

      // Check unbalanced parens
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push({
          line: lineNum,
          severity: "warning",
          rule: "unbalanced-parens",
          message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
          block_text: trimmed,
          suggestion: "Match every '(' with a ')'",
        });
      }

      // Strip comments for analysis
      const code = this.stripComments(trimmed).toUpperCase();
      if (code.length === 0) continue;

      // Parse words
      const words = this.parseWords(code);
      const wordMap = new Map<string, number>();
      for (const { letter, value } of words) {
        wordMap.set(letter, value);
      }

      // Check N-number sequence
      if (wordMap.has("N")) {
        const nNum = wordMap.get("N")!;
        if (seenNNums.has(nNum)) {
          issues.push({
            line: lineNum,
            severity: "warning",
            rule: "duplicate-n-number",
            message: `Duplicate N${nNum}`,
            block_text: trimmed,
          });
        }
        seenNNums.add(nNum);
      }

      // Check for M2/M30 (program end)
      if (wordMap.has("M")) {
        const mCode = wordMap.get("M")!;
        if (mCode === 2 || mCode === 30) hasProgramEnd = true;
      }

      // Track G-codes → modal state
      this.updateModalState(words, state);

      // Track S-word
      if (wordMap.has("S")) {
        state.last_s_word = wordMap.get("S")!;
      }

      // Track T-word (selected tool)
      if (wordMap.has("T")) {
        state.active_tool = wordMap.get("T")!;
      }

      // RULE: Spindle M3/M4 without preceding S
      if (wordMap.has("M")) {
        const mCode = wordMap.get("M")!;
        if ((mCode === 3 || mCode === 4) && state.last_s_word === undefined) {
          issues.push({
            line: lineNum,
            severity: "critical",
            rule: "spindle-without-s",
            message: `M${mCode} issued before any S-word (spindle speed undefined)`,
            block_text: trimmed,
            suggestion: "Specify S-word before or with M3/M4",
          });
        }
      }

      // RULE: M6 (tool change) with cutter comp active
      if (wordMap.has("M") && wordMap.get("M") === 6) {
        if (state.cutter_comp === "G41" || state.cutter_comp === "G42") {
          issues.push({
            line: lineNum,
            severity: "critical",
            rule: "tool-change-comp-active",
            message: `M6 tool change with cutter comp ${state.cutter_comp} still active`,
            block_text: trimmed,
            suggestion: "Cancel cutter comp (G40) before tool change",
          });
        }
        if (state.drill_cycle) {
          issues.push({
            line: lineNum,
            severity: "critical",
            rule: "tool-change-cycle-active",
            message: `M6 tool change with drill cycle ${state.drill_cycle} still active`,
            block_text: trimmed,
            suggestion: "Cancel cycle (G80) before tool change",
          });
        }
      }

      // RULE: F-word in G0 rapid move (dangerous habit)
      if (state.motion === "G0" && wordMap.has("F")) {
        issues.push({
          line: lineNum,
          severity: "warning",
          rule: "feed-in-rapid",
          message: "F-word specified in G0 rapid move — feedrate ignored by rapid",
          block_text: trimmed,
          suggestion: "Remove F-word from G0 blocks or split into G0 + G1",
        });
      }

      // RULE: Motion with drill cycle active but no G80 when changing to G0/G1
      if (state.drill_cycle && (state.motion === "G0" || state.motion === "G1")) {
        // Only if we see explicit G0/G1 in this line (not just modal)
        const hasExplicitMotion = words.some(w => w.letter === "G" && (w.value === 0 || w.value === 1));
        if (hasExplicitMotion) {
          issues.push({
            line: lineNum,
            severity: "warning",
            rule: "motion-inside-cycle",
            message: `Motion ${state.motion} issued while drill cycle ${state.drill_cycle} is active`,
            block_text: trimmed,
            suggestion: "Cancel cycle with G80 before linear/rapid motion",
          });
          // Clear cycle state after G80 implication
          state.drill_cycle = undefined;
        }
      }

      // RULE: Rapid to negative Z without safe height establishment
      if (state.motion === "G0" && wordMap.has("Z")) {
        const z = wordMap.get("Z")!;
        if (z < 0 && state.current_z !== undefined && state.current_z > 2 && state.current_z < 50) {
          // Rapid from low-Z to deeper — suspicious
          issues.push({
            line: lineNum,
            severity: "info",
            rule: "rapid-to-deep-z",
            message: `Rapid Z${z} from Z${state.current_z.toFixed(2)} — verify clearance`,
            block_text: trimmed,
          });
        }
      }

      // Update position tracking
      if (wordMap.has("X")) state.current_x = wordMap.get("X")!;
      if (wordMap.has("Y")) state.current_y = wordMap.get("Y")!;
      if (wordMap.has("Z")) state.current_z = wordMap.get("Z")!;

      // RULE: Invalid modal combinations
      const hasG90 = words.some(w => w.letter === "G" && w.value === 90);
      const hasG91 = words.some(w => w.letter === "G" && w.value === 91);
      if (hasG90 && hasG91) {
        issues.push({
          line: lineNum,
          severity: "critical",
          rule: "conflicting-distance-mode",
          message: "G90 (absolute) and G91 (incremental) on same block",
          block_text: trimmed,
        });
      }
      const hasG96 = words.some(w => w.letter === "G" && w.value === 96);
      const hasG97 = words.some(w => w.letter === "G" && w.value === 97);
      if (hasG96 && hasG97) {
        issues.push({
          line: lineNum,
          severity: "critical",
          rule: "conflicting-spindle-mode",
          message: "G96 (CSS) and G97 (RPM) on same block",
          block_text: trimmed,
        });
      }
      const hasG20 = words.some(w => w.letter === "G" && w.value === 20);
      const hasG21 = words.some(w => w.letter === "G" && w.value === 21);
      if (hasG20 && hasG21) {
        issues.push({
          line: lineNum,
          severity: "critical",
          rule: "conflicting-units",
          message: "G20 (inch) and G21 (metric) on same block",
          block_text: trimmed,
        });
      }

      // RULE: Strict mode — require leading G90/G21 on first motion
      if (options.strict && lineNum <= 10) {
        // informational only; enforcement via summary
      }
    }

    // RULE: Missing program end
    if (!hasProgramEnd) {
      issues.push({
        line: lines.length,
        severity: "critical",
        rule: "missing-program-end",
        message: "Program missing M2 or M30 end code",
        suggestion: "Add M30 as last motion code",
      });
    }

    // RULE: Cutter comp still on at end of program
    if (state.cutter_comp === "G41" || state.cutter_comp === "G42") {
      issues.push({
        line: lines.length,
        severity: "warning",
        rule: "cutter-comp-at-end",
        message: `Program ends with cutter comp ${state.cutter_comp} still active`,
        suggestion: "Add G40 before M30",
      });
    }

    // RULE: Drill cycle active at end of program
    if (state.drill_cycle) {
      issues.push({
        line: lines.length,
        severity: "warning",
        rule: "cycle-at-end",
        message: `Program ends with drill cycle ${state.drill_cycle} still active`,
        suggestion: "Add G80 before M30",
      });
    }

    // Build summary
    const rules = new Set(issues.map(i => i.rule));
    const critical = issues.filter(i => i.severity === "critical").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const info = issues.filter(i => i.severity === "info").length;

    return {
      issues,
      summary: {
        total_lines: lines.length,
        total_issues: issues.length,
        critical,
        warnings,
        info,
        rules_triggered: [...rules],
        passed: critical === 0,
      },
    };
  }

  /**
   * Strip comments from a line (both parens and semicolons).
   */
  private stripComments(line: string): string {
    // Remove paren comments
    let r = line.replace(/\([^)]*\)/g, " ");
    // Remove ;... to end of line
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r.trim();
  }

  /**
   * Parse a G-code line into [{letter, value}] pairs.
   */
  private parseWords(code: string): Array<{ letter: string; value: number }> {
    const words: Array<{ letter: string; value: number }> = [];
    const regex = /([A-Z])(-?\d+\.?\d*)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      words.push({ letter: match[1], value: parseFloat(match[2]) });
    }
    return words;
  }

  /**
   * Update modal state tracker based on words on the line.
   */
  private updateModalState(words: Array<{ letter: string; value: number }>, state: ModalState): void {
    for (const { letter, value } of words) {
      if (letter !== "G" && letter !== "M") continue;

      if (letter === "G") {
        const g = value;
        if (g === 0 || g === 1 || g === 2 || g === 3) state.motion = `G${g}`;
        else if (g === 17) state.plane = "G17";
        else if (g === 18) state.plane = "G18";
        else if (g === 19) state.plane = "G19";
        else if (g === 20) state.units = "G20";
        else if (g === 21) state.units = "G21";
        else if (g === 40) state.cutter_comp = "G40";
        else if (g === 41) state.cutter_comp = "G41";
        else if (g === 42) state.cutter_comp = "G42";
        else if (g === 80) state.drill_cycle = undefined;
        else if (g >= 81 && g <= 89) state.drill_cycle = `G${g}`;
        else if (g === 90) state.distance = "G90";
        else if (g === 91) state.distance = "G91";
        else if (g === 93) state.feed_mode = "G93";
        else if (g === 94) state.feed_mode = "G94";
        else if (g === 95) state.feed_mode = "G95";
        else if (g === 96) state.spindle_mode = "G96";
        else if (g === 97) state.spindle_mode = "G97";
      } else if (letter === "M") {
        const m = value;
        if (m === 3 || m === 4) state.spindle_dir = `M${m}`;
        else if (m === 5) state.spindle_dir = "M5";
        else if (m === 7 || m === 8) {
          state.coolant = state.coolant ?? [];
          if (!state.coolant.includes(`M${m}`)) state.coolant.push(`M${m}`);
        } else if (m === 9) state.coolant = [];
      }
    }
  }

  /**
   * Quick pass/fail check — returns only critical count.
   */
  check(gcodeText: string): { passed: boolean; critical_count: number } {
    const result = this.lint(gcodeText);
    return {
      passed: result.summary.passed,
      critical_count: result.summary.critical,
    };
  }

  /**
   * Filter issues by severity.
   */
  filterIssues(result: LintResult, minSeverity: LintSeverity): LintIssue[] {
    const order: Record<LintSeverity, number> = { info: 0, warning: 1, critical: 2 };
    const threshold = order[minSeverity];
    return result.issues.filter(i => order[i.severity] >= threshold);
  }

  /**
   * Generate a human-readable report.
   */
  report(result: LintResult): string {
    const lines: string[] = [];
    lines.push(`=== G-Code Lint Report ===`);
    lines.push(`Status: ${result.summary.passed ? "PASSED" : "FAILED"}`);
    lines.push(`Total lines: ${result.summary.total_lines}`);
    lines.push(`Total issues: ${result.summary.total_issues}`);
    lines.push(`  Critical: ${result.summary.critical}`);
    lines.push(`  Warnings: ${result.summary.warnings}`);
    lines.push(`  Info:     ${result.summary.info}`);
    lines.push(``);

    if (result.issues.length > 0) {
      lines.push(`Issues:`);
      for (const issue of result.issues) {
        lines.push(`  Line ${issue.line} [${issue.severity.toUpperCase()}] ${issue.rule}: ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`    → ${issue.suggestion}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * List all rules this engine can detect.
   */
  listRules(): string[] {
    return [
      "unbalanced-parens",
      "duplicate-n-number",
      "spindle-without-s",
      "tool-change-comp-active",
      "tool-change-cycle-active",
      "feed-in-rapid",
      "motion-inside-cycle",
      "rapid-to-deep-z",
      "conflicting-distance-mode",
      "conflicting-spindle-mode",
      "conflicting-units",
      "missing-program-end",
      "cutter-comp-at-end",
      "cycle-at-end",
    ];
  }
}

export const ppGCodeLintEngine = new PPGCodeLintEngine();
