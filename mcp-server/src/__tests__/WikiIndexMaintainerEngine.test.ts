/**
 * WikiIndexMaintainerEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI02
 *
 * Behavior assertions only. Every test exercises a concrete contract from
 * WIKI_SCHEMA.md §4.1 (entry format), §6.7 (conflict resolution), or the
 * lock + atomic-write guarantee.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WikiIndexMaintainerEngine,
  parseIndex,
  formatIndex,
  resolveConflict,
  entriesEqual,
  type WikiEntry,
} from "../engines/WikiIndexMaintainerEngine.js";

let TMP: string;
let indexPath: string;
let jsonlPath: string;
let engine: WikiIndexMaintainerEngine;

const TODAY = "2026-04-27";

function entry(overrides: Partial<WikiEntry>): WikiEntry {
  return {
    slug: "force-kienzle",
    category: "concepts",
    summary: "Specific cutting energy via Kienzle equation.",
    sources: ["src/physics/constants.ts"],
    confidence: 0.85,
    last_verified: TODAY,
    source: "claude",
    ...overrides,
  };
}

beforeEach(async () => {
  TMP = await fs.mkdtemp(join(tmpdir(), "wiki-idx-"));
  indexPath = join(TMP, "index.md");
  jsonlPath = join(TMP, "index.jsonl");
  engine = new WikiIndexMaintainerEngine(indexPath, jsonlPath);
});

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe("WikiIndexMaintainerEngine.upsert — happy path", () => {
  it("first upsert produces an entry line that matches WIKI_SCHEMA §4.1 format byte-for-byte", async () => {
    const r = await engine.upsert(entry({}));
    expect(r.added).toStrictEqual(true);
    expect(r.updated).toStrictEqual(false);
    expect(r.slug).toStrictEqual("force-kienzle");

    const md = await fs.readFile(indexPath, "utf-8");
    const lines = md.split(/\r?\n/).filter((l) => l.startsWith("- [[force-kienzle]]"));
    expect(lines).toHaveLength(1);
    const exactLine =
      "- [[force-kienzle]] — Specific cutting energy via Kienzle equation. " +
      "| category:concepts | sources:1 | confidence:0.85 | last_verified:2026-04-27 " +
      "| source:src/physics/constants.ts";
    expect(lines[0]).toStrictEqual(exactLine);
  });

  it("jsonl sidecar contains exactly one record with full payload", async () => {
    await engine.upsert(entry({}));
    const raw = await fs.readFile(jsonlPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
    const obj = JSON.parse(lines[0]) as WikiEntry;
    expect(obj.slug).toStrictEqual("force-kienzle");
    expect(obj.category).toStrictEqual("concepts");
    expect(obj.confidence).toStrictEqual(0.85);
    expect(obj.last_verified).toStrictEqual(TODAY);
    expect(obj.sources).toStrictEqual(["src/physics/constants.ts"]);
  });

  it("upsert with identical payload reports unchanged (no false update)", async () => {
    await engine.upsert(entry({}));
    const r = await engine.upsertMany([entry({})]);
    expect(r.added).toStrictEqual(0);
    expect(r.updated).toStrictEqual(0);
    expect(r.unchanged).toStrictEqual(1);
    expect(r.results[0].slug).toStrictEqual("force-kienzle");
  });

  it("newer last_verified produces an incoming-wins update with refreshed confidence", async () => {
    await engine.upsert(entry({ confidence: 0.7, last_verified: "2026-04-25" }));
    const r = await engine.upsert(entry({ confidence: 0.95, last_verified: "2026-04-27" }));
    expect(r.updated).toStrictEqual(true);
    expect(r.conflict_resolved).toStrictEqual("incoming-wins");
    const fetched = await engine.getBySlug("force-kienzle");
    expect(fetched?.confidence).toStrictEqual(0.95);
    expect(fetched?.last_verified).toStrictEqual("2026-04-27");
  });

  it("upsertMany bulk-writes 3 entries in one lock", async () => {
    const r = await engine.upsertMany([
      entry({ slug: "force-kienzle", category: "concepts" }),
      entry({ slug: "thermal-johnson-cook", category: "concepts" }),
      entry({ slug: "ITW", category: "entities", summary: "ITW customer profile" }),
    ]);
    expect(r.added).toStrictEqual(3);
    expect(r.updated).toStrictEqual(0);
    expect(r.unchanged).toStrictEqual(0);
    const jl = (await fs.readFile(jsonlPath, "utf-8")).trim().split("\n");
    expect(jl).toHaveLength(3);
    const slugs = jl.map((l) => (JSON.parse(l) as WikiEntry).slug).sort();
    expect(slugs).toStrictEqual(["ITW", "force-kienzle", "thermal-johnson-cook"]);
  });
});

describe("WikiIndexMaintainerEngine.upsert — failure modes", () => {
  it("rejects bad slug containing whitespace", async () => {
    await expect(engine.upsert(entry({ slug: "BAD SLUG" }))).rejects.toThrow(/slug required/);
  });

  it("rejects unknown category not in §8 enum", async () => {
    await expect(engine.upsert(entry({ category: "alchemy" }))).rejects.toThrow(
      /category must be one of/
    );
  });

  it("rejects empty sources array", async () => {
    await expect(engine.upsert(entry({ sources: [] }))).rejects.toThrow(/sources must be non-empty/);
  });

  it("rejects NaN confidence", async () => {
    await expect(engine.upsert(entry({ confidence: NaN }))).rejects.toThrow(/confidence must be finite/);
  });

  it("rejects Infinity confidence", async () => {
    await expect(engine.upsert(entry({ confidence: Infinity }))).rejects.toThrow(
      /confidence must be finite/
    );
  });

  it("rejects out-of-range confidence (1.5)", async () => {
    await expect(engine.upsert(entry({ confidence: 1.5 }))).rejects.toThrow(
      /confidence must be in/
    );
  });

  it("rejects malformed last_verified", async () => {
    await expect(engine.upsert(entry({ last_verified: "yesterday" }))).rejects.toThrow(
      /last_verified required/
    );
  });
});

describe("WikiIndexMaintainerEngine — read / lookup", () => {
  beforeEach(async () => {
    await engine.upsertMany([
      entry({ slug: "force-kienzle", category: "concepts" }),
      entry({ slug: "thermal-johnson-cook", category: "concepts" }),
      entry({ slug: "ITW", category: "entities", summary: "Big customer" }),
    ]);
  });

  it("read() returns 3 entries with correct sorted slugs", async () => {
    const all = await engine.read();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.slug).sort()).toStrictEqual([
      "ITW",
      "force-kienzle",
      "thermal-johnson-cook",
    ]);
  });

  it("getBySlug returns full entry with category and summary intact", async () => {
    const e = await engine.getBySlug("ITW");
    expect(e?.category).toStrictEqual("entities");
    expect(e?.summary).toStrictEqual("Big customer");
    expect(e?.confidence).toStrictEqual(0.85);
  });

  it("getBySlug for absent slug yields no result and remove() reports false", async () => {
    const fetched = await engine.getBySlug("does-not-exist-anywhere");
    expect(fetched === undefined).toStrictEqual(true);
    expect(await engine.remove("does-not-exist-anywhere")).toStrictEqual(false);
    const all = await engine.read();
    expect(all).toHaveLength(3);
  });

  it("getByCategory('concepts') returns 2 of 3", async () => {
    const concepts = await engine.getByCategory("concepts");
    expect(concepts).toHaveLength(2);
    expect(concepts.map((e) => e.slug).sort()).toStrictEqual([
      "force-kienzle",
      "thermal-johnson-cook",
    ]);
  });
});

describe("WikiIndexMaintainerEngine.remove", () => {
  it("removes the slug from index and jsonl atomically", async () => {
    await engine.upsertMany([
      entry({ slug: "force-kienzle" }),
      entry({ slug: "thermal-johnson-cook" }),
    ]);
    const removed = await engine.remove("force-kienzle");
    expect(removed).toStrictEqual(true);
    const all = await engine.read();
    expect(all).toHaveLength(1);
    expect(all[0].slug).toStrictEqual("thermal-johnson-cook");
    const jl = (await fs.readFile(jsonlPath, "utf-8")).trim().split("\n");
    expect(jl).toHaveLength(1);
    expect((JSON.parse(jl[0]) as WikiEntry).slug).toStrictEqual("thermal-johnson-cook");
  });

  it("returns false when slug is absent (no rewrite)", async () => {
    expect(await engine.remove("ghost")).toStrictEqual(false);
  });
});

describe("resolveConflict — WIKI_SCHEMA §6.7 priority", () => {
  it("(a) latest last_verified wins", () => {
    expect(
      resolveConflict(
        entry({ last_verified: "2026-04-25" }),
        entry({ last_verified: "2026-04-27" })
      )
    ).toStrictEqual("incoming");
  });

  it("(a) older last_verified loses", () => {
    expect(
      resolveConflict(
        entry({ last_verified: "2026-04-27" }),
        entry({ last_verified: "2026-04-25" })
      )
    ).toStrictEqual("existing");
  });

  it("(b) on tied date, larger sources array wins", () => {
    expect(
      resolveConflict(entry({ sources: ["a"] }), entry({ sources: ["a", "b"] }))
    ).toStrictEqual("incoming");
  });

  it("(c) on tied date+sources, hash differs → incoming wins", () => {
    expect(
      resolveConflict(entry({ summary: "old phrasing" }), entry({ summary: "new phrasing" }))
    ).toStrictEqual("incoming");
  });

  it("(c) identical payloads → existing wins (no thrash)", () => {
    expect(resolveConflict(entry({}), entry({}))).toStrictEqual("existing");
    expect(entriesEqual(entry({}), entry({}))).toStrictEqual(true);
  });
});

describe("WikiIndexMaintainerEngine — concurrency (3-chat race)", () => {
  it("3 distinct upserts in parallel: all 3 reach disk", async () => {
    const slugs = ["a-engine", "b-engine", "c-engine"];
    await Promise.all(slugs.map((s) => engine.upsert(entry({ slug: s }))));
    const all = await engine.read();
    expect(all.map((e) => e.slug).sort()).toStrictEqual(slugs);
    const jl = (await fs.readFile(jsonlPath, "utf-8")).trim().split("\n");
    expect(jl).toHaveLength(3);
  });

  it("rapid 10x duplicate flood collapses to exactly one entry", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => engine.upsert(entry({ slug: "race-engine" })))
    );
    const all = await engine.read();
    expect(all).toHaveLength(1);
    expect(all[0].slug).toStrictEqual("race-engine");
  });

  it("conflicting same-slug racers leave exactly one record (lock holds)", async () => {
    await Promise.all([
      engine.upsert(entry({ slug: "tied", confidence: 0.7, last_verified: "2026-04-25" })),
      engine.upsert(entry({ slug: "tied", confidence: 0.95, last_verified: "2026-04-27" })),
    ]);
    const all = await engine.read();
    expect(all).toHaveLength(1);
    expect(all[0].slug).toStrictEqual("tied");
  });
});

describe("parseIndex / formatIndex — round-trip", () => {
  it("formatIndex output round-trips through parseIndex preserving slug+category+confidence+date", () => {
    const entries: WikiEntry[] = [
      entry({ slug: "force-kienzle", category: "concepts" }),
      entry({ slug: "thermal", category: "concepts", summary: "Heat dissipation" }),
      entry({ slug: "ITW", category: "entities", summary: "ITW customer profile" }),
    ];
    const md = formatIndex(entries, TODAY);
    const parsed = parseIndex(md);
    expect(parsed).toHaveLength(3);
    const ki = parsed.find((e) => e.slug === "force-kienzle");
    expect(ki?.category).toStrictEqual("concepts");
    expect(ki?.confidence).toStrictEqual(0.85);
    expect(ki?.last_verified).toStrictEqual(TODAY);
    const itw = parsed.find((e) => e.slug === "ITW");
    expect(itw?.category).toStrictEqual("entities");
    expect(itw?.summary).toStrictEqual("ITW customer profile");
  });

  it("parseIndex returns [] on empty input", () => {
    expect(parseIndex("")).toStrictEqual([]);
  });

  it("parseIndex skips lines that don't match the §4.1 entry shape", () => {
    const noise =
      "# random heading\n\nnot a list\n- bullet without [[wikilink]]\n## not_a_known_category\n";
    expect(parseIndex(noise)).toStrictEqual([]);
  });
});

describe("WikiIndexMaintainerEngine — adversarial input", () => {
  it("oversized summary (5000 chars) is stored verbatim — truncation is a lint policy, not a write policy", async () => {
    const big = "x".repeat(5000);
    await engine.upsert(entry({ summary: big }));
    const e = await engine.getBySlug("force-kienzle");
    expect(e?.summary.length).toStrictEqual(5000);
  });

  it("empty summary is rejected", async () => {
    await expect(engine.upsert(entry({ summary: "" }))).rejects.toThrow(/summary required/);
  });

  it("zero confidence (boundary) is allowed and preserved", async () => {
    const r = await engine.upsert(entry({ confidence: 0 }));
    expect(r.added).toStrictEqual(true);
    const e = await engine.getBySlug("force-kienzle");
    expect(e?.confidence).toStrictEqual(0);
  });

  it("confidence exactly 1.0 (boundary) is allowed and preserved", async () => {
    const r = await engine.upsert(entry({ confidence: 1 }));
    expect(r.added).toStrictEqual(true);
    const e = await engine.getBySlug("force-kienzle");
    expect(e?.confidence).toStrictEqual(1);
  });
});
