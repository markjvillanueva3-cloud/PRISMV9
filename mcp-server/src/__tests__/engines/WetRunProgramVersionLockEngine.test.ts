/**
 * WetRunProgramVersionLockEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-VERSION-LOCK
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunProgramVersionLockEngine,
  type LockInput,
  type LockedArtifact,
} from "../../engines/WetRunProgramVersionLockEngine.js";

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

const SHA = (seed: string) => (seed + "0".repeat(64)).slice(0, 64);

function baseArtifacts(): LockedArtifact[] {
  return [
    {
      kind: "program_revision",
      artifact_id: "PRG-777",
      revision: "r3",
      hash_sha256: SHA("ab"),
    },
    {
      kind: "post_processor_revision",
      artifact_id: "POST-OKUMA-OSP300",
      revision: "2026.01",
      hash_sha256: SHA("cd"),
    },
    {
      kind: "tool_library_revision",
      artifact_id: "TLIB-PILOT",
      revision: "v12",
    },
  ];
}

function baseLock(overrides: Partial<LockInput> = {}): LockInput {
  return {
    pilot_id: "PILOT-A",
    artifacts: baseArtifacts(),
    locked_at: T0,
    locked_by: "engineer-1",
    approver: "qa-lead",
    reason:
      "pilot begins — freezing program rev, post rev, and tool library under audit trail",
    ...overrides,
  };
}

describe("WetRunProgramVersionLockEngine", () => {
  let engine: WetRunProgramVersionLockEngine;
  beforeEach(() => {
    engine = new WetRunProgramVersionLockEngine();
  });

  describe("lock", () => {
    it("creates an active lock with the listed artifacts", () => {
      const l = engine.lock(baseLock());
      expect(l.state).toBe("active");
      expect(l.artifacts).toHaveLength(3);
    });

    it("rejects four-eyes violation on lock", () => {
      expect(() =>
        engine.lock(baseLock({ approver: "engineer-1" })),
      ).toThrow(/four-eyes/);
    });

    it("rejects reason shorter than 40 chars", () => {
      expect(() =>
        engine.lock(baseLock({ reason: "nope" })),
      ).toThrow(/at least 40/);
    });

    it("rejects empty artifact list", () => {
      expect(() =>
        engine.lock(baseLock({ artifacts: [] })),
      ).toThrow(/at least one artifact/);
    });

    it("rejects duplicate (kind, artifact_id) within a single lock", () => {
      const arts: LockedArtifact[] = [
        {
          kind: "program_revision",
          artifact_id: "PRG-777",
          revision: "r1",
        },
        {
          kind: "program_revision",
          artifact_id: "PRG-777",
          revision: "r2",
        },
      ];
      expect(() =>
        engine.lock(baseLock({ artifacts: arts })),
      ).toThrow(/duplicate artifact/);
    });

    it("rejects second active lock for the same pilot", () => {
      engine.lock(baseLock());
      expect(() => engine.lock(baseLock())).toThrow(
        /already has an active lock/,
      );
    });

    it("rejects invalid artifact kind", () => {
      expect(() =>
        engine.lock(
          baseLock({
            artifacts: [
              {
                kind: "mystery" as unknown as LockedArtifact["kind"],
                artifact_id: "X",
                revision: "1",
              },
            ],
          }),
        ),
      ).toThrow(/invalid artifact kind/);
    });

    it("rejects non-hex sha256", () => {
      expect(() =>
        engine.lock(
          baseLock({
            artifacts: [
              {
                kind: "program_revision",
                artifact_id: "P",
                revision: "1",
                hash_sha256: "not-hex",
              },
            ],
          }),
        ),
      ).toThrow(/64 hex/);
    });
  });

  describe("release", () => {
    it("releases an active lock with distinct signatories from the locker", () => {
      const l = engine.lock(baseLock());
      const r = engine.release({
        lock_id: l.lock_id,
        released_at: T0 + HOUR,
        released_by: "qa-closer",
        approver: "director",
        reason:
          "pilot completed all acceptance steps, closing out the version-lock audit record",
      });
      expect(r.state).toBe("released");
      expect(r.released_at).toBe(T0 + HOUR);
    });

    it("rejects release by the original locker (separation of duties)", () => {
      const l = engine.lock(baseLock());
      expect(() =>
        engine.release({
          lock_id: l.lock_id,
          released_at: T0 + HOUR,
          released_by: "engineer-1",
          approver: "director",
          reason:
            "engineer who locked the pilot attempting to self-close — separation violation",
        }),
      ).toThrow(/cannot release it/);
    });

    it("rejects double release", () => {
      const l = engine.lock(baseLock());
      engine.release({
        lock_id: l.lock_id,
        released_at: T0 + HOUR,
        released_by: "qa-closer",
        approver: "director",
        reason:
          "first release call closes the lock; second is expected to fail with a clear error",
      });
      expect(() =>
        engine.release({
          lock_id: l.lock_id,
          released_at: T0 + 2 * HOUR,
          released_by: "qa-closer",
          approver: "director",
          reason:
            "attempting a second release call after the lock was already closed cleanly",
        }),
      ).toThrow(/not active/);
    });

    it("rejects release four-eyes violation", () => {
      const l = engine.lock(baseLock());
      expect(() =>
        engine.release({
          lock_id: l.lock_id,
          released_at: T0 + HOUR,
          released_by: "qa-closer",
          approver: "qa-closer",
          reason:
            "releaser and approver are the same person — four-eyes principle violated on close",
        }),
      ).toThrow(/four-eyes/);
    });
  });

  describe("grantOverride + checkMutation", () => {
    it("blocks mutation while lock is active and no override covers it", () => {
      engine.lock(baseLock());
      const r = engine.checkMutation({
        pilot_id: "PILOT-A",
        kind: "program_revision",
        artifact_id: "PRG-777",
        nowTs: T0 + MIN,
      });
      expect(r.allowed).toBe(false);
    });

    it("permits mutation to uncovered artifacts", () => {
      engine.lock(baseLock());
      const r = engine.checkMutation({
        pilot_id: "PILOT-A",
        kind: "program_revision",
        artifact_id: "PRG-NOT-IN-LOCK",
        nowTs: T0 + MIN,
      });
      expect(r.allowed).toBe(true);
      expect(r.reason).toMatch(/not covered/);
    });

    it("grants a scoped override and allows mutation on that kind only", () => {
      const l = engine.lock(baseLock());
      engine.grantOverride({
        lock_id: l.lock_id,
        kind: "program_revision",
        new_revision: "r3.1",
        granted_by: "director",
        granted_to: "engineer-2",
        expires_at: T0 + HOUR,
        reason:
          "hot-fix override — feedrate correction required after test-cut revealed risk of insert damage on setup, narrowly scoped to program revision only",
        granted_at: T0 + MIN,
      });
      const prg = engine.checkMutation({
        pilot_id: "PILOT-A",
        kind: "program_revision",
        artifact_id: "PRG-777",
        nowTs: T0 + 2 * MIN,
      });
      expect(prg.allowed).toBe(true);
      const post = engine.checkMutation({
        pilot_id: "PILOT-A",
        kind: "post_processor_revision",
        artifact_id: "POST-OKUMA-OSP300",
        nowTs: T0 + 2 * MIN,
      });
      expect(post.allowed).toBe(false);
    });

    it("rejects override on kind not in the lock", () => {
      const l = engine.lock(baseLock());
      expect(() =>
        engine.grantOverride({
          lock_id: l.lock_id,
          kind: "fixture_revision",
          new_revision: "F2",
          granted_by: "director",
          granted_to: "engineer-2",
          expires_at: T0 + HOUR,
          reason:
            "attempting to grant override on a fixture revision that is not part of the original lock artifacts list",
          granted_at: T0 + MIN,
        }),
      ).toThrow(/not part of lock/);
    });

    it("rejects override reason shorter than 80 chars", () => {
      const l = engine.lock(baseLock());
      expect(() =>
        engine.grantOverride({
          lock_id: l.lock_id,
          kind: "program_revision",
          new_revision: "r3.1",
          granted_by: "director",
          granted_to: "engineer-2",
          expires_at: T0 + HOUR,
          reason: "too short for an override reason on a locked artifact",
          granted_at: T0 + MIN,
        }),
      ).toThrow(/at least 80/);
    });

    it("rejects two active overrides for the same (lock, kind)", () => {
      const l = engine.lock(baseLock());
      engine.grantOverride({
        lock_id: l.lock_id,
        kind: "program_revision",
        new_revision: "r3.1",
        granted_by: "director",
        granted_to: "engineer-2",
        expires_at: T0 + HOUR,
        reason:
          "first hot-fix override — feedrate correction required after test-cut revealed excessive insert wear rate",
        granted_at: T0 + MIN,
      });
      expect(() =>
        engine.grantOverride({
          lock_id: l.lock_id,
          kind: "program_revision",
          new_revision: "r3.2",
          granted_by: "director",
          granted_to: "engineer-2",
          expires_at: T0 + HOUR,
          reason:
            "attempting to grant a parallel second override on the same kind violates exclusivity invariant",
          granted_at: T0 + 2 * MIN,
        }),
      ).toThrow(/already covers/);
    });

    it("rejects expires_at ≤ granted_at", () => {
      const l = engine.lock(baseLock());
      expect(() =>
        engine.grantOverride({
          lock_id: l.lock_id,
          kind: "program_revision",
          new_revision: "r3.1",
          granted_by: "director",
          granted_to: "engineer-2",
          expires_at: T0 + MIN,
          reason:
            "override that expires at exactly the grant time is nonsensical and must be rejected by the engine",
          granted_at: T0 + MIN,
        }),
      ).toThrow(/strictly greater/);
    });
  });

  describe("consumeOverride", () => {
    it("consumes an override and applies the new revision to the lock", () => {
      const l = engine.lock(baseLock());
      const g = engine.grantOverride({
        lock_id: l.lock_id,
        kind: "program_revision",
        new_revision: "r3.1",
        new_hash_sha256: SHA("ef"),
        granted_by: "director",
        granted_to: "engineer-2",
        expires_at: T0 + HOUR,
        reason:
          "hot-fix override — feedrate correction required after test-cut revealed excessive insert wear on setup sample, narrowly scoped",
        granted_at: T0 + MIN,
      });
      engine.consumeOverride({
        override_id: g.override_id,
        consumed_at: T0 + 2 * MIN,
      });
      const lock = engine.getLock(l.lock_id);
      const prg = lock?.artifacts.find((a) => a.kind === "program_revision");
      expect(prg?.revision).toBe("r3.1");
      expect(prg?.hash_sha256).toBe(SHA("ef"));
      const afterConsume = engine.checkMutation({
        pilot_id: "PILOT-A",
        kind: "program_revision",
        artifact_id: "PRG-777",
        nowTs: T0 + 3 * MIN,
      });
      // After consumption override is no longer active — lock snaps back
      expect(afterConsume.allowed).toBe(false);
    });

    it("rejects consumption past expiry", () => {
      const l = engine.lock(baseLock());
      const g = engine.grantOverride({
        lock_id: l.lock_id,
        kind: "program_revision",
        new_revision: "r3.1",
        granted_by: "director",
        granted_to: "engineer-2",
        expires_at: T0 + 2 * MIN,
        reason:
          "short-window override — feedrate correction needed right now before machine damage occurs",
        granted_at: T0 + MIN,
      });
      expect(() =>
        engine.consumeOverride({
          override_id: g.override_id,
          consumed_at: T0 + 10 * MIN,
        }),
      ).toThrow(/past expiry/);
    });
  });

  describe("revokeOverride + sweepExpiredOverrides", () => {
    it("revokes an active override manually", () => {
      const l = engine.lock(baseLock());
      const g = engine.grantOverride({
        lock_id: l.lock_id,
        kind: "program_revision",
        new_revision: "r3.1",
        granted_by: "director",
        granted_to: "engineer-2",
        expires_at: T0 + HOUR,
        reason:
          "first hot-fix override — feedrate correction required after test-cut revealed insert stress",
        granted_at: T0 + MIN,
      });
      const r = engine.revokeOverride({
        override_id: g.override_id,
        revoked_at: T0 + 2 * MIN,
        revoked_by: "director",
        reason:
          "issue resolved without requiring the planned revision change, reverting to locked revision",
      });
      expect(r.state).toBe("revoked");
    });

    it("sweepExpiredOverrides flips expired active overrides", () => {
      const l = engine.lock(baseLock());
      engine.grantOverride({
        lock_id: l.lock_id,
        kind: "program_revision",
        new_revision: "r3.1",
        granted_by: "director",
        granted_to: "engineer-2",
        expires_at: T0 + 2 * MIN,
        reason:
          "short-window override — feedrate correction needed right now before machine damage occurs, narrowly scoped",
        granted_at: T0 + MIN,
      });
      const swept = engine.sweepExpiredOverrides(T0 + 3 * MIN);
      expect(swept).toHaveLength(1);
      expect(swept[0]?.state).toBe("expired");
      const check = engine.checkMutation({
        pilot_id: "PILOT-A",
        kind: "program_revision",
        artifact_id: "PRG-777",
        nowTs: T0 + 4 * MIN,
      });
      expect(check.allowed).toBe(false);
    });
  });

  describe("readers + snapshot", () => {
    it("activeLockFor returns the current lock for a pilot", () => {
      const l = engine.lock(baseLock());
      expect(engine.activeLockFor("PILOT-A")?.lock_id).toBe(l.lock_id);
      expect(engine.activeLockFor("PILOT-NONE")).toBeUndefined();
    });

    it("snapshot captures schemaVersion + locks + overrides", () => {
      engine.lock(baseLock());
      const s = engine.snapshot();
      expect(s.schemaVersion).toBe(1);
      expect(s.locks).toHaveLength(1);
      expect(s.overrides).toHaveLength(0);
    });

    it("snapshot is defensively copied", () => {
      const l = engine.lock(baseLock());
      const s = engine.snapshot();
      s.locks[0]!.artifacts[0]!.revision = "HACKED";
      expect(engine.getLock(l.lock_id)?.artifacts[0]?.revision).toBe("r3");
    });
  });
});
