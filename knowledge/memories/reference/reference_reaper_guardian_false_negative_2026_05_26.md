---
name: reference_reaper_guardian_false_negative_2026_05_26
description: "Reaper-guardian banner emits \"not-registered\" while schtasks /Query confirms task Ready+scheduled — schtasks-parse path in golf-slot-reaper-guardian.mjs (or alpha-slot-reaper-guardian.mjs alias) has a detection bug."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.144Z
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

## RESOLVED 2026-06-14 (slot:golf, commit `fc27bddc99`)

Root cause was NOT the grep-miss hypothesized below. A schtasks-parse grep miss yields `status:"Unknown"` with `exists:true` (lines 183-189 of the current hook), NOT `"not-registered"`. The `"not-registered"` verdict comes ONLY from the gate `if (r.status !== 0 || !r.stdout)` at line 182. The real cause: `queryScheduledTask()` runs `spawnSync(schtasks, …, {timeout: 4000})`; a **4s TIMEOUT or spawn-refusal under fleet load** leaves `r.status === null` + `r.error` set (it does NOT throw, so it bypasses the `catch`) → `r.status !== 0` is true → falsely returns `"not-registered"`. Confirmed live 2026-06-14 during a 756-bash fork-storm: the guardian banner said NOT REGISTERED while dual-API ground truth (`Get-ScheduledTask` CIM + `schtasks /Query`) showed the task **Running** (`rc=267009`).

**Fix (commit `fc27bddc99`):** new exported pure helper `isTransientQueryResult(r)` (true for `r.error` / `r.status===null|undefined` / `r.signal`); `queryScheduledTask` returns `{status:"query-failed", transient:true}` for transient failures BEFORE the not-registered gate; the `catch` sets `transient:true`; `main()` gained an `if (task.transient)` branch (before `!task.exists`) emitting a soft "registration UNKNOWN this pass, NOT confirmed down" advisory instead of the alarm; plus a main-guard so the module is importable for the test. 7/7 unit tests (`golf-slot-reaper-guardian.test.mjs`). Validated: hook smoke `echo '{}' | node …` → `{"continue":true}`; the harness invocation path (`…portable-node …golf-slot-reaper-guardian.mjs`) ends in the filename, so the main-guard keeps production firing. The complementary leading-backslash / PS-encoding tolerance below was checked and is a non-issue (the State parse is already case-insensitive with an "Unknown" fallback; it never produces "not-registered").

### Original fix sketch (superseded — kept for history)
1. Locate `golf-slot-reaper-guardian.mjs` (probably under `.claude/hooks/`).
2. Find the schtasks-parse function (likely greps for `Status: Ready` or pattern-matches the task name).
3. Make the matcher case-insensitive + tolerant of the leading backslash + tolerant of the PS encoding variants.
4. Add a test that feeds canned schtasks output with the actual production format.

## Related

- [[feedback_autonomous_loop_drift_discipline]] — cap at ≤1 extra tick, record memory, return to loop purpose. Applied here.
- [[reference_fleet_reaper_ms2_2026_05_18]] — [[reference_fleet_reaper|fleet-reaper]] MS2 hardening.
- [[feedback_golf_owns_reaper]] — golf is canonical owner since 2026-05-16.
- [[reference_twid_resolver_cache_2026_05_15]] — same class of Win32 schtasks/PS parse drift.
