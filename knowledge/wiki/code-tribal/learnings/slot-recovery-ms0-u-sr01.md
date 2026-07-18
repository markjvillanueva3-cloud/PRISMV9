# SLOT-RECOVERY-MS0/U-SR01 — [MAIN] [SLOT-RECOVERY-MS0]/U-SR01 (slot:golf iter1): SlotSessionHistoryEngine foundation + 2 specs

**Commit:** `d02f713f0a68` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T14:36:36-05:00
**Tags:** slot-recovery-ms0, u-sr01, auto-distilled

## Subject
[MAIN] [SLOT-RECOVERY-MS0]/U-SR01 (slot:golf iter1): SlotSessionHistoryEngine foundation + 2 specs

## Body
```
[MAIN] [SLOT-RECOVERY-MS0]/U-SR01 (slot:golf iter1): SlotSessionHistoryEngine foundation + 2 specs

User directive (2026-05-25): overnight 20-chat fleet crash left operator
unable to map session-ids back to slots. The chat-slots.json schema stores
only the CURRENT chatId per slot — history is lost on death.

U-SR01 ships the per-slot session-id history sidecar engine:
  - state/shared/slot-sessions/<nato>.jsonl (append-only, one file per slot)
  - 3 event types: session-start / heartbeat / session-end
  - Crash-inferred invariant: SessionStart auto-closes any prior session
    that never wrote session-end (the central design — PC shutdown survival)
  - 7-condition resume-eligibility matrix for the launcher
  - Retention pruning (default 30 entries/slot)
  - getAllSlotsState() feeds the fleet-state dashboard (Phase B)
  - Corrupt-tail tolerance — readAll silently skips bad lines

Tests: 57/57 pass (vitest). Covers every method, every error path, all
4 exitStates, the crash-inferred invariant, every condition of the
eligibility matrix. Zero `as any`, zero presence-only assertions.

Specs shipped:
  - SLOT-RECOVERY-MS0.md (600 lines) — 17-unit milestone master plan
  - MCP-CAPACITY-MS0.md (500 lines) — 30-chat permanent fix plan (deferred)

Companion in-session work (not in this commit, persistent outside repo):
  - C:\Users\wompu\.claude\settings.json heartbeat-keepalive timeout 8→8000
    (U-FH01 of Phase C; fixed the 2026-05-18 documented regression)
  - PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 (operator-authorized for this
    milestone's writes outside golf's normal allowlist; logged per design)

Live MCP fix: restarted PRISM MCP Server scheduled task. Old PID 18428
was responding to /health in 4.5s (degraded); fresh PID 60664 now
responds in 0-1ms. Root-cause analysis in MCP-CAPACITY-MS0 §1-2.

Next: U-SR02 (SessionStart hook) + U-SR03 (heartbeat-keepalive chain
extension) + U-SR04 (Stop hook). Then U-SR05 launcher rewrite. Then
Phase B + Phase C.
```

## Files touched (5)
- .../src/__tests__/SlotSessionHistoryEngine.test.ts | 773 +++++++++++++++++++++
- mcp-server/src/engines/SlotSessionHistoryEngine.ts | 727 +++++++++++++++++++
- state/shared/specs/MCP-CAPACITY-MS0.md             | 174 +++++
- state/shared/specs/SLOT-RECOVERY-MS0.md            | 534 ++++++++++++++
- 4 files changed, 2208 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d02f713f0a68`
- Milestone envelope: `mcp-server/data/milestones/SLOT-RECOVERY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._