# PSN-HIGH-ROI-AUDIT-MS0/U-AUDIT-SPEC — [MAIN] [PSN-HIGH-ROI-AUDIT-MS0]/U-AUDIT-SPEC (slot:charlie /goal-3 iter1): scope + external-systems research spec

**Commit:** `7636dc07bdf0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T19:57:38-05:00
**Tags:** psn-high-roi-audit-ms0, u-audit-spec, auto-distilled

## Subject
[MAIN] [PSN-HIGH-ROI-AUDIT-MS0]/U-AUDIT-SPEC (slot:charlie /goal-3 iter1): scope + external-systems research spec

## Body
```
[MAIN] [PSN-HIGH-ROI-AUDIT-MS0]/U-AUDIT-SPEC (slot:charlie /goal-3 iter1): scope + external-systems research spec

Single-doc deliverable for /goal-3 'scope high-ROI MCP/CLI/API usages in PSN | deep research on systems that can improve PSN'.

§1 — Per-leg surface inventory across 11 PSN legs (MCP + CLI + REST + injector). ROI ranked ★ to ★★★★★ per leg.
§2 — 8 cross-leg compounding surfaces (3 live + 5 proposed). master-index-precheck + audit-close-out-candidates already ★★★★★.
§3 — External-systems research map by leg + integration cost:
  - Memory: Letta, LangGraph store, Mem0, EpiMem
  - Retrieval: GraphRAG, RAGAS, HyDE, ColBERT v2, RAG-Fusion
  - Graph: Neo4j+GDS, PyG, GAT, TigerGraph CoPilot
  - Neural: S-LoRA, LoRA-Hub, DSPy, Magentic-One, AutoGen v0.4
  - Coordination: CrewAI, OpenAI Swarm, A2A protocol
  - Eval: Inspect AI, LangSmith/Langfuse, Helicone
§4 — Top-5 highest-leverage gaps (recommendation queue, RGS-ready):
  1. prism_operating_system:psn_query_all_legs (single fan-out)
  2. HyDE wrap on memory + wiki injectors (+10-20% recall)
  3. RAGAS eval harness for 5+ auto-injectors (turn ★ assertions into numbers)
  4. aiSystemRouterEngine.route() upstream of octopus consensus (per feedback_psn_definition L56-57)
  5. GraphRAG community-detection over 28K wiki + 110K graph
§5 — Deferrals (S-LoRA, TigerGraph, full CrewAI migration, ColBERT v2) with rationale
§6 — Consumption guidance for RGS / chat-routing / docs

Cross-refs: feedback_psn_definition, reference_graph_octopus_autowire_ms0_2026_05_22, partial-milestone-drift (sibling charlie /goal-2 deliverable).

Karpathy R5 (model-for-judgment): research synthesis is Claude work; ROI tables are quantifiable.
R12 (fail-loud): §5 names deferred items + reasons rather than silently pruning.
```

## Files touched (2)
- .../specs/PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md | 208 +++++++++++++++++++++
- 1 file changed, 208 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7636dc07bdf0`
- Milestone envelope: `mcp-server/data/milestones/PSN-HIGH-ROI-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._