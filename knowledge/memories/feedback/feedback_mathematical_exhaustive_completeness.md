---
name: mathematical-exhaustive-completeness
description: "For high-ROI operator-facing decision surfaces (tool selection, pricing, quoting, scheduling, ROI ranking, prognostics), build to a mathematical + statistical exhaustive level of completeness — not just point estimates. Cold-start = informed priors, comparisons = statistical, sensitivity = surfaced. Established by user directive 2026-05-24 during iter20 tool-recommend bridge."
aliases: feedback_mathematical_exhaustive_completeness
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
---


# Mathematical / Statistical Exhaustive Completeness — standing doctrine (2026-05-24)

## The rule

For PRISM **high-ROI operator-facing decision surfaces** — anything an operator stares at to choose between alternatives that map to dollars (tool selection, pricing, quoting, scheduling, ROI ranking, prognostics, kaizen prioritization, vendor selection) — build to a mathematical + statistical **exhaustive level of completeness**, not just point estimates with arbitrary defaults.

**Why:** A 2-of-3 close decision that lies about its uncertainty is worse than a 1-of-3 honest one. Operators learn to mistrust polished demos that gloss over n=1 cold-starts. The R12 fail-loud principle ([[feedback_r5_thru_r12_doctrine]]) compounds when applied to *every* signal, not just the verdict.

**How to apply** (in order of leverage):

1. **Point estimates always carry uncertainty.** Every numeric output the operator might compare against another tool/vendor/option must include either a confidence interval (bootstrap), a posterior variance (Bayesian), or an explicit "insufficient data" flag — never a bare scalar.

2. **Cold-start uses informed priors, not arbitrary 0.5 defaults.** When there's no history for tool X, shrink toward the population mean of tools in the same `(material × machine × feature)` cohort (Bayesian shrinkage / James-Stein style). Falls back to global mean only if no comparable population exists. The fallback path is explicit in `gapsIdentified[]`.

3. **Comparisons are statistical, not deterministic.** "Is A better than B?" returns `P(A.trueCpu < B.trueCpu)` via bootstrap or Welch's t-test, not just `A.score > B.score`. Ranks that flip with a small sample perturbation are surfaced as `lowConfidenceRank: true`.

4. **Sensitivity is surfaced.** For the top recommendation, report `∂score/∂signal_i × signal_i` as percent-contribution per signal so the operator sees "this rank is driven 60% by ROI history, 25% by material compat, 15% by surface quality". Single-signal-dominated recommendations are surfaced as fragile.

5. **Cohort generation exhausts the candidate space.** No hand-picked subsets in production — pull candidates from the inventory catalog ∪ vendor catalog ∪ proven-on-similar-jobs set. If the cohort is hardcoded (early MVP), the surface MUST disclose "demo cohort, not exhaustive — wire-in P-NN tracked".

6. **Stochastic ops are seedable.** Bootstrap / Monte Carlo / Thompson sampling all accept an explicit RNG seed for reproducibility. Default seed `=hash(profile + cohort)` so same operator query → same answer turn-after-turn.

7. **Degenerate cases are explicit.** `n=0` → cold-start prior. `n=1` → wide CI (won't pretend to a tight estimate). `var=0` → flagged (single observation, not real variance). Never silently skip a degenerate input and report a confident answer.

## When NOT to apply (low-ROI surfaces — the standard floor is fine)

- Internal debug dashboards
- One-shot audit scripts that don't ship to operators
- Console output for developer health checks
- Anything where the failure mode is "developer sees a number, manually verifies" (not "operator commits dollars based on it")

The cost of stat rigor is non-trivial — bootstrap+sensitivity easily adds 30-60% engine LOC. Reserve for surfaces where a wrong-with-confidence answer would cost real money.

## What this looks like in code

```ts
// BAD — bare scalar, no uncertainty, arbitrary cold-start
const score = history ? history.costPerUnit : 0.5;

// GOOD — explicit posterior + cold-start via informed prior
const { mean, ci95, source } = estimateCostPerUnit(history, {
  prior: populationMean(cohort, profile),
  priorWeight: cohortStrength(cohort),
});
// source ∈ {"history" | "shrunken" | "prior-only"} surfaces in gapsIdentified[]
```

```ts
// BAD — deterministic rank flip on tiny perturbation
const ranked = candidates.sort((a, b) => b.score - a.score);

// GOOD — pairwise stat test + rank-confidence
const ranked = statisticallyRank(candidates, history);
// each result carries .lowConfidenceRank when next-best is within bootstrap noise
```

## Enforcement

- **iter20 tool-recommend bridge** is the canonical first surface following this doctrine (see [[reference_jm_die_shop_page_e2e_verified_2026_05_24]] §iter21 expansion).
- **scrutiny gate** — any reviewer (arm A/B/C) on a high-ROI decision surface MUST flag P0 if uncertainty is missing or cold-start is arbitrary-default. This becomes a rejection criterion in the per-file scrutiny ([[feedback_parallel_scrutiny_per_file]]).
- **/system-viz roost** — high-ROI surfaces tagged `mathematical-exhaustive:required` in the graph; missing rigor surfaces as `ghost.math-rigor-gap`.

## Related

- [[feedback_r5_thru_r12_doctrine]] — R12 fail-loud is the parent principle
- [[feedback_no_fabricated_data]] — sibling rule on data fabrication
- [[reference_jm_die_shop_page_e2e_verified_2026_05_24]] — the JM-Die shop page is the first PRISM surface where this doctrine ships
- [[feedback_parallel_scrutiny_per_file]] — scrutiny gate is the enforcement vector
