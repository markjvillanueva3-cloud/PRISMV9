---
title: Domain flow — ai
type: architecture
domain: ai
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-ai, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-ai.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `ai`

> Narrow lens on the `ai` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 44 (sample of 6 shown)
**Dispatcher:** `aiReasoning`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming ai)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["aiReasoning dispatcher<br/>L4"]:::tier2
    A_ai-route-mill-pipeline["ai_route_mill_pipeline<br/>L4a"]:::tier2a
    A_ai-mill-agi-reason["ai_mill_agi_reason<br/>L4a"]:::tier2a
    A_ai-mill-awareness-query["ai_mill_awareness_query<br/>L4a"]:::tier2a
    A_ai-mill-scientific-analyze["ai_mill_scientific_analyze<br/>L4a"]:::tier2a
    A_ai-mill-wisdom-query["ai_mill_wisdom_query<br/>L4a"]:::tier2a
    A_ai-mill-adaptive-strategy["ai_mill_adaptive_strategy<br/>L4a"]:::tier2a
    ER["ai engines (44)<br/>L5 rollup"]:::tier1
    E_activelearningstrategyengine["ActiveLearningStrategyEngine"]:::tier1
    E_aiautoutilizationengine["AIAutoUtilizationEngine"]:::tier1
    E_aicapabilitymaximizerengine["AICapabilityMaximizerEngine"]:::tier1
    E_aircompressorengine["AirCompressorEngine"]:::tier1
    E_aircutdetectionengine["AirCutDetectionEngine"]:::tier1
    E_airductengine["AirDuctEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_ai-route-mill-pipeline
    D --> A_ai-mill-agi-reason
    D --> A_ai-mill-awareness-query
    D --> A_ai-mill-scientific-analyze
    D --> A_ai-mill-wisdom-query
    D --> A_ai-mill-adaptive-strategy
    A_ai-route-mill-pipeline --> ER
    A_ai-mill-agi-reason --> ER
    A_ai-mill-awareness-query --> ER
    A_ai-mill-scientific-analyze --> ER
    A_ai-mill-wisdom-query --> ER
    A_ai-mill-adaptive-strategy --> ER
    ER --> E_activelearningstrategyengine
    ER --> E_aiautoutilizationengine
    ER --> E_aicapabilitymaximizerengine
    ER --> E_aircompressorengine
    ER --> E_aircutdetectionengine
    ER --> E_airductengine
    E_activelearningstrategyengine --> F
    E_aiautoutilizationengine --> F
    E_aicapabilitymaximizerengine --> F
    E_aircompressorengine --> F
    E_aircutdetectionengine --> F
    E_airductengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-ai]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/ai/`
- Dispatcher entry: [[dispatcher-aireasoning]]
