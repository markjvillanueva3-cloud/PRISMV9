---
title: PRISM session — terminal-window-id (4-tier window pin)
slug: terminal-window-id
kind: session
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
id_anchor: terminal-window-id
survives: [compact, claude.exe respawn, session-id rotation]
---

# terminal-window-id — 4-Tier Window-Pin Resolver

The window-identity primitive that pairs with [[stable-session-id]] to
make slot-binding survive Claude's per-session UUID churn. When the same
PowerShell window respawns `claude.exe` (via /compact, /clear, or fresh
invocation), the terminal-window-id stays constant — and that's the
anchor `session-start-terminal-pin.mjs` uses to re-bind the same slot.

## Resolution chain — 4-tier resolver

```
terminal-window-id.mjs (input: optional sessionId for cache key)
  ├─ Tier 0 — CACHE
  │    if .claude/cache/terminal-window-id-<sessionId>.json hits
  │    → return cached value (with auto-upgrade probe, see below)
  │
  ├─ Tier 4 — tw-wt (Windows Terminal)
  │    if env.WT_SESSION present → "tw-wt-<wt-session-uuid>"
  │
  ├─ Tier 3 — tw-pa (PowerShell ancestor)
  │    Get-CimInstance Win32_Process — walk parent PIDs to find
  │    the first non-shell-child ancestor (typically claude.exe);
  │    return "tw-pa-<that-pid>"
  │
  ├─ Tier 2 — tw-ps (PowerShell host process)
  │    return "tw-ps-<powershell.exe pid>"
  │
  └─ Tier 1 — tw-pp (parent PID, last resort)
       return "tw-pp-<process.ppid>"
```

The 4-tier ordering reflects **stability** — Windows Terminal session
UUIDs survive the most state churn; bare $PPID survives the least.
This session's slot was pinned via `tw-pp-59096` (tier-1, lowest-stability)
— and that proved sufficient for ~22 iters across multiple compacts.

## Hardening (2026-05-15)

Per `[[reference_twid_resolver_cache_2026_05_15]]` + `[[reference_twid_cache_hit_autoupgrade_2026_05_15]]`:

### Never-downgrade rule

Once a session has resolved at tier-N, a cached lower-tier result
cannot overwrite. Prevents flapping under intermittent failures
(e.g. wmic flaking on Win11 returning empty stdout that would
otherwise downgrade tier-3 → tier-1).

### Cache-hit auto-upgrade probe

When a cache-hit returns a tier-N result AND tier > N exists in the
resolver chain, a throttled probe (default 30s via
`PRISM_TWID_AUTOUPGRADE_THROTTLE_MS`) attempts to upgrade. If a higher
tier resolves, the cache entry is replaced with `upgradedFrom: <prev-tier>`
preserved as a lineage array.

**Why this matters:** without auto-upgrade, a session that first
resolved to a degraded tier (wmic flaked) would freeze at tier 1
forever. With the probe, the cache self-heals as resolvers come back
online.

### Tools

- **`Get-CimInstance Win32_Process`** replaced deprecated `wmic` —
  wmic-deprecation hit Windows 11 across the 2026-05 timeframe.
- **`PowerShell` invocation** with `-NoProfile -ExecutionPolicy Bypass`
  for sandboxed safety.

## Knobs

| Env var | Effect |
|---------|--------|
| `PRISM_TWID_CACHE_FILE` | Override cache file path |
| `PRISM_TWID_CACHE_DISABLE=1` | Disable cache (always cold-resolve) |
| `PRISM_TWID_TIMEOUT_MS` | Resolver subprocess timeout |
| `PRISM_TWID_AUTOUPGRADE_DISABLE=1` | Disable the cache-hit upgrade probe |
| `PRISM_TWID_AUTOUPGRADE_THROTTLE_MS=N` | Probe throttle (default 30000ms, floor 1000ms) |

The 1000ms floor on the throttle is a hard DoS guard — without it, an
attacker that could control session-id input could cause probe-storm
exhaustion.

## Composition with stable-session-id

```
stable-session-id  →  claude-41db1b82  (chat identity, 8-hex)
terminal-window-id →  tw-pp-59096      (window identity, 4-tier)
                            ↓
              session-start-terminal-pin reads chat-slots.json,
              finds slot=india with terminalWindowId=tw-pp-59096,
              re-binds claude-41db1b82 to slot india.
```

The two primitives ANCHOR each other — neither is sufficient alone:

- stable-session-id alone: survives PID changes but a NEW chat session
  in the same window gets a different UUID, breaking handoff lookup.
- terminal-window-id alone: identifies the window but doesn't know
  which chat session inside the window.

Together: each session's chat identity is tied to its window, and that
tie survives /compact + harness restart.

## Drift cases observed in this session

Same drift case as documented in [[stable-session-id]]:

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Iter 5: slot auto-pinned to `delta` post-/compact | terminal-window-id resolved to a different tier than pre-compact (tier-1 tw-pp-59096 had not yet been seen → cache miss → fresh resolve picked up a different anchor briefly) | `chat-slots.mjs claim --preferSlot india --force true --confirmRecent true` — operator-initiated correction. Future compacts in same window stayed on india via cache hit. |

The auto-upgrade probe is the mitigation — over time the cache entry
upgrades from tw-pp (tier-1) to a higher tier if available, making the
binding more stable.

## Safety properties

- **Tolerant** — never throws; degrades to tier-1 tw-pp as last resort.
- **Never-downgrade** — once high-tier resolved, low-tier cannot
  overwrite (prevents flap).
- **Throttled auto-upgrade** — 30s default throttle prevents probe
  storm under adversarial input.
- **Cache-keyed by sessionId** — each chat session gets its own cache
  entry; chats in the same window get independent entries.

## Doctrine pins

- **4-tier ordering is stability-not-precedence** — higher tier means
  more stable across state churn, not more authoritative.
- **`Get-CimInstance` not `wmic`** — wmic deprecated on Win11; resolver
  hardened 2026-05-15.
- **`PRISM_TWID_AUTOUPGRADE_THROTTLE_MS` floor 1000ms** — DoS hard
  guard. Cannot be bypassed below 1s.

## Related

- [[stable-session-id]] — sister; chat identity anchor
- [[slot-lifecycle]] — uses both resolvers in phase 4 RESUME
- [[checkin]] — phase-1 claim records the resolved twid
- [[whoami]] — surfaces twid in identity tuple (U-CK02 extension)

## See also

- `.claude/helpers/terminal-window-id.mjs` — actual resolver
- `.claude/helpers/stable-session-id.mjs` — sister resolver
- `.claude/cache/terminal-window-id-*.json` — per-session cache files
- `.claude/hooks/session-start-terminal-pin.mjs` — phase-4 consumer
