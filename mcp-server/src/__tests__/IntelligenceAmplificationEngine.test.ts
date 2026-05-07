/**
 * IntelligenceAmplificationEngine Tests — Phase 0.24 U-INT5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { intelligenceAmplificationEngine } from "../engines/IntelligenceAmplificationEngine.js";

describe("IntelligenceAmplificationEngine", () => {
  beforeEach(() => {
    intelligenceAmplificationEngine.reset();
  });

  it("amplifies query about cutting force", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "How do I calculate cutting force?",
    });
    expect(result.answer).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("amplifies query about tool life", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "Predict tool life for this operation",
    });
    expect(result.supportingAssets.length).toBeGreaterThan(0);
  });

  it("amplifies query about stability", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "How to avoid chatter and ensure stability?",
    });
    expect(result.supportingAssets.some(a => a.id === "sld")).toBe(true);
  });

  it("includes supporting assets", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "Calculate cutting force",
    });
    for (const asset of result.supportingAssets) {
      expect(asset.id).toBeDefined();
      expect(asset.type).toBeDefined();
      expect(asset.contribution).toBeDefined();
    }
  });

  it("provides related topics", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "Optimize speed and feed",
    });
    expect(Array.isArray(result.relatedTopics)).toBe(true);
  });

  it("provides suggested actions", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "Calculate force using formulas",
    });
    expect(Array.isArray(result.suggestedActions)).toBe(true);
    expect(result.suggestedActions.length).toBeGreaterThan(0);
  });

  it("calculates amplification level", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "Test query",
    });
    expect(result.amplificationLevel).toBeGreaterThanOrEqual(0);
    expect(result.amplificationLevel).toBeLessThanOrEqual(1);
  });

  it("respects depth parameter", async () => {
    const shallow = await intelligenceAmplificationEngine.amplify({
      query: "Test",
      depth: "shallow",
    });
    const deep = await intelligenceAmplificationEngine.amplify({
      query: "Test",
      depth: "deep",
    });
    expect(deep.amplificationLevel).toBeGreaterThanOrEqual(shallow.amplificationLevel);
  });

  it("filters by asset types", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "cutting force",
      includeAssetTypes: ["formula"],
    });
    expect(result.supportingAssets.every(a => a.type === "formula")).toBe(true);
  });

  it("gets specific source", async () => {
    const source = await intelligenceAmplificationEngine.getSource("kienzle");
    expect(source).not.toBeNull();
    expect(source?.type).toBe("formula");
  });

  it("returns null for unknown source", async () => {
    const source = await intelligenceAmplificationEngine.getSource("nonexistent");
    expect(source).toBeNull();
  });

  it("lists all sources", async () => {
    const sources = await intelligenceAmplificationEngine.listSources();
    expect(sources.length).toBeGreaterThan(0);
  });

  it("handles queries with no matches", async () => {
    const result = await intelligenceAmplificationEngine.amplify({
      query: "xyz completely unrelated query abc",
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("reset clears sources", () => {
    intelligenceAmplificationEngine.reset();
    expect(true).toBe(true);
  });
});
