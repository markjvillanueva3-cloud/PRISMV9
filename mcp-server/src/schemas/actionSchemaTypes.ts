/**
 * Action Schema Types
 * ===================
 * Shared types for per-action Zod schema validation across all dispatchers.
 *
 * @module schemas/actionSchemaTypes
 * @version 2.0.0
 * @milestone SYS-MS6
 */

import { z } from "zod";
import { SCHEMA_VERSION, getVersionMetadata } from "./schemaVersioning.js";

// ============================================================================
// VERSION RE-EXPORTS
// ============================================================================

/** Current schema version. Re-exported for convenience. */
export { SCHEMA_VERSION, getVersionMetadata };

// ============================================================================
// SCHEMA METADATA
// ============================================================================

/**
 * Metadata for individual action schemas.
 * Tracks versioning, deprecation status, and documentation.
 */
export interface SchemaMetadata {
  /** Schema version when this action was introduced. */
  since: string;
  /** Schema version when this action was deprecated (if applicable). */
  deprecated_in?: string;
  /** Replacement action if deprecated. */
  replaced_by?: string;
  /** Whether this action is stable for production use. */
  stable: boolean;
  /** Brief description for tooling/documentation. */
  description?: string;
}

/**
 * Enhanced action schema map with optional metadata.
 */
export interface ActionSchemaEntry {
  /** Zod schema for validating action params. */
  schema: z.ZodType;
  /** Version and status metadata. */
  metadata?: SchemaMetadata;
}

/** Map from action name to Zod schema for that action's params */
export type ActionSchemaMap = Record<string, z.ZodType>;

/** Enhanced map with metadata support */
export type ActionSchemaMapWithMeta = Record<string, ActionSchemaEntry>;

// ============================================================================
// VALIDATION RESULT
// ============================================================================

/** Result of validating action params against a schema */
export interface ValidationResult {
  valid: boolean;
  errors?: z.ZodIssue[];
  errorMessage?: string;
  /** Schema version used for validation (for debugging). */
  schema_version?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a ValidationResult with current schema version attached.
 */
export function createValidationResult(
  valid: boolean,
  errors?: z.ZodIssue[],
  errorMessage?: string
): ValidationResult {
  return {
    valid,
    errors,
    errorMessage,
    schema_version: SCHEMA_VERSION,
  };
}

/**
 * Create schema metadata with default values.
 */
export function createSchemaMetadata(
  options: Partial<SchemaMetadata> & { since?: string } = {}
): SchemaMetadata {
  return {
    since: options.since ?? SCHEMA_VERSION,
    stable: options.stable ?? true,
    deprecated_in: options.deprecated_in,
    replaced_by: options.replaced_by,
    description: options.description,
  };
}
