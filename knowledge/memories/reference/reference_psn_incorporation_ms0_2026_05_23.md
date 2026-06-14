---
name: reference_psn_incorporation_ms0_2026_05_23
description: PSN-INCORPORATION-MS0 envelope — 105 candidate systems from R1+R2+R3 audit specs registered as fleet-pickable roadmap units. Charlie /goal-6 ship; commit 4606d6066a. R3 TOP-1 verified already-implemented (extended-thinking wired at apiWrapper.ts:152).
aliases: reference_psn_incorporation_ms0_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.894Z
---


# PSN-INCORPORATION-MS0 — 105 candidate systems registered (charlie /goal-6, 2026-05-23)

## What shipped

Commit `4606d6066a` — `mcp-server/data/milestones/PSN-INCORPORATION-MS0.json` envelope.

105 units across 9 phases registering every R1+R2+R3 candidate system as a fleet-pickable pending unit. Each unit carries: `id`, `title`, `status:pending`, `cost` (S/M/L), `legs` (which PSN legs touched), `source` round (R1/R2/R3), `note` (one-line rationale).

| Phase | Source | Count | Category |
|---|---|---:|---|
| P1 R1-RETRIEVAL | R1 | 5 | GraphRAG, RAGAS, HyDE, ColBERT, RAG-Fusion |
| P2 R1-MEMORY | R1 | 4 | Letta, LangGraph, Mem0, EpiMem |
| P3 R1-GRAPH | R1 | 4 | Neo4j+GDS, PyG, GAT, TigerGraph |
| P4 R1-NEURAL | R1 | 5 | S-LoRA, LoRA-Hub, DSPy, Magentic-One, AutoGen |
| P5 R1-COORD | R1 | 3 | CrewAI, OpenAI Swarm, A2A |
| P6 R1-EVAL | R1 | 3 | Inspect AI, LangSmith/Langfuse, Helicone |
| P7 R2-NEW | R2 | 53 | reasoning, tool-use, code-agent, mfg-AI, distill, workflow, vec-DB, obs, safety, cache, multi-modal, state-sync |
| P8 R3-LEARNING | R3 | 29 | preference-opt, self-training, PEFT, active, continual, prompt-opt |
| P9 R3-REASONING | R3 | 24 | search-based, trajectory patterns, PoT/PAL/Lean/Z3, multi-agent, verification, domain-models |

After commit: MILESTONE_PROGRESS regen (5487→5506 units), BUILD_STATE regen (BUILT=2763, NEEDS_BUILDING=2876).

## R3 TOP-10 #1 verified already-implemented (R12 fail-loud finding)

R3 spec said "enable Claude extended-thinking flag (1 hour, free win)". Charlie verified during /goal-6: the flag is ALREADY wired in PRISM at:
- `mcp-server/src/config/apiWrapper.ts:152` — `const thinkingBudget = getThinkingBudget(effort);`
- `mcp-server/src/config/apiWrapper.ts:232` — `getThinkingBudget(effort: EffortLevel): number` per-tier mapping
- Auto-fires when `effort='high'|'max'` via `createParams.thinking = { type: 'enabled', budget_tokens: thinkingBudget }` + temperature=1

The actual residual gap is: which engines should USE high/max effort tier? That's a per-engine policy question, not infra. Mark R3 TOP-10 #1 as: "infra DONE; per-engine effort-tier audit IS the actual unit."

This is the kind of finding R12 fail-loud catches — research specs make claims that don't survive code inspection. Update the spec to reflect.

## Charlie's wire-adjacent units in this envelope (slot soul priority list)

Per [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]] (charlie=wire), the WEDM/spark/recast-relevant units charlie picks first:
- **U-PSN-R2-MFG-01** — NVIDIA Modulus PINN for WEDMThermalFieldEngine (L-cost, 100-1000× inference)
- **U-PSN-R2-MFG-04** — GraphCast-pattern CFD surrogate for WEDM flushing (L-cost)
- **U-PSN-R2-REAS-03** — Self-Consistency on `wedm_safety_gate_evaluate` (S-cost)
- **U-PSN-R2-REAS-04** — Chain-of-Verification inside safety gates (S-cost; R3 TOP-10)
- **U-PSN-R3-SELF-01** — STaR bootstrap on WEDM reasoning traces (M-cost; R3 TOP-10)
- **U-PSN-R3-PEFT-05** — MoLE expert per slot domain → charlie owns the wire expert (M-cost)

## How peers pick from here

Per `priority-queue.mjs --slot <name>`:
- delta picks CAD multi-modal (U-PSN-R2-MM-*)
- echo picks CAM-agent units (U-PSN-R2-CODE-*)
- foxtrot picks knowledge/tribal units (U-PSN-R3-SELF-07, U-PSN-R2-VEC-04)
- juliett picks speed-feed-relevant active-learning (U-PSN-R3-ACT-*)
- kilo picks print-to-program OCR (U-PSN-R2-MFG-05, U-PSN-R2-MM-04)
- india picks post-processor + master-post (U-PSN-R2-TOOL-04 Outlines fits)
- lima picks academy-mobile (U-PSN-R2-CODE-04 Continue.dev)
- hotel picks ERP + workflow (U-PSN-R2-WF-*)
- november/oscar...zulu — unallocated; pick by master-index domain match

## Cross-refs

- [PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md](spec R1, 7636dc07bd) — original 25-system inventory
- [PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md](spec R2, ffa7789cd8) — 50+ new systems across 13 categories
- [PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md](spec R3, 340385c95d) — 50+ learning + reasoning systems
- [[feedback_psn_definition]] — 11-leg PSN canonical map
- [[reference_psn_high_roi_audit_2026_05_23]] — R1 memory pointer
