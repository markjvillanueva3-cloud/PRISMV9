# CLOUD-OVERFLOW-MS0/U-OPENROUTER-WIRE — [MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE (slot:alpha): wire OpenRouter Nemotron-3 cloud long-context tier (1M ctx, $0 free)

**Commit:** `cab3c1efbcce` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T11:54:14-05:00
**Tags:** cloud-overflow-ms0, u-openrouter-wire, auto-distilled

## Subject
[MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE (slot:alpha): wire OpenRouter Nemotron-3 cloud long-context tier (1M ctx, $0 free)

## Body
```
[MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE (slot:alpha): wire OpenRouter Nemotron-3 cloud long-context tier (1M ctx, $0 free)

Operator: 'wire cloud version, network is 1gb/sec'. After the gpt-oss:120b vs local-87GB-nemo
vs OpenRouter assessment, route deep-research/long-context/free-overflow to NVIDIA Nemotron-3
on OpenRouter (1M ctx, $0 free tier) instead of pulling the 87GB local quant that cannot use
its long-context edge locally.

- scripts/lib/openrouter-client.mjs (+25 tests): pure shaping + thin fetch shell, key-gated,
  fail-loud, NEVER throws, redacts+scrubs the key from every error path. Slugs verified live
  vs openrouter API 2026-06-15 (super-free default, ultra-free upgrade, paid fallbacks).
- scripts/ask-openrouter.mjs CLI (+18 tests): ask/research/summarize/longread/models, mirrors
  ask-ollama; reuses looksLikeNcProgram to REFUSE G-code cloud egress; fails loud -> Claude fallback.
- model-routing-policy.mjs routeCloudLongContext (+tests): cloud tier fires ONLY on explicit
  'use nemotron' OR unambiguous deep-research/1M-context signal; vetoed by build (Opus) +
  deep-think (Fable); safety always frontier Claude; proven-mechanical stays free-LOCAL Ollama.
- model-tier-advisor.mjs: cloud-route directive branch (live-validated).
- FEATURE-ROUTING-GRAPH.md: model ladder + cloud tier doctrine.

87/87 tests. Per-file scrutiny caught a P1 over-broad-match quality regression (routine
read/summarize stealing sonnet/fable work) -> narrowed + pinned. Needs OPENROUTER_API_KEY to go live.
```

## Files touched (9)
- .claude/hooks/model-tier-advisor.mjs        |  12 ++++++
- scripts/ask-openrouter.mjs                  | 277 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ask-openrouter.test.mjs             | 153 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/model-routing-policy.mjs        |  71 +++++++++++++++++++++++++++++++++
- scripts/lib/model-routing-policy.test.mjs   |  70 +++++++++++++++++++++++++++++++-
- scripts/lib/openrouter-client.mjs           | 294 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/openrouter-client.test.mjs      | 225 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/FEATURE-ROUTING-GRAPH.md |   5 ++-
- 8 files changed, 1105 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cab3c1efbcce`
- Milestone envelope: `mcp-server/data/milestones/CLOUD-OVERFLOW-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._