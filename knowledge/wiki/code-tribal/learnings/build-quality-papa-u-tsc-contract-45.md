# BUILD-QUALITY-PAPA/U-TSC-CONTRACT-45 — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-CONTRACT-45 (slot:papa): 2 contract fixes (tsc 49->45)

**Commit:** `0a4ab936bece` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T08:26:21-05:00
**Tags:** build-quality-papa, u-tsc-contract-45, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-CONTRACT-45 (slot:papa): 2 contract fixes (tsc 49->45)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-CONTRACT-45 (slot:papa): 2 contract fixes (tsc 49->45)

- MastercamCodeGeneratorEngine: emitSketchSpline op.args.points cast through unknown
  (TS-recommended for a runtime-validated value with a [[0,0,0],...] default). TS2352.
- UnifiedProgramParserEngine: _detectCycleType returns "probe" but the local
  OperationType union lacked it -> added (fixes the === "probe" comparison + return,
  TS2367+TS2322). The .cyc template operation literal used a stale ParsedOperation shape
  (tool/speed_rpm/feed_ipm/doc_in/woc_in) -> rewrote to real fields
  (tool_number/spindle_speed/spindle_mode/feed_rate/feed_mode/depth_of_cut); g_code
  uses gCodes[0] ?? null (noUncheckedIndexedAccess made it string|undefined). TS2322.

Verified with NODE_OPTIONS=--max-old-space-size=16384 cold tsc (49->45).
```

## Files touched (3)
- mcp-server/src/engines/MastercamCodeGeneratorEngine.ts |  2 +-
- mcp-server/src/engines/UnifiedProgramParserEngine.ts   | 17 +++++++++--------
- 2 files changed, 10 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a4ab936bece`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._