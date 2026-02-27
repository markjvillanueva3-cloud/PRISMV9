/**
 * MigrationEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Schema versioning and data migration management.
 * Tracks applied migrations, supports up/down, validates ordering,
 * and prevents duplicate application.
 *
 * Actions: migration_apply, migration_rollback, migration_status,
 *          migration_list, migration_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export type MigrationStatus = "pending" | "applied" | "rolled_back" | "failed";
export type MigrationDirection = "up" | "down";

export interface Migration {
  id: string;
  version: string;
  name: string;
  description: string;
  up: () => { success: boolean; changes: string[] };
  down: () => { success: boolean; changes: string[] };
}

export interface MigrationRecord {
  id: string;
  version: string;
  name: string;
  status: MigrationStatus;
  applied_at?: string;
  rolled_back_at?: string;
  duration_ms: number;
  changes: string[];
  error?: string;
}

export interface MigrationPlan {
  pending: string[];
  applied: string[];
  current_version: string;
  target_version: string;
  steps: { version: string; direction: MigrationDirection; name: string }[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MigrationEngine {
  private migrations: Migration[] = [];
  private records = new Map<string, MigrationRecord>();

  register(migration: Migration): void {
    if (this.migrations.find(m => m.version === migration.version)) return;
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  apply(targetVersion?: string): MigrationRecord[] {
    const results: MigrationRecord[] = [];
    const target = targetVersion || this.migrations[this.migrations.length - 1]?.version;
    if (!target) return results;

    for (const mig of this.migrations) {
      if (mig.version > target) break;

      const existing = this.records.get(mig.version);
      if (existing && existing.status === "applied") continue;

      const start = performance.now();
      try {
        const result = mig.up();
        const elapsed = performance.now() - start;

        const record: MigrationRecord = {
          id: mig.id, version: mig.version, name: mig.name,
          status: result.success ? "applied" : "failed",
          applied_at: new Date().toISOString(),
          duration_ms: Math.round(elapsed),
          changes: result.changes,
          error: result.success ? undefined : "Migration up() returned failure",
        };
        this.records.set(mig.version, record);
        results.push(record);

        if (!result.success) break;
      } catch (err) {
        const elapsed = performance.now() - start;
        const record: MigrationRecord = {
          id: mig.id, version: mig.version, name: mig.name,
          status: "failed",
          duration_ms: Math.round(elapsed),
          changes: [],
          error: err instanceof Error ? err.message : "Unknown error",
        };
        this.records.set(mig.version, record);
        results.push(record);
        break;
      }
    }

    return results;
  }

  rollback(targetVersion?: string): MigrationRecord[] {
    const results: MigrationRecord[] = [];
    const applied = [...this.records.values()]
      .filter(r => r.status === "applied")
      .sort((a, b) => b.version.localeCompare(a.version));

    for (const record of applied) {
      if (targetVersion && record.version <= targetVersion) break;

      const mig = this.migrations.find(m => m.version === record.version);
      if (!mig) continue;

      const start = performance.now();
      try {
        const result = mig.down();
        const elapsed = performance.now() - start;

        record.status = result.success ? "rolled_back" : "failed";
        record.rolled_back_at = new Date().toISOString();
        record.duration_ms += Math.round(elapsed);
        results.push(record);

        if (!result.success) break;
      } catch (err) {
        record.status = "failed";
        record.error = err instanceof Error ? err.message : "Unknown error";
        results.push(record);
        break;
      }
    }

    return results;
  }

  status(): MigrationPlan {
    const applied = [...this.records.values()]
      .filter(r => r.status === "applied")
      .map(r => r.version)
      .sort();

    const pending = this.migrations
      .filter(m => !applied.includes(m.version))
      .map(m => m.version);

    const currentVersion = applied.length > 0 ? applied[applied.length - 1] : "0.0.0";
    const targetVersion = this.migrations.length > 0 ? this.migrations[this.migrations.length - 1].version : "0.0.0";

    const steps = pending.map(v => {
      const mig = this.migrations.find(m => m.version === v)!;
      return { version: v, direction: "up" as MigrationDirection, name: mig.name };
    });

    return { pending, applied, current_version: currentVersion, target_version: targetVersion, steps };
  }

  getRecords(): MigrationRecord[] {
    return [...this.records.values()].sort((a, b) => a.version.localeCompare(b.version));
  }

  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const versions = new Set<string>();

    for (const mig of this.migrations) {
      if (versions.has(mig.version)) issues.push(`Duplicate version: ${mig.version}`);
      versions.add(mig.version);
    }

    const applied = [...this.records.values()].filter(r => r.status === "applied").map(r => r.version).sort();
    for (let i = 0; i < applied.length; i++) {
      const idx = this.migrations.findIndex(m => m.version === applied[i]);
      if (idx < 0) issues.push(`Applied migration ${applied[i]} not found in registry`);
    }

    return { valid: issues.length === 0, issues };
  }

  clear(): void { this.migrations = []; this.records.clear(); }
}

export const migrationEngine = new MigrationEngine();
