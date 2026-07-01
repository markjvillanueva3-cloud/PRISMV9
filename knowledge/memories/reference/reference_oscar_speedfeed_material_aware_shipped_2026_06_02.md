---
name: oscar-speedfeed-material-aware-shipped-2026-06-02
description: "SHIPPED Bug 1 fix: prism_calc:speed_feed is now material-aware. Re-routed the action to UltimateSpeedFeedEngine (MATERIAL_DB -> ISO group), flattened OptimizedValue -> legacy flat numbers. Al>steel>Ti proven. Follow-up U-OSC9-SPEEDFEED-PARAM-PASSTHROUGH (RPM uses default diameter until legacy param names mapped)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.717Z
aliases: reference_oscar_speedfeed_material_aware_shipped_2026_06_02
---


Closes the diagnosis [[oscar-speedfeed-material-blind-diagnosis-2026-06-01]] (Bug 1 of [[reference_sfc_speed_feed_bugs_2026_05_31]]). Commit on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-SPEEDFEED-MATERIAL-AWARE.

**What shipped:** `prism_calc:speed_feed` (calcDispatcher.ts ~line 1541) no longer calls the material-blind `calculateSpeedFeed` (which keyed Vc off tool material + hardness only → constant ~120 m/min for every workpiece). It now delegates to `ultimateSpeedFeedEngine.calculate()` — the material-aware authority where `MATERIAL_DB`/`MATERIAL_ALIASES` resolve the workpiece NAME → ISO group → canonical Kienzle/Taylor. The engine returns `OptimizedValue {value,unit}` per field; the handler flattens to the legacy flat-NUMBER shape `{cutting_speed, spindle_speed, feed_per_tooth, feed_rate, axial_depth, radial_depth, mrr}` via `usf.<field>?.value` (sole rename: `spindle_rpm`→`spindle_speed`). Compact `{Vc,fz,n,vf}` map reverted to original (route-contract preserved). `calculateSpeedFeed` (12 callers) + the `ultimate_speed_feed` action left UNTOUCHED.

**Why flat numbers (the prior FAIL):** an earlier attempt returned the OptimizedValue OBJECTS → broke `calc-actions.test.ts` (reads `r.cutting_speed` etc. as flat, asserts `>0`) and `mcp/outputSchemas.ts:46 SpeedFeedResultSchema` (declares `z.number()`). Lesson: a dispatcher result shape is a CONTRACT with both the zod outputSchema and existing tests — re-routing to a richer engine requires flattening to the declared shape, not surfacing the engine's internal value-objects.

**Proof (R9 reference-valued test):** `calcDispatcher.speed-feed-material-aware.test.ts` invokes THROUGH the dispatcher; asserts Al(ISO N) Vc > steel(P) Vc > Ti(S) Vc with spread (Al>1.5×steel, Ti<0.6×steel) on the DEFAULT full result — provably fails on the old constant stub (Taylor C: Al 700 >> steel ~300 >> Ti 120). tsc 0; 50/50 PASS; per-file scrutiny 2/2 PASS (code-analyzer + reviewer), zero P0/P1.

**Open follow-up (tracked U-OSC9-SPEEDFEED-PARAM-PASSTHROUGH):** the action still forwards raw legacy params; `UltimateSpeedFeedInput` expects `tool_diameter_mm`/`flutes`/`hardness_hrc`, so `tool_diameter`/`number_of_teeth`/`hardness_HRC` fall to engine defaults → `spindle_speed` RPM derives from a DEFAULT diameter, not the user's tool. Material-aware Vc (the Bug-1 goal) is unaffected because `material`+`flutes` flow correctly; RPM/feed_rate accuracy for a specific diameter is the next unit. Relates to [[oscar-seg-calib-forward-2026-06-01]].
