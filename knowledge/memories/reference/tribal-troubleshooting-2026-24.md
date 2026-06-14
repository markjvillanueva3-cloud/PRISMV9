---
type: tribal-consolidation
topic: troubleshooting
iso_week: 2026-24
cluster_size: 41
cluster_size_synthesized: 10
aggregate_confidence: 89.8
tags: ["document-learned", "monolith", "data-lane", "state:ported", "type:object", "doc:monolith-data-lane-tips", "monolith-category:databases", "monolith-category:knowledge_bases"]
materials: ["P"]
operations: ["wire_edm", "drilling"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: troubleshooting — 2026-24

_41 tips clustered on 'troubleshooting' with mean confidence 89.8/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Monolith: Capability Registry

- **id:** `TK-DL-monolith-data-lane-tips-015` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:databases, state:ported, type:object, ported:engines/CapabilityCensusEngine.ts

Legacy monolith data-lane module **PRISM_CAPABILITY_REGISTRY** (category: databases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/CapabilityCensusEngine.ts`. Audit note: 12 strong matches — ported (possibly…

### 2. Monolith: Consolidation Registry

- **id:** `TK-DL-monolith-data-lane-tips-029` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:databases, state:ported, type:object, ported:engines/MemoryConsolidationEngine.ts

Legacy monolith data-lane module **PRISM_CONSOLIDATION_REGISTRY** (category: databases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/MemoryConsolidationEngine.ts`.

### 3. Monolith: Knowledge Base

- **id:** `TK-DL-monolith-data-lane-tips-055` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:knowledge_bases, state:ported, type:object, ported:engines/FeatureStrategyKnowledgeBaseEngine.ts

Legacy monolith data-lane module **PRISM_KNOWLEDGE_BASE** (category: knowledge_bases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/FeatureStrategyKnowledgeBaseEngine.ts`. Audit note: 2 strong matches — port…

### 4. Monolith: Knowledge Fusion

- **id:** `TK-DL-monolith-data-lane-tips-056` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:knowledge_bases, state:ported, type:object, ported:engines/FusionStrategyKnowledgeEngine.ts

Legacy monolith data-lane module **PRISM_KNOWLEDGE_FUSION** (category: knowledge_bases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/FusionStrategyKnowledgeEngine.ts`.

### 5. Monolith: Knowledge Graph

- **id:** `TK-DL-monolith-data-lane-tips-057` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:knowledge_bases, state:ported, type:object, ported:engines/KnowledgeGraphEngine.ts

Legacy monolith data-lane module **PRISM_KNOWLEDGE_GRAPH** (category: knowledge_bases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/KnowledgeGraphEngine.ts`. Audit note: 8 strong matches — ported (possibly …

### 6. Monolith: Knowledge Integration Tests

- **id:** `TK-DL-monolith-data-lane-tips-059` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:knowledge_bases, state:ported, type:object, ported:engines/AIDeepKnowledgeIntegrationEngine.ts

Legacy monolith data-lane module **PRISM_KNOWLEDGE_INTEGRATION_TESTS** (category: knowledge_bases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/AIDeepKnowledgeIntegrationEngine.ts`. Audit note: 4 strong mat…

### 7. Monolith: Master Db

- **id:** `TK-DL-monolith-data-lane-tips-081` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:databases, state:ported, type:object, ported:engines/HyperMillDemoDbExtractor.ts

Legacy monolith data-lane module **PRISM_MASTER_DB** (category: databases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/HyperMillDemoDbExtractor.ts`.

### 8. Monolith: Master Toolpath Registry

- **id:** `TK-DL-monolith-data-lane-tips-082` · **confidence:** 100/100 · **usage:** 0
- **source:** document:monolith-data-lane-tips
- **tags:** monolith, data-lane, monolith-category:databases, state:ported, type:object, ported:engines/AdaptiveToolpathRouterEngine.ts

Legacy monolith data-lane module **PRISM_MASTER_TOOLPATH_REGISTRY** (category: databases, type: object). Port state: ported. Current PRISM home: `mcp-server/src/engines/AdaptiveToolpathRouterEngine.ts`. Audit note: 25 strong matches — porte…

### 9. Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes

- **id:** `wedm-sp-002` · **confidence:** 98/100 · **usage:** 0
- **source:** mastercam:makino_sp43_sp64_tech_file_mgw_s
- **tags:** wire-edm, makino, sp43, sp64, mitsubishi, fa-10s

Makino MGW-S E-packs (SP43/SP64) use a completely different numbering and power parameter scheme from Mitsubishi FA-10S E-codes. Makino steel High Precision uses 1XXX roughing (e.g., 1025, 1035, 1045) + 12XX skim passes. Mitsubishi steel us…

### 10. Never fully retract drill during peck cycle

- **id:** `TK-DL-deep-hole-drilling-002` · **confidence:** 95/100 · **usage:** 0
- **source:** document:deep-hole-drilling
- **tags:** peck-drilling, chip-evacuation, deep-hole, g83, document-learned, doc:deep-hole-drilling

Critical rule: NEVER retract the drill tip completely clear of the hole during peck drilling. Pulling out entirely allows chips to wash back to the bottom, preventing the drill from re-establishing bite. Results in premature dulling and poo…

## Common Threads

Top tags across the cluster: `document-learned`, `monolith`, `data-lane`, `state:ported`, `type:object`, `doc:monolith-data-lane-tips`, `monolith-category:databases`, `monolith-category:knowledge_bases`.

## Sources Cited

- document:monolith-data-lane-tips (8)
- mastercam:makino_sp43_sp64_tech_file_mgw_s (1)
- document:deep-hole-drilling (1)

## Citations

- [[TK-DL-monolith-data-lane-tips-015]]
- [[TK-DL-monolith-data-lane-tips-029]]
- [[TK-DL-monolith-data-lane-tips-055]]
- [[TK-DL-monolith-data-lane-tips-056]]
- [[TK-DL-monolith-data-lane-tips-057]]
- [[TK-DL-monolith-data-lane-tips-059]]
- [[TK-DL-monolith-data-lane-tips-081]]
- [[TK-DL-monolith-data-lane-tips-082]]
- [[wedm-sp-002]]
- [[TK-DL-deep-hole-drilling-002]]

