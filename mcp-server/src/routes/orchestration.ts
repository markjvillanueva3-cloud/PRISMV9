/**
 * PRISM MCP Server — Orchestration Routes
 * 26 endpoints for agent execution, plan management, swarm coordination, and roadmap operations
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createOrchestrationRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- Agent Execution ---

  // POST /orchestration/agent/execute — Execute single agent
  router.post("/agent/execute", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "agent_execute", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/agent/parallel — Execute agents in parallel
  router.post("/agent/parallel", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "agent_parallel", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/agent/pipeline — Execute agent pipeline
  router.post("/agent/pipeline", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "agent_pipeline", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Plan Management ---

  // POST /orchestration/plan/create — Create execution plan
  router.post("/plan/create", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "plan_create", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/plan/execute — Execute plan
  router.post("/plan/execute", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "plan_execute", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /orchestration/plan/status — Plan execution status
  router.get("/plan/status", async (_req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "plan_status");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Queue & Sessions ---

  // GET /orchestration/queue/stats — Queue statistics
  router.get("/queue/stats", async (_req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "queue_stats");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /orchestration/sessions — List active sessions
  router.get("/sessions", async (_req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "session_list");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Swarm Operations ---

  // POST /orchestration/swarm/execute — Execute swarm task
  router.post("/swarm/execute", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_execute", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/swarm/parallel — Parallel swarm execution
  router.post("/swarm/parallel", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_parallel", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/swarm/consensus — Swarm consensus decision
  router.post("/swarm/consensus", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_consensus", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/swarm/pipeline — Swarm pipeline execution
  router.post("/swarm/pipeline", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_pipeline", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /orchestration/swarm/status — Swarm execution status
  router.get("/swarm/status", async (_req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_status");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /orchestration/swarm/patterns — Available swarm patterns
  router.get("/swarm/patterns", async (_req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_patterns");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/swarm/quick — Quick swarm execution
  router.post("/swarm/quick", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "swarm_quick", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Roadmap Operations ---

  // POST /orchestration/roadmap/plan — Create roadmap plan
  router.post("/roadmap/plan", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_plan", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/next-batch — Get next roadmap batch
  router.post("/roadmap/next-batch", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_next_batch", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/advance — Advance roadmap position
  router.post("/roadmap/advance", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_advance", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/gate — Run roadmap phase gate
  router.post("/roadmap/gate", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_gate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /orchestration/roadmap/list — List roadmap milestones
  router.get("/roadmap/list", async (_req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_list");
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/load — Load roadmap definition
  router.post("/roadmap/load", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_load", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/claim — Claim roadmap unit
  router.post("/roadmap/claim", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_claim", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/release — Release roadmap unit
  router.post("/roadmap/release", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_release", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/heartbeat — Roadmap worker heartbeat
  router.post("/roadmap/heartbeat", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_heartbeat", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/discover — Discover roadmap files
  router.post("/roadmap/discover", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_discover", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /orchestration/roadmap/register — Register roadmap
  router.post("/roadmap/register", async (req, res) => {
    try {
      const result = await callTool("prism_orchestrate", "roadmap_register", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
