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

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const REPO_ROOT = join(import.meta.dirname, "../..");
const CHARS_PER_TOKEN = 4;
// execSync defaults to a 1MB stdout buffer; a large working tree's full `git diff`
// easily exceeds that (PRISM's dirty tree measured ~108MB / ~3.9K files), which threw
// ENOBUFS and silently returned a "0 files / skip" estimate. Cap the full-content read
// at 64MB; anything larger falls back to the cheap, bounded `--numstat` path below.
const MAX_DIFF_BUFFER = 64 * 1024 * 1024;
// git diff timeout (ms). Generous so a large tree's diff completes; on timeout the
// catch falls back to the cheap --numstat path rather than masking the failure.
const DIFF_TIMEOUT_MS = 15000;
// execFileSync does NOT use a shell, so a bare "git" is not resolved via PATH/PATHEXT
// on Windows (throws ENOENT). Resolve an absolute git binary the same way the repo's
// git-log-tail primitive does: PRISM_GIT_BIN env → Git-for-Windows default → "git" (POSIX).
const GIT_BIN = (() => {
  if (process.env.PRISM_GIT_BIN && existsSync(process.env.PRISM_GIT_BIN)) return process.env.PRISM_GIT_BIN;
  const winDefault = "C:/Program Files/Git/mingw64/bin/git.exe";
  if (existsSync(winDefault)) return winDefault;
  return "git";
})();
// Average chars per changed line, used only to estimate tokens from `--numstat`
// (which reports added/deleted line counts without content). Approximate by design.
const EST_CHARS_PER_LINE = 40;

/**
 * Parse `git diff --numstat` output into per-file add/delete counts and an
 * approximate token estimate. Pure (no I/O) so it is deterministically testable.
 * numstat lines are `<added>\t<deleted>\t<path>`; binary files report `-\t-\t<path>`.
 */
export function parseNumstatOutput(out: string): {
  perFile: Array<{ file: string; tokens: number; additions: number; deletions: number }>;
  additions: number;
  deletions: number;
  totalTokens: number;
} {
  const perFile: Array<{ file: string; tokens: number; additions: number; deletions: number }> = [];
  let additions = 0;
  let deletions = 0;
  for (const line of out.split("\n")) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m) continue;
    const add = m[1] === "-" ? 0 : parseInt(m[1], 10);
    const del = m[2] === "-" ? 0 : parseInt(m[2], 10);
    additions += add;
    deletions += del;
    perFile.push({
      file: m[3],
      tokens: Math.ceil(((add + del) * EST_CHARS_PER_LINE) / CHARS_PER_TOKEN),
      additions: add,
      deletions: del,
    });
  }
  perFile.sort((a, b) => b.tokens - a.tokens);
  const totalTokens = perFile.reduce((s, f) => s + f.tokens, 0);
  return { perFile, additions, deletions, totalTokens };
}

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
    return this.runScopedDiff([]);
  }

  /**
   * Estimate token cost of staged changes.
   */
  estimateStaged(): DiffEstimate {
    return this.runScopedDiff(["--cached"]);
  }

  /**
   * Estimate token cost of changes between two refs.
   */
  estimateBetween(from: string, to = "HEAD"): DiffEstimate {
    return this.runScopedDiff([`${from}..${to}`]);
  }

  /**
   * Run `git diff <scopeArgs>` and analyze it, falling back to `--numstat` when the
   * full-content diff fails (most often it exceeds maxBuffer on a large working tree,
   * but also on git errors / timeouts). The fallback reports HONEST file counts + a
   * token estimate instead of masquerading as "0 files / skip" (R12). Uses execFileSync
   * (no shell) so the ref args cannot be shell-injected.
   */
  private runScopedDiff(scopeArgs: string[]): DiffEstimate {
    try {
      const diff = execFileSync(GIT_BIN, ["diff", ...scopeArgs], {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: DIFF_TIMEOUT_MS, maxBuffer: MAX_DIFF_BUFFER,
      });
      return this.analyzeDiff(diff);
    } catch (e: unknown) {
      const fallback = this.estimateFromNumstat(scopeArgs);
      if (fallback) return fallback;
      const message = e instanceof Error ? e.message : String(e);
      return this.emptyEstimate(`Error: ${message}`);
    }
  }

  /**
   * Cheap, bounded fallback: `git diff --numstat <scopeArgs>` emits one line per file
   * (no content), so it never overflows the buffer. Returns null when numstat also
   * fails or reports no files (so the caller surfaces the original error honestly).
   */
  private estimateFromNumstat(scopeArgs: string[]): DiffEstimate | null {
    try {
      const out = execFileSync(GIT_BIN, ["diff", "--numstat", ...scopeArgs], {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: DIFF_TIMEOUT_MS, maxBuffer: MAX_DIFF_BUFFER,
      });
      const { perFile, additions, deletions, totalTokens } = parseNumstatOutput(out);
      if (perFile.length === 0) return null;
      return {
        totalTokens,
        totalChars: totalTokens * CHARS_PER_TOKEN,
        additions,
        deletions,
        filesChanged: perFile.length,
        perFile,
        recommendation: "skip",
        reason: `Diff too large for full inline (${perFile.length} files, ~${totalTokens} tokens est. from numstat); review with git directly`,
      };
    } catch (e: unknown) {
      // Surface the fallback failure instead of swallowing it (R12). Without this, a
      // broken fallback silently reverts to the "0 files / skip" lie this fix repairs.
      // The caller then returns emptyEstimate carrying the original full-diff error.
      log.warn("DiffTokenEstimator numstat fallback failed", { error: e instanceof Error ? e.message : String(e) });
      return null;
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
