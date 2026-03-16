/**
 * PRISM MCP Server — Pipeline Routes
 * Print-to-Program 7-step wizard: analyze, tools, sequence, speed-feed, program, quote, ROI
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates pipeline router.
 * @param callTool - call tool
 * @returns router
 */
export function createPipelineRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/pipeline/analyze — Extract features from print/description
  router.post("/analyze", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "print_to_program", {
        ...req.body,
        stage: "analyze_only",
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/tools — Select tools from inventory
  router.post("/tools", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "inventory_tool_select", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/sequence — Generate operation sequence
  router.post("/sequence", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "sequence_operations", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/speed-feed — Calculate S/F for operations
  router.post("/speed-feed", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sf_orchestrate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/program — Assemble CNC program
  router.post("/program", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "program_assemble", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/quote — Cost estimation
  router.post("/quote", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "quote_generate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/roi — ROI upgrade suggestions
  router.post("/roi", async (req, res, next) => {
    try {
      const result = await callTool("prism_business", "roi_advisor", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/full — Run complete pipeline
  router.post("/full", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "print_to_program", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/fusion360 — Generate F360 script
  router.post("/fusion360", async (req, res, next) => {
    try {
      const result = await callTool("prism_cam", "fusion360_generate", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
