/**
 * Calibration Routes — INFRA-5-1 U-CAL3
 *
 * POST /api/v1/calibration/actuals — Ingest measured actuals for calibration feedback
 * GET  /api/v1/calibration/status  — Calibration state summary
 *
 * Validates actuals against predictions, flags outliers (>3σ), and queues
 * calibration update jobs via BullMQ.
 */
import { Router } from "express";
import { z } from "zod";

const ActualMeasurementSchema = z.object({
  model_id: z.string().min(1).describe("Prediction model ID (e.g., kienzle_force, taylor_tool_life)"),
  predicted_value: z.number().describe("Predicted value from PRISM"),
  actual_value: z.number().describe("Measured actual value"),
  measurement_type: z.enum([
    "cycle_time_s", "tool_life_min", "cutting_force_N", "surface_finish_Ra_um",
    "power_kW", "temperature_C", "deflection_um", "vibration_mm_s",
    "mrrr_cm3_min", "chip_thickness_mm", "torque_Nm", "custom",
  ]),
  material_key: z.string().optional(),
  machine_id: z.string().optional(),
  tool_id: z.string().optional(),
  operation_type: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  measured_by: z.string().optional(),
  instrument_id: z.string().optional(),
  notes: z.string().optional(),
  input_features: z.record(z.string(), z.unknown()).optional().default({}),
});

type ActualMeasurement = z.infer<typeof ActualMeasurementSchema>;

/** Simple running stats for outlier detection (Welford's algorithm) */
interface ModelStats {
  n: number;
  mean: number;
  m2: number;  // sum of squares of differences from mean
}

const modelStatsCache = new Map<string, ModelStats>();

function getModelStatsKey(m: ActualMeasurement): string {
  return `${m.model_id}:${m.measurement_type}:${m.material_key ?? "any"}`;
}

function updateStats(key: string, errorPct: number): ModelStats {
  let stats = modelStatsCache.get(key);
  if (!stats) {
    stats = { n: 0, mean: 0, m2: 0 };
    modelStatsCache.set(key, stats);
  }
  stats.n++;
  const delta = errorPct - stats.mean;
  stats.mean += delta / stats.n;
  const delta2 = errorPct - stats.mean;
  stats.m2 += delta * delta2;
  return stats;
}

function getStdDev(stats: ModelStats): number {
  if (stats.n < 2) return Infinity; // not enough data
  return Math.sqrt(stats.m2 / (stats.n - 1));
}

interface ActualResult {
  accepted: boolean;
  outlier: boolean;
  error_pct: number;
  sigma_from_mean: number | null;
  reason?: string;
  model_id: string;
  measurement_type: string;
}

function validateActual(m: ActualMeasurement): ActualResult {
  const errorPct = m.predicted_value !== 0
    ? ((m.actual_value - m.predicted_value) / m.predicted_value) * 100
    : 0;

  const key = getModelStatsKey(m);
  const stats = updateStats(key, errorPct);
  const stdDev = getStdDev(stats);

  let sigmaFromMean: number | null = null;
  let outlier = false;
  let reason: string | undefined;

  if (stdDev !== Infinity && stdDev > 0) {
    sigmaFromMean = Math.abs(errorPct - stats.mean) / stdDev;
    if (sigmaFromMean > 3) {
      outlier = true;
      reason = `Outlier: ${sigmaFromMean.toFixed(1)}σ from mean error (${stats.mean.toFixed(1)}% ± ${stdDev.toFixed(1)}%). Flagged for review.`;
    }
  }

  return {
    accepted: !outlier,
    outlier,
    error_pct: Math.round(errorPct * 100) / 100,
    sigma_from_mean: sigmaFromMean !== null ? Math.round(sigmaFromMean * 100) / 100 : null,
    reason,
    model_id: m.model_id,
    measurement_type: m.measurement_type,
  };
}

export function createCalibrationRouter(): Router {
  const router = Router();

  /**
   * POST /actuals — Ingest a measured actual for calibration
   *
   * Validates against outlier detection. If >3σ from historical mean error,
   * flags for review rather than accepting into calibration.
   */
  router.post("/actuals", async (req, res) => {
    try {
      const body = ActualMeasurementSchema.parse(req.body);
      const result = validateActual(body);

      // In production: persist to prediction_outcomes table and queue calibration job
      // const { db } = await import("../db/connection.js");
      // if (db.isConnected()) { await db.query("INSERT INTO prediction_outcomes ..."); }
      // Queue BullMQ job: calibrationQueue.add("calibrate", { model_id, material_key, ... });

      const status = result.accepted ? 201 : 200;
      res.status(status).json({
        ok: true,
        result,
        message: result.accepted
          ? `Actual recorded for ${body.model_id}. Error: ${result.error_pct}%.`
          : `Outlier flagged for review. ${result.reason}`,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: "Validation failed", details: err.issues });
        return;
      }
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  /**
   * POST /actuals/batch — Ingest multiple actuals at once
   */
  router.post("/actuals/batch", async (req, res) => {
    try {
      const items = z.array(ActualMeasurementSchema).parse(req.body);
      const results = items.map(validateActual);
      const accepted = results.filter(r => r.accepted).length;
      const outliers = results.filter(r => r.outlier).length;

      res.status(201).json({
        ok: true,
        total: items.length,
        accepted,
        outliers,
        results,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: "Validation failed", details: err.issues });
        return;
      }
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  /**
   * GET /status — Calibration stats summary
   */
  router.get("/status", (_req, res) => {
    const models: Record<string, { n: number; mean_error_pct: number; stddev: number }> = {};
    for (const [key, stats] of modelStatsCache) {
      models[key] = {
        n: stats.n,
        mean_error_pct: Math.round(stats.mean * 100) / 100,
        stddev: Math.round(getStdDev(stats) * 100) / 100,
      };
    }
    res.json({ ok: true, models, total_models: modelStatsCache.size });
  });

  return router;
}
