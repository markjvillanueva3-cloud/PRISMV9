/**
 * knowledgeDispatcher — JM Die post-processor learning wiring round-trip
 * =====================================================================
 *
 * FEATURE-GAP-AUDIT-MS0 / U-GAP-POST-JMDIE-LEARNING
 *
 * Verifies JMDiePostProcessorLearningEngine is reachable through prism_knowledge
 * for all 5 wired actions:
 *   jmdie_post_learn · jmdie_post_corpus · jmdie_post_query ·
 *   jmdie_post_catalog · jmdie_post_stats
 *
 * Each test seeds a deterministic 2-file temp .cps corpus so assertions hold
 * regardless of whether the real H: JM Die corpus is reachable.
 *
 * @milestone FEATURE-GAP-AUDIT-MS0
 * @unit U-GAP-POST-JMDIE-LEARNING
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";
import { JMDiePostProcessorLearningEngine } from "../engines/JMDiePostProcessorLearningEngine.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult {
  ok: boolean;
  data: Record<string, unknown>;
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (
    raw &&
    typeof raw === "object" &&
    "success" in raw &&
    (raw as { success: boolean }).success === false
  ) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

const HURCO_CPS =
  'description = "PRISM Hurco";\nvendor = "PRISM";\ncapabilities = CAPABILITY_MILLING;\n' +
  "// iMachining variable feed, chip thinning, G05.3 smoothing, rigid tapping\n" +
  "properties = { programNumber: { value: 1 }, useM140: { value: true } };";
const HAAS_CPS =
  'description = "Haas Ai-Enhanced";\ncapabilities = CAPABILITY_MILLING;\n' +
  "// iMachining adaptive feed\nproperties = { p1: { value: 1 } };";

let server: MockMCPServer;
let tmp: string;

beforeEach(() => {
  JMDiePostProcessorLearningEngine.reset();
  server = new MockMCPServer();
  registerKnowledgeDispatcher(
    server as unknown as Parameters<typeof registerKnowledgeDispatcher>[0],
  );
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jmdie-disp-"));
  fs.writeFileSync(path.join(tmp, "HURCO_A.cps"), HURCO_CPS, "utf8");
  fs.writeFileSync(path.join(tmp, "HAAS_B.cps"), HAAS_CPS, "utf8");
});

describe("U-GAP-POST-JMDIE-LEARNING / jmdie_post_learn", () => {
  it("learns a 2-file injected corpus through the dispatcher", async () => {
    const r = await call(server, "jmdie_post_learn", { sourceDir: tmp });
    expect(r.ok).toBe(true);
    expect(r.data.profileCount).toBe(2);
    expect(r.data.schemaVersion).toBe("1.0.0");
    expect(r.data.sourceDir).toBe(tmp);
    expect(Array.isArray(r.data.profiles)).toBe(true);
  });

  it("returns a fail-soft warning corpus for a missing sourceDir", async () => {
    const missing = path.join(os.tmpdir(), "jmdie-disp-missing-" + Date.now());
    const r = await call(server, "jmdie_post_learn", { sourceDir: missing });
    expect(r.ok).toBe(true);
    expect(r.data.profileCount).toBe(0);
    expect(String(r.data.warning)).toMatch(/directory not found/i);
  });
});

describe("U-GAP-POST-JMDIE-LEARNING / jmdie_post_corpus", () => {
  it("returns the corpus learned in the prior dispatcher call", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_corpus");
    expect(r.ok).toBe(true);
    expect(r.data.profileCount).toBe(2);
    expect(r.data.schemaVersion).toBe("1.0.0");
  });
});

describe("U-GAP-POST-JMDIE-LEARNING / jmdie_post_query", () => {
  it("filters profiles by controller family", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_query", { family: "hurco" });
    expect(r.ok).toBe(true);
    expect(r.data.family).toBe("hurco");
    const profiles = r.data.profiles as Array<{ controllerFamily: string; file: string }>;
    expect(profiles).toHaveLength(1);
    expect(profiles[0].file).toBe("HURCO_A.cps");
    expect(profiles[0].controllerFamily).toBe("hurco");
  });

  it("returns an empty profile list for an invalid family", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_query", { family: "not-a-family" });
    expect(r.ok).toBe(true);
    expect(r.data.family).toBe("not-a-family"); // action ran, reached jmdie_post_query
    // A correct empty result is dropped by the dispatcher's slimResponse(); a
    // buggy non-empty result would survive as an array on the envelope. The
    // strict toBe(undefined) fails loudly when profiles are wrongly emitted.
    expect(r.data.profiles).toBe(undefined);
  });

  it("propagates the corpus warning when the query runs against an unreachable corpus", async () => {
    const missing = path.join(os.tmpdir(), "jmdie-disp-q-missing-" + Date.now());
    await call(server, "jmdie_post_learn", { sourceDir: missing });
    const r = await call(server, "jmdie_post_query", { family: "hurco" });
    expect(r.ok).toBe(true);
    expect(r.data.family).toBe("hurco");
    expect(String(r.data.warning)).toMatch(/directory not found/i);
  });
});

describe("U-GAP-POST-JMDIE-LEARNING / jmdie_post_catalog", () => {
  it("returns the enhancement catalog with imachining present in both posts", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_catalog");
    expect(r.ok).toBe(true);
    const catalog = r.data.catalog as Array<{ enhancement: string; count: number }>;
    expect(Array.isArray(catalog)).toBe(true);
    const imach = catalog.find((c) => c.enhancement === "imachining_variable_feed");
    expect(imach?.count).toBe(2);
  });
});

describe("U-GAP-POST-JMDIE-LEARNING / jmdie_post_stats", () => {
  it("returns corpus statistics", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_stats");
    expect(r.ok).toBe(true);
    expect(r.data.profileCount).toBe(2);
    const families = r.data.families as Record<string, number>;
    expect(families.hurco).toBe(1);
    expect(families.haas).toBe(1);
    expect(r.data.distinctEnhancements as number).toBeGreaterThanOrEqual(1);
  });
});

describe("U-GAP-POST-JMDIE-LEARNING / jmdie_post_reset", () => {
  it("clears the corpus cache so subsequent corpus/query/stats re-discover from disk", async () => {
    // Seed the cache with the temp corpus (2 posts).
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const before = await call(server, "jmdie_post_stats");
    expect(before.data.profileCount).toBe(2);

    // Reset → next corpus access re-learns from default discovery.
    const reset = await call(server, "jmdie_post_reset");
    expect(reset.ok).toBe(true);
    expect(reset.data.reset).toBe(true);

    // After reset the cache holds neither the temp corpus nor the prior stats:
    // a fresh stats call re-discovers, with profileCount sourced from disk
    // (≥0 — the discovery target depends on host, but the previous tmp's 2 is
    // not preserved through reset → re-discovery flow).
    const after = await call(server, "jmdie_post_stats");
    expect(after.ok).toBe(true);
    expect(typeof after.data.profileCount).toBe("number");
    // Discovery either finds the real corpus (>0) or fails-soft with a
    // warning + profileCount 0. Either way, the cached "2" is gone.
    if (after.data.profileCount !== 0) {
      // discovery succeeded — should not equal the wiped tmp's 2 by accident
      expect(after.data.profileCount).not.toBe(2);
    }
  });
});

describe("INDIA-POST-GAPS / jmdie_post_gaps", () => {
  it("returns the gap report shape end-to-end through prism_knowledge", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_gaps");
    expect(r.ok).toBe(true);
    expect(r.data.schemaVersion).toBe("1.0.0");
    expect(r.data.profileCount).toBe(2);
    expect(Array.isArray(r.data.postGaps)).toBe(true);
    expect(r.data.postGaps.length).toBe(2);
    expect(Array.isArray(r.data.corpusWideGaps)).toBe(true);
    expect(Array.isArray(r.data.recommendations)).toBe(true);
    expect(r.data.recommendations.length).toBeGreaterThan(0);
  });

  it("each postGap carries family + valueScore + missingFamilyPatterns fields", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const r = await call(server, "jmdie_post_gaps");
    expect(r.ok).toBe(true);
    // responseSlimmer strips empty arrays at MCP transport: a post with no
    // missing family patterns gets `missingFamilyPatterns` dropped from the
    // JSON envelope. Normalise via `?? []` so the assertion holds for both.
    for (const pg of r.data.postGaps as Array<{
      file: string;
      controllerFamily: string;
      valueScore: number;
      missingFamilyPatterns?: string[];
    }>) {
      expect(typeof pg.file).toBe("string");
      expect(pg.file.length).toBeGreaterThan(0);
      expect(typeof pg.controllerFamily).toBe("string");
      expect(pg.valueScore).toBeGreaterThanOrEqual(0);
      expect(pg.valueScore).toBeLessThanOrEqual(1);
      const mfp = pg.missingFamilyPatterns ?? [];
      expect(Array.isArray(mfp)).toBe(true);
      for (const e of mfp) expect(typeof e).toBe("string");
    }
  });
});

describe("U-GAP-POST-JMDIE-LEARNING / regression guard", () => {
  it("all 7 jmdie_post actions are reachable from prism_knowledge", async () => {
    await call(server, "jmdie_post_learn", { sourceDir: tmp });
    const corpus = await call(server, "jmdie_post_corpus");
    const query = await call(server, "jmdie_post_query", { family: "haas" });
    const catalog = await call(server, "jmdie_post_catalog");
    const stats = await call(server, "jmdie_post_stats");
    const gaps = await call(server, "jmdie_post_gaps");
    const reset = await call(server, "jmdie_post_reset");
    expect(corpus.ok).toBe(true);
    expect(query.ok).toBe(true);
    expect(catalog.ok).toBe(true);
    expect(stats.ok).toBe(true);
    expect(gaps.ok).toBe(true);
    expect(reset.ok).toBe(true);
    expect((query.data.profiles as unknown[]).length).toBe(1); // 1 haas post
    expect(reset.data.reset).toBe(true);
  });
});
