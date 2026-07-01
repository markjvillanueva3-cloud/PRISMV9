---
title: Subagent injection ceiling -- measure before assuming overflow
layer: lessons
tags: [token-economy, injection-budget, subagent, measure-first, alpha]
created: 2026-06-21
related:
  - measure-injection-before-dedup-fix
  - fleet-injection-budget-audit-u-fiba-compact-phantom-fix
  - token-optimization-advanced-techniques
---

# Subagent injection ceiling -- measure before assuming overflow

**Principle (R12 + the measure-first discipline):** before "fixing" a presumed
context-injection overflow, MEASURE the actual ceiling. A claim that "the system
injects >200K tokens into every X" is an assumption until a number proves it.

## The case (2026-06-21, slot:alpha, commit cf40d23901)

The token-optimization galaxy doctrine carried a HIGH-priority open thread:
">200K SessionStart cold-cache anchors injected into every Task/Workflow subagent
-> 'Prompt is too long.' Fix: gate SessionStart off for subagents." It had sat
unverified.

Reading the code + building the missing instrument overturned it:

- `cag-cold-cache-anchor.mjs` emits only a **~4KB SUMMARY** (paths/sizes/IDs), NOT
  the doctrine text it catalogs -- the comment is explicit that injecting the text
  "would explode SessionStart context with ~500KB."
- `agent-rules-inject.mjs` is capped at **MAX_CHARS=3500**.
- The existing census (`audit-injection-surface.mjs`) only covers SessionStart +
  UserPromptSubmit -- the **per-subagent (Task/Agent-spawn) path was measured by
  nothing**, because the byte-probe feeds a `{prompt}` stdin and a hook gated on
  `tool_name==="Task"` emits 0 under it.
- New instrument `scripts/measure-subagent-injection.mjs` (matcher-filtered to
  Task/Agent, EXCLUDES catch-all `.*` so it never runs destructive guards, probes
  both tool names, counts `additionalContext` only): **live ceiling = 3.65 KB**.
  Far under any overflow. The "gate SessionStart off for subagents" fix was
  unnecessary.

## Surfaced by the instrument (a real but harmless finding)

`agent-rules-inject` is **name-gated**: 3739B under `tool_name="Task"`, 0B under
`"Agent"`. This harness's subagent tool is `Agent`, so it does NOT fire (matcher
`^Task$` + internal `=== "Task"` gate). NOT a drift gap: `subagent-start-context.mjs`
(SubagentStart event) injects the full spawned-agent context bundle. So
`agent-rules-inject` is a **legacy-redundant cleanup candidate**, not a bug.

## Reusable takeaways

1. **A "we inject too much" claim needs a measured number before any fix.** Four
   alpha injection "open threads" investigated this session (CU-1, CU-1b, section-12
   overflow, agent-rules-inject drift) were ALL non-problems-or-stale on measurement.
2. **When an instrument measures only some event types, the unmeasured ones are an
   invisible gap.** The Task/Agent-spawn injection path was a blind spot until an
   instrument covered it. Build the measurement, don't extrapolate from the others.
3. **A tool renamed (Task -> Agent) silently kills hooks gated on the old name.**
   Probe both names to surface it; verify a redundant path covers the function
   before "fixing" the dead hook.

Memory: [[reference_subagent_injection_measured_2026_06_21]]. Sibling principle:
[[feedback_measure_injection_before_dedup_fix]].
