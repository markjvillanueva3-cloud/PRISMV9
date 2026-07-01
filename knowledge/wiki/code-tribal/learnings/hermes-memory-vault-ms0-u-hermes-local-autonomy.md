# HERMES-MEMORY-VAULT-MS0/U-HERMES-LOCAL-AUTONOMY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-AUTONOMY (slot:bravo): reactive rate-limit fallback executor — the mechanism for 'use the model until the limit hits, then switch'. multi-provider-router.mjs PLANNED the provider chain (classifyTask) but nothing EXECUTED it; added isRateLimitError() + routeWithFallback() + routeTaskWithFallback(). Answers the operator's 'how will you know when the limit hits and switch?': it does NOT poll a 5h gauge (that telemetry is absent on this host) — it reacts to the ACTUAL 429/overloaded/quota error and falls through the chain (e.g. local qwen2.5-coder:32b heavy-work → gpt-oss:120b review → Opus). A NON-rate-limit error (auth/bug) fails LOUD immediately — never masks a real bug by silently trying another provider. Pure orchestration, injected caller → fully unit-testable without network. Composes with classifyTask + the octopus + the account-switch coordinator. +18 executor tests (52/52 green). Aligns with alpha's established 'local 32b does heavy token-work, Claude reviews' architecture. NOTE: ROUTING_TABLE still references retired deepseek-r1 (alpha's BLACKWELL purge) — flagged for alpha, not modified (lane discipline).

**Commit:** `443c84d08d6d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:28:05-05:00
**Tags:** hermes-memory-vault-ms0, u-hermes-local-autonomy, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-AUTONOMY (slot:bravo): reactive rate-limit fallback executor — the mechanism for 'use the model until the limit hits, then switch'. multi-provider-router.mjs PLANNED the provider chain (classifyTask) but nothing EXECUTED it; added isRateLimitError() + routeWithFallback() + routeTaskWithFallback(). Answers the operator's 'how will you know when the limit hits and switch?': it does NOT poll a 5h gauge (that telemetry is absent on this host) — it reacts to the ACTUAL 429/overloaded/quota error and falls through the chain (e.g. local qwen2.5-coder:32b heavy-work → gpt-oss:120b review → Opus). A NON-rate-limit error (auth/bug) fails LOUD immediately — never masks a real bug by silently trying another provider. Pure orchestration, injected caller → fully unit-testable without network. Composes with classifyTask + the octopus + the account-switch coordinator. +18 executor tests (52/52 green). Aligns with alpha's established 'local 32b does heavy token-work, Claude reviews' architecture. NOTE: ROUTING_TABLE still references retired deepseek-r1 (alpha's BLACKWELL purge) — flagged for alpha, not modified (lane discipline).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MEMORY-VAULT-MS0]/U-HERMES-LOCAL-AUTONOMY (slot:bravo): reactive rate-limit fallback executor — the mechanism for 'use the model until the limit hits, then switch'. multi-provider-router.mjs PLANNED the provider chain (classifyTask) but nothing EXECUTED it; added isRateLimitError() + routeWithFallback() + routeTaskWithFallback(). Answers the operator's 'how will you know when the limit hits and switch?': it does NOT poll a 5h gauge (that telemetry is absent on this host) — it reacts to the ACTUAL 429/overloaded/quota error and falls through the chain (e.g. local qwen2.5-coder:32b heavy-work → gpt-oss:120b review → Opus). A NON-rate-limit error (auth/bug) fails LOUD immediately — never masks a real bug by silently trying another provider. Pure orchestration, injected caller → fully unit-testable without network. Composes with classifyTask + the octopus + the account-switch coordinator. +18 executor tests (52/52 green). Aligns with alpha's established 'local 32b does heavy token-work, Claude reviews' architecture. NOTE: ROUTING_TABLE still references retired deepseek-r1 (alpha's BLACKWELL purge) — flagged for alpha, not modified (lane discipline).
```

## Files touched (3)
- scripts/lib/multi-provider-router.mjs      | 111 +++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/multi-provider-router.test.mjs |  90 +++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 201 insertions(+)

## Lessons surfaced in commit body
- til the limit hits, then switch'. multi-provider-router.mjs PLANNED the provider chain (classifyTask) but nothing EXECUTED it; added isRateLimitError() + routeWithFallback() + routeTaskWithFallback(). Answers the operator's 'how will you know when the limit hits and switch?': it does NOT poll a 5h gauge (that telemetry is absent on this host) — it reacts to the ACTUAL 429/overloaded/quota error and f
- NOTE: ROUTING_TABLE still references retired deepseek-r1 (alpha's BLACKWELL purge) — flagged for alpha, not modified (lane discipline).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 443c84d08d6d`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._