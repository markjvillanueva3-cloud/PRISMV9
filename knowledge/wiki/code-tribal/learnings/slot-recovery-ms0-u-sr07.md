# SLOT-RECOVERY-MS0/U-SR07 — [MAIN] [SLOT-RECOVERY-MS0]/U-SR07 (slot:golf /loop iter8): /checkin §Resume sidecar fallback block

**Commit:** `f0c7bba10e35` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T17:24:23-05:00
**Tags:** slot-recovery-ms0, u-sr07, auto-distilled

## Subject
[MAIN] [SLOT-RECOVERY-MS0]/U-SR07 (slot:golf /loop iter8): /checkin §Resume sidecar fallback block

## Body
```
[MAIN] [SLOT-RECOVERY-MS0]/U-SR07 (slot:golf /loop iter8): /checkin §Resume sidecar fallback block

Added §Resume sidecar subsection to .claude/commands/checkin.md
documenting the SLOT-RECOVERY-MS0 sidecar surface as a fallback when
the handoff is missing a ## RESUME block or composite.handoff.error ==
no_slot_handoff. Surfaces: prior session_id / ageHours / cleanExit
(crash-inferred per U-SR01) / last directive / last loop iter/target.

Fallback rule: cleanExit=false AND age<24h => prefer sidecar over
handoff (handoff may be pre-crash; sidecar reflects post-crash
invariant). Cross-references reference_slot_session_history_engine.

CLI fallback included while psk.mjs doesn't yet expose --include-sidecar
(separate follow-on; U-SR08 E2E test will reveal whether the kernel
needs the field exposed).

Ships:
- .claude/commands/checkin.md (+ §Resume sidecar block)
- queue entry marked complete
```

## Files touched (3)
- .claude/commands/checkin.md        | 19 +++++++++++++++++++
- state/shared/slot-task-queues.json | 11 +++++++++--
- 2 files changed, 28 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f0c7bba10e35`
- Milestone envelope: `mcp-server/data/milestones/SLOT-RECOVERY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._