#!/usr/bin/env npx ts-node
/**
 * verify-managed-blocks.ts — Phase 0.15 Managed Block Guard
 *
 * Checks that AUTO-REFRESHED blocks in managed docs haven't been hand-edited.
 * Run as pre-commit hook to reject hand-edits to managed sections.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const MANAGED_BLOCK_MARKERS = {
  start: /<!-- AUTO-REFRESHED: managed-section-start -->/,
  end: /<!-- AUTO-REFRESHED: managed-section-end -->/,
};

const DOCS_WITH_MANAGED_BLOCKS = [
  "CLAUDE.md",
  "mcp-server/CLAUDE.md",
  "state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md",
  "state/shared/PRISM-COMMANDS-MANIFEST.md",
];

interface BlockInfo {
  file: string;
  startLine: number;
  endLine: number;
  content: string;
}

interface Violation {
  file: string;
  type: "hand-edit" | "missing-marker" | "unbalanced";
  message: string;
  lines?: number[];
}

function findManagedBlocks(filePath: string): BlockInfo[] {
  const fullPath = path.resolve(process.cwd(), "..", filePath);
  if (!fs.existsSync(fullPath)) return [];

  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  const blocks: BlockInfo[] = [];

  let inBlock = false;
  let startLine = -1;
  let blockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (MANAGED_BLOCK_MARKERS.start.test(line)) {
      inBlock = true;
      startLine = i + 1;
      blockContent = [];
    } else if (MANAGED_BLOCK_MARKERS.end.test(line)) {
      if (inBlock) {
        blocks.push({
          file: filePath,
          startLine,
          endLine: i + 1,
          content: blockContent.join("\n"),
        });
      }
      inBlock = false;
    } else if (inBlock) {
      blockContent.push(line);
    }
  }

  return blocks;
}

function getStagedChanges(): string[] {
  try {
    const output = execSync("git diff --cached --name-only", { encoding: "utf-8" });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function getStagedDiff(filePath: string): string {
  try {
    return execSync(`git diff --cached -- "${filePath}"`, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

function checkForHandEdits(filePath: string, blocks: BlockInfo[]): Violation[] {
  const violations: Violation[] = [];
  const diff = getStagedDiff(filePath);

  if (!diff) return violations;

  // Parse diff to find changed line numbers
  const changedLines: number[] = [];
  const lineNumberRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  let match;

  while ((match = lineNumberRegex.exec(diff)) !== null) {
    const startLine = parseInt(match[1], 10);
    const count = parseInt(match[2] || "1", 10);
    for (let i = 0; i < count; i++) {
      changedLines.push(startLine + i);
    }
  }

  // Check if any changed lines fall within managed blocks
  for (const block of blocks) {
    const affectedLines = changedLines.filter(
      (line) => line >= block.startLine && line <= block.endLine
    );

    if (affectedLines.length > 0) {
      violations.push({
        file: filePath,
        type: "hand-edit",
        message: `Hand-edit detected in managed block (lines ${block.startLine}-${block.endLine})`,
        lines: affectedLines,
      });
    }
  }

  return violations;
}

async function main() {
  const bypassFlag = process.argv.includes("--bypass");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         MANAGED BLOCK VERIFICATION — Phase 0.15               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const stagedFiles = getStagedChanges();
  const relevantFiles = stagedFiles.filter((f) =>
    DOCS_WITH_MANAGED_BLOCKS.some((doc) => f.endsWith(doc) || f === doc)
  );

  if (relevantFiles.length === 0) {
    console.log("No managed docs in staged changes. ✓");
    process.exit(0);
  }

  console.log(`Checking ${relevantFiles.length} managed doc(s)...`);
  console.log();

  const allViolations: Violation[] = [];

  for (const file of relevantFiles) {
    const blocks = findManagedBlocks(file);
    if (blocks.length === 0) {
      console.log(`  ${file}: no managed blocks found`);
      continue;
    }

    const violations = checkForHandEdits(file, blocks);
    allViolations.push(...violations);

    if (violations.length === 0) {
      console.log(`  ✓ ${file}: ${blocks.length} managed block(s) OK`);
    } else {
      console.log(`  ✗ ${file}: ${violations.length} violation(s)`);
      for (const v of violations) {
        console.log(`    - ${v.message}`);
      }
    }
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");

  if (allViolations.length > 0) {
    console.log(`BLOCKED: ${allViolations.length} hand-edit(s) in managed sections.`);
    console.log();
    console.log("Managed blocks are AUTO-REFRESHED by doc-sync.");
    console.log("Edit the source of truth instead, or use --bypass if intentional.");

    if (bypassFlag) {
      console.log();
      console.log("--bypass flag detected. Allowing commit despite violations.");
      process.exit(0);
    }

    process.exit(1);
  }

  console.log("All managed blocks verified. ✓");
}

main().catch(console.error);
