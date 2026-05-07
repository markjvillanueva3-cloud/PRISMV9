/**
 * Lathe Master Post Router Action Schemas
 * ========================================
 * Zod schemas for lathe master post routing actions (U-LTH25).
 *
 * Actions:
 *   lathe_master_post_route       — Route to correct sub-post
 *   lathe_master_post_machines    — List JM Die machine inventory
 *   lathe_master_post_controllers — List supported controllers
 *
 * @module schemas/latheMasterPostActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── lathe_master_post_route ──────────────────────────────────────────────

const lathe_master_post_route = z
  .object({
    machine_id: z
      .string()
      .min(1)
      .describe("Machine identifier (ID, name, or model). E.g. 'okuma-lb3000', 'Okuma LB3000 EX II'."),
    operation: z
      .enum([
        "od_turning",
        "id_boring",
        "facing",
        "grooving",
        "threading",
        "parting",
        "drilling",
        "tapping",
        "roughing",
        "finishing",
      ])
      .optional()
      .describe("Operation type. Default: roughing."),
    controller: z
      .string()
      .optional()
      .describe("Override controller ID. If omitted, uses machine's default controller."),
    program: z
      .string()
      .optional()
      .describe("G-code program content for validation/enhancement."),
    strict_mode: z
      .boolean()
      .optional()
      .describe("Treat warnings as errors. Default: false."),
    include_comments: z
      .boolean()
      .optional()
      .describe("Include comments in output. Default: true."),
    line_numbers: z
      .boolean()
      .optional()
      .describe("Include line numbers. Default: false."),
  })
  .passthrough();

// ─── lathe_master_post_machines ───────────────────────────────────────────

const lathe_master_post_machines = z
  .object({
    type: z
      .enum(["lathe", "mill", "edm", "swiss"])
      .optional()
      .describe("Filter by machine type."),
    controller_family: z
      .enum(["okuma", "fanuc", "mitsubishi", "mazak", "haas", "citizen", "generic"])
      .optional()
      .describe("Filter by controller family."),
  })
  .passthrough();

// ─── lathe_master_post_controllers ────────────────────────────────────────

const lathe_master_post_controllers = z
  .object({})
  .passthrough()
  .describe("List all supported controller IDs with dialect info.");

// ─── Export map ───────────────────────────────────────────────────────────

export const ACTION_LATHE_MASTER_POST_SCHEMAS: ActionSchemaMap = {
  lathe_master_post_route,
  lathe_master_post_machines,
  lathe_master_post_controllers,
};
