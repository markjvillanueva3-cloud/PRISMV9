#!/usr/bin/env python3
"""Wire CADRegenerationTestEngine to cadAutomationDispatcher - U-CUC46"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 regeneration test actions)
new_actions = '''  "cad_regen_test",
  "cad_regen_batch",
  "cad_regen_compare",
  "cad_regen_thresholds_get",
  "cad_regen_thresholds_set",
'''

# Find last action before ] as const
old_actions_end = b'"cad_mtls_config",\r\n] as const;'
new_actions_end = b'"cad_mtls_config",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_regen_test' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadRegenerationTestEngine
case_code = '''          case "cad_regen_test": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const originalPath = params["original_path"] as string;
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.test>[0]["thresholds"];
            if (!originalPath) {
              throw new Error("cad_regen_test requires 'original_path'");
            }
            const testResult = await cadRegenerationTestEngine.test({ originalPath, thresholds });
            result = { result: testResult, source: "CADRegenerationTestEngine.test" };
            break;
          }
          case "cad_regen_batch": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const paths = params["paths"] as string[];
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.batch>[0]["thresholds"];
            const stopOnFirstFail = params["stop_on_first_fail"] as boolean | undefined;
            if (!paths || !Array.isArray(paths)) {
              throw new Error("cad_regen_batch requires 'paths' array");
            }
            const batchResult = await cadRegenerationTestEngine.batch({ paths, thresholds, stopOnFirstFail });
            result = { result: batchResult, source: "CADRegenerationTestEngine.batch" };
            break;
          }
          case "cad_regen_compare": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const original = params["original"] as Parameters<typeof cadRegenerationTestEngine.compare>[0];
            const generated = params["generated"] as Parameters<typeof cadRegenerationTestEngine.compare>[1];
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.compare>[2];
            if (!original || !generated) {
              throw new Error("cad_regen_compare requires 'original' and 'generated' (CADGeometry)");
            }
            const comparison = cadRegenerationTestEngine.compare(original, generated, thresholds);
            result = { comparison, source: "CADRegenerationTestEngine.compare" };
            break;
          }
          case "cad_regen_thresholds_get": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const thresholds = cadRegenerationTestEngine.getThresholds();
            result = { thresholds, source: "CADRegenerationTestEngine.getThresholds" };
            break;
          }
          case "cad_regen_thresholds_set": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.setThresholds>[0];
            if (!thresholds) {
              throw new Error("cad_regen_thresholds_set requires 'thresholds'");
            }
            const updated = cadRegenerationTestEngine.setThresholds(thresholds);
            result = { thresholds: updated, source: "CADRegenerationTestEngine.setThresholds" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_regen_test"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRegenerationTestEngine wired successfully (5 actions)')
