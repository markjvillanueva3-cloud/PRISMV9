/**
 * Operating-System Dispatcher Action Schemas
 * ============================================
 * Per-action Zod schemas for all prism_operating_system actions.
 *
 * @module schemas/operatingSystemActionSchemas
 * @version 1.0.0 — Sprint C1
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optNum = z.number().optional();

// ─── Shell (3) ────────────────────────────────────────────────────────────────

const shell_bootstrap = z.object({
  jobs: z.array(z.object({
    id: z.string(),
    status: z.string(),
    customer: optStr,
    part_number: optStr,
    due_date: optStr,
  })).optional().describe("Active job records"),
  approvalCount: optNum.describe("Pending approval count"),
}).passthrough();

const shell_employee_profiles = z.object({}).passthrough();

const shell_employee_bootstrap = z.object({
  profileId: z.string().optional().describe("Role profile ID: machinist, programmer, lead, quality, manager, engineer"),
  jobs: z.array(z.any()).optional().describe("Active job records"),
  hotJobs: z.array(z.any()).optional().describe("Hot job records"),
  approvalCount: optNum.describe("Pending approval count"),
}).passthrough();

// ─── Desk (1) ─────────────────────────────────────────────────────────────────

const desk_counts = z.object({
  jobs: z.array(z.any()).optional().describe("Active job records for count derivation"),
  approvalCount: optNum.describe("Pending approval count"),
}).passthrough();

// ─── Jobs (1) ─────────────────────────────────────────────────────────────────

const job_desk = z.object({
  job: z.object({
    id: z.string(),
    status: z.string(),
    customer: optStr,
    part_number: optStr,
    due_date: optStr,
    routing: z.array(z.any()).optional(),
    status_history: z.array(z.any()).optional(),
  }).describe("Job record with routing"),
  hotJobIds: z.array(z.string()).optional().describe("Hot job IDs"),
}).passthrough();

// ─── Program Release (2) ──────────────────────────────────────────────────────

const program_release_catalog = z.object({}).passthrough();

const program_release_workspace = z.object({
  partClassId: z.string().describe("Part class ID"),
  machineId: z.string().describe("Machine profile ID"),
  toolholderId: z.string().describe("Toolholder profile ID"),
  toolingPackageId: z.string().describe("Tooling package ID"),
  fixtureId: z.string().describe("Fixture profile ID"),
  stockId: z.string().describe("Stock profile ID"),
  cadSourceId: z.string().describe("CAD source profile ID"),
}).passthrough();

// ─── Scheduling (1) ──────────────────────────────────────────────────────────

const scheduling_studies = z.object({
  jobShopResult: z.any().optional().describe("Job-shop scheduling result"),
  singleResult: z.any().optional().describe("Single-machine scheduling result"),
  johnsonsResult: z.any().optional().describe("Johnson's two-machine result"),
  cpmResult: z.any().optional().describe("CPM analysis result"),
}).passthrough();

// ─── Shop Floor (1) ──────────────────────────────────────────────────────────

const shop_floor_check_in = z.object({
  action: z.enum(["register", "check-in", "build-tasks", "roi-signals"]).describe("Check-in action type"),
}).passthrough();

// ─── Desk Payload (Session 6-8) ──────────────────────────────────────────────

const deskRoleEnum = z.enum(["admin", "engineer", "operator", "viewer"]);

const desk_payload = z.object({
  role: deskRoleEnum.describe("Desk role: admin, engineer, operator, viewer"),
  data: z.object({
    jobs: z.array(z.any()).optional().describe("Active job records"),
    quotes: z.array(z.any()).optional().describe("Active quote records"),
    machines: z.array(z.any()).optional().describe("Machine status records"),
    ncrs: z.array(z.any()).optional().describe("NCR records"),
    invoices: z.array(z.any()).optional().describe("Invoice records"),
    programs: z.array(z.any()).optional().describe("Program records"),
    operator_id: optStr.describe("Operator ID for operator desk"),
    clock_in_time: optStr.describe("Clock-in timestamp"),
  }).optional().describe("Live data sources"),
}).passthrough();

const desk_kpi_counts = z.object({
  data: z.object({
    jobs: z.array(z.any()).optional(),
    quotes: z.array(z.any()).optional(),
    ncrs: z.array(z.any()).optional(),
    invoices: z.array(z.any()).optional(),
  }).optional().describe("Data for count derivation"),
}).passthrough();

// ─── Saved Views (Session 6-8) ──────────────────────────────────────────────

const view_create = z.object({
  user_id: z.string().describe("User ID"),
  name: z.string().describe("View name"),
  entity_type: z.string().describe("Entity type this view applies to"),
  filters: z.record(z.string(), z.unknown()).optional().describe("Filter criteria"),
  columns: z.array(z.string()).optional().describe("Visible columns"),
  sort_by: optStr.describe("Sort column"),
  sort_dir: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  is_default: z.boolean().optional().describe("Set as default view for this entity type"),
}).passthrough();

const view_update = z.object({
  view_id: z.string().describe("Saved view ID"),
  user_id: z.string().describe("User ID (must match owner)"),
  name: optStr.describe("New name"),
  filters: z.record(z.string(), z.unknown()).optional().describe("Updated filters"),
  columns: z.array(z.string()).optional().describe("Updated columns"),
  sort_by: optStr.describe("Updated sort column"),
  sort_dir: z.enum(["asc", "desc"]).optional().describe("Updated sort direction"),
  is_default: z.boolean().optional().describe("Set/unset as default"),
}).passthrough();

const view_delete = z.object({
  view_id: z.string().describe("Saved view ID to delete"),
  user_id: z.string().describe("User ID (must match owner)"),
}).passthrough();

const view_list = z.object({
  user_id: z.string().describe("User ID"),
  entity_type: optStr.describe("Optional filter by entity type"),
}).passthrough();

// ─── Pins & Recents (Session 6-8) ───────────────────────────────────────────

const pin_entity = z.object({
  user_id: z.string().describe("User ID"),
  entity_type: z.string().describe("Entity type (job, quote, customer, etc.)"),
  entity_id: z.string().describe("Entity ID"),
  title: z.string().describe("Display title"),
}).passthrough();

const unpin_entity = z.object({
  pin_id: z.string().describe("Pin ID to remove"),
  user_id: z.string().describe("User ID (must match owner)"),
}).passthrough();

const pin_list = z.object({
  user_id: z.string().describe("User ID"),
}).passthrough();

const recent_record = z.object({
  user_id: z.string().describe("User ID"),
  entity_type: z.string().describe("Entity type"),
  entity_id: z.string().describe("Entity ID"),
  title: z.string().describe("Display title"),
}).passthrough();

const recent_list = z.object({
  user_id: z.string().describe("User ID"),
  limit: optNum.describe("Max results (default 20)"),
}).passthrough();

// ─── Global Search (Session 6-8) ────────────────────────────────────────────

const searchableTypeEnum = z.enum([
  "part", "quote", "job", "customer", "tool",
  "machine", "invoice", "purchase_order", "employee", "quality_record",
]);

const search_global = z.object({
  query: z.string().describe("Search query string"),
  types: z.array(searchableTypeEnum).optional().describe("Entity types to search"),
  limit: optNum.describe("Max results (default 20, max 100)"),
  offset: optNum.describe("Pagination offset"),
  min_score: z.number().optional().describe("Minimum match score (default 0.15)"),
}).passthrough();

const search_suggest = z.object({
  query: z.string().describe("Autocomplete query (min 2 chars)"),
  limit: optNum.describe("Max suggestions (default 10)"),
  types: z.array(searchableTypeEnum).optional().describe("Entity types to suggest from"),
}).passthrough();

const search_index = z.object({
  entities: z.array(z.object({
    entity_type: searchableTypeEnum,
    entity_id: z.string(),
    title: z.string(),
    subtitle: optStr,
    searchable_text: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).describe("Entities to index for search"),
}).passthrough();

const search_stats = z.object({}).passthrough();

// ─── Export ──────────────────────────────────────────────────────────────────

// ─── Preset Library (Session 6-10) ───────────────────────────────────────────

const presetTypeEnum = z.enum(["speed_feed", "toolpath", "ppg_controller", "machine_setup", "fixture", "holder", "tool_assembly"]);

const preset_save = z.object({
  user_id: z.string(), preset_type: presetTypeEnum, name: z.string(),
  description: optStr, params: z.record(z.string(), z.any()),
  tags: z.array(z.string()).optional(), machine_id: optStr, material_id: optStr, operation: optStr,
}).passthrough();
const preset_get = z.object({ preset_id: z.string(), user_id: optStr }).passthrough();
const preset_list = z.object({
  user_id: z.string(), preset_type: presetTypeEnum.optional(), include_shared: z.boolean().optional(),
  machine_id: optStr, material_id: optStr, operation: optStr, limit: optNum, offset: optNum,
}).passthrough();
const preset_search = z.object({
  user_id: z.string(), query: z.string(), preset_type: presetTypeEnum.optional(),
  include_shared: z.boolean().optional(), limit: optNum,
}).passthrough();
const preset_share = z.object({ preset_id: z.string(), user_id: z.string() }).passthrough();
const preset_unshare = z.object({ preset_id: z.string(), user_id: z.string() }).passthrough();
const preset_compare = z.object({ preset_ids: z.array(z.string()).min(2).max(5), user_id: z.string() }).passthrough();
const preset_validate = z.object({ preset_id: z.string() }).passthrough();
const preset_delete = z.object({ preset_id: z.string(), user_id: z.string() }).passthrough();
const preset_increment_use = z.object({ preset_id: z.string() }).passthrough();

// ─── Learning Progression (Session 6-10) ─────────────────────────────────────

const difficultyEnum = z.enum(["beginner", "intermediate", "advanced", "expert"]);
const mediaTypeEnum = z.enum(["video", "pdf", "image", "interactive", "reference"]);

const course_create = z.object({
  title: z.string(), description: optStr, domain: z.string(),
  difficulty: difficultyEnum.optional(),
  modules: z.array(z.object({
    title: z.string(), description: optStr, estimated_minutes: optNum,
    has_checkpoint: z.boolean().optional(), checkpoint_type: z.enum(["quiz", "exam", "practical"]).optional(),
    pass_threshold: optNum,
  })),
  prerequisites: z.array(z.string()).optional(), tags: z.array(z.string()).optional(),
  machine_type: optStr, material_focus: optStr, cam_system: optStr, process_type: optStr,
  is_published: z.boolean().optional(), created_by: optStr,
}).passthrough();
const course_get = z.object({ course_id: z.string() }).passthrough();
const course_enroll = z.object({ user_id: z.string(), course_id: z.string() }).passthrough();
const course_progress = z.object({ user_id: z.string(), course_id: z.string() }).passthrough();
const course_search = z.object({
  query: optStr, domain: optStr, difficulty: difficultyEnum.optional(),
  machine_type: optStr, material_focus: optStr, cam_system: optStr, process_type: optStr,
  tags: z.array(z.string()).optional(), limit: optNum,
}).passthrough();
const checkpoint_submit = z.object({
  enrollment_id: z.string(), module_idx: z.number().int().min(0),
  answers: z.array(z.object({ answer: z.string() })), duration_sec: optNum,
}).passthrough();
const enrollment_summary = z.object({ user_id: z.string() }).passthrough();
const learning_media_add = z.object({
  course_id: z.string(), module_idx: z.number().int().min(0).optional(),
  media_type: mediaTypeEnum, title: z.string(), url: optStr, file_id: optStr, duration_sec: optNum,
}).passthrough();
const learning_media_list = z.object({ course_id: z.string(), module_idx: z.number().int().min(0).optional() }).passthrough();

// RAG_CROSSWIRE (RAG-UPGRADE-MS0/U-RAG-PSN-OS-WIRE, slot:india 2026-06-22):
// ReRankerEngine validates input internally via its ReRankInputSchema (strict
// per-candidate check), so this outer dispatcher schema is intentionally permissive
// -- callers see a single uniform error shape from the engine validator instead of a
// split between zod + engine. Mirrors RAG_CROSSWIRE_SCHEMAS in aiReasoningDispatcher.ts.
const rag_rerank = z.record(z.string(), z.unknown());

export const ACTION_OPERATING_SYSTEM_SCHEMAS: ActionSchemaMap = {
  shell_bootstrap,
  shell_employee_profiles,
  shell_employee_bootstrap,
  desk_counts,
  job_desk,
  program_release_catalog,
  program_release_workspace,
  scheduling_studies,
  shop_floor_check_in,
  desk_payload,
  desk_kpi_counts,
  view_create,
  view_update,
  view_delete,
  view_list,
  pin_entity,
  unpin_entity,
  pin_list,
  recent_record,
  recent_list,
  search_global,
  search_suggest,
  search_index,
  search_stats,
  // Preset Library (Session 6-10)
  preset_save,
  preset_get,
  preset_list,
  preset_search,
  preset_share,
  preset_unshare,
  preset_compare,
  preset_validate,
  preset_delete,
  preset_increment_use,
  // Learning Progression (Session 6-10)
  course_create,
  course_get,
  course_enroll,
  course_progress,
  course_search,
  checkpoint_submit,
  enrollment_summary,
  learning_media_add,
  learning_media_list,
};
