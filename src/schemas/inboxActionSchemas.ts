/**
 * Zod action schemas for prism_inbox dispatcher (8 actions)
 * DocuRead document intake, classification, and part matching
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const inbox_ingest = z.object({
  content_base64: z.string().optional().describe("File content as base64 string"),
  file_path: z.string().optional().describe("Server-side file path"),
  filename: z.string().describe("Original filename"),
  mime_type: z.string().optional().describe("MIME type (auto-detected if omitted)"),
  type_hint: z.enum([
    "blueprint", "purchase_order", "invoice", "packing_slip", "material_cert",
    "quote_request", "setup_sheet", "inspection", "program", "photo",
    "correspondence", "unknown",
  ]).optional().describe("Hint: what type of document is this?"),
  source_type: z.enum(["upload", "email", "scan", "photo", "api", "batch"]).optional().describe("Source type"),
  source_origin: z.string().optional().describe("Source origin (email address, scanner name)"),
  tags: z.array(z.string()).optional().describe("Tags to apply"),
  ingested_by: z.string().optional().describe("Who is uploading"),
  skip_classification: z.boolean().optional().describe("Skip auto-classification"),
  skip_matching: z.boolean().optional().describe("Skip auto-matching to parts"),
}).passthrough();

const inbox_list = z.object({
  status: z.string().optional().describe("Filter by status"),
  document_type: z.string().optional().describe("Filter by document type"),
  part_number: z.string().optional().describe("Filter by part number"),
  date_from: z.string().optional().describe("Filter from date (ISO)"),
  date_to: z.string().optional().describe("Filter to date (ISO)"),
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  query: z.string().optional().describe("Full-text search query"),
  limit: z.number().optional().describe("Max results (default 50)"),
  offset: z.number().optional().describe("Pagination offset"),
  sort_by: z.enum(["received_at", "document_type", "status"]).optional().describe("Sort field"),
  sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
}).passthrough();

const inbox_get = z.object({
  id: z.string().describe("Inbox item ID"),
}).passthrough();

const inbox_match_part = z.object({
  inbox_id: z.string().describe("Inbox item ID"),
  part_number: z.string().describe("Part number to match"),
  part_id: z.string().optional().describe("Part library ID (if known)"),
}).passthrough();

const inbox_batch_ingest = z.object({
  items: z.array(z.object({
    content_base64: z.string().optional(),
    filename: z.string(),
    mime_type: z.string().optional(),
    type_hint: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })).describe("Array of documents to ingest"),
  ingested_by: z.string().optional().describe("Who is uploading"),
}).passthrough();

const inbox_search = z.object({
  query: z.string().describe("Search query"),
  limit: z.number().optional().describe("Max results (default 20)"),
}).passthrough();

const inbox_stats = z.object({}).passthrough();

const inbox_update_status = z.object({
  id: z.string().describe("Inbox item ID"),
  status: z.enum([
    "received", "classifying", "classified", "extracting", "extracted",
    "matched", "unmatched", "linked", "error", "archived",
  ]).describe("New status"),
  note: z.string().optional().describe("Optional note"),
}).passthrough();

export const ACTION_INBOX_SCHEMAS: ActionSchemaMap = {
  inbox_ingest,
  inbox_list,
  inbox_get,
  inbox_match_part,
  inbox_batch_ingest,
  inbox_search,
  inbox_stats,
  inbox_update_status,
};
