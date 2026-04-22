/**
 * Zod schemas for legacy EDM dispatcher actions
 * @description Schema definitions for electrode design, wire settings,
 * surface integrity, micro EDM, laser, waterjet, and sinker EDM actions
 */
import { z } from 'zod';

export const EDM_ACTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Legacy EDM actions - validation delegated to individual engines
  // Add specific schemas as needed for stricter validation
};
