# U-ZULU08 — Account-Cycling Design Spec

**Date:** 2026-05-20
**Slot:** november/foxtrot (claude-5852a0b9)
**Status:** DESIGN-SPEC-COMPLETE (build awaits operator on the 3 credential-mechanism choices below).
**Closes:** the "design zulu to cycle through 6 accounts at 90% session limit, stagger chat continuation, 10-min cooldown" user directive (2026-05-20).

## Problem

A single Claude Max account hits the 5-hour rate-limit window before all 26 fleet chats finish their day's work. User has 6 accounts. The fleet needs a way to **swap the active account when session-limit pressure crosses 90%**, with:
- 10-min cooldown between account switches (avoid API-server "too many login attempts" errors).
- **Staggered chat continuation** — the 26 slots can't all resume from /compact at the same instant after a swap (rate-limit slam on the freshly-logged-in account).
- Zero credential storage in the repo (per the standing "no public H: drive" doctrine and basic security hygiene).

## Design (transport-agnostic)

Zulu orchestrator gains a **`account-cycle` sub-loop** alongside its existing slot-orchestration loop. State lives at `state/shared/zulu-account-cycle.json` (per-host, never committed):

```json
{
  "schemaVersion": "1.0.0",
  "accounts": [
    { "id": "acct-01", "lastActiveAt": "2026-05-20T10:00:00Z", "cooldownUntil": "2026-05-20T18:10:00Z" },
    { "id": "acct-02", "lastActiveAt": "2026-05-19T12:00:00Z", "cooldownUntil": null }
  ],
  "currentActive": "acct-01",
  "lastSwapAt": "2026-05-20T18:00:00Z",
  "swapHistory": []
}
```

### Trigger

Zulu reads `state/shared/token-budget-*.json` per-slot sidecars (from TOKEN-AWARENESS-MS0). When the **fleet-aggregate 5-hour pct ≥ 0.90** OR any individual slot hits CRITICAL zone AND `lastSwapAt > 10 min ago`, the swap fires.

### Swap mechanism — **3 PATHS, OPERATOR PICKS ONE**

**Path A — Separate `.claude/` dirs per account**
- 6 directories: `~/.claude-acct-01`, `~/.claude-acct-02`, etc., each with its own auth tokens.
- Zulu rotates `CLAUDE_CONFIG_DIR` env var, then signals existing chat processes to re-exec or new chats to spawn with the new dir.
- **Pro:** simplest, all 6 sets of creds live in dedicated dirs.
- **Con:** existing live chats need to reload — `/compact` + restart cycle required per swap.

**Path B — Swappable credentials file**
- One `.claude/` dir, but `claude.json` (or whatever token file Claude Code uses) gets atomically swapped from a `~/.claude-creds/acct-NN.json` pool.
- **Pro:** in-place swap, no env-var dance.
- **Con:** Claude Code may not detect a hot-swap; may need to send a process SIGHUP or kill + restart.

**Path C — Per-account `ANTHROPIC_API_KEY`**
- 6 API keys in a secrets pool (1Password, Bitwarden, env file outside repo).
- Zulu rotates `ANTHROPIC_API_KEY` in the harness env before each fresh chat spawn.
- **Pro:** cleanest separation, standard API-key rotation pattern.
- **Con:** API-key billing may differ from interactive-session billing on Max plans; need to confirm Anthropic terms allow this pattern.

## Staggered chat continuation

After a swap, the 26 slots can't all `/compact` + resume simultaneously. Zulu's resume order:
1. **Phase 1 (0-2 min after swap):** zulu itself + golf (hygiene) — 2 chats.
2. **Phase 2 (2-5 min):** the slot named in the most-recent operator activity (most likely to be needed). 1 chat.
3. **Phase 3 (5-10 min):** active slots with non-empty `slot-task-queues.json[slot]` (deduplicated, sorted by queue depth descending) — 4 chats per minute, max 16.
4. **Phase 4 (10+ min):** remaining slots (idle / empty queues) — opportunistic.

Each phase fires `/checkin-<slot>` via the existing U-CHO04 SendKeys actuator. Same 5-second stagger between sends per the zulu MS0 invariant.

## Safety invariants

1. **No credentials in repo** — every path stores creds OUTSIDE `H:/prism/`. The `state/shared/zulu-account-cycle.json` carries only account IDs + timestamps, never tokens.
2. **10-min hard floor on swap cadence** — `PRISM_ZULU_ACCOUNT_SWAP_MIN_MS` env knob, floor 600000 (10 min).
3. **Cooldown per-account** — an account just-swapped-out cannot be re-selected for 60 min (configurable).
4. **Operator override** — `PRISM_ZULU_ACCOUNT_CYCLE_DISABLE=1` halts the sub-loop; zulu falls back to single-account behavior.
5. **Audit trail** — every swap appends to `state/shared/zulu-account-cycle.json[swapHistory]` + a one-line entry to `AGENT_CHAT.jsonl`.

## 3 OPEN BLOCKERS — operator input required

1. **Which credential mechanism (A / B / C above)?** Each implies different swap code + different cred-storage doctrine.
2. **Where do the 6 sets of credentials live?** (1Password / Bitwarden / encrypted env file in `~/secrets/` / OS keychain — name the surface so zulu can know how to read it.)
3. **Per-chat consequence of mid-session account swap:** does the Claude Code harness transparently re-auth on the next request, or does a live `/loop` chat need a full restart? (Determines whether Phase 2-4 resume needs `/compact` + spawn or just continues.)

Once those 3 are named, build is straightforward (~3-5 units estimated):
- U-ZULU08-A: `account-cycle-lib.mjs` pure state-management (parse/select-next/record-swap/check-cooldown). ~150 LOC + 20 tests.
- U-ZULU08-B: credential reader (one of A/B/C per operator pick).
- U-ZULU08-C: integration into `zulu-orchestrator-sweep.mjs` main loop (check 5h pct → if ≥0.90 + cooldown clear, swap).
- U-ZULU08-D: staggered-resume Phase 1-4 logic.
- U-ZULU08-E: scheduled-task knob extension to surface `PRISM_ZULU_ACCOUNT_*` env to the sweep process.

## Out of scope (defer to MS1 or later)

- Auto-detection of account-billing-cycle expiry (not just session limits).
- Cross-host coordination (current zulu is single-host; multi-host account-pool sharing is a separate problem).
- Programmatic account-creation (operator manually onboards each new account).

## See also

- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — sibling research
- `knowledge/wiki/architecture/zulu-orchestrator.md` — predecessor MS0
- `mcp-server/data/state/token-budget-*.json` — the trigger source (5h-pct telemetry)
- TOKEN-AWARENESS-MS0 (CLAUDE.md) — `zone` / `quota` sidecar shape
