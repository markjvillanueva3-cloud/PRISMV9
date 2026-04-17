/**
 * State File Migration Scaffolds (CPP-MS4-U-CPP31)
 * =================================================
 *
 * Centralized migration registry for state files that carry a `schemaVersion`
 * field. Readers should call `migrateToLatest(raw, filename)` before consuming
 * the object. Files without a `schemaVersion` field are treated as v1 (legacy),
 * matching the field that was backfilled in U-CPP31.
 *
 * Current targets (v1 → v1: identity, scaffolded for future evolution):
 * - COMPACTION_SURVIVAL.json
 * - HANDOFF_PACKAGE.json
 * - RECOVERY_MANIFEST.json
 * - CURRENT_STATE.json
 * - next_session_prep.json
 *
 * When a real v2 shape appears, add a `migrate_v1_to_v2(obj)` function in the
 * file-specific block and bump LATEST_VERSION[filename]. Leave v1 handler in
 * place so old files still load.
 *
 * @milestone CPP-MS4-U-CPP31
 */

export type StateFileName =
  | "COMPACTION_SURVIVAL"
  | "HANDOFF_PACKAGE"
  | "RECOVERY_MANIFEST"
  | "CURRENT_STATE"
  | "next_session_prep";

/** Current latest schemaVersion per file. Bump when writing a migration. */
export const LATEST_VERSION: Record<StateFileName, number> = {
  COMPACTION_SURVIVAL: 1,
  HANDOFF_PACKAGE: 1,
  RECOVERY_MANIFEST: 1,
  CURRENT_STATE: 1,
  next_session_prep: 1,
};

/**
 * Reader-side normalization. Accepts any legacy file:
 *   - if `schemaVersion` missing → treat as v1
 *   - if `schemaVersion` below latest → apply chained migrations
 *   - if `schemaVersion` equals latest → return as-is
 *   - if `schemaVersion` above latest → log warn, return as-is (forward-compat)
 */
export function migrateToLatest<T extends Record<string, unknown>>(
  raw: T,
  filename: StateFileName,
): T & { schemaVersion: number } {
  const target = LATEST_VERSION[filename];
  // Missing schemaVersion → treat as v1 and annotate (do NOT write back — reader is pure).
  const current = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;

  // No-op identity while v1 is the only shape. Future migrations will hook here.
  if (current === target) {
    return { ...raw, schemaVersion: target } as T & { schemaVersion: number };
  }

  // Scaffold: chain migrations from `current` upward when v2+ lands.
  // Example (commented out until needed):
  //   let obj: Record<string, unknown> = { ...raw };
  //   if (current < 2 && target >= 2) obj = migrate_v1_to_v2(obj, filename);
  //   if (current < 3 && target >= 3) obj = migrate_v2_to_v3(obj, filename);
  //   return { ...obj, schemaVersion: target } as T & { schemaVersion: number };

  // For now, log and return with the assumed current.
  return { ...raw, schemaVersion: current } as T & { schemaVersion: number };
}

/**
 * Quick detector for readers that want to know whether they received a legacy
 * file (pre-U-CPP31) so they can record a telemetry event or re-save.
 */
export function wasMissingSchemaVersion(raw: Record<string, unknown>): boolean {
  return typeof raw.schemaVersion !== "number";
}
