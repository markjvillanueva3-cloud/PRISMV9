---
session: claude-b84af9c3
topic: india-ai-systems
slot: india
written_at: 2026-06-23T19:00:13.390Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-b84af9c3
status: active
---

# HANDOFF: claude-b84af9c3
Updated: 2026-06-23T19:00:13.390Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-b84af9c3

## STATE
No state provided.

## RESUME
A2 SHIPPED + COMPLETE (commit 0ca453bddf, 3-of-3 PASS). VERIFIED 2026-06-23: the 5-seed variance A/B was ALREADY stratified-default (nn-graph-eval.mjs:479-513 stratify defaults true; holdout-variance never overrides) => the A2 result IS the production stratified grade, multi-seed (MORE robust than NN-EVAL.json single 62-split). So NO redundant 'stratified eval' is needed next window. FINDING stands: stronger embedding is a confirmed monotonic lever (nomic 0.783/0.308 -> mxbai@1024 0.835/0.381 AUROC/macroF1, selective 4/5 vs 3/5) but does NOT clear full-coverage gate (0/5; macroF1 0.38<0.55). Candidates preserved state/shared/nn-graph/.a2-scratch/ (mxbai768 + mxbai1024 + var-*.json). REMAINING india options (BOTH operator-gated / not safe to auto-start): (1) BIG ARC -- full 346k re-embed @1024 (cheap ~5-13min) + 768->1024 dim migration across embedder/trainer/predictor/eval (~40-file '768' blast radius) + trained GraphSAGE checkpoint on mxbai@1024 features = the real full-coverage attempt; (2) ADOPT mxbai ghosts for the SELECTIVE tier only -- a PRODUCTION classifier mutation (overwrite the git-ignored deployed ghost-node-embeddings.jsonl + backup .bak + regen NN-EVAL) -- NOT authorized autonomously since A2 criterion was 'adopt only if THE (full) gate clears' which it did not; needs operator OK. Infra (embed-nodes-gpu.py + --emit-texts + quantize-vecs join) is reusable for either path + executes deferred U-RAG-6. 5h-wall was ~34min out earlier (operator-gated recovery, I cannot arm). NEXT WINDOW: operator picks arc(1) or adopt(2), or redirect india.

## CONTEXT

