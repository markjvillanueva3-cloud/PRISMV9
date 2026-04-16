/**
 * PRISM Agent — REST Routes
 * ===========================
 *
 * AGENT-MS5 U-AGT16 — Exposes the PRISM Agent (AGENT-MS1–MS4 engine stack)
 * as HTTP endpoints. Mirrors prism_agent MCP dispatcher 1:1 so callers can
 * pick either transport based on their environment.
 *
 * Endpoints:
 *   POST   /api/v1/agent/chat              — synchronous agentic loop
 *   GET    /api/v1/agent/stream            — SSE streaming (per-phase events)
 *   GET    /api/v1/agent/capabilities      — action + engine introspection
 *   POST   /api/v1/agent/memory            — memory operations (op in body)
 *   POST   /api/v1/agent/self-awareness    — build self-model
 *   GET    /api/v1/agent/stats             — aggregate agent telemetry
 *
 * All endpoints delegate to callTool("prism_agent", action, params) so the
 * underlying agentDispatcher is the single source of truth — no duplicated
 * logic between MCP and REST.
 *
 * @module routes/agent
 * @milestone AGENT-MS5 (U-AGT16)
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { requireFields } from "../middleware/validation.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import type { CallToolFn } from "./index.js";

/**
 * Unwrap the MCP callTool result — dispatchers return
 * { content: [{ text: JSON.stringify({success, data}) }] }. This peels the
 * envelope so callers see the data directly.
 */
function unwrap(toolResult: any): { success: boolean; data?: any; error?: string } {
  try {
    const text = toolResult?.content?.[0]?.text;
    if (typeof text === "string") {
      return JSON.parse(text);
    }
  } catch {
    // fall through
  }
  return { success: false, error: "Invalid tool response envelope" };
}

/**
 * Creates the agent router.
 */
export function createAgentRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/agent/chat — synchronous agentic loop
  router.post(
    "/chat",
    rateLimitMiddleware("RL-AGENT-CHAT", "user"),
    requireFields("text"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await callTool("prism_agent", "chat", {
          text: req.body.text,
          context: req.body.context,
          config: req.body.config,
        });
        const unwrapped = unwrap(result);
        res.json({ result: unwrapped });
      } catch (e) {
        next(e);
      }
    }
  );

  // GET /api/v1/agent/stream?text=... — SSE streaming per agentic phase
  // For now this runs the loop synchronously then emits the completed
  // response as a single SSE event. True token-level streaming requires
  // LLMEngine plumbing (deferred to U-AGT19 follow-up).
  router.get(
    "/stream",
    rateLimitMiddleware("RL-AGENT-STREAM", "user"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const text = String(req.query.text ?? "");
        if (!text) {
          res.status(400).json({ error: "text query param required" });
          return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        const writeEvent = (event: string, data: unknown): void => {
          res.write(`event: ${event}\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        writeEvent("start", { text, phase: "observe" });

        const result = await callTool("prism_agent", "chat", { text });
        const unwrapped = unwrap(result);

        if (unwrapped.success && unwrapped.data?.phases) {
          for (const phase of unwrapped.data.phases) {
            writeEvent("phase", { phase });
          }
        }
        writeEvent("complete", unwrapped);
        res.end();
      } catch (e) {
        next(e);
      }
    }
  );

  // GET /api/v1/agent/capabilities?op=search&query=lathe
  router.get(
    "/capabilities",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const op = String(req.query.op ?? "stats");
        const params: Record<string, any> = { op };
        for (const key of ["query", "tool", "category", "name", "target", "limit"]) {
          if (req.query[key] !== undefined) params[key] = req.query[key];
        }
        if (params.limit) params.limit = Number(params.limit);

        const result = await callTool("prism_agent", "capabilities", params);
        const unwrapped = unwrap(result);
        res.json({ result: unwrapped });
      } catch (e) {
        next(e);
      }
    }
  );

  // POST /api/v1/agent/memory — memory operations
  router.post(
    "/memory",
    rateLimitMiddleware("RL-AGENT-MEMORY", "user"),
    requireFields("op"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await callTool("prism_agent", "memory", req.body);
        const unwrapped = unwrap(result);
        res.json({ result: unwrapped });
      } catch (e) {
        next(e);
      }
    }
  );

  // POST /api/v1/agent/context — create/add/compact a conversation context
  router.post(
    "/context",
    rateLimitMiddleware("RL-AGENT-CONTEXT", "user"),
    requireFields("op"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const op = req.body.op as string;
        let action: string;
        switch (op) {
          case "create":
            action = "context_create";
            break;
          case "add":
            action = "context_add";
            break;
          case "compact":
            action = "context_compact";
            break;
          default:
            res.status(400).json({ error: `Invalid op: ${op}. Use create/add/compact` });
            return;
        }
        const result = await callTool("prism_agent", action, req.body);
        const unwrapped = unwrap(result);
        res.json({ result: unwrapped });
      } catch (e) {
        next(e);
      }
    }
  );

  // POST /api/v1/agent/self-awareness — build identity model
  router.post(
    "/self-awareness",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await callTool("prism_agent", "self_awareness", req.body);
        const unwrapped = unwrap(result);
        res.json({ result: unwrapped });
      } catch (e) {
        next(e);
      }
    }
  );

  // GET /api/v1/agent/stats — aggregate agent telemetry
  router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await callTool("prism_agent", "stats", {});
      const unwrapped = unwrap(result);
      res.json({ result: unwrapped });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
