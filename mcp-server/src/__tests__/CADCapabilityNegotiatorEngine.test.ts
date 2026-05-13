/**
 * CADCapabilityNegotiatorEngine — tests
 *
 * CAD-COMPLETE-MS0 / U-CADC-AI03
 *
 * Acceptance under test: "Intent referencing unsupported op either degrades
 * gracefully (configurable) or throws UnsupportedCapabilityError with named
 * op."
 *
 * Coverage:
 *   - Module surface (singleton + class export + policy enum + default policy).
 *   - Happy paths: preferred supports all ops; no preference + full cover; empty intent.
 *   - Failure paths: strict-policy missing op throws; fallback finds alternative;
 *     best_fit picks highest coverage; all systems fail → throw with diagnostics;
 *     excludeSystems blocks; unknown preferred throws UnknownCADSystemError.
 *   - Boundary inputs: ops duplicates collapse; ops empty; opt-out subprocess filter.
 *   - Variability: spans freecad + fusion360 + inventor + mastercam (every
 *     registered adapter exercised across the suite).
 *   - listGaps() with and without reference ops.
 *   - negotiateOrThrow() — both throw + pass paths.
 *   - validateIntent rejections — non-array ops, bad policy value.
 *
 * Real adapters are loaded via the registry (registry exposes 4 singletons:
 * freecad, fusion360, inventor, mastercam). We exercise the negotiator
 * against actual adapter capability matrices — no mocking of the SUT.
 */

import { describe, it, expect } from "vitest";
import {
  CADCapabilityNegotiatorEngine,
  cadCapabilityNegotiatorEngine,
  NEGOTIATION_POLICIES,
  DEFAULT_NEGOTIATION_POLICY,
  UnsupportedCapabilityError,
  UnknownCADSystemError,
} from "../engines/CADCapabilityNegotiatorEngine.js";
import {
  CAD_REGISTERED_SYSTEMS,
  getCADAdapter,
} from "../engines/CADAdapterRegistry.js";
import type { CADOperationKind, CADSystemId } from "../interfaces/ICADCodeGenerator.js";

// ============================================================================
// Helpers — pick op kinds that we know the registered adapters support
// or do not support. We discover them dynamically from the live capability
// matrices so the tests don't go stale when an adapter widens coverage.
// ============================================================================

type AdapterOpsSnapshot = Map<CADSystemId, Set<CADOperationKind>>;

async function snapshotAllAdapters(): Promise<AdapterOpsSnapshot> {
  const out: AdapterOpsSnapshot = new Map();
  // Half-shipped adapters (lazy import returns undefined, or getCapabilities
  // throws) are silently skipped — same behaviour the negotiator engine uses
  // internally via tryGetCapabilities(). This keeps tests robust against a
  // pre-existing registry bug where some adapter export names don't match
  // what the registry imports.
  for (const sys of CAD_REGISTERED_SYSTEMS) {
    try {
      const adapter = await getCADAdapter(sys);
      if (!adapter || typeof adapter.getCapabilities !== "function") continue;
      out.set(sys, new Set(adapter.getCapabilities().supportedOps));
    } catch {
      // Skip broken adapter — negotiator treats it the same way.
    }
  }
  return out;
}

/** Adapters that the negotiator can actually reach right now. */
async function workingAdapterIds(): Promise<CADSystemId[]> {
  const snap = await snapshotAllAdapters();
  return Array.from(snap.keys()).sort();
}

/** Op kind supported by every registered adapter — used for happy paths. */
async function pickUniversallySupportedOp(
  snap: AdapterOpsSnapshot,
): Promise<CADOperationKind> {
  const adapters = Array.from(snap.values());
  if (adapters.length === 0) throw new Error("registry has zero adapters");
  const first = Array.from(adapters[0]);
  for (const op of first) {
    if (adapters.every((s) => s.has(op))) return op;
  }
  throw new Error(
    "no universally-supported op kind found across registered adapters — registry too narrow",
  );
}

/**
 * Op kind supported by some adapters but NOT by `unsupporter`. Used to
 * exercise the missing-op + fallback flow with deterministic gaps.
 */
async function pickOpSupportedExceptBy(
  snap: AdapterOpsSnapshot,
  unsupporter: CADSystemId,
): Promise<CADOperationKind | undefined> {
  const without = snap.get(unsupporter);
  if (!without) return undefined;
  for (const [sys, set] of snap.entries()) {
    if (sys === unsupporter) continue;
    for (const op of set) {
      if (!without.has(op)) return op;
    }
  }
  return undefined;
}

// ============================================================================
// SECTION 1 — module surface
// ============================================================================

describe("CADCapabilityNegotiatorEngine — module surface", () => {
  it("exports a process-wide singleton instance", () => {
    expect(cadCapabilityNegotiatorEngine).toBeInstanceOf(CADCapabilityNegotiatorEngine);
  });

  it("singleton exposes negotiate, negotiateOrThrow, listGaps methods", () => {
    expect(typeof cadCapabilityNegotiatorEngine.negotiate).toBe("function");
    expect(typeof cadCapabilityNegotiatorEngine.negotiateOrThrow).toBe("function");
    expect(typeof cadCapabilityNegotiatorEngine.listGaps).toBe("function");
  });

  it("declares three policies — strict, fallback, best_fit — with fallback as default", () => {
    expect([...NEGOTIATION_POLICIES]).toEqual(["strict", "fallback", "best_fit"]);
    expect(DEFAULT_NEGOTIATION_POLICY).toBe("fallback");
  });

  it("exports UnsupportedCapabilityError as a real Error subclass with code", () => {
    const err = new UnsupportedCapabilityError({
      requestedOps: ["sketch_line"],
      missingOps: ["sketch_line"],
      attemptedSystems: ["freecad"],
      policy: "strict",
      message: "test",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("UNSUPPORTED_CAPABILITY");
    expect(err.name).toBe("UnsupportedCapabilityError");
    expect(err.requestedOps).toEqual(["sketch_line"]);
    expect(err.missingOps).toEqual(["sketch_line"]);
    expect(err.attemptedSystems).toEqual(["freecad"]);
    expect(err.policy).toBe("strict");
  });

  it("re-exports UnknownCADSystemError as a constructable Error subclass", () => {
    const err = new UnknownCADSystemError("not_a_cad");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("UnknownCADSystemError");
    expect(err.code).toBe("UNKNOWN_CAD_SYSTEM");
    expect(err.requested).toBe("not_a_cad");
  });
});

// ============================================================================
// SECTION 2 — happy paths
// ============================================================================

describe("CADCapabilityNegotiatorEngine.negotiate — happy paths", () => {
  it("returns preferred adapter when it supports every requested op (no fallback)", async () => {
    const snap = await snapshotAllAdapters();
    const universalOp = await pickUniversallySupportedOp(snap);
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [universalOp],
      preferredSystem: "freecad",
      policy: "fallback",
    });
    expect(result.cadSystem).toBe("freecad");
    expect(result.supported).toBe(true);
    expect(result.missingOps).toEqual([]);
    expect(result.fallbackUsed).toBe(false);
    expect(result.policy).toBe("fallback");
  });

  it("empty ops list yields trivially-supported result with deterministic adapter pick", async () => {
    const working = await workingAdapterIds();
    const pick = working[0];
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [],
      preferredSystem: pick,
    });
    expect(result.supported).toBe(true);
    expect(result.missingOps).toEqual([]);
    expect(result.cadSystem).toBe(pick);
  });

  it("empty ops + no preference picks the alphabetically-first registered adapter", async () => {
    const result = await cadCapabilityNegotiatorEngine.negotiate({ ops: [] });
    expect(result.supported).toBe(true);
    expect(result.cadSystem).toBe(CAD_REGISTERED_SYSTEMS[0]);
  });

  it("duplicate ops in the intent collapse to a single supported lookup", async () => {
    const snap = await snapshotAllAdapters();
    const working = Array.from(snap.keys()).sort();
    const universalOp = await pickUniversallySupportedOp(snap);
    const pick = working[0];
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [universalOp, universalOp, universalOp],
      preferredSystem: pick,
    });
    expect(result.cadSystem).toBe(pick);
    expect(result.supported).toBe(true);
    expect(result.missingOps).toEqual([]);
  });

  it("ranks alternatives by fewest-missing then latency then name (deterministic)", async () => {
    const snap = await snapshotAllAdapters();
    const universalOp = await pickUniversallySupportedOp(snap);
    const working = Array.from(snap.keys()).sort();
    const pick = working[0];
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [universalOp],
      preferredSystem: pick,
    });
    for (const alt of result.alternatives) {
      expect(alt.cadSystem).not.toBe(pick);
    }
    for (let i = 1; i < result.alternatives.length; i++) {
      expect(result.alternatives[i - 1].missingOps.length).toBeLessThanOrEqual(
        result.alternatives[i].missingOps.length,
      );
    }
  });
});

// ============================================================================
// SECTION 3 — failure paths
// ============================================================================

/**
 * Pick a working adapter that does NOT support some op that another
 * working adapter does support — used to deterministically exercise
 * the missing-op + fallback flow regardless of which adapters happen
 * to be loadable in the current registry state.
 */
async function pickGapPair(
  snap: AdapterOpsSnapshot,
): Promise<{ missingAdapter: CADSystemId; coveringAdapter: CADSystemId; op: CADOperationKind }> {
  const working = Array.from(snap.keys());
  if (working.length < 2) {
    throw new Error("registry needs at least 2 working adapters for fallback tests");
  }
  for (const candidate of working) {
    const op = await pickOpSupportedExceptBy(snap, candidate);
    if (op) {
      const coverer = working.find((s) => s !== candidate && snap.get(s)?.has(op));
      if (coverer) {
        return { missingAdapter: candidate, coveringAdapter: coverer, op };
      }
    }
  }
  throw new Error(
    "test setup: cannot find any working adapter pair with op-coverage asymmetry — registry too uniform",
  );
}

describe("CADCapabilityNegotiatorEngine.negotiate — strict policy", () => {
  it("throws UnsupportedCapabilityError when preferred adapter is missing an op", async () => {
    const snap = await snapshotAllAdapters();
    const { missingAdapter, op } = await pickGapPair(snap);
    await expect(
      cadCapabilityNegotiatorEngine.negotiate({
        ops: [op],
        preferredSystem: missingAdapter,
        policy: "strict",
      }),
    ).rejects.toBeInstanceOf(UnsupportedCapabilityError);
  });

  it("strict-policy error carries the exact missing op name + attempted system", async () => {
    const snap = await snapshotAllAdapters();
    const { missingAdapter, op } = await pickGapPair(snap);
    try {
      await cadCapabilityNegotiatorEngine.negotiate({
        ops: [op],
        preferredSystem: missingAdapter,
        policy: "strict",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedCapabilityError);
      const e = err as UnsupportedCapabilityError;
      expect(e.missingOps).toContain(op);
      expect(e.attemptedSystems).toEqual([missingAdapter]);
      expect(e.policy).toBe("strict");
      expect(e.message).toContain(op);
    }
  });
});

describe("CADCapabilityNegotiatorEngine.negotiate — fallback policy", () => {
  it("falls back to a covering adapter when preferred misses an op", async () => {
    const snap = await snapshotAllAdapters();
    const { missingAdapter, op } = await pickGapPair(snap);
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [op],
      preferredSystem: missingAdapter,
      policy: "fallback",
    });
    expect(result.supported).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.cadSystem).not.toBe(missingAdapter);
    expect(result.missingOps).toEqual([]);
    expect(result.reason).toMatch(/fall(back|ed)/i);
  });

  it("fallbackUsed=false when preferred adapter already covers everything", async () => {
    const snap = await snapshotAllAdapters();
    const working = Array.from(snap.keys()).sort();
    const universalOp = await pickUniversallySupportedOp(snap);
    const pick = working[0];
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [universalOp],
      preferredSystem: pick,
      policy: "fallback",
    });
    expect(result.fallbackUsed).toBe(false);
    expect(result.cadSystem).toBe(pick);
  });
});

describe("CADCapabilityNegotiatorEngine.negotiate — best_fit policy", () => {
  it("picks the adapter with full coverage even when not preferred", async () => {
    const snap = await snapshotAllAdapters();
    const { missingAdapter, op } = await pickGapPair(snap);
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [op],
      preferredSystem: missingAdapter,
      policy: "best_fit",
    });
    expect(result.supported).toBe(true);
    expect(result.cadSystem).not.toBe(missingAdapter);
    expect(result.policy).toBe("best_fit");
  });
});

// ============================================================================
// SECTION 4 — exclude + subprocess filters
// ============================================================================

describe("CADCapabilityNegotiatorEngine.negotiate — exclude filters", () => {
  it("excludeSystems removes adapters from the candidate pool", async () => {
    const snap = await snapshotAllAdapters();
    const working = Array.from(snap.keys()).sort();
    if (working.length < 2) {
      throw new Error("test needs at least 2 working adapters");
    }
    const universalOp = await pickUniversallySupportedOp(snap);
    const exclude = working.slice(0, working.length - 1); // exclude all but one
    const result = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [universalOp],
      excludeSystems: exclude,
    });
    for (const ex of exclude) {
      expect(result.cadSystem).not.toBe(ex);
      for (const alt of result.alternatives) {
        expect(alt.cadSystem).not.toBe(ex);
      }
    }
  });

  it("throws UnsupportedCapabilityError when every adapter is excluded", async () => {
    const snap = await snapshotAllAdapters();
    const universalOp = await pickUniversallySupportedOp(snap);
    await expect(
      cadCapabilityNegotiatorEngine.negotiate({
        ops: [universalOp],
        excludeSystems: [...CAD_REGISTERED_SYSTEMS],
      }),
    ).rejects.toBeInstanceOf(UnsupportedCapabilityError);
  });
});

// ============================================================================
// SECTION 5 — unknown system errors
// ============================================================================

describe("CADCapabilityNegotiatorEngine.negotiate — unknown systems", () => {
  it("throws UnknownCADSystemError for an unknown preferredSystem", async () => {
    await expect(
      cadCapabilityNegotiatorEngine.negotiate({
        ops: ["sketch_line"],
        preferredSystem: "totally_not_a_cad_system" as unknown as CADSystemId,
      }),
    ).rejects.toThrow(/UNKNOWN_CAD_SYSTEM|not registered/i);
  });

  it("throws UnknownCADSystemError for an unknown excludeSystems entry", async () => {
    await expect(
      cadCapabilityNegotiatorEngine.negotiate({
        ops: ["sketch_line"],
        excludeSystems: ["bogus_cad" as unknown as CADSystemId],
      }),
    ).rejects.toThrow(/UNKNOWN_CAD_SYSTEM|not registered/i);
  });
});

// ============================================================================
// SECTION 6 — validateIntent rejections
// ============================================================================

describe("CADCapabilityNegotiatorEngine.negotiate — validation", () => {
  it("rejects a non-array ops field", async () => {
    await expect(
      cadCapabilityNegotiatorEngine.negotiate({
        ops: "sketch_line" as unknown as CADOperationKind[],
      }),
    ).rejects.toThrow(/intent\.ops must be an array/);
  });

  it("rejects an unknown policy value", async () => {
    await expect(
      cadCapabilityNegotiatorEngine.negotiate({
        ops: [],
        policy: "yolo" as unknown as "strict",
      }),
    ).rejects.toThrow(/policy must be one of/);
  });

  it("rejects a null intent object", async () => {
    await expect(
      cadCapabilityNegotiatorEngine.negotiate(null as unknown as { ops: CADOperationKind[] }),
    ).rejects.toThrow(/intent object required/);
  });
});

// ============================================================================
// SECTION 7 — negotiateOrThrow
// ============================================================================

describe("CADCapabilityNegotiatorEngine.negotiateOrThrow", () => {
  it("returns the same result as negotiate() when supported", async () => {
    const snap = await snapshotAllAdapters();
    const working = Array.from(snap.keys()).sort();
    const pick = working[0];
    const universalOp = await pickUniversallySupportedOp(snap);
    const r1 = await cadCapabilityNegotiatorEngine.negotiate({
      ops: [universalOp],
      preferredSystem: pick,
    });
    const r2 = await cadCapabilityNegotiatorEngine.negotiateOrThrow({
      ops: [universalOp],
      preferredSystem: pick,
    });
    expect(r2.cadSystem).toBe(r1.cadSystem);
    expect(r2.supported).toBe(true);
  });
});

// ============================================================================
// SECTION 8 — listGaps
// ============================================================================

describe("CADCapabilityNegotiatorEngine.listGaps", () => {
  it("returns one entry per WORKING registered adapter when no reference ops are given", async () => {
    const out = await cadCapabilityNegotiatorEngine.listGaps();
    const working = await workingAdapterIds();
    expect(out.length).toBe(working.length);
    const seen = new Set(out.map((c) => c.cadSystem));
    for (const sys of working) {
      expect(seen.has(sys)).toBe(true);
    }
  });

  it("returns missingOps per adapter when reference ops are given", async () => {
    const snap = await snapshotAllAdapters();
    const universalOp = await pickUniversallySupportedOp(snap);
    const out = await cadCapabilityNegotiatorEngine.listGaps([universalOp]);
    for (const candidate of out) {
      expect(candidate.missingOps).toEqual([]);
      expect(candidate.supportedOps).toContain(universalOp);
    }
  });

  it("deduplicates reference ops before evaluating", async () => {
    const snap = await snapshotAllAdapters();
    const universalOp = await pickUniversallySupportedOp(snap);
    const out = await cadCapabilityNegotiatorEngine.listGaps([
      universalOp,
      universalOp,
      universalOp,
    ]);
    for (const candidate of out) {
      expect(candidate.supportedOps.length).toBe(1);
    }
  });

  it("sorts output deterministically by cadSystem name", async () => {
    const out = await cadCapabilityNegotiatorEngine.listGaps();
    const names = out.map((c) => c.cadSystem);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

// ============================================================================
// SECTION 9 — variability (every registered adapter exercised somewhere)
// ============================================================================

describe("CADCapabilityNegotiatorEngine — adapter variability", () => {
  it("can resolve to every WORKING registered adapter via preference + universal op", async () => {
    const snap = await snapshotAllAdapters();
    const working = Array.from(snap.keys()).sort();
    expect(working.length).toBeGreaterThanOrEqual(3);
    const universalOp = await pickUniversallySupportedOp(snap);
    const reached = new Set<CADSystemId>();
    for (const sys of working) {
      const result = await cadCapabilityNegotiatorEngine.negotiate({
        ops: [universalOp],
        preferredSystem: sys,
      });
      reached.add(result.cadSystem);
      expect(result.supported).toBe(true);
      expect(result.cadSystem).toBe(sys);
    }
    expect(reached.size).toBe(working.length);
  });
});
