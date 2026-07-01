---
session: claude-4d6e1bf3
topic: blackwell-hermes-router
written_at: 2026-06-04T18:18:31.060Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-4d6e1bf3
status: active
---

# HANDOFF: claude-4d6e1bf3
Updated: 2026-06-04T18:18:31.060Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-4d6e1bf3

## STATE
5 commits this window: 74077e38cb model-upgrade, 318d0c062b hermes-plan+offloader-fix, f0e72dd6e0 U1 router keystone (18 tests, 2-reviewer hardened), 28c56cd437 gemma4:31b wiring (install-gated, 165 t/s research win), 0615b476d5 OllamaHookBridgeEngine retire (live regression closed). gemma4+octopus-combo questions ANSWERED (octopus combo-local already built; gemma4 wired). gpt-oss:120b+gemma4:31b pull->golf. RED zone 66%.

## RESUME
HERMES U1b + stale-tag .ts retirement (fresh budget — heavy tsc build). REMAINING stale deleted-model tags in mcp-server/src/engines/*.ts (grep 'qwen2.5-coder:(3b|7b|14b)|deepseek-r1:14b|ollama-codellama|ollama-deepseek' — ~18 files): (1) AISystemRouterEngine.ts — 'ollama-codellama'/'ollama-deepseek' are BACKEND-CLASS ENUM members (type union + switch cases at :139,:271,:295) → type-change refactor, re-point to a single 'ollama-local' class resolving via routeModelForTask; (2) ~17 others (ConnectionFinder, ErrorExplainer, LocalCommitMessage, ModelRouting, etc.) — classify executable-default vs comment, swap executable→qwen2.5-coder:32b. THEN extend scripts/no-retired-llm-refs.test.mjs SCAN_DIRS to include mcp-server/src/engines + mcp-server/data/state (the guard currently misses both surfaces — that's why these slipped). THEN U1b proper: thin LocalLLMTaskRouterEngine.ts wrapping scripts/lib/local-llm-task-router.mjs + prism_ai:route_task dispatcher + tool/dispatcherAction axes. Per-file 2-reviewer scrutiny + tsc verify each. Then U2 /local-do, U3 reviewer-enhance, U4-U7 COORDINATE bravo/zebra.

## CONTEXT

