---
name: reference-tango-discovery-engine-map-2026-05-29
description: the discovery-domain engine + dispatcher inventory for slot tango (anti-dup, search-index, coverage-audit)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.218Z
aliases: reference_tango_discovery_engine_map_2026_05_29
---


Discovery galaxy asset map (slot:tango, verified 2026-05-29 via filesystem — MCP was down). Full atlas: `mcp-server/src/engines/discovery/PATHS.md`.

**Anti-duplication engines:** `DuplicationGuardEngine.ts` (`mustCheckBeforeCreating`/`mustNotReExtract` THROW), `BloomDedupEngine.ts`, `KnowledgeDeduplicationEngine.ts`; hook helper `.claude/helpers/duplication-guard.mjs`.

**Search/index engines:** `MasterIndexEngine.ts`, `MasterIndexGenerator.ts`, `PRISMSelfAwarenessEngine.ts` (findCapabilities/searchTribalKnowledge/recommendAIFeatures), `CodeSystemIndexEngine.ts`, `GlobalSearchEngine.ts`, `AwarenessQueryEngine.ts`, `CapabilityIndexEngine.ts`, `CapabilityCensusEngine.ts`, `WikiIndexMaintainerEngine.ts`.

**Coverage/orphan auditors:** `EngineUtilizationAuditorEngine.ts`, `SystemUtilizationAuditEngine.ts`, `HookCoverageMaximizerEngine.ts`, `SkillLibraryAuditEngine.ts`, `CrossRegistryJoinEngine.ts`, `HookRegistryReaderEngine.ts`.

**Dispatcher surface:** `prism_session:{master_index_query, master_index_node_status, master_index_utilization_dashboard, dispatcher_map_compact, self_awareness_*}`; `prism_guard:{dup_guard_check, dup_guard_summary}`; `prism_dev:{dedup_might_contain, dedup_is_definitely_new, wiring_potential, impact_find_orphans, capability_census, svi_ranked_backlog}`.
