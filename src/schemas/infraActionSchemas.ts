/**
 * PRISM Infrastructure Action Schemas — INFRA-1-2
 * Zod schemas for prism_infra dispatcher actions.
 */

import { z } from "zod";

export const ACTION_INFRA_SCHEMAS: Record<string, z.ZodObject<any>> = {
  db_health: z.object({}),
  persistence_health: z.object({}),
  migration_status: z.object({
    dry_run: z.boolean().optional().describe("Show pending migrations without applying"),
  }),
  registry_sync_status: z.object({
    entity: z.enum(["materials", "machines", "all"]).optional().default("all"),
  }),
  seed_registries: z.object({
    entity: z.enum(["materials", "machines", "all"]).optional().default("all"),
    force: z.boolean().optional().describe("Re-seed even if counts match"),
  }),
  infra_summary: z.object({}),
};
