# OBSIDIAN-AI-SYNERGY/U-AUDIT-WIRED-VIA-ENGINE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AUDIT-WIRED-VIA-ENGINE (slot:sierra): classify engine->engine (library-layer) consumption so library engines stop being mis-counted UNWIRED

**Commit:** `d0c46e3d347c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:51:18-05:00
**Tags:** obsidian-ai-synergy, u-audit-wired-via-engine, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AUDIT-WIRED-VIA-ENGINE (slot:sierra): classify engine->engine (library-layer) consumption so library engines stop being mis-counted UNWIRED

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AUDIT-WIRED-VIA-ENGINE (slot:sierra): classify engine->engine (library-layer) consumption so library engines stop being mis-counted UNWIRED

The unwired-engine audit (feeds BUILD_STATE NEEDS_WIRING + the fleet 'N unwired engines' count + /system-viz ghost-orphan roosts) scanned consumers = {dispatchers, routes, registries, orchestrators, hooks, singletons} but NOT plain engine->engine consumption. So a library-layer engine consumed only by other (non-orch/non-singleton) engines -- e.g. QdrantVectorStoreEngine (3 engine consumers) -- was mis-classified UNWIRED and chased as a false dispatcher-wiring target (R13 zero-gain churn).

Fix: extracted the classifier into a pure exported applyConsumerClassification(engines, consumerFiles, classification, {excludeSelf}) (testable without disk I/O) + added a LAST-priority WIRED-VIA-ENGINE pass over all engine files, self-excluded (an engine's own source never marks it wired). Dispatcher/route/etc wiring still wins (first-match priority); the engine pass only catches engines wired SOLELY via another engine.

VALIDATED LIVE (R15) on the real 3786-engine tree: UNWIRED 89 -> 66 truly-dormant + 23 WIRED-VIA-ENGINE library-layer (66+23=89 reconciles exactly). QdrantVectorStoreEngine reclassified OUT; LocalEmbedding/FormalVerification/SemanticAssetIndex (0 consumers) correctly stay dormant. 23/23 tests (18 predicate unchanged + 5 new: WIRED-VIA-ENGINE, priority-not-downgraded, self-exclusion, WIRE-EXEMPT-preserved, zero-consumer-dormant). The regenerated audit JSON is untracked local state; the committed script propagates the fix fleet-wide on next audit run.
```

## Files touched (5)
- mcp-server/web/src/__tests__/useHaptics.test.tsx     |  88 ++++++++++++++++++++++++++++++++
- mcp-server/web/src/__tests__/useThemeTokens.test.tsx | 146 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/hooks/useHaptics.ts               | 113 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/hooks/useThemeTokens.ts           | 213 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 560 insertions(+)

## Lessons surfaced in commit body
- till wins (first-match priority); the engine pass only catches engines wired SOLELY via another engine.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d0c46e3d347c`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._