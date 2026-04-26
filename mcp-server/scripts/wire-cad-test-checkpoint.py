#!/usr/bin/env python3
"""Wire CADTestCheckpointEngine to cadAutomationDispatcher - U-CUC57"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 test checkpoint actions)
new_actions = '''  "cad_checkpoint_validate",
  "cad_checkpoint_create_cadence",
  "cad_checkpoint_record_transition",
  "cad_checkpoint_save",
  "cad_checkpoint_load",
'''

# Find last action before ] as const
old_actions_end = b'"cad_tenant_find_collisions",\r\n] as const;'
new_actions_end = b'"cad_tenant_find_collisions",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_checkpoint_validate' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadTestCheckpointEngine
case_code = '''          case "cad_checkpoint_validate": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const input = params["input"];
            const error = cadTestCheckpointEngine.validate(input);
            result = { valid: error === null, error, source: "CADTestCheckpointEngine.validate" };
            break;
          }
          case "cad_checkpoint_create_cadence": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const opts = params["options"] as Parameters<typeof cadTestCheckpointEngine.createCadence>[0];
            const state = cadTestCheckpointEngine.createCadence(opts);
            result = { state, source: "CADTestCheckpointEngine.createCadence" };
            break;
          }
          case "cad_checkpoint_record_transition": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const state = params["state"] as Parameters<typeof cadTestCheckpointEngine.recordTransition>[0];
            const nowMs = params["now_ms"] as number | undefined;
            if (!state) {
              throw new Error("cad_checkpoint_record_transition requires 'state' (CheckpointCadenceState)");
            }
            const shouldSave = cadTestCheckpointEngine.recordTransition(state, nowMs);
            result = { shouldSave, state, source: "CADTestCheckpointEngine.recordTransition" };
            break;
          }
          case "cad_checkpoint_save": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const batch = params["batch"] as Parameters<typeof cadTestCheckpointEngine.save>[0];
            const outputPath = params["output_path"] as string;
            if (!batch || !outputPath) {
              throw new Error("cad_checkpoint_save requires 'batch' (TestBatch) and 'output_path'");
            }
            await cadTestCheckpointEngine.save(batch, outputPath);
            result = { saved: true, path: outputPath, source: "CADTestCheckpointEngine.save" };
            break;
          }
          case "cad_checkpoint_load": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const inputPath = params["input_path"] as string;
            if (!inputPath) {
              throw new Error("cad_checkpoint_load requires 'input_path'");
            }
            const batch = await cadTestCheckpointEngine.load(inputPath);
            result = { batch: batch ?? null, found: !!batch, source: "CADTestCheckpointEngine.load" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_checkpoint_validate"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADTestCheckpointEngine wired successfully (5 actions)')
