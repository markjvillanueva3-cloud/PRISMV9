#!/usr/bin/env node
/**
 * ai-feature-recommend.mjs — UserPromptSubmit hook (U-AWARE06).
 *
 * STATUS: short-circuited. The pre-H9 body inlined an 85-line keyword→engine
 * map that drifted from `DOMAIN_KEYWORDS` in the canonical PRISMSelfAwarenessEngine
 * (which has more domains + better fuzzy matching via `findCapabilities()`).
 *
 * To re-enable, remove the immediate exit below AND swap in the canonical
 * engine call via the MCP dispatcher (`prism_dev:dev_system_recommend_engines`)
 * instead of duplicating the keyword map here. See feedback memo
 * `feedback_ollama_token_routing.md` for the routing convention.
 *
 * Per token-reduction pass (2026-04-23, owner-approved) and H9 compression
 * (HOOK-SYNERGY-MS0/U-HOOK-COMPRESS), this hook is parked as a no-op.
 */
process.stdout.write(JSON.stringify({ continue: true }));
process.exit(0);
