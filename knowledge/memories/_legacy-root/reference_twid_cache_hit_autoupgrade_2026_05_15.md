---
name: reference-twid-cache-hit-autoupgrade-2026-05-15
description: "terminal-window-id cache-hit auto-upgrade probe — closes Reviewer B P2 on commit 59465d7c2 (CHECKIN-UPGRADE-MS0 follow-up). The never-downgrade rule's write-side compare was unreachable on cache-hit, so a session that first resolved to a degraded tw-pp tier could never upgrade even when better resolvers became available. Fix: throttled auto-upgrade probe on cache-hit when cached tier < MAX_TIER (4). Knobs: PRISM_TWID_AUTOUPGRADE_DISABLE=1 (off entirely), PRISM_TWID_AUTOUPGRADE_THROTTLE_MS=N (default 30000). Cache entries gain optional fields `lastProbeAt` + `upgradedFrom`. 35/35 vitest cases pass."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:10.018Z
aliases: reference_twid_cache_hit_autoupgrade_2026_05_15
---


# terminal-window-id cache-hit auto-upgrade probe (2026-05-15)

**Closes:** Reviewer B P2 on commit `59465d7c2` (CHECKIN-UPGRADE-MS0 follow-up, slot alpha, claude-6eac1b66).

**Problem:** The 2026-05-15 resolver-hardening (commit `5c4778b59`) added the never-downgrade rule for the write-side of `resolveTerminalWindowId`. It correctly prevented a later `tw-pp` resolution from overwriting an earlier `tw-ps`. But the cache-hit branch (`TIER 0`) short-circuited and returned the cached id before ever reaching the never-downgrade compare. Result: a session that wmic-flaked on its FIRST resolution (yielding `tw-pp-12345`) would freeze at tier 1 forever, defeating the rule's intent.

Reviewer B (slot bravo, 3-of-3 scrutiny arm) flagged this as P2.

**Fix:** On cache hit, if cached tier < MAX_TIER (4) AND `(now - lastProbeAt) >= AUTOUPGRADE_THROTTLE_MS`, run a fresh `computeFreshId()`. If `tierOf(fresh) > cachedTier`, replace the cache entry (set `upgradedFrom` to the old id) and return the fresh id. Otherwise record `lastProbeAt` and return cached.

**Throttle**: defaults to 30 seconds (`PRISM_TWID_AUTOUPGRADE_THROTTLE_MS=30000`). The fresh-compute path spawns `powershell.exe` (~50-200 ms), so we cap probe frequency to one per session per 30 s. Tunable for tests via the env knob.

**Disable**: `PRISM_TWID_AUTOUPGRADE_DISABLE=1` reverts to pure cache-short-circuit behavior — useful when probing causes contention on a CPU-starved fleet host.

**Cache entry schema (extended):**
```json
{
  "id": "tw-wt-abcdef12-3456-7890-abcd-ef1234567890",
  "tier": 4,
  "recordedAt": "2026-05-15T10:00:00Z",
  "lastSeenAt": "2026-05-15T16:30:00Z",
  "lastProbeAt": "2026-05-15T16:30:00Z",   // NEW — throttle key
  "upgradedFrom": "tw-pp-12345"            // NEW — only present when upgraded
}
```

**Tests:** `terminal-window-id.test.mjs` grew from 29 → 35 cases (6 new for auto-upgrade). All pass. One pre-existing test updated to assert against `PRISM_TWID_AUTOUPGRADE_DISABLE=1` because its original "cache always wins" invariant is intentionally relaxed by this fix.

**Why this matters:** The 7-chat (expanding to 10-chat) fleet uses terminal-pin to bind slots to PowerShell windows. A degraded `tw-pp-*` tier id is per-bash-call (not per-window-stable), so it defeats slot-pinning across `/compact` boundaries. The auto-upgrade probe ensures a degraded session self-heals once Get-CimInstance / wmic / WT_SESSION starts working again — within 30 s of the next resolver call.

**Post-scrutiny hardening (commit 92c262373, 2026-05-15):** 3-of-3 reviewer scrutiny on initial commit 9e67e2cde returned all FAIL with convergent P1s — module-load constant capture defeated per-call env override; THROTTLE_MS=0 caused probe-storm DoS; tautology test asserted only `typeof got === "string"`; knobs missing from CLAUDE.md + docblock. P3-SCRUTINY-FIXES commit closes all: throttle read at call-time via `autoUpgradeThrottleMs()`; hard floor `AUTOUPGRADE_THROTTLE_FLOOR_MS = 1000` via `Math.max()`; tautology test replaced with positive-path that seeds 1500ms-old entry + THROTTLE=1000 + WT_SESSION and asserts tw-wt match; `upgradedFrom` chained as array (back-compat auto-migrates legacy string); ORIG_ENV + resetEnv now include both new knobs; `MAX_TIER` derived from `Math.max(...Object.values(TIER_RANK))`; CLAUDE.md SESSION CONTINUITY STACK gained the auto-upgrade subsection with knob docs.

**Related:** [[reference_twid_resolver_cache_2026_05_15]] (original cache + never-downgrade), [[reference_session_continuity_stack_2026_05_15]] (the 4-piece autonomous loop this is part of).


## Related
[[skills/compact|/compact]]