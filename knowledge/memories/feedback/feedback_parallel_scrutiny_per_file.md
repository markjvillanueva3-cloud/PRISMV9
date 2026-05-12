---
name: feedback_parallel_scrutiny_per_file
description: "After every single file generated during a multi-file build/milestone close-out, dispatch 2 parallel scrutiny agents BEFORE writing the next file. Don't accumulate work and review at the end."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5fd23c5f-ca4e-4788-b782-6100b2862a94
---

User directive 2026-05-12 (during CAD-INFRA-MS0 close-out): *"do it, utilize parallel agent scrutinization after each file generated to scrutinize, look for bugs and errors before continuing on to the next step. both of you should be checking your work."*

**Why:** The existing 3-of-3 scrutiny gate (Codex + reviewer A + reviewer B) only runs at *Stop*. By then, errors compound across files — a bad dispatcher contract propagates into the test, the runbook documents the wrong actions, the UI page calls non-existent endpoints. Catching divergence at end-of-milestone is order-of-magnitude more expensive than catching it after the file that introduced it. The end-of-Stop gate stays — this is an *additional* per-file gate that prevents compound errors from ever reaching it.

**How to apply (per-file scrutiny protocol — runs after EVERY generated file in a multi-file build):**

1. Generate the file (Write/Edit).
2. **Self-cross-check** — re-read the file against the unit spec / engine APIs / dispatcher contract; mentally walk every code path, every edge case, every assumption. Note any concerns.
3. **Dispatch 2 parallel scrutiny agents** in one tool block (not sequential):
   - **Agent A — content reviewer**: `subagent_type` chosen by file type:
     - dispatcher → `wiring-review-agent` (checks dispatcher schema/action enum/lazy-import alignment)
     - test file → `test-review-agent` (checks real assertions, not toBeDefined stubs; coverage of failure modes + adversarial inputs)
     - physics engine → `physics-review-agent`
     - generic code → `code-analyzer` or `reviewer`
     - markdown/docs → `reviewer` weighted on completeness
     - UI/React → `reviewer` weighted on integration + UX
   - **Agent B — independent second-pass `reviewer`**: weighted on what Agent A is unlikely to catch — integration with already-built engines, hidden coupling, security, error budgets, naming/convention conformance.
   - Both agents review the WHOLE file end-to-end, not split sections. Pass each agent: the file path, the unit spec / dispatcher contract they're verifying against, and an explicit instruction to report any P0/P1 issues.
4. **Wait for both verdicts.** Merge with self-check.
5. **Fix every P0 + P1 finding** before generating the next file. P2/P3 deferrables → log in handoff. **If either agent fails → fix → re-dispatch both agents → re-verify.**
6. Only then proceed to the next file.

**End-of-milestone:** the standard 3-of-3 scrutiny gate (Codex + reviewer A + reviewer B at Stop) still runs — this is per-file pre-checking, not a replacement.

**Hook surface:** PRISM has `pre-write-gate` for syntactic/structural prevention, but nothing currently dispatches paired Agents per file. This is an in-loop discipline enforced by the active Claude — not a hook. The doctrine lives in [[reference_per_file_scrutiny_doctrine]] (CLAUDE.md §PER-FILE SCRUTINY GATE) so every future chat sees it via the project CLAUDE.md auto-inject.

Related: [[feedback_always_close_out]] (finish every task before reporting done), [[feedback_always_build]] (gap analyses must build, not skip), [[feedback_scrutiny_3of3_readonly]] (the standard end-of-task 3-of-3 gate this complements).
