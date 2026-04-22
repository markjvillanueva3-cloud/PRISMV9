/**
 * Action Schema Type Definitions
 * ===============================
 * Shared type definitions for dispatcher action schemas.
 *
 * @module schemas/actionSchemaTypes
 * @version 1.0.0
 */

import type { z } from "zod";

/**
 * Map of action name → Zod schema for that action's params.
 * Used by validateActionParams() in dispatcherMiddleware.
 */
export type ActionSchemaMap = Record<string, z.ZodTypeAny>;
