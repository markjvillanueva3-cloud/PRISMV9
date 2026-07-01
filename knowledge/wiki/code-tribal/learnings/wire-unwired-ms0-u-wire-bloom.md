# WIRE-UNWIRED-MS0/U-WIRE-BLOOM — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-BLOOM: wire BloomDedupEngine + AssetBloomFilters read-only into prism_dev (4 actions)

**Commit:** `3d5291f01061` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T22:43:31-05:00
**Tags:** wire-unwired-ms0, u-wire-bloom, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-BLOOM: wire BloomDedupEngine + AssetBloomFilters read-only into prism_dev (4 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-BLOOM: wire BloomDedupEngine + AssetBloomFilters read-only into prism_dev (4 actions)

BloomDedupEngine + AssetBloomFilters (Phase 0.22) provide probabilistic
duplication detection — load-bearing under DuplicationGuardEngine. 0
dispatcher refs before this, 34/34 engine-direct tests green. add/clear/
merge/import DEFERRED (U-WIRE-BLOOM-WRITE) — they mutate the bloom-filter
state that the dedup-guard relies on.

AssetBloomFilters ships 12 pre-built type filters at construction
(engine/action/skill/hook/formula/algorithm/tribal_tip/playbook_rule/
schema/dispatcher/route/test), each optimized for ~2000 items @ 1% FPR.

4 actions wired:
  - dedup_might_contain       → assetBloomFilters.mightContain(type, name)
  - dedup_is_definitely_new   → assetBloomFilters.isDefinitelyNew(type, name)
  - dedup_asset_stats         → assetBloomFilters.getStats()
  - dedup_bloom_check         → bloomDedupEngine.checkDedup(name)

Surfaces:
  - devDispatcher.ts: +4 ACTIONS enum entries + 4 case blocks (lazy import,
    inline param-presence guards mirroring the txn_get_mutations pattern;
    asset_type/assetType camelCase alias resolved inline)
  - devActionSchemas.ts: +4 Zod schemas with refine() guard requiring
    either asset_type OR assetType non-empty for the membership actions
  - dispatcher.bloomDedup.test.ts: 18 cases (6 schema + 12 round-trip)
    - ROUTING PROOF: engine-direct add via singleton → wire query returns
      true (must hit the same shared Map state)
    - 12-type ASSET stats cross-checked key-by-key vs engine-direct getStats()
    - DedupCheckResult name field round-trip (engine echoes queried name)
    - {error, details} envelope verified — refine message surfaces in details
    - beforeEach clears bloomDedupEngine to keep dedup_bloom_check isolated;
      assetBloomFilters intentionally NOT cleared (test sentinels are unique)

Lesson captured: when wiring a bloom-filter API, READ the engine's exported
field names first — assumed `capacity`/`isDuplicate` from typical bloom API
conventions, actual fields are `size_bits`/`might_exist`. Test re-runs
caught all 4 failures in one cycle, fixed without weakening assertions.

Test result: 52/52 PASS (18 round-trip + 34 engine-direct).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../src/__tests__/dispatcher.bloomDedup.test.ts    | 276 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  27 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  48 +++-
- 3 files changed, 350 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- Lesson captured: when wiring a bloom-filter API, READ the engine's exported

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3d5291f01061`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._