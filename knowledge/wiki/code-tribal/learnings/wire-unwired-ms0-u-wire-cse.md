# WIRE-UNWIRED-MS0/U-WIRE-CSE — [WIRE-UNWIRED-MS0]/U-WIRE-CSE+DME: wire CompactionStrategyEngine + DiffMinimizerEngine into prism_dev (7 actions)

**Commit:** `433d614c3e47` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:20:23-05:00
**Tags:** wire-unwired-ms0, u-wire-cse, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-CSE+DME: wire CompactionStrategyEngine + DiffMinimizerEngine into prism_dev (7 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-CSE+DME: wire CompactionStrategyEngine + DiffMinimizerEngine into prism_dev (7 actions)

Two pure dev-tool engines bundled because both fit in one test file.

CSE (4 actions) — context-window compaction planner:
- cse_plan: blocks + budget → {keep, compress, drop, savedTokens, ratio}
- cse_categorize: content + tool + age_seconds → ContentCategory
- cse_estimate_savings: blocks + budget → {canSave, percent}
- cse_recommend: one-line 'Compaction: keep N, ...' summary

DME (3 actions) — token-saving edit-diff minimizer:
- dme_minimize: file + target + new + context_window → MinimizedDiff
- dme_analyze_edits: batch → {totalEdits, avgs, estimatedTokens, canOptimize}
- dme_can_combine: edit-locations → adjacency clusters per file

Wire-safety doctrine:
- All 7 methods 100% pure (no I/O, no mutation)
- keep_count / compress_count / drop_count survivors alongside arrays
  (slimResponse strips empty bins; tests nullish-coalesce to []
   to avoid undefined.length fail-loud)
- ROUTING PROOFs: per-bin id-set equality (CSE) + byte-equal (DME)
- DoS guards: ≤10k blocks, ≤1k edits, ≤1 MB file content, enum-gated
  ContentCategory + Action

Tests: 27/27 PASS (5 CSE schema gates incl. DoS cap + VARIABILITY across
4 categorize paths + plan parity + ROUTING PROOF per-bin equality + 4 DME
schema gates + minimize unique + ambiguous + ROUTING PROOF + analyze
shape + canCombine empty/cluster paths + ROUTING PROOF + 3 schema-reject).
```

## Files touched (4)
- mcp-server/src/__tests__/dispatcher.cseDme.test.ts | 324 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  81 ++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  64 +++-
- 3 files changed, 468 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 433d614c3e47`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._