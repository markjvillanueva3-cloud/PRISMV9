---
name: /prism-review must use haiku agents to avoid rate limits
description: Review agents must use model:"haiku", max 3, sequential only. Opus/Sonnet agents reliably hit API rate limits.
type: feedback
---

/prism-review agents MUST use `model: "haiku"` and run SEQUENTIALLY (one at a time, max 3 total).

**Why:** The /prism-review command was repeatedly hitting API rate limit errors (confirmed across multiple sessions through 2026-03-29). The root cause: the command spawned 3-5+ agents inheriting the parent's Opus model, which has stricter per-minute rate limits than Haiku. Even sequential spawning on Opus triggered limits when the parent conversation was already near its budget.

**How to apply:**
1. All review agents: specify `model: "haiku"` explicitly in the Agent tool call
2. Max 3 agents per review run (domain + wiring + tests)
3. Launch ONE AT A TIME — wait for completion before spawning next
4. If an agent fails with rate limit: perform that review pass INLINE (read files yourself) instead of retrying
5. Never use `run_in_background: true` for review agents
6. The command file at `~/.claude/commands/prism-review.md` was updated 2026-03-29 with these constraints
