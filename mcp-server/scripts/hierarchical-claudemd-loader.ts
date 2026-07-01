#!/usr/bin/env npx ts-node
/**
 * hierarchical-claudemd-loader.ts — U-CTX02 Hierarchical CLAUDE.md Loader
 *
 * Detects cwd proximity to subsystem CLAUDE.md files and merges them with
 * parent CLAUDE.md files in hierarchical order: global → project → subsystem.
 *
 * Usage:
 *   npx ts-node scripts/hierarchical-claudemd-loader.ts [cwd]
 *   npx ts-node scripts/hierarchical-claudemd-loader.ts --json
 *
 * Output:
 *   - Merged CLAUDE.md content ordered by proximity
 *   - Metadata about sources and token estimates
 */

import * as fs from "fs";
import * as path from "path";

interface ClaudeMdSource {
  path: string;
  level: "global" | "project" | "subsystem";
  relativePath: string;
  chars: number;
  tokenEstimate: number;
  exists: boolean;
}

interface LoaderResult {
  merged: string;
  sources: ClaudeMdSource[];
  totalChars: number;
  totalTokens: number;
  cwd: string;
  nearestSubsystem: string | null;
  generated: string;
}

const GLOBAL_CLAUDE_MD = "C:/Users/wompu/.claude/CLAUDE.md";
const PROJECT_ROOT = "H:/prism";
const PROJECT_CLAUDE_MD = path.join(PROJECT_ROOT, "CLAUDE.md");
const MCP_CLAUDE_MD = path.join(PROJECT_ROOT, "mcp-server", "CLAUDE.md");

const SUBSYSTEM_PATHS = [
  "mcp-server/src/engines/CLAUDE.md",
  "mcp-server/src/engines/.claude/CLAUDE.md",
  "mcp-server/src/physics/CLAUDE.md",
  "mcp-server/src/tools/dispatchers/CLAUDE.md",
  "mcp-server/src/tools/.claude/CLAUDE.md",
  "mcp-server/src/hooks/CLAUDE.md",
  "mcp-server/src/data/.claude/CLAUDE.md",
  "mcp-server/src/__tests__/.claude/CLAUDE.md",
];

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

function findNearestSubsystem(cwd: string): string | null {
  const normalizedCwd = cwd.replace(/\\/g, "/").toLowerCase();

  for (const subPath of SUBSYSTEM_PATHS) {
    const subsystemDir = path.dirname(path.join(PROJECT_ROOT, subPath)).replace(/\\/g, "/").toLowerCase();
    if (normalizedCwd.startsWith(subsystemDir) || normalizedCwd.includes(subsystemDir)) {
      const fullPath = path.join(PROJECT_ROOT, subPath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  // Check for .claude/CLAUDE.md in cwd or parent directories
  let dir = cwd;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const claudeDir = path.join(dir, ".claude", "CLAUDE.md");
    if (fs.existsSync(claudeDir)) {
      return claudeDir;
    }
    const directClaude = path.join(dir, "CLAUDE.md");
    if (fs.existsSync(directClaude) && directClaude !== PROJECT_CLAUDE_MD && directClaude !== MCP_CLAUDE_MD) {
      return directClaude;
    }
    dir = path.dirname(dir);
  }

  return null;
}

function getRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith(PROJECT_ROOT.replace(/\\/g, "/"))) {
    return normalized.slice(PROJECT_ROOT.length + 1);
  }
  return normalized;
}

function loadHierarchy(cwd: string): LoaderResult {
  const sources: ClaudeMdSource[] = [];
  const parts: string[] = [];

  // Level 1: Global CLAUDE.md
  const globalContent = readFile(GLOBAL_CLAUDE_MD);
  sources.push({
    path: GLOBAL_CLAUDE_MD,
    level: "global",
    relativePath: "~/.claude/CLAUDE.md",
    chars: globalContent?.length ?? 0,
    tokenEstimate: globalContent ? estimateTokens(globalContent) : 0,
    exists: !!globalContent,
  });
  if (globalContent) {
    parts.push(`# Global Context (~/.claude/CLAUDE.md)\n\n${globalContent}`);
  }

  // Level 2: Project CLAUDE.md
  const projectContent = readFile(PROJECT_CLAUDE_MD);
  sources.push({
    path: PROJECT_CLAUDE_MD,
    level: "project",
    relativePath: "CLAUDE.md",
    chars: projectContent?.length ?? 0,
    tokenEstimate: projectContent ? estimateTokens(projectContent) : 0,
    exists: !!projectContent,
  });
  if (projectContent) {
    parts.push(`\n\n# Project Context (CLAUDE.md)\n\n${projectContent}`);
  }

  // Level 2.5: MCP Server CLAUDE.md (if in mcp-server subtree)
  const normalizedCwd = cwd.replace(/\\/g, "/").toLowerCase();
  if (normalizedCwd.includes("mcp-server")) {
    const mcpContent = readFile(MCP_CLAUDE_MD);
    sources.push({
      path: MCP_CLAUDE_MD,
      level: "project",
      relativePath: "mcp-server/CLAUDE.md",
      chars: mcpContent?.length ?? 0,
      tokenEstimate: mcpContent ? estimateTokens(mcpContent) : 0,
      exists: !!mcpContent,
    });
    if (mcpContent) {
      parts.push(`\n\n# MCP Server Context (mcp-server/CLAUDE.md)\n\n${mcpContent}`);
    }
  }

  // Level 3: Nearest subsystem CLAUDE.md
  const nearestSubsystem = findNearestSubsystem(cwd);
  if (nearestSubsystem && nearestSubsystem !== PROJECT_CLAUDE_MD && nearestSubsystem !== MCP_CLAUDE_MD) {
    const subsystemContent = readFile(nearestSubsystem);
    sources.push({
      path: nearestSubsystem,
      level: "subsystem",
      relativePath: getRelativePath(nearestSubsystem),
      chars: subsystemContent?.length ?? 0,
      tokenEstimate: subsystemContent ? estimateTokens(subsystemContent) : 0,
      exists: !!subsystemContent,
    });
    if (subsystemContent) {
      parts.push(`\n\n# Subsystem Context (${getRelativePath(nearestSubsystem)})\n\n${subsystemContent}`);
    }
  }

  const merged = parts.join("");
  const totalChars = sources.reduce((sum, s) => sum + s.chars, 0);
  const totalTokens = sources.reduce((sum, s) => sum + s.tokenEstimate, 0);

  return {
    merged,
    sources,
    totalChars,
    totalTokens,
    cwd,
    nearestSubsystem,
    generated: new Date().toISOString(),
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const cwdArg = args.find((a) => !a.startsWith("--")) || process.cwd();

  const result = loadHierarchy(cwdArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable output
  console.log("=== Hierarchical CLAUDE.md Loader ===");
  console.log(`CWD: ${result.cwd}`);
  console.log(`Nearest Subsystem: ${result.nearestSubsystem || "(none)"}`);
  console.log(`Total: ${result.totalChars} chars (~${result.totalTokens} tokens)`);
  console.log("");

  console.log("## Sources");
  for (const src of result.sources) {
    const status = src.exists ? "✓" : "✗";
    console.log(`  ${status} [${src.level}] ${src.relativePath} (${src.tokenEstimate} tokens)`);
  }
  console.log("");

  console.log("## Merged Content Preview (first 500 chars)");
  console.log(result.merged.slice(0, 500));
  if (result.merged.length > 500) {
    console.log(`\n... [${result.merged.length - 500} more chars]`);
  }
}

main();
