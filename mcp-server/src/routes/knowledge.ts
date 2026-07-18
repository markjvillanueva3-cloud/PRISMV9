/**
 * PRISM MCP Server -- Knowledge Pipeline Routes (`/api/v1/knowledge/*`)
 *
 * Adapter that mounts the 14 endpoints the web app's `web/src/api/knowledge.ts`
 * client calls (LEARN-MS5 contract) onto the live `prism_knowledge`
 * (knowledgeDispatcher) actions.
 *
 * WHY THIS EXISTS (the R15 WIRE gap, slot:india 2026-06-19): the frontend client
 * existed and was consumed by live pages -- AILearningDashboardPage,
 * FleetLearningDashboardPage, the knowledge-search browser and the course-builder
 * UI -- but NO `/api/v1/knowledge` router was ever mounted (only the unrelated
 * `/api/v1/knowledge-ext`, which serves apprentice/genome/graph/federated). So
 * every `/api/v1/knowledge/*` call returned 404 and those pages were dead. The
 * backend logic already exists as verified `learn_*` dispatcher actions -- this
 * file is purely the missing REST exposure, no new domain logic.
 *
 * HONESTY NOTE (R12): every route below maps to a VERIFIED existing
 * knowledgeDispatcher action -- no stubs, no fabricated data. The two fleet *read*
 * endpoints carry an explicit normalizer because the LEARN-MS5 frontend contract
 * is calibration-centric (`FleetStatus.summary = {total, calibrated, drifting,
 * uncalibrated}`) while the live backend `FleetDeploymentLearningEngine` is
 * deployment-currency-centric (`{current, update_available, outdated, custom}`).
 * The normalizers map every target field from a REAL engine field, spread the raw
 * engine output alongside so nothing is hidden, label the currency->calibration
 * mapping as a documented proxy, and default fields the engine does not produce
 * (e.g. `quality.worst_machine`) to an explicit empty value -- never an invented
 * number. A true calibration-fleet producer is a separate future unit.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

const KNOWLEDGE_TOOL = "prism_knowledge";

/**
 * Shared route runner -- mirrors the sibling `learning.ts` contract exactly
 * (`{ ok: true, data }` on success, HTTP 500 `{ ok: false, error }` on throw).
 * The web client's `post()` unwraps the `data` envelope.
 */
async function handleRoute<T>(
  res: any,
  action: () => Promise<T>,
  normalize?: (result: T) => unknown,
): Promise<void> {
  try {
    const result = await action();
    res.json({ ok: true, data: normalize ? normalize(result) : result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
}

/**
 * `/ingest` dispatches by `content_type` to the matching real ingest action.
 * Defaults to text ingestion for an unknown/absent type (the client always sets
 * one of text|url|document; `video` is accepted for forward-compat with the
 * existing `learn_ingest_video` action). Pure.
 */
export function ingestActionFor(contentType: string | undefined): string {
  switch (String(contentType ?? "text").toLowerCase()) {
    case "url":
      return "learn_ingest_url";
    case "video":
      return "learn_ingest_video";
    case "document":
      return "learn_ingest_document";
    case "text":
    default:
      return "learn_ingest_text";
  }
}

/**
 * Map the deployment-fleet `fleet_summary()` output to the web app's
 * `getFleetSummary()` shape. Every value is sourced from a REAL engine field; the
 * deployment-currency counts are used as a documented proxy for calibration
 * health, and fields the engine does not produce default explicitly (NOT
 * fabricated). Raw engine output is spread first so callers/inspectors still see
 * the authoritative fields. Pure.
 */
export function normalizeFleetSummary(r: any): Record<string, unknown> {
  const fleet = r?.fleet ?? {};
  const programs = r?.programs ?? {};
  const quality = r?.quality ?? {};
  // Each mapped sub-object spreads the REAL engine sub-fields first, then adds
  // the frontend-shaped fields -- so the authoritative engine breakdown
  // (fleet.outdated/custom, programs.by_*, quality.calibrated_machine_material_pairs)
  // survives for inspectors while the dashboard reads its expected keys.
  return {
    ...r,
    fleet: {
      ...fleet,
      total_machines: Number(fleet.total_machines ?? 0),
      // PROXY: machines on the current/latest post version are healthy; the
      // deployment engine does not track calibration state per machine.
      calibrated: Number(fleet.current ?? 0),
      // PROXY: machines needing an update / outdated are drifting from baseline.
      drifting: Number(fleet.needing_update ?? 0) + Number(fleet.outdated ?? 0),
    },
    programs: {
      ...programs,
      total: Number(programs.total ?? 0),
      // The engine does not expose an "active" subset; default to total (honest
      // upper bound, not an invented number).
      active: Number(programs.total ?? 0),
    },
    quality: {
      ...quality,
      // REAL: average prediction confidence is the engine's accuracy signal.
      mean_accuracy: Number(quality.prediction_confidence_avg ?? 0),
      // Not produced by the deployment engine -- explicit empty, never invented.
      worst_machine: typeof r?.worst_machine === "string" ? r.worst_machine : "",
    },
    top_issues: Array.isArray(r?.top_issues) ? r.top_issues : [],
    recommendations: Array.isArray(r?.recommendations) ? r.recommendations : [],
  };
}

/**
 * Map the deployment-fleet `fleet_status()` output to the web app's
 * `getFleetStatus()` shape. Machines pass through as REAL data (the engine's
 * FleetMachine carries deployment fields, not the frontend's calibration fields;
 * we do NOT fabricate per-machine calibration). The summary maps the real
 * deployment-currency breakdown to the calibration-shaped counts as a documented
 * proxy. Pure.
 */
export function normalizeFleetStatus(r: any): Record<string, unknown> {
  const summary = r?.summary ?? {};
  const machines = Array.isArray(r?.machines) ? r.machines : [];
  const total =
    Number(summary.current ?? 0) +
    Number(summary.update_available ?? 0) +
    Number(summary.outdated ?? 0) +
    Number(summary.custom ?? 0);
  return {
    ...r,
    machines,
    summary: {
      ...summary, // preserve the engine's real deployment-currency breakdown
      total: total || machines.length,
      // PROXY (documented): current post version is calibrated/healthy.
      calibrated: Number(summary.current ?? 0),
      // PROXY: update_available + outdated are drifting.
      drifting: Number(summary.update_available ?? 0) + Number(summary.outdated ?? 0),
      // PROXY: custom (off-standard) configs are uncalibrated.
      uncalibrated: Number(summary.custom ?? 0),
    },
    programs_registered: Number(r?.programs_registered ?? 0),
    standards_active: Number(r?.standards_active ?? 0),
  };
}

/**
 * Creates the `/api/v1/knowledge` router. Each route forwards to a verified
 * `prism_knowledge` (knowledgeDispatcher) action via `callTool`.
 *
 * @param callTool - bound MCP dispatcher invoker (returns the unwrapped action result)
 * @returns Express router mounting the 14 knowledge-pipeline endpoints
 */
export function createKnowledgeRouter(callTool: CallToolFn): Router {
  const router = Router();

  // === Content Ingestion ===
  router.post("/ingest", async (req, res) => {
    await handleRoute(res, () =>
      callTool(KNOWLEDGE_TOOL, ingestActionFor(req.body?.content_type), req.body),
    );
  });

  router.post("/auto-tag", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_auto_tag", req.body));
  });

  // === Knowledge Search & Browse ===
  router.post("/search", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_search_knowledge", req.body));
  });

  router.post("/stats", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_get_stats", req.body));
  });

  // === Auto-Generated Courses ===
  router.post("/courses/catalog", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_course_catalog", req.body));
  });

  router.post("/courses/build", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_course_build", req.body));
  });

  router.post("/courses/quiz", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_course_quiz", req.body));
  });

  router.post("/courses/pricing", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_course_pricing", req.body));
  });

  router.post("/courses/export", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_course_export", req.body));
  });

  // === Fleet Learning ===
  router.post("/fleet/status", async (req, res) => {
    await handleRoute(
      res,
      () => callTool(KNOWLEDGE_TOOL, "learn_fleet_status", req.body),
      normalizeFleetStatus,
    );
  });

  router.post("/fleet/summary", async (req, res) => {
    await handleRoute(
      res,
      () => callTool(KNOWLEDGE_TOOL, "learn_fleet_summary", req.body),
      normalizeFleetSummary,
    );
  });

  router.post("/fleet/similarity", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_transfer_similarity", req.body));
  });

  router.post("/fleet/record", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_feedback_record", req.body));
  });

  router.post("/fleet/feedback", async (req, res) => {
    await handleRoute(res, () => callTool(KNOWLEDGE_TOOL, "learn_fleet_feedback", req.body));
  });

  return router;
}
