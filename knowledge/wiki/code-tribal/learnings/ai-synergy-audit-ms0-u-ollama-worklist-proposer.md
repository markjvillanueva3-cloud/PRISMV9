# AI-SYNERGY-AUDIT-MS0/U-OLLAMA-WORKLIST-PROPOSER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-OLLAMA-WORKLIST-PROPOSER (slot:india): Ollama second-opinion labels for the GNN active-learning worklist

**Commit:** `9371ce90e97e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T14:13:48-05:00
**Tags:** ai-synergy-audit-ms0, u-ollama-worklist-proposer, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-OLLAMA-WORKLIST-PROPOSER (slot:india): Ollama second-opinion labels for the GNN active-learning worklist

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-OLLAMA-WORKLIST-PROPOSER (slot:india): Ollama second-opinion labels for the GNN active-learning worklist

The #1 lever to lift tier-5 GNN macro-F1 (0.439, LABEL-STARVED) is growing the
reference pool with operator labels. The selector ranks WHICH ghosts to label; this
adds an INDEPENDENT local-LLM second opinion per ghost so the operator confirms
AGREEments instantly + triages CONFLICTs first -- accelerating ref-pool growth
WITHOUT a GPU, honoring the operator 'use Ollama' directive.

WIRE->TEST->VALIDATE->APPLY:
- scripts/lib/worklist-label-proposer.mjs: pure core. Uses verifiedOffload+enumMember
  so a local model can ONLY return a VALID dispatcher (hallucinated/off-list -> null).
  FIRST real india consumer of the verifiedOffload keystone (audit flagged it
  built-but-never-called).
- scripts/propose-worklist-labels.mjs: CLI. Reads active-label-worklist.json, pulls
  each ghost's engine file-head for real context, classifies via qwen2.5-coder:32b,
  writes active-label-worklist-proposed.{json,md} (CONFLICTs first).
- scripts/ai-training-awareness.mjs: WIRE -- surfaces proposer + live agree/conflict
  stats every india session (auto-injected by india-awareness-inject).
- TEST 16/16 (happy + 3 failure + 2 adversarial: off-list->null, case-snap,
  run-throw, empty/non-string, no-GNN-pred->agree null).
- VALIDATE (live 31 ghosts): all 31 returned VALID dispatchers (anti-hallucination
  proven at scale); 0/31 agree / 31 conflict QUANTIFIES the GNN class-collapse
  (predicts prism_cam for EVERY ghost @~0.27 conf) -- Ollama source-aware proposals
  (GrooveClassificationEngine->prism_turning, PreMOUKickoffChecklistEngine->
  prism_business) are the better label seeds.
- APPLY: domain-specific (india GNN worklist); pattern reusable.

Knobs: PRISM_PROPOSER_MODEL, PRISM_PROPOSER_TIMEOUT_MS.
```

## Files touched (7)
- scripts/ai-training-awareness.mjs                         |  10 ++
- scripts/lib/worklist-label-proposer.mjs                   | 160 +++++++++++++++++++++++++
- scripts/lib/worklist-label-proposer.test.mjs              | 123 +++++++++++++++++++
- scripts/propose-worklist-labels.mjs                       | 101 ++++++++++++++++
- state/shared/nn-graph/active-label-worklist-proposed.json | 460 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/nn-graph/active-label-worklist-proposed.md   |  44 +++++++
- 6 files changed, 898 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9371ce90e97e`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._