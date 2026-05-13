/**
 * ElectrodeCoverageAuditEngine.test.ts
 *
 * Engine-direct test coverage for TRAINING-LEARNING-MS0/U3.
 * Wiring tests live in ElectrodeCoverageAuditEngine-wire.test.ts.
 *
 * The CRITICAL test is `xlsm mtimeMs unchanged after engine.report()`
 * (per spec `no_write_assertion`). This locks the SAFETY-CRITICAL READ-ONLY
 * contract — every public method is exercised against a real temp file
 * and the file's mtimeMs is compared before/after.
 *
 * Tests intentionally avoid walking the real H:/PRISM/JM DIE corpus (~77K
 * dirs, 174 s walk time on cold-cache). Synthetic temp-dir fixtures are
 * used for corpus walks; presetSnapshot is used where the walk content
 * doesn't matter for the assertion under test.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

import {
  ElectrodeCoverageAuditEngine,
  electrodeCoverageAuditEngine,
  DEFAULT_XLSM_PATH,
  DEFAULT_CORPUS_ROOT,
  BASELINE_EXPECTED,
  DEFAULT_MAX_DEPTH,
  SAMPLE_PATHS_PER_CATEGORY,
  SCHEMA_VERSION,
} from "../engines/ElectrodeCoverageAuditEngine.js";
import type {
  CorpusScan,
  XlsmFingerprint,
  ElectrodeCoverageReport,
} from "../engines/ElectrodeCoverageAuditEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Temp fixture helpers — every test runs against synthetic temp files so the
// real JM Die corpus + .xlsm are NEVER touched by these tests.

let FIXTURE_ROOT: string;
let CORPUS_FIXTURE: string;
let EMPTY_FIXTURE: string;
let XLSM_FIXTURE: string;
let XLSM_FIXTURE_MTIME_MS: number;
let XLSM_FIXTURE_SHA256: string;
let XLSM_FIXTURE_SIZE: number;

beforeAll(() => {
  // One root for the suite.
  FIXTURE_ROOT = fs.mkdtempSync(
    path.join(os.tmpdir(), "electrode-coverage-audit-"),
  );

  // ── Synthetic JM Die-style corpus with exactly 5 electrode + 3 taptite files,
  //    distributed across multiple top-level dirs + extensions, plus a few
  //    distractor files that should NOT match.
  CORPUS_FIXTURE = path.join(FIXTURE_ROOT, "corpus");
  fs.mkdirSync(CORPUS_FIXTURE);
  fs.mkdirSync(path.join(CORPUS_FIXTURE, "CNC LATHE"));
  fs.mkdirSync(path.join(CORPUS_FIXTURE, "CNC LATHE", "OPTIMAS"));
  fs.mkdirSync(path.join(CORPUS_FIXTURE, "HAAS-HURCO"));
  fs.mkdirSync(path.join(CORPUS_FIXTURE, "HAAS-HURCO", "FASTENER"));
  fs.mkdirSync(path.join(CORPUS_FIXTURE, "OKUMA"));
  fs.mkdirSync(path.join(CORPUS_FIXTURE, "_PART LIBRARY"));

  // 5 electrodes (3 extensions: .ipt × 2, .mcx-8 × 2, .min × 1)
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "HAAS-HURCO", "FASTENER", "FINISHING ELECTRODE.ipt"),
    "fixture",
  );
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "HAAS-HURCO", "FASTENER", "ROUGHING ELECTRODE.ipt"),
    "fixture",
  );
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "OKUMA", "PART-ELECTRODE.mcx-8"),
    "fixture",
  );
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "_PART LIBRARY", "ELECTRODE-BLANK.mcx-8"),
    "fixture",
  );
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "CNC LATHE", "OPTIMAS", "BFELECTRODE.MIN"),
    "fixture",
  );

  // 3 taptites
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "CNC LATHE", "OPTIMAS", "Single Taptite.x_t"),
    "fixture",
  );
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "CNC LATHE", "OPTIMAS", "TAPTITE-FEED.DWG"),
    "fixture",
  );
  fs.writeFileSync(
    path.join(CORPUS_FIXTURE, "HAAS-HURCO", "FASTENER", "Taptite-tool.mcx-8"),
    "fixture",
  );

  // Distractors — must NOT match.
  fs.writeFileSync(path.join(CORPUS_FIXTURE, "ELECTROPLATE.txt"), "x"); // not "electrode"
  fs.writeFileSync(path.join(CORPUS_FIXTURE, "TAP.txt"), "x"); // not "taptite"
  fs.writeFileSync(path.join(CORPUS_FIXTURE, "HAAS-HURCO", "readme.md"), "x");

  // Empty fixture for missing-data tests.
  EMPTY_FIXTURE = path.join(FIXTURE_ROOT, "empty");
  fs.mkdirSync(EMPTY_FIXTURE);

  // Synthetic .xlsm — content + mtime + size + sha256 captured up-front.
  XLSM_FIXTURE = path.join(FIXTURE_ROOT, "Automated Program_FIXTURE.xlsm");
  const xlsmContent = Buffer.from(
    "PKfixture-xlsm-content-" + "x".repeat(2000),
    "binary",
  );
  fs.writeFileSync(XLSM_FIXTURE, xlsmContent);
  const stat = fs.statSync(XLSM_FIXTURE);
  XLSM_FIXTURE_MTIME_MS = stat.mtimeMs;
  XLSM_FIXTURE_SIZE = stat.size;
  XLSM_FIXTURE_SHA256 = crypto
    .createHash("sha256")
    .update(xlsmContent)
    .digest("hex");
});

afterAll(() => {
  try {
    fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 1. Module exports / singleton sanity.

describe("module exports", () => {
  it("exports the engine class + singleton", () => {
    expect(typeof ElectrodeCoverageAuditEngine).toBe("function");
    expect(electrodeCoverageAuditEngine).toBeInstanceOf(
      ElectrodeCoverageAuditEngine,
    );
  });

  it("exports the canonical .xlsm path matching the milestone envelope", () => {
    expect(DEFAULT_XLSM_PATH).toBe(
      "H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm",
    );
  });

  it("exports the canonical corpus root H:/PRISM/JM DIE", () => {
    expect(DEFAULT_CORPUS_ROOT).toBe("H:/PRISM/JM DIE");
  });

  it("freezes the baseline expectations (73 electrodes / 22 taptites)", () => {
    expect(BASELINE_EXPECTED.electrodes).toBe(73);
    expect(BASELINE_EXPECTED.taptites).toBe(22);
    expect(Object.isFrozen(BASELINE_EXPECTED)).toBe(true);
  });

  it("exports a sane DEFAULT_MAX_DEPTH + SAMPLE_PATHS_PER_CATEGORY", () => {
    expect(DEFAULT_MAX_DEPTH).toBeGreaterThan(0);
    expect(DEFAULT_MAX_DEPTH).toBeLessThanOrEqual(20);
    expect(SAMPLE_PATHS_PER_CATEGORY).toBeGreaterThan(0);
  });

  it("exports schemaVersion = 1 for the audit report shape", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 2. scanCorpus — happy path.

describe("scanCorpus — synthetic temp corpus", () => {
  it("counts exactly 5 electrodes + 3 taptites in the fixture", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.electrodeCount).toBe(5);
      expect(r.taptiteCount).toBe(3);
      expect(r.source).toBe("live");
    }
  });

  it("does NOT match distractor names (ELECTROPLATE, TAP)", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const all = [...r.samplePaths.electrodes, ...r.samplePaths.taptites];
      expect(all.some((p) => /ELECTROPLATE/i.test(p))).toBe(false);
      // "TAP.txt" → contains "tap" but NOT "taptite"
      expect(all.some((p) => /\bTAP\.txt$/i.test(p))).toBe(false);
    }
  });

  it("groups by top-level directory", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.byTopDir.electrodes["HAAS-HURCO"]).toBe(2);
      expect(r.byTopDir.electrodes["OKUMA"]).toBe(1);
      expect(r.byTopDir.electrodes["_PART LIBRARY"]).toBe(1);
      expect(r.byTopDir.electrodes["CNC LATHE"]).toBe(1);
      expect(r.byTopDir.taptites["CNC LATHE"]).toBe(2);
      expect(r.byTopDir.taptites["HAAS-HURCO"]).toBe(1);
    }
  });

  it("groups by file extension (lowercased)", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.byExtension.electrodes[".ipt"]).toBe(2);
      expect(r.byExtension.electrodes[".mcx-8"]).toBe(2);
      expect(r.byExtension.electrodes[".min"]).toBe(1);
      expect(r.byExtension.taptites[".x_t"]).toBe(1);
      expect(r.byExtension.taptites[".dwg"]).toBe(1);
      expect(r.byExtension.taptites[".mcx-8"]).toBe(1);
    }
  });

  it("samples up to SAMPLE_PATHS_PER_CATEGORY paths per category", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.samplePaths.electrodes.length).toBeLessThanOrEqual(
        SAMPLE_PATHS_PER_CATEGORY,
      );
      expect(r.samplePaths.taptites.length).toBeLessThanOrEqual(
        SAMPLE_PATHS_PER_CATEGORY,
      );
      // 5 + 3 fits below the cap.
      expect(r.samplePaths.electrodes.length).toBe(5);
      expect(r.samplePaths.taptites.length).toBe(3);
    }
  });

  it("sample paths are sorted lexicographically (deterministic order)", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const e = r.samplePaths.electrodes;
      const sorted = [...e].sort();
      expect(e).toEqual(sorted);
      const t = r.samplePaths.taptites;
      const tsorted = [...t].sort();
      expect(t).toEqual(tsorted);
    }
  });

  it("includes dirsVisited + walkTimeMs", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Root + 6 subdirs = 7 (the fixture has 6 nested dirs).
      expect(r.dirsVisited).toBeGreaterThanOrEqual(6);
      expect(r.walkTimeMs).toBeGreaterThanOrEqual(0);
      // Sub-second on a tiny fixture.
      expect(r.walkTimeMs).toBeLessThan(5000);
    }
  });

  it("returns case-insensitive matches (BFELECTRODE.MIN)", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(
        r.samplePaths.electrodes.some((p) => /BFELECTRODE\.MIN$/i.test(p)),
      ).toBe(true);
    }
  });

  it("includes ISO scannedAt timestamp", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(new Date(r.scannedAt).toString()).not.toBe("Invalid Date");
    }
  });

  it("empty corpus returns electrodeCount=0 + taptiteCount=0", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: EMPTY_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.electrodeCount).toBe(0);
      expect(r.taptiteCount).toBe(0);
      expect(r.samplePaths.electrodes).toEqual([]);
      expect(r.samplePaths.taptites).toEqual([]);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 3. scanCorpus — preset snapshot path.

describe("scanCorpus — presetSnapshot", () => {
  it("returns presetSnapshot verbatim (skips live walk) with source='preset'", () => {
    const preset: CorpusScan = {
      ok: true,
      electrodeCount: 73,
      taptiteCount: 22,
      byTopDir: { electrodes: { OKUMA: 23 }, taptites: { ROKU: 13 } },
      byExtension: { electrodes: { ".ipt": 39 }, taptites: { ".mcx-8": 7 } },
      samplePaths: { electrodes: ["a.ipt"], taptites: ["b.x_t"] },
      dirsVisited: 77552,
      walkTimeMs: 174407,
      corpusRoot: "H:/PRISM/JM DIE",
      maxDepth: 8,
      truncated: false,
      scannedAt: "2026-05-13T16:00:00.000Z",
      source: "live",
    };
    const r = electrodeCoverageAuditEngine.scanCorpus({ presetSnapshot: preset });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.electrodeCount).toBe(73);
      expect(r.taptiteCount).toBe(22);
      // Engine overrides source to "preset" even if snapshot says "live".
      expect(r.source).toBe("preset");
      // Live walk would NOT visit 77552 dirs in our temp fixture.
      expect(r.dirsVisited).toBe(77552);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 4. scanCorpus — error paths.

describe("scanCorpus — error paths", () => {
  it("missing corpus root returns ok:false + corpus_root_missing", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: path.join(FIXTURE_ROOT, "does-not-exist"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("corpus_root_missing");
      expect(typeof r.detail).toBe("string");
    }
  });

  it("file (non-dir) as corpus root returns ok:false + corpus_root_not_directory", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: XLSM_FIXTURE,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("corpus_root_not_directory");
    }
  });

  it("clamps maxDepth=-1 to 0 (no walk past root)", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
      maxDepth: -1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // depth 0 = root only, no subdirs scanned → 0 electrodes (all in subdirs).
      expect(r.electrodeCount).toBe(0);
      expect(r.maxDepth).toBe(0);
    }
  });

  it("clamps maxDepth=999 to 20 (upper bound)", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
      maxDepth: 999,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.maxDepth).toBe(20);
    }
  });

  it("NaN maxDepth falls back to DEFAULT_MAX_DEPTH", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
      maxDepth: Number.NaN,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.maxDepth).toBe(DEFAULT_MAX_DEPTH);
    }
  });

  it("Infinity maxDepth falls back to DEFAULT_MAX_DEPTH", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
      maxDepth: Number.POSITIVE_INFINITY,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.maxDepth).toBe(DEFAULT_MAX_DEPTH);
    }
  });

  it("truncation flag set when maxDepth=1 and corpus has depth=3 files", () => {
    const r = electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
      maxDepth: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Files at depth 3 (HAAS-HURCO/FASTENER/*.ipt) are unreachable.
      expect(r.truncated).toBe(true);
      // Depth 1 reaches subdirs but not their files (which are at depth 2-3).
      expect(r.electrodeCount).toBeLessThan(5);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 5. xlsmFingerprint — happy path + error paths.

describe("xlsmFingerprint — synthetic .xlsm fixture", () => {
  it("returns exists:true + mtimeMs + sizeBytes + sha256", () => {
    const r = electrodeCoverageAuditEngine.xlsmFingerprint({
      xlsmPath: XLSM_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok && "exists" in r && r.exists) {
      expect(r.mtimeMs).toBe(XLSM_FIXTURE_MTIME_MS);
      expect(r.sizeBytes).toBe(XLSM_FIXTURE_SIZE);
      expect(r.sha256).toBe(XLSM_FIXTURE_SHA256);
      expect(r.path).toBe(XLSM_FIXTURE);
      expect(r.fingerprintedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("sha256 is a 64-char hex string", () => {
    const r = electrodeCoverageAuditEngine.xlsmFingerprint({
      xlsmPath: XLSM_FIXTURE,
    });
    if (r.ok && "exists" in r && r.exists) {
      expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("missing .xlsm returns ok:true + exists:false (NOT an error)", () => {
    const r = electrodeCoverageAuditEngine.xlsmFingerprint({
      xlsmPath: path.join(FIXTURE_ROOT, "does-not-exist.xlsm"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.exists).toBe(false);
      if (!r.exists) {
        expect(r.path).toMatch(/does-not-exist\.xlsm$/);
      }
    }
  });

  it("directory passed as xlsmPath returns ok:false + xlsm_not_a_file", () => {
    const r = electrodeCoverageAuditEngine.xlsmFingerprint({
      xlsmPath: CORPUS_FIXTURE,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("xlsm_not_a_file");
    }
  });

  it("repeated fingerprint calls produce identical sha256", () => {
    const a = electrodeCoverageAuditEngine.xlsmFingerprint({
      xlsmPath: XLSM_FIXTURE,
    });
    const b = electrodeCoverageAuditEngine.xlsmFingerprint({
      xlsmPath: XLSM_FIXTURE,
    });
    if (a.ok && "exists" in a && a.exists && b.ok && "exists" in b && b.exists) {
      expect(a.sha256).toBe(b.sha256);
      expect(a.mtimeMs).toBe(b.mtimeMs);
      expect(a.sizeBytes).toBe(b.sizeBytes);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 6. report — combined audit + baseline matching + drift warnings.

describe("report — combined audit", () => {
  it("returns ok:true with corpusScan + xlsmFingerprint + baselineExpected", () => {
    const r: ElectrodeCoverageReport | { ok: false; error: string } =
      electrodeCoverageAuditEngine.report({
        corpusRoot: CORPUS_FIXTURE,
        xlsmPath: XLSM_FIXTURE,
      });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.corpusScan.ok).toBe(true);
      expect(r.xlsmFingerprint.ok).toBe(true);
      expect(r.baselineExpected.electrodes).toBe(73);
      expect(r.baselineExpected.taptites).toBe(22);
      expect(r.schemaVersion).toBe(SCHEMA_VERSION);
      expect(r.reportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("baselineMatch is false for both when fixture has 5+3 (vs baseline 73+22)", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.baselineMatch.electrodes).toBe(false);
      expect(r.baselineMatch.taptites).toBe(false);
      expect(r.driftWarnings.some((w) => /electrode count drifted/.test(w))).toBe(
        true,
      );
      expect(r.driftWarnings.some((w) => /taptite count drifted/.test(w))).toBe(
        true,
      );
    }
  });

  it("baselineMatch can be made true via baselineOverride={electrodes:5,taptites:3}", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
      baselineOverride: { electrodes: 5, taptites: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.baselineMatch.electrodes).toBe(true);
      expect(r.baselineMatch.taptites).toBe(true);
      expect(
        r.driftWarnings.some((w) => /count drifted/.test(w)),
      ).toBe(false);
    }
  });

  it("missing .xlsm produces a drift warning + ok:true", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: path.join(FIXTURE_ROOT, "missing.xlsm"),
      baselineOverride: { electrodes: 5, taptites: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(
        r.driftWarnings.some((w) => /xlsm reference missing/.test(w)),
      ).toBe(true);
    }
  });

  it("missing corpus root surfaces corpus_scan_failed", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: path.join(FIXTURE_ROOT, "missing-corpus"),
      xlsmPath: XLSM_FIXTURE,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("corpus_scan_failed");
      expect(r.corpusScan?.ok).toBe(false);
    }
  });

  it("rejects invalid baselineOverride (negative electrode count)", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
      baselineOverride: { electrodes: -1, taptites: 22 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("invalid_baseline_override");
    }
  });

  it("rejects invalid baselineOverride (NaN taptite count)", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
      baselineOverride: { electrodes: 5, taptites: Number.NaN },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("invalid_baseline_override");
    }
  });

  it("truncated corpus walk produces a 'walk truncated' drift warning", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
      maxDepth: 1,
      baselineOverride: { electrodes: 5, taptites: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.driftWarnings.some((w) => /walk truncated/.test(w))).toBe(true);
    }
  });

  it("empty corpus + baselineOverride 0/0 → zero drift warnings", () => {
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: EMPTY_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
      baselineOverride: { electrodes: 0, taptites: 0 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.driftWarnings).toEqual([]);
    }
  });

  it("presetSnapshot path through report() works", () => {
    const preset: CorpusScan = {
      ok: true,
      electrodeCount: 73,
      taptiteCount: 22,
      byTopDir: { electrodes: {}, taptites: {} },
      byExtension: { electrodes: {}, taptites: {} },
      samplePaths: { electrodes: [], taptites: [] },
      dirsVisited: 0,
      walkTimeMs: 0,
      corpusRoot: "preset",
      maxDepth: 8,
      truncated: false,
      scannedAt: "2026-05-13T00:00:00.000Z",
      source: "live",
    };
    const r = electrodeCoverageAuditEngine.report({
      presetSnapshot: preset,
      xlsmPath: XLSM_FIXTURE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.corpusScan.electrodeCount).toBe(73);
      expect(r.corpusScan.taptiteCount).toBe(22);
      expect(r.baselineMatch.electrodes).toBe(true);
      expect(r.baselineMatch.taptites).toBe(true);
      expect(r.driftWarnings).toEqual([]);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 7. CRITICAL — `fs.statSync(.xlsm).mtimeMs` unchanged after report() (the
//    no_write_assertion locked in the milestone envelope).

describe("safety: READ-ONLY contract", () => {
  it("xlsm mtimeMs is UNCHANGED after engine.report()", () => {
    const before = fs.statSync(XLSM_FIXTURE).mtimeMs;
    const r = electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
    });
    const after = fs.statSync(XLSM_FIXTURE).mtimeMs;
    expect(after).toBe(before);
    expect(r.ok).toBe(true);
  });

  it("xlsm size is UNCHANGED after engine.report()", () => {
    const before = fs.statSync(XLSM_FIXTURE).size;
    electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
    });
    const after = fs.statSync(XLSM_FIXTURE).size;
    expect(after).toBe(before);
  });

  it("xlsm sha256 is UNCHANGED after engine.report() (content untouched)", () => {
    const before = crypto
      .createHash("sha256")
      .update(fs.readFileSync(XLSM_FIXTURE))
      .digest("hex");
    electrodeCoverageAuditEngine.report({
      corpusRoot: CORPUS_FIXTURE,
      xlsmPath: XLSM_FIXTURE,
    });
    const after = crypto
      .createHash("sha256")
      .update(fs.readFileSync(XLSM_FIXTURE))
      .digest("hex");
    expect(after).toBe(before);
  });

  it("xlsm mtimeMs is UNCHANGED after 5 back-to-back report() calls", () => {
    const before = fs.statSync(XLSM_FIXTURE).mtimeMs;
    for (let i = 0; i < 5; i++) {
      electrodeCoverageAuditEngine.report({
        corpusRoot: CORPUS_FIXTURE,
        xlsmPath: XLSM_FIXTURE,
      });
    }
    const after = fs.statSync(XLSM_FIXTURE).mtimeMs;
    expect(after).toBe(before);
  });

  it("xlsm mtimeMs is UNCHANGED after xlsmFingerprint() in isolation", () => {
    const before = fs.statSync(XLSM_FIXTURE).mtimeMs;
    electrodeCoverageAuditEngine.xlsmFingerprint({ xlsmPath: XLSM_FIXTURE });
    const after = fs.statSync(XLSM_FIXTURE).mtimeMs;
    expect(after).toBe(before);
  });

  it("corpus fixture files are UNCHANGED after scanCorpus()", () => {
    const sampleFile = path.join(
      CORPUS_FIXTURE,
      "HAAS-HURCO",
      "FASTENER",
      "FINISHING ELECTRODE.ipt",
    );
    const beforeM = fs.statSync(sampleFile).mtimeMs;
    const beforeS = fs.statSync(sampleFile).size;
    electrodeCoverageAuditEngine.scanCorpus({
      corpusRoot: CORPUS_FIXTURE,
    });
    expect(fs.statSync(sampleFile).mtimeMs).toBe(beforeM);
    expect(fs.statSync(sampleFile).size).toBe(beforeS);
  });
});
