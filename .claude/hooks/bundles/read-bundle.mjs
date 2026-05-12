#!/usr/bin/env node
// read-bundle.mjs — single PreToolUse hook for Read. Replaces the 4-hook
// Read matcher in settings.json with one bundled invocation.

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

const READ_HOOKS = [
  { path: `${HELPER_BASE}/read-optimizer.mjs`,               timeout: 2000 },
  { path: `${HELPER_BASE}/read-once-cache.mjs`,              timeout: 2000 }, // soft warn on re-read
  { path: `${HOOK_BASE}/file-read-cache.mjs`,               timeout: 2000 }, // hard deny on identical re-read of unchanged file — HOOKS-AUTOMATION-V2 U-HKA01
  { path: `${HOOK_BASE}/read-auto-limit.mjs`,                timeout: 2000 },
  { path: `${HOOK_BASE}/read-already-have.mjs`,              timeout: 2000 },
  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
];

async function main() {
  const stdinPayload = await readStdin();
  if (!stdinPayload) {
    emit({ continue: true });
    return;
  }
  const result = await runBundle(READ_HOOKS, stdinPayload);
  emit(result);
}

main().catch((err) => {
  process.stderr.write(`read-bundle error: ${err}\n`);
  emit({ continue: true });
});
