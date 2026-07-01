# OLLAMA-OFFLOAD/U-ADVISORY-DECAY-XBUCKET — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-XBUCKET (slot:alpha): surface the TRUE cross-bucket advisory take-rate (observability only). Pure crossBucketTakeRate + CONVERSION_BUCKET_MAP (advisory->execution bucket) read the conversion from the EXECUTION bucket a pure-advisory hook drives, not its always-0 own offloaded; decayReport gains additive crossBucketTakeRate/crossBucketKey fields + an xtake CLI column. decayDecision/classify UNTOUCHED -- the 18 original tests prove the live mute path is byte-unchanged. 26 tests green; LIVE: large-read-digest take 0.0% own-bucket -> 0.8% true cross-bucket (1/118). The gate-DECISION wiring of this signal stays a separate gated unit (would re-judge mute status on 4 live hooks).

**Commit:** `b5fa10a632f7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:22:47-05:00
**Tags:** ollama-offload, u-advisory-decay-xbucket, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-XBUCKET (slot:alpha): surface the TRUE cross-bucket advisory take-rate (observability only). Pure crossBucketTakeRate + CONVERSION_BUCKET_MAP (advisory->execution bucket) read the conversion from the EXECUTION bucket a pure-advisory hook drives, not its always-0 own offloaded; decayReport gains additive crossBucketTakeRate/crossBucketKey fields + an xtake CLI column. decayDecision/classify UNTOUCHED -- the 18 original tests prove the live mute path is byte-unchanged. 26 tests green; LIVE: large-read-digest take 0.0% own-bucket -> 0.8% true cross-bucket (1/118). The gate-DECISION wiring of this signal stays a separate gated unit (would re-judge mute status on 4 live hooks).

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-XBUCKET (slot:alpha): surface the TRUE cross-bucket advisory take-rate (observability only). Pure crossBucketTakeRate + CONVERSION_BUCKET_MAP (advisory->execution bucket) read the conversion from the EXECUTION bucket a pure-advisory hook drives, not its always-0 own offloaded; decayReport gains additive crossBucketTakeRate/crossBucketKey fields + an xtake CLI column. decayDecision/classify UNTOUCHED -- the 18 original tests prove the live mute path is byte-unchanged. 26 tests green; LIVE: large-read-digest take 0.0% own-bucket -> 0.8% true cross-bucket (1/118). The gate-DECISION wiring of this signal stays a separate gated unit (would re-judge mute status on 4 live hooks).
```

## Files touched (4)
- scripts/advisory-decay-report.mjs   | 10 +++++++---
- scripts/lib/advisory-decay.mjs      | 52 +++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/lib/advisory-decay.test.mjs | 81 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 3 files changed, 138 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b5fa10a632f7`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._

---

## What shipped + the deferred DECISION-half (enriched 2026-06-24, slot:alpha)

**The gap:** `scripts/lib/advisory-decay.mjs` `classify()` computes an advisory hook's take-rate as `offloaded/suggested` WITHIN its own byHook bucket. A PURE-ADVISORY hook (large-read-digest-advisory) only `suggested++`; the real conversion (the user running the suggested execution) lands in a DIFFERENT bucket (`byHook["ollama-file-digest"].offloaded`). So the gate judges the advisory on its own always-0 `offloaded`.

**SHIPPED (MEASUREMENT half, this commit):**
- `CONVERSION_BUCKET_MAP` (advisory -> execution bucket): large-read-digest->ollama-file-digest, nav-rerank->ollama-nav-rerank, ollama-nav-enforce->ollama-prism-bridge. wiki-read-offload OMITTED (its /route-to-obsidian conversion is uninstrumented -> absent mapping yields `unmeasured`, never a false 0).
- pure `crossBucketTakeRate(stats, advisoryKey)` -> `{injected, taken, takeRate, conversionKey, status:'measured'|'unmeasured'}` (typeof-number guard on the conversion `offloaded`, mirrors classify; never throws/mutates).
- additive `decayReport` fields `crossBucketTakeRate`/`crossBucketKey` + an `xtake` column in `advisory-decay-report.mjs`.
- `decayDecision`/`classify` DELIBERATELY UNTOUCHED -- observability only. 26 tests; LIVE: large-read-digest `take=0.0%` own-bucket -> `xtake=0.8%` true cross-bucket (1/118).

**DEFERRED (DECISION half -- the next unit):** make `decayDecision` consult the cross-bucket signal (via `CONVERSION_BUCKET_MAP`) when judging a pure-advisory hook, so the MUTE decision uses the true take-rate instead of the own-bucket 0. **Why gated:** it re-judges the mute decision on the 4 wired hooks -> build WHOLE with full re-validation of each hook's mute status + tests; do NOT rush it (today both readings agree "below 5% / noise" for large-read-digest, so the decision is unchanged -- the fix only matters once some advisory's cross-bucket take-rate crosses 5%). Full spec: memory `reference_alpha_offload_stats_bump_dedup_2026_06_24`. Related: [[advisory-decay-gate]].