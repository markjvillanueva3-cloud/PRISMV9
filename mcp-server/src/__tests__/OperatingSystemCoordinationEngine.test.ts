/**
 * OperatingSystemCoordinationEngine.test.ts — engine-direct coverage.
 *
 * Pairs with `dispatcher.operatingSystemCoordination.test.ts`. Exercises
 * 2 pure-read static methods directly. setHotJob + clearHotJob DEFERRED
 * (state-mutation; peer queue thrash risk).
 *
 * Test note: this file uses listHotJobs as a READ. It does NOT call
 * setHotJob/clearHotJob, so it does not perturb the shared in-memory
 * `hotJobs` array that peer chats may also read.
 */

import { describe, it, expect } from "vitest";
import { OperatingSystemCoordinationEngine } from "../engines/OperatingSystemCoordinationEngine.js";

const SCOPES = ["admin", "machinist", "inspector", "planner"] as const;

describe("OperatingSystemCoordinationEngine — listHotJobs (read-only)", () => {
  it("returns an array (typically empty in fresh test env)", () => {
    const r = OperatingSystemCoordinationEngine.listHotJobs();
    expect(Array.isArray(r)).toBe(true);
  });

  it("idempotent — back-to-back calls return same-length arrays", () => {
    const a = OperatingSystemCoordinationEngine.listHotJobs();
    const b = OperatingSystemCoordinationEngine.listHotJobs();
    expect(a.length).toBe(b.length);
  });

  it("each returned HotJobRecord has 7 required string fields (when non-empty)", () => {
    const records = OperatingSystemCoordinationEngine.listHotJobs();
    for (const r of records) {
      expect(typeof r.jobId).toBe("string");
      expect(typeof r.partNumber).toBe("string");
      expect(typeof r.customer).toBe("string");
      expect(typeof r.dueDate).toBe("string");
      expect(typeof r.note).toBe("string");
      expect(typeof r.setBy).toBe("string");
      expect(typeof r.setAt).toBe("string");
    }
  });
});

describe("OperatingSystemCoordinationEngine — buildMessagesWorkspace (read-only)", () => {
  it("default invocation returns 10-field workspace with non-empty summary + identityLabel + activeMailbox", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace();
    expect(ws.summary.length).toBeGreaterThan(0);
    expect(ws.identityLabel.length).toBeGreaterThan(0);
    expect(ws.activeMailbox.length).toBeGreaterThan(0);
    expect(ws.connectionNote.length).toBeGreaterThan(0);
    expect(Array.isArray(ws.channels)).toBe(true);
    expect(Array.isArray(ws.threads)).toBe(true);
    expect(typeof ws.selectedThreadId).toBe("string");
    expect(Array.isArray(ws.selectedThreadEntries)).toBe(true);
    expect(typeof ws.actionLabels).toBe("object");
    expect(Array.isArray(ws.linkedRecords)).toBe(true);
  });

  it("VARIABILITY — 4 scope profiles all produce non-empty summary + threads + distinct summary text per scope", () => {
    const summariesByScope: Record<string, string> = {};
    for (const profileId of SCOPES) {
      const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace({ profileId });
      expect(ws.summary.length).toBeGreaterThan(0);
      expect(ws.threads.length).toBeGreaterThan(0);
      summariesByScope[profileId] = ws.summary;
    }
    // engine summaryByScope (line 563-568) has a distinct summary per scope.
    // Confirm at least 3 are distinct (admin/machinist/inspector/planner all unique).
    const unique = new Set(Object.values(summariesByScope));
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it("invalid threadId falls back to first thread (engine line 555-557)", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace({
      profileId: "machinist", threadId: "no-such-thread-id-zzz",
    });
    expect(ws.selectedThreadId).toBe(ws.threads[0]?.id);
  });

  it("valid threadId is selected (engine line 555-557 happy path)", () => {
    // Get the canonical thread list for one scope, then echo back the second.
    const ws1 = OperatingSystemCoordinationEngine.buildMessagesWorkspace({ profileId: "machinist" });
    if (ws1.threads.length >= 2) {
      const targetId = ws1.threads[1]!.id;
      const ws2 = OperatingSystemCoordinationEngine.buildMessagesWorkspace({
        profileId: "machinist", threadId: targetId,
      });
      expect(ws2.selectedThreadId).toBe(targetId);
    } else {
      // Only one thread in scope — fallback is the only thread.
      expect(ws1.selectedThreadId).toBe(ws1.threads[0]?.id);
    }
  });

  it("activeMailbox includes '@' (engine returns identity.email; well-formed address)", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace();
    expect(ws.activeMailbox).toContain("@");
  });

  it("identityLabel matches pattern '<displayName> · <role>' (engine line 572)", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace();
    // Engine line 572: `${identity.displayName} · ${identity.role}`
    expect(ws.identityLabel).toMatch(/ · /);
  });

  it("channel count >= 1 per buildChannelSummaries output (one channel per thread minimum)", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace();
    expect(ws.channels.length).toBeGreaterThanOrEqual(1);
  });

  it("BOUNDARY — null email + null threadId both accepted (engine treats as 'not provided')", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace({
      email: null, threadId: null,
    });
    expect(ws.selectedThreadId.length).toBeGreaterThan(0);
    expect(ws.threads.length).toBeGreaterThan(0);
  });

  it("ADVERSARIAL — unknown profileId still produces a well-formed workspace (engine line 477-495 fallback)", () => {
    const ws = OperatingSystemCoordinationEngine.buildMessagesWorkspace({
      profileId: "totally-unknown-profile-id-99999",
    });
    // determineScope falls back to a default scope when profileId/email
    // don't match any known operator. workspace must still be well-formed.
    expect(ws.summary.length).toBeGreaterThan(0);
    expect(ws.threads.length).toBeGreaterThan(0);
    expect(ws.activeMailbox.length).toBeGreaterThan(0);
  });

  it("idempotent — same input twice yields same selectedThreadId + same summary", () => {
    const a = OperatingSystemCoordinationEngine.buildMessagesWorkspace({ profileId: "admin" });
    const b = OperatingSystemCoordinationEngine.buildMessagesWorkspace({ profileId: "admin" });
    expect(a.selectedThreadId).toBe(b.selectedThreadId);
    expect(a.summary).toBe(b.summary);
  });
});
