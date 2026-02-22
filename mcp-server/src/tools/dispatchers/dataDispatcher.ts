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
    "tool_get", "tool_search", "tool_recommend", "tool_facets",
    "alarm_decode", "alarm_search", "alarm_fix",
    "formula_get", "formula_calculate",
    "cross_query", "machine_toolholder_match", "alarm_diagnose", "speed_feed_calc", "tool_compare",
    "material_substitute"
  ]),
  params: z.record(z.any()).optional()
});

function jsonResponse(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerDataDispatcher(server: any): void {
  server.tool(
    "prism_data",
    "Data access layer: material get/search/compare, machine get/search/capabilities, cutting tool get/search/recommend/facets, alarm decode/search/fix, formula get/calculate, cross_query (material+operation+machine→full params), machine_toolholder_match (spindle→holders), alarm_diagnose (machine+code→fix), speed_feed_calc (material+tool+machine→optimal parameters), tool_compare (two tools head-to-head), material_substitute (find alternative materials by cost/availability/machinability/performance). Actions: material_get, material_search, material_compare, machine_get, machine_search, machine_capabilities, tool_get, tool_search, tool_recommend, tool_facets, alarm_decode, alarm_search, alarm_fix, formula_get, formula_calculate, cross_query, machine_toolholder_match, alarm_diagnose, speed_feed_calc, tool_compare, material_substitute",
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

          // === CUTTING TOOL (4) ===
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
            const recTools = registryManager.tools.recommendTools({
              material_iso_group: mat.iso_group, operation: params.operation || "milling",
              diameter_target: params.diameter, max_results: params.limit ?? 5
            });
            // Expand material-specific cutting params for the queried ISO group
            result = recTools.map((t: any) => {
              const cpSrc = t.cutting_params?.materials || t.cutting_params || {};
              let materialParams: any = null;
              if (cpSrc) {
                const matchKey = Object.keys(cpSrc).find(k => k.startsWith(mat.iso_group + '_'));
                if (matchKey) materialParams = cpSrc[matchKey];
              }
              return {
                ...t,
                material_cutting_params: materialParams,
                matched_material: { id: (mat as any).material_id || (mat as any).id, name: mat.name, iso_group: mat.iso_group }
              };
            });
            break;
          }
          case "tool_facets": {
            // R1-MS5: Return filterable facets (types, vendors, coatings, diameter ranges)
            // Accepts optional filters to narrow results before aggregating
            const facets = registryManager.tools.getFacets({
              type: params.type,
              vendor: params.vendor || params.manufacturer,
              coating: params.coating,
              category: params.category,
              diameter_min: params.diameter_min,
              diameter_max: params.diameter_max,
              material_group: params.material_group
            });
            result = facets;
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

          // === CROSS-REGISTRY LINKING (3) ===
          case "cross_query": {
            // Material + operation + machine → full cutting parameter recommendation
            const cqMatId = params.material_id || params.material;
            const cqOperation = params.operation || "milling";
            const cqMachineId = params.machine_id || params.machine;
            
            if (!cqMatId) return jsonResponse({ error: "cross_query requires 'material_id' or 'material'" });
            
            // 1. Get material
            const cqMat = await registryManager.materials.getByIdOrName(cqMatId);
            if (!cqMat) return jsonResponse({ error: `Material not found: ${cqMatId}` });
            
            // 2. Get machine (optional - for power/speed limits)
            let cqMachine: any = null;
            let machineConstraints: any = {};
            if (cqMachineId) {
              cqMachine = registryManager.machines.getByIdOrModel(cqMachineId);
              if (cqMachine) {
                machineConstraints = {
                  max_rpm: cqMachine.spindle?.max_rpm,
                  max_power_kw: cqMachine.spindle?.power_continuous || cqMachine.spindle?.power_kw,
                  spindle_interface: cqMachine.spindle?.spindle_nose || cqMachine.spindle?.interface || cqMachine.spindle_interface,
                  controller: cqMachine.controller?.brand || cqMachine.controller?.manufacturer,
                  turret_type: cqMachine.turret?.type || cqMachine.turret_type,
                  max_x: cqMachine.travels?.x || cqMachine.work_envelope?.x_mm,
                  max_y: cqMachine.travels?.y || cqMachine.work_envelope?.y_mm,
                  max_z: cqMachine.travels?.z || cqMachine.work_envelope?.z_mm,
                };
              }
            }
            
            // 3. Find recommended tools
            const cqTools = registryManager.tools.recommendTools({
              material_iso_group: cqMat.iso_group,
              operation: cqOperation,
              diameter_target: params.tool_diameter,
              max_results: params.limit ?? 5
            });
            
            // 4. Get cutting parameters from material
            const isoGroup = (cqMat.iso_group || '').toUpperCase();
            const matCutRec = (cqMat as any).cutting_recommendations;
            const opRec = matCutRec?.[cqOperation] || matCutRec?.milling || {};
            
            // 5. Build Kienzle/Taylor params
            const kienzle = (cqMat as any).kienzle;
            const taylor = (cqMat as any).taylor;
            
            // 6. Safety check: if machine has max_power, flag if cutting might exceed
            let safetyWarnings: string[] = [];
            if (machineConstraints.max_power_kw && kienzle?.kc1_1) {
              // Rough estimate: typical milling at full engagement
              const estForce = kienzle.kc1_1 * 2; // very rough N
              const estPower = (estForce * (opRec.speed_roughing || 150)) / 60000;
              if (estPower > machineConstraints.max_power_kw * 0.9) {
                safetyWarnings.push(`Estimated cutting power (${estPower.toFixed(1)}kW) may approach machine limit (${machineConstraints.max_power_kw}kW)`);
              }
            }
            
            // 7. Find compatible toolholders if machine spindle is known
            let compatibleHolders: any[] = [];
            if (machineConstraints.spindle_interface) {
              const holderResult = registryManager.tools.search({
                query: machineConstraints.spindle_interface,
                limit: 5
              });
              compatibleHolders = holderResult?.tools || holderResult?.results || [];
            }
            
            result = {
              material: {
                id: cqMat.material_id || cqMat.id,
                name: cqMat.name,
                iso_group: cqMat.iso_group,
                hardness: (cqMat as any).mechanical?.hardness,
                machinability: (cqMat as any).machinability
              },
              operation: cqOperation,
              cutting_parameters: {
                kienzle: kienzle ? { kc1_1: kienzle.kc1_1, mc: kienzle.mc } : null,
                taylor: taylor ? { C: taylor.C, n: taylor.n } : null,
                recommendations: opRec,
                composition: (cqMat as any).composition ? "available" : "not_available",
                tribology: (cqMat as any).tribology ? "available" : "not_available"
              },
              recommended_tools: cqTools,
              machine: cqMachine ? {
                id: cqMachine.id || cqMachine.machine_id,
                model: cqMachine.model || cqMachine.name,
                constraints: machineConstraints
              } : null,
              compatible_holders: compatibleHolders.length > 0 ? compatibleHolders.map((h: any) => ({
                id: h.id, name: h.name, interface: h.spindle_interface || h.tool_interface
              })) : null,
              safety_warnings: safetyWarnings.length > 0 ? safetyWarnings : null,
              _chain: "material → iso_group → cutting_params → tools → holders → machine"
            };
            break;
          }
          
          case "machine_toolholder_match": {
            // Machine spindle interface → compatible toolholders
            const mthMachineId = params.machine_id || params.machine || params.identifier;
            if (!mthMachineId) return jsonResponse({ error: "machine_toolholder_match requires 'machine_id' or 'machine'" });
            
            const mthMachine = registryManager.machines.getByIdOrModel(mthMachineId);
            if (!mthMachine) return jsonResponse({ error: `Machine not found: ${mthMachineId}` });
            
            const spindleInterface = mthMachine.spindle?.spindle_nose || mthMachine.spindle?.interface || (mthMachine as any).spindle_interface;
            const turretType = mthMachine.turret?.type || (mthMachine as any).turret_type;
            const machineType = (mthMachine.type || mthMachine.machine_type || '').toLowerCase();
            const isLathe = machineType.includes('lathe') || machineType.includes('turn');
            
            let holders: any[] = [];
            
            if (isLathe && turretType) {
              // For lathes: search by turret type (VDI30, VDI40, BMT55, etc.)
              const turretResult = registryManager.tools.search({
                query: turretType,
                limit: params.limit ?? 20
              });
              holders = turretResult?.tools || turretResult?.results || [];
            }
            
            if (spindleInterface) {
              // For mills: search by spindle interface (BT40, CAT40, HSK-A63, etc.)
              const spindleResult = registryManager.tools.search({
                query: spindleInterface,
                limit: params.limit ?? 20
              });
              const spindleHolders = spindleResult?.tools || spindleResult?.results || [];
              holders = holders.concat(spindleHolders);
            }
            
            // Deduplicate
            const seen = new Set();
            holders = holders.filter(h => {
              const id = h.id || h.tool_id;
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            
            result = {
              machine: {
                id: mthMachine.id || mthMachine.machine_id,
                model: mthMachine.model || mthMachine.name,
                type: machineType,
                spindle_interface: spindleInterface,
                turret_type: turretType
              },
              compatible_holders: holders.map((h: any) => ({
                id: h.id, name: h.name, type: h.subcategory || h.type,
                interface: h.spindle_interface || h.tool_interface,
                clamping: h.clamping_type, max_rpm: h.max_rpm
              })),
              total_compatible: holders.length,
              search_criteria: isLathe
                ? `turret: ${turretType || 'unknown'}, spindle: ${spindleInterface || 'unknown'}`
                : `spindle: ${spindleInterface || 'unknown'}`
            };
            break;
          }
          
          case "alarm_diagnose": {
            // Machine + alarm code → controller-specific diagnosis + fix
            const adMachineId = params.machine_id || params.machine;
            const adCode = params.code || params.alarm_code;
            
            if (!adCode) return jsonResponse({ error: "alarm_diagnose requires 'code' or 'alarm_code'" });
            
            // Determine controller from machine or params
            let controller = params.controller;
            let machineInfo: any = null;
            
            if (adMachineId) {
              const adMachine = registryManager.machines.getByIdOrModel(adMachineId);
              if (adMachine) {
                controller = controller || adMachine.controller?.brand || adMachine.controller?.manufacturer;
                machineInfo = {
                  id: adMachine.id || adMachine.machine_id,
                  model: adMachine.model || adMachine.name,
                  controller_brand: controller,
                  controller_model: adMachine.controller?.model
                };
              }
            }
            
            if (!controller) return jsonResponse({ error: "Cannot determine controller. Provide 'controller' or 'machine_id' with controller data." });
            
            // Decode alarm
            const adAlarm = await registryManager.alarms.decode(String(controller), String(adCode));
            
            if (!adAlarm) {
              // Try broader search
              const searchResult = await registryManager.alarms.search({
                query: String(adCode), controller: String(controller), limit: 5
              });
              const searchAlarms = searchResult?.alarms || searchResult?.results || [];
              if (searchAlarms.length > 0) {
                result = {
                  exact_match: false,
                  machine: machineInfo,
                  possible_alarms: searchAlarms.map((a: any) => ({
                    alarm_id: a.alarm_id, code: a.code, name: a.name,
                    severity: a.severity, quick_fix: a.quick_fix
                  })),
                  note: `No exact match for code '${adCode}' on ${controller}. Showing related alarms.`
                };
              } else {
                result = { error: `Alarm ${adCode} not found for controller ${controller}`, machine: machineInfo };
              }
            } else {
              // Build comprehensive diagnosis
              result = {
                alarm: {
                  alarm_id: adAlarm.alarm_id,
                  code: adAlarm.code,
                  name: adAlarm.name,
                  severity: adAlarm.severity,
                  category: adAlarm.category,
                  description: adAlarm.description,
                  causes: adAlarm.causes,
                  requires_power_cycle: adAlarm.requires_power_cycle,
                  requires_service: (adAlarm as any).requires_service
                },
                fix: {
                  quick_fix: adAlarm.quick_fix,
                  procedures: adAlarm.fix_procedures || [],
                  common_parts: (adAlarm as any).common_parts || [],
                  related_parameters: (adAlarm as any).related_parameters || []
                },
                machine: machineInfo,
                related_alarms: adAlarm.related_alarms || [],
                _chain: "machine → controller → alarm_code → diagnosis → fix_procedure"
              };
            }
            break;
          }

          case "speed_feed_calc": {
            const sfMat = params.material ? await registryManager.materials.getByIdOrName(params.material) : null;
            if (!sfMat) return jsonResponse({ error: "speed_feed_calc requires 'material'" });
            const sfToolDiam = params.tool_diameter || params.diameter || 10;
            const sfFlutes = params.flutes || 4;
            const sfOp = (params.operation || "milling").toLowerCase();
            const sfAp = params.depth_of_cut || params.ap;
            const sfAe = params.width_of_cut || params.ae;
            const kienzle = (sfMat as any).kienzle;
            const taylor = (sfMat as any).taylor;
            const cutRec = (sfMat as any).cutting_recommendations;
            const isRoughing = sfOp.includes("rough");
            const recSection = cutRec?.[sfOp === 'turning' ? 'turning' : 'milling'] || {};
            // Handle both nested (roughing: {speed, fz}) and flat (speed_roughing, speed_finishing) schemas
            const recBlock = recSection[isRoughing ? 'roughing' : 'finishing'] || recSection || {};
            let maxRPM = params.max_rpm || 12000;
            let maxPower = params.max_power_kw || 15;
            if (params.machine) {
              const sfMach = registryManager.machines.getByIdOrModel(params.machine);
              if (sfMach) {
                maxRPM = sfMach.spindle?.max_rpm || (sfMach as any).spindle_rpm_max || maxRPM;
                maxPower = sfMach.spindle?.power_kw || sfMach.spindle?.power_continuous || maxPower;
              }
            }
            const vcRec = recBlock.speed || (isRoughing ? recSection.speed_roughing : recSection.speed_finishing) || (isRoughing ? 150 : 200);
            const rpm = Math.min(Math.round((vcRec * 1000) / (Math.PI * sfToolDiam)), maxRPM);
            const actualVc = Math.round((Math.PI * sfToolDiam * rpm) / 1000 * 10) / 10;
            const fzRec = recBlock.fz_mm || (isRoughing ? recSection.feed_per_tooth_roughing || recSection.feed_roughing : recSection.feed_per_tooth_finishing || recSection.feed_finishing) || (isRoughing ? 0.12 : 0.06);
            const feedRate = Math.round(rpm * sfFlutes * fzRec);
            const ap = sfAp || recSection.doc_roughing || recSection.doc_finishing || (isRoughing ? sfToolDiam * 1.0 : sfToolDiam * 0.2);
            const aeDefault = isRoughing ? (recSection.ae_roughing_pct ? sfToolDiam * recSection.ae_roughing_pct / 100 : sfToolDiam * 0.5) : (recSection.ae_finishing_pct ? sfToolDiam * recSection.ae_finishing_pct / 100 : sfToolDiam * 0.05);
            const ae = sfAe || aeDefault;
            const mrr = Math.round(ae * ap * feedRate / 1000 * 10) / 10;
            const h = fzRec * Math.sin(Math.acos(Math.max(-1, Math.min(1, 1 - (2 * ae / sfToolDiam)))));
            const hex = Math.max(h, 0.01);
            const Fc = kienzle ? Math.round(kienzle.kc1_1 * Math.pow(hex, -kienzle.mc) * ap * ae / sfToolDiam) : null;
            const Pc = Fc ? Math.round((Fc * actualVc / 60000) * 100) / 100 : null;
            const powerPct = Pc && maxPower ? Math.round((Pc / maxPower) * 100) : null;
            // Tool life — select best Taylor constants for the actual cutting speed
            let tlC = taylor?.C, tlN = taylor?.n, tlGrade = "carbide";
            if (taylor) {
              // If speed exceeds carbide C, try ceramic/CBN which have higher C values
              if (actualVc > (taylor.C || 0) && taylor.C_ceramic) { tlC = taylor.C_ceramic; tlN = taylor.n_ceramic; tlGrade = "ceramic"; }
              if (actualVc > (taylor.C || 0) && taylor.C_cbn) { tlC = taylor.C_cbn; tlN = taylor.n_cbn; tlGrade = "cbn"; }
              // If speed is below carbide C but very low, the formula still works
            }
            const toolLifeRaw = tlC && tlN ? Math.pow(tlC / actualVc, 1 / tlN) : null;
            const toolLife = toolLifeRaw !== null ? Math.max(1, Math.round(toolLifeRaw)) : null;
            const toolGrade = tlGrade;
            const warnings: string[] = [];
            if (rpm >= maxRPM) warnings.push(`RPM limited by machine max (${maxRPM})`);
            if (powerPct && powerPct > 90) warnings.push(`Power usage ${powerPct}% — approaching machine limit`);
            if (toolLife && toolLife < 5) warnings.push(`Very short tool life (${toolLife} min) — reduce speed`);
            result = {
              input: { material: { name: sfMat.name, iso_group: sfMat.iso_group, hardness_bhn: (sfMat as any).mechanical?.hardness?.brinell }, tool: { diameter_mm: sfToolDiam, flutes: sfFlutes }, operation: sfOp, machine_limits: { max_rpm: maxRPM, max_power_kw: maxPower } },
              parameters: { cutting_speed_vc: actualVc, unit_vc: "m/min", rpm, feed_per_tooth_fz: fzRec, unit_fz: "mm", feed_rate_vf: feedRate, unit_vf: "mm/min", depth_of_cut_ap: ap, unit_ap: "mm", width_of_cut_ae: ae, unit_ae: "mm" },
              performance: { mrr_cm3_min: mrr, cutting_force_N: Fc, cutting_power_kW: Pc, power_utilization_pct: powerPct, estimated_tool_life_min: toolLife, tool_grade_used: toolGrade },
              safety: warnings.length > 0 ? warnings : ["All parameters within safe limits"],
              source: { kienzle: !!kienzle, taylor: !!(taylor?.C), taylor_grade: toolGrade, recommendations: (recSection.speed_roughing || recSection.speed_finishing) ? "material-specific" : "iso-group-default" }
            };
            break;
          }

          case "tool_compare": {
            const tc1 = params.tool_1 || params.tool1;
            const tc2 = params.tool_2 || params.tool2;
            if (!tc1 || !tc2) return jsonResponse({ error: "tool_compare requires 'tool_1' and 'tool_2'" });
            const tool1 = registryManager.tools.get(tc1) || registryManager.tools.getByCatalogNumber(tc1);
            const tool2 = registryManager.tools.get(tc2) || registryManager.tools.getByCatalogNumber(tc2);
            if (!tool1) return jsonResponse({ error: `Tool not found: ${tc1}` });
            if (!tool2) return jsonResponse({ error: `Tool not found: ${tc2}` });
            const tcMat = params.material ? await registryManager.materials.getByIdOrName(params.material) : null;
            const tcIsoGroup = tcMat?.iso_group || params.iso_group || 'P';
            const cp1 = (tool1 as any).cutting_params || {};
            const cp2 = (tool2 as any).cutting_params || {};
            // Handle both nested (.materials.P_STEELS) and flat (.P_STEELS) schemas
            const cp1src = cp1.materials || cp1;
            const cp2src = cp2.materials || cp2;
            const isoKey = Object.keys(cp1src).find(k => k.startsWith(tcIsoGroup + '_'));
            const t1cp = isoKey ? cp1src[isoKey] : null;
            const t2cp = isoKey ? cp2src[isoKey] : null;
            result = {
              tool_1: { id: (tool1 as any).id, name: tool1.name, vendor: (tool1 as any).vendor, diameter: (tool1 as any).cutting_diameter_mm, flutes: (tool1 as any).flute_count, coating: (tool1 as any).coating || (tool1 as any).coating_type, coolant_through: (tool1 as any).coolant_through, price: (tool1 as any).price_usd, taylor_C: (tool1 as any).taylor_C, cutting_params: t1cp },
              tool_2: { id: (tool2 as any).id, name: tool2.name, vendor: (tool2 as any).vendor, diameter: (tool2 as any).cutting_diameter_mm, flutes: (tool2 as any).flute_count, coating: (tool2 as any).coating || (tool2 as any).coating_type, coolant_through: (tool2 as any).coolant_through, price: (tool2 as any).price_usd, taylor_C: (tool2 as any).taylor_C, cutting_params: t2cp },
              comparison: { for_material: tcMat ? { name: tcMat.name, iso_group: tcIsoGroup } : { iso_group: tcIsoGroup }, diameter_match: (tool1 as any).cutting_diameter_mm === (tool2 as any).cutting_diameter_mm, price_diff_pct: (tool1 as any).price_usd && (tool2 as any).price_usd ? Math.round(((tool2 as any).price_usd - (tool1 as any).price_usd) / (tool1 as any).price_usd * 100) : null, tool_life_ratio: (tool1 as any).taylor_C && (tool2 as any).taylor_C ? Math.round((tool2 as any).taylor_C / (tool1 as any).taylor_C * 100) / 100 : null }
            };
            break;
          }

          // === CROSS-SYSTEM INTELLIGENCE (R3-MS3) ===
          case "material_substitute": {
            const subMat = params.material;
            const subReason = params.reason || "machinability";
            if (!subMat) return jsonResponse({ error: "material_substitute requires 'material' parameter" });
            const validReasons = ["cost", "availability", "machinability", "performance"];
            if (!validReasons.includes(subReason)) return jsonResponse({ error: `Invalid reason: ${subReason}. Use: ${validReasons.join(", ")}` });

            // 1. Get source material
            const source = await registryManager.materials.getByIdOrName(subMat);
            if (!source) return jsonResponse({ error: `Source material not found: ${subMat}` });
            const srcGroup = (source as any).iso_group || "P";
            const srcHardness = (source as any).hardness_hb || (source as any).hardness || 200;
            const srcTensile = (source as any).tensile_strength_mpa || (source as any).tensile_strength || 500;
            const srcMachinability = (source as any).machinability_rating || (source as any).machinability || 50;

            // 2. Find candidates in same ISO group
            const candidates = await registryManager.materials.search({
              iso_group: srcGroup, limit: 50, offset: 0
            });
            const candidateList = Array.isArray(candidates) ? candidates : (candidates as any)?.results || [];

            // 3. Score and rank based on reason
            const scored = candidateList
              .filter((c: any) => c.name !== source.name && c.id !== (source as any).id)
              .map((c: any) => {
                const cHardness = c.hardness_hb || c.hardness || 200;
                const cTensile = c.tensile_strength_mpa || c.tensile_strength || 500;
                const cMachinability = c.machinability_rating || c.machinability || 50;
                const hardnessDiff = Math.abs(cHardness - srcHardness) / srcHardness;
                const tensileDiff = Math.abs(cTensile - srcTensile) / srcTensile;
                const machinabilityImprovement = ((cMachinability - srcMachinability) / Math.max(srcMachinability, 1)) * 100;

                let score = 0;
                const tradeOffs: string[] = [];
                if (subReason === "machinability") {
                  score = cMachinability;
                  if (hardnessDiff > 0.20) tradeOffs.push(`Hardness differs by ${Math.round(hardnessDiff * 100)}%`);
                  if (tensileDiff > 0.20) tradeOffs.push(`Tensile strength differs by ${Math.round(tensileDiff * 100)}%`);
                } else if (subReason === "cost") {
                  score = cMachinability * 0.5 + (1 - hardnessDiff) * 50;
                  if (tensileDiff > 0.15) tradeOffs.push(`Tensile differs by ${Math.round(tensileDiff * 100)}%`);
                } else if (subReason === "availability") {
                  const commonAlloys = ["1045", "4140", "4340", "6061", "7075", "304", "316"];
                  const isCommon = commonAlloys.some(a => c.name?.includes(a));
                  score = (isCommon ? 100 : 50) + cMachinability * 0.3;
                  if (tensileDiff > 0.15) tradeOffs.push(`Tensile differs by ${Math.round(tensileDiff * 100)}%`);
                } else if (subReason === "performance") {
                  score = cTensile * 0.5 + cHardness * 0.3 + cMachinability * 0.2;
                  if (cMachinability < srcMachinability * 0.8) tradeOffs.push(`Lower machinability (${Math.round(cMachinability)} vs ${Math.round(srcMachinability)})`);
                }

                return {
                  name: c.name,
                  iso_group: c.iso_group || srcGroup,
                  machinability_improvement_pct: Math.round(machinabilityImprovement),
                  properties: {
                    hardness: cHardness,
                    tensile: cTensile,
                    density: c.density || null,
                    machinability: cMachinability
                  },
                  trade_offs: tradeOffs,
                  score
                };
              })
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 5);

            result = {
              source_material: { name: source.name, iso_group: srcGroup, hardness: srcHardness, tensile: srcTensile, machinability: srcMachinability },
              reason: subReason,
              substitutes: scored.map(({ score, ...rest }: any) => rest),
              count: scored.length
            };
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

  log.info("[dataDispatcher] Registered prism_data (21 actions)");
}
