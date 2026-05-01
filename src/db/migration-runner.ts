/**
 * PRISM Migration Runner — INFRA-1-1 U-DB2
 *
 * Executes SQL migration files (001-NNN) in order against PostgreSQL.
 * Tracks applied migrations in `schema_migrations` table.
 *
 * Features:
 *   - Idempotent: skips already-applied migrations (by version)
 *   - Checksum verification: detects modified migration files
 *   - Rollback support: wraps each migration in a transaction
 *   - Dry-run mode: logs what would execute without touching the DB
 *   - CLI and programmatic usage
 */

import { createHash } from "crypto";
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { DatabaseConnection } from "./connection.js";

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  applied_at: string;
  checksum: string | null;
}

export interface MigrationResult {
  version: string;
  name: string;
  status: "applied" | "skipped" | "failed" | "dry-run";
  duration_ms?: number;
  error?: string;
}

export interface MigrationRunnerOptions {
  /** Directory containing .sql migration files. Defaults to src/db/migrations */
  migrationsDir?: string;
  /** If true, log what would execute without touching the DB */
  dryRun?: boolean;
  /** If true, halt on first failure. Defaults to true. */
  haltOnError?: boolean;
  /** Logger function. Defaults to console.log */
  log?: (msg: string) => void;
}

const MIGRATION_FILE_PATTERN = /^(\d{3})-(.+)\.sql$/;

function computeChecksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex").slice(0, 16);
}

export async function discoverMigrations(dir: string): Promise<MigrationFile[]> {
  const entries = await readdir(dir);
  const sqlFiles = entries.filter((f) => MIGRATION_FILE_PATTERN.test(f)).sort();

  const migrations: MigrationFile[] = [];
  for (const filename of sqlFiles) {
    const match = filename.match(MIGRATION_FILE_PATTERN);
    if (!match) continue;
    const sql = await readFile(join(dir, filename), "utf8");
    migrations.push({
      version: match[1],
      name: match[2],
      filename,
      sql,
      checksum: computeChecksum(sql),
    });
  }
  return migrations;
}

export async function getAppliedMigrations(db: DatabaseConnection): Promise<AppliedMigration[]> {
  // Ensure schema_migrations table exists (idempotent)
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum VARCHAR(64)
    )
  `);

  const result = await db.query<AppliedMigration>(
    "SELECT version, name, applied_at::text, checksum FROM schema_migrations ORDER BY version"
  );
  return result.rows;
}

export async function runMigrations(
  db: DatabaseConnection,
  options: MigrationRunnerOptions = {}
): Promise<MigrationResult[]> {
  const {
    migrationsDir = join(process.cwd(), "src", "db", "migrations"),
    dryRun = false,
    haltOnError = true,
    log = console.log,
  } = options;

  const results: MigrationResult[] = [];

  // 1. Discover migration files
  const files = await discoverMigrations(migrationsDir);
  if (files.length === 0) {
    log("[migrate] No migration files found in " + migrationsDir);
    return results;
  }
  log(`[migrate] Found ${files.length} migration file(s)`);

  // 2. Get already-applied migrations
  const applied = await getAppliedMigrations(db);
  const appliedMap = new Map(applied.map((a) => [a.version, a]));

  // 3. Execute pending migrations in order
  for (const migration of files) {
    const existing = appliedMap.get(migration.version);

    // Already applied — check checksum, then skip
    if (existing) {
      if (existing.checksum && existing.checksum !== migration.checksum) {
        log(
          `[migrate] WARNING: ${migration.filename} checksum mismatch! ` +
          `DB=${existing.checksum} File=${migration.checksum}. ` +
          `Migration may have been modified after application.`
        );
      }
      results.push({ version: migration.version, name: migration.name, status: "skipped" });
      continue;
    }

    // Dry-run mode — log and skip
    if (dryRun) {
      log(`[migrate] DRY-RUN: Would apply ${migration.filename} (${migration.sql.length} chars)`);
      results.push({ version: migration.version, name: migration.name, status: "dry-run" });
      continue;
    }

    // Apply the migration inside a transaction
    const start = Date.now();
    try {
      await db.transaction(async (query) => {
        // Execute the migration SQL
        await query(migration.sql);

        // Record in schema_migrations
        await query(
          `INSERT INTO schema_migrations (version, name, applied_at, checksum)
           VALUES ($1, $2, NOW(), $3)
           ON CONFLICT (version) DO UPDATE SET checksum = $3`,
          [migration.version, migration.name, migration.checksum]
        );
      }, "SERIALIZABLE");

      const duration_ms = Date.now() - start;
      log(`[migrate] Applied ${migration.filename} (${duration_ms}ms)`);
      results.push({ version: migration.version, name: migration.name, status: "applied", duration_ms });
    } catch (err: unknown) {
      const duration_ms = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      log(`[migrate] FAILED ${migration.filename}: ${errorMsg}`);
      results.push({ version: migration.version, name: migration.name, status: "failed", duration_ms, error: errorMsg });

      if (haltOnError) {
        log("[migrate] Halting — haltOnError is true");
        break;
      }
    }
  }

  // Summary
  const counts = { applied: 0, skipped: 0, failed: 0, "dry-run": 0 };
  for (const r of results) counts[r.status]++;
  log(
    `[migrate] Done: ${counts.applied} applied, ${counts.skipped} skipped, ` +
    `${counts.failed} failed, ${counts["dry-run"]} dry-run`
  );

  return results;
}

/**
 * Get migration status — which are applied, pending, or have checksum mismatches.
 */
export async function migrationStatus(
  db: DatabaseConnection,
  migrationsDir?: string
): Promise<{ version: string; name: string; status: "applied" | "pending" | "checksum-mismatch" }[]> {
  const dir = migrationsDir ?? join(process.cwd(), "src", "db", "migrations");
  const files = await discoverMigrations(dir);
  const applied = await getAppliedMigrations(db);
  const appliedMap = new Map(applied.map((a) => [a.version, a]));

  return files.map((f) => {
    const existing = appliedMap.get(f.version);
    if (!existing) return { version: f.version, name: f.name, status: "pending" as const };
    if (existing.checksum && existing.checksum !== f.checksum)
      return { version: f.version, name: f.name, status: "checksum-mismatch" as const };
    return { version: f.version, name: f.name, status: "applied" as const };
  });
}

/**
 * CLI entry point: npx tsx src/db/migration-runner.ts [--dry-run] [--dir <path>]
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dirIdx = args.indexOf("--dir");
  const migrationsDir = dirIdx >= 0 ? args[dirIdx + 1] : undefined;
  const statusOnly = args.includes("--status");

  const db = new DatabaseConnection();
  const connected = await db.connect();
  if (!connected) {
    console.error("[migrate] Cannot connect to database. Set DATABASE_URL env var.");
    process.exit(1);
  }

  try {
    if (statusOnly) {
      const statuses = await migrationStatus(db, migrationsDir);
      console.table(statuses);
      return;
    }

    const results = await runMigrations(db, { dryRun, migrationsDir });
    const failed = results.filter((r) => r.status === "failed");
    if (failed.length > 0) {
      process.exit(1);
    }
  } finally {
    await db.close();
  }
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("migration-runner");
if (isDirectRun) {
  main().catch((err) => {
    console.error("[migrate] Fatal:", err);
    process.exit(1);
  });
}
