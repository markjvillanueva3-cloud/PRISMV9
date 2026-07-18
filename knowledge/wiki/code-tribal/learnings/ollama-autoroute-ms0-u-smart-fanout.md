# OLLAMA-AUTOROUTE-MS0/U-SMART-FANOUT — [MAIN-FORCE] [OLLAMA-AUTOROUTE-MS0]/U-SMART-FANOUT (slot:india): AUTO-invoke Ollama for mechanical fan-out + complete classifier stem-bug fix

**Commit:** `b0bcf79c8509` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T10:36:45-05:00
**Tags:** ollama-autoroute-ms0, u-smart-fanout, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-AUTOROUTE-MS0]/U-SMART-FANOUT (slot:india): AUTO-invoke Ollama for mechanical fan-out + complete classifier stem-bug fix

## Body
```
[MAIN-FORCE] [OLLAMA-AUTOROUTE-MS0]/U-SMART-FANOUT (slot:india): AUTO-invoke Ollama for mechanical fan-out + complete classifier stem-bug fix

WHY (operator 2026-06-12): "find a better way to auto invoke ollama since you didn't use it when you should have. build everything." When the 34-agent CAD coverage workflow rate-limited Anthropic (5.8M tokens wasted), that mechanical grep+summarize fan-out should have run on LOCAL Ollama -- the ollamaFanout primitive (bravo 2026-06-09) already existed but nothing AUTO-invoked it.

THE BETTER WAY -- smart-fanout.mjs: hand it a batch, it CLASSIFIES each task and AUTO-routes mechanical (summarize/extract/classify/format/explain/document/git/unknown) to local Ollama ($0, no rate limit), judgment/safety to Claude. Reuses ollamaFanout (no dup). Pure routing (R5). 12 hermetic tests.

BUG SURFACED + FIXED (R12/R15) -- local-llm-task-router.mjs: the SAME trailing word-boundary stem bug that U-CLASSIFY-STEM-FIX (2026-06-11) fixed for classif/categoriz was left on synthesiz/consolidat/analyz/summar, so synthesize/consolidate/analyze fell to unknown and were MIS-ROUTED local (judgment sent to the cheap lane). Use \w* after each stem. +REGRESSION-2 test. R15 apply-to-all completion.

DOGFOOD PROOF -- cad-gen-coverage-meter.mjs re-runs the per-galaxy coverage that rate-limited: PHASE 1 inventory in CODE (deterministic op-context scan, no agents, no rg dep); PHASE 2 (--ollama) qualitative pass AUTO-routes to Ollama via smartFanout. LIVE: 8 grounded notes on gpt-oss:120b, routing ollama:8/claude:0, 51s, $0, zero rate limit.

HONESTY (R12) -- naive mention scan reads 96% (saturated by the wiki index naming every engine); op-context capability reads 16%/32% and its gaps (sheet-metal, weldments, die-design, surfacing, 2d-drawing, import-repair) MATCH the grounded ~7% audit (R15 validated by gap-agreement). cad-coverage-score.mjs scorer + 7 tests.

39/39 tests (smart-fanout 12 + router 20 + coverage-score 7). All .mjs, no tsc.
```

## Files touched (10)
- scripts/cad-gen-coverage-meter.mjs             | 218 +++++++++++++++++++++++++++++++
- scripts/lib/cad-coverage-score.mjs             | 126 ++++++++++++++++++
- scripts/lib/cad-coverage-score.test.mjs        | 100 ++++++++++++++
- scripts/lib/local-llm-task-router.mjs          |  12 +-
- scripts/lib/local-llm-task-router.test.mjs     |  17 +++
- scripts/lib/smart-fanout.mjs                   |  96 ++++++++++++++
- scripts/lib/smart-fanout.test.mjs              | 138 ++++++++++++++++++++
- state/shared/specs/CAD-GEN-COVERAGE-METER.json | 589 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/CAD-GEN-COVERAGE-METER.md   |  59 +++++++++
- 9 files changed, 1352 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b0bcf79c8509`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-AUTOROUTE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._