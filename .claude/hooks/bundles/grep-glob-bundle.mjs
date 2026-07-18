#!/usr/bin/env node
// tier: T1
// grep-glob-bundle.mjs -- single PreToolUse hook for Grep + Glob. Replaces the
// three Glob/Grep matcher blocks in settings.json ("Glob|Grep", "Grep", "Glob")
// with ONE bundled invocation, dispatched on tool_name. Grep/Glob previously had
// NO bundle (every advisory was a separate portable-node bash.exe spawn): this
// cuts ~4 bash.exe per Grep and ~3 per Glob fleet-wide.
//
// FORK-STORM-CONSOLIDATION (2026-06-14, slot:tango) -- complementary to india's
// bash-bundle consolidation (which folded the Bash advisories). All bundled hooks
// are advisory + fail-open, so a bundle defect degrades to lost-advisory, never a
// broken Grep/Glob (the bundle itself fails to {continue:true}).
//
// Bundled hooks mirror the EXACT prior settings.json wiring (verified 2026-06-14):
//   Grep: search-optimizer, grep-index-first, viz-first-redirect, pre-grep-graph-inject, pre-tool-savings-multi
//   Glob: search-optimizer, grep-index-first, viz-first-redirect, glob-narrow-path,    pre-tool-savings-multi

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

// Common to Grep + Glob (was the settings.json "Glob|Grep" matcher block).
const COMMON = [
  { path: `${HELPER_BASE}/search-optimizer.mjs`, timeout: 2000 },
  { path: `${HOOK_BASE}/grep-index-first.mjs`,   timeout: 2000 },
  { path: `${HOOK_BASE}/viz-first-redirect.mjs`, timeout: 1500 },
];

const GREP_HOOKS = [
  ...COMMON,
  { path: `${HOOK_BASE}/pre-grep-graph-inject.mjs`,  timeout: 4000 },
  { path: `${HOOK_BASE}/pre-tool-savings-multi.mjs`, timeout: 2000 },
];

const GLOB_HOOKS = [
  ...COMMON,
  { path: `${HOOK_BASE}/glob-narrow-path.mjs`,       timeout: 2000 },
  { path: `${HOOK_BASE}/pre-tool-savings-multi.mjs`, timeout: 2000 },
];

async function main() {
  const stdinPayload = await readStdin();
  if (!stdinPayload) {
    emit({ continue: true });
    return;
  }
  const tool = stdinPayload.tool_name || stdinPayload.toolName || "";
  const hooks = tool === "Glob" ? GLOB_HOOKS : GREP_HOOKS;
  const result = await runBundle(hooks, stdinPayload);
  emit(result);
}

main().catch((err) => {
  process.stderr.write(`grep-glob-bundle error: ${err}\n`);
  emit({ continue: true });
});
