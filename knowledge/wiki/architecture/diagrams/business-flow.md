---
title: Domain flow — business
type: architecture
domain: business
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-business, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-business.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `business`

> Narrow lens on the `business` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 35 (sample of 6 shown)
**Dispatcher:** `business`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming business)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["business dispatcher<br/>L4"]:::tier2
    A_financial["financial<br/>L4a"]:::tier2a
    A_inventory["inventory<br/>L4a"]:::tier2a
    A_joblifecycle["jobLifecycle<br/>L4a"]:::tier2a
    A_purchasing["purchasing<br/>L4a"]:::tier2a
    A_jobcosting["jobCosting<br/>L4a"]:::tier2a
    A_quoting["quoting<br/>L4a"]:::tier2a
    ER["business engines (35)<br/>L5 rollup"]:::tier1
    E_accountinghardeningengine["AccountingHardeningEngine"]:::tier1
    E_additivequoteengine["AdditiveQuoteEngine"]:::tier1
    E_advancedreportrendererengine["AdvancedReportRendererEngine"]:::tier1
    E_batchoptimizationengine["BatchOptimizationEngine"]:::tier1
    E_billingengine["BillingEngine"]:::tier1
    E_castingquoteengine["CastingQuoteEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_financial
    D --> A_inventory
    D --> A_joblifecycle
    D --> A_purchasing
    D --> A_jobcosting
    D --> A_quoting
    A_financial --> ER
    A_inventory --> ER
    A_joblifecycle --> ER
    A_purchasing --> ER
    A_jobcosting --> ER
    A_quoting --> ER
    ER --> E_accountinghardeningengine
    ER --> E_additivequoteengine
    ER --> E_advancedreportrendererengine
    ER --> E_batchoptimizationengine
    ER --> E_billingengine
    ER --> E_castingquoteengine
    E_accountinghardeningengine --> F
    E_additivequoteengine --> F
    E_advancedreportrendererengine --> F
    E_batchoptimizationengine --> F
    E_billingengine --> F
    E_castingquoteengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-business]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/business/`
- Dispatcher entry: [[dispatcher-business]]
