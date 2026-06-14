/**
 * OAuthCredentialEngine — HMPI02 OAuth credential lifecycle state machine.
 *
 * Pure-core: tracks per-server OAuth credential status (not stored, never
 * returned — caller persists secrets via secure storage).  This engine only
 * tracks {status, expires_at, last_refreshed_at, refresh_failure_count}
 * with deterministic transitions for the operator dashboard + cron sweeper.
 *
 * @module engines/OAuthCredentialEngine
 */

import { z } from "zod";

export const OAuthStatusSchema = z.enum([
  "not-authorized", "authorized", "expiring-soon", "expired", "refresh-failed", "revoked",
]);
export type OAuthStatus = z.infer<typeof OAuthStatusSchema>;

export const CredentialStateSchema = z.object({
  server_id: z.string().min(1).max(120),
  status: OAuthStatusSchema,
  expires_at: z.string().optional(),
  last_refreshed_at: z.string().optional(),
  refresh_failure_count: z.number().int().min(0).max(100),
});
export type CredentialState = z.infer<typeof CredentialStateSchema>;

const EXPIRY_WARNING_MS = 60 * 60 * 1000;       // 1h before expiry → expiring-soon
const MAX_REFRESH_FAILURES = 5;

export class OAuthCredentialEngine {
  static validate(c: unknown): CredentialState { return CredentialStateSchema.parse(c); }

  /** Initial state for an unauthorized server. */
  static initial(server_id: string): CredentialState {
    return CredentialStateSchema.parse({
      server_id, status: "not-authorized", refresh_failure_count: 0,
    });
  }

  /** Mark credentials as freshly authorized. */
  static authorize(state: CredentialState, expires_at: string, now_at: string): CredentialState {
    return CredentialStateSchema.parse({
      ...state, status: "authorized",
      expires_at, last_refreshed_at: now_at, refresh_failure_count: 0,
    });
  }

  /** Record a failed refresh attempt; transitions to refresh-failed at threshold. */
  static recordRefreshFailure(state: CredentialState): CredentialState {
    const newCount = state.refresh_failure_count + 1;
    const newStatus: OAuthStatus = newCount >= MAX_REFRESH_FAILURES ? "refresh-failed" : state.status;
    return CredentialStateSchema.parse({
      ...state, status: newStatus, refresh_failure_count: newCount,
    });
  }

  /** Mark credentials as revoked (terminal). */
  static revoke(state: CredentialState): CredentialState {
    return CredentialStateSchema.parse({ ...state, status: "revoked" });
  }

  /** Re-evaluate status against current time — flips authorized → expiring-soon → expired. */
  static reevaluate(state: CredentialState, now_at: string): CredentialState {
    if (!state.expires_at) return state;
    if (state.status === "revoked" || state.status === "refresh-failed") return state;
    const nowMs = Date.parse(now_at);
    const expMs = Date.parse(state.expires_at);
    let newStatus: OAuthStatus;
    if (expMs <= nowMs) newStatus = "expired";
    else if (expMs - nowMs <= EXPIRY_WARNING_MS) newStatus = "expiring-soon";
    else newStatus = "authorized";
    return CredentialStateSchema.parse({ ...state, status: newStatus });
  }

  /** Render state for operator audit. */
  static renderState(s: CredentialState): string {
    return `[OAUTH] ${s.server_id} status=${s.status}${s.expires_at ? ` expires=${s.expires_at}` : ""} failures=${s.refresh_failure_count}`;
  }
}

export const oauthCredentialEngine = OAuthCredentialEngine;
