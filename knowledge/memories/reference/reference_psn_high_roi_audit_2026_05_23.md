---
name: reference_psn_high_roi_audit_2026_05_23
description: PSN-HIGH-ROI-SURFACE-AUDIT — 11-leg surface inventory + external-systems research mapping 25+ candidate systems (Letta/GraphRAG/HyDE/RAGAS/Neo4j+GDS/PyG/S-LoRA/DSPy/CrewAI/Inspect AI/Langfuse). Top-5 highest-leverage gaps queued for RGS.
aliases: reference_psn_high_roi_audit_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.891Z
---


# PSN-HIGH-ROI-SURFACE-AUDIT (charlie /goal-3, 2026-05-23, commit 7636dc07bd)

## What was shipped

Single spec doc `state/shared/specs/PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md` — 6 sections, 208 LOC, answers /goal-3 directive "scope high-ROI MCP/CLI/API usages within the PRISM system PSN | do deep research on systems that can improve PSN".

## §1 finding — per-leg surface ROI

| Leg | ★★★★★ surfaces |
|---|---|
| Wiki | `wiki-precheck-inject`, `master-index-query` |
| Memories | `memory-relevance-inject` |
| System Viz | 4 PreToolUse graph hooks + `master-index-precheck-inject` |
| PRISM AI | `aiSystemRouterEngine.route()` (but underused as upstream of octopus) |

## §2 finding — cross-leg compounding surfaces

3 LIVE: `master-index-precheck-inject` (legs 3,4,5,6,7,11), `audit-close-out-candidates` v1.2.0 (legs 3,4,6,7 — charlie /goal-2 ship), per-task subagent pre-search (legs 3,4,5,6,7).

5 PROPOSED: `psn_query_all_legs`, `promote_to_wiki` orchestrator, `engine.tribal:relevant?` back-call, `aiSystemRouterEngine` upstream of octopus, runtime tribal hint injection.

## §3 finding — external-system map (25+ systems, 6 categories)

Top external integration targets ranked by (cost × cross-leg impact):
- **HyDE** (small cost, +10-20% recall on memory + wiki injectors) — drop-in
- **RAGAS** (small cost, closes the measurement gap on auto-injectors)
- **GraphRAG** (medium cost, auto-clusters 28K wiki entries)
- **Neo4j + GDS** (medium cost, unlocks PageRank/community/shortest-path for system-graph)
- **Letta** + **LangGraph store** + **Mem0** (medium cost each, replace hand-rolled handoff machinery)
- **DSPy** (medium cost, optimize octopus consensus prompts)
- **PyG + GAT** (medium cost, beats GraphSAGE on heterogeneous PRISM graph; NN-GRAPH currently DORMANT)

Deferred (L-cost): S-LoRA serving, TigerGraph CoPilot, full CrewAI/AutoGen migration, ColBERT v2.

## §4 finding — top-5 RGS-ready gap queue

1. `prism_operating_system:psn_query_all_legs` — single MCP fan-out across 11 legs
2. HyDE wrap on `memory-relevance-inject` + `wiki-precheck-inject` — A/B-able
3. RAGAS eval harness for the 5+ auto-injectors — turn ★★★★★ assertions into numbers
4. `aiSystemRouterEngine.route()` upstream of octopus (per `feedback_psn_definition` lines 56-57)
5. GraphRAG community-detection over wiki + system-graph — auto-curate replacement for `wiki-morning`

## How to apply

- For RGS unit generation: §4 items are pre-shaped roadmap candidates. Inject into `atomic-roadmap.json` as `PSN-HIGH-ROI-MS0` envelope (5 phases).
- For chat-routing: §2's 8 cross-leg surfaces should be verified firing on every PSN-touching task.
- For docs: triage into `knowledge/wiki/architecture/psn-high-roi-surface-audit.md` (pending — peer-claim risk on wiki dir).

## Cross-refs

- [[feedback_psn_definition]] — canonical 11-leg PSN map (anchor for §1)
- [[reference_graph_octopus_autowire_ms0_2026_05_22]] — leg 6 hooks already shipped
- [[reference_octopus_consensus_ms1_2026_05_18]] — baseline being enhanced per §4 item 4
- [[partial-milestone-drift]] — sibling audit (charlie /goal-2)
- spec: `state/shared/specs/PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md` (full detail)
