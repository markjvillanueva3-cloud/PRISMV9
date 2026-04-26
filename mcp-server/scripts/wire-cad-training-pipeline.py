#!/usr/bin/env python3
"""Wire CADTrainingPipelineOrchestratorEngine to cadAutomationDispatcher - U-CUC26"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 actions)
new_actions = '''  "cad_pipeline_run",
  "cad_pipeline_validate",
  "cad_pipeline_status",
'''

# Insert after cad_rag_stats in the ACTIONS array
old_actions_end = b'"cad_rag_stats",\r\n] as const;'
new_actions_end = b'"cad_rag_stats",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_pipeline_run' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_pipeline_run": {
            const { cadTrainingPipelineOrchestratorEngine } = await import("../../engines/CADTrainingPipelineOrchestratorEngine.js");
            const config = params["config"] as {
              rootPath: string;
              outputDir?: string;
              maxFiles?: number;
              excludePatterns?: string[];
              indexType?: "flat" | "vptree";
              validateSamples?: number;
              skipValidation?: boolean;
            };
            if (!config || !config.rootPath) {
              throw new Error("cad_pipeline_run requires 'config' with rootPath");
            }
            const pipelineResult = cadTrainingPipelineOrchestratorEngine.run(config);
            result = { ...pipelineResult, source: "CADTrainingPipelineOrchestratorEngine.run" };
            break;
          }
          case "cad_pipeline_validate": {
            const { cadTrainingPipelineOrchestratorEngine } = await import("../../engines/CADTrainingPipelineOrchestratorEngine.js");
            const sampleSize = (params["sample_size"] as number) ?? 10;
            const validation = cadTrainingPipelineOrchestratorEngine.validateIndex(sampleSize);
            result = { ...validation, source: "CADTrainingPipelineOrchestratorEngine.validateIndex" };
            break;
          }
          case "cad_pipeline_status": {
            const { cadTrainingPipelineOrchestratorEngine } = await import("../../engines/CADTrainingPipelineOrchestratorEngine.js");
            const info = cadTrainingPipelineOrchestratorEngine.getInfo();
            const capabilities = cadTrainingPipelineOrchestratorEngine.getCapabilities();
            result = { info, capabilities, source: "CADTrainingPipelineOrchestratorEngine.getInfo" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_pipeline_run"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADTrainingPipelineOrchestratorEngine wired successfully (3 actions)')
