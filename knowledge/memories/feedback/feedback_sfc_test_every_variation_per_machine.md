---
name: feedback_sfc_test_every_variation_per_machine
description: "STANDING oscar/SFC mandate — the SFC sweep + closed-loop training + vendor comparison must cover EVERY variation and combination PER MACHINE (machines × spindles × controllers × materials × holders × fixturing/workholding × toolpath × finish/roughing); never re-scope to \"just tests\"."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.444Z
aliases: feedback_sfc_test_every_variation_per_machine
---


**STANDING MANDATE (operator, recurring 2026-06-17 — kept getting forgotten, so it is now anchored in galaxy doctrine §0 + here + the canonical spec).** The SFC sweep, the closed-loop training, and the G-Wizard/HSMAdvisor vendor comparison must be run across **every variation and combination possible, PER MACHINE** — not a representative sample, not top-N, not "≥3 spanning configs". Operator's words: *"we need to test every single variation and combination possible per machine"* and *"all machines, spindles, controllers, materials, holders, fixturing and workholding, tool path, desired finish or roughing."*

The per-machine axis space (one full sweep per real machine):
1. **machine** — OUTER loop. `ShopConfigurationEngine.getMachines()` → 12 SFC cutting machines (7 Okuma lathes LTH-01..07 + 5 mills VMC-01..05; EDM/WEDM/grinder/saw are NOT SFC speed/feed targets).
2. **spindle** (HP / max-rpm / thru-coolant / taper) — seated from each machine's REAL envelope.
3. **controller** — brand seated from machine; feature/option stack swept (`controller_features`; brand string is by-design inert).
4. **materials** — 6 ISO groups P/M/K/N/S/H (kc1.1 from `constants.ts`, never inline).
5. **holders** — connection type (14) × balance grade (6) × runout (5), gated by machine taper.
6. **fixturing + workholding** — 9 enum, gated by machine type (lathe → chuck/collet; mill → vise/fixture/tombstone).
7. **tool path** — operation (gated by type) × strategy (7) × radial/axial DOC.
8. **desired finish / roughing** — cut_type (3) × target_ra (5).
Plus tooling (material 6, diameter 5, flutes 4), coolant (7), optimization mode (3). The space is **billions per machine, hundreds of billions to trillions fleet-wide** — index-addressable + shardable (mirror `sfc-fullspace-enumerator.ts`); a session run is reaped >7–13 min, so the FULL run is a sharded scheduled job, never one-shot.

**Harness:** `mcp-server/scripts/sfc-per-machine-sweep.mjs` — iterates every real machine, seats its real envelope, sweeps all remaining axes within that machine's limits through the live `SpeedFeedNineAxisOrchestratorEngine`; `--full` shards the full space. Closest prior: `sfc-all-axis-sweep.mjs` (28 axes but on 2 SYNTHETIC baselines, not the 12 real machines — that is the gap the per-machine harness closes). Ledgers feed `sfc-closed-loop-cron.mjs`; parity via `sfc-full-sweep-compare.mjs`.

**Honest caveats (R12):** auto-calibration stays GATED until measured shop-floor actuals exist (ledgers hold emitted recommendations, not observed outcomes); "more accurate than G-Wizard/HSMAdvisor" is unprovable without actuals — the honest claim is *vendor-parity-confirmed + more situationally-correct* (force/SLD/thermal/tool-life clamps); the 5 mill `ShopConfigurationEngine` entries lack inline max_rpm/power — enrich with real OEM values (a surfaced follow-up), never silently fake.

**Why:** This goal was re-stated by the operator across multiple sessions because each chat kept narrowing it to a toy subset ("you only ever do like tests") or forgetting it entirely after compaction. The per-machine framing is the operator's reality: each real machine has its own spindle/controller/rigidity/power envelope, so "every combination" only means something *bounded to a real machine's limits*.

**How to apply:** Any oscar/SFC chat picking up sweep / closed-loop / vendor-comparison work runs `sfc-per-machine-sweep.mjs` (per-machine, all axes) — NOT a reduced material×ISO grid. Read galaxy doctrine §0 first. Spec: `state/shared/specs/SFC-PER-MACHINE-FULLSPACE-MANDATE-2026-06-17.md`. Related: [[feedback_all_means_all]] · [[feedback_never_assume_data_file_contents]] · [[reference_oscar_sfc_all_axis_sweep_2026_06_09]] · [[reference_oscar_sfc_deep_test_2026_06_17]].
