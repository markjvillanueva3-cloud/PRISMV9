# SLOT-RECOVERY-MS0/U-SR02 — [MAIN] [SLOT-RECOVERY-MS0]/U-SR02+U-SR03+U-SR04 (slot:golf iter2): 3 sidecar hooks + shared writer-side helper

**Commit:** `a2f1ac686594` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T14:45:13-05:00
**Tags:** slot-recovery-ms0, u-sr02, auto-distilled

## Subject
[MAIN] [SLOT-RECOVERY-MS0]/U-SR02+U-SR03+U-SR04 (slot:golf iter2): 3 sidecar hooks + shared writer-side helper

## Body
```
[MAIN] [SLOT-RECOVERY-MS0]/U-SR02+U-SR03+U-SR04 (slot:golf iter2): 3 sidecar hooks + shared writer-side helper

Closes the WRITE path for the per-slot session-id history sidecar. The
TS engine (U-SR01) handles the READ path; .mjs hooks write fire-and-forget
on SessionStart / UserPromptSubmit (heartbeat) / Stop.

Files shipped:
  - .claude/helpers/slot-session-sidecar.mjs (250 lines)
    Imports SLOT_NAMES from chat-slots.mjs (single source of truth).
    Exposes recordSessionStart / recordHeartbeat / recordSessionEnd /
    readAll / resolveSlotForChatId / resolveTranscriptPath. Crash-inferred
    invariant matches the TS engine's behavior exactly (proven by paired
    test suites).

  - .claude/helpers/slot-session-sidecar.test.mjs (21 tests, node:test)
    All 21 pass. Covers every method, every error path, the 4 exitStates,
    the crash-inferred invariant, retention pruning, corrupt-tail filter,
    and the slot/transcript-path resolvers. Zero presence-only assertions.

  - .claude/hooks/slot-session-sidecar-sessionstart.mjs (U-SR02, T3)
    SessionStart writer. Resolves slot from chat-slots.json via stdin
    session_id → claude-<8hex> chatId lookup. Surfaces crash-inferred
    to the model via additionalContext when synthesized.

  - .claude/hooks/slot-session-sidecar-heartbeat.mjs (U-SR03, T3)
    UserPromptSubmit heartbeat. 60s throttle per slot via mtime sentinel
    at state/shared/.slot-session-heartbeat-throttle/<slot>.ts. Pulls
    directive from chat-slots.json activity, loop iter/target from
    state/shared/loop-state/loop-<sid>.json, transcript stats from disk.

  - .claude/hooks/slot-session-sidecar-stop.mjs (U-SR04, T3)
    Stop writer (exitState=stop). Reads the slot's latest handoff to
    populate finalResume + handoffPath. Runs AFTER enforce-handoff-topic
    so the handoff filename is final.

Wired in C:\Users\wompu\.claude\settings.json (out-of-repo):
  - SessionStart chain: AFTER session-start-terminal-pin (slot binding ready)
  - UserPromptSubmit chain: AFTER heartbeat-keepalive (chat-slots refreshed)
  - Stop chain: AFTER enforce-handoff-topic (handoff filename settled)

All hooks T3 (observer) — never block. PRISM_SLOT_SESSION_SIDECAR_DISABLE=1
is the kill switch. Schema 1.0.0 matches U-SR01's engine.

Next: U-SR05 (launcher rewrite — 26-slot/4-window/--resume) + U-SR06
(/slot-resume skill) + U-SR07 (/checkin §Resume extension) + U-SR08
(end-to-end integration tests).
```

## Files touched (6)
- .claude/helpers/slot-session-sidecar.mjs           | 291 ++++++++++++++++++++
- .claude/helpers/slot-session-sidecar.test.mjs      | 297 +++++++++++++++++++++
- .claude/hooks/slot-session-sidecar-heartbeat.mjs   | 134 ++++++++++
- .../hooks/slot-session-sidecar-sessionstart.mjs    |  78 ++++++
- .claude/hooks/slot-session-sidecar-stop.mjs        | 135 ++++++++++
- 5 files changed, 935 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a2f1ac686594`
- Milestone envelope: `mcp-server/data/milestones/SLOT-RECOVERY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._