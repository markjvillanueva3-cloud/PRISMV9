/**
 * train-cnc-controller-from-corpus.test.mjs
 *
 * Companion test suite for train-cnc-controller-from-corpus.mjs.
 * AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING.
 *
 * Covers every P0/P1 finding from the 2-reviewer per-file scrutiny gate
 * (Reviewer A code-analyzer + Reviewer B independent reviewer) — each case
 * named below is a REGRESSION ORACLE: if the corresponding bug returns, the
 * test fails. Per Karpathy R9 — tests verify *intent*, not just behavior.
 *
 * Run hermetically via `node --test`:
 *   node --test H:/prism/mcp-server/scripts/__tests__/train-cnc-controller-from-corpus.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  detectControllerFamily,
  sanitizeSourceFile,
  normalizeDescription,
  extractToolSlotConventions,
  extractVVariableIdioms,
  extractMacroLabels,
  aggregateLedger,
  mineFile,
  listCorpusFiles,
  buildLedger,
  main,
  EMITTED_CONTROLLER_FAMILIES,
} from "../train-cnc-controller-from-corpus.mjs";

const SCRIPT_PATH = fileURLToPath(
  new URL("../train-cnc-controller-from-corpus.mjs", import.meta.url)
);

// Fixture: a realistic snippet of an Okuma .min macro program.
const OKUMA_FIXTURE = `O1001
G140
(T010101 - OD ROUGH TURNING)
(T020202 - OD FINISH TURNING)
(T030303 - SPOT DRILL)

(========== MACRO VARIABLES ==========)
VC100 = 1.32        (STOCK DIAMETER)
VC101 = 1.215       (FINISH OD AT FACE)
VC130 = [VC111 * 3.82] / VC110                 (SPOT DRILL RPM)
VC140 = 0.25        (ID MAJOR DIA)   ;trailing shop comment

G90 G80
N1 T010101
NAT1 G81
N100 X[VC101] R[VC105]
M9
`;

// ============================================================================
// detectControllerFamily
// ============================================================================

describe("detectControllerFamily", () => {
  it("returns okuma_osp for .min file with Okuma V-macro signature", () => {
    assert.equal(detectControllerFamily("X.min", "VC100 = 1.32"), "okuma_osp");
    assert.equal(detectControllerFamily("X.MIN", "G140\n"), "okuma_osp");
  });

  it("returns null for .min file with NO Okuma signature (P0-B regression oracle)", () => {
    // sniff-fail must return null, not silently default to okuma_osp
    assert.equal(detectControllerFamily("X.min", "random ascii\n"), null);
  });

  it("returns null for .min file with NUL byte (binary masquerade)", () => {
    assert.equal(detectControllerFamily("X.min", "abc\x00def"), null);
  });

  it("returns null for .min file with heavy U+FFFD (misread binary)", () => {
    const garbage = "�".repeat(50);
    assert.equal(detectControllerFamily("X.min", garbage), null);
  });

  it("returns siemens_sinumerik directly for .mpf", () => {
    assert.equal(
      detectControllerFamily("X.mpf", "G90 G54\n"),
      "siemens_sinumerik"
    );
  });

  it("returns heidenhain_tnc directly for .h", () => {
    assert.equal(
      detectControllerFamily("X.h", "BEGIN PGM\n"),
      "heidenhain_tnc"
    );
  });

  it("returns fanuc for .nc with O-number header", () => {
    assert.equal(detectControllerFamily("X.nc", "O1234\nG0 X1\n"), "fanuc");
  });

  it("returns null for .nc WITHOUT O-number header (sniff-fail)", () => {
    assert.equal(detectControllerFamily("X.nc", "G0 X1\nG1 Y2\n"), null);
  });

  it("returns null for unknown extension", () => {
    assert.equal(detectControllerFamily("X.txt", "anything"), null);
    assert.equal(detectControllerFamily("noext", "anything"), null);
  });

  it("emits ONLY EMITTED_CONTROLLER_FAMILIES literals (enum drift guard)", () => {
    const allowed = new Set(EMITTED_CONTROLLER_FAMILIES);
    const samples = [
      ["X.min", "VC100 = 1.32"],
      ["X.mpf", "G90"],
      ["X.h", "BEGIN PGM"],
      ["X.nc", "O1234"],
    ];
    for (const [fn, sample] of samples) {
      const r = detectControllerFamily(fn, sample);
      if (r !== null) {
        assert.ok(
          allowed.has(r),
          `detectControllerFamily emitted "${r}" not in EMITTED_CONTROLLER_FAMILIES`
        );
      }
    }
  });
});

// ============================================================================
// sanitizeSourceFile
// ============================================================================

describe("sanitizeSourceFile", () => {
  it("strips path traversal — basename has no path but we still sanitize chars", () => {
    // basename() already strips ../ — sanitize covers any residual weirdness
    assert.equal(sanitizeSourceFile("normal.min"), "normal.min");
    assert.equal(sanitizeSourceFile("with space.MIN"), "with space.MIN");
  });

  it("replaces control bytes with underscore", () => {
    assert.equal(sanitizeSourceFile("a\x00b\x01c.min"), "a_b_c.min");
  });

  it("replaces JSON-escape-confusing chars", () => {
    assert.equal(sanitizeSourceFile('a"b.min'), "a_b.min");
    assert.equal(sanitizeSourceFile("a\\b.min"), "a_b.min");
  });

  it("truncates to 255 chars", () => {
    const long = "a".repeat(300) + ".min";
    assert.equal(sanitizeSourceFile(long).length, 255);
  });

  it("preserves ASCII alphanumeric + . _ - space", () => {
    assert.equal(
      sanitizeSourceFile("MIX_OF-chars 123.min"),
      "MIX_OF-chars 123.min"
    );
  });
});

// ============================================================================
// normalizeDescription
// ============================================================================

describe("normalizeDescription", () => {
  it("uppercases", () => {
    assert.equal(normalizeDescription("stock diameter"), "STOCK DIAMETER");
  });

  it("collapses whitespace", () => {
    assert.equal(
      normalizeDescription("STOCK    DIAMETER"),
      "STOCK DIAMETER"
    );
  });

  it("strips trailing punctuation", () => {
    assert.equal(normalizeDescription("STOCK DIAMETER."), "STOCK DIAMETER");
    assert.equal(normalizeDescription("STOCK DIAMETER , "), "STOCK DIAMETER");
  });

  it("merges cosmetic variants to same key", () => {
    assert.equal(
      normalizeDescription("Stock Diameter"),
      normalizeDescription("STOCK  DIAMETER  ")
    );
  });
});

// ============================================================================
// extractToolSlotConventions
// ============================================================================

describe("extractToolSlotConventions", () => {
  it("matches Okuma 6-digit tool comment with digits=6 (P1-1 oracle)", () => {
    const r = extractToolSlotConventions("(T010101 - OD ROUGH TURNING)");
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], {
      tool_number: "010101",
      operation: "OD ROUGH TURNING",
      digits: 6,
    });
  });

  it("matches Fanuc 4-digit tool comment with digits=4", () => {
    const r = extractToolSlotConventions("(T0101 - FACE MILL)");
    assert.equal(r.length, 1);
    assert.equal(r[0].digits, 4);
  });

  it("skips 1-3 digit tool numbers (below min width)", () => {
    assert.equal(extractToolSlotConventions("(T1 - FOO)").length, 0);
    assert.equal(extractToolSlotConventions("(T12 - FOO)").length, 0);
    assert.equal(extractToolSlotConventions("(T123 - FOO)").length, 0);
  });

  it("skips empty description", () => {
    assert.equal(extractToolSlotConventions("(T010101 -  )").length, 0);
  });

  it("tolerates leading whitespace in comment", () => {
    const r = extractToolSlotConventions("(  T010101 - OD ROUGH  )");
    assert.equal(r.length, 1);
    assert.equal(r[0].operation, "OD ROUGH");
  });

  it("extracts multiple from full fixture", () => {
    const r = extractToolSlotConventions(OKUMA_FIXTURE);
    assert.equal(r.length, 3);
    assert.equal(r.map((x) => x.tool_number).join(","), "010101,020202,030303");
  });
});

// ============================================================================
// extractVVariableIdioms
// ============================================================================

describe("extractVVariableIdioms", () => {
  it("matches simple VC assignment", () => {
    const r = extractVVariableIdioms("VC100 = 1.32        (STOCK DIAMETER)");
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], {
      name: "VC100",
      expression: "1.32",
      description: "STOCK DIAMETER",
    });
  });

  it("matches V (single letter) assignment", () => {
    const r = extractVVariableIdioms("V1 = 5 (X OFFSET)");
    assert.equal(r.length, 1);
    assert.equal(r[0].name, "V1");
  });

  it("matches formula RHS with brackets", () => {
    const r = extractVVariableIdioms(
      "VC130 = [VC111 * 3.82] / VC110                 (SPOT DRILL RPM)"
    );
    assert.equal(r.length, 1);
    assert.equal(r[0].expression, "[VC111 * 3.82] / VC110");
  });

  it("tolerates trailing semicolon comment (P1-E oracle)", () => {
    const r = extractVVariableIdioms(
      "VC140 = 0.25        (ID MAJOR DIA)   ;trailing shop comment"
    );
    assert.equal(r.length, 1);
    assert.equal(r[0].description, "ID MAJOR DIA");
  });

  it("skips comment-less assignment", () => {
    assert.equal(extractVVariableIdioms("VC100 = 1.32").length, 0);
  });

  it("skips empty-expression bare paren", () => {
    assert.equal(extractVVariableIdioms("VC100 = (STOCK)").length, 0);
  });

  it("extracts all 4 from full fixture", () => {
    const r = extractVVariableIdioms(OKUMA_FIXTURE);
    assert.equal(r.length, 4);
    assert.equal(r[3].name, "VC140");
  });
});

// ============================================================================
// extractMacroLabels
// ============================================================================

describe("extractMacroLabels", () => {
  it("matches alphabetic-prefix label with G-token", () => {
    const r = extractMacroLabels("NAT1 G81");
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], { label: "NAT1", following_token: "G81" });
  });

  it("matches alpha-prefixed numeric-suffix label (NCYC100) with coord token", () => {
    // Per the regex docstring, pure-numeric N\d+ labels are filtered as
    // low-signal block tags. Alpha-prefixed labels (NCYC100, NAT1) are kept.
    const r = extractMacroLabels("NCYC100 X[VC101]");
    assert.equal(r.length, 1);
    assert.equal(r[0].label, "NCYC100");
  });

  it("skips pure-numeric label on its own", () => {
    // N1 followed by T-token — the T is in our allow class, so this MATCHES.
    // But N1 alone (no following token) should not match.
    const r = extractMacroLabels("N1\nG0 X0");
    assert.equal(r.length, 0);
  });

  it("skips pure-numeric label even with following token (block-tag filter)", () => {
    const r = extractMacroLabels("N1 T010101\n");
    assert.equal(r.length, 0); // pure-numeric N\d+ — filtered out
  });

  it("matches H-register following label (P1-B extended class)", () => {
    const r = extractMacroLabels("NAT2 H05");
    assert.equal(r.length, 1);
    assert.equal(r[0].following_token, "H05");
  });
});

// ============================================================================
// aggregateLedger
// ============================================================================

describe("aggregateLedger", () => {
  it("merges identical patterns across files into frequency count", () => {
    const fileResults = [
      {
        source_file: "a.min",
        controller: "okuma_osp",
        tools: [{ tool_number: "010101", operation: "OD ROUGH", digits: 6 }],
        vars: [],
        labels: [],
      },
      {
        source_file: "b.min",
        controller: "okuma_osp",
        tools: [{ tool_number: "010101", operation: "OD ROUGH", digits: 6 }],
        vars: [],
        labels: [],
      },
      {
        source_file: "c.min",
        controller: "okuma_osp",
        tools: [{ tool_number: "010101", operation: "OD ROUGH", digits: 6 }],
        vars: [],
        labels: [],
      },
    ];
    const led = aggregateLedger(fileResults);
    assert.equal(led.tool_slot_conventions.length, 1);
    assert.equal(led.tool_slot_conventions[0].frequency, 3);
    assert.deepEqual(led.tool_slot_conventions[0].source_files, [
      "a.min",
      "b.min",
      "c.min",
    ]);
  });

  it("merges cosmetic-variant descriptions via normalizeDescription (P1-2 oracle)", () => {
    const fileResults = [
      {
        source_file: "a.min",
        controller: "okuma_osp",
        tools: [],
        vars: [
          { name: "VC100", expression: "1.32", description: "STOCK DIAMETER" },
        ],
        labels: [],
      },
      {
        source_file: "b.min",
        controller: "okuma_osp",
        tools: [],
        vars: [
          { name: "VC100", expression: "1.40", description: "Stock Diameter " },
        ],
        labels: [],
      },
    ];
    const led = aggregateLedger(fileResults);
    assert.equal(led.v_variable_idioms.length, 1, "cosmetic variants must merge");
    assert.equal(led.v_variable_idioms[0].frequency, 2);
  });

  it("caps source_files at maxSources (default 16)", () => {
    const fileResults = Array.from({ length: 20 }, (_, i) => ({
      source_file: `f${i}.min`,
      controller: "okuma_osp",
      tools: [{ tool_number: "010101", operation: "OD ROUGH", digits: 6 }],
      vars: [],
      labels: [],
    }));
    const led = aggregateLedger(fileResults, 16);
    assert.equal(led.tool_slot_conventions[0].frequency, 20);
    assert.equal(led.tool_slot_conventions[0].source_files.length, 16);
  });

  it("emits deterministic JSON regardless of input file order", () => {
    const a = {
      source_file: "a.min",
      controller: "okuma_osp",
      tools: [{ tool_number: "010101", operation: "OD ROUGH", digits: 6 }],
      vars: [],
      labels: [],
    };
    const b = {
      source_file: "b.min",
      controller: "okuma_osp",
      tools: [{ tool_number: "020202", operation: "OD FINISH", digits: 6 }],
      vars: [],
      labels: [],
    };
    const led1 = aggregateLedger([a, b]);
    const led2 = aggregateLedger([b, a]);
    // Identity is (controller,tool_number,operation); both runs see freq=1
    // for each, so the sort order depends on identity not insertion.
    assert.equal(
      JSON.stringify(led1.tool_slot_conventions.map((x) => x.tool_number)),
      JSON.stringify(led2.tool_slot_conventions.map((x) => x.tool_number))
    );
  });
});

// ============================================================================
// mineFile + listCorpusFiles + buildLedger — hermetic via tmpdir
// ============================================================================

describe("mineFile + buildLedger E2E (hermetic tmpdir)", () => {
  it("mineFile size cap rejects oversize file (P0-A oracle)", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      const fp = join(dir, "big.min");
      writeFileSync(fp, "VC100 = 1.32 (STOCK)\n" + "x".repeat(100), "utf8");
      const r = mineFile(fp, 10); // 10 byte cap
      assert.equal(r, null); // skipped, not thrown
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("mineFile sanitizes source_file in output", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      const fp = join(dir, "ok.min");
      writeFileSync(fp, OKUMA_FIXTURE, "utf8");
      const r = mineFile(fp);
      assert.ok(r);
      assert.equal(r.source_file, "ok.min");
      assert.equal(r.controller, "okuma_osp");
      assert.ok(r.tools.length >= 3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("buildLedger throws on empty corpus", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      assert.throws(() => buildLedger(dir), /contains 0 mineable files/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("buildLedger throws when files exist but all controller-null", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      // .min file with NO Okuma signature → controller-null
      writeFileSync(join(dir, "x.min"), "random text\n", "utf8");
      assert.throws(() => buildLedger(dir), /empty ledger/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("buildLedger throws on zero-row extraction (R12 oracle)", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      // Okuma signature passes sniff (G140) but no extractable rows
      writeFileSync(join(dir, "x.min"), "G140\nG0 X0\n", "utf8");
      assert.throws(() => buildLedger(dir), /extractors likely broken/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("buildLedger end-to-end emits DRAFT schemaVersion with schemaNote", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      writeFileSync(join(dir, "a.min"), OKUMA_FIXTURE, "utf8");
      writeFileSync(join(dir, "b.min"), OKUMA_FIXTURE, "utf8");
      const led = buildLedger(dir);
      assert.equal(led.schemaVersion, "1.0.0-DRAFT-no-consumer");
      assert.ok(led.schemaNote.includes("DRAFT"));
      assert.equal(led.fileCount, 2);
      assert.equal(led.controllerCounts.okuma_osp, 2);
      assert.ok(led.ledger.tool_slot_conventions.length >= 3);
      assert.ok(led.ledger.v_variable_idioms.length >= 4);
      assert.ok(led.ledger.macro_labels.length >= 1);
      // Provenance preserved
      for (const t of led.ledger.tool_slot_conventions) {
        assert.ok(Array.isArray(t.source_files));
        assert.ok(t.source_files.length >= 1);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("listCorpusFiles returns sorted, deterministic list", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      writeFileSync(join(dir, "z.min"), "VC100 = 1 (X)\n", "utf8");
      writeFileSync(join(dir, "a.min"), "VC100 = 1 (X)\n", "utf8");
      writeFileSync(join(dir, "m.min"), "VC100 = 1 (X)\n", "utf8");
      writeFileSync(join(dir, "ignored.txt"), "skip me\n", "utf8");
      const files = listCorpusFiles(dir);
      assert.equal(files.length, 3);
      // sorted ascending by full path → a, m, z
      assert.ok(files[0].endsWith("a.min"));
      assert.ok(files[1].endsWith("m.min"));
      assert.ok(files[2].endsWith("z.min"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// main() — CLI contract
// ============================================================================

describe("main() CLI contract", () => {
  it("returns 2 on missing args", () => {
    assert.equal(main([]), 2);
    assert.equal(main(["--corpus-dir", "x"]), 2);
    assert.equal(main(["--out", "y.json"]), 2);
  });

  it("returns 2 on flag-as-value (P3-1 oracle)", () => {
    assert.equal(main(["--corpus-dir", "--out", "y.json"]), 2);
    assert.equal(main(["--corpus-dir", "x", "--out", "--corpus-dir"]), 2);
  });

  it("returns 3 on empty corpus dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      assert.equal(
        main(["--corpus-dir", dir, "--out", join(dir, "out.json")]),
        3
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns 0 on happy-path E2E with synthetic corpus", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      mkdirSync(join(dir, "corpus"));
      writeFileSync(join(dir, "corpus", "a.min"), OKUMA_FIXTURE, "utf8");
      const outPath = join(dir, "learned.json");
      const code = main(["--corpus-dir", join(dir, "corpus"), "--out", outPath]);
      assert.equal(code, 0);
      // Verify ledger written + parseable + DRAFT marker
      const led = JSON.parse(readFileSync(outPath, "utf8"));
      assert.equal(led.schemaVersion, "1.0.0-DRAFT-no-consumer");
      assert.ok(led.ledger.tool_slot_conventions.length > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// isMain guard — importing module MUST NOT auto-invoke main()
// ============================================================================

describe("isMain guard", () => {
  it("importing the module does not auto-call main (we got here)", () => {
    // If main() ran on import, our imports above would have process.exit'd.
    // Reaching this assertion proves the guard holds.
    assert.equal(typeof main, "function");
  });
});

// ============================================================================
// REAL DATA E2E — runs against H:/prism/JM DIE/MACRO PROGRAMS (R8 — read
// before you write, U-INTEG-FIX-P0 lesson — hermetic fakes don't prove
// production wiring). Gated by env so CI without the corpus still passes.
// ============================================================================

describe("REAL DATA E2E (JM-Die MACRO PROGRAMS)", () => {
  const REAL_CORPUS = "H:/prism/JM DIE/MACRO PROGRAMS";
  const haveCorpus = (() => {
    try {
      return statSync(REAL_CORPUS).isDirectory();
    } catch {
      return false;
    }
  })();
  it("buildLedger produces non-stub output from real Okuma corpus", { skip: !haveCorpus }, () => {
    const led = buildLedger(REAL_CORPUS);
    assert.ok(led.fileCount >= 1, "expected ≥1 file mined");
    const total =
      led.ledger.tool_slot_conventions.length +
      led.ledger.v_variable_idioms.length +
      led.ledger.macro_labels.length;
    assert.ok(total > 0, "expected ≥1 extracted row from real corpus");
    // Provenance check: at least one row has source_files matching a real .min
    const firstRow =
      led.ledger.tool_slot_conventions[0] ||
      led.ledger.v_variable_idioms[0] ||
      led.ledger.macro_labels[0];
    assert.ok(
      firstRow.source_files.some((s) => s.toLowerCase().endsWith(".min")),
      "expected at least one source_file to end in .min"
    );
  });
});

// ============================================================================
// Subprocess oracle — CLI invocation via execFileSync (catches main()-only
// regressions that pure-core tests miss; per the U-SLOT-BIND-ENFORCE lesson
// 2026-05-18 — "a pure-core + injected-deps design MUST ship a real
// subprocess integration oracle").
// ============================================================================

describe("subprocess oracle", () => {
  it("CLI exits 2 on no args (subprocess)", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      const result = (() => {
        try {
          execFileSync(process.execPath, [SCRIPT_PATH], { stdio: "pipe" });
          return 0;
        } catch (e) {
          return e.status;
        }
      })();
      assert.equal(result, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("CLI exits 0 and writes ledger end-to-end (subprocess)", () => {
    const dir = mkdtempSync(join(tmpdir(), "train-cnc-test-"));
    try {
      mkdirSync(join(dir, "corpus"));
      writeFileSync(join(dir, "corpus", "real.min"), OKUMA_FIXTURE, "utf8");
      const outPath = join(dir, "learned.json");
      execFileSync(
        process.execPath,
        [SCRIPT_PATH, "--corpus-dir", join(dir, "corpus"), "--out", outPath],
        { stdio: "pipe" }
      );
      const led = JSON.parse(readFileSync(outPath, "utf8"));
      assert.ok(led.ledger.tool_slot_conventions.length > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
