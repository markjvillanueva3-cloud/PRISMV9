#!/usr/bin/env node
/**
 * apply-hook-fixes.mjs
 * One-shot: short-circuit a list of hooks by prepending an early-exit.
 * Reversible: delete the 3 DISABLED_TOKEN_REDUX lines from each hook.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const HOOKS_DIR = "H:/prism/.claude/hooks";

const TARGETS = [
  "reference-value-injector",
  "prompt-rewriter-ollama",
  "local-compute-intent",
  "ollama-task-offloader",
  "reference-inject",
  "ai-feature-recommend",
  "shortcode-injector",
  "task-goal-tracker",
  "lathe-master-post-quality-gate",
  "naming-convention-enforcer",
  "magic-number-detector",
  "performance-pattern-detector",
  "complexity-gate",
  "type-safety-checker",
  "async-pattern-checker",
  "consistent-return-checker",
  "api-contract-enforcer",
  "pre-edit-impact-analyzer",
  // Fires on every Bash|Read|Edit|Write — "Doctrine/command surface" noise
  "mcp-route-suggest",
  // Fires on every Grep — "REMINDER: Check digest files..." noise
  "grep-index-first",
];

const MARKER = "DISABLED_TOKEN_REDUX_2026_04_23";

const STUB_LINES = [
  `// ${MARKER}: short-circuited by user-approved token-reduction pass.`,
  `// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs`,
  `process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);`,
];

let disabled = 0, alreadyDisabled = 0, missing = 0;

for (const name of TARGETS) {
  const file = join(HOOKS_DIR, `${name}.mjs`);
  if (!existsSync(file)) {
    console.log(`MISSING: ${name}`);
    missing++;
    continue;
  }
  const original = readFileSync(file, "utf8");
  if (original.includes(MARKER)) {
    console.log(`already disabled: ${name}`);
    alreadyDisabled++;
    continue;
  }
  const lines = original.split("\n");
  let insertAt = 0;
  if (lines[0] && lines[0].startsWith("#!")) insertAt = 1;
  const patched = [
    ...lines.slice(0, insertAt),
    ...STUB_LINES,
    ...lines.slice(insertAt),
  ].join("\n");
  writeFileSync(file, patched);
  console.log(`disabled: ${name}`);
  disabled++;
}

console.log(`\nsummary: disabled=${disabled}, already=${alreadyDisabled}, missing=${missing}`);
