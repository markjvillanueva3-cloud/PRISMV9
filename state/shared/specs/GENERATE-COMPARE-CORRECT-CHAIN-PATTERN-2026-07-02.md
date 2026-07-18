# Generate → Compare → Correct chain — a domain-neutral one-shot pattern (2026-07-02, slot:india)

**Status:** reference pattern (advisory). CAD reference implementation is built + validated; other
Kienzle-feeding domains **clone-don't-fork** it with a thin per-domain adapter (R15 step-4).

## The pattern (3 stages + a forward-learning loop)

Any domain that **generates an artifact from a spec, compares it to a reference, and corrects it**
has the same shape. The AI generation is biased/imperfect on the first pass; the loop drives it to
one-shot accuracy over time:

1. **LOCATE** — id-free correspondence between two *independent* feature/element sets (generated vs
   reference; no shared ids). Type-gated greedy min-cost match → `matched / missing / extra` +
   `rankedErrors` (worst element first). *"Where is the issue."*
2. **FIX** — a **direct** target-correction edit list (`set param X→Y`, `add missing`, `remove extra`),
   worst-first, tolerance-gated. Works because in the **generated-from-spec** regime the intended
   value is *known* → no iteration needed. *"2nd pass = perfect comparison."*
3. **PREVENT** — aggregate the correction stream per `(elementType, parameter)`; a consistently-biased
   group (enough samples + large-enough mean + consistent sign) → `suggestedScale = 1/(1+bias)` that
   pre-corrects **future** first passes. *"Improves until it draws everything one-shot."*

> Distinct from an **iterative convergence** corrector (delta's `CADRegenCorrectionEngine`,
> proportional/secant/coordinate-descent) which is for the **unknown-target** reverse-engineering
> regime. Use iterative when the target is unknown; use this direct chain when generating from a spec.

## CAD reference implementation (built + validated, slot:india)

| Stage | Module (`scripts/lib/`) | Tests | Commit |
|-------|-------------------------|-------|--------|
| LOCATE | `cad-feature-correspondence.mjs` | 10/10 | `0eac11d698` |
| FIX | `cad-correction-plan.mjs` | 12/12 | `d833d4f076` |
| PREVENT | `cad-systematic-bias.mjs` | 11/11 | `1e68c47f9b` |
| VALIDATE (E2E) | `cad-oneshot-chain.integration.test.mjs` | 3/3 | this session |

All PURE (no fs/clock/engine imports), node:test, UNWIRED by design. Delta wires them into the CAD
hot path (`FeatureRecognition` snapshots → chain → regenerator; plan-stream → bias model → generation
prompt/params). **36/36 total.** E2E proof: a flawed 5-feature part converges to perfect in one
corrective pass; a +3% systematic bias, once learned, makes the next part's first pass land on target.

## Adapter contract to clone into another domain

A domain provides only two thin things; the three algorithm modules are reused **as-is** (they operate
on a generic `{id, featureType, parameters}` snapshot and a signed `pctDelta` stream):

- **Snapshot extractor** — `generated → Snapshot[]` and `reference → Snapshot[]`, where
  `Snapshot = { id, featureType, parameters: Record<string, number|string|boolean> }`.
  Position/size/counts live inside `parameters`.
- **Signed-error metric** — already computed by the chain as `(drawn − intended)/intended·100`; a domain
  only needs its parameters to be numeric where a bias is meaningful.

Then: `planCorrectionsFrom(genSnapshots, refSnapshots)` → edit list; collect plans →
`detectSystematicBias(plans)` → `buildBiasModel` → `applyBiasPrecorrection` in the generator.

## Per-domain applicability (clone targets — coordinate with the owning slot before wiring)

| Domain / slot | Generated artifact | Reference | Notes |
|---------------|--------------------|-----------|-------|
| **CAM** / kilo | toolpath operation set | intended strategy ops | `featureType` = op kind (contour/pocket/drill); params = stepover/DOC/lead |
| **post-processor** / echo | NC block set | golden NC / spec | echo's `post-closed-loop-correct.mjs` is **per-part** only — this adds the **cross-part** bias learner it lacks |
| **speed-feed** / oscar | predicted rpm/feed | measured/verified | `pctDelta` on rpm/feed; learns a systematic prediction bias |
| **lathe / mill / wedm** | generated program / features | reference program | same feature-snapshot shape |

**Discipline:** clone-don't-fork (copy + adapt, keep the algorithm core identical so a fix in one
propagates by re-clone); do **not** speculatively extract a generic core until a **second** real
consumer exists (YAGNI). The owning slot instantiates its own adapter; india owns the AI/learning
layer and this pattern. Wiki/memory: [[reference_cad_closed_loop_already_built_2026_07_02]].
