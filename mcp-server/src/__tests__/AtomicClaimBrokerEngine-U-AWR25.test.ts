/**
 * AtomicClaimBrokerEngine Tests
 * @unit AI-AWARE-HARDEN/U-AWR25
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { atomicClaimBrokerEngine } from "../engines/AtomicClaimBrokerEngine.js";
import * as fs from "fs";

const CLAIMS_FILE = "H:/prism/state/shared/ATOMIC_CLAIMS.json";

describe("AtomicClaimBrokerEngine", () => {
  beforeEach(() => {
    try { fs.unlinkSync(CLAIMS_FILE); } catch { /* ignore */ }
  });

  afterEach(() => {
    try { fs.unlinkSync(CLAIMS_FILE); } catch { /* ignore */ }
  });

  describe("acquireClaim", () => {
    it("should acquire a new claim", () => {
      const result = atomicClaimBrokerEngine.acquireClaim("test-resource-1");
      expect(result.success).toBe(true);
      expect(result.claim).toBeDefined();
      expect(result.claim!.resource).toBe("test-resource-1");
      expect(result.claim!.state).toBe("active");
    });

    it("should allow reentrant claim by same holder", () => {
      const result1 = atomicClaimBrokerEngine.acquireClaim("test-resource-2");
      expect(result1.success).toBe(true);

      const result2 = atomicClaimBrokerEngine.acquireClaim("test-resource-2");
      expect(result2.success).toBe(true);
      expect(result2.claim!.resource).toBe("test-resource-2");
    });

    it("should include checksum for integrity", () => {
      const result = atomicClaimBrokerEngine.acquireClaim("test-resource-3");
      expect(result.claim!.checksum).toMatch(/^[a-f0-9]{16}$/);
    });

    it("should increment sequence numbers", () => {
      const r1 = atomicClaimBrokerEngine.acquireClaim("res-a");
      const r2 = atomicClaimBrokerEngine.acquireClaim("res-b");

      expect(r2.claim!.sequenceNumber).toBeGreaterThan(r1.claim!.sequenceNumber);
    });
  });

  describe("releaseClaim", () => {
    it("should release an owned claim", () => {
      atomicClaimBrokerEngine.acquireClaim("release-test");
      const released = atomicClaimBrokerEngine.releaseClaim("release-test");
      expect(released).toBe(true);
    });

    it("should return false for non-existent claim", () => {
      const released = atomicClaimBrokerEngine.releaseClaim("nonexistent");
      expect(released).toBe(false);
    });
  });

  describe("holdsClaim", () => {
    it("should return true for owned claim", () => {
      atomicClaimBrokerEngine.acquireClaim("hold-test");
      expect(atomicClaimBrokerEngine.holdsClaim("hold-test")).toBe(true);
    });

    it("should return false after release", () => {
      atomicClaimBrokerEngine.acquireClaim("hold-release-test");
      atomicClaimBrokerEngine.releaseClaim("hold-release-test");
      expect(atomicClaimBrokerEngine.holdsClaim("hold-release-test")).toBe(false);
    });
  });

  describe("updateClaimState", () => {
    it("should update claim state to compacting", () => {
      atomicClaimBrokerEngine.acquireClaim("state-test");
      const updated = atomicClaimBrokerEngine.updateClaimState("state-test", "compacting");
      expect(updated).toBe(true);

      const claim = atomicClaimBrokerEngine.getClaim("state-test");
      expect(claim!.state).toBe("compacting");
    });
  });

  describe("getStats", () => {
    it("should return claim statistics", () => {
      atomicClaimBrokerEngine.acquireClaim("stats-1");
      atomicClaimBrokerEngine.acquireClaim("stats-2");

      const stats = atomicClaimBrokerEngine.getStats();
      expect(stats.totalClaims).toBeGreaterThanOrEqual(2);
      expect(stats.activeClaims).toBeGreaterThanOrEqual(2);
      expect(stats.sequenceCounter).toBeGreaterThan(0);
    });
  });

  describe("reapZombies", () => {
    it("should return reap results", () => {
      const result = atomicClaimBrokerEngine.reapZombies();
      expect(result).toHaveProperty("reaped");
      expect(result).toHaveProperty("zombiesFound");
      expect(result).toHaveProperty("cyclesDetected");
    });
  });

  describe("getActiveClaims", () => {
    it("should return list of active claims", () => {
      atomicClaimBrokerEngine.acquireClaim("active-test");
      const claims = atomicClaimBrokerEngine.getActiveClaims();
      expect(claims.length).toBeGreaterThan(0);
      expect(claims.some(c => c.resource === "active-test")).toBe(true);
    });
  });
});
