/**
 * Document Learning Dispatcher Action Schemas
 * ==============================================
 * Per-action Zod schemas for all 5 prism_doc_learn actions.
 * Covers document upload, extraction, listing, retrieval, and deletion.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/documentLearningActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// doc_upload — Register a document for extraction
// ============================================================================

const doc_upload = z.object({
  file_path: z.string().describe("Absolute path to the document file"),
  document_id: z.string().optional().describe("Custom document ID (auto-generated if omitted)"),
  title: z.string().optional().describe("Document title"),
}).passthrough();

// ============================================================================
// doc_extract — Run extraction on a registered document
// ============================================================================

const doc_extract = z.object({
  document_id: z.string().describe("Document ID to extract knowledge from"),
  force_domain: z.string().optional().describe("Force extraction to a specific domain"),
}).passthrough();

// ============================================================================
// doc_list — List all extracted document knowledge
// ============================================================================

const doc_list = z.object({}).passthrough();

// ============================================================================
// doc_get — Get a specific document's knowledge
// ============================================================================

const doc_get = z.object({
  document_id: z.string().describe("Document ID to retrieve"),
}).passthrough();

// ============================================================================
// doc_delete — Delete a document's knowledge
// ============================================================================

const doc_delete = z.object({
  document_id: z.string().describe("Document ID to delete"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_DOCUMENT_LEARNING_SCHEMAS: ActionSchemaMap = {
  doc_upload,
  doc_extract,
  doc_list,
  doc_get,
  doc_delete,
};
