/**
 * Zod action schemas for prism_intake dispatcher.
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const webhook_ingest = z.object({
  raw_body_b64: z.string().min(1).describe("Base64-encoded raw request body — HMAC was computed over the decoded bytes"),
  rawBodyB64: z.string().min(1).optional().describe("Alias for raw_body_b64"),
  signature: z.string().min(1).describe("Hex HMAC-SHA256 signature, optionally prefixed with 'sha256='"),
  source: z.enum(["readwise", "telegram", "rss", "manual"]).describe("Source identifier — must be in fixed enum"),
}).passthrough();

export const ACTION_INTAKE_SCHEMAS: ActionSchemaMap = {
  webhook_ingest,
};
