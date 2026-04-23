import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { AtomicWritesEngine, atomicWritesEngine } from "../engines/AtomicWritesEngine.js";

describe("AtomicWritesEngine", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("singleton has matching class name", () => {
    expect(atomicWritesEngine).toBeInstanceOf(AtomicWritesEngine);
    expect(atomicWritesEngine.name).toBe("AtomicWritesEngine");
  });

  it("writeAtomic commits content to disk", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "a.txt");
    await engine.writeAtomic(target, "hello");
    expect(fs.readFileSync(target, "utf8")).toBe("hello");
  });

  it("writeAtomicSync commits content synchronously", () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "b.txt");
    engine.writeAtomicSync(target, "world");
    expect(fs.readFileSync(target, "utf8")).toBe("world");
  });

  it("leaves no temp file after successful write", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "c.txt");
    await engine.writeAtomic(target, "done");
    const leftover = fs.readdirSync(tmpDir).filter((f) => f.startsWith(".c.txt."));
    expect(leftover.length).toBe(0);
  });

  it("JSON roundtrip produces identical object", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "d.json");
    const obj = { n: 42, nested: { ok: true } };
    await engine.writeJSONAtomic(target, obj);
    const read = await engine.readJSONAtomic<typeof obj>(target);
    expect(read).toEqual(obj);
  });

  it("overwrites existing file", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "e.txt");
    fs.writeFileSync(target, "old");
    await engine.writeAtomic(target, "new");
    expect(fs.readFileSync(target, "utf8")).toBe("new");
  });

  it("exists returns correct boolean", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "f.txt");
    expect(await engine.exists(target)).toBe(false);
    await engine.writeAtomic(target, "x");
    expect(await engine.exists(target)).toBe(true);
  });

  it("FAIL: missing parent directory throws", async () => {
    const engine = new AtomicWritesEngine();
    await expect(engine.writeAtomic(
      path.join(tmpDir, "nonexistent-dir", "g.txt"),
      "x",
    )).rejects.toThrow(/parent directory does not exist/);
  });

  it("FAIL: empty target path rejected", async () => {
    const engine = new AtomicWritesEngine();
    await expect(engine.writeAtomic("", "x")).rejects.toThrow(/target path required/);
  });

  it("FAIL: null content rejected", async () => {
    const engine = new AtomicWritesEngine();
    await expect(engine.writeAtomic(
      path.join(tmpDir, "h.txt"),
      null as unknown as string,
    )).rejects.toThrow(/content required/);
  });

  it("FAIL: readJSONAtomic on invalid JSON throws", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "bad.json");
    await engine.writeAtomic(target, "not json {");
    await expect(engine.readJSONAtomic(target)).rejects.toThrow();
  });

  it("ADV: binary Uint8Array writes identical bytes", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "bin.dat");
    const data = new Uint8Array([0, 1, 2, 3, 255]);
    await engine.writeAtomic(target, data);
    const read = fs.readFileSync(target);
    expect(Array.from(read.subarray(0, 5))).toEqual([0, 1, 2, 3, 255]);
  });

  it("ADV: >1MB content writes without truncation", async () => {
    const engine = new AtomicWritesEngine();
    const target = path.join(tmpDir, "big.txt");
    const big = "x".repeat(1_200_000);
    await engine.writeAtomic(target, big);
    expect(fs.statSync(target).size).toBe(big.length);
  });
});
