/**
 * Data Access Dispatcher - Consolidates 14 data tools → 1 dispatcher
 * Actions: material_get/search/compare, machine_get/search/capabilities,
 *          tool_get/search/recommend, alarm_decode/search/fix, formula_get/calculate
 */

import { z } from "zod";
import { registryManager } from "../../registries/index.js";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { validateMaterialSanity } from "../../validation/materialSanity.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";

const DataDispatcherSchema = z.object({
  action: z.enum([
    "material_get", "material_search", "material_compare",
    "machine_get", "machine_search", "machine_capabilities",
    "tool_get", "tool_search", "tool_recommend",
    "alarm_decode", "alarm_search", "alarm_fix",
    "formula_get", "formula_calculate"
  ]),
  params: z.record(z.any()).optional()
});

function jsonResponse(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerDataDispatcher(server: any): void {
  server.tool(
    "prism_data",
    "Data access layer: material get/search/compare, machine get/search/capabilities, cutting tool get/search/recommend, alarm decode/search/fix, formula get/calculate. Actions: material_get, material_search, material_compare, machine_get, machine_search, machine_capabilities, tool_get, tool_search, tool_recommend, alarm_decode, alarm_search, alarm_fix, formula_get, formula_calculate",
    DataDispatcherSchema.shape,
    async ({ action, params = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_data] action=${action}`, params);
      await registryManager.initialize();
      let result: any;

      try {
        switch (action) {
          // === MATERIAL (3) ===
          case "material_get": {
            const matId = params.identifier || params.material_id || params.id || params.name;
            if (!matId) return jsonResponse({ error: "Missing material identifier. Provide 'identifier', 'material_id', or 'name'." });
            const mat = await registryManager.materials.getByIdOrName(matId);
            if (!mat) return jsonResponse({ error: `Material not found: ${matId}` });
            let out: any = mat;
            if (params.fields?.length) {
              out = { id: mat.id, name: mat.name };
              for (const f of params.fields) { if (f in mat) out[f] = (mat as any)[f]; }
            }
            result = out;
            break;
          }
          case "material_search": {
            result = await registryManager.materials.search({
              query: params.query, iso_group: params.iso_group, category: params.category,
              hardness_min: params.hardness_min, hardness_max: params.hardness_max,
              machinability_min: params.machinability_min, has_kienzle: params.has_kienzle,
              has_taylor: params.has_taylor, limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "material_compare": {
            result = await registryManager.materials.compare(params.material_ids);
            break;
          }

          // === MACHINE (3) ===
          case "machine_get": {
            const machineId = params.identifier || params.machine_id || params.id || params.model;
            if (!machineId) return jsonResponse({ error: "machine_get requires 'identifier', 'machine_id', 'id', or 'model' parameter" });
            const machine = registryManager.machines.getByIdOrModel(machineId);
            if (!machine) return jsonResponse({ error: `Machine not found: ${machineId}` });
            result = machine;
            break;
          }
          case "machine_search": {
            result = registryManager.machines.search({
              query: params.query, manufacturer: params.manufacturer, type: params.type,
              controller: params.controller, min_x_travel: params.min_x_travel,
              min_y_travel: params.min_y_travel, min_z_travel: params.min_z_travel,
              min_spindle_rpm: params.min_spindle_rpm, min_spindle_power: params.min_spindle_power,
              min_tool_capacity: params.min_tool_capacity, simultaneous_axes: params.simultaneous_axes,
              high_speed: params.high_speed, limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "machine_capabilities": {
            const capsId = params.identifier || params.machine_id || params.id || params.model;
            if (!capsId) return jsonResponse({ error: "machine_capabilities requires 'identifier', 'machine_id', 'id', or 'model' parameter" });
            const caps = registryManager.machines.getCapabilities(capsId);
            if (!caps) return jsonResponse({ error: `Machine not found: ${capsId}` });
            result = caps;
            break;
          }

          // === CUTTING TOOL (3) ===
          case "tool_get": {
            const toolId = params.identifier || params.tool_id || params.id || params.catalog;
            if (!toolId) return jsonResponse({ error: "tool_get requires 'identifier', 'tool_id', 'id', or 'catalog' parameter" });
            const tool = await registryManager.tools.getByIdOrCatalog(toolId);
            if (!tool) return jsonResponse({ error: `Tool not found: ${toolId}` });
            result = tool;
            break;
          }
          case "tool_search": {
            result = registryManager.tools.search({
              query: params.query, type: params.type, manufacturer: params.manufacturer,
              material_group: params.material_group, diameter_min: params.diameter_min,
              diameter_max: params.diameter_max, diameter_exact: params.diameter_exact,
              flutes: params.flutes, coating: params.coating,
              limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "tool_recommend": {
            const recMatId = params.material_id || params.material || params.identifier;
            if (!recMatId) return jsonResponse({ error: "tool_recommend requires 'material_id' or 'material' parameter" });
            const mat = await registryManager.materials.getByIdOrName(recMatId);
            if (!mat) return jsonResponse({ error: `Material not found: ${params.material_id}` });
            result = registryManager.tools.recommendTools({
              material_group: mat.iso_group, operation: params.operation,
              diameter: params.diameter, limit: params.limit ?? 5
            });
            break;
          }

          // === ALARM (3) ===
          case "alarm_decode": {
            const alarmCode = params.code || params.alarm_code || params.identifier;
            if (!alarmCode) return jsonResponse({ error: "alarm_decode requires 'code' or 'alarm_code' parameter" });
            const controller = params.controller || params.manufacturer || "UNKNOWN";
            const alarm = await registryManager.alarms.decode(controller, alarmCode);
            if (!alarm) return jsonResponse({ error: `Alarm not found: ${alarmCode} (controller: ${controller})` });
            result = alarm;
            break;
          }
          case "alarm_search": {
            result = await registryManager.alarms.search({
              query: params.query, controller: params.controller, category: params.category,
              severity: params.severity, has_fix: params.has_fix,
              limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "alarm_fix": {
            const fixAlarmId = params.alarm_id || params.id || params.code;
            if (!fixAlarmId) return jsonResponse({ error: "alarm_fix requires 'alarm_id' or 'code' parameter" });
            const alm = await registryManager.alarms.get(fixAlarmId);
            if (!alm) return jsonResponse({ error: `Alarm not found: ${params.alarm_id}` });
            result = { alarm_id: alm.alarm_id, name: alm.name, quick_fix: alm.quick_fix,
              fix_procedures: alm.fix_procedures, related_alarms: alm.related_alarms };
            break;
          }

          // === FORMULA (2) ===
          case "formula_get": {
            const fid = params.formula_id || params.id || params.name;
            if (!fid) return jsonResponse({ error: "formula_get requires 'formula_id' parameter" });
            const formula = await registryManager.formulas.getFormula(fid);
            if (!formula) return jsonResponse({ error: `Formula not found: ${params.formula_id}` });
            result = formula;
            break;
          }
          case "formula_calculate": {
            // Fire pre-calculation hooks (blocking if safety issues)
            const hookCtx = {
              operation: "formula_calculate",
              target: { type: "calculation" as const, id: params.formula_id, data: params },
              metadata: { dispatcher: "dataDispatcher", formula_id: params.formula_id, inputs: params.inputs }
            };
            const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
            if (preResult.blocked) {
              return jsonResponse({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, formula_id: params.formula_id });
            }
            
            const calcResult = await registryManager.formulas.calculate(params.formula_id, params.inputs);
            result = { formula_id: params.formula_id, inputs: params.inputs,
              result: calcResult.result, validation: calcResult.validation };
            
            // Fire post-calculation hooks (non-blocking)
            try { await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } }); }
            catch (e) { log.warn(`[dataDispatcher] Post-calc hook error: ${e}`); }
            break;
          }

          default:
            return jsonResponse({ error: `Unknown action: ${action}` });
        }
      } catch (err: any) {
        return jsonResponse({ error: `${action} failed: ${err.message}` });
      }

      return jsonResponse(slimResponse(result, getSlimLevel(getCurrentPressurePct())));
    }
  );

  log.info("[dataDispatcher] Registered prism_data (14 actions)");
}
