import { describe, it, expect } from "vitest";
import { CADCorpusPatternEngine } from "../engines/CADCorpusPatternEngine.js";
import type { CorpusManifest, CADCorpusEntry } from "../engines/CADCorpusIngestionEngine.js";
import type { PartClass } from "../engines/BlueprintVisionOCREngine.js";

const engine = new CADCorpusPatternEngine();

function entry(partial: Partial<CADCorpusEntry> & { rel_path: string; part_class: PartClass; size_bytes: number }): CADCorpusEntry {
  return {
    abs_path: `/abs/${partial.rel_path}`,
    rel_path: partial.rel_path,
    ext: partial.ext ?? ".step",
    size_bytes: partial.size_bytes,
    mtime_ms: partial.mtime_ms ?? Date.now(),
    part_class: partial.part_class,
    classifier_confidence: partial.classifier_confidence ?? 0.8,
    classifier_match: partial.classifier_match,
    source_bucket: partial.source_bucket,
  };
}

function fakeManifest(entries: CADCorpusEntry[]): CorpusManifest {
  const byClass: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  for (const e of entries) {
    byClass[e.part_class] = (byClass[e.part_class] ?? 0) + 1;
    byFormat[e.ext] = (byFormat[e.ext] ?? 0) + 1;
  }
  return {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    root: "/test/root",
    total_entries: entries.length,
    by_class: byClass,
    by_format: byFormat,
    entries,
  };
}

describe("CADCorpusPatternEngine.classifiedPercentage", () => {
  it("returns 0 for empty manifest", () => {
    expect(engine.classifiedPercentage(fakeManifest([]))).toBe(0);
  });

  it("returns 100 when all entries are classified (none 'general')", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/punch1.step", part_class: "extrude_punch", size_bytes: 1000 }),
      entry({ rel_path: "a/die1.step", part_class: "die", size_bytes: 2000 }),
    ]);
    expect(engine.classifiedPercentage(m)).toBe(100);
  });

  it("returns 50 when half are 'general'", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/punch1.step", part_class: "extrude_punch", size_bytes: 1000 }),
      entry({ rel_path: "a/widget.step", part_class: "general", size_bytes: 500 }),
    ]);
    expect(engine.classifiedPercentage(m)).toBe(50);
  });

  it("rounds to one decimal place (1/3 → 33.3)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/x.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/y.step", part_class: "general", size_bytes: 100 }),
      entry({ rel_path: "a/z.step", part_class: "general", size_bytes: 100 }),
    ]);
    expect(engine.classifiedPercentage(m)).toBe(33.3);
  });
});

describe("CADCorpusPatternEngine.topTokens", () => {
  it("returns empty array when no token meets MIN_TOKEN_FREQ=3", () => {
    const m = fakeManifest([entry({ rel_path: "a/uniqueXYZ123.step", part_class: "general", size_bytes: 100 })]);
    expect(engine.topTokens(m, 50).length).toBe(0);
  });

  it("aggregates token counts across entries (PUNCH appearing 3+ times → count=3)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/PUNCH POINT TIP.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/PUNCH ALPHA.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/PUNCH BETA.step", part_class: "extrude_punch", size_bytes: 100 }),
    ]);
    const tokens = engine.topTokens(m, 50);
    const punch = tokens.find((t) => t.token === "PUNCH");
    expect(punch?.count).toBe(3);
  });

  it("filters out stopwords (THE, AND, FOR) and machine tokens (OKUMA, HAAS)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/THE OKUMA HAAS PART.step", part_class: "general", size_bytes: 100 }),
      entry({ rel_path: "a/AND OKUMA THE PART.step", part_class: "general", size_bytes: 100 }),
      entry({ rel_path: "a/FOR HAAS THE PART.step", part_class: "general", size_bytes: 100 }),
    ]);
    const tokens = engine.topTokens(m, 50);
    const stopwordCount = ["THE", "AND", "FOR", "OKUMA", "HAAS"].filter((sw) => tokens.some((t) => t.token === sw)).length;
    expect(stopwordCount).toBe(0);
  });

  it("filters out tokens shorter than MIN_TOKEN_LEN=3 chars (A, B, XX rejected)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/A B C XX YY ZZ TOKEN ABC DEF GHI.step", part_class: "general", size_bytes: 100 }),
      entry({ rel_path: "a/A B C ABC DEF GHI.step", part_class: "general", size_bytes: 100 }),
      entry({ rel_path: "a/A B C ABC DEF GHI.step", part_class: "general", size_bytes: 100 }),
    ]);
    const tokens = engine.topTokens(m, 50);
    const tooShort = ["A", "B", "C", "XX", "YY", "ZZ"].filter((sw) => tokens.some((t) => t.token === sw)).length;
    expect(tooShort).toBe(0);
  });

  it("respects limit parameter (limit=5 → length ≤ 5)", () => {
    const entries: CADCorpusEntry[] = [];
    for (let i = 0; i < 30; i++) {
      entries.push(entry({ rel_path: `a/TOKEN${i % 10} PUNCH FILE.step`, part_class: "extrude_punch", size_bytes: 100 }));
    }
    expect(engine.topTokens(fakeManifest(entries), 5).length).toBeLessThanOrEqual(5);
  });

  it("sorts results in descending count order", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/PUNCH ABC.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/PUNCH XYZ.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/PUNCH DEF.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/MOLD GHI.step", part_class: "die", size_bytes: 100 }),
      entry({ rel_path: "a/MOLD JKL.step", part_class: "die", size_bytes: 100 }),
      entry({ rel_path: "a/MOLD MNO.step", part_class: "die", size_bytes: 100 }),
    ]);
    const tokens = engine.topTokens(m, 50);
    let outOfOrder = 0;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i - 1]!.count < tokens[i]!.count) outOfOrder++;
    }
    expect(outOfOrder).toBe(0);
  });
});

describe("CADCorpusPatternEngine.sizeStatsByClass", () => {
  it("returns one entry per part class present in the manifest", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/p1.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/d1.step", part_class: "die", size_bytes: 1000 }),
    ]);
    expect(engine.sizeStatsByClass(m).length).toBe(2);
  });

  it("median for [100, 200, 300] equals 200 (p50 index = 1)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/x.step", part_class: "die", size_bytes: 100 }),
      entry({ rel_path: "a/y.step", part_class: "die", size_bytes: 200 }),
      entry({ rel_path: "a/z.step", part_class: "die", size_bytes: 300 }),
    ]);
    const die = engine.sizeStatsByClass(m).find((s) => s.class === "die");
    expect(die?.median_bytes).toBe(200);
    expect(die?.count).toBe(3);
    expect(die?.mean_bytes).toBe(200);
  });

  it("sorts results descending by count (die wins 3-vs-1 over extrude_punch)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/p1.step", part_class: "extrude_punch", size_bytes: 100 }),
      entry({ rel_path: "a/d1.step", part_class: "die", size_bytes: 100 }),
      entry({ rel_path: "a/d2.step", part_class: "die", size_bytes: 200 }),
      entry({ rel_path: "a/d3.step", part_class: "die", size_bytes: 300 }),
    ]);
    const stats = engine.sizeStatsByClass(m);
    expect(stats[0]?.class).toBe("die");
    expect(stats[0]?.count).toBe(3);
  });
});

describe("CADCorpusPatternEngine.recoverUnclassified", () => {
  it("'2475-037 PUNCH POINT' recovers as extrude_punch with JM Die part-number boost (>0.9)", () => {
    const m = fakeManifest([
      entry({ rel_path: "OKUMA/2475-037 PUNCH POINT.step", part_class: "general", size_bytes: 1000 }),
    ]);
    const recovered = engine.recoverUnclassified(m);
    expect(recovered.length).toBe(1);
    expect(recovered[0]?.recovered_class).toBe("extrude_punch");
    expect(recovered[0]?.confidence).toBeGreaterThan(0.9);
  });

  it("'TRIM PROFILE 4140' recovers as die at confidence 0.7", () => {
    const m = fakeManifest([
      entry({ rel_path: "OKUMA/TRIM PROFILE 4140.step", part_class: "general", size_bytes: 1000 }),
    ]);
    const recovered = engine.recoverUnclassified(m);
    expect(recovered[0]?.recovered_class).toBe("die");
    expect(recovered[0]?.confidence).toBe(0.7);
  });

  it("does NOT recover already-classified entries (length stays 0)", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/2475-037 PUNCH.step", part_class: "extrude_punch", size_bytes: 1000 }),
    ]);
    expect(engine.recoverUnclassified(m).length).toBe(0);
  });

  it("first-match-wins ordering — PUNCH precedes DIE in rule order", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/DIE PUNCH HYBRID.step", part_class: "general", size_bytes: 1000 }),
    ]);
    const recovered = engine.recoverUnclassified(m);
    expect(recovered[0]?.recovered_class).toBe("extrude_punch");
  });

  it("returns empty array when nothing matches the heuristics", () => {
    const m = fakeManifest([
      entry({ rel_path: "a/UNKNOWN_WIDGET_XYZ.step", part_class: "general", size_bytes: 1000 }),
    ]);
    expect(engine.recoverUnclassified(m).length).toBe(0);
  });
});

describe("CADCorpusPatternEngine.bucketAffinity", () => {
  it("returns dominant class per source bucket (OKUMA → die at count=2)", () => {
    const m = fakeManifest([
      entry({ rel_path: "OKUMA/d1.step", part_class: "die", size_bytes: 100, source_bucket: "OKUMA" }),
      entry({ rel_path: "OKUMA/d2.step", part_class: "die", size_bytes: 100, source_bucket: "OKUMA" }),
      entry({ rel_path: "OKUMA/p1.step", part_class: "extrude_punch", size_bytes: 100, source_bucket: "OKUMA" }),
      entry({ rel_path: "HAAS/p1.step", part_class: "extrude_punch", size_bytes: 100, source_bucket: "HAAS" }),
    ]);
    const aff = engine.bucketAffinity(m);
    const okuma = aff.find((a) => a.bucket === "OKUMA");
    expect(okuma?.dominant_class).toBe("die");
    expect(okuma?.count).toBe(2);
  });

  it("ignores 'general' class when picking dominant (extrude_punch wins over 2 general)", () => {
    const m = fakeManifest([
      entry({ rel_path: "X/g1.step", part_class: "general", size_bytes: 100, source_bucket: "X" }),
      entry({ rel_path: "X/g2.step", part_class: "general", size_bytes: 100, source_bucket: "X" }),
      entry({ rel_path: "X/p1.step", part_class: "extrude_punch", size_bytes: 100, source_bucket: "X" }),
    ]);
    const aff = engine.bucketAffinity(m);
    const x = aff.find((a) => a.bucket === "X");
    expect(x?.dominant_class).toBe("extrude_punch");
  });

  it("buckets with only 'general' entries are excluded entirely (length 0 in result)", () => {
    const m = fakeManifest([
      entry({ rel_path: "Y/g1.step", part_class: "general", size_bytes: 100, source_bucket: "Y" }),
    ]);
    const aff = engine.bucketAffinity(m);
    expect(aff.filter((a) => a.bucket === "Y").length).toBe(0);
  });

  it("sorts buckets descending by count (B with 3 dies first)", () => {
    const m = fakeManifest([
      entry({ rel_path: "A/d1.step", part_class: "die", size_bytes: 100, source_bucket: "A" }),
      entry({ rel_path: "B/d1.step", part_class: "die", size_bytes: 100, source_bucket: "B" }),
      entry({ rel_path: "B/d2.step", part_class: "die", size_bytes: 100, source_bucket: "B" }),
      entry({ rel_path: "B/d3.step", part_class: "die", size_bytes: 100, source_bucket: "B" }),
    ]);
    const aff = engine.bucketAffinity(m);
    expect(aff[0]?.bucket).toBe("B");
    expect(aff[0]?.count).toBe(3);
  });
});

describe("CADCorpusPatternEngine.applyRecoveries", () => {
  it("returns a new manifest with reclassified entries reflected in by_class counts", () => {
    const m = fakeManifest([
      entry({ rel_path: "OKUMA/2475-037 PUNCH.step", part_class: "general", size_bytes: 1000 }),
      entry({ rel_path: "OKUMA/d1.step", part_class: "die", size_bytes: 1000 }),
    ]);
    const recovered = engine.recoverUnclassified(m);
    const newM = engine.applyRecoveries(m, recovered);
    expect(newM.by_class.extrude_punch ?? 0).toBe(1);
    expect(newM.by_class.die ?? 0).toBe(1);
    expect(newM.by_class.general ?? 0).toBe(0);
  });

  it("preserves unrecovered entries unchanged (general stays general)", () => {
    const m = fakeManifest([
      entry({ rel_path: "OKUMA/UNKNOWN.step", part_class: "general", size_bytes: 1000 }),
    ]);
    const newM = engine.applyRecoveries(m, []);
    expect(newM.by_class.general).toBe(1);
    expect(newM.entries[0]?.part_class).toBe("general");
  });
});

describe("CADCorpusPatternEngine.mine", () => {
  it("produces a complete CorpusInsights snapshot in one call", () => {
    const m = fakeManifest([
      entry({ rel_path: "OKUMA/PUNCH ALPHA.step", part_class: "extrude_punch", size_bytes: 1000, source_bucket: "OKUMA" }),
      entry({ rel_path: "OKUMA/PUNCH BETA.step", part_class: "extrude_punch", size_bytes: 2000, source_bucket: "OKUMA" }),
      entry({ rel_path: "OKUMA/PUNCH GAMMA.step", part_class: "extrude_punch", size_bytes: 3000, source_bucket: "OKUMA" }),
      entry({ rel_path: "OKUMA/2475-037 PUNCH.step", part_class: "general", size_bytes: 4000, source_bucket: "OKUMA" }),
    ]);
    const insights = engine.mine(m);
    expect(insights.total_entries).toBe(4);
    expect(insights.classified_pct).toBe(75);
    expect(insights.top_tokens.length).toBeGreaterThan(0);
    expect(insights.size_stats.length).toBeGreaterThan(0);
    expect(insights.recovered.length).toBe(1);
    expect(insights.bucket_affinity.length).toBe(1);
  });
});
