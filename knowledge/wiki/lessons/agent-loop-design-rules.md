---
title: Agent-loop design rules -- the closed-loop discipline /loop auto-invokes
type: lesson
tags: [lesson, loop, autonomous-loop, agent-design, token-budget, slot-alpha]
last_verified: 2026-06-09
slot: alpha
sources:
  - "shannholmberg: what is agent looping (read in FULL)"
  - "RLanceMartin: Designing loops with Fable 5 (teaser only -- login-gated)"
  - "IBuzovskyi: 8 Loops Inside Hermes Agent (teaser only -- login-gated)"
  - "PawelHuryn: Claude Dynamic Workflows (teaser only -- login-gated)"
  - "akshay_pachaar/Opik: self-repairing harness (read in full earlier -- already applied)"
  - "0x_rody: anti-fabrication 4-layer (teaser only -- already PRISM HONESTY RULES)"
---

# Agent-loop design rules -- the closed-loop discipline /loop auto-invokes

Operator sent 6 agent-loop X articles 2026-06-09 with: "update the /loop slash
command to auto-invoke loop rules and improvements from the loop articles." This
is the synthesis the `loop-iteration-inject.mjs` hook now auto-injects on every
`/loop` (knob `PRISM_LOOP_RULES_DISABLE=1`).

## PROVENANCE (R12 -- honest about what was actually readable)
Only TWO of the six were readable in full from this Playwright session (no X login):
- **shannholmberg "what is agent looping"** -- a public tweet, read in FULL. The
  richest, most actionable source; rules 1-5 are largely from it.
- **akshay_pachaar/Opik "self-repairing harness"** -- read in full earlier this
  session; already applied as [[advisory-decay-gate]] + regression-lock-audit.

The other FOUR are login-gated X long-form Articles -- only their teaser thesis
(title + opening sentences) was public. Their theses corroborate the synthesis but
the full bodies were NOT read; if deeper rules are wanted, paste the full text:
- **RLanceMartin "Designing loops with Fable 5"** -- thesis: self-correction loops
  (-> rule 4).
- **IBuzovskyi "8 Loops Inside Hermes Agent (And Why They Compound)"** -- thesis:
  most frameworks have 1 loop; Hermes runs 8 at different timescales (ms -> weeks),
  each a different purpose, and they COMPOUND (-> rule 6).
- **PawelHuryn "Claude Dynamic Workflows"** -- thesis: 113 agents / 1.95M tokens /
  3 prototypes in 12 min; the coordinating code spent ZERO -- "that zero is the
  upgrade" (-> rule 5, deterministic zero-token orchestration).
- **0x_rody "How to Make Claude Code Stop Making Stuff Up"** -- thesis: a 4-layer
  setup that makes lying expensive; already PRISM's HONESTY RULES (CLAUDE.md cites
  rody @0x_rody).

## The 6 rules (auto-invoked on /loop)
1. **CLOSED-loop by default** -- clear goal -> defined steps -> an eval at EACH step
   -> a stop/handback. OPEN (exploratory) looping only with explicit budget
   headroom: on a loose standard an open loop is a "slop machine" that burns insane
   tokens (shann's explicit warning). PRISM's `/loop` over a slot-task queue IS a
   closed loop; keep it that way.
2. **EVAL-GATE every iteration** -- an iter is NOT done until its eval passes (real
   tests + per-file 2-arm scrutiny). NEVER auto-advance (`loop-state.mjs next`) past
   an unverified iter -- that ships slop. (shann "an eval gate makes sure it's not
   slop" + Opik "lock every failure as a test".)
3. **EACH PASS FEEDS THE NEXT** -- carry the prior iter's outcome/numbers forward so
   iter N+1 beats N; never cold-restart. shann: "it gets better every run because
   each pass feeds the next." (PRISM: outcome bus + loop-state + handoff RESUME.)
4. **SELF-CORRECT** -- draft -> check against the goal -> fix the WEAKEST part ->
   repeat until it clears the requirements. (RLanceMartin self-correction loops +
   shann's one-agent self-loop.)
5. **ORCHESTRATOR / SPECIALIST / SUBAGENT split, zero-token coordination** -- the
   orchestrator owns the goal, specialists own steps, subagents do narrow work; keep
   coordination deterministic + ~zero-token (route, don't reason -- R5; a Workflow
   coordinator spends nothing -- PawelHuryn "that zero is the upgrade").
6. **BUDGET is a stop condition** -- nearing the token ceiling -> checkpoint +
   /compact, never push an open loop into a spiral (R6/R10). PRISM's multi-timescale
   loops (interactive, subagent, ollama, autonomous /loop, cron, weekly-synthesis)
   only COMPOUND if each checkpoints cleanly (IBuzovskyi "8 loops... why they
   compound").

## Wiring
`.claude/hooks/loop-iteration-inject.mjs` -- `LOOP_DISCIPLINE` const injected in
`buildContext` on every `/loop` UserPromptSubmit. Falls back to the bare R10
reminder when `PRISM_LOOP_RULES_DISABLE=1`. Pairs with the existing auto-advance
([[reference_loop_auto_advance_2026_06_08]]) -- rule 2 is the GATE on that advance.
Peter Steinberger's framing (quoted in shann): "you shouldn't be prompting coding
agents anymore -- you should be designing loops that prompt your agents."
