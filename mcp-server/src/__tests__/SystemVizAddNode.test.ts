/**
 * SystemVizAddNode.test.ts — integration + unit tests for
 * `H:/prism/scripts/system-viz-add-node.mjs` (U-CLEANUP-C3).
 *
 * Isolation strategy: each test creates a tmpdir, points
 * PRISM_SYSTEM_VIZ_DIR at it, exercises pure helpers + main()
 * in-process. No subprocess spawn — script is pure ESM so the
 * exports + main() are importable directly into vitest.
 *
 * Real-value tests only — no stub asserts. Every assertion checks
 * actual graph/queue/timestamp state on disk.
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-C3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolve script absolutely (vitest runs from mcp-server/, the script lives in
// H:/prism/scripts/) — dynamic import needs a file:// URL for an ESM .mjs
// outside the package's module-resolution scope.
const __dirname_test = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = pathToFileURL(
  path.resolve(__dirname_test, "../../../scripts/system-viz-add-node.mjs"),
).href;

// ─── Test isolation utilities ───────────────────────────────────────────────

let TMP_DIR: string;
let ORIG_ENV: Record<string, string | undefined>;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-svan-"));
}

function seedGraph(dir: string, nodes: Array<{ id: string; label?: string; layer?: string }>) {
  const graphPath = path.join(dir, "system-graph.json");
  fs.writeFileSync(
    graphPath,
    JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      meta: { headline: { built: 1, unwired: 0 } },
      layers: [],
      nodes: nodes.map(n => ({ id: n.id, label: n.label ?? n.id, layer: n.layer ?? "L5" })),
      edges: [],
    }, null, 2),
  );
}

function readGraph(dir: string): { nodes: Array<{ id: string; [k: string]: unknown }> } {
  return JSON.parse(fs.readFileSync(path.join(dir, "system-graph.json"), "utf8"));
}

function readQueueFile(dir: string): unknown[] {
  const p = path.join(dir, "staging", "add-node-queue.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

beforeEach(() => {
  TMP_DIR = makeTmpDir();
  ORIG_ENV = {
    PRISM_SYSTEM_VIZ_DIR: process.env.PRISM_SYSTEM_VIZ_DIR,
    PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS: process.env.PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS,
    PRISM_SYSTEM_VIZ_ADD_NODE_DISABLE: process.env.PRISM_SYSTEM_VIZ_ADD_NODE_DISABLE,
    PRISM_SYSTEM_VIZ_ONCOMMIT_PID: process.env.PRISM_SYSTEM_VIZ_ONCOMMIT_PID,
  };
  process.env.PRISM_SYSTEM_VIZ_DIR = TMP_DIR;
  // Point the on-commit PID lock at an isolated tmp path so production's
  // real .system-viz-on-commit.pid can never make a test flaky.
  process.env.PRISM_SYSTEM_VIZ_ONCOMMIT_PID = path.join(TMP_DIR, ".oncommit.pid");
  delete process.env.PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS;
  delete process.env.PRISM_SYSTEM_VIZ_ADD_NODE_DISABLE;
});

afterEach(() => {
  for (const [k, v] of Object.entries(ORIG_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
});

// ─── Pure helpers (in-process; no I/O) ──────────────────────────────────────

describe("slugifyLabel", () => {
  it("lowercases + prefixes 'engine.'", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.slugifyLabel("MyEngine")).toBe("engine.myengine");
  });

  it("strips supported source extensions", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.slugifyLabel("FooBar.ts")).toBe("engine.foobar");
    expect(m.slugifyLabel("FooBar.tsx")).toBe("engine.foobar");
    expect(m.slugifyLabel("FooBar.mjs")).toBe("engine.foobar");
  });

  it("collapses non-charset chars to single dash + trims edges", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.slugifyLabel("Foo Bar Baz")).toBe("engine.foo-bar-baz");
    expect(m.slugifyLabel("---Foo!!!Bar---")).toBe("engine.foo-bar");
  });

  it("throws on non-string input", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.slugifyLabel(42 as never)).toThrow(/must be a string/);
    expect(() => m.slugifyLabel(null as never)).toThrow(/must be a string/);
  });

  it("throws when slug post-clean is empty (e.g. all non-ASCII)", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.slugifyLabel("日本")).toThrow(/empty slug/);
    expect(() => m.slugifyLabel("!!!")).toThrow(/empty slug/);
  });
});

describe("normalizeLayer", () => {
  it("accepts L0..L11 case-insensitive + whitespace-trimmed", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.normalizeLayer("L5")).toBe("L5");
    expect(m.normalizeLayer("l5")).toBe("L5");
    expect(m.normalizeLayer("  L11  ")).toBe("L11");
  });

  it("rejects unknown layers", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.normalizeLayer("L99")).toThrow(/invalid layer/);
    expect(() => m.normalizeLayer("foo")).toThrow(/invalid layer/);
  });

  it("rejects non-string input", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.normalizeLayer(5 as never)).toThrow(/must be a string/);
  });
});

describe("validateRawId", () => {
  it("accepts valid id charset (letters, digits, dot, dash, underscore)", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.validateRawId("engine.foo")).toBe("engine.foo");
    expect(m.validateRawId("Foo_Bar-123")).toBe("Foo_Bar-123");
    expect(m.validateRawId("a.b.c")).toBe("a.b.c");
  });

  it("rejects ids containing '/' or '\\' (path-like)", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.validateRawId("../foo")).toThrow(/must match/);
    expect(() => m.validateRawId("foo/bar")).toThrow(/must match/);
    expect(() => m.validateRawId("foo\\bar")).toThrow(/must match/);
  });

  it("rejects traversal-shaped ids that pass the charset regex", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.validateRawId(".")).toThrow(/traversal/);
    expect(() => m.validateRawId("..")).toThrow(/traversal/);
    expect(() => m.validateRawId("foo..bar")).toThrow(/traversal/);
  });

  it("rejects empty string + non-string", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.validateRawId("")).toThrow(/must match/);
    expect(() => m.validateRawId(null as never)).toThrow(/must be a string/);
  });
});

describe("buildNodeEntry", () => {
  it("derives id from label by default + applies DASHED defaults", async () => {
    const m = await import(SCRIPT_PATH);
    const e = m.buildNodeEntry({ label: "FooEngine", _stagedAt: "2026-05-14T00:00:00.000Z" });
    expect(e.id).toBe("engine.fooengine");
    expect(e.label).toBe("FooEngine");
    expect(e.layer).toBe(m.DEFAULT_LAYER);
    expect(e.subgroup).toBe("main");
    expect(e.status).toBe(m.DASHED_STATUS);
    expect(e.size).toBe(m.DASHED_SIZE);
    expect(e.color).toBe(m.DASHED_COLOR);
    expect(e._source).toBe(m.DEFAULT_SOURCE);
    expect(e._stagedAt).toBe("2026-05-14T00:00:00.000Z");
  });

  it("--engine flag sets subgroup to 'unwired'", async () => {
    const m = await import(SCRIPT_PATH);
    const e = m.buildNodeEntry({ label: "Foo", engine: true });
    expect(e.subgroup).toBe(m.ENGINE_SUBGROUP);
  });

  it("honors explicit --id and validates it", async () => {
    const m = await import(SCRIPT_PATH);
    const e = m.buildNodeEntry({ label: "Foo", id: "custom.id_42" });
    expect(e.id).toBe("custom.id_42");
    expect(() => m.buildNodeEntry({ label: "Foo", id: "../escape" })).toThrow();
  });

  it("rejects non-string label + empty label", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.buildNodeEntry({ label: true })).toThrow(/must be a string/);
    expect(() => m.buildNodeEntry({ label: "" })).toThrow(/non-empty/);
    expect(() => m.buildNodeEntry({} as never)).toThrow();
  });

  it("rejects null / non-object args", async () => {
    const m = await import(SCRIPT_PATH);
    expect(() => m.buildNodeEntry(null as never)).toThrow(/must be an object/);
  });
});

describe("parseArgv", () => {
  it("parses --flag value pairs", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.parseArgv(["--label", "Foo", "--layer", "L5"])).toMatchObject({
      label: "Foo", layer: "L5",
    });
  });

  it("treats lone --bool as true", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.parseArgv(["--engine"])).toMatchObject({ engine: true });
  });

  it("coerces literal 'true' / 'false' value strings to booleans", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.parseArgv(["--engine", "true"])).toMatchObject({ engine: true });
    expect(m.parseArgv(["--engine", "false"])).toMatchObject({ engine: false });
    expect(m.parseArgv(["--no-flush", "true"])).toMatchObject({ "no-flush": true });
  });

  it("treats --foo --bar as foo=true, bar=true (no value swallow)", async () => {
    const m = await import(SCRIPT_PATH);
    const r = m.parseArgv(["--foo", "--bar"]);
    expect(r.foo).toBe(true);
    expect(r.bar).toBe(true);
  });
});

describe("labelFromEngineFile", () => {
  it("strips extension + dir from a path", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.labelFromEngineFile("src/engines/FooEngine.ts")).toBe("FooEngine");
    expect(m.labelFromEngineFile("H:/x/y/Bar.mjs")).toBe("Bar");
    expect(m.labelFromEngineFile("Baz")).toBe("Baz");
  });
});

describe("isDuplicate", () => {
  it("returns true if id is in queue", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.isDuplicate("a", [{ id: "a" }, { id: "b" }], new Set())).toBe(true);
  });

  it("returns true if id is in graph Set", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.isDuplicate("a", [], new Set(["a", "b"]))).toBe(true);
  });

  it("returns false if id is in neither", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.isDuplicate("c", [{ id: "a" }], new Set(["b"]))).toBe(false);
  });

  it("accepts Array form for graph ids (legacy/compat)", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.isDuplicate("a", [], [{ id: "a" }] as never)).toBe(true);
  });
});

// ─── I/O helpers ────────────────────────────────────────────────────────────

describe("atomicWriteJson + atomicWriteText", () => {
  it("writes JSON atomically (temp file + rename, no partial)", async () => {
    const m = await import(SCRIPT_PATH);
    const target = path.join(TMP_DIR, "out.json");
    m.atomicWriteJson(target, { hello: "world" });
    expect(JSON.parse(fs.readFileSync(target, "utf8"))).toEqual({ hello: "world" });
    // No leftover tmp file
    const leftover = fs.readdirSync(TMP_DIR).filter(f => f.includes(".tmp."));
    expect(leftover).toEqual([]);
  });

  it("atomicWriteText preserves raw string content", async () => {
    const m = await import(SCRIPT_PATH);
    const target = path.join(TMP_DIR, "out.txt");
    m.atomicWriteText(target, "raw\nstring\ncontent\n");
    expect(fs.readFileSync(target, "utf8")).toBe("raw\nstring\ncontent\n");
  });

  it("creates parent directory if missing", async () => {
    const m = await import(SCRIPT_PATH);
    const target = path.join(TMP_DIR, "deep", "sub", "out.json");
    m.atomicWriteJson(target, { ok: true });
    expect(fs.existsSync(target)).toBe(true);
  });
});

describe("readQueue", () => {
  it("returns empty entries for missing file", async () => {
    const m = await import(SCRIPT_PATH);
    const result = m.readQueue(path.join(TMP_DIR, "nonexistent.jsonl"));
    expect(result.entries).toEqual([]);
    expect(result.corrupt).toBe(0);
    expect(result.tooLarge).toBe(false);
  });

  it("parses valid JSONL rows", async () => {
    const m = await import(SCRIPT_PATH);
    const q = path.join(TMP_DIR, "q.jsonl");
    fs.writeFileSync(q, '{"id":"a"}\n{"id":"b"}\n');
    const result = m.readQueue(q);
    expect(result.entries).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result.corrupt).toBe(0);
  });

  it("skips + counts corrupt lines without aborting", async () => {
    const m = await import(SCRIPT_PATH);
    const q = path.join(TMP_DIR, "q.jsonl");
    fs.writeFileSync(q, '{"id":"a"}\nNOT-JSON\n{"id":"b"}\n');
    const result = m.readQueue(q);
    expect(result.entries).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result.corrupt).toBe(1);
  });

  it("refuses to parse oversize file (DoS guard via MAX_QUEUE_BYTES)", async () => {
    const m = await import(SCRIPT_PATH);
    const q = path.join(TMP_DIR, "q.jsonl");
    // Create a file just barely over the cap
    const padding = "x".repeat(m.MAX_QUEUE_BYTES + 16);
    fs.writeFileSync(q, padding);
    const result = m.readQueue(q);
    expect(result.tooLarge).toBe(true);
    expect(result.entries).toEqual([]);
  });

  it("strips __proto__ pollution attempts via safeReviver", async () => {
    const m = await import(SCRIPT_PATH);
    const q = path.join(TMP_DIR, "q.jsonl");
    fs.writeFileSync(q, '{"id":"a","__proto__":{"polluted":true}}\n');
    const result = m.readQueue(q);
    expect(result.entries[0]).toEqual({ id: "a" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("msSinceLastFlush", () => {
  it("returns Infinity if file missing", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.msSinceLastFlush(path.join(TMP_DIR, "nope.iso"))).toBe(Infinity);
  });

  it("returns ms delta from recorded ISO", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, "last.iso");
    const past = Date.now() - 1234;
    fs.writeFileSync(p, new Date(past).toISOString());
    const delta = m.msSinceLastFlush(p);
    // Slight clock-skew tolerance
    expect(delta).toBeGreaterThanOrEqual(1200);
    expect(delta).toBeLessThan(5000);
  });

  it("returns Infinity if file content unparseable", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, "last.iso");
    fs.writeFileSync(p, "not-a-date");
    expect(m.msSinceLastFlush(p)).toBe(Infinity);
  });
});

describe("acquirePidLock / releasePidLock", () => {
  it("acquires when no PID file exists, then releases cleanly", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, "pid");
    expect(m.acquirePidLock(p)).toBe(true);
    expect(fs.readFileSync(p, "utf8").trim()).toBe(String(process.pid));
    m.releasePidLock(p);
    expect(fs.existsSync(p)).toBe(false);
  });

  it("returns false when another live PID holds it", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, "pid");
    // process.ppid is the parent of this vitest worker — guaranteed alive
    // for the duration of this test, and reliably probeable by process.kill(pid, 0)
    // on both Windows and POSIX (unlike init/System pids which behave inconsistently).
    const livePid = process.ppid;
    expect(livePid).toBeGreaterThan(0);
    expect(livePid).not.toBe(process.pid); // sanity
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, String(livePid));
    expect(m.acquirePidLock(p)).toBe(false);
  });

  it("reclaims a dead PID via process.kill(0) probe", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, "pid");
    // Use a high integer that's overwhelmingly unlikely to exist as a pid
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, "999999999");
    expect(m.acquirePidLock(p)).toBe(true);
    expect(fs.readFileSync(p, "utf8").trim()).toBe(String(process.pid));
    m.releasePidLock(p);
  });

  it("releasePidLock no-ops when file holds a different pid", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, "pid");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, "424242");
    m.releasePidLock(p);
    expect(fs.existsSync(p)).toBe(true); // we don't own it, must not delete
  });
});

// ─── flushQueue ─────────────────────────────────────────────────────────────

describe("flushQueue", () => {
  it("graph_missing surfaces error, queue preserved", async () => {
    const m = await import(SCRIPT_PATH);
    const qp = m.queuePath();
    const gp = m.graphPath();
    const lf = m.lastFlushPath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    expect(fs.existsSync(gp)).toBe(false);
    const r = m.flushQueue({ gPath: gp, qPath: qp, lfPath: lf });
    expect(r.error).toBe("graph_missing");
    expect(r.queueDepth).toBe(1);
    expect(fs.existsSync(qp)).toBe(true); // preserved
  });

  it("empty queue still touches last-flush.iso to prevent thrash", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const lf = m.lastFlushPath();
    expect(fs.existsSync(lf)).toBe(false);
    const r = m.flushQueue({});
    expect(r.flushed).toBe(0);
    expect(fs.existsSync(lf)).toBe(true);
  });

  it("splices queued node into graph + truncates queue", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, [{ id: "engine.existing" }]);
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "NewOne", engine: true }));
    const r = m.flushQueue({});
    expect(r.flushed).toBe(1);
    expect(r.skipped).toBe(0);
    expect(r.queueDepth).toBe(0);
    const g = readGraph(TMP_DIR);
    expect(g.nodes.find(n => n.id === "engine.newone")).toBeTruthy();
    expect(fs.existsSync(qp)).toBe(false);
  });

  it("dedupes queued entry against existing graph node", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, [{ id: "engine.foo" }]);
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    const r = m.flushQueue({});
    expect(r.flushed).toBe(0);
    expect(r.skipped).toBe(1);
    const g = readGraph(TMP_DIR);
    expect(g.nodes.filter(n => n.id === "engine.foo").length).toBe(1);
  });

  it("coerces missing graph.nodes to [] (regression: corrupt graph won't throw)", async () => {
    const m = await import(SCRIPT_PATH);
    fs.writeFileSync(
      path.join(TMP_DIR, "system-graph.json"),
      JSON.stringify({ schemaVersion: 1 }), // no nodes key
    );
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    const r = m.flushQueue({});
    expect(r.flushed).toBe(1);
    expect(r.error).toBeUndefined();
  });

  it("surfaces graph_parse_failed on corrupt JSON", async () => {
    const m = await import(SCRIPT_PATH);
    fs.writeFileSync(path.join(TMP_DIR, "system-graph.json"), "{ not json");
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    const r = m.flushQueue({});
    expect(r.error).toMatch(/graph_parse_failed/);
    expect(fs.existsSync(qp)).toBe(true); // queue preserved on error
  });

  it("respects MAX_BATCH ceiling: keeps over-batch entries in remainder", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const qp = m.queuePath();
    const N = m.MAX_BATCH + 7;
    for (let i = 0; i < N; i++) {
      m.appendQueue(qp, m.buildNodeEntry({ label: `Foo${i}` }));
    }
    const r = m.flushQueue({});
    expect(r.flushed).toBe(m.MAX_BATCH);
    expect(r.batch).toBe(m.MAX_BATCH);
    expect(r.queueDepth).toBe(7);
    expect(readQueueFile(TMP_DIR).length).toBe(7);
  });

  it("computeConcurrentAdds isolates peer-added entries (re-read minus snapshot minus flushed)", async () => {
    const m = await import(SCRIPT_PATH);
    // Test the helper directly — ESM module-internal calls aren't spy-able,
    // so the concurrent-merge logic is tested at the pure-function level.
    const original  = [{ id: "A" }, { id: "B" }];
    const flushed   = [{ id: "A" }, { id: "B" }];
    const peerAdded = { id: "PEER" };
    const reread    = [...original, peerAdded];
    expect(m.computeConcurrentAdds(reread, original, flushed)).toEqual([peerAdded]);

    // No concurrent adds when reread == original
    expect(m.computeConcurrentAdds(original, original, flushed)).toEqual([]);

    // Ignores entries that were already in original snapshot but not flushed
    // (those went into `remaining` already — including them would double-write)
    const overflow = [{ id: "A" }, { id: "B" }, { id: "C-overflow" }];
    expect(m.computeConcurrentAdds(overflow, overflow, flushed)).toEqual([]);

    // Ignores malformed entries (null, missing id, non-string id)
    expect(
      m.computeConcurrentAdds(
        [null, { id: 42 }, { notId: "X" }, peerAdded] as never,
        original,
        flushed,
      ),
    ).toEqual([peerAdded]);
  });


  it("queue_too_large surfaces error + preserves file", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const qp = m.queuePath();
    fs.mkdirSync(path.dirname(qp), { recursive: true });
    fs.writeFileSync(qp, "x".repeat(m.MAX_QUEUE_BYTES + 100));
    const r = m.flushQueue({});
    expect(r.error).toBe("queue_too_large");
    expect(fs.existsSync(qp)).toBe(true);
  });
});

describe("isRegenActive + onCommitPidPath", () => {
  it("onCommitPidPath honors PRISM_SYSTEM_VIZ_ONCOMMIT_PID override", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.onCommitPidPath()).toBe(path.join(TMP_DIR, ".oncommit.pid"));
  });

  it("isRegenActive is false when the PID file is absent", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.isRegenActive()).toBe(false);
  });

  it("isRegenActive is true when the PID file holds a live process", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, ".oncommit.pid");
    // process.ppid is alive for the test's duration and probeable on all platforms.
    fs.writeFileSync(p, String(process.ppid));
    expect(m.isRegenActive()).toBe(true);
  });

  it("isRegenActive is false for a dead/stale PID (regen crashed)", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, ".oncommit.pid");
    fs.writeFileSync(p, "999999999"); // overwhelmingly unlikely to be a live pid
    expect(m.isRegenActive()).toBe(false);
  });

  it("isRegenActive is false for a malformed PID file", async () => {
    const m = await import(SCRIPT_PATH);
    const p = path.join(TMP_DIR, ".oncommit.pid");
    fs.writeFileSync(p, "not-a-pid");
    expect(m.isRegenActive()).toBe(false);
  });
});

describe("flushQueue — full-regen coordination (lost-update defense)", () => {
  it("TIER 1: defers the flush while the regen writer is active (queue preserved, graph untouched)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, [{ id: "engine.existing" }]);
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    // Simulate an active regen by writing a live PID to the on-commit lock.
    fs.writeFileSync(path.join(TMP_DIR, ".oncommit.pid"), String(process.ppid));
    const r = m.flushQueue({});
    expect(r.deferred).toBe(true);
    expect(r.error).toBe("regen_active");
    expect(r.flushed).toBe(0);
    expect(r.queueDepth).toBe(1);
    // Graph must NOT have been mutated, queue must NOT have been truncated.
    expect(readGraph(TMP_DIR).nodes.some(n => n.id === "engine.foo")).toBe(false);
    expect(readGraph(TMP_DIR).nodes.length).toBe(1);
    expect(readQueueFile(TMP_DIR).length).toBe(1);
  });

  it("TIER 1: defer does NOT touch last-flush.iso (so the next call retries promptly)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    m.appendQueue(m.queuePath(), m.buildNodeEntry({ label: "Foo" }));
    fs.writeFileSync(path.join(TMP_DIR, ".oncommit.pid"), String(process.ppid));
    m.flushQueue({});
    expect(fs.existsSync(m.lastFlushPath())).toBe(false);
  });

  it("TIER 1: a dead regen PID does NOT block the flush", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    m.appendQueue(m.queuePath(), m.buildNodeEntry({ label: "Foo" }));
    fs.writeFileSync(path.join(TMP_DIR, ".oncommit.pid"), "999999999"); // dead pid
    const r = m.flushQueue({});
    expect(r.flushed).toBe(1);
    expect(r.batch).toBe(1);
    expect(readGraph(TMP_DIR).nodes.some(n => n.id === "engine.foo")).toBe(true);
  });

  // ── TIER 1b — U-VIZ-F11-CROSS-LOCK shared system-graph.json write lock ──
  // Mirrors the TIER-1 battery. These are the fail-on-revert oracles for the
  // integration seam: a future flushQueue refactor that silently deletes or
  // inverts TIER-1b would leave the lock-lib's own 25/25 green but break the
  // race-closure — exactly the "pure-core tested, seam untested" class.
  it("TIER 1b: defers while the shared graph-write lock is held live (queue preserved, graph untouched)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, [{ id: "engine.existing" }]);
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    const gwl = path.join(TMP_DIR, ".system-graph-write.pid");
    fs.writeFileSync(gwl, String(process.ppid)); // a live pid = regen/on-commit mid-merge
    const r = m.flushQueue({ graphWriteLock: gwl });
    expect(r.deferred).toBe(true);
    expect(r.error).toBe("graph_write_locked");
    expect(r.flushed).toBe(0);
    expect(r.queueDepth).toBe(1);
    expect(readGraph(TMP_DIR).nodes.some((n: { id: string }) => n.id === "engine.foo")).toBe(false);
    expect(readGraph(TMP_DIR).nodes.length).toBe(1);
    expect(readQueueFile(TMP_DIR).length).toBe(1); // queue NOT truncated
  });

  it("TIER 1b: defer does NOT touch last-flush.iso (next call retries promptly)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    m.appendQueue(m.queuePath(), m.buildNodeEntry({ label: "Foo" }));
    const gwl = path.join(TMP_DIR, ".system-graph-write.pid");
    fs.writeFileSync(gwl, String(process.ppid));
    m.flushQueue({ graphWriteLock: gwl });
    expect(fs.existsSync(m.lastFlushPath())).toBe(false);
  });

  it("TIER 1b: a dead shared-lock PID does NOT block the flush (self-heals)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    m.appendQueue(m.queuePath(), m.buildNodeEntry({ label: "Foo" }));
    const gwl = path.join(TMP_DIR, ".system-graph-write.pid");
    fs.writeFileSync(gwl, "999999999"); // dead pid → stale lock, must reclaim
    const r = m.flushQueue({ graphWriteLock: gwl });
    expect(r.flushed).toBe(1);
    expect(r.batch).toBe(1);
    expect(readGraph(TMP_DIR).nodes.some((n: { id: string }) => n.id === "engine.foo")).toBe(true);
  });

  it("TIER 1b: absent shared lock is a no-op (no-contention path byte-identical to pre-F11)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    m.appendQueue(m.queuePath(), m.buildNodeEntry({ label: "Foo" }));
    // graphWriteLock points at a path that does NOT exist → isActive=false → fall through.
    const r = m.flushQueue({ graphWriteLock: path.join(TMP_DIR, ".absent-graph-write.pid") });
    expect(r.flushed).toBe(1);
    expect(readGraph(TMP_DIR).nodes.some((n: { id: string }) => n.id === "engine.foo")).toBe(true);
  });

  it("TIER 2: aborts the write if the graph mtime changes during the read-modify window", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, [{ id: "engine.existing" }]);
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    // Spy on statSync: first call (the read-time capture) returns the real
    // mtime; the second call (the pre-write CAS check) returns a DIFFERENT
    // mtime — simulating a regen that landed mid-window.
    const realStat = fs.statSync.bind(fs);
    let statCalls = 0;
    const spy = vi.spyOn(fs, "statSync").mockImplementation(((p: fs.PathLike, ...rest: unknown[]) => {
      const s = realStat(p as string, ...(rest as []));
      if (String(p).endsWith("system-graph.json")) {
        statCalls++;
        if (statCalls >= 2) {
          // Mutate the reported mtime so the CAS check sees a change.
          return { ...s, mtimeMs: s.mtimeMs + 99999 } as fs.Stats;
        }
      }
      return s;
    }) as typeof fs.statSync);
    const r = m.flushQueue({});
    spy.mockRestore();
    expect(r.error).toBe("graph_changed_during_flush");
    expect(r.flushed).toBe(0);
    // Queue must be intact so the batch retries against the fresh graph.
    expect(readQueueFile(TMP_DIR).length).toBe(1);
    // Graph must still be exactly the pre-flush single node — write aborted.
    expect(readGraph(TMP_DIR).nodes.length).toBe(1);
    expect(readGraph(TMP_DIR).nodes.some(n => n.id === "engine.foo")).toBe(false);
  });

  it("TIER 3: detects a post-write clobber and preserves the queue for retry", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, [{ id: "engine.existing" }]);
    const qp = m.queuePath();
    m.appendQueue(qp, m.buildNodeEntry({ label: "Foo" }));
    // Spy on readFileSync: the FIRST graph read returns the real content;
    // the post-write VERIFY read returns a graph WITHOUT our added id
    // (simulating a regen that clobbered us in the stat->rename gap).
    const realRead = fs.readFileSync.bind(fs);
    let graphReads = 0;
    const spy = vi.spyOn(fs, "readFileSync").mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
      const out = realRead(p as string, ...(rest as []));
      if (String(p).endsWith("system-graph.json")) {
        graphReads++;
        if (graphReads >= 2) {
          // Verify-read: return a graph that does NOT contain engine.foo.
          return JSON.stringify({ schemaVersion: 1, nodes: [{ id: "engine.existing" }], edges: [] });
        }
      }
      return out;
    }) as typeof fs.readFileSync);
    const r = m.flushQueue({});
    spy.mockRestore();
    expect(r.error).toBe("graph_clobbered_post_write");
    expect(r.flushed).toBe(0);
    expect(r.clobberedIds).toBe(1);
    // Queue intact — the batch retries on the next flush.
    expect(readQueueFile(TMP_DIR).length).toBe(1);
  });

  it("clean path: no regen, stable mtime, verified write — flush succeeds normally", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    m.appendQueue(m.queuePath(), m.buildNodeEntry({ label: "Foo" }));
    const r = m.flushQueue({});
    expect(r.flushed).toBe(1);
    expect(r.batch).toBe(1);
    expect(r.queueDepth).toBe(0);
    expect(readGraph(TMP_DIR).nodes.some(n => n.id === "engine.foo")).toBe(true);
    expect(readQueueFile(TMP_DIR).length).toBe(0);
    // last-flush.iso IS written on a successful flush.
    expect(fs.existsSync(m.lastFlushPath())).toBe(true);
  });
});

// ─── main() integration ─────────────────────────────────────────────────────

describe("main() integration", () => {
  it("disabled-by-env short-circuits with note", async () => {
    const m = await import(SCRIPT_PATH);
    process.env.PRISM_SYSTEM_VIZ_ADD_NODE_DISABLE = "1";
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      const code = await m.main(["--label", "Foo"]);
      expect(code).toBe(0);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.disabled).toBe(true);
    expect(out.note).toBe("disabled-by-env");
  });

  it("validation error returns exit code 1", async () => {
    const m = await import(SCRIPT_PATH);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      const code = await m.main(["--json"]); // no --label
      expect(code).toBe(1);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/label/);
  });

  it("--no-flush enqueues but skips flush", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      const code = await m.main(["--label", "Foo", "--no-flush", "--json"]);
      expect(code).toBe(0);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.enqueued).toBe(1);
    expect(out.flushed).toBe(0);
    expect(out.flushedThisRun).toBe(false);
    expect(out.queueDepth).toBe(1);
    expect(readGraph(TMP_DIR).nodes.find(n => n.id === "engine.foo")).toBeUndefined();
  });

  it("--force-flush flushes regardless of elapsed time", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    // Pre-touch last-flush.iso so elapsed is < 60s
    fs.mkdirSync(m.stagingDir(), { recursive: true });
    fs.writeFileSync(m.lastFlushPath(), new Date().toISOString());
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      await m.main(["--label", "Foo", "--force-flush", "--json"]);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.flushed).toBe(1);
    expect(readGraph(TMP_DIR).nodes.find(n => n.id === "engine.foo")).toBeTruthy();
  });

  it("idempotent: second call with same label is a no-op enqueue", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      await m.main(["--label", "Foo", "--force-flush", "--json"]);
      await m.main(["--label", "Foo", "--force-flush", "--json"]);
    } finally { console.log = orig; }
    const out2 = JSON.parse(stdout[1]);
    expect(out2.enqueued).toBe(0);
    expect(out2.duplicate).toBe(true);
    const g = readGraph(TMP_DIR);
    expect(g.nodes.filter(n => n.id === "engine.foo").length).toBe(1);
  });

  it("--engine-file derives label + sets engine=true", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      await m.main(["--engine-file", "src/engines/FooEngine.ts", "--force-flush", "--json"]);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.id).toBe("engine.fooengine");
    expect(out.label).toBe("FooEngine");
    const g = readGraph(TMP_DIR);
    const node = g.nodes.find(n => n.id === "engine.fooengine")!;
    expect(node).toBeTruthy();
    expect((node as { subgroup: string }).subgroup).toBe("unwired");
  });

  it("respects PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS env override (sub-second flush)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    // Set flush interval to 0 ms — every call flushes
    process.env.PRISM_SYSTEM_VIZ_FLUSH_INTERVAL_MS = "0";
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      await m.main(["--label", "Foo", "--json"]);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.flushed).toBe(1);
  });

  it("invalid --id is rejected with exit 1", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      const code = await m.main(["--label", "Foo", "--id", "../escape", "--json"]);
      expect(code).toBe(1);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/must match|traversal/);
  });

  it("SIGINT handler is registered only once across repeated main() calls", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    // Snapshot BEFORE this test seeds anything — prior tests may have
    // already registered our handler on first main() invocation. So we
    // take the baseline NOW and assert that 5 more invocations add zero.
    const baseline = process.listenerCount("SIGINT");
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      // Sequential by design — we are verifying the cumulative
      // listener-count delta across N CLI invocations is bounded.
      // Promise.all() would race the same env vars and corrupt the count.
      for (let i = 0; i < 5; i++) {
        await m.main(["--label", `Foo${i}`, "--no-flush", "--json"]);
      }
    } finally { console.log = orig; }
    const after = process.listenerCount("SIGINT");
    // Adding listeners ON TOP of a possibly-already-registered baseline:
    // delta MUST be zero. If main() were registering one-per-call there
    // would be 5 new listeners; one-per-process should add zero (at most
    // one if this is the very first main() call in the test file).
    expect(after - baseline).toBeLessThanOrEqual(1);
    // Strong invariant: regardless of starting state, the listener count
    // is BOUNDED — never grows with N regardless of how main() is called.
    expect(after).toBeLessThanOrEqual(baseline + 1);
  });

  it("releases the PID lock after a successful flush (no leak across calls)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      await m.main(["--label", "Foo", "--force-flush", "--json"]);
    } finally { console.log = orig; }
    expect(fs.existsSync(m.pidFilePath())).toBe(false);
  });

  it("--force-flush rewrites last-flush.iso even when one already exists", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    fs.mkdirSync(m.stagingDir(), { recursive: true });
    const stale = "2020-01-01T00:00:00.000Z";
    fs.writeFileSync(m.lastFlushPath(), stale);
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      await m.main(["--label", "Foo", "--force-flush", "--json"]);
    } finally { console.log = orig; }
    const updated = fs.readFileSync(m.lastFlushPath(), "utf8").trim();
    expect(updated).not.toBe(stale);
    expect(Date.parse(updated)).toBeGreaterThan(Date.parse(stale));
    const out = JSON.parse(stdout[0]);
    expect(out.flushedThisRun).toBe(true);
  });

  it("short-circuits with skipped-flush-lock-held when a peer holds the PID lock", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    // Seed the PID file with the parent's pid (known-alive, definitely
    // not us) so acquirePidLock returns false.
    fs.mkdirSync(m.stagingDir(), { recursive: true });
    fs.writeFileSync(m.pidFilePath(), String(process.ppid));
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      const code = await m.main(["--label", "Foo", "--force-flush", "--json"]);
      expect(code).toBe(0);
    } finally { console.log = orig; }
    const out = JSON.parse(stdout[0]);
    expect(out.note).toBe("skipped-flush-lock-held");
    expect(out.flushed).toBe(0);
    expect(out.enqueued).toBe(1); // the entry was still queued
    // Graph must NOT have been mutated — the peer should be the one flushing.
    const g = readGraph(TMP_DIR);
    expect(g.nodes.find(n => n.id === "engine.foo")).toBeUndefined();
  });

  it("exit code 2 on enqueue_failed (read-only staging dir simulation)", async () => {
    const m = await import(SCRIPT_PATH);
    seedGraph(TMP_DIR, []);
    // Force appendQueue to throw by replacing the staging dir with a file
    // (Windows: regular file at that path → mkdirSync recursive will fail).
    // Pre-create the parent + drop a regular file where the staging dir
    // should be so mkdirSync recursive throws ENOTDIR / EEXIST.
    fs.mkdirSync(path.dirname(m.stagingDir()), { recursive: true });
    fs.writeFileSync(m.stagingDir(), "blocker"); // file where dir expected
    const stdout: string[] = [];
    const orig = console.log;
    console.log = (s: string) => stdout.push(s);
    try {
      const code = await m.main(["--label", "Foo", "--no-flush", "--json"]);
      expect(code).toBe(2);
    } finally {
      console.log = orig;
      try { fs.unlinkSync(m.stagingDir()); } catch {}
    }
    const out = JSON.parse(stdout[0]);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/enqueue_failed|idempotency_check_failed/);
  });
});

describe("vizDir + path helpers honor PRISM_SYSTEM_VIZ_DIR", () => {
  it("vizDir() resolves the env override to an absolute path", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.vizDir()).toBe(path.resolve(TMP_DIR));
  });

  it("stagingDir / queuePath / lastFlushPath / pidFilePath / graphPath nest under vizDir", async () => {
    const m = await import(SCRIPT_PATH);
    expect(m.stagingDir()).toBe(path.join(TMP_DIR, "staging"));
    expect(m.queuePath()).toBe(path.join(TMP_DIR, "staging", "add-node-queue.jsonl"));
    expect(m.lastFlushPath()).toBe(path.join(TMP_DIR, "staging", ".last-flush.iso"));
    expect(m.pidFilePath()).toBe(path.join(TMP_DIR, "staging", ".system-viz-add-node.pid"));
    expect(m.graphPath()).toBe(path.join(TMP_DIR, "system-graph.json"));
  });

  it("whitespace-only PRISM_SYSTEM_VIZ_DIR falls back to the default", async () => {
    const m = await import(SCRIPT_PATH);
    process.env.PRISM_SYSTEM_VIZ_DIR = "   ";
    const resolved = m.vizDir();
    // Default is ROOT/state/shared/system-viz under H:/prism
    expect(resolved.endsWith(path.join("state", "shared", "system-viz"))).toBe(true);
  });
});

describe("appendQueue (direct)", () => {
  it("writes a single newline-terminated JSONL row", async () => {
    const m = await import(SCRIPT_PATH);
    const qp = path.join(TMP_DIR, "test-queue.jsonl");
    m.appendQueue(qp, { id: "engine.a", layer: "L5" });
    const raw = fs.readFileSync(qp, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(JSON.parse(raw.trim())).toEqual({ id: "engine.a", layer: "L5" });
  });

  it("appends additional rows without overwriting prior ones", async () => {
    const m = await import(SCRIPT_PATH);
    const qp = path.join(TMP_DIR, "test-queue.jsonl");
    m.appendQueue(qp, { id: "engine.a" });
    m.appendQueue(qp, { id: "engine.b" });
    m.appendQueue(qp, { id: "engine.c" });
    const lines = fs.readFileSync(qp, "utf8").trim().split("\n");
    expect(lines.length).toBe(3);
    expect(lines.map(l => JSON.parse(l).id)).toEqual(["engine.a", "engine.b", "engine.c"]);
  });

  it("creates the parent directory if missing", async () => {
    const m = await import(SCRIPT_PATH);
    const qp = path.join(TMP_DIR, "deep", "nested", "queue.jsonl");
    m.appendQueue(qp, { id: "engine.x" });
    expect(fs.existsSync(qp)).toBe(true);
  });
});

describe("emit (direct)", () => {
  it("json mode emits a single JSON-parseable line", async () => {
    const m = await import(SCRIPT_PATH);
    const lines: string[] = [];
    const orig = console.log;
    console.log = (s: string) => lines.push(s);
    try {
      m.emit({ ok: true, enqueued: 1, flushed: 0, skipped: 0, corrupt: 0, queueDepth: 1 }, true);
    } finally { console.log = orig; }
    expect(lines.length).toBe(1);
    expect(JSON.parse(lines[0])).toMatchObject({ ok: true, enqueued: 1 });
  });

  it("plaintext mode emits space-separated key=value pairs", async () => {
    const m = await import(SCRIPT_PATH);
    const lines: string[] = [];
    const orig = console.log;
    console.log = (s: string) => lines.push(s);
    try {
      m.emit({ enqueued: 2, flushed: 1, skipped: 0, corrupt: 1, queueDepth: 0 }, false);
    } finally { console.log = orig; }
    expect(lines[0]).toContain("enqueued=2");
    expect(lines[0]).toContain("flushed=1");
    expect(lines[0]).toContain("corrupt=1");
    expect(lines[0]).toContain("queueDepth=0");
  });

  it("plaintext mode appends error= and note= only when present", async () => {
    const m = await import(SCRIPT_PATH);
    const lines: string[] = [];
    const orig = console.log;
    console.log = (s: string) => lines.push(s);
    try {
      m.emit({ ok: false, error: "graph_missing" }, false);
      m.emit({ ok: true, note: "disabled-by-env" }, false);
      m.emit({ ok: true, flushed: 0 }, false);
    } finally { console.log = orig; }
    expect(lines[0]).toContain("error=graph_missing");
    expect(lines[1]).toContain("note=disabled-by-env");
    expect(lines[2]).not.toContain("error=");
    expect(lines[2]).not.toContain("note=");
  });
});
