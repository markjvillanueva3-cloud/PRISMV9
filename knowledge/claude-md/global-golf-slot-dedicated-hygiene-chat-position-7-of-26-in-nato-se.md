---
source: global
section: GOLF SLOT (dedicated hygiene chat — position 7 of 26 in NATO sequence)
slug: golf-slot-dedicated-hygiene-chat-position-7-of-26-in-nato-se
indexed_at: 2026-06-06T05:19:56.465Z
---

## GOLF SLOT (dedicated hygiene chat — position 7 of 26 in NATO sequence)

The dedicated hygiene chat slot. `golf` is position 7 of the 26-slot NATO sequence (`alpha..zulu` per `SLOT_NAMES` in `H:/prism/.claude/helpers/chat-slots.mjs`; expanded 13 → 26 on 2026-05-19 via SLOT-RECLAIM commit `ed5c49044b`). Reserved for **fleet hygiene** — not feature work. Claim with `/checkin --golf`; lives alongside the 25 work slots (`alpha..foxtrot, hotel..zulu`). The "7th hygiene chat" historical name is from the original 7-slot fleet; role + position unchanged through every expansion.

1. **Write-allowlist (A5)** — `golf-slot-write-allowlist.mjs` hard-blocks every Edit/Write outside `FALLBACK_ALLOW`: `state/shared/dashboards/**`, named ledger jsonls, named report dashboards, `AGENT_CHAT.jsonl`, `golf-*.json`, `.cron-locks/*.lock`, `state/shared/system-viz/staging/**`, `mcp-server/data/state/**.log`. Trust the hook's emitted block message — it's the canonical list.
2. **Self-DOS deny (B4)** — golf can't disable its own watchdog/audit/cron/allowlist; kill switch is operator-only.
3. **Heartbeat** — no separate file (R3-UU2). Reuses `chat-slots.json` `lastHeartbeat`. Query via `node .claude/helpers/chat-slots.mjs golf-liveness` (B8) — returns `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}`.
4. **Audit query** — `/peer-audit` (planned B4) surfaces recent golf activity.
5. **Kill switch** — *(planned)* `PRISM_GOLF_DISABLE=1` will disable golf cron + flip allowlist to deny-all. Today: `PRISM_GOLF_FAIL_CLOSED=1` hardens the allowlist to deny-all; bypass via `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (logged). Emergency only.
6. **Handoff naming (A4)** — golf writes `HANDOFF-golf-<task>.md` (slot-keyed). Read/write via `per-agent-handoff.mjs --slot golf`.
7. **Schema-bump cadence** — bump `chat-slots.json schemaVersion` only on `SLOT_NAMES` change or field rename; rebuild stale slot files, never silently migrate.
8. **Multi-host coexistence** — golf is a *role*, not a host-pin. One machine: full 26-slot fleet (`alpha..zulu`). Different machines may each run their own golf (per-host lock files, no cross-host contention).
