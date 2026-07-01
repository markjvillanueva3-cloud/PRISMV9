/**
 * shopDispatcher.ts — prism_shop MCP dispatcher
 * ===============================================
 *
 * Wires 8 previously-dormant Shop-domain engines into a single focused
 * MCP tool surface. Shop engines cover operations management, scheduling,
 * dashboards, quoting, job tracking, cost tracking, machine overlays,
 * and live shop state — the operational layer of the PRISM shop floor.
 *
 * Action map (46 total):
 *
 *   COMPLETENESS (3)
 *   completeness_calculate     → ShopDataCompletenessEngine.calculateCompleteness()
 *   completeness_domain_gap    → ShopDataCompletenessEngine.getDomainGaps()
 *   completeness_recommendations → ShopDataCompletenessEngine.getRecommendations()
 *
 *   COST (6)
 *   cost_clock_in              → ShopFloorCostEngine.clockIn()
 *   cost_clock_out             → ShopFloorCostEngine.clockOut()
 *   cost_charge_material       → ShopFloorCostEngine.chargeMaterial()
 *   cost_job_summary           → ShopFloorCostEngine.getJobCostSummary()
 *   cost_labor_by_dept         → ShopFloorCostEngine.getLaborByDepartment()
 *   cost_active_clocks         → ShopFloorCostEngine.getActiveClocks()
 *   cost_set_estimated         → ShopFloorCostEngine.setEstimatedCosts()
 *
 *   DASHBOARD (5)
 *   dashboard_get              → ShopFloorDashboardEngine.getDashboard()
 *   dashboard_machine_status   → ShopFloorDashboardEngine.getMachineStatus()
 *   dashboard_alerts           → ShopFloorDashboardEngine.getAlerts()
 *   dashboard_acknowledge_alert→ ShopFloorDashboardEngine.acknowledgeAlert()
 *   dashboard_machine_oee      → ShopFloorDashboardEngine.calculateMachineOEE()
 *
 *   JOB (7)
 *   job_create                 → ShopFloorJobEngine.createJob()
 *   job_get                    → ShopFloorJobEngine.getJob()
 *   job_list                   → ShopFloorJobEngine.getJobs()
 *   job_update                 → ShopFloorJobEngine.updateJob()
 *   job_complete_operation     → ShopFloorJobEngine.completeOperation()
 *   job_due_soon               → ShopFloorJobEngine.getJobsDueSoon()
 *   job_completion             → ShopFloorJobEngine.calculateCompletion()
 *
 *   QUOTE (5)
 *   quote_generate             → ShopFloorQuoteEngine.generateQuote()
 *   quote_historical_jobs      → ShopFloorQuoteEngine.getHistoricalJobs()
 *   quote_suggested_price      → ShopFloorQuoteEngine.getSuggestedPriceFromHistory()
 *   quote_analyze_margin       → ShopFloorQuoteEngine.analyzeMargin()
 *   quote_department_rates     → ShopFloorQuoteEngine.getDepartmentRates()
 *
 *   SCHEDULE (6)
 *   schedule_operation         → ShopFloorScheduleEngine.scheduleOperation()
 *   schedule_machine_capacity  → ShopFloorScheduleEngine.getMachineCapacity()
 *   schedule_all_capacity      → ShopFloorScheduleEngine.getAllCapacity()
 *   schedule_job               → ShopFloorScheduleEngine.getJobSchedule()
 *   schedule_projected_completion → ShopFloorScheduleEngine.getProjectedCompletion()
 *   schedule_reschedule        → ShopFloorScheduleEngine.rescheduleOperation()
 *   schedule_find_slot         → ShopFloorScheduleEngine.findAvailableSlot()
 *
 *   MACHINE OVERLAY (9)
 *   overlay_create             → ShopMachineOverlayEngine.createOverlay()
 *   overlay_update             → ShopMachineOverlayEngine.updateOverlay()
 *   overlay_get                → ShopMachineOverlayEngine.getOverlay()
 *   overlay_for_machine        → ShopMachineOverlayEngine.getOverlaysForMachine()
 *   overlay_default            → ShopMachineOverlayEngine.getDefaultOverlay()
 *   overlay_preset_get         → ShopMachineOverlayEngine.getPreset()
 *   overlay_preset_list        → ShopMachineOverlayEngine.listPresets()
 *   overlay_set_default        → ShopMachineOverlayEngine.setDefault()
 *   overlay_delete             → ShopMachineOverlayEngine.deleteOverlay()
 *   overlay_merged_view        → ShopMachineOverlayEngine.getMergedView()
 *   overlay_bulk_create        → ShopMachineOverlayEngine.createOverlaysForShop()
 *   overlay_stats              → ShopMachineOverlayEngine.getStats()
 *
 *   SHOP STATE (13)
 *   state_create_job           → ShopStateEngine.createJob()
 *   state_get_job              → ShopStateEngine.getJob()
 *   state_list_jobs            → ShopStateEngine.listJobs()
 *   state_update_job_status    → ShopStateEngine.updateJobStatus()
 *   state_update_progress      → ShopStateEngine.updateProgress()
 *   state_get_traveler         → ShopStateEngine.getTraveler()
 *   state_start_step           → ShopStateEngine.startStep()
 *   state_complete_step        → ShopStateEngine.completeStep()
 *   state_start_labor          → ShopStateEngine.startLabor()
 *   state_pause_labor          → ShopStateEngine.pauseLabor()
 *   state_resume_labor         → ShopStateEngine.resumeLabor()
 *   state_complete_labor       → ShopStateEngine.completeLabor()
 *   state_active_sessions      → ShopStateEngine.getActiveSessions()
 *   state_record_quantity      → ShopStateEngine.recordQuantity()
 *   state_get_approvals        → ShopStateEngine.getApprovals()
 *   state_get_attachments      → ShopStateEngine.getAttachments()
 *   state_shop_snapshot        → ShopStateEngine.shopSnapshot()
 *
 * Cross-wire note: Shop engines are an operations/scheduling/dashboard semantic
 * cluster distinct from AI-reasoning and learning-backbone concerns.
 * prism_shop is the appropriate standalone surface. If a future milestone
 * requires surfacing shop data in prism_dev or prism_intelligence, add
 * pass-through actions there (§ENGINE WIRING — WIRE TO ALL SOURCES).
 *
 * @module tools/dispatchers/shopDispatcher
 * @milestone PSN-SYNERGY / SHOP-WIRING
 */

import { z } from "zod";
import {
  EmptyInputSchema,
  CompletenessCalculateSchema,
  CompletenessDomainGapSchema,
  CostClockInSchema,
  CostClockOutSchema,
  CostChargeMaterialSchema,
  CostJobSummarySchema,
  CostSetEstimatedSchema,
  DashboardGetSchema,
  DashboardMachineStatusSchema,
  DashboardAlertsSchema,
  DashboardAcknowledgeAlertSchema,
  DashboardMachineOEESchema,
  JobCreateSchema,
  JobGetSchema,
  JobListSchema,
  JobUpdateSchema,
  JobCompleteOperationSchema,
  JobDueSoonSchema,
  JobCompletionSchema,
  QuoteGenerateSchema,
  QuoteHistoricalJobsSchema,
  QuoteSuggestedPriceSchema,
  QuoteAnalyzeMarginSchema,
  ScheduleOperationSchema,
  ScheduleMachineCapacitySchema,
  ScheduleAllCapacitySchema,
  ScheduleJobSchema,
  ScheduleRescheduleSchema,
  ScheduleFindSlotSchema,
  OverlayCreateSchema,
  OverlayUpdateSchema,
  OverlayGetSchema,
  OverlayForMachineSchema,
  OverlayPresetSchema,
  OverlaySetDefaultSchema,
  OverlayDeleteSchema,
  OverlayMergedViewSchema,
  OverlayBulkCreateSchema,
  StateCreateJobSchema,
  StateJobIdSchema,
  StateListJobsSchema,
  StateUpdateJobStatusSchema,
  StateUpdateProgressSchema,
  StateTravelerJobSchema,
  StateStartStepSchema,
  StateCompleteStepSchema,
  StateStartLaborSchema,
  StatePauseLaborSchema,
  StateResumeLaborSchema,
  StateCompleteLaborSchema,
  StateActiveSessionsSchema,
  StateRecordQuantitySchema,
  StateGetApprovalsSchema,
  StateGetAttachmentsSchema,
} from "../../schemas/shopActionSchemas.js";

// ─── Action enum (alphabetically sorted within logical groups) ────────────────

const COMPLETENESS_ACTIONS = [
  "completeness_calculate",
  "completeness_domain_gap",
  "completeness_recommendations",
] as const;

const COST_ACTIONS = [
  "cost_active_clocks",
  "cost_charge_material",
  "cost_clock_in",
  "cost_clock_out",
  "cost_job_summary",
  "cost_labor_by_dept",
  "cost_set_estimated",
] as const;

const DASHBOARD_ACTIONS = [
  "dashboard_acknowledge_alert",
  "dashboard_alerts",
  "dashboard_get",
  "dashboard_machine_oee",
  "dashboard_machine_status",
] as const;

const JOB_ACTIONS = [
  "job_complete_operation",
  "job_completion",
  "job_create",
  "job_due_soon",
  "job_get",
  "job_list",
  "job_update",
] as const;

const QUOTE_ACTIONS = [
  "quote_analyze_margin",
  "quote_department_rates",
  "quote_generate",
  "quote_historical_jobs",
  "quote_suggested_price",
] as const;

const SCHEDULE_ACTIONS = [
  "schedule_all_capacity",
  "schedule_find_slot",
  "schedule_job",
  "schedule_machine_capacity",
  "schedule_operation",
  "schedule_projected_completion",
  "schedule_reschedule",
] as const;

const OVERLAY_ACTIONS = [
  "overlay_bulk_create",
  "overlay_create",
  "overlay_default",
  "overlay_delete",
  "overlay_for_machine",
  "overlay_get",
  "overlay_merged_view",
  "overlay_preset_get",
  "overlay_preset_list",
  "overlay_set_default",
  "overlay_stats",
  "overlay_update",
] as const;

const STATE_ACTIONS = [
  "state_active_sessions",
  "state_complete_labor",
  "state_complete_step",
  "state_create_job",
  "state_get_approvals",
  "state_get_attachments",
  "state_get_job",
  "state_get_traveler",
  "state_list_jobs",
  "state_pause_labor",
  "state_record_quantity",
  "state_resume_labor",
  "state_shop_snapshot",
  "state_start_labor",
  "state_start_step",
  "state_update_job_status",
  "state_update_progress",
] as const;

// U-BRIDGE-WIRE-MOBILE (slot:mike, 2026-05-23): 3 unwired Mobile Field engines
const MOBILE_ACTIONS = [
  "mobile_alarm_decode",   // MobileAlarmEngine.decodeAlarm({code, controller?})
  "mobile_timer_active",   // MobileTimerEngine.getActiveTimers(operatorId?)
  "mobile_cache_stats",    // MobileCacheEngine.getStats()
] as const;

// U-BRIDGE-WIRE-CONVEYOR (slot:mike, 2026-05-23): material-handling sizing
const CONVEYOR_ACTIONS = [
  "conveyor_design_calc",  // ConveyorDesignEngine.calculate(input)
] as const;

// U-EMPLOYEE-MOBILE-PORTAL (slot:hotel, 2026-05-23): phone-first shop-floor
// portal — QR scan + per-employee task state machine + employee messaging +
// hot-job priority audit + manager delegation. All via EmployeeShopFloorMobileEngine.
const EMPLOYEE_PORTAL_ACTIONS = [
  "emp_scan_in",                // scan QR/barcode → start task (auto-pause prior)
  "emp_start_task",             // explicit start by (job, op, task, employee)
  "emp_pause_task",             // running → paused (reason ≥2 chars)
  "emp_resume_task",            // paused → running
  "emp_stop_task",              // terminal completed | stopped (reason optional)
  "emp_get_active_task",        // employee's currently-running task
  "emp_get_task",               // task lookup by id
  "emp_send_message",           // employee → employee (cap 2000 chars)
  "emp_list_messages",          // recipient inbox, newest first, optional unreadOnly
  "emp_mark_message_read",      // idempotent
  "emp_bump_job_priority",      // admin escalation (reason ≥3 chars; audited)
  "emp_get_job_priority",       // current priority (0 default)
  "emp_get_priority_audit",     // full chain of bumps; optional job_id filter
  "emp_rank_jobs",              // priority DESC + recency + insertion tiebreak
  "emp_delegate_task",          // manager → employee (reason ≥3 chars; audited)
  "emp_ack_delegation",         // assigned employee acknowledges
  "emp_list_delegations",       // employee's delegations, optional unack-only
  // W1 — phone-ready calculators (existing engines, mobile-friendly thin wrappers)
  "emp_calc_speed_feed",        // UltimateSpeedFeedEngine.calculate (any-subset input → infers)
  "emp_calc_kienzle_specific",  // KienzleForceModelEngine.calculateSpecificCuttingForce
  "emp_calc_kienzle_forces",    // KienzleForceModelEngine.calculateForceComponents
  "emp_calc_kienzle_milling",   // KienzleForceModelEngine.calculateMillingForces
  "emp_calc_cost_breakdown",    // CostEstimationEngine.estimate → CostBreakdown
  "emp_calc_cost_quick",        // CostEstimatorEngine.estimate (quick estimate)
  // W2 — document intake (photo + email attachment + scanned PDF)
  "emp_doc_ingest",             // DocumentInboxEngine.ingest — classify + extract + part-match
  "emp_doc_get",                // .get(id)
  "emp_doc_list",               // .list({status?, type?, ...})
  "emp_doc_search",             // .search(query, limit)
  // W3 — print-to-program chain
  "emp_blueprint_to_quote",     // BlueprintToQuoteBridgeEngine.bridge(analysis, overrides?)
  "emp_blueprint_to_program",   // AutoPrintToProgramBridgeEngine.runAutoPipeline(input)
  // W4 — DNC / CIMCO wireless export to lathes
  "emp_dnc_plan",               // DNCFileTransferEngine.buildTransfer — protocol + ETA
  "emp_dnc_queue",              // DNCSendEngine.queueTransfer — safety-gated queue
  "emp_dnc_machines",           // DNCSendEngine.listConnections — registered controllers
  "emp_dnc_safety_check",       // DNCVerifyEngine.quickSafetyCheck — quick S(x) gate
  // U-EMP-PER-MACHINE-SF-ADAPTIVE (slot:hotel iter6, 2026-05-25)
  // Per-machine Bayesian speed/feed adaptation — keyed on machine serial,
  // material, tool_type. Closes the "no two machines are the same" gap.
  "emp_sf_record_outcome",      // employee records a cutting outcome verdict
  "emp_sf_adapt_prior",         // run Bayesian update on per-machine prior
  "emp_sf_recommend",           // get adapted speed/feed recommendation
  "emp_sf_get_prior",           // inspect current posterior + observation count
  "emp_sf_list_outcomes",       // read-only ledger of per-(machine,material,tool) observations
  // U-EMP-INSERT-SIDE-TRACKER (slot:hotel iter7, 2026-05-25)
  // Per-insert corner tracking — CNMG=8 corners, DCMT=6, TNMG=3, etc.
  // Rotation suggestion when corner crosses parts/runtime threshold.
  "emp_insert_assign",          // assign fresh insert to a part
  "emp_insert_record_wear",     // accumulate parts_cut + runtime on active corner
  "emp_insert_rotate",          // rotate to next usable corner
  "emp_insert_suggest_rotation",// query rotation recommendation
  "emp_insert_get_status",      // full current assignment state
  "emp_insert_list_types",      // ISO insert-type catalog with corner counts
  // U-EMP-WIZARD-BRIDGE (slot:hotel iter8, 2026-05-25)
  // Unified wizard surface — speed-feed + milling + lathe + wire-EDM with
  // adaptive per-machine prior baked into every recommendation.
  "emp_wizard_speed_feed",      // speed/feed calculator with adapted prior
  "emp_wizard_milling",         // milling wizard (rough/finish/slot/pocket/drill/thread)
  "emp_wizard_lathe",           // lathe wizard (rough/finish/face/groove/part_off/thread/bore/drill)
  "emp_wizard_wire_edm",        // wire-EDM wizard (thickness + cut_count → Ra-aware strategy)
  // U-EMP-PER-OP-PART-TRACKER (slot:hotel iter9, 2026-05-25)
  // Per-operation part count — closes "blank-day" reporting when operator
  // ran mid-op 1+2 of 4-op part but didn't ship final piece.
  "emp_op_part_record",         // record N parts completed on a specific op
  "emp_op_part_summary",        // total for one (job, op)
  "emp_op_part_job_totals",     // per-op breakdown for a job
  "emp_op_part_daily_ship",     // employee daily roll-up across all ops/jobs
  "emp_op_part_adjust",         // operator-driven correction with audit trail
  "emp_op_part_adjustments",    // adjustment audit log
  // U-EMP-MULTI-JOB-CONCURRENCY (slot:hotel iter10, 2026-05-25)
  // Quick-menu + multi-job concurrent state + concurrency-aware time alloc.
  // Operator runs 3 machines → time splits proportionally; no dormant-job penalty.
  "emp_concurrent_check_in",    // add a job to the operator's active set
  "emp_concurrent_pause",       // pause one job
  "emp_concurrent_resume",      // resume one job
  "emp_concurrent_pause_all",   // pause every job (end of shift / break)
  "emp_concurrent_quick_switch",// tap-to-switch (pause from + start to atomically)
  "emp_concurrent_list",        // current concurrent set
  "emp_concurrent_quick_menu",  // phone-rendered view with share% + next_action
  "emp_concurrent_tick",        // advance wall-clock; allocates ms across active set
  "emp_concurrent_set_strategy",// equal | weighted
  "emp_concurrent_set_weight",  // attention weight on one job (weighted mode)
  "emp_concurrent_adjust_parts",// manual part-count correction with audit
  "emp_concurrent_adjust_time", // manual effective-time correction with audit
  // P0c — auto-attach R1 RoleResolver to EmployeeEngine (closes "ACL armed but not loaded")
  "emp_acl_attach_employee_engine", // wire role lookup → EmployeeEngine.get(id).role
  "emp_acl_detach",                 // remove the resolver (restores backward-compat)
  // P2 — office-personnel aggregation surface (read-only, multi-engine joins)
  "emp_office_who_on_what",         // every employee + their currently-running task
  "emp_office_priority_queue",      // top-N hottest jobs (rankJobsByPriority pass-through)
  "emp_office_pending_delegations", // ALL unacked delegations across all employees
  "emp_office_machine_view",        // tap a machine → layout + (any task on it)
  "emp_office_shift_summary",       // labor totals (pass-through to ShopFloorCostEngine)
  // W5 — phone-walkthrough 3D shop-floor layout (NEW engine ShopFloorLayoutEngine)
  "emp_layout_start_capture",       // begin a phone AR walkthrough
  "emp_layout_add_frames",          // accumulate frame-count from ARKit/ARCore
  "emp_layout_tag_machine",         // bind a machine_id to a bbox in the captured space
  "emp_layout_finish_capture",      // mark capture complete
  "emp_layout_abandon_capture",     // abort + record reason
  "emp_layout_machine_at_point",    // tap-to-locate: 3D point → machine
  "emp_layout_get_machine",         // machine_id → bbox + tagged_by + capture_session
  "emp_layout_list",                // full layout (all tagged machines)
  "emp_layout_list_captures",       // capture history (status/by-employee filter)
  "emp_layout_audit",               // every tag/retag — hotel-soul audit chain
] as const;

// U-LOOP-WIRE (slot:india, /goal-psn-self-improving iter5, 2026-05-25):
// Wires PSNSelfImprovingLoopEngine read-only surface + ShopProfileAdapter
// query/reset into the prism_shop dispatcher. Per-shop self-improving loop
// is the canonical "shop adapter" → MCP integration point.
const LOOP_ACTIONS = [
  "loop_shop_summary",   // PSNSelfImprovingLoopEngine.getShopDeltas summary (sanitized)
  "loop_shop_deltas",    // ShopProfileAdapterEngine.getDeltas — frozen snapshot
  "loop_shop_reset",     // ShopProfileAdapterEngine.reset(shopId)
] as const;

const ALL_ACTIONS = [
  ...COMPLETENESS_ACTIONS,
  ...COST_ACTIONS,
  ...DASHBOARD_ACTIONS,
  ...JOB_ACTIONS,
  ...QUOTE_ACTIONS,
  ...SCHEDULE_ACTIONS,
  ...OVERLAY_ACTIONS,
  ...STATE_ACTIONS,
  ...MOBILE_ACTIONS,
  ...CONVEYOR_ACTIONS,
  ...EMPLOYEE_PORTAL_ACTIONS,
  ...LOOP_ACTIONS,
] as const;

type ShopAction = (typeof ALL_ACTIONS)[number];

// ─── Input schema lookup ──────────────────────────────────────────────────────

// Partial: not every ShopAction declares a strict input schema. The lookup at
// the dispatch site (`const schema = ACTION_SCHEMAS[action]; if (schema) {...}`)
// already treats a missing entry as "no schema validation", so actions without
// an entry (e.g. the emp_sf_* Bayesian-prior actions) validate inside their
// engines instead of here.
const ACTION_SCHEMAS: Partial<Record<ShopAction, z.ZodTypeAny>> = {
  // Completeness
  completeness_calculate: CompletenessCalculateSchema,
  completeness_domain_gap: CompletenessDomainGapSchema,
  completeness_recommendations: CompletenessCalculateSchema,
  // Cost
  cost_active_clocks: EmptyInputSchema,
  cost_charge_material: CostChargeMaterialSchema,
  cost_clock_in: CostClockInSchema,
  cost_clock_out: CostClockOutSchema,
  cost_job_summary: CostJobSummarySchema,
  cost_labor_by_dept: CostJobSummarySchema,
  cost_set_estimated: CostSetEstimatedSchema,
  // Dashboard
  dashboard_acknowledge_alert: DashboardAcknowledgeAlertSchema,
  dashboard_alerts: DashboardAlertsSchema,
  dashboard_get: DashboardGetSchema,
  dashboard_machine_oee: DashboardMachineOEESchema,
  dashboard_machine_status: DashboardMachineStatusSchema,
  // Job
  job_complete_operation: JobCompleteOperationSchema,
  job_completion: JobCompletionSchema,
  job_create: JobCreateSchema,
  job_due_soon: JobDueSoonSchema,
  job_get: JobGetSchema,
  job_list: JobListSchema,
  job_update: JobUpdateSchema,
  // Quote
  quote_analyze_margin: QuoteAnalyzeMarginSchema,
  quote_department_rates: EmptyInputSchema,
  quote_generate: QuoteGenerateSchema,
  quote_historical_jobs: QuoteHistoricalJobsSchema,
  quote_suggested_price: QuoteSuggestedPriceSchema,
  // Schedule
  schedule_all_capacity: ScheduleAllCapacitySchema,
  schedule_find_slot: ScheduleFindSlotSchema,
  schedule_job: ScheduleJobSchema,
  schedule_machine_capacity: ScheduleMachineCapacitySchema,
  schedule_operation: ScheduleOperationSchema,
  schedule_projected_completion: ScheduleJobSchema,
  schedule_reschedule: ScheduleRescheduleSchema,
  // Overlay
  overlay_bulk_create: OverlayBulkCreateSchema,
  overlay_create: OverlayCreateSchema,
  overlay_default: OverlayForMachineSchema,
  overlay_delete: OverlayDeleteSchema,
  overlay_for_machine: OverlayForMachineSchema,
  overlay_get: OverlayGetSchema,
  overlay_merged_view: OverlayMergedViewSchema,
  overlay_preset_get: OverlayPresetSchema,
  overlay_preset_list: EmptyInputSchema,
  overlay_set_default: OverlaySetDefaultSchema,
  overlay_stats: EmptyInputSchema,
  overlay_update: OverlayUpdateSchema,
  // State
  state_active_sessions: StateActiveSessionsSchema,
  state_complete_labor: StateCompleteLaborSchema,
  state_complete_step: StateCompleteStepSchema,
  state_create_job: StateCreateJobSchema,
  state_get_approvals: StateGetApprovalsSchema,
  state_get_attachments: StateGetAttachmentsSchema,
  state_get_job: StateJobIdSchema,
  state_get_traveler: StateTravelerJobSchema,
  state_list_jobs: StateListJobsSchema,
  state_pause_labor: StatePauseLaborSchema,
  state_record_quantity: StateRecordQuantitySchema,
  state_resume_labor: StateResumeLaborSchema,
  state_shop_snapshot: EmptyInputSchema,
  // PSN Self-Improving Loop (U-LOOP-WIRE iter5)
  loop_shop_summary: z.object({ shop_id: z.string().optional() }),
  loop_shop_deltas: z.object({ shop_id: z.string().optional() }),
  loop_shop_reset: z.object({ shop_id: z.string() }),
  state_start_labor: StateStartLaborSchema,
  state_start_step: StateStartStepSchema,
  state_update_job_status: StateUpdateJobStatusSchema,
  state_update_progress: StateUpdateProgressSchema,
  // U-BRIDGE-WIRE-MOBILE (slot:mike, 2026-05-23) — 3 Mobile Field engine read-side actions.
  // Inline schemas (not in shopActionSchemas.ts) to keep the wiring atomic in one file edit.
  mobile_alarm_decode: z.object({
    code: z.string().min(1).describe("Alarm code from the controller (e.g. '108', '3048')"),
    controller: z.string().optional().describe("Controller filter — 'okuma'/'haas'/'fanuc'/'siemens'"),
  }).passthrough().describe("Decode a machine alarm code to severity + cause + solutions"),
  mobile_timer_active: z.object({
    operatorId: z.string().optional().describe("Operator filter; omit for all active timers"),
  }).passthrough().describe("List active operation timers (running or paused), optionally per operator"),
  mobile_cache_stats: z.object({}).passthrough()
    .describe("Read-only snapshot of offline-cache size + sync queue depth (no args)"),
  // U-BRIDGE-WIRE-CONVEYOR (slot:mike, 2026-05-23) — belt conveyor sizing (CEMA 7th Ed / DIN 22101 / ISO 5048).
  conveyor_design_calc: z.object({
    throughput_tph: z.number().positive().optional(),
    belt_speed_m_s: z.number().positive().optional(),
    conveyor_length_m: z.number().positive().optional(),
    lift_height_m: z.number().optional(),
    material_density_kg_m3: z.number().positive().optional(),
    material_angle_of_repose_deg: z.number().optional(),
    belt_width_mm: z.number().positive().optional(),
    trough_angle_deg: z.number().optional(),
    friction_factor: z.number().positive().optional(),
    incline_angle_deg: z.number().optional(),
    drive_efficiency: z.number().positive().max(1).optional(),
  }).passthrough().describe("Belt conveyor sizing: width, drive power, tensions, pulley diameter, take-up travel"),
  // U-EMPLOYEE-MOBILE-PORTAL (slot:hotel, 2026-05-23) — phone-first shop-floor portal.
  // Inline schemas (kept atomic in this dispatcher; no shopActionSchemas.ts churn).
  emp_scan_in: z.object({
    payload: z.string().min(1).describe("QR/barcode payload (prism://job/J/op/O/task/T) or bare job-id"),
    employee_id: z.string().min(1),
    source: z.enum(["qr", "barcode", "manual"]).optional(),
  }).passthrough().describe("Scan-in: parse payload → start task; auto-pauses prior active task"),
  emp_start_task: z.object({
    job_id: z.string().min(1),
    operation_id: z.string().min(1),
    task_id: z.string().min(1),
    employee_id: z.string().min(1),
  }).passthrough().describe("Explicit task start (idempotent for already-running task)"),
  emp_pause_task: z.object({
    task_id: z.string().min(1),
    employee_id: z.string().min(1),
    reason: z.string().min(2).describe("Pause reason (≥2 chars; audit field)"),
  }).passthrough(),
  emp_resume_task: z.object({
    task_id: z.string().min(1),
    employee_id: z.string().min(1),
  }).passthrough(),
  emp_stop_task: z.object({
    task_id: z.string().min(1),
    employee_id: z.string().min(1),
    completed: z.boolean().describe("true=completed (terminal), false=stopped without completion"),
    reason: z.string().optional(),
  }).passthrough(),
  emp_get_active_task: z.object({ employee_id: z.string().min(1) }).passthrough(),
  emp_get_task: z.object({ task_id: z.string().min(1) }).passthrough(),
  emp_send_message: z.object({
    from_employee_id: z.string().min(1),
    to_employee_id: z.string().min(1),
    body: z.string().min(1).describe("Message body (capped at 2000 chars by engine)"),
  }).passthrough(),
  emp_list_messages: z.object({
    employee_id: z.string().min(1),
    unread_only: z.boolean().optional(),
  }).passthrough(),
  emp_mark_message_read: z.object({ message_id: z.string().min(1) }).passthrough(),
  emp_bump_job_priority: z.object({
    job_id: z.string().min(1),
    new_priority: z.number().finite().describe("Higher = hotter; 0 = default"),
    admin_id: z.string().min(1),
    reason: z.string().min(3).describe("Escalation reason (≥3 chars; hotel-soul audit rule)"),
  }).passthrough(),
  emp_get_job_priority: z.object({ job_id: z.string().min(1) }).passthrough(),
  emp_get_priority_audit: z.object({
    job_id: z.string().optional().describe("Omit for global audit chain"),
  }).passthrough(),
  emp_rank_jobs: z.object({}).passthrough().describe("All jobs sorted hottest-first"),
  emp_delegate_task: z.object({
    task_id: z.string().min(1),
    from_manager_id: z.string().min(1),
    to_employee_id: z.string().min(1),
    reason: z.string().min(3).describe("Delegation reason (≥3 chars; hotel-soul audit rule)"),
  }).passthrough(),
  emp_ack_delegation: z.object({
    delegation_id: z.string().min(1),
    employee_id: z.string().min(1).describe("Must match the assigned employee"),
  }).passthrough(),
  emp_list_delegations: z.object({
    employee_id: z.string().min(1),
    unacknowledged_only: z.boolean().optional(),
  }).passthrough(),
  // W1 — phone-ready calculators (loose passthrough; underlying engines validate).
  emp_calc_speed_feed: z.object({}).passthrough()
    .describe("Speed/feed calc — accepts any subset of material/tool/operation inputs; engine infers the rest"),
  emp_calc_kienzle_specific: z.object({
    material: z.string().min(1).describe("ISO material group or registry key (e.g. 'P', 'D2', '4340')"),
  }).passthrough().describe("Kienzle kc1.1 specific cutting force lookup + size-effect correction"),
  emp_calc_kienzle_forces: z.object({
    material: z.string().min(1),
    ap_mm: z.number().positive(),
    fz_mm: z.number().positive(),
  }).passthrough().describe("Kienzle main + thrust + radial force components (single-edge cut)"),
  emp_calc_kienzle_milling: z.object({
    material: z.string().min(1),
  }).passthrough().describe("Kienzle milling forces over engagement window (Fc/Ft per tooth + spindle power)"),
  emp_calc_cost_breakdown: z.object({}).passthrough()
    .describe("Full cost breakdown — material + labor + machine + tool + overhead → total + per-part"),
  emp_calc_cost_quick: z.object({
    material: z.string().min(1).describe("Material registry key (e.g. 'aluminum_6061', 'D2', '4340')"),
    cycle_time_min: z.number().positive().describe("Per-part cycle time in minutes"),
    quantity: z.number().int().positive().optional().describe("Lot size (default 1)"),
    machine_type: z.string().optional().describe("Machine class for shop-rate lookup (default 'cnc_3axis')"),
  }).passthrough().describe("Quick per-part cost — material + cycle-time + qty → $/part + total"),
  // W2 — document intake (phone photo / email attachment / scan-to-PDF)
  emp_doc_ingest: z.object({}).passthrough()
    .describe("DocumentInbox.ingest — classify (blueprint/PO/cert/quote-req), extract fields, match to PartsLibrary"),
  emp_doc_get: z.object({ id: z.string().min(1) }).passthrough(),
  emp_doc_list: z.object({}).passthrough()
    .describe("DocumentInbox.list — paged inbox of intake items, optional status/type filters"),
  emp_doc_search: z.object({
    query: z.string().min(1),
    limit: z.number().int().positive().optional(),
  }).passthrough(),
  // W3 — print-to-program chain (phone-triggered)
  emp_blueprint_to_quote: z.object({
    analysis: z.object({}).passthrough().describe("BlueprintAnalysis output from ingest/OCR"),
    overrides: z.object({}).passthrough().optional(),
  }).passthrough().describe("Bridge a blueprint analysis into an instant quote (uses BlueprintToQuoteBridge)"),
  emp_blueprint_to_program: z.object({}).passthrough()
    .describe("AutoPrintToProgramBridge.runAutoPipeline — full blueprint → CAD → CAM → G-code"),
  // W4 — DNC / CIMCO wireless export to lathes
  emp_dnc_plan: z.object({}).passthrough()
    .describe("Plan a DNC transfer (protocol/baud/timeout/ETA) — no side effects"),
  emp_dnc_queue: z.object({
    program_id: z.string().min(1),
    program_number: z.string().min(1),
    program_content: z.string().min(1),
    machine_id: z.string().min(1),
    safety_score: z.number().min(0).max(1).describe("S(x) — must be ≥0.990 to pass DNCSend gate"),
  }).passthrough().describe("Safety-gated DNC transfer queue (rejects below S(x)=0.990)"),
  emp_dnc_machines: z.object({}).passthrough().describe("List registered DNC connections"),
  emp_dnc_safety_check: z.object({
    content: z.string().min(1).describe("G-code program text"),
  }).passthrough().describe("Quick safety check before DNC export — returns {safe, score, criticalIssues}"),
  // P0c — auto-attach R1 RoleResolver to EmployeeEngine
  emp_acl_attach_employee_engine: z.object({
    priority_bump_roles: z.array(z.string()).optional(),
    delegate_roles: z.array(z.string()).optional(),
  }).passthrough().describe("Install RoleResolver that resolves via EmployeeEngine.get(id).role"),
  emp_acl_detach: z.object({}).passthrough()
    .describe("Remove the RoleResolver (privileged actions become unchecked again)"),
  // P2 — office-personnel aggregations
  emp_office_who_on_what: z.object({}).passthrough()
    .describe("Every employee with a currently-running task — office fleet view"),
  emp_office_priority_queue: z.object({
    limit: z.number().int().positive().optional().describe("Top-N (default all)"),
  }).passthrough().describe("Hottest jobs first (priority DESC + recency + insertion tiebreak)"),
  emp_office_pending_delegations: z.object({}).passthrough()
    .describe("All un-acknowledged manager-delegations across all employees"),
  emp_office_machine_view: z.object({
    machine_id: z.string().min(1),
  }).passthrough().describe("Tap-machine view: layout entry + active assignments on that machine_id"),
  emp_office_shift_summary: z.object({
    job_id: z.string().optional().describe("Filter to one job; omit for shop-wide"),
  }).passthrough().describe("Labor totals per department (pass-through to ShopFloorCostEngine)"),
  // W5 — phone-walkthrough 3D shop-floor layout
  emp_layout_start_capture: z.object({
    started_by: z.string().min(1).describe("Employee id who is walking the floor"),
  }).passthrough(),
  emp_layout_add_frames: z.object({
    session_id: z.string().min(1),
    n: z.number().int().positive().describe("Number of AR frames just captured on phone"),
  }).passthrough(),
  emp_layout_tag_machine: z.object({
    session_id: z.string().min(1),
    machine_id: z.string().min(1),
    bbox: z.object({
      min: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
      max: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
    }),
    notes: z.string().optional(),
    overwrite: z.boolean().optional().describe("Allow overlap with another machine (audited)"),
  }).passthrough(),
  emp_layout_finish_capture: z.object({ session_id: z.string().min(1) }).passthrough(),
  emp_layout_abandon_capture: z.object({
    session_id: z.string().min(1),
    reason: z.string().min(3).describe("Abandon reason (>=3 chars; hotel-soul audit)"),
  }).passthrough(),
  emp_layout_machine_at_point: z.object({
    point: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
  }).passthrough().describe("Tap-to-locate: which machine occupies this 3D coordinate?"),
  emp_layout_get_machine: z.object({ machine_id: z.string().min(1) }).passthrough(),
  emp_layout_list: z.object({}).passthrough().describe("Full layout — all tagged machines"),
  emp_layout_list_captures: z.object({
    status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
    started_by: z.string().optional(),
  }).passthrough(),
  emp_layout_audit: z.object({
    machine_id: z.string().optional().describe("Omit for global audit chain"),
  }).passthrough(),
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the prism_shop MCP tool on the server.
 * @param server — MCP server instance
 */
export function registerShopDispatcher(server: any): void {
  server.tool(
    "prism_shop",
    [
      "Shop-floor operations dispatcher — 53 actions across 8 engines.",
      "Covers: data completeness scoring (3), real-time cost/labor tracking (7),",
      "shop floor dashboard + OEE + alerts (5), job lifecycle management (7),",
      "rapid quoting from shop floor data (5), production scheduling + capacity (7),",
      "machine overlay profiles for calculator/program-release consumers (12),",
      "and live shop state (jobs, travelers, labor sessions, quantities, approvals) (17).",
      "The operational backbone for JM Die and any PRISM-connected job shop.",
    ].join(" "),
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]).describe(
        "Shop engine action to invoke",
      ),
      params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
    },
    async ({
      action,
      params = {},
    }: {
      action: string;
      params?: Record<string, unknown>;
    }) => {
      // Validate params against the per-action schema before touching any engine.
      const schema = ACTION_SCHEMAS[action as ShopAction];
      if (schema) {
        const parsed = schema.safeParse(params);
        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  error: "invalid_params",
                  action,
                  details: parsed.error.issues.map((i) => ({
                    path: i.path.join(".") || "(root)",
                    message: i.message,
                  })),
                }),
              },
            ],
          };
        }
      }

      let result: unknown;

      switch (action as ShopAction) {
        // ── ShopDataCompletenessEngine ─────────────────────────────────────
        case "completeness_calculate": {
          const { shopDataCompletenessEngine } = await import(
            "../../engines/ShopDataCompletenessEngine.js"
          );
          const p = params as { profileId?: string };
          result = await shopDataCompletenessEngine.calculateCompleteness(p.profileId);
          break;
        }
        case "completeness_domain_gap": {
          const { shopDataCompletenessEngine } = await import(
            "../../engines/ShopDataCompletenessEngine.js"
          );
          const p = params as { domainId: Parameters<typeof shopDataCompletenessEngine.getDomainGaps>[0]; profileId?: string };
          result = await shopDataCompletenessEngine.getDomainGaps(p.domainId, p.profileId);
          break;
        }
        case "completeness_recommendations": {
          const { shopDataCompletenessEngine } = await import(
            "../../engines/ShopDataCompletenessEngine.js"
          );
          const p = params as { profileId?: string };
          result = { ok: true, recommendations: await shopDataCompletenessEngine.getRecommendations(p.profileId) };
          break;
        }

        // ── ShopFloorCostEngine ────────────────────────────────────────────
        case "cost_clock_in": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          result = ShopFloorCostEngine.clockIn(params as any);
          break;
        }
        case "cost_clock_out": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          const p = params as { jobId: string; employeeId: string };
          result = { ok: true, entry: ShopFloorCostEngine.clockOut(p.jobId, p.employeeId) };
          break;
        }
        case "cost_charge_material": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          result = ShopFloorCostEngine.chargeMaterial(params as any);
          break;
        }
        case "cost_job_summary": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          const p = params as { jobId: string };
          result = ShopFloorCostEngine.getJobCostSummary(p.jobId);
          break;
        }
        case "cost_labor_by_dept": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, byDepartment: ShopFloorCostEngine.getLaborByDepartment(p.jobId) };
          break;
        }
        case "cost_active_clocks": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          result = { ok: true, activeClocks: ShopFloorCostEngine.getActiveClocks() };
          break;
        }
        case "cost_set_estimated": {
          const { ShopFloorCostEngine } = await import(
            "../../engines/ShopFloorCostEngine.js"
          );
          const p = params as { jobId: string; labor: number; material: number; overhead: number };
          ShopFloorCostEngine.setEstimatedCosts(p.jobId, { labor: p.labor, material: p.material, overhead: p.overhead });
          result = { ok: true, jobId: p.jobId };
          break;
        }

        // ── ShopFloorDashboardEngine ───────────────────────────────────────
        case "dashboard_get": {
          const { ShopFloorDashboardEngine } = await import(
            "../../engines/ShopFloorDashboardEngine.js"
          );
          result = ShopFloorDashboardEngine.getDashboard(params as any);
          break;
        }
        case "dashboard_machine_status": {
          const { ShopFloorDashboardEngine } = await import(
            "../../engines/ShopFloorDashboardEngine.js"
          );
          const p = params as { machineId: string };
          result = { ok: true, status: ShopFloorDashboardEngine.getMachineStatus(p.machineId) };
          break;
        }
        case "dashboard_alerts": {
          const { ShopFloorDashboardEngine } = await import(
            "../../engines/ShopFloorDashboardEngine.js"
          );
          const p = params as { severity?: Parameters<typeof ShopFloorDashboardEngine.getAlerts>[0] };
          result = { ok: true, alerts: ShopFloorDashboardEngine.getAlerts(p.severity) };
          break;
        }
        case "dashboard_acknowledge_alert": {
          const { ShopFloorDashboardEngine } = await import(
            "../../engines/ShopFloorDashboardEngine.js"
          );
          const p = params as { alertId: string };
          result = { ok: true, alert: ShopFloorDashboardEngine.acknowledgeAlert(p.alertId) };
          break;
        }
        case "dashboard_machine_oee": {
          const { ShopFloorDashboardEngine } = await import(
            "../../engines/ShopFloorDashboardEngine.js"
          );
          const p = params as { machineId: string; hoursBack?: number };
          result = ShopFloorDashboardEngine.calculateMachineOEE(p.machineId, p.hoursBack);
          break;
        }

        // ── ShopFloorJobEngine ─────────────────────────────────────────────
        case "job_create": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          result = ShopFloorJobEngine.createJob(params as any);
          break;
        }
        case "job_get": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, job: ShopFloorJobEngine.getJob(p.jobId) };
          break;
        }
        case "job_list": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          result = { ok: true, jobs: ShopFloorJobEngine.getJobs(params as any) };
          break;
        }
        case "job_update": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          result = { ok: true, job: ShopFloorJobEngine.updateJob(params as any) };
          break;
        }
        case "job_complete_operation": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          result = { ok: true, job: ShopFloorJobEngine.completeOperation(params as any) };
          break;
        }
        case "job_due_soon": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          const p = params as { daysAhead?: number };
          result = { ok: true, jobs: ShopFloorJobEngine.getJobsDueSoon(p.daysAhead) };
          break;
        }
        case "job_completion": {
          const { ShopFloorJobEngine } = await import(
            "../../engines/ShopFloorJobEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, completionPercent: ShopFloorJobEngine.calculateCompletion(p.jobId) };
          break;
        }

        // ── ShopFloorQuoteEngine ───────────────────────────────────────────
        case "quote_generate": {
          const { ShopFloorQuoteEngine } = await import(
            "../../engines/ShopFloorQuoteEngine.js"
          );
          result = ShopFloorQuoteEngine.generateQuote(params as any);
          break;
        }
        case "quote_historical_jobs": {
          const { ShopFloorQuoteEngine } = await import(
            "../../engines/ShopFloorQuoteEngine.js"
          );
          const p = params as { partNumber: string };
          result = { ok: true, jobs: ShopFloorQuoteEngine.getHistoricalJobs(p.partNumber) };
          break;
        }
        case "quote_suggested_price": {
          const { ShopFloorQuoteEngine } = await import(
            "../../engines/ShopFloorQuoteEngine.js"
          );
          const p = params as { partNumber: string; quantity: number };
          result = ShopFloorQuoteEngine.getSuggestedPriceFromHistory(p.partNumber, p.quantity);
          break;
        }
        case "quote_analyze_margin": {
          const { ShopFloorQuoteEngine } = await import(
            "../../engines/ShopFloorQuoteEngine.js"
          );
          const p = params as { quotePrice: number; estimatedCost: number };
          result = ShopFloorQuoteEngine.analyzeMargin(p.quotePrice, p.estimatedCost);
          break;
        }
        case "quote_department_rates": {
          const { ShopFloorQuoteEngine } = await import(
            "../../engines/ShopFloorQuoteEngine.js"
          );
          result = { ok: true, rates: ShopFloorQuoteEngine.getDepartmentRates() };
          break;
        }

        // ── ShopFloorScheduleEngine ────────────────────────────────────────
        case "schedule_operation": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          result = ShopFloorScheduleEngine.scheduleOperation(params as any);
          break;
        }
        case "schedule_machine_capacity": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          const p = params as { machineId: string };
          result = { ok: true, capacity: ShopFloorScheduleEngine.getMachineCapacity(p.machineId) };
          break;
        }
        case "schedule_all_capacity": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          result = { ok: true, capacities: ShopFloorScheduleEngine.getAllCapacity(params as any) };
          break;
        }
        case "schedule_job": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, schedule: ShopFloorScheduleEngine.getJobSchedule(p.jobId) };
          break;
        }
        case "schedule_projected_completion": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          const p = params as { jobId: string };
          result = ShopFloorScheduleEngine.getProjectedCompletion(p.jobId);
          break;
        }
        case "schedule_reschedule": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          const p = params as { operationId: string; newStart: string };
          result = { ok: true, operation: ShopFloorScheduleEngine.rescheduleOperation(p.operationId, p.newStart) };
          break;
        }
        case "schedule_find_slot": {
          const { ShopFloorScheduleEngine } = await import(
            "../../engines/ShopFloorScheduleEngine.js"
          );
          const p = params as { machineType: string; durationMinutes: number };
          result = ShopFloorScheduleEngine.findAvailableSlot(p.machineType, p.durationMinutes);
          break;
        }

        // ── ShopMachineOverlayEngine ───────────────────────────────────────
        case "overlay_create": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          result = shopMachineOverlayEngine.createOverlay(params as any);
          break;
        }
        case "overlay_update": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          result = { ok: true, overlay: shopMachineOverlayEngine.updateOverlay(params as any) };
          break;
        }
        case "overlay_get": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { overlay_id: string };
          result = { ok: true, overlay: shopMachineOverlayEngine.getOverlay(p.overlay_id) };
          break;
        }
        case "overlay_for_machine": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { shopMachineId: string };
          result = { ok: true, overlays: shopMachineOverlayEngine.getOverlaysForMachine(p.shopMachineId) };
          break;
        }
        case "overlay_default": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { shopMachineId: string };
          result = { ok: true, overlay: shopMachineOverlayEngine.getDefaultOverlay(p.shopMachineId) };
          break;
        }
        case "overlay_preset_get": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { presetName: string };
          result = { ok: true, overlay: shopMachineOverlayEngine.getPreset(p.presetName) };
          break;
        }
        case "overlay_preset_list": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          result = { ok: true, presets: shopMachineOverlayEngine.listPresets() };
          break;
        }
        case "overlay_set_default": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { overlay_id: string; userId: string };
          result = { ok: true, set: shopMachineOverlayEngine.setDefault(p.overlay_id, p.userId) };
          break;
        }
        case "overlay_delete": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { overlay_id: string };
          result = { ok: true, deleted: shopMachineOverlayEngine.deleteOverlay(p.overlay_id) };
          break;
        }
        case "overlay_merged_view": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { shopMachineId: string };
          result = shopMachineOverlayEngine.getMergedView(p.shopMachineId);
          break;
        }
        case "overlay_bulk_create": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          const p = params as { userId: string };
          result = { ok: true, overlays: shopMachineOverlayEngine.createOverlaysForShop(p.userId) };
          break;
        }
        case "overlay_stats": {
          const { shopMachineOverlayEngine } = await import(
            "../../engines/ShopMachineOverlayEngine.js"
          );
          result = { ok: true, stats: shopMachineOverlayEngine.getStats() };
          break;
        }

        // ── ShopStateEngine ────────────────────────────────────────────────
        case "state_create_job": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          result = await shopStateEngine.createJob(params as any);
          break;
        }
        case "state_get_job": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { id: string };
          result = { ok: true, job: await shopStateEngine.getJob(p.id) };
          break;
        }
        case "state_list_jobs": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          result = { ok: true, jobs: await shopStateEngine.listJobs(params as any) };
          break;
        }
        case "state_update_job_status": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { jobId: string; newStatus: any; userId: string; notes?: string };
          result = { ok: true, job: await shopStateEngine.updateJobStatus(p.jobId, p.newStatus, p.userId, p.notes) };
          break;
        }
        case "state_update_progress": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { jobId: string; partsComplete: number };
          result = { ok: true, job: await shopStateEngine.updateProgress(p.jobId, p.partsComplete) };
          break;
        }
        case "state_get_traveler": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, traveler: await shopStateEngine.getTraveler(p.jobId) };
          break;
        }
        case "state_start_step": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { stepId: string; operatorId: string };
          result = { ok: true, step: await shopStateEngine.startStep(p.stepId, p.operatorId) };
          break;
        }
        case "state_complete_step": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { stepId: string; operatorId: string };
          result = { ok: true, step: await shopStateEngine.completeStep(p.stepId, p.operatorId) };
          break;
        }
        case "state_start_labor": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          result = await shopStateEngine.startLabor(params as any);
          break;
        }
        case "state_pause_labor": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { sessionId: string; reason: string; reasonCategory: string };
          result = { ok: true, session: await shopStateEngine.pauseLabor(p.sessionId, p.reason, p.reasonCategory) };
          break;
        }
        case "state_resume_labor": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { sessionId: string };
          result = { ok: true, session: await shopStateEngine.resumeLabor(p.sessionId) };
          break;
        }
        case "state_complete_labor": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { sessionId: string; goodParts?: number; scrapCount?: number };
          result = { ok: true, session: await shopStateEngine.completeLabor(p.sessionId, p.goodParts, p.scrapCount) };
          break;
        }
        case "state_active_sessions": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { employeeId: string };
          result = { ok: true, sessions: await shopStateEngine.getActiveSessions(p.employeeId) };
          break;
        }
        case "state_record_quantity": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          result = await shopStateEngine.recordQuantity(params as any);
          break;
        }
        case "state_get_approvals": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, approvals: await shopStateEngine.getApprovals(p.jobId) };
          break;
        }
        case "state_get_attachments": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          const p = params as { jobId: string };
          result = { ok: true, attachments: await shopStateEngine.getAttachments(p.jobId) };
          break;
        }
        case "state_shop_snapshot": {
          const { shopStateEngine } = await import(
            "../../engines/ShopStateEngine.js"
          );
          result = await shopStateEngine.shopSnapshot();
          break;
        }

        // U-BRIDGE-WIRE-MOBILE (slot:mike, 2026-05-23) ─────────────────────
        // Wire 3 unwired Mobile Field engines through prism_shop with
        // read-side methods (no destructive state mutation).
        case "mobile_alarm_decode": {
          const { MobileAlarmEngine } = await import("../../engines/MobileAlarmEngine.js");
          const p = params as { code: string; controller?: string };
          const decoded = MobileAlarmEngine.decodeAlarm({ code: p.code, controller: p.controller });
          if (!decoded) {
            result = { ok: false, error: "alarm_not_found", code: p.code, controller: p.controller ?? null };
          } else {
            result = { ok: true, decoded };
          }
          break;
        }
        case "mobile_timer_active": {
          const { MobileTimerEngine } = await import("../../engines/MobileTimerEngine.js");
          const p = params as { operatorId?: string };
          const sessions = MobileTimerEngine.getActiveTimers(p.operatorId);
          result = { ok: true, count: sessions.length, sessions };
          break;
        }
        case "mobile_cache_stats": {
          const { MobileCacheEngine } = await import("../../engines/MobileCacheEngine.js");
          const stats = MobileCacheEngine.getStats();
          result = { ok: true, stats };
          break;
        }

        // U-BRIDGE-WIRE-CONVEYOR (slot:mike, 2026-05-23) ─────────────────────
        case "conveyor_design_calc": {
          const { conveyorDesignEngine } = await import("../../engines/ConveyorDesignEngine.js");
          type Input = import("../../engines/ConveyorDesignEngine.js").ConveyorDesignInput;
          const calc = conveyorDesignEngine.calculate(params as Input);
          result = { ok: true, calc };
          break;
        }

        // U-EMPLOYEE-MOBILE-PORTAL (slot:hotel, 2026-05-23) ─────────────────
        // Phone-first shop-floor portal: QR scan + per-employee task state
        // machine + employee↔employee messaging + hot-job priority audit +
        // manager task delegation. All routed through EmployeeShopFloorMobileEngine.
        case "emp_scan_in": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { payload: string; employee_id: string; source?: "qr" | "barcode" | "manual" };
          const task = employeeShopFloorMobileEngine.scanInTask(p.payload, p.employee_id, p.source ?? "qr");
          result = { ok: true, task };
          break;
        }
        case "emp_start_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { job_id: string; operation_id: string; task_id: string; employee_id: string };
          const task = employeeShopFloorMobileEngine.startJobTask(p.job_id, p.operation_id, p.task_id, p.employee_id);
          result = { ok: true, task };
          break;
        }
        case "emp_pause_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { task_id: string; employee_id: string; reason: string };
          const task = employeeShopFloorMobileEngine.pauseTask(p.task_id, p.employee_id, p.reason);
          result = { ok: true, task };
          break;
        }
        case "emp_resume_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { task_id: string; employee_id: string };
          const task = employeeShopFloorMobileEngine.resumeTask(p.task_id, p.employee_id);
          result = { ok: true, task };
          break;
        }
        case "emp_stop_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { task_id: string; employee_id: string; completed: boolean; reason?: string };
          const task = employeeShopFloorMobileEngine.stopTask(p.task_id, p.employee_id, { completed: p.completed, reason: p.reason });
          result = { ok: true, task };
          break;
        }
        case "emp_get_active_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { employee_id: string };
          const task = employeeShopFloorMobileEngine.getEmployeeActiveTask(p.employee_id);
          result = { ok: true, task };
          break;
        }
        case "emp_get_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { task_id: string };
          const task = employeeShopFloorMobileEngine.getTask(p.task_id);
          result = { ok: task !== null, task };
          break;
        }
        case "emp_send_message": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { from_employee_id: string; to_employee_id: string; body: string };
          const message = employeeShopFloorMobileEngine.sendMessage(p.from_employee_id, p.to_employee_id, p.body);
          result = { ok: true, message };
          break;
        }
        case "emp_list_messages": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { employee_id: string; unread_only?: boolean };
          const messages = employeeShopFloorMobileEngine.listMessages(p.employee_id, { unreadOnly: p.unread_only });
          result = { ok: true, count: messages.length, messages };
          break;
        }
        case "emp_mark_message_read": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { message_id: string };
          const message = employeeShopFloorMobileEngine.markMessageRead(p.message_id);
          result = { ok: message !== null, message };
          break;
        }
        case "emp_bump_job_priority": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { job_id: string; new_priority: number; admin_id: string; reason: string };
          const entry = employeeShopFloorMobileEngine.bumpJobPriority(p.job_id, p.new_priority, p.admin_id, p.reason);
          result = { ok: true, entry };
          break;
        }
        case "emp_get_job_priority": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { job_id: string };
          const priority = employeeShopFloorMobileEngine.getJobPriority(p.job_id);
          result = { ok: true, job_id: p.job_id, priority };
          break;
        }
        case "emp_get_priority_audit": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { job_id?: string };
          const audit = employeeShopFloorMobileEngine.getJobPriorityAudit(p.job_id);
          result = { ok: true, count: audit.length, audit };
          break;
        }
        case "emp_rank_jobs": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const ranked = employeeShopFloorMobileEngine.rankJobsByPriority();
          result = { ok: true, count: ranked.length, ranked };
          break;
        }
        case "emp_delegate_task": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { task_id: string; from_manager_id: string; to_employee_id: string; reason: string };
          const entry = employeeShopFloorMobileEngine.delegateTask(p.task_id, p.from_manager_id, p.to_employee_id, p.reason);
          result = { ok: true, entry };
          break;
        }
        case "emp_ack_delegation": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { delegation_id: string; employee_id: string };
          const entry = employeeShopFloorMobileEngine.acknowledgeDelegation(p.delegation_id, p.employee_id);
          result = { ok: true, entry };
          break;
        }
        case "emp_list_delegations": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { employee_id: string; unacknowledged_only?: boolean };
          const delegations = employeeShopFloorMobileEngine.listDelegations(p.employee_id, { unacknowledgedOnly: p.unacknowledged_only });
          result = { ok: true, count: delegations.length, delegations };
          break;
        }

        // U-EMPLOYEE-MOBILE-PORTAL W1 (slot:hotel, 2026-05-24) ───────────────
        // Phone-ready calculators — thin wrappers over existing canonical engines.
        // No new engines; just mobile-discoverable action surface.
        case "emp_calc_speed_feed": {
          const { ultimateSpeedFeedEngine } = await import("../../engines/UltimateSpeedFeedEngine.js");
          type Input = import("../../engines/UltimateSpeedFeedEngine.js").UltimateSpeedFeedInput;
          const calc = ultimateSpeedFeedEngine.calculate(params as Input);
          result = { ok: true, calc };
          break;
        }
        case "emp_calc_kienzle_specific": {
          const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
          type Input = import("../../engines/KienzleForceModelEngine.js").SpecificCuttingForceInput;
          const calc = kienzleForceModelEngine.calculateSpecificCuttingForce(params as unknown as Input);
          result = { ok: true, calc };
          break;
        }
        case "emp_calc_kienzle_forces": {
          const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
          type Input = import("../../engines/KienzleForceModelEngine.js").ForceComponentsInput;
          const calc = kienzleForceModelEngine.calculateForceComponents(params as unknown as Input);
          result = { ok: true, calc };
          break;
        }
        case "emp_calc_kienzle_milling": {
          const { kienzleForceModelEngine } = await import("../../engines/KienzleForceModelEngine.js");
          type Input = import("../../engines/KienzleForceModelEngine.js").MillingForceInput;
          const calc = kienzleForceModelEngine.calculateMillingForces(params as unknown as Input);
          result = { ok: true, calc };
          break;
        }
        case "emp_calc_cost_breakdown": {
          const { costEstimationEngine } = await import("../../engines/CostEstimationEngine.js");
          type Input = import("../../engines/CostEstimationEngine.js").CostInput;
          const breakdown = costEstimationEngine.estimate(params as unknown as Input);
          result = { ok: true, breakdown };
          break;
        }
        case "emp_calc_cost_quick": {
          const { costEstimatorEngine } = await import("../../engines/CostEstimatorEngine.js");
          const p = params as { material: string; cycle_time_min: number; quantity?: number; machine_type?: string };
          const estimate = costEstimatorEngine.quickEstimate(p.material, p.cycle_time_min, p.quantity ?? 1, p.machine_type ?? "cnc_3axis");
          result = { ok: true, estimate };
          break;
        }

        // U-EMPLOYEE-MOBILE-PORTAL W2 (slot:hotel, 2026-05-24) ───────────────
        // Document intake from phone camera, email attachment, or scan-to-PDF.
        // DocumentInboxEngine auto-classifies + extracts + matches against PartsLibrary.
        case "emp_doc_ingest": {
          const { documentInboxEngine } = await import("../../engines/DocumentInboxEngine.js");
          type Input = import("../../engines/DocumentInboxEngine.js").IngestInput;
          const ingest = await documentInboxEngine.ingest(params as unknown as Input);
          result = { ok: true, ingest };
          break;
        }
        case "emp_doc_get": {
          const { documentInboxEngine } = await import("../../engines/DocumentInboxEngine.js");
          const p = params as { id: string };
          const item = documentInboxEngine.get(p.id);
          result = { ok: item !== null, item };
          break;
        }
        case "emp_doc_list": {
          const { documentInboxEngine } = await import("../../engines/DocumentInboxEngine.js");
          type Input = import("../../engines/DocumentInboxEngine.js").InboxListInput;
          const list = documentInboxEngine.list(params as Input);
          result = { ok: true, ...list };
          break;
        }
        case "emp_doc_search": {
          const { documentInboxEngine } = await import("../../engines/DocumentInboxEngine.js");
          const p = params as { query: string; limit?: number };
          const items = documentInboxEngine.search(p.query, p.limit ?? 20);
          result = { ok: true, count: items.length, items };
          break;
        }

        // U-EMPLOYEE-MOBILE-PORTAL W3 (slot:hotel, 2026-05-24) ───────────────
        // Print-to-program chain — phone-triggered blueprint → quote → CAD → CAM → G-code.
        case "emp_blueprint_to_quote": {
          const { blueprintToQuoteBridgeEngine } = await import("../../engines/BlueprintToQuoteBridgeEngine.js");
          type Analysis = import("../../engines/BlueprintOCREngine.js").BlueprintAnalysis;
          type Quote = import("../../engines/BlueprintToQuoteBridgeEngine.js").QuoteEstimateInput;
          const p = params as { analysis: Analysis; overrides?: Partial<Quote> };
          // Route through bridgeFromOCR: p.analysis is the OCR-engine BlueprintAnalysis shape,
          // which bridge() cannot consume directly (gdt_frames vs gdt etc.). The adapter
          // normalizes OCR -> bridge-local shape so GD&T + dims reach the quote.
          const bridge = blueprintToQuoteBridgeEngine.bridgeFromOCR(p.analysis, p.overrides);
          result = { ok: true, bridge };
          break;
        }
        case "emp_blueprint_to_program": {
          const { autoPrintToProgramBridgeEngine } = await import("../../engines/AutoPrintToProgramBridgeEngine.js");
          type Input = import("../../engines/AutoPrintToProgramBridgeEngine.js").AutoPipelineInput;
          const pipeline = await autoPrintToProgramBridgeEngine.runAutoPipeline(params as unknown as Input);
          result = { ok: true, pipeline };
          break;
        }

        // U-EMPLOYEE-MOBILE-PORTAL W4 (slot:hotel, 2026-05-24) ───────────────
        // Wireless DNC export to lathes via existing CIMCO-aware DNC engines.
        // DNCSendEngine.queueTransfer is HARD-GATED on S(x)≥0.990 — operator
        // cannot bypass from the phone (hotel-soul invariant: never silent clobber).
        case "emp_dnc_plan": {
          const { dncFileTransferEngine } = await import("../../engines/DNCFileTransferEngine.js");
          type Req = import("../../engines/DNCFileTransferEngine.js").DNCTransferRequest;
          const plan = dncFileTransferEngine.buildTransfer(params as unknown as Req);
          result = { ok: true, plan };
          break;
        }
        case "emp_dnc_queue": {
          const { DNCSendEngine } = await import("../../engines/DNCSendEngine.js");
          const p = params as { program_id: string; program_number: string; program_content: string; machine_id: string; safety_score: number };
          const job = DNCSendEngine.queueTransfer(p.program_id, p.program_number, p.program_content, p.machine_id, p.safety_score);
          result = { ok: true, job };
          break;
        }
        case "emp_dnc_machines": {
          const { DNCSendEngine } = await import("../../engines/DNCSendEngine.js");
          const machines = DNCSendEngine.listConnections();
          result = { ok: true, count: machines.length, machines };
          break;
        }
        case "emp_dnc_safety_check": {
          const { DNCVerifyEngine } = await import("../../engines/DNCVerifyEngine.js");
          const p = params as { content: string };
          const check = DNCVerifyEngine.quickSafetyCheck(p.content);
          result = { ok: true, check };
          break;
        }

        // U-EMP-PER-MACHINE-SF-ADAPTIVE (slot:hotel iter6, 2026-05-25) ─────────
        // Per-machine Bayesian speed/feed learning. Tagged on machine SERIAL
        // (not model) so identical machines develop independent priors.
        case "emp_sf_record_outcome": {
          const { employeePerMachineSFAdaptiveEngine } = await import(
            "../../engines/EmployeePerMachineSFAdaptiveEngine.js"
          );
          result = { ok: true, outcome: employeePerMachineSFAdaptiveEngine.recordOutcome(params as any) };
          break;
        }
        case "emp_sf_adapt_prior": {
          const { employeePerMachineSFAdaptiveEngine } = await import(
            "../../engines/EmployeePerMachineSFAdaptiveEngine.js"
          );
          result = { ok: true, adapted: employeePerMachineSFAdaptiveEngine.adaptPrior(params as any) };
          break;
        }
        case "emp_sf_recommend": {
          const { employeePerMachineSFAdaptiveEngine } = await import(
            "../../engines/EmployeePerMachineSFAdaptiveEngine.js"
          );
          result = { ok: true, recommended: employeePerMachineSFAdaptiveEngine.recommendSpeedsFeeds(params as any) };
          break;
        }
        case "emp_sf_get_prior": {
          const { employeePerMachineSFAdaptiveEngine } = await import(
            "../../engines/EmployeePerMachineSFAdaptiveEngine.js"
          );
          result = { ok: true, prior: employeePerMachineSFAdaptiveEngine.getPrior(params as any) };
          break;
        }
        case "emp_sf_list_outcomes": {
          const { employeePerMachineSFAdaptiveEngine } = await import(
            "../../engines/EmployeePerMachineSFAdaptiveEngine.js"
          );
          const p = params as { machine_serial: string; material: string; tool_type: string };
          result = { ok: true, outcomes: employeePerMachineSFAdaptiveEngine.listOutcomes(p.machine_serial, p.material, p.tool_type) };
          break;
        }

        // U-EMP-INSERT-SIDE-TRACKER (slot:hotel iter7, 2026-05-25) ─────────────
        case "emp_insert_assign": {
          const { employeeInsertSideTrackerEngine } = await import(
            "../../engines/EmployeeInsertSideTrackerEngine.js"
          );
          result = { ok: true, assignment: employeeInsertSideTrackerEngine.assignInsert(params as any) };
          break;
        }
        case "emp_insert_record_wear": {
          const { employeeInsertSideTrackerEngine } = await import(
            "../../engines/EmployeeInsertSideTrackerEngine.js"
          );
          result = { ok: true, assignment: employeeInsertSideTrackerEngine.recordWear(params as any) };
          break;
        }
        case "emp_insert_rotate": {
          const { employeeInsertSideTrackerEngine } = await import(
            "../../engines/EmployeeInsertSideTrackerEngine.js"
          );
          result = { ok: true, assignment: employeeInsertSideTrackerEngine.rotate(params as any) };
          break;
        }
        case "emp_insert_suggest_rotation": {
          const { employeeInsertSideTrackerEngine } = await import(
            "../../engines/EmployeeInsertSideTrackerEngine.js"
          );
          result = { ok: true, suggestion: employeeInsertSideTrackerEngine.suggestRotation(params as any) };
          break;
        }
        case "emp_insert_get_status": {
          const { employeeInsertSideTrackerEngine } = await import(
            "../../engines/EmployeeInsertSideTrackerEngine.js"
          );
          const p = params as { insert_tag: string };
          result = { ok: true, status: employeeInsertSideTrackerEngine.getStatus(p.insert_tag) };
          break;
        }
        case "emp_insert_list_types": {
          const { employeeInsertSideTrackerEngine } = await import(
            "../../engines/EmployeeInsertSideTrackerEngine.js"
          );
          result = { ok: true, types: employeeInsertSideTrackerEngine.listInsertTypes() };
          break;
        }

        // U-EMP-WIZARD-BRIDGE (slot:hotel iter8, 2026-05-25) ─────────────────
        // Ties the 4 wizards (speed-feed, milling, lathe, wire-EDM) to the
        // employee portal with adapted per-machine prior baked in.
        case "emp_wizard_speed_feed": {
          const { employeeWizardBridgeEngine } = await import(
            "../../engines/EmployeeWizardBridgeEngine.js"
          );
          result = { ok: true, recommendation: employeeWizardBridgeEngine.recommendSpeedFeed(params as any) };
          break;
        }
        case "emp_wizard_milling": {
          const { employeeWizardBridgeEngine } = await import(
            "../../engines/EmployeeWizardBridgeEngine.js"
          );
          result = { ok: true, recommendation: employeeWizardBridgeEngine.recommendMilling(params as any) };
          break;
        }
        case "emp_wizard_lathe": {
          const { employeeWizardBridgeEngine } = await import(
            "../../engines/EmployeeWizardBridgeEngine.js"
          );
          result = { ok: true, recommendation: employeeWizardBridgeEngine.recommendLathe(params as any) };
          break;
        }
        case "emp_wizard_wire_edm": {
          const { employeeWizardBridgeEngine } = await import(
            "../../engines/EmployeeWizardBridgeEngine.js"
          );
          result = { ok: true, recommendation: employeeWizardBridgeEngine.recommendWireEDM(params as any) };
          break;
        }

        // U-EMP-PER-OP-PART-TRACKER (slot:hotel iter9, 2026-05-25) ─────────────
        case "emp_op_part_record": {
          const { employeePerOpPartTrackerEngine } = await import(
            "../../engines/EmployeePerOpPartTrackerEngine.js"
          );
          result = { ok: true, record: employeePerOpPartTrackerEngine.recordOpComplete(params as any) };
          break;
        }
        case "emp_op_part_summary": {
          const { employeePerOpPartTrackerEngine } = await import(
            "../../engines/EmployeePerOpPartTrackerEngine.js"
          );
          result = { ok: true, summary: employeePerOpPartTrackerEngine.getOpSummary(params as any) };
          break;
        }
        case "emp_op_part_job_totals": {
          const { employeePerOpPartTrackerEngine } = await import(
            "../../engines/EmployeePerOpPartTrackerEngine.js"
          );
          const p = params as { job_id: string };
          result = { ok: true, totals: employeePerOpPartTrackerEngine.getJobOpTotals(p.job_id) };
          break;
        }
        case "emp_op_part_daily_ship": {
          const { employeePerOpPartTrackerEngine } = await import(
            "../../engines/EmployeePerOpPartTrackerEngine.js"
          );
          result = { ok: true, summary: employeePerOpPartTrackerEngine.getEmployeeDailyShip(params as any) };
          break;
        }
        case "emp_op_part_adjust": {
          const { employeePerOpPartTrackerEngine } = await import(
            "../../engines/EmployeePerOpPartTrackerEngine.js"
          );
          result = { ok: true, adjustment: employeePerOpPartTrackerEngine.adjustOpCount(params as any) };
          break;
        }
        case "emp_op_part_adjustments": {
          const { employeePerOpPartTrackerEngine } = await import(
            "../../engines/EmployeePerOpPartTrackerEngine.js"
          );
          result = { ok: true, adjustments: employeePerOpPartTrackerEngine.listAdjustments(params as any) };
          break;
        }

        // U-EMP-MULTI-JOB-CONCURRENCY (slot:hotel iter10, 2026-05-25) ─────────
        case "emp_concurrent_check_in": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, job: employeeMultiJobConcurrencyEngine.checkInToJob(params as any) };
          break;
        }
        case "emp_concurrent_pause": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, job: employeeMultiJobConcurrencyEngine.pauseJob(params as any) };
          break;
        }
        case "emp_concurrent_resume": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, job: employeeMultiJobConcurrencyEngine.resumeJob(params as any) };
          break;
        }
        case "emp_concurrent_pause_all": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, jobs: employeeMultiJobConcurrencyEngine.pauseAll(params as any) };
          break;
        }
        case "emp_concurrent_quick_switch": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, switched: employeeMultiJobConcurrencyEngine.quickSwitch(params as any) };
          break;
        }
        case "emp_concurrent_list": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, jobs: employeeMultiJobConcurrencyEngine.listConcurrent(params as any) };
          break;
        }
        case "emp_concurrent_quick_menu": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, menu: employeeMultiJobConcurrencyEngine.quickMenu(params as any) };
          break;
        }
        case "emp_concurrent_tick": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, allocation: employeeMultiJobConcurrencyEngine.tickConcurrentTime(params as any) };
          break;
        }
        case "emp_concurrent_set_strategy": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, strategy: employeeMultiJobConcurrencyEngine.setStrategy(params as any) };
          break;
        }
        case "emp_concurrent_set_weight": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, job: employeeMultiJobConcurrencyEngine.setAttentionWeight(params as any) };
          break;
        }
        case "emp_concurrent_adjust_parts": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, adjustment: employeeMultiJobConcurrencyEngine.adjustPartCount(params as any) };
          break;
        }
        case "emp_concurrent_adjust_time": {
          const { employeeMultiJobConcurrencyEngine } = await import(
            "../../engines/EmployeeMultiJobConcurrencyEngine.js"
          );
          result = { ok: true, adjustment: employeeMultiJobConcurrencyEngine.adjustClockedTime(params as any) };
          break;
        }

        // P0c — RoleResolver auto-attach to EmployeeEngine (slot:hotel, 2026-05-24)
        case "emp_acl_attach_employee_engine": {
          const [{ employeeShopFloorMobileEngine }, { employeeEngine }] = await Promise.all([
            import("../../engines/EmployeeShopFloorMobileEngine.js"),
            import("../../engines/EmployeeEngine.js"),
          ]);
          const p = params as { priority_bump_roles?: string[]; delegate_roles?: string[] };
          employeeShopFloorMobileEngine.configureRoleACL({
            resolver: (id: string) => {
              const emp = employeeEngine.get(id);
              return emp ? emp.role : null;
            },
            priorityBumpRoles: p.priority_bump_roles,
            delegateRoles: p.delegate_roles,
          });
          result = { ok: true, attached: true, source: "EmployeeEngine.get(id).role" };
          break;
        }
        case "emp_acl_detach": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          employeeShopFloorMobileEngine.configureRoleACL({ resolver: null });
          result = { ok: true, attached: false };
          break;
        }

        // P2 — office-personnel aggregations (slot:hotel, 2026-05-24)
        case "emp_office_who_on_what": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const assignments = employeeShopFloorMobileEngine.listActiveAssignments();
          result = { ok: true, count: assignments.length, assignments };
          break;
        }
        case "emp_office_priority_queue": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const p = params as { limit?: number };
          const ranked = employeeShopFloorMobileEngine.rankJobsByPriority();
          const sliced = p.limit ? ranked.slice(0, p.limit) : ranked;
          result = { ok: true, count: sliced.length, ranked: sliced };
          break;
        }
        case "emp_office_pending_delegations": {
          const { employeeShopFloorMobileEngine } = await import("../../engines/EmployeeShopFloorMobileEngine.js");
          const delegations = employeeShopFloorMobileEngine.listAllDelegations({ unacknowledgedOnly: true });
          result = { ok: true, count: delegations.length, delegations };
          break;
        }
        case "emp_office_machine_view": {
          const [{ shopFloorLayoutEngine }, { employeeShopFloorMobileEngine }] = await Promise.all([
            import("../../engines/ShopFloorLayoutEngine.js"),
            import("../../engines/EmployeeShopFloorMobileEngine.js"),
          ]);
          const p = params as { machine_id: string };
          const layout = shopFloorLayoutEngine.getMachineLayout(p.machine_id);
          // Active tasks running on this machine (operation_id startsWith machine_id is
          // a soft join — real production would key via JobLifecycleEngine.machineForOp).
          const assignments = employeeShopFloorMobileEngine.listActiveAssignments()
            .filter(a => a.active_task.operation_id === p.machine_id
              || a.active_task.job_id === p.machine_id
              || a.active_task.operation_id.startsWith(p.machine_id));
          result = { ok: layout !== null, layout, active_assignments: assignments };
          break;
        }
        case "emp_office_shift_summary": {
          const { ShopFloorCostEngine } = await import("../../engines/ShopFloorCostEngine.js");
          const p = params as { job_id?: string };
          // getLaborByDepartment is a static method requiring a jobId; an empty
          // string yields {} (no labor recorded), preserving the prior no-job_id
          // "empty summary" behavior without calling a non-existent instance method.
          const labor = ShopFloorCostEngine.getLaborByDepartment(p.job_id ?? "");
          result = { ok: true, labor };
          break;
        }

        // U-EMPLOYEE-MOBILE-PORTAL W5 (slot:hotel, 2026-05-24) ───────────────
        // Phone-walkthrough 3D shop-floor layout — operator AR walk → tap a
        // machine in 3D view to see its identity + current job + schedule.
        case "emp_layout_start_capture": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const p = params as { started_by: string };
          const session = shopFloorLayoutEngine.startCapture(p.started_by);
          result = { ok: true, session };
          break;
        }
        case "emp_layout_add_frames": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const p = params as { session_id: string; n: number };
          const session = shopFloorLayoutEngine.addFrames(p.session_id, p.n);
          result = { ok: true, session };
          break;
        }
        case "emp_layout_tag_machine": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          type Bbox = import("../../engines/ShopFloorLayoutEngine.js").BoundingBox3D;
          const p = params as { session_id: string; machine_id: string; bbox: Bbox; notes?: string; overwrite?: boolean };
          const entry = shopFloorLayoutEngine.tagMachine(p.session_id, p.machine_id, p.bbox, p.notes, { overwrite: p.overwrite });
          result = { ok: true, entry };
          break;
        }
        case "emp_layout_finish_capture": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const p = params as { session_id: string };
          const session = shopFloorLayoutEngine.finishCapture(p.session_id);
          result = { ok: true, session };
          break;
        }
        case "emp_layout_abandon_capture": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const p = params as { session_id: string; reason: string };
          const session = shopFloorLayoutEngine.abandonCapture(p.session_id, p.reason);
          result = { ok: true, session };
          break;
        }
        case "emp_layout_machine_at_point": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          type Pt = import("../../engines/ShopFloorLayoutEngine.js").Point3D;
          const p = params as { point: Pt };
          const entry = shopFloorLayoutEngine.getMachineAtPoint(p.point);
          result = { ok: entry !== null, entry };
          break;
        }
        case "emp_layout_get_machine": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const p = params as { machine_id: string };
          const entry = shopFloorLayoutEngine.getMachineLayout(p.machine_id);
          result = { ok: entry !== null, entry };
          break;
        }
        case "emp_layout_list": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const entries = shopFloorLayoutEngine.listLayout();
          result = { ok: true, count: entries.length, entries };
          break;
        }
        case "emp_layout_list_captures": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          type Status = import("../../engines/ShopFloorLayoutEngine.js").CaptureStatus;
          const p = params as { status?: Status; started_by?: string };
          const captures = shopFloorLayoutEngine.listCaptures({ status: p.status, startedBy: p.started_by });
          result = { ok: true, count: captures.length, captures };
          break;
        }
        case "emp_layout_audit": {
          const { shopFloorLayoutEngine } = await import("../../engines/ShopFloorLayoutEngine.js");
          const p = params as { machine_id?: string };
          const audit = shopFloorLayoutEngine.getAudit(p.machine_id);
          result = { ok: true, count: audit.length, audit };
          break;
        }

        // ── PSN Self-Improving Loop / ShopProfileAdapter (LOOP_ACTIONS) ────
        // U-LOOP-WIRE (slot:india, /goal-psn-self-improving iter5, 2026-05-25)
        case "loop_shop_summary": {
          const { psnSelfImprovingLoopEngine } = await import(
            "../../engines/PSNSelfImprovingLoopEngine.js"
          );
          const { shopProfileAdapterEngine } = await import(
            "../../engines/ShopProfileAdapterEngine.js"
          );
          const p = params as { shop_id?: string };
          const shop_id = typeof p.shop_id === "string" && p.shop_id.length > 0 ? p.shop_id : "jm-die";
          const deltas = psnSelfImprovingLoopEngine.getShopDeltas(shop_id);
          const summary = shopProfileAdapterEngine.summarize(shop_id);
          result = { ok: true, shop_id, has_history: deltas !== null, summary };
          break;
        }
        case "loop_shop_deltas": {
          const { shopProfileAdapterEngine } = await import(
            "../../engines/ShopProfileAdapterEngine.js"
          );
          const p = params as { shop_id?: string };
          const shop_id = typeof p.shop_id === "string" && p.shop_id.length > 0 ? p.shop_id : "jm-die";
          const deltas = shopProfileAdapterEngine.getDeltas(shop_id);
          result = { ok: true, shop_id, deltas };
          break;
        }
        case "loop_shop_reset": {
          const { shopProfileAdapterEngine } = await import(
            "../../engines/ShopProfileAdapterEngine.js"
          );
          const p = params as { shop_id?: string };
          const shop_id = typeof p.shop_id === "string" && p.shop_id.length > 0 ? p.shop_id : null;
          if (shop_id === null) {
            result = { ok: false, error: "shop_id is required for loop_shop_reset" };
          } else {
            shopProfileAdapterEngine.reset(shop_id);
            result = { ok: true, shop_id, reset: true };
          }
          break;
        }

        default: {
          // TypeScript exhaustiveness: unreachable at runtime because z.enum
          // guard above rejects unknown actions before the switch is reached.
          result = { ok: false, error: "unknown_action", action };
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );
}
