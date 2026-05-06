/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U02 — CSMSqliteRowReaderFactory tests.
 *
 * Coverage:
 *   - Schema-adaptive table detection: picks first known table (memories first)
 *   - Body column priority: text > content > body > message
 *   - Metadata capture: all non-body columns, type filtering
 *   - Error paths: open failure, no recognized table, read failure
 *   - maxRows clamping
 *   - LIMIT and ORDER BY rowid DESC observed in SQL
 *
 * Uses an injected fake Database constructor so the test never touches sqlite.
 *
 * 16 tests; ≥3 failure modes per spec.
 */
import { describe, it, expect } from "vitest";
import {
  createBetterSqliteRowReader,
  type BetterSqliteCtor,
} from "../engines/CSMSqliteRowReaderFactory.js";

// ───────────── Fake Database ─────────────

type FakeColumn = { name: string };
type FakeRow = Record<string, unknown>;

interface FakeDBSpec {
  tables: string[];                                  // sqlite_master names returned
  columns: Record<string, FakeColumn[]>;             // PRAGMA table_info per table
  rows: Record<string, FakeRow[]>;                   // SELECT rows per table
  openError?: string;                                // simulate open failure
  readError?: string;                                // simulate query throw
  capturedSqls?: string[];                            // record SQL the impl issued
  capturedParams?: unknown[][];                       // record params per query
}

function makeFakeCtor(spec: FakeDBSpec): BetterSqliteCtor {
  const ctor = function (this: unknown, _path: string, _opts: unknown) {
    if (spec.openError) throw new Error(spec.openError);
    return {
      prepare(sql: string) {
        spec.capturedSqls?.push(sql);
        return {
          all(...params: unknown[]) {
            spec.capturedParams?.push(params);
            if (spec.readError) throw new Error(spec.readError);
            // Detect query intent from SQL shape
            if (/sqlite_master/i.test(sql)) {
              return spec.tables.map((name) => ({ name }));
            }
            const tableInfoMatch = sql.match(/PRAGMA table_info\("([^"]+)"\)/);
            if (tableInfoMatch) {
              return spec.columns[tableInfoMatch[1]] ?? [];
            }
            const selectMatch = sql.match(/FROM "([^"]+)"/);
            if (selectMatch) {
              const limit = typeof params[0] === "number" ? params[0] : Infinity;
              return (spec.rows[selectMatch[1]] ?? []).slice(0, limit);
            }
            return [];
          },
          get() { return undefined; },
        };
      },
      close() { /* no-op */ },
    };
  } as unknown as BetterSqliteCtor;
  return ctor;
}

// ───────────── Tests ─────────────

describe("CSMSqliteRowReaderFactory — happy path", () => {
  it("picks 'memories' table when present and reads its 'text' column", () => {
    const spec: FakeDBSpec = {
      tables: ["memories", "other_table"],
      columns: {
        memories: [{ name: "id" }, { name: "text" }, { name: "kind" }, { name: "ts" }],
      },
      rows: {
        memories: [
          { id: 1, text: "first memory", kind: "session", ts: "2026-01-01T00:00:00Z" },
          { id: 2, text: "second memory", kind: "tribal", ts: "2026-01-02T00:00:00Z" },
        ],
      },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.error).toBe("");
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].text).toBe("first memory");
    expect(result.rows[0].metadata?.id).toBe(1);
    expect(result.rows[0].metadata?.kind).toBe("session");
    expect(result.rows[0].metadata?.ts).toBe("2026-01-01T00:00:00Z");
    // Body column is excluded from metadata — concretely assert keys present
    expect(Object.keys(result.rows[0].metadata ?? {}).sort()).toEqual(["id", "kind", "ts"]);
  });

  it("falls through to 'messages' when memories not present", () => {
    const spec: FakeDBSpec = {
      tables: ["messages"],
      columns: { messages: [{ name: "id" }, { name: "content" }, { name: "role" }] },
      rows: { messages: [{ id: 99, content: "hello", role: "user" }] },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].text).toBe("hello");
    expect(result.rows[0].metadata?.role).toBe("user");
  });

  it("falls through to 'events' when neither memories nor messages present", () => {
    const spec: FakeDBSpec = {
      tables: ["events"],
      columns: { events: [{ name: "id" }, { name: "data" }] },
      rows: { events: [{ id: 1, data: "event payload" }] },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].text).toBe("event payload");
  });

  it("body column priority: 'text' beats 'content' when both exist on same table", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: {
        memories: [{ name: "id" }, { name: "text" }, { name: "content" }],
      },
      rows: { memories: [{ id: 1, text: "TEXT_WINS", content: "content_field" }] },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.rows[0].text).toBe("TEXT_WINS");
    expect(result.rows[0].metadata?.content).toBe("content_field");
  });

  it("issues an ORDER BY rowid DESC LIMIT ? query (newest-first heuristic)", () => {
    const captured: string[] = [];
    const params: unknown[][] = [];
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "text" }] },
      rows: { memories: [{ text: "a" }] },
      capturedSqls: captured,
      capturedParams: params,
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    reader.readRows("/fake/.claude/memory.db", { maxRows: 42 });
    const selectSqls = captured.filter((s) => /SELECT \* FROM "memories"/.test(s));
    expect(selectSqls.length).toBe(1);
    expect(selectSqls[0]).toContain("ORDER BY rowid DESC LIMIT ?");
    // The LIMIT param is the maxRows we passed
    const selectParams = params[params.length - 1];
    expect(selectParams[0]).toBe(42);
  });
});

describe("CSMSqliteRowReaderFactory — failure modes", () => {
  it("returns error when no recognized table exists", () => {
    const spec: FakeDBSpec = {
      tables: ["random_table", "another_random"],
      columns: {},
      rows: {},
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.error).toContain("no recognized memory table");
    expect(result.error).toContain("random_table");
    expect(result.rows).toEqual([]);
  });

  it("returns error when DB open fails (file not found, permission, etc.)", () => {
    const spec: FakeDBSpec = {
      tables: [], columns: {}, rows: {},
      openError: "SQLITE_CANTOPEN: unable to open database file",
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/missing.db");
    expect(result.error).toContain("open:");
    expect(result.error).toContain("SQLITE_CANTOPEN");
    expect(result.rows).toEqual([]);
  });

  it("returns error when query throws (e.g. corrupt schema)", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "text" }] },
      rows: { memories: [] },
      readError: "SQLITE_CORRUPT: database disk image is malformed",
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/corrupt.db");
    expect(result.error).toContain("read:");
    expect(result.error).toContain("SQLITE_CORRUPT");
  });

  it("rejects empty / non-string dbPath with clear error", () => {
    const reader = createBetterSqliteRowReader(makeFakeCtor({ tables: [], columns: {}, rows: {} }));
    const r1 = reader.readRows("");
    expect(r1.error).toContain("dbPath must be");
    const r2 = reader.readRows(undefined as unknown as string);
    expect(r2.error).toContain("dbPath must be");
  });
});

describe("CSMSqliteRowReaderFactory — adversarial / edge cases", () => {
  it("skips rows where the body column is empty / non-string / null", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "id" }, { name: "text" }] },
      rows: {
        memories: [
          { id: 1, text: "valid row" },
          { id: 2, text: "" },              // empty → skipped
          { id: 3, text: null },            // null → skipped
          { id: 4, text: 42 },              // number → skipped
          { id: 5, text: "another valid" },
        ],
      },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].text).toBe("valid row");
    expect(result.rows[1].text).toBe("another valid");
  });

  it("filters non-JSON-safe metadata to string-coerced values", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "id" }, { name: "text" }, { name: "weird" }] },
      rows: {
        memories: [
          { id: 1, text: "row", weird: { nested: "obj" } },
        ],
      },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.rows[0].metadata?.id).toBe(1);
    expect(typeof result.rows[0].metadata?.weird).toBe("string");
    expect(String(result.rows[0].metadata?.weird)).toContain("[object Object]");
  });

  it("drops null metadata fields entirely", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "id" }, { name: "text" }, { name: "maybenull" }] },
      rows: { memories: [{ id: 1, text: "row", maybenull: null }] },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    // Concretely assert which keys made it into metadata
    expect(Object.keys(result.rows[0].metadata ?? {}).sort()).toEqual(["id"]);
    expect(result.rows[0].metadata?.id).toBe(1);
  });

  it("clamps non-positive maxRows to default 5000", () => {
    const captured: string[] = [];
    const params: unknown[][] = [];
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "text" }] },
      rows: { memories: [{ text: "a" }] },
      capturedSqls: captured,
      capturedParams: params,
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    reader.readRows("/fake/.claude/memory.db", { maxRows: -1 });
    const selectParams = params[params.length - 1];
    expect(selectParams[0]).toBe(5000);
  });

  it("normalizes backslashes in source_path to forward slashes", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "text" }] },
      rows: { memories: [{ text: "x" }] },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("H:\\prism\\.claude\\memory.db");
    expect(result.source_path).toBe("H:/prism/.claude/memory.db");
  });

  it("returns Buffer metadata as a `<Buffer N bytes>` string placeholder", () => {
    const spec: FakeDBSpec = {
      tables: ["memories"],
      columns: { memories: [{ name: "id" }, { name: "text" }, { name: "blob" }] },
      rows: { memories: [{ id: 1, text: "row", blob: Buffer.from("ABCDEF") }] },
    };
    const reader = createBetterSqliteRowReader(makeFakeCtor(spec));
    const result = reader.readRows("/fake/.claude/memory.db");
    expect(result.rows[0].metadata?.blob).toBe("<Buffer 6 bytes>");
  });
});

describe("CSMSqliteRowReaderFactory — production path (better-sqlite3 installed in this repo)", () => {
  it("returns a DBReader with a working readRows method when no ctor is injected", () => {
    // better-sqlite3 IS installed in this repo (verified in package.json), so the
    // production code path should succeed in returning a reader. We exercise
    // readRows against a known-bad path to verify both that the require()
    // succeeded AND that the reader produces the expected error shape.
    const reader = createBetterSqliteRowReader();
    const result = reader.readRows("/this/path/does/not/exist.db");
    expect(typeof reader.readRows).toBe("function");
    expect(result.error).toContain("open:");
    expect(result.rows).toEqual([]);
    expect(result.source_path).toBe("/this/path/does/not/exist.db");
  });
});
