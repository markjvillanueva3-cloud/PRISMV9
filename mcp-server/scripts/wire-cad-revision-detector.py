#!/usr/bin/env python3
"""Wire CADRevisionDetectorEngine to cadAutomationDispatcher - U-CUC21"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (2 actions)
new_actions = '''  "cad_revision_detect",
  "cad_revision_group",
'''

# Insert after cad_search_stats in the ACTIONS array
old_actions_end = b'"cad_search_stats",\r\n] as const;'
new_actions_end = b'"cad_search_stats",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_revision_detect' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_revision_detect": {
            const { cadRevisionDetectorEngine } = await import("../../engines/CADRevisionDetectorEngine.js");
            const filename = params["filename"] as string;
            if (!filename) {
              throw new Error("cad_revision_detect requires 'filename' string");
            }
            const tag = cadRevisionDetectorEngine.detect(filename);
            result = { ...tag, source: "CADRevisionDetectorEngine.detect" };
            break;
          }
          case "cad_revision_group": {
            const { cadRevisionDetectorEngine } = await import("../../engines/CADRevisionDetectorEngine.js");
            const filenames = params["filenames"] as string[];
            if (!filenames || !Array.isArray(filenames)) {
              throw new Error("cad_revision_group requires 'filenames' string array");
            }
            const groups = cadRevisionDetectorEngine.group(filenames);
            result = { groups, count: groups.length, source: "CADRevisionDetectorEngine.group" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_revision_detect"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADRevisionDetectorEngine wired successfully (2 actions)')
