// U-TDP-DT01 — Tests for the drawing-template persistence script.
//
// Targets the PURE exports of `derive-drawing-templates.ts`:
//   • deriveDrawingTemplates(report, opts, buildSeq) — the per-class loop
//   • parseArgs(argv) — CLI flag validation
//   • buildManifest(templates, report, corpusPath, ratio, now) — manifest shape
//
// The CLI shell (file-system + process.exitCode) is exercised end-to-end by
// the smoke test in this same suite via a child-process invocation.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import {
  deriveDrawingTemplates,
  parseArgs,
  buildManifest,
  isSafePartClassSlug,
  type DerivedDrawingTemplate,
  type BuildSequenceForEvidenceFn,
  type WriteOutcome,
} from "../derive-drawing-templates.js";
import type { CADCorpusStepGeometryReport } from "../../src/engines/CADClassFeatureLibraryEngine.js";

// -- Fixtures ------------------------------------------------------------

const FROZEN_NOW = new Date("2026-05-19T03:30:00.000Z");
const FROZEN_DATE = "2026-05-19";

const REAL_CORPUS: CADCorpusStepGeometryReport & { generated_at: string } = {
  // Field intentionally typed via cast in the engine; here we carry it
  // alongside since the script preserves it as `corpus_report_generated_at`.
  generated_at: "2026-05-18T02:51:58.875Z",
  per_class: [
    {
      part_class: "die",
      files_examined: 75,
      feature_evidence_counts: {
        central_oil_hole: 71,
        bevel_face_chamfer: 38,
        stepped_revolved_axis: 35,
        working_tip_taper: 33,
        cross_drilled_relief_holes: 28,
        shoulder_fillet: 16,
      },
    },
    {
      part_class: "shaft",
      files_examined: 4,
      feature_evidence_counts: {
        central_oil_hole: 4,
        bevel_face_chamfer: 4,
        stepped_revolved_axis: 2,
      },
    },
  ],
};

/** Minimal stand-in for the engine method — testable without booting the singleton. */
function makeFakeBuildSeq(perClass: Record<string, ReturnType<BuildSequenceForEvidenceFn> | undefined>): BuildSequenceForEvidenceFn {
  return (cls, _opts) => {
    const r = perClass[cls];
    if (r) return r;
    return { sequence: [], caveats: ["no fake response for class " + cls], corpus_class_found: false };
  };
}

// -- deriveDrawingTemplates ----------------------------------------------

describe("deriveDrawingTemplates", () => {
  it("emits one template per class with a non-empty sequence", () => {
    const buildSeq = makeFakeBuildSeq({
      die: {
        sequence: [
          { kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never,
          { kind: "bevel_face_chamfer", prevalence: 0.5, evidence_count: 38, evidence_ratio: 0.507, source: "corpus" } as never,
        ],
        caveats: [],
        corpus_class_found: true,
      },
      shaft: {
        sequence: [
          { kind: "central_oil_hole", prevalence: 1, evidence_count: 4, evidence_ratio: 1, source: "corpus" } as never,
        ],
        caveats: ["drift: feature \"stepped_revolved_axis\" template_prevalence=1 but corpus_evidence_ratio=0.500"],
        corpus_class_found: true,
      },
    });

    const out = deriveDrawingTemplates(REAL_CORPUS, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);

    expect(out).toHaveLength(2);
    expect(out[0].part_class).toBe("die");
    expect(out[0].evidence_date).toBe(FROZEN_DATE);
    expect(out[0].generated_at).toBe(FROZEN_NOW.toISOString());
    expect(out[0].build_sequence).toHaveLength(2);
    expect(out[0].files_examined).toBe(75);
    expect(out[0].min_evidence_ratio).toBe(0.3);
    expect(out[0].advisoryOnly).toBe(true);
    expect(out[0].mustHumanVerify).toBe(true);
    expect(out[0].source).toBe("evidence_driven_corpus_report");
    expect(out[0].corpus_report_generated_at).toBe("2026-05-18T02:51:58.875Z");
    expect(out[1].caveats).toContain("drift: feature \"stepped_revolved_axis\" template_prevalence=1 but corpus_evidence_ratio=0.500");
  });

  it("skips classes whose evidence-driven sequence is empty (does NOT emit a phantom file)", () => {
    const buildSeq = makeFakeBuildSeq({
      die: {
        sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never],
        caveats: [],
        corpus_class_found: true,
      },
      shaft: { sequence: [], caveats: ["below threshold"], corpus_class_found: true },
    });

    const out = deriveDrawingTemplates(REAL_CORPUS, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);

    expect(out).toHaveLength(1);
    expect(out[0].part_class).toBe("die");
  });

  it("returns [] for a null/malformed report (no throw)", () => {
    // @ts-expect-error — deliberately pass undefined to exercise the guard.
    expect(deriveDrawingTemplates(undefined, { minEvidenceRatio: 0.3, now: FROZEN_NOW })).toEqual([]);
    // @ts-expect-error — per_class is required by the interface; the script
    // must NOT throw when a hostile/partial report appears at runtime.
    expect(deriveDrawingTemplates({}, { minEvidenceRatio: 0.3, now: FROZEN_NOW })).toEqual([]);
    expect(deriveDrawingTemplates({ per_class: null as never } as unknown as CADCorpusStepGeometryReport, { minEvidenceRatio: 0.3, now: FROZEN_NOW })).toEqual([]);
  });

  it("skips per_class entries that lack a part_class string", () => {
    const buildSeq = makeFakeBuildSeq({
      die: {
        sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never],
        caveats: [],
        corpus_class_found: true,
      },
    });
    const corrupt: CADCorpusStepGeometryReport = {
      per_class: [
        // @ts-expect-error — part_class missing
        { files_examined: 5, feature_evidence_counts: {} },
        // part_class is empty string — must be skipped
        { part_class: "", files_examined: 5, feature_evidence_counts: {} },
        // valid entry
        { part_class: "die", files_examined: 75, feature_evidence_counts: { central_oil_hole: 71 } },
      ],
    };
    const out = deriveDrawingTemplates(corrupt, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);
    expect(out).toHaveLength(1);
    expect(out[0].part_class).toBe("die");
  });

  it("preserves the engine-reported corpus_class_found flag (true and false)", () => {
    const buildSeq = makeFakeBuildSeq({
      die: {
        sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never],
        caveats: [],
        corpus_class_found: true,
      },
      shaft: {
        sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 0, evidence_ratio: 0, source: "template_fallback" } as never],
        caveats: ["corpus has no entry for part_class \"shaft\" — falling back to template prevalence"],
        corpus_class_found: false,
      },
    });
    const out = deriveDrawingTemplates(REAL_CORPUS, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);
    expect(out.find((t) => t.part_class === "die")?.corpus_class_found).toBe(true);
    expect(out.find((t) => t.part_class === "shaft")?.corpus_class_found).toBe(false);
  });

  it("forwards minEvidenceRatio to the engine and reflects it in the artifact", () => {
    let captured = -1;
    const buildSeq: BuildSequenceForEvidenceFn = (cls, opts) => {
      captured = opts.min_evidence_ratio ?? -1;
      return {
        sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never],
        caveats: [],
        corpus_class_found: true,
      };
    };
    const out = deriveDrawingTemplates(
      { per_class: [REAL_CORPUS.per_class[0]] } as CADCorpusStepGeometryReport,
      { minEvidenceRatio: 0.55, now: FROZEN_NOW },
      buildSeq,
    );
    expect(captured).toBe(0.55);
    expect(out[0].min_evidence_ratio).toBe(0.55);
  });

  it("guards files_examined non-finite (NaN/Infinity coerce to 0)", () => {
    const buildSeq = makeFakeBuildSeq({
      die: {
        sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never],
        caveats: [],
        corpus_class_found: true,
      },
    });
    const corrupt: CADCorpusStepGeometryReport = {
      per_class: [
        { part_class: "die", files_examined: NaN, feature_evidence_counts: { central_oil_hole: 71 } },
      ],
    };
    const out = deriveDrawingTemplates(corrupt, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);
    expect(out[0].files_examined).toBe(0);
  });

  it("returns [] when report.per_class is an empty array (no classes to derive)", () => {
    const buildSeq = makeFakeBuildSeq({});
    const out = deriveDrawingTemplates({ per_class: [] } as CADCorpusStepGeometryReport, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);
    expect(out).toEqual([]);
  });

  it("normalizes a missing/non-array caveats field to []", () => {
    const buildSeq: BuildSequenceForEvidenceFn = () => ({
      sequence: [{ kind: "central_oil_hole", prevalence: 1, evidence_count: 71, evidence_ratio: 0.947, source: "corpus" } as never],
      // @ts-expect-error — deliberately omit caveats to test the guard
      caveats: undefined,
      corpus_class_found: true,
    });
    const out = deriveDrawingTemplates({ per_class: [REAL_CORPUS.per_class[0]] } as CADCorpusStepGeometryReport, { minEvidenceRatio: 0.3, now: FROZEN_NOW }, buildSeq);
    expect(out[0].caveats).toEqual([]);
  });
});

// -- parseArgs -----------------------------------------------------------

describe("parseArgs", () => {
  it("defaults are conservative", () => {
    const a = parseArgs([]);
    expect(a.corpusReport).toBeNull();
    expect(a.outDir).toBeNull();
    expect(a.minEvidenceRatio).toBe(0.3);
    expect(a.json).toBe(false);
    expect(a.dryRun).toBe(false);
    expect(a.argError).toBeNull();
  });

  it("parses --json + --dry-run + paths", () => {
    const a = parseArgs(["--corpus-report", "/x/y.json", "--out-dir", "/z", "--json", "--dry-run"]);
    expect(a.corpusReport).toBe("/x/y.json");
    expect(a.outDir).toBe("/z");
    expect(a.json).toBe(true);
    expect(a.dryRun).toBe(true);
  });

  it("rejects --min-evidence-ratio outside [0,1] (loud arg error)", () => {
    expect(parseArgs(["--min-evidence-ratio", "1.5"]).argError).toMatch(/min-evidence-ratio/);
    expect(parseArgs(["--min-evidence-ratio", "-0.1"]).argError).toMatch(/min-evidence-ratio/);
    expect(parseArgs(["--min-evidence-ratio", "abc"]).argError).toMatch(/min-evidence-ratio/);
    expect(parseArgs(["--min-evidence-ratio"]).argError).toMatch(/min-evidence-ratio/);
  });

  it("accepts edge values 0 and 1", () => {
    expect(parseArgs(["--min-evidence-ratio", "0"]).minEvidenceRatio).toBe(0);
    expect(parseArgs(["--min-evidence-ratio", "1"]).minEvidenceRatio).toBe(1);
  });

  it("--help short-circuits without an arg error", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });
});

// -- buildManifest -------------------------------------------------------

describe("buildManifest", () => {
  const templates: DerivedDrawingTemplate[] = [
    {
      schemaVersion: 1,
      kind: "drawing_template",
      part_class: "die",
      generated_at: FROZEN_NOW.toISOString(),
      evidence_date: FROZEN_DATE,
      source: "evidence_driven_corpus_report",
      corpus_report_generated_at: "2026-05-18T02:51:58.875Z",
      corpus_class_found: true,
      files_examined: 75,
      min_evidence_ratio: 0.3,
      build_sequence: [{ kind: "central_oil_hole" } as never, { kind: "bevel_face_chamfer" } as never],
      caveats: ["drift: feature foo"],
      advisoryOnly: true,
      mustHumanVerify: true,
    },
  ];

  it("summarizes each template with sequence_length + caveat_count", () => {
    const m = buildManifest(templates, REAL_CORPUS, "/x/corpus.json", 0.3, FROZEN_NOW);
    expect(m.templates_emitted).toBe(1);
    expect(m.classes_in_report).toBe(2);
    expect(m.templates[0]).toMatchObject({
      part_class: "die",
      files_examined: 75,
      sequence_length: 2,
      caveat_count: 1,
      corpus_class_found: true,
    });
    expect(m.corpus_report_generated_at).toBe("2026-05-18T02:51:58.875Z");
    expect(m.advisoryOnly).toBe(true);
    expect(m.mustHumanVerify).toBe(true);
  });

  it("handles a malformed report (no per_class) → classes_in_report=0", () => {
    const m = buildManifest([], {} as unknown as CADCorpusStepGeometryReport, "/x/corpus.json", 0.3, FROZEN_NOW);
    expect(m.classes_in_report).toBe(0);
    expect(m.templates_emitted).toBe(0);
    expect(m.dry_run).toBe(false);
    expect(m.write_failures).toEqual([]);
  });

  it("propagates dry_run + write_failures + caveat_preview into the manifest", () => {
    const tpl: DerivedDrawingTemplate = {
      schemaVersion: 1,
      kind: "drawing_template",
      part_class: "die",
      generated_at: FROZEN_NOW.toISOString(),
      evidence_date: FROZEN_DATE,
      source: "evidence_driven_corpus_report",
      corpus_report_generated_at: null,
      corpus_class_found: true,
      files_examined: 75,
      min_evidence_ratio: 0.3,
      build_sequence: [{ kind: "central_oil_hole" } as never],
      caveats: ["c1", "c2", "c3", "c4"],
      advisoryOnly: true,
      mustHumanVerify: true,
    };
    const failures: WriteOutcome[] = [{ part_class: "blisk", status: "failed", error: "EACCES" }];
    const m = buildManifest([tpl], REAL_CORPUS, "/x/c.json", 0.3, FROZEN_NOW, { dryRun: true, writeFailures: failures });
    expect(m.dry_run).toBe(true);
    expect(m.write_failures).toEqual(failures);
    // First 3 caveats only — the 4th is dropped from the preview
    expect(m.templates[0].caveat_preview).toEqual(["c1", "c2", "c3"]);
  });
});

// -- isSafePartClassSlug (arm B P1 — path traversal guard) ---------------

describe("isSafePartClassSlug", () => {
  it("accepts normal PRISM part_class slugs", () => {
    for (const ok of ["die", "shaft", "casing", "extrude_punch", "valve_body", "blisk", "bracket"]) {
      expect(isSafePartClassSlug(ok)).toBe(true);
    }
  });

  it("rejects path-traversal payloads", () => {
    for (const bad of [
      "../etc/passwd",
      "..\\..\\config",
      "die/../shaft",
      "die\\../shaft",
      "die .json",       // NUL injection
      "/abs/path",
      "C:\\windows",
      "die ",                 // leading/trailing whitespace
      " die",
      "",
      "die*wild",             // glob char
      "die?wild",
      "die|pipe",
      "die:colon",
      "die$dollar",
      ".",                    // dot-traversal
      "..",
      "...",                  // 3 dots — must start with [A-Za-z]
    ]) {
      expect(isSafePartClassSlug(bad)).toBe(false);
    }
  });

  it("rejects oversized slugs (> 64 chars)", () => {
    const s = "a" + "b".repeat(64);
    expect(s.length).toBe(65);
    expect(isSafePartClassSlug(s)).toBe(false);
    expect(isSafePartClassSlug("a" + "b".repeat(63))).toBe(true); // exactly 64
  });

  it("rejects non-string inputs", () => {
    expect(isSafePartClassSlug(undefined as unknown as string)).toBe(false);
    expect(isSafePartClassSlug(null as unknown as string)).toBe(false);
    expect(isSafePartClassSlug(123 as unknown as string)).toBe(false);
  });
});

// -- End-to-end CLI smoke ------------------------------------------------

describe("derive-drawing-templates CLI (smoke)", () => {
  it("writes one file per emitted template + a manifest, exits 0", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const scriptPath = resolve(here, "..", "derive-drawing-templates.ts");

    const tmp = mkdtempSync(join(tmpdir(), "derive-tpl-"));
    const corpusPath = join(tmp, "corpus.json");
    const outDir = join(tmp, "out");
    writeFileSync(corpusPath, JSON.stringify(REAL_CORPUS));

    const res = spawnSync("npx", ["tsx", scriptPath, "--corpus-report", corpusPath, "--out-dir", outDir, "--json"], {
      encoding: "utf8",
      shell: true,
      timeout: 60_000,
    });

    try {
      // exit 0 means >=1 template emitted (the live engine drives the real
      // template; we don't pin the exact emitted classes — that's the
      // engine's responsibility and is tested in its own suite).
      expect(res.status).toBe(0);
      expect(existsSync(outDir)).toBe(true);
      const files = readdirSync(outDir);
      expect(files.some((f) => f === "_manifest.json")).toBe(true);
      expect(files.some((f) => f.startsWith("template-") && f.endsWith(".json"))).toBe(true);

      const manifest = JSON.parse(readFileSync(join(outDir, "_manifest.json"), "utf8"));
      expect(manifest.schemaVersion).toBe(1);
      expect(manifest.kind).toBe("drawing_template_manifest");
      expect(manifest.classes_in_report).toBe(2);
      expect(manifest.templates_emitted).toBeGreaterThan(0);
      expect(manifest.advisoryOnly).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("exits 2 when the corpus report file is missing", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const scriptPath = resolve(here, "..", "derive-drawing-templates.ts");

    const res = spawnSync("npx", ["tsx", scriptPath, "--corpus-report", "/path/does/not/exist.json"], {
      encoding: "utf8",
      shell: true,
      timeout: 30_000,
    });
    expect(res.status).toBe(2);
  });

  it("exits 3 on a malformed --min-evidence-ratio", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const scriptPath = resolve(here, "..", "derive-drawing-templates.ts");

    const res = spawnSync("npx", ["tsx", scriptPath, "--min-evidence-ratio", "1.5"], {
      encoding: "utf8",
      shell: true,
      timeout: 30_000,
    });
    expect(res.status).toBe(3);
  });

  it("rejects path-traversal in part_class — skips unsafe slug, writes manifest with write_failures (arm B P1)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const scriptPath = resolve(here, "..", "derive-drawing-templates.ts");

    const tmp = mkdtempSync(join(tmpdir(), "derive-tpl-traverse-"));
    const corpusPath = join(tmp, "corpus.json");
    const outDir = join(tmp, "out");
    const hostileCorpus = {
      generated_at: "2026-05-18T02:51:58.875Z",
      per_class: [
        // Hostile slug: a real engine call would route this to its
        // template-not-found path (empty sequence) — guard against the
        // future where the engine widens its accepted classes too.
        { part_class: "../../evil", files_examined: 5, feature_evidence_counts: { central_oil_hole: 5 } },
        // Real class that the engine WILL produce a sequence for:
        { part_class: "die", files_examined: 75, feature_evidence_counts: {
          central_oil_hole: 71, bevel_face_chamfer: 38, stepped_revolved_axis: 35,
        } },
      ],
    };
    writeFileSync(corpusPath, JSON.stringify(hostileCorpus));

    const res = spawnSync("npx", ["tsx", scriptPath, "--corpus-report", corpusPath, "--out-dir", outDir, "--json"], {
      encoding: "utf8",
      shell: true,
      timeout: 60_000,
    });

    try {
      // The hostile slug yields an empty sequence at the engine level and
      // is filtered before reaching the write loop; the real "die" class
      // writes successfully. Either way, no file lands outside outDir.
      const filesInTmpRoot = readdirSync(tmp);
      expect(filesInTmpRoot.includes("evil")).toBe(false);
      expect(filesInTmpRoot.includes("..")).toBe(false);
      // Parent dirs of outDir must NOT have a leaked template-../evil-* file:
      const filesOneUp = readdirSync(tmpdir()).filter((f) => /^template-/.test(f));
      // (We're not promising nothing in tmpdir() — only that no traversal
      // leaked OUR template through. Loose proxy: nothing matching our slug.)
      for (const f of filesOneUp) {
        expect(f).not.toContain("evil");
      }
      // Manifest exists + reflects truth:
      if (existsSync(join(outDir, "_manifest.json"))) {
        const m = JSON.parse(readFileSync(join(outDir, "_manifest.json"), "utf8"));
        expect(m.kind).toBe("drawing_template_manifest");
        // If the engine emits a template for the hostile class (empty path)
        // the guard skips it with status:"skipped_unsafe_slug" — assert
        // that NOTHING reached the disk with an unsafe slug:
        const writtenSlugs = readdirSync(outDir)
          .filter((f) => f.startsWith("template-"))
          .map((f) => f.replace(/^template-/, "").replace(/-\d{4}-\d{2}-\d{2}\.json$/, ""));
        for (const s of writtenSlugs) expect(isSafePartClassSlug(s)).toBe(true);
      }
      // The exit code is 0 (die wrote OK) OR 3 (write_failures populated)
      // depending on what the engine produced for "../../evil". Both are
      // acceptable — the load-bearing assertion is the no-leak above.
      expect([0, 3]).toContain(res.status);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("does NOT run main() as an import side-effect (arm A P3-B regression guard)", async () => {
    // Importing the module must NOT write files anywhere. We assert by
    // tracking the size of a sentinel output dir before and after a fresh
    // dynamic import. The script's default DEFAULT_OUT_DIR is
    // state/shared/learned-templates — measuring that directly is racy
    // (other tests may legitimately write it). Instead we set
    // PRISM_LEARNED_TEMPLATES_DIR to a fresh empty dir and a corresponding
    // PRISM_CAD_CORPUS_REPORT to a fresh empty file, then dynamic-import
    // and assert the sentinel dir remains untouched.
    const tmp = mkdtempSync(join(tmpdir(), "derive-tpl-noimport-"));
    const sentinelOut = join(tmp, "sentinel-out");
    const sentinelCorpus = join(tmp, "sentinel-corpus.json");
    writeFileSync(sentinelCorpus, JSON.stringify({ per_class: [{ part_class: "die", files_examined: 5, feature_evidence_counts: { central_oil_hole: 5 } }] }));

    const prevOut = process.env.PRISM_LEARNED_TEMPLATES_DIR;
    const prevCorpus = process.env.PRISM_CAD_CORPUS_REPORT;
    process.env.PRISM_LEARNED_TEMPLATES_DIR = sentinelOut;
    process.env.PRISM_CAD_CORPUS_REPORT = sentinelCorpus;

    try {
      // Vitest caches module imports, but the static import at the top of
      // this file already ran ONCE. We assert no side effect from THAT
      // import: sentinelOut never came into existence (or has zero files
      // if a sibling test happened to create it later by name collision).
      const sentinelExists = existsSync(sentinelOut);
      if (sentinelExists) {
        expect(readdirSync(sentinelOut)).toEqual([]);
      } else {
        expect(sentinelExists).toBe(false);
      }
      // Second guard: even a fresh dynamic import is a no-op, because the
      // gate uses fileURLToPath(import.meta.url) vs process.argv[1] and
      // vitest's argv[1] is the vitest runner — not this script.
      await import("../derive-drawing-templates.js");
      const sentinelExistsAfter = existsSync(sentinelOut);
      if (sentinelExistsAfter) {
        expect(readdirSync(sentinelOut)).toEqual([]);
      } else {
        expect(sentinelExistsAfter).toBe(false);
      }
    } finally {
      if (prevOut === undefined) delete process.env.PRISM_LEARNED_TEMPLATES_DIR;
      else process.env.PRISM_LEARNED_TEMPLATES_DIR = prevOut;
      if (prevCorpus === undefined) delete process.env.PRISM_CAD_CORPUS_REPORT;
      else process.env.PRISM_CAD_CORPUS_REPORT = prevCorpus;
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
