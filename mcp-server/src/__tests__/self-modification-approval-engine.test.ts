/**
 * Tests for SelfModificationApprovalEngine (Phase 0.25.1 U-SAFE4)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SelfModificationApprovalEngine,
  DEFAULT_APPROVAL_CONFIG,
  selfModificationApprovalEngine,
  type ApprovalSubmission,
} from "../engines/SelfModificationApprovalEngine.js";

const NOW = Date.parse("2026-04-16T12:00:00.000Z");

function submission(overrides: Partial<ApprovalSubmission> = {}): ApprovalSubmission {
  return {
    proposalId: overrides.proposalId ?? "prop-1",
    proposalHash: overrides.proposalHash ?? "hash-a",
    title: overrides.title ?? "Remove orphan engine X",
    kind: overrides.kind ?? "remove-orphan",
    submittedBy: overrides.submittedBy ?? "PrismSession/1",
    submittedAt: overrides.submittedAt,
  };
}

describe("SelfModificationApprovalEngine", () => {
  let e: SelfModificationApprovalEngine;

  beforeEach(() => {
    e = new SelfModificationApprovalEngine();
  });

  describe("construction / config", () => {
    it("uses default config (empty auto-approve list)", () => {
      expect(DEFAULT_APPROVAL_CONFIG.autoApproveKinds).toEqual([]);
    });

    it("rejects invalid config", () => {
      expect(() =>
        new SelfModificationApprovalEngine({ ttlMinutes: 0, autoApproveKinds: [] })
      ).toThrow(/ttlMinutes/);
      expect(() =>
        new SelfModificationApprovalEngine({
          ttlMinutes: 10,
          autoApproveKinds: "remove-orphan" as unknown as string[],
        })
      ).toThrow(/autoApproveKinds/);
    });

    it("setConfig normalizes autoApproveKinds to lowercase", () => {
      e.setConfig({ ttlMinutes: 10, autoApproveKinds: ["REMOVE-ORPHAN"] });
      const r = e.submit(submission(), NOW);
      expect(r.status).toBe("approved");
    });
  });

  describe("submit()", () => {
    it("rejects missing fields", () => {
      expect(() => e.submit(submission({ proposalId: "" }))).toThrow(/proposalId/);
      expect(() => e.submit(submission({ proposalHash: "" }))).toThrow(/proposalHash/);
      expect(() => e.submit(submission({ title: "" }))).toThrow(/title/);
      expect(() => e.submit(submission({ kind: "" }))).toThrow(/kind/);
      expect(() => e.submit(submission({ submittedBy: "" }))).toThrow(/submittedBy/);
    });

    it("creates a pending record by default", () => {
      const r = e.submit(submission(), NOW);
      expect(r.status).toBe("pending");
      expect(r.autoApproved).toBe(false);
    });

    it("auto-approves when kind is in the auto-approve list", () => {
      e.setConfig({ ttlMinutes: 60, autoApproveKinds: ["remove-orphan"] });
      const r = e.submit(submission({ kind: "remove-orphan" }), NOW);
      expect(r.status).toBe("approved");
      expect(r.autoApproved).toBe(true);
    });

    it("rejects re-submission with a different hash", () => {
      e.submit(submission({ proposalId: "p1", proposalHash: "h1" }), NOW);
      expect(() =>
        e.submit(submission({ proposalId: "p1", proposalHash: "h2" }), NOW)
      ).toThrow(/different hash/);
    });

    it("re-submission with the same hash returns the existing record", () => {
      const a = e.submit(submission({ proposalId: "p1", proposalHash: "h1" }), NOW);
      const b = e.submit(submission({ proposalId: "p1", proposalHash: "h1" }), NOW + 1000);
      expect(a.submittedAt).toBe(b.submittedAt);
    });
  });

  describe("approve() / reject()", () => {
    it("approve flips status and records decider", () => {
      e.submit(submission(), NOW);
      const r = e.approve("prop-1", "hash-a", "markV", new Date(NOW + 1000).toISOString());
      expect(r.status).toBe("approved");
      expect(r.decidedBy).toBe("markV");
    });

    it("reject flips status and records reason", () => {
      e.submit(submission(), NOW);
      const r = e.reject("prop-1", "hash-a", "markV", "deemed unsafe", new Date(NOW + 1000).toISOString());
      expect(r.status).toBe("rejected");
      expect(r.reason).toBe("deemed unsafe");
    });

    it("both reject invalid hash", () => {
      e.submit(submission(), NOW);
      expect(() => e.approve("prop-1", "wrong", "m")).toThrow(/hash/i);
      expect(() => e.reject("prop-1", "wrong", "m", "r")).toThrow(/hash/i);
    });

    it("both reject unknown proposal id", () => {
      expect(() => e.approve("ghost", "x", "m")).toThrow(/no pending/);
      expect(() => e.reject("ghost", "x", "m", "r")).toThrow(/no pending/);
    });

    it("cannot approve or reject a non-pending record", () => {
      e.submit(submission(), NOW);
      e.approve("prop-1", "hash-a", "m");
      expect(() => e.approve("prop-1", "hash-a", "m")).toThrow(/not pending/);
      expect(() => e.reject("prop-1", "hash-a", "m", "r")).toThrow(/not pending/);
    });
  });

  describe("expiration + sweep", () => {
    it("isApproved returns false after TTL even for approved records", () => {
      e.setConfig({ ttlMinutes: 1, autoApproveKinds: ["remove-orphan"] });
      e.submit(submission({ kind: "remove-orphan" }), NOW);
      expect(e.isApproved("prop-1", "hash-a", NOW + 30_000)).toBe(true);
      expect(e.isApproved("prop-1", "hash-a", NOW + 120_000)).toBe(false);
    });

    it("isApproved false for unknown id or wrong hash", () => {
      e.submit(submission(), NOW);
      e.approve("prop-1", "hash-a", "m");
      expect(e.isApproved("prop-1", "hash-b")).toBe(false);
      expect(e.isApproved("ghost", "hash-a")).toBe(false);
    });

    it("sweep transitions expired pending records", () => {
      e.setConfig({ ttlMinutes: 1, autoApproveKinds: [] });
      e.submit(submission({ proposalId: "p1" }), NOW);
      e.submit(submission({ proposalId: "p2" }), NOW);
      const n = e.sweep(NOW + 120_000);
      expect(n).toBe(2);
      expect(e.get("p1")?.status).toBe("expired");
    });
  });

  describe("listing", () => {
    it("listPending returns only pending records", () => {
      e.submit(submission({ proposalId: "p1" }), NOW);
      e.submit(submission({ proposalId: "p2" }), NOW);
      e.approve("p1", "hash-a", "m");
      expect(e.listPending().map((r) => r.proposalId)).toEqual(["p2"]);
    });

    it("clear empties everything", () => {
      e.submit(submission(), NOW);
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      selfModificationApprovalEngine.clear();
      selfModificationApprovalEngine.submit(submission({ proposalId: "sing" }));
      expect(selfModificationApprovalEngine.size()).toBe(1);
      selfModificationApprovalEngine.clear();
    });
  });
});
