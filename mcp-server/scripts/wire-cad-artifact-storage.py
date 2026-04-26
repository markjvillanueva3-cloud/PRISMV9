#!/usr/bin/env python3
"""Wire CADArtifactStorageEngine to cadAutomationDispatcher - U-CUC34"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 artifact storage actions)
new_actions = '''  "cad_artifact_write",
  "cad_artifact_list",
  "cad_artifact_prune",
'''

# Find last action before ] as const
# Look for the pattern of last action entry
old_actions_end = b'"cad_drawing_knowledge_calc",\r\n] as const;'
new_actions_end = b'"cad_thumb_invalidate",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_artifact_write' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_artifact_write": {
            const { CADArtifactStorageEngine } = await import("../../engines/CADArtifactStorageEngine.js");
            const engine = new CADArtifactStorageEngine();
            const batchId = params["batch_id"] as string;
            const fileId = params["file_id"] as string;
            const kind = params["kind"] as "expected_step" | "actual_step" | "diff_png" | "error_log";
            const data = params["data"] as string;
            if (!batchId || !fileId || !kind || data === undefined) {
              throw new Error("cad_artifact_write requires 'batch_id', 'file_id', 'kind', 'data'");
            }
            const record = await engine.write(batchId, fileId, kind, data);
            result = { record, source: "CADArtifactStorageEngine.write" };
            break;
          }
          case "cad_artifact_list": {
            const { CADArtifactStorageEngine } = await import("../../engines/CADArtifactStorageEngine.js");
            const engine = new CADArtifactStorageEngine();
            const batchId = params["batch_id"] as string;
            if (!batchId) {
              throw new Error("cad_artifact_list requires 'batch_id'");
            }
            const manifest = await engine.listBatch(batchId);
            result = { manifest, source: "CADArtifactStorageEngine.listBatch" };
            break;
          }
          case "cad_artifact_prune": {
            const { CADArtifactStorageEngine } = await import("../../engines/CADArtifactStorageEngine.js");
            const engine = new CADArtifactStorageEngine();
            const maxBatches = params["max_batches"] as number | undefined;
            const report = await engine.pruneRetention(maxBatches);
            result = { report, source: "CADArtifactStorageEngine.pruneRetention" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_artifact_write"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADArtifactStorageEngine wired successfully (3 actions)')
