/**
 * F3DSQLiteParserEngine — PHASE25 wiring tests.
 *
 * Fusion 360 .f3d is a ZIP container holding model.sqlite. The engine throws
 * ENOENT for missing files (raw fs.readFile) — tests verify the rejection
 * shape so dispatcher callers know to wrap in try/catch. Real round-trip
 * with a real .f3d fixture is exercised by integration tests.
 */
import { describe, it, expect } from "vitest";
import {
  F3DSQLiteParserEngine,
  f3dSqliteParserEngine,
} from "../engines/F3DSQLiteParserEngine.js";

describe("F3DSQLiteParserEngine", () => {
  it("singleton is a real F3DSQLiteParserEngine instance", () => {
    expect(f3dSqliteParserEngine).toBeInstanceOf(F3DSQLiteParserEngine);
  });

  it("parse() rejects ENOENT on missing file", async () => {
    await expect(
      f3dSqliteParserEngine.parse("/no/such/file.f3d"),
    ).rejects.toThrow(/ENOENT/);
  });

  it("parseF3Z() rejects ENOENT on missing archive", async () => {
    await expect(
      f3dSqliteParserEngine.parseF3Z("/no/such/archive.f3z"),
    ).rejects.toThrow(/ENOENT/);
  });

  it("getTimeline() rejects on missing file", async () => {
    await expect(
      f3dSqliteParserEngine.getTimeline("/no/such/file.f3d"),
    ).rejects.toThrow(/ENOENT/);
  });

  it("getParameters() rejects on missing file", async () => {
    await expect(
      f3dSqliteParserEngine.getParameters("/no/such/file.f3d"),
    ).rejects.toThrow(/ENOENT/);
  });

  it("class instantiates without arguments", () => {
    const fresh = new F3DSQLiteParserEngine();
    expect(fresh).not.toBe(f3dSqliteParserEngine);
    expect(fresh).toBeInstanceOf(F3DSQLiteParserEngine);
  });

  it("error messages identify the offending path", async () => {
    try {
      await f3dSqliteParserEngine.parse("/missing/distinct-path-marker.f3d");
      throw new Error("should have rejected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg.toLowerCase()).toContain("distinct-path-marker.f3d");
    }
  });
});
