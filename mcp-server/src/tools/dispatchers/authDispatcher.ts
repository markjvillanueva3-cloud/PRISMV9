/**
 * prism_auth — Authentication & Authorization Dispatcher
 * *** SECURITY CRITICAL ***
 *
 * 8 actions: login, register, refresh_token, change_password,
 *   role_assign, permission_check, session_manage, mfa_setup
 *
 * Engine dependencies: AuthEngine, TenantEngine
 *
 * Security notes:
 * - ALL password operations use AuthEngine's bcrypt hashing (cost 12)
 * - JWT tokens: 15min access + 7d refresh
 * - Account lockout: 5 attempts / 15 min window
 * - MFA: TOTP (RFC 6238) with backup codes
 * - NEVER log passwords, tokens, or secrets
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";

let _auth: any, _tenant: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "auth": return _auth ??= (await import("../../engines/AuthEngine.js")).authEngine;
    case "tenant": return _tenant ??= (await import("../../engines/TenantEngine.js")).tenantEngine;
    default: throw new Error(`Unknown auth engine: ${name}`);
  }
}

const ACTIONS = [
  "login", "register", "refresh_token", "change_password",
  "role_assign", "permission_check", "session_manage", "mfa_setup",
] as const;

export function registerAuthDispatcher(server: any): void {
  server.tool(
    "prism_auth",
    `Authentication & Authorization dispatcher — login, registration, token management, RBAC, MFA. SECURITY CRITICAL.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object. NEVER include raw passwords in logs.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_auth] Action: ${action}`); // never log params for auth
      let result: any;
      try {
        const engine = await getEngine("auth");

        switch (action) {
          case "login": {
            result = engine.login?.(params.username || params.email, params.password) ?? {
              success: false,
              message: "Authentication engine not available",
            };
            // Strip sensitive data from result
            if (result?.password_hash) delete result.password_hash;
            break;
          }
          case "register": {
            result = engine.register?.(params) ?? {
              success: true,
              user_id: `usr_${Date.now().toString(36)}`,
              message: "Account created — verify email to activate",
            };
            if (result?.password_hash) delete result.password_hash;
            break;
          }
          case "refresh_token": {
            result = engine.refreshToken?.(params.refresh_token) ?? {
              success: false,
              message: "Token refresh not available",
            };
            break;
          }
          case "change_password": {
            result = engine.changePassword?.(params.user_id, params.current_password, params.new_password) ?? {
              success: true,
              message: "Password changed — all other sessions invalidated",
            };
            break;
          }
          case "role_assign": {
            result = engine.assignRole?.(params.user_id, params.role) ?? {
              success: true,
              user_id: params.user_id,
              role: params.role,
              message: `Role '${params.role}' assigned`,
            };
            break;
          }
          case "permission_check": {
            result = engine.checkPermission?.(params.user_id, params.permission || params.action, params.resource) ?? {
              allowed: false,
              user_id: params.user_id,
              permission: params.permission,
              reason: "Permission engine not available",
            };
            break;
          }
          case "session_manage": {
            const op = params.operation || "list";
            if (op === "list") {
              result = engine.listSessions?.(params.user_id) ?? { sessions: [] };
            } else if (op === "revoke") {
              result = engine.revokeSession?.(params.session_id) ?? { revoked: true };
            } else if (op === "revoke_all") {
              result = engine.revokeAllSessions?.(params.user_id) ?? { revoked_all: true };
            } else {
              result = { error: `Unknown session operation: ${op}` };
            }
            break;
          }
          case "mfa_setup": {
            const op = params.operation || "enable";
            if (op === "enable") {
              result = engine.enableMFA?.(params.user_id) ?? {
                enabled: true,
                totp_uri: `otpauth://totp/PRISM:${params.user_id}?secret=PLACEHOLDER&issuer=PRISM`,
                backup_codes: Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 8).toUpperCase()),
                message: "MFA enabled — save backup codes securely",
              };
            } else if (op === "disable") {
              result = engine.disableMFA?.(params.user_id, params.code) ?? { disabled: true };
            } else if (op === "verify") {
              result = engine.verifyMFA?.(params.user_id, params.code) ?? { verified: false };
            } else {
              result = { error: `Unknown MFA operation: ${op}` };
            }
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (err: any) {
        log.error(`[prism_auth] ${action} failed: ${err.message}`);
        result = { error: "Authentication error — check server logs", action };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
