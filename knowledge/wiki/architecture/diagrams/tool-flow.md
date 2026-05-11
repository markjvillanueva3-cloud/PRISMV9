---
title: Domain flow — tool
type: architecture
domain: tool
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-tool, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-tool.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `tool`

> Narrow lens on the `tool` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 39 (sample of 6 shown)
**Dispatcher:** `toolpath`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming tool)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["toolpath dispatcher<br/>L4"]:::tier2
    A_strategy-select["strategy_select<br/>L4a"]:::tier2a
    A_params-calculate["params_calculate<br/>L4a"]:::tier2a
    A_strategy-search["strategy_search<br/>L4a"]:::tier2a
    A_strategy-list["strategy_list<br/>L4a"]:::tier2a
    A_strategy-info["strategy_info<br/>L4a"]:::tier2a
    A_stats["stats<br/>L4a"]:::tier2a
    ER["tool engines (39)<br/>L5 rollup"]:::tier1
    E_cycletimeaccuracyengine["CycleTimeAccuracyEngine"]:::tier1
    E_endtoendpipelineengine["EndToEndPipelineEngine"]:::tier1
    E_gcodeverificationengine["GCodeVerificationEngine"]:::tier1
    E_holderoperationmatchengine["HolderOperationMatchEngine"]:::tier1
    E_laserwaterjetpostextension["LaserWaterjetPostExtension"]:::tier1
    E_novelpostprocessorbridgeengine["NovelPostProcessorBridgeEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_strategy-select
    D --> A_params-calculate
    D --> A_strategy-search
    D --> A_strategy-list
    D --> A_strategy-info
    D --> A_stats
    A_strategy-select --> ER
    A_params-calculate --> ER
    A_strategy-search --> ER
    A_strategy-list --> ER
    A_strategy-info --> ER
    A_stats --> ER
    ER --> E_cycletimeaccuracyengine
    ER --> E_endtoendpipelineengine
    ER --> E_gcodeverificationengine
    ER --> E_holderoperationmatchengine
    ER --> E_laserwaterjetpostextension
    ER --> E_novelpostprocessorbridgeengine
    E_cycletimeaccuracyengine --> F
    E_endtoendpipelineengine --> F
    E_gcodeverificationengine --> F
    E_holderoperationmatchengine --> F
    E_laserwaterjetpostextension --> F
    E_novelpostprocessorbridgeengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-tool]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/tool/`
- Dispatcher entry: [[dispatcher-toolpath]]
