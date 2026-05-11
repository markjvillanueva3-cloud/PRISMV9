---
title: Domain flow — lathe
type: architecture
domain: lathe
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-lathe, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-lathe.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `lathe`

> Narrow lens on the `lathe` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 111 (sample of 6 shown)
**Dispatcher:** _(no L4 match)_
**Sample actions:** 0

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming lathe)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["(no dispatcher) dispatcher<br/>L4"]:::tier2
    ER["lathe engines (111)<br/>L5 rollup"]:::tier1
    E_barfeedpitchoptimizerengine["BarFeedPitchOptimizerEngine"]:::tier1
    E_latheactivelearningengine["LatheActiveLearningEngine"]:::tier1
    E_latheactualfeedbacktuningengine["LatheActualFeedbackTuningEngine"]:::tier1
    E_latheadvancedoperationsengine["LatheAdvancedOperationsEngine"]:::tier1
    E_latheagicontinuouslearningengine["LatheAGIContinuousLearningEngine"]:::tier1
    E_latheagifeaturebridgeengine["LatheAGIFeatureBridgeEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    ER --> E_barfeedpitchoptimizerengine
    ER --> E_latheactivelearningengine
    ER --> E_latheactualfeedbacktuningengine
    ER --> E_latheadvancedoperationsengine
    ER --> E_latheagicontinuouslearningengine
    ER --> E_latheagifeaturebridgeengine
    E_barfeedpitchoptimizerengine --> F
    E_latheactivelearningengine --> F
    E_latheactualfeedbacktuningengine --> F
    E_latheadvancedoperationsengine --> F
    E_latheagicontinuouslearningengine --> F
    E_latheagifeaturebridgeengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-lathe]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/lathe/`

