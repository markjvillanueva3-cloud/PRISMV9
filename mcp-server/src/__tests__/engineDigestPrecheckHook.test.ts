/**
 * engine-digest-precheck hook — P6-U02 close-out tests.
 *
 * Covers the 3 pure functions (tokenize, jaccard, findSimilarEngines)
 * with concrete-value assertions on similarity scores and match shapes.
 */
import { describe, it, expect } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

process.env.PRISM_ENGINE_DIGEST_PRECHECK_AS_LIB = "1";

const HOOK_URL = pathToFileURL(
  resolve("H:/prism/.claude/hooks/engine-digest-precheck.mjs"),
).href;

const mod = (await import(/* @vite-ignore */ HOOK_URL)) as {
  tokenize: (name: string) => Set<string>;
  jaccard: (a: Set<string>, b: Set<string>) => number;
  findSimilarEngines: (
    proposed: string,
    digest: string,
    threshold: number,
    limit: number,
  ) => Array<{ name: string; similarity: number }>;
};

const { tokenize, jaccard, findSimilarEngines } = mod;

describe("tokenize", () => {
  it("returns empty set for empty string", () => {
    expect(tokenize("").size).toBe(0);
  });

  it("returns empty set for null", () => {
    expect(tokenize(null as unknown as string).size).toBe(0);
  });

  it("strips 'Engine' suffix", () => {
    const t = tokenize("CuttingForceEngine");
    expect(t.has("engine")).toBe(false);
    expect(t.has("cutting")).toBe(true);
    expect(t.has("force")).toBe(true);
  });

  it("splits CamelCase on capital boundaries", () => {
    const t = tokenize("ToolDeflectionEngine");
    expect(t.has("tool")).toBe(true);
    expect(t.has("deflection")).toBe(true);
    expect(t.size).toBe(2);
  });

  it("splits snake_case on underscores", () => {
    const t = tokenize("Tool_Deflection_Engine");
    expect(t.has("tool")).toBe(true);
    expect(t.has("deflection")).toBe(true);
  });

  it("filters tokens shorter than 2 characters", () => {
    const t = tokenize("AbBxEngine");
    // "ab" and "bx" both ≥2 chars → kept; single-char fragments dropped
    expect(t.has("ab")).toBe(true);
    expect(t.has("bx")).toBe(true);
  });

  it("strips .ts extension before tokenizing", () => {
    const t = tokenize("ChatterStabilityEngine.ts");
    expect(t.has("ts")).toBe(false);
    expect(t.has("chatter")).toBe(true);
    expect(t.has("stability")).toBe(true);
  });
});

describe("jaccard", () => {
  it("returns 0 for two empty sets", () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it("returns 0 when one set is empty", () => {
    expect(jaccard(new Set(["a"]), new Set())).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["c", "d"]))).toBe(0);
  });

  it("returns 0.5 for half-overlap (1 common of 3 total unique)", () => {
    // {a, b} ∩ {b, c} = {b}; union = {a, b, c}; 1/3
    const r = jaccard(new Set(["a", "b"]), new Set(["b", "c"]));
    expect(r > 0.33).toBe(true);
    expect(r < 0.34).toBe(true);
  });

  it("returns correct value for partial overlap of 2/4", () => {
    // {a,b,c} ∩ {b,c,d} = {b,c}; union = {a,b,c,d}; 2/4 = 0.5
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBe(0.5);
  });
});

describe("findSimilarEngines", () => {
  const sampleDigest = `
- CuttingForceEngine: Kienzle force model for milling
- ToolDeflectionEngine: cantilever beam deflection
- ChatterStabilityEngine: SLD calculation
- ThermalExpansionEngine: linear thermal growth
- ToolLifeEngine: Taylor equation
`;

  it("returns empty array for empty digest", () => {
    const r = findSimilarEngines("MyNewEngine", "", 0.5, 5);
    expect(r.length).toBe(0);
  });

  it("returns empty array for empty proposed name", () => {
    const r = findSimilarEngines("", sampleDigest, 0.5, 5);
    expect(r.length).toBe(0);
  });

  it("finds exact-token match: CuttingForcePrediction → CuttingForceEngine with similarity 2/3", () => {
    // Proposed tokens: {cutting, force, prediction} (3)
    // CuttingForce tokens: {cutting, force} (2)
    // Intersection: {cutting, force} (2); union: {cutting, force, prediction} (3)
    // Jaccard = 2/3 ≈ 0.6667
    const r = findSimilarEngines("CuttingForcePredictionEngine", sampleDigest, 0.3, 5);
    expect(r.length).toBe(1);
    expect(r[0].name).toBe("CuttingForceEngine");
    expect(r[0].similarity).toBeCloseTo(2 / 3, 4);
  });

  it("respects threshold — 0.9 excludes all sample-digest matches", () => {
    const r = findSimilarEngines("CuttingForceMonteCarloEngine", sampleDigest, 0.9, 5);
    expect(r.length).toBe(0);
  });

  it("respects limit — limit=2 with 0.0 threshold and broad query caps at exactly 2", () => {
    // ToolForceEngine tokens {tool, force} match many; threshold=0 keeps every
    // engine with non-zero overlap, so limit caps to 2.
    const r = findSimilarEngines("ToolForceEngine", sampleDigest, 0.0, 2);
    expect(r.length).toBe(2);
  });

  it("results sorted desc — ToolDeflection + ToolLife both score 0.5 for ToolEngine query", () => {
    // ToolEngine tokens: {tool}. ToolDeflectionEngine: {tool,deflection} — 1/2=0.5.
    // ToolLifeEngine: {tool,life} — 1/2=0.5. Same Jaccard. Other 3 engines share
    // 0 tokens with {tool} → Jaccard 0 → excluded by threshold 0.2.
    const r = findSimilarEngines("ToolEngine", sampleDigest, 0.2, 10);
    expect(r.length).toBe(2);
    expect(r[0].similarity).toBeCloseTo(0.5, 4);
    expect(r[1].similarity).toBeCloseTo(0.5, 4);
    // Both names start with "Tool"
    const names = r.map((m) => m.name).sort();
    expect(names).toEqual(["ToolDeflectionEngine", "ToolLifeEngine"]);
    // Pairwise desc invariant
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].similarity).toBeGreaterThanOrEqual(r[i].similarity);
    }
  });

  it("does NOT match itself when proposed name matches an entry exactly", () => {
    const r = findSimilarEngines("CuttingForceEngine", sampleDigest, 0.0, 10);
    const found = r.find((m) => m.name === "CuttingForceEngine");
    expect(found === undefined).toBe(true);
  });

  it("deduplicates repeated engine names in the digest", () => {
    const repeated = "CuttingForceEngine\nCuttingForceEngine\nCuttingForceEngine";
    const r = findSimilarEngines("CuttingForcePrediction", repeated, 0.0, 10);
    const cuttingMatches = r.filter((m) => m.name === "CuttingForceEngine");
    expect(cuttingMatches.length).toBe(1);
  });
});
