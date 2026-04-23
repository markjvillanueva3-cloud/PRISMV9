/**
 * cadFailureTriage.test.ts — U-CINF06 unit tests
 *
 * Accuracy target (CAD-INFRA-MS0 exit criterion): >95% on seeded corpus.
 *
 * Covers:
 *   1. Each of 6 canonical error types has at least one decisive pattern
 *   2. Runner-hint overrides pattern matching
 *   3. AbortSignal / timeout patterns fire correctly
 *   4. fileUnreadable flag is a strong format signal
 *   5. OOM + segfault + IPC crash → crash with high confidence
 *   6. Empty/missing/permission errors → format
 *   7. Parse-error and corrupt-file patterns → parse
 *   8. Toolpath/CAM-generation patterns → generation
 *   9. Tolerance + dimension mismatches → comparison
 *  10. Fallback: unknown stack → crash with low confidence
 *  11. Cold fallback (no stack, no pattern) → crash confidence 0.3
 *  12. Group() collapses identical signatures into one group
 *  13. Group() is deterministic — stable rootCauseKey for paraphrases
 *  14. Normalisation: paths / pids / hex addresses don't fragment groups
 *  15. Message snippet is truncated to 200 chars
 *  16. execute() routes single + batch inputs correctly
 *  17. Seeded 40-failure corpus classifies >95% correctly
 */

import { describe, it, expect } from "vitest";
import {
  CADFailureTriageEngine,
  cadFailureTriageEngine,
  type FailurePayload,
  type TriageResult,
} from "../engines/CADFailureTriageEngine.js";

const engine = new CADFailureTriageEngine();

// ── Helpers ──────────────────────────────────────────────────────────────────

function p(
  overrides: Partial<FailurePayload> & { message: string; fileId?: string },
): FailurePayload {
  return {
    fileId: overrides.fileId ?? "test-file",
    message: overrides.message,
    ...overrides,
  };
}

// ── Decisive-pattern coverage ────────────────────────────────────────────────

describe("CADFailureTriageEngine per-category coverage", () => {
  it("timeout: aborted=true wins above everything", () => {
    const r = engine.triage(p({ message: "crash unknown", aborted: true }));
    expect(r.errorType).toBe("timeout");
    expect(r.confidence).toBeGreaterThan(0.95);
  });

  it("timeout: message contains 'timed out'", () => {
    const r = engine.triage(p({ message: "operation timed out after 30000ms" }));
    expect(r.errorType).toBe("timeout");
  });

  it("format: fileUnreadable=true → format", () => {
    const r = engine.triage(p({ message: "ignored", fileUnreadable: true }));
    expect(r.errorType).toBe("format");
    expect(r.confidence).toBeGreaterThan(0.95);
  });

  it("format: ENOENT message", () => {
    const r = engine.triage(p({ message: "ENOENT: no such file C:/missing.sldprt" }));
    expect(r.errorType).toBe("format");
  });

  it("format: permission denied", () => {
    const r = engine.triage(p({ message: "EACCES permission denied" }));
    expect(r.errorType).toBe("format");
  });

  it("format: unsupported format", () => {
    const r = engine.triage(p({ message: "unsupported format .xyz123" }));
    expect(r.errorType).toBe("format");
  });

  it("format: empty file", () => {
    const r = engine.triage(p({ message: "empty file: 0 bytes" }));
    expect(r.errorType).toBe("format");
  });

  it("parse: syntax error", () => {
    const r = engine.triage(p({ message: "SyntaxError: Unexpected token < at line 1" }));
    expect(r.errorType).toBe("parse");
  });

  it("parse: corrupt file", () => {
    const r = engine.triage(p({ message: "CRC error: file is corrupt" }));
    expect(r.errorType).toBe("parse");
  });

  it("parse: OCCT kernel reader failure", () => {
    const r = engine.triage(p({ message: "OCCT STEP reader failed on entity #1234" }));
    expect(r.errorType).toBe("parse");
  });

  it("generation: CAM / toolpath error", () => {
    const r = engine.triage(p({ message: "toolpath generation failed for pocket strategy" }));
    expect(r.errorType).toBe("generation");
  });

  it("generation: STEP export failure", () => {
    const r = engine.triage(p({ message: "STEP export failed: cannot serialise assembly" }));
    expect(r.errorType).toBe("generation");
  });

  it("comparison: tolerance exceeded", () => {
    const r = engine.triage(p({ message: "tolerance exceeded: diff 0.32mm > 0.01mm" }));
    expect(r.errorType).toBe("comparison");
  });

  it("comparison: dimension mismatch", () => {
    const r = engine.triage(p({ message: "bounding box differs: expected 50mm, got 49.8mm" }));
    expect(r.errorType).toBe("comparison");
  });

  it("crash: OOM", () => {
    const r = engine.triage(p({ message: "FATAL ERROR: CALL_AND_RETRY_LAST heap out of memory" }));
    expect(r.errorType).toBe("crash");
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("crash: segfault", () => {
    const r = engine.triage(p({ message: "Segmentation fault (core dumped)" }));
    expect(r.errorType).toBe("crash");
  });

  it("crash: IPC crash", () => {
    const r = engine.triage(p({ message: "EPIPE: broken pipe to worker" }));
    expect(r.errorType).toBe("crash");
  });

  it("crash: unclassified exception with stack → fallback crash", () => {
    const r = engine.triage(p({
      message: "🦄 unknown weird failure nobody has seen before",
      stack: "Error: wat\n    at Object.foo (file.ts:10:5)\n    at Bar.baz (bar.ts:5:1)",
    }));
    expect(r.errorType).toBe("crash");
    expect(r.confidence).toBeLessThan(0.7);
  });

  it("crash: cold fallback, no stack no pattern", () => {
    const r = engine.triage(p({ message: "🦄 unknown no-stack" }));
    expect(r.errorType).toBe("crash");
    expect(r.confidence).toBeCloseTo(0.3, 1);
  });
});

// ── Runner hint ──────────────────────────────────────────────────────────────

describe("Runner hint override", () => {
  it("hint overrides pattern matching", () => {
    const r = engine.triage(p({
      message: "timeout", // would normally → timeout
      hint: "generation",
    }));
    expect(r.errorType).toBe("generation");
    expect(r.confidence).toBeGreaterThan(0.95);
  });
});

// ── Grouping + normalisation ─────────────────────────────────────────────────

describe("group()", () => {
  it("collapses failures with identical signatures", () => {
    const results = [
      engine.triage(p({ fileId: "a", message: "tolerance exceeded: diff 0.32mm > 0.01mm" })),
      engine.triage(p({ fileId: "b", message: "tolerance exceeded: diff 0.32mm > 0.01mm" })),
      engine.triage(p({ fileId: "c", message: "tolerance exceeded: diff 0.32mm > 0.01mm" })),
    ];
    const groups = engine.group(results);
    expect(groups.length).toBe(1);
    expect(groups[0].count).toBe(3);
    expect(groups[0].fileIds.sort()).toEqual(["a", "b", "c"]);
    expect(groups[0].errorType).toBe("comparison");
  });

  it("produces stable rootCauseKey across paraphrases with different paths", () => {
    const r1 = engine.triage(p({ fileId: "a", message: "ENOENT: no such file C:/jobs/alpha.sldprt" }));
    const r2 = engine.triage(p({ fileId: "b", message: "ENOENT: no such file C:/jobs/bravo.sldprt" }));
    expect(r1.rootCauseKey).toBe(r2.rootCauseKey);
  });

  it("normalisation strips pids + hex addresses", () => {
    const r1 = engine.triage(p({ fileId: "a", message: "EPIPE: broken pipe to worker pid=1234 at 0xdeadbeef" }));
    const r2 = engine.triage(p({ fileId: "b", message: "EPIPE: broken pipe to worker pid=9876 at 0xcafef00d" }));
    expect(r1.rootCauseKey).toBe(r2.rootCauseKey);
  });

  it("sorts groups by count descending", () => {
    const results = [
      engine.triage(p({ fileId: "a", message: "ENOENT: no such file C:/jobs/a.sldprt" })),
      engine.triage(p({ fileId: "b", message: "ENOENT: no such file C:/jobs/b.sldprt" })),
      engine.triage(p({ fileId: "c", message: "ENOENT: no such file C:/jobs/c.sldprt" })),
      engine.triage(p({ fileId: "d", message: "tolerance exceeded: diff big" })),
    ];
    const groups = engine.group(results);
    expect(groups[0].count).toBe(3);
    expect(groups[1].count).toBe(1);
  });

  it("keeps only 3 sample messages per group", () => {
    const results = Array.from({ length: 10 }, (_v, i) =>
      engine.triage(p({ fileId: `f${i}`, message: `ENOENT: no such file C:/jobs/f${i}.sldprt` })),
    );
    const groups = engine.group(results);
    expect(groups[0].count).toBe(10);
    expect(groups[0].sampleMessages.length).toBe(3);
  });
});

// ── Misc ─────────────────────────────────────────────────────────────────────

describe("misc", () => {
  it("truncates message snippets to 200 chars", () => {
    const long = "tolerance exceeded: " + "x".repeat(500);
    const r = engine.triage(p({ message: long }));
    expect(r.messageSnippet.length).toBeLessThanOrEqual(200);
    expect(r.messageSnippet.endsWith("…")).toBe(true);
  });

  it("execute() handles single failure input", async () => {
    const out = await engine.execute({ failure: p({ message: "timeout" }) });
    expect(out.success).toBe(true);
    const data = out.data as TriageResult;
    expect(data.errorType).toBe("timeout");
  });

  it("execute() handles batch input with groups", async () => {
    const failures = [
      p({ fileId: "a", message: "timeout" }),
      p({ fileId: "b", message: "timeout" }),
      p({ fileId: "c", message: "CRC error: corrupt" }),
    ];
    const out = await engine.execute({ failures });
    expect(out.success).toBe(true);
    const data = out.data as { results: TriageResult[]; groups: unknown[] };
    expect(data.results.length).toBe(3);
    expect(data.groups.length).toBeGreaterThanOrEqual(2);
  });

  it("execute() rejects malformed input", async () => {
    const out = await engine.execute({});
    expect(out.success).toBe(false);
  });

  it("singleton is usable", () => {
    const r = cadFailureTriageEngine.triage(p({ message: "timeout" }));
    expect(r.errorType).toBe("timeout");
  });
});

// ── Seeded corpus accuracy ───────────────────────────────────────────────────

describe("seeded 40-failure corpus accuracy", () => {
  // 40 failures spanning all 6 categories with realistic noise
  const CORPUS: Array<{ payload: FailurePayload; expected: string }> = [
    // timeout (6)
    { payload: p({ message: "operation timed out after 30000ms" }), expected: "timeout" },
    { payload: p({ message: "ETIMEDOUT connecting to worker" }), expected: "timeout" },
    { payload: p({ message: "deadline exceeded: bridge did not respond" }), expected: "timeout" },
    { payload: p({ message: "whatever", aborted: true }), expected: "timeout" },
    { payload: p({ message: "AbortError: The operation was aborted" }), expected: "timeout" },
    { payload: p({ message: "worker timed out" }), expected: "timeout" },

    // format (8)
    { payload: p({ message: "ENOENT: no such file C:/a/b.sldprt" }), expected: "format" },
    { payload: p({ message: "EACCES permission denied on C:/locked.ipt" }), expected: "format" },
    { payload: p({ message: "unsupported format .obscure" }), expected: "format" },
    { payload: p({ message: "unknown file type" }), expected: "format" },
    { payload: p({ message: "zero length file" }), expected: "format" },
    { payload: p({ message: "empty file: 0 bytes" }), expected: "format" },
    { payload: p({ message: "irrelevant", fileUnreadable: true }), expected: "format" },
    { payload: p({ message: "cannot find file on disk" }), expected: "format" },

    // parse (7)
    { payload: p({ message: "SyntaxError: Unexpected token" }), expected: "parse" },
    { payload: p({ message: "parse error at line 42" }), expected: "parse" },
    { payload: p({ message: "malformed XML in FCStd archive" }), expected: "parse" },
    { payload: p({ message: "corrupt archive: CRC error" }), expected: "parse" },
    { payload: p({ message: "invalid signature: expected PK header" }), expected: "parse" },
    { payload: p({ message: "OCCT STEP parse failed entity #42" }), expected: "parse" },
    { payload: p({ message: "kernel reader aborted on degenerate face" }), expected: "parse" },

    // generation (5)
    { payload: p({ message: "toolpath generation error: tool not found" }), expected: "generation" },
    { payload: p({ message: "CAM generation failed for pocket strategy" }), expected: "generation" },
    { payload: p({ message: "post processor emitted invalid G-code" }), expected: "generation" },
    { payload: p({ message: "STEP export failed: kernel returned null" }), expected: "generation" },
    { payload: p({ message: "cannot export: assembly has open edges" }), expected: "generation" },

    // comparison (6)
    { payload: p({ message: "tolerance exceeded: diff=0.42mm threshold=0.01mm" }), expected: "comparison" },
    { payload: p({ message: "signature mismatch on bounding box hash" }), expected: "comparison" },
    { payload: p({ message: "pixel-diff exceeded threshold at view=iso" }), expected: "comparison" },
    { payload: p({ message: "STEP compare failed: 5 differences" }), expected: "comparison" },
    { payload: p({ message: "dimension mismatch: expected 50mm got 49.8mm" }), expected: "comparison" },
    { payload: p({ message: "bounding box differs on Y axis" }), expected: "comparison" },

    // crash (8)
    { payload: p({ message: "FATAL ERROR: JavaScript heap out of memory" }), expected: "crash" },
    { payload: p({ message: "SIGSEGV in native bridge" }), expected: "crash" },
    { payload: p({ message: "EXCEPTION_ACCESS_VIOLATION at 0xdeadbeef" }), expected: "crash" },
    { payload: p({ message: "EPIPE: broken pipe to worker" }), expected: "crash" },
    { payload: p({ message: "ECONNRESET reading from bridge" }), expected: "crash" },
    { payload: p({ message: "bridge exploded mid-flight" }), expected: "crash" },
    { payload: p({ message: "unhandled rejection: worker crash" }), expected: "crash" },
    { payload: p({
      message: "something nobody tagged",
      stack: "Error: wat\n    at X.y (file.ts:1:1)",
    }), expected: "crash" },
  ];

  it(">95% of corpus classified correctly", () => {
    let correct = 0;
    const misses: Array<{ msg: string; expected: string; actual: string }> = [];
    for (const { payload, expected } of CORPUS) {
      const r = engine.triage(payload);
      if (r.errorType === expected) {
        correct++;
      } else {
        misses.push({ msg: payload.message, expected, actual: r.errorType });
      }
    }
    const accuracy = correct / CORPUS.length;
    // Report any misses for debugging
    if (accuracy < 1) {
      // eslint-disable-next-line no-console
      console.warn("Misclassified:", misses);
    }
    expect(accuracy).toBeGreaterThan(0.95);
  });
});
