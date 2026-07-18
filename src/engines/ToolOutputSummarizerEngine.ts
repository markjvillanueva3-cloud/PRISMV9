/**
 * ToolOutputSummarizerEngine — Summarizes verbose tool outputs
 *
 * Takes raw tool output and produces compact summaries for common
 * patterns: test results, build output, file listings, git status.
 *
 * Token savings: 50-90% reduction on verbose tool outputs.
 *
 * @version 1.0.0
 */

export type OutputType = "test-results" | "build-output" | "file-list" | "git-status" | "git-log" | "search-results" | "unknown";

export interface SummaryResult {
  type: OutputType;
  summary: string;
  originalLines: number;
  summaryLines: number;
  savings: number; // estimated tokens saved
}

export class ToolOutputSummarizerEngine {

  /**
   * Detect output type and summarize accordingly.
   */
  summarize(output: string, maxLines = 10): SummaryResult {
    const type = this.detect(output);
    const lines = output.split("\n");
    let summary: string;

    switch (type) {
      case "test-results":
        summary = this.summarizeTests(output);
        break;
      case "build-output":
        summary = this.summarizeBuild(output);
        break;
      case "file-list":
        summary = this.summarizeFileList(lines, maxLines);
        break;
      case "git-status":
        summary = this.summarizeGitStatus(output);
        break;
      case "git-log":
        summary = this.summarizeGitLog(lines, maxLines);
        break;
      case "search-results":
        summary = this.summarizeSearch(lines, maxLines);
        break;
      default:
        summary = this.summarizeGeneric(lines, maxLines);
    }

    const originalTokens = Math.ceil(output.length / 4);
    const summaryTokens = Math.ceil(summary.length / 4);

    return {
      type,
      summary,
      originalLines: lines.length,
      summaryLines: summary.split("\n").length,
      savings: originalTokens - summaryTokens,
    };
  }

  /**
   * Detect the type of tool output.
   */
  detect(output: string): OutputType {
    const lower = output.toLowerCase();

    if (lower.includes("test files") || lower.includes("tests passed") || lower.includes("✓") && lower.includes("✗")) {
      return "test-results";
    }
    if (lower.includes("error ts") || lower.includes("compiled") || lower.includes("build") && lower.includes("error")) {
      return "build-output";
    }
    if (output.match(/^(M |A |D |\?\? |[MADRCU]{1,2}\s)/m)) {
      return "git-status";
    }
    if (output.match(/^[a-f0-9]{7,40}\s/m)) {
      return "git-log";
    }
    if (output.match(/^\S+\.(ts|js|tsx|jsx|py|rs|go|md|json)\n/m) && output.split("\n").length > 5) {
      return "file-list";
    }
    if (output.match(/^\d+[:-]/m) || output.match(/^[^:]+:\d+:/m)) {
      return "search-results";
    }
    return "unknown";
  }

  private summarizeTests(output: string): string {
    const lines: string[] = [];

    // Extract summary line
    const summaryMatch = output.match(/Test Files\s+.*$/m);
    if (summaryMatch) lines.push(summaryMatch[0].replace(/\x1b\[[0-9;]*m/g, "").trim());

    const testsMatch = output.match(/Tests\s+.*$/m);
    if (testsMatch) lines.push(testsMatch[0].replace(/\x1b\[[0-9;]*m/g, "").trim());

    // Extract failures
    const failLines = output.split("\n").filter(l => l.includes("FAIL") || l.includes("✗") || l.includes("×"));
    if (failLines.length > 0) {
      lines.push(`Failures: ${failLines.length}`);
      for (const f of failLines.slice(0, 5)) {
        lines.push(`  ${f.replace(/\x1b\[[0-9;]*m/g, "").trim()}`);
      }
    }

    return lines.length > 0 ? lines.join("\n") : "Tests completed (no summary found)";
  }

  private summarizeBuild(output: string): string {
    const errors = output.split("\n").filter(l => l.includes("error TS") || l.toLowerCase().includes("error:"));
    const warnings = output.split("\n").filter(l => l.toLowerCase().includes("warning"));

    const lines = [`Build: ${errors.length} errors, ${warnings.length} warnings`];
    for (const e of errors.slice(0, 5)) {
      lines.push(`  ${e.replace(/\x1b\[[0-9;]*m/g, "").trim()}`);
    }
    if (errors.length > 5) lines.push(`  ... and ${errors.length - 5} more`);

    return lines.join("\n");
  }

  private summarizeFileList(lines: string[], maxLines: number): string {
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length <= maxLines) return nonEmpty.join("\n");
    return nonEmpty.slice(0, maxLines).join("\n") + `\n... ${nonEmpty.length - maxLines} more files (${nonEmpty.length} total)`;
  }

  private summarizeGitStatus(output: string): string {
    const lines = output.split("\n").filter(l => l.trim().length > 0);
    const modified = lines.filter(l => l.startsWith("M ") || l.startsWith(" M")).length;
    const added = lines.filter(l => l.startsWith("A ") || l.startsWith("??")).length;
    const deleted = lines.filter(l => l.startsWith("D ")).length;

    return `Git: ${modified} modified, ${added} added/untracked, ${deleted} deleted (${lines.length} files)`;
  }

  private summarizeGitLog(lines: string[], maxLines: number): string {
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length <= maxLines) return nonEmpty.join("\n");
    return nonEmpty.slice(0, maxLines).join("\n") + `\n... ${nonEmpty.length - maxLines} more commits`;
  }

  private summarizeSearch(lines: string[], maxLines: number): string {
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length <= maxLines) return nonEmpty.join("\n");
    return nonEmpty.slice(0, maxLines).join("\n") + `\n... ${nonEmpty.length - maxLines} more matches`;
  }

  private summarizeGeneric(lines: string[], maxLines: number): string {
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length <= maxLines) return nonEmpty.join("\n");

    const head = nonEmpty.slice(0, Math.ceil(maxLines / 2));
    const tail = nonEmpty.slice(-Math.floor(maxLines / 2));
    return head.join("\n") + `\n... ${nonEmpty.length - maxLines} lines omitted ...\n` + tail.join("\n");
  }

  /**
   * One-liner.
   */
  oneLiner(output: string): string {
    const r = this.summarize(output);
    return `[${r.type}] ${r.originalLines}→${r.summaryLines} lines (~${r.savings} tokens saved)`;
  }
}

export const toolOutputSummarizerEngine = new ToolOutputSummarizerEngine();
