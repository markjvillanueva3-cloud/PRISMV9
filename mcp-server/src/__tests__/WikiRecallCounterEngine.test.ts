/**
 * WikiRecallCounterEngine.test.ts — companion test for U-RECALL-COUNTER
 *
 * Tests the recall counter against an isolated tmp state file so concurrent
 * runs (vitest parallel) and the live production sidecar at
 * mcp-server/data/state/wiki-recall-counts.json never collide.
 *
 * Coverage axes (per CLAUDE.md comprehensive-build floor):
 *   - happy path: increment, query, top-N
 *   - 3 failure modes: unknown key, corrupt sidecar, missing dir
 *   - 2 adversarial: empty key, NaN limit on top-N
 *   - schema integrity: snapshot validates against WikiRecallStateSchema
 *   - cross-instance: a second engine sharing the file sees the count
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  WikiRecallCounterEngine,
  WikiRecallStateSchema,
  WIKI_RECALL_SCHEMA_VERSION,
} from "../engines/WikiRecallCounterEngine.js";

let tmpDir: string;
let stateFile: string;
let engine: WikiRecallCounterEngine;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-counter-"));
  stateFile = path.join(tmpDir, "wiki-recall-counts.json");
  engine = new WikiRecallCounterEngine(stateFile);
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("WikiRecallCounterEngine — happy path", () => {
  it("creates a fresh entry on first recall", () => {
    const entry = engine.recordRecall("memory", "memory/feedback/feedback_xyz");
    expect(entry.count).toBe(1);
    expect(entry.kind).toBe("memory");
    expect(entry.firstSeenIso).toEqual(entry.lastSeenIso);
  });

  it("increments existing entry on subsequent recalls", () => {
    engine.recordRecall("memory", "memory/feedback/foo");
    engine.recordRecall("memory", "memory/feedback/foo");
    const entry = engine.recordRecall("memory", "memory/feedback/foo");
    expect(entry.count).toBe(3);
    expect(entry.firstSeenIso <= entry.lastSeenIso).toBe(true);
  });

  it("returns 0 for unknown key", () => {
    expect(engine.getRecallCount("memory/feedback/never-seen")).toBe(0);
  });

  it("returns top-N sorted by count descending", () => {
    engine.recordRecall("memory", "a");
    engine.recordRecall("memory", "a");
    engine.recordRecall("memory", "a");
    engine.recordRecall("memory", "b");
    engine.recordRecall("memory", "b");
    engine.recordRecall("wiki", "c");
    const top = engine.getTopRecalled(5);
    expect(top.length).toBe(3);
    expect(top[0].key).toBe("a");
    expect(top[0].count).toBe(3);
    expect(top[1].key).toBe("b");
    expect(top[2].key).toBe("c");
  });

  it("filters top-N by kind", () => {
    engine.recordRecall("memory", "m1");
    engine.recordRecall("wiki", "w1");
    engine.recordRecall("wiki", "w1");
    const wikiOnly = engine.getTopRecalled(10, "wiki");
    expect(wikiOnly.length).toBe(1);
    expect(wikiOnly[0].kind).toBe("wiki");
  });

  it("getAllCounts returns flat key→count map", () => {
    engine.recordRecall("memory", "m1");
    engine.recordRecall("memory", "m1");
    engine.recordRecall("wiki", "w1");
    const map = engine.getAllCounts();
    expect(map.m1).toBe(2);
    expect(map.w1).toBe(1);
  });

  it("snapshot conforms to WikiRecallStateSchema", () => {
    engine.recordRecall("memory", "x");
    const snap = engine.getStateSnapshot();
    const result = WikiRecallStateSchema.safeParse(snap);
    expect(result.success).toBe(true);
    expect(snap.schemaVersion).toBe(WIKI_RECALL_SCHEMA_VERSION);
    expect(snap.entryCount).toBe(1);
    expect(snap.totalRecalls).toBe(1);
  });
});

describe("WikiRecallCounterEngine — failure modes", () => {
  it("recovers from a corrupt state file by starting fresh", () => {
    fs.writeFileSync(stateFile, "{ this is not valid json", "utf8");
    expect(engine.getRecallCount("anything")).toBe(0);
    // Subsequent recall should write a clean state file
    engine.recordRecall("memory", "rebuilt");
    const reread = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    expect(WikiRecallStateSchema.safeParse(reread).success).toBe(true);
  });

  it("recovers from a schema-mismatched state file", () => {
    fs.writeFileSync(stateFile, JSON.stringify({ schemaVersion: "0.0.0", garbage: true }), "utf8");
    const entry = engine.recordRecall("wiki", "fresh");
    expect(entry.count).toBe(1);
  });

  it("creates parent dir if missing", () => {
    const nestedDir = path.join(tmpDir, "deep", "nested", "path");
    const nestedFile = path.join(nestedDir, "wiki-recall-counts.json");
    const e = new WikiRecallCounterEngine(nestedFile);
    e.recordRecall("memory", "z");
    expect(fs.existsSync(nestedFile)).toBe(true);
  });
});

describe("WikiRecallCounterEngine — adversarial inputs", () => {
  it("rejects empty key", () => {
    expect(() => engine.recordRecall("memory", "")).toThrow();
  });

  it("rejects invalid kind", () => {
    // @ts-expect-error — testing runtime validation against bad kind
    expect(() => engine.recordRecall("invalid_kind", "key")).toThrow();
  });

  it("returns 0 for non-string key in getRecallCount", () => {
    // @ts-expect-error — testing runtime defensive check
    expect(engine.getRecallCount(undefined)).toBe(0);
    // @ts-expect-error
    expect(engine.getRecallCount(null)).toBe(0);
  });

  it("clamps NaN/negative limit on top-N", () => {
    engine.recordRecall("memory", "a");
    expect(engine.getTopRecalled(NaN).length).toBeLessThanOrEqual(20);
    expect(engine.getTopRecalled(-5).length).toBeLessThanOrEqual(20);
  });
});

describe("WikiRecallCounterEngine — cross-instance + reset", () => {
  it("a second engine sharing the file sees recorded counts", () => {
    engine.recordRecall("memory", "shared-key");
    engine.recordRecall("memory", "shared-key");
    const peer = new WikiRecallCounterEngine(stateFile);
    expect(peer.getRecallCount("shared-key")).toBe(2);
  });

  it("reset returns prior state and writes fresh state", () => {
    engine.recordRecall("memory", "k1");
    engine.recordRecall("memory", "k2");
    const before = engine.reset();
    expect(before.totalRecalls).toBe(2);
    const after = engine.getStateSnapshot();
    expect(after.totalRecalls).toBe(0);
    expect(after.entryCount).toBe(0);
  });
});
