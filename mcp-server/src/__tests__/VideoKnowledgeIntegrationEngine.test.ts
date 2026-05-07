/**
 * VideoKnowledgeIntegrationEngine Tests — Phase 0.23 U-UTL4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { videoKnowledgeIntegrationEngine } from "../engines/VideoKnowledgeIntegrationEngine.js";

describe("VideoKnowledgeIntegrationEngine", () => {
  beforeEach(() => {
    videoKnowledgeIntegrationEngine.reset();
  });

  it("initializes with seeded videos", async () => {
    const stats = await videoKnowledgeIntegrationEngine.getStats();
    expect(stats.totalVideos).toBeGreaterThan(0);
  });

  it("queries videos by source", async () => {
    const videos = await videoKnowledgeIntegrationEngine.query({
      source: "Titans",
    });
    expect(videos.every(v => v.source.includes("Titans"))).toBe(true);
  });

  it("queries videos by topic", async () => {
    const videos = await videoKnowledgeIntegrationEngine.query({
      topic: "setup",
    });
    expect(videos.every(v => v.topics.some(t => t.includes("setup")))).toBe(true);
  });

  it("gets tips for topic", async () => {
    const tips = await videoKnowledgeIntegrationEngine.getTips("safety");
    expect(Array.isArray(tips)).toBe(true);
  });

  it("gets tips for all topics when none specified", async () => {
    const tips = await videoKnowledgeIntegrationEngine.getTips();
    expect(Array.isArray(tips)).toBe(true);
    expect(tips.length).toBeGreaterThan(0);
  });

  it("gets procedures for topic", async () => {
    const procedures = await videoKnowledgeIntegrationEngine.getProcedures("setup");
    expect(Array.isArray(procedures)).toBe(true);
  });

  it("gets procedures for all topics when none specified", async () => {
    const procedures = await videoKnowledgeIntegrationEngine.getProcedures();
    expect(Array.isArray(procedures)).toBe(true);
    expect(procedures.length).toBeGreaterThan(0);
  });

  it("respects query limit", async () => {
    const videos = await videoKnowledgeIntegrationEngine.query({ limit: 5 });
    expect(videos.length).toBeLessThanOrEqual(5);
  });

  it("stats include source breakdown", async () => {
    const stats = await videoKnowledgeIntegrationEngine.getStats();
    expect(stats.bySource).toBeDefined();
    expect(typeof stats.bySource).toBe("object");
  });

  it("stats include topic breakdown", async () => {
    const stats = await videoKnowledgeIntegrationEngine.getStats();
    expect(stats.byTopic).toBeDefined();
  });

  it("stats include procedure count", async () => {
    const stats = await videoKnowledgeIntegrationEngine.getStats();
    expect(typeof stats.totalProcedures).toBe("number");
  });

  it("stats include tips count", async () => {
    const stats = await videoKnowledgeIntegrationEngine.getStats();
    expect(typeof stats.totalTips).toBe("number");
  });

  it("reset clears state", async () => {
    await videoKnowledgeIntegrationEngine.getStats();
    videoKnowledgeIntegrationEngine.reset();
    const stats = await videoKnowledgeIntegrationEngine.getStats();
    expect(stats.totalVideos).toBeGreaterThan(0);
  });
});
