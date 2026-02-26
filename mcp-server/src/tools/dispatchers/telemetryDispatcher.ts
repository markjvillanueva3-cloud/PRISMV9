/**
 * PRISM Telemetry Dispatcher (#25)
 * =================================
 * 
 * prism_telemetry — 7 read/control actions for the F3 telemetry system.
 * 
 * Actions:
 *   get_dashboard     — All dispatchers current metrics + anomaly summary
 *   get_detail        — Deep metrics for one dispatcher  
 *   get_anomalies     — Filtered anomaly list
 *   get_optimization  — Routing decisions log
 *   acknowledge       — Mark anomaly as reviewed
 *   freeze_weights    — Operator freeze control
 *   unfreeze_weights  — Release freeze
 * 
 * @version 1.0.0
 * @feature F3
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { telemetryEngine } from "../../engines/TelemetryEngine.js";
import { log } from "../../utils/Logger.js";
import type { AnomalySeverity } from "../../types/telemetry-types.js";

export function registerTelemetryDispatcher(server: McpServer): void {
  (server as any).tool(
    "prism_telemetry",
    "Dispatcher telemetry & self-optimization. Actions: get_dashboard, get_detail, get_anomalies, get_optimization, acknowledge, freeze_weights, unfreeze_weights",
    {
      action: z.enum([
        "get_dashboard",
        "get_detail",
        "get_anomalies",
        "get_optimization",
        "acknowledge",
        "freeze_weights",
        "unfreeze_weights",
      ]).describe("Telemetry action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params = {} } = args;
      const start = performance.now();

      try {
        let result: any;

        switch (action) {
          // ================================================================
          // get_dashboard — Full system overview
          // ================================================================
          case "get_dashboard": {
            const dashboard = telemetryEngine.getDashboard();
            result = {
              timestamp: dashboard.timestamp,
              dispatcher_count: dashboard.dispatchers.length,
              dispatchers: dashboard.dispatchers.map(d => ({
                name: d.dispatcher,
                calls_1m: d.callCount,
                success_rate: d.callCount > 0
                  ? ((d.successCount / d.callCount) * 100).toFixed(1) + '%'
                  : 'N/A',
                avg_latency_ms: d.avgLatencyMs.toFixed(1),
                p95_latency_ms: d.p95LatencyMs.toFixed(1),
                errors: d.failureCount,
              })),
              anomaly_summary: dashboard.anomalySummary,
              system_health: {
                wrapper_overhead_p99_ms: dashboard.systemHealth.wrapperOverheadP99Ms.toFixed(2),
                aggregator_cycle_ms: dashboard.systemHealth.aggregatorCycleTimeMs.toFixed(2),
                checksum_failure_rate: (dashboard.systemHealth.checksumFailureRate * 100).toFixed(3) + '%',
                memory_usage_kb: (dashboard.systemHealth.memoryUsageBytes / 1024).toFixed(0),
                anomalies_last_hour: dashboard.systemHealth.anomalyCountLastHour,
                degradation: telemetryEngine.getDegradationLevel(),
                slos: telemetryEngine.checkSLOs(),
              },
            };

            // Prominently surface unacknowledged criticals
            if (dashboard.anomalySummary.unacknowledgedCritical > 0) {
              result._alert = `⚠️ ${dashboard.anomalySummary.unacknowledgedCritical} UNACKNOWLEDGED CRITICAL anomalies`;
            }
            break;
          }

          // ================================================================
          // get_detail — Deep metrics for one dispatcher
          // ================================================================
          case "get_detail": {
            const name = params.dispatcher || params.name;
            if (!name) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'dispatcher' parameter" }) }] };
            }

            const detail = telemetryEngine.getDispatcherDetail(name);
            if (!detail) {
              result = { error: `No telemetry data for dispatcher: ${name}` };
            } else {
              result = detail;
            }
            break;
          }

          // ================================================================
          // get_anomalies — Filtered list
          // ================================================================
          case "get_anomalies": {
            const severity = params.severity as AnomalySeverity | undefined;
            const acknowledged = typeof params.acknowledged === 'boolean' ? params.acknowledged : undefined;
            const anomalies = telemetryEngine.getAnomalies(severity, acknowledged);

            result = {
              count: anomalies.length,
              anomalies: anomalies.slice(-50).map(a => ({
                id: a.id,
                timestamp: new Date(a.timestamp).toISOString(),
                dispatcher: a.dispatcher,
                type: a.type,
                severity: a.severity,
                deviation_sigma: a.deviationSigma.toFixed(1),
                current: a.currentValue.toFixed(2),
                baseline: a.baselineValue.toFixed(2),
                acknowledged: a.acknowledged,
                escalation_level: a.escalationLevel,
              })),
            };
            break;
          }

          // ================================================================
          // get_optimization — Route weight log
          // ================================================================
          case "get_optimization": {
            const weights = telemetryEngine.getOptimizationLog();
            result = {
              count: weights.length,
              weights: weights.map(w => ({
                dispatcher: w.dispatcher,
                weight: w.weight.toFixed(3),
                previous: w.previousWeight.toFixed(3),
                frozen: w.frozen,
                frozen_by: w.frozenBy || null,
                reason: w.reason,
              })),
            };
            break;
          }

          // ================================================================
          // acknowledge — Mark anomaly as reviewed
          // ================================================================
          case "acknowledge": {
            const anomalyId = params.anomaly_id || params.id;
            const operatorId = params.operator_id || params.operator || 'unknown';

            if (!anomalyId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'anomaly_id' parameter" }) }] };
            }

            const success = telemetryEngine.acknowledgeAnomaly(anomalyId, operatorId);
            result = {
              success,
              anomaly_id: anomalyId,
              acknowledged_by: operatorId,
              message: success ? 'Anomaly acknowledged' : 'Anomaly not found',
            };
            break;
          }

          // ================================================================
          // freeze_weights — Operator lock
          // ================================================================
          case "freeze_weights": {
            const dispatcher = params.dispatcher;
            const reason = params.reason || 'operator request';
            const frozenBy = params.operator_id || params.frozen_by || 'operator';

            const count = telemetryEngine.freezeWeights(dispatcher, reason, frozenBy);
            result = {
              success: true,
              dispatchers_frozen: count,
              reason,
              frozen_by: frozenBy,
            };
            break;
          }

          // ================================================================
          // unfreeze_weights — Release lock
          // ================================================================
          case "unfreeze_weights": {
            const dispatcher = params.dispatcher;
            const count = telemetryEngine.unfreezeWeights(dispatcher);
            result = {
              success: true,
              dispatchers_unfrozen: count,
            };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ['get_dashboard', 'get_detail', 'get_anomalies', 'get_optimization', 'acknowledge', 'freeze_weights', 'unfreeze_weights'] };
        }

        const elapsed = (performance.now() - start).toFixed(1);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ ...result, _action: action, _elapsed_ms: elapsed }),
          }],
        };
      } catch (error: any) {
        log.error(`[TELEMETRY_DISPATCH] ${action} error: ${error.message}`);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: error.message, action }),
          }],
        };
      }
    }
  );

  log.info("[TELEMETRY_DISPATCH] prism_telemetry registered (7 actions)");
}
