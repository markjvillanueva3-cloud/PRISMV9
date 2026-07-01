/**
 * Zod action schemas for prism_gsd dispatcher (6 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const core = z.object({}).passthrough();

const quick = z.object({}).passthrough();

const get = z.object({
  section: z.string().optional().describe("GSD section name to retrieve (default: laws)"),
}).passthrough();

const dev_protocol = z.object({}).passthrough();

const resources_summary = z.object({}).passthrough();

const quick_resume = z.object({}).passthrough();

export const ACTION_GSD_SCHEMAS: ActionSchemaMap = {
  core,
  quick,
  get,
  dev_protocol,
  resources_summary,
  quick_resume,
};
