/**
 * ContextPreloaderEngine — Token-efficient session bootstrap
 *
 * Generates the minimal context block that every new chat session needs,
 * replacing the need to read multiple large files (SYSTEM_INVENTORY.md,
 * MEMORY.md, PATH_INDEX.md, roadmap-index.json).
 *
 * Token savings: ~3000 tokens → ~200 tokens per session start.
 *
 * @version 1.0.0
 */

import { execFileSync } from "child_process";
import { readdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const MCP_ROOT = join(import.meta.dirname, "../..");
// Bounded buffer/timeout so a large `git status --porcelain` / `git diff --stat` over a
// big tree never throws ENOBUFS (execFileSync default is 1MB). 64MB is generous.
const GIT_MAX_BUFFER = 64 * 1024 * 1024;
const GIT_TIMEOUT_MS = 15000;
// execFileSync does NOT resolve a bare "git" via PATH/PATHEXT on Windows (throws ENOENT),
// so resolve an absolute git binary like the repo's git-log-tail primitive does.
const GIT_BIN = (() => {
  if (process.env.PRISM_GIT_BIN && existsSync(process.env.PRISM_GIT_BIN)) return process.env.PRISM_GIT_BIN;
  const winDefault = "C:/Program Files/Git/mingw64/bin/git.exe";
  if (existsSync(winDefault)) return winDefault;
  return "git";
})();

/**
 * Run a git subcommand SHELL-FREE: args are passed as an argv array to execFileSync, so
 * caller-supplied refs (e.g. getDeltaBoot(sinceCommit), reachable via the wired
 * prism_session:context_delta_boot action) are git arguments, NEVER shell tokens -- closes
 * the `git diff --stat ${sinceCommit}` command-injection vector. Returns trimmed stdout.
 */
function gitText(args: string[]): string {
  return execFileSync(GIT_BIN, args, {
    cwd: MCP_ROOT, encoding: "utf-8", timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER,
  }).trim();
}

interface PreloadContext {
  /** One-line compact summary (< 100 chars) */
  compact: string;
  /** System counts */
  counts: Record<string, number>;
  /** Last 5 commits */
  recent_commits: string[];
  /** Current git branch + commit hash */
  git_state: { branch: string; commit: string; dirty: boolean };
  /** Key file paths for quick navigation */
  key_paths: Record<string, string>;
  /** Timestamp of generation */
  generated_at: string;
}

interface BootBlock {
  /** Ultra-compact boot string (< 200 chars) suitable for system prompt injection */
  boot_string: string;
  /** Full preload context */
  full: PreloadContext;
}

function countFiles(dir: string, ext: string, excludeIndex = true): number {
  try {
    const fullPath = join(MCP_ROOT, dir);
    if (!existsSync(fullPath)) return 0;
    const files = readdirSync(fullPath).filter(f => f.endsWith(ext));
    return excludeIndex ? files.filter(f => f !== `index${ext}`).length : files.length;
  } catch { return 0; }
}

function countActions(): number {
  try {
    const dispDir = join(MCP_ROOT, "src/tools/dispatchers");
    if (!existsSync(dispDir)) return 0;
    let total = 0;
    for (const f of readdirSync(dispDir).filter(f => f.endsWith(".ts"))) {
      const content = readFileSync(join(dispDir, f), "utf-8");
      const matches = content.match(/case "[^"]*"/g);
      if (matches) total += matches.length;
    }
    return total;
  } catch { return 0; }
}

function gitInfo(): { branch: string; commit: string; dirty: boolean; recentCommits: string[] } {
  try {
    const branch = gitText(["branch", "--show-current"]);
    const commit = gitText(["rev-parse", "--short", "HEAD"]);
    const status = gitText(["status", "--porcelain"]);
    const logOutput = gitText(["log", "--oneline", "-5"]);
    return {
      branch,
      commit,
      dirty: status.length > 0,
      recentCommits: logOutput.split("\n").filter(Boolean)
    };
  } catch {
    return { branch: "unknown", commit: "unknown", dirty: false, recentCommits: [] };
  }
}

export class ContextPreloaderEngine {

  /**
   * Generate the full preload context with all system counts and state.
   */
  getPreloadContext(): PreloadContext {
    const engines = countFiles("src/engines", ".ts");
    const dispatchers = countFiles("src/tools/dispatchers", ".ts", false);
    const actions = countActions();
    const algorithms = countFiles("src/algorithms", ".ts");
    const registries = countFiles("src/registries", ".ts");
    const hooks = countFiles("src/hooks", ".ts");
    const testFiles = countFiles("src/__tests__", ".ts", false);
    const dataModules = countFiles("src/data", ".ts", false);

    const git = gitInfo();

    const counts: Record<string, number> = {
      engines, dispatchers, actions, algorithms,
      registries, hooks, test_files: testFiles, data_modules: dataModules
    };

    const compact = `PRISM: ${engines}E/${dispatchers}D/${actions}A/${algorithms}Alg/${registries}R | ${testFiles} test files | ${git.commit}`;

    return {
      compact,
      counts,
      recent_commits: git.recentCommits,
      git_state: { branch: git.branch, commit: git.commit, dirty: git.dirty },
      key_paths: {
        engines: "src/engines/",
        dispatchers: "src/tools/dispatchers/",
        algorithms: "src/algorithms/",
        registries: "src/registries/",
        tests: "src/__tests__/",
        data: "src/data/",
        inventory: "data/docs/SYSTEM_INVENTORY.md",
        quick_ref: "data/quick-ref.json",
        roadmap: "data/roadmap-index.json"
      },
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Generate the boot block — the absolute minimum context for a new session.
   * The boot_string is designed to be injected into system prompts or CLAUDE.md.
   */
  getBootBlock(): BootBlock {
    const full = this.getPreloadContext();
    const g = full.git_state;
    const c = full.counts;

    const boot_string = [
      `PRISM ${g.branch}@${g.commit}${g.dirty ? "*" : ""}`,
      `${c.engines}E ${c.dispatchers}D ${c.actions}A ${c.algorithms}Alg ${c.registries}R`,
      `${c.test_files} test files | ${c.data_modules} data modules`,
      `Last: ${full.recent_commits[0] || "none"}`
    ].join(" | ");

    return { boot_string, full };
  }

  /**
   * Generate a diff-aware boot: only show what changed since a known commit.
   */
  getDeltaBoot(sinceCommit: string): { changed: string; boot_string: string } {
    try {
      // sinceCommit is a caller-supplied arg (prism_session:context_delta_boot) -- pass it
      // as an argv element, never interpolated into a shell string (closes the injection).
      const diffStat = gitText(["diff", "--stat", `${sinceCommit}..HEAD`]);
      const logOutput = gitText(["log", "--oneline", `${sinceCommit}..HEAD`]);
      const commits = logOutput.split("\n").filter(Boolean);
      const boot = this.getBootBlock();

      return {
        changed: `${commits.length} commits since ${sinceCommit}: ${commits.slice(0, 5).join(" | ")}`,
        boot_string: boot.boot_string
      };
    } catch {
      return { changed: "Unable to compute delta", boot_string: this.getBootBlock().boot_string };
    }
  }

  /**
   * Regenerate the quick-ref.json file with current live counts.
   */
  regenerateQuickRef(): { path: string; counts: Record<string, number> } {
    const ctx = this.getPreloadContext();
    const quickRefPath = join(MCP_ROOT, "data/quick-ref.json");
    const content = JSON.stringify({
      generated: ctx.generated_at,
      commit: ctx.git_state.commit,
      branch: ctx.git_state.branch,
      counts: ctx.counts,
      compact: ctx.compact,
      recent_commits: ctx.recent_commits,
      key_paths: ctx.key_paths
    }, null, 2);

    try {
      const { writeFileSync } = require("fs");
      writeFileSync(quickRefPath, content, "utf-8");
      log.info(`[ContextPreloader] Regenerated quick-ref.json`);
    } catch (e: any) {
      log.warn(`[ContextPreloader] Failed to write quick-ref.json: ${e.message}`);
    }

    return { path: quickRefPath, counts: ctx.counts };
  }
}

export const contextPreloaderEngine = new ContextPreloaderEngine();
