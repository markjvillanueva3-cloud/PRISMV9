/**
 * SessionHandoffV2Engine — Structured inter-session handoff
 *
 * Phase 0.13 U-SAW7 partner of SessionInsightsLedgerEngine. Produces the
 * `SESSION_HANDOFF_v2.json` payload that a completing session writes and the
 * next session reads during BOOT. Round-trip verified: Session B must
 * reference A's handoff in its first three responses (exit gate).
 *
 * CPP-MS3-U-CPP21 (per-terminal addressability):
 *   The identity block now carries {instance, machine} so the handoff is
 *   addressable to a specific terminal rather than clobbering a bare
 *   HANDOFF.md. `targetPath()` computes the per-instance filename
 *   `HANDOFF-<family>-<machine>-<instance>.md` used by the MD handoff
 *   writers (per-agent-handoff.mjs) and the reader (compact-restore.mjs).
 *
 * The schema is deliberately compact:
 *   - identity: who you were (now with instance + machine for addressability)
 *   - position: what phase/task you were on
 *   - openGoals: goals still active at end of session
 *   - keyInsights: top-N insight summaries (pulled from the ledger)
 *   - nextActions: concrete actions the next session should take first
 *
 * No I/O here — the engine shapes the payload and validates it. Writers and
 * readers live with the hook layer.
 *
 * @module engines/SessionHandoffV2Engine
 * @milestone PP-0.13-U-SAW7, CPP-MS3-U-CPP21
 */

export interface HandoffIdentity {
  sessionId: string;
  family: "claude" | "codex" | "other";
  machine: string;
  instance: string;
  startedAt: string;
  endedAt: string;
}

export interface HandoffPosition {
  phase?: string;
  milestone?: string;
  branch?: string;
  lastCommit?: string;
  notes?: string;
}

export interface HandoffOpenGoal {
  id: string;
  text: string;
  priority: number;
  depth: number;
}

export interface HandoffInsightSummary {
  id: string;
  category: string;
  summary: string;
  at: string;
}

export interface HandoffNextAction {
  action: string;
  reason?: string;
  blocking?: boolean;
}

export interface SessionHandoffV2 {
  schemaVersion: 2;
  identity: HandoffIdentity;
  position: HandoffPosition;
  openGoals: HandoffOpenGoal[];
  keyInsights: HandoffInsightSummary[];
  nextActions: HandoffNextAction[];
  writtenAt: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function sanitize(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._@-]/g, "_").replace(/_+/g, "_");
}

export class SessionHandoffV2Engine {
  build(input: Omit<SessionHandoffV2, "schemaVersion" | "writtenAt"> & { writtenAt?: string }): SessionHandoffV2 {
    return {
      schemaVersion: 2,
      identity: { ...input.identity },
      position: input.position,
      openGoals: [...input.openGoals],
      keyInsights: [...input.keyInsights],
      nextActions: [...input.nextActions],
      writtenAt: input.writtenAt ?? new Date().toISOString(),
    };
  }

  validate(candidate: Partial<SessionHandoffV2>): ValidationResult {
    const errors: string[] = [];
    if (candidate.schemaVersion !== 2) errors.push("schemaVersion must be 2");
    if (!candidate.identity) errors.push("identity required");
    else {
      const i = candidate.identity;
      if (!i.sessionId) errors.push("identity.sessionId required");
      if (!["claude", "codex", "other"].includes(i.family as string)) errors.push("identity.family invalid");
      if (!i.machine || typeof i.machine !== "string") errors.push("identity.machine required");
      if (!i.instance || typeof i.instance !== "string") errors.push("identity.instance required");
      if (!i.startedAt || !/^\d{4}-\d{2}-\d{2}T/.test(i.startedAt)) errors.push("identity.startedAt ISO required");
      if (!i.endedAt || !/^\d{4}-\d{2}-\d{2}T/.test(i.endedAt)) errors.push("identity.endedAt ISO required");
    }
    if (!candidate.position) errors.push("position required");
    if (!Array.isArray(candidate.openGoals)) errors.push("openGoals must be an array");
    if (!Array.isArray(candidate.keyInsights)) errors.push("keyInsights must be an array");
    if (!Array.isArray(candidate.nextActions)) errors.push("nextActions must be an array");
    if (!candidate.writtenAt || !/^\d{4}-\d{2}-\d{2}T/.test(String(candidate.writtenAt))) {
      errors.push("writtenAt ISO required");
    }
    return { ok: errors.length === 0, errors };
  }

  serialize(handoff: SessionHandoffV2): string {
    return JSON.stringify(handoff, null, 2);
  }

  parse(text: string): SessionHandoffV2 | null {
    try {
      const data = JSON.parse(text);
      const v = this.validate(data);
      return v.ok ? (data as SessionHandoffV2) : null;
    } catch {
      return null;
    }
  }

  /**
   * Convenience: does a handoff look legitimate for ingestion by a new session?
   * Stricter than validate() — also requires at least one nextAction or a
   * non-empty position, so "empty" handoffs are rejected.
   */
  isActionable(handoff: SessionHandoffV2): boolean {
    if (!this.validate(handoff).ok) return false;
    if (handoff.nextActions.length > 0) return true;
    const p = handoff.position;
    return Boolean(p.phase || p.milestone || p.notes);
  }

  /**
   * Compute per-instance handoff target filename.
   *
   * CPP-MS3-U-CPP21: Per-terminal addressability. Each Claude/Codex session
   * produces its own HANDOFF-<family>-<machine>-<instance>.md rather than
   * clobbering a shared HANDOFF.md. The reader (compact-restore.mjs) globs
   * this pattern from state/shared/handoffs/.
   *
   * Characters outside [A-Za-z0-9._@-] are replaced with underscores so the
   * filename is portable across Windows + POSIX filesystems.
   */
  targetPath(identity: Pick<HandoffIdentity, "family" | "machine" | "instance">): string {
    if (!identity.family) throw new Error("identity.family required for targetPath");
    if (!identity.machine) throw new Error("identity.machine required for targetPath");
    if (!identity.instance) throw new Error("identity.instance required for targetPath");
    return `HANDOFF-${sanitize(identity.family)}-${sanitize(identity.machine)}-${sanitize(identity.instance)}.md`;
  }
}

export const sessionHandoffV2Engine = new SessionHandoffV2Engine();
