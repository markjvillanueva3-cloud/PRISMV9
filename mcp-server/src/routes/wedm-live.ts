/**
 * PRISM MCP Server -- WEDM live-status routes (U-WEDM-LIVE-ROUTES, slot:quebec).
 *
 * POST /api/v1/wedm-live/{safety-envelope,autonomy,rul,maintenance}
 *
 * The server side of the 4 status calls web/src/api/client.ts (U-P2PFS32/33) has posted
 * since ship -- NO router existed, so every call 404'd and WireEdmWizardPage's catch{}
 * swallowed it: 4 permanently-"loading" indicator panels (the 2026-07-01 all-chat gap
 * audit's WEDM finding; zero fleet commits had touched it as of the Jul-1->5 delta recon).
 *
 * SOURCING (each panel from the engine that actually owns the truth):
 *  - safety-envelope: wedmSafetyEnvelopeEngine.check() DIRECT import -- the engine is
 *    WIRE-EXEMPT ("consumed via the wedm-erp route..., not dispatched directly"); this
 *    follows the wedm-erp.ts:61 precedent. An empty reading yields safe/[] -- that is the
 *    ENGINE's own semantics (check() iterates only present values); we do not fabricate
 *    telemetry values.
 *  - autonomy: callTool prism_edm wedm_autonomy_gate_status (AutonomyStatusSnapshot).
 *    prism_edm returns content[] whose payload passed slimResponse (strips nulls + EMPTY
 *    arrays recursively, edmDispatcher.ts:3412) -- adapters re-default stripped fields.
 *    `confidence` has NO honest source field -> intentionally OMITTED (FE renders "--").
 *  - rul + maintenance: the dispatcher actions (wedm_rul_estimate / wedm_maintenance_plan)
 *    REQUIRE a DegradationSnapshot / RULReport param the wizard does not have -- calling
 *    them bare throws. So this route composes the real chain the engines document:
 *    wedmDegradationModelEngine.snapshot() -> wedmRULEngine.estimateFromRates(snap, {})
 *    -> wedmMaintenanceSchedulerEngine.plan(report). rates={} is honest "no live usage
 *    telemetry yet": components report rul_hours=Infinity ("not aging") -> FE shows the
 *    tracked components + health with hours "--" until a usage feed lands. The dispatcher
 *    actions remain for snapshot-bearing callers (no duplication).
 *
 * RESPONSE CONTRACT: the FE calls via requestData<T>() and reads `.data`, so every
 * success is { ok: true, data: <FE shape> }; failures are 502 with a clean message.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken } from "../middleware/auth.js";
import { isDispatcherError, dispatcherErrorMessage } from "./dispatcher-envelope.js";
import { wedmSafetyEnvelopeEngine, type EnvelopeReading } from "../engines/WEDMSafetyEnvelopeEngine.js";
import { wedmDegradationModelEngine, type DegradationComponent } from "../engines/WEDMDegradationModelEngine.js";
import { wedmRULEngine } from "../engines/WEDMRULEngine.js";
import { wedmMaintenanceSchedulerEngine } from "../engines/WEDMMaintenanceSchedulerEngine.js";

const COMPONENT_LABELS: Record<DegradationComponent, string> = {
  guide_wear: "Wire Guides",
  wire_erosion: "Wire Erosion",
  filter_capacity: "Filter Capacity",
  filter_clogging: "Filter Clogging",
  wire_fatigue: "Wire Fatigue",
};

/** RULBand -> FE maintenance item type. imminent = past/at the service window. */
const BAND_TO_TYPE: Record<string, "overdue" | "predictive"> = {
  imminent: "overdue",
  soon: "predictive",
  planned: "predictive",
  healthy: "predictive",
};

/** ServicePriority 1|2|3 (1 = most urgent) -> FE vocabulary. */
const PRIORITY_LABEL: Record<number, "critical" | "high" | "medium"> = { 1: "critical", 2: "high", 3: "medium" };

const READING_PARAMS = [
  "wire_tension_gf", "gap_V", "resistivity_Mohm_cm", "tank_level_pct", "wire_breaks_in_window",
  "X_mm", "Y_mm", "Z_upper_mm", "Z_lower_mm", "U_mm", "V_mm",
] as const;

/** Keep only finite numeric fields the envelope knows -- never forward arbitrary body keys. */
function sanitizeReading(body: unknown): EnvelopeReading {
  const src = (body && typeof body === "object" ? (body as Record<string, unknown>).reading ?? body : {}) as Record<string, unknown>;
  const out: EnvelopeReading = {};
  for (const key of READING_PARAMS) {
    const v = src[key];
    if (typeof v === "number" && Number.isFinite(v)) (out as Record<string, number>)[key] = v;
  }
  return out;
}

export function createWedmLiveRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/safety-envelope", verifyToken, (req, res) => {
    const reading = sanitizeReading(req.body);
    const report = wedmSafetyEnvelopeEngine.check(reading);
    const envelope = wedmSafetyEnvelopeEngine.getEnvelope();
    const criticals = report.violations.filter((v) => v.severity === "critical").length;
    const warnings = report.violations.filter((v) => v.severity === "warning").length;
    const level = criticals > 0 ? "critical" : warnings > 0 ? "warning" : "safe";
    const factors = (Object.keys(reading) as Array<keyof EnvelopeReading>)
      .filter((param) => envelope.limits[param])
      .map((param) => {
        const limit = envelope.limits[param]!;
        const violation = report.violations.find((v) => v.param === param);
        // Edge-aware threshold: report the bound that was actually violated (a low-edge
        // gap_V violation shows min 20, not max 80); non-violating params show the bound
        // nearest to failing (max if bounded above, else min).
        const threshold = violation
          ? (violation.edge === "low" ? limit.min : limit.max) ?? 0
          : limit.max ?? limit.min ?? 0;
        return {
          name: param,
          value: reading[param] as number,
          threshold,
          status: violation ? (violation.severity === "critical" ? "fail" : "warn") : "ok",
        };
      });
    res.json({
      ok: true,
      data: {
        // Coarse UI projection of the envelope report (0 / 0.7 / 1 bands) -- NOT the
        // prism_safety S(x). Wiring the real S(x) is a filed follow-up.
        score: criticals > 0 ? 0 : warnings > 0 ? 0.7 : 1,
        level,
        factors,
        last_updated: new Date().toISOString(),
        violations: report.violations.map((v) => v.reason),
      },
    });
  });

  router.post("/autonomy", verifyToken, async (_req, res) => {
    try {
      const snap = (await callTool("prism_edm", "wedm_autonomy_gate_status", {})) as Record<string, unknown>;
      if (isDispatcherError(snap)) {
        res.status(502).json({ ok: false, error: dispatcherErrorMessage(snap, "autonomy status unavailable") });
        return;
      }
      const capabilities = (snap.capabilities ?? {}) as Record<string, boolean>;
      res.json({
        ok: true,
        data: {
          level: typeof snap.currentLevel === "number" ? snap.currentLevel : 0,
          level_label: typeof snap.levelName === "string" ? snap.levelName : "Manual",
          // confidence intentionally absent -- AutonomyStatusSnapshot has no such field.
          can_promote: snap.eligibleForPromotion === true,
          promote_blocked_by: Array.isArray(snap.promotionBlockers) ? snap.promotionBlockers : [],
          active_rules: Object.entries(capabilities).filter(([, on]) => on).map(([name]) => name),
        },
      });
    } catch (e: unknown) {
      res.status(502).json({ ok: false, error: e instanceof Error ? e.message : "autonomy status unavailable" });
    }
  });

  router.post("/rul", verifyToken, (_req, res) => {
    const snap = wedmDegradationModelEngine.snapshot();
    const report = wedmRULEngine.estimateFromRates(snap, {});
    const components = Object.values(report.components).map((c) => ({
      component: c.component,
      label: COMPONENT_LABELS[c.component] ?? c.component,
      // health is the engine's own 0-1 remaining-life fraction -- the honest percent.
      rul_pct: Math.round(Math.min(1, Math.max(0, c.health)) * 100),
      hours_remaining: Number.isFinite(c.rul_hours) ? c.rul_hours : null,
      band: c.band,
    }));
    res.json({
      ok: true,
      data: {
        components,
        worst_component: report.worstComponent,
        worst_band: report.worstBand,
        last_updated: new Date().toISOString(),
      },
    });
  });

  router.post("/maintenance", verifyToken, (_req, res) => {
    const snap = wedmDegradationModelEngine.snapshot();
    const report = wedmRULEngine.estimateFromRates(snap, {});
    const { tasks } = wedmMaintenanceSchedulerEngine.plan(report, []);
    const now = Date.now();
    const items = tasks.map((t, i) => ({
      id: `${t.component}-${t.action}-${i}`,
      component: COMPONENT_LABELS[t.component] ?? t.component,
      type: BAND_TO_TYPE[t.band] ?? "predictive",
      due_date: new Date(now + (Number.isFinite(t.dueWithinHours) ? t.dueWithinHours : 24 * 365) * 3_600_000).toISOString(),
      due_hours: Number.isFinite(t.dueWithinHours) ? t.dueWithinHours : undefined,
      priority: PRIORITY_LABEL[t.priority] ?? "medium",
      description: t.reason,
      estimated_downtime_min: t.estMinutes,
    }));
    const dueDates = items.map((it) => it.due_date).sort();
    res.json({
      ok: true,
      data: {
        items,
        next_scheduled: dueDates[0] ?? null,
        overdue_count: items.filter((it) => it.type === "overdue").length,
      },
    });
  });

  return router;
}
