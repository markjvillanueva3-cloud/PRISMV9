---
name: subagent-dispatch-patterns
category: code-tribal
domain: backend-dev
tags: [subagent, agent-tool, dispatch, parallel, prism-development, ai-development]
last_updated: 2026-05-18
---

# Subagent Dispatch Patterns — when, how, parallel

PRISM has ~80 subagent types via the Agent tool. Picking the right one + dispatching efficiently saves 10-50x parent-context tokens compared to doing the same work in the main chat. Five patterns make subagent dispatch effective.

## Pattern 1 — Parallel scrutiny (the canonical 2+1 dispatch)

For per-file scrutiny (2 reviewers) and Stop 3-of-3 gate (3 reviewers), dispatch all agents in ONE message:

```js
Agent({ subagent_type: "code-analyzer", description: "wiring review",  prompt: A_prompt })
Agent({ subagent_type: "reviewer",      description: "independent",     prompt: B_prompt })
Agent({ subagent_type: "code-analyzer", description: "analyst arm C",   prompt: C_prompt })
```

Wall-time = max(A, B, C), NOT sum. Two messages with one agent each = sum of durations. Always batch.

## Pattern 2 — Specialist routing (subagent_type matching)

| Work | subagent_type | Why |
|------|---------------|-----|
| Dispatcher review | `wiring-review-agent` | Reads the 5-piece contract |
| Test review | `test-review-agent` | Catches stub assertions, hermetic-mock blindspots |
| Physics engine review | `physics-review-agent` | Validates constants imports + S(x) |
| Generic engine | `code-analyzer` | Holistic; weighted on correctness |
| Open-ended research | `general-purpose` | When the work is exploratory |
| Codebase navigation | `code-archaeologist` | Read-only architecture deep-dive |
| Plan-only (no edits) | `Plan` | Designs implementation, doesn't write |
| Quick path/symbol lookup | `Explore` | Fast read-only file search |
| Tests after change | `test-runner` | Runs targeted suites |
| Failure root-cause | `regression-hunter` | Traces failures to source changes |

Default to `code-analyzer` or `reviewer` for review work. Use `general-purpose` ONLY when no specialist fits — it's broad but token-heavy.

## Pattern 3 — Self-contained prompt (6 sections)

Subagents have ZERO conversation history. Prompt MUST be self-contained:

```
## Unit goal
<one paragraph — why this matters, what's the deliverable>

## Files involved (absolute paths)
<list>

## Background you might lack
<3-5 bullets — non-obvious context from this session>

## Critical invariants to verify
<numbered list — load-bearing assertions>

## Run-this-test / verify-this-command
<exact command, absolute path>

## Output format
- Grade PASS/FAIL
- Findings: `file:line — issue` format
- Cap: <N words>
```

See [[prompt-engineering-rails]] for the full template + anti-patterns.

## Pattern 4 — Cost-aware tier selection

Subagents inherit a default model. Override only when judgment density doesn't match the default:

- Reviewer agents (code-analyzer, reviewer): Sonnet — adequate for review
- general-purpose, Plan, code-archaeologist: Opus — high judgment density
- Explore, test-runner, regression-hunter: Sonnet — mechanical work
- dispatcher-wirer, catalog-enricher, doc-generator: Sonnet — well-spec'd

Wrong-direction overrides (Opus → Sonnet for high-judgment work) silently produce wrong output that LOOKS right. Wrong-direction Sonnet → Opus wastes 5-10x cost without proportional quality gain.

## Pattern 5 — Background vs foreground

`run_in_background: true` for genuinely independent work that doesn't gate the next step:
- Long test runs (test-long-runner agent)
- Catalog enrichment (catalog-enricher)
- Documentation generation (doc-generator)

Foreground (default) for work where the result informs the next step:
- Scrutiny reviewers (block the commit)
- Research that drives a decision
- Planners that produce the next concrete action

The "background" callout: complete notifications arrive automatically; DO NOT poll or sleep. Continue with other work.

## The "subagent results are not visible to user" rule

The subagent's final message comes back as the tool result. The user does NOT see it directly. If the result is important, surface it in main-chat text:

```
The wiring-review agent reported:
- PASS — first-match-wins precedence preserved
- P1 (now fixed): missing --domain validator
```

NOT just: "Agent ran, see result for details."

## When NOT to use a subagent

- The task is already in your context and 1-2 tool calls away
- The work IS the synthesis (delegating synthesis loses the thread — [[prompt-engineering-rails]] Rail 5)
- The work needs back-and-forth (subagents are single-shot)

## The "agent fields tool result" trap

The Agent tool returns a single result message. If you Agent({...}) and then need to act on the result, you act on it in the NEXT message. The dispatch itself is fire-and-forget within the message — you can't have the dispatch inform another tool call IN THE SAME MESSAGE.

For per-file scrutiny: dispatch agents → wait for results in next round → fix P0/P1 → dispatch next batch. Don't try to chain in one message.

## Subagent worktree isolation

Some subagent types support `isolation: "worktree"` — creates a temporary git worktree so the agent works on an isolated copy. Useful for:
- Exploratory refactors that might be rejected
- Multi-file builds that should be reviewable as a unit
- Parallel agents that might touch the same files

Auto-cleanup if no changes; path+branch returned in result if changes were made.

## Related

- [[per-file-scrutiny-gate]] — the canonical 2-reviewer + Stop 3-of-3 dispatch
- [[prompt-engineering-rails]] — the 6 rails for subagent prompts
- [[deep-reasoning-doctrine]] — when LLM tier (Opus/Sonnet) matters
- [[token-budget-management]] — subagent tokens are external to YOUR budget
- CLAUDE.md "MULTI-AGENT PATTERNS"
