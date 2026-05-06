/**
 * MergeCandidateScorerEngine tests — P16-U02.
 *
 * Covers:
 *  - buildAssetIndex: cross-peer aggregation, dedup, sort stability
 *  - computeInfraScore: positive (registry/audit/hook) + negative (mill/lathe)
 *  - scoreAsset: composite formula, lead-lane penalty, kind weight
 *  - rankCandidates: minScore filter, topN cap, sort order
 *  - renderMarkdown: deterministic output, by-kind grouping
 *  - adversarial inputs: null/undefined/non-array
 */

import { describe, it, expect } from "vitest";
import { MergeCandidateScorerEngine, type ScoredAsset } from "../engines/MergeCandidateScorerEngine.js";
import type { PerRepoUniques } from "../engines/PeerRepoSignatureEngine.js";

const eng = new MergeCandidateScorerEngine();
const FIXED_TS = "2026-01-01T00:00:00Z";

function mkPerRepo(repo: string, kinds: Partial<PerRepoUniques["unique_to_peer"]>): PerRepoUniques {
  return {
    repo_root: repo,
    unique_to_peer: {
      engines: kinds.engines ?? [],
      dispatchers: kinds.dispatchers ?? [],
      hooks: kinds.hooks ?? [],
      skills: kinds.skills ?? [],
      scripts: kinds.scripts ?? [],
    },
    unique_to_canonical: { engines: [], dispatchers: [], hooks: [], skills: [], scripts: [] },
    peer_only_count: 0,
  };
}

describe("MergeCandidateScorerEngine — buildAssetIndex", () => {
  it("dedups same kind+name across peers and aggregates peer list", () => {
    const idx = eng.buildAssetIndex([
      mkPerRepo("/a", { engines: ["FooEngine"] }),
      mkPerRepo("/b", { engines: ["FooEngine", "BarEngine"] }),
      mkPerRepo("/c", { hooks: ["foo-hook"] }),
    ]);
    expect(idx).toHaveLength(3);
    const foo = idx.find((e) => e.name === "FooEngine" && e.kind === "engine");
    expect(foo).toEqual({
      kind: "engine",
      name: "FooEngine",
      peers: ["/a", "/b"],
      peer_count: 2,
    });
    const bar = idx.find((e) => e.name === "BarEngine");
    expect(bar).toEqual({
      kind: "engine",
      name: "BarEngine",
      peers: ["/b"],
      peer_count: 1,
    });
    const fooHook = idx.find((e) => e.name === "foo-hook" && e.kind === "hook");
    expect(fooHook).toEqual({
      kind: "hook",
      name: "foo-hook",
      peers: ["/c"],
      peer_count: 1,
    });
  });

  it("sorts by peer_count desc, then kind asc, then name asc", () => {
    const idx = eng.buildAssetIndex([
      mkPerRepo("/a", { engines: ["Z"], hooks: ["h1"] }),
      mkPerRepo("/b", { engines: ["Z"] }),
      mkPerRepo("/c", { engines: ["A"] }),
    ]);
    expect(idx.map((e) => `${e.kind}:${e.name}:${e.peer_count}`)).toEqual([
      "engine:Z:2",
      "engine:A:1",
      "hook:h1:1",
    ]);
  });

  it("returns empty array on null/non-array input", () => {
    // @ts-expect-error — adversarial
    expect(eng.buildAssetIndex(null)).toEqual([]);
    expect(eng.buildAssetIndex([])).toEqual([]);
  });

  it("ignores per-repo records with malformed unique_to_peer", () => {
    const idx = eng.buildAssetIndex([
      // @ts-expect-error — adversarial
      mkPerRepo("/a", { engines: "not-an-array" }),
      mkPerRepo("/b", { engines: ["Real"] }),
    ]);
    expect(idx.map((e) => e.name)).toEqual(["Real"]);
  });

  it("skips empty / non-string asset names", () => {
    const idx = eng.buildAssetIndex([
      // @ts-expect-error — adversarial
      mkPerRepo("/a", { engines: ["Good", "", null, 42, "Other"] }),
    ]);
    expect(idx.map((e) => e.name).sort()).toEqual(["Good", "Other"]);
  });
});

describe("MergeCandidateScorerEngine — computeInfraScore", () => {
  it("scores 1 hit at exactly 1/3 ≈ 0.3333", () => {
    // "registry" matches one fragment (registry) → 1/3 ≈ 0.3333
    expect(eng.computeInfraScore("Registry")).toBeCloseTo(1 / 3, 3);
  });

  it("scores 2 hits at exactly 2/3 ≈ 0.6667", () => {
    // matches "registry" and "audit"
    expect(eng.computeInfraScore("RegistryAudit")).toBeCloseTo(2 / 3, 3);
  });

  it("scores names with no infra fragments at exactly 0", () => {
    expect(eng.computeInfraScore("FooBarBaz")).toBe(0);
    expect(eng.computeInfraScore("Quux")).toBe(0);
  });

  it("clamps 5+ hits to 1.0", () => {
    const s = eng.computeInfraScore("registry-audit-sync-monitor-classifier-router-gate");
    expect(s).toBe(1);
  });

  it("subtracts 0.25 per domain-leak fragment", () => {
    // "mill-registry": 1/3 base − 0.25 (mill) = 0.0833
    expect(eng.computeInfraScore("mill-registry")).toBeCloseTo(1 / 3 - 0.25, 3);
    // "lathe-mill-registry": 1/3 − 0.5 → clamped to 0
    expect(eng.computeInfraScore("lathe-mill-registry")).toBe(0);
  });

  it("returns 0 on empty / non-string", () => {
    expect(eng.computeInfraScore("")).toBe(0);
    // @ts-expect-error — adversarial
    expect(eng.computeInfraScore(null)).toBe(0);
  });
});

describe("MergeCandidateScorerEngine — scoreAsset", () => {
  it("computes composite score with peer_count_norm * 0.5 + infra * 0.3 + kind * 0.2", () => {
    // engine, name "x" (no infra), peer_count=10, no lead lane
    // peerCountNorm = 10/10 = 1.0; infra = 0; kindWeight (engine) = 0.7
    // score = 1.0 * 0.5 + 0 * 0.3 + 0.7 * 0.2 = 0.5 + 0.14 = 0.64
    const e = { kind: "engine" as const, name: "x", peers: [], peer_count: 10 };
    expect(eng.scoreAsset(e).score).toBe(0.64);
  });

  it("hook kind scores higher than engine kind for same peer_count", () => {
    // hook: weight 1.0; engine: weight 0.7. Difference = (1.0 - 0.7) * 0.2 = 0.06
    const hook = { kind: "hook" as const, name: "x", peers: ["/a"], peer_count: 1 };
    const engine = { kind: "engine" as const, name: "x", peers: ["/a"], peer_count: 1 };
    expect(eng.scoreAsset(hook).score - eng.scoreAsset(engine).score).toBeCloseTo(0.06, 5);
  });

  it("lead-lane penalty halves the score exactly", () => {
    const a = { kind: "engine" as const, name: "Foo", peers: ["/lead", "/x"], peer_count: 2 };
    const b = { kind: "engine" as const, name: "Foo", peers: ["/x", "/y"], peer_count: 2 };
    const sa = eng.scoreAsset(a, { leadLane: "/lead" });
    const sb = eng.scoreAsset(b, { leadLane: "/lead" });
    expect(sa.in_lead_lane).toBe(true);
    expect(sb.in_lead_lane).toBe(false);
    expect(sa.score).toBe(Number((sb.score * 0.5).toFixed(4)));
  });

  it("safe-defaults malformed entry to engine kind, peer_count=0, score=0.14", () => {
    // null entry → kind=engine, peer_count=0, infra=0
    // score = 0 * 0.5 + 0 * 0.3 + 0.7 * 0.2 = 0.14
    // @ts-expect-error — adversarial
    const s = eng.scoreAsset(null);
    expect(s.kind).toBe("engine");
    expect(s.peer_count).toBe(0);
    expect(s.score).toBe(0.14);
  });

  it("first_seen_in is peers[0] verbatim (does not re-sort)", () => {
    const e = { kind: "engine" as const, name: "Foo", peers: ["/b", "/a"], peer_count: 2 };
    expect(eng.scoreAsset(e).first_seen_in).toBe("/b");
  });
});

describe("MergeCandidateScorerEngine — rankCandidates", () => {
  it("sorts strictly by score desc with peer_count tie-break", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["AlphaRegistry"], hooks: ["audit-gate"] }),
      mkPerRepo("/b", { engines: ["AlphaRegistry"], hooks: ["audit-gate"] }),
      mkPerRepo("/c", { engines: ["BetaWorker"] }),
    ]);
    expect(report.totalAssets).toBe(3);
    expect(report.scoredAssets).toBe(3);
    expect(report.candidates).toHaveLength(3);
    // Hook+infra+peer_count=2 must beat engine+infra+peer_count=2 must beat engine+no-infra+peer_count=1
    expect(report.candidates[0].name).toBe("audit-gate");
    expect(report.candidates[1].name).toBe("AlphaRegistry");
    expect(report.candidates[2].name).toBe("BetaWorker");
  });

  it("minScore=0.99 filters out everything", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["FooBar"] }),
    ], { minScore: 0.99 });
    expect(report.scoredAssets).toBe(0);
    expect(report.candidates).toEqual([]);
  });

  it("topN=2 limits candidates to the top two", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["E1", "E2", "E3"] }),
    ], { topN: 2 });
    expect(report.totalAssets).toBe(3);
    expect(report.candidates).toHaveLength(2);
  });

  it("byKind histogram exactly reflects candidate counts per kind", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["Eng1"], hooks: ["h1", "h2"] }),
    ]);
    expect(report.byKind).toEqual({
      engine: 1, dispatcher: 0, hook: 2, skill: 0, script: 0,
    });
  });

  it("totalAssets reflects unfiltered index size even when minScore drops all", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["FooBar"] }),
    ], { minScore: 0.99 });
    expect(report.totalAssets).toBe(1);
    expect(report.scoredAssets).toBe(0);
  });
});

describe("MergeCandidateScorerEngine — renderMarkdown", () => {
  it("emits expected headings + table for hook + engine groups", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["RegistrySnapshotEngine"], hooks: ["audit-gate-hook"] }),
    ]);
    const md = eng.renderMarkdown(report, { leadLane: "/a" }, FIXED_TS);
    expect(md).toContain("# Peer-Repo Merge Candidates");
    expect(md).toContain(`**Generated:** ${FIXED_TS}`);
    expect(md).toContain("**Lead lane:** `/a`");
    expect(md).toContain("## hook candidates (1)");
    expect(md).toContain("## engine candidates (1)");
    expect(md).toMatch(/audit-gate-hook/);
    expect(md).toMatch(/RegistrySnapshotEngine/);
    // table headers
    expect(md).toContain("| Score | Peers | Name | Infra | In lead lane | First seen in |");
  });

  it("is byte-deterministic given identical inputs + timestamp", () => {
    const inputs = [mkPerRepo("/a", { engines: ["RegistryEngine"] })];
    const r1 = eng.rankCandidates(inputs);
    const r2 = eng.rankCandidates(inputs);
    expect(eng.renderMarkdown(r1, {}, FIXED_TS)).toBe(eng.renderMarkdown(r2, {}, FIXED_TS));
  });

  it("omits empty kind sections", () => {
    const report = eng.rankCandidates([
      mkPerRepo("/a", { engines: ["RegistryEngine"] }),
    ]);
    const md = eng.renderMarkdown(report, {}, FIXED_TS);
    expect(md).not.toContain("## hook candidates");
    expect(md).not.toContain("## script candidates");
    expect(md).toContain("## engine candidates (1)");
  });

  it("renders triage instructions section regardless of input", () => {
    const md = eng.renderMarkdown(eng.rankCandidates([]), {}, FIXED_TS);
    expect(md).toContain("## Triage instructions (P16-U03)");
    expect(md).toContain("duplicationGuardEngine.checkBeforeCreating()");
  });
});

describe("MergeCandidateScorerEngine — end-to-end realistic shape", () => {
  it("hook beats engine when name + peer_count are identical", () => {
    const inputs = [
      mkPerRepo("/peer1", { engines: ["AuditTrailEngine"], hooks: ["audit-trail-hook"] }),
      mkPerRepo("/peer2", { engines: ["AuditTrailEngine"], hooks: ["audit-trail-hook"] }),
    ];
    const report = eng.rankCandidates(inputs);
    const hookScored = report.candidates.find((c: ScoredAsset) => c.kind === "hook")!;
    const engineScored = report.candidates.find((c: ScoredAsset) => c.kind === "engine")!;
    // Both have same peer_count(2) and same infra signal, so kind weight decides
    // hook(1.0) − engine(0.7) = 0.3 → score delta = 0.3 * 0.2 = 0.06
    expect(hookScored.score - engineScored.score).toBeCloseTo(0.06, 5);
  });

  it("lead-lane assets show in_lead_lane=true and rank below pure-peer assets", () => {
    const inputs = [
      mkPerRepo("/iooms0", { engines: ["LaneAssetRegistry"] }),
      mkPerRepo("/peer1", { engines: ["LaneAssetRegistry", "OtherRegistry"] }),
    ];
    const report = eng.rankCandidates(inputs, { leadLane: "/iooms0" });
    const lane = report.candidates.find((c) => c.name === "LaneAssetRegistry")!;
    const other = report.candidates.find((c) => c.name === "OtherRegistry")!;
    expect(lane.in_lead_lane).toBe(true);
    expect(other.in_lead_lane).toBe(false);
    // Both have 1 infra hit; lane has peer_count=2 vs other's 1, but lane's 0.5
    // penalty drops it below other:
    //   lane_raw = (2/10)*0.5 + (1/3)*0.3 + 0.7*0.2 = 0.10 + 0.10 + 0.14 = 0.34
    //   lane_score = 0.34 * 0.5 = 0.17
    //   other_raw = (1/10)*0.5 + (1/3)*0.3 + 0.7*0.2 = 0.05 + 0.10 + 0.14 = 0.29
    //   other_score = 0.29
    expect(other.score).toBeGreaterThan(lane.score);
    expect(lane.score).toBeCloseTo(0.17, 2);
    expect(other.score).toBeCloseTo(0.29, 2);
  });
});
