---
name: reference_golf_g5_boost_janitor_redundant_2026_06_09
description: "G5 (golf plan) VERDICT = CLOSE: the proposed active-chat boost-stamp janitor (FLEET-REAPER-MS4 deferral) is REDUNDANT. active-chat-priority-decay.mjs already TTL-sweeps every expired stamp incl. pid-less crashed-chat orphans, on every Stop fleet-wide; boost.mjs always writes a finite expiresAt (ttlSec clamp 60..1800) so the one gap (malformed expiresAt) cannot occur. The CLOSE-OUT-DEFERRED premise was stale."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_g5_boost_janitor_redundant_2026_06_09
---


**2026-06-09 (slot golf, /loop budget-iter-A G5 verify-gate).** Verdict: **CLOSE G5 — no janitor needed.**

**The premise (CLOSE-OUT-DEFERRED "FLEET-REAPER-MS4/active-chat-boost-stamp-janitor"):** "No cron or hook sweeps orphan stamps from `state/shared/.active-chat-boost/` if a chat crashes between boost-write and decay-delete → unbounded growth." **STALE / WRONG.**

**Verified ground truth (read both hooks):**
- `active-chat-priority-boost.mjs:102` writes `{pids, ttlSec, expiresAt: now + ttlSec*1000, ...}` where `ttlSec = clampTtlSec(env, default 300)` clamped to [60,1800] → **expiresAt is ALWAYS a finite number**. There is no code path that writes a stamp without a valid expiresAt.
- `active-chat-priority-decay.mjs` (Stop hook, fires on EVERY chat's Stop, fleet-wide) → `pickExpiredStamps` returns every stamp with `expiresAt <= now` (TTL-based, NOT owner-based); each expired stamp has its pids reverted to Normal then `unlinkSync`'d; a **pid-less stamp** (orphan from a crashed chat) hits the `pids.length===0 → drop the stamp` branch (decay.mjs:99-102). So a crashed chat's stamp is swept by the NEXT decay fire (any other chat's Stop) once its TTL passes.
- The only theoretical leak — a stamp with missing/non-finite expiresAt (which `pickExpiredStamps` skips forever, decay.mjs:45-46) — **cannot occur** because boost's ttlSec is clamp-finite.

**Conclusion:** decay.mjs IS the TTL janitor; orphans self-clean as long as ANY chat is active. Building a second janitor would duplicate it (DRY/dedup). G5 → CLOSED-REDUNDANT. The FLEET-REAPER-MS4 boost-stamp-janitor deferral should be reaped from CLOSE-OUT-DEFERRED as already-covered.

**Residual (optional, P3, NOT building now):** decay only fires on Stop — if the WHOLE fleet is idle (no Stops) an expired stamp lingers until the next Stop. Harmless (no pressure when idle). A belt-and-suspenders floor-age sweep in fleet-reaper-sweep.mjs could cover total-idle, but it's not worth a unit.

Relates to [[reference_golf_queue_completion_plan_2026_06_09]] (G5), the FLEET-REAPER-MS4 CLOSE-OUT-DEFERRED entries.