---
name: oscar-speedfeed-material-blind-diagnosis-2026-06-01
description: "Bug 1 ROOT-CAUSED: prism_calc:speed_feed is material-blind because calculateSpeedFeed keys Vc off tool+hardness not workpiece ISO group. Fix = delegate action to UltimateSpeedFeedEngine. Registered as U-OSC9-SPEEDFEED-MATERIAL-AWARE task #52 (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.717Z
aliases: reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01
---


Diagnosis (not yet fixed — registered as task #52, a fresh-session unit) of Bug 1 from [[reference_sfc_speed_feed_bugs_2026_05_31]]: `prism_calc:speed_feed` returns the same Vc for every workpiece material.

**ROOT CAUSE (verified by reading source, not the summary):** `calcDispatcher` case `speed_feed` (~line 1541) calls `calculateSpeedFeed` (`ManufacturingCalculations.ts:788`). That function keys `cutting_speed` off the **TOOL** material + hardness ONLY — `base_speeds {HSS:30, Carbide:150, Ceramic:300, CBN:200, Diamond:500}` × `pow(200/hardness, 0.3)` × op_factor `{roughing:0.8, semi:1.0, finishing:1.2}`. It NEVER reads the workpiece ISO group. With hardness defaulting to 200: `Carbide 150 × 1.0 × 0.8(roughing) = 120` for ALL workpieces. The dispatcher passes `material_hardness` (from hardness params) but NEVER the material name/id — so even if the util wanted an ISO lookup, the identity never arrives.

**FIX DIRECTION (do NOT duplicate physics):** delegate the `speed_feed` ACTION to `ultimateSpeedFeedEngine.calculate()` — the audit's named material-aware authority (fixed diameter-blindness in 4abd8d9156). Do NOT patch `calculateSpeedFeed` with a second ISO-Vc table (that's the physics-fragmentation anti-pattern, and the util has 12 callers incl. `route-contract-sfc-speedfeed.test.ts` — broad blast radius, leave it).

**WHY IT'S A FRESH-SESSION UNIT (not a tail-of-session squeeze):** (1) `speed_feed` result is mapped at TWO layers — compact map at `calcDispatcher:42` returns `{Vc:result.cutting_speed, fz:result.feed_per_tooth, n:result.spindle_speed, vf:result.feed_rate}`; `ultimate_speed_feed` (line 5201) returns the engine shape directly. Delegating needs a verified remap (UltimateSpeedFeedEngine.calculate()'s return shape must be READ first). (2) `route-contract-sfc-speedfeed.test.ts` gates the `{Vc,fz,n,vf}` contract — must stay green. (3) Shop-floor speed math → S(x)≥0.98, physics-grade scrutiny. Reference ratios for tests (from the audit): Al(N) ≈ 2.6× steel(P), Ti(S) ≈ 0.33× steel. EOL: calcDispatcher is CRLF-in-index (use CRLF-preserve byte-edit). Current constant-120 IS already a dangerous stub, so the material-aware fix is strictly safer — but the re-route must be done correctly, not rushed.

Session f7b0f940 shipped the SFC goal (auto-absorption both formats + closed-loop active per-segment); this diagnosis is the highest-value SAFE forward step at session tail — converting the vague "2 speed-feed bugs" pointer into a root-caused, blast-radius-mapped unit. Also queued: Gap 3 (drill op-path), Bug 4 (sf_orchestrate). Relates to [[reference_sfc_speed_feed_bugs_2026_05_31]], [[oscar-seg-calib-forward-2026-06-01]].
