/**
 * AtomicClaimBrokerEngine — U-COORD12 (Checksum Validation on Read).
 *
 * Covers:
 *   • computeClaimChecksum pure-helper invariants (determinism, field
 *     sensitivity, output shape).
 *   • verifyChecksum decision surface (round-trip, tampered fields, tampered
 *     checksum, empty/missing checksum, purity).
 *   • readRegistry integration: tampered claims are dropped from the returned
 *     registry (asserted via the public getStats() proxy) AND a JSONL tamper
 *     event is appended to the sibling ledger.
 *
 * Test seam — points the broker at a tmpdir registry via
 * PRISM_ATOMIC_CLAIMS_FILE. The override is honored only when
 * NODE_ENV/VITEST is set AND the path is under os.tmpdir() (U-COORD02 gate),
 * so leaked env vars cannot redirect the live fleet registry. The tamper log
 * path derives from the claims-file path, so the seam composes — tests get
 * their tamper log next to their throwaway registry.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  atomicClaimBrokerEngine,
  computeClaimChecksum,
  verifyChecksum,
} from "../engines/AtomicClaimBrokerEngine.js";

// ---------------------------------------------------------------------------
// Test seam — tmpdir registry + sibling tamper log
// ---------------------------------------------------------------------------
// PID + randomUUID() suffix isolates concurrent vitest workers AND CI sandboxes
// where pids can be reused across runs (per Arm-B P1 finding).
const TEST_RUN_TAG = `${process.pid}-${crypto.randomUUID()}`;
const TEST_CLAIMS_FILE = path.join(
  os.tmpdir(),
  `prism-coord12-claims-${TEST_RUN_TAG}.json`
);
const TEST_TAMPER_LOG = `${TEST_CLAIMS_FILE}.tamper.jsonl`;

function unlinkSilent(p: string): void {
  try {
    fs.unlinkSync(p);
  } catch {
    /* file may not exist */
  }
}

function writeRegistry(registry: object): void {
  fs.writeFileSync(TEST_CLAIMS_FILE, JSON.stringify(registry, null, 2));
}

function readTamperLog(): Array<Record<string, unknown>> {
  if (!fs.existsSync(TEST_TAMPER_LOG)) return [];
  const raw = fs.readFileSync(TEST_TAMPER_LOG, "utf-8");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** Build a valid claim with a fresh-computed checksum so verifyChecksum passes. */
function buildClaim(overrides: {
  id?: string;
  resource?: string;
  holder?: string;
  sequenceNumber?: number;
  state?: "active" | "compacting" | "releasing" | "zombie";
  ttlMs?: number;
}): {
  id: string;
  resource: string;
  holder: string;
  holderPid: number;
  acquiredAt: string;
  expiresAt: string;
  ttlMs: number;
  sequenceNumber: number;
  state: "active" | "compacting" | "releasing" | "zombie";
  checksum: string;
} {
  const id = overrides.id ?? "claim-test-001";
  const resource = overrides.resource ?? "res:test";
  const holder = overrides.holder ?? "session-test";
  const sequenceNumber = overrides.sequenceNumber ?? 1;
  const now = Date.now();
  const ttlMs = overrides.ttlMs ?? 180_000;
  return {
    id,
    resource,
    holder,
    holderPid: process.pid,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    ttlMs,
    sequenceNumber,
    state: overrides.state ?? "active",
    checksum: computeClaimChecksum({ id, resource, holder, sequenceNumber }),
  };
}

// Save NODE_ENV at module load so afterEach can restore it precisely, instead
// of relying on the (fragile) assumption that vitest sets NODE_ENV=test itself.
const PRIOR_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  process.env.PRISM_ATOMIC_CLAIMS_FILE = TEST_CLAIMS_FILE;
  process.env.NODE_ENV = "test";
  unlinkSilent(TEST_CLAIMS_FILE);
  unlinkSilent(TEST_TAMPER_LOG);
});

afterEach(() => {
  delete process.env.PRISM_ATOMIC_CLAIMS_FILE;
  if (PRIOR_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = PRIOR_NODE_ENV;
  }
});

afterAll(() => {
  unlinkSilent(TEST_CLAIMS_FILE);
  unlinkSilent(TEST_TAMPER_LOG);
});

// ---------------------------------------------------------------------------
// computeClaimChecksum — pure helper
// ---------------------------------------------------------------------------

describe("computeClaimChecksum (U-COORD12 pure helper)", () => {
  it("returns 16 lowercase hex chars (SHA-256 truncation contract)", () => {
    const hash = computeClaimChecksum({
      id: "x",
      resource: "y",
      holder: "z",
      sequenceNumber: 1,
    });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic — same input yields the same hash across calls", () => {
    const input = { id: "a", resource: "b", holder: "c", sequenceNumber: 7 };
    const h1 = computeClaimChecksum(input);
    const h2 = computeClaimChecksum(input);
    const h3 = computeClaimChecksum({ ...input });
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });

  it("is sensitive to each field — changing any one component changes the hash", () => {
    const base = { id: "a", resource: "b", holder: "c", sequenceNumber: 1 };
    const baseHash = computeClaimChecksum(base);
    expect(computeClaimChecksum({ ...base, id: "a2" })).not.toBe(baseHash);
    expect(computeClaimChecksum({ ...base, resource: "b2" })).not.toBe(baseHash);
    expect(computeClaimChecksum({ ...base, holder: "c2" })).not.toBe(baseHash);
    expect(computeClaimChecksum({ ...base, sequenceNumber: 2 })).not.toBe(baseHash);
  });

  it("does not collide on shifted-delimiter inputs (canonical form has separators)", () => {
    // If the formula were `${id}${resource}${holder}${seq}` without delimiters
    // these two inputs would collide. The `:` separator must remain.
    const a = computeClaimChecksum({
      id: "ab",
      resource: "c",
      holder: "d",
      sequenceNumber: 1,
    });
    const b = computeClaimChecksum({
      id: "a",
      resource: "bc",
      holder: "d",
      sequenceNumber: 1,
    });
    expect(a).not.toBe(b);
  });

  it("handles empty-string fields without throwing", () => {
    const hash = computeClaimChecksum({
      id: "",
      resource: "",
      holder: "",
      sequenceNumber: 0,
    });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ---------------------------------------------------------------------------
// verifyChecksum — pure decision surface
// ---------------------------------------------------------------------------

describe("verifyChecksum (U-COORD12 decision surface)", () => {
  it("returns ok=true on a freshly generated claim (round-trip)", () => {
    const claim = buildClaim({ id: "good-001" });
    const v = verifyChecksum(claim);
    expect(v.ok).toBe(true);
    expect(v.computed).toBe(v.stored);
    expect(v.computed).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns ok=false when a field was mutated without re-checksumming (the bypass case)", () => {
    const claim = buildClaim({ id: "tamper-001", resource: "original" });
    const tampered = { ...claim, resource: "MUTATED" };
    const v = verifyChecksum(tampered);
    expect(v.ok).toBe(false);
    expect(v.stored).toBe(claim.checksum);
    // Recompute should reflect the mutated resource.
    expect(v.computed).toBe(
      computeClaimChecksum({
        id: tampered.id,
        resource: tampered.resource,
        holder: tampered.holder,
        sequenceNumber: tampered.sequenceNumber,
      })
    );
    expect(v.computed).not.toBe(v.stored);
  });

  it("returns ok=false when the stored checksum was directly corrupted", () => {
    const claim = buildClaim({ id: "tamper-002" });
    const corrupted = { ...claim, checksum: "deadbeefdeadbeef" };
    const v = verifyChecksum(corrupted);
    expect(v.ok).toBe(false);
    expect(v.stored).toBe("deadbeefdeadbeef");
    expect(v.computed).toBe(claim.checksum);
  });

  it("returns ok=false on missing/empty checksum (adversarial pre-U-COORD12 entry)", () => {
    const claim = buildClaim({ id: "tamper-003" });
    const noChecksum = { ...claim, checksum: "" };
    const v = verifyChecksum(noChecksum);
    expect(v.ok).toBe(false);
    expect(v.stored).toBe("");
    expect(v.computed).toBe(claim.checksum);
  });

  it("does not mutate its input claim (purity)", () => {
    const claim = buildClaim({ id: "purity-001" });
    const snapshot = JSON.stringify(claim);
    verifyChecksum(claim);
    expect(JSON.stringify(claim)).toBe(snapshot);
  });

  it("exposes both computed and stored values for diagnostic logging", () => {
    const claim = buildClaim({ id: "diag-001", holder: "alpha" });
    const tampered = { ...claim, holder: "beta" };
    const v = verifyChecksum(tampered);
    expect(typeof v.computed).toBe("string");
    expect(typeof v.stored).toBe("string");
    expect(v.computed).toHaveLength(16);
    expect(v.stored).toHaveLength(16);
    expect(v.computed).not.toBe(v.stored);
  });
});

// ---------------------------------------------------------------------------
// readRegistry integration (via the public getStats() proxy) +
// tamper-log JSONL ledger
// ---------------------------------------------------------------------------

describe("readRegistry tampering integration (U-COORD12)", () => {
  it("getStats() reports the full claim count when every checksum is valid", () => {
    const claims = [
      buildClaim({ id: "ok-001", resource: "res:a", sequenceNumber: 1 }),
      buildClaim({ id: "ok-002", resource: "res:b", sequenceNumber: 2 }),
      buildClaim({ id: "ok-003", resource: "res:c", sequenceNumber: 3 }),
    ];
    writeRegistry({
      schemaVersion: 1,
      claims,
      sequenceCounter: 3,
      version: 1,
    });

    const stats = atomicClaimBrokerEngine.getStats();
    expect(stats.totalClaims).toBe(3);
    expect(readTamperLog()).toHaveLength(0);
  });

  it("drops a single tampered claim and appends one tamper event", () => {
    const valid = buildClaim({ id: "valid-001", resource: "res:valid" });
    const tampered = {
      ...buildClaim({ id: "bad-001", resource: "res:original" }),
      resource: "res:hijacked", // stored checksum is now stale
    };
    writeRegistry({
      schemaVersion: 1,
      claims: [valid, tampered],
      sequenceCounter: 2,
      version: 1,
    });

    const stats = atomicClaimBrokerEngine.getStats();
    expect(stats.totalClaims).toBe(1);

    const log = readTamperLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      claimId: "bad-001",
      reason: "checksum-mismatch",
      resource: "res:hijacked",
    });
    expect(typeof log[0]["ts"]).toBe("string");
    expect(typeof log[0]["computedChecksum"]).toBe("string");
    expect(log[0]["storedChecksum"]).toBe(tampered.checksum);
  });

  it("drops every tampered claim in a batch and logs one event per drop", () => {
    const goodA = buildClaim({ id: "good-A", resource: "res:A", sequenceNumber: 1 });
    const goodB = buildClaim({ id: "good-B", resource: "res:B", sequenceNumber: 2 });
    const badA = { ...buildClaim({ id: "bad-A" }), holder: "OWNED-BY-OTHER" };
    const badB = { ...buildClaim({ id: "bad-B" }), checksum: "0000000000000000" };
    writeRegistry({
      schemaVersion: 1,
      claims: [goodA, badA, goodB, badB],
      sequenceCounter: 4,
      version: 1,
    });

    const stats = atomicClaimBrokerEngine.getStats();
    expect(stats.totalClaims).toBe(2); // goodA + goodB only

    const log = readTamperLog();
    expect(log).toHaveLength(2);
    const droppedIds = log.map((e) => e["claimId"]).sort();
    expect(droppedIds).toEqual(["bad-A", "bad-B"]);
    // Valid claims must NEVER appear in the tamper log — kills a mutation
    // that logs every claim regardless of v.ok (Arm-B P1 finding).
    const goodInLog = log.filter((e) => String(e["claimId"]).startsWith("good-"));
    expect(goodInLog).toHaveLength(0);
  });

  it("emits JSONL — one valid JSON object per line, no concatenation across drops", () => {
    const claims = [
      { ...buildClaim({ id: "bad-1" }), resource: "MUTATED-1" },
      { ...buildClaim({ id: "bad-2" }), resource: "MUTATED-2" },
      { ...buildClaim({ id: "bad-3" }), resource: "MUTATED-3" },
    ];
    writeRegistry({
      schemaVersion: 1,
      claims,
      sequenceCounter: 3,
      version: 1,
    });

    atomicClaimBrokerEngine.getStats();
    const raw = fs.readFileSync(TEST_TAMPER_LOG, "utf-8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    // Each line must parse independently — no multi-line JSON, no missing newlines.
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("survives an empty registry without writing a tamper log file", () => {
    writeRegistry({
      schemaVersion: 1,
      claims: [],
      sequenceCounter: 0,
      version: 0,
    });
    const stats = atomicClaimBrokerEngine.getStats();
    expect(stats.totalClaims).toBe(0);
    expect(fs.existsSync(TEST_TAMPER_LOG)).toBe(false);
  });

  it("derives the tamper-log path from the claims-file path (test-seam composition)", () => {
    // The override seam from U-COORD02 must compose with U-COORD12: a test that
    // points the broker at tmpdir/foo.json must NOT spew tamper events into the
    // live fleet log at H:/prism/state/shared/. We assert that any tamper events
    // produced under this test's seam land in the tmpdir sibling — and ONLY there.
    const tampered = { ...buildClaim({ id: "seam-001" }), resource: "X" };
    writeRegistry({
      schemaVersion: 1,
      claims: [tampered],
      sequenceCounter: 1,
      version: 1,
    });

    const liveTamperLog = "H:/prism/state/shared/ATOMIC_CLAIMS.json.tamper.jsonl";
    const liveSizeBefore = fs.existsSync(liveTamperLog)
      ? fs.statSync(liveTamperLog).size
      : 0;

    atomicClaimBrokerEngine.getStats();

    expect(fs.existsSync(TEST_TAMPER_LOG)).toBe(true);
    const liveSizeAfter = fs.existsSync(liveTamperLog)
      ? fs.statSync(liveTamperLog).size
      : 0;
    expect(liveSizeAfter).toBe(liveSizeBefore);
  });

  it("is idempotent across multiple reads — same tampered claim logs once per read", () => {
    // The drop is fail-open + non-mutating-on-read: readRegistry does NOT
    // persist its de-tampered view (atomicWrite is what persists). So two
    // back-to-back getStats() against the same tampered on-disk registry log
    // the same drop twice. This documents the contract: persistence happens on
    // the first WRITE following detection, not on read.
    const tampered = { ...buildClaim({ id: "rep-001" }), resource: "X" };
    writeRegistry({
      schemaVersion: 1,
      claims: [tampered],
      sequenceCounter: 1,
      version: 1,
    });

    atomicClaimBrokerEngine.getStats();
    atomicClaimBrokerEngine.getStats();

    const log = readTamperLog();
    expect(log).toHaveLength(2);
    expect(log[0]["claimId"]).toBe("rep-001");
    expect(log[1]["claimId"]).toBe("rep-001");
  });

  it("tamper event carries enough context to identify the bypassing actor", () => {
    const tampered = {
      ...buildClaim({ id: "forensic-001", resource: "X", holder: "session-X" }),
      holder: "session-Y", // holder swap — classic bypass-of-CAS scenario
    };
    writeRegistry({
      schemaVersion: 1,
      claims: [tampered],
      sequenceCounter: 1,
      version: 1,
    });

    atomicClaimBrokerEngine.getStats();
    const [event] = readTamperLog();
    // Every field a post-incident audit needs.
    expect(event["claimId"]).toBe("forensic-001");
    expect(event["resource"]).toBe("X");
    expect(event["holder"]).toBe("session-Y");
    expect(event["sequenceNumber"]).toBe(1);
    expect(event["storedChecksum"]).toBe(tampered.checksum);
    expect(typeof event["computedChecksum"]).toBe("string");
    expect(event["computedChecksum"]).not.toBe(event["storedChecksum"]);
    expect(typeof event["ts"]).toBe("string");
    expect(typeof event["pid"]).toBe("number");
    expect(typeof event["hostname"]).toBe("string");
    expect(event["reason"]).toBe("checksum-mismatch");
  });

  it("writes the tamper log next to the claims file in a NESTED subdir (kills the path.dirname → os.tmpdir() mutation)", () => {
    // Arm-B mutation #6: replacing `path.dirname(logPath)` with `os.tmpdir()`
    // SURVIVED earlier tests because TEST_CLAIMS_FILE sits directly in tmpdir,
    // making `path.dirname(...) === os.tmpdir()` trivially. A claims path in a
    // nested subdir kills the mutation: a mkdir at os.tmpdir() puts the log
    // in the wrong directory.
    const nestedDir = path.join(
      os.tmpdir(),
      `prism-coord12-nest-${TEST_RUN_TAG}`,
      "sub"
    );
    const nestedClaims = path.join(nestedDir, "claims.json");
    const nestedTamperLog = `${nestedClaims}.tamper.jsonl`;
    const tmpRootTamperLog = path.join(
      os.tmpdir(),
      `${path.basename(nestedClaims)}.tamper.jsonl`
    );

    fs.mkdirSync(nestedDir, { recursive: true });
    const prior = process.env.PRISM_ATOMIC_CLAIMS_FILE;
    process.env.PRISM_ATOMIC_CLAIMS_FILE = nestedClaims;

    try {
      const tampered = { ...buildClaim({ id: "nested-001" }), resource: "X" };
      fs.writeFileSync(
        nestedClaims,
        JSON.stringify(
          { schemaVersion: 1, claims: [tampered], sequenceCounter: 1, version: 1 },
          null,
          2
        )
      );

      atomicClaimBrokerEngine.getStats();

      // The tamper log MUST live in the nested subdir alongside its claims file.
      expect(fs.existsSync(nestedTamperLog)).toBe(true);
      // And it MUST NOT have been redirected to a bare-tmpdir path.
      expect(fs.existsSync(tmpRootTamperLog)).toBe(false);
    } finally {
      // Restore prior seam + clean up
      if (prior === undefined) {
        delete process.env.PRISM_ATOMIC_CLAIMS_FILE;
      } else {
        process.env.PRISM_ATOMIC_CLAIMS_FILE = prior;
      }
      unlinkSilent(nestedClaims);
      unlinkSilent(nestedTamperLog);
      unlinkSilent(tmpRootTamperLog);
      try {
        fs.rmdirSync(nestedDir);
        fs.rmdirSync(path.dirname(nestedDir));
      } catch {
        /* cleanup best-effort */
      }
    }
  });
});
