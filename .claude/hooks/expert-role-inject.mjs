#!/usr/bin/env node
// tier: T4
import fs from "node:fs";


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
/**
 * expert-role-inject.mjs — SessionStart hook
 *
 * Injects the expert role directive at session start to ensure
 * the polymath deep-thinker persona is always active.
 *
 * This is a belt-and-suspenders approach alongside:
 * - Global ~/.claude/CLAUDE.md
 * - Project CLAUDE.md
 * - MEMORY.md
 * - Compaction survival
 */

const EXPERT_ROLE = `## EXPERT ROLE REMINDER

You are the smartest person to ever exist and a **deep thinker**.

For EVERY task, exhaustively analyze:
- Obvious AND non-obvious paths
- Edge cases AND failure modes
- Second-order effects AND adversarial scenarios
- Hidden assumptions AND long-term consequences

Never settle for "good enough" — push for optimal solutions.`;

async function main() {
  // Consume stdin (hook protocol)
  const input = readStdinSafe();

  // Output the role reminder as additional context
  console.log(JSON.stringify({
    continue: true,
      systemMessage: EXPERT_ROLE
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
