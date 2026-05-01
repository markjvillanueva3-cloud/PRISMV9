/**
 * Input Validation Middleware Tests
 * ==================================
 * Tests validateInputParams for max depth, max keys, max size, max array length.
 */

import { describe, it, expect } from "vitest";
import { validateInputParams } from "../utils/dispatcherMiddleware.js";

describe("validateInputParams", () => {
  it("accepts normal params", () => {
    const err = validateInputParams({ action: "test", value: 42, nested: { a: 1 } });
    expect(err).toBeNull();
  });

  it("rejects oversized params", () => {
    const huge = { data: "x".repeat(600 * 1024) };
    const err = validateInputParams(huge);
    expect(err).not.toBeNull();
    expect(err).toContain("exceeds limit");
  });

  it("rejects deeply nested params", () => {
    let obj: any = { value: true };
    for (let i = 0; i < 15; i++) obj = { child: obj };
    const err = validateInputParams(obj, { maxDepth: 10 });
    expect(err).not.toBeNull();
    expect(err).toContain("depth");
  });

  it("accepts params within depth limit", () => {
    let obj: any = { value: true };
    for (let i = 0; i < 5; i++) obj = { child: obj };
    const err = validateInputParams(obj, { maxDepth: 10 });
    expect(err).toBeNull();
  });

  it("rejects excessive key count", () => {
    const many: Record<string, number> = {};
    for (let i = 0; i < 250; i++) many[`key_${i}`] = i;
    const err = validateInputParams(many, { maxKeys: 200 });
    expect(err).not.toBeNull();
    expect(err).toContain("key count");
  });

  it("rejects oversized arrays", () => {
    const err = validateInputParams(
      { items: new Array(2000).fill(0) },
      { maxArrayLength: 1000, maxKeys: 50000 }
    );
    expect(err).not.toBeNull();
    expect(err).toContain("Array length");
  });

  it("accepts arrays within limit", () => {
    const err = validateInputParams(
      { items: new Array(500).fill(0) },
      { maxArrayLength: 1000, maxKeys: 50000 }
    );
    expect(err).toBeNull();
  });

  it("uses default limits when none specified", () => {
    const err = validateInputParams({ simple: "test" });
    expect(err).toBeNull();
  });

  it("handles empty params", () => {
    const err = validateInputParams({});
    expect(err).toBeNull();
  });
});
