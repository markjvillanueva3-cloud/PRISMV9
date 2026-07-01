# OLLAMA-ROUTING/U-ALPHA-OLLAMA-ROSTER-SYNC — [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-ROSTER-SYNC (slot:alpha): wedge-safe full-roster capability probe + restore the DEAD `balanced` routing tier + measured 55GB-32b VRAM-starvation root cause

**Commit:** `69bd13c82451` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:09:11-05:00
**Tags:** ollama-routing, u-alpha-ollama-roster-sync, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-ROSTER-SYNC (slot:alpha): wedge-safe full-roster capability probe + restore the DEAD `balanced` routing tier + measured 55GB-32b VRAM-starvation root cause

## Body
```
[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-ROSTER-SYNC (slot:alpha): wedge-safe full-roster capability probe + restore the DEAD `balanced` routing tier + measured 55GB-32b VRAM-starvation root cause

Operator /goal: increase ollama-offload utilization; stress-test local LLMs for the
diminishing-returns frontier; fix the graphs/protocols/pipelines so we use local
models to max potential. Builds on yesterday's measured frontier
(reference_ollama_stress_capability_2026_06_24): 7b = mechanical sweet spot, mixed
big-model sweeps WEDGE the 96GB box.

THREE evidence-backed fixes:

1. Matrix generator was BLIND to 6 of 9 routing-relevant models. ollama-capability-
   probe.mjs hardcoded DEFAULT_MODELS=[1.5b, gpt-oss:20b, 32b] -- so the nightly
   matrix that model-routing-policy.routePrompt -> model-tier-advisor consumes never
   measured qwen3-coder:30b (the cost-router's PREFERRED coder, by comment only), the
   7b/14b coder ladder, gpt-oss:120b, or either installed deepseek-r1. Expanded to the
   live-installed text/code/reasoning roster (9 models; vision/embed excluded).

2. That expanded roster would WEDGE the probe (R16) -- made it wedge-safe: per-request
   num_ctx=8192 (the KV-cache lever -- a 32b at the global 131072 context resided at
   55GB, measured) + unloadModel() between models (MODEL-OUTER, never co-reside big
   models) + CALL_TIMEOUT 45s->120s for cold loads. New ollama-capability-probe.test.mjs
   (6/6): unload-once-per-model, scoring-via-verify, best-effort-unload, NUM_CTX guard,
   roster-coverage.

3. cost-router `balanced` tier was DEAD -- held ONLY non-installed tags so every
   balanced task escalated to gpt-oss:20b (13GB). qwen2.5-coder:7b was RE-PULLED
   (verified live /api/tags) and is the measured mechanical sweet spot -> restored as
   the first balanced pick. Corrected the stale "RETIRED/deleted" comments + the
   anti-revert test fixture (R9: un-retire 7b -- intent preserved, data updated).
   60/60 cost-router + 20/20 local-llm-task-router green. Net: mechanical offload now
   routes to a 4.7GB sweet-spot model, not a 13GB escalation -- correct AND frees VRAM.

REAL max-potential blocker (measured): qwen2.5-coder:32b resides at 55GB on the 96GB
box (131072-context KV bloat); the fleet keeps it warm -> ~40GB headroom -> chronic
wedges. Lever = num_ctx-everywhere, not capacity.

HONEST DEFER (R12): the rigorous qwen3-coder:30b vs qwen2.5-coder:32b codegen winner
was NOT resolved -- the easy mechanical battery can't differentiate coding, and the
hard codegen battery was blocked by the live fleet VRAM contention above. Queued for a
clean-box ollama-stress-expanded-run --include-codegen. reference_ollama_routing_roster_sync_2026_06_25.
```

## Files touched (5)
- .claude/hooks/__tests__/ollama-cost-router.test.mjs | 16 ++++++---
- .claude/hooks/lib/ollama-cost-router.mjs            | 21 ++++++++----
- scripts/ollama-capability-probe.mjs                 | 70 ++++++++++++++++++++++++++++++++++++---
- scripts/ollama-capability-probe.test.mjs            | 99 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 190 insertions(+), 16 deletions(-)

## Lessons surfaced in commit body
- tilization; stress-test local LLMs for the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 69bd13c82451`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-ROUTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._