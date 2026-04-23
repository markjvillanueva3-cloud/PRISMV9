// WIRE-EXEMPT: schema upgrade/downgrade substrate consumed by migration scripts + state-repair workflows; registerMigration takes callables that cannot round-trip through JSON-RPC
/**
 * SchemaMigrationRollbackEngine — U-FORE-17 (Reliability Substrate)
 *
 * Snapshots state before schema migrations, records an up/down chain,
 * and can roll back to any earlier version.
 */

export interface SchemaMigration<T = unknown> {
  from: number;
  to: number;
  up: (input: T) => T;
  down: (input: T) => T;
}

export interface MigrationResult<T> {
  applied: number[];
  finalVersion: number;
  data: T;
}

export interface HistoryEntry {
  at: number;
  version: number;
  snapshotId: string;
  label?: string;
}

export class SchemaMigrationRollbackEngine {
  readonly name = "SchemaMigrationRollbackEngine";
  private migrations = new Map<number, SchemaMigration>();
  private snapshots = new Map<string, { version: number; data: unknown; at: number; label?: string }>();
  private history = new Map<string, HistoryEntry[]>();
  private snapCounter = 0;

  registerMigration<T>(mig: SchemaMigration<T>): void {
    if (!mig || !Number.isInteger(mig.from) || !Number.isInteger(mig.to)) {
      throw new Error("SchemaMigrationRollbackEngine: integer from/to required");
    }
    if (mig.to !== mig.from + 1) {
      throw new Error(`SchemaMigrationRollbackEngine: migrations must step by +1 (got ${mig.from}→${mig.to})`);
    }
    if (typeof mig.up !== "function" || typeof mig.down !== "function") {
      throw new Error("SchemaMigrationRollbackEngine: up and down functions required");
    }
    this.migrations.set(mig.from, mig as SchemaMigration);
  }

  snapshot(target: string, data: unknown, version: number, label?: string): string {
    if (!target) throw new Error("SchemaMigrationRollbackEngine.snapshot: target required");
    if (!Number.isInteger(version)) throw new Error("SchemaMigrationRollbackEngine.snapshot: integer version required");
    this.snapCounter += 1;
    const id = `snap-${Date.now()}-${this.snapCounter}`;
    const cloned = this.clone(data);
    this.snapshots.set(id, { version, data: cloned, at: Date.now(), label });
    const list = this.history.get(target) ?? [];
    list.push({ at: Date.now(), version, snapshotId: id, label });
    this.history.set(target, list);
    return id;
  }

  migrate<T>(target: string, data: T, fromVersion: number, toVersion: number): MigrationResult<T> {
    if (!target) throw new Error("SchemaMigrationRollbackEngine.migrate: target required");
    if (!Number.isInteger(fromVersion) || !Number.isInteger(toVersion)) {
      throw new Error("SchemaMigrationRollbackEngine.migrate: integer versions required");
    }
    if (toVersion < fromVersion) {
      throw new Error("SchemaMigrationRollbackEngine.migrate: toVersion must be >= fromVersion (use rollback for downgrade)");
    }
    this.snapshot(target, data, fromVersion, `pre-migrate-to-${toVersion}`);
    let current = this.clone(data) as T;
    const applied: number[] = [];
    for (let step = fromVersion; step < toVersion; step++) {
      const mig = this.migrations.get(step);
      if (!mig) throw new Error(`SchemaMigrationRollbackEngine.migrate: no migration registered for ${step}→${step + 1}`);
      current = mig.up(current) as T;
      applied.push(mig.to);
    }
    return { applied, finalVersion: toVersion, data: current };
  }

  rollback<T>(target: string, data: T, fromVersion: number, toVersion: number): MigrationResult<T> {
    if (!target) throw new Error("SchemaMigrationRollbackEngine.rollback: target required");
    if (!Number.isInteger(fromVersion) || !Number.isInteger(toVersion)) {
      throw new Error("SchemaMigrationRollbackEngine.rollback: integer versions required");
    }
    if (toVersion > fromVersion) {
      throw new Error("SchemaMigrationRollbackEngine.rollback: toVersion must be <= fromVersion");
    }
    this.snapshot(target, data, fromVersion, `pre-rollback-to-${toVersion}`);
    let current = this.clone(data) as T;
    const reverted: number[] = [];
    for (let step = fromVersion; step > toVersion; step--) {
      const mig = this.migrations.get(step - 1);
      if (!mig) throw new Error(`SchemaMigrationRollbackEngine.rollback: no migration registered for ${step - 1}→${step}`);
      current = mig.down(current) as T;
      reverted.push(step - 1);
    }
    return { applied: reverted, finalVersion: toVersion, data: current };
  }

  restoreFromSnapshot(snapshotId: string): unknown {
    const snap = this.snapshots.get(snapshotId);
    if (!snap) throw new Error(`SchemaMigrationRollbackEngine.restoreFromSnapshot: unknown snapshot '${snapshotId}'`);
    return this.clone(snap.data);
  }

  listMigrations(): SchemaMigration[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.from - b.from);
  }

  historyFor(target: string): HistoryEntry[] {
    return [...(this.history.get(target) ?? [])];
  }

  reset(): void {
    this.migrations.clear();
    this.snapshots.clear();
    this.history.clear();
    this.snapCounter = 0;
  }

  private clone<T>(input: T): T {
    return JSON.parse(JSON.stringify(input)) as T;
  }
}

export const schemaMigrationRollbackEngine = new SchemaMigrationRollbackEngine();
