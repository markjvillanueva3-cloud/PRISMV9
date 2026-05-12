/**
 * Tests for atomicLockedWrite (Phase 0.4)
 *
 * Verifies:
 *  - basic write
 *  - atomic semantics (no .tmp leftovers)
 *  - concurrent safety within a process (serialized by proper-lockfile)
 *  - RMW helper reads-modifies-writes correctly
 */

import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import { atomicLockedWrite, atomicLockedRmw } from "../utils/atomicLockedWrite.js";

const tmpDir = path.join(os.tmpdir(), "prism-alw-test");

async function cleanupTmp() {
  try {
    const entries = await fs.readdir(tmpDir);
    await Promise.all(entries.map((e) => fs.rm(path.join(tmpDir, e), { force: true, recursive: true })));
  } catch { /* ignore */ }
}

describe("atomicLockedWrite (Phase 0.4)", () => {
  afterEach(cleanupTmp);

  it("writes data to a file (happy path)", async () => {
    const target = path.join(tmpDir, "happy.json");
    await atomicLockedWrite(target, JSON.stringify({ a: 1 }));
    const content = await fs.readFile(target, "utf-8");
    expect(JSON.parse(content)).toEqual({ a: 1 });
  });

  it("creates the parent dir if missing", async () => {
    const target = path.join(tmpDir, "nested", "deep", "file.json");
    await atomicLockedWrite(target, "hello");
    const content = await fs.readFile(target, "utf-8");
    expect(content).toBe("hello");
  });

  it("leaves no .tmp leftovers on success", async () => {
    const target = path.join(tmpDir, "notmp.json");
    await atomicLockedWrite(target, "ok");
    const dirEntries = await fs.readdir(tmpDir);
    const tmpFiles = dirEntries.filter((e) => e.includes(".tmp"));
    expect(tmpFiles).toHaveLength(0);
  });

  it("is safe under sequential overwrites (last-writer-wins)", async () => {
    const target = path.join(tmpDir, "seq.json");
    for (let i = 0; i < 5; i++) {
      await atomicLockedWrite(target, JSON.stringify({ i }));
    }
    const content = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(content).toEqual({ i: 4 });
  });

  it("is safe under concurrent writers (one wins, no corruption)", async () => {
    const target = path.join(tmpDir, "concurrent.json");
    const writers = Array.from({ length: 8 }, (_, i) =>
      atomicLockedWrite(target, JSON.stringify({ writer: i, payload: `data-${i}` }))
    );
    await Promise.all(writers);
    // File must exist and parse to SOMETHING valid — never torn
    const content = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(typeof content.writer).toBe("number");
    expect(content.writer).toBeGreaterThanOrEqual(0);
    expect(content.writer).toBeLessThan(8);
    expect(content.payload).toMatch(/^data-\d+$/);
  });

  it("atomicLockedRmw read-modify-writes correctly", async () => {
    const target = path.join(tmpDir, "rmw.json");
    await atomicLockedWrite(target, JSON.stringify({ count: 0, items: [] as string[] }));
    for (const label of ["a", "b", "c"]) {
      await atomicLockedRmw<{ count: number; items: string[] }>(
        target,
        (current) => ({ count: current.count + 1, items: [...current.items, label] }),
        { fallback: { count: 0, items: [] } }
      );
    }
    const final = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(final.count).toBe(3);
    expect(final.items).toEqual(["a", "b", "c"]);
  });

  it("atomicLockedRmw uses fallback when target does not exist", async () => {
    const target = path.join(tmpDir, "fresh.json");
    const result = await atomicLockedRmw<{ init: boolean; n: number }>(
      target,
      (current) => ({ ...current, n: current.n + 1 }),
      { fallback: { init: true, n: 0 } }
    );
    expect(result).toEqual({ init: true, n: 1 });
    const onDisk = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(onDisk).toEqual({ init: true, n: 1 });
  });
});
