---
name: prompt-engineering-rails
category: software-engineering
domain: backend-dev
tags: [prompt-engineering, llm, agent-prompt, subagent, claude-code, ai-development]
last_invoked: 2026-05-18
last_updated: 2026-05-18
---

# Prompt-Engineering Rails for PRISM Subagents

A subagent dispatch is a one-shot prompt with no follow-up window. The prompt IS the contract; mistakes cost ~$0.10–$1.00 in wasted Opus tokens. Six rails prevent the common failure modes.

## Rail 1 — The agent has zero conversation history

Write as if a smart colleague just walked into the room. State the goal, the context, the constraints, the deliverable, and the output format. **Never use the phrase "based on the discussion above"** — there is no above.

## Rail 2 — Include file paths + line numbers, not descriptions

A subagent told "fix the bug in the auth code" wastes 5 tool calls finding the file. A subagent told `fix the JWT-signature-verify race at H:/prism/src/auth/jwt.ts:142` opens the file once and works.

## Rail 3 — Specify the verification command

Every prompt must end with a concrete command the agent can run to verify success. `node --test H:/prism/.../my-engine.test.mjs` is better than "make sure the tests pass". The exact path eliminates a search loop.

## Rail 4 — Cap the output length

Without a cap, agents generate paragraphs of restatement before reaching the deliverable. Cap at 200-400 words for review work, 600-1000 for design work. **"Report in under 400 words"** is the canonical phrasing.

## Rail 5 — Don't delegate understanding

The single most-common subagent-prompt failure: ending with "based on your findings, implement the fix." This pushes synthesis onto the agent, which usually produces wrong output. Write prompts that prove YOU understood: include the file, the line, the wrong assumption, the right behavior.

## Rail 6 — Specify the failure-mode the agent should LOOK for

A reviewer told "review this code" finds whatever is most prominent. A reviewer told "check for inlined physics constants, stub assertions, schema drift, hostile-payload exposure, and first-match-wins ordering bugs" finds those classes specifically.

## The canonical subagent prompt template

```
## Unit goal
<one paragraph — why this matters, what's the deliverable>

## Files / paths involved (absolute)
<list>

## Background you might lack
<3-5 bullets — non-obvious context from this session>

## Critical invariants to verify
<numbered list — the load-bearing assertions>

## Run-this-test / verify-this-command
<exact command, absolute path>

## Output format
- Grade PASS/FAIL
- Findings: `file:line — issue` format
- Cap: <N words>

## Doctrine references
<wiki entries, CLAUDE.md sections>
```

## Anti-prompt examples (caught in PRISM reviews)

**Anti-pattern 1: vague:**
> "Review the recent changes for quality issues."

Failure mode: agent does a generic walk through "what's a quality issue", produces a checklist of trivia, misses the actual P0.

**Anti-pattern 2: delegated synthesis:**
> "Look at the failing test and fix the bug it's reporting."

Failure mode: agent reads the test, guesses at the production-code intent, "fixes" the test instead of the production bug.

**Anti-pattern 3: no verification:**
> "Implement the missing dispatcher case for `my_action`."

Failure mode: agent adds the case but introduces a schema mismatch; test was never specified, so agent declares done without running it. Silent-wiring class regression.

**Anti-pattern 4: no failure-class hint:**
> "Run a code review on this PR."

Failure mode: agent reviews syntax + style; misses the inlined Kienzle constant + the swallowed catch + the schema-read blindness — the actual high-impact classes PRISM cares about.

## The "2-reviewer-in-1-message" parallel-dispatch pattern

```js
Agent({ subagent_type: "code-analyzer", description: "wiring review",  prompt: PROMPT_A })
Agent({ subagent_type: "reviewer",      description: "independent",     prompt: PROMPT_B })
```

Two parallel agents in one message run concurrently — wall-time = max(A, B), not A + B. The independent-second-pass reviewer (B) should be weighted on what A is structurally unlikely to catch.

## Prompt-cache discipline (R6 token budgets)

Anthropic prompt-cache TTL is ~5 minutes. Repeated subagent dispatches with stable preamble hit the cache; ad-hoc prompts blow it. **PRISM's per-file scrutiny gate dispatches both reviewers in ONE message** specifically to maximize cache hits across the two prompts that share a 90%+ preamble.

## Related

- [[llm-agent-loop-design]] — the 4 loop shapes that consume these prompts
- [[per-file-scrutiny-gate]] — the canonical 2-reviewer pattern
- [[deep-reasoning-doctrine]] — picking the right tier for the prompt
- CLAUDE.md §"Writing the prompt" — Agent tool guidance
