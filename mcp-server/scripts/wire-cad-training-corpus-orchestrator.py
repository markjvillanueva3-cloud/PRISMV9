#!/usr/bin/env python3
"""Wire CADTrainingCorpusOrchestratorEngine to cadAutomationDispatcher - U-CUC59"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (2 training corpus orchestrator actions)
new_actions = '''  "cad_corpus_scan_only",
  "cad_corpus_orchestrate",
'''

# Find last action before ] as const
old_actions_end = b'"cad_token_supported_formats",\r\n] as const;'
new_actions_end = b'"cad_token_supported_formats",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_corpus_scan_only' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadTrainingCorpusOrchestratorEngine
case_code = '''          case "cad_corpus_scan_only": {
            const { cadTrainingCorpusOrchestratorEngine } = await import("../../engines/CADTrainingCorpusOrchestratorEngine.js");
            const config = params["config"] as Parameters<typeof cadTrainingCorpusOrchestratorEngine.scanOnly>[0];
            if (!config || !config.rootPath) {
              throw new Error("cad_corpus_scan_only requires 'config' with 'rootPath'");
            }
            const files = cadTrainingCorpusOrchestratorEngine.scanOnly(config);
            result = { files, count: files.length, source: "CADTrainingCorpusOrchestratorEngine.scanOnly" };
            break;
          }
          case "cad_corpus_orchestrate": {
            const { cadTrainingCorpusOrchestratorEngine } = await import("../../engines/CADTrainingCorpusOrchestratorEngine.js");
            const config = params["config"] as Parameters<typeof cadTrainingCorpusOrchestratorEngine.orchestrate>[0];
            if (!config || !config.rootPath) {
              throw new Error("cad_corpus_orchestrate requires 'config' with 'rootPath'");
            }
            const orchestrationResult = cadTrainingCorpusOrchestratorEngine.orchestrate(config);
            result = { ...orchestrationResult, source: "CADTrainingCorpusOrchestratorEngine.orchestrate" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_corpus_scan_only"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADTrainingCorpusOrchestratorEngine wired successfully (2 actions)')
