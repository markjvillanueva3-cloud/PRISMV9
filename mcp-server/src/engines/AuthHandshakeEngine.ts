/**
 * AuthHandshakeEngine — HMPI08 auth handshake state machine.
 *
 * Pure-core 5-state machine for plugin-auth handshakes: idle → challenged →
 * responded → verified | failed.  Tracks attempt count, nonce reuse, and
 * timing windows.  No secrets stored — verification is caller-driven.
 *
 * @module engines/AuthHandshakeEngine
 */

import { z } from "zod";

export const HandshakeStateSchema = z.enum(["idle", "challenged", "responded", "verified", "failed"]);
export type HandshakeState = z.infer<typeof HandshakeStateSchema>;

export const HandshakeRecordSchema = z.object({
  handshake_id: z.string().min(1).max(120),
  plugin_id: z.string().min(1).max(120),
  state: HandshakeStateSchema,
  nonce: z.string().max(120).optional(),
  attempt_count: z.number().int().min(0).max(20),
  started_at: z.string().min(1),
  finalized_at: z.string().optional(),
  failure_reason: z.string().max(500).optional(),
});
export type HandshakeRecord = z.infer<typeof HandshakeRecordSchema>;

const MAX_ATTEMPTS = 5;
const TIMEOUT_MS = 30_000;

export class AuthHandshakeEngine {
  static validate(r: unknown): HandshakeRecord { return HandshakeRecordSchema.parse(r); }

  static initial(handshake_id: string, plugin_id: string, at: string): HandshakeRecord {
    return HandshakeRecordSchema.parse({
      handshake_id, plugin_id, state: "idle", attempt_count: 0, started_at: at,
    });
  }

  static challenge(record: HandshakeRecord, nonce: string, at: string): HandshakeRecord {
    if (record.state !== "idle" && record.state !== "challenged") {
      throw new Error(`AuthHandshake.challenge: invalid state ${record.state}`);
    }
    if (record.attempt_count >= MAX_ATTEMPTS) {
      return HandshakeRecordSchema.parse({
        ...record, state: "failed", finalized_at: at,
        failure_reason: `max attempts ${MAX_ATTEMPTS} exceeded`,
      });
    }
    return HandshakeRecordSchema.parse({
      ...record, state: "challenged", nonce, attempt_count: record.attempt_count + 1,
    });
  }

  static respond(record: HandshakeRecord, at: string): HandshakeRecord {
    if (record.state !== "challenged") {
      throw new Error(`AuthHandshake.respond: invalid state ${record.state}`);
    }
    const elapsedMs = Date.parse(at) - Date.parse(record.started_at);
    if (elapsedMs > TIMEOUT_MS) {
      return HandshakeRecordSchema.parse({
        ...record, state: "failed", finalized_at: at, failure_reason: "handshake timeout",
      });
    }
    return HandshakeRecordSchema.parse({ ...record, state: "responded" });
  }

  static verify(record: HandshakeRecord, ok: boolean, at: string, reason?: string): HandshakeRecord {
    if (record.state !== "responded") {
      throw new Error(`AuthHandshake.verify: invalid state ${record.state}`);
    }
    return HandshakeRecordSchema.parse({
      ...record,
      state: ok ? "verified" : "failed",
      finalized_at: at,
      failure_reason: ok ? undefined : (reason ?? "verification failed"),
    });
  }

  static renderRecord(r: HandshakeRecord): string {
    return `[AUTH ${r.state.toUpperCase()}] handshake=${r.handshake_id} plugin=${r.plugin_id} attempts=${r.attempt_count}${r.failure_reason ? ` (${r.failure_reason})` : ""}`;
  }
}

export const authHandshakeEngine = AuthHandshakeEngine;
