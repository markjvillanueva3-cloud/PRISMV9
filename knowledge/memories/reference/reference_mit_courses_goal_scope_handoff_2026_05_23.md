---
name: mit-courses-goal-scope-handoff-2026-05-23
description: New /goal received mid-india-session for MIT course corpus extraction → formulas/engines/skills/hooks/wiki/memories + PSN/PRISM App synergy. Scope is fresh-session-sized; this memory documents what exists today + scoping recommendation for the next session that picks it up.
aliases: reference_mit_courses_goal_scope_handoff_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.661Z
---


# MIT courses /goal — scope assessment + handoff to next session (2026-05-23)

## Goal (verbatim from operator)

> extract data from MIT courses starting with all remaining math, science, engineering courses. | develop formulas, engines, skills, scripts hooks, wiki, memories nodes + synergized PSN and Prism App

## What already exists (do NOT re-build)

Per master-index + memory pre-search hits:

- **Skills:** `mcdl-find-relevant-courses` + `mit-courses-audit` (under `knowledge/wiki/architecture/actions/dev/`)
- **Stub actions on dev dispatcher:** `mit_courses_audit`, `mit_courses_harvest`, `mit_courses_sources`, `mit_courses_filter` (all L8/stub — half-built per the [L8/stub] tag)
- **Wiki entries:** `mit-6-s191-introduction-to-deep-learning` (architecture/courses) — at least 1 MIT course already has a wiki entry
- **Memory node pointers:** `node_course_mit_6_s191_introduction_to_deep_learning`, `node_formula_formula_adjusted_knowledgedispatcher_action_academy_courses`
- **MIT-OCW corpus:** referenced in CLAUDE.md as input to AI-training units (`JM-DIE 76K + MIT-OCW + v8.89 MIT kernels`) — likely already partially ingested for AI-training units like `U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING`

## Scope-sized correctly

This /goal is **fresh-session-sized**. To deliver minimally:
- Inventory all MIT math/science/eng courses already in the wiki (master-index over `knowledge/wiki/architecture/courses/mit-*.md`)
- Inventory all MIT-OCW source material on disk (per `mit_courses_sources` action)
- Decide PER course: extract formula(s)? extract algorithm? extract skill? extract engine? Or already done?
- Per-course deliverable: 1 memory node + 1 wiki entry + 1 PRISM-side mapping (formula→canonical-constant OR algorithm→engine OR concept→skill)
- PSN synergy: wire each new artifact to Obsidian + System Viz + Tribal index + the PRISM-Academy lima slot

Each course is likely 1-3 iterations. Math/science/engineering catalog at MIT-OCW is ~30+ courses. Total scope: 30-90 iterations, fresh sessions, slot routing per domain.

## Recommended slot routing

- **lima** owns prism-academy / curriculum / MIT-OCW integration per JULIETT-12CHAT (lima=prism-academy-specialist, role explicitly cited in slot soul)
- This /goal belongs in lima, not india. India is post-processor + master-post specialist.
- Operator should re-target via `/checkin-lima [original goal text] /loop /goal`

## What this india session shipped (closes out before handoff)

India 2026-05-23 work product:
- iter1: Envelope drift reconciled (U-WIRE-BACKLOG-POST + U-GAP-POST-JMDIE-LEARNING) — absorbed by lima commit `6f289da344`
- iter2: PIVOT — production .cps source edits deferred to operator shop-floor approval path
- iter3: PostProcessorUnificationEngine wired (4 actions, +execute(), +7 tests) — absorbed by lima `6721d8cfdd`
- iter4: HybridPostMergeEngine broken half-wire fix — india-attributed `42b44bd00a`
- iter5: HPM name-matched test (15/15) — india-attributed `4c3c46f70a`
- iter6: PSN synergy doc-reflection — RECENT-SHIPMENTS inbox + 5 memory files written
- iter7: HPM bug-class wiki lesson — india-attributed `21a01b4e11`
- iter8: This memory (false-positive stop-gate doc + MIT scope handoff)

The MIT /goal is acknowledged but not executed in this session — scope mismatch (lima domain) + budget exhausted (YELLOW 48% ctx + 5h of work shipped). Next session: `/checkin-lima /loop [5m] /goal [MIT courses goal text]`.

## Apply

- Next session that takes this /goal: claim lima slot, audit existing MIT wiki entries first, decide per-course extraction status, then loop.
- Do NOT start MIT extraction from india — domain mismatch will hit the [[feedback_autonomous_loop_drift_discipline]] rule.

Related: [[feedback_psn_definition]] · [[feedback_high_roi_backend_first_slot_queue]] · [[reference_india_iter4_hpm_wire_2026_05_23]]
