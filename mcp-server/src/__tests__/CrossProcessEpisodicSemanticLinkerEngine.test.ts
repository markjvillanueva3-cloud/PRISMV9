/**
 * CrossProcessEpisodicSemanticLinkerEngine.test.ts — XPROC-NEURAL Tier 2 (T2-04)
 *
 * Acceptance criterion (per XPROC-NEURAL-ROADMAP.md Tier 2 R4): ≥1 relevant
 * citation per episode 80% of the time. Plus all 7 documented failure modes.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessEpisodicSemanticLinkerEngine,
  crossProcessEpisodicSemanticLinker,
  type SemanticTip,
  type SemanticCitation,
} from "../engines/CrossProcessEpisodicSemanticLinkerEngine.js";

const ep = (id: string, process: "mill" | "lathe" | "wedm", material: string, feature: string, outcome?: "success" | "marginal" | "fail") =>
  ({ id, process, material, feature, ...(outcome && { outcome }) });

const tip = (
  tipId: string,
  keywords: string[],
  body: string,
  extra?: Partial<SemanticTip>,
): SemanticTip => ({ tipId, keywords, body, ...extra });

const cite = (
  ruleId: string,
  formula: string,
  citation: string,
  extra?: Partial<SemanticCitation>,
): SemanticCitation => ({ ruleId, formula, citation, ...extra });

describe("input validation", () => {
  it("returns empty enriched on empty episodes input", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [],
      tips: [tip("t1", ["pocket"], "use trochoidal")],
    });
    expect(r.enriched).toEqual([]);
    expect(r.totalEpisodes).toBe(0);
    expect(r.citationCoverageRatio).toBe(0);
    expect(r.tipCoverageRatio).toBe(0);
  });

  it("rejects malformed episode (bad process) → warning identifies the field path", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [{ id: "x", process: "edm", material: "P", feature: "pocket" }],  // bad process
    });
    expect(r.enriched).toEqual([]);
    expect(r.warnings.length).toBe(1);
    // Content assertion: the warning must identify the offending field, not
    // just report "something failed". Zod issues use dot-paths like
    // "episodes.0.process".
    expect(r.warnings[0]).toMatch(/episodes\.0\.process/);
    expect(r.warnings[0].toLowerCase()).toContain("invalid");
  });

  it("rejects malformed tip (zero keywords) → warning identifies tip path, zero results", () => {
    // Failure mode 4 layer (a): Zod rejects whole request when a tip has
    // zero-keyword array. Caller sees fail-fast with structured warning.
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [
        { tipId: "t-good", keywords: ["pocket"], body: "good tip" },
        { tipId: "t-bad", keywords: [], body: "bad — empty keywords" },  // Zod rejects
      ],
    });
    expect(r.enriched).toEqual([]);
    expect(r.totalEpisodes).toBe(0);
    expect(r.warnings.length).toBe(1);
    // Warning must identify the tips array index that failed (Zod path)
    expect(r.warnings[0]).toMatch(/tips\.1\.keywords/);
  });

  it("rejects malformed tip (missing body) with structured field-path warning", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [
        // Missing required `body` field
        { tipId: "t1", keywords: ["pocket"] } as never,
      ],
    });
    expect(r.enriched).toEqual([]);
    expect(r.warnings[0]).toMatch(/tips\.0\.body/);
  });
});

describe("empty catalogs (failure mode 2)", () => {
  it("episodes return zero attachments when both catalogs empty", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [],
      citations: [],
    });
    expect(r.enriched.length).toBe(1);
    expect(r.enriched[0].tips).toEqual([]);
    expect(r.enriched[0].citations).toEqual([]);
    expect(r.enriched[0].hasTip).toBe(false);
    expect(r.enriched[0].hasCitation).toBe(false);
    expect(r.citationCoverageRatio).toBe(0);
  });
});

describe("happy-path matching", () => {
  it("attaches a tip when keywords + categorical filter both match", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket", "marginal")],
      tips: [
        tip("t1", ["pocket", "trochoidal"], "use trochoidal toolpath", {
          processFilter: ["mill"],
          materialFilter: ["P"],
        }),
      ],
    });
    expect(r.enriched[0].tips.length).toBe(1);
    expect(r.enriched[0].tips[0].tipId).toBe("t1");
    expect(r.enriched[0].tips[0].combinedScore).toBeGreaterThan(0.5);
    expect(r.enriched[0].hasTip).toBe(true);
  });

  it("attaches a Kienzle citation for a milling steel pocket", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      citations: [
        cite("kienzle-P", "Fc = kc1.1 · ap · fz^(1-mc)", "Kienzle 1957", {
          processFilter: ["mill"],
          materialFilter: ["P"],
          keywords: ["pocket", "force"],
        }),
      ],
    });
    expect(r.enriched[0].citations.length).toBe(1);
    expect(r.enriched[0].citations[0].ruleId).toBe("kienzle-P");
    expect(r.enriched[0].citations[0].formula).toContain("kc1.1");
  });
});

describe("filter exclusion (failure mode 6)", () => {
  it("excludes tips whose process filter does not match the episode", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [
        tip("lathe-only-tip", ["pocket"], "lathe-specific advice", {
          processFilter: ["lathe"],
        }),
      ],
    });
    expect(r.enriched[0].tips).toEqual([]);
  });

  it("excludes tips whose material filter does not match", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [
        tip("ti-only", ["pocket"], "Ti-only advice", { materialFilter: ["Ti-6Al-4V"] }),
      ],
    });
    expect(r.enriched[0].tips).toEqual([]);
  });
});

describe("wildcard material filter (failure mode 7)", () => {
  it("matches any material with partial credit when filter contains '*'", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [
        ep("e-p", "mill", "P", "pocket"),
        ep("e-ti", "mill", "Ti-6Al-4V", "pocket"),
      ],
      tips: [
        tip("universal", ["pocket"], "applies to any material", {
          processFilter: ["mill"],
          materialFilter: ["*"],
        }),
      ],
      weightCategorical: 1.0,  // pure categorical so we can read the score directly
      minCombinedScore: 0,
    });
    expect(r.enriched[0].tips.length).toBe(1);
    expect(r.enriched[1].tips.length).toBe(1);
    // Wildcard contributes 0.5 material score; process filter exact match=1.0
    // Combined categorical = (1.0 + 0.5) / 2 = 0.75
    expect(r.enriched[0].tips[0].categoricalScore).toBeCloseTo(0.75, 4);
  });
});

describe("topK ranking", () => {
  it("returns at most topK tips ordered by combined score", () => {
    const tips: SemanticTip[] = [];
    // 10 tips all matching, varying keyword overlap
    for (let i = 0; i < 10; i++) {
      const kws = ["pocket"];
      // Tips i=0..9 progressively get more matching keywords
      for (let j = 0; j < i; j++) kws.push(`extra-${j}`);
      tips.push(tip(`t-${i}`, kws, `body ${i}`, { processFilter: ["mill"] }));
    }
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket", "success")],
      tips,
      topK: 3,
      minCombinedScore: 0,
    });
    expect(r.enriched[0].tips.length).toBe(3);
    // Scores should be in descending order
    const scores = r.enriched[0].tips.map((t) => t.combinedScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });
});

describe("minCombinedScore gate", () => {
  it("filters out tips below minCombinedScore", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [
        tip("strong", ["pocket"], "high-relevance", { processFilter: ["mill"], materialFilter: ["P"] }),
        tip("weak", ["unrelated-keyword"], "low-relevance", { materialFilter: ["*"] }),
      ],
      minCombinedScore: 0.6,  // weak fails this gate
    });
    expect(r.enriched[0].tips.length).toBe(1);
    expect(r.enriched[0].tips[0].tipId).toBe("strong");
  });
});

describe("acceptance — citation coverage ≥80% on synthetic distribution", () => {
  it("attaches at least one citation to ≥80% of episodes when catalog is well-populated", () => {
    // 50 episodes spanning 5 (process,material) combos
    const procs: Array<"mill" | "lathe" | "wedm"> = ["mill", "lathe", "wedm"];
    const mats = ["P", "M", "K", "N", "S"];
    const features = ["pocket", "od_turn", "rough_cut", "finish_pass", "drill"];
    const episodes: ReturnType<typeof ep>[] = [];
    let id = 0;
    for (const p of procs) for (const m of mats) for (const f of features) {
      // Skip illegal combos: WEDM doesn't drill
      if (p === "wedm" && f === "drill") continue;
      episodes.push(ep(`ep-${id++}`, p, m, f, "success"));
    }
    expect(episodes.length).toBeGreaterThan(50);

    // Build a citation catalog with one Kienzle entry per (process, material)
    const citations: SemanticCitation[] = [];
    for (const p of procs) {
      for (const m of mats) {
        citations.push(cite(`kienzle-${p}-${m}`, `Fc${p}${m}`, "Kienzle 1957", {
          processFilter: [p],
          materialFilter: [m],
          keywords: features,  // matches all features
        }));
      }
    }

    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes,
      citations,
      minCombinedScore: 0.4,
    });

    expect(r.citationCoverageRatio).toBeGreaterThanOrEqual(0.8);
    expect(r.episodesWithCitation).toBeGreaterThanOrEqual(Math.floor(episodes.length * 0.8));
  });
});

describe("response shape + reporting", () => {
  it("citationCoverageRatio = 1 when all episodes get citations", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket"), ep("e2", "mill", "P", "pocket")],
      citations: [
        cite("c1", "F=ma", "Newton", { processFilter: ["mill"], materialFilter: ["P"], keywords: ["pocket"] }),
      ],
      minCombinedScore: 0.4,
    });
    expect(r.citationCoverageRatio).toBe(1);
    expect(r.episodesWithCitation).toBe(2);
  });

  it("citationCoverageRatio = 0 when no citations match (failure mode 3)", () => {
    const r = CrossProcessEpisodicSemanticLinkerEngine.enrich({
      episodes: [ep("e1", "mill", "P", "pocket")],
      citations: [
        cite("c1", "F=ma", "Newton", { processFilter: ["lathe"] }),  // wrong process
      ],
    });
    expect(r.citationCoverageRatio).toBe(0);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_episodic_semantic_join to enrich()", () => {
    const r = crossProcessEpisodicSemanticLinker("xproc_episodic_semantic_join", {
      episodes: [ep("e1", "mill", "P", "pocket")],
      tips: [tip("t1", ["pocket"], "advice", { processFilter: ["mill"] })],
    }) as { enriched: Array<{ tips: unknown[] }>; totalEpisodes: number };
    expect(r.totalEpisodes).toBe(1);
    expect(r.enriched[0].tips.length).toBe(1);
  });

  it("throws on unknown action with descriptive message", () => {
    expect(() => crossProcessEpisodicSemanticLinker("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
