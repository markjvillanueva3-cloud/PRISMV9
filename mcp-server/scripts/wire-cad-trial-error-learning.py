#!/usr/bin/env python3
"""Wire CADTrialErrorLearningEngine to cadAutomationDispatcher - U-CUC24"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 actions)
new_actions = '''  "cad_learning_ingest",
  "cad_learning_ingest_batch",
  "cad_learning_patterns",
  "cad_learning_recommend",
  "cad_learning_stats",
  "cad_learning_reset",
'''

# Insert after cad_visual_diff_report in the ACTIONS array
old_actions_end = b'"cad_visual_diff_report",\r\n] as const;'
new_actions_end = b'"cad_visual_diff_report",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_learning_ingest' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_learning_ingest": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const outcome = params["outcome"] as {
              testId: string;
              originalPath: string;
              status: "pass" | "fail" | "error";
              partType?: string;
              features?: string[];
              generator?: string;
              metrics?: Record<string, { passed: boolean; deviationPct?: number }>;
              error?: string;
            };
            if (!outcome || !outcome.testId || !outcome.originalPath) {
              throw new Error("cad_learning_ingest requires 'outcome' with testId, originalPath, status");
            }
            const ingestResult = cadTrialErrorLearningEngine.ingest(outcome);
            result = { ...ingestResult, source: "CADTrialErrorLearningEngine.ingest" };
            break;
          }
          case "cad_learning_ingest_batch": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const outcomes = params["outcomes"] as unknown[];
            if (!outcomes || !Array.isArray(outcomes)) {
              throw new Error("cad_learning_ingest_batch requires 'outcomes' array");
            }
            const batchResult = cadTrialErrorLearningEngine.ingestBatch(outcomes);
            result = { ...batchResult, source: "CADTrialErrorLearningEngine.ingestBatch" };
            break;
          }
          case "cad_learning_patterns": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const patterns = cadTrialErrorLearningEngine.extractPatterns();
            result = { patterns, count: patterns.length, source: "CADTrialErrorLearningEngine.extractPatterns" };
            break;
          }
          case "cad_learning_recommend": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const candidate = params["candidate"] as {
              partType?: string;
              features?: string[];
              generator?: string;
            } | undefined;
            const recommendation = cadTrialErrorLearningEngine.recommendAdjustments(candidate ?? {});
            result = { ...recommendation, source: "CADTrialErrorLearningEngine.recommendAdjustments" };
            break;
          }
          case "cad_learning_stats": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const opts = {
              since: params["since"] as string | undefined,
              partType: params["part_type"] as string | undefined,
            };
            const stats = cadTrialErrorLearningEngine.getFailureStats(opts);
            result = { ...stats, source: "CADTrialErrorLearningEngine.getFailureStats" };
            break;
          }
          case "cad_learning_reset": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const eraseLedger = params["erase_ledger"] as boolean | undefined;
            cadTrialErrorLearningEngine.reset({ eraseLedger: eraseLedger ?? false });
            result = { reset: true, erasedLedger: eraseLedger ?? false, source: "CADTrialErrorLearningEngine.reset" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_learning_ingest"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADTrialErrorLearningEngine wired successfully (6 actions)')
