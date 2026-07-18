# INFRA Phase 1 Completion — Data Foundation

## Context
The Infrastructure Modernization Roadmap (H:\PRISM\plans\infrastructure-modernization-roadmap.md) Phase 1 is the critical path that unblocks all other phases (Search, Auth, Events, Feedback, API, Deploy, ML, KnowledgeGraph). INFRA-1-1 (PostgreSQL + Migrations) is already complete. INFRA-1-2 is partially done — PersistenceBridge is hardened (U-PER1 ✓), but registries aren't seeded to Postgres (U-PER2 ✗). Additionally, DB init is not wired into server startup, and there's no `prism_infra` dispatcher for observability.

## What's Already Done
- **U-DB1** ✅ — `pg` ^8.20.0 in package.json, `connection.ts` has dynamic import + fallback
- **U-DB2** ✅ — Migration runner (252 lines), 9 migrations (001-009), checksummed, transactional
- **U-DB3** ✅ — `docker-compose.dev.yml` exists (Postgres 16 + Redis 7)
- **U-PER1** ✅ — PersistenceBridge: Promise<boolean> write confirmation, 3x retry, pool=50, graceful shutdown

## Implementation Plan — 5 Units

### Unit 1: Add Material/Machine EntityConfigs to BusinessStore
**File:** `H:\PRISM\mcp-server\src\db\BusinessStore.ts`
- Add `materials` and `machines` entries to `ENTITY_CONFIGS` object (after line 255)
- Each config: `tableName`, `primaryKey: "id"`, `businessKey: "name"`, `hasUpdatedAt: true`
- `jsonColumns` for nested objects: `["physical", "mechanical", "thermal", "machining", "kienzle", "johnson_cook", "taylor", "metadata"]` for materials; `["spindle", "axes", "tool_changer", "table_specs", "controller", "capabilities", "metadata"]` for machines
- `knownColumns` listing all columns including the JSONB ones
- Pure additive — no existing code changes

### Unit 2: Create Migration 010 (Registry Persistence)
**New file:** `H:\PRISM\mcp-server\src\db\migrations\010-registry-persistence.sql`
- `ALTER TABLE materials ADD COLUMN IF NOT EXISTS` for JSONB columns: `physical`, `mechanical`, `thermal`, `machining`, `kienzle`, `johnson_cook`, `taylor` + text columns like `iso_group`, `category`, `hardness`, `density`, `common_names TEXT[]`
- `ALTER TABLE machines ADD COLUMN IF NOT EXISTS` for JSONB columns: `spindle`, `axes`, `tool_changer`, `table_specs`, `controller`, `capabilities` + text columns like `type`, `manufacturer`, `model`, `max_rpm`, `max_power_kw`
- `CREATE UNIQUE INDEX IF NOT EXISTS` on `materials(name)` and `machines(name)` for upsert
- All idempotent. Follows pattern of existing migrations.

### Unit 3: Create RegistrySeeder
**New file:** `H:\PRISM\mcp-server\src\db\RegistrySeeder.ts` (~180 lines)

Exports:
- `seedMaterials(registry: MaterialRegistry): Promise<{seeded: number, errors: number}>` — iterates `registry.entries`, flattens each Material into a StoreRecord, calls `BusinessStore.save()` in batches of 500
- `seedMachines(registry: MachineRegistry): Promise<{seeded: number, errors: number}>` — same pattern for machines
- `verifyRoundTrip(entity: string, expectedCount: number): Promise<boolean>` — compares row count + 5 random spot-checks
- `seedAndVerify(): Promise<SeedReport>` — orchestrates both, returns summary

Flattener logic:
- `materialToRecord(id, entry)` — maps `entry.data` fields to flat columns + JSONB for nested objects
- `machineToRecord(id, entry)` — same for machines
- Both handle missing/null fields gracefully (some registry entries are sparse)

Access pattern: Add `getEntries(): Map<string, RegistryEntry<T>>` public accessor to `BaseRegistry<T>` (1-line addition to `H:\PRISM\mcp-server\src\registries\base.ts`)

### Unit 4: Wire DB Init into Server Startup
**File:** `H:\PRISM\mcp-server\src\index.ts`

Insert initialization block after `registryManager.initialize()` (around line 389):
```typescript
// --- INFRA: Database initialization (graceful — server runs without DB) ---
try {
  const { db } = await import("./db/connection.js");
  const connected = await db.connect();
  if (connected) {
    const { runMigrations } = await import("./db/migration-runner.js");
    await runMigrations();
    const { seedAndVerify } = await import("./db/RegistrySeeder.js");
    await seedAndVerify();
    const { persistenceBridge } = await import("./db/PersistenceBridge.js");
    await persistenceBridge.initialize(db);
  }
} catch (err) {
  log.warn("DB initialization skipped — running in-memory mode", { error: String(err) });
}
```

Also wire `persistenceBridge.gracefulShutdown()` into the existing shutdown handler.

All lazy-imported. All try/caught. Server always starts.

### Unit 5: Create `prism_infra` Dispatcher + Tests
**New file:** `H:\PRISM\mcp-server\src\tools\dispatchers\infraDispatcher.ts` (~180 lines)

6 actions:
- `db_health` — connection status, pool stats, latency ping
- `persistence_health` — PersistenceBridge stats (totalFlushed, totalErrors, pendingWrites)
- `migration_status` — applied migrations list, pending count
- `registry_sync_status` — material/machine row counts vs in-memory counts
- `seed_registries` — manually trigger re-seed
- `infra_summary` — combined dashboard of all above

Schema: `H:\PRISM\mcp-server\src\schemas\infraActionSchemas.ts`
Register in `index.ts` alongside other dispatchers.

**Test file:** `H:\PRISM\mcp-server\src\__tests__\infra-phase1-completion.test.ts` (~200 lines)
- EntityConfig validation (materials/machines configs exist, columns match)
- Record flattener tests (Material → StoreRecord round-trip)
- Seeder works in memory mode (no Postgres needed for CI)
- Dispatcher returns valid responses for all 6 actions
- Graceful degradation when DB unavailable

## Execution Order
```
Unit 1 (BusinessStore configs) ──┐
                                 ├──► Unit 3 (RegistrySeeder) ──► Unit 4 (Startup wiring)
Unit 2 (Migration 010)     ──────┘                                      │
                                                                        ▼
                                                              Unit 5 (Dispatcher + Tests)
```
Units 1 and 2 are independent (parallel). Unit 3 needs Unit 1. Unit 4 needs 1-3. Unit 5 needs 1-4.

## Exit Gate Verification
- [ ] `npm run build` — 0 tsc errors
- [ ] `npx vitest run` — all existing tests pass (0 regressions)
- [ ] New tests pass (EntityConfig, flattener, seeder, dispatcher)
- [ ] In-memory fallback preserved (no DATABASE_URL → server still starts, registries still load from JSON)
- [ ] Migration 010 is idempotent (re-runnable)
- [ ] `prism_infra` dispatcher registered and callable
- [ ] INFRA-1-2 exit gate: materials + machines round-trip Postgres successfully (when DB available)

## Files Modified
| File | Action |
|------|--------|
| `src/db/BusinessStore.ts` | Add 2 EntityConfigs (~30 lines) |
| `src/registries/base.ts` | Add `getEntries()` accessor (1 line) |
| `src/index.ts` | Add DB init block (~15 lines) + shutdown hook (~3 lines) |
| `src/db/migrations/010-registry-persistence.sql` | **NEW** — ALTER TABLE for JSONB columns |
| `src/db/RegistrySeeder.ts` | **NEW** — Seed + verify logic |
| `src/tools/dispatchers/infraDispatcher.ts` | **NEW** — 6 infra health actions |
| `src/schemas/infraActionSchemas.ts` | **NEW** — Zod schemas |
| `src/__tests__/infra-phase1-completion.test.ts` | **NEW** — 15+ test cases |
