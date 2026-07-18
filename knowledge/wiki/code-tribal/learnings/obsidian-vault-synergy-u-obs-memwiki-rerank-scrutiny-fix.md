# OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMWIKI-RERANK-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-RERANK-SCRUTINY-FIX (slot:alpha): close arm-C P1 + convergent A/B/C P2s

**Commit:** `b9b223d5e743` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:00:23-05:00
**Tags:** obsidian-vault-synergy, u-obs-memwiki-rerank-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-RERANK-SCRUTINY-FIX (slot:alpha): close arm-C P1 + convergent A/B/C P2s

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-RERANK-SCRUTINY-FIX (slot:alpha): close arm-C P1 + convergent A/B/C P2s

3-of-3 returned A PASS / B PASS / C FAIL. Fixes:
- P1 (arm C, BLOCKING): the cold-cache/model-swap title build was bounded by
  COUNT (MAX_EMBED_PER_RUN) but not WALL-CLOCK — 8 serial chunks x 8000ms could
  hit ~64s against the hook's 12000ms Stop budget, fleet-amplified on a model
  swap. Added a cumulative BUILD_DEADLINE_MS (6000) across the chunk loop +
  tightened the per-chunk timeout (CHUNK_TIMEOUT_MS 3500); remaining titles warm
  next run (now count- AND time-bounded). 6s build + 4s query embed < 12s.
- P2 (arms A+B convergent): the model-tag stale guard was documented but not
  enforced — ensureTitleEmbeddings now re-embeds entries whose cached hash !=
  CACHE_MODEL_TAG (a model swap re-embeds instead of cosining across spaces).
- P2 (arm C): unbounded cache growth — writeCache now does a prune-to-live-set
  rewrite (replaces the append), so renamed/deleted wiki titles drop out;
  ensureTitleEmbeddings returns the live subset only.

Tests 14/14 (+3: deadline halts loop via injected clock, stale-tag re-embed,
prune-deleted-title). Live binary re-verified: ragMode rerank, 25 memos, warm
484-title cache reused cleanly under the new code. Knobs added:
PRISM_WIKI_PROMO_CHUNK_TIMEOUT_MS, PRISM_WIKI_PROMO_BUILD_DEADLINE_MS.
```

## Files touched (3)
- scripts/lib/wiki-promo-rerank.mjs      | 72 +++++++++++++++++++++++++++++++++++++++++++++++++-----------------------
- scripts/lib/wiki-promo-rerank.test.mjs | 52 +++++++++++++++++++++++++++++++++++++++++++++++++---
- 2 files changed, 98 insertions(+), 26 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b9b223d5e743`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._