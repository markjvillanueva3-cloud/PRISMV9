---
name: audit-token-context-memory-2026-05-16
type: architecture
layer: meta
created: 2026-05-16
boost_keywords: [token saving, context retention, memory retention, hook stack cost, ollama offload rate, MEMORY.md ceiling, cache breakpoint, forge-audit-v2, prompt caching]
description: /forge-audit-v2 token/context/memory/learning audit (slot juliett). 7 findings, peer-reviewed. Ships 2 re-runnable META artifacts (audit-hook-stack-cost.mjs, memory-size-watch.mjs). Headline F7 — MEMORY.md 750B from silent-truncation ceiling with no watchdog.
links:
  - spec: state/shared/specs/AUDIT-TOKEN-CONTEXT-MEMORY-2026-05-16.md
  - spec-html: state/shared/specs/AUDIT-TOKEN-CONTEXT-MEMORY-2026-05-16.html
  - meta: scripts/audit-hook-stack-cost.mjs
  - meta: scripts/memory-size-watch.mjs
  - baseline: state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json
  - companion: synergy-regression-watch, ollama-pipeline-ms0
  - memory: reference_audit_token_context_memory_2026_05_16
---

# Audit — Token / Context / Memory / Learning (2026-05-16)

## Promise

A re-runnable measurement of PRISM's per-turn token economy. Two META artifacts replace one-shot opinion: `audit-hook-stack-cost.mjs` (hook injection cost) + `memory-size-watch.mjs` (MEMORY.md truncation guard). Every finding has a `verifies_via` command — re-run it, compare to the captured baseline.

## Baselines captured

| Surface | Baseline | Verify |
|---|---|---|
| UserPromptSubmit hook cost | ~3,420 est tok/fire (8 inject hooks) | `node scripts/audit-hook-stack-cost.mjs --json` |
| Ollama offload rate | 0.222 (63/283) — target 0.30 | `node scripts/ollama-offload-dashboard.mjs --json` |
| MEMORY.md size | 23,826 B / 96.9% of 24,576 ceiling — **WARN** | `node scripts/memory-size-watch.mjs --json` |

## 7 findings (peer-reviewed, 0 unresolved FAIL)

- **F7 (P0, shipped)** — MEMORY.md 750 B from the silent-truncation ceiling, no watchdog. `memory-size-watch.mjs` makes the prior one-shot U-MEMORY-COMPRESS fix durable. Peer-reviewer-added (audit had "memory" in scope but no memory finding until adversarial review).
- **F2 (P0, fixes pending)** — Ollama stuck 22% because `ollama-auto-router.mjs:166` skips all `/`-prefixed prompts (dead code for the whole `/checkin`/`/loop` class) + `INJECT_THRESHOLD=0.90` over-suppresses. R1+R5 → ≥30%.
- **F1 (P1)** — 8 per-turn injectors re-emit static doctrine every turn, churning the message-level prompt cache. Move static→SessionStart. Savings real in direction, **uncalibrated in magnitude** (flat-400 heuristic; F6 builds the calibration channel).
- **F4 (P1)** — per-file/3-of-3 reviewers default to parent model (Opus); subagent model router (Sonnet/Haiku triage) is multiplicative on a 12-chat fleet.
- **F6 (P1)** — no context-utilization telemetry (the gap that makes F1's number real).
- **F3, F5 (open questions)** — lazy skill bodies (progressive disclosure) + MCP beta-header verify; channel must be built before asserting a gap.

## Durable re-run

The CronCreate self-schedule is session-only (dies with the chat). The **durable** re-run is the two META artifacts' cron/CI exit codes: wire `memory-size-watch.mjs` to the daily Windows task / Stop advisory cluster (exit 1 = compress now). `audit-hook-stack-cost.mjs` diffs against `AUDIT-HOOK-STACK-COST-BASELINE.json`.

## Method note (Boris discipline)

Peer-reviewer (`isolation: worktree`) caught: F1 magnitude inflated by an uncalibrated flat-token heuristic, F2 R3 was a phantom fix (regex already present), F5 was speculation with no channel, and the entire memory axis was missed. All corrected before ship — the audit's value is the corrected, verifiable subset, not the first-pass count.
