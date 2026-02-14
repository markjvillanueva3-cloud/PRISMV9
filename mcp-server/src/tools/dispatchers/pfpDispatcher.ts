/**
 * PRISM PFP Dispatcher (#26)
 * ============================
 * 
 * prism_pfp — 6 actions for Predictive Failure Prevention.
 * 
 * Actions:
 *   get_dashboard   — PFP system overview  
 *   assess_risk     — Risk assessment for a proposed action
 *   get_patterns    — View extracted failure patterns
 *   get_history     — View action history records
 *   force_extract   — Trigger immediate pattern extraction
 *   update_config   — Modify PFP settings
 * 
 * @version 1.0.0
 * @feature F1
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pfpEngine } from "../../engines/PFPEngine.js";
import { log } from "../../utils/Logger.js";
import type { PatternType } from "../../types/pfp-types.js";

export function registerPFPDispatcher(server: McpServer): void {
  server.tool(
    "prism_pfp",
    "Predictive Failure Prevention. Actions: get_dashboard, assess_risk, get_patterns, get_history, force_extract, update_config",
    {
      action: z.enum([
        "get_dashboard",
        "assess_risk",
        "get_patterns",
        "get_history",
        "force_extract",
        "update_config",
      ]).describe("PFP action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params = {} } = args;
      const start = performance.now();

      try {
        let result: any;

        switch (action) {
          case "get_dashboard": {
            const dashboard = pfpEngine.getDashboard();
            const slos = pfpEngine.checkSLOs();
            result = {
              ...dashboard,
              slos,
              topPatterns: dashboard.topPatterns.map(p => ({
                type: p.type,
                dispatcher: p.dispatcher,
                action: p.action,
                confidence: (p.confidence * 100).toFixed(1) + '%',
                occurrences: p.occurrences,
                decay: p.decayWeight.toFixed(2),
                context: p.context,
              })),
            };
            break;
          }

          case "assess_risk": {
            const dispatcher = params.dispatcher;
            const act = params.action || params.target_action;
            if (!dispatcher || !act) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'dispatcher' and 'action' parameters" }) }] };
            }
            const callNumber = params.call_number || 0;
            const contextDepth = params.context_depth || 0;
            const paramKeys = params.param_keys;

            const assessment = pfpEngine.assessRisk(dispatcher, act, callNumber, contextDepth, paramKeys);
            result = {
              risk_level: assessment.riskLevel,
              risk_score: (assessment.riskScore * 100).toFixed(1) + '%',
              recommendation: assessment.recommendation,
              reason: assessment.reason,
              matched_patterns: assessment.matchedPatterns.length,
              assessment_ms: assessment.assessmentMs.toFixed(2),
              patterns: assessment.matchedPatterns.map(m => ({
                type: m.patternType,
                confidence: (m.confidence * 100).toFixed(1) + '%',
                contribution: (m.contribution * 100).toFixed(1) + '%',
              })),
            };
            break;
          }

          case "get_patterns": {
            const type = params.type as PatternType | undefined;
            const patterns = pfpEngine.getPatterns(type);
            result = {
              count: patterns.length,
              patterns: patterns.map(p => ({
                id: p.id,
                type: p.type,
                target: `${p.dispatcher}:${p.action}`,
                confidence: (p.confidence * 100).toFixed(1) + '%',
                occurrences: p.occurrences,
                decay: p.decayWeight.toFixed(2),
                last_seen: new Date(p.lastSeen).toISOString(),
                context: p.context,
              })),
            };
            break;
          }

          case "get_history": {
            const dispatcher = params.dispatcher;
            const limit = params.limit || 50;
            const history = pfpEngine.getHistory(dispatcher, limit);
            result = {
              count: history.length,
              records: history.slice(-20).map(r => ({
                dispatcher: r.dispatcher,
                action: r.action,
                outcome: r.outcome,
                duration_ms: r.durationMs,
                error_class: r.errorClass,
                context_depth: r.contextDepthPercent,
                call_number: r.callNumber,
              })),
            };
            break;
          }

          case "force_extract": {
            const extractResult = pfpEngine.forceExtract();
            result = {
              success: true,
              patterns: extractResult.patterns,
              history_records: extractResult.history,
            };
            break;
          }

          case "update_config": {
            const newConfig = pfpEngine.updateConfig(params);
            result = {
              success: true,
              config: newConfig,
            };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ['get_dashboard', 'assess_risk', 'get_patterns', 'get_history', 'force_extract', 'update_config'] };
        }

        const elapsed = (performance.now() - start).toFixed(1);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ ...result, _action: action, _elapsed_ms: elapsed }),
          }],
        };
      } catch (error: any) {
        log.error(`[PFP_DISPATCH] ${action} error: ${error.message}`);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: error.message, action }),
          }],
        };
      }
    }
  );

  log.info("[PFP_DISPATCH] prism_pfp registered (6 actions)");
}
