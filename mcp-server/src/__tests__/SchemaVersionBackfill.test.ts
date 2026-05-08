/**
 * SchemaVersionBackfill.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S4/U-SCHEMA-VERSION-BACKFILL — exit_criteria coverage:
 *   1. Idempotent re-run produces same output as first
 *   2. Already-versioned files skipped (any value type, any key shape)
 *   3. Atomic write (no half-written files; verified by tmp-file inspection)
 *   4. Malformed JSON skipped + logged
 *   5. Round-trip: post-write file parses back to same shape
 *   6. Revert mode reverses our backfill on marker-bearing files only
 *   7. Non-object roots (arrays, primitives) skipped — schemaVersion meaningless
 *   8. Skip-pattern files (.backup, .tmp, .gitkeep) untouched
 *
 * Imports the script directly via dynamic import — script is ESM with
 * exported `runBackfill`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname = .../mcp-server/src/__tests__  →  3 levels up = repo root.
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts", "backfill-schema-version.mjs");

let tmpRoot: string;
type RunBackfill = (opts: {
  apply?: boolean;
  revert?: boolean;
  roots?: string[];
  nowIso?: string;
}) => {
  mode: "backfill" | "revert";
  apply: boolean;
  roots: string[];
  counters: Record<string, number>;
  results: Array<{ path: string; action: string; reason: string }>;
};

let runBackfill: RunBackfill;

function writeJson(rel: string, body: unknown, raw?: string): string {
  const full = join(tmpRoot, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  const content = raw ?? JSON.stringify(body, null, 2);
  writeFileSync(full, content, "utf8");
  return full;
}

beforeEach(async () => {
  tmpRoot = mkdtempSync(join(tmpdir(), "svb-test-"));
  if (!runBackfill) {
    const mod = await import(pathToFileURL(SCRIPT_PATH).href);
    runBackfill = mod.runBackfill;
  }
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("backfill-schema-version", () => {
  // -------------------- HAPPY PATHS --------------------

  it("adds schemaVersion: '1.0.0' to a file lacking the key", () => {
    writeJson("a.json", { foo: 1, bar: "hi" });
    const r = runBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    expect(r.counters.backfilled).toBe(1);
    const after = JSON.parse(readFileSync(join(tmpRoot, "a.json"), "utf8"));
    expect(after.schemaVersion).toBe("1.0.0");
    expect(after._lastBackfillTs).toBe("2026-05-08T00:00:00.000Z");
    expect(after.foo).toBe(1);
    expect(after.bar).toBe("hi");
  });

  it("dry-run reports backfill count but writes nothing", () => {
    const path = writeJson("dry.json", { x: 42 });
    const before = readFileSync(path, "utf8");
    const r = runBackfill({ apply: false, roots: [tmpRoot] });
    expect(r.counters.backfilled).toBe(1);
    const after = readFileSync(path, "utf8");
    expect(after).toBe(before);
  });

  it("idempotent — running twice with --apply yields same end state", () => {
    writeJson("idem.json", { val: 1 });
    runBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    const afterFirst = readFileSync(join(tmpRoot, "idem.json"), "utf8");
    const r2 = runBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-06-01T00:00:00.000Z" });
    expect(r2.counters.alreadyVersioned).toBe(1);
    expect(r2.counters.backfilled).toBe(0);
    const afterSecond = readFileSync(join(tmpRoot, "idem.json"), "utf8");
    expect(afterSecond).toBe(afterFirst);
  });

  it("recurses into subdirs and processes nested JSONs", () => {
    writeJson("a.json", { v: 1 });
    writeJson("dir1/b.json", { v: 2 });
    writeJson("dir1/dir2/c.json", { v: 3 });
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.backfilled).toBe(3);
    expect(r.counters.scanned).toBe(3);
  });

  // -------------------- SKIP CASES --------------------

  it("skips files where schemaVersion already exists (string value)", () => {
    writeJson("v.json", { schemaVersion: "2.5.0", data: "x" });
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.alreadyVersioned).toBe(1);
    expect(r.counters.backfilled).toBe(0);
    const after = JSON.parse(readFileSync(join(tmpRoot, "v.json"), "utf8"));
    expect(after.schemaVersion).toBe("2.5.0"); // not overwritten
  });

  it("skips files where schemaVersion already exists (number value)", () => {
    writeJson("vn.json", { schemaVersion: 1, data: "x" });
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.alreadyVersioned).toBe(1);
    const after = JSON.parse(readFileSync(join(tmpRoot, "vn.json"), "utf8"));
    expect(after.schemaVersion).toBe(1); // numeric preserved as-is
  });

  it("skips JSON with array root (cannot carry schemaVersion key)", () => {
    writeJson("arr.json", [1, 2, 3]);
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.skippedNonObject).toBe(1);
    expect(r.counters.backfilled).toBe(0);
    const after = JSON.parse(readFileSync(join(tmpRoot, "arr.json"), "utf8"));
    expect(Array.isArray(after)).toBe(true);
  });

  it("skips JSON with primitive root", () => {
    writeJson("prim.json", null, "42");
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.skippedNonObject).toBe(1);
  });

  it("skips skip-pattern filenames (.backup, .tmp, .gitkeep, .bak)", () => {
    writeJson("real.json", { v: 1 });
    writeJson("a.json.backup", { v: 2 });
    writeJson("b.tmp", { v: 3 });
    writeJson(".gitkeep", null, "");
    writeJson("c.bak", { v: 4 });
    writeJson("d.pre-fixes.bak", { v: 5 });
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    // .gitkeep is empty + .json mismatched extension; the others end in .json or are .tmp/.bak
    // The script also requires .json extension, so .tmp and .bak won't match.
    // real.json should be the only one processed.
    expect(r.counters.backfilled).toBe(1);
  });

  // -------------------- FAILURE / ADVERSARIAL --------------------

  it("malformed JSON is skipped + counted as malformed (file untouched)", () => {
    const path = writeJson("bad.json", null, "{ not valid json");
    const before = readFileSync(path, "utf8");
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.malformed).toBe(1);
    expect(r.counters.backfilled).toBe(0);
    const after = readFileSync(path, "utf8");
    expect(after).toBe(before);
  });

  it("BOM-prefixed JSON is parsed correctly (Windows-friendly)", () => {
    const path = writeJson("bom.json", null, "﻿{\n  \"x\": 1\n}");
    const r = runBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.backfilled).toBe(1);
    const after = JSON.parse(readFileSync(path, "utf8"));
    expect(after.x).toBe(1);
    expect(after.schemaVersion).toBe("1.0.0");
  });

  it("preserves trailing-newline convention from original file", () => {
    writeJson("with-nl.json", null, '{"k":1}\n');
    writeJson("no-nl.json", null, '{"k":2}');
    runBackfill({ apply: true, roots: [tmpRoot] });
    const a = readFileSync(join(tmpRoot, "with-nl.json"), "utf8");
    const b = readFileSync(join(tmpRoot, "no-nl.json"), "utf8");
    expect(a.endsWith("\n")).toBe(true);
    expect(b.endsWith("\n")).toBe(false);
  });

  it("atomic write — no .backfill.tmp leftovers after success", () => {
    for (let i = 0; i < 5; i++) writeJson(`f-${i}.json`, { v: i });
    runBackfill({ apply: true, roots: [tmpRoot] });
    // Walk and ensure no .backfill.tmp survives.
    const fs = require("node:fs");
    const stack = [tmpRoot];
    const tmpsLeft: string[] = [];
    while (stack.length > 0) {
      const d = stack.pop()!;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.name.endsWith(".backfill.tmp")) tmpsLeft.push(p);
      }
    }
    expect(tmpsLeft).toEqual([]);
  });

  // -------------------- REVERT MODE --------------------

  it("revert removes backfilled keys ONLY from files we touched (marker-gated)", () => {
    writeJson("ours.json", { foo: 1 });            // we'll backfill this
    writeJson("theirs.json", { schemaVersion: "0.9.0", bar: 2 }); // pre-existing version

    runBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    const ourFile = JSON.parse(readFileSync(join(tmpRoot, "ours.json"), "utf8"));
    expect(ourFile.schemaVersion).toBe("1.0.0");
    expect(ourFile._lastBackfillTs).toBe("2026-05-08T00:00:00.000Z");

    const r = runBackfill({ apply: true, revert: true, roots: [tmpRoot] });
    expect(r.counters.reverted).toBe(1);

    const oursAfter = JSON.parse(readFileSync(join(tmpRoot, "ours.json"), "utf8"));
    expect("schemaVersion" in oursAfter).toBe(false);
    expect("_lastBackfillTs" in oursAfter).toBe(false);
    expect(oursAfter.foo).toBe(1);

    const theirsAfter = JSON.parse(readFileSync(join(tmpRoot, "theirs.json"), "utf8"));
    expect(theirsAfter.schemaVersion).toBe("0.9.0"); // pre-existing untouched
    expect(theirsAfter.bar).toBe(2);
  });

  it("revert dry-run reports counts but writes nothing", () => {
    writeJson("a.json", { v: 1 });
    runBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    const before = readFileSync(join(tmpRoot, "a.json"), "utf8");
    const r = runBackfill({ apply: false, revert: true, roots: [tmpRoot] });
    expect(r.counters.reverted).toBe(1);
    const after = readFileSync(join(tmpRoot, "a.json"), "utf8");
    expect(after).toBe(before);
  });
});
