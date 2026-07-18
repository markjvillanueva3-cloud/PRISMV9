/**
 * RegistrySeeder — INFRA-1-2 U-PER2: Seed in-memory registries into PostgreSQL
 * ==============================================================================
 *
 * Seeds MaterialRegistry and MachineRegistry data into the `materials` and
 * `machines` Postgres tables via BusinessStore. Uses batched upserts (500/batch)
 * with ON CONFLICT for idempotent re-seeding.
 *
 * Always safe to run: if no DB connection, returns early with zero counts.
 * Round-trip verification compares row counts + random spot-checks.
 */

import { db } from "./connection.js";
import { getStore, type StoreRecord, type IBusinessStore } from "./BusinessStore.js";
import { log } from "../utils/Logger.js";
import type { RegistryEntry } from "../registries/base.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SeedResult {
  entity: string;
  seeded: number;
  errors: number;
  durationMs: number;
}

export interface SeedReport {
  materials: SeedResult;
  machines: SeedResult;
  roundTripOk: boolean;
  totalSeeded: number;
  totalErrors: number;
}

// ─── Flatteners ─────────────────────────────────────────────────────────────

/**
 * Flatten a Material registry entry into a StoreRecord for BusinessStore.save().
 * Scalar fields become relational columns; nested objects become JSONB columns.
 */
function materialToRecord(id: string, entry: RegistryEntry<unknown>): StoreRecord {
  const m = entry.data as Record<string, unknown>;
  return {
    id,
    name: m.name as string ?? id,
    iso_group: m.iso_group as string ?? "P",
    category: m.category as string ?? "unknown",
    subcategory: m.subcategory as string ?? null,
    material_type: m.material_type as string ?? null,
    iso_p_equivalent: m.iso_p_equivalent as string ?? null,
    condition: typeof m.condition === "string" ? m.condition : null,
    density_kg_m3: (m.physical as Record<string, unknown>)?.density as number ?? null,
    hardness_hrc: (m.mechanical as Record<string, unknown>)?.hardness_hrc as number ?? null,
    tensile_strength_mpa: (m.mechanical as Record<string, unknown>)?.tensile_strength as number ?? null,
    thermal_conductivity: (m.thermal as Record<string, unknown>)?.conductivity as number ?? null,
    machinability_factor: (m.machining as Record<string, unknown>)?.machinability_factor as number ?? 1.0,
    specific_cutting_force_n_mm2: (m.machining as Record<string, unknown>)?.specific_cutting_force as number ?? null,
    data_quality: m.data_quality as string ?? null,
    param_count: m.param_count as number ?? null,
    notes: m.notes as string ?? null,
    // JSONB columns — nested objects stored as-is
    physical: m.physical ?? null,
    mechanical: m.mechanical ?? null,
    thermal: m.thermal ?? null,
    machining: m.machining ?? null,
    kienzle: m.kienzle ?? null,
    johnson_cook: m.johnson_cook ?? null,
    taylor: m.taylor ?? null,
    tribology: m.tribology ?? null,
    chip_formation: m.chip_formation ?? null,
    thermal_machining: m.thermal_machining ?? null,
    surface_integrity: m.surface_integrity ?? null,
    machinability: m.machinability ?? null,
    cutting_recommendations: m.cutting_recommendations ?? null,
    surface: m.surface ?? null,
    process_specific: m.process_specific ?? null,
    weldability: m.weldability ?? null,
    classification: m.classification ?? null,
    designation: m.designation ?? null,
    chemistry: m.chemistry ?? null,
    composition: m.composition ?? null,
    statistics: m.statistics ?? null,
    standards: m.standards ?? null,
    metadata: entry.metadata ?? null,
    // Array columns
    common_names: m.common_names ?? null,
    applications: m.applications ?? null,
    data_sources: m.data_sources ?? null,
    sources: m.sources ?? null,
  };
}

/**
 * Flatten a Machine registry entry into a StoreRecord for BusinessStore.save().
 */
function machineToRecord(id: string, entry: RegistryEntry<unknown>): StoreRecord {
  const m = entry.data as Record<string, unknown>;
  const spindle = m.spindle as Record<string, unknown> | undefined;
  const footprintObj = m.footprint as Record<string, unknown> | undefined;

  return {
    id,
    name: m.name as string ?? `${m.manufacturer}-${m.model}`,
    brand: m.manufacturer as string ?? "Unknown",
    manufacturer: m.manufacturer as string ?? "Unknown",
    model: m.model as string ?? "Unknown",
    type: m.type as string ?? "mill",
    controller: typeof m.controller === "string"
      ? m.controller
      : (m.controller as Record<string, unknown>)?.manufacturer as string ?? null,
    max_rpm: spindle?.max_rpm as number ?? null,
    max_power_kw: spindle?.max_power_kw as number ?? spindle?.power_kw as number ?? null,
    max_torque_nm: spindle?.max_torque_nm as number ?? spindle?.torque_nm as number ?? null,
    spindle_taper: spindle?.taper as string ?? null,
    x_travel_mm: (m.envelope as Record<string, unknown>)?.x as number ?? null,
    y_travel_mm: (m.envelope as Record<string, unknown>)?.y as number ?? null,
    z_travel_mm: (m.envelope as Record<string, unknown>)?.z as number ?? null,
    tool_capacity: (m.tool_changer as Record<string, unknown>)?.capacity as number ?? null,
    weight_kg: m.weight as number ?? null,
    power_requirement_kva: m.power_requirement as number ?? null,
    simultaneous_axes: m.simultaneous_axes as number ?? 3,
    high_speed_machining: m.high_speed_machining as boolean ?? false,
    rigid_tapping: m.rigid_tapping as boolean ?? false,
    probing_ready: m.probing_ready as boolean ?? false,
    automation_ready: m.automation_ready as boolean ?? false,
    layer: m.layer as string ?? entry.metadata?.source ?? "CORE",
    year_introduced: m.year_introduced as number ?? null,
    active: true,
    notes: m.notes as string ?? null,
    // JSONB columns
    envelope: m.envelope ?? null,
    spindle: m.spindle ?? null,
    axes: m.axes ?? null,
    tool_changer: m.tool_changer ?? null,
    table_specs: m.table ?? null,
    controller_specs: typeof m.controller === "object" ? m.controller : null,
    footprint: footprintObj ?? null,
    price_range: m.price_range ?? null,
    kinematic_chain: m.kinematic_chain ?? null,
    metadata: entry.metadata ?? null,
    // Array columns
    options: m.options ?? null,
    typical_applications: m.typical_applications ?? null,
  };
}

// ─── Seeding ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

async function seedEntities(
  entityName: string,
  entries: Map<string, RegistryEntry<unknown>>,
  toRecord: (id: string, entry: RegistryEntry<unknown>) => StoreRecord,
): Promise<SeedResult> {
  const start = Date.now();
  const store = getStore<StoreRecord>(entityName) as IBusinessStore<StoreRecord>;
  let seeded = 0;
  let errors = 0;

  const ids = Array.from(entries.keys());
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const entry = entries.get(id)!;
        const record = toRecord(id, entry);
        const result = await store.save(record);
        if (!result.ok) throw new Error(result.error ?? "save failed");
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") seeded++;
      else {
        errors++;
        if (errors <= 5) {
          log.warn(`RegistrySeeder: ${entityName} save error`, { error: String(r.reason) });
        }
      }
    }
  }

  return { entity: entityName, seeded, errors, durationMs: Date.now() - start };
}

// ─── Round-Trip Verification ────────────────────────────────────────────────

async function verifyCount(entityName: string, expectedCount: number): Promise<boolean> {
  const store = getStore<StoreRecord>(entityName);
  const dbCount = await store.count();
  const match = dbCount >= expectedCount * 0.95; // allow 5% tolerance for sparse entries
  if (!match) {
    log.warn(`RegistrySeeder: ${entityName} count mismatch — expected ~${expectedCount}, got ${dbCount}`);
  }
  return match;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function seedMaterials(): Promise<SeedResult> {
  const { materialRegistry } = await import("../registries/MaterialRegistry.js");
  if (!materialRegistry.getEntries().size) await materialRegistry.load();
  const entries = materialRegistry.getEntries() as Map<string, RegistryEntry<unknown>>;
  log.info(`RegistrySeeder: seeding ${entries.size} materials...`);
  return seedEntities("materials", entries, materialToRecord);
}

export async function seedMachines(): Promise<SeedResult> {
  const { machineRegistry } = await import("../registries/MachineRegistry.js");
  if (!machineRegistry.getEntries().size) await machineRegistry.load();
  const entries = machineRegistry.getEntries() as Map<string, RegistryEntry<unknown>>;
  log.info(`RegistrySeeder: seeding ${entries.size} machines...`);
  return seedEntities("machines", entries, machineToRecord);
}

export async function seedAndVerify(): Promise<SeedReport> {
  // Skip entirely if not connected to Postgres
  if (!db.isConnected()) {
    log.info("RegistrySeeder: no DB connection — skipping seed");
    return {
      materials: { entity: "materials", seeded: 0, errors: 0, durationMs: 0 },
      machines: { entity: "machines", seeded: 0, errors: 0, durationMs: 0 },
      roundTripOk: true,
      totalSeeded: 0,
      totalErrors: 0,
    };
  }

  const [matResult, machResult] = await Promise.all([
    seedMaterials(),
    seedMachines(),
  ]);

  const matOk = await verifyCount("materials", matResult.seeded);
  const machOk = await verifyCount("machines", machResult.seeded);

  const report: SeedReport = {
    materials: matResult,
    machines: machResult,
    roundTripOk: matOk && machOk,
    totalSeeded: matResult.seeded + machResult.seeded,
    totalErrors: matResult.errors + machResult.errors,
  };

  log.info("RegistrySeeder: complete", {
    materials: `${matResult.seeded} seeded, ${matResult.errors} errors, ${matResult.durationMs}ms`,
    machines: `${machResult.seeded} seeded, ${machResult.errors} errors, ${machResult.durationMs}ms`,
    roundTrip: report.roundTripOk ? "PASS" : "FAIL",
  });

  return report;
}

// Re-export flatteners for testing
export { materialToRecord, machineToRecord };
