# RGS-PLANNING-LOOP-BRIDGE-MS0 — Design Spec

**Author:** slot:tango (claude-97872074) · **Date:** 2026-06-11 · **Status:** approved (operator), build in YOLO
**Brainstorm:** operator chose Full-system + Fully-automatic + Approach-A (extend-in-place, comprehensive build-out).

## Goal
Bridge a **closed planning+execution loop with substrate-optimal routing** into PRISM's EXISTING RGS roadmap/plan generation, add an **auto plan-mode → bypass-permissions** build flow, and wire **Obsidian vault + Hermes + /system-viz(master-graph) + PSN + deeper loop logic** into both planning AND execution.

## The gap this closes
Loop discipline (closed-loop, eval-gate-per-step, each-pass-feeds-next, self-correct, budget-stop) lives ONLY in PRISM's execution phase. **Planning is one-shot/cold**: `/propose-goal` decomposes once; `/pick-unit`+`priority-queue` rank statically; `loop-state tick` stores a self-reported STRING not a numeric eval; `prism_atcs:replan` is a real closed-loop replanner but DISCONNECTED from the mainstream `/loop` path; Obsidian/Ollama/Hermes/master-graph feed execution but NOT the planning step. (Confirmed by X-ARTICLE-SYNERGY-AUDIT: "/loop eval-gate is self-reported, not verified".)

## Existing surfaces to BRIDGE (tango dedup — extend/wire, never rebuild)
- RGS skills: `/rgs` `/rgs2..6` (rgs6 latest) `/generate-roadmap` `/rgs-sync` — roadmap/plan generation (LOCAL-ONLY gitignored .md).
- `.claude/helpers/loop-state.mjs` (start/tick/end/next) · `.claude/helpers/priority-queue.mjs` · `prism_atcs` dispatcher (task_init/resume/replan/checkpoint) · `/propose-goal` (AutonomousGoalSynthesisEngine) · `/pick-unit`/`/pick-dev` · ROADMAP-CONSOLIDATED.
- THIS SESSION: `scripts/lib/forge-route.mjs` (phase→lane) · `scripts/run-verification-channel.mjs` (deterministic PASS/FAIL eval) · `forge-route-inject` hook.
- Substrates: Obsidian vault (`memory_search`, `ask-ollama viz`) · Hermes/zebra agent-fleet · `/system-viz` master-graph (`master_index_query`, `system-viz-query find`) · PSN (11 legs) · Ollama (`ask-ollama`, forge-route lane).

## Unified flow (RGS → plan → build, looped)
```
/rgs <goal>   (operator-invoked OR auto)
 P1 GENERATE (existing RGS): produce roadmap/units (ROADMAP-CONSOLIDATED + AutonomousGoalSynthesis)
 P2 PLAN-MODE (auto, gated): EnterPlanMode →
      - vault-warm decompose: memory_search + ask-ollama viz surface top-3 prior attempts (what broke/worked)
      - master-graph dedup+impact: master_index_query (is-it-built/wired, blast-radius) BEFORE proposing builds
      - per-unit substrate routing plan: task-substrate-router (which substrate, when, how, max-out)
      - present the plan → ExitPlanMode (approval gate)
 P3 BUILD (auto bypass-permissions): per unit →
      ROUTE substrate → ACCOMPLISH (Hermes fan-out where parallel, forgeConcurrencyCap) →
      EVAL (run-verification-channel → numeric 0..1) → loop-state tick --eval-score
 P4 LOOP (deeper loop logic): planning-loop decision-core →
      continue | rerank(priority-queue, eval-fed) | replan(prism_atcs:replan on 2+ fails) | stop(budget/exhausted)
   repeat P3-P4 until done / budget / exhausted
```

## Units (logical build order — pure cores first, then wiring, then RGS bridge)
| U | Unit | Type | Detail |
|---|---|---|---|
| **U1** | `scripts/lib/planning-loop.mjs` | new pure lib+tests | `decidePlanningAction({recentEvals, consecutiveFails, budgetRemaining, exhausted})` → `{action:"continue"\|"rerank"\|"replan"\|"stop", reason}`. The testable heart of each-pass-feeds-next. |
| **U2** | `scripts/lib/task-substrate-router.mjs` | new pure lib+tests | `routeTask(taskType, phase, ctx)` → `{primary, substrates:[{name,when,how,maxOut}]}`. Generalizes forge-route to the 5-substrate matrix below. |
| **U3** | `loop-state.mjs tick --eval-score` | extend | accept numeric 0..1 (back-compat: absent=unscored). Source = run-verification-channel exit / scrutiny verdict. Store per tick + per unit-type. |
| **U4** | `priority-queue.mjs` eval-fed re-rank | extend | read accumulated eval scores → deterministic prior bump (high-scoring types rise; repeated-fail neighbors depress) on next pick. AUTO. |
| **U5** | `loop-state.mjs next` → atcs replan | wire | call U1; on `replan` auto-invoke `prism_atcs:replan`, inject output as next-task context. Bounded(max N), logged, reversible. |
| **U6** | `/propose-goal` vault-warm decompose | extend | pre-read vault (memory_search + ask-ollama viz top-3 prior attempts) → feed AutonomousGoalSynthesis prompt. |
| **U7** | task-start substrate inject hook | new hook | UserPromptSubmit/SubagentStart: surface U2 routing for the current task. |
| **U8** | RGS bridge | LOCAL skill edit | update `rgs6.md` + `generate-roadmap.md` skill bodies: call the P1-P4 flow, reference U1/U2, deeper loop logic, obsidian/hermes/system-viz/PSN substrate steps. |
| **U9** | plan-mode → bypass-permissions auto-flow | skill+config | RGS skill: EnterPlanMode (P2) → ExitPlanMode(approval) → build phase in bypassPermissions. EXACT mechanism (skill-body vs settings.json defaultMode vs a hook on plan-approval) VERIFY at build (claude-code-guide / update-config). |

## U2 substrate matrix — when / how / max-out (the "max out their capabilities" answer)
| Substrate | When | How | Max-out |
|---|---|---|---|
| **Ollama** | mechanical text/code (explain/summarize/classify/lint/docstring/diff/triage) | `ask-ollama <mode>` / forge-route lane / resolveExecutor | keep models warm; route ALL mechanical off Claude (9%→30%+) |
| **Obsidian vault** | prior-art recall BEFORE build; persist learnings AFTER | `memory_search` read · auto-memory write at Stop | read every task-start; write every outcome (each-pass-feeds-next) |
| **Hermes** | multi-agent fan-out, parallel specialists, cross-galaxy | bounded specialist agents (`forgeConcurrencyCap`) | parallelize independent subtasks; never serial what can fan out |
| **Master-graph** (/system-viz) | "where/is-it-built/is-it-wired/blast-radius" BEFORE grep | `master_index_query` / `system-viz-query find` | query-first always; impact-check every change (dedup) |
| **PSN** (11 legs) | cross-substrate synthesis; unifying recall+feed | the 11-leg network as one | feed-up/down every pass; never leave a leg idle |

## Safety / autonomy (fully automatic, railed)
- Deterministic auto (eval capture, re-rank): pure math = safe.
- **Plan-mode gate FIRST**: the P2 plan is reviewed (ExitPlanMode) before autonomous P3 build — the human checkpoint on WHAT gets built, before bypass-permissions auto-execution.
- Auto-replan bounded (max N/session), logged to ledger, reversible (re-orders queue, never deletes work).
- Eval = deterministic verify-channel (no LLM judges the gate). Fan-out capped (forgeConcurrencyCap).

## Testing
U1/U2 real-reference-value tests (happy + ≥3 failure + ≥2 adversarial). U3-U6 round-trip through helper. Live-validate one full `/rgs → plan → build → loop` cycle (eval captured → re-rank applied → routing emitted → replan-on-fail).

## ULTRACODE VERIFICATION (v2, 2026-06-11) — 9-agent Workflow, 3-lens + adversarial

Ran a bounded ultracode Workflow (4 investigate + 3 draft-lens + 1 adversarial + 1 synthesize). It RESOLVED the open question and found 3 P0 + 4 P1 bugs before any code. **This v2 section supersedes the U9 open question and amends the unit list.**

### §1 — plan-mode -> bypassPermissions: INFEASIBLE (do NOT build the auto-flow). R12.
Verified facts (not asserted):
- `H:/.claude/settings.json:94` already sets `"defaultMode": "bypassPermissions"` — bypass is the GLOBAL default; every session starts there. No mid-session flip to perform, none needed.
- The harness offers NO programmatic plan->bypass transition: (a) `EnterPlanMode`/`ExitPlanMode` are NOT Claude Code tools (absent from tool-use API + hook schemas); (b) hooks get `permission_mode` READ-ONLY (no output field mutates it); (c) `bypassPermissions` only enters the Shift+Tab cycle if the session was STARTED with `--permission-mode bypassPermissions` — a plan-mode session reaches only acceptEdits->default; (d) plan-approval offers auto/acceptEdits/default, never bypassPermissions.
- **Honest U9:** document bypass-is-pre-active (autonomous build after a plan already works with zero flip); the plan "gate" is a TEXT prompt-pause in the rgs6.md skill body. Optional belt-and-suspenders: opt-in (`PRISM_RGS_PLAN_GATE=1`, default OFF) plan-file PreToolUse gate -- but `enforce-plan-before-build.py` hardcodes `C:/PRISM/state/active-plan.json` (absent here) and would block EVERY build in this worktree -> must repath to `PRISM_ROOT` first.
- **DO NOT** add `defaultMode: plan` to any project `.claude/settings.json` -- project layer overrides user layer -> would silently disable autonomous-loop bypass fleet-wide.

### Amended unit list (adds U0; reorders by dependency)
- **U0 (NEW keystone, build FIRST)** `loop-state.mjs` cmdNext roll (~L290-305): carry `evalsByType: prev?.evalsByType ?? {}` through the roll literal. Without it re-rank (U4) is DEAD after roll #1. ~10-line patch + `loop-state-roll-carry.test.mjs`.
- **U1** `scripts/lib/planning-loop.mjs` — `decidePlanningAction({recentEvals,consecutiveFails,budgetRemaining,exhausted})`. STOP checked FIRST. Pure, table-driven tests.
- **U3** `loop-state.mjs tick --eval-score` — **P0 guard (mandatory):** `(typeof flags['eval-score']==='string' && Number.isFinite(Number(flags['eval-score']))) ? Number(...) : null` (bare flag = boolean true, `Number(true)===1` = spurious PASS). Welford mean keyed by `classifyUnit` (`backend-dev|bridge|app`).
- **U2** `scripts/lib/task-substrate-router.mjs` — imports `FORGE_PHASE_CATEGORY`/`routeForgePhase` from forge-route.mjs (single-owner taxonomy, dedup-clean) + `shouldUseWorkflow` from hermes-workflow-planner.mjs. `ctx` MUST carry `{itemCount,openEnded,needsVerification,cores}` or Hermes row vanishes + cap under-reports 2.7x.
- **U4** `priority-queue.mjs` eval-fed re-rank — reads loop-state `evalsByType` (U0 carry-forward), NOT inert `omega_score` (ATCS dir `PRISM_ROOT/autonomous-tasks` per constants.ts:84 is ABSENT in mainstream /loop). Within-class tiebreaker only (never promotes app over backend-dev). Welford mean = monotone-stabilizing.
- **U5** `loop-state.mjs next` -> U1 + bounded atcs:replan. **P0:** map cmdNext `rolled:false && (reason==='roll-cap'||exhausted)` -> `action='stop'` (fold two termination authorities into one). **P1 R12:** distinct `replan: skipped (no active ATCS task)` vs `executed (N requeued)`; default `--atcs-replan` OFF; `MAX_REPLANS=3` demotes to stop.
- **U6** `/propose-goal` vault-warm decompose (LOCAL-ONLY). **U7** `task-start-substrate-inject.mjs` hook. **U8** `rgs6.md` P2/P3/P4 bridge (LOCAL-ONLY, fragile — handoff carries full block text). **U9** doc + optional plan-gate path-fix (per §1).

### Loop-soundness thresholds (from §3 of the verified plan)
eval source = `run-verification-channel.mjs` exit (0->1.0, 1->0.0, BINARY). `EVAL_PASS_THRESHOLD=0.5`. RERANK window N=3, **`RERANK_TRIGGER=0.4`** (NOT 0.6 — binary source makes 0.6 a dead branch). `REPLAN_THRESHOLD: consecutiveFails>=2`. `MAX_REPLANS=3`. budget-stop = `iter>=target` checked FIRST. roll-cap `MAX_ROLLS=8` -> stop. **Termination:** halts within `min(target,8 rolls)x(1+3 replans)`. **Convergence:** Welford mean (carried across rolls by U0) is monotone-stabilizing; re-rank is within-class tiebreaker -> cannot oscillate dominant pick. **Documented degenerate:** one-unit-per-type queue -> re-rank no-op; real escape is `consecutiveFails->replan->stop`.

### Build-first 3 (highest leverage): **U0, U1, U3.** Full synthesized plan: workflow run `wf_fa4b142b-2c8` (28KB, in transcript).

## SHIPPED (2026-06-11, slot:tango) -- all 10 units
| U | What | Commit | Tests |
|---|---|---|---|
| U-SPEC/V2 | design + ultracode-verified plan | 0df9cb5a5e / d9f610ec90 | -- |
| U1 | planning-loop.mjs decision core | 15bcba40fa | 16 |
| U0+U3 | loop-state eval-score + evalsByType carry-roll | a645b8ac23 | 11 |
| U2 | task-substrate-router.mjs | (committed) | 9 |
| U5 | cmdNext -> decidePlanningAction + honest replan | 233e1a6c4a | 9 |
| U4 | priority-queue eval-fed re-rank | c58cb976b2 | 9 |
| U7 | task-start-substrate-inject hook + settings wire | (committed) | 8 |
| U6 | propose-goal.md vault-warm (LOCAL-ONLY) | gitignored | -- |
| U8 | rgs6.md PLANNING-LOOP-BRIDGE LAW (LOCAL-ONLY) | gitignored | -- |
| U9 | plan-mode honesty + opt-in gate (folded into U8 P2.4) | gitignored | -- |

**Total: 97/97 tests pass (6 new + 2 regression suites), 0 regressions.** Closed loop verified end-to-end: eval captured (U3) -> survives rolls (U0) -> decided (U1/U5) -> re-ranks picks (U4) -> surfaced per-task (U7) -> bridged into RGS (U8). LOCAL-ONLY skill edits (U6/U8/U9) are gitignored -- full block text preserved in HANDOFF-claude-97872074-*.md.

## SHIPPED MS1 (2026-06-12, slot:tango) -- bridge-completion + the feasible "auto plan mode"
- **U-PLAN-GATE** (commit aef14b1ad9): `.claude/hooks/enforce-plan-before-build.mjs` -- port of the orphan `lib/enforce-plan-before-build.py` (hardcoded `C:/PRISM`, wired NOWHERE) to the fleet .mjs convention. PRISM_ROOT-relative state file (`H:/prism/state/active-plan.json`) + `PRISM_RGS_PLAN_GATE_STATE_FILE` env override; advisory-by-default (fleet-safe), `PRISM_RGS_PLAN_GATE=1` HARD BLOCK, `=0` kill switch; fail-open (a gate crash never blocks a Write). 15 tests. WIRED into the Write|MultiEdit PreToolUse group in C:+H: settings. This is "auto-forced plan mode then build" in its FEASIBLE form: P2 approval writes the plan artifact, the gate enforces it on new-engine creation, bypass (already global) carries the autonomous P3 build -- no permission-mode flip (which is infeasible per section 1).
- **RGS-skill pointers**: `rgs6.md` P2 step 5 (write+enforce active-plan.json), `rgs.md` + `generate-roadmap.md` (concise PLANNING-LOOP-BRIDGE pointer to the canonical rgs6 LAW -- dedup-clean, detail not duplicated).
- **Live P2-P3-P4 E2E PASS**: eval 0.9 -> continue; 2 fails -> replan; evalsByType survived a roll (n=3 mean=0.30 in production loop-state). The closed loop proven live, not just unit-tested.
