#!/usr/bin/env node
/**
 * rtk-reminder.mjs — PreToolUse hook for Bash
 *
 * Reminds Claude to use RTK prefix for commands that benefit from token compression.
 * RTK typically saves 30-90% on verbose command output.
 */

import { readFileSync } from "node:fs";
import process from "node:process";

// Commands that benefit significantly from RTK wrapping
const RTK_COMMANDS = [
  "git status", "git log", "git diff", "git show", "git branch",
  "git add", "git commit", "git push", "git pull", "git fetch",
  "gh pr", "gh issue", "gh run", "gh api",
  "npm run", "npm install", "npm test", "npx vitest", "npx jest",
  "pnpm install", "pnpm add", "pnpm test", "pnpm run",
  "vitest", "jest", "playwright",
  "tsc", "eslint", "prettier",
  "docker ps", "docker logs", "docker images",
  "kubectl get", "kubectl logs", "kubectl describe",
  "cargo build", "cargo test", "cargo check", "cargo clippy",
];

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

function main() {
  const toolInput = stdinInput.tool_input || {};
  const command = (toolInput.command || process.env.TOOL_INPUT_command || "").trim();

  if (!command) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Already using rtk
  if (command.startsWith("rtk ")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Check if command matches any RTK-beneficial pattern
  const matchedCmd = RTK_COMMANDS.find(cmd => command.startsWith(cmd));
  if (matchedCmd) {
    process.stdout.write(JSON.stringify({
      additionalContext: `💡 RTK TIP: Prefix with \`rtk\` for 30-90% token savings. Example: \`rtk ${matchedCmd}\``,
    }));
    return;
  }

  // Check for partial matches (e.g., "git" alone)
  const firstWord = command.split(/\s+/)[0];
  const hasRtkSupport = RTK_COMMANDS.some(cmd => cmd.startsWith(firstWord + " "));
  if (hasRtkSupport) {
    process.stdout.write(JSON.stringify({
      additionalContext: `💡 RTK TIP: \`${firstWord}\` commands support RTK compression. Use \`rtk ${command}\` for token savings.`,
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main();
