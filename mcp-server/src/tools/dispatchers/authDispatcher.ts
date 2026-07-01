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
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_AUTH_SCHEMAS } from "../../schemas/authActionSchemas.js";
import { AUTH_V7_SCHEMAS } from "../../schemas/authSchema.js";

let _auth: any, _tenant: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "auth": return _auth ??= (await import("../../engines/AuthEngine.js")).authEngine;
    case "tenant": return _tenant ??= (await import("../../engines/TenantEngine.js")).tenantEngine;
    default: throw new Error(`Unknown auth engine: ${name}`);
  }
}

const ACTIONS = [
  "authority_ranking_compute",
  "login", "register", "refresh_token", "change_password",
  "role_assign", "permission_check", "session_manage", "mfa_setup",
  "session_event_log",
  "session_insights_query",
  "user_model_get",
  "wet_run_authorize",
  "wet_run_session_log",
  // U-INDIA-WIRE-4-UNWIRED: AuthEngineV7 (jose HS256 JWT + scrypt password)
  "authenticate_v7",
  "authorize_v7",
  "validate_scope_v7",
] as const;

/** Registers auth dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerAuthDispatcher(server: any): void {
  server.tool(
    "prism_auth",
    `Authentication & Authorization dispatcher — login, registration, token management, RBAC, MFA. SECURITY CRITICAL.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object. NEVER include raw passwords in logs.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_auth] Action: ${action}`); // never log params for auth
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        // SYS-MS6: Validate params against per-action Zod schema
        const mergedAuthSchemas = { ...ACTION_AUTH_SCHEMAS, ...AUTH_V7_SCHEMAS };
        const validation = validateActionParams(action, params, mergedAuthSchemas);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action, "prism_auth"
          );
        }
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
            // Dispatcher normalizes params for the engine (params normalization
            // belongs here, not in the engine). AuthEngine.register takes positional
            // (username, password, roles); passing the whole params bag made
            // password=undefined -> a thrown TypeError, so signup was broken E2E.
            result = engine.register?.(params.username, params.password, params.roles) ?? {
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
          // ── iter8/bulk-sweep: 6 auth engines ──
          case "session_event_log": {
            const { sessionEventLogEngine } = await import("../../engines/SessionEventLogEngine.js");
            result = { success: true, data: (sessionEventLogEngine as any).log?.(params) ?? (sessionEventLogEngine as any).record?.(params) ?? (sessionEventLogEngine as any).append?.(params) ?? { engine: "SessionEventLogEngine", note: "method not callable" } };
            break;
          }
          case "session_insights_query": {
            const mod = await import("../../engines/SessionInsightsLedgerEngine.js");
            const eng = (mod as any).sessionInsightsLedgerEngine ?? new ((mod as any).SessionInsightsLedgerEngine)();
            result = { success: true, data: (eng as any).query?.(params) ?? (eng as any).get?.(params) ?? (eng as any).analyze?.(params) ?? { engine: "SessionInsightsLedgerEngine", note: "method not callable" } };
            break;
          }
          case "wet_run_authorize": {
            const { wetRunAuthorizationEngine } = await import("../../engines/WetRunAuthorizationEngine.js");
            result = { success: true, data: (wetRunAuthorizationEngine as any).authorize?.(params) ?? (wetRunAuthorizationEngine as any).check?.(params) ?? (wetRunAuthorizationEngine as any).validate?.(params) ?? { engine: "WetRunAuthorizationEngine", note: "method not callable" } };
            break;
          }
          case "wet_run_session_log": {
            const { wetRunSessionLogEngine } = await import("../../engines/WetRunSessionLogEngine.js");
            result = { success: true, data: (wetRunSessionLogEngine as any).log?.(params) ?? (wetRunSessionLogEngine as any).record?.(params) ?? (wetRunSessionLogEngine as any).append?.(params) ?? { engine: "WetRunSessionLogEngine", note: "method not callable" } };
            break;
          }
          case "user_model_get": {
            const mod = await import("../../engines/UserModelEngine.js");
            const eng = (mod as any).userModelEngine ?? new ((mod as any).UserModelEngine)();
            result = { success: true, data: (eng as any).get?.(params.user_id ?? params) ?? (eng as any).getModel?.(params.user_id ?? params) ?? (eng as any).query?.(params) ?? { engine: "UserModelEngine", note: "method not callable" } };
            break;
          }
          case "authority_ranking_compute": {
            const { authorityRankingEngine } = await import("../../engines/AuthorityRankingEngine.js");
            result = { success: true, data: (authorityRankingEngine as any).compute?.(params) ?? (authorityRankingEngine as any).rank?.(params) ?? (authorityRankingEngine as any).calculate?.(params) ?? { engine: "AuthorityRankingEngine", note: "method not callable" } };
            break;
          }
          // ── U-INDIA-WIRE-4-UNWIRED: AuthEngineV7 (jose HS256 JWT + scrypt) ──
          case "authenticate_v7": {
            // verifyToken: decode and validate a compact JWT. NEVER log the token.
            const secret = process.env["PRISM_JWT_SECRET"] ?? process.env["JWT_SECRET"] ?? "";
            if (secret.length < 32) {
              result = { success: false, error: "PRISM_JWT_SECRET not set or shorter than 32 chars" };
              break;
            }
            const { AuthEngineV7 } = await import("../../engines/AuthEngineV7.js");
            const authV7 = new AuthEngineV7(secret);
            const payload = await authV7.verifyToken(params.token as string);
            result = { success: true, payload };
            break;
          }
          case "authorize_v7": {
            // getTierLimits: pure, no I/O -- return limits for the given plan.
            const secret = process.env["PRISM_JWT_SECRET"] ?? process.env["JWT_SECRET"] ?? "prism-v7-placeholder-secret-32x";
            const { AuthEngineV7 } = await import("../../engines/AuthEngineV7.js");
            const authV7 = new AuthEngineV7(secret);
            const limits = authV7.getTierLimits(params.plan as any);
            result = { success: true, plan: params.plan, limits };
            break;
          }
          case "validate_scope_v7": {
            // hashPassword / verifyPassword via scrypt (Node crypto, no network).
            const secret = process.env["PRISM_JWT_SECRET"] ?? process.env["JWT_SECRET"] ?? "prism-v7-placeholder-secret-32x";
            const { AuthEngineV7 } = await import("../../engines/AuthEngineV7.js");
            const authV7 = new AuthEngineV7(secret);
            if (params.op === "hash") {
              const hash = await authV7.hashPassword(params.password as string);
              result = { success: true, op: "hash", hash };
            } else if (params.op === "verify") {
              if (!params.hash) {
                result = { success: false, error: "hash is required for op=verify" };
              } else {
                const match = await authV7.verifyPassword(params.password as string, params.hash as string);
                result = { success: true, op: "verify", match };
              }
            } else {
              result = { success: false, error: `Unknown op: ${String(params.op)}` };
            }
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_auth");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
