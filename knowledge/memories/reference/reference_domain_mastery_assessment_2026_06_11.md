---
name: domain-mastery-assessment-2026-06-11
description: "Fleet-wide 26/34-domain mastery assessment (graph/vault coverage, maturity, obsolete-vs-enhance units, top-ROI, PhD-knowledge gaps) via ultracode Workflow wf_9c28241d-daa. Synthesis+8 miners rate-limited; 26 blocks salvaged from transcripts + synthesized main-thread. Artifact: state/shared/specs/DOMAIN-MASTERY-ASSESSMENT-2026-06-11.md."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.556Z
aliases: reference_domain_mastery_assessment_2026_06_11
---


**Domain-mastery assessment (slot:zulu, 2026-06-11).** Operator /goal: assess where every galaxy domain stands -- node/file/folder coverage in graph+vault, current status, obsolete-vs-enhance units, high-ROI priorities, and whether each domain has PhD-multidisciplinary mastery. Ran as ultracode Workflow `wf_9c28241d-daa` (34 sonnet miners + 1 synthesis). Artifact: **`state/shared/specs/DOMAIN-MASTERY-ASSESSMENT-2026-06-11.md`** (93KB).

## Result (26/34 -- rate-limited)
Synthesis agent + 8 miners (fleet-hygiene, mit-curriculum, quality, system-viz, token-optimization, tribal-knowledge, **wedm**, wiring) hit the account **session limit** (reset 7:50pm CT). 26 blocks completed (3.78M subagent tokens).

## Key findings (26 assessed)
- **Bimodal maturity:** 7 strong (>=70): hermes-zulu 82, quoting 74, speed-feed 74, ai-training 72, mill 72, discovery 72, lathe 71. 10 journeyman (50-69). 9 apprentice (<50): dormant-data 28, pdf-corpus-mill 28, shop-floor 38, frontend-app 38, bug-hunting 41, +4. **No domain at full PhD mastery (85+).** Mean ~57.
- **#1 fleet ROI = DATA not code:** GNN full-coverage is DATA-blocked (macro-F1 0.439<0.55); fastest lift = OutcomeFeedbackBus emission across the 19 non-publishing consumer galaxies (india-owned). Compounds fleet-wide.
- **2 R12 safety-truth gaps:** speed-feed `tryBusCapture()` hardwired `return true` (SFC actuals never land); compliance-safety S(x) <0.70 hard-block has no E2E round-trip test vs live JM G-code.
- **1 stub bottlenecks 4 galaxies:** cad `CADFeatureRecognitionEngine` (cad->cam->quoting->india gateway).
- **Cross-cutting branch-drift:** 4 galaxies hold canonical work in unmerged slot worktrees (lathe/whiskey, post-processor/echo 12 commits, academy/lima courses 35-60, cad-fusion-live partial) -- corrupts coverage counts + blocks wiring.
- **~10 domains absent from ROADMAP-CONSOLIDATED** (untracked pending work); `business` ~261 flat engines missing from graph; 3 domains doctrine-complete but execution-ZERO (dormant-data, bug-hunting, shop-floor).

## Reusable lesson -- salvaging a rate-limited Workflow (R12, do-not-strand)
When a Workflow partial-completes (synthesis agent dies on a session limit), the completed agents' returns are NOT in the tool result if the script dropped them -- but they ARE on disk in the per-agent transcripts: `<project>/subagents/workflows/<runId>/agent-*.jsonl`. Extract each agent's final block with a deterministic node script (NOT model-gated, costs ~0): for each `.jsonl`, take the last assistant `message.content` text that is NOT `isApiErrorMessage`/`error` and matches your block signature (here `/MASTERY-SCORE/`). Then synthesize in the MAIN thread (your tokens, no new subagents -- avoids re-hitting the subagent limit). This preserved 3.78M tokens of work that would otherwise have been re-run after the 7:50pm reset.
- **Workflow-script tip:** RETURN the blocks array (`return {assessedCount, blocks, ...}`) so a partial result is recoverable from the tool result directly -- I dropped it, forcing the transcript-salvage. Next time include it.
- Resume the missing 8 post-reset: `Workflow({scriptPath:".../domain-mastery-assessment-wf_9c28241d-daa.js", resumeFromRunId:"wf_9c28241d-daa"})` -- 26 cached return instantly, only 8+synthesis re-run.

Related: [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (bound concurrency + prefer local lane), [[reference_ai_systems_6unit_complete_2026_06_11]], [[feedback_ollama_fallback_sonnet_agents]] (miners=sonnet).
