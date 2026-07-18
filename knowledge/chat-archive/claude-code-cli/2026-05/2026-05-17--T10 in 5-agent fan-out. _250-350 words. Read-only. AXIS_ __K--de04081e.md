---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "T10 in 5-agent fan-out. ~250-350 words. Read-only. AXIS: **Karpathy R5-R12 doctr"
date: "2026-05-17"
first_ts: "2026-05-17T05:42:29.877Z"
last_ts: "2026-05-17T05:42:32.336Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a006ff0dc5236d934.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# T10 in 5-agent fan-out. ~250-350 words. Read-only. AXIS: **Karpathy R5-R12 doctr

> **claude-code-cli** | 2026-05-17 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a006ff0dc5236d934.jsonl`

## Transcript

### User | 2026-05-17T05:42:29.877Z

T10 in 5-agent fan-out. ~250-350 words. Read-only.

AXIS: **Karpathy R5-R12 doctrine enforcement coverage** — auto-injected every prompt

Per global CLAUDE.md "CLAUDE.md RULES 5-12 — agent-era complement to Karpathy's 4". 8 rules (R5 model-for-judgment, R6 token-budgets, R7 surface-conflicts, R8 read-before-write, R9 tests-verify-intent, R10 checkpoint-after-step, R11 match-conventions, R12 fail-loud). Per iter-3 S6 + V2.1: every doctrine without an enforcement hook joins dead doctrine.

PROTOCOL:
1. Grep for hooks/scripts implementing each R5-R12:
   - R6 (token-budgets) → token-budget-gate.mjs (exists per [[reference_token_budget_telemetry]])
   - R12 (fail-loud) → comprehensive-build-enforce.mjs?
   - others?
2. `Glob H:/prism/.claude/hooks/karpathy-*.mjs` (any explicit enforcers?)
3. Identify which R5-R12 are DOCTRINE-ONLY (no hook = dead rule per S6 finding)

Return:
```
## T10 — R5-R12 enforcement matrix
| Rule | Has hook | Hook name | Fires when |
| R5 model-judgment | ? | ? | ? |
| R6 token-budgets | YES | token-budget-gate.mjs | UserPromptSubmit |
| R7 surface-conflicts | ? | ? | ? |
| R8 read-before-write | ? | ? | ? |
| R9 tests-verify-intent | ? | ? | ? |
| R10 checkpoint | ? | ? | ? |
| R11 match-conventions | ? | ? | ? |
| R12 fail-loud | ? | ? | ? |

## T10 — Doctrine-only rules (no enforcement)
- list of rules where doctrine exists but no hook fires it

## T10 — Unit proposal
- name: U-KARPATHY-R5R12-ENFORCEMENT
- owner-slot: <kilo — owns hook-orphan-reconcile + AAM04; or echo>
- cost: <M>
```

### Assistant | 2026-05-17T05:42:32.336Z

You've hit your limit · resets 3:50am (America/Chicago)
