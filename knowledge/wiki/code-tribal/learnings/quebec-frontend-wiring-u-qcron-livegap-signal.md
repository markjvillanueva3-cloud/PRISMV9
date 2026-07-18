# QUEBEC-FRONTEND-WIRING/U-QCRON-LIVEGAP-SIGNAL — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-QCRON-LIVEGAP-SIGNAL (slot:quebec): repair FE-BE wiring cron's LF1 consumer + gate regression on LIVE gaps

**Commit:** `30c17bb26d69` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:24:00-05:00
**Tags:** quebec-frontend-wiring, u-qcron-livegap-signal, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-QCRON-LIVEGAP-SIGNAL (slot:quebec): repair FE-BE wiring cron's LF1 consumer + gate regression on LIVE gaps

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-QCRON-LIVEGAP-SIGNAL (slot:quebec): repair FE-BE wiring cron's LF1 consumer + gate regression on LIVE gaps

REGRESSION I introduced in U-CONTRACT-REACHABILITY (auto-fix inline): that unit split the contract auditor's flat gaps[] into liveGaps/orphanGaps, but qcron-fe-be-wiring.mjs still read contract.gaps -> undefined -> LF1 route-gap signal went DEAD (the exact downstream-shape-break class arm C flagged as a risk). The cron's whole purpose is a fresh FE-BE buildable-queue + regression alarm, so a null LF1 silently blinded it.

- extractContractGaps(contract): pure, exported, shape-tolerant -- reads new stats.liveGaps/orphanGaps, new liveGaps[]/orphanGaps[] arrays, OR legacy flat gaps[]/uncovered[]/gapCount (treated all-live, conservative). Preserves live=0 (not coerced to null). +6 tests.
- main(): pulse now carries lf1_live_gaps (the URGENT routed-reachable-404 signal) + lf1_orphan_gaps (dead-code, informational); regression gates on a NEW live broken wire (cg.live up), NOT orphan growth. Back-compat: lf1_route_prefix_gaps kept; prevLive falls back to old field. schemaVersion 1.1.0.
- LIVE: cron now reports 'LF1 live=1 orphan=2 (total 3)' (was null) -- the 1 live wire (/api/v1/ai) is now the continuously-monitored signal the operator's cron directive wants. 6/6 tests; node --check clean.
```

## Files touched (3)
- scripts/qcron-fe-be-wiring.mjs      | 51 ++++++++++++++++++++++++++++++++++++++++++---------
- scripts/qcron-fe-be-wiring.test.mjs | 36 ++++++++++++++++++++++++++++++++++++
- 2 files changed, 78 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till read contract.gaps -> undefined -> LF1 route-gap signal went DEAD (the exact downstream-shape-break class arm C flagged as a risk). The cron's whole purpose is a fresh FE-BE buildable-queue + regression alarm, so a null LF1 silently blinded it.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 30c17bb26d69`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._