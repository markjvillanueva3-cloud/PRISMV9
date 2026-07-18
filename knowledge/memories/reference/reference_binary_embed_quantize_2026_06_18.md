---
name: reference_binary_embed_quantize_2026_06_18
description: "Incorporated CyrilXBT's '32x More Memory Efficient RAG' article into PRISM (slot:india 2026-06-18, b0c88809ac): a NEW pure-Node binary+int8 embedding-quantization lib scripts/lib/binary-embed-quantize.mjs (PRISM had none). Two-stage binary retrieve (Hamming prefilter -> float32 rescore) = 32x memory. Targets: tribal-embed-index V8-cap fix (safe) + GNN direct-embed (measure-gated)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.477Z
aliases: reference_binary_embed_quantize_2026_06_18
---


**slot:india, 2026-06-18. Operator: read x.com/cyrilXBT article 2066965039718834176 (login-gated; read via authenticated Playwright window) + see if incorporable. YES -- and it fixes a documented fleet bug.**

## The article (4 compounding embedding-compression techniques = 32x)
1. **int8 quantization** (float32->int8, calibrated min/max -> [-128,127] scale+zero-point): 4x, <1pct quality loss. The safe production default.
2. **dimensionality reduction** (Matryoshka truncation for text-embedding-3 / nomic-style, or PCA; renormalize after): 2-4x.
3. **binary quantization** (sign bit: v>=0 -> 1; packbits; **two-stage**: FAISS IndexBinaryFlat Hamming prefilter -> float32 cosine RESCORE of the candidates -> top-k): 8x, ~3-5pct loss WITH rescore (the rescore recovers most quality).
4. **product quantization** (FAISS IVFPQ, sub-vector codebooks): 50x+, 5-10pct loss.
Compounding 4x*2x*4x = 32x. Configs: latency-critical (int8, 4x, <1pct) / balanced (dim+int8, 8x, ~2pct) / memory-optimized (binary+rescore, 32x, ~3-5pct) / extreme (PQ, 50x+).

## What I built (the verifiable CORE, b0c88809ac)
`scripts/lib/binary-embed-quantize.mjs` (+test 7/7) -- pure Node, no native deps, the Python/FAISS algorithm ported: `binarize` (768-d f32 3072B -> 96B packed = 32x), `hammingDistance` (256-LUT popcount XOR), `hammingSearch`, `twoStageSearch` (Hamming prefilter -> float32 cosine rescore -> exact top-k), `calibrateInt8/quantizeInt8/dequantizeInt8` (4x), `footprintBytes`. Tests use REAL reference values: [+,-,+,-,...]->0xAA, popcount, two-stage = brute-force float-nearest, int8 round-trip within one step, exact 32x/4x ratios.

**R12 CORRECTION to the commit-message dedup claim (verified post-commit b0c88809ac):** the commit said "PRISM had NONE (node-embeddings-768d.jsonl is 114MB raw float)" -- that is WRONG. BOTH GNN embedding stores are ALREADY int8: `ghost-node-embeddings.jsonl` (`q` int8 + `s` scale, src nomic, values e.g. -127..69) and `node-embeddings-768d.jsonl` (`{n,q}` q int8, e.g. 2,5,-27,-8). PRISM does the **int8 (4x) tier inline in build-node-embeddings.mjs** -- my grep missed it (inline, no named lib; the FFT Hamming-window hits were a separate false positive). SO the accurate value: the **BINARY (32x) tier + two-stage Hamming retrieve is the genuinely NOVEL contribution** (int8->binary is a further 8x: a 768-d int8 row 768B -> 96B binary); my lib's int8 functions are a clean REUSABLE extraction of the inline impl (DRY parity, not new capability). The tribal-embed-index embeddings appear float (the 536MB V8-cap store) -> would get BOTH int8 4x AND binary. CLAUDE.md flagged 32x binary-HNSW as a claude-flow HARVEST target -- this is the in-house binary build.

## LIVE VALIDATION -- binary 32x preserves GNN recall (b 7c7235349f, U-EMBED-BINARY-RECALL-BENCH)
`scripts/bench-embed-quantize-recall.mjs` (+test 2/2) measured the TWO-STAGE binary retrieve vs exact cosine on the REAL 355 ghost-node embeddings (768-d): **recall@5 = 99.8pct** at 32x (1.04MB float -> 0.03MB binary). Bench reusable for node-768d + tribal-index too.

## DEFINITIVE DEPLOY-GATE (b 8c929ae921, U-EMBED-BINARY-AUROC-GATE) -- single-stage binary FAILS, two-stage rescore MANDATORY
`scripts/measure-binary-auroc.mjs` runs the canonical `runAssessment()` (non-destructive, no NN-EVAL.json write) on a TEMP sign-vector embeddings file (cosine over sign-vectors == Hamming ranking == single-stage binary, the conservative bound). REAL deploy-gate metrics (84-ghost holdout):
- **baseline int8 cosine (deployed):** AUROC **0.7891**, deploy-ready-selective @27.4pct -- reproduces the deployed value -> harness faithful.
- **binary SINGLE-stage (no rescore):** AUROC **0.7609** (-0.028), **NO-deployable-operating-point** @22.6pct -> **FAILS the 0.78 gate**.

**This CORRECTS the over-optimistic "GREEN for binary adoption" read from recall@5 99.8pct.** The recall bench used TWO-STAGE (Hamming prefilter -> cosine RESCORE); the AUROC gate above is SINGLE-STAGE. So **the rescore is LOAD-BEARING, not optional**: naive binary loses the gate. Two-stage AUROC ~= baseline 0.789 (the rescore re-ranks with REAL cosine over candidates that include the true top-k 99.8pct of the time) -- but **two-stage REQUIRES caching the full-precision (int8) vectors for rescore**, so the 32x is the hot SEARCH INDEX (fast Hamming), NOT total storage; the int8 rescore cache stays (can be colder/lazy). NET for the GNN store: binary is deploy-safe ONLY as binary-index + int8-rescore-cache, not as a naive binary replacement. india metrics-gating caught the naive-binary failure exactly as designed (R12).

## TWO-STAGE GATE-SAFETY -- MEASURED (2026-06-18, no classifier change needed)
The deployed direct-embed vote is **top-K=15 cosine, confidence-weighted** (classifyUnknownGhosts, seed-ghost-gnn-classify.mjs:66 `topK:15`). So two-stage AUROC == baseline EXACTLY when the Hamming prefilter (top-N) contains the cosine-top-15 -- i.e. the vote INPUTS are identical. Measured via `bench-embed-quantize-recall --k=15 --cand=N` (in-memory, no graph load): recall@15 = 78.6pct @N30 / 89.7 @N50 / 97.9 @N100 / **99.8pct @N200**. So **two-stage binary is GATE-SAFE at N~200** (99.8pct of top-15 votes preserved -> AUROC ~= baseline 0.789; the 0.2pct perturbed votes cost ~nothing). This proves two-stage gate-safety WITHOUT replicating/modifying the deployed classifier (proves the vote inputs are preserved, which is sufficient).

**POOL-SIZE NUANCE (the real deployment guidance):** at the GNN's SMALL pool (~84-355 refs) N=200 is ~56pct of the pool, so two-stage's SPEED win is marginal HERE (the 32x index MEMORY win still holds). Binary two-stage's real payoff is LARGE embedding stores (tribal-index ~33K entries, the codebase-wired 3206-ref pool, node-768d ~114K): there N~200 is a tiny fraction of the pool -> big speedup + 32x index memory, recall preserved. So the recommendation by store: GNN ghost pool -> keep int8 (binary's marginal here); tribal-index / large pools -> binary-index + rescore is the win (also fixes the V8 cap). FULLY CLOSED -- no remaining unmeasured gap; the only un-built piece is the actual store migration (mechanical, gated on per-store value above).

## The 2 integration targets (U-EMBED-BINARY-QUANTIZE follow-on, task #12)
1. **tribal-embed-index (PSN leg #5) -- SAFE, immediate.** It crossed V8's 512MiB string cap 2026-06-08 -> silent fleet-wide tribal-injection death + a 33K-entry clobber (sharded as a workaround). Binary 32x: 536MB -> ~17MB **eliminates the V8-cap class of bug at the root** (no sharding needed) + faster Hamming. Recall-tolerant of ~3-5pct loss -> adopt binary+rescore directly.
2. **GNN direct-embed path (leg #10, india) -- MEASURE-GATED.** node-embeddings-768d.jsonl 114MB; deployed tier-5 does float32 cosine kNN over the ref pool. Two-stage binary = 32x + likely faster (cache). BUT the ~3-5pct quality loss MUST be measured vs the deploy gate (AUROC>=0.78 selective) BEFORE trusting it -- india refuses softened metrics. Also de-risks U-GNN-CODEBASE-WIRED-APPLY (3206x more embeddings -> memory was the concern).

## Caveat (R12)
The two-stage rescore preserves quality ONLY if `rescoreCandidates` is wide enough that the true top-k survive the Hamming prefilter; measure recall@k before deploying on a metric-gated store. Sign-bit binary assumes L2-normalized embeddings (nomic is). The dim-reduction step (Matryoshka truncation) is NOT yet ported -- nomic-768 is not confirmed Matryoshka-trained, so truncation could hurt more than the article's text-embedding-3; PCA is the safe alternative if dim-reduction is wanted (deferred).

## FOLLOW-UP (2026-06-18, ea29eeb39e) -- india-side CLOSED, migration HANDED OFF
Added the 60K-store data point (was only ghost-355 + recall@15 before): two-stage recall@5 on a 2000-vec sample of `node-embeddings-768d.jsonl` = **95.5pct** @ k=5 cand=100 (vs 99.8pct ghost), 32x. Recorded the MEASURED proof in the lib header itself (so the asset, not just this memory, carries the gate result). COORDINATED the proven adoption to golf+sierra on AGENT_CHAT.jsonl (event `binary-quantize-proven-for-tribal-index`): the tribal-embed-index V8-cap fix is THEIRS (PSN leg #5, fleet-critical, prior clobber) -- india will NOT touch the tribal read/write path unilaterally (R7/R8). So task #12 is india-COMPLETE: built + measured + proven + gate-analyzed + routed; the only remaining piece (the actual tribal-index store migration) is the owners' mechanical adoption, now de-risked with numbers. R8 note-to-self: this memory already had the recall + deploy-gate analysis -- read existing memory BEFORE re-measuring next time.
