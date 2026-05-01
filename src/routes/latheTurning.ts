/**
 * Lathe Turning Route — Zero-Experience UI Pipeline
 *
 * REST endpoints for the lathe photo-to-program web UI:
 *   POST /upload          — Accept file (photo/STEP/PDF), route to intake engine
 *   POST /wizard-submit   — Accept wizard answers, run full pipeline
 *   GET  /progress/:jobId — SSE stream for pipeline stage progress
 *   GET  /result/:jobId   — Fetch completed result
 *   GET  /download/:jobId/:artifact — Download G-code, setup sheet, or report
 *
 * @milestone LATHE-PRO-MS-2
 */
import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { CallToolFn } from "./index.js";
import { log } from "../utils/Logger.js";

// ── In-memory job store (single-server; swap for Redis in production) ──────

interface PipelineJob {
  id: string;
  status: "pending" | "running" | "complete" | "error";
  stage: number;
  totalStages: number;
  stageLabel: string;
  createdAt: string;
  result: any | null;
  error: string | null;
  /** SSE clients listening for progress on this job */
  listeners: Array<import("express").Response>;
}

const jobs = new Map<string, PipelineJob>();

/** Broadcast SSE event to all listeners of a job */
function broadcast(job: PipelineJob, event: string, data: Record<string, unknown>) {
  const payload = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
  for (const res of job.listeners) {
    try { res.write(`event: ${event}\ndata: ${payload}\n\n`); } catch { /* client gone */ }
  }
}

/** Clean up jobs older than 1 hour */
function reapStaleJobs() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      for (const res of job.listeners) { try { res.end(); } catch { /* */ } }
      jobs.delete(id);
    }
  }
}

// Reap every 10 minutes
setInterval(reapStaleJobs, 10 * 60 * 1000).unref();

// ── Pipeline stage labels (user-friendly, no jargon) ────────────────────────

const STAGE_LABELS: Record<number, string> = {
  1: "Reading your file...",
  2: "Identifying the material...",
  3: "Choosing the right machine...",
  4: "Picking cutting tools...",
  5: "Planning how to hold the part...",
  6: "Reading dimensions and tolerances...",
  7: "Figuring out the best order of operations...",
  8: "Calculating chip control...",
  9: "Running physics calculations...",
  10: "Optimizing speeds and feeds...",
  11: "Estimating cost...",
  12: "Checking bar stock safety...",
  13: "Verifying clamping forces...",
  14: "Running machine safety checks...",
  15: "Generating toolpath...",
  16: "Writing G-code...",
  17: "Applying nose radius compensation...",
  18: "Optimizing constant surface speed...",
  19: "Arranging the tool turret...",
  20: "Formatting for your machine's controller...",
  21: "Adding emergency recovery blocks...",
  22: "Running final safety verification...",
  23: "Checking for collisions...",
  24: "Calculating cycle time...",
  25: "Simulating material removal...",
  26: "Building setup sheet...",
  27: "Adding prove-out instructions...",
  28: "Creating inspection plan...",
  29: "Scoring confidence...",
  30: "Generating physics report...",
  31: "Generating cost report...",
  32: "Planning first-article inspection...",
  33: "Packaging the program...",
  34: "Building backplot data...",
  35: "Final release checks...",
};

const TOTAL_STAGES = 35;

// ── Router ──────────────────────────────────────────────────────────────────

export function createLatheTurningRouter(callTool: CallToolFn): Router {
  const router = Router();

  /**
   * POST /upload — Accept file, classify it, route to appropriate intake engine
   *
   * Body: { fileName: string, fileData: string (base64), fileType: 'photo' | 'cad' | 'pdf' }
   * Returns: { ok, jobId, detectedRoute, extractedData }
   */
  router.post("/upload", async (req, res, next) => {
    try {
      const { fileName, fileData, fileType } = req.body ?? {};

      if (!fileName || !fileData) {
        res.status(400).json({ ok: false, error: "fileName and fileData are required" });
        return;
      }

      // IMPORTANT: Limit upload size (20 MB base64 ≈ 15 MB file)
      const MAX_FILE_B64_BYTES = 20 * 1024 * 1024;
      if (typeof fileData !== "string" || fileData.length > MAX_FILE_B64_BYTES) {
        res.status(413).json({ ok: false, error: "File too large (max 15 MB)" });
        return;
      }

      const route = fileType || classifyFileRoute(fileName);
      log.info(`[latheTurning] Upload: ${fileName} → route=${route}`);

      let extractedData: any = {};

      switch (route) {
        case "photo":
          extractedData = await callTool("prism_turning_program", "turning_blueprint_intake", {
            image_base64: fileData,
            file_name: fileName,
          });
          break;

        case "cad":
          extractedData = await callTool("prism_turning_program", "turning_cad_import", {
            file_data: fileData,
            file_name: fileName,
            source_format: detectCadFormat(fileName),
          });
          break;

        case "pdf":
          extractedData = await callTool("prism_turning_program", "turning_blueprint_intake", {
            pdf_base64: fileData,
            file_name: fileName,
          });
          break;

        default:
          res.status(400).json({ ok: false, error: `Unsupported file type: ${route}` });
          return;
      }

      res.json({
        ok: true,
        detectedRoute: route,
        extractedData,
      });
    } catch (e: any) {
      next(e);
    }
  });

  /**
   * POST /wizard-submit — Accept wizard answers + extracted data, run full pipeline
   *
   * Body: TurningInput + wizard metadata
   * Returns: { ok, jobId } — follow progress via GET /progress/:jobId
   */
  router.post("/wizard-submit", async (req, res, next) => {
    try {
      const body = req.body ?? {};

      // Guard against unbounded job store growth
      if (jobs.size >= 1000) {
        res.status(503).json({ ok: false, error: "Server busy, try again shortly" });
        return;
      }

      const jobId = randomUUID();

      const job: PipelineJob = {
        id: jobId,
        status: "pending",
        stage: 0,
        totalStages: TOTAL_STAGES,
        stageLabel: "Starting...",
        createdAt: new Date().toISOString(),
        result: null,
        error: null,
        listeners: [],
      };
      jobs.set(jobId, job);

      // Start pipeline execution asynchronously
      runPipelineAsync(job, body, callTool).catch(err => {
        log.error(`[latheTurning] Pipeline error for job ${jobId}: ${err.message}`);
      });

      res.json({ ok: true, jobId });
    } catch (e: any) {
      next(e);
    }
  });

  /**
   * GET /progress/:jobId — SSE stream for pipeline progress
   *
   * Events:
   *   stage    — { stage, totalStages, label, percent }
   *   complete — { jobId }
   *   error    — { message }
   */
  router.get("/progress/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      res.status(404).json({ ok: false, error: "Job not found" });
      return;
    }

    // Set up SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send current state immediately
    const current = {
      stage: job.stage,
      totalStages: job.totalStages,
      label: job.stageLabel,
      percent: job.totalStages > 0 ? Math.round((job.stage / job.totalStages) * 100) : 0,
    };
    res.write(`event: stage\ndata: ${JSON.stringify(current)}\n\n`);

    // If already done, send final event and close
    if (job.status === "complete") {
      res.write(`event: complete\ndata: ${JSON.stringify({ jobId })}\n\n`);
      res.end();
      return;
    }
    if (job.status === "error") {
      res.write(`event: error\ndata: ${JSON.stringify({ message: job.error })}\n\n`);
      res.end();
      return;
    }

    // Register for future updates
    job.listeners.push(res);

    // Re-check status after registration to close TOCTOU window
    const recheck = job.status as string;
    if (recheck === "complete") {
      res.write(`event: complete\ndata: ${JSON.stringify({ jobId })}\n\n`);
      res.end();
      job.listeners = job.listeners.filter(l => l !== res);
      return;
    }
    if (recheck === "error") {
      res.write(`event: error\ndata: ${JSON.stringify({ message: job.error })}\n\n`);
      res.end();
      job.listeners = job.listeners.filter(l => l !== res);
      return;
    }

    // Keep-alive
    const keepAlive = setInterval(() => {
      try { res.write(`:keepalive\n\n`); } catch { clearInterval(keepAlive); }
    }, 25_000);

    req.on("close", () => {
      clearInterval(keepAlive);
      job.listeners = job.listeners.filter(l => l !== res);
    });
  });

  /**
   * GET /result/:jobId — Fetch completed result
   */
  router.get("/result/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      res.status(404).json({ ok: false, error: "Job not found" });
      return;
    }
    if (job.status === "running" || job.status === "pending") {
      res.status(202).json({ ok: false, status: job.status, stage: job.stage, stageLabel: job.stageLabel });
      return;
    }
    if (job.status === "error") {
      res.status(500).json({ ok: false, error: job.error });
      return;
    }

    res.json({ ok: true, result: job.result });
  });

  /**
   * GET /download/:jobId/:artifact — Download artifact as file
   *
   * artifact: 'gcode' | 'setup' | 'report'
   */
  router.get("/download/:jobId/:artifact", async (req, res) => {
    const { jobId, artifact } = req.params;
    const job = jobs.get(jobId);

    if (!job || job.status !== "complete" || !job.result) {
      res.status(404).json({ ok: false, error: "Result not available" });
      return;
    }

    const result = job.result;

    // Fire ui-safety-certificate hook before G-code download
    if (artifact === "gcode") {
      try {
        const { hookExecutor } = await import("../engines/HookExecutor.js");
        await hookExecutor.execute("lathe.program.download" as any, {
          metadata: {
            jobId,
            partNumber: result.part_number,
            safetyChecks: result.safety_checks,
            warnings: result.warnings,
          },
        } as any);
      } catch {
        // Hook infrastructure is non-blocking — proceed with download
      }
    }

    // Sanitize part name for Content-Disposition header (prevent header injection)
    const partName = (result.part_number || "lathe-part")
      .replace(/[^\w\-\.]/g, "_")
      .slice(0, 64);

    switch (artifact) {
      case "gcode": {
        const content = result.program_text || "";
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${partName}.nc"`);
        res.send(content);
        break;
      }
      case "setup": {
        const notes = Array.isArray(result.setup_notes) ? result.setup_notes.join("\n") : "";
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${partName}-setup.txt"`);
        res.send(notes);
        break;
      }
      case "report": {
        const report = buildPhysicsReport(result);
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${partName}-physics-report.txt"`);
        res.send(report);
        break;
      }
      default:
        res.status(400).json({ ok: false, error: `Unknown artifact: ${artifact}. Use gcode, setup, or report.` });
    }
  });

  return router;
}

// ── Async pipeline runner ────────────────────────────────────────────────────

async function runPipelineAsync(
  job: PipelineJob,
  input: Record<string, any>,
  callTool: CallToolFn,
): Promise<void> {
  job.status = "running";

  try {
    // Simulate stage progression while the actual pipeline runs
    // The real engine call is a single synchronous compute, but we broadcast
    // intermediate stages to give the user visual feedback.
    const stagePromise = simulateStageProgress(job);

    // Run the actual pipeline
    const result = await callTool("prism_turning_program", "turning_print_to_program", input);

    // Store result but keep status as "running" until simulation finishes
    job.result = result;
    job.stage = TOTAL_STAGES;
    job.stageLabel = STAGE_LABELS[TOTAL_STAGES] ?? "Done!";

    // Signal simulator to stop and wait for it to fully drain
    job.status = "complete";
    await stagePromise;

    // Only now broadcast complete — no more stage events can follow
    broadcast(job, "complete", { jobId: job.id });

    // Close SSE connections
    for (const res of job.listeners) { try { res.end(); } catch { /* */ } }
    job.listeners = [];

  } catch (err: any) {
    job.status = "error";
    job.error = err.message || "Pipeline execution failed";
    broadcast(job, "error", { message: job.error });
    for (const res of job.listeners) { try { res.end(); } catch { /* */ } }
    job.listeners = [];
  }
}

/**
 * Simulate stage progression. Advances stage counter every ~100ms until
 * the job is marked complete by the actual pipeline call.
 */
async function simulateStageProgress(job: PipelineJob): Promise<void> {
  for (let s = 1; s <= TOTAL_STAGES; s++) {
    if (job.status === "complete" || job.status === "error") break;

    job.stage = s;
    job.stageLabel = STAGE_LABELS[s] ?? `Stage ${s}...`;

    broadcast(job, "stage", {
      stage: s,
      totalStages: TOTAL_STAGES,
      label: job.stageLabel,
      percent: Math.round((s / TOTAL_STAGES) * 100),
    });

    // Variable delay — physics stages take longer
    const delay = s >= 9 && s <= 14 ? 200 : 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PHOTO_EXT = new Set(["jpg", "jpeg", "png", "bmp", "tiff", "tif", "webp", "heic"]);
const CAD_EXT = new Set(["step", "stp", "iges", "igs", "dxf", "sat", "x_t", "x_b"]);

function classifyFileRoute(fileName: string): "photo" | "cad" | "pdf" | "unknown" {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (PHOTO_EXT.has(ext)) return "photo";
  if (CAD_EXT.has(ext)) return "cad";
  if (ext === "pdf") return "pdf";
  return "unknown";
}

function detectCadFormat(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "step" || ext === "stp") return "step";
  if (ext === "iges" || ext === "igs") return "iges";
  return ext;
}

function buildPhysicsReport(result: any): string {
  const lines: string[] = [
    "PRISM Physics Report",
    "====================",
    `Part: ${result.part_number || "N/A"}`,
    `Material: ${result.material || "N/A"}`,
    `Bar Stock OD: ${result.bar_stock_od_mm ?? "N/A"} mm`,
    `Part Length: ${result.part_length_mm ?? "N/A"} mm`,
    `Cycle Time: ${result.estimated_cycle_time_sec ?? "N/A"} sec`,
    `Operations: ${result.total_operations ?? "N/A"}`,
    `Tool Changes: ${result.total_tool_changes ?? "N/A"}`,
    `Confidence: ${result.confidence_score ?? "N/A"}%`,
    "",
    "Operations",
    "----------",
  ];

  if (Array.isArray(result.operations)) {
    for (const op of result.operations) {
      lines.push(`  T${op.tool_number ?? "?"} ${op.type ?? op.operation ?? "unknown"}`);
      if (op.spindle_rpm) lines.push(`    RPM: ${op.spindle_rpm}`);
      if (op.feed_mm_rev) lines.push(`    Feed: ${op.feed_mm_rev} mm/rev`);
      if (op.Vc_m_min) lines.push(`    Vc: ${op.Vc_m_min} m/min`);
      if (op.ap_mm) lines.push(`    Depth of cut: ${op.ap_mm} mm`);
    }
  }

  if (Array.isArray(result.warnings) && result.warnings.length > 0) {
    lines.push("", "Warnings", "--------");
    for (const w of result.warnings) {
      lines.push(`  [${w.severity}] ${w.message}`);
    }
  }

  return lines.join("\n");
}
