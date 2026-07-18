---
name: feedback_goal_needs_loss_function
description: "Fleet doctrine (all slots): a /goal or autonomous /loop MUST carry a MEASURABLE acceptance criterion (a 'loss function' -- a checkable command/metric/file-state that returns done/not-done), NEVER unbounded prose. An unbounded prose goal can never terminate: the keeper re-judges forever while the agent invents 'one more facet'. Source: 2 X articles (Elvis @elvissun '/goal + Loss Functions', Hamza @humzaakhalid 'Stop Prompting -> use a system'), read 2026-06-11 via Playwright (PREVIEWS only -- bodies were gated)."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.428Z
aliases: feedback_goal_needs_loss_function
---


# A /goal (and autonomous /loop) needs a LOSS FUNCTION, not unbounded prose

**Rule (fleet-wide, all slots):** when you set a `/goal` or kick an autonomous `/loop`, define a **measurable acceptance criterion** -- a "loss function": a concrete, checkable signal that says DONE vs NOT-DONE. Examples: a command that exits 0/1 (`vitest run`, `tsc --noEmit`, an eval script that scores >= threshold), a metric crossing a gate (AUROC >= 0.78, trainingReady true, loss < X), a file/state existing, a count reached. A `/goal` whose condition is **unbounded prose** ("improve AI systems across all galaxies", "make it production-ready") has NO terminating check -- the keeper re-judges the prose every Stop and the agent keeps inventing "one more facet," forever.

## Source (read 2026-06-11 via Playwright; PREVIEWS only -- the full bodies were gated X Articles, auth render hung -- R12)
- **Elvis (@elvissun)** -- "**/goal + Loss Functions: How to Distill a Product in 30 Hours with One Prompt**" (x.com/elvissun/status/2065035615800864954). Thesis: "99% people use /goal and loops wrong. The hype is 'point it at a task, walk away, come back to working code' -- but top agentic engineers [use a loss function]." The full 30-hour playbook is behind the gate; the actionable CORE from the teaser is the loss-function framing.
- **Hamza Khalid (@humzaakhalid)** -- "**4 Engineers Just Told You to Stop Prompting. Here's What to Do Instead**" (x.com/humzaakhalid/status/2064996712910041409). Thesis: 4 top AI engineers converged on moving from ad-hoc prompting to a reusable **system** (references Peter Steinberger). PRISM already systematizes heavily (skills/hooks/workflows/dispatchers); the net-new specifics are in the gated body.

## Worked failure example -- THIS session (be279b4f, slot tango, 2026-06-11)
The operator set `/goal [improve ai systems, deep learning... across all galaxies... all synergized...]` -- pure unbounded prose, NO measurable criterion. The session-scoped goal-keeper Stop hook re-fired **~15 times**: each time it LLM-judged the prose "still incomplete" and re-blocked; each time I shipped a real unit (deep-reason mode, LoRA trainingReady flip, the trainer, the executed fine-tune...) and the keeper just re-framed to a new uncovered facet (GPU exec -> synergy coverage -> /yolo-mode -> hermes-agentic...). It only resolved when concrete MEASURABLE milestones landed (trainingReady false->TRUE, a converged adapter, a 34/34 audit). A loss function up front ("trainingReady==true AND audit 34/34 AND a converged adapter exists") would have terminated cleanly the moment those were measurably true, instead of N rounds of prose re-judgment.

## How to apply (immediately, every slot)
- When YOU set a /goal for yourself or accept one: restate it WITH a measurable check. "Improve X" -> "X's metric M >= T, verified by `<command>`." If the operator's goal is prose, propose the loss function back and use it as the real stop test.
- Prefer a check the KEEPER can run deterministically (a command exit code / a metric in a state file) over an LLM re-judging prose -- deterministic > model for a status question (R5).
- If a goal genuinely has no measurable criterion, say so (R12) and bound it by units/iterations/budget instead of pretending it can "complete."

## Buildable follow-up -- HALF SHIPPED 2026-06-11 (slot tango, commits 0e9b6ef88a + 3a2e1b6b4f)
A concrete `/goal` enhancement, in two halves:
- **(SHIPPED) the unbounded-prose nudge.** `scripts/lib/goal-loss-function-detect.mjs` -- a pure deterministic classifier (`detectMissingLossFunction` + `extractGoalText` + `LOSS_FUNCTION_NUDGE`) wired into `.claude/hooks/goal-prereq-inject.mjs` (the fleet-wide `/goal` pre-flight UserPromptSubmit). When a `/goal`'s inline text is open-ended prose with NO measurable check (no command / metric+number / ratio / count / `--check` flag), it injects a TARGETED loss-function nudge. Conservative: fires ONLY when no check signal AND an open-ended verb are present (short concrete goals never nagged); ambiguous machining nouns (precision/recall/coverage/loss) count only WITH an adjacent number. Knob `PRISM_GOAL_LOSS_NUDGE_DISABLE=1`. 17/17 tests, 3-of-3 scrutiny PASS, live-validated through the real hook. This replaces the STATIC always-on "bound the loop" reminder's blind spot (a static reminder becomes wallpaper -- it fired ~15x this session and the spiral still happened; a conditional, targeted one is the deterministic check the doctrine prescribes, R5).
- **(OPEN) the deterministic terminating `--check`.** Still unbuilt: capture an optional `--check <command>` / `--metric <gate>` at /goal SET-time so the goal-keeper RUNS that as the stop test (exit-code/metric) instead of LLM-judging prose. Needs the goal-keeper internals (`.claude/commands/go.md` + the session-scoped goal Stop hook). Related: `.claude/hooks/stop-goal-clear-advance.mjs` (iter/target advance -- distinct from the prose keeper). Pairs with [[feedback_autonomous_loop_drift_discipline]] + [[feedback_use_playwright_for_web_reading]].
