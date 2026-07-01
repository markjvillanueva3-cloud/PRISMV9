---
name: deep-reasoning-doctrine
category: code-tribal
domain: backend-dev
tags: [deep-reasoning, llm, agent, opus, sonnet, haiku, model-routing, ai-development]
last_updated: 2026-05-18
---

# Deep Reasoning Doctrine — when to route to Opus vs Sonnet vs Haiku vs Ollama

PRISM runs a 4-tier model ladder. The wrong tier wastes tokens *or* delivers wrong answers. The doctrine is **route by judgment-density, not by topic familiarity**.

## The 4 tiers

| Tier | Model | Use when |
|------|-------|----------|
| L0 | Ollama qwen2.5-coder:3b/7b (local) | Deterministic transforms — embed, classify, summarize-known-file. Single-shot or harness-driven multi-step. R5 hard. |
| L1 | Haiku 4.5 | Cheap classification, dispatcher routing, schema validation when an LLM is the right tool but Opus is overkill. |
| L2 | Sonnet 4.6 | Routine builds, well-spec'd features, single-file refactors, code review where reviewer A is a domain-specific agent. |
| L3 | Opus 4.7 (1M ctx) | Multi-file builds with judgment calls, R10 checkpoint-heavy work, safety-critical engineering, master-coordination roles (Tier-1 orchestrator). |

## The selector — judgment density

Ask: *how many decisions in this task can ONLY be made by an entity that holds the codebase architecture in its head?*

- 0 decisions → L0 Ollama. (Embed this file. Classify this snippet.)
- 1-3 decisions → L1 Haiku or L2 Sonnet depending on stakes.
- 4-10 decisions → L2 Sonnet.
- 10+ decisions OR safety-critical OR cross-file coupling → L3 Opus.

**Anti-pattern:** running L3 Opus on a task with 0 judgment decisions ("summarize this README"). That's a 10× cost overrun.
**Anti-pattern:** running L0 Ollama on a task with 10+ decisions ("design the milestone roadmap"). That's a 10× quality underrun.

## R5 + R6 force the ladder

R5 says use LLM ONLY for judgment calls. R6 says token budgets aren't advisory. Together they bind: **every task starts at the lowest tier that can still answer it; you escalate up but never silently de-escalate.**

```
attempt task at L2 Sonnet
  ↓ tier-too-low signal (judgment underrun, missing context, R12 fail-loud)
escalate to L3 Opus
  ↓ NEVER go back to L2 mid-task — context split is the worst outcome
```

The PRISM `ollama-cost-routing` scorer (commit 831d04c2b) implements this rail: escalate-up-only, never-de-escalate.

## Deep reasoning ≠ chain-of-thought

CoT is a prompting technique (`<thinking>` blocks, explicit reasoning steps). Deep reasoning is a model + context regime. Opus 4.7 with the 1M context window IS the deep-reasoning surface — it can hold the entire CLAUDE.md + 200 wiki entries + the system-graph headline + recent commits AND still reason coherently about a multi-file build.

Sonnet 4.6 with CoT can simulate parts of this but loses coherence past ~30k input tokens. **CoT prompts shouldn't be used to compensate for tier underrun.**

## Tier matching to subagents

When dispatching `Agent({ subagent_type: ..., ... })`, the subagent inherits a model unless overridden. PRISM-default subagent tiers:

- `code-analyzer`, `reviewer`, `physics-reviewer`, `test-review-agent`, `wiring-review-agent` → Sonnet (well-scoped review work)
- `general-purpose`, `Plan`, `code-archaeologist`, `forge-team`, `pipeline-team` → Opus (high judgment density)
- `Explore`, `test-runner`, `regression-hunter` → Sonnet (mechanical search/run work)
- `dispatcher-wirer`, `catalog-enricher`, `doc-generator` → Sonnet (well-spec'd implementation)

Override only when the task's judgment density doesn't match the default.

## The "first pass at L1, escalate if needed" trap

Tempting but wrong for multi-file builds. The L1 first-pass either:
- nails the easy parts and leaves the hard parts (now you escalate and rebuild context) → 2× token cost
- silently produces a wrong answer that LOOKS right (the worst R12 outcome) → silent corruption

For multi-file builds, **start at the tier that can do the WHOLE task** and avoid mid-task escalation.

## When deep reasoning genuinely is the bottleneck

If you find yourself doing 3+ Agent dispatches on the same problem (the "wait, let me think again" pattern), you're under-tiered. Escalate to Opus + 1M ctx, load the relevant CLAUDE.md sections + system-graph headline, then one careful pass beats N shallow passes.

## Related

- [[karpathy-12-rule-discipline]] — R5 (model only for judgment), R6 (token budgets)
- [[llm-agent-loop-design]] — the 4 loop shapes and tier mapping
- [[tribal-precontext-architecture]] — what the model sees BEFORE it reasons
- CLAUDE.md §"TOKEN ECONOMY" — Ollama routing + Claude reserved for deep reasoning + safety
- CLAUDE.md §"AI SYSTEM ROUTING" — `aiSystemRouterEngine.route(task)`
