#!/usr/bin/env python3
"""Wire CADDrawingNumberNormalizerEngine to cadAutomationDispatcher - U-CUC15"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (4 actions)
new_actions = '''  "cad_drawing_parse",
  "cad_drawing_fuzzy_find",
  "cad_drawing_get_family",
  "cad_drawing_index_size",
'''

# Insert after cad_index_status in the ACTIONS array
old_actions_end = b'"cad_index_status",\r\n] as const;'
new_actions_end = b'"cad_index_status",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_drawing_parse' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_drawing_parse": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            const rawNumber = params["raw"] as string;
            if (!rawNumber) {
              throw new Error("cad_drawing_parse requires 'raw' string");
            }
            const parsed = cadDrawingNumberNormalizerEngine.parse(rawNumber);
            result = { ...parsed, source: "CADDrawingNumberNormalizerEngine.parse" };
            break;
          }
          case "cad_drawing_fuzzy_find": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            const rawNumber = params["raw"] as string;
            const maxDistance = (params["max_distance"] as number) || 2;
            if (!rawNumber) {
              throw new Error("cad_drawing_fuzzy_find requires 'raw' string");
            }
            const matches = cadDrawingNumberNormalizerEngine.fuzzyFind(rawNumber, maxDistance);
            result = { matches, count: matches.length, source: "CADDrawingNumberNormalizerEngine.fuzzyFind" };
            break;
          }
          case "cad_drawing_get_family": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            const familyKey = params["family_key"] as string;
            if (!familyKey) {
              throw new Error("cad_drawing_get_family requires 'family_key' string");
            }
            const family = cadDrawingNumberNormalizerEngine.getFamily(familyKey);
            result = { family: family || null, found: !!family, source: "CADDrawingNumberNormalizerEngine.getFamily" };
            break;
          }
          case "cad_drawing_index_size": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            result = { size: cadDrawingNumberNormalizerEngine.size, source: "CADDrawingNumberNormalizerEngine.size" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_drawing_parse"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADDrawingNumberNormalizerEngine wired successfully (4 actions)')
