---
title: Domain flow — machine
type: architecture
domain: machine
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: 2026-05-11
tags: [architecture, system-viz, mermaid, domain-machine, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-machine.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — `machine`

> Narrow lens on the `machine` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** 37 (sample of 6 shown)
**Dispatcher:** `machineLive`
**Sample actions:** 6

## Flow diagram

```mermaid
flowchart LR
    P0["Persona<br/>(operator/planner)"]:::tier5
    L1F["Frontend page<br/>(consuming machine)"]:::tier4
    TR["Transport<br/>(MCP :3100)"]:::tier3
    D["machineLive dispatcher<br/>L4"]:::tier2
    A_machineconnectivity["machineConnectivity<br/>L4a"]:::tier2a
    A_adaptivecontrol["adaptiveControl<br/>L4a"]:::tier2a
    A_predictivemaintenance["predictiveMaintenance<br/>L4a"]:::tier2a
    A_tool-crib-status["tool_crib_status<br/>L4a"]:::tier2a
    A_digital-twin-state["digital_twin_state<br/>L4a"]:::tier2a
    A_predictive-maintenance-alert["predictive_maintenance_alert<br/>L4a"]:::tier2a
    ER["machine engines (37)<br/>L5 rollup"]:::tier1
    E_balancingmachineengine["BalancingMachineEngine"]:::tier1
    E_batchcamcontrollerengines["BatchCAMControllerEngines"]:::tier1
    E_cobotmachiningengine["CobotMachiningEngine"]:::tier1
    E_criticalspeedengine["CriticalSpeedEngine"]:::tier1
    E_dynamicbalanceengine["DynamicBalanceEngine"]:::tier1
    E_gaugingengine["GaugingEngine"]:::tier1
    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0
    P0 --> L1F --> TR --> D
    D --> A_machineconnectivity
    D --> A_adaptivecontrol
    D --> A_predictivemaintenance
    D --> A_tool-crib-status
    D --> A_digital-twin-state
    D --> A_predictive-maintenance-alert
    A_machineconnectivity --> ER
    A_adaptivecontrol --> ER
    A_predictivemaintenance --> ER
    A_tool-crib-status --> ER
    A_digital-twin-state --> ER
    A_predictive-maintenance-alert --> ER
    ER --> E_balancingmachineengine
    ER --> E_batchcamcontrollerengines
    ER --> E_cobotmachiningengine
    ER --> E_criticalspeedengine
    ER --> E_dynamicbalanceengine
    ER --> E_gaugingengine
    E_balancingmachineengine --> F
    E_batchcamcontrollerengines --> F
    E_cobotmachiningengine --> F
    E_criticalspeedengine --> F
    E_dynamicbalanceengine --> F
    E_gaugingengine --> F
    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4
    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365
    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9
    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9
    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9
    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a
    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a
```

## See also

- Full domain entry: [[domain-machine]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: `knowledge/wiki/architecture/engines/machine/`
- Dispatcher entry: [[dispatcher-machinelive]]
