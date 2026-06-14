/**
 * NamespaceMigrationEngine — HMEMV09 cross-namespace re-key + migration.
 *
 * Pure-core migrator: re-keys a batch of memory entries from a source
 * namespace to a target namespace, with caller-supplied collision policy.
 * Composes with U-HMEMV03 MemoryGovernanceEngine for audit + U-HMEMV08
 * MemoryDiffEngine for migration verification.
 *
 * @module engines/NamespaceMigrationEngine
 */

import { z } from "zod";

export const CollisionPolicySchema = z.enum([
  "fail-on-collision",
  "skip-on-collision",
  "overwrite-on-collision",
  "rename-on-collision",
]);
export type CollisionPolicy = z.infer<typeof CollisionPolicySchema>;

export const MigrationEntrySchema = z.object({
  entry_id: z.string().min(1).max(120),
  key: z.string().min(1).max(200),
  namespace: z.string().min(1).max(120),
  value: z.unknown(),
});
export type MigrationEntry = z.infer<typeof MigrationEntrySchema>;

export interface MigrationResult {
  source_namespace: string;
  target_namespace: string;
  migrated: MigrationEntry[];
  skipped: MigrationEntry[];
  renamed: { from: string; to: string }[];
  errors: { entry_id: string; reason: string }[];
}

export class NamespaceMigrationEngine {
  static validateEntry(e: unknown): MigrationEntry { return MigrationEntrySchema.parse(e); }

  /** Migrate source-namespace entries → target-namespace per collision policy.
   *  target_existing is the set of already-present keys in target namespace. */
  static migrate(args: {
    source: readonly MigrationEntry[];
    target_namespace: string;
    target_existing_keys: readonly string[];
    policy: CollisionPolicy;
  }): MigrationResult {
    CollisionPolicySchema.parse(args.policy);
    if (!args.target_namespace) throw new Error("NamespaceMigration: target_namespace required");
    for (const e of args.source) MigrationEntrySchema.parse(e);

    const existing = new Set(args.target_existing_keys);
    const source_namespaces = new Set(args.source.map((e) => e.namespace));
    const source_namespace = source_namespaces.size === 1
      ? [...source_namespaces][0]
      : "(multiple)";

    const migrated: MigrationEntry[] = [];
    const skipped: MigrationEntry[] = [];
    const renamed: { from: string; to: string }[] = [];
    const errors: { entry_id: string; reason: string }[] = [];

    for (const e of args.source) {
      if (existing.has(e.key)) {
        switch (args.policy) {
          case "fail-on-collision":
            errors.push({ entry_id: e.entry_id, reason: `key collision: ${e.key}` });
            break;
          case "skip-on-collision":
            skipped.push(e);
            break;
          case "overwrite-on-collision":
            migrated.push({ ...e, namespace: args.target_namespace });
            break;
          case "rename-on-collision": {
            let suffix = 1;
            let candidate = `${e.key}_${suffix}`;
            while (existing.has(candidate)) {
              suffix += 1;
              candidate = `${e.key}_${suffix}`;
            }
            existing.add(candidate);
            renamed.push({ from: e.key, to: candidate });
            migrated.push({ ...e, namespace: args.target_namespace, key: candidate });
            break;
          }
        }
      } else {
        existing.add(e.key);
        migrated.push({ ...e, namespace: args.target_namespace });
      }
    }

    return {
      source_namespace,
      target_namespace: args.target_namespace,
      migrated,
      skipped,
      renamed,
      errors,
    };
  }

  /** Render result for operator audit. */
  static renderResult(r: MigrationResult): string {
    return [
      `[MIGRATE] ${r.source_namespace} → ${r.target_namespace}: +${r.migrated.length} skip=${r.skipped.length} rename=${r.renamed.length} err=${r.errors.length}`,
      r.renamed.length ? `  renamed: ${r.renamed.map((x) => `${x.from}→${x.to}`).join(", ")}` : "",
      r.errors.length ? `  errors: ${r.errors.map((x) => `${x.entry_id}: ${x.reason}`).join("; ")}` : "",
    ].filter(Boolean).join("\n");
  }
}

export const namespaceMigrationEngine = NamespaceMigrationEngine;
