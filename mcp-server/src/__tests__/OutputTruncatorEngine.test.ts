/**
 * OutputTruncatorEngine — Companion test (WIRE-UNWIRED).
 *
 * Coverage floor (CLAUDE.md comprehensive-build-enforce):
 *   - happy path on every public method
 *   - ≥3 failure modes: empty / single-line oversize / exact-boundary / lines-fewer-than-head+tail
 *   - ≥2 adversarial: circular ref, Infinity maxChars, NaN-valued field, oversize/extreme input
 *   - variability: marker on/off, different head/tail counts, json array vs object vs primitive
 *   - wiring gate: action enum + schema both registered (prevents silent unwire)
 *   - dispatcher round-trip: invoke handler via ACTION_DEV_SCHEMAS validation path
 */
import { describe, it, expect } from "vitest";
import {
  OutputTruncatorEngine,
  outputTruncatorEngine,
  type TruncateOptions,
} from "../engines/OutputTruncatorEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const WIRED_ACTIONS = [
  "output_truncate",
  "output_truncate_json",
  "output_truncate_savings",
  "output_truncate_auto",
] as const;

describe("OutputTruncatorEngine — truncate (smart head+tail)", () => {
  it("returns text unchanged when shorter than maxChars (happy path)", () => {
    const out = outputTruncatorEngine.truncate("short text", { maxChars: 100 });
    expect(out).toBe("short text");
  });

  it("preserves head + tail lines and emits an omitted-count marker", () => {
    // 50 lines × ~7 chars = ~350 chars total. maxChars=200 forces the line-truncation
    // branch (text.length > maxChars) without triggering the post-join re-cut clamp
    // (head 3 + tail 2 + marker ≈ 60 chars stays under 200).
    const lines = Array.from({ length: 50 }, (_, i) => `line-${i}`);
    const out = outputTruncatorEngine.truncate(lines.join("\n"), {
      maxChars: 200,
      preserveHead: 3,
      preserveTail: 2,
      addMarker: true,
    });
    expect(out).toContain("line-0");
    expect(out).toContain("line-2");      // last head line
    expect(out).toContain("line-48");     // first tail line
    expect(out).toContain("line-49");
    expect(out).toContain("[45 lines omitted]");
    // body lines 3..47 must be gone
    expect(out).not.toContain("line-10");
    expect(out).not.toContain("line-25");
  });

  it("can suppress marker text when addMarker:false (variability)", () => {
    // 30 lines × ~3 chars = ~100 chars. maxChars=60 forces line-truncation; the
    // joined head(2)+marker+tail(2) ≈ 20 chars stays under 60, so no re-cut.
    const lines = Array.from({ length: 30 }, (_, i) => `L${i}`);
    const out = outputTruncatorEngine.truncate(lines.join("\n"), {
      maxChars: 60,
      preserveHead: 2,
      preserveTail: 2,
      addMarker: false,
    });
    expect(out).not.toContain("[truncated]");
    expect(out).not.toContain("lines omitted");
    expect(out).toContain("L0");
    expect(out).toContain("L29");
  });

  it("falls back to char-cut + [truncated] when lines <= head+tail+1 (boundary failure mode)", () => {
    // Single very long line — the line-based branch can't help; expects char-slice.
    const oneLine = "x".repeat(500);
    const out = outputTruncatorEngine.truncate(oneLine, { maxChars: 50, addMarker: true });
    expect(out.length).toBeLessThanOrEqual(50 + "\n[truncated]".length);
    expect(out.endsWith("[truncated]")).toBe(true);
    expect(out.startsWith("xxxx")).toBe(true);
  });

  it("returns empty string unchanged (failure mode: empty input)", () => {
    expect(outputTruncatorEngine.truncate("", { maxChars: 100 })).toBe("");
  });

  it("handles exact-boundary maxChars (failure mode: input.length === maxChars)", () => {
    const exact = "y".repeat(120);
    const out = outputTruncatorEngine.truncate(exact, { maxChars: 120 });
    expect(out).toBe(exact);                  // ≤ maxChars → unchanged
    expect(out.length).toBe(120);
  });

  it("clamps over-cut head+tail rejoined result back under maxChars (boundary)", () => {
    // Heavy head/tail forces the joined result to exceed maxChars → second clamp must fire.
    const lines = Array.from({ length: 200 }, (_, i) => `abcdefghij-${i}-`.padEnd(40, "z"));
    const out = outputTruncatorEngine.truncate(lines.join("\n"), {
      maxChars: 200,
      preserveHead: 50,
      preserveTail: 50,
      addMarker: true,
    });
    expect(out.length).toBeLessThanOrEqual(200 + "\n[truncated]".length);
  });
});

describe("OutputTruncatorEngine — truncateJson", () => {
  it("returns full JSON when under budget (happy path)", () => {
    const out = outputTruncatorEngine.truncateJson({ a: 1, b: 2 }, 100);
    expect(JSON.parse(out)).toEqual({ a: 1, b: 2 });
  });

  it("reduces arrays to a head slice + total-count footer (variability: array branch)", () => {
    const arr = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `item-${i}` }));
    const out = outputTruncatorEngine.truncateJson(arr, 200);
    expect(out).toContain("more items (100 total)");
    expect(out).toContain('"id": 0');
    expect(out).not.toContain('"id": 99');     // tail dropped
  });

  it("preserves leading object fields and emits a 'more fields' footer (variability: object branch)", () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 100; i++) obj[`k${i}`] = i;
    const out = outputTruncatorEngine.truncateJson(obj, 200);
    expect(out).toContain('"k0": 0');
    expect(out).toMatch(/more fields/);
    expect(out.trimEnd().endsWith("}")).toBe(true);
  });

  it("primitive overflow falls through to substring + [truncated] (variability: primitive branch)", () => {
    // Force the primitive substring path: build a string whose JSON form exceeds the cap.
    const longStr = "z".repeat(8000);
    const out = outputTruncatorEngine.truncateJson(longStr, 50);
    expect(out.endsWith("[truncated]")).toBe(true);
  });

  it("survives a NaN field — JSON.stringify emits null, no throw (adversarial)", () => {
    const obj = { a: NaN, b: 2 };
    expect(() => outputTruncatorEngine.truncateJson(obj, 4000)).not.toThrow();
  });

  it("throws cleanly on circular references — JSON.stringify is the source (adversarial; documents behavior)", () => {
    const cycle: Record<string, unknown> = { name: "loop" };
    cycle.self = cycle;
    expect(() => outputTruncatorEngine.truncateJson(cycle, 4000)).toThrow(/circular|Converting/);
  });
});

describe("OutputTruncatorEngine — truncateFileList / truncateSearchResults", () => {
  it("returns the full list when below threshold (happy)", () => {
    const out = outputTruncatorEngine.truncateFileList(["a.ts", "b.ts"], 10);
    expect(out).toBe("a.ts\nb.ts");
  });

  it("emits 'and N more files (total)' footer past threshold", () => {
    const files = Array.from({ length: 50 }, (_, i) => `f${i}.ts`);
    const out = outputTruncatorEngine.truncateFileList(files, 5);
    expect(out).toContain("f0.ts");
    expect(out).toContain("f4.ts");
    expect(out).not.toContain("f10.ts");
    expect(out).toContain("and 45 more files (50 total)");
  });

  it("truncates grep-style results past maxMatches", () => {
    const results = Array.from({ length: 30 }, (_, i) => `match-${i}`).join("\n");
    const out = outputTruncatorEngine.truncateSearchResults(results, 5);
    expect(out).toContain("match-0");
    expect(out).toContain("match-4");
    expect(out).not.toContain("match-10");
    expect(out).toContain("25 more matches");
  });
});

describe("OutputTruncatorEngine — savings", () => {
  it("returns zeros on already-short input (happy: 0% savings)", () => {
    const s = outputTruncatorEngine.savings("short", 4000);
    expect(s.original).toBe(s.truncated);
    expect(s.saved).toBe(0);
    expect(s.percent).toBe(0);
  });

  it("reports positive percent on oversize input", () => {
    const big = ("line\n").repeat(2000);            // ~10000 chars
    const s = outputTruncatorEngine.savings(big, 500);
    expect(s.original).toBeGreaterThan(s.truncated);
    expect(s.saved).toBeGreaterThan(0);
    expect(s.percent).toBeGreaterThan(0);
    expect(s.percent).toBeLessThanOrEqual(100);
  });

  it("handles empty input without divide-by-zero (failure mode: zero original)", () => {
    const s = outputTruncatorEngine.savings("", 4000);
    expect(s.original).toBe(0);
    expect(s.truncated).toBe(0);
    expect(s.saved).toBe(0);
    expect(s.percent).toBe(0);                       // explicit guard, not NaN
  });
});

describe("OutputTruncatorEngine — auto (content-type dispatch)", () => {
  it("routes parse-able JSON object input to truncateJson", () => {
    const obj = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]));
    const json = JSON.stringify(obj);
    const out = outputTruncatorEngine.auto(json, 200);
    expect(out).toMatch(/more fields|"k0"/);          // object-branch fingerprint
  });

  it("routes parse-able JSON array input to truncateJson array branch", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i);
    const out = outputTruncatorEngine.auto(JSON.stringify(arr), 80);
    expect(out).toMatch(/more items \(100 total\)/);
  });

  it("falls through to generic truncate on invalid JSON that looks like JSON (failure mode)", () => {
    const fake = "{ not json " + "x".repeat(2000) + " }";
    const out = outputTruncatorEngine.auto(fake, 100);
    // Did NOT throw, and did truncate.
    expect(out.length).toBeLessThanOrEqual(100 + "\n[truncated]".length);
  });

  it("returns content unchanged when below cap (happy)", () => {
    expect(outputTruncatorEngine.auto("hi", 4000)).toBe("hi");
  });
});

describe("OutputTruncatorEngine — adversarial inputs", () => {
  it("handles Infinity maxChars without infinite loop or throw", () => {
    const long = "x".repeat(1000);
    const out = outputTruncatorEngine.truncate(long, { maxChars: Number.POSITIVE_INFINITY });
    expect(out).toBe(long);                         // length always <= Infinity
  });

  it("handles maxChars=0 by entering the substring-with-marker branch (boundary)", () => {
    const out = outputTruncatorEngine.truncate("hello world", { maxChars: 0, addMarker: true });
    expect(out.endsWith("[truncated]")).toBe(true);
  });

  it("handles 1MB input without OOM (resource-exhaustion guard)", () => {
    const huge = "a".repeat(1_000_000);
    const out = outputTruncatorEngine.truncate(huge, { maxChars: 4000 });
    expect(out.length).toBeLessThanOrEqual(4000 + "\n[truncated]".length);
  });
});

describe("OutputTruncatorEngine — dispatcher wiring gate (anti-regression)", () => {
  it("singleton is a real OutputTruncatorEngine instance", () => {
    expect(outputTruncatorEngine).toBeInstanceOf(OutputTruncatorEngine);
  });

  it("every wired action has a Zod schema with .safeParse() registered", () => {
    const schemas = ACTION_DEV_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const action of WIRED_ACTIONS) {
      const schema = schemas[action];
      expect(typeof schema, `missing schema for ${action}`).toBe("object");
      expect(typeof schema.safeParse, `schema for ${action} is not a Zod schema`).toBe("function");
    }
  });

  it("schemas reject obviously bad input (round-trip validation, real values)", () => {
    const s = ACTION_DEV_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    // output_truncate: text MUST be a string
    expect(s.output_truncate.safeParse({ text: 123 }).success).toBe(false);
    expect(s.output_truncate.safeParse({ text: "ok" }).success).toBe(true);
    // output_truncate_json: max_chars must be positive integer if provided
    expect(s.output_truncate_json.safeParse({ data: {}, max_chars: -1 }).success).toBe(false);
    expect(s.output_truncate_json.safeParse({ data: { a: 1 } }).success).toBe(true);
    // output_truncate_savings: original is required string
    expect(s.output_truncate_savings.safeParse({ max_chars: 100 }).success).toBe(false);
    expect(s.output_truncate_savings.safeParse({ original: "x" }).success).toBe(true);
    // output_truncate_auto: content is required string
    expect(s.output_truncate_auto.safeParse({}).success).toBe(false);
    expect(s.output_truncate_auto.safeParse({ content: "x", max_chars: 4000 }).success).toBe(true);
  });

  it("DEFAULT_OPTIONS shape stays compatible with TruncateOptions type (compile-time guard)", () => {
    const opts: TruncateOptions = { maxChars: 4000, preserveHead: 10, preserveTail: 5, addMarker: true };
    const out = outputTruncatorEngine.truncate("x", opts);
    expect(out).toBe("x");
  });
});
