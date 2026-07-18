---
name: reference_india_refpool_grow_classes_2026_06_25
description: India grew the GNN tier-5 reference-pool seed +10 verified Tier-A entries spanning 4 NEW dispatcher classes (cad/business/intelligence/safety), U-REFPOOL-GROW-CLASSES (348252bfec) + scrutiny-fix U-REFPOOL-GROW-FIX-ESTIMATE (783615cd36). KEY LESSON: verifying a dispatcher action by bare grep-presence is UNSAFE -- an engine-loader nickname (getEngine key) collides with an action name (bare "estimate" was a getEngine key; the real action is estimate_create). Verify by ENUM-MEMBERSHIP + top-level dispatch case (dispatchability), not grep. Both scrutiny arms caught it.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.620Z
aliases: reference_india_refpool_grow_classes_2026_06_25
---


# India GNN ref-pool growth + the grep!=dispatchability lesson (2026-06-25)

## What shipped
`reference-pool-seed-2026-05-23.json` (GNN tier-5 wiring-inference seed): 27 -> 37 entries.
+10 Tier-A POSITIVE labels spanning 4 NEW dispatcher classes none of the original 27 covered
(addresses the leg #10 "concentrated 1/13 classes" gap):
- prism_cad: feature_recognize, geometry_create, mesh_generate
- prism_business: estimate_create, quote_generate
- prism_intelligence: job_plan, setup_sheet
- prism_safety: check_toolpath_collision, validate_rapid_moves, check_fixture_clearance
Soul-compliant: every ref dispatch-verified, advisory (policy.advisoryOnly + mustHumanVerify
preserved -- operator still gates promotion to authoritative training), NOT promoted, NOT fabricated.

## THE LESSON (compounding -- the bug class scrutiny caught)
**grep PRESENCE != DISPATCHABILITY.** My first pass verified each candidate action by
`grep -c '"<action>"' <dispatcher>.ts > 0`. That ADMITTED a mislabel: `prism_business:estimate`
grep'd 2 hits -- but both were the engine-loader key `case "estimate":` inside `getEngine(name)`
(businessDispatcher.ts:197), NOT a dispatchable action. The real action is `estimate_create`
(in the ACTIONS z.enum :1560 + top-level case :1962). A call to `prism_business:estimate` would
Zod-REJECT. A wrong Tier-A label POISONS the GNN (india soul refusal). Both 2-arm scrutiny agents
independently FAILed on exactly this entry. FIX: estimate -> estimate_create (dispatch-verified).
**Correct verification for "is this a real dispatcher action": ENUM-membership (z.enum/ACTIONS) AND
a top-level routing case -- never bare grep** (engine-registry nicknames collide with action names).

## CONTEXT for the next fire (analyst P2 -- the genuine next unit)
The seed is currently **advisory-only with NO live ingestion path**: `buildHoldout`
(scripts/lib/nn-graph-eval.mjs) draws the reference pool from LIVE graph nodes of
`kind:"ghost.unwired-engine"` (with proposed_wiring/label fields) -- a DIFFERENT schema than
`seedEntries`. grep finds zero `.mjs` consumers of `seedEntries` (only PATHS.md / the seed's own
`expectedConsumers` claim, which is stale). So this growth is LATENT -- the mislabel never reached
the classifier (P1 not P0), and the pool's value is unrealized until a feeder exists.
**NEXT IN-LANE UNIT: build a feeder that translates verified `seedEntries` -> graph
`ghost.unwired-engine` nodes** so the eval/buildHoldout actually consumes the seed -- THEN the
class-spanning growth lifts full-coverage. Until then, growing seedEntries is necessary-but-not-
sufficient. Sibling: [[reference_gnn_pool_collapse_confidence_deflation_2026_06_15]] (holdout
collapse = a SEPARATE confidence-deflation issue, not pool-size).
