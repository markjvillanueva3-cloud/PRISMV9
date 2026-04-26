#!/usr/bin/env python3
"""Wire CADVisualDiffEngine to cadAutomationDispatcher - U-CUC23"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 actions)
new_actions = '''  "cad_visual_diff_features",
  "cad_visual_diff_hashes",
  "cad_visual_diff_report",
'''

# Insert after cad_reasoning_list in the ACTIONS array
old_actions_end = b'"cad_reasoning_list",\r\n] as const;'
new_actions_end = b'"cad_reasoning_list",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_visual_diff_features' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_visual_diff_features": {
            const { cadVisualDiffEngine } = await import("../../engines/CADVisualDiffEngine.js");
            const before = params["before"] as Array<{
              id: string;
              featureType: string;
              order: number;
              parameters: Record<string, unknown>;
            }>;
            const after = params["after"] as Array<{
              id: string;
              featureType: string;
              order: number;
              parameters: Record<string, unknown>;
            }>;
            if (!before || !after) {
              throw new Error("cad_visual_diff_features requires 'before' and 'after' feature arrays");
            }
            const diffs = cadVisualDiffEngine.diffFeatureTrees(before, after);
            result = { diffs, count: diffs.length, source: "CADVisualDiffEngine.diffFeatureTrees" };
            break;
          }
          case "cad_visual_diff_hashes": {
            const { cadVisualDiffEngine } = await import("../../engines/CADVisualDiffEngine.js");
            const hashA = params["hash_a"] as string;
            const hashB = params["hash_b"] as string;
            if (!hashA || !hashB) {
              throw new Error("cad_visual_diff_hashes requires 'hash_a' and 'hash_b' hex strings");
            }
            const comparison = cadVisualDiffEngine.comparePerceptualHashes(hashA, hashB);
            result = { ...comparison, source: "CADVisualDiffEngine.comparePerceptualHashes" };
            break;
          }
          case "cad_visual_diff_report": {
            const { cadVisualDiffEngine } = await import("../../engines/CADVisualDiffEngine.js");
            const input = params["input"] as {
              drawingNumber: string;
              beforeRevision: string;
              afterRevision: string;
              beforeTree: Array<{
                id: string;
                featureType: string;
                order: number;
                parameters: Record<string, unknown>;
              }>;
              afterTree: Array<{
                id: string;
                featureType: string;
                order: number;
                parameters: Record<string, unknown>;
              }>;
              beforePerceptualHash?: string;
              afterPerceptualHash?: string;
            };
            if (!input || !input.drawingNumber || !input.beforeTree || !input.afterTree) {
              throw new Error("cad_visual_diff_report requires 'input' with drawingNumber, beforeTree, afterTree");
            }
            const report = cadVisualDiffEngine.buildReport(input);
            result = { ...report, source: "CADVisualDiffEngine.buildReport" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_visual_diff_features"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADVisualDiffEngine wired successfully (3 actions)')
