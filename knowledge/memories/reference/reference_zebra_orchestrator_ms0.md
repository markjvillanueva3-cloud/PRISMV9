---
name: reference_zebra_orchestrator_ms0
description: ZEBRA-ORCHESTRATOR-MS0 chat-fleet orchestrator — 7-unit milestone shipped 2026-05-20 wiring CHO01/02/04 + U-ZEBRA01/05 into an external SendKeys actuator that auto-fires /compact + /checkin-<slot> into opt-in chat windows
metadata:
  type: reference
---

ZEBRA-ORCHESTRATOR-MS0 shipped 2026-05-20 (slot bravo). Closes the hook ceiling — hooks can INJECT context and BLOCK tool calls but cannot INVOKE slash commands. The 5-min scheduled-task sweep IS the slash-command actuator.

**7 units shipped:**
- U-ZEBRA01 (`f11b586f99`) — HWND resolver (PID→Win32 MainWindowHandle via PowerShell), 30/30 tests.
- U-ZEBRA06 (prior) — `zebra-advisory-inject.mjs` UserPromptSubmit hook surfacing CHO01 decisions as context, 19/19 tests.
- U-ZEBRA05 (`1a88d07f71`) — backend-dev priority payload (U-WIRE*|U-BRIDGE*|U-HOOK*|U-INFRA*|U-DEVTOOL*|U-CK* FIRST), 28/28 tests.
- U-ZEBRA02 (`8ca37e8d82`) — main loop body composing CHO01/02 + U-ZEBRA01 + U-ZEBRA05 + U-CHO04, 33/33 tests + e2e smoke.
- U-ZEBRA03 (this session) — `install-zebra-orchestrator-task.ps1` durable scheduled-task installer (S4U/AtStartup/Restart3×1m, +420s phase offset).
- U-ZEBRA04 (this session) — pure drift-detection lib (`stale-loop-tick` + `topic-drift`), 25/25 tests.
- U-ZEBRA07 (this session) — 4-surface doc reflection.

**Safety invariants (load-bearing):** per-slot opt-in default FALSE; 24h dry-run grace from `zebraOptInAt`; `SELF_EXEMPT_SLOTS = ["zebra", "golf"]`; cascade kill switches `PRISM_ZEBRA_DISABLE` > `PRISM_ZEBRA_DRY_RUN` > `PRISM_SENDKEYS_DISABLE`; ≥5s stagger; R12 fail-loud reason on every log entry; single-host scope (chat-slots.json is per-host).

**Why an external actuator is the right tool:** hooks live inside the harness — they can read transcripts, write context, but they cannot generate the user-input that fires `/compact` or `/checkin`. Zebra runs in a separate OS process (scheduled task) and synthesizes keystrokes into the target chat's PowerShell window via UI Automation SendInput (U-CHO04). That's the only mechanism that crosses the harness boundary cleanly.

**Wiki:** [[zebra-orchestrator]]. **Doctrine:** [[feedback_prioritize_devtools_backend]] · [[feedback_high_roi_backend_first_slot_queue]] · [[reference_session_continuity_stack_2026_05_15]] · [[reference_fleet_reaper_ms1]] (sister scheduled task, same installer pattern).

**Next (deferred to MS1):** U-ZEBRA08 — account-cycling at 90% session limit (6 accounts × 10-min cooldown × staggered chat continuation). User-named 2026-05-20 in slot bravo. Design spec drafted; awaiting credential-handling clarification before build. See `state/shared/specs/U-ZEBRA08-ACCOUNT-CYCLE-DESIGN.md`.
