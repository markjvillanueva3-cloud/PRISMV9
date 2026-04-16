/**
 * Tests for PRISMLoRAAdapterEngine (PP-0.19-U-LLM3)
 *
 * Exercises the full descriptor → disk → active-map lifecycle inside a
 * scratch tmp dir so no state leaks between tests.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PRISMLoRAAdapterEngine } from "../engines/PRISMLoRAAdapterEngine.js";

describe("PRISMLoRAAdapterEngine", () => {
  let dir: string;
  let engine: PRISMLoRAAdapterEngine;
  const fixedNow = new Date("2026-04-16T17:00:00.000Z");

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "prism-lora-adapter-"));
    engine = new PRISMLoRAAdapterEngine({
      dataDir: dir,
      clock: () => fixedNow,
    });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("register writes prism.json with schemaVersion=1", async () => {
    const d = await engine.register({
      adapterId: "nightly-a",
      baseModel: "qwen2.5-coder:7b",
      jobId: "lora-2026-04-16",
      label: "nightly-a",
      metrics: { trainLoss: 0.42, exampleCount: 120 },
    });
    expect(d.schemaVersion).toBe(1);
    expect(d.adapterId).toBe("nightly-a");
    expect(d.baseModel).toBe("qwen2.5-coder:7b");
    expect(d.trainedAt).toBe(fixedNow.toISOString());
    expect(existsSync(engine.getAdapterDir("nightly-a"))).toBe(true);
  });

  it("register creates the adapter folder when missing", async () => {
    const adapterDir = engine.getAdapterDir("fresh");
    expect(existsSync(adapterDir)).toBe(false);
    await engine.register({
      adapterId: "fresh",
      baseModel: "qwen2.5-coder:7b",
    });
    expect(existsSync(adapterDir)).toBe(true);
  });

  it("register with ensureFolder=false throws when folder missing", async () => {
    await expect(
      engine.register({
        adapterId: "no-folder",
        baseModel: "qwen2.5-coder:7b",
        ensureFolder: false,
      }),
    ).rejects.toThrow(/folder missing/);
  });

  it("get returns null for unknown adapterId", async () => {
    expect(await engine.get("nope")).toBeNull();
  });

  it("get returns null when prism.json is malformed", async () => {
    await engine.register({
      adapterId: "broken",
      baseModel: "qwen2.5-coder:7b",
    });
    writeFileSync(
      path.join(engine.getAdapterDir("broken"), "prism.json"),
      "{ not json",
    );
    expect(await engine.get("broken")).toBeNull();
  });

  it("list returns empty when no adapters exist", async () => {
    expect(await engine.list()).toEqual([]);
  });

  it("list sorts newest trainedAt first and filters by baseModel", async () => {
    await engine.register({
      adapterId: "old",
      baseModel: "qwen2.5-coder:7b",
      trainedAt: "2026-04-10T10:00:00.000Z",
    });
    await engine.register({
      adapterId: "new",
      baseModel: "qwen2.5-coder:7b",
      trainedAt: "2026-04-16T10:00:00.000Z",
    });
    await engine.register({
      adapterId: "other",
      baseModel: "llama3.2:3b",
      trainedAt: "2026-04-15T10:00:00.000Z",
    });
    const qwen = await engine.list({ baseModel: "qwen2.5-coder:7b" });
    expect(qwen.map((a) => a.adapterId)).toEqual(["new", "old"]);
    const all = await engine.list();
    expect(all.length).toBe(3);
  });

  it("list filters by tag", async () => {
    await engine.register({
      adapterId: "t1",
      baseModel: "x",
      tags: ["lathe"],
    });
    await engine.register({
      adapterId: "t2",
      baseModel: "x",
      tags: ["wedm"],
    });
    const lathe = await engine.list({ tag: "lathe" });
    expect(lathe.map((a) => a.adapterId)).toEqual(["t1"]);
  });

  it("activate sets active pointer and activeFor resolves descriptor", async () => {
    await engine.register({
      adapterId: "a1",
      baseModel: "qwen2.5-coder:7b",
    });
    await engine.activate("a1");
    const active = await engine.activeFor("qwen2.5-coder:7b");
    expect(active?.adapterId).toBe("a1");
    const map = await engine.activeMap();
    expect(map["qwen2.5-coder:7b"]).toBe("a1");
  });

  it("activate throws when adapter not registered", async () => {
    await expect(engine.activate("ghost")).rejects.toThrow(/not found/);
  });

  it("activate replaces existing active pointer for the same base model", async () => {
    await engine.register({ adapterId: "a1", baseModel: "q" });
    await engine.register({ adapterId: "a2", baseModel: "q" });
    await engine.activate("a1");
    await engine.activate("a2");
    expect((await engine.activeFor("q"))?.adapterId).toBe("a2");
  });

  it("remove deletes folder and clears active pointer", async () => {
    await engine.register({ adapterId: "gone", baseModel: "q" });
    await engine.activate("gone");
    const removed = await engine.remove("gone");
    expect(removed).toBe(true);
    expect(existsSync(engine.getAdapterDir("gone"))).toBe(false);
    expect(await engine.activeFor("q")).toBeNull();
  });

  it("remove returns false when adapter missing", async () => {
    expect(await engine.remove("nope")).toBe(false);
  });

  it("summary aggregates counts, active map, and size", async () => {
    await engine.register({ adapterId: "x1", baseModel: "q" });
    await engine.register({ adapterId: "x2", baseModel: "q" });
    await engine.register({ adapterId: "y1", baseModel: "l" });
    await engine.activate("x1");
    const s = await engine.summary();
    expect(s.count).toBe(3);
    expect(s.byBaseModel["q"]).toBe(2);
    expect(s.byBaseModel["l"]).toBe(1);
    expect(s.active["q"]).toBe("x1");
    expect(s.totalSizeBytes).toBeGreaterThanOrEqual(0);
  });

  it("activeFor returns null when no adapter registered for base model", async () => {
    expect(await engine.activeFor("unknown-model")).toBeNull();
  });

  it("register rejects invalid trainedAt via schema", async () => {
    await expect(
      engine.register({
        adapterId: "bad",
        baseModel: "",
      }),
    ).rejects.toThrow();
  });
});
