#!/usr/bin/env python3
"""Wire CADRegressionTestOrchestratorEngine to cadAutomationDispatcher - U-CUC48"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (2 regression orchestrator actions)
new_actions = '''  "cad_regression_run",
  "cad_regression_load",
'''

# Find last action before ] as const
old_actions_end = b'"cad_regression_dashboard_list",\r\n] as const;'
new_actions_end = b'"cad_regression_dashboard_list",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_regression_run' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadRegressionTestOrchestratorEngine
# Note: run() requires TestRunner which is a runtime dependency - we expose loadState for now
case_code = '''          case "cad_regression_run": {
            result = { error: "cad_regression_run requires runtime TestRunner - use loadState or call engine directly", source: "CADRegressionTestOrchestratorEngine" };
            break;
          }
          case "cad_regression_load": {
            const { cadRegressionTestOrchestratorEngine } = await import("../../engines/CADRegressionTestOrchestratorEngine.js");
            const statePath = params["state_path"] as string;
            if (!statePath) {
              throw new Error("cad_regression_load requires 'state_path'");
            }
            const batch = await cadRegressionTestOrchestratorEngine.loadState(statePath);
            result = { batch: batch ?? null, found: !!batch, source: "CADRegressionTestOrchestratorEngine.loadState" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_regression_run"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRegressionTestOrchestratorEngine wired successfully (2 actions)')
