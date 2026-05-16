/**
 * CompactFormatterEngine — engine-direct tests.
 *
 * The engine is already wired into prism_dev (compact_table / compact_kv_pairs /
 * compact_summarize_array …) and covered by devDispatcher.compact-formatter-wire
 * .test.ts at the dispatcher level; this file adds the engine-direct unit
 * coverage (the stop_on_unwired_assets gate requires a name-matching test file).
 *
 * Every assertion pins a concrete reference value. Coverage spans all 8 public
 * methods + edge/adversarial inputs.
 */

import { describe, it, expect } from "vitest";
import {
  CompactFormatterEngine,
  compactFormatterEngine,
} from "../engines/CompactFormatterEngine.js";

describe("CompactFormatterEngine — table()", () => {
  it("formats rows as key:value joined by the default separator", () => {
    const e = new CompactFormatterEngine();
    const out = e.table(
      [{ name: "Foo", count: 5 }, { name: "Bar", count: 3 }],
      "name",
      "count",
    );
    expect(out).toBe("Foo:5 | Bar:3");
  });

  it("honors a custom separator", () => {
    const e = new CompactFormatterEngine();
    expect(e.table([{ k: "a", v: 1 }, { k: "b", v: 2 }], "k", "v", ",")).toBe("a:1,b:2");
  });

  it("returns an empty string for an empty data array", () => {
    const e = new CompactFormatterEngine();
    expect(e.table([], "k", "v")).toBe("");
  });

  it("adversarial — a missing key field renders as `undefined`", () => {
    const e = new CompactFormatterEngine();
    expect(e.table([{ count: 5 }], "name", "count")).toBe("undefined:5");
  });
});

describe("CompactFormatterEngine — kvPairs()", () => {
  it("joins pairs inline by default", () => {
    const e = new CompactFormatterEngine();
    expect(e.kvPairs({ a: 1, b: 2 })).toBe("a=1 b=2");
  });

  it("joins pairs one-per-line when inline=false", () => {
    const e = new CompactFormatterEngine();
    expect(e.kvPairs({ a: 1, b: 2 }, false)).toBe("a=1\nb=2");
  });

  it("filters out null and undefined values", () => {
    const e = new CompactFormatterEngine();
    expect(e.kvPairs({ a: 1, b: null, c: undefined, d: 4 })).toBe("a=1 d=4");
  });
});

describe("CompactFormatterEngine — summarizeArray()", () => {
  it("lists every item when the array fits within maxItems", () => {
    const e = new CompactFormatterEngine();
    expect(e.summarizeArray([1, 2, 3], 5)).toBe("1, 2, 3");
  });

  it("shows the first N then `...+X more` when the array overflows", () => {
    const e = new CompactFormatterEngine();
    expect(e.summarizeArray([1, 2, 3, 4, 5, 6, 7], 3)).toBe("1, 2, 3 ...+4 more");
  });

  it("applies a custom formatter to each item", () => {
    const e = new CompactFormatterEngine();
    expect(e.summarizeArray([{ n: "x" }, { n: "y" }], 5, (i) => i.n)).toBe("x, y");
  });

  it("adversarial — an empty array yields an empty string", () => {
    const e = new CompactFormatterEngine();
    expect(e.summarizeArray([], 5)).toBe("");
  });
});

describe("CompactFormatterEngine — compact()", () => {
  it("flattens a shallow object into a compact brace form", () => {
    const e = new CompactFormatterEngine();
    expect(e.compact({ a: 1, b: "text" })).toBe("{a:1, b:text}");
  });

  it("collapses nesting beyond the standard-level depth limit (2)", () => {
    const e = new CompactFormatterEngine();
    expect(e.compact({ l1: { l2: { l3: "deep" } } })).toBe("{l1:{l2:{1 keys}}}");
  });

  it("minimal level limits depth to 1", () => {
    const e = new CompactFormatterEngine();
    expect(e.compact({ l1: { l2: "x" } }, { level: "minimal" })).toBe("{l1:{1 keys}}");
  });

  it("collapses arrays longer than 5 with a `+N` suffix", () => {
    const e = new CompactFormatterEngine();
    expect(e.compact([1, 2, 3, 4, 5, 6, 7])).toBe("[1, 2, 3, 4, 5 +2]");
  });

  it("adversarial — oversize output is cut to maxChars with a truncation marker", () => {
    const e = new CompactFormatterEngine();
    // verbose maxStr=200 keeps the 200-char string whole → raw output 204 chars.
    const out = e.compact({ a: "x".repeat(200) }, { maxChars: 60, level: "verbose" });
    expect(out.endsWith("...[truncated 164ch]")).toBe(true);
    expect(out.startsWith("{a:xxx")).toBe(true);
  });
});

describe("CompactFormatterEngine — systemLine()", () => {
  it("abbreviates known count keys into a slash-joined line", () => {
    const e = new CompactFormatterEngine();
    expect(e.systemLine({ engines: 100, dispatchers: 5 })).toBe("100E/5D");
  });

  it("falls back to the raw key for unknown count keys", () => {
    const e = new CompactFormatterEngine();
    expect(e.systemLine({ widgets: 7 })).toBe("7widgets");
  });
});

describe("CompactFormatterEngine — compactDiffStat()", () => {
  it("lists files inline when 5 or fewer changed", () => {
    const e = new CompactFormatterEngine();
    const diff = "a.ts | 2 +-\nb.ts | 3 +++\n 2 files changed, 5 insertions";
    expect(e.compactDiffStat(diff)).toBe("a.ts, b.ts (2 files changed, 5 insertions)");
  });

  it("summarizes by count when more than 5 files changed", () => {
    const e = new CompactFormatterEngine();
    const files = ["a", "b", "c", "d", "e", "f"].map((f) => `${f}.ts | 1 +`).join("\n");
    const diff = `${files}\n 6 files changed, 6 insertions`;
    expect(e.compactDiffStat(diff)).toBe("6 files changed (6 files changed, 6 insertions)");
  });
});

describe("CompactFormatterEngine — compactTestResult()", () => {
  it("shows only the passed count when nothing failed or skipped", () => {
    const e = new CompactFormatterEngine();
    expect(e.compactTestResult(100, 0, 0)).toBe("100✓");
  });

  it("appends failed and skipped markers when present", () => {
    const e = new CompactFormatterEngine();
    expect(e.compactTestResult(100, 2, 3)).toBe("100✓ 2✗ 3⊘");
  });
});

describe("CompactFormatterEngine — truncate()", () => {
  it("returns the text unchanged when within the limit", () => {
    const e = new CompactFormatterEngine();
    expect(e.truncate("short", 100)).toBe("short");
  });

  it("cuts at a word boundary when one is available past the midpoint", () => {
    const e = new CompactFormatterEngine();
    expect(e.truncate("a long string here", 10)).toBe("a long...");
  });

  it("adversarial — a long unbroken word is hard-cut at maxLen-3", () => {
    const e = new CompactFormatterEngine();
    expect(e.truncate("verylongwordnospaces", 10)).toBe("verylon...");
  });
});

describe("CompactFormatterEngine — singleton", () => {
  it("exported singleton formats through the same logic as a fresh instance", () => {
    expect(compactFormatterEngine.compactTestResult(7, 1)).toBe("7✓ 1✗");
  });
});
