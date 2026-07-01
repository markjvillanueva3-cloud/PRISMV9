---
name: reference_knowledge_to_model_loop_map_2026_06_21
description: "Verified map of how PRISM's wiki/memory/tribal substrates feed the models (which loops auto-compound on a cron vs are manual) as of 2026-06-21."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.635Z
aliases: reference_knowledge_to_model_loop_map_2026_06_21
---


Knowledge-substrate -> model loop audit (slot:zulu, 2026-06-21), verified against
the live repo. Answers "do wiki/memory/tribal actually improve the models on a
loop, or dead-end as docs?" -- mostly auto-compounding; one gap was closed this
session, one routed to india.

**Injection (substrate -> prompt) -- all LIVE.** `PRISM_MEMORY_INDEX_INJECT="1"`
(NOT disabled -- the 2026-06-01 "disabled" memo is STALE), `PRISM_MASTER_INDEX_INJECT="1"`,
`tribal-by-domain-inject` + `memory-index-precheck-inject` both wired in
settings.json (lines ~1447/1467). All 3 substrates inject back; none write-only.

**Substrate -> model loops:**
- **GNN: CLOSED + cron'd.** `vault-to-gnn-refpool.mjs --apply` is a pre-retrain
  stage in `nn-graph-retrain-lifecycle.mjs` (lines 348-352, 702-704), run by the
  durable "PRISM NN-Graph Retrain" task. Vault/memory -> ref-pool -> retrain auto.
- **Tribal: HEALTHY + cron'd.** index 74,004 entries / 3 shards (recovered past
  the June clobbers); all 4 embedders route through `lib/tribal-index-guarded-io.mjs`
  (shard-safe -- U-TRIBAL-SIBLING-WRITER-SHARD-SAFE already shipped, CLAUDE.md note
  stale); 11 Galaxy-Mine crons keep mining.
- **LoRA: WAS open at BOTH ends.** Dataset FEEDERS (vault-to-lora-dataset 3 sources
  + vault-wiki-to-lora-dataset + vault-lessons-to-lora-dataset -- india's growing
  set) had NO cron; and no train cron consumes the jsonl. THIS SESSION closed the
  SAFE dataset half: `scripts/refresh-lora-vault-datasets.mjs` + weekly
  `install-lora-dataset-refresh-task.ps1` (commits 3856285939 + 5dcee3da48 + harden;
  9/9 tests; live 5/5 = 3,634 pairs). The TRAIN half (cadence/GPU/eval-gate) routed
  to india via chat bus (chat-1782081989139). [[reference_lora_wiki_domain_feeder_2026_06_21]]

**Utilization metrics (live):** Ollama offload 21.1% (281/1051) -- below the >=30%
target (alpha owns). CAG 3% overall / 82% warm (cold-start dominates). GNN tier-5
AUROC 0.789, SELECTIVE-DEPLOY @ tau=0.7 (27% coverage), full-coverage gated on
ref-pool growth (india).

**Lesson:** verify substrate live-state before asserting -- 3 "gaps" this session
were already-done (memory-recall-enabled, tribal-shard-safe, MISC-186/025), caught
only by reading the repo not the stale memos. See sibling
[[feedback_reuse_whole_token_matcher_not_includes]].
