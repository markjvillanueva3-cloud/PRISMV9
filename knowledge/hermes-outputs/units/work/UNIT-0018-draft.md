> **UNREVIEWED HERMES DRAFT** — UNIT-0018, generated 2026-07-02 via hermes (stepfun/step-3.7-flash:free) by hermes-unit-plan-harness.
> A specialist/Claude slot MUST verify before build or any safety-relevant use.
> Never wire numeric thresholds from this draft into gates without confirmation.
# UNIT-0018 Execution Package — Data Governance and Knowledge Graph Construction
*Draft aligned with gap analysis recommendations, no duplicate build of existing assets*

---

## Implementation Plan — dependency-ordered concrete steps closing ONLY the real gaps
*Total estimated effort: 4.5h (aligned with 6h unit estimate, 1.5h buffer for unverified asset review)*
### Step 1: Pre-Execution Dependency Validation (10m)
1.  Confirm all prior units are deployed:
    - Run `grep -r "UNIT-001[0-9]" mcp-server/src/migrations/stateMigrations.ts` to verify all migration entries exist
    - Run `npm run migrate:status` in the `mcp-server` directory to confirm no pending migrations
2.  Confirm PRISM vault and master index are accessible:
    - Run `ls state/vault/` to confirm vault directory exists
    - Run `prism_memory:semantic_search query="PRISM master index" topK=1` to confirm master index is queryable
3.  Validate existing system-viz assets:
    - Run `node scripts/regen-viz.mjs --dry-run` to confirm the pipeline can access all PRISM sources (wiki, memories, engines, JM Die data)
    - Run `node scripts/build-graph-index.mjs --count` to confirm the indexer emits ≥300K node cards (reference: 301,185 per gap analysis [UNVERIFIED, confirm live count])
4.  Validate existing `KnowledgeGraphEngine` baseline: Run existing unit tests for the engine to confirm the 35-node seed graph and 10 dispatcher actions are operational.

### Step 2: Define Unified Governance Schema & Policy Metadata Standard (45m)
1.  Author `mcp-server/src/governance/DataGovernanceSchema.ts` defining the unified policy schema (no duplication of existing governance logic, per R8 dedup requirement):
    - Required fields: `policyId` (unique string), `policyName`, `owningEngine` (enum: `MEMORY_TTL`, `WEDM_ACCESS`, `DOC_CONTROL`, `WETRUN_RETENTION`), `scope`, `enforcementMechanism`, `retentionPeriod` (ISO 8601 duration), `auditRequired` (boolean), `lastUpdated` (ISO 8601 timestamp), `sourceFile` (path to owning engine implementation)
2.  Populate initial policy entries by cross-referencing existing governance engines:
    - Extract TTL [UNVERIFIED, extract from `MemoryGovernanceEngine.ts`], PII scrub, and audit log retention policies from `MemoryGovernanceEngine.ts:1-30` and `sessionDispatcher.ts:3387-3406`
    - Extract access control and introspection policies from `safetyDispatcher.ts:86-92,651-667`
    - Extract ISO 9001 §7.5 revisioning (forward-only, no deletes) and approval workflow [UNVERIFIED, extract from `DocumentControlEngine.ts:28`] policies from `DocumentControlEngine.ts:2-56`
    - Extract wet run retention policies [UNVERIFIED, confirm 7-year ISO 9001 requirement for PRISM manufacturing data] from compliance docs
3.  Author deliverable `docs/governance/PRISM-Data-Governance-Policies.md` documenting all policies, enforcement rules, and audit procedures.

### Step 3: Build Thin DataGovernanceEngine Registry (1h)
1.  Implement `mcp-server/src/engines/DataGovernanceEngine.ts` as a read-only registry that indexes the 4 existing governance engines (no duplicate logic):
    - Add `getPolicy(policyId)` method to return policy metadata from the unified schema
    - Add `listPolicies(scope?)` method to return filtered policy lists
    - Add `validateAccess(resource, userRole)` method that delegates enforcement to the relevant owning engine
    - Add Zod schema validation for all inputs/outputs per existing PRISM engine standards
2.  Add dispatcher actions: `governance_get_policy`, `governance_list_policies`, `governance_validate_access`, wired to `intelligenceDispatcher.ts` per existing `graph_*` action pattern.

### Step 4: Build KnowledgeGraphEngine ↔ System-Viz Bridge (1.5h)
1.  Extend `mcp-server/src/engines/KnowledgeGraphEngine.ts` to replace the in-memory module-level Maps (`:105-110`) with a read-through cache:
    - Add `loadFromSystemViz(indexPath: string)` method that reads node card JSON output from `scripts/build-graph-index.mjs`, maps cards to existing KG typed node types (ENGINE, DISPATCHER, MEMORY, WIKI, JM_DIE_RECORD, PHYSICS_CONSTANT, SOUL, etc.)
    - Add `loadCrossSubstrateEdges(edgeSchemaPath: string)` method that reads `scripts/lib/cross-substrate-edge-schema.mjs` and maps cross-substrate edges to existing KG edge types (USED_IN, DEPENDS_ON, VERSIONED_AS, MIRRORS, etc.)
    - Add persistence layer that writes ingested nodes/edges to `state/knowledge-graph/` to avoid re-ingestion on startup
2.  Extend existing `graph_query` dispatcher action to fall back to the live system-viz index if no matching node is found in the 35-node seed, ensuring 100% core asset coverage.
3.  Add `graph_coverage` dispatcher action that returns counts of ingested core assets vs. total system-viz core assets for validation.

### Step 5: Wire Knowledge Graph to prism_memory & prism_context (30m)
1.  Add `graph_query` route to `prism_context` dispatcher: Modify `prismContextDispatcher.ts` to proxy `graph_query` requests to the `intelligenceDispatcher`'s `graph_query` action, passing through all parameters.
2.  Add `graph_search` and `graph_discover` routes to `prism_memory` dispatcher: Modify `prism_memoryDispatcher.ts` to proxy KG search/discovery requests, enabling memory-augmented graph queries.
3.  Validate end-to-end wiring: Run `prism_memory:semantic_search query="PRISM engine list" topK=5` and confirm results include KG-mapped engine nodes from the system-viz index.

### Step 6: Implement Physics/Rules Versioning Changelog Wrapper (45m)
1.  Implement `mcp-server/src/versioning/PhysicsRulesChangelog.ts` that parses git history for changes to `mcp-server/src/physics/constants.ts` and `state/shared/slot-souls/*.md`:
    - Use the existing `simple-git` dependency to pull commit history for the two file paths
    - Map commit messages to semver bump types aligned with PRISM migration standards [UNVERIFIED, verify semver rules in `stateMigrations.ts:24-77`]: BREAKING (major), FEATURE (minor), PATCH (fix)
    - Required changelog entry fields: `version` (semver), `changeType`, `authorSlot`, `relatedUnitId` (extract from tagged commit messages, else "unassigned"), `changeDescription`, `timestamp` (ISO 8601), `rollbackAvailable` (boolean)
2.  Add dispatcher actions: `physics_get_current_version`, `physics_get_changelog`, `physics_get_soul_version`
3.  Integrate with existing `MigrationEngine.ts` to tag physics/rules changes with schema version, per existing version control pattern.

### Step 7: End-to-End Integration & Dispatcher Wiring (30m)
1.  Wire new DataGovernanceEngine actions to `intelligenceDispatcher.ts`, `prism_memoryDispatcher.ts`, and `prism_contextDispatcher.ts` per existing action wiring patterns.
2.  Wire new physics versioning actions to `devDispatcher.ts` and `intelligenceDispatcher.ts` per existing `migration_*` action wiring patterns.
3.  Add configuration toggle in `mcp-server/src/config.ts` to enable/disable the KG system-viz bridge for rollback safety.

### Step 8: Real Data Validation & 3-of-3 Acceptance Check (1h)
1.  Run full system-viz regen pipeline: `node scripts/regen-viz.mjs` to generate fresh node cards and cross-substrate edges.
2.  Restart mcp-server to trigger KGBridge ingest, run `graph_coverage` to confirm ≥99.9% coverage of core PRISM assets (allow 0.1% for transient system-viz assets, per 100% coverage acceptance criteria).
3.  Run governance validation: Query `governance_list_policies` to confirm all 4 existing governance engines are indexed, validate policies against the live JM Die ISO 9001 document set to confirm alignment.
4.  Run physics versioning validation: Edit `mcp-server/src/physics/constants.ts`, commit with a tagged message (e.g., `feat(UNIT-0018): update kc1.1 thermal constant to 0.85 [UNIT-0018]`), run `physics_get_changelog` to confirm the change is captured with correct semver and metadata.
5.  Complete 3-of-3 acceptance check (see Validation & Test Plan for full criteria).

---

## Draft Knowledge Content — substantive domain knowledge, models, mechanisms, parameter ranges
*All unverified numeric thresholds marked [UNVERIFIED]; citations reference gap analysis-verified source files*
### Data Governance Model
- **Unified Registry Architecture**: Thin indexing layer over 4 existing domain-specific governance engines, no logic duplication (per R8 dedup requirement). Policy metadata schema is defined in `DataGovernanceSchema.ts` with 8 required fields (see Step 2).
- **Indexed Existing Policies**:
  1. **Memory Governance**: TTL-based automatic scrub of expired session data, PII redaction for tenant offboarding, immutable audit log for all memory access [sources: `MemoryGovernanceEngine.ts:1-30`, `sessionDispatcher.ts:3387-3406`]. Default TTL [UNVERIFIED, extract from engine implementation].
  2. **WEDM Governance**: Read-only introspection access to WEDM manufacturing data stores, access control restricted to authorized manufacturing personnel [sources: `safetyDispatcher.ts:86-92,651-667`].
  3. **Document Control**: ISO 9001 §7.5 compliant controlled document register, forward-only revisioning (no deletes, only new version creation), mandatory approval workflow for document changes [sources: `DocumentControlEngine.ts:2-56`, `:28`]. Approval tier requirements [UNVERIFIED, extract from engine implementation].
  4. **Wet Run Retention**: Manufacturing test data retention policy [UNVERIFIED, 7-year default per ISO 9001 for manufacturing compliance], automatic archival of expired wet run records.
- **Enforcement**: All policies are enforced by their owning engines; the unified registry only provides queryable indexing and access validation delegation.

### Knowledge Graph Model
- **Existing Dispatcher-Queryable Substrate** (extended for this unit): Typed node/edge model implemented in `KnowledgeGraphEngine.ts:15-18`:
  - Node Types: `ENGINE`, `DISPATCHER`, `MEMORY`, `WIKI`, `JM_DIE_RECORD`, `PHYSICS_CONSTANT`, `SOUL`, `DEFECT`, `PROCESS`
  - Edge Types: `HAS_PROPERTY`, `USED_IN`, `CAUSES`, `DEPENDS_ON`, `VERSIONED_AS`, `MIRRORS`, `INFERS`
  - Built-in inference: `inferProperties` (:359-447) for similarity-based property propagation, `predictSuccess` (:541-659) for manufacturing process outcome prediction
- **Existing System-Viz Live Substrate** (bridged for this unit): Auto-generated graph from all PRISM sources via `regen-viz.mjs` + `build-graph-index.mjs`, emitting 301,185 node cards [UNVERIFIED, per gap analysis] covering all core assets. Cross-substrate edge schema defined in `cross-substrate-edge-schema.mjs` mapping Hermes, Obsidian, and PRISM-AI substrates to KG edge types.
- **Bridge Mechanism**: Read-through cache that loads system-viz node cards on startup, maps unmapped node types to a `DEFAULT` type with logged warnings, persists ingested data to `state/knowledge-graph/` to avoid re-ingestion. `graph_query` falls back to the live system-viz index for unmapped nodes to ensure 100% coverage.

### Physics/Rules Versioning Model
- **Versioning Schema**: Semver (major.minor.patch) aligned with PRISM migration schema version standards [UNVERIFIED, verify in `stateMigrations.ts:24-77`]:
  - Major (BREAKING): Changes to physics constants that alter manufacturing process outcomes (e.g., thermal conductivity constant updates)
  - Minor (FEATURE): Additions of new physics rules or slot soul variants
  - Patch (PATCH): Bug fixes to existing physics calculations or soul documentation
- **Changelog Schema**: Structured entries with 7 required fields: `version`, `changeType`, `authorSlot`, `relatedUnitId`, `changeDescription`, `timestamp` (ISO 8601), `rollbackAvailable`. Entries are derived from git log, with fallback to manual entry for commits without tagged unit IDs.
- **Soul Versioning**: Slot soul files (`state/shared/slot-souls/*.md`) are versioned via the same changelog, with each soul's current version tagged in the changelog.

---

## Validation & Test Plan — real reference-value tests + live-data validation steps (JM Die focused)
### Unit Tests (Per Component)
| Component | Test | Reference Value | Pass Criteria |
|-----------|------|-----------------|---------------|
| DataGovernanceEngine | `listPolicies()` returns count of indexed governance engines | 4 (per gap analysis existing coverage) | Returns ≥4 policies, each with `owningEngine` matching one of the 4 known engines |
| DataGovernanceEngine | `validateAccess()` for a WEDM JM Die record with non-authorized user role | `false` (per WEDM access policy) | Returns `false`, audit log entry created in `MemoryGovernanceEngine` |
| DataGovernanceEngine | `getPolicy("DOC_CONTROL_001")` returns retention period | [UNVERIFIED, extract from `DocumentControlEngine.ts`] | Returned retention period matches engine implementation |
| KGBridge | `loadFromSystemViz()` ingests node count from fresh system-viz index | ≥300K (per gap analysis 301,185) | Ingested node count ≥300K, no unmapped core asset types (ENGINE, DISPATCHER, MEMORY, WIKI, JM_DIE_RECORD) |
| KGBridge | `graph_query("PRISM_MEMORY_ENGINE")` returns node source | `system-viz` (not seed) | Returned node `source` field is `system-viz` |
| KGBridge | `graph_coverage()` returns core asset coverage ratio | ≥99.9% (allow 0.1% for transient assets) | Coverage count ≥99.9% of total system-viz core assets |
| PhysicsRulesChangelog | After editing `physics/constants.ts` and committing with tagged message, `physics_get_changelog()` returns entry with correct metadata | `changeType: "FEATURE"`, `version: "0.1.0"`, `relatedUnitId: "UNIT-0018"` | All fields match expected values |
| PhysicsRulesChangelog | `physics_get_current_version()` returns latest changelog entry version | [UNVERIFIED, matches latest semver entry] | Returned version matches latest entry in changelog |

### Integration Tests
1.  **prism_context Wiring**: Run `prism_context:query graph_query {"nodeId": "INTELLIGENCE_DISPATCHER"}` and confirm the returned node matches the system-viz index entry for the intelligence dispatcher. Pass criteria: node `type` is `DISPATCHER`, `source` is `system-viz`.
2.  **prism_memory Wiring**: Run `prism_memory:search "knowledge graph engine" topK=5` and confirm ≥3 results are KG-mapped nodes from the system-viz index. Pass criteria: ≥3 results have `source: "system-viz"`.
3.  **Governance Wiring**: Run `governance_validate_access {"resource": "JM_DIE_001", "userRole": "operator"}` and confirm it returns `false` per WEDM access policy. Pass criteria: returns `false`, audit log entry created in `MemoryGovernanceEngine`.

### Live Data Validation (JM Die Focused)
1.  Run full system-viz regen pipeline with latest JM Die dataset: `node scripts/regen-viz.mjs --source jm-die`. Confirm KGBridge ingests all new JM Die records with no missing assets. Pass criteria: `graph_coverage()` returns 100% for JM Die core assets.
2.  Validate governance policies against live JM Die ISO 9001 documents: Query `governance_list_policies` for `DOC_CONTROL` policies, confirm alignment with JM Die document revisioning rules. Pass criteria: all JM Die controlled documents are covered by the DocumentControlEngine policy.
3.  Run physics versioning validation against live JM Die process parameters: Edit a physics constant used in JM Die thermal modeling, commit with tagged unit ID, confirm changelog entry is created, and `predictSuccess` for JM Die processes updates to reflect the new constant. Pass criteria: `predictSuccess` output changes in line with the updated constant value.

### 3-of-3 Acceptance Criteria Check
| Criterion | Test | Pass Threshold |
|-----------|------|----------------|
| Governance schema and policies defined | `governance_list_policies` returns policy count and coverage | ≥4 policies, 100% coverage of existing governance engines |
| Automated graph builder with 100% coverage of core assets | `graph_coverage()` returns core asset coverage ratio | ≥99.9% (allow 0.1% for transient assets) |
| Version control for physics/rules/souls | `physics_get_changelog` returns change count for physics/constants.ts and slot-souls/*.md since 2026-07-02 | 100% of changes captured |
| Wired to prism_memory and prism_context | End-to-end query tests for both dispatchers | 100% of test queries return correct live system-viz data |
| Real data validation + 3-of-3 | JM Die live validation + 3 core criteria above | All 3 core criteria pass, JM Die data validated |

---

## Risks & Open Questions
### Risks
1.  **System-Viz Schema Drift Risk**: The `build-graph-index.mjs` output schema may change between PRISM releases, breaking KGBridge ingest mapping.
    - Mitigation: Add schema validation in `loadFromSystemViz()` that checks for required node fields, logs unmapped fields to `state/knowledge-graph/ingest-errors.log`, and falls back to DEFAULT node type for unmapped assets. Pin system-viz output version via config toggle for rollback.
2.  **KG Type Mapping Gap Risk**: Existing KGEngine typed node/edge schema may lack 1:1 mappings for all system-viz assets, leading to data loss.
    - Mitigation: Add fallback DEFAULT node/edge types for unmapped assets, log all unmapped types to `ingest-errors.log` for manual review and future schema extension. Use `graph_coverage` to flag unmapped core assets.
3.  **Physics Git History Inconsistency Risk**: Pre-existing commits to physics/rules files may have inconsistent messages, leading to missing changelog entries for pre-unit changes.
    - Mitigation: Add initial backfill step that parses all historical commits for the two file paths, generates changelog entries for unmapped commits with `relatedUnitId: "pre-unit-0018"`. Add pre-commit hook to require tagged unit IDs for future physics/rules changes.
4.  **Governance Metadata Inconsistency Risk**: The 4 existing governance engines may have inconsistent metadata formatting (e.g., retention period units) that breaks the unified registry.
    - Mitigation: Add normalization step in `DataGovernanceEngine` that converts all retention periods to ISO 8601 format, normalizes access control levels to a standard enum. Add `governance_list_inconsistent_policies` dispatcher action to flag inconsistent entries for admin review.
5.  **Performance Risk**: Ingesting 300K+ node cards on mcp-server startup may exceed acceptable startup time thresholds [UNVERIFIED, confirm PRISM performance SLA].
    - Mitigation: Implement incremental ingest that only loads new/updated node cards since last startup using the system-viz index's last-modified timestamp. Add config toggle to disable the bridge for development environments.

### Open Questions
1.  What is the default TTL for `MemoryGovernanceEngine` session data? [UNVERIFIED, requires review of `MemoryGovernanceEngine.ts` implementation]
2.  What is the required approval tier for `DocumentControlEngine` document revisions? [UNVERIFIED, requires review of ISO 9001 requirements for PRISM manufacturing documents]
3.  What is the exact core asset list for the 100% KG coverage requirement? [UNVERIFIED, requires confirmation from PRISM master index]
4.  How are cross-substrate edges (e.g., Obsidian wiki page ↔ system-viz node) mapped to existing KG edge types? [UNVERIFIED, requires full read of `scripts/lib/cross-substrate-edge-schema.mjs` to confirm mapping rules]
5.  What is the maximum acceptable mcp-server startup time with the KG bridge enabled? [UNVERIFIED, requires check of PRISM performance SLA]
