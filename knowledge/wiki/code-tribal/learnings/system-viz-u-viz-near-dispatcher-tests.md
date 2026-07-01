# SYSTEM-VIZ/U-VIZ-NEAR-DISPATCHER-TESTS — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-DISPATCHER-TESTS (slot:sierra): close 2 scrutiny P2s -- pin params.ids-ignored + k-cap-before-runCli (8->10 tests)

**Commit:** `7b1473e58644` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:31:26-05:00
**Tags:** system-viz, u-viz-near-dispatcher-tests, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-DISPATCHER-TESTS (slot:sierra): close 2 scrutiny P2s -- pin params.ids-ignored + k-cap-before-runCli (8->10 tests)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-DISPATCHER-TESTS (slot:sierra): close 2 scrutiny P2s -- pin params.ids-ignored + k-cap-before-runCli (8->10 tests)

Per-file 2-arm scrutiny PASS with 2 matching P2 notes: no test pinned that node_near
ignores params.ids (it is single-id, unlike node_card's ids[]) and the runner test count
was 8 vs the 10 convention. Added: (1) params.ids alone -> no id -> fail-soft requires-id;
(2) k=9999 -> runCli receives MAX_NEAR_K=100 (argv cannot be inflated by a pathological k).
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/sessionNodeNearAction.test.ts | 14 ++++++++++++++
- 1 file changed, 14 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b1473e58644`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._