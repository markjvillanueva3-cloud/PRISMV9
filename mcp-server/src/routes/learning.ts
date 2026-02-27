/**
 * PRISM MCP Server — Learning & Knowledge Product Routes
 * 10 endpoints wrapping LearningPath, Knowledge, TribalKnowledge,
 * Selection engines, and DigitalTwin
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createLearningRouter(callTool: CallToolFn): Router {
  const router = Router();

  // --- Learning Paths ---

  // POST /learning/assess — Assess operator skill levels
  router.post("/assess", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "learning_assess", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /learning/plan — Generate personalized learning plan
  router.post("/plan", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "learning_plan", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /learning/progress — Track learning progress
  router.post("/progress", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "learning_progress", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /learning/recommend — Recommend next learning modules
  router.post("/recommend", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "learning_recommend", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Knowledge ---

  // POST /learning/knowledge/search — Search manufacturing knowledge base
  router.post("/knowledge/search", async (req, res) => {
    try {
      const result = await callTool("prism_knowledge", "search", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /learning/tribal — Search tribal/shop floor knowledge
  router.post("/tribal", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "tribal_search", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Selection Guides ---

  // POST /learning/select/material — Material selection wizard
  router.post("/select/material", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "material_select", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /learning/select/tool — Tool selection wizard
  router.post("/select/tool", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "tool_select", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /learning/select/machine — Machine selection wizard
  router.post("/select/machine", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "machine_select", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // --- Digital Twin ---

  // POST /learning/twin — Digital twin operations
  router.post("/twin", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "digital_twin", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
