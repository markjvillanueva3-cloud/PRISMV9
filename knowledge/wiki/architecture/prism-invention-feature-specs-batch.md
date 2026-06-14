---
schema: ideablock-v1
title: "INVENTION SPECS (batch) — feature specs F1/F2/F4 + Phase-B completion summary"
domain: "PRISM architecture"
category: invention
version_state: Current
confidence: 0.92
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - [[prism-invention-high-roi-engine-ideas]] (ideas F1,F2,F4)
  - The 59 prior canonical entries of the 2026-05-21 pivot
extracted_via: human-authored
extracted_at: 2026-05-21T19:25:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INVENTION-FEATURE-BATCH)
---

## Purpose

Phase-B builder-ready specs for the feature inventions, plus the **Phase-B completion summary**. With this entry, all 16 ideas in [[prism-invention-high-roi-engine-ideas]] have builder-ready specs — Phase B of the operator /goal is exhausted.

---

## F1 — Distribution-valued speed/feed output

**Derives from** [[math-speed-feed-the-full-physics]] §statistical layer.
**What:** every SFC speed/feed recommendation ships a *distribution* — P50 + P95 (and σ) — not a single point.
**Implementation:** the SFC `compute()` already produces a point estimate. Wrap it: identify the uncertain inputs (kc1.1 ±10-15 %, runout, FRF drift), propagate via Monte Carlo (reuse E4's MC core), return `{ feedP50, feedP95, forceP50, forceP95, toolLifeP50, toolLifeP05, confidence }`.
**Decision rule:** ship the **P95 force** (not the mean) as the design point — designing to the mean means half the cuts exceed it. Tool life: ship **P05** (the conservative tail).
**Edge cases:** inputs with no known variance → use regime defaults + flag "uncertainty estimated, not measured"; degenerate (all CV=0) → distribution collapses to the point estimate.
**Wiring:** extend `prism_product:sfc_stochastic` (exists — verify it already does this; if it returns only a point, this is the gap). **ROI:** the single highest-integrity change to SF output — turns a number into a risk-aware spec. ~80 LOC wrapper.

---

## F2 — Tribal-anchor auto-link in dispatcher descriptions

**Derives from** [[wiring-pattern-engine-to-dispatcher]] §bridge-to-tribal coupling.
**What:** every wired dispatcher action's Zod `.describe()` string ends with a `[[wiki-entry]]` pointer to its canonical tribal/math wiki entry.
**Implementation:** a script `scripts/inject-tribal-anchors.mjs` — for each dispatcher action, match its domain/keywords against the 59-entry wiki index, append the top match as `… See [[entry-name]].` to the `.describe()`. Idempotent (skip if a `[[...]]` already present). Run as a one-shot + a Stop-hook re-check on dispatcher edits.
**Edge cases:** action with no matching wiki entry → leave unchanged (don't force a bad match); multiple strong matches → append the top-1 only; `.describe()` already has an anchor → skip.
**Wiring:** it's a codemod script, not an engine. Output: modified dispatcher `.ts` files. **ROI:** compounds the entire system-injection layer — when an operator's prompt surfaces an action, the canonical wiki entry surfaces with it. Tiny per-action effort, system-wide compounding. ~120 LOC codemod.

---

## F4 — Cross-domain "which-limit-binds" diagnostic

**Derives from** [[synthesis-rigidity-envelope]] + [[synthesis-thermal-envelope]].
**What:** given a precision/quality failure, route the diagnosis through the rigidity vs thermal synthesis to name the binding limit.
**Contract:** `diagnose(symptom, cutContext) → {bindingLimit: 'rigidity'|'thermal'|'both'|'neither', confidence, evidenceChain[], recommendedEntry}`.
**Algorithm:** a decision tree over the symptom (chatter/finish/drift/distortion) × the cut context (stickout, MRR, coolant, cycle time) → score the rigidity-side evidence vs the thermal-side evidence → route to the dominant synthesis entry + its leaves.
**Edge cases:** ambiguous symptom → return 'both' + both chains; symptom not in the taxonomy → 'neither' + route to [[index-by-symptom-and-task]].
**Wiring:** `prism_diagnosis:which_limit_binds` (new) + consumes the symptom taxonomy from [[index-by-symptom-and-task]]. **ROI:** turns the two synthesis capstones into a live diagnostic — the operator's "is this force or heat?" first question, answered. ~150 LOC.

---

## Phase-B completion summary

All 16 invention ideas now have builder-ready specs:

| Type | Ideas | Spec location |
|---|---|---|
| Detailed engine specs | E1 StabilityLobeAdvisor, E7 QueueingLeadTime | [[prism-invention-stability-lobe-advisor-spec]], [[prism-invention-queueing-leadtime-spec]] |
| Detailed tool spec | F3 wiki→training-pairs | [[prism-invention-wiki-to-training-pairs-spec]] |
| Batch engine + algorithm specs | E2,E4,E6,E8,A2,A3,A4 | [[prism-invention-engine-specs-batch]] |
| Batch feature specs | F1,F2,F4 | this entry |

**Recommended build order** (highest compounding first): F3 (wiki→training, ~100 LOC, turns all pivot work into AI capability) → F2 (tribal-anchor auto-link, compounds injection) → E1 (StabilityLobeAdvisor, chatter is the #1 operator pain) → F1 (distribution-valued SF, integrity) → E7 (QueueingLeadTime, makes the queueing law actionable) → A2 (minimum-zone fit, Y14.5.1 compliance) → the rest as capacity allows.

**Every build** runs `duplicationGuardEngine.mustCheckBeforeCreating()` first — several (E3, E5, E6, E7, A3, F1) are flagged verify-then-extend because partial implementations likely exist. The invention queue is a *proposal* set; `mustHumanVerify` before committing to any build.

## Provenance

Phase-B builder-ready batch specs + completion summary — **61st canonical entry** of the 2026-05-21 pivot. Covers F1/F2/F4 from [[prism-invention-high-roi-engine-ideas]] and closes Phase B: all 16 invention ideas now have builder-ready specs (3 detailed + 13 batched). Authored 2026-05-21 by slot:hotel under U-WIKI-INVENTION-FEATURE-BATCH. Confidence 0.92 — specs are sound; verify-then-extend prerequisites must run before any build. **With this entry, the operator /goal Phase B is exhausted.**

System injection: auto-surfaces on `distribution-valued speed feed`, `P95 force`, `tribal anchor auto-link`, `dispatcher description anchor`, `which limit binds`, `rigidity vs thermal diagnostic`, `invention spec`, `Phase B complete` keywords.

## Cross-references

- [[prism-invention-high-roi-engine-ideas]] — the invention queue (all 16 ideas)
- [[prism-invention-engine-specs-batch]] — companion (engines + algorithms)
- [[prism-invention-stability-lobe-advisor-spec]] · [[prism-invention-wiki-to-training-pairs-spec]] · [[prism-invention-queueing-leadtime-spec]] — the 3 detailed specs
- [[synthesis-rigidity-envelope]] · [[synthesis-thermal-envelope]] — F4 routes through these
- [[math-speed-feed-the-full-physics]] — F1 derives from the statistical layer
- [[wiring-pattern-engine-to-dispatcher]] — F2 + every spec's wiring
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (Phase B exhausted)
- [[feedback_do_optional_high_roi_work]] — standing rule
