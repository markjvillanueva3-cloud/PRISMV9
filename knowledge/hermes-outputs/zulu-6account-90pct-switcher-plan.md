# ZULU 6-Account 90% Runtime Staggered Switching — Completion Plan

**Current State:**
- `account-switch-restart-coordinator.mjs` + `claude-account-lib.mjs` + 5h gate exist.
- 3-window launcher uses initial staggered capture.
- Runtime 90% detection + live staggered restart for 6 accounts is incomplete.

**Missing Pieces to Build:**
1. Runtime token usage monitor (hook in PS tabs that reports ~90% of 5h limit).
2. Staggered restart coordinator that can act on live fleet (not just launch).
3. Integration with ZULU master context + live heartbeat.
4. Hermes-side action `fleet_account_switch` that triggers it safely.

**Design (user style — terse, real execution):**
- Each PS tab periodically reports its 5h weighted token % via bus.
- Coordinator watches for any tab ≥ 88%.
- When triggered: 
  - Identify next account in rotation.
  - Staggered relaunch of affected window (one tab at a time, wait for token accumulation).
  - Use existing `switch-claude-account.mjs --next --apply`.
- All under 4-LOOP + self-awareness.

**Next Autonomous Step:** Build the runtime monitor hook + extend the coordinator.

Status: Plan locked. Building implementation next.