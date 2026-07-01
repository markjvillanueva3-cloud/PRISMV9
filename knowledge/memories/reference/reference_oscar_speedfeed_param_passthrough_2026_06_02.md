---
name: oscar-speedfeed-param-passthrough-2026-06-02
description: "SHIPPED: prism_calc:speed_feed now maps legacy params (tool_diameter->tool_diameter_mm, number_of_teeth->flutes, hardness_HRC->hardness_hrc) so the user's ACTUAL tool reaches UltimateSpeedFeedEngine — RPM/feed no longer use an inferred default diameter. UNITS-FIRST-cleared mm->mm. Split off operation->cut_type as #56."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.718Z
aliases: reference_oscar_speedfeed_param_passthrough_2026_06_02
---


Commit `d5edd5eada` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-SPEEDFEED-PARAM-PASSTHROUGH (task #53). Follow-up to [[reference_oscar_speedfeed_material_aware_shipped_2026_06_02]].

**The bug (surfaced by #54 scrutiny):** the `speed_feed` action delegates to `ultimateSpeedFeedEngine.calculate()`, which reads `tool_diameter_mm`/`flutes`/`hardness_hrc`, but callers send legacy `tool_diameter`/`number_of_teeth`/`hardness_HRC`. Those legacy names never reached the engine → `tool_diameter_mm` fell to `inferToolDiameter()` (UltimateSpeedFeedEngine.ts:1979, returns a constant 12mm for milling) → **RPM + feed_rate were computed for a default diameter, ignoring the user's actual tool**. Vc (surface speed, diameter-independent) was correct — which is why #52's material-aware tests passed without catching this.

**The fix (dispatcher normalization — the canonical place per the dispatchers CLAUDE.md: "Parameter normalization happens in dispatcher, NOT engine"):** a `{ ...params }` spread + three `== null`-guarded fills before `calculate()`. The `== null` guard means a canonical key already present always wins (never clobbered), and `0` does not fill (a real value the engine then handles).

**UNITS-FIRST discipline (the load-bearing review):** mapped `tool_diameter`→`tool_diameter_mm` with NO unit scaling. Reviewer B definitively cleared the 25.4× hazard with 3 confirmations: (a) the OLD `calculateSpeedFeed` RPM formula `1000*Vc/(π*D)` is only dimensionally correct if D is mm; (b) the REST `POST /api/v1/sfc/calculate` routes to `prism_product:sfc_calculate`, NOT this action — no inch surface reaches it; (c) the canonical engine field is literally `tool_diameter_mm`. mm is the established contract → mm→mm correct.

**Proof (R9 load-bearing):** halving Ø ~doubles RPM (pre-fix both inferred 12mm → ratio 1.0 → the `rpm6 > rpm12*1.7` assertion FAILS); more teeth → higher feed_rate; canonical-wins; material-aware (alu>steel) regression guard. tsc 0; 31/31 PASS; CRLF preserved; per-file scrutiny 2/2 PASS, zero P0/P1.

**Pattern banked:** when a dispatcher action re-routes to a richer engine with different canonical param names, normalize legacy→canonical IN THE DISPATCHER with canonical-wins precedence, and treat any *_mm/_in unit difference as UNITS-FIRST (verify the source unit, never assume). **Split-off:** legacy `operation`("roughing"/"finishing") actually maps to the engine's `cut_type` (not its process `operation` enum) → tracked as U-OSC9-SPEEDFEED-OP-CUTTYPE-MAP (#56). Relates to [[reference_sfc_speed_feed_bugs_2026_05_31]], [[reference_oscar_gwizard_lane_honest_2026_06_02]].
