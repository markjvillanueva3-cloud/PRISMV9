# TSC-FIX/U-TSC-LATHE-KGRAPH — [MAIN] [TSC-FIX]/U-TSC-LATHE-KGRAPH: MaterialNodeProps/OperationNodeProps/ToolNodeProps Record bridge (-7)

**Commit:** `f4f7df0ff314` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T16:18:00-05:00
**Tags:** tsc-fix, u-tsc-lathe-kgraph, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-LATHE-KGRAPH: MaterialNodeProps/OperationNodeProps/ToolNodeProps Record bridge (-7)

## Body
```
[MAIN] [TSC-FIX]/U-TSC-LATHE-KGRAPH: MaterialNodeProps/OperationNodeProps/ToolNodeProps Record bridge (-7)

3 store sites + 4 read sites in LatheKnowledgeGraphEngine.ts had drifted from
the GraphNode `properties: Record<string, unknown>` schema:
- store (908/928/948): props -> 'as unknown as Record<string, unknown>'
  (TS2352 "convert to unknown first" — the prescribed remedy in the error msg)
- read (2077/2078/2147/2177): properties -> 'as unknown as XNodeProps'

Pure type-bridge edits at the persistence boundary; no runtime behavior change
(the typed Props are themselves Record-shaped objects). Same double-assertion
pattern TypeScript's TS2352 message itself recommends for known-narrower
schemas crossing a heterogeneous-bag boundary.

tsc 530 -> 523 (-7).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- mcp-server/src/engines/LatheKnowledgeGraphEngine.ts | 14 +++++++-------
- 1 file changed, 7 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f4f7df0ff314`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._