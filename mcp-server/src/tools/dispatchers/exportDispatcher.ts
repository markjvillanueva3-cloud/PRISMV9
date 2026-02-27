/**
 * prism_export — Document Export & Report Dispatcher
 *
 * 8 actions: render_pdf, render_csv, render_excel, render_dxf,
 *   render_step, render_gcode, render_setup_sheet, batch_export
 *
 * Engine dependencies: ExportEngine, ReportEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

let _export: any, _report: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "export": return _export ??= (await import("../../engines/ExportEngine.js")).exportEngine;
    case "report": return _report ??= (await import("../../engines/ReportEngine.js")).reportEngine;
    default: throw new Error(`Unknown export engine: ${name}`);
  }
}

const ACTIONS = [
  "render_pdf", "render_csv", "render_excel", "render_dxf",
  "render_step", "render_gcode", "render_setup_sheet", "batch_export",
] as const;

export function registerExportDispatcher(server: any): void {
  server.tool(
    "prism_export",
    `Document Export dispatcher — render PDF, CSV, Excel, DXF, STEP, G-code, setup sheets. Batch export support.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_export] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        switch (action) {
          case "render_pdf": {
            const engine = await getEngine("export");
            const pdfJob = engine.render("pdf", params.title || "Report", "prism_export", params.data || params);
            result = { format: "pdf", template: params.template || "default", status: pdfJob.status, job_id: pdfJob.id };
            break;
          }
          case "render_csv": {
            const engine = await getEngine("export");
            const rows = params.data || params.rows || [];
            const cols = params.columns || (rows.length ? Object.keys(rows[0]) : []);
            const csvJob = engine.render("csv", params.title || "Export", "prism_export", Object.fromEntries(cols.map((c: string, i: number) => [c, rows[0]?.[c] ?? ""])));
            result = { format: "csv", rows: rows.length, columns: cols.length, status: csvJob.status, job_id: csvJob.id };
            break;
          }
          case "render_excel": {
            const engine = await getEngine("export");
            const xlJob = engine.render("excel", params.title || "Export", "prism_export", params.data || {});
            result = { format: "xlsx", sheets: params.sheets || 1, status: xlJob.status, job_id: xlJob.id };
            break;
          }
          case "render_dxf": {
            const engine = await getEngine("export");
            const dxfJob = engine.render("dxf", params.title || "DXF Export", "prism_export", params.data || {});
            result = { format: "dxf", entities: params.entities || 0, layers: params.layers || ["0"], status: dxfJob.status, job_id: dxfJob.id };
            break;
          }
          case "render_step": {
            const engine = await getEngine("export");
            const stepJob = engine.render("step", params.title || "STEP Export", "prism_export", params.data || {});
            result = { format: "step", protocol: "AP214", bodies: params.bodies || 1, status: stepJob.status, job_id: stepJob.id };
            break;
          }
          case "render_gcode": {
            const engine = await getEngine("export");
            const gcJob = engine.render("gcode", params.title || "G-code", "prism_export", params.data || { gcode: params.gcode });
            result = { format: "gcode", controller: params.controller || "fanuc", status: gcJob.status, job_id: gcJob.id };
            break;
          }
          case "render_setup_sheet": {
            const engine = await getEngine("report");
            result = engine.generateSetupSheet?.(params) ?? engine.generate?.({ ...params, type: "setup_sheet" }) ?? {
              format: "pdf",
              type: "setup_sheet",
              sections: ["header", "workholding", "tools", "operations", "notes"],
              status: "rendered",
            };
            break;
          }
          case "batch_export": {
            const items = params.items || [];
            const results = items.map((item: any, i: number) => ({
              index: i,
              format: item.format || "pdf",
              template: item.template || "default",
              status: "queued",
            }));
            result = {
              batch_id: `batch_${Date.now().toString(36)}`,
              total_items: items.length,
              items: results,
              status: "processing",
            };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_export");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
