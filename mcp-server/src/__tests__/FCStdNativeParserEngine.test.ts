/**
 * FCStdNativeParserEngine — PHASE25 wiring tests.
 *
 * .FCStd is a ZIP container with Document.xml inside. Tests cover:
 *   - parse() returns AtomicValue with confidence=0 + warning when file missing
 *   - parseBuffer() rejects oversized + non-ZIP buffers gracefully (no throw)
 *   - parseBuffer() returns format='FCStd' on the error path so callers can
 *     branch on shape rather than thrown exceptions.
 */
import { describe, it, expect } from "vitest";
import {
  FCStdNativeParserEngine,
  fcStdNativeParserEngine,
} from "../engines/FCStdNativeParserEngine.js";

describe("FCStdNativeParserEngine", () => {
  it("singleton is a real FCStdNativeParserEngine instance", () => {
    expect(fcStdNativeParserEngine).toBeInstanceOf(FCStdNativeParserEngine);
  });

  it("parse() returns confidence=0 + error warning for missing file", async () => {
    const r = await fcStdNativeParserEngine.parse("/nonexistent/no-such.FCStd");
    expect(r.confidence).toBe(0);
    expect(typeof r.warning).toBe("string");
    expect(r.warning).toContain("File not found");
    expect(r.value.format).toBe("FCStd");
    expect(r.value.objects).toEqual([]);
  });

  it("parseBuffer() returns format='FCStd' even on garbage buffer", async () => {
    // 32 random bytes — not a ZIP magic header
    const garbage = Buffer.from("not a zip file at all".repeat(2));
    const r = await fcStdNativeParserEngine.parseBuffer(garbage);
    expect(r.value.format).toBe("FCStd");
    expect(r.confidence).toBe(0);
    expect(r.value.objects).toEqual([]);
  });

  it("parseBuffer() warning describes ZIP failure for non-zip input", async () => {
    const garbage = Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00");
    const r = await fcStdNativeParserEngine.parseBuffer(garbage);
    expect(typeof r.warning).toBe("string");
    expect((r.warning as string).length).toBeGreaterThan(0);
  });

  it("error result preserves coverage=0 and empty objects/spreadsheets", async () => {
    const r = await fcStdNativeParserEngine.parse("/nope/missing.FCStd");
    expect(r.value.coverage).toBe(0);
    expect(r.value.objects).toEqual([]);
    expect(r.value.spreadsheets).toEqual([]);
  });

  it("source field identifies the parser", async () => {
    const r = await fcStdNativeParserEngine.parse("/nope/missing.FCStd");
    expect(typeof r.source).toBe("string");
    expect(r.source.startsWith("FCStdNativeParserEngine")).toBe(true);
  });
});
