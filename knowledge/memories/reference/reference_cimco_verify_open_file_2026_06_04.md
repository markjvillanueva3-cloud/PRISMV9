---
name: reference_cimco_verify_open_file_2026_06_04
description: "CIMCO blind-safe External-Command post VERIFIER — FILE-channel proof loop made runnable (U-CIMCO-VERIFY-OPEN-FILE, slot:echo)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.518Z
aliases: reference_cimco_verify_open_file_2026_06_04
---


**CIMCO External-Command VERIFIER — U-CIMCO-VERIFY-OPEN-FILE (slot:echo, 2026-06-04, commit `b81369b3c3`)**

The runnable half of the blind-safe FILE-channel proof loop the launch-surface `integrationHook` described. Register `scripts/cimco-verify-open-file.mjs` as CIMCO Edit **External Command 1** (Editor Setup > External Commands). CIMCO passes the open NC (`$FILEPATH`); PRISM runs the offline arms and writes a verdict to `$OUTFILE` — pure FILE channel, **no UIA, no live license** (the nav-planner's `external-cmd` arm).

- Composes already-built arms (R8 reuse): `dialectLint` (G/M vocab vs JM goldens) + byte-equivalence (`nc-dialect-masks.roundTrip`: byte-identical | volatile-header-only | semantic-drift). CLI: positional `$FILEPATH` + `--golden --machine --out`; exit `0=cleared / 1=not-cleared / 2=FAIL / 3=error`.
- **FAIL-CLOSED (R12):** `cleared:true` is EARNED only by a golden byte-equivalence pass with no failures + no foreign-code warn. Empty NC / missing golden / semantic-drift / unknown dialect → never cleared. Clean lint alone is necessary-not-sufficient (byte-identity to a proven golden is the only clearance arm; it subsumes the lint). HONEST coverage — disclosed on every render that this is the static + byte-equiv verdict, **NOT** the collision/gouge sim verdict (UIA + license, SPINE-2).
- 13/13 tests; per-file 2-reviewer PASS 0 P0/P1 — arm-B P2 fixed (`dialectLint` override keyed on `family` not `dialect` — was a silent no-op) + unknown-dialect byte-identity clearance pinned with a regression test.

Iteration 2 of the CIMCO full-suite proveout `/loop`. Sibling: [[reference_cimco_nav_planner_2026_06_04]]. Wiki [[cimco-verification-simulation-integration]]. Hook surface: [[reference_cimco_launch_probe_2026_06_03]].
