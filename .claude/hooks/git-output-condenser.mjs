#!/usr/bin/env node
// tier: T3
/**
 * git-output-condenser.mjs — PostToolUse Bash hook.
 *
 * Detects verbose git command output and emits a CONDENSED summary as
 * additionalContext. Original output unchanged in transcript; summary
 * gives Claude a digested view.
 *
 * Detection: Bash command starts with `git ` (after optional `rtk `).
 *
 * Per-subcommand condensing:
 *   git log/show       → first commit + count of remaining
 *   git diff           → file-stat summary (files changed, +/- lines)
 *   git status         → counts (modified, untracked, staged) + branch
 *   git blame          → first 5 lines + total
 *   default            → line count + first/last 3 lines
 *
 * No-op cases (pass-through):
 *   - Not a Bash tool
 *   - Not a git command
 *   - Output already small (< 600 chars)
 *
 * @hook PostToolUse:Bash
 */

import * as fs from "node:fs";

const SMALL_THRESHOLD = 600;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function condense(out, sub) {
  const lines = out.split("\n");
  const N = lines.length;
  if (sub === "log" || sub === "show") {
    const commitIdx = lines.findIndex((l) => /^commit [0-9a-f]{7,40}/.test(l));
    if (commitIdx === -1) return null;
    const firstCommit = lines.slice(commitIdx, commitIdx + 5).join("\n");
    const totalCommits = lines.filter((l) => /^commit [0-9a-f]{7,40}/.test(l)).length;
    return `git ${sub}: ${totalCommits} commit(s), ${N} lines.\nFirst:\n${firstCommit}`;
  }
  if (sub === "diff") {
    // Count file changes via diff --git markers
    const fileMarkers = lines.filter((l) => l.startsWith("diff --git")).length;
    const adds = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
    const dels = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
    return `git diff: ${fileMarkers} file(s), +${adds}/-${dels} lines, ${N} total output lines.`;
  }
  if (sub === "status") {
    const branch = (lines.find((l) => l.startsWith("On branch")) || "").replace("On branch ", "").trim();
    const modified = lines.filter((l) => /^\s*(M|modified:)/.test(l)).length;
    const untracked = lines.filter((l) => /^\?\?\s/.test(l) || /^\s+[a-zA-Z]/.test(l)).length;
    return `git status (${branch || "?"}): ${modified} modified, ${untracked} untracked, ${N} total lines.`;
  }
  // Generic condensing
  if (N <= 20) return null;
  return `git output: ${N} lines. First 3:\n${lines.slice(0, 3).join("\n")}\nLast 3:\n${lines.slice(-3).join("\n")}`;
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin || stdin.tool_name !== "Bash") return passthrough();

  const cmd = stdin.tool_input?.command ?? "";
  // Strip leading `rtk ` and any leading shell setup; check for git
  const stripped = cmd.replace(/^(rtk\s+)?/, "").trim();
  const m = stripped.match(/^git\s+(\S+)/);
  if (!m) return passthrough();
  const sub = m[1];

  const out = stdin.tool_response?.output
    ?? stdin.tool_response?.stdout
    ?? stdin.tool_response?.content
    ?? "";
  if (typeof out !== "string" || out.length < SMALL_THRESHOLD) return passthrough();

  const summary = condense(out, sub);
  if (!summary) return passthrough();

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: summary,
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
