---
title: Domain flow — other
type: architecture
domain: other
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-other, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-other.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `other`

> Narrow lens on the `other` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 348 (sample of 6 shown)
**Dispatcher:** _(no L4 match)_
**Sample actions:** 0

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming other)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["(no dispatcher) dispatcher<br/>L4"]:::tier2
    ER["other engines (348)<br/>L5 rollup"]:::tier1
    E_absorptionchillerengine["AbsorptionChillerEngine"]:::tier1
    E_abstractionhierarchyengine["AbstractionHierarchyEngine"]:::tier1
    E_accesscontrollistengine["AccessControlListEngine"]:::tier1
    E_accumulatorengine["AccumulatorEngine"]:::tier1
    E_actionableerrortemplateengine["ActionableErrorTemplateEngine"]:::tier1
    E_actionschemacacheengine["ActionSchemaCacheEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    ER --> E_absorptionchillerengine
    ER --> E_abstractionhierarchyengine
    ER --> E_accesscontrollistengine
    ER --> E_accumulatorengine
    ER --> E_actionableerrortemplateengine
    ER --> E_actionschemacacheengine
    E_absorptionchillerengine --> F
    E_abstractionhierarchyengine --> F
    E_accesscontrollistengine --> F
    E_accumulatorengine --> F
    E_actionableerrortemplateengine --> F
    E_actionschemacacheengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-other]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/other/`

