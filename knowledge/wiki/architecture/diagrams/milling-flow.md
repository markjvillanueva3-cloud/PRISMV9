---
title: Domain flow — milling
type: architecture
domain: milling
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-18
tags: [architecture, system-viz, mermaid, domain-milling, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-milling.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `milling`

> Narrow lens on the `milling` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 29 (sample of 6 shown)
**Dispatcher:** _(no L4 match)_
**Sample actions:** 0

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming milling)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["(no dispatcher) dispatcher<br/>L4"]:::tier2
    ER["milling engines (29)<br/>L5 rollup"]:::tier1
    E_chamfermillingengine["ChamferMillingEngine"]:::tier1
    E_helicalmillingengine["HelicalMillingEngine"]:::tier1
    E_micromillingengine["MicroMillingEngine"]:::tier1
    E_micromillingsizeeffectengine["MicroMillingSizeEffectEngine"]:::tier1
    E_millingagiorchestrationengine["MillingAGIOrchestrationEngine"]:::tier1
    E_millingaiunificationengine["MillingAIUnificationEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    ER --> E_chamfermillingengine
    ER --> E_helicalmillingengine
    ER --> E_micromillingengine
    ER --> E_micromillingsizeeffectengine
    ER --> E_millingagiorchestrationengine
    ER --> E_millingaiunificationengine
    E_chamfermillingengine --> F
    E_helicalmillingengine --> F
    E_micromillingengine --> F
    E_micromillingsizeeffectengine --> F
    E_millingagiorchestrationengine --> F
    E_millingaiunificationengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-milling]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/milling/`

