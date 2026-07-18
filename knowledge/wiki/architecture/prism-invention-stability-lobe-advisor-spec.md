---
schema: ideablock-v1
title: "INVENTION SPEC — StabilityLobeAdvisorEngine: tap-test FRF → chatter-free RPM bands"
domain: "PRISM architecture"
category: invention
version_state: Current
confidence: 0.93
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - [[prism-invention-high-roi-engine-ideas]] (idea E1)
  - [[math-speed-feed-the-full-physics]] §9 stability lobes
  - [[math-machine-domains-dynamics-kinematics-accuracy]] §FRF
  - Altintas & Budak (1995) — analytical stability-lobe solution
extracted_via: human-authored
extracted_at: 2026-05-21T18:05:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INVENTION-STABILITY-LOBE-SPEC)
---

## ⚠ VERIFIED REDUNDANT (2026-05-21 verify-then-extend check — DO NOT BUILD AS NEW)

**The verify-then-extend prerequisite was run and E1 is redundant.** `ChatterStabilityLobeEngine.ts` (35.5K, mature) already provides the full capability this spec proposed:
- `compute(ChatterInput)` → stability-lobe diagram + `recommendations: string[]`
- `multiFrequencyStability(...)` → returns `optimal_rpm` (the chatter-free RPM E1 proposed as `recommendedRpm`)
- `computeWithAlgorithms(...)` — algorithm-backed variant
- Singleton `chatterStabilityLobeEngine`, **wired** via `prism_calc:chatter_stability_lobes` + `chatter_stability_sld` + `chatter_check_stability`.

`duplicationGuardEngine.mustCheckBeforeCreating()` would (correctly) block a new `StabilityLobeAdvisorEngine`. **Correct action: do NOT build E1.** If the operator-facing "you have chatter at X → shift to Y" framing is felt to be missing, that is a thin *presentation* enhancement to `ChatterStabilityLobeEngine.compute()`'s `recommendations` output — not a new engine. This entry is retained as the verification record + a caution against re-proposing E1.

This is the verify-then-extend / `mustHumanVerify` flag from [[prism-invention-high-roi-engine-ideas]] working as designed: the gap-mining over-proposed E1 because it did not cross-check `ChatterStabilityLobeEngine`. Catching a redundant proposal before a build is a Phase-B success, not a failure.

## Purpose (original proposal — superseded by the verification above)

Phase-B builder-ready spec for invention E1 — `StabilityLobeAdvisorEngine`. Turns the known stability-lobe math into an operator action: "you have chatter at 4,200 RPM — shift to 5,100 RPM (lobe peak) and you can run 3× the depth of cut." A wiki that *generates an engine*.

## The problem it solves

Regenerative chatter is the #1 surface-finish + tool-life killer (per [[machining-tactics-in-cut-adjustments]] §chatter). The physics is known — the stability lobe diagram — but no PRISM engine turns a chatter complaint into the corrective RPM. Operators reduce depth of cut (slow, lossy) when shifting RPM onto a lobe peak would let them keep the depth AND kill the chatter.

## Engine contract

```
StabilityLobeAdvisorEngine.advise(input) → output

input: {
  frf: { naturalFreq_Hz, dampingRatio, modalStiffness_N_per_m }[]   // from tap test; ≥1 mode
  tool: { fluteCount, diameter_mm }
  cut:  { material_iso_group, radial_engagement_pct, currentRpm, currentApMm }
  rpmRange?: { min, max }                                            // search bounds; default 500-20000
}

output: {
  currentApLimit_mm: number              // chatter-free depth at currentRpm
  isCurrentlyStable: boolean             // currentApMm vs currentApLimit
  lobes: { rpm, apLimit_mm }[]           // the stability-lobe curve, sampled
  recommendedRpm: number                 // nearest lobe-peak RPM that gives the best apLimit
  apLimitAtRecommended_mm: number
  improvementFactor: number              // apLimitAtRecommended / currentApLimit
  rationale: string                      // operator-facing explanation
}
```

## The algorithm (A1 — stability-lobe solver)

The analytical Altintas-Budak solution. For each candidate spindle speed `n`:

1. **Tooth-pass frequency** `f_tooth = z·n/60`.
2. **Oriented FRF** — combine the modal contributions: `G(ω) = Σ 1/(kᵢ − mᵢω² + i·cᵢω)` over modes `i`.
3. **Critical depth** at the chatter frequency `ωc`:
   ```
   ap_lim = −1 / (2 · Kc · z/(2π) · Re[G(ωc)])
   ```
   where `Kc` is the cutting-force coefficient (from the material ISO group's Kienzle `kc` — import from `physics/constants.ts`, NEVER inline).
4. **Lobe number `k`** — the phase relationship between successive tooth passes generates the family of lobes; sweep `k = 0,1,2,...` to build the full diagram.
5. The **lobe peaks** (max `ap_lim`) occur where `f_tooth` (or a harmonic) aligns favorably with the dominant `ωn`.

`Re[G(ωc)]` must be negative for a finite positive `ap_lim` — that's the regenerative-instability condition.

## Edge cases (handle from line 1)

| Edge case | Behavior |
|---|---|
| FRF array empty | Throw — cannot advise without a tap test. Clear error message. |
| Single rigid mode, very high stiffness | `ap_lim` very large → return "rigidity not the limit; check power/deflection" |
| `currentRpm` outside `rpmRange` | Clamp + warn |
| All `Re[G]` ≥ 0 across the range | No regenerative instability predicted → return isCurrentlyStable:true, recommendedRpm = currentRpm |
| Damping ratio ≤ 0 or ≥ 1 | Invalid input → throw (physical damping is 0 < ζ < 1) |
| NaN/Infinity in FRF | Reject input → throw |
| Multi-mode FRF | Sum the modal FRFs; the lowest-stiffness mode usually dominates |

## Failure modes anticipated

- **FRF measured cold, machine runs warm** — the FRF drifts with spindle temperature. Output should carry a caveat: "FRF valid at tap-test temperature; re-tap if thermal state differs."
- **Tool stickout differs from the tap-test setup** — the FRF is assembly-specific. Document that the FRF must be measured with the actual tool/holder/stickout.
- **Process damping at low RPM** — at low speed, process damping stabilizes cuts the linear model says are unstable. The model is conservative at low RPM (safe error direction).

## Wiring (per [[wiring-pattern-engine-to-dispatcher]])

- Primary: `prism_calc:stability_lobe_advise` (new action) — physics computation.
- Secondary: `prism_machine_live:chatter_detect_live` already exists; the advisor consumes a live-detected chatter event → recommends the RPM shift. Wire the advisor as the recommendation half of that loop.
- Schema: Zod, every field `.describe()`d, FRF array `.min(1)`.
- Test: real-data E2E with a known FRF (a published Altintas textbook example has reference `ap_lim` values — use those as the test oracle, NOT `toBeDefined()`). ≥3 failure modes (empty FRF, ζ out of range, NaN). ≥2 adversarial (Infinity stiffness, zero flute count).

## ROI

Chatter occurs in a large fraction of roughing cuts. The current operator response (reduce `ap`) sacrifices 30-60 % of MRR. An RPM shift onto a lobe peak often *keeps* the depth — recovering that MRR. At a $5/min machine rate, recovering even 20 % of cycle time on chatter-prone jobs is real money. Effort: ~200 LOC engine + the A1 solver + an FRF parser (tap-test data import). The math is deterministic — no NN, no training data needed.

## Build prerequisites

1. `duplicationGuardEngine.mustCheckBeforeCreating({ assetType:"engine", proposedName:"StabilityLobeAdvisorEngine", keywords:["chatter","stability","lobe","FRF","RPM"] })` — verify no existing chatter-RPM engine. `prism_calc:chatter_stability_lobes` + `chatter_stability_sld` exist — **this engine may be a thin advisor wrapper over them, not a new solver.** Check first: if the SLD solver exists, E1 is just the advise() recommendation layer (~80 LOC, not 200).
2. Confirm the `Kc` source in `physics/constants.ts`.
3. Confirm `chatter_detect_live` event shape for the wiring.

## Cross-references

- [[prism-invention-high-roi-engine-ideas]] — the invention queue (E1)
- [[math-speed-feed-the-full-physics]] — stability-lobe formula
- [[math-machine-domains-dynamics-kinematics-accuracy]] — FRF + tap test
- [[machining-tactics-in-cut-adjustments]] — chatter is the symptom this serves
- [[wiring-pattern-engine-to-dispatcher]] — the wiring pattern
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (Phase B)
- [[feedback_do_optional_high_roi_work]] — standing rule

## Provenance

Phase-B builder-ready spec — **57th canonical entry** of the 2026-05-21 pivot, deep-diving invention E1 from [[prism-invention-high-roi-engine-ideas]]. Authored 2026-05-21 by slot:hotel under U-WIKI-INVENTION-STABILITY-LOBE-SPEC. A "wiki that generates an engine" per the operator /goal Phase B. Confidence 0.93 — the spec is sound; the verify-then-extend check (existing SLD solver) must run before the build to size it correctly.

System injection: auto-surfaces on `stability lobe advisor`, `chatter RPM`, `FRF`, `tap test`, `stability lobe diagram`, `chatter-free speed`, `Altintas Budak`, `regenerative chatter fix`, `RPM shift` keywords.
