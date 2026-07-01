#!/usr/bin/env node
// mcp-server/scripts/derive-drawing-templates.ts
//
// U-TDP-DT01 — Drawing-Template Persistence (evidence-driven build sequences)
//
// Reads the trained CAD STEP geometry corpus report and derives one
// drawing-template artifact per observed `part_class`, by calling
// `cadClassFeatureLibraryEngine.buildSequenceForEvidence()` — the
// evidence-driven sibling of the static `buildSequenceFor()` template.
//
// This is the materialization step the user's work order requires
// ("producing drawing templates… utilize existing cad files… and cnc
// programs to reverse engineer the cad files"): the trained 665-file
// STEP geometry corpus → live evidence ratios → ordered, drift-annotated
// build sequence per class → on-disk drawing-template artifacts that
// downstream orchestrators (PrintToProgramOrchestratorEngine, CAM
// pipeline) load instead of re-deriving.
//
// USAGE:
//   npx tsx mcp-server/scripts/derive-drawing-templates.ts
//        [--corpus-report <path>] [--out-dir <dir>] [--min-evidence-ratio N]
//        [--json] [--dry-run]
//
// EXIT CODES:
//   0 — >=1 template written (or --dry-run computed)
//   1 — corpus report walked but ZERO classes yielded a usable template
//   2 — corpus report missing
//   3 — args / fs / fatal error

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, env } from "node:process";
import { fileURLToPath } from "node:url";

import {
  cadClassFeatureLibraryEngine,
  type CADCorpusStepGeometryReport,
  type BuildSequenceEvidenceResult,
} from "../src/engines/CADClassFeatureLibraryEngine.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_CORPUS_PATH = env.PRISM_CAD_CORPUS_REPORT
  || join(REPO_ROOT, "mcp-server", "data", "state", "cad-corpus-step-geometry-report.json");
const DEFAULT_OUT_DIR = env.PRISM_LEARNED_TEMPLATES_DIR
  || join(REPO_ROOT, "state", "shared", "learned-templates");

const SCHEMA_VERSION = 1;

// Filename-safe part_class slug — letters, digits, underscore, hyphen, dot.
// The engine's `PartClass` type is a literal-string union, but the script
// receives part_class from a JSON file on disk (the trained corpus report,
// which is itself produced by an ingest pipeline that may consume hostile
// or buggy STEP input). A corrupt/poisoned report with
// `part_class: "../../../etc/passwd"` (or `"..\\..\\config\\secrets"` on
// Windows) would otherwise compose into a `template-<slug>-DATE.json`
// pathname that escapes `outDir`. Per arm B P1 (path traversal):
// validate before composing the filename; reject by skipping with a loud
// caveat. The regex is intentionally narrow — every existing PRISM
// part_class fits, and a new slug that doesn't can be cleaned by the
// ingest pipeline rather than smuggled here.
const SAFE_PART_CLASS = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
export function isSafePartClassSlug(s: string): boolean {
  return typeof s === "string" && SAFE_PART_CLASS.test(s);
}

/** Single drawing-template artifact written to disk. */
export interface DerivedDrawingTemplate {
  schemaVersion: number;
  kind: "drawing_template";
  part_class: string;
  generated_at: string;
  evidence_date: string;
  source: "evidence_driven_corpus_report";
  corpus_report_generated_at: string | null;
  corpus_class_found: boolean;
  files_examined: number;
  min_evidence_ratio: number;
  build_sequence: BuildSequenceEvidenceResult["sequence"];
  caveats: string[];
  advisoryOnly: true;
  mustHumanVerify: true;
}

/** Pure-core input options for `deriveDrawingTemplates`. */
export interface DeriveDrawingTemplateOpts {
  /** Minimum corpus evidence ratio passed to the engine (default 0.3). */
  minEvidenceRatio: number;
  /** Clock — injected so tests get a stable `generated_at` / `evidence_date`. */
  now: Date;
}

/** Engine-method signature, exported so tests can inject a fake. */
export type BuildSequenceForEvidenceFn = (
  partClass: string,
  opts: { corpus_report: CADCorpusStepGeometryReport | null; min_evidence_ratio?: number },
) => BuildSequenceEvidenceResult;

/**
 * PURE function — derive one drawing-template per part_class present in the
 * corpus report. Skips classes that yielded an empty build sequence after
 * applying the evidence ratio filter; their (empty) result is summarized in
 * the caller's manifest, never silently written as a real template.
 *
 * Dependency injection via `buildSeq` keeps the function unit-testable
 * without booting the live engine singleton; the CLI default binds the live
 * singleton method so production callers don't need to know.
 */
export function deriveDrawingTemplates(
  report: CADCorpusStepGeometryReport,
  opts: DeriveDrawingTemplateOpts,
  buildSeq: BuildSequenceForEvidenceFn = (cls, o) =>
    cadClassFeatureLibraryEngine.buildSequenceForEvidence(cls as never, o),
): DerivedDrawingTemplate[] {
  const out: DerivedDrawingTemplate[] = [];
  if (!report || !Array.isArray(report.per_class)) return out;

  const isoNow = opts.now.toISOString();
  // YYYY-MM-DD is the filename slug — UTC for reproducibility across hosts.
  const isoDate = isoNow.slice(0, 10);
  // The corpus report shape carries an optional `generated_at` (the trained
  // run's timestamp); the engine type narrowly only requires `per_class`.
  // Cast through `unknown` so we don't fight the engine's narrow interface.
  const reportMeta = report as unknown as { generated_at?: string };

  for (const cls of report.per_class) {
    if (!cls || typeof cls.part_class !== "string" || cls.part_class.length === 0) continue;

    const evidence = buildSeq(cls.part_class, {
      corpus_report: report,
      min_evidence_ratio: opts.minEvidenceRatio,
    });

    // Skip classes that yielded an EMPTY ordered sequence. This happens
    // when the static template has zero overlap with the corpus OR every
    // feature failed the evidence ratio AND the prevalence fallback was
    // also empty. Either way: nothing to materialize → no file written.
    if (!evidence || !Array.isArray(evidence.sequence) || evidence.sequence.length === 0) continue;

    out.push({
      schemaVersion: SCHEMA_VERSION,
      kind: "drawing_template",
      part_class: cls.part_class,
      generated_at: isoNow,
      evidence_date: isoDate,
      source: "evidence_driven_corpus_report",
      corpus_report_generated_at: typeof reportMeta.generated_at === "string"
        ? reportMeta.generated_at
        : null,
      corpus_class_found: evidence.corpus_class_found,
      files_examined: Number.isFinite(cls.files_examined) ? cls.files_examined : 0,
      min_evidence_ratio: opts.minEvidenceRatio,
      // Defensive shallow copy (P2-A/B from arm A): the engine's returned
      // arrays are freshly built per call, but a downstream caller that
      // appends operator notes to a returned `caveats` array shouldn't be
      // able to leak that mutation back into the engine's state on the
      // next call. Cheap insurance against an aliasing class of bug.
      build_sequence: [...evidence.sequence],
      caveats: Array.isArray(evidence.caveats) ? [...evidence.caveats] : [],
      advisoryOnly: true,
      mustHumanVerify: true,
    });
  }
  return out;
}

/** CLI arg shape — exported for tests. */
export interface ParsedArgs {
  corpusReport: string | null;
  outDir: string | null;
  minEvidenceRatio: number;
  json: boolean;
  dryRun: boolean;
  help: boolean;
  argError: string | null;
}

export function parseArgs(args: string[]): ParsedArgs {
  const out: ParsedArgs = {
    corpusReport: null,
    outDir: null,
    minEvidenceRatio: 0.3,
    json: false,
    dryRun: false,
    help: false,
    argError: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--corpus-report") out.corpusReport = args[++i] ?? null;
    else if (a === "--out-dir") out.outDir = args[++i] ?? null;
    else if (a === "--min-evidence-ratio") {
      const raw = args[++i];
      const n = Number(raw);
      // A present-but-malformed --min-evidence-ratio is an operator typo on
      // a bounding flag: fail loud (exit 3) rather than silently defaulting.
      if (raw === undefined || !Number.isFinite(n) || n < 0 || n > 1) {
        out.argError = "--min-evidence-ratio requires a number in [0,1] (got: " + String(raw) + ")";
      } else {
        out.minEvidenceRatio = n;
      }
    } else if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function atomicWriteJson(path: string, obj: unknown): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, path);
}

/** Per-template write outcome — exported for tests. */
export interface WriteOutcome {
  part_class: string;
  status: "ok" | "failed" | "skipped_unsafe_slug";
  error?: string;
}

/** Manifest summary shape — exported for tests. */
export interface DrawingTemplateManifest {
  schemaVersion: number;
  kind: "drawing_template_manifest";
  generated_at: string;
  corpus_report_path: string;
  corpus_report_generated_at: string | null;
  min_evidence_ratio: number;
  classes_in_report: number;
  templates_emitted: number;
  /** Set to true when the run was --dry-run (nothing actually written). */
  dry_run: boolean;
  templates: Array<{
    part_class: string;
    files_examined: number;
    sequence_length: number;
    caveat_count: number;
    corpus_class_found: boolean;
    /** First up-to-3 caveat strings, hoisted so manifest readers don't need a 2nd I/O hop. */
    caveat_preview: string[];
  }>;
  /** Empty when every template wrote successfully; populated on partial-write states (R12 fail-loud, arm B P1). */
  write_failures: WriteOutcome[];
  advisoryOnly: true;
  mustHumanVerify: true;
}

export function buildManifest(
  templates: DerivedDrawingTemplate[],
  report: CADCorpusStepGeometryReport,
  corpusPath: string,
  minEvidenceRatio: number,
  now: Date,
  opts?: { dryRun?: boolean; writeFailures?: WriteOutcome[] },
): DrawingTemplateManifest {
  const reportMeta = report as unknown as { generated_at?: string };
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: "drawing_template_manifest",
    generated_at: now.toISOString(),
    corpus_report_path: corpusPath,
    corpus_report_generated_at: typeof reportMeta.generated_at === "string" ? reportMeta.generated_at : null,
    min_evidence_ratio: minEvidenceRatio,
    classes_in_report: Array.isArray(report.per_class) ? report.per_class.length : 0,
    templates_emitted: templates.length,
    dry_run: Boolean(opts?.dryRun),
    templates: templates.map((t) => ({
      part_class: t.part_class,
      files_examined: t.files_examined,
      sequence_length: t.build_sequence.length,
      caveat_count: t.caveats.length,
      corpus_class_found: t.corpus_class_found,
      caveat_preview: t.caveats.slice(0, 3),
    })),
    write_failures: opts?.writeFailures ? [...opts.writeFailures] : [],
    advisoryOnly: true,
    mustHumanVerify: true,
  };
}

function main(): number {
  const args = parseArgs(argv.slice(2));
  if (args.help) {
    console.log(
      "usage: npx tsx mcp-server/scripts/derive-drawing-templates.ts " +
      "[--corpus-report <path>] [--out-dir <dir>] [--min-evidence-ratio N] [--json] [--dry-run]",
    );
    return 0;
  }
  if (args.argError) {
    console.error("ERR: " + args.argError);
    return 3;
  }

  const corpusPath = resolve(args.corpusReport || DEFAULT_CORPUS_PATH);
  const outDir = resolve(args.outDir || DEFAULT_OUT_DIR);

  if (!existsSync(corpusPath) || !statSync(corpusPath).isFile()) {
    console.error("ERR: corpus report missing: " + corpusPath);
    return 2;
  }

  let report: CADCorpusStepGeometryReport;
  try {
    const raw = readFileSync(corpusPath, "utf8");
    report = JSON.parse(raw) as CADCorpusStepGeometryReport;
  } catch (e) {
    console.error("ERR: cannot read/parse corpus report (" + corpusPath + "): "
      + (e instanceof Error ? e.message : String(e)));
    return 3;
  }

  if (!report || !Array.isArray(report.per_class) || report.per_class.length === 0) {
    console.error("ERR: corpus report has no per_class entries — cannot derive templates");
    return 1;
  }

  const now = new Date();
  const templates = deriveDrawingTemplates(report, {
    minEvidenceRatio: args.minEvidenceRatio,
    now,
  });

  // Per-template write loop (arm B P1 — partial-write state fix):
  //  • Reject unsafe part_class slugs BEFORE composing a filename — defends
  //    against path-traversal via a poisoned corpus report (arm B P1).
  //  • Catch atomicWriteJson failures per-template instead of unwinding to
  //    the entry-point try/catch (which would skip writing the manifest
  //    entirely and leave the on-disk state un-introspectable).
  //  • Always write the manifest LAST regardless — including the
  //    write_failures list — so downstream consumers can always see what
  //    state we ended in.
  const writeFailures: WriteOutcome[] = [];
  if (!args.dryRun) {
    for (const t of templates) {
      if (!isSafePartClassSlug(t.part_class)) {
        writeFailures.push({
          part_class: t.part_class,
          status: "skipped_unsafe_slug",
          error: "part_class did not match " + SAFE_PART_CLASS.source,
        });
        console.error("[derive-templates] WARN: skipping unsafe part_class slug: " + JSON.stringify(t.part_class));
        continue;
      }
      const path = join(outDir, "template-" + t.part_class + "-" + t.evidence_date + ".json");
      try {
        atomicWriteJson(path, t);
      } catch (e) {
        writeFailures.push({
          part_class: t.part_class,
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        });
        console.error("[derive-templates] WARN: write failed for "
          + t.part_class + ": " + (e instanceof Error ? e.message : String(e)));
      }
    }
  }

  // Manifest reflects the actual on-disk verdict — built AFTER the loop so
  // write_failures + dry_run flags are accurate.
  const manifest = buildManifest(templates, report, corpusPath, args.minEvidenceRatio, now, {
    dryRun: args.dryRun,
    writeFailures,
  });

  if (!args.dryRun) {
    try {
      atomicWriteJson(join(outDir, "_manifest.json"), manifest);
    } catch (e) {
      // Loud R12 — a missing manifest after templates exist is a corrupted state.
      console.error("[derive-templates] FATAL: manifest write failed: "
        + (e instanceof Error ? e.message : String(e)));
      // Don't return here yet — we want the prose/JSON report to still print.
    }
  }

  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log("[derive-templates] corpus:   " + corpusPath);
    console.log("[derive-templates] classes:  " + report.per_class.length + " in report");
    console.log("[derive-templates] emitted:  " + templates.length + " template(s)");
    for (const t of templates) {
      console.log(
        "[derive-templates]   • " +
        t.part_class.padEnd(20) +
        " seq=" + String(t.build_sequence.length).padStart(2) +
        " caveats=" + t.caveats.length +
        " examined=" + t.files_examined,
      );
    }
    console.log("[derive-templates] " + (args.dryRun ? "DRY RUN — nothing written" : "wrote: " + outDir));
  }

  // R12 exit contract:
  //  - any per-template write failed → 3 (partial-write state surfaced via
  //    the manifest's `write_failures`; operator must reconcile before
  //    downstream consumers load the artifacts)
  //  - 0 templates from a non-empty per_class report → 1 (every class fell
  //    through the evidence + fallback filters; verdict is "training pass
  //    needs to be redone or threshold lowered", a loud signal, not a no-op)
  //  - >=1 template emitted, all writes clean → 0
  if (writeFailures.length > 0) {
    console.error("[derive-templates] FAIL: " + writeFailures.length
      + " template write(s) failed (see manifest.write_failures)");
    return 3;
  }
  if (templates.length > 0) return 0;
  console.error("[derive-templates] FAIL: 0 templates produced from "
    + report.per_class.length + " classes (try lowering --min-evidence-ratio)");
  return 1;
}

// Set process.exitCode rather than calling process.exit() — process.exit()
// force-truncates buffered stdout/stderr when piped to a non-TTY harness
// (the same R12 fail-loud violation U-TDP06-STREAMING fixed for the CNC
// ground-truth CLI: a run whose verdict vanishes looks like a no-op).
//
// Gate on "is this file the process entry point": when a unit test imports
// the pure exports, we MUST NOT run main() as an import side-effect (caught
// 2026-05-19 by the first smoke test: importing the file wrote 9 real
// templates to state/shared/learned-templates/ during `vitest run`). The
// realpath compare survives drive-letter casing + Windows backslashes.
function isEntryPoint(): boolean {
  if (!process.argv[1]) return false;
  try {
    const here = fileURLToPath(import.meta.url);
    const entry = resolve(process.argv[1]);
    return resolve(here).toLowerCase() === entry.toLowerCase();
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  try {
    const code = main();
    process.exitCode = Number.isInteger(code) ? code : 0;
  } catch (e) {
    console.error("[derive-templates] FATAL: " + (e instanceof Error ? e.message : String(e)));
    process.exitCode = 3;
  }
} else if (process.argv[1]?.endsWith("derive-drawing-templates.ts")
        || process.argv[1]?.endsWith("derive-drawing-templates.js")) {
  // Arm A P1 — soft diagnostic: file appears to be invoked as the entry
  // point (process.argv[1] ends with the script name) but isEntryPoint()
  // refused to run main(). This is a wiring misconfiguration (e.g. a tsx
  // loader shim that points process.argv[1] at the source but reports a
  // different import.meta.url). Surface it loudly rather than silent-no-op.
  console.error("[derive-templates] WARN: invoked as entry point but isEntryPoint() returned false; main() not run. process.argv[1]="
    + process.argv[1] + " import.meta.url=" + import.meta.url);
}
