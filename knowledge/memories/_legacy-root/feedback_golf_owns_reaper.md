---
name: feedback_golf_owns_reaper
description: "The chat slotted into `golf` owns the fleet reaper — SUPERSEDES the prior alpha-owns rule (2026-05-16). Unifies fleet-hygiene under one slot (golf already hosts fleet-memory-monitor)."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:08.476Z
aliases: feedback_golf_owns_reaper
---


Standing rule (user directive, 2026-05-16): **"make it so golf is the new permanent /fleet-reaper monitor instead of alpha."** The chat holding the `golf` slot in `chat-slots.json` owns the FLEET-REAPER pipeline — it must keep the durable "PRISM Fleet Reaper" scheduled task registered + enabled and, ideally, run `/fleet-reaper` to also arm the in-session Monitor.

**Why golf instead of alpha (the shift):** alpha is the heaviest work slot in the 13-chat fleet by usage pattern; when alpha goes through `/compact` its in-session Monitor pauses and the guardian's "ensure + advisory" loop drops out of the fast path until alpha wakes up post-compact. Golf has historically been the hygiene slot — it already hosts fleet-memory-monitor (see [[reference_fleet_memory_monitor_2026_05_16]]). Pinning the reaper to golf unifies ALL fleet-hygiene surfaces under one slot, which is also the slot most likely to be doing low-token light-work (i.e. plenty of headroom to spawn detached sweeps without competing with feature work). The prior alpha-owns rule ([[feedback_alpha_owns_reaper]]) is SUPERSEDED — that memory remains on disk for history per [[feedback_never_delete_only_disable]].

**How to apply:** The `golf-slot-reaper-guardian.mjs` hook (wired into SessionStart + UserPromptSubmit in `settings.json`) enforces this automatically — for the golf chat it verifies the scheduled task, kicks a throttled detached `--once` sweep, and emits a LOUD advisory if the task is missing/disabled; every other chat is a silent no-op. If you ARE the golf chat and see that advisory, run `/fleet-reaper` (installing the task needs an elevated shell). Don't run `/fleet-reaper` from a non-golf chat — it's redundant. The `/checkin-golf` skill makes the doctrine non-skippable: every `/checkin-golf` runs the fleet-reaper section (sweep + scheduled-task check + persistent Monitor + kill-switch awareness). The prior `/checkin-alpha` "Fleet-reaper (always — alpha owns it)" section has been removed; the alpha guardian's settings.json wiring is preserved-but-unwired (file on disk, no entry in either UserPromptSubmit or SessionStart). Knobs: `PRISM_GOLF_GUARDIAN_DISABLE=1` (guardian off), `PRISM_GOLF_GUARDIAN_NO_SWEEP=1` (no detached --once kick), `PRISM_FLEET_REAPER_DISABLE=1` (whole reaper off — darkens all three arms, use sparingly). Back-compat: `PRISM_ALPHA_GUARDIAN_DISABLE=1` is still respected by the golf guardian as an off-switch alias so operators' carry-forward env vars don't accidentally light the new wiring. Related: [[reference_fleet_reaper_ms1]] (the U-PHASE2-ALPHA-GUARDIAN unit that originally shipped the guardian pattern), [[reference_fleet_memory_monitor_2026_05_16]] (the other golf-owned hygiene surface), [[feedback_alpha_owns_reaper]] (SUPERSEDED).


## Related
[[skills/fleet-reaper|/fleet-reaper]] • [[skills/compact|/compact]] • [[skills/disabled|/disabled]] • [[skills/checkin-golf|/checkin-golf]] • [[skills/checkin-alpha|/checkin-alpha]]