/**
 * Dev Dispatcher Action Schemas
 * ==============================
 * Per-action Zod schemas for all 9 prism_dev actions.
 * Covers session boot, build, code templates, code search, file I/O,
 * server info, smoke tests, and test results.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/devActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// session_boot — Initialize session with state recovery
// ============================================================================

const session_boot = z.object({}).passthrough();

// ============================================================================
// build — Run npm build with pre-build validation
// ============================================================================

const build = z.object({}).passthrough();

// ============================================================================
// code_template — Retrieve a code template by name
// ============================================================================

const code_template = z.object({
  template: z.string().describe("Template name: tool_registration, index_import, registry_data_loader, zod_schemas"),
}).passthrough();

// ============================================================================
// code_search — Search source/dist for a regex pattern
// ============================================================================

const code_search = z.object({
  pattern: z.string().optional().describe("Regex pattern to search for"),
  query: z.string().optional().describe("Alias for pattern"),
  scope: z.string().optional().describe("Search scope: src, dist, both, or sub-directory name"),
  max_results: z.number().int().positive().optional().describe("Max results to return (default 20)"),
}).passthrough();

// ============================================================================
// file_read — Read a file relative to MCP_ROOT
// ============================================================================

const file_read = z.object({
  path: z.string().describe("File path relative to MCP_ROOT"),
  start_line: z.number().int().nonnegative().optional().describe("Line offset to start reading"),
  max_lines: z.number().int().positive().optional().describe("Max lines to read (default 100)"),
}).passthrough();

// ============================================================================
// file_write — Write content to a file relative to MCP_ROOT
// ============================================================================

const file_write = z.object({
  path: z.string().describe("File path relative to MCP_ROOT"),
  content: z.string().describe("Content to write"),
}).passthrough();

// ============================================================================
// server_info — List registered tool and dispatcher files
// ============================================================================

const server_info = z.object({}).passthrough();

// ============================================================================
// test_smoke — Run or list smoke tests
// ============================================================================

const test_smoke = z.object({
  mode: z.enum(["info", "atcs"]).optional().describe("Mode: info (list tests) or atcs (generate ATCS work queue)"),
}).passthrough();

// ============================================================================
// test_results — View smoke test results
// ============================================================================

const test_results = z.object({
  detail: z.boolean().optional().describe("Whether to fetch detailed run results"),
  run_id: z.string().optional().describe("Specific run ID to fetch details for"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_DEV_SCHEMAS: ActionSchemaMap = {
  session_boot,
  build,
  code_template,
  code_search,
  file_read,
  file_write,
  server_info,
  test_smoke,
  test_results,
};
