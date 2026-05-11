---
title: Domain flow — cam
type: architecture
domain: cam
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-cam, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-cam.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `cam`

> Narrow lens on the `cam` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 95 (sample of 6 shown)
**Dispatcher:** `cam`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming cam)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["cam dispatcher<br/>L4"]:::tier2
    A_cam["cam<br/>L4a"]:::tier2a
    A_toolpath["toolpath<br/>L4a"]:::tier2a
    A_post["post<br/>L4a"]:::tier2a
    A_collision["collision<br/>L4a"]:::tier2a
    A_stock["stock<br/>L4a"]:::tier2a
    A_toolasm["toolasm<br/>L4a"]:::tier2a
    ER["cam engines (95)<br/>L5 rollup"]:::tier1
    E_advancedpostphysicsengine["AdvancedPostPhysicsEngine"]:::tier1
    E_anomalydetectionengine["AnomalyDetectionEngine"]:::tier1
    E_batchcamengine["BatchCAMEngine"]:::tier1
    E_batchsizestrategyengine["BatchSizeStrategyEngine"]:::tier1
    E_blueprintprogramjoinengine["BlueprintProgramJoinEngine"]:::tier1
    E_camanalyzeengine["CAMAnalyzeEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_cam
    D --> A_toolpath
    D --> A_post
    D --> A_collision
    D --> A_stock
    D --> A_toolasm
    A_cam --> ER
    A_toolpath --> ER
    A_post --> ER
    A_collision --> ER
    A_stock --> ER
    A_toolasm --> ER
    ER --> E_advancedpostphysicsengine
    ER --> E_anomalydetectionengine
    ER --> E_batchcamengine
    ER --> E_batchsizestrategyengine
    ER --> E_blueprintprogramjoinengine
    ER --> E_camanalyzeengine
    E_advancedpostphysicsengine --> F
    E_anomalydetectionengine --> F
    E_batchcamengine --> F
    E_batchsizestrategyengine --> F
    E_blueprintprogramjoinengine --> F
    E_camanalyzeengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-cam]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/cam/`
- Dispatcher entry: [[dispatcher-cam]]
