---
name: reference-forge-audit-token-context-2026-05-26
description: Third PRISM token-savings + context-extension audit (slot:alpha). Re-measures juliett 5/16 + lima 5/17 + juliett 5/17 baselines. 6 critical NOT-BUILT items from operator articles, 12-item punch list.
type: reference
source: prism-memory
synced: 2026-05-26
---

# Forge Audit — Token-Savings + Context-Extension PSN Coverage (2026-05-26)

**Slot:** alpha (`claude-625e0262`) · **Skill:** `/goal /loop 5m`
**Spec:** `state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md`
**Wiki:** `knowledge/wiki/architecture/forge-audit-token-context-2026-05-26.md`

## Why a third audit

10 days after the juliett 5/16 + lima 5/17 + juliett 5/17 token-savings audits.
Operator directive: "look for dormant, inefficient, underutilized or never wired
in token saving and context retention/extension nodes | track all articles I've
sent in for upgrades". This audit verifies which prior findings stayed open,
which closed, and which new gaps emerged.

## Live baseline drift vs 2026-05-17

| Surface | 5/17 | 5/26 | Direction |
|---|---|---|---|
| MEMORY.md (C:) | 24,603B | **24,421B** | improved -182B (still 99.4% ceiling) |
| CLAUDE.md (project) | 115KB | **74KB** | **improved -36%** (closed partially) |
| Ollama offload rate | 9.6% | **5%** | **regressed** (Ollama daemon dead 100% skip) |
| rtk-savings (live) | new | **53.7% hit / 467k saved** | working — biggest live surface |
| mcp-route-suggest take-rate | new (post-TSP ship) | **0.2% (5/2,160)** | TSP shipped, nudges go unactioned |
| prompt-rewriter-ollama | n/a | **100% skip (50/50)** | dead |

## Operator-sent articles tracked (3)

1. **DataChaz X post 2055929...** (paywalled, 7+ visible hacks)
2. **Anthropic costs doc** (`code.claude.com/docs/en/costs`) — 16 techniques
3. **TDS agentic-AI** — prompt-cache 90%, semantic-cache 68.8%, tool-search 55-134k

## NOT-BUILT despite article-asks (6 critical)

1. **Semantic cache for repeated prompts** (TDS 68.8% reduction claim) — never shipped
2. **Targeted-compact directive** (`/compact Focus on X`, Anthropic best-practice) — never codified
3. **Agent-team cost cap** (≤10/iter + Sonnet default for reviewers) — 887k-tok-min crisis still possible
4. **Lazy-loading SKILL.md body** (Anthropic Agent Skills progressive disclosure) — all 440 skills load eagerly
5. **Cache-breakpoint sweeper** (8 UserPromptSubmit injectors churn message cache 24×/turn) — 5/16 F1 still open
6. **CLAUDE.md ≤200 lines** (Anthropic) — 610 lines (down from 700+ but 3× over guide)

## Top punch list (12 items, ranked by leverage)

1. U-OLLAMA-DAEMON-REVIVE (P0/S)
2. U-MEMORY-MD-AUTO-PRUNE (P0/S)
3. U-CACHE-BREAKPOINT-SWEEPER (P0/M)
4. U-AGENT-TEAM-COST-CAP (P0/S)
5. U-MCP-ROUTE-TAKE-RATE-FIX (P0/M)
6. U-SEMANTIC-CACHE-FOR-PROMPTS (P1/M)
7. U-LAZY-SKILL-BODY (P1/M)
8. U-CLAUDE-MD-EXTRACT-TO-SKILLS (P1/M)
9. U-TARGETED-COMPACT-DOCTRINE (P1/S)
10. U-HOOK-ZERO-FIRE-PRUNE (P1/M, addresses 513/523 zero-fire)
11. U-PRE-TOOL-SAVINGS-CONVERT (P2/S)
12. U-RTK-ADOPTION-LEDGER-REPAIR (P2/S)

## Closed since prior audits

- CLAUDE.md compress (-41KB, golf 5/20)
- TOKEN-SAVINGS-PIVOT-MS0 19 iters (alpha 5/22) — RTK now 467k saved live
- Terminal-pin + auto-resume + precompact (this session ran across no compact-induced state loss)

## Doctrine touchpoints

- [[reference_audit_token_context_memory_2026_05_16]] — juliett baseline
- [[reference_audit_token_savings_2026_05_17]] — lima baseline
- [[reference_juliett_token_optimization_audit_2026_05_17]] — DataChaz/Anthropic/TDS article inventory
- [[reference_token_savings_pivot_2026_05_22]] — alpha's prior TSP ship
- [[reference_claude_md_compress_2026_05_20]] — partial close of P2 size finding
- [[feedback_psn_definition]] — 11-leg taxonomy this audit lands across (legs 1,3,4,6,7)
- [[feedback_reflect_all_changes_post_update]] — 4-surface coverage (this file + spec + wiki + Obsidian auto-feed)
