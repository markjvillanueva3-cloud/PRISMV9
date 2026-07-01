---
name: reference_india_lora_stack_inventory_2026_05_28
description: ~95 LoRA engines grouped (Glob-verified 2026-05-28)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.618Z
aliases: reference_india_lora_stack_inventory_2026_05_28
---


`H:/prism/mcp-server/src/engines/*LoRA*.ts` ≈ 95 engines (Glob-verified 2026-05-28): `LatheLoRA*` ~48 (cadence/drift/deployment/monitoring/ensemble/master-orchestrator/dataset-builder/physics-augmented-inference), `MillLoRA*` ~14, per-domain `{FiveAxis,MillTurn,WEDM,SinkerEDM,Laser,Waterjet,Grinding,Milling}LoRA{DatasetBuilder,Cadence}Engine`, cross-domain `LoRAMoEGatingEngine`/`AdaLoRARankAllocatorEngine`/`OrthogonalLoRAEngine`/`LoRACompositionEngine`/`FederatedLoRAEngine`/`ContinualLoRAEngine`/`LoRAAdapterRegistryEngine`/`InferenceLoRAGateEngine`/`PRISMLoRAAdapterEngine`/`CAMLoRAEngine`/`BlueprintLoRABridgeEngine`/`MachineLoRABaseEngine`/`DetachedLoRARunnerEngine`. Pipeline: `scripts/lib/lora-training-pipeline.mjs`. Full atlas: `mcp-server/src/engines/ai-training/PATHS.md`.
