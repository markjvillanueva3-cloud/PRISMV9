#!/usr/bin/env python3
"""Wire CADSequenceTrainerEngine to cadAutomationDispatcher - U-CUC55"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 sequence trainer actions)
new_actions = '''  "cad_trainer_param_count",
  "cad_trainer_update_on_batch",
  "cad_trainer_score_sequence",
  "cad_trainer_predict_next",
  "cad_trainer_serialize_checkpoint",
  "cad_trainer_load_checkpoint",
'''

# Find last action before ] as const
old_actions_end = b'"cad_revision_reject",\r\n] as const;'
new_actions_end = b'"cad_revision_reject",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_trainer_param_count' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadSequenceTrainerEngine
case_code = '''          case "cad_trainer_param_count": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const count = cadSequenceTrainerEngine.getParamCount();
            result = { paramCount: count, source: "CADSequenceTrainerEngine.getParamCount" };
            break;
          }
          case "cad_trainer_update_on_batch": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const batch = params["batch"] as Parameters<typeof cadSequenceTrainerEngine.updateOnBatch>[0];
            const lr = params["learning_rate"] as number;
            if (!batch || lr === undefined) {
              throw new Error("cad_trainer_update_on_batch requires 'batch' (TrainingBatch) and 'learning_rate'");
            }
            const update = cadSequenceTrainerEngine.updateOnBatch(batch, lr);
            result = { ...update, source: "CADSequenceTrainerEngine.updateOnBatch" };
            break;
          }
          case "cad_trainer_score_sequence": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const seq = params["sequence"] as Parameters<typeof cadSequenceTrainerEngine.scoreSequence>[0];
            if (!seq) {
              throw new Error("cad_trainer_score_sequence requires 'sequence' (TokenSeq)");
            }
            const score = cadSequenceTrainerEngine.scoreSequence(seq);
            result = { score, source: "CADSequenceTrainerEngine.scoreSequence" };
            break;
          }
          case "cad_trainer_predict_next": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const ctx = params["context"] as Parameters<typeof cadSequenceTrainerEngine.predictNext>[0];
            if (!ctx) {
              throw new Error("cad_trainer_predict_next requires 'context' (TokenSeq)");
            }
            const nextToken = cadSequenceTrainerEngine.predictNext(ctx);
            result = { nextToken, source: "CADSequenceTrainerEngine.predictNext" };
            break;
          }
          case "cad_trainer_serialize_checkpoint": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const checkpoint = cadSequenceTrainerEngine.serializeCheckpoint();
            result = { checkpoint, source: "CADSequenceTrainerEngine.serializeCheckpoint" };
            break;
          }
          case "cad_trainer_load_checkpoint": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const data = params["data"] as string;
            if (!data) {
              throw new Error("cad_trainer_load_checkpoint requires 'data' (checkpoint string)");
            }
            cadSequenceTrainerEngine.loadCheckpoint(data);
            result = { loaded: true, source: "CADSequenceTrainerEngine.loadCheckpoint" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_trainer_param_count"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADSequenceTrainerEngine wired successfully (6 actions)')
