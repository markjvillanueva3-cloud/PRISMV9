---
name: reference_oscar_proven_css_sfm_mitigated_not_dangerous_2026_06_25
description: "R12 severity correction (slot:oscar, 2026-06-25): the JM proven-store css SFM-as-m/min units bug (Task #12) is NOT the active '3.28x too fast' safety hazard the prior framing claimed. The SFC orchestrator's proven-blend consumer ALREADY rejects it: SpeedFeedOrchestratorEngine.ts:2715 gates the blend to vcRatio in [0.7,1.3], and an SFM-as-m/min value is ~3.28x physics -> rejected as 'differs: using physics'. So it is a SILENT DATA-UTILITY WASTE (JM proven lathe data always discarded), not a safety hazard. Fix at the SOURCE in a fresh session; do NOT rush a units change to safety-relevant data."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.693Z
aliases: reference_oscar_proven_css_sfm_mitigated_not_dangerous_2026_06_25
---


**R12 SEVERITY CORRECTION -- the proven-store SFM units bug is mitigated, not dangerous (slot:oscar, 2026-06-25).**

Task #12 (and the prior memory) framed the JM proven-store css SFM-stored-as-m/min units bug as CRITICAL
because "the orchestrator proven-blend would recommend 3.28x too fast IF enabled." Reading the actual
consumer disproves the danger:

**Consumer (`SpeedFeedOrchestratorEngine.ts:2706-2725`, the proven-blend):**
```
const provenVc = proven.cssSpeed.value;       // claimed m/min (actually SFM for JM lathe data)
const physicsVc = Vc;                          // m/min
const vcRatio = provenVc / physicsVc;
if (vcRatio >= 0.7 && vcRatio <= 1.3) {        // <- blend ONLY within +-30% of physics
  Vc = Vc*(1-w) + provenVc*w;                  // blend
} else {
  // "Proven program Vc differs ... using physics"   <- SFM value (ratio ~3.28) lands HERE
}
```

An SFM value treated as m/min is ~1/0.3048 = **3.28x** the physics Vc -> `vcRatio ~= 3.28` -> FAILS the
`[0.7, 1.3]` gate -> the orchestrator falls back to physics and logs "differs: using physics." **The 3.28x
value can NEVER inflate the recommendation.** So:

- **SAFETY: not at risk.** The ratio guard rejects the outlier. The "3.28x too fast" hazard does not occur.
- **REAL impact: silent data-utility WASTE.** Every JM proven lathe css (units = SFM) is rejected as a
  3.28x outlier, so the proven-blend is effectively DEAD for lathe data -- the Task #9 corpus activation is
  silently unused for Vc. (This also means the prior session's "would be dangerous if enabled" was wrong:
  it is already enabled-and-guarded; it just never blends lathe css.)

**CORRECTED FIX LOCATION (2026-06-25, verified by reading the hydration path -- sharpens + supersedes the
prior "fix at ingestion ~L214" recipe, which was a NO-OP):** the orchestrator does NOT read fresh
aggregation. `getProvenParams` (L295, the method the orchestrator's `queryProvenParameters` calls at
SpeedFeedOrchestratorEngine.ts:2208) AND `exportForSpeedFeedOrchestrator` (L317) BOTH call
`ensureHydrated()` (L474) -> `loadFromStore()` (L434), which `JSON.parse`s the PERSISTED
`data/state/proven-speed-feed-store.json` (raw SFM values) into `this.provenParams` on first read. So a
conversion at `aggregateLatheData` ingestion NEVER reaches the consumer unless the store is RE-PERSISTED
(`persistToStore`, L458) -- that is exactly why the prior iter-13 ingestion fix was a no-op. The fix must
live at the **consumer-read / hydrate chokepoint**, not ingestion.
1. **Convert at `hydrate()`/`loadFromStore` (single chokepoint -> fixes getProvenParams + export at once)**,
   gated by a store-level `cssUnit` field: legacy store (absent / `"sfm"`) -> multiply every
   `param.cssSpeed` quantile by 0.3048 (SFM->m/min) on load; `"m_min"` -> skip. Keep the on-disk store
   SFM (source-faithful) OR re-persist as m_min with the stamp -- but pick ONE and make persist+load agree
   so a round-trip never double-converts (the subtle trap; needs a round-trip test).
2. **SAFETY GATE -- NOW RESOLVED by source verification (2026-06-25, units-first rail satisfied):** I read
   the raw JM `CNC LATHE/*.MIN` programs directly. BOTH proven units are now empirically PINNED (not a guess):
   - **cssSpeed = SFM** -> *0.3048 to m/min. Evidence: `G96 S200`/`S250` (CSS mode) on inch machines (NO
     G20/G21 in the programs -> JM machine-default = inch) with `G50 S600..S800` RPM caps. 200 SFM = 61 m/min
     (conservative, matches "amateur programs, don't trust speeds"); 200 m/min is impossible at those caps.
   - **feedRate = IPR (inch/rev)** -> *25.4 to mm/rev. Evidence: `G95 G1 ... F.005` (feed-per-rev mode), feeds
     span `F.0005..F.02` (dominant .005/.002/.003) -- the classic turning ipr range. mm/rev (0.005 = 5um/rev)
     and G94 ipm (0.005 in/min) are both physically absurd, so ONLY ipr fits.
   So the implementation may convert BOTH (css *0.3048, feed *25.4) with verified constants. The feed
   ambiguity that blocked the prior session is gone. (Still physics-review the change; the proven-blend feeds
   the orchestrator recommendation path.)
3. `getProvenParams` returns the cached param BY REFERENCE -- if you convert at the consumer read instead
   of hydrate, return a COPY (else repeated calls double-convert the in-memory object).
4. physics-review the conversion; validate the proven css then lands at vcRatio ~1.0 and blends (the new
   `classifyProvenVcDeviation` SFM-artifact flag should STOP firing once fixed -- a good regression oracle).

**SHIPPED the safe consumer improvement (U-OSC-PROVEN-SFM-DIAGNOSTIC, commit `c0bdb0e423`):** extracted
the blend decision into a pure exported `classifyProvenVcDeviation(provenVc, physicsVc) ->
{ratio, withinBlendBand, sfmUnitsArtifact}` (SpeedFeedOrchestratorEngine.ts ~L1142). The blend band
[0.7,1.3] is byte-preserved (zero number change, reviewer-verified line-by-line); when a rejected proven Vc
has ratio in [2.8,3.6] (~1/0.3048) the diagnostic now NAMES it a likely SFM/m-min units mismatch instead of
a generic "differs", so the silent waste is LOUD. 6 R9 tests; reviewer PASS. This also gives the source-fix
(item 1 above) a tested helper + a test-seam pattern (seed the aggregator singleton OR test the pure helper).

Sibling: [[reference_oscar_sfc_vc_uncapped_parity_shipped_2026_06_25]]. Supersedes the "would recommend
3.28x too fast" framing in the Task #12 recipe / prior handoffs.
