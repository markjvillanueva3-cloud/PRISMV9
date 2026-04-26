#!/usr/bin/env python3
"""Wire CADAccuracyValidatorEngine to cadAutomationDispatcher - U-CUC19"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 actions)
new_actions = '''  "cad_accuracy_validate",
  "cad_accuracy_dimensional",
  "cad_accuracy_topology",
  "cad_accuracy_dfm",
  "cad_accuracy_tolerance",
  "cad_accuracy_features",
'''

# Insert after cad_geometry_thresholds_set in the ACTIONS array
old_actions_end = b'"cad_geometry_thresholds_set",\r\n] as const;'
new_actions_end = b'"cad_geometry_thresholds_set",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_accuracy_validate' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_accuracy_validate": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            if (!code) {
              throw new Error("cad_accuracy_validate requires 'code' string (CAD code to validate)");
            }
            const input = {
              partId: params["part_id"] as string | undefined,
              code,
              expectedDimensions: params["expected_dimensions"] as Array<{name: string; nominal: number; tolerance: {plus: number; minus: number}; unit: "mm" | "inch"}> | undefined,
              expectedFeatures: params["expected_features"] as Array<{type: string; params: Record<string, number>}> | undefined,
              material: params["material"] as string | undefined,
              customer: params["customer"] as string | undefined,
              strictMode: params["strict_mode"] as boolean | undefined,
            };
            const report = await cadAccuracyValidatorEngine.validateAccuracy(input);
            result = { ...report, source: "CADAccuracyValidatorEngine.validateAccuracy" };
            break;
          }
          case "cad_accuracy_dimensional": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const specs = (params["specs"] as Array<{name: string; nominal: number; tolerance: {plus: number; minus: number}; unit: "mm" | "inch"}>) || [];
            if (!code) {
              throw new Error("cad_accuracy_dimensional requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateDimensional(code, specs);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateDimensional" };
            break;
          }
          case "cad_accuracy_topology": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            if (!code) {
              throw new Error("cad_accuracy_topology requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateTopology(code);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateTopology" };
            break;
          }
          case "cad_accuracy_dfm": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const material = params["material"] as string | undefined;
            if (!code) {
              throw new Error("cad_accuracy_dfm requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateDFM(code, material);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateDFM" };
            break;
          }
          case "cad_accuracy_tolerance": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const specs = (params["specs"] as Array<{name: string; nominal: number; tolerance: {plus: number; minus: number}; unit: "mm" | "inch"}>) || [];
            if (!code) {
              throw new Error("cad_accuracy_tolerance requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateTolerance(code, specs);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateTolerance" };
            break;
          }
          case "cad_accuracy_features": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const expectedFeatures = (params["expected_features"] as Array<{type: string; params: Record<string, number>}>) || [];
            if (!code) {
              throw new Error("cad_accuracy_features requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateFeatures(code, expectedFeatures);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateFeatures" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_accuracy_validate"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADAccuracyValidatorEngine wired successfully (6 actions)')
