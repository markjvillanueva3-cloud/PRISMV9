---
name: reference_academy_phase3_knowledge_tracing_2026_06_13
description: "Academy (lima) Phase-3 deeper anchor — Hermes-planned. Adaptive knowledge-tracing engine: Bayesian Knowledge Tracing (BKT, per-skill 4-param HMM) fused with Deep Knowledge Tracing (DKT, LSTM/Transformer over the interaction sequence) on PRISM's galaxy SKILL GRAPH; IRT (2PL/3PL) for item difficulty/discrimination + BKT hybrid -> real-time per-objective mastery probability; cognitive-load-aware + spaced-repetition scheduling; auto-assessment generation from the domain galaxies (mill/lathe/cam/etc.) mapped to MIT 2.008/2.810 + NIMS/SME competencies. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.459Z
aliases: reference_academy_phase3_knowledge_tracing_2026_06_13
---


**Context:** Phase-3 academy anchor — **Hermes-planned**. Deepens [[reference_academy_instructional_design_mit_2026_06_13]]
(Phase-2). Spec §lima.

## The next layer: an adaptive knowledge-tracing engine
- **Knowledge tracing (estimate mastery per skill, in real time):**
  - **BKT** (Bayesian Knowledge Tracing) — per-skill 4-parameter HMM (P-init, P-transit/learn, P-slip, P-guess);
    updates a latent "mastered?" probability after each response. Interpretable, the classic.
  - **DKT** (Deep Knowledge Tracing) — LSTM/Transformer over the student's interaction sequence; captures
    cross-skill dependencies BKT misses (learning skill A helps skill B) — exactly what PRISM's SKILL GRAPH
    encodes. Fuse BKT (interpretable per-skill) + DKT (sequence/graph) for the best of both.
  - **IRT (2PL/3PL)** — calibrate item difficulty + discrimination (+ guessing) so the mastery estimate accounts
    for HOW hard each question is. IRT + BKT hybrid = item-aware mastery probability.
- **Adaptive policy:** given per-objective mastery, schedule the next item to maximize learning (target the
  zone of proximal development) under **cognitive-load** limits (Sweller) + **spaced-repetition** review timing
  (mastered items resurface at expanding intervals). Bloom-level + Mayer-multimedia aware item selection.
- **Auto-assessment generation:** generate questions FROM the domain galaxies' knowledge (the mill/lathe/cam/
  SFC anchors + tribal tips) mapped to MIT 2.008/2.810 syllabus nodes + NIMS/SME competency lists → a living,
  domain-grounded item bank that grows as the galaxies' brains grow (the academy consumes ALL galaxies).

## Wiring / consumers (R15)
- GALAXY: `engines/academy/` (lima). INPUTS: every domain galaxy (subject matter) + the skill-graph. OUTPUTS:
  per-student mastery + credential progress (NIMS/SME). DOMAIN: academy; the BKT/DKT+IRT engine is lima-specific
  but consumes the whole fleet's knowledge.
- AUTO-INVOCATION: per-response mastery update (online); spaced-repetition review scheduler.

## Next (Phase-4, per Hermes — lima's build)
Build the BKT+DKT+IRT mastery estimator over the skill graph + the adaptive scheduler + the auto-assessment
generator (grounded in the domain anchors). Validate mastery-prediction AUC on simulated/real learner sequences.

Sources (Hermes-planned): Corbett & Anderson 1994 (BKT); Piech et al. 2015 (DKT); IRT (Lord & Novick 2PL/3PL);
Sweller (cognitive load); spaced-repetition (SM-2); MIT OCW 2.008/2.810; NIMS/SME competencies. Planner: Hermes
(xAI Grok, :8645).
