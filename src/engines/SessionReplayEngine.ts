/**
 * SessionReplayEngine — Context reconstruction from git history
 *
 * When a session resumes after compaction or across sessions, this engine
 * reconstructs what was being worked on by analyzing recent git commits,
 * modified files, and test results. Provides a compact "where was I?"
 * summary without needing to read transcripts.
 *
 * Token savings: Replaces 2000+ token transcript reads with ~200 token summaries.
 *
 * @version 1.0.0
 */

import { execSync } from "child_process";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const REPO_ROOT = join(import.meta.dirname, "../..");

export interface ReplayContext {
  lastCommit: { hash: string; message: string; ago: string };
  recentCommits: Array<{ hash: string; message: string }>;
  modifiedFiles: string[];
  activeArea: string;
  summary: string;
  suggestedNextSteps: string[];
}

export interface WorkingSetInfo {
  staged: string[];
  modified: string[];
  untracked: string[];
  hasUncommittedWork: boolean;
}

export class SessionReplayEngine {

  /**
   * Get compact replay context for session resumption.
   */
  getReplayContext(maxCommits = 5): ReplayContext {
    try {
      const commits = this.getRecentCommits(maxCommits);
      const lastCommit = commits[0] || { hash: "none", message: "no commits", ago: "" };
      const modified = this.getModifiedFiles();
      const activeArea = this.detectActiveArea(commits, modified);
      const suggestions = this.suggestNextSteps(commits, modified);

      return {
        lastCommit: {
          hash: lastCommit.hash,
          message: lastCommit.message,
          ago: lastCommit.ago || "",
        },
        recentCommits: commits.slice(0, maxCommits).map(c => ({
          hash: c.hash,
          message: c.message,
        })),
        modifiedFiles: modified.slice(0, 10),
        activeArea,
        summary: this.buildSummary(lastCommit, modified, activeArea),
        suggestedNextSteps: suggestions,
      };
    } catch (e: any) {
      log.warn(`[SessionReplay] Failed: ${e.message}`);
      return {
        lastCommit: { hash: "error", message: e.message, ago: "" },
        recentCommits: [],
        modifiedFiles: [],
        activeArea: "unknown",
        summary: `Session replay failed: ${e.message}`,
        suggestedNextSteps: ["Check git status", "Run /boot for system state"],
      };
    }
  }

  /**
   * Get compact one-liner for session resume.
   */
  getResumeLine(): string {
    try {
      const ctx = this.getReplayContext(3);
      return ctx.summary;
    } catch {
      return "Could not determine session context";
    }
  }

  /**
   * Get current working set (uncommitted changes).
   */
  getWorkingSet(): WorkingSetInfo {
    try {
      const status = execSync("git status --porcelain", {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: 5000,
      }).trim();

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];

      for (const line of status.split("\n").filter(Boolean)) {
        const x = line[0];
        const y = line[1];
        const file = line.slice(3).trim();

        if (x === "?" && y === "?") untracked.push(file);
        else if (x !== " " && x !== "?") staged.push(file);
        else if (y !== " ") modified.push(file);
      }

      return {
        staged,
        modified,
        untracked,
        hasUncommittedWork: staged.length + modified.length > 0,
      };
    } catch (e: any) {
      return { staged: [], modified: [], untracked: [], hasUncommittedWork: false };
    }
  }

  /**
   * Get a focused diff summary for recently changed files.
   */
  getDiffSummary(): string {
    try {
      const stat = execSync("git diff --stat HEAD~3..HEAD", {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: 5000,
      }).trim();

      const lines = stat.split("\n");
      const summary = lines[lines.length - 1] || "no changes";
      return summary.trim();
    } catch {
      return "diff unavailable";
    }
  }

  // ── Private ──────────────────────────────────────────────────

  private getRecentCommits(n: number): Array<{
    hash: string; message: string; ago: string;
  }> {
    const raw = execSync(
      `git log --oneline --format="%h|%s|%ar" -${n}`,
      { cwd: REPO_ROOT, encoding: "utf-8", timeout: 5000 }
    ).trim();

    return raw.split("\n").filter(Boolean).map(line => {
      const [hash, message, ago] = line.split("|");
      return { hash, message, ago };
    });
  }

  private getModifiedFiles(): string[] {
    try {
      const raw = execSync("git diff --name-only HEAD~3..HEAD", {
        cwd: REPO_ROOT, encoding: "utf-8", timeout: 5000,
      }).trim();
      return raw.split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private detectActiveArea(
    commits: Array<{ message: string }>,
    files: string[]
  ): string {
    const areas = new Map<string, number>();

    // From commit messages
    for (const c of commits) {
      const scopeMatch = c.message.match(/\(([^)]+)\)/);
      if (scopeMatch) {
        const scope = scopeMatch[1];
        areas.set(scope, (areas.get(scope) || 0) + 2);
      }
    }

    // From file paths
    for (const f of files) {
      if (f.includes("engines/")) areas.set("engines", (areas.get("engines") || 0) + 1);
      if (f.includes("dispatchers/")) areas.set("dispatchers", (areas.get("dispatchers") || 0) + 1);
      if (f.includes("__tests__/")) areas.set("tests", (areas.get("tests") || 0) + 1);
      if (f.includes("hooks/")) areas.set("hooks", (areas.get("hooks") || 0) + 1);
    }

    const sorted = [...areas.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "general";
  }

  private suggestNextSteps(
    commits: Array<{ message: string }>,
    files: string[]
  ): string[] {
    const steps: string[] = [];

    // Check for uncommitted work
    const ws = this.getWorkingSet();
    if (ws.hasUncommittedWork) {
      steps.push(`Commit ${ws.modified.length + ws.staged.length} pending changes`);
    }

    // Suggest based on recent activity
    const lastMsg = commits[0]?.message || "";
    if (lastMsg.includes("feat")) steps.push("Run tests to verify new feature");
    if (lastMsg.includes("fix")) steps.push("Verify fix resolves the issue");
    if (lastMsg.includes("WIP")) steps.push("Complete work in progress");

    if (steps.length === 0) steps.push("Check /status for system state");

    return steps.slice(0, 3);
  }

  private buildSummary(
    last: { hash: string; message: string; ago: string },
    files: string[],
    area: string
  ): string {
    return `Last: ${last.hash} "${last.message}" (${last.ago}) | Area: ${area} | ${files.length} files changed`;
  }
}

export const sessionReplayEngine = new SessionReplayEngine();
