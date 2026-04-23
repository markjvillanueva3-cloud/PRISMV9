/**
 * Zod action schemas for prism_doc dispatcher (7 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const list = z.object({}).passthrough();

const read = z.object({
  name: z.string().describe("Document filename to read"),
  detail: z.boolean().optional().describe("If true, return full content instead of summary"),
}).passthrough();

const write = z.object({
  name: z.string().describe("Document filename to write"),
  content: z.string().describe("Content to write"),
}).passthrough();

const append = z.object({
  name: z.string().describe("Document filename to append to"),
  content: z.string().describe("Content to append"),
}).passthrough();

const roadmap_status = z.object({}).passthrough();

const action_tracker = z.object({
  detail: z.boolean().optional().describe("If true, return full content instead of parsed summary"),
}).passthrough();

const migrate = z.object({}).passthrough();

export const ACTION_DOCUMENT_SCHEMAS: ActionSchemaMap = {
  list,
  read,
  write,
  append,
  roadmap_status,
  action_tracker,
  migrate,
};
