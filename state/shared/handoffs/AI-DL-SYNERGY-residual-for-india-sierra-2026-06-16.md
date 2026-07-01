# AI deep-learning synergy -- 2 coordinated residuals (for india + sierra)

> Authored by slot:alpha 2026-06-16. The alpha-runnable NN/GNN/LoRA<->Obsidian synergy is DONE
> ($0, no GPU): vault-to-lora-dataset materialized 313 doctrine pairs; vault-to-gnn-refpool yields
> 16 confirmed-wiring ground-truth labels @0.85. These 2 residuals need GPU or the shared graph, so
> they are NOT alpha-solo-safe. Context: [[reference_dl_vault_synergy_delivered_2026_06_16]].

## Residual 1 -- SIERRA: apply the vault ref-pool labels into the graph
**What:** `node scripts/vault-to-gnn-refpool.mjs --apply` merges 16 confirmed-wiring ghost labels
(@0.85, 0 conflicts) into `system-graph.json` so `nn-graph-eval.buildHoldout()` finds them (the
deploy gate currently defers on `insufficient-reference-pool`).
**Why sierra:** the `--apply` path is UNLOCKED (no withLock/claim -- grep-verified), writes the 542MB
graph that regen-viz is the canonical single-writer for, and a full regen would WIPE the merge unless
the ghost-merge is a regen-viz INPUT. Needs the big-heap (the script self-reexecs with
`--max-old-space-size` per the 2026-06-11 heap fix).
**Acceptance:** after --apply (or after wiring it as a regen input + regen), `nn-graph-eval` holdout
poolSize >= 16; deploy gate no longer reports `insufficient-reference-pool`.

## Residual 2 -- INDIA: retrain over the grown ref-pool + the LoRA corpus
**NOT GPU-BLOCKED (R12 correction 2026-06-16):** `graphsage-trainer.mjs` is pure-JS/Node (0 cuda/torch
refs, grep-verified); `nn-graph-retrain-lifecycle.mjs` is HEAP-bound (self-reexecs with
`--max-old-space-size`, 9 refs). The retrain is CPU-runnable on this 130GB box -- the gate is NOT GPU,
it is DOMAIN OWNERSHIP (india RULES AI-T7 "india-owns-the-loop") + the residual-1 graph-merge
prerequisite. Alpha is not a free-reign slot (`domain_filter` excludes nn/gnn/lora-training), so this
is india's to run unless the operator authorizes a cross-domain run.
**GNN:** retrain the GraphSAGE tier-5 (or H2GCN per the heterophily finding) over the now-16-label
ref-pool. Current: AUROC 0.808 (>=0.78 gate OK), macro-F1 0.439 (<0.55), Brier 0.21 (>0.15).
Calibration is a MEASURED dead-end ([[reference_gnn_selective_deploy_2026_06_06]]) -- the lift comes
from ref-pool growth (residual 1) + sharper features (H2GCN architecture change -- a CODE change, also
CPU), NOT calibration. A CPU retrain over a CAPPED subgraph scored AUROC 0.40 (worse) -- the full
graph is needed (heap-heavy, the lifecycle's self-reexec handles it). Outcome is UNCERTAIN: hitting
macro-F1 0.55 / Brier 0.15 is NOT guaranteed + MUST NOT be fabricated or gate-weakened (operator
directive). Multi-seed before any AUROC claim ([[feedback_multiseed_before_auroc_claim]]).
**LoRA:** `state/shared/lora/vault-feedback-dataset.jsonl` (313 doctrine instruction pairs, Alpaca
schema) is materialized + ready as a training signal distinct from the DB-param builders. Fold into
the next LoRA adapter train.
**Acceptance:** macro-F1 >= 0.55 AND Brier <= 0.15 on a multi-seed holdout -> the GNN tier-5 promotes
from deploy-ready-SELECTIVE (minConf 0.7) toward full-coverage.

## EMPIRICAL RESULT (2026-06-17, operator-authorized alpha cross-domain attempt)
Ran residual-1 (--apply, 16 labels merged: 7 nodes added/9 updated/7 edges) + residual-2 retrain
(`nn-graph-retrain-lifecycle.mjs --force`, CPU/heap, exit 0). **Gate NOT cleared -- honest numbers:**
- AUROC **0.531** (<0.78), macro-F1 **0.025** (<0.55, REGRESSED from 0.439), Brier(calib) **0.126** (<=0.15 OK).
- action=**not-promoted** (the lifecycle's own R12 gate refused the sub-gate checkpoint -- correct).
**PROVEN NEGATIVE RESULT (saves india a dead-end):** the retrain ran on a CAPPED link-prediction
subgraph (edges=7768, train=6214, test=1554) and REGRESSED -- macro-F1 0.025 = predicting ~one class.
The 0.808 AUROC that cleared earlier came from the DIRECT-EMBED holdout (a different method), NOT a
link-pred GraphSAGE retrain. **Conclusion: retraining the existing trainer harder (default homophily config) is a dead-end; the
real lever is the H2GCN heterophily mode.** The +16 vault ref-pool labels are correct + kept in the
graph (they help any future/better retrain; transient until a regen unless wired as a regen input).

**SHARPENED LEVER (R12 correction 2026-06-17 -- H2GCN is NOT a from-scratch rewrite):** the trainer
ALREADY has an H2GCN flag `--heterophily-hops` (lifecycle nn-graph-retrain-lifecycle.mjs:338,354). The
default `--force` retrain runs HOMOPHILY-only on a small `--max-nodes` cap -> the degenerate macro-F1
0.025. The execution is a TUNING LOOP, not a rewrite, with a specific tradeoff the code documents:
H2GCN `--heterophily-hops` 4x's the feature dim and NATIVE-OOMs at a large `--max-nodes` (and exits
status-0 with NO checkpoint -- a SILENT failure `classifyTrainResult` catches). So india must tune
`--max-nodes` UP enough to learn the multi-class wiring (the 6k cap under-trains -> 0.025) but DOWN
enough to fit the 4x H2GCN feature dim without native-OOM, iterating on a multi-seed grade. That is
the india deep loop (AI-T7) -- a few tuning iterations on the EXISTING flag, not new architecture.
Recommended first config to try: `--heterophily-hops 2 --max-nodes <tuned>` on the full-graph load
(self-reexec heap), multi-seed, against the now-16-label holdout. Run reaper-immune (scheduled task /
zulu-orchestrated), NOT a chat-bg run (a chat-bg long retrain gets fleet-reaped -- proven 2026-06-17).

**EXECUTED 2026-06-17 (alpha, authorized) -- empirical result:** ran `PRISM_NN_RETRAIN_HETEROPHILY_HOPS=2
node nn-graph-retrain-lifecycle.mjs --force`. The heap auto-bumped to >=12GB (line 314) + the run
SURVIVED the fleet-reaper this time (completed exit 0), BUT it wrote NO fresh candidate checkpoint
(candidate stayed the 24-min-old homophily one) = the documented SILENT NATIVE-OOM (`classifyTrainResult`
case: "exited 0 but wrote no fresh checkpoint -- lower --max-nodes"). So hops=2's 3x feature dim OOMs at
the trainer's DEFAULT cap. **CONCLUSIVE finding 2026-06-17 (R8 read-before-wiring -- supersedes the "tune --max-nodes" rec above):**
TWO facts kill the "just tune the cap" path:
(1) `graphsage-trainer.mjs` does NOT accept `--max-nodes` (grep: 0 matches) -- the lifecycle comments
    referencing it (lines 338/354) are aspirational; threading it through buildTrainArgs would be a no-op.
(2) **The H2GCN hop-sweep was ALREADY done + multi-seed-validated** (BLACKWELL-AI-MS0/U-GNN-HOP-SWEEP,
    `[[reference_h2gcn_hop_sweep_2026_06_09]]`, cited in LIFECYCLE_DEFAULTS:103-107): **hops=3 is the
    validated optimum (+0.138 AUROC lift) but CEILINGS at ~0.64 < the 0.78 gate.** So H2GCN -- even
    fully tuned -- does NOT clear the gate. My hops=2 native-OOM was moot: the method ceilings sub-gate
    regardless of cap.
**THE REAL india question is therefore NOT a tuning loop -- it is RESEARCH or GATE-REALISM:** the
0.78-AUROC / 0.55-macroF1 full-coverage gate is empirically unreachable by the current GraphSAGE+H2GCN
link-prediction approach on this heterophilic graph (validated ceiling ~0.64). The options are: (a) a
FUNDAMENTALLY different method (the direct-embed holdout scored 0.808 but on a different measurement --
investigate making that the production path), (b) accept the DEPLOY-READY-SELECTIVE state (macro-F1 1.0
@ minConf 0.7, 32% coverage -- already real + useful) as the GNN's honest operating point and lower the
full-coverage ambition, or (c) a gate-realism review (is 0.78 achievable for this task at all?). This
is india research + an operator gate-policy call -- NOT a quick retrain.
Round auto-captured: `knowledge/memories/reference/reference_nn_retrain_2026_06_17_0327.md`.

## Already done (no action -- evidence)
- CAG/RAG hybrid: warmed across all 34 galaxies + `PRISM CAG Galaxy Warm` daily cron live (self-
  sustaining, $0). [[reference_cag_warm_sweep_cron_2026_06_16]].
- Routing graph: per-class harness/hermes/ollama execution machinery wired.
  [[reference_exec_policy_routing_graph_2026_06_16]].
- LoRA dataset + GNN ref-pool yield: delivered/measured (this handoff's premise).
