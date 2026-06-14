---
name: reference_sfc_speed_feed_bugs_2026_05_31
description: "Two prism_calc SFC bugs (speed_feed material-blind, ultimate_speed_feed diameter-blind) + drill op-path gap — for oscar"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.932Z
aliases: reference_sfc_speed_feed_bugs_2026_05_31
---


# SFC speed_feed bugs found via live :3100 audit (slot echo, 2026-05-31)

While wiring the post-NC conformance verifier to the live SFC (`prism_calc` over the `:3100` HTTP bridge), an empirical audit found two real engine bugs in the speed-feed surface. **Owner = oscar (Speed-Feed Calculator galaxy).** Echo routes feed/speed to oscar per its soul; surfacing here for the fix.

**Bug 1 — `prism_calc:speed_feed` is material-BLIND (a stub).** Returns `Vc = 120 m/min` for *every* material (1045 steel == 6061 aluminium == Ti-6Al-4V), *every* coolant (flood/none), *every* coating (TiAlN/none), and *every* operation (face/drill). It only does `n = Vc/(πD)` arithmetic on a constant. A real SFC gives Al ≈ 2.6× steel, Ti ≈ 0.33× steel. → its material/coolant/coating lookup is not wired.

**Bug 2 — `ultimate_speed_feed` was diameter-blind — FIXED 2026-05-31 (U-SFC-ENGINE-FIX, commit 4abd8d9156).** Root cause was NOT the engine: `UltimateSpeedFeedEngine` reads `tool_diameter_mm`, but `calcDispatcher`'s param normalizer only mapped `diameter`/`toolDiameter` → `tool_diameter`, never `tool_diameter_mm` — so the diameter never reached the engine and it defaulted to a 12 mm tool (every dia → 3714 rpm). Fix = one additive normalizer line `tool_diameter → tool_diameter_mm`. Verified live on :3100 after rebuild+restart: tool_diameter 50.8→877, 25.4→1754, 12.7→3509, 6.35→7018 (impliedDia matches input). `ultimate_speed_feed` is now FULLY correct (material-aware Vc + diameter-correct, machine-clamped rpm) for ALL callers. NOTE: that edit accidentally flipped calcDispatcher.ts LF→CRLF; restored to LF in U-SFC-CRLF-NORMALIZE (watch the Edit tool's line endings on this file).

**Gap 3 — drill operation-path.** `ultimate_speed_feed` with `operation:"drill"` still returns the *milling* Vc (459 SFM for a ¼" drill = far too fast for drilling steel, which wants ~60–100 SFM). Drilling needs its own Vc table, not the milling one.

**Bug 4 — `sf_orchestrate` (the 9-axis full optimizer) produces physically-wrong output.** With `machine_name` as a STRING (it errors `input.machine_name.toLowerCase is not a function` on a machine object), it ran once and returned `cutting_speed_mpm: 20` (66 SFM — absurdly slow for steel), `axial_depth_mm: 50` (a 50 mm DOC for a FACE mill — impossible), `spindle_rpm: 125`, `overall_confidence: 0.253`, `tool_life_min: 9999` (maxed). It appears to optimize for max tool life with no sane objective default, and its result shape is unstable (subsequent calls with `mode`/`objective`/`strategy`/`priority` params all returned `undefined`). So the full optimizer is NOT production-usable. `multi_optimize` + `productivity` require explicit `max_power`/`max_force`/`min_tool_life`/`taylor_C`/`taylor_n` inputs (lower-level, not turnkey). `sfc_calculate` rejects params with an enum `invalid_value`.

**Net: the ONLY trustworthy SFC output is `ultimate_speed_feed`'s material-aware Vc lookup** (+ its `feed_per_tooth`). Consumers should use it and compute rpm locally.

**Chip-load gap (deeper optimization, needs oscar):** beyond speeds, the base-job FEEDS are also aggressive — the RICH NC's implied feed-per-tooth (~0.4 mm/tooth on the 2" face mill) is ~3× the SFC's recommended 0.13 mm/tooth. The post-side corrector (`post-closed-loop-correct.mjs --sfc`) now scales feeds with the corrected rpm to preserve whatever chip load the post chose, but bringing the chip load itself to optimal requires a trustworthy SFC feed authority (blocked on Bug 1/4). Echo's harness DETECTS + speed-corrects; the optimal-feed authority is oscar's.

**Downstream real finding (post-processor):** with the corrected math, the PRISM base-job mill speeds run hot for P-steel — T1 2" face mill emits S3000 (1571 SFM) vs SFC 877 rpm (459 SFM) = **3.4× too fast**; T2/T3 +71%. The post's declared speeds should be reconciled against the (fixed) SFC. See [[reference_winmax_course_framework_2026_05_31]] for the conformance/closed-loop harness this came from. Machine context required by the SFC gate now lives in `scripts/lib/prism-base-job.mjs::MACHINE` (Hurco VMX42SRTi).
