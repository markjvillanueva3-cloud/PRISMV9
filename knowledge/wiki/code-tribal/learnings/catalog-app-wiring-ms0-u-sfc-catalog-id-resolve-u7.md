# CATALOG-APP-WIRING-MS0/U-SFC-CATALOG-ID-RESOLVE-U7 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-SFC-CATALOG-ID-RESOLVE-U7 (slot:romeo): SFC resolves real cataloged tool geometry from the 62.7K corpus by tool_catalog_id

**Commit:** `3131f8ccae2a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T12:54:09-05:00
**Tags:** catalog-app-wiring-ms0, u-sfc-catalog-id-resolve-u7, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-SFC-CATALOG-ID-RESOLVE-U7 (slot:romeo): SFC resolves real cataloged tool geometry from the 62.7K corpus by tool_catalog_id

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-SFC-CATALOG-ID-RESOLVE-U7 (slot:romeo): SFC resolves real cataloged tool geometry from the 62.7K corpus by tool_catalog_id

SpeedFeedOrchestratorEngine.resolveTool() now takes an optional tool_catalog_id (e.g. "corpus:Accupro:ACCU-0.0625") and resolves the EXACT cataloged geometry from toolCatalogEngine (loaded via the corpus loader) BEFORE the fuzzy ToolRegistry fallback. This is the SFC half of the goal — the saleable Speed/Feed Calculator now sees the full corpus, not its small hand-wired set.

Fixed require()->top-level import: the orchestrator used require("./CatalogCorpusLoaderEngine.js") which FAILS in ESM/vitest (Cannot find module). No circular dependency exists (neither engine imports the orchestrator), so top-level import is the correct pattern — caught by the round-trip test resolving to the 10mm default.

Tests: 3/3 — real ref Accupro ACCU-0.0625 resolves to 1.587mm (not 10mm default) + bogus id fails soft (no throw, falls to default) + explicit tool_diameter_mm overrides (user_input wins). NOTE: 4 pre-existing failures in speed-feed-orchestrator-dedicated.test.ts (cache/CAM-strategy fidelity) are NOT from this change — stash-verified they fail without it.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-catalog-id-resolve.test.ts | 65 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts   | 35 +++++++++++++++++++++++++++++++++--
- 2 files changed, 98 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- NOTE: 4 pre-existing failures in speed-feed-orchestrator-dedicated.test.ts (cache/CAM-strategy fidelity) are NOT from this change — stash-verified they fail without it.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3131f8ccae2a`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._