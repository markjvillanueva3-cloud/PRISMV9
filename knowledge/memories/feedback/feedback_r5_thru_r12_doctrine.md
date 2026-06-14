---
name: feedback-r5-thru-r12-doctrine
description: PRISM operational rules R1-R12 — Karpathy's 4 (Think · Simplify · Surgical · Goal-Driven) + the 8 agent-era complement (R5-R12). Standing doctrine cited by every code review, scrutiny pass, and commit. Auto-injector anchor.
aliases: [R1-R12, R5-R12, R5 thru R12, R12, agent-era-rules, PRISM-rules, Karpathy-plus-agent-rules]
metadata:
  type: feedback
---

# PRISM operational rules R1-R12

Twelve rules cited constantly across PRISM workflow but never anchored in a dedicated memory until now — same orphan pattern as [[feedback_psn_definition]]. Source: CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–12 (adopted 2026-05 from @Mnilax X article).

## Karpathy's original 4 — moment-of-writing-code

| # | Rule | One-line discipline |
|---|---|---|
| R1 | **Think Before Coding** | CLASSIFY → TECHNIQUE → EDGE CASES → FAILURE MODES → THEN WRITE (see [[feedback_karpathy_discipline]] for the 5-step checklist) |
| R2 | **Simplicity First** | Three similar lines beats a premature abstraction; no half-finished implementations |
| R3 | **Surgical Changes** | Don't add features, refactors, or abstractions beyond what the task requires |
| R4 | **Goal-Driven Execution** | Every changed line traces to the user's request; anti-drift checkpoint every ~5 tasks |

## R5–R12 — agent-era complement (patches the gaps R1-R4 are silent on)

| # | Rule | One-line discipline |
|---|---|---|
| R5 | **Model only for judgment calls** | Use Claude for classify/draft/summarize/extract. NOT routing, retries, status codes, deterministic transforms — code answers those. PRISM: route physics → `prism_calc`, mechanical text → Ollama, only deep reasoning + safety → Claude. |
| R6 | **Token budgets are not advisory** | Soft ~4k/task, ~30k/session. Approaching budget → summarize + start fresh. Surfacing the breach beats silently overrunning. PRISM: `/compact` every 2-3 units, `/precompact` before context limit. |
| R7 | **Surface conflicts, don't average them** | Two existing patterns contradict → pick the more recent/more tested one, say *why*, flag the other for cleanup. Code satisfying both is the worst code. PRISM: conflict-fork rule + `/impact` then choose. |
| R8 | **Read before you write** | Read the file's exports + immediate caller + obvious shared utilities. "Looks orthogonal to me" is the most dangerous phrase. PRISM: `/dedup` + `duplicationGuardEngine.checkBeforeCreating` + `ENGINE_DIGEST.md`. |
| R9 | **Tests verify intent, not behavior** | Every test encodes *why* the behavior matters. `expect(getUserName()).toBe('John')` is worthless if the fn returns a hardcoded id. Can't write a test that fails when business logic changes? The function is wrong. PRISM: real reference values / algebraic invariants — `toBeDefined()` stubs are hook-rejected. |
| R10 | **Checkpoint after every significant step** | Multi-step task → after each step, restate: done / verified / left. Never continue from a state you can't describe. PRISM: per-chat `HANDOFF-<id>-<topic>.md`, `/checkpoint`, `/handoff` at session end. |
| R11 | **Match conventions even when you disagree** | Codebase is snake_case / class components / explicit-try-catch → so are you. Disagreement is a *separate* conversation; surface it, never fork the style silently. |
| R12 | **Fail loud** | Can't be sure it worked → say so. "Migration completed" is a lie if 30 records were skipped. "Tests pass" is a lie if you `.skip`-ped any. Default to surfacing uncertainty, not hiding it. PRISM: no stub engines, `comprehensive-build-enforce`, never weaken an assertion to make it green. |

## When to invoke (rule of thumb)

- **R5/R6**: every routing/token decision.
- **R7**: when you see two competing patterns.
- **R8**: BEFORE creating a new asset.
- **R9**: when writing OR reviewing a test.
- **R10**: between every significant step in a multi-file build.
- **R11**: when tempted to introduce a different style.
- **R12**: when you're tempted to silently swallow an error or fudge an assertion.

## Doctrine ≤200 lines

Past ~200 total lines in CLAUDE.md, compliance collapses (article's own finding). This memo is itself an extension of CLAUDE.md — keep CLAUDE.md's R5-R12 section tight + this memo for full detail.

## Cross-refs

- [[feedback_karpathy_discipline]] — the 5-step pre-coding checklist (R1's mechanism)
- [[feedback_psn_definition]] — the doctrine memo that closed the same orphan-pattern
- [[feedback_always_close_out]] — concrete R12 application
- [[feedback_parallel_scrutiny_per_file]] — the per-file scrutiny gate is the R9 + R10 enforcement
- [[feedback_settings_wiring_drift_2026_05_16]] — R12 fail-loud applied to settings.json
