#!/usr/bin/env python3
"""Wire CADRegressionResultsAnalyzerEngine to cadAutomationDispatcher - U-CUC50"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 regression analyzer actions)
new_actions = '''  "cad_regression_analyzer_diff",
  "cad_regression_analyzer_trend",
  "cad_regression_analyzer_hotspots",
'''

# Find last action before ] as const
old_actions_end = b'"cad_regression_report_summary",\r\n] as const;'
new_actions_end = b'"cad_regression_report_summary",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_regression_analyzer_diff' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadRegressionResultsAnalyzerEngine
case_code = '''          case "cad_regression_analyzer_diff": {
            const { cadRegressionResultsAnalyzerEngine } = await import("../../engines/CADRegressionResultsAnalyzerEngine.js");
            const baseBatchId = params["base_batch_id"] as string;
            const candidateBatchId = params["candidate_batch_id"] as string;
            const stateDir = params["state_dir"] as string | undefined;
            if (!baseBatchId || !candidateBatchId) {
              throw new Error("cad_regression_analyzer_diff requires 'base_batch_id' and 'candidate_batch_id'");
            }
            const diffReport = await cadRegressionResultsAnalyzerEngine.diff(baseBatchId, candidateBatchId, stateDir);
            result = { diff: diffReport, source: "CADRegressionResultsAnalyzerEngine.diff" };
            break;
          }
          case "cad_regression_analyzer_trend": {
            const { cadRegressionResultsAnalyzerEngine } = await import("../../engines/CADRegressionResultsAnalyzerEngine.js");
            const batchIds = params["batch_ids"] as string[];
            const stateDir = params["state_dir"] as string | undefined;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
              throw new Error("cad_regression_analyzer_trend requires 'batch_ids' array (non-empty)");
            }
            const trendReport = await cadRegressionResultsAnalyzerEngine.trend(batchIds, stateDir);
            result = { trend: trendReport, source: "CADRegressionResultsAnalyzerEngine.trend" };
            break;
          }
          case "cad_regression_analyzer_hotspots": {
            const { cadRegressionResultsAnalyzerEngine } = await import("../../engines/CADRegressionResultsAnalyzerEngine.js");
            const batchIds = params["batch_ids"] as string[];
            const threshold = params["threshold"] as number | undefined;
            const minAppearances = params["min_appearances"] as number | undefined;
            const stateDir = params["state_dir"] as string | undefined;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
              throw new Error("cad_regression_analyzer_hotspots requires 'batch_ids' array (non-empty)");
            }
            const hotspotReport = await cadRegressionResultsAnalyzerEngine.hotspots(batchIds, threshold, minAppearances, stateDir);
            result = { hotspots: hotspotReport, source: "CADRegressionResultsAnalyzerEngine.hotspots" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_regression_analyzer_diff"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRegressionResultsAnalyzerEngine wired successfully (3 actions)')
