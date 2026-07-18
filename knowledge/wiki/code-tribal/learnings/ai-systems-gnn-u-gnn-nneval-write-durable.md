# AI-SYSTEMS-GNN/U-GNN-NNEVAL-WRITE-DURABLE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-WRITE-DURABLE (slot:india): persist the deployed direct-embed assessment to NN-EVAL.json each retrain -- the P2 last-mile so the PSN-leg-state hook (classifyGnn reads NN-EVAL.json) auto-reflects the deployed state post-retrain (was: only a standalone eval CLI run updated it). Extracted single-sourced writeAssessment() export from the eval CLI inline write (main() refactored, behavior-preserving); lifecycle stage 4b calls it with the RAW direct-embed result, fail-soft + injectable. Tests: eval 76/76 (writeAssessment round-trip + fail-soft), lifecycle 89/89 (+ write-called-with-raw + write-failure-fail-soft). per-file 2-arm scrutiny PASS (0 P0/P1; fixed stale-comment doc-drift; logged 2 P2: bare-CLI writes checkpoint-mode to the same file -> add a mode tag / default CLI to direct-embed; non-atomic 2x writeFileSync -> tmp+rename).

**Commit:** `788fdebf01d8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T12:07:44-05:00
**Tags:** ai-systems-gnn, u-gnn-nneval-write-durable, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-WRITE-DURABLE (slot:india): persist the deployed direct-embed assessment to NN-EVAL.json each retrain -- the P2 last-mile so the PSN-leg-state hook (classifyGnn reads NN-EVAL.json) auto-reflects the deployed state post-retrain (was: only a standalone eval CLI run updated it). Extracted single-sourced writeAssessment() export from the eval CLI inline write (main() refactored, behavior-preserving); lifecycle stage 4b calls it with the RAW direct-embed result, fail-soft + injectable. Tests: eval 76/76 (writeAssessment round-trip + fail-soft), lifecycle 89/89 (+ write-called-with-raw + write-failure-fail-soft). per-file 2-arm scrutiny PASS (0 P0/P1; fixed stale-comment doc-drift; logged 2 P2: bare-CLI writes checkpoint-mode to the same file -> add a mode tag / default CLI to direct-embed; non-atomic 2x writeFileSync -> tmp+rename).

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NNEVAL-WRITE-DURABLE (slot:india): persist the deployed direct-embed assessment to NN-EVAL.json each retrain -- the P2 last-mile so the PSN-leg-state hook (classifyGnn reads NN-EVAL.json) auto-reflects the deployed state post-retrain (was: only a standalone eval CLI run updated it). Extracted single-sourced writeAssessment() export from the eval CLI inline write (main() refactored, behavior-preserving); lifecycle stage 4b calls it with the RAW direct-embed result, fail-soft + injectable. Tests: eval 76/76 (writeAssessment round-trip + fail-soft), lifecycle 89/89 (+ write-called-with-raw + write-failure-fail-soft). per-file 2-arm scrutiny PASS (0 P0/P1; fixed stale-comment doc-drift; logged 2 P2: bare-CLI writes checkpoint-mode to the same file -> add a mode tag / default CLI to direct-embed; non-atomic 2x writeFileSync -> tmp+rename).
```

## Files touched (5)
- scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs | 24 ++++++++++++++++++++++++
- scripts/lib/nn-graph-eval.mjs                         | 31 +++++++++++++++++++++----------
- scripts/lib/nn-graph-eval.test.mjs                    | 20 ++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs                | 20 +++++++++++++++-----
- 4 files changed, 80 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 788fdebf01d8`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._