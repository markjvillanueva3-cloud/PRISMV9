---
title: Domain flow — wedm
type: architecture
domain: wedm
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-wedm, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-wedm.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `wedm`

> Narrow lens on the `wedm` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 65 (sample of 6 shown)
**Dispatcher:** _(no L4 match)_
**Sample actions:** 0

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming wedm)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["(no dispatcher) dispatcher<br/>L4"]:::tier2
    ER["wedm engines (65)<br/>L5 rollup"]:::tier1
    E_edmpostprocessorextension["EDMPostProcessorExtension"]:::tier1
    E_mastercamedmbridge["MastercamEDMBridge"]:::tier1
    E_oneclickwedmgeneratorengine["OneClickWEDMGeneratorEngine"]:::tier1
    E_ppgprovenancewireengine["PPGProvenanceWireEngine"]:::tier1
    E_wedmadaptivepassengine["WEDMAdaptivePassEngine"]:::tier1
    E_wedmautonomyauditengine["WEDMAutonomyAuditEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    ER --> E_edmpostprocessorextension
    ER --> E_mastercamedmbridge
    ER --> E_oneclickwedmgeneratorengine
    ER --> E_ppgprovenancewireengine
    ER --> E_wedmadaptivepassengine
    ER --> E_wedmautonomyauditengine
    E_edmpostprocessorextension --> F
    E_mastercamedmbridge --> F
    E_oneclickwedmgeneratorengine --> F
    E_ppgprovenancewireengine --> F
    E_wedmadaptivepassengine --> F
    E_wedmautonomyauditengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-wedm]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/wedm/`

