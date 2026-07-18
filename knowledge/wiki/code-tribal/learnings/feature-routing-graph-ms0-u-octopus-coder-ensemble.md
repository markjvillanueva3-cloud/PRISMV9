# FEATURE-ROUTING-GRAPH-MS0/U-OCTOPUS-CODER-ENSEMBLE — [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-CODER-ENSEMBLE (slot:alpha): coding-aware octopus -- coderEnsemble seats TWO distinct coders (operator 2026-06-18)

**Commit:** `16269fd2ad61` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:36:46-05:00
**Tags:** feature-routing-graph-ms0, u-octopus-coder-ensemble, auto-distilled

## Subject
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-CODER-ENSEMBLE (slot:alpha): coding-aware octopus -- coderEnsemble seats TWO distinct coders (operator 2026-06-18)

## Body
```
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-CODER-ENSEMBLE (slot:alpha): coding-aware octopus -- coderEnsemble seats TWO distinct coders (operator 2026-06-18)

Closes the localEnsembleWired:false gap surfaced by U-MODEL-PLAN-RESOLVER: the live octopus
picker ranks by size+coder-bonus, so a coding consensus seated gpt-oss:120b + ONE coder. Operator
('combine coders to cover more ground in one pass') wants TWO dedicated coders run together.

- ConsensusInput.coderEnsemble?:boolean (default false -- back-compat, normal consensus unchanged).
- exported CODER_ENSEMBLE_MODELS = [qwen2.5-coder:32b, qwen3-coder:30b] -- the two LIVE exact tags
  (resolveDiverseOllamaPanel install-gates by exact includes; bare 'deepseek-coder' omitted -- it
  would never match a real pulled tag, R12 no-dead-entry; joins when pulled w/ its exact tag).
- ask(): coderEnsemble implies diverseLocalPanel + swaps the generic synthesis panel for the coder
  panel (REUSES the existing diverse-panel machinery, R8 -- not a new picker); dualOllama suppressed
  by the !diverseLocalPanel gate so the two Ollama modes never both fire; a pinned diverseLocalModels
  still wins. Engine-direct flag (consistent with the sibling diverseLocalPanel/dualOllama flags,
  which consensus_decide also does not plumb).

+3 real-reference tests (two coders seated, gpt-oss EXCLUDED, install-gate collapse): 45/45 in
MultiModelConsensusOllamaResolve.test.ts. tsc 0 errors. Per-file 2-arm scrutiny PASS (both arms;
1 shared P2 -- JSDoc misstated CODER_ENSEMBLE_MODELS membership -- fixed in-loop).
```

## Files touched (3)
- mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts | 25 +++++++++++++++++++++++++
- mcp-server/src/engines/MultiModelConsensusEngine.ts               | 27 ++++++++++++++++++++++++---
- 2 files changed, 49 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till wins. Engine-direct flag (consistent with the sibling diverseLocalPanel/dualOllama flags,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 16269fd2ad61`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-ROUTING-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._