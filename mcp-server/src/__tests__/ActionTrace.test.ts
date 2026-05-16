/**
 * ActionTrace.test.ts — ActionTraceEngine logger + query vitest suite.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ACTION-TRACES (D4).
 *
 * Hermetic: every test points PRISM_ACTION_TRACE_FILE at a unique temp file
 * (resolved per-call by the engine) and removes it afterwards — no shared
 * state, parallel-safe. All assertions are real-value (exact counts, exact
 * field equality, thrown-error messages) — no toBeDefined / not.toBeNull
 * stubs (PRISM TEST LEGITIMACY GATE).
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D4
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomBytes } from "crypto";
import {
  ACTION_TRACE_SCHEMA_VERSION,
  ACTION_TRACE_ENGINE_VERSION,
  ActionTraceEdgeSchema,
  hashPrompt,
  recordTrace,
  queryTraces,
  actionTraceEngine,
  type ActionTraceInput,
} from "../engines/ActionTraceEngine.js";

let traceFile: string;
let prevTraceEnv: string | undefined;

beforeEach(() => {
  // Save-and-restore (not unconditional delete) so a pre-existing ambient
  // PRISM_ACTION_TRACE_FILE survives this suite — vitest reuses a worker
  // process across test files, so clobbering it would corrupt a later
  // same-worker suite that legitimately set it.
  prevTraceEnv = process.env.PRISM_ACTION_TRACE_FILE;
  traceFile = path.join(
    os.tmpdir(),
    `action-trace-test-${randomBytes(6).toString("hex")}.jsonl`,
  );
  process.env.PRISM_ACTION_TRACE_FILE = traceFile;
});

afterEach(() => {
  if (prevTraceEnv === undefined) {
    delete process.env.PRISM_ACTION_TRACE_FILE;
  } else {
    process.env.PRISM_ACTION_TRACE_FILE = prevTraceEnv;
  }
  try {
    if (fs.existsSync(traceFile)) fs.unlinkSync(traceFile);
  } catch {
    /* best-effort temp cleanup */
  }
});

/** Build a valid edge input with overridable fields. */
function edge(over: Partial<ActionTraceInput> = {}): ActionTraceInput {
  return {
    agent: "claude-c0f06dee",
    sessionId: "sess-aaaa",
    promptHash: "deadbeefdeadbeef",
    tool: "Write",
    target: "mcp-server/src/engines/Foo.ts",
    action: "engine_write",
    ...over,
  };
}

describe("ActionTraceEngine — core exit condition (10 writes → 10 entries)", () => {
  it("records 10 simulated writes as exactly 10 JSONL lines", () => {
    for (let i = 0; i < 10; i++) {
      recordTrace(edge({ target: `file-${i}.ts`, promptHash: `hash${i}` }));
    }
    const lines = fs
      .readFileSync(traceFile, "utf8")
      .split("\n")
      .filter((l) => l.trim());
    expect(lines.length).toBe(10);

    const res = queryTraces();
    expect(res.total).toBe(10);
    expect(res.matched).toBe(10);
    expect(res.edges.length).toBe(10);
    expect(res.skipped).toBe(0);
    // Every line is a schema-valid edge.
    for (const line of lines) {
      const parsed = ActionTraceEdgeSchema.safeParse(JSON.parse(line));
      expect(parsed.success).toBe(true);
    }
  });

  it("query returns the by-agent filter subset", () => {
    for (let i = 0; i < 6; i++) recordTrace(edge({ agent: "claude-aaaa" }));
    for (let i = 0; i < 4; i++) recordTrace(edge({ agent: "claude-bbbb" }));

    const a = queryTraces({ agent: "claude-aaaa" });
    expect(a.total).toBe(10);
    expect(a.matched).toBe(6);
    expect(a.edges.length).toBe(6);
    expect(a.edges.every((e) => e.agent === "claude-aaaa")).toBe(true);

    const b = queryTraces({ agent: "claude-bbbb" });
    expect(b.matched).toBe(4);
    expect(b.edges.every((e) => e.agent === "claude-bbbb")).toBe(true);

    const none = queryTraces({ agent: "claude-zzzz" });
    expect(none.matched).toBe(0);
    expect(none.edges).toEqual([]);
  });

  it("query returns the by-target filter subset", () => {
    recordTrace(edge({ target: "a.ts" }));
    recordTrace(edge({ target: "a.ts" }));
    recordTrace(edge({ target: "b.ts" }));

    const a = queryTraces({ target: "a.ts" });
    expect(a.matched).toBe(2);
    expect(a.edges.map((e) => e.target)).toEqual(["a.ts", "a.ts"]);

    const b = queryTraces({ target: "b.ts" });
    expect(b.matched).toBe(1);
    expect(b.edges[0].target).toBe("b.ts");
  });
});

describe("ActionTraceEngine — filters, limit, order", () => {
  it("filters by tool, sessionId, action independently", () => {
    recordTrace(edge({ tool: "Edit", sessionId: "s1", action: "a1" }));
    recordTrace(edge({ tool: "Write", sessionId: "s2", action: "a2" }));
    expect(queryTraces({ tool: "Edit" }).matched).toBe(1);
    expect(queryTraces({ sessionId: "s2" }).matched).toBe(1);
    expect(queryTraces({ action: "a1" }).matched).toBe(1);
    expect(queryTraces({ tool: "Edit", sessionId: "s2" }).matched).toBe(0);
  });

  it("sinceTs filters out older edges (lexical UTC compare)", () => {
    recordTrace(edge({ ts: "2026-05-15T00:00:00.000Z", target: "old.ts" }));
    recordTrace(edge({ ts: "2026-05-16T00:00:00.000Z", target: "new.ts" }));
    const r = queryTraces({ sinceTs: "2026-05-15T12:00:00.000Z" });
    expect(r.matched).toBe(1);
    expect(r.edges[0].target).toBe("new.ts");
  });

  it("limit caps edges but matched reports the true pre-cap count", () => {
    for (let i = 0; i < 20; i++) recordTrace(edge({ target: `f${i}.ts` }));
    const r = queryTraces({ limit: 5 });
    expect(r.total).toBe(20);
    expect(r.matched).toBe(20);
    expect(r.edges.length).toBe(5);
  });

  it("order:asc is file/chronological, order:desc is most-recent first", () => {
    recordTrace(edge({ target: "first.ts" }));
    recordTrace(edge({ target: "second.ts" }));
    recordTrace(edge({ target: "third.ts" }));
    const asc = queryTraces();
    expect(asc.edges.map((e) => e.target)).toEqual([
      "first.ts",
      "second.ts",
      "third.ts",
    ]);
    const desc = queryTraces({ order: "desc" });
    expect(desc.edges.map((e) => e.target)).toEqual([
      "third.ts",
      "second.ts",
      "first.ts",
    ]);
  });

  it("invalid/zero/NaN limit falls back to default 1000 (direct-API guard)", () => {
    for (let i = 0; i < 3; i++) recordTrace(edge());
    expect(queryTraces({ limit: 0 }).edges.length).toBe(3);
    expect(queryTraces({ limit: -5 }).edges.length).toBe(3);
    expect(queryTraces({ limit: NaN }).edges.length).toBe(3);
  });
});

describe("ActionTraceEngine — append-only invariant", () => {
  // NOTE: this batch test alone doesn't *discriminate* append-only from a
  // hypothetical truncate-and-rewrite impl. The true discriminator is the
  // "skips corrupt JSONL lines" test below: it injects raw lines via an
  // external fs.appendFileSync between recordTrace calls and asserts they
  // SURVIVE (skipped:2) — a rewrite impl would erase those external lines.
  it("a second batch appends without truncating the first", () => {
    recordTrace(edge({ target: "batch1-a.ts" }));
    recordTrace(edge({ target: "batch1-b.ts" }));
    const after1 = queryTraces();
    expect(after1.total).toBe(2);

    recordTrace(edge({ target: "batch2-a.ts" }));
    const after2 = queryTraces();
    expect(after2.total).toBe(3);
    // Original batch-1 edges are still present, still first.
    expect(after2.edges.map((e) => e.target)).toEqual([
      "batch1-a.ts",
      "batch1-b.ts",
      "batch2-a.ts",
    ]);
  });

  it("recordTrace returns the validated, ts-normalized edge", () => {
    const out = recordTrace(edge({ target: "x.ts" }));
    expect(out.target).toBe("x.ts");
    expect(out.agent).toBe("claude-c0f06dee");
    // ts defaulted + canonical UTC Z.
    expect(out.ts.endsWith("Z")).toBe(true);
    expect(Number.isNaN(new Date(out.ts).getTime())).toBe(false);
  });
});

describe("ActionTraceEngine — fail-loud on bad records (R12)", () => {
  it("throws when a required field is missing", () => {
    // @ts-expect-error — deliberately omitting `target` to assert fail-loud.
    expect(() => recordTrace({ ...edge(), target: undefined })).toThrow();
  });

  it("throws when an empty-string field is given", () => {
    expect(() => recordTrace(edge({ agent: "" }))).toThrow();
  });

  it("rejects an extra key via .strict()", () => {
    const bad = { ...edge(), ts: "2026-05-16T00:00:00.000Z", rogue: "x" };
    const res = ActionTraceEdgeSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("throws on an unparseable ts (still fail-loud)", () => {
    expect(() => recordTrace(edge({ ts: "not-a-date" }))).toThrow(
      /unparseable ts/,
    );
  });

  it("normalizes an offset ts to canonical UTC Z so sinceTs stays sound", () => {
    const out = recordTrace(
      edge({ ts: "2026-05-16T00:00:00.000-05:00", target: "tz.ts" }),
    );
    // -05:00 midnight == 05:00Z same day.
    expect(out.ts).toBe("2026-05-16T05:00:00.000Z");
    const r = queryTraces({ sinceTs: "2026-05-16T04:00:00.000Z" });
    expect(r.matched).toBe(1);
  });
});

describe("ActionTraceEngine — resilient reads", () => {
  it("missing file is an empty result, not a throw", () => {
    const r = queryTraces();
    expect(r.total).toBe(0);
    expect(r.matched).toBe(0);
    expect(r.skipped).toBe(0);
    expect(r.edges).toEqual([]);
  });

  it("skips corrupt JSONL lines and counts them", () => {
    recordTrace(edge({ target: "good1.ts" }));
    fs.appendFileSync(traceFile, "this is not json\n", "utf8");
    fs.appendFileSync(traceFile, '{"partial": \n', "utf8");
    recordTrace(edge({ target: "good2.ts" }));
    const r = queryTraces();
    expect(r.total).toBe(2);
    expect(r.skipped).toBe(2);
    expect(r.edges.map((e) => e.target)).toEqual(["good1.ts", "good2.ts"]);
  });

  it("skips a structurally-valid JSON line that fails the edge schema", () => {
    recordTrace(edge({ target: "good.ts" }));
    fs.appendFileSync(traceFile, JSON.stringify({ not: "an edge" }) + "\n");
    const r = queryTraces();
    expect(r.total).toBe(1);
    expect(r.skipped).toBe(1);
  });

  it("preserves a newline embedded in target (JSONL integrity)", () => {
    // JSON.stringify escapes the \n → exactly one physical line; the read
    // side JSON.parse restores it. Locks the append-only line-format invariant.
    const tricky = "dir/file\nwith-newline.ts";
    recordTrace(edge({ target: tricky }));
    const physicalLines = fs
      .readFileSync(traceFile, "utf8")
      .split("\n")
      .filter((l) => l.trim());
    expect(physicalLines.length).toBe(1);
    const r = queryTraces();
    expect(r.total).toBe(1);
    expect(r.edges[0].target).toBe(tricky);
  });
});

describe("ActionTraceEngine — hashPrompt + singleton", () => {
  it("hashPrompt is deterministic, 16 hex chars", () => {
    const h1 = hashPrompt("build D4 action traces");
    const h2 = hashPrompt("build D4 action traces");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
    expect(hashPrompt("different")).not.toBe(h1);
  });

  it("singleton exposes versions + the same function references", () => {
    expect(actionTraceEngine.schemaVersion).toBe(ACTION_TRACE_SCHEMA_VERSION);
    expect(actionTraceEngine.version).toBe(ACTION_TRACE_ENGINE_VERSION);
    expect(actionTraceEngine.hashPrompt).toBe(hashPrompt);
    expect(actionTraceEngine.recordTrace).toBe(recordTrace);
    expect(actionTraceEngine.queryTraces).toBe(queryTraces);
    expect(Object.isFrozen(actionTraceEngine)).toBe(true);
  });

  it("empty-params query returns all recent edges (default path)", () => {
    for (let i = 0; i < 4; i++) recordTrace(edge({ target: `e${i}.ts` }));
    const r = queryTraces({});
    expect(r.matched).toBe(4);
    expect(r.edges.length).toBe(4);
  });
});
