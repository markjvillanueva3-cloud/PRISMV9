---
name: psn-definition
description: The PRISM Synergy Network — canonical 11-leg taxonomy. Every PSN-aware tool/hook/skill refers here for the leg list. Fixes the broken pointer referenced in MEMORY.md since at least 2026-05-19.
aliases: feedback_psn_definition
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.440Z
---


# PSN — PRISM Synergy Network (canonical 11 legs)

> **What it is:** PRISM is not a single repo; it's a synergized network of 11 interlocking knowledge / compute / orchestration substrates. Each leg has its own home, its own write-path, its own consumers, and its own health signal. A PSN-aware tool consults the right leg for the right question instead of re-deriving from raw files.

## The 11 legs

| # | Leg | Canonical surface | Invocation | Health signal |
|---|---|---|---|---|
| 1 | **Obsidian brain** | `C:/Users/wompu/.claude/projects/H--prism/memory/*.md` + Obsidian vault mirror `H:/prism/knowledge/memories/<type>/` | direct read; auto-fed every Stop by `stop-obsidian-memory-feed.mjs` | file count + most-recent mtime |
| 2 | **PRISM OS** | `prism_operating_system` MCP dispatcher (~45 actions) | `prism_operating_system({action,...})` | dispatcher reachable + action count |
| 3 | **Wiki** | `H:/prism/knowledge/wiki/` (Karpathy LLM-wiki) | `/wiki-query <name>` or `prism_session:master_index_query` | entry count + link-audit broken-ratio |
| 4 | **Memories** | `feedback_*` / `reference_*` / `project_*` / `user_*` / `mistakes_*` / `inbox_*` under leg #1 | memory-relevance-inject auto-injects on prompt | index MEMORY.md freshness |
| 5 | **Tribal knowledge** | `H:/prism/knowledge/tribal/` + [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] hook | inject hook auto-fires by slot domain | tribal-density per domain |
| 6 | **System Viz** | `H:/prism/state/shared/system-viz/system-graph.json` + 21 ghost-roost overlays | `/system-viz` + `prism_session:master_index_query` | node count + regen freshness |
| 7 | **Engines** | `H:/prism/mcp-server/src/engines/*.ts` (~2763 built · ~593 unwired) | dispatcher actions (see /system-viz §PSN-11-legs leg 7) | wired/unwired ratio + dispatcher coverage |
| 8 | **Algorithms** | `H:/prism/mcp-server/src/algorithms/*.ts` + cross-disciplinary deep-learning engine | invoked by engines; rendered as L5 algorithm nodes in /system-viz | algo coverage per domain |
| 9 | **Formulas** | `H:/prism/mcp-server/src/physics/constants.ts` (canonical numeric source) + L10 formula nodes | NEVER inline — always import from constants.ts | constant-inlining audit (must = 0) |
| 10 | **NN/GNN** | `graphsage-predictor.mjs` tier-5 + `state/shared/nn-graph/NN-EVAL.json` + 768-d embedding bridge | runs over `system-graph.json`; output classifies UNKNOWN ghost.unwired-engine nodes | AUROC vs 0.78 deploy gate · Brier ≤ 0.15 |
| 11 | **PRISM AI hierarchy** | L3 AI hierarchy nodes + `prism_ai` MCP dispatcher | `prism_ai:reason` / `prism_intelligence:ai_feature_discover` | router decision rate · Ollama offload % |

## Doctrine

- **Search the right leg first.** Before Grep/Glob/Agent: ask "which PSN leg owns this question?" → query that leg. Skipping this is the #1 token-waste pattern (see [[feedback_system_viz_first_audit]]).
- **Legs are wired**, not isolated. Engines (#7) call algorithms (#8) which import formulas (#9). Wiki (#3) cross-references memories (#4) which inform tribal (#5). System Viz (#6) is the render substrate; PRISM AI (#11) routes the call.
- **The 11-leg taxonomy is fleet-stable.** Adding a 12th leg is a CLAUDE.md change (rare). Adding a roost to /system-viz (currently 21 overlays) does NOT change the leg count — it sharpens leg #6's surface.

## Why this file exists

MEMORY.md pointed at `feedback_psn_definition.md` (this file) as canonical from at least 2026-05-19 onward, but the file was missing — a broken pointer that surfaced when the operator asked "did you update PSN" on 2026-05-24 and no canonical leg list existed to reference. Created during the U-PSN-SYNERGY iteration of `/goal [improve the system further, extract all high roi features | clear goal: complete all tasks, wired and synergized to PSN]`.

## Linked

- [[feedback_system_viz_first_audit]] — query the substrate before re-deriving
- [[feedback_high_roi_backend_first_slot_queue]] — PSN-leg work ranks high on the slot-task queue
- [[feedback_commit_to_slot_worktree]] — keep commit attribution clean while iterating on PSN legs
- `/system-viz` skill §PSN-11-legs — same table from the system-viz angle (the render layer)
- CLAUDE.md §MASTER INDEX + [[reference_awareness_stack|AWARENESS STACK]] (PSN leg #6 wired into the awareness pipeline)
- CLAUDE.md §AI SYSTEM ROUTING (PSN leg #11 routing rules)
