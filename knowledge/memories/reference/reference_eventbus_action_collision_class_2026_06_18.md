---
name: reference_eventbus_action_collision_class_2026_06_18
description: "EventBus.registerAction is silent last-writer-wins (Map.set, no dup-check) -- two modules registering the same action name silently clobbers a handler; reactive-chains reoptimize_schedule collision + the fail-loud dup-guard that closed the class."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.569Z
aliases: reference_eventbus_action_collision_class_2026_06_18
---


2026-06-18 (slot:bravo, session d6db4d0e). Two reactive-chains pre-activation defects, both rooted in one footgun.

## The bug (instance)
`reactiveChainBootstrap.ts:459` (Chain 11 `capacity_to_scheduling`, emits `EventTypes.SCHEDULE_OPTIMIZED`) and `cycleSchedulingBridge.ts:316` (INTEG-MS3, emits `schedule.updated`) BOTH registered an action literally named `"reoptimize_schedule"` on the SAME global `eventBus` singleton. `EventBus.registerAction` is `this.actionRegistry.set(name, handler)` (`EventBus.ts:1230`) -- a plain `Map.set`, silent last-writer-wins, no dup-check. So whichever module loaded second silently REPLACED the other's handler, and `executeChain` (which resolves each step via `actionRegistry.get(step.action)`, `EventBus.ts:1167`) ran the WRONG handler for the loser chain -- emitting the wrong downstream event. Gated default-OFF (`PRISM_REACTIVE_CHAINS_ENABLE`) so it never bit live, but it was a real pre-activation defect.

## The fix (instance + class)
- **Instance** -- `846003383f` U-REOPT-COLLISION-FIX: renamed the bootstrap's action `reoptimize_schedule -> reoptimize_schedule_capacity` (registerAction + chain-def step + error log, 3 sites in lockstep); the bridge keeps `reoptimize_schedule` (its INTEG-MS3 test asserts that name, unchanged). Chose to rename the bootstrap (no name-assertion test) over the bridge (has one) = minimal blast radius. 3 REAL behavioral tests (publishTyped -> executeChain -> assert which handler ran + its computed payload, NOT presence).
- **Class** -- `62a464cca7` U-EVENTBUS-DUP-WARN: a fail-loud guard in `registerAction` -- `if (this.actionRegistry.has(name)) log.warn(...)` BEFORE the unchanged `set`. Behavior-preserving (still overwrites, back-compat for 23 importers / legitimate re-registration), but a future same-name collision now WARNs loudly instead of silently dropping a handler. Census confirmed zero duplicate action names today, so it fires only on a real future collision. 4 behavioral tests (spy the live `log` singleton).

## Lesson (generalizable)
A registry built on `Map.set(name, value)` with no `has()` pre-check is a SILENT-CLOBBER footgun: a duplicate key silently makes one entry unreachable. When the keys come from independent modules (bootstraps, plugins, chains), a name collision is a latent bug that surfaces only as "the wrong handler ran" -- very hard to diagnose. Fix the INSTANCE (disambiguate the names) AND close the CLASS (a fail-loud `has()`-warn so the next collision is loud, not silent) -- R16 close-the-class + R12 fail-loud. The TEST LEGITIMACY GATE correctly rejected presence-only `toContain`/`toBeTruthy` assertions; the real test invokes the handler through the live chain and asserts WHICH ran.

## Still open (NOT a bug -- operator judgment)
Reactive-chains blocker 2: the `job_to_invoice` chain auto-fires `job.completed -> invoice.created` fleet-wide when the subsystem is enabled. Consequential (auto-creates invoices) -- needs operator sign-off before `PRISM_REACTIVE_CHAINS_ENABLE` flips on. Gated on the operator decision, not autonomously decidable (soul refuse `unsafe-fleet-control-before-governance`).

Related: [[feedback_always_capture_lessons]] · [[feedback_always_update_wiki_on_bug_finding]] · [[feedback_dispatcher_path_green_not_engine_green]] (a green name-present check can hide zero runtime capability -- same family).
