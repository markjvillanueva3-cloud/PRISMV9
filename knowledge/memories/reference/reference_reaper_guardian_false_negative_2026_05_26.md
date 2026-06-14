---
name: reference_reaper_guardian_false_negative_2026_05_26
description: "Reaper-guardian banner emits \"not-registered\" while schtasks /Query confirms task Ready+scheduled — schtasks-parse path in golf-slot-reaper-guardian.mjs (or alpha-slot-reaper-guardian.mjs alias) has a detection bug."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.914Z
aliases: reference_reaper_guardian_false_negative_2026_05_26
---


# Reaper-Guardian "not-registered" false-negative (2026-05-26, slot:golf /loop iter2)

## Observation

UserPromptSubmit hook banner (from `golf-slot-reaper-guardian.mjs` / `alpha-slot-reaper-guardian.mjs` alias) reported:
> ⚠ SLOT GOLF — you OWN the [[reference_fleet_reaper|fleet reaper]], and its durable scheduled task ("PRISM [[reference_fleet_reaper|Fleet Reaper]]") is NOT REGISTERED (not-registered).

But `schtasks /Query /TN "PRISM Fleet Reaper" /FO LIST` returned:
```
TaskName: \PRISM Fleet Reaper
Next Run Time: 5/26/2026 10:32:15 AM
Status: Ready
```

Both readings happened seconds apart in the same session. The schtasks output is authoritative — the task IS registered and Ready.

## Root cause hypothesis

The guardian hook likely greps `schtasks /Query` output for a specific marker (e.g. `Status: Ready` or task path). When the task name has the leading backslash (`\PRISM Fleet Reaper` vs `PRISM Fleet Reaper`), or when the output language/encoding shifts (Win10/11 PS encoding differences), the grep misses and the hook defaults to "not-registered". Same class of bug as the `terminal-window-id.mjs` resolver issues fixed in [[reference_twid_resolver_cache_2026_05_15]].

## Impact

- Cosmetic — banner is misleading but the task itself fires on schedule.
- Risk: operator reads "not-registered" → runs `install-fleet-reaper-task.ps1` thinking they need to re-register → harmless re-install but wasted operator attention.
- The `--once` sweep that the banner kicks (pid 100608 in the observed run) is also redundant since the scheduled task is firing.

## Fix sketch (NOT done — autonomous-loop drift discipline capped at 1 extra tick this loop)

1. Locate `golf-slot-reaper-guardian.mjs` (probably under `.claude/hooks/`).
2. Find the schtasks-parse function (likely greps for `Status: Ready` or pattern-matches the task name).
3. Make the matcher case-insensitive + tolerant of the leading backslash + tolerant of the PS encoding variants.
4. Add a test that feeds canned schtasks output with the actual production format.

## Related

- [[feedback_autonomous_loop_drift_discipline]] — cap at ≤1 extra tick, record memory, return to loop purpose. Applied here.
- [[reference_fleet_reaper_ms2_2026_05_18]] — [[reference_fleet_reaper|fleet-reaper]] MS2 hardening.
- [[feedback_golf_owns_reaper]] — golf is canonical owner since 2026-05-16.
- [[reference_twid_resolver_cache_2026_05_15]] — same class of Win32 schtasks/PS parse drift.
