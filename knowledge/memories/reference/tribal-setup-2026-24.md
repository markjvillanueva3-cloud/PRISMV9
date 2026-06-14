---
type: tribal-consolidation
topic: setup
iso_week: 2026-24
cluster_size: 349
cluster_size_synthesized: 10
aggregate_confidence: 80.3
tags: ["document-learned", "monolith", "data-lane", "state:ported", "type:object", "doc:monolith-data-lane-tips", "monolith-category:machines", "monolith-category:databases"]
materials: []
operations: ["turning", "finishing", "wire_edm", "milling"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: setup — 2026-24

_349 tips clustered on 'setup' with mean confidence 80.3/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Tool length measurement best practice

- **id:** `tk-009` · **confidence:** 88/100 · **usage:** 31
- **source:** operator:precision_lead
- **tags:** tool-length, thermal-growth, calibration

ALWAYS measure tool length with spindle warm (run at 80% RPM for 5 minutes first). Cold spindle can be 0.01-0.03mm shorter than running temperature. On tight tolerance work (±0.01mm), this matters.

### 2. Monolith: Lathe

- **id:** `TK-DL-monolith-data-lane-tips-062` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:machines, state:ported, type:object, ported:engines/FusionLathePostDeltaRegistryEngine.ts

Legacy monolith data-lane module **PRISM_LATHE** (category: machines, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/FusionLathePostDeltaRegistryEngine.ts`. Audit note: 190 strong matches — ported (possibly d…

### 3. Monolith: Machine 3d Database

- **id:** `TK-DL-monolith-data-lane-tips-067` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:databases, state:ported, type:object, ported:engines/MachineConfigDatabaseEngine.ts

Legacy monolith data-lane module **PRISM_MACHINE_3D_DATABASE** (category: databases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/MachineConfigDatabaseEngine.ts`. Audit note: 2 strong matches — ported (poss…

### 4. Monolith: Machine 3d Models

- **id:** `TK-DL-monolith-data-lane-tips-068` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:machines, state:ported, type:object, ported:engines/BalancingMachineEngine.ts

Legacy monolith data-lane module **PRISM_MACHINE_3D_MODELS** (category: machines, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/BalancingMachineEngine.ts`. Audit note: 60 strong matches — ported (possibly du…

### 5. Monolith: Machine 3d System

- **id:** `TK-DL-monolith-data-lane-tips-071` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:machines, state:ported, type:object, ported:engines/BalancingMachineEngine.ts

Legacy monolith data-lane module **PRISM_MACHINE_3D_SYSTEM** (category: machines, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/BalancingMachineEngine.ts`. Audit note: 60 strong matches — ported (possibly du…

### 6. Monolith: State Machine

- **id:** `TK-DL-monolith-data-lane-tips-112` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:machines, state:ported, type:object, ported:engines/MachineKinematicStateEngine.ts

Legacy monolith data-lane module **PRISM_STATE_MACHINE** (category: machines, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/MachineKinematicStateEngine.ts`. Audit note: 2 strong matches — ported (possibly du…

### 7. Monolith: Surface Finish Database

- **id:** `TK-DL-monolith-data-lane-tips-115` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:databases, state:ported, type:object, ported:engines/SurfaceFinishDatabaseEngine.ts

Legacy monolith data-lane module **PRISM_SURFACE_FINISH_DATABASE** (category: databases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/SurfaceFinishDatabaseEngine.ts`. Audit note: 7 strong matches — ported (…

### 8. JM Die H175 master offset convention — use H175 as the primary offset base

- **id:** `jm-die-001` · **confidence:** 95/100 · **usage:** 0
- **source:** jm_die_production_analysis
- **tags:** wire-edm, jm-die, mitsubishi, fa-20s, h-register, offset

JM Die programs consistently use H175 as the master offset register for rough cut geometry. When setting up a new program, declare H175 first with the total wire + overburn offset (typically 0.0085-0.010"), then cascade H1-H4 or H1-H5 for s…

### 9. Specify model for current job

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-4-123` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-4
- **tags:** model, document-learned, doc:doc-hypermill-hypermill-manual-en-4, operation:milling

Define the milling area required for the current job.

### 10. Define additional surfaces for safety

- **id:** `TK-DL-doc-hypermill-hypermill-manual-en-4-124` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-hypermill-manual-en-4
- **tags:** additional_surfaces, document-learned, doc:doc-hypermill-hypermill-manual-en-4

Temporary safety surfaces to avoid unnecessary rapid travel movements.

## Common Threads

Top tags across the cluster: `document-learned`, `monolith`, `data-lane`, `state:ported`, `type:object`, `doc:monolith-data-lane-tips`, `monolith-category:machines`, `monolith-category:databases`.

## Sources Cited

- document:monolith-data-lane-tips (6)
- document:doc-hypermill-hypermill-manual-en-4 (2)
- operator:precision_lead (1)
- jm_die_production_analysis (1)

## Citations

- [[tk-009]]
- [[TK-DL-monolith-data-lane-tips-062]]
- [[TK-DL-monolith-data-lane-tips-067]]
- [[TK-DL-monolith-data-lane-tips-068]]
- [[TK-DL-monolith-data-lane-tips-071]]
- [[TK-DL-monolith-data-lane-tips-112]]
- [[TK-DL-monolith-data-lane-tips-115]]
- [[jm-die-001]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-4-123]]
- [[TK-DL-doc-hypermill-hypermill-manual-en-4-124]]

