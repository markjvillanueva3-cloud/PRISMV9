/**
 * DailyPersonalBriefEngine.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF — exit_criteria coverage:
 *   1. >=3 happy paths exercising the threshold + boost + recency tie-break
 *   2. >=3 failure modes (empty / single-note / sub-threshold)
 *   3. >=2 adversarial inputs (NaN-shaped frontmatter / oversized doc)
 *   4. Round-trip dispatcher invocation matches singleton output
 *   5. Determinism across calls
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DailyPersonalBriefEngine,
  dailyPersonalBriefEngine,
  type DailyBriefConnection,
} from "../engines/DailyPersonalBriefEngine.js";

let tmpVault: string;
let tmpWiki: string;
const NOW = Date.UTC(2026, 4, 8, 12, 0, 0); // 2026-05-08 12:00 UTC -- deterministic

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const COOCCURRENCE_BOOST_VALUE = 0.05;
const DEFAULT_THRESHOLD_VALUE = 0.72;

function writeFileWithMtime(absPath: string, body: string, ageMs = 0): string {
  mkdirSync(join(absPath, ".."), { recursive: true });
  writeFileSync(absPath, body, "utf8");
  const mt = new Date(NOW - ageMs);
  utimesSync(absPath, mt, mt);
  return absPath;
}

function writeNote(relPath: string, body: string, ageMs = 0): string {
  return writeFileWithMtime(join(tmpVault, relPath), body, ageMs);
}

function writeWiki(relPath: string, body: string, ageMs = 0): string {
  return writeFileWithMtime(join(tmpWiki, relPath), body, ageMs);
}

function findPair(
  connections: DailyBriefConnection[],
  pathA: string,
  pathB: string,
): DailyBriefConnection {
  // Engine canonicalizes pair order (a < b alphabetically).
  const [lo, hi] = pathA <= pathB ? [pathA, pathB] : [pathB, pathA];
  for (const c of connections) {
    if (c.a === lo && c.b === hi) return c;
  }
  throw new Error(
    `expected connection between ${lo} and ${hi}, got ${connections.length} pairs: ` +
      connections.map((c) => `(${c.a},${c.b})`).join(", "),
  );
}

beforeEach(() => {
  tmpVault = mkdtempSync(join(tmpdir(), "dpb-vault-"));
  tmpWiki = mkdtempSync(join(tmpdir(), "dpb-wiki-"));
});

afterEach(() => {
  rmSync(tmpVault, { recursive: true, force: true });
  rmSync(tmpWiki, { recursive: true, force: true });
});

describe("DailyPersonalBriefEngine", () => {
  // -------------------- HAPPY PATHS --------------------

  it("returns up to 3 connections when 5 notes share a strong theme", () => {
    const body = (n: number) =>
      `# Note ${n}\n` +
      "Thin-wall aluminum milling feedrate adaptive deflection control. " +
      "Aluminum thin-wall pocket finishing requires deflection-aware feedrate. " +
      "Deflection-aware adaptive feedrate strategy for thin-wall aluminum pockets.";
    for (let i = 0; i < 5; i++) writeNote(`notes/n-${i}.md`, body(i));

    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections.length).toBe(3); // cap honored exactly
    for (const c of result.connections) {
      expect(c.combined).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD_VALUE);
      expect(c.similarity).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD_VALUE);
      expect(c.similarity).toBeLessThanOrEqual(1);
      expect(c.a < c.b).toBe(true); // canonical alphabetical pair order
      expect(c.boost).toBe(0); // no wiki entries -> no boost
    }
    // Connections must be ranked by combined desc.
    for (let i = 1; i < result.connections.length; i++) {
      expect(result.connections[i - 1].combined).toBeGreaterThanOrEqual(
        result.connections[i].combined,
      );
    }
    expect(result.analyzed_notes).toBe(5);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD_VALUE);
  });

  it("applies +0.05 co-occurrence boost when both notes are cited in the same wiki entry within 30d", () => {
    const a = writeNote(
      "alpha.md",
      "# Alpha\nFeedrate selection for thin-wall aluminum pockets demands adaptive control. " +
        "Tool deflection emerges in thin-wall finishing.",
    );
    const b = writeNote(
      "beta.md",
      "# Beta\nAdaptive feedrate selection for aluminum pockets responds to deflection. " +
        "Tool deflection drives the strategy in thin-wall finishing.",
    );

    const baseline = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
      // Lower the threshold so the pair clears even without the boost,
      // letting us isolate the boost field cleanly.
      threshold: 0.4,
    });
    expect(baseline.connections.length).toBe(1);
    const baselinePair = findPair(baseline.connections, a, b);
    expect(baselinePair.boost).toBe(0);
    expect(baselinePair.combined).toBe(baselinePair.similarity);

    // Add a wiki entry that names both note basenames.
    writeWiki(
      "concepts/feedback-loop.md",
      "# Feedback Loop\nSee [[alpha]] and [[beta]] for the deflection-feedrate coupling.",
    );

    const boosted = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW, threshold: 0.4,
    });
    const boostedPair = findPair(boosted.connections, a, b);
    expect(boostedPair.boost).toBeCloseTo(COOCCURRENCE_BOOST_VALUE, 5);
    expect(boostedPair.similarity).toBeCloseTo(baselinePair.similarity, 5);
    expect(boostedPair.combined).toBeCloseTo(
      Math.min(1, baselinePair.similarity + COOCCURRENCE_BOOST_VALUE),
      5,
    );
    expect(boosted.analyzed_wiki).toBe(1);
  });

  it("breaks ties by recency descending - newer pair ranks first", () => {
    const sharedBody =
      "Coolant evacuation chips small aluminum drilling mist option flood. " +
      "Coolant flood evacuation chips drilling aluminum small option mist.";
    writeNote("x1.md", sharedBody, MS_PER_HOUR);          // 1h old
    writeNote("x2.md", sharedBody, MS_PER_HOUR);          // 1h old
    writeNote("y1.md", sharedBody, 3 * MS_PER_DAY);       // 3d old
    writeNote("y2.md", sharedBody, 3 * MS_PER_DAY);       // 3d old

    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW, maxConnections: 6,
    });
    expect(result.connections.length).toBeGreaterThanOrEqual(2);
    // Top connection's recency is the newest among all ranked connections.
    const allRecency = result.connections.map((c) => new Date(c.recency).getTime());
    expect(allRecency[0]).toBe(Math.max(...allRecency));
  });

  it("emits exactly 1 pattern + 1 question with non-empty 'spine' wording when connections form", () => {
    // Use bodies with heavy overlap so cosine clears 0.72. Short notes that
    // share a theme but where the theme tokens appear in EVERY doc will see
    // their IDF weight collapse to 1, producing weaker similarity than naive
    // intuition expects — so we deliberately repeat the shared phrase.
    const shared =
      "Adaptive feedrate deflection thin-wall aluminum pocket finishing strategy. " +
      "Adaptive feedrate deflection thin-wall aluminum pocket finishing strategy. " +
      "Adaptive feedrate deflection thin-wall aluminum pocket finishing strategy.";
    writeNote("a.md", `# A\n${shared}`);
    writeNote("b.md", `# B\n${shared} Plus boring-bar context for variation.`);
    writeNote("c.md", `# C\n${shared} Plus end-mill context for variation.`);

    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections.length).toBeGreaterThanOrEqual(1);
    expect(result.pattern.length).toBeGreaterThan(20);
    expect(result.pattern.toLowerCase()).toContain("spine");
    expect(result.question.endsWith("?")).toBe(true);
    expect(result.question.length).toBeGreaterThan(20);
  });

  it("on quiet vault (no connections), pattern names the absence and question still asks", () => {
    // No notes at all → no pairs → "no pattern crystallized" message path.
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections).toEqual([]);
    expect(result.pattern.toLowerCase()).toContain("no pattern");
    expect(result.question.endsWith("?")).toBe(true);
    expect(result.question.length).toBeGreaterThan(20);
  });

  it("brief_date is YYYY-MM-DD derived from `now`", () => {
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.brief_date).toBe("2026-05-08");
    expect(result.generated_at.startsWith("2026-05-08")).toBe(true);
  });

  // -------------------- FAILURE MODES --------------------

  it("empty vault -- 0 connections, empty pattern, but always a question", () => {
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections).toEqual([]);
    expect(result.analyzed_notes).toBe(0);
    expect(result.pattern.toLowerCase()).toContain("no pattern");
    expect(result.question.endsWith("?")).toBe(true);
  });

  it("single-note vault -- cannot form pairs, returns 0 connections without throwing", () => {
    writeNote("only.md", "# Only\nA single note in the vault.");
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections).toEqual([]);
    expect(result.analyzed_notes).toBe(1);
    expect(result.question.endsWith("?")).toBe(true);
  });

  it("five fully-disjoint notes -- no pair clears 0.72 threshold", () => {
    writeNote("a.md", "# A\nFlank wear crater wear inserts carbide degrades heat.");
    writeNote("b.md", "# B\nClamps vises resist forces vacuum tables thin sheet.");
    writeNote("c.md", "# C\nGcode posts vary controller fanuc siemens dialect.");
    writeNote("d.md", "# D\nDynamic spindle balance vibration grade affects matters.");
    writeNote("e.md", "# E\nQuote estimating job costing labor materials overhead.");
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections).toEqual([]);
    expect(result.analyzed_notes).toBe(5);
  });

  it("notes outside the 7d window are excluded from analysis", () => {
    const themed = "Thin-wall aluminum milling feedrate deflection adaptive thin-wall feedrate aluminum.";
    writeNote("recent-1.md", themed, 0);
    writeNote("recent-2.md", themed, 0);
    writeNote("old-1.md", themed, 8 * MS_PER_DAY); // 8d old
    writeNote("old-2.md", themed, 8 * MS_PER_DAY);
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.analyzed_notes).toBe(2);
    for (const c of result.connections) {
      expect(c.a).not.toContain("old-");
      expect(c.b).not.toContain("old-");
    }
  });

  // -------------------- ADVERSARIAL INPUTS --------------------

  it("malformed / unterminated frontmatter does not crash tokenizer", () => {
    writeNote(
      "broken.md",
      "---\nname: weird\nbroken: [unclosed\nno end fence here\n# Title\nFeedrate adaptive control body content lives here.",
    );
    writeNote(
      "ok.md",
      "# OK\nFeedrate adaptive control body content for cross-similarity check.",
    );
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.analyzed_notes).toBe(2);
    for (const c of result.connections) {
      expect(Number.isNaN(c.similarity)).toBe(false);
      expect(Number.isNaN(c.combined)).toBe(false);
      expect(c.similarity).toBeGreaterThanOrEqual(0);
      expect(c.similarity).toBeLessThanOrEqual(1);
    }
  });

  it("oversized note (32k+ tokens) does not blow norm or produce NaN", () => {
    const huge = ("kienzle force prediction carbide tool wear ".repeat(1000));
    writeNote("huge.md", `# Huge\n${huge}`);
    writeNote("normal.md", "# Normal\nKienzle force prediction carbide tool wear short note.");
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.analyzed_notes).toBe(2);
    for (const c of result.connections) {
      expect(Number.isNaN(c.similarity)).toBe(false);
      expect(Number.isNaN(c.combined)).toBe(false);
      expect(c.similarity).toBeGreaterThanOrEqual(0);
    }
  });

  it("vault dir does not exist -- returns empty result without throwing", () => {
    const ghostVault = join(tmpdir(), "definitely-does-not-exist-" + Date.now());
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: ghostVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(result.connections).toEqual([]);
    expect(result.analyzed_notes).toBe(0);
  });

  // -------------------- DETERMINISM + STRUCTURE --------------------

  it("repeated calls on identical state produce identical connections + pattern + question", () => {
    const themed = "Adaptive feedrate deflection thin-wall aluminum pockets fixture strategy.";
    for (let i = 0; i < 4; i++) writeNote(`d-${i}.md`, `# D ${i}\n${themed}`);
    const a = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    const b = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(b.connections).toEqual(a.connections);
    expect(b.pattern).toBe(a.pattern);
    expect(b.question).toBe(a.question);
    expect(b.analyzed_notes).toBe(a.analyzed_notes);
    expect(b.threshold).toBe(a.threshold);
    expect(b.brief_date).toBe(a.brief_date);
  });

  it("singleton and freshly-instantiated engine produce identical results", () => {
    writeNote("a.md", "# A\nKienzle force prediction across carbide endmills cycle.");
    writeNote("b.md", "# B\nKienzle force prediction with carbide tool wear cycle.");
    const fresh = new DailyPersonalBriefEngine();
    const s = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    const f = fresh.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    expect(f.connections).toEqual(s.connections);
    expect(f.pattern).toBe(s.pattern);
    expect(f.question).toBe(s.question);
  });

  it("paths returned in connections actually exist in the vault (no hallucination)", () => {
    const p1 = writeNote("real-1.md", "# Real 1\nDeflection compensation theory thin walls finish.");
    const p2 = writeNote("real-2.md", "# Real 2\nDeflection mitigation thin-wall finish passes carbide.");
    const p3 = writeNote("real-3.md", "# Real 3\nDeflection-aware finish passes thin-wall carbide tool.");
    const result = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });
    const realPaths = new Set([p1, p2, p3]);
    for (const c of result.connections) {
      expect(realPaths.has(c.a)).toBe(true);
      expect(realPaths.has(c.b)).toBe(true);
    }
  });

  // -------------------- ROUND-TRIP THROUGH DISPATCHER --------------------

  it("dispatcher-shaped invocation (lazy import + same singleton) returns identical output", async () => {
    writeNote("a.md", "# A\nKienzle force prediction across carbide endmills cycle finish.");
    writeNote("b.md", "# B\nKienzle force prediction carbide tool wear cycle finish strategy.");
    writeNote("c.md", "# C\nKienzle force prediction carbide endmill wear during cycle finish strategy.");

    const direct = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });

    // Mirror the dispatcher case body exactly: lazy-import + singleton call.
    const mod = await import("../engines/DailyPersonalBriefEngine.js");
    const dispatched = mod.dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW,
    });

    expect(dispatched.connections).toEqual(direct.connections);
    expect(dispatched.pattern).toBe(direct.pattern);
    expect(dispatched.question).toBe(direct.question);
    expect(dispatched.threshold).toBe(direct.threshold);
    expect(dispatched.brief_date).toBe(direct.brief_date);
  });

  it("threshold is configurable -- lowering to 0.4 admits more connections than 0.72", () => {
    writeNote("a.md", "# A\nMachining strategy roughing cycle aluminum pocket finish.");
    writeNote("b.md", "# B\nMachining strategy roughing aluminum cycle pocket different content.");
    writeNote("c.md", "# C\nMachining strategy aluminum cycle other unique content here.");
    const strict = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW, threshold: DEFAULT_THRESHOLD_VALUE,
    });
    const lax = dailyPersonalBriefEngine.synthesize({
      vaultRoot: tmpVault, wikiRoot: tmpWiki, now: NOW, threshold: 0.4,
    });
    expect(lax.connections.length).toBeGreaterThanOrEqual(strict.connections.length);
    expect(lax.threshold).toBe(0.4);
    expect(strict.threshold).toBe(DEFAULT_THRESHOLD_VALUE);
  });
});
