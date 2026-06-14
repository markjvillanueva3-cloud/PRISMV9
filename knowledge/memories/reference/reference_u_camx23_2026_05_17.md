---
name: reference_u_camx23_2026_05_17
description: U-CAMX23 — wired ProbeRoutineGeneratorEngine into PrintToProgram at semi→finish transition; 3 P1 fixes from per-file review
aliases: reference_u_camx23_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.991Z
---


**U-CAMX23 — Wire ProbeRoutineGeneratorEngine into PrintToProgram** (CAMX-MS0.3, 2026-05-17, slot kilo, resumed from crashed `claude-148fd42f` loop iter 4/10).

Commit: 2-file change in `PrintToProgramPipelineEngine.ts` (`generateProgram`) + new `CAMX-MS0.3-U-CAMX23-InProcessProbe.test.ts` (20 behavioral cases).

**What:** For a `MachinableFeature` with `tolerance_mm < 0.025` OR `surface_finish_Ra_um < 0.8` (strict `<`), `generateProgram` now auto-inserts a controller-specific in-process probe-inspection cycle (`probeRoutineGeneratorEngine.generatePartInspection`) at the `semi_finish`→`finish`/`pocket_finish` transition, once per feature. Controller derived from `input.machine_brand` (fanuc default).

**Key correctness traps (caught by per-file 2-reviewer gate, both PASS, 3 P1s fixed in-session):**
1. **Finish op is `finish` (bore/contour/groove) OR `pocket_finish` (pockets)** — `upgradeOperationsForQuality` splices literal `semi_finish` ahead of whichever exists. Gating only on `"finish"` silently misses every tight-tol pocket.
2. **Machine-safety**: `generatePartInspection` assumes a probe is pre-loaded and never stops the spindle. Splicing it raw fires `G65 P98xx` with the semi-finish endmill spinning → bore collision. Fix: emit `M05` + `M09` + `G91 G28 Z0` + probe-load gate before, `G91 G28 Z0` after, and `currentTool = -1` so the finish op cleanly reloads the cutting tool.
3. **`action_on_fail` by probe type**: alarm-on-fail is only meaningful where the probed value IS the toleranced dimension (bore/boss diameter). For surface/groove the probed value is a coordinate, not the nominal → alarm trips every part. Use `"skip"` for non-bore/boss.
4. **R12 fail-loud**: a critical feature whose op-list has no rough/finish pair (e.g. `fillet`→`["finish"]`, small hole→`["drill"]`) never gets a semi→finish transition, so no probe. Don't silently drop — emit a loud `(PROBE GAP: Feature X …)` banner before program end.

**Lesson:** when wiring engine A into orchestrator B, the splice point's *machine/tool state* matters as much as the data contract — a string-correct probe block can still be an unsafe NC sequence. Per-file 2-reviewer gate is what surfaced #2 (a correctness-only pass misses it). See [[feedback_parallel_scrutiny_per_file]], [[reference_u_wire_energy_2026_05_17]] (sibling wiring class).
