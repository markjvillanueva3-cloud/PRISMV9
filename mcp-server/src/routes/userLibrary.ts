import { Router } from "express";

export function createUserLibraryRouter(): Router {
  const router = Router();

  // Dynamic import to avoid circular deps
  const getPersistence = async () => {
    const { persistenceService } = await import("../engines/UserToolLibraryPersistence.js");
    return persistenceService;
  };

  // ── Tool Library ──
  router.get("/tools", async (_req, res, next) => {
    try {
      const p = await getPersistence();
      res.json({ tools: p.loadTools() });
    } catch (e) { next(e); }
  });

  router.post("/tools", async (req, res, next) => {
    try {
      const p = await getPersistence();
      const tool = p.addTool(req.body);
      res.status(201).json({ tool });
    } catch (e) { next(e); }
  });

  router.put("/tools/:id", async (req, res, next): Promise<void> => {
    try {
      const p = await getPersistence();
      const tool = p.updateTool(req.params.id, req.body);
      if (!tool) { res.status(404).json({ error: "Tool not found" }); return; }
      res.json({ tool });
    } catch (e) { next(e); }
  });

  router.delete("/tools/:id", async (req, res, next): Promise<void> => {
    try {
      const p = await getPersistence();
      const ok = p.removeTool(req.params.id);
      if (!ok) { res.status(404).json({ error: "Tool not found" }); return; }
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // ── Machine Registry ──
  router.get("/machines", async (_req, res, next) => {
    try {
      const p = await getPersistence();
      res.json({ machines: p.loadMachines() });
    } catch (e) { next(e); }
  });

  router.post("/machines", async (req, res, next) => {
    try {
      const p = await getPersistence();
      const machine = p.addMachine(req.body);
      res.status(201).json({ machine });
    } catch (e) { next(e); }
  });

  router.put("/machines/:id", async (req, res, next): Promise<void> => {
    try {
      const p = await getPersistence();
      const machine = p.updateMachine(req.params.id, req.body);
      if (!machine) { res.status(404).json({ error: "Machine not found" }); return; }
      res.json({ machine });
    } catch (e) { next(e); }
  });

  router.delete("/machines/:id", async (req, res, next): Promise<void> => {
    try {
      const p = await getPersistence();
      const ok = p.removeMachine(req.params.id);
      if (!ok) { res.status(404).json({ error: "Machine not found" }); return; }
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  return router;
}
