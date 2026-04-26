#!/usr/bin/env python3
"""Wire CADFileClassifierEngine to cadAutomationDispatcher - U-CUC16"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (3 actions)
new_actions = '''  "cad_classify_run",
  "cad_classify_one",
  "cad_classify_format",
'''

# Insert after cad_drawing_index_size in the ACTIONS array
old_actions_end = b'"cad_drawing_index_size",\r\n] as const;'
new_actions_end = b'"cad_drawing_index_size",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_classify_run' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_classify_run": {
            const { cadFileClassifierEngine } = await import("../../engines/CADFileClassifierEngine.js");
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const indexPath = params["index_path"] as string | undefined;
            const includeClassifications = (params["include_classifications"] as boolean) ?? true;
            const index = cadFileIndexerEngine.load(indexPath);
            if (!index) {
              result = { success: false, error: "No index found. Run cad_index_scan first.", source: "CADFileClassifierEngine" };
            } else {
              const summary = cadFileClassifierEngine.classify(index.files, { includeClassifications });
              result = { success: true, ...summary, source: "CADFileClassifierEngine.classify" };
            }
            break;
          }
          case "cad_classify_one": {
            const { cadFileClassifierEngine } = await import("../../engines/CADFileClassifierEngine.js");
            const format = params["format"] as string;
            if (!format) {
              throw new Error("cad_classify_one requires 'format' string (e.g. '.sldprt')");
            }
            const classification = cadFileClassifierEngine.classifyOne(format);
            result = { ...classification, source: "CADFileClassifierEngine.classifyOne" };
            break;
          }
          case "cad_classify_format": {
            const { classifyFormat } = await import("../../engines/CADFileClassifierEngine.js");
            const format = params["format"] as string;
            if (!format) {
              throw new Error("cad_classify_format requires 'format' string (e.g. '.step')");
            }
            const profile = classifyFormat(format);
            result = { ...profile, source: "CADFileClassifierEngine.classifyFormat" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_classify_run"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADFileClassifierEngine wired successfully (3 actions)')
