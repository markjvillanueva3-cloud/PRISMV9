---
name: feedback-workflow-concurrency-and-local-routing-2026-06-08
description: "Workflow fan-outs must bound concurrency (≤3-4 agents) AND prefer the local 96GB Blackwell (Ollama) for mechanical/audit agents — not the Claude API. An 11-agent simultaneous fan-out tripped a server-side rate limit, burning 2M tokens for null."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.454Z
aliases: feedback_workflow_concurrency_and_local_routing_2026_06_08
---


**Lesson (golf, 2026-06-08, ultracode synergy loop).** A `Workflow` that fanned out **11 agents simultaneously** to the Claude API tripped Anthropic's server-side rate limit ("Server is temporarily limiting requests · not your usage limit") — ALL 11 failed, **2,009,075 subagent tokens burned for a `null` result** in 56s.

**Why:** unbounded concurrency. 11 agents × multiple API calls each, fired in ~1s = a request burst that hit the per-org RPM/TPM throttle.

**Fix (two layers):**
1. **Bound workflow concurrency** — run agents in small SEQUENTIAL batches (≤3-4 at a time), not all-at-once. Pattern: `for (chunk of batches) { await parallel(chunk.map(...)) }`. The `parallel()` cap (~14) is NOT enough — even 10-11 trips the throttle. This is now the default for any fleet fan-out > 4 agents.
2. **Route mechanical/audit agents to LOCAL compute, not the Claude API.** The 96GB RTX PRO 6000 Blackwell sits at **~1% utilization** while we hit Claude API limits. Audit / summarize / classify / extract / lint work is exactly the R5 "mechanical, not judgment" class that belongs on local Ollama (gpt-oss:120b / qwen2.5-coder:32b / 1.5b). A local fan-out has **NO Anthropic rate limit and $0 API cost**. Offload is at ~13% vs the 30% target — the local GPU is the pressure-relief valve we're not using.

**Why:** the rate-limit class is ELIMINATED (not just mitigated) when the high-volume mechanical work runs locally. Reserve the Claude API for genuine judgment/synthesis (R5).

**How to apply:** (a) any `Workflow`/`parallel()` over >4 mechanical agents → batch ≤3-4 sequential; (b) for audit/summarize/classify fan-outs, prefer `scripts/ask-ollama.mjs` / `local-llm-task-router` / the cost-router (`routeModelForTask`, now cheap-tier-complete) over Claude subagents; (c) reserve Claude subagents for synthesis, design, adversarial verification. Pairs with [[reference_system_synergy_loop_golf_2026_06_08]] (the roster is now correct, so local routing is viable) + the OLLAMA-OFFLOAD doctrine (CLAUDE.md §TOKEN ECONOMY, R5).
