/**
 * ToolDatabaseBridgeEngine Tests — Phase 0.23 U-UTL10
 */

import { describe, it, expect, beforeEach } from "vitest";
import { toolDatabaseBridgeEngine } from "../engines/ToolDatabaseBridgeEngine.js";

describe("ToolDatabaseBridgeEngine", () => {
  beforeEach(() => {
    toolDatabaseBridgeEngine.reset();
  });

  it("initializes with seeded tools", async () => {
    const stats = await toolDatabaseBridgeEngine.getStats();
    expect(stats.totalTools).toBeGreaterThan(0);
  });

  it("queries tools by type", async () => {
    const tools = await toolDatabaseBridgeEngine.query({ type: "endmill" });
    expect(tools.every(t => t.type === "endmill")).toBe(true);
  });

  it("queries tools by manufacturer", async () => {
    const tools = await toolDatabaseBridgeEngine.query({ manufacturer: "Sandvik" });
    expect(tools.every(t => t.manufacturer === "Sandvik")).toBe(true);
  });

  it("queries tools by diameter range", async () => {
    const tools = await toolDatabaseBridgeEngine.query({ minDiameter: 5, maxDiameter: 20 });
    expect(tools.every(t => t.diameter >= 5 && t.diameter <= 20)).toBe(true);
  });

  it("gets tool by id", async () => {
    const tools = await toolDatabaseBridgeEngine.query({ limit: 1 });
    if (tools.length > 0) {
      const tool = await toolDatabaseBridgeEngine.getTool(tools[0].id);
      expect(tool).not.toBeNull();
    }
  });

  it("returns null for unknown tool id", async () => {
    const tool = await toolDatabaseBridgeEngine.getTool("nonexistent");
    expect(tool).toBeNull();
  });

  it("gets tools by manufacturer", async () => {
    const tools = await toolDatabaseBridgeEngine.getByManufacturer("Kennametal");
    expect(tools.every(t => t.manufacturer === "Kennametal")).toBe(true);
  });

  it("respects query limit", async () => {
    const tools = await toolDatabaseBridgeEngine.query({ limit: 5 });
    expect(tools.length).toBeLessThanOrEqual(5);
  });

  it("stats include type breakdown", async () => {
    const stats = await toolDatabaseBridgeEngine.getStats();
    expect(stats.byType).toBeDefined();
  });

  it("stats include manufacturer breakdown", async () => {
    const stats = await toolDatabaseBridgeEngine.getStats();
    expect(stats.byManufacturer).toBeDefined();
  });

  it("stats include coating breakdown", async () => {
    const stats = await toolDatabaseBridgeEngine.getStats();
    expect(stats.byCoating).toBeDefined();
  });

  it("reset clears state", async () => {
    await toolDatabaseBridgeEngine.getStats();
    toolDatabaseBridgeEngine.reset();
    const stats = await toolDatabaseBridgeEngine.getStats();
    expect(stats.totalTools).toBeGreaterThan(0);
  });
});
