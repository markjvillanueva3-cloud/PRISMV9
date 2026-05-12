/**
 * WEDMReasoningTraceLedgerEngine tests — MS-P0.5-COORD U-P0.5-COORD-02
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WEDMReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine.js";

describe("WEDMReasoningTraceLedgerEngine", () => {
  let engine: WEDMReasoningTraceLedgerEngine;

  beforeEach(() => {
    engine = new WEDMReasoningTraceLedgerEngine();
    engine.resetForTests();
  });

  describe("validate", () => {
    it("accepts a complete entry", () => {
      const v = engine.validate({
        schemaVersion: 1,
        id: "wrt-1",
        at: "2026-04-17T00:00:00.000Z",
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire"],
        awareness_used: true,
      });
      expect(v.ok).toBe(true);
    });

    it("rejects wrong schemaVersion", () => {
      const v = engine.validate({
        schemaVersion: 2 as any,
        id: "x",
        at: "2026-04-17T00:00:00.000Z",
        dispatcher: "edm",
        action: "a",
        keywords: [],
        awareness_used: false,
      });
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.errors.join(" ")).toContain("schemaVersion");
    });

    it("rejects missing dispatcher", () => {
      const v = engine.validate({
        schemaVersion: 1,
        id: "x",
        at: "2026-04-17T00:00:00.000Z",
        action: "a",
        keywords: [],
        awareness_used: false,
      });
      expect(v.ok).toBe(false);
    });

    it("rejects confidence out of range", () => {
      const v = engine.validate({
        schemaVersion: 1,
        id: "x",
        at: "2026-04-17T00:00:00.000Z",
        dispatcher: "edm",
        action: "a",
        keywords: [],
        awareness_used: false,
        confidence: 1.5,
      });
      expect(v.ok).toBe(false);
    });
  });

  describe("recordTrace", () => {
    it("auto-assigns id, schemaVersion, and timestamp", async () => {
      const r = await engine.recordTrace({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire", "brass"],
        awareness_used: true,
      });
      expect(r.ok).toBe(true);
      expect(r.entry?.id).toMatch(/^wrt-/);
      expect(r.entry?.schemaVersion).toBe(1);
      expect(r.entry?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("appends to in-memory ring", async () => {
      await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      await engine.recordTrace({ dispatcher: "edm", action: "b", keywords: [], awareness_used: true });
      expect(engine.getRecent().length).toBe(2);
    });

    it("produces unique ids across calls", async () => {
      const r1 = await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      const r2 = await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      expect(r1.entry?.id).not.toBe(r2.entry?.id);
    });

    it("honors ring buffer cap (1000)", async () => {
      for (let i = 0; i < 1200; i++) {
        await engine.recordTrace({
          dispatcher: "edm",
          action: `a${i}`,
          keywords: [],
          awareness_used: true,
        });
      }
      expect(engine.getRecent(2000).length).toBeLessThanOrEqual(1000);
    });
  });

  describe("recordTraceSync", () => {
    it("returns synchronously and records in memory", () => {
      const r = engine.recordTraceSync({
        dispatcher: "edm",
        action: "sync_action",
        keywords: ["sync"],
        awareness_used: false,
      });
      expect(r.ok).toBe(true);
      expect(engine.getRecent().length).toBe(1);
    });
  });

  describe("queries", () => {
    beforeEach(async () => {
      await engine.recordTrace({ dispatcher: "edm", action: "wire_set", keywords: ["wire"], awareness_used: true });
      await engine.recordTrace({ dispatcher: "edm", action: "wire_set", keywords: ["wire"], awareness_used: true });
      await engine.recordTrace({ dispatcher: "cam", action: "edm_prog", keywords: ["edm", "brass"], awareness_used: true });
      await engine.recordTrace({ dispatcher: "cad", action: "hole_pattern", keywords: ["hole"], awareness_used: false });
    });

    it("queryByDispatcher filters correctly", () => {
      expect(engine.queryByDispatcher("edm").length).toBe(2);
      expect(engine.queryByDispatcher("cam").length).toBe(1);
      expect(engine.queryByDispatcher("nonexistent").length).toBe(0);
    });

    it("queryByAction filters correctly", () => {
      expect(engine.queryByAction("wire_set").length).toBe(2);
      expect(engine.queryByAction("hole_pattern").length).toBe(1);
    });

    it("queryByKeyword is case-insensitive and substring-matched", () => {
      expect(engine.queryByKeyword("WIRE").length).toBe(2);
      expect(engine.queryByKeyword("brass").length).toBe(1);
      expect(engine.queryByKeyword("edm").length).toBe(1);
    });
  });

  describe("getStats", () => {
    it("returns zero stats on empty ledger", () => {
      const s = engine.getStats();
      expect(s.totalTraces).toBe(0);
      expect(s.errorRate).toBe(0);
      expect(s.awarenessAdoption).toBe(0);
      expect(s.lastTraceAt).toBeNull();
    });

    it("computes topActions and awarenessAdoption", async () => {
      await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      await engine.recordTrace({ dispatcher: "edm", action: "b", keywords: [], awareness_used: false });
      const s = engine.getStats();
      expect(s.totalTraces).toBe(3);
      expect(s.topActions[0]).toEqual({ action: "a", count: 2 });
      expect(s.awarenessAdoption).toBeGreaterThan(60);
      expect(s.awarenessAdoption).toBeLessThan(70);
    });

    it("computes errorRate", async () => {
      await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true, error: "boom" });
      const s = engine.getStats();
      expect(s.errorRate).toBe(50);
    });

    it("reports lastTraceAt and silentMinutes=0 for fresh traces", async () => {
      await engine.recordTrace({ dispatcher: "edm", action: "a", keywords: [], awareness_used: true });
      const s = engine.getStats();
      expect(s.lastTraceAt).not.toBeNull();
      expect(s.silentMinutes).toBe(0);
    });
  });
});
