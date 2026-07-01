---
name: reference_slot_identity_cache_2026_05_17
description: SLOT-DRIFT-FIX-MS0/U-SDF13..U-SDF16 — sticky chatId→slot cache closes the /compact slot-drift class (writer race on chat-slots.json eviction). 4 commits 2026-05-17 slot bravo.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.919Z
aliases: reference_slot_identity_cache_2026_05_17
---


# Sticky chatId→slot cache — closes /compact slot-drift class (2026-05-17, slot bravo claude-339c8ff7)

**User report:** *"system still not working for chat slots to stay on the same powershell terminal"* + *"this chat was bravo but you and delta compacted the same time and you claimed delta instead of bravo"*.

**Root cause:** `precompact-handoff.mjs` sourced this chat's slot from `chat-slots.json` (ephemeral; binding wiped by heartbeat expiry / peer force-takeover / reclaim() before precompact ran). Lookup miss → writer logged `(precompact auto-write — slot unbound)` → omitted `slot:` frontmatter → all 3 U-SDF05 tiers (slot field / topic prefix / filename prefix) returned UNKNOWN → next session drifted to random slot. **Live verified:** chatId `claude-339c8ff7` drifted bravo → bravo → charlie → delta → unbound across its handoff history with the SAME stable chatId.

**Fix (4 commits this session):**

| Commit | Unit | Description |
|---|---|---|
| `590b565fb3` | U-SDF13 | NEW `slot-identity-cache.mjs` (130 LOC, 7 exports, atomic tmp+rename, path-traversal-safe regex) + 18 tests + wired into 3 chat-slots.mjs claim paths + 3 read-fallback sites (precompact / per-agent-handoff / session-start-terminal-pin tier-4) |
| `9ea2f9dcf5` | U-SDF14 | Karpathy R12 fail-loud: stderr-log persist failures (was silently swallowed) |
| `72e7683714` | U-SDF15 | PRISM_ROOT-derived default cache dir (cross-platform-ready) |
| `bc11938c6f` | U-SDF16 | /goal pre-flight `goal-prereq-inject.mjs` now subtracts CLOSE-OUT-DEFERRED entries from "Pending triage" list (4-day-stale "needs-triage" warnings were misleading operators) |
| `9f47f18ca9` | U-SDF19 | **The residual root cause.** U-SDF13 wired the cache into the 3 `claimSlot()` paths only; `heartbeat()` refreshes slot state but never wrote the cache. Any chat that claimed BEFORE U-SDF13 shipped (10:38 2026-05-17) or has only heartbeated since its original claim never got a cache file → still drifts on /compact. Observed live: 3 of 8 active peers (juliett claimed 04:37 / 6h pre-SDF13; lima+india heartbeat-only) had no cache. Fix: wire `_persistSlotForChat` into `heartbeat()` (same fail-loud try/catch) + one-shot backfill of all bound chats from chat-slots.json. Verified 19/19 + live clear→heartbeat→restore + fleet 8/8 healthy. |

**Storage:** `state/shared/chat-slot-history/<chatId>.json` — one tiny file per chatId, schema `{slot, recordedAt, host}`. Survives heartbeat expiry / peer force-takeover / reclaim. Each chatId writes ITS OWN file → no peer-write race.

**Write trigger (post-U-SDF19):** cache is written on EVERY successful `claimSlot()` return path (3 sites) AND on every `heartbeat()`. The heartbeat wire is load-bearing — without it, the cache only ever existed for chats whose most-recent slot-acquisition went through `claimSlot()` *after* U-SDF13 shipped. A chat doing the normal steady-state thing (claim once, heartbeat forever) would never get a cache. **Lesson: when retrofitting a persistence side-effect onto an existing state machine, wire it into the *refresh* path, not just the *acquire* path** — steady-state is the common case, acquisition is the rare one.

**Recovery chain (current):** (1) chat-slots.json lookup → (2) `slot:` field → (3) topic NATO-prefix → (4) filename NATO-prefix → **(5) sticky cache (U-SDF13)**.

**Safety:** cache is ADVISORY hint, not load-bearing claim. Cross-chat collisions still route through U-SDF06 auto-resolve. All wire-in sites try/catch fail-soft so broken cache never blocks the writer or pin. Path safety: regex `^[A-Za-z0-9_.-]{1,128}$` blocks `../`, `/`, `\`, nulls (tested).

**Per-file scrutiny gate:** dispatched 2 parallel reviewers covering whole U-SDF13 changeset in one round (not per-file — 4 of 6 files are 3-line additive wires consuming same helper with identical signature; flaw would be one finding repeated 4× — Karpathy R12 deviation logged). Arm A (code-analyzer): PASS 0 P0/P1, 2 P2 + 3 P3. Arm B (reviewer): PASS 0 P0/P1, 2 P2 + 6 P3.

**Reviewer P2 follow-ups closed in same session:** U-SDF14 (fail-loud) + U-SDF15 (PRISM_ROOT). Remaining P3 (stale-entry accumulation, no LRU/TTL) is operationally fine — ~24K files/year point-read, no readdir hot path.

**Wiki entry:** [[slot-identity-cache]] — `H:/prism/knowledge/wiki/architecture/slot-identity-cache.md`.

Related: [[reference_session_continuity_stack_2026_05_15]] (U-SDF02/U-SDF05/U-SDF07 terminal-window-id pinning that this completes), [[feedback_alpha_owns_reaper]] (fleet hygiene doctrine).


## Related
[[skills/compact|/compact]] • [[skills/goal|/goal]] • [[skills/catch|/catch]] • [[skills/shared|/shared]] • [[skills/chat-slot-history|/chat-slot-history]] • [[skills/year|/year]] • [[skills/prism|/prism]] • [[skills/knowledge|/knowledge]] • [[skills/wiki|/wiki]] • [[skills/architecture|/architecture]]