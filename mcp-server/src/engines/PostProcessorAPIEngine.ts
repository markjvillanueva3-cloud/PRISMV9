/**
 * PostProcessorAPIEngine — HTTP API for Post Processor Pipeline
 *
 * Provides HTTP endpoints for CAM post processors to call PRISM's
 * optimization pipeline. Designed to be called from Fusion 360 .cps,
 * Mastercam .pst, NX TCL, or any HTTP-capable post processor.
 *
 * Endpoints:
 *   POST /api/post-process          — full pipeline optimization
 *   POST /api/post-process/resolve  — resolve context only
 *   GET  /api/post-process/machines — search machine catalog
 *   GET  /api/post-process/materials — search material DB
 *   GET  /api/post-process/controllers — list controller dialects
 *   GET  /api/post-process/health   — health check + version
 *
 * @module PostProcessorAPIEngine
 */

import http from "node:http";

export interface APIServerConfig {
  port: number;
  host?: string;
  cors?: boolean;
}

export interface APIServerStatus {
  running: boolean;
  port: number;
  url: string;
  version: string;
  uptime_s: number;
  requests_served: number;
}

const API_VERSION = "1.0.0";
const DEFAULT_PORT = 18361;

class PostProcessorAPIEngineImpl {
  private _server: http.Server | null = null;
  private _startTime = 0;
  private _requestCount = 0;
  private _port = DEFAULT_PORT;

  /**
   * Start the HTTP API server
   */
  async start(config?: Partial<APIServerConfig>): Promise<APIServerStatus> {
    if (this._server) {
      return this.status();
    }

    this._port = config?.port ?? DEFAULT_PORT;
    const host = config?.host ?? "127.0.0.1";
    const cors = config?.cors !== false;

    return new Promise((resolve, reject) => {
      this._server = http.createServer(async (req, res) => {
        this._requestCount++;

        // CORS headers
        if (cors) {
          res.setHeader("Access-Control-Allow-Origin", process.env.PRISM_CORS_ORIGIN || "http://127.0.0.1");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
          }
        }

        res.setHeader("Content-Type", "application/json");

        try {
          const url = new URL(req.url ?? "/", `http://${host}:${this._port}`);
          const path = url.pathname;

          // ── GET /api/post-process/health ──
          if (path === "/api/post-process/health" && req.method === "GET") {
            res.writeHead(200);
            res.end(JSON.stringify({
              status: "ok",
              version: API_VERSION,
              uptime_s: Math.round((Date.now() - this._startTime) / 1000),
              requests_served: this._requestCount,
              engine: "PostProcessorPipelineEngine",
              stages: 26,
              controllers: 17,
            }));
            return;
          }

          // ── GET /api/post-process/controllers ──
          if (path === "/api/post-process/controllers" && req.method === "GET") {
            const { controllerDialectEngine } = await import("./ControllerDialectEngine.js");
            res.writeHead(200);
            res.end(JSON.stringify(controllerDialectEngine.listDialects()));
            return;
          }

          // ── POST /api/post-process ──
          if (path === "/api/post-process" && req.method === "POST") {
            const body = await this._readBody(req);
            const params = JSON.parse(body);

            const { postProcessorPipelineEngine } = await import("./PostProcessorPipelineEngine.js");
            const result = await postProcessorPipelineEngine.process(params);

            res.writeHead(200);
            res.end(JSON.stringify({
              gcode: result.output_gcode,
              analytics: result.analytics,
              warnings: result.warnings,
              stages: result.stages.map(s => ({
                stage: s.stage, status: s.status, duration_ms: s.duration_ms, summary: s.summary,
              })),
              overall_status: result.overall_status,
              total_duration_ms: result.total_duration_ms,
              resolved: {
                machine: result.resolved.machine?.name,
                material: result.resolved.material?.name,
                tools: result.resolved.tools.length,
                controller: result.resolved.machine?.controller,
              },
            }));
            return;
          }

          // ── POST /api/post-process/resolve ──
          if (path === "/api/post-process/resolve" && req.method === "POST") {
            const body = await this._readBody(req);
            const params = JSON.parse(body);

            const { postProcessorPipelineEngine } = await import("./PostProcessorPipelineEngine.js");
            const result = await postProcessorPipelineEngine.process({
              ...params,
              gcode: params.gcode ?? "G0 X0\n",
              stages: {
                speed_feed: false, engagement_analysis: false, safety_analysis: false,
                playbook_rules: false, wear_progression: false, thermal_tracking: false,
                gcode_generation: false,
              },
            });

            res.writeHead(200);
            res.end(JSON.stringify(result.resolved));
            return;
          }

          // ── POST /api/post-process/verify ──
          if (path === "/api/post-process/verify" && req.method === "POST") {
            const body = await this._readBody(req);
            const params = JSON.parse(body);

            const { postProcessorVerificationEngine } = await import("./PostProcessorVerificationEngine.js");
            const result = postProcessorVerificationEngine.verify(params);

            res.writeHead(200);
            res.end(JSON.stringify(result));
            return;
          }

          // ── 404 ──
          res.writeHead(404);
          res.end(JSON.stringify({
            error: "Not Found",
            available_endpoints: [
              "POST /api/post-process",
              "POST /api/post-process/resolve",
              "POST /api/post-process/verify",
              "GET /api/post-process/controllers",
              "GET /api/post-process/health",
            ],
          }));
        } catch (err: any) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message ?? "Internal Server Error" }));
        }
      });

      this._server.listen(this._port, host, () => {
        this._startTime = Date.now();
        resolve(this.status());
      });

      this._server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          reject(new Error(`Port ${this._port} already in use`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Stop the HTTP API server
   */
  async stop(): Promise<void> {
    if (this._server) {
      return new Promise((resolve) => {
        this._server!.close(() => {
          this._server = null;
          resolve();
        });
      });
    }
  }

  /**
   * Get server status
   */
  status(): APIServerStatus {
    return {
      running: this._server !== null,
      port: this._port,
      url: `http://127.0.0.1:${this._port}`,
      version: API_VERSION,
      uptime_s: this._startTime > 0 ? Math.round((Date.now() - this._startTime) / 1000) : 0,
      requests_served: this._requestCount,
    };
  }

  private _readBody(req: http.IncomingMessage): Promise<string> {
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      req.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_BODY_SIZE) {
          req.destroy();
          reject(new Error("Request body too large"));
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }
}

export const postProcessorAPIEngine = new PostProcessorAPIEngineImpl();
export { PostProcessorAPIEngineImpl };
