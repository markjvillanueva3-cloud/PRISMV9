---
title: Domain flow — cad
type: architecture
domain: cad
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-cad, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-cad.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `cad`

> Narrow lens on the `cad` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 52 (sample of 6 shown)
**Dispatcher:** `cadAutomation`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming cad)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["cadAutomation dispatcher<br/>L4"]:::tier2
    A_route["route<br/>L4a"]:::tier2a
    A_list-supported-extensions["list_supported_extensions<br/>L4a"]:::tier2a
    A_supports-extension["supports_extension<br/>L4a"]:::tier2a
    A_open["open<br/>L4a"]:::tier2a
    A_close["close<br/>L4a"]:::tier2a
    A_get-geometry["get_geometry<br/>L4a"]:::tier2a
    ER["cad engines (52)<br/>L5 rollup"]:::tier1
    E_assemblyengine["AssemblyEngine"]:::tier1
    E_boilertubeengine["BoilerTubeEngine"]:::tier1
    E_cadaccesscontrolrbacabacengine["CADAccessControlRBACABACEngine"]:::tier1
    E_cadaistatemachineengine["CADAIStateMachineEngine"]:::tier1
    E_cadassemblygraphengine["CADAssemblyGraphEngine"]:::tier1
    E_cadbundlereplaycompareengine["CADBundleReplayCompareEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_route
    D --> A_list-supported-extensions
    D --> A_supports-extension
    D --> A_open
    D --> A_close
    D --> A_get-geometry
    A_route --> ER
    A_list-supported-extensions --> ER
    A_supports-extension --> ER
    A_open --> ER
    A_close --> ER
    A_get-geometry --> ER
    ER --> E_assemblyengine
    ER --> E_boilertubeengine
    ER --> E_cadaccesscontrolrbacabacengine
    ER --> E_cadaistatemachineengine
    ER --> E_cadassemblygraphengine
    ER --> E_cadbundlereplaycompareengine
    E_assemblyengine --> F
    E_boilertubeengine --> F
    E_cadaccesscontrolrbacabacengine --> F
    E_cadaistatemachineengine --> F
    E_cadassemblygraphengine --> F
    E_cadbundlereplaycompareengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-cad]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/cad/`
- Dispatcher entry: [[dispatcher-cadautomation]]
