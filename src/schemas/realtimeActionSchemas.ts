/**
 * Realtime Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for all 4 prism_realtime actions.
 * Covers WebSocket broadcast, room send, unicast, and stats.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/realtimeActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// ws_broadcast — Broadcast event to all connected clients
// ============================================================================

const ws_broadcast = z.object({
  type: z.string().optional().describe("Event type (default: notification). Valid: machine:status, machine:alarm, job:progress, job:complete, job:error, tool:wear, tool:change, safety:alert, quote:update, notification, system:health"),
  payload: z.record(z.string(), z.unknown()).optional().describe("Event payload object"),
  message: z.string().optional().describe("Simple message string (used if payload not provided)"),
}).passthrough();

// ============================================================================
// ws_room_send — Send event to all clients in a specific room
// ============================================================================

const ws_room_send = z.object({
  room: z.string().describe("Room name to send to"),
  type: z.string().optional().describe("Event type (default: notification)"),
  payload: z.record(z.string(), z.unknown()).optional().describe("Event payload object"),
  message: z.string().optional().describe("Simple message string (used if payload not provided)"),
}).passthrough();

// ============================================================================
// ws_unicast — Send event to a specific client
// ============================================================================

const ws_unicast = z.object({
  target_id: z.string().optional().describe("Target client ID"),
  client_id: z.string().optional().describe("Alias for target_id"),
  user_id: z.string().optional().describe("Alias for target_id"),
  type: z.string().optional().describe("Event type (default: notification)"),
  payload: z.record(z.string(), z.unknown()).optional().describe("Event payload object"),
  message: z.string().optional().describe("Simple message string (used if payload not provided)"),
}).passthrough();

// ============================================================================
// ws_stats — Get WebSocket connection statistics
// ============================================================================

const ws_stats = z.object({}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_REALTIME_SCHEMAS: ActionSchemaMap = {
  ws_broadcast,
  ws_room_send,
  ws_unicast,
  ws_stats,
};
