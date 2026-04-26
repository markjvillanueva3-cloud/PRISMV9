#!/usr/bin/env python3
"""Wire CADAccessControlRBACABACEngine to cadAutomationDispatcher - U-CUC30"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (6 access control actions)
new_actions = '''  "cad_access_grant",
  "cad_access_revoke",
  "cad_access_check",
  "cad_access_checkout",
  "cad_access_checkin",
  "cad_access_audit",
'''

# Insert after cad_kernel_generate_box in the ACTIONS array
old_actions_end = b'"cad_kernel_generate_box",\r\n] as const;'
new_actions_end = b'"cad_kernel_generate_box",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_access_grant' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements
case_code = '''          case "cad_access_grant": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const userId = params["user_id"] as string;
            const role = params["role"] as string;
            const expiration = params["expiration"] as string | undefined;
            if (!contentHash || !userId || !role) {
              throw new Error("cad_access_grant requires 'content_hash', 'user_id', and 'role'");
            }
            const policy = cadAccessControlRBACABACEngine.grant(contentHash, { userId, role, expiration });
            result = { policy, source: "CADAccessControlRBACABACEngine.grant" };
            break;
          }
          case "cad_access_revoke": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const userId = params["user_id"] as string;
            if (!contentHash || !userId) {
              throw new Error("cad_access_revoke requires 'content_hash' and 'user_id'");
            }
            const policy = cadAccessControlRBACABACEngine.revoke(contentHash, userId);
            result = { policy, source: "CADAccessControlRBACABACEngine.revoke" };
            break;
          }
          case "cad_access_check": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const user = params["user"] as { id: string; roles: string[]; department?: string };
            const action = params["action"] as "read" | "write" | "delete" | "share";
            if (!contentHash || !user || !action) {
              throw new Error("cad_access_check requires 'content_hash', 'user', and 'action'");
            }
            const decision = cadAccessControlRBACABACEngine.check(contentHash, user, action);
            result = { ...decision, source: "CADAccessControlRBACABACEngine.check" };
            break;
          }
          case "cad_access_checkout": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const user = params["user"] as { id: string; roles: string[]; department?: string };
            if (!contentHash || !user) {
              throw new Error("cad_access_checkout requires 'content_hash' and 'user'");
            }
            const decision = cadAccessControlRBACABACEngine.checkout(contentHash, user);
            result = { ...decision, source: "CADAccessControlRBACABACEngine.checkout" };
            break;
          }
          case "cad_access_checkin": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const user = params["user"] as { id: string; roles: string[]; department?: string };
            if (!contentHash || !user) {
              throw new Error("cad_access_checkin requires 'content_hash' and 'user'");
            }
            const decision = cadAccessControlRBACABACEngine.checkin(contentHash, user);
            result = { ...decision, source: "CADAccessControlRBACABACEngine.checkin" };
            break;
          }
          case "cad_access_audit": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string | undefined;
            const userId = params["user_id"] as string | undefined;
            const events = cadAccessControlRBACABACEngine.auditEvents(contentHash, userId);
            result = { events, count: events.length, source: "CADAccessControlRBACABACEngine.auditEvents" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_access_grant"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADAccessControlRBACABACEngine wired successfully (6 actions)')
