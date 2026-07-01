# HERMES-MASTER-ORCHESTRATOR-MS0/U-SLOT-BRIEF-LANE-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MASTER-ORCHESTRATOR-MS0]/U-SLOT-BRIEF-LANE-FIX (slot:bravo): SlotBriefEngine — anchor lane to repo-root state/shared, not PATHS.STATE_DIR (channel was broken via MCP write path)

**Commit:** `39d14444dba2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T21:47:41-05:00
**Tags:** hermes-master-orchestrator-ms0, u-slot-brief-lane-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MASTER-ORCHESTRATOR-MS0]/U-SLOT-BRIEF-LANE-FIX (slot:bravo): SlotBriefEngine — anchor lane to repo-root state/shared, not PATHS.STATE_DIR (channel was broken via MCP write path)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-MASTER-ORCHESTRATOR-MS0]/U-SLOT-BRIEF-LANE-FIX (slot:bravo): SlotBriefEngine — anchor lane to repo-root state/shared, not PATHS.STATE_DIR (channel was broken via MCP write path)

R12 bug, found by actually verifying "is it up properly" via the Hermes venv MCP client. SlotBriefEngine resolved its lane from PATHS.STATE_DIR, which inside the running MCP server process resolves to `mcp-server/state` (cwd/__dirname-relative) — a DIFFERENT dir than the one slot-brief-inject.mjs reads (`H:/prism/state/shared/slot-briefs`). So briefs written via prism_context:slot_brief_write landed where NO hook would ever deliver them: the channel was silently broken end-to-end via the MCP path (the direct-file-write path happened to work only because it targeted the right lane).

Fix: hardcode SLOT_BRIEFS_ROOT = "H:/prism/state/shared/slot-briefs" (mirrors the proven ChatBusEngine.CHAT_BUS_ROOT cross-process pattern; matches the hook's `PRISM_ROOT || "H:/prism"` fallback exactly), overridable via PRISM_SLOT_BRIEFS_DIR (portability) + rootOverride (tests). Dropped the PATHS import.

VERIFIED LIVE after rebuild+server-restart, from the Hermes app's own venv mcp client (StreamableHTTP → :3100): slot_brief_write now lands at H:/prism/state/shared/slot-briefs/<slot>.md; slot_brief_list returns the repo-root lane; a real sierra chat consumed its queued brief through the hook (now in _delivered/). 13/13 tests still green (rootOverride-based), tsc 0-new. Tests didn't catch this (temp-root) — the gap was process-env path resolution, only observable against the running server.
```

## Files touched (2)
- mcp-server/src/engines/SlotBriefEngine.ts | 14 ++++++++++++--
- 1 file changed, 12 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till green (rootOverride-based), tsc 0-new. Tests didn't catch this (temp-root) — the gap was process-env path resolution, only observable against the running server.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 39d14444dba2`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MASTER-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._