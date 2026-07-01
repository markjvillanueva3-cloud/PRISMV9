---
name: subagent-orchestration-discipline
category: software-engineering
domain: backend-dev
tags: [subagents, agent-tool, parallel-dispatch, orchestration, context-hygiene, ai-development]
last_updated: 2026-05-18
---

# Subagent Orchestration Discipline

PRISM's work model is one orchestrator (the main chat) delegating bounded, parallelizable units to subagents spawned via the Agent tool — per-file scrutiny (2 reviewers), the 3-of-3 Stop gate (3 reviewers), `forge-team`, build swarms. This is the *general* discipline; [[per-file-scrutiny-gate]] is its highest-stakes specific application and is not re-covered here.

## When to spawn — and when not to

**Spawn a subagent for:** independent work that can run in parallel; fan-out search across many files where you only need the conclusion; an isolated review that should not inherit the orchestrator's framing; work whose intermediate output would bloat the orchestrator's context (a subagent's transcript stays in the subagent).

**Do it inline for:** sequential steps that depend on each other; small tasks where spawn overhead exceeds the work; anything needing tight back-and-forth. A subagent is a round-trip — a one-line lookup you can do yourself is not worth one.

Do not spawn an agent to dodge a judgment call you should make (Karpathy R5: model for judgment, code for determinism — "should I even spawn" is your judgment).

## Parallel dispatch — one message, many agents

Multiple Agent calls **in a single message** run concurrently; the same calls across sequential messages run one at a time. When you have N independent units, dispatch all N in one tool block:

```
# one message, three parallel reviewers — the 3-of-3 gate pattern
Agent(reviewer,      "review diff arm A …")
Agent(reviewer,      "review diff arm B — independent …")
Agent(code-analyzer, "review diff arm C — analyst …")
```

Sequencing independent agents across turns is the most common waste in multi-agent work — it serializes what the harness would have parallelized for free.

## The agent prompt is a contract

A subagent starts with **no shared context** — it sees only its prompt (plus the harness's per-task pre-search injection). A vague prompt yields a vague result. Every spawn prompt carries:

- **Absolute file paths** — never "the file we edited"; the subagent does not know what you edited.
- **The spec / contract** to verify or build against.
- **Explicit instructions** — what to check, what verdict to return (PASS/FAIL), what severity scale (P0/P1/P2), "read the whole file end-to-end."
- **Scope bounds** — what NOT to touch, so the agent does not wander.

Write the prompt as if briefing someone who has never seen the repo — because that subagent hasn't.

## Result semantics

- The subagent's **final message is returned to you as the tool result** — it is **not shown to the user**. You must relay what matters; the user never saw the agent's reasoning.
- A new `Agent` call **starts fresh**. To continue a specific agent with its context intact, use `SendMessage` with its id — do not re-spawn and re-explain.
- `run_in_background: true` runs the agent asynchronously; you are notified on completion. Use it for long independent work so the orchestrator keeps moving.
- `isolation: "worktree"` gives the agent its own git worktree — use it when an agent will edit files and you do not want it racing the main tree.

## Context hygiene

Subagents receive a fresh context bundle plus a per-task pre-search (master-index + tribal-knowledge keyword hits derived from the prompt). Do **not** paste your entire context into the prompt — give the agent exactly what it needs to be self-sufficient and let its own pre-search + tools fill the rest. An over-stuffed agent prompt costs tokens twice (yours to write, theirs to read) and buries the actual task.

## Verdict aggregation

When N reviewer agents return, **merge** the verdicts — do not cherry-pick the PASS. One FAIL means: fix the finding, then **re-dispatch the agents** and re-verify. Fix every P0 + P1 before proceeding; log P2/P3 deferrables in the handoff. A gate is only as strong as its strictest arm.

## Don't over-spawn

Each agent is a token + latency cost. Three agents for a trivial check is waste; the per-file gate uses two *because* the work genuinely needs two independent passes. Match the agent count to the real independent-work count — no more.

## Checklist — before spawning

- [ ] Is this genuinely parallel/independent work, or am I serializing it?
- [ ] All independent spawns in **one message** for concurrency?
- [ ] Prompt carries absolute paths + spec + explicit verdict instruction + scope bounds?
- [ ] Will I **relay** the agent's result (the user can't see it)?
- [ ] Background (`run_in_background`) for long independent work?
- [ ] Agent count matched to real work — not spawn-for-spawn's-sake?

## Related

- [[per-file-scrutiny-gate]] — the highest-stakes application: 2-reviewer per-file review
- [[hook-authoring-discipline]] — hooks vs agents: hooks are deterministic harness events, agents are delegated judgment
- [[token-budget-management]] — subagents move work off the orchestrator's context budget
- [[karpathy-12-rule-discipline]] — R5 (delegate judgment, not determinism), R10 (checkpoint)
- CLAUDE.md §PER-FILE SCRUTINY GATE + §SCRUTINY GATE — the wired multi-agent gates
