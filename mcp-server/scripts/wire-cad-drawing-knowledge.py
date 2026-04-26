#!/usr/bin/env python3
"""Wire CADDrawingKnowledgeEngine to cadAutomationDispatcher - U-CUC33"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action string (1 action - calculate interface)
new_actions = '''  "cad_drawing_knowledge_calc",
'''

# Insert after cad_thumb_invalidate in the ACTIONS array
old_actions_end = b'"cad_thumb_invalidate",\r\n] as const;'
new_actions_end = b'"cad_thumb_invalidate",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_drawing_knowledge_calc' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statement
case_code = '''          case "cad_drawing_knowledge_calc": {
            const { cadDrawingKnowledgeEngine } = await import("../../engines/CADDrawingKnowledgeEngine.js");
            const action = params["calc_action"] as string;
            const calcParams = params["calc_params"] as Record<string, unknown>;
            if (!action) {
              throw new Error("cad_drawing_knowledge_calc requires 'calc_action' string");
            }
            const calcResult = cadDrawingKnowledgeEngine.calculate(action, calcParams ?? {});
            result = { result: calcResult, source: "CADDrawingKnowledgeEngine.calculate" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_drawing_knowledge_calc"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADDrawingKnowledgeEngine wired successfully (1 action)')
