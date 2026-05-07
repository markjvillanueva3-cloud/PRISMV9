/**
 * WetRunProgramVersionLockEngine
 * ------------------------------------------------------------
 * When a wet-run pilot starts, the exact program revision,
 * post-processor revision, and tool library revision that were
 * approved for the pilot are locked. Any attempt to modify one
 * of the locked artifacts while the lock is active is rejected
 * — the motivation is that an auditor must be able to state,
 * for every part made during the pilot, "this is the exact
 * code, post-processor, and tool data that ran."
 *
 * Four-eyes override
 *   In rare cases a hot-fix must land mid-pilot (e.g. a wrong
 *   feedrate that would destroy a $500 insert). Overrides are
 *   scoped to one artifact kind per grant, require four-eyes
 *   (granted_by ≠ granted_to), carry a bounded expires_at, and
 *   a ≥80 char reason. Upon expiry or consumption the
 *   underlying lock snaps back in.
 *
 * Lifecycle: lock (at pilot start) → [overrides] → unlock (at
 * pilot close). unlock is four-eyes too: the operator who ran
 * the pilot cannot be the one who unlocks the artifacts (a
 * different QA signatory closes the record).
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-VERSION-LOCK
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_REASON_CHARS = 40;
const MIN_OVERRIDE_REASON_CHARS = 80;
const MIN_NAME_CHARS = 2;

// ============================================================================
// Types
// ============================================================================

export type ArtifactKind =
  | "program_revision"
  | "post_processor_revision"
  | "tool_library_revision"
  | "fixture_revision"
  | "setup_sheet_revision";

export type LockState = "active" | "released";

export type OverrideState = "active" | "consumed" | "expired" | "revoked";

export interface LockedArtifact {
  kind: ArtifactKind;
  artifact_id: string;
  revision: string;
  hash_sha256?: string; // optional content hash for tamper-evidence
}

export interface LockRecord {
  lock_id: string;
  pilot_id: string;
  artifacts: LockedArtifact[];
  state: LockState;
  locked_at: number;
  locked_by: string;
  locked_by_approver: string;
  lock_reason: string;
  released_at?: number;
  released_by?: string;
  release_approver?: string;
  release_reason?: string;
}

export interface OverrideGrant {
  override_id: string;
  lock_id: string;
  kind: ArtifactKind;
  new_revision: string;
  new_hash_sha256?: string;
  granted_by: string;
  granted_to: string;
  expires_at: number;
  reason: string;
  granted_at: number;
  state: OverrideState;
  consumed_at?: number;
  revoked_at?: number;
  revocation_reason?: string;
}

export interface MutationCheck {
  allowed: boolean;
  reason: string;
  lock_id?: string;
  override_id?: string;
}

export interface Snapshot {
  schemaVersion: 1;
  locks: LockRecord[];
  overrides: OverrideGrant[];
}

export interface LockInput {
  pilot_id: string;
  artifacts: LockedArtifact[];
  locked_at: number;
  locked_by: string;
  approver: string;
  reason: string;
}

export interface ReleaseInput {
  lock_id: string;
  released_at: number;
  released_by: string;
  approver: string;
  reason: string;
}

export interface OverrideInput {
  lock_id: string;
  kind: ArtifactKind;
  new_revision: string;
  new_hash_sha256?: string;
  granted_by: string;
  granted_to: string;
  expires_at: number;
  reason: string;
  granted_at: number;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunProgramVersionLockEngine {
  private locks: LockRecord[] = [];
  private overrides: OverrideGrant[] = [];
  private lockCounter = 0;
  private overrideCounter = 0;

  // --------------------------------------------------------------------
  // lock — establish a new lock at pilot start
  // --------------------------------------------------------------------
  lock(input: LockInput): LockRecord {
    this.validateString(input.pilot_id, "pilot_id");
    this.validateString(input.locked_by, "locked_by", MIN_NAME_CHARS);
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    if (input.locked_by === input.approver) {
      throw new Error(`four-eyes: locked_by must differ from approver`);
    }
    this.validateTs(input.locked_at, "locked_at");
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(`lock reason must be at least ${MIN_REASON_CHARS} characters`);
    }
    if (!Array.isArray(input.artifacts) || input.artifacts.length === 0) {
      throw new Error(`at least one artifact must be locked`);
    }
    const seen = new Set<string>();
    for (const a of input.artifacts) {
      this.validateArtifactKind(a.kind);
      this.validateString(a.artifact_id, `artifact.artifact_id`);
      this.validateString(a.revision, `artifact.revision`);
      const key = `${a.kind}:${a.artifact_id}`;
      if (seen.has(key)) {
        throw new Error(`duplicate artifact in lock: ${key}`);
      }
      seen.add(key);
      if (a.hash_sha256 !== undefined) {
        this.validateSha256(a.hash_sha256);
      }
    }
    // Only one active lock per pilot
    if (this.locks.some((l) => l.pilot_id === input.pilot_id && l.state === "active")) {
      throw new Error(`pilot ${input.pilot_id} already has an active lock`);
    }

    this.lockCounter += 1;
    const lock: LockRecord = {
      lock_id: `lock:${this.lockCounter.toString().padStart(6, "0")}`,
      pilot_id: input.pilot_id,
      artifacts: input.artifacts.map((a) => ({ ...a })),
      state: "active",
      locked_at: input.locked_at,
      locked_by: input.locked_by,
      locked_by_approver: input.approver,
      lock_reason: input.reason.trim(),
    };
    this.locks.push(lock);
    return this.snapshotLock(lock);
  }

  // --------------------------------------------------------------------
  // release — at pilot close
  // --------------------------------------------------------------------
  release(input: ReleaseInput): LockRecord {
    const lock = this.mustGetLock(input.lock_id);
    if (lock.state !== "active") {
      throw new Error(`lock ${lock.lock_id} is not active (state=${lock.state})`);
    }
    this.validateString(input.released_by, "released_by", MIN_NAME_CHARS);
    this.validateString(input.approver, "approver", MIN_NAME_CHARS);
    if (input.released_by === input.approver) {
      throw new Error(`four-eyes: released_by must differ from approver`);
    }
    if (input.released_by === lock.locked_by) {
      throw new Error(
        `the engineer who locked the pilot cannot release it — separate QA signatory required`,
      );
    }
    this.validateTs(input.released_at, "released_at");
    if (input.released_at < lock.locked_at) {
      throw new Error(`released_at cannot precede locked_at`);
    }
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(
        `release reason must be at least ${MIN_REASON_CHARS} characters`,
      );
    }
    lock.state = "released";
    lock.released_at = input.released_at;
    lock.released_by = input.released_by;
    lock.release_approver = input.approver;
    lock.release_reason = input.reason.trim();
    return this.snapshotLock(lock);
  }

  // --------------------------------------------------------------------
  // grantOverride — scoped four-eyes break-glass
  // --------------------------------------------------------------------
  grantOverride(input: OverrideInput): OverrideGrant {
    const lock = this.mustGetLock(input.lock_id);
    if (lock.state !== "active") {
      throw new Error(
        `cannot grant override on ${lock.state} lock ${lock.lock_id}`,
      );
    }
    this.validateArtifactKind(input.kind);
    // The artifact kind must be one of the locked artifacts
    if (!lock.artifacts.some((a) => a.kind === input.kind)) {
      throw new Error(
        `artifact kind ${input.kind} is not part of lock ${lock.lock_id}`,
      );
    }
    this.validateString(input.new_revision, "new_revision");
    if (input.new_hash_sha256 !== undefined) {
      this.validateSha256(input.new_hash_sha256);
    }
    this.validateString(input.granted_by, "granted_by", MIN_NAME_CHARS);
    this.validateString(input.granted_to, "granted_to", MIN_NAME_CHARS);
    if (input.granted_by === input.granted_to) {
      throw new Error(`four-eyes: granted_by must differ from granted_to`);
    }
    this.validateTs(input.expires_at, "expires_at");
    this.validateTs(input.granted_at, "granted_at");
    if (input.expires_at <= input.granted_at) {
      throw new Error(`expires_at must be strictly greater than granted_at`);
    }
    if (input.reason.trim().length < MIN_OVERRIDE_REASON_CHARS) {
      throw new Error(
        `override reason must be at least ${MIN_OVERRIDE_REASON_CHARS} characters`,
      );
    }
    // Only one active override per (lock, kind) at a time
    const existing = this.overrides.find(
      (o) =>
        o.lock_id === input.lock_id &&
        o.kind === input.kind &&
        o.state === "active",
    );
    if (existing) {
      throw new Error(
        `active override ${existing.override_id} already covers ${input.kind} on lock ${lock.lock_id}`,
      );
    }

    this.overrideCounter += 1;
    const grant: OverrideGrant = {
      override_id: `ovr:${this.overrideCounter.toString().padStart(6, "0")}`,
      lock_id: lock.lock_id,
      kind: input.kind,
      new_revision: input.new_revision,
      new_hash_sha256: input.new_hash_sha256,
      granted_by: input.granted_by,
      granted_to: input.granted_to,
      expires_at: input.expires_at,
      reason: input.reason.trim(),
      granted_at: input.granted_at,
      state: "active",
    };
    this.overrides.push(grant);
    return { ...grant };
  }

  // --------------------------------------------------------------------
  // consumeOverride — mark a grant consumed once the hot-fix lands
  // --------------------------------------------------------------------
  consumeOverride(input: { override_id: string; consumed_at: number }): OverrideGrant {
    const grant = this.mustGetOverride(input.override_id);
    if (grant.state !== "active") {
      throw new Error(
        `override ${grant.override_id} is not active (state=${grant.state})`,
      );
    }
    this.validateTs(input.consumed_at, "consumed_at");
    if (input.consumed_at < grant.granted_at) {
      throw new Error(`consumed_at cannot precede granted_at`);
    }
    if (input.consumed_at >= grant.expires_at) {
      throw new Error(
        `consumed_at is past expiry — use sweepExpiredOverrides()`,
      );
    }
    grant.state = "consumed";
    grant.consumed_at = input.consumed_at;
    // Apply the new revision to the lock
    const lock = this.mustGetLock(grant.lock_id);
    const artifact = lock.artifacts.find((a) => a.kind === grant.kind);
    if (artifact) {
      artifact.revision = grant.new_revision;
      if (grant.new_hash_sha256 !== undefined) {
        artifact.hash_sha256 = grant.new_hash_sha256;
      }
    }
    return { ...grant };
  }

  // --------------------------------------------------------------------
  // revokeOverride — e.g. hot-fix no longer needed
  // --------------------------------------------------------------------
  revokeOverride(input: {
    override_id: string;
    revoked_at: number;
    revoked_by: string;
    reason: string;
  }): OverrideGrant {
    const grant = this.mustGetOverride(input.override_id);
    if (grant.state !== "active") {
      throw new Error(`override ${grant.override_id} is not active`);
    }
    this.validateString(input.revoked_by, "revoked_by", MIN_NAME_CHARS);
    if (input.reason.trim().length < MIN_REASON_CHARS) {
      throw new Error(`revocation reason must be at least ${MIN_REASON_CHARS} characters`);
    }
    grant.state = "revoked";
    grant.revoked_at = input.revoked_at;
    grant.revocation_reason = input.reason.trim();
    return { ...grant };
  }

  // --------------------------------------------------------------------
  // sweepExpiredOverrides
  // --------------------------------------------------------------------
  sweepExpiredOverrides(nowTs: number): OverrideGrant[] {
    this.validateTs(nowTs, "nowTs");
    const expired: OverrideGrant[] = [];
    for (const g of this.overrides) {
      if (g.state !== "active") continue;
      if (nowTs >= g.expires_at) {
        g.state = "expired";
        expired.push({ ...g });
      }
    }
    return expired;
  }

  // --------------------------------------------------------------------
  // checkMutation — called before accepting a mutation to a locked artifact
  // --------------------------------------------------------------------
  checkMutation(input: {
    pilot_id: string;
    kind: ArtifactKind;
    artifact_id: string;
    nowTs: number;
  }): MutationCheck {
    this.validateTs(input.nowTs, "nowTs");
    const lock = this.locks.find(
      (l) => l.pilot_id === input.pilot_id && l.state === "active",
    );
    if (!lock) {
      return { allowed: true, reason: "no active lock" };
    }
    const covers = lock.artifacts.find(
      (a) => a.kind === input.kind && a.artifact_id === input.artifact_id,
    );
    if (!covers) {
      return { allowed: true, reason: "artifact not covered by lock" };
    }
    const activeOverride = this.overrides.find(
      (o) =>
        o.lock_id === lock.lock_id &&
        o.kind === input.kind &&
        o.state === "active" &&
        input.nowTs < o.expires_at,
    );
    if (activeOverride) {
      return {
        allowed: true,
        reason: `mutation permitted via override ${activeOverride.override_id}`,
        lock_id: lock.lock_id,
        override_id: activeOverride.override_id,
      };
    }
    return {
      allowed: false,
      reason: `artifact ${input.artifact_id} is locked under ${lock.lock_id} for pilot ${input.pilot_id}`,
      lock_id: lock.lock_id,
    };
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getLock(id: string): LockRecord | undefined {
    const l = this.locks.find((x) => x.lock_id === id);
    return l ? this.snapshotLock(l) : undefined;
  }

  getOverride(id: string): OverrideGrant | undefined {
    const o = this.overrides.find((x) => x.override_id === id);
    return o ? { ...o } : undefined;
  }

  activeLockFor(pilotId: string): LockRecord | undefined {
    const l = this.locks.find(
      (x) => x.pilot_id === pilotId && x.state === "active",
    );
    return l ? this.snapshotLock(l) : undefined;
  }

  listLocks(): LockRecord[] {
    return this.locks.map((l) => this.snapshotLock(l));
  }

  listOverrides(): OverrideGrant[] {
    return this.overrides.map((o) => ({ ...o }));
  }

  snapshot(): Snapshot {
    return {
      schemaVersion: 1,
      locks: this.listLocks(),
      overrides: this.listOverrides(),
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private snapshotLock(l: LockRecord): LockRecord {
    return { ...l, artifacts: l.artifacts.map((a) => ({ ...a })) };
  }

  private mustGetLock(id: string): LockRecord {
    const l = this.locks.find((x) => x.lock_id === id);
    if (!l) throw new Error(`lock not found: ${id}`);
    return l;
  }

  private mustGetOverride(id: string): OverrideGrant {
    const o = this.overrides.find((x) => x.override_id === id);
    if (!o) throw new Error(`override not found: ${id}`);
    return o;
  }

  private validateString(v: string, label: string, minChars = 1): void {
    if (typeof v !== "string" || v.trim().length < minChars) {
      throw new Error(
        `${label} must be a string of at least ${minChars} characters`,
      );
    }
  }

  private validateArtifactKind(k: ArtifactKind): void {
    const allowed: ArtifactKind[] = [
      "program_revision",
      "post_processor_revision",
      "tool_library_revision",
      "fixture_revision",
      "setup_sheet_revision",
    ];
    if (!allowed.includes(k)) {
      throw new Error(`invalid artifact kind: ${k}`);
    }
  }

  private validateSha256(h: string): void {
    if (!/^[0-9a-f]{64}$/i.test(h)) {
      throw new Error(`hash_sha256 must be 64 hex characters`);
    }
  }

  private validateTs(ts: number, label: string): void {
    if (!Number.isFinite(ts)) throw new Error(`${label} must be a finite number`);
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunProgramVersionLockEngine =
  new WetRunProgramVersionLockEngine();
