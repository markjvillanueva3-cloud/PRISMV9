---
name: karpathy-12-rule-discipline
category: software-engineering
domain: backend-dev
tags: [karpathy, coding-discipline, llm-agent-engineering, ai-development]
last_updated: 2026-05-18
sources: [knowledge/CLAUDE.md, https://x.com/Mnilax 2026-05 article]
---

# Karpathy 12-Rule Coding Discipline (R1–R12)

PRISM's master prompt discipline. R1–R4 are the original Karpathy quartet that targets *the moment code is written*. R5–R12 are the agent-era complement (from @Mnilax, 2026-05) that patch the orchestration-failure modes the quartet is silent on. **The 8 don't compete for the same attention budget as the 4** — they cover different gaps.

## The Original Four — at-the-keyboard discipline

**R1 — Think before coding.** Classify the problem (search, state, async, parse, cache, validate, transform). Pick the technique (hash vs tree, FSM vs reducer, parallel vs sequential). Enumerate edge cases (empty, null, overflow, concurrent, NaN, unicode, timeout). Enumerate failure modes (network, disk, OOM, race, invalid state). THEN write code that handles all the above from line 1.

**R2 — Simplicity first.** No abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup. A one-shot operation doesn't need a helper. Three similar lines is better than a premature abstraction.

**R3 — Surgical changes.** Don't refactor neighboring code, don't add features adjacent to a fix, don't introduce dependencies you don't strictly need.

**R4 — Goal-driven execution.** Anti-drift checkpoint every 5 tasks: am I still on the user's goal or did I wander? Is this the simplest solution? Did I check existing assets before building new? Have I made any assumptions I haven't verified?

## The Agent-Era Eight

**R5 — Model only for judgment calls.** Use the LLM for classification / drafting / summarization / extraction-from-unstructured-text. NOT for routing, retries, status-code handling, or deterministic transforms. *If a status code or a pure function already answers the question, code answers it.* → In PRISM: physics routes to `prism_calc`; mechanical text ops route to Ollama (`/ollama-*`); only deep reasoning + safety routes to Claude.

**R6 — Token budgets are not advisory.** Soft ceiling ~4k tokens/task, ~30k/session. Approaching budget → summarize state and start fresh; never push through a spiral. Surfacing the breach beats silently overrunning. → In PRISM: `/compact` every 2–3 units, `/precompact` before context limit, `context-budget` skill.

**R7 — Surface conflicts, don't average them.** Two existing patterns contradict → pick the more recent / more tested one, say *why*, flag the other for cleanup. Code that satisfies both is the worst code (double error handlers, doubled state). → In PRISM: conflict-fork rule for multi-chat; for code, `/impact` then choose, don't blend.

**R8 — Read before you write.** Before adding to a file: read its exports, the immediate caller, and obvious shared utilities. Don't understand why existing code is shaped that way? Ask first. *"Looks orthogonal to me"* is the most dangerous phrase in the repo. → In PRISM: `/dedup` + `duplicationGuardEngine.checkBeforeCreating` + `ENGINE_DIGEST.md` before any new asset.

**R9 — Tests verify intent, not behavior.** Every test encodes *why* the behavior matters. `expect(getUserName()).toBe('John')` is worthless if the fn returns a hardcoded id. Can't write a test that fails when the business logic changes? The function is wrong. → In PRISM: real reference values / algebraic invariants — `toBeDefined()` stubs are hook-rejected.

**R10 — Checkpoint after every significant step.** Multi-step task → after each step, restate: done / verified / left. Never continue from a state you can't describe back. Lost the thread → stop and restate, don't plough on. → In PRISM: per-chat `HANDOFF-<id>-<topic>.md`, `/checkpoint`, `/handoff` at session end.

**R11 — Match conventions even when you disagree.** Codebase is snake_case / class components / explicit-try-catch → so are you. Disagreement is a *separate* conversation; surface it, never fork the style silently. → In PRISM: write code that reads like the surrounding code (comment density, naming, idiom).

**R12 — Fail loud.** Can't be sure it worked → say so explicitly. *"Migration completed"* is a lie if 30 records were skipped. *"Tests pass"* is a lie if you `.skip`-ped any. *"Feature works"* is a lie if the edge case the user named is unverified. Default to surfacing uncertainty, not hiding it. → In PRISM: no stub engines, `comprehensive-build-enforce`, never weaken an assertion to make it green.

## Concrete fail-loud anti-patterns (caught in PRISM 2026)

- A `try { … } catch (e) { /* fail-safe */ }` block with no logging — operator never learns the hook silently broke. **Fix:** log to telemetry JSONL or stderr.
- A "success" message printed before the destination file is verified-readable. **Fix:** verify the output before declaring success.
- A test stubbed with `assert.ok(true)` to mask a known failure. **Fix:** mark `it.skip` with a `// SKIP-REASON:` comment.
- A schema-read written as `j.totals.X` against a producer that emits `j.X` top-level. **Fix:** schema-probe before assuming shape (the 2026-05-17 high-ROI-skill-rank META-tool bug class).

## Why this matters for PRISM

PRISM ships safety-critical code. Inline physics constants, stub engines, swallowed errors, and unverified deliveries are the four failure modes most likely to make a real shop crash a spindle. R12 is the rail against silent corruption; R8 + R11 are the rails against duplication; R5 + R6 are the rails against token waste; R9 is the rail against false-green tests.

## Related

- [[fail-loud-r12-patterns]] — concrete code-level fail-loud patterns
- [[per-file-scrutiny-gate]] — 2-reviewer per-file enforcement of R9
- [[atomic-write-idempotency-patterns]] — durable-IO patterns honoring R12
- CLAUDE.md §"CLAUDE.md RULES 5–12" — canonical reference
