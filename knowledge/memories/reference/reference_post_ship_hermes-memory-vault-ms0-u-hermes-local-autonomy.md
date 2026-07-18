---
name: reference_post_ship_hermes-memory-vault-ms0-u-hermes-local-autonomy
description: Auto-distilled learnings from shipping HERMES-MEMORY-VAULT-MS0/U-HERMES-LOCAL-AUTONOMY (commit 443c84d08). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.888Z
aliases: reference_post_ship_hermes-memory-vault-ms0-u-hermes-local-autonomy
---


# HERMES-MEMORY-VAULT-MS0/U-HERMES-LOCAL-AUTONOMY

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-AUTONOMY (slot:bravo): reactive rate-limit fallback executor — the mechanism for 'use the model until the limit hits, then switch'. multi-provider-router.mjs PLANNED the provider chain (classifyTask) but nothing EXECUTED it; added isRateLimitError() + routeWithFallback() + routeTaskWithFallback(). Answers the operator's 'how will you know when the limit hits and switch?': it does NOT poll a 5h gauge (that telemetry is absent on this host) — it reacts to the ACTUAL 429/overloaded/quota error and falls through the chain (e.g. local qwen2.5-coder:32b heavy-work → gpt-oss:120b review → Opus). A NON-rate-limit error (auth/bug) fails LOUD immediately — never masks a real bug by silently trying another provider. Pure orchestration, injected caller → fully unit-testable without network. Composes with classifyTask + the octopus + the account-switch coordinator. +18 executor tests (52/52 green). Aligns with alpha's established 'local 32b does heavy token-work, Claude reviews' architecture. NOTE: ROUTING_TABLE still references retired deepseek-r1 (alpha's BLACKWELL purge) — flagged for alpha, not modified (lane discipline).

**Shipped:** 2026-06-04T13:28:05-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hermes-memory-vault-ms0-u-hermes-local-autonomy]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._