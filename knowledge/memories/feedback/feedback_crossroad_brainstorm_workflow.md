---
name: feedback_crossroad_brainstorm_workflow
description: "At a genuine crossroad (≥2 valid paths, real consequences, no obvious default) AUTO-run the brainstorm-path-forward multi-agent Workflow instead of guessing or asking a bare either/or."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.421Z
aliases: feedback_crossroad_brainstorm_workflow
---


**Rule (operator directive 2026-05-30).** When the work reaches a genuine **crossroad** — a fork in *how to proceed* where (a) two or more valid paths exist, (b) the choice has real or irreversible consequences, and (c) there is no obvious default — **automatically run the `brainstorm-path-forward` multi-agent Workflow** to produce the recommended path, rather than guessing a single path or asking the operator a bare either/or.

**Why:** single-perspective planning misses failure modes and anchors on the first idea. A multi-lens fan-out (safety-first · root-cause · fastest-unblock · distributed-ownership · adversarial) + a synthesis pass surfaces the *optimal dependency-ordered* path, the central tradeoff, the decisions only the operator can make, and what can start safely now — far better than one chat's linear guess. The operator wants this to be reflexive, not prompted.

**How to apply:**
1. **Detect the crossroad.** Trigger when you would otherwise write "Option A vs B?", "which path?", "the proper way forward", "how should we proceed", or you're about to ask a strategic either/or. Also on the literal words *brainstorm / way forward / proper path*. Do NOT trigger on trivial decisions with an obvious default (just proceed) or pure lookups.
2. **Run the Workflow.** Invoke the `brainstorm-path-forward` script (template + full doctrine in wiki [[crossroad-brainstorm-workflow]]). Pass the crossroad — full state, hard constraints, the goal, and the key unknown — as `args.crossroad`. It fans out 5 strategic-lens agents → 1 synthesis agent.
3. **Plain-text agents, NO JSON schema.** The default workflow subagent does not reliably emit `StructuredOutput`; agents must return markdown text (see [[reference_alpha_explore_agent_schema_incompat]]). Schema'd agents fail with "completed without calling StructuredOutput".
4. **DECIDE + PROCEED, escalate ONLY operator-only (operator directive 2026-06-24, supersedes "hold the rest").** Do NOT stop to ask on a fork you can resolve. Classify each fork with `scripts/lib/crossroad-auto-decide.mjs` `classifyDecision()`: a fork is **operator-only** ONLY if it is irreversible (delete/overwrite/force-push/reset --hard), financial, external-facing (publish/send/deploy/merge-to-main/go-live), credentials/access, safety / real-machine (S(x), G-code to a machine), or a goal/scope change. For an operator-only fork → state the specific decision + your recommendation, then it is correct to wait. For EVERY OTHER fork (reversible/internal — which implementation, naming, order, approach, which of N valid options) → run the deep-reasoning assessment, **DECIDE the optimal path, STATE decision + rationale + confidence, and PROCEED** with a concrete tool call. Auto-enforced: `stop-reblock-storm-breaker.mjs` now NUDGES a decision-wait into this protocol before halting (only a genuinely operator-only fork reaches the hard halt). Universal safety rails still bind — never auto-decide an operator-only fork.
5. **Opt-out:** the operator can still say "just do X" — an explicit instruction overrides the brainstorm (WHAT-not-HOW only applies to genuine forks).

Pairs with [[feedback_always_close_out]] + [[feedback_reflect_all_changes_post_update]]. The Workflow tool requires the "workflow" opt-in keyword OR this standing doctrine as the explicit grant.
