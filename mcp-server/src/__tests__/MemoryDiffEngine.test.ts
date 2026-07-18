/**
 * MemoryDiffEngine tests — HMEMV08. Asserts exact set arithmetic.
 */
import { describe, it, expect } from "vitest";
import { MemoryDiffEngine, type DiffableEntry } from "../engines/MemoryDiffEngine.js";

const e = (id: string, hash: string): DiffableEntry => ({ entry_id: id, hash });

describe("MemoryDiffEngine.diff — exact set arithmetic", () => {
  it("identical lists → no changes, all unchanged", () => {
    const list = [e("a", "h1"), e("b", "h2")];
    const d = MemoryDiffEngine.diff(list, list);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(d.unchanged_count).toBe(2);
    expect(d.total_a).toBe(2);
    expect(d.total_b).toBe(2);
  });

  it("added in B, sorted ASC", () => {
    const d = MemoryDiffEngine.diff([], [e("z", "h1"), e("a", "h2")]);
    expect(d.added).toEqual(["a", "z"]);
    expect(d.removed).toEqual([]);
  });

  it("removed from A, sorted ASC", () => {
    const d = MemoryDiffEngine.diff([e("z", "h1"), e("a", "h2")], []);
    expect(d.removed).toEqual(["a", "z"]);
    expect(d.added).toEqual([]);
  });

  it("changed: same id, different hash", () => {
    const d = MemoryDiffEngine.diff([e("a", "h1")], [e("a", "h2")]);
    expect(d.changed).toEqual(["a"]);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.unchanged_count).toBe(0);
  });

  it("mixed: 1 added + 1 removed + 1 changed + 1 unchanged", () => {
    const a = [e("kept", "h1"), e("moved", "h2"), e("gone", "h3")];
    const b = [e("kept", "h1"), e("moved", "h2NEW"), e("new", "h4")];
    const d = MemoryDiffEngine.diff(a, b);
    expect(d.added).toEqual(["new"]);
    expect(d.removed).toEqual(["gone"]);
    expect(d.changed).toEqual(["moved"]);
    expect(d.unchanged_count).toBe(1);
  });

  it("throws on duplicate entry_id in A", () => {
    expect(() => MemoryDiffEngine.diff([e("a", "h1"), e("a", "h2")], [])).toThrow(/duplicate/);
  });

  it("throws on non-array input", () => {
    expect(() => MemoryDiffEngine.diff(null as never, [])).toThrow();
  });

  it("renderDiff shows counts and lists each section", () => {
    const d = MemoryDiffEngine.diff([e("gone", "h1")], [e("new", "h2")]);
    const md = MemoryDiffEngine.renderDiff(d);
    expect(md.includes("+1")).toBe(true);
    expect(md.includes("-1")).toBe(true);
    expect(md.includes("added: new")).toBe(true);
    expect(md.includes("removed: gone")).toBe(true);
  });

  it("throws on duplicate entry_id in B", () => {
    expect(() => MemoryDiffEngine.diff([], [e("b", "h1"), e("b", "h2")])).toThrow(/duplicate/);
  });

  it("both empty → all zero counts", () => {
    const d = MemoryDiffEngine.diff([], []);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(d.unchanged_count).toBe(0);
    expect(d.total_a).toBe(0);
    expect(d.total_b).toBe(0);
  });

  it("renderDiff empty diff has no per-section lines", () => {
    const md = MemoryDiffEngine.renderDiff(MemoryDiffEngine.diff([], []));
    expect(md.includes("added:")).toBe(false);
    expect(md.includes("removed:")).toBe(false);
    expect(md.includes("changed:")).toBe(false);
  });
});
