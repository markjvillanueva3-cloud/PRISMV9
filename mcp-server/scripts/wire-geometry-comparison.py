#!/usr/bin/env python3
"""Wire CADGeometryComparisonEngine to cadAutomationDispatcher - U-CUC18"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (4 actions)
new_actions = '''  "cad_geometry_compare",
  "cad_geometry_extract",
  "cad_geometry_thresholds_get",
  "cad_geometry_thresholds_set",
'''

# Insert after cad_taxonomy_stats in the ACTIONS array
old_actions_end = b'"cad_taxonomy_stats",\r\n] as const;'
new_actions_end = b'"cad_taxonomy_stats",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_geometry_compare' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_geometry_compare": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const originalPath = params["original_path"] as string;
            const generatedPath = params["generated_path"] as string;
            const thresholds = params["thresholds"] as Record<string, number> | undefined;
            if (!originalPath || !generatedPath) {
              throw new Error("cad_geometry_compare requires 'original_path' and 'generated_path' strings");
            }
            const comparison = cadGeometryComparisonEngine.compare(originalPath, generatedPath, thresholds);
            result = { ...comparison, source: "CADGeometryComparisonEngine.compare" };
            break;
          }
          case "cad_geometry_extract": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const filePath = params["file_path"] as string;
            if (!filePath) {
              throw new Error("cad_geometry_extract requires 'file_path' string");
            }
            const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);
            result = { ...metrics, source: "CADGeometryComparisonEngine.extractMetrics" };
            break;
          }
          case "cad_geometry_thresholds_get": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const thresholds = cadGeometryComparisonEngine.getThresholds();
            result = { thresholds, source: "CADGeometryComparisonEngine.getThresholds" };
            break;
          }
          case "cad_geometry_thresholds_set": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const thresholds = params["thresholds"] as Record<string, number>;
            if (!thresholds || typeof thresholds !== "object") {
              throw new Error("cad_geometry_thresholds_set requires 'thresholds' object");
            }
            const updated = cadGeometryComparisonEngine.setThresholds(thresholds);
            result = { thresholds: updated, source: "CADGeometryComparisonEngine.setThresholds" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_geometry_compare"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADGeometryComparisonEngine wired successfully (4 actions)')
