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
import { getCalculatorCoatingCatalog } from "../utils/calculatorCoatingCatalog.js";
import { getCalculatorInsertCatalog } from "../utils/calculatorInsertCatalog.js";
import { getCalculatorCoolantCatalog } from "../utils/calculatorCoolantCatalog.js";
import { getCalculatorCoolantProductCatalog } from "../utils/calculatorCoolantProductCatalog.js";
import { getCalculatorTurningInsertCatalog } from "../utils/calculatorLatheInsertCatalog.js";
import { getCalculatorStockCatalog } from "../utils/calculatorStockCatalog.js";
import { getCalculatorMaterialCatalog } from "../utils/calculatorMaterialCatalog.js";
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

  // GET /api/v1/data/material/catalog -- Workpiece-material select/datalist catalog
  // from the full MaterialRegistry (245+ ISO-classified alloys). MUST be registered
  // BEFORE "/material/:id" or Express routes "catalog" into the :id handler.
  router.get("/material/catalog", async (_req, res, next) => {
    try {
      await materialRegistry.load();
      const { materials } = await materialRegistry.search({ limit: 100000, offset: 0 });
      res.json({ result: getCalculatorMaterialCatalog({ registryRows: materials }) });
    } catch (e) { next(e); }
  });

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

  // GET /api/v1/data/coating/catalog -- Tool-coating select catalog from the consolidated reference DB
  router.get("/coating/catalog", async (_req, res, next) => {
    try {
      res.json({ result: getCalculatorCoatingCatalog() });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/insert/catalog -- Indexable-insert select catalog from the consolidated reference DB
  router.get("/insert/catalog", async (_req, res, next) => {
    try {
      res.json({ result: getCalculatorInsertCatalog() });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/coolant/catalog -- Coolant-method select catalog from the consolidated reference DB
  router.get("/coolant/catalog", async (_req, res, next) => {
    try {
      res.json({ result: getCalculatorCoolantCatalog() });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/coolant-product/catalog -- Coolant-PRODUCT select catalog (vendor brands, flood + MQL)
  router.get("/coolant-product/catalog", async (_req, res, next) => {
    try {
      res.json({ result: getCalculatorCoolantProductCatalog() });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/turning-insert/catalog -- Turning (lathe) insert select catalog from the consolidated reference DB
  router.get("/turning-insert/catalog", async (_req, res, next) => {
    try {
      res.json({ result: getCalculatorTurningInsertCatalog() });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/stock/catalog -- Raw-material stock select catalog from the persisted JM-Die stock store
  router.get("/stock/catalog", async (_req, res, next) => {
    try {
      res.json({ result: getCalculatorStockCatalog() });
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
