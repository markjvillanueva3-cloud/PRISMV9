---
title: AI-systems fleet state (synergy)
aliases: [ai-systems-fleet-state, ai-state-synergy, nn-gnn-lora-rag-fleet-state]
tags: [architecture, ai-systems, nn, gnn, lora, rag, cag, octopus, synergy, awareness, all-galaxies]
created: 2026-06-11
slot: zulu
---

# AI-systems fleet state (synergy)

The canonical **wiki** surface for PRISM's AI-systems-state synergy, referenced from every galaxy's `MEMORY.md`, `CLAUDE.md`, and slot `souls.md` (wired by `scripts/wire-ai-systems-state-to-galaxies.mjs`).

## What it is

The live state of PRISM's AI systems -- **GNN** (GraphSAGE tier-5 selective-deploy), **octopus** (multi-model consensus / deep-reasoning), **RAG/CAG** (hybrid retrieval + Ollama offload), and **AI-synergy** -- is persisted as a recall-discoverable Obsidian vault note `knowledge/memories/patterns/ai-systems-fleet-state.md` by `scripts/ai-systems-fleet-state.mjs` (U-AIS01). Because `patterns/` is a default recall namespace read by the `galaxy-reasoning-bridge`, **every galaxy's awareness / CAG / RAG carries the live AI-systems state** -- one general asset serving all 34 galaxies (R15 general-asset path), not 34 copies.

## Synergy wiring (all four document surfaces, all galaxies)

`scripts/wire-ai-systems-state-to-galaxies.mjs` (U-AIS02) idempotently upserts a marked `AI-SYSTEMS-STATE` pointer block into:

| Surface | Files | What |
|---------|-------|------|
| memories | 34 galaxy `MEMORY.md` | the knowledge brain each galaxy reads at context-regain |
| claude.md | 34 galaxy `CLAUDE.md` sentinels | the per-galaxy doctrine surface |
| souls.md | 28 slot souls | the persona surface (block appended after the YAML frontmatter -- never touched) |
| wiki | this entry | the canonical fleet wiki surface all the above point to |

Re-runnable, idempotent (re-run wires 0). Regenerate the state note: `node scripts/ai-systems-fleet-state.mjs`. Re-wire the pointers: `node scripts/wire-ai-systems-state-to-galaxies.mjs`.

## Live findings (the real AI-synergy levers)

- **Octopus consensus reaches only 1 domain** (hermes-zulu) -> consensus-of cross-substrate edges are sparse fleet-wide. Running octopus per galaxy grows the cross-galaxy deep-reasoning edge set (the genuine next lever).
- **Ollama offload ~9%** (target >=30%) -> mechanical work under-routed to the local lane.
- **GNN AUROC 0.808**, selective-deploy at the production gate; full-coverage lift is structural (H2GCN + ref-pool, **india GPU lane**), not calibration.

Related: [[reference_ai_systems_fleet_state_2026_06_11]] - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[cross-substrate-synergy-ms0]] - [[zulu-ledger-reconciler]].
