---
title: System Synergy Audit — 2026-05-09
type: architecture
authors: [claude-cee63f1f, claude-85cedf09]
generated_by: /forge-audit-v2 (Phase 6F wiki ingest)
date: 2026-05-09
last_remediated: 2026-05-10
status: shipped (v1.1 post-peer-review)
related:
  - knowledge/wiki/architecture/loop-discipline.md (proposed Track J)
  - knowledge/wiki/decisions/audit-v2-doctrine.md (proposed)
sources:
  - state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md
  - state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.html
  - state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md
  - scripts/system-synergy-map.mjs
tags: [audit, synergy, boris-doctrine, forge-audit-v2, system-viz, tribal, wiki, neural, docker]
---

# System Synergy Audit — 2026-05-09 (wiki summary)

**Headline:** PRISM has world-class point assets but only **22.2% (20 / 90)** of inter-surface edges are automatic. Closing the 55 ✗ cells is the highest-leverage work right now — bigger than building any single new engine.

## Surfaces evaluated (10×10 matrix, 90 non-diagonal cells)

`system-viz`, `memories`, `wiki`, `tribal`, `neural`, `docker`, `hooks`, `skills`, `dispatchers`, `handoffs`

## Best-connected surfaces (out-rate ≥ 50%)

| Surface | ✓ out / 9 | Why |
|---|---|---|
| `hooks` | 5/9 (55.6%) | Pre/post tool, session events, stop hooks all wired |
| `dispatchers` | 5/9 (55.6%) | 97 dispatchers route to memories/wiki/tribal/neural automatically |

## Worst-connected surfaces (0 outbound auto)

| Surface | ✓ out | Note |
|---|---|---|
| `docker` | 0/9 | Not yet shipped (Track A1 = U-DOCKER-HOOK-BROKER, handoff from claude-99eca613) |
| `skills` | 0/9 | All paths from skills are manual △ — no automatic skill→{anything} fire |
| `handoffs` | 0/9 | 207 handoff files, none feed back into system state |

## Top 5 missing edges (highest leverage)

1. **tribal → wiki** auto-promote validated tips → `knowledge/wiki/code-tribal/`
2. **system-viz ⇄ tribal** — 23 tribal engines, ZERO nodes in viz
3. **neural → memory** training-set replay (lessons/ markdown emit)
4. **handoff → system-viz** L11 active-work overlay (207 handoffs invisible)
5. **chat-bus → system-viz** L12 live-agents (14 chats invisible)

(Full top-10 in source MD §3 + HTML companion with copy-to-prompt buttons.)

## What this audit produced (compounding-gains tax)

- **META artifact:** `scripts/system-synergy-map.mjs` — re-runnable, prints matrix + ratio + JSON. Future audits don't need to re-derive from scratch.
- **HTML companion:** `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.html` — Thariq pattern: SVG matrix, color-coded severity tables, copy-to-prompt buttons.
- **Re-run schedule:** CronCreate `46e7f9ac` fires `2026-05-16 09:34 local` with `/forge-audit-v2 system synergy ratio` (one-shot 7-day re-fire per Boris `/loop` pattern).
- **CLAUDE.md back-flow:** 6 regression entries written under `## Recent regressions` so future Claude sessions don't re-derive the same gaps.
- **Wiki entry:** this file.
- **Per-agent handoff:** topic-suffixed for resumability.

## Peer-review (Boris Phase 4B, worktree-isolated)

Reviewer agent `a6e3fe1862ddfbff5` (subagent_type=`reviewer`, isolation=`worktree`):
- 7/10 per-finding **PASS** with re-runnable verification channels
- Plan **BLOCK→PASS post-trim** (3 units already shipped in CAD-FUSION-LIVE-MS0/U-TRIBAL-P*T* chain)
- Macro ratio **PASS** (re-derived from script, exact match)
- Tier-stack **PASS** (acyclic)
- Surfaced 4 stronger findings + 2 fresh regressions (docker probe broken, ollama offload rate degrading)

## Linked plan: Track H — Synergy edges (NEW)

8 units to take ratio from 22.2% → ~60%:

- **H1** U-TRIBAL-TO-WIKI-PROMOTE *(verify in-flight, not build)*
- **H2** U-VIZ-TRIBAL-LAYER *(verify in-flight)*
- **H3** U-VIZ-AGENT-LAYER (L12, darkzodchi pattern)
- **H4** U-NEURAL-FEEDBACK-LOOP *(verify in-flight)*
- **H5** U-HANDOFF-VIZ-LAYER (L11)
- **H6** U-HANDOFF-PRUNE-CRON (>30d archival)
- **H7** U-MASTER-INDEX-MEMORIES
- **H8** U-STOP-HOOK-AGGREGATOR (PostStop ledger)

Plus prerequisite: **A1** U-DOCKER-HOOK-BROKER (kills xmalloc OOMs from 423 inline hooks).

## Doctrine alignment

Audit was produced under the [Boris Loop + Agent Doctrine](../decisions/boris-doctrine.md) and satisfied all 7 hard rules of `/forge-audit-v2`:
1. Verification channel declared per finding ✓
2. Peer-reviewer agent dispatched with `isolation: worktree` ✓
3. META artifact emitted (compounding-gains tax) ✓
4. HTML + Markdown both emitted (Thariq pattern) ✓
5. Regressions flowed to CLAUDE.md ✓
6. `/loop` re-run registered (CronCreate one-shot 2026-05-16) ✓
7. Per-agent handoff written ✓

## Cross-references

- `knowledge/wiki/decisions/` — propose `audit-v2-doctrine.md` documenting the 7-rule discipline
- `knowledge/wiki/code-tribal/` — destination for H1 auto-promotion (currently empty except `canonical/`)
- `state/shared/CURRENT_POSITION.md` — should reference Track H as next milestone

## Related
- [[reference_build_state_surface]]
- [[reference_system_viz]]
