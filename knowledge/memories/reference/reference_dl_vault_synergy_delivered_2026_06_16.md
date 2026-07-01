---
name: reference_dl_vault_synergy_delivered_2026_06_16
description: "2026-06-16 (slot:alpha): delivered the alpha-runnable HALF of the NN/GNN/LoRA<->Obsidian synergy the /goal demands -- ran the existing vault->AI feeders ($0, no GPU, no fabrication). vault-to-lora-dataset materialized 313 doctrine instruction-pairs (state/shared/lora/vault-feedback-dataset.jsonl, gitignored). vault-to-gnn-refpool yields 16 CONFIRMED-wiring ground-truth labels @0.85 (>=0.8 gate, 0 conflicts, 8 dispatchers) -- the deploy-gate's insufficient-reference-pool blocker is vault-fed-fixable. The 2 RESIDUALS are genuinely NOT alpha-solo: the --apply graph-merge (542MB, unlocked, sierra owns regen-viz) + the GPU weight-retrain (india)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.554Z
aliases: reference_dl_vault_synergy_delivered_2026_06_16
---


# NN/GNN/LoRA <-> Obsidian vault synergy -- alpha half DELIVERED (2026-06-16)

## The reframe (corrected a too-broad deferral)
The /goal demands "improve nn, gnn, lora ... ensure they're all synergized with obsidian vault ...
across all galaxies." I had deferred the WHOLE deep-learning half to india-GPU. That was too broad:
the GPU WEIGHT-TRAINING is india's, but the goal's explicit SYNERGY (vault -> nn/gnn/lora data-feed)
is $0, non-GPU, alpha's lane -- and the feeders already existed (slot:kilo OBSIDIAN-AI-SYNERGY
2026-06-09, [[reference_vault_to_ai_feeders_2026_06_09]]). I RAN them.

## Delivered (live evidence, $0, no GPU, no fabrication)
- **LoRA <- vault:** `node scripts/vault-to-lora-dataset.mjs --out` -> **313 instruction pairs** from
  315 feedback memories (2 thin skipped), avg output 2251 chars, Alpaca {instruction,input,output}
  schema -> `state/shared/lora/vault-feedback-dataset.jsonl` (823KB, GITIGNORED runtime artifact, ready
  for india training). A doctrine training signal distinct from the DB-driven param builders.
- **GNN ref-pool <- vault:** `node scripts/vault-to-gnn-refpool.mjs --json` (dry, no graph load) ->
  **16 CONFIRMED-wiring labels @ confidence 0.85** (>=0.8 ref-pool gate), 0 conflicts, 8 dispatchers
  (prism_edm 2, prism_data 1, prism_calc 2, prism_dev 1, prism_business 4, prism_ai 1, prism_quoting 4,
  prism_orchestrate 1). Ground-truth "wired into" confirmations from the vault, NOT keyword guesses.
  buildHoldout needs >=2 high-conf ref ghosts; 16 is 8x. The deploy-gate's `insufficient-reference-pool`
  defer is therefore a VAULT-FED-FIXABLE gap, not pure GPU.

## 2 residuals -- genuinely NOT alpha-solo (R7 surfacing, not laziness)
1. **vault-to-gnn-refpool --apply** (merge the 16 labels into system-graph.json): the --apply path is
   UNLOCKED (no withLock/claim/backup -- grep-verified) + writes the 542MB graph that SIERRA owns
   (regen-viz is the canonical single-writer) + sierra is LIVE -> a unilateral alpha --apply races/
   clobbers regen-viz, AND a subsequent full regen would WIPE the merge unless the ghost-merge is a
   regen-viz INPUT. -> SIERRA-coordinated (lock it / make it a regen input, then --apply).
2. **GNN weight-retrain** (H2GCN / sharper features over the now-16-label ref-pool to lift macro-F1
   0.44->0.55 + Brier 0.21->0.15): **NOT GPU-blocked (R12 correction)** -- graphsage-trainer.mjs is
   pure-JS (0 cuda/torch refs); nn-graph-retrain-lifecycle.mjs is HEAP-bound (CPU, self-reexec
   --max-old-space-size). The gate is DOMAIN OWNERSHIP (india RULES AI-T7 "india-owns-the-loop"; alpha
   domain_filter excludes nn/gnn/lora-training) + the residual-1 graph-merge prerequisite. Outcome
   UNCERTAIN (a capped CPU retrain scored 0.40 -- worse; needs the full graph + maybe H2GCN) + NOT
   fabricatable / gate-weakenable. Calibration alone is a measured dead-end
   ([[reference_gnn_selective_deploy_2026_06_06]]). My earlier "GPU + india-owned" framing was a
   too-broad ASSUMPTION -- corrected: it is CPU-runnable but india-domain-owned.

## Work-order handed to india/sierra
`state/shared/handoffs/AI-DL-SYNERGY-residual-for-india-sierra-2026-06-16.md`. Sibling of the
CAG/RAG half ([[reference_cag_warm_sweep_cron_2026_06_16]]) -- together the two halves are the full
"synergize the AI systems with the vault across all galaxies" goal: CAG/RAG done+self-sustaining
(daily cron), NN/GNN/LoRA synergy-fed (this), GPU-train + graph-merge handed off.
