/**
 * WEDMAutonomyAuditEngine Tests
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-23
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { WEDMAutonomyAuditEngine } from "../engines/WEDMAutonomyAuditEngine.js";

function tempPath(): string {
  return path.join(os.tmpdir(), `WEDM_AUTONOMY_AUDIT_test_${Date.now()}_${Math.random()}.json`);
}

describe("WEDMAutonomyAuditEngine", () => {
  let engine: WEDMAutonomyAuditEngine;

  beforeEach(() => {
    engine = new WEDMAutonomyAuditEngine(tempPath());
    engine.reset();
  });

  describe("record", () => {
    it("returns an entry with id and timestamp", () => {
      const entry = engine.record({
        action: "promote",
        user_id: "u1",
        user_roles: ["supervisor"],
        remote_ip: "127.0.0.1",
        actor: "u1",
        reason: "sustained uptime",
        level_from: 1,
        level_to: 2,
        outcome: "success",
        error: null,
        counter_signed: false,
      });
      expect(entry.id).toMatch(/^autonomy-audit-/);
      expect(entry.at).toBeDefined();
      expect(entry.action).toBe("promote");
    });

    it("assigns monotonic sequence ids", () => {
      const a = engine.record({
        action: "promote", user_id: "u1", user_roles: ["supervisor"], remote_ip: null,
        actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success",
        error: null, counter_signed: false,
      });
      const b = engine.record({
        action: "demote", user_id: "u1", user_roles: ["supervisor"], remote_ip: null,
        actor: null, reason: null, level_from: 1, level_to: 0, outcome: "success",
        error: null, counter_signed: false,
      });
      expect(a.id).not.toBe(b.id);
    });

    it("preserves all input fields", () => {
      const entry = engine.record({
        action: "promote",
        user_id: "user-42",
        user_roles: ["admin", "supervisor"],
        remote_ip: "10.0.0.5",
        actor: "user-42",
        reason: "gate passed",
        level_from: 2,
        level_to: 3,
        outcome: "success",
        error: null,
        counter_signed: true,
      });
      expect(entry.user_id).toBe("user-42");
      expect(entry.user_roles).toEqual(["admin", "supervisor"]);
      expect(entry.counter_signed).toBe(true);
    });
  });

  describe("recent", () => {
    it("returns newest entries first", () => {
      engine.record({ action: "promote", user_id: "a", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success", error: null, counter_signed: false });
      engine.record({ action: "demote", user_id: "b", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 1, level_to: 0, outcome: "success", error: null, counter_signed: false });
      const recent = engine.recent();
      expect(recent).toHaveLength(2);
      expect(recent[0].action).toBe("demote");
      expect(recent[1].action).toBe("promote");
    });

    it("respects limit", () => {
      for (let i = 0; i < 10; i++) {
        engine.record({
          action: "status_read", user_id: `u${i}`, user_roles: [], remote_ip: null,
          actor: null, reason: null, level_from: null, level_to: null, outcome: "success",
          error: null, counter_signed: false,
        });
      }
      expect(engine.recent(5)).toHaveLength(5);
    });

    it("returns empty array when no entries", () => {
      expect(engine.recent()).toEqual([]);
    });
  });

  describe("byAction", () => {
    it("filters by action type", () => {
      engine.record({ action: "promote", user_id: "u1", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success", error: null, counter_signed: false });
      engine.record({ action: "demote", user_id: "u2", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 1, level_to: 0, outcome: "success", error: null, counter_signed: false });
      engine.record({ action: "promote", user_id: "u3", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "denied", error: "no role", counter_signed: false });
      const promotes = engine.byAction("promote");
      expect(promotes).toHaveLength(2);
      expect(promotes.every(e => e.action === "promote")).toBe(true);
    });
  });

  describe("byUser", () => {
    it("filters by user id", () => {
      engine.record({ action: "promote", user_id: "alice", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success", error: null, counter_signed: false });
      engine.record({ action: "demote", user_id: "bob", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 1, level_to: 0, outcome: "success", error: null, counter_signed: false });
      engine.record({ action: "auto_degrade", user_id: "alice", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 1, level_to: 0, outcome: "success", error: null, counter_signed: false });
      const alice = engine.byUser("alice");
      expect(alice).toHaveLength(2);
      expect(alice.every(e => e.user_id === "alice")).toBe(true);
    });
  });

  describe("stats", () => {
    it("counts by action and outcome", () => {
      engine.record({ action: "promote", user_id: "u", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success", error: null, counter_signed: false });
      engine.record({ action: "promote", user_id: "u", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "denied", error: "no role", counter_signed: false });
      engine.record({ action: "demote", user_id: "u", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 1, level_to: 0, outcome: "success", error: null, counter_signed: false });
      const stats = engine.stats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.byAction.promote).toBe(2);
      expect(stats.byAction.demote).toBe(1);
      expect(stats.byOutcome.success).toBe(2);
      expect(stats.byOutcome.denied).toBe(1);
      expect(stats.deniedCount).toBe(1);
    });

    it("returns empty stats for empty log", () => {
      const stats = engine.stats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.deniedCount).toBe(0);
      expect(stats.lastEntryAt).toBeNull();
    });

    it("tracks last entry timestamp", () => {
      engine.record({ action: "status_read", user_id: "u", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: null, level_to: null, outcome: "success", error: null, counter_signed: false });
      const stats = engine.stats();
      expect(stats.lastEntryAt).toBeDefined();
      expect(typeof stats.lastEntryAt).toBe("string");
    });
  });

  describe("persistence", () => {
    it("writes audit file on persist", async () => {
      const p = tempPath();
      const e = new WEDMAutonomyAuditEngine(p);
      e.reset();
      e.record({ action: "promote", user_id: "u", user_roles: ["admin"], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success", error: null, counter_signed: false });
      await e.persist();
      expect(fs.existsSync(p)).toBe(true);
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      expect(data.schemaVersion).toBe(1);
      expect(data.entries).toHaveLength(1);
      fs.unlinkSync(p);
    });

    it("loads existing audit file on first access", async () => {
      const p = tempPath();
      const e1 = new WEDMAutonomyAuditEngine(p);
      e1.reset();
      e1.record({ action: "promote", user_id: "persistent", user_roles: [], remote_ip: null, actor: null, reason: null, level_from: 0, level_to: 1, outcome: "success", error: null, counter_signed: false });
      await e1.persist();

      const e2 = new WEDMAutonomyAuditEngine(p);
      const recent = e2.recent();
      expect(recent).toHaveLength(1);
      expect(recent[0].user_id).toBe("persistent");
      fs.unlinkSync(p);
    });
  });

  describe("denied outcome tracking", () => {
    it("records failed authorization attempts", () => {
      const entry = engine.record({
        action: "promote",
        user_id: "viewer-only",
        user_roles: ["viewer"],
        remote_ip: "192.168.1.100",
        actor: "viewer-only",
        reason: "attempt promote",
        level_from: 1,
        level_to: null,
        outcome: "denied",
        error: "Insufficient role. Required: supervisor or admin",
        counter_signed: false,
      });
      expect(entry.outcome).toBe("denied");
      expect(entry.error).toContain("supervisor or admin");
      expect(entry.level_to).toBeNull();
    });
  });
});
