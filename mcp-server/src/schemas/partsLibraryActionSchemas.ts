/**
 * Zod schemas for partsLibrary dispatcher actions.
 * Phase 6 Session 6-2: File Upload + CAD Storage + Parts Library
 */
import { z } from "zod";

export const PARTS_LIBRARY_ACTION_SCHEMAS: Record<string, z.ZodType> = {
  file_upload: z.object({
    content: z.string().describe("Base64-encoded file content"),
    original_name: z.string().min(1).describe("Original filename with extension"),
    mime_type: z.string().optional().describe("MIME type (auto-detected from extension if omitted)"),
    uploaded_by: z.string().optional(),
    existing_file_id: z.string().uuid().optional().describe("If set, creates a new version of this file"),
    change_description: z.string().optional().describe("Version change notes"),
  }),

  file_download: z.object({
    file_id: z.string().uuid(),
    version: z.number().int().positive().optional().describe("Specific version (latest if omitted)"),
  }),

  file_get_versions: z.object({
    file_id: z.string().uuid(),
  }),

  file_attach: z.object({
    file_id: z.string().uuid(),
    entity_type: z.enum([
      "quote", "job", "part", "quality_record", "customer", "machine",
      "tool", "material_cert", "inspection", "ncr", "capa", "fai",
    ]),
    entity_id: z.string().uuid(),
    attachment_type: z.enum([
      "general", "cad_model", "drawing", "material_cert", "inspection_report",
      "setup_sheet", "photo", "video", "program", "documentation",
    ]).optional(),
    notes: z.string().optional(),
    attached_by: z.string().optional(),
  }),

  file_get_attachments: z.object({
    entity_type: z.string().min(1),
    entity_id: z.string().uuid(),
  }),

  file_find_by_hash: z.object({
    sha256: z.string().length(64),
  }),

  file_delete: z.object({
    file_id: z.string().uuid(),
  }),

  file_list: z.object({
    mime_type: z.string().optional(),
    uploaded_by: z.string().optional(),
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().min(0).optional(),
  }),

  file_stats: z.object({}),

  part_create: z.object({
    part_number: z.string().min(1).describe("Unique part number (e.g., 'BRKT-001')"),
    name: z.string().min(1).describe("Human-readable part name"),
    description: z.string().optional(),
    material_id: z.string().uuid().optional(),
    material_name: z.string().optional().describe("Material name if no UUID"),
    customer_id: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["active", "obsolete", "prototype", "archived"]).optional(),
    created_by: z.string().optional(),
    cad_file_id: z.string().uuid().optional(),
    drawing_file_id: z.string().uuid().optional(),
    initial_change_description: z.string().optional(),
  }),

  part_search: z.object({
    query: z.string().optional().describe("Full-text search on name/number/description/tags"),
    tags: z.array(z.string()).optional(),
    material_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    status: z.string().optional(),
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().min(0).optional(),
  }),

  part_get: z.object({
    part_id: z.string().uuid().optional(),
    part_number: z.string().optional(),
  }),

  part_add_revision: z.object({
    part_id: z.string().uuid(),
    revision: z.string().optional().describe("Manual revision (auto-incremented if omitted)"),
    cad_file_id: z.string().uuid().optional(),
    drawing_file_id: z.string().uuid().optional(),
    change_description: z.string().min(1),
    changed_by: z.string().optional(),
  }),

  part_list_revisions: z.object({
    part_id: z.string().uuid(),
  }),

  part_find_similar: z.object({
    part_id: z.string().uuid().optional().describe("Reference part ID"),
    material: z.string().optional(),
    iso_group: z.string().optional(),
    dimensions: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    features: z.array(z.string()).optional(),
    tolerances: z.array(z.object({ dimension: z.string(), value_mm: z.number() })).optional(),
    surface_finish_ra: z.number().optional(),
    operations: z.array(z.string()).optional(),
    limit: z.number().int().positive().max(50).optional(),
  }),

  part_deduplicate: z.object({}),

  part_stats: z.object({}),

  // ── U-PPL-D3 / MS-PRINT-PROGRAM-LOOP Track D: ArchiveToPartsCatalogIngester ──
  // Walks an array of JM-Die disk-index entries (the v2 enumeration of every
  // program file on disk), resolves a normalized PN for each, optionally
  // attaches the matched print PDF via U-PPL-D1's ProgramPrintLinkIndexEngine,
  // and creates/updates the corresponding prism_parts entry. Makes the parts
  // catalog the join hub for archive-driven workflows (quote/schedule/traveler).
  part_ingest_from_archive: z.object({
    entries: z.array(z.object({
      path: z.string().min(1).describe("Absolute or archive-relative path to the program file."),
      name: z.string().optional().describe("Basename of the program file."),
      stem: z.string().optional().describe("Filename stem (no extension) — preferred PN-extraction source."),
      ext: z.string().optional().describe("File extension (with or without leading dot)."),
      customer: z.string().optional().describe("JM-Die customer folder this entry came from."),
      machine: z.string().optional().describe("Machine category (lathe / mill / wedm / ...)."),
      kind: z.string().optional().describe("Indexer's kind classification."),
      size: z.number().optional().describe("File size in bytes."),
      mtime: z.string().optional().describe("ISO-8601 mtime."),
    })).describe("Array of disk-index entries (typically from jm-die-index-v2.json or JMDieArchiveBackAnnotationEngine's walker)."),
    join_jsonl_path: z.string().optional().describe(
      "Optional path to the v6 blueprint↔program join JSONL. When supplied (and input_program_paths also supplied for seed augmentation), each PN's primary program is link-looked-up and the matched print is attached as drawing_file_id.",
    ),
    input_program_paths: z.array(z.string()).optional().describe(
      "Optional seed paths fed to ProgramPrintLinkIndexEngine.loadLinkIndex for the program-side seed augmentation BEFORE link lookup. Without this, only the v6 join is consulted (no enhanced-normalizer rescue).",
    ),
    dryRun: z.boolean().optional().describe("Safety gate. Default TRUE — returns the diagnostic without calling partsLibraryEngine.create. Set false to actually mutate."),
    limit: z.number().int().min(0).optional().describe("Cap on entries processed in one call. 0 or undefined = no cap."),
    tagFromEntry: z.boolean().optional().describe("Tag the new Part with customer + machine from the disk entry. Default true."),
  }),
};
