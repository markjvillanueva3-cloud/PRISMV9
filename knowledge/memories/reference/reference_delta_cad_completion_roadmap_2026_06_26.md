---
name: reference-delta-cad-completion-roadmap-2026-06-26
description: Consolidated git-reconciled remaining-units roadmap for delta/CAD to reach the trained+tested CAD-model + validated print-generation milestone; the merge is the
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.539Z
aliases: reference_delta_cad_completion_roadmap_2026_06_26
---


**CAD-COMPLETION-ROADMAP (slot:delta, 2026-06-26 /goal).** Spec: `state/shared/specs/CAD-COMPLETION-ROADMAP-2026-06-26.md`; pointer added to `DELTA-CONTEXT-LEDGER.md` §0.

**Reconciled truth (git + on-disk + DELTA-CONTEXT-LEDGER 2026-06-10):** the goal is FAR closer than greenfield.
- SHIPPED: full drawing pipeline (CAD-DRAWING-PIPELINE-MS0 7/7 — ledger/sketch-gate/tribal/stock/route + print-regen-validate engines on disk), closed-loop PROVEN on real `blisk.stp` (0% dim / 1.55% mean / 5.09% worst / 8.76% Hausdorff, `cb1ec539a3`), training tokenization engines, 646-pair corpus + lora-pairs/gnn-edges/rag-chunks jsonl, **QLoRA DRY-RUN only** (`8279b3d14d`).
- NOT YET: a REAL (non-dry-run) trained adapter (only May-25 JSON baseline models in `cad-ai-models/`), and NO recorded validation-50 numbers.

**#1 BLOCKER = `U-MERGE-SLOT-DELTA`** — `slot/delta` is **410 commits / ~3970 files ahead of trunk** holding the BUILT smooth-solid emitter (loft/sweep/tangency, U-CEEF iter158-161 + U-WAVE-I surface ops × 11 platforms) + real CLIs. Operator-gated coordinated session; playbook `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md` (19 conflicts). Building smooth-solid on trunk pre-merge = duplication (R8).

**Terminal LOSS FUNCTION:** T1 real adapter `*.safetensors` eval-loss<baseline · T2 validation-50 dim-pass ≥90% + surface mean≤2%/worst≤6% · T3 print→CAD→regen ≥95% callouts on ≥10 JM parts. Record numbers in `CAD-TRAIN-TEST-RESULT.json` (R12).

**Critical path (~6 units):** merge → NURBS-STEP-emit → learn-loop-close (xproc_outcome_publish→india) → REAL-TRAIN-RUN (Blackwell GPU) → VALIDATION-50-RUN → PRINTGEN-E2E. Phase-C breadth = 11 coverage-gap capability units (16% op-coverage; sketch-subtract/boolean/patterns/die-design foundational — dedup vs merge first).

**Part-A finding (operator's hermes/octopus ask):** the fleet **fanout-gate (cap=12) BLOCKS** large parallel opus bursts — blocked a 6-agent Workflow 3× (reads model=inherit/tier-3 statically; per-call sonnet override ignored). So "drastically increase parallel hermes agents" needs **PA1: raise/configure the gate** (`PRISM_AGENT_FANOUT_GATE=warn`) first. Other Part-A units: PA2 recon-cron, PA3 hermes-CAD-builder harness (zebra), PA4 system-viz graph update (sierra).

Related: [[reference_delta_proven_step_emitter]] · [[reference_delta_step_inch_unit_convention]] · [[feedback_delta_topology_before_tolerance]] · [[gnn-selective-deploy]]
