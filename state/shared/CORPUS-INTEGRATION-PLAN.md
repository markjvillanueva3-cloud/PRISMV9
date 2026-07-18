# CORPUS INTEGRATION PLAN — JM DIE + Resources → PRISM

> **Privacy compliance** (carries from inventory): no part geometry, no customer names extracted from program bodies, no dimensional data persisted into PRISM training datasets. Operator names in folder structure (e.g. `MATTHEW programs`) treated as pseudonyms — NOT promoted to engine-level metadata. All ingestion routes pass through `tribal_capture` PII filter.

> **Source paths** (corrected from brief): `H:\prism\JM DIE\` (production corpus) and `H:\prism\Resources\` (training+catalog corpus).

> **Scope**: defines policy for how the inventoried corpus integrates with PRISM's regression suite, closed-loop training, master post differentiation, convergence behavior, sellable optimization feature, and SFC/AI calibration.

---

## 1. Privacy & data-handling notes

- Surface-level metadata (file counts, dialect, line counts, organizational structure, PRISM-modified vs generic) — **persisted** to inventory state.
- Program bodies — **never** persisted whole. Only Kienzle-relevant snippets (toolpath patterns, S/F values, canned-cycle args) extracted via guarded `learn_*` engines.
- Customer-derived header strings — **stripped** at ingestion via `BlueprintVisionOCR` PII filter before being written to wiki/registries.
- Operator names appearing in folder paths — anonymized (`MATTHEW programs` → `OPERATOR-A`) before any cross-reference into AI training labels.

## 2. Regression suite policy

**Only `fine_tuned` and `production` posts qualify as regression baselines.** Status grading (from §3 of inventory):
- `started` — too thin (<1,500 lines, minimal customization). **Excluded** from regressions.
- `in_progress` — moving target; **excluded** as baseline, **kept** as observational signal.
- `fine_tuned` — qualifies. Marked `human-validated reference, not theoretical optimum`.
- `production` — qualifies. Marked `human-validated reference, not theoretical optimum`.

**Qualifying baseline set** (8 posts total):
- production: HURCO_VM30i_PRISM_v10_9_DRILLFIX_1, HURCO_VM30i_PRISM_v11
- fine_tuned: OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7 (×2 dup), OKUMA MULTUS B250 3.15.24 REV A
- (other fine_tuned candidates promoted only after explicit operator sign-off)

Regression suite invariant: **PRISM-generated post output for the same machine MUST diff against the qualifying baseline within agreed tolerance** (line-count drift ≤10%, semantic equivalence on canned-cycle expansion). A regression that **improves** on the baseline (e.g. tighter G05.1 smoothing, fewer redundant rapids) is **flagged for human review, not auto-rejected**. The suite labels each diff as `match | improvement_candidate | regression`.

## 3. Closed-loop training data policy

**Production NC programs (the 17,023 `.min`/`.nc` files in JM DIE) are noisy training data, NOT ground truth.** Specifically:
- They are the historical output of an Autodesk Fusion + JM-customized post + operator-edited workflow. Multiple confounded variables.
- They reflect **operator-tolerant** parameters (chip load, surface speed) — biased toward conservative survival, not toward optimum cycle time.
- They were programmed under tooling, fixturing, and material-cert conditions PRISM cannot perfectly reconstruct.

**Bayesian posterior policy:**
- PRISM's posterior **calibrates against** observed program-and-outcome pairs (where outcome = "did it run? did the part pass FAI?").
- PRISM's posterior **does NOT collapse to** observed parameter values. The prior derived from physics (Kienzle force, Taylor life, thermal compensation) carries non-zero weight even when data abundance is high.
- Observed S/F that violates the physics envelope (e.g. exceeds spindle torque curve, exceeds tool fatigue Nf > 1.0) is treated as **survivor bias** and downweighted — not absorbed.

This protects PRISM from "learning" suboptimal patterns just because they happen to be the only 17k samples available.

## 4. Master Post differentiation baseline

| Class | Role in PRISM evaluation | Notes |
|-------|--------------------------|-------|
| Generic Resources `.cps` (385 baseline posts) | "what we beat" — measurable improvement target | Autodesk-shipped, no JM customization. PRISM's Master Post must produce demonstrably better output (tool-life, cycle-time, surface integrity) on JM machines. |
| Hand-tuned PRISM-Modified `.cps` (14 in JM DIE) | "what we match or improve" — but **also suspect** | Contains real shop-floor wisdom AND human bias. Cannot be uncritically trusted. |
| Master Post (PRISM canonical) | Synthesis target | Inherits physics rigor from generic, tribal pattern from custom, and Bayesian-validated parameters that exceed both. |

The implication: **a hand-tuned post is a strong prior, not an oracle**. PRISM's Master Post is allowed — and required — to disagree with the hand-tuned baseline when physics + observed shop outcomes both point the other way.

## 5. Convergence policy by `modification_status`

Per-post convergence behavior when PRISM-generated output diverges from corpus baseline:

| Status | Convergence policy | Triggers |
|--------|---------------------|----------|
| `started` (e.g. PRISM-Master-Hurco-VM30i.cps 759 lines) | **free_to_improve** — PRISM may overwrite without question. Author is owed an outline, not absolute fidelity. |
| `in_progress` (e.g. HAAS_VF2_-Ai-Enhanced) | **review_and_decide** — Diff routed to operator queue with PRISM rationale (physics + Bayesian justification). Operator accepts, rejects, or amends. |
| `fine_tuned` (e.g. OKUMA_MULTUS B250 v5.2.7) | **must_match unless physics-violation found** — PRISM matches baseline by default. Disagreement requires explicit physics-violation ticket and operator sign-off. |
| `production` (Hurco v10 DRILLFIX, Hurco v11) | **freeze** — cannot be auto-modified. PRISM produces a **proposal post** alongside, never replacing the production file. |

Result: as a post matures along the status ladder, PRISM's authority decreases and operator authority increases. This mirrors how shop-floor trust accumulates and prevents PRISM from regressing battle-tested code.

## 6. Sellable feature: "Optimization opportunities in your existing programs"

This is a **standalone PRISM product surface**:

> "PRISM analyzed your existing post-processor library and NC program archive. We identified N optimization opportunities — proposed S/F changes, smoothing inserts, canned-cycle consolidation, dwell rationalization. Expected cycle-time improvement: X% on Y programs. Estimated annualized savings: $Z. **Click to review each suggestion individually.**"

**Acceptance flow:**
- PRISM emits proposals as a queued review batch (not unsolicited PRs).
- Each proposal carries: physics rationale (Kienzle/Taylor citation), confidence interval, comparison row vs current program, expected delta on cycle time / tool life / surface integrity.
- Operator accepts → proposal becomes a `change_recommendation` event in the program timeline.
- Operator rejects → reason captured, fed back into Bayesian posterior as a negative example for future suggestions on that machine/tool/material combination.

**Acceptance rate = metric on PRISM itself.** If PRISM's acceptance rate < 30% over rolling 30-day window, the recommendation engine is throttled and a human reviews the proposal-generation prior. If > 70%, the engine is given more headroom for autonomous proposals. This makes PRISM **directly accountable** to the shop floor — its survival as a product depends on the rationality of its suggestions.

## 7. Implications for SFC and AI training

### 7a. Tribal IS canonical
The 14 PRISM-modified posts and the operator playbook entries (where status ≥ fine_tuned) carry **canonical authority** for shop-floor behavior. SFC (Speed/Feed Calculator) and the AI training stack must:
- Anchor priors on tribal where tribal exists
- Override tribal only when physics + observed outcomes both disagree
- Surface tribal disagreement explicitly in the UI ("PRISM disagrees with shop tribal because ...")

### 7b. Programs ARE observational data (not ground truth)
The 17,023 NC programs are observational — they reflect what was run, not what was optimal. SFC training:
- Uses programs as **likelihood evidence** in Bayesian update, not as parameter targets
- Weights programs by **outcome** (FAI pass / scrap / chatter event) when available
- Where outcome unknown, weights by program-recency and operator-tag (operator-A runs of recent vintage have higher weight than archival runs of unknown provenance)

### 7c. PRISM legitimately may exceed Mark's existing programs
This is the architecturally honest stance:
- PRISM has access to physics priors Mark does not directly use (Johnson-Cook constitutive model, Timoshenko deflection, regenerative chatter stability lobes).
- PRISM has access to comparative posterior across the 14 custom posts and 385 generic posts — pattern data Mark cannot mentally cross-correlate.
- PRISM has access to Bayesian uncertainty intervals on every recommendation — Mark estimates by gut.
- Therefore PRISM can, and should be allowed to, propose programs that exceed shop-floor practice — **gated by the convergence policy in §5 to ensure operator authority is preserved on `fine_tuned` and `production` work**.

The Master Post differentiation baseline (§4) is the explicit calibration: PRISM beats generic by a wide margin (always), matches hand-tuned by default (governed by §5), and proposes improvements over hand-tuned only when physics + outcomes both clear the bar.

---

## 8. Implementation hooks (forward-looking)

| Surface | Action |
|---------|--------|
| Regression suite | Tag the 8 qualifying baselines in `state/shared/REGRESSION-BASELINES.json` (next milestone) |
| Bayesian posterior | Add `survivor_bias_downweight` term to `BayesianCalibrationEngine` for envelope-violating observations |
| Sellable feature | Wire `analytics_record` → `quote_autopilot_calibrate` → operator review queue |
| Convergence policy | New engine `MasterPostConvergenceEngine` enforces §5 status-based authority gradient |
| Drift monitor | §2.4 brief drift monitor surfaces when corpus inventory drifts >10% from this snapshot |

This document supersedes any prior corpus-integration assumptions baked into the Master Post / SFC / AI training subsystems. Future PRs touching those subsystems must cite §2-§7 of this plan or explain divergence.
