---
name: heartbeat-keepalive-8ms-typo-2026-05-18
description: 8ms timeout typo broke chat-slot heartbeat fleet-wide for weeks → idle chats reclaimed by peer /checkin. Fixed: timeout 8 → 8000 + wired heartbeat to SessionStart/PostToolUse/Stop.
metadata:
  type: reference
---

**2026-05-18, alpha (claude-3f96bb5e)** — root-caused "chats don't stay logged into their slots" to a 1-character typo in `H:/.claude/settings.json`: the `heartbeat-keepalive.mjs` hook was wired with `"timeout": 8` (milliseconds) instead of `"timeout": 8000`. The hook needs ~500ms to complete (spawn stable-session-id + read chat-slots.json + conditional heartbeat helper), so EVERY fire timed out before the heartbeat refresh path. For ~weeks.

**Symptom (user-reported)**: chats slot out mid-session, especially after the model's turn ends and the user reads/thinks. The 10-min `CRASH_TTL_MS` elapses → `classifySlot` returns "crashed" → peer chat's `/checkin-<nato>` `--force` reclaims the slot.

**Compounding factor**: `heartbeat-keepalive.mjs` was wired ONLY on `UserPromptSubmit`. Even at correct timeout, an idle chat (user reading response) has no UserPromptSubmit firing → no heartbeat refresh.

**Fix** (4 edits to `H:/.claude/settings.json`, per-machine config, not git-tracked):
1. `"timeout": 8` → `"timeout": 8000` on existing UserPromptSubmit entry
2. Add heartbeat-keepalive to **SessionStart** chain (refreshes on /compact resume)
3. Add heartbeat-keepalive to **Stop** chain (LAST event before chat goes idle — critical)
4. Add heartbeat-keepalive to **PostToolUse** chain (cheap fast-path skip when <60s, refreshes during my work)

**Verification**: my own slot's `lastHeartbeat` went from claimedAt+0 (2h+ stale) to fresh-within-tool-call on the very next PostToolUse fire. Hook smoke-test runs in ~500ms.

**Secondary bug still open**: `classifySlot()` uses heartbeat age alone, but `reclaim()` separately checks window-PID liveness. Status label says "crashed" while actual reclaim refuses to evict — misleading for operators. Future fix: include PID-alive in classifySlot to surface "idle-alive" status.

**Multi-machine**: H:/.claude/settings.json is per-machine. This fix is live on PC-A MarkV. PC-B needs same edit applied separately (mirror is C: → H: for wompu user; current user is "Mark Villanueva" so mirror is no-op).

Wiki: [[heartbeat-keepalive-timeout-typo]]. Sister: [[reference_session_continuity_stack_2026_05_15]], [[reference_slot_bind_enforce_2026_05_18]] (the force-claim half).
