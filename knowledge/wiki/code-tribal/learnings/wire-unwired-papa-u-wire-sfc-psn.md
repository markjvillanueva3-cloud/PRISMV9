# WIRE-UNWIRED-PAPA/U-WIRE-SFC-PSN — [MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-SFC-PSN (slot:papa->oscar): wire SpeedFeedPSNDecisionPriorEngine.query -> prism_calc

**Commit:** `ef8ebf72aaeb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T11:45:32-05:00
**Tags:** wire-unwired-papa, u-wire-sfc-psn, auto-distilled

## Subject
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-SFC-PSN (slot:papa->oscar): wire SpeedFeedPSNDecisionPriorEngine.query -> prism_calc

## Body
```
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-SFC-PSN (slot:papa->oscar): wire SpeedFeedPSNDecisionPriorEngine.query -> prism_calc

Wire SpeedFeedPSNDecisionPriorEngine (OSCAR-SFC-9AXIS-MS0, slot:oscar) into
prism_calc: sfc_psn_decision_prior -> query(NineAxisInput). READ-ONLY surface --
fuses a speed/feed decision prior from 3 PSN sources (outcome-ledger JSONL +
tribal + wiki), best-effort per source, never throws (no data -> prior_exists:false,
"use pure physics" summary). The engine's priors + fusion physics are NOT edited
(oscar owns the SFC galaxy -- papa wires the read surface only).

- schema requires material + tooling (objects) + .passthrough(); the full 9-axis
  NineAxisInput schema is deliberately NOT re-derived (oscar owns it); the engine
  best-effort-extracts the rest. validated-boundary cast (as unknown as) documented.
- 8-test suite: hermetic engine-direct (constructor-injected tmp projectRoot ->
  empty sources -> deterministic prior_exists:false / per_source.length 3 / all
  confidences 0 / summary string / never throws), structural round-trip (3 sources
  fused, summary, fused present -- no flaky live-data assertion), 4 schema
  rejections (missing material/tooling, non-object material/tooling). tsc 0 new
  from sfc_psn symbols (total 638 = pre-existing baseline). vitest 8/8 PASS.
- 2 per-file scrutiny agents: both VERDICT PASS, 0 P0/P1; B's 2 P2s applied inline
  (fixture field tool_diameter_mm; symmetric non-object-tooling rejection).
  DEFERRED (B P2, -> oscar): a seeded-ledger positive-prior test pinning the
  fusion/recency math (needs oscar's speed_feed.jsonl row schema).

dup-checked all branches: oscar built it (2ec588cb2f), no peer wired it.
galaxy:oscar -> prism_calc; shared-tree fallback per
feedback_papa_cross_galaxy_work_commit_to_their_worktrees.
```

## Files touched (4)
- mcp-server/src/__tests__/calcDispatcher.uwireSfcPsn.test.ts | 140 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/calcActionSchemas.ts                 |   7 ++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts          |  10 +++++++++
- 3 files changed, 157 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ef8ebf72aaeb`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._