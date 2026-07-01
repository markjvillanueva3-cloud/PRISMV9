---
title: A force-safe, unit-test-passing change can still degrade the real metric — only live validation catches it
type: lesson
domain: speed-feed
slot: oscar
date: 2026-06-19
tags: [sfc, validation, R15, shop-recommended, regression, vendor-parity]
commits: [9d97e4aa12, ccf687af9f, 4fbec2e9fb, c212207b0c]
related: [[reference_oscar_sfc_shop_recommended_2026_06_19]], [[reference_oscar_sfc_validation_honest_2026_06_19]]
---

# Lesson — validation on live data caught a regression unit tests could not

## Context
Building the SFC `shop_recommended` default goal (the operation that gives catalog-matched
out-of-box speeds). A prior memory hypothesis said "the default goal is conservative → making
shop_recommended the default moves vendor agreement 24%→~70%."

## What happened
Making `shop_recommended` the **universal** `prism_optimized` default was:
- **force-safe** — physics-reviewer traced `baseFz → fz → hex_mm → Kienzle Fc`; the workholding +
  spindle-power clamps read the primary `sfc.forces`, so they protect at the recommended chip load.
- **green** — all 121 unit tests passed; tsc clean.

It still **degraded** the product's real metric. The R15 VALIDATE step (re-running
`sfc-vendor-validation-fair.ts` on the 17-cell vendor set) showed:
- default-goal mean deviation **35% → 61%** (WORSE)
- fidelity ceiling (best-of-goals) **71% → 41%** (WORSE)
- turning / ceramic / CBN rows **overshoot +32% to +56%**; cast-iron + Ti milling **+27% to +35%**

Root cause: the 80% balanced→aggressive blend helps **P/M milling-roughing** (where the balanced
default under-shoots modern coated-carbide catalog) but **overshoots** turning/finishing/ceramic and
K/N/S/H milling, where the catalog already sits near the table's aggressive column. The "24%→70%"
hypothesis was milling-specific and did not generalize.

## The fix (iterative validation narrowed the scope)
1. universal default → REVERTED (validation showed the regression).
2. operation-scoped (milling-roughing) → still overshot K cast-iron (+35%) + S titanium (+27%) milling.
3. **operation + ISO-group scoped (P/M milling-roughing only)** → SHIPPED (`4fbec2e9fb`):
   default-goal in-envelope **24% → 41%**, fidelity ceiling **held at 71%** (mean-dev 16.1%→14.6%),
   zero overshoot. Then `c212207b0c` resolved `iso_group` from `material.name` (canonical
   `getMaterialProfile`, exact-alias — `tool_steel`→H, never mis-read as P) so the default fires for
   name-only callers without misclassification risk.

## The transferable rule
- **Unit tests verify the mechanism; live validation verifies the OUTCOME.** A change can be
  force-correct, type-correct, and fully green and still make the product worse on the metric the
  user actually cares about. For any accuracy/quality change, run R15 VALIDATE on the real dataset
  and read the numbers — never ship on "looks fine" or "tests pass."
- **A memory's improvement hypothesis must be re-validated on the FULL population before
  generalizing.** "24%→70%" was true for the subset (P/M milling) it was derived from; applied
  universally it regressed. Each validation pass fed the next (R16 loop), narrowing the scope twice.
- **When a single knob helps one regime and hurts another, scope it — don't average (R7).** The
  answer was not a weaker blend everywhere; it was the full blend in exactly the regime that needs it.
