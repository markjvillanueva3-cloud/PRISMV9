import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createKnowledgeExtRouter(callTool: CallToolFn): Router {
  const router = Router();
  router.post("/apprentice", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_knowledge_ext", "apprentice_explain", req.body) }); } catch (e) { next(e); }
  });
  router.post("/genome", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_knowledge_ext", "genome_lookup", req.body) }); } catch (e) { next(e); }
  });
  router.post("/graph", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_knowledge_ext", "graph_query", req.body) }); } catch (e) { next(e); }
  });
  router.post("/federated", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_knowledge_ext", "learn_query", req.body) }); } catch (e) { next(e); }
  });
  return router;
}
