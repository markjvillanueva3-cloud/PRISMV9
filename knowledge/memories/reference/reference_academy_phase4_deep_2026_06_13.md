---
name: reference_academy_phase4_deep_2026_06_13
description: "Academy (lima) Phase-4 deep anchor — direct-authored (Hermes-loop straggler; zulu, R12). Five deeper sub-domains past BKT/DKT/IRT: (1) attention-based knowledge tracing (SAKT/SAINT+/AKT) + logistic PFA/AFM as DKT alternatives; (2) lightweight online ability estimation — Elo/Glicko + half-life regression (Duolingo) + FSRS spacing beyond SM-2; (3) Computerized Adaptive Testing — Maximum Fisher Information selection + Sympson-Hetter exposure control + content balancing; (4) learning-science substrate — power law of practice, desirable difficulties (Bjork), ICAP engagement (Chi), Bloom 2-sigma mastery; (5) interoperability — xAPI/Caliper analytics + IMS QTI item exchange. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.459Z
aliases: reference_academy_phase4_deep_2026_06_13
---


## Context

Phase-4 anchor for the academy galaxy (slot: lima). Direct-authored by zulu (its workflow research agent
hung on a Hermes/Ollama call; the 12 completed galaxies went through the full pipeline — for this
non-cutting straggler, direct authoring is the R6 adaptation). Deepens:
- [[reference_academy_phase3_knowledge_tracing_2026_06_13]] — Phase-3 (BKT 4-param HMM + DKT LSTM + IRT 2PL/3PL + spaced-repetition)
- [[reference_academy_instructional_design_mit_2026_06_13]] — Phase-2 (instructional design, MIT 2.008/2.810)

The five sub-domains below are the next layer a world-leading learning-engineering expert masters. R12:
every model is a real, named, citable source; no fabricated benchmark numbers.

## The deeper increments

### 1. Attention-based knowledge tracing + logistic alternatives to DKT
Phase-3 used DKT (LSTM). The frontier moved to **attention/Transformer KT**, which handles long
interaction sequences + interpretable attention over past items better than an RNN:
- **SAKT** (Pandey & Karypis 2019) — self-attentive KT; a single attention layer over the exercise
  sequence, outperforms DKT on sparse data.
- **SAINT / SAINT+** (Choi et al. 2020, EdNet) — separated self-attention with a deep encoder-decoder
  (exercise stream + response stream), + SAINT+ adds elapsed-time + lag-time features.
- **AKT** (Ghosh et al. 2020) — context-aware attentive KT with a monotonic attention + a
  Rasch-model-based embedding (ties KT back to IRT). Strong interpretability.
- **Logistic, non-neural alternatives** (interpretable, used in real ITS / Cognitive Tutor + DataShop):
  **PFA** (Performance Factors Analysis, Pavlik-Cen-Koedinger 2009) and **AFM/LFA** (Additive Factors
  Model, Cen-Koedinger-Junker 2006). These are logistic regressions over a Q-matrix (skill tags) — fast,
  transparent, and the workhorse of deployed adaptive tutors. Fuse: AFM/PFA for interpretable per-skill
  mastery + an attention-KT for sequence/cross-skill signal.

### 2. Lightweight online ability + retention estimation
Full IRT/BKT calibration is heavy. Deployed systems (Duolingo, Khan) use cheaper online estimators:
- **Elo / Glicko rating** for item difficulty + learner ability — a single update per response, no batch
  calibration; mathematically a 1PL-IRT online approximation. Ideal for cold-start + continuously-growing
  item banks (the academy's item bank grows as galaxies' brains grow).
- **Half-Life Regression** (Settles & Meeder, ACL 2016) — Duolingo's spaced-repetition model; predicts
  memory half-life from features, schedules review at the recall-probability threshold.
- **FSRS** (Free Spaced Repetition Scheduler — the DSR model: Difficulty, Stability, Retrievability) —
  the modern successor to SM-2 (Phase-3 used SM-2); fits per-learner memory parameters and optimizes
  review timing to a target retention. A measurable upgrade over SM-2's fixed ease-factor heuristic.

### 3. Computerized Adaptive Testing (CAT) — principled item selection
Beyond "pick the next item," CAT theory (Wainer; van der Linden & Glas):
- **Maximum Fisher Information** item selection — choose the next item whose information is maximal at the
  current ability estimate θ̂ (most efficient measurement). Also Bayesian (MEPV/maximum expected posterior
  variance reduction).
- **Exposure control** — **Sympson-Hetter** method so high-information items aren't over-used (item
  security + bank longevity).
- **Content balancing** (constrained CAT / shadow-test, van der Linden) — ensure blueprint coverage across
  skills while still maximizing information. Stopping rules: fixed-length vs fixed-precision (SE(θ) < τ).
This turns assessment from a fixed quiz into an efficient adaptive measurement — fewer items, tighter
mastery estimate.

### 4. Learning-science substrate (the WHY behind the scheduler)
- **Power law of practice** / log-log learning curve (Newell & Rosenbloom 1981) — performance vs practice
  is a power law; the model behind AFM's learning-rate term and realistic mastery-trajectory prediction.
- **Desirable difficulties** (Bjork 1994) — retrieval practice, spacing, interleaving improve long-term
  retention even though they slow apparent short-term performance — the scheduler should optimize *durable*
  learning, not next-item accuracy.
- **ICAP framework** (Chi & Wylie 2014) — Interactive > Constructive > Active > Passive engagement modes;
  guides item/activity TYPE selection, not just difficulty.
- **Mastery learning + Bloom's 2-sigma** (Bloom 1984) — the aspirational target (1:1 tutoring + mastery
  learning ≈ +2σ); the academy's reason to exist. Keller's PSI (personalized system of instruction) for
  the mastery-gate structure.

### 5. Interoperability standards (so the academy plugs into the world)
- **xAPI (Experience API / Tin Can)** + **IMS Caliper** — learning-analytics event standards; emit every
  interaction as a statement (actor-verb-object) to a Learning Record Store → the data substrate for KT.
- **IMS QTI** (Question & Test Interoperability) — portable item/assessment format; lets the auto-generated
  item bank export to standard LMS/assessment platforms.
- **NIMS / SME credentialing** mapping (from Phase-3) → competency frameworks the mastery estimate feeds.

## Wiring / consumers (R15)
- GALAXY: `mcp-server/src/engines/academy/` (slot: lima). INPUTS: every domain galaxy (subject matter for
  the item bank) + the skill graph (Q-matrix). OUTPUTS: per-learner mastery (KT) + credential progress
  (NIMS/SME) + xAPI events to an LRS. DOMAIN: academy — lima-specific engines, but consumes the WHOLE
  fleet's knowledge (the item bank is grounded in the domain anchors).
- AUTO-INVOCATION: per-response online update (Elo/PFA/attention-KT); CAT item selection; FSRS review
  scheduler. No inline magic constants — IRT/Elo/FSRS parameters are fitted + versioned, not hardcoded.

## Next (Phase-5, honestly scoped)
1. Add an **attention-KT (SAKT/AKT)** alongside the Phase-3 DKT + an interpretable **AFM/PFA** logistic
   layer over the skill-graph Q-matrix; compare mastery-prediction AUC on learner sequences (multi-seed).
2. **Elo online difficulty** + **FSRS** scheduler (replace SM-2) for the growing item bank.
3. **CAT** item selection (Max Fisher Information + Sympson-Hetter exposure + content balancing).
4. **xAPI/Caliper** event emission + an LRS + **QTI** item export for interoperability.
5. Ground all of it in the domain galaxies' Phase-2/3/4 anchors (the item bank IS the fleet's knowledge);
   validate KT calibration (reliability/Brier) on simulated + any real learner data.

## Sources
- Pandey, S. & Karypis, G., "A Self-Attentive model for Knowledge Tracing", EDM 2019 (SAKT).
- Choi, Y. et al., "Towards an Appropriate Query, Key, and Value Computation for Knowledge Tracing"
  (SAINT), L@S 2020; Shin et al., SAINT+ 2021.
- Ghosh, A., Heffernan, N., Lan, A., "Context-Aware Attentive Knowledge Tracing" (AKT), KDD 2020.
- Pavlik, P., Cen, H., Koedinger, K., "Performance Factors Analysis", AIED 2009; Cen, Koedinger, Junker,
  "Learning Factors Analysis / AFM", ITS 2006.
- Settles, B. & Meeder, B., "A Trainable Spaced Repetition Model for Language Learning", ACL 2016
  (half-life regression); FSRS (Ye, Su, et al. — DSR spaced-repetition model).
- van der Linden, W. & Glas, C. (eds), *Computerized Adaptive Testing: Theory and Practice*, 2000;
  Sympson & Hetter (exposure control, 1985); Wainer, *Computerized Adaptive Testing: A Primer*.
- Newell, A. & Rosenbloom, P., "Mechanisms of skill acquisition and the law of practice", 1981.
- Bjork, R., "Memory and metamemory considerations" (desirable difficulties), 1994; Chi & Wylie, "The
  ICAP Framework", Educational Psychologist, 2014; Bloom, B., "The 2 Sigma Problem", 1984.
- ADL xAPI (Experience API); IMS Global Caliper Analytics; IMS QTI; NIMS/SME competency frameworks.
- Direct-authored by zulu (orchestrator) per R6 — the workflow's Hermes-planned research agent for this
  galaxy hung; the 12 completed galaxies went through the full Hermes→sonnet→opus-verify pipeline.
