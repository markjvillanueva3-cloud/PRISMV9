#!/usr/bin/env python3
"""Wire CADParameterPredictorEngine to cadAutomationDispatcher - U-CUC43"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (4 parameter predictor actions)
new_actions = '''  "cad_param_predict",
  "cad_param_model_info",
  "cad_param_train",
  "cad_param_evaluate",
'''

# Find last action before ] as const
old_actions_end = b'"cad_license_health_summary",\r\n] as const;'
new_actions_end = b'"cad_license_health_summary",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_param_predict' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadParameterPredictorEngine
case_code = '''          case "cad_param_predict": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const geometry = params["geometry"] as Parameters<typeof cadParameterPredictorEngine.predict>[0];
            if (!geometry) {
              throw new Error("cad_param_predict requires 'geometry' (TargetGeometry)");
            }
            const prediction = cadParameterPredictorEngine.predict(geometry);
            result = { prediction, source: "CADParameterPredictorEngine.predict" };
            break;
          }
          case "cad_param_model_info": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const info = cadParameterPredictorEngine.getModelInfo();
            result = { info, source: "CADParameterPredictorEngine.getModelInfo" };
            break;
          }
          case "cad_param_train": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const samples = params["samples"] as Parameters<typeof cadParameterPredictorEngine.train>[0];
            const corpusName = params["corpus_name"] as string | undefined;
            if (!samples || !Array.isArray(samples)) {
              throw new Error("cad_param_train requires 'samples' array (TrainingSample[])");
            }
            const trainResult = cadParameterPredictorEngine.train(samples, { corpusName });
            result = { result: trainResult, source: "CADParameterPredictorEngine.train" };
            break;
          }
          case "cad_param_evaluate": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const samples = params["samples"] as Parameters<typeof cadParameterPredictorEngine.evaluate>[0];
            if (!samples || !Array.isArray(samples)) {
              throw new Error("cad_param_evaluate requires 'samples' array (TrainingSample[])");
            }
            const report = cadParameterPredictorEngine.evaluate(samples);
            result = { report, source: "CADParameterPredictorEngine.evaluate" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_param_predict"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADParameterPredictorEngine wired successfully (4 actions)')
