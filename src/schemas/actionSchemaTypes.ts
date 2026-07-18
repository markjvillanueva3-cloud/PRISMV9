/**
 * Action Schema Types
 * ===================
 * Shared types for per-action Zod schema validation across all dispatchers.
 *
 * @module schemas/actionSchemaTypes
 * @version 1.0.0
 * @milestone SYS-MS6
 */

import { z } from "zod";

/** Map from action name → Zod schema for that action's params */
export type ActionSchemaMap = Record<string, z.ZodType>;

/** Result of validating action params against a schema */
export interface ValidationResult {
  valid: boolean;
  errors?: z.ZodIssue[];
  errorMessage?: string;
}
