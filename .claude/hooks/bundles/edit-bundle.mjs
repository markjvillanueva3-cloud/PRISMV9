#!/usr/bin/env node
// tier: T0
// edit-bundle.mjs — single PreToolUse hook that runs all Edit/Write/MultiEdit
// hooks in parallel via Promise.all and aggregates results.
//
// Replaces the 24-hook Edit|Write|MultiEdit matcher in settings.json with one
// bundled invocation. Per-Edit wall time drops from ~24× sequential cold-starts
// to ~1× (slowest hook in the bundle) ~250ms.
//
// LAYER 1: parallel hook execution
// LAYER 2: Ollama-fused advisory (fall-through to original hooks if unhealthy)
// LAYER 3: Obsidian cache for stable lookups

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";
import { fuseAdvisory } from "./lib/ollama-fuse.mjs";
import { get as cacheGet, set as cacheSet, keyForEdit } from "./lib/obsidian-cache.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";

// Hooks classified as SAFETY — must always run, can block.
const SAFETY_HOOKS = [
  { path: `${HOOK_BASE}/ban-facade-patterns.mjs`,            timeout: 3000 },
  { path: `${HOOK_BASE}/file-ownership-tracker.mjs`,         timeout: 2000 },
  { path: `${HOOK_BASE}/work-claim.mjs`,                     timeout: 2000 },
  { path: `${HOOK_BASE}/duplication-hard-block.mjs`,         timeout: 3000 },
  { path: `${HOOK_BASE}/asset-deletion-block.mjs`,           timeout: 3000 },
  { path: `${HOOK_BASE}/settings-json-addonly-guard.mjs`,    timeout: 2000 },
  { path: `${HOOK_BASE}/code-completeness-gate.mjs`,         timeout: 2000 },
  { path: `${HOOK_BASE}/test-legitimacy.mjs`,                timeout: 3000 },
];

// Hooks classified as ADVISORY — emit warnings only, never block. Cacheable.
const ADVISORY_HOOKS = [
  { path: `${HOOK_BASE}/dedup-auto-invoke.mjs`,              timeout: 3000, cacheable: true },
  { path: `${HOOK_BASE}/build-create-detector.mjs`,          timeout: 2000, cacheable: true },
  { path: `${HOOK_BASE}/anti-pattern-detector.mjs`,          timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/import-verifier.mjs`,                timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/type-safety-checker.mjs`,            timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/test-coverage-enforcer.mjs`,         timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/magic-number-detector.mjs`,          timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/consistent-return-checker.mjs`,      timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/api-contract-enforcer.mjs`,          timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/master-index-search-gate.mjs`,       timeout: 3000, cacheable: true },
  { path: `${HOOK_BASE}/ai-system-router-inject.mjs`,        timeout: 2000, cacheable: true },
  { path: `${HOOK_BASE}/ai-reasoning-inject.mjs`,            timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/agent-boundary-guard.mjs`,           timeout: 2000, cacheable: false },
  { path: `${HOOK_BASE}/figma-ui-consistency.mjs`,           timeout: 3000, cacheable: false },
  { path: `${HOOK_BASE}/tribal-inject-on-edit.mjs`,          timeout: 5000, cacheable: true },
];

// Hooks classified as HEAVY — run async, give them generous timeouts.
const HEAVY_HOOKS = [
  { path: `${HOOK_BASE}/auto-consensus-critical-edit.mjs`,   timeout: 8000 },
];

// Hooks from other matchers that also fire on Edit:
const SHARED_HOOKS = [
  { path: `${HOOK_BASE}/memory-relevance-inject.mjs`,        timeout: 3000 },
  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
  // HS-15 (2026-05-12): PreToolUse stash for duration-derivation. Placed in
  // SHARED so it runs as part of alwaysHooks (not advisory) — a SAFETY deny
  // earlier in runBundle short-circuits before this fires, so denied tool
  // calls don't leak stash entries into the pending-cache.
  { path: `${HOOK_BASE}/tool-watchdog.mjs`,                  timeout: 1000 },
];

const EDIT_ONLY_HOOKS = [
  { path: `${HOOK_BASE}/edit-old-string-verify.mjs`,         timeout: 2000 },
];

async function main() {
  const stdinPayload = await readStdin();
  if (!stdinPayload) {
    emit({ continue: true });
    return;
  }

  let toolInput = {};
  try {
    const parsed = JSON.parse(stdinPayload);
    toolInput = parsed.tool_input || {};
  } catch {
    // Malformed stdin — pass through
    emit({ continue: true });
    return;
  }

  const toolName = (() => {
    try { return JSON.parse(stdinPayload).tool_name || ""; } catch { return ""; }
  })();

  // Build full hook list: safety + heavy + shared + edit-specific (always run)
  const alwaysHooks = [...SAFETY_HOOKS, ...HEAVY_HOOKS, ...SHARED_HOOKS];
  if (toolName === "Edit") alwaysHooks.push(...EDIT_ONLY_HOOKS);

  // LAYER 2: Ollama fuse for advisory — try first, fall back if it returns null
  const ollamaPromise = fuseAdvisory(toolInput).catch(() => null);

  // LAYER 3: Cache lookup for cacheable advisory hooks
  const filePath = toolInput.file_path || "";
  const content = toolInput.new_string || toolInput.content || "";
  const cachedAdvisory = [];
  const advisoryToRun = [];

  for (const spec of ADVISORY_HOOKS) {
    if (!spec.cacheable) {
      advisoryToRun.push(spec);
      continue;
    }
    const hookName = spec.path.split(/[\\/]/).pop().replace(".mjs", "");
    const cacheKey = keyForEdit(hookName, filePath, content);
    const cached = cacheGet(cacheKey);
    if (cached) {
      cachedAdvisory.push(cached);
    } else {
      advisoryToRun.push({ ...spec, _cacheKey: cacheKey, _hookName: hookName });
    }
  }

  // Race Ollama fuse against advisory hook execution
  const [ollamaResult, alwaysBundle, advisoryBundle] = await Promise.all([
    ollamaPromise,
    runBundle(alwaysHooks, stdinPayload),
    // If Ollama succeeded with non-empty advisory, skip the advisory bundle entirely
    runBundle(advisoryToRun, stdinPayload),
  ]);

  // If safety/heavy/shared blocked, propagate immediately
  if (alwaysBundle.continue === false) {
    emit(alwaysBundle);
    return;
  }

  // Aggregate additionalContext from all sources
  const contextParts = [];
  if (alwaysBundle.hookSpecificOutput?.additionalContext) {
    contextParts.push(alwaysBundle.hookSpecificOutput.additionalContext);
  }
  if (advisoryBundle.hookSpecificOutput?.additionalContext) {
    contextParts.push(advisoryBundle.hookSpecificOutput.additionalContext);
  }
  for (const c of cachedAdvisory) {
    if (c.additionalContext) contextParts.push(c.additionalContext);
  }
  if (ollamaResult?.additionalContext) {
    contextParts.push(ollamaResult.additionalContext);
  }

  // Cache fresh advisory results from this run
  if (advisoryBundle.hookSpecificOutput?.additionalContext) {
    for (const spec of advisoryToRun) {
      if (spec._cacheKey) {
        cacheSet(spec._cacheKey, spec._hookName, {
          additionalContext: advisoryBundle.hookSpecificOutput.additionalContext,
        }, 60 * 60 * 1000); // 1h TTL
      }
    }
  }

  const response = { continue: true };
  if (contextParts.length > 0) {
    response.hookSpecificOutput = {
      hookEventName: "PreToolUse",
      additionalContext: contextParts.join("\n\n"),
    };
  }
  emit(response);
}

main().catch((err) => {
  // Hook errors must not block tool execution
  process.stderr.write(`edit-bundle error: ${err}\n`);
  emit({ continue: true });
});
