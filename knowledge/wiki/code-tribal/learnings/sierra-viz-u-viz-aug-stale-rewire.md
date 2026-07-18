# SIERRA-VIZ/U-VIZ-AUG-STALE-REWIRE — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-REWIRE (slot:sierra): fix 4 of 8 STALE-ORPHAN augmentations folding 44-day-old data into the live graph every regen

**Commit:** `10d7942143ad` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:24:37-05:00
**Tags:** sierra-viz, u-viz-aug-stale-rewire, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-REWIRE (slot:sierra): fix 4 of 8 STALE-ORPHAN augmentations folding 44-day-old data into the live graph every regen

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-REWIRE (slot:sierra): fix 4 of 8 STALE-ORPHAN augmentations folding 44-day-old data into the live graph every regen

The freshness sibling of the dual-registration bug (iters 1-10): a *-augmentation.json
whose merge loadOptional() splice exists but whose generator is NOT in regen-viz FAST[]
-> merge folds the FROZEN file forever; graph shows GREEN (= re-merge recency, NOT data
freshness). audit-augmentation-freshness.mjs flagged 8, ~44 days (1051-1070h) stale.

Classified all 8 (9-agent workflow, all evidence verified by running each generator -- R15):
- REWIRE-FAST (3, validated cheap, added to FAST[]): merge-file-coverage-v2.mjs (159ms),
  build-novelty-catalog.mjs (322ms), heuristic-classifier.mjs (557ms). Sequential FAST[]
  so merge-file-coverage-v2 placed BEFORE heuristic-classifier (its input). All 3 refreshed.
- REWIRE-HEAVY (1, added to HEAVY[]): h-drive-skipped-census.mjs -- validated exit 0 in 65s,
  FS-walk no graph load, correct for --full only.
- KEEP-AS-IS (1): engine-spotlight.json -- hand-curated static catalog, no generator by
  design; commented in merge-augmentations so the freshness audit "stale" is understood.
- DEFERRED (2, R12 documented in HEAVY[] block): augment-graph-with-awareness.mjs +
  build-business-value-map.mjs are BROKEN on the 781MB graph -- JSON.parse(readFileSync utf8)
  hits V8's 512MiB string cap (exit 1). Need readGraphStreaming migration BEFORE wiring (R15:
  never wire a generator that cannot run). -> follow-up U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX.
- OPERATOR-GATED (1): h-drive-exhaustive-audit.ps1 -- PowerShell+VSS, needs elevation; .mjs
  HEAVY runner cannot host it; document the elevated scheduled-task path.

RESULT (proven, numbers): STALE-ORPHAN 8->4, fresh 103->107; dual-reg audit FAST 101->104 /
HEAVY 2->3 with 0 crashRisks / 0 silentDiscards (both-or-neither holds). New regression test
regen-viz-fast-order.test.mjs (4/4): asserts the 3 are FAST-registered, the B2->B3 order, and
the 2 broken stay UNWIRED until migrated. Auditor test 12/12 (no regression).
```

## Files touched (4)
- scripts/merge-augmentations.mjs       |  2 +-
- scripts/regen-viz-fast-order.test.mjs | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regen-viz.mjs                 |  8 ++++++++
- 3 files changed, 64 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til migrated. Auditor test 12/12 (no regression).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 10d7942143ad`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._