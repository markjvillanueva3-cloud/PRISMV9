# SLOT-RECLAIM/U-TPIN-NULL-WINDOW-FALLBACK — [MAIN] [SLOT-RECLAIM]/U-TPIN-NULL-WINDOW-FALLBACK (slot:alpha): fix bravo self-compacted-but-didnt-reclaim-its-slot (terminal-pin null-windowId silent no-op)

**Commit:** `ab9c547a6a0d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T22:40:16-05:00
**Tags:** slot-reclaim, u-tpin-null-window-fallback, auto-distilled

## Subject
[MAIN] [SLOT-RECLAIM]/U-TPIN-NULL-WINDOW-FALLBACK (slot:alpha): fix bravo self-compacted-but-didnt-reclaim-its-slot (terminal-pin null-windowId silent no-op)

## Body
```
[MAIN] [SLOT-RECLAIM]/U-TPIN-NULL-WINDOW-FALLBACK (slot:alpha): fix bravo self-compacted-but-didnt-reclaim-its-slot (terminal-pin null-windowId silent no-op)

ROOT CAUSE (regression-hunter live-reproduced, HIGH confidence): session-start-terminal-pin.mjs:300-301 hard-exited with SILENCE when resolveWindowId() returned null -- BEFORE reaching the priorSlot resolution (line 321) + force-reclaim path (342). So a post-/compact window-id resolution miss (WT_SESSION absent + ancestor-walk flake, a known Win11 class) made the chat silently stay slotless. The sticky-cache fallback DATA was intact (lastKnownSlotForChat returns the slot) but the code path was unreachable past the line-301 gate. Every prior SLOT-DRIFT/SLOT-RECLAIM fix added richer fallback SOURCES, all downstream of this gate.

FIX: on a null windowId, instead of hard-exiting, resolve the prior slot via the EXISTING readPriorSlotFromHandoff (ps-pin -> handoff -> sticky-cache chain) and force-reclaim BY NAME (preferSlot path needs no windowId), double-gated by shouldForceReclaim (compact/clear only) + peerBlocksForceReclaim (never evicts a healthy operator-bound peer). Also: made --terminalWindowId conditional (empty value mis-parsed by chat-slots parseFlags as boolean true) + the chat-slots read PRISM_ROOT-aware (testability). Reuses already-tested pure gates -- no new decision logic. 8/8 node:test (6 decision-oracle + 2 subprocess smoke). Reclaim-write path validated by the regression-hunter live repro (CASE 1/2); a fully-hermetic reclaim oracle needs chat-slots DEFAULT_STATE_PATH injection (deferred -- it is hardcoded). Knob unchanged: PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM=1.
```

## Files touched (3)
- .claude/hooks/__tests__/terminal-pin-null-window-fallback.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/session-start-terminal-pin.mjs                       | 43 +++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 113 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab9c547a6a0d`
- Milestone envelope: `mcp-server/data/milestones/SLOT-RECLAIM.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._