---
session: claude-68828b1a
topic: bravo-hermes-memory-vault-ms0
slot: bravo
written_at: 2026-06-04T18:47:13.060Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-68828b1a
status: active
---

# HANDOFF: claude-68828b1a
Updated: 2026-06-04T18:47:13.060Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-68828b1a

## STATE
(precompact auto-write — slot bravo)

## RESUME
Active /loop: iter 4/20 — "RGS pipeline roadmaps for all primary domains (forge-audit atomic + external-sof". RESUME via /loop. Last work: 443c84d08d [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-AUTONOMY (slot:bravo): reactive rate-limit fallback executor — the mechanism for 'use the model until the limit hits, then switch'. multi-provider-router.mjs PLANNED the provider chain (classifyTask) but nothing EXECUTED it; added isRateLimitError() + routeWithFallback() + routeTaskWithFallback(). Answers the operator's 'how will you know when the limit hits and switch?': it does NOT poll a 5h gauge (that telemetry is absent on this host) — it reacts to the ACTUAL 429/overloaded/quota error and falls through the chain (e.g. local qwen2.5-coder:32b heavy-work → gpt-oss:120b review → Opus). A NON-rate-limit error (auth/bug) fails LOUD immediately — never masks a real bug by silently trying another provider. Pure orchestration, injected caller → fully unit-testable without network. Composes with classifyTask + the octopus + the account-switch coordinator. +18 executor tests (52/52 green). Aligns with alpha's established 'local 32b does heavy token-work, Claude reviews' architecture. NOTE: ROUTING_TABLE still references retired deepseek-r1 (alpha's BLACKWELL purge) — flagged for alpha, not modified (lane discipline).. Roadmap: 759 ms, 374 done. Next: L8-P0-MS2, L8-P1-MS2, L8-P2-MS2. Session: Units completed: 0. AI: Check DuplicationGuardEngine before creating. Use PRISMCreativeReasoningEngine.explore('optimal') for hybrid solutions

## CONTEXT



<!-- pad: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -->
