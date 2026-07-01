---
title: Domain flow — bridge
type: architecture
domain: bridge
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-18
tags: [architecture, system-viz, mermaid, domain-bridge, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-bridge.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `bridge`

> Narrow lens on the `bridge` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 39 (sample of 6 shown)
**Dispatcher:** `bridge`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming bridge)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["bridge dispatcher<br/>L4"]:::tier2
    A_register-endpoint["register_endpoint<br/>L4a"]:::tier2a
    A_remove-endpoint["remove_endpoint<br/>L4a"]:::tier2a
    A_set-status["set_status<br/>L4a"]:::tier2a
    A_list-endpoints["list_endpoints<br/>L4a"]:::tier2a
    A_create-key["create_key<br/>L4a"]:::tier2a
    A_revoke-key["revoke_key<br/>L4a"]:::tier2a
    ER["bridge engines (39)<br/>L5 rollup"]:::tier1
    E_bobcadcambridgeengine["BobCADCAMBridgeEngine"]:::tier1
    E_cadbridge["CadBridge"]:::tier1
    E_caminhostresultsbridgeengine["CAMInHostResultsBridgeEngine"]:::tier1
    E_camloraadaptertrainerengine["CAMLoRAAdapterTrainerEngine"]:::tier1
    E_camspeedfeedbridgeengine["CAMSpeedFeedBridgeEngine"]:::tier1
    E_catiacaav5bridgeengine["CATIACAAV5BridgeEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_register-endpoint
    D --> A_remove-endpoint
    D --> A_set-status
    D --> A_list-endpoints
    D --> A_create-key
    D --> A_revoke-key
    A_register-endpoint --> ER
    A_remove-endpoint --> ER
    A_set-status --> ER
    A_list-endpoints --> ER
    A_create-key --> ER
    A_revoke-key --> ER
    ER --> E_bobcadcambridgeengine
    ER --> E_cadbridge
    ER --> E_caminhostresultsbridgeengine
    ER --> E_camloraadaptertrainerengine
    ER --> E_camspeedfeedbridgeengine
    ER --> E_catiacaav5bridgeengine
    E_bobcadcambridgeengine --> F
    E_cadbridge --> F
    E_caminhostresultsbridgeengine --> F
    E_camloraadaptertrainerengine --> F
    E_camspeedfeedbridgeengine --> F
    E_catiacaav5bridgeengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-bridge]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/bridge/`
- Dispatcher entry: [[dispatcher-bridge]]
