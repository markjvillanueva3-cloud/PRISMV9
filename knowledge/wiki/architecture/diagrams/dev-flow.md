---
title: Domain flow — dev
type: architecture
domain: dev
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-dev, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-dev.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `dev`

> Narrow lens on the `dev` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 48 (sample of 6 shown)
**Dispatcher:** `dev`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming dev)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["dev dispatcher<br/>L4"]:::tier2
    A_session-boot["session_boot<br/>L4a"]:::tier2a
    A_build["build<br/>L4a"]:::tier2a
    A_code-template["code_template<br/>L4a"]:::tier2a
    A_code-search["code_search<br/>L4a"]:::tier2a
    A_file-read["file_read<br/>L4a"]:::tier2a
    A_file-write["file_write<br/>L4a"]:::tier2a
    ER["dev engines (48)<br/>L5 rollup"]:::tier1
    E_anchoredconfidenceengine["AnchoredConfidenceEngine"]:::tier1
    E_autoforgeengine["AutoForgeEngine"]:::tier1
    E_autoschemageneratorengine["AutoSchemaGeneratorEngine"]:::tier1
    E_autotestgeneratorengine["AutoTestGeneratorEngine"]:::tier1
    E_autowiringengine["AutoWiringEngine"]:::tier1
    E_awarenessbootstrapengine["AwarenessBootstrapEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_session-boot
    D --> A_build
    D --> A_code-template
    D --> A_code-search
    D --> A_file-read
    D --> A_file-write
    A_session-boot --> ER
    A_build --> ER
    A_code-template --> ER
    A_code-search --> ER
    A_file-read --> ER
    A_file-write --> ER
    ER --> E_anchoredconfidenceengine
    ER --> E_autoforgeengine
    ER --> E_autoschemageneratorengine
    ER --> E_autotestgeneratorengine
    ER --> E_autowiringengine
    ER --> E_awarenessbootstrapengine
    E_anchoredconfidenceengine --> F
    E_autoforgeengine --> F
    E_autoschemageneratorengine --> F
    E_autotestgeneratorengine --> F
    E_autowiringengine --> F
    E_awarenessbootstrapengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-dev]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/dev/`
- Dispatcher entry: [[dispatcher-dev]]
