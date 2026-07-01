---
name: reference_rgs_planning_loop_bridge_2026_06_11
description: RGS-PLANNING-LOOP-BRIDGE-MS0 — closed plan->build->loop with substrate routing wired into RGS; ultracode-planned, 10 units, 97 tests; plan-mode->bypass auto-flow proven INFEASIBLE
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.145Z
aliases: reference_rgs_planning_loop_bridge_2026_06_11
---


**RGS-PLANNING-LOOP-BRIDGE-MS0** (2026-06-11, slot:tango, [MAIN] [BOOTSTRAP-SLOT-ENFORCE]). Closes the gap: loop discipline (eval-gate-per-step, each-pass-feeds-next, budget-stop) lived ONLY in execution; planning was one-shot/cold. Now a closed **plan -> build -> loop** with substrate-optimal routing is wired into the EXISTING RGS pipeline. Spec: `state/shared/specs/RGS-PLANNING-LOOP-BRIDGE-MS0-DESIGN-2026-06-11.md` (v2 has the SHIPPED table).

**Planned via ultracode** (bounded 9-agent Workflow `wf_fa4b142b-2c8`: 4 investigate + 3-lens draft + adversarial + synthesize). The adversarial arm earned its keep — caught 3 P0 + the headline R12 save BEFORE any code.

**Shipped (10 units, 97/97 tests, 0 regression):**
- **U1** `scripts/lib/planning-loop.mjs` — `decidePlanningAction({recentEvals,consecutiveFails,budgetRemaining,exhausted,replansSoFar})` decision core, STOP-first (single termination authority). 16 tests.
- **U0+U3** `.claude/helpers/loop-state.mjs` — `tick --eval-score` (P0 guard: bare flag = boolean true, `Number(true)===1` spurious PASS -> `typeof==='string' && Number.isFinite`), Welford `evalsByType` keyed by imported `classifyUnit` (single-owner taxonomy), **carried across the cmdNext roll** (U0 keystone -- without it re-rank dies after roll #1). 11 tests.
- **U2** `scripts/lib/task-substrate-router.mjs` — `routeTask(type,phase,ctx)` 5-substrate matrix (Ollama/Obsidian/Hermes/Master-graph/PSN); imports forge-route taxonomy + `shouldUseWorkflow` Hermes gate; `ctx.cores` threaded so cap=16 not 6. 9 tests.
- **U5** `cmdNext` -> `decidePlanningAction` (roll-cap/exhausted folded into U1's `exhausted` = single authority); opt-in `--atcs-replan` HONEST (checks real autonomous-tasks dir -> `skipped`, never false `executed`). 9 tests.
- **U4** `.claude/helpers/priority-queue.mjs` — `applyEvalRerank` + `readAccumulatedScores` (reads LIVE loop-state evalsByType, NOT inert omega_score); within-tier tiebreaker that NEVER crosses priority boundaries; no-op on homogeneous tiers (documented). 9 tests.
- **U7** `.claude/hooks/task-start-substrate-inject.mjs` — surfaces U2 routing when a loop is active; wired into UserPromptSubmit after master-index in C:+H: settings. 8 tests.
- **U6/U8/U9** LOCAL-ONLY (gitignored, on disk): `propose-goal.md` vault-warm step (1b), `rgs6.md` **PLANNING-LOOP-BRIDGE LAW** (P2 plan / P3 build / P4 loop), plan-mode honesty doc.

**KEY R12 SAVE — plan-mode -> bypassPermissions auto-flow is INFEASIBLE.** Verified: `H:/.claude/settings.json` already sets `defaultMode: bypassPermissions` (global default -- no flip needed/possible); `EnterPlanMode`/`ExitPlanMode` are NOT Claude Code tools; hooks get `permission_mode` READ-ONLY. The "gate" is a TEXT prompt-pause, not a mode switch. NEVER set `defaultMode: plan` in project settings (overrides user bypass fleet-wide). See [[feedback_psn_definition]].

**Loop soundness:** RERANK_TRIGGER=0.4 (NOT 0.6 -- binary eval source makes 0.6 a dead branch), REPLAN at 2 fails, MAX_REPLANS=3, roll-cap MAX_ROLLS=8. Termination: halts within `min(target,8)x(1+3)`. Lesson: a within-class tiebreaker keyed by category is a no-op on homogeneous tiers (class==category) -- the real escape from a failing unit is consecutiveFails->replan->stop, not re-rank.

Related: [[reference_forge_route_2026_06_11]] (forge-route taxonomy U2 imports), [[reference_u_flor_claude_tier_2026_06_11]] (claudeModel ladder).
