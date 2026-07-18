---
name: reference_quoting_phase3_probabilistic_margin_2026_06_13
description: "Quoting (charlie) Phase-3 deeper anchor — Hermes-planned. Probabilistic should-cost + margin: Bayesian hierarchical regression (priors by part-family/customer/process, posterior COST DISTRIBUTION not a point) + Monte-Carlo over uncertain inputs (cycle-time, material, setup) -> quote CONFIDENCE INTERVAL; win-rate elasticity P(win|margin) calibration -> expected-profit-max bid = argmax margin·P(win|margin); quote-vs-actual reconciliation UPDATES the Bayesian priors (self-improving). Artifact: Probabilistic Margin Memo v2.0. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.142Z
aliases: reference_quoting_phase3_probabilistic_margin_2026_06_13
---


**Context:** Phase-3 quoting anchor — **Hermes-planned**. Deepens [[reference_quoting_shouldcost_dfma_margin_2026_06_13]]
(Phase-2). Aligns with PRISM's math-exhaustive doctrine ([[feedback_mathematical_exhaustive_completeness]] — CIs
not scalars, informed priors not 0.5 defaults). Spec §charlie.

## The next layer: quote a DISTRIBUTION, bid on EXPECTED PROFIT
- **Bayesian hierarchical cost regression:** model unit cost with a hierarchy — global → process (mill/lathe/wedm)
  → part-family → customer. Partial pooling shares strength across sparse part-families (a new part borrows its
  family's prior). Output = posterior cost DISTRIBUTION, not a point estimate. Priors seeded from Boothroyd-Dewhurst
  DFMA + toolpath cycle-time + historical actuals.
- **Monte-Carlo margin simulation:** propagate uncertainty in the cost drivers (cycle-time estimate, material
  price, setup hrs, scrap rate) → a quote CONFIDENCE INTERVAL (P10/P50/P90 cost) instead of a single number.
  Lets charlie quote a risk-adjusted price (price at P70 cost for margin safety on uncertain jobs).
- **Win-rate elasticity + optimal bid:** fit P(win | margin, customer, competition) (logistic / calibrated) →
  **expected profit = margin × P(win|margin)**; the optimal bid is argmax over margin (not a fixed markup). The
  win-probability calibration curve is the key business artifact.
- **Self-improving loop:** every quote-vs-actual reconciliation is a new observation that UPDATES the Bayesian
  posterior (online learning) → the cost model sharpens with every completed job. Posterior predictive checks +
  feature importance keep it honest.

## Wiring / consumers (R15)
- GALAXY: `engines/quoting/` (charlie). INPUTS: delta (features), oscar/kilo (cycle time), hotel (rates/actuals),
  vendor-catalog-db (material/outsource). DOMAIN: quoting; the Bayesian-hierarchical + win-elasticity pattern is
  reusable for any estimate-under-uncertainty (clone to capacity planning / scheduling risk).
- AUTO-INVOCATION: the quote-vs-actual reconciliation loop becomes the online-update trigger.

## Next (Phase-4, per Hermes — charlie's build)
Fit the hierarchical regression on JM historical jobs; build the MC margin simulator + win-rate calibration;
validate posterior predictive vs held-out actuals (calibration + sharpness). Pairs with hotel (ERP actuals).

Sources (Hermes-planned): Bayesian hierarchical modeling (Gelman et al. *BDA3*); Monte-Carlo cost/risk simulation;
Boothroyd-Dewhurst DFMA; win-rate/bid-elasticity (competitive bidding theory, Friedman 1956); calibration
(reliability curves). Planner: Hermes (xAI Grok, :8645).
