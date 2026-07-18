# UNIT-0018 — Data Governance and Knowledge Graph Construction — GAP ANALYSIS
_Analyst: india (ai-training soul) · 2026-07-02 · every claim cited file:line, read-verified_

## Existing coverage

**Knowledge graph — TWO substrates already exist:**
- `mcp-server/src/engines/KnowledgeGraphEngine.ts:15-18,668-873` — manufacturing knowledge graph with 10 dispatcher actions (`graph_query, graph_infer, graph_discover, graph_predict, graph_traverse, graph_add, graph_search, graph_stats, graph_history, graph_get`), typed nodes/edges, similarity inference (`inferProperties` :359-447), success prediction (`predictSuccess` :541-659), exported add-node/add-edge API for engine wiring (:313-355). Read end-to-end.
- Wired to FOUR dispatchers: `intelligenceDispatcher.ts:157,607` (all `graph_*` actions), `knowledgeExtDispatcher.ts:39,63,131,236`, `knowledgeDispatcher.ts:346`, `ppDispatcher.ts:70,496`. Wiring verified by grep+read of matched lines.
- The *automated builder over all PRISM sources* the unit asks for already exists as the system-viz pipeline: `scripts/regen-viz.mjs:1-25` ("single-shot regenerate the entire system-viz graph" — picks up tribal tips, UNWIRED audits, engines/dispatchers/registries as sources) + `scripts/build-graph-index.mjs` (exists, verified by ls; per root CLAUDE.md §CHEAP-NODE-ACCESS-MS0 it emits 301,185 node cards). PARTIAL-UNVERIFIED: I did not read build-graph-index.mjs body.
- Typed cross-substrate edges (system-viz ↔ Hermes ↔ Obsidian ↔ PRISM-AI): `scripts/lib/cross-substrate-edge-schema.mjs` per root CLAUDE.md §CROSS-SUBSTRATE-SYNERGY-MS0 — PARTIAL-UNVERIFIED (doctrine-cited, body not read this session).

**Governance — fragmented but real:**
- `mcp-server/src/engines/MemoryGovernanceEngine.ts:1-30` — TTL + immutable audit log + scrub (PII/tenant-offboarding), Zod `GovernanceActionSchema`; wired at `sessionDispatcher.ts:3387-3406` (findExpired/scrub/recordAudit/renderAudit).
- `safetyDispatcher.ts:86-92,651-667` — WEDMGovernanceStore read-only introspection actions (`wedm_governance_read/path/snapshot`).
- `mcp-server/src/engines/DocumentControlEngine.ts:2-56` — ISO 9001 §7.5 controlled-document register: version chain, forward-only revisioning (:28), approval workflow, retention tracking.

**Version control for physics/rules/souls:**
- `mcp-server/src/migrations/stateMigrations.ts:24-77` — schemaVersion migration registry with explicit forward-compat behavior (:45).
- `mcp-server/src/engines/MigrationEngine.ts:1-10` — migration_apply/rollback/status/list/validate; wired `devDispatcher.ts:496,3686-3700`.
- Souls live in git at `state/shared/slot-souls/*.md` (verified by ls: alpha.md, bravo.draft.md, ...); physics constants in `mcp-server/src/physics/constants.ts` are git-versioned.

## Real gaps
1. **No unified DataGovernanceEngine / governance schema+policy doc** — governance is per-domain (memory TTL, WEDM store, ISO doc control, wet-run retention). Nothing declares "these are PRISM's governance policies" in one queryable place, and no governance doc deliverable exists.
2. **KnowledgeGraphEngine's graph is a SEEDED in-memory demo set** (`seedGraph()` :124-255, ~35 hand-authored nodes, module-level Maps :105-110, no persistence) — the "automated graph builder with 100% coverage of core assets" criterion is met by the system-viz substrate, NOT by this dispatcher-queryable engine. The two substrates are not bridged: dispatcher callers cannot query the 301K-node real graph through `graph_query`.
3. **prism_memory / prism_context wiring** (acceptance criterion) — the KG actions live on intelligence/knowledge/pp dispatchers; no `prism_memory`/`prism_context` route verified.
4. **Physics/rules versioning is git-only** — no semantic-version surface or change audit for `constants.ts` values (who changed kc1.1 for M-group, when, why).

## Verdict
**extend**

## Recommended next action
Do NOT build a new KnowledgeGraphBuilder — both substrates exist. The highest-value extension is a bridge unit: (a) add a persistence + ingest path so `KnowledgeGraphEngine` can load nodes/edges from the system-viz sidecars (find-cache/node-card offset index) instead of only the 35-node seed, or expose a `graph_query`-shaped read of the system-viz graph through `prism_context`; (b) ship a thin `DataGovernancePolicy` registry (one JSON/TS module + dispatcher read action) that indexes the four existing governance engines (MemoryGovernance, WEDMGovernanceStore, DocumentControl, WetRunRetention) with policy metadata, satisfying the "governance schema and policies defined" criterion without duplicating any of them (R8/dedup); (c) add a changelog-emitting wrapper for `physics/constants.ts` edits (git-log-derived, no new store). Validate (b) against the live JM Die document set and round-trip (a) through the dispatcher per R15.

## ROI
**5/10** — real value in unifying fragmented governance + bridging the demo KG to the live graph, but ~70% of the unit's deliverables already exist across five engines and two graph substrates; effort is mostly integration, and the risk of duplicate-building is high if treated as a green-field build.
