#!/usr/bin/env python3
"""Wire CADFailureTriageEngine to cadAutomationDispatcher - U-CUC39"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (2 failure triage actions)
new_actions = '''  "cad_failure_triage",
  "cad_failure_group",
'''

# Find last action before ] as const
old_actions_end = b'"cad_crash_policy_set",\r\n] as const;'
new_actions_end = b'"cad_crash_policy_set",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_failure_triage' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadFailureTriageEngine
case_code = '''          case "cad_failure_triage": {
            const { cadFailureTriageEngine } = await import("../../engines/CADFailureTriageEngine.js");
            const failure = params["failure"] as Parameters<typeof cadFailureTriageEngine.triage>[0];
            if (!failure) {
              throw new Error("cad_failure_triage requires 'failure' (FailurePayload)");
            }
            const triageResult = cadFailureTriageEngine.triage(failure);
            result = { result: triageResult, source: "CADFailureTriageEngine.triage" };
            break;
          }
          case "cad_failure_group": {
            const { cadFailureTriageEngine } = await import("../../engines/CADFailureTriageEngine.js");
            const rawResults = params["results"];
            if (!rawResults || !Array.isArray(rawResults)) {
              throw new Error("cad_failure_group requires 'results' array (TriageResult[])");
            }
            const groups = cadFailureTriageEngine.group(rawResults as Parameters<typeof cadFailureTriageEngine.group>[0]);
            result = { groups, count: groups.length, source: "CADFailureTriageEngine.group" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_failure_triage"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADFailureTriageEngine wired successfully (2 actions)')
