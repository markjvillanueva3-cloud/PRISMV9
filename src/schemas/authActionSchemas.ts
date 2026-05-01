/**
 * Auth Dispatcher Action Schemas
 * ================================
 * Per-action Zod schemas for all 8 prism_auth actions.
 * SECURITY CRITICAL — validates auth/RBAC/MFA parameters.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/authActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();

// ============================================================================
// login
// ============================================================================

const login = z.object({
  username: optStr.describe("Username (alternative to email)"),
  email: optStr.describe("Email (alternative to username)"),
  password: z.string().describe("User password"),
}).passthrough();

// ============================================================================
// register
// ============================================================================

const register = z.object({
  username: z.string().optional().describe("Desired username"),
  email: z.string().optional().describe("User email"),
  password: z.string().optional().describe("User password"),
  display_name: optStr.describe("Display name"),
}).passthrough();

// ============================================================================
// refresh_token
// ============================================================================

const refresh_token = z.object({
  refresh_token: z.string().describe("Refresh token to exchange"),
}).passthrough();

// ============================================================================
// change_password
// ============================================================================

const change_password = z.object({
  user_id: z.string().describe("User ID"),
  current_password: z.string().describe("Current password"),
  new_password: z.string().describe("New password"),
}).passthrough();

// ============================================================================
// role_assign
// ============================================================================

const role_assign = z.object({
  user_id: z.string().describe("User ID to assign role to"),
  role: z.string().describe("Role to assign"),
}).passthrough();

// ============================================================================
// permission_check
// ============================================================================

const permission_check = z.object({
  user_id: z.string().describe("User ID to check"),
  permission: optStr.describe("Permission to check"),
  action: optStr.describe("Action to check (alternative to permission)"),
  resource: optStr.describe("Resource scope"),
}).passthrough();

// ============================================================================
// session_manage
// ============================================================================

const session_manage = z.object({
  operation: z.enum(["list", "revoke", "revoke_all"]).optional().describe("Session operation (default: 'list')"),
  user_id: optStr.describe("User ID (for list/revoke_all)"),
  session_id: optStr.describe("Session ID (for revoke)"),
}).passthrough();

// ============================================================================
// mfa_setup
// ============================================================================

const mfa_setup = z.object({
  operation: z.enum(["enable", "disable", "verify"]).optional().describe("MFA operation (default: 'enable')"),
  user_id: z.string().describe("User ID"),
  code: optStr.describe("TOTP code (for disable/verify)"),
}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

export const ACTION_AUTH_SCHEMAS: ActionSchemaMap = {
  login,
  register,
  refresh_token,
  change_password,
  role_assign,
  permission_check,
  session_manage,
  mfa_setup,
};
