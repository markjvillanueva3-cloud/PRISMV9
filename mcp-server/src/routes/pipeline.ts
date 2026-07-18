/**
 * PRISM MCP Server — Pipeline Routes
 * Print-to-Program 9-step wizard: analyze, tools, sequence, speed-feed, program, quote, ROI, full, fusion360
 *
 * Each route adapts the frontend's generic pipeline params:
 *   { description, material, quantity, machine, stock, goal }
 * into the specific parameter shape each dispatcher action requires.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { redactInternalMarginFields } from "./quote.js";
import { unwrapDispatcherEnvelope } from "./dispatcher-envelope.js";

/** Map common material names → ISO 513 group codes for dispatcher params */
function materialToIso(material: string): string {
  const m = (material ?? "").toLowerCase();
  if (m.includes("ti") || m.includes("titanium") || m.includes("inconel") || m.includes("nickel")) return "S";
  if (m.includes("stainless") || m.includes("316") || m.includes("304")) return "M";
  if (m.includes("aluminum") || m.includes("al") || m.includes("6061") || m.includes("7075")) return "N";
  if (m.includes("cast iron") || m.includes("ductile")) return "K";
  if (m.includes("hardened") || m.includes("hrc")) return "H";
  return "P"; // default: steel
}

/** Map machine name → controller dialect */
function machineToController(machine: string): "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma" {
  const m = (machine ?? "").toLowerCase();
  if (m.includes("haas")) return "haas";
  if (m.includes("siemens") || m.includes("sinumerik")) return "siemens";
  if (m.includes("heidenhain")) return "heidenhain";
  if (m.includes("mazak")) return "mazak";
  if (m.includes("okuma")) return "okuma";
  return "fanuc"; // default
}

export function createPipelineRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/pipeline/analyze — Extract features from print/description
  router.post("/analyze", async (req, res, next) => {
    try {
      const { description, material } = req.body;
      const result = await callTool("prism_cad", "dfm_analyze", {
        features: [{
          name: "part_analysis",
          type: "pocket",
          description: description ?? "Unknown part",
          material: material ?? "steel",
          tolerance_mm: 0.05,
          dimensions: { length: 100, width: 100, depth: 30 },
        }],
        material: material ?? "steel",
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/tools — Select tools from inventory
  router.post("/tools", async (req, res, next) => {
    try {
      const { material, description } = req.body;
      const result = await callTool("prism_calc", "tool_select_recommend", {
        operation: "face_milling",
        material_iso_group: materialToIso(material),
        tool_diameter_mm: 12,
        description,
      });
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
      const result = await callTool("prism_calc", "sf_orchestrate", {
        material: req.body.material ?? "steel",
        operation: "face_milling",
        tool_diameter_mm: 12,
        doc_mm: 2,
        woc_mm: 8,
        num_flutes: 4,
        machine: req.body.machine,
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/program — Assemble CNC program
  router.post("/program", async (req, res, next) => {
    try {
      const controller = machineToController(req.body.machine);
      const result = await callTool("prism_cam", "program_assemble", {
        controller,
        material: req.body.material ?? "steel",
        iso_group: materialToIso(req.body.material),
        operations: [{
          operation: "face_mill",
          tool_number: 1,
          tool_diameter_mm: 12,
          flutes: 4,
          tool_type: "endmill",
          tool_material: "carbide",
          z_top: 0,
          z_depth: -2,
          z_safe: 5,
          axial_depth_mm: 2,
          radial_depth_mm: 8,
          cut_type: "roughing",
          strategy: "conventional",
          coolant: "flood",
        }],
        optimize_for: "balanced",
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/quote — Cost estimation
  router.post("/quote", async (req, res, next) => {
    try {
      const result = await callTool("prism_intelligence", "process_cost", {
        operations: [{
          name: "setup",
          time_min: 30,
          tool: "fixture",
        }, {
          name: "face_mill",
          time_min: 15,
          tool: "12mm endmill",
        }, {
          name: "pocket",
          time_min: 45,
          tool: "8mm endmill",
        }],
        material: req.body.material ?? "steel",
        quantity: req.body.quantity ?? 1,
      });
      // U-COST-ROUTE-REDACT: process_cost returns the shop's internal cost stack (total/machine/tool/
      // setup cost + inputs.machine_rate_per_hour). This route is mounted under /api optionalToken
      // (never rejects anon), so strip the cost basis when the caller is unauthenticated (req.userId
      // unset). Authenticated callers get the full breakdown. Same gate as cost.ts /estimate.
      const safe = !req.userId ? redactInternalMarginFields(result) : result;
      res.json({ result: safe });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/roi — ROI upgrade suggestions
  // prism_business returns a bare {type,text} slimResponse the production callTool
  // cannot peel; unwrap it so the FE (pipelineApi.roi -> .result) receives the parsed
  // ROI object, not the envelope. Scope: prism_business ONLY -- every other route in
  // this file calls prism_calc/cad/intelligence (content[]-wrapped, already peeled).
  router.post("/roi", async (req, res, next) => {
    try {
      const result = unwrapDispatcherEnvelope(
        await callTool("prism_business", "roi_advisor_analyze", req.body),
      );
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/full — Run complete pipeline
  router.post("/full", async (req, res, next) => {
    try {
      const result = await callTool("prism_calc", "sampling_print_to_program", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/pipeline/fusion360 — Generate F360 script
  router.post("/fusion360", async (req, res, next) => {
    try {
      const result = await callTool("prism_cad", "f360_from_description", {
        description: req.body.description ?? "Simple bracket",
        material: req.body.material,
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
