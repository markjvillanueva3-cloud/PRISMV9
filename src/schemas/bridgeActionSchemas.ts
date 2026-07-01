/**
 * Bridge Dispatcher Action Schemas
 * =================================
 * Per-action Zod schemas for all 13 prism_bridge actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/bridgeActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();

// ============================================================================
// register_endpoint
// ============================================================================

const register_endpoint = z.object({
  protocol: z.string().describe("Protocol type (rest, grpc, graphql, websocket)"),
  path: z.string().describe("Endpoint path"),
  dispatcher: z.string().describe("Target dispatcher name"),
  action: z.string().describe("Target action on the dispatcher"),
  auth: optStr.describe("Auth method"),
  rate_limit: optNum.describe("Rate limit for endpoint"),
}).passthrough();

// ============================================================================
// remove_endpoint
// ============================================================================

const remove_endpoint = z.object({
  endpoint_id: z.string().describe("ID of endpoint to remove"),
}).passthrough();

// ============================================================================
// set_status
// ============================================================================

const set_status = z.object({
  endpoint_id: z.string().describe("ID of endpoint"),
  status: z.string().describe("New status for the endpoint"),
}).passthrough();

// ============================================================================
// list_endpoints
// ============================================================================

const list_endpoints = z.object({
  protocol: optStr.describe("Filter by protocol"),
  status: optStr.describe("Filter by status"),
}).passthrough();

// ============================================================================
// create_key
// ============================================================================

const create_key = z.object({
  name: z.string().describe("API key name"),
  scopes: z.array(z.string()).optional().describe("Scopes for the key (default: ['*'])"),
  expires_in_days: optNum.describe("Expiration in days"),
  rate_limit: optNum.describe("Rate limit for key"),
}).passthrough();

// ============================================================================
// revoke_key
// ============================================================================

const revoke_key = z.object({
  key_id: z.string().describe("ID of API key to revoke"),
}).passthrough();

// ============================================================================
// validate_key
// ============================================================================

const validate_key = z.object({
  key: z.string().describe("API key value to validate"),
}).passthrough();

// ============================================================================
// list_keys — no params required
// ============================================================================

const list_keys = z.object({}).passthrough();

// ============================================================================
// route
// ============================================================================

const route = z.object({
  request_id: optStr.describe("Request ID (auto-generated if omitted)"),
  protocol: optStr.describe("Protocol (default: 'rest')"),
  endpoint_id: optStr.describe("Endpoint ID"),
  dispatcher: z.string().describe("Target dispatcher"),
  target_action: z.string().describe("Target action on dispatcher"),
  request_params: z.record(z.string(), z.unknown()).optional().describe("Parameters to forward"),
  auth_method: optStr.describe("Auth method (default: 'none')"),
  key_id: optStr.describe("API key ID for auth"),
  client_ip: optStr.describe("Client IP address"),
}).passthrough();

// ============================================================================
// route_map — no params required
// ============================================================================

const route_map = z.object({}).passthrough();

// ============================================================================
// health — no params required
// ============================================================================

const health = z.object({}).passthrough();

// ============================================================================
// stats — no params required
// ============================================================================

const stats = z.object({}).passthrough();

// ============================================================================
// config
// ============================================================================

const config = z.object({
  updates: z.record(z.string(), z.unknown()).optional().describe("Config updates (omit to get current config)"),
}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

export const ACTION_BRIDGE_SCHEMAS: ActionSchemaMap = {
  register_endpoint,
  remove_endpoint,
  set_status,
  list_endpoints,
  create_key,
  revoke_key,
  validate_key,
  list_keys,
  route,
  route_map,
  health,
  stats,
  config,
};
