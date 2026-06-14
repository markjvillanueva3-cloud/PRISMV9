---
name: reference_blackwell_ai_upgrade_plan_2026_06_03
description: "The Blackwell 96GB GPU AI-upgrade master plan (india) + its load-bearing reality-corrections — kimi2.6 cloud-only, ModelRoutingEngine already exists, Python 3.14 wrong for GPU wheels"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.028Z
aliases: reference_blackwell_ai_upgrade_plan_2026_06_03
---


RTX PRO 6000 Blackwell (96GB) installed on DESKTOP-N7MI1VB 2026-06-03. india ran an 8-assessor parallel-agent Workflow (`w2a5ymndu`) + 2 adversarial verifiers to plan GPU-leverage upgrades to PRISM's AI systems (NN/GNN, LoRA, RAG, CAG, master-graph, model-routing, octopus, closed-loop), generalizable to all 34 galaxies. golf owns infra; india owns the AI systems. Plan: `state/shared/specs/BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md`.

**Load-bearing facts the verifiers caught + india self-verified against live code (do NOT re-derive):**
- **kimi2.6 is CLOUD-ONLY** — Kimi K2.6 is a 1T-param MoE (~350–610GB); Ollama publishes only `kimi-k2.6:cloud`. It CANNOT run locally on 96GB. Operator's "wire in kimi2.6" = cloud API voice only (PII-gated), never a local resident or fine-tune base. The real local heavy model is **qwen2.5-coder:32b** (~22GB); "higher Qwen" (32B-class) is the locally-viable upgrade.
- **The model-routing ladder ALREADY EXISTS** — `mcp-server/src/engines/ModelRoutingEngine.ts` has `HardwareProfile="home_blackwell"` (96GB/32B tier), `DEFAULT_MODEL_CATALOG` w/ qwen2.5-coder:32b + cloud_only entries. EXTEND it; do NOT build a parallel ladder on aiSystemRouterEngine (R7/R8 — dedup-guard saved a duplicate). Keystone = `U-CAP-PROBE` (OllamaCapabilityProbeEngine, runtime nvidia-smi+/api/tags is sole authority) + wire ModelRoutingEngine + purge ~10 `deepseek-r1:14b` hardcodes (deepseek-r1:14b isn't even installed).
- **GPU is idle/available** — `nvidia-smi` "96GB used" is a WDDM committed-pool artifact (P8/2%util/32W); real use ≈9GB. Driver CUDA 13.2 supports sm_120.
- **Python 3.14.5 (portable) is WRONG for the GPU training stack** — cp314 cu128 wheels are CPU-only/missing. GNN/LoRA training needs a dedicated **Python 3.13** venv (`H:/Tools/python-gpu`): torch 2.11+cu129, bitsandbytes matched to CUDA, PyG/DGL, Unsloth Blackwell Docker; env `TORCHDYNAMO_DISABLE=1`+`UNSLOTH_COMPILE_DISABLE=1`. Ollama is inference-only — it CANNOT train (no backward pass).
- **GPU fixes the compute wall, not the data wall** — the GNN constant-vote collapse (AUROC 0.5, all→prism_turning, holdout=62) is architecture-fixable (GATv2+768d features+focal loss) but the deploy gate (macroF1≥0.55) is unreachable until the labeled reference pool grows (several classes at zero). The deployable GNN win this cycle is **edge-prediction** (dead-wiring surfacing — no reference pool needed). See [[nn-graded-schema-read-fix]].
- **Generalization is honest for 3/7 subsystems** (GNN, RAG, octopus); aspirational for CAG; NOT-yet for LoRA (GalaxyAdapterFactory unbuilt, 67 forked engines) + reward (OutcomeRLBridgeEngine wiring orphaned). LoRA promote-gate must be GENERATIVE (BLEU/pass@k/S(x)), not AUROC.

Related: [[feedback_psn_definition]] (NN/GNN = PSN leg #10, india-owned) · [[feedback_domains_own_ai_training_systems]] (per-galaxy AI cloned from india).
