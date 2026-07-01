---
title: 8ms-timeout typo broke fleet-wide chat-slot heartbeat for ~weeks
category: lessons
domain: backend-dev
last_verified: 2026-05-18
slot-attribution: alpha
tags: [chat-slots, heartbeat, settings-json, hook-wiring, slot-drift, idle-eviction]
---

# 8ms-Timeout Typo Broke Fleet-Wide Chat-Slot Heartbeat

## The bug

`H:/.claude/settings.json` wired `heartbeat-keepalive.mjs` on `UserPromptSubmit` with `"timeout": 8` — milliseconds. The hook needs ~500ms to spawn `stable-session-id.mjs` + read `chat-slots.json` + conditionally call the `heartbeat` helper. So every fire **always timed out** before reaching the heartbeat refresh path.

Net effect: **the heartbeat never got refreshed by the auto-heartbeat hook for weeks** across the entire fleet. The only path that actually wrote `lastHeartbeat` was the explicit `chat-slots.mjs claim` / `heartbeat` actions on direct operator commands (`/checkin-<slot>`, etc.).

Combined with `UserPromptSubmit-only` wiring (no PostToolUse / Stop / SessionStart), this created the user-reported symptom:

> chats don't stay logged into their slots... seems like they might be exiting after your turn

Exactly right. After a turn ends, no UserPromptSubmit fires for the read-and-think gap. The 10-min `CRASH_TTL_MS` elapsed → `classifySlot` returned `"crashed"` → a peer chat's `/checkin-<slot>` with `--force` stole the slot.

## Why nobody caught it sooner

1. **classifySlot status was misleading**: it returns `"crashed"` based on heartbeat age alone, but the actual `reclaim()` path checks window-PID liveness and KEEPS the slot. So in fleet-status outputs, slots looked "crashed" while reclaim refused to evict them — operators thought it was working.
2. **Force-claim bypasses the PID gate**: `/checkin-<nato>` uses `--force true --confirmRecent true` which IS allowed to evict a heartbeat-stale slot. So peer chats running auto-`/checkin` could and did steal slots from operators who were just reading responses.
3. **Hook errors are silent on Tier-3**: the heartbeat-keepalive hook is tier-3 informational — failures don't surface anywhere. The 8ms timeout silently aborted every call.

## The fix

Four edits to `H:/.claude/settings.json` (per-machine config, not git-tracked):

1. **Critical**: `"timeout": 8` → `"timeout": 8000` on the existing `UserPromptSubmit` entry.
2. **Add** heartbeat-keepalive to **`SessionStart`** chain — refreshes on /compact resume.
3. **Add** heartbeat-keepalive to **`Stop`** chain — refreshes at end of every turn before chat goes idle. This is THE critical addition: it's the LAST event before the chat goes idle waiting for the user.
4. **Add** heartbeat-keepalive to **`PostToolUse`** chain — refreshes during tool calls (cheap fast-path skip when <60s old per `MIN_AGE_MS=60000`).

After the fix, my own slot's `lastHeartbeat` went from a 2h+ stale value to fresh-within-the-tool-call on the very next PostToolUse fire. Confirmed live.

## Verification

```bash
# Smoke-test the hook completes within budget:
echo '{"session_id":"<your-uuid>","prompt":"test"}' | "H:/.claude/bin/portable-node" .claude/hooks/heartbeat-keepalive.mjs
time ...  # ~500ms (was always >8ms, so always timed out before)

# Verify heartbeat is fresh:
node H:/prism/.claude/helpers/chat-slots.mjs find --chatId claude-<8hex>
# lastHeartbeat should be within the last 60s when the chat is active
```

## Knobs that still apply

- `PRISM_HEARTBEAT_KEEPALIVE_DISABLE=1` — kill switch
- `PRISM_HEARTBEAT_KEEPALIVE_MIN_AGE_MS=N` — refresh threshold (default 60s)

## Lessons

1. **Tier-3 silent hooks are footguns** — a hook that fails silently for weeks is worse than one that fails loudly once. Consider adding a one-line `stderr` advisory on Tier-3 timeout (the existing R12 fail-loud pattern, applied here).
2. **classifySlot should consider PID liveness** — the misleading "crashed" status when the window is alive is the secondary bug. Future fix: `classifySlot` returns `"idle-alive"` when heartbeat is stale BUT the encoded window PID is alive.
3. **Hook wiring must match event semantics** — heartbeat is "I'm still here." UserPromptSubmit-only wiring meant only operator-initiated activity refreshed it. Add to Stop + PostToolUse + SessionStart so all activity counts.
4. **Per-machine config drift** — `H:/.claude/settings.json` is per-machine; this fix needs to be re-applied on PC-B separately. The C: → H: mirror is for "wompu" user; this machine's user is "Mark Villanueva" so the mirror is a no-op here.

## Bug-class taxonomy

| Bug class | Pattern that prevents it | Example |
|-----------|--------------------------|---------|
| Silent tier-3 timeout | R12 fail-loud stderr on timeout | this bug |
| Heartbeat-only-on-UserPromptSubmit | Multi-event hook wiring (PostToolUse + Stop) | this bug |
| Status label diverges from actual eviction risk | classifySlot should include PID-alive check | classifySlot future fix |
| Force-claim bypass on still-alive chat | /checkin-<slot> should check PID too, not just `--force` | 2026-05-18 `U-SLOT-BIND-ENFORCE` (partial fix) |

## See also

- [[error-handling-patterns]] — Pattern 6 (process.exit codes) + the R12 fail-loud principle
- [[reference_fleet_reaper_ms2_2026_05_18]] — fleet-reaper handles the EVICTION side; this hook handles the KEEPALIVE side
- [[concurrency-and-locking-patterns]] — the slot-claim is a multi-writer state requiring atomic updates
- [[commit-subject-discipline]] — the U-SLOT-HEARTBEAT-FIX commit subject for this fix
