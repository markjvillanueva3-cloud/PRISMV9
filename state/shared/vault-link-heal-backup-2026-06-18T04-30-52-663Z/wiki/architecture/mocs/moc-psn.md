---
name: moc-psn
description: Map of Content for the PRISM Synergy Network — top-level hub linking the 11 PSN legs and the 6 PSN-ENHANCE-MS0 cyrilXBT-derived enhancements that densify them.
aliases: [moc-psn, PSN MOC, PSN-map, PSN-hub, synergy-MOC]
type: moc
source: PSN-ENHANCE-MS0/U-PSN-MOC-LAYER
generated_at: 2026-05-23T22:10:00Z
---

# PSN — Map of Content

Top-level hub for the **PRISM Synergy Network**. PSN ≡ Obsidian brain + PRISM OS + Wiki + Memories + Tribal Knowledge + System Viz + Engines + Algorithms + Formulas + Neural Network/GNN + PRISM AI **AND** how they all synergize. See [[feedback_psn_definition]] for the canonical 11-leg definition.

This MOC is the first concrete instance of the [[moc-layer]] pattern from cyrilXBT's 2026-05-22 X article on Obsidian linking — a hub note whose primary purpose is to surface a navigable structure on top of an already-linked flat network.

## Anchor doctrine

- [[feedback_psn_definition]] — canonical 11-leg PSN definition (the source of truth)
- [[feedback-karpathy-discipline]] — Karpathy's 5-step pre-coding checklist (R1 mechanism)
- [[feedback-r5-thru-r12-doctrine]] — agent-era R5–R12 operational rules
- [[feedback-psk-kernel]] — PSK syscall kernel (the substrate under /startup /checkin /handoff /pick)
- [[feedback_atcs]] — ATCS autonomous task completion system
- [[feedback_svi_psi]] — SVI / Ψ ranking signal
- [[feedback-golf-owns-reaper]] — golf-slot owns fleet-reaper hygiene

## 11 PSN legs

| # | Leg | Anchor note |
|---|---|---|
| 1 | Obsidian brain | [[feedback-obsidian-brain]] |
| 2 | PRISM OS | [[feedback-prism-os]] |
| 3 | Wiki | knowledge/wiki/ (Karpathy LLM-wiki) |
| 4 | Memories | knowledge/memories/ + C:/.claude/projects/H--prism/memory/ |
| 5 | Tribal Knowledge | knowledge/wiki/code-tribal/ |
| 6 | System Viz | state/shared/system-viz/system-graph.json (110K nodes) |
| 7 | Engines | mcp-server/src/engines/*.ts (~2700 wired) |
| 8 | Algorithms | mcp-server/src/algorithms/ |
| 9 | Formulas | mcp-server/src/physics/constants.ts (canonical) |
| 10 | Neural Network / GNN | nn-graph/ GraphSAGE tier-5 |
| 11 | PRISM AI | aiSystemRouterEngine + prism_ai dispatcher |

## PSN-ENHANCE-MS0 — cyrilXBT pattern enhancements (this milestone)

Sierra slot /loop 2026-05-23 closed the cyrilXBT 2026-05-22 X article ("How to Link Notes Together in Obsidian and Why It Changes Everything") gap map:

- [[reference-u-psn-unlinked-mentions-misattribution-2026-05-23]] — **unlinked mentions** scanner (397,517 candidates first run, 37K hosts)
- [[reference-u-psn-aliases-frontmatter-2026-05-23]] — **aliases:[]** frontmatter convention (7 anchor memories populated)
- `U-PSN-CONNECTION-FINDER` (2245de0258) — **TF-IDF connection-finder** ranks unlinked sibling concepts per slug
- `U-PSN-GAP-FINDER` (6da49ecc6e) — **per-MOC gap finder** classifies refs into well-covered / fragile / missing-leaf / implicit-concept
- `U-PSN-BLOCK-HEADING-LINKS` (7b45e1dac2) — **wikilink-parser** w/ heading + block-id anchor resolution
- `U-PSN-MOC-LAYER` (this file) — **MOC-generator** library + first instance (this note)

## Build a new MOC

```bash
# Programmatic via lib:
import { generateMoc } from "H:/prism/scripts/lib/moc-generator.mjs";
const file = generateMoc({ name: "moc-X", title: "X MOC", sections: [...] });

# Audit an MOC's coverage:
node H:/prism/scripts/find-moc-gaps.mjs moc-psn

# Find unlinked mentions of MOC anchor names across the vault:
node H:/prism/scripts/find-unlinked-mentions.mjs
```

## Related MOCs (future)

- `moc-fleet` (planned) — fleet-reaper + hygiene + slot system
- `moc-nn` (planned) — NN-GRAPH tier-5 + GraphSAGE + RAG
- `moc-revenue` (planned) — quote-to-ship + JM Die test shop

> Advisory: MOC entries are pointers, not definitions. Click through to the anchor notes for current state.
