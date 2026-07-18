---
name: reference_galaxy_bridge_deep_reason_2026_06_11
description: "Opt-in DEEP-reasoning mode added to the galaxy-reasoning bridge (PSN leg #10) fleet-wide (slot:tango, 2026-06-11, commit b6bc5de8cd). --deep / PRISM_GALAXY_BRIDGE_DEEP=1 routes any galaxy's reasoning to the strongest INSTALLED local reasoner (gpt-oss:120b->deepseek-r1:32b->gpt-oss:20b); fast coder default preserved. ALSO records the MEASURED in-session ceiling: LoRA trainingReady + GNN AUROC are both india-GPU-lane, not code-flippable."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.584Z
aliases: reference_galaxy_bridge_deep_reason_2026_06_11
---


**Galaxy-reasoning bridge gained an opt-in DEEP-reasoning mode, fleet-wide** (slot:tango, 2026-06-11, commit `b6bc5de8cd`, U-FLOR-BRIDGE-DEEP-REASON). The /goal named "deep reasoning across all galaxies"; this delivers it as ONE bridge change that every galaxy inherits (R15 apply-to-all).

## What shipped
`scripts/lib/galaxy-reasoning-bridge.mjs`: the bridge hardcoded `DEFAULT_MODEL = qwen2.5-coder:32b` (a CODER model) for what is a REASONING task. Added:
- `resolveReasoningModel({env,optsModel,optsDeep,available})` (pure, exported) — DEFAULT/fast keeps the coder model (the author's deliberate per-galaxy-sweep-speed choice, preserved); DEEP routes to the strongest INSTALLED model from `DEEP_REASONING_PREFERENCE = [gpt-oss:120b, deepseek-r1:32b, gpt-oss:20b]`. Install-gated via `available`; fast fallback when no reasoner is installed; explicit `opts.model` wins.
- `fetchInstalledModels()` (fail-soft `/api/tags`, mirrors `callOllama` AbortController pattern) — probed ONLY in deep mode AND when no `opts.model` (fast path = zero extra I/O).
- Trigger: `opts.deep===true` / `PRISM_GALAXY_BRIDGE_DEEP=1` / CLI `--deep`.

## Validation (R15)
- 25/25 tests (8 new: happy + 3 failure-mode + 2 adversarial). LIVE: `--deep` on `discovery` routed `gpt-oss:120b`, NOT degraded, grounded answer; fast path unchanged `qwen2.5-coder:32b`. 3-of-3 scrutiny PASS (A/B/C), 0 blockers.
- Safe by construction: NO production caller passes `deep` (registry builder passes explicit `{model}` -> short-circuits; the 26-slot per-prompt awareness hook never sets it) -> the hot path is byte-identical. Ollama-down deep path degrades (never rejects). CAG keys deep answers under the deep model (no fast/deep collision).
- P3 notes (deferred, non-blocking): `deepRequested` double-reads env (DRY); `DEEP_REASONING_PREFERENCE` is a low-risk drift surface vs `ollama-cost-router.mjs` TIER_PREFERENCES.best (it is a reasoning-ONLY curated subset, NOT a fork).

## MEASURED in-session AI-gate ceiling (R12 -- honest, for india)
- **LoRA trainingReady -- FLIPPED TRUE in-session with REAL data (R12 correction).** First-pass: regenerated both vault producers -> `fleet-lora-combined.jsonl` 823 -> 856 rows, still <1000 -> I (wrongly) concluded "unflippable in-session, india GPU lane only." That was WRONG. Then U-FLOR-WIKI-CANON-WIRE (commit `5ffc77fb35`): tango's discovery found a DORMANT real source -- `state/shared/training/wiki-canonical-pairs.jsonl` (282 real wiki Q/A pairs, producer `wiki-canonical-to-training-pairs.mjs`) used `{prompt,completion}` but the assembler only accepted `{instruction,output}` -> 0 consumable. Added pure `normalizeAlpacaRow` (accepts BOTH; native wins) + registered the source (advisory 0.5). LIVE: **856 -> 1138 rows, 0 dedup, 0 invalid, trainingReady false->TRUE** (floor 1000), 34/34 galaxies. REAL data crossing the floor, on the "wikis across all galaxies + lora" surface; 24/24 tests, 3-of-3 PASS. The missing `cam-master-training-set` (3766 rows, no builder) is still unrecoverable but no longer needed for the gate. LESSON: before declaring a corpus gate "unflippable", SEARCH for dormant real sources blocked by schema/wiring mismatches -- a key-name mismatch hid 282 real pairs. Non-blocking follow-up (reviewer-C): `MIN_TRAINING_ROWS` is count-only (would flip true on a 100%-advisory corpus); a `verifiedRows`-aware floor would harden it (future unit; per-row weight + stats sidecar already prevent silent misuse).
- **GNN AUROC** -- STILL india's GPU lane: pool growth (+8 last session) does NOT move AUROC 0.8084 (holdout composition != model). Selective-deploy @ tau=0.7 remains best. Full gate = GPU retrain (india). This is the one genuinely GPU-bound gate.

Conclusion: the in-session, $0-Claude AI-improvement surface for tango is the bridge/routing/synergy layer (done: hybrid-RAG default, qwen3-coder, deep-reasoning mode, souls/CLAUDE cascade, GNN pool seed, LoRA corpus refresh). The metric-moving GPU work is india's. Pairs with [[reference_gnn_refpool_vault_grow_2026_06_10]], [[reference_lora_corpus_wire_2026_06_10]], [[reference_galaxy_bridge_hybrid_on_default_2026_06_10]].
