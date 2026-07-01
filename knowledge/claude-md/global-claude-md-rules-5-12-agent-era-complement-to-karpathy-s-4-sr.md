---
source: global
section: CLAUDE.md RULES 5–12 — agent-era complement to Karpathy's 4 (src: @Mnilax X article, 2026-05)
slug: claude-md-rules-5-12-agent-era-complement-to-karpathy-s-4-sr
indexed_at: 2026-05-12T15:45:11.276Z
---

## CLAUDE.md RULES 5–12 — agent-era complement to Karpathy's 4 (src: @Mnilax X article, 2026-05)

> Karpathy's original 4 (Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution) target the *moment code is written*. These 8 cover the agent-orchestration failure modes that template is silent on — they don't compete for the same attention budget, they patch different gaps. Keep this section ≤20 lines: past ~200 lines total, CLAUDE.md compliance collapses (the article's own finding).

- **R5 — Model only for judgment calls.** Use Claude for classification / drafting / summarization / extraction-from-unstructured-text. NOT for routing, retries, status-code handling, or deterministic transforms — if a status code or a pure function already answers the question, *code* answers it. → PRISM: route physics to `prism_calc`, mechanical text ops to Ollama (`/ollama-*`), only deep reasoning + safety to Claude.
- **R6 — Token budgets are not advisory.** Soft ceiling ~4k tokens/task, ~30k/session. Approaching budget → summarize state and start fresh; never push through a spiral. Surfacing the breach beats silently overrunning. → PRISM: `/compact` every 2-3 units, `/precompact` before context limit, `context-budget` skill.
- **R7 — Surface conflicts, don't average them.** Two existing patterns contradict → pick the more recent / more tested one, say *why*, flag the other for cleanup. Code that satisfies both is the worst code (double error handlers, doubled state). → PRISM: conflict-fork rule for multi-chat; for code, `/impact` then choose, don't blend.
- **R8 — Read before you write.** Before adding to a file: read its exports, the immediate caller, and obvious shared utilities. Don't understand why existing code is shaped that way? Ask first. "Looks orthogonal to me" is the most dangerous phrase in the repo. → PRISM: `/dedup` + `duplicationGuardEngine.checkBeforeCreating` + `ENGINE_DIGEST.md` before any new asset.
- **R9 — Tests verify intent, not behavior.** Every test encodes *why* the behavior matters. `expect(getUserName()).toBe('John')` is worthless if the fn returns a hardcoded id. Can't write a test that fails when the business logic changes? The function is wrong. → PRISM: real reference values / algebraic invariants — `toBeDefined()` stubs are hook-rejected.
- **R10 — Checkpoint after every significant step.** Multi-step task → after each step, restate: done / verified / left. Never continue from a state you can't describe back. Lost the thread → stop and restate, don't plough on. → PRISM: per-chat `HANDOFF-<id>-<topic>.md`, `/checkpoint`, `/handoff` at session end.
- **R11 — Match conventions even when you disagree.** Codebase is snake_case / class components / explicit-try-catch → so are you. Disagreement is a *separate* conversation; surface it, never fork the style silently. Inside the codebase, conformance > taste. → PRISM: "write code that reads like the surrounding code" (comment density, naming, idiom).
- **R12 — Fail loud.** Can't be sure it worked → say so explicitly. "Migration completed" is a lie if 30 records were skipped. "Tests pass" is a lie if you `.skip`-ped any. "Feature works" is a lie if the edge case the user named is unverified. Default to surfacing uncertainty, not hiding it. → PRISM: no stub engines, `comprehensive-build-enforce`, never weaken an assertion to make it green.

---
