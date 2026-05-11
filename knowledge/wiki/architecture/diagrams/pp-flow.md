---
title: Domain flow — pp
type: architecture
domain: pp
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-pp, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-pp.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `pp`

> Narrow lens on the `pp` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 65 (sample of 6 shown)
**Dispatcher:** `pp`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming pp)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["pp dispatcher<br/>L4"]:::tier2
    A_pp["pp<br/>L4a"]:::tier2a
    A_pipeline["pipeline<br/>L4a"]:::tier2a
    A_analyzer["analyzer<br/>L4a"]:::tier2a
    A_neural["neural<br/>L4a"]:::tier2a
    A_physics["physics<br/>L4a"]:::tier2a
    A_tribal["tribal<br/>L4a"]:::tier2a
    ER["pp engines (65)<br/>L5 rollup"]:::tier1
    E_crossdisciplinaryformulaintegrationengine["CrossDisciplinaryFormulaIntegrationEngine"]:::tier1
    E_postprocessoraiselfawarenessintegrationengine["PostProcessorAISelfAwarenessIntegrationEngine"]:::tier1
    E_postprocessorcognitiveengine["PostProcessorCognitiveEngine"]:::tier1
    E_postprocessordeepcognitionengine["PostProcessorDeepCognitionEngine"]:::tier1
    E_postprocessordeepintelligenceengine["PostProcessorDeepIntelligenceEngine"]:::tier1
    E_postprocessorknowledgegraphengine["PostProcessorKnowledgeGraphEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_pp
    D --> A_pipeline
    D --> A_analyzer
    D --> A_neural
    D --> A_physics
    D --> A_tribal
    A_pp --> ER
    A_pipeline --> ER
    A_analyzer --> ER
    A_neural --> ER
    A_physics --> ER
    A_tribal --> ER
    ER --> E_crossdisciplinaryformulaintegrationengine
    ER --> E_postprocessoraiselfawarenessintegrationengine
    ER --> E_postprocessorcognitiveengine
    ER --> E_postprocessordeepcognitionengine
    ER --> E_postprocessordeepintelligenceengine
    ER --> E_postprocessorknowledgegraphengine
    E_crossdisciplinaryformulaintegrationengine --> F
    E_postprocessoraiselfawarenessintegrationengine --> F
    E_postprocessorcognitiveengine --> F
    E_postprocessordeepcognitionengine --> F
    E_postprocessordeepintelligenceengine --> F
    E_postprocessorknowledgegraphengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-pp]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/pp/`
- Dispatcher entry: [[dispatcher-pp]]
