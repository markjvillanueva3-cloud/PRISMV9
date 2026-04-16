/**
 * PRISM Schema Versioning
 * =======================
 * Centralized schema version management for tracking breaking changes,
 * ensuring compatibility, and enabling safe migrations.
 *
 * Version format follows SemVer:
 *   - MAJOR: Breaking changes (removed fields, type changes)
 *   - MINOR: Additive changes (new optional fields)
 *   - PATCH: Bug fixes, documentation
 *
 * @module schemas/schemaVersioning
 * @version 2.0.0
 */

import { z } from "zod";

// ============================================================================
// VERSION CONSTANT
// ============================================================================

/**
 * Current schema version for PRISM MCP Server.
 * Increment on schema changes:
 *   - MAJOR: Breaking changes requiring migration
 *   - MINOR: New optional fields, additive changes
 *   - PATCH: Documentation, description updates
 */
export const SCHEMA_VERSION = "2.0.0" as const;

/**
 * Minimum supported schema version for backwards compatibility.
 * Clients with versions below this cannot communicate.
 */
export const MIN_SUPPORTED_VERSION = "1.0.0" as const;

// ============================================================================
// SCHEMA CHANGE LOG TYPES
// ============================================================================

/** Classification of schema changes. */
export const ChangeType = z.enum([
  "breaking",     // Requires migration (field removed, type changed)
  "deprecation",  // Field deprecated, will be removed in future major version
  "addition",     // New optional field added
  "modification", // Non-breaking field modification (description, validation)
  "fix",          // Bug fix in schema validation
]);
export type ChangeType = z.infer<typeof ChangeType>;

/** A single change entry in the changelog. */
export const SchemaChange = z.object({
  /** Schema or type affected (e.g., "ActionSchemaMap", "HealthResponse"). */
  schema: z.string().min(1),
  /** Specific field affected (optional for schema-wide changes). */
  field: z.string().optional(),
  /** Type of change. */
  type: ChangeType,
  /** Human-readable description of the change. */
  description: z.string().min(1),
  /** Migration guidance for breaking changes. */
  migration: z.string().optional(),
});
export type SchemaChange = z.infer<typeof SchemaChange>;

/** A version entry with all its changes. */
export const SchemaVersionEntry = z.object({
  /** Version string (SemVer). */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Release date (ISO 8601). */
  date: z.string(),
  /** Summary of this release. */
  summary: z.string().min(1),
  /** List of changes in this version. */
  changes: z.array(SchemaChange),
});
export type SchemaVersionEntry = z.infer<typeof SchemaVersionEntry>;

/** Complete schema changelog. */
export const SchemaChangeLog = z.object({
  /** Current version (should match SCHEMA_VERSION). */
  current_version: z.string(),
  /** Minimum supported version. */
  min_supported_version: z.string(),
  /** Schema owner/maintainer. */
  maintainer: z.string().default("PRISM MCP Server"),
  /** Last updated timestamp. */
  updated_at: z.string(),
  /** Version history (newest first). */
  versions: z.array(SchemaVersionEntry),
});
export type SchemaChangeLog = z.infer<typeof SchemaChangeLog>;

// ============================================================================
// VERSION VALIDATION
// ============================================================================

/**
 * Parse a SemVer string into components.
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two SemVer strings.
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (!va || !vb) {
    throw new Error(`Invalid version format: ${!va ? a : b}`);
  }

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

/**
 * Check if a version is within supported range.
 */
export function isVersionSupported(version: string): boolean {
  try {
    const cmp = compareVersions(version, MIN_SUPPORTED_VERSION);
    return cmp >= 0; // version >= MIN_SUPPORTED_VERSION
  } catch {
    return false;
  }
}

/**
 * Validation result for schema version checks.
 */
export interface VersionValidationResult {
  valid: boolean;
  current_version: string;
  provided_version: string;
  min_supported: string;
  compatible: boolean;
  requires_migration: boolean;
  message: string;
}

/**
 * Validate a provided schema version against the current version.
 *
 * @param providedVersion - Version to validate
 * @returns Validation result with compatibility info
 */
export function validateSchemaVersion(providedVersion: string): VersionValidationResult {
  const parsed = parseVersion(providedVersion);

  if (!parsed) {
    return {
      valid: false,
      current_version: SCHEMA_VERSION,
      provided_version: providedVersion,
      min_supported: MIN_SUPPORTED_VERSION,
      compatible: false,
      requires_migration: false,
      message: `Invalid version format: "${providedVersion}". Expected SemVer (e.g., "2.0.0").`,
    };
  }

  const supported = isVersionSupported(providedVersion);
  const comparison = compareVersions(providedVersion, SCHEMA_VERSION);

  // Check if major version differs (breaking change boundary)
  const currentParsed = parseVersion(SCHEMA_VERSION)!;
  const requiresMigration = parsed.major !== currentParsed.major;

  let message: string;
  if (!supported) {
    message = `Version ${providedVersion} is below minimum supported (${MIN_SUPPORTED_VERSION}). Migration required.`;
  } else if (comparison === 0) {
    message = `Version ${providedVersion} matches current schema version.`;
  } else if (comparison < 0) {
    if (requiresMigration) {
      message = `Version ${providedVersion} is from a previous major version. Breaking changes may apply.`;
    } else {
      message = `Version ${providedVersion} is older but compatible. Some new features may be unavailable.`;
    }
  } else {
    message = `Version ${providedVersion} is newer than current (${SCHEMA_VERSION}). Update schema module.`;
  }

  return {
    valid: true,
    current_version: SCHEMA_VERSION,
    provided_version: providedVersion,
    min_supported: MIN_SUPPORTED_VERSION,
    compatible: supported && !requiresMigration,
    requires_migration: requiresMigration,
    message,
  };
}

/**
 * Get the current schema version.
 * Convenience export for external consumers.
 */
export function getSchemaVersion(): string {
  return SCHEMA_VERSION;
}

/**
 * Get version metadata object for embedding in responses.
 */
export function getVersionMetadata(): {
  schema_version: string;
  min_supported: string;
  is_stable: boolean;
} {
  const parsed = parseVersion(SCHEMA_VERSION)!;
  return {
    schema_version: SCHEMA_VERSION,
    min_supported: MIN_SUPPORTED_VERSION,
    is_stable: parsed.major >= 1, // 1.x.x+ is considered stable
  };
}

// ============================================================================
// SCHEMA FINGERPRINTING
// ============================================================================

/**
 * Generate a simple fingerprint for a Zod schema.
 * Used for detecting schema changes in CI.
 */
export function generateSchemaFingerprint(schema: z.ZodType): string {
  // Use Zod's internal shape for objects, or type info for primitives
  const shape = (schema as any)._def;
  const fingerprint = JSON.stringify({
    typeName: shape?.typeName,
    checks: shape?.checks?.map((c: any) => c.kind),
    shape: shape?.shape ? Object.keys(shape.shape).sort() : undefined,
  });

  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fp_${Math.abs(hash).toString(16)}`;
}
