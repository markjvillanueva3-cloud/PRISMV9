// WIRE-EXEMPT: loopback HTTP server (start/stop lifecycle, bound 127.0.0.1) started by the host/operator process (per-workstation prism_ac install) to receive inbound hyperCAD-S panel calls -- NOT a request/response prism_* dispatcher action. Renamed from HyperMillACBridgeEngine to resolve a class+singleton name collision with the OUTBOUND CAM-API bridge in BatchCAMAPIBridgeEngines.ts (the camDispatcher-wired one).
/**
 * HyperMillACServerEngine — Loopback HTTP companion server for OPEN MIND
 * Automation Center (AC) / hyperCAD-S / hyperMILL.
 *
 * Implements the routes defined by `HyperMillACServerConfig`:
 *   GET  /status       → { status, version, uptime_ms, mockMode, activeJobs }
 *   POST /execute      → { jobId } — fire-and-track Python script against AC
 *   GET  /job-status   → { jobId, state, stdout?, stderr?, error?, durationMs? }
 *   POST /extract      → { jobId } — trigger data extraction (databases array)
 *   POST /optimize     → { jobId } — trigger PPP optimization
 *
 * Design:
 *   - Binds ONLY to 127.0.0.1 (validated by HyperMillACServerConfig).
 *   - CORS allowed only for hyperCAD-S panel origins.
 *   - In-memory job map (jobId → state). Jobs expire 1h after completion.
 *   - Concurrent script execution capped at `maxConcurrent` (default 4).
 *   - Real script execution delegated to HyperMillACScriptExecutor; mock mode
 *     forwards through the same executor with PRISM_CAD_MOCK=1 env semantics.
 *   - No external HTTP framework dependency — pure node:http.
 *
 * Pairs with the host-side `prism_ac` Python module (lives in
 * `mcp-server/python/prism_ac/`) — operator installs it once per hyperMILL
 * workstation before this bridge can execute real (non-mock) scripts.
 *
 * @engine HyperMillACServerEngine
 * @shortcode E1144
 * @milestone CAD-FUSION-LIVE-MS0 / U-ACBRIDGE
 */

import * as http from "node:http";
import { log } from "../utils/Logger.js";
import {
  buildACServerConfig,
  validateACServerConfig,
  describeACServerConfig,
  AC_ROUTES,
  type ACServerConfig,
} from "./HyperMillACServerConfig.js";
import { HyperMillACScriptExecutor, type ACExecuteResult } from "./HyperMillACScriptExecutor.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobState = "queued" | "running" | "succeeded" | "failed" | "timeout";

export interface JobRecord {
  jobId: string;
  route: "execute" | "extract" | "optimize";
  state: JobState;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error: string | null;
  durationMs: number | null;
  /** Caller-provided correlation tag (echoed in /job-status responses). */
  tag?: string;
}

export interface StartResult {
  ok: boolean;
  serverUrl: string;
  message: string;
}

export interface StopResult {
  ok: boolean;
  message: string;
}

const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const JOB_ID_NS = "ac-job";

function makeJobId(): string {
  // 12 random hex chars + millisecond timestamp — deterministic enough for
  // human debugging, sparse enough that collisions inside a 1h TTL window are
  // negligible. NOT a security token; loopback-only.
  const rand = Math.floor(Math.random() * 0xffffffffff).toString(16).padStart(10, "0");
  return `${JOB_ID_NS}-${Date.now().toString(36)}-${rand}`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class HyperMillACServerEngine {
  private readonly config: ACServerConfig;
  private readonly executor: HyperMillACScriptExecutor;
  private server: http.Server | null = null;
  private readonly jobs = new Map<string, JobRecord>();
  private activeCount = 0;
  private startedAt = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(opts: { config?: Partial<ACServerConfig>; executor?: HyperMillACScriptExecutor } = {}) {
    const built = buildACServerConfig(opts.config ?? {});
    const errors = validateACServerConfig(built);
    if (errors.length > 0) {
      throw new Error(`HyperMillACServerEngine: invalid config — ${errors.join("; ")}`);
    }
    this.config = built;
    this.executor =
      opts.executor ??
      new HyperMillACScriptExecutor({
        acHost: built.host,
        acPort: built.port,
        mockMode: built.mockMode,
      });
  }

  /** Server URL (helper for tests / logs). */
  get serverUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /** Active config (read-only). */
  getConfig(): ACServerConfig {
    return this.config;
  }

  /** Snapshot of all known jobs (oldest first). */
  listJobs(): JobRecord[] {
    return [...this.jobs.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  /** Lookup a job by id. */
  getJob(jobId: string): JobRecord | null {
    return this.jobs.get(jobId) ?? null;
  }

  /** Start listening. Idempotent — second call returns the existing URL. */
  async start(): Promise<StartResult> {
    if (this.server) {
      return { ok: true, serverUrl: this.serverUrl, message: "already running" };
    }
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => this.handleRequest(req, res));
      // Cap request duration so an incomplete-body client (under-sends vs its Content-Length)
      // cannot hold a connection open indefinitely -- readJsonBody has no app-level idle timer.
      // 30s is generous for a loopback AC script call. (slot:romeo for kilo, P2 hardening)
      server.requestTimeout = 30_000;
      server.headersTimeout = 10_000;
      server.once("error", (err) => reject(err));
      server.listen(this.config.port, this.config.host, () => {
        this.server = server;
        this.startedAt = Date.now();
        this.cleanupTimer = setInterval(() => this.reapExpiredJobs(), 5 * 60 * 1000);
        // Allow the process to exit even if the interval is still alive.
        this.cleanupTimer.unref?.();
        log.info(`[HyperMillACServer] listening ${this.serverUrl}`);
        log.info(describeACServerConfig(this.config));
        resolve({ ok: true, serverUrl: this.serverUrl, message: "started" });
      });
    });
  }

  /** Stop listening + clear pending jobs. */
  async stop(): Promise<StopResult> {
    if (!this.server) {
      return { ok: true, message: "not running" };
    }
    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer);
          this.cleanupTimer = null;
        }
        log.info(`[HyperMillACServer] stopped`);
        resolve({ ok: true, message: "stopped" });
      });
    });
  }

  /** True iff the server is listening. */
  isRunning(): boolean {
    return this.server !== null;
  }

  // ── Request dispatch ──────────────────────────────────────────────────────

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    this.applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", this.serverUrl);

    try {
      if (req.method === "GET" && url.pathname === AC_ROUTES.STATUS) {
        return this.routeStatus(res);
      }
      if (req.method === "GET" && url.pathname === AC_ROUTES.JOB_STATUS) {
        return this.routeJobStatus(url, res);
      }
      if (req.method === "POST" && url.pathname === AC_ROUTES.EXECUTE) {
        return this.readJsonBody(req, res, (body) => this.routeExecute(body, res));
      }
      if (req.method === "POST" && url.pathname === AC_ROUTES.EXTRACT) {
        return this.readJsonBody(req, res, (body) => this.routeExtract(body, res));
      }
      if (req.method === "POST" && url.pathname === AC_ROUTES.OPTIMIZE) {
        return this.readJsonBody(req, res, (body) => this.routeOptimize(body, res));
      }
      this.sendJson(res, 404, { error: "not_found", path: url.pathname, method: req.method });
    } catch (err: any) {
      log.error(`[HyperMillACServer] handler crash: ${err.message}`);
      this.sendJson(res, 500, { error: "internal", message: err.message });
    }
  }

  private applyCors(req: http.IncomingMessage, res: http.ServerResponse): void {
    const origin = req.headers.origin ?? "";
    if (this.config.cors.allowedOrigins.includes(origin) || origin === "") {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", this.config.cors.allowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", this.config.cors.allowedHeaders.join(", "));
    res.setHeader("Access-Control-Max-Age", String(this.config.cors.maxAgeSecs));
  }

  private readJsonBody(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    handler: (body: Record<string, unknown>) => void,
  ): void {
    const chunks: Buffer[] = [];
    let total = 0;
    const MAX_BODY = 1024 * 1024; // 1 MB
    // Peer-review 2026-05-20 P0-1 fix: write-after-destroy race. Send the 413
    // BEFORE destroying the socket, and gate the data/end/error handlers on a
    // single boolean so any in-flight chunk after the limit-trip is dropped
    // without re-entering the response path.
    let sizeLimitHit = false;
    let responseSent = false;
    const safeSend = (status: number, body: unknown): void => {
      if (responseSent) return;
      responseSent = true;
      this.sendJson(res, status, body);
    };
    req.on("data", (chunk: Buffer) => {
      if (sizeLimitHit) return;
      total += chunk.length;
      if (total > MAX_BODY) {
        sizeLimitHit = true;
        // Reject the oversize upload WITHOUT resetting the socket: Connection:close lets
        // node tear down AFTER the 413 response flushes. req.destroy() mid-upload races the
        // flush and the client sees ECONNRESET instead of the 413 body. (slot:romeo for kilo)
        res.setHeader("Connection", "close");
        safeSend(413, { error: "payload_too_large", limitBytes: MAX_BODY });
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (sizeLimitHit || responseSent) return;
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.length === 0) {
        handler({});
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        handler(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        safeSend(400, { error: "bad_json", message: msg });
      }
    });
    req.on("error", (err: Error) => {
      if (responseSent) return;
      safeSend(400, { error: "request_error", message: err.message });
    });
  }

  // ── Route handlers ────────────────────────────────────────────────────────

  private routeStatus(res: http.ServerResponse): void {
    this.sendJson(res, 200, {
      status: "ok",
      version: 1,
      uptime_ms: Date.now() - this.startedAt,
      mockMode: this.config.mockMode,
      activeJobs: this.activeCount,
      totalJobs: this.jobs.size,
      bind: `${this.config.host}:${this.config.port}`,
    });
  }

  private routeJobStatus(url: URL, res: http.ServerResponse): void {
    const jobId = url.searchParams.get("job_id");
    if (!jobId) {
      this.sendJson(res, 400, { error: "missing_job_id" });
      return;
    }
    const job = this.jobs.get(jobId);
    if (!job) {
      this.sendJson(res, 404, { error: "unknown_job", jobId });
      return;
    }
    this.sendJson(res, 200, this.toJobResponse(job));
  }

  private routeExecute(body: Record<string, unknown>, res: http.ServerResponse): void {
    const script = typeof body.script === "string" ? body.script : null;
    const timeoutMs =
      typeof body.timeout_ms === "number" && body.timeout_ms > 0 ? Math.floor(body.timeout_ms) : undefined;
    const tag = typeof body.tag === "string" ? body.tag : undefined;

    if (!script || script.trim().length === 0) {
      this.sendJson(res, 400, { error: "missing_script" });
      return;
    }
    if (this.activeCount >= this.config.maxConcurrent) {
      this.sendJson(res, 503, {
        error: "max_concurrent",
        limit: this.config.maxConcurrent,
        activeJobs: this.activeCount,
      });
      return;
    }

    const job = this.startJob("execute", tag);
    this.sendJson(res, 202, { jobId: job.jobId, state: job.state });
    this.runJob(job, script, timeoutMs);
  }

  private routeExtract(body: Record<string, unknown>, res: http.ServerResponse): void {
    const databases = Array.isArray(body.databases) ? body.databases.filter((d) => typeof d === "string") : [];
    const outputDir = typeof body.output_dir === "string" ? body.output_dir : null;
    if (databases.length === 0 || !outputDir) {
      this.sendJson(res, 400, { error: "extract_requires_databases_and_output_dir" });
      return;
    }
    if (this.activeCount >= this.config.maxConcurrent) {
      this.sendJson(res, 503, {
        error: "max_concurrent",
        limit: this.config.maxConcurrent,
        activeJobs: this.activeCount,
      });
      return;
    }
    const job = this.startJob("extract", undefined);
    this.sendJson(res, 202, { jobId: job.jobId, state: job.state });
    const script = this.buildExtractScript(databases as string[], outputDir);
    this.runJob(job, script);
  }

  private routeOptimize(body: Record<string, unknown>, res: http.ServerResponse): void {
    const ncContent = typeof body.nc_content === "string" ? body.nc_content : null;
    const controller = typeof body.controller === "string" ? body.controller : null;
    const material = typeof body.material === "string" ? body.material : null;
    if (!ncContent || !controller || !material) {
      this.sendJson(res, 400, { error: "optimize_requires_nc_content_controller_material" });
      return;
    }
    if (this.activeCount >= this.config.maxConcurrent) {
      this.sendJson(res, 503, {
        error: "max_concurrent",
        limit: this.config.maxConcurrent,
        activeJobs: this.activeCount,
      });
      return;
    }
    const job = this.startJob("optimize", controller);
    this.sendJson(res, 202, { jobId: job.jobId, state: job.state });
    const script = this.buildOptimizeScript(ncContent, controller, material);
    this.runJob(job, script);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private startJob(route: JobRecord["route"], tag: string | undefined): JobRecord {
    const job: JobRecord = {
      jobId: makeJobId(),
      route,
      state: "queued",
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      stdout: "",
      stderr: "",
      exitCode: null,
      error: null,
      durationMs: null,
      tag,
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  private async runJob(job: JobRecord, script: string, timeoutMs?: number): Promise<void> {
    this.activeCount += 1;
    job.state = "running";
    job.startedAt = Date.now();
    let result: ACExecuteResult;
    try {
      result = await this.executor.execute(script, { timeout_ms: timeoutMs ?? this.config.timeoutMs });
    } catch (err: any) {
      result = {
        success: false,
        stdout: "",
        stderr: "",
        exitCode: -1,
        durationMs: Date.now() - (job.startedAt ?? Date.now()),
        error: err?.message ?? String(err),
      };
    }
    job.finishedAt = Date.now();
    job.stdout = result.stdout;
    job.stderr = result.stderr;
    job.exitCode = result.exitCode;
    job.error = result.error ?? null;
    job.durationMs = result.durationMs;
    if (result.success) {
      job.state = "succeeded";
    } else if (result.error === "timeout") {
      job.state = "timeout";
    } else {
      job.state = "failed";
    }
    this.activeCount -= 1;
    if (this.activeCount < 0) this.activeCount = 0;
  }

  private toJobResponse(job: JobRecord): Record<string, unknown> {
    return {
      jobId: job.jobId,
      route: job.route,
      state: job.state,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      durationMs: job.durationMs,
      exitCode: job.exitCode,
      error: job.error,
      stdout: job.stdout,
      stderr: job.stderr,
      tag: job.tag,
    };
  }

  private reapExpiredJobs(): void {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs) {
      if (job.finishedAt !== null && job.finishedAt < cutoff) {
        this.jobs.delete(id);
      }
    }
  }

  private sendJson(res: http.ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  }

  private buildExtractScript(databases: string[], outputDir: string): string {
    // Wraps prism_ac.extract_databases — the host-side Python module is
    // responsible for the actual database walk. See mcp-server/python/prism_ac.
    const dbsLiteral = JSON.stringify(databases);
    const outLiteral = JSON.stringify(outputDir);
    return [
      "import json, sys",
      "import prism_ac",
      `result = prism_ac.extract_databases(${dbsLiteral}, ${outLiteral})`,
      "sys.stdout.write(json.dumps(result))",
    ].join("\n");
  }

  private buildOptimizeScript(ncContent: string, controller: string, material: string): string {
    // Wraps prism_ac.optimize_ppp. nc_content is base64-encoded in transit to
    // avoid Python string-literal escaping pitfalls.
    const ncB64 = Buffer.from(ncContent, "utf8").toString("base64");
    return [
      "import json, base64, sys",
      "import prism_ac",
      `nc_text = base64.b64decode(${JSON.stringify(ncB64)}).decode("utf-8")`,
      `result = prism_ac.optimize_ppp(nc_text, ${JSON.stringify(controller)}, ${JSON.stringify(material)})`,
      "sys.stdout.write(json.dumps(result))",
    ].join("\n");
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const hyperMillACServerEngine = new HyperMillACServerEngine({
  config: { mockMode: process.env.PRISM_CAD_MOCK === "1" },
});
