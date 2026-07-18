---
name: feedback_ultracode_fanout_local_gpu_not_claude
description: "ultracode Workflow mechanical fan-out MUST route to the local GPU via ollama-fanout, NEVER N concurrent Claude subagents -- the Anthropic org rate limit is a HARD CEILING shared across ALL sessions, so a big Claude fan-out starves (kills) sibling operator sessions. The fix already exists; USE it."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.448Z
aliases: feedback_ultracode_fanout_local_gpu_not_claude
---


**What happened (2026-06-11, slot:charlie):** an ultracode Workflow fanned out **34 Claude subagents at once** to grade 34 galaxies' SOUL.md/CLAUDE.md. The burst exceeded **Anthropic's org-wide RPM/TPM throttle** -> every agent got `API Error: Server is temporarily limiting requests (not your usage limit)` -> `graded:0`, ~2.5M tokens burned for null -> AND it **starved the operator's only other live session** (the rate limit is per-ACCOUNT, shared across every session). The operator: *"your ultracode session killed the only other session we're running."*

**Why "allow way more parallel Claude agents" is the WRONG lever:** the ceiling is Anthropic's account tier (RPM/TPM/concurrent), not PRISM code. More concurrent Claude agents make sibling-starvation WORSE. You cannot code around the org limit; you can only (a) stop monopolizing it, or (b) request a higher tier from Anthropic.

**The RIGHT lever (the fix already existed -- I failed to use it):** route mechanical judgment-at-scale (grade / classify / summarize / extract -- R5 "not safety-critical") to the **local 96GB Blackwell GPU** via `scripts/lib/ollama-fanout.mjs` (`ollamaFanout(tasks=[{id,prompt}], {model, concurrency})`, model default `gpt-oss:120b`, or `qwen2.5-coder:32b` for speed). ZERO Anthropic rate limit, $0 cost, never touches the shared org quota -> sibling sessions are never starved. **Reserve Claude subagents for the FINAL human-facing synthesis only.** Worked example: `scripts/audit-galaxy-soul-claude-quality.mjs` (34 galaxies graded locally, 0 Claude API, fleet soulGrade 0.553).

**Rule for every ultracode/Workflow fan-out:**
1. Is each fanned task mechanical (read+grade/classify/summarize)? -> `ollamaFanout`, NOT `agent()`.
2. Only the final synthesis (and genuinely deep cross-item judgment) may use a Claude `agent()`.
3. If you MUST use Claude agents in parallel, cap the batch SMALL (<=5 concurrent) and expect to share the org quota with sibling sessions + cron.

Related: [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (the original doctrine this incident re-proved), [[reference_fleet_rate_limit_diagnosis_2026_05_29]], `scripts/lib/ollama-fanout.mjs` header, [[reference_ollama_expand_ms0]]. The account-level escape hatch (90%-of-5h -> account switch) is `scripts/account-switch-restart-coordinator.mjs`.
