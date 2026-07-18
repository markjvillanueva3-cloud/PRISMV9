/**
 * JMDieDocIndexEngine tests — BLACKWELL-DB-GEN-MS0/U-DB-B1 (slot:juliett).
 * Real-value assertions on the JM Die / DocuStrata document-corpus query surface.
 * Coverage: queryDocs filter logic (synthetic fixture, deterministic) · loadDocIndex
 * FAIL-LOUD (missing file + zero-parseable corpus) · mtime cache · live-corpus smoke
 * (conditional — documents.jsonl is gitignored local data: asserts load when present,
 * asserts fail-loud when absent; never a silent skip).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { writeFileSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  loadDocIndex,
  queryDocs,
  _resetDocIndexCache,
  type JMDieDocIndex,
  type JMDieDocRecord,
} from "../engines/JMDieDocIndexEngine.js";

const SAMPLE: JMDieDocRecord[] = [
  { id: "a", title: "Bracket print rev A", filename: "bracket_revA.pdf", role: "BLUEPRINT", role_tier: "T1", notebook: "Prints", folder: "ALCOA", created_at: "2026-01-15", has_text_layer: true, print_score: 0.92 },
  { id: "b", title: "Scan May 2026", filename: "scan_0507.pdf", role: "SCAN_GENERIC", role_tier: "T3", notebook: "Scans", folder: null, created_at: "2026-05-07", has_text_layer: false, print_score: 0.1 },
  { id: "c", title: "Quote 8841 ITW", filename: "quote_8841.pdf", role: "QUOTE", role_tier: "T2", notebook: "JMD Quotes", folder: "ITW", created_at: "2026-03-20", has_text_layer: true, print_score: 0.2 },
  { id: "d", title: "Bracket program note", filename: "bracket_prog.txt", role: "BLUEPRINT", role_tier: "T1", notebook: "Prints", folder: "ALCOA", created_at: "2026-02-01", has_text_layer: true, print_score: 0.88 },
];

function fixture(docs: JMDieDocRecord[] = SAMPLE): JMDieDocIndex {
  const byRole: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  for (const d of docs) {
    byRole[String(d.role)] = (byRole[String(d.role)] || 0) + 1;
    byTier[String(d.role_tier)] = (byTier[String(d.role_tier)] || 0) + 1;
  }
  return { docs, byRole, byTier, stats: { path: "<fixture>", totalLines: docs.length, parsed: docs.length, parseErrors: 0, loadedAt: 0 } };
}

describe("queryDocs — filter logic", () => {
  const idx = fixture();

  it("role filter returns only matching role (BLUEPRINT → a,d)", () => {
    const r = queryDocs({ role: "BLUEPRINT" }, idx);
    expect(r.total).toBe(2);
    expect(r.matches.map((m) => m.id).sort()).toEqual(["a", "d"]);
    expect(r.roleHistogram).toEqual({ BLUEPRINT: 2 });
  });

  it("text match spans title+filename+disk_path, case-insensitive (bracket → a,d)", () => {
    const r = queryDocs({ text: "BRACKET" }, idx);
    expect(r.matches.map((m) => m.id).sort()).toEqual(["a", "d"]);
  });

  it("role_tier exact (T1 → a,d) and notebook exact (Scans → b)", () => {
    expect(queryDocs({ role_tier: "T1" }, idx).total).toBe(2);
    const nb = queryDocs({ notebook: "Scans" }, idx);
    expect(nb.matches.map((m) => m.id)).toEqual(["b"]);
  });

  it("hasTextLayer=false isolates the scan; folder substring is case-insensitive", () => {
    expect(queryDocs({ hasTextLayer: false }, idx).matches.map((m) => m.id)).toEqual(["b"]);
    expect(queryDocs({ folder: "alcoa" }, idx).total).toBe(2);
  });

  it("minPrintScore keeps only blueprint-like docs (>=0.5 → a,d)", () => {
    const r = queryDocs({ minPrintScore: 0.5 }, idx);
    expect(r.matches.map((m) => m.id).sort()).toEqual(["a", "d"]);
  });

  it("created_at date range is inclusive (Feb–Apr → c,d)", () => {
    const r = queryDocs({ dateFrom: "2026-02-01", dateTo: "2026-04-01" }, idx);
    expect(r.matches.map((m) => m.id).sort()).toEqual(["c", "d"]);
  });

  it("combined filters AND together (BLUEPRINT + minPrintScore 0.9 → a only)", () => {
    const r = queryDocs({ role: "BLUEPRINT", minPrintScore: 0.9 }, idx);
    expect(r.matches.map((m) => m.id)).toEqual(["a"]);
  });

  it("limit caps returned but total reflects the full match (limit=1 over 2)", () => {
    const r = queryDocs({ role: "BLUEPRINT", limit: 1 }, idx);
    expect(r.total).toBe(2);
    expect(r.returned).toBe(1);
    expect(r.matches).toHaveLength(1);
  });

  it("limit is clamped to [1,500]", () => {
    expect(queryDocs({ limit: 99999 }, idx).returned).toBe(4); // only 4 docs, cap not hit but no throw
    expect(queryDocs({ limit: 0 }, idx).returned).toBeGreaterThanOrEqual(1);
  });

  it("empty filter returns all (within default limit) with a full role histogram", () => {
    const r = queryDocs({}, idx);
    expect(r.total).toBe(4);
    expect(r.roleHistogram).toEqual({ BLUEPRINT: 2, SCAN_GENERIC: 1, QUOTE: 1 });
  });
});

describe("loadDocIndex — FAIL-LOUD + cache", () => {
  let dir: string;
  beforeEach(() => {
    _resetDocIndexCache();
    dir = mkdtempSync(join(tmpdir(), "jmdoc-"));
  });

  it("throws on a missing corpus file (never a silent empty index)", async () => {
    const missing = join(dir, "nope.jsonl");
    await expect(loadDocIndex({ docsJsonlPath: missing })).rejects.toThrow(/not found/i);
  });

  it("throws when the corpus has lines but ZERO parseable records (corrupt/truncated)", async () => {
    const bad = join(dir, "garbage.jsonl");
    writeFileSync(bad, "not json\n{also bad\n\n42\n", "utf8");
    await expect(loadDocIndex({ docsJsonlPath: bad })).rejects.toThrow(/ZERO parseable/i);
  });

  it("loads valid JSONL, tolerates per-line parse errors, and mtime-caches", async () => {
    const good = join(dir, "docs.jsonl");
    writeFileSync(good, `${JSON.stringify(SAMPLE[0])}\nthis line is junk\n${JSON.stringify(SAMPLE[1])}\n`, "utf8");
    const idx1 = await loadDocIndex({ docsJsonlPath: good });
    expect(idx1.stats.parsed).toBe(2);
    expect(idx1.stats.parseErrors).toBe(1);
    expect(idx1.byRole.BLUEPRINT).toBe(1);
    const idx2 = await loadDocIndex({ docsJsonlPath: good });
    expect(idx2).toBe(idx1); // same object — mtime cache hit, no re-stream
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("live corpus smoke (conditional — documents.jsonl is gitignored local data)", () => {
  // Resolve the canonical corpus the same way the engine's default does.
  const candidates = [
    resolve(process.cwd(), "data/jm-die-database/tables/documents.jsonl"),
    resolve(process.cwd(), "mcp-server/data/jm-die-database/tables/documents.jsonl"),
  ];
  const livePath = candidates.find((p) => existsSync(p));

  it(livePath ? "loads the live 111k-doc corpus and exposes a role histogram" : "fail-louds when the corpus is absent (CI/fresh-clone)", async () => {
    _resetDocIndexCache();
    if (livePath) {
      const idx = await loadDocIndex({ docsJsonlPath: livePath });
      expect(idx.stats.parsed).toBeGreaterThan(100_000);
      expect(Object.keys(idx.byRole).length).toBeGreaterThan(0);
      // a real query must return real docs
      const r = queryDocs({ limit: 5 }, idx);
      expect(r.returned).toBeGreaterThan(0);
      expect(r.total).toBe(idx.stats.parsed);
    } else {
      await expect(loadDocIndex({ docsJsonlPath: resolve(process.cwd(), "data/jm-die-database/tables/documents.jsonl") })).rejects.toThrow();
    }
    // 120s timeout: this reads the real ~57MB corpus; the H: drive is under heavy concurrent
    // fleet I/O (multiple slots + GPU jobs), so a read that is sub-second when idle can take
    // tens of seconds under load. The 13 synthetic-fixture tests above guard the actual logic.
  }, 120_000);
});
