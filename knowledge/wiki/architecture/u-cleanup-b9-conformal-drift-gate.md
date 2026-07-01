---
title: U-CLEANUP-B9 — split-conformal reviewer-drift gate (R4-P1-8)
type: architecture
status: shipped
unit: CLEANUP-MS0::U-CLEANUP-B9
commit: 405ac15be7
date: 2026-05-18
---

# U-CLEANUP-B9 — Split-Conformal Reviewer-Drift Gate (R4-P1-8)

Closes the conformal-prediction-set follow-up the B9 skeleton (2026-05-14)
explicitly deferred. The skeleton already shipped the frozen corpus
(`state/shared/golf-reviewer-eval/corpus.json`), the weekly cron
(`scripts/system-health/32-golf-reviewer-drift-eval.ps1`), and the
slope+floor baseline; this unit adds the conformal gate that was the only
remaining code deliverable keeping the unit `pending`.

## What it does

`scripts/golf-reviewer-drift-eval.mjs` runs the golf peer-commit reviewer
against a frozen known-bug corpus weekly and detects model/prompt drift in
its accuracy time-series.

Gate precedence (not a flat OR):

| Gate | Role | When authoritative |
|------|------|--------------------|
| **CONFORMAL** | split-conformal prediction-set membership; latest accuracy below the (1−α) lower band ⇒ drift; one-sided (improvement never trips) | primary, whenever applicable (N ≥ ⌈1/α⌉−1 = 9 calib rows at α=0.10) |
| **SLOPE** | OLS slope over the window < −0.20 | cold-start fallback only (conformal abstains, N<9) |
| **FLOOR** | latest < 0.70 | always-on absolute-safety backstop (orthogonal to the drift signal) |

`primaryGate` in the result reports which governed. Non-evaluated runs
(unseeded corpus / unwired reviewer) route to a non-drift
`skippedDriftVerdict` sentinel — they never feed the `accuracy=0` value
into the gates.

## Key design decisions (R7 — surfaced, not averaged)

1. **Engine reference.** The unit text named the classification
   `xproc_aps` engine (`CrossProcessAPSClassificationEngine` — simplex
   probs + int labels), the wrong primitive for a scalar accuracy series.
   The gate instead mirrors the **scalar split-conformal regression** rank
   rule `k = ⌈(N+1)(1−α)⌉` with `k>N`→abstain from
   `CrossProcessConformalPredictionEngine` (bit-identical to that engine
   when fed `prediction = median(window)`). Implemented as a **pure local
   function** — the skeleton documented that a weekly `.mjs` cron cannot
   cheaply reach the MCP dispatcher; ~20 lines of pure math beats a fragile
   subprocess hop.
2. **Coverage honesty (R12).** Two-sided |residual| band at level (1−α),
   one-sided lower decision ⇒ effective false-alarm ≈α/2 (conservative).
   Median plug-in predictor ⇒ split-conformal-*style* (approximate
   coverage), not the textbook finite-sample guarantee. Stated explicitly
   in the module docstring.
3. **Retained baseline.** slope+floor kept for the first ~8 evaluated
   weeks (conformal cold-start) — removing them would leave a coverage
   hole.

## Scrutiny

P1 caught by per-file scrutiny round-1 (independent reviewer FAIL): the
`accuracy=0` sentinel on non-evaluated runs (the default state until an
operator seeds the corpus) made conformal+floor scream a confident false
"DRIFTED" every cold-start week → fixed via `skippedDriftVerdict` +
`reason==="evaluated"` routing guard. Also fixed R12 docstring overclaims
and R9-reconciled the stale flat-OR test assertions. Round-2: 3 reviewers
PASS; 3-of-3 Stop gate PASS (arm B mutation-proved the SUPERSESSION
oracle). 62/62 tests via a vitest-API ESM shim (root `scripts/__tests__`
vitest is a pre-existing fleet-wide harness blockage).

## Honest scope

Corpus seeding remains an explicit **operator** action by design
(operator-verified verdicts; the cron reports `corpus_unseeded` until
seeded). Knobs/CLI unchanged from the skeleton.

Related: [[fleet-reaper]] (golf hygiene context) · memory
`reference_u_cleanup_b9_2026_05_18`.
