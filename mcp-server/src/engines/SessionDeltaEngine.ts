/**
 * SessionDeltaEngine — Platform-Level Session Diff Tracker
 *
 * Tracks what changed between sessions so new chats don't waste tokens
 * re-reading unchanged files. Uses git history to compute structured deltas.
 *
 * Actions: session_delta, session_bookmark, session_compare_bookmark
 *
 * @version 1.0.0
 * @safety Git unavailability = graceful empty results, never throws
 */

import { execSync } from "child_process";
import * as path from "path";

// __filename and import.meta.dirname are CommonJS globals
// ============================================================================
// TYPES
// ============================================================================

/** Bookmark capturing current session state for later comparison. */
export interface SessionBookmark {
  commitHash: string;
  timestamp: string;
  engineCount: number;
  dispatcherCount: number;
  testCount: number;
  actionCount: number;
}

/** Structured delta between two session states. */
export interface SessionDelta {
  newEngines: string[];
  modifiedEngines: string[];
  newTests: string[];
  newActions: string[];
  commits: string[];
  summary: string;
}

/** File change entry from git. */
interface FileChange {
  status: "A" | "M" | "D" | "R" | string;
  file: string;
}

/** Categorized changes grouped by area. */
interface CategorizedChanges {
  engines: FileChange[];
  dispatchers: FileChange[];
  tests: FileChange[];
  data: FileChange[];
  hooks: FileChange[];
  other: FileChange[];
}

/** Full change report returned by getChangesSince / getChangesSinceCommit. */
export interface ChangeReport {
  since: string;
  until: string;
  modified: CategorizedChanges;
  added: string[];
  deleted: string[];
  commits: string[];
  fileCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

const FILE_CATEGORIES: Array<{ key: keyof CategorizedChanges; pattern: RegExp }> = [
  { key: "engines", pattern: /src\/engines\// },
  { key: "dispatchers", pattern: /src\/tools\/dispatchers\// },
  { key: "tests", pattern: /src\/__tests__\// },
  { key: "data", pattern: /src\/data\// },
  { key: "hooks", pattern: /hooks\// },
];

// ============================================================================
// ENGINE
// ============================================================================

export class SessionDeltaEngine {
  private repoRoot: string;

  constructor(repoRoot?: string) {
    this.repoRoot = repoRoot ?? REPO_ROOT;
  }

  // --------------------------------------------------------------------------
  // Core: git command runner (safe)
  // --------------------------------------------------------------------------

  private git(cmd: string): string {
    try {
      return execSync(`git ${cmd}`, {
        cwd: this.repoRoot,
        encoding: "utf-8",
        timeout: 10_000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch {
      return "";
    }
  }

  private isGitAvailable(): boolean {
    return this.git("rev-parse --is-inside-work-tree") === "true";
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private parseNameStatus(raw: string): FileChange[] {
    if (!raw) return [];
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("\t");
        return { status: parts[0]?.[0] ?? "M", file: parts[parts.length - 1] ?? "" };
      })
      .filter((fc) => fc.file.length > 0);
  }

  private categorize(changes: FileChange[]): CategorizedChanges {
    const result: CategorizedChanges = {
      engines: [],
      dispatchers: [],
      tests: [],
      data: [],
      hooks: [],
      other: [],
    };
    for (const fc of changes) {
      let matched = false;
      for (const cat of FILE_CATEGORIES) {
        if (cat.pattern.test(fc.file)) {
          result[cat.key].push(fc);
          matched = true;
          break;
        }
      }
      if (!matched) result.other.push(fc);
    }
    return result;
  }

  private getCommitMessages(range: string): string[] {
    const raw = this.git(`log --oneline ${range}`);
    return raw ? raw.split("\n").filter(Boolean) : [];
  }

  private countFiles(glob: string): number {
    try {
      const result = execSync(
        `git ls-files "${glob}"`,
        { cwd: this.repoRoot, encoding: "utf-8", timeout: 5_000, stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      return result ? result.split("\n").length : 0;
    } catch {
      return 0;
    }
  }

  private buildReport(changes: FileChange[], commits: string[], since: string, until: string): ChangeReport {
    const categorized = this.categorize(changes);
    return {
      since,
      until,
      modified: categorized,
      added: changes.filter((c) => c.status === "A").map((c) => c.file),
      deleted: changes.filter((c) => c.status === "D").map((c) => c.file),
      commits,
      fileCount: changes.length,
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Returns structured diff of what changed since an ISO timestamp. */
  getChangesSince(timestamp: string): ChangeReport {
    if (!this.isGitAvailable()) {
      return this.buildReport([], [], timestamp, new Date().toISOString());
    }
    const raw = this.git(`log --name-status --diff-filter=AMDRT --since="${timestamp}" --pretty=format:""`);
    const changes = this.parseNameStatus(raw);
    const commits = this.getCommitMessages(`--since="${timestamp}"`);
    const head = this.git("rev-parse --short HEAD");
    return this.buildReport(changes, commits, timestamp, head);
  }

  /** Returns structured diff of what changed since a specific commit. */
  getChangesSinceCommit(commitHash: string): ChangeReport {
    if (!this.isGitAvailable()) {
      return this.buildReport([], [], commitHash, "unknown");
    }
    const raw = this.git(`diff --name-status ${commitHash}..HEAD`);
    const changes = this.parseNameStatus(raw);
    const commits = this.getCommitMessages(`${commitHash}..HEAD`);
    const head = this.git("rev-parse --short HEAD");
    return this.buildReport(changes, commits, commitHash, head);
  }

  /** Returns changes from the last N hours (default 24). */
  getRecentActivity(hours: number = 24): ChangeReport {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    return this.getChangesSince(since);
  }

  /** Returns a bookmark of current state that can be persisted in MEMORY.md. */
  getSessionBookmark(): SessionBookmark {
    const commitHash = this.git("rev-parse --short HEAD") || "unknown";
    return {
      commitHash,
      timestamp: new Date().toISOString(),
      engineCount: this.countFiles("src/engines/*.ts"),
      dispatcherCount: this.countFiles("src/tools/dispatchers/*Dispatcher.ts"),
      testCount: this.countFiles("src/__tests__/*.test.ts"),
      actionCount: this.countFiles("src/actions/*.ts"),
    };
  }

  /** Compares current state to a stored bookmark, returns compact delta. */
  compareBookmark(bookmark: SessionBookmark): SessionDelta {
    if (!this.isGitAvailable() || bookmark.commitHash === "unknown") {
      return {
        newEngines: [],
        modifiedEngines: [],
        newTests: [],
        newActions: [],
        commits: [],
        summary: "git unavailable or invalid bookmark",
      };
    }

    const report = this.getChangesSinceCommit(bookmark.commitHash);
    const newEngines = report.modified.engines
      .filter((c) => c.status === "A")
      .map((c) => path.basename(c.file, ".ts"));
    const modifiedEngines = report.modified.engines
      .filter((c) => c.status === "M")
      .map((c) => path.basename(c.file, ".ts"));
    const newTests = report.modified.tests
      .filter((c) => c.status === "A")
      .map((c) => path.basename(c.file, ".ts"));
    const newActions = report.added
      .filter((f) => f.includes("src/actions/"))
      .map((f) => path.basename(f, ".ts"));

    const currentBookmark = this.getSessionBookmark();
    const engineDiff = currentBookmark.engineCount - bookmark.engineCount;
    const testDiff = currentBookmark.testCount - bookmark.testCount;

    const parts: string[] = [];
    if (report.commits.length > 0) parts.push(`${report.commits.length} commits`);
    if (report.fileCount > 0) parts.push(`${report.fileCount} files changed`);
    if (engineDiff > 0) parts.push(`+${engineDiff} engines`);
    if (testDiff > 0) parts.push(`+${testDiff} tests`);
    if (newActions.length > 0) parts.push(`+${newActions.length} actions`);

    return {
      newEngines,
      modifiedEngines,
      newTests,
      newActions,
      commits: report.commits,
      summary: parts.length > 0 ? parts.join(", ") : "no changes since bookmark",
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const sessionDeltaEngine = new SessionDeltaEngine();
