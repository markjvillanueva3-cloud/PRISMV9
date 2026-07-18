---
name: reference_oscar_task15_alu_clamp_coverage_2026_06_25
description: "Task #15 diagnosis+fix (slot:oscar, 2026-06-25): the calculator-machinist-allout-sanity failure was line 161 (unclampedAluminumVsSteel actual ~140 vs need >500), NOT line 162. Cause: aluminum 6061's correct roughing Vc ~628 m/min is RPM-clamped on 1765/1905 (93%) machine profiles at the test's tool diameters -- correct physics (side-effect of the material-aware Vc fix), not an engine bug. The per-profile aluminum>=steel ordering assert still passes. Fixed by correcting the stale coverage threshold (>500 -> >100), not by touching the engine."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.718Z
aliases: reference_oscar_task15_alu_clamp_coverage_2026_06_25
---


**Task #15 diagnosed + fixed (slot:oscar, 2026-06-25).** The pre-existing
`calculator-machinist-allout-sanity.test.ts` failure (surfaced this session, verified pre-session at
`1f7d03f33d`) was MISREAD as line 162; a live triage of the compute loop showed the real failing assert is
**line 161** `unclampedAluminumVsSteel > 500`.

**Triage numbers (live `speedFeedOrchestratorEngine.compute` over the 3 machine catalogs):**
- relevant profiles: **1905**
- `unclampedAluminumVsSteel` = **140** (need >500) -> THE failing assert
- `unclampedSteelVsToolSteel` = **1717** (need >500) -> passes
- clamped counts: aluminum **1765**, steel 188, tool_steel 17

**Root cause (NOT an engine bug):** the counters increment only when BOTH materials are below the machine
RPM ceiling (`spindle_rpm < machine_max_rpm`). Aluminum 6061 roughing Vc is ~628 m/min (correct for carbide
alu), which needs ~10-20k RPM at the test's 10-20 mm tool diameters, so aluminum is RPM-CLAMPED on **93%**
of the corpus. That is correct physics -- a SIDE-EFFECT of the material-aware Vc fix
(U-OSC9-SPEEDFEED-MATERIAL-AWARE, 2026-06-22, which gave aluminum its correct higher speed): faster alu ->
clamps more -> the unclamped-coverage counter dropped below the old `>500` bar that was calibrated to the
OLD (slower, rarely-clamped) aluminum speed. The per-profile `expect(aluminum.Vc >= steel.Vc)` sanity
(line 145) still runs + passes on every one of the ~140 unclamped cases.

**Fix (NOT softening):** corrected the stale COVERAGE threshold `unclampedAluminumVsSteel > 500 -> > 100`
(actual ~140, comfortable margin) with a full justifying comment; the steel/tool_steel bar stays `> 500`
(passes at 1717); the real per-profile ordering assertion is untouched. The engine is correct; the test's
coverage expectation was stale. Commit: see git log U-OSC-TEST15-ALU-COVERAGE.

**Sibling lesson:** a coverage-counter threshold over a machine corpus is brittle to legitimate physics
changes (a correct speed bump that increases clamping silently breaks an unclamped-coverage bar). Such
thresholds should be set with margin + a comment tying them to the clamping reality. The deeper fix (compare
material-Vc ordering on the UNCAPPED recommendation so clamping never reduces coverage) would need
SpeedFeedOrchestratorEngine to expose an uncapped Vc like UltimateSpeedFeedEngine now does
([[reference_oscar_sfc_vc_uncapped_parity_shipped_2026_06_25]]) -- queued as a future option.
