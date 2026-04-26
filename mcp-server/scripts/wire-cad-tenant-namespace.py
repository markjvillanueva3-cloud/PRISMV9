#!/usr/bin/env python3
"""Wire CADTenantNamespaceEngine to cadAutomationDispatcher - U-CUC56"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (7 tenant namespace actions)
new_actions = '''  "cad_tenant_register",
  "cad_tenant_get",
  "cad_tenant_list_by_tenant",
  "cad_tenant_list_all",
  "cad_tenant_can_access",
  "cad_tenant_sign_nda",
  "cad_tenant_find_collisions",
'''

# Find last action before ] as const
old_actions_end = b'"cad_trainer_load_checkpoint",\r\n] as const;'
new_actions_end = b'"cad_trainer_load_checkpoint",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_tenant_register' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadTenantNamespaceEngine
case_code = '''          case "cad_tenant_register": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const input = params["input"] as Parameters<typeof cadTenantNamespaceEngine.register>[0];
            if (!input) {
              throw new Error("cad_tenant_register requires 'input' (registration object)");
            }
            const content = cadTenantNamespaceEngine.register(input);
            result = { content, source: "CADTenantNamespaceEngine.register" };
            break;
          }
          case "cad_tenant_get": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            const contentHash = params["content_hash"] as string;
            if (!tenantId || !contentHash) {
              throw new Error("cad_tenant_get requires 'tenant_id' and 'content_hash'");
            }
            const content = cadTenantNamespaceEngine.get(tenantId, contentHash);
            result = { content: content ?? null, found: !!content, source: "CADTenantNamespaceEngine.get" };
            break;
          }
          case "cad_tenant_list_by_tenant": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            if (!tenantId) {
              throw new Error("cad_tenant_list_by_tenant requires 'tenant_id'");
            }
            const contents = cadTenantNamespaceEngine.listByTenant(tenantId);
            result = { contents, count: contents.length, source: "CADTenantNamespaceEngine.listByTenant" };
            break;
          }
          case "cad_tenant_list_all": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const contents = cadTenantNamespaceEngine.listAll();
            result = { contents, count: contents.length, source: "CADTenantNamespaceEngine.listAll" };
            break;
          }
          case "cad_tenant_can_access": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            const contentHash = params["content_hash"] as string;
            const requestingTenant = params["requesting_tenant"] as string;
            if (!tenantId || !contentHash || !requestingTenant) {
              throw new Error("cad_tenant_can_access requires 'tenant_id', 'content_hash', 'requesting_tenant'");
            }
            const canAccess = cadTenantNamespaceEngine.canAccess(tenantId, contentHash, requestingTenant);
            result = { canAccess, source: "CADTenantNamespaceEngine.canAccess" };
            break;
          }
          case "cad_tenant_sign_nda": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            const contentHash = params["content_hash"] as string;
            const signingTenant = params["signing_tenant"] as string;
            if (!tenantId || !contentHash || !signingTenant) {
              throw new Error("cad_tenant_sign_nda requires 'tenant_id', 'content_hash', 'signing_tenant'");
            }
            const content = cadTenantNamespaceEngine.signNDA(tenantId, contentHash, signingTenant);
            result = { content, source: "CADTenantNamespaceEngine.signNDA" };
            break;
          }
          case "cad_tenant_find_collisions": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const collisions = cadTenantNamespaceEngine.findCollisions();
            result = { collisions, count: collisions.length, source: "CADTenantNamespaceEngine.findCollisions" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_tenant_register"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADTenantNamespaceEngine wired successfully (7 actions)')
