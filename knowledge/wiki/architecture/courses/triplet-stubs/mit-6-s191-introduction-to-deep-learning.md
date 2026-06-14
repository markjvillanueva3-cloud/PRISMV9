---
title: "MIT 6.S191 triplet stubs — auto-extracted 2026-05-23"
type: triplet-stub
course_code: "6.S191"
course_slug: mit-6-s191-introduction-to-deep-learning
generated_by: scripts/mit-course-triplet-extractor.mjs
generated_at: 2026-05-24T01:37:14.357Z
slot: india
goal: MIT-COURSE-INTEGRATION batch extract
related:
  - knowledge/wiki/architecture/courses/mit-6-s191-introduction-to-deep-learning.md
  - state/shared/MIT-COURSE-TRIPLET-INDEX-2026-05-23.md
---

# MIT 6.S191 — triplet stubs (auto-extracted)

> Per-formula triplet stubs auto-generated from the parent course wiki entry.
> Each row is a candidate (course → formula → engine) triplet. ✅ rows have
> full hand-written memory + concept wiki entry. 📝 rows are stubs awaiting
> a per-formula deep dive (lima slot, prism-academy-specialist).
> ⬜ rows have no consuming engine documented — lima audit pending.

**Source course:** [[mit-6-s191-introduction-to-deep-learning]] · **Code:** `6.S191` · **Dept:** EECS

**Purpose in PRISM:** Feedforward/conv/recurrent nets, backprop, regularization, sequence models, RL basics. Feeds the neural-network engines (LoRA chains, conformal prediction, cross-process learning).

**Raw extracted-content string:** `Backprop + Adam optimizer, dropout/BN regularization, CNN/RNN/transformer block math, conformal-prediction wrappers, RL policy-gradient basics.`

## Triplet candidates

| Formula / algorithm / concept | Documented consuming engine(s) | Triplet status |
|---|---|---|
| Backprop + Adam optimizer | mitcoursedeeplearningengine, crossdisciplinarydeeplearningengine, mitcoursefullintegrationengine | 📝 stub — full triplet pending |
| dropout/BN regularization | mitcoursedeeplearningengine, crossdisciplinarydeeplearningengine, mitcoursefullintegrationengine | 📝 stub — full triplet pending |
| CNN/RNN/transformer block math | mitcoursedeeplearningengine, crossdisciplinarydeeplearningengine, mitcoursefullintegrationengine | 📝 stub — full triplet pending |
| conformal-prediction wrappers | mitcoursedeeplearningengine, crossdisciplinarydeeplearningengine, mitcoursefullintegrationengine | 📝 stub — full triplet pending |
| RL policy-gradient basics | mitcoursedeeplearningengine, crossdisciplinarydeeplearningengine, mitcoursefullintegrationengine | 📝 stub — full triplet pending |

## Apply

- Lima slot picks each 📝 row and writes the full per-formula triplet (paired memory + wiki concept entry following the [[ewma-run-to-run-controller-2026-05-23]] template).
- ⬜ rows require an engine audit first: either the formula has no PRISM implementation yet (build candidate), or the course wiki's "Consuming engines" row is incomplete (wiki fix).
- Re-run `node scripts/mit-course-triplet-extractor.mjs` after any course-wiki edit; the stubs are idempotent.

Related: [[mit-6-s191-introduction-to-deep-learning]] · [[reference_mit_courses_goal_scope_handoff_2026_05_23]]
