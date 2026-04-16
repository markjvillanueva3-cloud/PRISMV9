/**
 * DiffTokenEstimatorEngine — Estimates token cost of code changes
 *
 * Analyzes git diffs to estimate how many tokens they'll consume
 * when reviewed in context. Helps decide whether to inline a diff
 * or summarize it to save context budget.
 *
 * Token savings: Prevents large diffs from being blindly inlined.
 *
 * @version 1.0.0
 */

import { execSync } from "child_process";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const REPO_ROOT = join(import.meta.dirname, "../..");
const CHARS_PER_TOKEN = 4;

export interface DiffEstimate {
  totalTokens: number;
  totalChars: number;
  additions: number;
  deletions: number;
  filesChanged: number;
  perFile: Array<{ file: string; tokens: number; additions: number; deletions: number }>;
  recommendation: "inline" | "summarize" | "skip";
  reason: string;
}

export class DiffTokenEstimatorEngine {

  /**
   * Estimate token cost of current uncommitted changes.
   */
  estimateUncommitted(): DiffEstimate {
    try {
      const diff = execSync("git diff", {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: 10000,
      });
      return this.analyzeDiff(diff);
    } catch (e: any) {
      return this.emptyEstimate(`Error: ${e.message}`);
    }
  }

  /**
   * Estimate token cost of staged changes.
   */
  estimateStaged(): DiffEstimate {
    try {
      const diff = execSync("git diff --cached", {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: 10000,
      });
      return this.analyzeDiff(diff);
    } catch (e: any) {
      return this.emptyEstimate(`Error: ${e.message}`);
    }
  }

  /**
   * Estimate token cost of changes between two refs.
   */
  estimateBetween(from: string, to = "HEAD"): DiffEstimate {
    try {
      const diff = execSync(`git diff ${from}..${to}`, {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: 10000,
      });
      return this.analyzeDiff(diff);
    } catch (e: any) {
      return this.emptyEstimate(`Error: ${e.message}`);
    }
  }

  /**
   * Estimate token cost of the last N commits.
   */
  estimateLastCommits(n = 1): DiffEstimate {
    return this.estimateBetween(`HEAD~${n}`, "HEAD");
  }

  /**
   * Get a compact summary string suitable for context injection.
   */
  getCompactSummary(estimate: DiffEstimate): string {
    return `${estimate.filesChanged} files, +${estimate.additions}/-${estimate.deletions}, ~${estimate.totalTokens} tokens → ${estimate.recommendation}`;
  }

  // ── Private ──────────────────────────────────────────────────

  private analyzeDiff(diff: string): DiffEstimate {
    if (!diff.trim()) {
      return this.emptyEstimate("No changes");
    }

    const totalChars = diff.length;
    const totalTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
    const lines = diff.split("\n");

    let additions = 0;
    let deletions = 0;
    const fileMap = new Map<string, { additions: number; deletions: number; chars: number }>();
    let currentFile = "";

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/b\/(.+)$/);
        currentFile = match ? match[1] : "unknown";
        if (!fileMap.has(currentFile)) {
          fileMap.set(currentFile, { additions: 0, deletions: 0, chars: 0 });
        }
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
        const entry = fileMap.get(currentFile);
        if (entry) {
          entry.additions++;
          entry.chars += line.length;
        }
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
        const entry = fileMap.get(currentFile);
        if (entry) {
          entry.deletions++;
          entry.chars += line.length;
        }
      }
    }

    const perFile = Array.from(fileMap.entries())
      .map(([file, data]) => ({
        file,
        tokens: Math.ceil(data.chars / CHARS_PER_TOKEN),
        additions: data.additions,
        deletions: data.deletions,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    const recommendation = this.getRecommendation(totalTokens, perFile.length);

    return {
      totalTokens,
      totalChars,
      additions,
      deletions,
      filesChanged: fileMap.size,
      perFile,
      recommendation: recommendation.action,
      reason: recommendation.reason,
    };
  }

  private getRecommendation(tokens: number, files: number): { action: "inline" | "summarize" | "skip"; reason: string } {
    if (tokens < 200) {
      return { action: "inline", reason: "Small diff, safe to inline" };
    }
    if (tokens < 1000) {
      return { action: "inline", reason: "Medium diff, can inline with context" };
    }
    if (tokens < 3000) {
      return { action: "summarize", reason: "Large diff, summarize to save tokens" };
    }
    return { action: "skip", reason: `Very large diff (~${tokens} tokens), use git diff externally` };
  }

  private emptyEstimate(reason: string): DiffEstimate {
    return {
      totalTokens: 0,
      totalChars: 0,
      additions: 0,
      deletions: 0,
      filesChanged: 0,
      perFile: [],
      recommendation: "skip",
      reason,
    };
  }
}

export const diffTokenEstimatorEngine = new DiffTokenEstimatorEngine();
