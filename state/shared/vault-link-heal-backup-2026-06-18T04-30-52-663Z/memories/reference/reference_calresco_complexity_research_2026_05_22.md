---
name: reference-calresco-complexity-research-2026-05-22
description: "Deep research of calresco.org (complexity science) + assessment of what PRISM can apply — 12 findings, 5 recommended units"
aliases: reference_calresco_complexity_research_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-18T04:19:52.565Z
---


# CALResCo complexity-science research → PRISM applicability (2026-05-22, slot november /goal /loop)

**Trigger:** operator work order `/goal [ deep research every page on https://www.calresco.org/ |
assess what we can apply ]`.

**Site:** calresco.org — Chris Lucas's Complexity & Artificial Life Research Concept. Deep-read 28
substantive science pages (attractors, edge-of-chaos, CAS, autopoiesis, cybernetics, fitness
landscapes, Boolean nets, GA/CA/NN, multiobjective optimization, transient attractors,
edge-methodology). ~110 art pages + ~25 socio-philosophical essays catalogued but skipped — zero
engineering applicability.

**Core finding:** PRISM *is* a complex adaptive system; CALResCo is a near-perfect diagnostic lens
and exposes live mis-tunings.

**Top applicable items (full detail in the spec):**
- **F1 — Omega scalarization anti-pattern.** `Ω = 0.25R+0.20C+0.15P+0.30S+0.10L` is exactly the
  weighted-sum collapse CALResCo's multiobjective page warns against. Keep `S(x)` as a hard
  constraint; surface **Pareto fronts** for the rest. `prism_calc` already has `moo_nsga2` /
  `pareto_optimize` — gap is usage, not capability.
- **F2 — Dormant GNN = Ashby Requisite-Variety failure.** NN-GRAPH AUROC 0.096 (sub-random),
  `reference poolSize 0` = controller variety 0 → structurally cannot classify. Fix is variety
  seeding, not architecture; 0.096 also smells of a flipped train label (≈ a 0.904). 628 unwired
  engines = a K=0 frozen subnetwork (Kauffman).
- **F3 — Hebbian crystallization of error-ledger + tribal memory.** Add activation-count
  reinforce/decay so the existing promotion path self-tunes.
- **F4 — Self-Organized-Criticality fleet dashboard.** Power-law fit on commit/error/OOM events +
  Langton lambda on the call graph → "is PRISM at the edge of chaos?"
- **F5 — Universal edge-of-chaos process-stability detector** — model-agnostic chatter/thermal/wear
  classifier via period-doubling + Feigenbaum 4.669 signatures.

**Deliverable:** `state/shared/specs/CALRESCO-COMPLEXITY-APPLICABILITY-2026-05-22.md` — 12 findings,
5 advisory recommended units (P0: U-OMEGA-PARETO-SURFACE, U-GNN-VARIETY-SEED), §6 lists 7 PRISM
architecture choices CALResCo independently validates. Advisory only — nothing injected into
atomic-roadmap.json.

See also [[feedback-checkin-loop-goal-utilization-audit-2026-05-16]].
