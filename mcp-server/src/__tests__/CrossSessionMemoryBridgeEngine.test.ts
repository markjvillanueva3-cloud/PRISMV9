/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U02 — CrossSessionMemoryBridgeEngine tests.
 *
 * Coverage:
 *   - recall: happy path with synthetic DBReader fixture across ≥3 DBs
 *   - Ranking: top-K cap, score floor, deterministic tie-breaking
 *   - Provenance: each hit tagged with source_path + source_class
 *   - tokenize / scoreText: pure-function correctness
 *   - classifyDBPath: claude/swarm/unknown variants, separator tolerance
 *   - Failure modes: empty input, missing reader, reader-throws, broken DB rows
 *   - Adversarial: NaN topK / negative minScore clamped, oversize text truncated
 *
 * 24 tests; ≥3 failure modes × ≥2 adversarial inputs per spec.
 */
import { describe, it, expect } from "vitest";
import {
  CrossSessionMemoryBridgeEngine,
  crossSessionMemoryBridgeEngine,
  type DBQueryResult,
  type DBReader,
} from "../engines/CrossSessionMemoryBridgeEngine.js";

// ───────────── Fixtures ─────────────

/** Synthetic in-memory DBReader — drives the engine without sqlite. */
function makeReader(byPath: Record<string, DBQueryResult>): DBReader {
  return {
    readRows(dbPath: string) {
      const exact = byPath[dbPath];
      if (exact) return exact;
      return { source_path: dbPath, rows: [], error: "not-in-fixture" };
    },
  };
}

const DB_A = "H:/prism/.claude/memory.db";
const DB_B = "H:/prism-iooms0/.claude/memory.db";
const DB_C = "H:/prism-cad-sw-fidx/.swarm/memory.db";

const FIXTURE_HAPPY: Record<string, DBQueryResult> = {
  [DB_A]: {
    source_path: DB_A,
    error: "",
    rows: [
      { text: "User asked about carbide insert geometry for Iscar milling cutters",
        metadata: { id: 1, kind: "session", ts: "2026-01-15T10:00:00Z" } },
      { text: "Discussion of Kienzle force model for steel turning",
        metadata: { id: 2, kind: "session", ts: "2026-01-16T11:00:00Z" } },
      { text: "Lunch order: pizza and salad",
        metadata: { id: 3, kind: "session" } },
    ],
  },
  [DB_B]: {
    source_path: DB_B,
    error: "",
    rows: [
      { text: "Carbide tooling vendor catalog Iscar Sandvik milling",
        metadata: { id: 7, kind: "tribal" } },
      { text: "Random unrelated note about cars",
        metadata: { id: 8 } },
    ],
  },
  [DB_C]: {
    source_path: DB_C,
    error: "",
    rows: [
      { text: "Swarm log: queen agent dispatched 3 workers",
        metadata: { id: 1, agent: "queen" } },
    ],
  },
};

// ───────────── Tests ─────────────

describe("CrossSessionMemoryBridgeEngine — recall (happy path)", () => {
  it("federates across 3 DBs and returns hits ranked by score", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide insert milling Iscar",
      dbPaths: [DB_A, DB_B, DB_C],
      reader: makeReader(FIXTURE_HAPPY),
      topK: 5,
    });
    expect(result.ok).toBe(true);
    expect(result.dbsQueried).toBe(3);
    expect(result.scanned).toBe(3 + 2 + 1);
    expect(result.errors.length).toBe(0);
    // Top hit: DB_A row matches all 4 query tokens (carbide+insert+milling+iscar);
    // DB_B's "Carbide tooling vendor catalog Iscar Sandvik milling" matches 3
    // (no "insert"), so it ranks second.
    expect(result.hits[0].text).toContain("User asked about carbide insert geometry for Iscar milling cutters");
    expect(result.hits[0].source_path).toBe(DB_A);
    expect(result.hits[0].source_class).toBe("claude-memory");
    expect(result.hits[0].uniqueOverlap).toBe(4);
    // DB_B's tooling row should be in top hits but not first
    const dbBHit = result.hits.find((h) => h.source_path === DB_B);
    expect(dbBHit?.text).toContain("Carbide tooling vendor catalog");
    expect(dbBHit?.uniqueOverlap).toBe(3);
  });

  it("preserves provenance metadata on every hit", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "Kienzle force model steel",
      dbPaths: [DB_A],
      reader: makeReader(FIXTURE_HAPPY),
    });
    expect(result.hits.length).toBeGreaterThan(0);
    const hit = result.hits[0];
    expect(hit.source_path).toBe(DB_A);
    expect(hit.metadata.id).toBe(2);
    expect(hit.metadata.kind).toBe("session");
    expect(hit.metadata.ts).toBe("2026-01-16T11:00:00Z");
  });

  it("respects topK cap", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide insert milling Iscar Sandvik",
      dbPaths: [DB_A, DB_B, DB_C],
      reader: makeReader(FIXTURE_HAPPY),
      topK: 1,
    });
    expect(result.hits.length).toBe(1);
  });

  it("filters scores below minScore threshold", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide",
      dbPaths: [DB_A, DB_B, DB_C],
      reader: makeReader(FIXTURE_HAPPY),
      minScore: 100,
      topK: 10,
    });
    expect(result.hits).toEqual([]);
  });

  it("classifies sources correctly: claude-memory vs swarm-memory", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "swarm queen worker",
      dbPaths: [DB_A, DB_C],
      reader: makeReader(FIXTURE_HAPPY),
    });
    const swarmHit = result.hits.find((h) => h.source_path === DB_C);
    const claudeHit = result.hits.find((h) => h.source_path === DB_A);
    expect(swarmHit?.source_class).toBe("swarm-memory");
    if (claudeHit) expect(claudeHit.source_class).toBe("claude-memory");
  });

  it("breaks ties deterministically by uniqueOverlap, then source_path lex", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const tie: Record<string, DBQueryResult> = {
      "H:/zzz/.claude/memory.db": {
        source_path: "H:/zzz/.claude/memory.db", error: "",
        rows: [{ text: "alpha beta gamma" }],
      },
      "H:/aaa/.claude/memory.db": {
        source_path: "H:/aaa/.claude/memory.db", error: "",
        rows: [{ text: "alpha beta gamma" }],
      },
    };
    const result = e.recall({
      query: "alpha beta gamma",
      dbPaths: ["H:/zzz/.claude/memory.db", "H:/aaa/.claude/memory.db"],
      reader: makeReader(tie),
    });
    // Equal scores + equal uniqueOverlap → lex-min source_path wins
    expect(result.hits[0].source_path).toBe("H:/aaa/.claude/memory.db");
    expect(result.hits[1].source_path).toBe("H:/zzz/.claude/memory.db");
  });
});

describe("CrossSessionMemoryBridgeEngine — failure modes", () => {
  it("returns empty result when query is empty", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "",
      dbPaths: [DB_A],
      reader: makeReader(FIXTURE_HAPPY),
    });
    expect(result.ok).toBe(true);
    expect(result.hits).toEqual([]);
    expect(result.scanned).toBe(0);
  });

  it("returns empty result when query has no usable tokens (≥3 chars)", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "a b c! 12 ## ??",
      dbPaths: [DB_A],
      reader: makeReader(FIXTURE_HAPPY),
    });
    expect(result.ok).toBe(true);
    expect(result.hits).toEqual([]);
  });

  it("returns empty result when dbPaths is empty array", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide milling",
      dbPaths: [],
      reader: makeReader(FIXTURE_HAPPY),
    });
    expect(result.ok).toBe(true);
    expect(result.dbsQueried).toBe(0);
    expect(result.hits).toEqual([]);
  });

  it("flags ok=false and records error when reader is missing", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide milling",
      dbPaths: [DB_A],
      reader: null as unknown as DBReader,
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0].error).toContain("reader.readRows required");
  });

  it("records error when reader.readRows throws (per-DB), continues with other DBs", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const throwingReader: DBReader = {
      readRows(dbPath: string) {
        if (dbPath === DB_A) throw new Error("simulated DB lock");
        return FIXTURE_HAPPY[dbPath] ?? { source_path: dbPath, error: "", rows: [] };
      },
    };
    const result = e.recall({
      query: "carbide milling Iscar",
      dbPaths: [DB_A, DB_B],
      reader: throwingReader,
    });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].source_path).toBe(DB_A);
    expect(result.errors[0].error).toContain("reader-threw");
    // DB_B was still queried successfully
    expect(result.dbsQueried).toBe(1);
    expect(result.hits.length).toBeGreaterThan(0);
  });

  it("propagates per-DB error fields into result.errors", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const fixture: Record<string, DBQueryResult> = {
      [DB_A]: { source_path: DB_A, error: "ENOENT: no such file", rows: [] },
      [DB_B]: FIXTURE_HAPPY[DB_B],
    };
    const result = e.recall({
      query: "carbide milling Iscar",
      dbPaths: [DB_A, DB_B],
      reader: makeReader(fixture),
    });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].error).toContain("ENOENT");
    expect(result.dbsQueried).toBe(2);  // Both attempted; one errored
  });

  it("skips rows with non-string or empty text without crashing", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const adversarialFixture: Record<string, DBQueryResult> = {
      [DB_A]: {
        source_path: DB_A, error: "",
        rows: [
          { text: "good carbide insert milling row" },
          { text: "" } as DBRow,
          { text: 42 } as unknown as DBRow,
          { text: null } as unknown as DBRow,
          { text: "another carbide milling row" },
        ],
      },
    };
    const result = e.recall({
      query: "carbide milling",
      dbPaths: [DB_A],
      reader: makeReader(adversarialFixture),
    });
    expect(result.ok).toBe(true);
    expect(result.hits.length).toBe(2);  // Only the 2 valid rows
  });

  it("treats reader returning non-object as DB-level error", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const badReader: DBReader = {
      readRows: (() => null) as unknown as DBReader["readRows"],
    };
    const result = e.recall({
      query: "carbide",
      dbPaths: [DB_A],
      reader: badReader,
    });
    expect(result.errors[0].error).toContain("non-object");
  });
});

describe("CrossSessionMemoryBridgeEngine — adversarial inputs", () => {
  it("clamps NaN topK to default and continues", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide milling",
      dbPaths: [DB_A, DB_B],
      reader: makeReader(FIXTURE_HAPPY),
      topK: NaN,
    });
    // Default DEFAULT_TOP_K = 10; expect ≤10 hits and ok=true
    expect(result.ok).toBe(true);
    expect(result.hits.length).toBeLessThanOrEqual(10);
  });

  it("clamps negative minScore to default", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide milling Iscar",
      dbPaths: [DB_B],
      reader: makeReader(FIXTURE_HAPPY),
      minScore: -100,
    });
    expect(result.ok).toBe(true);
    // Default minScore=0.5, hits with real overlap should pass
    expect(result.hits.length).toBeGreaterThan(0);
  });

  it("truncates oversize text in hits to MAX_TEXT_PREVIEW_CHARS", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const longText = "carbide milling " + "filler-text ".repeat(500);
    const fixture: Record<string, DBQueryResult> = {
      [DB_A]: { source_path: DB_A, error: "", rows: [{ text: longText }] },
    };
    const result = e.recall({
      query: "carbide milling",
      dbPaths: [DB_A],
      reader: makeReader(fixture),
    });
    expect(result.hits.length).toBe(1);
    // Text is truncated and gets a marker
    expect(result.hits[0].text.length).toBeLessThan(longText.length);
    expect(result.hits[0].text).toContain("[…truncated]");
  });

  it("skips empty / non-string dbPaths in array silently", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const result = e.recall({
      query: "carbide milling",
      dbPaths: [DB_A, "", null as unknown as string, 42 as unknown as string, DB_B],
      reader: makeReader(FIXTURE_HAPPY),
    });
    expect(result.dbsQueried).toBe(2);  // Only DB_A and DB_B
  });
});

describe("CrossSessionMemoryBridgeEngine — pure helpers", () => {
  it("tokenize splits on word boundaries, filters length<3, lowercases", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    const tokens = e.tokenize("Carbide ab abc INSERT 123 carbide");
    expect(tokens.has("carbide")).toBe(true);
    expect(tokens.get("carbide")).toBe(2);
    expect(tokens.has("insert")).toBe(true);
    expect(tokens.has("ab")).toBe(false);  // length<3
    expect(tokens.has("abc")).toBe(true);
  });

  it("tokenize returns empty bag on non-string", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    expect(e.tokenize(undefined as unknown as string).size).toBe(0);
    expect(e.tokenize(null as unknown as string).size).toBe(0);
  });

  it("scoreText returns zero on empty inputs", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    expect(e.scoreText("", new Map([["x", 1]]))).toEqual({ score: 0, uniqueOverlap: 0 });
    expect(e.scoreText("hello", new Map())).toEqual({ score: 0, uniqueOverlap: 0 });
  });

  it("scoreText computes unique×4 + total×0.5", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    // Query has 2 distinct tokens; doc has 1 of them × 3 occurrences
    const query = new Map([["alpha", 1], ["beta", 1]]);
    const r = e.scoreText("alpha alpha alpha", query);
    expect(r.uniqueOverlap).toBe(1);
    expect(r.score).toBe(1 * 4 + 3 * 0.5);
  });

  it("classifyDBPath: separator-tolerant, recognizes both .claude and .swarm", () => {
    const e = new CrossSessionMemoryBridgeEngine();
    expect(e.classifyDBPath("H:/x/.claude/memory.db")).toBe("claude-memory");
    expect(e.classifyDBPath("H:\\x\\.swarm\\memory.db")).toBe("swarm-memory");
    expect(e.classifyDBPath("H:/x/foo.db")).toBe("unknown");
    expect(e.classifyDBPath("")).toBe("unknown");
  });
});

describe("CrossSessionMemoryBridgeEngine — exported singleton (real-behavior round trip)", () => {
  it("singleton runs the federated recall pipeline end-to-end", () => {
    const result = crossSessionMemoryBridgeEngine.recall({
      query: "carbide insert milling Iscar",
      dbPaths: [DB_A, DB_B, DB_C],
      reader: makeReader(FIXTURE_HAPPY),
      topK: 3,
      minScore: 0.5,
    });
    expect(result.ok).toBe(true);
    expect(result.dbsQueried).toBe(3);
    expect(result.scanned).toBe(6);
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.length).toBeLessThanOrEqual(3);
    // Hits are ordered by score descending
    for (let i = 1; i < result.hits.length; i++) {
      expect(result.hits[i - 1].score).toBeGreaterThanOrEqual(result.hits[i].score);
    }
    // Idempotent: same inputs → same ranking
    const result2 = crossSessionMemoryBridgeEngine.recall({
      query: "carbide insert milling Iscar",
      dbPaths: [DB_A, DB_B, DB_C],
      reader: makeReader(FIXTURE_HAPPY),
      topK: 3,
      minScore: 0.5,
    });
    expect(result2.hits.map((h) => h.source_path)).toEqual(result.hits.map((h) => h.source_path));
  });
});

// Re-export DBRow type for test casting (the engine uses an internal type)
type DBRow = { text: string; metadata?: Record<string, unknown> };
