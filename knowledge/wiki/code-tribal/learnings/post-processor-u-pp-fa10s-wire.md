# POST-PROCESSOR/U-PP-FA10S-WIRE — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-FA10S-WIRE (slot:echo): stop FA10S silently mis-routing to MV1200R wrong dialect -- FA10S is MELCUT (M6/M7/M28/M80), caught before the generic MITSUBISHI branch -> fail-loud redirect to the verified WEDMPostMitsubishiEngine (wedm_post_mitsubishi_generate). +4 routing tests (44/44)

**Commit:** `5dbaa5753a96` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T09:31:27-05:00
**Tags:** post-processor, u-pp-fa10s-wire, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-FA10S-WIRE (slot:echo): stop FA10S silently mis-routing to MV1200R wrong dialect -- FA10S is MELCUT (M6/M7/M28/M80), caught before the generic MITSUBISHI branch -> fail-loud redirect to the verified WEDMPostMitsubishiEngine (wedm_post_mitsubishi_generate). +4 routing tests (44/44)

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-FA10S-WIRE (slot:echo): stop FA10S silently mis-routing to MV1200R wrong dialect -- FA10S is MELCUT (M6/M7/M28/M80), caught before the generic MITSUBISHI branch -> fail-loud redirect to the verified WEDMPostMitsubishiEngine (wedm_post_mitsubishi_generate). +4 routing tests (44/44)
```

## Files touched (3)
- .../__tests__/integration/MasterPostByMachineExpanded.integration.test.ts | 36 +++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/camDispatcher.ts                         | 17 +++++++++++++++++
- 2 files changed, 53 insertions(+)

## Lessons surfaced in commit body
- wrong dialect -- FA10S is MELCUT (M6/M7/M28/M80), caught before the generic MITSUBISHI branch -> fail-loud redirect to the verified WEDMPostMitsubishiEngine (wedm_post_mitsubishi_generate). +4 routing tests (44/44)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5dbaa5753a96`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._