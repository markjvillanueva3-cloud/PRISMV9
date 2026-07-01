# WIRE-UNWIRED-MS0/U-WIRE-PROMPT-COMPRESS-FIXUP — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PROMPT-COMPRESS-FIXUP: dispatcher + schema wiring

**Commit:** `5ef9475683b8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:08:02-05:00
**Tags:** wire-unwired-ms0, u-wire-prompt-compress-fixup, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PROMPT-COMPRESS-FIXUP: dispatcher + schema wiring

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PROMPT-COMPRESS-FIXUP: dispatcher + schema wiring

Followup to 86af981425 — the prior commit (intended as the whole unit) only
captured the test file because the initial `git add` partially failed during
a host fork-storm (bash dofork ENOSPC). The dispatcher + schema halves of
the wiring landed in the working tree but did not make the staging area.

This commit completes U-WIRE-PROMPT-COMPRESS by landing:
  mcp-server/src/tools/dispatchers/contextDispatcher.ts        +27 LOC
  mcp-server/src/schemas/contextActionSchemas.ts               +22 LOC

ACTIONS additions:
  prompt_compress             prompt → CompressionResult
  prompt_is_worth_compressing prompt → { isWorthCompressing }

Schemas: both .strict(), prompt required (min(1) for compress).

Coverage: the 13 cases in contextDispatcher.promptCompression.test.ts
(shipped in 86af981425) verify this wiring end-to-end. Re-run:
  cd mcp-server && npx vitest run src/__tests__/contextDispatcher.promptCompression.test.ts

Action enum count: prism_context 85 → 87 (+2).
```

## Files touched (3)
- mcp-server/src/schemas/contextActionSchemas.ts     | 22 ++++++++++++++++++
- .../src/tools/dispatchers/contextDispatcher.ts     | 27 ++++++++++++++++++++++
- 2 files changed, 49 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ef9475683b8`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._