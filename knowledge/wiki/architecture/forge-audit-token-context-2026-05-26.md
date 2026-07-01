---
title: Forge Audit — Token-Savings + Context-Extension PSN Coverage (2026-05-26)
type: architecture
authored: 2026-05-26
authored_by: claude-625e0262 (slot:alpha)
status: live
spec_file: state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md
memory_file: knowledge/memories/reference/reference_forge_audit_token_context_2026_05_26.md
tags: [audit, token-savings, context-extension, psn, system-viz, dormant, underutilized]
related:
  - reference_audit_token_context_memory_2026_05_16
  - reference_audit_token_savings_2026_05_17
  - reference_juliett_token_optimization_audit_2026_05_17
  - reference_token_savings_pivot_2026_05_22
  - feedback_psn_definition
---

# Forge Audit — Token-Savings + Context-Extension PSN Coverage (2026-05-26)

Third token-savings audit. The juliett 5/16 + lima 5/17 + juliett 5/17 audits enumerated
~12 P0/P1 findings; this audit re-measures 10 days later and cross-references against the
3 operator-sent articles (DataChaz X, Anthropic costs doc, TDS agentic-AI).

Full spec: `state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md`.

## Headline finding

**Ollama daemon is dead.** `/api/chat` returns 100% timeouts (50/50 skipped). The
biggest projected token-saving surface (5/17 lima audit said: "LARGEST single
token-saving surface PRISM ships") delivers zero. The fleet has degraded from
9.6% offload (5/17) to ~5% (live token-zone inject).

**RTK is the only live high-volume savings surface.** 53.7% hit-rate, 467k tokens
saved across 4,965 ledger entries — does the work of the dead Ollama path.

## Closed since prior audits

- CLAUDE.md size: 115KB → 73KB (-36%) per golf 5/20 compress
- TOKEN-SAVINGS-PIVOT-MS0 shipped 19 iters of MCP route-suggest infrastructure (alpha 5/22)
- Terminal-pin + auto-resume + precompact handoff (this audit session itself ran zero compact-induced state loss)

## Still open (P0 from prior audits)

| Finding | First flagged | Status 5/26 |
|---|---|---|
| MEMORY.md truncation | 5/16, 5/17 | 24,421B / 24,576B — 99.4% ceiling, 1 entry away from truncation |
| Ollama offload rate | 5/16, 5/17 | regressed 9.6% → 5% (daemon dead) |
| Cache-breakpoint churn (8 per-turn injectors) | 5/16 F1 | unchanged |
| Subagent model defaults to Opus | 5/16 F4 | unchanged |
| 513 of 523 hooks zero-fire | 5/17 | unchanged |
| Skill stage-2 body eager-loaded | 5/16 F3 | unchanged |

## Never built (operator-article-asks)

1. **Semantic cache** (TDS article — 68.8% API-call reduction)
2. **Targeted-compact directive** (Anthropic — `/compact Focus on X`)
3. **Agent-team cost cap** (Anthropic — agent-teams ~7×, observed 887k-tok/min crash)
4. **Lazy-load SKILL.md body** (Anthropic Agent Skills progressive disclosure)
5. **Cache-breakpoint sweeper** (Anthropic prompt-caching docs — strict prefix hierarchy)
6. **CLAUDE.md ≤200 lines** (Anthropic costs doc) — currently 610 lines

## Punch list (12 items)

See spec §Phase 5 for full table. P0 cluster: 5 items (Ollama revive, MEMORY auto-prune,
cache-breakpoint sweeper, agent-team cap, MCP-route take-rate fix).

## PSN synergy

This audit lands across 6 of 11 PSN legs:

| Leg | Artifact |
|---|---|
| #1 Obsidian brain | `reference_forge_audit_token_context_2026_05_26` (auto-fed on Stop) |
| #3 Wiki | this entry |
| #4 Memories | sibling memory file |
| #6 System Viz | `ghost.forge_audit_token_context_2026_05_26` roost (Phase 5 follow-up) |
| #7 Engines | 5 NOT-BUILT engines proposed |
| #11 PRISM AI | Memo coverage gap (42.9%) tracked separately |

## How to re-run

```bash
node H:/prism/scripts/token-savings-rank.mjs --json
node H:/prism/scripts/ollama-offload-dashboard.mjs --json
node H:/prism/scripts/system-synergy-map.mjs --json
node H:/prism/scripts/audit-hook-stack-cost.mjs --json
```
