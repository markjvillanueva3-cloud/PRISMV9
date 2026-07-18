---
title: Domain flow — physics
type: architecture
domain: physics
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-23
tags: [architecture, system-viz, mermaid, domain-physics, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-physics.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `physics`

> Narrow lens on the `physics` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 33 (sample of 6 shown)
**Dispatcher:** `vibrationPhysics`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming physics)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["vibrationPhysics dispatcher<br/>L4"]:::tier2
    A_vam["vam<br/>L4a"]:::tier2a
    A_dampening["dampening<br/>L4a"]:::tier2a
    A_isolation["isolation<br/>L4a"]:::tier2a
    A_fourier["fourier<br/>L4a"]:::tier2a
    A_wavelet["wavelet<br/>L4a"]:::tier2a
    A_chatter["chatter<br/>L4a"]:::tier2a
    ER["physics engines (33)<br/>L5 rollup"]:::tier1
    E_barstockvibrationengine["BarStockVibrationEngine"]:::tier1
    E_chanceconstrainedoptimizationengine["ChanceConstrainedOptimizationEngine"]:::tier1
    E_coffinmansonfatigueengine["CoffinMansonFatigueEngine"]:::tier1
    E_constraintsatisfactionengine["ConstraintSatisfactionEngine"]:::tier1
    E_cuttingthermalengine["CuttingThermalEngine"]:::tier1
    E_fatiguelifeengine["FatigueLifeEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_vam
    D --> A_dampening
    D --> A_isolation
    D --> A_fourier
    D --> A_wavelet
    D --> A_chatter
    A_vam --> ER
    A_dampening --> ER
    A_isolation --> ER
    A_fourier --> ER
    A_wavelet --> ER
    A_chatter --> ER
    ER --> E_barstockvibrationengine
    ER --> E_chanceconstrainedoptimizationengine
    ER --> E_coffinmansonfatigueengine
    ER --> E_constraintsatisfactionengine
    ER --> E_cuttingthermalengine
    ER --> E_fatiguelifeengine
    E_barstockvibrationengine --> F
    E_chanceconstrainedoptimizationengine --> F
    E_coffinmansonfatigueengine --> F
    E_constraintsatisfactionengine --> F
    E_cuttingthermalengine --> F
    E_fatiguelifeengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-physics]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/physics/`
- Dispatcher entry: [[dispatcher-vibrationphysics]]
