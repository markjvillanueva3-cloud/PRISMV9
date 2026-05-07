/**
 * CADCrashRecoveryEngine.test.ts — U-CAD-APP-13 (PHASE-48)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  CADCrashRecoveryEngine,
  type CADRecoveryTransport,
  type CADRecoveryClock,
  type AppHealth,
  type CrashEvent,
  type CADAppType,
} from "../engines/CADCrashRecoveryEngine.js";

function makeClock(): CADRecoveryClock & { tickMs(ms: number): void } {
  let mono = 1_000_000;
  let iso = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms: number) => {
      mono += ms;
      iso += ms;
    },
  };
}

function makeTransport(overrides: Partial<CADRecoveryTransport> = {}): CADRecoveryTransport {
  return {
    getProcessHealth: (appType, processId) => ({
      appType,
      processId,
      state: "running",
      memoryMb: 2048,
      cpuPercent: 15,
      lastHeartbeat: new Date().toISOString(),
      uptimeMs: 3600000,
      responseTimeMs: 50,
    }),
    restartApp: () => ({ processId: 9999, success: true }),
    attachToProcess: () => true,
    executeCommand: () => true,
    loadDocument: () => true,
    ...overrides,
  };
}

function makeFailingTransport(): CADRecoveryTransport {
  return {
    getProcessHealth: () => null,
    restartApp: () => ({ processId: 0, success: false }),
    attachToProcess: () => false,
    executeCommand: () => false,
    loadDocument: () => false,
  };
}

describe("CADCrashRecoveryEngine (U-CAD-APP-13)", () => {
  let eng: CADCrashRecoveryEngine;
  let transport: CADRecoveryTransport;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    transport = makeTransport();
    clock = makeClock();
    eng = new CADCrashRecoveryEngine({ transport, clock });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("session management", () => {
    it("registerSession adds session", () => {
      eng.registerSession("sess-001", "SolidWorks", 1234);
      expect(eng.getSession("sess-001")).toBeDefined();
      expect(eng.getSession("sess-001")!.appType).toBe("SolidWorks");
    });

    it("registerSession with document path", () => {
      eng.registerSession("sess-001", "CATIA", 1234, { documentPath: "C:\\Models\\part.CATPart" });
      expect(eng.getSession("sess-001")!.documentPath).toBe("C:\\Models\\part.CATPart");
    });

    it("registerSession with custom policy", () => {
      eng.registerSession("sess-001", "NX", 1234, { policy: { maxRetries: 5 } });
      expect(eng.getPolicy("sess-001").maxRetries).toBe(5);
    });

    it("unregisterSession removes session", () => {
      eng.registerSession("sess-001", "Creo", 1234);
      expect(eng.unregisterSession("sess-001")).toBe(true);
      expect(eng.getSession("sess-001")).toBeUndefined();
    });

    it("listSessions returns all session IDs", () => {
      eng.registerSession("sess-001", "SolidWorks", 1111);
      eng.registerSession("sess-002", "CATIA", 2222);
      expect(eng.listSessions()).toEqual(["sess-001", "sess-002"]);
    });

    it("getSession returns undefined for unknown session", () => {
      expect(eng.getSession("unknown")).toBeUndefined();
    });
  });

  describe("health monitoring", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234);
    });

    it("checkHealth returns health data", () => {
      const health = eng.checkHealth("sess-001");
      expect(health).not.toBeNull();
      expect(health!.state).toBe("running");
      expect(health!.memoryMb).toBe(2048);
    });

    it("checkHealth returns null for unknown session", () => {
      expect(eng.checkHealth("unknown")).toBeNull();
    });

    it("checkHealth returns null when transport returns null", () => {
      eng = new CADCrashRecoveryEngine({ transport: makeFailingTransport(), clock });
      eng.registerSession("sess-001", "SolidWorks", 1234);
      expect(eng.checkHealth("sess-001")).toBeNull();
    });

    it("startHeartbeat activates monitoring", () => {
      vi.useFakeTimers();
      expect(eng.startHeartbeat("sess-001", 1000)).toBe(true);
      expect(eng.isHeartbeatActive("sess-001")).toBe(true);
      vi.useRealTimers();
    });

    it("startHeartbeat returns false for unknown session", () => {
      expect(eng.startHeartbeat("unknown")).toBe(false);
    });

    it("startHeartbeat returns false if already active", () => {
      vi.useFakeTimers();
      eng.startHeartbeat("sess-001");
      expect(eng.startHeartbeat("sess-001")).toBe(false);
      eng.stopHeartbeat("sess-001");
      vi.useRealTimers();
    });

    it("stopHeartbeat deactivates monitoring", () => {
      vi.useFakeTimers();
      eng.startHeartbeat("sess-001");
      expect(eng.stopHeartbeat("sess-001")).toBe(true);
      expect(eng.isHeartbeatActive("sess-001")).toBe(false);
      vi.useRealTimers();
    });

    it("stopHeartbeat returns false if not active", () => {
      expect(eng.stopHeartbeat("sess-001")).toBe(false);
    });
  });

  describe("checkpointing", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234, { documentPath: "C:\\test.sldprt" });
    });

    it("createCheckpoint creates checkpoint", () => {
      const ckpt = eng.createCheckpoint("sess-001");
      expect(ckpt).not.toBeNull();
      expect(ckpt!.id).toMatch(/^ckpt-/);
      expect(ckpt!.sessionId).toBe("sess-001");
    });

    it("createCheckpoint with metadata", () => {
      const ckpt = eng.createCheckpoint("sess-001", { metadata: { feature: "extrude" } });
      expect(ckpt!.metadata).toEqual({ feature: "extrude" });
    });

    it("createCheckpoint returns null for unknown session", () => {
      expect(eng.createCheckpoint("unknown")).toBeNull();
    });

    it("getCheckpoint retrieves checkpoint", () => {
      const ckpt = eng.createCheckpoint("sess-001")!;
      expect(eng.getCheckpoint(ckpt.id)).toEqual(ckpt);
    });

    it("getLatestCheckpoint returns most recent", () => {
      eng.recordCommand("sess-001", "line", {}, { durationMs: 10, success: true });
      const ckpt1 = eng.createCheckpoint("sess-001")!;
      eng.recordCommand("sess-001", "circle", {}, { durationMs: 10, success: true });
      const ckpt2 = eng.createCheckpoint("sess-001")!;

      expect(eng.getLatestCheckpoint("sess-001")!.id).toBe(ckpt2.id);
    });

    it("getLatestCheckpoint returns undefined for no checkpoints", () => {
      expect(eng.getLatestCheckpoint("sess-001")).toBeUndefined();
    });

    it("listCheckpoints returns all checkpoints", () => {
      eng.createCheckpoint("sess-001");
      eng.createCheckpoint("sess-001");
      expect(eng.listCheckpoints().length).toBe(2);
    });

    it("listCheckpoints filters by session", () => {
      eng.registerSession("sess-002", "CATIA", 5678);
      eng.createCheckpoint("sess-001");
      eng.createCheckpoint("sess-002");
      expect(eng.listCheckpoints("sess-001").length).toBe(1);
    });

    it("deleteCheckpoint removes checkpoint", () => {
      const ckpt = eng.createCheckpoint("sess-001")!;
      expect(eng.deleteCheckpoint(ckpt.id)).toBe(true);
      expect(eng.getCheckpoint(ckpt.id)).toBeUndefined();
    });
  });

  describe("command journal", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234);
    });

    it("recordCommand adds to journal", () => {
      const entry = eng.recordCommand("sess-001", "extrude", { depth: 10 }, { durationMs: 50, success: true });
      expect(entry).not.toBeNull();
      expect(entry!.command).toBe("extrude");
      expect(entry!.index).toBe(0);
    });

    it("recordCommand increments index", () => {
      eng.recordCommand("sess-001", "cmd1", {}, { durationMs: 10, success: true });
      eng.recordCommand("sess-001", "cmd2", {}, { durationMs: 10, success: true });
      const entry = eng.recordCommand("sess-001", "cmd3", {}, { durationMs: 10, success: true });
      expect(entry!.index).toBe(2);
    });

    it("recordCommand returns null for unknown session", () => {
      expect(eng.recordCommand("unknown", "cmd", {}, { durationMs: 10, success: true })).toBeNull();
    });

    it("getJournal returns command history", () => {
      eng.recordCommand("sess-001", "line", {}, { durationMs: 10, success: true });
      eng.recordCommand("sess-001", "arc", {}, { durationMs: 15, success: true });
      const journal = eng.getJournal("sess-001");
      expect(journal.length).toBe(2);
      expect(journal[0].command).toBe("line");
    });

    it("getJournal returns empty for unknown session", () => {
      expect(eng.getJournal("unknown")).toEqual([]);
    });

    it("getJournalSince returns commands after checkpoint", () => {
      eng.recordCommand("sess-001", "cmd1", {}, { durationMs: 10, success: true });
      const ckpt = eng.createCheckpoint("sess-001")!;
      eng.recordCommand("sess-001", "cmd2", {}, { durationMs: 10, success: true });
      eng.recordCommand("sess-001", "cmd3", {}, { durationMs: 10, success: true });

      const since = eng.getJournalSince("sess-001", ckpt.id);
      expect(since.length).toBe(2);
      expect(since[0].command).toBe("cmd2");
    });

    it("getJournalSince returns empty for unknown checkpoint", () => {
      expect(eng.getJournalSince("sess-001", "unknown")).toEqual([]);
    });

    it("clearJournal empties journal", () => {
      eng.recordCommand("sess-001", "cmd", {}, { durationMs: 10, success: true });
      expect(eng.clearJournal("sess-001")).toBe(1);
      expect(eng.getJournal("sess-001").length).toBe(0);
    });
  });

  describe("crash handling", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234, {
        documentPath: "C:\\test.sldprt",
        policy: { autoReattach: false },
      });
    });

    it("handleCrash creates crash event", () => {
      const event = eng.handleCrash("sess-001", -1, "SIGSEGV");
      expect(event.id).toMatch(/^crash-/);
      expect(event.exitCode).toBe(-1);
      expect(event.signal).toBe("SIGSEGV");
    });

    it("handleCrash throws for unknown session", () => {
      expect(() => eng.handleCrash("unknown")).toThrow("Unknown session");
    });

    it("handleCrash stops heartbeat", () => {
      vi.useFakeTimers();
      eng.startHeartbeat("sess-001");
      eng.handleCrash("sess-001");
      expect(eng.isHeartbeatActive("sess-001")).toBe(false);
      vi.useRealTimers();
    });

    it("handleCrash records last checkpoint", () => {
      eng.recordCommand("sess-001", "cmd", {}, { durationMs: 10, success: true });
      const ckpt = eng.createCheckpoint("sess-001")!;
      const event = eng.handleCrash("sess-001");
      expect(event.lastCheckpointId).toBe(ckpt.id);
    });

    it("handleCrash notifies subscribers", () => {
      const crashes: CrashEvent[] = [];
      eng.onCrash((e) => crashes.push(e));
      eng.handleCrash("sess-001");
      expect(crashes.length).toBe(1);
    });

    it("handleCrash with auto-reattach attempts recovery", () => {
      eng.setPolicy("sess-001", { autoReattach: true, maxRetries: 1 });
      const event = eng.handleCrash("sess-001");
      expect(event.recovered).toBe(true);
    });
  });

  describe("recovery", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234, { documentPath: "C:\\test.sldprt" });
    });

    it("attemptRecovery succeeds with working transport", () => {
      const event = eng.handleCrash("sess-001");
      event.recovered = false;
      const success = eng.attemptRecovery(event);
      expect(success).toBe(true);
      expect(event.recovered).toBe(true);
    });

    it("attemptRecovery fails with failing transport", () => {
      eng = new CADCrashRecoveryEngine({ transport: makeFailingTransport(), clock, defaultPolicy: { autoReattach: false } });
      eng.registerSession("sess-001", "SolidWorks", 1234);
      const event = eng.handleCrash("sess-001");
      event.recovered = false;
      const success = eng.attemptRecovery(event, { maxRetries: 2, autoReattach: true, autoReplay: false, replayFromCheckpoint: false, retryDelayMs: 100, notifyOnCrash: true, createBackup: true, maxReplayCommands: 100 });
      expect(success).toBe(false);
      expect(event.recoveryAttempts).toBe(2);
    });

    it("attemptRecovery updates process ID", () => {
      const restartPid = 8888;
      eng = new CADCrashRecoveryEngine({
        transport: makeTransport({ restartApp: () => ({ processId: restartPid, success: true }) }),
        clock,
      });
      eng.registerSession("sess-001", "SolidWorks", 1234);
      const event = eng.handleCrash("sess-001");
      eng.attemptRecovery(event);
      expect(eng.getSession("sess-001")!.processId).toBe(restartPid);
    });

    it("attemptRecovery notifies recovery subscribers", () => {
      eng.setPolicy("sess-001", { autoReattach: false });
      const recoveries: Array<{ event: CrashEvent; success: boolean }> = [];
      eng.onRecovery((e, s) => recoveries.push({ event: e, success: s }));
      const event = eng.handleCrash("sess-001");
      eng.attemptRecovery(event);
      expect(recoveries.length).toBe(1);
      expect(recoveries[0].success).toBe(true);
    });

    it("replayFromCheckpoint executes commands", () => {
      const executed: string[] = [];
      eng = new CADCrashRecoveryEngine({
        transport: makeTransport({
          executeCommand: (_, cmd) => { executed.push(cmd); return true; },
        }),
        clock,
      });
      eng.registerSession("sess-001", "SolidWorks", 1234);
      eng.recordCommand("sess-001", "cmd1", {}, { durationMs: 10, success: true });
      const ckpt = eng.createCheckpoint("sess-001")!;
      eng.recordCommand("sess-001", "cmd2", {}, { durationMs: 10, success: true });
      eng.recordCommand("sess-001", "cmd3", {}, { durationMs: 10, success: true });

      eng.replayFromCheckpoint("sess-001", ckpt.id);
      expect(executed).toEqual(["cmd2", "cmd3"]);
    });

    it("replayFromCheckpoint respects maxCommands", () => {
      const executed: string[] = [];
      eng = new CADCrashRecoveryEngine({
        transport: makeTransport({
          executeCommand: (_, cmd) => { executed.push(cmd); return true; },
        }),
        clock,
      });
      eng.registerSession("sess-001", "SolidWorks", 1234);
      const ckpt = eng.createCheckpoint("sess-001")!;
      for (let i = 0; i < 10; i++) {
        eng.recordCommand("sess-001", `cmd${i}`, {}, { durationMs: 10, success: true });
      }

      eng.replayFromCheckpoint("sess-001", ckpt.id, 3);
      expect(executed.length).toBe(3);
    });
  });

  describe("crash history", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234, { policy: { autoReattach: false } });
      eng.registerSession("sess-002", "CATIA", 5678, { policy: { autoReattach: false } });
    });

    it("getCrashHistory returns all crashes", () => {
      eng.handleCrash("sess-001");
      eng.handleCrash("sess-002");
      expect(eng.getCrashHistory().length).toBe(2);
    });

    it("getCrashHistory filters by session", () => {
      eng.handleCrash("sess-001");
      eng.handleCrash("sess-002");
      expect(eng.getCrashHistory({ sessionId: "sess-001" }).length).toBe(1);
    });

    it("getCrashHistory with limit", () => {
      for (let i = 0; i < 5; i++) {
        eng.handleCrash("sess-001");
      }
      expect(eng.getCrashHistory({ limit: 2 }).length).toBe(2);
    });

    it("clearCrashHistory empties history", () => {
      eng.handleCrash("sess-001");
      expect(eng.clearCrashHistory()).toBe(1);
      expect(eng.getCrashHistory().length).toBe(0);
    });
  });

  describe("policy management", () => {
    it("setPolicy updates session policy", () => {
      eng.registerSession("sess-001", "SolidWorks", 1234);
      eng.setPolicy("sess-001", { maxRetries: 10 });
      expect(eng.getPolicy("sess-001").maxRetries).toBe(10);
    });

    it("getPolicy returns default for unset session", () => {
      eng.registerSession("sess-001", "SolidWorks", 1234);
      const policy = eng.getPolicy("sess-001");
      expect(policy.maxRetries).toBe(3);
    });

    it("setDefaultPolicy updates default", () => {
      eng.setDefaultPolicy({ maxRetries: 7 });
      eng.registerSession("sess-001", "SolidWorks", 1234);
      expect(eng.getPolicy("sess-001").maxRetries).toBe(7);
    });
  });

  describe("event subscriptions", () => {
    beforeEach(() => {
      eng.registerSession("sess-001", "SolidWorks", 1234, { policy: { autoReattach: false } });
    });

    it("onCrash subscription receives events", () => {
      const events: CrashEvent[] = [];
      eng.onCrash((e) => events.push(e));
      eng.handleCrash("sess-001");
      expect(events.length).toBe(1);
    });

    it("onCrash unsubscribe stops events", () => {
      const events: CrashEvent[] = [];
      const unsub = eng.onCrash((e) => events.push(e));
      unsub();
      eng.handleCrash("sess-001");
      expect(events.length).toBe(0);
    });

    it("onRecovery subscription receives events", () => {
      const events: Array<{ success: boolean }> = [];
      eng.onRecovery((_, s) => events.push({ success: s }));
      const crash = eng.handleCrash("sess-001");
      eng.attemptRecovery(crash);
      expect(events.length).toBe(1);
    });

    it("subscriber errors do not block others", () => {
      const events: CrashEvent[] = [];
      eng.onCrash(() => { throw new Error("fail"); });
      eng.onCrash((e) => events.push(e));
      eng.handleCrash("sess-001");
      expect(events.length).toBe(1);
    });
  });

  describe("multi-app coverage", () => {
    const apps: CADAppType[] = ["SolidWorks", "CATIA", "NX", "Creo", "Inventor"];

    it.each(apps)("handles %s sessions", (appType) => {
      eng.registerSession(`sess-${appType}`, appType, 1000);
      const health = eng.checkHealth(`sess-${appType}`);
      expect(health!.appType).toBe(appType);
    });
  });
});
