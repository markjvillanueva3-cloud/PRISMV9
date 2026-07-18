---
name: discovery-engines
description: Strategic engine digest for the discovery galaxy (slot tango) -- algorithm/engine/pipeline discovery, anti-duplication (DuplicationGuard THROWS), master-index search-first, coverage/orphan audits, and self-awareness. Header-verified roster; domain-owned catalog/inventory engines deliberately excluded.
type: reference
galaxy: discovery
node_type: memory
---

# discovery galaxy -- engine digest

## Overview

The discovery galaxy (slot tango) is PRISM's **anti-duplication + discovery + coverage-audit META layer** -- the guard every other galaxy consumes before creating any asset. It does not manufacture parts; it manufactures search-first discipline and prevents re-invention. Three load-bearing behaviors:

1. **Anti-duplication that THROWS, not warns.** `DuplicationGuardEngine.mustCheckBeforeCreating()` + `mustNotReExtract()` HARD-STOP on a duplicate/re-extract before an engine, formula, algorithm, action, or vendor extraction can be created (`DuplicationGuardEngine.ts:1-13` -- "CRITICAL SYSTEM: This engine MUST be consulted before..."). A warn-only dedup path is a domain violation. A tiered dedup stack sits under it: `BloomDedupEngine` (O(1) probabilistic negative filter, FPR ~0.8 pct), `LSHDedupEngine` (O(1) semantic bucket lookup, ~0.5 ms vs ~50 ms linear at n=2000), and `KnowledgeDeduplicationEngine` (TF-IDF cosine for tips: >0.85 DUP / 0.65-0.85 RELATED / <0.65 NOVEL).

2. **Master-index search-first > Grep/Glob.** `MasterIndexEngine` fuses 4 pre-built indexes (system-graph 110K nodes / 114K edges + wiki + capability index + BUILD_STATE) so ONE `prism_session:master_index_query` replaces N filesystem searches (`MasterIndexEngine.ts:1-10`). Filesystem search is the <0.5-confidence fallback. `CodeSystemIndexEngine` resolves DSL shortcodes (E####/D##/A##) to paths (~50-200 tok saved per reference).

3. **Coverage / orphan audits.** `EngineUtilizationAuditorEngine` (ENGINE-level orphan/underutilization) + `SystemUtilizationAuditEngine` (10-pillar SYSTEM-level, orthogonal) + `UtilizationContractEngine` (unreachable-capability discovery chain) find what exists-but-is-never-invoked, so romeo can wire it.

**Structural note (verified):** engines live FLAT in `mcp-server/src/engines/*.ts`; the `discovery/` subdir holds doctrine only (CLAUDE.md / MEMORY.md / PATHS.md / TOOLBELT.md), no `.ts`. **Scope note:** the flat tree contains ~100 name-matching `*Catalog*`/`*Inventory*`/`*Capability*`/`*SelfAwareness*` engines that are DOMAIN-OWNED (mill/lathe/wedm inventory, CAM/vendor catalogs, machine-capability, per-galaxy self-awareness integrations) -- those are NOT discovery-galaxy assets and are excluded here per the CLAUDE.md scope boundary. This digest covers the META discovery/dedup/audit core only.

## Strategic categories

- **duplication-guard** -- create-time gates that block re-invention. THROWS by design. (`DuplicationGuardEngine`, `BloomDedupEngine`, `LSHDedupEngine`, `KnowledgeDeduplicationEngine`, `IdeaBlockDedupEngine`, `ToolCallDeduplicatorEngine`, `FileReadDeduplicationEngine`)
- **master-index / search** -- the unified query surface that replaces Grep/Glob. (`MasterIndexEngine`, `MasterIndexGenerator`, `CodeSystemIndexEngine`, `AwarenessQueryEngine`, `KnowledgeGapAwarenessEngine`)
- **coverage-audit** -- what exists vs what is reachable/tested/hooked/schema'd. (`EngineUtilizationAuditorEngine`, `SystemUtilizationAuditEngine`, `UtilizationContractEngine`, `CapabilityCensusEngine`, `TestCoverageIndexEngine`, `SchemaCoverageAuditEngine`, `PSNCoverageAuditEngine`, `HookCoverageMaximizerEngine`, `SkillLibraryAuditEngine`, `CapabilityEffectivenessEngine`)
- **orphan-detection** -- unwired engines + cross-registry joins that surface disconnected assets. (`EngineUtilizationAuditorEngine`, `CrossRegistryJoinEngine`, `UtilizationContractEngine`)
- **self-awareness** -- "what does PRISM know / can it do X" capability introspection. (`PRISMSelfAwarenessEngine`, `AgentSelfAwarenessEngine`, `UnifiedAwarenessOrchestrator`, `CapabilityIndexEngine`, `AwarenessBootstrapEngine`, `ModelAwareSelfAwarenessEngine`, `SituationalAwarenessFilterEngine`)
- **registry / index maintenance** -- keeps the discovery substrate fresh. (`WikiIndexMaintainerEngine`, `HookRegistryReaderEngine`, `ContextInventoryEngine`, `PluginInventoryEngine`)

## Key engines (detailed)

### DuplicationGuardEngine.ts
THE core create-time gate for the whole fleet. `mustCheckBeforeCreating()` and `mustNotReExtract()` THROW (never warn) on a duplicate asset or a re-extraction of an already-mined vendor source, with an 85 pct fuzzy-match threshold that catches renamed/near-identical assets across all chat sessions. Consulted before any engine/formula/algorithm/action/extraction is created.
Path: `mcp-server/src/engines/DuplicationGuardEngine.ts`
Notable: `mustCheckBeforeCreating()`, `mustNotReExtract()`, `checkBeforeCreating({assetType,proposedName,keywords,description})`; cross-session registry `data/state/cross-session-asset-registry.json`; wired `prism_guard:dup_guard_check`.

### MasterIndexEngine.ts
The unified search surface: fuses system-graph.json (110K nodes / 114K edges, 11 layers, each node pre-joined with wiki + memory), the capability index, and BUILD_STATE so a single query answers "find X / what handles Y / is Z built+wired." One call replaces N Grep/Glob/Agent calls; filesystem search is the fallback only on zero high-confidence hits.
Path: `mcp-server/src/engines/MasterIndexEngine.ts`
Notable: `prism_session:{master_index_query, master_index_node_status, master_index_utilization_dashboard}`; **gotcha** -- a stale `MAX_INDEX_SIZE_MB` cap below current graph byte-size silently returns zero hits; `scripts/system-viz-query.mjs find <term>` bypasses.

### PRISMSelfAwarenessEngine.ts
Core-infrastructure "what can PRISM do" engine: capability matching, gap detection, AI-feature recommendation, and JM-Die corpus pathing. Referenced by the SessionStart awareness hook, `GapEscalationControllerEngine`, and the machining orchestrator -- the canonical answer to "does an engine/action already exist for this."
Path: `mcp-server/src/engines/PRISMSelfAwarenessEngine.ts`
Notable: `findCapabilities()`, `findEngines()`, `recommendAIFeatures()`, `searchTribalKnowledge()`, `getJMDieCustomerPath()`.

### EngineUtilizationAuditorEngine.ts
ENGINE-level orphan + underutilization audit: detects engines with no dispatcher / no action / no consumer (true orphans) and rarely-invoked engines. Its output is romeo's (wiring galaxy) input queue -- tango finds, romeo wires. Orthogonal to `SystemUtilizationAuditEngine` (10-pillar SYSTEM level).
Path: `mcp-server/src/engines/EngineUtilizationAuditorEngine.ts`
Notable: pairs with `scripts/audit-unwired-engines.mjs` + `prism_dev:{wiring_potential, impact_find_orphans}`.

### CodeSystemIndexEngine.ts
DSL shortcode <-> path resolver mapping 1800+ PRISM files to compact codes (E=Engine, D=Dispatcher, A=Algorithm, S=Schema, H=Hook, C=Catalog...). Saves ~50-200 tokens per file reference by letting chats cite `E0423` instead of a full path.
Path: `mcp-server/src/engines/CodeSystemIndexEngine.ts`
Notable: `resolve("E0001") -> path`, `lookup(path) -> code`; backs `CODE_SYSTEM_INDEX.json`.

### UtilizationContractEngine.ts
Maps every PRISM capability through its full discovery chain (engine -> dispatcher -> action -> user-facing path) and flags **unreachable capabilities** -- engines that exist but have no invocation path. The reachability half of coverage (distinct from orphan-by-wiring): a wired engine can still be unreachable.
Path: `mcp-server/src/engines/UtilizationContractEngine.ts`
Notable: consumed by `CapabilityCensusEngine` step 5; MXU-MS0.

### BloomDedupEngine.ts
Fast probabilistic negative-dedup filter (Bloom): a definite-NO answer in O(1) before the expensive embedding/LSH lookup runs, FPR ~0.8 pct at n=2000 / m=1M bits / k=7. The cheap first gate in the dedup cascade under DuplicationGuard.
Path: `mcp-server/src/engines/BloomDedupEngine.ts`
Notable: `prism_dev:{dedup_might_contain, dedup_is_definitely_new}`; complexity-theory foundation `(1 - e^(-kn/m))^k`.

### WikiIndexMaintainerEngine.ts
Owns `knowledge/wiki/index.md` + the `index.jsonl` sidecar with append-on-event (NOT full-regen) semantics: atomic upsert-by-slug under a file lock so multiple chats can `.upsert()` concurrently without clobbering the 722-entry catalog.
Path: `mcp-server/src/engines/WikiIndexMaintainerEngine.ts`
Notable: `upsert(slug)`, file-lock concurrency; co-owned tango/lima.

## Full engine index

All rows header-verified from `mcp-server/src/engines/*.ts` unless marked (name-derived).

| Engine | Category | One-line |
|--------|----------|----------|
| DuplicationGuardEngine.ts | duplication-guard | THE create-time gate; `mustCheckBeforeCreating`/`mustNotReExtract` THROW on dup/re-extract (85 pct fuzzy) |
| BloomDedupEngine.ts | duplication-guard | O(1) probabilistic negative dedup filter (FPR ~0.8 pct) before expensive lookup |
| LSHDedupEngine.ts | duplication-guard | Locality-sensitive-hashing O(1) semantic dedup (~0.5 ms vs ~50 ms linear at n=2000) |
| KnowledgeDeduplicationEngine.ts | duplication-guard | TF-IDF cosine dedup for tribal tips (>0.85 DUP / 0.65-0.85 RELATED / <0.65 NOVEL) |
| IdeaBlockDedupEngine.ts | duplication-guard | Cosine dedup of Obsidian IdeaBlocks; collapses near-dup claims, keeps provenance |
| ToolCallDeduplicatorEngine.ts | duplication-guard | Blocks redundant tool calls within a time window (100-2000 tok saved each) |
| FileReadDeduplicationEngine.ts | duplication-guard | Flags redundant re-reads of same path+range already in context |
| MasterIndexEngine.ts | master-index | Unified search fusing system-graph(110K)+wiki+capability+BUILD_STATE; 1 query replaces N Grep |
| MasterIndexGenerator.ts | master-index | Auto-scans MCP source -> MASTER_INDEX.json (living single-source index, DSL classification) |
| CodeSystemIndexEngine.ts | master-index | DSL shortcode (E####/D##/A##) <-> path resolver over 1800+ files (~50-200 tok/ref saved) |
| AwarenessQueryEngine.ts | master-index | O(1)/O(log n) in-memory asset-awareness cache: existence, similar-asset, dep-graph, telemetry |
| KnowledgeGapAwarenessEngine.ts | master-index | Surfaces forgotten prior-art (engines/formulas/tips) so devs reuse instead of reinvent |
| GlobalSearchEngine.ts | master-index | Cross-entity fuzzy search over parts/quotes/jobs/customers/tools (business-entity, domain-adjacent) |
| EngineUtilizationAuditorEngine.ts | orphan-detection | ENGINE-level audit: orphan (no dispatcher/action/consumer) + underutilized engines |
| SystemUtilizationAuditEngine.ts | coverage-audit | 10-pillar SYSTEM-level utilization audit (orthogonal to engine-level) |
| UtilizationContractEngine.ts | coverage-audit | Full discovery-chain map; flags unreachable capabilities (exist but no invocation path) |
| CapabilityCensusEngine.ts | coverage-audit | Live filesystem census of capabilities + test coverage -> full CapabilityCensus |
| CapabilityIndexEngine.ts | self-awareness | Runtime dispatcher introspection -> searchable capability index (no hardcoded lists) |
| CapabilityEffectivenessEngine.ts | coverage-audit | Scores capability effectiveness across sources (MXU-MS9/10) |
| TestCoverageIndexEngine.ts | coverage-audit | Maps `__tests__/` files to source engines; tracks coverage gaps for targeted gen |
| SchemaCoverageAuditEngine.ts | coverage-audit | Inventories `z.any()` + `.describe()` coverage across schemas -> SCHEMA-COVERAGE-AUDIT.json |
| PSNCoverageAuditEngine.ts | coverage-audit | Deterministic PSN-leg x 12-layer NxM coverage matrix (self-audit reporter) |
| HookCoverageMaximizerEngine.ts | coverage-audit | Identifies unhook'd surfaces, recommends new hooks, tracks hook effectiveness |
| SkillLibraryAuditEngine.ts | coverage-audit | Grades the ~500-skill library for production-grade vs vanity-count scorecard |
| CrossRegistryJoinEngine.ts | orphan-detection | Joins across registries (materials+tools+machines) for span-asset queries / WIRE-UNWIRED |
| PRISMSelfAwarenessEngine.ts | self-awareness | Core capability match / gap detect / AI-feature rec / JM-Die pathing |
| AgentSelfAwarenessEngine.ts | self-awareness | Unifies CapabilityIndex + EngineDigest for agent-facing self-awareness (U-AGT03) |
| UnifiedAwarenessOrchestrator.ts | self-awareness | Central "what PRISM knows" -- coordinates resource index + awareness; never bypass |
| AwarenessBootstrapEngine.ts | self-awareness | SessionStart freshness check; gates action if awareness score too low |
| ModelAwareSelfAwarenessEngine.ts | self-awareness | Detects active Claude model, gates intensive self-awareness features by model |
| SituationalAwarenessFilterEngine.ts | self-awareness | Compresses the 188-line self-awareness directive to a tight per-prompt slice |
| WikiIndexMaintainerEngine.ts | registry-maintenance | Owns wiki/index.md + jsonl; atomic upsert-by-slug under file lock (722 entries) |
| HookRegistryReaderEngine.ts | registry-maintenance | Read-only projection of HOOK_REGISTRY.json (mtime-cached, never full blob) |
| ContextInventoryEngine.ts | registry-maintenance | Inventories what is currently loaded into conversation context (smart context mgmt) |
| PluginInventoryEngine.ts | registry-maintenance | Single-pane visibility for installed MCPs/plugins/extensions + health (U-PLG3) |

**Excluded (verified NOT discovery-galaxy):** `PrintToProgramCoverageAnalyzerEngine` (P2P-pipeline capstone -- print-to-program domain), `CapabilityPathEngine` (operator learning-paths -- academy), and the ~90 `*Catalog*` / `*Inventory*` / `MachineCapability*` / per-galaxy `*SelfAwarenessIntegration*` engines (mill/lathe/wedm/CAM/vendor domain-owned). These match the enumeration regex but fall outside the discovery META scope per `mcp-server/src/engines/discovery/CLAUDE.md` sec.1.
