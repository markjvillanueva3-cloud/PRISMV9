/**
 * Zod action schemas for prism_inbox dispatcher (13 actions)
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

// JM-DOC-POPULATION-MS0 / U-JMDOC07: bulk-index pre-classified JM-Die doc-archive documents.
// `records` optional — when omitted, the dispatcher streams jm-file-inventory.jsonl live and
// pre-filters to the non-financial doc-archive allowlist. Financial buckets are excluded by the
// engine's JM_DOC_ARCHIVE_ALLOWLIST regardless (hotel financial-discipline soul).
const inbox_seed_jm_corpus = z.object({
  records: z.array(z.object({
    path: z.string().describe("Absolute file path (canonical identity / dedup key)"),
    source: z.string().describe("Corpus source (e.g. docustrata_organized, jm_die_category)"),
    bucket: z.string().describe("Corpus bucket (e.g. prints, scans, notes, packing_slips)"),
    customer: z.string().nullish().describe("Customer key (B2B company), or null"),
    material: z.string().nullish().describe("Material seen, or null"),
    machine_class: z.string().nullish().describe("Machine class, or null"),
  })).optional().describe("Pre-classified inventory rows to archive-index; omit to stream the full inventory live"),
}).passthrough();

// JM-DOC-POPULATION-MS0 / U-JMDOC08: bulk-index raw part-library scans/prints as viewer-only archive.
// Same record shape as inbox_seed_jm_corpus; viewer allowlist (scan/print tuples) gates ingestion.
const inbox_seed_jm_viewer = z.object({
  records: z.array(z.object({
    path: z.string().describe("Absolute file path (canonical identity / dedup key)"),
    source: z.string().describe("Corpus source (part_library, jm_die_category)"),
    bucket: z.string().describe("Corpus bucket (scan, print)"),
    customer: z.string().nullish().describe("Customer key (B2B company), or null"),
    material: z.string().nullish().describe("Material seen, or null"),
    machine_class: z.string().nullish().describe("Machine class, or null"),
  })).optional().describe("Pre-classified inventory rows to viewer-archive; omit to stream the full inventory live"),
}).passthrough();

// JM-DOC-POPULATION-MS0 / U-JMDOC09: archive DocuStrata manifest docs as searchable inbox pointers.
// Same record shape; manifest allowlist (docustrata_manifest/doc only) gates ingestion (financial/quote excluded).
const inbox_seed_jm_manifest = z.object({
  records: z.array(z.object({
    path: z.string().describe("Manifest doc path (canonical identity / dedup key / manifest_ref)"),
    source: z.string().describe("Corpus source (docustrata_manifest)"),
    bucket: z.string().describe("Corpus bucket (doc)"),
    customer: z.string().nullish().describe("Customer key (B2B company), or null"),
    material: z.string().nullish().describe("Material seen, or null"),
    machine_class: z.string().nullish().describe("Machine class, or null"),
  })).optional().describe("Pre-classified manifest rows to pointer-archive; omit to stream the full inventory live"),
}).passthrough();

// JM-DOC-POPULATION-MS0 / U-JMDOC10: archive DocuStrata FINANCIAL docs as LINK-ONLY inbox pointers.
// Same record shape; financial allowlist (sales_orders/closed_orders/invoices/tax_financial/accounting +
// manifest invoice/customer_po/acknowledgment) gates ingestion. These are evidence pointers — NO AR/AP/GL
// records are created (financial_guard set; hotel financial-discipline soul).
const inbox_seed_jm_financial = z.object({
  records: z.array(z.object({
    path: z.string().describe("Financial doc path (canonical identity / dedup key)"),
    source: z.string().describe("Corpus source (docustrata_organized, docustrata_manifest)"),
    bucket: z.string().describe("Corpus bucket (sales_orders, closed_orders, invoices, tax_financial, accounting, invoice, customer_po, acknowledgment)"),
    customer: z.string().nullish().describe("Customer key (B2B company), or null"),
    material: z.string().nullish().describe("Material seen, or null"),
    machine_class: z.string().nullish().describe("Machine class, or null"),
  })).optional().describe("Pre-classified financial rows to pointer-archive (link-only, no ERP records); omit to stream the full inventory live"),
}).passthrough();

// JM-DOC-POPULATION-MS0 / U-JMDOC-SYNERGY-STATUS: closed-loop query surface — report JM-corpus
// population coverage (reads the jm-population-status.json dashboard sidecar). Read-only, no params.
const inbox_population_status = z.object({}).passthrough();

export const ACTION_INBOX_SCHEMAS: ActionSchemaMap = {
  inbox_ingest,
  inbox_list,
  inbox_get,
  inbox_match_part,
  inbox_batch_ingest,
  inbox_search,
  inbox_stats,
  inbox_update_status,
  inbox_seed_jm_corpus,
  inbox_seed_jm_viewer,
  inbox_seed_jm_manifest,
  inbox_seed_jm_financial,
  inbox_population_status,
};
