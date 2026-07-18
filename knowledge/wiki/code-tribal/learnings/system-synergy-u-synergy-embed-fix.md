# SYSTEM-SYNERGY/U-SYNERGY-EMBED-FIX — [MAIN] [SYSTEM-SYNERGY]/U-SYNERGY-EMBED-FIX (slot:golf): unblock the wiki->tribal embed pipeline (gap #5) — was fully broken

**Commit:** `c9fe32d8b2c3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:35:59-05:00
**Tags:** system-synergy, u-synergy-embed-fix, auto-distilled

## Subject
[MAIN] [SYSTEM-SYNERGY]/U-SYNERGY-EMBED-FIX (slot:golf): unblock the wiki->tribal embed pipeline (gap #5) — was fully broken

## Body
```
[MAIN] [SYSTEM-SYNERGY]/U-SYNERGY-EMBED-FIX (slot:golf): unblock the wiki->tribal embed pipeline (gap #5) — was fully broken

gap-map #5 (wiki<->tribal 83.7% coverage, stuck) was NOT missing wiring — the
embedder was BROKEN two ways:
 1. OOM: tribal-embed-index.json is 533MB; embedText loaded it whole -> native
    segfault on the default ~2GB heap. Workaround: invoke with
    --max-old-space-size=8192 (the 128GB box has the RAM).
 2. CONTEXT 500: embedText sent the FULL flattened body to nomic-embed-text,
    which has a ~2048-token window -> "input length exceeds the context length"
    -> whole batch failed. Fix: clamp embed input to MAX_EMBED_CHARS=2000
    (~500 tokens, fits any nomic build; lead content is most representative for
    retrieval; stored display text is separately 400 chars).

LIVE PROOF: with both fixes, a 12-file batch embedded successfully (added:12,
index 33387 entries, 0 errors) on the local GPU (nomic-embed-text). Coverage
now advances. 17/17 unit tests pass. Durable follow-up: bake the heap flag into
the script's wrapper + stream the index (it will outgrow 8GB eventually).
Memory: reference_wiki_tribal_embed_pipeline_blocked_2026_06_08.
```

## Files touched (2)
- scripts/embed-wiki-into-tribal-index.mjs | 58 ++++++++++++++++++++++++++++++++++++++++++++--------------
- 1 file changed, 44 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c9fe32d8b2c3`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._