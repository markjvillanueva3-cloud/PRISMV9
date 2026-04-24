/**
 * PRISM MCP Server — Data Routes
 * Material, tool, machine, and alarm lookups from registries
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { getCalculatorProgrammingEnvironments } from "../data/calculatorProgrammingCatalog.js";
import { getCalculatorToolHolderCatalog } from "../utils/calculatorToolHolderCatalog.js";
import { getCalculatorMachineCatalogRows } from "../utils/calculatorMachineCatalog.js";
import { getCalculatorWorkholdingCatalog } from "../utils/calculatorWorkholdingCatalog.js";
import { materialRegistry } from "../registries/MaterialRegistry.js";
import { machineRegistry } from "../registries/MachineRegistry.js";
import { toolRegistry } from "../registries/ToolRegistry.js";
type MachineMode = "mill" | "lathe" | "edm" | "wire_edm" | "laser" | "waterjet";

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
      if (req.body?.calculatorCatalog) {
        const registryRows = machineRegistry.search({
          limit: 5000,
          offset: 0,
        }).machines as unknown as Record<string, unknown>[];
        const result = getCalculatorMachineCatalogRows({
          registryRows,
          limit: req.body?.limit,
          offset: req.body?.offset,
        });
        res.json({ result });
        return;
      }
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
      const programming = getCalculatorProgrammingEnvironments(mode);
      res.json({
        result: {
          programming,
          total: programming.length,
          hasMore: false,
          source: "curated",
        },
      });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/workholding/catalog — Calculator curated workholding packages and presets
  router.post("/workholding/catalog", async (req, res, next) => {
    try {
      const mode = normalizeMachineMode(req.body?.mode);
      if (!mode) {
        res.json({
          result: {
            categoryOptions: [],
            brandOptions: [],
            presetOptions: [],
            stabilityOptions: [],
            total: 0,
            source: "curated",
            liveCount: 0,
            fallbackCount: 0,
            note: "Select a machine mode to load the workholding catalog slice.",
          },
        });
        return;
      }

      res.json({ result: getCalculatorWorkholdingCatalog(mode) });
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
