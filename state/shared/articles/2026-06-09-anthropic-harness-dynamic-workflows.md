# A Harness for Every Task: Dynamic Workflows in Claude Code
Source (canonical): https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code
Also posted: https://x.com/trq212/article/2061907337154367865 (Thariq Shihipar + Sid Bidasaria, Anthropic, 2026-06-02)
Captured: 2026-06-09 via claude.com mirror (X version login-walled) — zulu slot

## Core concept
Claude Code writes and orchestrates its own multi-agent harness on the fly. The default harness
plans and executes in ONE context window — that breaks down on long-running, massively parallel,
highly structured, or adversarial tasks. Workflows let Claude dynamically create a purpose-built
harness natively, shareable and reusable.

## The three failure modes dynamic workflows fix
1. **Agentic laziness** — declares done after partial progress (e.g. 35 of 50 security-review items).
2. **Self-preferential bias** — favors its own outputs when asked to verify them against a rubric.
3. **Goal drift** — details/constraints lost through summarization across many turns.

## How workflows function
- Workflows are JavaScript files with special functions to spawn + coordinate subagents.
- Agents run in ISOLATED context windows with focused goals.
- Per-agent model override and optional separate git worktrees.
- Interrupted workflows RESUME from where they left off (journaled agent() calls).
- Standard JS (JSON/Math/Array) for deterministic data processing between agents.
- Trigger word: **"ultracode"** forces workflow creation.

## Composable patterns (the canonical six)
1. **Classify-and-act** — classifier agent routes tasks to type-specific agents.
2. **Fan-out-and-synthesize** — split into parallel tasks, merge results.
3. **Adversarial verification** — INDEPENDENT agents verify outputs against rubrics (kills self-preferential bias).
4. **Generate-and-filter** — many candidates, filter by quality criteria.
5. **Tournament** — multiple agents compete on same task, pairwise judging.
6. **Loop until done** — keep spawning agents until stop conditions met (kills agentic laziness).

## Proven applications
- Large-scale migrations (Bun rewrote Zig → Rust using workflows).
- Deep research with adversarial source verification.
- Root-cause investigation via independent hypothesis generation.
- Triage: classify + dedupe at scale.
- Sorting/ranking via tournament brackets.

## Cost note
Workflows often use MORE tokens — best for complex, high-value tasks, not routine coding.

## PRISM application notes (zulu)
- PRISM already has the Workflow tool wired (this session runs under it). Verify our /loop +
  fleet patterns implement: loop-until-done (anti-laziness), adversarial verify (scrutiny gates),
  fan-out (galaxy mining MAP/REDUCE).
- Gap check: do PRISM workflows journal for resume? Do our scrutiny gates use INDEPENDENT
  agents (not self-review)? → feeds Task #34 verification.
