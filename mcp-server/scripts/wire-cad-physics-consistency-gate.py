#!/usr/bin/env python3
"""Wire CADPhysicsConsistencyGateEngine to cadAutomationDispatcher - U-CUC52"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (5 physics consistency gate actions)
new_actions = '''  "cad_physics_gate_validate",
  "cad_physics_gate_validate_batch",
  "cad_physics_gate_constants",
  "cad_physics_gate_stats",
  "cad_physics_gate_reset_stats",
'''

# Find last action before ] as const
old_actions_end = b'"cad_augment_get_config",\r\n] as const;'
new_actions_end = b'"cad_augment_get_config",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_physics_gate_validate' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadPhysicsConsistencyGateEngine
case_code = '''          case "cad_physics_gate_validate": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const input = params["input"] as Parameters<typeof cadPhysicsConsistencyGateEngine.validate>[0];
            if (!input) {
              throw new Error("cad_physics_gate_validate requires 'input' (PhysicsValidationInput)");
            }
            const gateResult = cadPhysicsConsistencyGateEngine.validate(input);
            result = { ...gateResult, source: "CADPhysicsConsistencyGateEngine.validate" };
            break;
          }
          case "cad_physics_gate_validate_batch": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const input = params["input"] as Parameters<typeof cadPhysicsConsistencyGateEngine.validateBatch>[0];
            if (!input) {
              throw new Error("cad_physics_gate_validate_batch requires 'input' (BatchValidationInput)");
            }
            const batchResult = cadPhysicsConsistencyGateEngine.validateBatch(input);
            result = { ...batchResult, source: "CADPhysicsConsistencyGateEngine.validateBatch" };
            break;
          }
          case "cad_physics_gate_constants": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const isoGroup = params["iso_group"] as Parameters<typeof cadPhysicsConsistencyGateEngine.getPhysicsConstants>[0];
            if (!isoGroup) {
              throw new Error("cad_physics_gate_constants requires 'iso_group'");
            }
            const constants = cadPhysicsConsistencyGateEngine.getPhysicsConstants(isoGroup);
            result = { constants, source: "CADPhysicsConsistencyGateEngine.getPhysicsConstants" };
            break;
          }
          case "cad_physics_gate_stats": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const stats = cadPhysicsConsistencyGateEngine.getStats();
            result = { stats, source: "CADPhysicsConsistencyGateEngine.getStats" };
            break;
          }
          case "cad_physics_gate_reset_stats": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            cadPhysicsConsistencyGateEngine.resetStats();
            result = { reset: true, source: "CADPhysicsConsistencyGateEngine.resetStats" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_physics_gate_validate"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADPhysicsConsistencyGateEngine wired successfully (5 actions)')
