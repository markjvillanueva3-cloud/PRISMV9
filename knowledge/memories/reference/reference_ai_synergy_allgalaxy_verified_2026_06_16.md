---
name: reference_ai_synergy_allgalaxy_verified_2026_06_16
description: "INDEPENDENT live verification (2026-06-16, slot:alpha) that the AI-synergy substrate (CAG + RAG/768d-embeddings + LoRA + synthesis + audit) is deployed across ALL 34 galaxies -- numbers, not memory citation. Answers the recurring /goal-gate objection that prior 'wired+data-complete' claims were referential. The ONE open item is the NN/GNN Brier-calibration full-coverage lift (measured dead-end, GPU+india-gated). Reproducible commands included."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.463Z
aliases: reference_ai_synergy_allgalaxy_verified_2026_06_16
---


# AI-synergy substrate: all-34-galaxy coverage, VERIFIED live (2026-06-16, slot:alpha)

The `/goal` "improve AI systems ... across all galaxies + synergize with obsidian/psn/awareness/
claude.md/souls.md/memories/wikis" was repeatedly judged incomplete because prior "WIRED + DATA-
COMPLETE across 34 galaxies" claims were CITED from memory, not verified. This is the live verify.

## Verified numbers (each = a streaming/light command, no heavy load, run 2026-06-16)
| Dimension | Result | How (reproduce) |
|---|---|---|
| CAG reasoning traffic | **34/34 galaxies** | `node scripts/cag-cache-stats.mjs` -> "galaxies with CAG traffic: 34" |
| RAG/GNN node-embeddings | **34/34** (`galaxyNodesCovered:34`, 59,403 vec, nomic 768d) | `head -1 state/shared/nn-graph/node-embeddings-768d.jsonl` (meta header) |
| LoRA bridge-reasoning sinks | **34/34** per-galaxy jsonl | `ls state/shared/lora/bridge-reasoning/*.jsonl | wc -l` |
| Synthesis brains (Obsidian/PSN) | 34 (+1 meta) | `ls knowledge/memories/patterns/*_synthesis.md | wc -l` |
| AI-synergy audit score >=1 (strong) | **34/34**, 0 below | `AI-SYNERGY-AUDIT.json` .galaxies filter score>=1 |

## Doctrine layer (the goal's "claude.md/souls.md/memories of each galaxy") -- also 34/34
`node` enumerate `mcp-server/src/engines/*/` (galaxies = dirs with MEMORY.md): **CLAUDE.md 34/34 ·
SOUL.md 34/34 · MEMORY.md 34/34 · AWARENESS.md 34/34 · synthesis 34/34. ZERO missing-file gaps.**
So the doctrine corpus the AI-synergy bridge reads is complete for every galaxy -- nothing to build.

Conclusion: the synergy SUBSTRATE (CAG + RAG-embeddings + LoRA + synthesis + audit) AND the doctrine
layer (CLAUDE/SOUL/MEMORY/AWARENESS) are materially present + galaxy-attributed across **all 34
galaxies** -- verified, not assumed. The
`build-galaxy-node-embeddings` merge stamps `galaxyNodesCovered:34`; the bridge emits a per-galaxy
LoRA sink for each; every galaxy has a synthesis brain + a strong AI-synergy audit score.

## Gotcha that bit the first pass (R12)
`grep '"galaxy":"..."'` on `node-embeddings-768d.jsonl` returns **0** -- NOT a coverage gap. The
data rows are node-id-keyed; galaxy coverage lives in the FILE's `__meta` header field
`galaxyNodesCovered`. Verify embedding galaxy-coverage via the meta header, never a per-row
`galaxy` grep. (Sibling of [[feedback_never_assume_data_file_contents]] -- read the actual schema.)

## NN/GNN improvement levers -- all GPU-retrain OR heavy-graph (verified 2026-06-16, do not re-attempt blind)
The documented #1 full-coverage lift lever is REFERENCE-POOL GROWTH. The feeder
`scripts/vault-to-gnn-refpool.mjs` is HEAP-GUARDED (`shouldReexecForHeap`/`nodeArgsWithHeap`) -> it
loads the ~550MB system graph and self-reexecs with `--max-old-space-size`. So growing the ref-pool is a
HEAVY graph-load op (box-cascade risk at high context/memory pressure -- the lifecycle has OOM'd before).
The other levers (H2GCN architecture swap, sharper features, multi-seed retrain) all require a GPU
RETRAIN. Hand-appending labels to `state/shared/nn-graph/reference-pool-seed-2026-05-23.json` (6881B)
would be FABRICATION (R12 -- no validated labels without running the classifier). NET: there is NO safe,
honest, alpha-solo NN/GNN *improvement* runnable under pressure -- only the india-executable plan
(`state/shared/handoffs/NN-GNN-BRIER-PLAN-for-india-2026-06-16.md`, Hermes/Ollama-generated, steps 1-5
complete + step 6 truncated) + the synergy proof above. The improvement itself = india + GPU + a healthy box.

## The one genuinely-open item (NOT alpha-solo-completable)
NN/GNN tier-5 (PSN leg #10): AUROC 0.809 >= gate but **Brier 0.210 > 0.15** calibration gate ->
tier-5 dormant at full coverage. Per CLAUDE.md NN-GRAPH this is a MEASURED calibration dead-end
(tier-5 already deploy-ready-SELECTIVE at minConf 0.7); full-coverage lift = GPU retrain + H2GCN +
reference-pool growth. Owner: **india** + GPU. Not fixable solo / on a memory-pressured box.

## EXECUTED improvement this session (not just verification) -- all-34-galaxy CAG/RAG/LoRA sweep
Ran the galaxy-reasoning-bridge LIVE for ALL 34 galaxies (qwen2.5-coder:1.5b, keep_alive warm,
CAG-cache ON, LoRA-emit ON) -- a real synergy exercise, not a read. Results (live numbers):
- **CAG caches WARMED**: 244 cached reasoning answers across all galaxy-keys (was sparse/cold;
  29/34 galaxies previously had a single cold lookup).
- **Warming PROVEN**: re-asking mill + lathe the same question returned `cached=true` (cold->warm
  transition; CAG hits 4->7). This is the empirical demo of why warm-rate > raw rate.
- **Telemetry now LIVE fleet-wide**: reason-tagged CAG misses 1->35 (every galaxy's miss now
  classified novel/invalidated by the U-CAG-WARM-RATE instrumentation -- it was inert before).
- **LoRA corpus grew**: bridge-reasoning-combined.jsonl ~155->184 pairs (CAG/RAG->LoRA synergy
  producing real per-galaxy training data).
- **RAG hybrid exercised**: every call ran dense-rerank retrieval (`retrieved-hybrid:5`) over the
  galaxy's CLAUDE/SOUL/MEMORY/AWARENESS/synthesis/wiki doctrine.
Sweep mechanics: self-guarding bash loop with a C:-free abort floor; the background half (28/34)
was reaped by the fleet-reaper (long detached node proc), the last 6 finished foreground. Box was
fragile (C: 41G->13G over the session from Ollama pagefile growth) -- heavier models (gpt-oss:120b)
deferred to a healthy box.
OPEN (the one warm-rate gap): warmHitRate still shows n/a because 38 LEGACY untagged misses
(predating instrumentation) trip the null-guard permanently. FIX (queued, light, alpha-domain):
quarantine the legacy-untagged baseline so warmHitRate computes on the post-instrumentation window
(would read ~100% recoverable: 7 hits / (7 + 0 invalidated)). Needs a lib change + test + scrutiny
-- deferred off a 13G-C: box.

## DURABLE re-runnable proof (closes the "cited not verified" objection) -- 2026-06-16
`node scripts/verify-galaxy-ai-corpus.mjs` (+ `.test.mjs`, commit U-AI-CORPUS-PROOF) reuses the REAL
bridge corpus assembly (`gatherGalaxyDocs`, R8) so the proof == exactly what the per-galaxy CAG/RAG
reasons over, and reports per-galaxy which synergy surfaces feed the AI substrate. LIVE run 2026-06-16:
**34/34 galaxies fed by MEMORY + synthesis-memory + wiki + SOUL + CLAUDE + AWARENESS; 180 wiki bodies
resolved into the AI corpus fleet-wide; 0 gaps; exit 0.** This is the operator's "AI systems synergized
with ... memories and wikis across all galaxies" -- now DEMONSTRATED with numbers (R12), not asserted,
and re-runnable so it can't silently regress (flags any galaxy that loses synthesis/wiki feed, exit 1).

## alpha's shipped contribution to this goal (this session)
CAG/RAG telemetry HONESTY so the synergy is MEASURABLE not phantom: warm-hit-rate
([[reference_cag_warm_hitrate_honesty_2026_06_15]], commits acd8708fe2+982d60faca) + route-savings
measurement-gap (4462a430bb). Plus the bounded prompt-route-history directive plan (6a9dfebe69).
