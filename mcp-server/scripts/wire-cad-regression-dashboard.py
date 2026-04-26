#!/usr/bin/env python3
"""Wire CADRegressionDashboardEngine to cadAutomationDispatcher - U-CUC47"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (2 regression dashboard actions)
new_actions = '''  "cad_regression_dashboard_snapshot",
  "cad_regression_dashboard_list",
'''

# Find last action before ] as const
old_actions_end = b'"cad_regen_thresholds_set",\r\n] as const;'
new_actions_end = b'"cad_regen_thresholds_set",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_regression_dashboard_snapshot' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadRegressionDashboardEngine
case_code = '''          case "cad_regression_dashboard_snapshot": {
            const { cadRegressionDashboardEngine } = await import("../../engines/CADRegressionDashboardEngine.js");
            const batchId = params["batch_id"] as string;
            const stateDir = params["state_dir"] as string | undefined;
            const windowMinutes = params["window_minutes"] as number | undefined;
            const recentLimit = params["recent_limit"] as number | undefined;
            if (!batchId) {
              throw new Error("cad_regression_dashboard_snapshot requires 'batch_id'");
            }
            const snapshot = await cadRegressionDashboardEngine.snapshot(batchId, stateDir, windowMinutes, recentLimit);
            result = { snapshot, source: "CADRegressionDashboardEngine.snapshot" };
            break;
          }
          case "cad_regression_dashboard_list": {
            const { cadRegressionDashboardEngine } = await import("../../engines/CADRegressionDashboardEngine.js");
            const stateDir = params["state_dir"] as string | undefined;
            const batches = await cadRegressionDashboardEngine.listBatches(stateDir);
            result = { batches, count: batches.length, source: "CADRegressionDashboardEngine.listBatches" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_regression_dashboard_snapshot"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRegressionDashboardEngine wired successfully (2 actions)')
