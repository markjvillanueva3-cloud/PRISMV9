---
source: project
section: GOLF SLOT (dedicated hygiene chat — CLEANUP-MS0; position 7 of 26 in NATO sequence)
slug: golf-slot-dedicated-hygiene-chat-cleanup-ms0-position-7-of-2
indexed_at: 2026-06-21T04:20:36.203Z
---

## GOLF SLOT (dedicated hygiene chat — CLEANUP-MS0; position 7 of 26 in NATO sequence)

PRISM's dedicated hygiene chat slot — `golf` is position 7 of the 26-slot NATO sequence (`alpha..zulu` per `SLOT_NAMES` in `.claude/helpers/chat-slots.mjs`). Reserved for **fleet hygiene** — not feature work. Operators claim it with `/checkin --golf`; it sits alongside the 25 work slots (`alpha..foxtrot, hotel..zulu`) without competing for them. The "7th hygiene chat" historical name refers to its position when the fleet was 7 slots (alpha..golf, mid-2026-05-15); the role + position-in-sequence are unchanged through every expansion (7 → 10 → 12 → 13 → 26).

1. **Write-allowlist (U-CLEANUP-A5) — DOC-CORRECTED 2026-06-09: the hook is UNWIRED, do NOT rely on it as a live guard.** `golf-slot-write-allowlist.mjs` is preserved on disk (never-delete-only-disable) and *would* hard-block every Edit/Write/MultiEdit from a golf chat outside the `FALLBACK_ALLOW` set (`state/shared/dashboards/**`, named ledger JSONLs, named report dashboards, `AGENT_CHAT.jsonl`, `golf-*.json`, `.cron-locks/*.lock`, `state/shared/system-viz/staging/**`, `mcp-server/data/state/**.log`) — but it has **0 refs in all three settings.json** (verified 2026-06-09; control `golf-slot-reaper-guardian` = 2), so it does NOT fire. "Feature commits from golf are impossible by design" was the *intent*, not current reality. Golf currently operates as a normal work slot (per the 2026-05-20 operator directive). Re-wire the hook (and flip this note) if golf write-confinement is reinstated.
2. **Self-DOS deny (U-CLEANUP-B4)** — a golf chat may NOT disable its own watchdog/audit/cron/allowlist. Kill switch (#5) is operator-only; a golf chat that tries to clear its own gates is blocked at PreToolUse.
3. **Heartbeat** — no dedicated heartbeat file (R3-UU2). Liveness is the same `chat-slots.json` `lastHeartbeat` as work slots, queried via `node .claude/helpers/chat-slots.mjs golf-liveness` (U-CLEANUP-B8) — returns `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}` already classified.
4. **Audit query** — `/peer-audit` (planned U-CLEANUP-B4) surfaces what the golf chat has touched recently (chat-slots activity + AGENT_CHAT.jsonl + golf-envelope-mutations.jsonl).
5. **Kill switch** — *(planned, U-CLEANUP)* `PRISM_GOLF_DISABLE=1` will disable all golf-side cron + flip the allowlist to "deny all writes from a golf chat". For an immediate operator emergency today: `PRISM_GOLF_FAIL_CLOSED=1` (already wired in `golf-slot-write-allowlist.mjs`) hardens the allowlist to deny-all; bypass is `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (logged).
6. **Handoff naming (U-CLEANUP-A4)** — golf chats write `HANDOFF-golf-<task>.md` (slot-keyed), not `HANDOFF-<claude-id>-<topic>.md` (instance-keyed). Use `per-agent-handoff.mjs --slot golf` to read/write.
7. **Schema-bump cadence** — bump `chat-slots.json` `schemaVersion` only when `SLOT_NAMES` changes or `SlotState` fields rename. Rebuild stale slot files on bump; never silently migrate.
8. **Multi-host coexistence** — golf is a *role*, not a host-pin. One machine may host the full 26-slot fleet (`alpha..zulu`) together. Different machines may each run their own golf (lock files are per-host, no cross-host contention).

Skills + commands referencing golf: `/checkin --golf` · `node .claude/helpers/chat-slots.mjs golf-liveness` · `per-agent-handoff.mjs --slot golf` · `node scripts/fleet-status.mjs` (renders golf as a separate "hygiene" row).
