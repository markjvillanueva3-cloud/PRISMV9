# PRISM Infrastructure Modernization — Phase 1 (Data Foundation) Completion Plan

## Status Summary

| Unit | Status | Details |
|------|--------|---------|
| INFRA-1-1 U-DB1 | COMPLETE | `pg` ^8.20.0 in package.json, dynamic import with fallback in `connection.ts` |
| INFRA-1-1 U-DB2 | COMPLETE | Migration runner at `src/db/migration-runner.ts`, 9 migrations (001-009), checksums |
| INFRA-1-1 U-DB3 | COMPLETE | `docker-compose.dev.yml` with Postgres 16 + Redis 7 |
| INFRA-1-2 U-PER1 | COMPLETE | PersistenceBridge with write confirm, 3x retry, graceful shutdown, pool=50 |
| INFRA-1-2 U-PER2 | **NOT DONE** | Registries still purely in-memory; no Postgres seeding or round-trip |
| Startup Wiring | **GAP** | No `db.connect()` or `persistenceBridge.loadAll()` in `registerTools()` |
| `prism_infra` Dispatcher | **MISSING** | No infrastructure health/status dispatcher exists |

---

## Work Items (5 units)

### UNIT 1: Add `materials` and `machines` EntityConfigs to BusinessStore.ts

**File:** `H:\PRISM\mcp-server\src\db\BusinessStore.ts`

**What:** Add two new entries to the `ENTITY_CONFIGS` object (around line 98-256) so that `getStore("materials")` and `getStore("machines")` return functional stores.

**Implementation:**

```typescript
// Add after the existing "shop_profiles" entry (~line 256):

materials: {
  tableName: "materials",
  primaryKey: "id",
  businessKey: "name",
  jsonColumns: ["physical", "mechanical", "thermal", "machining", "kienzle", "johnson_cook", "taylor", "tribology", "chip_formation", "thermal_machining", "surface_integrity", "machinability", "cutting_recommendations", "surface", "process_specific", "weldability", "chemistry", "composition", "designation", "condition", "statistics", "classification"],
  arrayColumns: ["common_names", "applications", "data_sources"],
  hasUpdatedAt: true,
  knownColumns: [
    "id", "name", "iso_group", "category", "subcategory",
    "density_kg_m3", "hardness_hrc", "tensile_strength_mpa",
    "thermal_conductivity", "machinability_factor",
    "specific_cutting_force_n_mm2", "notes",
    "created_at", "updated_at",
    // JSONB columns for the rich data
    "physical", "mechanical", "thermal", "machining",
    "kienzle", "johnson_cook", "taylor", "tribology",
    "chip_formation", "thermal_machining", "surface_integrity",
    "machinability", "cutting_recommendations", "surface",
    "process_specific", "weldability", "chemistry", "composition",
    "designation", "condition", "statistics", "classification",
    // Array columns
    "common_names", "applications", "data_sources",
    // Extra fields
    "material_id", "material_type", "data_quality", "param_count"
  ],
},
machines: {
  tableName: "machines",
  primaryKey: "id",
  businessKey: "name",
  jsonColumns: ["envelope", "spindle", "axes", "tool_changer", "table_specs", "controller_specs", "footprint", "kinematic_chain", "price_range"],
  arrayColumns: ["typical_applications"],
  hasUpdatedAt: true,
  knownColumns: [
    "id", "name", "brand", "model", "type", "controller",
    "max_rpm", "max_power_kw", "max_torque_nm", "spindle_taper",
    "x_travel_mm", "y_travel_mm", "z_travel_mm",
    "tool_capacity", "pallet_count", "hourly_rate_usd",
    "active", "notes", "created_at", "updated_at",
    // JSONB columns for rich data
    "envelope", "spindle", "axes", "tool_changer", "table_specs",
    "controller_specs", "footprint", "kinematic_chain", "price_range",
    // Array columns
    "typical_applications",
    // Extra fields from Machine interface
    "manufacturer", "layer", "year_introduced",
    "simultaneous_axes", "high_speed_machining",
    "rigid_tapping", "probing_ready", "automation_ready",
    "weight", "power_requirement", "air_requirement", "coolant_capacity"
  ],
},
```

**Key design decisions:**
- Use `name` as `businessKey` for both — names are the natural lookup key in the registries
- Store complex nested objects (physical, mechanical, spindle, axes, etc.) as JSONB columns
- The existing `schema.sql` already has `materials` and `machines` tables with basic columns. The JSONB approach allows storing the full rich objects without a massive ALTER TABLE migration.

**Dependency:** None. This is a pure addition.

---

### UNIT 2: Create Migration 010 — Extend materials/machines tables for JSONB storage

**File:** `H:\PRISM\mcp-server\src\db\migrations\010-registry-persistence.sql`

**What:** Add JSONB columns to the existing `materials` and `machines` tables (from `schema.sql`) so they can store the full registry data. The base `schema.sql` only has ~12 columns each; the registries have 40-127 fields per record stored as nested objects.

**Implementation:**

```sql
-- Migration 010: Registry Persistence — Extend materials/machines for full registry data
-- INFRA-1-2 U-PER2: Seeds MaterialRegistry + MachineRegistry into Postgres

-- ============================================================================
-- MATERIALS: Add JSONB columns for rich nested data
-- ============================================================================
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_id VARCHAR(200);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_type VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS physical JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS mechanical JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS thermal JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS machining JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS kienzle JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS johnson_cook JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS taylor JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tribology JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS chip_formation JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS thermal_machining JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS surface_integrity JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS machinability JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cutting_recommendations JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS surface JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS process_specific JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS weldability JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS chemistry JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS composition JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS designation JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS condition JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS statistics JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS classification JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS common_names TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS applications TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS data_sources TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS data_quality VARCHAR(50);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS param_count INTEGER;

-- Unique constraint on name for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_name_unique ON materials(name);

-- ============================================================================
-- MACHINES: Add JSONB columns for rich nested data
-- ============================================================================
ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS envelope JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS spindle JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS axes JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS tool_changer JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS table_specs JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller_specs JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS footprint JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS kinematic_chain JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS price_range JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS typical_applications TEXT[];
ALTER TABLE machines ADD COLUMN IF NOT EXISTS layer VARCHAR(20);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS year_introduced INTEGER;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS simultaneous_axes INTEGER;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS high_speed_machining BOOLEAN;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS rigid_tapping BOOLEAN;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS probing_ready BOOLEAN;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS automation_ready BOOLEAN;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS weight NUMERIC(12,2);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS power_requirement NUMERIC(8,2);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS air_requirement NUMERIC(8,2);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS coolant_capacity NUMERIC(10,2);

-- Unique constraint on name for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_name_unique ON machines(name);

-- Record migration
INSERT INTO schema_migrations (version, name, checksum)
VALUES ('010', 'registry-persistence', 'auto')
ON CONFLICT (version) DO NOTHING;
```

**Key design decisions:**
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` is idempotent — safe to re-run
- Using `JSONB` for deeply nested objects (physical properties, spindle specs, etc.) rather than trying to flatten 127 fields into relational columns
- Adding a UNIQUE index on `name` to enable upsert in `PostgresBusinessStore.save()` via the businessKey mechanism already built into BusinessStore

**Dependency:** Must run after existing migrations 001-009.

---

### UNIT 3: Create RegistrySeeder — bridge between in-memory registries and Postgres

**File:** `H:\PRISM\mcp-server\src\db\RegistrySeeder.ts` (NEW, ~200 lines)

**What:** A module that:
1. After registries load from JSON files (existing behavior), seeds their data into Postgres
2. On subsequent startups with Postgres available, loads from Postgres instead of JSON (faster)
3. Verifies round-trip fidelity (count match + spot-check)
4. Falls back gracefully to JSON loading if Postgres is unavailable

**Function signatures:**

```typescript
// H:\PRISM\mcp-server\src\db\RegistrySeeder.ts

import { getStore, type StoreRecord } from "./BusinessStore.js";
import { db } from "./connection.js";
import { persistenceBridge } from "./PersistenceBridge.js";
import type { Material } from "../types.js";
import type { Machine } from "../registries/MachineRegistry.js";

export interface SeedResult {
  entity: string;
  seeded: number;
  existing: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

export interface RoundTripResult {
  entity: string;
  inMemoryCount: number;
  postgresCount: number;
  match: boolean;
  spotCheckPassed: boolean;
  spotCheckDetails?: string;
}

/**
 * Seed a registry's in-memory entries into Postgres via BusinessStore.
 * Uses batch INSERT with ON CONFLICT DO NOTHING for idempotency.
 * Does NOT clear existing Postgres data — additive only.
 */
export async function seedMaterials(
  entries: Map<string, { id: string; data: Material }>,
): Promise<SeedResult>;

/**
 * Seed machine registry entries into Postgres.
 */
export async function seedMachines(
  entries: Map<string, { id: string; data: Machine }>,
): Promise<SeedResult>;

/**
 * Flatten a Material object into a StoreRecord suitable for BusinessStore.save().
 * Maps nested objects to JSONB column values.
 */
function materialToRecord(id: string, mat: Material): StoreRecord;

/**
 * Flatten a Machine object into a StoreRecord suitable for BusinessStore.save().
 */
function machineToRecord(id: string, machine: Machine): StoreRecord;

/**
 * Verify that Postgres row count matches in-memory registry count,
 * and spot-check 5 random entries for data fidelity.
 */
export async function verifyRoundTrip(
  entity: "materials" | "machines",
  inMemoryEntries: Map<string, any>,
): Promise<RoundTripResult>;

/**
 * Register MaterialRegistry and MachineRegistry Maps with PersistenceBridge
 * so that future mutations (user adds material, etc.) are persisted.
 */
export function registerRegistriesWithBridge(
  materialEntries: Map<string, any>,
  machineEntries: Map<string, any>,
): void;

/**
 * Full seed pipeline: seed both registries, verify round-trip, register with bridge.
 * Called once from server startup after registries are loaded.
 */
export async function seedAndVerifyRegistries(
  materialEntries: Map<string, { id: string; data: Material }>,
  machineEntries: Map<string, { id: string; data: Machine }>,
): Promise<{
  materials: SeedResult;
  machines: SeedResult;
  verification: { materials: RoundTripResult; machines: RoundTripResult };
}>;
```

**Implementation approach for `seedMaterials`:**
1. Get `materialStore = getStore("materials")`
2. Check current Postgres count via `materialStore.count()`
3. If count > 0 and close to `entries.size`, skip seeding (already done)
4. Otherwise, iterate entries in batches of 500
5. For each entry, call `materialToRecord()` to flatten, then `materialStore.save()`
6. The `PostgresBusinessStore.save()` uses `ON CONFLICT (name) DO UPDATE` (via the businessKey upsert pattern at line 279-286 of BusinessStore.ts)
7. Count successes/errors and return `SeedResult`

**Implementation approach for `materialToRecord`:**
```typescript
function materialToRecord(id: string, mat: Material): StoreRecord {
  return {
    name: mat.name,
    iso_group: mat.iso_group,
    category: mat.category,
    subcategory: mat.subcategory ?? null,
    material_id: mat.material_id ?? id,
    material_type: mat.material_type ?? null,
    density_kg_m3: mat.physical?.density ?? null,
    hardness_hrc: mat.mechanical?.hardness?.rockwell_c ?? null,
    tensile_strength_mpa: typeof mat.mechanical?.tensile_strength === "number"
      ? mat.mechanical.tensile_strength : null,
    thermal_conductivity: mat.thermal?.thermal_conductivity ?? null,
    machinability_factor: mat.machining?.machinability_rating ?? null,
    specific_cutting_force_n_mm2: mat.kienzle?.kc1_1 ?? null,
    // JSONB columns — store full nested objects
    physical: mat.physical ?? null,
    mechanical: mat.mechanical ?? null,
    thermal: mat.thermal ?? null,
    machining: mat.machining ?? null,
    kienzle: mat.kienzle ?? null,
    johnson_cook: mat.johnson_cook ?? null,
    taylor: mat.taylor ?? null,
    tribology: mat.tribology ?? null,
    chip_formation: mat.chip_formation ?? null,
    thermal_machining: mat.thermal_machining ?? null,
    surface_integrity: mat.surface_integrity ?? null,
    machinability: mat.machinability ?? null,
    cutting_recommendations: mat.cutting_recommendations ?? null,
    surface: mat.surface ?? null,
    process_specific: mat.process_specific ?? null,
    weldability: mat.weldability ?? null,
    chemistry: mat.chemistry ?? null,
    composition: mat.composition ?? null,
    designation: mat.designation ?? null,
    condition: typeof mat.condition === "string" ? { state: mat.condition } : mat.condition ?? null,
    statistics: mat.statistics ?? null,
    classification: mat.classification ?? null,
    common_names: mat.common_names ?? null,
    applications: mat.applications ?? null,
    data_sources: mat.data_sources ?? null,
    data_quality: mat.data_quality ?? null,
    param_count: mat.param_count ?? null,
  };
}
```

**Implementation approach for `registerRegistriesWithBridge`:**
```typescript
export function registerRegistriesWithBridge(
  materialEntries: Map<string, any>,
  machineEntries: Map<string, any>,
): void {
  persistenceBridge.registerMap({
    entity: "materials",
    getMap: () => materialEntries as Map<string, StoreRecord>,
    keyField: "name",
    toRecord: (entry: any) => materialToRecord(entry.id, entry.data),
    fromRecord: (record: StoreRecord) => ({
      id: String(record.name),
      data: record as any,
      metadata: { created: String(record.created_at ?? ""), updated: String(record.updated_at ?? ""), version: 1 },
    }),
  });

  persistenceBridge.registerMap({
    entity: "machines",
    getMap: () => machineEntries as Map<string, StoreRecord>,
    keyField: "name",
    toRecord: (entry: any) => machineToRecord(entry.id, entry.data),
    fromRecord: (record: StoreRecord) => ({
      id: String(record.name),
      data: record as any,
      metadata: { created: String(record.created_at ?? ""), updated: String(record.updated_at ?? ""), version: 1 },
    }),
  });
}
```

**Implementation approach for `verifyRoundTrip`:**
1. Count in-memory entries and Postgres rows
2. Pick 5 random keys from in-memory Map
3. For each, `findByField("name", key)` in Postgres
4. Compare `iso_group` (materials) or `type` (machines) matches
5. Return `RoundTripResult` with match/spotCheck booleans

**Key design decisions:**
- Seeding is additive (ON CONFLICT ... DO UPDATE), never destructive
- The `materialToRecord` flattener populates both the base relational columns AND the JSONB columns, so SQL queries on `iso_group` still work while the full object is also available
- Round-trip verification uses spot-checks (5 random samples), not full deep equality on 2,957 records
- `registerRegistriesWithBridge` ensures future mutations (if user adds a material via API) are also persisted

**Dependency:** UNIT 1 (EntityConfig entries) and UNIT 2 (migration with JSONB columns)

---

### UNIT 4: Wire DB initialization and registry seeding into server startup

**File:** `H:\PRISM\mcp-server\src\index.ts`

**What:** Add the following to `registerTools()` (after `registryManager.initialize()` at line 389, before dispatcher registrations at line 456):

```typescript
// INFRA-1-2: Initialize database connection and seed registries
try {
  const { db } = await import("./db/connection.js");
  const connected = await db.connect();
  
  if (connected) {
    // Run pending migrations
    const { runMigrations, discoverMigrations, getAppliedMigrations } = await import("./db/migration-runner.js");
    const { join } = await import("path");
    const migrationsDir = join(PATHS.MCP_SERVER, "src", "db", "migrations");
    try {
      const discovered = await discoverMigrations(migrationsDir);
      const applied = await getAppliedMigrations(db);
      const pending = discovered.filter(m => !applied.some(a => a.version === m.version));
      if (pending.length > 0) {
        log.info(`[DB] Running ${pending.length} pending migrations...`);
        const results = await runMigrations(db, { migrationsDir });
        const appliedCount = results.filter(r => r.status === "applied").length;
        log.info(`[DB] Migrations complete: ${appliedCount} applied, ${results.length - appliedCount} skipped`);
      } else {
        log.info(`[DB] All ${discovered.length} migrations up to date`);
      }
    } catch (migErr: any) {
      log.warn(`[DB] Migration runner failed (non-fatal): ${migErr.message}`);
    }

    // Seed registries into Postgres
    const { seedAndVerifyRegistries, registerRegistriesWithBridge } = await import("./db/RegistrySeeder.js");
    try {
      const seedResult = await seedAndVerifyRegistries(
        registryManager.materials.getEntries(),
        registryManager.machines.getEntries(),
      );
      log.info(`[DB] Materials seeded: ${seedResult.materials.seeded}, verified: ${seedResult.verification.materials.match}`);
      log.info(`[DB] Machines seeded: ${seedResult.machines.seeded}, verified: ${seedResult.verification.machines.match}`);
    } catch (seedErr: any) {
      log.warn(`[DB] Registry seeding failed (non-fatal): ${seedErr.message}`);
    }

    // Initialize PersistenceBridge for ongoing writes
    const { persistenceBridge } = await import("./db/PersistenceBridge.js");
    const bridgeResult = await persistenceBridge.loadAll();
    log.info(`[DB] PersistenceBridge: mode=${bridgeResult.mode}, loaded=${JSON.stringify(bridgeResult.loaded)}`);
  } else {
    log.info("[DB] No PostgreSQL connection — running in-memory mode (all data from JSON files)");
  }
} catch (dbErr: any) {
  log.warn(`[DB] Database initialization failed (non-fatal, using in-memory): ${dbErr.message}`);
}
```

**Also needed:** Add a `getEntries()` method to `MaterialRegistry` and `MachineRegistry` (or use the existing `entries` Map exposed through the `BaseRegistry` base class). Looking at `base.ts` line 47, `entries` is `protected`, so we need to add a public accessor:

**File:** `H:\PRISM\mcp-server\src\registries\MaterialRegistry.ts` — add near the end (before the singleton export):
```typescript
/** Expose entries Map for PersistenceBridge seeding (INFRA-1-2 U-PER2). */
getEntries(): Map<string, RegistryEntry<Material>> {
  return this.entries;
}
```

**File:** `H:\PRISM\mcp-server\src\registries\MachineRegistry.ts` — same pattern:
```typescript
/** Expose entries Map for PersistenceBridge seeding (INFRA-1-2 U-PER2). */
getEntries(): Map<string, RegistryEntry<Machine>> {
  return this.entries;
}
```

**Also wire graceful shutdown** in `index.ts` `gracefulShutdown()` (line 982):
```typescript
// Add after the existing MemGraph shutdown:
try {
  const { persistenceBridge } = require("./db/PersistenceBridge.js");
  persistenceBridge?.gracefulShutdown?.();
  log.info("[SHUTDOWN] PersistenceBridge flushed");
} catch (e) { log.warn(`[SHUTDOWN] PersistenceBridge flush failed: ${(e as Error).message}`); }
```

**Key design decisions:**
- All DB initialization is wrapped in try/catch — server ALWAYS starts, even without Postgres
- Migrations run automatically on startup (standard pattern for dev/staging)
- Seeding happens after registries load from JSON, so Postgres gets the same data
- PersistenceBridge.loadAll() is called AFTER seeding, so it can load business entity Maps
- Lazy imports (`await import(...)`) avoid circular dependency issues
- `getEntries()` exposes the protected Map — this is the minimum-invasion approach vs making `entries` public in `base.ts` (which would affect all 14 registries)

**Dependency:** UNITS 1, 2, 3

---

### UNIT 5: Create `prism_infra` dispatcher for health/status actions

**Files:**
- `H:\PRISM\mcp-server\src\tools\dispatchers\infraDispatcher.ts` (NEW, ~200 lines)
- `H:\PRISM\mcp-server\src\index.ts` (add import + registration)

**What:** A new dispatcher exposing infrastructure health actions:

**Actions:**
| Action | Description |
|--------|-------------|
| `db_health` | Database connection health (latency, pool stats) |
| `persistence_health` | PersistenceBridge status (mode, pending writes, errors) |
| `migration_status` | List applied/pending migrations |
| `registry_sync_status` | Compare in-memory registry counts vs Postgres row counts |
| `seed_registries` | Manually trigger registry seeding (admin action) |
| `infra_summary` | Combined infrastructure health summary |

**Implementation pattern** (following `devDispatcher.ts` as template):

```typescript
// H:\PRISM\mcp-server\src\tools\dispatchers\infraDispatcher.ts

import { z } from "zod";
import { log } from "../../utils/Logger.js";

const ACTIONS = [
  "db_health",
  "persistence_health",
  "migration_status",
  "registry_sync_status",
  "seed_registries",
  "infra_summary",
] as const;

export function registerInfraDispatcher(server: any): void {
  server.tool(
    "prism_infra",
    `PRISM Infrastructure health and status. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Infrastructure action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_infra] Action: ${action}`);
      let result: any = {};

      switch (action) {
        case "db_health": {
          const { db } = await import("../../db/connection.js");
          const health = await db.healthCheck();
          result = { ...health, config: db.toJSON() };
          break;
        }
        case "persistence_health": {
          const { persistenceBridge } = await import("../../db/PersistenceBridge.js");
          result = persistenceBridge.getHealth();
          break;
        }
        case "migration_status": {
          const { db } = await import("../../db/connection.js");
          const { discoverMigrations, getAppliedMigrations } = await import("../../db/migration-runner.js");
          const { join } = await import("path");
          const { PATHS } = await import("../../constants.js");
          const migrationsDir = join(PATHS.MCP_SERVER, "src", "db", "migrations");
          const discovered = await discoverMigrations(migrationsDir);
          const applied = db.isConnected() ? await getAppliedMigrations(db) : [];
          result = {
            discovered: discovered.map(m => ({ version: m.version, name: m.name, checksum: m.checksum })),
            applied: applied.map(a => ({ version: a.version, name: a.name, applied_at: a.applied_at })),
            pending: discovered.filter(m => !applied.some(a => a.version === m.version)).map(m => m.version),
            total_discovered: discovered.length,
            total_applied: applied.length,
          };
          break;
        }
        case "registry_sync_status": {
          const { db } = await import("../../db/connection.js");
          const { registryManager } = await import("../../registries/index.js");
          const materialsInMemory = registryManager.materials.size;
          const machinesInMemory = registryManager.machines.size;
          let materialsInPostgres = 0;
          let machinesInPostgres = 0;
          if (db.isConnected()) {
            try {
              const mRes = await db.query<{ cnt: string }>("SELECT COUNT(*) as cnt FROM materials");
              materialsInPostgres = parseInt(mRes.rows[0]?.cnt ?? "0", 10);
              const mcRes = await db.query<{ cnt: string }>("SELECT COUNT(*) as cnt FROM machines");
              machinesInPostgres = parseInt(mcRes.rows[0]?.cnt ?? "0", 10);
            } catch { /* table may not exist */ }
          }
          result = {
            materials: { in_memory: materialsInMemory, in_postgres: materialsInPostgres, synced: materialsInMemory === materialsInPostgres },
            machines: { in_memory: machinesInMemory, in_postgres: machinesInPostgres, synced: machinesInMemory === machinesInPostgres },
            db_connected: db.isConnected(),
          };
          break;
        }
        case "seed_registries": {
          const { seedAndVerifyRegistries } = await import("../../db/RegistrySeeder.js");
          const { registryManager } = await import("../../registries/index.js");
          result = await seedAndVerifyRegistries(
            registryManager.materials.getEntries(),
            registryManager.machines.getEntries(),
          );
          break;
        }
        case "infra_summary": {
          const { db } = await import("../../db/connection.js");
          const { persistenceBridge } = await import("../../db/PersistenceBridge.js");
          const dbHealth = await db.healthCheck();
          const bridgeHealth = persistenceBridge.getHealth();
          result = {
            database: { connected: db.isConnected(), ...dbHealth },
            persistence_bridge: bridgeHealth,
            infra_phase: "1-2",
            status: db.isConnected() && bridgeHealth.initialized ? "OPERATIONAL" : "IN_MEMORY_FALLBACK",
          };
          break;
        }
        default:
          result = { error: `Unknown action: ${action}`, available_actions: ACTIONS };
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
```

**Registration in index.ts** — add import at top with other dispatchers:
```typescript
import { registerInfraDispatcher } from "./tools/dispatchers/infraDispatcher.js";
```

And in `registerTools()`, add after the existing dispatcher registrations:
```typescript
// INFRA-1-2: Infrastructure Health & Status (6 actions)
registerInfraDispatcher(server);
```

**Key design decisions:**
- Follows the exact same pattern as `devDispatcher.ts` (lazy imports, z.enum, switch/case)
- All actions are read-only except `seed_registries` (which is idempotent via upsert)
- `infra_summary` provides a single-call overview for monitoring
- `registry_sync_status` directly compares in-memory vs Postgres counts for verification

**Dependency:** UNITS 1-4

---

### UNIT 6: Tests

**File:** `H:\PRISM\mcp-server\src\__tests__\infra-1-2-registry-persistence.test.ts` (NEW, ~250 lines)

**Test cases (minimum 15):**

```
describe("INFRA-1-2 U-PER2: Registry Persistence")
  describe("EntityConfig")
    it("materials EntityConfig exists in ENTITY_CONFIGS")
    it("machines EntityConfig exists in ENTITY_CONFIGS")
    it("materials EntityConfig has correct tableName and businessKey")
    it("machines EntityConfig has correct tableName and businessKey")
    it("materials EntityConfig includes all JSONB columns")
    it("machines EntityConfig includes all JSONB columns")

  describe("materialToRecord")
    it("flattens a Material object to StoreRecord with all JSONB fields")
    it("handles missing optional fields gracefully (null)")
    it("preserves iso_group and category as top-level fields")
    it("converts string condition to object")

  describe("machineToRecord")
    it("flattens a Machine object to StoreRecord")
    it("handles missing optional fields gracefully (null)")

  describe("RegistrySeeder (InMemory mode)")
    it("seedMaterials returns { seeded: 0 } when DB is not connected")
    it("seedMachines returns { seeded: 0 } when DB is not connected")
    it("registerRegistriesWithBridge registers both entities")
    it("verifyRoundTrip returns match=true when both sides are empty")

  describe("PersistenceBridge integration")
    it("getHealth() includes materials and machines in registeredEntities after registration")
    it("persist() resolves true in memory mode")

  describe("InfraDispatcher actions")
    it("db_health returns health object with ok and latency_ms")
    it("persistence_health returns bridge health with mode and entities")
    it("registry_sync_status returns in_memory counts for both registries")
    it("infra_summary returns combined status object")
    it("unknown action returns error with available_actions")
```

**Testing approach:**
- All tests work without Postgres (InMemory mode), since `DATABASE_URL` is not set in test environment
- Use `persistenceBridge.reset()` in `beforeEach` for test isolation
- Import `materialToRecord` / `machineToRecord` directly for unit testing the flatteners
- For the dispatcher tests, call the handler function directly (not through MCP protocol)
- Verify existing tests still pass: `npx vitest run src/__tests__/business-store-persistence.test.ts`

---

## Execution Sequence

```
UNIT 1  ─── Add EntityConfigs to BusinessStore.ts
  │
  ├── UNIT 2  ─── Create migration 010-registry-persistence.sql
  │
  └── UNIT 3  ─── Create RegistrySeeder.ts
         │
         └── UNIT 4  ─── Wire into index.ts startup
                │
                └── UNIT 5  ─── Create prism_infra dispatcher
                       │
                       └── UNIT 6  ─── Write tests
```

Units 1 and 2 can be done in parallel. Unit 3 depends on Unit 1. Units 4 and 5 depend on 3. Unit 6 runs last but can be started early for the EntityConfig and flattener tests.

---

## Exit Gate Verification Checklist

After all units are complete, verify:

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx vitest run` — all existing tests pass (0 regressions)
- [ ] `npx vitest run src/__tests__/infra-1-2-registry-persistence.test.ts` — all new tests pass
- [ ] `npx vitest run src/__tests__/business-store-persistence.test.ts` — existing tests still pass
- [ ] `getStore("materials")` returns a valid store (InMemory or Postgres)
- [ ] `getStore("machines")` returns a valid store (InMemory or Postgres)
- [ ] Server starts cleanly without `DATABASE_URL` (in-memory fallback)
- [ ] Server starts cleanly WITH `DATABASE_URL` pointing to Postgres 16
- [ ] With Postgres: `prism_infra registry_sync_status` shows `synced: true` for both registries
- [ ] With Postgres: `prism_infra db_health` shows `ok: true`
- [ ] `prism_infra infra_summary` returns status without error
- [ ] PersistenceBridge `getHealth().registeredEntities` includes "materials" and "machines"
- [ ] Migration 010 applies cleanly on fresh DB (after schema.sql + migrations 001-009)
- [ ] No new `@ts-ignore` or `@ts-nocheck` annotations introduced
- [ ] Anti-regression: dispatcher action count >= previous count

---

## Risk Mitigations

1. **Large seeding time (2,957 materials):** Use batch inserts (500 per batch) with progress logging. Expected time: 5-15 seconds on first seed, near-zero on subsequent starts (skip if counts match).

2. **JSONB serialization failures:** The `PostgresBusinessStore.serializeValue()` at line 466 already handles JSONB serialization. Verify that the `jsonColumns` list in EntityConfig is complete — any nested object NOT listed will be inserted as a raw string, causing type errors.

3. **Migration running before tables exist:** The migration uses `ALTER TABLE ADD COLUMN IF NOT EXISTS`, which requires the base table to exist. The base `schema.sql` creates `materials` and `machines` tables. If schema.sql hasn't been run, the migration will fail. Mitigation: the migration runner should run schema.sql first (or we ensure it's part of migration 001, which it effectively is since 001 also has CREATE TABLE IF NOT EXISTS for its tables).

4. **Circular imports:** `RegistrySeeder.ts` imports from `BusinessStore.ts` and `PersistenceBridge.ts`, but NOT from the registries (it receives the entries Map as a parameter). The registries do NOT import from `RegistrySeeder.ts`. No circular risk.

5. **Test isolation:** PersistenceBridge has a `reset()` method (line 342-355). BusinessStore has `resetStoreCache()`. Both are called in `beforeEach` for test isolation.
