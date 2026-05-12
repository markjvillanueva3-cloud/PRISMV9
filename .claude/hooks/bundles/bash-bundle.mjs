#!/usr/bin/env node
// bash-bundle.mjs — single PreToolUse hook for Bash. Replaces the 6-hook
// Bash matcher in settings.json with one bundled invocation.

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

const BASH_HOOKS = [
  { path: `${HELPER_BASE}/rtk-reminder.mjs`,                 timeout: 2000 },
  { path: `${HELPER_BASE}/test-run-gate.mjs`,                timeout: 5000 },
  { path: `${HOOK_BASE}/commit-ownership-guard.mjs`,         timeout: 5000 },
  { path: `${HOOK_BASE}/worktree-commit-route.mjs`,          timeout: 2000 },
  { path: `${HOOK_BASE}/html-companion-guard.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/rtk-auto-suggest.mjs`,               timeout: 2000 },
  { path: `${HOOK_BASE}/bash-destructive-guard.mjs`,         timeout: 2000 },
  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
  // HS-15 (2026-05-12): PreToolUse stash for duration-derivation. Runs LAST so a
  // prior-hook deny short-circuits before any stash entry leaks into the cache.
  { path: `${HOOK_BASE}/tool-watchdog.mjs`,                  timeout: 1000 },
];

async function main() {
  const stdinPayload = await readStdin();
  if (!stdinPayload) {
    emit({ continue: true });
    return;
  }
  const result = await runBundle(BASH_HOOKS, stdinPayload);
  emit(result);
}

main().catch((err) => {
  process.stderr.write(`bash-bundle error: ${err}\n`);
  emit({ continue: true });
});
