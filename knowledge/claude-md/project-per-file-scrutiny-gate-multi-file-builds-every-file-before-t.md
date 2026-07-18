---
source: project
section: PER-FILE SCRUTINY GATE (multi-file builds — every file, before the next)
slug: per-file-scrutiny-gate-multi-file-builds-every-file-before-t
indexed_at: 2026-06-06T05:18:28.747Z
---

## PER-FILE SCRUTINY GATE (multi-file builds — every file, before the next)

For ANY multi-file build (milestone close-out, multi-unit roadmap pass, paired engine+dispatcher+test work, anything that emits 2+ files in one session), the chat **must dispatch 2 parallel scrutiny agents after each file** before writing the next file. This is *in addition to* the end-of-task 3-of-3 gate below — not a replacement. Adopted 2026-05-12 (user directive: *"utilize parallel agent scrutinization after each file generated… both of you should be checking your work"*) after observing that end-of-Stop-only scrutiny lets compound errors propagate (bad dispatcher contract → wrong test → wrong runbook → broken UI).

Protocol for every file generated in a multi-file run:
1. **Generate** the file (Write/Edit).
2. **Self-cross-check** — re-read against the unit spec, engine APIs, dispatcher contract, surrounding conventions; mentally walk every path + edge + assumption.
3. **Dispatch 2 parallel reviewer agents in one tool block** (single message, parallel tool calls):
   - **Agent A — content-specialist** by file type:
     | File type | `subagent_type` |
     |-----------|-----------------|
     | dispatcher | `wiring-review-agent` |
     | test (`*.test.ts`) | `test-review-agent` |
     | physics engine | `physics-review-agent` |
     | generic engine / utility | `code-analyzer` |
     | docs / runbook / spec | `reviewer` (weighted: completeness, operator clarity) |
     | UI/React (`.tsx`) | `reviewer` (weighted: integration + UX + state management) |
   - **Agent B — independent second-pass `reviewer`**, weighted on what A is unlikely to catch: integration with already-built engines, hidden coupling, security, error budgets, naming/convention conformance, inlined constants, stub assertions.
   - Both agents read the **whole file end-to-end** (not split sections). Pass each agent: the absolute file path, the unit spec / contract they're verifying against, an explicit instruction to flag P0/P1 issues and grade PASS/FAIL.
4. **Wait for both verdicts.** Merge with the self-check.
5. **Fix every P0 + P1 finding** before generating the next file. P2/P3 deferrables → log in handoff. If either agent returns FAIL → fix → re-dispatch both agents → re-verify.
6. Only then proceed to the next file.

The end-of-task 3-of-3 gate below still runs at Stop — this per-file gate just prevents compound errors from ever reaching it.
