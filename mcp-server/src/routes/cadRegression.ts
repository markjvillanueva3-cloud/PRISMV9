/**
 * PRISM MCP Server — CAD Regression Dashboard Routes
 *
 * U-CINF08 (CAD-INFRA-MS0): real-time progress API over the
 * CADRegressionDashboardEngine read-only aggregator.
 *
 * Routes (mounted under `/api/v1/cad-regression`):
 *   GET  /progress?batchId=<id>          → DashboardSnapshot (one-shot JSON)
 *   GET  /summary                         → BatchSummary[]    (list every batch)
 *   GET  /stream?batchId=<id>             → SSE live updates  (auto-ends on completed)
 *
 * The dashboard engine is pure read-only — it loads
 * `{stateDir}/{batchId}.json` written by CADTestCheckpointEngine and
 * computes counts / error breakdown / throughput / ETA / recent failures.
 *
 * @module routes/cadRegression
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { cadRegressionDashboardEngine } from "../engines/CADRegressionDashboardEngine.js";

// ── SSE tuning (extracted to constants per engines.md / dispatchers.md) ─────

/** Interval (ms) between snapshot pushes on the SSE stream. */
const SSE_INTERVAL_MS = 2_000;
/** Maximum wall-clock for an SSE stream before it self-terminates (ms). */
const SSE_MAX_LIFETIME_MS = 30 * 60_000;
/** Cap throughput windowMinutes from query (defensive — engine also defaults). */
const MAX_WINDOW_MINUTES = 60;
/** Cap recent-failures limit from query. */
const MAX_RECENT_LIMIT = 100;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Reject anything that doesn't look like a UUID-style batch id (no path traversal). */
const BATCH_ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;

function validateBatchId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!BATCH_ID_RE.test(raw)) return null;
  return raw;
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

// ── Router factory ──────────────────────────────────────────────────────────

/**
 * Creates the cad-regression router.
 *
 * Signature matches the rest of `routes/`: takes the dispatcher `callTool`
 * callback (unused — the dashboard reads the engine singleton directly, which
 * is the correct layering for a pure read-only progress API). Keeping the
 * parameter preserves the registration convention in `routes/index.ts`.
 *
 * @param _callTool unused (kept for parity with the other route factories)
 * @returns Express Router
 */
export function createCadRegressionRouter(
  _callTool?: unknown,
): Router {
  const router = Router();

  // GET /progress?batchId=<id>[&windowMinutes=N][&recentLimit=K]
  router.get("/progress", async (req: Request, res: Response, next): Promise<void> => {
    try {
      const batchId = validateBatchId(req.query.batchId);
      if (!batchId) {
        res.status(400).json({ error: "batchId is required and must match [A-Za-z0-9_.-]{1,64}" });
        return;
      }
      const windowMinutes = clampInt(req.query.windowMinutes, 5, 1, MAX_WINDOW_MINUTES);
      const recentLimit = clampInt(req.query.recentLimit, 10, 0, MAX_RECENT_LIMIT);

      try {
        const snap = await cadRegressionDashboardEngine.snapshot(
          batchId,
          undefined,
          windowMinutes,
          recentLimit,
        );
        res.json(snap);
      } catch (err: unknown) {
        // The engine throws when the batch file doesn't exist or is malformed.
        // Surface that as a 404 instead of bubbling to errorHandler as a 500.
        const msg = err instanceof Error ? err.message : String(err);
        if (/not found|ENOENT|missing|does not exist/i.test(msg)) {
          res.status(404).json({ error: `batch '${batchId}' not found`, detail: msg });
          return;
        }
        throw err;
      }
    } catch (err: unknown) {
      next(err);
    }
  });

  // GET /summary — list every batch on disk
  router.get("/summary", async (_req: Request, res: Response, next): Promise<void> => {
    try {
      const summaries = await cadRegressionDashboardEngine.listBatches();
      res.json({ batches: summaries, count: summaries.length });
    } catch (err: unknown) {
      next(err);
    }
  });

  // GET /stream?batchId=<id>  — Server-Sent Events live updates
  // The browser EventSource auto-reconnects; we self-terminate once the
  // batch is `completed` so the client knows the run is done.
  router.get("/stream", async (req: Request, res: Response, next): Promise<void> => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let lifetimeTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const batchId = validateBatchId(req.query.batchId);
      if (!batchId) {
        res.status(400).json({ error: "batchId is required" });
        return;
      }
      const windowMinutes = clampInt(req.query.windowMinutes, 5, 1, MAX_WINDOW_MINUTES);
      const recentLimit = clampInt(req.query.recentLimit, 10, 0, MAX_RECENT_LIMIT);

      // SSE headers + comment heartbeat so proxies don't buffer.
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // disable nginx buffering
      });
      res.write(": connected\n\n");

      const sendOne = async (): Promise<boolean> => {
        try {
          const snap = await cadRegressionDashboardEngine.snapshot(
            batchId,
            undefined,
            windowMinutes,
            recentLimit,
          );
          res.write(`event: snapshot\ndata: ${JSON.stringify(snap)}\n\n`);
          return snap.lifecycle === "completed";
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
          return false;
        }
      };

      // Push the first snapshot immediately so the client doesn't wait 2s.
      const doneFirst = await sendOne();
      if (doneFirst) {
        res.end();
        return;
      }

      interval = setInterval(async () => {
        const done = await sendOne();
        if (done) {
          if (interval) clearInterval(interval);
          if (lifetimeTimer) clearTimeout(lifetimeTimer);
          res.end();
        }
      }, SSE_INTERVAL_MS);

      lifetimeTimer = setTimeout(() => {
        if (interval) clearInterval(interval);
        res.write(`event: timeout\ndata: ${JSON.stringify({ reason: "max lifetime reached" })}\n\n`);
        res.end();
      }, SSE_MAX_LIFETIME_MS);

      // Client disconnect — always clean up timers.
      req.on("close", () => {
        if (interval) clearInterval(interval);
        if (lifetimeTimer) clearTimeout(lifetimeTimer);
      });
    } catch (err: unknown) {
      if (interval) clearInterval(interval);
      if (lifetimeTimer) clearTimeout(lifetimeTimer);
      next(err);
    }
  });

  return router;
}
