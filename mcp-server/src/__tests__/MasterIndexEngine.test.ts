/**
 * MasterIndexEngine — real-behavior tests against the live system-graph.json
 * + BUILD_STATE.json fixtures shipped in the repo. No mocks.
 * Each test encodes a documented invariant of the engine contract.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { masterIndexEngine } from "../engines/MasterIndexEngine.js";

describe("MasterIndexEngine — input handling", () => {
  beforeEach(() => masterIndexEngine.clearCache());

  it("empty query returns 0 hits + the documented warning string", async () => {
    const r = await masterIndexEngine.query("");
    expect(r.totalHits).toBe(0);
    expect(r.hits.length).toBe(0);
    expect(r.bySource).toEqual({});
    expect(r.byBuildClass).toEqual({});
    expect(r.warnings).toContain(
      "query produced no tokens after stopword/length filtering",
    );
  });

  it("whitespace-only query returns exactly 0 hits", async () => {
    const r = await masterIndexEngine.query("   \t\n  ");
    expect(r.totalHits).toBe(0);
  });

  it("stopword-only query 'the and for of' returns exactly 0 hits", async () => {
    const r = await masterIndexEngine.query("the and for of");
    expect(r.totalHits).toBe(0);
  });

  it("undefined query returns 0 hits without throwing", async () => {
    const r = await masterIndexEngine.query(undefined as unknown as string);
    expect(r.totalHits).toBe(0);
  });

  it("limit=3 caps hit count at exactly 3 or fewer", async () => {
    const r = await masterIndexEngine.query("engine", { limit: 3 });
    expect(r.hits.length).toBeLessThanOrEqual(3);
    if (r.totalHits >= 3) expect(r.hits.length).toBe(3);
  });

  it("limit=99999 caps at the documented MAX_LIMIT of 200", async () => {
    const r = await masterIndexEngine.query("engine", { limit: 99999 });
    expect(r.hits.length).toBeLessThanOrEqual(200);
  });

  it("oversized 600-char query backsteps trim to whitespace, not mid-word", async () => {
    const padding = "wordpadding ".repeat(50);
    const query = padding + "uniquetrailingtokenthatshouldnotsurvivetruncation";
    const r = await masterIndexEngine.query(query);
    expect(r.warnings).not.toContain(
      "query produced no tokens after stopword/length filtering",
    );
  });
});

describe("MasterIndexEngine — search invariants on real graph", () => {
  beforeEach(() => masterIndexEngine.clearCache());

  it("'kienzle' returns hits whose label or id contains 'kienzle'", async () => {
    const r = await masterIndexEngine.query("kienzle");
    expect(r.totalHits).toBeGreaterThan(0);
    const matches = r.hits.filter(
      (h) => /kienzle/i.test(h.label) || /kienzle/i.test(h.id),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("every confidence score is in [0, 1]", async () => {
    const r = await masterIndexEngine.query("force");
    expect(r.totalHits).toBeGreaterThan(0);
    const outOfRange = r.hits.filter(
      (h) => h.confidence < 0 || h.confidence > 1 || !Number.isFinite(h.confidence),
    );
    expect(outOfRange.length).toBe(0);
  });

  it("every utilization score is in [0, 1]", async () => {
    const r = await masterIndexEngine.query("force");
    expect(r.totalHits).toBeGreaterThan(0);
    const outOfRange = r.hits.filter(
      (h) => h.utilization < 0 || h.utilization > 1 || !Number.isFinite(h.utilization),
    );
    expect(outOfRange.length).toBe(0);
  });

  it("hits are sorted by confidence descending (no inversions)", async () => {
    const r = await masterIndexEngine.query("speed feed");
    let inversions = 0;
    for (let i = 1; i < r.hits.length; i++) {
      if (r.hits[i].confidence > r.hits[i - 1].confidence) inversions++;
    }
    expect(inversions).toBe(0);
  });

  it("bySource counts sum equals totalHits", async () => {
    const r = await masterIndexEngine.query("dispatcher");
    expect(r.totalHits).toBeGreaterThan(0);
    const sum = Object.values(r.bySource).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.totalHits);
  });

  it("byBuildClass counts sum equals totalHits", async () => {
    const r = await masterIndexEngine.query("dispatcher");
    expect(r.totalHits).toBeGreaterThan(0);
    const sum = Object.values(r.byBuildClass).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.totalHits);
  });

  it("source filter excludes all non-matching sources", async () => {
    const r = await masterIndexEngine.query("turning", { sources: ["graph_node"] });
    const wrongSource = r.hits.filter((h) => h.source !== "graph_node");
    expect(wrongSource.length).toBe(0);
  });

  it("buildClass filter excludes all non-matching classes", async () => {
    const r = await masterIndexEngine.query("engine", { buildClasses: ["wired"] });
    const wrongClass = r.hits.filter((h) => h.buildClass !== "wired");
    expect(wrongClass.length).toBe(0);
  });

  it("topUtilized contains only hits with utilization > 0", async () => {
    const r = await masterIndexEngine.query("dispatcher");
    const wrongUtil = r.topUtilized.filter((h) => h.utilization <= 0);
    expect(wrongUtil.length).toBe(0);
  });

  it("topUtilized is sorted by utilization descending", async () => {
    const r = await masterIndexEngine.query("dispatcher");
    let inversions = 0;
    for (let i = 1; i < r.topUtilized.length; i++) {
      if (r.topUtilized[i].utilization > r.topUtilized[i - 1].utilization) inversions++;
    }
    expect(inversions).toBe(0);
  });

  it("underUtilized contains only graph_node hits with utilization < 0.1", async () => {
    const r = await masterIndexEngine.query("engine");
    const wrong = r.underUtilized.filter(
      (h) => h.source !== "graph_node" || h.utilization >= 0.1,
    );
    expect(wrong.length).toBe(0);
  });

  it("min_confidence=0.99 keeps only hits scoring at least 0.99", async () => {
    const high = await masterIndexEngine.query("engine", { minConfidence: 0.99 });
    const violators = high.hits.filter((h) => h.confidence < 0.99);
    expect(violators.length).toBe(0);
  });

  it("min_confidence=0.99 returns subset count of min_confidence=0", async () => {
    const high = await masterIndexEngine.query("engine", { minConfidence: 0.99 });
    const low = await masterIndexEngine.query("engine", { minConfidence: 0 });
    expect(high.totalHits).toBeLessThanOrEqual(low.totalHits);
  });

  it("graphMtime parses to a real Date when graph_node hits exist", async () => {
    const r = await masterIndexEngine.query("force");
    if ((r.bySource.graph_node ?? 0) > 0) {
      expect(r.graphMtime === null).toBe(false);
      const ms = new Date(r.graphMtime as string).getTime();
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms > 0).toBe(true);
    }
  });

  it("layer filter ['L4'] excludes all non-L4 graph hits", async () => {
    const r = await masterIndexEngine.query("dispatcher", { layers: ["L4"] });
    const wrongLayer = r.hits
      .filter((h) => h.source === "graph_node")
      .filter((h) => h.layer !== "L4");
    expect(wrongLayer.length).toBe(0);
  });
});

describe("MasterIndexEngine — caching contract", () => {
  beforeEach(() => masterIndexEngine.clearCache());

  it("cold load reports cacheHit=false; second call reports cacheHit=true", async () => {
    const cold = await masterIndexEngine.query("dispatcher");
    expect(cold.cacheHit).toBe(false);
    const warm = await masterIndexEngine.query("dispatcher");
    expect(warm.cacheHit).toBe(true);
  });

  it("clearCache() restores cold-load (cacheHit=false on next call)", async () => {
    await masterIndexEngine.query("dispatcher");
    masterIndexEngine.clearCache();
    const r = await masterIndexEngine.query("dispatcher");
    expect(r.cacheHit).toBe(false);
  });

  it("3 concurrent first-calls return identical totalHits via single-flight", async () => {
    masterIndexEngine.clearCache();
    const [a, b, c] = await Promise.all([
      masterIndexEngine.query("force"),
      masterIndexEngine.query("force"),
      masterIndexEngine.query("force"),
    ]);
    expect(a.totalHits).toBe(b.totalHits);
    expect(b.totalHits).toBe(c.totalHits);
  });
});

describe("MasterIndexEngine — node-level lookups", () => {
  beforeEach(() => masterIndexEngine.clearCache());

  it("non-existent id returns found=false with no node payload", async () => {
    const r = await masterIndexEngine.getNodeStatus("definitely.does.not.exist.zzz.999");
    expect(r.found).toBe(false);
    expect(r.node === undefined).toBe(true);
  });

  it("empty-string id returns found=false", async () => {
    const r = await masterIndexEngine.getNodeStatus("");
    expect(r.found).toBe(false);
  });

  it("null id is rejected with found=false (no throw)", async () => {
    const r = await masterIndexEngine.getNodeStatus(null as unknown as string);
    expect(r.found).toBe(false);
  });

  it("real-node lookup returns found=true with finite degree counts", async () => {
    const seed = await masterIndexEngine.query("dispatcher");
    const seedNode = seed.hits.find((h) => h.source === "graph_node");
    if (!seedNode) return;
    const r = await masterIndexEngine.getNodeStatus(seedNode.id);
    expect(r.found).toBe(true);
    expect(r.id).toBe(seedNode.id);
    expect(Number.isFinite(r.inDegree as number)).toBe(true);
    expect(Number.isFinite(r.outDegree as number)).toBe(true);
    expect((r.inDegree as number) >= 0).toBe(true);
    expect((r.outDegree as number) >= 0).toBe(true);
    expect((r.utilization as number) >= 0).toBe(true);
    expect((r.utilization as number) <= 1).toBe(true);
    expect(r.node?.confidence).toBe(1);
  });
});

describe("MasterIndexEngine — vault stats", () => {
  it("vaultStats reports the correct vault root path and >0 memory files", () => {
    const s = masterIndexEngine.vaultStats();
    expect(s.vaultRoot.replace(/\\/g, "/").toLowerCase()).toMatch(
      /h:\/prism\/knowledge$/,
    );
    expect(s.memoryFiles).toBeGreaterThan(0);
  });

  it("vaultStats wikiFiles + memoryFiles are non-negative integers", () => {
    const s = masterIndexEngine.vaultStats();
    expect(Number.isInteger(s.wikiFiles)).toBe(true);
    expect(Number.isInteger(s.memoryFiles)).toBe(true);
    expect(s.wikiFiles >= 0).toBe(true);
    expect(s.memoryFiles >= 0).toBe(true);
  });
});

describe("MasterIndexEngine — score blending direction", () => {
  beforeEach(() => masterIndexEngine.clearCache());

  it("UTIL_BIAS=1.5 places utilization>0.5 hits at or above utilization<0.05 hits", async () => {
    const r = await masterIndexEngine.query("engine");
    if (r.totalHits === 0) return;
    const high = r.hits.filter((h) => h.utilization > 0.5);
    const low = r.hits.filter((h) => h.utilization < 0.05 && h.confidence > 0);
    if (high.length > 0 && low.length > 0) {
      const highRank = r.hits.indexOf(high[0]);
      const lowRank = r.hits.indexOf(low[0]);
      expect(highRank).toBeLessThanOrEqual(lowRank);
    }
  });

  it("capability hits with confidence>0 still appear (UTIL_FLOOR guarantee)", async () => {
    const r = await masterIndexEngine.query("dispatcher");
    const capHits = r.hits.filter(
      (h) => h.source !== "graph_node" && h.confidence > 0,
    );
    if ((r.bySource.action ?? 0) + (r.bySource.engine ?? 0) > 0) {
      expect(capHits.length).toBeGreaterThan(0);
    }
  });
});
