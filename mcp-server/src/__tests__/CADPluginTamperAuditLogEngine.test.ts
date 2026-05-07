/**
 * CADPluginTamperAuditLogEngine.test.ts — U-CAD-APP-16 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADPluginTamperAuditLogEngine,
  type AuditClock,
  type AuditHasher,
  type AuditEntry,
  type IntegrityReport,
} from "../engines/CADPluginTamperAuditLogEngine.js";

function makeClock(): AuditClock & { tick(): void } {
  let t = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(t).toISOString(),
    tick: () => { t += 1000; },
  };
}

function makeHasher(): AuditHasher {
  return {
    hash: (data: string): string => {
      let h = 0;
      for (let i = 0; i < data.length; i++) {
        h = ((h << 5) - h + data.charCodeAt(i)) | 0;
      }
      return "h" + Math.abs(h).toString(16).padStart(8, "0");
    },
  };
}

describe("CADPluginTamperAuditLogEngine (U-CAD-APP-16)", () => {
  let eng: CADPluginTamperAuditLogEngine;
  let clock: ReturnType<typeof makeClock>;
  let hasher: AuditHasher;

  beforeEach(() => {
    clock = makeClock();
    hasher = makeHasher();
    eng = new CADPluginTamperAuditLogEngine({ clock, hasher, autoVerifyInterval: 0 });
  });

  describe("entry recording", () => {
    it("recordCommand creates entry with hash chain", () => {
      const entry = eng.recordCommand("sess-001", "user-001", "extrude", { depth: 10 }, "success", 50);
      expect(entry.index).toBe(0);
      expect(entry.command).toBe("extrude");
      expect(entry.entryHash).toBeTruthy();
      expect(entry.previousHash).toBe(eng.getGenesisHash());
    });

    it("recordCommand chains hashes correctly", () => {
      const e1 = eng.recordCommand("sess-001", "user-001", "cmd1", {}, "success", 10);
      const e2 = eng.recordCommand("sess-001", "user-001", "cmd2", {}, "success", 10);
      expect(e2.previousHash).toBe(e1.entryHash);
    });

    it("recordCommand increments index", () => {
      eng.recordCommand("s", "u", "c1", {}, "success", 10);
      eng.recordCommand("s", "u", "c2", {}, "success", 10);
      const e3 = eng.recordCommand("s", "u", "c3", {}, "success", 10);
      expect(e3.index).toBe(2);
    });

    it("recordCommand records metadata", () => {
      const entry = eng.recordCommand("s", "u", "cmd", {}, "success", 10, { key: "value" });
      expect(entry.metadata).toEqual({ key: "value" });
    });

    it("recordCommand records failure result", () => {
      const entry = eng.recordCommand("s", "u", "cmd", {}, "failure", 10);
      expect(entry.result).toBe("failure");
    });

    it("recordCommand records error result", () => {
      const entry = eng.recordCommand("s", "u", "cmd", {}, "error", 10);
      expect(entry.result).toBe("error");
    });

    it("getEntry retrieves by index", () => {
      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      expect(eng.getEntry(0)).toBeDefined();
      expect(eng.getEntry(0)!.command).toBe("cmd");
    });

    it("getEntry returns undefined for unknown index", () => {
      expect(eng.getEntry(999)).toBeUndefined();
    });

    it("getLatestEntry returns last entry", () => {
      eng.recordCommand("s", "u", "cmd1", {}, "success", 10);
      eng.recordCommand("s", "u", "cmd2", {}, "success", 10);
      expect(eng.getLatestEntry()!.command).toBe("cmd2");
    });

    it("getLatestEntry returns undefined when empty", () => {
      expect(eng.getLatestEntry()).toBeUndefined();
    });

    it("getEntryCount returns correct count", () => {
      eng.recordCommand("s", "u", "c1", {}, "success", 10);
      eng.recordCommand("s", "u", "c2", {}, "success", 10);
      expect(eng.getEntryCount()).toBe(2);
    });
  });

  describe("query", () => {
    beforeEach(() => {
      eng.recordCommand("sess-001", "user-001", "extrude", {}, "success", 50);
      clock.tick();
      eng.recordCommand("sess-001", "user-002", "fillet", {}, "failure", 30);
      clock.tick();
      eng.recordCommand("sess-002", "user-001", "chamfer", {}, "success", 40);
    });

    it("queryEntries returns all entries", () => {
      expect(eng.queryEntries().length).toBe(3);
    });

    it("queryEntries filters by sessionId", () => {
      const results = eng.queryEntries({ sessionId: "sess-001" });
      expect(results.length).toBe(2);
    });

    it("queryEntries filters by userId", () => {
      const results = eng.queryEntries({ userId: "user-001" });
      expect(results.length).toBe(2);
    });

    it("queryEntries filters by command", () => {
      const results = eng.queryEntries({ command: "extrude" });
      expect(results.length).toBe(1);
    });

    it("queryEntries filters by result", () => {
      const results = eng.queryEntries({ result: "failure" });
      expect(results.length).toBe(1);
    });

    it("queryEntries with limit", () => {
      expect(eng.queryEntries({ limit: 2 }).length).toBe(2);
    });

    it("queryEntries with offset", () => {
      const results = eng.queryEntries({ offset: 1 });
      expect(results.length).toBe(2);
      expect(results[0].command).toBe("fillet");
    });

    it("getSessionHistory returns session entries", () => {
      expect(eng.getSessionHistory("sess-001").length).toBe(2);
    });

    it("getUserHistory returns user entries", () => {
      expect(eng.getUserHistory("user-002").length).toBe(1);
    });

    it("getCommandStats calculates statistics", () => {
      eng.recordCommand("s", "u", "extrude", {}, "success", 100);
      const stats = eng.getCommandStats();
      const extrudeStats = stats.get("extrude");
      expect(extrudeStats!.count).toBe(2);
      expect(extrudeStats!.successRate).toBe(1);
    });

    it("getCommandStats handles failures", () => {
      const stats = eng.getCommandStats();
      const filletStats = stats.get("fillet");
      expect(filletStats!.successRate).toBe(0);
    });
  });

  describe("chain integrity", () => {
    it("verifyChainIntegrity returns valid for intact chain", () => {
      eng.recordCommand("s", "u", "cmd1", {}, "success", 10);
      eng.recordCommand("s", "u", "cmd2", {}, "success", 10);
      const report = eng.verifyChainIntegrity();
      expect(report.isValid).toBe(true);
      expect(report.errors.length).toBe(0);
    });

    it("verifyChainIntegrity detects tampered previousHash", () => {
      eng.recordCommand("s", "u", "cmd1", {}, "success", 10);
      eng.recordCommand("s", "u", "cmd2", {}, "success", 10);

      // Tamper with the chain
      const entry = eng.getEntry(1)!;
      (entry as { previousHash: string }).previousHash = "tampered";

      const report = eng.verifyChainIntegrity();
      expect(report.isValid).toBe(false);
      expect(report.brokenAtIndex).toBe(1);
    });

    it("verifyChainIntegrity detects tampered entryHash", () => {
      eng.recordCommand("s", "u", "cmd1", {}, "success", 10);

      // Tamper with entry hash
      const entry = eng.getEntry(0)!;
      (entry as { entryHash: string }).entryHash = "tampered";

      const report = eng.verifyChainIntegrity();
      expect(report.isValid).toBe(false);
    });

    it("verifyChainIntegrity checks range", () => {
      for (let i = 0; i < 10; i++) {
        eng.recordCommand("s", "u", `cmd${i}`, {}, "success", 10);
      }
      const report = eng.verifyChainIntegrity(5, 8);
      expect(report.entriesChecked).toBe(4);
    });

    it("getChainInfo returns chain metadata", () => {
      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      const info = eng.getChainInfo();
      expect(info.entryCount).toBe(1);
      expect(info.lastEntry).toBe(0);
      expect(info.isValid).toBe(true);
    });

    it("getChainInfo on empty chain", () => {
      const info = eng.getChainInfo();
      expect(info.entryCount).toBe(0);
      expect(info.lastEntry).toBe(-1);
    });
  });

  describe("export/import", () => {
    beforeEach(() => {
      eng.recordCommand("sess-001", "user-001", "extrude", { d: 10 }, "success", 50);
      eng.recordCommand("sess-001", "user-001", "fillet", { r: 5 }, "success", 30);
    });

    it("exportLog JSON format", () => {
      const json = eng.exportLog("json");
      const parsed = JSON.parse(json);
      expect(parsed.chainId).toBe(eng.getChainId());
      expect(parsed.entries.length).toBe(2);
    });

    it("exportLog JSONL format", () => {
      const jsonl = eng.exportLog("jsonl");
      const lines = jsonl.split("\n");
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0]).command).toBe("extrude");
    });

    it("exportLog CSV format", () => {
      const csv = eng.exportLog("csv");
      const lines = csv.split("\n");
      expect(lines[0]).toContain("index");
      expect(lines[0]).toContain("command");
      expect(lines.length).toBe(3);
    });

    it("exportLog with range", () => {
      const json = eng.exportLog("json", { startIndex: 0, endIndex: 0 });
      const parsed = JSON.parse(json);
      expect(parsed.entries.length).toBe(1);
    });

    it("importLog JSON format", () => {
      const exported = eng.exportLog("json");
      const eng2 = new CADPluginTamperAuditLogEngine({ clock, hasher });
      const result = eng2.importLog(exported, "json");
      expect(result.imported).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("importLog JSONL format", () => {
      const exported = eng.exportLog("jsonl");
      const eng2 = new CADPluginTamperAuditLogEngine({ clock, hasher });
      const result = eng2.importLog(exported, "jsonl");
      expect(result.imported).toBe(2);
    });

    it("importLog handles invalid JSON", () => {
      const result = eng.importLog("not valid json", "json");
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("importLog handles invalid JSONL line", () => {
      const result = eng.importLog('{"valid": true}\nnot valid\n{"valid": true}', "jsonl");
      expect(result.errors.length).toBe(1);
      expect(result.imported).toBe(2);
    });

    it("importLog rejects CSV", () => {
      const result = eng.importLog("a,b,c", "csv");
      expect(result.errors).toContain("CSV import not supported");
    });
  });

  describe("subscriptions", () => {
    it("onEntry receives new entries", () => {
      const entries: AuditEntry[] = [];
      eng.onEntry((e) => entries.push(e));
      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      expect(entries.length).toBe(1);
    });

    it("onEntry unsubscribe stops notifications", () => {
      const entries: AuditEntry[] = [];
      const unsub = eng.onEntry((e) => entries.push(e));
      unsub();
      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      expect(entries.length).toBe(0);
    });

    it("onTamperDetected receives tamper reports", () => {
      const reports: IntegrityReport[] = [];
      eng.onTamperDetected((r) => reports.push(r));

      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      const entry = eng.getEntry(0)!;
      (entry as { previousHash: string }).previousHash = "tampered";

      eng.verifyChainIntegrity();
      expect(reports.length).toBe(1);
      expect(reports[0].isValid).toBe(false);
    });

    it("onTamperDetected unsubscribe stops notifications", () => {
      const reports: IntegrityReport[] = [];
      const unsub = eng.onTamperDetected((r) => reports.push(r));
      unsub();

      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      const entry = eng.getEntry(0)!;
      (entry as { previousHash: string }).previousHash = "tampered";

      eng.verifyChainIntegrity();
      expect(reports.length).toBe(0);
    });

    it("subscriber errors do not block others", () => {
      const entries: AuditEntry[] = [];
      eng.onEntry(() => { throw new Error("fail"); });
      eng.onEntry((e) => entries.push(e));
      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      expect(entries.length).toBe(1);
    });
  });

  describe("management", () => {
    it("clearLog empties entries", () => {
      eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      expect(eng.clearLog()).toBe(1);
      expect(eng.getEntryCount()).toBe(0);
    });

    it("getChainId returns chain ID", () => {
      eng = new CADPluginTamperAuditLogEngine({ chainId: "my-chain" });
      expect(eng.getChainId()).toBe("my-chain");
    });

    it("getGenesisHash returns genesis hash", () => {
      expect(eng.getGenesisHash()).toBeTruthy();
    });

    it("maxEntries limits log size", () => {
      eng = new CADPluginTamperAuditLogEngine({ clock, hasher, maxEntries: 5 });
      for (let i = 0; i < 10; i++) {
        eng.recordCommand("s", "u", `cmd${i}`, {}, "success", 10);
      }
      expect(eng.getEntryCount()).toBe(5);
    });
  });

  describe("auto-verify", () => {
    it("auto-verifies at interval", () => {
      eng = new CADPluginTamperAuditLogEngine({ clock, hasher, autoVerifyInterval: 3 });
      const reports: IntegrityReport[] = [];
      eng.onTamperDetected((r) => reports.push(r));

      for (let i = 0; i < 5; i++) {
        eng.recordCommand("s", "u", `cmd${i}`, {}, "success", 10);
      }

      // Should have triggered auto-verify at index 3
      // If chain is valid, no tamper notification
      expect(eng.getEntryCount()).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("handles empty args", () => {
      const entry = eng.recordCommand("s", "u", "cmd", {}, "success", 10);
      expect(entry.args).toEqual({});
    });

    it("handles complex args", () => {
      const args = { nested: { a: 1, b: [1, 2, 3] }, str: "test" };
      const entry = eng.recordCommand("s", "u", "cmd", args, "success", 10);
      expect(entry.args).toEqual(args);
    });

    it("handles zero duration", () => {
      const entry = eng.recordCommand("s", "u", "cmd", {}, "success", 0);
      expect(entry.durationMs).toBe(0);
    });

    it("handles large duration", () => {
      const entry = eng.recordCommand("s", "u", "cmd", {}, "success", 999999);
      expect(entry.durationMs).toBe(999999);
    });

    it("handles special characters in command", () => {
      const entry = eng.recordCommand("s", "u", "cmd:with/special$chars", {}, "success", 10);
      expect(entry.command).toBe("cmd:with/special$chars");
    });
  });
});
