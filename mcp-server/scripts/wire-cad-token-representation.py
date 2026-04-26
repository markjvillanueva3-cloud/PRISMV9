#!/usr/bin/env python3
"""Wire CADTokenRepresentationEngine to cadAutomationDispatcher - U-CUC58"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (7 token representation actions)
new_actions = '''  "cad_token_vocab_size",
  "cad_token_vocab_version",
  "cad_token_get_id",
  "cad_token_get_name",
  "cad_token_get_def",
  "cad_token_list_names",
  "cad_token_supported_formats",
'''

# Find last action before ] as const
old_actions_end = b'"cad_checkpoint_load",\r\n] as const;'
new_actions_end = b'"cad_checkpoint_load",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_token_vocab_size' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadTokenRepresentationEngine
case_code = '''          case "cad_token_vocab_size": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const size = cadTokenRepresentationEngine.vocabularySize();
            result = { size, source: "CADTokenRepresentationEngine.vocabularySize" };
            break;
          }
          case "cad_token_vocab_version": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const version = cadTokenRepresentationEngine.vocabularyVersion();
            result = { version, source: "CADTokenRepresentationEngine.vocabularyVersion" };
            break;
          }
          case "cad_token_get_id": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const name = params["name"] as string;
            if (!name) {
              throw new Error("cad_token_get_id requires 'name'");
            }
            const id = cadTokenRepresentationEngine.getTokenId(name);
            result = { id, source: "CADTokenRepresentationEngine.getTokenId" };
            break;
          }
          case "cad_token_get_name": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const id = params["id"] as number;
            if (id === undefined) {
              throw new Error("cad_token_get_name requires 'id'");
            }
            const name = cadTokenRepresentationEngine.getTokenName(id);
            result = { name: name ?? null, found: name !== null, source: "CADTokenRepresentationEngine.getTokenName" };
            break;
          }
          case "cad_token_get_def": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const nameOrId = params["name_or_id"] as string | number;
            if (nameOrId === undefined) {
              throw new Error("cad_token_get_def requires 'name_or_id'");
            }
            const def = cadTokenRepresentationEngine.getTokenDef(nameOrId);
            result = { def: def ?? null, found: !!def, source: "CADTokenRepresentationEngine.getTokenDef" };
            break;
          }
          case "cad_token_list_names": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const names = cadTokenRepresentationEngine.listTokenNames();
            result = { names, count: names.length, source: "CADTokenRepresentationEngine.listTokenNames" };
            break;
          }
          case "cad_token_supported_formats": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const formats = cadTokenRepresentationEngine.supportedFormats();
            result = { formats, count: formats.length, source: "CADTokenRepresentationEngine.supportedFormats" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_token_vocab_size"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADTokenRepresentationEngine wired successfully (7 actions)')
