---
title: Domain flow — cross
type: architecture
domain: cross
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-18
tags: [architecture, system-viz, mermaid, domain-cross, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-cross.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `cross`

> Narrow lens on the `cross` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 31 (sample of 6 shown)
**Dispatcher:** _(no L4 match)_
**Sample actions:** 0

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming cross)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["(no dispatcher) dispatcher<br/>L4"]:::tier2
    ER["cross engines (31)<br/>L5 rollup"]:::tier1
    E_crosscatalogvalidationengine["CrossCatalogValidationEngine"]:::tier1
    E_crosscustomerpolicytransferengine["CrossCustomerPolicyTransferEngine"]:::tier1
    E_crossprocessapsclassificationengine["CrossProcessAPSClassificationEngine"]:::tier1
    E_crossprocessaudiotabularfusionengine["CrossProcessAudioTabularFusionEngine"]:::tier1
    E_crossprocessbayesiandoeplannerengine["CrossProcessBayesianDOEPlannerEngine"]:::tier1
    E_crossprocessbayesianmlpengine["CrossProcessBayesianMLPEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    ER --> E_crosscatalogvalidationengine
    ER --> E_crosscustomerpolicytransferengine
    ER --> E_crossprocessapsclassificationengine
    ER --> E_crossprocessaudiotabularfusionengine
    ER --> E_crossprocessbayesiandoeplannerengine
    ER --> E_crossprocessbayesianmlpengine
    E_crosscatalogvalidationengine --> F
    E_crosscustomerpolicytransferengine --> F
    E_crossprocessapsclassificationengine --> F
    E_crossprocessaudiotabularfusionengine --> F
    E_crossprocessbayesiandoeplannerengine --> F
    E_crossprocessbayesianmlpengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-cross]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/cross/`

