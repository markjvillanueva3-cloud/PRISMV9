# CAD-LEARNING-AI/U-BPA-RAG-TRIBAL-TOPK — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-TOPK (slot:india): honor engine topK + drop the default-tribal corpus-size cliff (scrutiny P2)

**Commit:** `6cfc37579911` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:19:25-05:00
**Tags:** cad-learning-ai, u-bpa-rag-tribal-topk, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-TOPK (slot:india): honor engine topK + drop the default-tribal corpus-size cliff (scrutiny P2)

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-TOPK (slot:india): honor engine topK + drop the default-tribal corpus-size cliff (scrutiny P2)

Follow-up to 466f47d769. 3-of-3 arms B+C both flagged: the default retrieveTribal
ignored the engine's per-request opts.topK (called loadBlueprintTribalSources()
no-args, internal cap 7), so (a) a caller's topK budget was not honored on the
default path, and (b) if xray's corpus grows past 7, default-injected callers
silently get only the first 7 by insertion order (a coverage cliff).

Fix: dispatcher default forwards the engine's opts.topK
(loadBlueprintTribalSources({topK: opts?.topK})); the loader's no-topK fallback
now returns ALL tips (null = no cap) instead of a hard-coded 7 -- so the engine's
DEFAULT_TOP_K=5 governs the MCP path while a no-topK direct caller gets the whole
curated corpus. +1 loader test (12-record corpus, no topK -> 12 not 7; explicit
topK still caps). loader 7/7, round-trip 3/3 (engine topK 5 >= fixture 3),
recordoutcome 6/6, tsc clean.
```

## Files touched (4)
- mcp-server/src/tools/dispatchers/cadDispatcher.ts   |  4 ++--
- scripts/lib/blueprint-tribal-source-loader.mjs      | 10 ++++++++--
- scripts/lib/blueprint-tribal-source-loader.test.mjs |  8 ++++++++
- 3 files changed, 18 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till caps). loader 7/7, round-trip 3/3 (engine topK 5 >= fixture 3),

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6cfc37579911`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._