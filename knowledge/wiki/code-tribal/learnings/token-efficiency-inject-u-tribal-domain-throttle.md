# TOKEN-EFFICIENCY-INJECT/U-TRIBAL-DOMAIN-THROTTLE — [MAIN] [TOKEN-EFFICIENCY-INJECT]/U-TRIBAL-DOMAIN-THROTTLE (slot:bravo): same-prompt throttle on tribal-by-domain so /loop ticks skip the rerank subprocess + Ollama embed + re-inject

**Commit:** `87e5057dd158` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T12:30:53-05:00
**Tags:** token-efficiency-inject, u-tribal-domain-throttle, auto-distilled

## Subject
[MAIN] [TOKEN-EFFICIENCY-INJECT]/U-TRIBAL-DOMAIN-THROTTLE (slot:bravo): same-prompt throttle on tribal-by-domain so /loop ticks skip the rerank subprocess + Ollama embed + re-inject

## Body
```
[MAIN] [TOKEN-EFFICIENCY-INJECT]/U-TRIBAL-DOMAIN-THROTTLE (slot:bravo): same-prompt throttle on tribal-by-domain so /loop ticks skip the rerank subprocess + Ollama embed + re-inject

tribal-by-domain-inject (UserPromptSubmit) spawns the tribal-rerank subprocess
+ an Ollama embed (~3-4s, ~2KB) on every prompt and injects top-K tribal hits.
It had NO same-prompt throttle, so a /loop (which re-submits the IDENTICAL
prompt every tick) re-ran that whole pipeline each tick. Third application of
the proven scripts/lib/inject-throttle.mjs pattern (after cag-router +
master-index this session).

FIX: wire shouldThrottleInject -- import + THROTTLE_MS knob
(PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS, default 60000, 0=off; parsed via an
IIFE NOT parseInt||default so env "0" stays 0=off) + a check placed AFTER
sessionId resolves but BEFORE the CAG read AND the rerank subprocess, using
this hook's own approve()/tele() idiom (NOT process.exit, which would bypass
the main().catch() safety net). A throttled tick does ZERO work: no CAG read,
no subprocess spawn, no Ollama embed, no emit. Fail-open. Also fixed adjacent
pre-existing header doc-drift (TIMEOUT_MS default 4000 -> actual 2500).

LIVE: tick-1 stamps throttle state; identical 2nd tick leaves ts UNCHANGED
(deterministic suppression proof, independent of Ollama/approve()). 51/51 tests
(2 new subprocess: stamp+no-restamp suppression; ttl=0 writes no state). 2-arm
per-file scrutiny PASS (0 P0/P1).

QUALITY CAVEAT (scrutiny arm-B P2, recorded): within the 60s window, an
identical looped prompt will NOT re-surface tribal hits if a peer rebuilds the
tribal-embed-index mid-window. Acceptable + sibling-consistent (memory-index /
master-index accept the same 60s tradeoff); tribal precontext is advisory
ranking, not load-bearing physics/safety; a fresh (different) prompt is never
throttled. session tally: 3 token-efficiency injectors throttled/suppressed.
```

## Files touched (3)
- .claude/hooks/tribal-by-domain-inject.mjs      | 26 +++++++++++++++++++++++++-
- .claude/hooks/tribal-by-domain-inject.test.mjs | 62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 87 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 87e5057dd158`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._