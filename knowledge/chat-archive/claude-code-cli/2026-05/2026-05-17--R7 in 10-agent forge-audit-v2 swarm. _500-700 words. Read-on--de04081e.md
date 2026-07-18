---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "R7 in 10-agent forge-audit-v2 swarm. ~500-700 words. Read-only. YOUR AXIS: **Des"
date: "2026-05-17"
first_ts: "2026-05-17T16:51:43.564Z"
last_ts: "2026-05-17T16:52:51.296Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a924a57ee6a185cde.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# R7 in 10-agent forge-audit-v2 swarm. ~500-700 words. Read-only. YOUR AXIS: **Des

> **claude-code-cli** | 2026-05-17 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a924a57ee6a185cde.jsonl`

## Transcript

### User | 2026-05-17T16:51:43.564Z

R7 in 10-agent forge-audit-v2 swarm. ~500-700 words. Read-only.

YOUR AXIS: **Design the REVAMPED RGS pipeline that takes advantage of ALL current systems and tools**

User question: "do we need to run each chat slot task queue through a revamped rgs pipeline that takes advantage of all current systems and tools?"

CONTEXT — current RGS-TOOL-AUTOINVOKE (MS0+MS1+U-DOMAIN-RULES+U-DISPATCHER) composes these signal sources:
- findCapabilities (engines/dispatchers/skills disk inventory)
- skill-triggers.jsonl (36 registered)
- system-viz-graph
- tribal-embed-index
- ollama (degraded when Docker down per T3)
- outcomes (Beta re-rank)

What's MISSING but BUILT in PRISM iter-3+:
- per-unit specs (state/shared/specs/UNITS/<unit>.md — 5 hand-written, generator pending S10)
- slot-task-queues.json (this session — head + long_tail + REVENUE)
- master-index-search-lib (silent-fail on 331MB graph per S5 F1)
- token-budget-telemetry (per [[reference_token_budget_telemetry]])
- ollama-pipeline-injector (per [[reference_ollama_pipeline_ms0_2026_05_15]])
- semantic-cache (proposed iter-4)
- vault-unified-query (proposed iter-3 S5)
- error-fix-vault-bridge ([[reference_error_fix_vault_bridge_2026_05_16]])
- chat-bus (live peer-collision signals)
- slot-domain affinity (alpha=infra, etc.)
- 5 silent-degrade fixes F1-F5

PROTOCOL:
1. Read `scripts/rgs-tool-planner.mjs` head + `scripts/lib/rgs-signal-fusion.mjs` head (don't full-read; identify reader factory + fuseSignals)
2. Read `scripts/lib/rgs-pipeline-rules.mjs` (RULES array, ~14 rules from U-DOMAIN-RULES)
3. Design `U-RGS-V2-REVAMPED` unit:
   - what NEW reader factories to add (with signatures + cost)
   - what EXISTING rules to extend (per-slot weighting?)
   - what new sidecar fields in `roadmap-tool-plans.json` v1.2.0
   - what the per-unit plan SHAPE looks like once revamped (operator + cost + token-budget + slot-tools + error-fix-prior)
4. Estimate cost vs status quo: is the revamp worth it given U-RGS-RULE-BACKEND-DEV + U-RG
... [+1538 chars truncated]

### Assistant | 2026-05-17T16:51:51.745Z

I'll execute R7 — read the current RGS pipeline shape, then design the revamp.

### Assistant | 2026-05-17T16:51:52.709Z

[tool_use: Read]

### Assistant | 2026-05-17T16:51:53.261Z

[tool_use: Read]

### Assistant | 2026-05-17T16:51:53.651Z

[tool_use: Read]

### User | 2026-05-17T16:51:55.688Z

[tool_result] 1	/**
2	 * rgs-tool-planner.mjs
3	 * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
4	 *
5	 * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
6	 * heap this is fine, but if you hit GC pressure on very large runs add:
7	 *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
8	 *
9	 * CLI usage:
10	 *   node scripts/rgs-tool-planner.mjs [--
... [+4466 chars truncated]

### User | 2026-05-17T16:51:56.603Z

[tool_result] 1	/**
2	 * rgs-signal-fusion.mjs
3	 * Pure signal-fusion core for RGS tool-auto-invoke pipeline.
4	 *
5	 * export async function fuseSignals({ unit, complexity, readers }) -> ToolPlan | null
6	 *
7	 * All I/O is injected via `readers`; the only direct import is the pure rule
8	 * table from ./rgs-pipeline-rules.mjs (matchPipelines, matchAgents).
9	 *
10	 * CONTRACT: see task spec — implement every
... [+4105 chars truncated]

### User | 2026-05-17T16:51:56.841Z

[tool_result] 1	/**
2	 * rgs-pipeline-rules.mjs
3	 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
4	 * Frozen rule arrays — mutation throws in strict mode (deep-frozen via deepFreezeArray
5	 * per U-DOMAIN-RULES Arm A scrutiny P0-2; the docstring's contract now actually holds).
6	 *
7	 * Exports:
8	 *   matchPipelines(unit) -> {skill, why, confidence}[]  (alway
... [+10349 chars truncated]

### Assistant | 2026-05-17T16:52:51.296Z

I have the contract. Now finalizing R7.

## R7 — Current RGS pipeline contract

```
in:  unit { milestone, id, title, description, effort? }
out: ToolPlan {
       pipelines[]   - {skill, why, confidence}
       tribal[]      - {id, tip, score, domain}
       skills[], mcpTools[], agents[]
       buildVsIntegrate, complexityTier, confidence, source, why
     }
fusion: rules table (14 RegExp/struct-fn entries, deep-frozen, conf 0.30–0.85)
        + readers.{capabilities, skills, tribal, ollama, outcomes}
        + Beta re-rank from outcomes JSONL
        + prefDomain boost (mill/lathe/wedm/cad/cam first-match)
fallback: GENERIC_FALLBACK = [/scrutinize @ 0.30]
sidecar: state/shared/roadmap-tool-plans.json @ schemaVersion 1.0.0
```

## R7 — Missing-but-built signal sources to wire

| source | how RGS would consume | LOC delta |
|---|---|---|
| per-unit specs (`state/shared/specs/UNITS/<unit>.md`) | `readers.perUnitSpec(unit)` → returns `{acceptance, file_targets, prior_art}` — collapses uncertainty when spec exists | ~30 |
| slot-task-queues.json | `readers.slotContext(unit)` → `{owner_slot, queue_position: "head"|"long_tail"|"REVENUE", peer_slots_on_milestone[]}` — drives slot affinity weighting | ~25 |
| token-budget-telemetry | `readers.cost()` → `{p95_tokens_per_unit, budget_remaining_pct}` — gate Opus selection; force Sonnet if budget <40% | ~40 |
| ollama-pipeline-injector outcome | `readers.ollamaHealth()` → `{daemon_up, prewarmed_models[]}` — skip ollama reader entirely on cold daemon (no 30s timeout penalty) | ~15 |
| vault-unified-query | `readers.vault(unit)` → top-K hits across `memory+wiki+commands+handoffs+specs` (5 namespaces) — replaces tribal-only context | ~50 |
| error-fix-vault-bridge | `readers.priorErrors(unit)` → `{class, frequency, fix_recipe}` from `error-memory.json` keyed by file-target overlap | ~35 |
| chat-bus | `readers.peerActivity(unit)` → live collision signal; flip `defer:true` if peer is editing target files | ~25 |
| slot-domain aff
... [+5375 chars truncated]
