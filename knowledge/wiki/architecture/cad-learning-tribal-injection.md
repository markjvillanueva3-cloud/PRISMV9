---
title: CAD learning loop — tribal-knowledge injection arm
aliases: [cad-learning-tribal-injection, U-CAD-LEARN-TRIBAL-INJECT, cad_learning_recommend-tribal]
tags: [architecture, cad, learning, tribal-knowledge, india, closed-loop]
created: 2026-06-24
slot: india
milestone: CAD-LEARNING-AI
---

# CAD learning loop — tribal-knowledge injection arm

`U-CAD-LEARN-TRIBAL-INJECT` (slot:india, 2026-06-24). Connects PRISM's two CAD knowledge
sources that were previously isolated: the **learned** failure ledger and the **curated**
tribal corpus.

## The gap it closed

`CADTrialErrorLearningEngine` (`mcp-server/src/engines/CADTrialErrorLearningEngine.ts`) learns
from CAD regeneration-test outcomes in its own append-only ledger (frequentist failure-rate per
category, shrinkage-weighted recommendations, closed-loop attribution via `recordRecommendation`
-> `linkOutcome` -> `getLoopEfficacy`). But its `recommendAdjustments` emitted only **static,
hardcoded** suggestion strings per failure category. It never consulted the operator-curated CAD
tribal corpus (`CAD_DRAW_TRIBAL_TIPS`, the lessons slot:delta/zulu grow: topology-before-tolerance,
STEP-defaults-to-mm-set-INCH, never-emit-periodic-B-spline, sinker-EDM-spark-gap, archetype-match-
before-scale, lint-STEP-before-ship).

So a risk recommendation for a topology-mismatch-prone candidate could not surface "topology before
tolerance" even though that exact lesson lives one engine away (`CADTribalDrawInjectionEngine`,
wired to `cad_tribal_draw_query` for the DRAW pipeline but never to the LEARNING loop).

## How it works (design)

- Engine stays **I/O-pure**: `recommendAdjustments(candidate, { tribalProvider })` and
  `recordRecommendation(candidate, { recommendationId?, tribalProvider? })` take an injected, pure
  `TribalTipProvider` = `(ctx:{categories, candidate, limit}) => TribalAdvice[]`. No corpus reads in
  the engine. Mirrors the engine's existing purity contract and the per_app_incad_infer DI fix.
- `collectTribalTips` invokes the provider in a try/catch (a provider failure is **non-fatal** —
  advisory injection never breaks a recommendation), validates each tip (`id`+`tip` required),
  dedupes by id (first occurrence wins), sorts by `relevanceScore` desc (id-asc tiebreak), caps at
  `MAX_TRIBAL_TIPS=5`. Result attached as `Recommendation.tribalTips` (always present; `[]` when no
  provider).
- `RecommendationRecord.tribalTipCount` is persisted at issue time — a future **knowledge-arm
  efficacy split** signal (do tribal-injected recommendations outperform un-injected ones?).
- Dispatcher (`cadAutomationDispatcher.ts` `buildCadTribalProvider`) wires the **real**
  `CADTribalDrawInjectionEngine` + the tracked `CAD_DRAW_TRIBAL_TIPS` corpus (same source as
  `cad_tribal_draw_query` — reused, not forked) into a synchronous provider: it maps the
  recommendation's top failure categories (de-underscored) + candidate part/feature/generator onto
  a `DrawContext` query, then maps `injection.applied` -> `TribalAdvice`. Knobs on
  `cad_learning_recommend` / `cad_learning_record_recommendation`: `disable_tribal`, `tribal_corpus`
  (override).

## Why universal tips always surface

`CADTribalDrawInjectionEngine.recommend` marks a tip `matched` when a context signal fires;
`consume:"all ..."` (universal) always fires. So doctrine like `delta-tribal-004`
(topology-before-tolerance, consume "all cad mutation") is reliably injected regardless of the exact
query — the safety/doctrine floor.

## Tests

`CADTrialErrorLearningEngine.test.ts` (tribal describe block): no-provider default `[]`;
dedupe/sort/cap; throwing-provider fail-soft; malformed-tip filter; `tribalTipCount` persistence
survives ledger reload; and a **real-collaborator integration** test driving the actual
`CADTribalDrawInjectionEngine` + `CAD_DRAW_TRIBAL_TIPS` (topology candidate -> surfaces
delta-tribal-004). `cadAutomationDispatcher.cad-learning-tribal-inject.test.ts`: round-trip through
`prism_cad_automation` (tribalTips present, disable_tribal escape, tribal_corpus override). 63 pass.

## Gotcha (documented)

The dispatcher's `responseSlimmer` **prunes empty arrays**, so over the wire `tribalTips` is *absent*
(not `[]`) when no tips inject. Engine returns `[]`; assert `r.tribalTips ?? []` at the dispatcher
layer. (Cross-cutting PRISM slimmer behavior — see reference_dark_facade_action_class.)

## Related
- [[cad-text-to-cad-landscape]] — the text->CAD generation loop this learning layer feeds
- `reference_cad_print_learning_ai_goal_scope_2026_06_24` — the india-in-lane unit queue
- `reference_cad_learn_tribal_inject_2026_06_24` — ship memory
