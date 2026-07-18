---
name: reference_rslora_adapter_orphaned_2026_06_18
description: "R15 finding (slot:india 2026-06-18): the trained rsLoRA r=32 adapter (state/shared/lora/adapters/fleet-rslora-r32/checkpoint-350, 87.5% trained, use_rslora=true, loadable) is ORPHANED -- NO live inference/serving consumer loads it. Grep of scripts/ + mcp-server/src/ found only the TRAINING script's --out defaults; no PEFT load_adapter/from_pretrained path and no config/Modelfile/registry points serving at it. CORRECTS the [[reference_rslora_enabled_2026_06_15]] claim 'Consumers load the adapter from checkpoint-350/' (existence != wired). Serving is correctly DEFERRED: adapter is trained on a SPARSE per-galaxy corpus (<512 pairs/galaxy) so wiring a consumer now = building atop an unproven foundation (R13). Correct order: grow per-galaxy corpus -> re-train r=32 -> THEN wire a serving path."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
aliases: reference_rslora_adapter_orphaned_2026_06_18
---


**slot:india, 2026-06-18. R15 wiring-audit finding while assessing AI-systems synergy-to-galaxies.**

## UPDATE 2026-06-18 (DE-ORPHANED -- serving path shipped, commit 8f6b294d8d)
The orphan is CLOSED: `scripts/lora_infer.py` (U-LORA-SERVE) now SERVES the adapter -- loads the HF base the same 4-bit QLoRA way the trainer did + attaches the trained adapter via `PeftModel.from_pretrained` + generates. R15 LIVE-VALIDATED on the RTX PRO 6000 Blackwell: `--compare` loaded base+adapter (197s), generated WITH and WITHOUT the adapter, `adapter_changes_output=true`. So the adapter now HAS a real, proven serving consumer. HONEST caveat (R12): on the Kienzle smoke prompt the adapter DEGRADED the answer (base correctly 'cutting force'; adapter wrongly 'chip thickness ratio') -- the serving INFRA is proven, the adapter OUTPUT is still thin-corpus / not production-grade. Production router-integration (auto-route tasks -> adapter) stays DEFERRED behind per-galaxy corpus growth + re-train (R13). The serving path is reusable for the re-trained adapter. 1-reviewer PASS, fail-loud on missing adapter dir, read-only.

## UPDATE 2026-06-18 (per-galaxy corpus TAGGING-LOSS found + fixed, commit 761cd3b770)
The per-galaxy LoRA "<512 pairs/galaxy" blocker is LARGELY A TAGGING-LOSS BUG, not data scarcity. `state/shared/lora/fleet-lora-combined.jsonl`: 917/1336 rows had NO galaxy field, incl. ~322 galaxy-SPECIFIC pairs whose producer dropped the tag at the combined sink (bridge-reasoning-lora 184 -- instruction literally says "about the PRISM <galaxy> galaxy"; cad-* 127 -- source=cad; outcome-bus 11 -- dispatcher in instruction). Per-galaxy training silently lost them. FIX: `scripts/tag-lora-corpus-galaxies.mjs` deterministically recovers the galaxy (regex/source-prefix/dispatcher-map; cross-cutting vault-feedback+wiki-canonical 595 rows -> honest "fleet" label, NOT forced). APPLIED: 917 tagged, 0 untagged, every galaxy now carries its bridge pairs. So "grow the corpus" is only HALF the LoRA-synergy story -- the existing corpus had recoverable galaxy signal being dropped. ROOT-CAUSE follow-on: fix the bridge + cad PRODUCERS + `assemble-fleet-lora-corpus` to emit galaxy at generation (the post-processor is idempotent until then). [[reference_rslora_enabled_2026_06_15]]

## The finding (original -- now resolved by the updates above)
The rsLoRA r=32 adapter ([[reference_rslora_enabled_2026_06_15]], commit `c3a1977098`/`b746c5f02d`) exists at `state/shared/lora/adapters/fleet-rslora-r32/checkpoint-350/` (87.5% trained, `r=32 alpha=32 use_rslora=true`, `adapter_model.safetensors` present, fully loadable). But it is **ORPHANED** -- NO live consumer loads it for inference:
- `grep fleet-rslora-r32|adapters/fleet|checkpoint-350` in `scripts/` -> only `fleet_lora_train.py`'s `--out` DEFAULTS (the writer, not a reader).
- Same grep in `mcp-server/src/` -> **0 files**.
- No PEFT `load_adapter`/`PeftModel.from_pretrained(<this adapter>)` serving path; no `.json`/`Modelfile`/`.yaml` config or registry points serving at it.
The LoRA engines that DO exist (`BlueprintLoRABridgeEngine`, `CAMLoRAEngine`) are not wired to load THIS adapter at runtime.

## Honesty correction (R12, existence != wired)
[[reference_rslora_enabled_2026_06_15]] states "Consumers load the adapter from checkpoint-350/." That is **NOT verified by the code** -- it was an assumption. The adapter is a trained DELIVERABLE with no live serving consumer. This is the classic "the file exists, therefore it's wired" trap.

## Why serving is correctly DEFERRED (not a quick-wire orphan)
Do NOT rush a serving path. The adapter is trained on a SPARSE corpus -- `trainingReady:true` (1372 rows, 34/34 galaxies) but **every galaxy <512 pairs** (per-galaxy thin). An 87.5%-trained r=32 QLoRA on a thin per-galaxy corpus carries little per-galaxy signal; wiring a consumer to it now = a consumer atop an unproven foundation (R13 anti-pattern). Correct sequence (matches [[reference_rslora_enabled_2026_06_15]]'s own conclusion): **grow per-galaxy corpus (`galaxy-synthesis-refresh` toward ~512/galaxy) -> re-train rsLoRA r=32 to completion (reaper-immune window) -> THEN build the serving path** (load base 7B + PEFT adapter -> generate, wired to the consuming dispatchers/galaxies).

## Status of india AI-systems work (2026-06-18 checkpoint)
Both remaining india AI-systems levers are BIG arcs, no cheap wins left:
1. **GNN tier-5 coverage** -- 4 cheap levers exhausted (ref-pool / vote / sharp-text / diagonal-Fisher, none clears the deploy gate; see [[reference_gnn_sharp_embed_lever_2026_06_18]] + wiki [[ref-pool-growth-can-regress-deploy-gate]]). Remaining: full off-diagonal LDA (eigensolver) or stronger embedding model.
2. **rsLoRA serving** -- adapter orphaned; deferred behind per-galaxy corpus growth + re-train (this memory).

Related: [[reference_rslora_enabled_2026_06_15]] · [[reference_gnn_sharp_embed_lever_2026_06_18]].
