# Feature Utilization Meter

_Generated: 2026-05-26T04:39:12.814Z · U-FEATURE-UTIL-METER (slot:sierra iter7)_

> ⚠ Missing telemetry sources: `rtk`

## Per-feature utilization

| Feature | Sub-hooks (data/total) | Fires (cumul) | Suggested | Route take-rate | Tier |
|---|---|---|---|---|---|
| PSN | 0/3 | 0 | 0 | — | **unknown** |
| SystemViz | 0/2 | 0 | 0 | — | **medium** |
| Ollama | 2/4 | 2928 | 87 | — | **high** |
| Docker | 0/0 | 0 | 0 | — | **medium** |
| NN_GNN | 0/1 | 0 | 0 | — | **low** |
| LoRA | 0/0 | 0 | 0 | — | **unknown** |
| RAG_Qdrant | 0/2 | 0 | 0 | — | **unknown** |
| DeepLearning | 0/0 | 0 | 0 | — | **unknown** |
| WikiInject | 0/3 | 0 | 0 | — | **medium** |
| MemoryInject | 0/5 | 0 | 0 | — | **medium** |
| HTMLOverMD | 0/0 | 0 | 0 | — | **medium** |
| TribalInject | 0/2 | 0 | 0 | — | **medium** |
| Obsidian | 0/2 | 0 | 0 | — | **medium** |
| PRISMAwareness | 0/2 | 0 | 0 | — | **unknown** |
| CLAUDE_md | 0/0 | 0 | 0 | — | **medium** |
| Octopus | 0/1 | 0 | 0 | — | **unknown** |
| NVIDIA_NIM | 0/1 | 0 | 0 | — | **unknown** |
| GrepGlobIndex | 2/2 | 1029 | 178 | — | **high** |

## Tier definitions
- **high**: take_rate ≥ 30% OR fired_7d ≥ 100
- **medium**: take_rate ≥ 5% OR fired_7d ≥ 20
- **low**: any fires but below medium threshold
- **unknown**: no telemetry data found

## Action priority
- **1** LOW-utilization features — built+wired but underused. Investigate adoption gap, NOT new builds.
- **7** UNKNOWN-utilization features — no telemetry source covers them. Telemetry-add is the next ship.
  - LOW: NN_GNN
  - UNKNOWN: PSN, LoRA, RAG_Qdrant, DeepLearning, PRISMAwareness, Octopus, NVIDIA_NIM
