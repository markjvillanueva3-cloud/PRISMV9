/**
 * PRISM MCP Server — Data Routes
 * Material, tool, machine, and alarm lookups from registries
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { getCalculatorToolHolderCatalog } from "../utils/calculatorToolHolderCatalog.js";
import { materialRegistry } from "../registries/MaterialRegistry.js";
import { machineRegistry } from "../registries/MachineRegistry.js";
import { toolRegistry } from "../registries/ToolRegistry.js";
type MachineMode = "mill" | "lathe" | "edm" | "wire_edm" | "laser" | "waterjet";

let _programmingEnvCache: Array<{ mode: string; [k: string]: unknown }> | null = null;
async function getProgrammingEnvironments(): Promise<Array<{ mode: string; [k: string]: unknown }>> {
  if (!_programmingEnvCache) {
    // Dynamic path prevents TS from resolving outside rootDir
    const p = ["../../web/src/data/calculatorWorkspace.js"].join("");
    const mod = await import(p);
    _programmingEnvCache = mod.PROGRAMMING_ENVIRONMENTS;
  }
  return _programmingEnvCache!;
}

function normalizeMachineMode(value: unknown): MachineMode | undefined {
  return typeof value === "string"
    && ["mill", "lathe", "edm", "wire_edm", "laser", "waterjet"].includes(value)
    ? (value as MachineMode)
    : undefined;
}

/** Creates data router.
 * @param callTool - call tool
 * @returns router
 */
export function createDataRouter(callTool: CallToolFn): Router {
  const router = Router();

  // GET /api/v1/data/material/:id — Get material by ID
  router.get("/material/:id", async (req, res, next) => {
    try {
      await materialRegistry.load();
      const result = await materialRegistry.getByIdOrName(req.params.id);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/material/search — Search materials
  router.post("/material/search", async (req, res, next) => {
    try {
      const result = await materialRegistry.search(req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/tool/:id — Get tool by ID
  router.get("/tool/:id", async (req, res, next) => {
    try {
      await toolRegistry.load();
      const result = await toolRegistry.getByIdOrCatalog(req.params.id);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/tool/search — Search tools
  router.post("/tool/search", async (req, res, next) => {
    try {
      await toolRegistry.load();
      const result = toolRegistry.search(req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/machine/:id — Get machine by ID
  router.get("/machine/:id", async (req, res, next) => {
    try {
      await machineRegistry.load();
      const result = machineRegistry.getByIdOrModel(req.params.id);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/machine/search — Search machines
  router.post("/machine/search", async (req, res, next) => {
    try {
      await machineRegistry.load();
      const result = machineRegistry.search(req.body ?? {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/holder/catalog — Calculator holder packages from the full holder database
  router.post("/holder/catalog", async (req, res, next) => {
    try {
      const result = {
        holders: getCalculatorToolHolderCatalog(req.body ?? {}),
      };
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/programming/catalog — Calculator programming packages and toolpaths
  router.post("/programming/catalog", async (req, res, next) => {
    try {
      const mode = normalizeMachineMode(req.body?.mode);
      const allEnvs = await getProgrammingEnvironments();
      const programming = mode
        ? allEnvs.filter((environment) => environment.mode === mode)
        : allEnvs;
      res.json({
        result: {
          programming,
          total: programming.length,
          hasMore: false,
        },
      });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/alarm/decode — Decode machine alarm
  router.post("/alarm/decode", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "alarm_decode", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
