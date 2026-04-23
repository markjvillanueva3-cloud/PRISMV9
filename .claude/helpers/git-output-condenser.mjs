#!/usr/bin/env node
/**
 * git-output-condenser.mjs — PostToolUse hook for Bash
 *
 * Condenses verbose git command output:
 *   - git status: removes boilerplate headers
 *   - git log: compacts to hash + subject
 *   - git diff: shows file summary, not full diff
 *
 * Reduces git output by 30-50% while preserving essential info.
 */

import { readFileSync } from "node:fs";
import process from "node:process";

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

const GIT_STATUS_BOILERPLATE = [
  "On branch",
  "Your branch is",
  "Changes to be committed:",
  "Changes not staged for commit:",
  "Untracked files:",
  "(use \"git",
  "no changes added to commit",
];

const GIT_DIFF_BOILERPLATE = [
  "diff --git",
  "index ",
  "--- a/",
  "+++ b/",
  "@@ ",
];

function collectOutputText() {
  const parts = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0 && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

function isGitCommand(command) {
  return /\bgit\s+(status|log|diff|show)\b/.test(command);
}

function getGitCommandType(command) {
  if (/\bgit\s+status\b/.test(command)) return "status";
  if (/\bgit\s+log\b/.test(command)) return "log";
  if (/\bgit\s+diff\b/.test(command)) return "diff";
  if (/\bgit\s+show\b/.test(command)) return "show";
  return null;
}

function condenseGitStatus(output) {
  const lines = output.split(/\r?\n/);
  const condensed = [];
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip boilerplate
    if (GIT_STATUS_BOILERPLATE.some(bp => trimmed.startsWith(bp))) {
      if (trimmed.startsWith("Changes to be committed")) currentSection = "staged";
      else if (trimmed.startsWith("Changes not staged")) currentSection = "unstaged";
      else if (trimmed.startsWith("Untracked files")) currentSection = "untracked";
      continue;
    }

    // Keep file entries with section prefix
    if (trimmed.startsWith("modified:") || trimmed.startsWith("new file:") ||
        trimmed.startsWith("deleted:") || trimmed.startsWith("renamed:")) {
      const prefix = currentSection === "staged" ? "S" : currentSection === "unstaged" ? "M" : "?";
      condensed.push(`${prefix} ${trimmed.replace(/^(modified|new file|deleted|renamed):\s*/, "")}`);
    } else if (currentSection === "untracked" && !trimmed.startsWith("(")) {
      condensed.push(`? ${trimmed}`);
    }
  }

  return condensed.length > 0
    ? `GIT STATUS (condensed): ${condensed.length} files\n${condensed.slice(0, 20).join("\n")}${condensed.length > 20 ? `\n... and ${condensed.length - 20} more` : ""}`
    : null;
}

function condenseGitLog(output) {
  const lines = output.split(/\r?\n/);
  const commits = [];
  let currentCommit = null;

  for (const line of lines) {
    if (line.startsWith("commit ")) {
      if (currentCommit) commits.push(currentCommit);
      currentCommit = { hash: line.substring(7, 14) };
    } else if (currentCommit && !currentCommit.subject && line.trim() && !line.startsWith("Author:") && !line.startsWith("Date:") && !line.startsWith("Merge:")) {
      currentCommit.subject = line.trim().substring(0, 60);
    }
  }
  if (currentCommit) commits.push(currentCommit);

  if (commits.length === 0) return null;

  const condensed = commits.slice(0, 10).map(c => `${c.hash} ${c.subject || ""}`).join("\n");
  return `GIT LOG (condensed): ${commits.length} commits\n${condensed}${commits.length > 10 ? `\n... and ${commits.length - 10} more` : ""}`;
}

function condenseGitDiff(output) {
  const lines = output.split(/\r?\n/);
  const files = [];
  let currentFile = null;
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        files.push({ file: currentFile, add: additions, del: deletions });
      }
      const match = line.match(/diff --git a\/(.+) b\//);
      currentFile = match ? match[1] : "unknown";
      additions = 0;
      deletions = 0;
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }
  if (currentFile) {
    files.push({ file: currentFile, add: additions, del: deletions });
  }

  if (files.length === 0) return null;

  const totalAdd = files.reduce((s, f) => s + f.add, 0);
  const totalDel = files.reduce((s, f) => s + f.del, 0);
  const condensed = files.slice(0, 15).map(f => `${f.file} +${f.add}/-${f.del}`).join("\n");

  return `GIT DIFF (condensed): ${files.length} files, +${totalAdd}/-${totalDel} lines\n${condensed}${files.length > 15 ? `\n... and ${files.length - 15} more files` : ""}`;
}

function main() {
  const toolInput = stdinInput.tool_input || {};
  const command = toolInput.command || process.env.TOOL_INPUT_command || "";
  const output = collectOutputText();

  if (!isGitCommand(command) || output.length < 500) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const cmdType = getGitCommandType(command);
  let condensed = null;

  switch (cmdType) {
    case "status":
      condensed = condenseGitStatus(output);
      break;
    case "log":
      condensed = condenseGitLog(output);
      break;
    case "diff":
    case "show":
      condensed = condenseGitDiff(output);
      break;
  }

  if (condensed) {
    const savedChars = output.length - condensed.length;
    const savedPct = Math.round((savedChars / output.length) * 100);
    process.stdout.write(JSON.stringify({
      additionalContext: `${condensed}\n\n[Condensed ${savedPct}% — ~${Math.round(savedChars / 4)} tokens saved. Use 'git show <hash>' for full details.]`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main();
