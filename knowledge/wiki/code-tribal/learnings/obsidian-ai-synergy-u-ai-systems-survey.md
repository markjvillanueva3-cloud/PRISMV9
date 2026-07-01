# OBSIDIAN-AI-SYNERGY/U-AI-SYSTEMS-SURVEY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AI-SYSTEMS-SURVEY (slot:india): ultracode-workflow AI-systems improvements plan + dedup correction

**Commit:** `a90f0979b1b3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:17:37-05:00
**Tags:** obsidian-ai-synergy, u-ai-systems-survey, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AI-SYSTEMS-SURVEY (slot:india): ultracode-workflow AI-systems improvements plan + dedup correction

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AI-SYSTEMS-SURVEY (slot:india): ultracode-workflow AI-systems improvements plan + dedup correction

iter-7 deliverable for the operator's expanded goal (find additional resources +
ultracode/parallel-agents/Ollama, Blackwell-aware). Ran Workflow wf_d6fc4216-b84
(8 agents, 2 survey + 5 web-research + 1 synthesis, 1.28M subagent tok) -> ranked
8 AI-systems improvements with cited 2026 best-practices (LoRA rsLoRA r=32-64 16-bit,
CAG self-route, RAG hybrid, GNN active-learning vs the label-starved #9, agentic-loop
Reflexion memory, cheap-first sensors, vLLM Sleep-Mode co-residency).

CRITICAL DEDUP CORRECTION (R8): the survey MISSED existing infra. The TOP-PICK
(BM25+dense RRF hybrid) is LARGELY ALREADY BUILT -- scripts/lib/hybrid-retrieval.mjs
(4-substrate RRF incl Qdrant dense) + utils/reciprocalRankFusion.ts + prism_ml:
rag_search_rerank. A standalone rrf-fuse.mjs was started this iter and DELETED as a
triple-dup. The ONE genuine slice = the live per-prompt tribal-rerank.mjs does not
consume the hybrid stack (high-blast-radius, fleet-wide, Qdrant/latency-gated -- a
careful fresh-context unit, NOT a constrained quick build). All other 'not done'
items need per-item live-code verification before building.

No code shipped -- the workflow's value was the research + the dedup catch that
prevented a redundant build. Spec: state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md.
```

## Files touched (2)
- state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 71 insertions(+)

## Lessons surfaced in commit body
- tils/reciprocalRankFusion.ts + prism_ml:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a90f0979b1b3`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._