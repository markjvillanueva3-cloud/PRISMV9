---
name: reference-fleet-reaper-ms2-2026-05-18
description: FLEET-REAPER-MS2 — enumeration cache (U-FR-S2) + cross-PC host filter (U-FR-S3) shipped 2026-05-18 from slot golf during a session that also applied 8 system perf fixes pre-reboot
metadata:
  type: reference
---

# FLEET-REAPER-MS2 (2026-05-18, slot golf, claude-b23a56ef)

Two strictly-additive units hardening the reaper for the 12-chat × 2-PC fleet.
Shipped from slot **golf** (the fleet-reaper owner per
[[feedback_golf_owns_reaper]]) during a session whose primary purpose was
**pre-reboot system tuning** on a new computer (MARKV, RTX 3080, Ryzen 5
5600X 6C/12T, 32 GB).

## Commits

- `b8b4a5ea78` — **U-FR-S2** enumeration cache sidecar (~70% duplicate
  `Get-CimInstance` cost cut)
- `7be1f77fab` — **U-FR-S3** cross-PC host-filter in `mapPidsToSlots`

Both commits verified post-write under our `git user` (no peer-hijack as in
[[reference_fleet_reaper_ship_collision]]).

## U-FR-S2 — enumeration cache

`state/shared/.fleet-reaper-enum-cache-<host>.json` with 60s TTL, atomic
write, per-host suffix. Wraps `process-slot-map.enumerateProcesses` via a
new pure-core helper at `.claude/helpers/fleet-reaper-enum-cache.mjs`. The
wiring at the 2 `runSweep` call sites in `scripts/fleet-reaper-sweep.mjs` is
**opt-OUT** — tests passing an explicit `opts.enumerator` bypass the cache
entirely, preserving the 82-case existing tier suite byte-identically.

Knobs: `PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE=1` (off),
`PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC=N` (default 60, clamped 5..3600).

56 `node:test` cases including a real-fs tmpdir integration oracle (the
"hermetic-fakes-don't-prove-production-wiring" defense per
[[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]).

## U-FR-S3 — cross-PC host filter

Optional 4th param `opts.host` on `mapPidsToSlots()` (defaults to
`os.hostname()`). A slot whose `host` field doesn't match the current
machine's hostname is skipped with a rolled-up caveat. Slots with no `host`
field fall through unchanged (backward compatibility for legacy slots and
single-machine setups). Case-insensitive + whitespace-tolerant compare.

The bug class this prevents: on shared `H:\`, `chat-slots.json` is the same
physical file from both PCs. Pre-S3, every sweep on PC-A iterated PC-B's
slots; if both PCs happened to share a PID number (OS recycles pids
per-machine), wrong slot attribution could escape into the candidate set.

12 `node:test` cases + regression check confirms 82/82 pre-existing tier
tests still pass.

## Brainstorm reversals (R12 honesty)

- **U-FR-S1 (per-chat Stop-hook throttle)** — planned, then on re-reading
  the existing global 45s stamp logic I realized it's already optimal at
  fleet scale (the global stamp bounds fleet-wide sweep frequency to ≤1/45s;
  per-chat stamps would multiply that by the chat count). Reversed
  in-session. **Marked won't-do.**
- **U-FR-A4 (per-host enumeration partition via WMI `-Filter`)** — ROI is
  marginal once S2 cache exists (saves only on cache MISS path, ~1-3s/min).
  **Deferred.** Re-open if cache hit rate stays low under real burst load.

## Sister session work (perf tuning, not committed code)

Same session also applied 8 system-level perf fixes (all in elevated
PowerShell from this golf chat):
1. Page file → `AutomaticManagedPagefile=true` (was 12 GB fixed; ~96 GB on
   demand after reboot)
2. `fsutil behavior set DisableLastAccess 1`
3. `Enable-MMAgent -PageCombining` (freed ~12 GB commit immediately)
4. `VisualFXSetting=2` (Best Performance)
5. NVIDIA `PowerMizerEnable=0` (P0 max-perf lock)
6. `~/.wslconfig` 6 GB memory cap + `wsl --shutdown`
7. Docker Desktop `AutoStart: True` (closes the post-reboot auto-start chain)
8. `prism-ollama` container recreated with `FA2 + 24h keep_alive +
   NUM_PARALLEL=4 + MAX_LOADED=3 + KV q8_0`

Plus the **fleet-reaper task itself re-registered as SYSTEM principal**
(was running as `Mark V` / `Limited` — too weak to kill elevated /
cross-context node orphans). This was the operator's named concern
("memory is at 95%, reaper isn't doing its job") and the U-FR-ADMIN-HUNT
2026-05-18 hotel ship was the prerequisite fix.

Plus **6 reaper env vars set Machine-scope** for aggressive defaults:
`KILL_AFTER=1`, `AGE_FLOOR_SEC=30`, `MEM_PRESSURE_PCT=85`,
`HINT_THRESHOLD_DELTA=-0.15`, `OLLAMA_KEEP_ALIVE=24h`, `SERVICE_RESTART=1`.

## Operator follow-ups (NOT done this session)

- **Reboot** — unlocks page-file scaling, applies VisualFX fully, lets
  containers re-test the full auto-start chain. Highest single remaining
  perf lever.
- **Windows Search index exclusion** for `H:\PRISM` — GUI step via
  `control srchadmin.dll`.
- **Git-tree pack/prune** — peer chat 5d30cbb7 ended at iter 5/8 with
  `endReason: blocked-operator-input-needed` on the 41 GiB loose-objects
  sweep. Destructive ops (`git gc --aggressive`, `git prune --expire=now`)
  need operator consent before re-engaging.
