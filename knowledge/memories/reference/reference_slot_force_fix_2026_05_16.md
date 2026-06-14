---
name: reference_slot_force_fix_2026_05_16
description: U-SLOT-FORCE-FIX — claimSlot --preferSlot --force now beats both inheritance early-returns; /checkin-<slot> NATO skills can finally move an already-slotted chat.
aliases: reference_slot_force_fix_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.952Z
---


**U-SLOT-FORCE-FIX shipped 2026-05-16** — commits `1fc318c31` + `54f0a2db8` (slot charlie, `claude-02436db5`, 2 files + a hardening follow-up). 3-of-3 scrutiny PASS, 6/6 test cases green.

**The bug.** `claimSlot()` in `.claude/helpers/chat-slots.mjs` had two early-returns that fired BEFORE the `--preferSlot`/`--force` block was evaluated: (1) the *chatId-already-owns* loop (lines 321-330) returned the slot the chat currently held, and (2) the *terminal-window-pin* loop (lines 336-361) returned the slot bound to the chat's PowerShell window. Net: every `/checkin-<slot>` NATO skill (alpha..lima) could only *confirm* an unslotted chat — it could not **move** a chat already pinned to another slot. Since every post-`/compact` chat is already pinned via the SessionStart `terminal-pin` hook, `/checkin-<slot>` was effectively a no-op for slot changes.

**The fix** is one `wantsDifferentSlot(currentSlot)` predicate applied to both loops:

```js
const wantsDifferentSlot = (currentSlot) =>
  typeof input.preferSlot === "string" &&
  SLOT_NAMES.includes(input.preferSlot) &&
  input.preferSlot !== currentSlot &&
  input.force === true;
```

When the predicate fires, release the current slot (`file.slots[n] = null; break;`) and fall through to the preferSlot force-takeover path. Operator-intent always beats inheritance. The CLI claim handler also now auto-resolves `terminalWindowId` via `resolveTerminalWindowId({ sessionId: flags.chatId })` so the window-pin moves with explicit slot changes (the threaded sessionId enables the per-session cache).

**Live observation.** This very session: `/checkin-lima` resolved to slot `charlie` because terminal-pin had already bound `claude-02436db5` → `charlie`. The 3-of-3 was even cross-marked under the wrong slot label until U-SLOT-FORCE-FIX-2 closed the loop.

**6 hermetic node:test cases:** T1 (chatId-owns + force → MOVES — the bug), T2 (same-slot no-op), T3 (plain re-claim preserved), T4 (force required), T5 (terminal-pin + force → MOVES + pin follows), T6 (recency-guard refuses → in-memory release does NOT persist to disk — rebuts a reviewer-feared leak class). Run: `"H:/.claude/bin/portable-node" --test .claude/helpers/chat-slots-force-fix.test.mjs`.

**Scrutiny lesson.** Arm C initially FAILed with 3 blockers; on re-review they explicitly retracted BLOCKER 1: *"My original BLOCKER 1 was wrong on premise — I read the recency guard as happening AFTER an in-memory release, but the code does guard-then-mutate."* The T6 regression-guard captures the load-bearing invariant either way — a future refactor that reordered guard-vs-mutate would fail T6 loudly.

**P2 deferred** (downstream concern, not introduced): a force-move from slot X → Y doesn't `cd` the operator out of slot X's worktree (per [[reference_slot_worktree_activation_2026_05_16]]). Pre-fix this was masked because the force-move silently no-op'd. A future follow-up could surface a `result.worktreeMoveRequired: true` flag for `/checkin-<slot>` to act on.

**Sister:** [[reference_session_continuity_stack_2026_05_15]] (terminal-pin design), [[reference_slot_worktree_activation_2026_05_16]] (slot/<name> branch system that exposes the worktree-cd concern).
