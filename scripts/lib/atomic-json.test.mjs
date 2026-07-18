/**
 * atomic-json.test.mjs — node:test suite for the canonical atomic JSON writer.
 * Run: node --test scripts/lib/atomic-json.test.mjs
 *
 * U-ROADMAP-INDEX-WRITER-CONSOLIDATE (2026-05-19).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWriteJson, atomicWriteText } from "./atomic-json.mjs";

/** Fresh temp dir per call; each disk-touching test removes its own dir via rmSync. */
function freshDir() {
  return mkdtempSync(join(tmpdir(), "prism-atomic-json-"));
}

test("round-trips a plain object", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  const obj = { a: 1, b: "two", c: true };
  atomicWriteJson(p, obj);
  assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), obj);
  rmSync(dir, { recursive: true, force: true });
});

test("round-trips nested objects and arrays", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  const obj = { milestones: [{ id: "M1", units: ["U1", "U2"] }], meta: { n: 0, deep: { x: [1, 2, 3] } } };
  atomicWriteJson(p, obj);
  assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), obj);
  rmSync(dir, { recursive: true, force: true });
});

test("emits pretty 2-space indentation", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  atomicWriteJson(p, { a: { b: 1 } });
  const txt = readFileSync(p, "utf8");
  assert.match(txt, /\n  "a": \{\n    "b": 1\n  \}/);
  rmSync(dir, { recursive: true, force: true });
});

test("appends a trailing newline by default", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  atomicWriteJson(p, { a: 1 });
  assert.equal(readFileSync(p, "utf8").endsWith("}\n"), true);
  rmSync(dir, { recursive: true, force: true });
});

test("trailingNewline:false omits the trailing newline", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  atomicWriteJson(p, { a: 1 }, { trailingNewline: false });
  const txt = readFileSync(p, "utf8");
  assert.equal(txt.endsWith("}"), true);
  assert.equal(txt.endsWith("}\n"), false);
  rmSync(dir, { recursive: true, force: true });
});

test("leaves no temp sibling behind after a successful write", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  atomicWriteJson(p, { a: 1 });
  const leftovers = readdirSync(dir).filter((f) => f.includes(".tmp-"));
  assert.deepEqual(leftovers, []);
  assert.deepEqual(readdirSync(dir), ["out.json"]);
  rmSync(dir, { recursive: true, force: true });
});

test("overwrites an existing destination file", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  writeFileSync(p, JSON.stringify({ stale: true }));
  atomicWriteJson(p, { fresh: 1 });
  assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), { fresh: 1 });
  rmSync(dir, { recursive: true, force: true });
});

test("returns the destination path", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  assert.equal(atomicWriteJson(p, { a: 1 }), p);
  rmSync(dir, { recursive: true, force: true });
});

test("temp path is per-PID — distinct processes cannot collide", () => {
  const calls = [];
  const fsImpl = {
    writeFileSync: (path) => calls.push(["write", path]),
    renameSync: (from, to) => calls.push(["rename", from, to]),
  };
  atomicWriteJson("/dest/roadmap-index.json", { a: 1 }, { fsImpl });
  const tmp = calls[0][1];
  assert.equal(tmp, `/dest/roadmap-index.json.tmp-${process.pid}`);
  // the tmp suffix carries this process's PID so a peer process writing the
  // same destination uses a different sibling — no clobber.
  assert.match(tmp, /\.tmp-\d+$/);
});

test("writes the temp file BEFORE renaming it onto the destination", () => {
  const calls = [];
  const fsImpl = {
    writeFileSync: (path) => calls.push(["write", path]),
    renameSync: (from, to) => calls.push(["rename", from, to]),
  };
  const dest = "/dest/out.json";
  atomicWriteJson(dest, { a: 1 }, { fsImpl });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "write");
  assert.equal(calls[1][0], "rename");
  // rename moves the exact temp that was written → destination
  assert.equal(calls[1][1], calls[0][1]); // from === tmp written
  assert.equal(calls[1][2], dest); //        to   === destination
});

test("propagates a writeFileSync failure — does not swallow (R12 fail-loud)", () => {
  const fsImpl = {
    writeFileSync: () => { throw new Error("ENOSPC: disk full"); },
    renameSync: () => assert.fail("renameSync must not run after a failed write"),
  };
  assert.throws(() => atomicWriteJson("/dest/out.json", { a: 1 }, { fsImpl }), /ENOSPC/);
});

test("propagates a renameSync failure and removes the orphaned temp (R12 fail-loud)", () => {
  const unlinked = [];
  const fsImpl = {
    writeFileSync: () => {},
    renameSync: () => { throw new Error("EPERM: rename not permitted"); },
    unlinkSync: (p) => unlinked.push(p),
  };
  assert.throws(() => atomicWriteJson("/dest/out.json", { a: 1 }, { fsImpl }), /EPERM/);
  // on rename failure the helper best-effort unlinks the temp sibling it wrote
  assert.deepEqual(unlinked, [`/dest/out.json.tmp-${process.pid}`]);
});

test("a failed temp cleanup is swallowed — the original rename error still wins", () => {
  const fsImpl = {
    writeFileSync: () => {},
    renameSync: () => { throw new Error("EPERM: original failure"); },
    unlinkSync: () => { throw new Error("ENOENT: temp already gone"); },
  };
  // the cleanup error must NOT mask the real rename failure
  assert.throws(() => atomicWriteJson("/dest/out.json", { a: 1 }, { fsImpl }), /original failure/);
});

test("a non-serializable value throws before any file is created", () => {
  const dir = freshDir();
  const p = join(dir, "out.json");
  assert.throws(() => atomicWriteJson(p, { big: 10n }), TypeError); // BigInt is not JSON
  assert.equal(readdirSync(dir).length, 0); // nothing written — not even a temp
  rmSync(dir, { recursive: true, force: true });
});

test("serializes content exactly as the inline copies did (byte-parity)", () => {
  // The 3 consolidated scripts previously did:
  //   writeFileSync(tmp, JSON.stringify(index, null, 2) [+ "\n"])
  // Prove the helper reproduces both variants byte-for-byte.
  const dir = freshDir();
  const idx = { schemaVersion: "1", milestones: [{ id: "M" }] };
  const withNl = join(dir, "a.json");
  const noNl = join(dir, "b.json");
  atomicWriteJson(withNl, idx); // register-devtools variant (had + "\n")
  atomicWriteJson(noNl, idx, { trailingNewline: false }); // reconcile / register-revenue variant
  assert.equal(readFileSync(withNl, "utf8"), JSON.stringify(idx, null, 2) + "\n");
  assert.equal(readFileSync(noNl, "utf8"), JSON.stringify(idx, null, 2));
  rmSync(dir, { recursive: true, force: true });
});

// ─── atomicWriteText (U-KIP03, 2026-05-19) ─────────────────────────
// Added to give kip-rotate-orphans-to-lora.mjs a canonical-lib path for
// JSONL output instead of inlining a twin of the atomic-write primitive.
// Per-file scrutiny P1 fix from the U-KIP03 ship.

test("atomicWriteText: writes a string body to the destination", () => {
  const dir = freshDir();
  const p = join(dir, "out.txt");
  atomicWriteText(p, "hello world\n");
  assert.equal(readFileSync(p, "utf8"), "hello world\n");
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: empty body produces an empty file (NOT a removed file)", () => {
  const dir = freshDir();
  const p = join(dir, "empty.jsonl");
  atomicWriteText(p, "");
  assert.equal(existsSync(p), true);
  assert.equal(readFileSync(p, "utf8"), "");
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: auto-creates missing parent directories", () => {
  const dir = freshDir();
  const p = join(dir, "deep", "nested", "path", "out.jsonl");
  atomicWriteText(p, "line1\nline2\n");
  assert.equal(readFileSync(p, "utf8"), "line1\nline2\n");
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: overwrites an existing destination atomically", () => {
  const dir = freshDir();
  const p = join(dir, "out.txt");
  writeFileSync(p, "stale content");
  atomicWriteText(p, "fresh content");
  assert.equal(readFileSync(p, "utf8"), "fresh content");
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: leaves no temp sibling after a successful write", () => {
  const dir = freshDir();
  const p = join(dir, "out.jsonl");
  atomicWriteText(p, "payload\n");
  const leftovers = readdirSync(dir).filter((f) => f.includes(".tmp-"));
  assert.deepEqual(leftovers, []);
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: returns the destination path", () => {
  const dir = freshDir();
  const p = join(dir, "out.txt");
  assert.equal(atomicWriteText(p, "x"), p);
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: temp path is per-PID — distinct processes cannot collide", () => {
  const calls = [];
  const fsImpl = {
    writeFileSync: (path) => calls.push(["write", path]),
    renameSync: (from, to) => calls.push(["rename", from, to]),
    existsSync: () => true, // pretend parent dir exists
    mkdirSync: () => {},
  };
  atomicWriteText("/dest/file.jsonl", "body", { fsImpl });
  const tmp = calls[0][1];
  assert.equal(tmp, `/dest/file.jsonl.tmp-${process.pid}`);
  assert.match(tmp, /\.tmp-\d+$/);
});

test("atomicWriteText: writes the temp BEFORE renaming onto the destination", () => {
  const calls = [];
  const fsImpl = {
    writeFileSync: (path) => calls.push(["write", path]),
    renameSync: (from, to) => calls.push(["rename", from, to]),
    existsSync: () => true,
    mkdirSync: () => {},
  };
  atomicWriteText("/dest/out.jsonl", "body", { fsImpl });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "write");
  assert.equal(calls[1][0], "rename");
  assert.equal(calls[1][1], calls[0][1]); // from === tmp written
  assert.equal(calls[1][2], "/dest/out.jsonl");
});

test("atomicWriteText: propagates writeFileSync failure (R12 fail-loud)", () => {
  const fsImpl = {
    writeFileSync: () => { throw new Error("ENOSPC: disk full"); },
    renameSync: () => assert.fail("rename must not run after write failure"),
    existsSync: () => true,
    mkdirSync: () => {},
  };
  assert.throws(() => atomicWriteText("/dest/file.jsonl", "body", { fsImpl }), /ENOSPC/);
});

test("atomicWriteText: propagates renameSync failure and unlinks orphan temp", () => {
  const unlinked = [];
  const fsImpl = {
    writeFileSync: () => {},
    renameSync: () => { throw new Error("EPERM"); },
    unlinkSync: (p) => unlinked.push(p),
    existsSync: () => true,
    mkdirSync: () => {},
  };
  assert.throws(() => atomicWriteText("/dest/file.jsonl", "body", { fsImpl }), /EPERM/);
  assert.deepEqual(unlinked, [`/dest/file.jsonl.tmp-${process.pid}`]);
});

test("atomicWriteText: failed unlink does NOT mask original rename failure", () => {
  const fsImpl = {
    writeFileSync: () => {},
    renameSync: () => { throw new Error("EPERM: original failure"); },
    unlinkSync: () => { throw new Error("ENOENT: cleanup failed"); },
    existsSync: () => true,
    mkdirSync: () => {},
  };
  assert.throws(() => atomicWriteText("/dest/file.jsonl", "body", { fsImpl }), /original failure/);
});

test("atomicWriteText: rejects non-string filePath (R12 fail-loud)", () => {
  assert.throws(() => atomicWriteText(null, "body"), TypeError);
  assert.throws(() => atomicWriteText(42, "body"), TypeError);
  assert.throws(() => atomicWriteText("", "body"), /non-empty string/);
});

test("atomicWriteText: rejects non-string body (R12 fail-loud)", () => {
  assert.throws(() => atomicWriteText("/dest/x", null), /must be a string/);
  assert.throws(() => atomicWriteText("/dest/x", 42), /must be a string/);
  assert.throws(() => atomicWriteText("/dest/x", { a: 1 }), /must be a string/);
});

test("atomicWriteText: handles JSONL with embedded special characters", () => {
  const dir = freshDir();
  const p = join(dir, "special.jsonl");
  // Real JSONL would have quoted special chars via JSON.stringify; this proves
  // the writer doesn't munge bytes (e.g. CRLF normalization, BOM injection).
  const body = '{"a":"line\\nwith\\\\escape"}\n{"b":"unicode-\\u2603"}\n';
  atomicWriteText(p, body);
  assert.equal(readFileSync(p, "utf8"), body);
  rmSync(dir, { recursive: true, force: true });
});

test("atomicWriteText: handles large body (>1MB)", () => {
  const dir = freshDir();
  const p = join(dir, "large.jsonl");
  // ~1.5MB of JSONL-shaped content
  const lines = [];
  for (let i = 0; i < 20000; i++) {
    lines.push(JSON.stringify({ id: `kip-${i.toString().padStart(6, "0")}`, payload: "x".repeat(50) }));
  }
  const body = lines.join("\n") + "\n";
  atomicWriteText(p, body);
  assert.equal(readFileSync(p, "utf8").length, body.length);
  rmSync(dir, { recursive: true, force: true });
});
