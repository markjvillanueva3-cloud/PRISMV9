/**
 * AtomicClaimBrokerEngine — Optimistic Locking with Version Field
 * @unit COORD-MS0/U-COORD02
 *
 * Covers the version field, the compare-and-swap on write, concurrent-write
 * rejection (casVersionCheck), backward compatibility with pre-U-COORD02
 * registry files, and that claims survive version increments.
 *
 * The suite points the broker at a throwaway temp file via the
 * PRISM_ATOMIC_CLAIMS_FILE env override so it never reads, writes, or unlinks
 * the live fleet registry at H:/prism/state/shared/ATOMIC_CLAIMS.json.
 */

import { describe, it, expect, afterAll, afterEach, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  atomicClaimBrokerEngine,
  casVersionCheck,
  normalizeVersion,
  StaleRegistryError,
  type ClaimRegistry,
} from "../engines/AtomicClaimBrokerEngine.js";

const TEST_CLAIMS_FILE = path.join(os.tmpdir(), `prism-coord02-claims-${process.pid}.json`);

/** Write a raw registry object straight to the test file (simulates external state). */
function writeRawRegistry(obj: unknown): void {
  fs.writeFileSync(TEST_CLAIMS_FILE, JSON.stringify(obj, null, 2));
}

/** Read the test file back as a parsed object. */
function readRawRegistry(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(TEST_CLAIMS_FILE, "utf-8"));
}

// Scope the env override per-test (not beforeAll) so it can never leak into a
// sibling test file that shares the worker — the sibling AtomicClaimBroker test
// deliberately uses the live registry path.
beforeEach(() => {
  process.env.PRISM_ATOMIC_CLAIMS_FILE = TEST_CLAIMS_FILE;
  try { fs.unlinkSync(TEST_CLAIMS_FILE); } catch { /* ignore */ }
});

afterEach(() => {
  delete process.env.PRISM_ATOMIC_CLAIMS_FILE;
});

afterAll(() => {
  try { fs.unlinkSync(TEST_CLAIMS_FILE); } catch { /* ignore */ }
});

// ===========================================================================
// casVersionCheck — the pure compare-and-swap decision. A rejection here is
// exactly what rejects a concurrent (stale) write.
// ===========================================================================
describe("casVersionCheck — concurrent write rejection", () => {
  it("allows a write when on-disk version equals the expected version", () => {
    expect(casVersionCheck(5, 5)).toEqual({ ok: true });
  });

  it("allows the first write when both versions are 0", () => {
    expect(casVersionCheck(0, 0)).toEqual({ ok: true });
  });

  it("rejects when a concurrent writer advanced the on-disk version", () => {
    const result = casVersionCheck(2, 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("2");
    expect(result.reason).toContain("1");
  });

  it("rejects when the caller's expected version is ahead of disk", () => {
    expect(casVersionCheck(1, 2).ok).toBe(false);
  });

  it("rejects a corrupt NaN on-disk version (NaN !== anything)", () => {
    expect(casVersionCheck(NaN, 1).ok).toBe(false);
  });

  it("supplies a non-empty diagnostic reason on rejection", () => {
    const reason = casVersionCheck(9, 4).reason;
    expect(typeof reason).toBe("string");
    expect((reason ?? "").length).toBeGreaterThan(0);
  });

  it("composes with normalizeVersion — a corrupt on-disk version and a missing expected both normalize to 0 and pass (the real atomicWrite path)", () => {
    expect(
      casVersionCheck(normalizeVersion(-5), normalizeVersion(undefined))
    ).toEqual({ ok: true });
  });
});

// ===========================================================================
// normalizeVersion — coerces an untrusted on-disk version to a sane integer.
// ===========================================================================
describe("normalizeVersion", () => {
  it("maps undefined (pre-U-COORD02 files) to 0", () => {
    expect(normalizeVersion(undefined)).toBe(0);
  });

  it("keeps 0 as 0", () => {
    expect(normalizeVersion(0)).toBe(0);
  });

  it("keeps a positive integer unchanged", () => {
    expect(normalizeVersion(7)).toBe(7);
  });

  it("clamps a negative version to 0", () => {
    expect(normalizeVersion(-3)).toBe(0);
  });

  it("truncates a fractional version toward zero", () => {
    expect(normalizeVersion(4.9)).toBe(4);
  });

  it("clamps a negative fractional version to 0", () => {
    expect(normalizeVersion(-1.5)).toBe(0);
  });

  it("maps NaN to 0", () => {
    expect(normalizeVersion(NaN)).toBe(0);
  });

  it("maps Infinity to 0 (not finite)", () => {
    expect(normalizeVersion(Infinity)).toBe(0);
  });
});

// ===========================================================================
// StaleRegistryError — thrown by atomicWrite when the CAS fails.
// ===========================================================================
describe("StaleRegistryError", () => {
  it("is an Error subclass with the correct name", () => {
    const err = new StaleRegistryError(3, 7);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("StaleRegistryError");
  });

  it("carries the expected and actual versions and names both in the message", () => {
    const err = new StaleRegistryError(3, 7);
    expect(err.expectedVersion).toBe(3);
    expect(err.actualVersion).toBe(7);
    expect(err.message).toContain("3");
    expect(err.message).toContain("7");
  });
});

// ===========================================================================
// Version field threads through every registry mutation.
// ===========================================================================
describe("version field — registry threading", () => {
  it("lands version 1 on the first claim acquired against a fresh registry", () => {
    atomicClaimBrokerEngine.acquireClaim("v-fresh");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
  });

  it("increments the version monotonically across successive writes", () => {
    atomicClaimBrokerEngine.acquireClaim("v-a");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
    atomicClaimBrokerEngine.acquireClaim("v-b");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(2);
  });

  it("increments the version when a claim is released", () => {
    atomicClaimBrokerEngine.acquireClaim("v-rel");
    const released = atomicClaimBrokerEngine.releaseClaim("v-rel");
    expect(released).toBe(true);
    expect(atomicClaimBrokerEngine.getStats().version).toBe(2);
  });

  it("increments the version when a claim state is updated", () => {
    atomicClaimBrokerEngine.acquireClaim("v-state");
    const updated = atomicClaimBrokerEngine.updateClaimState("v-state", "compacting");
    expect(updated).toBe(true);
    expect(atomicClaimBrokerEngine.getStats().version).toBe(2);
  });

  it("increments the version when reapZombies persists a sweep", () => {
    atomicClaimBrokerEngine.acquireClaim("v-reap");
    atomicClaimBrokerEngine.reapZombies();
    expect(atomicClaimBrokerEngine.getStats().version).toBe(2);
  });

  it("does NOT increment the version when releasing a claim that is not held", () => {
    atomicClaimBrokerEngine.acquireClaim("v-held");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
    const released = atomicClaimBrokerEngine.releaseClaim("v-never-held");
    expect(released).toBe(false);
    // commitWithRetry aborts without writing -> version unchanged.
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
  });
});

// ===========================================================================
// atomicWrite CAS — a stale write is rejected, a fresh one is accepted.
// (atomicWrite/readRegistry are private; reached via cast for white-box test.)
// ===========================================================================
describe("atomicWrite compare-and-swap", () => {
  it("throws StaleRegistryError when the supplied registry is behind disk", () => {
    atomicClaimBrokerEngine.acquireClaim("cas-x"); // disk now at version 1
    const stale: ClaimRegistry = {
      schemaVersion: 1,
      claims: [],
      sequenceCounter: 0,
      version: 0, // caller "read" version 0 but disk has moved to 1
    };
    expect(() =>
      (atomicClaimBrokerEngine as unknown as {
        atomicWrite: (r: ClaimRegistry) => void;
      }).atomicWrite(stale)
    ).toThrow(StaleRegistryError);
  });

  it("accepts a write whose version matches disk and bumps the persisted version", () => {
    atomicClaimBrokerEngine.acquireClaim("cas-ok"); // disk now at version 1
    const fresh = (atomicClaimBrokerEngine as unknown as {
      readRegistry: () => ClaimRegistry;
    }).readRegistry();
    expect(fresh.version).toBe(1);
    (atomicClaimBrokerEngine as unknown as {
      atomicWrite: (r: ClaimRegistry) => void;
    }).atomicWrite(fresh);
    expect(atomicClaimBrokerEngine.getStats().version).toBe(2);
  });
});

// ===========================================================================
// Backward compatibility — registry files written before U-COORD02 have no
// `version` key and must still parse and operate.
// ===========================================================================
describe("backward compatibility — pre-U-COORD02 registry files", () => {
  it("parses a registry file with no version key and lands version 1 on the next write", () => {
    writeRawRegistry({ schemaVersion: 1, claims: [], sequenceCounter: 3 });
    atomicClaimBrokerEngine.acquireClaim("bc-new");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
    // sequenceCounter advances normally — the rest of the registry is intact.
    expect(atomicClaimBrokerEngine.getStats().sequenceCounter).toBe(4);
  });

  it("preserves existing claims when a pre-version file gets its first versioned write", () => {
    // Let the engine create a real, schema-valid claim, then strip `version`
    // to simulate the pre-U-COORD02 on-disk format.
    atomicClaimBrokerEngine.acquireClaim("bc-keep");
    const raw = readRawRegistry();
    delete raw.version;
    writeRawRegistry(raw);

    atomicClaimBrokerEngine.acquireClaim("bc-added");
    const resources = atomicClaimBrokerEngine.getActiveClaims().map(c => c.resource);
    expect(resources).toContain("bc-keep");
    expect(resources).toContain("bc-added");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
  });

  it("continues from a high on-disk version rather than resetting to 1", () => {
    writeRawRegistry({ schemaVersion: 1, claims: [], sequenceCounter: 0, version: 50 });
    atomicClaimBrokerEngine.acquireClaim("hv");
    expect(atomicClaimBrokerEngine.getStats().version).toBe(51);
  });

  it("normalizes a corrupt negative on-disk version instead of propagating it", () => {
    writeRawRegistry({ schemaVersion: 1, claims: [], sequenceCounter: 0, version: -7 });
    atomicClaimBrokerEngine.acquireClaim("neg-ver");
    // -7 normalizes to 0, so the first write lands version 1 (never -6).
    expect(atomicClaimBrokerEngine.getStats().version).toBe(1);
  });
});

// ===========================================================================
// commitWithRetry — a stale-write rejection triggers a re-read + retry rather
// than a spurious failure. Forced deterministically single-threaded by stubbing
// atomicWrite to throw StaleRegistryError once, then delegate to the real impl.
// ===========================================================================
describe("commitWithRetry — retry on stale write", () => {
  it("releaseClaim retries past a single StaleRegistryError and still commits", () => {
    atomicClaimBrokerEngine.acquireClaim("retry-rel");
    const engineAny = atomicClaimBrokerEngine as unknown as {
      atomicWrite: (r: ClaimRegistry) => void;
    };
    const realAtomicWrite = engineAny.atomicWrite.bind(atomicClaimBrokerEngine);
    let calls = 0;
    engineAny.atomicWrite = (r: ClaimRegistry) => {
      calls++;
      if (calls === 1) {
        throw new StaleRegistryError(r.version, r.version + 1);
      }
      realAtomicWrite(r);
    };
    try {
      const released = atomicClaimBrokerEngine.releaseClaim("retry-rel");
      expect(released).toBe(true); // committed despite the first stale rejection
      expect(calls).toBeGreaterThanOrEqual(2); // proves a retry actually happened
    } finally {
      delete (engineAny as { atomicWrite?: unknown }).atomicWrite;
    }
  });

  it("acquireClaim retries past a single StaleRegistryError and still succeeds", () => {
    const engineAny = atomicClaimBrokerEngine as unknown as {
      atomicWrite: (r: ClaimRegistry) => void;
    };
    const realAtomicWrite = engineAny.atomicWrite.bind(atomicClaimBrokerEngine);
    let calls = 0;
    engineAny.atomicWrite = (r: ClaimRegistry) => {
      calls++;
      if (calls === 1) {
        throw new StaleRegistryError(r.version, r.version + 1);
      }
      realAtomicWrite(r);
    };
    try {
      const result = atomicClaimBrokerEngine.acquireClaim("retry-acq");
      expect(result.success).toBe(true);
      expect(calls).toBeGreaterThanOrEqual(2);
    } finally {
      delete (engineAny as { atomicWrite?: unknown }).atomicWrite;
    }
  });

  it("does NOT retry on a non-stale (real I/O) error — aborts after one attempt", () => {
    atomicClaimBrokerEngine.acquireClaim("io-err");
    const engineAny = atomicClaimBrokerEngine as unknown as {
      atomicWrite: (r: ClaimRegistry) => void;
    };
    let calls = 0;
    engineAny.atomicWrite = () => {
      calls++;
      throw new Error("simulated disk failure (EACCES)");
    };
    try {
      const released = atomicClaimBrokerEngine.releaseClaim("io-err");
      expect(released).toBe(false); // a real I/O error is not recoverable
      expect(calls).toBe(1); // only StaleRegistryError retries — a plain error aborts
    } finally {
      delete (engineAny as { atomicWrite?: unknown }).atomicWrite;
    }
  });
});

// ===========================================================================
// Integration — claims and counters stay consistent as the version advances.
// ===========================================================================
describe("integration — claims survive version increments", () => {
  it("keeps the registry consistent across acquire + acquire + release", () => {
    atomicClaimBrokerEngine.acquireClaim("int-1");
    atomicClaimBrokerEngine.acquireClaim("int-2");
    const released = atomicClaimBrokerEngine.releaseClaim("int-1");
    expect(released).toBe(true);

    const stats = atomicClaimBrokerEngine.getStats();
    expect(stats.version).toBe(3); // two acquires + one release
    expect(atomicClaimBrokerEngine.holdsClaim("int-1")).toBe(false);
    expect(atomicClaimBrokerEngine.holdsClaim("int-2")).toBe(true);
    expect(stats.totalClaims).toBe(1);
  });
});
