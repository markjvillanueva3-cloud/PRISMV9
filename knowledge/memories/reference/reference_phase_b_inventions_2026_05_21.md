---
name: phase-b-inventions-2026-05-21
description: "Phase-B /goal invention pass (slot:hotel /loop) — 16 wiki-mined engine/algorithm/feature ideas, verify-then-extend dropped 13 as redundant, 3 genuine gaps built & wired (F3, E7, A2)."
aliases: reference_phase_b_inventions_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.268Z
---


# Phase-B inventions — 2026-05-21 (slot:hotel autonomous /loop)

Phase B of the operator /goal ("once wiki math exhausted, invent high-ROI ideas to generate engines/algorithms/features"). Method: mine the 61 canonical wiki entries for documented gaps → 16-idea invention queue → **verify-then-extend** each against the live 3,300-engine inventory before any build.

## The decisive lesson — gap-mining a wiki over-proposes ~75%

The 16 ideas were gap-mined from wiki anti-patterns/tie-ins WITHOUT cross-checking the engine inventory. On verification: **13 of 16 were already covered** (E1 ChatterStabilityLobe · E2 `acc_21_error_model` · E3 GilbertEconomicSpeed · E4 `MonteCarloEngine.toleranceStackUp` · E5 RecastLayer · A1 fed E1 · A3 FeedOptimization×2 · A4 `learningCurve`×3 · E6+F1 extend-only). Only **3 were genuine gaps**. In a 3,300-engine system the marginal *new-engine* gap is small — most ROI is in **extending** existing engines and **wiring/bridging** what exists. Always `duplicationGuard` + inventory cross-check BEFORE a build; catching a redundant proposal pre-build is the win, not a failure. See [[feedback_autonomous_loop_drift_discipline]].

## The 3 genuine gaps — all built, tested, wired, scrutiny-passed

- **F3 — `scripts/wiki-canonical-to-training-pairs.mjs`** — 61 canonical wiki entries → 282 AI training pairs + drift manifest. 21/21 tests. Committed (absorbed into `693a961c61`).
- **E7 — `QueueingLeadTimeEngine.ts`** — Kingman VUT honest lead-time, `CT_q=((Ca²+Cs²)/2)·(ρ/(1−ρ))·te`. Wired `prism_scheduling:queue_lead_time` (8→9 actions) + Zod schema. 24/24 tests (21 engine + 3 round-trip). Replaces the naive `queue_factor=2.5` estimate. Commit `99741841`.
- **A2 — `MinimumZoneFitEngine.ts`** — ASME Y14.5.1 minimum-zone (Chebyshev/L∞) GD&T form-error fits: straightness (golden-section, exact convex 1-D), flatness + circularity (Nelder-Mead), each clamped to ≤ the least-squares zone. Wired `prism_calc:minimum_zone_fit` (+1 action) + Zod schema. 30/30 tests (hand-computed oracles + 4 round-trip). 2 parallel scrutiny agents PASS. The Y14.5.1-correct alternative to LSQ form-error reporting (LSQ always over-reports → rejects in-tolerance parts). Commit `9dfe52ab`.

## Build-quality notes (A2)

Scrutiny agent A flagged: (1) circularity's `max r − min r` objective is not globally convex — fixed by clamping the result to the LSQ annulus (the minimum zone can never exceed it); the same hard clamp was added to straightness + flatness. (2) Engine uses instance-on-singleton + plain-object returns + throw-on-bad-input — this MATCHES the sibling `GeometryAlgorithmsEngine`/`MonteCarloEngine` (R11 conform-to-surrounding-code), not the generic `engines/.claude` static/AtomicValue rule; geometry/math engines do not use AtomicValue (that is for physics outputs with confidence/source).

## Remaining queue

F2 (tribal-anchor auto-link codemod) is the last open genuine gap — deferred: it edits many dispatcher files and the fleet was heavily contended (35–222 s bash latencies). E8 + F4 still need verify-confirm. Full living queue: [[prism-invention-high-roi-engine-ideas]].

## Cross-references

- [[reference_pivot_wiki_tribal_2026_05_21]] — the wiki-expansion half of the same pivot session
- [[prism-invention-high-roi-engine-ideas]] — the invention queue wiki entry (verified-status tables)
- [[feedback_autonomous_loop_drift_discipline]] · [[feedback_high_roi_backend_first_slot_queue]]
