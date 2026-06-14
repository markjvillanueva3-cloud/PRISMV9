---
name: token-budget-management
category: software-engineering
domain: backend-dev
tags: [token-budget, context-window, compact, precompact, hook-injection, prism-development, ai-development]
last_invoked: 2026-05-18
last_updated: 2026-05-18
---

# Token Budget Management — when to /compact, what costs what

Claude Opus 4.7 has a 1M context window but every token costs cache misses + latency past the 5-min TTL. Karpathy R6 makes budgets non-advisory: ~4k tokens/task, ~30k/session soft ceiling. PRISM enforces this with multiple gates.

## The budget ladder

| Threshold | Action | Surface |
|-----------|--------|---------|
| 30k cumulative | Self-checkpoint via R10 (restate done/verified/left) | None automated — discipline |
| 200k input | Auto-suggest /compact | `precompact-auto-trigger.mjs` |
| 880k input | SOFT precompact (advisory) | Stop hook nudge |
| 940k input | HARD precompact (BLOCKS tool use) | PreToolUse hook block |
| 950k+ input | Risk overflow before handoff can write | DON'T be here |

The 940k HARD threshold is conservative — it leaves 60k tokens to write a useful handoff before /compact. Lower than that and the handoff itself becomes truncated.

## What costs tokens (the audit)

Per UserPromptSubmit, PRISM injects multiple context blocks:

| Block | Typical cost | Knob |
|-------|--------------|------|
| Master-index pre-search top-5 | ~500 tokens | `PRISM_MASTER_INDEX_K=2` (lower top-K) |
| Wiki precheck top-3 | ~400 tokens | `PRISM_WIKI_PRECHECK_DISABLE=1` |
| Tribal precontext top-3 | ~400 tokens | `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1` |
| Discipline expert mode | ~300 tokens | `PRISM_DISCIPLINE_EXPERT_DISABLE=1` |
| Chat bus header | ~100 tokens | `PRISM_CHAT_BUS_COMPACT=0` unset |
| Slot/cron/goal awareness | ~200 tokens | various per-hook knobs |
| Slash-command exec rules | ~150 tokens | always-on doctrine |

Total per-prompt injection: 2-3k tokens. Over a 50-message session that's 100-150k just in injections. Worth tuning down for context-tight sessions.

## When to /compact (the discipline)

- Every 2-3 completed units (CLAUDE.md TOKEN ECONOMY default cadence)
- After a multi-file build that dumped large diffs into context
- Before starting a fresh topic (preserves clean handoff)
- When the auto-trigger nudges (don't ignore it)

DON'T /compact:
- Mid-build (loses the per-file scrutiny ledger)
- Right after /compact (no new context to summarize)
- When the session is about to end anyway (handoff > compact for cross-session)

## The /compact vs /clear distinction

- `/compact` — summarizes the conversation into a precompact summary, keeps the summary in context. Useful when you need continuity but not the full history.
- `/clear` — wipes context entirely. Useful for unrelated next task. CLEAR-NOT-COMPACT doctrine: prefer /clear for token headroom when no continuity needed (per JULIETT-12CHAT-ALLOCATION-MS0).

For a /loop iteration with NO need to remember prior iters: /clear between is cheaper than /compact.

## The auto-resume rail across /compact

`session-start-auto-resume.mjs` injects the handoff's `## RESUME` block on the post-compact prompt. So even after `/compact` wipes prior context, the next session anchors to the explicit RESUME directive — IF the handoff was written before /compact.

This is why [[handoff-discipline]]'s "write RESUME directives that work" rail is load-bearing: it survives /compact.

## Subagent tokens are external to YOUR budget

When you `Agent({...})`, the subagent has its OWN context. Its tokens don't count against your budget — only the result message (typically 200-500 tokens) lands in your context.

Implication: dispatching 3 parallel agents costs ~1-1.5k tokens in your context, vs doing the equivalent work yourself which could cost 30-50k. Subagents are token-efficient for parallelizable review work.

## Bash output tokens

Bash output is captured in full. A `git log` with 50 entries can be 5k tokens; a verbose test run could be 50k. Use:
- `rtk <cmd>` to filter (60-99% reduction)
- `| head -N` to truncate
- `| tail -N` to truncate
- Specific output formats (`git log --oneline -10` not full log)

The 2026-05-18 audit-token-context-memory entry documented `audit-hook-stack-cost.mjs` for per-hook cost telemetry.

## When the budget is tight

If approaching 800k+ tokens AND you have substantive work left:

1. Write the handoff IMMEDIATELY (don't wait for HARD threshold)
2. Push outstanding work to deferred-items in handoff
3. Run /compact
4. Resume work in the compacted session

R6 says "approaching budget → summarize state and start fresh; never push through a spiral". Pushing through tends to silently corrupt the handoff (truncated tool output, half-written RESUME).

## Knobs (operator controls)

- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95` — Claude CLI autocompact threshold (PRISM caps at 95-98)
- `PRISM_HOOK_PROFILE=minimal` — disable non-MINIMAL_ALLOWLIST hooks for low-overhead sessions
- `PRISM_MASTER_INDEX_INJECT=0` — disable master-index pre-search
- `PRISM_AWARENESS_INJECT=0` — disable SessionStart awareness snapshot

## The "monitor your own budget" rule

Claude's own message-stream doesn't report tokens. PRISM doesn't expose a real-time counter (yet). Proxy signals:
- Session started > 30 min ago AND > 20 user prompts: probably > 200k
- Just opened > 10 large files: probably +50k each
- Multi-file build with > 3 agents dispatched: probably +50-100k

Err on the side of /compact early. Late /compact loses the handoff.

## Related

- [[karpathy-12-rule-discipline]] — R6 token budget rules
- [[handoff-discipline]] — RESUME survives /compact
- [[fleet-debug-playbook]] — context-budget bloat symptom
- CLAUDE.md "TOKEN ECONOMY"
- CLAUDE.md "AUTOCOMPACT-AUTONOMOUS-MS0"
