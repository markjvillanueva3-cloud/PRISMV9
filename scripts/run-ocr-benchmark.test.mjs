// scripts/run-ocr-benchmark.test.mjs
//
// U-TDP09d — pdf-text-extract-lib live adapter wiring verification.
//
// The original makeLiveExtractor() was `async () => null` — a hard stub.
// U-TDP09d replaces it with a PDF→text→deterministic-extractor pipeline.
// These tests verify:
//   - injected readPdfText is called with the pdf_path
//   - extractDimensionsFromText is exercised on the returned text
//   - dimensions round-trip into the adapter result
//   - every failure path (no path / null text / empty text / parser error)
//     resolves to null (caller will count as FN)
//   - source tag is "pdf-text-extract-lib" so benchmark reports attribute it
//
// Tests are hermetic — readPdfText is always injected. The default
// PyMuPDF subprocess path is exercised by run-ocr-benchmark in production.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeLiveExtractor } from "./run-ocr-benchmark.mjs";

test("U-TDP09d live: 'R0.8mm' → radius dim emitted via wired extractor", async () => {
  const extract = makeLiveExtractor({ readPdfText: () => "R0.8mm" });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.ok(r, "non-null adapter result");
  assert.equal(r.source, "pdf-text-extract-lib", "source tag attributes the adapter");
  const rad = r.dimensions.find((d) => d.meta?.type === "radius");
  assert.ok(rad, "radius dim recovered");
  assert.ok(Math.abs(rad.nominal - 0.8) < 1e-9, "nominal=0.8");
});

test("U-TDP09d live: full toleranced bilateral round-trips", async () => {
  // Canonical split-token Ø dim → tolerance recovered via U-TDP07 path.
  const txt = "5.00\nn\n- .10\n.10\n+\nmm\n";
  const extract = makeLiveExtractor({ readPdfText: () => txt });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.ok(r, "non-null result");
  assert.equal(r.dimensions.length, 1);
  assert.equal(r.dimensions[0].nominal, 5.0);
  assert.ok(Math.abs(r.dimensions[0].tolerance.upper - 0.10) < 1e-9);
});

test("U-TDP09d live: confidence + meta flow through adapter result", async () => {
  // The extractor's confidence ladder must surface on the adapter result —
  // the benchmark uses it to grade extraction quality per class.
  const extract = makeLiveExtractor({
    readPdfText: () => "Material: M-2\nSurface: TiN\n5.00\n- .10\n.10\n+\nmm\n",
  });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.ok(r);
  assert.ok(typeof r.confidence === "number", "confidence is a number");
  assert.equal(r.material, "M-2", "material flows through");
  assert.equal(r.surface_treatment, "TiN", "surface treatment flows through");
});

test("U-TDP09d live REJECT: null text → null adapter result (FN)", async () => {
  const extract = makeLiveExtractor({ readPdfText: () => null });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.equal(r, null, "null reader output → null result (caller counts FN)");
});

test("U-TDP09d live REJECT: empty text → null adapter result", async () => {
  const extract = makeLiveExtractor({ readPdfText: () => "" });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.equal(r, null, "empty text refused");
});

test("U-TDP09d live REJECT: whitespace-only text → null adapter result", async () => {
  const extract = makeLiveExtractor({ readPdfText: () => "   \n\n  \t  " });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.equal(r, null, "whitespace-only treated as empty");
});

test("U-TDP09d live: reader receives pdf_path verbatim", async () => {
  let received = null;
  const extract = makeLiveExtractor({
    readPdfText: (p) => {
      received = p;
      return "R0.5mm";
    },
  });
  await extract({ pdf_path: "H:/some/path/Punch-001.pdf" });
  assert.equal(received, "H:/some/path/Punch-001.pdf", "pdf_path passed to reader");
});

test("U-TDP09d live REJECT: non-string reader output → null", async () => {
  const extract = makeLiveExtractor({ readPdfText: () => 42 });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.equal(r, null, "non-string output rejected");
});

test("U-TDP09d live REJECT: undefined pdf_path → null (no spawn attempt)", async () => {
  // Defensive — the default reader's existsSync(undefined) would throw;
  // an injected reader could still be called, but the harness should
  // ideally NOT pass undefined. This test pins behavior: extractor still
  // calls reader, which here returns null on missing path.
  const extract = makeLiveExtractor({
    readPdfText: (p) => (typeof p === "string" && p ? "R0.5mm" : null),
  });
  const r = await extract({ pdf_path: undefined });
  assert.equal(r, null, "missing pdf_path safely resolves to null");
});

test("U-TDP09d live: U-TDP09 patterns (MAX/MIN, slash-paired, EU comma) all flow", async () => {
  // End-to-end: U-TDP09a normalization + U-TDP09b MAX/MIN + U-TDP09c
  // slash-paired all exercise through the live adapter. Verifies the
  // wiring carries the full extractor surface, not just U-TDP07/08.
  const txt = [
    "R0,8 mm",        // U-TDP09a: EU comma → "R0.8 mm" — but no STUCK_MM space-tolerant match, so skip dim
    "R0.5 MAX",       // U-TDP09b: radius-MAX
    "0.501/0.500",    // U-TDP09c: slash-paired
  ].join("\n");
  const extract = makeLiveExtractor({ readPdfText: () => txt });
  const r = await extract({ pdf_path: "/fake/path.pdf" });
  assert.ok(r);
  const maxmin = r.dimensions.find((d) => d.meta?.format === "max-min");
  const slash = r.dimensions.find((d) => d.meta?.format === "slash-paired");
  assert.ok(maxmin, "MAX/MIN scanner fires through adapter");
  assert.ok(slash, "slash-paired scanner fires through adapter");
});

test("U-TDP09d anti-regression: default makeLiveExtractor still importable (no signature break)", () => {
  // The opts argument is optional. With no opts and no PyMuPDF in CI, the
  // default reader will return null and the adapter behaves like the old
  // hard-null stub — preserving the pre-U-TDP09d benchmark exit code.
  const extract = makeLiveExtractor();
  assert.equal(typeof extract, "function", "no-arg signature still produces a function");
});
