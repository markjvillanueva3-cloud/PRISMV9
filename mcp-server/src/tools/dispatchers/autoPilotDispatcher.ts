/**
 * AutoPilot Dispatcher - Consolidates 7 autopilot tools → 1
 * Actions: autopilot, autopilot_quick, brainstorm_lenses, formula_optimize,
 *          autopilot_v2, registry_status, working_tools
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

const ACTIONS = ["autopilot", "autopilot_quick", "brainstorm_lenses", "formula_optimize", "autopilot_v2", "registry_status", "working_tools"] as const;

let AutoPilotClass: any = null;
let getSevenLenses: any = null;
let getOptimizationFormulas: any = null;
let AutoPilotV2: any = null;
let runAutoPilotV2: any = null;
let getWorkingTools: any = null;
let registryMgr: any = null;

function loadAutoPilot() {
  if (!AutoPilotClass) {
    try {
      const mod = require("../../orchestration/AutoPilot.js");
      AutoPilotClass = mod.AutoPilot;
      getSevenLenses = mod.getSevenLenses;
      getOptimizationFormulas = mod.getOptimizationFormulas;
    } catch (e) {
      log.warn("[autoPilotDispatcher] AutoPilot module not available");
    }
  }
  if (!AutoPilotV2) {
    try {
      const mod2 = require("../../orchestration/AutoPilotV2.js");
      AutoPilotV2 = mod2.AutoPilotV2;
      runAutoPilotV2 = mod2.runAutoPilotV2;
      getWorkingTools = mod2.getWorkingTools;
    } catch (e) { log.warn("[autoPilotDispatcher] AutoPilotV2 not available"); }
  }
  if (!registryMgr) {
    try { registryMgr = require("../../registries/index.js").registryManager; } catch (e) {}
  }
}

export function registerAutoPilotDispatcher(server: any): void {
  server.tool(
    "prism_autopilot_d",
    `AutoPilot workflow orchestration. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("AutoPilot action"),
      params: z.record(z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_autopilot_d] Action: ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      loadAutoPilot();
      let result: any;
      try {
        switch (action) {
          case "autopilot": {
            if (!AutoPilotClass) { result = { error: "AutoPilot module not loaded" }; break; }
            const ap = new AutoPilotClass({ enableSwarms: params.enableSwarms !== false, enableRalphLoops: params.ralphLoops || 3, enableFormulaOptimization: true });
            const r = await ap.execute(params.task || "", params.context || {});
            result = { task: params.task, duration: r.totalDuration + "ms", approach: r.brainstorm?.optimizedApproach,
              metrics: r.metrics, ralph_loops: r.ralph?.length, status: r.metrics?.status };
            break;
          }
          case "autopilot_quick": {
            if (!AutoPilotClass) { result = { error: "AutoPilot module not loaded" }; break; }
            const ap = new AutoPilotClass({ enableSwarms: false, enableRalphLoops: 1, enableFormulaOptimization: false });
            const r = await ap.execute(params.task || "", {});
            result = { task: params.task, duration: r.totalDuration + "ms", approach: r.brainstorm?.optimizedApproach,
              omega: r.metrics?.Omega, status: r.metrics?.status };
            break;
          }
          case "brainstorm_lenses": {
            if (!AutoPilotClass) { result = { error: "AutoPilot module not loaded" }; break; }
            const ap = new AutoPilotClass();
            const r = await (ap as any).brainstorm(params.problem || "", params.context || {});
            result = { problem: params.problem, assumptions: r.assumptions, alternatives: r.alternatives,
              inversions: r.inversions, fusions: r.fusions, tenX: r.tenX, simplifications: r.simplifications,
              futureProof: r.futureProof, approach: r.optimizedApproach, formula: r.formulaUsed };
            break;
          }
          case "formula_optimize": {
            // Query real formula registry if available
            let formulas: any[] = [];
            try {
              if (registryMgr) {
                await registryMgr.initialize();
                const formulaReg = registryMgr.getRegistry("formulas");
                if (formulaReg && formulaReg.size > 0) {
                  const task = (params.task || "").toLowerCase();
                  formulas = formulaReg.search({ query: task, domain: params.domain || "", limit: 10 }) || [];
                }
              }
            } catch (e) {
              log.warn("[autopilot] Formula registry query failed");
            }
            if (formulas.length === 0) {
              result = {
                task: params.task,
                objective: params.objective || "maximize",
                formulas_found: 0,
                recommendation: "Use prism_knowledge→formula for real formula lookup, or prism_calc for manufacturing calculations",
                alternative: "prism_knowledge action=formula params={query: '...'}"
              };
            } else {
              result = {
                task: params.task,
                objective: params.objective || "maximize",
                formulas_found: formulas.length,
                selected: formulas[0],
                all_matches: formulas.slice(0, 5)
              };
            }
            break;
          }
          case "autopilot_v2": {
            if (!runAutoPilotV2) { result = { error: "AutoPilotV2 module not loaded" }; break; }
            const r = await runAutoPilotV2(params.task || "");
            const output = (params.format === "detailed" && AutoPilotV2) ? AutoPilotV2.formatDetailed(r) : (AutoPilotV2 ? AutoPilotV2.formatCompact(r) : JSON.stringify(r));
            return { content: [{ type: "text", text: output }] };
          }
          case "registry_status": {
            if (!registryMgr) { result = { error: "Registry manager not loaded" }; break; }
            await registryMgr.initialize();
            const regs = registryMgr.listRegistries();
            let out = "## 📊 Registry Status\n\n| Registry | Count | Loaded | Category |\n|----------|-------|--------|----------|\n";
            for (const r of regs) out += `| ${r.name} | ${r.size} | ${r.loaded?"✅":"❌"} | ${r.category} |\n`;
            out += `\n**Total:** ${registryMgr.getTotalEntries()} | **Init:** ${registryMgr.isInitialized()?"✅":"❌"}`;
            return { content: [{ type: "text", text: out }] };
          }
          case "working_tools": {
            if (!getWorkingTools) { result = { error: "getWorkingTools not loaded" }; break; }
            const tools = getWorkingTools();
            const cats = (params.category && params.category !== "all") ? [params.category] : Object.keys(tools);
            let out = "## 🔧 Working MCP Tools\n\n";
            for (const c of cats) { if (tools[c]) { out += `### ${c}\n`; for (const t of tools[c]) out += `- ${t}\n`; out += "\n"; } }
            return { content: [{ type: "text", text: out }] };
          }
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
      } catch (error) {
        return dispatcherError(error, action, "prism_autopilot_d");
      }
    }
  );
}
