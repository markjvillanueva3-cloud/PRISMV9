#!/usr/bin/env node
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
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  // Output the role reminder as additional context
  console.log(JSON.stringify({
    continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: EXPERT_ROLE,
      }
    }));
}

main().catch(() => process.exit(0));
