#!/usr/bin/env python3
"""Wire CADRegressionReportGeneratorEngine to cadAutomationDispatcher - U-CUC49"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 regression report actions)
new_actions = '''  "cad_regression_report_snapshot",
  "cad_regression_report_diff",
  "cad_regression_report_trend",
  "cad_regression_report_hotspots",
  "cad_regression_report_summary",
'''

# Find last action before ] as const
old_actions_end = b'"cad_regression_load",\r\n] as const;'
new_actions_end = b'"cad_regression_load",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_regression_report_snapshot' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - use exported pure functions for rendering
case_code = '''          case "cad_regression_report_snapshot": {
            const { renderSnapshot } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const snapshot = params["snapshot"] as Parameters<typeof renderSnapshot>[0];
            if (!snapshot) {
              throw new Error("cad_regression_report_snapshot requires 'snapshot' (DashboardSnapshot)");
            }
            const markdown = renderSnapshot(snapshot);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderSnapshot" };
            break;
          }
          case "cad_regression_report_diff": {
            const { renderDiff } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const diff = params["diff"] as Parameters<typeof renderDiff>[0];
            const rowLimit = params["row_limit"] as number | undefined;
            if (!diff) {
              throw new Error("cad_regression_report_diff requires 'diff' (DiffReport)");
            }
            const markdown = renderDiff(diff, rowLimit);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderDiff" };
            break;
          }
          case "cad_regression_report_trend": {
            const { renderTrend } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const trend = params["trend"] as Parameters<typeof renderTrend>[0];
            if (!trend) {
              throw new Error("cad_regression_report_trend requires 'trend' (TrendReport)");
            }
            const markdown = renderTrend(trend);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderTrend" };
            break;
          }
          case "cad_regression_report_hotspots": {
            const { renderHotspots } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const hotspots = params["hotspots"] as Parameters<typeof renderHotspots>[0];
            if (!hotspots) {
              throw new Error("cad_regression_report_hotspots requires 'hotspots' (HotspotReport)");
            }
            const markdown = renderHotspots(hotspots);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderHotspots" };
            break;
          }
          case "cad_regression_report_summary": {
            const { renderSummary } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const snapshot = params["snapshot"] as Parameters<typeof renderSummary>[0]["snapshot"];
            const diff = params["diff"] as Parameters<typeof renderSummary>[0]["diff"];
            const trend = params["trend"] as Parameters<typeof renderSummary>[0]["trend"];
            const hotspots = params["hotspots"] as Parameters<typeof renderSummary>[0]["hotspots"];
            const rowLimit = params["row_limit"] as number | undefined;
            const markdown = renderSummary({ snapshot, diff, trend, hotspots, rowLimit });
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderSummary" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_regression_report_snapshot"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRegressionReportGeneratorEngine wired successfully (5 actions)')
