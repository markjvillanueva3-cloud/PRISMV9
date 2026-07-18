/**
 * devSchema.ts -- AI-SYNERGY/U-INDIA-AUTO-STORAGE-CONTRACT (slot:india)
 *
 * Zod schema for the storage_route_map discoverability action wired to prism_dev.
 * This action returns the frozen STORAGE_ROUTES registry from
 * scripts/lib/auto-storage-contract.mjs -- pure read, no mutation.
 *
 * Kept in a dedicated file per schema naming conventions (not merged into the
 * 256KB devActionSchemas.ts) so it can be imported individually.
 */
import { z } from "zod";

/**
 * StorageRouteSchema -- shape of one route record as returned over MCP.
 * Kept as a z.object (no .passthrough()) so the MCP surface is bounded;
 * unknown keys from the JS object are stripped before serialisation.
 */
export const StorageRouteSchema = z.object({
  dataType: z.string().min(1)
    .describe("Unique key for the generated/extracted data type (e.g. outcome_event, memory_note)"),
  schema: z.string().min(1)
    .describe("Schema/shape gate -- file path#symbol or inline descriptor"),
  entryPoint: z.string().min(1)
    .describe("Canonical script or engine that ingests this data type"),
  trigger: z.enum(["sync", "stop-hook", "cron", "per-write-hook", "advisory-ledger"])
    .describe("When/how storage is triggered"),
  consumers: z.array(z.string().min(1)).min(1)
    .describe("Downstream surfaces this data flows to (at least 1 required)"),
  note: z.string().optional()
    .describe("Optional annotation about the route"),
});

export type StorageRoute = z.infer<typeof StorageRouteSchema>;

/**
 * Input schema for the storage_route_map prism_dev action.
 * Optional dataType filter: when supplied, returns only the matching route;
 * when omitted, returns all routes.
 */
export const StorageRouteMapInputSchema = z.object({
  dataType: z.string().optional()
    .describe("Filter to a specific data type key. Omit to return the full registry."),
}).describe(
  "storage_route_map -- query the frozen auto-storage contract registry. " +
  "Returns the STORAGE_ROUTES array (or a single matching entry) from " +
  "scripts/lib/auto-storage-contract.mjs. No mutation; pure discoverability."
);

export type StorageRouteMapInput = z.infer<typeof StorageRouteMapInputSchema>;
