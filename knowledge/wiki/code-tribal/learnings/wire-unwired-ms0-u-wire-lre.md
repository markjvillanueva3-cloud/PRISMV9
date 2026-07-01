# WIRE-UNWIRED-MS0/U-WIRE-LRE — wire LedgerRetentionEngine into prism_dev (6 actions)

**Commit:** `148c7b86cc75` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:31:04-05:00
**Tags:** wire-unwired-ms0, u-wire-lre, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-LRE: wire LedgerRetentionEngine into prism_dev (6 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-LRE: wire LedgerRetentionEngine into prism_dev (6 actions)

PP-0.16-U-OP6 hot/warm/cold retention tiering for the 5 append-only
ledgers. All methods pure (no I/O — caller passes entries).

- lre_get_config: {hotAgeDays, warmAgeDays}
- lre_get_retention_policy: {hot, warm, cold.archivePath}
- lre_classify: age_days → tier (boundary: ≤hot inclusive)
- lre_tier_of: entry+now_ms → {tier, ageDays, entry}
- lre_plan: entries+now_ms → RotationPlan (always emits hot action)
- lre_archive_dir_for: ISO → bare 'YYYY-MM' subdir name

NOT WIRED: getTier(Date) — Date isn't JSON-serializable over MCP;
equivalent semantics already exposed via lre_classify + lre_tier_of.

Wire-safety doctrine:
- All 6 methods pure; engine throws on unparseable timestamps so
  lre_tier_of / lre_plan / lre_archive_dir_for catch + emit error
  envelopes at the dispatcher boundary
- DoS guards: ≤50k entries per plan, ≤36500 age_days, ≤64-char ISO
- refine() on entry: must carry 'at' OR 'timestamp' (engine contract)
- action_count survivor — slimResponse strips empty actions[] arrays
  when present (engine guarantees ≥1 hot action though)
- ROUTING PROOF byte-equal on config, plan (frozen now_ms), archive_dir

Engine quirks discovered & documented in tests/schema:
- plan() ALWAYS emits hot action regardless of count (warm/cold only
  when count>0) — test asserts this invariant
- archiveDirFor() returns bare 'YYYY-MM' not 'archive/YYYY-MM/' —
  caller (rotate-ledgers.ts) is responsible for prefix

Tests: 27/27 PASS (6 schema gates incl. refine + DoS bounds +
boundary {hot at 7.0000 vs warm at 7.0001} + VARIABILITY across 3
tiers + 3 ROUTING PROOFs + 2 engine-throw → error-envelope tests
+ 3 schema-reject envelope checks).
```

## Files touched (4)
- .../__tests__/dispatcher.ledgerRetention.test.ts   | 258 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  45 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  61 ++++-
- 3 files changed, 363 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 148c7b86cc75`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._