/**
 * DailyPersonalBriefEngine.embedding-similarity.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
 *
 * Proves that when `precomputedSimilarities` is passed to
 * DailyPersonalBriefEngine.synthesize(), the connection step uses those
 * values instead of computing TF-IDF cosine — so callers can swap in
 * embedding-based similarity (Ollama/nomic-embed-text via OllamaEmbedderEngine).
 *
 * 8 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dailyPersonalBriefEngine } from "../engines/DailyPersonalBriefEngine.js";
import { pairKey } from "../engines/OllamaEmbedderEngine.js";

let tmpVault: string;
let tmpWiki: string;
const NOW = Date.UTC(2026, 4, 8, 6, 0, 0);

function writeNote(rel: string, body: string, ageMs = 0): string {
  const full = join(tmpVault, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf8");
  const mt = new Date(NOW - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

beforeEach(() => {
  tmpVault = mkdtempSync(join(tmpdir(), "embed-vault-"));
  tmpWiki = mkdtempSync(join(tmpdir(), "embed-wiki-"));
});

afterEach(() => {
  rmSync(tmpVault, { recursive: true, force: true });
  rmSync(tmpWiki, { recursive: true, force: true });
});

describe("DailyPersonalBriefEngine — precomputedSimilarities flow", () => {
  // -------------------- BACKWARD COMPAT --------------------

  it("default (no precomputed map) → TF-IDF cosine path still produces ≥1 connection on themed corpus", () => {
    for (let i = 0; i < 5; i++) {
      writeNote(`n-${i}.md`, `# Note ${i}\nThin-wall aluminum milling deflection thin-wall aluminum.`);
    }
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(r.connections.length).toBeGreaterThanOrEqual(1);
    // TF-IDF on identical bodies should produce similarity == 1 with rounding.
    expect(r.connections[0].similarity).toBeCloseTo(1.0, 2);
  });

  // -------------------- PRECOMPUTED PATH --------------------

  it("precomputed similarity 0.99 above 0.55 threshold → pair.similarity == 0.99 (proves backend swap)", () => {
    const a = writeNote("a.md", "# A\nFirst note body covering machining feed strategy and toolpath geometry observation.");
    const b = writeNote("b.md", "# B\nSecond note body about completely different topic like nutrition exercise sleep schedule.");
    writeNote("c.md", "# C\nbody c.");
    const sims = new Map<string, number>([
      [pairKey(a, b), 0.99],
    ]);
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
    });
    // Exactly one connection (only one pair has a precomputed value above threshold).
    expect(r.connections.length).toBe(1);
    const pair = r.connections[0];
    expect(pair.a).toBe(a);
    expect(pair.b).toBe(b);
    // similarity field must be 0.99 (from map) — TF-IDF on disjoint bodies would be ~0.
    expect(pair.similarity).toBeCloseTo(0.99, 4);
    expect(pair.combined).toBeCloseTo(0.99, 4);
  });

  it("precomputed similarity 0.30 below 0.55 threshold → connections empty", () => {
    const a = writeNote("a.md", "# A\nFirst note body covering machining feed strategy and toolpath geometry observation.");
    const b = writeNote("b.md", "# B\nSecond note body about completely different topic like nutrition exercise sleep schedule.");
    const sims = new Map<string, number>([
      [pairKey(a, b), 0.30],
    ]);
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
    });
    expect(r.connections.length).toBe(0);
  });

  it("missing pair in map → treated as zero (excluded if below threshold)", () => {
    writeNote("a.md", "# A\nNote about cutting force estimation and Kienzle coefficients lookup carbide endmill.");
    writeNote("b.md", "# B\nUnrelated note covering creative writing prompts character development plot structure.");
    const sims = new Map<string, number>(); // empty map
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
    });
    expect(r.connections.length).toBe(0);
  });

  it("precomputed 0.10 wins over TF-IDF=1.0 — proves precomputed actually replaces TF-IDF (not augments)", () => {
    // Two notes with IDENTICAL bodies — TF-IDF cosine = 1.0 exactly.
    // We tell the engine the precomputed similarity is 0.10 (incompatible).
    const identicalBody = "tungsten carbide insert tungsten carbide tungsten carbide hardness wear resistance";
    const a = writeNote("a.md", identicalBody);
    const b = writeNote("b.md", identicalBody);
    const sims = new Map<string, number>([
      [pairKey(a, b), 0.10],
    ]);
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
    });
    // If precomputed weren't winning, TF-IDF=1.0 would clear 0.55. Empty connections proves backend swap.
    expect(r.connections.length).toBe(0);
  });

  it("co-occurrence boost +0.05 still applies on top of precomputed sim — 0.52 + 0.05 = 0.57 clears threshold", () => {
    const a = writeNote("a.md", "# A\nFirst note body covering machining feed strategy and toolpath geometry observation.");
    const b = writeNote("b.md", "# B\nSecond note body about completely different topic like nutrition exercise sleep schedule.");
    // Wiki entry that mentions both basenames as wikilinks → wiki boost +0.05.
    mkdirSync(tmpWiki, { recursive: true });
    writeFileSync(join(tmpWiki, "topic.md"), "# topic\n[[a]] and [[b]] are connected.\n", "utf8");
    const sims = new Map<string, number>([
      [pairKey(a, b), 0.52],   // below 0.55 threshold on its own
    ]);
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
    });
    expect(r.connections.length).toBe(1);
    const pair = r.connections[0];
    expect(pair.similarity).toBeCloseTo(0.52, 4);
    expect(pair.boost).toBeCloseTo(0.05, 4);
    expect(pair.combined).toBeCloseTo(0.57, 4);
  });

  it("ranking honors precomputed sims — top connection has the highest combined score", () => {
    const a = writeNote("a.md", "# A\nFirst note discussing finite element method mesh refinement strategies.");
    const b = writeNote("b.md", "# B\nSecond note about quarterly business review presentation outline format.");
    const c = writeNote("c.md", "# C\nThird note covering vegetable garden compost layered nitrogen carbon ratio.");
    const sims = new Map<string, number>([
      [pairKey(a, b), 0.80],
      [pairKey(a, c), 0.95],
      [pairKey(b, c), 0.60],
    ]);
    const r = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
      maxConnections: 3,
    });
    expect(r.connections.length).toBe(3);
    expect(r.connections[0].combined).toBeCloseTo(0.95, 4);
    expect(r.connections[1].combined).toBeCloseTo(0.80, 4);
    expect(r.connections[2].combined).toBeCloseTo(0.60, 4);
  });

  it("threshold 0.55 (embedding default) accepts a 0.65 sim that 0.72 (TF-IDF default) would reject", () => {
    const a = writeNote("a.md", "# A\nNote about hex socket fastener torque specification standard practice.");
    const b = writeNote("b.md", "# B\nNote covering rosemary herb container plant indoor sunlight rotation.");
    const sims = new Map<string, number>([
      [pairKey(a, b), 0.65],
    ]);
    const high = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.72,
    });
    const low = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      precomputedSimilarities: sims,
      threshold: 0.55,
    });
    expect(high.connections.length).toBe(0);
    expect(low.connections.length).toBe(1);
    expect(low.connections[0].similarity).toBeCloseTo(0.65, 4);
  });
});
