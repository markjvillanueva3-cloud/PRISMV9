#!/usr/bin/env node
// tier: T2
/**
 * ai-feature-recommend.mjs — UserPromptSubmit injector (U-AWARE04).
 *
 * Re-enabled 2026-05-13 as a thin pointer to the canonical AI-feature surfaces.
 *
 * Background (pre-2026-05-13): the original body inlined an 85-line
 * keyword→engine map that drifted from `DOMAIN_KEYWORDS` in
 * PRISMSelfAwarenessEngine. The map was deleted in H9 and the hook was
 * parked as a no-op (per `feedback_ollama_token_routing.md`).
 *
 * U-AWARE04 calls for re-enabling the hook with the canonical
 * `PRISMSelfAwarenessEngine.recommendAIFeatures()` call instead of a
 * hand-maintained map. The canonical surface ALREADY ships through two
 * paths:
 *   1. `master-index-precheck-inject.mjs` (T2 — auto-injects top-K
 *      master-index hits on every UserPromptSubmit; backed by
 *      MasterIndexEngine which subsumes recommendAIFeatures)
 *   2. `prism_intelligence:ai_feature_discover` / `ai_feature_route` MCP
 *      dispatcher actions (the in-process wrappers of recommendAIFeatures)
 *
 * Rather than re-duplicate either surface, this hook now emits a single-line
 * pointer on build/create intent so Claude (and future maintainers) see the
 * canonical API names inline with the prompt. This is intentionally
 * lightweight — the heavy lifting stays in the master-index engine.
 *
 * Disable: PRISM_AI_FEATURE_HINT=0
 */

import { readFileSync } from "node:fs";

const ENABLED = process.env.PRISM_AI_FEATURE_HINT !== "0";

// Build/audit intent — same shape as inventory-check-guard so the two
// injectors fire on a coherent set of prompts.
const BUILD_PATTERNS = [
  /\b(build|create|implement|add|write|make|develop)\b.*\b(engine|algorithm|hook|skill|dispatcher|feature|system|action)\b/i,
  /\bnew\s+(engine|algorithm|hook|skill|dispatcher|feature|action)\b/i,
  /\b(audit|investigate|analyze|review|check|find)\b.*\b(code|system|engine|architecture|capability|feature)\b/i,
  /\/forge/i,
  /\/dedup/i,
];

function passthrough() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

if (!ENABLED) {
  passthrough();
  process.exit(0);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  passthrough();
  process.exit(0);
}

const message = String(
  input?.prompt || input?.message?.content || input?.message || "",
);

/**
 * True when the prompt expresses intent that benefits from AI-feature hints
 * (build/create/audit/forge). Pure function exported for tests via the
 * library-mode flag.
 * @param {string} m normalized user prompt
 * @returns {boolean}
 */
export function shouldHint(m) {
  if (typeof m !== "string" || m.length === 0) return false;
  return BUILD_PATTERNS.some((p) => p.test(m));
}

if (process.env.PRISM_AI_FEATURE_HINT_AS_LIB === "1") {
  // Library mode for unit tests — no I/O.
} else if (!shouldHint(message)) {
  passthrough();
  process.exit(0);
} else {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext:
        "**[AI Features]** Before creating, use the canonical surfaces: " +
        "`prism_session:master_index_query` (ranked unified search) and " +
        "`prism_intelligence:ai_feature_discover` (PRISMSelfAwarenessEngine.recommendAIFeatures). " +
        "Master-index hits are also auto-injected by `master-index-precheck-inject` (T2).",
    },
  }));
}
