#!/usr/bin/env python3
"""Wire CADFeatureRecognitionEngine to cadAutomationDispatcher - U-CUC31"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action string (1 action - simple engine)
new_actions = '''  "cad_feature_extract",
'''

# Insert after cad_access_audit in the ACTIONS array
old_actions_end = b'"cad_access_audit",\r\n] as const;'
new_actions_end = b'"cad_access_audit",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_feature_extract' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statement
case_code = '''          case "cad_feature_extract": {
            const { cadFeatureRecognitionEngine } = await import("../../engines/CADFeatureRecognitionEngine.js");
            const geometry = params["geometry"];
            const extracted = cadFeatureRecognitionEngine.extractFeatures(geometry);
            result = { ...extracted, source: "CADFeatureRecognitionEngine.extractFeatures" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_feature_extract"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADFeatureRecognitionEngine wired successfully (1 action)')
