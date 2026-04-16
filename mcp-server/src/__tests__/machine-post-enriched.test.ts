/**
 * Machine POST Database Enrichment — Validation Tests
 * Verifies 827 inferred POST/controller entries are well-formed
 */
import { describe, it, expect } from "vitest";
import { POST_DB_ENRICHED } from "../data/machine-post-enriched.js";

describe("Machine POST Enriched", () => {
  it("has 800+ entries", () => {
    expect(POST_DB_ENRICHED.length).toBeGreaterThan(800);
  });

  it("every entry has required fields", () => {
    for (const entry of POST_DB_ENRICHED) {
      expect(entry.brand).toBeTruthy();
      expect(entry.model).toBeTruthy();
      expect(entry.type).toBeTruthy();
      expect(entry.controller).toBeTruthy();
    }
  });

  it("every entry has linear axes", () => {
    for (const entry of POST_DB_ENRICHED) {
      expect(entry.linear_axes!.length).toBeGreaterThanOrEqual(2);
      for (const axis of entry.linear_axes!) {
        expect(axis.travel_mm).toBeGreaterThanOrEqual(0);
        expect(axis.rapid_m_min).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("most entries have nonzero spindle specs", () => {
    const withSpindle = POST_DB_ENRICHED.filter(e => e.spindle!.max_rpm > 0);
    expect(withSpindle.length).toBeGreaterThan(POST_DB_ENRICHED.length * 0.9);
  });

  it("most entries have nonzero tool changer", () => {
    const withTC = POST_DB_ENRICHED.filter(e => e.tool_changer!.capacity > 0);
    expect(withTC.length).toBeGreaterThan(POST_DB_ENRICHED.length * 0.9);
  });

  it("controller references known family", () => {
    const families = ["Fanuc", "Siemens", "Heidenhain", "Mazak", "Haas", "Okuma", "Hurco", "Mitsubishi", "Brother", "Fidia", "Sodick", "DATRON"];
    for (const entry of POST_DB_ENRICHED) {
      const hasFamily = families.some(f => entry.controller!.includes(f));
      expect(hasFamily).toBe(true);
    }
  });

  it("lathes have Z and X axes", () => {
    const lathes = POST_DB_ENRICHED.filter(e => e.type!.toLowerCase().includes("lathe"));
    expect(lathes.length).toBeGreaterThan(50);
    for (const lathe of lathes) {
      const axisNames = lathe.linear_axes!.map(a => a.name);
      expect(axisNames).toContain("Z");
      expect(axisNames).toContain("X");
    }
  });

  it("VMCs have X, Y, Z axes", () => {
    const vmcs = POST_DB_ENRICHED.filter(e => e.type!.toLowerCase() === "vmc");
    expect(vmcs.length).toBeGreaterThan(100);
    for (const vmc of vmcs) {
      expect(vmc.linear_axes!.length).toBe(3);
    }
  });

  it("no duplicate models", () => {
    const models = POST_DB_ENRICHED.map(e => e.model);
    const unique = new Set(models);
    expect(unique.size).toBe(models.length);
  });
});
