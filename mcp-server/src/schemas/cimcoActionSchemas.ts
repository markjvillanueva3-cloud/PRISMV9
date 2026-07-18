/**
 * Zod Action Schemas — cimcoDispatcher (prism_cimco)
 * ==============================================================
 * 6 actions wiring CimcoVerificationBridgeEngine (CIMCO Edit 2026 + Machine
 * Simulation — PRISM's fleet program/post verification + simulation oracle):
 *   - cimco_inventory_summary    — counts + units-unresolved data-quality headline
 *   - cimco_machine_query        — query the 86 .mcfg machine defs (units-first)
 *   - cimco_post_query           — query .js posts (authorable) + .eRPost controllers (binary)
 *   - cimco_tool_query           — query .tmlib cutter libraries
 *   - cimco_sim_report_evaluate  — Machine-Sim report → pass/fail gate (canonical: cimco-control-map.mjs)
 *   - cimco_control_channels     — how PRISM drives CIMCO (API/CLI before UI)
 *
 * Authored 2026-06-02 — CIMCO-INTEGRATION-MS0 U-CIMCO-BRIDGE-ENGINE (slot:echo).
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// INVENTORY QUERIES
// ============================================================================

/** cimco_inventory_summary — no params; returns counts + units-unresolved headline. */
const cimco_inventory_summary = z.object({}).passthrough();

/** cimco_machine_query — filter the 86 verified .mcfg machine defs. */
const cimco_machine_query = z
  .object({
    name: z.string().describe("substring match on machine display name or .mcfg filename").optional(),
    orientation: z
      .enum(["Lathe", "Horizontal", "Vertical", "unknown"])
      .describe("exact CIMCO machine orientation filter")
      .optional(),
    units_resolved_only: z
      .boolean()
      .describe("if true, exclude machines whose .mcfg omits Header.Unit (units-first guard)")
      .optional(),
    limit: z.number().int().positive().max(500).describe("max rows to return (default 100)").optional(),
  })
  .passthrough();

/** cimco_post_query — query readable .js posts and/or compiled .eRPost controllers. */
const cimco_post_query = z
  .object({
    kind: z.enum(["js", "erpost"]).describe("restrict to readable .js posts or binary .eRPost controllers").optional(),
    type: z.string().describe("post type substring (e.g. MILL, TURN → POST_TYPE_MILL/TURN)").optional(),
    vendor: z.string().describe("controller vendor substring (.eRPost only)").optional(),
    name: z.string().describe("substring match on post title/name or filename").optional(),
    limit: z.number().int().positive().max(500).describe("max rows per kind to return (default 100)").optional(),
  })
  .passthrough();

/** cimco_tool_query — query .tmlib cutter libraries (units-first). */
const cimco_tool_query = z
  .object({
    unit_system: z.enum(["Imperial", "Metric"]).describe("exact cutter unit-system filter (units-first)").optional(),
    type: z.string().describe("cutter type substring (e.g. EndMill, CommonDrill)").optional(),
    library: z.string().describe("substring match on .tmlib library filename").optional(),
    limit: z.number().int().positive().max(2000).describe("max cutters to return (default 100)").optional(),
  })
  .passthrough();

// ============================================================================
// SIMULATION-REPORT VERIFICATION GATE
// ============================================================================

/** One Machine-Simulation report row (LINE/TYPE/DESCRIPTION/ACTION). */
const _simRow = z
  .object({
    line: z.union([z.number(), z.string()]).nullable().describe("NC line number (bare or N-prefixed)").optional(),
    type: z.string().nullable().describe("row type — collision/limit/over-travel/warning/error").optional(),
    description: z.string().nullable().describe("human-readable description").optional(),
    action: z.string().nullable().describe("suggested action").optional(),
    category: z.string().nullable().describe("pre-classified category (error|warning|collision|limit)").optional(),
  })
  .passthrough();

/**
 * cimco_sim_report_evaluate — evaluate a CIMCO Machine-Simulation report.
 * Accepts row array, pipe/tab/2-space-delimited line strings, a grouped
 * {errors,warnings,collisions,limits} object, or null (clean run).
 */
const cimco_sim_report_evaluate = z
  .object({
    report: z
      .union([z.array(z.union([z.string(), _simRow, z.null()])), z.record(z.string(), z.unknown())])
      .nullable()
      .describe("simulation report rows / grouped object / null (empty = clean run)"),
  })
  .passthrough();

// ============================================================================
// CONTROL CHANNELS
// ============================================================================

/** cimco_control_channels — no params; returns the ranked API/CLI/UIA channel doctrine. */
const cimco_control_channels = z.object({}).passthrough();

// ============================================================================
// BLIND-NAVIGATION MAP (511 surfaces from the 154 decompiled CHM pages)
// ============================================================================

/** cimco_nav_query — filter the navigable-surface map (every menu/dialog/tab/setup screen). */
const cimco_nav_query = z
  .object({
    channel: z
      .enum(["file", "sql", "dnc-api", "cli", "uia"])
      .describe("automation channel filter — how PRISM drives the surface blind (file>sql/dnc-api>cli>uia)")
      .optional(),
    area: z.string().describe("substring match on the menu/tab/dialog area (e.g. 'Backplot', 'File Compare')").optional(),
    proof_relevant: z.boolean().describe("if true, only surfaces relevant to proving a post (open/load/sim/report/compare/ship)").optional(),
    text: z.string().describe("free-text match over surface id/label/action/area/path").optional(),
    limit: z.number().int().positive().max(600).describe("max surfaces to return (default 100)").optional(),
  })
  .passthrough();

/** cimco_nav_readiness — no params; blind-nav readiness rollup + critical-path procedures + gaps. */
const cimco_nav_readiness = z.object({}).passthrough();

// ============================================================================
// LAUNCH SURFACE (how a blind agent starts/drives the local install — U-CIMCO-LAUNCH-PROBE)
// ============================================================================

/** cimco_launch_surface — no params; exe inventory + verified/needs-live launch patterns + External-Commands hook. */
const cimco_launch_surface = z.object({}).passthrough();

// ============================================================================
// DIALECT G/M ALLOWLISTS (static proving — mined from JM goldens, U-CIMCO-DIALECT-ALLOWLISTS)
// ============================================================================

/** cimco_dialect_allowlist — no params; per-dialect observed-G/M-code vocabulary summary. */
const cimco_dialect_allowlist = z.object({}).passthrough();

/** cimco_dialect_lint — lint a candidate post's G/M vocabulary vs the JM-golden allowlist for its dialect. */
const cimco_dialect_lint = z
  .object({
    nc_text: z.string().min(1).describe("the candidate NC program text to lint (required)"),
    family: z
      .enum(["okuma-osp", "mastercam", "hurco", "mitsubishi-edm", "prism"])
      .describe("dialect family override; if omitted, auto-detected from the program header")
      .optional(),
  })
  .passthrough();

// ============================================================================
// LIVE-RUN CLEARANCE GATE (U-CIMCO-PROMOTION-3OF3-GATE; extended to 5 gates by U-CIMCO-SIM-6)
// ============================================================================

/**
 * cimco_live_run_clearance — fail-safe go/no-go composing 5 independent gates:
 * machine BOUND (U-CIMCO-SIM-4) + machine units DECLARED + kinematics VERIFIED +
 * sim clearedForLiveRun + run COMPLETE (U-CIMCO-SIM-5). bind/run-complete are
 * additive (absent → not gated, back-compat). Never auto-approves.
 */
const cimco_live_run_clearance = z
  .object({
    machine: z
      .object({
        unit: z.string().nullable().describe("machine units (mm|inch|unknown)").optional(),
        unitsResolved: z.boolean().describe("true ONLY when Header.Unit was declared").optional(),
        unitSource: z.enum(["declared", "inferred-magnitude", "unknown"]).describe("units provenance").optional(),
        unitsInferred: z.boolean().optional(),
        inferenceConfidence: z.string().nullable().optional(),
        displayName: z.string().nullable().optional(),
        file: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .describe("the resolved CIMCO sim machine (a row from cimco_machine_query / jm-fleet-sim-map)")
      .optional(),
    sim_verdict: z
      .object({
        pass: z.boolean().optional(),
        clearedForLiveRun: z.boolean().optional(),
        collisionCheckConfirmed: z.boolean().optional(),
        summary: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .describe("the Machine-Sim verdict from cimco_sim_report_evaluate")
      .optional(),
    kinematics_verified: z
      .boolean()
      .describe("operator/automated confirmation the .mcfg kinematics (travels/axis/centre-of-rotation) match the real machine")
      .optional(),
    program_units: z.enum(["inch", "mm"]).describe("the NC program's declared units (G20/G21); JM convention = inch").optional(),
    bind_verdict: z
      .object({
        bound: z.boolean().optional(),
        blocker: z.string().nullable().optional(),
        machineId: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .describe("U-CIMCO-SIM-4 machine+controller+units bind verdict (cimco-bind-gate / sim driver verify) — the loaded CIMCO machine matches the post")
      .optional(),
    run_complete: z
      .union([
        z.boolean(),
        z.object({ runComplete: z.boolean().optional(), blockers: z.array(z.string()).optional() }).passthrough(),
      ])
      .nullable()
      .describe("U-CIMCO-SIM-5 run-completeness (cimco-completion-gate) — the sim observably finished the whole program with no blocking modal")
      .optional(),
  })
  .passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const CIMCO_ACTION_SCHEMAS: ActionSchemaMap = {
  cimco_inventory_summary,
  cimco_machine_query,
  cimco_post_query,
  cimco_tool_query,
  cimco_sim_report_evaluate,
  cimco_control_channels,
  cimco_nav_query,
  cimco_nav_readiness,
  cimco_launch_surface,
  cimco_dialect_allowlist,
  cimco_dialect_lint,
  cimco_live_run_clearance, // U-CIMCO-SIM-6: register the previously-defined-but-unregistered clearance schema
};
