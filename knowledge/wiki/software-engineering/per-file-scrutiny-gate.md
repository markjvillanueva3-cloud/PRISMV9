---
name: per-file-scrutiny-gate
category: software-engineering
domain: backend-dev
tags: [scrutiny, code-review, multi-agent, quality-gate, ai-development]
last_updated: 2026-05-18
---

# Per-File Scrutiny Gate (2-Reviewer + 3-of-3 Stop)

PRISM enforces two scrutiny gates on every multi-file build:

1. **Per-file gate** — after EACH file, dispatch 2 parallel reviewer agents before writing the next file.
2. **Stop gate (3-of-3)** — at session end, dispatch 3 reviewer agents on the session diff; ledger blocks task completion until all three PASS.

The per-file gate prevents compound errors (bad dispatcher contract → wrong test → wrong runbook → broken UI) from ever reaching the Stop gate. The Stop gate is the final independent check.

## Per-file gate protocol

For every file in a multi-file build:

1. **Generate** the file (Write/Edit).
2. **Self-cross-check** — re-read against the unit spec, engine APIs, dispatcher contract, surrounding conventions; mentally walk every path + edge + assumption.
3. **Dispatch 2 parallel reviewer agents in ONE message:**

   | File type | Agent A `subagent_type` |
   |-----------|-------------------------|
   | dispatcher | `wiring-review-agent` |
   | test (`*.test.ts/mjs`) | `test-review-agent` |
   | physics engine | `physics-review-agent` |
   | generic engine / utility | `code-analyzer` |
   | docs / runbook | `reviewer` (weighted: completeness, operator clarity) |
   | UI/React (`.tsx`) | `reviewer` (weighted: integration + UX + state) |

   - **Agent B**: independent second-pass `reviewer`, weighted on what A is unlikely to catch (integration, hidden coupling, security, R8 dedup, R12 fail-loud, inlined constants, stub assertions).

4. **Wait for both verdicts.** Merge with the self-check.
5. **Fix every P0 + P1 finding** before generating the next file. P2/P3 deferrables → log in handoff.
6. Only then proceed to the next file.

## Stop gate (3-of-3 PASS required)

The `scrutinize-before-stop.mjs` Stop hook blocks task completion when the session has uncommitted file changes and the scrutiny ledger lacks a 3-of-3 PASS entry.

```bash
# Emit the three reviewer prompts
node .claude/scripts/scrutiny-3way.mjs --session-id <id>
# Dispatch THREE agents in one parallel block
Agent({ subagent_type: "reviewer",      prompt: <opusReviewerPrompt> })
Agent({ subagent_type: "reviewer",      prompt: <opusReviewerPromptB> })
Agent({ subagent_type: "code-analyzer", prompt: <analystReviewerPrompt> })
# Mark verdicts (pass | fail)
node .claude/scripts/scrutiny-3way.mjs --mark-opus    pass --session-id <id>
node .claude/scripts/scrutiny-3way.mjs --mark-claude  pass --session-id <id>
node .claude/scripts/scrutiny-3way.mjs --mark-analyst pass --session-id <id>
```

Arm B is weighted toward test integrity / dispatcher-wiring completeness / inlined-constant detection. Arm C is weighted toward silent breakage / regression risk / I/O security / error-budget completeness.

## What the reviewers MUST catch

- **Stub assertions** — `assert.ok(true)`, `expect.toBeDefined()` with no real value.
- **Inlined physics constants** — Kienzle kc1.1, Taylor C/n, material properties hardcoded outside `mcp-server/src/physics/constants.ts`.
- **R12 violations** — silent catch blocks, exit-0 on partial failure, success messages before verification.
- **Schema drift** — code that reads `j.X.Y` against a producer that emits `j.Y` top-level (the 2026-05-17 META-tool bug class).
- **Hostile-payload exposure** — greedy slice extraction, regex catastrophic backtracking, unescaped string interpolation.
- **First-match-wins ordering** — DOMAIN_MAP / fallback chains where order is load-bearing.
- **Test–code divergence** — hermetic stubs that injected fakes the production reader factory doesn't honor (the RGS-TOOL-AUTOINVOKE-MS1 P0 class).

## Why hermetic mocks aren't enough

A "pure core + injected readers" design MUST ship one real-data E2E test. Hermetic fakes prove the algebraic core; they do NOT prove the production reader factories that connect the core to filesystem/network/state. RGS-TOOL-AUTOINVOKE-MS0 shipped 97 unit tests, ALL hermetic, ALL green — and 10 P0 bugs in the reader factories went undetected to production. The fix was MS1's `rgs-tool-planner.e2e.test.mjs`.

## Reviewer prompts (canonical structure)

Every reviewer prompt should include:
- **Unit goal** — one paragraph explaining the change's intent.
- **Files changed** — absolute paths, end-to-end (not split sections).
- **Critical invariants to verify** — token collisions, precedence, idempotency, atomic-write safety.
- **Run-this-test** — exact command path the reviewer should execute.
- **Grade PASS/FAIL** + **P0/P1 finding format** — `file:line — issue`.
- **Word cap** — usually 400 words; keeps reviewers focused.

## Related

- [[karpathy-12-rule-discipline]] — R9 (tests verify intent), R10 (checkpoint), R12 (fail-loud)
- [[fail-loud-r12-patterns]] — what R12 violations look like in code
- CLAUDE.md §"PER-FILE SCRUTINY GATE" + §"SCRUTINY GATE (UNIVERSAL)"
