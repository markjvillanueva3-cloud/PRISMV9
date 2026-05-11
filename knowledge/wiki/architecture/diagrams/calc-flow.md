---
title: Domain flow — calc
type: architecture
domain: calc
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-calc, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-calc.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `calc`

> Narrow lens on the `calc` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 304 (sample of 6 shown)
**Dispatcher:** `calc`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming calc)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["calc dispatcher<br/>L4"]:::tier2
    A_cutting-force["cutting_force<br/>L4a"]:::tier2a
    A_tool-life["tool_life<br/>L4a"]:::tier2a
    A_speed-feed["speed_feed<br/>L4a"]:::tier2a
    A_flow-stress["flow_stress<br/>L4a"]:::tier2a
    A_surface-finish["surface_finish<br/>L4a"]:::tier2a
    A_mrr["mrr<br/>L4a"]:::tier2a
    ER["calc engines (304)<br/>L5 rollup"]:::tier1
    E_abrasivejetmachiningengine["AbrasiveJetMachiningEngine"]:::tier1
    E_acosequencerengine["AcoSequencerEngine"]:::tier1
    E_adhesivebondingengine["AdhesiveBondingEngine"]:::tier1
    E_advancedchipthicknessengine["AdvancedChipThicknessEngine"]:::tier1
    E_advancedmlstatisticsengine["AdvancedMLStatisticsEngine"]:::tier1
    E_advancedstatisticallearningengine["AdvancedStatisticalLearningEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_cutting-force
    D --> A_tool-life
    D --> A_speed-feed
    D --> A_flow-stress
    D --> A_surface-finish
    D --> A_mrr
    A_cutting-force --> ER
    A_tool-life --> ER
    A_speed-feed --> ER
    A_flow-stress --> ER
    A_surface-finish --> ER
    A_mrr --> ER
    ER --> E_abrasivejetmachiningengine
    ER --> E_acosequencerengine
    ER --> E_adhesivebondingengine
    ER --> E_advancedchipthicknessengine
    ER --> E_advancedmlstatisticsengine
    ER --> E_advancedstatisticallearningengine
    E_abrasivejetmachiningengine --> F
    E_acosequencerengine --> F
    E_adhesivebondingengine --> F
    E_advancedchipthicknessengine --> F
    E_advancedmlstatisticsengine --> F
    E_advancedstatisticallearningengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-calc]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/calc/`
- Dispatcher entry: [[dispatcher-calc]]
