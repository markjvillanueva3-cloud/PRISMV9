# AI-SYSTEMS-GNN/U-GNN-FISHER-REWEIGHT — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-FISHER-REWEIGHT (slot:india): supervised diagonal-LDA embed reweighter -- best feature scheme but does NOT clear gate

**Commit:** `848f1be89c79` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T10:22:46-05:00
**Tags:** ai-systems-gnn, u-gnn-fisher-reweight, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-FISHER-REWEIGHT (slot:india): supervised diagonal-LDA embed reweighter -- best feature scheme but does NOT clear gate

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-FISHER-REWEIGHT (slot:india): supervised diagonal-LDA embed reweighter -- best feature scheme but does NOT clear gate

The SUPERVISED lever the sharp-text rejection (9423f0f982) pointed to: per-dimension Fisher
weights w[d]=sqrt(S_B[d]/(S_W[d]+floor)) from the labeled 3206 (engine->dispatcher), reweighting
embeddings so cosine k-NN emphasizes discriminative dims WHILE per-dim scaling (vs IDF's global
spread) preserves within-class cohesion. Diagonal LDA -> NO eigensolver -> cheap, pure JS.

MEASURED (refs-only --skip-embed, self-contained single-scheme, holdoutN=200):
  nonsharp baseline: AUROC 0.7453 | Brier@gate 0.2243 | coverage 45.5%
  sharp (rejected):  AUROC 0.7031 | Brier@gate 0.2736 | coverage 37.0%
  FISHER:            AUROC 0.7505 | Brier@gate 0.2172 | coverage 45.5%

Fisher is the BEST feature scheme -- it does NOT regress (unlike sharp): AUROC +0.005, Brier
-0.007 vs baseline, confirming the hypothesis that SUPERVISED reweighting preserves intra-class
cohesion where unsupervised IDF did not. BUT the gain is marginal and it STILL fails the gate
(0.7505 < 0.78, Brier 0.217 >> 0.15, no-deployable). The diagonal constraint (per-dim scaling, no
rotation; weights were gentle, max 1.48/median 0.98) is too weak. This EXHAUSTS the cheap lever
space: 4 levers (ref-pool / vote / sharp-text / diagonal-Fisher) all measured, none clears the
gate -> full off-diagonal LDA (eigensolver) or a stronger embedding model required (bigger units).
The deployed-355 narrow-robust 2-class operating point remains the correct production posture.

NON-DESTRUCTIVE (writes only --out; deployed store untouched). Pure helpers fisherDimWeights/
applyDimWeights 5/5 tests; classCount>=2 fail-loud guard (R12). 2-of-2 per-file scrutiny PASS
(code-analyzer math arm + reviewer), 0 P0/P1, 1 P2 addressed (single-class guard).
```

## Files touched (3)
- scripts/fisher-reweight-embeddings.mjs      | 158 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fisher-reweight-embeddings.test.mjs |  48 +++++++++++++++++++++
- 2 files changed, 206 insertions(+)

## Lessons surfaced in commit body
- TILL fails the gate

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 848f1be89c79`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._