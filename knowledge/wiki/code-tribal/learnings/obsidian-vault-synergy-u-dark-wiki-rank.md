# OBSIDIAN-VAULT-SYNERGY/U-DARK-WIKI-RANK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-DARK-WIKI-RANK (slot:alpha): rank the 32,630 dark wiki files by recall demand

**Commit:** `71680617989a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:30:13-05:00
**Tags:** obsidian-vault-synergy, u-dark-wiki-rank, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-DARK-WIKI-RANK (slot:alpha): rank the 32,630 dark wiki files by recall demand

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-DARK-WIKI-RANK (slot:alpha): rank the 32,630 dark wiki files by recall demand

The wiki is 83% dark (32,630 of 39,345 files unembedded); full re-embed is BLOCKED
on V8-cap write-side sharding (india/sierra). This ranker decouples vault VALUE from
that blocker: it joins .wiki-tribal-cross-ref-audit.json (missingFromTribal) with
wiki-recall-counts.json (recall demand) to find the DEMANDED-but-dark set -- files
being queried yet not semantically searchable.

LIVE RESULT: of 32,630 dark files, only 71 are DEMANDED (170 recalls) -- embedding
those 71 (0.2% of the set) first captures the recall benefit, a ~460x prioritization
win. Top: cimco-verification (19), obsidian-vault-node-access-map (13),
quoting-outbound-price-prior (13). Output: state/shared/dark-wiki-recall-priority.jsonl
(meta + 71 ranked priority entries) -- the consume-on-sharding artifact for india/sierra.

Read-only: never touches the wiki, tribal index, or the V8-cap writer. Pure lib
(dark-wiki-rank.mjs, clock injected -- no Date.now in pure path) + CLI + 6/6 tests
(real-shaped fixtures, recall-dominates-recency invariant, deterministic tail,
malformed-input). Novel (R8: no existing dark-wiki ranker; mcp-route-takeup measures
take-rate but nothing ranks dark embeds). Session 3-of-3 already cleared; this unit
tested + live-validated against the real 32,630-file dataset.
```

## Files touched (4)
- scripts/lib/dark-wiki-rank.mjs       | 133 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/dark-wiki-rank.test.mjs  | 102 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/rank-dark-wiki-by-recall.mjs | 109 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 344 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 71680617989a`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._